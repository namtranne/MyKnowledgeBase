---
sidebar_position: 3
title: "02 — Design Patterns"
slug: 02-design-patterns
---

# 🧩 Design Patterns

Design patterns are **proven, reusable solutions** to recurring software design problems. They were popularized by the Gang of Four (GoF) in 1994. Knowing *when* and *why* to apply a pattern matters far more than memorizing the UML.

---

## 1. Pattern Categories — Overview

| Category | Purpose | Patterns Covered |
|----------|---------|------------------|
| **Creational** | Object creation mechanisms | Singleton, Factory Method, Abstract Factory, Builder, Prototype |
| **Structural** | Object composition and relationships | Adapter, Decorator, Facade, Proxy, Composite |
| **Behavioral** | Communication between objects | Strategy, Observer, Template Method, Command, State, Chain of Responsibility |

---

## 2. Creational Patterns

### 2.1 Singleton

**Intent:** Ensure a class has exactly **one instance** and provide a global access point.

**When to use:** Logging, configuration, connection pools, thread pools.

```java
// ✅ Thread-safe Singleton — Enum-based (Joshua Bloch, Effective Java)
public enum AppConfig {
    INSTANCE;

    private final Properties props = new Properties();

    AppConfig() {
        try (InputStream is = getClass().getResourceAsStream("/app.properties")) {
            props.load(is);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load config", e);
        }
    }

    public String get(String key) {
        return props.getProperty(key);
    }
}

// Usage
String dbUrl = AppConfig.INSTANCE.get("db.url");
```

```java
// ✅ Thread-safe Singleton — Double-checked locking (when enum isn't suitable)
public class ConnectionPool {
    private static volatile ConnectionPool instance;

    private ConnectionPool() { /* initialize pool */ }

    public static ConnectionPool getInstance() {
        if (instance == null) {                    // First check (no locking)
            synchronized (ConnectionPool.class) {
                if (instance == null) {            // Second check (with lock)
                    instance = new ConnectionPool();
                }
            }
        }
        return instance;
    }
}
```

| Approach | Thread-Safe | Lazy | Serialization-Safe | Reflection-Safe |
|----------|:-----------:|:----:|:------------------:|:---------------:|
| Eager static field | ✅ | ❌ | ❌ | ❌ |
| Synchronized method | ✅ | ✅ | ❌ | ❌ |
| Double-checked locking | ✅ | ✅ | ❌ | ❌ |
| Holder pattern | ✅ | ✅ | ❌ | ❌ |
| **Enum-based** | ✅ | ❌ | ✅ | ✅ |

:::warning
Singleton is often overused. Before using it, ask: *"Does this truly need to be a single instance, or am I just using it as a global variable?"* In most modern apps, **dependency injection** is preferred over Singleton.
:::

---

### 2.2 Factory Method

**Intent:** Define an interface for creating an object, but let subclasses decide which class to instantiate.

```java
// Abstract creator
public abstract class NotificationFactory {
    public abstract Notification createNotification();

    public void sendNotification(String message) {
        Notification notification = createNotification();
        notification.send(message);
    }
}

// Concrete creators
public class EmailNotificationFactory extends NotificationFactory {
    public Notification createNotification() {
        return new EmailNotification();
    }
}

public class SmsNotificationFactory extends NotificationFactory {
    public Notification createNotification() {
        return new SmsNotification();
    }
}
```

**Real-world usage:** `java.util.Calendar.getInstance()`, Spring `BeanFactory`, `LoggerFactory.getLogger()`.

---

### 2.3 Abstract Factory

**Intent:** Provide an interface for creating **families of related objects** without specifying concrete classes.

```java
// Abstract factory
public interface UIComponentFactory {
    Button createButton();
    TextField createTextField();
    Checkbox createCheckbox();
}

// Concrete factory — Material Design
public class MaterialUIFactory implements UIComponentFactory {
    public Button createButton()       { return new MaterialButton(); }
    public TextField createTextField()  { return new MaterialTextField(); }
    public Checkbox createCheckbox()    { return new MaterialCheckbox(); }
}

// Concrete factory — iOS style
public class IOSUIFactory implements UIComponentFactory {
    public Button createButton()       { return new IOSButton(); }
    public TextField createTextField()  { return new IOSTextField(); }
    public Checkbox createCheckbox()    { return new IOSCheckbox(); }
}
```

:::tip Senior-Level Insight
**Factory Method** = one product, subclass decides. **Abstract Factory** = family of products, entire theme/platform decides. In interviews, the key distinction is that Abstract Factory ensures **consistency** across related objects.
:::

---

### 2.4 Builder

**Intent:** Separate the construction of a complex object from its representation, allowing the same construction process to create different representations.

```java
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeoutMs;

    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = Map.copyOf(builder.headers);
        this.body = builder.body;
        this.timeoutMs = builder.timeoutMs;
    }

    public static class Builder {
        private final String url;                              // required
        private String method = "GET";                         // default
        private Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeoutMs = 5000;

        public Builder(String url) { this.url = url; }

        public Builder method(String method)          { this.method = method; return this; }
        public Builder header(String key, String val) { headers.put(key, val); return this; }
        public Builder body(String body)              { this.body = body; return this; }
        public Builder timeout(int ms)                { this.timeoutMs = ms; return this; }

        public HttpRequest build() {
            if (url == null || url.isBlank()) throw new IllegalStateException("URL required");
            return new HttpRequest(this);
        }
    }
}

// Usage — reads like a sentence
HttpRequest req = new HttpRequest.Builder("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .body("{\"name\": \"Alice\"}")
    .timeout(3000)
    .build();
```

**Real-world usage:** `StringBuilder`, Lombok `@Builder`, Protobuf message builders, OkHttp `Request.Builder`.

---

### 2.5 Prototype

**Intent:** Create new objects by **cloning** an existing instance rather than constructing from scratch.

```java
public abstract class Shape implements Cloneable {
    public abstract Shape clone();
}

public class Circle extends Shape {
    private int radius;
    private String color;

    public Circle(int radius, String color) {
        this.radius = radius;
        this.color = color;
    }

    @Override
    public Circle clone() {
        return new Circle(this.radius, this.color);
    }
}

// Pre-configured prototypes
Map<String, Shape> registry = Map.of(
    "red-circle",  new Circle(10, "red"),
    "blue-circle", new Circle(5, "blue")
);

Shape myCircle = registry.get("red-circle").clone();
```

**Real-world usage:** `Object.clone()` in Java, JavaScript prototype chain, game entity spawning.

---

## 3. Structural Patterns

### 3.1 Adapter

**Intent:** Convert the interface of a class into another interface that clients expect.

```typescript
// Legacy payment processor with incompatible interface
class LegacyPaymentProcessor {
  makePayment(amount: number, currency: string, cardNum: string): boolean {
    // Old API call
    return true;
  }
}

// Modern interface your system uses
interface PaymentGateway {
  charge(request: ChargeRequest): ChargeResult;
}

// Adapter bridges the gap
class LegacyPaymentAdapter implements PaymentGateway {
  constructor(private legacy: LegacyPaymentProcessor) {}

  charge(request: ChargeRequest): ChargeResult {
    const success = this.legacy.makePayment(
      request.amount,
      request.currency,
      request.cardNumber
    );
    return { success, transactionId: success ? generateId() : null };
  }
}
```

---

### 3.2 Decorator

**Intent:** Attach additional responsibilities to an object **dynamically**, providing a flexible alternative to subclassing.

```java
// Base interface
public interface DataSource {
    void writeData(String data);
    String readData();
}

// Concrete component
public class FileDataSource implements DataSource {
    private final String filename;
    public FileDataSource(String filename) { this.filename = filename; }
    public void writeData(String data) { /* write to file */ }
    public String readData() { /* read from file */ return ""; }
}

// Decorator base
public abstract class DataSourceDecorator implements DataSource {
    protected final DataSource wrappee;
    public DataSourceDecorator(DataSource source) { this.wrappee = source; }
    public void writeData(String data) { wrappee.writeData(data); }
    public String readData() { return wrappee.readData(); }
}

// Concrete decorators
public class EncryptionDecorator extends DataSourceDecorator {
    public EncryptionDecorator(DataSource source) { super(source); }
    public void writeData(String data) { super.writeData(encrypt(data)); }
    public String readData() { return decrypt(super.readData()); }
}

public class CompressionDecorator extends DataSourceDecorator {
    public CompressionDecorator(DataSource source) { super(source); }
    public void writeData(String data) { super.writeData(compress(data)); }
    public String readData() { return decompress(super.readData()); }
}

// Stack decorators
DataSource source = new CompressionDecorator(
    new EncryptionDecorator(
        new FileDataSource("secret.dat")
    )
);
source.writeData("sensitive data"); // compressed → encrypted → written to file
```

**Real-world usage:** Java I/O streams (`BufferedInputStream(new FileInputStream(...))`), middleware pipelines.

---

### 3.3 Facade

**Intent:** Provide a **simplified interface** to a complex subsystem.

```java
// Complex subsystem classes
class VideoDecoder { /* ... */ }
class AudioDecoder { /* ... */ }
class SubtitleParser { /* ... */ }
class VideoRenderer { /* ... */ }

// Facade simplifies usage
public class MediaPlayerFacade {
    private final VideoDecoder video = new VideoDecoder();
    private final AudioDecoder audio = new AudioDecoder();
    private final SubtitleParser subs = new SubtitleParser();
    private final VideoRenderer renderer = new VideoRenderer();

    public void play(String filename) {
        VideoStream vs = video.decode(filename);
        AudioStream as = audio.decode(filename);
        Subtitles st = subs.parse(filename);
        renderer.render(vs, as, st);
    }
}
```

---

### 3.4 Proxy

**Intent:** Provide a surrogate or placeholder for another object to control access.

| Proxy Type | Purpose | Example |
|-----------|---------|---------|
| **Virtual** | Lazy initialization of expensive objects | Image loading, ORM lazy relations |
| **Protection** | Access control | Role-based method restrictions |
| **Remote** | Represent remote objects locally | RMI, gRPC stubs |
| **Caching** | Cache results of expensive operations | API response caching |
| **Logging** | Track access for monitoring | Audit log proxies |

```java
public class CachingUserServiceProxy implements UserService {
    private final UserService realService;
    private final Cache<String, User> cache;

    public CachingUserServiceProxy(UserService realService) {
        this.realService = realService;
        this.cache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5))
            .build();
    }

    public User findById(String id) {
        return cache.get(id, realService::findById);
    }
}
```

---

### 3.5 Composite

**Intent:** Compose objects into **tree structures** to represent part-whole hierarchies. Clients treat individual objects and compositions uniformly.

```java
public interface FileSystemNode {
    String getName();
    long getSize();
    void print(String indent);
}

public class File implements FileSystemNode {
    private final String name;
    private final long size;

    public File(String name, long size) { this.name = name; this.size = size; }
    public String getName() { return name; }
    public long getSize()   { return size; }
    public void print(String indent) { System.out.println(indent + name + " (" + size + "B)"); }
}

public class Directory implements FileSystemNode {
    private final String name;
    private final List<FileSystemNode> children = new ArrayList<>();

    public Directory(String name) { this.name = name; }
    public void add(FileSystemNode node) { children.add(node); }
    public String getName() { return name; }
    public long getSize()   { return children.stream().mapToLong(FileSystemNode::getSize).sum(); }
    public void print(String indent) {
        System.out.println(indent + name + "/");
        children.forEach(c -> c.print(indent + "  "));
    }
}
```

---

## 4. Behavioral Patterns

### 4.1 Strategy

**Intent:** Define a family of algorithms, encapsulate each one, and make them **interchangeable**.

```typescript
interface SortStrategy<T> {
  sort(data: T[]): T[];
}

class QuickSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] { /* quicksort implementation */ return data; }
}

class MergeSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] { /* mergesort implementation */ return data; }
}

class DataProcessor<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>) { this.strategy = strategy; }

  process(data: T[]): T[] {
    return this.strategy.sort(data);
  }
}
```

---

### 4.2 Observer (Pub/Sub)

**Intent:** Define a one-to-many dependency so that when one object changes state, all dependents are notified.

```java
public interface EventListener {
    void update(String eventType, Object data);
}

public class EventBus {
    private final Map<String, List<EventListener>> listeners = new ConcurrentHashMap<>();

    public void subscribe(String eventType, EventListener listener) {
        listeners.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>())
                 .add(listener);
    }

    public void unsubscribe(String eventType, EventListener listener) {
        List<EventListener> subs = listeners.get(eventType);
        if (subs != null) subs.remove(listener);
    }

    public void publish(String eventType, Object data) {
        List<EventListener> subs = listeners.getOrDefault(eventType, List.of());
        for (EventListener listener : subs) {
            listener.update(eventType, data);
        }
    }
}

// Usage
EventBus bus = new EventBus();
bus.subscribe("order.created", (type, data) -> emailService.sendConfirmation((Order) data));
bus.subscribe("order.created", (type, data) -> inventoryService.reserve((Order) data));
bus.publish("order.created", newOrder);
```

**Real-world usage:** DOM event listeners, React state/context, Kafka consumers, Spring `ApplicationEvent`.

---

### 4.3 Template Method

**Intent:** Define the **skeleton** of an algorithm in a base class, letting subclasses override specific steps.

```java
public abstract class DataImporter {

    // Template method — defines the algorithm skeleton
    public final void importData(String source) {
        String raw = readData(source);
        List<Record> records = parseData(raw);
        List<Record> valid = validateData(records);
        saveData(valid);
        notifyCompletion(valid.size());
    }

    protected abstract String readData(String source);
    protected abstract List<Record> parseData(String raw);

    protected List<Record> validateData(List<Record> records) {
        return records.stream().filter(Record::isValid).toList(); // default impl
    }

    protected abstract void saveData(List<Record> records);

    protected void notifyCompletion(int count) {
        log.info("Imported {} records", count); // default hook
    }
}

public class CsvImporter extends DataImporter {
    protected String readData(String source)        { return readFile(source); }
    protected List<Record> parseData(String raw)     { return parseCsv(raw); }
    protected void saveData(List<Record> records)    { repository.saveAll(records); }
}
```

---

### 4.4 Command

**Intent:** Encapsulate a request as an object, allowing you to parameterize, queue, log, and undo operations.

```java
public interface Command {
    void execute();
    void undo();
}

public class AddToCartCommand implements Command {
    private final Cart cart;
    private final Product product;

    public AddToCartCommand(Cart cart, Product product) {
        this.cart = cart;
        this.product = product;
    }

    public void execute() { cart.add(product); }
    public void undo()    { cart.remove(product); }
}

// Command history for undo/redo
public class CommandHistory {
    private final Deque<Command> history = new ArrayDeque<>();

    public void execute(Command cmd) {
        cmd.execute();
        history.push(cmd);
    }

    public void undo() {
        if (!history.isEmpty()) {
            history.pop().undo();
        }
    }
}
```

**Real-world usage:** Undo/redo in editors, task queues, transaction logs, CQRS.

---

### 4.5 State

**Intent:** Allow an object to **alter its behavior** when its internal state changes.

```java
public interface OrderState {
    void next(OrderContext ctx);
    void cancel(OrderContext ctx);
    String getStatus();
}

public class PendingState implements OrderState {
    public void next(OrderContext ctx)   { ctx.setState(new PaidState()); }
    public void cancel(OrderContext ctx) { ctx.setState(new CancelledState()); }
    public String getStatus()            { return "PENDING"; }
}

public class PaidState implements OrderState {
    public void next(OrderContext ctx)   { ctx.setState(new ShippedState()); }
    public void cancel(OrderContext ctx) { throw new IllegalStateException("Cannot cancel paid order"); }
    public String getStatus()            { return "PAID"; }
}

public class ShippedState implements OrderState {
    public void next(OrderContext ctx)   { ctx.setState(new DeliveredState()); }
    public void cancel(OrderContext ctx) { throw new IllegalStateException("Cannot cancel shipped order"); }
    public String getStatus()            { return "SHIPPED"; }
}
```

---

### 4.6 Chain of Responsibility

**Intent:** Pass a request along a **chain of handlers**, where each handler decides to process the request or pass it to the next handler.

```java
public abstract class AuthHandler {
    private AuthHandler next;

    public AuthHandler setNext(AuthHandler next) {
        this.next = next;
        return next;
    }

    public boolean handle(Request request) {
        if (!check(request)) return false;
        if (next != null) return next.handle(request);
        return true;
    }

    protected abstract boolean check(Request request);
}

public class RateLimitHandler extends AuthHandler {
    protected boolean check(Request req) { return !rateLimiter.isExceeded(req.getIp()); }
}

public class AuthenticationHandler extends AuthHandler {
    protected boolean check(Request req) { return tokenService.isValid(req.getToken()); }
}

public class AuthorizationHandler extends AuthHandler {
    protected boolean check(Request req) { return rbac.hasPermission(req.getUser(), req.getResource()); }
}

// Build chain
AuthHandler chain = new RateLimitHandler();
chain.setNext(new AuthenticationHandler())
     .setNext(new AuthorizationHandler());

boolean allowed = chain.handle(incomingRequest);
```

**Real-world usage:** Servlet filters, Express.js middleware, Spring Security filter chain.

---

## 5. Dependency Injection

DI is a technique where an object receives its dependencies from the outside rather than creating them itself. It implements the **Dependency Inversion Principle**.

### Injection Types

```java
// 1. Constructor Injection (preferred)
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }
}

// 2. Setter Injection (optional dependencies)
public class ReportService {
    private Formatter formatter;
    public void setFormatter(Formatter f) { this.formatter = f; }
}

// 3. Interface Injection (rarely used)
public interface FormatterAware {
    void injectFormatter(Formatter f);
}
```

### IoC Containers

| Container | Language | Key Features |
|-----------|----------|-------------|
| **Spring** | Java | Full DI + AOP, annotation-based, profiles |
| **Guice** | Java | Lightweight, module-based binding |
| **Dagger** | Java/Kotlin | Compile-time DI, zero reflection, Android |
| **InversifyJS** | TypeScript | Decorator-based, similar to Guice |
| **Wire** | Go | Compile-time code generation |

:::tip Senior-Level Insight
In interviews, emphasize that DI makes code **testable** — you can inject mocks in tests and real implementations in production. Constructor injection is preferred because dependencies are explicit, required, and the object is fully initialized after construction.
:::

---

## 6. Repository Pattern

**Intent:** Mediate between the domain and data mapping layers, acting like an **in-memory collection** of domain objects.

```java
// Domain-focused interface
public interface OrderRepository {
    Order findById(OrderId id);
    List<Order> findByCustomer(CustomerId customerId);
    List<Order> findPendingOlderThan(Duration age);
    void save(Order order);
    void delete(OrderId id);
}

// Infrastructure implementation
@Repository
public class JpaOrderRepository implements OrderRepository {
    @PersistenceContext
    private EntityManager em;

    public Order findById(OrderId id) {
        return em.find(OrderEntity.class, id.value())
                 .toDomain(); // map entity → domain object
    }

    public void save(Order order) {
        em.merge(OrderEntity.fromDomain(order));
    }
    // ...
}
```

---

## 7. Pattern Selection Guide

| Problem | Pattern(s) to Consider |
|---------|----------------------|
| Need exactly one instance | Singleton (or DI scope) |
| Object creation is complex | Builder, Factory Method |
| Family of related objects | Abstract Factory |
| Make incompatible interfaces work together | Adapter |
| Add behavior without modifying class | Decorator |
| Simplify a complex subsystem | Facade |
| Control access or add cross-cutting concern | Proxy |
| Swap algorithms at runtime | Strategy |
| React to state changes | Observer |
| Define algorithm skeleton with variable steps | Template Method |
| Encapsulate requests for undo/queue/log | Command |
| Object behavior depends on state | State |
| Pipeline of processors | Chain of Responsibility |
| Tree structures treated uniformly | Composite |

---

## 8. Anti-Patterns to Avoid

| Anti-Pattern | Description | Fix |
|-------------|-------------|-----|
| **God Object** | One class does everything; thousands of lines | Apply SRP — decompose into focused classes |
| **Spaghetti Code** | No clear structure, tangled control flow | Introduce layers, extract methods, use patterns |
| **Golden Hammer** | Using one pattern/technology for everything | Choose the right tool for the problem |
| **Lava Flow** | Dead code nobody dares remove | Track coverage, delete unused code with confidence |
| **Copy-Paste Programming** | Duplicating code instead of abstracting | Apply DRY, extract shared logic |
| **Premature Optimization** | Optimizing before profiling | Measure first, then optimize bottlenecks |
| **Singleton Abuse** | Using Singleton as a global variable | Use DI with appropriate scoping |
| **Circular Dependency** | A depends on B, B depends on A | Introduce an interface or mediator |

:::warning
Knowing **anti-patterns** is as important as knowing patterns. In code review interviews, identifying an anti-pattern and proposing the fix demonstrates senior-level thinking.
:::

---

## 9. Interview Cheat Sheet

| Question | Key Answer Points |
|----------|-------------------|
| "Singleton vs Static class?" | Singleton can implement interfaces, supports lazy init, can be mocked; static class cannot |
| "Factory Method vs Abstract Factory?" | FM = one product, AF = family of products ensuring consistency |
| "When to use Decorator vs Proxy?" | Decorator adds behavior; Proxy controls access. Decorator chains; Proxy usually wraps once |
| "Strategy vs Template Method?" | Strategy = composition (swap at runtime); TM = inheritance (fixed skeleton) |
| "Observer vs Pub/Sub?" | Observer = direct reference; Pub/Sub = message broker decouples sender/receiver |
| "Why is DI important?" | Testability, loose coupling, SRP, OCP — swap implementations without changing consumers |

:::tip Senior-Level Insight
Don't just name the pattern — describe the **problem** it solves, the **trade-off** it introduces (added indirection), and a **real system** where you've used it. That's what distinguishes senior answers from textbook answers.
:::
