---
sidebar_position: 5
title: "04 — Spring Data Access"
slug: 04-spring-data-access
---

# 💾 Spring Data Access

Spring provides a layered data access strategy: **JdbcTemplate** for raw SQL control, **Spring Data JPA** for repository abstraction, and **declarative transaction management** that works across all approaches.

---

## 1. Spring's Data Access Philosophy

### The Problem Without Spring

```java
// ❌ Raw JDBC — verbose, error-prone, resource leak risk
public User findById(Long id) {
    Connection conn = null;
    PreparedStatement ps = null;
    ResultSet rs = null;
    try {
        conn = dataSource.getConnection();
        ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
        ps.setLong(1, id);
        rs = ps.executeQuery();
        if (rs.next()) {
            return mapRow(rs);
        }
        return null;
    } catch (SQLException e) {
        throw new RuntimeException(e); // checked exception wrapping
    } finally {
        if (rs != null) try { rs.close(); } catch (SQLException ignored) {}
        if (ps != null) try { ps.close(); } catch (SQLException ignored) {}
        if (conn != null) try { conn.close(); } catch (SQLException ignored) {}
    }
}
```

### Spring's Solution Layers

```
              Highest abstraction
┌─────────────────────────────────────┐
│       Spring Data JPA               │  Interfaces only — Spring generates SQL
│  (Repository<T, ID>)               │
├─────────────────────────────────────┤
│       JPA / Hibernate               │  Object-relational mapping
│  (EntityManager, JPQL)              │
├─────────────────────────────────────┤
│       JdbcTemplate / NamedParameterJdbcTemplate │  SQL with template callbacks
├─────────────────────────────────────┤
│       DataSource + Connection Pool  │  HikariCP (default in Spring Boot)
├─────────────────────────────────────┤
│       JDBC Driver                   │  Database-specific driver
└─────────────────────────────────────┘
              Lowest abstraction
```

### Exception Translation

Spring translates database-specific exceptions into a consistent hierarchy:

```
DataAccessException (unchecked — no try/catch needed)
├── NonTransientDataAccessException
│   ├── DataIntegrityViolationException    ← unique constraint, FK violation
│   ├── BadSqlGrammarException             ← syntax error
│   └── PermissionDeniedDataAccessException
├── TransientDataAccessException
│   ├── QueryTimeoutException              ← timeout, can retry
│   └── ConcurrencyFailureException        ← optimistic lock failure
└── RecoverableDataAccessException         ← connection lost, recoverable
```

:::tip Interview Insight
`@Repository` enables automatic exception translation. Spring wraps `SQLException` (checked) into `DataAccessException` (unchecked) — so your service layer doesn't need to handle database-specific exceptions or even know which database is used.
:::

---

## 2. JDBC vs JPA vs Spring Data — Deep Dive Comparison

These three terms are often confused because they build on top of each other. Think of them as layers of a cake — each adds convenience while using the layer below.

### 2.1 What Each One Actually Is

**JDBC (Java Database Connectivity)** — The foundation. A Java API (in `java.sql`) that provides the raw plumbing to talk to any relational database. It handles:
- Opening/closing database **connections**
- Sending **SQL statements** (queries, inserts, updates)
- Reading **result sets** row by row
- Managing **transactions** (commit/rollback)

Think of JDBC as the "steering wheel + pedals" — you control everything manually.

**JPA (Jakarta Persistence API)** — A **specification** (not a library!) that defines how to map Java objects to database tables. It provides:
- Annotations like `@Entity`, `@Table`, `@Column`, `@Id` to define mappings
- An `EntityManager` API to perform CRUD operations on objects
- JPQL (Java Persistence Query Language) — SQL-like but operates on objects, not tables
- Automatic dirty checking — change an object's field and JPA updates the DB for you

Hibernate is the most popular **implementation** of JPA. JPA is the spec; Hibernate is the engine.

**Spring Data** — A Spring project that sits on top of JPA (or other datastores) and eliminates even more boilerplate. You just write a **Java interface**, and Spring generates the entire implementation at runtime. It provides:
- `JpaRepository<T, ID>` with built-in CRUD + pagination
- **Derived queries** from method names (`findByEmailAndStatus(...)` → Spring writes the SQL)
- Support for custom `@Query` with JPQL or native SQL
- Works with JPA, MongoDB, Redis, Elasticsearch, Cassandra, etc.

### 2.2 How They Relate — The Layer Cake

```
 ┌───────────────────────────────────────────────────────────┐
 │  YOUR CODE                                                │
 │  userRepository.findByEmail("nam@example.com")            │
 ├───────────────────────────────────────────────────────────┤
 │  SPRING DATA JPA                                          │
 │  Generates implementation from interface method name       │
 │  → Creates JPQL: "SELECT u FROM User u WHERE u.email = ?" │
 ├───────────────────────────────────────────────────────────┤
 │  JPA (Hibernate)                                          │
 │  Translates JPQL → native SQL                             │
 │  Maps ResultSet rows → User objects                       │
 │  Manages entity state (new, managed, detached, removed)   │
 ├───────────────────────────────────────────────────────────┤
 │  JDBC                                                     │
 │  Opens connection from pool (HikariCP)                    │
 │  Sends: SELECT id, name, email FROM users WHERE email = ? │
 │  Returns ResultSet, closes resources                      │
 ├───────────────────────────────────────────────────────────┤
 │  DATABASE DRIVER (e.g., PostgreSQL JDBC Driver)           │
 │  Speaks the database's wire protocol over TCP              │
 └───────────────────────────────────────────────────────────┘
```

**Key insight**: JPA **uses** JDBC underneath. Spring Data **uses** JPA underneath. They're not alternatives — they're layers. When you call `userRepository.save(user)`, Spring Data delegates to JPA's `EntityManager.persist()`, which internally uses JDBC to execute an `INSERT` statement.

### 2.3 Same Task — Three Approaches

**Scenario**: Find all users with status "ACTIVE" and update their last login date.

**Approach 1: Pure JDBC (Spring JdbcTemplate)**

```java
@Repository
public class UserJdbcDao {

    private final JdbcTemplate jdbc;

    public UserJdbcDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<User> findActiveUsers() {
        return jdbc.query(
            "SELECT id, name, email, status, last_login FROM users WHERE status = ?",
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("status"),
                rs.getTimestamp("last_login").toLocalDateTime()
            ),
            "ACTIVE"
        );
    }

    public void updateLastLogin(Long userId, LocalDateTime loginTime) {
        jdbc.update(
            "UPDATE users SET last_login = ? WHERE id = ?",
            Timestamp.valueOf(loginTime), userId
        );
    }
}
```

You write the SQL, you map the columns, you control everything.

**Approach 2: JPA (EntityManager directly)**

```java
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;
}

@Repository
public class UserJpaDao {

    @PersistenceContext
    private EntityManager em;

    public List<User> findActiveUsers() {
        return em.createQuery(
            "SELECT u FROM User u WHERE u.status = :status", User.class)
            .setParameter("status", UserStatus.ACTIVE)
            .getResultList();
    }

    public void updateLastLogin(Long userId, LocalDateTime loginTime) {
        User user = em.find(User.class, userId);
        user.setLastLogin(loginTime);
        // No explicit save needed! JPA dirty-checks and auto-updates on flush
    }
}
```

No SQL for mapping — JPA knows `User.email` maps to `users.email` column. Change the object's field → JPA writes the `UPDATE` for you.

**Approach 3: Spring Data JPA (Interface only)**

```java
public interface UserRepository extends JpaRepository<User, Long> {

    List<User> findByStatus(UserStatus status);

    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :loginTime WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId,
                         @Param("loginTime") LocalDateTime loginTime);
}

// Usage in service — no implementation class needed!
@Service
public class UserService {
    private final UserRepository userRepository;

    public void refreshLogins() {
        List<User> active = userRepository.findByStatus(UserStatus.ACTIVE);
        active.forEach(u ->
            userRepository.updateLastLogin(u.getId(), LocalDateTime.now()));
    }
}
```

Zero boilerplate. `findByStatus` works because Spring parses the method name. No implementation class, no `EntityManager`, no SQL.

### 2.4 Comparison Table

| Aspect | JDBC (JdbcTemplate) | JPA (Hibernate) | Spring Data JPA |
|--------|---------------------|-----------------|-----------------|
| **What it is** | Low-level DB communication API | ORM specification (object ↔ table mapping) | Repository abstraction over JPA |
| **You write** | SQL + row mapping code | Entity annotations + JPQL queries | Interface methods only |
| **SQL control** | Full — you write every query | Partial — JPQL or let Hibernate generate | Minimal — derived from method names |
| **Object mapping** | Manual (`ResultSet` → Object) | Automatic via `@Entity`, `@Column` | Automatic (inherits from JPA) |
| **Performance tuning** | Easy — you see exactly what SQL runs | Harder — need to understand Hibernate's query generation | Hardest — abstraction hides SQL details |
| **Best for** | Complex queries, stored procs, legacy DBs, batch ops | Domain-driven design, complex entity relationships | CRUD-heavy apps, rapid development |
| **Dependencies** | `spring-boot-starter-jdbc` | `spring-boot-starter-data-jpa` | `spring-boot-starter-data-jpa` |
| **Transaction support** | Via `@Transactional` | Via `@Transactional` | Via `@Transactional` |

### 2.5 When to Use What

```
                           ┌─────────────────────────────────┐
                           │  "I need full SQL control and    │
                           │   maximum performance"           │
                           │        → JdbcTemplate            │
                           └─────────────────────────────────┘

  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
  │  "I have complex entity graphs  │   │  "I want rapid CRUD with        │
  │   and need lifecycle callbacks, │   │   minimal code, and my queries  │
  │   caching, dirty checking"      │   │   are simple (findBy..., save,  │
  │        → JPA (EntityManager)    │   │   delete, pagination)"          │
  └─────────────────────────────────┘   │        → Spring Data JPA        │
                                        └─────────────────────────────────┘
```

**Real-world pattern** (common in TLM services): Most teams use **Spring Data JPA** for standard CRUD and **JdbcTemplate** for complex reporting queries or batch operations — both in the same project. This is perfectly fine since they share the same `DataSource` and transaction manager.

```java
@Service
public class PaymentService {

    private final PaymentRepository paymentRepo;     // Spring Data JPA
    private final JdbcTemplate jdbc;                  // JdbcTemplate

    @Transactional(readOnly = true)
    public PaymentSummary getMonthlyReport(YearMonth month) {
        // Complex aggregation → JdbcTemplate gives full SQL control
        return jdbc.queryForObject(
            """
            SELECT COUNT(*) as total, SUM(amount) as volume,
                   AVG(processing_time_ms) as avg_latency
            FROM payments
            WHERE EXTRACT(YEAR FROM created_at) = ?
              AND EXTRACT(MONTH FROM created_at) = ?
              AND status = 'COMPLETED'
            """,
            (rs, i) -> new PaymentSummary(
                rs.getInt("total"), rs.getBigDecimal("volume"),
                rs.getDouble("avg_latency")
            ),
            month.getYear(), month.getMonthValue()
        );
    }

    @Transactional
    public Payment submitPayment(PaymentRequest request) {
        // Simple CRUD → Spring Data JPA is cleaner
        Payment payment = Payment.from(request);
        return paymentRepo.save(payment);
    }
}
```

### 2.6 The "Does JPA Include JDBC?" Question

Yes — JPA **depends on** JDBC but doesn't **replace** it.

```
     ┌────────────────────────────────────────────┐
     │              JPA (Hibernate)                │
     │                                             │
     │  ┌───────────────────────────────────────┐  │
     │  │  EntityManager.persist(user)           │  │
     │  │         ↓                              │  │
     │  │  Hibernate Session                     │  │
     │  │  • Dirty checking                      │  │
     │  │  • First-level cache                   │  │
     │  │  • Generates SQL from entity metadata  │  │
     │  └───────────────┬───────────────────────┘  │
     │                  ↓                          │
     │  ┌───────────────────────────────────────┐  │
     │  │  JDBC (used internally by Hibernate)  │  │
     │  │  • Connection pool (HikariCP)         │  │
     │  │  • PreparedStatement                  │  │
     │  │  • ResultSet processing               │  │
     │  │  • Transaction commit/rollback        │  │
     │  └───────────────────────────────────────┘  │
     └────────────────────────────────────────────┘
```

When you add `spring-boot-starter-data-jpa` to your project, it pulls in:
- **Hibernate** (JPA implementation)
- **JDBC** (Hibernate needs it to talk to the DB)
- **HikariCP** (connection pool)
- **Spring Data JPA** (repository abstraction)

So yes, adding one dependency gives you the entire stack. But you can still use `JdbcTemplate` directly alongside JPA — they share the same connection pool.

### 2.7 Spring Data Beyond JPA

Spring Data is not just for relational databases. The same repository pattern works across datastores:

| Module | Store | Repository Interface |
|--------|-------|---------------------|
| `spring-data-jpa` | SQL databases (PostgreSQL, MySQL, Oracle) | `JpaRepository<T, ID>` |
| `spring-data-mongodb` | MongoDB | `MongoRepository<T, ID>` |
| `spring-data-redis` | Redis | `CrudRepository<T, ID>` with `@RedisHash` |
| `spring-data-elasticsearch` | Elasticsearch | `ElasticsearchRepository<T, ID>` |
| `spring-data-cassandra` | Cassandra | `CassandraRepository<T, ID>` |
| `spring-data-r2dbc` | SQL (reactive) | `R2dbcRepository<T, ID>` |

Same `findBy...` method naming convention works everywhere. Switch from PostgreSQL to MongoDB? Change the dependency and annotations — the repository interface stays the same.

:::tip Interview Insight
When asked "What's the difference between JDBC, JPA, and Spring Data?", structure your answer as layers: **JDBC** is the low-level driver API that sends SQL to the database. **JPA** is a specification that adds ORM — mapping objects to tables so you don't write SQL manually. JPA uses JDBC underneath. **Spring Data** sits on top and lets you define just an interface — Spring generates the JPA code for you. They're not competing technologies; they're stacked abstractions, each reducing boilerplate further.
:::

---

## 3. JdbcTemplate

### Basic Operations

```java
@Repository
public class UserJdbcRepository {

    private final JdbcTemplate jdbc;

    public UserJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Query single object
    public User findById(Long id) {
        return jdbc.queryForObject(
            "SELECT id, name, email FROM users WHERE id = ?",
            this::mapRow, id
        );
    }

    // Query list
    public List<User> findAll() {
        return jdbc.query("SELECT id, name, email FROM users", this::mapRow);
    }

    // Query scalar
    public int countByStatus(String status) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE status = ?",
            Integer.class, status
        );
    }

    // Insert
    public int save(User user) {
        return jdbc.update(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            user.getName(), user.getEmail()
        );
    }

    // Update
    public int updateEmail(Long id, String email) {
        return jdbc.update(
            "UPDATE users SET email = ? WHERE id = ?", email, id
        );
    }

    // Delete
    public int deleteById(Long id) {
        return jdbc.update("DELETE FROM users WHERE id = ?", id);
    }

    // Batch insert
    public int[] batchInsert(List<User> users) {
        return jdbc.batchUpdate(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    ps.setString(1, users.get(i).getName());
                    ps.setString(2, users.get(i).getEmail());
                }
                @Override
                public int getBatchSize() { return users.size(); }
            }
        );
    }

    private User mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"));
    }
}
```

### NamedParameterJdbcTemplate

```java
@Repository
public class OrderJdbcRepository {

    private final NamedParameterJdbcTemplate namedJdbc;

    public OrderJdbcRepository(NamedParameterJdbcTemplate namedJdbc) {
        this.namedJdbc = namedJdbc;
    }

    public List<Order> findByStatusAndDate(String status, LocalDate date) {
        String sql = "SELECT * FROM orders WHERE status = :status AND order_date >= :date";
        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("status", status)
            .addValue("date", date);
        return namedJdbc.query(sql, params, this::mapRow);
    }
}
```

---

## 4. Spring Data JPA

### Entity Mapping

```java
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductImage> images = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Version
    private Integer version; // optimistic locking
}
```

### JPA Fetch Types

| Type | Default For | Behavior | Pitfall |
|------|-------------|----------|---------|
| `EAGER` | `@ManyToOne`, `@OneToOne` | Loaded immediately with parent | N+1 queries, excess data |
| `LAZY` | `@OneToMany`, `@ManyToMany` | Loaded on first access | `LazyInitializationException` outside session |

:::tip Interview Insight
**Always use `FetchType.LAZY`** for `@ManyToOne` and load eagerly only when needed via `JOIN FETCH` in JPQL. The N+1 query problem is the #1 JPA performance issue — interviewers love asking about it.
:::

### Repository Interface

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Derived query methods — Spring generates SQL from method name
    List<Product> findByStatus(ProductStatus status);
    List<Product> findByNameContainingIgnoreCase(String keyword);
    List<Product> findByPriceBetween(BigDecimal min, BigDecimal max);
    Optional<Product> findByNameAndStatus(String name, ProductStatus status);
    boolean existsByName(String name);
    long countByStatus(ProductStatus status);
    List<Product> findTop5ByOrderByCreatedAtDesc();

    // Custom JPQL
    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.status = :status")
    List<Product> findWithCategoryByStatus(@Param("status") ProductStatus status);

    // Native SQL
    @Query(value = "SELECT * FROM products WHERE price > ?1 ORDER BY price", nativeQuery = true)
    List<Product> findExpensiveProducts(BigDecimal threshold);

    // Modifying queries
    @Modifying
    @Query("UPDATE Product p SET p.status = :status WHERE p.id IN :ids")
    int bulkUpdateStatus(@Param("ids") List<Long> ids, @Param("status") ProductStatus status);

    // Projection
    @Query("SELECT p.name as name, p.price as price FROM Product p WHERE p.status = 'ACTIVE'")
    List<ProductSummary> findActiveProductSummaries();

    // Pagination
    Page<Product> findByStatus(ProductStatus status, Pageable pageable);
}

// Projection interface
public interface ProductSummary {
    String getName();
    BigDecimal getPrice();
}
```

### Repository Hierarchy

```
Repository<T, ID>               ← marker interface
    │
CrudRepository<T, ID>           ← basic CRUD: save, findById, delete, count
    │
ListCrudRepository<T, ID>       ← returns List instead of Iterable
    │
PagingAndSortingRepository      ← findAll(Pageable), findAll(Sort)
    │
JpaRepository<T, ID>            ← flush, saveAndFlush, deleteInBatch, getById
```

### Derived Query Method Keywords

| Keyword | SQL Equivalent | Example |
|---------|---------------|---------|
| `findBy` | `SELECT ... WHERE` | `findByEmail(String email)` |
| `And` | `AND` | `findByNameAndStatus(...)` |
| `Or` | `OR` | `findByNameOrEmail(...)` |
| `Between` | `BETWEEN` | `findByPriceBetween(min, max)` |
| `LessThan` / `GreaterThan` | `<` / `>` | `findByPriceGreaterThan(price)` |
| `Like` / `Containing` | `LIKE` | `findByNameContaining(str)` |
| `In` | `IN` | `findByStatusIn(List<Status>)` |
| `IsNull` / `IsNotNull` | `IS NULL` | `findByDeletedAtIsNull()` |
| `OrderBy` | `ORDER BY` | `findByStatusOrderByCreatedAtDesc(...)` |
| `Top` / `First` | `LIMIT` | `findTop10ByOrderByPriceDesc()` |
| `Distinct` | `DISTINCT` | `findDistinctByCategory(...)` |

---

## 5. N+1 Query Problem

### The Problem

```java
// Fetch 100 orders — 1 query
List<Order> orders = orderRepository.findAll();

// Access customer for each order — 100 additional queries!
orders.forEach(order -> System.out.println(order.getCustomer().getName()));
// Total: 1 + 100 = 101 queries 💀
```

### Solutions

```java
// Solution 1: JOIN FETCH (JPQL)
@Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.status = :status")
List<Order> findWithCustomerByStatus(@Param("status") OrderStatus status);

// Solution 2: @EntityGraph
@EntityGraph(attributePaths = {"customer", "orderItems"})
List<Order> findByStatus(OrderStatus status);

// Solution 3: @BatchSize (Hibernate)
@Entity
public class Customer {
    @OneToMany(mappedBy = "customer")
    @BatchSize(size = 25) // loads 25 related collections at once
    private List<Order> orders;
}

// Solution 4: DTO Projection (most efficient — no entity overhead)
@Query("SELECT new com.example.dto.OrderSummary(o.id, o.total, c.name) " +
       "FROM Order o JOIN o.customer c WHERE o.status = :status")
List<OrderSummary> findOrderSummaries(@Param("status") OrderStatus status);
```

---

## 6. Transaction Management

### Declarative Transactions with `@Transactional`

```java
@Service
public class TransferService {

    private final AccountRepository accountRepository;

    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId)
            .orElseThrow(() -> new AccountNotFoundException(fromId));
        Account to = accountRepository.findById(toId)
            .orElseThrow(() -> new AccountNotFoundException(toId));

        from.debit(amount);
        to.credit(amount);

        accountRepository.save(from);
        accountRepository.save(to);
        // If any step fails, entire transaction rolls back
    }
}
```

### `@Transactional` Attributes

| Attribute | Default | Purpose |
|-----------|---------|---------|
| `propagation` | `REQUIRED` | How to join/create transactions |
| `isolation` | `DEFAULT` (DB default) | Transaction isolation level |
| `readOnly` | `false` | Optimization hint for read-only queries |
| `timeout` | -1 (no timeout) | Transaction timeout in seconds |
| `rollbackFor` | `RuntimeException`, `Error` | Which exceptions trigger rollback |
| `noRollbackFor` | — | Which exceptions should NOT trigger rollback |

### Propagation Types

| Type | Behavior | Use Case |
|------|----------|----------|
| **REQUIRED** | Join existing Tx, or create new one | Default — most business methods |
| **REQUIRES_NEW** | Always create new Tx; suspend existing | Audit logging that must persist even if parent rolls back |
| **SUPPORTS** | Use existing Tx if available; else run without | Read methods that can work either way |
| **MANDATORY** | Must run within existing Tx; throw if none | Helper methods that should never be called standalone |
| **NOT_SUPPORTED** | Suspend existing Tx; run without | Long-running reads that shouldn't hold locks |
| **NEVER** | Throw if Tx exists | Methods that must not run within a transaction |
| **NESTED** | Savepoint within existing Tx | Batch processing — rollback one item without losing all |

### Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|:----------:|:-------------------:|:------------:|:-----------:|
| READ_UNCOMMITTED | ✅ Possible | ✅ Possible | ✅ Possible | Fastest |
| READ_COMMITTED | ❌ Prevented | ✅ Possible | ✅ Possible | Fast |
| REPEATABLE_READ | ❌ Prevented | ❌ Prevented | ✅ Possible | Moderate |
| SERIALIZABLE | ❌ Prevented | ❌ Prevented | ❌ Prevented | Slowest |

### Common `@Transactional` Pitfalls

```java
@Service
public class OrderService {

    // ❌ PITFALL 1: Self-invocation bypasses proxy
    public void processOrder(Long orderId) {
        // This calls the method directly, NOT through the proxy
        // @Transactional on updateStatus is IGNORED
        updateStatus(orderId, "PROCESSED");
    }

    @Transactional
    public void updateStatus(Long orderId, String status) { ... }

    // ✅ FIX: Inject self or move to separate bean
}

// ❌ PITFALL 2: Catching exceptions silently
@Transactional
public void riskyOperation() {
    try {
        dangerousMethod(); // throws RuntimeException
    } catch (Exception e) {
        log.error("Failed", e);
        // Transaction WON'T roll back — exception was swallowed
    }
}

// ❌ PITFALL 3: Checked exceptions don't trigger rollback by default
@Transactional // only rolls back on unchecked exceptions
public void process() throws IOException {
    // IOException (checked) → NO rollback by default
}

// ✅ FIX:
@Transactional(rollbackFor = Exception.class)
public void process() throws IOException { ... }
```

:::tip Interview Insight
The **self-invocation pitfall** is the most commonly asked `@Transactional` question. Spring uses proxies for transaction management — calling a `@Transactional` method from within the same class bypasses the proxy, so no transaction is started. Solutions: inject the bean into itself, use `AopContext.currentProxy()`, or extract the method into a separate `@Service`.
:::

---

## 7. Connection Pooling

Spring Boot auto-configures **HikariCP** (the fastest JDBC connection pool).

### Key Configuration

```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.leak-detection-threshold=60000
```

| Property | Default | Guidance |
|----------|---------|----------|
| `maximum-pool-size` | 10 | Threads needing DB access simultaneously; start at 10, increase based on profiling |
| `minimum-idle` | Same as max | Keep equal to max for consistent performance |
| `connection-timeout` | 30s | Time to wait for a connection from pool |
| `max-lifetime` | 30min | Should be shorter than DB's wait_timeout |
| `leak-detection-threshold` | 0 (disabled) | Set to ~60s in dev to detect connection leaks |

---

## 8. Auditing

```java
@Configuration
@EnableJpaAuditing
public class JpaConfig {
    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext())
            .map(SecurityContext::getAuthentication)
            .map(Authentication::getName);
    }
}

@Entity
@EntityListeners(AuditingEntityListener.class)
public class Product {
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}
```

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| Data access layers | JdbcTemplate → JPA → Spring Data JPA — each adds abstraction |
| Exception translation | `@Repository` converts checked `SQLException` → unchecked `DataAccessException` |
| JdbcTemplate | Eliminates boilerplate; handles connection management and exception translation |
| Spring Data JPA | Define interface, Spring generates implementation; derived queries from method names |
| N+1 problem | `JOIN FETCH`, `@EntityGraph`, `@BatchSize`, or DTO projection |
| `@Transactional` | Proxy-based; default rollback on unchecked exceptions only |
| Propagation | `REQUIRED` (default) vs `REQUIRES_NEW` (independent) vs `NESTED` (savepoint) |
| Self-invocation trap | Same-class calls bypass proxy → no transaction |
| `readOnly = true` | Performance hint — avoids dirty checking, may use read replica |
| HikariCP | Default pool; `maximum-pool-size` = 10; equal to `minimum-idle` |
