---
sidebar_position: 1
title: "Database Interview Guide"
---

# 🗄️ Database Interview Guide

A comprehensive preparation guide for **senior software engineer** database interviews — covering relational fundamentals, indexing, transactions, storage engines, distributed systems, NoSQL, caching, and real-world interview questions.

---

## 📍 Roadmap Overview

| # | Topic | Level | Focus |
|:-:|-------|:------|:------|
| 1 | **Relational Fundamentals** — ACID, normalization, SQL mastery | 🟢 Foundation | Theory + SQL |
| 2 | **Indexing & Query Optimization** — B-Trees, EXPLAIN, anti-patterns | 🟡 Intermediate | Performance |
| 3 | **Transactions & Concurrency** — Isolation levels, locking, MVCC | 🟡 Intermediate | Correctness |
| 4 | **Storage Engines & Data Structures** — B-Tree vs LSM-Tree, WAL, columnar | 🔴 Advanced | Internals |
| 5 | **Replication & Partitioning** — Sharding, consensus, consistency | 🔴 Advanced | Distributed |
| 6 | **NoSQL & Distributed Databases** — CAP, document/graph/column stores | 🔴 Advanced | Breadth |
| 7 | **Caching Strategies** — Redis, eviction policies, cache patterns | 🟡 Intermediate | Performance |
| 8 | **Common Interview Questions** — System design, SQL challenges, scenarios | 🟣 Practice | Interview |

> **Recommended path:** `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`

---

## 🟢 Chapter 1 — Relational Fundamentals

> *Goal: Master the bedrock of relational databases — ACID, normalization, and SQL fluency.*

**📖 Read:** [01 — Relational Fundamentals](./01-relational-fundamentals.md)

- [ ] Define what a relational database is and its core components
- [ ] Explain ACID properties with real-world examples
- [ ] Walk through normalization from 1NF to BCNF with table transformations
- [ ] Know when and why to denormalize
- [ ] Write all JOIN types confidently (INNER, LEFT, RIGHT, FULL, CROSS, SELF)
- [ ] Use CTEs, subqueries, and window functions (ROW_NUMBER, RANK, LEAD/LAG)
- [ ] Solve classic SQL interview problems (Nth salary, duplicates, running totals)
- [ ] Compare PostgreSQL vs MySQL vs Oracle vs SQL Server

---

## 🟡 Chapter 2 — Indexing & Query Optimization

> *Goal: Understand how indexes work internally and how to make queries fast.*

**📖 Read:** [02 — Indexing & Query Optimization](./02-indexing-query-optimization.md)

- [ ] Explain B-Tree and B+Tree structure and how lookups work
- [ ] Distinguish index types: composite, covering, partial, full-text
- [ ] Read and interpret EXPLAIN / query plans
- [ ] Identify when indexes help vs. hurt performance
- [ ] Understand index selectivity and cardinality
- [ ] Avoid common anti-patterns (SELECT *, N+1, implicit casts)
- [ ] Optimize slow queries systematically

---

## 🟡 Chapter 3 — Transactions & Concurrency Control

> *Goal: Understand isolation levels, locking, MVCC, and distributed transactions.*

**📖 Read:** [03 — Transactions & Concurrency Control](./03-transactions-concurrency.md)

- [ ] Describe the full transaction lifecycle
- [ ] Explain all four isolation levels with anomaly examples
- [ ] Differentiate dirty reads, phantom reads, non-repeatable reads, write skew
- [ ] Explain shared vs. exclusive vs. intent locks
- [ ] Describe how MVCC works in PostgreSQL and MySQL
- [ ] Compare optimistic vs. pessimistic concurrency control
- [ ] Handle deadlock detection and prevention
- [ ] Explain 2PC, 3PC, and Saga pattern for distributed transactions

---

## 🔴 Chapter 4 — Storage Engines & Data Structures

> *Goal: Understand how databases physically store, retrieve, and manage data on disk.*

**📖 Read:** [04 — Storage Engines & Data Structures](./04-storage-engines.md)

- [ ] Explain page-oriented storage and how rows map to disk pages
- [ ] Describe the B-Tree storage engine (InnoDB)
- [ ] Describe the LSM-Tree storage engine (RocksDB/Cassandra)
- [ ] Compare B-Tree vs. LSM-Tree tradeoffs
- [ ] Explain Write-Ahead Log (WAL) and crash recovery
- [ ] Differentiate row-oriented vs. column-oriented storage
- [ ] Understand buffer pool / page cache management

---

## 🔴 Chapter 5 — Replication & Partitioning

> *Goal: Understand how databases scale horizontally and maintain availability.*

**📖 Read:** [05 — Replication & Partitioning](./05-replication-partitioning.md)

- [ ] Compare single-leader, multi-leader, and leaderless replication
- [ ] Explain sync vs. async replication tradeoffs
- [ ] Solve replication lag problems (read-after-write, monotonic reads)
- [ ] Design sharding strategies: range, hash, list, composite
- [ ] Explain consistent hashing and virtual nodes
- [ ] Handle cross-shard queries and global secondary indexes
- [ ] Plan rebalancing strategies

---

## 🔴 Chapter 6 — NoSQL & Distributed Databases

> *Goal: Understand the NoSQL landscape and when to use each type.*

**📖 Read:** [06 — NoSQL & Distributed Databases](./06-nosql-databases.md)

- [ ] Explain CAP theorem and PACELC theorem
- [ ] Compare Key-Value, Document, Column-Family, and Graph databases
- [ ] Know when to choose SQL vs. NoSQL
- [ ] Explain eventual consistency and conflict resolution
- [ ] Understand vector clocks and CRDTs
- [ ] Model data in NoSQL (embedding vs. referencing)
- [ ] Describe NewSQL databases (CockroachDB, TiDB, Spanner)

---

## 🟡 Chapter 7 — Caching Strategies

> *Goal: Design effective caching layers to reduce database load.*

**📖 Read:** [07 — Caching Strategies](./07-caching-strategies.md)

- [ ] Implement cache-aside, read-through, write-through, write-behind patterns
- [ ] Choose the right eviction policy: LRU, LFU, FIFO, TTL
- [ ] Implement an LRU cache from scratch (HashMap + Doubly Linked List)
- [ ] Use Redis effectively: data structures, persistence, clustering
- [ ] Solve cache stampede / thundering herd problems
- [ ] Design distributed caching with consistent hashing
- [ ] Compare Redis vs. Memcached

---

## 🟣 Chapter 8 — Common Interview Questions

> *Goal: Practice real interview questions across all database topics.*

**📖 Read:** [08 — Common Interview Questions](./08-interview-questions.md)

- [ ] Design database schemas for system design problems
- [ ] Solve SQL coding challenges under time pressure
- [ ] Answer conceptual questions with depth and precision
- [ ] Debug slow query scenarios step by step
- [ ] Estimate storage and throughput for large-scale systems
- [ ] Explain zero-downtime migration strategies

---

## 📚 All Chapters

| Chapter | Title | Key Topics |
|:-------:|-------|------------|
| [01](./01-relational-fundamentals.md) | **Relational Fundamentals** | ACID, normalization, JOINs, window functions, SQL problems |
| [02](./02-indexing-query-optimization.md) | **Indexing & Query Optimization** | B-Tree, EXPLAIN plans, composite indexes, anti-patterns |
| [03](./03-transactions-concurrency.md) | **Transactions & Concurrency** | Isolation levels, MVCC, deadlocks, 2PC, Saga |
| [04](./04-storage-engines.md) | **Storage Engines & Data Structures** | B-Tree vs LSM-Tree, WAL, columnar storage |
| [05](./05-replication-partitioning.md) | **Replication & Partitioning** | Leader replication, sharding, consistent hashing |
| [06](./06-nosql-databases.md) | **NoSQL & Distributed Databases** | CAP, Redis, MongoDB, Cassandra, Neo4j, NewSQL |
| [07](./07-caching-strategies.md) | **Caching Strategies** | Cache patterns, LRU, Redis, cache stampede |
| [08](./08-interview-questions.md) | **Common Interview Questions** | System design, SQL challenges, scenarios |
