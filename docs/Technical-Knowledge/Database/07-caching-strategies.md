---
sidebar_position: 8
title: "07 — Caching Strategies"
---

# ⚡ Caching Strategies

Caching is the single most effective technique for reducing database load and improving application latency. Understanding caching patterns, eviction policies, and distributed cache design is essential for system design interviews.

---

## 🎯 Why Caching Matters

| Without Cache | With Cache |
|:-------------:|:----------:|
| Every request hits the database | Hot data served from memory |
| ~5-50ms per query (disk I/O) | ~0.1-1ms per lookup (RAM) |
| Database becomes bottleneck at scale | Database handles only cache misses |
| Vertical scaling needed | Horizontal cache scaling |

:::info The Numbers
- **L1 cache hit:** ~1 ns
- **RAM access:** ~100 ns
- **SSD read:** ~100 μs (100,000 ns)
- **HDD read:** ~10 ms (10,000,000 ns)
- **Redis GET (network):** ~0.5 ms (500,000 ns)

A cache hit is **10,000x faster** than a disk read.
:::

---

## 📐 Caching Patterns

### 1. Cache-Aside (Lazy Loading)

The application manages the cache directly. Most common pattern.

```
Read path:
┌──────┐    1. GET key    ┌───────┐
│ App  │ ────────────────► │ Cache │
│      │ ◄────────────────  │       │
│      │   2a. Cache HIT   └───────┘
│      │       (return)
│      │
│      │   2b. Cache MISS
│      │ ────────────────► ┌────────┐
│      │ ◄────────────────  │   DB   │
│      │   3. Query DB     └────────┘
│      │
│      │   4. SET key      ┌───────┐
│      │ ────────────────► │ Cache │
└──────┘                   └───────┘
```

```java
public User getUser(String userId) {
    User cached = cache.get("user:" + userId);
    if (cached != null) return cached;           // cache hit

    User user = db.findById(userId);             // cache miss → query DB
    cache.set("user:" + userId, user, TTL_5MIN); // populate cache
    return user;
}
```

| Pros | Cons |
|------|------|
| Only caches data that's actually requested | Cache miss = slower (DB query + cache write) |
| Cache failure doesn't break the application | Data can become stale (until TTL expires) |
| Simple to implement | Initial requests always miss (cold start) |

### 2. Read-Through

The cache sits **in front of** the database. On a miss, the **cache itself** loads from the DB.

```
┌──────┐    GET key    ┌───────┐   miss    ┌────────┐
│ App  │ ─────────────► │ Cache │ ─────────► │   DB   │
│      │ ◄─────────────  │ (auto │ ◄─────────  │        │
└──────┘   return       │ loads)│  populate  └────────┘
                        └───────┘
```

| Pros | Cons |
|------|------|
| Application code is simpler (no cache logic) | Cache library must support DB integration |
| Consistent cache loading logic | Less control over loading behavior |

### 3. Write-Through

Writes go to the cache **and** the database synchronously. The cache is always up-to-date.

```
┌──────┐   1. WRITE    ┌───────┐   2. WRITE   ┌────────┐
│ App  │ ──────────────► │ Cache │ ────────────► │   DB   │
│      │ ◄──────────────  │       │ ◄────────────  │        │
└──────┘   3. ACK       └───────┘   ACK         └────────┘
```

| Pros | Cons |
|------|------|
| Cache always consistent with DB | Higher write latency (two writes) |
| No stale data | Caches data that may never be read |
| Simplifies read path | Cache failure blocks writes |

### 4. Write-Behind (Write-Back)

Writes go to the cache immediately. The cache asynchronously flushes to the database.

```
┌──────┐   1. WRITE    ┌───────┐
│ App  │ ──────────────► │ Cache │
│      │ ◄──────────────  │       │  2. ACK (fast!)
└──────┘                 │       │
                         │       │  3. Async flush
                         │       │ ────────────► ┌────────┐
                         └───────┘               │   DB   │
                                                 └────────┘
```

| Pros | Cons |
|------|------|
| Very fast writes (only cache write) | Data loss if cache fails before flush |
| Reduced database write load | Eventual consistency |
| Can batch/coalesce writes | Complex to implement correctly |

### 5. Write-Around

Writes go **directly to the database**, bypassing the cache. Cache is populated only on reads.

```
Write path:                      Read path:
┌──────┐   WRITE   ┌────────┐   ┌──────┐   GET   ┌───────┐
│ App  │ ─────────► │   DB   │   │ App  │ ───────► │ Cache │
└──────┘           └────────┘   │      │   miss   │       │
                                │      │ ─────────► ┌──────┐
                                │      │ ◄─────────  │  DB  │
                                └──────┘ populate   └──────┘
```

| Pros | Cons |
|------|------|
| Cache doesn't fill with rarely-read data | First read after write always misses |
| Good for write-heavy, read-seldom data | Higher read latency on miss |

### Pattern Comparison

| Pattern | Read Latency | Write Latency | Consistency | Complexity | Best For |
|---------|:------------:|:-------------:|:-----------:|:----------:|----------|
| **Cache-Aside** | Low (hit) / High (miss) | N/A | Eventual (TTL) | Low | General purpose |
| **Read-Through** | Low (hit) / High (miss) | N/A | Eventual (TTL) | Medium | Read-heavy apps |
| **Write-Through** | Low | High (2 writes) | Strong | Medium | Read-heavy + consistency |
| **Write-Behind** | Low | Very Low | Eventual | High | Write-heavy apps |
| **Write-Around** | High (first read) | Low | Eventual | Low | Write-heavy, read-seldom |

---

## 🗑️ Cache Eviction Policies

### Overview Table

| Policy | Full Name | Evicts | Strengths | Weaknesses |
|:------:|-----------|--------|-----------|------------|
| **LRU** | Least Recently Used | Least recently accessed item | Good for temporal locality | Scan pollution (one-time accesses) |
| **LFU** | Least Frequently Used | Least frequently accessed item | Good for frequency-based patterns | Slow to adapt to changing patterns |
| **FIFO** | First In, First Out | Oldest item | Simple, predictable | Ignores access patterns |
| **TTL** | Time To Live | Items past expiration time | Guarantees freshness | May evict hot items |
| **Random** | Random | Random item | Zero overhead, no metadata | Unpredictable behavior |

### LRU vs. LFU

```
Scenario: Cache size = 3

Access sequence: A A A B B C D

LRU state after each access:
  A       → [A]
  A       → [A]
  A       → [A]
  B       → [A, B]
  B       → [A, B]
  C       → [A, B, C]
  D       → [B, C, D]      ← A evicted (least recently used)

LFU state after each access:
  A(1)    → [A:1]
  A(2)    → [A:2]
  A(3)    → [A:3]
  B(1)    → [A:3, B:1]
  B(2)    → [A:3, B:2]
  C(1)    → [A:3, B:2, C:1]
  D(1)    → [A:3, B:2, D:1]  ← C evicted (least frequently used)
```

:::tip Redis Eviction Policies
Redis supports multiple eviction policies configured via `maxmemory-policy`:
- `allkeys-lru` — LRU across all keys (most common)
- `volatile-lru` — LRU among keys with TTL set
- `allkeys-lfu` — LFU across all keys (Redis 4.0+)
- `volatile-ttl` — Evict keys with shortest TTL
- `noeviction` — Return error on write when full
:::

---

## 🏗️ LRU Cache Implementation {#lru-cache-implementation}

A classic interview question: implement an LRU cache with O(1) `get` and `put`.

### Data Structure: HashMap + Doubly Linked List

```
HashMap:  key → Node pointer (O(1) lookup)

Doubly Linked List:  MRU ◄──────────────────► LRU
                   (head)                    (tail)

┌──────────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────────┐
│ HEAD     │◄──►│ Key3 │◄──►│ Key1 │◄──►│ Key2 │◄──►│   TAIL   │
│(sentinel)│    │ Val3 │    │ Val1 │    │ Val2 │    │(sentinel)│
└──────────┘    └──────┘    └──────┘    └──────┘    └──────────┘
                  MRU                      LRU
                (most recent)          (evict this)
```

### Java Implementation

```java
class LRUCache {
    private final int capacity;
    private final Map<Integer, Node> map;
    private final Node head, tail; // sentinel nodes

    static class Node {
        int key, value;
        Node prev, next;
        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        moveToHead(node);
        return node.value;
    }

    public void put(int key, int value) {
        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            moveToHead(node);
        } else {
            Node newNode = new Node(key, value);
            map.put(key, newNode);
            addToHead(newNode);
            if (map.size() > capacity) {
                Node evicted = removeTail();
                map.remove(evicted.key);
            }
        }
    }

    private void addToHead(Node node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    private void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void moveToHead(Node node) {
        removeNode(node);
        addToHead(node);
    }

    private Node removeTail() {
        Node evicted = tail.prev;
        removeNode(evicted);
        return evicted;
    }
}
```

| Operation | Time | Space |
|-----------|:----:|:-----:|
| `get()` | O(1) | O(capacity) |
| `put()` | O(1) | O(capacity) |

---

## 🔴 Redis Deep Dive

### Data Structures

| Structure | Commands | Use Case |
|-----------|----------|----------|
| **String** | `GET`, `SET`, `INCR`, `MGET` | Caching, counters, feature flags |
| **Hash** | `HGET`, `HSET`, `HGETALL` | User profiles, object storage |
| **List** | `LPUSH`, `RPOP`, `LRANGE` | Message queues, activity feeds |
| **Set** | `SADD`, `SMEMBERS`, `SINTER` | Tags, unique visitors, relationships |
| **Sorted Set** | `ZADD`, `ZRANGE`, `ZRANGEBYSCORE` | Leaderboards, rate limiters, priority queues |
| **HyperLogLog** | `PFADD`, `PFCOUNT` | Cardinality estimation (~0.81% error) |
| **Stream** | `XADD`, `XREAD`, `XREADGROUP` | Event streaming, message broker |
| **Bitmap** | `SETBIT`, `GETBIT`, `BITCOUNT` | Feature flags, daily active users |

### Persistence: RDB vs. AOF

| Aspect | RDB (Snapshotting) | AOF (Append-Only File) |
|--------|:------------------:|:----------------------:|
| **How it works** | Periodic point-in-time snapshots | Logs every write operation |
| **Data loss risk** | Up to last snapshot interval | Configurable (every second or every write) |
| **File size** | Smaller (compressed binary) | Larger (all operations logged) |
| **Recovery speed** | Fast (load snapshot) | Slower (replay all operations) |
| **Performance impact** | Fork + copy-on-write (RAM spike) | Minimal (sequential append) |
| **Best for** | Backups, disaster recovery | Durability, minimal data loss |

:::tip Production Recommendation
Use **both RDB + AOF** in production:
- AOF for durability (fsync every second)
- RDB for fast restarts and backups
- Redis 7.0+ uses RDB preamble in AOF file for faster AOF loading
:::

### Redis Cluster

Redis Cluster provides automatic sharding across multiple nodes.

```
Redis Cluster (6 nodes: 3 masters + 3 replicas):

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Master 1    │    │  Master 2    │    │  Master 3    │
  │ Slots 0-5460 │    │Slots 5461-   │    │Slots 10923-  │
  │              │    │    10922     │    │    16383     │
  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
         │                   │                   │
  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐
  │  Replica 1   │    │  Replica 2   │    │  Replica 3   │
  └──────────────┘    └──────────────┘    └──────────────┘
```

- **16,384 hash slots** distributed across masters
- Key assignment: `slot = CRC16(key) % 16384`
- Client receives `MOVED` redirect if key is on a different node
- Automatic failover: replica promoted to master if master fails

---

## ⚔️ Memcached vs. Redis

| Feature | Redis | Memcached |
|---------|:-----:|:---------:|
| **Data structures** | Strings, Hashes, Lists, Sets, Sorted Sets, Streams | Strings only |
| **Persistence** | RDB + AOF | None (memory only) |
| **Clustering** | Redis Cluster (built-in) | Client-side sharding |
| **Replication** | Built-in async replication | None |
| **Pub/Sub** | ✅ | ❌ |
| **Lua scripting** | ✅ | ❌ |
| **Max value size** | 512 MB | 1 MB |
| **Multi-threading** | Single-threaded (I/O threads in 6.0+) | Multi-threaded |
| **Memory efficiency** | Higher overhead per key | More efficient for simple KV |
| **Best for** | Rich data operations, pub/sub, queues | Simple, high-throughput KV caching |

:::note When to Choose Memcached
Choose Memcached only when:
- You need pure key-value caching with maximum simplicity
- You need multi-threaded performance for simple GET/SET
- You don't need persistence, pub/sub, or rich data types

In nearly all other cases, Redis is the better choice.
:::

---

## 🔄 Cache Invalidation Strategies

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

| Strategy | How It Works | Trade-off |
|----------|-------------|-----------|
| **TTL (Time-to-Live)** | Cache entries expire after a fixed duration | Simple but stale data for up to TTL duration |
| **Event-driven invalidation** | Invalidate cache on write events (CDC, pub/sub) | Real-time freshness but complex infrastructure |
| **Write-through** | Update cache on every write | Always fresh but higher write latency |
| **Versioned keys** | Include version in cache key (`user:42:v5`) | Simple invalidation but more cache misses |
| **Tag-based invalidation** | Group related keys with tags, invalidate by tag | Flexible but requires tag tracking |

---

## 🌊 Cache Stampede / Thundering Herd

When a popular cache key expires, **hundreds of concurrent requests** simultaneously miss the cache and hit the database.

```
Time T:  Cache key "hot_data" expires

   Request 1 → Cache MISS → query DB
   Request 2 → Cache MISS → query DB    ← All hit DB simultaneously!
   Request 3 → Cache MISS → query DB
   ...
   Request 1000 → Cache MISS → query DB

Database: 💀 overwhelmed
```

### Solutions

| Solution | How It Works |
|----------|-------------|
| **Locking / Mutex** | First request acquires a lock, others wait. Only one DB query. |
| **Probabilistic early expiration** | Randomly refresh before TTL expires: `if (TTL - random() * BETA < now) refresh()` |
| **Stale-while-revalidate** | Serve stale data while refreshing in background |
| **Pre-warming** | Proactively refresh popular keys before they expire |
| **Request coalescing** | Group identical concurrent requests; execute once, share result |

### Mutex Pattern (Java)

```java
public Data getWithMutex(String key) {
    Data cached = cache.get(key);
    if (cached != null) return cached;

    String lockKey = "lock:" + key;
    if (cache.setIfAbsent(lockKey, "1", Duration.ofSeconds(10))) {
        try {
            Data data = db.query(key);
            cache.set(key, data, TTL_5MIN);
            return data;
        } finally {
            cache.delete(lockKey);
        }
    } else {
        Thread.sleep(50);
        return getWithMutex(key); // retry — lock holder will populate cache
    }
}
```

---

## 🌐 Distributed Caching: Consistent Hashing

When you have multiple cache nodes, you need to decide **which node** holds each key.

```
Without consistent hashing:
  node = hash(key) % num_nodes
  Adding a node → ~100% of keys rehashed → mass cache miss → DB stampede

With consistent hashing:
  Adding a node → ~K/N keys rehashed (K=total keys, N=num nodes)
  Only a fraction of keys move → minimal cache misses
```

See [Chapter 05 — Consistent Hashing](./05-replication-partitioning.md#-consistent-hashing) for the full explanation and diagram.

---

## 🌍 CDN Caching

CDNs cache static and dynamic content at **edge locations** close to users.

```
User (Tokyo)                    Origin Server (US-East)
     │                                   │
     ▼                                   │
┌─────────────┐                          │
│ CDN Edge    │ ──── cache miss ────────► │
│ (Tokyo)     │ ◄─── response ──────────  │
│             │                          │
│ Caches for  │                          │
│ future      │                          │
│ requests    │                          │
└─────────────┘
     ▲
     │ cache hit (fast!)
     │
User (Tokyo)
```

### CDN Cache Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Cache-Control: max-age=3600` | Cache for 1 hour | Static assets |
| `Cache-Control: s-maxage=600` | CDN-specific TTL (overrides max-age for CDN) | API responses |
| `Cache-Control: no-cache` | Always revalidate with origin | Dynamic content |
| `Cache-Control: no-store` | Never cache | Sensitive data |
| `ETag` | Content fingerprint for conditional requests | Any cacheable resource |
| `Vary: Accept-Encoding` | Cache separate versions per encoding | Compressed content |

---

## 🎯 Interview Questions

### Q1: "Design an LRU Cache" (Leetcode 146)

Use a **HashMap** for O(1) key lookup + a **Doubly Linked List** for O(1) eviction ordering. See the [implementation above](#lru-cache-implementation).

Key points to mention:
- HashMap maps key → DLL node (O(1) access)
- DLL head = most recently used, tail = least recently used
- On `get`: move node to head
- On `put`: add to head; if over capacity, remove tail

### Q2: "How would you prevent a cache stampede?"

1. **Mutex/lock:** Only one request queries the DB; others wait
2. **Probabilistic early refresh:** Randomly refresh before TTL
3. **Stale-while-revalidate:** Return stale data, refresh async
4. **Request coalescing:** Deduplicate identical concurrent requests

### Q3: "Your application has stale cache data. How do you debug and fix it?"

1. **Check TTL:** Is it too long? Lower it for frequently changing data
2. **Check invalidation:** Are write paths properly invalidating/updating the cache?
3. **Check race conditions:** Is there a read-modify-write race between cache and DB?
4. **Add event-driven invalidation:** Use CDC (Change Data Capture) or pub/sub to invalidate on DB changes
5. **Add versioning:** Use versioned cache keys to ensure stale data is never served

### Q4: "When would you use write-behind vs. write-through caching?"

- **Write-through:** When you need **strong consistency** between cache and DB, and can tolerate higher write latency (e.g., user profile updates)
- **Write-behind:** When you need **low write latency** and can tolerate eventual consistency and potential data loss (e.g., view counts, analytics events, activity logs)

### Q5: "Redis is single-threaded. How is it so fast?"

1. **In-memory:** All data in RAM — no disk I/O
2. **I/O multiplexing:** Uses `epoll`/`kqueue` to handle thousands of connections with a single thread
3. **No context switching:** Single-threaded means no lock contention or thread scheduling overhead
4. **Efficient data structures:** Purpose-built implementations (ziplist, intset, skiplist)
5. **Simple operations:** Most commands are O(1) or O(log N)
6. **I/O threads (Redis 6.0+):** Network I/O can use multiple threads; command execution remains single-threaded

---

## 🔗 Related Chapters

- **[05 — Replication & Partitioning](./05-replication-partitioning.md)** — Consistent hashing for distributed caching
- **[06 — NoSQL & Distributed Databases](./06-nosql-databases.md)** — Redis as a NoSQL store
- **[08 — Common Interview Questions](./08-interview-questions.md)** — System design with caching
