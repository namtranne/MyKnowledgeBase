---
sidebar_position: 5
title: "04 — Scaling Reads"
---

# 📖 Scaling Reads

Most production systems are **read-heavy** — ratios of 100:1 or even 1000:1 (reads to writes) are common. Scaling reads is about moving data closer to the consumer, precomputing answers, and reducing the load on your primary database.

---

## 🔍 The Core Problem

A single database instance has finite capacity. As read traffic grows, you hit these limits:

| Bottleneck | Symptom | Typical Threshold |
|-----------|---------|-------------------|
| **CPU** | Query execution slows down | Complex queries saturate cores |
| **Connections** | Connection pool exhausted | PostgreSQL: ~500 connections per instance |
| **Disk I/O** | High read latency | When working set exceeds buffer pool |
| **Network** | Bandwidth saturation | Large result sets, many concurrent queries |
| **Lock contention** | Writers block readers (or vice versa) | MVCC helps, but vacuum / DDL still blocks |

The goal: serve reads **without hitting the primary database** whenever possible.

### The Read Scaling Pyramid

```
                    ┌───────────────┐
                    │   Browser     │  ← Fastest: cached in user's browser
                    │   Cache       │
                    ├───────────────┤
                    │     CDN       │  ← Edge: cached geographically close
                    ├───────────────┤
                    │  Application  │  ← In-memory: L1 cache (local)
                    │  Local Cache  │
                    ├───────────────┤
                    │  Distributed  │  ← Shared: L2 cache (Redis/Memcached)
                    │    Cache      │
                    ├───────────────┤
                    │  Read         │  ← Database-level: replicated copies
                    │  Replicas     │
                    ├───────────────┤
                    │  Search       │  ← Specialized: Elasticsearch, views
                    │  Index / MV   │
                    ├───────────────┤
                    │  Primary DB   │  ← Origin: single source of truth
                    └───────────────┘
```

Each layer up is faster but introduces staleness. The art is choosing the right layer for each use case.

---

## 🔧 Approach 1: Read Replicas

Create copies of the primary database that serve read traffic. The primary handles writes and replicates changes to replicas.

### Architecture

```
                         Writes
                    ┌──────────────┐
     Application ──►│   Primary    │
                    │   (Leader)   │
                    └──────┬───────┘
                           │
              Replication Stream (WAL)
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ Replica 1│   │ Replica 2│   │ Replica 3│
     │ (reads)  │   │ (reads)  │   │ (reads)  │
     └──────────┘   └──────────┘   └──────────┘
            ▲              ▲              ▲
            └──────────────┼──────────────┘
                           │
                    Application (reads)
```

### Replication Modes

| Mode | Behavior | Latency Impact | Data Loss Risk |
|------|----------|---------------|----------------|
| **Synchronous** | Primary waits for replica ACK before committing | Higher write latency | None |
| **Asynchronous** | Primary commits immediately, replicates in background | No write impact | Possible (replica lag) |
| **Semi-synchronous** | Primary waits for at least 1 replica ACK | Moderate write impact | Minimal |

### The Replica Lag Problem

With async replication, replicas can be seconds behind the primary. This creates **read-after-write inconsistency**:

```
1. User updates profile name → Write goes to Primary
2. User refreshes page → Read goes to Replica (which hasn't received the update yet)
3. User sees old name → Confused, thinks the update was lost
```

### Solutions for Replica Lag

| Strategy | Description | Trade-off |
|----------|-------------|-----------|
| **Read-your-writes** | Route reads to primary for N seconds after a write | Primary gets more load |
| **Monotonic reads** | Pin a user session to a specific replica | Uneven replica load |
| **Causal consistency** | Track write positions, only read from replicas that are caught up | Implementation complexity |
| **Primary for critical reads** | Always read sensitive data from primary | Limits replica effectiveness |

```python
class ReadRouter:
    def __init__(self, primary, replicas):
        self.primary = primary
        self.replicas = replicas
        self.recent_writes = {}  # user_id -> last_write_time
    
    def get_connection(self, user_id, query_type="read"):
        if query_type == "write":
            self.recent_writes[user_id] = time.time()
            return self.primary
        
        # Read-after-write: use primary for 5 seconds after a write
        last_write = self.recent_writes.get(user_id, 0)
        if time.time() - last_write < 5:
            return self.primary
        
        return random.choice(self.replicas)
```

### When to Use Read Replicas

- Read-heavy workloads (> 10:1 read:write ratio)
- Geographically distributed users (place replicas in different regions)
- Analytics/reporting queries that shouldn't impact production writes
- High-availability requirements (promote replica on primary failure)

---

## 🔧 Approach 2: Caching

Store frequently accessed data in a faster storage layer to avoid repeated database queries.

### Cache Topologies

#### L1: In-Process Cache

Data cached in application memory (HashMap, Caffeine, Guava).

```java
LoadingCache<Long, Product> productCache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(5, TimeUnit.MINUTES)
    .build(productId -> productRepository.findById(productId));

Product product = productCache.get(42L);  // DB hit on first call, cache hit after
```

| Pros | Cons |
|------|------|
| Nanosecond access (no network hop) | Not shared across instances |
| No infrastructure to manage | Duplicated data across instances |
| Simple API | Memory pressure on application JVM |
| No serialization cost | Inconsistency between instances |

#### L2: Distributed Cache (Redis / Memcached)

Shared cache accessible by all application instances.

```python
def get_product(product_id):
    cache_key = f"product:{product_id}"
    
    # L1: Check local cache first
    cached = local_cache.get(cache_key)
    if cached:
        return cached
    
    # L2: Check Redis
    cached = redis.get(cache_key)
    if cached:
        product = deserialize(cached)
        local_cache.set(cache_key, product, ttl=60)  # Populate L1
        return product
    
    # L3: Database
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    redis.setex(cache_key, 300, serialize(product))  # Populate L2 (5 min TTL)
    local_cache.set(cache_key, product, ttl=60)       # Populate L1 (1 min TTL)
    
    return product
```

#### CDN: Edge Cache

Cache static and semi-static content at edge locations geographically close to users.

```
User in Sydney → CDN Edge in Sydney (cache hit, 5ms)
                     vs
User in Sydney → Origin in us-east-1 (cache miss, 200ms)
```

**Best for:** Images, CSS, JS, API responses that change infrequently (product listings, public profiles).

### Cache Patterns

#### Cache-Aside (Lazy Loading)

Application manages the cache explicitly.

```
Read:  App → Cache → miss → DB → populate Cache → return
Write: App → DB → invalidate Cache
```

| Pros | Cons |
|------|------|
| Simple to implement | First request always cache miss |
| Only caches what's actually read | Cache and DB can diverge |
| Resilient to cache failure | Application code coupled to caching logic |

#### Read-Through

Cache sits between the app and the DB. Cache handles DB fetches on miss.

```
Read: App → Cache → miss → Cache fetches from DB → returns to App
```

| Pros | Cons |
|------|------|
| Application code is simpler | Cache must understand DB schema |
| Consistent cache population | Complex cache configuration |

#### Write-Through

Every write goes through the cache to the DB.

```
Write: App → Cache → DB (synchronous)
Read:  App → Cache (always warm)
```

| Pros | Cons |
|------|------|
| Cache is always consistent | Higher write latency (double write) |
| No cache misses after first load | Caches data that may never be read |

#### Write-Behind (Write-Back)

Cache accepts writes and asynchronously flushes to the DB.

```
Write: App → Cache → (async) → DB
Read:  App → Cache (always warm)
```

| Pros | Cons |
|------|------|
| Very low write latency | Risk of data loss if cache crashes before flush |
| Batches writes to DB | Complexity of async flush management |
| Absorbs write spikes | Data inconsistency window |

### Cache Invalidation

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

| Strategy | Mechanism | Staleness | Complexity |
|----------|-----------|-----------|------------|
| **TTL-based** | Cache entries expire after a set time | Up to TTL seconds | Very Low |
| **Event-driven** | Invalidate on write events (CDC, message bus) | Seconds | Medium |
| **Write-through** | Update cache on every write | None | Medium |
| **Version-based** | Cache key includes a version hash | None | Low |
| **Manual** | Application explicitly invalidates | Depends on code | Low-Medium |

### The Cache Stampede (Thundering Herd)

When a popular cache entry expires, hundreds of concurrent requests all miss the cache simultaneously and hit the database at once.

```
Cache: product:42 expires
  
Thread 1: cache miss → query DB ───────┐
Thread 2: cache miss → query DB ───────┤
Thread 3: cache miss → query DB ───────┤  All hit DB simultaneously!
Thread 4: cache miss → query DB ───────┤
Thread 5: cache miss → query DB ───────┘
```

**Solutions:**

| Solution | How It Works |
|----------|-------------|
| **Lock on miss** | First thread acquires a lock and fetches; others wait for it |
| **Probabilistic early expiry** | Randomly refresh before actual TTL (XFetch algorithm) |
| **Background refresh** | A background job refreshes popular keys before they expire |
| **Stale-while-revalidate** | Return stale data immediately while fetching fresh data async |

```python
# Lock-based stampede prevention
def get_with_lock(key, fetch_fn, ttl=300):
    value = cache.get(key)
    if value is not None:
        return value
    
    lock_key = f"lock:{key}"
    if cache.set(lock_key, "1", nx=True, ex=5):  # Acquire lock
        try:
            value = fetch_fn()
            cache.setex(key, ttl, value)
            return value
        finally:
            cache.delete(lock_key)
    else:
        # Another thread is fetching — wait and retry
        time.sleep(0.05)
        return get_with_lock(key, fetch_fn, ttl)
```

---

## 🔧 Approach 3: CQRS (Command Query Responsibility Segregation)

Separate the **write model** (optimized for updates) from the **read model** (optimized for queries). Each model has its own data store and schema.

### Architecture

```
                     ┌──────────────────┐
                     │    Commands      │
                     │  (Create, Update,│
                     │   Delete)        │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐       ┌──────────────────┐
                     │   Write Store    │──CDC──►│   Event Bus      │
                     │   (Normalized,   │       │   (Kafka)        │
                     │    PostgreSQL)   │       └────────┬─────────┘
                     └──────────────────┘                │
                                                         │
                              ┌───────────────────┬──────┴─────────┐
                              ▼                   ▼                ▼
                     ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
                     │  Read Store  │    │  Read Store  │  │  Read Store  │
                     │  (Feed view) │    │  (Search)    │  │  (Analytics) │
                     │  Denormalized│    │ Elasticsearch│  │  ClickHouse  │
                     │  Redis/Mongo │    │              │  │              │
                     └──────────────┘    └──────────────┘  └──────────────┘
                              ▲                   ▲                ▲
                              │                   │                │
                     ┌──────────────────────────────────────────────┐
                     │                  Queries                     │
                     │  (List, Search, Aggregate, Dashboard)        │
                     └──────────────────────────────────────────────┘
```

### Why CQRS Works

| Concern | Without CQRS | With CQRS |
|---------|-------------|-----------|
| **Schema** | One schema serves both reads and writes (compromise) | Read schema optimized for queries, write schema for integrity |
| **Scaling** | Scale entire database for read load | Scale read stores independently |
| **Performance** | Complex JOINs for read queries | Pre-joined, denormalized read views |
| **Technology** | One database technology for all patterns | Best tool for each: Postgres writes, Redis reads, ES search |

### Practical Example: E-Commerce Product Catalog

**Write Model (PostgreSQL — normalized):**

```sql
-- Normalized for write integrity
products: (id, name, description, brand_id, category_id, created_at)
prices: (product_id, currency, amount, effective_from, effective_to)
inventory: (product_id, warehouse_id, quantity)
reviews: (id, product_id, user_id, rating, text, created_at)
```

**Read Model (Redis/MongoDB — denormalized):**

```json
{
  "id": "prod-42",
  "name": "Wireless Headphones",
  "description": "...",
  "brand": "Sony",
  "category": "Electronics > Audio > Headphones",
  "price": {"USD": 149.99, "EUR": 139.99},
  "totalStock": 1842,
  "averageRating": 4.3,
  "reviewCount": 2847,
  "inStock": true,
  "images": ["url1", "url2"],
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

The read model is a **projection** — it's built from events emitted by the write model and can be rebuilt at any time.

### CQRS Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Read/write stores scale independently | Eventual consistency between stores |
| Each store uses optimal technology | More infrastructure to manage |
| Queries are simple (no JOINs) | Must handle stale reads |
| Write model stays clean/normalized | Event-driven projection logic adds complexity |

### When to Use CQRS

- Read and write patterns are dramatically different
- You need different data stores for different query patterns
- Read performance is critical and JOINs are too expensive
- You already have an event-driven architecture (CDC, Kafka)

:::warning Over-Engineering Alert
CQRS adds significant complexity. Don't use it just because read traffic is high — read replicas and caching solve that more simply. Use CQRS when you genuinely need **different data models** for reads and writes.
:::

---

## 🔧 Approach 4: Materialized Views

Precomputed query results stored as a physical table, refreshed periodically or on change. This is CQRS at the database level.

### Database-Level Materialized Views

```sql
-- Create a materialized view for product listing
CREATE MATERIALIZED VIEW product_listing AS
SELECT 
    p.id,
    p.name,
    p.description,
    b.name AS brand_name,
    c.full_path AS category_path,
    pr.amount AS price,
    COALESCE(inv.total_stock, 0) AS stock,
    COALESCE(r.avg_rating, 0) AS rating,
    COALESCE(r.review_count, 0) AS reviews
FROM products p
JOIN brands b ON p.brand_id = b.id
JOIN categories c ON p.category_id = c.id
LEFT JOIN prices pr ON p.id = pr.product_id AND pr.currency = 'USD'
LEFT JOIN (
    SELECT product_id, SUM(quantity) AS total_stock
    FROM inventory GROUP BY product_id
) inv ON p.id = inv.product_id
LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews GROUP BY product_id
) r ON p.id = r.product_id;

-- Create indexes on the materialized view
CREATE INDEX idx_mv_product_category ON product_listing(category_path);
CREATE INDEX idx_mv_product_price ON product_listing(price);
CREATE INDEX idx_mv_product_rating ON product_listing(rating DESC);

-- Refresh (blocks reads during refresh in PostgreSQL)
REFRESH MATERIALIZED VIEW product_listing;

-- Concurrent refresh (doesn't block reads, requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY product_listing;
```

### Application-Level Materialized Views

For more control, build materialized views in application code:

```python
class ProductListingProjection:
    def __init__(self, read_db):
        self.read_db = read_db
    
    def handle_product_updated(self, event):
        product = self.enrich_product(event.product_id)
        self.read_db.upsert("product_listings", product)
    
    def handle_review_added(self, event):
        stats = self.compute_review_stats(event.product_id)
        self.read_db.update(
            "product_listings",
            {"id": event.product_id},
            {"rating": stats.avg, "reviews": stats.count}
        )
    
    def handle_inventory_changed(self, event):
        total = self.compute_total_stock(event.product_id)
        self.read_db.update(
            "product_listings",
            {"id": event.product_id},
            {"stock": total, "inStock": total > 0}
        )
    
    def full_rebuild(self):
        """Rebuild entire projection from source of truth"""
        for product in source_db.query("SELECT id FROM products"):
            self.handle_product_updated(ProductEvent(product.id))
```

---

## 🔧 Approach 5: Search Indexes

For complex text search, filtering, faceting, and aggregation, a dedicated search engine like **Elasticsearch** or **OpenSearch** offloads these expensive operations from the primary database.

### Architecture

```
┌──────────┐     CDC/Events     ┌──────────────┐     Queries     ┌──────────────┐
│ Primary  │ ─────────────────► │ Elasticsearch│ ◄────────────── │ Search API   │
│ Database │                    │ Cluster      │                 │              │
└──────────┘                    └──────────────┘                 └──────────────┘
```

### When to Use Search Indexes vs Database

| Capability | PostgreSQL | Elasticsearch |
|-----------|-----------|---------------|
| **Full-text search** | `tsvector` — decent | Excellent (analyzers, tokenizers, scoring) |
| **Fuzzy matching** | Limited | Built-in (Levenshtein, phonetic) |
| **Faceted search** | Slow (GROUP BY) | Built-in aggregation framework |
| **Autocomplete** | `LIKE 'prefix%'` | Completion suggester, edge n-grams |
| **Geo queries** | PostGIS extension | Built-in geo_point, geo_shape |
| **Relevance scoring** | Basic | BM25, boosting, function scores |
| **Horizontal scaling** | Read replicas | Native sharding |

---

## ⚖️ Comparison Matrix

| Strategy | Staleness | Complexity | Cost | Best For |
|----------|:---------:|:----------:|:----:|----------|
| **Read Replicas** | Seconds | Low | Medium | General read scaling |
| **L1 Cache (in-process)** | Minutes | Very Low | Free | Hot data, per-instance |
| **L2 Cache (Redis)** | Seconds-Minutes | Low | Medium | Shared hot data |
| **CDN** | Minutes-Hours | Low | Low | Static / semi-static content |
| **CQRS** | Seconds | High | High | Different read/write patterns |
| **Materialized Views** | Minutes (refresh) | Medium | Low | Complex aggregation queries |
| **Search Index** | Seconds | Medium | Medium | Text search, faceting |

### Decision Framework

```
Is the data frequently read but rarely changed?
├── Yes → Cache it (L1/L2/CDN depending on sharing needs)
└── No → Is the read pattern fundamentally different from the write pattern?
          ├── Yes → CQRS with dedicated read stores
          └── No → Read replicas + query optimization

Do you need full-text search, faceting, or fuzzy matching?
├── Yes → Elasticsearch / OpenSearch
└── No → Is the query a complex aggregation?
          ├── Yes → Materialized View
          └── No → Read replica with proper indexes
```

---

## 🧠 Key Takeaways

1. **Caching is the most impactful read optimization** — a Redis cache serving 100K QPS costs a fraction of the database resources needed for the same load
2. **Read replicas are the simplest database-level scaling** — but don't ignore replica lag; use read-after-write routing for critical paths
3. **CQRS is powerful but complex** — only adopt it when read and write models genuinely need different schemas or technologies
4. **Cache invalidation is the hardest part** — prefer TTL-based expiry with event-driven invalidation for critical data
5. **Layer your caching** — L1 (local) catches per-instance hot spots, L2 (Redis) catches shared hot spots, CDN catches geographic latency
6. **Materialized views are CQRS-lite** — they give you precomputed reads without the full infrastructure overhead
7. **Never optimize reads at the expense of data correctness** — stale data is acceptable in many cases, but understand exactly where it is and isn't

:::info Interview Strategy
When asked "How do you scale reads?", structure your answer in layers: start with database-level (replicas, indexes), then add caching (L1/L2/CDN), then discuss CQRS if the interviewer's scenario involves different read/write patterns. Always mention the trade-off: every layer you add introduces staleness, and managing invalidation is the real engineering challenge.
:::
