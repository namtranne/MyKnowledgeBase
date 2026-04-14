---
sidebar_position: 11
title: "10 — Microservices Design Patterns"
slug: 10-microservices-patterns
---

# 🧱 Microservices Design Patterns

Microservices decompose a system into independently deployable services, but this decomposition introduces a new class of problems: service discovery, data consistency, fault tolerance, cross-cutting concerns, and distributed coordination. The patterns in this chapter are the battle-tested solutions to those problems. Knowing **when** to apply each — and the trade-offs you inherit — separates production-hardened architectures from toy demos.

---

## 🔍 Pattern Landscape

| # | Pattern | Problem Domain | Complexity |
|:-:|---------|---------------|:----------:|
| 1 | **API Gateway** | Client routing, cross-cutting concerns | 🟡 Medium |
| 2 | **Database per Service** | Data ownership, decoupling | 🟡 Medium |
| 3 | **Circuit Breaker** | Fault tolerance, cascading failure | 🟡 Medium |
| 4 | **Service Discovery** | Dynamic service location | 🟡 Medium |
| 5 | **Event Sourcing** | State management, audit trail | 🔴 High |
| 6 | **CQRS** | Read/write optimization | 🔴 High |
| 7 | **Saga** | Distributed transactions | 🔴 High |
| 8 | **Strangler Fig** | Legacy migration | 🟡 Medium |
| 9 | **Bulkhead** | Failure isolation | 🟡 Medium |
| 10 | **Sidecar** | Cross-cutting concerns | 🟡 Medium |
| 11 | **Retry** | Transient failure recovery | 🟢 Low |
| 12 | **API Composition** | Data aggregation across services | 🟡 Medium |
| 13 | **Distributed Lock** | Mutual exclusion in distributed systems | 🔴 High |

---

## 1. API Gateway Pattern

### The Problem

In a microservices architecture, clients face a combinatorial explosion of endpoints. A mobile app rendering a product page might need data from Catalog, Pricing, Inventory, Reviews, and Recommendations — five separate services, five separate network calls, five separate authentication handshakes.

```
Without API Gateway:

┌──────────┐    ┌─────────────────┐
│          │───►│ Catalog Service  │  :8081
│          │    └─────────────────┘
│          │    ┌─────────────────┐
│  Mobile  │───►│ Pricing Service  │  :8082
│  Client  │    └─────────────────┘
│          │    ┌─────────────────┐
│          │───►│ Inventory Service│  :8083
│          │    └─────────────────┘
│          │    ┌─────────────────┐
│          │───►│ Reviews Service  │  :8084
└──────────┘    └─────────────────┘

Problems: Multiple round trips, each service needs auth logic,
          client coupled to internal topology, no central rate limiting
```

### How It Works

The API Gateway sits between clients and backend services, acting as a reverse proxy that routes, composes, and secures requests.

```
With API Gateway:

┌──────────┐         ┌─────────────────────────────────────┐
│  Mobile  │────────►│            API GATEWAY              │
│  Client  │◄────────│                                     │
└──────────┘         │  ┌────────┐  ┌─────┐  ┌─────────┐  │
                     │  │ Auth   │  │Rate │  │ Logging │  │
┌──────────┐         │  │ Filter │  │Limit│  │ Filter  │  │
│   Web    │────────►│  └────────┘  └─────┘  └─────────┘  │
│  Client  │◄────────│                                     │
└──────────┘         │  ┌─────────────────────────────┐    │
                     │  │      Route Dispatcher       │    │
┌──────────┐         │  └──────┬──────┬──────┬────────┘    │
│ 3rd Party│────────►│         │      │      │             │
│   API    │◄────────└─────────┼──────┼──────┼─────────────┘
                               │      │      │
                    ┌──────────┘      │      └──────────┐
                    ▼                 ▼                  ▼
             ┌──────────┐     ┌──────────┐      ┌──────────┐
             │ Catalog  │     │ Pricing  │      │ Reviews  │
             │ Service  │     │ Service  │      │ Service  │
             └──────────┘     └──────────┘      └──────────┘
```

### Implementation with Spring Cloud Gateway

```java
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("catalog-service", r -> r
                .path("/api/v1/products/**")
                .filters(f -> f
                    .stripPrefix(2)
                    .addRequestHeader("X-Request-Source", "gateway")
                    .retry(config -> config
                        .setRetries(3)
                        .setStatuses(HttpStatus.SERVICE_UNAVAILABLE))
                    .circuitBreaker(config -> config
                        .setName("catalogCB")
                        .setFallbackUri("forward:/fallback/catalog")))
                .uri("lb://catalog-service"))

            .route("pricing-service", r -> r
                .path("/api/v1/pricing/**")
                .filters(f -> f
                    .stripPrefix(2)
                    .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter())))
                .uri("lb://pricing-service"))
            .build();
    }

    @Bean
    public RedisRateLimiter redisRateLimiter() {
        // 10 requests/second, burst of 20
        return new RedisRateLimiter(10, 20);
    }
}
```

### Rate Limiting Implementation

```java
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private final RedisTemplate<String, String> redis;

    public RateLimitFilter(RedisTemplate<String, String> redis) {
        this.redis = redis;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String clientId = extractClientId(exchange);
        String key = "rate:" + clientId + ":" + currentWindow();

        Long count = redis.opsForValue().increment(key);
        if (count == 1) {
            redis.expire(key, Duration.ofSeconds(1));
        }

        if (count > 100) {
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return exchange.getResponse().setComplete();
        }

        exchange.getResponse().getHeaders()
            .add("X-RateLimit-Remaining", String.valueOf(100 - count));
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() { return -1; }
}
```

### Gateway Responsibilities

| Concern | Implementation | Example |
|---------|---------------|---------|
| **Routing** | Path-based dispatch to backend services | `/api/products/**` → Catalog Service |
| **Authentication** | JWT validation, OAuth2 token introspection | Reject requests without valid bearer token |
| **Rate Limiting** | Token bucket / sliding window per client | 100 req/s for standard tier, 1000 for premium |
| **Load Balancing** | Round-robin, weighted, least-connections | Distribute across 5 Catalog Service instances |
| **Request Aggregation** | Compose responses from multiple backends | Product page = catalog + pricing + reviews |
| **Protocol Translation** | REST → gRPC, HTTP → WebSocket | Mobile uses REST, backend uses gRPC |
| **Caching** | Short-lived response caching | Cache catalog responses for 30 seconds |
| **Circuit Breaking** | Stop routing to failing services | After 5 failures, return cached/fallback response |
| **Logging & Tracing** | Inject correlation IDs, log all requests | Add `X-Trace-Id` header for distributed tracing |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Simplified client** | Single endpoint, single auth handshake, single TLS connection |
| **Decoupled topology** | Backend services can be restructured without client changes |
| **Centralized cross-cutting** | Auth, rate limiting, and logging implemented once |
| **Protocol flexibility** | Gateway translates between client-friendly REST and internal gRPC/messaging |
| **Reduced round trips** | Gateway can aggregate multiple service calls into one response |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Single point of failure** | Gateway down = entire system unreachable | Deploy multiple instances behind a load balancer; use health checks and auto-scaling |
| **Added latency** | Extra network hop on every request | Keep gateway stateless and lightweight; co-locate with backend services; use async I/O |
| **Complexity bottleneck** | Gateway accumulates routing logic over time | Use a declarative config approach (YAML-driven routes); separate BFF gateways per client type |
| **Deployment coupling** | Gateway changes needed when services change | Use service discovery + dynamic routing; avoid business logic in the gateway |
| **Team ownership** | Central gateway owned by one team becomes a bottleneck | Adopt Backend-for-Frontend (BFF): each frontend team owns its own gateway |

### BFF Variant — Backend for Frontend

When different clients (web, mobile, IoT) have radically different data needs, a single gateway becomes bloated. BFF creates a dedicated gateway per client type:

```
┌──────────┐     ┌──────────────┐
│  Mobile  │────►│  Mobile BFF  │────┐
└──────────┘     └──────────────┘    │
                                     ├──►  Internal Services
┌──────────┐     ┌──────────────┐    │
│   Web    │────►│   Web BFF    │────┘
└──────────┘     └──────────────┘
```

### Technology Choices

| Technology | Type | Best For |
|-----------|------|----------|
| **Kong** | Open-source / Enterprise | Plugin ecosystem, Lua extensions |
| **AWS API Gateway** | Managed | Serverless, Lambda integration |
| **Spring Cloud Gateway** | Framework | Java/Spring ecosystem, reactive |
| **Envoy** | Proxy | High-performance, service mesh integration |
| **NGINX** | Proxy | Static routing, high throughput |
| **Traefik** | Proxy | Kubernetes-native, auto-discovery |

---

## 2. Database per Service Pattern

### The Problem

In a monolith, all modules share a single database. This creates tight coupling: a schema change in the Orders table can break the Analytics module. Deployments require coordinating every team. The database becomes a bottleneck — all services compete for the same connection pool, the same I/O, the same locks.

```
Shared Database Anti-Pattern:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Order Service│  │ User Service │  │Analytics Svc │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────┬────┴────────────────┘
                    ▼
            ┌──────────────┐
            │  Shared DB   │  ← Schema coupling
            │  (Postgres)  │  ← Lock contention
            │              │  ← Single point of failure
            └──────────────┘
```

### How It Works

Each microservice owns its data exclusively. No other service may directly access another service's database — all access goes through the service's API.

```
Database per Service:

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Order Service│     │ User Service │     │Analytics Svc │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Postgres   │     │   Postgres   │     │ ClickHouse   │
│  (Orders)    │     │  (Users)     │     │ (Analytics)  │
└──────────────┘     └──────────────┘     └──────────────┘

Each service: owns its schema, chooses its DB technology,
              scales independently, deploys without coordination
```

### Polyglot Persistence

One of the most powerful benefits: each service picks the storage engine best suited to its access patterns.

```java
// Order Service — relational data with ACID transactions
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "order")
    private List<OrderItem> items;

    private BigDecimal totalAmount;
    private Instant createdAt;
}
```

```java
// Product Catalog Service — document model for flexible attributes
@Document(collection = "products")
public class Product {
    @Id
    private String id;
    private String name;
    private String category;
    private Map<String, Object> attributes; // flexible schema
    private List<String> tags;
    private List<Variant> variants;
}

// MongoDB lets each product category have different attributes
// without ALTER TABLE migrations
```

```java
// Recommendation Service — graph relationships
// Neo4j for "customers who bought X also bought Y"
@Node
public class CustomerNode {
    @Id @GeneratedValue
    private Long id;
    private String customerId;

    @Relationship(type = "PURCHASED")
    private List<ProductNode> purchases;

    @Relationship(type = "VIEWED")
    private List<ProductNode> views;
}
```

### Data Consistency Challenge

The hardest problem with Database per Service: how do you maintain consistency across services without shared transactions?

```
Problem: Customer places an order

1. Order Service  →  INSERT order (status=CREATED)     ✅
2. Inventory Svc  →  UPDATE stock -= quantity           ✅
3. Payment Svc    →  Charge credit card                 ❌ FAILS

Now: Order exists, inventory decremented, but payment never happened.
     Data is INCONSISTENT across services.
```

**Solutions:**

| Approach | Consistency | Complexity | Use When |
|----------|-------------|------------|----------|
| **Saga pattern** | Eventual | High | Multi-step business workflows |
| **Event sourcing** | Eventual | High | Need full audit trail |
| **Change Data Capture** | Eventual | Medium | Sync data across services |
| **API Composition** | Read-time join | Medium | Query-only scenarios |
| **Outbox pattern** | At-least-once delivery | Medium | Reliable event publishing |

### Cross-Service Queries

Without a shared database, JOINs across services are impossible. The API Composition pattern (covered in section 12) addresses this. A quick preview:

```java
// Instead of: SELECT o.*, u.name FROM orders o JOIN users u ON o.user_id = u.id
// You compose at the application level:

public OrderDetailDTO getOrderDetail(Long orderId) {
    CompletableFuture<Order> orderFuture =
        CompletableFuture.supplyAsync(() -> orderClient.getOrder(orderId));
    CompletableFuture<User> userFuture =
        orderFuture.thenCompose(order ->
            CompletableFuture.supplyAsync(() -> userClient.getUser(order.getUserId())));

    return orderFuture.thenCombine(userFuture,
        (order, user) -> new OrderDetailDTO(order, user.getName())).join();
}
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Independent deployability** | Schema changes in one service don't affect others |
| **Technology freedom** | Each service picks the optimal storage engine |
| **Independent scaling** | Scale each database based on its own load profile |
| **Fault isolation** | One database failing doesn't bring down the entire system |
| **Clear ownership** | Team owns service + its data — no cross-team schema conflicts |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **No cross-service JOINs** | Complex queries require multiple service calls | Use API Composition or CQRS with materialized views |
| **Distributed transactions** | Can't use a single ACID transaction across services | Use Saga pattern with compensating transactions |
| **Data duplication** | Services may need copies of other services' data | Accept controlled duplication; sync via events |
| **Operational overhead** | Multiple databases to monitor, back up, tune | Use managed database services (RDS, Cloud SQL); standardize on observability tooling |
| **Eventual consistency** | Clients may see stale data temporarily | Design UIs to handle eventual consistency (optimistic updates, loading states) |

:::tip When NOT to Use
If your system has fewer than 5 services with tight data coupling and a small team, a shared database with well-defined schemas might be simpler. Premature decomposition of data stores adds complexity without proportional benefit.
:::

---

## 3. Circuit Breaker Pattern

### The Problem

In a microservices system, services depend on each other. When a downstream service becomes slow or unavailable, upstream callers keep sending requests, consuming threads and connection pool slots while waiting for timeouts. This cascading failure can bring down the entire system.

```
Cascading Failure:

Client → API Gateway → Order Service → Payment Service (SLOW — 30s timeout)
                                     → Inventory Service (healthy but starved)

Order Service: all 200 threads blocked waiting for Payment Service
               → can't serve ANY requests (even to healthy services)
               → API Gateway times out → Client sees errors
               → Health check fails → Load balancer removes Order Service
               → SYSTEM DOWN
```

### How It Works

The Circuit Breaker monitors calls to a service and transitions between three states:

```
                    ┌─────────────────────────────────────────────┐
                    │         CIRCUIT BREAKER STATE MACHINE        │
                    └─────────────────────────────────────────────┘

    ┌──────────┐         failure threshold         ┌──────────┐
    │          │        exceeded (e.g. 50%          │          │
    │  CLOSED  │─────────errors in last 10──────► │   OPEN   │
    │          │            calls)                  │          │
    │ (normal) │                                    │ (reject  │
    │          │                                    │  all     │
    └──────────┘                                    │  calls)  │
         ▲                                          └────┬─────┘
         │                                               │
         │          success                         timeout expires
         │                                          (e.g. 60 seconds)
         │                                               │
         │          ┌───────────┐                         │
         └──────────│HALF-OPEN  │◄────────────────────────┘
                    │           │
            success │(allow 1   │ failure
                    │ trial     │──────► back to OPEN
                    │ call)     │
                    └───────────┘
```

**State Transitions:**

| State | Behavior | Transitions To |
|-------|----------|---------------|
| **CLOSED** | All calls pass through; failures are counted | OPEN (when failure rate exceeds threshold) |
| **OPEN** | All calls rejected immediately with fallback response | HALF-OPEN (after timeout period) |
| **HALF-OPEN** | One trial call allowed through | CLOSED (if trial succeeds) or OPEN (if trial fails) |

### Implementation with Resilience4j

```java
@Configuration
public class CircuitBreakerConfig {

    @Bean
    public CircuitBreaker paymentCircuitBreaker() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)           // open after 50% failures
            .slowCallRateThreshold(80)          // open if 80% of calls are slow
            .slowCallDurationThreshold(Duration.ofSeconds(3))
            .slidingWindowType(SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(10)              // evaluate last 10 calls
            .minimumNumberOfCalls(5)            // need at least 5 calls to evaluate
            .waitDurationInOpenState(Duration.ofSeconds(60))
            .permittedNumberOfCallsInHalfOpenState(3)
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .recordExceptions(IOException.class, TimeoutException.class)
            .ignoreExceptions(BusinessValidationException.class)
            .build();

        return CircuitBreaker.of("paymentService", config);
    }
}
```

```java
@Service
public class OrderService {

    private final PaymentClient paymentClient;
    private final CircuitBreaker circuitBreaker;
    private final PaymentFallbackService fallback;

    public PaymentResult processPayment(PaymentRequest request) {
        Supplier<PaymentResult> decorated = CircuitBreaker
            .decorateSupplier(circuitBreaker, () -> paymentClient.charge(request));

        return Try.ofSupplier(decorated)
            .recover(CallNotPermittedException.class,
                e -> fallback.queueForLaterProcessing(request))
            .recover(IOException.class,
                e -> fallback.returnPendingStatus(request))
            .get();
    }
}
```

### Fallback Strategies

```java
@Service
public class PaymentFallbackService {

    private final KafkaTemplate<String, PaymentRequest> kafka;
    private final CacheManager cacheManager;

    // Strategy 1: Queue for retry
    public PaymentResult queueForLaterProcessing(PaymentRequest request) {
        kafka.send("payment-retry-queue", request.getOrderId(), request);
        return PaymentResult.pending("Payment queued for processing");
    }

    // Strategy 2: Return cached response
    public PaymentResult returnCachedResponse(String customerId) {
        Cache cache = cacheManager.getCache("payment-status");
        return cache.get(customerId, PaymentResult.class);
    }

    // Strategy 3: Graceful degradation
    public PaymentResult returnPendingStatus(PaymentRequest request) {
        return PaymentResult.builder()
            .status(PaymentStatus.PENDING)
            .message("Payment will be processed shortly")
            .retryAfter(Duration.ofMinutes(5))
            .build();
    }

    // Strategy 4: Alternative service
    public PaymentResult useBackupProvider(PaymentRequest request) {
        return backupPaymentClient.charge(request);
    }
}
```

### Monitoring the Circuit Breaker

```java
circuitBreaker.getEventPublisher()
    .onStateTransition(event ->
        log.warn("Circuit breaker '{}' transitioned: {} → {}",
            event.getCircuitBreakerName(),
            event.getStateTransition().getFromState(),
            event.getStateTransition().getToState()))
    .onCallNotPermitted(event ->
        metrics.increment("circuit_breaker.rejected",
            "service", event.getCircuitBreakerName()))
    .onError(event ->
        log.error("Circuit breaker '{}' recorded error: {}",
            event.getCircuitBreakerName(),
            event.getThrowable().getMessage()));
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Prevents cascading failure** | Failing service is isolated before it drags down the caller |
| **Fail fast** | Open state returns immediately instead of waiting for a timeout |
| **Self-healing** | Half-open state automatically tests recovery without manual intervention |
| **Resource protection** | Stops thread exhaustion on the calling service |
| **Graceful degradation** | Fallbacks keep the system partially functional |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Tuning difficulty** | Wrong thresholds cause false positives or miss real failures | Use count-based windows in low-traffic environments; tune based on production metrics |
| **Data loss risk** | Requests rejected during OPEN state might be important | Queue rejected requests for later retry; use DLQ for critical operations |
| **Testing complexity** | Hard to test state transitions in integration tests | Inject chaos (Chaos Monkey); use Resilience4j's test utilities with forced state transitions |
| **Inconsistent state** | Partial processing before circuit opens | Combine with the Saga pattern for compensating transactions |
| **Thundering herd on recovery** | All queued requests hit the service when circuit closes | Use half-open with limited permits; implement gradual ramp-up |

:::warning Common Mistake
Don't wrap idempotent GET requests and non-idempotent POST requests with the same circuit breaker. A POST failure may warrant different behavior (retry queue) than a GET failure (cached response).
:::

---

## 4. Service Discovery Pattern

### The Problem

In a microservices environment, services run on dynamically assigned hosts and ports. Instances are created, destroyed, and moved by container orchestrators. Hard-coding service locations is impossible.

```
The Problem:

Order Service needs to call Inventory Service, but:
  - Yesterday:  Inventory was at 10.0.1.5:8080
  - Today:      Auto-scaler added 2 replicas at 10.0.1.12:8080 and 10.0.1.13:8080
  - Right now:  10.0.1.5 crashed and was replaced by 10.0.1.20:8080

How does Order Service know where Inventory Service is RIGHT NOW?
```

### Client-Side Discovery

The client queries a service registry, gets a list of available instances, and picks one using a load-balancing algorithm.

```
┌──────────────────────────────────────────────────────────────┐
│                CLIENT-SIDE DISCOVERY                          │
│                                                              │
│  ┌──────────────┐      1. Query       ┌─────────────────┐   │
│  │              │─────────────────────►│ Service Registry │   │
│  │ Order        │      2. Return      │  (Eureka/Consul) │   │
│  │ Service      │◄─────instances──────│                  │   │
│  │              │                     │ inventory-svc:   │   │
│  │  ┌────────┐  │                     │  - 10.0.1.12     │   │
│  │  │ Client │  │ 3. Load-balance     │  - 10.0.1.13     │   │
│  │  │  LB    │  │    & call directly  │  - 10.0.1.20     │   │
│  │  └───┬────┘  │                     └─────────────────┘   │
│  └──────┼───────┘                                            │
│         │                                                    │
│         ├──────────────────────► 10.0.1.12:8080              │
│         │ (round-robin/          (Inventory Instance 1)      │
│         │  weighted/random)                                  │
│         ├──────────────────────► 10.0.1.13:8080              │
│         │                        (Inventory Instance 2)      │
│         └──────────────────────► 10.0.1.20:8080              │
│                                  (Inventory Instance 3)      │
└──────────────────────────────────────────────────────────────┘
```

### Server-Side Discovery

The client sends requests to a load balancer (or DNS), which queries the registry and forwards to an appropriate instance.

```
┌──────────────────────────────────────────────────────────────┐
│                SERVER-SIDE DISCOVERY                          │
│                                                              │
│  ┌──────────────┐      1. Call       ┌────────────────────┐  │
│  │ Order        │───────────────────►│   Load Balancer    │  │
│  │ Service      │                    │   (AWS ALB / K8s   │  │
│  │              │ 4. Response        │    Service)        │  │
│  │              │◄───────────────────│                    │  │
│  └──────────────┘                    └───────┬────────────┘  │
│                                              │               │
│                                     2. Query │ Registry      │
│                                              ▼               │
│                                     ┌────────────────────┐   │
│                                     │ Service Registry   │   │
│                                     └────────────────────┘   │
│                                              │               │
│                                     3. Route │ to instance   │
│                                              ▼               │
│                                     ┌────────────────────┐   │
│                                     │ Inventory Instance │   │
│                                     └────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Implementation with Spring Cloud + Eureka

**Service Registration (Inventory Service):**

```java
@SpringBootApplication
@EnableEurekaClient
public class InventoryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(InventoryServiceApplication.class, args);
    }
}
```

```yaml
# application.yml — Inventory Service
eureka:
  client:
    serviceUrl:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    preferIpAddress: true
    leaseRenewalIntervalInSeconds: 10     # heartbeat every 10s
    leaseExpirationDurationInSeconds: 30  # evict after 30s without heartbeat
    metadataMap:
      version: "2.1.0"
      zone: "us-east-1a"

spring:
  application:
    name: inventory-service
```

**Service Discovery (Order Service calling Inventory):**

```java
@Service
public class InventoryClient {

    private final WebClient.Builder webClientBuilder;

    // "lb://inventory-service" uses Spring Cloud LoadBalancer
    // to resolve the service name via Eureka
    public Mono<InventoryResponse> checkStock(String productId) {
        return webClientBuilder.build()
            .get()
            .uri("lb://inventory-service/api/inventory/{productId}", productId)
            .retrieve()
            .bodyToMono(InventoryResponse.class);
    }
}
```

### Kubernetes Native Discovery

In Kubernetes, service discovery is built into the platform via DNS and `Service` resources:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: inventory-service
spec:
  selector:
    app: inventory
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
# Any pod in the cluster can reach inventory-service via:
#   http://inventory-service                          (same namespace)
#   http://inventory-service.payments.svc.cluster.local  (cross-namespace)
```

### Comparison: Client-Side vs Server-Side

| Aspect | Client-Side | Server-Side |
|--------|------------|-------------|
| **Load balancing logic** | In the client (more flexible) | In the LB/proxy (simpler client) |
| **Language coupling** | Need LB library per language | Language-agnostic |
| **Network hops** | Direct client → service | Extra hop through LB |
| **Registry dependency** | Client must know registry | LB handles registry interaction |
| **Example** | Netflix Ribbon + Eureka | AWS ALB, Kubernetes Service |
| **Best for** | Homogeneous tech stack (all Java/Spring) | Polyglot environments |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Dynamic scaling** | New instances register automatically, clients discover them |
| **Zero downtime deployment** | Deregistering an instance removes it from traffic gracefully |
| **Environment agnostic** | Same code works across dev, staging, production |
| **Health-aware routing** | Unhealthy instances are evicted from the registry |
| **Metadata-based routing** | Route by version, zone, or canary tags |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Registry is a SPOF** | If registry goes down, new instances can't be discovered | Run registry in HA cluster (3+ nodes); clients cache last-known instances |
| **Stale entries** | Crashed instances stay registered until TTL expires | Shorten heartbeat intervals; implement active health checking |
| **Network overhead** | Heartbeats and polling add traffic | Use event-driven (push) registration updates instead of polling |
| **Complexity** | Extra infrastructure to deploy and maintain | Use platform-native discovery (Kubernetes DNS) when possible |
| **Split-brain** | Registry cluster can partition, leading to inconsistent views | Use consensus-based registries (Consul with Raft, etcd) |

---

## 5. Event Sourcing Pattern

### The Problem

Traditional CRUD systems store only the **current state**. When you update a record, the previous state is lost. This creates problems:

- **No audit trail**: Who changed what, and when?
- **Lost intent**: Was the balance decreased because of a purchase, a refund reversal, or a fee?
- **Debugging difficulty**: Can't reconstruct what happened at a specific point in time
- **Limited analytics**: Historical trends require separate ETL pipelines

```
CRUD — Destructive Updates:

Time  │  Operation               │  Account Balance (stored)
──────┼──────────────────────────┼──────────────────────────
T1    │  Open account            │  $0
T2    │  Deposit $1000           │  $1000     (previous $0 lost)
T3    │  Purchase $200           │  $800      (previous $1000 lost)
T4    │  Refund $50              │  $850      (previous $800 lost)
T5    │  Fee charged $10         │  $840      (previous $850 lost)

Question: What was the balance at T3? → Cannot answer without audit log
Question: Why did balance change from $850 to $840? → No record of fee
```

### How It Works

Instead of storing the current state, store every state-changing event as an immutable fact. The current state is derived by replaying events.

```
Event Sourcing — Immutable Append-Only Log:

┌────┬──────────────────────────────────┬─────────┬────────────┐
│ #  │  Event                           │  Data   │ Timestamp  │
├────┼──────────────────────────────────┼─────────┼────────────┤
│ 1  │  AccountOpened                   │ id=A001 │ 2024-01-01 │
│ 2  │  MoneyDeposited                  │ +$1000  │ 2024-01-02 │
│ 3  │  PurchaseMade                    │ -$200   │ 2024-01-03 │
│ 4  │  RefundIssued                    │ +$50    │ 2024-01-04 │
│ 5  │  FeeCharged                      │ -$10    │ 2024-01-05 │
└────┴──────────────────────────────────┴─────────┴────────────┘

Current balance = replay(events) = 0 + 1000 - 200 + 50 - 10 = $840
Balance at T3   = replay(events[1:3]) = 0 + 1000 - 200 = $800  ✅
```

### Implementation

```java
// Domain Events
public sealed interface AccountEvent {
    String accountId();
    Instant occurredAt();

    record AccountOpened(String accountId, String owner, Instant occurredAt)
        implements AccountEvent {}

    record MoneyDeposited(String accountId, BigDecimal amount,
                          String source, Instant occurredAt)
        implements AccountEvent {}

    record MoneyWithdrawn(String accountId, BigDecimal amount,
                          String reason, Instant occurredAt)
        implements AccountEvent {}

    record AccountFrozen(String accountId, String reason, Instant occurredAt)
        implements AccountEvent {}
}
```

```java
// Aggregate — current state reconstructed from events
public class BankAccount {
    private String id;
    private String owner;
    private BigDecimal balance = BigDecimal.ZERO;
    private AccountStatus status = AccountStatus.ACTIVE;
    private int version = 0;

    // Reconstruct state from event history
    public static BankAccount fromEvents(List<AccountEvent> events) {
        BankAccount account = new BankAccount();
        events.forEach(account::apply);
        return account;
    }

    // Apply event to update internal state
    private void apply(AccountEvent event) {
        switch (event) {
            case AccountOpened e -> {
                this.id = e.accountId();
                this.owner = e.owner();
            }
            case MoneyDeposited e ->
                this.balance = this.balance.add(e.amount());
            case MoneyWithdrawn e ->
                this.balance = this.balance.subtract(e.amount());
            case AccountFrozen e ->
                this.status = AccountStatus.FROZEN;
        }
        this.version++;
    }

    // Business logic produces new events (not direct state changes)
    public MoneyWithdrawn withdraw(BigDecimal amount, String reason) {
        if (status != AccountStatus.ACTIVE)
            throw new AccountFrozenException(id);
        if (balance.compareTo(amount) < 0)
            throw new InsufficientFundsException(id, balance, amount);

        return new MoneyWithdrawn(id, amount, reason, Instant.now());
    }
}
```

```java
// Event Store
@Repository
public class EventStore {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public void append(String streamId, int expectedVersion, List<AccountEvent> events) {
        int currentVersion = getCurrentVersion(streamId);
        if (currentVersion != expectedVersion) {
            throw new OptimisticLockingException(
                "Stream %s: expected version %d but found %d"
                    .formatted(streamId, expectedVersion, currentVersion));
        }

        for (AccountEvent event : events) {
            jdbc.update("""
                INSERT INTO event_store (stream_id, version, event_type, payload, occurred_at)
                VALUES (?, ?, ?, ?::jsonb, ?)
                """,
                streamId,
                ++currentVersion,
                event.getClass().getSimpleName(),
                mapper.writeValueAsString(event),
                event.occurredAt()
            );
        }
    }

    public List<AccountEvent> loadStream(String streamId) {
        return jdbc.query("""
            SELECT event_type, payload FROM event_store
            WHERE stream_id = ? ORDER BY version ASC
            """,
            (rs, row) -> deserialize(rs.getString("event_type"), rs.getString("payload")),
            streamId
        );
    }
}
```

### Snapshots — Solving the Replay Performance Problem

Replaying thousands of events for every read is expensive. Snapshots periodically save the current state to short-circuit replay.

```
Without snapshots:   replay 10,000 events → slow
With snapshots:      load snapshot (at event #9,950) + replay 50 events → fast

┌─────────────────────────────────────────────────────────┐
│ Event Stream: Account A001                              │
│                                                          │
│ [E1][E2][E3]...[E9950][ SNAPSHOT ][ E9951]...[E10000]   │
│                           ▲                              │
│                    balance=$45,230                        │
│                    version=9950                           │
│                                                          │
│ To get current state:                                    │
│   1. Load snapshot at version 9950                        │
│   2. Replay events 9951–10000 (only 50 events)           │
└─────────────────────────────────────────────────────────┘
```

```java
public BankAccount loadAccount(String accountId) {
    Optional<Snapshot> snapshot = snapshotStore.loadLatest(accountId);

    List<AccountEvent> events;
    BankAccount account;

    if (snapshot.isPresent()) {
        account = snapshot.get().toAggregate();
        events = eventStore.loadStreamFrom(accountId, snapshot.get().version() + 1);
    } else {
        account = new BankAccount();
        events = eventStore.loadStream(accountId);
    }

    events.forEach(account::apply);
    return account;
}
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Complete audit trail** | Every change is recorded with timestamp, actor, and reason |
| **Temporal queries** | Reconstruct state at any point in time |
| **Event-driven integration** | Events naturally feed into other services, analytics, and projections |
| **Debugging** | Replay events to reproduce bugs in exact sequence |
| **No data loss** | Append-only store — no destructive updates |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Replay performance** | Loading thousands of events is slow | Use snapshots at regular intervals (every N events) |
| **Schema evolution** | Event formats change over time | Use upcasters to transform old events to new format; version events explicitly |
| **Storage growth** | Events accumulate indefinitely | Archive old events to cold storage; use snapshots to make archival safe |
| **Complexity** | Steeper learning curve than CRUD | Start with a single aggregate; use established frameworks (Axon, EventStoreDB) |
| **Eventual consistency** | Projections lag behind the event log | Accept eventual consistency; design UIs to show "processing" states |
| **Querying events** | Can't run SQL queries against an event log directly | Build read-optimized projections (CQRS) |

---

## 6. CQRS (Command Query Responsibility Segregation) Pattern

### The Problem

In a traditional architecture, the same data model serves both reads and writes. This creates a fundamental tension:

- **Writes** need normalized, consistent data (3NF, referential integrity, transactions)
- **Reads** need denormalized, fast data (pre-joined, pre-aggregated, indexed for specific queries)

Optimizing for one degrades the other. A complex product catalog with 50 attributes, inventory counts, pricing tiers, and reviews cannot be served efficiently from a write-optimized relational schema.

### How It Works

CQRS splits the application into two separate models:

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CQRS ARCHITECTURE                           │
│                                                                      │
│   Commands (writes)                     Queries (reads)              │
│   ─────────────────                     ────────────────             │
│                                                                      │
│   ┌──────────┐     ┌────────────┐       ┌──────────────┐            │
│   │ REST API │────►│  Command   │       │  Query API   │◄── Client  │
│   │ POST/PUT │     │  Handler   │       │  GET         │            │
│   └──────────┘     └─────┬──────┘       └──────┬───────┘            │
│                          │                     │                     │
│                          ▼                     ▼                     │
│                   ┌──────────────┐      ┌──────────────┐            │
│                   │ Write Model  │      │  Read Model  │            │
│                   │ (Normalized) │      │(Denormalized)│            │
│                   │              │      │              │            │
│                   │  Postgres    │      │ Elasticsearch│            │
│                   │  (3NF)       │      │ / Redis /    │            │
│                   │              │      │ MongoDB      │            │
│                   └──────┬───────┘      └──────▲───────┘            │
│                          │                     │                     │
│                          │    Sync Mechanism   │                     │
│                          │  (Events / CDC /    │                     │
│                          └──── Polling) ───────┘                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Implementation

**Command Side (Write Model):**

```java
// Write model — normalized, validated, transactional
@Service
public class ProductCommandService {

    private final ProductRepository repo;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void updatePrice(UpdatePriceCommand cmd) {
        Product product = repo.findById(cmd.productId())
            .orElseThrow(() -> new ProductNotFoundException(cmd.productId()));

        product.validatePriceChange(cmd.newPrice());
        product.setPrice(cmd.newPrice());
        product.setLastModifiedBy(cmd.userId());

        repo.save(product);

        eventPublisher.publishEvent(new PriceUpdatedEvent(
            product.getId(), cmd.newPrice(), Instant.now()));
    }
}
```

**Query Side (Read Model):**

```java
// Read model — denormalized, optimized for specific query patterns
@Document(indexName = "products")
public class ProductView {
    @Id
    private String id;
    private String name;
    private String category;
    private BigDecimal price;
    private int stockCount;         // denormalized from Inventory
    private double averageRating;   // pre-computed from Reviews
    private int reviewCount;
    private String brandName;       // denormalized from Brands
    private List<String> tags;
    private Map<String, String> attributes;

    // single document has everything needed for product list/detail pages
    // no JOINs, no N+1 queries
}
```

**Projection — Keeping Read Model in Sync:**

```java
@Component
public class ProductProjection {

    private final ElasticsearchOperations elastic;

    @EventListener
    public void on(PriceUpdatedEvent event) {
        UpdateQuery update = UpdateQuery.builder(event.productId())
            .withScript("ctx._source.price = params.newPrice")
            .withParams(Map.of("newPrice", event.newPrice()))
            .build();
        elastic.update(update, IndexCoordinates.of("products"));
    }

    @EventListener
    public void on(ReviewPostedEvent event) {
        UpdateQuery update = UpdateQuery.builder(event.productId())
            .withScript("""
                ctx._source.reviewCount += 1;
                ctx._source.averageRating =
                    ((ctx._source.averageRating * (ctx._source.reviewCount - 1))
                     + params.rating) / ctx._source.reviewCount
                """)
            .withParams(Map.of("rating", event.rating()))
            .build();
        elastic.update(update, IndexCoordinates.of("products"));
    }

    @EventListener
    public void on(StockUpdatedEvent event) {
        UpdateQuery update = UpdateQuery.builder(event.productId())
            .withScript("ctx._source.stockCount = params.stock")
            .withParams(Map.of("stock", event.newStockCount()))
            .build();
        elastic.update(update, IndexCoordinates.of("products"));
    }
}
```

### Sync Strategies

| Strategy | Latency | Consistency | Complexity |
|----------|---------|-------------|------------|
| **Domain Events** | Milliseconds | Eventual | Medium — publish events from command handlers |
| **Change Data Capture** | Low seconds | Eventual | Low — Debezium reads DB WAL, no app changes |
| **Polling** | Seconds–minutes | Eventual | Low — query for recently modified records |
| **Dual Write** | Immediate | Risk of inconsistency | ⚠️ Avoid — partial failure leaves models out of sync |

:::warning Avoid Dual Writes
Never write to both the command and query stores in the same transaction. If the second write fails, the models diverge. Use events or CDC instead.
:::

### Pros

| Advantage | Detail |
|-----------|--------|
| **Independent scaling** | Scale read and write sides independently (reads typically 10–100x writes) |
| **Optimized models** | Each model is shaped for its purpose — fast writes AND fast reads |
| **Technology freedom** | Write to Postgres, read from Elasticsearch — best tool for each job |
| **Simplified queries** | No complex JOINs — read model is pre-aggregated |
| **Works with Event Sourcing** | CQRS is the natural read layer for event-sourced systems |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Eventual consistency** | Read model may lag behind writes | Design UI for staleness (show "last updated" timestamps); use read-your-own-writes pattern |
| **Increased complexity** | Two models, sync mechanism, extra infrastructure | Only apply CQRS to domains with significant read/write asymmetry |
| **Sync failures** | Events may be lost, duplicated, or arrive out of order | Use at-least-once delivery + idempotent projections; implement dead-letter queues |
| **Operational overhead** | More databases and services to monitor | Use managed services; invest in observability (lag dashboards, alert on projection delay) |
| **Over-engineering risk** | Simple CRUD apps don't need CQRS | Use CQRS only when read and write patterns genuinely differ |

---

## 7. Saga Pattern

### The Problem

Microservices with database-per-service cannot use a single ACID transaction across services. The Saga pattern provides an alternative: a sequence of local transactions coordinated by events or an orchestrator, with compensating transactions to undo changes if any step fails.

### Choreography vs Orchestration

```
CHOREOGRAPHY — Services react to events (no central coordinator)

┌──────────┐  OrderCreated   ┌──────────┐  PaymentDone    ┌──────────┐
│  Order   │────────────────►│ Payment  │────────────────►│Inventory │
│ Service  │                 │ Service  │                 │ Service  │
└──────────┘                 └──────────┘                 └────┬─────┘
     ▲                                                         │
     │                       StockReserved                     │
     └─────────────────────────────────────────────────────────┘

Each service:
  1. Handles its local transaction
  2. Publishes an event
  3. Listens for events from other services
  4. Knows its own compensating transaction
```

```
ORCHESTRATION — Central coordinator drives the saga

                    ┌─────────────────────┐
                    │   Saga Orchestrator  │
                    │   (Order Saga)       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         1. Reserve       2. Charge        3. Ship
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │Inventory │    │ Payment  │    │ Shipping │
        │ Service  │    │ Service  │    │ Service  │
        └──────────┘    └──────────┘    └──────────┘

Orchestrator:
  - Defines the step sequence
  - Sends commands to each service
  - Receives responses
  - Triggers compensations on failure
```

### Implementation — Orchestration-Based Saga

```java
public class OrderSaga {

    private final OrderRepository orderRepo;
    private final InventoryClient inventoryClient;
    private final PaymentClient paymentClient;
    private final ShippingClient shippingClient;

    public OrderResult execute(CreateOrderCommand cmd) {
        Order order = Order.create(cmd);
        orderRepo.save(order);

        try {
            // Step 1: Reserve inventory
            ReservationResult reservation = inventoryClient.reserve(
                new ReserveStockCommand(order.getId(), order.getItems()));
            order.markInventoryReserved(reservation.reservationId());

            // Step 2: Process payment
            PaymentResult payment = paymentClient.charge(
                new ChargeCommand(order.getId(), order.getTotalAmount()));
            order.markPaymentProcessed(payment.transactionId());

            // Step 3: Arrange shipping
            ShipmentResult shipment = shippingClient.createShipment(
                new CreateShipmentCommand(order.getId(), order.getShippingAddress()));
            order.markShipped(shipment.trackingId());

            order.complete();
            orderRepo.save(order);
            return OrderResult.success(order);

        } catch (PaymentFailedException e) {
            // Compensate: release inventory (step 1 rollback)
            inventoryClient.releaseReservation(order.getReservationId());
            order.fail("Payment failed: " + e.getMessage());
            orderRepo.save(order);
            return OrderResult.failed(order, e.getMessage());

        } catch (ShippingFailedException e) {
            // Compensate: refund payment (step 2 rollback) + release inventory
            paymentClient.refund(order.getTransactionId());
            inventoryClient.releaseReservation(order.getReservationId());
            order.fail("Shipping failed: " + e.getMessage());
            orderRepo.save(order);
            return OrderResult.failed(order, e.getMessage());
        }
    }
}
```

### Implementation — Choreography-Based Saga with Kafka

```java
// Order Service — starts the saga
@Service
public class OrderService {

    @Transactional
    public Order createOrder(CreateOrderRequest req) {
        Order order = new Order(req);
        order.setStatus(OrderStatus.PENDING);
        orderRepo.save(order);

        // Publish event to trigger the saga
        kafkaTemplate.send("order-events",
            new OrderCreatedEvent(order.getId(), order.getItems(), order.getTotalAmount()));
        return order;
    }

    @KafkaListener(topics = "payment-events")
    public void onPaymentResult(PaymentResultEvent event) {
        if (event.isSuccess()) {
            Order order = orderRepo.findById(event.orderId()).orElseThrow();
            order.setStatus(OrderStatus.PAID);
            orderRepo.save(order);
            kafkaTemplate.send("order-events",
                new OrderPaidEvent(order.getId(), order.getShippingAddress()));
        }
    }

    // Compensation listener
    @KafkaListener(topics = "inventory-events")
    public void onInventoryFailed(StockReservationFailedEvent event) {
        Order order = orderRepo.findById(event.orderId()).orElseThrow();
        order.setStatus(OrderStatus.CANCELLED);
        order.setFailureReason("Insufficient stock for: " + event.productId());
        orderRepo.save(order);
    }
}
```

```java
// Payment Service — reacts to order events
@Service
public class PaymentEventHandler {

    @KafkaListener(topics = "inventory-events")
    public void onStockReserved(StockReservedEvent event) {
        try {
            PaymentResult result = paymentGateway.charge(
                event.orderId(), event.totalAmount());

            kafkaTemplate.send("payment-events",
                new PaymentSucceededEvent(event.orderId(), result.transactionId()));
        } catch (PaymentException e) {
            kafkaTemplate.send("payment-events",
                new PaymentFailedEvent(event.orderId(), e.getMessage()));

            // Trigger compensation: release reserved inventory
            kafkaTemplate.send("inventory-commands",
                new ReleaseStockCommand(event.orderId(), event.reservationId()));
        }
    }
}
```

### Choreography vs Orchestration Trade-offs

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| **Coupling** | Loose — services only know events | Tighter — orchestrator knows all steps |
| **Visibility** | Hard to see full flow (distributed logic) | Easy to see full flow (one place) |
| **Complexity** | Grows with number of services (event spaghetti) | Centralized logic, linear growth |
| **Single point of failure** | None (distributed) | Orchestrator is a SPOF |
| **Testing** | Hard — need to trace events across services | Easier — test orchestrator in isolation |
| **Best for** | Simple sagas (2–3 steps) | Complex workflows (4+ steps) |

### Pros

| Advantage | Detail |
|-----------|--------|
| **No distributed transactions** | Each service uses local ACID transactions |
| **Service autonomy** | Services remain independently deployable |
| **Resilience** | Compensating transactions handle partial failures gracefully |
| **Scalability** | No global locks — each step scales independently |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Complexity** | Compensating logic for every step | Use saga frameworks (Axon, Temporal); define compensation as part of step definition |
| **Eventual consistency** | Intermediate states are visible to users | Show order status progression in UI; use read-your-writes for the initiating client |
| **Debugging difficulty** | Failures span multiple services | Use correlation IDs; implement a saga log that tracks all steps |
| **Compensation may fail** | What if the refund fails after payment? | Retry compensations with exponential backoff; use dead-letter queues for manual resolution |
| **Cyclic dependencies** | Choreography events can create feedback loops | Careful event schema design; use orchestration for complex flows |

---

## 8. Strangler Fig Pattern

### The Problem

You have a large monolithic application that needs to be migrated to microservices. Rewriting everything at once ("big bang" migration) is risky, expensive, and usually fails.

```
The Risk of Big Bang:

Year 1: Start rewriting everything in parallel
Year 2: Still rewriting... legacy system keeps getting patches
Year 3: New system 70% done but missing edge cases from years of patches
Year 4: New system has different bugs. Users revolt. Project cancelled.
        $10M wasted.
```

### How It Works

Named after the strangler fig vine that gradually grows around a tree until it replaces it entirely. You incrementally route requests from the old system to new microservices, one feature at a time.

```
Phase 1: All traffic to monolith

┌──────────┐     ┌─────────────────────────────────────────────┐
│  Client  │────►│              MONOLITH                        │
└──────────┘     │  [Auth] [Orders] [Payments] [Inventory]     │
                 └─────────────────────────────────────────────┘


Phase 2: Extract one service, route via facade

┌──────────┐     ┌──────────────────────┐     ┌─────────────────────────────┐
│  Client  │────►│   Facade / Proxy     │────►│           MONOLITH          │
└──────────┘     │                      │     │  [Auth] [Orders] [Payments] │
                 │  /api/inventory/*    │     └─────────────────────────────┘
                 │     ↓                │
                 │  ┌────────────────┐  │
                 │  │ Inventory µsvc │  │
                 │  └────────────────┘  │
                 └──────────────────────┘


Phase 3: Extract more services

┌──────────┐     ┌────────────────────────────┐     ┌─────────────────┐
│  Client  │────►│       Facade / Proxy       │────►│    MONOLITH     │
└──────────┘     │                            │     │  [Auth]         │
                 │  /api/inventory/*  ──► µsvc│     └─────────────────┘
                 │  /api/orders/*     ──► µsvc│
                 │  /api/payments/*   ──► µsvc│
                 └────────────────────────────┘


Phase 4: Monolith fully replaced (decommissioned)

┌──────────┐     ┌──────────────────────────────────┐
│  Client  │────►│          API Gateway             │
└──────────┘     │                                  │
                 │  ┌──────┐ ┌───────┐ ┌─────────┐ │
                 │  │ Auth │ │Orders │ │Payments │ │
                 │  │ µsvc │ │ µsvc  │ │  µsvc   │ │
                 │  └──────┘ └───────┘ └─────────┘ │
                 │  ┌───────────┐                   │
                 │  │ Inventory │                   │
                 │  │   µsvc    │                   │
                 │  └───────────┘                   │
                 └──────────────────────────────────┘
```

### Implementation — Routing Facade with NGINX

```nginx
# Phase 2: Route inventory to new service, everything else to monolith
upstream monolith {
    server monolith.internal:8080;
}

upstream inventory_service {
    server inventory-svc.internal:8080;
}

server {
    listen 443 ssl;

    # New microservice handles inventory
    location /api/inventory/ {
        proxy_pass http://inventory_service;
        proxy_set_header X-Migration-Phase "strangler";
    }

    # Everything else still goes to the monolith
    location / {
        proxy_pass http://monolith;
    }
}
```

### Parallel Run — Verifying Correctness

Before fully cutting over, run both implementations in parallel and compare results:

```java
@Service
public class InventoryFacade {

    private final MonolithInventoryClient monolith;
    private final InventoryMicroservice microservice;
    private final ComparisonReporter reporter;

    @Value("${strangler.inventory.cutover-percentage:0}")
    private int cutoverPercentage;

    public InventoryResponse checkStock(String productId) {
        InventoryResponse monolithResult = monolith.checkStock(productId);

        if (shouldUseMicroservice()) {
            InventoryResponse microserviceResult = microservice.checkStock(productId);

            reporter.compare("checkStock", productId, monolithResult, microserviceResult);

            return microserviceResult; // gradually trust the new service
        }

        // Shadow call: call microservice but return monolith result
        CompletableFuture.runAsync(() -> {
            try {
                InventoryResponse shadow = microservice.checkStock(productId);
                reporter.compare("checkStock", productId, monolithResult, shadow);
            } catch (Exception e) {
                reporter.recordShadowFailure("checkStock", productId, e);
            }
        });

        return monolithResult;
    }

    private boolean shouldUseMicroservice() {
        return ThreadLocalRandom.current().nextInt(100) < cutoverPercentage;
    }
}
```

### Migration Sequence Strategy

| Priority | Extract First | Reason |
|:--------:|---------------|--------|
| 1 | Independently stateless features | Easiest to extract, lowest risk |
| 2 | High-change-velocity modules | Teams benefit most from independent deployability |
| 3 | Bounded contexts with clear data ownership | Clean data separation |
| 4 | Performance bottlenecks | Can be optimized independently after extraction |
| 5 | Tightly coupled core | Extract last when surrounding dependencies are resolved |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Low risk** | Migrate one feature at a time; easy to rollback a single service |
| **Continuous delivery** | Both monolith and new services can ship in parallel |
| **Incremental value** | Each extracted service delivers benefits immediately |
| **Team learning** | Teams learn microservices patterns gradually |
| **Verifiable correctness** | Shadow/parallel runs validate behavior before cutover |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Prolonged migration** | Two systems running in parallel for months/years | Set clear milestones and deadlines for each feature extraction |
| **Increased operational cost** | Running both monolith and microservices simultaneously | Factor in operational overhead; automate infrastructure with IaC |
| **Data synchronization** | New services and monolith may need shared access during transition | Use CDC or event-driven sync; implement anti-corruption layer |
| **Routing complexity** | Facade logic grows as more features are extracted | Use feature flags and configuration-driven routing |
| **Inconsistent developer experience** | Some code in monolith, some in microservices | Maintain clear documentation of what has been extracted and what remains |

---

## 9. Bulkhead Pattern

### The Problem

When services share thread pools, connection pools, or other resources, a single misbehaving dependency can exhaust shared resources and starve healthy operations.

```
Without Bulkheads:

┌──────────────── Order Service ────────────────┐
│                                                │
│    Shared Thread Pool (200 threads)            │
│    ┌──────────────────────────────────────┐    │
│    │ [T1] [T2] [T3] ... [T200]           │    │
│    │  ▼    ▼    ▼        ▼               │    │
│    │  All threads calling Payment Service │    │
│    │  (which is SLOW — 30s response)     │    │
│    └──────────────────────────────────────┘    │
│                                                │
│    Inventory calls? ❌ No threads available     │
│    Review calls?    ❌ No threads available     │
│    Health check?    ❌ No threads available     │
│    ALL BLOCKED because of ONE slow service     │
└────────────────────────────────────────────────┘
```

### How It Works

Isolate resources so that one failing component cannot exhaust resources needed by others. Named after watertight compartments in ships — if one compartment floods, the others stay dry.

```
With Bulkheads:

┌──────────────── Order Service ────────────────────────┐
│                                                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Payment Pool    │  │ Inventory    │  │ Reviews  │  │
│  │ (50 threads)    │  │ Pool         │  │ Pool     │  │
│  │                 │  │ (30 threads) │  │(20 thrds)│  │
│  │ [T1]...[T50]   │  │ [T1]...[T30] │  │[T1].[T20]│  │
│  │  All BLOCKED    │  │ ✅ Working   │  │✅ Working│  │
│  │  (Payment slow) │  │  fine!       │  │ fine!    │  │
│  └─────────────────┘  └──────────────┘  └──────────┘  │
│                                                        │
│  Payment pool exhausted → only Payment calls affected  │
│  Inventory & Reviews continue operating normally       │
└────────────────────────────────────────────────────────┘
```

### Implementation with Resilience4j

```java
@Configuration
public class BulkheadConfig {

    @Bean
    public ThreadPoolBulkhead paymentBulkhead() {
        return ThreadPoolBulkhead.of("paymentService",
            ThreadPoolBulkheadConfig.custom()
                .maxThreadPoolSize(50)
                .coreThreadPoolSize(25)
                .queueCapacity(100)
                .keepAliveDuration(Duration.ofMillis(100))
                .writableStackTraceEnabled(true)
                .build());
    }

    @Bean
    public ThreadPoolBulkhead inventoryBulkhead() {
        return ThreadPoolBulkhead.of("inventoryService",
            ThreadPoolBulkheadConfig.custom()
                .maxThreadPoolSize(30)
                .coreThreadPoolSize(15)
                .queueCapacity(50)
                .build());
    }

    // Semaphore-based bulkhead: limits concurrent calls without thread pool isolation
    @Bean
    public Bulkhead reviewsBulkhead() {
        return Bulkhead.of("reviewsService",
            BulkheadConfig.custom()
                .maxConcurrentCalls(20)
                .maxWaitDuration(Duration.ofMillis(500))
                .build());
    }
}
```

```java
@Service
public class OrderService {

    private final ThreadPoolBulkhead paymentBulkhead;
    private final Bulkhead reviewsBulkhead;

    public CompletableFuture<PaymentResult> processPayment(PaymentRequest req) {
        return paymentBulkhead.executeSupplier(
            () -> paymentClient.charge(req));
    }

    public List<Review> getReviews(String productId) {
        return Bulkhead.decorateSupplier(reviewsBulkhead,
            () -> reviewClient.getReviews(productId)).get();
    }
}
```

### Bulkhead Types

| Type | Mechanism | Isolation | Overhead | Best For |
|------|-----------|-----------|----------|----------|
| **Thread Pool** | Separate thread pool per dependency | Full (separate threads) | Higher (context switching) | Critical dependencies with unpredictable latency |
| **Semaphore** | Counter limiting concurrent calls | Partial (shared threads) | Lower | Rate limiting without full thread isolation |
| **Connection Pool** | Separate HTTP connection pool per service | Full (separate connections) | Medium | Multiple HTTP downstream services |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Failure isolation** | One slow dependency can't exhaust shared resources |
| **Predictable performance** | Each dependency has guaranteed resource allocation |
| **Graceful degradation** | System continues serving healthy features even during partial failure |
| **Easier capacity planning** | Resource usage per dependency is bounded and measurable |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Resource waste** | Idle bulkhead pools waste threads/memory | Use elastic pool sizing (coreSize < maxSize); right-size based on traffic |
| **Complexity** | More configuration, more pools to monitor | Centralize configuration; use defaults with per-service overrides |
| **Sizing difficulty** | Too small = unnecessary rejection; too large = no protection | Start with conservative limits; tune based on p99 latency and throughput metrics |
| **Not a silver bullet** | Doesn't fix the slow dependency itself | Combine with Circuit Breaker (stop calling entirely) and Retry (for transient failures) |

---

## 10. Sidecar Pattern

### The Problem

Every microservice needs cross-cutting capabilities: logging, metrics, distributed tracing, mTLS, configuration management, health checking. Implementing these in every service leads to duplication, inconsistency, and maintenance burden — especially in polyglot environments.

```
Without Sidecar — duplicated cross-cutting in every service:

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│  Order Service     │  │  Payment Service   │  │  Inventory Service │
│  (Java)            │  │  (Go)              │  │  (Python)          │
│                    │  │                    │  │                    │
│  ├─ Business Logic │  │  ├─ Business Logic │  │  ├─ Business Logic │
│  ├─ Logging lib    │  │  ├─ Logging lib    │  │  ├─ Logging lib    │
│  ├─ Metrics lib    │  │  ├─ Metrics lib    │  │  ├─ Metrics lib    │
│  ├─ Tracing lib    │  │  ├─ Tracing lib    │  │  ├─ Tracing lib    │
│  ├─ mTLS config    │  │  ├─ mTLS config    │  │  ├─ mTLS config    │
│  └─ Config reload  │  │  └─ Config reload  │  │  └─ Config reload  │
└────────────────────┘  └────────────────────┘  └────────────────────┘

Problem: 3 different implementations of the same concerns
         Different languages, different bugs, different update cycles
```

### How It Works

Deploy a companion process (the sidecar) alongside each service instance. The sidecar handles infrastructure concerns while the main service focuses on business logic.

```
With Sidecar — consistent infra layer:

┌─── Pod ──────────────────────────────┐
│                                       │
│  ┌──────────────────┐  ┌──────────┐  │
│  │  Order Service   │  │ Sidecar  │  │
│  │  (Java)          │  │ (Envoy)  │  │
│  │                  │  │          │  │
│  │  Business Logic  │◄►│ mTLS     │  │
│  │  ONLY            │  │ Logging  │  │
│  │                  │  │ Metrics  │  │
│  └──────────────────┘  │ Tracing  │  │
│                         │ Config   │  │
│   localhost:8080        │ Retry    │  │
│   (app traffic goes     │ CircuitB │  │
│    through sidecar)     └──────────┘  │
│                                       │
└───────────────────────────────────────┘

Same sidecar binary deployed with EVERY service
regardless of language or framework
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        # Main application container
        - name: order-service
          image: mycompany/order-service:2.1.0
          ports:
            - containerPort: 8080
          env:
            - name: SERVICE_NAME
              value: "order-service"
          resources:
            requests: { cpu: "500m", memory: "512Mi" }
            limits:   { cpu: "1000m", memory: "1Gi" }

        # Sidecar: Envoy proxy for traffic management
        - name: envoy-proxy
          image: envoyproxy/envoy:v1.28.0
          ports:
            - containerPort: 9901  # admin
            - containerPort: 15001 # outbound
          volumeMounts:
            - name: envoy-config
              mountPath: /etc/envoy

        # Sidecar: Log collector
        - name: fluentbit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: app-logs
              mountPath: /var/log/app
              readOnly: true

      volumes:
        - name: envoy-config
          configMap:
            name: envoy-order-service
        - name: app-logs
          emptyDir: {}
```

### Service Mesh — Sidecar at Scale

When every service has an Envoy sidecar, you have a **service mesh**:

```
┌─────────────────────────────────────────────────────────┐
│                     CONTROL PLANE                        │
│              (Istio / Linkerd / Consul)                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Config  │  │  Certificate │  │  Traffic Policy  │  │
│  │  Server  │  │  Authority   │  │  Engine          │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ Push config
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ ┌────┐┌──┐ │ │ ┌────┐┌──┐ │ │ ┌────┐┌──┐ │
    │ │App ││EP│ │ │ │App ││EP│ │ │ │App ││EP│ │
    │ │    ││  │◄┼─┼►│    ││  │◄┼─┼►│    ││  │ │
    │ └────┘│  │ │ │ └────┘│  │ │ │ └────┘│  │ │
    │       └──┘ │ │       └──┘ │ │       └──┘ │
    │  Pod A     │ │  Pod B     │ │  Pod C     │
    └────────────┘ └────────────┘ └────────────┘

    EP = Envoy Proxy (sidecar)
    All inter-service traffic flows through sidecars
    mTLS, retries, circuit breaking, observability — all automatic
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Language-agnostic** | Same infrastructure capabilities for Java, Go, Python, Node.js |
| **Separation of concerns** | Application developers focus on business logic |
| **Consistent behavior** | All services get the same logging, tracing, security |
| **Independent updates** | Upgrade the sidecar without touching application code |
| **Zero-code instrumentation** | Distributed tracing and metrics without code changes |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Resource overhead** | Each sidecar consumes CPU and memory | Right-size sidecar resources; use lightweight proxies (Envoy uses ~50MB) |
| **Added latency** | Extra network hop per request (typically &lt;1ms) | Co-locate on localhost; acceptable for most workloads |
| **Operational complexity** | More containers to deploy, monitor, and debug | Use service mesh control plane for centralized management |
| **Debugging difficulty** | Requests flow through proxy, making traces harder to follow | Leverage built-in observability (Envoy admin interface, access logs) |
| **Configuration drift** | Sidecar configs may diverge across services | Use control plane to push consistent config; version sidecar images |

---

## 11. Retry Pattern

### The Problem

In distributed systems, transient failures are inevitable: network blips, temporary overload, DNS resolution hiccups, container restarts. A single failed call doesn't mean the service is down — it might succeed on the next attempt.

```
Transient Failure Types:

┌────────────────────────────────────────────────────────────────┐
│  Transient (RETRY)              │  Permanent (DON'T RETRY)     │
├────────────────────────────────────────────────────────────────┤
│  • Connection timeout            │  • 400 Bad Request           │
│  • 503 Service Unavailable       │  • 401 Unauthorized          │
│  • 429 Too Many Requests         │  • 404 Not Found             │
│  • TCP connection reset          │  • 422 Validation Error      │
│  • DNS resolution timeout        │  • Business logic rejection  │
│  • Read timeout (temporary load) │  • Schema mismatch           │
└────────────────────────────────────────────────────────────────┘
```

### Retry Strategies

```
Strategy 1: FIXED INTERVAL
────────────────────────────────────────────────────
Call ─ FAIL ─ [2s] ─ Retry ─ FAIL ─ [2s] ─ Retry ─ SUCCESS
                                    
Simple but causes synchronized retry storms.


Strategy 2: EXPONENTIAL BACKOFF
────────────────────────────────────────────────────
Call ─ FAIL ─ [1s] ─ Retry ─ FAIL ─ [2s] ─ Retry ─ FAIL ─ [4s] ─ Retry ─ SUCCESS

Progressively longer waits. Better but still synchronized.


Strategy 3: EXPONENTIAL BACKOFF + JITTER  ← RECOMMENDED
────────────────────────────────────────────────────
Call ─ FAIL ─ [0.8s] ─ Retry ─ FAIL ─ [2.3s] ─ Retry ─ FAIL ─ [3.7s] ─ Retry ─ SUCCESS

Randomized delays spread retries across time,
preventing the "thundering herd" problem.
```

### Implementation

```java
@Configuration
public class RetryConfig {

    @Bean
    public Retry paymentRetry() {
        return Retry.of("paymentService",
            io.github.resilience4j.retry.RetryConfig.custom()
                .maxAttempts(3)
                .waitDuration(Duration.ofMillis(500))
                .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
                    Duration.ofMillis(500),  // initial interval
                    2.0,                     // multiplier
                    Duration.ofSeconds(30)   // max interval
                ))
                .retryOnResult(response ->
                    response instanceof PaymentResult r && r.isRetryable())
                .retryExceptions(IOException.class, TimeoutException.class)
                .ignoreExceptions(BusinessValidationException.class)
                .failAfterMaxAttempts(true)
                .build());
    }
}
```

```java
@Service
public class PaymentService {

    private final PaymentClient client;
    private final Retry retry;

    public PaymentResult chargeWithRetry(PaymentRequest request) {
        Supplier<PaymentResult> retryableCall = Retry.decorateSupplier(
            retry, () -> client.charge(request));

        return Try.ofSupplier(retryableCall)
            .recover(MaxRetriesExceededException.class,
                e -> PaymentResult.queued("Max retries exceeded, queued for later"))
            .get();
    }
}
```

### Idempotency — The Critical Prerequisite

Retrying a non-idempotent operation (like charging a credit card) can cause double-processing. Every retryable operation **must** be idempotent.

```java
@RestController
public class PaymentController {

    @PostMapping("/payments")
    public PaymentResult charge(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody PaymentRequest request) {

        // Check if this request was already processed
        Optional<PaymentResult> existing = paymentRepo.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get(); // return cached result, don't charge again
        }

        PaymentResult result = paymentGateway.charge(request);

        // Store result keyed by idempotency key
        paymentRepo.saveWithIdempotencyKey(idempotencyKey, result);
        return result;
    }
}
```

### Retry Budget — Preventing Retry Storms

If all clients retry simultaneously, the downstream service gets 3x the load, making recovery harder:

```java
@Component
public class RetryBudget {

    private final AtomicInteger totalRequests = new AtomicInteger(0);
    private final AtomicInteger retryRequests = new AtomicInteger(0);
    private static final double MAX_RETRY_RATIO = 0.2; // max 20% retries

    public boolean canRetry() {
        double retryRatio = (double) retryRequests.get() / totalRequests.get();
        return retryRatio < MAX_RETRY_RATIO;
    }

    public void recordRequest(boolean isRetry) {
        totalRequests.incrementAndGet();
        if (isRetry) retryRequests.incrementAndGet();
    }

    @Scheduled(fixedRate = 60000)
    public void resetCounters() {
        totalRequests.set(0);
        retryRequests.set(0);
    }
}
```

### Retry + Circuit Breaker Integration

```
┌──────────────────────────────────────────────────────────────┐
│  RETRY + CIRCUIT BREAKER (defense in depth)                  │
│                                                              │
│  Request → [Retry Layer] → [Circuit Breaker] → Service       │
│                                                              │
│  1. Retry handles TRANSIENT failures (try again)             │
│  2. Circuit Breaker handles PERSISTENT failures (stop trying)│
│                                                              │
│  Scenario: Service down for 5 minutes                        │
│  ──────────────────────────────────────────                   │
│  Attempt 1: Retry 3 times → all fail                         │
│  Attempt 2: Retry 3 times → all fail                         │
│  ...                                                         │
│  Circuit Breaker OPENS: failure rate > 50%                   │
│  Attempt N: Circuit breaker rejects immediately (no retry)   │
│  After 60s: Half-open → 1 trial → if success → close circuit│
└──────────────────────────────────────────────────────────────┘
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Handles transient failures** | Most network issues resolve within seconds |
| **Transparent to callers** | Retry logic is encapsulated; callers don't know about transient failures |
| **Improves perceived reliability** | Users see fewer errors in healthy systems |
| **Simple to implement** | Libraries like Resilience4j, Polly, Tenacity provide ready-made retry logic |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Retry storms** | All clients retry simultaneously, amplifying load 3x | Use jitter, retry budgets, and circuit breakers |
| **Increased latency** | Failed requests take longer (original timeout + retry delays) | Set aggressive timeouts per attempt; cap total retry duration |
| **Non-idempotent danger** | Retrying a mutation can cause duplicate side effects | Always use idempotency keys for non-idempotent operations |
| **Masking real issues** | Retries may hide a fundamentally broken dependency | Log every retry; alert on sustained retry rates; combine with circuit breaker |
| **Resource consumption** | Retrying consumes threads and connections | Use async retries; limit concurrent retry threads |

:::tip Golden Rule
Retry handles transient failures. Circuit Breaker handles persistent failures. Bulkhead prevents resource exhaustion. Use all three together for production resilience.
:::

---

## 12. API Composition Pattern

### The Problem

With Database per Service, you can't JOIN across services. But many user-facing queries need data from multiple services: "Show me order details with customer name, payment status, and shipping tracking."

```
The Query Problem:

Traditional monolith:
  SELECT o.*, c.name, p.status, s.tracking_number
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN payments p ON p.order_id = o.id
  JOIN shipments s ON s.order_id = o.id
  WHERE o.id = 12345;

Microservices:
  orders → Order Service DB
  customers → Customer Service DB
  payments → Payment Service DB
  shipments → Shipping Service DB

  No cross-service JOINs. Now what?
```

### How It Works

An API Composer (either a dedicated service or the API Gateway) queries multiple services and aggregates the results into a single response.

```
┌──────────┐       ┌────────────────────────┐
│  Client  │──────►│   API Composer         │
└──────────┘       │                        │
                   │  1. Call Order Service  │──► Order Service ──► OrderDB
                   │  2. Call Customer Svc   │──► Customer Svc ──► CustomerDB
                   │  3. Call Payment Svc    │──► Payment Svc  ──► PaymentDB
                   │  4. Call Shipping Svc   │──► Shipping Svc ──► ShippingDB
                   │                        │
                   │  5. Aggregate results   │
                   │  6. Return unified DTO  │
                   └────────────────────────┘
```

### Implementation

```java
@RestController
@RequestMapping("/api/v1/order-details")
public class OrderDetailComposer {

    private final OrderServiceClient orderClient;
    private final CustomerServiceClient customerClient;
    private final PaymentServiceClient paymentClient;
    private final ShippingServiceClient shippingClient;

    @GetMapping("/{orderId}")
    public OrderDetailDTO getOrderDetail(@PathVariable String orderId) {

        // Fan out: call all services in parallel
        CompletableFuture<OrderDTO> orderFuture =
            CompletableFuture.supplyAsync(() -> orderClient.getOrder(orderId));

        CompletableFuture<PaymentDTO> paymentFuture =
            CompletableFuture.supplyAsync(() -> paymentClient.getPaymentByOrder(orderId));

        CompletableFuture<ShippingDTO> shippingFuture =
            CompletableFuture.supplyAsync(() -> shippingClient.getShipmentByOrder(orderId));

        // Customer lookup depends on Order (need customer ID)
        CompletableFuture<CustomerDTO> customerFuture =
            orderFuture.thenCompose(order ->
                CompletableFuture.supplyAsync(
                    () -> customerClient.getCustomer(order.getCustomerId())));

        // Fan in: combine all results
        try {
            return CompletableFuture.allOf(orderFuture, paymentFuture,
                                           shippingFuture, customerFuture)
                .thenApply(v -> OrderDetailDTO.builder()
                    .order(orderFuture.join())
                    .customer(customerFuture.join())
                    .payment(paymentFuture.join())
                    .shipping(shippingFuture.join())
                    .build())
                .get(5, TimeUnit.SECONDS); // overall timeout
        } catch (TimeoutException e) {
            throw new CompositionTimeoutException(
                "Order detail composition timed out for order: " + orderId);
        }
    }
}
```

### Handling Partial Failures

What happens if one service is down? Return what you can — graceful degradation:

```java
@GetMapping("/{orderId}")
public OrderDetailDTO getOrderDetailResilient(@PathVariable String orderId) {

    OrderDTO order = orderClient.getOrder(orderId); // mandatory

    // Optional enrichments — use fallbacks on failure
    CustomerDTO customer = tryOrDefault(
        () -> customerClient.getCustomer(order.getCustomerId()),
        CustomerDTO.unknown(order.getCustomerId()));

    PaymentDTO payment = tryOrDefault(
        () -> paymentClient.getPaymentByOrder(orderId),
        PaymentDTO.unavailable());

    ShippingDTO shipping = tryOrDefault(
        () -> shippingClient.getShipmentByOrder(orderId),
        ShippingDTO.unavailable());

    return OrderDetailDTO.builder()
        .order(order)
        .customer(customer)
        .payment(payment)
        .shipping(shipping)
        .dataCompleteness(calculateCompleteness(customer, payment, shipping))
        .build();
}

private <T> T tryOrDefault(Supplier<T> supplier, T defaultValue) {
    try {
        return supplier.get();
    } catch (Exception e) {
        log.warn("Enrichment failed, using fallback: {}", e.getMessage());
        return defaultValue;
    }
}
```

### API Composition vs CQRS

| Aspect | API Composition | CQRS |
|--------|----------------|------|
| **Data freshness** | Always current (real-time calls) | May lag (eventually consistent) |
| **Latency** | Higher (multiple service calls per request) | Lower (single read from prebuilt model) |
| **Complexity** | Lower (no sync infrastructure) | Higher (projections, event handling) |
| **Infrastructure** | No additional stores | Separate read database needed |
| **Best for** | Low-frequency queries, small fan-out | High-frequency queries, large fan-out |
| **Consistency** | Strong (reads current state) | Eventual |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Simple to implement** | Standard HTTP calls aggregated in one place |
| **Always fresh data** | Reads directly from source services |
| **No extra infrastructure** | No need for separate read databases or sync mechanisms |
| **Flexible** | Easy to add/remove data sources |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Latency** | Response time = slowest service | Parallelize independent calls; set per-service timeouts |
| **Availability** | One service down can fail the whole composition | Use graceful degradation with partial responses |
| **No complex queries** | Can't do server-side sorting/filtering across services | Use CQRS for complex query scenarios |
| **Data volume** | Fetching full entities when only a few fields are needed | Use field selection (GraphQL) or dedicated slim endpoints |
| **Fan-out limits** | Composing from 10+ services becomes unwieldy | Limit fan-out to 3–5 services; use CQRS for broader aggregation |

---

## 13. Distributed Lock Pattern

### The Problem

In a distributed system with multiple instances, certain operations must be performed by exactly one instance at a time: leader election, scheduled job execution, resource reservation, counter increment, or preventing duplicate processing.

```
The Race Condition:

Instance A:  READ balance ($100) ─── WRITE balance ($90)
                                          ↑ thinks balance is $100
Instance B:  READ balance ($100) ────────── WRITE balance ($80)
                                               ↑ also thinks balance is $100

Expected: $100 - $10 - $20 = $70
Actual: $80 (Instance A's write was lost — last writer wins)
```

### How It Works

A distributed lock ensures mutual exclusion across processes running on different machines. All instances agree on a shared lock manager, and only the instance holding the lock can proceed.

```
┌────────────────────────────────────────────────────────────┐
│                   DISTRIBUTED LOCK                          │
│                                                            │
│   Instance A        Lock Store         Instance B          │
│   ┌────────┐       ┌──────────┐       ┌────────┐          │
│   │        │─LOCK─►│          │◄─LOCK─│        │          │
│   │        │       │  Redis   │       │        │          │
│   │        │◄─OK───│  /ZK     │──WAIT─►        │          │
│   │        │       │  /etcd   │       │        │          │
│   │ (works)│       │          │       │(blocked)│          │
│   │        │       │          │       │        │          │
│   │        │─FREE─►│          │       │        │          │
│   │        │       │          │──OK──►│        │          │
│   └────────┘       └──────────┘       │ (works)│          │
│                                       └────────┘          │
└────────────────────────────────────────────────────────────┘
```

### Implementation 1: Redis (Redlock)

```java
@Component
public class RedisDistributedLock {

    private final StringRedisTemplate redis;

    /**
     * Acquire a lock with automatic expiry to prevent deadlocks.
     * Uses SET NX EX (atomic set-if-not-exists with expiry).
     */
    public Optional<LockHandle> tryAcquire(String lockKey, Duration ttl) {
        String lockValue = UUID.randomUUID().toString();

        Boolean acquired = redis.opsForValue()
            .setIfAbsent(lockKey, lockValue, ttl);

        if (Boolean.TRUE.equals(acquired)) {
            return Optional.of(new LockHandle(lockKey, lockValue, ttl));
        }
        return Optional.empty();
    }

    /**
     * Release lock ONLY if we still own it.
     * Uses Lua script for atomic check-and-delete.
     */
    public boolean release(LockHandle handle) {
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;

        Long result = redis.execute(
            RedisScript.of(script, Long.class),
            List.of(handle.key()),
            handle.value());

        return result != null && result == 1;
    }

    public record LockHandle(String key, String value, Duration ttl) {}
}
```

### Implementation 2: ZooKeeper (Curator)

```java
@Component
public class ZookeeperDistributedLock {

    private final CuratorFramework curator;

    public <T> T executeWithLock(String lockPath, Duration timeout,
                                  Callable<T> task) throws Exception {
        InterProcessMutex lock = new InterProcessMutex(curator, lockPath);

        if (!lock.acquire(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
            throw new LockAcquisitionException(
                "Failed to acquire lock: " + lockPath + " within " + timeout);
        }

        try {
            return task.call();
        } finally {
            lock.release();
        }
    }
}

// Usage
zookeeperLock.executeWithLock("/locks/scheduled-report", Duration.ofSeconds(30), () -> {
    generateDailyReport();
    return null;
});
```

### Implementation 3: Database Advisory Lock

```java
@Component
public class PostgresDistributedLock {

    private final JdbcTemplate jdbc;

    public boolean tryAcquire(long lockId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "SELECT pg_try_advisory_lock(?)", Boolean.class, lockId));
    }

    public void release(long lockId) {
        jdbc.execute("SELECT pg_advisory_unlock(" + lockId + ")");
    }

    // Named lock using hash
    public boolean tryAcquire(String lockName) {
        long lockId = lockName.hashCode() & 0x7fffffffL;
        return tryAcquire(lockId);
    }
}
```

### Fencing Tokens — Solving the Expired Lock Problem

A lock's TTL can expire while the holder is still working (GC pause, network delay). This creates a dangerous window where two processes believe they hold the lock:

```
The Expired Lock Problem:

Instance A:  ACQUIRE lock (TTL=10s)
             Start processing...
             GC PAUSE (15 seconds)    ← lock expired during pause!
                                      
Instance B:                           ACQUIRE lock (TTL=10s) ← succeeds!
                                      Start processing...

Instance A:  ...GC pause ends
             WRITES result ← STALE LOCK! Corrupts B's work
```

**Fencing tokens** solve this by assigning a monotonically increasing token to each lock acquisition. The downstream resource rejects operations with stale tokens:

```java
@Component
public class FencedLock {

    private final StringRedisTemplate redis;

    public Optional<FencedLockHandle> tryAcquire(String lockKey, Duration ttl) {
        // Atomically increment fencing token and acquire lock
        String script = """
            if redis.call('set', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then
                local token = redis.call('incr', KEYS[1] .. ':token')
                return token
            else
                return nil
            end
            """;

        Long fencingToken = redis.execute(
            RedisScript.of(script, Long.class),
            List.of(lockKey),
            UUID.randomUUID().toString(),
            String.valueOf(ttl.toMillis()));

        if (fencingToken != null) {
            return Optional.of(new FencedLockHandle(lockKey, fencingToken));
        }
        return Optional.empty();
    }

    public record FencedLockHandle(String key, long fencingToken) {}
}

// Resource validates fencing token before accepting writes
@Service
public class AccountService {

    public void updateBalance(long fencingToken, String accountId, BigDecimal amount) {
        int updated = jdbc.update("""
            UPDATE accounts
            SET balance = balance + ?, last_fencing_token = ?
            WHERE id = ? AND last_fencing_token < ?
            """, amount, fencingToken, accountId, fencingToken);

        if (updated == 0) {
            throw new StaleLockException(
                "Fencing token %d is stale for account %s".formatted(fencingToken, accountId));
        }
    }
}
```

### Lock Technology Comparison

| Technology | Consistency | Performance | Fault Tolerance | Complexity |
|-----------|-------------|-------------|-----------------|------------|
| **Redis (single)** | Weak (no replication guarantee) | Very fast (&lt;1ms) | Low (SPOF) | Low |
| **Redis (Redlock)** | Moderate (N/2+1 quorum) | Fast (~5ms) | Medium (survives minority failure) | Medium |
| **ZooKeeper** | Strong (ZAB consensus) | Moderate (~10ms) | High (survives minority failure) | High |
| **etcd** | Strong (Raft consensus) | Moderate (~10ms) | High (survives minority failure) | Medium |
| **Database (advisory)** | Strong (DB guarantees) | Moderate (~5ms) | Medium (DB availability) | Low |
| **DynamoDB** | Strong (conditional writes) | Moderate (~10ms) | High (managed) | Low |

### Pros

| Advantage | Detail |
|-----------|--------|
| **Mutual exclusion** | Guarantees only one process operates on a resource at a time |
| **Prevents data corruption** | Eliminates race conditions in distributed environments |
| **Flexible implementations** | Multiple technology options for different consistency needs |
| **Enables coordination** | Leader election, scheduled tasks, resource allocation |

### Cons and Mitigations

| Disadvantage | Impact | Mitigation |
|--------------|--------|------------|
| **Performance bottleneck** | Lock contention serializes operations | Minimize lock scope; use fine-grained locks (per-resource, not global) |
| **Deadlock risk** | Two processes waiting for each other's locks | Always acquire locks in consistent order; use TTL to auto-expire stale locks |
| **Lock manager SPOF** | If lock store goes down, no locks can be acquired or released | Use HA lock stores (ZooKeeper cluster, Redis Sentinel/Cluster) |
| **Expired lock problem** | GC pauses or network delays can cause lock to expire while held | Use fencing tokens; keep TTL >> expected operation time; implement lock extension |
| **Clock skew** | Redlock depends on synchronized clocks across nodes | Use NTP; prefer ZooKeeper/etcd for strong consistency needs |
| **Complexity** | Distributed locking is inherently hard to get right | Use battle-tested libraries (Redisson, Curator); avoid rolling your own |

:::warning Avoid If Possible
Distributed locks introduce contention and complexity. Before reaching for a lock, consider alternatives:
- **Idempotent operations** — safe to execute multiple times
- **Optimistic concurrency** — CAS (Compare-And-Swap) with version numbers
- **Partitioning** — assign ownership so only one instance handles each partition
- **Queue-based serialization** — route conflicting operations through a single queue

Use distributed locks only when these alternatives are insufficient.
:::

---

## 🏗️ Patterns in Combination

Real-world architectures combine multiple patterns. Here's how they work together in a typical e-commerce platform:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    E-COMMERCE PLATFORM                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    API GATEWAY (1)                            │    │
│  │  Auth │ Rate Limit │ Route │ Load Balance │ Circuit Break    │    │
│  └──────┬───────────────┬──────────────────┬────────────────────┘    │
│         │               │                  │                         │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌────────▼───────┐                │
│  │Order Service│ │Product Svc  │ │ Payment Svc    │                │
│  │             │ │             │ │                │                │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌────────────┐│                │
│  │ │ Sidecar │ │ │ │ Sidecar │ │ │ │  Sidecar   ││  (10)         │
│  │ │(Envoy)  │ │ │ │(Envoy)  │ │ │ │ (Envoy)    ││                │
│  │ └─────────┘ │ │ └─────────┘ │ │ └────────────┘│                │
│  └──────┬──────┘ └──────┬──────┘ └────────┬───────┘                │
│         │               │                  │                         │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌────────▼───────┐                │
│  │ Postgres   │ │ MongoDB    │ │ Postgres       │   (2)           │
│  │ (Orders)   │ │ (Products) │ │ (Payments)     │                │
│  └─────────────┘ └─────────────┘ └────────────────┘                │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────┐           │
│  │              Kafka Event Bus                         │           │
│  │  ┌───────┐  ┌────────┐  ┌─────────┐  ┌──────────┐  │           │
│  │  │Retry  │  │Circuit │  │  Saga   │  │  Event   │  │           │
│  │  │(11)   │  │Break(3)│  │  (7)    │  │Sourcing  │  │  (5)     │
│  │  └───────┘  └────────┘  └─────────┘  │  (5)     │  │           │
│  │                                       └──────────┘  │           │
│  └──────────────────────────────────────────────────────┘           │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────┐           │
│  │              CQRS Read Models (6)                    │           │
│  │  Elasticsearch (Product Search)                      │           │
│  │  Redis (Session / Cache)                             │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                      │
│  Service Discovery (4): Kubernetes DNS + Service resources           │
│  Bulkhead (9): Thread pool isolation per downstream dependency       │
│  Distributed Lock (13): Redis lock for inventory reservation         │
│  API Composition (12): Order detail aggregates from 4 services       │
│  Strangler Fig (8): Legacy billing system being gradually replaced   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Pattern Selection Guide

| Scenario | Primary Pattern | Supporting Patterns |
|----------|----------------|-------------------|
| Client needs unified API | API Gateway | Service Discovery, Rate Limiting |
| Service needs its own data store | Database per Service | CQRS, API Composition, Saga |
| Downstream service unreliable | Circuit Breaker | Retry, Bulkhead, Fallback |
| Services scale dynamically | Service Discovery | Sidecar, API Gateway |
| Need full audit trail | Event Sourcing | CQRS (for queries) |
| Read/write patterns differ dramatically | CQRS | Event Sourcing, Database per Service |
| Multi-service transaction | Saga | Event Sourcing, Retry |
| Migrating from monolith | Strangler Fig | API Gateway, Database per Service |
| Isolate failure blast radius | Bulkhead | Circuit Breaker, Retry |
| Cross-cutting concerns in polyglot env | Sidecar | Service Mesh, API Gateway |
| Transient network failures | Retry | Circuit Breaker, Idempotency |
| Query spans multiple services | API Composition | CQRS (if high frequency) |
| Only one instance should run a task | Distributed Lock | Fencing Tokens |

---

## 📊 Quick Reference

| Pattern | Solves | Adds Complexity In |
|---------|--------|--------------------|
| API Gateway | Client coupling, cross-cutting duplication | Single point of failure, latency |
| Database per Service | Data coupling, schema conflicts | Distributed transactions, cross-service queries |
| Circuit Breaker | Cascading failures | Configuration tuning, fallback logic |
| Service Discovery | Hard-coded service locations | Registry HA, stale entries |
| Event Sourcing | Lost history, no audit trail | Replay performance, schema evolution |
| CQRS | Read/write optimization conflict | Eventual consistency, infrastructure overhead |
| Saga | Distributed transactions | Compensating logic, debugging |
| Strangler Fig | Risky big-bang migration | Dual-system operation, routing complexity |
| Bulkhead | Resource exhaustion from single failure | Resource waste, sizing |
| Sidecar | Cross-cutting duplication in polyglot | Resource overhead, operational complexity |
| Retry | Transient failures | Retry storms, non-idempotent danger |
| API Composition | Cross-service queries | Latency, partial failures |
| Distributed Lock | Race conditions, duplicate processing | Contention, deadlocks, clock skew |
