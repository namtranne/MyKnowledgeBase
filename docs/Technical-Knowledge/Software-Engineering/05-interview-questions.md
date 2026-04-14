---
sidebar_position: 6
title: "05 — Common Interview Questions"
slug: 05-interview-questions
---

# 🎯 Common Interview Questions

Practice questions spanning design principles, patterns, architecture, testing, and code quality. Each question includes a **detailed answer** you can adapt to your own experience.

---

## 1. Design Principles Questions

### Q1: Explain the Single Responsibility Principle and give a real-world example where violating it caused problems.

**Answer:**

SRP states that a class should have **one reason to change**. A common violation is a service class that handles business logic, database access, and external API calls.

```java
// ❌ Violation: UserService handles validation, persistence, AND notification
public class UserService {
    public User register(String email, String password) {
        if (!email.contains("@")) throw new InvalidEmailException();
        String hash = BCrypt.hash(password);
        User user = new User(email, hash);

        Connection conn = DriverManager.getConnection(DB_URL);
        PreparedStatement ps = conn.prepareStatement("INSERT INTO users ...");
        ps.executeUpdate();

        SmtpClient smtp = new SmtpClient("smtp.company.com");
        smtp.send(email, "Welcome!", "Thanks for registering.");
        return user;
    }
}
```

**Problems caused:**
- Cannot change the email provider without modifying `UserService`
- Cannot unit-test registration logic without a real database and SMTP server
- A bug in email sending can break user registration

**Fix:** Extract `UserRepository`, `EmailService`, and `ValidationService`. The `UserService` orchestrates them but owns no implementation details.

:::tip Senior-Level Insight
In practice, SRP violations often surface as **"this class is hard to test."** If you need 5 mocks to test a method, the class probably has too many responsibilities.
:::

---

### Q2: When would you intentionally violate DRY? Give a concrete example.

**Answer:**

DRY should be violated when the duplication is **coincidental** — the code looks the same today but represents different concepts that will evolve independently.

**Example:** An e-commerce system has `OrderValidator` and `ReturnValidator`. Both check `amount > 0` and `customerId != null`. It's tempting to extract a `BaseValidator`:

```java
// ❌ Wrong abstraction — these will diverge
public abstract class BaseValidator {
    public void validate(BigDecimal amount, String customerId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new ValidationException();
        if (customerId == null) throw new ValidationException();
    }
}
```

After 3 months, `OrderValidator` needs to check inventory availability and `ReturnValidator` needs to check the return window. The "shared" base class becomes a liability — every change risks breaking the other validator.

**Better approach:** Keep them separate until a **stable, genuine pattern** emerges. Apply the **Rule of Three**: don't abstract until you've seen the pattern three times.

---

### Q3: How do OCP and YAGNI conflict, and how do you resolve it?

**Answer:**

- **OCP** says: design for extension without modification (use abstractions, strategies, plugins).
- **YAGNI** says: don't build what you don't need yet.

These conflict because OCP encourages **preemptive abstraction** while YAGNI encourages **just-in-time design**.

**Resolution:** Start with the simplest implementation (YAGNI). When a **second use case** emerges, refactor to introduce the abstraction (OCP). This way you're adding extension points based on **evidence**, not speculation.

```
Lifecycle:
  1. Build feature A with concrete implementation     (YAGNI wins)
  2. Feature B needs similar logic                    (duplication trigger)
  3. Refactor: extract interface, introduce Strategy  (OCP wins)
  4. Feature C plugs in with zero modification        (OCP payoff)
```

---

## 2. Design Patterns Questions

### Q4: When would you choose Strategy over Template Method?

**Answer:**

| Aspect | Strategy | Template Method |
|--------|----------|-----------------|
| **Mechanism** | Composition (HAS-A) | Inheritance (IS-A) |
| **Flexibility** | Swap algorithms at runtime | Fixed at compile time |
| **Coupling** | Loose (interface only) | Tight (subclass inherits base) |
| **Class count** | One class + strategy interface | Multiple subclasses |

**Choose Strategy when:**
- The algorithm needs to be swapped at runtime (e.g., different sorting based on data size)
- Multiple independent axes of variation exist
- You want to avoid deep inheritance hierarchies

**Choose Template Method when:**
- The algorithm skeleton is fixed with only a few variable steps
- Subclasses are stable and don't need runtime swapping (e.g., data importers: CSV, JSON, XML)

---

### Q5: Explain the difference between Decorator and Proxy with a real example.

**Answer:**

Both wrap an object with the same interface, but their **intent** differs:

| Aspect | Decorator | Proxy |
|--------|-----------|-------|
| **Intent** | **Add behavior** | **Control access** |
| **Chaining** | Multiple decorators stack | Usually single wrapper |
| **Client awareness** | Client doesn't know about decoration | Client may or may not know |

**Decorator example:** Java I/O streams — `BufferedInputStream(new GZIPInputStream(new FileInputStream("data.gz")))`. Each layer adds behavior (buffering, decompression).

**Proxy example:** A caching proxy sits in front of a remote service. The client calls the same interface, but the proxy returns cached results when available, controlling access to the expensive remote call.

```java
// Decorator — adds logging to any UserService
public class LoggingUserService implements UserService {
    private final UserService delegate;
    public User findById(String id) {
        log.info("Finding user {}", id);
        User user = delegate.findById(id);
        log.info("Found user {}", user.getName());
        return user;
    }
}

// Proxy — controls access with caching
public class CachingUserServiceProxy implements UserService {
    private final UserService realService;
    private final Cache<String, User> cache;
    public User findById(String id) {
        return cache.get(id, realService::findById);
    }
}
```

---

### Q6: How would you implement a thread-safe Singleton in Java? What are the trade-offs?

**Answer:**

Four approaches ranked by recommendation:

```java
// 1. Enum-based (BEST — Joshua Bloch)
public enum Config {
    INSTANCE;
    private final Properties props = loadProperties();
    public String get(String key) { return props.getProperty(key); }
}

// 2. Holder pattern (lazy, thread-safe, no synchronization)
public class Config {
    private Config() {}
    private static class Holder {
        static final Config INSTANCE = new Config();
    }
    public static Config getInstance() { return Holder.INSTANCE; }
}

// 3. Double-checked locking (when you need control over construction)
public class Config {
    private static volatile Config instance;
    public static Config getInstance() {
        if (instance == null) {
            synchronized (Config.class) {
                if (instance == null) instance = new Config();
            }
        }
        return instance;
    }
}

// 4. Synchronized method (simple but contended)
public class Config {
    private static Config instance;
    public static synchronized Config getInstance() {
        if (instance == null) instance = new Config();
        return instance;
    }
}
```

**Trade-offs:** Enum is simplest and handles serialization/reflection but can't extend classes. Holder pattern is lazy and lock-free. Double-checked locking requires `volatile` and is error-prone. All Singleton approaches make testing harder — prefer DI with singleton scope.

---

## 3. Architecture Questions

### Q7: Explain the Dependency Rule in Clean Architecture.

**Answer:**

The Dependency Rule states: **source code dependencies must only point inward**. Nothing in an inner circle can know anything about something in an outer circle.

```
Frameworks → Adapters → Use Cases → Entities
                                        ↑
                          Nothing depends on Frameworks
```

**Why it matters:**
- Entities contain enterprise-wide business rules — they never change because a framework upgrades
- Use cases change only when business requirements change — not when the database vendor changes
- The web framework is a **detail** — it could be Spring, Express, or Flask without touching business logic

**How it works in practice:** Inner layers define **interfaces** (ports). Outer layers provide **implementations** (adapters). Dependency injection wires them together at startup.

---

### Q8: You inherit a legacy monolith with no tests. How do you add tests and start refactoring?

**Answer:**

Michael Feathers' approach from *Working Effectively with Legacy Code*:

| Step | Action |
|------|--------|
| 1 | **Identify change points** — what do you need to modify? |
| 2 | **Find seams** — places where you can alter behavior without editing code (interfaces, configuration, subclassing) |
| 3 | **Write characterization tests** — tests that capture *current behavior* (not desired behavior) |
| 4 | **Break dependencies** — extract interfaces, inject dependencies to make code testable |
| 5 | **Refactor with safety** — small steps, run tests after each change |
| 6 | **Strangler Fig** — gradually replace legacy components with clean implementations |

```java
// Characterization test — documents current behavior
@Test
void legacyPriceCalculation_existingBehavior() {
    LegacyPriceEngine engine = new LegacyPriceEngine();
    double result = engine.calculate("SKU-001", 5, "CA");

    // We don't know if 53.75 is "correct" — we just know
    // it's what the system currently produces. This test
    // ensures we don't accidentally change behavior.
    assertEquals(53.75, result, 0.01);
}
```

:::tip Senior-Level Insight
Never attempt a **big-bang rewrite** — they almost always fail. Use the Strangler Fig pattern to incrementally replace components. Each increment ships to production, reducing risk and providing feedback.
:::

---

### Q9: When would you choose a modular monolith over microservices?

**Answer:**

| Choose Modular Monolith When | Choose Microservices When |
|------------------------------|--------------------------|
| Small team (< 10 engineers) | Multiple independent teams |
| Domain boundaries are unclear | Domains are well-understood and stable |
| Need fast iteration and deployment | Need independent scaling per service |
| Limited DevOps capability | Strong platform engineering team |
| Startup / early product phase | Mature product with proven architecture |
| Performance-sensitive (no network hops) | Polyglot requirements (different languages) |

A modular monolith gives you **clear module boundaries** (the hard part) without the **operational complexity** of distributed systems (the expensive part). You can always extract modules into services later — but only when you have evidence that you need to.

---

## 4. Testing Questions

### Q10: How do you decide what to unit test vs integration test?

**Answer:**

```
Unit test when:
  - Testing pure logic (calculations, transformations, validations)
  - Testing decision branching (if/else, switch)
  - Testing edge cases and error handling
  - Fast feedback is critical

Integration test when:
  - Testing database queries and ORM mappings
  - Testing HTTP serialization/deserialization
  - Testing message broker consumption
  - Testing multi-component orchestration
  - Testing that configuration wires things correctly
```

**Rule of thumb:** If it involves **logic**, unit test it. If it involves **wiring**, integration test it.

---

### Q11: Explain contract testing and when it's essential.

**Answer:**

Contract testing verifies that a **consumer's expectations** match a **provider's capabilities** at the API boundary. It's essential in microservice architectures where there's no compiler to catch breaking interface changes.

**Without contract tests:**
1. Team A changes the response field from `userId` to `user_id`
2. Team B's service breaks in production
3. The outage affects customers before anyone notices

**With contract tests (Pact):**
1. Team B's consumer test defines: *"I expect a response with field `userId`"*
2. This generates a contract file
3. Team A's provider test runs against the contract
4. Team A's CI fails *before* the change is deployed — breaking change caught

---

### Q12: What's wrong with mocking everything in your tests?

**Answer:**

Over-mocking creates tests that **verify implementation, not behavior**:

```java
// ❌ Over-mocked: tests the mock configuration, not the system
@Test
void testPlaceOrder() {
    when(repo.findById(any())).thenReturn(order);
    when(validator.validate(any())).thenReturn(true);
    when(calculator.calculate(any())).thenReturn(Money.of(100));
    when(gateway.charge(any(), any())).thenReturn(success);
    when(repo.save(any())).thenReturn(order);
    when(publisher.publish(any())).thenReturn(null);

    service.placeOrder(command);

    verify(repo).findById(orderId);
    verify(validator).validate(order);
    verify(calculator).calculate(order);
    verify(gateway).charge(Money.of(100), card);
    verify(repo).save(order);
    verify(publisher).publish(any(OrderPlacedEvent.class));
}
```

**Problems:**
- Test mirrors the implementation line-by-line — any refactoring breaks the test
- Doesn't verify that the order is actually correct
- If you reorder the steps, the test breaks even if the behavior is correct

**Better approach:** Use a fake repository, mock only the external boundary (payment gateway), and assert on **outcomes** (order is saved with correct total) rather than **interactions** (save was called with these exact arguments).

---

## 5. Code Review Scenarios

### Q13: What's wrong with this code? How would you refactor it?

```java
public class ReportGenerator {
    public String generate(String type, List<Transaction> transactions) {
        StringBuilder sb = new StringBuilder();
        if (type.equals("CSV")) {
            sb.append("Date,Amount,Category\n");
            for (Transaction t : transactions) {
                sb.append(t.getDate()).append(",")
                   .append(t.getAmount()).append(",")
                   .append(t.getCategory()).append("\n");
            }
        } else if (type.equals("JSON")) {
            sb.append("[");
            for (int i = 0; i < transactions.size(); i++) {
                Transaction t = transactions.get(i);
                sb.append("{\"date\":\"").append(t.getDate())
                   .append("\",\"amount\":").append(t.getAmount())
                   .append(",\"category\":\"").append(t.getCategory())
                   .append("\"}");
                if (i < transactions.size() - 1) sb.append(",");
            }
            sb.append("]");
        } else if (type.equals("XML")) {
            sb.append("<transactions>");
            for (Transaction t : transactions) {
                sb.append("<transaction>")
                   .append("<date>").append(t.getDate()).append("</date>")
                   .append("<amount>").append(t.getAmount()).append("</amount>")
                   .append("<category>").append(t.getCategory()).append("</category>")
                   .append("</transaction>");
            }
            sb.append("</transactions>");
        }
        return sb.toString();
    }
}
```

**Answer — Issues Identified:**

| # | Issue | Principle Violated |
|:-:|-------|-------------------|
| 1 | `if/else` chain on type string | OCP — adding a format requires modifying this method |
| 2 | String-based type checking | Type safety — `"csv"` vs `"CSV"` bug |
| 3 | Hand-rolling JSON/XML | KISS — use Jackson/JAXB |
| 4 | Single class does formatting for all types | SRP — multiple reasons to change |
| 5 | No error handling for unknown types | Robustness |

**Refactored:**

```java
public interface ReportFormatter {
    String format(List<Transaction> transactions);
}

public class CsvFormatter implements ReportFormatter {
    public String format(List<Transaction> transactions) {
        // Use a CSV library (Apache Commons CSV)
        return csvWriter.writeAll(transactions);
    }
}

public class JsonFormatter implements ReportFormatter {
    public String format(List<Transaction> transactions) {
        return objectMapper.writeValueAsString(transactions);
    }
}

public class ReportGenerator {
    private final Map<ReportType, ReportFormatter> formatters;

    public ReportGenerator(Map<ReportType, ReportFormatter> formatters) {
        this.formatters = formatters;
    }

    public String generate(ReportType type, List<Transaction> transactions) {
        ReportFormatter formatter = formatters.get(type);
        if (formatter == null) throw new UnsupportedFormatException(type);
        return formatter.format(transactions);
    }
}
```

---

### Q14: Review this class and identify code smells.

```java
public class OrderManager {
    private Connection dbConnection;
    private SmtpClient emailClient;
    private HttpClient inventoryClient;
    private HttpClient paymentClient;
    private Logger logger;
    private MetricsCollector metrics;

    public OrderResult processOrder(String customerId, List<String> productIds,
            String shippingAddress, String billingAddress, String cardNumber,
            String cardExpiry, String cardCvv, String discountCode,
            boolean expressShipping, boolean giftWrap) {
        // 300 lines of logic...
    }
}
```

**Answer — Code Smells:**

| Smell | Evidence |
|-------|----------|
| **God Class** | Manages DB, email, inventory, payments, logging, metrics |
| **Long Parameter List** | 10 parameters in `processOrder` |
| **Data Clumps** | `cardNumber`, `cardExpiry`, `cardCvv` always travel together |
| **Primitive Obsession** | Strings for addresses, card details — should be value objects |
| **Long Method** | 300 lines in one method |
| **Feature Envy** | Likely reaching into other objects' data |

**Refactoring Plan:**

```java
// Introduce value objects for data clumps
record CreditCard(String number, String expiry, String cvv) {}
record Address(String street, String city, String zip) {}

// Introduce parameter object
record PlaceOrderCommand(
    CustomerId customerId,
    List<ProductId> productIds,
    Address shippingAddress,
    Address billingAddress,
    CreditCard card,
    Optional<DiscountCode> discountCode,
    ShippingOption shipping,
    boolean giftWrap
) {}

// Extract responsibilities into focused services
class OrderService {
    private final InventoryService inventory;
    private final PaymentService payments;
    private final NotificationService notifications;

    public OrderResult processOrder(PlaceOrderCommand cmd) {
        inventory.reserve(cmd.productIds());
        PaymentResult payment = payments.charge(cmd.card(), calculateTotal(cmd));
        Order order = Order.create(cmd, payment.transactionId());
        orderRepository.save(order);
        notifications.orderConfirmed(order);
        return OrderResult.success(order.getId());
    }
}
```

---

## 6. Design Discussion Questions

### Q15: How would you structure a notification system that sends emails, SMS, and push notifications?

**Answer:**

Use the **Strategy + Observer** patterns:

```
┌────────────────┐     publishes      ┌──────────────────┐
│  OrderService  │ ──────────────────▶│    EventBus       │
└────────────────┘                    └────────┬──────────┘
                                               │ dispatches to
                           ┌───────────────────┼────────────────────┐
                           ▼                   ▼                    ▼
                    ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
                    │ EmailNotifier│  │ SmsNotifier   │  │ PushNotifier │
                    └──────────────┘  └───────────────┘  └──────────────┘
                           │                   │                    │
                    ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
                    │  SendGrid    │  │   Twilio      │  │   Firebase   │
                    └──────────────┘  └───────────────┘  └──────────────┘
```

```java
public interface NotificationChannel {
    boolean supports(NotificationType type);
    void send(Notification notification);
}

public class NotificationService {
    private final List<NotificationChannel> channels;
    private final UserPreferenceRepository preferences;

    public void notify(UserId userId, Notification notification) {
        Set<NotificationType> userPrefs = preferences.getEnabledChannels(userId);

        channels.stream()
            .filter(ch -> userPrefs.contains(ch.getType()))
            .forEach(ch -> {
                try {
                    ch.send(notification);
                } catch (Exception e) {
                    log.warn("Channel {} failed for user {}", ch.getType(), userId, e);
                }
            });
    }
}
```

**Key design decisions to discuss:**
- **Async vs sync** — notifications should be async (queue-based) to not block the main flow
- **User preferences** — users choose which channels they want
- **Failure isolation** — one channel failing doesn't block others
- **Retry with backoff** — transient failures should be retried
- **Template engine** — separate content from delivery mechanism

---

### Q16: How would you refactor a 5,000-line "GodService" class?

**Answer:**

| Phase | Action | Duration |
|-------|--------|----------|
| 1 | **Characterization tests** — capture current behavior | 1–2 sprints |
| 2 | **Identify responsibilities** — group methods by cohesion | 1 sprint |
| 3 | **Extract classes** — start with the most independent group | Ongoing |
| 4 | **Introduce interfaces** — define contracts between extracted classes | Per extraction |
| 5 | **Wire via DI** — use constructor injection to compose | Per extraction |
| 6 | **Delete dead code** — remove unused methods discovered during analysis | Ongoing |

**Prioritize extraction by:**
1. **Risk** — extract the most frequently changed code first (highest ROI)
2. **Independence** — extract code with fewest dependencies on the God class
3. **Testability** — extract code that's hardest to test inline

---

### Q17: Explain how you'd implement the Circuit Breaker pattern and why.

**Answer:**

A Circuit Breaker prevents cascading failures by **stopping calls to a failing service** and returning a fallback.

```
  ┌──────────┐    success    ┌──────────┐    failure threshold    ┌──────────┐
  │  CLOSED  │──────────────▶│  CLOSED  │────────────────────────▶│   OPEN   │
  │(normal)  │               │(counting)│                        │(failing) │
  └──────────┘               └──────────┘                        └────┬─────┘
       ▲                                                              │
       │                                                  timeout     │
       │                     ┌──────────┐                expires      │
       │     success         │HALF-OPEN │◀────────────────────────────┘
       └─────────────────────│(testing) │
                             └──────────┘
                                  │ failure
                                  └──────────▶ back to OPEN
```

| State | Behavior |
|-------|----------|
| **CLOSED** | Requests flow normally; failures are counted |
| **OPEN** | All requests fail immediately with fallback; no calls to the service |
| **HALF-OPEN** | A limited number of test requests are allowed through; if they succeed, circuit closes |

```java
// Using Resilience4j
CircuitBreaker cb = CircuitBreaker.ofDefaults("paymentService");

Supplier<PaymentResult> decorated = CircuitBreaker
    .decorateSupplier(cb, () -> paymentClient.charge(amount, card));

Try<PaymentResult> result = Try.ofSupplier(decorated)
    .recover(CallNotPermittedException.class,
             e -> PaymentResult.deferred("Payment will be retried"));
```

---

## 7. Quick Reference Tables

### Pattern Selection Guide

| You Need To... | Use This Pattern |
|----------------|-----------------|
| Create one instance only | Singleton (prefer DI scope) |
| Construct complex objects step by step | Builder |
| Create objects without specifying exact class | Factory Method |
| Create families of related objects | Abstract Factory |
| Add behavior dynamically | Decorator |
| Make incompatible interfaces work together | Adapter |
| Simplify a complex subsystem | Facade |
| Swap algorithms at runtime | Strategy |
| Notify multiple objects of state changes | Observer |
| Encapsulate requests for undo/queue/log | Command |
| Object behavior changes with state | State |
| Process requests through a pipeline | Chain of Responsibility |
| Define algorithm skeleton with variable steps | Template Method |
| Control access to an object | Proxy |

### Architecture Comparison

| Aspect | Layered | Hexagonal | Clean | Modular Monolith | Microservices |
|--------|:-------:|:---------:|:-----:|:-----------------:|:-------------:|
| Complexity | Low | Medium | Medium | Medium | High |
| Domain isolation | Weak | Strong | Strong | Medium | Strong |
| Testability | Medium | High | High | High | High |
| Team scalability | Low | Medium | Medium | Medium | High |
| Deployment independence | ❌ | ❌ | ❌ | ❌ | ✅ |
| Operational overhead | Low | Low | Low | Low | High |
| Best for | Simple CRUD | Service-heavy | Complex domain | Growing teams | Large organizations |

### Testing Strategy by Component

| Component | Primary Test Type | Secondary | Tools |
|-----------|------------------|-----------|-------|
| Domain logic | Unit | — | JUnit, pytest |
| Service orchestration | Unit + Mock | Integration | Mockito, unittest.mock |
| Repository/DAO | Integration | — | Testcontainers, H2 |
| REST API | Integration | Contract | MockMvc, Pact |
| Message consumer | Integration | Contract | Testcontainers (Kafka) |
| UI components | Unit (component) | E2E | React Testing Library |
| Full user journey | E2E | — | Playwright, Cypress |

:::tip Senior-Level Insight
In the interview, don't just answer the question — **discuss trade-offs**. Every pattern, architecture, and testing strategy has costs. Showing that you can weigh those costs against benefits is what differentiates senior engineers from those who just memorize solutions.
:::
