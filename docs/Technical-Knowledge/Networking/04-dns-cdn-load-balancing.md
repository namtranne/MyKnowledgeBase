---
sidebar_position: 5
title: "04 — DNS, CDN & Load Balancing"
---

# 🏗️ DNS, CDN & Load Balancing

These three pillars of internet infrastructure work together to make websites fast, reliable, and scalable. This chapter covers how domain names resolve to IPs, how content is distributed globally, and how traffic is balanced across servers.

---

## 🔍 DNS (Domain Name System)

### How DNS Resolution Works

```
User types "www.example.com" in browser

┌──────────┐    1. Check cache     ┌──────────────────┐
│  Browser  │──────────────────────│  Browser Cache    │
│           │  (miss)              │  OS Cache         │
└─────┬─────┘                     │  /etc/hosts       │
      │                            └──────────────────┘
      │ 2. Query recursive resolver
      ▼
┌──────────────────┐
│  Recursive DNS   │  (ISP or 8.8.8.8 / 1.1.1.1)
│  Resolver        │
└──┬───────────────┘
   │
   │ 3. Query root nameserver
   ▼                              "Who handles .com?"
┌──────────────────┐
│  Root Nameserver │  (13 root server clusters: a.root-servers.net ... m.root-servers.net)
│  (.)             │──────► Returns: "Ask .com TLD server at 192.5.6.30"
└──────────────────┘
   │
   │ 4. Query TLD nameserver
   ▼                              "Who handles example.com?"
┌──────────────────┐
│  TLD Nameserver  │  (.com, .org, .net, etc.)
│  (.com)          │──────► Returns: "Ask ns1.example.com at 93.184.216.34"
└──────────────────┘
   │
   │ 5. Query authoritative nameserver
   ▼                              "What is the IP for www.example.com?"
┌──────────────────┐
│  Authoritative   │
│  Nameserver      │──────► Returns: "A record: 93.184.216.34, TTL: 3600"
│  (example.com)   │
└──────────────────┘
   │
   │ 6. Return IP to client (and cache it)
   ▼
┌──────────┐
│  Browser  │──────► Connects to 93.184.216.34
└──────────┘
```

### DNS Record Types

| Type | Name | Example | Purpose |
|:----:|------|---------|---------|
| **A** | Address | `example.com → 93.184.216.34` | Maps domain to IPv4 address |
| **AAAA** | IPv6 Address | `example.com → 2606:2800:220:1:248:1893:25c8:1946` | Maps domain to IPv6 address |
| **CNAME** | Canonical Name | `www.example.com → example.com` | Alias to another domain |
| **MX** | Mail Exchange | `example.com → mail.example.com (priority 10)` | Mail server for the domain |
| **NS** | Nameserver | `example.com → ns1.example.com` | Authoritative nameserver |
| **TXT** | Text | `example.com → "v=spf1 include:_spf.google.com"` | Arbitrary text (SPF, DKIM, domain verification) |
| **SRV** | Service | `_sip._tcp.example.com → sipserver.example.com:5060` | Service location (host + port) |
| **SOA** | Start of Authority | Serial, refresh, retry, expire, minimum TTL | Zone metadata and authority info |
| **PTR** | Pointer | `34.216.184.93.in-addr.arpa → example.com` | Reverse DNS lookup (IP → domain) |
| **CAA** | Certification Authority Authorization | `example.com → letsencrypt.org` | Which CAs can issue certs |

:::warning CNAME Gotchas
- A **CNAME** record **cannot** coexist with other record types (no A + CNAME on the same name)
- A **CNAME** cannot be set on the **zone apex** (e.g., `example.com` itself) — only on subdomains
- Use **ALIAS** or **ANAME** (provider-specific) for apex CNAME-like behavior
:::

### DNS Caching & TTL

| Cache Location | Description |
|---------------|-------------|
| **Browser cache** | Chrome: `chrome://net-internals/#dns` |
| **OS cache** | `systemd-resolved`, `dnsmasq`, Windows DNS Client |
| **Recursive resolver** | ISP resolver, Google (8.8.8.8), Cloudflare (1.1.1.1) |
| **Authoritative server** | Sets the TTL in the response |

```bash
# Check TTL for a domain
dig example.com +noall +answer
# example.com.  3600  IN  A  93.184.216.34
#                ^^^^
#                TTL in seconds (1 hour)

# Check full resolution path
dig +trace example.com

# Flush DNS cache
# macOS:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux:
sudo systemd-resolve --flush-caches
```

:::tip 🔌 Why It Matters in Your SE Role
**TTL is the lever that controls how fast you can fail over or migrate** — and it's a classic foot-gun. DNS answers are cached at every level (browser, OS, resolver) for the TTL duration, so when you change an A record, old clients keep hitting the *old* IP until their cached entry expires. If your TTL is 24 hours and you need an emergency cutover, a large fraction of traffic will keep flowing to the dead server for up to a day. The pattern every SRE follows: **lower the TTL (to ~60s) well *before* a planned migration**, do the cutover, then raise it back. The same mechanic is why DNS-based failover (Route 53 health checks, GeoDNS) is only as fast as your TTL — and why some clients (notably the JVM, which historically cached DNS forever via `networkaddress.cache.ttl`) ignore TTL entirely and need explicit configuration.
:::

### Recursive vs Iterative Queries

| Type | Description | Who Does the Work |
|------|-------------|-------------------|
| **Recursive** | Client asks resolver to fully resolve the domain | Resolver does all the work |
| **Iterative** | Server responds with best answer or referral | Client follows referrals |

Typically: Client → Recursive resolver (recursive query) → Root/TLD/Auth servers (iterative queries).

### DNS Security

| Technology | Purpose |
|-----------|---------|
| **DNSSEC** | Cryptographic signatures on DNS records to prevent tampering |
| **DNS over HTTPS (DoH)** | Encrypts DNS queries via HTTPS (port 443) — prevents ISP snooping |
| **DNS over TLS (DoT)** | Encrypts DNS queries via TLS (port 853) |
| **DNS Sinkhole** | Blocks malicious domains by returning null/local IP |

---

## 🌐 CDN (Content Delivery Network)

### How CDNs Work

```
Without CDN:                        With CDN:

User (Tokyo)                         User (Tokyo)
    │                                    │
    │  500ms RTT                         │  20ms RTT
    │                                    │
    ▼                                    ▼
┌──────────┐                      ┌──────────────┐
│  Origin  │                      │  CDN Edge    │ ← Tokyo PoP
│  Server  │                      │  Server      │
│  (US)    │                      └──────┬───────┘
└──────────┘                             │ Cache miss?
                                         │ Fetch from origin
                                         ▼
                                  ┌──────────────┐
                                  │   Origin     │
                                  │   Server     │
                                  │   (US)       │
                                  └──────────────┘
```

### Push vs Pull CDN

| Aspect | Push CDN | Pull CDN |
|--------|----------|----------|
| **How it works** | You upload content to CDN nodes | CDN fetches from origin on first request |
| **Cache population** | Proactive (you push) | Reactive (on demand) |
| **Best for** | Static assets, known content, large files | Dynamic content, high-traffic sites |
| **Storage cost** | Higher (stored on all edges) | Lower (only cached where requested) |
| **Freshness** | You control when to update | TTL-based, may serve stale content |
| **Example** | Upload video to all 200 PoPs | User in Tokyo requests → edge fetches if not cached |

### Cache Invalidation Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **TTL expiry** | Content expires after a set time | General caching |
| **Purge/Invalidate** | Explicitly remove content from all edges | Urgent content updates |
| **Versioned URLs** | `/style.v2.css` or `/style.css?v=abc123` | Static assets (CSS, JS) |
| **Stale-while-revalidate** | Serve stale content while fetching fresh in background | High-traffic pages |
| **Origin shield** | Middle-tier cache between edges and origin | Reduce origin load |

### Popular CDNs

| CDN | Provider | Strengths |
|-----|----------|-----------|
| **CloudFront** | AWS | Deep AWS integration, Lambda@Edge |
| **Cloudflare** | Cloudflare | DDoS protection, Workers (edge compute), free tier |
| **Akamai** | Akamai | Largest network, enterprise-grade |
| **Fastly** | Fastly | Real-time purging, VCL/Edge compute |
| **Azure CDN** | Microsoft | Azure integration, multiple CDN providers |

---

## ⚖️ Load Balancing

### Layer 4 vs Layer 7 Load Balancing

| Feature | Layer 4 (Transport) | Layer 7 (Application) |
|---------|--------------------|-----------------------|
| **Operates on** | TCP/UDP packets | HTTP requests |
| **Routing decisions** | IP address, port number | URL, headers, cookies, body |
| **Speed** | Very fast (no payload inspection) | Slower (must parse HTTP) |
| **SSL termination** | Pass-through or terminate | Typically terminates |
| **Content-based routing** | No | Yes (`/api` → service A, `/web` → service B) |
| **WebSocket support** | Transparent pass-through | Requires explicit support |
| **Health checks** | TCP connect / port check | HTTP GET with status code check |
| **Use case** | High-throughput, protocol-agnostic | HTTP routing, A/B testing, canary |
| **Examples** | AWS NLB, HAProxy (TCP mode) | AWS ALB, Nginx, HAProxy (HTTP mode) |

### Load Balancing Algorithms

| Algorithm | Description | Pros | Cons |
|-----------|-------------|------|------|
| **Round Robin** | Requests distributed sequentially across servers | Simple, fair distribution | Doesn't account for server capacity or load |
| **Weighted Round Robin** | Like round robin but servers have weights | Handles different server capacities | Static weights don't adapt to load |
| **Least Connections** | Route to server with fewest active connections | Adapts to load in real-time | Slightly more overhead |
| **Weighted Least Connections** | Least connections + server weights | Best for mixed-capacity environments | More complex |
| **IP Hash** | Hash client IP to determine server | Session affinity without cookies | Uneven distribution if IP range is skewed |
| **Consistent Hashing** | Hash ring minimizes redistribution when servers change | Minimal disruption on scale events | More complex to implement |
| **Random** | Random server selection | Simple, surprisingly effective at scale | Not deterministic |
| **Least Response Time** | Route to server with fastest response | Optimizes for user experience | Requires response time tracking |

### Health Checks

```
Load Balancer
      │
      │  Health check every 10s
      │
      ├──── GET /health → 200 ✅ ──── Server 1 (healthy)
      │
      ├──── GET /health → 200 ✅ ──── Server 2 (healthy)
      │
      ├──── GET /health → 503 ❌ ──── Server 3 (unhealthy → removed from pool)
      │     (3 consecutive failures)
      │
      └──── GET /health → 200 ✅ ──── Server 4 (healthy)
```

```java
// Spring Boot health check endpoint
@RestController
public class HealthController {
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        if (isDatabaseConnected() && isCacheAvailable()) {
            return ResponseEntity.ok(Map.of("status", "UP"));
        }
        return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
    }
}
```

### Session Persistence (Sticky Sessions)

| Method | How it Works | Pros | Cons |
|--------|-------------|------|------|
| **Cookie-based** | LB sets a cookie with server ID | Works across IP changes | Requires cookie support |
| **Source IP** | Hash client IP to a server | No cookie needed | Breaks behind NAT/proxy |
| **Application session** | Store session in shared store (Redis) | True statelessness | Additional infrastructure |

:::tip Best Practice
Avoid sticky sessions when possible. Store session state in a **shared store** (Redis, database) so any server can handle any request. This gives you true horizontal scalability and eliminates failover issues.
:::

### Reverse Proxy vs Load Balancer vs API Gateway

| Feature | Reverse Proxy | Load Balancer | API Gateway |
|---------|--------------|---------------|-------------|
| **Primary role** | Forward requests to backend | Distribute traffic across servers | API management and routing |
| **SSL termination** | ✅ | ✅ | ✅ |
| **Load balancing** | Basic | Advanced algorithms | Basic |
| **Caching** | ✅ | Limited | ✅ |
| **Rate limiting** | Basic | No | ✅ |
| **Authentication** | No | No | ✅ |
| **Request transformation** | Basic | No | ✅ |
| **API versioning** | No | No | ✅ |
| **Circuit breaker** | No | No | ✅ |
| **Examples** | Nginx, Apache | HAProxy, AWS NLB/ALB | Kong, AWS API Gateway, Zuul |

:::info In Practice
The lines blur significantly. **Nginx** acts as a reverse proxy, load balancer, and basic API gateway. **AWS ALB** does L7 load balancing with some API gateway features. Choose based on your primary need and scale.
:::

### Popular Load Balancers

| Tool | Type | Strengths |
|------|------|-----------|
| **Nginx** | L4/L7 | Versatile, also serves static files, reverse proxy |
| **HAProxy** | L4/L7 | High performance, advanced health checks, battle-tested |
| **AWS ALB** | L7 | Managed, integrates with ECS/EKS, path-based routing |
| **AWS NLB** | L4 | Ultra-low latency, millions of requests/sec, static IP |
| **Envoy** | L4/L7 | Service mesh sidecar, gRPC support, observability |
| **Traefik** | L7 | Auto-discovery, native Kubernetes/Docker support |

---

## 🛠️ Applying This in Your SE Role

DNS, CDNs, and load balancers are the infrastructure your code runs *behind*. You may not own them, but you configure them constantly — health endpoints, cache headers, TTLs, session strategy — and when they're misconfigured, your perfectly healthy service still serves errors.

### Where this shows up in everyday work

| You're doing this… | …and the infra concept behind it is |
|--------------------|--------------------------------------|
| Writing a `/health` (liveness/readiness) endpoint | LB health checks — depth determines whether bad nodes get traffic |
| Planning a zero-downtime IP/region cutover | DNS **TTL** lowering + failover |
| Making a service horizontally scalable | Avoiding **sticky sessions** → externalize session to Redis |
| Tuning CDN cache-hit rate | `Cache-Control`/`ETag`, versioned URLs, query normalization |
| Choosing NLB vs ALB vs API Gateway | L4 vs L7 vs API management features |
| Cache/shard key routing | **Consistent hashing** to minimize remaps on scale events |

### What to actually do

- **Make health checks *deep*, but not flaky.** A readiness check should verify the critical dependencies a request actually needs (DB, cache) so the LB removes a node that can't serve — but don't fail readiness on a non-critical dependency, or one slow downstream will drain your whole fleet. Separate **liveness** (restart me) from **readiness** (don't send me traffic).
- **Externalize session state.** Sticky sessions make deploys and autoscaling painful — a terminated node drops its users' sessions. Put session state in Redis so any instance can serve any request.
- **Pre-lower DNS TTL before migrations**, and keep both old and new targets live until the old TTL fully drains.
- **Treat cache-hit rate as a first-class metric.** A few header fixes (longer `max-age`, normalized query params, versioned asset URLs) can take a CDN from 30% to 95% hit rate, cutting both latency and origin cost dramatically.

:::warning 🔥 War Story — The "Healthy" Server That Was Serving Nothing but Errors
A service ran six instances behind an ALB. One night users reported that roughly **one in six requests failed** — random, intermittent, impossible to reproduce on a single instance. Dashboards showed all six targets as *healthy*, so the load balancer kept routing to all of them, and the team spent hours hunting a phantom bug.

The culprit was a **shallow health check**. The `/health` endpoint returned `200 OK` if the process was up — it never touched the database. On one instance the DB connection pool had become exhausted (a slow-query pileup), so every *real* request to that node failed with `500`, but the trivial health check still passed. The ALB, seeing green, faithfully sent ~1/6 of traffic into a black hole. **Fix:** make readiness checks actually exercise the critical path (a cheap `SELECT 1` and a cache ping), exactly like the Spring Boot example above that returns `503` when the DB is down. The bad node immediately failed its checks, the ALB pulled it from rotation, and the error rate dropped to zero. The lesson — *a load balancer is only as smart as your health check; "the process is running" and "this instance can serve requests" are different claims, and the LB can only act on the one you actually measure.*
:::

---

## 🔥 Interview Questions

### Conceptual

1. **How does DNS resolution work? Walk through the full process.**
   > Browser cache → OS cache → Recursive resolver → Root nameserver (returns TLD server) → TLD nameserver (returns authoritative) → Authoritative nameserver (returns IP). Each level caches with TTL.

2. **What's the difference between A, AAAA, CNAME, and MX records?**
   > A: domain → IPv4. AAAA: domain → IPv6. CNAME: domain → another domain (alias). MX: domain → mail server with priority. CNAME can't coexist with other records on the same name.

3. **How does a CDN improve performance?**
   > Serves content from edge servers geographically close to users (lower latency), offloads origin server traffic, provides DDoS protection, and caches content to reduce origin load.

4. **Explain L4 vs L7 load balancing.**
   > L4 routes based on IP/port without inspecting payload — fast, protocol-agnostic. L7 inspects HTTP content — can route by URL path, headers, cookies, enabling content-based routing and SSL termination.

5. **What is consistent hashing and why is it used in load balancing?**
   > Consistent hashing maps servers and requests to a hash ring. When a server is added/removed, only ~1/N keys are remapped (vs all keys in simple hash). Essential for cache affinity and minimizing disruption during scaling.

### Scenario-Based

6. **Your DNS TTL is set to 24 hours and you need to do an emergency IP migration. What do you do?**
   > Lower the TTL well in advance (ideally 24–48 hours before the migration, to the minimum, e.g., 60 seconds). After migration, keep both old and new IPs serving traffic until the old TTL expires. Then change the A record and raise TTL back.

7. **Your CDN cache hit rate is only 30%. How do you improve it?**
   > Audit `Cache-Control` headers (increase `max-age`), normalize query parameters and `Vary` headers, use versioned URLs for static assets, set up an origin shield, and analyze cache invalidation patterns for unnecessary purges.

8. **A server behind your load balancer is slow but passing health checks. Users complain. What's happening?**
   > Health checks are too shallow (e.g., TCP connect only). Implement deep health checks (HTTP GET that tests DB connectivity). Use least-connections algorithm instead of round-robin. Consider response-time-based routing or circuit breaker patterns.

9. **How would you set up DNS for a global application?**
   > Use GeoDNS (latency-based or geo-based routing) to direct users to the nearest regional deployment. Set up health checks at the DNS level to failover to another region if one goes down. Use low TTLs for DNS records involved in failover. Example: Route53 latency-based routing.

10. **Your load balancer is a single point of failure. How do you fix it?**
    > Deploy load balancers in pairs (active-passive or active-active) using VRRP/keepalived for failover. In cloud environments, use managed LBs (ALB/NLB) which are inherently highly available across AZs. For DNS-level redundancy, use multiple DNS providers.
