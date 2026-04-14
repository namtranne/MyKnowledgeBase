# Chapter 1 — Microservices

## What Are Microservices?

> **Microservices are small, autonomous services that work together.**

Two defining characteristics:

### 1. Small and Focused on Doing One Thing Well

- Aligned to **business boundaries**, not technical layers
- Follows the **Single Responsibility Principle** (Robert C. Martin): *"Gather together those things that change for the same reason, and separate those things that change for different reasons."*
- Size heuristic: "Could be rewritten in two weeks" (Jon Eaves, RealEstate.com.au) — but this is context-dependent
- Better heuristic: **small enough and no smaller** — when a codebase no longer feels too big, it's probably small enough
- Aligns to team structures: if too big for a small team to own, break it down
- Trade-off: the smaller the service, the more you maximize **both** the benefits and the operational complexity

### 2. Autonomous

- Each service is a **separate process** (or set of processes) communicating over the network
- **All communication is via network calls** — enforcing separation and avoiding tight coupling
- The golden rule: *Can you make a change to a service and deploy it by itself without changing anything else?*
- Services expose an **API** — the contract with the outside world
- Internal implementation is hidden; only the API is shared

---

## Key Benefits

### Technology Heterogeneity

Pick the right tool for each job instead of one-size-fits-all:

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Social   │    │  Posts    │    │  Search  │
│  Graph    │    │ Service  │    │ Service  │
│           │    │          │    │          │
│ Graph DB  │    │ Document │    │ Elastic  │
│ (Neo4j)   │    │ DB(Mongo)│    │ Search   │
└──────────┘    └──────────┘    └──────────┘
```

- Try new technologies on low-risk services first, limit blast radius
- Netflix and Twitter constrain to JVM for operational consistency but still use multiple technology stacks
- If a microservice can be rewritten in two weeks, the risk of trying new tech is mitigated

### Resilience

- Service boundaries act as **bulkheads** — failure in one service doesn't cascade to others
- A monolith is binary: it's up or it's down. Microservices allow **partial failures** and graceful degradation
- Requires understanding new failure modes: networks fail, latency kills, partial outages are the norm

### Scaling

- Scale **individual services** independently, not the entire system
- Example: **Gilt** started as a monolithic Rails app in 2007. By 2009, it couldn't handle load. After decomposition, they reached 450+ microservices, each scaling independently on separate machines
- With on-demand provisioning (AWS), scale precisely what needs scaling — direct cost savings

```
         ┌─────────────────────────┐
         │      Load Balancer      │
         └─────┬─────┬─────┬──────┘
               │     │     │
          ┌────┴┐ ┌──┴──┐ ┌┴────┐
          │ Svc │ │ Svc │ │ Svc │   ← CPU-heavy service: 10 instances
          │  A  │ │  A  │ │  A  │
          └─────┘ └─────┘ └─────┘
          
          ┌─────┐
          │ Svc │                    ← Low-traffic service: 1 instance
          │  B  │
          └─────┘
```

### Ease of Deployment

| Monolith | Microservices |
|----------|---------------|
| One-line change → redeploy entire app | Change one service, deploy only that service |
| Large delta between releases → high risk | Small, frequent releases → low risk |
| Fear of deployment → infrequent releases → bigger deltas | Fast rollback of individual services |

Amazon and Netflix use microservices specifically to remove deployment impediments.

### Organizational Alignment

- **Conway's Law**: system architecture mirrors organizational communication structures
- Smaller teams on smaller codebases are more productive
- Shift ownership of services between teams to keep people co-located with their work
- Minimize cross-team coordination for changes

### Composability

- Expose fine-grained capabilities that can be consumed in multiple ways: web, mobile, tablet, wearable, API
- Think of microservices as **addressable seams** — building blocks that can be rearranged as business needs change
- Monoliths offer one coarse-grained seam; microservices offer many fine-grained ones

### Optimizing for Replaceability

- Small services are cheap to rewrite or delete entirely
- Teams are comfortable with full rewrites when needed
- Prevents emotional attachment to code ("it's only a few hundred lines")
- Contrast with legacy monoliths: "too big and risky to replace"

---

## Microservices vs SOA

| Aspect | SOA | Microservices |
|--------|-----|---------------|
| Granularity | Often coarse-grained | Fine-grained, single responsibility |
| Communication | Often heavy middleware (ESB, SOAP) | Lightweight protocols (REST, messaging) |
| Data | Shared databases common | Each service owns its data |
| Governance | Centralized | Decentralized |
| Deployment | Often coupled releases | Independent deployment |
| Guidance | Vague, vendor-driven | Opinionated, practice-driven |

> Think of microservices as **a specific approach to SOA**, the same way XP or Scrum are specific approaches to Agile.

The problems laid at SOA's door are often problems with communication protocols (SOAP), vendor middleware (ESB), lack of guidance on service granularity, or wrong splitting decisions — not with the core idea of collaborating services.

---

## Other Decompositional Techniques

### Shared Libraries

| Advantage | Disadvantage |
|-----------|-------------|
| Easy code reuse | Same language/platform required |
| Familiar to all developers | Can't scale parts independently |
| Well-understood dependency management | Redeploy entire process for library changes |
| | No architectural safety bulkheads |
| | Shared libraries across services = coupling risk |

**Rule**: Libraries are great for non-domain-specific utilities (logging, collections). Don't use them to share domain models between services.

### Modules (OSGI, Erlang)

- **OSGI** (Java): Retrofits module lifecycle onto Java. In practice, leads to excessive complexity. Module isolation is easy to break within a process boundary.
- **Erlang**: First-class module support in the runtime. Supports hot-swapping, multiple versions running simultaneously. Impressive capabilities but still has the same technology heterogeneity and scaling limitations.
- **Key insight**: Technically, you can build well-factored modules within a monolith. In practice, modules inevitably become tightly coupled. **Process boundary separation enforces clean hygiene** (or at least makes it harder to do the wrong thing).

---

## No Silver Bullet

Microservices come with all the complexities of distributed systems:

| You Gain | You Must Handle |
|----------|----------------|
| Independent deployment | Distributed deployment orchestration |
| Technology diversity | Polyglot operational burden |
| Independent scaling | Network latency and failures |
| Fault isolation | Distributed transactions |
| Team autonomy | Service discovery, monitoring, tracing |
| | CAP theorem trade-offs |
| | Testing across service boundaries |

---

## Interview Cheat Sheet

**Q: Define microservices in one sentence.**
> Small, autonomous services aligned to business boundaries, independently deployable, communicating over the network.

**Q: When would you NOT use microservices?**
> - Greenfield project where the domain is not well understood yet (start with a well-structured monolith)
> - Small team that can't afford the operational overhead
> - When you don't have CI/CD, monitoring, and container orchestration maturity
> - When the system doesn't need independent scaling or deployment

**Q: How small should a microservice be?**
> Aligned to a single bounded context. Practically: small enough for one team to own, large enough to represent a meaningful business capability. The "rewrite in two weeks" heuristic helps but is context-dependent.

**Q: What's the relationship between microservices and Domain-Driven Design?**
> Microservice boundaries should align with DDD bounded contexts. Each service owns its domain model and ubiquitous language. Bounded contexts define where a model applies, which maps naturally to service boundaries.

**Q: Name 3 key benefits and 3 key challenges.**
> Benefits: (1) Independent deployment and scaling, (2) Technology heterogeneity — right tool for the job, (3) Organizational alignment — small teams, clear ownership.
> Challenges: (1) Distributed system complexity — network failures, latency, (2) Data consistency across services — no ACID transactions, (3) Operational overhead — monitoring, deployment, service discovery.
