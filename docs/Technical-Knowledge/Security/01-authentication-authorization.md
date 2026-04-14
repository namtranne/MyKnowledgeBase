---
sidebar_position: 2
title: "01 — Authentication & Authorization"
slug: 01-authentication-authorization
---

# 🔐 Authentication & Authorization

Authentication (**AuthN**) verifies *who you are*; authorization (**AuthZ**) determines *what you can do*. Every senior engineer must be able to design, critique, and secure both layers end-to-end.

---

## 1. Session-Based Authentication

The classic approach — the server creates a **session** after login and tracks state on the backend.

### How It Works

```
┌──────────┐         ┌──────────────┐         ┌────────────┐
│  Browser │         │   Server     │         │ Session DB │
└────┬─────┘         └──────┬───────┘         └─────┬──────┘
     │  POST /login          │                       │
     │  {user, pass}         │                       │
     │──────────────────────▶│                       │
     │                       │  validate credentials │
     │                       │  create session_id    │
     │                       │──────────────────────▶│  STORE session
     │                       │◀──────────────────────│
     │  Set-Cookie:          │                       │
     │  sid=abc123; HttpOnly │                       │
     │◀──────────────────────│                       │
     │                       │                       │
     │  GET /dashboard       │                       │
     │  Cookie: sid=abc123   │                       │
     │──────────────────────▶│                       │
     │                       │  lookup session_id    │
     │                       │──────────────────────▶│  FIND session
     │                       │◀──────────────────────│
     │  200 OK {user data}   │                       │
     │◀──────────────────────│                       │
```

### Server-Side Session Storage Options

| Store | Pros | Cons |
|-------|------|------|
| **In-memory (process)** | Fastest, zero deps | Lost on restart, can't scale horizontally |
| **Redis / Memcached** | Fast, shared across instances, TTL support | Extra infra, network hop |
| **Database (SQL)** | Durable, queryable | Slowest, adds DB load |
| **Signed cookies** | No server storage needed | Limited size (4 KB), data exposed to client |

### Cookie Attributes That Matter

```http
Set-Cookie: sid=abc123;
  HttpOnly;        -- not accessible via JavaScript (XSS protection)
  Secure;          -- only sent over HTTPS
  SameSite=Lax;    -- CSRF protection (Strict = no cross-site at all)
  Path=/;          -- cookie scope
  Max-Age=3600;    -- expiry in seconds
  Domain=.app.com; -- shared across subdomains
```

:::tip Senior-Level Insight
In a horizontally-scaled environment, in-process sessions break because each request may hit a different instance. The two solutions: **sticky sessions** (load balancer affinity) or **externalized session store** (Redis). Redis is almost always the right answer — sticky sessions couple scaling to session state and complicate blue/green deploys.
:::

---

## 2. JSON Web Tokens (JWT)

JWTs move session state to the **client** in a cryptographically signed token.

### JWT Structure

```
eyJhbGciOi...   .   eyJzdWIiOi...   .   SflKxwRJSM...
──────────────   ─   ──────────────   ─   ──────────────
   HEADER            PAYLOAD              SIGNATURE
   (base64url)       (base64url)          (base64url)
```

#### Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-2024-01"
}
```

#### Payload (Claims)

```json
{
  "sub": "user-12345",
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com",
  "iat": 1700000000,
  "exp": 1700003600,
  "roles": ["admin", "editor"],
  "email": "alice@example.com"
}
```

| Claim | Type | Purpose |
|-------|------|---------|
| `sub` | Registered | Subject (user ID) |
| `iss` | Registered | Issuer (who created the token) |
| `aud` | Registered | Audience (intended recipient) |
| `iat` | Registered | Issued at (Unix timestamp) |
| `exp` | Registered | Expiration time |
| `nbf` | Registered | Not valid before |
| `jti` | Registered | Unique token ID (for revocation) |
| `roles` | Private | Application-specific claims |

#### Signature

```
RSASHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  privateKey
)
```

### Signing Algorithms

| Algorithm | Type | Key | Use Case |
|-----------|------|-----|----------|
| **HS256** | Symmetric | Shared secret | Single-service (same issuer = verifier) |
| **RS256** | Asymmetric | RSA key pair | Microservices (auth service signs, others verify with public key) |
| **ES256** | Asymmetric | ECDSA key pair | Same as RS256 but smaller keys, faster |
| **EdDSA** | Asymmetric | Ed25519 | Modern, fast, compact |

:::warning
Never use `"alg": "none"` in production. The `none` algorithm vulnerability allows attackers to forge tokens. Always validate the `alg` header server-side and reject unexpected values.
:::

---

## 3. Session vs JWT — Comparison

| Dimension | Session-Based | JWT |
|-----------|--------------|-----|
| **State** | Stateful (server stores session) | Stateless (client holds token) |
| **Storage** | Server-side (Redis, DB) | Client-side (cookie, localStorage) |
| **Scalability** | Needs shared session store | Scales naturally (no server state) |
| **Revocation** | Easy — delete session from store | Hard — token valid until expiry |
| **Size** | Small cookie (~32 bytes session ID) | Larger (~800+ bytes with claims) |
| **Security** | Session ID is opaque reference | Payload is readable (base64, not encrypted) |
| **Cross-domain** | Difficult (cookies are domain-scoped) | Easy (token in Authorization header) |
| **Mobile-friendly** | Cookies not ideal on mobile | Bearer tokens work everywhere |
| **Offline access** | Not possible | Claims available offline |
| **Best for** | Traditional web apps | APIs, microservices, SPAs, mobile |

:::tip Senior-Level Insight
In practice, most production systems use **a hybrid**: short-lived JWTs (5-15 min) for API access combined with server-side refresh tokens stored in a database. This gives you the scalability of JWTs with the revocability of sessions.
:::

---

## 4. OAuth 2.0

OAuth 2.0 is a **delegation protocol** — it allows a third-party application to access resources on behalf of a user without exposing the user's credentials.

### Authorization Code Flow (Most Common)

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  User /  │     │  Client App  │     │ Authorization   │     │  Resource    │
│  Browser │     │  (Backend)   │     │ Server (Google) │     │  Server API  │
└────┬─────┘     └──────┬───────┘     └───────┬─────────┘     └──────┬───────┘
     │                  │                      │                      │
     │ 1. Click         │                      │                      │
     │ "Login w/ Google"│                      │                      │
     │─────────────────▶│                      │                      │
     │                  │ 2. Redirect to       │                      │
     │                  │ /authorize?          │                      │
     │                  │ client_id=X&         │                      │
     │                  │ redirect_uri=Y&      │                      │
     │                  │ scope=openid email&  │                      │
     │◀─────────────────│ state=RANDOM&        │                      │
     │                  │ response_type=code   │                      │
     │ 3. User logs in  │                      │                      │
     │ & grants consent │                      │                      │
     │─────────────────────────────────────────▶│                      │
     │                  │                      │                      │
     │ 4. Redirect to   │                      │                      │
     │ redirect_uri?    │                      │                      │
     │ code=AUTH_CODE&   │                      │                      │
     │ state=RANDOM     │                      │                      │
     │◀─────────────────────────────────────────│                      │
     │─────────────────▶│                      │                      │
     │                  │ 5. POST /token       │                      │
     │                  │ {code, client_secret, │                      │
     │                  │  redirect_uri}       │                      │
     │                  │─────────────────────▶│                      │
     │                  │                      │                      │
     │                  │ 6. {access_token,    │                      │
     │                  │  refresh_token,      │                      │
     │                  │  id_token}           │                      │
     │                  │◀─────────────────────│                      │
     │                  │                      │                      │
     │                  │ 7. GET /userinfo      │                      │
     │                  │ Authorization:        │                      │
     │                  │ Bearer <access_token> │                      │
     │                  │─────────────────────────────────────────────▶│
     │                  │                      │                      │
     │                  │ 8. {user profile}    │                      │
     │                  │◀─────────────────────────────────────────────│
     │ 9. Logged in!    │                      │                      │
     │◀─────────────────│                      │                      │
```

### OAuth 2.0 Grant Types

| Grant Type | Use Case | Has Refresh Token | Client Secret Required |
|------------|----------|:-----------------:|:---------------------:|
| **Authorization Code** | Server-side web apps | ✅ | ✅ |
| **Authorization Code + PKCE** | SPAs, mobile apps, public clients | ✅ | ❌ |
| **Client Credentials** | Machine-to-machine (no user) | ❌ | ✅ |
| **Implicit** ⚠️ | *DEPRECATED* — was for SPAs | ❌ | ❌ |
| **Device Code** | Smart TVs, CLI tools | ✅ | ❌ |
| **Resource Owner Password** ⚠️ | *DEPRECATED* — legacy only | ✅ | ✅ |

### PKCE (Proof Key for Code Exchange)

PKCE prevents authorization code interception attacks for **public clients** (SPAs, mobile apps) that cannot securely store a `client_secret`.

```
1. Client generates:
   code_verifier  = random_string(43-128 chars)
   code_challenge = BASE64URL(SHA256(code_verifier))

2. Authorization request includes:
   code_challenge=XXXX&code_challenge_method=S256

3. Token request includes:
   code_verifier=YYYY

4. Server verifies:
   SHA256(YYYY) == stored_challenge
```

### Client Credentials Flow

Used for **service-to-service** communication where no user is involved.

```
┌───────────────┐                ┌─────────────────┐
│  Service A    │                │  Auth Server     │
└───────┬───────┘                └────────┬────────┘
        │ POST /token                     │
        │ grant_type=client_credentials   │
        │ client_id=X                     │
        │ client_secret=Y                 │
        │ scope=read:orders               │
        │────────────────────────────────▶│
        │                                 │
        │ {access_token, expires_in}      │
        │◀────────────────────────────────│
```

---

## 5. OpenID Connect (OIDC)

OIDC is an **identity layer on top of OAuth 2.0**. While OAuth tells you what a user can *access*, OIDC tells you *who the user is*.

| Concept | OAuth 2.0 | OpenID Connect |
|---------|-----------|----------------|
| **Purpose** | Authorization (delegation) | Authentication (identity) |
| **Token** | Access token | Access token + **ID token** |
| **User info** | Not standardized | `/userinfo` endpoint + standard claims |
| **Scope** | App-defined | `openid`, `profile`, `email`, `address`, `phone` |
| **Discovery** | No standard | `/.well-known/openid-configuration` |

### ID Token Structure (JWT)

```json
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",
  "aud": "your-client-id.apps.googleusercontent.com",
  "exp": 1700003600,
  "iat": 1700000000,
  "nonce": "abc123",
  "email": "alice@gmail.com",
  "email_verified": true,
  "name": "Alice Smith",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

---

## 6. RBAC vs ABAC

### Role-Based Access Control (RBAC)

Permissions are assigned to **roles**, and users are assigned roles.

```
User "Alice"
  └── Role: "Editor"
        ├── permission: articles.read
        ├── permission: articles.write
        └── permission: articles.publish

User "Bob"
  └── Role: "Viewer"
        └── permission: articles.read
```

```python
# RBAC check
def can_publish(user):
    return "editor" in user.roles or "admin" in user.roles
```

### Attribute-Based Access Control (ABAC)

Access decisions use **attributes** of the user, resource, action, and environment.

```python
# ABAC policy: "Users can edit documents they own during business hours"
def can_edit(user, document, context):
    return (
        document.owner_id == user.id
        and context.time.hour >= 9
        and context.time.hour <= 17
        and user.department == document.department
    )
```

### RBAC vs ABAC Comparison

| Dimension | RBAC | ABAC |
|-----------|------|------|
| **Granularity** | Coarse (role-level) | Fine (attribute-level) |
| **Complexity** | Simple to implement | Complex policy engine needed |
| **Scalability** | Role explosion with many combinations | Scales with policy rules |
| **Flexibility** | Static role assignments | Dynamic, context-aware decisions |
| **Audit** | Easy — check role assignments | Harder — policies are code/rules |
| **Examples** | Admin, Editor, Viewer | "Owner can edit during business hours in their region" |
| **Best for** | Most applications | Healthcare, finance, multi-tenant SaaS |
| **Standards** | Simple custom or framework-based | XACML, OPA (Open Policy Agent) |

:::tip Senior-Level Insight
Start with RBAC — it covers 90% of use cases. When you find yourself creating roles like `editor-region-us-east-weekday-only`, you've outgrown RBAC and need ABAC. Tools like **Open Policy Agent (OPA)** let you express ABAC policies as code, decoupled from your application.
:::

---

## 7. Single Sign-On (SSO)

SSO allows users to authenticate **once** and access multiple applications.

### SAML vs OIDC for SSO

| Feature | SAML 2.0 | OpenID Connect |
|---------|----------|----------------|
| **Format** | XML assertions | JSON/JWT |
| **Transport** | HTTP POST/Redirect bindings | HTTP REST |
| **Token size** | Large (XML + signatures) | Compact (JWT) |
| **Mobile support** | Poor (XML parsing) | Excellent (JSON native) |
| **Complexity** | High | Moderate |
| **Adoption** | Enterprise (legacy) | Modern apps, consumer |
| **Identity Provider** | IdP (e.g., Okta, ADFS) | OP (e.g., Auth0, Google) |
| **Best for** | Enterprise B2B integrations | Consumer apps, SPAs, mobile |

### SAML Flow (Simplified)

```
┌─────────┐     ┌────────────────┐     ┌─────────┐
│  User   │     │  Service       │     │  Identity│
│ Browser │     │  Provider (SP) │     │  Provider│
│         │     │  (Your App)    │     │  (Okta)  │
└────┬────┘     └───────┬────────┘     └────┬─────┘
     │ 1. Access /app    │                   │
     │──────────────────▶│                   │
     │                   │ 2. SAML AuthnReq  │
     │ 3. Redirect       │                   │
     │◀──────────────────│                   │
     │───────────────────────────────────────▶│
     │                   │                   │
     │ 4. Login form     │                   │
     │◀──────────────────────────────────────│
     │ 5. Credentials    │                   │
     │───────────────────────────────────────▶│
     │                   │                   │
     │ 6. SAML Response  │                   │
     │  (signed XML)     │                   │
     │◀──────────────────────────────────────│
     │ 7. POST assertion │                   │
     │──────────────────▶│                   │
     │                   │ 8. Validate sig   │
     │ 9. Access granted │                   │
     │◀──────────────────│                   │
```

---

## 8. Multi-Factor Authentication (MFA)

MFA requires **two or more** independent authentication factors.

### Factor Categories

| Factor | Type | Examples |
|--------|------|----------|
| **Something you know** | Knowledge | Password, PIN, security questions |
| **Something you have** | Possession | Phone (TOTP/SMS), hardware key (YubiKey), smart card |
| **Something you are** | Inherence | Fingerprint, face recognition, voice |
| **Somewhere you are** | Location | IP geolocation, GPS |

### TOTP (Time-Based One-Time Password)

```
1. Server generates secret key → shares via QR code
2. Both client and server compute:
   TOTP = HMAC-SHA1(secret, floor(time / 30)) mod 10^6
3. User enters 6-digit code
4. Server accepts if code matches current or ±1 time step

Time window: 30 seconds (configurable)
Clock skew tolerance: usually ±1 window (90 seconds total)
```

### Implementation Patterns

| Method | Security | UX | Cost |
|--------|:--------:|:--:|:----:|
| **SMS OTP** | ⚠️ Low (SIM swap attacks) | Good | Low |
| **TOTP (Authenticator app)** | ✅ High | Moderate | Free |
| **Push notification** | ✅ High | Excellent | Medium |
| **Hardware key (FIDO2/WebAuthn)** | ✅✅ Highest | Good | High ($25-50/key) |
| **Email OTP** | ⚠️ Low (email compromise) | Good | Low |

:::warning
SMS-based MFA is considered **weak** due to SIM-swapping attacks and SS7 protocol vulnerabilities. NIST SP 800-63B deprecated SMS as an authenticator for higher assurance levels. Prefer TOTP or WebAuthn.
:::

---

## 9. Token Refresh & Revocation Strategies

### Access + Refresh Token Flow

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐
│  Client  │         │  API Server  │         │ Auth Server │
└────┬─────┘         └──────┬───────┘         └──────┬──────┘
     │                      │                        │
     │ API call with        │                        │
     │ access_token (JWT)   │                        │
     │─────────────────────▶│                        │
     │                      │ verify JWT signature   │
     │                      │ + check exp            │
     │ 200 OK               │                        │
     │◀─────────────────────│                        │
     │                      │                        │
     │  ... 15 minutes later, access_token expired   │
     │                      │                        │
     │ API call with        │                        │
     │ expired access_token │                        │
     │─────────────────────▶│                        │
     │ 401 Unauthorized     │                        │
     │◀─────────────────────│                        │
     │                      │                        │
     │ POST /token/refresh  │                        │
     │ {refresh_token}      │                        │
     │─────────────────────────────────────────────▶│
     │                      │                        │ validate refresh
     │                      │                        │ token in DB
     │ {new_access_token,   │                        │
     │  new_refresh_token}  │                        │
     │◀─────────────────────────────────────────────│
     │                      │                        │
     │ Retry API call with  │                        │
     │ new access_token     │                        │
     │─────────────────────▶│                        │
     │ 200 OK               │                        │
     │◀─────────────────────│                        │
```

### Revocation Strategies

| Strategy | How It Works | Latency | Complexity |
|----------|-------------|---------|------------|
| **Short-lived access tokens** | Token expires in 5-15 min naturally | Up to 15 min | Low |
| **Token blacklist** | Store revoked `jti` in Redis; check on each request | Immediate | Medium — defeats stateless advantage |
| **Refresh token rotation** | Issue new refresh token on each use; old one invalidated | Next refresh | Medium |
| **Token family invalidation** | If reused refresh token detected, revoke entire family | Immediate | High — detects theft |
| **Versioned tokens** | User has a `token_version`; increment on logout/password change | Next verification | Low |

:::tip Senior-Level Insight
**Refresh token rotation** is the gold standard. Each time a refresh token is used, it's invalidated and a new one is issued. If an attacker steals and uses a refresh token, the legitimate user's next refresh attempt will fail (token already used), alerting the system to revoke the entire token family.
:::

---

## 10. API Key Authentication

API keys are long-lived secrets used for **server-to-server** or **developer API** access.

### API Key Best Practices

| Practice | Why |
|----------|-----|
| **Hash keys in storage** | Like passwords — store `SHA-256(key)`, not plaintext |
| **Prefix keys** | `sk_live_abc123` — easy to identify, grep in logs |
| **Scope keys** | Grant minimum permissions per key |
| **Rate limit per key** | Prevent abuse |
| **Allow rotation** | Support multiple active keys for zero-downtime rotation |
| **Set expiration** | Force periodic rotation |
| **Transmit securely** | Always over HTTPS, never in URLs (logged by proxies) |

```python
# API key verification
import hashlib

def verify_api_key(provided_key: str) -> Optional[ApiKeyRecord]:
    key_hash = hashlib.sha256(provided_key.encode()).hexdigest()
    record = db.query("SELECT * FROM api_keys WHERE key_hash = %s", key_hash)
    if record and not record.is_expired and not record.is_revoked:
        return record
    return None
```

### API Key vs OAuth Token

| Dimension | API Key | OAuth Token |
|-----------|---------|-------------|
| **Represents** | Application identity | User + application identity |
| **Lifetime** | Long-lived (months/years) | Short-lived (minutes/hours) |
| **Revocation** | Manual | Automated (expiry + refresh) |
| **Scope** | Usually broad | Fine-grained per grant |
| **User context** | None | User identity embedded |
| **Best for** | Internal services, developer APIs | User-facing, third-party integrations |

---

## 🔗 Related Chapters

- **[02 — Web Vulnerabilities](./02-web-vulnerabilities.md)** — Attacks that exploit weak authentication
- **[03 — Cryptography & Secure Design](./03-cryptography-secure-design.md)** — The crypto behind JWT signatures and TLS
- **[05 — Interview Questions](./05-interview-questions.md)** — Practice auth design questions
