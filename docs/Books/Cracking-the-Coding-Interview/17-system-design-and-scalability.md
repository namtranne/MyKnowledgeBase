# Chapter 9 — System Design and Scalability

> System design questions evaluate your ability to think at scale. There is no single "correct" answer — the interviewer wants to see your thought process, trade-off analysis, and ability to communicate a coherent architecture under ambiguity.

---

## Handling the Questions

### Communication Is Everything

```
┌──────────────────────────────────────────────────────────────┐
│  System Design Interview Mindset                             │
│                                                              │
│  ✓ Think out loud — silence is your enemy                    │
│  ✓ Start broad, then dive deep                               │
│  ✓ Use the whiteboard / diagram actively                     │
│  ✓ Acknowledge trade-offs ("We could do X, but that means Y")│
│  ✓ State assumptions explicitly                              │
│  ✓ Estimate when you don't have exact numbers                │
│  ✓ Drive the discussion — don't wait to be told what to do   │
│  ✗ Don't jump into components before understanding scope     │
│  ✗ Don't present a single approach as the only option        │
│  ✗ Don't ignore the interviewer's hints                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Design Step-By-Step

### The 5-Step Framework

```
Step 1: SCOPE the problem
  │  "What features are we building?"
  │  "How many users? Read-heavy or write-heavy?"
  │  "What are the most important use cases?"
  │
  ▼
Step 2: HIGH-LEVEL architecture
  │  Draw the major components: clients, servers, databases,
  │  caches, load balancers, message queues
  │
  ▼
Step 3: DESIGN key components
  │  API design, data model, core algorithms
  │  "How does the news feed get assembled?"
  │
  ▼
Step 4: Identify BOTTLENECKS
  │  What breaks at scale?
  │  Single points of failure?
  │  Hot spots? Data too large for one machine?
  │
  ▼
Step 5: SCALE the design
     Add caching, sharding, replication, CDN, etc.
     Address each bottleneck with a specific solution.
```

---

## Key Concepts

### Horizontal vs Vertical Scaling

| Type | Description | Pros | Cons |
|------|-------------|------|------|
| **Vertical** | Add more power to one machine (more CPU, RAM) | Simple, no code changes | Hardware limits, single point of failure |
| **Horizontal** | Add more machines | Near-infinite scale, redundancy | Complexity (distributed systems) |

> Real systems use both: scale vertically until you hit limits, then scale horizontally.

### Load Balancing

Distributes incoming traffic across multiple servers.

```
                    ┌──────────┐
                    │  Client  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │   Load   │
                    │ Balancer │
                    └──┬──┬──┬─┘
                   ┌───┘  │  └───┐
              ┌────▼──┐┌──▼───┐┌─▼────┐
              │Server1││Server2││Server3│
              └───────┘└──────┘└──────┘
```

**Algorithms:**
- **Round Robin** — rotate through servers sequentially
- **Least Connections** — send to server with fewest active connections
- **IP Hash** — hash client IP to consistently route to same server
- **Weighted** — assign more traffic to more powerful servers

### Database Partitioning (Sharding)

Split data across multiple databases to handle scale.

| Strategy | How | Example |
|----------|-----|---------|
| **Horizontal (Sharding)** | Split rows across DBs | Users A-M on DB1, N-Z on DB2 |
| **Vertical** | Split tables/columns across DBs | User profiles on DB1, posts on DB2 |
| **Directory-based** | Lookup service maps key → shard | Flexible but adds a hop |

```
┌─────────────────────────────────────────────────┐
│  Hash-based sharding:                           │
│                                                 │
│  shard = hash(user_id) % num_shards             │
│                                                 │
│  user_id=123 → hash=7 → 7 % 4 = 3 → Shard 3   │
│  user_id=456 → hash=2 → 2 % 4 = 2 → Shard 2   │
│                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Shard 0 │ │Shard 1 │ │Shard 2 │ │Shard 3 │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
└─────────────────────────────────────────────────┘
```

> **Challenges:** Cross-shard queries, rebalancing when adding shards, join operations.

### Database Denormalization and NoSQL

| Aspect | Normalized (SQL) | Denormalized / NoSQL |
|--------|-----------------|---------------------|
| Data duplication | Minimal | Intentional duplication |
| Read performance | Joins required (slower) | Pre-joined data (faster) |
| Write performance | Single update | Update multiple copies |
| Consistency | Strong (ACID) | Eventual (BASE) |
| Schema | Fixed schema | Flexible schema |
| Best for | Complex relationships | Read-heavy, high-scale workloads |

### Caching

Store frequently accessed data in fast storage (memory) to reduce database load.

```
┌────────┐     ┌───────┐     ┌──────────┐
│ Client │────▶│ Cache │────▶│ Database │
│        │◀────│(Redis)│◀────│          │
└────────┘     └───────┘     └──────────┘
                hit? ✓ return
                miss? → query DB → store in cache → return
```

**Cache Invalidation Strategies:**

| Strategy | Description | Trade-off |
|----------|-------------|-----------|
| **Cache-aside** | App manages cache: check cache → miss → query DB → update cache | Most common, risk of stale data |
| **Write-through** | Write to cache and DB simultaneously | Consistent but slower writes |
| **Write-behind** | Write to cache, async write to DB | Fast writes, risk of data loss |
| **TTL (Time-to-Live)** | Auto-expire entries after N seconds | Simple, eventual consistency |

**Eviction Policies:** LRU (Least Recently Used), LFU (Least Frequently Used), FIFO

### Asynchronous Processing & Message Queues

Decouple components with a message queue for work that doesn't need immediate response.

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│ Producer │────▶│  Message  │────▶│ Consumer │
│ (Web App)│     │  Queue    │     │ (Worker) │
└──────────┘     │(Kafka/SQS)│     └──────────┘
                 └───────────┘

Use cases:
  • Email sending       • Image processing
  • Log aggregation     • Order processing
  • Analytics events    • Search indexing
```

> Message queues absorb traffic spikes, enable retry logic, and let you scale producers and consumers independently.

### Networking Metrics

| Metric | Definition | Analogy |
|--------|-----------|---------|
| **Bandwidth** | Maximum data transfer rate | Width of a pipe |
| **Throughput** | Actual data transfer rate | Water flowing through the pipe |
| **Latency** | Time for data to travel from A to B | How long it takes a drop of water |

### MapReduce

A programming model for processing large datasets in parallel across a cluster.

```
Input:  "the cat sat on the mat the cat"

Map phase (parallel per chunk):
  "the" → 1,  "cat" → 1,  "sat" → 1,  "on" → 1
  "the" → 1,  "mat" → 1,  "the" → 1,  "cat" → 1

Shuffle (group by key):
  "the" → [1, 1, 1]
  "cat" → [1, 1]
  "sat" → [1]
  "on"  → [1]
  "mat" → [1]

Reduce phase (parallel per key):
  "the" → 3
  "cat" → 2
  "sat" → 1
  "on"  → 1
  "mat" → 1
```

---

## Enriched Concepts

### CAP Theorem

In a distributed system, you can only guarantee two of three:

```
         Consistency
            /\
           /  \
          /    \
         /  CP  \
        /________\
       /\   CA   /\
      /  \      /  \
     / AP \    /    \
    /______\  /______\
Availability   Partition
                Tolerance
```

| Choice | Guarantees | Sacrifices | Example |
|--------|-----------|-----------|---------|
| **CP** | Consistency + Partition Tolerance | Availability (may reject requests) | MongoDB, HBase |
| **AP** | Availability + Partition Tolerance | Consistency (may return stale data) | Cassandra, DynamoDB |
| **CA** | Consistency + Availability | Partition Tolerance (unrealistic in distributed systems) | Single-node RDBMS |

> In practice, network partitions DO happen, so you're really choosing between CP and AP.

### Consistent Hashing

Solves the problem of redistribution when adding/removing servers from a hash-based system.

```
Traditional hashing:                    Consistent hashing:
  server = hash(key) % N                Hash ring with virtual nodes
  Adding a server remaps most keys!      Adding a server remaps only K/N keys

  ┌─────────────── Hash Ring ────────────────┐
  │                                          │
  │           S1                             │
  │         /    \                           │
  │       k1      k2                         │
  │      /          \                        │
  │    S4            S2                      │
  │      \          /                        │
  │       k4      k3                         │
  │         \    /                           │
  │           S3                             │
  │                                          │
  └──────────────────────────────────────────┘

  Each key maps to the next server clockwise on the ring.
  Adding S5 only affects keys between S4 and S5.
```

### Content Delivery Network (CDN)

Geographically distributed servers that cache static content close to users.

```
Without CDN:                 With CDN:
  User (Tokyo) ──────────▶   User (Tokyo) ──▶ CDN Edge (Tokyo)
  Origin (NYC)                                 Cache hit? Serve!
  Latency: ~200ms                              Cache miss? → Origin
                                               Latency: ~20ms (hit)
```

**Cache:** Static assets (images, CSS, JS, videos). Some CDNs also cache dynamic content.

### Rate Limiting

Protect services from abuse and ensure fair usage.

| Algorithm | Description |
|-----------|-------------|
| **Token Bucket** | Tokens added at fixed rate; request consumes a token; rejected if empty |
| **Sliding Window** | Track request count in a time window that slides forward |
| **Fixed Window** | Count requests per fixed time interval; reset at boundary |
| **Leaky Bucket** | Requests processed at a constant rate; excess queued or dropped |

### API Gateway

A single entry point for all client requests that handles cross-cutting concerns.

```
┌────────┐    ┌─────────────┐    ┌──────────────┐
│ Client │───▶│ API Gateway │───▶│ Service A    │
│        │    │             │───▶│ Service B    │
│        │    │• Auth       │───▶│ Service C    │
│        │    │• Rate limit │    └──────────────┘
│        │    │• Routing    │
│        │    │• SSL term   │
└────────┘    └─────────────┘
```

---

## Considerations

### Failures

- **Single Point of Failure (SPOF):** Any component whose failure takes down the system
- **Redundancy:** Run multiple instances of critical components
- **Failover:** Automatic switch to a standby on failure (active-passive, active-active)
- **Graceful degradation:** Serve partial results or cached data when components fail

### Availability and Reliability

| Availability | Downtime/Year | Downtime/Month |
|-------------|---------------|----------------|
| 99% ("two nines") | 3.65 days | 7.3 hours |
| 99.9% ("three nines") | 8.76 hours | 43.8 minutes |
| 99.99% ("four nines") | 52.6 minutes | 4.38 minutes |
| 99.999% ("five nines") | 5.26 minutes | 26.3 seconds |

### Read-Heavy vs Write-Heavy

| System | Strategy |
|--------|----------|
| Read-heavy (100:1) | Aggressive caching, read replicas, CDN |
| Write-heavy (1:100) | Write-behind caching, async processing, eventual consistency |
| Balanced | Careful balance of both strategies |

---

## Example Problem: Design a URL Shortener

### Step 1: Scope

- Core features: shorten URL, redirect, analytics (optional)
- Scale: 100M URLs created/month, 10:1 read/write ratio
- URL length: as short as possible

### Step 2: High-Level Design

```
┌────────┐    ┌─────────┐    ┌────────────┐
│ Client │───▶│   API   │───▶│  Database  │
│        │    │ Server  │    │ (key-value)│
│        │    │         │───▶│   Cache    │
└────────┘    └─────────┘    └────────────┘
```

### Step 3: Key Design Decisions

**Encoding:** Base62 (a-z, A-Z, 0-9) → 7 characters gives 62^7 ≈ 3.5 trillion unique URLs.

**ID Generation:**
- Auto-increment → predictable, single point of failure
- Hash (MD5/SHA256) → collision possible, truncation needed
- Pre-generated unique IDs → distributed-friendly

**Data model:**
```
URL Table:
  short_url (PK) | original_url | created_at | expiry | user_id
  "abc1234"      | "https://..."| 2024-01-01 | ...    | 42
```

### Step 4-5: Scale

- **Cache popular URLs** (Pareto: 20% of URLs get 80% of traffic)
- **Database sharding** by hash of short URL
- **Load balancer** in front of API servers
- **CDN** for 301 redirects at the edge

---

## Interview Questions Overview

System design questions typically covered in CTCI include:

1. **Stock Data** — Design a system to provide real-time stock prices
2. **Social Network** — Design a service that searches the social graph for connections
3. **Web Crawler** — Design a web crawler that avoids infinite loops
4. **Duplicate URLs** — Detect duplicate documents in 10B URLs
5. **Cache** — Design a cache with LRU eviction for a search engine
6. **Sales Rank** — Design a system that computes best-seller rank for products
7. **Personal Financial Manager** — Design a service that aggregates financial data
8. **Pastebin** — Design a system like Pastebin where users can share text

> Each of these follows the same framework: Scope → Architecture → Components → Bottlenecks → Scale.

---

## Back-of-the-Envelope Estimation Cheat Sheet

| Metric | Value |
|--------|-------|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 7 ns |
| RAM reference | 100 ns |
| SSD random read | 150 μs |
| HDD seek | 10 ms |
| Round trip within datacenter | 500 μs |
| Round trip coast-to-coast | 150 ms |

| Scale | Approximate |
|-------|------------|
| Seconds in a day | 86,400 ≈ 10^5 |
| Seconds in a year | 31.5M ≈ 3 × 10^7 |
| QPS from 1M daily users | ~12 QPS (1M / 86400) |
| 1 KB × 1M = 1 GB |
| 1 KB × 1B = 1 TB |

---

## Key Takeaways

1. **There is no perfect system** — every design involves trade-offs
2. **Scope before designing** — know what you're building and for whom
3. **Start simple, scale incrementally** — don't over-engineer from the start
4. **Know the building blocks** — LB, cache, DB, queue, CDN, sharding
5. **Estimate, don't guess** — back-of-the-envelope math shows analytical thinking
6. **Think about failures** — what happens when each component goes down?
7. **CAP theorem drives database choices** — understand the trade-off you're making
8. **Communication is half the grade** — explain your thinking, discuss alternatives
