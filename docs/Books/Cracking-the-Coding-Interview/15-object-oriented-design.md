# Chapter 7 — Object-Oriented Design

> OOD interview questions test your ability to model real-world systems with clean abstractions. The interviewer cares less about the "right" answer and more about your process: how you handle ambiguity, identify objects, define relationships, and evolve your design.

---

## How to Approach OOD Interviews

Follow this 4-step framework to structure your thinking:

```
┌──────────────────────────────────────────────────────────┐
│  OOD Interview Framework                                 │
│                                                          │
│  Step 1: Handle Ambiguity                                │
│    └─ Ask clarifying questions                           │
│    └─ Define scope and constraints                       │
│                                                          │
│  Step 2: Define Core Objects                             │
│    └─ Identify nouns from the problem statement          │
│    └─ Determine which become classes                     │
│                                                          │
│  Step 3: Analyze Relationships                           │
│    └─ Inheritance (is-a)                                 │
│    └─ Composition (has-a)                                │
│    └─ Many-to-many, one-to-many                         │
│                                                          │
│  Step 4: Investigate Actions                             │
│    └─ Define key methods                                 │
│    └─ Walk through use cases                             │
│    └─ Refine and iterate                                 │
└──────────────────────────────────────────────────────────┘
```

### Step 1: Handle Ambiguity

Every OOD question is deliberately vague. Before writing a single class, ask:

- **Who** is using this system?
- **What** are the main use cases?
- **What** are the constraints (scale, platform, features)?
- **What** is in scope and out of scope?

> Example: "Design a parking lot." Questions to ask: How many levels? Multiple vehicle sizes? Handicapped spots? Payment system? Real-time availability display?

### Step 2: Define Core Objects

List the nouns in the problem — these are candidate classes.

```
"Design a parking lot"

Nouns: Parking Lot, Level, Spot, Vehicle, Car, Truck, Motorcycle,
       Ticket, Payment, Entrance, Exit
```

### Step 3: Analyze Relationships

| Relationship | Meaning | Example |
|-------------|---------|---------|
| **Inheritance (is-a)** | Subtype relationship | Car is-a Vehicle |
| **Composition (has-a)** | Ownership; part cannot exist without whole | ParkingLot has Levels |
| **Aggregation (has-a, weaker)** | Association; part can exist independently | Level has Vehicles (vehicles can leave) |
| **Association (uses-a)** | General relationship | Driver uses ParkingSpot |

### Step 4: Investigate Actions

Walk through each use case and define the methods needed:

```
Use case: Vehicle enters the parking lot
  1. ParkingLot.findAvailableSpot(vehicleType) → ParkingSpot
  2. ParkingSpot.park(vehicle) → void
  3. ParkingLot.issueTicket(vehicle, spot) → Ticket

Use case: Vehicle exits
  1. Ticket.calculateFee(exitTime) → double
  2. Payment.process(fee) → boolean
  3. ParkingSpot.vacate() → void
```

---

## SOLID Principles

| Principle | Meaning | Violation Example |
|-----------|---------|-------------------|
| **S**ingle Responsibility | A class should have one reason to change | A `User` class that handles authentication, database queries, and email sending |
| **O**pen/Closed | Open for extension, closed for modification | Adding a new shape requires modifying a `calculateArea()` method with if/else |
| **L**iskov Substitution | Subtypes must be substitutable for their base types | `Square extends Rectangle` that breaks when `setWidth()` is called |
| **I**nterface Segregation | No client should depend on methods it doesn't use | A `Worker` interface with `work()` and `eat()` — robots don't eat |
| **D**ependency Inversion | Depend on abstractions, not concretions | A class that directly instantiates `MySQLDatabase` instead of depending on a `Database` interface |

> SOLID principles guide design decisions. In interviews, mention them when they apply to your design choices, but don't force them.

---

## Composition Over Inheritance

Prefer composition (has-a) over inheritance (is-a) when the relationship isn't truly hierarchical.

```java
// Inheritance approach — rigid
class FlyingAnimal extends Animal {
    void fly() { /* ... */ }
}
class SwimmingAnimal extends Animal {
    void swim() { /* ... */ }
}
// What about a duck that flies AND swims? Multiple inheritance problem.

// Composition approach — flexible
interface Flyable { void fly(); }
interface Swimmable { void swim(); }

class Duck extends Animal implements Flyable, Swimmable {
    private FlyBehavior flyBehavior;
    private SwimBehavior swimBehavior;

    public void fly() { flyBehavior.fly(); }
    public void swim() { swimBehavior.swim(); }
}
```

> Rule of thumb: Use inheritance for genuine "is-a" relationships with shared behavior. Use composition for capabilities that can be mixed and matched.

---

## Design Patterns

### Singleton Pattern

Ensure a class has only one instance and provide a global point of access.

```java
public class Database {
    private static Database instance;

    private Database() {}

    public static synchronized Database getInstance() {
        if (instance == null) {
            instance = new Database();
        }
        return instance;
    }
}
```

**Thread-safe alternatives:**

```java
// Eager initialization
private static final Database INSTANCE = new Database();

// Double-checked locking
public static Database getInstance() {
    if (instance == null) {
        synchronized (Database.class) {
            if (instance == null) {
                instance = new Database();
            }
        }
    }
    return instance;
}

// Enum singleton (recommended in Java)
public enum Database {
    INSTANCE;
    public void query(String sql) { /* ... */ }
}
```

> Use sparingly. Singletons make testing harder and create hidden dependencies. Consider dependency injection instead.

### Factory Method Pattern

Define an interface for creating objects, but let subclasses decide which class to instantiate.

```java
abstract class CardGame {
    abstract Deck createDeck();

    void play() {
        Deck deck = createDeck();
        deck.shuffle();
        // ...
    }
}

class PokerGame extends CardGame {
    @Override
    Deck createDeck() {
        return new PokerDeck();
    }
}

class BlackjackGame extends CardGame {
    @Override
    Deck createDeck() {
        return new BlackjackDeck();
    }
}
```

**When to use:** When the exact type of object to create isn't known until runtime, or when subclasses need to specify the type.

### Observer Pattern

Define a one-to-many dependency so that when one object changes state, all dependents are notified.

```java
interface Observer {
    void update(String event, Object data);
}

class EventBus {
    private Map<String, List<Observer>> listeners = new HashMap<>();

    void subscribe(String event, Observer observer) {
        listeners.computeIfAbsent(event, k -> new ArrayList<>()).add(observer);
    }

    void publish(String event, Object data) {
        for (Observer observer : listeners.getOrDefault(event, List.of())) {
            observer.update(event, data);
        }
    }
}
```

**When to use:** Event systems, UI updates, pub/sub messaging, reactive programming.

### Strategy Pattern

Define a family of algorithms, encapsulate each one, and make them interchangeable.

```java
interface SortStrategy {
    void sort(int[] array);
}

class QuickSortStrategy implements SortStrategy {
    public void sort(int[] array) { /* quicksort */ }
}

class MergeSortStrategy implements SortStrategy {
    public void sort(int[] array) { /* mergesort */ }
}

class Sorter {
    private SortStrategy strategy;

    Sorter(SortStrategy strategy) { this.strategy = strategy; }

    void setStrategy(SortStrategy strategy) { this.strategy = strategy; }

    void sort(int[] array) { strategy.sort(array); }
}
```

**When to use:** When you have multiple algorithms for the same task and want to switch between them at runtime.

### Decorator Pattern

Attach additional responsibilities to an object dynamically, providing a flexible alternative to subclassing.

```java
interface Coffee {
    double cost();
    String description();
}

class SimpleCoffee implements Coffee {
    public double cost() { return 1.00; }
    public String description() { return "Simple coffee"; }
}

class MilkDecorator implements Coffee {
    private Coffee coffee;
    MilkDecorator(Coffee coffee) { this.coffee = coffee; }
    public double cost() { return coffee.cost() + 0.50; }
    public String description() { return coffee.description() + ", milk"; }
}

// Usage: Coffee c = new MilkDecorator(new SimpleCoffee());
// c.cost() → 1.50, c.description() → "Simple coffee, milk"
```

**When to use:** Java I/O streams (`BufferedReader(new FileReader(...))`), adding features without modifying existing classes.

---

## UML Class Diagram Basics

```
┌─────────────────────────┐
│       <<interface>>     │
│        Vehicle          │
├─────────────────────────┤
│ + getType(): VehicleType│
│ + getSize(): int        │
└────────────┬────────────┘
             │ implements
    ┌────────┼────────┐
    │        │        │
┌───┴──┐ ┌──┴───┐ ┌──┴───┐
│ Car  │ │Truck │ │Moto  │
└──┬───┘ └──────┘ └──────┘
   │ has-a
   ▼
┌──────────────┐
│ LicensePlate │
└──────────────┘

Notation:
  ─────▷  inheritance (is-a) — open arrow
  ─────▶  implementation — closed arrow
  ─────◇  aggregation (has-a, weak) — open diamond
  ─────◆  composition (has-a, strong) — filled diamond
  + public,  - private,  # protected
```

---

## Dependency Injection

Instead of a class creating its own dependencies, they are provided ("injected") from outside.

```java
// Without DI — tightly coupled
class OrderService {
    private MySQLDatabase db = new MySQLDatabase();
}

// With DI — loosely coupled
class OrderService {
    private Database db;
    OrderService(Database db) { this.db = db; }
}

// Now you can inject any Database implementation:
OrderService service = new OrderService(new PostgresDatabase());
OrderService testService = new OrderService(new MockDatabase());
```

> DI makes code testable, flexible, and follows the Dependency Inversion Principle.

---

## Interview Questions Overview

### 7.1 — Deck of Cards

> Design the data structures for a generic deck of cards. Explain how you'd subclass for blackjack.

**Key classes:** `Card` (suit, value), `Deck` (cards, shuffle, deal), `Hand` (cards, score), `BlackjackHand extends Hand` (with ace handling).

### 7.2 — Call Center

> Design a call center with three levels: respondent, manager, director. An incoming call goes to the first free respondent. If not handled, it escalates.

**Key classes:** `CallCenter`, `Employee` (abstract), `Respondent`, `Manager`, `Director`, `Call`. Use queues for each level.

### 7.3 — Jukebox

> Design a musical jukebox using OOD.

**Key classes:** `Jukebox`, `Song`, `Playlist`, `CDPlayer`, `User`, `Display`.

### 7.4 — Parking Lot

> Design a parking lot system.

**Key classes:** `ParkingLot`, `Level`, `ParkingSpot`, `Vehicle` (abstract), `Car`, `Truck`, `Motorcycle`, `Ticket`.

```java
public class ParkingLot {
    private List<Level> levels;

    public ParkingSpot findSpot(Vehicle vehicle) {
        for (Level level : levels) {
            ParkingSpot spot = level.findAvailableSpot(vehicle.getSize());
            if (spot != null) return spot;
        }
        return null;
    }
}

public class ParkingSpot {
    private SpotSize size;
    private Vehicle currentVehicle;

    public boolean canFit(Vehicle vehicle) {
        return currentVehicle == null && vehicle.getSize().ordinal() <= size.ordinal();
    }

    public void park(Vehicle vehicle) { this.currentVehicle = vehicle; }
    public void vacate() { this.currentVehicle = null; }
}
```

### 7.5 — Online Book Reader

> Design an online book reader system.

**Key classes:** `Library`, `Book`, `User`, `Display`, `ReadingSession`, `Bookmark`.

### 7.6 — Jigsaw

> Implement an NxN jigsaw puzzle. Design the data structures and explain an algorithm to solve it.

**Key classes:** `Puzzle`, `Piece`, `Edge` (with shape type: flat, inner, outer). Match edges by complementary shapes.

### 7.7 — Chat Server

> Design a chat server with user accounts, group chats, and presence status.

**Key classes:** `ChatServer`, `User`, `Conversation`, `GroupConversation`, `Message`, `StatusUpdate`.

### 7.8 — Othello

> Design the game Othello (Reversi).

**Key classes:** `Game`, `Board`, `Piece` (black/white), `Player`. Key method: `flipPieces(row, col, direction)`.

### 7.9 — Circular Array

> Implement a CircularArray class that supports an array-like structure and efficient rotation with iteration.

Use an offset/head pointer instead of actually moving elements. Implement `Iterable`.

### 7.10 — Minesweeper

> Design and implement Minesweeper.

**Key classes:** `Board`, `Cell` (mine, number, blank), `Game`. Key algorithm: BFS/DFS to reveal blank cells.

### 7.11 — File System

> Design an in-memory file system.

**Key classes:** `Entry` (abstract), `File extends Entry`, `Directory extends Entry` (contains list of entries). Composite pattern.

### 7.12 — Hash Table

> Design and implement a hash table with chaining for collision resolution.

See Chapter 1 (Arrays and Strings) for hash table internals.

---

## Design Pattern Selection Guide

```
┌──────────────────────────────────┬──────────────────────────────┐
│  Problem                         │  Pattern                     │
├──────────────────────────────────┼──────────────────────────────┤
│  One instance of a class         │  Singleton                   │
│  Create objects without knowing  │  Factory / Abstract Factory  │
│  concrete type                   │                              │
│  Add behavior dynamically        │  Decorator                   │
│  Notify dependents of changes    │  Observer                    │
│  Swap algorithms at runtime      │  Strategy                    │
│  Represent part-whole hierarchy  │  Composite                   │
│  Simplify complex subsystem      │  Facade                      │
│  Control access to object        │  Proxy                       │
│  Convert interface               │  Adapter                     │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## Key Takeaways

1. **Ask questions first** — ambiguity is intentional; clarify scope before designing
2. **Start with core objects** — identify nouns, then define relationships
3. **Favor composition** — it's more flexible than inheritance
4. **Know your SOLID** — mention principles when they guide your decisions
5. **Use design patterns appropriately** — don't force patterns; use them when the problem fits
6. **Walk through use cases** — design is only as good as the scenarios it handles
7. **Keep it simple** — over-engineering is as bad as under-engineering in interviews
8. **Think about extensibility** — "what if we need to add a new vehicle type?" shows maturity
