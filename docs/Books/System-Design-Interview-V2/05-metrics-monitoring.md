# Chapter 5: Metrics Monitoring and Alerting System

## 1. Problem Statement & Requirements

### What Are We Designing?

A **scalable metrics monitoring and alerting system** — the backbone of any production infrastructure's observability stack. Think Datadog, Prometheus + Grafana, Amazon CloudWatch, or New Relic. The system collects operational and business metrics from a vast fleet of servers and applications, stores them as time-series data, enables querying and visualization, and fires alerts when things go wrong.

### The Three Pillars of Observability

Monitoring is one pillar. Know where it fits:

| Pillar | What It Captures | Examples |
|---|---|---|
| **Metrics** | Numeric measurements over time | CPU at 85%, request latency p99 = 240ms |
| **Logs** | Discrete event records | "User 42 failed login at 14:03:07" |
| **Traces** | Request flow across services | Order → Payment → Inventory → Shipping |

This chapter focuses on **metrics**. In an interview, clarify the scope — the interviewer may want just metrics, or might fold in logs/traces.

### Functional Requirements

1. **Collect metrics** from servers, containers, databases, applications, and network devices
2. **Store time-series data** efficiently with configurable retention
3. **Query** metrics with flexible aggregations (sum, avg, rate, percentiles)
4. **Visualize** metrics on dashboards (line charts, heatmaps, gauges)
5. **Alert** when metrics breach defined thresholds, with configurable notification channels
6. **Support tagging/labeling** for multi-dimensional slicing (by host, region, service, endpoint)

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| Scale | 100M+ DAU infrastructure, 1M+ servers |
| Write throughput | ~10M data points/sec |
| Query latency | < 1s for dashboard queries, < 200ms for cached |
| Alert latency | < 30 seconds from metric anomaly to notification |
| Availability | 99.99% for alerting path |
| Durability | No silent data loss (some staleness acceptable) |
| Retention | Raw: 7 days, 1-min rollups: 30 days, 1-hour rollups: 1 year |

### Types of Metrics

| Category | Examples | Typical Resolution |
|---|---|---|
| **Infrastructure** | CPU, memory, disk I/O, network bytes | Every 10s |
| **Application** | Request count, error rate, response latency | Every 10s |
| **Runtime** | GC pauses, thread count, heap size | Every 30s |
| **Business** | Orders/min, revenue, signup rate | Every 1 min |
| **Database** | Query latency, connection pool, replication lag | Every 10s |
| **Custom** | Cache hit ratio, queue depth, feature flag usage | Varies |

### Scale Estimation (Back-of-Envelope)

```
Servers:            1,000,000
Metrics per server: 100 (CPU, mem, disk, network, app-level, etc.)
Collection interval: every 10 seconds

Write throughput:
  1M × 100 / 10s = 10,000,000 data points/sec = 10M writes/sec

Data point size:     ~16 bytes (8-byte timestamp + 8-byte float value)
                     + ~100 bytes metadata (metric name, tags) → amortized ~30 bytes/point

Raw data per day:
  10M × 30 bytes × 86,400s = ~26 TB/day (before compression)
  With compression (10:1 typical): ~2.6 TB/day

Storage (with retention policy):
  Raw 7 days:          ~18 TB
  1-min rollups 30d:   ~3 TB
  1-hour rollups 1yr:  ~1 TB
  Total:               ~22 TB (compressed)

Read QPS:
  Dashboard queries:  ~50,000 QPS (bursty — engineers check dashboards during incidents)
  Alert evaluations:  ~500,000 evaluations/min (~8,300/sec)
```

---

## 2. High-Level Design

### Core Architecture

Five key subsystems connected end-to-end:

```
                          ┌──────────────────────────────────────────────────────┐
                          │                 Metrics Platform                     │
                          │                                                      │
┌─────────────┐    ┌──────┴──────┐    ┌───────────┐    ┌───────────────┐        │
│ Metrics      │    │ Collection  │    │ Ingestion │    │  Time-Series  │        │
│ Sources      │───▶│ Agents      │───▶│ Pipeline  │───▶│  Database     │        │
│              │    │             │    │ (Kafka)   │    │  (TSDB)       │        │
│ • Servers    │    │ • Pull      │    └───────────┘    └──────┬────────┘        │
│ • Containers │    │ • Push      │                           │                  │
│ • Apps       │    │ • SDK       │                    ┌──────┴────────┐         │
│ • Databases  │    └─────────────┘                    │ Query Service │         │
│ • Network    │                                       └──────┬────────┘         │
└─────────────┘                                        ┌──────┴────────┐         │
                                                       │               │         │
                                                 ┌─────┴─────┐  ┌─────┴──────┐  │
                                                 │ Dashboard  │  │ Alerting   │  │
                                                 │ & Viz      │  │ Engine     │  │
                                                 │ (Grafana)  │  │            │  │
                                                 └────────────┘  └─────┬──────┘  │
                                                                       │         │
                                                                 ┌─────┴──────┐  │
                                                                 │Notification│  │
                                                                 │ Service    │  │
                                                                 │ Slack/Page │  │
                                                                 └────────────┘  │
                                                                                 │
                          └──────────────────────────────────────────────────────┘
```

### Detailed Data Flow

```
┌─────────┐   ┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌────────┐
│ Metrics │   │Collection│   │  Kafka   │   │   Stream     │   │  TSDB  │
│ Sources │──▶│ Agent    │──▶│ (Buffer) │──▶│  Processor   │──▶│        │
└─────────┘   └─────────┘   └──────────┘   │ (Aggregate,  │   └───┬────┘
                                            │  Validate,   │       │
                                            │  Downsample) │       │
                                            └──────────────┘   ┌───┴────┐
                                                               │ Query  │
                                                               │Service │
                                                               └───┬────┘
                                                            ┌──────┴──────┐
                                                       ┌────┴────┐  ┌─────┴─────┐
                                                       │Dashboard│  │ Alert     │
                                                       │  UI     │  │ Manager   │
                                                       └─────────┘  └─────┬─────┘
                                                                          │
                                                                    ┌─────┴─────┐
                                                                    │Notify:    │
                                                                    │Slack/PD/  │
                                                                    │Email/SMS  │
                                                                    └───────────┘
```

### Data Model

A metric data point has four components:

| Component | Description | Example |
|---|---|---|
| **Metric name** | What is being measured | `http.request_count` |
| **Tags / Labels** | Key-value dimensions for filtering | `host=web-01, region=us-east, endpoint=/api/users` |
| **Timestamp** | Unix epoch (seconds or ms) | `1640000000` |
| **Value** | Numeric measurement (int64 or float64) | `0.85` |

Wire format (line protocol style):

```
cpu.usage host=server1 region=us-east env=prod 1640000000 0.85
http.request_count host=web-01 endpoint=/api/users status=200 1640000000 1523
jvm.heap_used host=app-03 service=payment 1640000000 734003200
```

A **time series** is a unique combination of metric name + tag set. For 1M servers × 100 metrics × ~5 unique tag combinations, we may have **~500M active time series** (cardinality).

### Push vs Pull Collection Models

| Aspect | Pull (Prometheus) | Push (StatsD / Datadog Agent) |
|---|---|---|
| Direction | Scraper fetches from `/metrics` endpoints | Agent pushes to collector gateway |
| Service discovery | Required (Consul, K8s API, DNS) | Not required — clients know the collector |
| Firewall friendliness | Scraper must reach targets | Works behind NATs/firewalls |
| Health detection | No scrape = target down (free health check) | Separate heartbeat needed |
| Scaling scrapers | Shard targets across scrapers | Horizontal collector fleet |
| Debugging | Curl the `/metrics` endpoint directly | Check agent logs |
| Short-lived jobs | Misses jobs shorter than scrape interval | Push on exit (push gateway) |
| Backpressure | Scraper controls rate naturally | Needs rate limiting |
| Real-world users | Prometheus, Thanos | Datadog, CloudWatch, StatsD, Telegraf |

**Interview tip**: Most production systems use a **hybrid**. Prometheus pulls from long-lived services, and short-lived jobs push to a Pushgateway. Datadog agents pull from local system sources but push to the backend.

---

## 3. Data Collection — Deep Dive

### Pull Model (Prometheus Style)

```
                     ┌──────────────────────────────────────┐
                     │          Prometheus Scraper           │
                     │                                      │
                     │  ┌──────────────┐                    │
                     │  │   Scrape     │  every 10-15s      │
                     │  │   Manager    │◀── scrape_interval  │
                     │  └──────┬───────┘                    │
                     │         │  HTTP GET /metrics          │
                     └─────────┼────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌──────────┐     ┌──────────┐     ┌──────────┐
       │ Service A │     │ Service B │     │ Service C │
       │ :8080     │     │ :8080     │     │ :8080     │
       │ /metrics  │     │ /metrics  │     │ /metrics  │
       └──────────┘     └──────────┘     └──────────┘

Service Discovery (how the scraper finds targets):
  • Kubernetes API (pod annotations: prometheus.io/scrape=true)
  • Consul / etcd service registry
  • DNS SRV records
  • Static config files (for legacy infra)
  • Cloud provider APIs (EC2, GCE instance lists)
```

**How /metrics works**: The application exposes an HTTP endpoint that returns all current metric values in a text format. Client libraries (Go, Java, Python) instrument code and maintain in-memory counters/gauges/histograms. The endpoint serializes them on each scrape.

Example `/metrics` response:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/users",status="200"} 14523
http_requests_total{method="POST",endpoint="/api/orders",status="201"} 892

# HELP http_request_duration_seconds Request latency histogram
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01"} 8923
http_request_duration_seconds_bucket{le="0.05"} 12340
http_request_duration_seconds_bucket{le="0.1"} 13890
http_request_duration_seconds_bucket{le="+Inf"} 14523
http_request_duration_seconds_sum 482.3
http_request_duration_seconds_count 14523
```

**Scaling the pull model**: A single Prometheus server can scrape ~1,000 targets at 15s intervals. For 1M servers, we need ~1,000 scraper instances. Targets are sharded across scrapers using consistent hashing on target labels.

### Push Model (Agent-Based)

```
┌─────────────────────┐
│   Application Host  │
│                     │
│  ┌───────────┐      │     ┌─────────────────┐     ┌───────────┐
│  │ App Code  │──────┼────▶│  Collection     │────▶│  Kafka    │
│  └───────────┘      │     │  Gateway /      │     │  Cluster  │
│                     │     │  Aggregator     │     └───────────┘
│  ┌───────────┐      │     └─────────────────┘
│  │ StatsD /  │──────┤          ▲
│  │ Agent     │      │          │
│  └───────────┘      │     ┌────┴──────────────┐
│                     │     │  Other Hosts       │
│  ┌───────────┐      │     │  pushing metrics   │
│  │ System    │──────┘     └───────────────────┘
│  │ Collector │
│  │ (CPU/mem) │
│  └───────────┘
└─────────────────────┘
```

**Agent patterns in Kubernetes**:

| Pattern | Description | Use Case |
|---|---|---|
| **Sidecar** | Agent container in same pod as app | Per-pod app metrics |
| **DaemonSet** | One agent per node | Host-level metrics (CPU, disk) |
| **Deployment** | Centralized collector fleet | Aggregation, gateway |

### Collection Agent Responsibilities

The collection agent (whether pull or push) does more than just relay data:

1. **Buffering** — hold data locally if the backend is temporarily unreachable (write-ahead log)
2. **Local aggregation** — pre-aggregate high-cardinality metrics (e.g., per-request latencies → histogram buckets)
3. **Enrichment** — add metadata tags (hostname, AZ, cluster, service name)
4. **Filtering** — drop unwanted metrics before shipping (reduce bandwidth)
5. **Format conversion** — normalize to a common wire format (e.g., OpenTelemetry protocol)

### Kafka as Ingestion Buffer

Why insert Kafka between collectors and the TSDB?

```
Collectors ──▶ Kafka Topic: "metrics.raw" ──▶ Stream Processors ──▶ TSDB

Kafka topic partitioning strategy:
  Partition key = hash(metric_name + subset_of_tags)
  This ensures same time series lands on same partition → ordered writes
```

| Benefit | Explanation |
|---|---|
| **Decoupling** | Producers and consumers scale independently |
| **Burst absorption** | Handles traffic spikes (deploy storms, incident cascades) |
| **Replayability** | Re-process data if TSDB has bugs or schema changes |
| **Fan-out** | Multiple consumers: TSDB writer, real-time alerting, anomaly detection |
| **Durability** | Kafka persists data; no loss if TSDB is temporarily down |

**Kafka sizing for 10M points/sec**:

```
Data point avg size:  ~200 bytes (with tags, serialization overhead)
Throughput:           10M × 200B = 2 GB/s
With replication (3): 6 GB/s disk write
Partitions:           ~500 (20K msgs/s per partition is comfortable)
Brokers:              ~30–50 (depending on hardware)
Retention:            2–4 hours (short buffer, not long-term storage)
```

### Metrics Types and Client Libraries

Four standard metric types (Prometheus convention, widely adopted):

| Type | Description | Example | Operations |
|---|---|---|---|
| **Counter** | Monotonically increasing value | `http_requests_total` | rate(), increase() |
| **Gauge** | Value that goes up and down | `cpu_usage`, `queue_depth` | current value, min, max |
| **Histogram** | Observations bucketed by range | `request_duration_seconds` | quantile, avg, count |
| **Summary** | Pre-computed quantiles client-side | `request_duration_seconds` | quantile (φ=0.99) |

**Counter vs Gauge** — a common interview question:

- Counter: "How many requests have we served?" → always increases, use `rate()` to get requests/sec
- Gauge: "How many requests are in-flight right now?" → snapshot value, can go up or down

---

## 4. Time-Series Database — Deep Dive

### Why Not a Regular Database?

| Database Type | Why It Falls Short |
|---|---|
| **RDBMS (MySQL/Postgres)** | Row-oriented storage, B-tree indexes penalize append-heavy workloads. JOINs unnecessary. Poor compression for repetitive time-series patterns. |
| **General NoSQL (Cassandra)** | Better write throughput, but no native time-range optimizations, no built-in downsampling, no compression codecs tuned for timestamps/floats. |
| **Key-Value (Redis)** | In-memory only at this scale is cost-prohibitive (~22TB). No range queries. |

### What Makes a TSDB Special

```
Optimized for:
  ✓ Append-only writes (no random updates)
  ✓ Time-range scans ("give me CPU for last 6 hours")
  ✓ High write throughput with compression
  ✓ Automatic downsampling and retention
  ✓ Multi-dimensional label queries

NOT optimized for:
  ✗ Random point reads
  ✗ Full-text search
  ✗ Transactions / ACID
  ✗ Joins across entities
```

### TSDB Comparison

| Feature | InfluxDB | Prometheus TSDB | TimescaleDB | OpenTSDB | VictoriaMetrics |
|---|---|---|---|---|---|
| Storage engine | Custom (TSM) | Custom (blocks) | PostgreSQL ext | HBase | Custom (merge tree) |
| Query language | InfluxQL / Flux | PromQL | SQL | OpenTSDB API | MetricsQL |
| Clustering | Enterprise only | No (use Thanos) | PostgreSQL HA | Via HBase | Built-in |
| Compression | Gorilla-based | Gorilla-based | PostgreSQL + custom | Delta encoding | Gorilla-based |
| Best for | General metrics | K8s/cloud-native | SQL-familiar teams | Hadoop ecosystem | High cardinality |
| Write perf | ~1M pts/s/node | ~500K pts/s/node | ~200K pts/s/node | Depends on HBase | ~2M pts/s/node |

### Write Path — Optimization Techniques

```
Data Point Arrives
       │
       ▼
┌──────────────┐
│ Write Buffer │  (in-memory, append-only)
│ (WAL + Memtable)
└──────┬───────┘
       │  flush when buffer full or time-based
       ▼
┌──────────────┐
│  Immutable   │  (sorted by time-series ID + timestamp)
│  Block/SST   │
│  on Disk     │
└──────┬───────┘
       │  background compaction
       ▼
┌──────────────┐
│  Compacted   │  (merged, compressed, indexed)
│  Blocks      │
└──────────────┘
```

**Key write optimizations**:

1. **LSM-tree based storage**: Append-only writes to a WAL, then memtable, then flush to immutable sorted files. No random I/O. Perfect for time-series which are inherently append-only.

2. **Write batching**: Buffer thousands of points in memory before flushing. Amortizes disk I/O overhead. Typical batch: 1,000–10,000 points or every 2 seconds.

3. **Compression — Gorilla paper (Facebook, 2015)**:

   Timestamps typically arrive at regular intervals. Values change slowly. Exploit both:

   ```
   Timestamp compression (delta-of-delta):
   
   Raw timestamps:    1640000000, 1640000010, 1640000020, 1640000030
   Deltas:            —,          10,          10,          10
   Delta-of-deltas:   —,          —,           0,           0
   
   Store first timestamp fully, then delta-of-deltas using variable-bit encoding:
     '0'        → delta-of-delta is 0      (1 bit!)
     '10' + 7b  → delta-of-delta fits in [-63, 64]
     '110' + 9b → fits in [-255, 256]
     ...
   
   Result: regular 10s intervals compress to 1 bit per timestamp!
   ```

   ```
   Value compression (XOR encoding):
   
   Raw values:   0.850, 0.851, 0.853, 0.849
   XOR with previous (IEEE 754 bits):
     First value: stored fully (64 bits)
     XOR:         typically only a few bits differ
     
   Encode: leading zeros count + meaningful bits + trailing zeros count
   
   Result: ~1-2 bytes per value for slowly-changing floats
   ```

   **Combined compression ratio**: 12:1 to 16:1 typical (vs raw 16 bytes/point → ~1.2 bytes/point).

4. **Columnar storage**: Store all timestamps together, all values together. Compression works far better on homogeneous data. Also enables vectorized query execution.

### Read Path — Optimization Techniques

```
Dashboard Query: "avg CPU for us-east servers, last 6 hours, 1-min resolution"
       │
       ▼
┌──────────────┐
│  Query Plan  │  Parse → identify time range, tags, aggregation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Inverted     │  tag=region:us-east → list of time-series IDs
│ Index Lookup │  Intersect with tag=metric:cpu.usage
└──────┬───────┘
       │  yields: [ts_id_001, ts_id_002, ..., ts_id_50000]
       ▼
┌──────────────┐
│ Time-Range   │  Only read blocks covering [now-6h, now]
│ Block Scan   │  Skip older blocks entirely
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Downsample   │  If 1-min rollup exists → read rollup (100x less data)
│ / Aggregate  │  Otherwise → read raw, aggregate on-the-fly
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Result     │  360 data points (6h × 60min, 1 per minute)
└──────────────┘
```

**Key read optimizations**:

1. **Time-range partitioning**: Data is organized in time-based blocks (e.g., 2-hour blocks in Prometheus TSDB). Queries specify a time range, so the engine skips blocks outside that range entirely.

2. **Inverted index for labels**: Maps each label value to the set of time-series IDs containing it. Querying `region=us-east AND service=payment` becomes a set intersection.

   ```
   Inverted Index:
   region=us-east    → {ts_001, ts_002, ts_003, ..., ts_50000}
   region=us-west    → {ts_50001, ts_50002, ...}
   service=payment   → {ts_002, ts_045, ts_50002, ...}
   
   region=us-east AND service=payment → intersect → {ts_002, ts_045}
   ```

3. **Pre-aggregation / Rollups**: Pre-compute downsampled views at write time. Instead of reading 360,000 raw points for a 1-hour graph, read 360 pre-computed 1-min rollup points.

4. **Query caching**: Cache recent dashboard queries. Same team refreshing the same dashboard → cache hit. Use time-bucketed cache keys so TTLs align with data freshness.

### Data Retention & Downsampling

```
Time ──────────────────────────────────────────────────────────▶

│◄── Raw (10s resolution) ──▶│◄── 1-min rollups ──▶│◄── 1-hr rollups ──▶│
│         7 days              │      30 days         │      1 year         │
│                             │                      │                     │

Downsampling job (runs periodically):
  - Read raw data older than 7 days
  - Compute per-minute: avg, min, max, count, sum
  - Write rollup to separate storage tier
  - Delete raw data beyond retention

Storage savings:
  Raw 10s:     8,640 points/day/series
  1-min:       1,440 points/day/series  (6x reduction)
  1-hour:         24 points/day/series  (360x reduction)
```

**Downsampling strategies**:

| Strategy | When to Use |
|---|---|
| **Average** | General purpose (CPU, memory utilization) |
| **Max** | Latency (you care about worst case) |
| **Min** | Available capacity metrics |
| **Sum** | Counters (request count, error count) |
| **Count** | Number of observations |
| **Percentile preservation** | Store p50/p95/p99 in rollup (can't re-derive from avg!) |

**Important**: You cannot compute accurate percentiles from pre-aggregated averages. If percentile queries are needed on historical data, store histogram bucket counts in the rollup, or store the actual percentile values.

### Hot vs Cold Data Tiering

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   HOT TIER    │     │   WARM TIER   │     │   COLD TIER   │
│   (SSD)       │     │   (HDD)       │     │   (Object     │
│               │     │               │     │    Storage/S3) │
│ Last 24 hours │     │ 1–30 days     │     │ 30+ days      │
│ Raw resolution│     │ 1-min rollups │     │ 1-hr rollups  │
│ Fast queries  │     │ Moderate      │     │ Slow, cheap   │
└───────────────┘     └───────────────┘     └───────────────┘

Cost per GB/month:
  SSD: ~$0.10        HDD: ~$0.03        S3: ~$0.023
```

---

## 5. Query & Visualization

### Query Language

Most TSDBs provide a specialized query language. PromQL (Prometheus Query Language) has become the de facto standard:

| Query | Meaning |
|---|---|
| `cpu_usage{region="us-east"}` | Current CPU for all us-east servers |
| `rate(http_requests_total[5m])` | Per-second request rate over 5-min window |
| `sum by (service)(rate(http_requests_total[5m]))` | Request rate grouped by service |
| `histogram_quantile(0.99, rate(request_duration_bucket[5m]))` | p99 latency |
| `topk(10, sum by (host)(rate(errors_total[5m])))` | Top 10 hosts by error rate |
| `avg_over_time(memory_usage[1h])` | Average memory over last hour |
| `predict_linear(disk_usage[6h], 3600*24)` | Predict disk usage in 24 hours |

### Query Service Architecture

```
┌──────────┐
│ Grafana  │
│ Dashboard│
└────┬─────┘
     │  HTTP API: GET /api/v1/query_range?query=...&start=...&end=...&step=60
     ▼
┌──────────────────┐
│   Query Service  │
│                  │
│  ┌────────────┐  │
│  │Query Parser│  │  Parse PromQL → AST
│  └─────┬──────┘  │
│        ▼         │
│  ┌────────────┐  │
│  │ Query      │  │  Check cache for identical recent query
│  │ Cache      │  │
│  └─────┬──────┘  │
│        ▼         │
│  ┌────────────┐  │
│  │ Query      │  │  Determine which TSDB shards hold the data
│  │ Planner    │  │  Fan-out to relevant shards
│  └─────┬──────┘  │
│        ▼         │
│  ┌────────────┐  │
│  │ Fan-out &  │  │  Parallel queries to TSDB nodes
│  │ Merge      │  │  Merge partial results
│  └─────┬──────┘  │
│        ▼         │
│  ┌────────────┐  │
│  │ Post-      │  │  Final aggregation, sorting, limiting
│  │ Process    │  │
│  └────────────┘  │
└──────────────────┘
```

### Dashboard System

A dashboard displays multiple panels, each running a query:

```
┌────────────────────────────────────────────────────────────┐
│  Production Overview Dashboard                    [▼ 6h]  │
├────────────────────────┬───────────────────────────────────┤
│  Request Rate          │  Error Rate                       │
│  ┌────────────────┐    │  ┌────────────────┐               │
│  │  ╱╲    ╱╲      │    │  │       ╱╲                       │
│  │ ╱  ╲╱╱  ╲──── │    │  │──────╱  ╲───── │               │
│  │╱          ╲    │    │  │                 │               │
│  └────────────────┘    │  └────────────────┘               │
├────────────────────────┼───────────────────────────────────┤
│  p99 Latency           │  CPU Usage by Host                │
│  ┌────────────────┐    │  ┌────────────────┐               │
│  │     ╱╲         │    │  │ ▓▓▓▓░░░ web-01 │               │
│  │────╱  ╲──────  │    │  │ ▓▓▓▓▓░░ web-02 │               │
│  │                │    │  │ ▓▓░░░░░ web-03 │               │
│  └────────────────┘    │  └────────────────┘               │
├────────────────────────┴───────────────────────────────────┤
│  Disk Usage Prediction (24h forecast)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │──────────╱                                          │   │
│  │         ╱  ·····predicted······  ── 80% threshold   │   │
│  │────────╱                                            │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Dashboard best practices**:

- **Template variables**: Select region, service, host from dropdowns — one dashboard template serves many teams
- **Auto-refresh**: 30s–60s refresh interval for operational dashboards
- **Annotations**: Overlay deployment markers, incident start/end on graphs
- **Drill-down links**: Click a graph to zoom into a narrower time range or specific host

### Query Caching Strategy

```
Cache key = hash(query_string + time_range_bucket + step)

Time bucketing:
  Round start/end to nearest step boundary.
  Example: step=60s, query at 14:03:22 → bucket to 14:03:00
  This maximizes cache hits across slightly offset requests.

Cache layers:
  L1: In-process LRU (query service instances)     — μs latency
  L2: Distributed cache (Redis/Memcached)            — <1ms latency
  L3: Pre-computed materialized views (rollup tables) — ms latency

Cache invalidation:
  - TTL based on data age: recent data TTL = step interval (60s)
  - Older data (>1h) can have longer TTL (5 min)
  - Never cache incomplete (partial) time ranges at the trailing edge
```

---

## 6. Alerting System — Deep Dive

### Alert Rule Definition

An alert rule has these components:

```yaml
alert: HighErrorRate
expr: sum(rate(http_errors_total{service="payment"}[5m])) / 
      sum(rate(http_requests_total{service="payment"}[5m])) > 0.05
for: 2m                     # must be true for 2 minutes (avoid flapping)
severity: critical
labels:
  team: payments
  environment: production
annotations:
  summary: "Payment service error rate > 5%"
  runbook: "https://wiki.internal/runbooks/payment-errors"
  dashboard: "https://grafana.internal/d/payment-overview"
```

| Field | Purpose |
|---|---|
| `expr` | The PromQL query that defines the condition |
| `for` | Pending duration before firing (debounce) |
| `severity` | critical / warning / info — drives routing |
| `labels` | Metadata for routing and grouping |
| `annotations` | Human-readable context, runbook links |

### Alert Evaluation Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Query   │───▶│ Evaluate │───▶│  Dedup   │───▶│  Route   │───▶│  Notify  │
│  TSDB    │    │ Rules    │    │ & Group  │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
  Execute          Compare        Suppress       Match to        Deliver
  PromQL          against        duplicate      notification    via channel
  query          threshold       alerts,        policy &
                                group by        escalation
                                labels          path
```

**Step-by-step**:

1. **Query**: Alert evaluator periodically (every 15–60s) runs each alert rule's expression against the TSDB
2. **Evaluate**: Compare result to threshold. If breached, transition alert state
3. **Deduplicate & Group**: Multiple related alerts (e.g., 50 hosts all have high CPU because of the same deploy) are grouped into a single notification
4. **Route**: Based on labels (team, severity), route to the correct notification channel
5. **Notify**: Send via configured channel(s) with context (value, dashboard link, runbook)

### Alert States

```
              condition met               for duration elapsed
    ┌────┐  ────────────▶  ┌─────────┐  ────────────────▶  ┌─────────┐
    │ OK │                 │ PENDING  │                     │ FIRING  │
    └────┘  ◀────────────  └─────────┘                     └────┬────┘
              condition                                         │
              no longer met                                     │
                                                                │
                            condition no longer met              │
                   ┌──────────────────────────────────────┘
                   ▼
              ┌──────────┐
              │ RESOLVED │──▶ send "resolved" notification
              └──────────┘
                   │
                   ▼
               ┌────┐
               │ OK │
               └────┘
```

- **OK**: Metric is within normal range
- **PENDING**: Condition breached, but `for` duration not yet elapsed (prevents flapping on transient spikes)
- **FIRING**: Condition sustained past `for` duration — notifications sent
- **RESOLVED**: Was firing, now back to normal — send "resolved" notification so on-call knows it's cleared

### Notification Channels

| Channel | Use Case | Latency |
|---|---|---|
| **PagerDuty / Opsgenie** | Critical, wake-up-at-3am alerts | < 30s |
| **Slack / Teams** | Warning alerts, team visibility | < 10s |
| **Email** | Non-urgent, daily digests, reports | < 1 min |
| **SMS** | Critical backup if PagerDuty fails | < 30s |
| **Webhook** | Trigger automated remediation (auto-scale, restart) | < 5s |

### Alert Fatigue Mitigation

Alert fatigue is the #1 enemy of effective monitoring. When on-call gets 200 alerts/day, they start ignoring all of them.

| Technique | Description |
|---|---|
| **Grouping** | Combine related alerts: "50 hosts high CPU" → 1 grouped alert |
| **Silencing** | Suppress alerts during planned maintenance windows |
| **Inhibition** | If datacenter is down, suppress all individual host alerts in that DC |
| **Rate limiting** | Max 1 notification per alert per 5 minutes (avoid re-fire storms) |
| **Severity tuning** | Regular review: if an alert never leads to action, downgrade or delete it |
| **Alert on symptoms, not causes** | Alert on "user-facing error rate > 1%" not "one pod restarted" |
| **Dead man's switch** | Alert on *absence* of data: if no heartbeat metric for 5 min → fire |

### Dead Man's Switch

Monitors that the monitoring system itself is working:

```
Rule: "If metric monitoring.heartbeat has no data for 5 minutes, fire critical alert"

This catches:
  - Agent crashed on a host
  - Network partition blocking metrics
  - TSDB ingestion pipeline failure
  
Implementation:
  A watchdog service sends a heartbeat metric every 30s.
  Alert evaluator checks for absence using:
    absent(monitoring_heartbeat{job="watchdog"}[5m])
```

### On-Call Rotation Integration

```
Alert fires (severity=critical)
       │
       ▼
┌──────────────┐     Who is on-call right now?
│  Routing     │────▶ Query PagerDuty / Opsgenie schedule
│  Engine      │
└──────┬───────┘
       │
       ▼
  Page primary on-call
       │
       │  No ACK within 5 min?
       ▼
  Escalate to secondary on-call
       │
       │  No ACK within 10 min?
       ▼
  Escalate to engineering manager
```

---

## 7. Scaling Strategies

### Write Path Scaling

```
                    ┌────────────────────┐
                    │   Kafka Cluster    │
                    │                    │
                    │  P0  P1  P2 ... Pn │
                    └──┬──┬──┬───────┬──┘
                       │  │  │       │
              ┌────────┘  │  │       └────────┐
              ▼           ▼  ▼                ▼
         ┌────────┐  ┌────────┐          ┌────────┐
         │Consumer│  │Consumer│   ...    │Consumer│
         │Group   │  │Group   │          │Group   │
         │Member 0│  │Member 1│          │Member N│
         └───┬────┘  └───┬────┘          └───┬────┘
             │           │                    │
             ▼           ▼                    ▼
         ┌────────┐  ┌────────┐          ┌────────┐
         │ TSDB   │  │ TSDB   │   ...    │ TSDB   │
         │ Shard 0│  │ Shard 1│          │ Shard N│
         └────────┘  └────────┘          └────────┘
```

**Partitioning strategy**:

| Strategy | Pros | Cons |
|---|---|---|
| Hash(metric_name) | Even distribution, simple | Hot metrics (cpu.usage) create hot partitions |
| Hash(metric_name + host) | Better distribution | More partitions needed |
| Hash(metric_name + tag_subset) | Queries on those tags are partition-local | Requires careful tag selection |

**Practical approach**: Partition by `hash(metric_name + primary_tag)` where primary_tag is typically `host` or `service`. This distributes load while keeping related series on the same shard for efficient local queries.

### Read Path Scaling

```
Dashboard query: "avg CPU across 10,000 hosts in us-east, last 1 hour"

┌─────────────┐
│ Query Service│
└──────┬──────┘
       │  Fan-out to all shards holding us-east CPU data
       │
  ┌────┼────┬────┬────┐
  ▼    ▼    ▼    ▼    ▼
┌───┐┌───┐┌───┐┌───┐┌───┐
│S0 ││S1 ││S2 ││S3 ││S4 │   Each shard computes partial avg
└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘
  │    │    │    │    │
  └────┴────┴────┴────┘
       │
  ┌────┴─────┐
  │  Merge   │  Combine partial results → final avg
  │  Layer   │
  └──────────┘
```

**Read scaling techniques**:

1. **Query result caching** (Redis) — identical dashboard queries hit cache
2. **Pre-computed rollups** — 1-min/1-hr aggregates avoid scanning raw data
3. **Read replicas** — TSDB replicas serve read traffic; writes go to primary
4. **Query parallelism** — Fan-out across shards, merge partial results
5. **Bloom filters** — Quickly skip shards/blocks that don't contain the queried series

### Storage Scaling with Consistent Hashing

```
                    Hash Ring
                 ╱            ╲
               ╱                ╲
             ╱    Node A          ╲
           ╱     ┌─────┐           ╲
          │      │     │            │
          │      └─────┘            │
     Node D                    Node B
     ┌─────┐                   ┌─────┐
     │     │                   │     │
     └─────┘                   └─────┘
          │                         │
          │      ┌─────┐            │
          │      │     │            │
           ╲     └─────┘           ╱
             ╲   Node C          ╱
               ╲                ╱
                 ╲            ╱

Each time-series → hash to a position on the ring → assigned to next node clockwise
Virtual nodes: each physical node maps to ~100 positions for even distribution
When a node is added/removed, only 1/N of the data needs to move
```

### Multi-Datacenter Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│     DC: US-East      │     │     DC: EU-West      │
│                      │     │                      │
│ Agents → Kafka →     │     │ Agents → Kafka →     │
│ Local TSDB           │     │ Local TSDB           │
│ Local Alert Eval     │     │ Local Alert Eval     │
│                      │     │                      │
│    ▲                 │     │                ▲     │
└────┼─────────────────┘     └────────────────┼─────┘
     │                                        │
     │  Replicate rollups / global metrics     │
     │         ┌──────────────┐               │
     └────────▶│ Global View  │◀──────────────┘
               │ Aggregation  │
               │ (Cross-DC    │
               │  Dashboards) │
               └──────────────┘

Design principles:
  - Each DC is self-contained for local alerting (survives network partition)
  - Only rollup/aggregated data crosses DCs (minimize WAN bandwidth)
  - Global dashboards query the aggregation layer, not individual DCs
  - Alert evaluation runs locally — a network partition should NOT prevent alerts
```

---

## 8. Reliability & Fault Tolerance

### Ingestion Path Reliability

```
Agent ──▶ Kafka ──▶ Stream Processor ──▶ TSDB

Failure scenarios and mitigations:

1. Agent → Kafka: Agent fails
   Mitigation: Agent writes to local WAL. On restart, replays unsent data.
   
2. Kafka broker fails
   Mitigation: Kafka replication factor = 3. 
   Data survives loss of 2 brokers.
   acks=all ensures data is on multiple brokers before ACK.

3. Stream processor crashes
   Mitigation: Kafka consumer offset tracking.
   New instance resumes from last committed offset.
   
4. TSDB write fails
   Mitigation: Stream processor retries with backoff.
   Kafka retention (2-4h) allows catching up after outage.
```

### TSDB Replication

```
Write:
  Client ──▶ Primary ──▶ Replica 1
                    └──▶ Replica 2
  
  Synchronous replication: write ACK after 2/3 replicas confirm (quorum)
  Asynchronous replication: write ACK after primary confirms (faster, small data loss risk)

Read:
  Dashboard queries → any replica (load balanced)
  Alert queries     → primary (strongest consistency to avoid false alerts)
```

### Alert Evaluation Redundancy

Alerting is the most critical subsystem — a missed alert during an outage is catastrophic.

```
Strategy: Active-Active with Leader Election

┌───────────────────┐     ┌───────────────────┐
│  Alert Evaluator  │     │  Alert Evaluator  │
│  Instance A       │     │  Instance B       │
│  (ACTIVE)         │     │  (ACTIVE)         │
│                   │     │                   │
│ Evaluates rules   │     │ Evaluates rules   │
│ 0–499             │     │ 500–999           │
└────────┬──────────┘     └────────┬──────────┘
         │                         │
         ▼                         ▼
    ┌──────────────────────────────────┐
    │     Alert Deduplication Layer    │
    │  (prevents duplicate pages if   │
    │   both instances fire same      │
    │   alert during failover)        │
    └──────────────────────────────────┘

If Instance A fails:
  - Leader election (via ZooKeeper/etcd) reassigns rules 0-499 to Instance B
  - Instance B now evaluates all 1,000 rules
  - Brief gap (~30s) acceptable; better than missed alerts
```

### Handling Clock Skew

Metrics from different hosts may have slightly different clocks:

| Approach | Description |
|---|---|
| **NTP enforcement** | Require all servers to sync via NTP (< 100ms skew) |
| **Ingestion-time timestamp** | Overwrite agent timestamp with server receive time |
| **Acceptable window** | Accept data points within ±5 minutes of current time, reject outliers |
| **Out-of-order handling** | TSDB must handle late-arriving data (buffer for short window, then compact) |

**Practical guideline**: Most TSDBs (Prometheus, VictoriaMetrics) accept out-of-order samples within a configurable window (e.g., 30 minutes). Points arriving later are rejected. Agents should buffer and retry within this window.

---

## 9. Trade-offs & Interview Tips

### Push vs Pull Decision Matrix

| Factor | Choose Pull | Choose Push |
|---|---|---|
| Infrastructure type | Long-lived servers/containers | Serverless, short-lived jobs, IoT |
| Network topology | Flat network, scraper can reach targets | NATs, firewalls, edge devices |
| Team culture | Prometheus/K8s ecosystem | StatsD/Datadog ecosystem |
| Health checking | Built-in (no scrape = down) | Need separate health check |
| Control over rate | Scraper controls load | Need rate limiting at collector |
| Debugging | Curl /metrics endpoint | Check agent logs |

**Interview answer**: "I'd use a pull model for long-running services in our Kubernetes clusters with service discovery, and a push gateway for batch jobs and serverless functions. This hybrid approach gives us the best of both worlds."

### InfluxDB vs Prometheus Trade-offs

| Dimension | InfluxDB | Prometheus |
|---|---|---|
| Architecture | Centralized, clustered (enterprise) | Single-node + federation (Thanos/Cortex for HA) |
| Query language | InfluxQL/Flux (SQL-like) | PromQL (functional) |
| Push / Pull | Push (Telegraf agents) | Pull (scraper) |
| Long-term storage | Built-in retention policies | External (Thanos, Cortex, Mimir) |
| Kubernetes native | Okay | Excellent (de facto standard) |
| Cardinality handling | Better (TSM engine) | Struggles at very high cardinality |
| Alerting | Built-in Kapacitor | Built-in Alertmanager |
| Open source | OSS + commercial | Fully OSS (CNCF graduated) |

### How to Discuss Alert Fatigue

This is a favorite follow-up question. Key talking points:

1. **Symptom-based alerting**: Alert on user-visible impact (error rate, latency SLO breach), not internal causes (one pod restart, one failed health check)
2. **Alert on SLOs**: "We're burning through our error budget" is more actionable than "error count > 100"
3. **Grouping and inhibition**: Don't fire 1,000 host-level alerts when the root cause is a network switch failure
4. **Regular alert review**: Schedule monthly "alert hygiene" meetings. If an alert hasn't been actionable in 3 months, delete it
5. **Runbooks**: Every alert must link to a runbook. If you can't write a runbook for it, it might not be a good alert

### Common Follow-up Questions

| Question | Key Points |
|---|---|
| "How do you handle high cardinality?" | Limit label values (no user IDs as labels), pre-aggregate at collection, use specialized TSDB (VictoriaMetrics) |
| "How do you monitor the monitoring system?" | Dead man's switch, separate lightweight watchdog, cross-DC health checks |
| "How do you handle metric spikes during deploys?" | Kafka absorbs burst, auto-scaling consumers, deploy annotations on dashboards |
| "What about anomaly detection?" | ML-based: train on historical patterns, detect deviations. Static thresholds are simpler and more reliable for most cases |
| "How do you secure metrics data?" | mTLS between agents and collectors, RBAC on dashboards, encrypt data at rest |
| "How would you migrate from push to pull?" | Dual-write period, run both in parallel, compare results, switch dashboards/alerts incrementally |
| "What happens during a TSDB outage?" | Kafka buffers (2-4h retention), alerts continue from last known state, agents buffer locally |

---

## 10. Quick Reference Cheat Sheet

### Architecture at a Glance

```
Sources → Agents → Kafka → Stream Processor → TSDB → Query Service → Dashboards
                                                                   → Alerting → Notifications
```

### Numbers to Remember

| Metric | Value |
|---|---|
| Write throughput | 10M data points/sec |
| Data point size | ~16 bytes raw, ~1.2 bytes compressed |
| Active time series | ~500M |
| Raw storage/day | ~2.6 TB (compressed) |
| Alert evaluation frequency | Every 15–60 seconds |
| Alert latency budget | < 30 seconds |
| Kafka retention (buffer) | 2–4 hours |

### Key Technology Choices

| Component | Primary Choice | Alternatives |
|---|---|---|
| Collection | Prometheus + Push Gateway | Telegraf, OpenTelemetry Collector |
| Ingestion buffer | Apache Kafka | Amazon Kinesis, Pulsar |
| Time-series DB | VictoriaMetrics / InfluxDB | Prometheus TSDB, TimescaleDB |
| Query language | PromQL | InfluxQL, SQL |
| Visualization | Grafana | Kibana, custom UI |
| Alerting | Alertmanager | PagerDuty integration, custom |
| Notification | PagerDuty + Slack | Opsgenie, email, webhooks |

### Five Things to Mention in Every Interview

1. **Kafka as buffer** — decouples ingestion from storage, handles bursts, enables replay
2. **Gorilla compression** — delta-of-delta for timestamps, XOR for values → 12:1 compression
3. **Downsampling** — raw → 1-min → 1-hour rollups with different retention
4. **Alert fatigue** — grouping, silencing, inhibition, symptom-based alerting
5. **Multi-DC resilience** — local alerting survives network partitions, global view for dashboards

### Data Model Cheat Sheet

```
Metric data point:
  metric_name{label1="value1", label2="value2"} value @ timestamp

Time series = unique (metric_name + label set)

Example:
  http_requests_total{method="GET", service="api", status="200"} 14523 @ 1640000000

Four metric types:
  Counter   → monotonically increasing (use rate() to query)
  Gauge     → goes up and down (query directly)
  Histogram → bucketed distribution (use histogram_quantile())
  Summary   → pre-computed quantiles (query directly)
```

### Interview Flow Template

```
1. Clarify requirements           (2 min)
   "Are we designing metrics only, or logs/traces too?"
   "What scale? How many servers? How many metrics per server?"
   
2. High-level design              (5 min)
   Draw the 5-component architecture
   Discuss data model (name, tags, timestamp, value)
   
3. Deep dive — chosen by interviewer  (15 min)
   Storage:   TSDB internals, compression, downsampling
   Alerting:  Evaluation pipeline, state machine, fatigue
   Ingestion: Push vs pull, Kafka buffer, scaling
   
4. Scaling & reliability          (5 min)
   Partitioning strategy, multi-DC, alert redundancy
   
5. Trade-offs                     (3 min)
   Push vs pull, TSDB choices, alert philosophy
```
