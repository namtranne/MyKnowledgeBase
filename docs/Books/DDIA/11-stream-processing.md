# Chapter 11 — Stream Processing

Batch processing operates on a **bounded** (finite) dataset — process all the data, produce output, done. Stream processing handles data that arrives **incrementally over time** — an **unbounded** dataset processed as events occur, with results available continuously.

The conceptual shift: instead of "run a job on all the data we've collected," think "process each new piece of data as it arrives."

---

## Transmitting Event Streams

### Events, Producers, Consumers

An **event** is a small, self-contained, immutable record describing something that happened at a point in time:
- A user clicked a button
- A temperature sensor reported 23.5°C
- A payment of $49.99 was processed
- A server's CPU utilization exceeded 90%

**Producer** (publisher/sender) generates events. **Consumer** (subscriber/receiver) processes them. Events are grouped into **topics** or **streams**.

### Message Delivery: Two Fundamentally Different Paradigms

#### Traditional Message Queues (RabbitMQ, ActiveMQ, Amazon SQS)

```
Producer ──▶ Queue ──▶ Consumer A (processes and acknowledges)
                  ──▶ Consumer B (processes and acknowledges)
                       (each message goes to ONE consumer)
```

**Behavior:**
- Messages are **assigned to consumers** (within a consumer group, each message is processed by exactly one consumer)
- After a consumer **acknowledges** processing, the message is **deleted** from the queue
- If a consumer crashes before acknowledging, the message is re-delivered to another consumer
- **No replay** — once deleted, the message is gone
- Good for **task distribution** where each task should be processed exactly once

**Ordering:** generally FIFO per queue, but with multiple consumers processing in parallel, the effective ordering is lost (consumer B may finish before consumer A, even if A's message was first).

#### Log-Based Message Brokers (Apache Kafka, Amazon Kinesis, Apache Pulsar)

```
Producer ──▶ Topic Partition 0: [msg0 | msg1 | msg2 | msg3 | msg4 | ...]
             Topic Partition 1: [msg0 | msg1 | msg2 | msg3 | ...]
             Topic Partition 2: [msg0 | msg1 | msg2 | msg3 | msg4 | msg5 | ...]
                                                         ▲
                                                    Consumer offset
                                              (each consumer tracks position)
```

**Behavior:**
- Messages are **appended to an ordered, persistent log** (partitioned for scalability)
- Each message has a monotonically increasing **offset** within its partition
- Consumers **read the log** at their own pace, tracking their current offset
- Messages are **not deleted after consumption** — retained for a configurable period (days, weeks, or forever via log compaction)
- Multiple consumer groups read independently — each maintains its own offset

**Scaling model:**
- One partition consumed by exactly one consumer within a consumer group
- Parallelism = number of partitions (add partitions to add consumers)
- **Total order guaranteed within each partition** (but not across partitions)

**Comparison:**

| Aspect | Traditional Queue | Log-Based Broker |
|--------|------------------|-----------------|
| Message lifecycle | Deleted after acknowledgment | Retained; consumers track offset |
| Replay | Impossible | Seek to any offset — re-process historical data |
| Consumer independence | Messages shared among consumers | Each consumer group reads independently |
| Ordering | Per-queue (lost with parallel consumers) | Per-partition (strong) |
| Throughput | Lower (per-message tracking) | Higher (sequential disk I/O, batching) |
| Fan-out | Complex (requires explicit exchange/routing) | Natural (multiple consumer groups) |
| Best for | Task queues, work distribution | Event streams, CDC, analytics, event sourcing |

### Log Compaction

For topics that represent the **current state** of something (e.g., the latest address for each customer), you don't need the full history — just the latest value for each key.

**Log compaction:** background process that scans the log and **removes older entries for each key, keeping only the most recent value**.

```
Before compaction:
  offset 0: {key: user_1, value: {addr: "123 Main"}}
  offset 1: {key: user_2, value: {addr: "456 Oak"}}
  offset 2: {key: user_1, value: {addr: "789 Pine"}}   ← newer for user_1
  offset 3: {key: user_1, value: null}                   ← tombstone (deletion)

After compaction:
  offset 1: {key: user_2, value: {addr: "456 Oak"}}     ← latest for user_2
  offset 3: {key: user_1, value: null}                   ← deletion marker (retained briefly, then removed)
```

After compaction, the log is equivalent to a **snapshot of the current state** of the underlying data. A new consumer can read the compacted log to get the full current state, then continue consuming live updates.

**This makes Kafka a viable database changelog** — not just a message bus but a durable, replayable record of all state changes.

---

## Databases and Streams

### Change Data Capture (CDC)

**Problem:** you have multiple derived data systems (search indexes, caches, data warehouses, materialized views) that need to stay in sync with the primary database. How?

**Approach 1 (naive): dual writes.** Application writes to both the database and the search index.

```
Application ──write──▶ Database    (succeeds)
Application ──write──▶ Elasticsearch (fails!)

Result: database has the data, search index doesn't → INCONSISTENT
```

Even if both succeed, there's a race condition: two clients writing different values might update the database in one order and the search index in the other → permanent inconsistency.

**Approach 2 (correct): Change Data Capture.**

```
Application ──write──▶ Primary Database (single source of truth)
                              │
                         CDC stream (reading the DB's internal replication log)
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              Elasticsearch  Cache   Data Warehouse
```

**How CDC works:**
1. Parse the database's **internal replication log** (WAL for PostgreSQL, binlog for MySQL)
2. Convert each log entry into a structured change event: `{table, primary_key, operation, old_values, new_values}`
3. Publish change events to a message broker (Kafka)
4. Derived systems consume the stream and update accordingly

**CDC implementations:**

| Database | CDC Tool |
|----------|----------|
| PostgreSQL | Debezium, Bottled Water, wal2json |
| MySQL | Debezium, Maxwell, Canal |
| MongoDB | Debezium, Mongoriver |
| Oracle | GoldenGate, Debezium |
| SQL Server | Debezium |

**Initial snapshot problem:** when a new consumer starts, it needs the full current state plus all subsequent changes. Solution:
1. Take a consistent snapshot of the database (at a known log position)
2. Load the snapshot into the derived system
3. Start consuming the CDC stream from the snapshot's log position
4. From this point on, the derived system stays in sync via the stream

### Event Sourcing

Similar to CDC in concept, but a **fundamentally different design pattern**.

| Aspect | CDC | Event Sourcing |
|--------|-----|----------------|
| Origin | Retrofit: extract changes from a mutable database | Design pattern: events are the primary write model |
| Event level | Low-level: row-level changes (INSERT row, UPDATE column) | High-level: domain events ("user cancelled order", "item added to cart") |
| Database model | Traditional mutable database + change extraction | Append-only event log is the source of truth; current state derived by replaying |
| Schema | Database schema drives event structure | Event schema is designed deliberately as part of the domain model |

**Event sourcing principles:**
1. **Events are immutable facts** — they describe what happened, not the current state. "User changed email to alice@new.com" rather than a mutable `email` column.
2. **Current state is derived** by replaying events from the beginning. Multiple views can be derived from the same event log (search index, materialized view, analytics).
3. **No updates, no deletes** in the event log. Corrections are new events ("address correction" event), not edits to previous events.
4. **Commands vs Events:** a command is a request that may be rejected ("reserve seat 42"); an event is a fact that has already happened ("seat 42 was reserved"). Validation happens at command time; events are recorded only after validation succeeds.

**Advantages:**
- **Complete audit trail** — every change ever made is recorded
- **Bug recovery** — if a derived view has a bug, fix the code and rebuild the view by replaying events
- **Multiple views from one log** — a single event log can feed a search index, a cache, a data warehouse, and a notification service
- **Temporal queries** — reconstruct the state at any point in time

**Challenges:**
- **Log compaction is harder** — events represent distinct actions, not key-value updates. You can't just keep the latest event per entity.
- **Performance** — replaying millions of events from scratch is slow. Solution: periodic **snapshots** of the derived state, then replay only events after the snapshot.

### State, Streams, and Immutability

A powerful conceptual framework:

```
Event Log (immutable, append-only)    Current State (mutable, derived)
┌──────────────────────────────────┐  ┌─────────────────────────────┐
│ +$100 (deposit)                  │  │                             │
│ -$50  (withdrawal)               │──▶│  Balance: $150             │
│ +$200 (deposit)                  │  │                             │
│ -$100 (transfer)                 │  │  (= integral of the log)   │
└──────────────────────────────────┘  └─────────────────────────────┘
```

- **Mutable state = integral of the event stream over time**
- **The event log = the changelog of the current state**
- Any current state can be reconstructed by replaying the log from the beginning
- This is exactly what database replication does — the replication log *is* the sequence of events

**The accountant's analogy:** a financial ledger is an append-only log of transactions. The balance sheet (current state) is derived from the ledger. If you discover an error, you don't erase a transaction — you add a new correcting entry. The ledger is the source of truth.

---

## Processing Streams

### Uses of Stream Processing

#### 1. Complex Event Processing (CEP)

Search for **patterns** across multiple events: "Alert when three failed login attempts from the same IP are followed by a successful login from a different country within 5 minutes."

- Queries are **long-lived** — stored persistently
- Events flow through the queries
- When a pattern matches, emit a "complex event"
- Used for: fraud detection, algorithmic trading, industrial monitoring, intrusion detection

#### 2. Stream Analytics

Continuous computation of aggregate metrics:
- Rate of events over a time window (requests/second)
- Rolling average of a value (average response time over last 5 minutes)
- Histograms, percentiles, top-N rankings
- Approximate algorithms: HyperLogLog for cardinality estimation, t-digest for approximate percentiles

**Tools:** Apache Storm, Spark Streaming, Flink, Kafka Streams, Amazon Kinesis Analytics.

#### 3. Materialized View Maintenance

Keep derived data systems updated as the source changes:
- Update a search index when documents change
- Invalidate/update a cache when the underlying data changes
- Update a denormalized view when the normalized source changes

**Key difference from analytics:** materialized views require processing **all events ever** (not just a time window). The view represents the cumulative state of all events from the beginning of time.

#### 4. Search on Streams

Traditional search: index documents first, then run queries. Stream search inverts this: **queries are stored, documents flow past.**

- Index the queries (not the documents)
- Each new event is matched against all stored queries
- Use case: media monitoring ("alert me when any article mentions my company"), real estate alerts

### Reasoning About Time

**The most subtle challenge in stream processing.**

**Event time vs Processing time:**

```
Event created:     14:03:25.123  (event time — when it actually happened)
Event received:    14:03:25.500  (arrival time — when the broker received it)
Event processed:   14:03:27.892  (processing time — when the processor handled it)
```

These three timestamps can differ by seconds, minutes, or even hours (network delays, consumer downtime, batch processing).

**The problem:** which time do you use for windowed computations?

- **Processing time** is easy but misleading — events processed at 2pm might represent actions from 1pm (delayed events) or 3pm (replayed events)
- **Event time** is correct but events may arrive **out of order** — an event from 1:59 may arrive after you've already closed the 1:00-2:00 window

**Straggler events** (events arriving after their window has closed):

| Approach | Trade-off |
|----------|-----------|
| Ignore late events | Simple but loses data. Monitor the dropped event rate. |
| Wait longer before closing windows | Increases latency for all results |
| Publish corrections | Emit an initial result, then update it when late events arrive. Downstream consumers must handle updates. |

### Window Types

| Window Type | Description | Example |
|------------|-------------|---------|
| **Tumbling** | Fixed-size, non-overlapping, contiguous | Every 1 minute: [10:03-10:04), [10:04-10:05) |
| **Hopping** | Fixed-size, overlapping (window advances by a "hop") | 5-minute windows every 1 minute: 1:00-1:05, 1:01-1:06, 1:02-1:07 |
| **Sliding** | All events within a fixed duration of each other | "All events within 5 minutes of this event" — a separate window per event |
| **Session** | Group events from the same entity with no gap longer than a timeout | User activity with gaps of no more than 30 minutes. Variable-length windows. Requires buffering (the window isn't closed until the timeout elapses). |

### Stream Joins

Three types of joins, each progressively more complex:

#### Stream-Stream Join (Window Join)

Both inputs are event streams. Match events from two streams that occur within a time window.

**Example:** match ad impressions with ad clicks within 1 hour.

```
Stream 1 (impressions): {ad_id: 42, time: 14:00, user: alice}
Stream 2 (clicks):      {ad_id: 42, time: 14:23, user: alice}

Processor maintains a buffer of recent impressions (e.g., last 1 hour).
When a click arrives, look up the matching impression in the buffer.
Emit: {ad_id: 42, impression_time: 14:00, click_time: 14:23, delay: 23min}
```

**Implementation:** the processor indexes events by join key. When an event from one stream arrives, check the other stream's index for matches. Expired entries (outside the window) are garbage collected.

#### Stream-Table Join (Stream Enrichment)

One input is an event stream, the other is a database table (or slowly changing reference data).

**Example:** enrich each event with the user's profile data.

```
Event stream: {user_id: 123, action: "purchase", item: "widget"}
User table:   {user_id: 123, name: "Alice", tier: "gold", region: "US-West"}

Output:       {user_id: 123, name: "Alice", tier: "gold", action: "purchase", item: "widget"}
```

**Approaches:**
1. **Remote lookup:** for each event, query the database. Simple but slow (network round-trip per event) and the database becomes a bottleneck.
2. **Local cache:** load the table into the processor's memory. Fast but the cache gets stale.
3. **CDC-updated local copy:** subscribe to the table's CDC stream. Maintain an up-to-date local copy that the processor queries. Best of both worlds — fast lookups with fresh data.

#### Table-Table Join (Materialized View Maintenance)

Both inputs are CDC streams from database tables. Maintain a precomputed join result that stays up to date as either table changes.

**Example:** Twitter-style timeline cache.

```
CDC stream 1 (tweets):   {user: 123, tweet: "Hello world", action: INSERT}
CDC stream 2 (follows):  {follower: 456, followee: 123, action: INSERT}

Materialized view: user 456's timeline includes user 123's tweets

When user 123 posts a new tweet → add to all followers' timelines
When user 456 follows user 123 → add all of 123's tweets to 456's timeline
When user 456 unfollows user 123 → remove 123's tweets from 456's timeline
```

### Fault Tolerance and Exactly-Once Semantics

**The fundamental challenge:** if a stream processor crashes after processing an event but before recording the result, the event may be processed twice after restart.

**Approaches to achieve effectively-once processing:**

| Approach | How | Used By | Trade-off |
|----------|-----|---------|-----------|
| **Microbatching** | Break the stream into tiny batches (e.g., 1-second). Each batch is processed atomically — either all events in the batch are processed or none. | Spark Streaming | Latency floor = batch interval. Window boundaries tied to batch boundaries. |
| **Checkpointing** | Periodically snapshot the operator's state. On failure, restart from the last checkpoint and replay events since then. | Apache Flink | Requires deterministic processing for correct recovery. Checkpointing interval = potential duplicate window. |
| **Idempotent writes** | Design the output operation to be safe for retries. Write with a **deterministic key** derived from the input event → writing the same result twice is harmless. | Application-level | Requires careful design; not always possible (e.g., sending an email is not idempotent) |
| **Transactional output** | Atomically commit the processing result AND update the consumer offset in a single transaction. | Kafka transactions | Overhead of distributed transactions; only works within a single system |

**"Exactly-once" really means "effectively-once":** events may actually be processed more than once during recovery, but the visible effect is as if each event was processed exactly once — because duplicate processing produces the same result (via idempotency) or is rolled back (via transactions).

### Rebuilding State After Failure

Stream processors often maintain local state (aggregations, join indexes, windows):

| Approach | How | Trade-off |
|----------|-----|-----------|
| **Remote state store** | State stored in an external database (Redis, Cassandra) | Slow (network round-trip per state access) but state survives failures |
| **Local state + changelog** | State stored locally (in-memory or on local disk). Changes to state written to a changelog topic (Kafka). On failure, rebuild state by replaying the changelog. | Fast local access; rebuilding takes time proportional to state size |
| **Local state + re-derivation** | Re-derive the state from the original input stream | Simple but slow for large state; requires storing the full input history |

**Kafka Streams** and **Flink** use the changelog approach — state is maintained locally for fast access and backed by a Kafka topic for durability. On failure, a new instance reads the changelog to rebuild the state.
