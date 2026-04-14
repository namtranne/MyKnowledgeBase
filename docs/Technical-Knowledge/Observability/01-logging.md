---
sidebar_position: 2
title: "01 — Logging"
slug: 01-logging
---

# 📝 Logging

Logging is the foundational pillar of observability. Well-designed logs are the difference between a 5-minute incident resolution and a 5-hour war room. This chapter covers everything a senior engineer needs to know about production-grade logging.

---

## 1. Why Logging Matters

Logs serve multiple critical purposes in production systems:

| Purpose | Description | Example |
|---------|-------------|---------|
| **Debugging** | Reconstruct execution flow when things break | Trace why a payment failed for user X |
| **Auditing** | Record who did what, when | User Y deleted resource Z at 14:32 UTC |
| **Compliance** | Meet regulatory requirements (SOX, HIPAA, PCI-DSS) | Retain access logs for 7 years |
| **Incident Response** | Accelerate root cause analysis during outages | Correlate errors across 20 microservices |
| **Performance Analysis** | Identify slow operations and bottlenecks | Query execution took 12s (threshold: 2s) |
| **Business Intelligence** | Track user behavior and feature adoption | Feature X used 3,400 times/day |

:::tip Senior-Level Insight
In interviews, emphasize that logging isn't just about `System.out.println`. Production logging is a **system design problem** — you need to think about schema, volume, cost, retention, privacy, and correlation across distributed services.
:::

---

## 2. Log Levels

Log levels categorize messages by severity. Using them correctly is critical — wrong levels create noise or hide important signals.

### Level Hierarchy

```
┌──────────────────────────────────────────────────┐
│  FATAL   ← System is unusable, immediate action  │
│  ERROR   ← Operation failed, needs attention      │
│  WARN    ← Unexpected but recoverable             │
│  INFO    ← Normal operational events               │
│  DEBUG   ← Detailed diagnostic information         │
│  TRACE   ← Finest-grained, step-by-step execution  │
└──────────────────────────────────────────────────┘
  ▲ Higher severity (less verbose)
  ▼ Lower severity (more verbose)
```

### When to Use Each Level

| Level | When to Use | Example | Production? |
|-------|-------------|---------|:-----------:|
| **FATAL** | Unrecoverable error; process must terminate | Database connection pool exhausted, cannot recover | ✅ Always |
| **ERROR** | Operation failed; requires investigation | Payment processing failed for order #12345 | ✅ Always |
| **WARN** | Unexpected condition; system self-recovered | Connection pool at 90% capacity, retrying request | ✅ Always |
| **INFO** | Significant business or lifecycle events | Order #12345 placed successfully, service started | ✅ Always |
| **DEBUG** | Diagnostic detail for troubleshooting | Cache miss for key `user:42`, falling back to DB | ⚠️ Conditional |
| **TRACE** | Step-by-step execution flow | Entering method `calculateTax()`, param: `{amount: 99.99}` | ❌ Rarely |

### Code Examples

```java
// FATAL — system cannot continue
log.fatal("Cannot connect to primary database after 30 retries. Shutting down.");
System.exit(1);

// ERROR — operation failed, needs investigation
try {
    paymentGateway.charge(order);
} catch (PaymentDeclinedException e) {
    log.error("Payment failed for orderId={} userId={} amount={} reason={}",
              order.getId(), order.getUserId(), order.getAmount(), e.getMessage());
}

// WARN — degraded but operational
if (connectionPool.getActiveCount() > connectionPool.getMaxSize() * 0.9) {
    log.warn("Connection pool at {}% capacity, pool={}",
             connectionPool.getUtilization(), connectionPool.getName());
}

// INFO — business events
log.info("Order placed orderId={} userId={} total={} items={}",
         order.getId(), order.getUserId(), order.getTotal(), order.getItemCount());

// DEBUG — troubleshooting detail
log.debug("Cache lookup key={} hit={} ttl_remaining={}ms",
          cacheKey, cacheHit, ttlRemaining);

// TRACE — execution flow
log.trace("Entering calculateTax() state={} zipCode={}", state, zipCode);
```

:::warning Common Mistake
Don't log exceptions at ERROR when they're expected. A `UserNotFoundException` during login is a WARN (wrong password flow), not an ERROR. Reserve ERROR for **unexpected** failures.
:::

---

## 3. Structured Logging

### Text Logs vs Structured Logs

**Unstructured (bad):**
```
2025-01-15 14:32:01 ERROR PaymentService - Payment failed for user 42, order 12345, amount $99.99, reason: card declined
```

**Structured JSON (good):**
```json
{
  "timestamp": "2025-01-15T14:32:01.234Z",
  "level": "ERROR",
  "logger": "com.app.PaymentService",
  "service": "payment-service",
  "version": "2.4.1",
  "environment": "production",
  "traceId": "abc123def456",
  "spanId": "789ghi012",
  "requestId": "req-98765",
  "message": "Payment failed",
  "userId": 42,
  "orderId": 12345,
  "amount": 99.99,
  "currency": "USD",
  "reason": "card_declined",
  "errorCode": "PAYMENT_DECLINED",
  "duration_ms": 342,
  "host": "payment-prod-3",
  "region": "us-east-1"
}
```

### Why Structured Logging Wins

| Aspect | Unstructured Text | Structured JSON |
|--------|-------------------|-----------------|
| **Parsing** | Regex / grok patterns (fragile) | Native JSON parsing (reliable) |
| **Querying** | Substring search only | Field-level queries (`userId=42 AND level=ERROR`) |
| **Aggregation** | Extremely difficult | Easy (`COUNT BY errorCode WHERE service=payment`) |
| **Dashboards** | Manual extraction | Auto-generated from fields |
| **Schema Evolution** | Breaks parsers | Add fields without breaking |
| **Machine Readability** | Poor | Excellent |

### Consistent Log Schema

Define a standard schema across all services:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `timestamp` | ISO-8601 | ✅ | Event time in UTC |
| `level` | String | ✅ | Log level |
| `service` | String | ✅ | Service name |
| `version` | String | ✅ | Service version / build |
| `environment` | String | ✅ | prod / staging / dev |
| `traceId` | String | ✅ | Distributed trace ID |
| `spanId` | String | ✅ | Current span ID |
| `requestId` | String | ✅ | Unique request identifier |
| `message` | String | ✅ | Human-readable description |
| `host` | String | ✅ | Hostname / pod name |
| `logger` | String | ⬜ | Logger class name |
| `userId` | String | ⬜ | Acting user (if applicable) |
| `duration_ms` | Number | ⬜ | Operation duration |
| `error` | Object | ⬜ | Exception details |
| `metadata` | Object | ⬜ | Additional context |

### Implementation Example (Java + Logback)

```xml
<!-- logback-spring.xml -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
      <customFields>
        {"service":"payment-service","environment":"${ENV}"}
      </customFields>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

```python
# Python structured logging with structlog
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

logger.info("order.placed",
    order_id="12345",
    user_id="42",
    total=99.99,
    item_count=3
)
# Output: {"timestamp":"2025-01-15T14:32:01Z","level":"info","event":"order.placed","order_id":"12345","user_id":"42","total":99.99,"item_count":3}
```

---

## 4. Correlation IDs / Request IDs

In a microservices architecture, a single user request fans out across many services. Without correlation, debugging is like finding a needle in a haystack of millions of log lines.

### How Correlation IDs Work

```
User Request
    │
    ▼
┌─────────────────┐    requestId: req-98765
│   API Gateway    │    traceId:  abc123
│                  │─────────────────────────────────────┐
└────────┬────────┘                                      │
         │                                               │
    ┌────┴─────┐                                    ┌────┴─────┐
    ▼          ▼                                    ▼          │
┌────────┐ ┌────────┐                          ┌────────┐     │
│ Order  │ │ User   │                          │ Notif  │     │
│Service │ │Service │                          │Service │     │
│        │ │        │                          │        │     │
│req-98765│ │req-98765│                        │req-98765│    │
│abc123  │ │abc123  │                          │abc123  │     │
└───┬────┘ └────────┘                          └────────┘     │
    │                                                         │
    ▼                                                         │
┌────────┐                                                    │
│Payment │    All services share the same                     │
│Service │    traceId and requestId                           │
│req-98765│   ← enables log correlation                      │
│abc123  │                                                    │
└────────┘────────────────────────────────────────────────────┘
```

### MDC (Mapped Diagnostic Context)

MDC (SLF4J/Logback) attaches context to the current thread so every log statement automatically includes it.

```java
// Servlet filter — set correlation IDs on request entry
public class CorrelationFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
        String requestId = Optional.ofNullable(
            ((HttpServletRequest) req).getHeader("X-Request-ID")
        ).orElse(UUID.randomUUID().toString());

        String traceId = Optional.ofNullable(
            ((HttpServletRequest) req).getHeader("X-Trace-ID")
        ).orElse(UUID.randomUUID().toString());

        MDC.put("requestId", requestId);
        MDC.put("traceId", traceId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}
```

```java
// Propagate to downstream HTTP calls
public class RestClientInterceptor implements ClientHttpRequestInterceptor {
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                         ClientHttpRequestExecution execution) {
        request.getHeaders().set("X-Request-ID", MDC.get("requestId"));
        request.getHeaders().set("X-Trace-ID", MDC.get("traceId"));
        return execution.execute(request, body);
    }
}
```

### Propagation Across Async Boundaries

MDC is thread-local. For async operations (thread pools, CompletableFuture, reactive streams), you must explicitly copy the MDC context:

```java
// Wrap executor to propagate MDC
public class MdcAwareExecutor implements Executor {
    private final Executor delegate;

    public MdcAwareExecutor(Executor delegate) {
        this.delegate = delegate;
    }

    @Override
    public void execute(Runnable command) {
        Map<String, String> context = MDC.getCopyOfContextMap();
        delegate.execute(() -> {
            MDC.setContextMap(context);
            try {
                command.run();
            } finally {
                MDC.clear();
            }
        });
    }
}
```

:::tip Senior-Level Insight
In interviews, mention that MDC doesn't work out-of-the-box with reactive frameworks (Spring WebFlux, Project Reactor). You need Reactor Context or `contextWrite()` to propagate correlation IDs through reactive pipelines. This shows deep understanding of threading models.
:::

---

## 5. Log Aggregation

### Why Centralized Logging?

| Problem with Local Logs | Centralized Solution |
|-------------------------|---------------------|
| Logs scattered across 50+ pods | Single searchable index |
| Pods restart, logs are lost | Durable storage with retention |
| Can't correlate across services | Cross-service search by traceId |
| No alerting on log patterns | Pattern-based alerting rules |
| Manual SSH to each server | Web UI with filters and dashboards |

### ELK Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELK Stack                                │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Service  │    │  Service  │    │  Service  │    │  Service  │ │
│  │    A      │    │    B      │    │    C      │    │    D      │ │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Filebeat / Fluentd / FluentBit              │   │
│  │          (Log shippers — lightweight agents)              │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Logstash / Kafka                        │   │
│  │     (Ingestion pipeline — parse, enrich, buffer)          │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Elasticsearch                           │   │
│  │        (Search engine — index, store, query)              │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Kibana                                │   │
│  │       (Visualization — dashboards, search UI)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Log Aggregation Tools Comparison

| Feature | ELK Stack | CloudWatch Logs | Datadog Logs | Splunk |
|---------|-----------|----------------|-------------|--------|
| **Hosting** | Self-managed or Elastic Cloud | AWS-managed | SaaS | Self-managed or Cloud |
| **Query Language** | Lucene / KQL | CloudWatch Insights | Custom query syntax | SPL |
| **Cost Model** | Infra + Elastic license | Per GB ingested + stored | Per GB ingested | Per GB indexed/day |
| **Retention** | Configurable (ILM policies) | 1 day → never expire | 15 days (default) | Configurable |
| **Alerting** | Kibana Alerting / ElastAlert | CloudWatch Alarms | Monitors | Alerts |
| **Integration** | Broad (Beats, Logstash) | Native AWS services | 500+ integrations | Universal Forwarders |
| **Learning Curve** | Moderate–High | Low (AWS users) | Low–Moderate | Moderate–High |
| **Best For** | Full control, large scale | AWS-native workloads | Multi-cloud SaaS | Enterprise security |

---

## 6. Log Retention & Cost

### The Cost Problem

At scale, logging costs can exceed compute costs. A service logging 1 KB per request at 10,000 RPS generates:

```
1 KB × 10,000 RPS × 86,400 sec/day = 864 GB/day
864 GB/day × 30 days = 25.9 TB/month
At $0.50/GB ingestion = $12,960/month for ONE service
```

### Tiered Storage Strategy

```
┌─────────────────────────────────────────────────────┐
│                 Log Storage Tiers                     │
│                                                       │
│  HOT  (0–7 days)     SSD / Elasticsearch hot nodes   │
│  ├── Full-text search, fast queries                   │
│  ├── All log levels                                   │
│  └── Cost: $$$$                                       │
│                                                       │
│  WARM (7–30 days)    HDD / Elasticsearch warm nodes   │
│  ├── Searchable, slower queries                       │
│  ├── INFO and above                                   │
│  └── Cost: $$                                         │
│                                                       │
│  COLD (30–365 days)  S3 / Glacier / frozen tier       │
│  ├── Archived, slow retrieval                         │
│  ├── ERROR and FATAL only (or sampled)                │
│  └── Cost: $                                          │
│                                                       │
│  DELETE (365+ days)  Purged unless compliance requires │
│  └── Cost: $0                                         │
└─────────────────────────────────────────────────────┘
```

### Cost Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| **Drop DEBUG/TRACE in prod** | 40–60% volume | Less diagnostic data |
| **Sample verbose logs** | 30–50% volume | Incomplete picture for low-traffic paths |
| **Tiered retention (hot → warm → cold)** | 60–80% storage cost | Slower queries for old data |
| **Compress before shipping** | 70–90% bandwidth | CPU overhead on log shippers |
| **Aggregate repeated logs** | 20–40% volume | Lose individual timestamps |
| **Filter noise at the source** | 20–50% volume | Must identify noise patterns |
| **Use columnar formats (Parquet) for cold** | 80% storage for analytics | Not real-time searchable |

---

## 7. Log Rotation

Log rotation prevents disk exhaustion on hosts that write logs to files.

### Rotation Strategies

| Strategy | How It Works | Best For |
|----------|-------------|----------|
| **Size-based** | Rotate when file exceeds N MB | Predictable disk usage |
| **Time-based** | Rotate every N hours / days | Predictable file counts |
| **Hybrid** | Rotate on size OR time, whichever comes first | Production default |

### Logrotate Configuration

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily              # Time-based: rotate daily
    size 100M          # Size-based: also rotate if > 100MB
    rotate 14          # Keep 14 rotated files
    compress           # Gzip old logs
    delaycompress      # Don't compress the most recent rotated file
    missingok          # Don't error if log file is missing
    notifempty         # Don't rotate empty files
    copytruncate       # Truncate in-place (no need to restart app)
    dateext            # Append date instead of number
    dateformat -%Y%m%d # e.g., myapp.log-20250115.gz
}
```

:::warning
In containerized environments (Docker, Kubernetes), logs should go to **stdout/stderr** and be collected by a log shipper (Fluentd, Filebeat). Never write logs to files inside containers — the container filesystem is ephemeral, and log rotation adds unnecessary complexity.
:::

---

## 8. PII in Logs

Logging personally identifiable information (PII) is a security and compliance risk. Regulations like GDPR, HIPAA, and PCI-DSS impose heavy fines for PII exposure.

### What to NEVER Log

| Data Type | Why | Alternative |
|-----------|-----|-------------|
| **Passwords** | Security breach if logs are exposed | Log "authentication attempted" only |
| **API keys / tokens** | Credential leakage | Log last 4 chars: `****abcd` |
| **Credit card numbers** | PCI-DSS violation | Log last 4 digits: `****1234` |
| **Social Security Numbers** | HIPAA / privacy laws | Log existence only: `ssn=PRESENT` |
| **Full email addresses** | GDPR / privacy | Log masked: `j***@example.com` |
| **Medical records** | HIPAA violation | Log record ID, never content |
| **Request/response bodies** | May contain any of the above | Log selectively, redact sensitive fields |

### Redaction Strategies

```java
// Pattern-based redaction in Logback
public class PiiRedactionConverter extends ClassicConverter {
    private static final Pattern CC_PATTERN =
        Pattern.compile("\\b(\\d{4})\\d{8,12}(\\d{4})\\b");
    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("([a-zA-Z])[^@]*(@.+)");
    private static final Pattern SSN_PATTERN =
        Pattern.compile("\\b\\d{3}-\\d{2}-\\d{4}\\b");

    @Override
    public String convert(ILoggingEvent event) {
        String message = event.getFormattedMessage();
        message = CC_PATTERN.matcher(message).replaceAll("$1****$2");
        message = EMAIL_PATTERN.matcher(message).replaceAll("$1***$2");
        message = SSN_PATTERN.matcher(message).replaceAll("***-**-****");
        return message;
    }
}
```

```python
# Python redaction middleware
import re

PII_PATTERNS = {
    "credit_card": (re.compile(r"\b(\d{4})\d{8,12}(\d{4})\b"), r"\1****\2"),
    "email": (re.compile(r"([a-zA-Z])[^@]*(@.+)"), r"\1***\2"),
    "ssn": (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "***-**-****"),
}

def redact(message: str) -> str:
    for pattern, replacement in PII_PATTERNS.values():
        message = pattern.sub(replacement, message)
    return message
```

:::tip Senior-Level Insight
In interviews, proactively mention PII redaction. It shows security awareness. A strong answer: "We implement redaction at the logging framework level using custom appenders, so developers can't accidentally log PII. We also run automated scanners on log indices to detect PII that slips through."
:::

---

## 9. Writing Effective Log Messages

### Good vs Bad Logs

| ❌ Bad Log | ✅ Good Log | Why |
|-----------|------------|-----|
| `Error occurred` | `Payment declined orderId=123 reason=insufficient_funds gateway=stripe` | Context enables action |
| `Processing request` | `Processing order orderId=123 userId=42 items=3 total=99.99` | Identifies specific request |
| `Retrying...` | `Retry attempt=3/5 operation=db_write table=orders backoff_ms=2000` | Shows retry state |
| `NullPointerException` | `Null user profile userId=42 source=cache fallback=db_lookup` | Explains the "why" |
| `Done` | `Order fulfillment completed orderId=123 duration_ms=342 warehouse=east` | Measurable, identifiable |

### Actionable Log Checklist

Every production log message should answer:

1. **What** happened? → The event or error
2. **Who** is affected? → User ID, request ID, order ID
3. **Where** did it happen? → Service, method, host
4. **When** did it happen? → Timestamp (automatic with structured logging)
5. **Why** did it happen? → Error reason, context
6. **What's next?** → Is the system retrying? Is manual action needed?

### Log Message Guidelines

```
DO:
  ✅ Use consistent event naming:  "order.placed", "payment.failed"
  ✅ Include measurable values:     duration_ms=342, attempt=3/5
  ✅ Include identifiers:           orderId=123, userId=42, traceId=abc
  ✅ Use key=value or JSON format:  Easy to parse and query
  ✅ Log at request boundaries:     Entry and exit of service calls
  ✅ Include error codes:           errorCode=PAYMENT_DECLINED

DON'T:
  ❌ Log generic messages:          "Error occurred", "Something went wrong"
  ❌ Log variable-only messages:    log.info(userId)  — no context
  ❌ Use string concatenation:      log.info("User " + id + " did " + action)
  ❌ Log in tight loops:            for (item : items) log.debug(item)
  ❌ Include PII:                   log.info("Email: " + user.getEmail())
  ❌ Log redundant information:     Same data logged by caller AND callee
```

---

## 10. Logging Anti-Patterns

### Anti-Pattern Reference

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **Log-and-throw** | Exception logged twice (caller also logs) | Log OR throw, not both |
| **Catch-and-ignore** | Swallowed exception hides failures | At minimum, log.warn with context |
| **Logging in a loop** | 1M iterations = 1M log lines, OOM/disk full | Log summary after loop, or sample |
| **String concatenation** | Evaluates even if log level is disabled | Use parameterized logging: `log.debug("x={}", x)` |
| **Missing context** | `"Error occurred"` — useless in production | Include IDs, states, values |
| **DEBUG in production** | Massive volume, performance impact | Use INFO+ in prod, enable DEBUG per-service dynamically |
| **Logging sensitive data** | PII / secrets in log files | Framework-level redaction |
| **No log correlation** | Can't trace requests across services | Implement requestId / traceId propagation |
| **Inconsistent formats** | Some services text, some JSON | Enforce structured logging standard |
| **No log rotation** | Disk fills up, service crashes | Configure logrotate or use stdout + log shipper |

### Log-and-Throw (Most Common Anti-Pattern)

```java
// ❌ BAD: Log-and-throw — exception appears twice in logs
try {
    processPayment(order);
} catch (PaymentException e) {
    log.error("Payment failed", e);  // Logged here...
    throw e;                          // ...and logged again by the caller
}

// ✅ GOOD: Throw with context, let the handler log
try {
    processPayment(order);
} catch (PaymentException e) {
    throw new OrderProcessingException(
        "Payment failed for orderId=" + order.getId(), e);
}

// ✅ ALSO GOOD: Log and handle (don't re-throw)
try {
    processPayment(order);
} catch (PaymentException e) {
    log.error("Payment failed orderId={} reason={}", order.getId(), e.getMessage());
    order.setStatus(PAYMENT_FAILED);
    notifySupport(order);
}
```

### String Concatenation Performance

```java
// ❌ BAD: String concatenation always evaluates, even at INFO level
log.debug("Processing order: " + order.toString() + " for user: " + user.toString());

// ✅ GOOD: Parameterized — toString() only called if DEBUG is enabled
log.debug("Processing order orderId={} userId={}", order.getId(), user.getId());

// ✅ GOOD: Guard for expensive computations
if (log.isDebugEnabled()) {
    log.debug("Full order state: {}", order.toDetailedString());
}
```

---

## 11. Dynamic Log Level Management

In production, you may need to temporarily increase log verbosity for a specific service or class without redeploying.

### Approaches

| Approach | How | Pros | Cons |
|----------|-----|------|------|
| **Actuator endpoint** | `POST /actuator/loggers/com.app.PaymentService` | Instant, per-class | Reverts on restart |
| **Config server** | Spring Cloud Config / Consul KV | Centralized, persistent | Requires config infra |
| **Feature flags** | LaunchDarkly, Flagsmith | Per-user/request debug | Adds flag dependency |
| **Environment variable** | `LOG_LEVEL=DEBUG` on restart | Simple | Requires restart |

```bash
# Spring Boot Actuator — change log level at runtime
curl -X POST http://localhost:8080/actuator/loggers/com.app.PaymentService \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": "DEBUG"}'

# Revert to default
curl -X POST http://localhost:8080/actuator/loggers/com.app.PaymentService \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": null}'
```

:::tip Senior-Level Insight
Mention dynamic log levels in interviews when discussing incident response. "During an incident, I increase the log level to DEBUG for the affected service via actuator, collect diagnostic data, then revert to INFO. This avoids redeployment and gives us the detail we need without permanent performance impact."
:::

---

## 12. Logging in Containers & Kubernetes

### Container Logging Best Practices

```
┌──────────────────────────────────────────────────────┐
│              Kubernetes Logging Architecture           │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │              Application Pod                   │     │
│  │  ┌────────────────────────────────────────┐   │     │
│  │  │  App Container → stdout/stderr          │   │     │
│  │  └──────────────┬─────────────────────────┘   │     │
│  │                 │                              │     │
│  │  ┌──────────────▼─────────────────────────┐   │     │
│  │  │  Sidecar (Fluentd/Filebeat) [optional]  │   │     │
│  │  └──────────────┬─────────────────────────┘   │     │
│  └─────────────────┼──────────────────────────────┘     │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────┐     │
│  │  Node-level agent (DaemonSet)                   │     │
│  │  Fluentd / Fluent Bit / Filebeat               │     │
│  │  Reads: /var/log/containers/*.log               │     │
│  └─────────────────┬──────────────────────────────┘     │
│                    │                                     │
│                    ▼                                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Log Aggregator (Elasticsearch / CloudWatch /    │    │
│  │                   Datadog / Splunk)               │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

| Practice | Recommendation |
|----------|---------------|
| **Output destination** | Always log to stdout/stderr, never to files |
| **Format** | JSON (one JSON object per line) |
| **Multiline logs** | Avoid; if necessary, configure Fluentd multiline parser |
| **Log shipper** | DaemonSet (Fluent Bit) for node-level collection |
| **Resource limits** | Set memory limits on log shipper pods to prevent OOM |
| **Backpressure** | Buffer to disk when aggregator is slow; don't drop logs silently |

---

## 🔗 Related Chapters

- **[02 — Metrics & Alerting](./02-metrics-alerting.md)** — Complement logs with quantitative monitoring
- **[03 — Distributed Tracing](./03-distributed-tracing.md)** — Correlate logs with trace context
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice logging scenarios
