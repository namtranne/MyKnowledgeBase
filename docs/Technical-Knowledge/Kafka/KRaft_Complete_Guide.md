# KRaft (Kafka Raft) Complete Guide

A comprehensive guide covering how Kafka operates without ZooKeeper using KRaft mode — including architecture, metadata management, Raft consensus, controller patching, fencing, and comparison with ZooKeeper mode.

---

## Table of Contents

1. [Why Kafka Left ZooKeeper](#1-why-kafka-left-zookeeper)
2. [KRaft Architecture Overview](#2-kraft-architecture-overview)
3. [Controller Roles: Pre-Configured, Not Elected](#3-controller-roles-pre-configured-not-elected)
4. [The Metadata Log: `__cluster_metadata`](#4-the-metadata-log-__cluster_metadata)
5. [How Brokers Fetch Metadata](#5-how-brokers-fetch-metadata)
6. [Raft Consensus Protocol](#6-raft-consensus-protocol)
7. [Broker Failure Handling in KRaft](#7-broker-failure-handling-in-kraft)
8. [Controller Failure Handling in KRaft](#8-controller-failure-handling-in-kraft)
9. [Controller Patching (Rolling Upgrade)](#9-controller-patching-rolling-upgrade)
10. [Fencing and Consistency](#10-fencing-and-consistency)
11. [KRaft vs ZooKeeper: Full Comparison](#11-kraft-vs-zookeeper-full-comparison)
12. [Deployment Modes](#12-deployment-modes)
13. [Quick Reference](#13-quick-reference)

---

## 1. Why Kafka Left ZooKeeper

### 1.1 Operational Complexity: Two Systems to Manage

```
WITH ZOOKEEPER:                    WITH KRAFT:

┌─────────────────────┐           ┌─────────────────────┐
│ KAFKA CLUSTER       │           │ KAFKA CLUSTER       │
│ • 3-5 brokers       │           │ • 3-5 brokers       │
│ • Monitor           │           │ • Monitor           │
│ • Configure         │           │ • Configure         │
│ • Upgrade           │           │ • Upgrade           │
│ • Troubleshoot      │           │                     │
└─────────────────────┘           │ THAT'S IT!          │
                                  └─────────────────────┘
┌─────────────────────┐
│ ZOOKEEPER CLUSTER   │           No separate ZK cluster
│ • 3-5 nodes         │           to manage!
│ • Monitor           │
│ • Configure         │
│ • Upgrade           │
│ • Troubleshoot      │
│ • Different configs │
│ • Different tools   │
└─────────────────────┘

2x the infrastructure, 2x the problems
```

**Pain points:**
- Two different configuration systems
- Two different monitoring setups
- Two different upgrade procedures
- Two different failure modes to understand
- Teams need expertise in BOTH systems

### 1.2 Slow Controller Failover

```
ZOOKEEPER MODE FAILOVER:

T=0      Controller dies
T=0-6s   ... waiting for ZK session timeout ...
T=6-18s  ... still waiting (default 18 seconds) ...
T=18s    ZK finally expires session
T=18.1s  Watch fires, brokers race for controller
T=18.2s  New controller elected
T=18.3s  Controller reads ALL metadata from ZK
T=20s+   Controller finishes loading (depends on cluster size)

TOTAL: 18-30+ seconds of no cluster management

────────────────────────────────────────────────

KRAFT MODE FAILOVER:

T=0      Controller leader dies
T=0.5s   Raft election timeout triggers
T=1s     New leader elected
T=1.1s   New leader ready (metadata already in memory!)

TOTAL: ~1-2 seconds

10-20x FASTER failover with KRaft!
```

### 1.3 Scalability Limits

```
ZOOKEEPER'S BOTTLENECK:

Controller startup with 100,000 partitions:

┌──────────────┐                    ┌─────────────┐
│  Controller  │                    │  ZooKeeper  │
│              │  100,000 reads     │             │
│  "Loading    │ ─────────────────► │  Slow!      │
│   metadata"  │                    │             │
│              │  One. By. One.     │  Each read  │
│  ⏳ 5-10     │ ◄───────────────── │  = network  │
│   minutes    │                    │  round trip │
└──────────────┘                    └─────────────┘

Problems:
• ZK not designed for 100K+ znodes
• Each partition = multiple ZK reads
• Controller restart = massive ZK load
• Practical limit: ~200,000 partitions

────────────────────────────────────────────────

KRAFT'S SOLUTION:

┌──────────────┐
│  Controller  │
│              │
│  Metadata    │  Already in memory!
│  log is      │  Just replay local log on startup.
│  LOCAL       │
│              │
│  ⚡ Seconds  │
└──────────────┘

Scalability: MILLIONS of partitions possible
```

### 1.4 Metadata Inconsistency Window

```
ZOOKEEPER MODE: Split metadata storage

  ZooKeeper stores:          Kafka stores:
  • Broker registration      • Actual message logs
  • Topic metadata           • Consumer offsets
  • Partition state          • (in __consumer_offsets)
  • Controller info
  • ACLs

Problem: Two sources of truth can get out of sync!

Example:
1. Controller writes "Broker 2 is leader" to ZK
2. Network issue - Broker 2 doesn't get the message
3. Broker 1 reads from ZK: "Broker 2 is leader"
4. Broker 2 doesn't know it's leader
5. Confusion!

────────────────────────────────────────────────

KRAFT MODE: Single source of truth

  __cluster_metadata log:
  • Everything in ONE place
  • Replicated via Raft
  • Brokers fetch sequentially
  • Guaranteed ordering

No split-brain, no inconsistency windows
```

### 1.5 ZooKeeper Wasn't Designed for Kafka's Use Case

```
WHAT ZOOKEEPER WAS DESIGNED FOR:

• Small amounts of metadata (KB)
• Infrequent writes
• Coordination primitives (locks, elections)
• Configuration that rarely changes

WHAT KAFKA USES IT FOR:

• 100K+ partition states (growing constantly)
• Frequent ISR updates (every few seconds per partition)
• High-throughput metadata changes
• Controller state machine

This is like using a screwdriver as a hammer -
it works, but there's a better tool for the job!
```

### 1.6 Simpler Security Model

```
ZOOKEEPER MODE:

Must secure TWO systems:

Kafka Security:              ZooKeeper Security:
• SASL/SSL for clients       • SASL for ZK connections
• ACLs in ZK                 • ZK ACLs
• Different config           • Different config
• Different certs            • Different certs

Attack surface: Kafka + ZooKeeper + connection between them

────────────────────────────────────────────────

KRAFT MODE:

Just Kafka:
• One security model
• One set of certificates
• One configuration
• Smaller attack surface
```

### 1.7 Easier Testing and Development

```
ZOOKEEPER MODE - Local development:

$ bin/zookeeper-server-start.sh config/zookeeper.properties  # Start ZK first
$ bin/kafka-server-start.sh config/server.properties          # Then Kafka

Memory: ZK (~512MB) + Kafka (~1GB) = 1.5GB minimum

────────────────────────────────────────────────

KRAFT MODE - Local development:

$ bin/kafka-server-start.sh config/kraft/server.properties    # Just Kafka!

Memory: Just Kafka (~1GB)
Startup: Faster (no ZK dependency)
Simpler for CI/CD pipelines
```

### 1.8 Summary: Why Leave ZooKeeper?

| Problem with ZooKeeper | KRaft Solution |
|------------------------|----------------|
| **Two systems to manage** | Single system |
| **Slow failover (18+ sec)** | Fast failover (~1-2 sec) |
| **~200K partition limit** | Millions of partitions |
| **Metadata split across systems** | Single metadata log |
| **Not designed for Kafka's workload** | Purpose-built for Kafka |
| **Complex security setup** | Unified security model |
| **Heavy development setup** | Lightweight, single process |
| **Expertise in two systems** | Just learn Kafka |

### 1.9 The Timeline

```
2011      Kafka created, uses ZooKeeper
            (ZooKeeper was a good choice at the time -
             mature, battle-tested coordination service)

2019      KIP-500 proposed: "Replace ZooKeeper"
            Community recognizes limitations

2021      Kafka 2.8 - KRaft early access (experimental)

2022      Kafka 3.3 - KRaft production ready

2023      Kafka 3.5 - ZK migration tools available

2024+     Kafka 4.0 - ZooKeeper support REMOVED
            (ZooKeeper mode no longer supported)

ZooKeeper served Kafka well for 10+ years, but it's time to move on!
```

---

## 2. KRaft Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      KRAFT MODE                                 │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              CONTROLLER QUORUM (Raft)                      │ │
│  │                                                            │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │ │
│  │  │Controller 1│  │Controller 2│  │Controller 3│           │ │
│  │  │  (LEADER)  │  │ (Follower) │  │ (Follower) │           │ │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │ │
│  │        │               │               │                   │ │
│  │        └───────────────┴───────────────┘                   │ │
│  │                    Raft Replication                        │ │
│  │                                                            │ │
│  │            __cluster_metadata (internal log)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           │ Metadata Fetch (Pull)               │
│                           ▼                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Broker 1  │  │  Broker 2  │  │  Broker 3  │                │
│  │            │  │            │  │            │                │
│  │  Fetches   │  │  Fetches   │  │  Fetches   │                │
│  │  metadata  │  │  metadata  │  │  metadata  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Difference from ZooKeeper Mode

| With ZooKeeper | With KRaft |
|----------------|------------|
| Metadata in ZooKeeper | Metadata in `__cluster_metadata` log |
| Controller watches ZK | Controller IS the metadata store |
| Brokers → ZK for registration | Brokers → Controller for registration |
| ZAB consensus (ZooKeeper) | Raft consensus (built into Kafka) |
| Controller pushes to brokers | Brokers pull from controller |

---

## 3. Controller Roles: Pre-Configured, Not Elected

### The Key Insight

In KRaft mode, **brokers do NOT become controllers**. They are **separate roles** defined at startup by configuration. A broker CANNOT suddenly become a controller at runtime.

```
IMPORTANT DISTINCTION:

"Controller" = a fixed role defined in config
"Active Controller (Leader)" = elected among controllers

A broker CANNOT suddenly become a controller!
A controller CANNOT suddenly become a broker!
(unless configured as both in combined mode)
```

### How Roles Are Assigned (Config Time)

```properties
# Node 1 config: CONTROLLER ONLY
process.roles=controller        # ← Fixed at startup
node.id=1

# Node 2 config: CONTROLLER ONLY
process.roles=controller
node.id=2

# Node 3 config: CONTROLLER ONLY
process.roles=controller
node.id=3

# Node 4 config: BROKER ONLY
process.roles=broker            # ← Fixed at startup
node.id=4

# Node 5 config: BROKER ONLY
process.roles=broker
node.id=5

# All nodes know who the controllers are:
controller.quorum.voters=1@node1:9093,2@node2:9093,3@node3:9093
```

```
DECIDED BY CONFIG:           DECIDED BY ELECTION:
(cannot change at runtime)   (changes dynamically)

┌────────────────────┐      ┌────────────────────┐
│ Who is a controller │      │ Which controller   │
│ Who is a broker     │      │ is the LEADER      │
└────────────────────┘      └────────────────────┘
```

### What Gets Elected: The Active Controller Leader

Among the **pre-configured controllers**, one is elected as the **leader** via Raft:

```
CONTROLLER QUORUM (all pre-configured):

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│                │  │                │  │                │
│   FOLLOWER     │  │    LEADER ★    │  │   FOLLOWER     │
│                │  │  (elected via  │  │                │
│                │  │   Raft)        │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
                           │
                           │ ← Only this one processes
                           │   requests from brokers

┌────────────┐  ┌────────────┐  ┌────────────┐
│  Broker 4  │  │  Broker 5  │  │  Broker 6  │
│            │  │            │  │            │
│  Can NEVER │  │  Can NEVER │  │  Can NEVER │
│  become a  │  │  become a  │  │  become a  │
│  controller│  │  controller│  │  controller│
└────────────┘  └────────────┘  └────────────┘
```

### Comparison with ZooKeeper Mode

```
ZOOKEEPER MODE:

ANY broker can become the controller!

┌──────┐  ┌──────┐  ┌──────┐
│Broker│  │Broker│  │Broker│   All are brokers
│  0   │  │  1   │  │  2   │   All can become controller
└──┬───┘  └──┬───┘  └──┬───┘
   │         │         │
   └────┬────┴─────────┘
        ▼
   Race to create /controller in ZK
   Winner gets the controller ROLE

   ✅ Broker 0 wins → Broker 0 is now broker + controller
   ❌ Broker 1 lost → stays regular broker
   ❌ Broker 2 lost → stays regular broker

   Controller role MOVES between brokers dynamically!

────────────────────────────────────────────────

KRAFT MODE:

Controllers and brokers are SEPARATE roles!

┌────────────┐  ┌────────────┐  ┌────────────┐
│Controller 1│  │Controller 2│  │Controller 3│
│ (always    │  │ (always    │  │ (always    │
│ controller)│  │ controller)│  │ controller)│
└─────┬──────┘  └──────┬─────┘  └──────┬─────┘
      │                │               │
      └───── Raft Election ────────────┘
             (who is LEADER)

┌────────┐  ┌────────┐  ┌────────┐
│Broker 4│  │Broker 5│  │Broker 6│
│(always │  │(always │  │(always │
│ broker)│  │ broker)│  │ broker)│
└────────┘  └────────┘  └────────┘

Brokers NEVER participate in controller election!
```

### The Exception: Combined Mode

In **combined mode**, a single node runs both roles:

```
COMBINED MODE (small clusters / development)

process.roles=broker,controller    ← BOTH roles

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Node 1      │ │     Node 2      │ │     Node 3      │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │ Controller│  │ │  │ Controller│  │ │  │ Controller│  │
│  │ (Leader)★ │  │ │  │ (Follower)│  │ │  │ (Follower)│  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  Broker   │  │ │  │  Broker   │  │ │  │  Broker   │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Roles are still defined at config time.
All 3 nodes are ALWAYS controllers + brokers.
Election still only happens among the controller roles.
```

---

## 4. The Metadata Log: `__cluster_metadata`

Instead of ZooKeeper znodes, KRaft stores everything in an **internal replicated log**.

### What the Log Contains

```
__cluster_metadata topic (replicated across controller quorum)

┌─────────────────────────────────────────────────────────────────┐
│ Offset │ Record Type            │ Data                          │
├────────┼────────────────────────┼───────────────────────────────┤
│   0    │ FeatureLevelRecord     │ {features: {...}}             │
│   1    │ ClusterRecord          │ {clusterId: "abc-123"}        │
│   2    │ BrokerRecord           │ {id:1, host:"b1", port:9092}  │
│   3    │ BrokerRecord           │ {id:2, host:"b2", port:9092}  │
│   4    │ TopicRecord            │ {name:"orders", id:"xyz"}     │
│   5    │ PartitionRecord        │ {topic:"orders", partition:0, │
│        │                        │  leader:1, isr:[1,2,3]}       │
│   6    │ PartitionRecord        │ {topic:"orders", partition:1, │
│        │                        │  leader:2, isr:[2,3,1]}       │
│   7    │ BrokerRecord           │ {id:3, host:"b3", port:9092}  │
│   8    │ PartitionChangeRecord  │ {topic:"orders", partition:0, │
│        │                        │  leader:2, isr:[2,3]}         │
│  ...   │ ...                    │ ...                           │
└─────────────────────────────────────────────────────────────────┘

This log is the SINGLE SOURCE OF TRUTH for the cluster!
```

### Record Types

| Record Type | Purpose |
|-------------|---------|
| `ClusterRecord` | Cluster identity |
| `BrokerRecord` | Broker registration info |
| `RegisterBrokerRecord` | Detailed broker registration |
| `TopicRecord` | Topic creation |
| `PartitionRecord` | Partition assignment |
| `PartitionChangeRecord` | Leadership/ISR changes |
| `FenceBrokerRecord` | Broker fenced (marked unavailable) |
| `UnfenceBrokerRecord` | Broker unfenced |
| `RemoveTopicRecord` | Topic deletion |
| `ConfigRecord` | Configuration changes |
| `AccessControlRecord` | ACL changes |
| `FeatureLevelRecord` | Feature flags |

### Example Records in Detail

```
Offset 100: RegisterBrokerRecord
{
  "brokerId": 3,
  "incarnationId": "abc-123",
  "brokerEpoch": 5,
  "endPoints": [
    {"name": "PLAINTEXT", "host": "broker3", "port": 9092}
  ],
  "rack": "us-east-1a"
}

Offset 101: TopicRecord
{
  "name": "orders",
  "topicId": "xyz-456"
}

Offset 102: PartitionRecord
{
  "partitionId": 0,
  "topicId": "xyz-456",
  "replicas": [1, 2, 3],
  "isr": [1, 2, 3],
  "leader": 1,
  "leaderEpoch": 0
}

Offset 103: PartitionChangeRecord
{
  "partitionId": 0,
  "topicId": "xyz-456",
  "isr": [1, 2],        // Broker 3 fell out of ISR
  "leader": 1
}
```

---

## 5. How Brokers Fetch Metadata

### 5.1 The Connection

```
Broker                              Controller Quorum
┌──────────────────┐               ┌──────────────────┐
│                  │               │                  │
│  On startup:     │               │  Controller 1    │
│                  │  TCP Connect  │  (Leader) ◄──────┤
│  Read config:    │ ─────────────►│                  │
│  controller.     │               │  Controller 2    │
│  quorum.voters   │               │  (Follower)      │
│                  │               │                  │
│  Connect to      │               │  Controller 3    │
│  active leader   │               │  (Follower)      │
│                  │               │                  │
└──────────────────┘               └──────────────────┘

Broker initiates connection TO controller (same as ZK!)
Controller does NOT connect to broker
```

### 5.2 Finding the Active Controller

```
BROKER STARTUP:

1. Read config:
   controller.quorum.voters=1@ctrl1:9093,2@ctrl2:9093,
                            3@ctrl3:9093

2. Try to connect to any controller:

   Broker ─────► Controller 2 (Follower)
                      │
                      ▼
                 "I'm not the leader.
                  Leader is Controller 1"
                      │
                      ▼
   Broker ─────► Controller 1 (Leader) ✓

3. Start fetching metadata from leader

4. If leader changes:
   - Fetch returns error "NOT_LEADER"
   - Broker reconnects to new leader
```

### 5.3 The Fetch Protocol

Brokers use the same `Fetch` API that Kafka uses for message replication:

```
Broker                              Active Controller
┌──────────────────┐               ┌──────────────────┐
│                  │               │                  │
│  Local Metadata  │               │  __cluster_      │
│  Cache           │               │  metadata log    │
│                  │               │                  │
│  Last offset: 100│  FETCH        │  Current: 150    │
│                  │ ────────────► │                  │
│                  │  Request:     │                  │
│                  │  {            │                  │
│                  │   topic:      │                  │
│                  │    __cluster_ │                  │
│                  │    metadata,  │                  │
│                  │   partition:0,│                  │
│                  │   offset: 100 │                  │
│                  │  }            │                  │
│                  │               │                  │
│                  │  FETCH        │                  │
│                  │ ◄──────────── │                  │
│                  │  Response:    │                  │
│                  │  {            │                  │
│                  │   records:    │                  │
│                  │   [101...150] │                  │
│                  │  }            │                  │
│                  │               │                  │
│  Apply records   │               │                  │
│  Last offset: 150│               │                  │
│                  │               │                  │
└──────────────────┘               └──────────────────┘
```

### 5.4 The Metadata Fetch Loop

Brokers run a continuous loop:

```
BROKER'S METADATA FETCHER (Continuous Loop)

while (running) {

    1. Send Fetch request to active controller
       - Topic: __cluster_metadata
       - Partition: 0
       - Offset: lastAppliedOffset + 1

    2. Wait for response (long poll - blocks until new data)

    3. Receive batch of metadata records
       [PartitionRecord, BrokerRecord, TopicRecord, ...]

    4. Apply each record to local metadata cache
       - Update partition leaders
       - Update ISR lists
       - Add/remove topics
       - Track broker status

    5. Update lastAppliedOffset

    6. Loop back to step 1
}
```

### 5.5 Long Polling: Efficient Updates

The Fetch request uses **long polling** - it blocks until new data is available:

```
Timeline:

Broker                              Controller
  │                                      │
  │  Fetch(offset=100)                   │
  │ ──────────────────────────────────►  │
  │                                      │
  │         (no new data yet...)         │
  │         (controller holds request)   │
  │         (broker waits...)            │
  │                                      │
  │                         [New topic created!]
  │                         Controller writes record 101
  │                                      │
  │  Response: [record 101]              │
  │ ◄──────────────────────────────────  │
  │                                      │
  │  Fetch(offset=101)                   │
  │ ──────────────────────────────────►  │
  │                                      │
  │         (waiting again...)           │

Benefits:
• No constant polling (saves network/CPU)
• Near real-time updates
• Same mechanism Kafka uses for message replication
```

### 5.6 Broker's Local Metadata Cache

After fetching, brokers build an in-memory view:

```
BROKER'S METADATA CACHE (In Memory)

┌─────────────────────────────────────────────────────────┐
│ lastAppliedOffset: 150                                  │
│                                                          │
│ brokers: {                                               │
│   1: {host: "broker1", port: 9092, rack: "us-east-1a"}, │
│   2: {host: "broker2", port: 9092, rack: "us-east-1b"}, │
│   3: {host: "broker3", port: 9092, rack: "us-east-1c"}  │
│ }                                                        │
│                                                          │
│ topics: {                                                │
│   "orders": {                                            │
│     id: "xyz-456",                                       │
│     partitions: {                                        │
│       0: {leader: 1, isr: [1,2], replicas: [1,2,3]},    │
│       1: {leader: 2, isr: [2,3,1], replicas: [2,3,1]}   │
│     }                                                    │
│   },                                                     │
│   "users": { ... }                                       │
│ }                                                        │
│                                                          │
│ controllerId: 1                                          │
│ clusterid: "abc-123"                                     │
└─────────────────────────────────────────────────────────┘

All producer/consumer metadata lookups are LOCAL - no network calls!
```

### 5.7 Comparison: ZooKeeper Push vs KRaft Pull

```
ZOOKEEPER MODE (Push):

Controller ──writes──► ZooKeeper
     │                      │
     │ (push)               │ (broker watches)
     ▼                      ▼
┌────────┐             ┌────────┐
│Broker 1│◄──watch────►│Broker 2│
└────────┘  triggers   └────────┘

• Controller pushes LeaderAndIsr to brokers
• Brokers also watch ZK directly for some things
• Two sources of metadata
• Push can FAIL

────────────────────────────────────────────────

KRAFT MODE (Pull):

Controller Quorum
┌─────────────────────────────────────┐
│  __cluster_metadata log             │
│  [rec1][rec2][rec3][rec4][rec5]...  │
└──────────────────┬──────────────────┘
                   │
         Fetch     │     Fetch
         (pull)    │     (pull)
            │      │        │
            ▼      ▼        ▼
       ┌────────┐      ┌────────┐
       │Broker 1│      │Broker 2│
       └────────┘      └────────┘

• Brokers pull from ONE source
• Sequential log = guaranteed ordering
• No push, no watches
• Pull always catches up automatically
```

### 5.8 Key APIs Between Brokers and Controllers

| API | Direction | Purpose |
|-----|-----------|---------|
| `Fetch` | Broker → Controller | Pull metadata records |
| `BrokerRegistration` | Broker → Controller | Register on startup |
| `BrokerHeartbeat` | Broker → Controller | Prove broker is alive |
| `AlterPartition` | Broker → Controller | Request ISR changes |
| `ControlledShutdown` | Broker → Controller | Graceful shutdown |

---

## 6. Raft Consensus Protocol

Raft is a **consensus algorithm** that ensures a group of servers agree on the same data, even if some servers crash.

### 6.1 Three States

Every node is always in one of three states:

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ FOLLOWER │ ──────► │CANDIDATE │ ──────► │  LEADER  │
│          │ timeout │          │ wins    │          │
│ Default  │ no      │ Asks for │ vote    │ Only ONE │
│ state    │ leader  │ votes    │         │ at a time│
└──────────┘ heard   └──────────┘         └──────────┘
     ▲                    │                    │
     │                    │ loses vote          │
     │                    └────────────────────►│
     │                                         │
     │              new leader found            │
     └──────────────────────────────────────────┘
```

### 6.2 Normal Operation: Heartbeats

```
Leader                 Followers
┌──────────┐          ┌──────────┐
│  Node 1  │ ──────►  │  Node 2  │  "Leader is alive,
│ (LEADER) │ ──────►  │  Node 3  │   I'll stay follower"
└──────────┘          └──────────┘
     │
     │ Sends heartbeat every ~150ms (configurable)
     │
     └──► AppendEntries RPC (even if empty = heartbeat)

As long as followers receive heartbeats → no election
```

### 6.3 Election Trigger: Leader Dies

```
T=0      Leader (Node 1) crashes

T=0      Node 2 and Node 3 are waiting for heartbeat...
         Each has a random "election timeout":
         Node 2: timeout = 300ms
         Node 3: timeout = 450ms  (random prevents simultaneous elections)

T=300ms  Node 2's timeout expires FIRST!
         "I haven't heard from leader in 300ms..."
         "I'll start an election!"
```

### 6.4 Phase 1: Become Candidate

```
Node 2 decides to run for leader:

1. Increment my "term" number
   term: 1 → 2

2. Change state: FOLLOWER → CANDIDATE

3. Vote for myself
   votes received: 1 (me)

4. Send "RequestVote" to all other nodes

Node 1          Node 2             Node 3
┌────────┐     ┌──────────┐       ┌────────┐
│  DEAD  │     │ CANDIDATE│       │FOLLOWER│
│        │     │ Term: 2  │       │ Term: 1│
└────────┘     └────┬─────┘       └────────┘
                    │                  ▲
                    │  RequestVote     │
                    │  {term: 2,       │
                    │   candidateId: 2,│
                    │   lastLogIndex:5,│
                    │   lastLogTerm: 1}│
                    └──────────────────┘
```

### 6.5 Phase 2: Voting

```
Node 3 receives RequestVote from Node 2:

Node 3 checks:

  ✅ Is candidate's term ≥ my term?
     Candidate term=2, my term=1 → YES

  ✅ Have I already voted in this term?
     No → I can vote

  ✅ Is candidate's log at least as up-to-date as mine?
     Candidate lastLogIndex=5, mine=5 → YES

  ALL CHECKS PASS → GRANT VOTE!

Node 2              Node 3
┌──────────┐       ┌──────────┐
│ CANDIDATE│  ◄──  │ FOLLOWER │
│ Term: 2  │       │ Term: 2  │
└──────────┘       └──────────┘
     │                  │
     │    VoteResponse  │
     │    {             │
     │     term: 2,     │
     │     granted: true│
     │    }             │
```

### 6.6 Phase 3: Win Election

```
Node 2 counts votes:

  Vote from myself:  ✅ (1)
  Vote from Node 3:  ✅ (2)
  Vote from Node 1:  ❌ (dead, no response)

  Votes: 2 out of 3 = MAJORITY!

  I AM THE NEW LEADER!

Node 1          Node 2             Node 3
┌────────┐     ┌──────────┐       ┌──────────┐
│  DEAD  │     │  LEADER  │       │ FOLLOWER │
│        │     │  Term: 2 │       │  Term: 2 │
└────────┘     └────┬─────┘       └──────────┘
                    │                  ▲
                    │  Heartbeats      │
                    └──────────────────┘

Node 2 immediately starts sending heartbeats
to prevent new elections
```

### 6.7 Terms (Logical Clock)

```
Term = "era" or "presidency"

┌──────────┬──────────────────────────────────────┐
│  Term 1  │  Node 1 is leader                    │
├──────────┼──────────────────────────────────────┤
│  Term 2  │  Node 1 dies, Node 2 elected         │
├──────────┼──────────────────────────────────────┤
│  Term 3  │  Node 2 dies, Node 3 elected         │
├──────────┼──────────────────────────────────────┤
│  Term 4  │  Network issue, Node 1 elected       │
└──────────┴──────────────────────────────────────┘

Rules:
• Each term has AT MOST one leader
• Terms only go UP, never down
• If a node sees a higher term, it updates and steps down
• Stale leader with old term is rejected by everyone
```

### 6.8 Voting Rules: Why Only One Leader per Term

```
RULE 1: Each node votes ONCE per term

Term 5:
Node 2: "Vote for me!" → Node 3: "OK, voted for you"
Node 1: "Vote for me!" → Node 3: "Sorry, already voted in term 5"

RULE 2: Need MAJORITY to win

3 nodes → need 2 votes
5 nodes → need 3 votes

Since each node votes once, and you need majority:
→ Only ONE candidate can get majority in a given term!
→ Guarantees at most one leader per term
```

### 6.9 Random Election Timeout: Preventing Split Vote

```
WITHOUT RANDOMIZATION (BAD):

Node 2 timeout: 300ms  │  Both become candidates
Node 3 timeout: 300ms  │  at the same time!

Node 2: "Vote for me!" ──► Node 3: "I voted for myself"
Node 3: "Vote for me!" ──► Node 2: "I voted for myself"

Result: Each has 1 vote, nobody wins = SPLIT VOTE

────────────────────────────────────────────────

WITH RANDOMIZATION (GOOD):

Node 2 timeout: 250ms  │  Node 2 starts first!
Node 3 timeout: 400ms  │

Node 2: "Vote for me!" ──► Node 3: "OK, here's my vote"

Result: Node 2 gets 2 votes = WINS!

Typical range: 150-300ms (random per node, per election)
```

### 6.10 Handling Split Votes

```
5 Nodes, 2 candidates, nobody gets majority:

Term 5:
Node 1 (Candidate): votes = {1, 3}     = 2 (need 3)
Node 4 (Candidate): votes = {4, 5}     = 2 (need 3)
Node 2: voted for Node 1

Nobody wins!
     │
     ▼
Election timeout expires again (new random timeouts)
     │
     ▼
Term 6: New election
Node 3 times out first → becomes candidate
Gets votes from {3, 1, 2} = 3 votes = WINS!

Split votes are rare thanks to randomization
and resolve quickly by trying again
```

### 6.11 After Election: Log Replication

```
Client: "Write X=5"
            │
            ▼
Leader (Node 2):
  Log: [1:X=1] [2:Y=2] [3:X=5]  ← Append new entry (uncommitted)
            │
            │  AppendEntries {term:2, entry: X=5}
            ▼
  ┌──────────────────┐               ┌──────────────────┐
  │  Follower (N1)   │               │  Follower (N3)   │
  │  Log: [1:X=1]    │               │  Log: [1:X=1]    │
  │       [2:Y=2]    │               │       [2:Y=2]    │
  │       [3:X=5] ✓  │               │       [3:X=5] ✓  │
  │  ACK ──────────► │               │  ACK ──────────► │
  └──────────────────┘               └──────────────────┘

Leader receives 2 ACKs (+ itself = 3/3):
MAJORITY! → COMMIT entry → Respond to client: "OK"
```

### 6.12 Log Safety Rule

A candidate can only win if its log is **at least as up-to-date** as the majority:

```
Node 1 (was leader): Log = [A, B, C, D, E]  ← has everything
Node 2 (follower):   Log = [A, B, C, D, E]  ← up to date
Node 3 (was down):   Log = [A, B, C]         ← behind!

Node 1 crashes. Who can become leader?

Node 3 asks Node 2 for vote:
Node 2: "Your log is behind mine. REJECTED!"

Node 2 asks Node 3 for vote:
Node 3: "Your log is ahead of mine. GRANTED!"

Node 2 wins! → Committed data (D, E) is preserved!

This prevents a stale node from becoming leader
and overwriting data that was already committed.
```

### 6.13 How KRaft Uses Raft

```
RAFT IN KAFKA (KRaft):

The "log" in Raft = __cluster_metadata topic

Controller 1         Controller 2         Controller 3
(LEADER)             (Follower)           (Follower)
┌─────────────┐     ┌─────────────┐      ┌─────────────┐
│ Metadata Log│     │ Metadata Log│      │ Metadata Log│
│             │     │             │      │             │
│ [TopicRec]  │────►│ [TopicRec]  │      │ [TopicRec]  │
│ [PartRec ]  │────►│ [PartRec ]  │      │ [PartRec ]  │
│ [BrokerRec] │────►│ [BrokerRec] │      │ [BrokerRec] │
│ [ISRChange] │────►│ [ISRChange] │      │ [ISRChange] │
└─────────────┘     └─────────────┘      └─────────────┘
      │                                        ▲
      └────────────────────────────────────────┘
                  Raft replication

When leader dies:
• Raft election picks new leader (~1-2 seconds)
• New leader has all committed metadata (guaranteed by Raft)
• Brokers reconnect to new leader
• No data loss!
```

### 6.14 Raft vs ZAB (ZooKeeper's Protocol)

| Aspect | Raft (KRaft) | ZAB (ZooKeeper) |
|--------|-------------|-----------------|
| **Leader election** | Random timeout + votes | Longest log wins |
| **Log replication** | AppendEntries RPC | Proposal + ACK + Commit |
| **Term/Epoch** | Term number | Epoch number |
| **Simplicity** | Designed to be understandable | More complex |
| **Split vote handling** | Random timeouts | Different mechanism |
| **Core idea** | Same - leader-based consensus | Same - leader-based consensus |

---

## 7. Broker Failure Handling in KRaft

### When a Broker Dies

```
Timeline:

T=0     Broker 2 crashes

T=0-    Controller notices missing heartbeats
T=10s   (broker.heartbeat.interval.ms, broker.session.timeout.ms)

T=10s   Controller:
        1. Mark Broker 2 as FENCED
        2. Find partitions where Broker 2 was leader:
           • orders-0: leader=2, ISR=[2,1,3]
           • users-1:  leader=2, ISR=[2,3]
        3. Elect new leaders from ISR:
           • orders-0: leader=1 (first alive in ISR)
           • users-1:  leader=3
        4. Write PartitionChangeRecord to metadata log:
           {partition: orders-0, leader: 1, isr: [1,3]}
           {partition: users-1, leader: 3, isr: [3]}
        5. Replicate to follower controllers

T=10.1s Brokers fetch new metadata:
        Broker 1: "I'm now leader for orders-0!"
        Broker 3: "I'm now leader for users-1!"

T=10.2s Cluster fully operational with new leaders

Total failover time: ~10 seconds (vs ~18+ seconds with ZooKeeper)
```

---

## 8. Controller Failure Handling in KRaft

### When Active Controller Dies

```
BEFORE:
┌────────────┐  ┌────────────┐  ┌────────────┐
│Controller 1│  │Controller 2│  │Controller 3│
│  (LEADER)  │  │ (Follower) │  │ (Follower) │
│    dies!   │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘

RAFT ELECTION:
  Controller 2: "No heartbeat from leader... starting election!"
  Controller 2 → Controller 3: "Vote for me! Term 5"
  Controller 3 → Controller 2: "OK, you have my vote"
  Controller 2: "I have majority (2/3)! I'm the new leader!"

AFTER:
┌────────────┐  ┌────────────┐  ┌────────────┐
│Controller 1│  │Controller 2│  │Controller 3│
│   (DEAD)   │  │  (LEADER)  │  │ (Follower) │
│            │  │    NEW!    │  │            │
└────────────┘  └────────────┘  └────────────┘

Brokers automatically connect to new active controller
Failover time: ~1-2 seconds (election timeout)
```

---

## 9. Controller Patching (Rolling Upgrade)

### 9.1 Key Principle: Maintain Quorum

```
3-Controller Quorum: Need 2/3 alive for quorum
5-Controller Quorum: Need 3/5 alive for quorum

Rule: ONLY take down ONE controller at a time!

3 controllers: 3 → 2 (OK) → back to 3 → take next one down
5 controllers: 5 → 4 (OK) → back to 5 → take next one down
```

### 9.2 Step 1: Start with Followers, NOT the Leader

```
BEFORE PATCHING:

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   (LEADER)     │  │  (Follower)    │  │  (Follower)    │
│   v3.6.0       │  │   v3.6.0       │  │   v3.6.0       │
└────────────────┘  └────────────────┘  └────────────────┘

Upgrade ORDER: Followers first, Leader last

Why? Taking down a follower doesn't trigger election.
     Taking down the leader DOES trigger election.
```

### 9.3 Step 2: Patch First Follower (Controller 3)

```
1. Stop Controller 3

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   (LEADER)     │  │  (Follower)    │  │   🔧 DOWN      │
│   v3.6.0       │  │   v3.6.0       │  │   patching...  │
└────────────────┘  └────────────────┘  └────────────────┘

Quorum: 2/3 alive ✅ (still have majority)
Cluster: Fully operational

2. Apply patch / upgrade binaries on Controller 3
3. Start Controller 3

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   (LEADER)     │  │  (Follower)    │  │  (Follower)    │
│   v3.6.0       │  │   v3.6.0       │  │   v3.7.0 ✅    │
└────────────────┘  └────────────────┘  └────────────────┘

4. Wait for Controller 3 to catch up on metadata log
Quorum: 3/3 alive ✅
```

### 9.4 Step 3: Patch Second Follower (Controller 2)

```
Same process:

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   (LEADER)     │  │   🔧 DOWN      │  │  (Follower)    │
│   v3.6.0       │  │   patching...  │  │   v3.7.0       │
└────────────────┘  └────────────────┘  └────────────────┘

Quorum: 2/3 alive ✅

After patch:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   (LEADER)     │  │  (Follower)    │  │  (Follower)    │
│   v3.6.0       │  │   v3.7.0 ✅    │  │   v3.7.0 ✅    │
└────────────────┘  └────────────────┘  └────────────────┘

Quorum: 3/3 alive ✅
```

### 9.5 Step 4: Patch Leader (Controller 1)

```
Stopping the leader triggers a Raft election!

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│   🔧 DOWN      │  │  (Follower)    │  │  (Follower)    │
│   patching...  │  │   v3.7.0       │  │   v3.7.0       │
└────────────────┘  └────────────────┘  └────────────────┘

Raft Election (automatic, ~1-2 seconds):
Controller 2: "Leader is gone, starting election!"
Controller 3: "I vote for Controller 2"
Controller 2: "I'm the new leader!" ★

Quorum: 2/3 alive ✅ (new leader elected)
Brokers: Detect new leader, reconnect automatically
Downtime: ~1-2 seconds for leader election

After patch:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Controller 1  │  │  Controller 2  │  │  Controller 3  │
│  (Follower)    │  │  (LEADER) ★    │  │  (Follower)    │
│   v3.7.0 ✅    │  │   v3.7.0 ✅    │  │   v3.7.0 ✅    │
└────────────────┘  └────────────────┘  └────────────────┘

ALL CONTROLLERS PATCHED!
```

### 9.6 Operational Commands

```bash
# === PREPARATION ===

# Check which controller is leader
bin/kafka-metadata-quorum.sh --bootstrap-controller ctrl1:9093 describe --status

# Output:
# ClusterId:      abc-123
# LeaderId:       1           ← Controller 1 is leader
# LeaderEpoch:    15
# HighWatermark:  3456


# === PATCH FOLLOWER (Controller 3) ===

# Stop Controller 3 (follower)
ssh ctrl3 "bin/kafka-server-stop.sh"

# Wait for stop
ssh ctrl3 "while kill -0 $(cat /var/run/kafka.pid) 2>/dev/null; do sleep 1; done"

# Apply patch
ssh ctrl3 "cp -r /opt/kafka-3.7.0/* /opt/kafka/"

# Start Controller 3
ssh ctrl3 "bin/kafka-server-start.sh -daemon config/controller.properties"

# Verify it joined back and caught up
bin/kafka-metadata-quorum.sh --bootstrap-controller ctrl1:9093 describe --replication

# Output:
# NodeId  LogEndOffset  Lag  LastFetchTimestamp  LastCaughtUpTimestamp  Status
# 1       3456          0    -                   -                     Leader
# 2       3456          0    100ms ago           100ms ago             Follower
# 3       3456          0    200ms ago           200ms ago             Follower  ← Back!


# === Repeat for Controller 2, then Controller 1 (leader last) ===
```

### 9.7 Verification Between Each Step

```bash
bin/kafka-metadata-quorum.sh --bootstrap-controller ctrl1:9093 describe --replication
```

```
HEALTHY OUTPUT (OK to proceed):

NodeId  LogEndOffset  Lag  LastFetchTimestamp  Status
1       3500          0    100ms ago           Leader
2       3500          0    150ms ago           Follower
3       3500          0    120ms ago           Follower

✅ All nodes present
✅ Lag = 0 (all caught up)
✅ Recent fetch timestamps

────────────────────────────────────────────────

UNHEALTHY - DO NOT PROCEED:

NodeId  LogEndOffset  Lag   LastFetchTimestamp  Status
1       3500          0     100ms ago           Leader
2       3500          0     150ms ago           Follower
3       3480          20    -                   Observer

❌ Node 3 has lag (still catching up)
❌ Wait for lag to reach 0 before patching next node
```

### 9.8 Full Patching Order (Including Brokers)

```
Phase 1: Controllers (follower → follower → leader)
─────────────────────────────────────────────────
1. Patch Controller 3 (follower)
2. Verify it caught up
3. Patch Controller 2 (follower)
4. Verify it caught up
5. Patch Controller 1 (leader) → triggers election
6. Verify new leader elected

Phase 2: Brokers (one at a time)
─────────────────────────────────────────────────
7.  Patch Broker 4
8.  Wait for partition replicas to catch up
9.  Patch Broker 5
10. Wait for partition replicas to catch up
11. Patch Broker 6
12. Verify cluster healthy
```

### 9.9 Impact During Patching

| What's Happening | Impact on Clients |
|------------------|-------------------|
| Follower controller down | **Zero** - brokers connected to leader |
| Leader controller down | **~1-2 sec** - Raft election, brokers reconnect |
| Broker down | **Brief** - partitions re-leadered, producers/consumers retry |

### 9.10 Common Mistakes to Avoid

```
❌ NEVER: Take down 2 controllers at once (3-node quorum)

   1/3 alive = NO QUORUM = CLUSTER CANNOT PROCESS METADATA!
   • No new topics
   • No leader elections
   • No ISR changes

❌ NEVER: Proceed before verifying catch-up

   If Controller 3 has lag=500 and you take down Controller 2:
   → If Controller 1 also fails, data could be lost

❌ NEVER: Patch leader first

   Unnecessary election + risk if something goes wrong
   with the patched leader on restart

✅ ALWAYS: Check inter.broker.protocol.version

   During mixed-version rolling upgrade, set:
   inter.broker.protocol.version=3.6   ← OLD version

   Only bump AFTER all nodes are upgraded:
   inter.broker.protocol.version=3.7   ← NEW version
```

---

## 10. Fencing and Consistency

### 10.1 The Problem: Stale Leader

What happens when the controller decides Broker 2 should be leader, but Broker 2 hasn't received this info yet?

```
Controller writes to metadata log:
  Offset 150: PartitionChangeRecord
  { topic: "orders", partition: 0, leader: 2, isr: [2, 3] }

Broker 1: Fetched up to offset 150 ✅ (knows Broker 2 is leader)
Broker 2: Fetched up to offset 145 ❌ (doesn't know yet!)
Broker 3: Fetched up to offset 150 ✅ (knows Broker 2 is leader)
```

### 10.2 Leader Epoch + Fencing

```
KEY CONCEPT: Leader Epoch + Fencing

Every leadership change includes a "leader epoch" number.
A broker can only ACT as leader if it has the correct epoch.

Controller writes:
{ leader: 2, leaderEpoch: 5 }

Broker 2 (hasn't fetched yet):
"My local epoch for orders-0 is still 4"
"I don't know I'm leader with epoch 5"
"I will NOT accept produce requests for this partition"
```

### 10.3 Step-by-Step: How Fencing Works

```
STEP 1: Producer asks for metadata

Producer → Broker 1: "Who is leader for orders-0?"
Broker 1 → Producer: "Leader is Broker 2 (epoch 5)"

STEP 2: Broker 2 rejects (doesn't know yet)

Producer → Broker 2: Produce(orders-0, epoch=5)

Broker 2 checks:
  "Producer says leader epoch is 5"
  "My metadata says leader epoch is 4"
  "I haven't fetched offset 150 yet"
  → REJECT! Return error: NOT_LEADER_OR_FOLLOWER

STEP 3: Producer retries

Producer: "Got error, let me refresh metadata and retry"

Meanwhile, Broker 2's metadata fetcher is running:
Broker 2 ── Fetch(offset=145) ──► Controller
Broker 2 ◄── Records 146-150 ──── Controller

Broker 2 applies record 150:
"Oh! I'm now leader for orders-0, epoch 5!"

STEP 4: Retry succeeds

Producer → Broker 2: Produce(orders-0, epoch=5)
Broker 2: "Epoch 5 matches my metadata! I am the leader!"
"Accepting produce request ✅"
```

### 10.4 Broker Fencing (Too Far Behind)

```
BROKER FENCING:

Controller's metadata log: offset 500

Broker 1: offset 500 ✅ Active
Broker 2: offset 200 ❌ Way too far behind!
Broker 3: offset 498 ✅ Active (almost caught up)

Controller:
"Broker 2 is too far behind + missed heartbeats"
"I'll FENCE Broker 2"

Fenced broker:
• Cannot be leader for any partition
• Cannot be in any ISR
• Rejects ALL client requests
• Must catch up on metadata before being unfenced

This prevents a stale broker from EVER serving
incorrect data to clients!
```

### 10.5 Old Leader Scenario: KRaft vs ZooKeeper

```
SCENARIO: Old leader hasn't discovered it's been replaced

ZOOKEEPER MODE:
  How does Broker 2 find out it's no longer leader?

  Option 1: Controller pushes LeaderAndIsr request
            → But push can FAIL (network issue)
            → Broker 2 never gets the message

  Option 2: ZK session expired callback fires
            → Takes 6-18 seconds
            → Only works if ZK client library detects it

  Option 3: Followers reject replication (epoch check)
            → Only happens when Broker 2 tries to replicate
            → What if no new writes come in? Never discovers!

  ⚠️  Broker 2 PASSIVELY waits to be told

────────────────────────────────────────────────

KRAFT MODE:
  How does Broker 2 find out it's no longer leader?

  Option 1: Metadata fetch loop (ALWAYS RUNNING)
            → Broker 2 fetches next batch of records
            → Sees PartitionChangeRecord: "leader is now 3"
            → Immediately steps down
            → Happens within milliseconds

  Option 2: Followers reject replication (epoch check)
            → Same as ZK mode

  Option 3: Heartbeat rejected by controller
            → Controller: "You're fenced!"
            → Broker 2 stops everything

  ✅ Broker 2 ACTIVELY discovers the change (pull model)
```

### 10.6 The acks=all Safety

```
WITH acks=1 (leader only acknowledgment):

BOTH ZooKeeper and KRaft have a risk window where
an old leader could accept a write before discovering
it's been replaced.

ZooKeeper mode: Bigger window (slower detection)
KRaft mode:     Smaller window (faster detection)

────────────────────────────────────────────────

WITH acks=all (all ISR replicas must acknowledge):

BOTH modes are safe!

Old leader tries to replicate → followers reject (wrong epoch)
→ Old leader can't get ISR acknowledgment
→ Write fails → Producer gets error → Producer retries
→ Producer finds new leader → Writes to correct broker
```

### 10.7 The Three Real Differences (Not Just Epoch)

Epoch exists in BOTH ZooKeeper mode and KRaft mode. The real differences are:

| Difference | ZooKeeper Mode | KRaft Mode |
|------------|----------------|------------|
| **Discovery Speed** | Broker waits to be told (push) → slow, can fail | Broker actively fetches (pull) → fast, reliable |
| **Fencing Mechanism** | No explicit fencing | Controller can fence a broker via heartbeat response |
| **Source of Truth** | Metadata split between ZK and Controller | One metadata log, everyone reads from it |

Think of it this way: **epoch is the lock on the door.** Both modes have it. The difference is how fast someone tells the old leader that the lock has been changed!

---

## 11. KRaft vs ZooKeeper: Full Comparison

| Aspect | ZooKeeper Mode | KRaft Mode |
|--------|----------------|------------|
| **Metadata store** | External (ZooKeeper) | Internal (metadata log) |
| **Broker registration** | Ephemeral ZK nodes | BrokerRegistration RPC |
| **Failure detection** | ZK session timeout (6-18s) | Heartbeat timeout (faster) |
| **Controller election** | Race to create ZK node | Raft leader election |
| **Controller role** | Any broker can become controller | Fixed role in config |
| **Metadata distribution** | Controller pushes to brokers | Brokers pull (Fetch) |
| **Failover time** | ~18-30+ seconds | ~1-2 seconds |
| **Scalability** | ~200K partitions | Millions of partitions |
| **Operational complexity** | Two systems (Kafka + ZK) | One system (Kafka only) |
| **Security** | Two security configs | One security config |
| **Consistency model** | Push (can fail) + ZK watches | Pull (always catches up) |
| **Fencing** | No explicit fencing | Explicit broker fencing |
| **Source of truth** | Split (ZK + Kafka) | Single (metadata log) |
| **Development setup** | 2 processes minimum | 1 process |

---

## 12. Deployment Modes

### 12.1 Combined Mode (Small Clusters)

Each node runs both controller and broker:

```properties
# server.properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@node1:9093,2@node2:9093,3@node3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
controller.listener.names=CONTROLLER
log.dirs=/var/kafka-logs
```

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Node 1      │  │     Node 2      │  │     Node 3      │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │ Controller│  │  │  │ Controller│  │  │  │ Controller│  │
│  │  (voter)  │  │  │  │  (voter)  │  │  │  │  (voter)  │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │  Broker   │  │  │  │  Broker   │  │  │  │  Broker   │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Good for: Development, small production clusters
```

### 12.2 Isolated Mode (Large Clusters)

Separate controller and broker nodes:

```properties
# controller.properties
process.roles=controller
node.id=1
controller.quorum.voters=1@ctrl1:9093,2@ctrl2:9093,3@ctrl3:9093

# broker.properties
process.roles=broker
node.id=101
controller.quorum.voters=1@ctrl1:9093,2@ctrl2:9093,3@ctrl3:9093
```

```
CONTROLLERS (3 nodes)
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Controller │ │ Controller │ │ Controller │
│     1      │ │     2      │ │     3      │
└────────────┘ └────────────┘ └────────────┘
process.roles=controller

BROKERS (many nodes)
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Broker 1│ │Broker 2│ │Broker 3│ │Broker 4│ │   ...  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
process.roles=broker

Good for: Large production clusters, independent scaling
```

### 12.3 Quick Setup: Single Node (Development)

```properties
# Single node KRaft config
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
controller.listener.names=CONTROLLER
log.dirs=/tmp/kafka-logs
```

```bash
# Generate cluster ID
KAFKA_CLUSTER_ID=$(bin/kafka-storage.sh random-uuid)

# Format storage
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c server.properties

# Start (single process, no dependencies!)
bin/kafka-server-start.sh server.properties
```

### 12.4 Starting a 3-Broker Cluster

```bash
# With ZooKeeper (Old Way) - 4 processes:
bin/zookeeper-server-start.sh config/zookeeper.properties
bin/kafka-server-start.sh config/server-0.properties
bin/kafka-server-start.sh config/server-1.properties
bin/kafka-server-start.sh config/server-2.properties

# With KRaft (New Way) - 3 processes:
bin/kafka-server-start.sh config/kraft/server-0.properties
bin/kafka-server-start.sh config/kraft/server-1.properties
bin/kafka-server-start.sh config/kraft/server-2.properties
```

---

## 13. Quick Reference

### KRaft Essential Concepts

| Concept | Description |
|---------|-------------|
| **Controller Quorum** | Group of controller nodes that manage cluster metadata via Raft |
| **Active Controller** | The Raft leader among controllers; processes all metadata changes |
| **`__cluster_metadata`** | Internal topic storing all cluster metadata as a replicated log |
| **Metadata Fetch** | Brokers pull metadata from active controller using Fetch API |
| **BrokerHeartbeat** | Periodic signal from broker to controller proving liveness |
| **Fencing** | Mechanism to prevent stale brokers from serving requests |
| **Leader Epoch** | Version number incremented on each leadership change |
| **Term** | Raft's logical clock; incremented on each election |
| **Combined Mode** | Node runs both controller and broker roles |
| **Isolated Mode** | Separate controller and broker nodes |

### Key Configuration Properties

| Property | Description |
|----------|-------------|
| `process.roles` | `broker`, `controller`, or `broker,controller` |
| `node.id` | Unique ID for this node |
| `controller.quorum.voters` | List of controller nodes |
| `controller.listener.names` | Listener name for controller communication |
| `listeners` | Network listeners (broker + controller) |

### KRaft Version Requirements

| Kafka Version | KRaft Status |
|---------------|-------------|
| < 2.8 | Not available |
| 2.8 - 3.2 | Experimental |
| 3.3+ | **Production ready** |
| 4.0+ | ZooKeeper support removed, KRaft only |

---

*Document created: February 2026*
