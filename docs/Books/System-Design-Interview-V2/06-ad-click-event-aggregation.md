# Chapter 6: Ad Click Event Aggregation

## 1. Problem Statement & Requirements

### What Are We Designing?

A **real-time ad click event aggregation system** for a large-scale digital advertising platform (think Google Ads or Facebook Ads). Advertisers pay per click (CPC model), so the system must accurately count and aggregate ad click events in near real-time, powering dashboards, billing, and fraud detection.

This is fundamentally a **stream processing** problem: billions of raw click events flow in continuously and must be aggregated into query-friendly summaries within seconds.

### Why This Problem Matters

| Stakeholder | Need |
|---|---|
| Advertisers | Real-time dashboard showing click counts, CTR, spend |
| Ad platform billing | Exact click counts → money charged to advertisers |
| Data scientists | Historical click data for ML models, trend analysis |
| Fraud detection | Real-time anomaly detection on click patterns |

Since **money is directly tied to click counts**, correctness is non-negotiable. An overcounting bug means overcharging advertisers (legal liability). Undercounting means revenue loss.

### Functional Requirements

1. **Aggregate click events**: count ad clicks for a given `ad_id` over configurable time windows (last 1 min, 5 min, 1 hour, etc.)
2. **Filter by attributes**: support aggregation filtered by `country`, `device_type`, `os`, `browser`, `ip` (multi-dimensional)
3. **Query API**: return aggregated click counts for a given ad within a time range, with optional filters
4. **Real-time dashboard**: advertisers see click data within ~1 minute of the actual click
5. **Support historical queries**: query aggregated data for the past 30 days; raw data retained for longer
6. **Top-N most clicked ads**: return the most popular ads in a given time window

### Non-Functional Requirements

| Requirement | Target | Rationale |
|---|---|---|
| Correctness | Exactly-once counting | Billing accuracy — money is involved |
| Latency | Aggregation within 1 minute | Real-time dashboard requirement |
| Throughput | 50K events/sec at peak | Handle traffic spikes (Super Bowl, Black Friday) |
| Scalability | Horizontal scaling | Traffic grows with advertiser count |
| Fault tolerance | No data loss | Must recover from crashes without losing events |
| Duplicate handling | Dedup within a window | Client retries, network issues cause duplicates |
| Late data handling | Accept events up to 15 min late | Mobile devices, network delays |
| Availability | 99.99% uptime | Revenue-generating service |

### Scale Estimation (Back-of-Envelope)

```
Ad clicks per day:           1,000,000,000 (1 billion)
Avg clicks per second:       1B / 86,400 ≈ 11,574 (~10K QPS)
Peak (5x average):           ~50,000 clicks/sec
Avg click event size:        ~500 bytes (JSON)

Daily raw data:              1B × 500B = 500 GB/day
7-day retention (raw):       3.5 TB
Monthly aggregated data:     ~10 GB (much smaller after aggregation)

Unique ads:                  ~2 million active ads
Unique advertisers:          ~200,000
```

Key insight: **raw data is massive** (~500 GB/day), but **aggregated data is small** (~10 GB/month). The system's job is to compress that 500 GB into efficient, queryable summaries.

---

## 2. High-Level Design

### Raw Data vs Aggregated Data

| Aspect | Raw Data | Aggregated Data |
|---|---|---|
| Volume | Huge (~500 GB/day) | Small (~10 GB/month) |
| Queryable | Slow (full scan) | Fast (indexed, pre-computed) |
| Flexibility | Can re-aggregate any way | Fixed dimensions |
| Use case | Reprocessing, debugging, audit | Real-time dashboards, billing |
| Storage | Kafka → S3/HDFS (cold) | OLAP database |
| Retention | 7 days hot, years cold | Months to years |

**Both are necessary.** Raw data is your source of truth for reconciliation. Aggregated data powers low-latency queries.

### Input Data Model (Click Event)

```json
{
  "event_id": "a1b2c3d4-uuid",
  "ad_id": "ad_12345",
  "click_timestamp": "2026-02-25T14:30:00Z",
  "user_id": "user_98765",
  "ip": "203.0.113.42",
  "country": "US",
  "device_type": "mobile",
  "os": "iOS",
  "browser": "Safari",
  "referrer_url": "https://example.com/article",
  "campaign_id": "camp_555"
}
```

### Aggregation Output Model

```
Table: ad_click_aggregation
+----------+-----------------------+-----------------------+-------------+---------+-------------+
| ad_id    | window_start          | window_end            | click_count | country | device_type |
+----------+-----------------------+-----------------------+-------------+---------+-------------+
| ad_12345 | 2026-02-25T14:00:00Z  | 2026-02-25T14:01:00Z  |         347 | US      | mobile      |
| ad_12345 | 2026-02-25T14:00:00Z  | 2026-02-25T14:01:00Z  |         129 | US      | desktop     |
| ad_12345 | 2026-02-25T14:00:00Z  | 2026-02-25T14:01:00Z  |          52 | UK      | mobile      |
| ad_67890 | 2026-02-25T14:00:00Z  | 2026-02-25T14:01:00Z  |        1024 | US      | mobile      |
+----------+-----------------------+-----------------------+-------------+---------+-------------+
```

### Query API

```
GET /v1/ads/{ad_id}/aggregated_count
    ?from=2026-02-25T14:00:00Z
    &to=2026-02-25T15:00:00Z
    &filter=country:US,device_type:mobile
    &granularity=1m

Response:
{
  "ad_id": "ad_12345",
  "from": "2026-02-25T14:00:00Z",
  "to": "2026-02-25T15:00:00Z",
  "granularity": "1m",
  "filters": {"country": "US", "device_type": "mobile"},
  "data": [
    {"window_start": "2026-02-25T14:00:00Z", "click_count": 347},
    {"window_start": "2026-02-25T14:01:00Z", "click_count": 412},
    ...
  ]
}
```

Additional API endpoints:

```
GET  /v1/ads/top?window=1h&limit=100          # Top-N most clicked ads
GET  /v1/ads/{ad_id}/raw_count?from=&to=       # Exact count from raw data (slow)
POST /v1/reconciliation/trigger                 # Manual reconciliation trigger
```

### Star Schema for Analytics

```
                    ┌──────────────┐
                    │  dim_device  │
                    │──────────────│
                    │ device_id    │
                    │ device_type  │
                    │ os           │
                    │ browser      │
                    └──────┬───────┘
                           │
┌──────────────┐    ┌──────┴───────────────┐    ┌──────────────┐
│  dim_time    │    │  fact_click_events    │    │  dim_geo     │
│──────────────│    │──────────────────────│    │──────────────│
│ time_id      ├────┤ event_id (PK)        ├────┤ geo_id       │
│ minute       │    │ ad_id (FK)           │    │ country      │
│ hour         │    │ time_id (FK)         │    │ region       │
│ day          │    │ device_id (FK)       │    │ city         │
│ week         │    │ geo_id (FK)          │    └──────────────┘
│ month        │    │ user_id              │
└──────────────┘    │ click_timestamp      │    ┌──────────────┐
                    │ ip                   ├────┤  dim_ad      │
                    │ is_valid_click       │    │──────────────│
                    └──────────────────────┘    │ ad_id        │
                                                │ campaign_id  │
                                                │ advertiser_id│
                                                │ ad_format    │
                                                └──────────────┘
```

### System Architecture (High-Level)

```
                         ┌─────────────────────────────────────────────────────────────┐
                         │                      Ad Click Event Flow                    │
                         └─────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
  │  Mobile  │     │   Web    │     │   Load       │     │    Kafka      │     │   Flink     │
  │  SDKs    ├────►│  Pixel   ├────►│  Balancer    ├────►│  (raw_clicks) ├────►│  Aggregation│
  │          │     │  Tracker │     │  + Click API │     │               │     │  Service    │
  └──────────┘     └──────────┘     └──────┬───────┘     └──────┬────────┘     └──────┬──────┘
                                           │                    │                      │
                                           │                    │                      │
                                           │                    ▼                      ▼
                                           │              ┌──────────┐          ┌──────────────┐
                                           │              │  S3/HDFS │          │  OLAP DB     │
                                           │              │  (cold   │          │  (ClickHouse │
                                           │              │  storage)│          │   or Druid)  │
                                           │              └────┬─────┘          └──────┬───────┘
                                           │                   │                       │
                                           │                   ▼                       ▼
                                           │            ┌──────────────┐        ┌──────────────┐
                                           │            │ Reconciliation│       │ Query Service │
                                           │            │ Batch Job    │◄──────►│ (API layer)  │
                                           │            └──────────────┘        └──────┬───────┘
                                           │                                           │
                                           │                                           ▼
                                           │                                   ┌──────────────┐
                                           │                                   │  Advertiser  │
                                           └──────────────────────────────────►│  Dashboard   │
                                                                               └──────────────┘
```

### Detailed Data Flow

```
Step 1: User clicks ad → click tracked via pixel/SDK
Step 2: Click event hits Click API servers (stateless, horizontally scaled)
Step 3: Click API validates event, enriches with geo data, publishes to Kafka topic "raw_clicks"
Step 4: Two consumers read from Kafka:
        a) Flink streaming job → real-time aggregation → writes to OLAP DB
        b) Archival job → writes raw events to S3/HDFS for cold storage
Step 5: Query Service reads from OLAP DB to serve dashboard queries
Step 6: Reconciliation job runs every few hours: re-aggregates from S3 raw data,
        compares with real-time results, fixes discrepancies
```

---

## 3. Data Processing Approaches

### Option 1: MapReduce (Batch Processing)

```
Raw Clicks      Map Phase          Shuffle           Reduce Phase       Output
(S3/HDFS)                         & Sort

┌─────────┐    ┌──────────────┐                    ┌──────────────┐   ┌───────────┐
│ click 1  │───►│(ad_001, 1)   │──┐                │ ad_001:      │──►│ ad_001: 5 │
│ click 2  │───►│(ad_002, 1)   │  │   ┌────────┐  │  [1,1,1,1,1] │   │ ad_002: 3 │
│ click 3  │───►│(ad_001, 1)   │──├──►│ Sort by│──►│              │   │ ad_003: 7 │
│ click 4  │───►│(ad_003, 1)   │  │   │ ad_id  │  │ ad_002:      │   └───────────┘
│ ...      │───►│(ad_001, 1)   │──┘   └────────┘  │  [1,1,1]     │
└─────────┘    └──────────────┘                    └──────────────┘
```

**Map function:**
```python
def map(click_event):
    key = (click_event.ad_id, truncate_to_minute(click_event.timestamp))
    emit(key, 1)
```

**Reduce function:**
```python
def reduce(key, values):
    emit(key, sum(values))
```

| Pros | Cons |
|---|---|
| Simple mental model | High latency (minutes to hours) |
| Great for reprocessing all historical data | Not suitable for real-time dashboards |
| Fault-tolerant (job restarts from scratch) | Expensive to run continuously |
| Mature tooling (Hadoop, Spark batch) | Wasteful for incremental updates |

**Use case**: reconciliation jobs, backfill, historical analysis — not the primary aggregation path.

### Option 2: Stream Processing (Real-Time)

```
  Kafka              Flink Streaming Pipeline                    OLAP DB
┌─────────┐    ┌────────────────────────────────────────┐    ┌──────────┐
│         │    │                                        │    │          │
│  raw    │    │  Source ──► Filter ──► KeyBy ──► Window │    │ Aggregated│
│  clicks ├───►│           (valid     (ad_id)   (tumbling├───►│ Results  │
│         │    │            clicks)              1 min)  │    │          │
│         │    │                                        │    │          │
└─────────┘    └────────────────────────────────────────┘    └──────────┘
```

**Flink pseudocode:**
```java
clickStream
    .filter(event -> isValidClick(event))
    .keyBy(event -> event.getAdId())
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .allowedLateness(Time.minutes(15))
    .aggregate(new ClickCountAggregator())
    .addSink(new OLAPDatabaseSink());
```

| Pros | Cons |
|---|---|
| Low latency (seconds) | Complex to operate and debug |
| Natural fit for continuous data | State management is tricky |
| Built-in windowing, watermarks | Requires stream processing expertise |
| Handles late data gracefully | Harder to reprocess historical data |

**Use case**: primary aggregation path for real-time dashboards.

### Lambda Architecture

Runs **both** batch and stream processing in parallel:

```
                                    ┌──────────────────────────┐
                                    │     Batch Layer          │
                             ┌─────►│  (Spark/MapReduce)       │─────┐
                             │      │  Processes ALL data      │     │
                             │      │  High latency, accurate  │     │
  ┌─────────┐   ┌────────┐  │      └──────────────────────────┘     │   ┌─────────────┐
  │  Raw    │──►│ Kafka  │──┤                                       ├──►│  Serving    │
  │  Clicks │   │        │  │      ┌──────────────────────────┐     │   │  Layer      │
  └─────────┘   └────────┘  │      │     Speed Layer           │     │   │  (merges    │
                             └─────►│  (Flink streaming)       │─────┘   │   results)  │
                                    │  Processes recent data   │         └─────────────┘
                                    │  Low latency, approximate│
                                    └──────────────────────────┘
```

| Pros | Cons |
|---|---|
| Best of both worlds: fast + accurate | Two codepaths to maintain (2x complexity) |
| Batch corrects stream errors | Logic duplication between batch and speed layers |
| Battle-tested at LinkedIn, Twitter | Serving layer merge logic is complex |

### Kappa Architecture

Single stream processing pipeline; reprocess by **replaying** events from Kafka:

```
                    ┌──────────────────────────────────────────────┐
  ┌─────────┐      │           Single Stream Pipeline             │      ┌──────────┐
  │  Raw    │─────►│  Kafka ──► Flink ──► Aggregation ──► Sink   │─────►│  Serving │
  │  Clicks │      │                                              │      │  Layer   │
  └─────────┘      └──────────────────────────────────────────────┘      └──────────┘
                                       │
                                       │  Reprocessing? Replay from
                                       │  Kafka with a new consumer
                                       │  group / new job version
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │  New version of same pipeline (v2)           │
                    │  Reads from earliest Kafka offset            │
                    │  Writes to new output table                  │
                    │  Cut over when caught up                     │
                    └──────────────────────────────────────────────┘
```

| Pros | Cons |
|---|---|
| Single codebase | Requires Kafka to retain enough data |
| Simpler than Lambda | Reprocessing large volumes is expensive |
| Easier to reason about correctness | Not ideal if batch logic differs fundamentally |

### Which Architecture to Choose?

| Factor | Lambda | Kappa |
|---|---|---|
| Codebase complexity | High (two paths) | Low (one path) |
| Reprocessing | Native batch layer | Replay from Kafka |
| Accuracy guarantee | Batch provides ground truth | Depends on stream correctness |
| Operational burden | High | Medium |
| Industry trend | Legacy (still used) | **Preferred for new systems** |

**Interview recommendation**: Start with **Kappa architecture** and add a **reconciliation batch job** for correctness. This gives you the simplicity of Kappa with the accuracy safety net of Lambda, without maintaining two full processing pipelines.

---

## 4. Aggregation Deep Dive

### Time Windows

Windowing is the core concept that groups unbounded streams into finite chunks for aggregation.

#### Tumbling Window (Non-Overlapping, Fixed-Size)

```
Time ──────────────────────────────────────────────────────►

Events:  x x  x   x x x   x  x   x x   x x x x   x  x

         ├─────────┤├─────────┤├─────────┤├─────────┤
         Window 1   Window 2   Window 3   Window 4
         [0, 1min)  [1, 2min)  [2, 3min)  [3, 4min)

Each event belongs to exactly ONE window.
```

- **Use case**: minute-by-minute click counts (our primary use case)
- **Pros**: simple, no overlap, each event counted once
- **Cons**: boundary effects (a burst at minute boundary splits across two windows)

#### Sliding Window (Overlapping)

```
Time ──────────────────────────────────────────────────────►

Events:  x x  x   x x x   x  x   x x   x x x x   x  x

         ├───────────────────┤                         Window size = 2min
           ├───────────────────┤                       Slide = 1min
             ├───────────────────┤
               ├───────────────────┤

Each event may belong to MULTIPLE windows.
```

- **Use case**: "clicks in the last 5 minutes" updated every 1 minute
- **Pros**: smoother trends, no boundary effects
- **Cons**: more computation (each event processed multiple times), more storage

#### Session Window (Dynamic, Activity-Based)

```
Time ──────────────────────────────────────────────────────►

Events:  x x x     x x         x x x x x        x

         ├─────┤   ├───┤       ├─────────┤      ├─┤
         Session1  Session2    Session3         Session4
              ▲         ▲           ▲              ▲
              gap>thresh gap>thresh  gap>thresh    gap>thresh
```

- **Use case**: user session analysis (not typically used for ad click aggregation)
- **Pros**: captures natural activity patterns
- **Cons**: unpredictable window sizes, complex to implement

#### Choosing Windows for Ad Click Aggregation

| Granularity | Window Type | Purpose |
|---|---|---|
| 1-minute | Tumbling | Real-time dashboard, finest granularity |
| 5-minute | Tumbling | Near-real-time reports |
| 1-hour | Tumbling | Hourly billing summaries |
| 1-day | Tumbling | Daily reports, reconciliation |

Pre-aggregate at 1-minute tumbling windows. Roll up to coarser granularities by summing:

```
1-min windows ──► sum 5 consecutive ──► 5-min aggregation
1-min windows ──► sum 60 consecutive ──► 1-hour aggregation
```

### Aggregation Types

| Aggregation | Description | Data Structure | Use Case |
|---|---|---|---|
| COUNT | Number of clicks | Simple counter | Click count per ad |
| SUM | Sum of a value (e.g., bid amount) | Accumulator | Total ad spend |
| DISTINCT COUNT | Unique users who clicked | HyperLogLog | Unique clickers |
| TOP-N | Most clicked ads | Min-heap of size N | Trending ads |
| PERCENTILE | p99 click latency | t-digest / DDSketch | Performance monitoring |

#### HyperLogLog for Distinct Counts

Counting exact unique users who clicked an ad requires storing all user IDs (memory-intensive at scale). **HyperLogLog (HLL)** provides an approximate distinct count using ~12 KB of memory regardless of cardinality.

```
Exact distinct count:    Store all user_ids → O(n) memory
                         1B clicks × 8 bytes = 8 GB per ad

HyperLogLog:             ~12 KB per counter
                         2M ads × 12 KB = 24 GB total
                         Error rate: ~0.81% (standard error)
```

HLL is **mergeable**: you can union HLL sketches from different partitions or time windows, which makes it perfect for distributed aggregation.

### Multi-Dimensional Aggregation

Advertisers want to slice and dice data by multiple dimensions:

```
Total clicks for ad_12345 in the last hour
  └── by country
       ├── US: 5,000
       │    └── by device
       │         ├── mobile: 3,200
       │         └── desktop: 1,800
       ├── UK: 1,200
       └── DE: 800
```

**Approach 1: Pre-compute all combinations (data cube)**

```
Dimensions: country (200 values), device_type (3), os (5), browser (8)
Combinations: 200 × 3 × 5 × 8 = 24,000 per ad per time window
With 2M ads: 48 billion rows per minute → too many!
```

**Approach 2: Pre-compute popular combinations only**

Pre-aggregate for the most commonly queried dimension combinations:

```
Level 0: ad_id + window                              (base aggregation)
Level 1: ad_id + window + country                    (most common filter)
Level 2: ad_id + window + country + device_type      (second most common)
Level 3: ad_id + window + device_type                (also popular)
```

Anything not pre-computed is served by querying raw aggregated data from the OLAP DB with filters applied at query time.

### Watermarks and Late Data Handling

In a distributed system, events arrive **out of order**. A click that happened at 14:00:05 might arrive at the processing engine at 14:03:00 due to mobile network delays.

#### What Is a Watermark?

A watermark is a **timestamp** that says: "I believe all events with timestamps ≤ this watermark have arrived."

```
Event time:     14:00   14:01   14:02   14:03   14:04
                  │       │       │       │       │
Processing        │       │       │       │       │
timeline:     ────┼───────┼───────┼───────┼───────┼─────►
                  │       │       │       │       │
Watermark:     14:00  14:00:30 14:01:15 14:02:00 14:02:45
                  │
                  └─── Watermark lags behind event time
                       (accounts for expected delay)
```

When the watermark passes the **end of a window**, that window is considered complete and its results are emitted.

#### Handling Late Data

```
                   Window [14:00, 14:01)
                        │
                        │   Watermark passes 14:01
                        │   → window fires, emits result
                        ▼
Events arriving:  ──x──x──x──│──x(late!)──x(late!)──x(very late!)──►
                              │     │          │           │
                              │     │          │           │
                              │     ▼          ▼           ▼
                              │  Allowed    Allowed     Dropped
                              │  lateness   lateness    (beyond
                              │  window     window      allowed
                              │  (update    (update     lateness)
                              │   result)    result)
                              │
                              │◄── allowed lateness ──►│
                              │     (e.g., 15 min)     │
```

**Strategy for ad click aggregation:**

1. **Watermark**: set to `max_event_time - 10_seconds` (expect most events within 10s)
2. **Allowed lateness**: 15 minutes (accept updates for 15 min after window fires)
3. **Side output**: events arriving after allowed lateness go to a dead-letter queue
4. **Reconciliation**: the batch reconciliation job picks up anything missed

```java
clickStream
    .assignTimestampsAndWatermarks(
        WatermarkStrategy
            .<ClickEvent>forBoundedOutOfOrderness(Duration.ofSeconds(10))
            .withTimestampAssigner((event, ts) -> event.getClickTimestamp())
    )
    .keyBy(ClickEvent::getAdId)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .allowedLateness(Time.minutes(15))
    .sideOutputLateData(lateOutputTag)
    .aggregate(new ClickCountAggregator());
```

---

## 5. Exactly-Once Processing

### Why It Matters

```
Scenario: ad_12345 gets 10,000 real clicks in an hour.
Advertiser bid: $0.50 per click.

If counted correctly:  10,000 × $0.50 = $5,000 billed   ✓
If double-counted:     15,000 × $0.50 = $7,500 billed   ✗ → lawsuit
If undercounted:        8,000 × $0.50 = $4,000 billed   ✗ → revenue loss
```

### The Three Semantics

| Semantic | Guarantee | Implementation Complexity | Use Case |
|---|---|---|---|
| At-most-once | May lose events | Low | Logging, metrics (lossy OK) |
| At-least-once | No loss, may duplicate | Medium | Most streaming apps |
| Exactly-once | No loss, no duplicates | High | **Billing, financial** |

### End-to-End Exactly-Once Pipeline

Achieving exactly-once requires coordination across **all three stages**:

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│    Source     │    │    Processing    │    │     Sink     │
│   (Kafka)    │───►│   (Flink)       │───►│  (OLAP DB)   │
│              │    │                  │    │              │
│ Exactly-once │    │ Exactly-once     │    │ Exactly-once │
│ consumption  │    │ state mgmt      │    │ writes       │
│ via offsets  │    │ via checkpoints  │    │ via idempotent│
│              │    │                  │    │ upserts      │
└──────────────┘    └──────────────────┘    └──────────────┘

All three must participate, or the guarantee breaks.
```

**Stage 1 — Source (Kafka):**
- Flink's Kafka consumer tracks offsets in Flink's checkpoint state (not Kafka's `__consumer_offsets`)
- On recovery, Flink resets Kafka offsets to the checkpointed position
- Events between last checkpoint and failure are re-read (at-least-once at source level)

**Stage 2 — Processing (Flink):**
- Flink uses **Chandy-Lamport distributed snapshots** (checkpointing)
- Periodically snapshots operator state + Kafka offsets to durable storage (S3/HDFS)
- On failure, all operators restore from the same consistent snapshot
- Ensures internal state is exactly-once

**Stage 3 — Sink (OLAP DB):**
- Two approaches:
  - **Two-phase commit (2PC)**: Flink's `TwoPhaseCommitSinkFunction` — pre-commit during checkpoint, commit on checkpoint completion
  - **Idempotent writes**: use upsert (INSERT ON CONFLICT UPDATE) keyed on `(ad_id, window_start, filter_dims)` — writing the same result twice has no effect

**Idempotent upsert (preferred for simplicity):**

```sql
INSERT INTO ad_click_aggregation (ad_id, window_start, window_end, click_count, country, device_type)
VALUES ('ad_12345', '2026-02-25T14:00:00Z', '2026-02-25T14:01:00Z', 347, 'US', 'mobile')
ON CONFLICT (ad_id, window_start, country, device_type)
DO UPDATE SET click_count = EXCLUDED.click_count,
              updated_at = NOW();
```

### Deduplication Strategies

Even with exactly-once processing, **duplicate events can arrive at Kafka** (client retries, at-least-once producers). We need application-level dedup.

#### Strategy 1: Event ID-Based Deduplication

Each click event carries a unique `event_id`. The aggregation service maintains a set of recently seen event IDs.

```
┌──────────────────────────────────────────┐
│          Dedup Cache (in Flink state)    │
│                                          │
│  event_id → timestamp                    │
│  "a1b2c3" → 14:00:05                    │
│  "d4e5f6" → 14:00:06                    │
│  "g7h8i9" → 14:00:07                    │
│                                          │
│  TTL: 15 minutes (matches allowed        │
│       lateness window)                   │
│                                          │
│  New event arrives:                      │
│    if event_id in cache → drop (dup!)    │
│    else → process and add to cache       │
└──────────────────────────────────────────┘
```

| Pros | Cons |
|---|---|
| Exact deduplication | Memory-intensive: 50K events/sec × 900s TTL = 45M entries |
| Simple logic | State size grows with traffic and TTL |

#### Strategy 2: Bloom Filter for Approximate Dedup

For extremely high throughput, use a **Bloom filter** — a probabilistic data structure that can tell you "definitely not seen" or "probably seen."

```
Bloom filter:  m = 100M bits (~12 MB), k = 7 hash functions
False positive rate: ~1% (may incorrectly drop ~1% of unique events)
False negative rate: 0% (never misses a true duplicate)

Trade-off: lose ~1% of valid clicks vs save massive memory
```

For billing-critical systems, the 1% false positive rate is unacceptable. Use exact dedup with event IDs and manage state size through TTL and RocksDB state backend.

#### Strategy 3: Two-Level Dedup

```
Level 1: Bloom filter (fast, approximate) ──► catches 99% of duplicates
Level 2: Exact event_id lookup (slow, exact) ──► only for events that pass Bloom filter

This reduces the load on the exact dedup store significantly.
```

### Dedup Window Size Trade-off

| Dedup Window | Memory | Coverage |
|---|---|---|
| 1 minute | ~3M entries | Misses delayed duplicates |
| 5 minutes | ~15M entries | Good balance |
| 15 minutes | ~45M entries | Covers most real-world delays |
| 1 hour | ~180M entries | Very safe, very expensive |

**Recommendation**: 15-minute dedup window matching the allowed lateness, backed by RocksDB state backend for spill-to-disk when memory is tight.

---

## 6. Reconciliation

### Why Real-Time Aggregation May Not Be 100% Accurate

| Source of Inaccuracy | Description |
|---|---|
| Extremely late events | Events arriving after allowed lateness window (>15 min) |
| Processing failures | Events lost during recovery between checkpoints |
| Bugs in streaming code | Logic errors in filter/aggregate operators |
| Clock skew | Event timestamps slightly off across distributed producers |
| Infrastructure issues | Kafka broker failures, Flink task manager crashes |

Even with exactly-once semantics, edge cases exist. For a billing system, you need a **safety net**.

### Reconciliation Architecture

```
                    ┌──────────────────────────────────────────────────────┐
                    │              Reconciliation Flow                     │
                    └──────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────────┐        ┌──────────────────┐
  │  S3/HDFS     │         │  Spark Batch     │        │  Reconciliation  │
  │  Raw Clicks  ├────────►│  Re-aggregation  ├───────►│  Database        │
  │  (source of  │         │  Job             │        │  (batch results) │
  │   truth)     │         │                  │        │                  │
  └──────────────┘         └──────────────────┘        └────────┬─────────┘
                                                                │
                                                                │ Compare
                                                                ▼
  ┌──────────────┐         ┌──────────────────┐        ┌──────────────────┐
  │  OLAP DB     │         │  Anomaly         │        │  Alert /         │
  │  Real-time   ├────────►│  Detection       │◄───────┤  Auto-correct    │
  │  Results     │         │  Service         │        │                  │
  └──────────────┘         └──────────────────┘        └──────────────────┘
```

### Reconciliation Process

```
Schedule: every 4 hours (configurable)

1. Read raw click events from S3 for the reconciliation window
   (e.g., events from 4-8 hours ago — enough time for all late events to arrive)

2. Run Spark batch job:
   - Group by (ad_id, minute_window, country, device_type)
   - COUNT(*) as batch_click_count
   - Apply same dedup logic (event_id based)

3. Compare batch results with real-time OLAP results:
   For each (ad_id, window, dimensions):
     delta = |batch_count - realtime_count|
     delta_pct = delta / batch_count * 100

4. Decision matrix:
   ┌─────────────────┬────────────────────────────────┐
   │  delta_pct < 1% │  No action (within tolerance)  │
   │  1% ≤ delta < 5%│  Auto-correct: overwrite OLAP  │
   │  delta ≥ 5%     │  Alert on-call + auto-correct  │
   └─────────────────┴────────────────────────────────┘

5. Correction: UPDATE OLAP DB with batch_count where discrepancy found
6. Log all corrections for audit trail
```

### Reconciliation SQL Example

```sql
-- Find discrepancies
SELECT
    rt.ad_id,
    rt.window_start,
    rt.click_count AS realtime_count,
    batch.click_count AS batch_count,
    ABS(rt.click_count - batch.click_count) AS delta,
    ROUND(ABS(rt.click_count - batch.click_count)::numeric / NULLIF(batch.click_count, 0) * 100, 2) AS delta_pct
FROM ad_click_aggregation rt
JOIN reconciliation_results batch
    ON rt.ad_id = batch.ad_id
    AND rt.window_start = batch.window_start
    AND rt.country = batch.country
    AND rt.device_type = batch.device_type
WHERE ABS(rt.click_count - batch.click_count) > 0
ORDER BY delta_pct DESC;
```

---

## 7. Scaling

### Kafka Partitioning Strategy

```
Topic: raw_clicks
Partitions: 256 (allows up to 256 parallel consumers)
Partition key: ad_id

┌──────────────────────────────────────────────┐
│  Kafka Topic: raw_clicks (256 partitions)    │
├──────────┬──────────┬──────────┬─────────────┤
│ Part 0   │ Part 1   │ Part 2   │ ... Part 255│
│ ad_001   │ ad_002   │ ad_003   │             │
│ ad_257   │ ad_258   │ ad_259   │             │
│ ad_513   │ ad_514   │ ad_515   │             │
│  ...     │  ...     │  ...     │     ...     │
└──────────┴──────────┴──────────┴─────────────┘

Partitioning by ad_id ensures:
  - All clicks for an ad go to the same partition → same Flink task
  - Correct per-ad aggregation without shuffling
  - Partition ordering preserved
```

**How many partitions?**

```
Peak throughput:        50,000 events/sec
Per-partition capacity: ~5,000 events/sec (conservative)
Min partitions:         50,000 / 5,000 = 10 partitions

But plan for growth + headroom:
Recommended:            256 partitions (plenty of parallelism)
```

### Flink Parallelism

```
┌──────────────────────────────────────────────────────────┐
│              Flink Job (parallelism = 256)                │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ Source (256)│  │ Filter     │  │ KeyBy + Window     │  │
│  │ Kafka      ├──► (256)      ├──► + Aggregate (256)  │  │
│  │ Consumer   │  │ Valid      │  │                    │  │
│  │            │  │ clicks only│  │ Keyed by ad_id     │  │
│  └────────────┘  └────────────┘  └─────────┬──────────┘  │
│                                            │             │
│                                   ┌────────▼──────────┐  │
│                                   │ Sink (64)         │  │
│                                   │ Write to OLAP DB  │  │
│                                   │ (lower parallelism│  │
│                                   │  to avoid DB      │  │
│                                   │  connection flood) │  │
│                                   └───────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Operator chaining**: Flink chains operators that have the same parallelism and are connected by forward connections (no shuffle). Source → Filter can be chained into a single task, reducing serialization overhead.

### The Hot Ad Problem

Some ads receive disproportionately high traffic (e.g., a Super Bowl ad might get 1M clicks/min while a typical ad gets 10 clicks/min).

```
Problem:
  Partition key = ad_id
  Hot ad_id → all its traffic goes to ONE Flink subtask
  That subtask becomes a bottleneck while others sit idle

  ┌────────────────────────────────────────────────┐
  │  Flink subtasks                                │
  │                                                │
  │  Task 0: ad_001 (hot) ████████████████ 100K/s  │
  │  Task 1: ad_002       ██ 500/s                 │
  │  Task 2: ad_003       █ 200/s                  │
  │  Task 3: ad_004       █ 300/s                  │
  │                                                │
  │  Task 0 is overloaded! Others are idle.        │
  └────────────────────────────────────────────────┘
```

#### Solution: Two-Level Aggregation with Salting

```
                    Level 1: Pre-aggregation              Level 2: Final aggregation
                    (salted keys, distributed)            (merge partial results)

  Click events      ┌──────────────────────┐              ┌──────────────────┐
  for ad_001:       │  Key: ad_001_salt_0  │──► count=25K │                  │
  100K clicks       │  Key: ad_001_salt_1  │──► count=25K │  Key: ad_001     │
  ──────────────►   │  Key: ad_001_salt_2  │──► count=25K ├──► total = 100K  │
                    │  Key: ad_001_salt_3  │──► count=25K │                  │
                    └──────────────────────┘              └──────────────────┘

  salt = hash(event_id) % num_salts    (e.g., num_salts = 4)
```

**Implementation:**

```java
// Level 1: pre-aggregate with salted key
clickStream
    .keyBy(event -> event.getAdId() + "_" + (event.hashCode() % NUM_SALTS))
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(new ClickCountAggregator())

// Level 2: merge partial results
    .keyBy(result -> result.getAdId())  // remove salt
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .reduce((a, b) -> new AggResult(a.getAdId(), a.getWindow(), a.getCount() + b.getCount()));
```

**Alternative**: detect hot keys dynamically and only apply salting for keys exceeding a threshold (e.g., >10K events/window).

### Storage: OLAP Databases

| Database | Strengths | Weaknesses | Best For |
|---|---|---|---|
| **ClickHouse** | Blazing fast analytics, column-oriented, SQL | Limited joins, single-node bottleneck | Time-series aggregation queries |
| **Apache Druid** | Sub-second OLAP, real-time ingestion | Complex ops, limited SQL | Real-time dashboards |
| **Apache Pinot** | LinkedIn-proven, upsert support, real-time | Smaller community | Real-time analytics at scale |
| **Apache Doris** | MySQL-compatible, easy to use | Newer, less battle-tested | Drop-in analytics DB |

**Recommended: ClickHouse or Apache Pinot** for this use case because they support real-time ingestion, columnar storage (fast aggregation), and time-range queries.

### Handling Traffic Spikes

```
Normal:     10K events/sec
Super Bowl: 500K events/sec (50x spike)

Strategies:
1. Auto-scaling Flink TaskManagers (Kubernetes-based)
2. Kafka partition count increase (requires planning)
3. Back-pressure handling: Flink naturally slows source when sink is overwhelmed
4. Write buffer: batch writes to OLAP DB (micro-batches of 1000 rows)
5. Pre-provisioned capacity for known events (Super Bowl is predictable)
```

---

## 8. Fault Tolerance

### Flink Checkpointing with Chandy-Lamport Algorithm

```
                    Checkpoint Barrier Flow
                    ━━━━━━━━━━━━━━━━━━━━━━

  Source ──── data ──── data ──── |CB n| ──── data ──── data ──── |CB n+1| ────►
                                   │
                                   ▼
  Operator A receives CB n:
    1. Stops processing
    2. Snapshots its state to durable storage (S3)
    3. Forwards CB n to downstream operators
    4. Resumes processing
                                   │
                                   ▼
  Operator B receives CB n from ALL upstream:
    1. Same: snapshot state, forward barrier
                                   │
                                   ▼
  Sink receives CB n from ALL upstream:
    1. Snapshot state (pending writes)
    2. Notify JobManager: checkpoint n complete
                                   │
                                   ▼
  JobManager: all operators completed checkpoint n ✓
    → checkpoint n is now the recovery point
```

**Checkpoint configuration for ad click aggregation:**

```
Checkpoint interval:     30 seconds
Checkpoint timeout:      60 seconds
Min pause between:       10 seconds
Max concurrent:          1
Storage:                 S3 (durable, shared)
Mode:                    EXACTLY_ONCE
```

### Kafka Offset Management

```
┌────────────────────────────────────────────────────┐
│  Kafka Offset Tracking (within Flink checkpoint)   │
│                                                    │
│  Checkpoint n:                                     │
│    Partition 0: offset 45,230                      │
│    Partition 1: offset 38,112                      │
│    Partition 2: offset 52,881                      │
│    ...                                             │
│    Partition 255: offset 41,003                    │
│                                                    │
│  On failure recovery:                              │
│    1. Load checkpoint n from S3                    │
│    2. Reset Kafka consumer to checkpointed offsets │
│    3. Replay events from those offsets             │
│    4. Operator state restored → no double-counting │
│       (because sink writes are idempotent)         │
└────────────────────────────────────────────────────┘
```

### Recovery Scenarios

| Failure | Recovery Action | Data Impact |
|---|---|---|
| Single TaskManager crash | Restart task from last checkpoint | Events replayed from checkpoint, idempotent writes prevent duplicates |
| JobManager crash | Standby JM takes over (HA mode), restarts from checkpoint | Same as above |
| Kafka broker failure | Kafka replication (RF=3) handles it, Flink retries | No data loss if RF ≥ 2 |
| OLAP DB failure | Flink back-pressures, events buffer in Kafka | Delayed but no loss; Kafka retention provides buffer |
| Full cluster failure | Restore from latest S3 checkpoint + replay Kafka | Recovery time depends on replay volume |

### Savepoints vs Checkpoints

| Aspect | Checkpoint | Savepoint |
|---|---|---|
| Trigger | Automatic (periodic) | Manual (operator-initiated) |
| Purpose | Fault recovery | Planned upgrades, A/B testing, migration |
| Lifecycle | Managed by Flink, auto-cleaned | Persists until manually deleted |
| Use case | Crash recovery | Deploy new version of aggregation logic |

**Interview tip**: mention savepoints when discussing how to deploy a new version of the aggregation pipeline without losing state.

---

## 9. Data Storage

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Storage Tiers                                │
├─────────────┬──────────────┬───────────────┬────────────────────────┤
│   Hot       │   Warm       │   Cold        │   Frozen               │
│   (Kafka)   │   (OLAP DB)  │   (S3/HDFS)   │   (Glacier)            │
├─────────────┼──────────────┼───────────────┼────────────────────────┤
│ Raw events  │ Aggregated   │ Raw events    │ Raw events             │
│ 7-day       │ results      │ 90-day        │ Multi-year             │
│ retention   │ 1-year       │ retention     │ retention              │
│             │ retention    │               │                        │
│ Access:     │ Access:      │ Access:       │ Access:                │
│ streaming   │ sub-second   │ batch jobs    │ compliance/legal       │
│ consumers   │ queries      │ reprocessing  │ rarely accessed        │
│             │              │               │                        │
│ Cost: $$$   │ Cost: $$     │ Cost: $       │ Cost: ¢                │
└─────────────┴──────────────┴───────────────┴────────────────────────┘
```

### Aggregated Results Table Schema

```sql
CREATE TABLE ad_click_aggregation (
    ad_id           VARCHAR(64)    NOT NULL,
    window_start    TIMESTAMP      NOT NULL,
    window_end      TIMESTAMP      NOT NULL,
    country         VARCHAR(2)     NOT NULL DEFAULT '__',  -- '__' = all countries
    device_type     VARCHAR(16)    NOT NULL DEFAULT '__',  -- '__' = all devices
    click_count     BIGINT         NOT NULL,
    unique_users    BLOB,                                  -- HyperLogLog sketch (serialized)
    updated_at      TIMESTAMP      DEFAULT NOW(),
    source          VARCHAR(16)    DEFAULT 'realtime',     -- 'realtime' or 'reconciled'

    PRIMARY KEY (ad_id, window_start, country, device_type)
);

-- ClickHouse-specific (MergeTree engine):
CREATE TABLE ad_click_aggregation (
    ad_id           String,
    window_start    DateTime,
    window_end      DateTime,
    country         LowCardinality(String),
    device_type     LowCardinality(String),
    click_count     UInt64,
    updated_at      DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMMDD(window_start)
ORDER BY (ad_id, window_start, country, device_type);
```

### Indexing Strategies

```
Primary queries:
  1. Get click count for ad_id X in time range [T1, T2]
  2. Get click count for ad_id X in time range, filtered by country
  3. Get top-N ads by click count in time range

Index design:
  Primary key / sort key:  (ad_id, window_start, country, device_type)
                            └─ covers queries 1 and 2 efficiently

  Secondary index:          (window_start, click_count DESC)
                            └─ covers query 3 (top-N)

  Partitioning:             BY DATE(window_start)
                            └─ enables partition pruning for time-range queries
                            └─ enables easy data lifecycle (drop old partitions)
```

### Query Patterns and Optimization

| Query | Optimization |
|---|---|
| Last 1 minute for specific ad | Point lookup on primary key — O(1) |
| Last 1 hour for specific ad | Range scan on primary key — 60 rows |
| Last 24 hours, all ads, by country | Partition pruning + columnar scan |
| Top 100 ads last hour | Materialized view or pre-computed by Flink |

For the **Top-N** query, maintain a separate Flink pipeline:

```
clickStream
    .keyBy(event -> event.getAdId())
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .aggregate(new ClickCountAggregator())
    .windowAll(TumblingEventTimeWindows.of(Time.hours(1)))
    .process(new TopNFunction(100))
    .addSink(new TopAdsSink());
```

---

## 10. Trade-offs & Interview Tips

### Key Architecture Decisions

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Architecture | Lambda (batch + stream) | Kappa (stream only + reconciliation) | **Kappa** — simpler, modern |
| Stream processor | Flink | Spark Streaming | **Flink** — true streaming, better latency |
| Exactly-once sink | Two-phase commit | Idempotent upserts | **Idempotent upserts** — simpler, fewer failure modes |
| Dedup approach | Exact (event_id set) | Approximate (Bloom filter) | **Exact** — billing requires accuracy |
| OLAP database | ClickHouse | Druid / Pinot | **ClickHouse** for simplicity; **Pinot** for LinkedIn-scale |
| Hot key handling | Static salting | Dynamic detection + salting | **Static** first, then dynamic if needed |

### Accuracy vs Latency Trade-off

```
              Accuracy
                ▲
          100%  │           ● Batch reconciliation (hours)
                │
           99%  │       ● Real-time + exactly-once (seconds)
                │
           95%  │   ● At-least-once + dedup (milliseconds)
                │
           90%  │ ● At-most-once (milliseconds, lossy)
                │
                └──────────────────────────────────────► Latency
                  ms        sec        min        hours
```

For ad click aggregation: target the **99%+ accuracy in real-time** zone, with batch reconciliation to reach **100%**.

### When to Use Approximate Algorithms

| Algorithm | Use When | Don't Use When |
|---|---|---|
| **HyperLogLog** | "How many unique users clicked?" (distinct count) | Exact count required for billing |
| **Count-Min Sketch** | "Which ads are trending?" (heavy hitters, top-N) | Exact ranking required |
| **Bloom Filter** | "Have I seen this event before?" (dedup, membership) | False positives are costly |
| **t-digest** | "What is p99 click latency?" (percentiles) | Exact percentiles required |

### Common Follow-Up Questions

| Question | Key Points to Cover |
|---|---|
| "How do you handle click fraud?" | Anomaly detection layer: sudden spike in clicks from same IP, bot-like patterns, geographic impossibilities. Can be a separate Flink job consuming from the same Kafka topic. |
| "What if an advertiser disputes the click count?" | Raw data in S3 is the audit trail. Reconciliation results prove accuracy. Provide self-service re-aggregation tool. |
| "How do you deploy a new version of the aggregation logic?" | Flink savepoints: take savepoint → stop old job → deploy new job from savepoint → verify → cut over. |
| "What about GDPR / data deletion?" | PII (user_id, IP) in raw data must be deletable. Aggregated data is anonymous (counts only) → no GDPR concern. |
| "How do you test this system?" | Shadow pipeline: run new logic in parallel consuming same Kafka topic, compare outputs. Chaos testing: kill Flink tasks, verify recovery. |
| "What if Kafka goes down?" | Kafka is replicated (RF=3). If entire cluster is down, Click API buffers locally (disk queue) and retries. |
| "Can you support real-time CTR (click-through rate)?" | Need impression events too. Join click stream with impression stream on ad_id, compute CTR = clicks/impressions. |

### Quick Reference Cheat Sheet

```
┌────────────────────────────────────────────────────────────────────┐
│              Ad Click Event Aggregation — Cheat Sheet              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SCALE:  1B clicks/day → 10K QPS avg → 50K QPS peak              │
│  DATA:   500 GB/day raw → ~10 GB/month aggregated                │
│                                                                    │
│  ARCHITECTURE:  Kappa + reconciliation batch job                  │
│                                                                    │
│  PIPELINE:                                                        │
│    Click API → Kafka → Flink → OLAP DB → Query Service            │
│                  └──► S3 (raw archive) ──► Spark reconciliation    │
│                                                                    │
│  EXACTLY-ONCE:                                                    │
│    Kafka offsets in Flink state + checkpointing + idempotent sink │
│                                                                    │
│  WINDOWING:  Tumbling 1-min (primary), roll up to 5m/1h/1d       │
│  WATERMARK:  10 sec out-of-orderness + 15 min allowed lateness   │
│  LATE DATA:  Side output → dead-letter queue → reconciliation     │
│                                                                    │
│  HOT KEYS:  Salting technique (2-level aggregation)               │
│  DEDUP:     Event ID-based with 15-min TTL window                │
│                                                                    │
│  STORAGE:                                                         │
│    Hot:    Kafka (7 days)                                         │
│    Warm:   ClickHouse/Pinot (aggregated, 1 year)                 │
│    Cold:   S3 (raw, 90 days)                                     │
│    Frozen: Glacier (raw, years, compliance)                       │
│                                                                    │
│  FAULT TOLERANCE:                                                 │
│    Flink checkpoints (Chandy-Lamport, 30s interval, S3 backend)  │
│    Kafka replication (RF=3)                                       │
│    Idempotent upserts to OLAP DB                                 │
│                                                                    │
│  RECONCILIATION:  Spark batch job every 4 hours                   │
│    Re-aggregate from S3 raw data, compare with OLAP, auto-fix    │
│                                                                    │
│  KEY TRADE-OFFS:                                                  │
│    Lambda vs Kappa → Kappa (simpler)                              │
│    Exact vs approximate dedup → Exact (billing accuracy)          │
│    Pre-compute all dims vs on-demand → Popular combos only       │
│                                                                    │
│  APPROXIMATE ALGORITHMS:                                          │
│    HyperLogLog (unique users), Count-Min Sketch (top-N),          │
│    Bloom filter (membership test), t-digest (percentiles)         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Interview Delivery Tips

1. **Start with requirements** (2-3 min): clarify functional vs non-functional, nail down the scale. The "1B clicks/day" number drives everything.

2. **Data model first** (2 min): show the click event schema and the aggregation output table. This grounds the discussion.

3. **High-level architecture** (3-4 min): draw the pipeline (API → Kafka → Flink → OLAP → Query). Mention both real-time and batch paths.

4. **Deep dive on streaming** (5-8 min): windowing, watermarks, late data. This is where you differentiate yourself.

5. **Exactly-once** (3-4 min): interviewers love this. Show you understand end-to-end (source → processing → sink), not just Flink's internal guarantee.

6. **Scaling** (3-4 min): hot key problem + salting is a strong talking point.

7. **Reconciliation** (2 min): shows maturity — you know real-time isn't perfect and you have a safety net.

8. **Close with trade-offs** (1-2 min): Lambda vs Kappa, exact vs approximate — show you think critically, not dogmatically.

---

## Appendix: End-to-End Flow Walkthrough

```
User clicks ad on mobile phone
        │
        ▼
[1] Click pixel fires HTTP request to Click API
    POST /v1/click {ad_id, timestamp, user_id, ip, user_agent}
        │
        ▼
[2] Click API server:
    - Validates request (auth, rate limit)
    - Enriches: geo-lookup from IP → country
    - Parses user_agent → device_type, os, browser
    - Generates event_id (UUID)
    - Publishes to Kafka topic "raw_clicks" (partition by ad_id)
    - Returns 200 OK to client
        │
        ▼
[3] Kafka "raw_clicks" topic:
    - 256 partitions, RF=3
    - 7-day retention
    - Event lands in partition = hash(ad_id) % 256
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
[4a] Flink Streaming Job               [4b] Archival Consumer
    - Source: Kafka consumer                - Writes raw events to S3
    - Dedup: check event_id                 - Partitioned by date/hour
    - KeyBy: ad_id                          - Parquet format
    - Window: tumbling 1-min                - Used for reconciliation
    - Aggregate: count clicks
    - Watermark: 10s out-of-order
    - Allowed lateness: 15 min
    - Sink: upsert to ClickHouse
        │
        ▼
[5] ClickHouse (OLAP DB):
    - Stores aggregated results
    - Partitioned by date
    - Sorted by (ad_id, window_start)
    - Serves sub-second queries
        │
        ▼
[6] Query Service:
    - REST API for dashboard
    - Caches hot queries (Redis, 10s TTL)
    - Returns click counts, CTR, trends
        │
        ▼
[7] Advertiser Dashboard:
    - Real-time charts
    - Click count updated every ~1 minute
    - Filterable by country, device, time range
        │
        │           Every 4 hours:
        │           ┌──────────────────────────────────┐
        │           │ [8] Reconciliation Job (Spark)    │
        │           │   - Reads raw data from S3        │
        │           │   - Re-aggregates from scratch    │
        │           │   - Compares with ClickHouse      │
        │           │   - Fixes discrepancies           │
        │           │   - Alerts if delta > 5%          │
        │           └──────────────────────────────────┘
```
