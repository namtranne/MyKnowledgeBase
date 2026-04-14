# Building Microservices

**Sam Newman — O'Reilly Media (2015)**

The definitive guide to designing, building, and operating microservice architectures. Newman draws on real-world experience at organizations like Netflix, Amazon, Google, and ThoughtWorks to show how to decompose monoliths, integrate services, and operate distributed systems at scale.

---

## Why This Book Matters for Interviews

Microservices questions appear in **system design rounds**, **architecture discussions**, and **behavioral rounds** (how you've handled distributed systems). This book gives you:

- A precise vocabulary (bounded context, choreography, bulkhead, circuit breaker)
- Trade-off reasoning that interviewers love ("it depends, and here's why...")
- Real-world failure stories that demonstrate production experience

---

## Chapters

| # | Chapter | Key Concepts |
|---|---------|-------------|
| 1 | [Microservices](./01-microservices.md) | Definition, key benefits (heterogeneity, resilience, scaling, deployment), SOA vs microservices, decomposition techniques, trade-offs |
| 2 | [Integration](./02-integration.md) | Shared DB anti-pattern, sync vs async, orchestration vs choreography, RPC, REST, HATEOAS, event-based collaboration, versioning, BFF, strangler pattern |
| 3 | [Microservices at Scale](./03-microservices-at-scale.md) | Failure handling, circuit breakers, bulkheads, timeouts, scaling strategies, CQRS, caching, CAP theorem, service discovery, documentation |

---

## Key Principles (Thread Across All Chapters)

1. **Loose coupling** — change one service without changing others
2. **High cohesion** — group related behavior together
3. **Autonomous services** — independently deployable, own their data
4. **Smart endpoints, dumb pipes** — keep logic in services, not middleware
5. **Design for failure** — assume everything will fail, build accordingly
6. **Evolutionary architecture** — start simple, decompose as you learn

---

## Interview Quick-Reference

| Topic | What to Say |
|-------|-------------|
| "What are microservices?" | Small, autonomous services aligned to business boundaries that communicate over the network, independently deployable |
| "Monolith vs microservices?" | Monoliths are simpler to start; microservices trade operational complexity for independent scalability, deployment, and technology choice |
| "How do services communicate?" | Sync (REST, RPC) for request/response; async (message brokers, events) for decoupled choreography |
| "How do you handle failure?" | Timeouts, circuit breakers, bulkheads, graceful degradation, idempotent operations |
| "CAP theorem?" | In a partition, choose availability (AP, eventually consistent) or consistency (CP, may refuse requests); most real systems mix both per capability |
