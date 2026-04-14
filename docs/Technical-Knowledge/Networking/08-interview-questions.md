---
sidebar_position: 9
title: "08 — Common Interview Questions"
---

# 🎯 Common Interview Questions

This chapter brings together everything from the previous chapters into the types of questions you'll actually face in senior software engineering interviews. Practice these until you can answer them confidently and with depth.

---

## 🌐 Classic Questions with Detailed Answers

### 1. What happens when you type `google.com` in the browser?

This is the **most classic networking interview question**. A strong answer covers every layer of the stack.

```
Step-by-step:

1. URL Parsing
   ├─ Browser parses "google.com" → scheme: https, host: google.com, path: /
   └─ Adds default port 443 (HTTPS)

2. DNS Resolution
   ├─ Check browser DNS cache
   ├─ Check OS DNS cache (/etc/hosts, systemd-resolved)
   ├─ Query recursive resolver (ISP or 8.8.8.8)
   │   ├─ Root nameserver → "Ask .com TLD"
   │   ├─ .com TLD → "Ask ns1.google.com"
   │   └─ Authoritative → "142.250.80.46, TTL=300"
   └─ Cache result with TTL

3. TCP Connection (3-way handshake)
   ├─ Client → SYN (seq=x) → Server
   ├─ Server → SYN-ACK (seq=y, ack=x+1) → Client
   └─ Client → ACK (seq=x+1, ack=y+1) → Server

4. TLS Handshake (TLS 1.3 — 1 RTT)
   ├─ ClientHello: supported ciphers, ECDHE key share
   ├─ ServerHello: selected cipher, ECDHE key share, certificate
   ├─ Client verifies certificate chain (→ Root CA)
   ├─ Both derive shared secret (ECDHE)
   └─ Client sends Finished, encrypted connection ready

5. HTTP Request
   ├─ GET / HTTP/2
   ├─ Host: www.google.com
   ├─ Accept: text/html
   ├─ Accept-Encoding: gzip, br
   └─ Cookie: (existing Google cookies)

6. Server Processing
   ├─ Load balancer routes to a frontend server
   ├─ Server processes request (auth, personalization)
   └─ Returns HTML response with status 200

7. HTTP Response
   ├─ HTTP/2 200 OK
   ├─ Content-Type: text/html; charset=UTF-8
   ├─ Content-Encoding: br (Brotli compressed)
   ├─ Cache-Control: private, max-age=0
   ├─ Set-Cookie: (session cookies)
   └─ Body: HTML document

8. Browser Rendering
   ├─ Parse HTML → DOM tree
   ├─ Parse CSS → CSSOM tree
   ├─ Fetch sub-resources (JS, CSS, images) — parallel via HTTP/2
   ├─ Execute JavaScript
   ├─ Build render tree (DOM + CSSOM)
   ├─ Layout (compute geometry)
   ├─ Paint (pixels to screen)
   └─ Composite (GPU layers)
```

:::tip Depth Matters
A junior answer: "DNS lookup, TCP connection, HTTP request, render page."
A senior answer covers: DNS caching hierarchy, TLS 1.3 specifics, HTTP/2 multiplexing, certificate validation, ARP at the data link layer, browser rendering pipeline. **Go deep on the areas you know best.**
:::

---

### 2. Explain the difference between TCP and UDP

| Aspect | TCP | UDP |
|--------|-----|-----|
| **Connection** | Connection-oriented (3-way handshake) | Connectionless |
| **Reliability** | Guaranteed delivery via ACK + retransmission | Best-effort, no guarantees |
| **Ordering** | In-order delivery (sequence numbers) | No ordering |
| **Flow control** | Sliding window (rwnd) | None |
| **Congestion control** | Slow start, AIMD, fast retransmit | None |
| **Overhead** | 20-60 byte header | 8 byte header |
| **HOL blocking** | Yes | No |
| **Use cases** | HTTP, SSH, email, file transfer | DNS, streaming, gaming, VoIP |

> **Key insight:** TCP guarantees reliability at the cost of latency. UDP prioritizes speed and lets the application handle reliability if needed. QUIC (HTTP/3) builds TCP-like reliability on top of UDP while avoiding TCP's limitations.

---

### 3. How does HTTPS work?

> **Short answer:** HTTPS = HTTP + TLS. TLS provides encryption, authentication, and integrity.

**The TLS 1.3 handshake:**
1. **ClientHello** — Client sends supported cipher suites and ephemeral ECDHE public key
2. **ServerHello** — Server selects cipher, sends its ECDHE public key and certificate
3. **Certificate verification** — Client validates cert chain up to trusted Root CA
4. **Key derivation** — Both sides use ECDHE to compute shared secret
5. **Encrypted communication** — All subsequent data encrypted with AES using the shared key

**Why two types of encryption?**
- **Asymmetric** (RSA/ECDHE) for secure key exchange — slow but doesn't require pre-shared secret
- **Symmetric** (AES-256-GCM) for bulk data encryption — fast

**Perfect Forward Secrecy (PFS):** TLS 1.3 mandates ephemeral ECDHE keys — new keys per session, discarded after. Even if the server's private key is compromised later, past sessions can't be decrypted.

---

### 4. What is a CDN and how does it work?

> A CDN is a geographically distributed network of edge servers that cache and serve content from locations close to users.

**How it works:**
1. User requests `static.example.com/image.png`
2. DNS resolves to nearest CDN edge server (via anycast or GeoDNS)
3. Edge server checks its cache
   - **Cache hit:** Return immediately (fast!)
   - **Cache miss:** Fetch from origin server, cache it, return to user
4. Subsequent requests for the same content hit the cache

**Benefits:** Lower latency (geographic proximity), reduced origin load, DDoS protection, SSL termination at edge.

---

### 5. Explain OAuth 2.0 flow

> OAuth 2.0 is an **authorization framework** that allows third-party apps to access user data without exposing passwords.

**Authorization Code Flow (most secure):**
1. User clicks "Login with Google" on your app
2. Your app redirects to Google's authorization endpoint with `client_id`, `redirect_uri`, `scope`, `state`
3. User logs in to Google, grants permissions
4. Google redirects back to your app with an **authorization code**
5. Your server exchanges the code + `client_secret` for an **access token** (server-to-server, not exposed to browser)
6. Your server uses the access token to call Google APIs on behalf of the user

**Why the authorization code? Why not return the token directly?**
> The code exchange happens server-to-server, so the access token is never exposed to the browser or URL. The implicit flow (deprecated) returned tokens in URL fragments, which was vulnerable to token leakage.

---

### 6. What is the difference between HTTP/1.1 and HTTP/2?

| Feature | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| **Format** | Text-based | Binary framing |
| **Connections** | 6 parallel TCP connections per domain | Single TCP connection, multiplexed |
| **HOL blocking** | Per-connection | Per-TCP-connection (still exists at transport layer) |
| **Headers** | Sent in full each request | Compressed with HPACK (static + dynamic table) |
| **Server push** | Not supported | Supported (server preemptively sends resources) |
| **Prioritization** | N/A | Stream prioritization (weight + dependency) |

> **Key insight:** HTTP/2's biggest win is **multiplexing** — multiple requests/responses share a single TCP connection, eliminating the overhead of establishing multiple connections. But TCP-level HOL blocking remains, which HTTP/3 (QUIC) solves.

---

## 🧩 Scenario-Based Questions

### 1. Your API is experiencing high latency — how do you diagnose?

```
Systematic diagnosis approach:

1. IDENTIFY WHERE
   ├─ Is it all endpoints or specific ones?
   ├─ Is it all users or specific regions?
   └─ When did it start? Correlate with deployments, traffic changes

2. MEASURE THE LAYERS
   ├─ DNS resolution time:        dig +stats example.com
   ├─ TCP connection time:        curl -w "%{time_connect}" -o /dev/null
   ├─ TLS handshake time:         curl -w "%{time_appconnect}" -o /dev/null
   ├─ Server processing time:     Application metrics / APM (Datadog, New Relic)
   ├─ Database query time:        Slow query log, EXPLAIN ANALYZE
   ├─ Network transfer time:      Content-Length vs bandwidth
   └─ Time to first byte (TTFB):  curl -w "%{time_starttransfer}" -o /dev/null

3. COMMON CAUSES & FIXES
   ├─ DNS: High TTL changes, slow resolver → Use 1.1.1.1, increase TTL
   ├─ Connection: No keep-alive, no connection pooling → Enable HTTP/2, pool
   ├─ Server: N+1 queries, missing indexes → Optimize queries, add caching
   ├─ Network: Large payloads, no compression → Enable gzip/br, paginate
   ├─ Downstream: Slow third-party APIs → Add timeouts, circuit breakers
   └─ Concurrency: Thread pool exhaustion → Tune pool size, async I/O
```

```bash
# Quick diagnosis commands
curl -o /dev/null -s -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://api.example.com/data
```

---

### 2. How would you design rate limiting for an API?

```
Architecture:

Client ──► API Gateway ──► Rate Limiter ──► Application
                               │
                          ┌────┴────┐
                          │  Redis  │  (distributed counter)
                          └─────────┘

Algorithm: Sliding Window Counter (good accuracy, O(1) memory)

Implementation:
─────────────────
Key: rate_limit:{user_id}:{window}
Example: rate_limit:user_123:2026-02-25T14:30

For each request:
1. Get current window count and previous window count
2. Calculate: weighted_count = prev_count × overlap_ratio + current_count
3. If weighted_count >= limit → reject with 429
4. Else → increment current window, process request
```

**Response headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709259200
```

**Design considerations:**
- Rate limit by: API key, user ID, IP address, or combination
- Different limits per endpoint (read vs write, login vs data)
- Different tiers (free: 100/min, pro: 10K/min)
- Graceful degradation: serve cached responses instead of 429
- Distributed: use Redis INCR + EXPIRE (atomic with Lua scripts)

---

### 3. How would you handle WebSocket connections at scale?

```
Challenge: 1M concurrent WebSocket connections

Architecture:

                    ┌──────────────────────────┐
                    │      Load Balancer        │
                    │  (L4 / sticky sessions)   │
                    └─────────┬────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │ WS Server │  │ WS Server │  │ WS Server │
        │  (epoll)  │  │  (epoll)  │  │  (epoll)  │
        │ 300K conn │  │ 300K conn │  │ 300K conn │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Redis Pub/Sub   │  (cross-server messaging)
                    │   or Kafka        │
                    └───────────────────┘
```

**Key decisions:**
- **Load balancing:** L4 with sticky sessions (WebSocket connections are stateful)
- **Cross-server messaging:** When user A on Server 1 messages user B on Server 2, use Redis Pub/Sub or Kafka as a message bus
- **Connection management:** Heartbeat/ping-pong for dead connection detection, auto-reconnect with exponential backoff
- **Memory:** ~10KB per connection, 1M connections ≈ 10GB RAM
- **File descriptors:** Increase `ulimit -n` to support 300K+ connections per process
- **Scaling:** Horizontal — add more WebSocket servers behind the LB

---

### 4. Your service is getting DDoS'd — what do you do?

**Immediate (minutes):**
1. Activate CDN/DDoS protection (Cloudflare Under Attack Mode, AWS Shield Advanced)
2. Enable WAF rules to block attack patterns
3. Rate limit by IP at the edge
4. If source is identifiable, blackhole/null-route attacking IPs

**Short-term (hours):**
1. Analyze attack traffic patterns (type, source, volume)
2. Implement geo-blocking if attack originates from specific regions
3. Add CAPTCHA for suspicious traffic
4. Scale horizontally (auto-scaling) to absorb legitimate traffic
5. Move static assets to CDN to offload origin

**Long-term (days/weeks):**
1. Implement proper multi-layer DDoS protection architecture
2. SYN cookies for SYN flood defense
3. Anycast network to distribute attack traffic
4. Behavioral analysis and machine learning for anomaly detection
5. Incident response playbook and regular drills

---

## 🎨 Design Questions

### 1. Design a chat system (networking perspective)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
│                                                          │
│  ┌──────┐    WebSocket    ┌────────────┐                │
│  │Client ├───────────────►│  Gateway   │                │
│  │(App)  │◄───────────────┤  (WS)     │                │
│  └──────┘                 └─────┬──────┘                │
│                                 │                        │
│              ┌──────────────────┼──────────────────┐     │
│              │                  │                   │     │
│        ┌─────┴──────┐   ┌──────┴──────┐   ┌──────┴──┐  │
│        │ Chat Svc   │   │Presence Svc │   │Push Svc  │  │
│        └─────┬──────┘   └──────┬──────┘   └──────┬───┘  │
│              │                 │                  │       │
│        ┌─────┴──────┐   ┌─────┴───────┐  ┌──────┴──┐   │
│        │  Messages  │   │   Redis     │  │  FCM/   │   │
│        │  DB        │   │  (online    │  │  APNs   │   │
│        │(Cassandra) │   │   status)   │  │         │   │
│        └────────────┘   └─────────────┘  └─────────┘   │
│                                                          │
│  Cross-server messaging: Redis Pub/Sub or Kafka          │
└─────────────────────────────────────────────────────────┘
```

**Key networking decisions:**
- **Protocol:** WebSocket for real-time bidirectional messaging
- **Message delivery:** At-least-once delivery with client-side deduplication (message IDs)
- **Ordering:** Per-conversation ordering via sequence numbers
- **Offline delivery:** Store undelivered messages, push notification via FCM/APNs
- **Presence:** Heartbeat-based online status via Redis with TTL
- **Scaling:** Horizontal WS servers, Redis Pub/Sub for cross-server message routing
- **Reconnection:** Client auto-reconnects with exponential backoff, fetches missed messages by last sequence number

---

### 2. Design a video streaming service (networking perspective)

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Upload Path:                                                 │
│  ┌──────┐    HTTPS     ┌──────────┐   ┌──────────────────┐   │
│  │Creator├────────────►│Upload Svc│──►│Transcoding (FFmpeg)│  │
│  └──────┘  (chunked)  └──────────┘   │ 360p, 720p, 1080p │  │
│                                       │ 4K, HLS/DASH       │  │
│                                       └────────┬─────────┘   │
│                                                │              │
│                                       ┌────────┴─────────┐   │
│                                       │  Object Storage   │   │
│                                       │  (S3)            │   │
│                                       └────────┬─────────┘   │
│                                                │              │
│  Streaming Path:                               │              │
│  ┌──────┐   HTTPS    ┌─────────┐    ┌─────────┴──────┐      │
│  │Viewer├───────────►│CDN Edge │◄───┤  Origin Server │      │
│  └──────┘  (HLS/DASH)│(PoP)   │    └────────────────┘      │
│                      └─────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

**Key networking decisions:**
- **Protocol:** HLS (HTTP Live Streaming) or DASH — HTTP-based, CDN-friendly, adaptive bitrate
- **Adaptive bitrate:** Client measures bandwidth, requests appropriate quality segment
- **CDN:** Edge caching is critical — popular videos cached globally, long-tail at origin
- **Chunking:** Video split into 2–10 second segments, each independently requestable
- **Transport:** HTTPS for VOD (HTTP/2 for multiplexing), WebRTC or low-latency HLS for live streaming
- **Upload:** Resumable chunked uploads (like tus protocol) over HTTPS
- **DNS:** GeoDNS to route viewers to nearest CDN PoP

---

## 📊 Key Port Numbers to Remember

| Port | Protocol | Remember As |
|:----:|----------|-------------|
| **20/21** | FTP | File Transfer (data/control) |
| **22** | SSH | Secure Shell |
| **23** | Telnet | Remote terminal (insecure) |
| **25** | SMTP | Send mail |
| **53** | DNS | Domain resolution |
| **67/68** | DHCP | Dynamic IP |
| **80** | HTTP | Web |
| **110** | POP3 | Get mail |
| **143** | IMAP | Get mail (better) |
| **443** | HTTPS | Secure web |
| **465** | SMTPS | Secure send mail |
| **587** | SMTP Submission | Mail submission (preferred) |
| **993** | IMAPS | Secure get mail |
| **3306** | MySQL | MySQL DB |
| **5432** | PostgreSQL | PostgreSQL DB |
| **6379** | Redis | Redis cache |
| **8080** | HTTP Alt | Dev servers, proxies |
| **8443** | HTTPS Alt | Alternative HTTPS |
| **9092** | Kafka | Kafka broker |
| **27017** | MongoDB | MongoDB |

:::tip Memory Trick
Group by service: **Web** (80, 443), **Mail** (25, 110, 143, 465, 587, 993), **Remote** (22, 23), **DNS/DHCP** (53, 67/68), **Databases** (3306, 5432, 6379, 27017).
:::

---

## ⏱️ Key Latency Numbers Every Programmer Should Know

| Operation | Latency | Notes |
|-----------|--------:|-------|
| L1 cache reference | **1 ns** | |
| L2 cache reference | **4 ns** | |
| Branch mispredict | **3 ns** | |
| Mutex lock/unlock | **17 ns** | |
| Main memory reference | **100 ns** | |
| Compress 1KB with Zippy | **2 μs** | |
| Send 2KB over 1 Gbps network | **20 μs** | |
| SSD random read | **16 μs** | |
| Read 1 MB sequentially from memory | **3 μs** | |
| Read 1 MB sequentially from SSD | **49 μs** | |
| Round trip within same datacenter | **500 μs** | 0.5 ms |
| Read 1 MB sequentially from disk (HDD) | **825 μs** | |
| Disk seek (HDD) | **2 ms** | |
| Read 1 MB sequentially from network (1 Gbps) | **10 ms** | |
| Send packet CA → Netherlands → CA | **150 ms** | |
| TLS handshake | **2-10 ms** | Depends on RTT |
| DNS lookup (uncached) | **20-120 ms** | Depends on hops |
| TCP handshake (same region) | **0.5-1 ms** | |
| TCP handshake (cross-continent) | **100-200 ms** | |

:::info Relative Scale
If L1 cache access (1 ns) = **1 second**, then:
- Main memory access = **1.5 minutes**
- SSD read = **4.5 hours**
- Datacenter round trip = **5.5 days**
- Cross-continent round trip = **5 years**

This is why caching and data locality matter so much.
:::

---

## 📝 Quick-Reference Cheat Sheet

### TCP vs UDP Decision

```
Need reliability?
├─ Yes → TCP (or QUIC)
└─ No
    ├─ Need low latency? → UDP
    ├─ Can tolerate loss? → UDP
    └─ Need both? → QUIC (reliable streams over UDP)
```

### HTTP Method Selection

```
Read data?          → GET
Create new resource? → POST (with idempotency key)
Full update?        → PUT
Partial update?     → PATCH
Remove resource?    → DELETE
Check existence?    → HEAD
CORS preflight?     → OPTIONS
```

### Status Code Quick Pick

```
Success            → 200 (OK), 201 (Created), 204 (No Content)
Redirect           → 301 (Permanent), 307 (Temporary)
Client error       → 400 (Bad Request), 401 (Unauthenticated), 403 (Forbidden), 404 (Not Found), 429 (Rate Limited)
Server error       → 500 (Internal), 502 (Bad Gateway), 503 (Unavailable), 504 (Gateway Timeout)
```

### Load Balancing Algorithm Selection

```
Equal servers, simple setup?     → Round Robin
Different server capacities?     → Weighted Round Robin
Variable request processing?     → Least Connections
Need session affinity?           → IP Hash or Cookie-based
Adding/removing servers often?   → Consistent Hashing
```

### Authentication Selection

```
Public API, simple?      → API Key
User-facing, third-party? → OAuth 2.0
Stateless microservices?  → JWT
Service-to-service?      → mTLS
```
