---
sidebar_position: 10
title: "09 — Common Interview Questions"
slug: 09-interview-questions
---

# 🎯 Common Interview Questions

50+ Spring interview questions with detailed answers, organized by topic. Each answer includes the depth expected at senior-level interviews — concepts, trade-offs, and code examples.

---

## 1. Spring Core Questions

### Q1: What is Inversion of Control (IoC) and how does Spring implement it?

**Answer:**

IoC is a design principle where the **framework** controls object creation and lifecycle, instead of the application code. The traditional flow (application creates dependencies) is "inverted" — the container creates objects and injects dependencies.

Spring implements IoC primarily through **Dependency Injection (DI)**:

```java
// Without IoC — tight coupling
public class OrderService {
    private PaymentGateway gateway = new StripeGateway(); // hard-coded
}

// With IoC — Spring injects the dependency
@Service
public class OrderService {
    private final PaymentGateway gateway;
    public OrderService(PaymentGateway gateway) { // injected by container
        this.gateway = gateway;
    }
}
```

**Key benefits:** testability (pass mocks), loose coupling (depend on interfaces), centralized configuration (bean definitions in one place).

**IoC is broader than DI** — it also includes lifecycle management (`@PostConstruct`, `@PreDestroy`), event publishing (`ApplicationEventPublisher`), and resource management.

---

### Q2: What are the differences between `BeanFactory` and `ApplicationContext`?

**Answer:**

Both are IoC containers, but `ApplicationContext` is a superset of `BeanFactory`:

| Feature | `BeanFactory` | `ApplicationContext` |
|---------|---------------|---------------------|
| Bean instantiation | Lazy (on first request) | Eager (at startup — catches config errors early) |
| Event publishing | ❌ | ✅ `ApplicationEventPublisher` |
| Internationalization | ❌ | ✅ `MessageSource` |
| AOP integration | ❌ | ✅ Automatic proxy creation |
| `@PostConstruct` / `@PreDestroy` | ❌ | ✅ |
| Environment abstraction | ❌ | ✅ Profiles, `@Conditional` |

**When to use `BeanFactory`:** Almost never. Only in extreme memory-constrained environments (embedded systems). Modern Spring applications always use `ApplicationContext`.

---

### Q3: Explain the Spring Bean lifecycle.

**Answer:**

```
1. Instantiation (constructor)
2. Dependency Injection (@Autowired, constructor params)
3. Aware interfaces (BeanNameAware, ApplicationContextAware)
4. BeanPostProcessor.postProcessBeforeInitialization()
5. @PostConstruct
6. InitializingBean.afterPropertiesSet()
7. Custom init-method
8. BeanPostProcessor.postProcessAfterInitialization()
   ── Bean is ready ──
9. @PreDestroy
10. DisposableBean.destroy()
11. Custom destroy-method
```

**The critical insight:** `BeanPostProcessor.postProcessAfterInitialization()` is where Spring creates proxies. This is why `@Transactional`, `@Async`, and `@Cacheable` work — the BeanPostProcessor wraps the original bean in a proxy that adds the cross-cutting behavior.

**Practical usage:** Use `@PostConstruct` for initialization that requires injected dependencies (cache warming, connection validation). Use `@PreDestroy` for cleanup (closing connections, flushing buffers).

---

### Q4: What is the difference between `@Component`, `@Service`, `@Repository`, and `@Controller`?

**Answer:**

All four are stereotype annotations that mark a class as a Spring-managed bean. The functional difference:

| Annotation | Semantic | Extra Behavior |
|-----------|----------|----------------|
| `@Component` | Generic bean | None |
| `@Service` | Business logic | None (documentation only) |
| `@Repository` | Data access | **Exception translation** — wraps `SQLException` into `DataAccessException` |
| `@Controller` | Web controller | Enables `@RequestMapping` processing by `DispatcherServlet` |

**Why the distinction matters:**
- `@Repository` provides real technical value (exception translation)
- `@Controller` enables web request handling
- `@Service` is purely semantic — it communicates intent to developers

**Best practice:** Use the most specific annotation. It documents the architectural layer and enables layer-specific tooling (e.g., `@WebMvcTest` only loads `@Controller` beans).

---

### Q5: Explain Constructor Injection vs Setter Injection vs Field Injection.

**Answer:**

| Aspect | Constructor | Setter | Field |
|--------|------------|--------|-------|
| Immutability | ✅ Fields can be `final` | ❌ | ❌ |
| Required deps | ✅ Cannot create without them | ❌ Optional by nature | ❌ |
| Testability | ✅ `new Service(mockRepo)` | ⚠️ Need setters | ❌ Need reflection |
| Circular deps | ❌ Fails fast (good!) | ✅ Can resolve | ✅ Can resolve |

**Constructor injection is always preferred** (recommended by Spring team and Rod Johnson). Use setter injection only for truly optional dependencies. Avoid field injection in production code — it hides dependencies and makes testing difficult.

```java
// ✅ Constructor injection
@Service
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }
}

// ❌ Field injection — don't do this
@Service
public class OrderService {
    @Autowired private OrderRepository repo;
}
```

---

### Q6: What happens when there are multiple beans of the same type? How does Spring resolve ambiguity?

**Answer:**

Resolution order:
1. **`@Qualifier("beanName")`** — explicit selection
2. **`@Primary`** — marks one bean as the default
3. **Parameter name matching** — matches parameter name to bean name
4. If none match → `NoUniqueBeanDefinitionException`

```java
@Bean("stripe") public PaymentGateway stripe() { return new StripeGateway(); }
@Bean("paypal") @Primary public PaymentGateway paypal() { return new PayPalGateway(); }

// Gets PayPal (it's @Primary)
public OrderService(PaymentGateway gateway) { ... }

// Gets Stripe (explicit @Qualifier)
public OrderService(@Qualifier("stripe") PaymentGateway gateway) { ... }

// Gets Stripe (parameter name matches bean name)
public OrderService(PaymentGateway stripe) { ... }
```

---

### Q7: What is the prototype-in-singleton problem and how do you solve it?

**Answer:**

When a prototype-scoped bean is injected into a singleton, the prototype is created **once** at singleton initialization and reused for the singleton's entire lifetime — defeating the purpose of prototype scope.

```java
@Component @Scope("prototype")
public class ShoppingCart { /* should be unique per use */ }

@Service // singleton — created once
public class CheckoutService {
    @Autowired private ShoppingCart cart; // ❌ same cart instance forever
}
```

**Solutions:**

```java
// 1. ObjectProvider (recommended)
@Service
public class CheckoutService {
    private final ObjectProvider<ShoppingCart> cartProvider;
    public void checkout() {
        ShoppingCart cart = cartProvider.getObject(); // new instance each time
    }
}

// 2. @Lookup method
@Service
public abstract class CheckoutService {
    @Lookup
    protected abstract ShoppingCart getCart(); // Spring overrides this
}

// 3. Provider<T> (JSR-330)
@Service
public class CheckoutService {
    private final Provider<ShoppingCart> cartProvider;
    public void checkout() {
        ShoppingCart cart = cartProvider.get();
    }
}
```

---

## 2. Spring Boot Questions

### Q8: What is Spring Boot auto-configuration and how does it work?

**Answer:**

Auto-configuration automatically configures Spring beans based on:
1. **Classpath contents** — which JARs are present
2. **Existing bean definitions** — what the user has already configured
3. **Property values** — what's set in application.properties

**Mechanism:**
- `@EnableAutoConfiguration` triggers `AutoConfigurationImportSelector`
- It reads `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
- Each auto-config class has `@Conditional` annotations
- **User-defined beans always win** — auto-config backs off via `@ConditionalOnMissingBean`

**Example:** If Jackson is on the classpath and no `ObjectMapper` bean exists, `JacksonAutoConfiguration` creates a default `ObjectMapper`. If you define your own `@Bean ObjectMapper`, the auto-config backs off.

**Debugging:** Set `debug=true` in properties to see the CONDITIONS EVALUATION REPORT.

---

### Q9: What is the difference between `@SpringBootApplication`, `@EnableAutoConfiguration`, and `@ComponentScan`?

**Answer:**

`@SpringBootApplication` is a convenience composite:

```java
@SpringBootApplication
// equivalent to:
@Configuration               // this class can define @Bean methods
@EnableAutoConfiguration      // activate auto-configuration
@ComponentScan                // scan current package + sub-packages
```

- `@Configuration` — marks the class as a source of bean definitions
- `@EnableAutoConfiguration` — triggers the auto-configuration mechanism
- `@ComponentScan` — finds `@Component`, `@Service`, `@Controller`, etc.

**Critical detail:** `@ComponentScan` scans from the annotated class's package downward. Place your main class in the root package to ensure all sub-packages are scanned.

---

### Q10: What is `@ConfigurationProperties` and why is it better than `@Value`?

**Answer:**

| Aspect | `@Value` | `@ConfigurationProperties` |
|--------|---------|---------------------------|
| Type safety | ❌ String-based | ✅ Typed POJOs |
| Validation | ❌ None | ✅ `@Validated` + Bean Validation |
| IDE support | ❌ No auto-complete | ✅ Auto-complete via metadata |
| Grouping | ❌ Individual fields | ✅ Grouped by prefix |
| Relaxed binding | ❌ Exact match | ✅ `my-property` = `myProperty` = `MY_PROPERTY` |
| Immutable | ❌ | ✅ Record-based config (`@ConstructorBinding`) |

```java
// @Value — scattered, no validation
@Value("${mail.host}") private String host;
@Value("${mail.port:587}") private int port;

// @ConfigurationProperties — grouped, validated, typed
@ConfigurationProperties(prefix = "mail")
@Validated
public record MailProperties(
    @NotBlank String host,
    @Min(1) @Max(65535) int port,
    @NotBlank String username
) {}
```

---

### Q11: How does Spring Boot decide which embedded server to use?

**Answer:**

Based on classpath:
- `spring-boot-starter-web` → **Tomcat** (default)
- Exclude Tomcat + add `spring-boot-starter-jetty` → **Jetty**
- Exclude Tomcat + add `spring-boot-starter-undertow` → **Undertow**
- `spring-boot-starter-webflux` (without starter-web) → **Netty** (reactive)

All are embedded — no WAR deployment needed. The `SpringApplication.run()` method starts the embedded server, deploys `DispatcherServlet`, and begins accepting requests.

---

## 3. Spring MVC Questions

### Q12: Explain the Spring MVC request processing flow.

**Answer:**

```
1. Client sends HTTP request
2. DispatcherServlet receives it (front controller pattern)
3. HandlerMapping finds the matching controller method
4. HandlerAdapter resolves method arguments (@PathVariable, @RequestBody, etc.)
5. Controller method executes, returns:
   - String (view name) → ViewResolver → View → HTML response
   - Object (@RestController) → HttpMessageConverter → JSON/XML response
6. DispatcherServlet sends the response
```

**On exceptions:** `HandlerExceptionResolver` chain processes the error. `@ControllerAdvice` with `@ExceptionHandler` methods are the standard approach.

---

### Q13: What is the difference between `@Controller` and `@RestController`?

**Answer:**

```java
// @Controller — returns view names
@Controller
public class PageController {
    @GetMapping("/home")
    public String home(Model model) {
        model.addAttribute("message", "Hello");
        return "home"; // → ViewResolver → home.html
    }
}

// @RestController = @Controller + @ResponseBody on every method
@RestController
public class ApiController {
    @GetMapping("/api/data")
    public Data getData() {
        return new Data("hello"); // → Jackson → {"value": "hello"}
    }
}
```

`@RestController` bypasses `ViewResolver` entirely — return values are serialized to the response body via `HttpMessageConverter` (Jackson for JSON).

---

### Q14: How do you handle exceptions globally in Spring MVC?

**Answer:**

Use `@RestControllerAdvice` (or `@ControllerAdvice`) with `@ExceptionHandler`:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a,b) -> a));
        return new ErrorResponse("VALIDATION_FAILED", "Invalid request", errors);
    }
}
```

**Priority:** Method-level `@ExceptionHandler` → Class-level → `@ControllerAdvice` → `HandlerExceptionResolver` → `/error` page.

---

### Q15: What is `ResponseEntity` and when would you use it?

**Answer:**

`ResponseEntity<T>` gives full control over HTTP status code, headers, and body:

```java
@GetMapping("/{id}")
public ResponseEntity<Product> getProduct(@PathVariable Long id) {
    return productService.findById(id)
        .map(p -> ResponseEntity.ok()
            .header("X-Version", "v1")
            .cacheControl(CacheControl.maxAge(30, TimeUnit.MINUTES))
            .body(p))
        .orElse(ResponseEntity.notFound().build());
}

@PostMapping
public ResponseEntity<Product> create(@RequestBody ProductRequest req) {
    Product created = productService.create(req);
    URI location = URI.create("/api/products/" + created.getId());
    return ResponseEntity.created(location).body(created); // 201 + Location header
}
```

Use `ResponseEntity` when you need to set custom status codes (201, 204, 302) or add custom headers. For simple 200 responses, direct return values are cleaner.

---

### Q16: Explain `@PathVariable` vs `@RequestParam` vs `@RequestBody`.

**Answer:**

| Annotation | Source | Example URL | Code |
|-----------|--------|-------------|------|
| `@PathVariable` | URI path segment | `/users/42` | `@GetMapping("/users/{id}") void get(@PathVariable Long id)` |
| `@RequestParam` | Query string | `/users?role=admin&page=1` | `void list(@RequestParam String role, @RequestParam int page)` |
| `@RequestBody` | HTTP request body | `POST /users` with JSON body | `void create(@RequestBody UserRequest req)` |

**`@RequestParam`** is for filtering, sorting, pagination. **`@PathVariable`** is for identifying specific resources. **`@RequestBody`** is for receiving structured payloads (JSON/XML).

---

## 4. Spring Data & Transaction Questions

### Q17: What is the N+1 query problem and how do you solve it?

**Answer:**

**The problem:** Loading a parent entity triggers 1 query for the parent, then N additional queries for each child relationship.

```java
List<Order> orders = orderRepo.findAll(); // 1 query: SELECT * FROM orders
for (Order o : orders) {
    o.getCustomer().getName(); // N queries: SELECT * FROM customers WHERE id = ?
}
// Total: 1 + N queries
```

**Solutions (ranked by preference):**

1. **`JOIN FETCH`** — single query, loads everything:
   ```java
   @Query("SELECT o FROM Order o JOIN FETCH o.customer")
   List<Order> findAllWithCustomers();
   ```

2. **`@EntityGraph`** — declarative, reusable:
   ```java
   @EntityGraph(attributePaths = {"customer"})
   List<Order> findAll();
   ```

3. **`@BatchSize(size = 25)`** — loads 25 related entities at once (Hibernate-specific)

4. **DTO Projection** — most efficient, no entities at all:
   ```java
   @Query("SELECT new com.example.dto.OrderSummary(o.id, c.name) FROM Order o JOIN o.customer c")
   List<OrderSummary> findSummaries();
   ```

---

### Q18: Explain `@Transactional` — how does it work and what are common pitfalls?

**Answer:**

**How it works:** Spring creates a **proxy** around the bean. When a `@Transactional` method is called through the proxy, it:
1. Gets a database connection from the pool
2. Sets auto-commit to false
3. Executes the method
4. Commits on success, rolls back on `RuntimeException` or `Error`
5. Returns the connection to the pool

**Common pitfalls:**

1. **Self-invocation:** Calling a `@Transactional` method from within the same class bypasses the proxy → no transaction:
   ```java
   public void process() {
       updateStatus(); // ❌ direct call, not through proxy
   }
   @Transactional public void updateStatus() { ... }
   ```

2. **Checked exceptions don't roll back** by default:
   ```java
   @Transactional // only rolls back on RuntimeException
   public void process() throws IOException { ... } // IOException won't roll back
   // Fix: @Transactional(rollbackFor = Exception.class)
   ```

3. **Swallowing exceptions:**
   ```java
   @Transactional
   public void process() {
       try { riskyMethod(); }
       catch (Exception e) { log.error(e); } // ❌ tx won't roll back
   }
   ```

4. **Private methods:** `@Transactional` on private methods is ignored (proxy can't intercept).

---

### Q19: What are the different transaction propagation levels?

**Answer:**

| Propagation | Behavior |
|-------------|----------|
| `REQUIRED` (default) | Join existing tx; create new if none exists |
| `REQUIRES_NEW` | Always create new tx; suspend existing |
| `SUPPORTS` | Use tx if one exists; run without tx otherwise |
| `MANDATORY` | Must run within tx; throw if none exists |
| `NOT_SUPPORTED` | Suspend existing tx; run without tx |
| `NEVER` | Throw if tx exists |
| `NESTED` | Create savepoint in existing tx; run in new tx if none exists |

**Real-world usage:**
- `REQUIRED` — 95% of business methods
- `REQUIRES_NEW` — audit logging that must persist even if parent tx rolls back
- `NESTED` — batch processing where one item failure shouldn't roll back everything

---

### Q20: What is the difference between `JpaRepository` and `CrudRepository`?

**Answer:**

```
Repository<T, ID>           ← marker interface
    │
CrudRepository<T, ID>       ← save, findById, delete, count, existsById
    │
ListCrudRepository<T, ID>   ← same but returns List instead of Iterable
    │
PagingAndSortingRepository  ← + findAll(Pageable), findAll(Sort)
    │
JpaRepository<T, ID>        ← + flush, saveAndFlush, deleteInBatch, getById,
                                 findAll(Example), getReferenceById
```

**Use `JpaRepository`** in most cases — it adds JPA-specific operations like `flush()`, batch deletes, and the `Example` query API.

---

## 5. Spring Security Questions

### Q21: How does Spring Security work internally?

**Answer:**

Spring Security is implemented as a chain of **servlet filters** that execute before the request reaches `DispatcherServlet`:

```
HTTP Request → SecurityFilterChain → DispatcherServlet → Controller
```

Key filters (in order):
1. `SecurityContextPersistenceFilter` — restores `SecurityContext` from session
2. `CsrfFilter` — validates CSRF token
3. `UsernamePasswordAuthenticationFilter` — processes form login
4. `BasicAuthenticationFilter` — processes HTTP Basic auth
5. `BearerTokenAuthenticationFilter` — processes JWT/OAuth2 tokens
6. `AuthorizationFilter` — checks URL-based access rules
7. `ExceptionTranslationFilter` — converts security exceptions to HTTP responses

**Authentication flow:** Filter extracts credentials → `AuthenticationManager.authenticate()` → `AuthenticationProvider.authenticate()` → `UserDetailsService.loadUserByUsername()` → `PasswordEncoder.matches()` → success: store in `SecurityContextHolder`.

---

### Q22: What is the difference between `hasRole()` and `hasAuthority()`?

**Answer:**

They are functionally identical, with one difference: `hasRole("ADMIN")` automatically prepends `ROLE_` prefix, so it checks for `ROLE_ADMIN`. `hasAuthority("ROLE_ADMIN")` checks the exact string.

```java
.requestMatchers("/admin/**").hasRole("ADMIN")       // checks ROLE_ADMIN
.requestMatchers("/admin/**").hasAuthority("ROLE_ADMIN") // same thing
.requestMatchers("/delete/**").hasAuthority("DELETE_PRIVILEGE") // fine-grained
```

**Convention:** Use `hasRole()` for broad role categories. Use `hasAuthority()` for fine-grained permissions that don't follow the `ROLE_` convention.

---

### Q23: How do you implement JWT authentication in Spring Security?

**Answer:**

1. Create a `JwtAuthenticationFilter` extending `OncePerRequestFilter`
2. In `doFilterInternal()`: extract token from `Authorization: Bearer ...` header
3. Validate the token (signature, expiration, claims)
4. Load `UserDetails` from the token's subject (username)
5. Create `UsernamePasswordAuthenticationToken` and set in `SecurityContextHolder`
6. Register the filter **before** `UsernamePasswordAuthenticationFilter`
7. Set session policy to `STATELESS` and disable CSRF (no cookies)

```java
http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
    .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
    .csrf(csrf -> csrf.disable());
```

---

### Q24: When should you disable CSRF protection?

**Answer:**

| Scenario | CSRF | Reason |
|----------|------|--------|
| Stateless REST API with JWT in `Authorization` header | ❌ Disable | No cookies → no CSRF risk |
| Server-rendered HTML with session cookies | ✅ Enable | Browser auto-attaches cookies |
| REST API with cookie-based auth | ✅ Enable | Cookies are vulnerable to CSRF |
| Mobile app API | ❌ Disable | No browser = no CSRF risk |

CSRF attacks exploit the browser's automatic cookie attachment. If authentication is via headers (not cookies), CSRF protection is unnecessary.

---

## 6. Spring AOP Questions

### Q25: What is AOP and what problems does it solve?

**Answer:**

AOP (Aspect-Oriented Programming) modularizes **cross-cutting concerns** — behavior that affects multiple classes but doesn't belong in any single class: logging, security, transactions, caching, retry, metrics.

**Without AOP:**
```java
public Order placeOrder(OrderRequest req) {
    log.info("Entering placeOrder");              // logging
    securityCheck(req);                            // security
    Transaction tx = txManager.begin();            // transaction
    try {
        long start = System.nanoTime();            // metrics
        Order order = doPlaceOrder(req);
        txManager.commit(tx);
        log.info("placeOrder took {}ms", elapsed); // metrics
        return order;
    } catch (Exception e) {
        txManager.rollback(tx);
        log.error("placeOrder failed", e);
        throw e;
    }
}
```

**With AOP:** All that cross-cutting code is extracted into aspects. The business method contains only business logic:
```java
@Transactional @Audited @Timed
public Order placeOrder(OrderRequest req) {
    return doPlaceOrder(req); // pure business logic
}
```

---

### Q26: What is the difference between Spring AOP and AspectJ?

**Answer:**

| Feature | Spring AOP | AspectJ |
|---------|-----------|---------|
| Weaving | Runtime (proxy-based) | Compile-time or load-time |
| Join points | Method execution only | Everything (fields, constructors, etc.) |
| Self-invocation | ❌ Not intercepted | ✅ Intercepted |
| Final classes | ❌ Cannot proxy | ✅ Can weave |
| Performance | Slight overhead per call | Near-zero after weaving |
| Setup | Zero config | Requires compiler or agent |

**Use AspectJ when:** You need to intercept field access, constructors, self-invocations, or final classes, or when AOP performance is critical.

---

### Q27: Why doesn't `@Transactional` work on self-invocation?

**Answer:**

Spring AOP uses **proxies**. When external code calls `orderService.updateStatus()`, the call goes through the proxy which starts a transaction. But when `processOrder()` calls `this.updateStatus()` internally, `this` is the **target object**, not the proxy — so the AOP advice (transaction) is bypassed.

```
External call:  caller → proxy → target.updateStatus() ← TX works ✅
Self-invocation: target.processOrder() → target.updateStatus() ← TX skipped ❌
```

**Solutions:**
1. Move the method to a separate `@Service`
2. Inject the bean into itself (`@Lazy` to break circular reference)
3. Use `AopContext.currentProxy()` (discouraged — couples code to Spring)
4. Switch to AspectJ load-time weaving

---

## 7. Spring Boot Microservices Questions

### Q28: What is the Circuit Breaker pattern and how does Resilience4j implement it?

**Answer:**

The Circuit Breaker prevents cascading failures in distributed systems. It wraps calls to external services and monitors failure rates.

**States:**
- **CLOSED** — requests flow normally; failures are counted
- **OPEN** — all requests immediately fail (fallback); downstream service gets time to recover
- **HALF-OPEN** — limited test requests; if they succeed, close the circuit; if they fail, reopen

```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "fallback")
public PaymentResult charge(PaymentRequest req) {
    return restClient.post().uri("/charge").body(req).retrieve().body(PaymentResult.class);
}

private PaymentResult fallback(PaymentRequest req, Throwable t) {
    return PaymentResult.queued(req.getOrderId()); // graceful degradation
}
```

**Key configuration:** `slidingWindowSize`, `failureRateThreshold`, `waitDurationInOpenState`, `permittedNumberOfCallsInHalfOpenState`.

---

### Q29: What is the difference between Eureka and Kubernetes service discovery?

**Answer:**

| Aspect | Eureka | Kubernetes |
|--------|--------|------------|
| Type | Client-side discovery | Server-side discovery (DNS/kube-proxy) |
| Registration | Application registers itself | Platform auto-registers pods |
| Health checks | Application heartbeat | Kubernetes liveness/readiness probes |
| Load balancing | Client-side (Spring Cloud LoadBalancer) | kube-proxy (iptables/IPVS) |
| Infrastructure | Dedicated Eureka server | Built into Kubernetes |

**When to use Eureka:** Running on VMs or bare metal without Kubernetes. **When to use Kubernetes:** Running in Kubernetes — use native discovery, don't add Eureka.

---

### Q30: How does Spring Cloud Config work?

**Answer:**

1. **Config Server** stores configuration in a Git repository (or Vault, filesystem)
2. **Config Clients** (microservices) fetch their config from the server at startup
3. Naming convention: `{application}-{profile}.yml` → `order-service-prod.yml`
4. **Refresh:** `POST /actuator/refresh` reloads `@RefreshScope` beans without restart
5. **Encryption:** Config Server can encrypt sensitive properties (`{cipher}...`)

**Config resolution order:** `order-service-prod.yml` > `order-service.yml` > `application-prod.yml` > `application.yml`

---

## 8. Spring Testing Questions

### Q31: What is the difference between `@SpringBootTest` and `@WebMvcTest`?

**Answer:**

| Aspect | `@SpringBootTest` | `@WebMvcTest` |
|--------|-------------------|---------------|
| Context | Full application context | Web layer only (controllers, filters, advice) |
| Beans loaded | All beans | Only web-related beans |
| Speed | Slow | Fast |
| Database | Real or embedded | None |
| Use case | Integration tests | Controller unit tests |
| HTTP | `TestRestTemplate` (real server) or `MockMvc` (mock) | `MockMvc` only |

**Rule:** Use `@WebMvcTest` for testing controllers in isolation (mock services with `@MockitoBean`). Use `@SpringBootTest` for end-to-end integration tests.

---

### Q32: How do you test a REST controller with MockMvc?

**Answer:**

```java
@WebMvcTest(ProductController.class)
class ProductControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private ProductService productService;

    @Test
    void getProduct_returns200() throws Exception {
        when(productService.findById(1L)).thenReturn(new ProductDto(1L, "Laptop", 999.99));

        mockMvc.perform(get("/api/products/1").accept(APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Laptop"))
            .andExpect(jsonPath("$.price").value(999.99));
    }
}
```

**Key assertions:** `status()`, `jsonPath()`, `header()`, `content()`, `cookie()`.

---

### Q33: What are Testcontainers and when should you use them?

**Answer:**

Testcontainers run real Docker containers (PostgreSQL, Redis, Kafka, etc.) during tests, replacing mocks and in-memory databases.

**Use when:**
- H2 doesn't support your database-specific features (JSON columns, window functions)
- You need to test against the actual database in CI/CD
- You're testing integration with message brokers (Kafka, RabbitMQ)
- You want confidence that your queries work on the production database engine

```java
@Container
@ServiceConnection // Spring Boot 3.1+ — auto-wires DataSource
static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");
```

---

## 9. Architecture & Design Questions

### Q34: How would you structure a Spring Boot application?

**Answer:**

**Package by feature** (preferred) or package by layer:

```
// ✅ Package by feature (recommended)
com.example.myapp/
├── order/
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   ├── Order.java (entity)
│   ├── OrderDto.java
│   └── OrderMapper.java
├── product/
│   ├── ProductController.java
│   ├── ProductService.java
│   └── ...
├── user/
│   └── ...
└── common/
    ├── exception/
    ├── config/
    └── security/
```

**Why package by feature:** Higher cohesion (related classes are together), easier to navigate, easier to extract into microservices later, supports access modifiers (package-private by default).

---

### Q35: What is the difference between `@RequestMapping` and `@GetMapping`?

**Answer:**

`@GetMapping` is a composed annotation — a shortcut for `@RequestMapping(method = RequestMethod.GET)`:

```java
// These are equivalent:
@RequestMapping(value = "/users", method = RequestMethod.GET)
@GetMapping("/users")

// Other shortcuts:
@PostMapping    // method = POST
@PutMapping     // method = PUT
@PatchMapping   // method = PATCH
@DeleteMapping  // method = DELETE
```

Use the shortcuts for readability. Use `@RequestMapping` at the class level for path prefix, and when you need to map multiple HTTP methods to the same handler.

---

### Q36: What design patterns does Spring use internally?

**Answer:**

| Pattern | Where in Spring |
|---------|----------------|
| **Singleton** | Default bean scope |
| **Factory** | `BeanFactory`, `FactoryBean` |
| **Proxy** | AOP, `@Transactional`, `@Async`, `@Cacheable` |
| **Template Method** | `JdbcTemplate`, `RestTemplate`, `JmsTemplate` |
| **Observer** | `ApplicationEvent` / `@EventListener` |
| **Front Controller** | `DispatcherServlet` |
| **Strategy** | `HandlerMapping`, `ViewResolver`, `AuthenticationProvider` |
| **Adapter** | `HandlerAdapter` |
| **Decorator** | `BeanPostProcessor`, security filter chain |
| **Builder** | `UriComponentsBuilder`, `MockMvcRequestBuilders` |
| **Composite** | `CompositeHealthIndicator` |

---

## 10. Scenario-Based Questions

### Q37: Your Spring Boot app starts slowly. How do you diagnose and fix it?

**Answer:**

**Diagnosis:**
1. Enable startup logging: `spring.main.lazy-initialization=false` + startup actuator
2. Use Spring Boot Startup Analyzer (available since Boot 2.4): `ApplicationStartup` with `BufferingApplicationStartup`
3. Check auto-configuration report (`debug=true`) for unnecessary auto-configs
4. Profile with JFR (Java Flight Recorder) during startup

**Common fixes:**
- `spring.main.lazy-initialization=true` — lazy-load beans (but delays first-request latency)
- Exclude unused auto-configurations: `@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})`
- Use Spring Boot 3 + GraalVM native image for sub-second startup
- Reduce classpath scanning: narrow `@ComponentScan` base packages
- Reduce Hibernate startup: set `ddl-auto=none` in production (use Flyway/Liquibase)

---

### Q38: Your API returns 500 but the logs show no exception. How do you debug?

**Answer:**

1. **Check error handling:** A `@ControllerAdvice` might be catching the exception and returning 500 without logging it
2. **Check async:** If using `@Async`, exceptions go to the `AsyncUncaughtExceptionHandler`, not the controller advice
3. **Check the default error controller:** Spring Boot's `BasicErrorController` handles `/error` — it may be swallowing exceptions
4. **Enable trace logging:** `logging.level.org.springframework.web=TRACE`
5. **Check filters:** An exception in a `Filter` (before the controller) won't trigger `@ExceptionHandler`
6. **Check AOP:** An `@Around` advice might be catching exceptions

---

### Q39: How do you handle distributed transactions across microservices?

**Answer:**

**You don't use traditional distributed transactions (2PC).** They don't scale and create tight coupling.

**Instead, use:**

1. **Saga Pattern (Orchestration):** A coordinator service manages the transaction steps. Each step has a compensating action for rollback.

2. **Saga Pattern (Choreography):** Services publish events, and each service reacts independently. No central coordinator.

3. **Outbox Pattern:** Write to a local database AND an outbox table in the same local transaction. A separate process reads the outbox and publishes events.

4. **Event Sourcing:** Store events instead of current state. Replay events to reconstruct state.

**Spring implementation:** Use Spring Cloud Stream + Kafka for reliable event delivery. Use `@TransactionalEventListener` to publish events only after local transaction commits.

---

### Q40: How would you migrate a monolith to Spring Boot microservices?

**Answer:**

**Strangler Fig Pattern — incremental migration:**

1. **Identify bounded contexts** — find natural domain boundaries (order, inventory, payment)
2. **Build new features as microservices** — don't touch the monolith for new work
3. **Extract the easiest, most independent module first** — often a stateless service
4. **Set up API Gateway** — route traffic to monolith or microservice based on path
5. **Extract shared database** — use database per service, sync via events
6. **Repeat** — migrate one module at a time

**Anti-patterns to avoid:**
- Big-bang rewrite (high risk)
- Distributed monolith (microservices with shared database)
- Too many microservices too early (team doesn't have operational maturity)

---

## 11. Rapid-Fire Questions

### Q41: What is `@Lazy` annotation?

Delays bean creation until first use. Useful for breaking circular dependencies or reducing startup time.

### Q42: What is `@Scope("prototype")`?

Creates a new bean instance every time it's requested from the container (instead of the default singleton).

### Q43: What is `@Profile`?

Activates a bean or configuration only when a specific profile is active. Example: `@Profile("dev")` loads only when `spring.profiles.active=dev`.

### Q44: What is `@ConditionalOnMissingBean`?

Registers a bean only if no bean of that type already exists. This is how auto-configuration backs off when you define your own beans.

### Q45: What is `@EnableScheduling` and `@Scheduled`?

Enables task scheduling. `@Scheduled(fixedRate = 5000)` runs a method every 5 seconds. `@Scheduled(cron = "0 0 2 * * ?")` runs at 2 AM daily.

### Q46: What is `@Async`?

Executes a method asynchronously in a separate thread. Requires `@EnableAsync`. Return `CompletableFuture<T>` for async results.

### Q47: What is `@Cacheable`?

Caches method return values. First call executes the method; subsequent calls with the same arguments return the cached result. Use with `@EnableCaching`.

### Q48: What is `@EventListener` vs `ApplicationListener`?

Both listen for application events. `@EventListener` is annotation-based (preferred). `ApplicationListener` is interface-based (older). Both are synchronous by default; add `@Async` for async handling.

### Q49: What is the difference between `findById()` and `getReferenceById()`?

`findById()` eagerly loads the entity (returns `Optional<T>`). `getReferenceById()` returns a lazy proxy — no database query until you access a property. Use `getReferenceById()` when you only need to set a foreign key reference.

### Q50: What is Spring WebFlux and when would you use it?

Spring WebFlux is the reactive alternative to Spring MVC. Built on Project Reactor (Mono/Flux) and Netty. Use it for high-concurrency, I/O-bound workloads (thousands of concurrent connections with low thread count). For typical CRUD APIs, Spring MVC with virtual threads (Java 21) is simpler and equally performant.

---

## 12. System Design with Spring — Sample Architecture

### E-Commerce Platform

```
                                    ┌──────────────┐
                                    │ Config Server │
                                    │ (Spring Cloud)│
                                    └──────┬───────┘
                                           │
┌──────────┐    ┌──────────────────┐       │
│  React   │───►│   API Gateway    │───────┤
│  SPA     │    │ (Spring Cloud    │       │
│          │    │  Gateway)        │       │
└──────────┘    └─────┬──────┬────┘       │
                      │      │            │
              ┌───────┘      └──────┐     │
              ▼                     ▼     │
    ┌─────────────────┐   ┌──────────────────┐
    │  Order Service   │   │ Product Service  │
    │  (Spring Boot)   │   │ (Spring Boot)    │
    │                  │   │                  │
    │ - @RestController│   │ - Spring Data JPA│
    │ - @Transactional │   │ - Redis Cache    │
    │ - Resilience4j   │   │ - Elasticsearch  │
    │ - Kafka Producer │   │                  │
    └────────┬─────────┘   └──────────────────┘
             │
    ┌────────▼─────────┐   ┌──────────────────┐
    │ Payment Service  │   │ Notification Svc  │
    │ (Spring Boot)    │   │ (Spring Boot)     │
    │                  │   │                   │
    │ - Stripe SDK     │   │ - Kafka Consumer  │
    │ - Circuit Breaker│   │ - @Async          │
    │ - Outbox Pattern │   │ - Email/SMS/Push  │
    └──────────────────┘   └───────────────────┘

Technology Choices:
- Auth: Spring Security + JWT + OAuth2
- DB: PostgreSQL (per service) + Spring Data JPA
- Cache: Redis + @Cacheable
- Messaging: Apache Kafka + Spring Cloud Stream
- Monitoring: Micrometer + Prometheus + Grafana
- Tracing: Micrometer Tracing + Zipkin
- CI/CD: GitHub Actions + Docker + Kubernetes
- Testing: JUnit 5 + MockMvc + Testcontainers
```

---

## Quick Cheat Sheet — Top 10 Things Interviewers Ask

| # | Question | Key Point |
|---|----------|-----------|
| 1 | IoC vs DI | IoC = principle, DI = mechanism |
| 2 | Constructor vs setter injection | Constructor — immutable, testable, explicit |
| 3 | Bean scopes | Singleton (default), prototype (new each time) |
| 4 | `@Transactional` pitfalls | Self-invocation bypasses proxy; checked exceptions don't roll back |
| 5 | N+1 problem | `JOIN FETCH`, `@EntityGraph`, DTO projection |
| 6 | Spring Security filter chain | Ordered filters before DispatcherServlet |
| 7 | Auto-configuration | Conditional + backs off when user defines beans |
| 8 | `@Controller` vs `@RestController` | View name vs response body |
| 9 | Spring AOP proxy | CGLIB (default) — self-invocation not intercepted |
| 10 | Microservice patterns | Circuit breaker, saga, config server, service discovery |
