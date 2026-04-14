---
sidebar_position: 1
title: "Security Interview Guide"
---

# 🔐 Security Interview Guide

A comprehensive preparation guide for **senior software engineer** security interviews — covering authentication, authorization, common web vulnerabilities, secure system design, cryptography fundamentals, and privacy compliance.

---

## 📍 Roadmap Overview

| # | Topic | Level | Focus |
|:-:|-------|:------|:------|
| 1 | **Authentication & Authorization** — Sessions, JWT, OAuth, RBAC, SSO | 🟡 Intermediate | Identity |
| 2 | **Web Vulnerabilities & Defenses** — SQL Injection, XSS, CSRF, CORS, SSRF | 🟡 Intermediate | Attack & Defense |
| 3 | **Cryptography & Secure Design** — Hashing, encryption, TLS, secrets management | 🔴 Advanced | Foundations |
| 4 | **Privacy & Compliance** — PII handling, GDPR, data retention, audit trails | 🟡 Intermediate | Governance |
| 5 | **Common Interview Questions** — Scenario-based, design, and conceptual questions | 🟣 Practice | Interview |

> **Recommended path:** `1 → 2 → 3 → 4 → 5`

---

## 🟡 Chapter 1 — Authentication & Authorization

> *Goal: Understand how modern systems verify identity and enforce access control.*

**📖 Read:** [01 — Authentication & Authorization](./01-authentication-authorization.md)

- [ ] Compare session-based auth vs JWT with trade-offs
- [ ] Walk through the OAuth 2.0 authorization code flow step by step
- [ ] Explain OpenID Connect and how it extends OAuth
- [ ] Implement RBAC and compare with ABAC
- [ ] Design SSO for a multi-service architecture
- [ ] Explain token refresh flows and revocation strategies
- [ ] Describe MFA and its implementation patterns

---

## 🟡 Chapter 2 — Web Vulnerabilities & Defenses

> *Goal: Identify, explain, and defend against the most common web application vulnerabilities.*

**📖 Read:** [02 — Web Vulnerabilities](./02-web-vulnerabilities.md)

- [ ] Demonstrate SQL injection attacks and parameterized query defense
- [ ] Explain stored, reflected, and DOM-based XSS with prevention
- [ ] Walk through CSRF attacks and token-based mitigation
- [ ] Configure CORS headers correctly for cross-origin requests
- [ ] Describe SSRF attacks and how to prevent them
- [ ] Know OWASP Top 10 categories and key mitigations
- [ ] Explain Content Security Policy (CSP) headers

---

## 🔴 Chapter 3 — Cryptography & Secure Design

> *Goal: Understand cryptographic building blocks and how to design secure systems.*

**📖 Read:** [03 — cryptography-secure-design](./03-cryptography-secure-design.md)

- [ ] Differentiate hashing vs encryption vs encoding
- [ ] Explain symmetric vs asymmetric encryption with use cases
- [ ] Describe secure password storage (bcrypt, scrypt, Argon2)
- [ ] Walk through TLS handshake and certificate chain of trust
- [ ] Design a secrets management system for microservices
- [ ] Explain key rotation and envelope encryption
- [ ] Understand digital signatures and their applications

---

## 🟡 Chapter 4 — Privacy & Compliance

> *Goal: Design systems that handle personal data responsibly and comply with regulations.*

**📖 Read:** [04 — Privacy & Compliance](./04-privacy-compliance.md)

- [ ] Classify PII and understand data sensitivity levels
- [ ] Explain GDPR key principles and engineer's responsibilities
- [ ] Design data retention and deletion policies
- [ ] Implement PII redaction in logs and traces
- [ ] Describe consent management and right-to-be-forgotten
- [ ] Design audit trails for compliance
- [ ] Understand data minimization and purpose limitation

---

## 🟣 Chapter 5 — Common Interview Questions

> *Goal: Practice real interview questions across all security topics.*

**📖 Read:** [05 — Common Interview Questions](./05-interview-questions.md)

- [ ] Design a secure authentication system for a new product
- [ ] Explain how to secure a REST API end to end
- [ ] Conduct a threat model for a given architecture
- [ ] Analyze a security incident and propose remediation
- [ ] Explain the principle of defense in depth with examples

---

## 📚 All Chapters

| Chapter | Title | Key Topics |
|:-------:|-------|------------|
| [01](./01-authentication-authorization.md) | **Authentication & Authorization** | Sessions, JWT, OAuth, RBAC, SSO, MFA |
| [02](./02-web-vulnerabilities.md) | **Web Vulnerabilities & Defenses** | SQLi, XSS, CSRF, CORS, SSRF, OWASP |
| [03](./03-cryptography-secure-design.md) | **Cryptography & Secure Design** | Hashing, encryption, TLS, secrets mgmt |
| [04](./04-privacy-compliance.md) | **Privacy & Compliance** | PII, GDPR, data retention, audit trails |
| [05](./05-interview-questions.md) | **Common Interview Questions** | Scenarios, design, threat modeling |
