---
sidebar_position: 4
title: "03 — Clean Architecture & Code Quality"
slug: 03-clean-architecture
---

# 🏛️ Clean Architecture & Code Quality

How you **organize** code determines how fast you can change it. This chapter covers architecture patterns that keep systems maintainable, plus the discipline of refactoring and managing technical debt.

---

## 1. Clean Architecture (Uncle Bob)

Robert C. Martin's Clean Architecture enforces the **Dependency Rule**: source code dependencies must point **inward** — outer layers depend on inner layers, never the reverse.

### Concentric Circles

```
┌───────────────────────────────────────────────────────────────┐
│                     Frameworks & Drivers                      │
│   (Web framework, DB driver, UI, external APIs, messaging)    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  Interface Adapters                      │  │
│  │   (Controllers, Gateways, Presenters, Repositories)     │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │               Application / Use Cases              │  │  │
│  │  │   (Business workflows, orchestration, DTOs)        │  │  │
│  │  │  ┌─────────────────────────────────────────────┐  │  │  │
│  │  │  │              Entities (Domain)               │  │  │  │
│  │  │  │   (Business rules, domain objects, VOs)      │  │  │  │
│  │  │  └─────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                Dependencies point INWARD →→→
```

### Layer Responsibilities

| Layer | Responsibility | Changes When |
|-------|---------------|-------------|
| **Entities** | Core business rules, domain objects | Business rules change |
| **Use Cases** | Application-specific business logic, orchestration | Workflow requirements change |
| **Adapters** | Convert data between use cases and external formats | API contracts or DB schema change |
| **Frameworks** | Frameworks, tools, DB drivers | Technology stack changes |

### The Dependency Rule in Code

```java
// ✅ Entities — no dependencies on outer layers
public class Order {
    private OrderId id;
    private List<OrderLine> lines;
    private OrderStatus status;

    public Money calculateTotal() {
        return lines.stream()
            .map(OrderLine::subtotal)
            .reduce(Money.ZERO, Money::add);
    }

    public void confirm() {
        if (lines.isEmpty()) throw new EmptyOrderException();
        this.status = OrderStatus.CONFIRMED;
    }
}

// ✅ Use Case — depends on entities + port interfaces (not implementations)
public class PlaceOrderUseCase {
    private final OrderRepository orderRepo;       // port (interface)
    private final PaymentGateway paymentGateway;   // port (interface)
    private final EventPublisher eventPublisher;   // port (interface)

    public PlaceOrderUseCase(OrderRepository orderRepo,
                             PaymentGateway paymentGateway,
                             EventPublisher eventPublisher) {
        this.orderRepo = orderRepo;
        this.paymentGateway = paymentGateway;
        this.eventPublisher = eventPublisher;
    }

    public OrderConfirmation execute(PlaceOrderCommand cmd) {
        Order order = orderRepo.findById(cmd.getOrderId());
        order.confirm();
        paymentGateway.charge(order.calculateTotal(), cmd.getPaymentMethod());
        orderRepo.save(order);
        eventPublisher.publish(new OrderPlacedEvent(order.getId()));
        return new OrderConfirmation(order.getId(), order.calculateTotal());
    }
}

// ✅ Adapter — implements the port, depends on framework
@Repository
public class JpaOrderRepository implements OrderRepository {
    @PersistenceContext private EntityManager em;

    public Order findById(OrderId id) {
        OrderEntity entity = em.find(OrderEntity.class, id.value());
        return OrderMapper.toDomain(entity);
    }

    public void save(Order order) {
        em.merge(OrderMapper.toEntity(order));
    }
}
```

:::tip Senior-Level Insight
The key benefit of Clean Architecture is **testability**: use cases can be tested with in-memory fakes — no database, no HTTP server, no message broker. In interviews, emphasize that inner layers are **framework-agnostic** — you could swap Spring for Micronaut without touching domain logic.
:::

---

## 2. Hexagonal Architecture (Ports & Adapters)

Proposed by Alistair Cockburn. The application is at the center, surrounded by **ports** (interfaces) and **adapters** (implementations).

```
            Driving Side                           Driven Side
         (primary/input)                        (secondary/output)

  ┌──────────────┐                              ┌──────────────────┐
  │  REST API    │──┐                      ┌───▶│  PostgreSQL DB   │
  │  Controller  │  │    ┌────────────┐    │    └──────────────────┘
  └──────────────┘  ├───▶│            │────┤
  ┌──────────────┐  │    │   Domain   │    │    ┌──────────────────┐
  │  CLI         │──┤    │   Core     │    ├───▶│  Stripe API      │
  │  Commands    │  │    │            │    │    └──────────────────┘
  └──────────────┘  │    │  (Ports =  │    │
  ┌──────────────┐  │    │ Interfaces)│    │    ┌──────────────────┐
  │  Message     │──┘    │            │────┴───▶│  Kafka Producer  │
  │  Consumer    │       └────────────┘         └──────────────────┘
  └──────────────┘
        │                      │                       │
    Driving                  Ports                  Driven
    Adapters              (Interfaces)             Adapters
```

| Concept | Description | Example |
|---------|-------------|---------|
| **Port** | Interface defined by the domain | `OrderRepository`, `PaymentGateway` |
| **Driving Adapter** | Calls into the domain (triggers use cases) | REST controller, CLI, message consumer |
| **Driven Adapter** | Called by the domain (implements ports) | Database repo, HTTP client, message producer |

### Driving vs Driven

| Aspect | Driving (Primary) | Driven (Secondary) |
|--------|-------------------|-------------------|
| **Direction** | Outside → Application | Application → Outside |
| **Who calls whom** | Adapter calls the port | Application calls the port |
| **Examples** | HTTP controller, test harness | DB repository, payment gateway, email service |
| **Port type** | Input port (use case interface) | Output port (repository/gateway interface) |

---

## 3. Layered Architecture

The most traditional architecture pattern. Each layer serves the layer above it.

```
┌───────────────────────────────────┐
│    Presentation Layer             │  Controllers, Views, API endpoints
│    (handles HTTP, serialization)  │
├───────────────────────────────────┤
│    Business Logic Layer           │  Services, domain rules, validation
│    (application + domain rules)   │
├───────────────────────────────────┤
│    Data Access Layer              │  Repositories, ORMs, query builders
│    (persistence abstraction)      │
├───────────────────────────────────┤
│    Database / External Services   │  PostgreSQL, Redis, third-party APIs
└───────────────────────────────────┘

     Strict layering: each layer only calls the layer directly below.
     Relaxed layering: any layer can call any lower layer.
```

### Pros and Cons

| Pros | Cons |
|------|------|
| Simple, well-understood | Can lead to **anemic domain model** |
| Clear separation of concerns | Business logic leaks into controllers |
| Easy to onboard new developers | Strict layering adds pass-through methods |
| Testable layer by layer | Changes often require modifying all layers |

---

## 4. Onion Architecture

Jeffrey Palermo's Onion Architecture is conceptually similar to Clean Architecture — the domain is at the center, and dependencies point inward.

### Comparison Table

| Aspect | Layered | Hexagonal | Clean | Onion |
|--------|---------|-----------|-------|-------|
| **Dependency direction** | Top → Bottom | Outside → Inside | Outside → Inside | Outside → Inside |
| **Domain isolation** | Weak | Strong | Strong | Strong |
| **Framework coupling** | High | Low | Low | Low |
| **Testability** | Medium | High | High | High |
| **Complexity** | Low | Medium | Medium–High | Medium |
| **Best for** | Simple CRUD apps | Service-oriented | Complex domains | Complex domains |

:::tip Senior-Level Insight
In interviews, don't argue which architecture is "best" — explain that they're all variations of the same principle: **isolate the domain from infrastructure**. Choose based on project complexity. A simple CRUD API doesn't need hexagonal architecture; a complex trading platform does.
:::

---

## 5. Domain-Driven Design Basics

DDD is a design philosophy by Eric Evans that aligns software with the business domain.

### Core Building Blocks

| Concept | Definition | Example |
|---------|-----------|---------|
| **Entity** | Has a unique identity that persists over time | `Order`, `User`, `Account` |
| **Value Object** | Defined by its attributes, no identity; immutable | `Money`, `Address`, `DateRange` |
| **Aggregate** | Cluster of entities/VOs with a single root; consistency boundary | `Order` (root) + `OrderLine` items |
| **Aggregate Root** | The only entry point to the aggregate; enforces invariants | `Order` controls adding/removing lines |
| **Repository** | Persistence abstraction for aggregates | `OrderRepository` |
| **Domain Service** | Business logic that doesn't belong to any entity | `PricingService`, `TransferService` |
| **Domain Event** | Something meaningful that happened in the domain | `OrderPlaced`, `PaymentReceived` |
| **Bounded Context** | Explicit boundary within which a domain model applies | `Billing` context vs `Shipping` context |

### Aggregate Rules

```
┌──────────────────────────────────┐
│        Order (Aggregate Root)     │
│  ┌────────┐  ┌────────┐         │
│  │LineItem│  │LineItem│  ...    │
│  └────────┘  └────────┘         │
│  ┌─────────────────┐            │
│  │ ShippingAddress  │ (VO)      │
│  └─────────────────┘            │
└──────────────────────────────────┘

Rules:
  1. External objects reference the aggregate only via the root (Order)
  2. The root enforces all invariants
  3. Deleting the root deletes everything inside
  4. Aggregate boundaries = transaction boundaries
```

```java
// Value Object — immutable, equality by attributes
public record Money(BigDecimal amount, Currency currency) {
    public Money add(Money other) {
        if (!currency.equals(other.currency))
            throw new CurrencyMismatchException();
        return new Money(amount.add(other.amount), currency);
    }
}

// Aggregate Root — enforces invariants
public class Order {
    private final OrderId id;
    private final List<OrderLine> lines = new ArrayList<>();
    private OrderStatus status = OrderStatus.DRAFT;

    public void addLine(Product product, int quantity) {
        if (status != OrderStatus.DRAFT)
            throw new IllegalStateException("Cannot modify confirmed order");
        if (quantity <= 0)
            throw new InvalidQuantityException();
        lines.add(new OrderLine(product.getId(), quantity, product.getPrice()));
    }

    public Money total() {
        return lines.stream()
            .map(OrderLine::subtotal)
            .reduce(Money.ZERO, Money::add);
    }
}
```

---

## 6. Refactoring Patterns

Refactoring is improving internal structure without changing external behavior. Martin Fowler's catalog defines dozens of patterns; here are the most important for interviews.

| Refactoring | Before | After | When to Apply |
|-------------|--------|-------|---------------|
| **Extract Method** | Long method with embedded logic | Multiple small, named methods | Method > 10 lines or has comments explaining sections |
| **Extract Class** | God class with multiple responsibilities | Multiple focused classes | Class has > 1 reason to change (SRP violation) |
| **Move Method** | Method uses more features of another class | Move to the class it belongs to | Feature Envy smell |
| **Replace Conditional with Polymorphism** | `if/switch` on type to determine behavior | Subclasses or Strategy pattern | Type-checking switch statements |
| **Introduce Parameter Object** | Method with many parameters | Group related params into an object | Method has > 3 related parameters |
| **Replace Inheritance with Delegation** | Subclass overrides most behavior | Composition with delegation | Subclass isn't truly IS-A |

### Extract Method — Example

```java
// ❌ Before: one method does everything
public void printInvoice(Invoice invoice) {
    System.out.println("=== INVOICE ===");
    System.out.println("Customer: " + invoice.getCustomer().getName());
    System.out.println("Date: " + invoice.getDate());

    double total = 0;
    for (LineItem item : invoice.getItems()) {
        double lineTotal = item.getQuantity() * item.getPrice();
        System.out.printf("  %s x%d = $%.2f%n", item.getName(), item.getQuantity(), lineTotal);
        total += lineTotal;
    }

    double tax = total * 0.08;
    System.out.printf("Subtotal: $%.2f%n", total);
    System.out.printf("Tax: $%.2f%n", tax);
    System.out.printf("Total: $%.2f%n", total + tax);
}

// ✅ After: extracted into meaningful methods
public void printInvoice(Invoice invoice) {
    printHeader(invoice);
    double subtotal = printLineItems(invoice.getItems());
    printTotals(subtotal);
}
```

### Replace Conditional with Polymorphism

```java
// ❌ Before: switch on type
public double calculatePay(Employee e) {
    switch (e.getType()) {
        case SALARIED:   return e.getMonthlySalary();
        case HOURLY:     return e.getHoursWorked() * e.getHourlyRate();
        case COMMISSION: return e.getBasePay() + e.getSales() * e.getCommissionRate();
        default: throw new IllegalArgumentException();
    }
}

// ✅ After: polymorphism
public interface PayCalculator {
    double calculatePay();
}

public class SalariedPay implements PayCalculator {
    public double calculatePay() { return monthlySalary; }
}

public class HourlyPay implements PayCalculator {
    public double calculatePay() { return hoursWorked * hourlyRate; }
}

public class CommissionPay implements PayCalculator {
    public double calculatePay() { return basePay + sales * commissionRate; }
}
```

---

## 7. Code Smells

Code smells are **surface-level indicators** that something deeper may be wrong. They don't always require fixing — context matters.

| Smell | Description | Typical Fix |
|-------|-------------|-------------|
| **Long Method** | Method > 20–30 lines with multiple concerns | Extract Method |
| **God Class** | Class with 1000+ lines, handles everything | Extract Class, apply SRP |
| **Feature Envy** | Method uses another class's data more than its own | Move Method |
| **Shotgun Surgery** | One change requires editing many classes | Move Method/Field to consolidate |
| **Divergent Change** | One class changed for multiple unrelated reasons | Extract Class |
| **Data Clumps** | Same group of fields appear together repeatedly | Introduce Parameter Object / Value Object |
| **Primitive Obsession** | Using primitives instead of small objects | Replace Primitive with Value Object (`Money`, `Email`) |
| **Long Parameter List** | Method with > 3–4 parameters | Introduce Parameter Object |
| **Switch Statements** | Type-checking switches scattered through code | Replace Conditional with Polymorphism |
| **Dead Code** | Unreachable or unused code | Delete it |
| **Comments as Deodorant** | Comments explaining what bad code does | Refactor so the code is self-explanatory |
| **Refused Bequest** | Subclass ignores most inherited methods | Replace Inheritance with Delegation |

:::warning
Not every smell needs immediate fixing. Smells are **heuristics**, not rules. In an interview, show that you can **identify** the smell, **explain** why it's problematic, and **propose** the appropriate refactoring — but also discuss when it's acceptable to live with it (e.g., under time pressure, low-change code).
:::

---

## 8. Technical Debt

Technical debt is the **implied cost of future rework** caused by choosing an easy/limited solution now instead of a better approach that would take longer.

### The Technical Debt Quadrant (Martin Fowler)

```
                        Deliberate
                    ┌──────────────────┐
                    │                  │
       Prudent      │  "We know this   │   Reckless
                    │  is a shortcut   │
    "We must ship   │  but we'll fix   │  "Just copy-paste
     now and deal   │  it next sprint" │   it everywhere"
     with it later" │                  │
                    ├──────────────────┤
                    │                  │
                    │  "What's even    │   Reckless
       Prudent      │  layering?"      │
                    │                  │
    "Now we know    │  "We didn't      │  "We didn't know
     how we should  │  know we were    │   we were writing
     have done it"  │  taking debt"    │   bad code"
                    │                  │
                    └──────────────────┘
                        Inadvertent
```

| Quadrant | Type | Example |
|----------|------|---------|
| **Prudent + Deliberate** | Strategic shortcut | Ship MVP with hardcoded config; ticket to parameterize |
| **Reckless + Deliberate** | Lazy shortcut | "No time for tests" — known risk, no plan to fix |
| **Prudent + Inadvertent** | Learned better approach | After building v1, realize a better design exists |
| **Reckless + Inadvertent** | Lack of skill | Junior dev doesn't know about separation of concerns |

### Managing Technical Debt

| Strategy | Description |
|----------|-------------|
| **Track it** | Log debt items in backlog with estimated cost-to-fix |
| **Make it visible** | Include tech debt in sprint reviews, use metrics (cyclomatic complexity, coupling) |
| **Budget for it** | Allocate 15–20% of sprint capacity to debt reduction |
| **Boy Scout Rule** | Leave code cleaner than you found it — small improvements each PR |
| **Strangler Fig** | Gradually replace legacy components without big-bang rewrites |
| **Refactoring sprints** | Dedicated sprints for major debt paydown (use sparingly) |

:::tip Senior-Level Insight
In interviews, frame technical debt as a **business decision**, not a technical failure. Sometimes taking on debt is the right choice (time-to-market). The problem is **unmanaged** debt that accumulates silently. Show that you can quantify debt impact: *"This shortcut saves 2 weeks now but will cost 1 week of extra development for every feature touching this module."*
:::

---

## 9. Monolith vs Microservices (Code Organization)

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Codebase** | Single repository, shared build | Multiple repos (or monorepo), independent builds |
| **Deployment** | All-or-nothing deploy | Independent per-service deployment |
| **Module boundaries** | Package/namespace boundaries (weak) | Network boundaries (strong) |
| **Data ownership** | Shared database | Database per service |
| **Refactoring** | IDE rename/move works across everything | Cross-service refactoring requires coordination |
| **Testing** | Single test suite, fast integration tests | Contract tests, service-level integration tests |
| **Team scaling** | Hard beyond ~10 developers (merge conflicts) | Independent teams per service |
| **Complexity** | In the code | In the infrastructure |

### Modular Monolith — The Middle Ground

```
┌──────────────────────────────────────────┐
│               Monolith Process           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Orders   │ │ Payments │ │ Shipping │ │
│  │ Module   │ │ Module   │ │ Module   │ │
│  ├──────────┤ ├──────────┤ ├──────────┤ │
│  │ Public   │ │ Public   │ │ Public   │ │
│  │ API only │ │ API only │ │ API only │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │             │       │
│  ┌────┴─────────────┴─────────────┴────┐ │
│  │        Shared Infrastructure         │ │
│  │   (DB, messaging, config, auth)      │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘

Modules communicate via well-defined interfaces,
not direct database access. This makes extracting
a module into a microservice a straightforward step.
```

:::tip Senior-Level Insight
The **modular monolith** is often the best starting point. It gives you clear module boundaries (which are necessary for microservices anyway) without the operational complexity of distributed systems. Extract to microservices only when you have a clear scaling, deployment, or team-autonomy reason. Sam Newman: *"If you can't build a well-structured monolith, what makes you think you can build a well-structured set of microservices?"*
:::

---

## 10. Interview Cheat Sheet

| Question | Key Answer Points |
|----------|-------------------|
| "Explain Clean Architecture" | Concentric circles, dependency rule (point inward), entities are framework-agnostic, use cases orchestrate domain logic |
| "Hexagonal vs Clean?" | Same core idea (isolate domain); hexagonal emphasizes ports/adapters terminology, clean emphasizes layers |
| "What is technical debt?" | Strategic shortcuts with implied future cost; use quadrant model; manage with tracking + budgeting |
| "How do you identify code smells?" | Long methods, God classes, Feature Envy, Shotgun Surgery; address with targeted refactoring |
| "Monolith or microservices?" | Start with modular monolith; extract to microservices for scaling/team-autonomy reasons; don't split prematurely |
| "What is DDD?" | Align software with business domain; entities, VOs, aggregates, bounded contexts; ubiquitous language |
| "Favorite refactoring?" | Extract Method (most common), Replace Conditional with Polymorphism (most impactful for design) |
