---
sidebar_position: 4
title: "03 — Rate Limiting"
slug: 03-rate-limiting
---

# 🚦 Rate Limiting & Traffic Management

Rate limiting controls the volume of requests a system accepts, protecting against abuse, ensuring fair usage, and keeping services stable under load. This chapter covers every major algorithm, distributed strategies, and the broader traffic management ecosystem.

---

## 1. Why Rate Limit?

| Reason | Description | Example |
|--------|-------------|---------|
| **DDoS protection** | Mitigate denial-of-service attacks | Block IP sending 10k req/s |
| **Fair usage** | Prevent one user from monopolizing resources | Cap each API key at 1000 req/min |
| **Cost control** | Protect expensive downstream resources | Limit calls to third-party payment API |
| **Abuse prevention** | Stop brute force, scraping, spam | Limit login attempts to 5/min |
| **Stability** | Prevent cascading failures under load | Shed traffic before servers collapse |
| **Revenue** | Enforce tiered pricing | Free: 100 req/hr, Pro: 10k req/hr |

:::tip Senior-Level Insight
Rate limiting is not just about protection — it's a **product feature**. Different tiers get different limits, rate limit headers inform clients how to behave, and well-designed limits improve the overall API ecosystem. Design rate limits as a first-class API concern, not an afterthought.
:::

---

## 2. Token Bucket

The most widely used algorithm. A bucket holds tokens; each request consumes a token. Tokens are replenished at a fixed rate. Allows controlled bursts.

### How It Works

```
Token Bucket (capacity=5, refill_rate=1 token/sec):

  Time 0s:  [●][●][●][●][●]  5 tokens (full)
  Request → [●][●][●][●][ ]  4 tokens (1 consumed)
  Request → [●][●][●][ ][ ]  3 tokens
  Request → [●][●][ ][ ][ ]  2 tokens
  Time 1s:  [●][●][●][ ][ ]  3 tokens (1 refilled)
  Burst 3→  [ ][ ][ ][ ][ ]  0 tokens (3 consumed)
  Request → REJECTED (0 tokens) → 429 Too Many Requests
  Time 1s:  [●][ ][ ][ ][ ]  1 token (refilled)
  Request → [ ][ ][ ][ ][ ]  0 tokens (allowed)
```

### Implementation

```python
import time

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity       # max tokens
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def allow(self, tokens: int = 1) -> bool:
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + new_tokens)
        self.last_refill = now

# Usage
bucket = TokenBucket(capacity=10, refill_rate=2)  # 10 burst, 2/sec steady
for i in range(15):
    if bucket.allow():
        print(f"Request {i}: ALLOWED")
    else:
        print(f"Request {i}: RATE LIMITED")
```

### Properties

| Property | Value |
|----------|-------|
| **Burst size** | Equal to bucket capacity |
| **Steady-state rate** | Equal to refill rate |
| **Memory per limiter** | O(1) — just tokens + timestamp |
| **Used by** | AWS API Gateway, Stripe, most cloud APIs |

---

## 3. Leaky Bucket

Processes requests at a **constant rate**, regardless of input burstiness. Requests enter a queue (bucket); if the queue is full, requests are dropped.

### How It Works

```
Leaky Bucket (queue_size=5, drain_rate=1 req/sec):

  Incoming requests (bursty):     Queue:              Output (constant):
  ████ (4 at once)            →   [R][R][R][R][ ]  →  R . . .
  ██ (2 more)                 →   [R][R][R][R][R]  →  R . . .
  ███ (3 more)                →   [R][R][R][R][R]  →  R . . .
                                   ^^^ 1 dropped!        constant rate
                                   (queue full)
```

```python
import time
from collections import deque

class LeakyBucket:
    def __init__(self, capacity: int, drain_rate: float):
        self.capacity = capacity       # max queue size
        self.drain_rate = drain_rate   # requests processed per second
        self.queue = deque()
        self.last_drain = time.monotonic()

    def allow(self) -> bool:
        self._drain()
        if len(self.queue) < self.capacity:
            self.queue.append(time.monotonic())
            return True
        return False  # queue full — drop

    def _drain(self):
        now = time.monotonic()
        elapsed = now - self.last_drain
        to_drain = int(elapsed * self.drain_rate)
        for _ in range(min(to_drain, len(self.queue))):
            self.queue.popleft()
        if to_drain > 0:
            self.last_drain = now
```

### Token Bucket vs Leaky Bucket

| Aspect | Token Bucket | Leaky Bucket |
|--------|-------------|-------------|
| **Burst handling** | Allows bursts up to capacity | Smooths bursts to constant rate |
| **Output rate** | Variable (bursty) | Constant (smooth) |
| **Best for** | APIs allowing occasional bursts | Systems needing uniform throughput |
| **Memory** | O(1) | O(queue_size) |
| **Starvation** | No queuing, immediate decision | Old requests may wait, new ones drop |

---

## 4. Fixed Window Counter

Divide time into fixed windows (e.g., 1-minute intervals). Count requests per window. Reject when count exceeds limit.

### How It Works

```
Fixed Window (limit=5 per minute):

  Window 1 (00:00 - 00:59)    Window 2 (01:00 - 01:59)
  ┌──────────────────────┐    ┌──────────────────────┐
  │ R R R R R            │    │ R R R                 │
  │ count: 5 → limit hit │    │ count: 3 → OK         │
  └──────────────────────┘    └──────────────────────┘

  Boundary problem:
  Window 1                     Window 2
  ┌──────────────────────┐    ┌──────────────────────┐
  │              R R R R R│    │R R R R R             │
  │              ^^^ last │    │^^^ first 5 seconds   │
  │              5 seconds│    │                      │
  └──────────────────────┘    └──────────────────────┘

  10 requests in 10 seconds at the window boundary!
  (2× the intended rate)
```

```python
import time

class FixedWindowCounter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.counts = {}  # window_key -> count

    def allow(self, key: str) -> bool:
        window = int(time.time() // self.window_seconds)
        window_key = f"{key}:{window}"
        count = self.counts.get(window_key, 0)
        if count >= self.limit:
            return False
        self.counts[window_key] = count + 1
        return True
```

:::warning
The fixed window boundary problem can allow **up to 2× the intended rate** at window edges. This is acceptable for coarse-grained limiting but not for strict rate enforcement.
:::

---

## 5. Sliding Window Log

Track the timestamp of every request. To check if a new request is allowed, count requests in the last N seconds by filtering timestamps.

### How It Works

```
Sliding Window Log (limit=5 per 60s):

  Timestamps log: [10:00:05, 10:00:12, 10:00:30, 10:00:45, 10:00:58]

  New request at 10:01:10:
    Remove entries older than 10:00:10 (60s ago)
    → Remove 10:00:05
    → Remaining: [10:00:12, 10:00:30, 10:00:45, 10:00:58] = 4 entries
    → 4 < 5 limit → ALLOWED
    → Add 10:01:10 to log

  No boundary problem — always exact count in rolling window
```

```python
import time
from collections import deque

class SlidingWindowLog:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.logs = {}  # key -> deque of timestamps

    def allow(self, key: str) -> bool:
        now = time.time()
        if key not in self.logs:
            self.logs[key] = deque()

        log = self.logs[key]

        # Remove timestamps outside the window
        while log and log[0] <= now - self.window_seconds:
            log.popleft()

        if len(log) >= self.limit:
            return False

        log.append(now)
        return True
```

| Pros | Cons |
|------|------|
| Perfectly accurate — no boundary issues | High memory: stores every timestamp |
| Simple to understand | O(n) cleanup per check in worst case |
| Works well for low-rate limits | Impractical for high-rate limits (millions of timestamps) |

---

## 6. Sliding Window Counter

A **hybrid** of fixed window counter and sliding window log. Uses weighted counts from the current and previous windows to approximate a sliding window — accurate enough for production with O(1) memory.

### How It Works

```
Sliding Window Counter (limit=100 per minute):

  Previous window (00:00-00:59): 84 requests
  Current window  (01:00-01:59): 36 requests

  Request arrives at 01:15 (25% into current window):

  Weighted count = prev_count × (1 - position_in_window) + curr_count
                 = 84 × (1 - 0.25) + 36
                 = 84 × 0.75 + 36
                 = 63 + 36
                 = 99

  99 < 100 → ALLOWED

  ├─── Previous Window ────┤─── Current Window ────┤
  │        84 requests      │    36 requests         │
  │                         │▲                       │
  │                         ││ 25% into window       │
  │     75% weight ─────────┤│                       │
  │                         │└─── 100% weight ──────▶│
```

```python
import time

class SlidingWindowCounter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.prev_count = {}   # key -> count in previous window
        self.curr_count = {}   # key -> count in current window
        self.prev_window = {}  # key -> previous window id
        self.curr_window = {}  # key -> current window id

    def allow(self, key: str) -> bool:
        now = time.time()
        window_id = int(now // self.window_seconds)
        position = (now % self.window_seconds) / self.window_seconds

        # Roll windows if needed
        if self.curr_window.get(key) != window_id:
            self.prev_count[key] = self.curr_count.get(key, 0)
            self.curr_count[key] = 0
            self.prev_window[key] = self.curr_window.get(key)
            self.curr_window[key] = window_id

        # Calculate weighted count
        prev = self.prev_count.get(key, 0)
        curr = self.curr_count.get(key, 0)
        weighted = prev * (1 - position) + curr

        if weighted >= self.limit:
            return False

        self.curr_count[key] = curr + 1
        return True
```

---

## 7. Algorithm Comparison

| Algorithm | Accuracy | Memory | Burst Handling | Complexity | Best For |
|-----------|:--------:|:------:|:--------------:|:----------:|----------|
| **Token Bucket** | Good | O(1) | ✅ Allows bursts | Simple | APIs, general use |
| **Leaky Bucket** | Good | O(queue) | ❌ Smooths out | Simple | Constant output rate |
| **Fixed Window** | Poor (boundary) | O(1) | ⚠️ 2× at edges | Very simple | Low-precision needs |
| **Sliding Window Log** | Perfect | O(n) | ✅ Exact | Moderate | Low-rate, precise limits |
| **Sliding Window Counter** | Very good | O(1) | ⚠️ Approximation | Moderate | Production default |

```
Accuracy vs Memory trade-off:

  Accuracy  │  Sliding Log
            │  ●
            │
            │         Sliding Counter
            │         ●
            │
            │    Token Bucket
            │    ●
            │              Leaky Bucket
            │              ●
            │
            │                    Fixed Window
            │                    ●
            └──────────────────────────────── Memory
               Low                        High
```

:::tip Senior-Level Insight
For most production systems, **token bucket** or **sliding window counter** strikes the right balance. Use token bucket when you want to allow controlled bursts (APIs). Use sliding window counter when you want smooth, predictable rate enforcement (background job processing). Reserve sliding window log for cases where exact precision is worth the memory cost (billing, compliance).
:::

---

## 8. Distributed Rate Limiting

Single-instance rate limiting breaks when your service runs on multiple instances. Distributed rate limiting ensures a global view of request counts.

### Approaches

```
Approach 1 — Centralized (Redis):

  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ Instance │   │ Instance │   │ Instance │
  │    A     │   │    B     │   │    C     │
  └────┬─────┘   └────┬─────┘   └────┬─────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
                 ┌────▼────┐
                 │  Redis  │  ← Single source of truth
                 │ (INCR + │    for rate counters
                 │  EXPIRE)│
                 └─────────┘

Approach 2 — Local + Sync:

  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ Instance │   │ Instance │   │ Instance │
  │ local:33 │◄─►│ local:28 │◄─►│ local:39 │
  │ limit:33 │   │ limit:33 │   │ limit:33 │
  └──────────┘   └──────────┘   └──────────┘
  Global limit = 100 / 3 instances = ~33 per instance
  + periodic gossip to rebalance
```

### Redis-Based Implementation

```python
import redis
import time

class RedisRateLimiter:
    def __init__(self, redis_client: redis.Redis, limit: int, window_seconds: int):
        self.redis = redis_client
        self.limit = limit
        self.window = window_seconds

    def allow(self, key: str) -> tuple[bool, dict]:
        pipe_key = f"ratelimit:{key}:{int(time.time() // self.window)}"

        with self.redis.pipeline() as pipe:
            pipe.incr(pipe_key)
            pipe.expire(pipe_key, self.window + 1)
            count, _ = pipe.execute()

        remaining = max(0, self.limit - count)
        allowed = count <= self.limit

        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(time.time() // self.window + 1) * self.window),
        }

        return allowed, headers
```

### Lua Script for Atomicity (Sliding Window in Redis)

```lua
-- sliding_window_rate_limit.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add new entry and allow
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('EXPIRE', key, window)
    return 1  -- allowed
else
    return 0  -- denied
end
```

### Distributed Challenges

| Challenge | Description | Mitigation |
|-----------|-------------|------------|
| **Latency** | Redis call adds ~1ms per request | Local cache with async sync |
| **Redis failure** | Rate limiting stops if Redis down | Fail-open (allow all) or fail-closed (reject all) |
| **Race conditions** | Concurrent INCR can overshoot | Use Lua scripts for atomicity |
| **Clock skew** | Different instances see different windows | Use Redis server time, not local time |
| **Hot keys** | Popular users hammer same Redis key | Shard keys across Redis cluster nodes |

---

## 9. Rate Limiting at Different Layers

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        Client                               │
  │  Adaptive throttling: back off when 429s received           │
  └────────────────────────────┬────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────┐
  │                    CDN / WAF                                │
  │  IP-based rate limiting, bot detection, geo-blocking         │
  └────────────────────────────┬────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────┐
  │                  API Gateway                                │
  │  Per-API-key limits, per-endpoint limits, plan enforcement   │
  └────────────────────────────┬────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────┐
  │                Application Layer                            │
  │  Business logic limits (e.g., max 3 password resets/hour)    │
  └────────────────────────────┬────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────┐
  │                   Database                                  │
  │  Connection pool limits, query timeout, row-level locks      │
  └─────────────────────────────────────────────────────────────┘
```

| Layer | Limiter Type | Granularity | Example |
|-------|-------------|-------------|---------|
| **CDN/WAF** | IP-based, geo-based | Per IP, per region | Cloudflare rate limiting rules |
| **API Gateway** | Key-based, plan-based | Per API key, per endpoint | Kong, AWS API Gateway throttling |
| **Load Balancer** | Connection-based | Per connection, per backend | NGINX `limit_req` module |
| **Application** | Business logic | Per user, per action | "Max 5 login attempts per minute" |
| **Database** | Connection / query | Per connection pool | PostgreSQL `max_connections` |

---

## 10. Client-Side Throttling

Clients can implement adaptive throttling to avoid overwhelming servers and reduce rejected requests.

### Adaptive Client Throttling

```python
import random

class AdaptiveThrottle:
    """Google SRE adaptive throttling: client tracks acceptance rate
    and probabilistically drops requests when rejection rate is high."""

    def __init__(self, k: float = 2.0):
        self.requests = 0    # total requests sent
        self.accepts = 0     # requests accepted by server
        self.k = k           # aggressiveness multiplier

    def should_send(self) -> bool:
        rejection_probability = max(
            0,
            (self.requests - self.k * self.accepts) / (self.requests + 1)
        )
        return random.random() >= rejection_probability

    def record_response(self, accepted: bool):
        self.requests += 1
        if accepted:
            self.accepts += 1

        # Decay old counts (sliding window approximation)
        if self.requests > 1000:
            self.requests //= 2
            self.accepts //= 2
```

```
Adaptive throttle behavior:

  Acceptance rate: 100%  → rejection_prob ≈ 0%   (send everything)
  Acceptance rate: 80%   → rejection_prob ≈ 10%  (drop some)
  Acceptance rate: 50%   → rejection_prob ≈ 33%  (drop a third)
  Acceptance rate: 20%   → rejection_prob ≈ 73%  (drop most)
  Acceptance rate: 0%    → rejection_prob → 100%  (stop sending)
```

---

## 11. Backpressure Mechanisms

Beyond rate limiting, **backpressure** provides flow control for async and streaming systems where producers and consumers operate at different speeds.

### Queue-Based Backpressure

```
Without backpressure:              With backpressure:

Producer ──▶ [████████████████]    Producer ──▶ [████████──]
              ▲ unbounded queue                   ▲ bounded queue
              OOM risk                            │
                                            signal: "slow down"
                                            or block producer

  Options when queue is full:
  ┌──────────────┬──────────────────────────────────────┐
  │ Block        │ Producer waits until space available  │
  │ Drop newest  │ Discard incoming message              │
  │ Drop oldest  │ Remove head of queue for new message  │
  │ Signal       │ Return backpressure signal to producer│
  └──────────────┴──────────────────────────────────────┘
```

### TCP Flow Control

```
TCP uses a receive window (rwnd) for backpressure:

  Sender                              Receiver
    │                                     │
    │─── Data (1000 bytes) ──────────────▶│  rwnd = 4000
    │─── Data (1000 bytes) ──────────────▶│  rwnd = 3000
    │─── Data (1000 bytes) ──────────────▶│  rwnd = 2000
    │                                     │  (app reads 2000 bytes)
    │◀── ACK, Window = 4000 ─────────────│  rwnd = 4000
    │                                     │
    │─── Data (1000 bytes) ──────────────▶│  rwnd = 3000
    │                                     │  (app stops reading)
    │◀── ACK, Window = 0 ───────────────│  rwnd = 0
    │                                     │
    │    SENDER STOPS                     │  (buffer full)
```

---

## 12. HTTP 429 Response Headers

When rate limiting, return informative headers so clients can self-regulate.

### Standard Headers

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry after 30 seconds.",
    "retry_after": 30,
    "limit": 100,
    "window": "1 minute"
  }
}
```

| Header | Description | Example |
|--------|-------------|---------|
| `Retry-After` | Seconds until client should retry | `30` |
| `X-RateLimit-Limit` | Max requests allowed in window | `100` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `0` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1705312800` |
| `X-RateLimit-Policy` | Description of rate limit policy | `100;w=60` (100 per 60s) |

:::warning
Always include `Retry-After` in 429 responses. Without it, clients retry immediately in a tight loop, making the overload worse. Well-behaved clients use this header to schedule their next request.
:::

---

## 13. Rate Limiting Design Considerations

| Consideration | Options | Trade-off |
|--------------|---------|-----------|
| **Fail-open vs fail-closed** | Allow all when limiter fails vs reject all | Availability vs protection |
| **Granularity** | Per-user, per-IP, per-API-key, per-endpoint | Precision vs complexity |
| **Window type** | Fixed, sliding, token bucket | Accuracy vs memory/compute |
| **Distributed sync** | Centralized Redis, local + gossip, hybrid | Consistency vs latency |
| **Response to limit** | 429 + Retry-After, queue for later, degrade | User experience vs simplicity |
| **Bypass rules** | Internal services, health checks, admin | Security vs operational needs |
| **Monitoring** | Track rejection rate, near-limit users | Cost vs visibility |

### NGINX Rate Limiting Example

```nginx
http {
    # Define rate limit zone: 10 req/sec per IP, 10MB shared memory
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        location /api/ {
            # Allow burst of 20, delay processing after 10
            limit_req zone=api burst=20 delay=10;
            limit_req_status 429;

            proxy_pass http://backend;
        }
    }
}
```

---

## 14. Common Interview Questions — Rate Limiting

| Question | Key Points |
|----------|------------|
| Design a rate limiter for a global API | Token bucket per API key in Redis; Lua for atomicity; handle Redis failures; return 429 + headers |
| Token bucket vs sliding window — when to use each? | Token bucket allows bursts (API-friendly); sliding window is smooth (stricter enforcement) |
| How do you rate limit across multiple data centers? | Centralized Redis cluster, or local limits with async aggregation; accept slight over-admission |
| What happens when your rate limiter (Redis) goes down? | Fail-open (risky but available) or fail-closed (safe but may drop valid traffic); circuit break the limiter itself |
| How would you implement per-user rate limiting? | Identify user (API key, JWT, IP), use user ID as key in token bucket, store counters in Redis |

---
