---
sidebar_position: 2
title: "01 — Design Principles"
slug: 01-design-principles
---

# 🏗️ Design Principles

The foundation of professional software engineering. Mastering these principles separates senior engineers from mid-level developers — interviewers expect you to **apply** them, not just recite them.

---

## 1. SOLID Principles — Overview

SOLID is a mnemonic for five object-oriented design principles introduced by Robert C. Martin (Uncle Bob).

| Letter | Principle | One-Liner |
|:------:|-----------|-----------|
| **S** | Single Responsibility | A class should have only **one reason to change** |
| **O** | Open/Closed | Open for **extension**, closed for **modification** |
| **L** | Liskov Substitution | Subtypes must be **behaviorally substitutable** for their base types |
| **I** | Interface Segregation | Clients shouldn't depend on methods they **don't use** |
| **D** | Dependency Inversion | Depend on **abstractions**, not concretions |

:::tip Senior-Level Insight
In interviews, don't just define SOLID — show a **before/after** refactoring that demonstrates the benefit. Interviewers want to see that you apply these principles pragmatically, not dogmatically.
:::

---

## 2. Single Responsibility Principle (SRP)

> *A class should have only one reason to change.*

### The Problem — Before Refactoring

```java
// ❌ Violates SRP: handles business logic, persistence, AND notification
public class OrderService {
    public Order createOrder(Cart cart) {
        // Business logic
        Order order = new Order();
        for (Item item : cart.getItems()) {
            order.addLine(item, item.getPrice());
        }
        order.applyDiscount(calculateDiscount(cart));

        // Persistence
        Connection conn = DriverManager.getConnection(DB_URL);
        PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO orders (id, total) VALUES (?, ?)");
        ps.setString(1, order.getId());
        ps.setBigDecimal(2, order.getTotal());
        ps.executeUpdate();

        // Notification
        EmailClient client = new EmailClient("smtp.company.com");
        client.send(order.getCustomerEmail(),
            "Order Confirmed", "Your order " + order.getId() + " is placed.");

        return order;
    }
}
```

### The Solution — After Refactoring

```java
// ✅ Each class has a single responsibility
public class OrderService {
    private final OrderRepository repository;
    private final NotificationService notifier;
    private final DiscountCalculator discountCalc;

    public OrderService(OrderRepository repository,
                        NotificationService notifier,
                        DiscountCalculator discountCalc) {
        this.repository = repository;
        this.notifier = notifier;
        this.discountCalc = discountCalc;
    }

    public Order createOrder(Cart cart) {
        Order order = new Order();
        for (Item item : cart.getItems()) {
            order.addLine(item, item.getPrice());
        }
        order.applyDiscount(discountCalc.calculate(cart));

        repository.save(order);
        notifier.orderConfirmed(order);
        return order;
    }
}
```

| Concern | Before | After |
|---------|--------|-------|
| Business logic | Mixed in `OrderService` | `OrderService` (only orchestration) |
| Persistence | Hardcoded JDBC in method | `OrderRepository` |
| Notification | Hardcoded SMTP in method | `NotificationService` |
| Discount | Embedded calculation | `DiscountCalculator` |

:::warning
SRP doesn't mean "one method per class." It means **one axis of change**. A `UserRepository` with `save()`, `findById()`, and `delete()` is fine — all change for the same reason (persistence schema changes).
:::

---

## 3. Open/Closed Principle (OCP)

> *Software entities should be open for extension, but closed for modification.*

The key idea: you should be able to add new behavior **without changing existing, tested code**.

### Strategy Pattern — The Classic OCP Solution

```java
// ✅ Open for extension: add new shipping strategies without touching existing code
public interface ShippingStrategy {
    BigDecimal calculate(Order order);
}

public class StandardShipping implements ShippingStrategy {
    public BigDecimal calculate(Order order) {
        return new BigDecimal("5.99");
    }
}

public class ExpressShipping implements ShippingStrategy {
    public BigDecimal calculate(Order order) {
        return new BigDecimal("15.99");
    }
}

public class FreeShippingOverThreshold implements ShippingStrategy {
    private final BigDecimal threshold;
    public FreeShippingOverThreshold(BigDecimal threshold) {
        this.threshold = threshold;
    }
    public BigDecimal calculate(Order order) {
        return order.getTotal().compareTo(threshold) >= 0
            ? BigDecimal.ZERO
            : new BigDecimal("5.99");
    }
}

// OrderService never changes when a new shipping method is added
public class OrderService {
    private final ShippingStrategy shippingStrategy;

    public OrderService(ShippingStrategy shippingStrategy) {
        this.shippingStrategy = shippingStrategy;
    }

    public BigDecimal finalPrice(Order order) {
        return order.getTotal().add(shippingStrategy.calculate(order));
    }
}
```

:::tip Senior-Level Insight
OCP doesn't mean you **never** modify existing code. It means you **design** in a way that common extensions don't require modification. Use patterns like Strategy, Decorator, or plugin architectures. In interviews, mention that OCP reduces the **blast radius** of changes.
:::

---

## 4. Liskov Substitution Principle (LSP)

> *If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering the correctness of the program.*

### Classic Violation — Rectangle / Square

```java
// ❌ Square violates LSP when substituted for Rectangle
public class Rectangle {
    protected int width;
    protected int height;

    public void setWidth(int w)  { this.width = w; }
    public void setHeight(int h) { this.height = h; }
    public int area()            { return width * height; }
}

public class Square extends Rectangle {
    @Override
    public void setWidth(int w)  { this.width = w; this.height = w; }
    @Override
    public void setHeight(int h) { this.width = h; this.height = h; }
}

// Client code that breaks with Square:
void resize(Rectangle r) {
    r.setWidth(5);
    r.setHeight(10);
    assert r.area() == 50; // ❌ Fails for Square — area is 100!
}
```

### Correct Approach — Separate Abstractions

```java
// ✅ Use a common interface without mutable dimension setters
public interface Shape {
    int area();
}

public class Rectangle implements Shape {
    private final int width, height;
    public Rectangle(int w, int h) { this.width = w; this.height = h; }
    public int area() { return width * height; }
}

public class Square implements Shape {
    private final int side;
    public Square(int s) { this.side = s; }
    public int area() { return side * side; }
}
```

### LSP Checklist for Interviews

| Rule | Description |
|------|-------------|
| **Preconditions** | A subtype cannot strengthen preconditions (require more) |
| **Postconditions** | A subtype cannot weaken postconditions (promise less) |
| **Invariants** | A subtype must maintain all invariants of the base type |
| **History constraint** | A subtype cannot introduce state changes the base type wouldn't allow |
| **Exception rule** | A subtype can only throw exceptions that the base type declares (or subtypes of them) |

---

## 5. Interface Segregation Principle (ISP)

> *Clients should not be forced to depend on interfaces they do not use.*

### Fat Interface Problem

```typescript
// ❌ Fat interface — forces all implementations to handle everything
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
  writeReport(): void;
}

// A Robot only works — but is forced to implement eat/sleep/attendMeeting
class Robot implements Worker {
  work() { /* ... */ }
  eat() { throw new Error("Robots don't eat"); }     // ❌
  sleep() { throw new Error("Robots don't sleep"); }  // ❌
  attendMeeting() { throw new Error("N/A"); }         // ❌
  writeReport() { throw new Error("N/A"); }            // ❌
}
```

### Segregated Interfaces

```typescript
// ✅ Small, focused interfaces
interface Workable {
  work(): void;
}

interface Feedable {
  eat(): void;
  sleep(): void;
}

interface Reportable {
  writeReport(): void;
  attendMeeting(): void;
}

class HumanWorker implements Workable, Feedable, Reportable {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
  writeReport() { /* ... */ }
  attendMeeting() { /* ... */ }
}

class Robot implements Workable {
  work() { /* ... */ }
}
```

:::tip Senior-Level Insight
ISP is closely related to the **role interface** pattern. In microservices, ISP manifests as keeping API contracts slim — clients should only need to know about the endpoints they actually call. This is the basis for **consumer-driven contracts**.
:::

---

## 6. Dependency Inversion Principle (DIP)

> *High-level modules should not depend on low-level modules. Both should depend on abstractions.*

```
  ❌ Without DIP                    ✅ With DIP
  ┌──────────────┐               ┌──────────────┐
  │ OrderService │               │ OrderService │
  │  (high-level)│               │  (high-level)│
  └──────┬───────┘               └──────┬───────┘
         │ depends on                    │ depends on
         ▼                              ▼
  ┌──────────────┐               ┌──────────────────┐
  │ MySQLOrderDAO│               │ OrderRepository   │  ◄── interface
  │  (low-level) │               │   (abstraction)   │
  └──────────────┘               └────────┬──────────┘
                                          │ implemented by
                                          ▼
                                 ┌──────────────────┐
                                 │ MySQLOrderRepo   │
                                 │  (low-level)     │
                                 └──────────────────┘
```

### DI Container Example (Spring-style)

```java
// Abstraction
public interface PaymentGateway {
    PaymentResult charge(Money amount, CreditCard card);
}

// Concrete implementation
@Component
public class StripeGateway implements PaymentGateway {
    public PaymentResult charge(Money amount, CreditCard card) {
        return stripeClient.createCharge(amount, card);
    }
}

// High-level module depends only on the interface
@Service
public class CheckoutService {
    private final PaymentGateway paymentGateway;
    private final OrderRepository orderRepository;

    @Autowired // Constructor injection — the preferred approach
    public CheckoutService(PaymentGateway paymentGateway,
                           OrderRepository orderRepository) {
        this.paymentGateway = paymentGateway;
        this.orderRepository = orderRepository;
    }

    public Order checkout(Cart cart, CreditCard card) {
        PaymentResult result = paymentGateway.charge(cart.getTotal(), card);
        if (result.isSuccess()) {
            Order order = Order.from(cart, result.getTransactionId());
            return orderRepository.save(order);
        }
        throw new PaymentFailedException(result.getError());
    }
}
```

| Injection Type | Pros | Cons |
|---------------|------|------|
| **Constructor** | Immutable, testable, required deps explicit | Verbose with many deps (use Builder or factory) |
| **Setter** | Optional dependencies, reconfigurable | Object may be in partial state |
| **Field** | Concise | Hides dependencies, untestable without reflection |

---

## 7. DRY — Don't Repeat Yourself

> *Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.*

### When DRY Applies

| Scenario | Apply DRY? | Reason |
|----------|:----------:|--------|
| Same business rule in 3 places | ✅ Yes | One source of truth |
| Two services share identical validation | ✅ Yes | Extract shared library or module |
| Two unrelated features have similar-looking code | ⚠️ Maybe | Coincidental duplication — they may evolve differently |
| Test setup code repeats across tests | ✅ Yes | Use `@BeforeEach`, test fixtures, or builder helpers |

### When Duplication Is Acceptable

```
Rule of Three: Don't abstract until you see the same pattern
at least THREE times. Premature DRY leads to wrong abstractions.
```

:::warning
The **wrong abstraction** is far more expensive than duplication. If two pieces of code look the same but represent different concepts, coupling them will create a maintenance nightmare. Sandi Metz: *"Duplication is far cheaper than the wrong abstraction."*
:::

---

## 8. KISS — Keep It Simple, Stupid

> *The simplest solution that works is usually the best.*

### Over-Engineering Example

```typescript
// ❌ Over-engineered: AbstractFactoryStrategyProviderManagerBean
interface NotificationStrategy { send(msg: string): void; }
class EmailNotificationStrategy implements NotificationStrategy { /* ... */ }
class NotificationStrategyFactory {
  create(type: string): NotificationStrategy { /* ... */ }
}
class NotificationStrategyFactoryProvider {
  getFactory(): NotificationStrategyFactory { /* ... */ }
}

// ✅ KISS: Just send the email
class NotificationService {
  sendEmail(to: string, message: string): void {
    emailClient.send(to, message);
  }
}
```

:::tip Senior-Level Insight
KISS doesn't mean "never use patterns." It means **don't add indirection until the complexity justifies it**. A single notification channel doesn't need Strategy + Factory + Provider. When you add SMS and push notifications, *then* introduce the abstraction.
:::

---

## 9. YAGNI — You Aren't Gonna Need It

> *Don't build features or abstractions until they're actually needed.*

| Premature Abstraction | Pragmatic Approach |
|-----------------------|-------------------|
| Building a plugin system for 1 provider | Hardcode the single provider; abstract when a second appears |
| Creating a generic `DataSource<T>` for 1 entity | Use a concrete `UserRepository` |
| Adding caching "just in case" | Profile first, cache only proven bottlenecks |
| Building multi-tenancy before the first customer | Ship single-tenant; re-architect when multi-tenancy is funded |

### YAGNI in Practice

```
Cost of building something you don't need:
  1. Time to build it
  2. Time to test it
  3. Time to maintain it
  4. Complexity tax on every future change
  5. Opportunity cost — what you DIDN'T build instead
```

---

## 10. Separation of Concerns (SoC)

> *Each module should address a separate concern — a distinct piece of functionality.*

### Layers in a Typical Application

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  UI, API controllers, serialization
├─────────────────────────────────────────┤
│         Application / Service Layer     │  Use cases, orchestration, DTOs
├─────────────────────────────────────────┤
│         Domain / Business Layer         │  Entities, business rules, domain logic
├─────────────────────────────────────────┤
│         Infrastructure / Data Layer     │  Repositories, external APIs, DB access
└─────────────────────────────────────────┘
```

### Cross-Cutting Concerns

Cross-cutting concerns span multiple layers and should be handled separately using aspects, middleware, or decorators:

| Concern | Typical Implementation |
|---------|----------------------|
| **Logging** | AOP (AspectJ), middleware |
| **Authentication** | Filter/middleware chain |
| **Authorization** | Annotations + interceptors |
| **Caching** | Decorator pattern, `@Cacheable` |
| **Transaction management** | `@Transactional`, UoW pattern |
| **Error handling** | Global exception handler |
| **Metrics / tracing** | Interceptors, agent instrumentation |

---

## 11. Composition over Inheritance

> *Favor object composition over class inheritance.*

### Why Inheritance Can Be Problematic

```
                        Animal
                       /      \
                    Bird      Fish
                   /    \
             Penguin   Eagle

Problem: Penguin can't fly but inherits from Bird.
         Adding a "Swimmer" trait means modifying the hierarchy.
```

### Composition Approach

```typescript
// ✅ Compose behaviors instead of inheriting them
interface CanFly {
  fly(): void;
}

interface CanSwim {
  swim(): void;
}

class FlyingAbility implements CanFly {
  fly() { console.log("Flapping wings"); }
}

class SwimmingAbility implements CanSwim {
  swim() { console.log("Swimming"); }
}

class Eagle {
  private flying = new FlyingAbility();
  fly() { this.flying.fly(); }
}

class Penguin {
  private swimming = new SwimmingAbility();
  swim() { this.swimming.swim(); }
}

class Duck {
  private flying = new FlyingAbility();
  private swimming = new SwimmingAbility();
  fly() { this.flying.fly(); }
  swim() { this.swimming.swim(); }
}
```

| Criteria | Inheritance | Composition |
|----------|:-----------:|:-----------:|
| Code reuse | ✅ | ✅ |
| Flexibility | ❌ Static at compile time | ✅ Swap at runtime |
| Encapsulation | ❌ Subclass sees internals | ✅ Black-box reuse |
| Diamond problem | ❌ Possible | ✅ Avoided |
| Testing | ❌ Hard to isolate | ✅ Easy to mock components |

### When to Use Inheritance

- **IS-A** relationship is genuinely stable (e.g., `IOException extends Exception`)
- The framework requires it (Android `Activity`, JUnit test classes)
- Template Method pattern where the base class defines a skeleton algorithm

---

## 12. Law of Demeter (Principle of Least Knowledge)

> *A method should only talk to its immediate friends — not to strangers.*

### Train Wreck Code (Violation)

```java
// ❌ Violation: reaching through multiple objects
String city = order.getCustomer().getAddress().getCity();

// What if customer is null? What if address is null?
// OrderService now depends on Customer, Address, AND City internals.
```

### Refactored

```java
// ✅ Tell, don't ask — push the behavior down
public class Order {
    public String getShippingCity() {
        return customer.getShippingCity();
    }
}

public class Customer {
    public String getShippingCity() {
        return address.getCity();
    }
}

// Usage: simple, null-safe, and decoupled
String city = order.getShippingCity();
```

:::tip Senior-Level Insight
The Law of Demeter reduces **coupling** — if `Address` changes its structure, only `Customer` needs updating, not every class that navigated through it. In interviews, mention this as a way to limit the **blast radius** of changes.
:::

---

## 13. Principles Comparison & Trade-offs

| Principle | Core Idea | Tension With |
|-----------|-----------|-------------|
| **SRP** | One reason to change | Can lead to class explosion if over-applied |
| **OCP** | Extend without modifying | Premature abstraction (YAGNI) |
| **LSP** | Behavioral substitutability | Complex hierarchies |
| **ISP** | Small, focused interfaces | Too many tiny interfaces |
| **DIP** | Depend on abstractions | Over-abstraction for simple systems |
| **DRY** | No knowledge duplication | Wrong abstraction, coupling unrelated things |
| **KISS** | Simplest solution | May conflict with OCP (patterns add complexity) |
| **YAGNI** | Don't build what you don't need | May conflict with OCP (designing for extension) |

### How Principles Work Together

```
  YAGNI + KISS: "Start simple"
       │
       ▼  (complexity grows)
  SRP + SoC: "Separate concerns into cohesive modules"
       │
       ▼  (need flexibility)
  OCP + DIP: "Design abstractions for extension"
       │
       ▼  (refine interfaces)
  ISP + LSP: "Keep contracts focused and substitutable"
       │
       ▼  (reuse emerges)
  DRY + Composition: "Extract shared behavior via composition"
```

---

## 14. Interview Cheat Sheet

| Question | Key Answer Points |
|----------|-------------------|
| "Explain SRP" | One reason to change; separate orchestration from implementation; show before/after |
| "When would you violate DRY?" | Coincidental duplication; different bounded contexts; early stage code (rule of three) |
| "OCP vs YAGNI conflict?" | Start closed (YAGNI), refactor to open when extension points prove necessary |
| "How do you apply DIP in practice?" | Constructor injection, interface abstraction, IoC containers |
| "Composition vs Inheritance?" | Default to composition; use inheritance only for stable IS-A or framework requirements |
| "What is Law of Demeter?" | Only talk to immediate friends; reduces coupling; show train wreck → refactored |

:::tip Senior-Level Insight
When discussing principles in an interview, always connect them to **real outcomes**: reduced bug surface, easier testing, smaller blast radius of changes, and faster onboarding for new team members. Principles are means to these ends — never goals in themselves.
:::
