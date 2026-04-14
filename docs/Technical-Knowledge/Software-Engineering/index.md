---
sidebar_position: 1
title: "Software Engineering Principles Guide"
---

# 🏛️ Software Engineering Principles Guide

A comprehensive preparation guide for **senior software engineer** interviews — covering SOLID principles, design patterns, clean architecture, testing strategies, code quality, and technical debt management.

---

## 📍 Roadmap Overview

| # | Topic | Level | Focus |
|:-:|-------|:------|:------|
| 1 | **Design Principles** — SOLID, DRY, KISS, YAGNI, Separation of Concerns | 🟢 Foundation | Principles |
| 2 | **Design Patterns** — Creational, Structural, Behavioral patterns | 🟡 Intermediate | Patterns |
| 3 | **Clean Architecture & Code Quality** — Layered architecture, refactoring, tech debt | 🟡 Intermediate | Architecture |
| 4 | **Testing Strategies** — Unit, integration, contract, E2E, chaos testing | 🟡 Intermediate | Quality |
| 5 | **Common Interview Questions** — Design discussions, code review, trade-offs | 🟣 Practice | Interview |

> **Recommended path:** `1 → 2 → 3 → 4 → 5`

---

## 🟢 Chapter 1 — Design Principles

> *Goal: Master the foundational principles that guide all good software design.*

**📖 Read:** [01 — Design Principles](./01-design-principles.md)

- [ ] Explain each SOLID principle with real code examples
- [ ] Apply SRP to decompose a monolithic class
- [ ] Identify OCP violations and refactor using abstractions
- [ ] Explain LSP with real violation scenarios
- [ ] Apply ISP to reduce coupling between components
- [ ] Demonstrate DIP with dependency injection
- [ ] Know DRY, KISS, YAGNI, and when each applies (and when to bend them)

---

## 🟡 Chapter 2 — Design Patterns

> *Goal: Know the essential Gang-of-Four patterns and when to apply them in real systems.*

**📖 Read:** [02 — Design Patterns](./02-design-patterns.md)

- [ ] Implement Singleton safely (thread-safe, enum-based, lazy)
- [ ] Use Factory Method and Abstract Factory for object creation
- [ ] Apply Strategy pattern for interchangeable algorithms
- [ ] Implement Observer/Pub-Sub for event-driven communication
- [ ] Use Builder pattern for complex object construction
- [ ] Apply Adapter and Decorator for interface wrapping
- [ ] Implement Dependency Injection and understand IoC containers

---

## 🟡 Chapter 3 — Clean Architecture & Code Quality

> *Goal: Design maintainable systems with clear boundaries and manage technical debt.*

**📖 Read:** [03 — Clean Architecture](./03-clean-architecture.md)

- [ ] Explain the dependency rule in clean/hexagonal architecture
- [ ] Differentiate layers: entities, use cases, adapters, frameworks
- [ ] Identify and articulate technical debt trade-offs
- [ ] Apply common refactoring patterns (extract method, move logic, decompose)
- [ ] Explain code smells and how to address them
- [ ] Design module boundaries for testability and changeability
- [ ] Compare monolith vs microservices from a code organization perspective

---

## 🟡 Chapter 4 — Testing Strategies

> *Goal: Design effective test strategies that provide confidence without slowing delivery.*

**📖 Read:** [04 — Testing Strategies](./04-testing-strategies.md)

- [ ] Explain the testing pyramid (unit → integration → E2E)
- [ ] Write effective unit tests with proper isolation and mocking
- [ ] Design integration tests for database and API layers
- [ ] Implement contract testing for service boundaries
- [ ] Understand TDD and BDD approaches with trade-offs
- [ ] Explain chaos engineering concepts (Chaos Monkey, fault injection)
- [ ] Design a test strategy for a microservices system

---

## 🟣 Chapter 5 — Common Interview Questions

> *Goal: Practice real interview questions across all software engineering topics.*

**📖 Read:** [05 — Common Interview Questions](./05-interview-questions.md)

- [ ] Review a code snippet and identify violations of SOLID principles
- [ ] Propose a design pattern for a given scenario
- [ ] Discuss refactoring strategies for legacy code
- [ ] Explain your approach to testing a complex feature
- [ ] Discuss technical debt trade-offs in a real project scenario

---

## 📚 All Chapters

| Chapter | Title | Key Topics |
|:-------:|-------|------------|
| [01](./01-design-principles.md) | **Design Principles** | SOLID, DRY, KISS, YAGNI, SoC |
| [02](./02-design-patterns.md) | **Design Patterns** | Singleton, Factory, Strategy, Observer, DI |
| [03](./03-clean-architecture.md) | **Clean Architecture** | Layers, hex architecture, refactoring, tech debt |
| [04](./04-testing-strategies.md) | **Testing Strategies** | Unit, integration, contract, E2E, chaos testing |
| [05](./05-interview-questions.md) | **Common Interview Questions** | Code review, design discussions, trade-offs |
