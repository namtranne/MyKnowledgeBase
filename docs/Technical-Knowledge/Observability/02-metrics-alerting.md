---
sidebar_position: 3
title: "02 — Metrics & Alerting"
slug: 02-metrics-alerting
---

# 📊 Metrics & Alerting

Metrics are the quantitative pillar of observability. While logs tell you **what happened**, metrics tell you **how the system is behaving right now**. This chapter covers metric types, monitoring methodologies, alerting strategies, and dashboard design for senior engineers.

---

## 1. Why Metrics Matter

| Approach | Description | Limitation |
|----------|-------------|------------|
| **Reactive (logs only)** | Wait for a user complaint, then search logs | Too late — users already affected |
| **Proactive (metrics + alerts)** | Detect anomalies before users notice | Requires upfront instrumentation |

Metrics enable:

- **Real-time visibility** — dashboards show system health at a glance
- **Trend analysis** — capacity planning based on historical data
- **Alerting** — automated detection of anomalies and SLO violations
- **Correlation** — overlay deploy markers with metric changes to find regressions
- **Comparison** — before/after canary deployments, A/B tests

:::tip Senior-Level Insight
In interviews, emphasize that metrics are **cheap** compared to logs and traces. A single counter increment is nanoseconds of CPU and bytes of storage. Logging that same event costs orders of magnitude more. A well-instrumented service emits thousands of metrics but only logs significant events.
:::

---

## 2. Metric Types

### Overview Table

| Type | Behavior | Use Case | Example |
|------|----------|----------|---------|
| **Counter** | Monotonically increasing | Cumulative totals | `http_requests_total`, `errors_total` |
| **Gauge** | Goes up and down | Point-in-time values | `cpu_usage`, `queue_depth`, `active_connections` |
| **Histogram** | Buckets + count + sum | Distribution of values | `request_duration_seconds`, `response_size_bytes` |
| **Summary** | Quantiles + count + sum | Pre-computed percentiles | `request_duration_seconds{quantile="0.99"}` |

### Counter

A counter only goes **up** (or resets to zero on restart). Use it for events that accumulate.

```python
# Prometheus Python client
from prometheus_client import Counter

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Increment on each request
REQUEST_COUNT.labels(method='GET', endpoint='/api/orders', status='200').inc()
```

```
# Prometheus query: requests per second over 5 minutes
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
  /
rate(http_requests_total[5m])
```

:::warning
Never use a gauge for something that should be a counter. If the value only goes up (total requests, total errors), use a counter. Counters survive process restarts cleanly — Prometheus uses `rate()` to compute per-second rates from counter deltas.
:::

### Gauge

A gauge represents a **current value** that can go up or down.

```python
from prometheus_client import Gauge

QUEUE_DEPTH = Gauge(
    'message_queue_depth',
    'Current number of messages in queue',
    ['queue_name']
)

QUEUE_DEPTH.labels(queue_name='orders').set(142)
QUEUE_DEPTH.labels(queue_name='orders').inc()     # 143
QUEUE_DEPTH.labels(queue_name='orders').dec(10)   # 133
```

### Histogram

A histogram samples observations and counts them in **configurable buckets**, plus tracks total count and sum.

```python
from prometheus_client import Histogram

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Time a request
with REQUEST_DURATION.labels(method='GET', endpoint='/api/orders').time():
    process_request()
```

```
# Prometheus: 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Average latency
rate(http_request_duration_seconds_sum[5m])
  /
rate(http_request_duration_seconds_count[5m])
```

### Histogram vs Summary

| Aspect | Histogram | Summary |
|--------|-----------|---------|
| **Quantile calculation** | Server-side (Prometheus query) | Client-side (pre-computed) |
| **Aggregatable** | ✅ Yes (can aggregate across instances) | ❌ No (pre-computed quantiles can't be averaged) |
| **Bucket configuration** | Required (must choose bucket boundaries) | Not needed |
| **CPU cost** | Low (increment bucket counter) | Higher (streaming quantile calculation) |
| **Accuracy** | Depends on bucket granularity | Configurable error margin |
| **Recommendation** | ✅ Prefer for most use cases | Use only when you need exact quantiles on a single instance |

:::tip Senior-Level Insight
Always prefer histograms over summaries. Summaries cannot be aggregated across instances — you can't compute p99 across 10 pods from 10 individual p99 values. Histograms can be aggregated because Prometheus computes quantiles from merged bucket counts.
:::

---

## 3. RED Method

The **RED Method** is for **request-driven** services (APIs, web servers, microservices).

| Signal | What It Measures | Prometheus Example |
|--------|------------------|-------------------|
| **R**ate | Requests per second | `rate(http_requests_total[5m])` |
| **E**rrors | Failed requests per second | `rate(http_requests_total{status=~"5.."}[5m])` |
| **D**uration | Time per request (distribution) | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |

```
RED Dashboard Layout
┌─────────────────────────────────────────────────────────┐
│  Service: Order Service                                  │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   Rate       │ │   Errors     │ │   Duration   │     │
│  │  1,250 RPS   │ │  0.3%  ▼     │ │  p50: 45ms   │     │
│  │  ████████▓░  │ │  ░░░░░░░░░░  │ │  p95: 120ms  │     │
│  │              │ │              │ │  p99: 890ms  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                          │
│  [───────── Timeseries Graphs ─────────]                 │
└─────────────────────────────────────────────────────────┘
```

---

## 4. USE Method

The **USE Method** is for **resource-driven** monitoring (CPU, memory, disk, network).

| Signal | What It Measures | Example |
|--------|------------------|---------|
| **U**tilization | % of resource capacity used | CPU at 78% |
| **S**aturation | Degree of queuing / backpressure | 42 requests queued for thread pool |
| **E**rrors | Resource error count | 3 disk I/O errors |

### USE Applied to Common Resources

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **CPU** | `cpu_usage_percent` | Run queue length | Machine check exceptions |
| **Memory** | `memory_used / memory_total` | Swap usage, OOM kills | ECC errors |
| **Disk I/O** | `disk_io_utilization` | I/O queue depth | Read/write errors |
| **Network** | `bytes_sent / bandwidth` | TCP retransmits, socket backlog | Interface errors, drops |
| **Thread Pool** | `active_threads / max_threads` | Pending task queue depth | Rejected tasks |
| **Connection Pool** | `active_conns / max_conns` | Waiting threads for connection | Connection timeouts |

:::tip Senior-Level Insight
Use RED for your services (what your users experience) and USE for your infrastructure (what your services depend on). Together, they provide full-stack visibility. When discussing monitoring in interviews, show you understand both application-level and infrastructure-level monitoring.
:::

---

## 5. Four Golden Signals (Google SRE)

From the Google SRE book — the four signals every service should monitor:

| Signal | Description | Metric Example |
|--------|-------------|----------------|
| **Latency** | Time to serve a request (separate success vs error latency) | `http_request_duration_seconds` |
| **Traffic** | Demand on the system | `http_requests_total` per second |
| **Errors** | Rate of failed requests (explicit 5xx, implicit timeouts) | `http_errors_total / http_requests_total` |
| **Saturation** | How "full" the system is (resource utilization, queue depth) | `cpu_usage`, `memory_usage`, `queue_depth` |

### Relationship Between Methodologies

```
┌────────────────────────────────────────────────────────┐
│           Methodology Comparison                        │
│                                                         │
│  Golden Signals    RED Method      USE Method           │
│  ──────────────    ──────────      ──────────           │
│  Latency      ←→  Duration                              │
│  Traffic       ←→  Rate                                  │
│  Errors        ←→  Errors    ←→   Errors                │
│  Saturation                  ←→   Utilization            │
│                              ←→   Saturation             │
│                                                         │
│  Scope: Any       Services       Infrastructure         │
│  Origin: Google   Weaveworks     Brendan Gregg          │
└────────────────────────────────────────────────────────┘
```

---

## 6. Percentiles — Why Averages Lie

### The Problem with Averages

```
Request latencies (ms): 10, 12, 11, 13, 10, 12, 11, 10, 13, 950

Average:  105.2 ms  ← Looks like a problem
Median:    11.5 ms  ← Most users are fine
p95:      950.0 ms  ← 5% of users have terrible experience
p99:      950.0 ms  ← The worst case

Average = 105ms hides the fact that 90% of users see &lt;15ms
while 10% see nearly 1 second.
```

### Percentile Reference

| Percentile | Meaning | Use Case |
|:----------:|---------|----------|
| **p50** (median) | 50% of requests are faster | "Typical" user experience |
| **p90** | 90% of requests are faster | Most users' experience |
| **p95** | 95% of requests are faster | Alert threshold for many teams |
| **p99** | 99% of requests are faster | Tail latency — affects high-value users |
| **p99.9** | 99.9% of requests are faster | Critical for financial / real-time systems |

### Tail Latency Amplification

In microservice architectures, tail latency amplifies across service calls:

```
If Service A calls Service B, and B has p99 = 100ms:

A calls B once:    P(>100ms) = 1%
A calls B 5 times: P(any >100ms) = 1 - (0.99)^5 = 4.9%
A calls B 20 times: P(any >100ms) = 1 - (0.99)^20 = 18.2%
A calls B 100 times: P(any >100ms) = 1 - (0.99)^100 = 63.4%

Fan-out amplifies tail latency exponentially!
```

:::warning
Never use averages for latency alerting. A service with an average latency of 50ms might have a p99 of 5 seconds — meaning 1% of your users (potentially your most valuable enterprise customers) are having a terrible experience. Always alert on percentiles.
:::

---

## 7. SLI-Based Alerting

### Alert on Symptoms, Not Causes

| ❌ Cause-Based Alert | ✅ Symptom-Based Alert |
|---------------------|----------------------|
| CPU > 80% | p99 latency > 500ms |
| Memory > 90% | Error rate > 1% |
| Disk > 85% | Successful request rate < 99.9% |
| Pod restarts > 3 | Order placement success rate < 99.5% |

**Why symptom-based?**
- CPU can be at 95% and the service is fine (GC spike, background task)
- CPU can be at 30% and the service is broken (deadlock, dependency down)
- Users don't care about CPU — they care about latency and errors

### SLI → SLO → SLA Chain

```
┌──────────────────────────────────────────────────────────┐
│  SLI (Service Level Indicator)                            │
│  "What we measure"                                        │
│  Example: proportion of requests served < 200ms           │
│                                                           │
│           ▼                                               │
│  SLO (Service Level Objective)                            │
│  "What we target internally"                              │
│  Example: 99.9% of requests served < 200ms per month      │
│                                                           │
│           ▼                                               │
│  SLA (Service Level Agreement)                            │
│  "What we promise customers (with consequences)"          │
│  Example: 99.5% availability — breach triggers credits    │
│                                                           │
│  Note: SLO is always stricter than SLA                    │
│        (alert before you breach the contract)             │
└──────────────────────────────────────────────────────────┘
```

### Defining Good SLIs

| Category | Good SLI | Bad SLI |
|----------|----------|---------|
| **Availability** | % of requests returning non-5xx | Uptime ping (misses partial outages) |
| **Latency** | % of requests < threshold | Average latency (hides tail) |
| **Correctness** | % of requests returning correct data | No direct measurement |
| **Freshness** | % of data updated within threshold | "Data pipeline ran successfully" |

---

## 8. Burn Rate Alerting

Traditional threshold alerting ("error rate > 1%") is noisy. **Burn rate alerting** measures how fast you're consuming your error budget.

### Error Budget

```
SLO: 99.9% availability over 30 days

Error budget = 1 - SLO = 0.1% = 0.001
Monthly error budget = 30 days × 24 hours × 60 min = 43,200 min
Allowed downtime = 43,200 × 0.001 = 43.2 minutes per month
```

### Burn Rate Concept

```
Burn rate = (observed error rate) / (error rate allowed by SLO)

If SLO allows 0.1% errors:
  - 0.1% observed errors → burn rate = 1x (consuming budget exactly)
  - 1.0% observed errors → burn rate = 10x (budget exhausted in 3 days)
  - 10% observed errors  → burn rate = 100x (budget exhausted in 7 hours)
```

### Multi-Window, Multi-Burn-Rate Alerts

| Severity | Burn Rate | Long Window | Short Window | Time to Budget Exhaustion |
|----------|:---------:|:-----------:|:------------:|:-------------------------:|
| **Page (critical)** | 14.4x | 1 hour | 5 minutes | 5 hours |
| **Page (high)** | 6x | 6 hours | 30 minutes | 12 hours |
| **Ticket (medium)** | 3x | 1 day | 2 hours | 10 days |
| **Ticket (low)** | 1x | 3 days | 6 hours | 30 days |

```
# Prometheus burn rate alert example
# 14.4x burn rate over 1 hour AND 5 minutes (multi-window)
- alert: HighErrorBurnRate
  expr: |
    (
      sum(rate(http_requests_total{status=~"5.."}[1h]))
      / sum(rate(http_requests_total[1h]))
    ) > (14.4 * 0.001)
    AND
    (
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      / sum(rate(http_requests_total[5m]))
    ) > (14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error budget burning at 14.4x — budget exhausted in ~5 hours"
```

:::tip Senior-Level Insight
Burn rate alerting is the gold standard recommended by Google SRE. In interviews, explain the two-window approach: the long window ensures the problem is sustained (not a blip), while the short window ensures the problem is still happening (not already resolved). This dramatically reduces false positives.
:::

---

## 9. Alert Fatigue

### Causes of Alert Fatigue

| Cause | Example | Impact |
|-------|---------|--------|
| **Too many alerts** | 200+ alerts firing daily | Team ignores all alerts |
| **Low-signal alerts** | CPU > 70% (normal for the service) | False positives erode trust |
| **Duplicate alerts** | Same issue triggers 5 alerts across monitors | Alert noise masks real issues |
| **Missing runbooks** | Alert fires, engineer doesn't know what to do | Long MTTR, frustration |
| **No ownership** | Alert goes to a shared channel, nobody acts | Bystander effect |
| **Stale alerts** | Alert for a service that was decommissioned | Clutters the alert stream |

### Solutions

| Solution | Implementation |
|----------|---------------|
| **Alert on symptoms, not causes** | Replace `CPU > 80%` with `p99_latency > SLO` |
| **Severity levels** | P1 (page), P2 (ticket), P3 (dashboard) — only page for user-facing impact |
| **Smart grouping** | Group related alerts (Alertmanager `group_by`) |
| **Runbooks** | Every alert links to a runbook with diagnosis steps |
| **Regular review** | Monthly alert hygiene — delete/tune noisy alerts |
| **Ownership** | Each alert has a clear owning team |
| **Snooze / maintenance windows** | Silence alerts during planned maintenance |
| **Escalation policies** | Auto-escalate if not acknowledged in N minutes |

### Alert Severity Framework

```
┌───────────────────────────────────────────────────────┐
│  Severity     Action         Response Time   Channel  │
│  ─────────    ──────         ─────────────   ───────  │
│  P1 Critical  Page on-call   < 5 minutes     PagerDuty│
│  P2 High      Page on-call   < 30 minutes    PagerDuty│
│  P3 Medium    Create ticket  < 4 hours       Jira     │
│  P4 Low       Dashboard      Next sprint     Grafana  │
│  P5 Info      Log only       Best effort     Kibana   │
└───────────────────────────────────────────────────────┘

Rule of thumb:
  P1/P2 combined should be < 5 per week per team
  If you're paging more, your alerts need tuning
```

---

## 10. Dashboards

### Dashboard Hierarchy

```
┌────────────────────────────────────────────────────────┐
│  Level 1: Executive Overview                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Overall system health: ✅ ✅ ⚠️ ✅ ✅           │   │
│  │  Error budget remaining: 72%                     │   │
│  │  Active incidents: 1 (P3)                        │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  Level 2: Service Dashboard                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Order Service: Rate | Errors | Duration         │   │
│  │  Dependencies: Payment ✅ | Inventory ✅ | DB ✅  │   │
│  │  Recent deploys: v2.4.1 (2h ago)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  Level 3: Instance / Pod Dashboard                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Pod: order-service-7b8f9d-xk4j2                 │   │
│  │  CPU: 45% | Memory: 62% | GC pauses: 12ms avg   │   │
│  │  Heap: 1.2GB / 2GB | Threads: 48 active          │   │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  Level 4: Debug Dashboard                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Specific query patterns, cache hit rates,        │   │
│  │  individual endpoint latencies, dependency         │   │
│  │  call breakdowns                                   │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Dashboard Design Guidelines

| Guideline | Why |
|-----------|-----|
| **Start with RED / Golden Signals** | Answers "Is the service healthy?" instantly |
| **Include deploy markers** | Correlate metric changes with code changes |
| **Show SLO burn rate** | Contextualize errors against the error budget |
| **Use consistent time ranges** | 1h, 6h, 24h, 7d toggles — team alignment |
| **Limit to 8-12 panels per dashboard** | More than that → cognitive overload |
| **Use rate(), not raw counters** | Raw counters always go up — useless as a visual |
| **Show p50, p95, p99 together** | Reveals tail latency that averages hide |
| **Add variable templates** | Filter by service, region, environment |
| **Red/Yellow/Green thresholds** | Instant visual assessment |

---

## 11. Monitoring Tools Comparison

| Feature | Prometheus + Grafana | CloudWatch | Datadog | New Relic |
|---------|---------------------|------------|---------|-----------|
| **Type** | Open source | AWS-managed | SaaS | SaaS |
| **Data Model** | Time-series (labels) | Namespaces + dimensions | Tags | Attributes |
| **Query Language** | PromQL | CloudWatch Metrics Insights | Custom | NRQL |
| **Retention** | Configurable (Thanos for long-term) | 15 months | 15 months | 8 days (detail) → 13 months (rollup) |
| **Alerting** | Alertmanager | CloudWatch Alarms | Monitors | Alert Policies |
| **Cost** | Infra only (free software) | Per metric + alarm + dashboard | Per host + custom metrics | Per GB ingested |
| **Pull vs Push** | Pull (scrape) | Push | Push (agent) | Push (agent) |
| **Auto-discovery** | Kubernetes SD, consul SD | EC2, ECS, Lambda automatic | Agent auto-discovery | Agent auto-discovery |
| **Best For** | K8s-native, full control | AWS-only workloads | Multi-cloud SaaS | Full-stack APM |
| **Learning Curve** | Moderate (PromQL) | Low (AWS users) | Low | Low–Moderate |

---

## 12. Custom Business Metrics

System metrics (CPU, latency) tell you **how** the system is running. Business metrics tell you **what** the system is achieving.

### Examples

| Business Metric | Metric Type | Why It Matters |
|----------------|-------------|----------------|
| `orders_placed_total` | Counter | Revenue indicator — drop signals business impact |
| `checkout_abandoned_total` | Counter | UX issue or performance problem |
| `payment_success_rate` | Gauge (derived) | Core business health |
| `signup_completion_rate` | Gauge (derived) | Onboarding funnel health |
| `search_results_zero_total` | Counter | Content gap or search quality issue |
| `feature_x_usage_total` | Counter | Feature adoption tracking |
| `cart_value_dollars` | Histogram | Revenue distribution |

### Implementation

```python
from prometheus_client import Counter, Histogram

ORDERS_PLACED = Counter(
    'orders_placed_total',
    'Total orders successfully placed',
    ['region', 'payment_method', 'customer_tier']
)

ORDER_VALUE = Histogram(
    'order_value_dollars',
    'Distribution of order values in USD',
    ['region'],
    buckets=[10, 25, 50, 100, 250, 500, 1000, 5000]
)

def place_order(order):
    process_order(order)
    ORDERS_PLACED.labels(
        region=order.region,
        payment_method=order.payment_method,
        customer_tier=order.customer_tier
    ).inc()
    ORDER_VALUE.labels(region=order.region).observe(order.total_value)
```

```
# Prometheus queries for business metrics
# Orders per minute by region
sum by (region) (rate(orders_placed_total[5m])) * 60

# Payment success rate
sum(rate(orders_placed_total{payment_method="credit_card"}[5m]))
  /
sum(rate(payment_attempts_total{payment_method="credit_card"}[5m]))

# Average order value (AOV)
rate(order_value_dollars_sum[1h]) / rate(order_value_dollars_count[1h])
```

:::tip Senior-Level Insight
In system design interviews, always mention business metrics alongside technical metrics. Saying "I'd track orders per minute and alert if it drops 30% compared to the same time last week" demonstrates that you understand observability serves the **business**, not just the infrastructure. It's what separates a senior engineer from a mid-level one.
:::

---

## 13. Prometheus Deep Dive

### Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  Prometheus Architecture                    │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Service A │  │ Service B │  │ Service C │   /metrics     │
│  │ :8080     │  │ :8081     │  │ :8082     │   endpoints    │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                │
│        │             │             │                       │
│        └──────┬──────┘──────┬──────┘                       │
│               │   HTTP GET /metrics (pull / scrape)        │
│               ▼                                            │
│  ┌─────────────────────────────┐                          │
│  │        Prometheus           │  ┌──────────────────┐    │
│  │  ┌─────────────────────┐   │  │  Alertmanager     │    │
│  │  │  Time-Series DB     │   │──▶│  Route → Notify   │    │
│  │  │  (Local TSDB)       │   │  │  PagerDuty, Slack │    │
│  │  └─────────────────────┘   │  └──────────────────┘    │
│  │  ┌─────────────────────┐   │                          │
│  │  │  Service Discovery  │   │  ┌──────────────────┐    │
│  │  │  (K8s, Consul, DNS) │   │  │  Grafana          │    │
│  │  └─────────────────────┘   │──▶│  Dashboards       │    │
│  │  ┌─────────────────────┐   │  │  PromQL queries   │    │
│  │  │  Alert Rules        │   │  └──────────────────┘    │
│  │  └─────────────────────┘   │                          │
│  └─────────────────────────────┘                          │
│               │                                            │
│               ▼  (optional long-term storage)              │
│  ┌─────────────────────────────┐                          │
│  │  Thanos / Cortex / Mimir    │                          │
│  │  (S3-backed, multi-cluster) │                          │
│  └─────────────────────────────┘                          │
└───────────────────────────────────────────────────────────┘
```

### Essential PromQL Queries

| Purpose | Query |
|---------|-------|
| Request rate (RPS) | `sum(rate(http_requests_total[5m]))` |
| Error rate (%) | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100` |
| p99 latency | `histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |
| Top 5 endpoints by RPS | `topk(5, sum by (endpoint) (rate(http_requests_total[5m])))` |
| CPU usage by pod | `sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))` |
| Memory usage % | `container_memory_usage_bytes / container_spec_memory_limit_bytes * 100` |
| Disk I/O rate | `rate(node_disk_read_bytes_total[5m]) + rate(node_disk_written_bytes_total[5m])` |
| SLO error budget remaining | `1 - (sum(increase(http_requests_total{status=~"5.."}[30d])) / sum(increase(http_requests_total[30d]))) - 0.999` |

---

## 🔗 Related Chapters

- **[01 — Logging](./01-logging.md)** — Complement metrics with rich log context
- **[03 — Distributed Tracing](./03-distributed-tracing.md)** — Use exemplars to link metrics to traces
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice metrics and alerting scenarios
