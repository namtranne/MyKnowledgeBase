---
sidebar_position: 5
title: "04 — Common Interview Questions"
slug: 04-interview-questions
---

# 🎯 Common Interview Questions

This chapter covers the most frequently asked observability interview questions for senior software engineers. Each question includes a detailed answer that demonstrates the depth expected at the senior level.

---

## 📋 Quick Reference Tables

### Log Levels Guide

| Level | When to Use | Production Default |
|-------|-------------|:------------------:|
| **FATAL** | System is unusable, process must exit | ✅ Always on |
| **ERROR** | Unexpected failure requiring investigation | ✅ Always on |
| **WARN** | Unexpected condition, system self-recovered | ✅ Always on |
| **INFO** | Significant business or lifecycle events | ✅ Always on |
| **DEBUG** | Diagnostic detail for troubleshooting | ⚠️ Enable per-service during incidents |
| **TRACE** | Step-by-step execution flow | ❌ Almost never in prod |

### Metric Types Summary

| Type | Direction | Reset on Restart? | Aggregatable? | Example |
|------|-----------|:-----------------:|:-------------:|---------|
| **Counter** | Only up | Resets to 0 | ✅ `sum()` | `http_requests_total` |
| **Gauge** | Up and down | Shows current value | ✅ `avg()` | `cpu_usage_percent` |
| **Histogram** | Buckets | Resets counters | ✅ `histogram_quantile()` | `request_duration_seconds` |
| **Summary** | Quantiles | Resets | ❌ Not aggregatable | `request_duration_seconds{quantile}` |

### Four Golden Signals

| Signal | What It Measures | Alert Example |
|--------|------------------|---------------|
| **Latency** | Time to serve requests | p99 > 500ms for 5 minutes |
| **Traffic** | Demand on the system | RPS dropped 50% vs last week |
| **Errors** | Rate of failed requests | Error rate > 1% for 5 minutes |
| **Saturation** | How full the system is | CPU > 90% for 10 minutes |

### Observability Tools Comparison

| Tool | Type | Strengths | Best For |
|------|------|-----------|----------|
| **Prometheus** | Metrics (open source) | PromQL, K8s-native, pull model | Self-managed K8s metrics |
| **Grafana** | Visualization (open source) | Multi-source dashboards, alerting | Dashboards for any data source |
| **Jaeger** | Tracing (open source) | Full-featured, CNCF project | Self-managed distributed tracing |
| **ELK Stack** | Logging (open source) | Full-text search, mature ecosystem | Self-managed centralized logging |
| **Datadog** | Full-stack (SaaS) | Unified platform, 500+ integrations | Multi-cloud SaaS teams |
| **CloudWatch** | AWS-native | Deep AWS integration, no setup | AWS-only workloads |
| **New Relic** | APM (SaaS) | Full-stack observability, AI-ops | Application performance management |
| **Splunk** | Log analytics | Powerful SPL query language, security | Enterprise security & compliance |
| **Tempo** | Tracing (open source) | S3 storage, cost-efficient | High-volume tracing on a budget |
| **OpenTelemetry** | Instrumentation framework | Vendor-neutral, unified SDK | Instrument once, export anywhere |

---

## 🟢 Logging Questions

### Q1: How would you design a structured logging strategy for a microservices platform?

**Answer:**

I'd design a structured logging strategy around five key pillars:

**1. Standard Schema**

Define a company-wide JSON log schema enforced via shared libraries:

```json
{
  "timestamp": "2025-01-15T14:32:01.234Z",
  "level": "ERROR",
  "service": "payment-service",
  "version": "2.4.1",
  "environment": "production",
  "traceId": "abc123def456",
  "spanId": "789ghi012",
  "requestId": "req-98765",
  "message": "Payment declined",
  "userId": "42",
  "orderId": "12345",
  "errorCode": "INSUFFICIENT_FUNDS",
  "duration_ms": 342,
  "host": "payment-prod-3"
}
```

**2. Correlation**

Every request gets a `requestId` at the API gateway. Combined with `traceId` from OpenTelemetry, these IDs propagate to all downstream services via HTTP headers and MDC (Mapped Diagnostic Context). This allows us to reconstruct the full request journey from a single ID.

**3. Aggregation Pipeline**

```
Services → stdout → Fluent Bit (DaemonSet) → Kafka (buffer)
         → Logstash (enrich, transform) → Elasticsearch (index)
         → Kibana (search, dashboards)
```

Kafka provides backpressure handling — if Elasticsearch is slow, logs buffer in Kafka rather than backing up the application.

**4. Retention Tiers**

- Hot (0-7 days): Full-text search on SSD, all log levels
- Warm (7-30 days): Slower storage, INFO+ only
- Cold (30-365 days): S3/Glacier, ERROR+ only or sampled
- Delete after 365 days unless compliance requires longer

**5. PII Protection**

Framework-level redaction via custom Logback converters that mask credit cards, emails, and SSNs before the log line leaves the process. Periodic compliance scans on Elasticsearch indices to detect leakage.

:::tip Senior-Level Insight
Mention the cost implications. At 10,000 RPS with 1 KB per log, you generate ~864 GB/day. At $0.50/GB ingestion, that's $13K/month per service. Structured logging enables targeted filtering (drop DEBUG, sample verbose endpoints) that can cut costs by 50-70%.
:::

---

### Q2: What are correlation IDs and why are they critical in microservices?

**Answer:**

A correlation ID (or request ID) is a unique identifier generated at the entry point of a request (typically the API gateway) and propagated to every downstream service call. It enables you to:

1. **Reconstruct the full request journey** — query all logs with `requestId=req-98765` across 20 services
2. **Measure end-to-end latency** — from gateway entry to final response
3. **Debug distributed failures** — when Service D fails, trace back to the originating request

**Implementation:**

- Generate UUID at the API gateway
- Store in MDC (Mapped Diagnostic Context) for automatic inclusion in all log statements
- Propagate via `X-Request-ID` HTTP header to downstream services
- For async operations (thread pools, reactive streams), wrap executors to copy MDC context
- For message queues, include in Kafka headers or SQS message attributes

**Difference from Trace ID:**

- `requestId`: Application-level concept, human-readable identifier for the business request
- `traceId`: OpenTelemetry/tracing concept, used by tracing backends for span correlation
- Best practice: use both — `requestId` for log correlation, `traceId` for trace backends

---

### Q3: How do you handle the cost of logging at scale?

**Answer:**

I use a multi-layered approach:

| Layer | Strategy | Impact |
|-------|----------|--------|
| **Source** | Set production log level to INFO (drop DEBUG/TRACE) | -40-60% volume |
| **Source** | Sample verbose endpoints (health checks, metrics endpoints) | -10-20% volume |
| **Shipper** | Compress logs before transmission (gzip) | -70-90% bandwidth |
| **Pipeline** | Drop known-noisy log patterns in Logstash | -10-30% volume |
| **Pipeline** | Aggregate repeated identical logs (rate-limit) | -5-15% volume |
| **Storage** | Tiered retention (hot → warm → cold → delete) | -60-80% storage cost |
| **Storage** | Use columnar format (Parquet) for cold analytics | -80% storage for old logs |
| **Index** | Reduce Elasticsearch replica count for warm/cold | -50% storage for older indices |

The most impactful single change is usually enforcing INFO as the minimum production log level and implementing hot/warm/cold tiering with ILM (Index Lifecycle Management) policies.

---

## 🟡 Metrics & Alerting Questions

### Q4: Explain the difference between counters, gauges, and histograms. When would you use each?

**Answer:**

| Type | Behavior | Use When | Anti-pattern |
|------|----------|----------|-------------|
| **Counter** | Monotonically increases, resets on restart | Tracking cumulative totals (requests, errors, bytes) | Using a gauge for something that only goes up |
| **Gauge** | Goes up and down freely | Point-in-time values (temperature, queue depth, active connections) | Using a counter for current values |
| **Histogram** | Counts observations in configurable buckets | Distribution analysis (latency, response sizes) | Using average instead of percentiles |

**Key insight on histograms vs summaries:** Histograms are almost always preferred because they're **aggregatable** — you can compute p99 across 50 pods by merging bucket counts. Summaries pre-compute quantiles client-side, making cross-instance aggregation mathematically incorrect (you can't average percentiles).

```
# Counter: rate() computes per-second increase
rate(http_requests_total[5m])  → 1,250 req/s

# Gauge: direct value
node_memory_usage_bytes  → 3.2 GB

# Histogram: compute percentiles server-side
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))  → 450ms
```

---

### Q5: Why do averages lie? Explain percentiles and when to use them.

**Answer:**

Averages mask the distribution. Consider this example:

```
100 requests with latencies:
  95 requests: 10ms each
  5 requests:  1000ms each

Average: (95 × 10 + 5 × 1000) / 100 = 59.5ms

But:
  p50 (median):  10ms  ← "typical" experience
  p95:          1000ms ← 5% of users wait 1 second
  p99:          1000ms ← worst case

The average (59.5ms) describes NO user's actual experience.
```

**Tail latency amplification** is why percentiles matter even more in microservices:

```
Service A calls Service B 10 times per request.
B has p99 = 100ms.

P(at least one call > 100ms) = 1 - 0.99^10 = 9.6%

So A's p90 is affected by B's p99!
At 50 fan-out calls: P(any > 100ms) = 39.5%
```

**Which percentile to monitor:**

| Percentile | Audience | Use |
|:----------:|----------|-----|
| p50 | Product managers | "Typical" user experience |
| p95 | Engineering | Alert threshold for most services |
| p99 | SRE / platform | Tail latency, SLO definition |
| p99.9 | Finance / real-time | Mission-critical systems |

---

### Q6: What is burn rate alerting and why is it better than threshold alerting?

**Answer:**

**Problem with threshold alerting:** "Error rate > 1%" fires on a 2-second spike that's already resolved, waking up on-call at 3 AM for nothing. It also doesn't fire when the error rate is 0.5% for 3 days straight (slowly exhausting the error budget).

**Burn rate** measures how fast you're consuming your error budget:

```
SLO: 99.9% availability (30-day window)
Error budget: 0.1% = 43.2 minutes of downtime per month

Burn rate = (observed error rate) / (SLO error rate)

  0.1% errors → burn rate 1x  → budget lasts 30 days (normal)
  1.0% errors → burn rate 10x → budget exhausted in 3 days
  10% errors  → burn rate 100x → budget exhausted in 7 hours
```

**Multi-window approach** prevents false positives:

| Severity | Burn Rate | Long Window | Short Window |
|----------|:---------:|:-----------:|:------------:|
| Page (critical) | 14.4x | 1 hour | 5 minutes |
| Page (high) | 6x | 6 hours | 30 minutes |
| Ticket | 3x | 1 day | 2 hours |
| Log only | 1x | 3 days | 6 hours |

The **long window** ensures the problem is sustained (not a blip). The **short window** ensures it's still happening (not already resolved). Both must be true to fire.

---

### Q7: How would you reduce alert fatigue for your team?

**Answer:**

Alert fatigue happens when the team receives too many low-signal alerts, leading to desensitization ("alarm blindness"). My approach:

1. **Alert on symptoms, not causes** — Replace "CPU > 80%" with "p99 latency > SLO threshold." High CPU with happy users shouldn't page anyone.

2. **Severity classification** — Only P1/P2 page on-call. P3+ creates tickets or goes to dashboards. Target < 5 pages per week per on-call.

3. **Every alert needs a runbook** — If you don't know what to do when the alert fires, it shouldn't be an alert.

4. **Monthly alert review** — Delete alerts nobody acted on. Tune thresholds on noisy alerts. Merge duplicate alerts.

5. **Smart grouping** — Use Alertmanager `group_by` to collapse related alerts. 50 pods failing the same health check = 1 alert, not 50.

6. **Ownership** — Every alert has an owning team. Unowned alerts go to a review backlog, not to everyone.

7. **Maintenance windows** — Silence alerts during planned deployments and infrastructure maintenance.

---

## 🔴 Distributed Tracing Questions

### Q8: Explain the difference between a trace, span, and trace context. How does propagation work?

**Answer:**

- **Trace**: The complete end-to-end journey of a request through the system, composed of multiple spans. Identified by a globally unique Trace ID.

- **Span**: A single unit of work within a trace (e.g., "HTTP GET /api/users", "DB query", "Redis GET"). Each span has a Span ID, optional Parent Span ID, start time, duration, attributes, and status.

- **Trace Context**: The metadata (Trace ID, Span ID, sampling flags) that must be propagated between services to connect spans into a trace.

**Propagation** uses HTTP headers (or message metadata for async):

```
W3C standard header:
traceparent: 00-4bf92f3577b34da6-00f067aa0ba902b7-01
             ver  trace-id         parent-span-id    flags

When Service A calls Service B:
1. A creates a new span with parent = A's current span
2. A injects traceparent header into the outbound HTTP request
3. B receives the request, extracts traceparent
4. B creates a child span with parent = span ID from the header
5. All of B's internal spans are now children under the same trace
```

For message queues, the trace context is injected into message headers (Kafka headers, SQS message attributes). The consumer extracts it and creates a linked span rather than a direct parent-child relationship, since there may be significant time between produce and consume.

---

### Q9: What is OpenTelemetry and why should we use it?

**Answer:**

OpenTelemetry is the CNCF (Cloud Native Computing Foundation) standard for instrumenting applications to emit telemetry data — traces, metrics, and logs. It's the merger of OpenTracing and OpenCensus.

**Why use it:**

| Benefit | Explanation |
|---------|-------------|
| **Vendor neutral** | Instrument once, export to any backend (Jaeger, Datadog, X-Ray) |
| **Auto-instrumentation** | Java agent, Python auto-instrumentor — zero-code tracing for HTTP, DB, gRPC |
| **Unified SDK** | One API for traces, metrics, and logs instead of three separate libraries |
| **Community standard** | Second-most-active CNCF project (after Kubernetes) |
| **Future-proof** | Switch observability vendors without re-instrumenting |

**Architecture:**

```
App (SDK + auto-instrumentation)
  → Exporter (OTLP protocol)
    → Collector (batch, sample, route)
      → Backend (Jaeger, Tempo, Datadog, X-Ray)
```

The Collector is optional but recommended — it decouples the app from the backend, enabling sampling, enrichment, and multi-destination export without code changes.

---

### Q10: Compare head-based and tail-based sampling. When would you use each?

**Answer:**

| Aspect | Head-based | Tail-based |
|--------|-----------|------------|
| **Decision point** | At request start (before processing) | After request completes (all spans collected) |
| **Can sample by error** | ❌ No (don't know if it will error yet) | ✅ Yes |
| **Can sample by latency** | ❌ No (don't know final duration yet) | ✅ Yes |
| **Overhead** | Low (drop early, no buffering) | Higher (must buffer all spans until decision) |
| **Implementation** | Simple (SDK-side, random/rate-limit) | Complex (collector-side, needs all spans) |
| **Cost** | Predictable | Less predictable (error spikes = more traces) |

**When to use each:**

- **Head-based only:** Low-traffic service where 100% sampling is affordable, or you don't have tail-sampling infrastructure
- **Tail-based only:** When you absolutely cannot miss error or slow traces
- **Hybrid (recommended):** Head-based probabilistic sampling (keep 10%) PLUS tail-based rules (always keep errors, always keep traces > 2 seconds)

```yaml
# Recommended composite strategy
processors:
  tail_sampling:
    policies:
      - name: always-keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: always-keep-slow
        type: latency
        latency: { threshold_ms: 2000 }
      - name: sample-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
```

---

## 🟣 System Design Questions

### Q11: Design an observability strategy for a new microservices platform with 20 services

**Answer:**

**Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│                 Observability Platform                       │
│                                                             │
│  INSTRUMENTATION (per service)                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OpenTelemetry SDK (auto + manual instrumentation) │    │
│  │  Structured JSON logging (shared schema library)    │    │
│  │  Prometheus client (custom business metrics)        │    │
│  └───────────┬─────────────────────┬─────────────────┘    │
│              │                     │                        │
│  COLLECTION  │                     │                        │
│  ┌───────────▼──────┐  ┌──────────▼─────────┐             │
│  │ OTel Collector   │  │ Fluent Bit         │             │
│  │ (traces+metrics) │  │ (logs → Kafka)      │             │
│  └───────────┬──────┘  └──────────┬─────────┘             │
│              │                     │                        │
│  STORAGE     │                     │                        │
│  ┌───────────▼──────┐  ┌──────────▼─────────┐             │
│  │ Prometheus       │  │ Elasticsearch       │             │
│  │ (metrics, 15d)   │  │ (logs, ILM tiering) │             │
│  │                  │  │                      │             │
│  │ Tempo / Jaeger   │  │ S3 (cold logs)       │             │
│  │ (traces, 7d)     │  │                      │             │
│  └───────────┬──────┘  └──────────┬─────────┘             │
│              │                     │                        │
│  VISUALIZATION & ALERTING          │                        │
│  ┌─────────────────────────────────▼──────────────────┐   │
│  │  Grafana                                            │   │
│  │  ├─ Dashboards (metrics + logs + traces)            │   │
│  │  ├─ Alerting → PagerDuty (P1/P2) + Slack (P3+)    │   │
│  │  └─ Exemplars (metric → trace correlation)          │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Key decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Instrumentation | OpenTelemetry | Vendor-neutral, auto-instrumentation |
| Metrics | Prometheus + Grafana | Industry standard for K8s, free |
| Tracing | Tempo (Grafana stack) | S3 storage = low cost, integrated with Grafana |
| Logging | ELK via Kafka | Buffered ingestion, full-text search |
| Alerting | Burn-rate based on SLOs | Reduces alert fatigue, user-centric |
| Correlation | traceId in all three pillars | Single ID connects metrics → traces → logs |

**SLO Framework:**

Each service defines SLOs in a YAML config:

```yaml
service: order-service
slos:
  - name: availability
    sli: "successful requests / total requests"
    target: 99.9%
    window: 30d
  - name: latency
    sli: "requests < 200ms / total requests"
    target: 99.0%
    window: 30d
```

---

### Q12: Your p99 latency doubled after a deployment — walk through how you debug this

**Answer:**

**Step 1: Confirm and Scope**
- Check the dashboard: Is p99 elevated for all endpoints or specific ones?
- Check if the deployment correlates (deploy marker on the graph)
- Check if it's all pods or specific pods (canary vs full rollout)

**Step 2: Compare Before/After**
- Open the service dashboard, set time range to straddle the deployment
- Compare: p50 (unchanged? → tail issue), p95 (also affected? → broader issue)
- Check error rate (if errors also increased, different investigation path)

**Step 3: Find Example Slow Traces**
- Query tracing backend: `service=order-service AND duration>500ms AND time=last_1h`
- Open 3-5 slow traces and look for the common slow span

**Step 4: Identify the Bottleneck**
- Scenario A: A single span dominates → drill into that service
- Scenario B: A new span appeared that wasn't in the old version → code change introduced new call
- Scenario C: An existing span got slower → dependency regression

**Step 5: Check Related Signals**
- Logs filtered by traceId of a slow request → look for errors, timeouts, retries
- Metrics for the slow dependency → connection pool, queue depth, CPU
- Check if dependency also deployed something

**Step 6: Root Cause and Fix**

Common findings after deployment:

| Finding | Root Cause | Fix |
|---------|-----------|-----|
| New DB query in hot path | Code added unindexed query | Add index or remove query |
| N+1 query pattern | New feature fetches related data in loop | Batch query |
| Missing cache | Refactor bypassed cache layer | Restore cache |
| Serialization change | New response field triggers expensive serialization | Optimize or lazy-load |
| Connection pool exhaustion | New feature increased connection usage | Increase pool or optimize |

**Step 7: Rollback Decision**

If the root cause isn't immediately fixable:
- Is p99 > SLO? → Rollback immediately
- Is p99 elevated but within SLO? → Fix forward with time-boxed investigation (1-2 hours)

---

### Q13: How would you investigate intermittent 500 errors that occur ~50 times per day across 20 services?

**Answer:**

**Phase 1: Pattern Detection (Metrics)**

```
# Find which services are producing 500s
topk(10, sum by (service) (rate(http_requests_total{status="500"}[24h])))

# Check if they're correlated in time
sum by (service) (rate(http_requests_total{status="500"}[5m]))
```

Look for: time-of-day patterns, correlation with traffic spikes, correlation across multiple services (shared dependency).

**Phase 2: Error Categorization (Logs)**

```
Query: level=ERROR AND status=500 AND time=last_24h
Group by: error_code, service, endpoint
```

Typical categories found:
- 60% from one service → focus there
- Specific error code dominates → specific bug
- Random distribution → likely infrastructure (network, DNS, resource limits)

**Phase 3: Trace Analysis**

For the dominant error pattern, pull 10 error traces:
- Do they all fail at the same downstream service?
- Is there a common span that precedes the error?
- Are they happening on specific pods/hosts?

**Phase 4: Hypothesis Testing**

| Hypothesis | How to Test |
|-----------|-------------|
| Database connection timeout | Check DB connection pool metrics, query duration histogram |
| Upstream timeout | Check caller's timeout setting vs callee's p99 |
| Memory pressure / GC | Check pod memory usage, GC pause metrics around error times |
| Race condition | Check if errors correlate with high concurrency |
| Stale cache | Check if errors follow cache eviction patterns |
| DNS resolution failure | Check CoreDNS metrics and logs |

**Phase 5: Fix and Validate**

Once identified, implement the fix and set up a specific alert for that error pattern so you know immediately if it regresses.

---

## 🔵 Debugging Exercises

### Q14: Given these metrics, identify the problem

```
Service: checkout-service
Time: 14:30 UTC

Metric                            Before 14:30    After 14:30
──────────────────────────────    ────────────    ───────────
http_requests_total (rate/s)      1,200           1,180
http_errors_total (rate/s)        2               2
http_request_duration_p50         45ms            48ms
http_request_duration_p95         120ms           380ms
http_request_duration_p99         250ms           2,100ms

db_query_duration_p99             15ms            18ms
cache_hit_rate                    94%             94%
cpu_usage                         45%             47%
memory_usage                      62%             63%
active_connections (DB pool)      12/50           48/50
payment_service_call_p99          80ms            1,800ms
```

**Answer:**

**Diagnosis:**

1. **p50 is fine, p95/p99 spiked** → tail latency problem, not affecting majority of requests
2. **Error rate unchanged** → not failing, just slow
3. **DB is fine** (p99 still 18ms), cache is fine (94% hit rate)
4. **DB connection pool nearly exhausted** (48/50 vs 12/50) → symptom, not cause
5. **payment_service_call_p99 exploded** (80ms → 1,800ms) → ROOT CAUSE

**Root cause:** The payment service (downstream dependency) is experiencing a latency regression. The long-running payment calls are holding DB connections open longer, causing the connection pool to fill up. This creates a cascading effect — requests waiting for a DB connection add to the tail latency.

**Action:**

1. **Immediate:** Check payment-service health — did they deploy? Is their dependency (payment gateway) slow?
2. **Short-term:** Add/reduce timeout on payment-service calls (currently > 1.8s, should be 500ms with circuit breaker)
3. **Long-term:** Make payment calls async (don't hold DB connections during external calls), implement circuit breaker pattern

---

### Q15: Given these logs, what's the root cause?

```json
{"time":"14:32:01","service":"order-service","level":"INFO","msg":"Processing order","orderId":"ORD-123","userId":"U-42"}
{"time":"14:32:01","service":"order-service","level":"INFO","msg":"Inventory check started","orderId":"ORD-123","sku":"SKU-789"}
{"time":"14:32:01","service":"inventory-service","level":"INFO","msg":"Checking stock","sku":"SKU-789","warehouse":"east"}
{"time":"14:32:01","service":"inventory-service","level":"INFO","msg":"Stock available","sku":"SKU-789","quantity":142}
{"time":"14:32:02","service":"order-service","level":"INFO","msg":"Payment initiated","orderId":"ORD-123","amount":99.99}
{"time":"14:32:02","service":"payment-service","level":"INFO","msg":"Charging card","orderId":"ORD-123","gateway":"stripe"}
{"time":"14:32:04","service":"payment-service","level":"WARN","msg":"Gateway timeout, retrying","orderId":"ORD-123","attempt":1,"gateway":"stripe"}
{"time":"14:32:07","service":"payment-service","level":"WARN","msg":"Gateway timeout, retrying","orderId":"ORD-123","attempt":2,"gateway":"stripe"}
{"time":"14:32:11","service":"payment-service","level":"ERROR","msg":"Payment failed after retries","orderId":"ORD-123","attempts":3,"gateway":"stripe","error":"GATEWAY_TIMEOUT"}
{"time":"14:32:11","service":"order-service","level":"ERROR","msg":"Order failed","orderId":"ORD-123","reason":"payment_failed","duration_ms":10042}
{"time":"14:32:11","service":"order-service","level":"INFO","msg":"Sending failure notification","orderId":"ORD-123","userId":"U-42"}
```

**Answer:**

**Timeline:**
- `14:32:01` — Order processing starts, inventory check passes (instant)
- `14:32:02` — Payment initiated to Stripe
- `14:32:04` — First Stripe timeout (2s), retry #1
- `14:32:07` — Second Stripe timeout (3s after retry), retry #2
- `14:32:11` — Third Stripe timeout (4s after retry), give up after 3 attempts
- Total duration: 10,042ms (10 seconds for what should be < 1 second)

**Root cause:** Stripe payment gateway is experiencing timeouts. The retry strategy uses increasing backoff (2s, 3s, 4s delays between retries), amplifying the total latency from ~200ms (normal) to ~10s.

**Issues to address:**

1. **The retry backoff is too aggressive** — 3 retries with this backoff turns a 2s timeout into a 10s request. Consider: 2 retries max, with a total timeout budget of 5s.
2. **No circuit breaker** — if Stripe is down, every request will retry 3 times, tripling load on Stripe (making recovery harder) and increasing all p99 latencies.
3. **The order holds resources for 10s** — DB connections, thread pool slots, memory are all occupied for the full retry cycle.

**Recommended fix:**

```
Payment timeout: 2s (instead of longer)
Max retries: 2 (instead of 3)
Total budget: 5s max
Circuit breaker: Open after 5 failures in 60s
Fallback: Queue payment for async retry, return "pending" to user
```

---

### Q16: Design an alerting strategy that avoids alert fatigue

**Answer:**

**Tier 1 — Page (P1/P2): Only for user-facing impact**

| Alert | Condition | Action |
|-------|-----------|--------|
| SLO burn rate critical | 14.4x burn rate, 1h + 5min windows | Page on-call immediately |
| SLO burn rate high | 6x burn rate, 6h + 30min windows | Page on-call |
| Zero traffic | `rate(http_requests_total[5m]) == 0` for 5 min | Page — complete outage |
| Data pipeline stale | No new data for 2x expected interval | Page if customer-facing |

**Tier 2 — Ticket (P3): Needs investigation, not immediate**

| Alert | Condition | Action |
|-------|-----------|--------|
| SLO burn rate elevated | 3x burn rate, 1d + 2h windows | Create Jira ticket |
| Error budget < 30% | Monthly error budget running low | Create Jira ticket |
| Pod restart loop | > 3 restarts in 15 min | Create ticket for owning team |
| Certificate expiry < 14 days | TLS cert approaching expiration | Create ticket |

**Tier 3 — Dashboard only (P4/P5): Informational**

| Alert | Condition | Action |
|-------|-----------|--------|
| CPU > 80% | Resource utilization high | Dashboard + capacity planning |
| Disk > 70% | Storage filling up | Dashboard |
| Dependency latency increase | Upstream p99 increased 2x | Dashboard |

**Rules:**

- P1/P2 combined: < 5 per week per team
- Every alert has a runbook link
- Monthly review: delete alerts nobody acted on
- Quarterly SLO review: adjust thresholds based on data

---

### Q17: Explain the three pillars of observability and how they complement each other

**Answer:**

| Pillar | What It Tells You | Strength | Weakness |
|--------|-------------------|----------|----------|
| **Logs** | What happened (detailed events) | Rich context, debugging detail | High volume, expensive at scale |
| **Metrics** | How the system is behaving (aggregated numbers) | Cheap, fast, good for alerting and trends | No request-level detail |
| **Traces** | Where time is spent (request journey) | End-to-end visibility across services | Sampling loses data, instrumentation overhead |

**How they work together:**

```
1. DETECT (Metrics)
   Dashboard shows p99 latency spike at 14:30
   Alert fires: burn rate = 10x

2. LOCATE (Traces)
   Click exemplar on the metric → opens the slow trace
   Waterfall shows: payment-service → fraud-check = 400ms (normally 20ms)

3. UNDERSTAND (Logs)
   Filter logs by traceId from the slow trace
   Log: "External fraud API timeout, retried 3 times, total wait: 380ms"

4. FIX
   Root cause: Third-party fraud API degraded
   Fix: Add circuit breaker + cached fraud decisions for repeat customers

Time to root cause: < 5 minutes (vs hours without correlation)
```

The `traceId` is the glue — it's present in metrics (via exemplars), traces (natively), and logs (via structured logging with MDC). This single identifier connects all three pillars for any given request.

---

### Q18: How would you implement observability for an event-driven (Kafka-based) architecture?

**Answer:**

Event-driven systems add complexity because:
- Requests are **asynchronous** — producer and consumer are decoupled in time
- A single event may trigger a **chain of downstream events**
- Traditional request/response tracing doesn't directly apply

**Approach:**

**1. Trace Context in Message Headers**
Inject `traceparent` into Kafka message headers at the producer. Consumers extract the context and create linked spans (not child spans, since time has passed).

**2. Key Metrics**

| Metric | Type | Why |
|--------|------|-----|
| `kafka_consumer_lag` | Gauge | Are consumers keeping up? |
| `message_processing_duration` | Histogram | How long does each message take? |
| `message_processing_errors` | Counter | Dead letter queue rate |
| `end_to_end_latency` | Histogram | Time from produce to consume completion |
| `messages_produced_total` | Counter | Throughput tracking |
| `messages_consumed_total` | Counter | Should match produced (with lag) |

**3. Correlation**
Every Kafka message carries `correlationId` (the original request ID) and `traceId`. Even though the message passes through 5 consumer services asynchronously, you can reconstruct the full event chain by querying logs with the `correlationId`.

**4. Dead Letter Queue Monitoring**
Alert on DLQ growth rate — messages in the DLQ represent processing failures that need investigation. Include the original `traceId` in DLQ messages for debugging.

---

### Q19: What would you do if your observability system itself goes down?

**Answer:**

This is the observability bootstrapping problem. If Elasticsearch is down, you can't search logs. If Prometheus is down, you can't see metrics. Strategies:

| Strategy | Implementation |
|----------|---------------|
| **Decouple ingestion from storage** | Kafka buffer between apps and Elasticsearch — logs survive storage outages |
| **Multi-region redundancy** | Replicate observability backends across regions |
| **Local fallback** | Applications write to local files when the log shipper is unavailable |
| **External synthetic monitoring** | External service (Pingdom, Uptime Robot) monitors your endpoints from outside |
| **Meta-monitoring** | Monitor the monitoring stack itself with a separate, simpler system |
| **Runbooks for blind incidents** | Pre-written procedures for debugging when observability is unavailable |
| **Circuit breaker on exporters** | If the tracing collector is down, don't let it slow down your application |

:::tip Senior-Level Insight
Always mention that the observability pipeline must have its own monitoring and alerting — separate from the primary stack. A simple external health check (curl to Elasticsearch, Prometheus, Grafana) with Slack/PagerDuty notification is the minimum. You never want to discover your monitoring is down because an incident went undetected.
:::

---

### Q20: How do you choose between build (open source) vs buy (SaaS) for observability?

**Answer:**

| Factor | Build (Prometheus + Grafana + Jaeger + ELK) | Buy (Datadog / New Relic / Splunk) |
|--------|----------------------------------------------|-------------------------------------|
| **Cost at small scale** | Higher (infra + engineering time) | Lower (pay per host/GB) |
| **Cost at large scale** | Lower (fixed infra cost) | Higher (scales with data volume) |
| **Setup time** | Weeks to months | Hours to days |
| **Maintenance** | Ongoing (upgrades, scaling, tuning) | Vendor-managed |
| **Customization** | Full control | Limited to vendor features |
| **Vendor lock-in** | None (open standards) | Moderate to high |
| **Expertise required** | Deep ops knowledge needed | Minimal ops knowledge |
| **Multi-cloud** | Works anywhere | Varies by vendor |
| **Compliance** | Full data sovereignty | Data may leave your network |

**My recommendation framework:**

- **< 20 services, < 10 engineers:** Buy SaaS (Datadog) — engineering time is too valuable to spend on infra
- **20-100 services, dedicated platform team:** Hybrid — Prometheus/Grafana for metrics (free), SaaS for tracing/logs
- **100+ services, mature platform team:** Build — ROI of open source at scale justifies the engineering investment; use OTel for vendor-neutral instrumentation so you can switch later

---

## 🔗 Related Chapters

- **[01 — Logging](./01-logging.md)** — Deep dive into logging strategies
- **[02 — Metrics & Alerting](./02-metrics-alerting.md)** — Detailed metrics and alerting coverage
- **[03 — Distributed Tracing](./03-distributed-tracing.md)** — Complete tracing guide
