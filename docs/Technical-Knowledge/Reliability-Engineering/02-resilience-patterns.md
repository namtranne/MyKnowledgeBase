---
sidebar_position: 3
title: "02 — Resilience Patterns"
slug: 02-resilience-patterns
---

# 🛡️ Resilience Patterns

Distributed systems fail in complex, often unpredictable ways. Resilience patterns are engineering strategies that keep services operational despite partial failures. Mastering these patterns is essential for senior engineers designing and operating microservice architectures.

---

## 1. Circuit Breaker

The **circuit breaker** pattern prevents a service from repeatedly calling a failing downstream dependency, giving it time to recover. Inspired by electrical circuit breakers that trip to prevent overload damage.

### States

```
                    success threshold met
            ┌───────────────────────────────────┐
            │                                   │
            ▼           failure threshold        │
        ┌────────┐      exceeded           ┌──────────┐
   ────▶│ CLOSED │─────────────────────────▶│  OPEN    │
        └────────┘                          └──────────┘
            ▲                                    │
            │                              timeout expires
            │                                    │
            │           ┌───────────┐            │
            │           │ HALF-OPEN │◀───────────┘
            │           └───────────┘
            │                 │
            └─────────────────┘
              probe succeeds
```

| State | Behavior | Transition |
|-------|----------|------------|
| **Closed** | Requests pass through normally; failures are counted | → Open when failure count exceeds threshold in window |
| **Open** | Requests fail immediately (fast-fail); no calls to downstream | → Half-Open after timeout period expires |
| **Half-Open** | Limited probe requests sent to test recovery | → Closed if probes succeed; → Open if probes fail |

### Implementation

```java
public class CircuitBreaker {
    private enum State { CLOSED, OPEN, HALF_OPEN }

    private State state = State.CLOSED;
    private int failureCount = 0;
    private final int failureThreshold = 5;
    private final long openTimeoutMs = 30_000;
    private long lastFailureTime = 0;
    private final int halfOpenMaxProbes = 3;
    private int halfOpenSuccessCount = 0;

    public <T> T execute(Supplier<T> action, Supplier<T> fallback) {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime > openTimeoutMs) {
                state = State.HALF_OPEN;
                halfOpenSuccessCount = 0;
            } else {
                return fallback.get(); // fast-fail
            }
        }

        try {
            T result = action.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            return fallback.get();
        }
    }

    private synchronized void onSuccess() {
        if (state == State.HALF_OPEN) {
            halfOpenSuccessCount++;
            if (halfOpenSuccessCount >= halfOpenMaxProbes) {
                state = State.CLOSED;
                failureCount = 0;
            }
        } else {
            failureCount = 0;
        }
    }

    private synchronized void onFailure() {
        failureCount++;
        lastFailureTime = System.currentTimeMillis();
        if (state == State.HALF_OPEN || failureCount >= failureThreshold) {
            state = State.OPEN;
        }
    }
}
```

### Resilience4j Configuration

```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)           // 50% failure rate triggers open
    .slowCallRateThreshold(80)          // 80% slow calls triggers open
    .slowCallDurationThreshold(Duration.ofSeconds(2))
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .permittedNumberOfCallsInHalfOpenState(5)
    .slidingWindowType(SlidingWindowType.COUNT_BASED)
    .slidingWindowSize(10)              // last 10 calls
    .minimumNumberOfCalls(5)            // need 5 calls before evaluating
    .build();

CircuitBreaker circuitBreaker = CircuitBreaker.of("paymentService", config);
```

:::tip Senior-Level Insight
Choose **count-based** sliding windows for high-throughput services (evaluates last N calls) and **time-based** windows for low-throughput services (evaluates calls in last N seconds). For low-traffic services, count-based windows may take too long to fill, making the breaker unresponsive.
:::

---

## 2. Retry Patterns

Retries handle **transient failures** — temporary issues like network blips, brief overloads, or lock contention that resolve on their own.

### Retry Strategies

| Strategy | Wait Time | Use When | Risk |
|----------|-----------|----------|------|
| **Immediate retry** | 0 | Very brief transient (TCP reset) | Hammers failing service |
| **Fixed delay** | constant `d` | Predictable recovery time | Can cause thundering herd |
| **Exponential backoff** | `d × 2^attempt` | Unknown recovery time | Synchronized retries still cluster |
| **Exponential backoff + jitter** | `random(0, d × 2^attempt)` | Production default | Best overall approach |
| **Linear backoff** | `d × attempt` | Gentle ramp | Slower than exponential |

### Exponential Backoff with Jitter

```python
import random
import time

def retry_with_backoff(
    func,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: str = "full"  # "full", "equal", "decorrelated"
):
    for attempt in range(max_retries + 1):
        try:
            return func()
        except TransientError as e:
            if attempt == max_retries:
                raise MaxRetriesExceeded(f"Failed after {max_retries} retries") from e

            if jitter == "full":
                # Full jitter: uniform random between 0 and exponential cap
                delay = random.uniform(0, min(max_delay, base_delay * (2 ** attempt)))
            elif jitter == "equal":
                # Equal jitter: half exponential + half random
                exp = min(max_delay, base_delay * (2 ** attempt))
                delay = exp / 2 + random.uniform(0, exp / 2)
            elif jitter == "decorrelated":
                # Decorrelated jitter: based on previous delay
                delay = min(max_delay, random.uniform(base_delay, delay * 3))

            print(f"Attempt {attempt + 1} failed, retrying in {delay:.2f}s")
            time.sleep(delay)
```

### Jitter Comparison

```
Attempt    No Jitter       Full Jitter        Equal Jitter
  1         1.0s           [0, 1.0]s          [0.5, 1.0]s
  2         2.0s           [0, 2.0]s          [1.0, 2.0]s
  3         4.0s           [0, 4.0]s          [2.0, 4.0]s
  4         8.0s           [0, 8.0]s          [4.0, 8.0]s
  5        16.0s           [0, 16.0]s         [8.0, 16.0]s

Without jitter (100 clients retrying after failure):
  t=1s:  ████████████████████████████████████  100 clients hit service
  t=2s:  ████████████████████████████████████  100 clients hit service
  t=4s:  ████████████████████████████████████  100 clients hit service

With full jitter (100 clients retrying after failure):
  t=0-1s:  ██░██░█░░██░█░██░░█░██░█░░██░  spread across window
  t=0-2s:  █░░█░░░█░░█░█░░█░░░█░░█░░░█░  even more spread
```

:::warning
Never retry **non-idempotent** operations without additional safety mechanisms (idempotency keys). Retrying a payment charge without an idempotency key can double-charge the customer.
:::

### What to Retry vs Not Retry

| Retry | Don't Retry |
|-------|-------------|
| 503 Service Unavailable | 400 Bad Request |
| 429 Too Many Requests | 401 Unauthorized |
| Connection timeout | 403 Forbidden |
| Connection reset | 404 Not Found |
| 500 (sometimes) | 422 Validation Error |

---

## 3. Bulkhead Pattern

Named after ship bulkheads that contain flooding to one compartment, this pattern **isolates** failures so one struggling component doesn't consume all shared resources.

### Isolation Strategies

```
Without Bulkhead:                    With Bulkhead (Thread Pool):

 ┌─────────────────────┐             ┌─────────────────────────────┐
 │   Shared Thread Pool │             │  Service A Pool (20 threads)│
 │   (100 threads)      │             │  ████████████████████       │
 │                      │             ├─────────────────────────────┤
 │  A: ██████████████   │             │  Service B Pool (30 threads)│
 │  B: ████████████████ │             │  ██████████████████████████ │
 │  C: ███              │             ├─────────────────────────────┤
 │     ^^^ C starved!   │             │  Service C Pool (50 threads)│
 └─────────────────────┘             │  ████████████████████       │
                                      └─────────────────────────────┘
 If B hangs, it consumes              B can only consume its own 30
 all 100 threads → A & C die          threads → A & C unaffected
```

| Isolation Type | How It Works | Pros | Cons |
|---------------|-------------|------|------|
| **Thread pool** | Separate thread pool per dependency | Complete isolation, timeout support | Thread overhead, context switching |
| **Semaphore** | Limit concurrent calls with counting semaphore | Lightweight, no thread overhead | No timeout on execution (only on acquisition) |
| **Connection pool** | Separate connection pool per downstream | Prevents connection exhaustion | Memory overhead per pool |
| **Process** | Separate process per component | Strongest isolation (crash-safe) | Highest overhead, IPC required |

```java
// Resilience4j Bulkhead
BulkheadConfig config = BulkheadConfig.custom()
    .maxConcurrentCalls(25)
    .maxWaitDuration(Duration.ofMillis(500))
    .build();

Bulkhead bulkhead = Bulkhead.of("paymentService", config);

Supplier<PaymentResult> decoratedSupplier = Bulkhead
    .decorateSupplier(bulkhead, () -> paymentService.charge(amount));

Try<PaymentResult> result = Try.ofSupplier(decoratedSupplier)
    .recover(BulkheadFullException.class, e -> PaymentResult.fallback());
```

:::tip Senior-Level Insight
In a Kubernetes environment, you can achieve process-level bulkheading by deploying critical dependencies as separate pods with their own resource limits (`requests` and `limits`). This gives OS-level isolation without application-level complexity.
:::

---

## 4. Timeout Patterns

Timeouts prevent a service from waiting indefinitely for a response. Without timeouts, a hanging downstream can tie up threads, connections, and memory until the caller collapses.

### Timeout Types

| Timeout Type | What It Controls | Typical Value |
|-------------|-----------------|---------------|
| **Connection timeout** | Time to establish TCP connection | 1-5 seconds |
| **Read/Socket timeout** | Time waiting for response data | 5-30 seconds |
| **Request timeout** | Total time for entire request | 10-60 seconds |
| **Idle timeout** | Time a connection can stay idle | 60-300 seconds |
| **Circuit breaker timeout** | Time in OPEN state before probing | 15-60 seconds |

### Timeout Hierarchies

```
  API Gateway Timeout: 30s
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  Service A Timeout: 20s                              │
  │  ┌──────────────────────────────────────────────┐    │
  │  │                                              │    │
  │  │  Service B call timeout: 10s                 │    │
  │  │  ┌──────────────────────────────────────┐    │    │
  │  │  │                                      │    │    │
  │  │  │  Database query timeout: 5s          │    │    │
  │  │  │  ┌──────────────────────────────┐    │    │    │
  │  │  │  │                              │    │    │    │
  │  │  │  └──────────────────────────────┘    │    │    │
  │  │  └──────────────────────────────────────┘    │    │
  │  └──────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────┘

  Rule: Inner timeout < Outer timeout (always!)
```

### Deadline Propagation

```java
// Instead of each service having independent timeouts,
// propagate a deadline from the edge:

public class DeadlineContext {
    private final Instant deadline;

    public DeadlineContext(Duration timeout) {
        this.deadline = Instant.now().plus(timeout);
    }

    public Duration remaining() {
        Duration rem = Duration.between(Instant.now(), deadline);
        if (rem.isNegative()) throw new DeadlineExceededException();
        return rem;
    }
}

// gRPC propagates deadlines automatically via metadata.
// HTTP services can use a custom header:
//   X-Request-Deadline: 2024-01-15T10:30:45.123Z
```

:::warning
If inner timeouts are longer than outer timeouts, the caller gives up while the callee is still working — wasting resources. Always ensure: `gateway_timeout > service_timeout > dependency_timeout > db_timeout`.
:::

---

## 5. Graceful Degradation

When a system can't function at full capacity, **graceful degradation** reduces functionality instead of failing entirely.

### Degradation Strategies

| Strategy | How It Works | Example |
|----------|-------------|---------|
| **Serve stale data** | Return cached/old data when source unavailable | Show cached product prices during DB outage |
| **Feature stripping** | Disable non-critical features | Hide recommendations, keep search working |
| **Reduced quality** | Lower fidelity of results | Show fewer search results, lower image resolution |
| **Static fallback** | Return pre-computed static content | Display static landing page during full outage |
| **Queue and defer** | Accept but delay processing | Accept orders, process when backend recovers |
| **Partial response** | Return available data, omit unavailable parts | Return user profile without recommendation section |

```java
public class ProductService {
    private final ProductRepository repo;
    private final RecommendationClient recommendationClient;
    private final Cache<String, List<Product>> recommendationCache;

    public ProductPage getProductPage(String productId) {
        Product product = repo.findById(productId); // critical — fail if unavailable

        List<Product> recommendations;
        try {
            recommendations = recommendationClient.getRecommendations(productId);
            recommendationCache.put(productId, recommendations);
        } catch (Exception e) {
            // Degrade: serve stale recommendations or empty list
            recommendations = recommendationCache.getOrDefault(productId, List.of());
            metrics.increment("recommendations.degraded");
        }

        return new ProductPage(product, recommendations);
    }
}
```

:::tip Senior-Level Insight
Classify every dependency as **critical** or **non-critical** during design. Critical dependencies (payment gateway, auth service) cause a full failure when unavailable. Non-critical dependencies (recommendations, analytics, ads) should degrade gracefully. Document these classifications in your service's production readiness review.
:::

---

## 6. Load Shedding

**Load shedding** intentionally drops requests when the system is overloaded, protecting the service from complete collapse.

### Shedding Strategies

| Strategy | How It Works | Use When |
|----------|-------------|----------|
| **Random drop** | Drop X% of incoming requests | Simple overload protection |
| **Priority-based** | Serve high-priority requests, drop low-priority | Multi-tier customer model |
| **LIFO (Last In, First Out)** | Drop newest requests (they haven't been waiting) | Queue-based systems |
| **CoDel (Controlled Delay)** | Drop requests that have waited too long in queue | Reducing latency under load |
| **Adaptive** | Dynamically adjust based on CPU/memory/latency | General-purpose production use |

```python
class AdaptiveLoadShedder:
    def __init__(self, target_latency_ms=200, cpu_threshold=0.80):
        self.target_latency = target_latency_ms
        self.cpu_threshold = cpu_threshold

    def should_shed(self, request) -> bool:
        cpu_usage = get_cpu_usage()
        p99_latency = get_current_p99_latency()

        if cpu_usage < self.cpu_threshold and p99_latency < self.target_latency:
            return False  # system healthy, serve everything

        # System overloaded — shed based on priority
        if request.priority == "critical":
            return False  # always serve critical (payments, auth)
        elif request.priority == "high":
            return cpu_usage > 0.90  # shed only at extreme load
        elif request.priority == "normal":
            return cpu_usage > 0.80
        else:  # low priority
            return True  # shed first
```

---

## 7. Fail-Fast vs Fail-Safe

| Aspect | Fail-Fast | Fail-Safe |
|--------|-----------|-----------|
| **Philosophy** | Detect and report failure immediately | Absorb failure and continue operating |
| **On error** | Throw exception, return error, crash | Return default, use fallback, skip |
| **Data integrity** | Preserves correctness | May serve stale/incomplete data |
| **Use when** | Data integrity is critical (payments, writes) | Availability is more important (reads, UI) |
| **Example** | Payment fails → show error, don't charge twice | Recommendation service down → show trending items |
| **Pattern** | Circuit breaker (fast-fail in open state) | Graceful degradation, fallback |

```
Fail-Fast:                          Fail-Safe:

  Request ──▶ Service ──▶ Dependency   Request ──▶ Service ──▶ Dependency
                              │                                    │
                          [FAILURE]                            [FAILURE]
                              │                                    │
                         Return 500                          Return cached
                         immediately                         data + 200
```

---

## 8. Cascading Failure Prevention

A **cascading failure** occurs when one component's failure triggers failures in its callers, which in turn fail their callers, creating a domino effect.

### How Cascading Failures Propagate

```
  Normal:
  Client ──▶ Gateway ──▶ Service A ──▶ Service B ──▶ Database
                                                       ✅

  Cascade:
  Client ──▶ Gateway ──▶ Service A ──▶ Service B ──▶ Database
    ❌          ❌           ❌           ❌              ❌
  timeout     threads      threads     connections    overloaded
  to user     exhausted    exhausted   exhausted

  Progression:
  1. Database becomes slow (disk I/O saturation)
  2. Service B connections pool exhausted waiting for DB
  3. Service B stops responding → Service A threads blocked
  4. Service A thread pool exhausted → Gateway times out
  5. Gateway queues fill up → Client receives 503
```

### Prevention Strategies

| Strategy | Layer | Effect |
|----------|-------|--------|
| **Timeouts** | Every call | Prevents indefinite waiting |
| **Circuit breakers** | Caller side | Stops calling failing service |
| **Bulkheads** | Resource level | Limits blast radius |
| **Load shedding** | Service entry | Rejects excess load |
| **Graceful degradation** | Business logic | Serves partial results |
| **Backpressure** | Async pipelines | Slows producers |
| **Health checks** | Infrastructure | Removes unhealthy instances from pool |
| **Rate limiting** | Edge / per-service | Caps traffic volume |

:::tip Senior-Level Insight
The combination of **timeouts + circuit breakers + bulkheads** is often called the **"resilience triad"**. Every outbound call in a microservice architecture should have all three. In practice, libraries like Resilience4j let you compose these as decorators on a single call.
:::

---

## 9. Backpressure

**Backpressure** is a flow control mechanism where downstream systems signal upstream systems to slow down when they can't keep up.

### Backpressure Approaches

| Approach | How It Works | Example |
|----------|-------------|---------|
| **Drop** | Discard messages when buffer full | UDP, metrics collection |
| **Buffer** | Queue messages until consumer catches up | Kafka, RabbitMQ |
| **Block** | Block producer until consumer is ready | TCP flow control, Go channels |
| **Signal** | Explicitly notify producer to slow down | Reactive Streams, gRPC flow control |
| **Sample** | Process only a subset of messages | High-frequency telemetry |

### Reactive Streams Backpressure

```java
// Reactive Streams (Project Reactor / RxJava)
// Subscriber requests only what it can handle

Flux.range(1, 1_000_000)
    .onBackpressureBuffer(1000)     // buffer up to 1000
    .onBackpressureDrop(dropped ->  // then drop
        log.warn("Dropped: {}", dropped))
    .subscribe(new BaseSubscriber<>() {
        @Override
        protected void hookOnSubscribe(Subscription sub) {
            request(100); // request only 100 items initially
        }

        @Override
        protected void hookOnNext(Integer value) {
            process(value);
            request(1); // request next item after processing
        }
    });
```

```
Without Backpressure:              With Backpressure:

Producer: ████████████████████     Producer: ████──────████──────
Consumer: ████                     Consumer: ████      ████
               ▲                                ▲         ▲
          buffer overflow /              signal: "slow     signal: "ready
          OOM crash                      down"              for more"
```

---

## 10. Idempotency

An operation is **idempotent** if performing it multiple times produces the same result as performing it once. Critical for safe retries and at-least-once delivery.

### Idempotent vs Non-Idempotent Operations

| Operation | Idempotent? | Why |
|-----------|:-----------:|-----|
| GET /users/123 | ✅ | Read-only, no side effects |
| DELETE /users/123 | ✅ | Deleting already-deleted resource is a no-op |
| PUT /users/123 `{name: "Alice"}` | ✅ | Sets to same state regardless of current state |
| POST /orders `{item: "book"}` | ❌ | Creates a new order each time |
| PATCH /accounts/123 `{balance: +100}` | ❌ | Increments balance each time |

### Implementing Idempotency Keys

```python
class PaymentService:
    def charge(self, idempotency_key: str, amount: float, customer_id: str):
        # Check if this key was already processed
        existing = self.db.find_by_idempotency_key(idempotency_key)
        if existing:
            return existing.result  # return same result as before

        # Process the payment
        result = self.payment_gateway.charge(amount, customer_id)

        # Store the result keyed by idempotency_key
        self.db.save(IdempotencyRecord(
            key=idempotency_key,
            result=result,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=24)
        ))

        return result

# Client generates a unique key per logical operation:
# POST /payments
# Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
# { "amount": 99.99, "customer_id": "cust_123" }
#
# Safe to retry — same key returns same result
```

:::warning
Idempotency keys should have an expiration (e.g., 24-48 hours). Without expiration, the idempotency store grows unbounded. After expiration, a reused key is treated as a new request — which is the correct behavior since the original request is no longer relevant.
:::

---

## 11. Resilience Patterns — Comparison Table

| Pattern | Protects Against | Mechanism | Layer |
|---------|-----------------|-----------|-------|
| **Circuit Breaker** | Failing dependencies | Stop calling failing service | Caller |
| **Retry + Backoff** | Transient failures | Repeat with increasing delay | Caller |
| **Bulkhead** | Resource exhaustion | Isolate resource pools | Caller / Infra |
| **Timeout** | Hanging dependencies | Cap wait time | Caller |
| **Graceful Degradation** | Partial failures | Serve reduced functionality | Application |
| **Load Shedding** | Overload | Drop excess requests | Service entry |
| **Backpressure** | Producer-consumer imbalance | Flow control | Async pipeline |
| **Idempotency** | Duplicate processing | Dedup by key | Service logic |
| **Rate Limiting** | Abuse / traffic spikes | Cap request rate | Edge / Service |

---

## 12. Composing Resilience Patterns

In production, patterns are composed together. Here's a typical call stack:

```
  Incoming Request
       │
       ▼
  ┌─────────────┐
  │ Rate Limiter│──── 429 if over limit
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │  Bulkhead   │──── Rejected if pool full
  └─────┬───────┘
        │
        ▼
  ┌──────────────┐
  │Circuit Breaker│──── Fallback if open
  └─────┬────────┘
        │
        ▼
  ┌─────────────┐
  │   Timeout   │──── Exception if exceeded
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │  Retry +    │──── Retry transient failures
  │  Backoff    │     (respects remaining timeout)
  └─────┬───────┘
        │
        ▼
  Downstream Call
```

```java
// Resilience4j composition — order matters!
Supplier<Response> decorated = Decorators.ofSupplier(() -> callDownstream())
    .withRetry(retry)             // innermost: retry transient failures
    .withCircuitBreaker(breaker)  // then: circuit breaker tracks retried results
    .withBulkhead(bulkhead)       // then: limit concurrency
    .withRateLimiter(limiter)     // outermost: limit rate
    .withFallback(List.of(
        CallNotPermittedException.class,
        BulkheadFullException.class,
        RequestNotPermitted.class
    ), e -> Response.fallback())
    .decorate();
```

:::tip Senior-Level Insight
The ordering of resilience decorators matters. **Retry should be inside circuit breaker** — otherwise retries bypass the breaker when it's open. **Bulkhead should be outside circuit breaker** — so that fast-fails from an open breaker don't consume bulkhead slots unnecessarily.
:::

---
