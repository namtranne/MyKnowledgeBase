---
sidebar_position: 8
title: "07 — Spring Microservices & Cloud"
slug: 07-spring-microservices
---

# ☁️ Spring Microservices & Cloud

Spring Cloud builds on Spring Boot to provide tools for common distributed system patterns: service discovery, centralized configuration, circuit breakers, API gateways, and distributed tracing.

---

## 1. Microservice Architecture with Spring Cloud

### Component Overview

```
                        ┌─────────────┐
                        │  Config      │  Centralized config
                        │  Server      │  (Spring Cloud Config)
                        └──────┬──────┘
                               │
┌──────────┐          ┌────────▼───────┐          ┌──────────────┐
│  Client   │────────►│  API Gateway   │────────►│  Service A    │
│           │         │  (Spring Cloud │         │  (Spring Boot)│
│           │         │   Gateway)     │         └───────┬───────┘
└──────────┘          └────────┬───────┘                 │
                               │                  ┌──────▼───────┐
                               │                  │  Service B    │
                               │                  │  (Spring Boot)│
                               │                  └──────┬───────┘
                        ┌──────▼──────┐                  │
                        │  Service     │◄─── registers ──┘
                        │  Registry    │
                        │  (Eureka)    │
                        └─────────────┘
```

### Spring Cloud Components

| Component | Purpose | Implementation |
|-----------|---------|---------------|
| Service Discovery | Register and locate services | Eureka, Consul, Kubernetes |
| Config Server | Centralized externalized configuration | Spring Cloud Config |
| API Gateway | Single entry point, routing, filtering | Spring Cloud Gateway |
| Circuit Breaker | Fault tolerance, fallback | Resilience4j |
| Load Balancer | Client-side load balancing | Spring Cloud LoadBalancer |
| Distributed Tracing | Request tracing across services | Micrometer Tracing + Zipkin |
| Message Bus | Event-driven communication | Spring Cloud Stream (Kafka/RabbitMQ) |

---

## 2. Service Discovery with Eureka

### Eureka Server

```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

```yaml
# eureka-server application.yml
server:
  port: 8761
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
  server:
    enable-self-preservation: false
```

### Eureka Client (Microservice)

```yaml
# order-service application.yml
spring:
  application:
    name: order-service
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true
    lease-renewal-interval-in-seconds: 10
```

### Service-to-Service Communication

```java
@Service
public class OrderService {

    private final RestClient restClient;

    public OrderService(RestClient.Builder builder) {
        this.restClient = builder
            .baseUrl("http://inventory-service") // logical service name, not URL
            .build();
    }

    public InventoryStatus checkInventory(String productId) {
        return restClient.get()
            .uri("/api/inventory/{productId}", productId)
            .retrieve()
            .body(InventoryStatus.class);
        // Spring Cloud LoadBalancer resolves "inventory-service" → actual instance
    }
}
```

### Kubernetes as Service Discovery

In Kubernetes environments, Eureka is often replaced by native Kubernetes service discovery:

```yaml
spring:
  cloud:
    kubernetes:
      discovery:
        enabled: true
        all-namespaces: false
    loadbalancer:
      enabled: true
```

---

## 3. Spring Cloud Config

### Config Server

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

```yaml
# config-server application.yml
server:
  port: 8888
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/org/config-repo
          default-label: main
          search-paths: '{application}'
        encrypt:
          enabled: true
```

### Config Client (Microservice)

```yaml
# order-service application.yml
spring:
  application:
    name: order-service
  config:
    import: configserver:http://localhost:8888
```

### Config Repo Structure

```
config-repo/
├── application.yml              ← shared by all services
├── order-service.yml            ← order-service specific
├── order-service-prod.yml       ← order-service + prod profile
├── inventory-service.yml
└── inventory-service-prod.yml
```

### Refresh Configuration at Runtime

```java
@RestController
@RefreshScope // beans in this scope are re-created on refresh
public class PricingController {
    @Value("${pricing.discount-rate}")
    private double discountRate; // refreshed without restart

    @GetMapping("/discount")
    public double getDiscount() { return discountRate; }
}
```

```bash
# Trigger refresh via actuator
POST /actuator/refresh

# Or broadcast to all instances via Spring Cloud Bus
POST /actuator/busrefresh
```

---

## 4. API Gateway (Spring Cloud Gateway)

```java
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```

### Route Configuration

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-service
          uri: lb://order-service           # load-balanced
          predicates:
            - Path=/api/orders/**
            - Method=GET,POST,PUT,DELETE
          filters:
            - StripPrefix=1
            - AddRequestHeader=X-Gateway, true
            - name: CircuitBreaker
              args:
                name: orderCircuitBreaker
                fallbackUri: forward:/fallback/orders

        - id: inventory-service
          uri: lb://inventory-service
          predicates:
            - Path=/api/inventory/**
          filters:
            - StripPrefix=1
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
```

### Custom Gateway Filter

```java
@Component
public class AuthenticationGatewayFilter implements GatewayFilterFactory<AuthenticationGatewayFilter.Config> {

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String token = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (token == null || !token.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            // Validate token, add user info to headers
            ServerHttpRequest mutated = exchange.getRequest().mutate()
                .header("X-User-Id", extractUserId(token))
                .build();
            return chain.filter(exchange.mutate().request(mutated).build());
        };
    }

    public static class Config { }
}
```

### Gateway vs Zuul vs Nginx

| Feature | Spring Cloud Gateway | Zuul 2 | Nginx |
|---------|---------------------|--------|-------|
| Reactive | ✅ (Netty) | ✅ (Netty) | ✅ (event-driven) |
| Spring integration | ✅ Native | ⚠️ Netflix OSS | ❌ External |
| Predicates/Filters | ✅ Rich DSL | ✅ Java filters | ✅ Conf directives |
| WebSocket support | ✅ | ✅ | ✅ |
| Configuration | YAML/Java | Java | nginx.conf |
| Performance | High | High | Very High |

---

## 5. Circuit Breaker with Resilience4j

### Configuration

```java
@Service
public class PaymentService {

    private final RestClient restClient;

    public PaymentService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("http://payment-gateway").build();
    }

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    @TimeLimiter(name = "paymentService")
    public PaymentResult processPayment(PaymentRequest request) {
        return restClient.post()
            .uri("/charge")
            .body(request)
            .retrieve()
            .body(PaymentResult.class);
    }

    private PaymentResult paymentFallback(PaymentRequest request, Throwable t) {
        log.warn("Payment service unavailable, queuing: {}", t.getMessage());
        return PaymentResult.queued(request.getOrderId());
    }
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        sliding-window-size: 10
        failure-rate-threshold: 50      # open circuit at 50% failure rate
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        minimum-number-of-calls: 5
  retry:
    instances:
      paymentService:
        max-attempts: 3
        wait-duration: 2s
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
  timelimiter:
    instances:
      paymentService:
        timeout-duration: 5s
```

### Circuit Breaker States

```
           failure rate >= threshold
CLOSED ─────────────────────────► OPEN
  ▲                                  │
  │     success in half-open         │ wait-duration expires
  │                                  │
  └──────────── HALF-OPEN ◄──────────┘
                  │
                  │ failure in half-open
                  └──────────────► OPEN
```

| State | Behavior |
|-------|----------|
| **CLOSED** | Requests pass through normally; failures are counted |
| **OPEN** | All requests immediately fail (or fallback); no calls to downstream |
| **HALF-OPEN** | Limited requests allowed to test recovery |

---

## 6. Spring Cloud Stream — Event-Driven Architecture

```java
@SpringBootApplication
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }

    // Producer — functional style
    @Bean
    public Supplier<OrderEvent> orderEvents() {
        return () -> new OrderEvent("ORDER-123", "PLACED");
    }

    // Consumer
    @Bean
    public Consumer<OrderEvent> processOrder() {
        return event -> {
            log.info("Processing order: {}", event.getOrderId());
            // handle event
        };
    }

    // Processor (transform)
    @Bean
    public Function<OrderEvent, ShipmentEvent> orderToShipment() {
        return order -> new ShipmentEvent(order.getOrderId(), "READY_TO_SHIP");
    }
}
```

```yaml
spring:
  cloud:
    stream:
      bindings:
        orderEvents-out-0:
          destination: orders
          content-type: application/json
        processOrder-in-0:
          destination: orders
          group: order-processing-group
      kafka:
        binder:
          brokers: localhost:9092
```

---

## 7. Distributed Tracing

### Micrometer Tracing (Spring Boot 3+)

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # 100% sampling in dev; reduce in prod
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
logging:
  pattern:
    level: "%5p [${spring.application.name},%X{traceId},%X{spanId}]"
```

Log output with trace context:

```
INFO [order-service, 64a3b2c1d4e5f6a7, 8b9c0d1e2f3a4b5c] Placing order 123
INFO [inventory-service, 64a3b2c1d4e5f6a7, 1a2b3c4d5e6f7a8b] Checking stock for order 123
```

The **traceId** stays the same across services; **spanId** is unique per operation.

---

## 8. Inter-Service Communication Patterns

| Pattern | Implementation | When to Use |
|---------|---------------|-------------|
| Synchronous REST | `RestClient` / `WebClient` + LoadBalancer | Simple request-response, real-time needs |
| Synchronous gRPC | `spring-grpc` | Low latency, strict contracts, binary protocol |
| Async Messaging | Spring Cloud Stream (Kafka/RabbitMQ) | Fire-and-forget, event sourcing, eventual consistency |
| Choreography | Events on message broker | Loose coupling, each service reacts independently |
| Orchestration | Saga pattern with orchestrator | Complex workflows, central coordination |

### Saga Pattern (Orchestration)

```
Order Service (Orchestrator)
    │
    ├── 1. Create Order (PENDING)
    ├── 2. Reserve Inventory ──► Inventory Service
    │       └── On failure: Cancel Order
    ├── 3. Process Payment ──► Payment Service
    │       └── On failure: Release Inventory → Cancel Order
    ├── 4. Arrange Shipment ──► Shipping Service
    │       └── On failure: Refund Payment → Release Inventory → Cancel Order
    └── 5. Complete Order (CONFIRMED)
```

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| Service Discovery | Eureka (Spring Cloud) or Kubernetes native; `lb://service-name` for load-balanced calls |
| Config Server | Centralized config in Git; `@RefreshScope` for runtime updates; encrypt sensitive values |
| API Gateway | Spring Cloud Gateway (reactive, Netty-based); predicates + filters; rate limiting |
| Circuit Breaker | Resilience4j; CLOSED → OPEN → HALF-OPEN states; fallback methods |
| Load Balancing | Client-side via Spring Cloud LoadBalancer; round-robin default |
| Event-Driven | Spring Cloud Stream; functional bean style; Kafka/RabbitMQ binders |
| Distributed Tracing | Micrometer Tracing + Zipkin; traceId propagated across services |
| Saga Pattern | Orchestrated compensating transactions for distributed consistency |
