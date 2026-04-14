# Chapter 13 — Java

> Java is the lingua franca of enterprise software and one of the most common languages in coding interviews. These questions test your understanding of the language's type system, collections framework, memory model, and object-oriented features — the kind of knowledge that separates someone who writes Java from someone who truly understands it.

---

## How to Approach Java Interview Questions

Java-specific questions typically fall into three categories:

| Category | Examples | What They Test |
|----------|---------|---------------|
| **Language Mechanics** | Overloading vs. overriding, final keyword, access modifiers | Depth of language knowledge |
| **Collections & Generics** | When to use HashMap vs. TreeMap, type erasure | Practical decision-making |
| **Design & Architecture** | Abstract class vs. interface, immutability, thread safety | System design maturity |

> Don't just memorize definitions — understand **why** things work the way they do and **when** you'd choose one approach over another.

---

## Overloading vs. Overriding

### Method Overloading (Compile-Time Polymorphism)

Same method name, **different parameter lists** in the same class:

```java
public class Calculator {
    public int add(int a, int b) { return a + b; }
    public double add(double a, double b) { return a + b; }
    public int add(int a, int b, int c) { return a + b + c; }
}
```

### Method Overriding (Runtime Polymorphism)

Same method signature in a **subclass**, replacing the parent's behavior:

```java
public class Animal {
    public void speak() { System.out.println("..."); }
}

public class Dog extends Animal {
    @Override
    public void speak() { System.out.println("Woof!"); }
}

Animal a = new Dog();
a.speak();  // "Woof!" — resolved at runtime
```

### Key Differences

| Feature | Overloading | Overriding |
|---------|------------|-----------|
| **Binding** | Compile-time (static) | Runtime (dynamic) |
| **Where** | Same class | Subclass |
| **Signature** | Different parameters | Same parameters |
| **Return Type** | Can differ | Must be same or covariant |
| **Access** | Can differ | Cannot be more restrictive |
| **static** | Can overload static methods | Cannot override static methods |
| **final** | Can overload final methods | Cannot override final methods |
| **Annotation** | None required | `@Override` recommended |

> **Interview trap**: Method resolution for overloaded methods uses the **compile-time type** of arguments, not the runtime type. Overriding uses the **runtime type** of the object.

```java
public void process(Animal a) { System.out.println("Animal"); }
public void process(Dog d) { System.out.println("Dog"); }

Animal a = new Dog();
process(a);  // prints "Animal" — overloading uses compile-time type
```

---

## Collection Framework

Java's Collections Framework provides a unified architecture for storing and manipulating groups of objects.

### Hierarchy Diagram

```
                         ┌──────────────┐
                         │  Iterable<E> │
                         └──────┬───────┘
                                │
                         ┌──────┴───────┐
                         │ Collection<E>│
                         └──┬───┬───┬───┘
                            │   │   │
              ┌─────────────┘   │   └──────────────┐
              │                 │                   │
        ┌─────┴─────┐   ┌──────┴──────┐    ┌──────┴──────┐
        │  List<E>  │   │   Set<E>    │    │  Queue<E>   │
        └─┬───┬─────┘   └─┬─────┬────┘    └──┬──────┬───┘
          │   │            │     │             │      │
          │   │            │     │             │      │
    ArrayList LinkedList HashSet TreeSet  PriorityQueue Deque
                                                       │
                                                  ArrayDeque

                    ┌──────────────┐
                    │   Map<K,V>   │   (not part of Collection)
                    └──┬─────┬────┘
                       │     │
                 HashMap  TreeMap
                    │
              LinkedHashMap
```

### List Implementations

| Implementation | Backed By | Get | Add/Remove (end) | Add/Remove (mid) | When to Use |
|---------------|-----------|:---:|:-----------------:|:-----------------:|-------------|
| `ArrayList` | Dynamic array | O(1) | O(1) amortized | O(n) | Default choice, random access |
| `LinkedList` | Doubly-linked list | O(n) | O(1) | O(1) with iterator | Frequent insert/remove, queue/deque use |

### Set Implementations

| Implementation | Backed By | Add/Remove/Contains | Ordered? | When to Use |
|---------------|-----------|:-------------------:|:--------:|-------------|
| `HashSet` | HashMap | O(1) average | No | Default choice for uniqueness |
| `LinkedHashSet` | LinkedHashMap | O(1) average | Insertion order | Need uniqueness + iteration order |
| `TreeSet` | Red-black tree | O(log n) | Sorted (natural/comparator) | Need sorted unique elements |

### Map Implementations

| Implementation | Backed By | Get/Put | Ordered? | When to Use |
|---------------|-----------|:-------:|:--------:|-------------|
| `HashMap` | Hash table | O(1) average | No | Default key-value store |
| `LinkedHashMap` | Hash table + linked list | O(1) average | Insertion order | LRU cache, ordered iteration |
| `TreeMap` | Red-black tree | O(log n) | Sorted by key | Range queries, sorted keys |
| `ConcurrentHashMap` | Segmented hash table | O(1) average | No | Thread-safe operations |

### Queue / Deque

| Implementation | Behavior | When to Use |
|---------------|----------|-------------|
| `PriorityQueue` | Min-heap by default | Dijkstra, top-K, task scheduling |
| `ArrayDeque` | Resizable array | Stack or queue (faster than LinkedList) |
| `LinkedList` | Doubly-linked list | Queue with frequent removal from both ends |

> **Interview tip**: When asked "which collection would you use?", always state your reasoning. "I'd use a `HashMap` because I need O(1) lookups and don't need ordering" is much better than just naming the class.

---

## Generics

Generics enable type-safe collections and methods without sacrificing flexibility.

### Basic Usage

```java
public class Pair<A, B> {
    private A first;
    private B second;

    public Pair(A first, B second) {
        this.first = first;
        this.second = second;
    }

    public A getFirst() { return first; }
    public B getSecond() { return second; }
}

Pair<String, Integer> p = new Pair<>("age", 30);
```

### Type Erasure

Java generics are implemented via **type erasure** — generic type information is removed at compile time:

```java
// What you write:
List<String> list = new ArrayList<String>();
list.add("hello");
String s = list.get(0);

// What the compiler generates (after erasure):
List list = new ArrayList();
list.add("hello");
String s = (String) list.get(0);  // compiler inserts cast
```

> Because of type erasure, you **cannot**: create generic arrays (`new T[]`), use `instanceof` with generics (`x instanceof List<String>`), or overload methods differing only in generic type.

### Bounded Types

```java
// Upper bound: T must be Comparable or subtype
public <T extends Comparable<T>> T max(T a, T b) {
    return a.compareTo(b) > 0 ? a : b;
}

// Multiple bounds
public <T extends Serializable & Comparable<T>> void process(T item) { }
```

### Wildcards

| Wildcard | Meaning | Read/Write | Use Case |
|----------|---------|:----------:|----------|
| `<?>` | Unknown type | Read only | When you don't care about the type |
| `<? extends T>` | T or subtype (upper bound) | Read only (producer) | Reading from a collection |
| `<? super T>` | T or supertype (lower bound) | Write only (consumer) | Writing to a collection |

> **PECS**: Producer Extends, Consumer Super. If you read from a structure, use `extends`. If you write to it, use `super`.

```java
public void copy(List<? extends Number> src, List<? super Number> dest) {
    for (Number n : src) {
        dest.add(n);
    }
}
```

---

## Lambda Expressions and Streams

### Lambda Syntax (Java 8+)

```java
// Without lambda
Comparator<String> comp = new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.length() - b.length();
    }
};

// With lambda
Comparator<String> comp = (a, b) -> a.length() - b.length();

// Method reference
Comparator<String> comp = Comparator.comparingInt(String::length);
```

### Common Functional Interfaces

| Interface | Method | Input → Output | Example |
|-----------|--------|:--------------:|---------|
| `Predicate<T>` | `test(T)` | T → boolean | `s -> s.isEmpty()` |
| `Function<T,R>` | `apply(T)` | T → R | `s -> s.length()` |
| `Consumer<T>` | `accept(T)` | T → void | `s -> System.out.println(s)` |
| `Supplier<T>` | `get()` | () → T | `() -> new ArrayList<>()` |
| `BiFunction<T,U,R>` | `apply(T,U)` | (T,U) → R | `(a,b) -> a + b` |

### Stream API

```java
List<String> names = List.of("Alice", "Bob", "Charlie", "Dave", "Eve");

List<String> result = names.stream()
    .filter(n -> n.length() > 3)          // ["Alice", "Charlie", "Dave"]
    .map(String::toUpperCase)              // ["ALICE", "CHARLIE", "DAVE"]
    .sorted()                              // ["ALICE", "CHARLIE", "DAVE"]
    .collect(Collectors.toList());

int totalLength = names.stream()
    .mapToInt(String::length)
    .sum();                                // 23

Map<Integer, List<String>> byLength = names.stream()
    .collect(Collectors.groupingBy(String::length));
    // {3=[Bob, Eve], 4=[Dave], 5=[Alice], 7=[Charlie]}
```

---

## Access Modifiers

| Modifier | Class | Package | Subclass | World |
|----------|:-----:|:-------:|:--------:|:-----:|
| `public` | ✓ | ✓ | ✓ | ✓ |
| `protected` | ✓ | ✓ | ✓ | ✗ |
| *(default)* | ✓ | ✓ | ✗ | ✗ |
| `private` | ✓ | ✗ | ✗ | ✗ |

> The default (package-private) access is often overlooked. It's actually useful for keeping implementation details visible within a package but hidden from external code.

---

## Abstract Classes vs. Interfaces

| Feature | Abstract Class | Interface |
|---------|---------------|-----------|
| **Instantiate** | No | No |
| **Constructor** | Yes | No |
| **State (fields)** | Instance variables | Only `static final` constants |
| **Methods** | Abstract + concrete | Abstract + `default` + `static` (Java 8+) |
| **Inheritance** | Single (`extends`) | Multiple (`implements`) |
| **Access modifiers** | Any | `public` (implicitly for methods) |
| **When to use** | Shared state + behavior among related classes | Defining a contract / capability across unrelated classes |

### Java 8+ Default Methods

```java
public interface Loggable {
    default void log(String message) {
        System.out.println("[LOG] " + message);
    }
}

public interface Auditable {
    default void audit(String action) {
        System.out.println("[AUDIT] " + action);
    }
}

public class UserService implements Loggable, Auditable {
    public void createUser(String name) {
        log("Creating user: " + name);
        audit("USER_CREATE: " + name);
    }
}
```

> **When to choose**: Use an abstract class when classes share state and behavior (is-a relationship with common implementation). Use an interface when defining a capability that unrelated classes can implement (can-do relationship).

---

## Interview Questions Overview

| # | Problem | Key Concept |
|---|---------|------------|
| 13.1 | **Private Constructor** | Prevents instantiation — used for singletons, utility classes, factory patterns |
| 13.2 | **Return from Finally** | `finally` always executes (even after `return`); the `finally` return value overrides try/catch |
| 13.3 | **Final Keyword** | `final` variable = constant, `final` method = no override, `final` class = no subclass |
| 13.4 | **Generics vs Templates** | Java: type erasure, runtime is `Object`; C++: monomorphization, full type info at compile time |
| 13.5 | **TreeMap / HashMap / LinkedHashMap** | Sorted keys vs. O(1) access vs. insertion order |
| 13.6 | **Object Reflection** | `Class.forName()`, `getMethod()`, `invoke()` — inspect and modify classes at runtime |
| 13.7 | **Lambda Expressions** | Country name sorting with custom comparator via lambda |
| 13.8 | **Lambda Random** | Sublist of random integers using streams |

### The `final` Keyword — Three Meanings

```java
// 1. final variable: value cannot change after assignment
final int MAX = 100;
final List<String> list = new ArrayList<>();
list.add("hello");   // OK — the reference is final, not the object

// 2. final method: cannot be overridden in subclass
public final void criticalOperation() { }

// 3. final class: cannot be subclassed
public final class ImmutablePoint {
    private final int x, y;
    public ImmutablePoint(int x, int y) { this.x = x; this.y = y; }
}
```

---

## Java Memory Model

### Memory Areas

```
┌──────────────────────────────────────────────────────────┐
│                      JVM MEMORY                           │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                    HEAP                             │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Young Gen   │  │   Old Gen    │               │   │
│  │  │  ┌────────┐  │  │              │               │   │
│  │  │  │  Eden  │  │  │  Long-lived  │               │   │
│  │  │  ├────────┤  │  │   objects    │               │   │
│  │  │  │  S0    │  │  │              │               │   │
│  │  │  ├────────┤  │  │              │               │   │
│  │  │  │  S1    │  │  │              │               │   │
│  │  │  └────────┘  │  └──────────────┘               │   │
│  │  └──────────────┘                                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Stack     │  │   Metaspace  │  │  Code Cache  │    │
│  │  (per thread)│  │ (class info) │  │  (JIT code)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Garbage Collection Basics

| GC Type | When It Runs | What It Collects | Impact |
|---------|-------------|-----------------|--------|
| **Minor GC** | Eden space full | Young generation | Fast, frequent, short pause |
| **Major GC** | Old gen filling up | Old generation | Slower, less frequent |
| **Full GC** | Metaspace/heap pressure | Everything | Stop-the-world, longest pause |

| Collector | Strategy | Best For |
|-----------|----------|----------|
| **G1 GC** | Region-based, concurrent | General purpose (default since Java 9) |
| **ZGC** | Concurrent, low-latency | Sub-millisecond pauses, large heaps |
| **Shenandoah** | Concurrent compaction | Low pause times |
| **Parallel GC** | Throughput-focused | Batch processing, high throughput |

---

## Concurrency Utilities

### CompletableFuture

```java
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> fetchData("https://api.example.com"))
    .thenApply(data -> parseJson(data))
    .thenApply(parsed -> transform(parsed))
    .exceptionally(ex -> "Error: " + ex.getMessage());

String result = future.get();
```

### ConcurrentHashMap

```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

map.put("counter", 0);
map.compute("counter", (key, val) -> val + 1);

map.computeIfAbsent("newKey", k -> expensiveCompute(k));

int sum = map.reduceValues(1, Integer::sum);
```

---

## Modern Java Features

### Records (Java 16+)

```java
// Before records
public class Point {
    private final int x, y;
    public Point(int x, int y) { this.x = x; this.y = y; }
    public int x() { return x; }
    public int y() { return y; }
    // equals(), hashCode(), toString() manually implemented
}

// With records — compiler generates constructor, accessors, equals, hashCode, toString
public record Point(int x, int y) {}
```

### Sealed Classes (Java 17+)

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {
    double area();
}

public record Circle(double radius) implements Shape {
    public double area() { return Math.PI * radius * radius; }
}

public record Rectangle(double w, double h) implements Shape {
    public double area() { return w * h; }
}

public record Triangle(double base, double height) implements Shape {
    public double area() { return 0.5 * base * height; }
}
```

> Sealed classes enable exhaustive pattern matching — the compiler knows all possible subtypes, enabling safer `switch` expressions.

### Pattern Matching (Java 21+)

```java
static String describe(Shape shape) {
    return switch (shape) {
        case Circle c    -> "Circle with radius " + c.radius();
        case Rectangle r -> "Rectangle " + r.w() + "x" + r.h();
        case Triangle t  -> "Triangle with base " + t.base();
    };
}
```

---

## Quick Reference: Common Java Pitfalls

| Pitfall | Why It Happens | Prevention |
|---------|---------------|------------|
| `==` vs `.equals()` for Strings | `==` compares references, not content | Always use `.equals()` for object comparison |
| Autoboxing `null` | `Integer x = null; int y = x;` → NPE | Check for null before unboxing |
| `ConcurrentModificationException` | Modifying collection during iteration | Use `Iterator.remove()` or concurrent collections |
| Memory leak in collections | Objects stored but never removed | Use weak references or bounded caches |
| `hashCode`/`equals` contract | Override one without the other | Always override both together |

> In interviews, Java questions test whether you can reason about the language's design decisions — not just use it. Understanding **why** Java uses type erasure, **why** `String` is immutable, and **why** checked exceptions exist shows depth.
