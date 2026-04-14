# Chapter 2 — Creating and Destroying Objects

This chapter covers when and how to create objects, when and how to avoid creating them, how to ensure they are destroyed in a timely manner, and how to manage cleanup actions that must precede object destruction.

---

## Item 1: Consider Static Factory Methods Instead of Constructors

The traditional way for a class to provide an instance is a public constructor. Every class should also consider providing a **static factory method** — a static method that returns an instance of the class.

```java
// Static factory method — Boolean
public static Boolean valueOf(boolean b) {
    return b ? Boolean.TRUE : Boolean.FALSE;
}
```

### Advantages Over Constructors

| Advantage | Explanation |
|-----------|-------------|
| **They have names** | `BigInteger.probablePrime()` is far clearer than `new BigInteger(int, int, Random)`. Constructors with the same parameter types can only differ by parameter order — a maintenance nightmare. |
| **Not required to create a new object each call** | Allows instance-controlled classes. `Boolean.valueOf(boolean)` never creates an object — it returns a cached instance. This enables the Flyweight pattern, guarantees singletons, and allows `==` instead of `.equals()`. |
| **Can return any subtype of the return type** | The API can return objects of non-public classes. Java Collections Framework has 45 utility implementations (unmodifiable, synchronized, etc.) — all hidden behind static factory methods in `java.util.Collections`. |
| **Returned class can vary based on input parameters** | `EnumSet.of()` returns `RegularEnumSet` (backed by a single `long`) for enums with ≤64 elements, and `JumboEnumSet` (backed by a `long[]`) for larger enums. Callers neither know nor care. |
| **Returned class need not exist when the factory is written** | This is the basis of **service provider frameworks** like JDBC. The `DriverManager.getConnection()` factory can return a `Connection` implementation that didn't exist when the factory method was written. |

### Disadvantages

| Disadvantage | Mitigation |
|-------------|-----------|
| **Classes without public/protected constructors cannot be subclassed** | This is actually a blessing — it encourages composition over inheritance (Item 18). |
| **Hard to find in API documentation** | Use conventional names (see below). |

### Common Naming Conventions

| Name | Pattern | Example |
|------|---------|---------|
| `from` | Type conversion (single param) | `Date.from(instant)` |
| `of` | Aggregation (multiple params) | `EnumSet.of(JACK, QUEEN, KING)` |
| `valueOf` | Verbose alternative to `from`/`of` | `BigInteger.valueOf(Integer.MAX_VALUE)` |
| `instance` / `getInstance` | Returns instance (not necessarily new) | `StackWalker.getInstance(options)` |
| `create` / `newInstance` | Guarantees a new instance each time | `Array.newInstance(classObject, length)` |
| `get`*Type* | Factory in a different class | `Files.getFileStore(path)` |
| `new`*Type* | Like `newInstance` but in different class | `Collections.newSetFromMap(map)` |
| `type` | Concise alternative | `Collections.list(enumeration)` |

### Interview Angle

**Q: When would you use a static factory method over a constructor?**
A: When you need descriptive naming, instance caching/control, returning subtypes or interface types, or when the return type should vary by input. The JDK is full of examples: `Optional.of()`, `List.of()`, `Collections.unmodifiableList()`, `EnumSet.of()`.

---

## Item 2: Consider a Builder When Faced with Many Constructor Parameters

Static factories and constructors share a limitation: they don't scale well to large numbers of optional parameters.

### The Problem — Three Bad Approaches

**Telescoping constructors**: provide a constructor with only required params, another with one optional param, another with two, etc. This works but is **unreadable** with many parameters — you can't tell which value corresponds to which parameter without counting positions.

**JavaBeans pattern** (setters): create object with no-arg constructor, then call setters. Readable, but **the object is in an inconsistent state partway through construction**, and it **precludes immutability** (setters exist).

**Builder pattern**: combines the safety of telescoping constructors with the readability of JavaBeans:

```java
public class NutritionFacts {
    private final int servingSize;   // required
    private final int servings;      // required
    private final int calories;      // optional
    private final int fat;           // optional
    private final int sodium;        // optional

    public static class Builder {
        // Required parameters
        private final int servingSize;
        private final int servings;

        // Optional parameters — initialized to defaults
        private int calories = 0;
        private int fat = 0;
        private int sodium = 0;

        public Builder(int servingSize, int servings) {
            this.servingSize = servingSize;
            this.servings = servings;
        }

        public Builder calories(int val) { calories = val; return this; }
        public Builder fat(int val)      { fat = val;      return this; }
        public Builder sodium(int val)   { sodium = val;   return this; }

        public NutritionFacts build() {
            return new NutritionFacts(this);
        }
    }

    private NutritionFacts(Builder builder) {
        servingSize = builder.servingSize;
        servings    = builder.servings;
        calories    = builder.calories;
        fat         = builder.fat;
        sodium      = builder.sodium;
    }
}

// Usage — reads like named parameters
NutritionFacts cocaCola = new NutritionFacts.Builder(240, 8)
        .calories(100)
        .sodium(35)
        .build();
```

### Builder Pattern with Class Hierarchies

The Builder pattern works beautifully with class hierarchies using **covariant return typing** and **simulated self-type**:

```java
public abstract class Pizza {
    final Set<Topping> toppings;

    abstract static class Builder<T extends Builder<T>> {
        EnumSet<Topping> toppings = EnumSet.noneOf(Topping.class);
        public T addTopping(Topping topping) {
            toppings.add(Objects.requireNonNull(topping));
            return self();
        }
        abstract Pizza build();
        protected abstract T self(); // subclasses return "this"
    }

    Pizza(Builder<?> builder) {
        toppings = builder.toppings.clone();
    }
}
```

### When to Use

- **4+ parameters** (especially optional ones) — use Builder
- **Domain objects with many fields** — Builder is almost always better
- **Immutable objects** — Builder is the natural choice
- **Fluent APIs** — Builder enables readable construction chains

### Real-World Usage

Lombok's `@Builder`, Protobuf's generated builders, Immutables library, AutoValue — all follow this pattern. In Spring, `WebClient.builder()` and `UriComponentsBuilder` are prominent examples.

---

## Item 3: Enforce the Singleton Property with a Private Constructor or an Enum Type

A **singleton** is a class instantiated exactly once. Making a class a singleton can make testing difficult because you can't substitute a mock implementation unless the singleton implements an interface.

### Three Approaches

**Approach 1 — Public final field:**

```java
public class Elvis {
    public static final Elvis INSTANCE = new Elvis();
    private Elvis() { }
}
```

**Approach 2 — Static factory method:**

```java
public class Elvis {
    private static final Elvis INSTANCE = new Elvis();
    private Elvis() { }
    public static Elvis getInstance() { return INSTANCE; }
}
```

**Approach 3 — Single-element enum (PREFERRED):**

```java
public enum Elvis {
    INSTANCE;

    public void leaveTheBuilding() { ... }
}
```

### Why Enum Is Best

| Concern | Field / Factory | Enum |
|---------|----------------|------|
| Serialization | Must add `readResolve()` to prevent new instances during deserialization | Free — JVM guarantees it |
| Reflection attack | Privileged client can invoke private constructor via `AccessibleObject.setAccessible` | Impossible — JVM prevents it |
| Thread safety | Must ensure lazy-init is safe | Free — enum initialization is thread-safe by JLS |
| Conciseness | Boilerplate constructor, field, and method | Single line |

The enum approach cannot be used if the singleton must extend a superclass other than `Enum`.

### Interview Angle

**Q: How do you implement a thread-safe singleton in Java?**
A: Use a single-element enum (Bloch's recommendation). If that's not possible, use the static holder pattern (lazy, thread-safe, no synchronization overhead).

---

## Item 4: Enforce Noninstantiability with a Private Constructor

Utility classes (like `java.lang.Math`, `java.util.Arrays`, `java.util.Collections`) are not designed to be instantiated. But the compiler provides a default public no-arg constructor if you don't write any constructor.

**Making a class abstract does NOT prevent instantiation** — it can be subclassed and the subclass instantiated.

```java
public class UtilityClass {
    private UtilityClass() {
        throw new AssertionError(); // prevents internal instantiation
    }
}
```

The `AssertionError` isn't strictly required but provides insurance against accidental invocation from within the class.

**Side effect**: this also prevents subclassing — all constructors must invoke a superclass constructor, and there's no accessible one.

---

## Item 5: Prefer Dependency Injection to Hardwiring Resources

Many classes depend on underlying resources. A common anti-pattern:

```java
// Static utility — inflexible, untestable
public class SpellChecker {
    private static final Lexicon dictionary = new EnglishLexicon();
    private SpellChecker() {}
    public static boolean isValid(String word) { ... }
}
```

**Problem**: you can't swap the dictionary for testing, localization, or specialized dictionaries.

**Solution — Dependency Injection**: pass the resource (or a factory for creating it) into the constructor:

```java
public class SpellChecker {
    private final Lexicon dictionary;

    public SpellChecker(Lexicon dictionary) {
        this.dictionary = Objects.requireNonNull(dictionary);
    }

    public boolean isValid(String word) { ... }
}
```

### Benefits

- **Testability**: inject a mock dictionary in tests
- **Flexibility**: swap implementations without changing the class
- **Immutability preserved**: the `dictionary` field is `final`
- **Works with factories**: pass a `Supplier<? extends Lexicon>` for lazy/varied creation

### Connection to Frameworks

This is exactly what Spring's `@Autowired` / `@Inject` does at scale. DI frameworks (Spring, Guice, Dagger) automate the wiring but the principle is the same: **don't create your own dependencies — receive them**.

### Interview Angle

**Q: Why is dependency injection important?**
A: It decouples a class from its dependencies, enabling testability (inject mocks), flexibility (swap implementations), and adherence to the Dependency Inversion Principle (depend on abstractions, not concretions). It's the foundation of Spring's IoC container.

---

## Item 6: Avoid Creating Unnecessary Objects

Reuse a single object instead of creating a functionally equivalent new object each time.

### Worst Offender — String Construction

```java
// NEVER do this — creates a new String instance each time
String s = new String("bikini");

// Correct — reuses the string from the string pool
String s = "bikini";
```

### Autoboxing — The Hidden Object Factory

```java
// Hideously slow! Creates ~2^31 unnecessary Long instances
private static long sum() {
    Long sum = 0L;  // Long instead of long
    for (long i = 0; i <= Integer.MAX_VALUE; i++)
        sum += i;   // autoboxing creates a Long on every iteration
    return sum;
}
```

**Fix**: change `Long sum` to `long sum`. The difference: **6.3 seconds → 0.59 seconds**.

### Expensive Object Reuse — Pattern Compilation

```java
// BAD: compiles the regex on every invocation
static boolean isRomanNumeral(String s) {
    return s.matches("^(?=.)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");
}

// GOOD: compile once, reuse
private static final Pattern ROMAN =
    Pattern.compile("^(?=.)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");

static boolean isRomanNumeral(String s) {
    return ROMAN.matcher(s).matches();
}
```

### When NOT to Avoid Object Creation

- **Defensive copies** (Item 50) are necessary for correctness — don't reuse when you should copy
- **Small object creation is cheap** — modern JVMs are extremely efficient at allocating and garbage-collecting short-lived objects
- **Object pools** are a bad idea except for genuinely expensive objects like database connections

**Key principle**: prefer clarity and correctness over premature optimization. But know the obvious traps (autoboxing, pattern recompilation, unnecessary String construction).

---

## Item 7: Eliminate Obsolete Object References

Java has garbage collection, but you can still create **unintentional object retentions** (memory leaks).

### Classic Example — A Stack Implementation

```java
public class Stack {
    private Object[] elements;
    private int size = 0;

    public Object pop() {
        if (size == 0) throw new EmptyStackException();
        return elements[--size]; // BUG: holds obsolete reference
    }
}
```

After popping, `elements[size]` still holds a reference to the popped object. The GC cannot collect it.

```java
// FIX: null out obsolete references
public Object pop() {
    if (size == 0) throw new EmptyStackException();
    Object result = elements[--size];
    elements[size] = null; // eliminate obsolete reference
    return result;
}
```

### Three Common Sources of Memory Leaks

| Source | Example | Fix |
|-------|---------|-----|
| **Classes that manage their own memory** | Stack, ArrayList, HashMap with removed entries | Null out references when elements are logically removed |
| **Caches** | Objects placed in cache and forgotten | Use `WeakHashMap` (if cache lifetime tied to key references), `ScheduledThreadPoolExecutor` for periodic cleanup, or `LinkedHashMap.removeEldestEntry()` for LRU eviction |
| **Listeners and callbacks** | Registering callbacks without deregistering | Store callbacks as weak references (`WeakHashMap`), or provide an explicit deregister API |

### Interview Angle

**Q: Can Java have memory leaks? How?**
A: Yes. The GC can only collect objects with no live references. Common causes: collections that grow but never shrink (holding obsolete references), caches without eviction policies, registered listeners/callbacks never deregistered, and `ThreadLocal` variables not cleaned up. Tools: heap dumps, Eclipse MAT, VisualVM, JFR.

---

## Item 8: Avoid Finalizers and Cleaners

**Finalizers** (pre-Java 9) and **cleaners** (Java 9+) are unpredictable, slow, dangerous, and generally unnecessary.

### Why They're Problematic

| Problem | Explanation |
|---------|-------------|
| **No timeliness guarantee** | The JVM makes no guarantee when (or if) finalizers/cleaners will run. Never depend on them for releasing critical resources (file handles, database connections). |
| **Performance penalty** | Creating and destroying a simple object: 12ns normal vs 550ns with finalizer — **50x slower**. |
| **Security vulnerability** | A subclass can override `finalize()` to prevent garbage collection, creating a **finalizer attack** — a partially-constructed object can be resurrected and used maliciously. |
| **Exceptions swallowed** | Uncaught exceptions in finalizers are silently ignored — the object is left in a corrupt state with no warning. |

### What to Use Instead — `AutoCloseable` + try-with-resources

```java
public class Room implements AutoCloseable {
    private final Cleaner.Cleanable cleanable;

    @Override
    public void close() {
        cleanable.clean();
    }
}

// Usage — deterministic cleanup
try (Room room = new Room()) {
    // use room
} // room.close() called automatically
```

### Legitimate Uses of Cleaners

1. **Safety net**: if the owner forgets to call `close()`, a cleaner/finalizer is better than nothing — but log a warning
2. **Native peers**: a native peer object (JNI) has no Java finalizer chain — a cleaner can free the native memory

---

## Item 9: Prefer try-with-resources to try-finally

Before Java 7, `try-finally` was the standard way to ensure resource cleanup. It doesn't scale and has a subtle bug:

```java
// BAD — exception in close() masks exception in read()
static String firstLineOfFile(String path) throws IOException {
    BufferedReader br = new BufferedReader(new FileReader(path));
    try {
        return br.readLine();
    } finally {
        br.close(); // if this throws, the original exception is lost
    }
}
```

With **two resources**, the nesting becomes illegible. With `try-with-resources`:

```java
// GOOD — clean, correct, and suppressed exceptions preserved
static String firstLineOfFile(String path) throws IOException {
    try (BufferedReader br = new BufferedReader(new FileReader(path))) {
        return br.readLine();
    }
}

// Multiple resources — still clean
static void copy(String src, String dst) throws IOException {
    try (InputStream   in  = new FileInputStream(src);
         OutputStream out = new FileOutputStream(dst)) {
        byte[] buf = new byte[1024];
        int n;
        while ((n = in.read(buf)) >= 0)
            out.write(buf, 0, n);
    }
}
```

**Suppressed exceptions**: if both `readLine()` and `close()` throw, the exception from `readLine()` is propagated and the one from `close()` is **suppressed** (accessible via `Throwable.getSuppressed()`).

### Rule

**Always use try-with-resources** for any object that implements `AutoCloseable`. No exceptions. It's shorter, clearer, and handles exception masking correctly.
