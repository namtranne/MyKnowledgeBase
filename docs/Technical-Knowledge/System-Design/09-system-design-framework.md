---
sidebar_position: 10
title: "09 — System Design Interview Framework"
slug: 09-system-design-framework
---

# 🎯 System Design Interview Framework

System design interviews are **open-ended conversations**, not coding exercises. There is no single correct answer — interviewers evaluate your process, communication, trade-off awareness, and ability to go deep when probed. This chapter gives you a repeatable framework for any system design problem, API and data model design patterns, and a complete end-to-end walkthrough.

---

## 🔍 The Core Challenge

System design interviews fail candidates for predictable, avoidable reasons:

| Failure Mode | What Happens | How to Avoid |
|-------------|-------------|-------------|
| **Jumping to solution** | Immediately drawing databases and caches | Spend 5 minutes on requirements first |
| **No structure** | Meandering discussion with no clear phases | Follow the 5-step framework below |
| **Over-engineering** | Proposing Kafka, Kubernetes, and a service mesh for a simple CRUD app | Right-size the architecture for the stated scale |
| **Ignoring trade-offs** | "Use Redis" without explaining why, or what you give up | Every decision has a cost — state it |
| **Monologue mode** | Talking for 15 minutes without checking in | Treat it as a conversation — ask questions, confirm direction |
| **Shallow everywhere** | Covering 20 components at surface level | Go deep on 2-3 critical components |
| **Ignoring non-functional requirements** | No mention of availability, latency, consistency | Always ask about SLAs upfront |

---

## 1. The 5-Step Framework (45-60 Minute Breakdown)

```
┌────────────────────────────────────────────────────────────┐
│              45-Minute Interview Timeline                   │
├──────┬──────┬────────────┬──────────────────┬──────────────┤
│ Req. │ Est. │ High-Level │  Detailed Design │ Bottlenecks  │
│ 5min │ 5min │   10min    │     15-20min     │   5-10min    │
│      │      │            │                  │              │
│ Step │ Step │   Step 3   │     Step 4       │   Step 5     │
│  1   │  2   │            │                  │              │
└──────┴──────┴────────────┴──────────────────┴──────────────┘
```

---

## 2. Step 1 — Requirements Clarification (5 minutes)

The most important 5 minutes of the interview. Clarifying requirements **before** designing shows structured thinking and prevents wasted effort.

### Functional Requirements (What does the system do?)

Ask:
- Who are the users? How many?
- What are the core features? (List 3-5, no more)
- What are we explicitly **not** building? (Scope negotiation)
- What does the user journey look like?

### Non-Functional Requirements (How well does it do it?)

| Dimension | Questions to Ask |
|-----------|-----------------|
| **Scale** | How many DAU? How many requests/sec? How much data? |
| **Availability** | What's the uptime target? (99.9%? 99.99%?) |
| **Latency** | What's acceptable response time? (< 100ms? < 1s?) |
| **Consistency** | Strong or eventual? Can users see stale data briefly? |
| **Durability** | Can we lose data? What's the backup/recovery requirement? |
| **Security** | Authentication? Authorization? Encryption at rest/in transit? |

### Constraints

- Geographic distribution (single region vs multi-region?)
- Technology constraints (must use specific cloud provider?)
- Budget (cost-sensitive vs performance-first?)
- Timeline (MVP vs production-grade?)

### Example: URL Shortener

```
Functional Requirements:
  ✅ Given a long URL, generate a short URL
  ✅ Redirect short URL to original long URL
  ✅ Custom aliases (optional)
  ✅ Expiration (TTL)
  ❌ Analytics dashboard (out of scope for this interview)
  ❌ User accounts (out of scope)

Non-Functional Requirements:
  - 100M new URLs/month
  - 100:1 read:write ratio → 10B redirects/month
  - URL should be as short as possible
  - Availability > consistency (eventual consistency OK)
  - Redirect latency < 50ms (p99)
  - URLs should be unpredictable (not sequential)
  - 5-year data retention
```

:::tip Senior-Level Insight
Don't just ask questions — **propose and confirm**: *"I'm assuming 100M DAU with a 100:1 read:write ratio — does that sound right?"* This shows you have calibrated intuition about system scale. The interviewer will correct you if needed.
:::

---

## 3. Step 2 — Back-of-Envelope Estimation (5 minutes)

Translate requirements into concrete numbers. This step determines whether you need a single server or a globally distributed system.

### What to Estimate

| Metric | Formula |
|--------|---------|
| **QPS** | DAU × actions/user/day ÷ 86,400 |
| **Peak QPS** | Average QPS × 2-5 |
| **Storage** | writes/day × record_size × retention × replication |
| **Bandwidth** | QPS × avg_payload_size |
| **Cache** | active_data × 0.2 (80/20 rule) |

### Example: URL Shortener Estimation

```
QPS:
  Write: 100M/month ÷ 2.5M sec/month ≈ 40 QPS
  Read:  40 × 100 = 4,000 QPS
  Peak:  4,000 × 5 = 20,000 QPS

Storage (5 years):
  Record: short_url(7B) + long_url(200B) + created(8B) + ttl(8B) = ~250B
  100M/month × 60 months × 250B = 1.5 TB
  With 3× replication: 4.5 TB

Cache:
  Hot URLs (20%): 6B × 0.2 × 250B = 300 GB
  → 6 Redis nodes at 50GB each

Bandwidth:
  Read: 20K × 250B = 5 MB/s (trivial)

Summary: Moderate scale — a handful of application servers,
a sharded KV store, and a Redis cache layer will suffice.
```

:::warning Don't Spend Too Long Here
Estimation should take 3-5 minutes maximum. State assumptions, do quick math, summarize the architectural implications, then move on. The interviewer wants to see that you can do it, not watch you do arithmetic for 15 minutes.
:::

---

## 4. Step 3 — High-Level Design (10 minutes)

Draw the component diagram showing how data flows through the system. Start with the user and trace the request path.

### Components to Consider

| Component | When to Include |
|-----------|----------------|
| **Load Balancer** | Always (for any multi-server setup) |
| **API Gateway** | When you have multiple backend services |
| **Application Servers** | Always |
| **Cache (Redis)** | When read QPS > 1K or when you need sub-10ms reads |
| **Database** | Always |
| **Message Queue** | When you have async processing or need to decouple services |
| **CDN** | When serving static content (images, JS, CSS) or global users |
| **Search Index** | When users need full-text search or complex filtering |
| **Object Storage** | When storing files (images, videos, documents) |
| **Notification Service** | When the system pushes updates to users |

### Example: URL Shortener High-Level Design

```
┌──────────┐        ┌──────────────┐        ┌──────────────┐
│  Client  │──────►│ Load Balancer │──────►│  API Servers  │
│          │◄──────│              │◄──────│  (stateless)  │
└──────────┘        └──────────────┘        └──────┬───────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────────┐
                              │  Cache   │  │  Hash    │  │   Database   │
                              │ (Redis)  │  │Generator │  │  (DynamoDB / │
                              │          │  │ Service  │  │   Cassandra) │
                              └──────────┘  └──────────┘  └──────────────┘
```

### API Design

```
POST /api/v1/urls
  Request:  { "long_url": "https://...", "custom_alias": "my-link", "ttl": 86400 }
  Response: { "short_url": "https://tny.im/abc1234", "expires_at": "..." }
  Status:   201 Created

GET /{short_code}
  Response: 301 Redirect (Location: https://original-long-url.com/...)
  Cache:    Cache-Control: max-age=300 (5 min browser cache)

  On miss:  Look up in Redis → if miss → look up in DB → populate cache → redirect
```

---

## 5. Step 4 — Detailed Design (15-20 minutes)

This is where you demonstrate depth. **Don't try to cover everything** — the interviewer will guide you to 2-3 areas they care about. Be ready to go deep on any component.

### 5.1 Hash Generation (URL Shortener Deep Dive)

The core problem: generate a unique, short, unpredictable identifier for each URL.

| Approach | Pros | Cons |
|----------|------|------|
| **MD5/SHA256 + truncate** | Simple, deterministic | Collisions with truncation |
| **Base62 encoding of auto-increment** | No collisions | Predictable, single-writer bottleneck |
| **Pre-generated ID pool** | No runtime collision handling | Need ID generation service |
| **Snowflake-like IDs** | Globally unique, sortable | More complex, 64-bit (longer base62) |
| **Random + collision check** | Simple, unpredictable | Requires uniqueness check on write |

#### Recommended Approach: Base62 with Counter Service

```
┌──────────────┐     Get range      ┌──────────────┐
│  API Server  │ ─────────────────► │   Counter    │
│  (App 1)     │ ◄── [1M - 2M] ── │   Service    │
│              │                    │  (ZooKeeper) │
│  Local pool: │                    └──────────────┘
│  1,000,042   │
│  → base62()  │
│  → "abc1Z"   │     Get range      ┌──────────────┐
└──────────────┘                    │  API Server  │
                     ┌──────────── │  (App 2)     │
                     │              │              │
                     │  [2M - 3M]  │  Local pool: │
                     │              │  2,000,001   │
                     ▼              └──────────────┘
              ┌──────────────┐
              │   Counter    │
              │   Service    │
              └──────────────┘
```

Each API server requests a range of IDs from a central counter (ZooKeeper or Redis `INCR`). The server then allocates from its local range without contention. When the range is exhausted, it requests a new one.

```python
import string

ALPHABET = string.digits + string.ascii_letters  # 0-9, a-z, A-Z = 62 chars

def base62_encode(num: int) -> str:
    if num == 0:
        return ALPHABET[0]
    result = []
    while num > 0:
        result.append(ALPHABET[num % 62])
        num //= 62
    return ''.join(reversed(result))

# 7 chars of base62 = 62^7 = 3.5 trillion unique URLs
# Sufficient for 100M/month × 12 × 100 years
```

### 5.2 Read Path (Redirect Flow)

```
Client requests: GET /abc1234
           │
           ▼
    ┌──────────────┐
    │ Load Balancer │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     ┌─────────┐
    │  API Server  │────►│  Redis  │──── Cache HIT → 301 Redirect
    │              │     │  Cache  │
    │              │     └────┬────┘
    │              │          │
    │              │     Cache MISS
    │              │          │
    │              │          ▼
    │              │     ┌─────────┐
    │              │     │   DB    │──── Found → populate cache → 301 Redirect
    │              │     │         │
    │              │     │         │──── Not Found → 404
    │              │     └─────────┘
    └──────────────┘
```

### 5.3 Database Choice

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **PostgreSQL** | ACID, familiar, rich features | Scaling writes beyond 10K QPS requires sharding | Good for < 1B records |
| **DynamoDB** | Auto-scaling, managed, single-digit-ms reads | Cost at scale, limited query flexibility | Good for key-value access patterns |
| **Cassandra** | Write-optimized, linear scaling | Eventual consistency, limited query patterns | Good for write-heavy + scale |

For a URL shortener at 40 write QPS and 20K read QPS, **DynamoDB** or **Cassandra** is a natural fit — the access pattern is pure key-value lookup.

:::tip Senior-Level Insight
When deep diving, explain your reasoning process: *"I'm choosing DynamoDB here because our access pattern is exclusively key-value lookups — we always query by short_code. We don't need joins, complex queries, or transactions. DynamoDB gives us single-digit millisecond reads at any scale with zero operational overhead."*
:::

---

## 6. Step 5 — Bottlenecks & Trade-offs (5-10 minutes)

After the design is complete, proactively identify weaknesses and discuss mitigations.

### Single Points of Failure

| Component | Risk | Mitigation |
|-----------|------|-----------|
| **Database** | Primary goes down → writes fail | Multi-AZ deployment, automated failover |
| **Cache** | Redis crash → thundering herd to DB | Redis Cluster (replicated), fallback to DB |
| **Counter Service** | Unavailable → can't generate IDs | Pre-allocated ranges survive counter downtime |
| **Load Balancer** | LB failure → total outage | Redundant LBs, DNS failover, health checks |

### Scaling Bottlenecks

| Bottleneck | When It Hits | Solution |
|-----------|-------------|---------|
| **Single DB write capacity** | > 10K write QPS | Shard by hash of short_code |
| **Cache memory** | > 50GB active working set | Redis Cluster with consistent hashing |
| **Hot URLs** | Viral link gets 1M QPS | Local in-memory cache (L1) + CDN 301 caching |
| **Cross-region latency** | Global users > 200ms | Multi-region deployment with regional caches |

### Monitoring

| Metric | Why It Matters | Alert Threshold |
|--------|---------------|----------------|
| **p99 redirect latency** | User experience | > 100ms |
| **Cache hit ratio** | DB load protection | < 90% |
| **Error rate (5xx)** | Service health | > 0.1% |
| **DB connection pool usage** | Connection exhaustion | > 80% |
| **Hash collision rate** | Data integrity | Any non-zero |

---

## 7. API Design Best Practices

### RESTful Endpoint Design

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/users/{id}` | Retrieve a single resource |
| `GET` | `/api/v1/users?status=active&sort=created` | List with filtering and sorting |
| `POST` | `/api/v1/users` | Create a new resource |
| `PUT` | `/api/v1/users/{id}` | Full replacement of a resource |
| `PATCH` | `/api/v1/users/{id}` | Partial update of a resource |
| `DELETE` | `/api/v1/users/{id}` | Delete a resource |

### Pagination: Cursor vs Offset

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Offset** `?page=3&limit=20` | Simple, supports "jump to page N" | Slow for large offsets (`OFFSET 100000`), inconsistent with inserts | Admin dashboards, small datasets |
| **Cursor** `?cursor=eyJpZCI6MTIzfQ&limit=20` | Consistent with real-time inserts, fast at any depth | Can't jump to arbitrary page, cursor is opaque | Feeds, timelines, infinite scroll |
| **Keyset** `?after_id=123&limit=20` | Very fast (index-friendly), simple | Requires sortable, unique column | APIs with monotonic IDs |

#### Cursor Pagination Response Format

```json
{
  "data": [
    { "id": 456, "name": "Alice" },
    { "id": 457, "name": "Bob" }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6NDU3fQ==",
    "has_more": true
  }
}
```

### API Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/api/v1/users` | Explicit, easy to route | URL changes, caching complexity |
| **Header** | `Accept: application/vnd.api+json;version=2` | Clean URLs | Hidden, harder to test |
| **Query param** | `/api/users?version=2` | Simple | Pollutes query string |

:::tip Senior-Level Insight
In interviews, always choose **URL path versioning** — it's the most common and easiest to explain. Add: *"We'd maintain v1 for backward compatibility and deprecate it with a sunset header after 6-12 months of v2 availability."*
:::

### Request/Response Design Patterns

```json
// Successful response
{
  "data": { "id": "abc123", "short_url": "https://tny.im/abc123" },
  "metadata": { "request_id": "req-uuid-here", "timestamp": "2024-01-15T..." }
}

// Error response
{
  "error": {
    "code": "INVALID_URL",
    "message": "The provided URL is not a valid HTTP(S) URL",
    "details": { "field": "long_url", "value": "not-a-url" }
  },
  "metadata": { "request_id": "req-uuid-here" }
}
```

---

## 8. Data Model Design

### Schema Design Principles

| Principle | Detail |
|-----------|--------|
| **Start normalized** | 3NF for write-heavy paths, denormalize later for read optimization |
| **Choose the right DB type** | Relational for complex queries, Document for flexible schemas, KV for simple lookups |
| **Index strategically** | Only index columns used in WHERE, JOIN, ORDER BY |
| **Denormalize deliberately** | Trade write complexity for read performance — document why |
| **Plan for schema evolution** | Additive changes (new columns, new tables) are safe; destructive changes are not |

### Choosing the Right Database

| Database Type | Use When | Examples |
|--------------|----------|---------|
| **Relational (SQL)** | Complex queries, joins, transactions, ACID | PostgreSQL, MySQL, Aurora |
| **Document** | Flexible schema, nested data, rapid iteration | MongoDB, DynamoDB, Firestore |
| **Key-Value** | Simple lookups by key, caching, sessions | Redis, Memcached, DynamoDB |
| **Wide-Column** | Time-series, write-heavy, massive scale | Cassandra, HBase, ScyllaDB |
| **Graph** | Relationship-heavy queries (social networks, recommendations) | Neo4j, Neptune, TigerGraph |
| **Search** | Full-text search, faceted filtering, fuzzy matching | Elasticsearch, OpenSearch, Solr |
| **Time-Series** | Metrics, IoT, monitoring data | InfluxDB, TimescaleDB, Prometheus |

```
Decision Flow:

  Need ACID transactions?
    YES → Relational (PostgreSQL)
    NO  ↓

  Access pattern = key → value?
    YES → Key-Value (DynamoDB / Redis)
    NO  ↓

  Need full-text search?
    YES → Search engine (Elasticsearch)
    NO  ↓

  Write-heavy (>50K writes/sec)?
    YES → Wide-column (Cassandra)
    NO  ↓

  Schema changes frequently?
    YES → Document (MongoDB)
    NO  → Relational (PostgreSQL)
```

---

## 9. Component Design Pattern Reference

### When to Use Each Component

| Component | Signal | Example |
|-----------|--------|---------|
| **Load Balancer** | Multiple application servers | Any production system |
| **Cache (Redis)** | Read QPS > 1K, or latency < 10ms required | URL shortener reads, session store |
| **CDN** | Static assets, global users, media content | Image hosting, video streaming |
| **Message Queue** | Async processing, decoupling, spikes | Email sending, video transcoding |
| **Search Index** | Full-text search, complex filtering | Product search, log search |
| **Object Storage** | Files > 1MB (images, videos, backups) | Instagram photos, YouTube videos |
| **Rate Limiter** | API protection, abuse prevention | Public APIs, login endpoints |
| **Pub/Sub** | Fan-out to multiple consumers | Notification systems, event-driven |
| **Task Queue** | Long-running background jobs | Report generation, data export |
| **WebSocket** | Real-time bidirectional communication | Chat, live collaboration |

---

## 10. Common System Design Problems — Reference Table

| # | System | Key Challenges | Core Components | Estimated Scale |
|:-:|--------|---------------|-----------------|-----------------|
| 1 | **URL Shortener** | Hash generation, hot URLs, redirection latency | Hash service, KV store, cache, LB | 40 write QPS, 20K read QPS |
| 2 | **Twitter / News Feed** | Fan-out (push vs pull), timeline ranking, celebrity problem | Timeline service, fan-out service, cache, message queue | 60K read QPS, hybrid fan-out |
| 3 | **Instagram / Photo Sharing** | Image storage, feed generation, user graph | Object storage, CDN, feed service, graph DB | 2.7M uploads/day, PBs of storage |
| 4 | **Chat System (WhatsApp)** | Real-time delivery, ordering, presence, offline messages | WebSocket servers, message queue, presence service | 600K msgs/sec, 50M connections |
| 5 | **YouTube / Video Streaming** | Video transcoding, adaptive streaming, storage cost | Transcoding pipeline, CDN, object storage | 250 Tbps streaming bandwidth |
| 6 | **Rate Limiter** | Distributed counting, sliding windows, fairness | Token bucket / sliding window, Redis, API gateway | Per-endpoint, per-user limits |
| 7 | **Notification System** | Multi-channel (push, SMS, email), delivery tracking, priorities | Queue per channel, template engine, preference store | 30K sends/sec |
| 8 | **Search Autocomplete** | Low latency (< 50ms), ranking, personalization | Trie / prefix tree, distributed cache, ranking service | 100K QPS |
| 9 | **Distributed Cache** | Consistency, eviction, hot keys, partition tolerance | Consistent hashing, replication, LRU eviction | Millions ops/sec |
| 10 | **Web Crawler** | Politeness, deduplication, scale, priority | URL frontier, DNS resolver, content store, dedup (Bloom filter) | Billions of pages |
| 11 | **Uber / Ride Sharing** | Location matching, ETA, surge pricing, real-time tracking | Geospatial index, matching service, pricing engine | Millions of location updates/min |
| 12 | **Dropbox / File Sync** | Chunking, dedup, conflict resolution, sync protocol | Block server, metadata DB, notification service | PBs of storage |
| 13 | **Ticketmaster / Booking** | Inventory contention, seat selection, fairness queue | Distributed lock, queue, reservation service | Spiky traffic (100K QPS bursts) |
| 14 | **Metrics / Monitoring** | High write throughput, aggregation, alerting | Time-series DB, stream processing, alert engine | Millions of data points/sec |
| 15 | **Payment System** | Exactly-once processing, idempotency, reconciliation | Ledger DB, idempotency store, payment gateway | Strong consistency required |
| 16 | **E-commerce / Amazon** | Product catalog, cart, checkout, recommendations | Catalog service, cart service, order service, search | Mixed read/write, multi-service |
| 17 | **Google Maps** | Routing algorithms, tile rendering, ETA, real-time traffic | Graph DB, tile server, traffic ingestion, Dijkstra/A* | Massive geospatial data |
| 18 | **Collaborative Editor (Google Docs)** | Real-time sync, conflict resolution, cursor presence | OT/CRDT engine, WebSocket, document store | Low latency, strong ordering |
| 19 | **Key-Value Store** | Partitioning, replication, consistency, failure detection | Consistent hashing, gossip protocol, Merkle trees | Depends on SLA |
| 20 | **Ad Click Aggregation** | Real-time counting, deduplication, fraud detection | Stream processing (Flink/Spark), OLAP store, dedup | Millions of events/sec |

---

## 11. Trade-off Discussion Framework

Every design decision involves trade-offs. Use this framework to structure your reasoning:

### The CAP Theorem in Practice

| Property | Definition | Sacrifice It When |
|----------|-----------|-------------------|
| **Consistency** | Every read returns the most recent write | Social media feeds (eventual consistency OK) |
| **Availability** | Every request gets a non-error response | Banking systems (better to reject than give wrong balance) |
| **Partition Tolerance** | System works despite network partitions | Never — network partitions are inevitable |

### Common Trade-offs

| Trade-off | Option A | Option B | Decision Signal |
|-----------|----------|----------|----------------|
| **Consistency vs Availability** | Strong consistency (CP) | High availability (AP) | Financial = CP; Social = AP |
| **Latency vs Throughput** | Optimize for fast individual requests | Optimize for high total processing | Interactive = latency; Batch = throughput |
| **Latency vs Consistency** | Read from primary (latest data, higher latency) | Read from replica (stale, lower latency) | Show stale for 1s? If OK → replica |
| **Simplicity vs Scalability** | Monolith, single DB | Microservices, sharded | Current scale vs. anticipated scale |
| **Cost vs Performance** | Smaller instances, fewer replicas | Over-provisioned, multi-region | Budget constraints vs SLA requirements |
| **Read vs Write Optimization** | Normalize (fewer writes, complex reads) | Denormalize (fast reads, complex writes) | Read:write ratio drives this |
| **Push vs Pull** | Server pushes updates (WebSocket, SSE) | Client pulls updates (polling) | Real-time needs vs simplicity |

### How to Present Trade-offs in Interviews

```
Framework: "We could go with A or B. A gives us [benefit] but costs
[downside]. B gives us [benefit] but costs [downside]. Given our
requirements of [specific requirement], I'd choose A because [reason]."

Example: "We could use strong consistency with a single PostgreSQL 
primary, or eventual consistency with Cassandra replicas. Strong 
consistency gives us accurate read-after-write but limits our write 
throughput to one region. Eventual consistency lets us scale writes 
globally but users might see stale data for up to 2 seconds. Given 
that this is a social media feed — not a banking system — I'd choose 
eventual consistency because users won't notice a 2-second delay in 
seeing a new post."
```

:::tip Senior-Level Insight
The best candidates don't just identify trade-offs — they **quantify** them: *"Strong consistency adds ~5ms to every read because we must hit the primary. At 100K QPS, that's 500 CPU-seconds per second of additional primary load. With eventual consistency and a 500ms replication lag, we can distribute reads across 5 replicas and reduce primary load by 80%."*
:::

---

## 12. What Interviewers Look For

### Evaluation Criteria (Ranked by Importance)

| Criteria | Weight | What They Observe |
|----------|:------:|-------------------|
| **Problem-solving process** | ★★★★★ | Do you clarify requirements before designing? |
| **Communication** | ★★★★★ | Can you explain your thinking clearly? Do you check in? |
| **Trade-off awareness** | ★★★★☆ | Do you acknowledge what you give up with each choice? |
| **Technical depth** | ★★★★☆ | Can you go deep on at least 2-3 components? |
| **Scalability reasoning** | ★★★☆☆ | Do you think about what happens at 10× or 100× scale? |
| **Breadth of knowledge** | ★★★☆☆ | Do you know when to use which technology? |
| **Practical experience** | ★★☆☆☆ | Have you built or operated something similar? |

### Green Flags (What Impresses Interviewers)

- Asking clarifying questions before drawing anything
- Explicitly stating assumptions and constraints
- Drawing a clean, layered architecture diagram
- Proactively discussing failure modes and mitigations
- Quantifying trade-offs (latency, cost, complexity)
- Adapting the design when the interviewer changes requirements
- Mentioning operational concerns (monitoring, alerting, deployment)

### Red Flags (What Concerns Interviewers)

- Jumping straight to "I'd use Kafka, Redis, and Kubernetes"
- Not asking about scale or requirements
- Using buzzwords without understanding (e.g., "blockchain for everything")
- Refusing to make a decision ("it depends" without committing)
- Designing a system for Google's scale when the problem says "startup"
- Not acknowledging trade-offs — every "perfect" design is suspicious
- Going silent for long periods

---

## 13. Common Mistakes & How to Avoid Them

| Mistake | Impact | Fix |
|---------|--------|-----|
| **No requirements phase** | Design misses the point entirely | Always spend 5 minutes clarifying |
| **Designing for the wrong scale** | Over/under-engineering | Do back-of-envelope estimation |
| **"We'll use microservices"** | Unnecessary complexity for small-scale | Start with monolith, extract later |
| **Ignoring data model** | Can't answer "how is data stored?" | Sketch the schema early |
| **No API design** | Unclear interface contracts | Define 3-5 key endpoints |
| **"We'll use NoSQL because it scales"** | Not always the right choice | Choose DB based on access patterns |
| **Forgetting about failure** | Design assumes everything works | Discuss SPOF, retries, failover |
| **Too many components** | Diagram becomes unreadable | 5-8 components max in high-level design |
| **No mention of monitoring** | Shows lack of production experience | Mention metrics, logging, alerting |
| **Not adapting to hints** | Interviewer drops hints, candidate ignores them | Listen carefully, follow their lead |

---

## 14. Complete Walkthrough — Design a URL Shortener

Putting it all together with a 45-minute interview simulation.

### Phase 1: Requirements (5 min)

```
"Let me start by clarifying the requirements."

Functional:
  1. Given a long URL → generate short URL
  2. Short URL → redirect to long URL (301)
  3. Optional: custom aliases
  4. Optional: URL expiration (TTL)

Non-Functional:
  - 100M new URLs/month
  - 100:1 read:write ratio
  - Redirect latency < 100ms (p99)
  - High availability (99.99%)
  - Short URLs should be unpredictable
  - 5-year retention

Out of Scope:
  - Analytics, user accounts, link editing
```

### Phase 2: Estimation (3 min)

```
"Let me do some quick math."

QPS:
  Write: 100M / 2.5M sec/month ≈ 40 QPS
  Read:  40 × 100 = 4,000 QPS
  Peak:  20,000 QPS

Storage:
  250 bytes per record × 6B records (5 years) = 1.5 TB

Cache:
  Top 20% of URLs: 1.2B × 250B = 300 GB (6 Redis nodes)

"This is moderate scale — we don't need aggressive sharding yet,
but we do need a cache layer to absorb the reads."
```

### Phase 3: High-Level Design (8 min)

```
┌──────────┐     HTTPS     ┌──────────────┐     ┌──────────────────┐
│ Clients  │──────────────►│   Load       │────►│   API Servers    │
│ (Web /   │◄──────────────│   Balancer   │◄────│   (Stateless)    │
│  Mobile) │   301/404     │              │     │   Auto-scaling   │
└──────────┘               └──────────────┘     └────────┬─────────┘
                                                         │
                                          ┌──────────────┼──────────┐
                                          │              │          │
                                          ▼              ▼          ▼
                                    ┌──────────┐  ┌──────────┐  ┌────────┐
                                    │  Redis   │  │  Counter │  │   DB   │
                                    │  Cache   │  │  Service │  │(Dynamo │
                                    │  Cluster │  │  (ZK)    │  │  DB)   │
                                    └──────────┘  └──────────┘  └────────┘

API Endpoints:
  POST /api/v1/urls     → Create short URL
  GET  /{short_code}    → Redirect (301)
  DELETE /api/v1/urls/{short_code} → Delete (optional)
```

### Phase 4: Detailed Design (15 min)

**Deep Dive 1: Hash Generation**
- Counter service (ZooKeeper) assigns ID ranges to API servers
- Each server encodes IDs using base62 → 7-character short codes
- 62^7 = 3.5 trillion combinations → sufficient for decades
- No runtime collision detection needed

**Deep Dive 2: Read Path**
- Client → LB → API Server → Redis (cache hit? → 301 redirect)
- Cache miss → DynamoDB lookup → populate Redis → 301 redirect
- 404 if not found in DB
- Cache TTL: 24 hours (hot URLs stay cached, cold URLs evict)

**Deep Dive 3: Data Model**

```
DynamoDB Table: urls
─────────────────────────────────────────────
Partition Key: short_code (String, 7 chars)
─────────────────────────────────────────────
Attributes:
  long_url      String    (original URL)
  created_at    Number    (epoch timestamp)
  expires_at    Number    (epoch timestamp, TTL)
  creator_ip    String    (for abuse prevention)
─────────────────────────────────────────────
DynamoDB TTL enabled on expires_at → auto-deletion
```

### Phase 5: Bottlenecks & Trade-offs (5 min)

```
"Let me address potential issues proactively."

1. Hot URLs (viral link):
   - L1 cache in API server memory (LRU, 1000 entries)
   - CDN caching of 301 redirects (Cache-Control: max-age=300)
   - This means the origin only sees 1/300th of traffic for hot URLs

2. Counter service failure:
   - Each server pre-allocates a range of 1M IDs
   - Even if ZooKeeper is down for hours, servers can continue
   - generating short codes from their local pool

3. Availability:
   - API servers: auto-scaling group across 3 AZs
   - DynamoDB: managed, multi-AZ by default
   - Redis: 3-node cluster with automatic failover

4. Trade-off acknowledged:
   - We chose eventual consistency for the cache (TTL-based)
   - A newly created URL might not be in cache for up to 24h
   - But we always fall back to DB, so correctness is maintained
   - Latency is slightly higher on first access (~10ms DB vs ~1ms cache)

5. Monitoring:
   - p99 redirect latency (target < 100ms)
   - Cache hit ratio (target > 90%)
   - Counter service health
   - DynamoDB consumed capacity vs provisioned
```

---

## 📚 Key Takeaways

| # | Principle |
|:-:|-----------|
| 1 | **Follow the 5-step framework** — Requirements → Estimation → High-Level → Detailed → Bottlenecks |
| 2 | **Requirements first, always** — 5 minutes of clarification saves 30 minutes of wrong design |
| 3 | **Estimate to drive decisions** — Numbers tell you whether you need 1 server or 100 |
| 4 | **Go deep, not wide** — Detail on 2-3 components beats surface coverage of 10 |
| 5 | **State trade-offs explicitly** — Every choice has a cost; show you understand it |
| 6 | **Design for the stated scale** — Don't over-engineer for Google when the problem says startup |
| 7 | **Communicate continuously** — Check in with the interviewer, follow their cues |
| 8 | **Address failure modes** — SPOF analysis and mitigation shows production experience |
| 9 | **Mention monitoring** — Metrics, alerts, and logging demonstrate operational maturity |
| 10 | **Practice the framework** — Run through 10+ problems until the structure becomes automatic |
