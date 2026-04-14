# Chapter 10: Real-Time Gaming Leaderboard

## 1. Problem Statement & Requirements

### What Are We Designing?

A **real-time leaderboard system** for an online multiplayer game — capable of ranking millions of players by score, delivering instant rank lookups, and displaying top-K lists with sub-second latency. Leaderboards are ubiquitous in gaming (Fortnite, League of Legends, Clash Royale) and extend to non-gaming domains like competitive coding platforms (LeetCode), fitness apps (Strava), and sales dashboards.

The core challenge: maintaining a **globally ordered ranking** over millions of entries where both **reads and writes are frequent**, and results must be visible **within seconds** of a score change.

### Functional Requirements

1. **Update score** — when a player wins/completes a match, increment their score
2. **Display top 10** — show the top 10 players on the leaderboard at any time
3. **Show a user's rank** — given a user ID, return their current global rank
4. **Show surrounding players** — display players ranked ±N positions around a given user (relative leaderboard)
5. **Multiple leaderboard types** — daily, weekly, monthly, all-time

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| Real-time | Score updates reflected on leaderboard within **seconds** |
| Availability | 99.9%+ uptime |
| Read latency | < 100ms p99 for top-K and rank queries |
| Write latency | < 50ms p99 for score updates |
| Throughput | Handle thousands of concurrent score updates per second |
| Scalability | Support tens of millions of players |
| Consistency | Eventual consistency acceptable (seconds, not minutes) |

### Scale Estimation (Back-of-Envelope)

```
DAU:                          5,000,000 (5M)
MAU:                          25,000,000 (25M)
Avg matches per user/day:     10
Score updates per day:         5M × 10 = 50,000,000 (50M)

Score updates per second:
  Average:  50M / 86,400 ≈ 580 updates/sec
  Peak (5x): ~2,500–3,000 updates/sec

Top-10 reads per user/day:    ~5 (after each match + casual browsing)
Read QPS (avg):               5M × 5 / 86,400 ≈ 290 reads/sec
Read QPS (peak):              ~1,500 reads/sec

Total leaderboard entries:    25M (all MAU can appear)
Memory per entry:             ~100 bytes (user_id + score + overhead)
Total memory:                 25M × 100B = 2.5 GB — fits in a single Redis instance
```

### Game Context

- Online multiplayer game (e.g., battle royale, competitive shooter)
- Scores accumulate — players earn points for winning, kills, achievements
- Scores update **only on match completion** (not during a match)
- Leaderboard is visible to all players (public ranking)

---

## 2. High-Level Design

### API Design

#### Update a Player's Score

```
POST /v1/scores
Authorization: Bearer <internal-service-token>

Request Body:
{
  "user_id": "user_12345",
  "score_increment": 50
}

Response: 200 OK
{
  "user_id": "user_12345",
  "new_score": 1250,
  "new_rank": 42
}
```

This endpoint is **not called directly by players** — it's invoked by the game server upon match completion. This prevents score manipulation.

#### Get Top K Players

```
GET /v1/scores?top=10&leaderboard=weekly

Response: 200 OK
{
  "leaderboard": "weekly",
  "entries": [
    {"rank": 1, "user_id": "user_99",  "username": "ProGamer",   "score": 8500},
    {"rank": 2, "user_id": "user_42",  "username": "FragMaster", "score": 8350},
    {"rank": 3, "user_id": "user_77",  "username": "NightOwl",   "score": 8100},
    ...
  ]
}
```

#### Get a User's Rank and Surrounding Players

```
GET /v1/scores/user_12345/rank?range=5&leaderboard=weekly

Response: 200 OK
{
  "user": {"rank": 42, "user_id": "user_12345", "score": 1250},
  "surrounding": [
    {"rank": 37, "user_id": "user_501", "score": 1290},
    {"rank": 38, "user_id": "user_208", "score": 1280},
    ...
    {"rank": 47, "user_id": "user_333", "score": 1210}
  ]
}
```

### Naive Approach — Why RDBMS Doesn't Scale

The simplest design uses a relational database:

```sql
CREATE TABLE leaderboard (
    user_id   BIGINT PRIMARY KEY,
    score     INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update score
UPDATE leaderboard SET score = score + 50 WHERE user_id = 12345;

-- Get top 10
SELECT user_id, score
FROM leaderboard
ORDER BY score DESC
LIMIT 10;

-- Get rank for a user
SELECT COUNT(*) + 1 AS rank
FROM leaderboard
WHERE score > (SELECT score FROM leaderboard WHERE user_id = 12345);
```

**Why this doesn't scale:**

| Operation | Complexity | Problem |
|---|---|---|
| Top 10 | O(n log n) sort, or O(n) with index scan | Full table scan on 25M rows is slow |
| User rank | O(n) | Must count all rows with higher scores |
| Score update + re-rank | O(n) | Index rebalancing, lock contention |

Even with a B-tree index on `score`, the rank query requires **counting all rows above a given score** — this is inherently O(n). At 25M rows with 600 writes/sec, the database becomes a bottleneck quickly.

```
┌──────────────┐     ┌─────────────────┐
│ Game Server  │────→│   API Server    │
│ (match ends) │     │                 │
└──────────────┘     └────────┬────────┘
                              │
                    ┌─────────▼─────────┐
                    │     MySQL/PG      │
                    │  ORDER BY score   │   ← Full sort on every read
                    │  25M rows         │   ← Lock contention on writes
                    └───────────────────┘
                         ❌ Too slow
```

### Why Redis Sorted Sets Are the Ideal Solution

Redis Sorted Sets provide **O(log n)** for all critical operations — insert, update, rank lookup, and range queries — all in memory. This is the textbook fit for leaderboard systems.

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Game Server  │────→│   API Server    │────→│  Redis Sorted   │
│ (match ends) │     │                 │     │  Set             │
└──────────────┘     └─────────────────┘     │  O(log n) ops   │
                                             │  25M members     │
                                             │  ~2.5 GB memory  │
                                             └─────────────────┘
                                                  ✅ Fast
```

---

## 3. Redis Sorted Sets — Deep Dive

### What Is a Sorted Set?

A **Sorted Set** (ZSET) is a Redis data structure that stores a collection of **unique members**, each associated with a **floating-point score**. Members are ordered by score, and Redis can retrieve members by rank, score range, or individual lookup — all efficiently.

```
Sorted Set: "leaderboard:weekly"
┌────────────────────────────────────────┐
│  Score  │       Member                 │
├─────────┼──────────────────────────────┤
│  8500   │  user_99   (rank 1)          │
│  8350   │  user_42   (rank 2)          │
│  8100   │  user_77   (rank 3)          │
│  5600   │  user_12345 (rank 42)        │
│  ...    │  ...                         │
│  100    │  user_1001 (rank 25000000)   │
└─────────┴──────────────────────────────┘
```

Think of it as a **self-balancing ordered set** with O(log n) operations — something that would require a balanced BST or skip list to implement from scratch.

### Internal Implementation: Skip List + Hash Table

Redis implements sorted sets using **two data structures simultaneously**:

1. **Skip List** — maintains the sorted order, supports O(log n) rank/range queries
2. **Hash Table** — maps member → score for O(1) score lookups

For small sorted sets (< 128 elements, all values < 64 bytes), Redis uses a compact **ziplist** encoding instead, which is more memory efficient.

```
┌─────────────────────────────────────────────────┐
│              Redis Sorted Set                    │
│                                                  │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │  Hash Table  │     │     Skip List         │  │
│  │              │     │                       │  │
│  │ user_99→8500 │     │  Sorted by score      │  │
│  │ user_42→8350 │     │  Supports rank ops    │  │
│  │ user_77→8100 │     │  O(log n) traversal   │  │
│  │ ...          │     │                       │  │
│  └──────────────┘     └──────────────────────┘  │
│                                                  │
│  Hash: O(1) ZSCORE          Skip List:           │
│  Hash: O(1) member exists   O(log n) ZADD       │
│                              O(log n) ZREVRANK   │
│                              O(log n+k) ZRANGE   │
└─────────────────────────────────────────────────┘
```

### Key Operations and Time Complexity

| Command | Description | Time Complexity |
|---|---|---|
| `ZADD key score member` | Add/update member with score | O(log n) |
| `ZINCRBY key increment member` | Atomically increment a member's score | O(log n) |
| `ZREVRANK key member` | Get rank (0-indexed, descending order) | O(log n) |
| `ZRANK key member` | Get rank (0-indexed, ascending order) | O(log n) |
| `ZREVRANGE key start stop [WITHSCORES]` | Get members by rank range (descending) | O(log n + k) |
| `ZRANGEBYSCORE key min max` | Get members by score range | O(log n + k) |
| `ZREVRANGEBYSCORE key max min` | Get members by score range (descending) | O(log n + k) |
| `ZSCORE key member` | Get score of a specific member | O(1) |
| `ZCARD key` | Count total members | O(1) |
| `ZREM key member` | Remove a member | O(log n) |

Where **n** = number of members in the sorted set, **k** = number of elements in the returned range.

### Why Skip Lists?

A **skip list** is a probabilistic data structure that provides O(log n) search, insert, and delete — similar to a balanced binary search tree but simpler to implement and more cache-friendly.

**How a skip list works:**

```
Level 4:  HEAD ──────────────────────────────────────────────→ 8500 ──→ NIL
              │                                                  │
Level 3:  HEAD ──────────────────→ 5600 ────────────────────→ 8500 ──→ NIL
              │                      │                           │
Level 2:  HEAD ──────→ 2100 ──────→ 5600 ──────→ 8100 ──────→ 8500 ──→ NIL
              │          │            │            │              │
Level 1:  HEAD → 100 → 2100 → 3400 → 5600 → 6200 → 8100 → 8350 → 8500 → NIL
```

**Properties:**
- **Layered linked lists**: The bottom level is a complete sorted linked list; higher levels are "express lanes" that skip over elements
- **Probabilistic balancing**: Each element is promoted to the next level with probability p (typically 0.25 or 0.5) — no complex rebalancing rotations like AVL/Red-Black trees
- **O(log n) expected time** for search, insert, delete
- **Cache-friendly**: Nodes are allocated in contiguous memory regions; forward pointers follow sequential patterns
- **Simpler than balanced BSTs**: No rotations, no color flipping — just pointer manipulation

**Why Redis chose skip lists over balanced BSTs:**
1. Easier to implement and debug
2. Comparable performance in practice
3. Better cache locality for range queries (sequential traversal)
4. Simpler concurrent modifications (important for Redis internals)
5. Each node stores a **span** (number of elements skipped) enabling O(log n) rank lookups

### Redis Sorted Set Memory Layout

Each skip list node in Redis stores:
- `member` (SDS string): the member name
- `score` (double): 8 bytes
- `backward` pointer: for reverse traversal
- `level[]` array: forward pointer + span for each level

```
┌─────────────────────────────────────┐
│         Skip List Node              │
├─────────────────────────────────────┤
│ member: "user_99" (SDS, ~24 bytes)  │
│ score: 8500.0 (8 bytes)             │
│ backward: ptr (8 bytes)             │
│ level[0]: forward + span            │
│ level[1]: forward + span            │
│ ...                                 │
│ Overhead: ~64-96 bytes per node     │
└─────────────────────────────────────┘
```

---

## 4. Implementation Detail

### Leaderboard Key Naming Convention

Use a structured naming scheme for different leaderboard types:

```
leaderboard:alltime              — persistent, never expires
leaderboard:monthly:2024-01      — expires after the month ends
leaderboard:weekly:2024-W03      — expires after the week ends
leaderboard:daily:2024-01-22     — expires after the day ends
```

### Score Update — ZINCRBY

When a player completes a match, the game server calls the API which runs:

```redis
> ZINCRBY leaderboard:weekly:2024-W03 50 user_12345
"1250"
```

`ZINCRBY` is **atomic** — it reads the current score, adds the increment, and repositions the member in the sorted set in a single O(log n) operation. No race conditions, no read-modify-write bugs.

If the member doesn't exist, `ZINCRBY` creates it with the increment as its initial score.

### Get Top 10 — ZREVRANGE

```redis
> ZREVRANGE leaderboard:weekly:2024-W03 0 9 WITHSCORES
 1) "user_99"
 2) "8500"
 3) "user_42"
 4) "8350"
 5) "user_77"
 6) "8100"
 7) "user_55"
 8) "7900"
 9) "user_88"
10) "7650"
11) "user_31"
12) "7400"
13) "user_66"
14) "7100"
15) "user_21"
16) "6800"
17) "user_14"
18) "6500"
19) "user_09"
20) "6200"
```

`ZREVRANGE` returns members in **descending score order** (REV = reverse). Index 0 is the highest score. This is O(log n + k) where k = 10.

### Get User Rank — ZREVRANK

```redis
> ZREVRANK leaderboard:weekly:2024-W03 user_12345
(integer) 41
```

Returns the **0-indexed rank** in descending order. Add 1 for a human-readable rank (42nd place). This is O(log n).

### Get Surrounding Players — Two-Step Process

To show players ranked ±5 around user_12345 (rank 41):

```redis
-- Step 1: Get the user's rank
> ZREVRANK leaderboard:weekly:2024-W03 user_12345
(integer) 41

-- Step 2: Fetch range [rank-5, rank+5] = [36, 46]
> ZREVRANGE leaderboard:weekly:2024-W03 36 46 WITHSCORES
 1) "user_501"
 2) "1290"
 3) "user_208"
 4) "1280"
 5) "user_734"
 6) "1270"
 7) "user_112"
 8) "1260"
 9) "user_900"
10) "1255"
11) "user_12345"
12) "1250"
13) "user_456"
14) "1240"
15) "user_789"
16) "1230"
17) "user_333"
18) "1220"
19) "user_555"
20) "1215"
21) "user_222"
22) "1210"
```

These two commands can be pipelined for a single round trip:

```python
pipe = redis.pipeline()
pipe.zrevrank("leaderboard:weekly:2024-W03", "user_12345")
pipe.execute()  # get rank first

rank = 41
pipe.zrevrange("leaderboard:weekly:2024-W03", max(0, rank-5), rank+5, withscores=True)
results = pipe.execute()
```

### Tie-Breaking Strategy

By default, Redis breaks ties **lexicographically by member name** — which is arbitrary and unfair. In games, the player who achieved the score **first** should rank higher.

**Solution: Encode timestamp into the score.**

Use the score's decimal precision to embed a timestamp:

```
composite_score = base_score * 10^13 + (MAX_TIMESTAMP - actual_timestamp)
```

Where `MAX_TIMESTAMP` is a far-future epoch (e.g., year 2100 = 4102444800). Subtracting the actual timestamp means **earlier achievements get a larger fractional component**, ranking them higher.

```
Player A scores 500 points at timestamp 1706000000:
  composite = 500 * 10^13 + (4102444800 - 1706000000)
            = 5000000000000000 + 2396444800
            = 5000002396444800

Player B scores 500 points at timestamp 1706003600 (1 hour later):
  composite = 500 * 10^13 + (4102444800 - 1706003600)
            = 5000000000000000 + 2396441200
            = 5000002396441200

Player A > Player B → A ranks higher ✓
```

Redis scores are IEEE 754 doubles (64-bit), which provide **~15-16 significant decimal digits** — enough for scores up to ~99,999 with millisecond-precision timestamps.

**Alternative approach: use a secondary sorted set** or a separate timestamp field, and handle tie-breaking at the application level.

### Complete Flow — Python Example

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0)

LEADERBOARD_KEY = "leaderboard:weekly:2024-W03"
MAX_TS = 4102444800  # year 2100

def update_score(user_id: str, score_increment: int):
    """Atomically update a player's score with tie-breaking."""
    current = r.zscore(LEADERBOARD_KEY, user_id) or 0
    base_score = int(current // 10**13)
    new_base = base_score + score_increment
    ts_component = MAX_TS - int(time.time())
    composite = new_base * 10**13 + ts_component
    r.zadd(LEADERBOARD_KEY, {user_id: composite})
    return new_base

def get_top_k(k: int = 10):
    """Return top K players."""
    results = r.zrevrange(LEADERBOARD_KEY, 0, k - 1, withscores=True)
    return [
        {"rank": i + 1, "user_id": uid.decode(), "score": int(score // 10**13)}
        for i, (uid, score) in enumerate(results)
    ]

def get_user_rank(user_id: str):
    """Return 1-indexed rank for a user."""
    rank = r.zrevrank(LEADERBOARD_KEY, user_id)
    if rank is None:
        return None
    score = r.zscore(LEADERBOARD_KEY, user_id)
    return {"rank": rank + 1, "score": int(score // 10**13)}

def get_surrounding(user_id: str, n: int = 5):
    """Return players ranked ±n around the given user."""
    rank = r.zrevrank(LEADERBOARD_KEY, user_id)
    if rank is None:
        return None
    start = max(0, rank - n)
    stop = rank + n
    results = r.zrevrange(LEADERBOARD_KEY, start, stop, withscores=True)
    return [
        {"rank": start + i + 1, "user_id": uid.decode(), "score": int(score // 10**13)}
        for i, (uid, score) in enumerate(results)
    ]
```

---

## 5. System Architecture

### Overall Architecture

```
┌───────────┐   Match     ┌──────────────┐  Score Update  ┌───────────────┐
│   Game    │  Complete   │   Game       │  (internal)    │  Leaderboard  │
│  Client   │───────────→│   Server     │───────────────→│  API Server   │
│ (player)  │            │  (authorit.) │               │               │
└───────────┘            └──────────────┘               └───────┬───────┘
      │                                                         │
      │  GET /v1/scores                                         │
      │  (leaderboard)                                          │
      └─────────────────────────────────────┐                   │
                                            │         ┌─────────▼─────────┐
                                            │         │   Redis Cluster   │
                                            │         │  (Sorted Sets)    │
                                            │         │                   │
                                            │         │  ZINCRBY / ZREV*  │
                                            │         └─────────┬─────────┘
                                            │                   │
                                     ┌──────▼───────┐          │
                                     │ Leaderboard  │          │
                                     │ API Server   │←─────────┘
                                     │              │
                                     │  Join:       │
                                     │  rank data   │     ┌──────────────┐
                                     │  + user info │────→│  User Info   │
                                     │              │     │  Cache (Redis)│
                                     └──────┬───────┘     └──────┬───────┘
                                            │                    │ miss
                                            │             ┌──────▼───────┐
                                            │             │  MySQL / PG  │
                                            │             │ (user table) │
                                            ▼             └──────────────┘
                                     ┌──────────────┐
                                     │   Player     │
                                     │   Client     │
                                     └──────────────┘
```

### Cloud Architecture (AWS Example)

```
                        ┌──────────────────────────────┐
                        │        API Gateway           │
                        │    (rate limiting, auth)      │
                        └─────────┬──────────┬─────────┘
                                  │          │
                    ┌─────────────▼──┐  ┌────▼─────────────┐
                    │  Write Path    │  │   Read Path       │
                    │  (Lambda /     │  │   (Lambda /       │
                    │   ECS Tasks)   │  │    ECS Tasks)     │
                    └───────┬────────┘  └────┬──────────────┘
                            │                │
                    ┌───────▼────────────────▼───────┐
                    │     Amazon ElastiCache         │
                    │     (Redis Cluster Mode)       │
                    │                                │
                    │  Primary: writes               │
                    │  Replicas: reads               │
                    └───────────────┬────────────────┘
                                   │
                    ┌──────────────▼─────────────────┐
                    │     Amazon RDS (PostgreSQL)     │
                    │     User profiles, metadata     │
                    └────────────────────────────────┘
```

### Read vs Write Path Separation

| Path | Flow | Optimization |
|---|---|---|
| **Write** | Game Server → API → `ZINCRBY` on Redis Primary | Fire-and-forget OK; async acknowledgment |
| **Read** | Client → API → `ZREVRANGE`/`ZREVRANK` on Redis Replica | Route to read replicas; cache user info |

### Joining Leaderboard Data with User Profiles

Redis stores only `user_id` and `score`. To display usernames, avatars, and other profile data, the API server must **join** leaderboard results with user profile data.

```
Step 1: ZREVRANGE leaderboard 0 9 WITHSCORES
        → [(user_99, 8500), (user_42, 8350), ...]

Step 2: MGET user:info:user_99 user:info:user_42 ...  (from user info cache)
        → [{"name": "ProGamer", "avatar": "..."}, ...]

Step 3: If cache miss → SELECT * FROM users WHERE id IN (99, 42, ...)
        → populate cache, return joined response
```

**Optimization:** The top-10 users change infrequently. Cache the fully joined top-10 response with a **short TTL (5-10 seconds)** to avoid redundant lookups.

### Score Update Security

Scores must **never** be updated directly by clients. The architecture enforces this:

```
❌ Client → Leaderboard API → Redis        (client could send fake scores)
✅ Client → Game Server → Leaderboard API → Redis   (game server validates)
```

The game server is the **authority** — it determines the match outcome, calculates scores, and then calls the leaderboard service with an internal service token.

---

## 6. Scaling Redis

### Single Redis Instance Capacity

Redis can comfortably hold **millions of sorted set members** in a single instance:

```
Memory estimation for a single sorted set:

Per member:
  user_id (SDS string):    ~24 bytes (e.g., "user_12345678")
  score (double):           8 bytes
  skip list node overhead: ~64 bytes (pointers, levels, span)
  hash table entry:        ~56 bytes (dict entry, key ptr)
  ─────────────────────────────────
  Total per member:        ~150 bytes (conservative)

Scale estimates:
  1M users:   150 bytes × 1M   = 150 MB
  5M users:   150 bytes × 5M   = 750 MB
  25M users:  150 bytes × 25M  = 3.75 GB
  100M users: 150 bytes × 100M = 15 GB
  500M users: 150 bytes × 500M = 75 GB
```

| Users | Memory | Single Instance? |
|---|---|---|
| 1M | ~150 MB | Easily |
| 5M | ~750 MB | Yes |
| 25M | ~3.75 GB | Yes (Redis instances commonly run with 25-50 GB) |
| 100M | ~15 GB | Yes, with a large instance |
| 500M | ~75 GB | Borderline — consider sharding |

**For our 25M MAU case, a single Redis instance is sufficient.** This is one of the elegant properties of sorted sets — the entire global leaderboard fits in memory on one machine.

### When Sharding Becomes Necessary

Sharding is needed when:
- Data exceeds a single instance's memory (> ~50 GB practical limit)
- Write throughput exceeds single instance capacity (~100K ops/sec for simple commands)
- You need fault isolation between leaderboard types

### Sharding Approaches

#### Approach 1: Fixed Partitions by Score Range ❌

```
Shard 1: scores 0 – 999
Shard 2: scores 1000 – 4999
Shard 3: scores 5000+
```

**Problems:**
- Extremely uneven distribution — most players cluster in lower score ranges
- Hot shard at the top (frequent top-K reads)
- Score ranges shift over time
- Global rank computation requires cross-shard aggregation

**Verdict:** Bad idea. Avoid.

#### Approach 2: Hash Partitioning

```
Shard = hash(user_id) % N

Shard 0: user_99, user_208, user_555, ...
Shard 1: user_42, user_12345, user_333, ...
Shard 2: user_77, user_900, user_456, ...
```

**Pros:**
- Even data distribution
- Even write distribution

**Cons:**
- **Top-K requires scatter-gather**: must query all N shards, merge results
- **Rank computation is expensive**: user's global rank = sum of "how many users on each shard have higher scores" — N queries per rank lookup
- Increased tail latency (slowest shard determines response time)

```
Top-10 Query with Hash Partitioning:

┌──────────┐    ZREVRANGE 0 9    ┌─────────┐
│          │────────────────────→│ Shard 0 │──→ local top 10
│          │                     └─────────┘
│  API     │    ZREVRANGE 0 9    ┌─────────┐
│  Server  │────────────────────→│ Shard 1 │──→ local top 10
│          │                     └─────────┘
│          │    ZREVRANGE 0 9    ┌─────────┐
│  (merge) │────────────────────→│ Shard 2 │──→ local top 10
│          │                     └─────────┘
└──────────┘
     │
     ▼
  Merge 30 results → global top 10
```

This works but adds complexity and latency. Only justified at massive scale (500M+ users).

#### Approach 3: Application-Level Sharding by Leaderboard Type ✅

```
Redis Instance 1: leaderboard:daily:*      (small, ephemeral)
Redis Instance 2: leaderboard:weekly:*     (medium)
Redis Instance 3: leaderboard:monthly:*    (medium)
Redis Instance 4: leaderboard:alltime      (large, persistent)
```

**Pros:**
- No scatter-gather needed — each leaderboard is a single sorted set on one instance
- Natural isolation — daily boards don't affect all-time performance
- Independent scaling — allocate more memory to all-time if needed
- Simple failover — losing the daily instance doesn't affect all-time rankings

**Verdict:** Best approach for most real-world leaderboard systems.

### Redis Cluster vs Application-Level Sharding

| Aspect | Redis Cluster | Application Sharding |
|---|---|---|
| Key distribution | Automatic (hash slots) | Manual routing |
| Single sorted set size | Limited to one node | Limited to one node |
| Cross-key operations | Limited (`{hashtag}` required) | Full flexibility |
| Operational complexity | Redis manages failover | Application manages routing |
| Best for | Generic key-value scaling | Domain-specific optimization |

For leaderboards, **application-level sharding is preferred** because each leaderboard must be a single sorted set (you can't split one sorted set across Redis Cluster shards).

### Persistence and Durability

Redis is primarily in-memory, but leaderboard data should survive restarts:

| Strategy | Description | Trade-off |
|---|---|---|
| **RDB snapshots** | Point-in-time dump every N seconds | Fast recovery, some data loss |
| **AOF (Append-Only File)** | Log every write command | Minimal data loss, larger files |
| **RDB + AOF** | Both combined | Best durability, recommended |

Configuration:

```
# redis.conf
save 60 10000        # RDB snapshot if 10K changes in 60 seconds
appendonly yes       # Enable AOF
appendfsync everysec # Fsync AOF every second (good balance)
```

Even with persistence, Redis data is **reconstructible** — the game server is the source of truth. In disaster recovery, you can replay match results from the game database to rebuild leaderboards.

### High Availability — Failover

```
┌────────────────────────────────────────┐
│          Redis Sentinel Setup          │
│                                        │
│  ┌──────────┐  replication  ┌────────┐ │
│  │ Primary  │──────────────→│Replica │ │
│  │ (writes) │               │(reads) │ │
│  └──────────┘               └────────┘ │
│       │                         │      │
│  ┌────▼─────────────────────────▼────┐ │
│  │         Sentinel Cluster          │ │
│  │  (monitors, auto-failover)        │ │
│  │  Promotes replica if primary dies  │ │
│  └───────────────────────────────────┘ │
└────────────────────────────────────────┘
```

- **Redis Sentinel**: Monitors primary, auto-promotes replica on failure. Good for single-instance setups.
- **Redis Cluster**: Built-in sharding + failover. Each shard has primary + replicas. Better for large-scale deployments.

---

## 7. Multiple Leaderboard Types

### Time-Bounded Leaderboards

| Type | Key Pattern | TTL | Reset |
|---|---|---|---|
| Daily | `leaderboard:daily:2024-01-22` | 48 hours | New key each day |
| Weekly | `leaderboard:weekly:2024-W03` | 2 weeks | New key each week |
| Monthly | `leaderboard:monthly:2024-01` | 60 days | New key each month |
| All-time | `leaderboard:alltime` | None | Never resets |

### Implementation with TTL

```redis
-- Create a weekly leaderboard that auto-expires
> ZINCRBY leaderboard:weekly:2024-W03 50 user_12345
"50"

-- Set expiry to end of week + buffer (in seconds)
> EXPIREAT leaderboard:weekly:2024-W03 1706486400
(integer) 1

-- When a new week starts, the old key is still available for viewing
-- but a new key is used for score updates
```

### Score Update Across Multiple Leaderboards

When a player scores, **update all active leaderboards** in a single pipeline:

```python
def update_all_leaderboards(user_id: str, score_increment: int):
    pipe = redis.pipeline()

    today = datetime.now()
    daily_key = f"leaderboard:daily:{today.strftime('%Y-%m-%d')}"
    weekly_key = f"leaderboard:weekly:{today.strftime('%Y-W%W')}"
    monthly_key = f"leaderboard:monthly:{today.strftime('%Y-%m')}"
    alltime_key = "leaderboard:alltime"

    pipe.zincrby(daily_key, score_increment, user_id)
    pipe.zincrby(weekly_key, score_increment, user_id)
    pipe.zincrby(monthly_key, score_increment, user_id)
    pipe.zincrby(alltime_key, score_increment, user_id)

    # Set TTLs (idempotent — won't shorten existing TTL)
    pipe.expire(daily_key, 48 * 3600)       # 48 hours
    pipe.expire(weekly_key, 14 * 86400)     # 2 weeks
    pipe.expire(monthly_key, 60 * 86400)    # 60 days

    pipe.execute()
```

This issues 7 commands in a single pipeline — one network round trip, all atomic within the pipeline.

### All-Time Leaderboard Monitoring

The all-time leaderboard grows indefinitely. Monitor it:

```redis
> ZCARD leaderboard:alltime
(integer) 25000000

> DEBUG OBJECT leaderboard:alltime
Value at:0x7f... encoding:skiplist serializedlength:890234567 ...

> MEMORY USAGE leaderboard:alltime
(integer) 3758096384   # ~3.75 GB
```

If memory approaches limits, consider archiving inactive users (no score updates in 6+ months) to a secondary store.

---

## 8. Alternative Approaches

### Comparison Table

| Approach | Write | Rank Query | Top-K | Memory | Complexity | Best For |
|---|---|---|---|---|---|---|
| **Redis Sorted Set** | O(log n) | O(log n) | O(log n + k) | In-memory | Low | Real-time, ≤100M users |
| **RDBMS + Index** | O(log n) | O(n) | O(n log n) | Disk | Low | Small scale, < 100K |
| **RDBMS + Materialized View** | O(1) write, periodic refresh | O(log n) | O(k) | Disk | Medium | Near-real-time, < 1M |
| **Segment Tree / BIT** | O(log M) | O(log M) | O(k log M) | In-memory | High | Dense score ranges |
| **Write-Behind + Batch** | Buffered | O(log n) | O(log n + k) | In-memory | Medium | Very high write volume |
| **Approximate (Count-Min)** | O(1) | ~O(1) | N/A | In-memory | High | Billions of users, approx OK |

*M = max possible score value, n = number of users, k = result set size*

### RDBMS with Materialized Views

Instead of sorting on every query, pre-compute rankings periodically:

```sql
CREATE MATERIALIZED VIEW leaderboard_ranked AS
SELECT user_id, score,
       RANK() OVER (ORDER BY score DESC) as rank
FROM leaderboard;

-- Refresh every 30 seconds
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_ranked;
```

**Pros:** Simple, uses existing infrastructure, handles complex tiebreakers
**Cons:** Not truly real-time (30-second delay), expensive refresh at scale, doesn't scale beyond ~1M users

### Segment Tree / Binary Indexed Tree (Fenwick Tree)

When scores are integers in a **bounded range** (e.g., 0 to 1,000,000), a segment tree or BIT can answer "how many players have score ≥ X" in O(log M) time:

```
Score range: 0 to 7 (simplified)

Segment Tree:
              [0-7]: 8 players
             /              \
      [0-3]: 5 players    [4-7]: 3 players
       /       \            /       \
   [0-1]: 3  [2-3]: 2  [4-5]: 2  [6-7]: 1
   /   \     /   \     /   \     /   \
 [0]:1 [1]:2 [2]:1 [3]:1 [4]:1 [5]:1 [6]:0 [7]:1
```

**Rank of player with score 5:**
Count of players with score > 5 = count in [6-7] = 1
Rank = 1 + 1 = 2

**Pros:** O(log M) rank queries regardless of user count
**Cons:** Only works for integer scores, bounded range, complex to implement, harder to distribute

### Write-Behind Pattern

Buffer score updates and flush to Redis in batches:

```
┌──────────┐     ┌──────────────┐     ┌───────────┐     ┌───────────┐
│  Game    │────→│  In-Memory   │────→│  Batch    │────→│   Redis   │
│  Server  │     │  Buffer      │     │  Writer   │     │  Sorted   │
│          │     │  (per-user   │     │  (every   │     │  Set      │
│          │     │   aggregate) │     │   1-5 sec)│     │           │
└──────────┘     └──────────────┘     └───────────┘     └───────────┘
```

**When to use:** If write volume exceeds Redis capacity (unlikely for our scale, but relevant at 100K+ writes/sec). Trades real-time accuracy for write throughput.

### Approximate Rankings

For leaderboards with **billions of entries** where exact rank isn't critical:

- **Percentile-based**: "You are in the top 5%" instead of "You are rank 142,857"
- **Bucket-based**: Divide score range into buckets, count players per bucket, approximate rank from bucket counts
- **HyperLogLog**: Estimate distinct count of players above a score

These sacrifice precision for extreme scalability.

---

## 9. Additional Features

### Friends Leaderboard

Show a player's ranking among their friends only.

**Approach 1: Per-User Sorted Set** (write-heavy)

```redis
-- When user_A scores, update all friends' leaderboards
ZINCRBY friends:leaderboard:user_B 50 user_A
ZINCRBY friends:leaderboard:user_C 50 user_A
ZINCRBY friends:leaderboard:user_D 50 user_A
...
```

**Problem:** If a user has 500 friends, each score update triggers 500 Redis writes. At 600 updates/sec × 500 friends = 300K writes/sec — not practical.

**Approach 2: Compute on Read** (read-heavy, preferred)

```python
def get_friends_leaderboard(user_id: str, friends: list[str]):
    """Fetch friends' scores from the global leaderboard and sort."""
    pipe = redis.pipeline()
    for friend_id in friends:
        pipe.zscore("leaderboard:alltime", friend_id)
    scores = pipe.execute()

    entries = [
        {"user_id": fid, "score": s}
        for fid, s in zip(friends, scores)
        if s is not None
    ]
    entries.sort(key=lambda x: x["score"], reverse=True)

    for i, entry in enumerate(entries):
        entry["rank"] = i + 1

    return entries
```

This fetches N scores via pipeline (one round trip) and sorts client-side. For 500 friends, this is trivially fast.

**Approach 3: Small sorted set with ZINTERSTORE** (if friends share a common set)

```redis
-- Create a temporary set of friend IDs with weight 0
ZADD temp:friends:user_A 0 friend_1 0 friend_2 0 friend_3 ...

-- Intersect with global leaderboard to get only friends' scores
ZINTERSTORE result:friends:user_A 2 leaderboard:alltime temp:friends:user_A WEIGHTS 1 0

-- Read the result
ZREVRANGE result:friends:user_A 0 -1 WITHSCORES

-- Cleanup
DEL temp:friends:user_A result:friends:user_A
```

### Country / Region Leaderboards

Maintain separate sorted sets per region:

```redis
ZINCRBY leaderboard:weekly:US 50 user_12345
ZINCRBY leaderboard:weekly:EU 50 user_67890
ZINCRBY leaderboard:weekly:GLOBAL 50 user_12345
```

The region is determined at account creation or from the game server's metadata. Each score update goes to both the regional and global leaderboards.

### Historical Leaderboards

At the end of each period, snapshot the leaderboard for historical viewing:

```python
def archive_leaderboard(period_key: str):
    """Snapshot a leaderboard to the database for historical access."""
    top_entries = redis.zrevrange(period_key, 0, 999, withscores=True)

    records = [
        {"period": period_key, "rank": i+1, "user_id": uid, "score": score}
        for i, (uid, score) in enumerate(top_entries)
    ]

    db.bulk_insert("leaderboard_history", records)
```

Store in a relational database or object storage (S3 as JSON/Parquet) for cheap long-term retention.

### Cheat Detection

| Check | Description | Implementation |
|---|---|---|
| **Velocity check** | Score increase per hour exceeds maximum possible | Track score delta per time window |
| **Anomaly detection** | Sudden jump in rank (e.g., 50,000th → 1st) | Compare rank before/after update |
| **Match validation** | Score increment doesn't match possible game outcomes | Game server validates before sending |
| **Rate limiting** | Too many score updates per minute | API Gateway rate limit per user |
| **Statistical outlier** | Score is N standard deviations above mean | Periodic batch analysis |

```python
MAX_SCORE_PER_MATCH = 100
MAX_MATCHES_PER_HOUR = 15

def validate_score_update(user_id: str, increment: int) -> bool:
    if increment > MAX_SCORE_PER_MATCH:
        flag_for_review(user_id, "excessive_single_score")
        return False

    recent_updates = redis.get(f"rate:{user_id}:hourly")
    if recent_updates and int(recent_updates) > MAX_MATCHES_PER_HOUR:
        flag_for_review(user_id, "excessive_match_frequency")
        return False

    redis.incr(f"rate:{user_id}:hourly")
    redis.expire(f"rate:{user_id}:hourly", 3600)
    return True
```

---

## 10. Trade-offs & Interview Tips

### Key Design Decisions

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Storage | Redis Sorted Set | RDBMS | **Redis** for real-time; RDBMS as source of truth |
| Ranking | Exact rank | Approximate percentile | **Exact** for ≤ 100M; approximate for billions |
| Tie-breaking | Timestamp in score | Secondary sort field | **Timestamp in score** (single Redis command) |
| Sharding | Hash partition | By leaderboard type | **By leaderboard type** (avoids scatter-gather) |
| Friends board | Per-user sorted set | Compute on read | **Compute on read** (avoids write amplification) |
| Persistence | Redis only | Redis + DB backup | **Both** (Redis for speed, DB for recovery) |
| Update model | Real-time | Batch (write-behind) | **Real-time** for ≤ 5K writes/sec |
| User info | Join per request | Cache top-N | **Cache** with short TTL |

### Memory vs Persistence Trade-off

```
           ┌──────────────────────────────────────────────────┐
           │              Durability Spectrum                  │
           │                                                   │
  Fast ◄───┼───────────────────────────────────────────────────┼──► Durable
           │                                                   │
  Redis    │  Redis +    Redis +     Redis +      MySQL/PG    │
  (no      │  RDB       AOF         RDB+AOF      (disk-      │
  persist) │  snapshots  everysec   (recommended)  primary)   │
           │                                                   │
  Risk:    │  Minutes    Seconds     ~1 second     Zero        │
  data     │  of loss    of loss     of loss       data loss   │
  loss     │                                                   │
           └──────────────────────────────────────────────────┘
```

For leaderboards, **RDB + AOF** is the sweet spot. Even if Redis dies, leaderboards can be reconstructed from the game database (source of truth).

### Common Follow-Up Questions and Answers

**Q: What if two players have the same score?**
A: Encode timestamp into the score so the player who achieved it first ranks higher. Use `composite_score = base_score * 10^13 + (MAX_TS - timestamp)`.

**Q: How do you handle a player who hasn't played in months?**
A: For time-bounded leaderboards (daily/weekly), they naturally disappear when the key expires. For all-time, they remain. Optionally archive inactive users to reduce memory.

**Q: Can this system handle 1 billion users?**
A: At 1B users, a single sorted set needs ~150 GB. Sharding by hash partition with scatter-gather for top-K becomes necessary. Approximate rankings may be more practical. Consider segment trees for dense integer score ranges.

**Q: How do you prevent cheating?**
A: Score updates come only from the game server (never the client). Add velocity checks, rate limiting, anomaly detection, and periodic statistical analysis.

**Q: How would you add a "friends only" leaderboard?**
A: Compute on read — fetch each friend's score from the global leaderboard via pipeline, sort client-side. Avoid per-user sorted sets due to write amplification.

**Q: What happens if Redis goes down?**
A: Redis Sentinel or Cluster auto-promotes a replica. Data loss is minimal with AOF persistence. Leaderboards can be fully rebuilt from the game database.

**Q: How do you display leaderboard updates in real-time on the client?**
A: Clients poll every 5-10 seconds, or use WebSocket push. For the top-10, cache the result with a 5-second TTL and broadcast changes via pub/sub.

### Quick Reference Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────┐
│           REAL-TIME LEADERBOARD — CHEAT SHEET                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CORE DATA STRUCTURE: Redis Sorted Set (ZSET)                   │
│                                                                  │
│  KEY COMMANDS:                                                   │
│    ZINCRBY lb score user   → update score    O(log n)           │
│    ZREVRANGE lb 0 9        → top 10          O(log n + k)       │
│    ZREVRANK lb user        → get rank        O(log n)           │
│    ZSCORE lb user          → get score       O(1)               │
│    ZCARD lb                → total count     O(1)               │
│                                                                  │
│  INTERNALS: Skip list + Hash table                              │
│                                                                  │
│  MEMORY: ~150 bytes/user → 25M users ≈ 3.75 GB                 │
│                                                                  │
│  SCALE:                                                          │
│    ≤100M users  → single Redis instance                         │
│    >100M users  → shard by leaderboard type or hash partition   │
│                                                                  │
│  TIE-BREAKING: score * 10^13 + (MAX_TS - timestamp)            │
│                                                                  │
│  PERSISTENCE: RDB snapshots + AOF (everysec)                    │
│                                                                  │
│  HA: Redis Sentinel or Redis Cluster                            │
│                                                                  │
│  MULTIPLE BOARDS: separate keys with TTL                        │
│    leaderboard:daily:YYYY-MM-DD                                 │
│    leaderboard:weekly:YYYY-WNN                                  │
│    leaderboard:alltime                                          │
│                                                                  │
│  FRIENDS BOARD: compute on read (ZSCORE pipeline + app sort)    │
│                                                                  │
│  SECURITY: game server is sole writer, never trust client       │
│                                                                  │
│  ALTERNATIVES:                                                   │
│    Small scale     → RDBMS + materialized view                  │
│    Dense scores    → Segment tree / Fenwick tree                │
│    Extreme scale   → Approximate rankings                       │
│                                                                  │
│  API:                                                            │
│    POST /v1/scores              → update (game server only)     │
│    GET  /v1/scores?top=10       → top K                         │
│    GET  /v1/scores/{id}/rank    → user rank + neighbors         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Interview Flow — How to Present This in 35 Minutes

```
Time    Section                              Key Points
─────   ──────────────────────────────────   ───────────────────────────────
0-3     Requirements & Scale                 5M DAU, 600 writes/sec, real-time
3-5     API Design                           3 endpoints, auth model
5-8     Naive Approach → Why It Fails        RDBMS ORDER BY is O(n)
8-15    Redis Sorted Set Solution            ZADD, ZREVRANK, ZREVRANGE
                                             Skip list internals, O(log n)
15-20   System Architecture                  Game server → API → Redis → DB join
20-25   Scaling & Persistence                Memory estimation, sharding, AOF
25-30   Multiple Leaderboards & Features     Time-bounded, friends, tie-breaking
30-35   Trade-offs & Extensions              Cheat detection, alternatives
```

---

## Appendix: Redis Commands Quick Reference

```redis
-- Setup: Add initial scores
ZADD lb 500 alice 400 bob 600 charlie 550 diana 450 eve

-- Increment alice's score by 100
ZINCRBY lb 100 alice
-- Returns: "600"

-- Top 3 players (descending)
ZREVRANGE lb 0 2 WITHSCORES
-- 1) "alice"       2) "600"
-- 3) "charlie"     4) "600"
-- 5) "diana"       6) "550"

-- Alice's rank (0-indexed, descending)
ZREVRANK lb alice
-- (integer) 0   ← tied with charlie, lexicographic tiebreak

-- Total number of players
ZCARD lb
-- (integer) 5

-- Alice's exact score
ZSCORE lb alice
-- "600"

-- Players with score between 400 and 550 (ascending)
ZRANGEBYSCORE lb 400 550 WITHSCORES
-- 1) "bob"    2) "400"
-- 3) "eve"    4) "450"
-- 5) "diana"  6) "550"

-- Remove a player
ZREM lb eve
-- (integer) 1

-- Count players with score >= 500
ZCOUNT lb 500 +inf
-- (integer) 3
```

The file has been created with comprehensive coverage of all 10 sections. It includes:

- **Scale estimation** with detailed back-of-envelope calculations
- **API design** with request/response examples
- **Redis Sorted Set deep dive** — skip list internals with ASCII diagrams, all key commands with time complexity
- **Implementation details** — Python code, Redis command examples with actual output, tie-breaking with timestamp encoding
- **System architecture** — full ASCII diagrams for both logical and cloud (AWS) architectures, read/write path separation
- **Scaling analysis** — memory estimation table, three sharding approaches with trade-offs, persistence and failover strategies
- **Multiple leaderboard types** — TTL-based key management, pipelined multi-board updates
- **Alternative approaches** — comparison table covering RDBMS, segment trees, write-behind, approximate rankings
- **Additional features** — friends leaderboard (3 approaches), regional boards, historical snapshots, cheat detection
- **Interview tips** — decision table, follow-up Q&A, 35-minute presentation timeline, and a quick reference cheat sheet