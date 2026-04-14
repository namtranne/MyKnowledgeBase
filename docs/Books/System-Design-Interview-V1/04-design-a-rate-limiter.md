# Chapter 4 — Design a Rate Limiter

> A rate limiter controls the rate of traffic sent by a client or service. It prevents abuse, protects resources, and ensures fair usage. If the API request count exceeds the threshold, excess calls are dropped.

---

## Why Rate Limiting?

| Reason | Detail |
|--------|--------|
| **Prevent DoS attacks** | Intentional or accidental — a single user flooding the system |
| **Reduce cost** | Fewer excess requests = less server and third-party API cost |
| **Prevent server overload** | Protect backend services from traffic spikes |
| **Fair usage** | Ensure no single user monopolizes shared resources |
| **Compliance** | Some APIs require rate limiting by contract (e.g., payment processors) |

**Real-world examples:**
- Twitter: 300 tweets / 3 hours per account
- Google Docs: 300 read requests / minute per user
- Stripe: bursts of 100 requests, then 25/sec sustained

---

## Step 1: Scope and Requirements

| Requirement | Decision |
|------------|----------|
| Client-side or server-side? | **Server-side** (client-side can be bypassed) |
| Based on what? | IP address, user ID, API key — configurable per rule |
| Scale? | Must handle large volumes — distributed system |
| Inform users? | Yes — return proper HTTP headers |
| Separate service or in-app? | Can be either — API gateway or middleware |

### API Rate Limit Headers (HTTP Standard)

```
HTTP/1.1 429 Too Many Requests
X-Ratelimit-Remaining: 0
X-Ratelimit-Limit: 100
X-Ratelimit-Retry-After: 30
```

| Header | Meaning |
|--------|---------|
| `X-Ratelimit-Remaining` | Remaining allowed requests in the current window |
| `X-Ratelimit-Limit` | Maximum requests allowed per window |
| `X-Ratelimit-Retry-After` | Seconds until the client can retry |
| HTTP 429 | Standard status code for rate-limited requests |

---

## Step 2: Rate Limiting Algorithms

### 1. Token Bucket

The most widely used algorithm (Amazon, Stripe).

```
  Bucket capacity: 4 tokens
  Refill rate: 2 tokens/second

  [████]  ← Full bucket (4 tokens)
  
  Request arrives → consume 1 token → [███ ]
  Request arrives → consume 1 token → [██  ]
  Request arrives → consume 1 token → [█   ]
  Request arrives → consume 1 token → [    ]  ← Empty
  Request arrives → REJECTED (429)
  
  ...1 second later...
  Refill 2 tokens → [██  ]
  Request arrives → consume 1 token → [█   ]
```

| Pros | Cons |
|------|------|
| Memory efficient (2 values: tokens, last refill time) | Two parameters to tune (bucket size, refill rate) |
| Allows bursts up to bucket size | |
| Simple to implement | |

**Configuration**: Typically one bucket per user per API endpoint. Example: 3 buckets per user — one for posting, one for following, one for reading.

#### Implementation

```python
import time

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity       # max burst size
        self.refill_rate = refill_rate  # tokens added per second
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
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

# Usage
bucket = TokenBucket(capacity=10, refill_rate=2)  # 10 burst, 2/sec sustained
for i in range(15):
    result = "ALLOWED" if bucket.allow() else "RATE LIMITED"
    print(f"Request {i}: {result}")
```

#### When to Use

| Scenario | Why Token Bucket Fits |
|----------|-----------------------|
| **Public APIs** (Stripe, AWS, GitHub) | Clients expect burst tolerance — calling 5 endpoints rapidly on page load is normal |
| **Mobile / SPA front-ends** | User actions come in bursts (open app → fire 8 requests); token bucket absorbs this gracefully |
| **Per-user rate limiting** | One bucket per user per endpoint; memory cost is just 2 values per bucket |
| **Tiered API plans** | Easy to express: Free = capacity 10, refill 1/s; Pro = capacity 100, refill 10/s |
| **When downstream can handle short spikes** | Token bucket allows bursts up to `capacity`, so only use if your backend tolerates it |

> **Default choice for most APIs.** If you're unsure which algorithm to pick, start with token bucket.

### 2. Leaking Bucket

Requests processed at a fixed rate, like water leaking from a bucket. Excess requests queue up; if the queue is full, new requests are dropped.

```
  Queue capacity: 4
  Processing rate: 1 req/sec

  Incoming:  [R1] [R2] [R3] [R4] [R5]
  Queue:     [R1][R2][R3][R4]  ← R5 DROPPED (queue full)
  
  Processing: R1 → R2 → R3 → R4 (1 per second)
```

| Pros | Cons |
|------|------|
| Smooth, steady output rate | Recent requests starved if queue full of old requests |
| Memory efficient (fixed queue size) | Two parameters to tune (queue size, outflow rate) |
| Stable processing rate for downstream | No bursting — even if system has capacity |

**Used by**: Shopify (uses leaky bucket for API rate limiting)

#### Implementation

```python
import time
from collections import deque

class LeakyBucket:
    def __init__(self, capacity: int, drain_rate: float):
        self.capacity = capacity       # max queued requests
        self.drain_rate = drain_rate   # requests processed per second
        self.queue = deque()
        self.last_drain = time.monotonic()

    def allow(self) -> bool:
        self._drain()
        if len(self.queue) < self.capacity:
            self.queue.append(time.monotonic())
            return True
        return False  # queue full — reject

    def _drain(self):
        now = time.monotonic()
        elapsed = now - self.last_drain
        to_drain = int(elapsed * self.drain_rate)
        for _ in range(min(to_drain, len(self.queue))):
            self.queue.popleft()
        if to_drain > 0:
            self.last_drain = now
```

#### When to Use

| Scenario | Why Leaky Bucket Fits |
|----------|-----------------------|
| **Webhook delivery / outbound calls** | Downstream expects a steady rate; bursts would overwhelm the receiver |
| **Payment processing pipelines** | Processing must be smooth and predictable to avoid downstream contention |
| **SMTP / email sending** | Mail servers throttle senders who burst; leaky bucket ensures compliance |
| **Audio/video streaming** | Constant bitrate output needed; bursts cause jitter |
| **Systems with strict SLAs on throughput** | When you must guarantee "never more than N/sec" at any instant |

> **Pick over token bucket when smooth output matters more than burst tolerance.** If your downstream will reject or degrade on spikes, leaky bucket is the right choice.

### 3. Fixed Window Counter

Divide time into fixed windows. Count requests per window.

```
  Window: 1 minute
  Limit: 3 requests/window

  [00:00 - 00:59]  │ R1, R2, R3 → Allowed
                    │ R4 → REJECTED
  [01:00 - 01:59]  │ R5, R6 → Allowed  (counter resets)
```

| Pros | Cons |
|------|------|
| Memory efficient | **Boundary burst problem**: 5 requests at 0:59 + 5 at 1:01 = 10 in 2 seconds |
| Simple to understand | Not smooth |
| Easy to reset at window boundaries | |

**The boundary problem:**

```
  Limit: 5 req/min
  
  Window 1: [00:00─────────────00:59] │ .....xxxxx  (5 req at 0:55-0:59)
  Window 2: [01:00─────────────01:59] │ xxxxx.....  (5 req at 1:00-1:04)
  
  10 requests in a 10-second span! Twice the intended limit.
```

#### Implementation

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

        # Clean up old windows to prevent memory leak
        expired = [k for k in self.counts if not k.endswith(f":{window}")]
        for k in expired:
            del self.counts[k]

        count = self.counts.get(window_key, 0)
        if count >= self.limit:
            return False
        self.counts[window_key] = count + 1
        return True

# Redis equivalent (atomic, distributed):
# key = f"ratelimit:{user_id}:{int(time.time() // 60)}"
# count = redis.incr(key)
# redis.expire(key, 60)
# return count <= limit
```

#### When to Use

| Scenario | Why Fixed Window Fits |
|----------|-----------------------|
| **Internal dashboards / admin tools** | Low traffic, low stakes — the boundary problem rarely matters |
| **Coarse rate limits** (daily/hourly caps) | At large windows (1 hour), a 2x spike over a few seconds is negligible |
| **Prototyping / MVP** | Simplest to implement; swap for sliding window counter later |
| **Redis `INCR` + `EXPIRE`** | Maps directly to two Redis commands — zero custom logic |
| **When 2x boundary spike is acceptable** | If your system can handle 2x the limit briefly, the simplicity is worth it |

> **Avoid for strict or fine-grained limits.** The boundary burst problem means a 100 req/min limit can pass 200 requests in a 2-second window at the boundary.

### 4. Sliding Window Log

Keep a log of each request's timestamp. For each new request, remove expired entries and count remaining.

```
  Window size: 1 minute, Limit: 3

  Time   Log                              Action
  0:01   [0:01]                           ✓ Allow (1 ≤ 3)
  0:30   [0:01, 0:30]                     ✓ Allow (2 ≤ 3)
  0:50   [0:01, 0:30, 0:50]               ✓ Allow (3 ≤ 3)
  1:01   [0:30, 0:50, 1:01]               ✓ Allow (0:01 expired, 3 ≤ 3)
  1:02   [0:30, 0:50, 1:01, 1:02]         ✗ Reject (4 > 3, but 0:30 not expired yet)
```

| Pros | Cons |
|------|------|
| Very accurate — no boundary problem | High memory usage — stores every timestamp |
| Smooth rate limiting | Expensive computation (remove + count per request) |

#### Implementation

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

        # Evict timestamps outside the window
        while log and log[0] <= now - self.window_seconds:
            log.popleft()

        if len(log) >= self.limit:
            return False

        log.append(now)
        return True

# Redis equivalent using sorted sets:
# ZREMRANGEBYSCORE key 0 (now - window)   -- evict old
# count = ZCARD key                        -- count remaining
# if count < limit:
#     ZADD key now unique_id               -- record new request
#     EXPIRE key window
```

#### When to Use

| Scenario | Why Sliding Window Log Fits |
|----------|---------------------------|
| **Login attempt limiting** (5/min) | Low rate + high stakes — must be exact, memory cost is trivial |
| **Billing / metered APIs** | Customers pay per request — inaccuracy means revenue loss or overcharging |
| **Compliance-critical endpoints** | Regulatory requirements demand provable accuracy |
| **Fraud detection thresholds** | "3 failed OTPs in 10 minutes" — no tolerance for false negatives |
| **Low-volume, high-value operations** | Password resets, account deletions — few requests, precision matters |

> **Avoid for high-throughput endpoints.** An API doing 10K req/sec would store 600K timestamps per user per minute — memory grows linearly with traffic.

### 5. Sliding Window Counter (Hybrid)

Combines fixed window counter + sliding window. Uses weighted count from current and previous windows.

```
  Limit: 7 req/min
  Previous window (0:00-0:59): 5 requests
  Current window  (1:00-1:59): 3 requests
  
  Current time: 1:15 (25% into current window)
  
  Weighted count = prev × overlap% + current
                 = 5 × 75% + 3
                 = 3.75 + 3 = 6.75
                 
  6.75 < 7 → ALLOW
```

| Pros | Cons |
|------|------|
| Memory efficient (2 counters per window) | Only approximate — not 100% accurate |
| Smooths the boundary spike problem | |
| Good balance of accuracy and efficiency | |

**Cloudflare's research**: Only 0.003% of requests are incorrectly allowed or rejected with the sliding window counter approach.

#### Implementation

```python
import time

class SlidingWindowCounter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.prev_count = {}   # key -> count in previous window
        self.curr_count = {}   # key -> count in current window
        self.curr_window = {}  # key -> current window id

    def allow(self, key: str) -> bool:
        now = time.time()
        window_id = int(now // self.window_seconds)
        position = (now % self.window_seconds) / self.window_seconds

        # Roll windows forward if we've moved to a new window
        if self.curr_window.get(key) != window_id:
            self.prev_count[key] = self.curr_count.get(key, 0)
            self.curr_count[key] = 0
            self.curr_window[key] = window_id

        # Weighted count: previous window's contribution decays linearly
        prev = self.prev_count.get(key, 0)
        curr = self.curr_count.get(key, 0)
        weighted = prev * (1 - position) + curr

        if weighted >= self.limit:
            return False

        self.curr_count[key] = curr + 1
        return True

# Redis equivalent (two keys per window):
# prev_key = f"ratelimit:{user_id}:{window_id - 1}"
# curr_key = f"ratelimit:{user_id}:{window_id}"
# prev_count = redis.get(prev_key) or 0
# curr_count = redis.get(curr_key) or 0
# weighted = prev_count * (1 - position) + curr_count
# if weighted < limit: redis.incr(curr_key)
```

#### When to Use

| Scenario | Why Sliding Window Counter Fits |
|----------|-------------------------------|
| **High-traffic public APIs** | O(1) memory like fixed window, but ~99.997% accuracy — best of both worlds |
| **API gateway / middleware default** | Production-grade accuracy without the memory cost of sliding window log |
| **CDN / edge rate limiting** (Cloudflare) | Millions of users; can't afford per-timestamp storage |
| **When boundary bursts are unacceptable** | Eliminates the 2x spike problem of fixed window counter |
| **Multi-tenant SaaS platforms** | Fair, smooth enforcement across thousands of tenants with minimal memory |

> **Best default for production systems.** If token bucket isn't a natural fit (e.g., you don't need burst tolerance), sliding window counter gives you the best accuracy-to-memory ratio.

---

### Algorithm Comparison

| Algorithm | Memory | Accuracy | Burst Handling | Complexity |
|-----------|--------|----------|---------------|------------|
| Token Bucket | Low | Good | Allows bursts (configurable) | Low |
| Leaking Bucket | Low | Good | No bursts (steady output) | Low |
| Fixed Window Counter | Low | Boundary issue | Allows boundary bursts | Very Low |
| Sliding Window Log | High | Perfect | No boundary bursts | Medium |
| Sliding Window Counter | Low | Very Good (~99.997%) | Smoothed bursts | Low |

### Choosing the Right Algorithm — Decision Guide

```
  "Do I need to allow bursts?"
       │
       ├── YES → "Can my backend handle short spikes?"
       │            │
       │            ├── YES → Token Bucket ✓
       │            │         (APIs, mobile backends, tiered plans)
       │            │
       │            └── NO  → Sliding Window Counter ✓
       │                      (smooth enforcement, near-perfect accuracy)
       │
       └── NO  → "Do I need perfectly constant output rate?"
                    │
                    ├── YES → Leaking Bucket ✓
                    │         (webhooks, payment processing, email sending)
                    │
                    └── NO  → "Is absolute accuracy required?"
                                │
                                ├── YES → "Is my request volume low (<100/min)?"
                                │           │
                                │           ├── YES → Sliding Window Log ✓
                                │           │         (login limits, fraud detection)
                                │           │
                                │           └── NO  → Sliding Window Counter ✓
                                │                     (good enough for most production needs)
                                │
                                └── NO  → "Just need something simple and fast?"
                                            │
                                            └── YES → Fixed Window Counter ✓
                                                      (internal tools, prototypes, coarse limits)
```

**Quick Reference: Real-World Pairings**

| Company / System | Algorithm | Why |
|------------------|-----------|-----|
| **Stripe** | Token Bucket | APIs need burst tolerance; 100 burst then 25/sec sustained |
| **Shopify** | Leaking Bucket | Steady output to protect merchant storefronts |
| **Cloudflare** | Sliding Window Counter | Millions of edge nodes; O(1) memory, 99.997% accurate |
| **Discord** | Token Bucket | Chat messages come in bursts; smooth UX over strict enforcement |
| **Google Cloud** | Token Bucket | API quotas with burst allowance per project |
| **NGINX** | Fixed Window + Burst | `limit_req` uses leaky bucket variant with configurable burst |

---

## Step 3: High-Level Architecture

```
  Client ──▶ [Rate Limiter Middleware] ──▶ API Servers ──▶ Backend
                      │
                      ▼
              ┌──────────────┐
              │  Redis Cache │  (counters / tokens)
              │              │
              │  Key: user:  │
              │    endpoint  │
              │  Value: count│
              │  TTL: window │
              └──────────────┘
```

### Why Redis?

- In-memory → extremely fast (~100K ops/sec per node)
- Built-in TTL for automatic key expiration
- Atomic operations: `INCR` and `EXPIRE` prevent race conditions
- Distributed — works across multiple API servers
- Two key Redis commands:
  - `INCR key` — increment counter atomically
  - `EXPIRE key seconds` — set auto-expiration

### Rate Limiter Rules

Rules are typically stored in configuration files and loaded at startup:

```yaml
domain: messaging
descriptors:
  - key: message_type
    value: marketing
    rate_limit:
      requests_per_unit: 5
      unit: day
  - key: message_type
    value: transactional
    rate_limit:
      requests_per_unit: 100
      unit: minute
```

Different limits per API endpoint, user tier, or message type.

---

## Distributed Rate Limiting Challenges

### Race Condition

Two requests from the same user arrive simultaneously at different servers:

```
  Server A: reads counter = 3
  Server B: reads counter = 3
  Server A: writes counter = 4  (should be 4)
  Server B: writes counter = 4  (should be 5!)
```

**Solutions:**
1. **Lua script in Redis** — atomic read-increment-check in one operation
2. **Redis sorted sets** — use `ZADD` with timestamps for sliding window log
3. **Lock** — but adds latency; generally avoid

### Synchronization in Multi-Data-Center

```
  DC1: Rate Limiter → Redis Cluster (DC1)
  DC2: Rate Limiter → Redis Cluster (DC2)
  
  Problem: User hits DC1 5 times, then DC2 5 times = 10 total!
```

**Solutions:**
1. **Centralized Redis store** — all DCs share one Redis cluster (adds latency)
2. **Sticky sessions** — route same user to same DC (reduces flexibility)
3. **Eventual sync with tolerance** — sync counters periodically; accept slight over-limit

---

## Detailed Design

```
  Client Request
       │
       ▼
  ┌─────────────────────┐
  │  Rate Limiter        │
  │  Middleware          │
  │                     │
  │  1. Load rules      │
  │  2. Fetch counter   │◀──── Redis (INCR + EXPIRE)
  │     from Redis      │
  │  3. Check limit     │
  │     ├── Under ──────│──▶ Forward to API Server
  │     └── Over  ──────│──▶ Return 429 + headers
  │                     │       │
  │  4. Drop or queue   │       ▼
  │     excess requests │    [Message Queue] (optional)
  └─────────────────────┘    for processing later
```

### Handling Rate-Limited Requests

| Strategy | When to Use |
|----------|-------------|
| **Drop** (return 429) | Most common; client retries with backoff |
| **Queue** for later processing | When requests shouldn't be lost (e.g., billing events) |
| **Degrade** response | Return cached/simplified response instead of full result |

---

## Monitoring and Tuning

After deployment, monitor these metrics:

| Metric | Purpose |
|--------|---------|
| **Rate limit trigger count** | How often are users being rate-limited? |
| **False positive rate** | Are legitimate users being blocked? |
| **Request latency impact** | Is the rate limiter adding noticeable latency? |
| **Rule effectiveness** | Are the rules catching abuse without impacting normal users? |

If too many legitimate users are being rate-limited → rules are too strict → relax them.
If abuse is getting through → rules are too loose → tighten them.

---

## Interview Cheat Sheet

**Q: Which rate limiting algorithm would you choose and why?**
> Token bucket for most use cases — it's memory efficient, allows controlled bursts, and is used by Amazon and Stripe. If you need a perfectly smooth output rate, use leaking bucket. For highest accuracy without bursting, sliding window counter is the best balance of accuracy and memory.

**Q: Where should the rate limiter live?**
> Three options: (1) Client-side — unreliable, easily bypassed. (2) Server-side middleware — most common, sits between the load balancer and API servers. (3) API Gateway (e.g., AWS API Gateway, Kong, Envoy) — if you already have one, leverage its built-in rate limiting. For microservices, a centralized API gateway is often the best choice.

**Q: How do you handle rate limiting in a distributed system?**
> Use a centralized counter store (Redis) that all API servers share. Use atomic operations (Lua scripts in Redis) to prevent race conditions. For multi-datacenter, either use a centralized Redis cluster (adds cross-DC latency) or accept eventual consistency with periodic synchronization. Sticky sessions can also help but reduce flexibility.

**Q: What happens when a request is rate-limited?**
> Return HTTP 429 (Too Many Requests) with headers indicating the limit, remaining quota, and retry-after time. The client should implement exponential backoff with jitter. For critical requests that shouldn't be lost, queue them in a message queue for later processing instead of dropping them.

**Q: How do you set the rate limit thresholds?**
> Start with generous limits based on expected usage patterns and refine based on monitoring. Analyze traffic patterns — what's the 99th percentile of legitimate user requests? Set the limit above that with headroom. Have different tiers (free vs paid users). Monitor false positive rates and adjust. Make rules configurable without deployment (config files or admin API).
