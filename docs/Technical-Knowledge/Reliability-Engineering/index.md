---
sidebar_position: 1
title: "Reliability Engineering Guide"
---

# 🛡️ Reliability Engineering (SRE) Guide

A comprehensive preparation guide for **senior software engineer** interviews — covering SRE fundamentals, resilience patterns, incident management, rate limiting, disaster recovery, and production readiness.

---

## 📍 Roadmap Overview

| # | Topic | Level | Focus |
|:-:|-------|:------|:------|
| 1 | **SRE Fundamentals** — SLOs, SLAs, SLIs, error budgets, toil reduction | 🟡 Intermediate | Foundations |
| 2 | **Resilience Patterns** — Circuit breaker, retry, bulkhead, graceful degradation | 🔴 Advanced | Reliability |
| 3 | **Rate Limiting & Traffic Management** — Token bucket, leaky bucket, throttling | 🟡 Intermediate | Protection |
| 4 | **Incident Management & Disaster Recovery** — Runbooks, postmortems, RTO/RPO, backups | 🔴 Advanced | Operations |
| 5 | **Common Interview Questions** — Scenario-based reliability questions | 🟣 Practice | Interview |

> **Recommended path:** `1 → 2 → 3 → 4 → 5`

---

## 🟡 Chapter 1 — SRE Fundamentals

> *Goal: Understand the core SRE philosophy, service level objectives, and how to measure reliability.*

**📖 Read:** [01 — SRE Fundamentals](./01-sre-fundamentals.md)

- [ ] Differentiate SLA, SLO, and SLI with concrete examples
- [ ] Calculate error budgets and explain their impact on feature velocity
- [ ] Define meaningful SLIs for different service types
- [ ] Explain the toil reduction philosophy
- [ ] Design SLO-based alerting strategies
- [ ] Describe the relationship between reliability and feature development

---

## 🔴 Chapter 2 — Resilience Patterns

> *Goal: Master the patterns that keep distributed systems running under failure conditions.*

**📖 Read:** [02 — Resilience Patterns](./02-resilience-patterns.md)

- [ ] Implement circuit breaker with states (closed, open, half-open)
- [ ] Design retry strategies with exponential backoff and jitter
- [ ] Apply the bulkhead pattern for fault isolation
- [ ] Implement graceful degradation for non-critical features
- [ ] Design timeout hierarchies across service calls
- [ ] Explain the difference between fail-fast and fail-safe approaches
- [ ] Handle cascading failures in microservice architectures

---

## 🟡 Chapter 3 — Rate Limiting & Traffic Management

> *Goal: Protect systems from traffic spikes and abuse with effective rate limiting.*

**📖 Read:** [03 — Rate Limiting](./03-rate-limiting.md)

- [ ] Implement token bucket and leaky bucket algorithms
- [ ] Compare fixed window, sliding window log, and sliding window counter
- [ ] Design distributed rate limiting across multiple instances
- [ ] Implement client-side vs server-side throttling
- [ ] Handle rate limiting in API gateway patterns
- [ ] Design backpressure mechanisms for async systems

---

## 🔴 Chapter 4 — Incident Management & Disaster Recovery

> *Goal: Respond to incidents effectively and design systems that recover from disasters.*

**📖 Read:** [04 — Incident Management & DR](./04-incident-management-dr.md)

- [ ] Structure an incident response process (detect, triage, mitigate, resolve)
- [ ] Write effective runbooks and playbooks
- [ ] Conduct blameless postmortems with action items
- [ ] Define RTO and RPO for different service tiers
- [ ] Design backup strategies (full, incremental, differential)
- [ ] Plan cross-region disaster recovery
- [ ] Implement canary restores and DR testing

---

## 🟣 Chapter 5 — Common Interview Questions

> *Goal: Practice real interview questions across all reliability topics.*

**📖 Read:** [05 — Common Interview Questions](./05-interview-questions.md)

- [ ] Design reliability for a payment processing system
- [ ] Plan incident response for a major outage scenario
- [ ] Set SLOs for a new service and define alerting rules
- [ ] Explain how to handle a dependent service going down
- [ ] Design a disaster recovery plan for a database

---

## 📚 All Chapters

| Chapter | Title | Key Topics |
|:-------:|-------|------------|
| [01](./01-sre-fundamentals.md) | **SRE Fundamentals** | SLA/SLO/SLI, error budgets, toil |
| [02](./02-resilience-patterns.md) | **Resilience Patterns** | Circuit breaker, retry, bulkhead, timeouts |
| [03](./03-rate-limiting.md) | **Rate Limiting** | Token bucket, sliding window, backpressure |
| [04](./04-incident-management-dr.md) | **Incident Management & DR** | Postmortems, RTO/RPO, backups, DR testing |
| [05](./05-interview-questions.md) | **Common Interview Questions** | Scenario-based reliability questions |
