---
sidebar_position: 3
title: "02 — Indexing & Query Optimization"
---

# 🔍 Indexing & Query Optimization

Indexes are the single most impactful tool for database performance. Understanding how they work internally — not just how to `CREATE INDEX` — is what separates senior engineers in interviews.

---

## 🌳 How Indexes Work

An index is a **separate data structure** that maintains a sorted mapping from **key values** to **row locations** (page + offset), enabling the database to find rows without scanning the entire table.

### B-Tree Index Structure (ASCII Diagram)

Most relational databases use **B+Tree** indexes (a variant of B-Tree where all data pointers are in leaf nodes).

```
                         ┌──────────────┐
                         │  [30 | 60]   │          ◄── Root node
                         └──┬───┬───┬───┘
                ┌───────────┘   │   └───────────┐
                ▼               ▼               ▼
         ┌──────────┐   ┌──────────┐   ┌──────────┐
         │ [10|20]   │   │ [40|50]   │   │ [70|80]   │  ◄── Internal nodes
         └─┬──┬──┬──┘   └─┬──┬──┬──┘   └─┬──┬──┬──┘
           ▼  ▼  ▼         ▼  ▼  ▼         ▼  ▼  ▼
         ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐
  Leaf:  │5,8││12 ││22 ││35 ││45 ││55 ││65 ││75 ││85 │  ◄── Leaf nodes
         │   ││15 ││28 ││38 ││48 ││58 ││68 ││78 ││90 │      (store key +
         └─↔─┘└─↔─┘└─↔─┘└─↔─┘└─↔─┘└─↔─┘└─↔─┘└─↔─┘└───┘      row pointer)
          ↑                                                    
          └── Leaf nodes are linked for range scans ──────────►
```

### Lookup Flow: `SELECT * FROM users WHERE id = 45`

```
Step 1:  Root node → 45 > 30, 45 < 60 → go to middle child
Step 2:  Internal [40|50] → 45 > 40, 45 < 50 → go to middle child
Step 3:  Leaf node → scan for key 45 → found → follow pointer to data page
Step 4:  Read row from data page

Total I/O: 3-4 page reads (tree height + data page)
vs. Full table scan: potentially thousands of page reads
```

:::info Complexity
- **B+Tree lookup:** O(log_B N) where B is the branching factor (~100-500), N is row count
- **A table with 100 million rows** needs only **3-4 levels** of B+Tree → 3-4 disk reads
- **Full table scan:** O(N) — reads every page
:::

---

## 📚 Types of Indexes

### Overview Table

| Index Type | Description | Use Case |
|-----------|-------------|----------|
| **Primary** | Clustered index on the primary key (InnoDB stores rows in PK order) | Every table should have one |
| **Secondary** | Non-clustered index on non-PK columns | Speeding up WHERE/JOIN on specific columns |
| **Composite** | Index on multiple columns `(a, b, c)` | Multi-column WHERE, covering queries |
| **Covering** | Index contains all columns needed by the query | Avoids heap/table lookup entirely |
| **Partial** | Index on a subset of rows (`WHERE active = true`) | Indexing only relevant rows |
| **Unique** | Enforces uniqueness constraint | Email, username columns |
| **Full-text** | Inverted index for text search | Search within document content |
| **Spatial** | R-Tree for geospatial data | Location-based queries |

### Clustered vs. Non-Clustered

```
Clustered Index (InnoDB Primary Key):
┌─────────────────────────────────────────────┐
│  B+Tree leaves store the ACTUAL ROW DATA    │
│  Table rows are physically ordered by PK    │
│  Only ONE clustered index per table         │
└─────────────────────────────────────────────┘

Non-Clustered (Secondary) Index:
┌─────────────────────────────────────────────┐
│  B+Tree leaves store KEY + POINTER to row   │
│  Pointer = PK value (InnoDB) or RID (heap)  │
│  Multiple secondary indexes per table       │
└─────────────────────────────────────────────┘
```

:::warning Important: Secondary Index Lookup in InnoDB
In InnoDB, a secondary index lookup is a **two-step process**:
1. Search the secondary index B+Tree → get the primary key value
2. Search the primary key (clustered) B+Tree → get the actual row

This is called a **bookmark lookup** or **double lookup**. This is why covering indexes (which skip step 2) can dramatically improve performance.
:::

### Composite Index and the Leftmost Prefix Rule

A composite index on `(a, b, c)` can satisfy queries on:
- ✅ `WHERE a = ?`
- ✅ `WHERE a = ? AND b = ?`
- ✅ `WHERE a = ? AND b = ? AND c = ?`
- ✅ `WHERE a = ? ORDER BY b`
- ❌ `WHERE b = ?` — skips the leftmost column
- ❌ `WHERE b = ? AND c = ?` — skips `a`
- ⚠️ `WHERE a = ? AND c = ?` — uses index for `a`, but `c` requires a scan within that subset

```sql
-- This composite index...
CREATE INDEX idx_name ON orders (customer_id, order_date, status);

-- ...is effectively THREE indexes in one:
-- (customer_id)
-- (customer_id, order_date)
-- (customer_id, order_date, status)
```

### Covering Index

When an index contains **all** columns referenced in a query, the database can answer the query entirely from the index without touching the table — an **index-only scan**.

```sql
-- Query
SELECT customer_id, order_date, total
FROM orders
WHERE customer_id = 42 AND order_date > '2024-01-01';

-- Covering index (includes the SELECT column 'total')
CREATE INDEX idx_covering ON orders (customer_id, order_date, total);
-- Now the query never touches the heap — much faster!
```

### Partial Index (PostgreSQL)

Index only the rows you care about — smaller index, faster maintenance.

```sql
CREATE INDEX idx_active_users ON users (email)
WHERE active = true;
-- Only indexes active users — much smaller than a full index
-- Only useful for queries that include WHERE active = true
```

---

## 🏗️ Index Data Structures

### B-Tree vs. B+Tree vs. Hash Index

| Feature | B-Tree | B+Tree | Hash Index |
|---------|--------|--------|------------|
| **Data in internal nodes** | ✅ Yes | ❌ No (only in leaves) | N/A |
| **Leaf nodes linked** | ❌ No | ✅ Yes (doubly linked) | N/A |
| **Range queries** | ✅ Supported (slower) | ✅ Excellent (follow leaf links) | ❌ Not supported |
| **Equality lookup** | ✅ O(log N) | ✅ O(log N) | ✅ O(1) average |
| **Sorting** | ✅ Natural order | ✅ Natural order | ❌ No ordering |
| **Space efficiency** | Good | Better (data only in leaves) | Best for point lookups |
| **Used by** | Older systems | PostgreSQL, MySQL InnoDB, Oracle | PostgreSQL (hash), Memory engines |

:::tip Why B+Tree Dominates
B+Tree is preferred because:
1. **Higher fanout** in internal nodes (no data pointers) → shallower tree → fewer I/O
2. **Linked leaf nodes** → efficient range scans without backtracking
3. **Predictable performance** → every lookup traverses the same depth
:::

---

## 📋 When Indexes Help vs. Hurt

### ✅ Indexes Help When

| Scenario | Why |
|----------|-----|
| **WHERE** clause filtering on indexed columns | Avoids full table scan |
| **JOIN** conditions | Speeds up nested loop joins |
| **ORDER BY** on indexed columns | Avoids filesort |
| **GROUP BY** on indexed columns | Can use index for grouping |
| **SELECT DISTINCT** | Index provides sorted unique values |
| **MIN / MAX** on indexed column | Single index leaf access |
| **Covering queries** | Index-only scan, no table access |

### ❌ Indexes Hurt When

| Scenario | Why |
|----------|-----|
| **Small tables** (< few thousand rows) | Full scan is faster than index traversal |
| **High write workloads** | Every INSERT/UPDATE/DELETE must update all indexes |
| **Low selectivity columns** | Boolean or status columns with few distinct values |
| **Frequent bulk loads** | Index maintenance slows down batch inserts |
| **Over-indexing** | Too many indexes waste space and slow writes |
| **Columns rarely queried** | Index maintenance cost with no read benefit |

:::note Rule of Thumb
An index is useful when it filters out **most** rows. If a query returns > 10-20% of the table, the optimizer may choose a full scan over an index scan because sequential I/O is faster than random I/O.
:::

---

## 🔎 EXPLAIN / Query Plans

### Reading an EXPLAIN Plan

```sql
EXPLAIN ANALYZE SELECT * FROM orders
WHERE customer_id = 42 AND status = 'shipped';
```

PostgreSQL output:

```
Index Scan using idx_customer_status on orders  (cost=0.43..8.45 rows=1 width=96)
  (actual time=0.028..0.030 rows=3 loops=1)
  Index Cond: (customer_id = 42)
  Filter: (status = 'shipped')
  Rows Removed by Filter: 2
Planning Time: 0.105 ms
Execution Time: 0.052 ms
```

### Key EXPLAIN Components

| Field | Meaning |
|-------|---------|
| **Scan type** | How the table is accessed (Seq Scan, Index Scan, Bitmap Scan, Index Only Scan) |
| **cost** | Estimated startup cost .. total cost (arbitrary units) |
| **rows** | Estimated number of output rows |
| **actual time** | Real execution time in milliseconds |
| **loops** | Number of times this node was executed |
| **Filter** | Post-index filter applied to rows |
| **Rows Removed by Filter** | Rows fetched from index but rejected by filter |

### Scan Types (Best → Worst)

| Scan Type | Description | Performance |
|-----------|-------------|:-----------:|
| **Index Only Scan** | All data from index (covering) | ⭐⭐⭐⭐⭐ |
| **Index Scan** | Index lookup + heap fetch | ⭐⭐⭐⭐ |
| **Bitmap Index Scan** | Index → bitmap → heap (batched random I/O) | ⭐⭐⭐ |
| **Sequential Scan** | Full table scan | ⭐⭐ |
| **Sequential Scan + Filter** | Full scan + row-level filter | ⭐ |

### MySQL EXPLAIN

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
```

| Key columns | Meaning |
|------------|---------|
| **type** | Access type: `const` > `eq_ref` > `ref` > `range` > `index` > `ALL` |
| **possible_keys** | Indexes the optimizer considered |
| **key** | Index actually used |
| **key_len** | Bytes of the index used (composite index prefix length) |
| **rows** | Estimated rows to examine |
| **Extra** | `Using index` (covering), `Using filesort`, `Using temporary` |

:::warning Red Flags in EXPLAIN
- **type = ALL**: Full table scan — usually bad
- **Using filesort**: Sorting not covered by an index
- **Using temporary**: Temp table created (often for GROUP BY + ORDER BY on different columns)
- **Rows Removed by Filter >> actual rows**: Index is not selective enough
:::

---

## ⚡ Query Optimization Techniques

### 1. Use Covering Indexes

```sql
-- Before: Index Scan + heap lookup
CREATE INDEX idx_cust ON orders (customer_id);

-- After: Index Only Scan (no heap access)
CREATE INDEX idx_cust_covering ON orders (customer_id, order_date, total);
```

### 2. Avoid Functions on Indexed Columns

```sql
-- ❌ Bad: function on column prevents index use (SARGability violation)
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- ✅ Good: range predicate uses index
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

### 3. Use EXISTS Instead of IN for Correlated Subqueries

```sql
-- ❌ Slower with large subquery results
SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE active = true);

-- ✅ Faster: EXISTS stops at first match
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id AND c.active = true);
```

### 4. Pagination with Keyset (Seek) Instead of OFFSET

```sql
-- ❌ OFFSET scans and discards rows (O(offset + limit))
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;

-- ✅ Keyset pagination (O(limit) — constant cost)
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
```

### 5. Batch Operations Instead of Row-by-Row

```sql
-- ❌ N separate INSERT statements
INSERT INTO logs (msg) VALUES ('a');
INSERT INTO logs (msg) VALUES ('b');
INSERT INTO logs (msg) VALUES ('c');

-- ✅ Single batch INSERT
INSERT INTO logs (msg) VALUES ('a'), ('b'), ('c');
```

---

## 📈 Index Selectivity & Cardinality

**Cardinality** = number of distinct values in a column.
**Selectivity** = cardinality / total rows (range 0 to 1).

| Column | Cardinality | Selectivity | Good Index? |
|--------|:-----------:|:-----------:|:-----------:|
| `user_id` (PK) | 1,000,000 | 1.0 | ✅ Excellent |
| `email` | 999,900 | ~1.0 | ✅ Excellent |
| `city` | 500 | 0.0005 | ⚠️ Depends on query |
| `status` | 3 (active/inactive/banned) | 0.000003 | ❌ Too low |
| `is_deleted` | 2 (true/false) | 0.000002 | ❌ Use partial index |

:::tip Composite Index Column Order
Put the **most selective** column first in composite indexes:
```sql
-- If customer_id is more selective than status:
CREATE INDEX idx_orders ON orders (customer_id, status);  -- ✅ Good
CREATE INDEX idx_orders ON orders (status, customer_id);  -- ❌ Less effective
```
Exception: if you always filter by `status` first in your queries, adapt to your query patterns.
:::

---

## 🚫 Common Anti-Patterns

### 1. SELECT *

```sql
-- ❌ Fetches all columns, can't use covering indexes, wastes bandwidth
SELECT * FROM orders WHERE customer_id = 42;

-- ✅ Select only needed columns
SELECT order_id, order_date, total FROM orders WHERE customer_id = 42;
```

### 2. N+1 Query Problem

```sql
-- ❌ 1 query to get orders, then N queries to get each customer
SELECT * FROM orders;                           -- 1 query
-- For each order:
SELECT * FROM customers WHERE id = ?;          -- N queries

-- ✅ Single JOIN
SELECT o.*, c.name FROM orders o
JOIN customers c ON o.customer_id = c.id;       -- 1 query
```

### 3. Implicit Type Conversion

```sql
-- ❌ phone_number is VARCHAR but compared to INT → index not used
SELECT * FROM users WHERE phone_number = 1234567890;

-- ✅ Match the type
SELECT * FROM users WHERE phone_number = '1234567890';
```

### 4. OR Conditions on Different Columns

```sql
-- ❌ Cannot use a single index efficiently
SELECT * FROM users WHERE email = 'a@b.com' OR phone = '555-1234';

-- ✅ Use UNION (each branch uses its own index)
SELECT * FROM users WHERE email = 'a@b.com'
UNION
SELECT * FROM users WHERE phone = '555-1234';
```

### 5. LIKE with Leading Wildcard

```sql
-- ❌ Leading wildcard prevents index use
SELECT * FROM products WHERE name LIKE '%widget%';

-- ✅ Use full-text search for this pattern
SELECT * FROM products WHERE to_tsvector('english', name) @@ to_tsquery('widget');
```

---

## 🎯 Interview Questions on Indexing

### Q1: Your query is slow. Walk me through how you'd diagnose and fix it.

**Answer framework:**
1. **Run EXPLAIN ANALYZE** — identify scan type, row estimates, actual times
2. **Check for full table scans** — is there a missing index?
3. **Check for SARGability** — are functions applied to indexed columns?
4. **Check selectivity** — is the index selective enough to be useful?
5. **Check for N+1** — is the application issuing too many queries?
6. **Consider covering index** — can we avoid the heap lookup?
7. **Check statistics** — are table statistics stale? Run `ANALYZE`.
8. **Check for lock contention** — is the query waiting on locks?

### Q2: What is the difference between a clustered and non-clustered index?

A **clustered index** determines the physical storage order of rows. There is only one per table (the primary key in InnoDB). A **non-clustered (secondary) index** is a separate structure that stores index keys + pointers (primary key values in InnoDB) to the actual rows. Secondary lookups require a second traversal of the clustered index.

### Q3: When would you NOT create an index?

- Column has very low cardinality (boolean, status with 2-3 values)
- Table is small (< few thousand rows)
- Table is write-heavy and rarely queried by that column
- Column is frequently updated (index maintenance overhead)
- You already have too many indexes on the table

### Q4: What is a covering index and why does it matter?

A covering index includes all columns referenced in a query (SELECT, WHERE, JOIN, ORDER BY). The database answers the query entirely from the index without accessing the table heap — an **Index Only Scan**. This eliminates random I/O to the heap, which can be 2-10x faster.

---

## 🔗 Related Chapters

- **[01 — Relational Fundamentals](./01-relational-fundamentals.md)** — SQL foundations and JOIN types
- **[03 — Transactions & Concurrency](./03-transactions-concurrency.md)** — How locking interacts with index scans
- **[04 — Storage Engines](./04-storage-engines.md)** — B-Tree vs LSM-Tree internals
