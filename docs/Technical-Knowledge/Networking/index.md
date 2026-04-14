---
sidebar_position: 1
title: "Networking Interview Guide"
---

# 🌐 Networking Interview Guide

A comprehensive preparation guide for **senior software engineer** networking interviews — covering the OSI model, TCP/UDP, HTTP/HTTPS, DNS, CDN, load balancing, network security, socket programming, and API design.

---

## 📍 Roadmap Overview

| # | Topic | Level | Focus |
|:-:|-------|:------|:------|
| 1 | **OSI & TCP/IP Models** — Layers, protocols, encapsulation | 🟢 Foundation | Theory |
| 2 | **TCP, UDP & Transport Layer** — Handshakes, flow/congestion control, QUIC | 🟡 Intermediate | Reliability |
| 3 | **HTTP, HTTPS & Application Layer** — HTTP versions, TLS, WebSocket, CORS | 🟡 Intermediate | Web |
| 4 | **DNS, CDN & Load Balancing** — Resolution, caching, L4/L7 balancing | 🟡 Intermediate | Infrastructure |
| 5 | **Network Security** — Attacks, firewalls, OAuth, JWT, rate limiting | 🔴 Advanced | Security |
| 6 | **Socket Programming & I/O Models** — Sockets, epoll, reactor pattern, C10K | 🔴 Advanced | Systems |
| 7 | **REST, gRPC & API Design** — REST, gRPC, GraphQL, versioning | 🔴 Advanced | Design |
| 8 | **Common Interview Questions** — Classic, scenario, and design questions | 🟣 Practice | Interview |

> **Recommended path:** `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`

---

## 🟢 Chapter 1 — OSI & TCP/IP Models

> *Goal: Understand the layered architecture of networking and how data flows through protocol stacks.*

**📖 Read:** [01 — OSI & TCP/IP Models](./01-osi-tcp-ip-model.md)

- [ ] Describe all 7 layers of the OSI model with protocols and devices
- [ ] Map OSI layers to the TCP/IP 4-layer model
- [ ] Explain encapsulation and decapsulation with PDU names
- [ ] List common protocols and their port numbers at each layer
- [ ] Draw the header wrapping process from application to physical layer
- [ ] Compare OSI vs TCP/IP models and explain why TCP/IP won in practice

---

## 🟡 Chapter 2 — TCP, UDP & Transport Layer

> *Goal: Master TCP internals — handshakes, state machines, flow/congestion control — and know when UDP is the right choice.*

**📖 Read:** [02 — TCP, UDP & Transport Layer](./02-transport-layer.md)

- [ ] Draw the TCP header and explain key fields (sequence, acknowledgment, flags)
- [ ] Walk through the 3-way handshake and 4-way termination with sequence numbers
- [ ] Describe all TCP states and transitions (ESTABLISHED, TIME_WAIT, etc.)
- [ ] Explain sliding window, slow start, congestion avoidance, fast retransmit
- [ ] Compare TCP vs UDP with concrete use cases for each
- [ ] Explain Nagle's algorithm, TCP_NODELAY, and TCP keepalive
- [ ] Describe QUIC protocol and its advantages over TCP

---

## 🟡 Chapter 3 — HTTP, HTTPS & Application Layer

> *Goal: Deeply understand HTTP protocol versions, TLS security, and modern web protocols.*

**📖 Read:** [03 — HTTP, HTTPS & Application Layer](./03-application-layer.md)

- [ ] Compare HTTP/1.0, HTTP/1.1, HTTP/2, and HTTP/3
- [ ] Know HTTP methods with idempotency and safety properties
- [ ] Categorize and explain important HTTP status codes
- [ ] Walk through a TLS 1.3 handshake step by step
- [ ] Explain certificate chain of trust and Perfect Forward Secrecy
- [ ] Describe CORS, preflight requests, and how to configure them
- [ ] Compare WebSocket vs HTTP long polling vs Server-Sent Events
- [ ] Explain HTTP/2 multiplexing, HPACK, and binary framing

---

## 🟡 Chapter 4 — DNS, CDN & Load Balancing

> *Goal: Understand the infrastructure that makes the internet fast, reliable, and scalable.*

**📖 Read:** [04 — DNS, CDN & Load Balancing](./04-dns-cdn-load-balancing.md)

- [ ] Trace DNS resolution from browser to authoritative nameserver
- [ ] Know all DNS record types and their purposes
- [ ] Explain CDN pull vs push strategies and cache invalidation
- [ ] Compare L4 vs L7 load balancing with real-world examples
- [ ] Describe load balancing algorithms (round-robin, least connections, consistent hashing)
- [ ] Differentiate reverse proxy, load balancer, and API gateway
- [ ] Explain sticky sessions, health checks, and failover

---

## 🔴 Chapter 5 — Network Security

> *Goal: Understand common attack vectors, defense strategies, and authentication/authorization protocols.*

**📖 Read:** [05 — Network Security](./05-network-security.md)

- [ ] Describe DDoS attack types and mitigation strategies
- [ ] Explain MITM, XSS, CSRF, SQL Injection with prevention techniques
- [ ] Compare stateless vs stateful firewalls and WAF
- [ ] Walk through OAuth 2.0 authorization code flow
- [ ] Explain JWT structure, signing, and common pitfalls
- [ ] Describe mTLS and when to use it
- [ ] Compare rate limiting algorithms: token bucket, sliding window, etc.
- [ ] Know OWASP Top 10 vulnerabilities

---

## 🔴 Chapter 6 — Socket Programming & I/O Models

> *Goal: Understand low-level networking primitives and high-performance I/O strategies.*

**📖 Read:** [06 — Socket Programming & I/O Models](./06-socket-programming.md)

- [ ] Describe the TCP socket lifecycle from creation to close
- [ ] Write basic TCP server/client code in Java and Python
- [ ] Compare all 5 I/O models (blocking, non-blocking, multiplexing, signal-driven, async)
- [ ] Explain select vs poll vs epoll with performance characteristics
- [ ] Describe the reactor pattern and event-driven architecture
- [ ] Explain the C10K problem and its solutions
- [ ] Understand connection pooling and its benefits

---

## 🔴 Chapter 7 — REST, gRPC & API Design

> *Goal: Design robust, scalable APIs using modern paradigms and best practices.*

**📖 Read:** [07 — REST, gRPC & API Design](./07-api-design.md)

- [ ] Explain REST constraints and Richardson Maturity Model
- [ ] Design REST APIs with proper naming, versioning, and pagination
- [ ] Compare gRPC vs REST with use cases for each
- [ ] Explain Protocol Buffers and gRPC streaming types
- [ ] Describe GraphQL schema, queries, and the N+1 problem
- [ ] Choose appropriate API versioning and authentication strategies
- [ ] Design idempotent APIs and implement the API gateway pattern

---

## 🟣 Chapter 8 — Common Interview Questions

> *Goal: Practice real interview questions across all networking topics.*

**📖 Read:** [08 — Common Interview Questions](./08-interview-questions.md)

- [ ] Answer "What happens when you type google.com?" with full detail
- [ ] Diagnose API latency issues systematically
- [ ] Design rate limiting for a distributed API
- [ ] Architect a real-time chat system from a networking perspective
- [ ] Recall key port numbers and latency numbers from memory
- [ ] Handle scenario questions about DDoS, WebSocket scaling, and more

---

## 📚 All Chapters

| Chapter | Title | Key Topics |
|:-------:|-------|------------|
| [01](./01-osi-tcp-ip-model.md) | **OSI & TCP/IP Models** | 7 layers, protocols, encapsulation, PDUs |
| [02](./02-transport-layer.md) | **TCP, UDP & Transport Layer** | Handshakes, TCP states, flow control, QUIC |
| [03](./03-application-layer.md) | **HTTP, HTTPS & Application Layer** | HTTP versions, TLS, CORS, WebSocket |
| [04](./04-dns-cdn-load-balancing.md) | **DNS, CDN & Load Balancing** | DNS resolution, CDN caching, L4/L7 LB |
| [05](./05-network-security.md) | **Network Security** | DDoS, XSS, CSRF, OAuth, JWT, rate limiting |
| [06](./06-socket-programming.md) | **Socket Programming & I/O Models** | Sockets, epoll, reactor pattern, C10K |
| [07](./07-api-design.md) | **REST, gRPC & API Design** | REST, gRPC, GraphQL, API gateway |
| [08](./08-interview-questions.md) | **Common Interview Questions** | Classic, scenario, and design questions |
