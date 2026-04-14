---
sidebar_position: 3
title: "02 — Dealing with Contention"
---

# 🔒 Dealing with Contention

Contention occurs when multiple actors (threads, processes, services, users) compete for the same shared resource simultaneously. It is the root cause of race conditions, data corruption, deadlocks, and throughput bottlenecks in distributed systems.

---

## 🔍 The Core Problem

In a distributed system, **concurrent access to shared mutable state** is the fundamental challenge. Consider a flash sale:

```
Time 0ms:  Stock = 1 (last item)

Time 1ms:  User A reads stock → sees 1  |  User B reads stock → sees 1
Time 2ms:  User A: stock >= 1? → YES    |  User B: stock >= 1? → YES
Time 3ms:  User A: stock = 0, place order | User B: stock = 0, place order

Result: 2 orders placed, but only 1 item existed → OVERSOLD
```

This is a **check-then-act** race condition — the read and the write are not atomic.

### Where Contention Appears

| Domain | Contention Point | Consequence |
|--------|-----------------|-------------|
| **E-commerce** | Inventory count | Overselling |
| **Banking** | Account balance | Double-spending |
| **Booking systems** | Seat/room availability | Double-booking |
| **Distributed counters** | Like/view counts | Inaccurate counts |
| **Rate limiting** | Request counters | Exceeded quotas |
| **Leader election** | Lock/lease acquisition | Split-brain |
| **Caching** | Cache slot during eviction | Stale data, cache stampede |

---

## 🔧 Approach 1: Pessimistic Concurrency Control

**Assume conflicts will happen and prevent them by locking before access.**

### Database-Level: `SELECT FOR UPDATE`

The most direct way to prevent concurrent modification at the database level.

```sql
BEGIN;

-- Acquire an exclusive lock on the row
SELECT stock FROM products WHERE id = 42 FOR UPDATE;

-- Now this row is locked — no other transaction can read FOR UPDATE or modify it
-- until this transaction commits or rolls back

-- Safe to check and modify
UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;

COMMIT;
```

**How it works internally:**

1. PostgreSQL acquires a **row-level exclusive lock** on the selected row
2. Any other transaction attempting `SELECT FOR UPDATE` or `UPDATE` on the same row **blocks** until the first transaction completes
3. The lock is released on `COMMIT` or `ROLLBACK`

#### Variants

| SQL Clause | Behavior |
|-----------|----------|
| `FOR UPDATE` | Exclusive lock — blocks all other `FOR UPDATE` and writes |
| `FOR SHARE` | Shared lock — allows other `FOR SHARE`, blocks `FOR UPDATE` and writes |
| `FOR UPDATE NOWAIT` | Fail immediately if lock is unavailable (no waiting) |
| `FOR UPDATE SKIP LOCKED` | Skip locked rows, process only unlocked ones (queue pattern) |

### `SKIP LOCKED` for Queue-Like Processing

A powerful pattern for distributing work across multiple workers without contention:

```sql
-- Worker 1:
BEGIN;
SELECT * FROM tasks 
WHERE status = 'pending' 
ORDER BY created_at 
LIMIT 10 
FOR UPDATE SKIP LOCKED;

-- Process tasks...
UPDATE tasks SET status = 'processing' WHERE id IN (...);
COMMIT;

-- Worker 2 (running concurrently):
-- Automatically skips the 10 rows locked by Worker 1
-- Gets the NEXT 10 pending tasks
```

This eliminates contention between workers entirely — each worker gets a non-overlapping subset.

### Database-Level: Advisory Locks

Application-defined locks managed by the database but not tied to specific rows or tables.

```sql
-- Acquire a named lock (blocks until available)
SELECT pg_advisory_lock(hashtext('process-payments'));

-- ... perform exclusive operation ...

-- Release the lock
SELECT pg_advisory_unlock(hashtext('process-payments'));
```

| Type | Function | Behavior |
|------|----------|----------|
| **Session-level** | `pg_advisory_lock(key)` | Held until session ends or explicit unlock |
| **Transaction-level** | `pg_advisory_xact_lock(key)` | Auto-released at transaction end |
| **Non-blocking** | `pg_try_advisory_lock(key)` | Returns `false` if lock unavailable |

**Use cases:** Ensuring only one instance of a cron job runs, preventing concurrent schema migrations, controlling access to external APIs.

### Distributed Locks with Redis

When the lock must span multiple services (not just DB transactions), use a distributed lock.

#### Simple Redis Lock (Single Node)

```python
import redis
import uuid
import time

class RedisLock:
    def __init__(self, client, key, ttl=10):
        self.client = client
        self.key = f"lock:{key}"
        self.ttl = ttl
        self.token = str(uuid.uuid4())

    def acquire(self, timeout=5):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.client.set(self.key, self.token, nx=True, ex=self.ttl):
                return True
            time.sleep(0.01)  # Spin wait
        return False

    def release(self):
        # Atomic: only delete if we still own the lock
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.client.eval(script, 1, self.key, self.token)
```

**Critical detail:** The release uses a Lua script for atomicity — you must verify ownership (via the token/UUID) before deleting. Without this, a slow lock holder could release a lock that was already acquired by someone else after TTL expiry.

#### The Redlock Algorithm (Multi-Node)

For higher reliability, Redis's creator proposed Redlock, which acquires locks across **N independent Redis nodes** (typically 5):

```
1. Record current time T1
2. Try to acquire lock on all N nodes with short timeout
3. Lock is acquired if:
   - Successful on majority (≥ N/2 + 1) nodes
   - Total acquisition time (T2 - T1) < lock TTL
4. Effective TTL = original TTL - (T2 - T1)
5. If lock fails, release on all nodes
```

:::warning Redlock Controversy
Martin Kleppmann's analysis ("How to do distributed locking") argues that Redlock is unsafe because:
- **Clock jumps** can cause locks to expire prematurely
- **Process pauses** (GC, page faults) can cause a client to act on an expired lock
- **No fencing** — nothing prevents a slow client from making writes after lock expiry

The safe alternative: use **fencing tokens** (see below) or a consensus system like ZooKeeper.
:::

### Distributed Locks with ZooKeeper

ZooKeeper provides stronger guarantees through its consensus-based architecture:

```
1. Client creates an ephemeral sequential znode:
   /locks/resource-001/lock-0000000042

2. Client checks: am I the lowest-numbered child?
   ├── Yes → Lock acquired
   └── No → Set a watch on the next-lower child, wait

3. When holder disconnects (or session expires),
   ephemeral node is auto-deleted
   → Next waiter gets notified and acquires lock
```

**Advantages over Redis:**
- Ephemeral nodes auto-delete on session loss (no stale locks)
- Sequential nodes provide fair ordering (no starvation)
- Watches provide notification without polling

**Disadvantages:**
- Higher latency than Redis (consensus overhead)
- Operational complexity (ZooKeeper cluster management)
- Session timeout must be carefully tuned

---

## 🔧 Approach 2: Optimistic Concurrency Control (OCC)

**Assume conflicts are rare — proceed without locking, but detect conflicts before committing.**

### Version-Based OCC

Every record has a version counter. Updates include the expected version — if it doesn't match, someone else modified the record.

```sql
-- Step 1: Read the record and its version
SELECT stock, version FROM products WHERE id = 42;
-- Returns: stock=5, version=17

-- Step 2: Update only if version hasn't changed
UPDATE products 
SET stock = stock - 1, version = version + 1 
WHERE id = 42 AND version = 17;

-- Step 3: Check rows affected
-- 1 row affected → success
-- 0 rows affected → conflict! Another transaction modified the row.
-- → Re-read and retry (or fail to user)
```

### Application-Level OCC with HTTP ETags

```http
GET /api/products/42
→ 200 OK
→ ETag: "v17"
→ {"stock": 5, "price": 29.99}

PUT /api/products/42
If-Match: "v17"
{"stock": 4, "price": 29.99}

→ 200 OK (if version matches)
→ 409 Conflict (if version changed — someone else edited)
```

### Compare-and-Swap (CAS)

An atomic hardware primitive extended to distributed systems. The update only applies if the current value matches the expected value.

```python
# Redis CAS using WATCH/MULTI/EXEC
def decrement_stock(redis_client, product_id):
    key = f"product:{product_id}:stock"
    
    while True:
        with redis_client.pipeline() as pipe:
            try:
                pipe.watch(key)
                stock = int(pipe.get(key))
                
                if stock <= 0:
                    return False  # Out of stock
                
                pipe.multi()
                pipe.set(key, stock - 1)
                pipe.execute()  # Atomic — fails if key changed since WATCH
                return True
                
            except redis.WatchError:
                continue  # Retry — someone else modified the value
```

### OCC vs Pessimistic: When to Use Which

| Factor | Optimistic (OCC) | Pessimistic (Locking) |
|--------|------------------|----------------------|
| **Conflict rate** | Low (< 5% of operations) | High (> 20% of operations) |
| **Read:Write ratio** | Read-heavy | Write-heavy on contended resources |
| **Latency tolerance** | Can tolerate retries | Need first-attempt success |
| **Lock duration** | N/A | Short (< 100ms) |
| **Deadlock risk** | None | Must handle deadlocks |
| **Throughput** | Higher when conflicts are rare | Lower due to lock waiting |
| **Example** | Product catalog edits | Flash sale inventory |

---

## 🔧 Approach 3: Fencing Tokens

A mechanism to prevent stale lock holders from making dangerous writes. Every lock acquisition returns a monotonically increasing **fencing token**, and the storage system rejects writes with an outdated token.

### The Problem Fencing Solves

```
Client A acquires lock → token=33
Client A enters GC pause (30 seconds)
Lock expires (TTL=10s)
Client B acquires lock → token=34
Client B writes to storage ← VALID
Client A wakes up, still thinks it holds lock
Client A writes to storage ← DANGER: stale lock, overwrites B's data
```

### The Solution

```
┌──────────┐    acquire lock    ┌──────────┐
│ Client A │ ────────────────► │   Lock   │ → returns fencing token = 33
└──────────┘                    │  Service │
                                └──────────┘

Client A writes to storage with token=33 ← Storage accepts (33 ≥ last seen 32)

--- Client A pauses, lock expires, Client B gets lock ---

┌──────────┐    acquire lock    ┌──────────┐
│ Client B │ ────────────────► │   Lock   │ → returns fencing token = 34
└──────────┘                    └──────────┘

Client B writes to storage with token=34 ← Storage accepts (34 ≥ last seen 33)

--- Client A wakes up ---

Client A writes to storage with token=33 ← Storage REJECTS (33 < last seen 34)
```

**The storage system maintains the highest token it has seen and rejects any write with a lower token.** This ensures that even if a lock is held by a stale client, it cannot corrupt data.

### Implementation

```python
class FencedStorage:
    def __init__(self):
        self.data = {}
        self.max_token = {}

    def write(self, key, value, fencing_token):
        if key in self.max_token and fencing_token < self.max_token[key]:
            raise StaleTokenError(
                f"Token {fencing_token} < max seen {self.max_token[key]}"
            )
        self.max_token[key] = fencing_token
        self.data[key] = value
```

:::info Where to Get Fencing Tokens
ZooKeeper's sequential znodes naturally provide monotonically increasing tokens. For Redis-based locks, you can use a separate Redis `INCR` counter or a database sequence.
:::

---

## 🔧 Approach 4: Queue-Based Serialization

**Eliminate contention entirely by routing all operations on a resource through a single serial queue.**

### The Pattern

```
                                     ┌─────────────────────────────┐
    Request A (product 42) ─────►    │                             │
    Request B (product 42) ─────►    │  Queue for Product 42       │──► Single Worker
    Request C (product 42) ─────►    │  (serialized processing)    │    (no locks needed)
                                     └─────────────────────────────┘

    Request D (product 99) ─────►    ┌─────────────────────────────┐
    Request E (product 99) ─────►    │  Queue for Product 99       │──► Single Worker
                                     │  (serialized processing)    │    (no locks needed)
                                     └─────────────────────────────┘
```

### Implementation with Kafka

Kafka partitions provide natural serialization — all messages with the same key go to the same partition, which is processed by exactly one consumer.

```java
// Producer: partition by product ID
producer.send(new ProducerRecord<>(
    "inventory-commands",   // topic
    productId,              // key → determines partition
    command                 // value
));

// Consumer: each partition processed by exactly one consumer in the group
// → No concurrent access to the same product → No contention
@KafkaListener(topics = "inventory-commands")
public void processCommand(ConsumerRecord<String, InventoryCommand> record) {
    // This handler is the ONLY code modifying this product's inventory
    // No locks needed — Kafka guarantees single-consumer-per-partition
    InventoryCommand cmd = record.value();
    inventoryService.applyCommand(cmd);
}
```

### Advantages

| Advantage | Detail |
|-----------|--------|
| **Zero contention** | Single writer per resource — impossible to have conflicts |
| **Natural ordering** | Events processed in the exact order they were received |
| **Auditability** | The queue IS the audit log |
| **Backpressure** | Queue depth signals when the system is overloaded |
| **Replay** | Can rebuild state by replaying the queue from the beginning |

### Disadvantages

| Disadvantage | Detail |
|--------------|--------|
| **Latency** | Async processing adds latency vs direct DB writes |
| **Throughput ceiling** | Single consumer per partition limits per-resource throughput |
| **Complexity** | Need message queue infrastructure |
| **Error handling** | Poison messages can block the queue — need DLQ strategies |
| **Head-of-line blocking** | Slow message blocks all subsequent messages in the partition |

---

## 🔥 The Hot Key / Hot Partition Problem

When a single resource receives a disproportionate amount of traffic, it becomes a **hot key** — a bottleneck that can't be solved by adding more servers.

### Examples

| System | Hot Key | Cause |
|--------|---------|-------|
| **E-commerce** | Product ID of a viral item | Flash sale |
| **Social media** | Celebrity user ID | Taylor Swift posts |
| **Database** | Auto-increment counter | Contention on sequence |
| **Cache** | Popular config/feature flag | Every request reads it |
| **Kafka** | High-cardinality partition key | Skewed distribution |

### Mitigation Strategies

#### 1. Key Splitting / Sharding the Hot Key

Split a single counter into N sub-counters and sum them on read.

```
Instead of:  product:42:stock = 1000

Use:         product:42:stock:0 = 200
             product:42:stock:1 = 200
             product:42:stock:2 = 200
             product:42:stock:3 = 200
             product:42:stock:4 = 200

Write: randomly pick a shard → DECR product:42:stock:{rand(0,4)}
Read:  SUM all shards → total stock
```

**Trade-off:** Reads become more expensive (must aggregate), but writes are distributed.

#### 2. Local Aggregation + Periodic Flush

Buffer writes in application memory and periodically flush to the central store.

```
┌──────────┐    +1,+1,+1,+1    ┌──────────┐
│ Server 1 │  ──── every 1s ──► │          │
│ count: 4 │                    │ Central  │
└──────────┘                    │ Counter  │
                                │          │
┌──────────┐    +1,+1,+1       │ Total:   │
│ Server 2 │  ──── every 1s ──► │ accurate │
│ count: 3 │                    │ within   │
└──────────┘                    │ 1 second │
                                └──────────┘
```

**Trade-off:** Counter is eventually consistent (stale by up to flush interval), but contention drops by orders of magnitude.

#### 3. Read-Through Caching with Jitter

For hot reads, cache the value with randomized TTLs to prevent thundering herd.

```python
def get_product(product_id):
    cached = redis.get(f"product:{product_id}")
    if cached:
        return cached
    
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    
    # Add jitter: TTL between 50-70 seconds instead of fixed 60
    ttl = 60 + random.randint(-10, 10)
    redis.setex(f"product:{product_id}", ttl, product)
    
    return product
```

#### 4. Request Coalescing

Multiple concurrent requests for the same resource are collapsed into a single backend call.

```python
import asyncio
from collections import defaultdict

class RequestCoalescer:
    def __init__(self):
        self._pending = {}
    
    async def get(self, key, fetch_fn):
        if key in self._pending:
            # Another request is already fetching this key — wait for it
            return await self._pending[key]
        
        future = asyncio.ensure_future(fetch_fn(key))
        self._pending[key] = future
        
        try:
            result = await future
            return result
        finally:
            del self._pending[key]
```

---

## 🛡️ Idempotency Under Contention

When operations are retried (due to timeouts, network errors, or contention), you must ensure they can be safely repeated without side effects.

### Idempotency Key Pattern

```
┌────────┐     POST /payments         ┌──────────┐
│ Client │ ──── Idempotency-Key: ───► │  Server  │
│        │      abc-123-def           │          │
└────────┘                            │ 1. Check │
                                      │    store │
         ┌─────────────────────────── │ 2. Key   │
         │  Network timeout           │    found?│
         │  (client doesn't know      └──────────┘
         │   if it succeeded)               │
         │                           ┌──────┴──────┐
         │                          No            Yes
         │                           │              │
         ▼                    Process &         Return
┌────────┐                    store result     cached result
│ Client │     POST /payments                  (same response)
│ RETRY  │ ──── Idempotency-Key: ───►
│        │      abc-123-def
└────────┘
```

### Implementation

```python
def process_payment(request):
    idempotency_key = request.headers["Idempotency-Key"]
    
    # Check if we've already processed this request
    existing = db.query(
        "SELECT response FROM idempotency_store WHERE key = %s",
        idempotency_key
    )
    
    if existing:
        return existing.response  # Return cached response
    
    # Process the payment (within a transaction)
    with db.transaction():
        result = payment_gateway.charge(request.amount)
        
        db.execute(
            "INSERT INTO idempotency_store (key, response, created_at) VALUES (%s, %s, NOW())",
            idempotency_key, serialize(result)
        )
    
    return result
```

:::tip Idempotency Key Lifecycle
- **Generation:** Client generates a UUID before the first attempt
- **Scope:** Key is specific to a single logical operation
- **TTL:** Keys should expire after a reasonable window (e.g., 24–72 hours)
- **Storage:** Must be in a durable store (DB), not just cache
:::

---

## ⚖️ Comparison Matrix

| Strategy | Conflict Rate | Latency | Complexity | Throughput | Data Safety |
|----------|:------------:|:-------:|:----------:|:----------:|:-----------:|
| **SELECT FOR UPDATE** | High | Low | Low | Medium | Strong |
| **Advisory Locks** | High | Low | Low | Medium | Strong |
| **Distributed Lock (Redis)** | High | Low | Medium | Medium | Weak-Medium |
| **Distributed Lock (ZooKeeper)** | High | Medium | High | Lower | Strong |
| **OCC (Versioning)** | Low | Very Low | Low | Very High | Strong |
| **CAS** | Low-Medium | Very Low | Medium | High | Strong |
| **Fencing Tokens** | High | Medium | High | Medium | Very Strong |
| **Queue Serialization** | N/A (eliminated) | Medium | Medium | High | Strong |
| **Key Splitting** | High | Low | Medium | Very High | Eventually Consistent |

### Decision Framework

```
What's your conflict rate?
├── Very High (> 20% contention)
│   ├── Can you serialize through a queue? → Queue-Based Serialization
│   ├── Single database? → SELECT FOR UPDATE
│   └── Cross-service? → Distributed Lock + Fencing Token
├── Medium (5-20%)
│   ├── Short critical section? → Pessimistic Lock
│   └── Longer operation? → OCC with retry
└── Low (< 5%)
    └── Optimistic Concurrency Control (versioning / CAS)

Is it a hot key problem?
├── Hot writes → Key Splitting + Local Aggregation
└── Hot reads → Caching + Request Coalescing + Jitter
```

---

## 🧠 Key Takeaways

1. **Pessimistic locking is the safe default** for high-contention scenarios — it's simple, well-understood, and supported by every database
2. **Optimistic concurrency shines when conflicts are rare** — it avoids lock overhead but adds retry complexity
3. **Distributed locks are harder than they look** — always use fencing tokens to prevent stale lock holders from corrupting data
4. **Queue-based serialization eliminates contention entirely** at the cost of latency — prefer it when async processing is acceptable
5. **The hot key problem cannot be solved by scaling horizontally** — you must split the key, buffer writes, or coalesce reads
6. **Idempotency is not optional in distributed systems** — every operation that can be retried must be safe to retry

:::info Interview Strategy
When asked about contention, start by clarifying: "What's the expected conflict rate and latency requirement?" This tells the interviewer you understand the trade-off space. High contention → pessimistic. Low contention → optimistic. If they push further, discuss fencing tokens and the Redlock debate — it shows depth.
:::
