---
sidebar_position: 4
title: "03 — Transactions & Concurrency Control"
---

# 🔒 Transactions & Concurrency Control

Concurrency control is where databases earn their complexity. Understanding isolation levels, locking, and MVCC at a deep level is essential for senior interviews — especially scenario-based questions.

---

## 🔄 Transaction Lifecycle

```
   BEGIN ──────► Execute SQL statements ──────► COMMIT
     │                    │                       │
     │                    │ (error)                │
     │                    ▼                        │
     │              ROLLBACK ◄─────────────────────┘
     │                                      (on failure)
     ▼
  SAVEPOINT ──► partial rollback ──► ROLLBACK TO SAVEPOINT
```

```sql
BEGIN;
  INSERT INTO orders (customer_id, total) VALUES (42, 99.99);
  SAVEPOINT sp1;
    INSERT INTO order_items (order_id, product_id) VALUES (1001, 55);
    -- Oops, wrong product
  ROLLBACK TO SAVEPOINT sp1;
    INSERT INTO order_items (order_id, product_id) VALUES (1001, 77);
COMMIT;
```

### Transaction States

| State | Description |
|-------|-------------|
| **Active** | Transaction is executing statements |
| **Partially committed** | Final statement executed, awaiting commit |
| **Committed** | Changes are permanent (WAL flushed to disk) |
| **Failed** | An error occurred, transaction must be rolled back |
| **Aborted** | Rollback completed, all changes undone |

---

## ⚛️ ACID Deep Dive

### Atomicity — Implementation

Databases use an **undo log** (rollback segment) to reverse partial changes:

```
Transaction T1:
  1. Write undo record: "row 42 had balance = 1000"
  2. Update row 42: balance = 500
  3. Write undo record: "row 99 had balance = 2000"
  4. Update row 99: balance = 2500
  5. COMMIT → discard undo records

If crash between step 2 and 4:
  → Recovery reads undo log → restores row 42 balance to 1000
```

### Durability — Write-Ahead Log (WAL)

```
Application                 Database
    │                          │
    │  INSERT ...              │
    │ ─────────────────────►   │
    │                     ┌────┴────┐
    │                     │ 1. Write│──► WAL on disk (sequential)
    │                     │    WAL  │
    │                     ├─────────┤
    │                     │ 2. Update│──► Buffer pool (memory)
    │                     │    page │
    │                     ├─────────┤
    │                     │ 3. ACK  │
    │  ◄──────────────────┤  COMMIT │
    │                     └─────────┘
    │                          │
    │         ... later ...    │
    │                     ┌────┴────┐
    │                     │Checkpoint│──► Flush dirty pages to disk
    │                     └─────────┘
```

The key insight: WAL writes are **sequential** (fast), while data page writes are **random** (slow). By writing WAL first, we guarantee durability without waiting for random I/O.

---

## 🎭 Concurrency Problems

### Overview Table

| Problem | Description | Example |
|---------|-------------|---------|
| **Dirty Read** | Reading uncommitted data from another transaction | T1 updates a row, T2 reads it, T1 rolls back — T2 has stale data |
| **Non-Repeatable Read** | Same query returns different values in the same transaction | T1 reads row, T2 updates it and commits, T1 reads again — different value |
| **Phantom Read** | Same range query returns different rows | T1 counts rows WHERE age > 30, T2 inserts a new row with age 35, T1 counts again — different count |
| **Lost Update** | Two transactions read the same value and both write — one update is lost | T1 reads balance=100, T2 reads balance=100, T1 writes 150, T2 writes 120 → T1's update lost |
| **Write Skew** | Two transactions read overlapping data and make writes based on stale reads | Two doctors check "at least 1 on call", both see 2, both go off call → 0 on call |

### Dirty Read Example

```
T1:                                T2:
BEGIN;
UPDATE accounts
  SET balance = 500                
  WHERE id = 1;
                                   BEGIN;
                                   SELECT balance FROM accounts
                                     WHERE id = 1;
                                   -- reads 500 (uncommitted!)
ROLLBACK;
-- balance is back to 1000
                                   -- T2 used 500, but real value is 1000
                                   -- → DIRTY READ
```

### Non-Repeatable Read Example

```
T1:                                T2:
BEGIN;
SELECT balance FROM accounts
  WHERE id = 1;
-- reads 1000
                                   BEGIN;
                                   UPDATE accounts
                                     SET balance = 500
                                     WHERE id = 1;
                                   COMMIT;
SELECT balance FROM accounts
  WHERE id = 1;
-- reads 500 ← different value!
-- → NON-REPEATABLE READ
```

### Phantom Read Example

```
T1:                                T2:
BEGIN;
SELECT COUNT(*) FROM employees
  WHERE dept = 'Eng';
-- returns 10
                                   BEGIN;
                                   INSERT INTO employees
                                     (name, dept) VALUES ('Eve', 'Eng');
                                   COMMIT;
SELECT COUNT(*) FROM employees
  WHERE dept = 'Eng';
-- returns 11 ← new phantom row!
-- → PHANTOM READ
```

### Write Skew Example

```
T1 (Doctor Alice):                 T2 (Doctor Bob):
BEGIN;                             BEGIN;
SELECT COUNT(*) FROM on_call       SELECT COUNT(*) FROM on_call
  WHERE shift = 'night';             WHERE shift = 'night';
-- returns 2 (Alice, Bob)          -- returns 2 (Alice, Bob)

-- "2 > 1, safe to leave"         -- "2 > 1, safe to leave"
DELETE FROM on_call                DELETE FROM on_call
  WHERE doctor = 'Alice';           WHERE doctor = 'Bob';
COMMIT;                            COMMIT;

-- Result: 0 doctors on call! Neither transaction saw the other's write.
-- → WRITE SKEW
```

---

## 🎚️ Isolation Levels {#isolation-levels}

### Isolation Level vs. Anomaly Matrix

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Lost Update | Write Skew |
|:---------------:|:----------:|:-------------------:|:------------:|:-----------:|:----------:|
| **Read Uncommitted** | ⚠️ Possible | ⚠️ Possible | ⚠️ Possible | ⚠️ Possible | ⚠️ Possible |
| **Read Committed** | ✅ Prevented | ⚠️ Possible | ⚠️ Possible | ⚠️ Possible | ⚠️ Possible |
| **Repeatable Read** | ✅ Prevented | ✅ Prevented | ⚠️ Possible* | ✅ Prevented | ⚠️ Possible |
| **Serializable** | ✅ Prevented | ✅ Prevented | ✅ Prevented | ✅ Prevented | ✅ Prevented |

*In PostgreSQL, Repeatable Read also prevents phantom reads (uses snapshot isolation). In MySQL InnoDB, phantom reads are possible but mitigated by gap locks.

### Read Uncommitted

- Transactions can see **uncommitted** changes from other transactions.
- Almost never used in practice (no real benefit over Read Committed).

```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

### Read Committed (Default in PostgreSQL, Oracle)

- Each statement sees only data **committed before that statement** began.
- Different statements within the same transaction may see different snapshots.

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
  SELECT balance FROM accounts WHERE id = 1; -- sees committed data at this moment
  -- another transaction commits a change
  SELECT balance FROM accounts WHERE id = 1; -- may see different value
COMMIT;
```

### Repeatable Read (Default in MySQL InnoDB)

- The transaction sees a **consistent snapshot** taken at the start of the transaction.
- All reads within the transaction return the same data, even if other transactions commit.

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
  SELECT balance FROM accounts WHERE id = 1; -- snapshot taken here
  -- another transaction commits a change
  SELECT balance FROM accounts WHERE id = 1; -- same result as before
COMMIT;
```

### Serializable

- Transactions execute as if they were **serial** (one after another).
- Guarantees no concurrency anomalies, but lowest throughput.

Implementation varies:
- **PostgreSQL:** Serializable Snapshot Isolation (SSI) — optimistic, detects conflicts at commit
- **MySQL InnoDB:** Gap locks + next-key locks — pessimistic, prevents phantom inserts

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

:::tip Interview Question: "Which isolation level would you use?"
The answer depends on the use case:
- **Read Committed:** Good default for most OLTP apps (PostgreSQL default)
- **Repeatable Read:** When you need consistent reads within a transaction (MySQL default)
- **Serializable:** Financial transactions, inventory management — where correctness is critical
- **Read Uncommitted:** Almost never — maybe analytics on approximate data

Always explain the **trade-off**: higher isolation = lower throughput.
:::

---

## 🔐 Locking Mechanisms

### Lock Types

| Lock Type | Abbreviation | Purpose | Compatible With |
|-----------|:------------:|---------|:---------------:|
| **Shared (S)** | S | Read access — multiple readers allowed | S, IS |
| **Exclusive (X)** | X | Write access — exclusive ownership | Nothing |
| **Intent Shared (IS)** | IS | Signals intent to acquire S lock on a child resource | IS, IX, S |
| **Intent Exclusive (IX)** | IX | Signals intent to acquire X lock on a child resource | IS, IX |

### Lock Compatibility Matrix

| | IS | IX | S | X |
|:-:|:-:|:-:|:-:|:-:|
| **IS** | ✅ | ✅ | ✅ | ❌ |
| **IX** | ✅ | ✅ | ❌ | ❌ |
| **S** | ✅ | ❌ | ✅ | ❌ |
| **X** | ❌ | ❌ | ❌ | ❌ |

### Lock Granularity

```
Database Level        ←── Coarsest (most blocking, least overhead)
    │
    ▼
Table Level (LOCK TABLE)
    │
    ▼
Page Level
    │
    ▼
Row Level             ←── Finest (least blocking, most overhead)
```

:::info InnoDB Locking
InnoDB uses **row-level locking** with **next-key locks** (combination of record lock + gap lock) at Repeatable Read to prevent phantom reads:
- **Record lock:** Lock on a specific index record
- **Gap lock:** Lock on the gap between two index records (prevents inserts)
- **Next-key lock:** Record lock + gap lock on the gap before the record
:::

---

## 🔄 Two-Phase Locking (2PL)

The standard protocol to guarantee **serializability**.

### Two Phases

```
         Growing Phase              Shrinking Phase
      ┌──────────────────┐     ┌──────────────────┐
      │  Acquire locks   │     │  Release locks    │
      │  (no releases)   │     │  (no acquires)    │
      └──────────────────┘     └──────────────────┘
                          ▲
                    Lock point
              (all locks acquired)
```

| Variant | Description | Risk |
|---------|-------------|------|
| **Basic 2PL** | Release locks during shrinking phase | Cascading aborts |
| **Strict 2PL** | Hold all X locks until COMMIT/ROLLBACK | No cascading aborts, but reduces concurrency |
| **Rigorous 2PL** | Hold ALL locks until COMMIT/ROLLBACK | Strictest — used by most databases |

---

## 🔀 MVCC (Multi-Version Concurrency Control)

MVCC is the dominant concurrency control mechanism in modern databases. Instead of blocking readers with locks, it maintains **multiple versions** of each row.

### Core Idea

> **Readers never block writers. Writers never block readers.**

Each transaction sees a **consistent snapshot** of the database. Old row versions are kept so that concurrent transactions can read the version that was current when their transaction started.

### PostgreSQL MVCC

PostgreSQL stores row versions **in the same table** (heap).

```
Row version for id=1:

┌──────────┬──────────┬────────┬──────────────────┐
│  xmin    │  xmax    │  data  │  meaning         │
├──────────┼──────────┼────────┼──────────────────┤
│  100     │  0       │ v1     │ Created by tx 100│
│  100     │  200     │ v1     │ Deleted/updated  │
│  200     │  0       │ v2     │ Created by tx 200│
└──────────┴──────────┴────────┴──────────────────┘

xmin = transaction that created this version
xmax = transaction that deleted/replaced this version (0 = current)
```

**Visibility rules:** A row version is visible to transaction T if:
- `xmin` is committed AND `xmin < T's snapshot`
- `xmax` is 0 (not deleted) OR `xmax` is not committed OR `xmax > T's snapshot`

**VACUUM:** Since old versions accumulate in the heap, PostgreSQL runs `VACUUM` to reclaim space from dead tuples.

### MySQL InnoDB MVCC

InnoDB stores the **current version** in the clustered index and keeps old versions in the **undo log** (rollback segment).

```
Clustered Index (B+Tree):
┌──────┬────────┬──────────┬──────────────┐
│  PK  │  data  │  trx_id  │  roll_ptr    │
│  1   │  v3    │  300     │  ──► undo    │
└──────┴────────┴──────────┴──────┬───────┘
                                   │
Undo Log:                          ▼
┌──────────────────────────────────────────┐
│  trx_id=200, data=v2, prev_ptr ──► ...  │
│  trx_id=100, data=v1, prev_ptr = NULL   │
└──────────────────────────────────────────┘
```

**Read views:** At the start of a transaction (or statement, depending on isolation level), InnoDB creates a **read view** containing the list of active transaction IDs. A row version is visible if its `trx_id` is not in the active list and is less than the view's upper bound.

### PostgreSQL vs. MySQL MVCC Comparison

| Aspect | PostgreSQL | MySQL InnoDB |
|--------|-----------|-------------|
| **Old versions stored in** | Same heap table | Undo log (separate space) |
| **Cleanup mechanism** | VACUUM (background process) | Purge thread (undo log) |
| **Bloat risk** | Table bloat if VACUUM is delayed | Undo log growth |
| **Index maintenance** | Indexes point to all versions | Indexes point to current version only |
| **Read performance** | May read dead tuples | Clean reads from clustered index |
| **Write amplification** | Higher (write full tuple to heap) | Lower (undo is differential) |

---

## ⚖️ Optimistic vs. Pessimistic Concurrency

| Aspect | Optimistic | Pessimistic |
|--------|-----------|-------------|
| **Approach** | Assume no conflicts; validate at commit | Acquire locks before accessing data |
| **Lock duration** | No locks during execution | Hold locks throughout transaction |
| **Conflict handling** | Abort and retry on conflict | Block and wait for lock |
| **Best for** | Low contention, read-heavy | High contention, write-heavy |
| **Throughput** | Higher when conflicts are rare | Higher when conflicts are common |
| **Implementation** | Version columns, timestamps, SSI | Row locks, 2PL |

### Optimistic Concurrency in Practice

```sql
-- Application-level optimistic locking with version column
-- Step 1: Read with version
SELECT id, balance, version FROM accounts WHERE id = 1;
-- Returns: id=1, balance=1000, version=5

-- Step 2: Update with version check
UPDATE accounts
SET balance = 900, version = 6
WHERE id = 1 AND version = 5;

-- If another transaction updated first (version is now 6),
-- this UPDATE affects 0 rows → application retries
```

---

## 💀 Deadlocks

A **deadlock** occurs when two or more transactions are each waiting for the other to release a lock.

### Deadlock Example

```
T1:                                T2:
BEGIN;                             BEGIN;
UPDATE accounts SET balance = 100  
  WHERE id = 1;                    UPDATE accounts SET balance = 200
-- holds X lock on row 1             WHERE id = 2;
                                   -- holds X lock on row 2

UPDATE accounts SET balance = 300  
  WHERE id = 2;                    UPDATE accounts SET balance = 400
-- waits for T2's lock on row 2      WHERE id = 1;
                                   -- waits for T1's lock on row 1

-- DEADLOCK! Both waiting for each other
```

### Detection and Prevention

| Strategy | How It Works |
|----------|-------------|
| **Deadlock detection** | Database maintains a wait-for graph; if a cycle is detected, one transaction is aborted (the "victim") |
| **Lock timeout** | Transaction aborts if it can't acquire a lock within a timeout period |
| **Lock ordering** | Application always acquires locks in a consistent order (e.g., by primary key ascending) |
| **Reduce lock scope** | Use shorter transactions, access fewer rows |
| **Optimistic concurrency** | Avoid locks entirely; validate at commit |

:::warning Interview Tip
When asked "how do you prevent deadlocks?", the best answer is **consistent lock ordering**: always acquire locks in the same order (e.g., by ascending primary key). This breaks the cycle condition required for deadlocks.
:::

---

## 🌐 Distributed Transactions

### Two-Phase Commit (2PC)

```
              Coordinator
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
 Node A        Node B        Node C

Phase 1 — PREPARE:
  Coordinator → all nodes: "Can you commit?"
  Each node:
    - Acquires locks, writes to WAL
    - Responds YES (prepared) or NO (abort)

Phase 2 — COMMIT/ABORT:
  If ALL said YES → Coordinator: "COMMIT"
  If ANY said NO  → Coordinator: "ABORT"
  Each node commits/aborts and releases locks
```

| Pros | Cons |
|------|------|
| Guarantees atomicity across nodes | Blocking protocol — if coordinator dies after PREPARE, participants are stuck |
| Widely supported (XA protocol) | High latency (2 round trips minimum) |
| Simple conceptually | Coordinator is single point of failure |

### Three-Phase Commit (3PC)

Adds a **pre-commit** phase to reduce blocking, but does not fully solve the problem and is rarely used in practice.

```
Phase 1: CAN-COMMIT?  → Nodes respond YES/NO
Phase 2: PRE-COMMIT   → Nodes prepare, acknowledge
Phase 3: DO-COMMIT    → Nodes commit
```

### Saga Pattern

For **long-lived** distributed transactions, use **Sagas** — a sequence of local transactions with **compensating actions** for rollback.

```
Order Saga:
  T1: Create Order     → C1: Cancel Order
  T2: Reserve Stock    → C2: Release Stock
  T3: Charge Payment   → C3: Refund Payment
  T4: Ship Order       → C4: Cancel Shipment

Happy path:  T1 → T2 → T3 → T4  ✅
Failure at T3: T1 → T2 → T3(fail) → C2 → C1  ✅ (compensate)
```

| Orchestration | Choreography |
|:-------------:|:------------:|
| Central coordinator sends commands | Each service listens for events |
| Easier to understand and debug | No single point of failure |
| Central point of failure | Harder to trace the flow |
| Better for complex flows | Better for simple, decoupled flows |

:::info When to Use What
- **2PC:** Strong consistency needed, few participants, short-lived transactions (e.g., database-level, XA)
- **Saga:** Microservices, long-lived transactions, eventual consistency acceptable (e.g., e-commerce order flow)
- **3PC:** Rarely used in practice — Saga or consensus protocols (Raft/Paxos) are preferred
:::

---

## 🎯 Interview Scenarios

### Scenario 1: "Two users try to book the last seat on a flight simultaneously. How do you prevent double-booking?"

**Pessimistic approach:**
```sql
BEGIN;
SELECT * FROM seats WHERE flight_id = 100 AND seat_no = '12A' FOR UPDATE;
-- Acquires exclusive row lock
-- Check if available
UPDATE seats SET status = 'booked', passenger_id = 42
WHERE flight_id = 100 AND seat_no = '12A' AND status = 'available';
COMMIT;
```

**Optimistic approach:**
```sql
UPDATE seats SET status = 'booked', passenger_id = 42, version = version + 1
WHERE flight_id = 100 AND seat_no = '12A' AND status = 'available' AND version = 5;
-- If 0 rows affected → seat was taken → retry or show error
```

### Scenario 2: "How would you implement a bank transfer that's safe under concurrency?"

```sql
-- Use Serializable isolation + consistent lock ordering
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
  -- Always lock lower ID first to prevent deadlocks
  SELECT balance FROM accounts WHERE id = LEAST(1, 2) FOR UPDATE;
  SELECT balance FROM accounts WHERE id = GREATEST(1, 2) FOR UPDATE;

  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
```

### Scenario 3: "Explain why Read Committed can cause problems in a report query."

A report that executes multiple queries (e.g., total revenue, order count, average order value) under Read Committed may see **inconsistent snapshots** because each query sees the latest committed data. If orders are being inserted/modified between queries, the totals won't match.

**Solution:** Use Repeatable Read or wrap the report in a single transaction with a consistent snapshot.

---

## 🔗 Related Chapters

- **[01 — Relational Fundamentals](./01-relational-fundamentals.md)** — ACID properties overview
- **[02 — Indexing & Query Optimization](./02-indexing-query-optimization.md)** — How locking interacts with index scans
- **[04 — Storage Engines](./04-storage-engines.md)** — WAL, undo logs, buffer pool
- **[05 — Replication & Partitioning](./05-replication-partitioning.md)** — Distributed consistency
