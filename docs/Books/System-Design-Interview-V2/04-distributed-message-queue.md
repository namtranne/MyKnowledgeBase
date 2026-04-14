# Chapter 4: Distributed Message Queue

## 1. Problem Statement & Requirements

### What Are We Designing?

A **distributed message queue** (more precisely, an **event streaming platform**) similar to Apache Kafka. The system decouples producers from consumers, enabling asynchronous communication at massive scale.

### Message Queue vs Event Streaming Platform

| Aspect | Traditional Message Queue (RabbitMQ, SQS) | Event Streaming Platform (Kafka, Pulsar) |
|---|---|---|
| Consumption model | Message deleted after consumption | Messages retained, replayable |
| Consumer pattern | Competing consumers | Consumer groups + independent readers |
| Ordering | No strong ordering (or FIFO queues) | Per-partition ordering guaranteed |
| Retention | Until consumed | Time-based or size-based retention |
| Replay | Not possible | Seek to any offset |
| Use cases | Task queues, RPC | Event sourcing, stream processing, log aggregation |

In an interview, clarify which model the interviewer wants. This chapter focuses on the **event streaming** model (Kafka-like).

### Functional Requirements

1. **Producers** publish messages to named **topics**
2. **Consumers** subscribe to topics and read messages
3. **Topics** are split into **partitions** for parallelism
4. **Repeated consumption**: consumers can re-read messages (seek to earlier offset)
5. **Configurable delivery semantics**:
   - **At-most-once**: message may be lost, never duplicated
   - **At-least-once**: message never lost, may be duplicated
   - **Exactly-once**: message delivered exactly once (strongest guarantee)
6. **Message ordering** guaranteed within a partition
7. **Configurable retention** (time-based: 7 days default, or size-based)

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| Throughput | Millions of messages/sec |
| Data volume | Terabytes per day |
| Latency | Low ms for produce/consume (p99 < 10ms) |
| Durability | No data loss once acknowledged |
| Scalability | Horizontal scaling of brokers, partitions, consumers |
| Availability | Survive broker failures without downtime |
| Persistence | Messages stored on disk, not just in memory |

### Scale Estimation (Back-of-Envelope)

```
Messages/sec:        1,000,000
Avg message size:    1 KB
Daily data:          1M × 1KB × 86,400 = ~86 TB/day
Retention:           7 days → ~600 TB storage
Replication factor:  3 → ~1.8 PB total storage
Write throughput:    ~1 GB/s (before replication)
```

---

## 2. High-Level Design

### Core Components

```
┌──────────┐    ┌──────────────────────────────────────────┐    ┌──────────┐
│ Producer  │───▶│              Broker Cluster              │───▶│ Consumer │
│  (App A)  │    │                                          │    │  (App X) │
└──────────┘    │  ┌────────┐  ┌────────┐  ┌────────┐     │    └──────────┘
                │  │Broker 0│  │Broker 1│  │Broker 2│     │
┌──────────┐    │  │        │  │        │  │        │     │    ┌──────────┐
│ Producer  │───▶│  │ P0(L)  │  │ P1(L)  │  │ P2(L)  │     │───▶│ Consumer │
│  (App B)  │    │  │ P1(F)  │  │ P2(F)  │  │ P0(F)  │     │    │  (App Y) │
└──────────┘    │  │ P2(F)  │  │ P0(F)  │  │ P1(F)  │     │    └──────────┘
                │  └────────┘  └────────┘  └────────┘     │
                │                                          │
                │         ┌───────────────────┐            │
                │         │ Coordination Svc  │            │
                │         │ (ZooKeeper/KRaft) │            │
                │         └───────────────────┘            │
                └──────────────────────────────────────────┘

L = Leader replica, F = Follower replica
```

### Message Model: Topics and Partitions

```
                         Topic: "user-events"
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  Partition 0:  [msg0][msg1][msg2][msg3][msg4][msg5]──▶  │
    │                                                         │
    │  Partition 1:  [msg0][msg1][msg2][msg3]──▶              │
    │                                                         │
    │  Partition 2:  [msg0][msg1][msg2][msg3][msg4]──▶        │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
                        ▲                        │
                   Producers                 Consumers
                   write here               read from here
```

- A **topic** is a logical channel (e.g., "orders", "user-clicks")
- Each topic has N **partitions** (set at topic creation time)
- Each partition is an **ordered, append-only log**
- Messages within a partition have a monotonically increasing **offset**
- Ordering is guaranteed **only within a partition**, not across partitions

### Consumer Groups

```
    Topic: "orders" (3 partitions)

    ┌──────────┐
    │Partition 0│──────▶ Consumer A  ┐
    ├──────────┤                     │  Consumer Group "order-service"
    │Partition 1│──────▶ Consumer B  │  (each partition → exactly 1 consumer)
    ├──────────┤                     │
    │Partition 2│──────▶ Consumer C  ┘
    └──────────┘

    ┌──────────┐
    │Partition 0│──┐
    ├──────────┤   ├───▶ Consumer D     Consumer Group "analytics"
    │Partition 1│──┤                    (1 consumer reads all partitions)
    ├──────────┤   │
    │Partition 2│──┘
    └──────────┘
```

**Key rules:**
- Each partition is consumed by **exactly one consumer** within a consumer group
- Different consumer groups read **independently** (each maintains its own offset)
- If consumers > partitions in a group, excess consumers sit idle
- If consumers < partitions, some consumers handle multiple partitions

### Broker Architecture

Each broker is a server that:
1. Stores partition data on local disk
2. Serves produce requests (append to log)
3. Serves fetch requests (read from log)
4. Replicates data to/from other brokers
5. Participates in leader election

One broker is elected as the **controller** — responsible for partition assignment and leader election.

---

## 3. Data Storage Deep Dive

### Why Not a Traditional Database?

| Approach | Problem |
|---|---|
| Relational DB (MySQL, Postgres) | B-tree writes cause random I/O; write amplification; row-level locking contention |
| NoSQL (Cassandra, MongoDB) | Overhead of indexing, compaction; not optimized for sequential append |
| In-memory (Redis) | Memory is expensive; data loss on crash; doesn't scale to TB |

The access pattern is simple: **append-only writes, sequential reads**. This is a perfect fit for a **log-structured storage** approach.

### Write-Ahead Log (WAL) / Commit Log

The core storage abstraction is a **commit log** — an ordered, append-only sequence of records.

```
Partition Log (logical view):

  offset:  0    1    2    3    4    5    6    7    8    ...
         ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐
         │msg │msg │msg │msg │msg │msg │msg │msg │msg │ ──▶ new writes
         │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │    appended here
         └────┴────┴────┴────┴────┴────┴────┴────┴────┘
         ▲                                          ▲
     oldest                                     newest
```

### Why Sequential I/O Is Fast

```
Sequential I/O on HDD:   ~100-200 MB/s
Random I/O on HDD:       ~1-2 MB/s       (100x slower)

Sequential I/O on SSD:   ~500-1000 MB/s
Random I/O on SSD:       ~50-100 MB/s    (10x slower)
```

Key insight: **sequential disk writes can be faster than random memory access** in certain scenarios. The OS page cache makes sequential reads nearly as fast as memory reads. This is why Kafka achieves high throughput with disk-based storage.

Techniques that enable high performance:
- **OS page cache**: the OS caches recently read/written disk pages in memory
- **Zero-copy transfer**: `sendfile()` syscall transfers data from disk to network socket without copying through user space
- **Append-only writes**: no seeking, no in-place updates
- **Batched I/O**: multiple messages written in a single disk write

### Segment Files

A partition log is split into **segment files** to enable efficient cleanup and prevent unbounded file growth.

```
topic-partition/
├── 00000000000000000000.log        ← segment 1 (immutable, offsets 0-12344)
├── 00000000000000000000.index      ← offset index for segment 1
├── 00000000000000000000.timeindex  ← time index for segment 1
├── 00000000000000012345.log        ← segment 2 (immutable, offsets 12345-24689)
├── 00000000000000012345.index
├── 00000000000000012345.timeindex
├── 00000000000000024690.log        ← segment 3 (ACTIVE, currently being written)
├── 00000000000000024690.index
└── 00000000000000024690.timeindex
```

- Segment filename = base offset of first message in that segment
- Only the **last segment** (active segment) is open for writes
- Older segments are **immutable** — simplifies concurrent reads
- Segments are deleted or compacted based on retention policy
- Default segment size: 1 GB or 1 week of data (whichever comes first)

### Message Format (On-Disk Record)

```
┌──────────────────────────────────────────────────────────┐
│  Offset (8 bytes)          │ Unique sequential ID        │
├────────────────────────────┼─────────────────────────────┤
│  Message Size (4 bytes)    │ Total record size            │
├────────────────────────────┼─────────────────────────────┤
│  CRC32 (4 bytes)           │ Checksum for corruption      │
├────────────────────────────┼─────────────────────────────┤
│  Magic Byte (1 byte)       │ Message format version       │
├────────────────────────────┼─────────────────────────────┤
│  Attributes (2 bytes)      │ Compression, timestamp type  │
├────────────────────────────┼─────────────────────────────┤
│  Timestamp (8 bytes)       │ Create time or log-append    │
├────────────────────────────┼─────────────────────────────┤
│  Key Length (4 bytes)       │ -1 if null                  │
├────────────────────────────┼─────────────────────────────┤
│  Key (variable)            │ Used for partitioning        │
├────────────────────────────┼─────────────────────────────┤
│  Value Length (4 bytes)     │ -1 if null (tombstone)      │
├────────────────────────────┼─────────────────────────────┤
│  Value (variable)          │ Actual message payload       │
├────────────────────────────┼─────────────────────────────┤
│  Headers (variable)        │ Key-value metadata pairs     │
└──────────────────────────────────────────────────────────┘
```

Modern Kafka uses **record batches** for efficiency — multiple messages compressed and written together.

### Offset Index (Sparse Index)

The index does **not** map every offset. Instead, it's a **sparse index** — one entry per N bytes of log data (default: every 4 KB).

```
Offset Index File:                          Log File:

  Offset  │ File Position                  Position │ Data
  ────────┼──────────────                  ─────────┼──────
  0       │ 0             ─────────────▶   0        │ [msg 0]
  4       │ 1024          ─────────────▶   256      │ [msg 1]
  8       │ 2048          ─────────────▶   512      │ [msg 2]
  12      │ 3200          ─────────────▶   768      │ [msg 3]
                                           1024     │ [msg 4]  ◀── index points here
                                           1280     │ [msg 5]
                                           ...
```

**Lookup algorithm** for offset X:
1. Binary search the segment files by filename to find the right segment
2. Binary search the sparse index to find the largest offset ≤ X
3. Sequential scan from that file position to find offset X

This gives O(log N) lookup with minimal memory usage.

### Time-Based Index

Maps timestamps to offsets. Useful for:
- "Give me all messages after 2pm yesterday"
- Consumer reset to a point in time
- Time-based retention enforcement

```
Timestamp Index:

  Timestamp          │ Offset
  ───────────────────┼────────
  1708000000000      │ 0
  1708000003500      │ 4
  1708000007200      │ 8
  1708000010100      │ 12
```

---

## 4. Producer Design

### Producing a Message — End to End

```
┌──────────────────────────────────────────────────────────────────┐
│                        Producer Client                           │
│                                                                  │
│  Application ──▶ Serializer ──▶ Partitioner ──▶ Record           │
│                                                  Accumulator     │
│                                                     │            │
│                                                     ▼            │
│                                               Batch per          │
│                                               partition          │
│                                                     │            │
│                                                     ▼            │
│                                               Sender Thread      │
│                                               (network I/O)      │
│                                                     │            │
└─────────────────────────────────────────────────────┼────────────┘
                                                      │
                                                      ▼
                                               Broker (Leader)
```

### Partitioning Strategy

| Strategy | How It Works | When to Use |
|---|---|---|
| **Round-robin** | Messages distributed evenly across partitions | No ordering needed, maximize throughput |
| **Key-based (hash)** | `hash(key) % num_partitions` | All messages for same key go to same partition (ordering by key) |
| **Custom partitioner** | User-defined logic | Special routing requirements (e.g., geo-based) |

Example: for an e-commerce system, use `order_id` as the key so all events for an order land in the same partition (preserving order).

**Warning**: if you add partitions later, the hash-to-partition mapping changes, breaking key-based ordering for existing keys.

### Batching

The producer accumulates messages in a buffer before sending:

```
Configuration:
  batch.size = 16384          (16 KB — send when batch reaches this size)
  linger.ms = 5               (wait up to 5ms to fill the batch)
  buffer.memory = 33554432    (32 MB total buffer across all partitions)
```

```
                    Trade-off Spectrum

  Low Latency ◀──────────────────────────▶ High Throughput

  linger.ms = 0                            linger.ms = 100
  batch.size = 1                           batch.size = 1MB
  Send immediately,                        Wait and batch,
  one message at a time                    amortize overhead
```

### Acknowledgement Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                     acks=0  (Fire and Forget)                   │
│                                                                 │
│  Producer ────▶ Broker         (no response waited)             │
│                                                                 │
│  Fastest, but messages may be lost silently                     │
│  Use case: metrics, logging where occasional loss is OK         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     acks=1  (Leader Only)                       │
│                                                                 │
│  Producer ────▶ Leader Broker ────▶ ACK                         │
│                     │                                           │
│                     ├──▶ Follower 1  (async, not waited)        │
│                     └──▶ Follower 2  (async, not waited)        │
│                                                                 │
│  Leader crash before replication → data loss                    │
│  Good balance of durability and performance                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     acks=all (-1)  (All ISR)                    │
│                                                                 │
│  Producer ────▶ Leader Broker ──┬──▶ Follower 1 ──▶ ACK        │
│                                 └──▶ Follower 2 ──▶ ACK        │
│                                          │                      │
│                              All ISR replicated ──▶ ACK to      │
│                                                     Producer    │
│                                                                 │
│  Strongest durability, highest latency                          │
│  Required for exactly-once / no-data-loss scenarios             │
└─────────────────────────────────────────────────────────────────┘
```

### Retry and Idempotency

**Problem**: if the broker writes the message but the ACK is lost, the producer retries and creates a **duplicate**.

**Solution**: idempotent producer.

```
Producer assigns:
  Producer ID (PID):     unique per producer session
  Sequence Number:       monotonically increasing per partition

Broker checks:
  If (PID, Partition, SeqNum) already seen → deduplicate
  If SeqNum = expected → accept
  If SeqNum > expected + 1 → out of order error
  If SeqNum < expected → duplicate, discard
```

Enable with: `enable.idempotence = true` (default in modern Kafka)

### Message Compression

| Codec | Compression Ratio | CPU Cost | Speed |
|---|---|---|---|
| None | 1.0x | — | Fastest |
| Snappy | ~1.5-2x | Low | Fast |
| LZ4 | ~2-3x | Low | Fast |
| GZIP | ~3-5x | High | Slow |
| Zstd | ~3-5x | Medium | Medium-Fast |

Compression is applied at the **batch level** — the entire batch is compressed as one unit. The broker stores compressed batches as-is and consumers decompress. This is part of the "end-to-end" principle: the broker doesn't need to understand message contents.

**Recommendation**: LZ4 or Zstd for most workloads (good ratio with low CPU).

---

## 5. Consumer Design

### Push vs Pull Model

| Aspect | Push (broker → consumer) | Pull (consumer → broker) |
|---|---|---|
| Flow control | Broker decides rate; may overwhelm consumer | Consumer controls rate; natural back-pressure |
| Simplicity | Broker must track consumer state | Consumer manages its own pace |
| Latency | Can be lower (immediate push) | Slight polling delay |
| Idle cost | No wasted resources | Long-polling to reduce empty fetches |
| Batch efficiency | Hard to batch optimally | Consumer decides batch size |

**Kafka uses pull.** Consumers issue fetch requests. Long-polling (`fetch.max.wait.ms`) avoids busy-waiting: the broker holds the request until data is available or timeout expires.

### Consumer Position / Offset Management

Each consumer (within a group) tracks its **offset** per partition — the next message to read.

```
Partition 0:  [0][1][2][3][4][5][6][7][8][9]
                              ▲           ▲
                          committed     log-end
                           offset       offset

  committed offset = 5  → messages 0-4 processed
  current position  = 7  → messages 5-6 fetched, processing
  log-end offset    = 9  → messages 7-9 not yet fetched

  Consumer Lag = log-end offset - committed offset = 4
```

Offsets are stored in a special internal topic: `__consumer_offsets` (compacted topic, replicated).

### Auto-Commit vs Manual Commit

```
┌─────────────────────────────────────────────────────────────┐
│  AUTO-COMMIT (enable.auto.commit = true)                    │
│                                                             │
│  Consumer auto-commits periodically (every 5s by default)   │
│                                                             │
│  Risk: crash between commit and processing → at-most-once   │
│  Risk: process then crash before commit → at-least-once     │
│  Simple but imprecise                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MANUAL COMMIT                                              │
│                                                             │
│  commitSync():  blocks until broker confirms               │
│  commitAsync(): non-blocking, callback on result            │
│                                                             │
│  Pattern for at-least-once:                                 │
│    1. poll() → get messages                                 │
│    2. process all messages                                  │
│    3. commitSync()                                          │
│                                                             │
│  Pattern for at-most-once:                                  │
│    1. poll() → get messages                                 │
│    2. commitSync()                                          │
│    3. process all messages                                  │
└─────────────────────────────────────────────────────────────┘
```

### Consumer Group Rebalancing

Rebalancing occurs when:
- A consumer joins or leaves the group
- A consumer crashes (missed heartbeat)
- Partitions are added to a subscribed topic

**Rebalance protocols:**

| Strategy | Description | Pros | Cons |
|---|---|---|---|
| **Range** | Partitions sorted, divided by consumer count | Predictable | Uneven for many topics |
| **Round-robin** | Partitions assigned in round-robin | Even distribution | All partitions move on rebalance |
| **Sticky** | Try to preserve previous assignment | Minimal partition movement | More complex |
| **Cooperative Sticky** | Incremental rebalance — only reassign necessary partitions | No stop-the-world | Requires 2 rebalance rounds |

```
Eager Rebalance (old):                 Cooperative Rebalance (new):

  1. All consumers revoke ALL           1. Only affected consumers
     partitions                            revoke specific partitions
  2. Re-assign from scratch             2. Reassign only those partitions
  3. All consumers resume               3. Unaffected consumers never stop

  ──── All processing STOPS ────        ──── Minimal disruption ────
```

### Group Coordinator

One broker serves as the **group coordinator** for each consumer group:
1. Manages group membership (heartbeats, session timeouts)
2. Triggers rebalances
3. One consumer is elected **group leader** — it computes the partition assignment and sends it back to the coordinator

```
Consumer A (leader) ◀──┐
Consumer B             ├── Heartbeats ──▶ Group Coordinator (Broker)
Consumer C ────────────┘

  1. Coordinator detects Consumer C is dead (missed heartbeats)
  2. Coordinator notifies remaining consumers to rejoin
  3. Consumer A (leader) recomputes assignment
  4. Coordinator distributes new assignment
```

---

## 6. Replication & Durability

### Leader-Follower Replication

Every partition has one **leader** and N-1 **followers** (where N = replication factor).

```
Partition 0 (replication factor = 3):

   Broker 0               Broker 1              Broker 2
  ┌──────────┐           ┌──────────┐          ┌──────────┐
  │ Partition 0│          │ Partition 0│         │ Partition 0│
  │  (LEADER) │ ────────▶│ (FOLLOWER)│────────▶│ (FOLLOWER) │
  │           │  replicate│          │replicate│            │
  │ [0,1,2,3] │          │ [0,1,2,3]│         │ [0,1,2]    │
  └──────────┘           └──────────┘          └──────────┘
       ▲                                            │
   Producers &                                 Slightly behind
   Consumers                                   (catching up)
   connect here
```

- All reads and writes go through the **leader**
- Followers replicate by fetching from the leader (pull-based)
- Followers that are up-to-date form the **In-Sync Replica set (ISR)**

### In-Sync Replicas (ISR)

A replica is "in-sync" if it has fetched all messages up to the leader's log end within a configurable time window (`replica.lag.time.max.ms`, default 30s).

```
Leader log:      [0][1][2][3][4][5][6][7][8]
                                             ▲ LEO (Log End Offset)

Follower A log:  [0][1][2][3][4][5][6][7][8]  ← in-sync ✓
Follower B log:  [0][1][2][3][4][5][6]        ← in-sync ✓ (within lag threshold)
Follower C log:  [0][1][2]                    ← NOT in-sync ✗ (too far behind)

ISR = {Leader, Follower A, Follower B}
```

### High Watermark

The **high watermark (HW)** is the offset up to which **all ISR replicas** have replicated. Only messages below the high watermark are visible to consumers.

```
Leader log:      [0][1][2][3][4][5][6][7][8]
                                    ▲        ▲
                                    HW       LEO

Follower A:      [0][1][2][3][4][5][6][7][8]
Follower B:      [0][1][2][3][4][5][6]

HW = min(LEO of all ISR) = 6

Consumer can read:  offsets 0-5 (below HW)
Offsets 6-8:        uncommitted, not visible to consumers
```

**Why?** If the leader crashes, any ISR follower can become leader without data loss for committed messages (offsets < HW).

### Leader Election

When the leader fails:

```
1. Controller detects leader is dead (via ZooKeeper/KRaft)
2. Controller selects new leader from ISR
3. Controller notifies all brokers of new leader
4. Producers/consumers redirect to new leader

Timeline:
  t=0       Leader dies
  t=~10s    Controller detects (session timeout)
  t=~10.1s  New leader elected from ISR
  t=~10.5s  Metadata propagated, clients reconnect
```

### Unclean Leader Election

**Scenario**: all ISR replicas are down, only out-of-sync replicas remain.

| Setting | Behavior | Trade-off |
|---|---|---|
| `unclean.leader.election.enable=false` | Partition stays offline until ISR member recovers | **Availability sacrificed** for consistency |
| `unclean.leader.election.enable=true` | Out-of-sync replica becomes leader | **Data loss possible** but availability preserved |

**Interview insight**: this is a classic CAP theorem trade-off. For financial systems, use `false`. For logging/metrics, `true` may be acceptable.

### Replication Factor Trade-offs

| Replication Factor | Durability | Storage Cost | Write Latency (acks=all) | Broker Failures Tolerated |
|---|---|---|---|---|
| 1 | Lowest | 1x | Lowest | 0 |
| 2 | Medium | 2x | Medium | 1 |
| **3 (recommended)** | **High** | **3x** | **Moderate** | **2** |
| 5 | Highest | 5x | Highest | 4 |

### Min ISR (`min.insync.replicas`)

When `acks=all`, the producer waits for all ISR replicas. But what if ISR shrinks to just the leader?

```
min.insync.replicas = 2  (recommended with replication factor 3)

If ISR size < min.insync.replicas:
  → Producer receives NotEnoughReplicasException
  → Write is rejected

This prevents writing to a single replica and thinking it's "durable"
```

**Production configuration for maximum safety:**
```
replication.factor = 3
min.insync.replicas = 2
acks = all
```
This tolerates 1 broker failure without data loss or write unavailability.

---

## 7. Coordination Service

### Responsibilities

```
┌───────────────────────────────────────────────────┐
│              Coordination Service                  │
│                                                    │
│  1. Broker Registration                            │
│     - Track live brokers                           │
│     - Detect broker failures via heartbeats        │
│                                                    │
│  2. Topic & Partition Metadata                     │
│     - Which partitions exist                       │
│     - Leader/follower assignment per partition      │
│     - ISR list per partition                       │
│                                                    │
│  3. Controller Election                            │
│     - Elect one broker as the cluster controller   │
│     - Controller handles partition leader election │
│                                                    │
│  4. Consumer Group Coordination                    │
│     - Track group membership                       │
│     - Trigger rebalancing                          │
│     - Store consumer offsets                       │
└───────────────────────────────────────────────────┘
```

### ZooKeeper vs KRaft

| Aspect | ZooKeeper (legacy) | KRaft (modern, Kafka 3.3+) |
|---|---|---|
| Architecture | External ensemble (3-5 nodes) | Built into Kafka brokers |
| Metadata storage | ZooKeeper znodes | Internal Raft-replicated log |
| Scalability | Bottleneck at ~200K partitions | Millions of partitions |
| Operational complexity | Separate cluster to manage | Single system to operate |
| Controller failover | ~seconds | ~milliseconds |
| Consistency | ZAB protocol | Raft consensus |

```
ZooKeeper Architecture:              KRaft Architecture:

┌──────┐ ┌──────┐ ┌──────┐          ┌──────┐ ┌──────┐ ┌──────┐
│ZK 1  │ │ZK 2  │ │ZK 3  │          │Broker│ │Broker│ │Broker│
└──┬───┘ └──┬───┘ └──┬───┘          │  +   │ │  +   │ │  +   │
   │        │        │               │Ctrl  │ │Ctrl  │ │Ctrl  │
   ▼        ▼        ▼               └──┬───┘ └──┬───┘ └──┬───┘
┌──────┐ ┌──────┐ ┌──────┐             │        │        │
│Kafka │ │Kafka │ │Kafka │             └────────┴────────┘
│Broker│ │Broker│ │Broker│               Raft consensus
└──────┘ └──────┘ └──────┘               (built-in)

  Two separate systems                 Single unified system
  to deploy and monitor                to deploy and monitor
```

**Interview tip**: mention that Kafka is migrating from ZooKeeper to KRaft. KRaft eliminates the external dependency and improves scalability from ~200K to millions of partitions.

---

## 8. Message Delivery Semantics

### The Three Guarantees

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AT-MOST-ONCE                                 │
│                                                                     │
│  1. Receive message                                                 │
│  2. Commit offset        ← offset saved BEFORE processing          │
│  3. Process message      ← if crash here, message is lost          │
│                                                                     │
│  Guarantee: never duplicated, may be lost                           │
│  Use case: metrics where occasional loss is acceptable              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        AT-LEAST-ONCE                                │
│                                                                     │
│  1. Receive message                                                 │
│  2. Process message      ← processed BEFORE offset committed       │
│  3. Commit offset        ← if crash here, message reprocessed      │
│                                                                     │
│  Guarantee: never lost, may be duplicated                           │
│  Use case: most applications (with idempotent processing)           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        EXACTLY-ONCE                                 │
│                                                                     │
│  Requires BOTH:                                                     │
│  • Idempotent producer (PID + sequence number)                      │
│  • Transactional consumer (read-process-write atomically)           │
│                                                                     │
│  1. Begin transaction                                               │
│  2. Read input message                                              │
│  3. Process and produce output                                      │
│  4. Commit offsets + output messages atomically                     │
│  5. End transaction                                                 │
│                                                                     │
│  Guarantee: each message processed exactly once                     │
│  Use case: financial transactions, billing, inventory updates       │
└─────────────────────────────────────────────────────────────────────┘
```

### Exactly-Once: How Transactions Work

```
┌─────────────────────────────────────────────────────────────┐
│                Transaction Coordinator (Broker)              │
│                                                              │
│  Transaction Log (internal topic: __transaction_state)       │
│  ┌────────────────────────────────────────────────────┐      │
│  │ TxnID: txn-001  Status: PREPARE_COMMIT             │      │
│  │ Partitions: [topic-A/P0, topic-B/P1]               │      │
│  │ PID: 12345, Epoch: 1                               │      │
│  └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘

Flow:
  1. Producer: beginTransaction()
  2. Producer: send(topicA, msg)         → marked as "transactional"
  3. Producer: sendOffsetsToTransaction() → offset commit is part of txn
  4. Producer: commitTransaction()
       → Transaction Coordinator writes COMMIT to transaction log
       → Marks messages in target partitions as "committed"
       → Consumers with isolation.level=read_committed only see
         committed messages
```

### Deduplication Strategies (Consumer Side)

Even with at-least-once, you can achieve effective exactly-once at the application level:

| Strategy | How It Works | Example |
|---|---|---|
| **Idempotent operations** | Processing same message twice yields same result | `SET user.balance = 100` (not `+= 10`) |
| **Unique message ID** | Store processed message IDs, skip duplicates | Check Redis/DB before processing |
| **Database transactions** | Store offset + result in same DB transaction | Offset and data in same COMMIT |
| **Dedup window** | Keep recent message IDs in a TTL cache | Bloom filter or LRU cache |

---

## 9. Scaling

### Adding Partitions

```
Before: Topic "orders" with 3 partitions, 3 consumers

  P0 → Consumer A
  P1 → Consumer B
  P2 → Consumer C

After: Scale to 6 partitions, 6 consumers

  P0 → Consumer A       (existing data stays)
  P1 → Consumer B       (existing data stays)
  P2 → Consumer C       (existing data stays)
  P3 → Consumer D       (new, starts empty)
  P4 → Consumer E       (new, starts empty)
  P5 → Consumer F       (new, starts empty)
```

**Caveats:**
- Partitions can be added but **never removed** (in Kafka)
- Adding partitions breaks key-based ordering for existing keys
- New partitions start empty — no data redistribution
- Decide partition count carefully at topic creation time

### Partition Count Considerations

```
Rule of thumb:
  partitions = max(T/P, T/C)

  T = target throughput
  P = throughput achievable per producer partition
  C = throughput achievable per consumer partition

Example:
  Target: 1 GB/s throughput
  Per-partition producer throughput: 50 MB/s
  Per-partition consumer throughput: 100 MB/s
  Partitions needed: max(1000/50, 1000/100) = 20 partitions
```

| Factor | More Partitions | Fewer Partitions |
|---|---|---|
| Parallelism | Higher consumer parallelism | Limited parallelism |
| Throughput | Higher aggregate throughput | Lower aggregate throughput |
| Ordering | More granular ordering keys needed | Simpler ordering |
| Metadata overhead | More ZK/KRaft metadata | Less metadata |
| Recovery time | Slower leader election (more partitions to elect) | Faster recovery |
| File handles | More open files per broker | Fewer open files |
| End-to-end latency | Can be higher (batching per partition) | Can be lower |

### Adding Brokers and Rebalancing

```
Before: 3 brokers, 12 partitions (4 per broker)

  Broker 0: [P0, P1, P2, P3]
  Broker 1: [P4, P5, P6, P7]
  Broker 2: [P8, P9, P10, P11]

After: Add Broker 3 and rebalance

  Broker 0: [P0, P1, P2]        ← gave up P3
  Broker 1: [P4, P5, P6]        ← gave up P7
  Broker 2: [P8, P9, P10]       ← gave up P11
  Broker 3: [P3, P7, P11]       ← received partitions

  Partition reassignment is a manual or automated operation
  Data must be physically copied to the new broker (can take hours for large partitions)
```

### Consumer Lag Monitoring

```
Consumer lag = latest offset - consumer committed offset

Monitoring dashboard:

  Partition │ Latest Offset │ Consumer Offset │   Lag   │ Status
  ──────────┼───────────────┼─────────────────┼─────────┼────────
  P0        │ 1,234,567     │ 1,234,560       │      7  │ ✓ OK
  P1        │ 2,345,678     │ 2,340,000       │  5,678  │ ⚠ WARNING
  P2        │ 3,456,789     │ 3,000,000       │ 456,789 │ ✗ CRITICAL

Alert thresholds:
  Lag > 1,000  → warning
  Lag > 10,000 → critical
  Lag increasing over time → consumer is falling behind
```

### Back-Pressure Handling

When consumers can't keep up:

| Strategy | Description |
|---|---|
| **Scale consumers** | Add more consumers (up to partition count) |
| **Increase batch size** | Process more messages per poll |
| **Pause partitions** | Consumer pauses slow partitions, catches up on others |
| **Rate limiting on producer** | Slow down producers if consumers are critical |
| **Dead letter queue** | Route failing messages to DLQ, continue processing |
| **Backlog processing mode** | Switch to a simpler/faster processing path during catch-up |

---

## 10. Advanced Features

### Message Filtering / Routing

```
Option 1: Topic-level filtering (recommended)
  Instead of one topic "events", create:
    "events.clicks"
    "events.purchases"
    "events.signups"

Option 2: Consumer-side filtering
  Consumer reads all messages, discards irrelevant ones
  Wastes bandwidth but simple to implement

Option 3: Header-based routing (Kafka Streams / custom)
  Messages tagged with headers, router service
  forwards to appropriate downstream topics
```

### Delayed / Scheduled Messages

Kafka doesn't natively support delayed messages. Common patterns:

```
Approach 1: Delay Topics

  Producer → delay-topic-30s → Delay Service → target-topic
                                    │
                              Holds message for
                              30s, then forwards

Approach 2: Time-bucketed Topics

  delay-1s, delay-5s, delay-30s, delay-5m, delay-30m
  Each has a consumer that checks timestamps and
  forwards when the delay has elapsed

Approach 3: External Scheduler

  Write to database with scheduled time,
  poller reads and publishes when time arrives
```

### Dead Letter Queue (DLQ)

```
Main Topic ──▶ Consumer ──┬──▶ Success → process normally
                          │
                          └──▶ Failure (after N retries)
                                    │
                                    ▼
                              Dead Letter Topic
                                    │
                                    ▼
                              Manual review /
                              automated retry later

Implementation:
  for msg in poll():
      try:
          process(msg)
      except Exception:
          if msg.retry_count < MAX_RETRIES:
              republish(msg, retry_count + 1)
          else:
              publish_to_dlq(msg)
          continue
      commit(msg.offset)
```

### Compacted Topics

Normal retention: delete old segments by time or size.
**Log compaction**: keep only the **latest value** per key.

```
Before compaction:

  Offset: 0     1     2     3     4     5     6     7
  Key:    A     B     A     C     B     A     C     B
  Value:  v1    v1    v2    v1    v2    v3    v2    v3

After compaction:

  Offset: 5     6     7
  Key:    A     C     B
  Value:  v3    v2    v3

  Only the latest value per key is retained
```

Use cases:
- **Changelog**: database CDC (Change Data Capture) — topic represents current state of each row
- **Configuration**: latest config per key
- **__consumer_offsets**: stores latest offset per consumer group

A null value (tombstone) means "delete this key" — after compaction, the key is removed.

### Log Retention Policies

| Policy | Configuration | Behavior |
|---|---|---|
| **Time-based** | `retention.ms = 604800000` (7 days) | Delete segments older than 7 days |
| **Size-based** | `retention.bytes = 1073741824` (1 GB) | Delete oldest segments when partition exceeds 1 GB |
| **Compaction** | `cleanup.policy = compact` | Keep latest value per key |
| **Both** | `cleanup.policy = compact,delete` | Compact + delete old compacted segments |

---

## 11. Trade-offs & Interview Tips

### Key Trade-offs Summary

```
┌────────────────────┬──────────────────────┬──────────────────────┐
│     Dimension      │     Option A          │     Option B          │
├────────────────────┼──────────────────────┼──────────────────────┤
│ Throughput         │ Larger batches        │ Smaller batches       │
│ vs Latency         │ Higher throughput     │ Lower latency         │
├────────────────────┼──────────────────────┼──────────────────────┤
│ Durability         │ acks=all, RF=3        │ acks=0 or 1           │
│ vs Performance     │ Strongest durability  │ Better performance    │
├────────────────────┼──────────────────────┼──────────────────────┤
│ Consistency        │ No unclean election   │ Allow unclean election│
│ vs Availability    │ May go offline        │ May lose data         │
├────────────────────┼──────────────────────┼──────────────────────┤
│ More Partitions    │ Higher parallelism    │ More overhead,        │
│ vs Fewer           │ Higher throughput     │ longer recovery       │
├────────────────────┼──────────────────────┼──────────────────────┤
│ Pull Model         │ Consumer-controlled   │ Polling overhead      │
│ vs Push Model      │ Natural back-pressure │ Lower latency         │
├────────────────────┼──────────────────────┼──────────────────────┤
│ Compression On     │ Less network/disk I/O │ More CPU usage        │
│ vs Off             │ Higher throughput     │ Lower latency         │
└────────────────────┴──────────────────────┴──────────────────────┘
```

### Ordering Guarantees — Per Partition Only

```
WRONG assumption: "Kafka guarantees global ordering"

CORRECT: ordering is guaranteed ONLY within a single partition

  Partition 0:  [A1] [A2] [A3]     ← A1 before A2 before A3 ✓
  Partition 1:  [B1] [B2]          ← B1 before B2 ✓
  
  But: A1 might be consumed AFTER B2   ← no cross-partition ordering

To get ordering for related messages:
  → Use the same key (e.g., user_id) so they go to the same partition
  → Reduce to 1 partition (kills parallelism — last resort)
```

### When to Use Message Queue vs Event Streaming

| Use Case | Better Fit | Why |
|---|---|---|
| Task distribution (workers) | Message Queue (RabbitMQ, SQS) | Competing consumers, message deleted after processing |
| Event sourcing | Event Streaming (Kafka) | Need to replay, rebuild state from events |
| Log aggregation | Event Streaming | High throughput, retention for analysis |
| Request-reply (RPC) | Message Queue | Low latency, point-to-point |
| Real-time analytics | Event Streaming | Stream processing, windowing |
| Order processing | Depends on scale | Small: message queue. Large: event streaming |
| Microservice decoupling | Either | Both work; Kafka if replay is needed |

### Comparison with Other Systems

| Feature | Apache Kafka | RabbitMQ | AWS SQS | AWS SNS | Apache Pulsar |
|---|---|---|---|---|---|
| Model | Event streaming | Message queue | Message queue | Pub/Sub | Event streaming |
| Ordering | Per-partition | Per-queue (FIFO) | FIFO queues | None | Per-partition |
| Retention | Configurable | Until consumed | 14 days max | None (instant delivery) | Configurable (tiered) |
| Replay | Yes (seek offset) | No | No | No | Yes |
| Throughput | Very high (millions/s) | Medium (50K/s) | Medium | High | Very high |
| Latency | Low (~5ms) | Very low (~1ms) | Medium (~20ms) | Low | Low (~5ms) |
| Scaling | Partitions | Queues/nodes | Automatic | Automatic | Partitions + segments |
| Storage | Disk (sequential) | Memory + disk | Managed | N/A | Tiered (BookKeeper) |
| Exactly-once | Yes (transactions) | No (at-least-once) | No | No | Yes (transactions) |
| Managed option | Confluent, MSK | CloudAMQP | AWS-native | AWS-native | StreamNative |

### Interview Walkthrough Strategy

```
Step 1: Clarify Requirements (2-3 min)
  - "Is this a traditional message queue or an event streaming platform?"
  - "Do we need message replay / retention?"
  - "What's the expected throughput? Messages per second?"
  - "What delivery semantics are required?"
  - "Do we need message ordering? Global or per-key?"

Step 2: High-Level Design (5-8 min)
  - Draw: producers → brokers (partitioned topics) → consumers
  - Explain: topic → partitions → consumer groups
  - Mention: coordination service, replication

Step 3: Deep Dives (15-20 min, pick 2-3 based on interviewer interest)
  - Storage: WAL, segments, sequential I/O, indexes
  - Replication: ISR, high watermark, leader election
  - Producer: batching, acks, idempotency
  - Consumer: pull model, offsets, rebalancing
  - Delivery semantics: at-least-once, exactly-once

Step 4: Scaling & Trade-offs (3-5 min)
  - Partition count decisions
  - Adding brokers
  - Monitoring (consumer lag)
  - Key trade-offs to mention
```

### Common Interview Questions & Answers

**Q: How does Kafka achieve high throughput?**
1. Sequential I/O (append-only writes, sequential reads)
2. OS page cache (avoids double-buffering)
3. Zero-copy transfers (`sendfile()`)
4. Batching (producer batches, consumer fetch batches)
5. Compression (batch-level compression)
6. Partitioning (parallel processing)

**Q: How do you guarantee no data loss?**
- `acks=all` — all ISR replicas must acknowledge
- `min.insync.replicas=2` — at least 2 replicas must be in sync
- `replication.factor=3` — 3 copies of each partition
- `unclean.leader.election.enable=false` — don't elect out-of-sync leaders
- Idempotent producer — prevent duplicate writes on retry

**Q: How do you handle a slow consumer?**
- Monitor consumer lag
- Scale horizontally (add consumers, up to partition count)
- Increase `max.poll.records` for larger batches
- Optimize processing logic
- Use `pause()` / `resume()` for selective partition processing
- Add partitions if consumer count is the bottleneck

**Q: What happens when a broker fails?**
1. Controller detects failure (ZooKeeper session timeout or KRaft heartbeat)
2. For each partition where the failed broker was leader:
   - Pick a new leader from ISR
   - Update metadata
3. Producers/consumers refresh metadata and reconnect to new leaders
4. Followers of affected partitions start replicating from new leaders
5. When failed broker recovers, it catches up as a follower

**Q: How is exactly-once semantics achieved?**
- **Producer side**: idempotent producer (PID + sequence number) prevents duplicate writes
- **Consumer side**: transactional API — read, process, write output, commit offsets all in one atomic transaction
- **Broker side**: transaction coordinator tracks transaction state; consumers with `isolation.level=read_committed` only see committed messages

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│              DISTRIBUTED MESSAGE QUEUE CHEAT SHEET           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  COMPONENTS:                                                 │
│    Producer → Topic → Partition → Consumer Group → Consumer  │
│    Broker: stores partitions, serves reads/writes            │
│    Controller: leader election, metadata management          │
│    Coordination: ZooKeeper (legacy) or KRaft (modern)        │
│                                                              │
│  STORAGE:                                                    │
│    Commit log → segments → sparse index                      │
│    Sequential I/O + page cache + zero-copy = fast            │
│                                                              │
│  REPLICATION:                                                │
│    Leader-follower per partition                              │
│    ISR: replicas that are caught up                           │
│    High watermark: committed offset visible to consumers     │
│                                                              │
│  PRODUCER SETTINGS:                                          │
│    acks=0 (fast) / 1 (balanced) / all (durable)              │
│    enable.idempotence=true (prevent duplicates)              │
│    compression.type=lz4 or zstd                              │
│                                                              │
│  CONSUMER SETTINGS:                                          │
│    Pull model with long-polling                              │
│    auto.offset.reset=earliest/latest                         │
│    enable.auto.commit=false (for manual control)             │
│    isolation.level=read_committed (for exactly-once)         │
│                                                              │
│  DURABILITY CONFIG:                                          │
│    replication.factor=3                                      │
│    min.insync.replicas=2                                     │
│    acks=all                                                  │
│    unclean.leader.election.enable=false                      │
│                                                              │
│  SCALING LEVERS:                                             │
│    More partitions → more consumer parallelism               │
│    More brokers → more storage and throughput                │
│    Monitor consumer lag to detect bottlenecks                │
│                                                              │
│  ORDERING: per-partition only, use same key for ordering     │
│  DELIVERY: at-most-once / at-least-once / exactly-once      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
