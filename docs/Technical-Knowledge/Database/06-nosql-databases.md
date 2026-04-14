---
sidebar_position: 7
title: "06 — NoSQL & Distributed Databases"
---

# 🌍 NoSQL & Distributed Databases

NoSQL databases emerged to solve problems that relational databases struggle with at scale: flexible schemas, horizontal scaling, and high write throughput. Understanding the trade-offs is critical for senior engineers who must choose the right database for each use case.

---

## 🔺 CAP Theorem

The CAP theorem (Eric Brewer, 2000) states that a distributed system can provide at most **two of three** guarantees simultaneously:

```
                     Consistency (C)
                          ▲
                         / \
                        /   \
                       / CP  \
                      /       \
                     /    CA    \
                    /  (single   \
                   /    node)     \
                  /                \
                 ▼                  ▼
     Availability (A) ────────── Partition
                       AP         Tolerance (P)
```

| Property | Meaning |
|----------|---------|
| **Consistency** | Every read returns the most recent write (linearizability) |
| **Availability** | Every request receives a response (even if stale) |
| **Partition Tolerance** | System continues to operate despite network partitions |

### The Real Choice: CP or AP

In practice, network partitions **will** happen (P is non-negotiable). So the real choice during a partition is:

| Choice | During Partition | Example Systems |
|:------:|-----------------|:---------------:|
| **CP** | Refuse requests to maintain consistency (sacrifice A) | ZooKeeper, HBase, MongoDB (strong reads), etcd |
| **AP** | Continue serving requests with potentially stale data (sacrifice C) | Cassandra, DynamoDB, CouchDB, Riak |

:::warning CAP Nuances
CAP is often oversimplified. Important nuances:
- It only applies **during** a network partition. When there's no partition, you can have both C and A.
- "Consistency" in CAP means **linearizability** (the strongest form), not just "correct data."
- Many systems let you tune the trade-off per operation (e.g., DynamoDB's strong vs. eventual consistency).
:::

---

## 📊 PACELC Theorem

PACELC extends CAP to address the **normal case** (no partition):

> If there is a **P**artition, choose between **A**vailability and **C**onsistency.
> **E**lse (normal operation), choose between **L**atency and **C**onsistency.

| System | Partition (PAC) | Normal (ELC) | Full Classification |
|--------|:---------------:|:------------:|:-------------------:|
| DynamoDB | AP | EL | PA/EL |
| Cassandra | AP | EL | PA/EL |
| MongoDB | CP | EC | PC/EC |
| PostgreSQL (single) | CA* | EC | CA/EC |
| CockroachDB | CP | EC | PC/EC |
| Cosmos DB | Tunable | Tunable | Tunable |

*Single-node systems are not distributed and don't face partition issues.

:::info Key Insight
PACELC captures the **everyday** trade-off better than CAP: most of the time there's no partition, and the real question is "do I want lower latency or stronger consistency?" This is the trade-off you'll face in production far more often.
:::

---

## 📦 Types of NoSQL Databases

### Key-Value Stores

Store data as key-value pairs. The simplest NoSQL model.

```
Key              Value
─────────────    ─────────────────────────
"user:42"        {"name":"Alice","age":30}
"session:abc"    {"token":"xyz","exp":...}
"config:app"     {"theme":"dark","lang":"en"}
```

| Database | Persistence | Clustering | Best For |
|----------|:-----------:|:----------:|----------|
| **Redis** | Optional (RDB/AOF) | Redis Cluster | Caching, sessions, rate limiting, leaderboards |
| **DynamoDB** | Fully managed | Built-in | Serverless apps, high-scale key lookups |
| **Memcached** | None (memory only) | Client-side | Pure caching |
| **etcd** | Raft-based | Built-in | Configuration, service discovery |

### Document Stores

Store semi-structured documents (JSON/BSON). Support querying on any field.

```json
{
  "_id": "order_1001",
  "customer": { "name": "Alice", "email": "alice@ex.com" },
  "items": [
    { "product": "Widget", "qty": 3, "price": 9.99 },
    { "product": "Gadget", "qty": 1, "price": 49.99 }
  ],
  "total": 79.96,
  "status": "shipped"
}
```

| Database | Consistency | Scaling | Best For |
|----------|:-----------:|:-------:|----------|
| **MongoDB** | Tunable (strong/eventual) | Sharding | Content management, catalogs, user profiles |
| **CouchDB** | Eventual (AP) | Multi-master replication | Offline-first apps, mobile sync |
| **Firestore** | Strong | Fully managed | Mobile/web apps, real-time sync |

### Column-Family Stores

Data organized by columns rather than rows. Optimized for wide rows and time-series data.

```
Row Key: "user:42"
┌─────────────────────────────────────────────────┐
│ Column Family: "profile"                        │
│   name: "Alice"  │  age: 30  │  city: "NYC"    │
├─────────────────────────────────────────────────┤
│ Column Family: "activity"                       │
│   login:2024-01-15  │  login:2024-01-16  │ ...  │
└─────────────────────────────────────────────────┘
```

| Database | Consistency | Use Case | Notes |
|----------|:-----------:|----------|-------|
| **Cassandra** | Tunable (AP by default) | Time-series, IoT, messaging | LSM-Tree, leaderless, CQL |
| **HBase** | Strong (CP) | Hadoop ecosystem, analytics | Based on Google Bigtable |
| **ScyllaDB** | Tunable | Cassandra-compatible, lower latency | Written in C++ (vs. Java) |

### Graph Databases

Optimized for traversing **relationships** between entities.

```
      ┌───────┐    FOLLOWS     ┌───────┐
      │ Alice │ ──────────────► │  Bob  │
      └───┬───┘                └───┬───┘
          │                        │
     LIKES│                   WROTE│
          ▼                        ▼
      ┌───────┐                ┌───────────┐
      │Post:1 │                │ Post:2    │
      └───────┘                └───────────┘
```

| Database | Query Language | Use Case |
|----------|:-------------:|----------|
| **Neo4j** | Cypher | Social networks, recommendation engines |
| **Amazon Neptune** | Gremlin, SPARQL | Knowledge graphs, fraud detection |
| **ArangoDB** | AQL | Multi-model (document + graph) |
| **JanusGraph** | Gremlin | Large-scale graph analytics |

---

## 📊 NoSQL Type Comparison

| Aspect | Key-Value | Document | Column-Family | Graph |
|--------|:---------:|:--------:|:--------------:|:-----:|
| **Data model** | Opaque blobs | JSON/BSON documents | Wide rows, column families | Nodes + edges |
| **Query flexibility** | Key lookup only | Rich queries on fields | Column-level access | Traversal queries |
| **Schema** | None | Flexible (schema-on-read) | Flexible within column families | Flexible |
| **Relationships** | Manual (store keys) | Embedding or referencing | Denormalized | First-class |
| **Scaling** | Horizontal | Horizontal | Horizontal | Varies |
| **Best for** | Caching, sessions | Content, catalogs | Time-series, IoT | Social, recommendations |
| **Worst for** | Complex queries | Heavy joins | Ad-hoc queries | Tabular data |

---

## ⚖️ SQL vs. NoSQL Decision Guide

| Factor | Choose SQL | Choose NoSQL |
|--------|-----------|-------------|
| **Data relationships** | Complex, many JOINs | Few relationships, denormalized |
| **Schema stability** | Schema is well-defined and stable | Schema evolves rapidly |
| **Consistency needs** | Strong consistency required (ACID) | Eventual consistency acceptable |
| **Query patterns** | Ad-hoc, complex queries | Known, simple access patterns |
| **Scale** | Vertical scaling sufficient | Need horizontal scaling (petabytes) |
| **Transactions** | Multi-table transactions needed | Single-record operations dominant |
| **Team expertise** | SQL is universal | Document/key-value APIs are intuitive |
| **Examples** | Banking, ERP, e-commerce orders | IoT, real-time analytics, content, caching |

:::tip Senior Interview Answer
Don't frame it as "SQL vs. NoSQL" — frame it as **"what are the access patterns?"**
1. Define the read/write patterns
2. Identify consistency requirements
3. Estimate scale (data size, throughput)
4. Choose the database that matches

Many production systems use **polyglot persistence** — PostgreSQL for transactions, Redis for caching, Elasticsearch for search, Cassandra for time-series.
:::

---

## 🔄 Eventual Consistency

In distributed AP systems, updates propagate to all replicas **eventually**, but there's no guarantee of **when**.

```
Write "balance=500" to Node A:

  Time 0:  Node A: 500  │  Node B: 1000  │  Node C: 1000
  Time 1:  Node A: 500  │  Node B: 500   │  Node C: 1000  (propagating)
  Time 2:  Node A: 500  │  Node B: 500   │  Node C: 500   (converged)
```

### Consistency Spectrum

```
Weakest                                            Strongest
  │                                                    │
  ▼                                                    ▼
Eventual → Causal → Session → Monotonic → Strong (Linearizable)
  │           │         │         │             │
  │           │         │         │        Every read sees
  │           │         │      Reads never    the latest
  │           │         │      go backward     write
  │           │    Read-your-writes
  │           │    within a session
  │      Causally related
  │      ops in order
  All replicas
  converge eventually
```

---

## 🤝 Conflict Resolution

When concurrent writes happen in an AP system, conflicts must be resolved.

### Last-Write-Wins (LWW)

Each write carries a timestamp. The latest timestamp wins.

```
Node A: write("key", "A", t=100)
Node B: write("key", "B", t=102)

Resolved value: "B" (higher timestamp)
```

**Problem:** Clock skew can cause the "wrong" write to win. Data from the "losing" write is silently discarded.

### Vector Clocks

Track **causal relationships** between versions using a vector of logical counters.

```
Initial: key = "v0"  │  VC = {A:0, B:0, C:0}

Node A writes "v1":  │  VC = {A:1, B:0, C:0}
Node B writes "v2":  │  VC = {A:0, B:1, C:0}

Are these concurrent? {A:1,B:0} vs {A:0,B:1}
  Neither dominates → CONFLICT → application must resolve

Node A reads both, merges → "v3"  │  VC = {A:2, B:1, C:0}
```

**Rule:** Version X dominates version Y if every counter in X >= corresponding counter in Y. If neither dominates, the versions are **concurrent** (conflict).

### CRDTs (Conflict-free Replicated Data Types)

Data structures that **always merge** without conflicts by mathematical design.

| CRDT | Type | Example Use |
|------|------|-------------|
| **G-Counter** | Grow-only counter | Page view counts |
| **PN-Counter** | Increment/decrement counter | Like/unlike counts |
| **G-Set** | Grow-only set | Tracking unique visitors |
| **OR-Set** | Observed-Remove set | Shopping cart items |
| **LWW-Register** | Last-writer-wins register | User profile fields |

```
G-Counter example (3 nodes):

  Node A increments: {A:3, B:0, C:0}
  Node B increments: {A:0, B:5, C:0}
  Node C increments: {A:0, B:0, C:2}

  Merge: max of each entry → {A:3, B:5, C:2}
  Total count: 3 + 5 + 2 = 10

  No conflicts possible! Merge is commutative and idempotent.
```

---

## 📝 Data Modeling in NoSQL

### Embedding vs. Referencing (MongoDB)

**Embedding** — store related data in the same document:

```json
{
  "_id": "user_42",
  "name": "Alice",
  "addresses": [
    { "type": "home", "city": "NYC", "zip": "10001" },
    { "type": "work", "city": "SF", "zip": "94105" }
  ]
}
```

**Referencing** — store a foreign key/ID:

```json
// users collection
{ "_id": "user_42", "name": "Alice", "address_ids": ["addr_1", "addr_2"] }

// addresses collection
{ "_id": "addr_1", "type": "home", "city": "NYC", "zip": "10001" }
{ "_id": "addr_2", "type": "work", "city": "SF", "zip": "94105" }
```

| Factor | Embed | Reference |
|--------|:-----:|:---------:|
| **Read performance** | Fast (single read) | Slower (multiple reads) |
| **Write performance** | Slower (update large doc) | Fast (update small doc) |
| **Data duplication** | Yes (denormalized) | No (normalized) |
| **Document size** | Watch 16MB limit (MongoDB) | Small documents |
| **Relationship** | 1:few, tightly coupled | 1:many, many:many, loosely coupled |
| **Data changes independently** | No → embed | Yes → reference |

:::note NoSQL Modeling Rule
In NoSQL, **model for your queries**, not for your entities. Start with the access patterns, then design the data model to satisfy them with minimal reads.
:::

---

## 🆕 NewSQL Databases

NewSQL databases aim to provide the **scalability of NoSQL** with the **ACID guarantees of SQL**.

| Database | Architecture | Consistency | Standout Feature |
|----------|-------------|:-----------:|------------------|
| **CockroachDB** | Shared-nothing, Raft consensus | Serializable | PostgreSQL-compatible, survives zone failures |
| **TiDB** | TiKV (Raft) + TiDB (SQL layer) | Snapshot isolation | MySQL-compatible, HTAP (OLTP + OLAP) |
| **Google Spanner** | Globally distributed, TrueTime | External consistency | GPS/atomic clock-based timestamps |
| **YugabyteDB** | DocDB (Raft), PostgreSQL-compatible | Serializable | Multi-cloud, geo-distributed |
| **VoltDB** | In-memory, single-threaded partitions | Serializable | Ultra-low latency OLTP |

### How Spanner Achieves Global Consistency

Google Spanner uses **TrueTime** — a globally synchronized clock based on GPS receivers and atomic clocks in every data center.

```
TrueTime API:
  TT.now() → [earliest, latest]   (bounded uncertainty interval)

Commit wait:
  Transaction commits at timestamp T
  Spanner waits until TT.now().earliest > T
  This guarantees no other transaction can have an earlier timestamp
  → External consistency (linearizability) without coordination!
```

:::info When to Choose NewSQL
- You need **SQL and ACID** at **NoSQL scale** (horizontal scaling)
- You want to avoid the complexity of manual sharding
- You need **global distribution** with strong consistency
- You want **PostgreSQL/MySQL compatibility** for existing applications
:::

---

## 🎯 Interview Questions

### Q1: "When would you choose MongoDB over PostgreSQL?"

- **Schema flexibility:** Rapidly evolving product with schema changes every sprint
- **Document-oriented access:** Data naturally fits as self-contained documents (e.g., product catalog with variable attributes)
- **Horizontal scaling:** Need easy sharding for high write throughput
- **Would NOT choose MongoDB for:** Complex transactions, heavy relational queries, data integrity constraints

### Q2: "Explain the CAP theorem. Is it useful in practice?"

CAP says you can have at most 2 of 3: Consistency, Availability, Partition Tolerance. Since partitions are inevitable in distributed systems, the real choice is CP or AP. However, CAP is an oversimplification — in practice, consistency exists on a spectrum (eventual → linearizable), and many systems let you tune per-query. PACELC is a more practical model.

### Q3: "How would you handle a counter that needs to work across multiple data centers?"

Use a **CRDT counter** (G-Counter or PN-Counter):
- Each data center maintains its own counter
- Counters merge by taking the max of each node's value
- No coordination needed — eventually consistent and conflict-free
- Examples: Redis with CRDT support, Riak, custom implementation

### Q4: "What is the difference between embedding and referencing in MongoDB?"

Embedding stores related data in a single document (fast reads, atomic updates, but document bloat). Referencing stores a foreign ID and requires a separate lookup (normalized, smaller documents, but slower reads). Choose based on access patterns: embed for data always read together, reference for independently accessed data.

### Q5: "What is CockroachDB and why would you use it?"

CockroachDB is a distributed SQL database that provides:
- PostgreSQL wire-protocol compatibility
- Serializable isolation with Raft-based consensus
- Automatic sharding and rebalancing
- Survives datacenter failures

Use it when you need SQL+ACID at distributed scale without manual sharding.

---

## 🔗 Related Chapters

- **[01 — Relational Fundamentals](./01-relational-fundamentals.md)** — SQL and ACID for comparison
- **[04 — Storage Engines](./04-storage-engines.md)** — LSM-Tree used by many NoSQL databases
- **[05 — Replication & Partitioning](./05-replication-partitioning.md)** — Consistent hashing, quorum reads
- **[07 — Caching Strategies](./07-caching-strategies.md)** — Redis deep dive
