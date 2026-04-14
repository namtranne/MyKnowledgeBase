---
sidebar_position: 4
title: "03 — HTTP, HTTPS & Application Layer"
---

# 🌍 HTTP, HTTPS & Application Layer

The application layer is where most developers spend their time. This chapter covers HTTP protocol evolution, TLS security, cookies/sessions, CORS, WebSocket, and modern web protocols in depth.

---

## 📊 HTTP Version Comparison

| Feature | HTTP/1.0 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|----------|--------|--------|
| **Year** | 1996 | 1997 | 2015 | 2022 |
| **Transport** | TCP | TCP | TCP | QUIC (UDP) |
| **Connections** | New TCP per request | Persistent (keep-alive) | Single TCP, multiplexed | Single QUIC, multiplexed |
| **Pipelining** | No | Yes (but problematic) | Replaced by multiplexing | Multiplexing |
| **HOL blocking** | Connection-level | Connection-level | TCP-level (still!) | Solved (stream-level) |
| **Header format** | Text | Text | Binary (HPACK compressed) | Binary (QPACK compressed) |
| **Server push** | No | No | Yes | Yes (rarely used) |
| **TLS** | Optional | Optional | Optional (but de facto required) | Mandatory (built-in) |
| **Streams** | N/A | N/A | Multiple per connection | Multiple per connection |
| **Handshake** | 1 RTT (TCP) + TLS | 1 RTT (TCP) + TLS | 1 RTT (TCP) + TLS | 0-1 RTT (QUIC includes TLS) |

:::info HTTP/2 Still Has HOL Blocking
HTTP/2 multiplexes streams over a **single TCP connection**. If a TCP packet is lost, ALL streams are blocked until retransmission. HTTP/3 solves this by using QUIC, where each stream is independent.
:::

---

## 📬 HTTP Methods

| Method | Safe | Idempotent | Has Body | Use Case |
|--------|:----:|:----------:|:--------:|----------|
| **GET** | ✅ | ✅ | No | Retrieve a resource |
| **HEAD** | ✅ | ✅ | No | Same as GET but no response body (check headers) |
| **OPTIONS** | ✅ | ✅ | No | Discover allowed methods / CORS preflight |
| **POST** | ❌ | ❌ | Yes | Create a resource, submit data |
| **PUT** | ❌ | ✅ | Yes | Replace a resource entirely |
| **PATCH** | ❌ | ❌ | Yes | Partially update a resource |
| **DELETE** | ❌ | ✅ | Optional | Remove a resource |

:::tip Safe vs Idempotent
- **Safe:** Does not modify server state (read-only). GET, HEAD, OPTIONS.
- **Idempotent:** Multiple identical requests have the same effect as one. GET, PUT, DELETE, HEAD, OPTIONS.
- **POST** is neither safe nor idempotent — each call may create a new resource.
- **PATCH** is not guaranteed to be idempotent (depends on the patch format).
:::

---

## 📋 HTTP Status Codes

### 1xx — Informational

| Code | Name | Use |
|:----:|------|-----|
| 100 | Continue | Client should continue sending body |
| 101 | Switching Protocols | Upgrading to WebSocket or HTTP/2 |
| 103 | Early Hints | Preload resources before final response |

### 2xx — Success

| Code | Name | Use |
|:----:|------|-----|
| **200** | OK | Standard success |
| **201** | Created | Resource successfully created (POST) |
| **202** | Accepted | Request accepted for async processing |
| **204** | No Content | Success but no response body (DELETE) |
| 206 | Partial Content | Range request fulfilled |

### 3xx — Redirection

| Code | Name | Use |
|:----:|------|-----|
| **301** | Moved Permanently | Resource permanently moved (SEO transfer) |
| **302** | Found | Temporary redirect (historically misused) |
| 303 | See Other | Redirect after POST (always GET) |
| **304** | Not Modified | Cached version is still valid |
| **307** | Temporary Redirect | Like 302 but preserves HTTP method |
| **308** | Permanent Redirect | Like 301 but preserves HTTP method |

### 4xx — Client Error

| Code | Name | Use |
|:----:|------|-----|
| **400** | Bad Request | Malformed request syntax |
| **401** | Unauthorized | Authentication required (misleading name) |
| **403** | Forbidden | Authenticated but not authorized |
| **404** | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported for this resource |
| 409 | Conflict | Request conflicts with current state |
| 413 | Payload Too Large | Request body exceeds server limits |
| **429** | Too Many Requests | Rate limited |

### 5xx — Server Error

| Code | Name | Use |
|:----:|------|-----|
| **500** | Internal Server Error | Generic server error |
| 501 | Not Implemented | Server doesn't support the functionality |
| **502** | Bad Gateway | Upstream server returned invalid response |
| **503** | Service Unavailable | Server overloaded or in maintenance |
| **504** | Gateway Timeout | Upstream server didn't respond in time |

:::warning 401 vs 403
- **401 Unauthorized** actually means **unauthenticated** — "Who are you? Log in first."
- **403 Forbidden** means **unauthorized** — "I know who you are, but you don't have permission."
This is one of the most commonly confused status codes.
:::

---

## 📨 Important HTTP Headers

### Request Headers

| Header | Example | Purpose |
|--------|---------|---------|
| `Host` | `Host: api.example.com` | Target hostname (required in HTTP/1.1) |
| `Authorization` | `Authorization: Bearer [token]` | Authentication credentials |
| `Content-Type` | `Content-Type: application/json` | MIME type of request body |
| `Accept` | `Accept: application/json` | Desired response format |
| `User-Agent` | `User-Agent: Mozilla/5.0...` | Client identification |
| `Cookie` | `Cookie: session=abc123` | Send cookies to server |
| `If-None-Match` | `If-None-Match: "etag123"` | Conditional request (caching) |
| `If-Modified-Since` | `If-Modified-Since: Wed, 21 Oct 2025...` | Conditional request (caching) |
| `Origin` | `Origin: https://app.example.com` | Request origin (CORS) |

### Response Headers

| Header | Example | Purpose |
|--------|---------|---------|
| `Content-Type` | `Content-Type: application/json; charset=utf-8` | Response MIME type |
| `Cache-Control` | `Cache-Control: max-age=3600, public` | Caching directives |
| `ETag` | `ETag: "abc123"` | Resource version identifier |
| `Last-Modified` | `Last-Modified: Wed, 21 Oct 2025...` | Last modification timestamp |
| `Set-Cookie` | `Set-Cookie: session=abc; HttpOnly; Secure` | Set cookie on client |
| `Access-Control-Allow-Origin` | `Access-Control-Allow-Origin: *` | CORS response |
| `Strict-Transport-Security` | `Strict-Transport-Security: max-age=31536000` | Force HTTPS (HSTS) |
| `X-Content-Type-Options` | `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |

### Caching Flow

```
Client                          Server
  │                                │
  │  GET /api/data                 │
  │ ──────────────────────────────►│
  │                                │
  │  200 OK                        │
  │  ETag: "v1"                    │
  │  Cache-Control: max-age=60     │
  │ ◄──────────────────────────────│
  │                                │
  │  (60 seconds later...)         │
  │                                │
  │  GET /api/data                 │
  │  If-None-Match: "v1"           │
  │ ──────────────────────────────►│
  │                                │
  │  304 Not Modified              │  (No body — use cached version)
  │ ◄──────────────────────────────│
```

---

## 🔐 HTTPS & TLS

### TLS 1.3 Handshake

TLS 1.3 reduced the handshake from **2 round trips** (TLS 1.2) to **1 round trip** (or 0-RTT for resumption).

```
Client                                          Server
  │                                                │
  │  ClientHello                                   │
  │  + Supported cipher suites                     │
  │  + Key share (ECDHE public key)                │
  │  + Supported TLS versions                      │
  │ ──────────────────────────────────────────────►│
  │                                                │
  │  ServerHello                                   │
  │  + Selected cipher suite                       │
  │  + Key share (ECDHE public key)                │
  │  + {EncryptedExtensions}                       │
  │  + {Certificate}                               │
  │  + {CertificateVerify}                         │
  │  + {Finished}                                  │
  │ ◄──────────────────────────────────────────────│
  │                                                │
  │  Both sides now compute the shared secret      │
  │  using ECDHE key exchange                      │
  │                                                │
  │  {Finished}                                    │
  │ ──────────────────────────────────────────────►│
  │                                                │
  │  ═══════ Encrypted Application Data ═══════   │
  │ ◄────────────────────────────────────────────► │
  │                                                │
  │  Total: 1 RTT (0-RTT with PSK resumption)     │
```

### Certificate Chain of Trust

```
┌─────────────────────────┐
│    Root CA Certificate   │  ← Pre-installed in browsers/OS
│   (Self-signed)          │     (e.g., DigiCert, Let's Encrypt)
└────────────┬────────────┘
             │ Signs
             ▼
┌─────────────────────────┐
│ Intermediate CA Cert     │  ← Signed by Root CA
│                          │     (Adds a layer of security)
└────────────┬────────────┘
             │ Signs
             ▼
┌─────────────────────────┐
│ Server Certificate       │  ← Signed by Intermediate CA
│ (example.com)            │     (This is what the server sends)
└─────────────────────────┘
```

The browser validates the chain by verifying each certificate's signature up to a trusted root CA.

### Symmetric vs Asymmetric Encryption

| Aspect | Symmetric | Asymmetric |
|--------|-----------|------------|
| **Keys** | Same key for encrypt/decrypt | Public key + private key |
| **Speed** | Fast (100-1000x faster) | Slow |
| **Algorithms** | AES-128, AES-256, ChaCha20 | RSA, ECDSA, Ed25519 |
| **Key exchange** | Key must be shared securely | Public key can be shared openly |
| **Use in TLS** | Bulk data encryption | Key exchange and authentication |

:::tip How TLS Combines Both
TLS uses **asymmetric encryption** (ECDHE) to securely exchange a **symmetric key**, then uses the symmetric key (AES) for fast bulk data encryption. This gets the security of asymmetric + the speed of symmetric.
:::

### Perfect Forward Secrecy (PFS)

PFS ensures that if the server's **long-term private key** is compromised, past session keys cannot be derived. TLS 1.3 mandates PFS by requiring **ephemeral Diffie-Hellman** (ECDHE) — new key pairs are generated for each session and discarded after.

---

## 🍪 Cookies, Sessions & Tokens

| Mechanism | Storage | Sent With | Lifetime | Use Case |
|-----------|---------|-----------|----------|----------|
| **Cookie** | Browser | Every HTTP request to that domain | Configurable (`Expires`/`Max-Age`) | Session ID, preferences, tracking |
| **Session** | Server (memory/DB/Redis) | Via session ID in cookie | Server-controlled | User authentication state |
| **JWT** | Client (localStorage/cookie) | `Authorization` header | Self-contained expiry (`exp` claim) | Stateless auth, API tokens |

### Cookie Security Attributes

| Attribute | Purpose |
|-----------|---------|
| `HttpOnly` | Cannot be accessed by JavaScript (prevents XSS theft) |
| `Secure` | Only sent over HTTPS |
| `SameSite=Strict` | Not sent with cross-site requests (prevents CSRF) |
| `SameSite=Lax` | Sent with top-level navigations only |
| `Domain` | Which domains receive the cookie |
| `Path` | Which paths receive the cookie |

---

## 🔄 CORS (Cross-Origin Resource Sharing)

CORS is a browser security mechanism that restricts web pages from making requests to a different **origin** (protocol + domain + port).

### Simple Request vs Preflight

```
Simple Request (no preflight):         Preflight Required:
─────────────────────────               ─────────────────────
• GET, HEAD, POST only                 • PUT, DELETE, PATCH
• Standard headers only                • Custom headers
• Content-Type: text/plain,            • Content-Type: application/json
  multipart/form-data,                 • Authorization header
  application/x-www-form-urlencoded
```

### Preflight Request Flow

```
Browser                              API Server (api.example.com)
  │                                       │
  │  OPTIONS /api/data                    │  ← Preflight
  │  Origin: https://app.example.com      │
  │  Access-Control-Request-Method: PUT   │
  │  Access-Control-Request-Headers:      │
  │    Authorization, Content-Type        │
  │ ─────────────────────────────────────►│
  │                                       │
  │  204 No Content                       │
  │  Access-Control-Allow-Origin:         │
  │    https://app.example.com            │
  │  Access-Control-Allow-Methods:        │
  │    GET, POST, PUT, DELETE             │
  │  Access-Control-Allow-Headers:        │
  │    Authorization, Content-Type        │
  │  Access-Control-Max-Age: 86400        │
  │ ◄─────────────────────────────────────│
  │                                       │
  │  PUT /api/data                        │  ← Actual request
  │  Origin: https://app.example.com      │
  │  Authorization: Bearer token123       │
  │  Content-Type: application/json       │
  │ ─────────────────────────────────────►│
  │                                       │
  │  200 OK                               │
  │  Access-Control-Allow-Origin:         │
  │    https://app.example.com            │
  │ ◄─────────────────────────────────────│
```

:::warning Common CORS Mistakes
1. Using `Access-Control-Allow-Origin: *` with credentials — browsers reject this combination
2. Not handling OPTIONS requests on the server — returns 405 and blocks the actual request
3. Forgetting to expose custom headers with `Access-Control-Expose-Headers`
4. Setting `Access-Control-Max-Age` too low — causes excessive preflight requests
:::

---

## 🔌 WebSocket, Long Polling & SSE

### Comparison

| Feature | HTTP Long Polling | Server-Sent Events (SSE) | WebSocket |
|---------|-------------------|--------------------------|-----------|
| **Direction** | Server → Client | Server → Client (unidirectional) | Bidirectional |
| **Protocol** | HTTP | HTTP | ws:// or wss:// |
| **Connection** | Repeated HTTP requests | Persistent HTTP connection | Persistent TCP connection |
| **Overhead** | High (new request per message) | Low (single connection) | Very low (frame-based) |
| **Reconnection** | Client must reconnect | Built-in auto-reconnect | Manual reconnect needed |
| **Binary data** | Via encoding | Text only | Text and binary |
| **Browser support** | Universal | Most browsers (not IE) | All modern browsers |
| **Use cases** | Notifications, simple updates | News feeds, dashboards | Chat, gaming, trading |

### WebSocket Handshake

WebSocket starts as an HTTP upgrade request:

```
Client → Server (HTTP Upgrade Request):
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

Server → Client (HTTP 101 Response):
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

═══ Now using WebSocket frames (no more HTTP) ═══
```

---

## ⚡ HTTP/2 Features

### Multiplexing

```
HTTP/1.1 (6 parallel connections):     HTTP/2 (single connection):

Conn 1: ├──Req 1──┤├──Req 7──┤        Stream 1: ├─Req─┤
Conn 2: ├──Req 2──┤├──Req 8──┤        Stream 2: ├──Req──┤
Conn 3: ├──Req 3──┤├──Req 9──┤        Stream 3: ├─Req─┤
Conn 4: ├──Req 4──┤                   Stream 4: ├───Req───┤
Conn 5: ├──Req 5──┤                   Stream 5: ├─Req─┤
Conn 6: ├──Req 6──┤                   Stream 6: ├──Req──┤
                                       ...all on ONE TCP connection
```

### Key HTTP/2 Features

| Feature | Description |
|---------|-------------|
| **Binary framing** | Messages split into binary frames (vs HTTP/1.1 text) |
| **Multiplexing** | Multiple streams on a single connection, interleaved |
| **Header compression (HPACK)** | Static + dynamic table to compress repetitive headers |
| **Server push** | Server proactively sends resources before client requests them |
| **Stream prioritization** | Client can prioritize certain resources (CSS > images) |
| **Flow control** | Per-stream and per-connection flow control |

### HPACK Header Compression

```
First Request:                     Second Request:
┌──────────────────────┐           ┌──────────────────────┐
│ :method: GET          │           │ :method: GET          │  ← Same, use index
│ :path: /index.html    │           │ :path: /style.css     │  ← Different, send delta
│ :authority: example   │           │ :authority: example   │  ← Same, use index
│ accept: text/html     │           │ accept: text/css      │  ← Different, send delta
│ cookie: session=abc   │           │ cookie: session=abc   │  ← Same, use index
└──────────────────────┘           └──────────────────────┘
  ~200 bytes                         ~20 bytes (90% reduction!)
```

---

## 🏛️ REST Principles (Quick Reference)

| Constraint | Description |
|------------|-------------|
| **Client-Server** | Separation of concerns — UI and data storage are independent |
| **Stateless** | Each request contains all information needed; no server-side session |
| **Cacheable** | Responses must define themselves as cacheable or non-cacheable |
| **Uniform Interface** | Consistent resource identification, manipulation through representations |
| **Layered System** | Client can't tell if connected directly to server or intermediary |
| **Code on Demand** (optional) | Server can extend client functionality with executable code |

:::note Deep Dive
REST, gRPC, and GraphQL are covered in depth in [Chapter 07 — REST, gRPC & API Design](./07-api-design.md).
:::

---

## 🔥 Interview Questions

### Conceptual

1. **What are the differences between HTTP/1.1 and HTTP/2?**
   > HTTP/2 introduces binary framing, multiplexing (multiple streams over one connection), HPACK header compression, server push, and stream prioritization. HTTP/1.1 uses text-based messages with one response per connection (or pipelining, which is rarely used due to HOL blocking).

2. **How does HTTPS work? Walk through the TLS handshake.**
   > Client sends ClientHello with supported ciphers and ECDHE key share. Server responds with certificate, its ECDHE key share, and cipher selection. Both derive a shared secret for symmetric encryption. TLS 1.3 does this in 1 RTT (0-RTT for resumption).

3. **Explain the difference between 301, 302, 307, and 308 redirects.**
   > 301 (permanent, may change method to GET), 308 (permanent, preserves method), 302 (temporary, may change method to GET), 307 (temporary, preserves method). Use 301/308 for SEO, 307 for temporary redirects that must keep POST.

4. **What is CORS and why does the preflight request exist?**
   > CORS restricts cross-origin requests for security. The preflight OPTIONS request checks if the server allows the actual request's method, headers, and origin before sending it — preventing unauthorized cross-origin mutations.

5. **Compare cookies vs JWT for authentication.**
   > Cookies: server-managed sessions, automatic with requests, vulnerable to CSRF but protected by SameSite. JWT: stateless, self-contained, sent in Authorization header, not vulnerable to CSRF but can't be revoked without extra infrastructure (blocklist). Cookies are generally preferred for web apps; JWTs for APIs.

### Scenario-Based

6. **Your HTTP/2 API is slower than expected. What could be wrong?**
   > Check for TCP-level HOL blocking (consider HTTP/3), excessive server push, poor stream prioritization, or a single slow response blocking TCP. Also verify the client actually negotiated HTTP/2 (check ALPN).

7. **You need to build a real-time dashboard. WebSocket, SSE, or polling?**
   > SSE if data flows only server → client (simpler, auto-reconnect, works with HTTP/2). WebSocket if bidirectional communication needed. Polling only as a fallback when neither is available. Consider HTTP/2 streams for simpler setups.

8. **How would you implement a chat feature: long polling, SSE, or WebSocket?**
   > WebSocket — chat requires bidirectional, low-latency communication. SSE could work for receiving messages, but sending would still need separate HTTP requests. WebSocket gives both directions on one connection.
