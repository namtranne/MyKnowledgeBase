# Chapter 13 — Design a Search Autocomplete System

> Search autocomplete (typeahead / search-as-you-type) suggests query completions as the user types. It powers the search experience in Google, YouTube, Amazon, and virtually every search-enabled application.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Matching** | Suggestions match the beginning of the query (prefix matching) |
| **Results** | Return top 5 suggestions, ranked by popularity |
| **Latency** | < 100ms response time (users expect instant feedback) |
| **Scale** | 10 million DAU, each user performs 10 searches/day with ~20 characters typed per search |
| **Languages** | English only (extendable to multilingual) |
| **Ranking** | Based on query frequency (popularity) |
| **Personalization** | Nice-to-have (not MVP) |

### Estimation

```
  10M DAU × 10 searches × 20 characters = 2 billion requests/day
  QPS: 2B / 86,400 ≈ ~24,000 QPS
  Peak: ~48,000 QPS
  
  Unique queries: ~100 million (many queries are similar)
  Average query length: 20 characters × 2 bytes (UTF-8) = 40 bytes
  Storage for queries: 100M × 40 bytes ≈ 4 GB
  
  With frequency counts and metadata: ~20 GB
```

---

## Data Structure: Trie (Prefix Tree)

The core data structure for prefix matching:

### Basic Trie

```
  Root
   ├── t
   │   ├── r
   │   │   ├── e
   │   │   │   └── e [freq: 10]
   │   │   ├── u
   │   │   │   ├── m
   │   │   │   │   └── p [freq: 45]
   │   │   │   └── e [freq: 35]
   │   │   └── i
   │   │       └── p [freq: 20]
   │   └── o
   │       ├── y [freq: 50]
   │       └── p [freq: 25]
   └── b
       ├── e
       │   ├── e
       │   │   └── r [freq: 30]
       │   └── s
       │       └── t [freq: 15]
       └── o
           └── x [freq: 8]
```

**Query "tr":**
1. Traverse: root → t → r
2. Find all descendants: tree(10), trump(45), true(35), trip(20)
3. Sort by frequency: trump(45), true(35), trip(20), tree(10)
4. Return top 5

### Problem: Basic Trie Is Too Slow

Finding all descendants and sorting them is O(P + C log C) where P = prefix length, C = total descendants. For popular prefixes like "t", there could be millions of descendants.

### Optimization 1: Cache Top-K at Each Node

Pre-compute and store the top K (e.g., top 5) results at every node:

```
  Node "tr" stores: [trump(45), true(35), top(25), trip(20), tree(10)]
  
  Query "tr" → immediately return cached top 5 → O(1) lookup!
```

| Trade-off | Detail |
|-----------|--------|
| **Space** | Each node stores K entries → more memory |
| **Time** | Lookup is O(P) where P is prefix length — just traverse |
| **Update** | When frequencies change, must update cached top-K up the tree |

### Optimization 2: Limit Trie Depth

Most search queries are < 50 characters. Limit trie depth to reduce memory:

```
  Max depth: 50 characters
  Queries longer than 50 chars: not supported for autocomplete
  (User has already typed enough — they know what they want)
```

---

## System Architecture

### Two Separate Systems

| System | Purpose | Update Frequency |
|--------|---------|-----------------|
| **Data Gathering Service** | Collects search queries, aggregates frequencies | Offline (batch or near-real-time) |
| **Query Service** | Serves autocomplete suggestions from the trie | Real-time (< 100ms) |

This separation is critical: **the trie is NOT updated in real-time with every search.** Instead, frequency data is aggregated periodically and the trie is rebuilt.

---

### Data Gathering Service

```
  User searches ──▶ [Query Log] ──▶ [Aggregation Pipeline] ──▶ [Trie Builder]
  
  Query Log (raw):
    query      | timestamp
    "trump"    | 2024-03-15 10:30:00
    "tree"     | 2024-03-15 10:30:01
    "trump"    | 2024-03-15 10:30:02
    "true"     | 2024-03-15 10:30:03
    
  Aggregated (weekly):
    query   | frequency
    "trump" | 450,000
    "true"  | 350,000
    "tree"  | 100,000
    "trip"  | 200,000
```

**Aggregation approaches:**

| Approach | Frequency | Latency | Use Case |
|----------|-----------|---------|----------|
| **Real-time (Kafka + Flink)** | Every few minutes | Low | Trending queries, news events |
| **Batch (MapReduce / Spark)** | Daily or weekly | High | General autocomplete |
| **Hybrid** | Batch for base + real-time for trending | Medium | Production systems (Google) |

**Google's approach**: Batch aggregation for the base trie (updated daily/weekly) + real-time layer for trending queries (updated every few minutes).

### Trie Builder

```
  1. Read aggregated frequency data
  2. Build trie in memory
  3. Pre-compute top-K at each node
  4. Serialize trie to persistent storage
  5. Distribute to query servers
```

**Trie storage**: Serialize the trie as a flat file or key-value store. Each query server loads the trie into memory at startup.

---

### Query Service

```
  User types "tr"
       │
       ▼
  ┌──────────────┐
  │  Load        │
  │  Balancer    │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Query       │  1. Traverse trie to node "tr"
  │  Server      │  2. Return cached top-5 results
  │  (Trie in    │  3. Response time: < 10ms
  │   memory)    │
  └──────────────┘
```

### Query Optimization Techniques

#### 1. AJAX Requests (No Full Page Reload)

Autocomplete runs entirely via asynchronous JavaScript — the page doesn't reload.

#### 2. Browser Caching

```
  GET /v1/autocomplete?prefix=tr
  Response: Cache-Control: max-age=3600
  
  Result: browser caches suggestions for "tr" for 1 hour.
  Next time user types "tr" → served from browser cache (0ms).
```

Google caches autocomplete results for 1 hour. This dramatically reduces server load since many users type the same prefixes.

#### 3. Debouncing

Don't send a request for every keystroke. Wait for the user to pause:

```
  User types: t → tr → tre → tree
  
  Without debouncing: 4 requests (t, tr, tre, tree)
  With 200ms debounce: 1 request (tree) — sent after 200ms pause
```

This reduces QPS by 50-80%.

#### 4. Prefix Reuse

If the user has results for "tr" cached, filter locally for "tre" without a server call:

```
  Cache for "tr": [trump, true, trip, tree, trophy]
  User types "tre": filter locally → [tree, trend, trek]
  
  Only call server when local filtering can't provide enough results.
```

---

## Trie Operations

### Building the Trie

Option A: Build on a single server and distribute
- Build the trie on a dedicated build server
- Serialize and store in S3/GCS
- Query servers download and load into memory
- New trie built on schedule (daily/weekly)

Option B: Distributed trie across multiple servers
- Partition by first character(s): Server A handles a-m, Server B handles n-z
- Each server builds and serves its partition
- Load balancer routes requests based on the first character of the prefix

```
  Partition by first letter:
  
  Server 1: a-f    (handles prefixes starting with a through f)
  Server 2: g-m    (handles prefixes starting with g through m)
  Server 3: n-s    (handles prefixes starting with n through s)
  Server 4: t-z    (handles prefixes starting with t through z)
```

**Smarter partitioning**: Not all letters are equally common. Partition by traffic volume, not alphabetically:

```
  Server 1: a, b           (high traffic)
  Server 2: c, d, e, f, g  (medium traffic)
  Server 3: h-p            (medium traffic)
  Server 4: q-z            (lower traffic)
```

### Updating the Trie

**Option A: Replace the entire trie**
- Build new trie → swap atomically → old trie garbage collected
- Simple, no in-place updates
- Works well with weekly/daily rebuild cycles

**Option B: Update individual nodes**
- When a query's frequency changes, update the node and propagate top-K changes up
- More complex but supports near-real-time updates
- Practical for the real-time trending layer

### Deleting from the Trie

Need to filter out:
- Hateful, violent, or illegal content
- Spam queries
- Personally identifiable information

**Approach**: Maintain a filter layer between the trie and the response:

```
  Trie result: ["trump news", "trouble ticket", "trophy wife"]
  Filter: blocklist check
  Response: ["trump news", "trouble ticket", "trophy wife"]
  
  If "trophy wife" is blocklisted:
  Response: ["trump news", "trouble ticket"]
```

This is faster than removing entries from the trie itself.

---

## Storage and Scale

### Trie Size Estimation

```
  100M unique queries, average 20 characters
  Trie nodes: ~200M (rough estimate, depends on prefix sharing)
  Per node: 40 bytes (character + pointer + top-5 cache)
  
  Trie size: 200M × 40 bytes ≈ 8 GB
  
  With top-5 cached at each node (5 × 100 bytes per entry):
  Additional: 200M × 500 bytes = 100 GB
  
  Total: ~108 GB → fits on a single server with 128 GB RAM
  With partitioning: ~27 GB per server (4 servers)
```

### Multi-Layer Caching

```
  Layer 1: Browser cache (per-user, free)
  Layer 2: CDN edge cache (regional)
  Layer 3: Application cache (Redis/Memcached)
  Layer 4: Trie in memory (query server)
```

With aggressive browser caching and debouncing, the actual server QPS can be reduced by 80-90%.

---

## Handling Trending / Real-Time Queries

For breaking news or viral events, weekly trie rebuilds are too slow:

```
  Normal path:   Query logs → Weekly aggregation → Trie rebuild
  Trending path: Query logs → Real-time stream (Kafka) → Trending detector
                                                              │
                                                              ▼
                                                      ┌──────────────┐
                                                      │ Trending     │
                                                      │ Overlay      │
                                                      │ (hot queries)│
                                                      └──────────────┘
  
  Query Server:
    result = trie_lookup(prefix) + trending_overlay(prefix)
    merge and rank by combined frequency
```

The trending overlay is a small, frequently updated data structure that supplements the main trie.

---

## Personalization

Beyond popularity, personalize suggestions based on:

| Signal | Example |
|--------|---------|
| **User's search history** | Suggest queries the user has searched before |
| **Location** | "restaurants" → "restaurants near me in Sydney" |
| **Language** | Suggest in user's preferred language |
| **Device** | Mobile users get shorter suggestions |
| **Time of day** | "breakfast" in the morning, "dinner" in the evening |

**Implementation**: Maintain a small per-user trie (or hash map) of recent searches. Merge personal results with global trie results, weighted toward personal history.

---

## Interview Cheat Sheet

**Q: How would you design a search autocomplete system?**
> Two systems: (1) Data gathering — collect search queries, aggregate frequencies periodically (daily/weekly), build a trie with top-K results cached at each node. (2) Query service — traverse the trie on each keystroke, return cached top-K suggestions in < 100ms. Optimize with browser caching, debouncing, and CDN edge caching to reduce actual server QPS by 80-90%.

**Q: Why a trie and not a database?**
> Tries are optimized for prefix lookups — O(P) time where P is prefix length. A database would require `LIKE 'prefix%'` queries, which don't scale (full table scan or index scan) and have higher latency. With top-K cached at each trie node, lookup is effectively O(1) after reaching the node. The entire trie fits in memory (~10-100 GB) for fast access.

**Q: How do you update the trie with new data?**
> Don't update in real-time with every search — that would be too expensive and the trie is read-heavy. Instead, aggregate query frequencies in batch (daily/weekly), build a new trie, and atomically swap it on query servers. For trending queries, maintain a separate small real-time overlay that's updated every few minutes via a streaming pipeline (Kafka + Flink).

**Q: How do you handle billions of queries?**
> Reduce QPS at the source: debounce keystrokes (200ms wait), cache results in the browser (1-hour TTL), and filter locally when possible (if you have "tr" results, filter for "tre" client-side). With these optimizations, actual server QPS drops from 24K to ~5K. Partition the trie across servers by prefix for horizontal scaling.

**Q: How do you filter inappropriate suggestions?**
> Maintain a blocklist of inappropriate terms. Apply the filter as a post-processing step between the trie lookup and the response — faster and simpler than modifying the trie itself. The blocklist can be updated in real-time without rebuilding the trie. Also filter at the data gathering stage to prevent inappropriate queries from influencing frequency counts.

**Q: How do you handle multi-language autocomplete?**
> Use Unicode-aware tries. Store separate tries per language or use a single trie with language-tagged entries. Route queries to the appropriate trie based on the user's language setting or detected script. CJK (Chinese, Japanese, Korean) languages may need different tokenization (character-by-character vs word-based suggestions).
