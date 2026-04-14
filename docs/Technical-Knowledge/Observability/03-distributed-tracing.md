---
sidebar_position: 4
title: "03 — Distributed Tracing"
slug: 03-distributed-tracing
---

# 🔍 Distributed Tracing

Distributed tracing is the most powerful observability pillar for microservice architectures. It lets you follow a single request as it traverses dozens of services, databases, queues, and caches — revealing exactly where time is spent and where failures occur.

---

## 1. Why Distributed Tracing

### The Microservices Debugging Problem

```
User: "The checkout page is slow"

Monolith:  Profile one process → find the slow method → done.

Microservices:
  Request → API Gateway → Auth Service → User Service
         → Order Service → Inventory Service → Payment Service
         → Notification Service → Email Provider

  Which of these 8 services is slow?
  Which database query? Which HTTP call?
  Is it a fan-out problem? N+1 query? Cold cache?

  Without tracing, you're guessing.
```

### What Tracing Enables

| Capability | Description |
|-----------|-------------|
| **Latency analysis** | See exactly where time is spent across services |
| **Dependency mapping** | Visualize runtime service dependencies |
| **Bottleneck identification** | Find the critical path in a request |
| **Error correlation** | Link an error in Service D back to the user request |
| **Fan-out detection** | See when one request triggers 100 downstream calls |
| **N+1 query detection** | Spot repeated DB calls inside a loop |
| **SLA attribution** | Know which team's service caused the SLA breach |

---

## 2. Core Concepts

### Terminology

| Concept | Definition | Analogy |
|---------|-----------|---------|
| **Trace** | End-to-end journey of a request through the system | A complete order fulfillment |
| **Span** | A single unit of work within a trace | One step: "query database" |
| **Trace ID** | Globally unique identifier for the entire trace | Order number |
| **Span ID** | Unique identifier for a single span | Step number |
| **Parent Span ID** | Links a span to its parent (creates the tree) | "This step belongs to that phase" |
| **Root Span** | The first span in a trace (no parent) | The initial user request |
| **Baggage** | Key-value pairs propagated across all spans | Context carried throughout the trace |
| **Tags / Attributes** | Metadata attached to a span | `http.method=GET`, `db.type=postgresql` |
| **Events / Logs** | Timestamped annotations within a span | "Cache miss at T+42ms" |
| **Status** | Success, error, or unset | Span-level outcome |

### Trace as a Tree

```
Trace ID: abc-123-def-456

                    ┌─────────────────────────────────────────┐
                    │         Root Span (API Gateway)          │
                    │  span_id: A   duration: 450ms            │
                    └──────────┬──────────┬───────────────────┘
                               │          │
              ┌────────────────┘          └────────────────┐
              ▼                                            ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│   Span B: Auth Service   │              │   Span C: Order Service  │
│   parent: A              │              │   parent: A              │
│   duration: 15ms         │              │   duration: 420ms        │
└──────────────────────────┘              └───────┬──────────┬──────┘
                                                  │          │
                                    ┌─────────────┘          └──────────┐
                                    ▼                                    ▼
                    ┌──────────────────────────┐      ┌──────────────────────────┐
                    │ Span D: Inventory Check  │      │ Span E: Payment Service  │
                    │ parent: C                │      │ parent: C                │
                    │ duration: 45ms           │      │ duration: 350ms          │
                    └──────────────────────────┘      └───────────┬────────────┘
                                                                  │
                                                                  ▼
                                                  ┌──────────────────────────┐
                                                  │ Span F: DB Write         │
                                                  │ parent: E                │
                                                  │ duration: 25ms           │
                                                  └──────────────────────────┘
```

---

## 3. Trace Context Propagation

Propagation is how the trace context (Trace ID, Span ID, flags) is passed from one service to the next — typically via HTTP headers.

### W3C Trace Context Standard

The W3C `traceparent` header is the industry standard:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ──  ────────────────────────────────  ────────────────  ──
             │              │                            │            │
         version      trace-id (128-bit)          parent-id (64-bit) flags
                                                                     01 = sampled
```

Optional `tracestate` header carries vendor-specific data:

```
tracestate: dd=s:1;p:00f067aa0ba902b7,rojo=00f067aa0ba902b7
```

### B3 Propagation (Zipkin)

Older standard, still widely used:

```
X-B3-TraceId: 463ac35c9f6413ad48485a3953bb6124
X-B3-SpanId: 0020000000000001
X-B3-ParentSpanId: 00f067aa0ba902b7
X-B3-Sampled: 1
```

Or single-header format:

```
b3: 463ac35c9f6413ad48485a3953bb6124-0020000000000001-1-00f067aa0ba902b7
```

### Propagation Flow

```
┌─────────────┐    HTTP + traceparent header    ┌─────────────┐
│  Service A  │ ──────────────────────────────▶ │  Service B  │
│             │    traceparent: 00-{traceId}-   │             │
│  Create     │    {spanIdA}-01                 │  Extract    │
│  trace      │                                 │  context    │
│  context    │                                 │  Create     │
│             │                                 │  child span │
└─────────────┘                                 └──────┬──────┘
                                                       │
                                     HTTP + traceparent│header
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │  Service C  │
                                                │             │
                                                │  Extract    │
                                                │  context    │
                                                │  Create     │
                                                │  child span │
                                                └─────────────┘

Propagation also works over:
  • gRPC metadata
  • Kafka message headers
  • SQS message attributes
  • AMQP message properties
```

### Propagation Across Message Queues

```java
// Producer: inject trace context into Kafka headers
Span span = tracer.spanBuilder("kafka.produce")
    .setSpanKind(SpanKind.PRODUCER)
    .startSpan();

TextMapSetter<ProducerRecord<String, String>> setter =
    (carrier, key, value) -> carrier.headers().add(key, value.getBytes());

W3CTraceContextPropagator.getInstance()
    .inject(Context.current().with(span), record, setter);

producer.send(record);

// Consumer: extract trace context from Kafka headers
TextMapGetter<ConsumerRecord<String, String>> getter = new TextMapGetter<>() {
    public Iterable<String> keys(ConsumerRecord<String, String> carrier) {
        return StreamSupport.stream(carrier.headers().spliterator(), false)
            .map(Header::key).collect(Collectors.toList());
    }
    public String get(ConsumerRecord<String, String> carrier, String key) {
        Header header = carrier.headers().lastHeader(key);
        return header != null ? new String(header.value()) : null;
    }
};

Context extracted = W3CTraceContextPropagator.getInstance()
    .extract(Context.current(), record, getter);

Span consumerSpan = tracer.spanBuilder("kafka.consume")
    .setParent(extracted)
    .setSpanKind(SpanKind.CONSUMER)
    .startSpan();
```

:::tip Senior-Level Insight
In interviews, mention that message queue propagation creates a **producer-consumer link** — not a parent-child relationship. The producer span ends when the message is sent; the consumer span starts when the message is processed (potentially minutes later). OpenTelemetry uses `SpanKind.PRODUCER` and `SpanKind.CONSUMER` plus a `link` to represent this relationship without implying synchronous timing.
:::

---

## 4. Span Anatomy

A span captures a single unit of work with rich metadata:

```json
{
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "parentSpanId": "a3ce929d0e0e4736",
  "operationName": "POST /api/orders",
  "serviceName": "order-service",
  "kind": "SERVER",
  "startTime": "2025-01-15T14:32:01.234Z",
  "duration_ms": 342,
  "status": { "code": "OK" },
  "attributes": {
    "http.method": "POST",
    "http.url": "/api/orders",
    "http.status_code": 201,
    "http.request_content_length": 1024,
    "user.id": "42",
    "order.id": "12345",
    "order.item_count": 3
  },
  "events": [
    { "time": "2025-01-15T14:32:01.280Z", "name": "cache.miss", "attributes": { "key": "inventory:sku-789" } },
    { "time": "2025-01-15T14:32:01.350Z", "name": "db.query", "attributes": { "statement": "INSERT INTO orders..." } }
  ],
  "links": [],
  "resource": {
    "service.name": "order-service",
    "service.version": "2.4.1",
    "deployment.environment": "production",
    "host.name": "order-prod-3"
  }
}
```

### Span Naming Conventions

| ✅ Good Names | ❌ Bad Names | Why |
|--------------|-------------|-----|
| `GET /api/users/{id}` | `GET /api/users/42` | High cardinality → too many unique spans |
| `db.query SELECT orders` | `SELECT * FROM orders WHERE id = 42` | Query params create infinite unique names |
| `kafka.produce orders-topic` | `kafka.produce` | Include topic for specificity |
| `redis.GET user-cache` | `cache lookup` | Include operation and cache name |
| `grpc.payment.Charge` | `RPC call` | Include service and method |

---

## 5. Trace Visualization — Waterfall Diagrams

### Reading a Waterfall

```
Time ──────────────────────────────────────────────────────▶
0ms        100ms       200ms       300ms       400ms    450ms

API Gateway
├─ POST /api/checkout ──────────────────────────────────────┤ 450ms
│
├─ Auth Service
│  └─ verify-token ──┤ 15ms
│
├─ Order Service
│  ├─ create-order ─────────────────────────────────────────┤ 420ms
│  │
│  ├─ Inventory Service
│  │  └─ check-stock ──────┤ 45ms
│  │     └─ db.query ──┤ 12ms
│  │
│  ├─ Payment Service                          ← BOTTLENECK
│  │  └─ charge ───────────────────────────────────────┤ 350ms
│  │     ├─ fraud-check ──────────────┤ 180ms  ← SLOW!
│  │     └─ gateway-call ──────┤ 120ms
│  │        └─ db.write ──┤ 25ms
│  │
│  └─ Notification Service
│     └─ send-email ──┤ 8ms (async, not on critical path)
```

### Critical Path Analysis

The **critical path** is the longest chain of sequential spans. Optimizing spans off the critical path has zero impact on total latency.

```
Critical path in the example above:
  API Gateway (overhead) → Order Service → Payment Service → Fraud Check
  Total: ~15ms + ~5ms + ~350ms = ~370ms of the 450ms total

Optimization priority:
  1. Fraud Check (180ms) ← biggest win
  2. Gateway Call (120ms)
  3. Inventory Check (45ms) — runs in parallel, only matters if > 350ms
  4. Auth (15ms) — small, but on critical path
  5. Notification (8ms) — async, NOT on critical path
```

---

## 6. OpenTelemetry

OpenTelemetry (OTel) is the CNCF standard for observability instrumentation — it unifies tracing, metrics, and logging into a single framework.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   OpenTelemetry Architecture                     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Application                             │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  │  │
│  │  │ Manual Instr. │  │ Auto-Instr.    │  │ SDK           │  │  │
│  │  │ tracer.start  │  │ (Java agent,   │  │ TracerProvider│  │  │
│  │  │ Span("...")   │  │  Python auto)  │  │ MeterProvider │  │  │
│  │  └──────┬───────┘  └──────┬─────────┘  │ LoggerProvider│  │  │
│  │         └────────┬────────┘             └──────┬───────┘  │  │
│  │                  │                             │           │  │
│  │                  ▼                             ▼           │  │
│  │         ┌─────────────────────────────────────────────┐   │  │
│  │         │     Exporters (OTLP, Jaeger, Zipkin, etc.)  │   │  │
│  │         └──────────────────┬──────────────────────────┘   │  │
│  └────────────────────────────┼───────────────────────────────┘  │
│                               │ OTLP (gRPC/HTTP)                 │
│                               ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              OTel Collector (optional)                      │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐    │  │
│  │  │ Receivers │  │ Processors   │  │ Exporters         │    │  │
│  │  │ (OTLP,   │→│ (batch,      │→│ (Jaeger, Tempo,   │    │  │
│  │  │  Kafka)  │  │  filter,     │  │  Datadog, S3)    │    │  │
│  │  │          │  │  sample)     │  │                   │    │  │
│  │  └──────────┘  └──────────────┘  └──────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                  │
│                               ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               Backend Storage + Query                      │  │
│  │  Jaeger │ Tempo │ Zipkin │ X-Ray │ Datadog APM            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Instrumentation

Auto-instrumentation adds tracing to common libraries (HTTP clients, DB drivers, messaging) without code changes.

```bash
# Java: attach the OTel agent at startup
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.service.name=order-service \
     -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
     -jar order-service.jar
```

```bash
# Python: auto-instrument
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # install instrumentation packages

OTEL_SERVICE_NAME=order-service \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 \
opentelemetry-instrument python app.py
```

### Manual Instrumentation

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

def place_order(order):
    with tracer.start_as_current_span("place_order") as span:
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.total", order.total)
        span.set_attribute("user.id", order.user_id)

        with tracer.start_as_current_span("validate_inventory") as child:
            child.set_attribute("sku.count", len(order.items))
            check_inventory(order.items)

        with tracer.start_as_current_span("process_payment") as child:
            child.set_attribute("payment.method", order.payment_method)
            try:
                charge_result = charge(order)
                child.set_attribute("payment.transaction_id", charge_result.txn_id)
            except PaymentError as e:
                child.set_status(trace.StatusCode.ERROR, str(e))
                child.record_exception(e)
                raise
```

```java
// Java manual instrumentation
Tracer tracer = GlobalOpenTelemetry.getTracer("order-service");

Span span = tracer.spanBuilder("place_order")
    .setSpanKind(SpanKind.INTERNAL)
    .setAttribute("order.id", order.getId())
    .setAttribute("order.total", order.getTotal())
    .startSpan();

try (Scope scope = span.makeCurrent()) {
    validateInventory(order);
    processPayment(order);
    span.setStatus(StatusCode.OK);
} catch (Exception e) {
    span.setStatus(StatusCode.ERROR, e.getMessage());
    span.recordException(e);
    throw e;
} finally {
    span.end();
}
```

---

## 7. Sampling Strategies

Tracing every request at high traffic is expensive. Sampling reduces volume while retaining useful traces.

### Sampling Types

```
┌───────────────────────────────────────────────────────────┐
│                    Sampling Decision Point                  │
│                                                            │
│  HEAD-BASED                      TAIL-BASED                │
│  (decided at start)              (decided at end)           │
│                                                            │
│  ┌─────────────┐                ┌─────────────┐           │
│  │ Request     │                │ Request     │           │
│  │ arrives     │                │ completes   │           │
│  └──────┬──────┘                └──────┬──────┘           │
│         │                              │                   │
│    ┌────▼────┐                   ┌─────▼─────┐            │
│    │ Sample? │                   │ Analyze   │            │
│    │ (random │                   │ all spans │            │
│    │  / rate)│                   │ then      │            │
│    └────┬────┘                   │ decide    │            │
│    yes  │  no                    └─────┬─────┘            │
│    ┌────▼──┐ ┌──▼──┐            keep   │  drop            │
│    │Record │ │Drop │            ┌──────▼──┐ ┌──▼──┐      │
│    │all    │ │all  │            │ Store   │ │Drop │      │
│    │spans  │ │spans│            │ trace   │ │trace│      │
│    └───────┘ └─────┘            └─────────┘ └─────┘      │
│                                                            │
│  Pros: Low overhead             Pros: Never miss errors   │
│  Cons: Misses rare errors       Cons: Higher overhead     │
└───────────────────────────────────────────────────────────┘
```

### Sampling Strategy Comparison

| Strategy | Type | How It Works | Pros | Cons |
|----------|------|-------------|------|------|
| **Probabilistic** | Head | Sample X% of traces randomly | Simple, predictable cost | Misses rare errors |
| **Rate-limiting** | Head | Sample N traces per second | Controls cost precisely | Low-traffic services get 100%, high-traffic get sampled |
| **Always-on** | Head | Sample 100% of traces | Complete data | Expensive at scale |
| **Error-based** | Tail | Keep all traces with errors | Never miss failures | Requires buffering all spans |
| **Latency-based** | Tail | Keep traces above latency threshold | Captures slow requests | Requires buffering all spans |
| **Adaptive** | Hybrid | Adjust rate based on traffic volume | Balances cost and coverage | Complex to implement |

### Sampling Configuration Example

```yaml
# OpenTelemetry Collector sampling processor
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always keep error traces
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Always keep slow traces (> 2s)
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 2000
      # Sample 10% of successful traces
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

:::warning
With head-based sampling at 1%, you'll capture only 1 in 100 error traces. If your error rate is 0.1%, you'll see roughly 1 in 100,000 requests that errored — almost certainly missing the signal. Use tail-based sampling or a composite strategy that always keeps errors.
:::

---

## 8. Tracing Architecture

### Full Tracing Pipeline

```
┌───────────────────────────────────────────────────────────────┐
│                     Tracing Pipeline                           │
│                                                                │
│  INSTRUMENTATION           COLLECTION          STORAGE/QUERY   │
│  ─────────────────         ──────────          ──────────────  │
│                                                                │
│  ┌────────────────┐   ┌────────────────┐   ┌───────────────┐  │
│  │  App + OTel SDK│   │  OTel Agent    │   │   Backend     │  │
│  │                │──▶│  (sidecar /    │──▶│               │  │
│  │  Auto + manual │   │   DaemonSet)   │   │  Jaeger       │  │
│  │  instrumentation│  │                │   │  Tempo        │  │
│  └────────────────┘   │  Batching      │   │  Zipkin       │  │
│                       │  Sampling      │   │  X-Ray        │  │
│                       │  Enrichment    │   │  Datadog APM  │  │
│                       └────────┬───────┘   └───────┬───────┘  │
│                                │                   │           │
│                                ▼                   ▼           │
│                       ┌────────────────┐   ┌───────────────┐  │
│                       │  OTel Collector│   │  Query UI     │  │
│                       │  (central)     │──▶│               │  │
│                       │                │   │  Jaeger UI    │  │
│                       │  Routing       │   │  Grafana Tempo│  │
│                       │  Tail sampling │   │  X-Ray console│  │
│                       │  Export        │   │  Datadog APM  │  │
│                       └────────────────┘   └───────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Backend Comparison

| Feature | Jaeger | Tempo | Zipkin | AWS X-Ray | Datadog APM |
|---------|--------|-------|--------|-----------|-------------|
| **License** | Apache 2.0 | AGPL 3.0 | Apache 2.0 | Proprietary | Proprietary |
| **Storage** | Cassandra, ES, Kafka | S3/GCS (object storage) | MySQL, Cassandra, ES | DynamoDB, S3 | Datadog-managed |
| **Indexing** | Full index | No index (search by ID, Tempo 2.0 adds TraceQL) | Full index | Partial index | Full index |
| **Cost** | Medium (requires indexing infra) | Low (object storage only) | Medium | Pay per trace scanned | Per host |
| **Query** | Trace ID, tags, service, duration | Trace ID, TraceQL | Trace ID, tags | Filter expressions | Full-text + tags |
| **Integration** | OpenTelemetry native | Grafana ecosystem | Spring Cloud Sleuth | AWS services native | 200+ integrations |
| **Best For** | Self-managed, full-featured | Cost-efficient, Grafana users | Simple deployments | AWS-native workloads | Full SaaS observability |

---

## 9. Correlating the Three Pillars

The real power of observability comes from connecting traces, logs, and metrics.

### Correlation Architecture

```
┌───────────────────────────────────────────────────────────┐
│              Three-Pillar Correlation                       │
│                                                            │
│    METRICS                TRACES               LOGS        │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐    │
│  │ p99 spike│        │ Waterfall│        │ ERROR log│    │
│  │ at 14:32 │        │ for req  │        │ at 14:32 │    │
│  │          │        │ abc-123  │        │ traceId: │    │
│  │          │        │          │        │ abc-123  │    │
│  └────┬─────┘        └────┬─────┘        └────┬─────┘    │
│       │                   │                   │           │
│       │    Exemplar       │    traceId        │           │
│       │    (traceId link) │    correlation    │           │
│       └──────────────────▶│◀──────────────────┘           │
│                           │                                │
│  Workflow:                                                 │
│  1. Dashboard shows p99 latency spike (METRIC)             │
│  2. Click exemplar → opens the slow trace (TRACE)          │
│  3. See which span is slow → click span → see logs (LOG)  │
│  4. Log shows: "Connection pool exhausted, waited 2.3s"   │
│  5. Root cause identified in < 5 minutes                   │
└───────────────────────────────────────────────────────────┘
```

### Exemplars

Exemplars are specific trace IDs attached to metric observations, linking a metric data point to the exact request that produced it.

```python
from prometheus_client import Histogram
from opentelemetry import trace

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'Request duration',
    ['method', 'endpoint']
)

def handle_request(request):
    start = time.time()
    response = process(request)
    duration = time.time() - start

    span = trace.get_current_span()
    trace_id = format(span.get_span_context().trace_id, '032x')

    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.path
    ).observe(duration, exemplar={'traceID': trace_id})
```

### Log-to-Trace Correlation

```json
{
  "timestamp": "2025-01-15T14:32:01.234Z",
  "level": "ERROR",
  "service": "payment-service",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "message": "Payment gateway timeout after 5000ms",
  "gateway": "stripe",
  "orderId": "12345"
}
```

In Grafana, clicking the `traceId` link in a log line opens the full trace waterfall in Tempo — instant context switch from logs to traces.

:::tip Senior-Level Insight
In interviews, explain the three-pillar correlation workflow: "Metrics alert me to a problem, traces show me where the problem is in the request flow, and logs tell me exactly what happened. The traceId is the glue that connects all three. Without this correlation, you're switching between three disconnected tools and manually correlating timestamps."
:::

---

## 10. Root Cause Analysis with Traces

### Common Patterns Visible in Traces

| Pattern | What It Looks Like | Root Cause |
|---------|-------------------|------------|
| **Single slow span** | One span dominates the waterfall | Slow DB query, external API, or algorithm |
| **Sequential when should be parallel** | Spans stacked vertically instead of overlapping | Missing async/parallel calls |
| **N+1 queries** | Dozens of identical short DB spans | Loop fetching related data individually |
| **Fan-out amplification** | One span spawns 100+ child spans | Scatter-gather gone wrong |
| **Retry storms** | Repeated spans with increasing gaps | Failing dependency + aggressive retries |
| **Cold cache** | First request slow, subsequent fast | Cache miss → DB fallback |
| **Connection pool exhaustion** | Span has long "wait" gap before "execute" | Pool too small, connections leaking |

### N+1 Query Detection in Traces

```
Trace waterfall showing N+1 problem:

GET /api/orders ──────────────────────────────────────────────── 2.1s
├─ db.query: SELECT * FROM orders WHERE user_id = 42 ─┤ 5ms
├─ db.query: SELECT * FROM products WHERE id = 101 ─┤ 3ms
├─ db.query: SELECT * FROM products WHERE id = 102 ─┤ 4ms
├─ db.query: SELECT * FROM products WHERE id = 103 ─┤ 3ms
├─ db.query: SELECT * FROM products WHERE id = 104 ─┤ 5ms
├─ ... (96 more identical spans)
├─ db.query: SELECT * FROM products WHERE id = 200 ─┤ 4ms
└─ Total: 100 individual queries × ~4ms = 400ms

FIX: SELECT * FROM products WHERE id IN (101, 102, ..., 200)
     Single query: ~8ms (50x faster)
```

---

## 11. Tail Latency Investigation

### Systematic Approach

```
Step 1: DETECT
  Alert: p99 latency > 500ms (SLO threshold)
  Dashboard: p99 spiked from 200ms to 800ms at 14:30

Step 2: FIND EXAMPLE TRACES
  Query tracing backend:
    service = "order-service"
    duration > 500ms
    time = last 30 minutes
  → Found 47 slow traces

Step 3: ANALYZE PATTERN
  Common pattern in slow traces:
    payment-service → fraud-check span = 400-600ms
  Normal traces:
    payment-service → fraud-check span = 20-30ms

Step 4: DRILL DOWN
  Fraud check service logs (filtered by traceId):
    "External fraud API timeout, retried 3 times"
    "Fraud API response time: 180ms (threshold: 50ms)"

Step 5: ROOT CAUSE
  Third-party fraud API degraded performance
  Retry logic amplifying the latency (3 retries × 180ms)

Step 6: MITIGATE
  Short-term: Reduce retry count, add circuit breaker
  Long-term: Cache fraud decisions, add fallback scoring
```

### Common Tail Latency Causes

| Cause | Detection Method | Fix |
|-------|-----------------|-----|
| **GC pauses** | Span gaps with no child activity | Tune GC, reduce allocation rate |
| **Lock contention** | Spans queued waiting for shared resource | Reduce critical section, use optimistic locking |
| **Cold starts** | First request after idle period is slow | Pre-warming, keep-alive connections |
| **Noisy neighbors** | Random sporadic slowness | Resource isolation, dedicated instances |
| **Connection pool starvation** | Long wait time before DB/HTTP spans | Increase pool size, fix connection leaks |
| **External dependency** | One downstream span dominates | Circuit breaker, caching, timeouts |
| **Retry amplification** | Multiple retries for same operation | Exponential backoff, circuit breaker |

---

## 12. Tracing Best Practices

### Instrumentation Checklist

| Area | What to Instrument |
|------|-------------------|
| **HTTP server** | Every inbound request (auto-instrumented) |
| **HTTP client** | Every outbound HTTP call (auto-instrumented) |
| **Database** | Every query (auto-instrumented, add query text) |
| **Cache** | GET/SET operations (hit/miss as attributes) |
| **Message queue** | Produce and consume operations |
| **Critical business logic** | Order placement, payment, auth decisions |
| **External APIs** | Third-party service calls |

### Overhead Considerations

| Factor | Impact | Mitigation |
|--------|--------|------------|
| **Context propagation** | ~microseconds per hop | Negligible |
| **Span creation** | ~1-5 microseconds per span | Only instrument meaningful operations |
| **Data export** | Network bandwidth + serialization CPU | Batch exports, use OTLP (compact) |
| **Collector processing** | CPU + memory on collector | Scale collectors horizontally |
| **Storage** | 1-10 KB per span, 5-50 spans per trace | Sampling reduces volume |

:::tip Senior-Level Insight
The overhead of tracing is almost always less than 1% of request latency. The cost savings from faster incident resolution typically pay for the entire tracing infrastructure many times over. When an interviewer asks about tracing overhead, say: "The overhead is negligible compared to the operational value. A single major incident avoided — which tracing enables — pays for years of tracing infrastructure."
:::

---

## 🔗 Related Chapters

- **[01 — Logging](./01-logging.md)** — Correlate logs with trace context
- **[02 — Metrics & Alerting](./02-metrics-alerting.md)** — Use exemplars to link metrics to traces
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice tracing scenarios
