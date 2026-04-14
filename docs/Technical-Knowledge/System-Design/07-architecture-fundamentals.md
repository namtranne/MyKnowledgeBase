---
sidebar_position: 8
title: "07 — Architecture Fundamentals"
slug: 07-architecture-fundamentals
---

# 🏛️ Architecture Fundamentals

Every system design interview implicitly tests whether you can reason about architectural styles. Choosing the wrong architecture is the most expensive mistake a team can make — it determines deployment strategy, team structure, data flow, scalability ceiling, and operational burden. This chapter surveys every major architectural pattern, when each shines, and when each falls apart.

---

## 🔍 The Core Problem

Architecture is the set of **structural decisions that are expensive to change later**. At the start of a project, you pick an architecture style (or inherit one). That choice cascades:

| Decision | Impact |
|----------|--------|
| **Monolith vs Microservices** | Deployment model, team autonomy, operational complexity |
| **Synchronous vs Event-Driven** | Coupling, latency profile, failure propagation |
| **Layered vs Vertical Slicing** | Code organization, change velocity, testability |
| **Gateway vs Mesh** | Cross-cutting concerns ownership, network topology |
| **CQRS vs Unified Model** | Read/write optimization, eventual consistency surface area |

Understanding these trade-offs — not memorizing definitions — is what interviewers evaluate.

---

## 1. Monolith Architecture

A single deployable unit containing all application logic, typically running as one process.

```
┌─────────────────────────────────────────────────┐
│                  MONOLITH                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Auth    │  │  Orders  │  │ Payments │      │
│  │  Module  │  │  Module  │  │  Module  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
│  ┌────┴──────────────┴──────────────┴────┐      │
│  │         Shared Database Layer          │      │
│  └───────────────────┬───────────────────┘      │
│                      │                           │
└──────────────────────┼───────────────────────────┘
                       │
                 ┌─────┴─────┐
                 │ Single DB │
                 └───────────┘
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Simplicity** | One codebase, one build, one deployment artifact |
| **Easy debugging** | Stack traces span the entire request path — no distributed tracing needed |
| **Performance** | In-process function calls are nanoseconds, not milliseconds (no network hops) |
| **ACID transactions** | A single database supports cross-module transactions trivially |
| **Lower operational cost** | One process to monitor, one CI/CD pipeline, one set of infrastructure |
| **Faster early development** | No service boundaries to design upfront — just write code |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Scaling granularity** | Must scale the entire application even if only one module is under load |
| **Deployment coupling** | A one-line change requires redeploying the entire system |
| **Team bottleneck** | Large teams step on each other — merge conflicts, long CI pipelines |
| **Technology lock-in** | The entire app must use the same language, framework, and runtime |
| **Reliability risk** | A memory leak in one module can crash the entire process |
| **Growing complexity** | Over years, internal boundaries erode, creating a "big ball of mud" |

### When to Use

- Early-stage startups (< 10 engineers) where speed matters most
- Simple domain models with limited scalability requirements
- Internal tools and admin dashboards
- Prototypes and MVPs

:::tip Senior-Level Insight
Don't trash monoliths in interviews. Many successful companies (Shopify, Stack Overflow, Basecamp) run monoliths at massive scale. The "modular monolith" — a monolith with enforced module boundaries — combines monolith simplicity with microservice-like isolation. Say: *"I'd start with a well-structured monolith and extract services only when a specific scaling or team-autonomy need arises."*
:::

---

## 2. Microservices Architecture

A system decomposed into small, independently deployable services, each owning a specific business capability and its own data store.

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Auth    │     │  Orders  │     │ Payments │
│ Service  │     │ Service  │     │ Service  │
│          │     │          │     │          │
│ ┌──────┐ │     │ ┌──────┐ │     │ ┌──────┐ │
│ │ DB   │ │     │ │ DB   │ │     │ │ DB   │ │
│ └──────┘ │     │ └──────┘ │     │ └──────┘ │
└─────┬────┘     └─────┬────┘     └────┬─────┘
      │                │               │
      └────────────────┼───────────────┘
                       │
              ┌────────┴────────┐
              │  Message Bus /  │
              │  API Gateway    │
              └─────────────────┘
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Independent deployment** | Deploy Order Service without touching Auth Service |
| **Team autonomy** | Each team owns a service end-to-end (code, data, infra) |
| **Polyglot freedom** | Orders in Java, Payments in Go, ML pipeline in Python |
| **Granular scaling** | Scale only the services that need it (e.g., Search gets 10x more replicas) |
| **Fault isolation** | A crash in Payments doesn't bring down Orders |
| **Technology evolution** | Rewrite one service without touching the rest |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Distributed complexity** | Network calls fail, time out, return partial results |
| **Data consistency** | No cross-service transactions — must use Sagas or eventual consistency |
| **Operational overhead** | N services × (CI/CD + monitoring + logging + alerting) |
| **Testing difficulty** | Integration/contract testing across service boundaries is non-trivial |
| **Latency** | A single user request may fan out across 5-10 services |
| **Debugging** | Need distributed tracing (Jaeger, Zipkin) to follow a request across services |

### When to Use

- Large organizations (50+ engineers) with multiple autonomous teams
- Systems requiring independent scaling of components
- Products with genuinely distinct bounded contexts
- Systems needing polyglot technology stacks

:::warning Common Mistake
Don't propose microservices for a small team or a new product. The overhead is enormous. A common interviewer trap: *"Why not just use a monolith here?"* Be ready to defend your choice with concrete scale or team-autonomy reasons.
:::

---

## 3. Monolith to Microservices Migration

One of the most commonly asked architectural evolution questions. Interviewers want to hear a phased, risk-managed approach — not a big-bang rewrite.

### The Strangler Fig Pattern

Named after the strangler fig tree that grows around a host tree until it replaces it entirely.

```
Phase 1: Identify                Phase 2: Strangle              Phase 3: Complete
┌───────────────┐               ┌───────────────┐              ┌───────────────┐
│   MONOLITH    │               │   MONOLITH    │              │   MONOLITH    │
│               │               │   (shrinking) │              │   (removed)   │
│  ┌──┐ ┌──┐   │               │  ┌──┐         │              │               │
│  │A │ │B │   │               │  │A │         │              │               │
│  └──┘ └──┘   │               │  └──┘         │              │               │
│  ┌──┐ ┌──┐   │               │  ┌──┐         │              │               │
│  │C │ │D │   │               │  │C │         │              │               │
│  └──┘ └──┘   │               │  └──┘         │              │               │
└───────────────┘               └───────┬───────┘              └───────────────┘
                                        │                         (empty shell)
                                   ┌────┴────┐
                                   │ Facade  │              ┌────┐ ┌────┐
                                   └────┬────┘              │ A  │ │ B  │
                                        │                   └────┘ └────┘
                                   ┌────┴────┐              ┌────┐ ┌────┐
                                   │Service B│              │ C  │ │ D  │
                                   │Service D│              └────┘ └────┘
                                   └─────────┘
```

### Migration Steps

1. **Identify seams** — Find loosely coupled modules with clear boundaries (Domain-Driven Design helps here)
2. **Build the facade** — Route traffic through an API Gateway that can split requests between monolith and new services
3. **Extract one service** — Start with the least risky, most independent module
4. **Data separation** — Migrate the extracted module's data to its own database
5. **Validate** — Run both paths in parallel (shadow traffic, feature flags)
6. **Repeat** — Extract the next service, building confidence and tooling with each iteration

### Anti-Corruption Layer (ACL)

When the new service's domain model differs from the monolith's, insert a translation layer:

```
┌──────────┐    Legacy API    ┌──────────────────┐    Clean API    ┌──────────┐
│ Monolith │ ───────────────► │ Anti-Corruption  │ ──────────────► │   New    │
│          │                  │     Layer        │                 │ Service  │
│          │ ◄─────────────── │ (translates      │ ◄────────────── │          │
│          │   Legacy format  │  models/events)  │   Clean format  │          │
└──────────┘                  └──────────────────┘                 └──────────┘
```

The ACL prevents legacy data shapes and semantics from leaking into new services.

:::tip Senior-Level Insight
When asked about migration, always mention: *"I'd start with a non-critical, well-bounded service — maybe notifications or user preferences — to build out the infrastructure (service mesh, CI/CD, observability) before extracting revenue-critical paths like payments."*
:::

---

## 4. Service-Oriented Architecture (SOA) vs Microservices

SOA and microservices share a philosophy of decomposition but differ in key structural ways.

| Dimension | SOA | Microservices |
|-----------|-----|---------------|
| **Service size** | Large, enterprise-scoped services | Small, focused on a single capability |
| **Communication** | Enterprise Service Bus (ESB) — centralized | Lightweight protocols (HTTP/gRPC) — decentralized |
| **Data** | Often shared databases across services | Each service owns its own database |
| **Governance** | Centralized (common schemas, WSDL) | Decentralized (each team decides) |
| **Reuse** | Designed for enterprise-wide reuse | Designed for replaceability |
| **Technology** | Typically homogeneous (Java EE, .NET) | Polyglot by design |
| **Deployment** | Services often deployed together | Independently deployable |
| **Coupling** | Higher (shared ESB, schemas, database) | Lower (own data, lightweight messaging) |

```
         SOA                                  Microservices
┌─────────────────────┐            ┌──────┐  ┌──────┐  ┌──────┐
│   Service A         │            │ Svc A│  │ Svc B│  │ Svc C│
│   Service B         │            │ (DB) │  │ (DB) │  │ (DB) │
│   Service C         │            └──┬───┘  └──┬───┘  └──┬───┘
│         │           │               │         │         │
│    ┌────┴────┐      │            ┌──┴─────────┴─────────┴──┐
│    │   ESB   │      │            │  Lightweight messaging  │
│    └────┬────┘      │            │  (HTTP / gRPC / events) │
│         │           │            └─────────────────────────┘
│  ┌──────┴──────┐    │
│  │ Shared DB   │    │
│  └─────────────┘    │
└─────────────────────┘
```

:::tip Senior-Level Insight
In interviews, if asked "Is this SOA or microservices?", the right answer is: *"Microservices are an evolution of SOA principles with stronger emphasis on decentralization, independent data ownership, and DevOps culture. The key differentiator is the ESB — SOA centralizes routing logic in the bus, while microservices keep it decentralized."*
:::

---

## 5. Layered Architecture

The most traditional architecture. Code is organized into horizontal layers, each with a specific responsibility.

```
┌─────────────────────────────────────────┐
│          Presentation Layer              │
│   (Controllers, Views, API endpoints)    │
├─────────────────────────────────────────┤
│          Business Logic Layer            │
│   (Services, Domain Models, Rules)       │
├─────────────────────────────────────────┤
│          Data Access Layer               │
│   (Repositories, ORMs, Query builders)   │
├─────────────────────────────────────────┤
│          Database Layer                  │
│   (PostgreSQL, MySQL, MongoDB)           │
└─────────────────────────────────────────┘

Rule: Each layer may only call the layer directly below it.
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Separation of concerns** | Each layer has one responsibility |
| **Testability** | Mock the layer below to unit-test each layer in isolation |
| **Familiarity** | Most developers have worked with layered code — low onboarding cost |
| **Substitutability** | Swap PostgreSQL for MySQL by changing only the data access layer |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Shotgun surgery** | Adding a field requires changes in every layer (controller → service → repo → DB) |
| **Performance** | Every request traverses all layers, even when a layer adds no value |
| **God service** | Business logic layer often becomes a dumping ground |
| **Tight vertical coupling** | A change to the domain model ripples through all layers |

### Vertical Slicing (Feature-Based Organization)

An alternative that organizes code by feature instead of layer:

```
Traditional (Horizontal Layers)         Vertical Slicing
├── controllers/                         ├── features/
│   ├── OrderController                  │   ├── orders/
│   ├── UserController                   │   │   ├── OrderController
│   └── ProductController                │   │   ├── OrderService
├── services/                            │   │   ├── OrderRepository
│   ├── OrderService                     │   │   └── OrderModel
│   ├── UserService                      │   ├── users/
│   └── ProductService                   │   │   ├── UserController
├── repositories/                        │   │   ├── UserService
│   ├── OrderRepository                  │   │   ├── UserRepository
│   ├── UserRepository                   │   │   └── UserModel
│   └── ProductRepository               │   └── products/
└── models/                              │       ├── ProductController
    ├── Order                            │       ├── ProductService
    ├── User                             │       ├── ProductRepository
    └── Product                          │       └── ProductModel
```

Vertical slicing improves cohesion: everything related to "Orders" lives together, making features easier to understand, modify, and extract into a service later.

---

## 6. Event-Driven Architecture (EDA)

Components communicate by producing and consuming events rather than direct API calls. This fundamentally changes coupling, failure propagation, and scalability characteristics.

```
┌──────────┐   OrderPlaced    ┌──────────────┐    ┌──────────────┐
│  Orders  │ ───────────────► │              │ ──►│  Inventory   │
│ Service  │                  │   Event Bus  │    │  Service     │
└──────────┘                  │              │    └──────────────┘
                              │  (Kafka /    │
┌──────────┐   PaymentDone   │   RabbitMQ / │    ┌──────────────┐
│ Payments │ ───────────────► │   SNS+SQS)  │ ──►│  Shipping    │
│ Service  │                  │              │    │  Service     │
└──────────┘                  └──────────────┘    └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  Analytics   │
                              │  Service     │
                              └──────────────┘
```

### Event Sourcing

Instead of storing current state, store every state change as an immutable event:

```
Traditional (State):                Event Sourced (Event Log):
┌─────────────────┐                 ┌─────────────────────────────────┐
│ Account: #42    │                 │ Event 1: AccountOpened(#42)     │
│ Balance: $150   │                 │ Event 2: Deposited(#42, $200)   │
│ Status: Active  │                 │ Event 3: Withdrawn(#42, $50)    │
└─────────────────┘                 │ Event 4: Deposited(#42, $100)   │
                                    │ Event 5: Withdrawn(#42, $100)   │
Current state = replay of           └─────────────────────────────────┘
all events                          Balance = 0+200-50+100-100 = $150
```

### Choreography vs Orchestration

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| **Control** | No central coordinator — services react to events | Central orchestrator directs the workflow |
| **Coupling** | Low — services don't know about each other | Medium — orchestrator knows all participants |
| **Visibility** | Hard to trace end-to-end flow | Easy — the orchestrator owns the workflow state |
| **Complexity** | Grows non-linearly with more services | Linear — add steps to the orchestrator |
| **Failure handling** | Each service handles its own failures | Orchestrator manages compensating actions |
| **Best for** | Simple event chains (2-3 steps) | Complex multi-step business processes |

```
Choreography:                          Orchestration:
                                       ┌──────────────┐
Order ──event──► Inventory             │ Orchestrator │
                    │                  └──────┬───────┘
                 event                   call │ │ call
                    ▼                        │ │
                 Payment                 ┌───┘ └───┐
                    │                    ▼         ▼
                 event              Inventory   Payment
                    ▼                    │         │
                 Shipping            response  response
                                         │         │
                                         └────┬────┘
                                              ▼
                                          Shipping
```

### Advantages & Disadvantages of EDA

| Advantages | Disadvantages |
|-----------|---------------|
| Loose coupling between producers and consumers | Harder to reason about system behavior |
| Natural scalability — add consumers independently | Debugging requires distributed tracing |
| Built-in audit trail (event log) | Event schema evolution is complex |
| Temporal decoupling — producer and consumer don't need to be online simultaneously | Eventual consistency — no immediate read-after-write |
| Replay capability for recovery or new consumers | Ordering guarantees require careful partitioning |

:::warning Event Schema Evolution
Events are contracts. Once published, changing an event schema can break downstream consumers. Use schema registries (Confluent Schema Registry, AWS Glue), versioned event types, and backward-compatible changes (add fields, never remove or rename).
:::

---

## 7. CQRS — Command Query Responsibility Segregation

Separate the **write model** (commands: create, update, delete) from the **read model** (queries: fetch, list, search) into distinct data stores optimized for their respective workloads.

```
                    ┌───────────────┐
   Write (Command)  │               │  Read (Query)
   ────────────────►│   API Layer   │◄────────────────
                    │               │
                    └───┬───────┬───┘
                        │       │
                   ┌────┘       └────┐
                   ▼                 ▼
            ┌────────────┐    ┌────────────┐
            │   Write    │    │   Read     │
            │   Model    │    │   Model    │
            │            │    │            │
            │ Normalized │    │Denormalized│
            │ PostgreSQL │    │ Elastic /  │
            │            │    │ Redis /    │
            │            │    │ DynamoDB   │
            └─────┬──────┘    └──────▲─────┘
                  │                  │
                  │   Sync (events / │
                  │   CDC / queue)   │
                  └──────────────────┘
```

### When to Use CQRS

| Use When | Avoid When |
|----------|-----------|
| Read and write patterns differ dramatically (e.g., 100:1 read:write ratio) | Simple CRUD application with uniform access patterns |
| Queries require complex joins/aggregations that slow down writes | Small data sets where a single model performs well |
| Scaling reads independently of writes is critical | Team lacks experience with eventual consistency |
| Event sourcing is already in place | Consistency requirements demand immediate read-after-write |

### Complexity Trade-offs

- **Eventual consistency** — The read model lags behind the write model by milliseconds to seconds
- **Data synchronization** — Need CDC, event bus, or change streams to keep models in sync
- **Two schemas to maintain** — Doubling the data model surface area
- **Debugging** — "Why doesn't my read show the update I just wrote?" becomes a common question

:::tip Senior-Level Insight
CQRS doesn't require event sourcing, and event sourcing doesn't require CQRS. They complement each other but are independent patterns. In interviews, propose CQRS when you see read-heavy workloads with complex query patterns (e.g., a product search page backed by Elasticsearch) while writes go to a normalized relational database.
:::

---

## 8. Backend for Frontend (BFF)

A dedicated backend service for each client type (web, mobile, smart TV), aggregating and tailoring API responses for that client's specific needs.

```
┌──────────┐     ┌──────────────┐
│   Web    │────►│  Web BFF     │──┐
│  Client  │     │ (Node.js)    │  │
└──────────┘     └──────────────┘  │
                                   │    ┌──────────┐   ┌──────────┐
┌──────────┐     ┌──────────────┐  ├───►│  Order   │   │  User    │
│  Mobile  │────►│ Mobile BFF   │──┤    │ Service  │   │ Service  │
│  Client  │     │ (Node.js)    │  │    └──────────┘   └──────────┘
└──────────┘     └──────────────┘  │
                                   │    ┌──────────┐   ┌──────────┐
┌──────────┐     ┌──────────────┐  │    │ Product  │   │ Payment  │
│ Smart TV │────►│  TV BFF      │──┘    │ Service  │   │ Service  │
│  Client  │     │ (Node.js)    │       └──────────┘   └──────────┘
└──────────┘     └──────────────┘
```

### Why BFF?

| Problem | How BFF Solves It |
|---------|-------------------|
| Mobile needs less data than web | BFF tailors response payload per client |
| Web aggregates 5 APIs into 1 page | BFF does server-side aggregation, reducing client round-trips |
| Different auth flows per client | BFF handles client-specific auth (OAuth, API key, session) |
| API versioning across clients | Each BFF evolves independently |
| Performance optimization | Mobile BFF compresses images; Web BFF pre-renders HTML |

### Rules of Thumb

- **One BFF per client type** — not per team or per feature
- **BFF should be thin** — aggregation and transformation only, no business logic
- **Owned by the client team** — the iOS team owns the Mobile BFF
- **Consider GraphQL** as an alternative — a single flexible endpoint may replace multiple BFFs

---

## 9. Service Mesh

A dedicated infrastructure layer for service-to-service communication. Every service gets a **sidecar proxy** that handles networking concerns transparently.

```
┌──────────────────────────────────────────────────────────────┐
│                        Service Mesh                          │
│                                                              │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │   Service A     │              │   Service B     │       │
│  │  ┌───────────┐  │   mTLS +    │  ┌───────────┐  │       │
│  │  │  App Code │  │   routing   │  │  App Code │  │       │
│  │  └─────┬─────┘  │              │  └─────┬─────┘  │       │
│  │        │        │              │        │        │       │
│  │  ┌─────┴─────┐  │              │  ┌─────┴─────┐  │       │
│  │  │  Sidecar  │◄─┼──────────────┼─►│  Sidecar  │  │       │
│  │  │  Proxy    │  │              │  │  Proxy    │  │       │
│  │  │ (Envoy)   │  │              │  │ (Envoy)   │  │       │
│  │  └───────────┘  │              │  └───────────┘  │       │
│  └─────────────────┘              └─────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Control Plane (Istio / Linkerd)      │       │
│  │   • Service discovery    • Traffic policies       │       │
│  │   • Certificate mgmt    • Observability config    │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### What the Sidecar Proxy Handles

| Concern | Detail |
|---------|--------|
| **mTLS** | Automatic encryption and mutual authentication between services |
| **Load balancing** | Client-side load balancing with health-aware routing |
| **Circuit breaking** | Stops sending traffic to unhealthy instances |
| **Retries & timeouts** | Configurable retry policies without application code changes |
| **Traffic splitting** | Canary deployments (send 5% of traffic to v2) |
| **Observability** | Automatic metrics, traces, and access logs for every request |
| **Rate limiting** | Per-service or per-endpoint rate limits |

### Service Mesh Comparison

| Feature | Istio | Linkerd | Consul Connect |
|---------|-------|---------|-----------------|
| **Proxy** | Envoy | linkerd2-proxy (Rust) | Envoy / built-in |
| **Complexity** | High | Low | Medium |
| **Performance overhead** | ~2-5ms latency | ~1ms latency | ~1-3ms latency |
| **Learning curve** | Steep | Gentle | Moderate |
| **Best for** | Large enterprises needing full control | Teams wanting simplicity | HashiCorp-native stacks |

:::tip Senior-Level Insight
Don't propose a service mesh for fewer than ~10 microservices. The operational overhead isn't justified. Instead, use application-level libraries (e.g., resilience4j, Polly) for circuit breaking and retries. Mention the mesh when the interviewer asks about cross-cutting concerns at scale.
:::

---

## 10. API Gateway

A single entry point that sits between external clients and internal services, handling cross-cutting concerns.

```
                                    ┌─────────────────────────────────┐
                                    │          API Gateway            │
┌──────────┐                       │                                 │
│  Client  │──── HTTPS ───────────►│  • Authentication / AuthZ      │
│  (Web /  │                       │  • Rate limiting               │     ┌──────────┐
│  Mobile) │◄──────────────────────│  • Request routing             │────►│ Service A│
└──────────┘                       │  • Response aggregation        │     └──────────┘
                                    │  • Protocol translation        │
                                    │  • Caching                     │     ┌──────────┐
                                    │  • Logging / Metrics           │────►│ Service B│
                                    │  • SSL termination             │     └──────────┘
                                    │  • Request/response transform  │
                                    └─────────────────────────────────┘
```

### API Gateway vs Reverse Proxy vs Load Balancer

| Feature | Load Balancer | Reverse Proxy | API Gateway |
|---------|:------------:|:-------------:|:-----------:|
| **Traffic distribution** | ✅ Primary purpose | ✅ | ✅ |
| **SSL termination** | ✅ | ✅ | ✅ |
| **Health checks** | ✅ | ✅ | ✅ |
| **Path-based routing** | Limited | ✅ | ✅ |
| **Authentication** | ❌ | Limited | ✅ |
| **Rate limiting** | ❌ | Basic | ✅ Advanced |
| **Request aggregation** | ❌ | ❌ | ✅ |
| **Protocol translation** | ❌ | ❌ | ✅ (REST↔gRPC) |
| **API versioning** | ❌ | ❌ | ✅ |
| **Developer portal** | ❌ | ❌ | ✅ |
| **Layer** | L4 (TCP) | L7 (HTTP) | L7 (HTTP) |
| **Examples** | AWS NLB, HAProxy | Nginx, Traefik | Kong, AWS API GW, Apigee |

### API Gateway Technologies

| Gateway | Type | Best For |
|---------|------|----------|
| **Kong** | Open-source / Cloud | General purpose, plugin ecosystem |
| **AWS API Gateway** | Managed | AWS-native, serverless backends |
| **Apigee** | Managed | Enterprise API management |
| **Nginx + Lua** | DIY | Custom logic, high performance |
| **Envoy** | Open-source | gRPC-native, service mesh integration |
| **Traefik** | Open-source | Kubernetes-native, auto-discovery |

:::warning Single Point of Failure
The API Gateway is on the critical path for every request. It must be highly available (multi-AZ, auto-scaling, failover). In interviews, always mention: *"I'd deploy the gateway across multiple availability zones with health checks and auto-scaling to prevent it from becoming a bottleneck."*
:::

---

## 11. Domain-Driven Design (DDD)

A software modeling approach that aligns code structure with business domains. DDD is critical for designing service boundaries in microservices architectures.

### Key Concepts

| Concept | Definition | Example |
|---------|-----------|---------|
| **Bounded Context** | A boundary within which a domain model has a specific, unambiguous meaning | "Customer" in Billing means an account with payment methods; in Shipping, it means a delivery address |
| **Ubiquitous Language** | A shared vocabulary between developers and domain experts within a bounded context | "Order" always means the same thing within the Orders context |
| **Aggregate Root** | A cluster of domain objects treated as a single unit for data changes | `Order` is an aggregate root containing `OrderItems`, `ShippingInfo` |
| **Entity** | An object with a unique identity that persists over time | A `Customer` with ID `#42` |
| **Value Object** | An immutable object defined by its attributes, not identity | `Money(100, "USD")`, `Address("123 Main St")` |
| **Domain Event** | A record that something meaningful happened in the domain | `OrderPlaced`, `PaymentReceived`, `ItemShipped` |
| **Repository** | An abstraction for retrieving and persisting aggregates | `OrderRepository.findById(orderId)` |

### Context Mapping

When multiple bounded contexts interact, you need explicit mapping strategies:

```
┌─────────────────┐          ┌─────────────────┐
│   Orders        │          │   Shipping      │
│   Context       │          │   Context       │
│                 │  events  │                 │
│  Order          │─────────►│  Shipment       │
│  OrderItem      │          │  Package        │
│  Customer (ref) │          │  Customer (ref) │
│                 │          │                 │
└─────────────────┘          └─────────────────┘
        │                            │
        │  API call                  │
        ▼                            │
┌─────────────────┐                  │
│   Payments      │◄─────────────────┘
│   Context       │      events
│                 │
│  Payment        │
│  Invoice        │
│  Customer (ref) │
└─────────────────┘
```

### Mapping Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Shared Kernel** | Two contexts share a subset of the model | Tightly coupled teams that co-evolve |
| **Customer-Supplier** | Upstream context provides what downstream needs | Clear provider-consumer relationship |
| **Conformist** | Downstream adopts upstream's model as-is | When upstream won't accommodate changes |
| **Anti-Corruption Layer** | Translation layer between contexts | Integrating with legacy or third-party systems |
| **Open Host Service** | Published API for multiple consumers | Stable, well-defined integration points |

:::tip Senior-Level Insight
In system design interviews, use DDD to justify your service boundaries: *"I'd identify bounded contexts first — Orders, Inventory, Payments, Shipping — each becomes a candidate microservice. The key is that each context has its own definition of 'Customer' and its own data store."*
:::

---

## 12. Serverless Architecture

Code runs in stateless, ephemeral containers managed entirely by the cloud provider. You write functions; the provider handles infrastructure.

```
┌──────────┐    HTTP     ┌──────────────┐     invoke     ┌─────────────┐
│  Client  │────────────►│ API Gateway  │───────────────►│   Lambda    │
└──────────┘             └──────────────┘                │  Function   │
                                                         │             │
                              ┌──────────────────────────┤  (stateless │
                              │                          │  ephemeral) │
                              ▼                          └──────┬──────┘
                        ┌──────────┐                           │
                        │  Event   │                     ┌─────┴─────┐
                        │ Sources  │                     ▼           ▼
                        │          │              ┌──────────┐ ┌──────────┐
                        │ • S3     │              │ DynamoDB │ │   SQS    │
                        │ • SQS    │              └──────────┘ └──────────┘
                        │ • Kinesis│
                        │ • Cron   │
                        └──────────┘
```

### When to Use vs Avoid

| Use Serverless | Avoid Serverless |
|----------------|-----------------|
| Spiky, unpredictable traffic | Steady, high-throughput workloads (cheaper to run containers) |
| Event-driven processing (S3 triggers, queue consumers) | Long-running processes (> 15 min) |
| Rapid prototyping and MVPs | Low-latency requirements (cold start adds 100ms-5s) |
| Infrequent batch jobs (run 2x/day) | Workloads needing persistent connections (WebSockets) |
| Glue code between cloud services | Complex stateful workflows (use Step Functions instead) |

### Cold Start Latency

| Runtime | Cold Start | Warm Invocation |
|---------|-----------|-----------------|
| **Python** | 200-500ms | 1-5ms |
| **Node.js** | 150-400ms | 1-5ms |
| **Go** | 50-150ms | &lt;1ms |
| **Java** | 1-5s | 1-5ms |
| **.NET** | 500ms-2s | 1-5ms |

Mitigation strategies: provisioned concurrency, keep-warm pings, smaller deployment packages, GraalVM native images for Java.

:::warning Vendor Lock-in
Serverless ties you deeply to a cloud provider's ecosystem (Lambda + API Gateway + DynamoDB + SQS). Extracting later is expensive. In interviews, acknowledge this: *"Serverless gives us zero operational overhead, but we accept vendor lock-in. For this use case, the operational savings outweigh portability concerns."*
:::

---

## 13. Architecture Decision Records (ADRs)

A lightweight documentation practice for capturing the *why* behind architectural decisions.

### ADR Template

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status
Accepted (2024-01-15)

## Context
We need a primary database for the order management system. 
Expected load: 10K writes/sec, 50K reads/sec. 
Data is highly relational (orders → items → products → categories).

## Decision
We will use PostgreSQL 16 with read replicas.

## Consequences
### Positive
- Strong ACID guarantees for financial data
- Rich query capabilities (JSON, full-text search, CTEs)
- Mature ecosystem and operational expertise on the team

### Negative
- Horizontal write scaling requires sharding (not needed at current scale)
- Schema migrations need careful coordination
- No built-in multi-region active-active replication

## Alternatives Considered
- **DynamoDB**: Better write scaling, but poor for relational queries
- **MongoDB**: Flexible schema, but weaker consistency guarantees
- **CockroachDB**: Built-in distribution, but less mature ecosystem
```

### Why ADRs Matter

| Benefit | Detail |
|---------|--------|
| **Onboarding** | New engineers understand *why* decisions were made, not just *what* |
| **Prevents re-litigation** | "We already considered and rejected MongoDB — here's why" |
| **Accountability** | Decisions are traceable to a person, date, and context |
| **Evolution** | Superseded ADRs show how the architecture evolved |

:::tip Senior-Level Insight
Mentioning ADRs in an interview signals engineering maturity. When you make a design choice, say: *"I'd document this as an ADR so the team understands the trade-offs and can revisit the decision when our scale changes."*
:::

---

## 14. Architecture Patterns — Quick Reference

| Pattern | Best For | Avoid When | Complexity |
|---------|----------|------------|:----------:|
| **Monolith** | Small teams, MVPs, simple domains | Large orgs, independent scaling needs | Low |
| **Modular Monolith** | Medium teams wanting boundaries without microservices overhead | Polyglot requirements | Low-Med |
| **Microservices** | Large orgs, independent scaling, team autonomy | Small teams, early-stage products | High |
| **Event-Driven** | Async workflows, audit trails, decoupled systems | Simple CRUD, real-time consistency required | Med-High |
| **CQRS** | Read-heavy systems with complex queries | Simple domains, small data sets | Medium |
| **Serverless** | Spiky traffic, event processing, glue code | Steady load, low latency, long-running tasks | Low (ops) |
| **Layered** | Traditional web apps, small-medium projects | Complex domains needing vertical slicing | Low |
| **Service Mesh** | 10+ microservices needing cross-cutting concerns | Small service count, simple networking | High |
| **BFF** | Multiple client types with different data needs | Single client type, simple API | Medium |

---

## 15. Interview Cheat Sheet — Architecture Selection

When an interviewer asks you to design a system, use this decision tree:

```
                         Start
                           │
                    ┌──────┴──────┐
                    │ Team size?  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          < 10 eng     10-50 eng     > 50 eng
              │            │            │
              ▼            ▼            ▼
          Monolith     Modular      Microservices
                       Monolith
                           │
                           │ If read:write > 10:1
                           ▼
                         CQRS
                           │
                           │ If async workflows
                           ▼
                      Event-Driven
                           │
                           │ If multiple client types
                           ▼
                          BFF
```

:::tip Senior-Level Insight
Architecture is not a binary choice. Real systems combine patterns: a microservices architecture with CQRS in the search service, event-driven communication between services, a BFF for the mobile client, and an API gateway at the edge. Show this nuance in interviews: *"The system overall follows a microservices architecture, but within the product catalog service, I'd apply CQRS because reads outnumber writes 100:1."*
:::

---

## 📚 Key Takeaways

| # | Principle |
|:-:|-----------|
| 1 | **Start simple** — Begin with a monolith; extract services when you have a concrete scaling or team-autonomy reason |
| 2 | **Bounded contexts first** — Use DDD to identify service boundaries before decomposing |
| 3 | **Data ownership** — Each service owns its data; shared databases are the #1 microservice anti-pattern |
| 4 | **Sync for queries, async for commands** — Use synchronous calls for reads, event-driven for state changes |
| 5 | **Cross-cutting concerns at the edge** — Put auth, rate limiting, and logging in the API Gateway or service mesh, not in every service |
| 6 | **Document decisions** — Use ADRs to capture the *why*, not just the *what* |
| 7 | **Patterns compose** — Real architectures combine multiple patterns; don't treat them as mutually exclusive |
