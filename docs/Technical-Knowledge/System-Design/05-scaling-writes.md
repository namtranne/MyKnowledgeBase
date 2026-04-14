---
sidebar_position: 6
title: "05 — Scaling Writes"
---

# ✍️ Scaling Writes

While most systems are read-heavy, write-heavy workloads present a fundamentally different challenge. You can cache reads, but every write must eventually hit durable storage. Scaling writes requires rethinking how data is partitioned, buffered, stored, and replicated.

---

## 🔍 The Core Problem

A single database node has hard limits on write throughput:

| Bottleneck | Why It Limits Writes | Typical Limit |
|-----------|---------------------|---------------|
| **Disk I/O** | Every commit must be durable (fsync) | SSD: ~50K-100K IOPS |
| **WAL throughput** | Sequential write to Write-Ahead Log | Network-attached: ~500 MB/s |
| **Lock contention** | Concurrent writes to the same rows | Depends on access pattern |
| **Index maintenance** | Every write updates B-Tree indexes | More indexes = slower writes |
| **Replication** | Synchronous replication adds latency per write | 1-5ms per replica ACK |
| **Connection limits** | Each writer needs a connection | PostgreSQL: ~500 connections |
| **Single-leader bottleneck** | All writes funnel through one node | Node capacity is the ceiling |

### Write-Heavy System Examples

| System | Write Pattern | Volume |
|--------|--------------|--------|
| **IoT telemetry** | Millions of sensors reporting every second | 1M+ writes/sec |
| **Logging / observability** | Every request generates log entries | 100K+ writes/sec |
| **Ad click tracking** | Every impression and click recorded | 500K+ events/sec |
| **Financial tick data** | Every market quote and trade | 10M+ events/sec |
| **Social media** | Posts, likes, comments, views | Billions/day |
| **Gaming leaderboards** | Score updates on every action | 100K+ updates/sec |

---

## 🔧 Approach 1: Horizontal Sharding (Partitioning)

Split the data across multiple independent database instances. Each shard handles a subset of the data and a fraction of the total write load.

### Sharding Strategies

#### Hash-Based Sharding

```
shard_id = hash(partition_key) % num_shards
```

```
┌──────────────────────────────────────────────────────┐
│                    Application                       │
│     shard = hash(user_id) % 4                        │
└───────┬──────────┬──────────┬──────────┬─────────────┘
        │          │          │          │
   hash=0     hash=1     hash=2     hash=3
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │Shard 0 │ │Shard 1 │ │Shard 2 │ │Shard 3 │
   │Users   │ │Users   │ │Users   │ │Users   │
   │0,4,8.. │ │1,5,9.. │ │2,6,10..│ │3,7,11..│
   └────────┘ └────────┘ └────────┘ └────────┘
```

| Pros | Cons |
|------|------|
| Even distribution of data | Adding/removing shards requires resharding |
| Simple to implement | Range queries across shards are expensive |
| Predictable routing | No locality for related data |

#### Range-Based Sharding

```
Shard 0: user_id 1 - 1,000,000
Shard 1: user_id 1,000,001 - 2,000,000
Shard 2: user_id 2,000,001 - 3,000,000
```

| Pros | Cons |
|------|------|
| Range queries are efficient (within a shard) | Hot spots if recent data is always in the latest shard |
| Sequential scans are fast | Uneven distribution if data isn't uniform |
| Natural partitioning for time-series | Must split and rebalance manually |

#### Directory-Based Sharding

A lookup service maps each key to its shard.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Application │────►│  Directory   │────►│  Shard N     │
│              │     │  Service     │     │              │
└──────────────┘     │              │     └──────────────┘
                     │ user:42 → S3 │
                     │ user:43 → S1 │
                     │ user:44 → S3 │
                     └──────────────┘
```

| Pros | Cons |
|------|------|
| Flexible — can move individual keys | Directory is a single point of failure |
| Supports non-uniform distribution | Extra lookup latency |
| Easy to rebalance | Must be cached aggressively |

#### Consistent Hashing

Distributes keys on a hash ring. Adding/removing nodes only moves a fraction of the keys.

```
                        Node A
                      ╱        ╲
                   ╱              ╲
                Node D              Node B
                   ╲              ╱
                      ╲        ╱
                        Node C

Key "user:42" → hash → lands between Node B and Node C → assigned to Node C
Adding Node E between B and C → only keys between B and E move to E
```

| Pros | Cons |
|------|------|
| Adding/removing nodes moves minimal keys | Uneven distribution without virtual nodes |
| No full resharding needed | More complex routing logic |
| Used by DynamoDB, Cassandra, Riak | Hot spots still possible without careful key design |

**Virtual nodes:** Each physical node owns multiple positions on the ring (e.g., 256 virtual nodes per physical node), ensuring more even distribution.

### Choosing a Partition Key

The partition key is the most critical design decision in a sharded system. A bad key creates hot shards.

| Key Choice | Good For | Risk |
|-----------|---------|------|
| `user_id` | Per-user data (orders, sessions) | Celebrity users create hot shards |
| `order_id` | Order processing pipelines | Even distribution, but cross-user queries are hard |
| `timestamp` | Time-series / logs | All writes hit the latest shard (hot spot!) |
| `region_id` | Geographic data | Uneven if one region dominates |
| `hash(user_id + date)` | Composite key for time-bounded user data | Good distribution, but complex queries |

:::warning Time-Based Partition Keys
Never use timestamp alone as a partition key for append-heavy workloads. All writes go to the "current" partition, creating a massive hot spot. Instead, use a composite key: `hash(device_id) + timestamp` or pre-split partitions by time range.
:::

### Cross-Shard Operations

The biggest challenge with sharding is operations that span multiple shards:

| Operation | Challenge | Solution |
|-----------|-----------|----------|
| **Cross-shard JOIN** | Data lives on different shards | Denormalize, or query both and merge in app |
| **Cross-shard transaction** | No single DB transaction | Saga pattern (see [Chapter 03](./03-multistep-process.md)) |
| **Global aggregation** | COUNT, SUM across all shards | Scatter-gather pattern or maintain counters |
| **Unique constraint** | Can't enforce uniqueness across shards | Global ID service or probabilistic (UUID) |
| **Rebalancing** | Moving data between shards | Dual-write during migration, then switch |

---

## 🔧 Approach 2: Write-Optimized Storage Engines (LSM-Trees)

Traditional databases use **B-Trees**, which update data in-place on disk. This requires random I/O for each write. **LSM-Trees** (Log-Structured Merge Trees) convert random writes into sequential writes, dramatically improving write throughput.

### B-Tree vs LSM-Tree

```
B-Tree Write:                          LSM-Tree Write:
                                       
1. Find the page containing the key    1. Write to in-memory buffer (memtable)
2. Read page from disk                 2. When buffer is full, flush to disk
3. Modify the entry                       as a sorted file (SSTable)
4. Write page back to disk             3. Background compaction merges SSTables
                                       
Random I/O ← SLOW                     Sequential I/O ← FAST
```

### LSM-Tree Architecture

```
    Writes
      │
      ▼
┌──────────────┐
│   MemTable   │  ← In-memory sorted buffer (Red-Black tree)
│   (Active)   │     Writes go here first — O(log N)
└──────┬───────┘
       │ Flush when full (e.g., 64MB)
       ▼
┌──────────────┐
│   MemTable   │  ← Previous memtable, being flushed to disk
│ (Immutable)  │     Reads still served from here
└──────┬───────┘
       │ Write as sorted SSTable file
       ▼
┌─────────────────────────────────────────────┐
│              Level 0 (L0)                   │  ← Recent SSTables (may overlap)
│  [SSTable-1] [SSTable-2] [SSTable-3]        │
└──────────────────┬──────────────────────────┘
                   │ Compaction (merge sort)
                   ▼
┌─────────────────────────────────────────────┐
│              Level 1 (L1)                   │  ← Merged, non-overlapping
│  [SSTable-A] [SSTable-B] [SSTable-C]        │
└──────────────────┬──────────────────────────┘
                   │ Compaction
                   ▼
┌─────────────────────────────────────────────┐
│              Level 2 (L2)                   │  ← Larger, non-overlapping
│  [SSTable-X] [SSTable-Y] [SSTable-Z] [...]  │
└─────────────────────────────────────────────┘
```

### Comparison

| Aspect | B-Tree (PostgreSQL, MySQL/InnoDB) | LSM-Tree (RocksDB, Cassandra, ScyllaDB) |
|--------|----------------------------------|----------------------------------------|
| **Write throughput** | Moderate (random I/O) | Very high (sequential I/O) |
| **Read latency** | Low (one tree traversal) | Higher (check memtable + multiple levels) |
| **Space amplification** | Low (in-place update) | Higher (old versions until compaction) |
| **Write amplification** | ~10x (page splits, WAL) | ~10-30x (compaction rewrites) |
| **Predictability** | Consistent | Compaction can cause latency spikes |
| **Range queries** | Excellent (sorted on disk) | Good (sorted within levels) |
| **Use cases** | OLTP, general purpose | Write-heavy: logs, metrics, time-series |

### Databases Using LSM-Trees

| Database | Use Case |
|----------|---------|
| **Apache Cassandra** | Wide-column, time-series, IoT |
| **ScyllaDB** | Cassandra-compatible, lower latency |
| **RocksDB** | Embedded engine (used by CockroachDB, TiKV) |
| **LevelDB** | Embedded engine (by Google) |
| **InfluxDB** | Time-series metrics |
| **Apache HBase** | Hadoop ecosystem wide-column |

---

## 🔧 Approach 3: Write Buffering and Batching

Instead of writing every event individually, buffer writes in memory or a fast intermediary and flush them in batches.

### In-Memory Batching

```python
class WriteBatcher:
    def __init__(self, db, batch_size=1000, flush_interval=1.0):
        self.db = db
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.buffer = []
        self.lock = threading.Lock()
        self._start_flush_timer()
    
    def add(self, record):
        with self.lock:
            self.buffer.append(record)
            if len(self.buffer) >= self.batch_size:
                self._flush()
    
    def _flush(self):
        with self.lock:
            if not self.buffer:
                return
            batch = self.buffer
            self.buffer = []
        
        # Single bulk INSERT instead of 1000 individual INSERTs
        self.db.bulk_insert("events", batch)
    
    def _start_flush_timer(self):
        timer = threading.Timer(self.flush_interval, self._timed_flush)
        timer.daemon = True
        timer.start()
    
    def _timed_flush(self):
        self._flush()
        self._start_flush_timer()
```

### Why Batching Works

```
Individual writes:  1000 INSERTs × 1ms each = 1000ms
Batch write:        1 bulk INSERT of 1000 rows = 10ms

Why? Each individual write requires:
  - Parse SQL
  - Plan query
  - Acquire lock
  - Write to WAL (fsync!)
  - Update indexes
  - Release lock

Batching amortizes: 1 parse, 1 plan, 1 lock, 1 fsync, bulk index update
```

### Kafka as a Write Buffer

Use Kafka as an intermediary to absorb write spikes and smooth them into a steady stream for the database.

```
    Producers (bursty)              Consumer (steady rate)
         │ │ │ │                          │
    10K events/sec                   1K writes/sec
    (peak)                           (database capacity)
         │ │ │ │                          │
         ▼ ▼ ▼ ▼                          ▼
    ┌─────────────────┐            ┌──────────────┐
    │     Kafka       │            │   Database   │
    │   (buffer)      │───────────►│              │
    │   Retains data  │  consumer  │  Writes at   │
    │   until consumed│  group     │  steady rate  │
    └─────────────────┘            └──────────────┘
    
    Kafka absorbs the spike.
    Database processes at its own pace.
    No data loss. No backpressure on producers.
```

### Trade-offs of Buffering

| Advantage | Disadvantage |
|-----------|-------------|
| Massively higher throughput | Data loss risk (buffer crashes before flush) |
| Smoother database load | Increased latency (data not visible until flushed) |
| Absorbs traffic spikes | Complexity of flush management |
| Fewer disk syncs | Ordering can be tricky with multiple buffers |

---

## 🔧 Approach 4: Event Sourcing

Instead of storing the **current state**, store every **state change** (event) as an immutable, append-only log. The current state is derived by replaying events.

### Traditional CRUD vs Event Sourcing

```
CRUD:                              Event Sourcing:
                                   
UPDATE accounts                    INSERT INTO events VALUES
SET balance = 950                    ('AccountCreated', {balance: 1000})
WHERE id = 42;                       ('MoneyWithdrawn', {amount: 50})
                                     ('MoneyDeposited', {amount: 200})
                                     ('MoneyWithdrawn', {amount: 100})
                                   
Current state: balance = 950       Current state: replay events
                                     1000 - 50 + 200 - 100 = 1050
History: LOST                      History: COMPLETE
```

### Architecture

```
    Commands                    Event Store              Read Models
       │                      (Append-Only)              (Projections)
       ▼                           │                          ▲
┌──────────────┐            ┌──────┴──────┐           ┌──────┴──────┐
│   Command    │  ─events─► │    Kafka    │ ─events─► │  Projector  │
│   Handler    │            │  / EventDB  │           │  Service    │
│              │            │             │           │             │
│ Validates &  │            │ Event 1     │           │ Builds read │
│ produces     │            │ Event 2     │           │ models from │
│ events       │            │ Event 3     │           │ events      │
└──────────────┘            │ ...         │           └──────┬──────┘
                            └─────────────┘                  │
                                                      ┌──────▼──────┐
                                                      │ Read Store  │
                                                      │ (Postgres,  │
                                                      │  Redis, ES) │
                                                      └─────────────┘
```

### Why Event Sourcing Scales Writes

| Reason | Explanation |
|--------|-------------|
| **Append-only** | No read-modify-write cycle — just append to a log |
| **No locking** | Immutable events don't conflict with each other |
| **Sequential I/O** | Appending to a log is the fastest disk operation |
| **Natural partitioning** | Events are partitioned by aggregate ID |
| **Kafka-native** | Kafka is an event store — infinite retention, partitioned, replicated |

### Event Store Schema

```sql
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    event_data      JSONB NOT NULL,
    metadata        JSONB,              -- correlation_id, user_id, etc.
    version         BIGINT NOT NULL,    -- per-aggregate sequence number
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (aggregate_id, version)      -- optimistic concurrency per aggregate
);

CREATE INDEX idx_events_aggregate ON events (aggregate_id, version);
```

### Snapshots for Performance

Replaying thousands of events to build current state is slow. **Snapshots** periodically capture the current state to reduce replay time.

```
Events:  [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12]
                            │
                        Snapshot at event 6
                        {balance: 1050, version: 6}

To rebuild state: Load snapshot → replay events 7-12 (6 events instead of 12)
```

```python
def get_aggregate(aggregate_id):
    # Load latest snapshot
    snapshot = db.query(
        "SELECT * FROM snapshots WHERE aggregate_id = %s ORDER BY version DESC LIMIT 1",
        aggregate_id
    )
    
    if snapshot:
        state = deserialize(snapshot.data)
        from_version = snapshot.version + 1
    else:
        state = initial_state()
        from_version = 1
    
    # Replay events since snapshot
    events = db.query(
        "SELECT * FROM events WHERE aggregate_id = %s AND version >= %s ORDER BY version",
        aggregate_id, from_version
    )
    
    for event in events:
        state = apply_event(state, event)
    
    return state
```

### Event Sourcing Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Complete audit trail / history | Event schema evolution is hard |
| Can rebuild any past state | Eventual consistency for read models |
| Natural write scaling (append-only) | Higher storage requirements |
| Easy to add new projections retroactively | Learning curve and paradigm shift |
| Built-in debugging (replay events) | Querying the event store directly is painful |

---

## 🔧 Approach 5: Multi-Leader and Conflict-Free Replication

For globally distributed write-heavy workloads, accept writes at multiple locations and handle conflicts.

### Multi-Leader Replication

```
┌──────────────┐     async replication     ┌──────────────┐
│  Leader US   │ ◄────────────────────────► │  Leader EU   │
│  (writes)    │                            │  (writes)    │
└──────────────┘                            └──────────────┘
       │                                           │
  Local reads                                 Local reads
  US clients                                  EU clients
```

**Use case:** Globally distributed applications where write latency must be low (writes are local to the user's region).

**Challenge:** What happens when the same record is updated in both US and EU simultaneously?

### Conflict Resolution Strategies

| Strategy | How It Works | Data Loss Risk |
|----------|-------------|----------------|
| **Last-Writer-Wins (LWW)** | Highest timestamp wins | Yes — silent data loss |
| **Custom merge function** | Application-specific logic to merge | No — but complex to implement |
| **CRDTs** | Data structures that automatically converge | No — but limited data types |
| **Manual resolution** | Present conflict to user | No — but bad UX |

### CRDTs (Conflict-Free Replicated Data Types)

Data structures that can be updated independently on multiple replicas and always converge to the same state without coordination.

| CRDT Type | Description | Use Case |
|-----------|-------------|----------|
| **G-Counter** | Grow-only counter (per-node increments, sum to read) | View counts, like counts |
| **PN-Counter** | Counter supporting increment and decrement | Shopping cart quantity |
| **G-Set** | Grow-only set (add only, no remove) | Tags, followers |
| **OR-Set** | Observed-Remove set (add and remove) | Collaborative lists |
| **LWW-Register** | Last-writer-wins single value | User profile fields |
| **MV-Register** | Multi-value register (keeps all concurrent values) | Conflict detection |

#### G-Counter Example

```
Node A counter: {A: 5, B: 0, C: 0} → local value: 5
Node B counter: {A: 0, B: 3, C: 0} → local value: 3
Node C counter: {A: 0, B: 0, C: 7} → local value: 7

Merge (element-wise max):
{A: 5, B: 3, C: 7} → total value: 15

No conflicts, no coordination, always convergent.
```

---

## 🔧 Approach 6: Partitioned Message Queues

Decouple write ingestion from write processing using partitioned queues. This absorbs traffic spikes, enables horizontal scaling of consumers, and provides natural ordering guarantees.

### Kafka Partition Strategy for Write Scaling

```
    Producers (100K events/sec)
         │ │ │ │ │ │
         ▼ ▼ ▼ ▼ ▼ ▼
    ┌─────────────────────────────────────────┐
    │            Kafka Topic                  │
    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
    │  │ P0   │ │ P1   │ │ P2   │ │ P3   │   │  12 partitions
    │  │      │ │      │ │      │ │      │   │  = 12x write
    │  └──────┘ └──────┘ └──────┘ └──────┘   │  throughput
    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
    │  │ P4   │ │ P5   │ │ P6   │ │ P7   │   │
    │  └──────┘ └──────┘ └──────┘ └──────┘   │
    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
    │  │ P8   │ │ P9   │ │ P10  │ │ P11  │   │
    │  └──────┘ └──────┘ └──────┘ └──────┘   │
    └─────────────────────────────────────────┘
         │ │ │ │ │ │ │ │ │ │  │  │
         ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼  ▼  ▼
    ┌────────────────────────────────────┐
    │       Consumer Group              │
    │  12 consumers, one per partition  │
    │  Each writes to its own DB shard  │
    └────────────────────────────────────┘
```

### Key Design Principle

Choose the Kafka partition key to match the database shard key. This ensures:
- Ordering per entity (all events for entity X go to partition Y)
- No cross-shard writes (consumer N only writes to shard N)
- Natural parallelism (more partitions = more consumers = more throughput)

---

## ⚖️ Comparison Matrix

| Strategy | Write Throughput | Read Impact | Complexity | Consistency | Best For |
|----------|:---------------:|:-----------:|:----------:|:-----------:|----------|
| **Sharding** | Very High | Moderate (cross-shard queries) | High | Strong (per-shard) | General scaling |
| **LSM-Trees** | Very High | Moderate (read amplification) | Low (use the right DB) | Strong | Logs, metrics, time-series |
| **Write Batching** | High | None | Low | Eventual (flush delay) | Absorbing spikes |
| **Event Sourcing** | Very High | N/A (separate read model) | High | Eventual | Audit, complex domains |
| **Multi-Leader** | High (per region) | Low | Very High | Eventual (conflict resolution) | Global distribution |
| **CRDTs** | High | None | Medium | Strong Eventual | Counters, sets, collaboration |
| **Partitioned Queues** | Very High | None | Medium | Eventual | Ingestion pipelines |

### Decision Framework

```
What's your write pattern?
├── Append-only (logs, events, metrics)
│   └── LSM-Tree database (Cassandra, ScyllaDB) + time-based partitioning
├── Update-heavy (user data, inventory)
│   ├── Single region? → Shard by entity ID
│   └── Multi-region? → Multi-leader + conflict resolution (CRDTs if possible)
├── Bursty (traffic spikes, campaigns)
│   └── Kafka buffer → batch consumers → database
└── Complex domain (finance, e-commerce)
    └── Event Sourcing + CQRS

What's your acceptable latency for write visibility?
├── Immediate → Synchronous writes (sharding)
├── Seconds → Async replication or buffering
└── Minutes → Batch processing
```

---

## 🧠 Key Takeaways

1. **Sharding is the primary tool for scaling writes** — but choosing the right partition key is more important than the sharding strategy
2. **LSM-Trees trade read performance for write performance** — use them when your workload is write-heavy (logs, metrics, IoT)
3. **Batching is the lowest-effort optimization** — converting 1000 individual INSERTs into 1 bulk INSERT can improve throughput 100x
4. **Event sourcing is a write-optimized architecture** — append-only logs with separate read projections naturally scale writes
5. **Kafka is a universal write buffer** — it decouples ingestion from processing, absorbs spikes, and provides ordering guarantees
6. **CRDTs solve multi-writer conflicts mathematically** — prefer them over Last-Writer-Wins when data correctness matters
7. **Cross-shard operations are the tax you pay for sharding** — minimize them by co-locating related data on the same shard

:::info Interview Strategy
When asked "How do you scale writes?", don't jump to sharding. Start with: "What's the write pattern?" Append-only workloads → LSM-Trees. Bursty → Kafka buffer. Update-heavy → sharding. Then discuss the partition key choice and cross-shard implications. Mentioning event sourcing and CRDTs shows deep understanding.
:::
