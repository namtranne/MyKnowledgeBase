# Chapter 14 — Databases

> Database questions test your ability to write correct SQL, design schemas, and reason about performance at scale. Whether you're building a simple CRUD application or designing a distributed data platform, understanding relational databases is a core engineering skill that interviewers expect.

---

## SQL Syntax and Variations

While SQL is standardized (ANSI SQL), each database engine has its own dialect:

| Feature | MySQL | PostgreSQL | SQL Server | Oracle |
|---------|-------|-----------|------------|--------|
| **String concat** | `CONCAT(a, b)` | `a \|\| b` | `a + b` | `a \|\| b` |
| **Limit rows** | `LIMIT n` | `LIMIT n` | `TOP n` | `ROWNUM <= n` |
| **Auto-increment** | `AUTO_INCREMENT` | `SERIAL` / `GENERATED` | `IDENTITY` | `SEQUENCE` |
| **Upsert** | `ON DUPLICATE KEY UPDATE` | `ON CONFLICT DO UPDATE` | `MERGE` | `MERGE` |
| **Date functions** | `NOW()`, `DATE_ADD()` | `NOW()`, `interval` | `GETDATE()`, `DATEADD()` | `SYSDATE`, `ADD_MONTHS()` |

> For interviews, standard ANSI SQL is typically sufficient. Focus on correct logic rather than vendor-specific syntax.

---

## Denormalized vs. Normalized Databases

### Normal Forms

Normalization reduces data redundancy and prevents update anomalies by organizing data into well-structured tables.

| Normal Form | Rule | Violation Example | Fix |
|-------------|------|-------------------|-----|
| **1NF** | Each column holds atomic values; no repeating groups | `skills = "Java, Python, Go"` | Create separate `skills` table |
| **2NF** | 1NF + no partial dependencies on composite key | `OrderItems(orderID, productID, productName)` — `productName` depends only on `productID` | Move `productName` to `Products` table |
| **3NF** | 2NF + no transitive dependencies | `Employee(empID, deptID, deptName)` — `deptName` depends on `deptID`, not `empID` | Move `deptName` to `Departments` table |
| **BCNF** | Every determinant is a candidate key | Rare edge cases in 3NF with multiple overlapping candidate keys | Decompose further |

### Normalization Example

```
UNNORMALIZED:
┌──────────────────────────────────────────────────────────┐
│ Student: "Alice", Courses: "Math, Physics", Grades: "A, B"│
└──────────────────────────────────────────────────────────┘

1NF — Atomic values:
┌─────────┬─────────┬───────┐
│ Student │ Course  │ Grade │
├─────────┼─────────┼───────┤
│ Alice   │ Math    │ A     │
│ Alice   │ Physics │ B     │
└─────────┴─────────┴───────┘

3NF — Separate tables, foreign keys:
┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐
│  Students    │   │   Courses    │   │   Enrollments        │
├──────────────┤   ├──────────────┤   ├──────────────────────┤
│ student_id PK│   │ course_id PK │   │ student_id FK        │
│ name         │   │ name         │   │ course_id  FK        │
└──────────────┘   └──────────────┘   │ grade                │
                                      └──────────────────────┘
```

### When to Denormalize

| Scenario | Why Denormalize | Tradeoff |
|----------|----------------|----------|
| **Read-heavy workloads** | Avoid expensive JOINs | Increased storage, update complexity |
| **Reporting / analytics** | Pre-aggregated data for dashboards | Data may become stale |
| **Caching hot data** | Embed frequently accessed fields | Duplicated data, consistency risk |
| **Microservices** | Each service owns its data, may duplicate | Eventually consistent |

### Tradeoffs Table

| Aspect | Normalized | Denormalized |
|--------|-----------|-------------|
| **Redundancy** | Minimal | Significant |
| **Write performance** | Better (single update) | Worse (multiple updates) |
| **Read performance** | Worse (requires JOINs) | Better (pre-joined) |
| **Consistency** | Strong (single source of truth) | Risk of inconsistency |
| **Storage** | Efficient | Uses more space |
| **Complexity** | Simpler writes | Simpler reads |

> Start normalized, denormalize strategically when performance demands it. Premature denormalization is a common mistake that leads to painful data inconsistencies.

---

## SQL Statements

### SELECT Fundamentals

```sql
SELECT column1, column2, aggregate_function(column3)
FROM table_name
WHERE condition
GROUP BY column1, column2
HAVING aggregate_condition
ORDER BY column1 ASC|DESC
LIMIT n OFFSET m;
```

**Execution order** (different from written order):

```
1. FROM / JOIN        ← identify source tables
2. WHERE              ← filter rows
3. GROUP BY           ← group remaining rows
4. HAVING             ← filter groups
5. SELECT             ← choose columns, compute expressions
6. DISTINCT           ← remove duplicates
7. ORDER BY           ← sort results
8. LIMIT / OFFSET     ← return subset
```

### JOIN Types

```
    Table A           Table B
  ┌─────────┐      ┌─────────┐
  │ 1  Alice │      │ 1  HR   │
  │ 2  Bob   │      │ 3  Eng  │
  │ 4  Carol │      │ 5  Sales│
  └─────────┘      └─────────┘

INNER JOIN              LEFT JOIN               RIGHT JOIN
(intersection)          (all of A)              (all of B)
┌───┬───────┬──────┐   ┌───┬───────┬──────┐   ┌───┬───────┬──────┐
│ 1 │ Alice │ HR   │   │ 1 │ Alice │ HR   │   │ 1 │ Alice │ HR   │
└───┴───────┴──────┘   │ 2 │ Bob   │ NULL │   │ 3 │ NULL  │ Eng  │
                       │ 4 │ Carol │ NULL │   │ 5 │ NULL  │ Sales│
                       └───┴───────┴──────┘   └───┴───────┴──────┘

FULL OUTER JOIN         CROSS JOIN
(union)                 (cartesian product)
┌───┬───────┬──────┐   ┌───┬───────┬──────┐
│ 1 │ Alice │ HR   │   │ 1 │ Alice │ HR   │
│ 2 │ Bob   │ NULL │   │ 1 │ Alice │ Eng  │
│ 4 │ Carol │ NULL │   │ 1 │ Alice │ Sales│
│ 3 │ NULL  │ Eng  │   │ 2 │ Bob   │ HR   │
│ 5 │ NULL  │ Sales│   │ 2 │ Bob   │ Eng  │
└───┴───────┴──────┘   │ 2 │ Bob   │ Sales│
                       │ 4 │ Carol │ HR   │
                       │ 4 │ Carol │ Eng  │
                       │ 4 │ Carol │ Sales│
                       └───┴───────┴──────┘
```

### JOIN Examples

```sql
-- INNER JOIN: employees with their department
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;

-- LEFT JOIN: all employees, even those without a department
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;

-- Self JOIN: find employees and their managers
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;

-- Multiple JOINs
SELECT e.name, d.dept_name, p.project_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
JOIN project_assignments pa ON e.emp_id = pa.emp_id
JOIN projects p ON pa.project_id = p.project_id;
```

### GROUP BY and HAVING

```sql
-- Count employees per department, only departments with 5+ employees
SELECT d.dept_name, COUNT(*) AS emp_count, AVG(e.salary) AS avg_salary
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
GROUP BY d.dept_name
HAVING COUNT(*) >= 5
ORDER BY avg_salary DESC;
```

### Subqueries

```sql
-- Scalar subquery: employees earning above average
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- IN subquery: employees in departments with open positions
SELECT name FROM employees
WHERE dept_id IN (
    SELECT dept_id FROM departments WHERE has_openings = TRUE
);

-- EXISTS subquery: departments that have at least one employee
SELECT dept_name FROM departments d
WHERE EXISTS (
    SELECT 1 FROM employees e WHERE e.dept_id = d.dept_id
);

-- Correlated subquery: employees earning more than their dept average
SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id
);
```

### UNION

```sql
-- UNION removes duplicates
SELECT name FROM employees
UNION
SELECT name FROM contractors;

-- UNION ALL keeps duplicates (faster)
SELECT name FROM employees
UNION ALL
SELECT name FROM contractors;
```

---

## Small Database Design

### Entity-Relationship Modeling

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Students   │        │  Enrollments │        │   Courses    │
├──────────────┤        ├──────────────┤        ├──────────────┤
│ PK student_id│───┐    │ PK enroll_id │    ┌───│ PK course_id │
│    name      │   └───→│ FK student_id│    │   │    title     │
│    email     │        │ FK course_id │←───┘   │    credits   │
│    gpa       │        │    grade     │        │ FK prof_id   │
└──────────────┘        │    semester  │        └──────┬───────┘
                        └──────────────┘               │
                                                       │
                                               ┌───────┴──────┐
                                               │  Professors  │
                                               ├──────────────┤
                                               │ PK prof_id   │
                                               │    name      │
                                               │    dept      │
                                               └──────────────┘
```

### Relationship Types

| Type | Example | Implementation |
|------|---------|---------------|
| **1:1** | User ↔ Profile | FK in either table (or merge tables) |
| **1:N** | Department → Employees | FK in the "many" table pointing to the "one" |
| **M:N** | Students ↔ Courses | Junction table (`Enrollments`) with two FKs |

### Design Steps

1. **Identify entities** — nouns in the requirements (Student, Course, Professor)
2. **Identify relationships** — verbs connecting entities (enrolls in, teaches)
3. **Determine cardinality** — 1:1, 1:N, or M:N
4. **Define attributes** — what data each entity needs
5. **Set primary keys** — unique identifier for each entity
6. **Add foreign keys** — enforce relationships
7. **Normalize** — apply normal forms to eliminate redundancy

---

## Large Database Design

### Indexing Strategies

```
Without index:   Full table scan → O(n)
With B-tree:     Binary search on index → O(log n)

┌─────────────────────────────────────────┐
│              B-TREE INDEX               │
│                                         │
│              [30 | 60]                  │
│             ╱    │    ╲                 │
│       [10|20]  [40|50]  [70|80|90]     │
│       ╱ │ ╲   ╱ │ ╲    ╱ │ ╲  ╲       │
│      → leaf nodes point to table rows   │
└─────────────────────────────────────────┘
```

| Index Type | Best For | Example |
|-----------|---------|---------|
| **B-tree** | Range queries, equality, sorting | `WHERE age > 25 AND age < 50` |
| **Hash** | Equality only | `WHERE email = 'user@example.com'` |
| **Composite** | Multi-column queries | `INDEX (last_name, first_name)` |
| **Covering** | Queries satisfied entirely by index | `SELECT name FROM users WHERE id = 5` |
| **Partial** | Queries on a subset of rows | `WHERE status = 'active'` (PostgreSQL) |

> **Covering index**: when all columns in a query are in the index, the database reads only the index without touching the table. This can dramatically speed up read-heavy queries.

### Partitioning

| Strategy | How | When |
|----------|-----|------|
| **Horizontal (sharding)** | Split rows across servers by key | Tables with billions of rows, distributed workloads |
| **Vertical** | Split columns into separate tables | Wide tables with seldom-accessed columns |
| **Range** | Partition by date/value range | Time-series data, logs |
| **Hash** | Partition by hash of key | Even distribution across nodes |
| **List** | Partition by explicit values | Regional data (`region IN ('US', 'EU')`) |

### Replication

| Type | Description | Use Case |
|------|-------------|----------|
| **Primary-Replica** | One writer, multiple readers | Read scaling, failover |
| **Multi-Primary** | Multiple writers | Geographic distribution |
| **Synchronous** | Replicas confirm before commit | Strong consistency |
| **Asynchronous** | Writer doesn't wait for replicas | Better write performance, eventual consistency |

---

## Interview Questions Overview

| # | Problem | Key Concept |
|---|---------|------------|
| 14.1 | **Multiple Apartments** | JOIN + GROUP BY + HAVING to find tenants renting multiple apartments |
| 14.2 | **Open Requests** | JOIN buildings and requests, filter on status |
| 14.3 | **Close All Requests** | UPDATE with subquery or JOIN |
| 14.4 | **Joins** | Explain INNER, LEFT, RIGHT, FULL — what each returns |
| 14.5 | **Denormalization** | Tradeoffs, when to use, impact on read/write performance |
| 14.6 | **Entity Relationship Diagram** | Draw ERD for a given scenario (e.g., school database) |
| 14.7 | **Design Grade Database** | Full schema design for a university grading system |

### Example: Multiple Apartments (14.1)

```sql
SELECT t.tenant_name, COUNT(*) AS apt_count
FROM tenants t
JOIN apt_tenants at ON t.tenant_id = at.tenant_id
GROUP BY t.tenant_id, t.tenant_name
HAVING COUNT(*) > 1;
```

### Example: Design Grade Database (14.7)

```sql
CREATE TABLE students (
    student_id  INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE
);

CREATE TABLE courses (
    course_id   INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    credits     INT NOT NULL,
    prof_id     INT REFERENCES professors(prof_id)
);

CREATE TABLE professors (
    prof_id     INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    department  VARCHAR(50)
);

CREATE TABLE enrollments (
    student_id  INT REFERENCES students(student_id),
    course_id   INT REFERENCES courses(course_id),
    semester    VARCHAR(20),
    grade       CHAR(2),
    PRIMARY KEY (student_id, course_id, semester)
);
```

---

## Query Optimization

### Using EXPLAIN

```sql
EXPLAIN ANALYZE
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
WHERE e.salary > 100000;
```

| EXPLAIN Output Term | Meaning |
|--------------------|---------|
| **Seq Scan** | Full table scan — no index used |
| **Index Scan** | Using index to find rows |
| **Index Only Scan** | All data from index (covering index) |
| **Nested Loop** | For each row in outer, scan inner |
| **Hash Join** | Build hash table on smaller table, probe with larger |
| **Merge Join** | Both sides sorted, merge in order |
| **Sort** | Explicit sort operation |
| **cost** | Estimated startup..total cost (arbitrary units) |
| **rows** | Estimated number of rows |
| **actual time** | Real execution time in milliseconds |

### Optimization Checklist

```
□ Add indexes on columns used in WHERE, JOIN, ORDER BY
□ Avoid SELECT * — select only needed columns
□ Use EXPLAIN to identify full table scans
□ Consider covering indexes for frequent queries
□ Rewrite correlated subqueries as JOINs when possible
□ Use EXISTS instead of IN for large subquery results
□ Avoid functions on indexed columns (breaks index usage)
□ Batch large UPDATE/DELETE operations
□ Monitor slow query log
```

---

## Transaction Isolation Levels

### ACID Properties

| Property | Meaning | Example |
|----------|---------|---------|
| **Atomicity** | All or nothing | Bank transfer: debit AND credit, or neither |
| **Consistency** | Valid state → valid state | Account balance never negative (if constrained) |
| **Isolation** | Concurrent transactions don't interfere | Two transfers from same account see correct balance |
| **Durability** | Committed data survives crashes | After commit, data is persisted to disk |

### Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|:----------:|:-------------------:|:------------:|:-----------:|
| **READ UNCOMMITTED** | ✓ possible | ✓ possible | ✓ possible | Fastest |
| **READ COMMITTED** | ✗ prevented | ✓ possible | ✓ possible | Fast |
| **REPEATABLE READ** | ✗ prevented | ✗ prevented | ✓ possible | Moderate |
| **SERIALIZABLE** | ✗ prevented | ✗ prevented | ✗ prevented | Slowest |

| Anomaly | Description |
|---------|-------------|
| **Dirty Read** | Reading uncommitted data from another transaction |
| **Non-Repeatable Read** | Same query returns different values within a transaction |
| **Phantom Read** | Same query returns different rows (new rows inserted by another txn) |

> Most databases default to READ COMMITTED (PostgreSQL, Oracle, SQL Server) or REPEATABLE READ (MySQL/InnoDB). Choose the lowest isolation level that meets your consistency requirements.

---

## CAP Theorem for Databases

In a distributed system, you can guarantee at most **two** of three properties:

```
              Consistency
                 ╱╲
                ╱  ╲
               ╱    ╲
              ╱  CA  ╲
             ╱________╲
            ╱╲        ╱╲
           ╱  ╲      ╱  ╲
          ╱ CP ╲    ╱ AP ╲
         ╱______╲  ╱______╲
    Partition         Availability
    Tolerance
```

| Category | Sacrifice | Examples |
|----------|----------|---------|
| **CA** | Partition tolerance (single node only) | Traditional RDBMS (PostgreSQL, MySQL) |
| **CP** | Availability during partition | MongoDB, HBase, Redis (in cluster mode) |
| **AP** | Consistency during partition | Cassandra, DynamoDB, CouchDB |

> In practice, network partitions **will** happen in distributed systems, so the real choice is between CP and AP. Most modern systems offer tunable consistency — you choose per operation.

---

## Quick Reference: SQL Patterns for Interviews

```sql
-- Top N per group (window function)
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
    FROM employees
) ranked WHERE rn <= 3;

-- Running total
SELECT date, amount,
       SUM(amount) OVER (ORDER BY date) AS running_total
FROM transactions;

-- Find duplicates
SELECT email, COUNT(*) FROM users
GROUP BY email HAVING COUNT(*) > 1;

-- Delete duplicates (keep lowest id)
DELETE FROM users WHERE id NOT IN (
    SELECT MIN(id) FROM users GROUP BY email
);

-- Pivot (conditional aggregation)
SELECT student_id,
    MAX(CASE WHEN subject = 'Math' THEN grade END) AS math,
    MAX(CASE WHEN subject = 'English' THEN grade END) AS english
FROM grades GROUP BY student_id;
```

> Database questions are about demonstrating structured thinking: clarify the schema, write correct SQL, then optimize. Always talk through your approach before writing the query.
