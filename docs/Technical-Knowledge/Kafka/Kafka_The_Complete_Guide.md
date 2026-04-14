---
sidebar_position: 2
title: "Kafka: The Complete Guide"
---

# Kafka: The Complete Guide

*From "what is this?" to "how does it work at the byte level" — a single connected journey.*

This document is designed to be read top to bottom. Every section builds on the one before it. By the end, you'll understand not just how to USE Kafka, but how it WORKS — from the disk layout to the network protocol to the replication state machine.

---

## Part 1 — The Problem Kafka Solves

### Why does Kafka exist?

Imagine you have a simple system: a web app writes to a database, and a reporting service reads from it. Easy.

Now add reality:
- A search index that needs the same data
- An analytics pipeline that needs every user action in real-time
- A notification service that reacts to certain events
- An audit log that must capture everything
- A machine learning system that needs a firehose of data to train on

Without Kafka, you end up with this:

```
Web App ──► Database
Web App ──► Search Index
Web App ──► Analytics Pipeline
Web App ──► Notification Service
Web App ──► Audit Log
Web App ──► ML Training Pipeline

Payment Service ──► Database
Payment Service ──► Analytics Pipeline
Payment Service ──► Notification Service
Payment Service ──► Audit Log

... every producer talks to every consumer directly
... N producers × M consumers = N×M connections
```

This is a nightmare to maintain. Every new consumer requires changes to every producer. Schemas are inconsistent. Failures cascade.

**Kafka's insight:** Put a durable, high-throughput, ordered log in the middle.

```
Producers                   Kafka                      Consumers
─────────                   ─────                      ─────────
Web App        ──►                              ──►   Database
Payment Service──►    [ Ordered, Durable Log ]  ──►   Search Index
User Service   ──►                              ──►   Analytics
Inventory      ──►                              ──►   Notifications
                                                ──►   Audit
                                                ──►   ML Pipeline
```

Now producers just write to Kafka. Consumers just read from Kafka. They don't know about each other. Adding a new consumer requires ZERO changes to any producer.

### Kafka vs traditional message queues

You might think "this sounds like RabbitMQ or ActiveMQ." Here's the fundamental difference:

**Traditional queue:** Once a message is consumed, it's gone. The queue is a temporary buffer.

**Kafka:** Messages are stored durably on disk, retained for days/weeks/forever. Multiple consumers can read the same data independently at their own pace. It's not a queue — it's a **distributed, replicated commit log**.

This means:
- A new analytics service can join and replay ALL historical data from the beginning
- A crashed consumer can restart and pick up exactly where it left off
- Two completely different systems can read the same stream of events independently

---

## Part 2 — Core Concepts

Before we go deeper, you need to understand five concepts. Everything else in Kafka is built from these.

### Topics

A **topic** is a named stream of records. Think of it as a category or feed name.

```
Topic: "user-signups"     → every new user registration
Topic: "page-views"       → every page view event
Topic: "orders"           → every order placed
Topic: "payments"         → every payment processed
```

Producers write to topics. Consumers read from topics. That's it.

### Partitions

Here's where Kafka gets interesting. A topic is split into **partitions** — and this is the key to everything Kafka does well.

```
Topic "orders" with 4 partitions:

Partition 0: [msg0] [msg4] [msg8]  [msg12] ...
Partition 1: [msg1] [msg5] [msg9]  [msg13] ...
Partition 2: [msg2] [msg6] [msg10] [msg14] ...
Partition 3: [msg3] [msg7] [msg11] [msg15] ...
```

**Why partitions?**

1. **Parallelism.** Four partitions means four consumers can read simultaneously. This is how Kafka scales horizontally.

2. **Ordering.** Records within a single partition are strictly ordered. Records across partitions have NO ordering guarantee. This is a deliberate tradeoff — global ordering would kill parallelism.

3. **Distribution.** Each partition lives on a different broker (server). Partitions are how Kafka spreads data across a cluster.

**How does a record end up in a specific partition?**

- If the record has a **key**: `hash(key) % numPartitions` — same key always goes to the same partition
- If the record has **no key**: the producer sticks to one partition per batch, then rotates

This is important. If you send all orders for customer "Alice" with key="Alice", they ALL land in the same partition and are therefore strictly ordered. You can process Alice's orders in sequence without worrying about race conditions.

### Offsets

Every record in a partition gets a sequential **offset** — a unique, monotonically increasing number:

```
Partition 0:
  offset=0: {key: "Alice", value: "order-1"}
  offset=1: {key: "Alice", value: "order-2"}
  offset=2: {key: "Alice", value: "order-3"}
  offset=3: {key: "Alice", value: "order-4"}
          ↑
          Each record has a permanent offset within its partition
```

Offsets are how consumers track their position: "I've processed up to offset 3, next time give me offset 4."

Offsets are:
- **Per-partition** — partition 0 and partition 1 both have an offset 0, they're completely independent
- **Immutable** — once assigned, an offset never changes
- **Permanent** — a record at offset 0 is always at offset 0, even after older records are deleted (the offset just becomes invalid, but it's never reused)

### Brokers

A **broker** is a Kafka server — a single process running on a machine. A Kafka **cluster** is a group of brokers working together.

```
Kafka Cluster:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Broker 0  │  │ Broker 1  │  │ Broker 2  │
│           │  │           │  │           │
│ orders-0  │  │ orders-1  │  │ orders-2  │
│ orders-3  │  │ payments-0│  │ payments-1│
│ users-0   │  │ users-1   │  │ users-2   │
└──────────┘  └──────────┘  └──────────┘
```

Each broker stores a subset of the partitions. The cluster distributes partitions across brokers for load balancing.

Any broker can handle any client request — if a client connects to broker 0 but needs data from a partition on broker 2, broker 0 will tell the client "go talk to broker 2 for that partition." Clients discover the cluster topology automatically through a **metadata request**.

### Consumer Groups

A **consumer group** is a set of consumers that cooperate to read a topic. Kafka assigns each partition to exactly one consumer in the group:

```
Topic "orders" (4 partitions):

Consumer Group "order-processing":
  Consumer A → Partition 0, Partition 1
  Consumer B → Partition 2, Partition 3

Consumer Group "analytics":
  Consumer X → Partition 0, Partition 1, Partition 2, Partition 3
```

**Key rules:**
- Each partition is assigned to exactly ONE consumer within a group
- A consumer can be assigned MULTIPLE partitions
- Different groups are completely independent — they each get ALL the data
- If you have more consumers than partitions, some consumers sit idle

This is how Kafka achieves both:
- **Point-to-point** (one group processes each record once) — like a work queue
- **Publish-subscribe** (multiple groups each get all records) — like a broadcast

Now that you understand these five concepts, let's look at how Kafka actually implements them.

---

## Part 3 — How Kafka Stores Data

This is where we go from "what" to "how." Understanding the storage layer explains why Kafka is so fast and what the performance tradeoffs are.

### The filesystem layout

Each broker stores its data in a log directory (configured by `log.dirs`). Inside, each topic-partition gets its own directory:

```
/var/kafka-logs/
├── orders-0/                          ← topic "orders", partition 0
│   ├── 00000000000000000000.log       ← segment: records (starts at offset 0)
│   ├── 00000000000000000000.index     ← sparse offset index
│   ├── 00000000000000000000.timeindex ← sparse timestamp index
│   ├── 00000000000004521389.log       ← next segment (starts at offset 4,521,389)
│   ├── 00000000000004521389.index
│   ├── 00000000000004521389.timeindex
│   ├── leader-epoch-checkpoint
│   └── partition.metadata
├── orders-1/
│   └── ...
└── __consumer_offsets-12/             ← internal topic
    └── ...
```

Notice the filenames: `00000000000004521389.log`. That number IS the base offset — the offset of the first record in that file. This makes it trivial to find which file contains a given offset: binary search the filenames.

### Segments: why not one big file?

Each partition is split into **segments**. The active segment is the one currently being written to; all older segments are read-only.

**Why segments?**
- **Deletion is cheap.** To delete old data, just delete old segment files. No need to rewrite anything.
- **Compaction is isolated.** The log compaction process can rewrite one segment at a time without touching others.
- **Memory mapping is practical.** Smaller files can be individually mmap'd for efficient index access.

A new segment is created when:
- The current segment reaches `log.segment.bytes` (default: 1 GB)
- The current segment is older than `log.segment.ms` (default: 7 days)
- The index file is full

### What's actually inside a .log file?

Records are grouped into **batches** (called `RecordBatch` in the protocol). A single batch might contain 1 to thousands of records:

```
.log file:
┌─────────────────────────────────────────────┐
│ RecordBatch (offsets 0-47)                   │
│   baseOffset: 0                              │
│   compression: lz4                           │
│   crc: 0xABCD1234                           │
│   records: [record0, record1, ..., record47] │
├─────────────────────────────────────────────┤
│ RecordBatch (offsets 48-112)                 │
│   baseOffset: 48                             │
│   compression: lz4                           │
│   ...                                        │
├─────────────────────────────────────────────┤
│ RecordBatch (offsets 113-200)                │
│   ...                                        │
└─────────────────────────────────────────────┘
```

**Why batch?**
- Compression is applied per-batch, not per-record. Compressing 100 similar records together gets a much better ratio than compressing each one individually.
- One CRC covers the entire batch — a single integrity check for many records.
- Within a batch, offsets and timestamps are **delta-encoded** (stored as differences from the base), saving bytes.
- One disk write flushes many records atomically.

Each individual record inside a batch contains:
- An offset delta (offset = baseOffset + delta)
- A timestamp delta
- A key (byte array, nullable)
- A value (byte array, nullable)
- Optional headers (key-value metadata pairs)

### The offset index: how Kafka finds a record by offset

If a consumer asks for offset 5,000,000 — how does Kafka find it without scanning the entire log?

Step 1: Binary search the segment filenames to find which segment contains offset 5,000,000.

Step 2: Use the **offset index** (`.index` file) within that segment. The index is sparse — it stores an entry every `log.index.interval.bytes` (default: 4096 bytes) of log data:

```
Offset Index (sparse):
  offset=4,521,389 → file position 0
  offset=4,521,801 → file position 16,384
  offset=4,522,215 → file position 32,768
  offset=4,522,630 → file position 49,152
  ...
```

Step 3: Binary search the index to find the largest entry ≤ 5,000,000.

Step 4: Seek to that file position in the `.log` file and scan forward linearly until offset 5,000,000 is found.

**Why sparse and not dense?** A dense index for billions of records would be enormous. The sparse approach keeps the index small enough to be **memory-mapped** (mmap), living in RAM at near-zero cost. The tradeoff is a short linear scan at the end — but that data is typically already in the OS page cache, so it's fast.

### The timestamp index: finding records by time

The `.timeindex` file maps timestamps to offsets: "the first record with timestamp ≥ T is at offset X."

This powers:
- `consumer.offsetsForTimes()` — "give me the offset of records from 2pm yesterday"
- Time-based retention — "delete all data older than 7 days"

### Zero-copy: why Kafka can saturate a 10 Gbps NIC

When a consumer fetches data, the normal path would be:

```
Disk → Kernel Page Cache → User Space (JVM) → Socket Buffer → NIC
         copy 1              copy 2              copy 3
         + 4 context switches between kernel and user space
```

Kafka uses `FileChannel.transferTo()`, which maps to the OS `sendfile()` syscall:

```
Disk → Kernel Page Cache ─────────────────────► NIC
                          (DMA transfer, no CPU copies)
                          + 2 context switches
```

The data goes directly from the page cache to the network card. The Kafka broker JVM **never touches the record bytes**. This means:
- No garbage collection pressure (record data never enters the Java heap)
- CPU is free to handle protocol overhead, not copying bytes
- A single broker can push gigabytes per second with minimal CPU

### The page cache: Kafka's most important performance trick

Kafka doesn't manage its own in-memory cache. It relies entirely on the operating system's **page cache**:

- **When a producer writes:** data goes into the page cache and is asynchronously flushed to disk
- **When a consumer reads:** data comes from the page cache if it's still there (and it usually is, because consumers typically read data that was written seconds ago)

This design has a profound implication: **when you restart a Kafka broker, the cache is NOT lost.** The page cache lives in the kernel, not the JVM. The broker can restart and immediately serve reads at full speed because the data is still warm in RAM.

This is why Kafka machines should have lots of **free RAM** (not allocated to JVM heap). The JVM heap should be modest (6-8 GB). The rest of the machine's memory becomes page cache — Kafka's silent performance engine.

### Log compaction: keeping the latest value per key

For some topics, you don't care about the full history — you just want the **latest state** per key. Log compaction does this:

```
Before compaction:
  offset=0: key=user-1, value={name: "Alice"}
  offset=1: key=user-2, value={name: "Bob"}
  offset=2: key=user-1, value={name: "Alice Smith"}    ← newer value for user-1
  offset=3: key=user-3, value={name: "Charlie"}
  offset=4: key=user-2, value=null                      ← tombstone: user-2 deleted

After compaction:
  offset=2: key=user-1, value={name: "Alice Smith"}
  offset=3: key=user-3, value={name: "Charlie"}
  offset=4: key=user-2, value=null   ← kept briefly, then removed
```

A background thread (the "log cleaner") periodically scans segments, builds a map of `key → latest_offset`, and rewrites segments keeping only the latest record per key.

This is used for Kafka's internal topics (`__consumer_offsets` stores the latest committed offset per consumer group) and is essential for Kafka Streams (state store changelogs).

---

## Part 4 — Producers: How Data Gets Into Kafka

Now that you understand how Kafka stores data, let's trace a record from your application all the way to disk.

### What happens when you call send()

```java
producer.send(new ProducerRecord<>("orders", "customer-42", orderJson));
```

This single line triggers a surprisingly complex chain of events. But `send()` itself returns almost instantly — it does NOT wait for the record to reach the broker.

Here's the full path:

**Step 1 — Serialize.** The key (`"customer-42"`) and value (`orderJson`) are converted to byte arrays using the configured serializers.

**Step 2 — Choose a partition.** If you specified a partition, that's used. Otherwise:
- If the key is not null: `murmur2(keyBytes) % numPartitions`. This is deterministic — same key always goes to the same partition.
- If the key is null: the **sticky partitioner** picks one partition and sticks with it until the current batch is full, then rotates. This maximizes batching efficiency.

**Step 3 — Append to the accumulator.** The record is placed into an in-memory buffer called the **RecordAccumulator**. This buffer is organized as a queue of batches per partition:

```
RecordAccumulator:
  orders-0: [ Batch A (filling...) ]
  orders-1: [ Batch B (full) ] → [ Batch C (filling...) ]
  orders-2: [ Batch D (filling...) ]
```

Each batch is a `ByteBuffer` of size `batch.size` (default: 16 KB). Records are appended to the current batch. If the batch is full, a new one is allocated from a shared buffer pool of total size `buffer.memory` (default: 32 MB).

**If the buffer pool is exhausted**, `send()` blocks until space is freed (up to `max.block.ms`, default 60 seconds). This is the backpressure mechanism — if the broker can't keep up, the producer slows down.

**Step 4 — The Sender thread wakes up.** A single background thread called the **Sender** continuously drains batches from the accumulator and sends them to brokers. A batch is ready to send when:
- It's full (reached `batch.size`), OR
- It's waited long enough (`linger.ms`, default 0), OR
- `buffer.memory` is exhausted (pressure to flush), OR
- `flush()` was explicitly called

**Step 5 — Group by broker.** The Sender groups ready batches by destination broker. One Produce request can carry batches for multiple partitions hosted on the same broker — reducing the number of network round-trips.

**Step 6 — Send over the network.** The request goes to the broker over TCP using Kafka's binary protocol. The Sender can have up to `max.in.flight.requests.per.connection` (default: 5) requests in-flight simultaneously per broker.

**Step 7 — Broker processes the request.** (We'll cover this in detail in Part 5.)

**Step 8 — Response arrives.** The Sender receives the response, resolves the `Future`, and calls your callback (if provided) with the record's final offset and timestamp — or an error.

### The linger.ms tradeoff

```
linger.ms = 0 (default):
  Each record is sent almost immediately → low latency, but many small requests

linger.ms = 5:
  The Sender waits up to 5ms for the batch to fill → slightly higher latency,
  but fewer, larger requests → higher throughput

linger.ms = 50:
  Even more batching → even higher throughput, but 50ms added latency
```

In practice, under load, batches fill up before `linger.ms` expires anyway. `linger.ms` primarily helps during low-throughput periods when records trickle in slowly.

### Compression

Compression is applied **per-batch** by the producer. The broker stores compressed batches as-is (it does not decompress). Consumers decompress when they read.

| Codec | CPU cost | Ratio | When to use |
|-------|----------|-------|------------|
| none | 0 | 1:1 | Ultra-low latency requirements |
| lz4 | Low | ~2.5:1 | Best general-purpose choice |
| zstd | Medium | ~3:1+ | Bandwidth-limited or storage-sensitive |
| snappy | Low | ~2:1 | Legacy (LinkedIn's original default) |

Compression saves both network bandwidth AND broker disk space because the broker never decompresses.

### Acknowledgments (acks): the durability dial

After the broker receives and stores your record, how does it respond?

| acks | Behavior | Durability | Latency |
|------|----------|------------|---------|
| `0` | Producer doesn't wait for any response | Records may be lost without the producer knowing | Lowest |
| `1` | Leader writes to its local log, responds immediately | Records lost if leader dies before followers replicate | Medium |
| `all` | Leader waits until ALL in-sync replicas have written the record | Records survive any single broker failure | Highest |

With `acks=all`, the record's journey is:

```
Producer → Leader writes to local log
           Leader waits for all ISR followers to replicate
           Leader responds to producer: "offset 42, success"
```

We'll explain "ISR" and replication in Part 6.

### Idempotent producer: exactly-once delivery to Kafka

Network errors create a problem: the producer sends a batch, the broker writes it, but the acknowledgment is lost. The producer retries — and now the record is written **twice**.

The idempotent producer (enabled by default since Kafka 3.0) solves this. Each producer is assigned a unique **Producer ID (PID)**, and each batch gets a **sequence number**:

```
Producer (PID=42):
  Batch: sequence=0 → Broker accepts, writes to log ✓
  Batch: sequence=1 → Broker accepts ✓
  Batch: sequence=1 → RETRY (ack was lost) → Broker sees duplicate → rejects, returns success
  Batch: sequence=3 → OUT OF ORDER → Broker rejects (expected 2)
```

The broker keeps a small map: `(PID, partition) → last 5 sequence numbers`. This gives per-partition deduplication with virtually no overhead.

### Transactions: atomic writes across partitions

Sometimes you need to write to multiple partitions atomically — either ALL records are visible to consumers, or NONE are. This is what Kafka transactions provide:

```
BEGIN TRANSACTION
  → write record to "orders" partition 0
  → write record to "orders" partition 3
  → write record to "inventory" partition 1
  → commit consumer offsets (for read-process-write patterns)
COMMIT TRANSACTION
```

The transaction coordinator (a specific broker) manages the state. On COMMIT, it writes a special **commit marker** to each partition. Consumers with `isolation.level=read_committed` only see records from committed transactions — they skip over records from ongoing or aborted transactions.

This is the foundation of exactly-once semantics in Kafka Streams.

---

## Part 5 — What Happens Inside the Broker

When a Produce request arrives at a broker, here's the journey:

### The network layer: Reactor pattern

Kafka uses a high-performance thread model:

```
Client TCP connections
        │
        ▼
  Acceptor Thread (1)              ← accepts new connections
        │
        ▼
  Network Threads (num.network.threads = 3)  ← read requests from sockets
        │
        ▼
  Request Queue (bounded)          ← bridges network and I/O layers
        │
        ▼
  I/O Threads (num.io.threads = 8) ← process requests (disk I/O)
        │
        ▼
  Response Queue (per network thread)
        │
        ▼
  Network Threads                  ← send responses back to clients
```

Network threads handle socket I/O (fast, non-blocking). I/O threads handle the actual work (log appends, reads, etc.). This separation means a slow disk operation doesn't block network I/O for other clients.

### Processing a Produce request

When an I/O thread picks up a Produce request:

1. **Validate.** Check authorization, CRC integrity, message size limits.
2. **Append to log.** Write the `RecordBatch` to the active segment of the partition's log. This is a sequential append — the fastest disk operation possible.
3. **Handle acks.**
   - If `acks=0` or `acks=1`: respond immediately.
   - If `acks=all`: the request enters **purgatory** (see below).
4. **Update LEO.** The leader's Log End Offset advances.

### Processing a Fetch request

When a consumer (or a follower replica) sends a Fetch request:

1. **Locate the segment** containing the requested offset (binary search on filenames).
2. **Look up the position** in the offset index (binary search on the sparse index).
3. **Read data** from the log file via `sendfile()` (zero-copy).
4. **Enforce the high watermark.** Only return records up to the high watermark — uncommitted records (not yet replicated to all ISR members) are hidden from consumers.
5. **Handle `fetch.min.bytes`.** If not enough data is available, the request enters **fetch purgatory** and waits up to `fetch.max.wait.ms` for more data to arrive. This is **long polling** — the consumer doesn't need to busy-poll.

### Purgatory: the waiting room for delayed requests

Some requests can't complete immediately. Kafka uses a **hierarchical timer wheel** (O(1) insert and expiration) to efficiently manage millions of waiting requests:

| Purgatory | Why it waits | Completes when |
|-----------|-------------|----------------|
| Produce | `acks=all`, need ISR replication | All ISR followers have caught up |
| Fetch | `fetch.min.bytes` not satisfied | Enough data arrives or timeout |
| Join Group | Waiting for all consumers | All group members have joined |
| Heartbeat | Session management | Next heartbeat or session timeout |

### Quotas: preventing one client from starving others

Kafka enforces byte-rate quotas per client. If a producer exceeds its quota, the broker calculates a throttle time and **delays sending the response** by that amount. The client sees increased latency and naturally slows down. No client-side cooperation needed.

---

## Part 6 — Replication: How Kafka Guarantees Durability

If a broker dies, you don't want to lose data. Kafka solves this by replicating each partition across multiple brokers.

### Leader and followers

Each partition has ONE leader and zero or more followers:

```
Partition "orders-0" (replication factor = 3):

  Broker 1 (LEADER)    Broker 2 (FOLLOWER)   Broker 3 (FOLLOWER)
  ┌────────────────┐   ┌────────────────┐    ┌────────────────┐
  │ offset 0-99    │   │ offset 0-99    │    │ offset 0-97    │
  │ LEO: 100       │   │ LEO: 100       │    │ LEO: 98        │
  └────────────────┘   └────────────────┘    └────────────────┘
```

**All reads and writes go through the leader.** Followers exist only for durability — they continuously replicate data from the leader by sending Fetch requests (the same Fetch API that consumers use).

### LEO and High Watermark: the two critical pointers

Every replica tracks two numbers:

**LEO (Log End Offset):** The offset of the next record to be written. This is the "tip" of the log on each replica.

**High Watermark (HW):** The highest offset that has been replicated to ALL in-sync replicas. Only records BELOW the high watermark are visible to consumers.

```
Leader's view:
  Records:  [0] [1] [2] [3] [4] [5] [6] [7] [8] [9]
                                           ↑         ↑
                                           HW=7      LEO=10

  Offsets 0-6: visible to consumers (below HW)
  Offsets 7-9: written by leader, but NOT yet replicated to all ISR
               → invisible to consumers
               → if leader dies, these might be lost
```

The high watermark advances when the SLOWEST in-sync follower catches up.

### ISR: the In-Sync Replica set

The ISR is the set of replicas (including the leader) that are "caught up." A follower is removed from the ISR if it falls behind by more than `replica.lag.time.max.ms` (default: 30 seconds).

```
ISR = {Broker 1 (leader), Broker 2}    ← Broker 3 fell behind

When acks=all:
  - Producer writes to leader (Broker 1)
  - Leader waits for Broker 2 to replicate (it's in the ISR)
  - Leader does NOT wait for Broker 3 (it's NOT in the ISR)
  - Once Broker 2 catches up → HW advances → record visible
```

**The `min.insync.replicas` safety net:**

With `acks=all`, if the ISR shrinks to just the leader, "all replicas" means just one copy — you've lost your durability guarantee.

Setting `min.insync.replicas=2` means:
- `acks=all` requires at least 2 replicas to acknowledge
- If the ISR has only 1 member, produces FAIL with `NotEnoughReplicasException`
- You're guaranteed that acknowledged records exist on at least 2 brokers

**Recommended production config:** `replication.factor=3`, `min.insync.replicas=2`, `acks=all` → tolerates 1 broker failure with no data loss and no unavailability.

### How replication actually works

Followers fetch data from the leader using the same Fetch protocol that consumers use. The dance looks like this:

```
1. Producer sends record to Leader at offset 100
2. Leader appends to local log → LEO = 101, HW still = 100
3. Follower A sends Fetch(offset=100) to Leader
   - Leader responds with the record at offset 100
   - Leader notes: Follower A is at LEO = 101
4. Follower B sends Fetch(offset=100) to Leader
   - Leader responds with the record
   - Leader notes: Follower B is at LEO = 101
5. Leader calculates: min(Leader.LEO, all ISR followers' LEO) = 101
   → HW advances to 101
   → Offset 100 is now visible to consumers
```

### Leader election: what happens when a broker dies

When the controller (a special broker that manages cluster-wide operations) detects a broker has failed:

1. For each partition where the dead broker was the leader:
2. Pick the first broker in the ISR as the new leader
3. Notify all brokers of the new leader
4. Clients refresh metadata and start talking to the new leader

This typically completes in milliseconds. Consumers and producers see a brief interruption, then automatically reconnect to the new leader.

### Leader epochs: preventing data divergence

What happens if a leader writes a record, then dies before the followers replicate it? The new leader doesn't have that record. When the old leader comes back, its log has diverged from the new leader's log.

Kafka solves this with **leader epochs** — a monotonically increasing number that changes every time a new leader is elected:

```
1. Old leader (epoch=5) wrote offset 100, then crashed
2. New leader elected (epoch=6), starts writing from offset 100 with different data
3. Old leader comes back, discovers:
   "My epoch 5 records ended at offset 100"
   "New leader says epoch 5 ended at offset 99"
4. Old leader truncates its log to offset 99
5. Old leader fetches offset 100+ from the new leader
6. Logs converge ✓
```

---

## Part 7 — Consumers: How Data Gets Out of Kafka

### The poll loop

Every Kafka consumer follows the same pattern:

```java
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        process(record);
    }
}
```

`poll()` does a LOT more than just fetching records. Each call:

1. **Sends heartbeats** to the group coordinator (keeps the consumer alive in the group)
2. **Handles rebalances** if group membership changed
3. **Auto-commits offsets** if enabled and the interval has elapsed
4. **Fetches records** from the partition leaders
5. **Deserializes** the raw bytes into your key and value objects

If you don't call `poll()` for longer than `max.poll.interval.ms` (default: 5 minutes), the coordinator considers you dead and reassigns your partitions to another consumer. This is a common source of unexpected rebalances — if your processing is slow, reduce `max.poll.records` or increase the timeout.

### How fetching works behind the scenes

The consumer pre-fetches data to hide network latency:

```
Time →
  [Fetch 1 in-flight on network]
                                 [Process batch 1] [Fetch 2 in-flight]
                                                                       [Process batch 2]
```

While your code processes one batch, the consumer has already sent the next Fetch request. The key configs:

- `fetch.min.bytes` (default: 1) — minimum data the broker should accumulate before responding. Setting this higher reduces the number of fetch requests but adds latency.
- `fetch.max.wait.ms` (default: 500) — max time the broker waits to accumulate `fetch.min.bytes`. This is the long-polling timeout.
- `max.poll.records` (default: 500) — max records returned per `poll()` call. Controls how much work your processing loop does per iteration.
- `max.partition.fetch.bytes` (default: 1 MB) — max data per partition per fetch request.

### Consumer group rebalancing

When a consumer joins or leaves a group, partitions need to be redistributed. This process is called a **rebalance**.

**Step 1 — JoinGroup:** All consumers send a JoinGroup request to the group coordinator. The coordinator waits for all members (or a timeout) and designates one consumer as the **leader**.

**Step 2 — Assignment:** The leader consumer runs a **partition assignor** algorithm and decides which consumer gets which partitions. It sends this assignment to the coordinator via SyncGroup.

**Step 3 — SyncGroup:** The coordinator distributes the assignment to all consumers. Each consumer now knows which partitions it owns and starts fetching.

**Eager vs. Cooperative rebalancing:**

The old (eager) protocol revokes ALL partitions during rebalance — a stop-the-world event:

```
Eager rebalance:
  Consumer A: [0,1,2] → REVOKE ALL → [] → reassigned [0,1]
  Consumer B: [3]     → REVOKE ALL → [] → reassigned [2,3]
  During the revoke period, NO consumer processes ANY partition.
```

The cooperative protocol (default in modern Kafka) only moves the partitions that need to move:

```
Cooperative rebalance:
  Consumer A: [0,1,2] → keeps [0,1], only revokes [2]
  Consumer B: [3]     → keeps [3], picks up [2]
  Only partition 2 sees a brief pause.
```

### Offset management

When a consumer finishes processing a batch, it needs to tell Kafka "I'm done with these records" so that if it crashes and restarts, it picks up where it left off. This is called **committing offsets**.

Committed offsets are stored in the internal topic `__consumer_offsets` (a compacted topic with 50 partitions by default).

**Auto-commit (default):** Every 5 seconds (configurable), during `poll()`, the consumer automatically commits the offsets of all records returned by the previous `poll()`.

The problem with auto-commit:
- If your app crashes AFTER `poll()` but BEFORE processing completes → records are lost (their offsets were already committed)
- If your app crashes AFTER processing but BEFORE the next auto-commit → records are reprocessed

**Manual commit for at-least-once:**
```java
while (true) {
    ConsumerRecords records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord record : records) {
        process(record);        // process first
    }
    consumer.commitSync();      // commit AFTER processing
}
```
If processing succeeds but the commit fails (crash), the records will be reprocessed on restart. You process everything **at least once**, but might see duplicates.

**For exactly-once with an external database:** Store the offset alongside the processed data in the same database transaction. On restart, read the offset from the database and `consumer.seek()` to it.

### Consumer lag: how to know if you're falling behind

```
Consumer Lag = Log End Offset (LEO) - Last Committed Offset

If LEO = 1,000,000 and your committed offset = 999,500:
  → Lag = 500 records
```

Increasing lag means your consumers are slower than your producers. This is the most important operational metric for Kafka consumers.

---

## Part 8 — The Controller: Cluster Brain

One broker in the cluster is elected as the **controller**. It handles all cluster-wide administrative operations:

- **Leader election** for partitions when brokers die
- **ISR tracking** — which replicas are in-sync
- **Topic management** — create/delete topics, assign partitions to brokers
- **Broker membership** — detect when brokers join or leave the cluster

### Controller election (ZooKeeper mode)

In the traditional architecture, Kafka uses ZooKeeper for controller election:

```
All brokers race to create an ephemeral /controller znode in ZooKeeper
Winner becomes the controller
Losers set a watch on /controller
When the controller dies → znode disappears → watch fires → new election
```

### Controller election (KRaft mode)

Since Kafka 3.3+, ZooKeeper is no longer required. A dedicated quorum of controller nodes uses the **Raft consensus protocol** to elect a leader and replicate metadata:

```
Controller Quorum (3 nodes):
  Controller 1 (LEADER)  — active controller
  Controller 2 (FOLLOWER) — standby, has full metadata
  Controller 3 (FOLLOWER) — standby, has full metadata

Metadata stored in internal topic: __cluster_metadata
All metadata changes replicated via Raft log
```

KRaft removes the ZooKeeper dependency entirely. See the [KRaft Complete Guide](./KRaft_Complete_Guide) for the full details on the Raft implementation.

---

## Part 9 — Kafka Streams: Stream Processing Built on Kafka

Now that you understand how Kafka works end-to-end, let's look at Kafka Streams — a library for processing data in Kafka topics in real-time.

### What Kafka Streams actually is

Kafka Streams is NOT a separate cluster or framework (unlike Flink or Spark). It's a **Java library** that runs inside your application. It uses Kafka's consumer group protocol for distribution — you scale by running more instances of your app.

```
Your Application (JVM)
├── Your business logic
├── Kafka Streams library
│   ├── Embedded Consumer (reads from input topics)
│   ├── Embedded Producer (writes to output topics)
│   ├── State Stores (local RocksDB databases)
│   └── Changelog topics (state store backups in Kafka)
└── No external dependencies beyond Kafka itself
```

### The topology: your processing DAG

When you write Kafka Streams code, you're building a **topology** — a directed acyclic graph of processing steps:

```java
StreamsBuilder builder = new StreamsBuilder();

builder.stream("orders")                          // 1. Source: read from topic
    .filter((key, order) -> order.amount > 100)   // 2. Filter: keep expensive orders
    .mapValues(order -> order.toUpperCase())       // 3. Transform
    .groupByKey()                                  // 4. Group (needed for aggregation)
    .count(Materialized.as("order-counts"))        // 5. Count per key (stateful!)
    .toStream()
    .to("order-counts-output");                    // 6. Sink: write to output topic
```

This creates:

```
Source("orders") → Filter → MapValues → GroupByKey → Count → Sink("order-counts-output")
                                            ↑            ↑
                                       repartition    state store
                                       (if key changed)  (RocksDB)
```

### Tasks: the unit of parallelism

Kafka Streams splits your topology into **tasks**, one per input partition:

```
Topic "orders" has 4 partitions → 4 tasks

Instance A (2 threads):
  Thread 1: Task 0 (processes orders partition 0)
  Thread 1: Task 1 (processes orders partition 1)
  Thread 2: Task 2 (processes orders partition 2)
  Thread 2: Task 3 (processes orders partition 3)
```

If you start a second instance of your application, the consumer group protocol redistributes tasks:

```
Instance A: Task 0, Task 1
Instance B: Task 2, Task 3
```

Each task processes records from its partition **one at a time, in order**. No locks, no concurrency within a task. This makes the programming model simple and safe.

### State stores: how stateful operations work

Operations like `count()`, `aggregate()`, and `reduce()` need to remember previous values. Each task gets its own **state store** — a local RocksDB database:

```
Task 0's state store "order-counts":
  key="customer-42" → count=17
  key="customer-99" → count=3

Task 1's state store "order-counts":
  key="customer-55" → count=22
  key="customer-11" → count=8
```

**Why RocksDB?** It's an embedded database (no external server), optimized for write-heavy workloads, and can handle datasets larger than memory by spilling to disk.

### Changelog topics: fault tolerance for state

What if your application crashes? The in-memory and on-disk state of its RocksDB stores would be lost (or assigned to a different machine).

Kafka Streams solves this by writing every state store update to a **changelog topic** — a compacted Kafka topic that serves as a backup:

```
When Task 0 updates its state:
  1. RocksDB: put("customer-42", 18)
  2. Produce to "app-order-counts-changelog" partition 0: key="customer-42", value=18
```

**Recovery:**
1. Instance crashes, Task 0 is reassigned to a different machine
2. New machine has no RocksDB data for Task 0
3. It consumes the changelog topic from the beginning
4. Replays all records into a fresh RocksDB store
5. State fully restored → task resumes processing

To speed up recovery, you can configure **standby replicas** (`num.standby.replicas`). A standby continuously consumes the changelog in the background, so when a failover happens, the state is already warm.

### Repartitioning: when the key changes

If you change the key (via `selectKey()`, `map()`, or `groupBy()`), records need to be reshuffled so that the same key lands in the same partition (and therefore the same task and state store):

```java
stream.selectKey((k, v) -> v.getRegion())   // key changed!
      .groupByKey()                          // → repartition required
      .count();
```

Kafka Streams creates an internal **repartition topic**, writes the re-keyed records to it, and reads them back in a new sub-topology. This is an extra network hop through Kafka — it adds latency and I/O cost.

**Optimization:** `groupByKey()` does NOT repartition if the key hasn't changed. Only `groupBy()` (which implies a new key function) forces repartitioning.

### Joins: combining streams

Kafka Streams supports several join types, each with different requirements:

**KStream-KStream join (windowed):** Join two event streams within a time window. Both streams must be co-partitioned (same number of partitions, same partitioning strategy). Each side is stored in a windowed state store, and when a record arrives on one side, it scans the other side for matches within the window.

**KStream-KTable join (lookup):** Enrich a stream with a lookup table. The KTable is materialized in a state store. For each stream record, look up the key in the table. No windowing needed.

**KTable-KTable join (materialized view):** Both sides are materialized. When either side updates, the join result is re-emitted. This creates a continuously updating view.

### Exactly-once semantics in Kafka Streams

With `processing.guarantee=exactly_once_v2`, Kafka Streams wraps each processing cycle in a **Kafka transaction**:

```
BEGIN TRANSACTION
  → produce output records to output topics
  → produce changelog records (state store updates)
  → commit consumer offsets (via transactional offset commit)
COMMIT TRANSACTION
```

Either ALL of these succeed, or NONE do. If the transaction fails, the consumer resumes from the last committed offset, and records are reprocessed. But because the producer is idempotent and the transaction was aborted, no duplicates appear in the output.

### Windowing

Kafka Streams supports four window types for time-based aggregations:

**Tumbling windows:** Fixed-size, non-overlapping. Example: count per 5-minute window.

**Hopping windows:** Fixed-size, overlapping. Example: count per 5-minute window, advancing every 1 minute. Each record falls into multiple windows.

**Sliding windows:** Triggered by event timestamps. A new window is created for each pair of events that are within the window size of each other.

**Session windows:** Dynamic size, based on inactivity gaps. A session ends when no new records arrive within the gap duration. Useful for user session tracking.

Window state is stored in **segmented window stores** — time is divided into segments, and old segments can be dropped entirely (O(1) deletion) instead of scanning and deleting individual records.

---

## Part 10 — The Kafka Protocol

Everything we've discussed — producing, fetching, group coordination — uses a single binary protocol over TCP.

### Request/response format

Every Kafka interaction is a request-response pair:

```
Request:
  [4 bytes: request size]
  [2 bytes: API key — which operation (Produce=0, Fetch=1, etc.)]
  [2 bytes: API version — protocol evolution]
  [4 bytes: correlation ID — matches response to request]
  [string: client ID]
  [request body — varies by API]

Response:
  [4 bytes: response size]
  [4 bytes: correlation ID — same as the request]
  [response body — varies by API]
```

### Key API operations

| API Key | Name | What it does |
|---------|------|-------------|
| 0 | Produce | Write records to partitions |
| 1 | Fetch | Read records from partitions (used by consumers AND followers) |
| 2 | ListOffsets | Find offsets by timestamp |
| 3 | Metadata | Discover brokers, topics, partition leaders |
| 8 | OffsetCommit | Commit consumer group offsets |
| 10 | FindCoordinator | Find the group coordinator broker |
| 11 | JoinGroup | Join a consumer group |
| 12 | Heartbeat | Keep group membership alive |
| 14 | SyncGroup | Receive partition assignments |
| 18 | ApiVersions | Discover supported API versions (used for version negotiation) |

The protocol is **versioned** — each API has multiple versions, and clients negotiate the version via `ApiVersions`. This is how Kafka maintains backward compatibility across releases.

---

## Part 11 — Performance: Why Kafka Is Fast (Summary)

Everything in Kafka's design works together for performance:

| Technique | What it does | Why it matters |
|-----------|-------------|---------------|
| **Append-only log** | All writes are sequential appends | Sequential I/O is 1000x faster than random I/O on HDDs |
| **Zero-copy** | `sendfile()` transfers data kernel→NIC | Eliminates CPU copies and GC pressure |
| **Page cache** | OS manages read caching | Survives JVM restarts; consumers reading recent data get cache hits |
| **Batch everything** | Records batched at producer, stored as batches on broker | One network call and one disk write for many records |
| **Compression** | Batch-level compression (lz4/zstd) | 2-4x less network and disk usage |
| **Partitioning** | Parallelism at every layer | N partitions = N consumers processing in parallel |
| **Sparse indexing** | Small, mmap'd offset/time indexes | O(log N) lookups with minimal memory |
| **Long polling** | Fetch requests wait for data | Near-real-time delivery without busy polling |
| **Pull-based consumers** | Consumers control their own pace | No broker-side per-consumer buffering |
| **Reactor pattern** | Separate network and I/O thread pools | High concurrency without thread-per-connection overhead |

---

## Where to Go Next

You now understand how Kafka works from top to bottom. For specific deep-dives:

- **[KRaft Complete Guide](./KRaft_Complete_Guide)** — the full story of how Kafka replaced ZooKeeper with Raft consensus
- **[ZooKeeper & Kafka Complete Guide](./ZooKeeper_and_Kafka_Complete_Guide)** — detailed coverage of the ZooKeeper coordination model

---

*"A distributed system is one in which the failure of a computer you didn't even know existed can render your own computer unusable." — Leslie Lamport*
