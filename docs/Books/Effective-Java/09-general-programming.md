# Chapter 9 — General Programming

This chapter covers the nuts and bolts of the Java language: local variables, control structures, libraries, data types, and two extralinguistic facilities (reflection and native methods). It also discusses optimization and naming conventions.

---

## Item 57: Minimize the Scope of Local Variables

Declaring variables at the point of first use — not at the top of the block — keeps scope tight and improves readability.

### Key Techniques

| Technique | Rationale |
|-----------|-----------|
| **Declare where first used** | The reader sees the type and initial value right where the variable is relevant |
| **Initialize every local variable with a declaration** | If you don't have enough information to initialize, it's too early to declare |
| **Prefer `for` loops to `while` loops** | Loop variables declared in the `for` header are scoped to the loop body — `while` loop variables leak |
| **Keep methods small and focused** | A method that does one thing has fewer variables and shorter scopes |

### for vs while — Scope Matters

```java
// BUG — copy-paste error compiles because i leaks from the while loop
Iterator<Element> i = c.iterator();
while (i.hasNext()) { doSomething(i.next()); }

Iterator<Element> i2 = c2.iterator();
while (i.hasNext()) { // BUG: should be i2, but i is still in scope
    doSomething(i2.next());
}

// for loop — same bug is caught at compile time
for (Iterator<Element> i = c.iterator(); i.hasNext(); ) {
    doSomething(i.next());
}
for (Iterator<Element> i2 = c2.iterator(); i.hasNext(); ) { // COMPILE ERROR: i not in scope
    doSomething(i2.next());
}
```

---

## Item 58: Prefer for-each Loops to Traditional for Loops

The enhanced `for` loop (for-each) eliminates the index/iterator variable, removing opportunities for error:

```java
// Traditional — error-prone with nested iteration
for (Iterator<Suit> i = suits.iterator(); i.hasNext(); ) {
    for (Iterator<Rank> j = ranks.iterator(); j.hasNext(); ) {
        deck.add(new Card(i.next(), j.next())); // BUG: i.next() called too many times
    }
}

// for-each — correct and clean
for (Suit suit : suits)
    for (Rank rank : ranks)
        deck.add(new Card(suit, rank));
```

### When You CAN'T Use for-each

| Situation | Why | Alternative |
|-----------|-----|-------------|
| **Destructive filtering** | Need to call `iterator.remove()` | Use `Collection.removeIf()` (Java 8+) or explicit iterator |
| **Transforming** | Need to replace elements by index | Traditional `for` with `list.set(i, newVal)` |
| **Parallel iteration** | Need to advance multiple iterators/indices in lockstep | Traditional `for` with explicit index control |

### Implementing Iterable

for-each works with any object that implements `Iterable<E>`. If you write a type that represents a group of elements, implement `Iterable` even if you don't extend `Collection`:

```java
public class MyCollection<E> implements Iterable<E> {
    @Override
    public Iterator<E> iterator() {
        return new MyIterator();
    }
}
```

---

## Item 59: Know and Use the Libraries

Don't reinvent the wheel. The Java standard library contains thousands of well-tested, optimized implementations.

### Case Study — Random Number Generation

```java
// BAD — subtly biased, terrible period
static Random rnd = new Random();
static int random(int n) {
    return Math.abs(rnd.nextInt()) % n;
}
```

Three flaws:
1. If `nextInt()` returns `Integer.MIN_VALUE`, `Math.abs()` returns `Integer.MIN_VALUE` (overflow)
2. The modulo operation introduces bias when `n` isn't a power of 2
3. The random number generator has a short period

```java
// GOOD — use the library
int n = ThreadLocalRandom.current().nextInt(bound);
// Or for cryptographic randomness:
SecureRandom sr = new SecureRandom();
```

### Libraries Every Developer Should Know

| Library / Package | Key Classes |
|-------------------|-------------|
| `java.lang` | `String`, `Math`, `System`, `Thread`, `StringBuilder` |
| `java.util` | `Collections`, `Arrays`, `Objects`, `Optional`, `Map`, `List`, `Set` |
| `java.util.stream` | `Stream`, `Collectors`, `IntStream` |
| `java.util.concurrent` | `ExecutorService`, `ConcurrentHashMap`, `CountDownLatch`, `CompletableFuture` |
| `java.io` / `java.nio` | `Files`, `Path`, `BufferedReader`, `InputStream` |
| `java.time` | `Instant`, `LocalDate`, `Duration`, `ZonedDateTime` |

**Beyond the JDK**: Google's Guava library fills many gaps in the standard library and is widely used in production Java codebases.

---

## Item 60: Avoid float and double if Exact Answers Are Required

`float` and `double` perform **binary floating-point arithmetic** — designed for scientific and engineering calculations that tolerate approximation. They are **unsuitable for monetary calculations**.

```java
// WRONG — floating-point rounding errors
System.out.println(1.03 - 0.42); // 0.6100000000000001
System.out.println(1.00 - 9 * 0.10); // 0.09999999999999998
```

### Solutions for Exact Decimal Arithmetic

| Approach | Pros | Cons |
|----------|------|------|
| `BigDecimal` | Exact, any precision, full rounding control | Verbose, slower than primitives |
| `int` or `long` (store cents, not dollars) | Fast, concise | Must track decimal point yourself, limited to 18 digits (`long`) |

```java
// BigDecimal — exact
BigDecimal price = new BigDecimal("1.03");
BigDecimal payment = new BigDecimal("0.42");
BigDecimal change = price.subtract(payment); // 0.61 exactly

// int (cents) — fast and exact
int priceInCents = 103;
int paymentInCents = 42;
int changeInCents = priceInCents - paymentInCents; // 61
```

**Always use the `String` constructor** for `BigDecimal`: `new BigDecimal("0.1")` is exact, but `new BigDecimal(0.1)` is not (it captures the imprecise double representation).

---

## Item 61: Prefer Primitive Types to Boxed Primitives

Java has a two-part type system: **primitives** (`int`, `double`, `boolean`) and **boxed primitives** (`Integer`, `Double`, `Boolean`). Three key differences:

| Difference | Primitive | Boxed |
|-----------|-----------|-------|
| **Identity** | Values only | Distinct identity (two `Integer` instances can have the same value but different identity) |
| **Completeness** | Every value is functional | Can be `null` |
| **Performance** | Time and space efficient | Significant overhead per instance |

### Trap 1 — Broken Comparator

```java
// BROKEN — uses identity comparison (==) on Integer objects
Comparator<Integer> naturalOrder = (i, j) -> (i < j) ? -1 : (i == j ? 0 : 1);
naturalOrder.compare(new Integer(42), new Integer(42)); // returns 1, not 0!
```

`i == j` performs **identity comparison** on `Integer` objects, not value comparison. Fix: use `Integer.compare(i, j)` or auto-unbox first.

### Trap 2 — NullPointerException from Unboxing

```java
Integer i; // null by default
if (i == 42) // NullPointerException: unboxing null
    System.out.println("Incredible");
```

Mixing primitives and boxed primitives in an expression causes **auto-unboxing**, and unboxing `null` throws `NullPointerException`.

### Trap 3 — Performance Disaster

```java
// Hideously slow — autoboxing in every iteration
Long sum = 0L;
for (long i = 0; i <= Integer.MAX_VALUE; i++)
    sum += i;
```

Changes `Long` to `long`: **6.3 seconds → 0.59 seconds** (Item 6).

### When Boxed Primitives Are Required

- As type parameters in generics (`List<Integer>`, not `List<int>`)
- As keys or values in collections
- When used with reflection

---

## Item 62: Avoid Strings Where Other Types Are More Appropriate

Strings are designed for textual data. Avoid using them as substitutes for:

| Misuse | Better Alternative |
|--------|-------------------|
| Other value types | `int`, `float`, `boolean`, `BigInteger`, enums |
| Enum substitutes | Real enum types (Item 34) |
| Aggregate types | Write a class. `String key = className + "#" + index` is fragile — use a proper class with typed fields |
| Capability keys | Use a real type. `ThreadLocal` originally used `String` keys — name collisions across libraries. The fix was the `ThreadLocal<T>` class itself. |

---

## Item 63: Beware the Performance of String Concatenation

String concatenation with `+` is fine for a few strings but is **O(n²)** for repeated concatenation in a loop because strings are immutable — each concatenation creates a new `String`, copying the entire contents.

```java
// BAD — O(n²) due to repeated string concatenation
String result = "";
for (int i = 0; i < numItems(); i++)
    result += lineForItem(i); // quadratic time

// GOOD — O(n) with StringBuilder
StringBuilder sb = new StringBuilder(numItems() * LINE_WIDTH);
for (int i = 0; i < numItems(); i++)
    sb.append(lineForItem(i));
return sb.toString();
```

**Preallocate capacity** in the `StringBuilder` constructor if you can estimate the final size.

The compiler may optimize simple concatenation expressions (`"a" + "b" + "c"`) into a single `StringBuilder` chain, but it **cannot** optimize concatenation inside a loop.

---

## Item 64: Refer to Objects by Their Interfaces

If an appropriate interface type exists, declare parameters, return values, variables, and fields using the **interface type** rather than the implementation class:

```java
// GOOD — flexible, can swap implementations
Set<Son> sonSet = new LinkedHashSet<>();

// BAD — locks you into LinkedHashSet
LinkedHashSet<Son> sonSet = new LinkedHashSet<>();
```

With the interface type, changing the implementation is a single-line change:

```java
Set<Son> sonSet = new HashSet<>(); // switched from LinkedHashSet — one line changed
```

### When to Use the Implementation Type

- The class has no appropriate interface (e.g., `String`, `BigInteger`)
- The class provides methods not in the interface that you need (e.g., `PriorityQueue` has methods not in `Queue`)
- Framework-specific base types (e.g., `java.io.OutputStream`)

---

## Item 65: Prefer Interfaces to Reflection

`java.lang.reflect` provides programmatic access to information about loaded classes — constructors, methods, fields. Reflection allows operating on classes that didn't exist at compile time.

### Costs of Reflection

| Cost | Details |
|------|---------|
| **No compile-time type checking** | If you call a nonexistent method, you get a runtime exception — not a compile error |
| **Verbose, unreadable code** | A reflective method invocation is 10+ lines vs one line for a normal call |
| **Performance** | Reflective method invocation is **much** slower than normal invocation |

### Legitimate Uses

- **Dependency injection frameworks** (Spring uses reflection to instantiate beans)
- **Object serialization frameworks** (Jackson, Gson)
- **Code analysis tools** (IDE auto-complete, linters)
- **Class browsers and testing tools**

### Best Practice — Reflect for Instantiation, Interface for Usage

```java
// Create instance via reflection, use via interface
Class<? extends Set<String>> cl = (Class<? extends Set<String>>)
    Class.forName(args[0]);
Constructor<? extends Set<String>> cons = cl.getDeclaredConstructor();
Set<String> s = cons.newInstance(); // reflection used ONLY for instantiation

// Use the instance through its interface — fast, type-safe
s.addAll(Arrays.asList(args).subList(1, args.length));
System.out.println(s);
```

---

## Item 66: Use Native Methods Judiciously

The **Java Native Interface (JNI)** lets Java call native methods written in C or C++. Historically used for:

1. **Platform-specific facilities** (registries, file locks) — mostly unnecessary now; `java.lang.ProcessBuilder`, `java.util.prefs`, etc. provide Java APIs
2. **Legacy native libraries** — still valid for interop
3. **Performance-critical code** — **rarely justified** since modern JVMs are fast enough. JNI calls have significant overhead (marshalling, no GC optimization across boundary)

### Downsides of Native Methods

- **Memory corruption risk** — native code is not safe (buffer overflows, dangling pointers)
- **Not portable** — must compile for each platform
- **Harder to debug** — no Java stack traces, no Java debugging tools
- **GC can't track native memory** — potential memory leaks
- **Glue code** is tedious and error-prone

**Recommendation**: avoid JNI unless you genuinely need to access a native library. Modern Java (`java.nio`, `java.util.concurrent`, vector API) has closed most performance gaps.

---

## Item 67: Optimize Judiciously

> "More computing sins are committed in the name of efficiency than for any other single reason — including blind stupidity." — W.A. Wulf

> "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil." — Donald Knuth

> "We follow two rules in the matter of optimization: Rule 1. Don't do it. Rule 2 (for experts only). Don't do it yet." — M.A. Jackson

### The Right Approach

1. **Write clean, well-structured code first** — good architecture enables optimization
2. **Avoid design decisions that limit performance** — these are hardest to fix later. APIs, wire protocols, persistent data formats are locked in.
3. **Measure before optimizing** — use profilers (`JMH`, `async-profiler`, `JFR/JMC`). The bottleneck is almost never where you think.
4. **Measure after every attempted optimization** — verify that it actually helped

### Design Decisions That Lock In Performance

| Decision | Consequence |
|----------|-------------|
| **Public mutable types** | Require defensive copying on every access (Item 50) |
| **Composition vs inheritance** | Inheritance locks you into an implementation; composition is flexible (Item 18) |
| **Interface vs implementation type in API** | Interface allows swapping implementations; implementation type locks you in (Item 64) |

---

## Item 68: Adhere to Generally Accepted Naming Conventions

### Typographical Conventions

| Element | Convention | Examples |
|---------|-----------|---------|
| Package | `lowercase.separated.by.dots` | `com.google.common.collect` |
| Class / Interface | `PascalCase` | `Stream`, `FutureTask`, `LinkedHashMap`, `HttpClient` |
| Method / Field | `camelCase` | `remove`, `groupingBy`, `getCrc` |
| Constant (`static final`) | `UPPER_SNAKE_CASE` | `MIN_VALUE`, `NEGATIVE_INFINITY` |
| Local variable | `camelCase` (abbreviation OK) | `i`, `denom`, `houseNum` |
| Type parameter | Single uppercase letter | `T` (type), `E` (element), `K`/`V` (key/value), `R` (return), `X` (exception) |

### Grammatical Conventions

| Element | Convention | Examples |
|---------|-----------|---------|
| Class (instantiable) | Noun or noun phrase | `Thread`, `PriorityQueue`, `ChessPiece` |
| Interface | Noun, adjective, or `-able`/`-ible` | `Collection`, `Comparable`, `Runnable`, `Iterable` |
| Method (action) | Verb or verb phrase | `append`, `drawImage` |
| Method (returns boolean) | `is` or `has` prefix | `isDigit`, `isEmpty`, `hasSiblings` |
| Method (returns attribute) | Noun, `get` prefix, or property name | `size`, `hashCode`, `getTime` |
| Converter methods | `toType` | `toString`, `toArray` |
| View methods | `asType` | `asList`, `asMap` |
| Static factory | `from`, `of`, `valueOf`, `newInstance`, `getInstance` | `Date.from()`, `List.of()`, `BigInteger.valueOf()` |
