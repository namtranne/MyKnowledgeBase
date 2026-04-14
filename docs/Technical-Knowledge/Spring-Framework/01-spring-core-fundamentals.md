---
sidebar_position: 2
title: "01 — Spring Core Fundamentals"
slug: 01-spring-core-fundamentals
---

# 🌱 Spring Core Fundamentals

The Spring Framework's core is its **Inversion of Control (IoC) container**. Understanding how it manages objects (beans), resolves dependencies, and controls lifecycles is the foundation for everything else in the Spring ecosystem.

---

## 1. Inversion of Control (IoC)

### What Is IoC?

In traditional Java, **your code** creates and manages object dependencies:

```java
// ❌ Tight coupling — you create the dependency
public class OrderService {
    private final InventoryService inventoryService = new InventoryService();
    private final PaymentService paymentService = new PaymentService();
}
```

With IoC, the **framework** creates and injects dependencies — control is "inverted":

```java
// ✅ IoC — Spring creates and injects dependencies
@Service
public class OrderService {
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    public OrderService(InventoryService inventoryService, PaymentService paymentService) {
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
    }
}
```

### Why IoC Matters

| Benefit | Without IoC | With IoC |
|---------|-------------|----------|
| **Testability** | Must mock with reflection hacks | Constructor injection → pass mocks directly |
| **Coupling** | Class knows concrete implementations | Class depends on abstractions (interfaces) |
| **Configuration** | Scattered `new` statements | Centralized bean definitions |
| **Lifecycle** | Manual resource management | Container handles init/destroy |

:::tip Interview Insight
IoC is the **principle**, Dependency Injection is the **mechanism**. Spring implements IoC primarily through DI, but IoC also includes lifecycle callbacks, event publishing, and resource management.
:::

---

## 2. Dependency Injection (DI)

### Three Styles of DI

#### Constructor Injection (Recommended)

```java
@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Spring resolves parameters by type from the IoC container
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
}
```

**Why preferred:**
- Fields can be `final` → immutable, thread-safe
- Dependencies are explicit in the constructor signature
- Cannot create an instance in an invalid state (all deps required)
- No reflection needed — works with plain `new` in tests

#### Setter Injection

```java
@Service
public class NotificationService {
    private EmailSender emailSender;

    @Autowired
    public void setEmailSender(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}
```

**Use when:** the dependency is truly optional, or you need to allow reconfiguration.

#### Field Injection (Avoid in production)

```java
@Service
public class ProductService {
    @Autowired
    private ProductRepository productRepository; // ❌ Can't be final, hard to test
}
```

**Problems:** Hidden dependencies, impossible to make fields `final`, requires reflection to set in tests.

### Comparison Table

| Aspect | Constructor | Setter | Field |
|--------|------------|--------|-------|
| Immutability | ✅ `final` fields | ❌ Mutable | ❌ Mutable |
| Required deps | ✅ Enforced | ❌ Optional by nature | ❌ Optional by nature |
| Testability | ✅ Plain constructors | ⚠️ Need setters | ❌ Need reflection |
| Circular deps | ❌ Fails fast (good!) | ✅ Can resolve | ✅ Can resolve |
| Rod Johnson's recommendation | ✅ Primary choice | Use for optional deps | Avoid |

:::tip Interview Insight
If asked "Constructor vs Setter Injection" — the answer is **always prefer constructor injection**. Rod Johnson (Spring's creator) recommends constructor injection for mandatory dependencies and setter injection only for optional ones. Spring Framework itself uses constructor injection internally.
:::

---

## 3. The Spring IoC Container

### BeanFactory vs ApplicationContext

```
                    BeanFactory (interface)
                         │
                         ▼
                  ApplicationContext (interface)
                    ┌────┼────┐
                    ▼    ▼    ▼
    ClassPathXml   Annotation  WebApplication
    AppContext      Config      Context
                  AppContext
```

| Feature | BeanFactory | ApplicationContext |
|---------|-------------|-------------------|
| Bean instantiation | ✅ Lazy by default | ✅ Eager by default |
| Dependency injection | ✅ | ✅ |
| Event publishing | ❌ | ✅ |
| Internationalization (i18n) | ❌ | ✅ |
| AOP integration | ❌ | ✅ |
| `@PostConstruct` / `@PreDestroy` | ❌ | ✅ |
| Environment & Profiles | ❌ | ✅ |

**Rule of thumb:** Always use `ApplicationContext` unless you have extreme memory constraints (embedded systems).

### Common ApplicationContext Implementations

```java
// Annotation-based (most common in modern Spring)
var ctx = new AnnotationConfigApplicationContext(AppConfig.class);

// XML-based (legacy)
var ctx = new ClassPathXmlApplicationContext("applicationContext.xml");

// Web applications (servlet-based)
// Created automatically by DispatcherServlet

// Spring Boot
// Created automatically by SpringApplication.run()
```

---

## 4. Bean Definition & Configuration Styles

### Style 1: Annotation-Based (Component Scanning)

```java
@Configuration
@ComponentScan(basePackages = "com.example")
public class AppConfig {
}

@Service
public class OrderService {
    // Discovered by @ComponentScan, registered as a bean
}
```

**Stereotype Annotations:**

| Annotation | Semantic Meaning | Extra Behavior |
|-----------|-----------------|----------------|
| `@Component` | Generic bean | None |
| `@Service` | Business logic | None (documentation only) |
| `@Repository` | Data access | Exception translation (SQL → Spring DataAccessException) |
| `@Controller` | Web controller | Enables `@RequestMapping` handling |
| `@RestController` | REST controller | `@Controller` + `@ResponseBody` on every method |
| `@Configuration` | Configuration class | CGLIB proxying to enforce singleton semantics for `@Bean` methods |

### Style 2: Java Configuration (`@Bean` methods)

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        ds.setUsername("user");
        ds.setPassword("pass");
        return ds;
    }

    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource); // parameter auto-injected
    }
}
```

**When to use `@Bean` over `@Component`:**
- Third-party classes you can't annotate
- Beans requiring complex initialization logic
- Multiple beans of the same type with different configurations
- Conditional bean creation

### Style 3: XML Configuration (Legacy)

```xml
<beans>
    <bean id="orderService" class="com.example.OrderService">
        <constructor-arg ref="inventoryService"/>
    </bean>
    <bean id="inventoryService" class="com.example.InventoryService"/>
</beans>
```

:::warning
XML configuration is legacy. Modern Spring uses annotation-based or Java configuration exclusively. You may encounter XML in older projects or interview questions about migration.
:::

---

## 5. Bean Scopes

| Scope | Instances | Lifecycle | Use Case |
|-------|-----------|-----------|----------|
| **singleton** (default) | One per container | Container start → shutdown | Stateless services, repositories |
| **prototype** | New instance per injection/lookup | Created on request, GC'd normally | Stateful, non-thread-safe objects |
| **request** | One per HTTP request | Request start → end | Request-scoped data (web only) |
| **session** | One per HTTP session | Session create → invalidate | User session data (web only) |
| **application** | One per `ServletContext` | App start → shutdown | Shared across `DispatcherServlet`s |
| **websocket** | One per WebSocket session | WebSocket connect → close | Per-connection state |

### Singleton vs Prototype — Critical Differences

```java
@Component
@Scope("prototype")
public class ShoppingCart {
    private List<Item> items = new ArrayList<>();
    public void addItem(Item item) { items.add(item); }
}

@Service // default singleton
public class CheckoutService {
    // ⚠️ BUG: Singleton holds one prototype instance forever
    @Autowired
    private ShoppingCart cart;
}
```

**Fix for injecting prototype into singleton:**

```java
@Service
public class CheckoutService {
    private final ObjectProvider<ShoppingCart> cartProvider;

    public CheckoutService(ObjectProvider<ShoppingCart> cartProvider) {
        this.cartProvider = cartProvider;
    }

    public void checkout(User user) {
        ShoppingCart cart = cartProvider.getObject(); // new instance each time
        // ...
    }
}
```

:::tip Interview Insight
This is a classic interview trap. When a prototype-scoped bean is injected into a singleton, the prototype is created **once** at singleton initialization and never replaced. Use `ObjectProvider`, `@Lookup`, or `Provider<T>` to get fresh prototype instances.
:::

---

## 6. Bean Lifecycle

### Complete Lifecycle Sequence

```
1.  Container starts
2.  Bean definition loaded (from annotations, @Bean, XML)
3.  Bean instantiated (constructor called)
4.  Dependencies injected (@Autowired / constructor params)
5.  BeanNameAware.setBeanName()
6.  BeanFactoryAware.setBeanFactory()
7.  ApplicationContextAware.setApplicationContext()
8.  BeanPostProcessor.postProcessBeforeInitialization()
9.  @PostConstruct method
10. InitializingBean.afterPropertiesSet()
11. Custom init-method
12. BeanPostProcessor.postProcessAfterInitialization()
    ── Bean is ready for use ──
13. @PreDestroy method
14. DisposableBean.destroy()
15. Custom destroy-method
16. Container shuts down
```

### Practical Lifecycle Hooks

```java
@Component
public class CacheWarmer {

    private final ProductRepository repository;
    private Map<String, Product> cache;

    public CacheWarmer(ProductRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void warmCache() {
        // Called after DI is complete — safe to use injected dependencies
        this.cache = repository.findAll().stream()
            .collect(Collectors.toMap(Product::getSku, Function.identity()));
    }

    @PreDestroy
    public void clearCache() {
        this.cache.clear();
    }
}
```

### BeanPostProcessor — The Extension Point Behind the Magic

`BeanPostProcessor` is how Spring implements `@Autowired`, `@Transactional`, `@Async`, and most annotation-driven behavior.

```java
public interface BeanPostProcessor {
    // Called BEFORE @PostConstruct
    Object postProcessBeforeInitialization(Object bean, String beanName);

    // Called AFTER @PostConstruct — proxies are typically created here
    Object postProcessAfterInitialization(Object bean, String beanName);
}
```

**Key implementations:**

| BeanPostProcessor | What It Does |
|-------------------|-------------|
| `AutowiredAnnotationBeanPostProcessor` | Processes `@Autowired`, `@Value` |
| `CommonAnnotationBeanPostProcessor` | Processes `@PostConstruct`, `@PreDestroy`, `@Resource` |
| `AsyncAnnotationBeanPostProcessor` | Wraps `@Async` methods in executor proxy |
| `ScheduledAnnotationBeanPostProcessor` | Registers `@Scheduled` methods with task scheduler |

---

## 7. `@Autowired` Resolution Rules

When Spring encounters `@Autowired`, it resolves the dependency using this algorithm:

```
1. Match by TYPE
   └─ Found exactly one? → Inject it ✅
   └─ Found zero?
       └─ @Autowired(required=false)? → Leave null ✅
       └─ required=true (default)? → NoSuchBeanDefinitionException ❌
   └─ Found multiple?
       └─ Check @Qualifier → match by qualifier ✅
       └─ Check @Primary → use primary ✅
       └─ Match by PARAMETER NAME → match name to bean id ✅
       └─ None of above? → NoUniqueBeanDefinitionException ❌
```

### Resolving Ambiguity

```java
public interface PaymentGateway { void charge(Money amount); }

@Component("stripe")
public class StripeGateway implements PaymentGateway { ... }

@Component("paypal")
@Primary // wins when no qualifier specified
public class PayPalGateway implements PaymentGateway { ... }

@Service
public class PaymentService {
    // Option 1: @Primary — PayPalGateway is injected
    public PaymentService(PaymentGateway gateway) { ... }

    // Option 2: @Qualifier — StripeGateway is injected
    public PaymentService(@Qualifier("stripe") PaymentGateway gateway) { ... }

    // Option 3: Parameter name matching — StripeGateway is injected
    public PaymentService(PaymentGateway stripe) { ... }
}
```

---

## 8. Profiles & Conditional Beans

### Profiles

```java
@Configuration
@Profile("development")
public class DevDataSourceConfig {
    @Bean
    public DataSource dataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }
}

@Configuration
@Profile("production")
public class ProdDataSourceConfig {
    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://prod-db:5432/app");
        return ds;
    }
}
```

**Activating profiles:**

```properties
# application.properties
spring.profiles.active=development

# Command line
java -jar app.jar --spring.profiles.active=production

# Environment variable
SPRING_PROFILES_ACTIVE=production

# Programmatic
SpringApplication app = new SpringApplication(MyApp.class);
app.setAdditionalProfiles("development");
app.run(args);
```

### `@Conditional` — Fine-Grained Control

```java
@Configuration
public class CacheConfig {

    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "redis")
    public CacheManager redisCacheManager() {
        return new RedisCacheManager(redisConnectionFactory());
    }

    @Bean
    @ConditionalOnProperty(name = "cache.type", havingValue = "caffeine", matchIfMissing = true)
    public CacheManager caffeineCacheManager() {
        return new CaffeineCacheManager("products", "users");
    }
}
```

**Common `@Conditional` annotations (Spring Boot):**

| Annotation | Condition |
|-----------|-----------|
| `@ConditionalOnClass` | Class is on classpath |
| `@ConditionalOnMissingBean` | No bean of this type exists |
| `@ConditionalOnProperty` | Property has specific value |
| `@ConditionalOnBean` | Bean of this type exists |
| `@ConditionalOnMissingClass` | Class is NOT on classpath |
| `@ConditionalOnWebApplication` | Running in a web context |

---

## 9. Spring Expression Language (SpEL)

```java
@Component
public class AppConfig {

    @Value("${app.name}")                          // Property placeholder
    private String appName;

    @Value("${app.timeout:5000}")                  // Default value
    private int timeout;

    @Value("#{systemProperties['user.home']}")     // SpEL expression
    private String userHome;

    @Value("#{T(java.lang.Math).random() * 100}")  // Static method call
    private double randomValue;

    @Value("#{orderService.getDefaultCurrency()}")  // Bean method call
    private String currency;

    @Value("#{'${app.regions}'.split(',')}")         // Property → List
    private List<String> regions;
}
```

---

## 10. Event System

Spring's event mechanism enables loose coupling between components.

```java
// Define a custom event
public class OrderCompletedEvent extends ApplicationEvent {
    private final String orderId;
    public OrderCompletedEvent(Object source, String orderId) {
        super(source);
        this.orderId = orderId;
    }
    public String getOrderId() { return orderId; }
}

// Publish the event
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void completeOrder(String orderId) {
        // ... complete order logic ...
        eventPublisher.publishEvent(new OrderCompletedEvent(this, orderId));
    }
}

// Listen for the event
@Component
public class InventoryListener {
    @EventListener
    public void handleOrderCompleted(OrderCompletedEvent event) {
        // Reduce inventory for order
    }
}

@Component
public class NotificationListener {
    @EventListener
    @Async
    public void sendConfirmation(OrderCompletedEvent event) {
        // Send email asynchronously
    }
}
```

:::tip Interview Insight
Spring events are **synchronous** by default (same thread). Add `@Async` + `@EnableAsync` for asynchronous event handling. In Spring 4.2+, you can use `@TransactionalEventListener` to fire events only after a transaction commits — critical for avoiding side effects on rollback.
:::

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| IoC vs DI | IoC is the principle; DI is the implementation mechanism |
| Constructor Injection | Always preferred — immutable, testable, explicit |
| `ApplicationContext` vs `BeanFactory` | Always use `ApplicationContext` — superset with events, i18n, AOP |
| Bean Scopes | Singleton (default) vs prototype; know the prototype-in-singleton trap |
| Bean Lifecycle | Constructor → DI → `@PostConstruct` → Ready → `@PreDestroy` → Destroyed |
| `@Autowired` resolution | Type → `@Qualifier` → `@Primary` → parameter name |
| Configuration styles | `@Component` scanning vs `@Bean` methods vs XML (legacy) |
| Profiles | Activate via property, CLI, or env var; combine with `@Conditional` |
| `BeanPostProcessor` | The extension point behind `@Autowired`, `@Transactional`, `@Async` |
