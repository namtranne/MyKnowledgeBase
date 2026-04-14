# Chapter 1 — Scale From Zero to Millions of Users

> Building a system that supports a single user and evolving it step-by-step to serve millions. Every layer you add solves a specific bottleneck.

---

## Starting Point: Single Server Setup

Everything runs on one machine — web server, database, cache, application logic:

```
   User (Browser / Mobile)
          │
          ▼
   ┌──────────────┐
   │  Single Box  │
   │              │
   │  Web Server  │
   │  App Logic   │
   │  Database    │
   │  Cache       │
   └──────────────┘
```

- DNS resolves `api.mysite.com` → the server's public IP
- Client sends HTTP request → server returns HTML/JSON
- This works fine for a hobby project or prototype

---

## Step 1: Separate the Database

The first scaling move: decouple the database from the application server so each can be scaled independently.

```
   Users
     │
     ▼
┌──────────┐         ┌──────────┐
│  Web     │────────▶│ Database │
│  Server  │         │  Server  │
└──────────┘         └──────────┘
```

### Which Database?

| Type | Examples | Best For | Trade-offs |
|------|----------|----------|------------|
| **Relational (SQL)** | MySQL, PostgreSQL, Oracle | Structured data, joins, transactions, ACID | Harder to scale horizontally |
| **Non-Relational (NoSQL)** | MongoDB, Cassandra, DynamoDB, Redis, Neo4j | Flexible schema, massive scale, low latency | Weaker consistency, limited joins |

**Choose NoSQL when:**
- You need very low latency
- Your data is unstructured or has no relational model
- You need to store massive amounts of data (petabytes)
- You only need to serialize/deserialize data (no complex joins)

**Default choice**: Start with a relational database unless you have a specific reason not to. SQL databases are well-understood, ACID-compliant, and have decades of tooling.

---

## Step 2: Vertical vs Horizontal Scaling

| Strategy | What It Means | Pros | Cons |
|----------|--------------|------|------|
| **Vertical (Scale Up)** | Bigger machine — more CPU, RAM, disk | Simple, no code changes | Hard ceiling, single point of failure, expensive at top end |
| **Horizontal (Scale Out)** | More machines behind a load balancer | Near-infinite scale, fault-tolerant | More complex architecture, stateless requirement |

> Vertical scaling has a hard limit. No matter how powerful the server, one machine can't handle millions of requests. **Horizontal scaling is the way forward.**

---

## Step 3: Load Balancer

Distribute traffic across multiple web servers:

```
          Users
            │
            ▼
   ┌────────────────┐
   │  Load Balancer │  (public IP)
   └───┬────────┬───┘
       │        │
       ▼        ▼
  ┌────────┐ ┌────────┐
  │ Web    │ │ Web    │   (private IPs)
  │ Srv 1  │ │ Srv 2  │
  └────────┘ └────────┘
```

**What the load balancer provides:**

| Capability | Detail |
|-----------|--------|
| **High Availability** | If Server 1 dies, traffic routes to Server 2 |
| **Scalability** | Add more servers as traffic grows |
| **Private networking** | Servers use private IPs; only the LB has a public IP |
| **Health checks** | Continuously probes servers; removes unhealthy ones from rotation |

**Load balancing algorithms**: Round-robin, least connections, IP hash, weighted round-robin, consistent hashing.

---

## Step 4: Database Replication

A single database is still a single point of failure. Use master-slave (primary-replica) replication:

```
  Web Servers
      │
      ├── Writes ──────▶ [Master DB]
      │                      │
      │                 replication
      │                      │
      └── Reads ──────▶ [Slave DB 1]
                        [Slave DB 2]
                        [Slave DB 3]
```

| Aspect | Master | Slave (Replica) |
|--------|--------|-----------------|
| **Operations** | INSERT, UPDATE, DELETE | SELECT (reads only) |
| **Count** | Usually 1 | Multiple (3+ recommended) |
| **Failover** | Slave promoted to master | New slave spun up from backup |

**Advantages:**
- **Performance**: Read queries (typically 80-90% of traffic) spread across replicas
- **Reliability**: Data replicated across multiple nodes; survives disk failure
- **Availability**: If one DB goes down, others serve traffic

**Failover scenarios:**
- **Slave goes down**: Reads redirected to other slaves; new slave provisioned
- **Master goes down**: A slave is promoted to master. More complex — may involve data reconciliation if replication lag exists. In production, use tools like MySQL Group Replication, orchestrator, or cloud-managed failover (AWS RDS Multi-AZ)

---

## Step 5: Cache

A cache is a temporary storage layer that is much faster than the database. Caching reduces database load and improves response time.

### Cache-Aside (Lazy Loading) Strategy

```
  1. Web Server receives request
  2. Check cache for data
     ├── Cache HIT  → return cached data
     └── Cache MISS → query database
                      → store result in cache (with TTL)
                      → return data
```

**Popular caching solutions**: Memcached, Redis

### When to Cache

| Cache | Don't Cache |
|-------|-------------|
| Data read frequently, modified infrequently | Data that changes constantly |
| Computationally expensive query results | Data where staleness is unacceptable (financial transactions) |
| Session data | Very large objects that saturate memory |

### Cache Considerations

| Concern | Best Practice |
|---------|--------------|
| **Expiration** | Set a TTL — too short and you cache-miss constantly; too long and data goes stale. Start with 30s–5min and tune. |
| **Consistency** | Cache invalidation is one of the two hard problems in CS. Use write-through or cache-aside with short TTL. |
| **Eviction policy** | LRU (Least Recently Used) is the most common. Also: LFU, FIFO. |
| **Single point of failure** | Use multiple cache nodes across regions. Redis Cluster or Memcached with consistent hashing. |
| **Overloading the DB** | On cold start or cache failure, all requests hit the DB ("thundering herd"). Use cache warming and request coalescing. |

---

## Step 6: Content Delivery Network (CDN)

A CDN is a geographically distributed network of proxy servers that cache static content (images, CSS, JS, videos) close to users.

```
  User in Sydney                User in London
       │                              │
       ▼                              ▼
  ┌──────────┐                  ┌──────────┐
  │ CDN Edge │                  │ CDN Edge │
  │ Sydney   │                  │ London   │
  └────┬─────┘                  └────┬─────┘
       │ (cache miss only)           │
       └────────────┬────────────────┘
                    ▼
              ┌──────────┐
              │  Origin  │
              │  Server  │
              └──────────┘
```

**How it works:**
1. User requests `image.png` from CDN URL
2. CDN edge checks its cache
3. If cached → return directly (fast, local)
4. If not cached → fetch from origin, cache it, return to user
5. CDN respects `Cache-Control` and `Expires` headers for TTL

### CDN Considerations

| Factor | Guidance |
|--------|----------|
| **Cost** | CDNs charge for data transfer. Don't cache infrequently accessed content |
| **TTL** | Too long → stale content; too short → too many origin fetches |
| **CDN fallback** | If CDN is down, clients should fall back to origin |
| **Invalidation** | Use versioned URLs (`/img/hero_v2.png`) or CDN API invalidation. Versioned URLs are more reliable. |
| **Provider examples** | CloudFront (AWS), Akamai, Cloudflare, Fastly |

---

## Step 7: Stateless Web Tier

To scale the web tier horizontally, servers must be **stateless** — no session data stored locally.

### The Problem with Stateful Servers

```
Stateful:
  User A ──▶ Server 1 (has A's session)
  User B ──▶ Server 2 (has B's session)
  
  If Server 1 dies, User A's session is LOST.
  If User A is routed to Server 2, session is NOT FOUND.
```

### The Solution: Externalize State

```
Stateless:
  User A ──▶ [Load Balancer] ──▶ Any Server
  User B ──▶ [Load Balancer] ──▶ Any Server
  
  All servers read/write session from shared store:
  
  ┌────────┐ ┌────────┐ ┌────────┐
  │ Srv 1  │ │ Srv 2  │ │ Srv 3  │
  └───┬────┘ └───┬────┘ └───┬────┘
      │          │          │
      └──────────┼──────────┘
                 ▼
        ┌────────────────┐
        │  Shared State  │
        │  (Redis /      │
        │   Memcached /  │
        │   DynamoDB)    │
        └────────────────┘
```

**Benefits of stateless architecture:**
- Any server can handle any request → simpler load balancing
- Auto-scaling becomes trivial — just add/remove servers
- No sticky sessions required
- Servers are disposable — replace, upgrade, or restart freely

---

## Step 8: Multiple Data Centers

For global availability and disaster recovery:

```
                         ┌──────────────┐
   Users (geo-routed) ──▶│  GeoDNS /    │
                         │  Global LB   │
                         └──┬────────┬──┘
                            │        │
                    ┌───────┘        └───────┐
                    ▼                        ▼
             ┌──────────┐            ┌──────────┐
             │   DC 1   │            │   DC 2   │
             │ US-East  │◀──sync───▶│ EU-West  │
             │          │            │          │
             │ Web Svrs │            │ Web Svrs │
             │ Cache    │            │ Cache    │
             │ Database │            │ Database │
             └──────────┘            └──────────┘
```

**Key challenges:**

| Challenge | Solution |
|-----------|----------|
| **Traffic routing** | GeoDNS routes users to the nearest DC (e.g., AWS Route 53) |
| **Data synchronization** | Asynchronous replication across DCs. Netflix uses bi-directional replication. |
| **Test and deployment** | Automated deployment to all DCs simultaneously. Test with traffic shifting (canary, blue-green). |
| **Data consistency** | Eventual consistency is typically acceptable. For strong consistency, use quorum reads/writes. |

---

## Step 9: Message Queues

Decouple components using asynchronous processing:

```
  ┌──────────┐     ┌───────────────┐     ┌──────────┐
  │ Producer │────▶│ Message Queue │────▶│ Consumer │
  │ (Web Srv)│     │ (Kafka/SQS/   │     │ (Worker) │
  └──────────┘     │  RabbitMQ)    │     └──────────┘
                   └───────────────┘
```

**Use cases:**
- Photo upload → resize/thumbnail generation (consumer)
- Order placed → send confirmation email (consumer)
- Log events → aggregate and store (consumer)

**Benefits:**
- Producer and consumer scale independently
- If consumer is slow or down, messages queue up (buffer)
- Enables fire-and-forget patterns
- Smooths out traffic spikes

**Real-world example**: Photo processing pipeline
```
Upload Service ──▶ [Queue] ──▶ Thumbnail Worker (x10)
                            ──▶ Face Detection Worker (x3)
                            ──▶ Metadata Extraction Worker (x5)
```
Each worker type scales independently based on its workload.

---

## Step 10: Database Scaling

### Vertical Scaling (Scale Up)

Add more CPU, RAM, SSD to the database server.
- Amazon RDS allows scaling to 24 TB RAM
- Stack Overflow in 2013 served 10M monthly users on a single SQL Server
- **Limits**: hardware ceiling, single point of failure, high cost

### Horizontal Scaling (Sharding)

Split data across multiple databases by a **shard key**:

```
  user_id % 4 = shard assignment

  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Shard 0  │  │ Shard 1  │  │ Shard 2  │  │ Shard 3  │
  │ IDs: 0,4 │  │ IDs: 1,5 │  │ IDs: 2,6 │  │ IDs: 3,7 │
  │   8,12…  │  │   9,13…  │  │  10,14…  │  │  11,15…  │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Sharding Challenges

| Challenge | Description | Mitigation |
|-----------|-------------|------------|
| **Resharding** | When a shard is exhausted or data distribution is uneven | Consistent hashing (see Chapter 5) |
| **Celebrity problem (hotspot)** | One shard gets disproportionate traffic (e.g., Justin Bieber's data) | Further partition that shard, or allocate a dedicated shard per celebrity |
| **Joins and denormalization** | Cross-shard joins are extremely expensive | Denormalize data, or use a separate aggregation service |
| **Operational complexity** | Backups, monitoring, schema changes across all shards | Automation, infrastructure-as-code |

---

## Putting It All Together

The full architecture at millions of users:

```
                        ┌──────────┐
              Users ───▶│  CDN     │ (static assets)
                │       └──────────┘
                │
                ▼
         ┌──────────────┐
         │  Load        │
         │  Balancer    │
         └──┬───┬───┬───┘
            │   │   │
         ┌──┘   │   └──┐
         ▼      ▼      ▼
      ┌─────┐┌─────┐┌─────┐    Stateless Web Servers
      │Srv 1││Srv 2││Srv 3│    (auto-scaled)
      └──┬──┘└──┬──┘└──┬──┘
         │      │      │
         └──────┼──────┘
                ▼
    ┌───────────────────────┐
    │    Shared State       │
    │  (Redis / Memcached)  │
    └───────────────────────┘
                │
         ┌──────┼──────┐
         ▼      ▼      ▼
      ┌─────┐┌─────┐┌─────┐
      │Cache││Cache││Cache│    Distributed Cache
      │Node ││Node ││Node │    (Redis Cluster)
      └─────┘└─────┘└─────┘
                │
         ┌──────┼──────┐
         ▼             ▼
   ┌──────────┐  ┌──────────┐
   │  Master  │  │  Slave   │    Database Replication
   │  (Write) │  │  (Read)  │    (or Sharding at scale)
   └──────────┘  └──────────┘
                │
         ┌──────┼──────┐
         ▼             ▼
   ┌──────────┐  ┌──────────┐
   │  Message │  │  Workers │    Async Processing
   │  Queue   │──▶│         │
   └──────────┘  └──────────┘
```

---

## Scaling Summary — Quick Reference

| Users | Architecture |
|-------|-------------|
| **1** | Single server (web + DB + cache on one box) |
| **100** | Separate DB server |
| **1,000** | Add a load balancer + multiple web servers |
| **10,000** | Database replication (read replicas) |
| **100,000** | CDN for static assets + cache layer (Redis) |
| **1,000,000** | Stateless web tier + session store + message queues |
| **10,000,000+** | Database sharding + multiple data centers + auto-scaling |

---

## Interview Cheat Sheet

**Q: Walk me through scaling a system from zero to millions of users.**
> Start with a single server. Separate the database. Add a load balancer with multiple web servers for horizontal scaling. Add read replicas for the database. Introduce caching (Redis/Memcached) and a CDN for static content. Make the web tier stateless by externalizing session state. Add message queues for async processing. For global scale, deploy across multiple data centers with GeoDNS. Finally, shard the database when vertical scaling hits its limits.

**Q: What is the difference between vertical and horizontal scaling?**
> Vertical scaling means adding more resources (CPU, RAM) to a single machine — simple but has hard limits and is a single point of failure. Horizontal scaling means adding more machines behind a load balancer — more complex but virtually unlimited and fault-tolerant. For web servers, horizontal scaling is preferred. For databases, vertical scaling is often the first move, with sharding as the eventual horizontal strategy.

**Q: Why is a stateless web tier important?**
> Stateless servers store no session data locally. Any server can handle any request, making load balancing simple and auto-scaling trivial. Session state is stored in a shared external store (Redis, Memcached, DynamoDB). If a server dies, no user sessions are lost. Servers become disposable commodities that can be added or removed freely.

**Q: What are the trade-offs of database sharding?**
> Benefits: distributes data and load across machines, enables horizontal scaling of writes. Challenges: cross-shard joins are expensive (requires denormalization), resharding when data grows unevenly, hotspot/celebrity problem where one shard gets disproportionate traffic, and operational complexity of managing many database instances. Consistent hashing helps with even distribution and minimizes resharding impact.

**Q: When would you use a message queue?**
> When you need to decouple producers from consumers, smooth out traffic spikes, handle long-running tasks asynchronously (image processing, email sending), or when the consumer can be temporarily unavailable. Message queues allow each component to scale independently. Examples: photo upload triggers async thumbnail generation; order placement triggers async inventory update and email confirmation.
