# ZooKeeper and Kafka: Complete Guide

A comprehensive guide covering ZooKeeper fundamentals, its APIs, integration with Apache Kafka, and the evolution toward KRaft mode.

---

## Table of Contents

1. [What is ZooKeeper?](#1-what-is-zookeeper)
2. [ZooKeeper APIs](#2-zookeeper-apis)
3. [ZooKeeper Data Model (Znodes)](#3-zookeeper-data-model-znodes)
4. [Why ZooKeeper Over Redis?](#4-why-zookeeper-over-redis)
5. [ZAB Consensus Protocol](#5-zab-consensus-protocol)
6. [ZooKeeper and Kafka Integration](#6-zookeeper-and-kafka-integration)
7. [The Kafka Controller](#7-the-kafka-controller)
8. [Controller Failover](#8-controller-failover)
9. [Kafka Without ZooKeeper (KRaft)](#9-kafka-without-zookeeper-kraft)
10. [How ZooKeeper Watches Work](#10-how-zookeeper-watches-work)
11. [Broker Watch Behavior](#11-broker-watch-behavior)
12. [ZooKeeper as Passive Coordination](#12-zookeeper-as-passive-coordination)

---

## 1. What is ZooKeeper?

Apache ZooKeeper is a centralized service for maintaining configuration information, naming, providing distributed synchronization, and providing group services for distributed applications.

### Key Features

| Feature | Description |
|---------|-------------|
| **Distributed Coordination** | Helps multiple nodes in a distributed system coordinate with each other |
| **Configuration Management** | Stores and manages configuration data that can be shared across a cluster |
| **Naming Service** | Acts as a registry where distributed services can register and discover each other |
| **Distributed Locking** | Provides primitives for implementing distributed locks and barriers |
| **Leader Election** | Enables automatic leader election among a group of nodes |

### How It Works

ZooKeeper maintains a hierarchical namespace (similar to a file system) called **znodes**. Applications can read from and write to these znodes to coordinate their activities.

#### Guarantees

- **Sequential Consistency** - Updates are applied in order
- **Atomicity** - Updates either succeed or fail completely
- **Reliability** - Once applied, updates persist until overwritten
- **Timeliness** - Clients see a consistent view within a bounded time

### Common Use Cases

| System | How It Uses ZooKeeper |
|--------|----------------------|
| **Apache Kafka** | Broker coordination and topic management |
| **Apache HBase** | Master election and region server tracking |
| **Apache Hadoop** | High availability in HDFS NameNode |
| **Service Discovery** | Microservices register themselves for other services to find |

### Simple Analogy

Think of ZooKeeper as a "traffic controller" for distributed systems - it ensures all the different parts of your application agree on who's in charge, what the current configuration is, and how to coordinate their actions without stepping on each other's toes.

---

## 2. ZooKeeper APIs

ZooKeeper provides a simple yet powerful set of APIs for distributed coordination.

### Core APIs

#### 2.1 Create

```java
create(path, data, acl, flags)
```

Creates a znode at the specified path with data and access control lists.

**Flags:**
- `PERSISTENT` - Node persists until explicitly deleted
- `EPHEMERAL` - Node deleted when client session ends
- `SEQUENTIAL` - ZooKeeper appends incrementing number to path
- `PERSISTENT_SEQUENTIAL` - Persistent + Sequential
- `EPHEMERAL_SEQUENTIAL` - Ephemeral + Sequential

#### 2.2 Delete

```java
delete(path, version)
```

Deletes a znode at the specified path. The version must match (optimistic locking).

#### 2.3 Exists

```java
exists(path, watch)
```

Checks if a znode exists at the path. Optionally sets a watch for changes.

#### 2.4 Get Data

```java
getData(path, watch, stat)
```

Retrieves the data and metadata (stat) of a znode. Can set a watch.

#### 2.5 Set Data

```java
setData(path, data, version)
```

Updates the data of a znode. Version must match for the update to succeed.

#### 2.6 Get Children

```java
getChildren(path, watch)
```

Returns a list of child znodes under the specified path. Can set a watch.

#### 2.7 Sync

```java
sync(path)
```

Flushes channel between client and server, ensuring all pending writes are visible.

#### 2.8 Get/Set ACL

```java
getACL(path, stat)
setACL(path, acl, version)
```

Manages access control lists for znodes.

### Watch Mechanism

ZooKeeper's **watches** are one-time triggers that notify clients of changes:

| Watch Type | Triggered By |
|------------|--------------|
| **Data Watch** | `setData()`, `delete()` on the znode |
| **Child Watch** | `create()`, `delete()` of children |
| **Exists Watch** | `create()`, `delete()` of the znode |

### Multi-Operation API (Transactions)

```java
multi(ops)
```

Executes multiple operations atomically - either all succeed or all fail.

```java
// Example: atomic update
List<Op> ops = Arrays.asList(
    Op.delete("/app/config/old", -1),
    Op.create("/app/config/new", data, acl, CreateMode.PERSISTENT),
    Op.setData("/app/version", newVersion, -1)
);
zookeeper.multi(ops);
```

### Client Libraries

| Language | Library |
|----------|---------|
| **Java** | Native ZooKeeper client, Curator (recommended) |
| **Python** | `kazoo` |
| **Go** | `go-zookeeper` |
| **Node.js** | `node-zookeeper-client` |
| **C** | Native C binding |

### Example: Using Curator (Java)

```java
CuratorFramework client = CuratorFrameworkFactory.newClient(
    "localhost:2181", 
    new ExponentialBackoffRetry(1000, 3)
);
client.start();

// Create a node
client.create()
    .creatingParentsIfNeeded()
    .withMode(CreateMode.EPHEMERAL)
    .forPath("/services/my-service", "192.168.1.10:8080".getBytes());

// Read data
byte[] data = client.getData().forPath("/services/my-service");

// Watch for changes
client.getData()
    .usingWatcher((WatchedEvent event) -> {
        System.out.println("Node changed: " + event.getType());
    })
    .forPath("/services/my-service");
```

### Example: Using Kazoo (Python)

```python
from kazoo.client import KazooClient

zk = KazooClient(hosts='localhost:2181')
zk.start()

# Create a node
zk.create("/services/my-service", b"192.168.1.10:8080", ephemeral=True)

# Read data
data, stat = zk.get("/services/my-service")

# Watch for changes
@zk.DataWatch("/services/my-service")
def watch_node(data, stat):
    print(f"Data changed: {data}")

zk.stop()
```

---

## 3. ZooKeeper Data Model (Znodes)

ZooKeeper's data model is a **hierarchical tree of nodes** (called **znodes**), similar to a file system. Each znode can store a small amount of data.

### Znode Structure Example

```
/                          (root)
├── /app
│   ├── /app/config        → {"db": "localhost:5432"}
│   └── /app/workers
│       ├── /app/workers/worker-001  → "192.168.1.10:8080"
│       └── /app/workers/worker-002  → "192.168.1.11:8080"
├── /locks
│   └── /locks/my-lock-0000000001
└── /leader
    └── /leader/election-0000000005
```

### Key Characteristics of Znodes

| Property | Description |
|----------|-------------|
| **Small data** | Designed for metadata, not bulk storage (max ~1MB per node, best kept under 1KB) |
| **Versioned** | Every update increments the version number |
| **Timestamped** | Tracks creation and modification times |
| **ACL protected** | Access control per node |

### Types of Znodes

| Type | Behavior |
|------|----------|
| **Persistent** | Stays until explicitly deleted |
| **Ephemeral** | Auto-deleted when the client session ends (great for detecting node failures!) |
| **Sequential** | ZooKeeper appends a unique incrementing number (e.g., `/lock-0000000001`) |

### What Makes ZooKeeper Powerful

The power isn't just storing data—it's the **guarantees** around it:

1. **Watches** - Get notified when a node changes
2. **Ephemeral nodes** - Disappear when a service dies (instant failure detection)
3. **Sequential nodes** - Enable ordering (for locks, queues, leader election)
4. **Atomic operations** - All-or-nothing updates

### Service Discovery Example

```
/services
├── /services/user-service
│   ├── /services/user-service/instance-001  → "10.0.0.1:8080"
│   └── /services/user-service/instance-002  → "10.0.0.2:8080"
└── /services/order-service
    └── /services/order-service/instance-001  → "10.0.0.5:9000"
```

Each service instance creates an **ephemeral** node. If a service crashes, its node disappears automatically, and other services watching get notified instantly.

---

## 4. Why ZooKeeper Over Redis?

While both store data, they're designed for **completely different purposes**.

### Core Difference

| Aspect | ZooKeeper | Redis |
|--------|-----------|-------|
| **Primary Purpose** | Distributed coordination | Fast data caching/storage |
| **Optimized For** | Consistency & reliability | Speed & throughput |
| **Data Size** | Small (KB) | Large (GB) |

### Reasons to Choose ZooKeeper

#### 4.1 Strong Consistency Guarantees

```
ZooKeeper: "If I wrote it, everyone sees it in the same order"
Redis:     "Eventually everyone will see it... probably"
```

ZooKeeper uses a consensus protocol (ZAB) ensuring **all nodes agree** on the order of operations. Redis (even with clustering) prioritizes speed over strict consistency.

#### 4.2 Ephemeral Nodes = Automatic Failure Detection

```
# ZooKeeper: Service dies → node automatically disappears → watchers notified
/services/api-server-1  →  [GONE - session expired]

# Redis: Service dies → data stays forever unless you manually clean it up
SET service:api-server-1 "10.0.0.1"  →  [Still there, stale data!]
```

You'd need to build TTL-based heartbeating yourself in Redis.

#### 4.3 Watches Are Built-In and Reliable

```python
# ZooKeeper: Native, guaranteed delivery
@zk.DataWatch("/config")
def on_change(data, stat):
    reload_config(data)

# Redis: Pub/Sub exists but...
# - Messages lost if client disconnects
# - No persistence of notifications
# - Miss events = miss them forever
```

#### 4.4 Sequential Nodes for Ordering

ZooKeeper gives you **globally ordered sequential nodes** out of the box:

```
create("/locks/lock-", SEQUENTIAL)  →  /locks/lock-0000000001
create("/locks/lock-", SEQUENTIAL)  →  /locks/lock-0000000002
```

This enables fair locking, queues, and leader election. Redis requires Lua scripts and careful implementation.

#### 4.5 Designed for Coordination Primitives

| Use Case | ZooKeeper | Redis |
|----------|-----------|-------|
| Leader Election | Built-in pattern | DIY with Redlock (controversial) |
| Distributed Locks | Reliable with recipes | Redlock has known issues |
| Service Discovery | Perfect fit | Works but more manual |
| Config Management | Native watches | Pub/Sub (lossy) |

### When to Use Redis Instead

Redis wins for:
- **Caching** - Fast reads/writes, large data
- **Session storage** - High throughput
- **Rate limiting** - Atomic counters
- **Message queues** - Redis Streams, Pub/Sub
- **Leaderboards** - Sorted sets

### The Trade-off Visualization

```
                    Speed
                      ↑
                      │
                Redis │ ████████████
                      │ 
                      │     ZooKeeper
                      │     ████
                      └──────────────→ Consistency/Reliability
```

### Summary Table

| Need | Use |
|------|-----|
| "Is my service alive?" | ZooKeeper |
| "Cache this API response" | Redis |
| "Who's the leader?" | ZooKeeper |
| "Store user session" | Redis |
| "Notify all nodes of config change (reliably)" | ZooKeeper |
| "Fast counter/leaderboard" | Redis |

**ZooKeeper is for coordination. Redis is for data.** They often run side-by-side in the same infrastructure!

---

## 5. ZAB Consensus Protocol

ZAB (ZooKeeper Atomic Broadcast) ensures all nodes see the same data in the same order.

### The Problem: Distributed Chaos

Imagine you have 3 ZooKeeper servers and 2 clients sending updates at the same time:

```
Client A: "Set /config = 'v1'"     Client B: "Set /config = 'v2'"
         ↓                                   ↓
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Server1 │  │ Server2 │  │ Server3 │
    └─────────┘  └─────────┘  └─────────┘
```

**Without consensus:** Server1 might see `v1` then `v2`, while Server2 sees `v2` then `v1`. Now they disagree!

### The Solution: ZAB

ZAB ensures **one leader** decides the order, and **all followers** apply changes in that exact order.

#### Step 1: Leader Election

```
┌─────────────────────────────────────────────────┐
│   ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│   │ Server1 │  │ Server2 │  │ Server3 │        │
│   │ (LEADER)│  │(Follower)│ │(Follower)│        │
│   └─────────┘  └─────────┘  └─────────┘        │
│        ▲                                        │
│        │                                        │
│   All writes go through me!                     │
└─────────────────────────────────────────────────┘
```

Only **ONE** server is the leader at any time. All write requests go to the leader.

#### Step 2: Propose → Acknowledge → Commit

When a client writes data:

**PHASE 1: PROPOSE**
```
Leader sends proposal to all followers:
"Accept transaction #42?"
```

**PHASE 2: ACKNOWLEDGE**
```
Followers respond with ACK.
Leader waits for MAJORITY (quorum) to ACK.
```

**PHASE 3: COMMIT**
```
Leader sends COMMIT to all followers.
All servers apply the change.
```

### Transaction IDs (zxid)

Every transaction gets a **globally unique, ordered ID**:

```
zxid = (epoch, counter)
        │       │
        │       └── Incrementing number within this leader's term
        └────────── Which leader "era" we're in (increases on new leader)
```

Example sequence:

```
zxid: (1, 1)  →  SET /a = "1"
zxid: (1, 2)  →  SET /b = "2"
zxid: (1, 3)  →  DELETE /a
      ↑
      Leader 1's epoch

[Leader crashes, new leader elected]

zxid: (2, 1)  →  SET /c = "3"
      ↑
      Leader 2's epoch (always higher)
```

**Every server applies transactions in zxid order. No exceptions.**

### Why Quorum Matters

With 5 servers, you need **3** (majority) to agree:

```
✓ Server1    ✓ Server2    ✓ Server3
✗ Server4 (down)    ✗ Server5 (network issue)

3/5 = Quorum reached! Transaction commits.
```

This guarantees:
- **Any future quorum overlaps with previous quorums**
- No "split brain" where two groups think they're authoritative

### Concrete Example: Two Concurrent Writes

```
Time    Client A                    Leader                    Client B
─────────────────────────────────────────────────────────────────────────
  1     SET /x = "A" ─────────►    Receives, assigns zxid=5
  2                                                    ◄───── SET /x = "B"
  3                                Receives, assigns zxid=6
  4                                Propose zxid=5 to followers
  5                                Propose zxid=6 to followers
  6                                Commit zxid=5 (quorum reached)
  7                                Commit zxid=6 (quorum reached)
─────────────────────────────────────────────────────────────────────────

Result on ALL servers:
  /x was "A" (zxid=5), then became "B" (zxid=6)
  
  SAME ORDER EVERYWHERE. Guaranteed.
```

### Compare to Redis

| Aspect | ZooKeeper (ZAB) | Redis Cluster |
|--------|-----------------|---------------|
| Writes go through | Single leader | Any master for its slots |
| Replication | Synchronous (wait for quorum) | Asynchronous (fire and forget) |
| On failure | No data loss | May lose recent writes |
| Ordering | Global total order | Per-key ordering only |

### ZAB Summary

1. **ONE leader** handles all writes
2. Leader assigns **sequential transaction IDs**
3. Followers must **ACK before commit** (quorum)
4. Everyone applies transactions in the **SAME order**

This is why ZooKeeper is trusted for critical coordination—**it's slow but never wrong**.

---

## 6. ZooKeeper and Kafka Integration

Kafka has historically relied heavily on ZooKeeper, though this is changing with KRaft mode.

### Traditional Kafka + ZooKeeper Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KAFKA CLUSTER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Broker 1 │  │ Broker 2 │  │ Broker 3 │                      │
│  │(Controller)│          │  │          │                       │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                      │
│        │             │             │                            │
│        └─────────────┼─────────────┘                            │
│                      │                                          │
│                      ▼                                          │
│           ┌─────────────────────┐                               │
│           │     ZOOKEEPER       │                               │
│           │  ┌───┐ ┌───┐ ┌───┐  │                               │
│           │  │ZK1│ │ZK2│ │ZK3│  │                               │
│           │  └───┘ └───┘ └───┘  │                               │
│           └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### What ZooKeeper Stores for Kafka

```
/kafka
├── /brokers
│   ├── /ids
│   │   ├── /0  → {"host":"broker1","port":9092}  (ephemeral)
│   │   ├── /1  → {"host":"broker2","port":9092}  (ephemeral)
│   │   └── /2  → {"host":"broker3","port":9092}  (ephemeral)
│   └── /topics
│       ├── /orders
│       │   └── /partitions
│       │       ├── /0/state → {"leader":1,"isr":[1,2]}
│       │       └── /1/state → {"leader":2,"isr":[2,0]}
│       └── /users
│           └── /partitions
│               └── /0/state → {"leader":0,"isr":[0,1,2]}
├── /controller → {"brokerid":0}  (ephemeral)
├── /consumers  (legacy consumer offsets)
└── /config
    ├── /topics
    └── /brokers
```

### Key Functions ZooKeeper Provides

#### 6.1 Broker Registration & Discovery

```
Broker starts up:
┌──────────┐                            ┌─────────┐
│ Broker 1 │ ── CREATE EPHEMERAL ─────► │ /brokers│
│ starting │    /brokers/ids/1          │ /ids/1  │
└──────────┘                            └─────────┘

Broker crashes:
┌──────────┐                            ┌─────────┐
│ Broker 1 │ ── SESSION EXPIRES ──────► │ /brokers│
│  (dead)  │    Node auto-deleted!      │ /ids/1  │ GONE!
└──────────┘                            └─────────┘
                                              │
                Other brokers watching ◄──────┘
                "Broker 1 is dead!"
```

#### 6.2 Controller Election

One broker is the "Controller" - it manages partition leadership. ZooKeeper handles this election:

```
Broker 0: "I'll try to create /controller"  ✓ SUCCESS → I'm the controller!
Broker 1: "I'll try to create /controller"  ✗ ALREADY EXISTS → I'll watch it
Broker 2: "I'll try to create /controller"  ✗ ALREADY EXISTS → I'll watch it

[Controller (Broker 0) crashes]

ZooKeeper: /controller deleted (session expired)
Broker 1 & 2: WATCH triggered! Race to create /controller again...
```

#### 6.3 Topic & Partition Metadata

```
/topics/orders/partitions/0/state
{
  "leader": 1,           ← Broker 1 is leader for this partition
  "isr": [1, 2, 0]       ← In-Sync Replicas (have all data)
}
```

#### 6.4 Partition Leader Election

When a partition leader dies:

```
Before:
  Partition: orders-0
  Leader: Broker 1
  ISR: [1, 2, 0]

Broker 1 crashes! Controller detects via ZooKeeper watch.

Controller updates ZooKeeper:
  Partition: orders-0
  Leader: Broker 2  ← NEW LEADER
  ISR: [2, 0]       ← Removed dead broker
```

### The Flow: Producer Sends a Message

```
┌──────────┐                                              
│ Producer │                                              
└────┬─────┘                                              
     │ 1. "Who's the leader for topic=orders, partition=0?"
     ▼                                                    
┌──────────┐      2. Metadata request (from cache)       
│ Any      │ ────────────────────────► Broker's local cache
│ Broker   │ ◄──────────────────────── "Broker 2 is leader"
└────┬─────┘                                              
     │ 3. Send message to Broker 2
     ▼                                                    
┌──────────┐                                              
│ Broker 2 │ ── Writes message ──► Partition log          
│ (Leader) │                                              
└──────────┘
```

**Note:** Brokers cache metadata locally. They don't query ZooKeeper on every request!

---

## 7. The Kafka Controller

The **Controller** is one Kafka broker elected to handle all the cluster-wide administrative operations. Think of it as the "cluster manager" broker.

### What Is the Controller?

```
┌─────────────────────────────────────────────────────────────────┐
│                      KAFKA CLUSTER                              │
│                                                                 │
│  ┌──────────────────┐  ┌────────────┐  ┌────────────┐          │
│  │     Broker 0     │  │  Broker 1  │  │  Broker 2  │          │
│  │                  │  │            │  │            │          │
│  │  ┌────────────┐  │  │            │  │            │          │
│  │  │ CONTROLLER │  │  │  Regular   │  │  Regular   │          │
│  │  │    Role    │  │  │  Broker    │  │  Broker    │          │
│  │  └────────────┘  │  │            │  │            │          │
│  │                  │  │            │  │            │          │
│  │  + Regular       │  │            │  │            │          │
│  │    Broker duties │  │            │  │            │          │
│  └──────────────────┘  └────────────┘  └────────────┘          │
│                                                                 │
│  Note: Controller is still a regular broker too!                │
│        It handles reads/writes for its partitions.              │
└─────────────────────────────────────────────────────────────────┘
```

### All Controller Responsibilities

#### 7.1 Partition Leader Election

```
Broker dies → Controller elects new leaders for affected partitions
```

#### 7.2 Broker Lifecycle Management

**Broker Joins:**
```
New Broker                    Controller
┌────────┐                   ┌──────────┐
│Broker 3│ ── Registers ───► │          │
│starting│    in ZooKeeper   │ Detects  │
└────────┘                   │ via watch│
                             └────┬─────┘
                                  │
                                  ▼
                  Sends metadata to new broker:
                  • All topic configurations
                  • Partition assignments
                  • Which partitions to replicate
```

**Broker Leaves:**
```
Controller detects broker gone
    ├──► Elect new leaders for orphaned partitions
    ├──► Update ISR lists (remove dead broker)
    ├──► Notify all other brokers of changes
    └──► Trigger replica reassignment if needed
```

#### 7.3 Topic Creation & Deletion

```
Admin: "Create topic 'orders' with 6 partitions, replication=3"
                              │
                              ▼
                    ┌──────────────────┐
                    │    Controller    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   Assign partitions    Write metadata      Notify brokers
   to brokers           to ZooKeeper        to start replicas
   
   Partition 0 → [B0, B1, B2]
   Partition 1 → [B1, B2, B0]
   Partition 2 → [B2, B0, B1]
```

#### 7.4 Partition Reassignment

When you want to move partitions between brokers:

```
Before:                          After reassignment:
orders-0: [B0,B1,B2]    ───►     orders-0: [B1,B2,B3]
orders-1: [B1,B2,B0]             orders-1: [B2,B3,B1]

Controller orchestrates:
1. Add new replicas (B3 starts copying data)
2. Wait for new replicas to catch up (join ISR)
3. Remove old replicas (B0 stops)
4. Update leadership if needed
```

#### 7.5 ISR (In-Sync Replica) Management

```
Partition: orders-0
Leader: Broker 1
ISR: [1, 2, 0]

Broker 0 falls behind (slow disk, network issues)
    │
    ▼
Leader (B1) reports to Controller:
"Broker 0 hasn't fetched in 10 seconds"
    │
    ▼
Controller updates ISR: [1, 2]  ← Broker 0 removed
Writes to ZooKeeper
Notifies all brokers

Later, Broker 0 catches up...
    │
    ▼
Leader reports: "Broker 0 is caught up!"
Controller adds back to ISR: [1, 2, 0]
```

#### 7.6 Preferred Leader Election

Kafka tries to balance leaders across brokers. The "preferred leader" is the first broker in the replica list.

```
Partition assignments:
  orders-0: [B0, B1, B2]  ← B0 is preferred leader
  orders-1: [B1, B2, B0]  ← B1 is preferred leader
  orders-2: [B2, B0, B1]  ← B2 is preferred leader

After failures/recoveries, leadership might be unbalanced:
  orders-0: Leader=B1  (should be B0)
  orders-1: Leader=B1  (correct)
  orders-2: Leader=B1  (should be B2)
  
  B1 is overloaded!

Controller runs "Preferred Leader Election":
  → Moves leadership back to preferred replicas
  → Balances load across cluster
```

#### 7.7 Configuration Changes

```
Admin: "Set retention.ms=604800000 for topic 'logs'"
                              │
                              ▼
                    ┌──────────────────┐
                    │    Controller    │
                    │ • Validates      │
                    │ • Writes to ZK   │
                    │ • Notifies       │
                    │   affected       │
                    │   brokers        │
                    └──────────────────┘
```

#### 7.8 ACL (Access Control) Management

Controller manages:
- Who can produce to which topics
- Who can consume from which topics
- Who can create/delete topics
- Admin permissions

### Controller Election

How does one broker become the Controller?

```
All brokers race to create /controller (ephemeral node)

Broker 0: create("/controller", myId)  →  SUCCESS! I'm it!
Broker 1: create("/controller", myId)  →  ALREADY EXISTS
Broker 2: create("/controller", myId)  →  ALREADY EXISTS

Losers set a WATCH on /controller

[Controller crashes]

ZooKeeper: Session expired → /controller deleted
WATCH fires on all other brokers
Race again!

Broker 1: create("/controller", myId)  →  SUCCESS!
Broker 2: create("/controller", myId)  →  ALREADY EXISTS
```

### Summary: Controller Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Leader Election** | Pick new leaders when brokers fail |
| **Broker Management** | Track which brokers are alive |
| **Topic Operations** | Create, delete, modify topics |
| **Partition Reassignment** | Move partitions between brokers |
| **ISR Updates** | Track which replicas are in sync |
| **Preferred Leader** | Rebalance leadership across cluster |
| **Config Distribution** | Push config changes to brokers |
| **ACL Management** | Distribute access control rules |
| **Metadata Broadcast** | Keep all brokers informed of cluster state |

### Is the Controller a Single Point of Failure?

**Not really!**
- If Controller dies, new one elected in seconds
- Data isn't lost (it's in ZooKeeper)
- Producers/consumers keep working during election
- Only admin operations pause briefly

**But it CAN be a bottleneck:**
- Large clusters (1000s of partitions) = lots of work
- One reason Kafka moved to KRaft (distributed controllers)

---

## 8. Controller Failover

When the Controller broker dies, a new one is elected automatically.

### Step-by-Step Process

#### Step 1: Controller Dies

```
ZooKeeper detects:
• No heartbeat from Broker 0
• Session timeout (default: 18 seconds)
• Session expires → ephemeral nodes deleted

Deleted nodes:
• /controller           ← Controller registration
• /brokers/ids/0        ← Broker registration
```

#### Step 2: Watches Fire

```
ZooKeeper notifies all watching brokers:
"The /controller node was DELETED!"

Broker 1: "Controller is gone!"
Broker 2: "Controller is gone!"
```

#### Step 3: Race to Become Controller

```
Broker 1: create("/controller", "broker1")
Broker 2: create("/controller", "broker2")

Only ONE succeeds (ZooKeeper guarantees atomicity)

Broker 1: "NodeExistsException" ← Lost
Broker 2: "Success!" ← WON → New Controller!
```

#### Step 4: New Controller Initializes

```
Broker 2 (New Controller) initialization:

1. Read all broker registrations
   getChildren("/brokers/ids") → [1, 2]

2. Read all topic metadata
   getChildren("/brokers/topics") → [orders, users, logs]

3. Read all partition states
   getData("/brokers/topics/orders/partitions/0/state")
   getData("/brokers/topics/orders/partitions/1/state")
   ...

4. Check for partitions that lost their leader (Broker 0)
   orders-0: leader=0 → NEED NEW LEADER!
   orders-1: leader=1 → OK
   users-0:  leader=0 → NEED NEW LEADER!

5. Elect new leaders for affected partitions
   orders-0: ISR=[0,1,2] → Pick Broker 1 (first alive in ISR)
   users-0:  ISR=[0,2]   → Pick Broker 2

6. Write new state to ZooKeeper

7. Send LeaderAndIsrRequest to all brokers
```

### Timeline: How Fast Is This?

```
Time (seconds)
─────────────────────────────────────────────────────────────────
0.0    Controller (Broker 0) crashes
0.0    Producers/Consumers still work for partitions
         where Broker 0 wasn't the leader
6-18   ZooKeeper session timeout (configurable)
         Default: session.timeout.ms = 18000
18.0   ZooKeeper expires session
         Deletes /controller and /brokers/ids/0
18.1   Watches fire → Surviving brokers notified
18.1   Election race (milliseconds)
18.2   New Controller elected
18.2-  New Controller reads cluster state from ZooKeeper
18.5     (depends on cluster size: 100ms to few seconds)
18.5   New leaders elected for affected partitions
18.6   LeaderAndIsrRequest sent to brokers
18.7   Cluster fully operational again
─────────────────────────────────────────────────────────────────
       
Total downtime for admin operations: ~18 seconds
Downtime for affected partitions: Same ~18 seconds
Unaffected partitions: Zero downtime
```

### Impact on In-Flight Operations

| Operation | Impact |
|-----------|--------|
| **Produce to partition led by dead broker** | Fails until new leader elected, producer retries |
| **Produce to partition led by other brokers** | No impact |
| **Consume from partition led by dead broker** | Fails until new leader elected, consumer retries |
| **Consume from partition led by other brokers** | No impact |
| **Topic creation/deletion** | Blocked until new controller |
| **Partition reassignment** | Blocked until new controller |
| **Config changes** | Blocked until new controller |

### How to Speed Up Failover

```properties
# Reduce ZooKeeper session timeout (trade-off: more false positives)
zookeeper.session.timeout.ms=6000

# Reduce controller socket timeout  
controller.socket.timeout.ms=30000

# Broker configs for faster failure detection
replica.lag.time.max.ms=10000
```

### Preventing Split Brain with Controller Epoch

```
Every controller election increments the epoch:

/controller_epoch = 5  (stored in ZooKeeper)

Old Controller (zombie):
"I'm controller, epoch=4"
    │
    ▼
┌────────────┐
│  Broker 1  │  "Your epoch 4 < current epoch 5"
│            │  "Rejected! You're stale."
└────────────┘

New Controller:
"I'm controller, epoch=5"
    │
    ▼
┌────────────┐
│  Broker 1  │  "Epoch 5 matches, accepted!"
└────────────┘
```

---

## 9. Kafka Without ZooKeeper (KRaft)

### ZooKeeper Requirement by Version

| Kafka Version | ZooKeeper Required? |
|---------------|---------------------|
| Kafka < 2.8 | **Yes, mandatory** |
| Kafka 2.8 - 3.2 | Optional (KRaft experimental) |
| Kafka 3.3+ | **No, KRaft is production-ready** |
| Kafka 4.0+ (future) | ZooKeeper support removed |

### What Happens When ZooKeeper Goes Down (Traditional Mode)

#### What Still Works ✅

- Produce messages (if leader is known and alive)
- Consume messages (if leader is known and alive)
- Broker-to-broker replication (existing connections)
- Read existing topic metadata (from cache)

Brokers continue serving requests using their LOCAL CACHE.

#### What Breaks ❌

- Controller election (no new controller if current dies)
- Leader election (can't elect new partition leaders)
- New broker registration (brokers can't join cluster)
- Topic creation/deletion
- Partition reassignment
- ISR updates (stuck with stale ISR lists)
- Config changes

#### The Dangerous Scenario

```
T=0     ZooKeeper goes down
        Kafka still works (cached metadata)
        
T=5min  Everything seems fine...
        
T=10min Broker 1 (leader for orders-0) crashes!
        
        PROBLEM:
        • Controller can't detect Broker 1 is dead
        • Can't elect new leader for orders-0
        • Partition orders-0 is UNAVAILABLE
        
T=???   ZooKeeper comes back
        Controller detects Broker 1 is gone
        Elects new leader from ISR
        Service restored
```

### KRaft Mode: Kafka Without ZooKeeper

```
┌─────────────────────────────────────────────────────────────────┐
│                    KRAFT MODE (Kafka 3.3+)                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  CONTROLLER QUORUM                         │ │
│  │                                                            │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │ │
│  │  │Controller 0│  │Controller 1│  │Controller 2│           │ │
│  │  │  (Leader)  │  │ (Follower) │  │ (Follower) │           │ │
│  │  └────────────┘  └────────────┘  └────────────┘           │ │
│  │         │                                                  │ │
│  │         └──── Raft Consensus (internal) ────┘              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           │ Metadata updates                    │
│                           ▼                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Broker 0  │  │  Broker 1  │  │  Broker 2  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                 │
│  NO ZOOKEEPER NEEDED!                                           │
└─────────────────────────────────────────────────────────────────┘
```

### How KRaft Stores Metadata

Instead of ZooKeeper, metadata lives in a special Kafka topic:

```
__cluster_metadata (internal topic)

Offset 0: ClusterRecord { clusterId: "abc123" }
Offset 1: TopicRecord { name: "orders", id: "xyz" }
Offset 2: PartitionRecord { topic: "orders", partition: 0,
                            leader: 1, isr: [1,2,0] }
Offset 3: BrokerRecord { id: 0, host: "broker0", port: 9092 }
Offset 4: BrokerRecord { id: 1, host: "broker1", port: 9092 }
...

Replicated across controller quorum using Raft
```

### KRaft Benefits

| Aspect | ZooKeeper Mode | KRaft Mode |
|--------|----------------|------------|
| **Dependencies** | Kafka + ZooKeeper | Just Kafka |
| **Metadata recovery** | Read from ZK (slow) | Already in memory |
| **Controller failover** | ~18 seconds | ~1-2 seconds |
| **Partition limit** | ~200K practical | Millions possible |
| **Operational complexity** | Two systems | One system |

### How to Run Kafka Without ZooKeeper (KRaft)

#### Step 1: Generate Cluster ID

```bash
KAFKA_CLUSTER_ID=$(bin/kafka-storage.sh random-uuid)
```

#### Step 2: Configure Brokers

```properties
# server.properties (KRaft mode)

# This node is both controller and broker
process.roles=broker,controller

# Node ID (unique per node)
node.id=1

# Controller quorum voters (all controllers)
controller.quorum.voters=1@broker1:9093,2@broker2:9093,3@broker3:9093

# Listeners
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
controller.listener.names=CONTROLLER

# Log directory
log.dirs=/var/kafka-logs

# NO zookeeper.connect property needed!
```

#### Step 3: Format Storage

```bash
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c server.properties
```

#### Step 4: Start Brokers

```bash
bin/kafka-server-start.sh server.properties
```

### KRaft Deployment Modes

#### Combined Mode (Small Clusters)

Each node is both controller AND broker:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Node 1      │ │     Node 2      │ │     Node 3      │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │ Controller│  │ │  │ Controller│  │ │  │ Controller│  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  Broker   │  │ │  │  Broker   │  │ │  │  Broker   │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
└─────────────────┘ └─────────────────┘ └─────────────────┘

process.roles=broker,controller
Good for: Development, small production clusters
```

#### Isolated Mode (Large Clusters)

Separate controller and broker nodes:

```
CONTROLLERS (3 nodes)
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Controller │ │ Controller │ │ Controller │
│     1      │ │     2      │ │     3      │
└────────────┘ └────────────┘ └────────────┘
process.roles=controller

BROKERS (many nodes)
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Broker 1│ │Broker 2│ │Broker 3│ │Broker 4│ │Broker 5│ ...
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
process.roles=broker

Good for: Large production clusters
```

### Comparison: Starting a 3-Broker Cluster

#### With ZooKeeper (Old Way)

```bash
# Terminal 1: Start ZooKeeper first
bin/zookeeper-server-start.sh config/zookeeper.properties

# Terminal 2-4: Start Brokers
bin/kafka-server-start.sh config/server-0.properties
bin/kafka-server-start.sh config/server-1.properties
bin/kafka-server-start.sh config/server-2.properties

# 4 processes total (1 ZK + 3 Kafka)
```

#### With KRaft (New Way)

```bash
# Terminal 1-3: Start Brokers (no ZooKeeper!)
bin/kafka-server-start.sh config/kraft/server-0.properties
bin/kafka-server-start.sh config/kraft/server-1.properties
bin/kafka-server-start.sh config/kraft/server-2.properties

# 3 processes total (just Kafka)
```

---

## 10. How ZooKeeper Watches Work

A common misconception is that brokers need to expose an API to receive watch notifications. **This is not the case.**

### The Key Insight: Client-Initiated Connection

The broker **initiates the connection** to ZooKeeper, and notifications come back **on that same connection**.

```
BROKER (Client)                         ZOOKEEPER (Server)
┌──────────────┐                       ┌──────────────┐
│              │ ── TCP Connection ──► │              │
│              │    (port 2181)        │              │
│              │                       │              │
│   Broker     │ ◄─── Same connection ─│   ZooKeeper  │
│   connects   │      used for watch   │   listens    │
│   TO ZK      │      notifications    │   on 2181    │
│              │                       │              │
└──────────────┘                       └──────────────┘

Broker does NOT expose any port for ZooKeeper!
ZooKeeper does NOT connect TO the broker!
```

### Step-by-Step: How a Watch Works

#### Step 1: Broker Establishes Connection

```
Broker                                ZooKeeper
  │                                      │
  │ ────── TCP Connect ────────────────► │
  │ ◄───── Connection Established ────── │
  │                                      │
  │  (Long-lived persistent connection)  │
```

#### Step 2: Broker Requests Data WITH Watch Flag

```
Broker                                ZooKeeper
  │                                      │
  │ ──── getData("/controller",          │
  │       watch=true) ─────────────────► │
  │                                      │
  │                                 ZK saves watch:
  │                                 Client=Broker
  │                                 Path=/controller
  │                                      │
  │ ◄──── Response: data="broker0" ───── │
```

#### Step 3: Something Changes the Data

```
Another Client                        ZooKeeper
  │                                      │
  │ ──── setData("/controller",          │
  │       "broker1") ──────────────────► │
  │                                      │
  │                                 ZK finds watches
  │                                 on this path
```

#### Step 4: ZooKeeper Pushes Notification to Broker

```
Broker                                ZooKeeper
  │                                      │
  │ ◄──── WatchEvent {                   │
  │         type: NodeDataChanged,       │
  │         path: "/controller"          │
  │       } ─────────────────────────────│
  │                                      │
  │  (Sent on the SAME TCP connection    │
  │   the broker already opened)         │
```

### Network Perspective

```
BROKER (10.0.0.5)                    ZOOKEEPER (10.0.0.10)

┌──────────────────┐                ┌──────────────────┐
│                  │                │                  │
│  No listening    │                │  Listening on    │
│  port for ZK     │                │  port 2181       │
│                  │                │                  │
│  Outbound:       │                │                  │
│  Random port ────┼───────────────►│  :2181           │
│  (e.g., 54321)   │   TCP conn     │                  │
│                  │◄───────────────┼──                │
│                  │   (same conn)  │                  │
│                  │                │                  │
└──────────────────┘                └──────────────────┘

Firewall rules needed:
• Broker → ZK:2181 (outbound) ✓
• ZK → Broker (inbound) ✗ NOT NEEDED
```

### Comparison: Webhook vs ZooKeeper Watch

```
Traditional Callback/Webhook:          ZooKeeper Watch:

┌────────┐      ┌────────┐            ┌────────┐  ┌────────┐
│ Server │      │ Client │            │ Broker │  │   ZK   │
└───┬────┘      └───┬────┘            └───┬────┘  └───┬────┘
    │               │                     │           │
    │  Register     │                     │  Connect  │
    │  callback URL │                     │ ────────► │
    │ ◄──────────── │                     │           │
    │               │                     │  getData  │
    │               │                     │  +watch   │
    │  [Event]      │                     │ ────────► │
    │               │                     │           │
    │  HTTP POST    │                     │  [Event]  │
    │  to callback  │                     │           │
    │ ─────────────►│                     │ Notify on │
    │               │                     │ ◄──────── │
    │               │                     │ same conn │

Client EXPOSES API         Client does NOT expose anything
Server CALLS client        ZK uses EXISTING connection
```

### Why This Design?

| Benefit | Explanation |
|---------|-------------|
| **Simpler firewall** | Clients only need outbound access |
| **No client discovery** | ZK doesn't need to know client IPs |
| **Connection = Session** | Watch lifecycle tied to connection |
| **Automatic cleanup** | Connection dies → watches removed |

---

## 11. Broker Watch Behavior

### All Brokers Watch /controller

**ALL brokers** watch the `/controller` path, not just the Controller itself.

```
┌──────────────────┐
│    ZooKeeper     │
│                  │
│  /controller     │
│  = "broker0"     │
│                  │
│  Watches:        │
│  • Broker 0 ✓    │  (current controller)
│  • Broker 1 ✓    │  (watching)
│  • Broker 2 ✓    │  (watching)
└────────┬─────────┘
         │
   ┌─────┼─────┬─────────────┐
   │     │     │             │
   ▼     ▼     ▼             │
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Broker 0  │ │  Broker 1  │ │  Broker 2  │
│(CONTROLLER)│ │  watching  │ │  watching  │
│  watching  │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘

Everyone watches! Ready to take over if needed.
```

### Why Every Broker Watches

| Broker Role | Why It Watches /controller |
|-------------|---------------------------|
| **Current Controller** | To detect if its own session expires (I'm no longer controller!) |
| **Other Brokers** | To race for controller election when current one dies |

### What Happens When Controller Dies

```
BEFORE:
  /controller = "broker0" (ephemeral)
  Watches registered:
  • Broker 0 (current controller) - watching
  • Broker 1 - watching
  • Broker 2 - watching

Broker 0 crashes!

ZooKeeper:
  • Broker 0 session expires
  • /controller (ephemeral) deleted
  • Fire watches to Broker 1 and Broker 2

Broker 1: "Watch fired! Try to create /controller" → SUCCESS!
Broker 2: "Watch fired! Try to create /controller" → ALREADY EXISTS

AFTER:
  /controller = "broker1" (ephemeral)
  Watches registered (again):
  • Broker 1 (NEW controller) - watching
  • Broker 2 - watching (lost race, set new watch)
```

### All Paths Brokers Watch

**Controller watches:**
```
/controller           → Detect if I lose leadership
/brokers/ids          → Detect broker joins/leaves
/brokers/ids/1        → Detect if Broker 1 dies
/brokers/ids/2        → Detect if Broker 2 dies
/admin/delete_topics  → Detect topic deletion requests
/brokers/topics       → Detect new topics
...many more
```

**Regular brokers watch:**
```
/controller           → Ready to race for controller
                        (fewer watches than controller)

Note: Regular brokers get most metadata updates via
      direct RPC from Controller, not ZooKeeper watches
```

### Why Controller Watches Its Own Node

Scenario: Controller gets network-partitioned from ZooKeeper

```
┌────────────┐         ┌─────────────┐
│ Broker 0   │   XXX   │  ZooKeeper  │
│ (thinks    │ network │             │
│  it's      │  cut    │ Session     │
│  controller)│        │ expires!    │
└────────────┘         └─────────────┘
                              │
                              ▼
                       /controller deleted
                              │
                              ▼
┌────────────┐         ┌─────────────┐
│ Broker 1   │ ◄────── │ Watch fires │
│ Becomes    │         │             │
│ controller │         └─────────────┘
└────────────┘

NOW: Two brokers think they're controller! (Split brain)

SOLUTION: Controller epoch
• New controller gets epoch=6
• Old controller (Broker 0) still has epoch=5
• All brokers reject commands from epoch=5

When Broker 0 reconnects to ZK, it sees:
• /controller exists (but it's not me!)
• Or its session expired notification
• Broker 0 stops acting as controller
```

---

## 12. ZooKeeper as Passive Coordination

### The Key Insight

ZooKeeper is **passive** - it's just a coordination tool. The brokers do all the actual management themselves.

### What ZooKeeper Does vs. Doesn't Do

| ZooKeeper DOES | ZooKeeper DOES NOT |
|----------------|-------------------|
| Store data reliably | Send commands like "Hey Broker 1, become leader!" |
| Notify watchers of changes | Make decisions about the cluster |
| Guarantee ordering | Tell brokers what to do |
| Delete ephemeral nodes when sessions expire | Implement business logic |
| Ensure only one node creates a path first | Know what "Kafka" or "controller" means |

### The Whiteboard Analogy

```
ZOOKEEPER = Shared Whiteboard in an Office

┌──────────────────────────────────────────────────────────┐
│                                                          │
│   TODAY'S MEETING LEADER: ___________                    │
│                                                          │
│   EMPLOYEES PRESENT:                                     │
│   □ Alice                                                │
│   □ Bob                                                  │
│   □ Charlie                                              │
│                                                          │
└──────────────────────────────────────────────────────────┘

The whiteboard doesn't:
• Tell anyone what to do
• Make decisions
• Run the meeting

The whiteboard just:
• Holds information everyone can see
• Shows who wrote their name first
• Erases names when people leave (ephemeral)

EMPLOYEES (Brokers) manage themselves using the whiteboard!
```

### How Brokers Use ZooKeeper to Self-Manage

#### Controller Election Example

```
ZooKeeper just provides:          Broker does the work:

• A path /controller              • Decides "I want to be controller"
• First-one-wins semantics        • Tries to create the node
• Ephemeral node cleanup          • If success → acts as controller
                                  • If fail → watches and waits

ZooKeeper has NO IDEA what a "controller" is!
It's just a path with data to ZooKeeper.
```

#### Broker Failure Detection Example

```
ZOOKEEPER'S VIEW:              KAFKA CONTROLLER'S VIEW:

"Session for client            "Broker 2 is dead!
 xyz123 expired.                
 Deleting ephemeral             I need to:
 node at                        • Find partitions it led
 /brokers/ids/2"                • Pick new leaders from ISR
                                • Update metadata
(That's all I do!)              • Notify other brokers"

                                (All the smart stuff)
```

### What ZooKeeper Provides (Primitives)

| Primitive | What ZK Does | How Kafka Uses It |
|-----------|--------------|-------------------|
| **Ephemeral nodes** | Delete when session dies | Broker registration, failure detection |
| **Sequential nodes** | Append incrementing number | Leader election ordering |
| **Watches** | Notify on change | React to broker failures, config changes |
| **Strong consistency** | All clients see same order | Agree on who is controller/leader |
| **Atomic create** | Only one succeeds | Controller election race |

### The Division of Responsibility

```
┌─────────────────────────────────────────────────────────┐
│                    ZOOKEEPER                             │
│                                                          │
│  • Consistent distributed storage                        │
│  • Session management                                    │
│  • Watch notifications                                   │
│  • Ordering guarantees                                   │
│                                                          │
│  "I'm a coordination PRIMITIVE, not a manager"           │
└─────────────────────────────────────────────────────────┘
                         │
                         │ provides primitives to
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   KAFKA BROKERS                          │
│                                                          │
│  • Implement controller logic                            │
│  • Implement leader election algorithm                   │
│  • Implement failure handling                            │
│  • Implement replication protocol                        │
│  • Make all decisions                                    │
│                                                          │
│  "We USE ZooKeeper to coordinate with each other"        │
└─────────────────────────────────────────────────────────┘
```

### Summary

```
ZooKeeper = Shared reliable notepad + notification system

Brokers = Self-managing, use the notepad to coordinate

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ZooKeeper: "I don't know what Kafka is. I just store   │
│             data and tell you when it changes."         │
│                                                         │
│  Kafka:     "Perfect. We'll use that to manage          │
│             ourselves."                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

This is why ZooKeeper is used by MANY systems (HBase, Hadoop, Solr, etc.) - it provides generic coordination primitives, not application-specific management.

---

## Quick Reference

### ZooKeeper Essentials

| Concept | Description |
|---------|-------------|
| **Znode** | A node in ZooKeeper's hierarchical namespace |
| **Ephemeral** | Node that disappears when session ends |
| **Sequential** | Node with auto-incrementing suffix |
| **Watch** | One-time notification when node changes |
| **Session** | Client connection with timeout |
| **Quorum** | Majority of servers needed for consensus |
| **ZAB** | ZooKeeper Atomic Broadcast protocol |

### Kafka + ZooKeeper Essentials

| Concept | Description |
|---------|-------------|
| **Controller** | One broker managing cluster-wide operations |
| **ISR** | In-Sync Replicas that have all data |
| **Leader** | Broker handling reads/writes for a partition |
| **Epoch** | Version number to prevent split-brain |
| **KRaft** | Kafka Raft - ZooKeeper-free mode |

### Key ZooKeeper Paths for Kafka

| Path | Purpose |
|------|---------|
| `/controller` | Current controller broker (ephemeral) |
| `/brokers/ids/[id]` | Registered brokers (ephemeral) |
| `/brokers/topics/[topic]/partitions/[id]/state` | Partition leader and ISR |
| `/admin/delete_topics` | Topics pending deletion |
| `/config/topics/[topic]` | Topic configuration |

---

*Document created: February 2026*
