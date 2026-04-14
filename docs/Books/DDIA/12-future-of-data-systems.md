# Chapter 12 — The Future of Data Systems

This chapter synthesizes the entire book's themes into a unified vision for building correct, evolvable, maintainable data systems. It moves beyond individual tools to address **data integration**, **architectural patterns**, and **correctness guarantees** at the system level.

---

## Data Integration

### The Fundamental Challenge

No single tool does everything well. Most real applications need a combination of:

| Tool | Purpose |
|------|---------|
| OLTP database | Serve reads/writes for the application |
| Cache (Redis) | Speed up hot reads |
| Full-text search (Elasticsearch) | Text search, faceted navigation |
| Data warehouse (Redshift, BigQuery) | Analytical queries, reporting |
| Stream processor (Kafka Streams, Flink) | Real-time derived data, event processing |
| Batch processor (Spark) | Large-scale data transformations |
| ML pipeline | Model training and feature computation |

**The real problem is not choosing these tools — it's keeping them all in sync.** When a record changes in the OLTP database, the cache must be invalidated, the search index must be updated, the data warehouse must be refreshed, and downstream stream processors must be notified.

**Dual writes** (writing to multiple systems from the application) are fundamentally flawed:
- Race conditions between writes to different systems → permanent inconsistency
- Partial failures — one write succeeds, another fails → inconsistent
- No coordination between independent writes → no ordering guarantees

### The Solution: Derived Data Architecture

```
Source of Truth (Event Log)
         │
         ├──▶ OLTP Database (serve reads/writes)
         ├──▶ Search Index (full-text queries)
         ├──▶ Cache (hot data)
         ├──▶ Data Warehouse (analytics)
         ├──▶ ML Pipeline (model training)
         └──▶ Notification Service (user alerts)
```

**One source of truth** (typically an event log or a primary database with CDC), and **multiple derived views**, each optimized for a specific access pattern.

**Two mechanisms for deriving data:**
1. **Batch processing** — periodically reprocess the complete dataset (ETL, Spark jobs)
2. **Stream processing** — continuously update derived views as the source changes (CDC, Kafka Streams)

**Total ordering of writes** (provided by a log like Kafka, one partition at a time) solves many consistency problems: all derived views process the same changes in the same order → they converge to the same state.

---

## Unbundling Databases

### What Databases Do Internally

A traditional database already maintains multiple derived data structures from the primary data:

| Internal Component | What It Does | Analogy |
|-------------------|-------------|---------|
| **Secondary indexes** | Derived from table contents; updated transactionally with writes | A derived view optimized for queries on specific columns |
| **Materialized views** | Precomputed query results, updated on write | A cache of expensive query results |
| **Replication log** | Stream of changes for followers | A CDC stream consumed by replica nodes |
| **Full-text index** | Derived from text columns | A search index maintained in sync with the data |

A monolithic database does all of this internally, within a single system, with strong transactional guarantees.

### The Unbundling Idea

Instead of one database trying to do everything, **decompose the database's internal functions into independent services connected by a log:**

```
Traditional monolithic database:        Unbundled architecture:
┌────────────────────────────────┐      ┌──────────────┐
│ Primary storage                │      │ Event Log    │
│ + Secondary indexes            │      │ (Kafka)      │
│ + Full-text search             │      └──────┬───────┘
│ + Materialized views           │             │
│ + Replication                  │      ┌──────┼─────────┐──────────┐
│ + Transaction coordinator      │      ▼      ▼         ▼          ▼
└────────────────────────────────┘    Postgres  Elastic  Redis    Redshift
                                      (primary) (search) (cache)  (analytics)
```

Each component does what it's best at:
- **Kafka** provides the durable, ordered log
- **PostgreSQL** stores the primary relational data
- **Elasticsearch** provides full-text search
- **Redis** provides low-latency caching
- **Redshift** provides columnar analytics

Adding a new derived system = create a new consumer of the log → replay historical data to build initial state → consume live updates going forward. **No changes to existing systems required.**

### Federation vs Unbundling

| Approach | Focus | Description |
|----------|-------|-------------|
| **Federated database (unified reads)** | Read path | Single query interface across multiple storage systems. Send a query and it's automatically routed/joined across systems. |
| **Unbundled database (unified writes)** | Write path | Single event log feeding multiple read-optimized stores. Each store is specialized for its read pattern. |

The unbundled approach is more practical today because it doesn't require the extremely complex problem of cross-system query optimization — each system handles its own reads, and the log handles consistency of writes.

---

## Designing for Correctness

### The End-to-End Argument

**Low-level reliability mechanisms are necessary but not sufficient.** Correctness must be verified at the application level.

**Analogy:** TCP guarantees reliable delivery of packets, but it doesn't guarantee that the application sent the right data. If the application has a bug that sends corrupted data, TCP will reliably deliver the corruption. The **end-to-end check** (application-level validation) is what ultimately ensures correctness.

**In data systems:**
- The database provides ACID transactions — but if the application logic is wrong, the database faithfully stores wrong data
- The message broker guarantees delivery — but if the consumer processes the message incorrectly, the guarantee is useless
- Replication ensures durability — but if the primary accepted invalid data, all replicas dutifully store the invalid data

**Correctness must be enforced at every layer, not just the infrastructure layer.**

### Exactly-Once Execution and Idempotence

**Problem: duplicate execution.** Client sends a request, server processes it, server sends response, response is lost (timeout). Client retries the same request → server processes it **again** → the operation happens twice.

This is a fundamental problem in any networked system — even with "exactly-once delivery" at the message broker level, the **end-to-end effect** may not be exactly-once.

**Solution: end-to-end idempotence.**

```
Client generates a unique request ID (UUID) for each logical operation.

Request 1: {id: "abc-123", action: "transfer $100 from A to B"}
  → Server processes, records id "abc-123" in a deduplication table
  → Response lost

Retry:     {id: "abc-123", action: "transfer $100 from A to B"}
  → Server sees id "abc-123" already processed
  → Returns the original result without re-executing
```

**Requirements:**
- Client must generate a unique ID per logical operation (not per request attempt)
- Server must durably record processed IDs (with the result)
- Server must check for duplicates **atomically with processing** (in the same transaction)

### Enforcing Constraints

**Uniqueness constraints** are a special case of consensus — all nodes must agree that a value is unique. This fundamentally requires coordination.

**In a single-leader system:** the leader is the decision point. All uniqueness checks go through the leader → serialized → no conflicts.

**In a partitioned system:** route all requests for the same constraint to the same partition. Each partition independently enforces uniqueness for its keys.

**Cross-partition uniqueness** requires distributed coordination (consensus) — expensive. Most systems avoid this by designing partitioning so that uniqueness constraints are partition-local.

**Many constraints can be relaxed in practice:**

| Strict Approach | Relaxed Alternative |
|----------------|-------------------|
| Prevent constraint violation in real-time | Detect and compensate after the fact |
| Two users claim the same username → second request blocks until first resolves | Both succeed → system detects the conflict async → apologizes to one user and asks them to choose a different username |
| Prevent double-spending with strong consistency | Process optimistically → detect overdraft async → charge overdraft fee or reverse transaction |

Real-world business processes already work this way: **apologies, compensations, and corrections** are part of normal operations. The airline doesn't prevent overbooking — it compensates bumped passengers. The bank doesn't prevent all overdrafts — it charges fees.

This suggests a design principle: **use synchronous coordination only when the cost of a violation is truly unacceptable** (e.g., selling more stock than you own, dispensing medication without a valid prescription). For most other constraints, async detection + compensation is cheaper and more available.

### Timeliness vs Integrity

Two distinct properties that are often conflated:

| Property | Definition | Violation Impact | Mechanism |
|----------|-----------|------------------|-----------|
| **Timeliness** | Users see up-to-date data (low replication lag) | Temporary staleness — annoying but recoverable. User sees old data; refreshing shows new data. | Eventual consistency, read-after-write consistency |
| **Integrity** | No corruption, no data loss, no contradictions (e.g., debits = credits) | **Permanent damage** — corrupted data, missing records, invalid state | Transactions, checksums, idempotence, immutable logs |

**Key insight:** most applications can tolerate **temporary violations of timeliness** (eventual consistency is fine for many reads) but **cannot tolerate violations of integrity** (a single corrupted record can cascade into disaster).

**ACID transactions provide both** timeliness and integrity, but at significant performance cost. The insight is that you can **decouple them:**

1. **Integrity via immutable event logs + deterministic derivation:**
   - Write events to an append-only, durable log (integrity guaranteed by durable writes)
   - Derive all state deterministically from the log (integrity maintained by deterministic functions)
   - If operations are idempotent, replaying events always produces the same correct state

2. **Timeliness via asynchronous processing (accept temporary inconsistency):**
   - Derived views may lag behind the log by a few seconds
   - This is acceptable for most use cases (the user sees their order status update a few seconds late)
   - When timeliness is critical (e.g., the user just submitted an order and wants to see it), use read-after-write consistency techniques

3. **Synchronous coordination only for critical integrity constraints:**
   - Uniqueness constraints, debit/credit balance, inventory stock levels
   - Use consensus/single-leader only for these narrow cases
   - Everything else can be eventually consistent

This approach gives you **strong integrity guarantees with high availability and good performance** — the best of both worlds.

### The ACID-Event Sourcing Synthesis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Source of Truth: Immutable Event Log                  │
│                                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Event 1 │  │ Event 2  │  │ Event 3  │  │ Event 4  │  │ Event 5  │  │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────┬────────────┬────────────┬────────────┬────────────┬────────────┘
        │            │            │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌───▼─────┐  ┌──▼───────┐  ┌─▼──────────┐
   │Database │  │ Search  │  │  Cache  │  │Warehouse │  │Notification│
   │(current │  │ Index   │  │(hot data│  │(analytics│  │  Service   │
   │ state)  │  │         │  │  )      │  │)         │  │            │
   └─────────┘  └─────────┘  └─────────┘  └──────────┘  └────────────┘

   Integrity: guaranteed by deterministic derivation from immutable log
   Timeliness: derived views are eventually consistent (seconds of lag)
   Coordination: only for uniqueness/critical constraints (at log write time)
```

---

## Doing the Right Thing

### Data Ethics and Responsibility

As data systems become more powerful, they enable decisions that **directly affect people's lives**: credit scoring, insurance pricing, hiring decisions, criminal sentencing, content recommendations, advertising targeting.

**Key concerns:**

#### Bias Amplification
- Models trained on historical data perpetuate and amplify existing biases
- Example: if historically fewer women were hired for engineering roles, a hiring model trained on this data will rate women lower — perpetuating the bias
- The model doesn't "decide" to be biased — it reflects the bias in the training data, but at massive scale

#### Feedback Loops
- Predictions create **self-fulfilling prophecies**
- Example: predictive policing sends more officers to neighborhood X → more arrests in X → model strengthens belief that X is high-crime → even more officers sent to X
- The prediction creates the reality it predicted

#### Accountability and Transparency
- Automated decisions are often **opaque** — the system can't explain why it made a decision
- When a bank declines a loan, regulations require an explanation. An ML model may not be able to provide one.
- "The algorithm decided" is not an acceptable explanation for decisions that affect people's lives

### Privacy and Surveillance

**Data collection concerns:**
- Consent is often not meaningful — "agree to terms of service" is not informed consent when the terms are 50 pages of legal text
- **Purpose creep** — data collected for one purpose (improving product experience) is later used for another (targeted advertising, sold to data brokers, accessed by government agencies)
- **Aggregation reveals more than individual pieces** — combining location data, purchase history, social connections, and browsing habits reveals intimate details of a person's life that they never explicitly shared
- Even "anonymized" datasets can often be **de-anonymized** by cross-referencing with other data sources

### Design Principles for Ethical Data Systems

| Principle | Implementation |
|-----------|---------------|
| **Data minimization** | Collect only what you need. Don't store data "just in case." |
| **Purpose limitation** | Use data only for its stated purpose. Document the purpose. Get explicit consent for new uses. |
| **User control** | Provide meaningful access, correction, and deletion capabilities |
| **Transparency** | Explain what data you collect, how you use it, who you share it with |
| **Accountability** | Clear ownership and responsibility for data handling decisions |
| **Bias auditing** | Regularly test automated decision systems for discriminatory outcomes |
| **Right to explanation** | When automated decisions affect people, provide meaningful explanations |

**The engineering perspective:** privacy and ethical data handling are not just legal compliance issues — they are **design requirements** that should influence architecture decisions. A system designed for data minimization from the start is fundamentally different from one that collects everything and tries to add privacy controls later.

---

## Key Architecture Patterns from the Book

Looking back across all twelve chapters, these are the fundamental patterns for building reliable, scalable, maintainable data-intensive applications:

| Pattern | Where Discussed | Key Idea |
|---------|----------------|----------|
| **Replication** | Ch 5 | Copy data across nodes for durability and read throughput |
| **Partitioning** | Ch 6 | Split data across nodes for write throughput and storage capacity |
| **Transactions** | Ch 7 | Group operations for atomicity, consistency, and isolation |
| **Consensus** | Ch 9 | Get nodes to agree on values (leader election, atomic commit) |
| **Immutable event log** | Ch 11, 12 | Source of truth; all state derived from the log |
| **Derived data** | Ch 10, 11, 12 | Build specialized views from a single source of truth |
| **Idempotent operations** | Ch 11, 12 | Design operations to be safely retryable |
| **End-to-end correctness** | Ch 12 | Verify correctness at the application level, not just infrastructure |
| **Timeliness vs integrity** | Ch 12 | Accept temporary staleness; never accept corruption |
