---
sidebar_position: 2
title: "01 — Relational Fundamentals"
---

# 🏛️ Relational Fundamentals

The relational model is the foundation of most production databases. Mastering it is non-negotiable for senior engineering interviews.

---

## 📖 What Is a Relational Database?

A **relational database** organizes data into **relations** (tables), where each relation is a set of **tuples** (rows) with a fixed schema of **attributes** (columns). The relational model was introduced by **Edgar F. Codd** in 1970.

### Core Components

| Concept | Description |
|---------|-------------|
| **Table (Relation)** | A named collection of rows sharing the same schema |
| **Row (Tuple)** | A single record in a table |
| **Column (Attribute)** | A named field with a data type |
| **Primary Key** | A column (or set of columns) that uniquely identifies each row |
| **Foreign Key** | A column that references the primary key of another table |
| **Schema** | The structural definition of tables, columns, types, and constraints |
| **Constraint** | Rules enforced by the database (NOT NULL, UNIQUE, CHECK, FK) |

:::info Key Insight
The relational model separates **logical data representation** (tables, rows) from **physical storage** (pages, B-Trees). This abstraction lets the query optimizer choose the best execution strategy without changing application code.
:::

---

## ⚛️ ACID Properties

Every relational database guarantees **ACID** — the four properties that ensure reliable transaction processing.

### Overview Table

| Property | Guarantee | Failure Without It |
|----------|-----------|-------------------|
| **Atomicity** | All-or-nothing execution | Partial updates corrupt data |
| **Consistency** | Database moves between valid states | Constraint violations, orphan rows |
| **Isolation** | Concurrent transactions don't interfere | Dirty reads, lost updates |
| **Durability** | Committed data survives crashes | Data loss after power failure |

### 🔹 Atomicity

A transaction is an indivisible unit — either **all** operations succeed, or **none** do.

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
-- If any statement fails, both are rolled back — no money disappears.
```

**How it works internally:** The database writes undo information (before-images) to a rollback segment / undo log. On failure, it replays the undo log to reverse partial changes.

### 🔹 Consistency

The database enforces all defined rules (constraints, triggers, cascades) so that a transaction transitions the database from one **valid state** to another.

- Primary key uniqueness
- Foreign key referential integrity
- CHECK constraints
- Application-level invariants (e.g., account balance >= 0)

### 🔹 Isolation

Concurrent transactions execute as if they were **serial** (one after another), even though they run in parallel. The degree of isolation is configurable via **isolation levels** (covered in [Chapter 03](./03-transactions-concurrency.md)).

### 🔹 Durability

Once a transaction is committed, the data is **permanently stored** — even if the system crashes immediately after.

**Scenario:** You transfer $500 and receive `COMMIT OK`. One second later, the server loses power. When it restarts, your $500 transfer is still there. That's durability.

**How databases achieve this — three layers of defense:**

| Layer | What It Does | Why It's Needed |
|-------|-------------|-----------------|
| **Write-Ahead Log (WAL)** | Before touching actual data pages, the database appends the change to a sequential log on disk. On crash recovery, it replays the log to reconstruct any committed changes that hadn't reached the data files yet. | Random writes to data pages are slow; sequential WAL writes are fast. This lets the DB acknowledge `COMMIT` quickly while guaranteeing nothing is lost. |
| **Checkpointing** | Periodically, the database flushes **dirty pages** (modified in-memory pages) from the buffer pool to the actual data files on disk. After a checkpoint, WAL entries before that point are no longer needed for recovery. | Without checkpointing, the WAL would grow forever and crash recovery would take increasingly longer — replaying every change since the database started. |
| **Replication** | Synchronous replication copies each committed transaction to one or more standby nodes *before* acknowledging the commit to the client. | WAL and checkpointing protect against process crashes, but not against disk failure or hardware loss. Replication ensures data survives even if an entire machine is destroyed. |

```
COMMIT path (simplified):

  App ──COMMIT──► DB writes change to WAL (disk) ──► ACK sent to app
                           │
                    (in background)
                           │
                  Dirty page stays in buffer pool
                           │
                  Checkpoint flushes it to data file later
                           │
                  If crash before checkpoint:
                    → WAL is replayed on restart → no data lost
```

For a detailed WAL flow diagram, see [Chapter 03 — Transactions & Concurrency](./03-transactions-concurrency.md).

:::warning Interview Tip
"Explain ACID" is one of the most common opening questions. Don't just list the four letters — give a concrete example for each, and mention the implementation mechanism (WAL, undo logs, lock manager).
:::

---

## 📐 Normalization

Normalization is the process of organizing tables to **reduce redundancy** and **prevent update anomalies**. It's not an academic exercise — poorly structured tables cause real bugs in production.

### Why Normalize?

Consider this **un-normalized** table that stores employees and their departments together:

| emp_id | emp_name | dept_id | dept_name | dept_budget |
|--------|----------|---------|-----------|-------------|
| 1 | Alice | 10 | Engineering | 500000 |
| 2 | Bob | 10 | Engineering | 500000 |
| 3 | Carol | 20 | Marketing | 300000 |

This table has three types of anomalies lurking in it:

| Anomaly | What Goes Wrong | Concrete Example with This Table |
|---------|----------------|----------------------------------|
| **Update anomaly** | A single fact is stored in multiple rows. Updating one but missing another creates contradictory data. | Engineering's budget changes to 600K. You update Alice's row but forget Bob's. Now the database says Engineering has *two different budgets* — which is correct? |
| **Insert anomaly** | You can't record a fact without also recording an unrelated fact. | A new "Legal" department is created, but has no employees yet. You *cannot insert it* because `emp_id` (the PK) would be NULL. The department simply doesn't exist in the system until someone is hired. |
| **Delete anomaly** | Deleting one fact accidentally destroys an unrelated fact. | Carol is the only employee in Marketing. When she leaves and her row is deleted, the Marketing department — its name, its budget — vanishes entirely from the database. |

**The fix:** split into `employees(emp_id, emp_name, dept_id)` and `departments(dept_id, dept_name, dept_budget)`. Each fact is stored exactly once. This is what the normal forms below formalize.

### 🔸 First Normal Form (1NF)

**Rule:** Every column contains only **atomic** (indivisible) values. No repeating groups or arrays.

❌ **Before (violates 1NF):**

| student_id | name | courses |
|-----------|------|---------|
| 1 | Alice | Math, Physics, CS |
| 2 | Bob | Math, Chemistry |

✅ **After (1NF):**

| student_id | name | course |
|-----------|------|--------|
| 1 | Alice | Math |
| 1 | Alice | Physics |
| 1 | Alice | CS |
| 2 | Bob | Math |
| 2 | Bob | Chemistry |

### 🔸 Second Normal Form (2NF)

**Rule:** 1NF + every non-key column depends on the **entire** primary key (no partial dependencies).

**When it matters:** Only when the primary key is **composite** (made of two or more columns). If your PK is a single column, you're already in 2NF.

**The intuition:** Ask yourself for each non-key column: *"Do I need the FULL primary key to look up this value, or just part of it?"* If just part — that column doesn't belong in this table.

❌ **Before (violates 2NF):** PK = (student_id, course_id)

| student_id | course_id | student_name | course_name | grade |
|-----------|----------|-------------|------------|-------|
| 1 | 101 | Alice | Math | A |
| 1 | 102 | Alice | Physics | B |
| 2 | 101 | Bob | Math | A |

Ask the question for each non-key column:

| Column | Do I need the full PK to look it up? | Verdict |
|--------|--------------------------------------|---------|
| `grade` | Yes — grade `A` belongs to student 1 *in* course 101. You need both. | Belongs here |
| `student_name` | No — "Alice" is determined by `student_id = 1` alone. Adding `course_id` tells you nothing new. | **Partial dependency** — doesn't belong |
| `course_name` | No — "Math" is determined by `course_id = 101` alone. | **Partial dependency** — doesn't belong |

**What goes wrong if you leave it:** "Math" is repeated on every row that references course 101. If the course is renamed to "Mathematics", you must update every enrollment row for that course. Miss one, and the database now says course 101 is *both* "Math" and "Mathematics".

✅ **After (2NF):** Pull each partial dependency into its own table:

**students** — `student_name` depends only on `student_id`

| student_id | student_name |
|-----------|-------------|
| 1 | Alice |
| 2 | Bob |

**courses** — `course_name` depends only on `course_id`

| course_id | course_name |
|----------|------------|
| 101 | Math |
| 102 | Physics |

**enrollments** — `grade` depends on the full key `(student_id, course_id)`

| student_id | course_id | grade |
|-----------|----------|-------|
| 1 | 101 | A |
| 1 | 102 | B |
| 2 | 101 | A |

Now each fact is stored exactly once. Renaming "Math" to "Mathematics" is a single-row update in the `courses` table.

### 🔸 Third Normal Form (3NF)

**Rule:** 2NF + no **transitive dependencies** — non-key columns must depend directly on the primary key, not through another non-key column.

**The intuition:** Look at every non-key column and ask: *"Does this column describe the primary key, or does it actually describe some OTHER column in this table?"* If it describes another column, it's a transitive dependency — it's in the wrong table.

❌ **Before (violates 3NF):** PK = `emp_id`

| emp_id | emp_name | dept_id | dept_name | dept_location |
|--------|---------|---------|-----------|--------------|
| 1 | Alice | 10 | Engineering | Building A |
| 2 | Bob | 10 | Engineering | Building A |
| 3 | Carol | 20 | Marketing | Building B |

Trace the dependency chain:

```
emp_id → dept_id → dept_name
                 → dept_location

"Alice (emp 1) is in dept 10. Dept 10 is called Engineering and is in Building A."
```

`dept_name` and `dept_location` don't describe the employee — they describe the **department**. The employee table just happens to carry them along via `dept_id`. That's a transitive dependency: `emp_id → dept_id → dept_name`.

**What goes wrong if you leave it:** Engineering moves from Building A to Building C. You must update the `dept_location` on *every employee row* in Engineering. With 500 engineers, that's 500 rows to update for a single fact. And if you miss one, the database says Engineering is in two buildings simultaneously.

✅ **After (3NF):** Move columns to the table whose primary key they actually describe:

**employees** — `emp_name` and `dept_id` describe the employee

| emp_id | emp_name | dept_id |
|--------|---------|---------|
| 1 | Alice | 10 |
| 2 | Bob | 10 |
| 3 | Carol | 20 |

**departments** — `dept_name` and `dept_location` describe the department

| dept_id | dept_name | dept_location |
|---------|-----------|--------------|
| 10 | Engineering | Building A |
| 20 | Marketing | Building B |

Now "Engineering is in Building C" is a single-row update. The employees table references `dept_id` via a foreign key — it doesn't store any department facts.

### 🔸 Boyce-Codd Normal Form (BCNF)

**Rule:** For every functional dependency X → Y, X must be a **superkey**. BCNF is a stricter version of 3NF.

BCNF differs from 3NF only when there are **multiple overlapping candidate keys**.

❌ **Example violating BCNF:**

| student | subject | professor |
|---------|---------|-----------|
| Alice | Math | Prof. X |
| Bob | Math | Prof. X |
| Alice | Physics | Prof. Y |
| Carol | Physics | Prof. Z |

- Each professor teaches only one subject → `professor → subject`
- But `professor` is not a superkey → violates BCNF

✅ **After (BCNF):** Split into:

**professor_subjects**

| professor | subject |
|-----------|---------|
| Prof. X | Math |
| Prof. Y | Physics |
| Prof. Z | Physics |

**student_professors**

| student | professor |
|---------|-----------|
| Alice | Prof. X |
| Bob | Prof. X |
| Alice | Prof. Y |
| Carol | Prof. Z |

### Normalization Summary

| Normal Form | Eliminates | Depends On |
|:-----------:|-----------|:----------:|
| **1NF** | Repeating groups, non-atomic values | — |
| **2NF** | Partial dependencies | 1NF |
| **3NF** | Transitive dependencies | 2NF |
| **BCNF** | Non-superkey functional dependencies | 3NF |

---

## 🔄 Denormalization

Denormalization is the **intentional** introduction of redundancy to improve **read performance** at the cost of write complexity.

### When to Denormalize

| Scenario | Why |
|----------|-----|
| **Read-heavy workloads** | Avoid expensive JOINs on every query |
| **Reporting / analytics** | Pre-compute aggregates for dashboards |
| **Caching hot paths** | Store computed values to avoid recalculation |
| **Distributed databases** | Cross-node JOINs are expensive; co-locate data |

### Common Techniques

1. **Pre-computed columns:** Store `total_price` instead of computing `quantity * unit_price` on every read.
2. **Materialized views:** Periodically refresh a denormalized snapshot.
3. **Duplicated columns:** Copy `customer_name` into the `orders` table to avoid a JOIN.
4. **Summary tables:** Maintain daily/hourly aggregation tables.

:::warning Trade-off
Denormalization speeds up reads but creates **update anomalies** — you must keep redundant copies in sync (via triggers, application logic, or event-driven updates). Only denormalize after profiling proves the JOIN is the bottleneck.
:::

---

## 🔗 SQL Fundamentals — JOINs

### JOIN Types Visual Reference

```
Table A       Table B
┌───┐         ┌───┐
│ 1 │         │ 1 │
│ 2 │         │ 2 │
│ 3 │         │ 3 │
│ 4 │         │ 5 │
└───┘         └───┘

INNER JOIN    → {1, 2, 3}         (intersection)
LEFT JOIN     → {1, 2, 3, 4}      (all A + matched B)
RIGHT JOIN    → {1, 2, 3, 5}      (all B + matched A)
FULL JOIN     → {1, 2, 3, 4, 5}   (union)
CROSS JOIN    → {4 × 4 = 16}      (cartesian product)
```

### INNER JOIN

Returns rows that have matching values in **both** tables.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

### LEFT (OUTER) JOIN

Returns **all** rows from the left table, plus matched rows from the right. Unmatched right columns are `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
-- Employees without a department will show dept_name = NULL
```

### RIGHT (OUTER) JOIN

Returns **all** rows from the right table, plus matched rows from the left.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
-- Departments without employees will show name = NULL
```

### FULL (OUTER) JOIN

Returns **all** rows from both tables. Unmatched columns on either side are `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.dept_id;
```

### CROSS JOIN

Returns the **Cartesian product** — every combination of rows.

```sql
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;
-- 3 sizes × 4 colors = 12 rows
```

### SELF JOIN

A table joined to **itself** — useful for hierarchical data.

```sql
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;
```

---

## 📊 Subqueries, CTEs & Window Functions

### Subqueries

A query nested inside another query.

```sql
-- Scalar subquery: returns one value
SELECT name, salary,
       (SELECT AVG(salary) FROM employees) AS avg_salary
FROM employees;

-- IN subquery: filter by a set
SELECT name FROM employees
WHERE dept_id IN (SELECT dept_id FROM departments WHERE location = 'NYC');

-- EXISTS subquery: check existence
SELECT d.dept_name FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.dept_id);
```

### Common Table Expressions (CTEs)

CTEs improve readability and allow **recursive** queries.

```sql
WITH high_earners AS (
    SELECT dept_id, name, salary
    FROM employees
    WHERE salary > 100000
)
SELECT d.dept_name, COUNT(*) AS num_high_earners
FROM high_earners h
JOIN departments d ON h.dept_id = d.dept_id
GROUP BY d.dept_name;
```

**Recursive CTE** — useful for hierarchies:

```sql
WITH RECURSIVE org_chart AS (
    -- Anchor: top-level managers
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: subordinates
    SELECT e.emp_id, e.name, e.manager_id, oc.level + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.emp_id
)
SELECT * FROM org_chart ORDER BY level, name;
```

### Window Functions

#### The Core Idea: Window vs GROUP BY

`GROUP BY` collapses rows — 10 employees become 3 department rows. You lose the individual rows.

Window functions let you **compute across rows while keeping every row**. Think of it as: each row gets to "look through a window" at the other rows around it and compute something.

```
GROUP BY dept_id + SUM(salary):

  Alice  | 10 | 120K ─┐
  Bob    | 10 | 110K ──┤──► dept 10 | 330K     (3 rows collapsed into 1)
  Carol  | 10 | 100K ─┘
  Dave   | 20 |  90K ──┬──► dept 20 | 170K     (2 rows collapsed into 1)
  Eve    | 20 |  80K ──┘

Window function — SUM(salary) OVER (PARTITION BY dept_id):

  Alice  | 10 | 120K | 330K     ← Alice still exists, but can see her dept total
  Bob    | 10 | 110K | 330K     ← Bob still exists, same dept total
  Carol  | 10 | 100K | 330K
  Dave   | 20 |  90K | 170K
  Eve    | 20 |  80K | 170K
```

#### The OVER() Clause — What Each Part Does

```sql
function_name() OVER (
    PARTITION BY col1, col2    -- split rows into groups (like GROUP BY, but rows aren't collapsed)
    ORDER BY col3              -- sort rows within each partition
    ROWS BETWEEN ... AND ...   -- define which rows in the partition to include in the calculation
)
```

| Clause | What it does | Analogy |
|--------|-------------|---------|
| `PARTITION BY dept_id` | Divides rows into independent groups. The window function resets for each group. | Like `GROUP BY`, but you keep all rows. |
| `ORDER BY salary DESC` | Defines the order of rows within each partition. Required for ranking and running totals. | Determines "who is first, second, third..." |
| `ROWS BETWEEN ...` | The **frame** — which rows around the current row are included in the calculation. | A sliding window that moves with each row. |

If you omit `PARTITION BY`, the entire result set is one partition. If you omit the frame, the default depends on the function (ranking functions don't use frames; aggregate functions default to `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when `ORDER BY` is present).

#### ROW_NUMBER, RANK, DENSE_RANK

These three functions all assign a number to each row based on its position. They differ only in **how they handle ties**.

```sql
SELECT name, dept_id, salary,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

| name | dept_id | salary | row_num | rnk | dense_rnk |
|------|---------|--------|---------|-----|-----------|
| Alice | 10 | 120000 | 1 | 1 | 1 |
| Bob | 10 | 110000 | 2 | 2 | 2 |
| Carol | 10 | 110000 | 3 | 2 | 2 |
| Dave | 10 | 100000 | 4 | 4 | 3 |

Bob and Carol are tied at 110K. Watch what each function does:

```
                     Bob & Carol tied at 110K
                              │
  ROW_NUMBER:   1, 2, 3, 4   │  Ignores ties — assigns arbitrary order (2 vs 3).
                              │  Use when you need exactly one row per rank
                              │  (e.g., "pick one employee per department").
                              │
  RANK:         1, 2, 2, 4   │  Ties get the same rank, then SKIPS.
                              │  Dave is rank 4 (not 3) because two people are ahead of him.
                              │  Use when you need competition-style ranking
                              │  (e.g., "Olympic medals — two golds, no silver, then bronze").
                              │
  DENSE_RANK:   1, 2, 2, 3   │  Ties get the same rank, NO skip.
                              │  Dave is rank 3 because he has the 3rd-highest salary value.
                              │  Use when you need "Nth distinct value"
                              │  (e.g., "find the 3rd highest salary").
```

#### LAG and LEAD

`LAG` looks **backward** at previous rows. `LEAD` looks **forward** at upcoming rows. Both are relative to the `ORDER BY` within the window.

```sql
SELECT order_date, revenue,
    LAG(revenue, 1)  OVER (ORDER BY order_date) AS prev_day,
    LEAD(revenue, 1) OVER (ORDER BY order_date) AS next_day,
    revenue - LAG(revenue, 1) OVER (ORDER BY order_date) AS change
FROM daily_sales;
```

| order_date | revenue | prev_day | next_day | change |
|-----------|---------|----------|----------|--------|
| Jan 1 | 100 | NULL | 150 | NULL |
| Jan 2 | 150 | 100 | 120 | +50 |
| Jan 3 | 120 | 150 | 200 | -30 |
| Jan 4 | 200 | 120 | NULL | +80 |

```
Reading the Jan 2 row:

  LAG(revenue, 1)  = "look 1 row BACK"  → Jan 1's revenue = 100
  LEAD(revenue, 1) = "look 1 row AHEAD" → Jan 3's revenue = 120
  change           = 150 - 100 = +50

  Jan 1 has no previous row → LAG returns NULL
  Jan 4 has no next row     → LEAD returns NULL
```

You can provide a default for NULL: `LAG(revenue, 1, 0)` returns `0` instead of `NULL` when there's no previous row.

#### SUM / AVG OVER — Running Totals and Sliding Windows

This is where the **frame** clause matters. It defines *which rows* the aggregate function includes for each row's calculation.

```sql
SELECT order_date, amount,
    SUM(amount) OVER (ORDER BY order_date) AS running_total,
    AVG(amount) OVER (ORDER BY order_date
                      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3day_avg
FROM orders;
```

| order_date | amount | running_total | rolling_3day_avg |
|-----------|--------|---------------|------------------|
| Jan 1 | 100 | 100 | 100.0 |
| Jan 2 | 200 | 300 | 150.0 |
| Jan 3 | 150 | 450 | 150.0 |
| Jan 4 | 300 | 750 | 216.7 |
| Jan 5 | 100 | 850 | 183.3 |

How the frame slides for each row:

```
  running_total (default frame = all rows up to current):

    Jan 1:  [100]                          = 100
    Jan 2:  [100 + 200]                    = 300
    Jan 3:  [100 + 200 + 150]             = 450
    Jan 4:  [100 + 200 + 150 + 300]       = 750
    Jan 5:  [100 + 200 + 150 + 300 + 100] = 850
             ──────────────────── always growing

  rolling_3day_avg (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW):

    Jan 1:  [100]              / 1 = 100.0     ← only 1 row available
    Jan 2:  [100 + 200]       / 2 = 150.0      ← only 2 rows available
    Jan 3:  [100 + 200 + 150] / 3 = 150.0      ← full 3-row window
    Jan 4:  [200 + 150 + 300] / 3 = 216.7      ← window SLIDES: Jan 1 drops out
    Jan 5:  [150 + 300 + 100] / 3 = 183.3      ← window SLIDES: Jan 2 drops out
             ─── 3-row window ───  moves forward with each row
```

**Common frame specifications:**

| Frame | What It Means |
|-------|--------------|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | All rows from the start of the partition up to the current row (running total). This is the default when `ORDER BY` is present. |
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | Current row + the 2 rows before it (3-row sliding window). |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Current row + 1 before + 1 after (centered 3-row window). |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | Every row in the partition (same as omitting `ORDER BY`). |

---

## 🧩 Classic SQL Interview Questions

### 1. Nth Highest Salary

```sql
-- Using DENSE_RANK (handles ties correctly)
WITH ranked AS (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT DISTINCT salary FROM ranked WHERE rnk = 3; -- 3rd highest

-- Using LIMIT/OFFSET (simpler, but doesn't handle ties)
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 2; -- 3rd highest (0-indexed offset)
```

### 2. Duplicate Detection

```sql
-- Find duplicate emails
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Delete duplicates, keep the row with the smallest id
DELETE FROM users
WHERE id NOT IN (
    SELECT MIN(id) FROM users GROUP BY email
);
```

### 3. Running Total

```sql
SELECT
    transaction_date,
    amount,
    SUM(amount) OVER (ORDER BY transaction_date) AS running_total
FROM transactions;
```

### 4. Gaps and Islands

Find consecutive date ranges (islands) and gaps between them.

```sql
-- Islands: group consecutive dates
WITH numbered AS (
    SELECT login_date,
           login_date - (ROW_NUMBER() OVER (ORDER BY login_date))::int AS grp
    FROM user_logins
    WHERE user_id = 42
)
SELECT MIN(login_date) AS streak_start,
       MAX(login_date) AS streak_end,
       COUNT(*) AS streak_length
FROM numbered
GROUP BY grp
ORDER BY streak_start;
```

### 5. Employees Earning More Than Their Manager

```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS mgr_salary
FROM employees e
JOIN employees m ON e.manager_id = m.emp_id
WHERE e.salary > m.salary;
```

### 6. Department with Highest Average Salary

```sql
WITH dept_avg AS (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
)
SELECT d.dept_name, da.avg_salary
FROM dept_avg da
JOIN departments d ON da.dept_id = d.dept_id
ORDER BY da.avg_salary DESC
LIMIT 1;
```

### 7. Consecutive Logins (at least 3 days in a row)

```sql
WITH consecutive AS (
    SELECT user_id, login_date,
           LAG(login_date, 1) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_1,
           LAG(login_date, 2) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_2
    FROM user_logins
)
SELECT DISTINCT user_id
FROM consecutive
WHERE login_date - prev_1 = 1
  AND prev_1 - prev_2 = 1;
```

### 8. Top N Per Group

*"Find the top 3 highest-paid employees in each department."*

This is one of the most frequently asked SQL interview questions. The pattern is always the same: ROW_NUMBER partitioned by the group, then filter.

```sql
WITH ranked AS (
    SELECT name, dept_id, salary,
           ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
    FROM employees
)
SELECT name, dept_id, salary
FROM ranked
WHERE rn <= 3;
```

**Follow-up the interviewer will ask:** *"What if two employees have the same salary — should both appear in the top 3?"* If yes, switch to `DENSE_RANK()`:

```sql
WITH ranked AS (
    SELECT name, dept_id, salary,
           DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT name, dept_id, salary
FROM ranked
WHERE rnk <= 3;
```

### 9. Pivot — Rows to Columns (Conditional Aggregation)

*"Given a table of monthly sales, produce one row per year with a column for each month."*

Source data:

| year | month | revenue |
|------|-------|---------|
| 2024 | Jan | 100 |
| 2024 | Feb | 150 |
| 2024 | Mar | 200 |
| 2025 | Jan | 120 |

Desired output:

| year | Jan | Feb | Mar |
|------|-----|-----|-----|
| 2024 | 100 | 150 | 200 |
| 2025 | 120 | NULL | NULL |

```sql
SELECT year,
    SUM(CASE WHEN month = 'Jan' THEN revenue END) AS "Jan",
    SUM(CASE WHEN month = 'Feb' THEN revenue END) AS "Feb",
    SUM(CASE WHEN month = 'Mar' THEN revenue END) AS "Mar"
FROM monthly_sales
GROUP BY year
ORDER BY year;
```

The trick: `CASE WHEN` inside an aggregate turns rows into columns. `SUM` with a single matching row just returns that value; non-matching rows produce `NULL`, which `SUM` ignores.

### 10. Year-over-Year Growth

*"For each month, show the revenue and the percentage change compared to the same month last year."*

```sql
WITH monthly AS (
    SELECT DATE_TRUNC('month', order_date) AS month,
           SUM(amount) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY month) AS same_month_last_year,
    ROUND(
        (revenue - LAG(revenue, 12) OVER (ORDER BY month))
        * 100.0 / LAG(revenue, 12) OVER (ORDER BY month),
        1
    ) AS yoy_growth_pct
FROM monthly
ORDER BY month;
```

| month | revenue | same_month_last_year | yoy_growth_pct |
|-------|---------|---------------------|----------------|
| 2024-01 | 10000 | NULL | NULL |
| ... | ... | ... | ... |
| 2025-01 | 12000 | 10000 | 20.0 |

`LAG(revenue, 12)` looks back 12 rows (12 months) — this only works when every month has data. For sparse data, use a self-join: `JOIN monthly prev ON m.month = prev.month + INTERVAL '1 year'`.

### 11. Median Salary

*"Find the median salary across all employees."*

**Approach 1 — Built-in (PostgreSQL, Oracle):**

```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM employees;
```

**Approach 2 — Manual (works everywhere):**

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

Why `AVG` of two rows? For an even number of employees (e.g., 10), the median is the average of the 5th and 6th values. For odd (e.g., 11), `FLOOR` and `CEIL` both return 6, so `AVG` of one value is itself.

### 12. Percentage of Total

*"Show each department's salary expense as a percentage of the company total."*

```sql
SELECT
    dept_id,
    SUM(salary) AS dept_total,
    SUM(SUM(salary)) OVER () AS company_total,
    ROUND(SUM(salary) * 100.0 / SUM(SUM(salary)) OVER (), 1) AS pct_of_total
FROM employees
GROUP BY dept_id
ORDER BY pct_of_total DESC;
```

| dept_id | dept_total | company_total | pct_of_total |
|---------|-----------|--------------|-------------|
| 10 | 500000 | 1200000 | 41.7 |
| 20 | 400000 | 1200000 | 33.3 |
| 30 | 300000 | 1200000 | 25.0 |

The key insight: `SUM(SUM(salary)) OVER ()` is a window function on top of a `GROUP BY` aggregate. The inner `SUM` computes per-department totals, the outer `SUM() OVER ()` computes the grand total across all departments without collapsing the rows.

### 13. Month-over-Month User Retention

*"For each month, what percentage of users who were active in month N were also active in month N+1?"*

```sql
WITH monthly_users AS (
    SELECT DISTINCT user_id, DATE_TRUNC('month', activity_date) AS month
    FROM user_activity
)
SELECT
    curr.month,
    COUNT(DISTINCT curr.user_id) AS active_users,
    COUNT(DISTINCT next.user_id) AS retained_users,
    ROUND(
        COUNT(DISTINCT next.user_id) * 100.0 / COUNT(DISTINCT curr.user_id), 1
    ) AS retention_pct
FROM monthly_users curr
LEFT JOIN monthly_users next
    ON curr.user_id = next.user_id
    AND next.month = curr.month + INTERVAL '1 month'
GROUP BY curr.month
ORDER BY curr.month;
```

| month | active_users | retained_users | retention_pct |
|-------|-------------|---------------|--------------|
| 2024-01 | 1000 | 720 | 72.0 |
| 2024-02 | 1100 | 770 | 70.0 |

The `LEFT JOIN` matches each user in month N to themselves in month N+1. If they don't appear next month, `next.user_id` is NULL and isn't counted — that's a churned user.

### 14. Recursive Hierarchy — All Reports Under a Manager

*"Given a manager ID, find all employees in their reporting chain (direct reports, their reports, etc.)."*

```sql
WITH RECURSIVE reports AS (
    SELECT emp_id, name, manager_id, 1 AS depth
    FROM employees
    WHERE manager_id = 100  -- starting manager

    UNION ALL

    SELECT e.emp_id, e.name, e.manager_id, r.depth + 1
    FROM employees e
    JOIN reports r ON e.manager_id = r.emp_id
)
SELECT emp_id, name, depth
FROM reports
ORDER BY depth, name;
```

```
depth=1:  Alice, Bob         (direct reports of manager 100)
depth=2:  Carol, Dave, Eve   (reports of Alice and Bob)
depth=3:  Frank              (reports of Carol)
```

**Follow-up:** *"How do you prevent infinite loops if the data has cycles?"* Add a max depth: `WHERE r.depth < 10` in the recursive term, or track visited nodes with an array: `AND e.emp_id != ALL(r.visited)`.

### 15. Customers Who Bought All Products

*"Find customers who have purchased every product in the products table."*

This is a **relational division** problem — one of the trickiest SQL patterns.

```sql
SELECT customer_id
FROM purchases
GROUP BY customer_id
HAVING COUNT(DISTINCT product_id) = (SELECT COUNT(*) FROM products);
```

The logic: if a customer has purchased as many distinct products as there are total products, they've bought everything. This assumes `product_id` in `purchases` is always a valid product.

**Follow-up:** *"What if you only want customers who bought all products in a specific category?"*

```sql
SELECT p.customer_id
FROM purchases p
JOIN products pr ON p.product_id = pr.product_id
WHERE pr.category = 'Electronics'
GROUP BY p.customer_id
HAVING COUNT(DISTINCT p.product_id) = (
    SELECT COUNT(*) FROM products WHERE category = 'Electronics'
);
```

### 16. Delete All But the Most Recent Order Per Customer

*"Each customer should keep only their latest order. Delete the rest."*

```sql
DELETE FROM orders
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
        FROM orders
    ) ranked
    WHERE rn = 1
);
```

The subquery assigns `rn = 1` to each customer's most recent order. Everything else gets deleted. The extra nesting (`SELECT id FROM (...)`) is needed because some databases (MySQL) don't allow a subquery on the same table being deleted to reference it directly.

---

## 🏗️ RDBMS Comparison

### How to Choose — Decision by Use Case

| You're building... | Recommended DB | Why this one wins |
|--------------------|---------------|-------------------|
| **Fintech / banking app** | PostgreSQL | Strictest ACID, serializable isolation that actually works, `DECIMAL` precision, rich constraint system. When a rounding error or phantom read means losing money, correctness is non-negotiable. |
| **High-traffic content platform** (blog, CMS, e-commerce catalog) | MySQL | Optimized for simple read-heavy queries, massive community/tooling (WordPress, Shopify, GitHub all run on MySQL), easy to operate at scale with read replicas. |
| **Enterprise with existing Oracle investment** | Oracle | RAC (Real Application Clusters) for horizontal scaling without sharding, advanced partitioning, and mature tooling for compliance/auditing. Switching cost usually outweighs alternatives. |
| **Windows/.NET enterprise stack** | SQL Server | First-class SSRS/SSIS/SSAS integration, seamless Azure migration path, Active Directory auth. If the org already runs on Microsoft, fighting the ecosystem costs more than the license. |
| **Geospatial / scientific workloads** | PostgreSQL | PostGIS extension is the industry standard for spatial queries. No other RDBMS comes close for `ST_Within`, `ST_Distance`, spatial indexing. |
| **Schema-flexible with relational backbone** | PostgreSQL | JSONB columns with GIN indexes let you query nested JSON as fast as regular columns — avoids the "should I use MongoDB?" debate for semi-structured data. |

### Feature Comparison (Where They Actually Differ)

Features like JOINs, window functions, CTEs, and basic MVCC are table stakes — every modern RDBMS supports them. The table below focuses on **meaningful differences**:

| Dimension | PostgreSQL | MySQL (InnoDB) | Oracle | SQL Server |
|-----------|-----------|---------------|--------|------------|
| **License** | Open source (PostgreSQL license — permissive, no copyleft) | Open source (GPL) — but owned by Oracle, dual-licensed commercially | Commercial ($$$) | Commercial ($$) |
| **Default Isolation** | Read Committed | Repeatable Read — unique among major RDBMSs; means fewer phantom reads out-of-the-box but more lock contention | Read Committed | Read Committed |
| **MVCC implementation** | Stores old row versions in the same table (requires `VACUUM` to reclaim space) | Stores old versions in a separate undo tablespace (cleaner, no vacuum needed) | Undo tablespace (like MySQL) | Row versioning in tempdb when RCSI is enabled; lock-based by default |
| **JSON** | **JSONB** — binary format, GIN-indexable, supports partial updates (`jsonb_set`) | JSON stored as text, validated on write but not indexable without generated columns | JSON with SQL/JSON path expressions | JSON with `OPENJSON`, `FOR JSON` |
| **Replication** | Streaming (physical) + logical replication; built-in but requires manual setup | Async, semi-sync, and Group Replication (multi-primary); simpler operational model | Data Guard (standby) + RAC (shared-disk clustering, unique in the industry) | Always On Availability Groups + log shipping; tightly integrated with Windows clustering |
| **Extensibility** | Custom types, operators, index methods, procedural languages (PL/pgSQL, PL/Python, PL/V8) | Limited — UDFs only, no custom types or index methods | PL/SQL (mature, but proprietary) | CLR integration (.NET stored procedures) |
| **Partitioning** | Declarative (range, list, hash) since v10; straightforward but fewer options | Range, hash, list, key; more partition types but quirky syntax | Most advanced — interval, reference, composite, virtual column partitioning | Partition functions + schemes; powerful but verbose setup |
| **Operational complexity** | Medium — must tune `VACUUM`, `work_mem`, `shared_buffers` | Low — works well with defaults for most workloads; simpler to operate | High — requires dedicated DBAs; enormous feature surface | Medium — good GUI tooling (SSMS) reduces operational burden |

### Quick-Reference Summary

```
                  PostgreSQL                    MySQL
                  ──────────                    ─────
  Correctness     ████████████  (strictest)     ████████░░░░  (good, not as strict)
  Read perf       ████████░░░░  (good)          ████████████  (optimized for reads)
  Extensibility   ████████████  (custom types)  ████░░░░░░░░  (limited)
  Ease of ops     ████████░░░░  (vacuum, etc.)  ████████████  (simpler defaults)
  JSON support    ████████████  (JSONB, GIN)    ████████░░░░  (text-based)
  Ecosystem       ████████████  (growing fast)  ████████████  (massive, mature)
```

:::tip Senior Interview Tip
When asked "PostgreSQL vs MySQL?", never just list features. Frame your answer as: **"It depends on the workload."** Then give one concrete scenario for each. Example: *"For a payment system, I'd choose PostgreSQL — its serializable isolation actually prevents write skew, while MySQL's Repeatable Read still allows it. For a content platform doing 10:1 reads-to-writes, I'd choose MySQL — simpler replication, lower operational overhead, and the read path is faster out of the box."*
:::

---

## 🔗 Related Chapters

- **[02 — Indexing & Query Optimization](./02-indexing-query-optimization.md)** — How to make your SQL queries fast
- **[03 — Transactions & Concurrency](./03-transactions-concurrency.md)** — Deep dive into ACID isolation and locking
- **[08 — Common Interview Questions](./08-interview-questions.md)** — Practice SQL challenges
