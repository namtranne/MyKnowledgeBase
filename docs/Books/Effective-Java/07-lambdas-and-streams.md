# Chapter 7 — Lambdas and Streams

Java 8 added **functional interfaces**, **lambdas**, and **method references** as well as the **Stream API** for bulk processing of data sequences. This chapter covers best practices for using these features.

---

## Item 42: Prefer Lambdas to Anonymous Classes

Before Java 8, anonymous classes were the primary way to create function objects (objects whose sole purpose is to represent a function or action):

```java
// Anonymous class — verbose
Collections.sort(words, new Comparator<String>() {
    public int compare(String s1, String s2) {
        return Integer.compare(s1.length(), s2.length());
    }
});
```

Lambdas are far more concise and readable:

```java
// Lambda — concise
Collections.sort(words, (s1, s2) -> Integer.compare(s1.length(), s2.length()));

// Even shorter — Comparator construction method
Collections.sort(words, comparingInt(String::length));

// Shortest — List.sort (Java 8)
words.sort(comparingInt(String::length));
```

### Lambdas Enable Constant-Specific Behavior Without Boilerplate

```java
public enum Operation {
    PLUS  ("+", (x, y) -> x + y),
    MINUS ("-", (x, y) -> x - y),
    TIMES ("*", (x, y) -> x * y),
    DIVIDE("/", (x, y) -> x / y);

    private final String symbol;
    private final DoubleBinaryOperator op;

    Operation(String symbol, DoubleBinaryOperator op) {
        this.symbol = symbol;
        this.op = op;
    }

    public double apply(double x, double y) { return op.applyAsDouble(x, y); }
}
```

### When NOT to Use Lambdas

| Situation | Why |
|-----------|-----|
| **More than 3 lines** | Lambda readability degrades rapidly — extract to a named method |
| **Need `this` reference** | In a lambda, `this` refers to the enclosing instance. In an anonymous class, `this` refers to the anonymous class instance. |
| **Need to create instances of abstract classes** | Lambdas only work with functional interfaces (single abstract method) |
| **Serialization** | Lambdas and anonymous classes are unreliably serializable across JVM implementations |

### Lambda Limitations

- Lambdas lack names and documentation — if a computation isn't self-explanatory, don't use a lambda
- Can't access themselves (no `this` for the lambda itself)
- Types are inferred — omit types unless including them makes the code clearer

---

## Item 43: Prefer Method References to Lambdas

Method references are even more concise than lambdas and should be preferred when they make the code clearer:

```java
// Lambda
map.merge(key, 1, (count, incr) -> count + incr);

// Method reference — clearer
map.merge(key, 1, Integer::sum);
```

### Five Kinds of Method References

| Kind | Example | Lambda Equivalent |
|------|---------|-------------------|
| **Static** | `Integer::parseInt` | `str -> Integer.parseInt(str)` |
| **Bound instance** | `Instant.now()::isAfter` | `t -> Instant.now().isAfter(t)` |
| **Unbound instance** | `String::toLowerCase` | `str -> str.toLowerCase()` |
| **Class constructor** | `TreeMap<K,V>::new` | `() -> new TreeMap<K,V>()` |
| **Array constructor** | `int[]::new` | `len -> new int[len]` |

### When Lambdas Are Better

Sometimes the lambda is more readable, especially when the method is in the same class:

```java
// Method reference — less readable (what class is GoshThisClassNameIsHumongous?)
service.execute(GoshThisClassNameIsHumongous::action);

// Lambda — clearer
service.execute(() -> action());
```

**Rule of thumb**: use method references when they're shorter and clearer. Use lambdas when they're not.

---

## Item 44: Favor the Use of Standard Functional Interfaces

The `java.util.function` package provides 43 standard functional interfaces. Learn the six basic ones — the rest are derived from them.

### The Six Basic Functional Interfaces

| Interface | Function Signature | Example |
|-----------|-------------------|---------|
| `UnaryOperator<T>` | `T apply(T t)` | `String::toLowerCase` |
| `BinaryOperator<T>` | `T apply(T t1, T t2)` | `BigInteger::add` |
| `Predicate<T>` | `boolean test(T t)` | `Collection::isEmpty` |
| `Function<T,R>` | `R apply(T t)` | `Arrays::asList` |
| `Supplier<T>` | `T get()` | `Instant::now` |
| `Consumer<T>` | `void accept(T t)` | `System.out::println` |

### Primitive Specializations

Each basic interface has `int`, `long`, and `double` variants to avoid autoboxing overhead:

- `IntPredicate`, `LongFunction<R>`, `DoubleConsumer`, etc.
- `ToIntFunction<T>`, `ToLongBiFunction<T,U>`, etc.

**Never use boxed primitives** (`Function<Integer, Integer>`) when primitive specializations exist (`IntUnaryOperator`). Autoboxing in tight loops is a significant performance hit (Item 6).

### When to Write Your Own Functional Interface

Write a custom one when:
1. It will be commonly used and benefits from a descriptive name (e.g., `Comparator<T>` instead of `ToIntBiFunction<T,T>`)
2. It has a strong contract that benefits from documentation
3. It has custom default methods

**Always annotate custom functional interfaces with `@FunctionalInterface`** — it documents intent and prevents accidental addition of abstract methods.

---

## Item 45: Use Streams Judiciously

The Stream API provides two key abstractions:
- **Stream**: a finite or infinite sequence of data elements
- **Stream pipeline**: a multi-stage computation on these elements (source → intermediate operations → terminal operation)

### Stream Pipelines

```
Source (Collection, array, file, regex, random)
  → Intermediate ops (filter, map, flatMap, sorted, distinct, limit, skip)
  → Terminal op (forEach, collect, reduce, count, min, max, anyMatch, findFirst)
```

Pipelines are evaluated **lazily** — computation doesn't start until the terminal operation is invoked. This enables infinite streams and short-circuiting.

### Overusing Streams — The Anagram Example

```java
// TOO MUCH — unreadable stream pipeline
"dictFile".chars().boxed()
    .collect(groupingBy(word -> word.chars().sorted()
        .collect(StringBuilder::new, (sb, c) -> sb.append((char) c),
            StringBuilder::append).toString()))
    .values().stream()
    .filter(group -> group.size() >= minGroupSize)
    .map(group -> group.size() + ": " + group)
    .forEach(System.out::println);
```

```java
// BETTER — extract helper methods, use streams for the right parts
words.collect(groupingBy(word -> alphabetize(word)))
    .values().stream()
    .filter(group -> group.size() >= minGroupSize)
    .forEach(g -> System.out.println(g.size() + ": " + g));
```

### When Streams Shine vs When They Don't

**Streams excel at:**
- Uniformly transforming sequences of elements
- Filtering sequences
- Combining sequences (concatenation, grouping, aggregation)
- Searching sequences (findFirst, anyMatch)
- Accumulating into collections

**Streams are awkward for:**
- Accessing the original element and its index simultaneously
- Modifying local variables from within a pipeline (lambdas can only read effectively final variables)
- Returning early, throwing checked exceptions, or using break/continue
- Processing multiple pipeline stages in parallel that need to access intermediate results

### char Streams — A Trap

```java
// Prints integer values, not characters!
"Hello world!".chars().forEach(System.out::print);
// Output: 72101108108111321191111141081001

// Fix: cast to char
"Hello world!".chars().forEach(x -> System.out.print((char) x));
```

**Avoid using streams for char processing** — the lack of a `CharStream` type makes it clumsy.

---

## Item 46: Prefer Side-Effect-Free Functions in Streams

Streams aren't just an API — they're a **paradigm** based on functional programming. The key idea: each stage of a stream pipeline should be a **pure function** — its result depends only on its input, with no side effects.

### The forEach Anti-Pattern

```java
// BAD — uses forEach as a mutating operation (side effect)
Map<String, Long> freq = new HashMap<>();
words.forEach(word -> freq.merge(word.toLowerCase(), 1L, Long::sum));

// GOOD — uses collect (proper terminal operation)
Map<String, Long> freq = words.stream()
    .collect(groupingBy(String::toLowerCase, counting()));
```

**`forEach` should only be used to report the result of a stream computation**, not to perform the computation itself. Using `forEach` for computation is a "stream-incompatible loop in disguise."

### Essential Collectors

| Collector | Purpose | Example |
|-----------|---------|---------|
| `toList()` | Collect to List | `stream.collect(toList())` |
| `toSet()` | Collect to Set | `stream.collect(toSet())` |
| `toMap(keyFn, valFn)` | Collect to Map | `stream.collect(toMap(Album::artist, a -> a))` |
| `groupingBy(classifier)` | Group elements | `words.collect(groupingBy(String::length))` |
| `joining(delimiter)` | Concatenate strings | `names.collect(joining(", "))` |
| `counting()` | Count elements in group | `groupingBy(word -> word, counting())` |
| `maxBy(comparator)` | Find max in group | `groupingBy(artist, maxBy(comparing(Album::sales)))` |
| `toUnmodifiableList()` | Immutable list (Java 10+) | `stream.collect(toUnmodifiableList())` |

### toMap with Merge Function — Handling Collisions

```java
// Frequency table — merge by summing
Map<String, Long> freq = words.stream()
    .collect(toMap(w -> w, w -> 1L, Long::sum));

// Pick the album with most sales per artist
Map<Artist, Album> topAlbums = albums.stream()
    .collect(toMap(Album::artist, a -> a, maxBy(comparing(Album::sales))));

// Last-writer-wins (same key keeps latest value)
Map<String, String> lastEntry = stream.collect(toMap(keyFn, valFn, (v1, v2) -> v2));
```

---

## Item 47: Prefer Collection to Stream as a Return Type

If a method returns a sequence of elements, consider what the caller might want to do:
- Stream pipeline → wants a `Stream`
- for-each iteration → wants an `Iterable`

`Collection` (and its subtypes) implements both `Iterable` and has a `stream()` method — it's the **best return type for public sequence-returning methods**.

```java
// Good — returns Collection, usable as Stream or Iterable
public Collection<ProcessHandle> getProcesses() {
    return ProcessHandle.allProcesses().collect(toList());
}
```

### When Collection Won't Work

For large or infinite sequences, don't materialize into a collection. Consider:
- Returning a custom `AbstractList` backed by an algorithm (e.g., power set of n elements has 2^n entries — don't store them all)
- Returning a `Stream` if the sequence is inherently stream-oriented

### Adapting Between Stream and Iterable

If you must return a `Stream` but callers need `Iterable` (or vice versa):

```java
// Stream → Iterable adapter
public static <E> Iterable<E> iterableOf(Stream<E> stream) {
    return stream::iterator;
}

// Iterable → Stream adapter
public static <E> Stream<E> streamOf(Iterable<E> iterable) {
    return StreamSupport.stream(iterable.spliterator(), false);
}
```

---

## Item 48: Use Caution When Making Streams Parallel

Calling `.parallel()` on a stream pipeline can provide dramatic speedups on multi-core systems — or can cause **incorrect results**, **liveness failures**, or **severe performance degradation**.

### When Parallelism Helps

Parallelism is most effective when the stream source is:

| Source | Parallelizable? | Why |
|--------|----------------|-----|
| `ArrayList` | Excellent | Array-backed, cheap random access, predictable split points |
| `HashMap` | Good | Segmented structure |
| `int[]` / `long[]` | Excellent | Contiguous memory, optimal cache locality |
| `IntStream.range()` | Excellent | Trivially splittable |
| `LinkedList` | Poor | Sequential access, expensive to split |
| `Stream.iterate()` | Terrible | Inherently sequential — each element depends on the previous |
| `BufferedReader.lines()` | Poor | I/O-bound, unpredictable split cost |

And the terminal operation must be **associative, non-interfering, and stateless**:
- `reduce()`, `count()`, `sum()`, `min()`, `max()`, `anyMatch()`, `allMatch()`, `noneMatch()` — all good
- `collect()` with mutable reduction — **not good** (overhead of combining partial results)

### When Parallelism Hurts

```java
// DANGEROUS — parallel() causes liveness failure with limit()
Stream.iterate(BigInteger.TWO, BigInteger::nextProbablePrime)
    .parallel()
    .limit(20)
    .forEach(System.out::println);
```

This program hangs or runs orders of magnitude slower. The pipeline can't effectively parallelize `iterate()` with `limit()` — it wastes enormous CPU trying to find splitting points.

### Rules for Parallel Streams

1. **Measure before and after** — always benchmark. Parallelism is a performance optimization, and most optimizations don't help (or actively hurt).
2. **Avoid `Stream.iterate()` and `limit()` with parallel** — inherently sequential
3. **Use splittable sources**: arrays, `ArrayList`, `HashMap`, `HashSet`, `IntStream.range()`
4. **Use reduction terminal operations**: `reduce`, `count`, `min`, `max`, `anyMatch`
5. **Ensure the function is safe**: no shared mutable state, no side effects
6. **The Fork-Join pool is shared** — a slow parallel stream can starve other tasks

### When It Works Beautifully

```java
// Computing π(n) — count of primes up to n
static long pi(long n) {
    return LongStream.rangeClosed(2, n)
        .parallel()
        .mapToObj(BigInteger::valueOf)
        .filter(i -> i.isProbablePrime(50))
        .count();
}
```

On a quad-core machine, this runs roughly **3.37x faster** with `.parallel()` — near-linear speedup because the source (`LongStream.rangeClosed`) splits perfectly and the operation (`isProbablePrime`) is CPU-intensive with no shared state.
