---
sidebar_position: 2
title: "01 — Real-Time Updates"
---

# ⚡ Real-Time Updates

How do you get fresh data to clients the moment something changes on the server? This is one of the most fundamental challenges in modern systems — from chat applications and collaborative editors to stock tickers and live dashboards.

---

## 🔍 The Core Problem

In a traditional request-response model, the client must **ask** the server for new data. The server has no way to proactively tell the client "something changed." This creates a tension:

| Concern | Challenge |
|---------|-----------|
| **Freshness** | Users expect data within milliseconds of a change |
| **Efficiency** | Constant asking wastes bandwidth and server resources |
| **Scale** | Millions of concurrent connections strain infrastructure |
| **Reliability** | Messages must not be lost, duplicated, or delivered out of order |
| **Cost** | Persistent connections consume memory and file descriptors |

The approaches below represent a spectrum of trade-offs between these concerns.

---

## 📡 Approach 1: Short Polling

The simplest approach. The client repeatedly sends HTTP requests at a fixed interval.

```
Client:  GET /messages?since=1234  →  Server: []         (nothing new)
         ... wait 3 seconds ...
Client:  GET /messages?since=1234  →  Server: []         (nothing new)
         ... wait 3 seconds ...
Client:  GET /messages?since=1234  →  Server: [{id:1235}] (got one!)
```

### How It Works

1. Client sets a timer (e.g., every 3 seconds)
2. On each tick, sends a standard HTTP `GET` request
3. Server responds immediately with any available data (or empty)
4. Client processes the response, waits, repeats

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Simplicity** | No special server infrastructure — any REST API works |
| **Stateless** | Server holds no per-client state between requests |
| **Firewall-friendly** | Standard HTTP, works through every proxy and load balancer |
| **Easy to scale** | Requests are independent; scale horizontally trivially |
| **Easy to debug** | Every interaction is a visible HTTP request/response |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Wasted requests** | Most responses are empty — 90%+ in low-activity systems |
| **Latency** | Average delay is half the polling interval (e.g., 1.5s for 3s interval) |
| **Server load** | N clients × poll frequency = continuous request volume |
| **Battery drain** | Mobile devices waste power on empty polls |
| **Not real-time** | Perceptible lag makes it unsuitable for interactive use cases |

### When to Use

- Low-frequency data updates (dashboards refreshing every 30–60 seconds)
- Environments where WebSocket/SSE is blocked
- Admin panels or internal tools with few concurrent users
- MVP / prototype where simplicity matters most

:::tip Optimization
Use `If-Modified-Since` or `ETag` headers to return `304 Not Modified` for empty polls, reducing payload transfer.
:::

---

## 📡 Approach 2: Long Polling

An evolution of short polling where the server **holds the connection open** until data is available or a timeout occurs.

```
Client:  GET /messages?since=1234  →  Server: (holds connection...)
                                               ... 28 seconds pass ...
                                               Server: [{id:1235}]  ← data arrived!
Client:  GET /messages?since=1235  →  Server: (holds connection...)
                                               ... timeout after 30s ...
                                               Server: []  ← empty, reconnect
```

### How It Works

1. Client sends an HTTP request
2. Server checks for new data — if none, it keeps the connection open
3. When data arrives (or timeout), server responds
4. Client immediately opens a new long-poll request
5. Repeat

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Near real-time** | Data delivered as soon as it's available — no polling interval |
| **Fewer empty responses** | Connection only returns when there's data (or timeout) |
| **HTTP-based** | Works through proxies, load balancers, and firewalls |
| **Simpler than WebSockets** | No protocol upgrade or dedicated infrastructure needed |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Server resources** | Each waiting client holds a thread/connection open |
| **Head-of-line blocking** | One slow response delays the next poll cycle |
| **Thundering herd** | If all timeouts align, a burst of reconnections hits the server |
| **Message ordering** | Responses can arrive out of order during reconnection windows |
| **Load balancer complexity** | Long-held connections may be prematurely terminated by proxies |

### Implementation Considerations

```python
# Server-side pseudo-code (async)
async def long_poll(request):
    last_id = request.params["since"]
    
    # Wait up to 30 seconds for new data
    try:
        new_data = await wait_for_data(last_id, timeout=30)
        return JsonResponse(new_data)
    except TimeoutError:
        return JsonResponse([])  # Client will immediately reconnect
```

:::warning Timeout Tuning
Set the server timeout **shorter than** your load balancer / reverse proxy timeout. If Nginx has a 60s `proxy_read_timeout`, use 50s on the app server to ensure a clean response rather than an abrupt connection reset.
:::

### When to Use

- Chat systems where WebSocket infrastructure isn't available
- Notification systems with moderate concurrency (< 100K clients)
- Legacy environments where you can't deploy WebSocket servers

---

## 📡 Approach 3: Server-Sent Events (SSE)

A **unidirectional** push channel from server to client, built on standard HTTP. The server holds a single long-lived connection and streams events as they occur.

```
Client:  GET /events  (Accept: text/event-stream)
Server:  HTTP/1.1 200 OK
         Content-Type: text/event-stream

         data: {"type":"message","id":1235,"text":"hello"}

         data: {"type":"message","id":1236,"text":"world"}

         event: heartbeat
         data: {}
```

### How It Works

1. Client opens an `EventSource` connection (one HTTP request)
2. Server responds with `Content-Type: text/event-stream`
3. Server writes events to the response stream as they happen
4. Connection stays open indefinitely
5. Browser auto-reconnects on disconnect (with `Last-Event-ID` header)

### The EventSource API

```javascript
const source = new EventSource('/events');

source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
};

source.addEventListener('notification', (event) => {
    showNotification(JSON.parse(event.data));
});

source.onerror = (event) => {
    // Browser auto-reconnects; you can add custom logic
    console.log('Connection lost, reconnecting...');
};
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Built-in reconnection** | Browser handles reconnection with `Last-Event-ID` automatically |
| **HTTP-based** | Works through proxies, CDNs, and HTTP/2 multiplexing |
| **Lightweight** | Less overhead than WebSockets for server-to-client push |
| **Text-based protocol** | Easy to debug with `curl` — just read the stream |
| **Event types** | Built-in support for named event channels |
| **Simpler server-side** | No frame parsing, no ping/pong, no upgrade handshake |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Unidirectional** | Client cannot send data back over the same connection |
| **Connection limit** | Browsers limit SSE connections per domain (6 on HTTP/1.1) |
| **No binary data** | Text-only protocol; binary must be base64-encoded |
| **No built-in auth** | Cookies work, but custom headers require workarounds |
| **HTTP/1.1 limitations** | One TCP connection per SSE stream unless HTTP/2 is used |

### When to Use

- Live feeds, news tickers, stock prices (server → client only)
- Notification systems where client doesn't need to send data back
- Progress updates for long-running operations
- Dashboard auto-refresh with event-driven updates

---

## 📡 Approach 4: WebSockets

A **full-duplex**, persistent, bidirectional communication channel between client and server over a single TCP connection.

```
Client:  GET /chat  (Upgrade: websocket)
Server:  HTTP/1.1 101 Switching Protocols

         ← Server: {"type":"message","from":"alice","text":"hi"}
         → Client: {"type":"message","to":"alice","text":"hey!"}
         ← Server: {"type":"typing","user":"alice"}
         → Client: {"type":"read_receipt","messageId":42}
```

### How It Works

1. Client initiates an HTTP request with `Upgrade: websocket` header
2. Server responds with `101 Switching Protocols`
3. Connection upgrades from HTTP to WebSocket protocol
4. Both sides can send frames independently at any time
5. Connection stays open until explicitly closed by either side

### The WebSocket Lifecycle

```
┌────────┐     HTTP Upgrade     ┌────────┐
│ Client │ ──────────────────► │ Server │
│        │ ◄─ 101 Switching ── │        │
│        │                      │        │
│        │ ◄──── ws frames ──► │        │  ← Full duplex
│        │ ◄──── ws frames ──► │        │
│        │                      │        │
│        │ ── Close Frame ────► │        │
│        │ ◄── Close Frame ─── │        │
└────────┘                      └────────┘
```

### Server-Side Example (Node.js)

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws, req) => {
    const userId = authenticateFromHeaders(req);
    clients.set(userId, ws);

    ws.on('message', (rawData) => {
        const msg = JSON.parse(rawData);
        handleMessage(userId, msg);
    });

    ws.on('close', () => {
        clients.delete(userId);
    });

    // Heartbeat to detect stale connections
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
});

// Ping every 30 seconds; terminate if no pong received
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Full duplex** | True bidirectional — both sides send/receive independently |
| **Low latency** | No HTTP overhead per message after the initial handshake |
| **Binary support** | Native support for both text and binary frames |
| **Efficient** | 2-byte frame header vs hundreds of bytes of HTTP headers |
| **Widely supported** | Every modern browser and backend framework supports it |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Stateful** | Server must maintain per-connection state — complicates scaling |
| **No HTTP/2 multiplexing** | Each WebSocket needs its own TCP connection |
| **Load balancer complexity** | Requires sticky sessions or WebSocket-aware proxies |
| **Reconnection logic** | No auto-reconnect — must implement manually (with backoff) |
| **Proxy issues** | Some corporate proxies/firewalls block the upgrade handshake |
| **Memory pressure** | 100K connections × per-connection buffers = significant RAM |

### Scaling WebSockets

Scaling WebSockets beyond a single server requires solving the **connection routing** problem:

```
                 ┌──────────────┐
    User A ────► │  WS Server 1 │ ─── has connection to User A
                 └──────────────┘
                                        How does User B's message
                 ┌──────────────┐       reach User A?
    User B ────► │  WS Server 2 │ ─── has connection to User B
                 └──────────────┘
```

**Solutions:**

| Strategy | How It Works | Trade-off |
|----------|-------------|-----------|
| **Pub/Sub backbone** | Redis Pub/Sub or Kafka between WS servers | Extra hop latency, Redis as bottleneck |
| **Sticky sessions** | Load balancer routes same user to same server | Uneven load, hard failover |
| **Dedicated gateway** | Use a managed WS service (Pusher, Ably, AWS API Gateway WS) | Vendor lock-in, cost at scale |
| **Consistent hashing** | Hash user ID to server | Rebalancing disrupts connections |

### When to Use

- Chat and messaging applications
- Multiplayer games
- Collaborative editing (Google Docs-style)
- Financial trading terminals
- Any scenario requiring low-latency bidirectional communication

---

## 📡 Approach 5: WebTransport (Emerging)

A modern protocol built on **HTTP/3 (QUIC)** that provides bidirectional streams with optional reliability and ordering guarantees.

### Key Differences from WebSockets

| Feature | WebSockets | WebTransport |
|---------|-----------|-------------|
| **Transport** | TCP | QUIC (UDP-based) |
| **Multiplexing** | Single stream | Multiple independent streams |
| **Head-of-line blocking** | Yes (TCP) | No (QUIC streams are independent) |
| **Unreliable datagrams** | No | Yes — fire-and-forget messages |
| **Connection migration** | No | Yes — survives network changes |
| **Browser support** | Universal | Chrome, Edge (growing) |

### When to Consider

- Real-time gaming (where occasional packet loss is acceptable)
- Live video/audio streaming metadata
- IoT telemetry with mixed reliability requirements
- Scenarios where head-of-line blocking is a problem

:::info Maturity Warning
WebTransport is still emerging (2024–2025). Use it for greenfield projects where you control both client and server, and the performance benefits justify the smaller ecosystem.
:::

---

## 🔄 Change Data Capture (CDC)

CDC captures row-level changes from a database's transaction log and publishes them as events. This is the backbone of many real-time data pipelines.

### How CDC Works

```
┌──────────────┐     WAL / Binlog     ┌─────────────┐     Events     ┌──────────────┐
│  PostgreSQL  │ ──────────────────► │  Debezium   │ ────────────► │    Kafka     │
│  (Source)    │                      │  (CDC Tool) │               │   Topics     │
└──────────────┘                      └─────────────┘               └──────┬───────┘
                                                                          │
                                                        ┌─────────────────┼─────────────────┐
                                                        ▼                 ▼                 ▼
                                                  ┌──────────┐    ┌──────────┐    ┌──────────┐
                                                  │ Search   │    │ Cache    │    │ Analytics│
                                                  │ Index    │    │ (Redis)  │    │ (DW)     │
                                                  └──────────┘    └──────────┘    └──────────┘
```

### CDC Approaches

| Approach | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **Log-based** (Debezium) | Reads WAL/binlog directly | Zero app changes, captures all changes, low overhead | Requires DB log access, schema evolution complexity |
| **Trigger-based** | DB triggers write to change table | Works on any DB, fine-grained control | Performance overhead on writes, maintenance burden |
| **Query-based** | Periodic SELECT on `updated_at` column | Simple to implement | Misses deletes, clock skew issues, polling delay |
| **Application-level** | App publishes events after writes | Full control over event schema | Dual-write problem (DB + event can diverge) |

### Practical Example: Keeping Search in Sync

```
1. User updates product price in PostgreSQL
2. Debezium captures the UPDATE from WAL
3. Event published to Kafka topic "products.changes"
4. Elasticsearch connector consumes event, updates search index
5. Cache invalidation consumer evicts stale Redis entry
6. Analytics pipeline writes to data warehouse

All downstream systems converge to the new state within seconds.
```

:::warning The Dual-Write Problem
Never write to both a database and a message queue in application code without transactional guarantees. If the DB write succeeds but the event publish fails (or vice versa), your systems diverge. Use the **Transactional Outbox** pattern (covered in [Chapter 03](./03-multistep-process.md)) or log-based CDC to solve this.
:::

---

## 📣 Fan-Out Strategies

When a single event must reach many consumers (e.g., a tweet from a user with 10M followers), you face the **fan-out problem**.

### Fan-Out on Write (Push Model)

Pre-compute and write to every recipient's feed at publish time.

```
User posts tweet
    │
    ▼
┌──────────────────┐
│  Fan-out Worker   │
│  For each of the  │
│  user's followers │──────► Write to follower_1's feed cache
│  (10M followers)  │──────► Write to follower_2's feed cache
│                   │──────► ...
└──────────────────┘──────► Write to follower_10M's feed cache
```

| Pros | Cons |
|------|------|
| Reads are instant (pre-computed) | Writes are expensive for high-follower accounts |
| Simple read path | Wasted work if followers don't read their feeds |
| Low read latency | Celebrity problem: one tweet → millions of writes |

### Fan-Out on Read (Pull Model)

Compute the feed at read time by querying each followed user's posts.

```
Follower requests feed
    │
    ▼
┌──────────────────┐
│  Feed Service     │
│  For each user    │
│  the follower     │──────► Query user_1's recent posts
│  follows (500)    │──────► Query user_2's recent posts
│                   │──────► ...
└──────────────────┘──────► Merge, sort, return top N
```

| Pros | Cons |
|------|------|
| No wasted writes | Slow reads — must query many sources |
| Posting is instant | Higher read latency |
| No celebrity problem | Complex merge logic |

### Hybrid Approach (What Twitter/X Actually Does)

```
                     ┌─────────────────────────────────┐
                     │          On New Tweet            │
                     └───────────────┬─────────────────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                    < 10K followers?        ≥ 10K followers?
                         │                       │
                    Fan-out on Write         Store in celebrity
                    (push to caches)         posts table only
                         │                       │
                         └───────────┬───────────┘
                                     │
                              ┌──────┴──────┐
                              │  Read Path  │
                              │  Merge pre- │
                              │  computed + │
                              │  celebrity  │
                              │  posts      │
                              └─────────────┘
```

- **Non-celebrities** (< 10K followers): Fan-out on write — push to follower caches
- **Celebrities** (≥ 10K followers): Fan-out on read — merge at query time
- **Read path**: Merge pre-computed feed with celebrity posts, sort, return

---

## 🏗️ Architecture: Real-Time Notification System

Let's design a full real-time notification system for a platform with 50M users and 500K concurrent connections.

### Requirements

- Deliver notifications within 1 second of the triggering event
- Support 50K notifications per second
- Handle 500K concurrent WebSocket connections
- Guarantee at-least-once delivery
- Support notification preferences and filtering

### Architecture

```
┌────────────────┐     ┌───────────────┐     ┌───────────────────┐
│  Product APIs  │────►│  Kafka Topic  │────►│ Notification      │
│  (Order, Chat, │     │  "events"     │     │ Processing Service│
│   Social, etc) │     └───────────────┘     │                   │
└────────────────┘                           │ - Filter by prefs │
                                             │ - Template render │
                                             │ - Dedup           │
                                             └────────┬──────────┘
                                                      │
                                             ┌────────▼──────────┐
                                             │   Kafka Topic     │
                                             │ "notifications"   │
                                             │ (partitioned by   │
                                             │  user_id)         │
                                             └────────┬──────────┘
                                                      │
                                   ┌──────────────────┼──────────────────┐
                                   ▼                  ▼                  ▼
                            ┌──────────┐       ┌──────────┐       ┌──────────┐
                            │ WS       │       │ WS       │       │ WS       │
                            │ Gateway 1│       │ Gateway 2│       │ Gateway N│
                            │ (50K     │       │ (50K     │       │ (50K     │
                            │  conns)  │       │  conns)  │       │  conns)  │
                            └──────────┘       └──────────┘       └──────────┘
                                │                  │                  │
                                ▼                  ▼                  ▼
                            Connected           Connected          Connected
                            Clients             Clients            Clients
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Transport** | WebSocket with SSE fallback | Need bidirectional (read receipts), SSE for compatibility |
| **Message bus** | Kafka partitioned by user_id | Ordering per user, horizontal scaling |
| **Connection registry** | Redis hash: `user_id → gateway_id` | O(1) lookup for routing, auto-expire on disconnect |
| **Offline delivery** | Write to DB, deliver on next connect | At-least-once guarantee even when offline |
| **Deduplication** | Idempotency key per notification | Prevent duplicate delivery on retries |

### Handling Disconnections

```
1. User disconnects from WS Gateway 2
2. Gateway 2 removes user from local connection map
3. Gateway 2 deletes Redis entry: DEL user:42:gateway
4. New notifications for user 42 accumulate in Kafka (not consumed for that user)
5. User reconnects → hits Gateway 5 (different server)
6. Gateway 5 registers in Redis: SET user:42:gateway = gateway-5
7. Gateway 5 fetches unread notifications from DB
8. Gateway 5 resumes consuming from Kafka for that user's partition
```

---

## ⚖️ Comparison Matrix

| Approach | Latency | Complexity | Scalability | Direction | Best For |
|----------|---------|------------|-------------|-----------|----------|
| **Short Polling** | Seconds | Very Low | Very High | Client→Server | Low-frequency dashboards |
| **Long Polling** | ~Instant | Low | Medium | Server→Client | Notification fallback |
| **SSE** | ~Instant | Low | High | Server→Client | Live feeds, progress |
| **WebSocket** | ~Instant | Medium | Medium-High | Bidirectional | Chat, gaming, collab editing |
| **WebTransport** | ~Instant | High | High | Bidirectional+ | Gaming, streaming (emerging) |
| **CDC** | Seconds | Medium | Very High | Database→Consumers | Data sync, search indexing |

### Decision Framework

```
Need bidirectional communication?
    ├── Yes → WebSocket (or WebTransport if QUIC benefits matter)
    └── No → Server-to-client only?
              ├── Yes → How many events per second?
              │         ├── High (>100/s per client) → SSE with HTTP/2
              │         └── Low (<10/s) → SSE or Long Polling
              └── Client initiates? → Short Polling (if latency tolerance > 5s)
```

---

## 🧠 Key Takeaways

1. **Start with the simplest approach that meets your latency requirements** — don't default to WebSockets
2. **SSE is massively underused** — it handles 80% of real-time use cases with half the complexity of WebSockets
3. **CDC is the foundation of event-driven architectures** — prefer it over application-level event publishing to avoid the dual-write problem
4. **The fan-out strategy matters more than the transport** — solving the celebrity problem is harder than choosing WebSocket vs SSE
5. **Always design for disconnection** — the happy path is easy; reconnection, ordering, and dedup are where the real engineering happens
6. **HTTP/2 changes the SSE calculus** — the 6-connection limit disappears, making SSE viable for more use cases

:::info Interview Strategy
When asked "How would you design a real-time system?", don't jump to WebSockets. Start with the requirements: latency tolerance, message direction, scale, and reliability. Then walk through the options and justify your choice with trade-offs.
:::
