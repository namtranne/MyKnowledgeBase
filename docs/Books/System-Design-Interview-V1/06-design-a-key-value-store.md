# Chapter 6 — Design a Key-Value Store

> A key-value store is a non-relational database where each unique key is associated with a value. Examples: Redis, Memcached, DynamoDB, Riak. This chapter designs a distributed key-value store inspired by Amazon's Dynamo paper.

---

## Requirements

| Requirement | Target |
|------------|--------|
| Key-value pair size | Key < 10 KB, value < 10 KB |
| Store big data | Yes |
| High availability | System responds even during failures |
| High scalability | Automatically distributes data across servers |
| Automatic scaling | Add/remove nodes based on traffic |
| Tunable consistency | Client can choose consistency level |
| Low latency | Single-digit millisecond response times |

---

## Single Server Key-Value Store

The simplest approach: an in-memory hash map.

```
  Hash Map (in-memory):
    "user:1001" → {"name": "Alice", "age": 30}
    "user:1002" → {"name": "Bob", "age": 25}
```

**Optimizations for a single server:**
- Data compression
- Store frequently accessed data in memory, rest on disk
- LRU eviction when memory is full

**Limitation**: A single server can't hold all data or handle all traffic. We need distribution.

---

## Distributed Key-Value Store — CAP Trade-offs

From the CAP theorem (Chapter 3 in Building Microservices):

| Choice | What You Get | What You Sacrifice | Real Systems |
|--------|-------------|-------------------|--------------|
| **CP** | Consistent data across all nodes | Availability during partitions | HBase, MongoDB (default), Google Spanner |
| **AP** | Always respond to requests | May return stale data | Cassandra, DynamoDB, CouchDB, Riak |

**For this design, we choose AP with tunable consistency** — the Dynamo model.

---

## Core Components

### 1. Data Partitioning — Consistent Hashing

Use consistent hashing (Chapter 5) to distribute data across nodes:

```
  Hash Ring:
  
  Key "user:1001" → hash → position 350 → clockwise → Node N2 (position 400)
  Key "user:1002" → hash → position 750 → clockwise → Node N0 (position 800)
```

**Benefits:**
- Automatic, even distribution
- Adding a node only moves a fraction of keys
- Virtual nodes handle heterogeneous hardware

### 2. Data Replication

Replicate each key on N nodes (typically N=3) for reliability:

```
  Key K at position 350:
    N2 (primary)  ─── position 400
    N3 (replica)  ─── position 550
    N0 (replica)  ─── position 800
    
  Walk clockwise, pick the next N distinct physical nodes.
```

Nodes that hold replicas of a key form a **preference list**. If a node is temporarily down, the next node on the ring temporarily takes over (hinted handoff).

### 3. Consistency — Quorum Consensus

Use **quorum parameters** to tune consistency vs availability:

| Parameter | Meaning |
|-----------|---------|
| **N** | Number of replicas (e.g., 3) |
| **W** | Write quorum — write succeeds when W replicas acknowledge |
| **R** | Read quorum — read succeeds when R replicas respond |

**The quorum condition**: **W + R > N** guarantees strong consistency (at least one node overlaps between read and write sets).

| Configuration | Behavior | Use Case |
|--------------|----------|----------|
| **W=1, R=1** | Fastest; weakest consistency | Best-effort, high throughput |
| **W=1, R=N** | Fast writes, slow reads, strong read consistency | Write-heavy workloads |
| **W=N, R=1** | Slow writes, fast reads, strong write consistency | Read-heavy workloads |
| **W=N/2+1, R=N/2+1** | Balanced quorum (majority) | Typical production setting |
| **W=1, R=1** (N=3) | W+R ≤ N → eventual consistency | Maximum availability |

**Practical example with N=3:**

```
  Write with W=2:
    Client ──▶ Coordinator
    Coordinator ──▶ N1 ──▶ ACK ✓
    Coordinator ──▶ N2 ──▶ ACK ✓    ← W=2 met, return success to client
    Coordinator ──▶ N3 ──▶ (async)   ← third replica updated eventually
    
  Read with R=2:
    Client ──▶ Coordinator
    Coordinator ──▶ N1 ──▶ value v2 (latest)
    Coordinator ──▶ N2 ──▶ value v2 (latest)    ← R=2 met
    Coordinator ──▶ N3 ──▶ (not needed)
    
    Return v2 to client
```

### 4. Consistency Models

| Model | Description | Example |
|-------|-------------|---------|
| **Strong consistency** | Any read returns the most recent write. W + R > N. | Bank balance |
| **Eventual consistency** | Given enough time, all replicas converge. W + R ≤ N. | Social media feed |
| **Causal consistency** | Operations that are causally related appear in order. | Chat messages |

**Dynamo/Cassandra default**: Eventual consistency with tunable quorums.

---

## Handling Conflicts — Versioning

When multiple nodes accept writes concurrently (AP system), conflicts occur:

### Vector Clocks

A vector clock is a list of `[server, version]` pairs that tracks the causal history of a value:

```
  Initial:    D1 [Sx, 1]                        (Server X writes v1)
  Update:     D2 [Sx, 1] [Sy, 1]                (Server Y updates v1 → v2)
  
  Concurrent writes (conflict):
    Client A:  D3 [Sx, 1] [Sy, 1] [Sz, 1]       (Server Z updates from D2)
    Client B:  D4 [Sx, 1] [Sy, 1] [Sz, 2]       (Server Z gets different update)
    
  D3 and D4 are SIBLINGS — neither descends from the other.
  → Client must resolve the conflict on next read.
```

**Conflict resolution strategies:**

| Strategy | How | Used By |
|----------|-----|---------|
| **Last-Writer-Wins (LWW)** | Timestamp-based; most recent write wins | Cassandra |
| **Client-side resolution** | Return all siblings; client merges | Riak, DynamoDB |
| **CRDTs** | Conflict-free Replicated Data Types — mathematically guaranteed merge | Riak (counters, sets) |
| **Application-specific** | Business logic decides (e.g., merge shopping carts) | DynamoDB |

**Vector clock downsides:**
- Can grow large with many servers → prune entries older than a threshold
- Adds complexity to the client

---

## Handling Failures

### 1. Failure Detection — Gossip Protocol

How do nodes know when another node is down?

```
  Every T seconds, each node:
    1. Picks a random node
    2. Sends its membership list (node → heartbeat counter)
    3. Receives the other node's membership list
    4. Merges: increment own counter; update entries with higher counters
    5. If a node's heartbeat hasn't increased for > threshold → mark suspected down
```

```
  Node A: {A:10, B:8, C:5}
  Node B: {A:9,  B:9, C:5}
  
  After gossip exchange:
  Node A: {A:10, B:9, C:5}  ← B's counter updated
  Node B: {A:10, B:9, C:5}  ← A's counter updated
```

**Properties:**
- Decentralized — no single point of failure for detection
- Scalable — each node only communicates with a few others per round
- Eventually converges — all nodes agree on membership within a few gossip rounds

### 2. Temporary Failures — Hinted Handoff

When a node is temporarily down, another node handles its traffic:

```
  Normal:  Key K → N1 (primary), N2, N3
  N2 down: Key K → N1 (primary), N4 (temporary), N3
  
  N4 stores a "hint" that this data belongs to N2.
  When N2 recovers, N4 sends the data back to N2.
```

This maintains write availability even during node failures — **sloppy quorum**.

### 3. Permanent Failures — Anti-Entropy with Merkle Trees

When a replica is permanently lost or data drifts, nodes synchronize using **Merkle trees**:

```
  Merkle Tree (hash tree):
  
           Root Hash: H(H12 + H34)
            ╱                ╲
     H12: H(H1+H2)     H34: H(H3+H4)
       ╱     ╲           ╱     ╲
    H1:K1  H2:K2     H3:K3  H4:K4
```

**Synchronization process:**
1. Each node builds a Merkle tree over its key range
2. Compare root hashes between two nodes
3. If roots differ → compare children
4. Recurse until you find the specific keys that differ
5. Only sync the differing keys

**Efficiency**: If two replicas have 1 billion keys and only 10 differ, Merkle tree comparison finds them in O(log N) comparisons instead of comparing all 1 billion.

### 4. Data Center Outage

Replicate data across multiple data centers:

```
  DC1 (US-East):  N1, N2, N3
  DC2 (EU-West):  N4, N5, N6
  
  Key K replicated to: N1 (DC1), N2 (DC1), N4 (DC2)
  
  If DC1 goes down → DC2 still serves reads and writes
```

---

## Write Path

```
  Client Write (key, value)
       │
       ▼
  1. Write to commit log (on disk) ← durability guarantee
  2. Write to in-memory table (memtable)
       │
       ▼ (when memtable is full)
  3. Flush to SSTable on disk (sorted, immutable)
       │
       ▼
  4. Periodically compact SSTables (merge + remove tombstones)
```

This is the **LSM-tree** (Log-Structured Merge-tree) storage engine, used by Cassandra, LevelDB, RocksDB, and HBase.

## Read Path

```
  Client Read (key)
       │
       ▼
  1. Check memtable (in-memory) → found? Return.
       │ (miss)
       ▼
  2. Check Bloom filter → key might be in which SSTable?
       │
       ▼
  3. Read from SSTable(s) on disk → merge results
       │
       ▼
  4. Return the latest version to client
```

**Bloom filter**: A probabilistic data structure that tells you "definitely not in set" or "probably in set." Avoids unnecessary disk reads. False positive rate ~1% with proper tuning.

---

## Architecture Summary

```
  ┌──────────────────────────────────────┐
  │         Distributed KV Store         │
  ├──────────────────────────────────────┤
  │  Client API: get(key), put(key, val) │
  ├──────────────────────────────────────┤
  │  Coordinator (any node)              │
  ├──────────────────────────────────────┤
  │  Consistent Hashing (partition)      │
  │  Quorum Consensus  (consistency)     │
  │  Vector Clocks     (versioning)      │
  │  Gossip Protocol   (failure detect)  │
  │  Hinted Handoff    (temp failure)    │
  │  Merkle Trees      (anti-entropy)    │
  ├──────────────────────────────────────┤
  │  LSM-Tree Storage Engine             │
  │  Commit Log → Memtable → SSTables   │
  └──────────────────────────────────────┘
```

---

## Interview Cheat Sheet

**Q: How does a distributed key-value store handle writes?**
> The client sends a write to any node (coordinator). The coordinator replicates the write to N nodes on the hash ring. The write succeeds when W of N nodes acknowledge. Data is written to a commit log for durability, then to an in-memory memtable, which is periodically flushed to immutable SSTables on disk. This is the LSM-tree approach used by Cassandra and DynamoDB.

**Q: How do you handle conflicts in an eventually consistent system?**
> Use vector clocks to track causal history of values. When concurrent writes create conflicting versions (siblings), resolution happens either via last-writer-wins (Cassandra), client-side merge (Riak, DynamoDB), or CRDTs for specific data types. The choice depends on whether data loss from LWW is acceptable.

**Q: Explain the quorum approach to consistency.**
> With N replicas, W write acknowledgments, and R read responses: if W+R > N, at least one node in the read set has the latest write (strong consistency). Tuning W and R lets you trade consistency for latency and availability. W=1 for fast writes, R=N for guaranteed fresh reads, or majority quorum (N/2+1) for balance.

**Q: How do nodes detect failures?**
> Gossip protocol: each node periodically shares its heartbeat counter with random peers. If a node's counter hasn't increased beyond a threshold, it's marked as suspected down. This is decentralized (no SPOF), scalable, and eventually consistent. Hinted handoff handles temporary failures; Merkle tree anti-entropy handles permanent data drift.

**Q: What is a Bloom filter and why is it used?**
> A space-efficient probabilistic data structure that can tell you "this key is definitely NOT in this SSTable" or "this key MIGHT be in this SSTable." Used in the read path to avoid unnecessary disk reads. A false positive causes one extra disk read; a false negative never happens. Dramatically improves read performance in LSM-tree storage engines.
