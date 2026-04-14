# Chapter 8 — Methods

This chapter covers several aspects of method design: how to treat parameters and return values, how to design method signatures, and how to document methods. Much of the material applies to constructors as well.

---

## Item 49: Check Parameters for Validity

Most methods and constructors have restrictions on what values may be passed into their parameters. You should **check parameters at the start of the method** and fail fast with a clear exception rather than let the method proceed into confusing, delayed failures.

### Document and Enforce

```java
/**
 * Returns a BigInteger whose value is (this mod m).
 *
 * @param m the modulus, which must be positive
 * @return this mod m
 * @throws ArithmeticException if m is zero or negative
 */
public BigInteger mod(BigInteger m) {
    if (m.signum() <= 0)
        throw new ArithmeticException("Modulus must be positive: " + m);
    // ... computation
}
```

### Objects.requireNonNull — The Standard Null Check

```java
// Manual null check — verbose
if (strategy == null)
    throw new NullPointerException("strategy must not be null");
this.strategy = strategy;

// Better — Objects.requireNonNull (Java 7+)
this.strategy = Objects.requireNonNull(strategy, "strategy");
```

`Objects.requireNonNull` is flexible — it returns the value, so it can be used inline in expressions and constructors.

### Java 9 — Range Checks

```java
// Check that index is within [0, length)
Objects.checkIndex(index, length);

// Check that [fromIndex, fromIndex + size) is within [0, length)
Objects.checkFromIndexSize(fromIndex, size, length);

// Check that [fromIndex, toIndex) is within [0, length)
Objects.checkFromToIndex(fromIndex, toIndex, length);
```

### Assertions for Non-Public Methods

For private methods, you control the callers — use assertions instead of exceptions:

```java
private static void sort(long[] a, int offset, int length) {
    assert a != null;
    assert offset >= 0 && offset <= a.length;
    assert length >= 0 && length <= a.length - offset;
    // ... sort
}
```

Assertions throw `AssertionError` if they fail and have **zero cost when disabled** (which is the default in production). Enable with `-ea` flag.

### When NOT to Check

- When the validity check is expensive and the computation itself implicitly performs it (e.g., `Collections.sort(List)` — comparison will throw `ClassCastException` if elements aren't mutually comparable)
- When the check would be redundant based on prior validated state

---

## Item 50: Make Defensive Copies When Needed

Java is a safe language — buffer overruns, array overruns, wild pointers, and other memory corruption errors are impossible. But **you must program defensively, assuming clients will try to break your invariants**.

### The Problem — Mutable Fields Leak References

```java
public final class Period {
    private final Date start;
    private final Date end;

    public Period(Date start, Date end) {
        if (start.compareTo(end) > 0)
            throw new IllegalArgumentException(start + " after " + end);
        this.start = start;
        this.end = end;
    }

    public Date start() { return start; }
    public Date end()   { return end; }
}
```

Looks immutable, but isn't:

```java
// Attack 1: mutate through constructor argument
Date start = new Date();
Date end = new Date();
Period p = new Period(start, end);
end.setYear(78); // modifies p's internals!

// Attack 2: mutate through accessor
p.end().setYear(78); // modifies p's internals!
```

### The Fix — Defensive Copies

```java
public Period(Date start, Date end) {
    // Copy BEFORE validation — prevents TOCTOU (time-of-check/time-of-use) attack
    this.start = new Date(start.getTime());
    this.end   = new Date(end.getTime());

    if (this.start.compareTo(this.end) > 0)
        throw new IllegalArgumentException(this.start + " after " + this.end);
}

// Return defensive copies from accessors
public Date start() { return new Date(start.getTime()); }
public Date end()   { return new Date(end.getTime()); }
```

### Critical Rules

| Rule | Rationale |
|------|-----------|
| **Copy before validation** | Prevents TOCTOU race condition — another thread could mutate the argument between check and use |
| **Don't use `clone()` for defensive copies of parameters** | The parameter type might be a malicious subclass with a `clone()` that retains a reference to the original |
| **Use `clone()` for copies in accessors** | The field is known to be the exact type (not a subclass) |
| **Use immutable types when possible** | `Instant` instead of `Date`, `LocalDate` instead of `Calendar` — eliminates the need for defensive copies entirely |

### Modern Java — Prefer Immutable Types

```java
// Better design — no defensive copies needed
public final class Period {
    private final Instant start;
    private final Instant end;

    public Period(Instant start, Instant end) {
        if (start.isAfter(end))
            throw new IllegalArgumentException(start + " after " + end);
        this.start = start;
        this.end = end;
    }

    public Instant start() { return start; }
    public Instant end()   { return end; }
}
```

`Instant` is immutable — no copies needed. This is why `java.time` (Java 8+) is vastly superior to `java.util.Date`.

---

## Item 51: Design Method Signatures Carefully

### Guidelines for Method Design

| Guideline | Details |
|-----------|---------|
| **Choose method names carefully** | Follow conventions: `toLowerCase` not `convertToLowerCase`. Be consistent with `java.util` naming. |
| **Don't go overboard with convenience methods** | Every method adds to learning, documentation, testing, and maintenance cost. When in doubt, leave it out. |
| **Avoid long parameter lists** | Target ≤4 parameters. Long lists of identically typed parameters are especially dangerous — callers can transpose them without compiler error. |
| **Prefer interfaces over classes for parameter types** | Accept `Map` not `HashMap`, `List` not `ArrayList`. This allows callers to pass any implementation. |
| **Prefer two-element enums over boolean parameters** | `Thermometer.newInstance(TemperatureScale.CELSIUS)` is clearer than `Thermometer.newInstance(true)`. |

### Techniques for Shortening Parameter Lists

1. **Break method into multiple methods** — each takes a subset of parameters. Risk: too many methods. But orthogonal methods reduce total method count (e.g., `List.subList()` combined with `indexOf()` replaces a `subListIndexOf(List, Object, int, int)`)

2. **Helper classes for groups of parameters** — if several parameters are always passed together, create a class to represent them (e.g., a `CardRank` + `CardSuit` pair)

3. **Builder pattern adapted to methods** — set optional parameters via a builder, then call `execute()`

---

## Item 52: Use Overloading Judiciously

**Selection among overloaded methods is determined at compile time** (based on declared type), while **selection among overridden methods is determined at runtime** (based on actual type). This confuses many programmers.

### The Confusing Example

```java
public class CollectionClassifier {
    public static String classify(Set<?> s)        { return "Set"; }
    public static String classify(List<?> lst)     { return "List"; }
    public static String classify(Collection<?> c) { return "Unknown Collection"; }

    public static void main(String[] args) {
        Collection<?>[] collections = {
            new HashSet<String>(),
            new ArrayList<BigInteger>(),
            new HashMap<String, String>().values()
        };

        for (Collection<?> c : collections)
            System.out.println(classify(c)); // Prints "Unknown Collection" THREE TIMES
    }
}
```

The compile-time type of `c` is `Collection<?>` in all three iterations — so the third overload is always called. **Overloading is resolved statically at compile time.**

### Safe Overloading Rules

| Rule | Explanation |
|------|-------------|
| **Never overload methods with the same number of parameters** if you can avoid it | For varargs, don't overload at all (except as in Item 53) |
| **Name methods differently** | `writeBoolean(boolean)`, `writeInt(int)`, `writeLong(long)` instead of overloaded `write()` |
| **Different parameter types must be "radically different"** | Two types are radically different if no value can be cast to both. Arrays and classes (other than `Object`) are radically different from interfaces. |

### Java 8 Lambda Ambiguity

```java
// COMPILE ERROR — ambiguous
ExecutorService exec = Executors.newCachedThreadPool();
exec.submit(System.out::println); // Callable<Void> or Runnable?
```

Overloading `submit(Callable)` and `submit(Runnable)` creates ambiguity with method references and lambdas. The lesson: **don't overload methods to take different functional interfaces in the same argument position**.

---

## Item 53: Use Varargs Judiciously

Varargs methods accept zero or more arguments. If you need **one or more**, don't validate at runtime — design the API to enforce it at compile time:

```java
// BAD — runtime check for something the compiler could enforce
static int min(int... args) {
    if (args.length == 0)
        throw new IllegalArgumentException("Too few arguments");
    // ...
}

// GOOD — compiler enforces at least one argument
static int min(int firstArg, int... remainingArgs) {
    int min = firstArg;
    for (int arg : remainingArgs)
        if (arg < min)
            min = arg;
    return min;
}
```

### Performance Concern

Every varargs invocation allocates and initializes an array. If profiling shows this is a bottleneck and 95% of calls have ≤3 arguments:

```java
public void foo() { }
public void foo(int a1) { }
public void foo(int a1, int a2) { }
public void foo(int a1, int a2, int a3) { }
public void foo(int a1, int a2, int a3, int... rest) { }
```

`EnumSet.of()` uses this exact technique — overloads for 1-5 elements, then varargs for 6+.

---

## Item 54: Return Empty Collections or Arrays, Not Nulls

Never return `null` in place of an empty collection or array.

```java
// BAD — forces null checks on every caller
public List<Cheese> getCheeses() {
    return cheesesInStock.isEmpty() ? null : new ArrayList<>(cheesesInStock);
}

// Every caller must write:
List<Cheese> cheeses = shop.getCheeses();
if (cheeses != null && cheeses.contains(Cheese.STILTON))
    System.out.println("Jolly good!");

// GOOD — return empty collection
public List<Cheese> getCheeses() {
    return cheesesInStock.isEmpty()
        ? Collections.emptyList()
        : new ArrayList<>(cheesesInStock);
}

// For arrays
public Cheese[] getCheeses() {
    return cheesesInStock.toArray(EMPTY_CHEESE_ARRAY);
}
private static final Cheese[] EMPTY_CHEESE_ARRAY = new Cheese[0];
```

### Why Empty Over Null

- **Eliminates NullPointerException**: callers don't need null checks
- **Simpler client code**: can be used directly in for-each, streams, etc.
- **Negligible performance**: `Collections.emptyList()`, `Collections.emptySet()`, `Collections.emptyMap()` are singletons — zero allocation
- **Convention**: the standard library consistently returns empty collections, never null

---

## Item 55: Return Optionals Judiciously

`Optional<T>` (Java 8) represents a value that may or may not be present. It's a better alternative to returning `null` or throwing an exception when no value can be returned.

```java
// Before Optional — returns null (dangerous)
public static <E extends Comparable<E>> E max(Collection<E> c) {
    if (c.isEmpty()) return null;
    // ...
}

// With Optional — clear, safe
public static <E extends Comparable<E>> Optional<E> max(Collection<E> c) {
    if (c.isEmpty()) return Optional.empty();
    E result = null;
    for (E e : c)
        if (result == null || e.compareTo(result) > 0)
            result = Objects.requireNonNull(e);
    return Optional.of(result);
}

// With Stream
public static <E extends Comparable<E>> Optional<E> max(Collection<E> c) {
    return c.stream().max(Comparator.naturalOrder());
}
```

### Using Optionals — Client Side

```java
// Provide a default
String lastWord = max(words).orElse("No words...");

// Throw on absence
Toy toy = max(toys).orElseThrow(NoSuchElementException::new);

// Conditional action (Java 9+)
max(words).ifPresentOrElse(
    System.out::println,
    () -> System.out.println("No words")
);

// Stream of optionals — filter present values (Java 9)
streamOfOptionals.flatMap(Optional::stream)
```

### When NOT to Use Optional

| Situation | Why |
|-----------|-----|
| **Container types** (`Collection`, `Stream`, `Map`, arrays) | Return empty containers instead — never `Optional<List<T>>` |
| **Map values** | Use `Map.getOrDefault()`, `computeIfAbsent()`, or `containsKey()` instead |
| **Primitive types** | Use `OptionalInt`, `OptionalLong`, `OptionalDouble` — never `Optional<Integer>` (autoboxing cost) |
| **As Map keys or collection elements** | Adds unnecessary complexity |
| **Instance fields** | Usually indicates your class should have a subclass for the absent case |

### Interview Angle

**Q: When should you return Optional vs null vs throw an exception?**
A: Return `Optional` when the absence of a result is a normal, expected case and the caller must handle it. Throw an exception when the absence indicates a programming error or exceptional condition. Never return `null` from a method that could return `Optional` — it defeats the purpose.

---

## Item 56: Write doc Comments for All Exposed API Elements

Javadoc generates API documentation from **doc comments** — specially formatted comments preceding declarations.

### What to Document

| Element | Required Documentation |
|---------|----------------------|
| **Every exported class, interface, constructor, method, and field** | Purpose and behavior |
| **Method preconditions** | `@param` for each parameter, `@throws` for each checked exception (and important unchecked ones) |
| **Method postconditions** | `@return` describing the return value |
| **Side effects** | Any observable state change (e.g., starts a background thread) |
| **Thread safety** | Whether the class is thread-safe, conditionally thread-safe, or not thread-safe (Item 82) |

### Key Conventions

```java
/**
 * Returns the element at the specified position in this list.
 *
 * <p>This method is <i>not</i> guaranteed to run in constant time.
 * In some implementations it may run in time proportional to the
 * element position.
 *
 * @param  index index of the element to return; must be non-negative
 *         and less than the size of this list
 * @return the element at the specified position in this list
 * @throws IndexOutOfBoundsException if the index is out of range
 *         ({@code index < 0 || index >= size()})
 * @since  1.2
 */
E get(int index);
```

### Important Tags

| Tag | Usage |
|-----|-------|
| `{@code ...}` | Renders in code font, suppresses HTML processing |
| `{@literal ...}` | Suppresses HTML processing without code font |
| `{@link ...}` | Inline link to another doc element |
| `{@implSpec ...}` | Documents the contract between a method and its overriders (not callers) |
| `{@index ...}` | (Java 9) Adds a term to the documentation search index |
| `@param` | Parameter description |
| `@return` | Return value description |
| `@throws` | Exception description |

### Self-Use Documentation

When a public method calls an overridable method, document the self-use pattern with `@implSpec`:

```java
/**
 * {@implSpec This implementation returns {@code this.size() == 0}.}
 */
public boolean isEmpty() { return size() == 0; }
```

This tells subclass implementors that overriding `size()` will affect `isEmpty()`.
