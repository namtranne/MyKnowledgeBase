---
sidebar_position: 6
title: "05 — Replication & Partitioning"
---

# 🔄 Replication & Partitioning

Replication and partitioning are the two fundamental strategies for scaling databases beyond a single machine. Replication provides **availability and read scalability**. Partitioning (sharding) provides **write scalability and storage capacity**.

---

## 📋 Why Replication Matters

| Goal | How Replication Helps |
|------|----------------------|
| **High availability** | If one node dies, another takes over |
| **Read scalability** | Distribute read queries across replicas |
| **Latency reduction** | Place replicas closer to users geographically |
| **Disaster recovery** | Maintain copies in different data centers |

---

## 👑 Single-Leader Replication

One node (the **leader/primary**) handles all writes. Replicas (**followers/secondaries**) receive a copy of each write via the replication log.

```
                   Writes
                     │
                     ▼
              ┌──────────────┐
              │    Leader     │
              │  (Primary)   │
              └──┬─────┬─────┘
         repl    │     │    repl
         log     │     │    log
              ┌──▼──┐ ┌▼────┐
              │Repl1│ │Repl2│
              │(R/O)│ │(R/O)│
              └─────┘ └─────┘
                 ▲       ▲
              Reads   Reads
```

### Synchronous vs. Asynchronous Replication

| Aspect | Synchronous | Asynchronous | Semi-Synchronous |
|--------|:-----------:|:------------:|:----------------:|
| **Leader waits for** | All replicas to ACK | No replicas | 1 replica to ACK |
| **Data loss risk** | None | Possible (lag) | Minimal |
| **Write latency** | High (network round-trip) | Low | Moderate |
| **Availability impact** | Any replica down → writes blocked | No impact on writes | 1 replica must be up |
| **Used by** | Critical financial systems | Most web apps | MySQL semi-sync, PostgreSQL sync rep |

:::info Semi-Synchronous in Practice
MySQL's semi-synchronous replication waits for **at least one** replica to acknowledge the WAL before confirming the commit. This balances durability with performance:
- If the sync replica dies, the leader falls back to async temporarily
- On failover, the sync replica has all committed data
:::

### Replication Methods

| Method | Description | Used By |
|--------|-------------|---------|
| **Statement-based** | Replay SQL statements on replica | MySQL (legacy), rarely used |
| **WAL shipping** | Send WAL records to replica | PostgreSQL physical replication |
| **Logical replication** | Send decoded row changes | PostgreSQL logical, MySQL binlog (ROW) |
| **Trigger-based** | Application-level triggers | Custom solutions |

:::warning Statement-Based Pitfalls
Statement-based replication breaks with:
- `NOW()`, `RAND()` — non-deterministic functions
- Auto-increment with concurrent inserts — different order on replica
- Triggers/stored procedures with side effects
This is why most databases use **row-based (logical)** replication.
:::

---

## 👥 Multi-Leader Replication

Multiple nodes accept writes independently. Each leader replicates its changes to the others.

```
        ┌──────────────┐          ┌──────────────┐
        │   Leader A   │ ◄──────► │   Leader B   │
        │  (DC: US)    │  async   │  (DC: EU)    │
        └──────┬───────┘  repl    └──────┬───────┘
               │                         │
         ┌─────▼─────┐            ┌──────▼────┐
         │ Replica A1│            │ Replica B1│
         └───────────┘            └───────────┘
```

### Use Cases

- **Multi-datacenter deployment** — write locally, replicate globally
- **Offline-capable apps** — each device has a local DB (leader), syncs later
- **Collaborative editing** — each user's edits are local writes

### Conflict Resolution Strategies

When two leaders modify the same row concurrently, a **write conflict** occurs.

| Strategy | How It Works | Trade-off |
|----------|-------------|-----------|
| **Last-Write-Wins (LWW)** | Timestamp-based; latest write wins | Simple but loses data — the "lost" write is silently discarded |
| **Merge values** | Concatenate or union conflicting values | Works for sets/lists, not for scalars |
| **Custom resolution** | Application-defined conflict handler | Most flexible but complex |
| **Conflict avoidance** | Route all writes for a record to the same leader | Simplest but reduces multi-leader benefits |
| **CRDTs** | Data structures that merge automatically without conflicts | See [Chapter 06](./06-nosql-databases.md) |

:::warning
Multi-leader replication is **inherently complex**. Most teams should avoid it unless they have a clear need (multi-DC writes, offline-first apps). Conflict resolution bugs are notoriously hard to debug in production.
:::

---

## 🌐 Leaderless Replication

No designated leader — **any** node can accept reads and writes. The client sends writes to **multiple replicas** and reads from **multiple replicas**, using quorum rules to ensure consistency.

### Dynamo-Style Architecture

```
Client writes key=X to 3 of 5 nodes:

     ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
     │ N1  │  │ N2  │  │ N3  │  │ N4  │  │ N5  │
     │ ✅  │  │ ✅  │  │ ❌  │  │ ✅  │  │ ❌  │
     └─────┘  └─────┘  └─────┘  └─────┘  └─────┘
       W=3 (write to at least 3 nodes)

Client reads key=X from 3 of 5 nodes:

     ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
     │ N1  │  │ N2  │  │ N3  │  │ N4  │  │ N5  │
     │ v2  │  │ v2  │  │ v1  │  │ v2  │  │ v1  │
     └─────┘  └─────┘  └─────┘  └─────┘  └─────┘
       R=3 (read from at least 3 nodes, take latest version)
```

### Quorum Reads/Writes

For N replicas:
- **W** = number of nodes that must acknowledge a write
- **R** = number of nodes that must respond to a read
- **Quorum condition:** `W + R > N`

This guarantees that the read set and write set **overlap** — at least one node in the read quorum has the latest value.

| Configuration | W | R | Properties |
|:-------------:|:-:|:-:|-----------|
| **Strict quorum** | 3 | 3 | `3+3 > 5` → Strong reads, but high latency |
| **Write-heavy** | 5 | 1 | Fast reads, but writes must reach all nodes |
| **Read-heavy** | 1 | 5 | Fast writes, but reads must query all nodes |
| **Balanced** | 2 | 2 | `2+2 > 3` (with N=3), common for 3-node clusters |

### Anti-Entropy and Read Repair

How stale replicas catch up:

| Mechanism | Description |
|-----------|-------------|
| **Read repair** | During a quorum read, the client detects stale replicas and sends them the latest value |
| **Anti-entropy** | Background process that compares replicas and fixes inconsistencies (using Merkle trees) |
| **Hinted handoff** | If a target node is down, write to a temporary node; when the target recovers, forward the write |

---

## ⏱️ Replication Lag Problems

Asynchronous replication means replicas can be **behind** the leader. This causes several user-visible anomalies.

### Problem 1: Read-After-Write Inconsistency

A user writes data, then reads from a replica that hasn't received the write yet — they don't see their own update.

```
User:  POST /comment → Leader      (write succeeds)
User:  GET /comments → Replica     (write not replicated yet)
User:  "Where's my comment?!"      😡
```

**Solutions:**
- Read from leader for data the user recently wrote (e.g., "read your own writes")
- Track the user's latest write timestamp; only read from replicas that are caught up
- Client-side: remember the timestamp and send it with read requests

### Problem 2: Monotonic Read Violations

A user reads from replica A (caught up), then reads from replica B (behind) — they see data go **backward in time**.

**Solution:** Pin each user to a specific replica (e.g., hash user ID to choose replica).

### Problem 3: Causal Ordering Violations

User A posts a question, User B posts an answer. A third user sees the answer but not the question (because they're on different replicas with different lag).

**Solution:** Causal consistency — track causal dependencies and ensure replicas apply changes in causal order.

---

## ⚡ Horizontal Partitioning (Sharding)

Sharding splits a table across multiple machines (**shards**), each holding a **subset** of the data.

```
                    ┌───────────────────┐
                    │   Router/Proxy    │
                    └───┬───────┬───────┘
                        │       │       │
                ┌───────▼┐ ┌───▼────┐ ┌▼───────┐
                │ Shard 1│ │ Shard 2│ │ Shard 3│
                │ A - F  │ │ G - P  │ │ Q - Z  │
                └────────┘ └────────┘ └────────┘
```

---

## 🗂️ Partitioning Strategies

### Range Partitioning

Partition by key ranges (e.g., A-F, G-P, Q-Z or date ranges).

```sql
-- PostgreSQL declarative partitioning
CREATE TABLE orders (
    id BIGINT, order_date DATE, total DECIMAL
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

| Pros | Cons |
|------|------|
| Range scans are efficient (all data on one shard) | Hot spots if access patterns skew (e.g., recent dates) |
| Easy to understand and implement | Uneven data distribution possible |

### Hash Partitioning

Apply a hash function to the partition key; assign to shard based on hash value.

```
shard = hash(key) % num_shards

hash("user_42")  = 17  → 17 % 4 = 1 → Shard 1
hash("user_100") = 42  → 42 % 4 = 2 → Shard 2
hash("user_7")   = 8   → 8  % 4 = 0 → Shard 0
```

| Pros | Cons |
|------|------|
| Even data distribution | Range queries span all shards |
| No hot spots (with a good hash) | Adding/removing shards requires rehashing (mitigated by consistent hashing) |

### List Partitioning

Partition by explicit value lists (e.g., by country, region, tenant).

```sql
CREATE TABLE customers (id INT, country VARCHAR(2), name TEXT)
PARTITION BY LIST (country);

CREATE TABLE customers_us PARTITION OF customers FOR VALUES IN ('US');
CREATE TABLE customers_eu PARTITION OF customers FOR VALUES IN ('DE','FR','GB');
CREATE TABLE customers_ap PARTITION OF customers FOR VALUES IN ('JP','KR','IN');
```

### Composite Partitioning

Combine strategies (e.g., range + hash).

```
First level:  Range partition by date (year)
Second level: Hash partition by user_id within each year
```

---

## 🔵 Consistent Hashing

Standard hash partitioning (`hash(key) % N`) requires **rehashing all keys** when N changes. **Consistent hashing** minimizes key movement.

### How It Works

```
Hash ring (0 to 2^32):

              0
              │
     ┌────────┴────────┐
     │                 │
  Node C            Node A
  (pos: 30)         (pos: 90)
     │                 │
     │    ┌─────┐      │
     │    │Key X│      │
     │    │(pos: 65)   │
     │    └─────┘      │
     │                 │
  Node B               │
  (pos: 180)           │
     │                 │
     └────────┬────────┘
              │
             270

Key X (pos 65) → walk clockwise → first node encountered = Node A

If Node A is removed:
  Key X → walk clockwise → Node B (only keys from A are redistributed)
  Nodes B and C are unaffected!
```

### Virtual Nodes (Vnodes)

To improve balance, each physical node maps to **multiple positions** on the ring.

```
Physical Node A → Virtual: A1 (pos 20), A2 (pos 100), A3 (pos 220)
Physical Node B → Virtual: B1 (pos 50), B2 (pos 150), B3 (pos 280)

More virtual nodes → more even distribution
Typical: 100-256 virtual nodes per physical node
```

| Aspect | Without Virtual Nodes | With Virtual Nodes |
|--------|:---------------------:|:------------------:|
| **Balance** | Poor (depends on node positions) | Good (many positions average out) |
| **Adding a node** | Takes load from one neighbor | Takes load from many nodes |
| **Removing a node** | Overloads one neighbor | Load distributed across many |

:::info Used By
Consistent hashing is used by DynamoDB, Cassandra, Riak, Memcached, and many distributed caches.
:::

---

## 🔃 Rebalancing Strategies

When shards grow unevenly or nodes are added/removed, data must be **rebalanced**.

| Strategy | Description | Disruption |
|----------|-------------|:----------:|
| **Fixed partitions** | Pre-create many partitions (e.g., 1000); assign groups to nodes | Low (move whole partitions) |
| **Dynamic splitting** | Split a partition when it exceeds a size threshold | Low |
| **Hash mod N** | `hash(key) % N` — simple but ALL keys move when N changes | High ❌ |
| **Consistent hashing** | Move only keys from affected portion of the ring | Low ✅ |

:::tip Best Practice
Pre-create more partitions than nodes (e.g., 256 partitions for 8 nodes = 32 partitions/node). When adding a node, move some partitions to it. No data reshuffling within partitions.
:::

---

## 📑 Secondary Indexes with Partitioning

### Local Index (Document-Partitioned)

Each shard maintains its own secondary index covering only its own data.

```
Shard 1:                    Shard 2:
┌────────────────────┐      ┌────────────────────┐
│ Data: users A-M    │      │ Data: users N-Z    │
│ Local index:       │      │ Local index:       │
│   city → [rows]    │      │   city → [rows]    │
└────────────────────┘      └────────────────────┘

Query: WHERE city = 'NYC'
  → Must query ALL shards (scatter-gather)
  → Each shard searches its local index
  → Merge results
```

| Pros | Cons |
|------|------|
| Writes only update one shard's index | Reads must fan out to ALL shards (scatter-gather) |
| Simple to maintain | Query latency = slowest shard |

### Global Index (Term-Partitioned)

The secondary index itself is partitioned, with each partition covering all shards.

```
Shard 1 (data):             Shard 2 (data):
┌────────────────┐          ┌────────────────┐
│ Users A-M      │          │ Users N-Z      │
└────────────────┘          └────────────────┘

Global index shards:
┌──────────────────────┐    ┌──────────────────────┐
│ Index: city A-M      │    │ Index: city N-Z      │
│  Boston → [shard1:3, │    │  NYC → [shard1:7,    │
│            shard2:1] │    │         shard2:12]   │
└──────────────────────┘    └──────────────────────┘

Query: WHERE city = 'NYC'
  → Query only the global index shard for 'NYC'
  → Get exact row locations across data shards
  → Read from specific data shards
```

| Pros | Cons |
|------|------|
| Reads go to one index partition (no scatter-gather) | Writes must update global index (cross-shard, slower) |
| Efficient for selective queries | Global index partition becomes a bottleneck if hot |

---

## 🔀 Cross-Shard Queries and Joins

Cross-shard operations are the **biggest challenge** of sharding.

### Strategies

| Approach | Description | Trade-off |
|----------|-------------|-----------|
| **Scatter-gather** | Send query to all shards, merge results | High latency, but works for any query |
| **Co-location** | Store related data on the same shard (e.g., user + user's orders) | Fast joins, but limits data model |
| **Denormalization** | Duplicate data to avoid cross-shard joins | Faster reads, harder writes |
| **Application-level join** | Query each shard separately, join in application code | Flexible but complex |
| **Materialized views** | Pre-compute joined results | Eventually consistent |

:::warning Interview Insight
When asked "how would you shard this database?", always address:
1. **Partition key choice** — what key evenly distributes data AND satisfies the most common query patterns?
2. **Cross-shard queries** — which queries will span shards and how will you handle them?
3. **Rebalancing** — what happens when a shard gets too large?
4. **Transactions** — how do cross-shard transactions work (or do you avoid them)?
:::

---

## 🎯 Interview Questions

### Q1: "How would you design the sharding strategy for a social media app?"

**Partition key:** `user_id`
- All of a user's data (posts, friends, settings) on the same shard → co-location
- Fan-out for news feed reads (friends on different shards) → pre-computed feed table or scatter-gather
- Celebrity problem → some shards much larger → use consistent hashing with virtual nodes

### Q2: "What is the difference between replication and partitioning?"

- **Replication** copies the **same data** to multiple nodes for availability and read scalability
- **Partitioning** splits **different data** across nodes for write scalability and storage capacity
- In practice, you use **both** — each partition is replicated to multiple nodes

### Q3: "Explain the trade-offs of synchronous vs. asynchronous replication."

- **Synchronous:** No data loss (every write confirmed on replica), but higher latency and reduced availability (if replica is down, writes stall)
- **Asynchronous:** Lower latency and better availability, but risk of data loss if leader fails before replication
- **Semi-synchronous:** Middle ground — wait for one replica, others async

### Q4: "A user complains they don't see their own write. What's happening?"

Likely **read-after-write inconsistency** in an async replication setup:
1. User writes to leader
2. User's next read is routed to a replica that hasn't received the write yet

**Fix:** Implement read-after-write consistency — read from leader for recently written data, or track the user's latest write LSN and only read from replicas that have applied up to that LSN.

### Q5: "How does consistent hashing differ from hash mod N?"

- `hash(key) % N` → changing N rehashes **all** keys
- Consistent hashing → changing N rehashes only `K/N` keys (K = total keys)
- Consistent hashing uses a hash ring; keys are assigned to the next node clockwise
- Virtual nodes improve balance

---

## 🔗 Related Chapters

- **[03 — Transactions & Concurrency](./03-transactions-concurrency.md)** — 2PC, distributed transactions
- **[04 — Storage Engines](./04-storage-engines.md)** — WAL-based replication
- **[06 — NoSQL & Distributed Databases](./06-nosql-databases.md)** — CAP theorem, leaderless systems
- **[07 — Caching Strategies](./07-caching-strategies.md)** — Consistent hashing for cache distribution
