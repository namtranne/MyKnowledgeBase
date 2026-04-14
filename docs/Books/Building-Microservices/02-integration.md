# Chapter 2 — Integration

> **Getting integration right is the single most important aspect of microservices.** Do it well, and your services retain autonomy. Get it wrong, and disaster awaits.

---

## Principles for Choosing Integration Technology

Before evaluating SOAP, REST, RPC, or messaging — apply these four filters:

| Principle | Why It Matters |
|-----------|---------------|
| **Avoid breaking changes** | Adding a field shouldn't break consumers. Pick tech that makes backward compatibility the default |
| **Keep APIs technology-agnostic** | Don't let integration choices lock you into a language or platform. Today you're a Java shop; tomorrow you might not be |
| **Make services simple for consumers** | A beautifully factored service is worthless if it's painful to consume |
| **Hide internal implementation detail** | Exposing internals = coupling. If consumers bind to your DB schema, you can never change it without breaking them |

---

## The Shared Database Anti-Pattern

The most common (and most damaging) integration approach in enterprise systems:

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│Registration│  │ Call Center│  │ Warehouse  │
│    UI      │  │    App     │  │  Service   │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
      └───────────────┬┴───────────────┘
                      │
              ┌───────▼───────┐
              │   Shared DB   │
              │  (Customer    │
              │   table)      │
              └───────────────┘
```

**Why it fails (3 reasons):**

1. **Exposes internal detail** — The DB schema becomes the API. Any schema change can break all consumers. The DB is a large, brittle, shared API.

2. **Technology coupling** — Consumers are tied to the specific database technology. Want to switch from relational to document store? You can't without rewriting all consumers.

3. **Logic duplication** — Business logic for manipulating customer data lives in every consumer. Bug fix = change in N places. Goodbye cohesion.

> **Rule: Avoid database integration at (nearly) all costs.**

---

## Synchronous vs Asynchronous Communication

| | Synchronous | Asynchronous |
|---|-------------|-------------|
| **Mechanism** | Call blocks until response | Call returns immediately; response arrives later (or never) |
| **Style** | Request/Response | Event-based |
| **Pros** | Easy to reason about; know immediately if it worked | Low latency; decoupled; great for long-running processes |
| **Cons** | Caller blocked; temporal coupling | Harder to debug; requires monitoring; eventual consistency |
| **Example** | HTTP GET, gRPC call | Message queue, event stream |

**Two collaboration styles:**

- **Request/Response** — client asks, server answers (sync or async with callback)
- **Event-based** — client says "this happened," interested parties react. No one tells anyone what to do. The emitter doesn't know who will react.

---

## Orchestration vs Choreography

When a business process spans services (e.g., creating a customer triggers loyalty points, welcome email, and postal pack):

### Orchestration (Central Brain)

```
                 ┌──────────────┐
                 │   Customer   │
                 │   Service    │
                 │  (conductor) │
                 └──┬───┬───┬──┘
                    │   │   │
         ┌──────────┘   │   └──────────┐
         ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Loyalty  │  │  Email   │  │  Postal  │
   │ Points   │  │ Service  │  │ Service  │
   └──────────┘  └──────────┘  └──────────┘
```

- Customer service orchestrates the flow via synchronous request/response calls
- Easy to understand: the flowchart maps directly to code
- **Downside**: Central service becomes a "god service," other services become anemic CRUD endpoints
- Brittle: high cost of change

### Choreography (Decentralized Dance)

```
   Customer Service ──emits──▶ "Customer Created" event
                                      │
                    ┌─────────────────┬┴──────────────────┐
                    ▼                 ▼                    ▼
             ┌──────────┐     ┌──────────┐         ┌──────────┐
             │ Loyalty  │     │  Email   │         │  Postal  │
             │ Points   │     │ Service  │         │ Service  │
             │(subscribes)    │(subscribes)        │(subscribes)
             └──────────┘     └──────────┘         └──────────┘
```

- Each service subscribes to events and reacts independently
- **Significantly more decoupled** — adding a new reaction = just subscribe to the event
- **Downside**: Business process is implicit, not visible in code. Requires explicit monitoring.
- Build a monitoring system that matches the business process view and tracks each service's actions

> **Newman's strong preference: choreography over orchestration.** Orchestrated systems tend to be brittle with high cost of change.

---

## Remote Procedure Calls (RPC)

Make a remote call look like a local call. Technologies: SOAP, Thrift, Protocol Buffers, gRPC, Java RMI.

### How RPC Works

```
Client                          Server
  │                               │
  │  stub.findCustomer("123")     │
  │ ─────────────────────────────▶│
  │     (serialized over wire)    │
  │                               │  executes findCustomer()
  │◀───────────────────────────── │
  │     Customer object returned  │
  │                               │
```

### RPC Pitfalls

| Problem | Detail |
|---------|--------|
| **Technology coupling** | Java RMI ties both client and server to JVM. Thrift/Protobuf are better here. |
| **Local ≠ Remote** | Remote calls have latency, marshalling cost, and network failure modes. APIs designed for local calls don't work well remotely. |
| **Brittleness** | Adding/removing fields in serialized types can break clients. Binary stubs create lock-step deployment pressure. |
| **The network is not reliable** | First fallacy of distributed computing. Failures: slow response, bad response, no response — each needs different handling. |

### Expand-Only Types

Objects used in binary serialization become **expand-only**: you can add fields but never remove them, because some consumer might be deserializing them. This leads to bloated types with dead fields.

### When RPC Is Acceptable

- Modern implementations (gRPC, Thrift) mitigate many issues
- Don't hide the network — make it visible that a remote call is happening
- Ensure server interfaces can evolve without lock-step client upgrades
- Better than database integration for request/response scenarios

---

## REST

> **REpresentational State Transfer** — an architectural style inspired by the Web. Resources are the core abstraction.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Resources** | A "thing" the service knows about (Customer, Order). Externally represented as JSON/XML, decoupled from internal storage. |
| **HTTP Verbs** | GET (read, idempotent), POST (create), PUT (update, idempotent), DELETE (remove, idempotent) |
| **Richardson Maturity Model** | Levels 0–3 of REST maturity, from "HTTP as transport" to full HATEOAS |
| **HTTP ecosystem** | Caching proxies (Varnish), load balancers (mod_proxy), security (TLS, client certs), monitoring — all built-in |

### HATEOAS (Hypermedia As the Engine of Application State)

Clients discover API capabilities by following links in responses, rather than hardcoding URIs:

```xml
<album>
  <name>Give Blood</name>
  <link rel="/artist" href="/artist/theBrakes" />
  <description>Awesome, short, brutish, funny and loud.</description>
  <link rel="/instantpurchase" href="/instantPurchase/1234" />
</album>
```

- Client doesn't hardcode `/instantPurchase/1234` — it finds the `instantpurchase` link dynamically
- Server can change URIs, add new capabilities, or redirect to different services without breaking clients
- Like a human navigating a website: the shopping cart may move, but you still recognize and click it
- **Trade-off**: More chatty (client follows links), but massively decoupled. Start with hypermedia, optimize later.

### JSON vs XML

| Format | Pros | Cons |
|--------|------|------|
| **JSON** | Simple, compact, widely supported, dominant in modern APIs | No built-in hypermedia standard; limited query support (JSONPath) |
| **XML** | Link element built-in, XPath for partial extraction, CSS selectors | Verbose, heavier parsing |
| **HAL** | Standardized hypermedia for JSON (and XML) | Additional specification to learn |

### Beware Framework Magic

Some frameworks (e.g., Spring Boot) let you expose DB entities directly as REST resources. This creates tight coupling between storage and API. **Delay persistence implementation** until the API interface has stabilized — use a simple file or in-memory store initially to let consumer needs drive design.

### Downsides of REST over HTTP

- No automatic client stub generation (unlike RPC)
- Some web frameworks don't support all HTTP verbs well
- Performance: HTTP overhead is higher than binary protocols (Thrift, gRPC)
- Not ideal for low-latency server-to-server communication — consider UDP-based protocols or WebSockets
- For most services, REST over HTTP is still the **sensible default** for request/response

---

## Asynchronous Event-Based Collaboration

### Technology Choices

**Option A: Message Brokers** (RabbitMQ, Kafka, ActiveMQ)

```
Producer ──▶ [Message Broker] ──▶ Consumer(s)
                 │
                 ├── Manages subscriptions
                 ├── Tracks consumer state
                 ├── Scalable and resilient
                 └── Additional operational complexity
```

- Broker handles subscription management, message ordering, consumer tracking
- **Keep middleware dumb, smarts in endpoints** — resist the pull of Enterprise Service Bus (ESB) bloat

**Option B: ATOM Feeds over HTTP**

- Publish resource change feeds; consumers poll for updates
- Reuses HTTP infrastructure (caching, load balancing)
- **Downside**: Higher latency than brokers, consumers must manage their own polling and state tracking
- Competing Consumer pattern is hard without a broker (need shared state to avoid duplicate processing)

> **Guideline**: If you already have a good message broker, use it. If not, consider ATOM for simpler cases but watch for sunk-cost fallacy as needs grow.

### Complexities of Async Architectures

**Cautionary tale: The Catastrophic Failover**

A pricing system used a message queue with competing workers. A bug caused one type of pricing request to crash workers. The queue was transacted — when a worker died, the message went back on the queue. Another worker picked it up and died too. Classic **poison message** problem.

Fixes applied:
1. **Maximum retry limit** on the queue
2. **Dead letter queue** (message hospital) for failed messages
3. **UI to view and replay** dead-lettered messages
4. **Correlation IDs** to trace requests across service boundaries

---

## Services as State Machines

Model each service as the owner of its domain entity lifecycle:

```
Customer Service
  ├── Create customer    → validate → persist → emit event
  ├── Update customer    → validate → apply   → emit event
  ├── Suspend customer   → check rules → apply → emit event
  └── Delete customer    → check deps → apply  → emit event
```

- The service **decides** whether to accept or reject state transitions
- Prevents logic leaking to consumers (no "anemic CRUD wrappers")
- Single place for collision handling (e.g., updating an already-deleted customer)
- Attach behavior to state changes (trigger notifications, audit, etc.)

---

## Reactive Extensions (Rx)

Compose results of multiple service calls using observables:

```
Observable.zip(
    customerService.getCustomer(id),
    orderService.getOrders(customerId),
    recommendationService.getRecommendations(customerId)
).subscribe(results -> renderPage(results));
```

- Abstracts blocking vs non-blocking — you observe results, don't care about transport
- Handles concurrent downstream calls elegantly
- Implementations: RxJava, RxJS, Rx.NET, RxPy

---

## DRY and Code Reuse in Microservices

> **Don't violate DRY within a service. Be relaxed about violating DRY across services.**

| Reuse Type | Safe? | Why |
|------------|-------|-----|
| Internal utility code | Yes | Invisible to outside world |
| Logging/monitoring libraries | Yes | Cross-cutting, non-domain |
| Shared domain model library | **Dangerous** | Creates coupling; change in one service forces all to update |
| Client libraries | **Use carefully** | Risk of server logic leaking into client; limits technology choices |

### Client Library Best Practice (AWS Model)

- Underlying API is directly callable (REST/SOAP)
- SDKs are written by **different people** than the API team
- Client controls when to upgrade the SDK
- Netflix client libraries focus on **reliability** (service discovery, failure handling, logging) not domain logic — but even Netflix found this created coupling over time

---

## Access by Reference

When passing domain entity data between services:

| Approach | Pros | Cons |
|----------|------|------|
| Send full entity data | No extra calls; fast | Data can be stale; larger payloads |
| Send reference (URI) | Always fresh data when accessed | Extra network call; load on source service |
| **Best: Send both** | Consumer has data + can refresh if needed | Slightly larger payload |

- For event-based systems: include what the entity looked like **at event time** plus a reference to fetch current state
- Use HTTP cache controls (ETags, Cache-Control) to reduce load when following references

---

## Versioning

### Strategy Hierarchy (Best to Worst)

1. **Defer breaking changes** — Use tolerant readers (Postel's Law), don't bind to fields you don't use

   > *"Be conservative in what you do, be liberal in what you accept from others."*

2. **Catch breaks early** — Consumer-driven contract tests detect incompatible changes before deployment

3. **Semantic Versioning** — `MAJOR.MINOR.PATCH`
   - MAJOR: backward-incompatible changes
   - MINOR: new backward-compatible features
   - PATCH: bug fixes

4. **Coexist endpoints** — Run old and new endpoints in the same service, give consumers time to migrate

   ```
   Service v2
   ├── /v1/customer  → transforms to v2 internally
   └── /v2/customer  → native v2 handling
   ```
   This is the **expand and contract** pattern.

5. **Multiple service versions** (last resort) — Run V1 and V2 of the entire service simultaneously. Netflix uses this sparingly for legacy devices. **Avoid this**: doubles bug fixes, requires routing logic, shared state across versions is complex.

### Tolerant Reader Pattern

```xml
<!-- Original response -->
<customer>
  <firstname>Sam</firstname>
  <lastname>Newman</lastname>
  <email>sam@magpiebrain.com</email>
  <telephoneNumber>555-1234-5678</telephoneNumber>
</customer>

<!-- Restructured response — tolerant reader still works -->
<customer>
  <naming>
    <firstname>Sam</firstname>
    <lastname>Newman</lastname>
  </naming>
  <email>sam@magpiebrain.com</email>
</customer>
```

Use XPath or JSONPath to extract fields by name, not by position. Ignore fields you don't need.

---

## User Interface Patterns

### API Composition

```
   ┌──────────────────────────────┐
   │       Frontend (SPA)         │
   └──┬──────────┬──────────┬─────┘
      │          │          │
      ▼          ▼          ▼
  ┌───────┐ ┌───────┐ ┌───────┐
  │ Svc A │ │ Svc B │ │ Svc C │
  └───────┘ └───────┘ └───────┘
```

- UI calls services directly via JSON/HTTP
- **Problem**: Can't tailor responses per device; chatty on mobile; UI team separated from service teams

### UI Fragment Composition

- Services serve **UI components** (widgets, page sections) not just data
- Assembly layer combines fragments into a complete page
- Same team owns service logic and its UI representation
- **Problem**: Doesn't work for native mobile apps; cross-cutting interactions (e.g., search triggering recommendations) break the widget model

### Backends for Frontends (BFF)

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Mobile  │  │  Web     │  │ Wearable │
  │   App    │  │   App    │  │   App    │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │
  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
  │ Mobile   │  │  Web     │  │ Wearable │
  │  BFF     │  │   BFF    │  │   BFF    │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │
       └──────────────┼──────────────┘
                      ▼
              Downstream Services
```

- One backend per frontend type (not one monolithic gateway)
- BFF team = frontend team — they own both client and server-side aggregation
- BFFs contain **only UX-specific behavior**, not business logic
- **Danger**: BFFs can become new monoliths if business logic creeps in

### Avoid: Single Monolithic API Gateway

```
  All clients ──▶ [Monolithic Gateway] ──▶ All services
```

- Becomes a bottleneck, a team dependency, and a place where logic accumulates
- Loses isolation of different frontend needs

---

## Integrating with Third-Party / COTS Software

### The Build vs Buy Decision

> **Build if it's a strategic asset unique to your business. Buy if your use of it isn't special.**

- Payroll system → buy (everyone pays people the same way)
- CMS for the Guardian → build (content management IS their business)

### Challenges with COTS/SaaS

| Challenge | Detail |
|-----------|--------|
| Lack of control | Vendor decides integration protocols, extension languages, deployment models |
| Customization cost | Often more expensive than building bespoke. CMSes are particularly bad platforms for custom code |
| Integration spaghetti | Each tool uses different protocols (SOAP, proprietary binary, XML-RPC, direct DB access) |

### Strategy: On Your Own Terms

**For CMS**: Front it with your own service. Use the CMS only for content creation/retrieval. Your service handles rendering, scaling, and integration.

```
  Users ──▶ [Your Web Service] ──▶ [CMS API] (content only)
                    │
                    ├──▶ [Product Service]
                    └──▶ [Customer Service]
```

**For CRM**: Create façade services for each domain concept the CRM owns. Other systems integrate with your façade, not the CRM directly. When you eventually replace the CRM, only the façade internals change.

### The Strangler Pattern

Incrementally replace a legacy system by intercepting calls:

```
  Incoming requests ──▶ [Strangler/Proxy]
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              [New Service]  [Legacy System]
```

- Route calls to new code or legacy code based on readiness
- Replace functionality over time without a big-bang rewrite
- With microservices, use a series of services (not one monolith) to intercept and replace

---

## Chapter Summary — Integration Rules

1. **Avoid database integration at all costs**
2. **Understand the trade-offs between REST and RPC**, but strongly consider REST as the default for request/response
3. **Prefer choreography over orchestration**
4. **Avoid breaking changes** using Postel's Law and tolerant readers
5. **Think of user interfaces as compositional layers**
6. **Front third-party systems** with your own services to maintain control

---

## Interview Cheat Sheet

**Q: Why is shared database integration bad?**
> It exposes internal schema as a public API, couples consumers to your storage technology, and forces business logic to be duplicated across all consumers. Violates both loose coupling and high cohesion.

**Q: REST vs RPC — when would you choose each?**
> REST for most service-to-service communication: it's technology-agnostic, leverages HTTP ecosystem (caching, security, load balancing), and decouples via resources. Use RPC (gRPC/Protobuf) when you need lower latency, binary efficiency, or strong contract enforcement with code generation.

**Q: Explain orchestration vs choreography.**
> Orchestration: a central service directs the workflow, calling downstream services. Simple but creates a god service and tight coupling. Choreography: services emit events and react independently. More decoupled and flexible, but the business process is implicit and requires monitoring.

**Q: How do you version APIs without breaking clients?**
> (1) Use tolerant readers so clients ignore unknown fields. (2) Semantic versioning to communicate change impact. (3) Coexist old and new endpoints in the same service (expand and contract). (4) Consumer-driven contract tests to catch breaks early. Avoid running multiple service versions simultaneously.

**Q: What is the BFF pattern?**
> Backends for Frontends: a dedicated server-side aggregation layer per frontend type (mobile BFF, web BFF). Each BFF is owned by the frontend team, handles device-specific logic and aggregation, but delegates business logic to downstream services. Prevents a monolithic API gateway from becoming a bottleneck.

**Q: What is the Strangler Pattern?**
> A migration strategy where a proxy intercepts calls to a legacy system and routes them to either old or new implementations. Over time, more calls are routed to new services until the legacy system can be decommissioned. Avoids risky big-bang rewrites.
