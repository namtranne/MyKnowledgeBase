# Chapter 5 — Replication

**Replication** = keeping a copy of the same data on multiple machines connected via a network.

**Three reasons to replicate:**
1. **Reduce latency** — place data geographically close to users
2. **Increase availability** — system keeps working even if some nodes fail
3. **Increase read throughput** — serve read queries from multiple replicas

All difficulty in replication lies in **handling changes to the data**. If data never changed, you'd just copy it once and be done. Three main approaches: **single-leader**, **multi-leader**, and **leaderless** replication.

---

## Single-Leader Replication (Active/Passive, Master/Slave)

### How It Works

```
                    Writes
                      │
                      ▼
              ┌───────────────┐
              │    Leader     │
              │   (Primary)   │
              └──┬─────────┬──┘
      Replication │         │ Replication
         stream   │         │    stream
              ┌───▼──┐  ┌───▼──┐
              │Follow│  │Follow│
              │er 1  │  │er 2  │
              └──────┘  └──────┘
                 ▲          ▲
              Reads      Reads
```

1. One replica is designated the **leader** (master/primary). All writes go to the leader.
2. The leader writes new data to its local storage, then sends the change to all **followers** (replicas/slaves/secondaries) via a **replication log** or **change stream**.
3. Each follower applies changes in the same order as the leader.
4. **Reads** can be served by any replica (leader or follower). **Writes** only go to the leader.

**Used by:** PostgreSQL, MySQL, Oracle Data Guard, SQL Server AlwaysOn, MongoDB, RethinkDB, Espresso, Kafka, RabbitMQ HA queues.

### Synchronous vs Asynchronous Replication

```
Client        Leader          Follower 1       Follower 2
  │              │              (sync)           (async)
  ├──write──────▶│                │                │
  │              ├──replicate───▶│                │
  │              │              ├──ack───────────▶│
  │              │◀──ack────────┤                │
  │◀──ok─────────┤              │                │
  │              ├──replicate──────────────────────▶│
  │              │              │           (no wait for ack)
```

| Mode | How It Works | Advantage | Disadvantage |
|------|-------------|-----------|--------------|
| **Synchronous** | Leader waits for follower to confirm write before reporting success to client | Follower guaranteed to have up-to-date copy. If leader fails, no data loss. | **One slow or dead follower blocks all writes.** |
| **Semi-synchronous** | One follower is synchronous, rest are async. If the sync follower becomes slow, another is promoted to sync. | Guarantees at least 2 nodes have the data | Slightly complex |
| **Fully asynchronous** | Leader doesn't wait for any follower. Writes are confirmed immediately. | Highest write throughput, leader never blocked | **If leader fails before replication, writes are lost** — not durable! |

**In practice:** fully async is the most common configuration, especially with many followers. The risk of data loss is accepted as a trade-off for better performance and availability.

### Setting Up New Followers (Without Downtime)

You can't just copy files from the leader — data is constantly changing, and a file copy at one point in time would be inconsistent.

**Correct procedure:**
1. Take a **consistent snapshot** of the leader's database at a specific point in time (without locking the whole database — most databases support this: PostgreSQL `pg_dump`, MySQL `mysqldump` with `--single-transaction`, filesystem-level snapshots)
2. Copy the snapshot to the new follower node
3. Follower connects to the leader and requests all changes that happened **since the snapshot** (identified by the snapshot's position in the replication log — called **log sequence number** in PostgreSQL, **binlog coordinates** in MySQL)
4. Follower applies the backlog of changes until caught up
5. Follower is now live and continues processing the stream in real-time

### Handling Node Outages

#### Follower Failure: Catch-Up Recovery

Each follower keeps a log of changes it has received. On crash and recovery:
1. Follower reads its local log to find the last successfully processed transaction
2. Connects to the leader and requests all changes since that point
3. Applies the backlog until caught up

This is straightforward — the replication log provides a natural recovery mechanism.

#### Leader Failure: Failover

**Failover** — promoting a follower to become the new leader. This is one of the **most dangerous operations in a database system**.

**Steps:**
1. **Detect failure:** most systems use a **timeout** — if the leader hasn't responded to heartbeats for 30 seconds (configurable), it's declared dead
2. **Choose new leader:** could be by election (consensus among remaining replicas) or by a pre-configured controller node. Best candidate = the follower with the most up-to-date data (least replication lag)
3. **Reconfigure the system:** clients must send writes to the new leader; old leader (if it comes back) must become a follower

**Failover pitfalls — what can go wrong:**

| Problem | What Happens | Consequence |
|---------|-------------|-------------|
| **Async follower data loss** | New leader was behind the old leader. Unreplicated writes are permanently lost. | Data loss. If the old leader comes back, it has writes that conflict with the new leader. Common approach: discard old leader's unreplicated writes (violates durability expectations). |
| **Discarded writes interact with external systems** | Old leader had assigned auto-increment IDs 100-200, then died. New leader only has up to 95. It re-assigns IDs 96+. But an external Redis cache or downstream system has already seen IDs 100-200. | **Primary key collision.** GitHub incident: out-of-date MySQL follower promoted → auto-increment counter behind → new rows got IDs that were already used → private user data exposed to wrong users because Redis had cached the old ID-to-user mapping. |
| **Split brain** | Both old and new leader accept writes. Network partition heals, and both believe they're the leader. | Conflicting data, data corruption. Some systems forcibly shut down one leader when two are detected, but poorly implemented shutdown mechanisms can kill both ("STONITH" — Shoot The Other Node In The Head). |
| **Wrong timeout** | Too short → unnecessary failovers during temporary load spikes (which worsens the load). Too long → long period of unavailability. | There is no universally correct timeout value. |

**Practical reality:** many operations teams prefer **manual failover** even when automatic failover is available, because the edge cases are so dangerous.

### Implementation of Replication Logs

How does the leader actually communicate changes to followers?

| Method | Description | Advantages | Disadvantages |
|--------|------------|------------|---------------|
| **Statement-based** | Leader logs every SQL statement (INSERT, UPDATE, DELETE) and sends to followers | Simple; compact | Breaks on: `NOW()`, `RAND()`, auto-increment with multi-statement transactions, triggers, stored procedures, UDFs. Every nondeterministic function produces different results on different replicas. |
| **Write-ahead log (WAL) shipping** | Leader sends its WAL (the same bytes it writes to its storage engine) to followers | Exact byte-level copy; used by PostgreSQL and Oracle | WAL is tightly coupled to the storage engine's internal format. **Leader and followers must run the exact same database version.** This makes zero-downtime upgrades impossible (can't upgrade followers first). |
| **Logical (row-based) log replication** | A separate log format that describes changes at the row level: for inserts, all column values; for deletes, the primary key; for updates, the changed column values | **Decoupled from storage engine** — leader and followers can run different versions, even different storage engines. Enables **Change Data Capture (CDC)** — external systems (Elasticsearch, data warehouse) can consume the log. | Slightly more complex to implement |
| **Trigger-based** | Application-level custom code (triggers, stored procedures) logs changes to a separate table. External process reads that table and replicates. | Most flexible — custom logic, selective replication, cross-database | Most overhead; more error-prone; introduces latency |

**PostgreSQL** supports both WAL shipping and logical replication. **MySQL** uses row-based binlog replication by default. Logical replication is generally preferred for its flexibility and upgrade compatibility.

---

## Problems with Replication Lag

With asynchronous replication, followers are always **at least slightly behind** the leader. Usually this lag is a fraction of a second, but under heavy load or network issues, it can grow to seconds or even minutes.

This creates several classes of visible anomalies for users:

### Reading Your Own Writes

**Problem:**

```
User writes:    POST /profile  { name: "New Name" }  → goes to Leader
User reads:     GET /profile                          → goes to Follower (stale)
User sees:      { name: "Old Name" }                  ← CONFUSING!
```

The user submitted a change but immediately sees the old value — it looks like their update was lost.

**Solutions (read-after-write consistency / read-your-writes consistency):**

| Approach | How | Trade-off |
|----------|-----|-----------|
| Read from leader for user-modifiable data | Profile page: read from leader (user might have edited). News feed: read from any follower (other people's data). | Only works if a clear subset of data is "owned" by the user |
| Time-based leader routing | For 1 minute after any write, route that user's reads to the leader | Requires tracking per-user last-write timestamps |
| Client-side timestamp | Client includes the timestamp of its last write. System ensures the serving replica is caught up to at least that timestamp. If not, either wait or route to a different replica. | Works across replicas and even across datacenters |
| Logical timestamp / sequence number | Same as above but with the replication log position instead of wall-clock time | More reliable than wall-clock timestamps |

**Cross-device complication:** user writes on their phone, reads on their laptop. The "last write timestamp" can't be stored on the device — it must be centralized. And both devices must be routed to the same datacenter (to see the same replication state).

### Monotonic Reads

**Problem:**

```
User read 1:  GET /comments  → Follower A (up-to-date)    → sees [comment1, comment2]
User read 2:  GET /comments  → Follower B (behind)         → sees [comment1]           ← comment2 DISAPPEARED!
```

The user sees data go backward in time — a comment appears, then vanishes on refresh.

**Solution:** ensure each user always reads from the **same replica** (session affinity). Typically implemented by hashing the user ID to determine the replica. If that replica fails, the user may see older data (which is acceptable — just not backwards).

### Consistent Prefix Reads

**Problem (mainly in partitioned databases):**

```
Partition 1 (fast replication):    Mrs. Cake: "What time is it?"
Partition 2 (slow replication):    Mr. Poons: "It's 10 past 4."

An observer reading both partitions sees:
  Mr. Poons: "It's 10 past 4."     (Partition 2 replicated first)
  Mrs. Cake: "What time is it?"     (Partition 1 replicated later)

→ Answer appears before the question!
```

**Causally related writes** that land on different partitions may be replicated at different speeds, causing observers to see them out of order.

**Solutions:**
- Write causally related data to the **same partition** (limits partitioning flexibility)
- Use algorithms that explicitly track **causal dependencies** between writes (covered in Chapter 9)

---

## Multi-Leader Replication

### When a Single Leader Isn't Enough

In single-leader replication, **all writes must go through one node**. This creates problems:

| Scenario | Problem with Single Leader |
|----------|--------------------------|
| **Multi-datacenter deployment** | All writes routed to one datacenter → high latency for remote users; if that datacenter goes down, no writes at all |
| **Offline-capable clients** | Mobile/desktop apps that must work without internet (e.g., calendar app, note-taking app) → each device needs to accept writes locally |
| **Collaborative editing** | Multiple users editing the same document simultaneously (Google Docs) → can't serialize all edits through one leader without terrible latency |

**Solution:** multiple leaders, each accepting writes independently, replicating to each other asynchronously.

### Multi-Datacenter Operation

```
Datacenter A                    Datacenter B
┌─────────────────┐             ┌─────────────────┐
│ Leader A        │◀═══════════▶│ Leader B        │
│  ├─ Follower    │  async      │  ├─ Follower    │
│  └─ Follower    │  replication│  └─ Follower    │
└─────────────────┘             └─────────────────┘
  ▲ Writes from                   ▲ Writes from
  local users                     local users
```

| Aspect | Single-Leader (cross-DC) | Multi-Leader |
|--------|------------------------|--------------|
| Write latency | Every write goes over WAN to the leader's DC | Writes are local to the nearest DC (fast) |
| DC outage tolerance | If leader's DC fails → no writes until failover | Other DCs continue accepting writes independently |
| Network tolerance | Write depends on inter-DC link (high latency, less reliable) | Async replication tolerates temporary network interruptions |

**Used by:** MySQL Circular Replication, Tungsten Replicator, CouchDB, various custom solutions.

### The Fundamental Challenge: Write Conflicts

**Multi-leader replication's biggest problem:** two leaders can independently accept **conflicting writes** to the same data, and there's no way to detect the conflict at write time (because writes happen independently on different leaders).

**Example:**

```
Leader A:  UPDATE wiki SET title = 'B' WHERE id = 1;   (at time t1)
Leader B:  UPDATE wiki SET title = 'C' WHERE id = 1;   (at time t1)

Both succeed locally. When they replicate to each other:
Leader A receives: SET title = 'C'  → CONFLICT with its title = 'B'
Leader B receives: SET title = 'B'  → CONFLICT with its title = 'C'
```

#### Conflict Resolution Strategies

**Strategy 1: Conflict avoidance (recommended when possible)**
- Route all writes for a given record to the same leader (e.g., user X always writes to DC-A)
- This effectively reduces to single-leader for each record
- Breaks down if the designated leader changes (DC failure, user relocates)

**Strategy 2: Convergent conflict resolution (all replicas must reach the same final value)**

| Method | How | Trade-off |
|--------|-----|-----------|
| **Last Write Wins (LWW)** | Each write gets a timestamp (or UUID). Highest timestamp wins. Discard the loser. | **Data loss** — the "loser" write is silently dropped. Cassandra and many DynamoDB implementations default to this. |
| **Replica ID priority** | Higher-numbered replica's write always wins | Same data loss problem |
| **Merge values** | Concatenate or union the conflicting values (e.g., title becomes "B/C") | No data loss but may produce nonsensical results |
| **Preserve all versions** | Store all conflicting values as "siblings." On next read, present all versions to the application (or user) for resolution. | No data loss; application must handle conflict resolution. Used by CouchDB. |
| **CRDTs** | Conflict-free Replicated Data Types — mathematically guaranteed to converge without conflicts (counters, sets, maps, registers) | Only works for specific data structures; not general-purpose |
| **Custom merge functions** | Application provides a merge function called by the database on conflict (Bucardo for PostgreSQL calls a Perl function) | Most flexible but most complex; merge logic is error-prone |

### Multi-Leader Topologies

How do leaders replicate to each other?

```
Circular:           Star/Tree:           All-to-All:
A → B → C → A       A → B               A ⇄ B
                     A → C               A ⇄ C
                     B → C               B ⇄ C
```

| Topology | Fault tolerance | Ordering |
|----------|----------------|----------|
| **Circular** | One node failure breaks the ring | Messages tagged with origin to avoid infinite loops |
| **Star** | Hub failure breaks everything | Messages tagged with origin |
| **All-to-all** | Best — any node can fail without disrupting others | Messages may arrive out of order → must use **version vectors** to correctly order events |

---

## Leaderless Replication

No designated leader — the client sends writes to **multiple replicas in parallel**, or a coordinator node does it on the client's behalf.

**Used by:** Amazon Dynamo (original paper), Riak, Cassandra, Voldemort, ScyllaDB.

### Quorum Reads and Writes

With `n` replicas:
- A write is considered successful when acknowledged by `w` replicas
- A read queries `r` replicas and returns the most recent value

**Quorum condition: `w + r > n`**

This guarantees that the set of nodes written to and the set of nodes read from **overlap** — at least one node in the read set has the latest value.

```
n = 3 replicas

Write (w=2):  Write to all 3, wait for 2 acks
              Node 1: ✓ (has new value)
              Node 2: ✓ (has new value)
              Node 3: ✗ (unreachable, has stale value)

Read (r=2):   Read from 2 nodes
              Node 1: new value  ✓
              Node 3: stale value

              → Client sees both, takes the newest
```

**Common configurations:**
- `n=3, w=2, r=2` — tolerate 1 unavailable node
- `n=5, w=3, r=3` — tolerate 2 unavailable nodes
- `n=3, w=3, r=1` — fast reads, but any unavailable node blocks writes
- `n=3, w=1, r=3` — fast writes, but any unavailable node blocks reads

### Read Repair and Anti-Entropy

How do stale replicas eventually get updated?

| Mechanism | How | When |
|-----------|-----|------|
| **Read repair** | When a read detects a stale value on one node, the client writes the newer value back to that node | On every read that detects staleness; good for frequently-read data |
| **Anti-entropy process** | Background process continuously compares data between replicas and copies missing/outdated values | Runs periodically; covers infrequently-read data. No ordering guarantee — significant delay possible. |

### Limitations of Quorum Consistency

Even with `w + r > n`, these edge cases can cause stale reads:

| Edge Case | What Happens |
|-----------|-------------|
| **Sloppy quorum** | During a network partition, writes go to nodes outside the designated `n` for that key (see below). Reads may not reach those temporary nodes. |
| **Concurrent writes** | Two clients write to the same key simultaneously. Nodes may receive writes in different orders → no clear "latest" value. |
| **Concurrent write and read** | A write is in progress (only reached some of the `r` nodes). Read sees a mix of old and new values — the outcome depends on which nodes are queried. |
| **Partially failed write** | Write succeeds on some replicas but fails on others. It's not rolled back on the successful replicas → some replicas have it, some don't. Subsequent reads may or may not see it. |
| **Node failure after write** | A node that had the new value fails and is restored from a replica that has the old value → falls below `w` nodes with the new data. |

**Quorums provide probabilistic rather than absolute guarantees.**

### Sloppy Quorums and Hinted Handoff

**Problem:** during a network partition, a client may not be able to reach `w` of the `n` designated nodes for a key.

**Sloppy quorum:** accept writes on `w` nodes that **are reachable** — even if they're not among the `n` "home" nodes for that key. The write is stored temporarily on these "wrong" nodes.

**Hinted handoff:** when the network heals and the correct nodes become reachable, the temporary nodes send the data to the correct "home" nodes.

This increases **write availability** (writes succeed even during partitions) but means `w + r > n` **no longer guarantees fresh reads** — the read might go to the `n` home nodes, none of which received the write (it went to temporary nodes).

### Detecting Concurrent Writes

**The core challenge of leaderless systems:** two clients write to the same key independently. Different nodes may receive these writes in different orders → **replicas permanently diverge** unless we handle this.

#### Last Write Wins (LWW)

Attach a timestamp to each write. When nodes see conflicting values, keep the one with the highest timestamp and discard the rest.

**Problem:** two truly concurrent writes (neither "caused" the other) are artificially ordered by their timestamps. One is silently dropped. **Data loss.**

LWW is the default in Cassandra. It's only safe when keys are write-once (immutable after creation) — e.g., using UUIDs as keys ensures each key is written exactly once.

#### The "Happens-Before" Relationship

Two operations are related in one of three ways:
- **A happens before B:** B depends on A, or B knows about A
- **B happens before A:** A depends on B
- **A and B are concurrent:** neither knows about the other

**Concurrency does not mean "at the same time"** — it means the operations are **unaware of each other**. They could be separated by minutes if neither party has seen the other's operation.

#### Capturing Causality: Version Numbers

Algorithm for a single replica:

1. Server maintains a **version number** for each key, incremented on every write
2. Client reads a key → server returns all unmerged values + the current version number
3. Client writes a key → must include the version number from its most recent read, plus its merged result
4. Server receives the write: overwrites all values with version ≤ the client's version number, keeps values with higher versions (concurrent writes from other clients)
5. If the client didn't include a version number, the write is concurrent with everything → stored as an additional sibling

The client must **merge sibling values** — union for shopping carts (with tombstones for deletions), application-specific merge for other data types.

#### Version Vectors (Multiple Replicas)

With multiple replicas, a single version number isn't enough. Use a **version vector** — a collection of version numbers, **one per replica per key**.

```
Key "cart" version vector:
  { replica_A: 3, replica_B: 2, replica_C: 4 }
```

Each replica increments its own component when it processes a write. The version vector tells the system exactly which values have been seen by which replicas, enabling correct identification of concurrent vs causally-related writes.

**Riak uses "dotted version vectors"** — a refined version of this approach that handles more edge cases correctly.
