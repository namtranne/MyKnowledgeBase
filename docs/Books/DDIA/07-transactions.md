# Chapter 7 — Transactions

Transactions are a mechanism for grouping multiple reads and writes into a single logical operation. The database guarantees that the entire transaction either **succeeds completely** or **fails completely** (is rolled back) — the application never sees a half-finished result.

Without transactions, every application would have to handle: partial failures (crash mid-update), concurrent access (two users modifying the same data), and consistency enforcement. Transactions move this complexity into the database.

---

## The Meaning of ACID

ACID is the set of safety guarantees that transactions provide. But the devil is in the details — each property has subtleties that are often misunderstood.

### Atomicity

**Not about concurrency** (that's Isolation). Atomicity means: if a transaction performs multiple writes and **any of them fails** (or the client requests an abort), **all writes from that transaction are rolled back**. No partial results.

**Why it matters:** without atomicity, if your application writes to 3 tables and crashes after the 2nd write, the database is left in an inconsistent state. The application must somehow detect and undo the partial write — which is error-prone and hard to get right.

**Implementation:** typically via the **write-ahead log (WAL)** — the database writes intended changes to a log before applying them. If the transaction is aborted (or the system crashes before commit), the WAL entries are used to undo the changes.

**The word "atomic" is used differently here than in multi-threaded programming** — in ACID, it means "all-or-nothing" (abortability), not "indivisible operation."

### Consistency

The most overloaded word in computer science. In ACID, it means: **application-level invariants are always maintained** (e.g., "credits and debits are always balanced", "every order references a valid customer").

**This is the application's responsibility, not the database's.** The database provides tools (foreign keys, uniqueness constraints, check constraints), but the invariants themselves come from the application's logic. The database can't enforce invariants it doesn't know about.

### Isolation

Concurrently executing transactions should not interfere with each other. Ideally, each transaction should behave **as if it were the only transaction running** — this is called **serializability**.

**In practice:** full serializability has a performance cost, so most databases offer **weaker isolation levels** that trade safety for performance.

### Durability

Once a transaction is committed, its data is **not lost** — even if the hardware fails, the database crashes, or the power goes out.

**Implementation:**
- **Single-node:** data written to non-volatile storage (HDD/SSD) via WAL or B-tree pages. Often also fsynced to ensure the OS buffer is flushed to disk.
- **Replicated database:** data sent to the required number of replicas before reporting success.

**No absolute guarantee:** if all copies are destroyed (every disk, every replica), data is gone. "Durability" is a promise within the bounds of the fault model, not an absolute physical law.

### Single-Object vs Multi-Object Transactions

**Single-object atomicity and isolation** are provided by almost all databases, even those that don't support full transactions:
- **Atomicity:** write a 20 KB JSON document — if the system crashes after writing 10 KB, the partial write is discarded (write-ahead log or copy-on-write)
- **Isolation:** one thread reads the document while another writes it — the reader sees either the old or the new complete document, never a mix
- **Compare-and-set:** `UPDATE x SET value = B WHERE value = A` — atomic conditional write

**Multi-object transactions** are needed when:
- A write involves multiple tables/documents (e.g., inserting an order and decrementing inventory)
- A write must update denormalized data in multiple places
- A write must update secondary indexes to match the primary data
- Foreign key references must remain valid

---

## Weak Isolation Levels

Serializable isolation is the strongest but slowest. Most databases default to weaker levels that prevent some (but not all) concurrency anomalies.

### Read Committed

The most basic isolation level. Two guarantees:

**1. No dirty reads:** you only read data that has been committed. You never see uncommitted data from in-progress transactions.

```
Transaction A:                    Transaction B:
  x = 3 (initial)
  BEGIN
  SET x = 5                      
                                  READ x → 3 (not 5, because A hasn't committed)
  COMMIT
                                  READ x → 5 (now A has committed)
```

**2. No dirty writes:** you only overwrite data that has been committed. Your write never overwrites an uncommitted value from another transaction.

```
Without dirty write prevention (broken):
  Alice: UPDATE listings SET buyer = 'Alice' WHERE id = 1;  (uncommitted)
  Bob:   UPDATE listings SET buyer = 'Bob'   WHERE id = 1;  (overwrites Alice's uncommitted write!)
  Alice: UPDATE invoices SET payee = 'Alice' WHERE listing_id = 1;
  Alice: COMMIT
  Bob:   COMMIT
  Result: buyer = 'Bob' but invoice says 'Alice' — INCONSISTENT
```

**Implementation:**
- **Dirty writes prevented** by row-level locks — a transaction must acquire the lock before writing, holds it until commit/abort
- **Dirty reads prevented** by keeping both old and new values — return the old (committed) value to readers until the writing transaction commits. **Not via read locks** — read locks would hurt performance by blocking all readers during writes

**Default in:** PostgreSQL, Oracle, SQL Server.

### Snapshot Isolation (Repeatable Read / MVCC)

**Problem that read committed doesn't solve — non-repeatable read (read skew):**

```
Alice has Account 1 ($500) and Account 2 ($500). Total should be $1000.

Transaction (transfer $100 from Account 2 to Account 1):
  UPDATE accounts SET balance = 600 WHERE id = 1;  -- Account 1: $500 → $600
  UPDATE accounts SET balance = 400 WHERE id = 2;  -- Account 2: $500 → $400

Alice's read (concurrent):
  1. Read Account 1 → $500  (before transfer)
  2. Read Account 2 → $400  (after transfer)
  Alice sees total = $900 → WHERE DID $100 GO?!
```

This is a **transient anomaly** — if Alice reads again, she'll see $1000. But it's unacceptable for:
- **Database backups:** a backup spanning hours must be consistent — can't have half pre-transfer, half post-transfer data
- **Analytic queries:** a long-running query scanning millions of rows produces nonsensical results if the data changes under it
- **Integrity checks:** automated verification that credits = debits fails if the data is inconsistent

#### How Snapshot Isolation Works (MVCC)

**Multi-Version Concurrency Control (MVCC):** the database keeps multiple versions of each object, one for each transaction that modified it.

```
Transaction 12 writes:  x = 'A'    (created_by: txid 12)
Transaction 15 writes:  x = 'B'    (created_by: txid 15, deletes version from txid 12)

Transaction 13 reads x:
  → Transaction 13 started before 15, so version from txid 15 is not visible
  → Transaction 13 sees version from txid 12: x = 'A'

Transaction 16 reads x:
  → Transaction 15 already committed, so version from txid 15 is visible
  → Transaction 16 sees: x = 'B'
```

**Each transaction reads from a consistent snapshot — the database state as it was at the moment the transaction started.**

**MVCC Visibility Rules:** a version of an object is visible to transaction T if:
1. The transaction that created the version had already committed when T started, AND
2. The version has not been marked as deleted, OR the deleting transaction had not yet committed when T started

**Implementation details:**
- Each row has `created_by` (txid) and `deleted_by` (txid, initially empty) fields
- An UPDATE is internally a DELETE + INSERT (new version)
- Old versions are garbage collected when no active transaction can see them

**Indexes with MVCC:**
- **Approach 1:** index points to all versions; query-time filtering removes invisible versions
- **Approach 2:** append-only B-trees — each write creates new page versions, each transaction has its own tree root. No in-place modification. Used by CouchDB, Datomic, LMDB.

**Naming inconsistency:** PostgreSQL and MySQL InnoDB call this "repeatable read," but the SQL standard's definition of "repeatable read" doesn't actually require snapshot isolation. Oracle calls it "serializable" (but it's not actually serializable!). Don't trust the names — understand the actual behavior.

### Preventing Lost Updates

**The lost update problem:** two concurrent **read-modify-write** cycles — the second write blindly overwrites the first, losing its update.

```
Counter value: 42
Transaction A: READ counter (42) → compute 42+1 → WRITE counter = 43
Transaction B: READ counter (42) → compute 42+1 → WRITE counter = 43
Result: counter = 43 (should be 44 — Transaction A's increment is LOST)
```

**Real-world examples:** incrementing a counter, updating a bank balance, editing a wiki page (overwriting the other editor's changes), adding an item to a complex JSON document.

| Solution | How It Works | When to Use | Pitfalls |
|----------|-------------|-------------|----------|
| **Atomic write operations** | `UPDATE counters SET value = value + 1 WHERE key = 'foo'` — database executes read-modify-write as a single atomic operation (using exclusive lock or single-threaded execution) | When the update can be expressed as a single SQL expression | Not all updates can be expressed this way (e.g., editing arbitrary JSON) |
| **Explicit locking (SELECT FOR UPDATE)** | `SELECT * FROM accounts WHERE id = 1 FOR UPDATE` → application reads, computes, writes. The `FOR UPDATE` lock prevents concurrent read-modify-write. | When atomic operations aren't expressive enough | Error-prone — developers must remember to add `FOR UPDATE` to every query that's part of a read-modify-write cycle. Easy to forget. |
| **Automatic lost update detection** | Database detects when a transaction overwrites a value that was read by another concurrent transaction → aborts one → application retries. | The ideal approach — no application-level changes needed | PostgreSQL repeatable read and Oracle serializable detect this automatically. **MySQL InnoDB repeatable read does NOT** — a common source of bugs! |
| **Compare-and-set (CAS)** | `UPDATE wiki SET content = 'new' WHERE id = 1 AND content = 'old'` — write only succeeds if the value hasn't changed since reading | When the database doesn't support the above | Unsafe if the database reads from a snapshot that may be stale (then the WHERE condition checks old data) |
| **Conflict resolution (replicated DBs)** | Locks and CAS assume a single authoritative copy — they don't work with multi-leader or leaderless replication. Must use: sibling values + merge, CRDTs, or LWW (lossy). | Multi-leader and leaderless databases | LWW is default in many systems but silently drops updates |

### Preventing Write Skew and Phantoms

**Write skew** is a more subtle anomaly than lost updates. Two transactions each read something, make a decision based on what they read, and then write — but the write of each transaction invalidates the premise of the other.

**Example: on-call doctors**

```
Invariant: at least one doctor must be on call at all times.

Doctor A checks: 2 doctors currently on call → decides to go off call
Doctor B checks: 2 doctors currently on call → decides to go off call
Both commit.
Result: 0 doctors on call → INVARIANT VIOLATED
```

**Neither transaction saw a dirty read or a lost update.** The problem is that each transaction's decision was based on a premise (2 doctors on call) that became invalid due to the other transaction's action.

**More examples of write skew:**

| Scenario | Read (premise) | Write (invalidates premise) |
|----------|---------------|---------------------------|
| Meeting room booking | No conflicting booking exists | Insert a new booking → now two bookings overlap |
| Username registration | Username is available | Insert the username → now two users have it |
| Double-spending | Account balance is sufficient | Deduct money → now balance is negative |
| Multiplayer game | Position is unoccupied | Move to that position → now two players at same position |

**The general pattern:**
1. `SELECT` checks a condition (premise)
2. Application makes a decision based on the result
3. `INSERT`/`UPDATE`/`DELETE` changes the data in a way that invalidates the premise
4. If another concurrent transaction does the same, both premises were valid when checked but both writes create an inconsistent state

**Phantom:** a special case where the write in step 3 changes the **set of rows** matching the condition in step 1. You can't lock rows that **don't exist yet** (e.g., no booking exists for that time slot — so `SELECT FOR UPDATE` has nothing to lock).

**Solutions:**

| Solution | Mechanism | Limitation |
|----------|-----------|------------|
| **Database constraints** | UNIQUE, FOREIGN KEY, EXCLUSION constraints enforce invariants | Only works for simple constraints the database understands |
| **Explicit locking (FOR UPDATE)** | Lock the rows from the initial SELECT | **Doesn't work for phantoms** — can't lock non-existent rows |
| **Materializing conflicts** | Create a table representing all possible conflicting states (e.g., every possible time slot for every room). Lock the relevant row before checking. | Ugly, error-prone, hard to enumerate all possibilities |
| **Serializable isolation** | The correct, general solution | Performance cost — discussed next |

---

## Serializability

The strongest isolation level: guarantees that concurrent transactions behave as if they ran **one at a time, in some serial order**. Eliminates all concurrency anomalies.

### Approach 1: Actual Serial Execution

**Run every transaction on a single CPU core, one at a time.** No concurrency at all.

This sounds insane — but it became feasible around 2007-2012 because:
1. **RAM is cheap enough** to keep the entire active dataset in memory (no disk I/O during transactions)
2. **OLTP transactions are small and fast** (if they touch only a few records, each takes microseconds)

**Requirements and constraints:**

| Requirement | Why |
|-------------|-----|
| **No interactive multi-statement transactions** | Can't afford a network round-trip between statements (the single thread would be idle for milliseconds, blocking all other transactions) |
| **Stored procedures** | Entire transaction logic submitted as one request — executes without network round-trips. All reads, computation, and writes happen in one pass. |
| **Dataset fits in memory** | Disk I/O would stall the single thread, destroying throughput |
| **Low write throughput** | Must fit within one CPU core's capacity |
| **Partitioned execution** | For higher throughput, each partition runs its own serial thread. Cross-partition transactions require coordination → dramatically slower. |

**Used by:** VoltDB, Redis (single-threaded execution), Datomic.

**Stored procedures historically had a bad reputation** (ugly languages like PL/SQL, hard to debug, hard to version control, hard to test, poor library ecosystem, hard to deploy). Modern serial-execution databases allow stored procedures in general-purpose languages (Java, Groovy, Lua) which improves the developer experience.

### Approach 2: Two-Phase Locking (2PL)

**Not the same as two-phase commit (2PC)** — completely different concept.

The algorithm that was the gold standard for serializability for 30 years (and still used by many databases).

**Rules:**
- Multiple transactions can hold a **shared lock** on an object simultaneously (for reading)
- If any transaction wants to **write**, it must acquire an **exclusive lock** — and wait until all shared locks are released
- If a transaction has **read** an object (holds shared lock), and another transaction wants to **write**, the writer must wait
- Once a transaction acquires a lock, it holds it **until the transaction commits or aborts** (this is the "two-phase" part: growing phase + shrinking phase)

**The fundamental property:** readers block writers AND writers block readers (unlike snapshot isolation, where readers never block writers).

**Performance consequences:**
- **Significantly worse throughput and latency** compared to weak isolation levels
- Transactions wait for locks → queueing → one slow transaction blocks many others
- **Deadlocks** are more frequent — transaction A waits for B's lock, B waits for A's lock. Database must detect deadlocks (wait-for graph) and abort one transaction.
- Unstable latency — performance at high percentiles can be terrible

#### Predicate Locks

**Solving the phantom problem:** a predicate lock applies to all objects matching a query condition, **including objects that don't exist yet.**

```sql
SELECT * FROM bookings
WHERE room_id = 123 AND start_time < '2025-01-01 13:00' AND end_time > '2025-01-01 12:00';
```

A predicate lock on this condition prevents any other transaction from inserting, updating, or deleting a booking that matches this time range for room 123.

**Problem:** checking whether a new write conflicts with existing predicate locks is computationally expensive (must evaluate the predicate against every pending lock).

#### Index-Range Locks (Next-Key Locking)

A practical approximation of predicate locks. Instead of locking the exact predicate, lock a **larger range** on an index:

```
Predicate: room_id = 123 AND time between 12:00-13:00
Approximation options:
  • Lock all bookings for room 123 (any time) — safe but broader
  • Lock all bookings between 12:00-13:00 (any room) — safe but broader
  • Lock all bookings entirely — very broad but very simple
```

Locks more than necessary → some transactions wait unnecessarily. But checking is fast — just check the index, not evaluate arbitrary predicates.

**Used by:** MySQL InnoDB serializable mode, SQL Server serializable mode.

### Approach 3: Serializable Snapshot Isolation (SSI)

The newest approach (2008 research, PostgreSQL 9.1 implementation in 2012). Provides full serializability with much better performance than 2PL.

**Key idea: optimistic concurrency control.**
- Don't acquire any locks
- Let transactions execute concurrently using snapshot isolation (MVCC)
- At commit time, check whether any serializability violations occurred
- If a violation is detected → abort the transaction → application retries

**Two things SSI detects:**

**1. Stale MVCC reads (reading outdated data):**
When transaction A reads an object, and between A's read and A's commit, another transaction B has already committed a write to that object → A's read was stale. If A then makes a decision based on that read and tries to commit → A is aborted.

**2. Writes affecting prior reads:**
When transaction A reads some rows, and then transaction B writes a row that would have affected A's earlier read result → B's write is flagged. When A tries to commit, the database detects that A's read premise was invalidated.

**Advantages over 2PL:**
- **No blocking** — readers never block writers, writers never block readers (same as snapshot isolation)
- Predictable latency — no lock-wait queuing
- Better throughput under low to moderate contention

**Advantages over serial execution:**
- **Not limited to one CPU core** — parallelism across multiple cores/machines
- Can handle cross-partition transactions without the severe throughput penalty

**Trade-off:** more transactions may be aborted (wasted work). Under very high contention on the same data, many transactions abort and retry → performance degrades.

**Used by:** PostgreSQL (serializable mode since 9.1), FoundationDB, CockroachDB.

---

## Comparison of Serializability Approaches

| Aspect | Serial Execution | Two-Phase Locking (2PL) | Serializable Snapshot Isolation (SSI) |
|--------|-----------------|------------------------|--------------------------------------|
| **Concurrency** | None (single thread) | Pessimistic (acquire locks, wait) | Optimistic (execute, check at commit) |
| **Reads block writes?** | N/A (single thread) | Yes | No |
| **Writes block reads?** | N/A | Yes | No |
| **Phantom prevention** | Inherent (no concurrency) | Index-range locks | Detection at commit time |
| **Performance** | Good if dataset fits in memory, low write throughput | Poor under contention (lock waits, deadlocks) | Good under low-moderate contention |
| **Aborts** | None (no conflicts possible) | Via deadlock detection | Higher abort rate (optimistic) |
| **Scalability** | Single core only (or partition-per-core) | Multi-core, multi-node | Multi-core, multi-node |
| **Cross-partition** | Very expensive (coordination) | Possible (distributed locks) | Possible (distributed conflict detection) |
| **Implementation** | VoltDB, Redis, Datomic | MySQL InnoDB, SQL Server | PostgreSQL 9.1+, FoundationDB, CockroachDB |
