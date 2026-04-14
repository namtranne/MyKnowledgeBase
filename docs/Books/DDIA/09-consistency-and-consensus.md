# Chapter 9 — Consistency & Consensus

This chapter covers the **strongest guarantees** a distributed system can provide: linearizability, causal ordering, total order broadcast, and consensus. These are the theoretical foundations that underpin leader election, distributed transactions, and coordination services like ZooKeeper.

---

## Consistency Guarantees

Different databases provide different consistency models. From weakest to strongest:

| Guarantee | What It Means | Performance Cost |
|-----------|-------------|-----------------|
| **Eventual consistency** | If no new writes, all replicas will *eventually* converge to the same value. No guarantee on when. | Lowest |
| **Read-after-write consistency** | A user always sees their own writes | Low-medium |
| **Monotonic reads** | A user never sees time go backward | Low |
| **Consistent prefix reads** | Causally related events appear in order | Medium |
| **Causal consistency** | Operations that are causally related are seen in the correct order by all nodes | Medium |
| **Linearizability** | The system behaves as if there's a single copy of the data, with all operations atomic | Highest |

Understanding the trade-offs between these levels — what each prevents and what it costs — is essential for system design.

---

## Linearizability

The **strongest single-object consistency model**. Makes a distributed system **appear as if there is only one copy of the data**, and every operation takes effect **atomically at some point between its invocation and its response**.

### Formal Definition

Imagine a register (variable) `x` with three operations: `read(x)`, `write(x, v)`, and `cas(x, old, new)`.

**Linearizability requires:**
1. After a write completes, all subsequent reads (from any client) return the written value (or a later write's value)
2. Once **any** read returns a new value, **all** subsequent reads must also return that new value — even if the write hasn't completed yet
3. There must exist a **total order** of all operations such that each operation appears to take effect atomically at some point between its start and end time
4. This total order must be consistent with real-time ordering — if operation A completes before operation B starts, A must appear before B in the total order

**What linearizability feels like:** the system behaves as if there's a single, global variable that all clients access — no staleness, no reordering, no ambiguity.

### Linearizability vs Serializability

These are different guarantees that are often confused:

| Property | Scope | Guarantee | Example |
|----------|-------|-----------|---------|
| **Serializability** | Transaction isolation (multi-object) | Transactions appear to execute in *some* serial order — but that order doesn't have to match real-time order | SSI can process transactions "out of order" relative to real time, as long as the result is equivalent to some serial execution |
| **Linearizability** | Single-object consistency (recency) | Each operation appears to take effect atomically at a specific point in real time | A read always returns the most recently written value, from any client's perspective |
| **Strict serializability** | Both combined | Serializable transactions + each transaction takes effect at its real-time point | The strongest possible guarantee. Actual serial execution provides this. SSI typically does not. |

### When Is Linearizability Required?

**1. Leader Election**

All nodes must agree on who the leader is. This is essentially a linearizable compare-and-set operation: "set leader = me IF leader is currently null."

If two nodes both believe they're the leader (**split brain**), both accept writes → data diverges → corruption.

Coordination services like ZooKeeper and etcd provide linearizable operations specifically for this purpose: acquire a lock (create an ephemeral node), check who holds it, and automatically release when the holder's session expires.

**2. Uniqueness Constraints**

Registering a username, claiming a file path, reserving a seat — these require a linearizable compare-and-set: "claim this resource IF it's not already claimed."

Without linearizability, two clients could simultaneously check "is this username taken?", both see "no", and both claim it → duplicate.

**3. Cross-Channel Timing Dependencies**

```
Service A writes image to storage                     (at time T1)
Service A sends message to queue: "image uploaded"     (at time T2)
Service B receives message from queue                  (at time T3)
Service B reads image from storage                     (at time T4)

If storage is NOT linearizable:
  Service B might read STALE storage at T4 → gets old image or "not found"
  Even though the write at T1 happened before the read at T4!
```

The issue: there are **two independent communication channels** (storage and message queue). Without linearizability of the storage, the ordering across channels is not guaranteed.

### Implementing Linearizability

| Replication Approach | Linearizable? | Why / Why Not |
|---------------------|---------------|---------------|
| **Single-leader (reads from leader only)** | Potentially yes | If reads go to the leader and the leader is confirmed to be the actual leader (not a deposed leader that doesn't know it's been replaced) |
| **Single-leader (reads from followers)** | No | Followers are asynchronously behind — may return stale data |
| **Consensus algorithms (Raft, Paxos, ZooKeeper)** | Yes | Designed specifically for this. Includes leader election and fencing. |
| **Multi-leader** | No | Different leaders accept concurrent writes — no single ordering. Can't be linearizable even in principle. |
| **Leaderless (Dynamo-style quorums)** | Probably not | Even with strict quorums (w + r > n), concurrent reads and writes can interleave in ways that break linearizability. LWW conflict resolution is not linearizable. Sloppy quorums definitely not. |

### The Cost of Linearizability

#### CAP Theorem (Properly Understood)

The CAP theorem is **not** "pick 2 out of 3 (Consistency, Availability, Partition tolerance)." Network partitions are not optional — they happen whether you like it or not.

**The actual trade-off:**

```
When a network partition occurs:
  ├── Choice A: REMAIN LINEARIZABLE
  │   → Must make some replicas UNAVAILABLE
  │   (they can't confirm consistency, so they must reject requests)
  │
  └── Choice B: REMAIN AVAILABLE
      → Must give up LINEARIZABILITY
      (serve possibly stale data because replicas can't coordinate)

When there's NO partition:
  → You can have both consistency AND availability
```

**Key insight often missed:** many systems (multi-leader, leaderless) give up linearizability even when there's no partition — not for fault tolerance, but for **performance**. Linearizability requires coordination round-trips between nodes, which adds latency.

**Linearizability is slow — and this is a fundamental limitation, not an implementation issue.** Even with infinitely fast networks, the coordination overhead of linearizable operations imposes a latency floor.

This is why many practical systems choose eventual consistency or causal consistency — they're **fast enough to be useful** and **consistent enough to be correct** for most applications.

---

## Ordering Guarantees

Ordering is deeply connected to consistency. Different consistency models provide different ordering guarantees.

### Causal Ordering

**Causality** is a partial order: if operation A could have influenced operation B (A happened before B, and B might have seen A's result), then A is **causally before** B. If neither could have influenced the other, they are **concurrent** (unordered).

**Examples of causal dependencies:**
- A response causally depends on the request
- A follow-up message depends on the original message
- A write that reads a value depends on the write that set that value
- An "undo" operation depends on the operation being undone

**Causal consistency** is the strongest consistency model that **does not sacrifice availability**. Unlike linearizability (which requires coordination → unavailability during partitions), causal consistency can be maintained even during network partitions.

**Linearizability implies causal consistency** (linearizability is strictly stronger). But you can achieve causal consistency without linearizability — and without the performance penalty.

### Lamport Timestamps

A mechanism for creating a **total order** that is consistent with causal order:

```
Each operation is assigned a timestamp: (counter, nodeID)

Rules:
1. Each node maintains a counter. Every operation increments the counter.
2. When node A sends a message to node B, the message includes A's current counter.
3. When B receives the message, B updates its counter to max(B.counter, A.counter) + 1.
4. To compare timestamps: compare counters first. If equal, the higher nodeID wins.

Result: a total order of all operations that is consistent with causality.
```

**Example:**

```
Node 1 (counter):   1, 2, 3, 4, ...
Node 2 (counter):   1, 2, 3, 4, ...

Node 1 sends message with counter=3 to Node 2 (whose counter is 2).
Node 2 sets its counter to max(2, 3) + 1 = 4.
Node 2's next operations have counters 5, 6, 7, ...

This ensures that Node 2's post-message operations have timestamps higher
than Node 1's pre-message operations → causal order preserved.
```

**Critical limitation:** Lamport timestamps provide a total order **after the fact**, but they can't help you make **real-time decisions**. You can't use them to enforce a uniqueness constraint because you'd need to check with every node to see if anyone else claimed the same value with a lower timestamp — and you can't know if there's a message in transit you haven't seen yet.

### Total Order Broadcast

**The key building block for consensus and reliable distributed systems.**

Total order broadcast is a protocol for exchanging messages between nodes with two guarantees:

1. **Reliable delivery:** if a message is delivered to one node, it is delivered to **all** nodes (no messages are lost)
2. **Totally ordered delivery:** all nodes deliver messages in the **same order** (if node A sees message M1 before M2, then every node sees M1 before M2)

**These guarantees must hold even when nodes crash or the network is flaky.**

**Why total order broadcast matters:**

| Use Case | How Total Order Broadcast Helps |
|----------|-------------------------------|
| **Database replication** | If every write is a message in total order, and every replica processes them in that order → all replicas converge to the same state (**state machine replication**) |
| **Serializable transactions** | If every transaction is a message in total order → transactions are effectively serial |
| **Fencing tokens** | Each lock grant is a message in total order → the token is the message's position in the sequence |
| **Log-based systems** | Kafka partitions provide total order within a partition — this is why Kafka is so powerful for event streaming |

**Equivalence with consensus:** total order broadcast is **equivalent** to consensus — if you can solve one, you can solve the other.

**Building linearizable storage from total order broadcast:**

To implement a linearizable compare-and-set (e.g., claim a username):
1. Append a message to the log: "I want to claim username X"
2. Wait for the message to be delivered back to you (confirming its position in the total order)
3. Check if your message was the **first** claim for username X in the log
4. If yes → claim succeeded. If no (someone else's claim appeared first) → claim failed.

To implement a linearizable read:
- **Option 1:** append a dummy message to the log, wait for it to be delivered, then read (ensures you see all writes up to that point)
- **Option 2:** read from a replica that is synchronously updated with the log
- **Option 3:** the leader serves reads, confirming it's still the leader (hasn't been deposed)

---

## Distributed Transactions and Consensus

**Consensus** = getting multiple nodes to **agree on a value**. Once decided, the decision is **irrevocable**.

### Situations Requiring Consensus

| Situation | What Must Be Agreed On |
|-----------|----------------------|
| **Leader election** | Which node is the leader (avoid split brain) |
| **Atomic commit** | All nodes in a distributed transaction agree to commit or all agree to abort |
| **Total order broadcast** | All nodes agree on the order of messages |
| **Uniqueness constraints** | Only one node succeeds in claiming a unique resource |

### Two-Phase Commit (2PC) — Atomic Commit Protocol

**Not the same as two-phase locking (2PL).** 2PC is about committing a distributed transaction across multiple nodes.

**Phase 1 — Prepare (voting):**

```
Coordinator                  Participant A              Participant B
    │                            │                          │
    ├── "prepare" ──────────────▶│                          │
    ├── "prepare" ──────────────────────────────────────────▶│
    │                            │                          │
    │◀── "yes, I can commit" ────┤                          │
    │◀── "yes, I can commit" ──────────────────────────────┤
```

Each participant checks: can I commit this transaction? (Enough disk space? Constraints satisfied? Locks acquired?) If yes → vote "yes" (this is a **promise** — the participant will commit if told to). If no → vote "no."

**Phase 2 — Commit or Abort (decision):**

```
Coordinator                  Participant A              Participant B
    │                            │                          │
    │  (All voted yes)           │                          │
    │  Write "COMMIT" to own WAL │                          │
    │  ←── COMMIT POINT ──→      │                          │
    │                            │                          │
    ├── "commit" ───────────────▶│                          │
    ├── "commit" ───────────────────────────────────────────▶│
    │                            │                          │
    │                       (committed)                (committed)
```

If **all** participants vote "yes" → coordinator writes "commit" to its own WAL (**the commit point** — the moment of no return) → sends "commit" to all.
If **any** participant votes "no" → coordinator sends "abort" to all.

**The coordinator is a single point of failure:**

| Failure Scenario | Consequence |
|-----------------|-------------|
| Coordinator crashes **before** sending "prepare" | No problem — transaction just times out and is aborted |
| Coordinator crashes **after** receiving all "yes" votes but **before** writing "commit" to WAL | Participants are **in-doubt** — they voted "yes" (promised to commit if told) but don't know the decision. They **cannot unilaterally abort** (coordinator might have decided to commit) and **cannot commit** (coordinator might have decided to abort). They must **hold their locks and wait** for the coordinator to recover. |
| Coordinator crashes **after** writing "commit" to WAL but **before** sending "commit" to participants | On recovery, coordinator reads its WAL, sees the "commit" decision, and re-sends "commit" to all participants |

**The "in-doubt" state is the core problem:** participants may be stuck holding locks indefinitely, blocking all other transactions on the locked rows, until the coordinator recovers. In practice, if the coordinator's WAL is lost (disk failure), participants are stuck **forever** — database administrators must manually resolve the in-doubt transactions.

### Three-Phase Commit (3PC)

Theoretical improvement that avoids indefinite blocking. Adds a "pre-commit" phase. But it **assumes bounded network delays and bounded response times** — assumptions that don't hold in real networks. Not used in practice.

### XA Transactions (Heterogeneous Distributed Transactions)

**X/Open XA** is a standard protocol for 2PC across heterogeneous systems (different databases, message brokers, etc.):

```
Application
    │
    ├── Database (PostgreSQL)
    ├── Database (MySQL)
    └── Message Broker (ActiveMQ)

XA coordinator manages the 2PC across all three.
```

**Supported by:** PostgreSQL, MySQL, Oracle, SQL Server, ActiveMQ, HornetQ, MSMQ, IBM MQ.

**Problems with XA:**
- Coordinator is SPOF — if its log is lost, all participants are stuck
- Doesn't work well with SSI (requires global agreement on transaction ordering)
- **All systems must be available** for the transaction to commit → amplifies failure probability
- Can't detect deadlocks across systems
- Coordinator must be robust and well-operated (it's effectively a critical database itself)

### Consensus Algorithms (Paxos, Raft, Zab, VSR)

Consensus algorithms solve the same fundamental problem as 2PC (agreement among nodes), but with a crucial difference: **they don't require all nodes to participate — only a majority.**

**Properties guaranteed:**

| Property | Guarantee |
|----------|-----------|
| **Uniform agreement** | No two nodes decide differently |
| **Integrity** | No node decides twice (decision is final) |
| **Validity** | If a node decides value V, then V was proposed by some node |
| **Termination** | Every non-crashed node eventually decides (liveness — the only liveness property; the rest are safety) |

**How consensus algorithms work (simplified):**

1. **Elect a leader** (with a unique, monotonically increasing **epoch number** / **term**)
2. Leader proposes values
3. Followers vote on proposals. A proposal is accepted when a **quorum** (majority) of nodes votes for it.
4. The decision is final — it cannot be reversed.
5. If the leader fails (heartbeat timeout), nodes elect a new leader with a **higher epoch number**
6. The new leader must first learn about all uncommitted proposals from the previous epoch before making new proposals (to avoid conflicting with decisions that were already made but not yet fully communicated)

**Key difference from 2PC:**
- 2PC requires **all participants** to vote yes → one crashed participant blocks everyone
- Consensus requires only a **majority** → crashed minority doesn't block progress
- 2PC coordinator is a single point of failure → consensus elects a new leader if the current one fails

**The trade-off:** consensus algorithms guarantee safety (agreement, integrity, validity) under all circumstances, but liveness (termination) only under favorable conditions (less than half the nodes crashed, network eventually recovers).

**In practice:** you almost never implement consensus from scratch. You use a coordination service.

### Membership and Coordination Services (ZooKeeper, etcd)

These are not general-purpose databases — they're specialized systems for distributed coordination, providing:

| Feature | What It Does | Why It Matters |
|---------|-------------|---------------|
| **Linearizable atomic operations** | compare-and-set, atomic increments | Leader election, uniqueness constraints |
| **Total ordering of operations** | Every operation gets a monotonically increasing ID (zxid or revision) | Fencing tokens, consistent ordering |
| **Failure detection** | Ephemeral nodes + session heartbeats. If a session's heartbeats stop, its ephemeral nodes are automatically deleted. | Automatic lock release when a client crashes |
| **Change notifications (watches)** | Clients subscribe to changes on specific keys. Server pushes notifications when values change. | Clients learn about configuration changes, leader changes, or partition reassignment without polling |

**Common use cases:**

| Use Case | How It Works |
|----------|-------------|
| **Leader election** | Each node tries to create an ephemeral node at a specific path (e.g., `/leader`). Only one succeeds (linearizable). Others watch the node and try again when it disappears (leader crashed → session expired → ephemeral node deleted). |
| **Partition assignment** | Store partition → node mapping in ZooKeeper. When the mapping changes, all interested nodes are notified via watches. Used by Kafka, HBase, SolrCloud. |
| **Service discovery** | Services register themselves in ZooKeeper. Clients query ZooKeeper to find available service instances. Less critical that this is linearizable — eventual consistency may suffice. |
| **Configuration management** | Store configuration parameters. All nodes watch for changes and update their behavior when the configuration changes. |
| **Distributed locks** | Acquire a lock by creating an ephemeral sequential node under a lock path. Lowest-numbered node holds the lock. Others watch the node with the next-lower number. |

**Operational note:** ZooKeeper/etcd are designed for **small amounts of slow-changing data** (configuration, metadata, coordination state). They are not designed for high-throughput data storage. They are the "coordination kernel" — the small, highly reliable core that larger systems (Kafka, HBase, Hadoop YARN) build upon.

**The data managed by ZooKeeper is typically on the order of kilobytes to megabytes, and it changes on the order of seconds to minutes — not milliseconds.** Attempting to use ZooKeeper as a general-purpose database or high-frequency data store is a common mistake.
