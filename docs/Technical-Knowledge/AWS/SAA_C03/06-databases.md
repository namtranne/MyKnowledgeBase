---
sidebar_position: 7
title: "06 — Databases"
slug: 06-databases
---

# Database Services

Databases are tested heavily — choosing the right database engine, configuring HA with Multi-AZ, read scaling with replicas, caching, and cost optimization with serverless options.

---

## Choosing the Right Database

| Requirement | Best Choice |
|-------------|-------------|
| Relational, complex queries, transactions | **RDS** (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB) |
| Relational, best AWS performance + HA | **Aurora** (MySQL/PostgreSQL compatible) |
| Key-value, single-digit ms latency, serverless | **DynamoDB** |
| In-memory cache | **ElastiCache** (Redis or Memcached) |
| Data warehouse, analytics, SQL | **Redshift** |
| Document DB (MongoDB compatible) | **DocumentDB** |
| Graph database | **Neptune** |
| Time-series data | **Amazon Timestream** |
| Ledger / immutable records | **Amazon QLDB** |
| Wide-column (Cassandra compatible) | **Amazon Keyspaces** |
| In-memory, Redis-compatible, durable | **Amazon MemoryDB for Redis** |

---

## Amazon RDS (Relational Database Service)

### Supported Engines

MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and **Amazon Aurora**.

### RDS Key Features

| Feature | Detail |
|---------|--------|
| **Managed** | AWS handles provisioning, patching, backups, recovery |
| **You manage** | Schema, data, queries, indexing, performance tuning |
| **Cannot SSH** | No OS access (it's managed) |
| **Storage** | EBS-backed (gp2, gp3, io1). Auto-scales storage. |
| **Max storage** | 64 TB (most engines) |
| **Maintenance window** | Weekly — can cause brief downtime for patches |

### Multi-AZ (High Availability)

| Feature | Detail |
|---------|--------|
| **Purpose** | High availability and automatic failover |
| **How** | **Synchronous** standby replica in another AZ |
| **Failover** | Automatic — 60-120 seconds. DNS endpoint doesn't change. |
| **Read traffic** | Standby does **NOT** serve read traffic (it's passive) |
| **Use case** | Production databases requiring HA |
| **Cost** | ~2x (running two instances) |

**Multi-AZ DB Cluster (newer):**
- **2 readable standby replicas** in 2 different AZs (3 instances total)
- Standby replicas **can serve read traffic** (unlike classic Multi-AZ)
- Up to 35x faster failover
- Available for MySQL and PostgreSQL only

### Read Replicas (Read Scaling)

| Feature | Detail |
|---------|--------|
| **Purpose** | Scale **read** traffic horizontally |
| **How** | **Asynchronous** replication from primary |
| **Count** | Up to **5** read replicas (15 for Aurora) |
| **Regions** | Can be cross-Region (for latency, DR) |
| **Promotion** | Can be **promoted** to standalone primary DB |
| **Endpoint** | Each replica has its own connection endpoint |
| **Cost** | No data transfer fee within same Region; charges for cross-Region |

:::warning
Read replicas are **asynchronous** — there's replication lag. Multi-AZ standby is **synchronous**. Don't confuse them on the exam.
:::

### RDS Backups

| Type | Detail |
|------|--------|
| **Automated backups** | Daily full backup + transaction logs every 5 minutes. Retention: 0-35 days. Point-in-time recovery. |
| **Manual snapshots** | User-triggered. Persist until manually deleted. |
| **Snapshot sharing** | Can share encrypted snapshots cross-account (must share KMS key) |
| **Snapshot copy** | Cross-Region for DR |

### RDS Encryption

- **At rest:** KMS (AES-256). Set at creation time. Cannot encrypt an existing unencrypted DB directly.
- **In transit:** SSL/TLS. Enforce with `rds.force_ssl` parameter.
- **Encrypt an unencrypted DB:** Snapshot → copy with encryption → restore from encrypted snapshot

### RDS IAM Database Authentication

Authenticate to RDS databases using **IAM roles and tokens** instead of traditional username/password.

| Feature | Detail |
|---------|--------|
| **Supported engines** | MySQL, PostgreSQL, MariaDB |
| **How** | Application calls IAM to get an **authentication token** (valid for 15 minutes) → uses token as password to connect to RDS |
| **Encryption** | Connection is **always encrypted with SSL** (mandatory) |
| **Benefits** | No password management, centralized access control via IAM, token-based (short-lived, no credentials stored) |
| **Limitation** | Not suitable for high connection rates (IAM token generation has API limits) — use RDS Proxy for Lambda |

:::tip Exam pattern
"Authenticate to database without storing credentials" → **RDS IAM Authentication**. "Centralized database access control using IAM" → **RDS IAM Authentication**. "Many short-lived Lambda connections to RDS with IAM auth" → **RDS Proxy** (combines IAM auth + connection pooling).
:::

### RDS Proxy

| Feature | Detail |
|---------|--------|
| **Purpose** | Fully managed database proxy — pools and shares connections |
| **Benefits** | Reduces DB connection overhead, faster failover (~66% less), handles connection spikes |
| **Use case** | Lambda → RDS (Lambda creates many short-lived connections), connection pooling |
| **Engines** | MySQL, PostgreSQL, MariaDB, SQL Server |
| **Security** | Enforces IAM authentication. Stores credentials in Secrets Manager. |
| **Access** | Only accessible from within the VPC (not publicly) |

:::tip Exam pattern
"Lambda functions causing too many DB connections" → **RDS Proxy**.
"Faster failover for RDS" → **RDS Proxy** (reduces failover time by 66%).
:::

### RDS Custom

- For **Oracle** and **SQL Server** — gives you OS and database access
- Like RDS but you can SSH, install custom software, customize configs
- Use case: Migrate on-prem Oracle/SQL Server workloads requiring custom configurations

---

## Amazon Aurora

### Key Differentiators

| Feature | Detail |
|---------|--------|
| **Compatibility** | MySQL and PostgreSQL compatible |
| **Storage** | Automatically replicates **6 copies across 3 AZs** |
| **Failover** | < 30 seconds (automatic) |
| **Read replicas** | Up to **15** with sub-10ms replication lag |
| **Storage scaling** | Auto-scales from 10 GB to **128 TB** |
| **Performance** | 5x MySQL, 3x PostgreSQL throughput |
| **Endpoint types** | Cluster (writer), Reader (load-balanced reads), Custom (subset of instances) |

### Aurora Architecture

```
                   Cluster Endpoint (Writer)
                          │
                   ┌──────┴──────┐
                   │  Primary    │
                   │  Instance   │
                   └──────┬──────┘
                          │ (sync replication to storage layer)
        ┌─────────────────┼─────────────────┐
   ┌────┴────┐      ┌────┴────┐       ┌────┴────┐
   │ Storage │      │ Storage │       │ Storage │
   │ (AZ-a)  │      │ (AZ-b)  │       │ (AZ-c)  │
   │ 2 copies│      │ 2 copies│       │ 2 copies│
   └─────────┘      └─────────┘       └─────────┘
        │                │                  │
   ┌────┴────┐      ┌────┴────┐       ┌────┴────┐
   │ Reader  │      │ Reader  │       │ Reader  │
   │Replica 1│      │Replica 2│       │Replica 3│
   └─────────┘      └─────────┘       └─────────┘
                Reader Endpoint (load-balanced)
```

### Aurora Serverless v2

| Feature | Detail |
|---------|--------|
| **Auto-scaling** | Scales compute (ACUs) based on demand — min/max ACU settings |
| **ACU** | Aurora Capacity Unit — ~2 GB RAM + proportional CPU |
| **Billing** | Per ACU-second |
| **Use case** | Variable, unpredictable workloads. Dev/test. Multi-tenant apps. |
| **Scale to zero** | v2 does NOT scale to zero (v1 did, but v1 is deprecated) |

### Aurora Global Database

| Feature | Detail |
|---------|--------|
| **Cross-Region** | Up to **5 secondary Regions** with read replicas |
| **Replication lag** | < 1 second |
| **Failover** | Promote secondary Region in < 1 minute |
| **Use case** | Cross-Region DR, global read latency reduction |
| **Write forwarding** | Secondary Regions can forward writes to the primary Region |

### Aurora Machine Learning

- Integrates with **SageMaker** and **Comprehend** via SQL queries
- Use case: Fraud detection, sentiment analysis, recommendations — all from SQL

### Aurora Cloning

- Create a new Aurora cluster from an existing one using **copy-on-write**
- Instant, no data copied until changes are made
- Use case: Create test/staging environments from production

---

## Amazon DynamoDB

### Core Concepts

| Concept | Detail |
|---------|--------|
| **Table** | Collection of items |
| **Item** | Collection of attributes (like a row). Max **400 KB** per item. |
| **Primary Key** | **Partition Key** (hash) alone, OR **Partition Key + Sort Key** (composite) |
| **Attributes** | Schema-less — each item can have different attributes |

### Indexes

| Index Type | Detail |
|-----------|--------|
| **Global Secondary Index (GSI)** | Alternative partition + sort key. Eventually consistent. Own provisioned capacity. Can add/remove anytime. |
| **Local Secondary Index (LSI)** | Same partition key, different sort key. Strongly consistent option. Must create at table creation time. |

### Capacity Modes

| Mode | Billing | Use Case |
|------|---------|----------|
| **Provisioned** | Set RCU/WCU (with optional Auto Scaling) | Predictable workloads. Cheaper at scale. |
| **On-Demand** | Pay per request. No capacity planning. | Unpredictable, new tables, spiky workloads. |

**RCU/WCU calculations:**
- **1 RCU** = 1 strongly consistent read/sec for items up to 4 KB, OR 2 eventually consistent reads/sec for items up to 4 KB
- **1 WCU** = 1 write/sec for items up to 1 KB

### DynamoDB Features

| Feature | Detail |
|---------|--------|
| **DynamoDB Accelerator (DAX)** | In-memory cache. **Microsecond** read latency. No code changes (DAX SDK). 5-minute default TTL. |
| **DynamoDB Streams** | Ordered stream of item changes (insert, update, delete). 24-hour retention. Trigger Lambda. |
| **Global Tables** | Multi-Region, **multi-active** replication. Write to any Region. Requires Streams. |
| **Point-in-Time Recovery (PITR)** | Continuous backups. Restore to any second in the last 35 days. |
| **On-demand backup** | Full backup. No performance impact. Retained until deleted. |
| **TTL** | Auto-delete items after expiration. No cost for deletions. |
| **Transactions** | ACID transactions across multiple items/tables. Costs 2x the RCU/WCU. |

### DynamoDB Access Patterns

- Use **partition key** design to distribute data evenly (avoid hot partitions)
- Use **sort key** for range queries and hierarchical data
- Use **GSI** for alternative query patterns
- Use **sparse indexes** — GSI only contains items that have the indexed attribute

:::tip Exam pattern
"Serverless, single-digit ms, key-value" → **DynamoDB**. "Microsecond reads" → **DAX**. "Multi-Region active-active database" → **DynamoDB Global Tables**. "Audit item changes" → **DynamoDB Streams + Lambda**.
:::

---

## Amazon ElastiCache

Managed in-memory data store — **Redis** or **Memcached**.

### Redis vs Memcached

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data structures** | Strings, lists, sets, sorted sets, hashes, streams | Simple key-value only |
| **Persistence** | Yes (RDB snapshots, AOF) | No |
| **Replication** | Yes (read replicas, Multi-AZ with auto-failover) | No |
| **Clustering** | Yes (cluster mode, up to 500 node groups) | Yes (multi-threaded, sharding) |
| **Pub/Sub** | Yes | No |
| **Geospatial** | Yes | No |
| **Backup/Restore** | Yes | No |
| **Encryption** | At rest + in transit | No |
| **Multi-AZ** | Yes (automatic failover) | No |
| **Use case** | Session store, leaderboards, caching, real-time analytics | Simple object caching only |

:::tip Exam tip
Unless the question specifically mentions multi-threaded or simplest caching only, **Redis** is almost always the correct answer.
:::

### Caching Strategies

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| **Lazy Loading** | Cache on read miss (app queries DB, stores in cache) | No unused data. Resilient to cache failure. | Cache miss penalty. Stale data possible. |
| **Write-Through** | Cache on every write (app writes to cache AND DB) | Data always fresh in cache. | Write penalty on every write. More cache storage. |
| **Write-Behind** | Write to cache → async batch write to DB | Reduced DB writes. Lower write latency. | Risk of data loss if cache fails. |
| **TTL** | Set expiration on cached items | Balance freshness and hit rate | May serve stale data near expiry |

**Best practice:** Lazy Loading + TTL for most use cases. Write-Through for critical data freshness.

### ElastiCache Use Cases (Exam Favorites)

| Pattern | How |
|---------|-----|
| **Session store** | Store user sessions in Redis for stateless app tier |
| **Database cache** | Cache frequent DB queries to reduce RDS load |
| **Leaderboard** | Redis Sorted Sets for real-time leaderboards |
| **Rate limiting** | Redis counters with TTL |
| **Pub/Sub** | Redis pub/sub for real-time messaging |

---

## Amazon Redshift

Fully managed **data warehouse** for analytical queries (OLAP).

| Feature | Detail |
|---------|--------|
| **Based on** | PostgreSQL (but not for OLTP — it's columnar) |
| **Storage** | Columnar storage + parallel query processing |
| **Nodes** | Leader node (query planning) + Compute nodes (execution) |
| **Performance** | 10x better than other data warehouses via ML, columnar, compression |
| **Scaling** | Resize cluster or use **Redshift Serverless** |
| **Integration** | S3, DynamoDB, DMS, Kinesis, EMR |

### Redshift Features

| Feature | Detail |
|---------|--------|
| **Redshift Spectrum** | Query data in **S3** without loading it into Redshift (serverless) |
| **Concurrency Scaling** | Auto-adds cluster capacity for concurrent queries |
| **Materialized Views** | Pre-computed query results for faster analytics |
| **Redshift Serverless** | No infrastructure management — pay for compute per RPU-hour |
| **Snapshots** | Automated or manual. Can copy to another Region for DR. |
| **Enhanced VPC Routing** | All COPY/UNLOAD traffic goes through VPC (not internet) |

### Redshift vs RDS vs DynamoDB

| Feature | Redshift | RDS | DynamoDB |
|---------|----------|-----|----------|
| **Type** | OLAP (analytics) | OLTP (transactions) | NoSQL (key-value) |
| **Query** | Complex analytical SQL | Transactional SQL | Simple get/put by key |
| **Data model** | Columnar, star/snowflake schema | Relational (normalized) | Key-value / document |
| **Scale** | Cluster-based | Vertical + read replicas | Horizontal (auto) |
| **Use case** | Reporting, BI, data warehouse | Web apps, ERP, CRM | Real-time apps, gaming |

---

## Specialty Databases

### Amazon DocumentDB

- **MongoDB-compatible** document database
- Fully managed, HA (3 AZ replication)
- Storage auto-scales up to 64 TB
- Use case: Migrate MongoDB workloads to AWS

### Amazon Neptune

- Fully managed **graph database**
- Use case: Social networks, knowledge graphs, fraud detection, recommendation engines
- Supports: Apache TinkerPop Gremlin, SPARQL (RDF)
- HA: 6 copies across 3 AZs, read replicas

### Amazon QLDB (Quantum Ledger Database)

- **Immutable, cryptographically verifiable** transaction log
- Use case: Financial transactions, supply chain, registrations — any system of record
- Not decentralized (unlike blockchain) — centralized, owned by AWS
- **No delete** — append-only, with hash chain verification

### Amazon Keyspaces (for Apache Cassandra)

- Managed **Apache Cassandra** compatible database
- Serverless, pay-per-request
- Use case: Migrate Cassandra workloads to AWS

### Amazon Timestream

- Managed **time-series** database
- Use case: IoT sensor data, DevOps metrics, clickstream analytics
- Automatic tiering (recent data in memory, historical in cost-optimized storage)
- SQL interface, built-in analytics functions

### Amazon MemoryDB for Redis

- **Redis-compatible**, durable, in-memory database
- Unlike ElastiCache Redis, MemoryDB provides **Multi-AZ durability** with transaction log
- Use case: When you need Redis API compatibility with database-level durability
- Microsecond reads, single-digit millisecond writes

---

## Database Migration

### AWS Database Migration Service (DMS)

| Feature | Detail |
|---------|--------|
| **Purpose** | Migrate databases to AWS with minimal downtime |
| **Source/Target** | On-prem, EC2, RDS, Aurora, S3, Redshift, DynamoDB, DocumentDB |
| **Continuous replication** | CDC (Change Data Capture) for ongoing sync |
| **Replication instance** | EC2 instance that runs the migration tasks |

**Migration types:**
- **Homogeneous:** Same engine to same engine (MySQL → RDS MySQL). Direct migration.
- **Heterogeneous:** Different engines (Oracle → Aurora PostgreSQL). Requires **Schema Conversion Tool (SCT)** first.

### AWS Schema Conversion Tool (SCT)

- Converts database schema from one engine to another
- Example: Oracle stored procedures → PostgreSQL functions
- Also converts data warehouse schemas (Teradata → Redshift)

:::tip Exam pattern
"Migrate Oracle to Aurora with minimal downtime" → **DMS + SCT** (heterogeneous migration).
"Migrate MySQL to RDS MySQL" → **DMS** only (homogeneous).
"Ongoing replication from on-prem to AWS" → **DMS with CDC**.
:::

---

## Database Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Best HA for MySQL/PostgreSQL" | Aurora (6 copies, 3 AZs) |
| "Auto-scaling relational DB" | Aurora Serverless v2 |
| "Cross-Region relational DR" | Aurora Global Database |
| "Read-heavy workload" | Read Replicas (Aurora up to 15) |
| "Automatic failover, zero downtime" | Multi-AZ |
| "Serverless NoSQL, ms latency" | DynamoDB |
| "Microsecond read latency" | DynamoDB + DAX or ElastiCache |
| "Multi-Region active-active DB" | DynamoDB Global Tables |
| "Session store" | ElastiCache Redis |
| "DB auth without storing credentials" | RDS IAM Authentication |
| "Reduce DB connections from Lambda" | RDS Proxy |
| "Data warehouse, OLAP" | Redshift |
| "Query S3 data with SQL (warehouse)" | Redshift Spectrum |
| "MongoDB compatible" | DocumentDB |
| "Graph database" | Neptune |
| "Immutable ledger" | QLDB |
| "Cassandra compatible" | Keyspaces |
| "Time-series data" | Timestream |
| "Migrate Oracle to PostgreSQL" | DMS + SCT |
| "Redis with database durability" | MemoryDB for Redis |
