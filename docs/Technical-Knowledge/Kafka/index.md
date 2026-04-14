---
sidebar_position: 1
title: "Kafka Learning Path"
---

# 🚀 Kafka Learning Path

A structured roadmap to go from zero to deep expertise in Apache Kafka and its ecosystem.

**Start here →** [Kafka: The Complete Guide](./Kafka_The_Complete_Guide.md) — a single connected document that teaches everything from "what is Kafka?" to byte-level internals.

---

## 📍 Roadmap Overview

| Phase | Topic | Level |
|:-----:|-------|:------|
| 1 | **Fundamentals** — What is Kafka, use cases, terminology | 🟢 Beginner |
| 2 | **Core Architecture** — Brokers, partitions, replication | 🟢 Beginner |
| 3 | **Producers & Consumers** — Client APIs, offsets, rebalancing | 🟡 Intermediate |
| 4 | **ZooKeeper & Coordination** — Legacy coordination layer | 🟡 Intermediate |
| 5 | **KRaft Mode** — Raft-based metadata (no ZooKeeper) | 🔴 Advanced |
| 6 | **Kafka Streams & ksqlDB** — Real-time stream processing | 🔴 Advanced |
| 7 | **Schema Registry & Avro** — Data contracts & evolution | 🟣 Expert |
| 8 | **Operations & Monitoring** — Metrics, tuning, Connect | 🟣 Expert |
| 9 | **Security** — AuthN, AuthZ, encryption | 🟠 Specialty |
| 10 | **Advanced Patterns** — Event sourcing, CQRS, multi-DC | 🟠 Specialty |

> **Path:** `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10`

---

## 🟢 Phase 1–2 — Fundamentals & Architecture

> *Goal: Understand what Kafka is, why it exists, and how it stores and replicates data.*

**📖 Read:** [Kafka: The Complete Guide](./Kafka_The_Complete_Guide.md) — Parts 1–3 (The Problem, Core Concepts, Storage Engine)

Covers:
- [ ] Why Kafka exists and what problem it solves
- [ ] Topics, partitions, offsets, brokers, consumer groups
- [ ] The commit log, segments, sparse indexes
- [ ] Zero-copy transfer and page cache
- [ ] Log compaction

---

## 🟡 Phase 3 — Producers & Consumers

> *Goal: Understand how data flows in and out of Kafka — at the implementation level.*

**📖 Read:** [Kafka: The Complete Guide](./Kafka_The_Complete_Guide.md) — Parts 4, 5, 7 (Producers, Broker Internals, Consumers)

Covers:
- [ ] The RecordAccumulator, Sender thread, batching, and linger.ms
- [ ] Partitioning, compression, acks, idempotent producer
- [ ] Transactions and exactly-once delivery
- [ ] Broker request processing: Reactor pattern, purgatory
- [ ] Consumer poll loop, fetch prefetching, long polling
- [ ] Consumer group rebalancing (eager vs cooperative)
- [ ] Offset management (auto-commit vs manual)

---

## 🟡 Phase 4 — ZooKeeper & Coordination

> *Goal: Understand the legacy coordination layer.*

**📖 Read:** [ZooKeeper & Kafka Complete Guide](./ZooKeeper_and_Kafka_Complete_Guide.md)

Covers:
- [ ] ZooKeeper's role: controller election, broker registration, topic config
- [ ] ZNodes, watches, ephemeral nodes
- [ ] Why ZooKeeper became a bottleneck
- [ ] Migration path away from ZooKeeper

---

## 🔴 Phase 5 — KRaft Mode

> *Goal: Understand Kafka's new metadata management (no more ZooKeeper).*

**📖 Read:** [KRaft Complete Guide](./KRaft_Complete_Guide.md) + [Complete Guide](./Kafka_The_Complete_Guide.md) Part 8 (Controller)

Covers:
- [ ] KRaft architecture: Raft consensus in Kafka
- [ ] Controller quorum and metadata log
- [ ] KRaft vs ZooKeeper comparison
- [ ] Migration from ZooKeeper to KRaft

---

## 🔴 Phase 6 — Kafka Streams

> *Goal: Understand stream processing from topology compilation to exactly-once semantics.*

**📖 Read:** [Kafka: The Complete Guide](./Kafka_The_Complete_Guide.md) — Part 9 (Kafka Streams)

Covers:
- [ ] Topologies, sub-topologies, and tasks
- [ ] State stores (RocksDB) and changelog topics
- [ ] Repartitioning and co-partitioning requirements
- [ ] Joins: stream-stream, stream-table, table-table
- [ ] Windowing: tumbling, hopping, sliding, session
- [ ] Exactly-once semantics via Kafka transactions
- [ ] Interactive queries

---

## 🟣 Phase 7 — Schema Registry & Data Contracts

> *Goal: Enforce data quality in event-driven systems.*

- [ ] Why schemas matter (Avro, Protobuf, JSON Schema)
- [ ] Confluent Schema Registry
- [ ] Compatibility modes: backward, forward, full
- [ ] Schema evolution best practices

---

## 🟣 Phase 8 — Operations & Monitoring

> *Goal: Run Kafka reliably in production.*

- [ ] Key JMX metrics: under-replicated partitions, request latency, consumer lag
- [ ] Monitoring with Prometheus + Grafana
- [ ] Log retention and disk management
- [ ] Rolling upgrades and configuration tuning
- [ ] Kafka Connect: source and sink connectors

---

## 🟠 Phase 9 — Security

> *Goal: Secure Kafka end-to-end.*

- [ ] Authentication: SASL/PLAIN, SASL/SCRAM, mTLS
- [ ] Authorization: ACLs and RBAC
- [ ] Encryption: TLS in transit, at rest
- [ ] Audit logging

---

## 🟠 Phase 10 — Advanced Patterns

> *Goal: Architect production-grade event-driven systems.*

- [ ] Event sourcing and CQRS with Kafka
- [ ] Exactly-once semantics across services
- [ ] Multi-datacenter replication (MirrorMaker 2)
- [ ] Tiered storage
- [ ] Kafka on Kubernetes (Strimzi / Confluent Operator)

---

## 📚 All Guides

| Guide | What it covers |
|-------|---------------|
| [**Kafka: The Complete Guide**](./Kafka_The_Complete_Guide.md) | The main teaching document — everything from "what is Kafka?" to protocol internals, connected as a single narrative |
| [KRaft Complete Guide](./KRaft_Complete_Guide.md) | Deep-dive into Kafka's Raft-based metadata management |
| [ZooKeeper & Kafka Complete Guide](./ZooKeeper_and_Kafka_Complete_Guide.md) | ZooKeeper coordination model and its role in Kafka |
| [Parallel Consumer: Lag = 1 Analysis](./Parallel_Consumer_Lag_Analysis.md) | Deep investigation into why the Confluent parallel-consumer shows persistent consumer lag = 1 per partition |
| [Kafka Streams — Safely Changing Topologies](./Kafka_Streams_Topology_Changes.md) | How topology changes cause rebalance storms and TopologyExceptions, and how to avoid them |
