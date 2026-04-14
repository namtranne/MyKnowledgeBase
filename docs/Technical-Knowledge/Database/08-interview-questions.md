---
sidebar_position: 9
title: "08 — Common Interview Questions"
---

# 🎯 Common Interview Questions

This chapter consolidates the most frequently asked database interview questions for senior software engineers. It covers system design (database schemas), SQL coding challenges, conceptual deep dives, scenario-based debugging, and estimation questions.

---

## 🏗️ System Design — Database Questions

### Design 1: URL Shortener Database

**Requirements:** Shorten URLs (like bit.ly), redirect with low latency, track click analytics.

#### Schema Design

```sql
CREATE TABLE urls (
    id           BIGINT PRIMARY KEY,
    short_code   VARCHAR(7) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id      BIGINT,
    created_at   TIMESTAMP DEFAULT NOW(),
    expires_at   TIMESTAMP,
    click_count  BIGINT DEFAULT 0
);

CREATE INDEX idx_short_code ON urls (short_code);

CREATE TABLE clicks (
    id         BIGINT PRIMARY KEY,
    url_id     BIGINT NOT NULL REFERENCES urls(id),
    clicked_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer   TEXT,
    country    VARCHAR(2)
) PARTITION BY RANGE (clicked_at);
```

#### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Short code generation** | Base62 encoding of auto-increment ID | Unique, short, no collision |
| **Primary lookup** | `short_code` index | O(log N) lookup for redirect |
| **Click tracking** | Separate `clicks` table, partitioned by date | Append-heavy, time-series data |
| **Click counting** | Redis counter + periodic DB sync | Avoid write contention on `urls` table |
| **Caching** | Redis cache for short_code → URL mapping | 80/20 rule: hot URLs served from cache |
| **Scaling** | Shard by `short_code` hash | Even distribution |

#### Read/Write Flow

```
Write (shorten):
  1. Generate unique short code (counter service or hash)
  2. INSERT into urls table
  3. Warm cache: SET short_code → original_url

Read (redirect):
  1. GET short_code from Redis cache
  2. Cache hit → 301/302 redirect
  3. Cache miss → query DB → populate cache → redirect
  4. Async: increment click counter in Redis
  5. Background: batch-write clicks to analytics DB
```

---

### Design 2: Twitter Timeline Database

**Requirements:** Users post tweets, follow others, see a chronological feed.

#### Schema Design

```sql
CREATE TABLE users (
    id         BIGINT PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tweets (
    id         BIGINT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    content    VARCHAR(280) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    reply_to   BIGINT REFERENCES tweets(id),
    retweet_of BIGINT REFERENCES tweets(id)
);
CREATE INDEX idx_tweets_user_time ON tweets (user_id, created_at DESC);

CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),
    followee_id BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_followee ON follows (followee_id);
```

#### Fan-Out Strategies

| Strategy | How It Works | Best For |
|----------|-------------|----------|
| **Fan-out on read** | When user opens timeline, query all followees' tweets and merge | Users who follow many people, celebrities posting |
| **Fan-out on write** | When a user tweets, pre-write to all followers' timeline cache | Regular users (< 1000 followers) |
| **Hybrid** | Fan-out on write for regular users; fan-out on read for celebrities | Twitter's actual approach |

```
Fan-out on write:
  User A tweets → For each follower F:
    LPUSH timeline:F tweet_id
    LTRIM timeline:F 0 799   (keep last 800 tweets)

Fan-out on read:
  User opens timeline → 
    SELECT followee_id FROM follows WHERE follower_id = user_id
    For each followee: SELECT * FROM tweets WHERE user_id = followee_id
    Merge-sort by created_at
```

:::tip Celebrity Problem
A user with 10M followers posting once means 10M writes (fan-out on write). Instead, fetch celebrity tweets on read and merge with the pre-computed timeline. This is the **hybrid** approach.
:::

---

### Design 3: Chat System Database

**Requirements:** 1:1 and group messaging, message ordering, read receipts.

#### Schema Design

```sql
CREATE TABLE conversations (
    id         BIGINT PRIMARY KEY,
    type       VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
    name       VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_members (
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    joined_at       TIMESTAMP DEFAULT NOW(),
    last_read_at    TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_member_user ON conversation_members (user_id, conversation_id);

CREATE TABLE messages (
    id              BIGINT PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    sender_id       BIGINT NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    message_type    VARCHAR(10) DEFAULT 'text'
);
CREATE INDEX idx_messages_conv_time ON messages (conversation_id, created_at DESC);
```

#### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Message ordering** | Snowflake IDs (timestamp + worker + sequence) | Globally ordered, no coordination needed |
| **Sharding key** | `conversation_id` | All messages in a conversation on the same shard |
| **Read receipts** | `last_read_at` on `conversation_members` | O(1) unread count: `WHERE created_at > last_read_at` |
| **Real-time delivery** | WebSocket + Redis Pub/Sub | Push messages instantly; fall back to polling |
| **Message storage** | Cassandra or PostgreSQL with partitioning | Time-series write pattern, range scans for history |

---

## 💻 SQL Coding Challenges

### Challenge 1: Second Highest Salary (Without Window Functions)

```sql
SELECT MAX(salary) AS second_highest_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```

### Challenge 2: Nth Highest Salary (Generic)

```sql
CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT
BEGIN
    RETURN (
        SELECT DISTINCT salary
        FROM (
            SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
            FROM employees
        ) ranked
        WHERE rnk = N
    );
END;
```

### Challenge 3: Department Top 3 Salaries

```sql
WITH ranked AS (
    SELECT
        d.dept_name,
        e.name,
        e.salary,
        DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
    FROM employees e
    JOIN departments d ON e.dept_id = d.dept_id
)
SELECT dept_name, name, salary
FROM ranked
WHERE rnk <= 3;
```

### Challenge 4: Consecutive Numbers (at least 3 in a row)

```sql
SELECT DISTINCT l1.num AS ConsecutiveNums
FROM logs l1
JOIN logs l2 ON l1.id = l2.id - 1
JOIN logs l3 ON l2.id = l3.id - 1
WHERE l1.num = l2.num AND l2.num = l3.num;

-- Or with window functions:
WITH groups AS (
    SELECT num, id,
           id - ROW_NUMBER() OVER (PARTITION BY num ORDER BY id) AS grp
    FROM logs
)
SELECT DISTINCT num AS ConsecutiveNums
FROM groups
GROUP BY num, grp
HAVING COUNT(*) >= 3;
```

### Challenge 5: Customers Who Never Order

```sql
SELECT c.name AS Customers
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;

-- Or with NOT EXISTS:
SELECT name AS Customers
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

### Challenge 6: Rising Temperature (compare with previous day)

```sql
SELECT w.id
FROM weather w
JOIN weather y ON w.recordDate = y.recordDate + INTERVAL '1 day'
WHERE w.temperature > y.temperature;

-- Or with LAG:
WITH prev AS (
    SELECT id, recordDate, temperature,
           LAG(temperature) OVER (ORDER BY recordDate) AS prev_temp
    FROM weather
)
SELECT id FROM prev WHERE temperature > prev_temp;
```

### Challenge 7: Pivot Table — Monthly Revenue

```sql
SELECT
    product,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 1 THEN revenue ELSE 0 END) AS Jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 2 THEN revenue ELSE 0 END) AS Feb,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 3 THEN revenue ELSE 0 END) AS Mar
    -- ... remaining months
FROM sales
WHERE EXTRACT(YEAR FROM sale_date) = 2024
GROUP BY product;
```

### Challenge 8: Median Salary

```sql
WITH ordered AS (
    SELECT salary,
           ROW_NUMBER() OVER (ORDER BY salary) AS rn,
           COUNT(*) OVER () AS total
    FROM employees
)
SELECT AVG(salary) AS median_salary
FROM ordered
WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0));
```

---

## 🧠 Conceptual Questions with Detailed Answers

### Q1: "Explain ACID properties. Give a real-world example for each."

| Property | Explanation | Real-World Example |
|----------|-------------|--------------------|
| **Atomicity** | All operations in a transaction succeed or all are rolled back | Bank transfer: debit + credit — if credit fails, debit is undone |
| **Consistency** | Transaction brings DB from one valid state to another | Account balance cannot go negative (CHECK constraint) |
| **Isolation** | Concurrent transactions don't see each other's intermediate states | Two users booking the last flight seat simultaneously |
| **Durability** | Once committed, data persists through crashes | Power failure after COMMIT — data is still there when system restarts |

**Implementation mechanisms:** WAL (durability), undo log (atomicity), lock manager / MVCC (isolation), constraint enforcement (consistency).

### Q2: "When would you denormalize a database?"

1. **Read-heavy workloads** where JOINs are the bottleneck (proved by profiling)
2. **Reporting/analytics** that require pre-computed aggregates
3. **Distributed systems** where cross-shard JOINs are expensive or impossible
4. **Caching hot paths** — store computed values to avoid repeated calculation
5. **Time-series data** — embed related data for write-optimized storage

**Always after:** profiling proves the JOIN is the bottleneck. Never as a premature optimization.

### Q3: "How does an index work? When would you NOT create one?"

An index is a **B+Tree** (usually) that maps sorted key values to row locations. The database traverses the tree (3-4 levels for millions of rows) instead of scanning every row.

**Don't create an index when:**
- Column has low cardinality (boolean, 2-3 values)
- Table is small (< 1000 rows)
- Column is rarely in WHERE/JOIN/ORDER BY
- Table is write-heavy and the column is frequently updated
- Too many indexes already exist (diminishing returns)

### Q4: "Explain the four isolation levels. Which would you use for a banking application?"

See [Chapter 03](./03-transactions-concurrency.md#isolation-levels) for the full comparison.

For banking: **Serializable** — financial correctness is paramount. Lost updates or phantom reads could cause incorrect balances. The throughput cost is acceptable because financial transactions are relatively low-volume compared to social media.

### Q5: "What's the difference between optimistic and pessimistic locking?"

| Aspect | Optimistic | Pessimistic |
|--------|-----------|-------------|
| **Assumption** | Conflicts are rare | Conflicts are common |
| **Mechanism** | Version column; check at commit | SELECT ... FOR UPDATE; hold lock |
| **On conflict** | Retry the transaction | Wait for lock release |
| **Throughput** | Higher when conflicts rare | Higher when conflicts common |
| **Use case** | Read-heavy apps, low contention | Write-heavy, high contention (booking systems) |

---

## 🔧 Scenario-Based Questions

### Scenario 1: "Your query is slow. How do you debug it?"

**Step-by-step framework:**

```
1. REPRODUCE
   - Is it consistently slow, or intermittent?
   - What's the execution time? What's acceptable?

2. EXPLAIN ANALYZE
   - Run EXPLAIN ANALYZE on the query
   - Look for: Seq Scan, high row counts, Sort, Hash Join

3. CHECK INDEXES
   - Is there a matching index for the WHERE clause?
   - Is the index being used? (check for SARGability violations)
   - Is the index selective enough?

4. CHECK STATISTICS
   - Are table statistics up to date? Run ANALYZE.
   - Is the row estimate wildly off from actual?

5. CHECK FOR ANTI-PATTERNS
   - SELECT * → select only needed columns
   - N+1 queries → use JOIN
   - OFFSET pagination → use keyset pagination
   - Functions on indexed columns → rewrite as range predicate

6. CHECK INFRASTRUCTURE
   - Buffer pool hit ratio (should be > 99%)
   - Disk I/O saturation
   - Lock contention (pg_stat_activity, SHOW PROCESSLIST)
   - Connection pool exhaustion

7. OPTIMIZE
   - Add/modify indexes
   - Rewrite query (CTEs, materialized views)
   - Denormalize if JOIN is the bottleneck
   - Partition large tables
   - Add caching layer
```

### Scenario 2: "How do you handle database failover?"

```
Primary fails:
  1. DETECTION: Health checks detect primary is unresponsive
     - Heartbeat timeout (typically 10-30 seconds)
     - Connection failures from application

  2. ELECTION: Promote a replica to primary
     - Automatic: Orchestrator (MySQL), Patroni (PostgreSQL), Always On (SQL Server)
     - Manual: DBA intervention

  3. RECONNECTION: Applications connect to new primary
     - DNS update / VIP (Virtual IP) switch
     - Connection pool reconfiguration
     - Proxy layer (ProxySQL, PgBouncer) routes to new primary

  4. RECOVERY: Bring old primary back as replica
     - Rebuild from new primary's WAL
     - Rejoin replication chain
```

**Key considerations:**
- **Data loss:** Async replication may lose uncommitted transactions
- **Split brain:** Two nodes think they're primary → use fencing (STONITH)
- **Failover time:** Automated failover: 10-30s; manual: minutes to hours

### Scenario 3: "How do you migrate a large table with zero downtime?"

**The Expand-Contract pattern:**

```
Phase 1: EXPAND (add new structure alongside old)
  - Add new column(s) or create new table
  - Deploy code that writes to BOTH old and new
  - Backfill new column/table from old data

Phase 2: MIGRATE (transition reads)
  - Verify new data is correct (checksums, audits)
  - Switch reads to new column/table
  - Monitor for issues

Phase 3: CONTRACT (remove old structure)
  - Stop writing to old column/table
  - Drop old column/table (after validation period)
```

**Example — rename a column from `name` to `full_name`:**

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Phase 1: Backfill (batched to avoid lock contention)
UPDATE users SET full_name = name WHERE id BETWEEN 1 AND 10000;
UPDATE users SET full_name = name WHERE id BETWEEN 10001 AND 20000;
-- ... continue in batches

-- Phase 1: Deploy code that writes to BOTH columns
-- INSERT INTO users (name, full_name, ...) VALUES (?, ?, ...);

-- Phase 2: Switch reads to full_name
-- SELECT full_name FROM users ...

-- Phase 3: Drop old column (after validation)
ALTER TABLE users DROP COLUMN name;
```

:::warning Tools for Large Migrations
For very large tables, use online schema change tools:
- **pt-online-schema-change** (Percona, MySQL)
- **gh-ost** (GitHub, MySQL)
- **pgroll** (PostgreSQL)
These create a shadow table, copy data in batches, and swap atomically.
:::

### Scenario 4: "Your database is running out of disk space. What do you do?"

**Immediate actions:**
1. Identify what's consuming space (`pg_size_pretty`, `information_schema`)
2. Clean up: delete old data, truncate unused tables
3. VACUUM FULL (PostgreSQL) or OPTIMIZE TABLE (MySQL) to reclaim space
4. Archive old data to cold storage (S3, data lake)

**Long-term solutions:**
1. Implement data retention policies (auto-delete after N days)
2. Partition tables by date; drop old partitions
3. Compress data (column compression, table compression)
4. Move to larger storage or add shards
5. Consider tiered storage (hot/warm/cold)

### Scenario 5: "Two microservices need to update data in different databases atomically."

**Options:**

| Approach | Consistency | Complexity | Best For |
|----------|:-----------:|:----------:|----------|
| **2PC (XA)** | Strong | High | Same database vendor, tight coupling |
| **Saga (orchestrated)** | Eventual | Medium | Multi-service transactions |
| **Saga (choreographed)** | Eventual | Medium | Loosely coupled services |
| **Outbox pattern** | Eventual | Medium | Event-driven architectures |
| **CDC (Debezium)** | Eventual | Low (infra) | Database → event stream |

**Recommended: Outbox pattern**

```
Service A:
  BEGIN;
    UPDATE orders SET status = 'confirmed';
    INSERT INTO outbox (event_type, payload) VALUES ('OrderConfirmed', '{...}');
  COMMIT;

Message relay (CDC or polling):
  Read outbox → publish to Kafka → delete from outbox

Service B:
  Consume 'OrderConfirmed' event → update inventory
```

---

## 📏 Estimation Questions

### How much storage for 1 billion URLs?

```
Assumptions:
  - Average URL length: 100 bytes
  - Short code: 7 bytes
  - Metadata (timestamps, user_id, counters): 50 bytes
  - Row overhead: 20 bytes

Per row: 100 + 7 + 50 + 20 = ~177 bytes ≈ 200 bytes

1 billion URLs × 200 bytes = 200 GB

With indexes (estimate 2x):
  200 GB × 2 = 400 GB

With replication (3 replicas):
  400 GB × 3 = 1.2 TB total storage
```

### How much storage for a chat system with 100M users?

```
Assumptions:
  - 100M users, 50% DAU = 50M daily active
  - Each active user sends 20 messages/day
  - Average message size: 200 bytes (including metadata)

Daily messages: 50M × 20 = 1 billion messages/day
Daily storage: 1B × 200 bytes = 200 GB/day

Yearly: 200 GB × 365 = 73 TB/year (raw)

With indexes + overhead (2x): ~146 TB/year
With 3x replication: ~438 TB/year

Write throughput:
  1B messages / 86,400 seconds ≈ 11,574 writes/second (average)
  Peak (10x average): ~115K writes/second
```

### How much storage for Twitter's tweet database?

```
Assumptions:
  - 500M tweets/day (including retweets)
  - Average tweet: 280 chars = 280 bytes text
  - Metadata (user_id, timestamps, counters, reply_to): 100 bytes
  - Media references (URL to image/video): 100 bytes

Per tweet: 280 + 100 + 100 = ~480 bytes ≈ 500 bytes

Daily: 500M × 500 bytes = 250 GB/day
Yearly: 250 GB × 365 = ~91 TB/year (raw data only)

Timeline cache (Redis):
  - 500M DAU × 800 tweet IDs in timeline × 8 bytes/ID
  = 3.2 TB of RAM for timeline caches
```

---

## 📋 Quick-Fire Conceptual Questions

| Question | Key Points |
|----------|------------|
| "What is a primary key vs. unique key?" | PK: uniquely identifies rows, NOT NULL, one per table, clustered index (InnoDB). Unique: enforces uniqueness, allows one NULL, multiple per table, non-clustered. |
| "What is a foreign key?" | A constraint that ensures referential integrity — the value must exist in the referenced table's primary key. Prevents orphan records. |
| "DELETE vs. TRUNCATE vs. DROP?" | DELETE: row-by-row removal, logged, WHERE clause, triggers fire. TRUNCATE: removes all rows, minimal logging, resets auto-increment. DROP: removes the entire table structure. |
| "What is a view? What is a materialized view?" | View: virtual table (stored query, no data). Materialized view: cached result set (stored data, must be refreshed). |
| "Clustered vs. non-clustered index?" | Clustered: rows physically sorted by index key, one per table. Non-clustered: separate structure with pointers to rows, many per table. |
| "What is database sharding?" | Splitting a table across multiple servers (shards). Each shard holds a subset of the data. Partition key determines which shard. |
| "What is connection pooling?" | Maintaining a pool of reusable database connections to avoid the overhead of creating/destroying connections per request. Tools: HikariCP, PgBouncer. |
| "What is a deadlock?" | Two transactions each waiting for the other's lock. Resolved by the DB aborting one transaction (the victim). Prevented by consistent lock ordering. |
| "Horizontal vs. vertical scaling?" | Vertical: bigger machine (more CPU/RAM). Horizontal: more machines (sharding, replication). Vertical has limits; horizontal is how big systems scale. |
| "What is CAP theorem?" | Distributed systems can guarantee at most 2 of 3: Consistency, Availability, Partition tolerance. Since P is inevitable, choose CP or AP. |

---

## 🗺️ Interview Preparation Checklist

- [ ] Can explain ACID with examples and implementation details
- [ ] Can write complex SQL: JOINs, window functions, CTEs, recursive queries
- [ ] Can solve classic SQL problems (Nth salary, duplicates, gaps and islands)
- [ ] Can explain B-Tree/B+Tree with a diagram
- [ ] Can read and interpret EXPLAIN plans
- [ ] Can describe all 4 isolation levels with anomaly examples
- [ ] Can explain MVCC (both PostgreSQL and MySQL implementations)
- [ ] Can compare B-Tree vs. LSM-Tree storage engines
- [ ] Can explain WAL and crash recovery
- [ ] Can design a sharding strategy for a given system
- [ ] Can explain consistent hashing with virtual nodes
- [ ] Can explain CAP and PACELC theorems
- [ ] Can compare SQL vs. NoSQL with specific use cases
- [ ] Can implement an LRU cache from scratch
- [ ] Can describe Redis data structures and persistence modes
- [ ] Can solve cache stampede problems
- [ ] Can design database schemas for system design questions
- [ ] Can estimate storage requirements for large-scale systems
- [ ] Can explain zero-downtime migration strategies
- [ ] Can debug slow query scenarios step by step

---

## 🔗 All Chapters

| Chapter | Title |
|:-------:|-------|
| [01](./01-relational-fundamentals.md) | Relational Fundamentals |
| [02](./02-indexing-query-optimization.md) | Indexing & Query Optimization |
| [03](./03-transactions-concurrency.md) | Transactions & Concurrency Control |
| [04](./04-storage-engines.md) | Storage Engines & Data Structures |
| [05](./05-replication-partitioning.md) | Replication & Partitioning |
| [06](./06-nosql-databases.md) | NoSQL & Distributed Databases |
| [07](./07-caching-strategies.md) | Caching Strategies |
| [08](./08-interview-questions.md) | Common Interview Questions |
