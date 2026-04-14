# Chapter 3 — Microservices at Scale

> Systems that just act slow are much harder to deal with than systems that just fail fast. **In a distributed system, latency kills.**

---

## Failure Is Everywhere

At scale, failure is a statistical certainty. The more machines, the more likely any individual one fails. Hard drives are more reliable than ever — but you have thousands of them.

**Mindset shift:**
- Don't spend all your effort **preventing** failure — spend it on **recovering** gracefully
- If you can handle unplanned failure, planned outages (upgrades, maintenance) become trivial
- Google attaches hard drives with **velcro** so they can rip them out and replace them fast — they plan for failure, not against it

---

## Cross-Functional Requirements

Before choosing resilience and scaling strategies, know your requirements:

| Requirement | Key Questions | Example Target |
|-------------|---------------|----------------|
| **Response time / Latency** | What percentile? Under what load? | 90th percentile < 2s at 200 concurrent connections/sec |
| **Availability** | 24/7? Acceptable downtime? | 99.95% uptime per month |
| **Durability of data** | How much data loss is acceptable? How long must data be kept? | Zero loss for financial transactions; session logs kept for 1 year |

These requirements **vary per service**. A reporting system running twice a month doesn't need the same resilience as your payment service.

---

## Degrading Functionality

With microservices, system health is **not binary** — it's a spectrum. When a dependency is down, you must decide what to do:

```
Product Page requires:
├── Product Service        → CRITICAL (no page without it)
├── Pricing Service        → CRITICAL (can't sell without price)
├── Shopping Cart Service  → IMPORTANT (show "Be Back Soon!" fallback)
└── Recommendations        → NICE-TO-HAVE (hide section entirely)
```

- For every customer-facing interface, ask: **"What happens if this dependency is down?"**
- The right degradation strategy is often a **business decision**, not a technical one
- Options: show cached data, hide the component, display fallback UI, show phone number for manual orders

---

## Architectural Safety Measures

### Real-World Failure Story

A classified ads website proxied calls to legacy services (strangler pattern). One old, low-traffic legacy service started responding **very slowly** (not failing — just slow).

**What happened:**
1. HTTP connection pool threads waited for the slow service to time out
2. While waiting, new requests queued up asking for worker threads
3. Connection pool's wait-for-worker timeout was **disabled by default**
4. 40 concurrent connections ballooned to 800 in 5 minutes
5. **Entire site went down** — because of a service used by less than 5% of customers

**Root causes and fixes:**

| Root Cause | Fix |
|-----------|-----|
| Timeout too long / not configured | Set explicit timeouts on all out-of-process calls |
| Single shared connection pool | Separate connection pools per downstream service (bulkheads) |
| Kept sending traffic to sick service | Circuit breaker to stop calling unhealthy services |

---

## The Three Resilience Patterns

### 1. Timeouts

> Put timeouts on **every** out-of-process call. No exceptions.

| Too Short | Too Long | Just Right |
|-----------|----------|------------|
| Treat successful calls as failures | Slow the whole system down | Start with sensible defaults, log timeouts, adjust based on data |

- Pick a **default timeout** for everything, then tune per-service based on observed behavior
- Log every timeout occurrence for analysis

### 2. Circuit Breakers

Inspired by electrical circuit breakers — protect your system from cascading failure:

```
         CLOSED                    OPEN                    HALF-OPEN
    (normal operation)        (fail fast)              (testing recovery)
    
    ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
    │  Requests    │        │  All requests│        │  Let a few   │
    │  pass through│───────▶│  fail        │───────▶│  requests    │
    │              │ after N│  immediately │ after  │  through     │
    │  Track       │failures│              │timeout │              │
    │  failures    │        │  No calls to │period  │  If healthy  │──▶ CLOSED
    └──────────────┘        │  downstream  │        │  → reset     │
                            └──────────────┘        │  If sick     │──▶ OPEN
                                                    │  → re-blow   │
                                                    └──────────────┘
```

**Implementation details:**
- For HTTP: failure = timeout OR 5XX status code
- When blown: options are fail fast, queue for retry (async only), or degrade functionality
- Can be **manually triggered** for planned maintenance — blow all circuit breakers on dependent services before taking a service down
- Libraries: **Netflix Hystrix** (JVM), **Polly** (.NET), **circuit_breaker** (Ruby), **resilience4j** (modern JVM)

### 3. Bulkheads

From shipping: a sealed compartment that prevents a leak from sinking the whole ship.

```
Without Bulkheads:                    With Bulkheads:
┌────────────────────┐                ┌────────────────────┐
│  Shared Pool (10)  │                │  Pool A (5)   │ OK │
│                    │                ├────────────────┤    │
│  Service A: slow   │ ← exhausts    │  Pool B (3)   │ OK │
│  Service B: fine   │    all workers ├────────────────┤    │
│  Service C: fine   │                │  Pool C (2)   │ OK │
│  ALL BLOCKED!      │                │  A is slow →  │    │
└────────────────────┘                │  only A blocked│   │
                                      └────────────────────┘
```

- **Minimum**: separate connection pools per downstream service
- Separation of concerns via microservices is itself a bulkhead
- Bulkheads + circuit breakers: circuit breakers **automatically seal** bulkheads
- **Load shedding**: Hystrix can reject requests when resources are saturated — sometimes rejecting a request is better than letting it queue and slow everything down

> **Bulkheads are the most important** of the three patterns. Timeouts and circuit breakers free resources when constrained; bulkheads prevent constraints from happening in the first place.

### Isolation

- The more one service depends on another being up, the more coupled their health becomes
- Use integration techniques that allow downstream services to be offline (async, caching)
- Greater isolation = less coordination between teams = more autonomy

### Idempotency

An operation is **idempotent** if repeating it produces the same result as executing it once.

```xml
<!-- NOT idempotent — repeated calls add points each time -->
<credit>
  <amount>100</amount>
  <forAccount>1234</forAccount>
</credit>

<!-- IDEMPOTENT — includes reason, so duplicates are detected -->
<credit>
  <amount>100</amount>
  <forAccount>1234</forAccount>
  <reason>
    <forPurchase>4567</forPurchase>
  </reason>
</credit>
```

- Essential for replaying failed messages and handling duplicate deliveries
- HTTP GET and PUT are defined as idempotent in the spec — but your implementation must honor this
- The **business operation** is idempotent, not necessarily all side effects (logging the call is fine)

---

## Scaling Strategies

### Vertical Scaling (Go Bigger)

- Bigger CPU, more RAM, faster I/O
- Quick win, especially with virtualization (resize in minutes)
- Limits: expensive at the top end; software may not utilize extra cores; single point of failure remains

### Splitting Workloads (Horizontal Decomposition)

- Move from multi-service-per-host to single-service-per-host
- Split a single service into two when one capability dominates load:

```
Before:                          After:
┌──────────────────────┐         ┌───────────────────┐
│   Accounts Service   │         │ Accounts Service  │ ← critical, highly available
│   - CRUD operations  │  ──▶    │ - CRUD operations │
│   - Reporting queries│         └───────────────────┘
└──────────────────────┘         ┌───────────────────┐
                                 │ Reporting Service │ ← non-critical, can tolerate downtime
                                 │ - Reporting queries│
                                 └───────────────────┘
```

### Spreading Risk

| Level | Strategy |
|-------|----------|
| Host | Don't co-locate multiple services on one machine |
| VM | Ensure VMs on different physical boxes (virtualization platform settings) |
| Rack | Don't put all services in one rack |
| Data center | Distribute across availability zones |
| Region | For maximum resilience, distribute across regions |
| Provider | Disaster recovery with a different hosting provider |

**AWS specifics:**
- Region = distinct cloud; AZ = data center equivalent
- AWS guarantees 99.95% uptime **per region** (not per AZ or instance)
- Always distribute across multiple AZs within a region
- Consider multi-region for critical services
- Understand SLA liability — it rarely covers your business losses

### Load Balancing

```
                    ┌───────────────┐
  Clients ────────▶ │ Load Balancer │
                    └───┬───┬───┬───┘
                        │   │   │
                   ┌────┘   │   └────┐
                   ▼        ▼        ▼
              ┌────────┐┌────────┐┌────────┐
              │Instance││Instance││Instance│
              │   1    ││   2    ││   3    │
              └────────┘└────────┘└────────┘
```

- Transparent to consumers; distributes load and handles instance failure
- **SSL termination** at the load balancer: HTTPS externally, HTTP internally within a VLAN
- Options: hardware (expensive, hard to automate) or software (mod_proxy, HAProxy, nginx)
- Treat load balancer config like code: version-controlled, automatically applied
- Watch out: hardware load balancers can themselves be single points of failure

### Worker-Based Systems

- Multiple worker instances compete for items from a shared work queue
- Great for batch processing: image thumbnails, emails, report generation
- Scale by adding workers; resilient to worker failure (work just takes longer)
- Queue must be resilient (use a persistent message broker or Zookeeper)
- Leverage unused compute capacity (e.g., use ecommerce servers as report workers overnight)

### Designing for Growth

> **"Design for ~10x growth, but plan to rewrite before ~100x."** — Jeff Dean, Google

- The architecture that gets you started is not the architecture for massive scale
- Gilt: monolithic Rails app → 450+ microservices over a few years as load grew
- **Don't build for massive scale upfront** — you may be building for load that never comes
- The need to rearchitect for scale is a **sign of success**, not failure

---

## Scaling Databases

### Availability vs Durability

| Concept | Definition | Solution |
|---------|-----------|----------|
| **Durability** | Data isn't lost | Replicas, backups, resilient filesystems |
| **Availability** | Database accepts queries | Standby promotion, multiple active nodes |

These are **independent concerns** — you can have data safe on a backup but your DB still down.

### Scaling for Reads

```
  Application
      │
      ├── Writes ──▶ [Primary DB]
      │                    │
      │              replication
      │                    │
      └── Reads  ──▶ [Read Replica 1]
                     [Read Replica 2]
                     [Read Replica 3]
```

- Read replicas are **eventually consistent** — reads may return slightly stale data
- Suitable for read-heavy workloads (100:1 read-to-write ratio is common for catalogs)
- **Caching often delivers bigger wins** with less work than read replicas

### Scaling for Writes (Sharding)

```
  Hash(customer_key) ──▶ Shard assignment
  
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Shard 1  │  │ Shard 2  │  │ Shard 3  │
  │  A - H   │  │  I - P   │  │  Q - Z   │
  └──────────┘  └──────────┘  └──────────┘
```

- Apply a hash function to the key to determine which shard receives the write
- **Cross-shard queries are expensive**: query each shard independently, then join in memory, or maintain a denormalized read store
- Adding shards requires rebalancing (Cassandra handles this well; others may need downtime)
- Sharding improves write throughput but doesn't automatically improve resilience (unless combined with replication per shard)

**When scaling writes gets hard**: consider switching database technology (Cassandra, MongoDB, Riak) or just buying a bigger box as a quick fix.

### Shared Database Infrastructure

- Multiple independent schemas on one RDBMS reduces machine count but introduces a **single point of failure**
- If the shared DB goes down, all services using it go down simultaneously
- Acceptable for cost savings in dev/staging; be very careful in production

### CQRS (Command-Query Responsibility Segregation)

```
  Commands (writes)              Queries (reads)
       │                              │
       ▼                              ▼
  ┌──────────┐    event feed    ┌──────────┐
  │ Command  │ ──────────────▶  │  Query   │
  │  Model   │                  │  Model   │
  │          │                  │          │
  │ Event    │                  │ Graph DB │
  │ Store    │                  │ Key-Value│
  └──────────┘                  │ Search   │
                                └──────────┘
```

- Separate the write model (commands) from read model (queries)
- Commands: validated, applied to domain, can be queued for async processing. Can use **event sourcing** — store the list of commands/events rather than current state.
- Queries: built from event feed, can use completely different storage (graph DB, search index, key-value store)
- Multiple query implementations for different access patterns (graph view, search view, report view)
- **Warning**: Significant paradigm shift from CRUD. Even experienced teams struggle. Use when the read/write asymmetry justifies the complexity.

---

## Caching

### Where to Cache

| Location | Who Controls? | Invalidation | Best For |
|----------|--------------|--------------|----------|
| **Client-side** | Client | Harder (must signal from server) | Reducing network calls drastically |
| **Proxy** (reverse proxy, CDN) | Transparent to both | Based on HTTP headers | Adding caching to existing system with zero code changes |
| **Server-side** (Redis, Memcache, in-memory) | Server | Easier (close to data source) | Multiple client types; simplest to reason about |

Most production systems use **a mix of all three**.

### HTTP Caching Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Cache-Control` | How long to cache (TTL in seconds) | `Cache-Control: max-age=600` |
| `Expires` | Specific datetime when resource becomes stale | `Expires: Thu, 01 Dec 2025 16:00:00 GMT` |
| `ETag` | Fingerprint of resource value | `ETag: "o5t6fkd2sa"` |

**Conditional GET with ETags:**

```
Client: GET /customer/123
Server: 200 OK, ETag: "abc123"

(later...)

Client: GET /customer/123, If-None-Match: "abc123"
Server: 304 Not Modified  ← no body transferred, save bandwidth
   OR
Server: 200 OK, ETag: "def456"  ← resource changed, new data
```

- Reverse proxies (Squid, Varnish) handle HTTP cache headers automatically
- CDNs (CloudFront, Akamai) route requests to edge caches near the user
- **Don't mix Cache-Control, Expires, and ETag carelessly** — they can conflict

### Caching for Writes

- **Write-behind cache**: Write to local cache, flush to downstream store later
- Useful for bursty writes or when the same data is written multiple times
- If the downstream store is unavailable, the cache can queue writes for later delivery

### Caching for Resilience

- Serve stale cached data when a downstream service is down (better than nothing)
- **The Guardian** periodically crawled its own live site to generate a static fallback version served during outages

### Hiding the Origin

For highly cacheable data, the origin server may be scaled for only a fraction of total traffic:

```
  Client ──▶ [Cache Layer] ──miss──▶ [Origin]   ← can't handle full load!
```

**Thundering herd problem**: If an entire cache region fails, all requests slam the origin.

**Solution**: Origin populates cache **asynchronously**. On cache miss, trigger a background job to repopulate. Fail the request fast rather than queuing it (which would cause contention and cascade failures).

### Cache Poisoning — Cautionary Tale

A bug in cache header code caused a legacy system's `Expires: Never` header to leak through. Squid cached it. The team fixed the code and cleared Squid's cache — **but couldn't clear ISP caches or user browser caches**. Pages with `Expires: Never` were stuck in users' browsers indefinitely. Only fix: change the URLs to force re-fetching.

> Understand the **full caching path** from origin to user. Browser cache, ISP cache, CDN, reverse proxy, application cache — each layer can hold stale data.

### Keep It Simple

> Be careful about caching in **too many places**. The more caches between source and consumer, the harder it is to reason about data freshness. If you need a cache, start with **one** and think carefully before adding more.

---

## Autoscaling

### Two Approaches

| Type | How It Works | Best For |
|------|-------------|----------|
| **Predictive** | Scale based on known patterns (9am-5pm peak) | Regular traffic patterns; cost savings by scaling down off-peak |
| **Reactive** | Scale based on real-time metrics (CPU, request count) | Unexpected spikes; failure recovery |

**Practical advice:**
- Start with autoscaling for **failure recovery** (e.g., "always keep 5 instances; replace any that die")
- Collect data before scaling for load — you need to understand traffic patterns first
- Be **cautious about scaling down** too quickly — having excess capacity is better than not having enough
- Maintain load tests that simulate different traffic patterns to validate autoscaling rules
- Know your **scaling speed**: if scaling up takes 10 minutes but you get 2 minutes' notice, keep buffer capacity

---

## CAP Theorem

> In a distributed system, when a network partition occurs, you must choose between **Consistency** and **Availability**. You can't have both.

| Property | Meaning |
|----------|---------|
| **Consistency** | Every read returns the most recent write (all nodes see the same data) |
| **Availability** | Every request receives a response (no errors, no timeouts) |
| **Partition Tolerance** | System continues to operate despite network failures between nodes |

**You always need Partition Tolerance** (networks fail; you can't avoid it). So the real choice is **AP or CP**.

### AP System (Sacrifice Consistency)

```
  DC1                          DC2
  ┌────────────┐              ┌────────────┐
  │  Service   │              │  Service   │
  │  Instance  │    ╳ link    │  Instance  │
  │            │    broken    │            │
  │  DB Node   │              │  DB Node   │
  │  (writes)  │              │  (stale)   │
  └────────────┘              └────────────┘
```

- Both nodes keep serving requests
- DC2 may return stale data until partition heals and data resynchronizes
- **Eventually consistent**: all nodes will converge to the same state — eventually
- Easier to build and scale
- Good for: product catalogs, recommendations, social media feeds

### CP System (Sacrifice Availability)

- During partition, nodes refuse to serve requests they can't guarantee are consistent
- Requires **distributed locking** — extremely hard to implement correctly
- Use cases: financial balances, inventory counts (where selling something you don't have is unacceptable)

> **"Friends don't let friends write their own distributed consistent data store."** Use existing systems (Consul, ZooKeeper, etcd) instead.

### CA System?

Doesn't exist in distributed systems. If you have no partition tolerance, you're running on a single machine — which isn't distributed.

### It's Not All or Nothing

- **Different services** can make different choices: catalog = AP, inventory = CP
- **Within a single service**, different operations can trade differently: reading balance = AP (stale OK), updating balance = CP (must be consistent)
- Databases like **Cassandra** let you choose consistency level per query (all replicas, quorum, single node)

### The Real World Argument

Physical reality is always eventually consistent:

> You have 100 albums. You sell one → 99 in the system. But someone drops and breaks one → 98 on the shelf. Your "consistent" system is already wrong.

This is why AP systems are often the pragmatic choice. If you can contact a customer later to say "sorry, out of stock," that might be an acceptable trade-off for much simpler architecture.

---

## Service Discovery

When you have dozens or hundreds of microservices, you need to answer: **where is everything?**

Service discovery has two parts:
1. **Registration**: service says "I'm here!" when it starts
2. **Lookup**: other services find where to send requests

### DNS

The simplest approach:

```
accounts.musiccorp.com  →  10.0.1.42  (or a load balancer)
```

- Convention-based: `<service>-<environment>.musiccorp.com`
- Or use different DNS servers per environment
- **Pros**: Universal standard, every tech stack supports it
- **Cons**: TTL causes staleness; updating entries is painful with ephemeral containers; JVM caches DNS aggressively

**Best practice**: Point DNS at a **load balancer**, not directly at hosts. The load balancer handles adding/removing instances.

### ZooKeeper

- Originally from Hadoop; provides a hierarchical key-value namespace
- Runs in a cluster (minimum 3 nodes) for fault tolerance
- Clients can **watch** nodes for changes (get notified when service locations change)
- Also used for: configuration management, leader election, distributed locks
- **Mature and battle-tested**, but generic — you build service discovery on top of it

### Consul

A modern alternative that goes further than ZooKeeper:

| Feature | Consul | ZooKeeper |
|---------|--------|-----------|
| Service discovery | Built-in HTTP API | Build on top of key-value |
| DNS server | Built-in (serves SRV records) | No |
| Health checks | Built-in | No |
| Configuration | Built-in key-value | Built-in key-value |
| Cluster management | Serf (separated concern) | Integrated |

- Drop-in for DNS-based systems that support SRV records
- Health checking can overlap with monitoring tools (Nagios, Sensu)
- Built by HashiCorp (Vagrant, Packer, Terraform) — strong track record

### Eureka (Netflix)

- Focused purely on service discovery (not general-purpose config store)
- REST-based endpoint + Java client with health checking
- Built-in basic round-robin load balancing
- **Netflix standardizes on JVM** — Eureka client handles discovery, but polyglot environments need custom clients

### Rolling Your Own

- Use cloud provider metadata (AWS instance tags) to track services
- Tags: `service=accounts`, `environment=production`, `version=154`
- Query AWS APIs to find instances
- Works well but limited to single cloud provider

### Don't Forget the Humans

Build dashboards and reports on top of service registries. Developers need to know what APIs exist, where services are running, and their health status.

---

## Documenting Services

### Swagger (OpenAPI)

- Describe API in a specification file → generates interactive web UI
- Execute requests from the browser (POST templates, parameter docs)
- Language-specific libraries generate the spec from code annotations
- Great developer experience, widely adopted

### HAL (Hypertext Application Language)

- Standard for hypermedia controls in JSON/XML
- HAL Browser: explore APIs by following links in the browser
- 50+ supporting client libraries
- Best if you're already using HATEOAS; embedding documentation in the API itself
- More powerful exploration than Swagger, but less polished for execution

### The Self-Describing System

Combine multiple data sources into a living system map:

```
Service Registry (Consul)   → where services are running
Health Checks              → which services are healthy
Correlation IDs / Tracing  → how services interact
HAL / Swagger              → what each service does
Monitoring Dashboards      → how the system is performing
```

> Start with a simple wiki. Gradually pull in live data to make it a **living, self-updating system map**.

---

## Chapter Summary

| Pattern | Purpose |
|---------|---------|
| **Timeouts** | Prevent slow downstream calls from blocking your system |
| **Circuit Breakers** | Stop calling unhealthy services; fail fast; auto-recover |
| **Bulkheads** | Isolate failures so one bad service doesn't exhaust shared resources |
| **Idempotency** | Safe message replay and duplicate handling |
| **Load Balancing** | Distribute traffic; transparent scaling; instance failure handling |
| **Caching** | Reduce load, improve latency, provide resilience fallback |
| **CQRS** | Separate read/write concerns for independent scaling |
| **CAP awareness** | Choose AP or CP per capability based on business needs |
| **Autoscaling** | Match capacity to demand; recover from instance failures |
| **Service Discovery** | Find services dynamically in an environment with ephemeral instances |

---

## Interview Cheat Sheet

**Q: How do you handle failure in a microservices architecture?**
> Three core patterns: (1) Timeouts on all outbound calls — never wait indefinitely. (2) Circuit breakers — after N failures, stop calling and fail fast; periodically probe for recovery. (3) Bulkheads — isolate connection pools per downstream service so one slow dependency can't exhaust all resources. Beyond patterns: design for graceful degradation, make operations idempotent for safe retries, and use dead letter queues for poison messages.

**Q: Explain the CAP theorem with a practical example.**
> In a distributed system during a network partition, you choose between Consistency (all nodes see the same data) and Availability (all nodes respond to requests). Example: an inventory service across two data centers. If the link breaks — AP: both keep serving requests but DC2 might show stale stock levels. CP: refuse queries until the partition heals to avoid selling items you don't have. Most real systems aren't purely AP or CP — they make different trade-offs per operation.

**Q: How do you scale a microservice?**
> Start vertical (bigger machine). Then horizontal: put instances behind a load balancer. For databases: read replicas for read-heavy workloads, sharding for write scaling, CQRS for asymmetric read/write patterns. Use caching at client, proxy, and server levels. Autoscale reactively (metrics-based) and predictively (time-based patterns). Design for 10x; plan to rearchitect before 100x.

**Q: What is a circuit breaker pattern?**
> Like an electrical circuit breaker. After a threshold of failures to a downstream service, the breaker "opens" — all subsequent calls fail immediately without attempting the network call. After a timeout period, it enters "half-open" state, letting a few test requests through. If they succeed, the breaker closes (normal operation resumes). If they fail, it reopens. This prevents cascading failures and gives the downstream service time to recover. Netflix Hystrix and resilience4j are popular implementations.

**Q: How does service discovery work?**
> Services register themselves with a discovery system (Consul, Eureka, DNS) when they start. Consumers query the discovery system to find service locations. DNS is simplest but has TTL staleness issues. Consul provides HTTP API + built-in DNS + health checks. For dynamic environments (containers, auto-scaling), a registry that handles ephemeral instances is essential. Always point DNS at load balancers rather than individual hosts.

**Q: When would you use CQRS?**
> When read and write patterns are drastically different — for example, complex write validations but simple lookups, or when you need different query views (graph, full-text search, time-series) from the same data. CQRS lets you scale reads and writes independently, use different storage technologies for each, and process commands asynchronously. Warning: it's a significant paradigm shift from CRUD — don't use it unless the complexity is justified.

**Q: What's the difference between a read replica and caching?**
> Read replicas are database-level copies that receive asynchronous replication from the primary. They're eventually consistent and require DB infrastructure. Caching (Redis, Memcache, HTTP cache) stores computed results in faster storage, works at the application level, and can be placed at client, proxy, or server. Caching typically delivers bigger performance gains with less operational overhead. Use read replicas when you need database-level features (complex queries) on the replica; use caching for everything else.
