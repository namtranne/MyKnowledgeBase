# Chapter 2: Nearby Friends

## 1. Problem Statement & Requirements

Design a scalable backend system for a **Nearby Friends** feature — similar to Facebook's
Nearby Friends — that shows users which of their friends are geographically close in
real-time.

### 1.1 Functional Requirements

| # | Requirement |
|---|-------------|
| F1 | Users can see a list of friends who are within a **configurable radius** (e.g., 5 miles). |
| F2 | The distance to each nearby friend is **updated every few seconds**. |
| F3 | Each entry shows the **last known distance** and a **timestamp** of the last update. |
| F4 | The feature is **opt-in** — only users who enable it participate. |
| F5 | Friends must **mutually opt in** for either to see the other. |

### 1.2 Non-Functional Requirements

| # | Requirement | Notes |
|---|-------------|-------|
| NF1 | **Low latency** | Location updates should propagate to friends within a few seconds. |
| NF2 | **Reliability** | The system should be highly available; brief outages are tolerable. |
| NF3 | **Eventual consistency** | Stale locations are acceptable for a short window. |
| NF4 | **Battery-friendly** | Clients should minimize GPS polling; ~30s intervals. |
| NF5 | **Privacy** | Location data is ephemeral; no long-term storage beyond analytics. |

### 1.3 Scale Estimation

| Metric | Value |
|--------|-------|
| Daily Active Users (DAU) | 100 million |
| Concurrent users with Nearby Friends enabled | 10% of DAU = **10 million** |
| Average friends per user | 400 |
| Average friends with Nearby Friends enabled | ~40 (10% of 400) |
| Location update interval | Every **30 seconds** |
| Location update QPS | 10M / 30 ≈ **~340K updates/sec** |

### 1.4 Back-of-the-Envelope: Bandwidth

Each location update payload is small:

```
{
  "user_id": "u123",        // 8 bytes
  "lat": 37.7749,           // 8 bytes (double)
  "lng": -122.4194,         // 8 bytes (double)
  "timestamp": 1700000000   // 8 bytes
}
```

- Payload per update: ~32 bytes + overhead ≈ **100 bytes**
- Inbound bandwidth: 340K × 100B ≈ **34 MB/s** (manageable)
- Fan-out: each update may notify ~40 friends → 340K × 40 = **~14M messages/sec** outbound

---

## 2. High-Level Design

### 2.1 Why Not Peer-to-Peer?

A naive approach: each user sends their location directly to friends.

**Problems:**
- A user with 40 nearby-friends-enabled friends must maintain 40 connections.
- 10M users × 40 connections = 400M connections — unsustainable on mobile devices.
- No central authority for privacy enforcement or feature toggling.

**Conclusion:** A **centralized backend** is required.

### 2.2 Architecture Overview

```
┌──────────┐         ┌──────────────┐        ┌──────────────────┐
│  Mobile   │◄──WS──►│  WebSocket   │◄──────►│  Redis Pub/Sub   │
│  Client   │        │  Servers     │        │  Cluster         │
└──────────┘         └──────┬───────┘        └──────────────────┘
                            │
                  ┌─────────┼──────────┐
                  ▼         ▼          ▼
           ┌──────────┐ ┌────────┐ ┌───────────────┐
           │  Redis    │ │  User  │ │  Location     │
           │  Location │ │  DB    │ │  History DB   │
           │  Cache    │ │        │ │  (optional)   │
           └──────────┘ └────────┘ └───────────────┘
```

### 2.3 Component Responsibilities

| Component | Role |
|-----------|------|
| **Load Balancer** | Routes initial WebSocket handshake; L4 (TCP) for persistent connections. |
| **API Servers (REST)** | Handle non-real-time operations: user settings, friend list retrieval. |
| **WebSocket Servers** | Maintain persistent connections with clients; relay location updates. |
| **Redis Location Cache** | Stores the latest location for each active user (TTL-based). |
| **Redis Pub/Sub** | Broadcasts location updates to friends' WebSocket servers. |
| **User DB** | Stores user profiles, friend relationships, feature opt-in status. |
| **Location History DB** | (Optional) Stores historical location data for analytics. |

### 2.4 High-Level Flow

```
 User A updates location
         │
         ▼
 ┌───────────────┐   1. Update Redis     ┌─────────────────┐
 │  WebSocket    │─────Location Cache────►│  Redis Location  │
 │  Server (WS1) │                        │  Cache           │
 │               │   2. Publish to        └─────────────────┘
 │               │──────channel "A"──────►┌─────────────────┐
 │               │                        │  Redis Pub/Sub   │
 └───────────────┘                        └────────┬────────┘
                                                   │
                           3. Deliver to all       │
                              subscribers of       │
                              channel "A"          │
                          ┌────────────────────────┤
                          ▼                        ▼
                   ┌─────────────┐          ┌─────────────┐
                   │  WS Server  │          │  WS Server  │
                   │  (WS2)      │          │  (WS3)      │
                   └──────┬──────┘          └──────┬──────┘
                          │                        │
                   4. Compute distance      4. Compute distance
                      & push to friends        & push to friends
                          │                        │
                          ▼                        ▼
                     Friend B               Friend C
```

**Step-by-step:**
1. User A sends a location update over their WebSocket connection to WS1.
2. WS1 writes `{lat, lng, timestamp}` to the **Redis Location Cache**.
3. WS1 publishes the update to Redis Pub/Sub on **channel "user:A"**.
4. All WebSocket servers that have friends of A subscribe to "user:A". They receive
   the update, compute the distance to A for each relevant friend, and push the result
   over the friend's WebSocket connection.

---

## 3. WebSocket Server Deep Dive

### 3.1 Why WebSocket?

| Approach | Latency | Server Load | Bi-directional | Fit |
|----------|---------|-------------|-----------------|-----|
| HTTP Polling | High (interval-bound) | Very high (wasted requests) | No | Poor |
| Long Polling | Medium | High (connection churn) | Half-duplex | Poor |
| SSE (Server-Sent Events) | Low | Moderate | Server→Client only | Partial |
| **WebSocket** | **Low** | **Low** | **Full duplex** | **Best** |

Nearby Friends requires:
- **Client → Server**: periodic location updates (~every 30s).
- **Server → Client**: push notifications whenever a friend's location changes.

WebSocket is the only option that natively supports both directions over a single
persistent TCP connection.

### 3.2 Connection Management

Each WebSocket server maintains an in-memory data structure:

```
ConnectionManager {
    // user_id → WebSocket connection handle
    connections: HashMap<UserId, WsConnection>

    // user_id → Set of friend user_ids (who have nearby friends on)
    friend_subscriptions: HashMap<UserId, HashSet<UserId>>
}
```

When a user connects:
1. Authenticate the WebSocket handshake (JWT / session token).
2. Store the connection in the `connections` map.
3. Fetch the user's friend list from the User DB.
4. Filter friends who have opted into Nearby Friends.
5. Subscribe to each friend's Redis Pub/Sub channel.
6. Fetch each friend's last known location from Redis Location Cache.
7. Compute initial distances and push them to the client.

### 3.3 Handling Millions of Persistent Connections

A single modern server can handle **~50K–100K** concurrent WebSocket connections
(limited by file descriptors, memory for connection buffers, and CPU for
serialization/deserialization).

For **10 million** concurrent users:

```
10,000,000 / 100,000 = 100 WebSocket servers (minimum)
```

In practice, plan for **200–300 servers** to leave headroom for:
- Uneven distribution across servers.
- Rolling deployments (a fraction of servers are always draining).
- Spikes in concurrent users.

### 3.4 Stateful Nature & Scaling Implications

WebSocket servers are **stateful** — each user's connection lives on exactly one server.
This has consequences:

| Challenge | Mitigation |
|-----------|------------|
| Cannot simply round-robin requests | Use **consistent hashing** on `user_id` at the LB layer. |
| Server crash loses all connections | Clients must implement **auto-reconnect with exponential backoff**. |
| Rolling deploys disrupt connections | Use **graceful drain**: stop accepting new connections, wait for existing ones to close or migrate. |
| Cross-server communication needed | Redis Pub/Sub decouples servers — no direct server-to-server calls. |

### 3.5 Connection Routing

A critical question: when User A's location updates, how does the system know which
WebSocket server holds Friend B's connection?

**Answer: It doesn't need to know.** This is the beauty of the Pub/Sub model:

1. WS server holding Friend B **subscribes** to `channel:user_A` on Redis.
2. When A's location is published, Redis delivers it to **all subscribers** of that channel.
3. The routing is handled entirely by Redis Pub/Sub's subscription mechanism.

No service discovery or hash ring is needed for message routing between WebSocket
servers. The hash ring / consistent hashing is only used at the **load balancer** level
to assign users to WebSocket servers.

---

## 4. Redis Pub/Sub for Location Updates

### 4.1 Channel-Per-User Model

Every user who opts into Nearby Friends gets a dedicated Pub/Sub channel:

```
Channel name: "loc:user:{user_id}"
```

**Publishing:** When User A sends a location update, their WebSocket server publishes:

```
PUBLISH loc:user:A '{"lat":37.77,"lng":-122.41,"ts":1700000000}'
```

**Subscribing:** For each friend of User A who is also online with Nearby Friends
enabled, that friend's WebSocket server subscribes:

```
SUBSCRIBE loc:user:A
```

### 4.2 Subscription Topology

```
User A (on WS1) has friends B (WS2), C (WS2), D (WS3)

WS1 subscribes to: loc:user:B, loc:user:C, loc:user:D
WS2 subscribes to: loc:user:A, loc:user:D, ...
WS3 subscribes to: loc:user:A, loc:user:B, loc:user:C, ...

When A sends location update:
  WS1 → PUBLISH loc:user:A {location}
  Redis delivers to → WS2 (for friends B, C)
                    → WS3 (for friend D)
```

Note that **WS2 receives the message once** even though it has two subscribers (B and C)
on that server. The WebSocket server then locally fans out to both B and C.

### 4.3 Memory Estimation

Redis Pub/Sub channels are extremely lightweight — they are essentially just a mapping
from channel name to a set of subscriber connections:

| Item | Count | Memory Per Item | Total |
|------|-------|-----------------|-------|
| Channels | 10M (concurrent users) | ~50 bytes (channel name + pointer) | **~500 MB** |
| Subscriptions | 10M users × 40 friends = 400M | ~20 bytes (pointer) | **~8 GB** |
| **Total** | | | **~8.5 GB** |

This fits comfortably in a Redis cluster with a few nodes.

### 4.4 Why Redis Pub/Sub Works Here

Redis Pub/Sub is a perfect fit for this use case because:

1. **No persistence needed.** Location data is ephemeral — if a message is lost, the
   next update arrives in 30 seconds.
2. **Fire-and-forget semantics.** We don't need acknowledgments or retries.
3. **Lightweight.** No disk I/O, no consumer groups, no message queuing.
4. **Low latency.** In-memory pub/sub with sub-millisecond delivery.
5. **Simple API.** SUBSCRIBE / PUBLISH is trivial to implement.

### 4.5 Limitations of Redis Pub/Sub

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No message persistence** | If a subscriber is offline, it misses messages. | Acceptable — the friend is offline anyway. On reconnect, fetch from cache. |
| **No delivery guarantees** | Messages can be lost during Redis failover. | Tolerable — next update comes in 30s. |
| **Subscriber must be connected** | Can't queue for later delivery. | By design — only online users need updates. |
| **Single-threaded** | One Redis instance has throughput limits. | Shard across multiple Redis instances. |
| **No consumer groups** | Can't load-balance consumption. | Each WS server subscribes independently. |

### 4.6 Redis Pub/Sub vs Message Queues

| Feature | Redis Pub/Sub | Kafka | RabbitMQ |
|---------|--------------|-------|----------|
| Persistence | None | Yes (log) | Yes (optional) |
| Ordering | Per-channel | Per-partition | Per-queue |
| Latency | Sub-ms | Low ms | Low ms |
| Throughput | ~1M msg/s per node | Very high | Moderate |
| Consumer groups | No | Yes | Yes |
| Complexity | Very low | High | Moderate |
| **Fit for ephemeral location** | **Excellent** | Overkill | Overkill |

**Bottom line:** Kafka and RabbitMQ add durability and ordering guarantees we don't need,
at the cost of higher latency and operational complexity.

---

## 5. Location Cache (Redis)

### 5.1 Purpose

The Redis Location Cache stores the **most recent location** for every active user. It
serves two purposes:

1. **Initial load:** When User B comes online, their WebSocket server fetches the last
   known locations of all B's friends from the cache (instead of waiting for the next
   Pub/Sub message).
2. **Distance computation baseline:** When computing whether a friend is "nearby," the
   server needs the friend's current location.

### 5.2 Data Model

```
Key:     loc:{user_id}
Value:   {"lat": 37.7749, "lng": -122.4194, "ts": 1700000000}
TTL:     300 seconds (5 minutes)
```

- **TTL** ensures stale locations are automatically evicted. If a user stops sending
  updates (app backgrounded, feature disabled), their location expires.
- Every location update **resets the TTL** (write-through from the WebSocket server).

### 5.3 Memory Estimation

| Item | Value |
|------|-------|
| Active users | 10M |
| Value size per key | ~60 bytes (JSON) |
| Key size | ~20 bytes |
| Redis overhead per key | ~80 bytes |
| **Total per key** | **~160 bytes** |
| **Total memory** | 10M × 160B = **~1.6 GB** |

A single Redis instance can handle this. For HA, use a Redis cluster with replicas.

### 5.4 Write-Through Flow

```
Client sends location update
         │
         ▼
    WebSocket Server
         │
    ┌────┴────┐
    ▼         ▼
 Redis      Redis
 Cache      Pub/Sub
 (SET)      (PUBLISH)
```

Both writes happen in parallel. The cache write and pub/sub publish are independent
operations — neither blocks the other.

---

## 6. Scaling Deep Dive

### 6.1 WebSocket Server Scaling

**Challenge:** WebSocket connections are stateful and long-lived.

**Strategy: Consistent Hashing at the Load Balancer**

```
┌──────────┐
│   User   │
└────┬─────┘
     │  WebSocket Upgrade Request
     ▼
┌──────────────┐   hash(user_id) % N
│     L4       │─────────────────────►  WS Server
│  Load        │                        Assignment
│  Balancer    │
└──────────────┘
     │
     ├───► WS Server 1  (users hashing to partition 1)
     ├───► WS Server 2  (users hashing to partition 2)
     ├───► WS Server 3  (users hashing to partition 3)
     └───► ...
```

When scaling out (adding servers):
- Use **consistent hashing** to minimize connection migration.
- New server takes over a portion of the hash ring.
- Affected users reconnect (client auto-reconnect handles this).

**Capacity planning:**

| Metric | Value |
|--------|-------|
| Connections per server | 50K–100K |
| Servers for 10M users | 100–200 |
| CPU per server | Processing ~3,400 location updates/s + fan-out |
| Memory per server | ~500 MB (connection buffers + subscription state) |

### 6.2 Redis Pub/Sub Scaling

A single Redis instance can handle roughly **1M messages/sec** throughput. Our system
produces ~14M outbound messages/sec (340K updates × 40 friends average fan-out).

**Sharding strategy:** Partition channels across multiple Redis instances by hashing
the channel name (which contains `user_id`):

```
Redis Pub/Sub instance = hash(user_id) % num_redis_instances
```

| Metric | Value |
|--------|-------|
| Total outbound messages/sec | ~14M |
| Messages per Redis instance (with 16 shards) | ~875K |
| Memory per shard (channels + subscriptions) | ~500 MB |
| Recommended Redis instances | **16–20 shards** with replicas |

**Subscription management:** Each WebSocket server must connect to **every** Redis
Pub/Sub shard, because its users' friends may be distributed across all shards.

```
                    ┌─── Redis Shard 1
WS Server 1 ───────┼─── Redis Shard 2
                    ├─── Redis Shard 3
                    └─── Redis Shard ...

                    ┌─── Redis Shard 1
WS Server 2 ───────┼─── Redis Shard 2
                    ├─── Redis Shard 3
                    └─── Redis Shard ...
```

### 6.3 Handling Server Failures

**WebSocket server failure:**

```
1. Server crashes → all connections on that server are lost.
2. Clients detect disconnect (TCP keepalive / heartbeat timeout).
3. Clients reconnect with exponential backoff.
4. Load balancer routes them to another server (via consistent hashing,
   the "next" server on the ring takes over).
5. New server re-subscribes to all required Pub/Sub channels.
6. New server fetches latest friend locations from Redis cache.
```

**Redis Pub/Sub shard failure:**

```
1. Redis shard goes down → subscriptions on that shard are lost.
2. WebSocket servers detect broken Redis connection.
3. WebSocket servers reconnect to the Redis replica (promoted to primary).
4. Re-subscribe to all channels on that shard.
5. During failover window (~seconds), some location updates may be lost.
   This is acceptable — next update comes in 30s.
```

### 6.4 Adding/Removing Friends While Online

When User A adds User B as a friend (and both have Nearby Friends enabled):

```
1. REST API call: POST /friends/add {user_id: B}
2. API server updates User DB.
3. API server sends internal notification to WS server holding A's connection.
4. WS server for A:
   a. SUBSCRIBE to loc:user:B on the appropriate Redis shard.
   b. GET loc:B from Redis cache → compute distance → push to A.
5. Similarly, WS server for B:
   a. SUBSCRIBE to loc:user:A.
   b. GET loc:A from Redis cache → compute distance → push to B.
```

When a friend is removed, the process reverses with `UNSUBSCRIBE`.

---

## 7. Detailed Flow Walkthroughs

### 7.1 User Login / Initialization

```
┌────────┐                    ┌────────────┐          ┌───────┐    ┌───────────┐
│ Client │                    │  WS Server │          │ Redis │    │  User DB  │
└───┬────┘                    └─────┬──────┘          │ Cache │    └─────┬─────┘
    │                               │                 └───┬───┘          │
    │  1. WS Handshake + Auth Token │                     │              │
    │──────────────────────────────►│                     │              │
    │                               │  2. Validate token  │              │
    │                               │─────────────────────┼─────────────►│
    │                               │  3. Get friend list  │              │
    │                               │◄─────────────────────┼─────────────│
    │                               │                     │              │
    │                               │  4. Filter friends with NF enabled │
    │                               │                     │              │
    │                               │  5. SUBSCRIBE to each friend's     │
    │                               │     channel in Redis Pub/Sub       │
    │                               │────────────────────►│              │
    │                               │                     │              │
    │                               │  6. MGET friend locations from cache
    │                               │────────────────────►│              │
    │                               │◄────────────────────│              │
    │                               │                     │              │
    │  7. Push initial nearby       │                     │              │
    │     friends list with         │                     │              │
    │     distances                 │                     │              │
    │◄──────────────────────────────│                     │              │
    │                               │                     │              │
```

### 7.2 Periodic Location Update

```
Time ──────────────────────────────────────────────────────────────►

Client A        WS Server 1       Redis Cache     Redis Pub/Sub      WS Server 2      Client B
   │                 │                 │                │                 │                │
   │ 1. Send         │                 │                │                 │                │
   │ location        │                 │                │                 │                │
   │────────────────►│                 │                │                 │                │
   │                 │ 2. SET loc:A    │                │                 │                │
   │                 │   {lat,lng,ts}  │                │                 │                │
   │                 │────────────────►│                │                 │                │
   │                 │                 │                │                 │                │
   │                 │ 3. PUBLISH      │                │                 │                │
   │                 │   loc:user:A    │                │                 │                │
   │                 │   {lat,lng,ts}  │                │                 │                │
   │                 │─────────────────┼───────────────►│                 │                │
   │                 │                 │                │                 │                │
   │                 │                 │                │ 4. Deliver to   │                │
   │                 │                 │                │    subscribers  │                │
   │                 │                 │                │────────────────►│                │
   │                 │                 │                │                 │                │
   │                 │                 │                │                 │ 5. Compute     │
   │                 │                 │                │                 │    distance    │
   │                 │                 │                │                 │    (A,B)       │
   │                 │                 │                │                 │                │
   │                 │                 │                │                 │ 6. If within   │
   │                 │                 │                │                 │    radius,     │
   │                 │                 │                │                 │    push to B   │
   │                 │                 │                │                 │───────────────►│
   │                 │                 │                │                 │                │
```

### 7.3 Friend Comes Online

```
1. Friend B opens app → WS handshake with WS Server 2.
2. WS Server 2 fetches B's friend list → includes A.
3. WS Server 2:
   a. SUBSCRIBE loc:user:A (on appropriate Redis shard).
   b. GET loc:A from Redis cache.
   c. Compute distance(A, B).
   d. If within radius → push to B.
4. Meanwhile, WS Server 1 (holding A's connection):
   a. Receives internal notification that B came online.
   b. SUBSCRIBE loc:user:B.
   c. GET loc:B → compute distance → push to A if nearby.
```

**How does WS Server 1 know B came online?** Two approaches:
- **Presence channel:** B's server publishes to a `presence:user:B` channel.
- **Lazy discovery:** A only learns about B at B's next location update (within 30s).

The lazy approach is simpler and sufficient — the delay is at most one update interval.

### 7.4 Friend Goes Offline

```
1. Friend B disconnects (app closed, network lost).
2. WS Server 2 detects disconnect (heartbeat timeout).
3. WS Server 2:
   a. UNSUBSCRIBE from all of B's friends' channels.
   b. Remove B from connection manager.
   c. Do NOT delete B's location from cache (TTL will handle expiry).
4. B's location in Redis cache expires after TTL (5 minutes).
5. Other friends naturally stop seeing B as updates stop arriving
   and cached location becomes stale.
```

---

## 8. Distance Computation

### 8.1 Haversine Formula

The standard way to compute distance between two geographic coordinates:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
d = 2R · arctan2(√a, √(1−a))

where R = 6,371 km (Earth's radius)
```

This is computed on the **WebSocket server** (not the client) to avoid sending raw
coordinates to other users (privacy).

### 8.2 Optimization: Quick Rejection

Before running the full Haversine calculation, use a bounding box check:

```
If |lat_A - lat_B| > threshold_degrees → definitely not nearby → skip
If |lng_A - lng_B| > threshold_degrees → definitely not nearby → skip
```

At the equator, 1 degree ≈ 111 km. For a 5-mile (~8 km) radius:

```
threshold ≈ 8/111 ≈ 0.072 degrees
```

This eliminates most candidates with simple subtraction before doing expensive
trigonometry.

---

## 9. Alternative Approaches

### 9.1 Geohash-Based Fan-Out

Instead of a channel per user, use **geohash-based channels**:

```
Channel: "geo:9q8yy"  (geohash of precision 5 ≈ ~5km grid cell)
```

**How it works:**
1. Users subscribe to the geohash channel of their current cell + neighboring cells.
2. When a user moves, they publish to their current geohash channel.
3. All users in the same (or neighboring) cells receive the update.
4. The receiving server checks if the sender is a friend before forwarding.

**Trade-offs:**

| Aspect | Per-User Channel | Geohash Channel |
|--------|-----------------|-----------------|
| Channel count | 10M (one per user) | ~1M (grid cells with users) |
| Subscriptions | 400M (user×friends) | 10M × 9 cells = 90M |
| Irrelevant messages | None | High (strangers in same cell) |
| Privacy | Good (only friends subscribe) | Worse (location leaked to cell) |
| Resubscription on move | Not needed | Required on cell boundary crossing |
| **Winner for this use case** | **Yes** | No |

The per-user channel model is superior for friend-based proximity because it avoids
processing irrelevant updates from strangers. Geohash channels are better for
"discover nearby strangers" features (e.g., dating apps).

### 9.2 Erlang/Elixir for Massive Concurrency

The BEAM VM (Erlang/Elixir) is designed for millions of lightweight processes:

- Each WebSocket connection can be a separate Erlang process (~2KB each).
- A single server could handle **1–2 million connections**.
- Built-in distribution and fault tolerance (OTP supervision trees).
- WhatsApp famously handled 2M connections per server on Erlang.

**When to mention in interviews:** If the interviewer probes on reducing server count
or asks about technology choices for the WebSocket tier.

### 9.3 Distributed Pub/Sub with Kafka

Replace Redis Pub/Sub with Kafka:

```
Topic: "location-updates"
Partitioned by: user_id
Retention: 5 minutes (short)
```

**Pros:**
- Durable — survives broker restarts.
- Horizontally scalable with partitions.
- Consumer groups for parallel processing.

**Cons:**
- Higher latency than Redis Pub/Sub.
- Overkill — we don't need durability for ephemeral location data.
- Operational complexity of a Kafka cluster.
- Per-user channels don't map well to Kafka's topic model (10M topics is impractical;
  would need to use a single topic with filtering, losing the pub/sub efficiency).

**Verdict:** Redis Pub/Sub is the right tool. Mention Kafka only if the interviewer
asks about durability requirements or if the system evolves to need persistent
location history.

---

## 10. Scaling: Putting It All Together

### 10.1 Full Architecture at Scale

```
                              ┌─────────────────────────┐
                              │      API Gateway /       │
                              │      Load Balancer       │
                              │   (L4, consistent hash)  │
                              └────────────┬────────────┘
                                           │
              ┌────────────────────────────┬┼┬────────────────────────────┐
              ▼                            ▼ ▼                            ▼
     ┌──────────────┐            ┌──────────────┐              ┌──────────────┐
     │  WS Server 1 │            │  WS Server 2 │    ...       │ WS Server N  │
     │  (50K conns)  │            │  (50K conns)  │              │  (50K conns)  │
     └──────┬───────┘            └──────┬───────┘              └──────┬───────┘
            │                           │                             │
            │         Each WS server connects to ALL Redis shards     │
            │                           │                             │
     ┌──────┴───────────────────────────┴─────────────────────────────┴──────┐
     │                                                                       │
     ▼              ▼              ▼              ▼              ▼            │
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│ Redis   │   │ Redis   │   │ Redis   │   │ Redis   │   │ Redis   │  ...   │
│ PubSub  │   │ PubSub  │   │ PubSub  │   │ PubSub  │   │ PubSub  │        │
│ Shard 1 │   │ Shard 2 │   │ Shard 3 │   │ Shard 4 │   │ Shard 5 │        │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
                                                                             │
     ┌───────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────┐     ┌──────────────────────┐
│   Redis Location     │     │   Redis Location     │
│   Cache (Primary)    │────►│   Cache (Replica)    │
└──────────────────────┘     └──────────────────────┘
```

### 10.2 Resource Summary

| Component | Count | Specs Per Node |
|-----------|-------|---------------|
| WebSocket Servers | 200 | 8 cores, 16 GB RAM, 100K fd limit |
| Redis Pub/Sub Shards | 16 | 4 cores, 16 GB RAM |
| Redis Location Cache | 2 (primary + replica) | 4 cores, 8 GB RAM |
| API Servers | 20 | 4 cores, 8 GB RAM |
| User DB (MySQL/Postgres) | 3 (1 primary + 2 replicas) | 16 cores, 64 GB RAM |
| Load Balancers | 2 (active-passive) | — |

---

## 11. Trade-offs & Interview Tips

### 11.1 Key Design Decisions to Highlight

| Decision | Why |
|----------|-----|
| WebSocket over polling | Bi-directional, low overhead for frequent updates. |
| Redis Pub/Sub over Kafka | Ephemeral data, no durability needed, lower latency. |
| Per-user channels over geohash | Friend-based proximity → per-user is more efficient. |
| TTL on location cache | Automatic cleanup of stale locations, no GC process. |
| Distance computed server-side | Privacy — raw coordinates never shared between users. |
| Eventual consistency | 30s update interval makes strong consistency unnecessary. |

### 11.2 Privacy Considerations

This is a common follow-up. Be ready to discuss:

- **Mutual opt-in:** Both users must enable Nearby Friends to see each other.
- **No exact location sharing:** Only the computed distance is sent to the client
  (e.g., "0.5 miles away"), not raw lat/lng.
- **Ephemeral storage:** Location data is TTL'd in Redis, not persisted long-term.
- **Location history opt-in:** If analytics requires historical data, it should be a
  separate, explicit consent with clear data retention policies.
- **Precision reduction:** Optionally round coordinates to reduce precision
  (e.g., 3 decimal places ≈ 111m accuracy).
- **Regulatory compliance:** GDPR (right to delete location data), CCPA, etc.

### 11.3 Common Follow-Up Questions

**Q: What if a user has 5,000 friends?**
- 5,000 subscriptions per user is still manageable for Redis Pub/Sub.
- The WebSocket server does more work on login (fetching 5,000 locations).
- Consider paginating the initial load or only subscribing to "close friends" first.
- Set an upper bound (e.g., 500 Nearby Friends) as a product constraint.

**Q: How do you handle users crossing city/country boundaries?**
- The system is boundary-agnostic — it works purely on coordinates.
- No special handling needed; distance computation is the same everywhere.

**Q: How would you add "nearby friends of friends"?**
- Significantly harder — the subscription fan-out grows quadratically.
- Would likely need a geohash-based approach for this use case.
- Worth discussing the trade-off: per-user channels don't scale for 2nd-degree.

**Q: What about battery consumption?**
- 30-second GPS polling is a reasonable balance.
- Use significant-location-change APIs (iOS/Android) to reduce polling when
  the user isn't moving.
- Reduce frequency in background mode (e.g., every 5 minutes).
- Client-side optimization: skip sending update if location hasn't changed.

**Q: How do you test this system?**
- Load testing: simulate 10M WebSocket connections with tools like `k6` or `Gatling`.
- Chaos testing: kill Redis shards, WebSocket servers to verify reconnection logic.
- Latency testing: measure end-to-end time from location update to friend notification.
- Geographic testing: verify distance computation accuracy against known distances.

### 11.4 Interview Delivery Strategy

```
Recommended time allocation (35-minute design):

 0-5  min  │  Requirements & scale estimation
 5-10 min  │  High-level architecture (draw the diagram)
10-20 min  │  Deep dive: WebSocket + Redis Pub/Sub (the core)
20-28 min  │  Scaling, failure handling, detailed flows
28-35 min  │  Trade-offs, alternatives, privacy
```

**Key phrases to use:**
- "The key insight is that we can use a channel-per-user model with Redis Pub/Sub
  to decouple WebSocket servers."
- "Location data is inherently ephemeral, so we don't need message persistence —
  this makes Redis Pub/Sub ideal over Kafka."
- "The system is eventually consistent by design: a 30-second update interval
  means we're already tolerating staleness."
- "Privacy is built into the architecture: we compute distances server-side
  and never share raw coordinates between users."

---

## 12. Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEARBY FRIENDS CHEAT SHEET                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCALE:  10M concurrent users, 340K updates/sec, 14M msg/sec   │
│                                                                 │
│  CORE COMPONENTS:                                               │
│    • WebSocket servers (stateful, ~200 nodes)                   │
│    • Redis Pub/Sub (channel-per-user, ~16 shards)               │
│    • Redis Location Cache (TTL 5min, ~1.6 GB)                   │
│                                                                 │
│  KEY FLOW:                                                      │
│    User A location update                                       │
│      → WS Server writes to Redis cache                          │
│      → WS Server publishes to loc:user:A channel                │
│      → Redis delivers to subscribing WS servers                 │
│      → WS servers compute distance & push to friends            │
│                                                                 │
│  WHY REDIS PUB/SUB:                                             │
│    ✓ Ephemeral data     ✓ Sub-ms latency                        │
│    ✓ No persistence     ✓ Simple API                            │
│    ✓ Fire-and-forget    ✓ Lightweight memory                    │
│                                                                 │
│  WHY PER-USER CHANNELS (not geohash):                           │
│    ✓ No irrelevant messages  ✓ Better privacy                   │
│    ✓ No resubscription on move                                  │
│                                                                 │
│  TRADE-OFFS TO MENTION:                                         │
│    • Eventual consistency is fine (30s interval)                 │
│    • Distance computed server-side (privacy)                    │
│    • WebSocket is stateful → need careful scaling               │
│    • No persistence → cache miss on reconnect (use Redis GET)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
