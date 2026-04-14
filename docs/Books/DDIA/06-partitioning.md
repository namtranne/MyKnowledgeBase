# Chapter 6 — Partitioning

**Partitioning** (also called **sharding**) breaks a large dataset into smaller subsets (**partitions**), distributing them across multiple nodes. Each piece of data belongs to exactly one partition.

**Primary goal: scalability.** Distribute data and query load across multiple machines so that no single machine is a bottleneck. A well-partitioned system can scale throughput nearly linearly by adding nodes.

**Terminology varies:** shard (MongoDB, Elasticsearch), region (HBase), tablet (Bigtable), vnode (Cassandra, Riak), vBucket (Couchbase).

Partitioning is almost always combined with replication — each partition has multiple copies on different nodes for fault tolerance.

---

## Partitioning Strategies

The fundamental question: given a record with key `k`, which partition should it go to?

### Key-Range Partitioning

Assign a continuous range of keys to each partition, like volumes of an encyclopedia:

```
Partition 1: A-F      Partition 2: G-L      Partition 3: M-R      Partition 4: S-Z
├── apple              ├── grape             ├── mango             ├── strawberry
├── banana             ├── kiwi              ├── orange            ├── watermelon
├── cherry             ├── lemon             ├── peach             └── ...
└── fig                └── lime              └── plum
```

- Ranges are **not necessarily evenly spaced** — they adapt to the distribution of actual data (to keep partitions roughly equal in size)
- Within each partition, keys are stored in **sorted order** → efficient range scans (`SELECT * WHERE key BETWEEN 'banana' AND 'cherry'`)

**Used by:** Bigtable, HBase, RethinkDB, MongoDB (before 2.4), and many traditional databases.

**Advantage:** excellent for range queries and sequential access patterns.

**Critical risk: hot spots.**

If the key is a timestamp (e.g., sensor readings, events), all writes for "today" go to a single partition while the other partitions sit idle. The partition handling current writes becomes a bottleneck.

**Mitigation:** prefix the key with something that distributes writes. For sensor data, use `sensor_name + timestamp` as the key — writes are distributed across partitions (one per sensor), and you can still do range queries for a specific sensor's data over a time range.

### Hash Partitioning

Apply a hash function to the key and assign each hash range to a partition:

```
hash("apple")  = 0x3A2B → Partition 2 (range 0x2000-0x5FFF)
hash("banana") = 0x8C1D → Partition 4 (range 0x8000-0xBFFF)
hash("cherry") = 0x1F4E → Partition 1 (range 0x0000-0x1FFF)
```

- A good hash function distributes keys uniformly across partitions, **regardless of the original key distribution**
- No need for cryptographic hashes — just uniformity. Cassandra uses Murmur3, MongoDB uses MD5.
- **Different from "consistent hashing"** (despite the name often being conflated) — consistent hashing is a specific approach for rebalancing, discussed later.

**Advantage:** even distribution of load, eliminating hot spots from skewed data.

**Disadvantage:** **range queries are impossible** — keys that are adjacent in the original key space are scattered across partitions. A range query must hit all partitions (scatter/gather).

### Cassandra's Compound Primary Key: Best of Both Worlds

Cassandra offers a clever compromise:

```sql
CREATE TABLE events (
    user_id TEXT,
    timestamp TIMESTAMP,
    event_data TEXT,
    PRIMARY KEY (user_id, timestamp)
);
```

- **First part** of the key (`user_id`) is **hashed** → determines the partition
- **Remaining parts** (`timestamp`) are used as a **sorted index within the partition**
- You can efficiently query: "all events for user X between time A and time B" — the user_id hash locates the partition, then the timestamp range scan is local

This enables efficient range queries within a partition while distributing data evenly across the cluster.

### Handling Skew and Hot Spots

Hashing eliminates most skew, but not all. If a single key is extremely popular (e.g., a celebrity user ID on a social network), all reads/writes for that key go to one partition — a **hot spot**.

**Current state of the art:** no automatic solution. Application-level workaround:

1. Identify the small number of hot keys (known from application logic or monitoring)
2. For each hot key, append a random 2-digit number (00-99) to the key → spread across 100 partitions
3. Reads must now query all 100 derived keys and combine the results

This is only worth the complexity for a few known hot keys — applying it to every key would massively increase read overhead.

---

## Partitioning and Secondary Indexes

Secondary indexes (indices on columns other than the primary key) are the main complication for partitioned databases. Two strategies:

### Document-Partitioned Index (Local Index)

Each partition maintains its own secondary index, covering **only the documents stored on that partition**:

```
Partition 0                          Partition 1
┌──────────────────────┐             ┌──────────────────────┐
│ Documents:           │             │ Documents:           │
│   {id:0, color:red}  │             │   {id:2, color:red}  │
│   {id:1, color:blue} │             │   {id:3, color:blue} │
│                      │             │                      │
│ Local index:         │             │ Local index:         │
│   color:red  → [0]   │             │   color:red  → [2]   │
│   color:blue → [1]   │             │   color:blue → [3]   │
└──────────────────────┘             └──────────────────────┘
```

**Writes:** fast — only update the local partition's index.

**Reads by secondary index:** must query **every partition** and merge results (**scatter/gather**). If you have 100 partitions, a query like `WHERE color = 'red'` sends 100 parallel requests.

**Problems with scatter/gather:**
- Expensive — tail latency amplification (response time = slowest partition's response)
- Network overhead for many parallel requests
- Still the most common approach due to write simplicity

**Used by:** MongoDB, Riak, Cassandra, Elasticsearch, SolrCloud, VoltDB.

### Term-Partitioned Index (Global Index)

A single, global secondary index — itself partitioned across nodes (but partitioned **differently** from the data):

```
Index partition 0 (colors a-r):     Index partition 1 (colors s-z):
┌──────────────────────────┐        ┌──────────────────────────┐
│ color:blue → [1, 3]      │        │ color:yellow → [5, 8]   │
│ color:red  → [0, 2]      │        │ color:white  → [7]      │
└──────────────────────────┘        └──────────────────────────┘
```

**Reads by secondary index:** efficient — query only the one index partition that covers the term you're looking for. No scatter/gather.

**Writes:** slower and more complex — a single document write may need to update multiple index partitions (the document is on one partition, but its secondary index terms may be on different partitions).

**Index updates are usually asynchronous** — after writing the document, index updates propagate asynchronously. This means reads may not immediately reflect recent writes (Amazon DynamoDB global secondary indexes: seconds of propagation delay).

---

## Rebalancing Partitions

Cluster changes over time: nodes are added/removed, data grows, throughput changes. Partitions must be redistributed (**rebalanced**).

**Requirements for rebalancing:**
1. After rebalancing, load is shared fairly across nodes
2. During rebalancing, the database continues serving reads and writes
3. Only the minimum necessary data is moved (minimize network/disk I/O)

### Why Not `hash(key) mod N`?

If you assign partitions by `hash(key) % number_of_nodes`, **adding or removing a node changes N**, which changes the partition assignment for **most keys** → massive data movement. Don't do this.

### Rebalancing Strategies

| Strategy | How It Works | Pros | Cons | Used By |
|----------|-------------|------|------|---------|
| **Fixed number of partitions** | Create many more partitions than nodes upfront (e.g., 1,000 partitions for 10 nodes = 100 per node). When adding a node, steal partitions from existing nodes. Partition boundaries never change. | Simple; well-understood; fast rebalancing (move entire partitions). | Must choose partition count at creation. Too few → partitions too large. Too many → management overhead. Hard to choose if dataset size will vary greatly over time. | Riak, Elasticsearch, Couchbase, Voldemort |
| **Dynamic partitioning** | Start with one partition. When a partition grows past a threshold (e.g., 10 GB in HBase), split it into two. When a partition shrinks, merge with an adjacent one. | Adapts to data volume — always right-sized. | Initially only one partition (all writes to one node) until first split. **Pre-splitting** recommended. | HBase, RethinkDB, MongoDB (with range partitioning) |
| **Proportional to nodes** | Fixed number of partitions per node (e.g., 256 per node). When a new node joins, it randomly splits existing partitions and takes half. Total partitions grows with cluster. | Partition size stays roughly proportional to dataset per node. | Random split boundaries. | Cassandra, Ketama |

### Automatic vs Manual Rebalancing

**Fully automatic:** convenient but dangerous — rebalancing is an expensive operation (moves lots of data across the network). If combined with automatic failure detection, it can cascade: a slow node triggers rebalancing → rebalancing overloads the network → more nodes appear slow → more rebalancing.

**Best practice:** the system suggests a rebalancing plan, but a **human administrator confirms** before execution. Used by Couchbase, Riak, Voldemort.

---

## Request Routing (Service Discovery)

**The client wants to read/write a key. Which node has the partition for that key?**

This is an instance of the general **service discovery** problem. Three approaches:

```
Approach 1: Client contacts any node. Node forwards if needed.
┌────────┐    ┌────────┐    ┌────────┐
│ Client │───▶│ Node A │───▶│ Node C │  (A doesn't have the partition, forwards to C)
└────────┘    └────────┘    └────────┘

Approach 2: Routing tier / partition-aware load balancer
┌────────┐    ┌─────────────┐    ┌────────┐
│ Client │───▶│ Routing Tier │───▶│ Node C │  (Router knows C has the partition)
└────────┘    └─────────────┘    └────────┘

Approach 3: Client is partition-aware
┌────────┐    ┌────────┐
│ Client │───▶│ Node C │  (Client knows which node has which partition)
└────────┘    └────────┘
```

**How does the routing layer know which node has which partition?**

| Mechanism | How | Used By |
|-----------|-----|---------|
| **ZooKeeper / consensus service** | Maintains authoritative partition-to-node mapping. Nodes register with ZooKeeper. When partitions move, ZooKeeper is updated. Routing tier (or clients) subscribe to ZooKeeper for changes. | HBase, SolrCloud, Kafka, Espresso |
| **Gossip protocol** | Nodes disseminate cluster state among themselves — no central authority. Every node knows the full partition map. Clients can contact any node. | Cassandra, Riak |
| **External metadata store** | A separate configuration database (e.g., etcd, Consul) stores the mapping. Clients or routing tier queries it. | Many custom systems |

**DNS-based routing:** for simpler cases, a load balancer with no partition awareness — round-robin to any node, which then internally routes. Adds an extra hop but requires no partition-awareness in the load balancer.

### Parallel Query Execution

The partitioning discussion so far focused on simple key-value lookups. **Massively Parallel Processing (MPP)** databases support much more complex queries (joins, aggregations, subqueries) that touch multiple partitions simultaneously:

- Query optimizer breaks a complex SQL query into stages
- Each stage can be executed on relevant partitions in parallel
- Results are aggregated and merged

Used by: Teradata, Vertica, Amazon Redshift, Apache Drill, Presto, Spark SQL, Snowflake.

This is covered in depth in Chapter 10 (Batch Processing).
