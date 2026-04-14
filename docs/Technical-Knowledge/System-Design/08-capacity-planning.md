---
sidebar_position: 9
title: "08 — Capacity Planning & Estimation"
slug: 08-capacity-planning
---

# 📐 Capacity Planning & Estimation

Back-of-the-envelope estimation is **expected in every FAANG system design interview**. It demonstrates that you think quantitatively, can reason about scale, and won't propose a single-server architecture for a system serving 500 million users. This chapter gives you the numbers, frameworks, and worked examples to estimate confidently under pressure.

---

## 🔍 Why Estimation Matters

| Reason | Detail |
|--------|--------|
| **Architecture decisions depend on scale** | 100 QPS → single server. 100K QPS → sharding, caching, CDN |
| **Shows engineering maturity** | Senior engineers think in numbers, not vibes |
| **Catches impossible designs early** | "We need 50TB of RAM" → time to rethink the approach |
| **Drives trade-off discussions** | "At this write rate, we need Cassandra, not PostgreSQL" |
| **Interviewers explicitly ask** | "How much storage do we need for 5 years?" is a standard prompt |

:::tip Senior-Level Insight
Don't aim for precision — aim for the right **order of magnitude**. Being off by 2x is fine; being off by 100x means your architecture is wrong. State your assumptions clearly: *"Assuming 300M DAU with an average of 5 requests per user per day..."*
:::

---

## 1. Powers of 2 — Reference Table

Every estimation starts here. Memorize these:

| Power | Exact Value | Approx. Size | Common Name |
|:-----:|------------:|:-------------|:------------|
| 2^10 | 1,024 | ~1 Thousand | 1 KB (Kilobyte) |
| 2^20 | 1,048,576 | ~1 Million | 1 MB (Megabyte) |
| 2^30 | 1,073,741,824 | ~1 Billion | 1 GB (Gigabyte) |
| 2^40 | 1,099,511,627,776 | ~1 Trillion | 1 TB (Terabyte) |
| 2^50 | — | ~1 Quadrillion | 1 PB (Petabyte) |

### Useful Mnemonics

```
1 KB  ≈  1,000         (a short email)
1 MB  ≈  1,000 KB      (a photo, a minute of MP3)
1 GB  ≈  1,000 MB      (a movie, 1 hour of HD video)
1 TB  ≈  1,000 GB      (500 hours of HD video)
1 PB  ≈  1,000 TB      (Netflix's entire catalog)
```

---

## 2. Key Numbers Every Engineer Should Know

### Latency Numbers

| Operation | Latency | Notes |
|-----------|--------:|-------|
| L1 cache reference | 0.5 ns | On-chip, per core |
| L2 cache reference | 7 ns | On-chip, shared |
| Main memory (RAM) | 100 ns | DRAM access |
| SSD random read | 150 µs | 150,000 ns |
| HDD random seek | 10 ms | 10,000,000 ns — avoid in hot paths |
| Round trip same datacenter | 0.5 ms | 500,000 ns |
| Read 1 MB sequentially from memory | 250 µs | |
| Read 1 MB sequentially from SSD | 1 ms | |
| Read 1 MB sequentially from HDD | 20 ms | |
| Round trip CA → Netherlands | 150 ms | Speed of light in fiber |
| TLS handshake | 50-250 ms | Per new connection |
| DNS lookup (uncached) | 20-120 ms | |

```
Latency Comparison (log scale):

L1 cache   ▓                                                    0.5 ns
L2 cache   ▓▓                                                   7 ns
RAM        ▓▓▓▓▓                                                 100 ns
SSD read   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                   150 µs
HDD seek   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           10 ms
Cross-DC   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   150 ms
```

### Throughput Numbers

| Resource | Throughput | Notes |
|----------|----------:|-------|
| Single PostgreSQL | 5-10K TPS | Depends on query complexity |
| Single Redis | 100K ops/sec | In-memory, single-threaded |
| Single Kafka broker | 100K-200K msgs/sec | Per partition: ~10K |
| Nginx | 50K-100K req/sec | Static content, per instance |
| Application server (single) | 1K-10K req/sec | Depends on handler complexity |
| CDN edge node | 100K+ req/sec | Static assets, per node |

---

## 3. Unit Conversions — Interview Quick-Reference

### Time

| Period | Seconds |
|--------|--------:|
| 1 minute | 60 |
| 1 hour | 3,600 |
| 1 day | 86,400 ≈ **~100K** |
| 1 month | 2,592,000 ≈ **~2.5M** |
| 1 year | 31,536,000 ≈ **~30M** |

:::tip Senior-Level Insight
Use **~100K seconds/day** and **~2.5M seconds/month** as quick-conversion anchors. These round numbers make mental math much faster during interviews.
:::

### Requests

| Input | Conversion |
|-------|-----------|
| 1M DAU × 10 requests/user/day | 10M requests/day |
| 10M requests/day ÷ 100K seconds/day | **~100 QPS** (average) |
| Peak QPS (2-5× average) | **~200-500 QPS** |

### Data

| Input | Conversion |
|-------|-----------|
| 1 char (UTF-8) | 1 byte (ASCII) / 1-4 bytes (Unicode) |
| 1 UUID | 36 bytes (string) / 16 bytes (binary) |
| 1 timestamp | 8 bytes |
| 1 integer | 4 bytes (32-bit) / 8 bytes (64-bit) |
| 1 tweet (280 chars + metadata) | ~500 bytes |
| 1 photo (compressed JPEG) | ~200 KB - 2 MB |
| 1 minute of video (720p) | ~5-10 MB |
| 1 minute of video (4K) | ~50-100 MB |

---

## 4. QPS Estimation Framework

### The Formula

```
Average QPS = DAU × actions_per_user_per_day / seconds_per_day

Peak QPS = Average QPS × peak_multiplier (typically 2-5×)
```

### Step-by-Step

1. **Start with DAU** — given in the problem or assumed (e.g., 100M DAU)
2. **Estimate actions per user per day** — e.g., a social media user makes ~20 requests/day
3. **Calculate average QPS** — `100M × 20 / 100K = 20,000 QPS`
4. **Apply peak multiplier** — `20,000 × 3 = 60,000 peak QPS`
5. **Split by read:write ratio** — e.g., 10:1 → 54,500 reads/sec, 5,500 writes/sec

### Read:Write Ratios for Common Systems

| System | Read:Write | Why |
|--------|:----------:|-----|
| Social media feed | 100:1 | Many readers, few posters |
| Chat application | 1:1 | Every send has a receive |
| E-commerce catalog | 1000:1 | Browsing dominates purchasing |
| URL shortener | 100:1 | Many redirects per URL created |
| Logging service | 1:10 | Write-heavy ingestion, occasional queries |
| Banking ledger | 5:1 | Regular balance checks, periodic transactions |

---

## 5. Storage Estimation Framework

### The Formula

```
Daily storage = writes_per_day × average_record_size

Total storage = daily_storage × retention_days × replication_factor × growth_factor
```

### Step-by-Step

1. **Calculate writes per day** — from QPS estimation: `write_QPS × 86,400`
2. **Estimate average record size** — sum up field sizes (see data sizes table above)
3. **Multiply** — `writes/day × record_size = daily_storage`
4. **Apply retention** — how many days/years of data to keep
5. **Apply replication factor** — typically 3× for distributed databases
6. **Add growth buffer** — typically 1.5-2× for future growth

### Example: Twitter-like Service

```
Assumptions:
  - 300M DAU
  - 1% post tweets → 3M tweets/day
  - Average tweet: 280 chars + metadata = 500 bytes
  - Media attachments: 30% of tweets have images (~200KB avg)

Text storage per day:
  3M × 500 bytes = 1.5 GB/day

Media storage per day:
  3M × 0.3 × 200KB = 180 GB/day

Total daily storage:
  ~182 GB/day

Storage for 5 years:
  182 GB × 365 × 5 = 332 TB (before replication)

With 3× replication:
  332 TB × 3 ≈ 1 PB

With growth buffer (1.5×):
  1 PB × 1.5 ≈ 1.5 PB
```

---

## 6. Bandwidth Estimation Framework

### The Formula

```
Ingress bandwidth = write_QPS × average_request_size
Egress bandwidth  = read_QPS × average_response_size
```

### Example: Video Streaming Service

```
Assumptions:
  - 100M DAU, average 30 min of video/day
  - Average bitrate: 5 Mbps (1080p)
  - Concurrent viewers at peak: 10M (10% of DAU)

Egress bandwidth (peak):
  10M viewers × 5 Mbps = 50 Tbps

  This is why CDNs exist — no single datacenter 
  can serve 50 Tbps. Content is edge-cached globally.

Ingress (video uploads):
  - 500K creators upload 1 video/day
  - Average video: 500 MB
  - Upload bandwidth: 500K × 500MB / 86,400s ≈ 2.9 GB/s ≈ 23 Gbps
```

---

## 7. Memory & Cache Estimation

### The 80/20 Rule for Caching

In most systems, **20% of data serves 80% of requests**. Cache the hot 20%.

### The Formula

```
Cache size = daily_active_data × 0.2

Or more precisely:
Cache size = unique_requests_per_day × avg_response_size × cache_ratio
```

### Example: URL Shortener Cache

```
Assumptions:
  - 100K read QPS
  - Average URL mapping: 500 bytes (short URL + long URL + metadata)
  - Cache hit ratio target: 80%
  - Unique URLs accessed per day: 10M

Cache size:
  10M × 500 bytes × 0.2 = 1 GB

  → Easily fits in a single Redis instance (max ~25-50 GB)
  → Cache hit ratio of 80% reduces DB load from 100K to 20K QPS
```

### Cache Hit Ratio Targets

| System | Target Hit Ratio | Impact of Miss |
|--------|:----------------:|----------------|
| CDN (static assets) | 95-99% | Increased origin load + latency |
| Application cache (Redis) | 80-95% | Database query + latency |
| Database buffer pool | 99%+ | Disk I/O (10ms vs 0.1ms) |
| DNS cache | 90-95% | DNS resolution latency (20-120ms) |

---

## 8. Common Estimation Exercises

### Exercise 1: Twitter

```
┌───────────────────────────────────────────────────┐
│  Twitter Estimation                               │
├───────────────────────────────────────────────────┤
│  DAU: 300M                                        │
│                                                   │
│  QPS:                                             │
│    Tweets:  300M × 0.01 × 2 / 100K = 60 QPS     │
│    Reads:   300M × 20 / 100K = 60K QPS           │
│    Peak:    60K × 3 = 180K read QPS              │
│                                                   │
│  Storage (daily):                                 │
│    Tweets: 6M × 500B = 3 GB/day                  │
│    Media:  6M × 0.3 × 200KB = 360 GB/day        │
│    Total:  ~363 GB/day                            │
│                                                   │
│  Fanout QPS:                                      │
│    Avg followers: 200                             │
│    Fanout writes: 60 tweets/sec × 200 = 12K/sec  │
│    Celebrity tweets (>1M followers): on-read      │
│                                                   │
│  Cache: 20% of daily data ≈ 73 GB → 2 Redis     │
│  nodes (comfortable)                              │
└───────────────────────────────────────────────────┘
```

### Exercise 2: YouTube

```
┌───────────────────────────────────────────────────┐
│  YouTube Estimation                               │
├───────────────────────────────────────────────────┤
│  DAU: 500M                                        │
│                                                   │
│  Video uploads:                                   │
│    500K videos/day (≈ 6/sec)                      │
│    Avg raw video: 500 MB                          │
│    Daily upload: 500K × 500MB = 250 TB/day       │
│    Transcoded (5 resolutions): 250TB × 3 = 750TB │
│                                                   │
│  Streaming QPS:                                   │
│    Concurrent viewers: 50M (10% DAU)              │
│    Bandwidth: 50M × 5Mbps = 250 Tbps             │
│    CDN is non-negotiable at this scale            │
│                                                   │
│  Storage (yearly):                                │
│    750 TB/day × 365 = 274 PB/year                │
│    → Massive object storage (S3-like)             │
│                                                   │
│  Metadata storage:                                │
│    500K videos × 5KB metadata = 2.5 GB/day       │
│    → Fits easily in PostgreSQL                    │
└───────────────────────────────────────────────────┘
```

### Exercise 3: Chat Service (WhatsApp-like)

```
┌───────────────────────────────────────────────────┐
│  Chat Service Estimation                          │
├───────────────────────────────────────────────────┤
│  DAU: 500M                                        │
│  Messages per user per day: 40                    │
│                                                   │
│  Message QPS:                                     │
│    500M × 40 / 100K = 200K msgs/sec              │
│    Peak: 200K × 3 = 600K msgs/sec               │
│                                                   │
│  Concurrent connections:                          │
│    50M persistent WebSocket connections           │
│    At ~20KB memory per connection:                │
│    50M × 20KB = 1 TB of connection memory        │
│    → Need ~200 servers at 5GB each for conns     │
│                                                   │
│  Storage (daily):                                 │
│    500M × 40 × 200B = 4 TB/day (text only)      │
│    Media: 10% have images (200KB avg)             │
│    500M × 40 × 0.1 × 200KB = 400 TB/day         │
│                                                   │
│  Storage (5 years):                               │
│    Text: 4 TB × 365 × 5 = 7.3 PB               │
│    Media: 400 TB × 365 × 5 = 730 PB             │
└───────────────────────────────────────────────────┘
```

### Exercise 4: URL Shortener

```
┌───────────────────────────────────────────────────┐
│  URL Shortener Estimation                         │
├───────────────────────────────────────────────────┤
│  New URLs: 100M/month ≈ 40/sec write QPS         │
│  Read:write = 100:1 → 4,000 read QPS            │
│  Peak read QPS: 4,000 × 5 = 20K QPS             │
│                                                   │
│  URL record: short(7B) + long(200B) + meta(50B)  │
│            = ~250 bytes/record                    │
│                                                   │
│  Storage (5 years):                               │
│    100M/month × 60 months × 250B = 1.5 TB       │
│                                                   │
│  Key space:                                       │
│    7-char base62: 62^7 = 3.5 trillion combos     │
│    6B URLs over 5 years → collision-safe          │
│                                                   │
│  Cache:                                           │
│    Hot URLs (20%): 6B × 0.2 × 250B = 300 GB     │
│    → 6 Redis instances at 50GB each              │
│                                                   │
│  Bandwidth:                                       │
│    Read: 20K QPS × 250B = 5 MB/s (trivial)      │
└───────────────────────────────────────────────────┘
```

### Exercise 5: Image Hosting Service

```
┌───────────────────────────────────────────────────┐
│  Image Service Estimation (1B photos/year)        │
├───────────────────────────────────────────────────┤
│  Uploads: 1B/year ÷ 365 ≈ 2.7M/day ≈ 32/sec    │
│  Peak upload QPS: 32 × 5 = 160/sec              │
│                                                   │
│  Views: 100:1 read:write → 3,200 QPS avg        │
│  Peak view QPS: 3,200 × 3 = 9,600 QPS           │
│                                                   │
│  Storage per image:                               │
│    Original: 2 MB (avg)                           │
│    Thumbnails (3 sizes): 50KB + 150KB + 500KB    │
│    Total per image: ~2.7 MB                       │
│                                                   │
│  Yearly storage:                                  │
│    1B × 2.7 MB = 2.7 PB/year                    │
│    5 years: 13.5 PB                               │
│    With replication (3×): 40.5 PB                │
│    → Object storage (S3) is the only option      │
│                                                   │
│  Bandwidth (peak):                                │
│    Views: 9,600 × 500KB (avg served size) =      │
│    4.8 GB/s ≈ 38 Gbps                            │
│    → CDN required                                 │
│                                                   │
│  CDN cache hit target: 95%                        │
│    Origin traffic: 38 Gbps × 0.05 = 1.9 Gbps    │
└───────────────────────────────────────────────────┘
```

---

## 9. Estimation Framework — The 5-Step Method

Use this framework for **any** system design estimation:

```
Step 1: SCOPE         →  What are we estimating? (QPS, storage, bandwidth, cache?)
Step 2: ASSUMPTIONS   →  State DAU, actions/user, data sizes, retention
Step 3: MATH          →  Plug into formulas, use round numbers
Step 4: INTERPRET     →  What does this number mean for architecture?
Step 5: VALIDATE      →  Does this make sense? Compare to known systems
```

### Step-by-Step Example: Design a Notification System

```
Step 1: SCOPE
  Need: QPS (send), storage, push delivery bandwidth

Step 2: ASSUMPTIONS
  - 200M DAU
  - 5 notifications/user/day (avg)
  - Notification size: 200 bytes (text + metadata)
  - Retention: 30 days
  - Push delivery: 80% mobile, 20% web
  - Peak multiplier: 3×

Step 3: MATH
  Send QPS:
    200M × 5 / 100K = 10,000 QPS (avg)
    Peak: 10,000 × 3 = 30,000 QPS

  Storage (daily):
    1B notifications × 200B = 200 GB/day

  Storage (30-day retention):
    200 GB × 30 = 6 TB
    With replication (3×): 18 TB

  Push bandwidth:
    30K QPS × 200B = 6 MB/s ≈ 48 Mbps (trivial)

Step 4: INTERPRET
  - 30K QPS → need a message queue (SQS/Kafka), not direct processing
  - 18 TB → fits in a moderate database cluster
  - Push delivery → need APNs/FCM integration, connection pool to push services
  - Notification deduplication → need idempotency (Redis set for recent IDs)

Step 5: VALIDATE
  - 5 notifications/user/day feels right (app badges, emails, push)
  - 10K QPS is within single Kafka broker capacity
  - 200B per notification is reasonable for JSON payload
  ✓ Numbers check out
```

---

## 10. Cost Estimation — Rules of Thumb

### Cloud Pricing Anchors (approximate, 2024-2025)

| Resource | Approximate Cost | Notes |
|----------|----------------:|-------|
| **Compute** (on-demand, general purpose) | $0.05/hr per vCPU | ~$35/month per vCPU |
| **Compute** (reserved, 1yr) | $0.03/hr per vCPU | ~40% savings |
| **Memory** | $0.005/hr per GB | $3.50/month per GB |
| **SSD storage** (EBS gp3) | $0.08/GB/month | |
| **Object storage** (S3) | $0.023/GB/month | First 50 TB |
| **Data transfer** (egress) | $0.09/GB | First 10 TB out |
| **CDN** (CloudFront) | $0.085/GB | First 10 TB |
| **Managed Redis** (ElastiCache) | $0.068/hr (6.5GB) | ~$50/month |
| **Managed PostgreSQL** (RDS) | $0.10/hr (db.m5.large) | ~$70/month |

### Quick Cost Estimates

```
Example: Image hosting service (from Exercise 5)

Storage (5 years):
  13.5 PB on S3 = 13,500 TB × $0.023/GB × 1000 GB/TB
                = 13,500 × $23 = $310,500/month

CDN bandwidth:
  38 Gbps peak → ~100 PB/month transfer
  100,000 TB × $0.04/GB (volume discount) × 1000
  ≈ $4M/month in CDN costs alone

  → This is why companies build their own CDNs
     at scale (Netflix Open Connect, Facebook PoPs)
```

:::warning Cost Awareness
In interviews, mentioning cost shows business awareness. When proposing a solution, add: *"At this scale, CDN egress would dominate costs at approximately $X/month. We'd likely negotiate volume discounts or consider building edge infrastructure."*
:::

---

## 11. Scalability Thresholds — When to Scale

### Database

| QPS Range | Architecture |
|-----------|-------------|
| < 1K QPS | Single primary, no replicas |
| 1K-10K QPS | Primary + read replicas + connection pooling |
| 10K-100K QPS | Add caching layer (Redis), consider sharding |
| > 100K QPS | Sharded database + distributed cache + CQRS |

### Caching

| Trigger | Action |
|---------|--------|
| Database CPU > 70% | Add Redis/Memcached cache layer |
| Cache hit ratio < 80% | Review cache key design, increase cache size |
| Single cache node at capacity | Cluster (Redis Cluster, consistent hashing) |
| Hot keys causing imbalance | Local in-process cache (L1) + distributed cache (L2) |

### CDN

| Trigger | Action |
|---------|--------|
| Static assets served from origin | Put behind CDN immediately |
| Origin bandwidth > 1 Gbps | CDN is essential, not optional |
| Global users with > 100ms latency | Edge caching required |
| Media-heavy content (images, video) | CDN + origin shield |

### Application Servers

| Concurrent Users | Architecture |
|:----------------:|-------------|
| < 1K | Single server |
| 1K-10K | Load balancer + 2-5 servers |
| 10K-100K | Auto-scaling group + multiple AZs |
| > 100K | Multi-region deployment |

---

## 12. Estimation Anti-Patterns

| Anti-Pattern | Why It's Bad | Do This Instead |
|-------------|-------------|-----------------|
| **Skipping assumptions** | Interviewer can't follow your reasoning | State every assumption explicitly |
| **False precision** | "We need 47,291.3 QPS" — meaningless | Round aggressively: "~50K QPS" |
| **Forgetting peak** | Average QPS ≠ peak QPS, and systems fail at peak | Always multiply by 2-5× for peak |
| **Ignoring replication** | Raw storage ≠ actual storage needed | Always include 3× replication factor |
| **Single-dimension estimation** | Only estimating storage but not QPS or bandwidth | Estimate all three: QPS, storage, bandwidth |
| **Not sanity-checking** | "We need 10 PB of RAM" — clearly wrong | Compare to known systems as a gut check |

:::tip Senior-Level Insight
After presenting your numbers, always summarize the architectural implications: *"So we're looking at ~50K read QPS, ~5K write QPS, and ~10TB of active data. This tells me we need a sharded database, a caching layer to absorb the reads, and a CDN for static content. A single PostgreSQL instance won't handle this — we'd need Cassandra or DynamoDB for the write path."*
:::

---

## 13. Reference Card — Numbers at a Glance

### QPS Anchors

| System | Approximate QPS |
|--------|----------------:|
| Small web app | 100 |
| Medium SaaS product | 1K-10K |
| Large social network (reads) | 100K-1M |
| Global search engine | 100K+ |
| CDN edge (per node) | 100K+ |

### Storage Anchors

| System | Approximate Storage |
|--------|-------------------:|
| 1M user profiles (1KB each) | 1 GB |
| 1B tweets (500B each) | 500 GB |
| 1M photos (2MB each) | 2 TB |
| 1M videos (500MB each) | 500 TB |
| 1 year of logs (10K lines/sec, 200B/line) | 63 TB |

### Server Capacity Anchors

| Resource | Single Server Capacity |
|----------|----------------------:|
| RAM | 64-512 GB (typical production) |
| SSD | 1-16 TB |
| Network | 10-25 Gbps |
| CPU | 32-128 cores |
| Connections (WebSocket) | 50K-200K (with tuning) |

---

## 📚 Key Takeaways

| # | Principle |
|:-:|-----------|
| 1 | **Memorize the latency numbers** — they're the foundation of every estimation |
| 2 | **Use ~100K seconds/day** as your go-to conversion anchor |
| 3 | **Always state assumptions** before doing math — interviewers want to see your reasoning |
| 4 | **Round aggressively** — order of magnitude matters, not precision |
| 5 | **Estimate QPS, storage, AND bandwidth** — all three inform architecture |
| 6 | **Apply peak multiplier (2-5×)** — systems are designed for peak, not average |
| 7 | **Include replication (3×) and growth (1.5×)** — raw data is never the real number |
| 8 | **Interpret the numbers** — translate estimates into architectural decisions |
| 9 | **Sanity-check** — compare to known systems (Twitter, YouTube) to validate |
| 10 | **Practice** — do 5 estimation exercises until the math becomes automatic |
