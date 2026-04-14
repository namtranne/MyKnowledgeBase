---
sidebar_position: 6
title: "05 — Common Interview Questions"
slug: 05-interview-questions
---

# 🎯 Common Interview Questions

This chapter contains **20 interview questions** spanning authentication, web vulnerabilities, cryptography, system design, and privacy. Each question includes a detailed answer that demonstrates senior-level depth — not just *what*, but *why* and *how*.

---

## 📋 Quick Reference Tables

### Common HTTP Security Headers

| Header | Recommended Value | Purpose |
|--------|-------------------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'` | Restrict content sources |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cache-Control` | `no-store` (sensitive pages) | Prevent caching |

### OWASP Top 10 (2021) Summary

| # | Category | One-Line Mitigation |
|:-:|----------|---------------------|
| A01 | Broken Access Control | Deny by default; enforce server-side |
| A02 | Cryptographic Failures | AES-256-GCM, TLS 1.3, Argon2 for passwords |
| A03 | Injection | Parameterized queries everywhere |
| A04 | Insecure Design | Threat modeling, secure design patterns |
| A05 | Security Misconfiguration | Automated hardening, remove defaults |
| A06 | Vulnerable Components | Dependency scanning (Dependabot, Snyk) |
| A07 | Auth & ID Failures | MFA, rate limiting, strong session mgmt |
| A08 | Software & Data Integrity | Signed artifacts, secure CI/CD |
| A09 | Logging & Monitoring Failures | Centralized logging, real-time alerting |
| A10 | SSRF | URL allowlists, network segmentation |

---

## Category 1: Authentication & Authorization

### Q1. Explain the difference between session-based auth and JWT. When would you choose each?

**Answer:**

| Dimension | Session-Based | JWT |
|-----------|--------------|-----|
| **State** | Stateful — server stores session in Redis/DB | Stateless — token contains all claims |
| **Scalability** | Requires shared session store across instances | No server-side state; any server can validate |
| **Revocation** | Instant — delete session from store | Difficult — token valid until expiry |
| **Size** | Small cookie (~32 bytes) | Large (~800+ bytes with claims) |
| **Best for** | Traditional web apps, monoliths | APIs, microservices, SPAs, mobile |

**When to choose:**
- **Session-based** when you need instant revocation (banking apps), have a monolith or few servers, and need simplicity.
- **JWT** for microservice architectures where each service needs to independently verify identity without calling a central auth service.
- **Hybrid (recommended for production):** Short-lived JWTs (5-15 min) for API access + server-side refresh tokens for revocation control. This combines JWT scalability with session revocability.

:::tip Senior-Level Insight
In practice, "stateless JWT" is a myth at scale. You still need a blacklist (for logout, password change, compromised tokens), which means a server-side store. The question is whether you check it on every request (like sessions) or only on token refresh. The hybrid approach checks the blacklist only during token refresh, giving you 99% of the scalability benefit.
:::

---

### Q2. Walk through the OAuth 2.0 Authorization Code flow with PKCE. Why is PKCE important?

**Answer:**

```
1. Client generates:
   code_verifier  = cryptographically_random(43-128 chars)
   code_challenge = BASE64URL(SHA256(code_verifier))

2. Client redirects user to authorization server:
   GET /authorize?
     response_type=code&
     client_id=CLIENT_ID&
     redirect_uri=https://app.com/callback&
     scope=openid profile email&
     state=RANDOM_STATE&
     code_challenge=CHALLENGE&
     code_challenge_method=S256

3. User authenticates & grants consent

4. Authorization server redirects back:
   GET /callback?code=AUTH_CODE&state=RANDOM_STATE

5. Client exchanges code for tokens (back-channel):
   POST /token
   grant_type=authorization_code&
   code=AUTH_CODE&
   redirect_uri=https://app.com/callback&
   code_verifier=VERIFIER      ◀── proves identity

6. Authorization server verifies:
   SHA256(code_verifier) == stored_code_challenge
   If match → issue access_token + refresh_token + id_token
```

**Why PKCE matters:** Without PKCE, public clients (SPAs, mobile apps) cannot securely store a `client_secret`. An attacker who intercepts the authorization code (via a malicious app with the same custom URL scheme on mobile, or through browser history) could exchange it for tokens. PKCE ensures only the original requester — who generated the `code_verifier` — can complete the exchange.

**Key point:** PKCE is now recommended for **all** OAuth clients (public and confidential) per OAuth 2.1 specification, not just SPAs/mobile.

---

### Q3. Design a role-based access control system for a multi-tenant SaaS application.

**Answer:**

```
┌──────────────────────────────────────────────────────┐
│                 RBAC FOR MULTI-TENANT SAAS            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Tenant: "Acme Corp"                                 │
│  ├── Role: "Admin"                                   │
│  │   ├── users.create, users.read, users.update,     │
│  │   │   users.delete                                │
│  │   ├── billing.manage                              │
│  │   └── settings.manage                             │
│  ├── Role: "Editor"                                  │
│  │   ├── content.create, content.read,               │
│  │   │   content.update, content.publish             │
│  │   └── assets.upload                               │
│  └── Role: "Viewer"                                  │
│      └── content.read, assets.read                   │
│                                                      │
│  User: "Alice" → Tenant: "Acme" → Role: "Admin"     │
│  User: "Bob"   → Tenant: "Acme" → Role: "Editor"    │
│  User: "Carol" → Tenant: "Beta" → Role: "Admin"     │
│  (Carol CANNOT access Acme data — tenant isolation)  │
└──────────────────────────────────────────────────────┘
```

**Design decisions:**
1. **Tenant isolation is non-negotiable** — every query must include `tenant_id`. Use Row-Level Security (RLS) in PostgreSQL or a middleware tenant filter.
2. **Roles are per-tenant** — Alice can be Admin in Acme and Viewer in Beta.
3. **Permissions are granular** — `resource.action` format (e.g., `content.publish`).
4. **Super-admin role** — platform-level role for SaaS operations, never visible to tenants.
5. **Check authorization server-side** — never trust client-side role checks.

```python
def authorize(user, tenant_id, permission):
    if user.tenant_id != tenant_id:
        raise ForbiddenError("Cross-tenant access denied")
    user_permissions = get_permissions_for_role(user.role, tenant_id)
    if permission not in user_permissions:
        raise ForbiddenError(f"Missing permission: {permission}")
```

---

### Q4. How would you implement secure token refresh with theft detection?

**Answer:**

Use **refresh token rotation with family tracking**:

1. Each refresh token belongs to a "family" (the initial login session).
2. When a refresh token is used, it's invalidated and a new one is issued.
3. If a previously-used refresh token is presented again, it means either the user or an attacker is using a stale token — **invalidate the entire family**.

```
Legitimate flow:
  Login        → RT-1 issued (family: F1)
  Refresh #1   → RT-1 consumed, RT-2 issued (family: F1)
  Refresh #2   → RT-2 consumed, RT-3 issued (family: F1)

Theft scenario:
  Attacker steals RT-2 before user refreshes
  Attacker uses RT-2  → RT-2 consumed, RT-A issued (attacker has access)
  User uses RT-2      → RT-2 already consumed!
                       → ALERT: token reuse detected
                       → Invalidate ALL tokens in family F1
                       → Both attacker (RT-A) and user must re-login
```

This is the approach recommended by the OAuth 2.0 Security Best Current Practice (RFC 6819) and used by Auth0.

---

## Category 2: Web Vulnerabilities

### Q5. You discover a SQL injection vulnerability in production. Walk me through your response.

**Answer:**

**Immediate (0-1 hour):**
1. **Assess scope** — Is the vulnerability actively exploited? Check WAF logs, DB audit logs for suspicious queries.
2. **Deploy a hotfix** — Add parameterized queries or input validation to block the attack vector. If a full fix isn't feasible immediately, deploy a WAF rule to block the payload pattern.
3. **Notify security team** — Trigger incident response process.

**Short-term (1-24 hours):**
4. **Determine impact** — Was data exfiltrated? Check query logs for `UNION SELECT`, `INTO OUTFILE`, unusual data access patterns.
5. **Rotate credentials** — If the DB user had write access, assume compromised. Rotate DB passwords, API keys, and any secrets the DB had access to.
6. **Audit similar endpoints** — Grep the codebase for string concatenation in SQL queries. Same pattern likely exists elsewhere.

**Medium-term (1-7 days):**
7. **Root cause analysis** — Why wasn't this caught? Missing code review? No SAST scanning? No input validation middleware?
8. **Remediate systematically** — Migrate all raw queries to parameterized queries or ORM. Add SAST tools (Semgrep, SonarQube) to CI/CD.
9. **Add monitoring** — WAF rules, DB query anomaly detection, rate limiting on the endpoint.

**Long-term:**
10. **Blameless post-mortem** — Document timeline, impact, remediation, and preventive measures.
11. **If data was breached** — Legal and compliance team must assess notification requirements (GDPR: 72 hours to supervisory authority).

---

### Q6. Explain the difference between stored, reflected, and DOM-based XSS. How do you prevent each?

**Answer:**

| Type | Where Payload Lives | Server Involvement | Example |
|------|--------------------|--------------------|---------|
| **Stored** | Database (persisted) | Server stores and serves it | Malicious comment saved in DB, rendered to all viewers |
| **Reflected** | URL/request (transient) | Server reflects it in response | Search query `?q=<script>...` echoed in results page |
| **DOM-based** | URL fragment/client state | ❌ Server never sees it | `document.innerHTML = location.hash` |

**Prevention layers:**

1. **Output encoding** (primary defense for all types) — HTML-encode `< > & " '` before rendering user data. Frameworks like React do this automatically.
2. **Content Security Policy** — `script-src 'self'` blocks inline scripts and untrusted sources. This is the single most effective header against XSS.
3. **Input validation** — Whitelist expected patterns (but never rely on this alone — encoding is the real defense).
4. **For DOM-based:** Use `textContent` instead of `innerHTML`. Avoid `eval()`, `document.write()`, and `setTimeout(string)`.
5. **HttpOnly cookies** — Even if XSS occurs, attacker can't steal session cookies via `document.cookie`.

:::tip Senior-Level Insight
The most common XSS in modern apps comes from framework escape hatches: React's `dangerouslySetInnerHTML`, Angular's `bypassSecurityTrustHtml`, Vue's `v-html`. In code reviews, flag every use of these and require justification. If user input ever flows into these, it's XSS.
:::

---

### Q7. How does CSRF work, and why doesn't CORS prevent it?

**Answer:**

**CSRF works because browsers automatically attach cookies** (including session cookies) to any request to the cookie's domain, regardless of which site initiated the request. A form on `evil.com` submitting a POST to `bank.com/transfer` will include the victim's `bank.com` session cookie.

**CORS does not prevent CSRF because:**
- CORS blocks the **response** from being read by JavaScript, not the **request** from being sent.
- A CSRF form submission (POST with `application/x-www-form-urlencoded`) is a "simple request" — **no preflight is triggered**.
- The server processes the request and performs the action. CORS only prevents `evil.com`'s JavaScript from reading the response, which is irrelevant — the damage (money transfer) is already done.

**What actually prevents CSRF:**
1. **SameSite cookies** (`Lax` or `Strict`) — browser won't send cookies on cross-site POST requests.
2. **CSRF tokens** — server-generated token embedded in form; validated on submission.
3. **Custom headers** — Requiring `X-Requested-With: XMLHttpRequest` triggers a preflight, which CORS *will* block.
4. **Origin header validation** — Check that the `Origin` header matches your domain.

---

### Q8. What is SSRF and why is it particularly dangerous in cloud environments?

**Answer:**

**SSRF** (Server-Side Request Forgery) occurs when an attacker tricks a server into making HTTP requests to internal resources. The server acts as a proxy, bypassing network firewalls that protect internal services.

**Why it's especially dangerous in cloud:**
- **Instance Metadata Service (IMDS):** AWS instances expose temporary credentials at `http://169.254.169.254/latest/meta-data/iam/security-credentials/`. An SSRF vulnerability lets an attacker steal IAM credentials with whatever permissions the instance role has.
- **Internal APIs:** Kubernetes service discovery, internal admin panels, databases — all reachable from the server's network.
- **Cloud control plane:** With stolen credentials, attackers can access S3 buckets, DynamoDB tables, or even escalate to account admin.

**The Capital One breach (2019)** was a textbook SSRF → IMDS attack: the attacker exploited an SSRF in a WAF to access the EC2 metadata service, obtained IAM credentials, and exfiltrated 100M+ customer records from S3.

**Prevention:**
1. **IMDSv2** (AWS) — requires a PUT request with a hop-limited token before metadata access.
2. **URL allowlists** — only permit requests to known-good domains.
3. **Block private IP ranges** — deny `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`.
4. **Network segmentation** — application servers shouldn't reach metadata endpoints directly.
5. **Disable unused URL schemes** — block `file://`, `gopher://`, `dict://`.

---

## Category 3: Cryptography

### Q9. Explain the difference between hashing, encryption, and encoding. Give a use case for each.

**Answer:**

| | Encoding | Hashing | Encryption |
|-|----------|---------|------------|
| **Direction** | Two-way (no secret) | One-way | Two-way (with key) |
| **Purpose** | Data representation | Integrity, fingerprinting | Confidentiality |
| **Key needed?** | No | No | Yes |
| **Deterministic?** | Yes | Yes | No (with IV/nonce) |
| **Use case** | Base64 for binary in JSON, URL encoding | Password storage (bcrypt), checksums (SHA-256) | Protecting data at rest (AES-GCM), TLS |

**Common mistake to avoid:** Using Base64 for "encryption." Base64 is trivially reversible — it's encoding, not security. The `Authorization: Basic` header is just Base64-encoded `username:password`.

---

### Q10. Why is bcrypt preferred over SHA-256 for password hashing?

**Answer:**

SHA-256 is designed to be **fast** — modern GPUs can compute billions of SHA-256 hashes per second. This makes brute-force attacks trivial:

```
SHA-256 speed:  ~10 billion hashes/sec (GPU)
8-char password: 62^8 ≈ 218 trillion combinations
Time to crack:   ~6 hours

bcrypt speed:   ~30,000 hashes/sec (GPU, cost factor 12)
Time to crack:  ~230 years
```

**bcrypt is deliberately slow** — it has a configurable cost factor (work factor) that controls how many iterations are performed. Each increment doubles the time. It also includes a built-in salt (no separate salt management) and is resistant to GPU/ASIC acceleration because of its memory-access pattern.

**OWASP recommended hierarchy:**
1. **Argon2id** (best — memory-hard, PHC winner)
2. **bcrypt** (widely supported, proven)
3. **scrypt** (memory-hard, good alternative)
4. **PBKDF2 with SHA-256** (NIST approved, but needs ≥600,000 iterations)
5. ❌ **SHA-256/SHA-512** (too fast, even with salt)
6. ❌ **MD5** (broken, collisions found)

---

### Q11. Walk through the TLS 1.3 handshake. What improved over TLS 1.2?

**Answer:**

```
TLS 1.3 (1-RTT):
  Client → Server:  ClientHello + key_share (ECDH public key)
  Server → Client:  ServerHello + key_share + {Certificate} + {Finished}
  Client → Server:  {Finished}
  Both:             Application data flows (encrypted)

  Total: 1 round trip (vs 2 in TLS 1.2)
  0-RTT resumption: possible but has replay risks
```

**Key improvements over TLS 1.2:**

| Improvement | TLS 1.2 | TLS 1.3 |
|-------------|---------|---------|
| **Round trips** | 2-RTT handshake | 1-RTT (0-RTT for resumption) |
| **Forward secrecy** | Optional (RSA key exchange allowed) | Mandatory (ECDHE only) |
| **Cipher suites** | ~300 options (many weak) | 5 strong options only |
| **Certificate privacy** | Sent in cleartext | Encrypted (after key exchange) |
| **Removed insecure** | Still allowed | RSA key exchange, CBC mode, RC4, SHA-1, compression all removed |

**Why this matters:** TLS 1.3 eliminates the possibility of misconfiguration by removing weak options entirely. You can't accidentally enable RSA key exchange (no forward secrecy) or CBC mode (POODLE/BEAST attacks) because they don't exist in the protocol.

---

### Q12. What is envelope encryption and why do cloud providers use it?

**Answer:**

Envelope encryption uses **two layers of keys:**

1. **Data Encryption Key (DEK)** — encrypts the actual data (AES-256-GCM). Generated per object/record. Operations are local and fast (hardware-accelerated).
2. **Key Encryption Key (KEK)** — encrypts the DEK. Stored in a KMS (AWS KMS, Azure Key Vault). Never leaves the KMS in plaintext.

```
Encrypt:
  KMS.GenerateDataKey() → {plaintext_DEK, encrypted_DEK}
  ciphertext = AES_GCM(plaintext_DEK, data)
  Store: ciphertext + encrypted_DEK
  Discard: plaintext_DEK (from memory)

Decrypt:
  KMS.Decrypt(encrypted_DEK) → plaintext_DEK
  data = AES_GCM_Decrypt(plaintext_DEK, ciphertext)
  Discard: plaintext_DEK
```

**Why cloud providers use it:**
1. **Performance** — Encrypting terabytes of S3 data directly with KMS would be impossibly slow (KMS has API rate limits and network latency). DEKs are local and fast.
2. **Key rotation** — Rotating the KEK only requires re-encrypting DEKs (tiny), not re-encrypting all data (massive).
3. **Blast radius** — Each object has its own DEK. Compromising one DEK only exposes one object.
4. **Compliance** — KMS provides audit logging of every key operation, satisfying PCI DSS and HIPAA requirements.

---

## Category 4: System Design

### Q13. Design secure authentication for a mobile banking app.

**Answer:**

```
┌─────────────────────────────────────────────────────────┐
│           MOBILE BANKING AUTH ARCHITECTURE                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Registration:                                          │
│  1. Email/phone verification (OTP)                      │
│  2. KYC identity verification                           │
│  3. Set strong password (12+ chars, zxcvbn score ≥ 3)   │
│  4. Enroll MFA (TOTP or biometric)                      │
│  5. Device binding (device fingerprint stored)          │
│                                                         │
│  Login Flow:                                            │
│  1. Username/email + password                           │
│  2. MFA challenge (TOTP or biometric)                   │
│  3. Device verification (known device?)                 │
│  4. Risk assessment (new IP? new location? new device?) │
│  5. Issue tokens:                                       │
│     - Access token: JWT, 5 min expiry, RS256            │
│     - Refresh token: opaque, stored in secure DB,       │
│       30 day expiry, rotation on each use               │
│                                                         │
│  Token Storage (Mobile):                                │
│  - iOS: Keychain (kSecAttrAccessibleWhenUnlockedThisDeviceOnly)│
│  - Android: EncryptedSharedPreferences + Keystore       │
│  - NEVER in SharedPreferences, UserDefaults, or files   │
│                                                         │
│  Session Security:                                      │
│  - Re-authenticate for sensitive ops (transfers > $X)   │
│  - Step-up auth for adding new payees                   │
│  - Automatic session timeout after 5 min inactivity     │
│  - Remote session revocation (user can kill sessions)   │
│  - Certificate pinning to prevent MitM                  │
│                                                         │
│  Monitoring:                                            │
│  - Anomaly detection (unusual transaction patterns)     │
│  - Velocity checks (too many transfers too fast)        │
│  - Device trust scoring                                 │
│  - Real-time fraud alerts                               │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Short-lived access tokens (5 min)** — minimize window if token is compromised.
- **Certificate pinning** — the app only trusts specific certificates, preventing proxy-based MitM attacks.
- **Step-up authentication** — viewing balance needs standard auth; transferring money needs re-authentication.
- **Device binding** — if login from a new device, require full re-verification.

---

### Q14. How would you secure a REST API end-to-end?

**Answer:**

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 | Enforce HTTPS, HSTS, certificate transparency |
| **Authentication** | OAuth 2.0 + JWT | Authorization code + PKCE; validate JWT signature, `iss`, `aud`, `exp` |
| **Authorization** | RBAC/ABAC | Middleware checks permissions per endpoint; deny by default |
| **Input validation** | Schema validation | JSON Schema, Zod, or Joi; reject extra fields |
| **Rate limiting** | Token bucket | Per-user, per-IP, per-endpoint; return `429 Too Many Requests` |
| **Output** | Minimal exposure | Don't leak stack traces, internal IDs, or DB schema in errors |
| **Logging** | Structured audit log | Log who, what, when, from where — without PII |
| **Headers** | Security headers | CORS whitelist, CSP, X-Content-Type-Options |
| **Dependencies** | Supply chain security | Dependabot, lockfile integrity, SBOM |
| **Testing** | Automated security tests | SAST in CI, DAST in staging, dependency scanning |

```
Request lifecycle:
  Client → TLS → WAF → Rate Limiter → Auth Middleware →
  Input Validation → Business Logic → Output Sanitization →
  Audit Logging → Response
```

---

### Q15. Design a secrets management system for a microservices architecture.

**Answer:**

```
┌──────────────────────────────────────────────────────────┐
│           SECRETS MANAGEMENT ARCHITECTURE                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐   │
│  │  Vault   │    │  Vault       │    │  Vault        │   │
│  │  Primary │◀──▶│  Standby     │◀──▶│  Standby      │   │
│  │  (Raft   │    │  (auto-      │    │  (auto-       │   │
│  │  leader) │    │  unseal)     │    │  unseal)      │   │
│  └─────┬────┘    └──────────────┘    └───────────────┘   │
│        │                                                 │
│        │ Auth: Kubernetes ServiceAccount token            │
│        │                                                 │
│  ┌─────▼─────────────────────────────────────────────┐   │
│  │  Service A        Service B        Service C      │   │
│  │                                                   │   │
│  │  1. Pod starts                                    │   │
│  │  2. Vault Agent (sidecar) authenticates           │   │
│  │     via K8s ServiceAccount JWT                    │   │
│  │  3. Vault issues dynamic DB credentials           │   │
│  │     (unique per pod, TTL = 1 hour)                │   │
│  │  4. Vault Agent auto-renews before expiry         │   │
│  │  5. On pod termination, credentials are revoked   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Key benefits:                                           │
│  - No secrets in env vars, config files, or code         │
│  - Dynamic secrets: each pod gets unique credentials     │
│  - Automatic rotation: credentials expire and renew      │
│  - Audit trail: every secret access is logged            │
│  - Least privilege: scoped policies per service          │
└──────────────────────────────────────────────────────────┘
```

**Why dynamic secrets are superior to static secrets:**
- Static DB password shared by 50 pods → if leaked, all 50 are compromised, and you must rotate everywhere simultaneously.
- Dynamic credentials per pod → if leaked, only that pod's credentials are compromised. Revoke one set, no impact on others.

---

## Category 5: Privacy & Compliance

### Q16. How do you handle the "right to be forgotten" in a system with multiple data stores?

**Answer:**

This is one of the hardest problems in privacy engineering. My approach:

1. **Data inventory** — Maintain a catalog of every service/store that holds PII. This is the prerequisite for everything else.

2. **Deletion orchestration service** — A central service that receives deletion requests and coordinates across all stores:

```
Deletion request → Identity verification → Legal hold check →
  ├── Primary DB: DELETE user
  ├── Search index: Remove from Elasticsearch
  ├── Cache: Invalidate Redis keys
  ├── Data warehouse: DELETE or anonymize in Redshift/BigQuery
  ├── Logs: Replace PII with tombstone (can't delete individual log entries)
  ├── Backups: Add to deletion manifest (checked during any restore)
  ├── Third-party: API calls to sub-processors (Stripe, SendGrid)
  └── Audit log: Record THAT deletion occurred (not what was deleted)
```

3. **Exceptions** — Some data must be retained:
   - Financial records required by tax law (retain but restrict access)
   - Data needed for active legal proceedings
   - Aggregated/anonymized data (no longer PII)

4. **Verification** — Run a post-deletion scan to confirm PII was removed from all known stores.

5. **Response** — Confirm deletion to the data subject within 30 days (GDPR requirement).

---

### Q17. How do you prevent PII from leaking into logs?

**Answer:**

**Prevention (before PII enters logs):**

1. **Structured logging with allowlists** — Instead of logging arbitrary objects, define exactly which fields are logged per event type.
2. **PII-aware log framework** — Custom filter/processor that scans log messages for patterns (emails, SSNs, credit cards) and redacts them.
3. **Separate PII and operational data** — Use a correlation ID that links to PII in a restricted store, not PII itself in logs.

```python
# Pattern: Log correlation IDs, not PII
logger.info("order_created", extra={
    "order_id": order.id,
    "user_ref": hash(user.id),   # pseudonymized reference
    "amount": order.total,
    "items": len(order.items),
    # NOT: email, name, address, card_number
})
```

**Detection (find PII that leaked):**

4. **PII scanning pipeline** — Run regex-based scanners (Amazon Macie, custom scripts) against log stores to detect leaks.
5. **CI/CD checks** — Static analysis rules that flag `logger.info(user)` or `console.log(request.body)` patterns.

**Remediation (after PII leaks):**

6. **Retroactive redaction** — If PII is found in logs, replace it across all log storage tiers. This is expensive and error-prone, which is why prevention is critical.

---

### Q18. Explain GDPR's data minimization principle with a concrete engineering example.

**Answer:**

**Principle:** Collect only the personal data that is **adequate, relevant, and limited** to what is necessary for the specified purpose.

**Example — user registration:**

```
❌ Over-collection:
  Required fields: name, email, password, phone, date_of_birth,
  gender, home_address, employer, job_title, social_media_profiles

  Why it's wrong: You're collecting 10 fields but only need 3 to
  create an account. No legal basis for the rest.

✅ Minimized:
  Required: email, password
  Optional (with stated purpose): name (for personalization)
  Collected later (when needed): shipping_address (at checkout),
  phone (for 2FA enrollment)

  Each field has a documented purpose, and is collected at the
  point it becomes necessary — not "just in case."
```

**Engineering implications:**
- **API design** — Don't accept fields you don't need. Use strict schema validation that rejects extra fields.
- **Database schema** — Don't add columns "for future use" that collect PII.
- **Third-party integrations** — Don't send analytics tools more data than they need. Anonymize or aggregate before export.
- **Feature development** — Challenge product requirements: "Why do we need the user's gender for a code editor?"

---

### Q19. Design an audit trail system for a healthcare application (HIPAA compliance).

**Answer:**

```
┌──────────────────────────────────────────────────────────┐
│              HIPAA AUDIT TRAIL ARCHITECTURE                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Application Layer:                                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Middleware intercepts all PHI access             │    │
│  │  - Who: user_id, role, department                 │    │
│  │  - What: resource_type, record_id, fields_accessed│    │
│  │  - When: timestamp (NTP-synchronized)             │    │
│  │  - Where: IP, device, application                 │    │
│  │  - Why: purpose (treatment, payment, operations)  │    │
│  │  - Outcome: success/failure                       │    │
│  └──────────────────────────┬───────────────────────┘    │
│                             │                            │
│  Transport:                 ▼                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Kafka (immutable, ordered, replicated)           │    │
│  │  Topic: phi-access-audit-log                      │    │
│  └──────────────────────────┬───────────────────────┘    │
│                             │                            │
│  Storage (WORM):            ▼                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  S3 with Object Lock (WORM = Write Once Read Many)│    │
│  │  Retention: 6 years (HIPAA minimum)               │    │
│  │  Encrypted: AES-256 (SSE-KMS)                     │    │
│  │  Access: Security team only (IAM policy)          │    │
│  └──────────────────────────┬───────────────────────┘    │
│                             │                            │
│  Analysis:                  ▼                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  SIEM (Splunk/Elastic) for real-time alerting     │    │
│  │  - Unusual access patterns (off-hours, bulk export)│   │
│  │  - Access by unauthorized roles                   │    │
│  │  - Celebrity/VIP record snooping                  │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Key HIPAA-specific requirements:**
- **6-year retention** minimum for audit logs.
- **Tamper-proof storage** — WORM (Write Once Read Many) or hash-chained logs.
- **Break-the-glass access** — emergency override for patient care, but logged and reviewed.
- **Minimum necessary standard** — log which specific PHI fields were accessed, not just "patient record viewed."

---

### Q20. What is the principle of defense in depth? Give 5 layers you would implement.

**Answer:**

**Defense in depth** means applying **multiple, independent** security controls so that the failure of any single layer doesn't compromise the system. Like castle walls — moat, outer wall, inner wall, keep, guards.

| Layer | Control | What It Stops |
|-------|---------|---------------|
| **1. Network** | Firewall, WAF, DDoS protection, network segmentation | External attacks, volumetric attacks, lateral movement |
| **2. Transport** | TLS 1.3, HSTS, certificate pinning | Eavesdropping, MitM attacks |
| **3. Application** | Input validation, output encoding, CSP, parameterized queries | Injection, XSS, header attacks |
| **4. Identity** | MFA, rate-limited auth, session management, RBAC | Credential stuffing, brute force, privilege escalation |
| **5. Data** | Encryption at rest (AES-256), hashing (Argon2), tokenization, masking | Data theft from DB dump, backup theft |
| **6. Monitoring** | Centralized logging, SIEM, anomaly detection, alerting | Undetected breaches, insider threats |

**Why it matters in interviews:** This is about **mindset**, not just technology. When you're asked "how would you secure X?", don't give one answer — describe layers. Show that you think about what happens when each layer fails, and have a backup.

:::tip Senior-Level Insight
When discussing defense in depth, acknowledge the **cost/complexity trade-off**. Not every system needs all layers. A public marketing site doesn't need the same controls as a payment processing system. The right answer maps controls to **threat model** and **risk appetite**, not "we do everything everywhere."
:::

---

## 🔗 Related Chapters

- **[01 — Authentication & Authorization](./01-authentication-authorization.md)** — Deep dive on auth patterns
- **[02 — Web Vulnerabilities](./02-web-vulnerabilities.md)** — Attack and defense details
- **[03 — Cryptography & Secure Design](./03-cryptography-secure-design.md)** — Crypto fundamentals
- **[04 — Privacy & Compliance](./04-privacy-compliance.md)** — GDPR, PII, and compliance engineering
