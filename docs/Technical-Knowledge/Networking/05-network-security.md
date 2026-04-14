---
sidebar_position: 6
title: "05 — Network Security"
---

# 🛡️ Network Security

Security is non-negotiable in senior engineering interviews. This chapter covers common attack vectors, defense mechanisms, authentication protocols, and rate limiting — the topics you'll face in both networking and system design interviews.

---

## ⚔️ Common Attacks & Mitigations

### DDoS (Distributed Denial of Service)

| Type | Layer | Description | Example |
|------|:-----:|-------------|---------|
| **Volumetric** | L3/L4 | Flood bandwidth with massive traffic | UDP flood, ICMP flood, DNS amplification |
| **Protocol** | L3/L4 | Exploit protocol weaknesses to exhaust server resources | SYN flood, Ping of Death, Smurf attack |
| **Application** | L7 | Target specific application endpoints with seemingly legitimate requests | HTTP flood, Slowloris, cache-busting attacks |

**Mitigation strategies:**

| Layer | Defense |
|-------|---------|
| **Network edge** | CDN/DDoS protection (Cloudflare, AWS Shield), anycast routing |
| **Infrastructure** | Rate limiting, traffic shaping, blackhole routing |
| **Application** | WAF rules, CAPTCHA, behavioral analysis |
| **Architecture** | Auto-scaling, geographic distribution, circuit breakers |

#### SYN Flood Attack

```
Attacker sends thousands of SYN packets with spoofed IPs:

Attacker ──SYN──► Server allocates resources, sends SYN-ACK
         ──SYN──► Server allocates more resources...
         ──SYN──► Server allocates more resources...
         ──SYN──► ...
         ──SYN──► Server runs out of memory/connection table entries!
                  Legitimate users can't connect.

Defense: SYN Cookies
─────────────────────
Instead of storing state, the server encodes connection info
INTO the SYN-ACK sequence number. State is only allocated
when the client completes the handshake with a valid ACK.
```

---

### Man-in-the-Middle (MITM)

```
Normal:     Client ◄═══════════════════════► Server

MITM:       Client ◄══════► Attacker ◄══════► Server
                    Decrypts │ Re-encrypts
                    & reads  │ & forwards
```

**Mitigations:**
- **HTTPS everywhere** — encrypt all traffic with TLS
- **HSTS** — force browsers to use HTTPS (`Strict-Transport-Security` header)
- **Certificate pinning** — app validates specific server certificate
- **mTLS** — both sides authenticate with certificates

---

### SQL Injection

```
Login form:   Username: admin' OR '1'='1' --
              Password: anything

Generated SQL:
SELECT * FROM users WHERE username = 'admin' OR '1'='1' --' AND password = 'anything'
                                      ^^^^^^^^^^^^^^^^
                                      Always true! Bypasses auth.
```

**Mitigations:**

```java
// VULNERABLE — string concatenation
String query = "SELECT * FROM users WHERE username = '" + username + "'";

// SAFE — parameterized query (prepared statement)
PreparedStatement stmt = conn.prepareStatement(
    "SELECT * FROM users WHERE username = ?"
);
stmt.setString(1, username);
```

| Defense | Description |
|---------|-------------|
| **Parameterized queries** | Use prepared statements — the DB engine handles escaping |
| **ORM** | Use an ORM (JPA, SQLAlchemy) that parameterizes by default |
| **Input validation** | Whitelist allowed characters, validate data types |
| **Least privilege** | DB user should have minimal permissions |
| **WAF** | Web Application Firewall detects SQL injection patterns |

---

### XSS (Cross-Site Scripting)

| Type | Description | Example |
|------|-------------|---------|
| **Reflected** | Malicious script in URL parameters, reflected in response | `https://site.com/search?q=&lt;script&gt;steal(cookies)&lt;/script&gt;` |
| **Stored** | Malicious script stored in database, served to all users | Forum post containing `&lt;script&gt;` tag |
| **DOM-based** | Script manipulates the page's DOM without server involvement | `document.write(location.hash)` |

**Mitigations:**

| Defense | Description |
|---------|-------------|
| **Output encoding** | Escape HTML entities (`<` → `&lt;`) before rendering |
| **Content Security Policy (CSP)** | Restrict which scripts can execute (`Content-Security-Policy` header) |
| **HttpOnly cookies** | Prevent JavaScript from accessing session cookies |
| **Input sanitization** | Strip or escape HTML tags from user input |
| **Framework auto-escaping** | React, Angular, Vue auto-escape by default |

---

### CSRF (Cross-Site Request Forgery)

```
1. User logs into bank.com (session cookie set)
2. User visits evil.com
3. evil.com has: <img src="https://bank.com/transfer?to=attacker&amount=10000">
4. Browser automatically sends bank.com cookies with the request!
5. Bank processes the transfer because the session is valid

Defense: CSRF Token
───────────────────
Server generates a random token per session/form.
Token is included in the form as a hidden field.
Server validates the token on submission.
Attacker can't guess the token from another domain.
```

**Mitigations:**

| Defense | Description |
|---------|-------------|
| **CSRF tokens** | Server-generated random token in forms, validated on submit |
| **SameSite cookies** | `SameSite=Strict` or `Lax` prevents sending cookies cross-site |
| **Check Origin/Referer** | Verify the request comes from your domain |
| **Custom headers** | Require custom header (e.g., `X-Requested-With`) — can't be set cross-origin |

---

### DNS Spoofing / Cache Poisoning

An attacker corrupts DNS cache to redirect users to malicious servers.

**Mitigations:** DNSSEC (cryptographic signatures), DNS over HTTPS (DoH), DNS over TLS (DoT), randomize source port and transaction ID.

### ARP Spoofing

Attacker sends fake ARP replies to associate their MAC with a legitimate IP, enabling MITM on the local network.

**Mitigations:** Static ARP entries, Dynamic ARP Inspection (DAI), 802.1X port-based authentication, VPN for sensitive communications.

---

## 🔥 Firewalls

| Type | Layer | Description |
|------|:-----:|-------------|
| **Packet filter (Stateless)** | L3/L4 | Examines each packet independently based on IP/port rules |
| **Stateful firewall** | L3/L4 | Tracks connection state — allows return traffic for established connections |
| **WAF (Web Application Firewall)** | L7 | Inspects HTTP traffic for SQL injection, XSS, and other application attacks |
| **Next-Gen Firewall (NGFW)** | L3-L7 | Combines stateful + deep packet inspection + IDS/IPS |

```
Stateless:                           Stateful:
─────────                            ────────
Rule: Allow port 80 inbound          Rule: Allow port 80 inbound
Rule: Allow port 80 outbound         (Return traffic automatically allowed
(Must explicitly allow return         because connection is tracked)
 traffic)
```

:::tip WAF vs Traditional Firewall
Traditional firewalls (L3/L4) can't detect SQL injection or XSS because they don't inspect HTTP payloads. A WAF operates at L7, understands HTTP, and can block application-layer attacks. In cloud environments, use both: Security Groups (L4) + WAF (L7).
:::

---

## 🔒 VPN (Virtual Private Network)

### How VPN Works

```
┌──────────┐                    ┌──────────────┐                    ┌──────────┐
│  Client   │═══ Encrypted ════│  VPN Server   │════ Plaintext ════│  Target  │
│           │    Tunnel         │  (Gateway)    │    (or encrypted) │  Server  │
└──────────┘                    └──────────────┘                    └──────────┘

ISP sees: Encrypted traffic to VPN server IP
ISP does NOT see: Destination URL, content, or protocol
```

| Type | Description | Use Case |
|------|-------------|----------|
| **Site-to-Site** | Connects two networks (e.g., office to cloud VPC) | Corporate network bridging |
| **Remote Access** | Individual user connects to corporate network | Remote workers |
| **Protocols** | IPsec, OpenVPN, WireGuard, L2TP | WireGuard is modern and fast |

---

## 🔐 OAuth 2.0 & OpenID Connect

### OAuth 2.0 Authorization Code Flow

This is the most secure flow, used for server-side web applications.

```
┌──────────┐      ┌──────────────┐      ┌───────────────────┐
│  User     │      │  Client App  │      │  Auth Server      │
│ (Browser) │      │  (Your App)  │      │  (Google, Okta)   │
└─────┬─────┘      └──────┬───────┘      └────────┬──────────┘
      │                    │                       │
      │ 1. Click "Login    │                       │
      │    with Google"    │                       │
      │───────────────────►│                       │
      │                    │                       │
      │ 2. Redirect to Auth Server                 │
      │◄───────────────────│                       │
      │    302 → https://auth.google.com/authorize │
      │         ?client_id=xxx                     │
      │         &redirect_uri=https://app/callback │
      │         &response_type=code                │
      │         &scope=openid+profile+email        │
      │         &state=random_csrf_token           │
      │                                            │
      │ 3. User logs in & grants permissions       │
      │───────────────────────────────────────────►│
      │                                            │
      │ 4. Redirect back with authorization code   │
      │◄───────────────────────────────────────────│
      │    302 → https://app/callback              │
      │         ?code=AUTH_CODE                     │
      │         &state=random_csrf_token           │
      │                                            │
      │───────────────────►│                       │
      │                    │                       │
      │                    │ 5. Exchange code for   │
      │                    │    tokens (server-side)│
      │                    │──────────────────────►│
      │                    │  POST /token           │
      │                    │  code=AUTH_CODE         │
      │                    │  client_secret=xxx      │
      │                    │                       │
      │                    │ 6. Access token +       │
      │                    │    refresh token        │
      │                    │◄──────────────────────│
      │                    │                       │
      │ 7. Set session     │                       │
      │◄───────────────────│                       │
```

### OAuth 2.0 Grant Types

| Grant Type | Use Case | Security |
|-----------|----------|----------|
| **Authorization Code** | Server-side web apps | Most secure (code exchanged server-side) |
| **Authorization Code + PKCE** | SPAs, mobile apps | Secure without client secret |
| **Client Credentials** | Service-to-service (no user) | Machine-to-machine only |
| **Refresh Token** | Get new access token without re-login | Long-lived, store securely |
| ~~Implicit~~ | ~~SPAs (deprecated)~~ | ❌ Insecure — token in URL fragment |
| ~~Resource Owner Password~~ | ~~Legacy apps (deprecated)~~ | ❌ Exposes user credentials to client |

:::warning OAuth 2.0 vs OpenID Connect
- **OAuth 2.0** is for **authorization** ("What can this app do?") — grants access tokens
- **OpenID Connect (OIDC)** adds **authentication** ("Who is this user?") — adds ID tokens (JWT with user info)
- OIDC is a layer on top of OAuth 2.0, not a replacement
:::

---

## 🎫 JWT (JSON Web Token)

### JWT Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNzA5MjU5MjAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│              Header              │              Payload              │           Signature           │

Header (Base64):                    Payload (Base64):                   Signature:
{                                   {                                   HMACSHA256(
  "alg": "HS256",                     "sub": "1234567890",                base64(header) + "." +
  "typ": "JWT"                        "name": "John Doe",                base64(payload),
}                                     "exp": 1709259200,                 secret
                                      "iat": 1709255600,               )
                                      "roles": ["admin"]
                                    }
```

### JWT Pros & Cons

| Pros | Cons |
|------|------|
| **Stateless** — no server-side session store | **Can't be revoked** — valid until expiry (unless blocklist) |
| **Self-contained** — carries user data | **Size** — larger than opaque session tokens |
| **Cross-service** — works across microservices | **Payload is NOT encrypted** — only Base64 encoded (readable!) |
| **Portable** — works across domains/languages | **Token theft** — if stolen, attacker has full access until expiry |

:::warning JWT Security Pitfalls
1. **Never store secrets in JWT payload** — it's Base64, not encrypted
2. **Always validate `exp`** — expired tokens must be rejected
3. **Validate `iss` and `aud`** — prevent token confusion attacks
4. **Use short expiry** — access tokens should be 5–15 minutes
5. **Use `alg: none` attack defense** — always verify the algorithm matches your expectation
6. **Prefer RS256 over HS256** — asymmetric signing prevents any service with the key from creating tokens
:::

---

## 🔏 mTLS (Mutual TLS)

Standard TLS authenticates only the **server**. mTLS authenticates **both** client and server.

```
Standard TLS:                          mTLS:

Client  ──── Verify server cert ────►  Client  ──── Verify server cert ────►  Server
                                       Server  ──── Verify client cert ────►  Client
        "I trust you, server"                  "We both trust each other"
```

**Use cases:** Service-to-service authentication in microservices (service mesh), IoT device authentication, zero-trust networks.

---

## ⏱️ Rate Limiting Algorithms

### Token Bucket

```
┌─────────────────────────┐
│     Token Bucket        │
│  ┌───┬───┬───┬───┬───┐  │   Tokens added at fixed rate
│  │ ● │ ● │ ● │ ● │   │  │   (e.g., 10 tokens/second)
│  └───┴───┴───┴───┴───┘  │
│  Capacity: 5 tokens      │   Each request consumes 1 token
│  Current: 4 tokens       │   If bucket empty → request denied (429)
└─────────────────────────┘   Allows bursts up to bucket size
```

| Property | Value |
|----------|-------|
| **Burst handling** | ✅ Allows bursts up to bucket capacity |
| **Smoothing** | Good long-term rate smoothing |
| **Memory** | O(1) per user |
| **Used by** | AWS API Gateway, Stripe |

### Leaky Bucket

```
Requests in ──► ┌───────────┐
                │ ● ● ● ●   │  ← Queue (fixed size)
                │ ● ●       │
                └─────┬─────┘
                      │
                      ▼  Constant output rate
                   Process
                   (e.g., 10 req/sec)
```

| Property | Value |
|----------|-------|
| **Burst handling** | ❌ No bursts — constant output rate |
| **Smoothing** | Perfectly smooth output |
| **Memory** | O(queue size) |
| **Used by** | Network traffic shaping |

### Fixed Window Counter

```
Window: 1 minute, Limit: 100 requests

│ Window 1          │ Window 2          │
│ 00:00 ── 00:59    │ 01:00 ── 01:59    │
│ Count: 98 ✅      │ Count: 45 ✅      │
│                   │                   │

Problem: Boundary burst
│      ... 99 reqs  │ 99 reqs ...      │
│    (last second)  │ (first second)    │
│                   │                   │
   198 requests in 2 seconds! (nearly 2× limit)
```

### Sliding Window Log

Keeps a log of timestamps for each request. Removes entries older than the window. Accurate but memory-intensive.

### Sliding Window Counter

```
Window: 1 minute, Limit: 100

Previous window: 80 requests
Current window: 30 requests (40% into window)

Estimated count = 80 × (1 - 0.4) + 30 = 48 + 30 = 78 ✅ (under 100)
```

| Algorithm | Accuracy | Memory | Burst Tolerance |
|-----------|----------|--------|-----------------|
| **Token Bucket** | Good | O(1) | ✅ Allows bursts |
| **Leaky Bucket** | Good | O(queue) | ❌ No bursts |
| **Fixed Window** | Low (boundary issue) | O(1) | ⚠️ 2× at boundary |
| **Sliding Window Log** | Exact | O(n) per user | ✅ Accurate |
| **Sliding Window Counter** | Good approximation | O(1) | ✅ Good enough |

:::tip Interview Recommendation
**Token bucket** is the most commonly asked and used in production. Know it well. **Sliding window counter** is a great trade-off of accuracy vs memory. Be ready to implement either from scratch.
:::

---

## 📋 OWASP Top 10 (2021) Overview

| # | Vulnerability | Description |
|:-:|--------------|-------------|
| 1 | **Broken Access Control** | Users can act outside their intended permissions |
| 2 | **Cryptographic Failures** | Weak encryption, exposed sensitive data |
| 3 | **Injection** | SQL, NoSQL, LDAP, OS command injection |
| 4 | **Insecure Design** | Missing security controls in the architecture |
| 5 | **Security Misconfiguration** | Default creds, unnecessary features enabled, verbose errors |
| 6 | **Vulnerable Components** | Using libraries with known CVEs |
| 7 | **Auth Failures** | Broken authentication, session management |
| 8 | **Software & Data Integrity** | Untrusted code updates, insecure CI/CD pipelines |
| 9 | **Logging & Monitoring Failures** | Insufficient logging makes attacks undetectable |
| 10 | **SSRF** | Server-side request forgery — tricking server to make internal requests |

---

## 🔥 Interview Questions

### Conceptual

1. **What's the difference between XSS and CSRF?**
   > XSS: attacker injects **malicious script** into a trusted website that runs in victims' browsers. CSRF: attacker tricks the victim's browser into making **unwanted requests** to a site where the victim is authenticated. XSS exploits trust the user has in the site; CSRF exploits trust the site has in the user's browser.

2. **How does OAuth 2.0 work? Walk through the authorization code flow.**
   > User clicks login → redirect to auth server → user authenticates → auth server redirects back with authorization code → your server exchanges code + client secret for access token (server-side) → use access token to call APIs.

3. **Explain JWT structure. What are the security concerns?**
   > Three Base64-encoded parts: header (algorithm), payload (claims), signature (HMAC or RSA). Concerns: payload is readable (not encrypted), can't be revoked without blocklist, `alg: none` attack, token theft gives full access until expiry.

4. **What is mTLS and when would you use it?**
   > Mutual TLS authenticates both client and server with certificates. Used in microservice-to-microservice communication (service mesh), zero-trust architectures, and IoT device authentication.

5. **Compare token bucket and sliding window rate limiting.**
   > Token bucket: tokens refill at fixed rate, each request takes a token, allows bursts up to bucket size, O(1) memory. Sliding window: tracks request count in a moving time window, more accurate at boundaries, either O(n) (log) or O(1) (counter approximation).

### Scenario-Based

6. **Your service is getting DDoS'd at the application layer (HTTP flood). What do you do?**
   > Immediate: enable WAF rules, activate CDN DDoS protection (Cloudflare/Shield), implement rate limiting per IP. Short-term: add CAPTCHA for suspicious traffic, enable geo-blocking if attack originates from specific regions. Long-term: implement behavioral analysis, auto-scaling, and circuit breakers.

7. **You discover a SQL injection vulnerability in production. What's your incident response?**
   > Immediate: patch the vulnerability (parameterized queries), assess what data may have been exposed, check access logs for exploitation evidence. Notify: security team, potentially affected users (if data breach), legal/compliance. Long-term: code review for similar issues, add WAF SQL injection rules, implement automated SAST/DAST scanning.

8. **How would you design rate limiting for a distributed API with multiple server instances?**
   > Use a centralized store (Redis) with atomic operations (INCR + EXPIRE or Lua scripts). Implement sliding window counter for accuracy. Consider local rate limiting as a first pass to reduce Redis calls. Return `429 Too Many Requests` with `Retry-After` header.

9. **A penetration test found that your API is vulnerable to CSRF. How do you fix it?**
   > Implement CSRF tokens (synchronizer token pattern) for state-changing operations. Set `SameSite=Strict` or `Lax` on session cookies. Verify `Origin` and `Referer` headers. For APIs used by SPAs, prefer token-based auth (JWT in Authorization header) over cookies.

10. **How do you implement zero-trust networking for microservices?**
    > mTLS between all services (service mesh like Istio), service identity via SPIFFE/X.509 certificates, fine-grained authorization policies per service, encrypt all traffic (no trusted network zones), implement least-privilege access, continuous verification with short-lived credentials.
