# Chapter 6 — Enums and Annotations

Java has two special-purpose families of reference types: **enums** (a kind of class) and **annotations** (a kind of interface). This chapter discusses best practices for using these type families.

---

## Item 34: Use Enums Instead of int Constants

Before enums, the common pattern was the **int enum pattern** — groups of named `int` constants:

```java
// ANTI-PATTERN — fragile, no type safety
public static final int APPLE_FUJI         = 0;
public static final int APPLE_PIPPIN       = 1;
public static final int ORANGE_NAVEL       = 0;
public static final int ORANGE_BLOOD       = 1;
```

### Problems with int Constants

| Problem | Consequence |
|---------|-------------|
| **No type safety** | Nothing prevents `APPLE_FUJI == ORANGE_NAVEL` (both are `0`) |
| **No namespace** | Must prefix names (`APPLE_` / `ORANGE_`) to avoid collisions |
| **Brittleness** | Reordering or adding constants changes values — clients must recompile |
| **No iteration** | Can't iterate over all apple types |
| **No string representation** | `System.out.println(APPLE_FUJI)` prints `0`, not `FUJI` |

### Java Enums — Full-Featured Classes

```java
public enum Planet {
    MERCURY(3.302e+23, 2.439e6),
    VENUS  (4.869e+24, 6.052e6),
    EARTH  (5.975e+24, 6.378e6),
    MARS   (6.419e+23, 3.393e6),
    JUPITER(1.899e+27, 7.149e7),
    SATURN (5.685e+26, 6.027e7),
    URANUS (8.683e+25, 2.556e7),
    NEPTUNE(1.024e+26, 2.477e7);

    private final double mass;
    private final double radius;
    private final double surfaceGravity;

    private static final double G = 6.67300E-11;

    Planet(double mass, double radius) {
        this.mass = mass;
        this.radius = radius;
        surfaceGravity = G * mass / (radius * radius);
    }

    public double surfaceWeight(double mass) {
        return mass * surfaceGravity;
    }
}
```

### Why Java Enums Are Powerful

| Feature | Explanation |
|---------|-------------|
| **Type safety** | `Planet` is a distinct type — can't pass an `int` or wrong enum |
| **Singleton instances** | Each constant is a public static final instance — one per value, guaranteed by JVM |
| **Fields and methods** | Enums can have data (mass, radius) and behavior (surfaceWeight) |
| **Implement interfaces** | Enums can implement `Comparable`, `Serializable`, custom interfaces |
| **Iteration** | `Planet.values()` returns all constants |
| **toString** | `Planet.EARTH.toString()` returns `"EARTH"` |
| **valueOf** | `Planet.valueOf("EARTH")` returns `Planet.EARTH` |
| **Switch-friendly** | Work naturally in switch statements |

### Constant-Specific Method Implementations

Instead of switch statements, let each constant define its own behavior:

```java
public enum Operation {
    PLUS   { public double apply(double x, double y) { return x + y; } },
    MINUS  { public double apply(double x, double y) { return x - y; } },
    TIMES  { public double apply(double x, double y) { return x * y; } },
    DIVIDE { public double apply(double x, double y) { return x / y; } };

    public abstract double apply(double x, double y);
}
```

Adding a new constant forces you to provide `apply()` — the compiler enforces completeness. With a switch, you might forget to add a case.

### Combining Constant-Specific Behavior with Data

```java
public enum Operation {
    PLUS("+")   { public double apply(double x, double y) { return x + y; } },
    MINUS("-")  { public double apply(double x, double y) { return x - y; } },
    TIMES("*")  { public double apply(double x, double y) { return x * y; } },
    DIVIDE("/") { public double apply(double x, double y) { return x / y; } };

    private final String symbol;

    Operation(String symbol) { this.symbol = symbol; }

    @Override public String toString() { return symbol; }
    public abstract double apply(double x, double y);
}
```

### Interview Angle

**Q: Why use enums over int/String constants?**
A: Enums provide type safety (compiler rejects wrong types), namespace (no prefixes needed), can carry data and behavior, support iteration, provide meaningful `toString()`, are singleton by JVM guarantee, and new constants can't be added without implementing abstract methods — enforcing completeness at compile time.

---

## Item 35: Use Instance Fields Instead of Ordinals

Every enum has an `ordinal()` method that returns the position of the constant in the enum declaration (0-based). **Never derive a value from the ordinal.**

```java
// ANTI-PATTERN — breaks if constants are reordered
public enum Ensemble {
    SOLO, DUET, TRIO, QUARTET, QUINTET;
    public int numberOfMusicians() { return ordinal() + 1; }
}
```

If you add `DOUBLE_QUARTET` between `QUARTET` and `QUINTET`, `numberOfMusicians()` returns the wrong value. You can never add a second constant with the same numeric value (e.g., both `OCTET` and `DOUBLE_QUARTET` have 8 musicians).

```java
// CORRECT — store the value in an instance field
public enum Ensemble {
    SOLO(1), DUET(2), TRIO(3), QUARTET(4),
    QUINTET(5), SEXTET(6), SEPTET(7), OCTET(8),
    DOUBLE_QUARTET(8), NONET(9), DECTET(10);

    private final int numberOfMusicians;
    Ensemble(int size) { this.numberOfMusicians = size; }
    public int numberOfMusicians() { return numberOfMusicians; }
}
```

The `ordinal()` method is designed for use by enum-based data structures like `EnumSet` and `EnumMap`. Unless you're writing such a data structure, avoid `ordinal()`.

---

## Item 36: Use EnumSet Instead of Bit Fields

The old-school way to represent sets of enum constants uses **bit fields** — `int` constants that are powers of 2, combined with bitwise OR:

```java
// ANTI-PATTERN — bit fields
public class Text {
    public static final int STYLE_BOLD      = 1 << 0; // 1
    public static final int STYLE_ITALIC    = 1 << 1; // 2
    public static final int STYLE_UNDERLINE = 1 << 2; // 4
    public static final int STYLE_STRIKETHROUGH = 1 << 3; // 8

    public void applyStyles(int styles) { ... }
}
text.applyStyles(STYLE_BOLD | STYLE_ITALIC);
```

**Problems**: all the disadvantages of int constants (Item 34), plus: hard to interpret when printed, no easy way to iterate, must choose `int` or `long` at design time (limits to 32 or 64 flags).

```java
// CORRECT — EnumSet
public class Text {
    public enum Style { BOLD, ITALIC, UNDERLINE, STRIKETHROUGH }

    public void applyStyles(Set<Style> styles) { ... }
}
text.applyStyles(EnumSet.of(Style.BOLD, Style.ITALIC));
```

### Why EnumSet Is Superior

- **Type-safe**: can't mix styles from different enums
- **Rich API**: `Set` operations (union, intersection, difference) built in
- **Performant**: internally represented as a **bit vector** — same performance as manual bit manipulation. `RegularEnumSet` uses a single `long` for enums with ≤64 elements.
- **Readable**: `EnumSet.of(BOLD, ITALIC)` is self-documenting
- **Iterable**: `for (Style s : styles)` works naturally

**API tip**: accept `Set<Style>` in method signatures (not `EnumSet<Style>`) to allow clients to pass any `Set` implementation, while internally using `EnumSet`.

---

## Item 37: Use EnumMap Instead of Ordinal Indexing

When you need to map from enum constants to values, use `EnumMap` — not an array indexed by `ordinal()`.

```java
// ANTI-PATTERN — array indexed by ordinal
Set<Plant>[] plantsByLifeCycle = (Set<Plant>[]) new Set[LifeCycle.values().length];
for (int i = 0; i < plantsByLifeCycle.length; i++)
    plantsByLifeCycle[i] = new HashSet<>();
for (Plant p : garden)
    plantsByLifeCycle[p.lifeCycle.ordinal()].add(p);
```

**Problems**: arrays don't play well with generics (unchecked cast), the `int` index has no meaning (you must label output manually), ordinal values are fragile.

```java
// CORRECT — EnumMap
Map<LifeCycle, Set<Plant>> plantsByLifeCycle = new EnumMap<>(LifeCycle.class);
for (LifeCycle lc : LifeCycle.values())
    plantsByLifeCycle.put(lc, new HashSet<>());
for (Plant p : garden)
    plantsByLifeCycle.get(p.lifeCycle).add(p);

// Even better — with streams (Java 8+)
Map<LifeCycle, Set<Plant>> plantsByLifeCycle = garden.stream()
    .collect(groupingBy(p -> p.lifeCycle,
             () -> new EnumMap<>(LifeCycle.class),
             toSet()));
```

### Why EnumMap Is Better

| Feature | Array + ordinal | EnumMap |
|---------|----------------|---------|
| Type safety | None — raw `int` index | Full — keys are enum constants |
| Performance | O(1) array access | O(1) — internally an array, but type-safe |
| Readability | Must label output manually | Keys are self-documenting |
| Maintainability | Breaks if enum changes | Adapts automatically |

### Nested EnumMap for Multi-Dimensional Mapping

For mapping from pairs of enums (e.g., phase transitions: LIQUID→SOLID = FREEZING):

```java
public enum Phase {
    SOLID, LIQUID, GAS;

    public enum Transition {
        MELT(SOLID, LIQUID), FREEZE(LIQUID, SOLID),
        BOIL(LIQUID, GAS), CONDENSE(GAS, LIQUID),
        SUBLIME(SOLID, GAS), DEPOSIT(GAS, SOLID);

        private final Phase from, to;
        Transition(Phase from, Phase to) { this.from = from; this.to = to; }

        private static final Map<Phase, Map<Phase, Transition>> m =
            Stream.of(values()).collect(groupingBy(
                t -> t.from,
                () -> new EnumMap<>(Phase.class),
                toMap(t -> t.to, t -> t, (x, y) -> y, () -> new EnumMap<>(Phase.class))
            ));

        public static Transition from(Phase from, Phase to) {
            return m.get(from).get(to);
        }
    }
}
```

Adding a new phase (e.g., `PLASMA`) only requires adding the constant and its transitions — the map structure adapts automatically. With a 2D ordinal-indexed array, you'd need to update the entire NxN matrix manually.

---

## Item 38: Emulate Extensible Enums with Interfaces

Enums can't be extended (you can't write `enum Sub extends Super`), and this is usually correct — an instance of an extended enum is not an instance of the base enum, which breaks fundamental enum properties.

However, **operation codes** (opcodes) are a use case where extensibility is desirable. The pattern: define an interface for the opcode type, and let the enum implement it.

```java
public interface Operation {
    double apply(double x, double y);
}

public enum BasicOperation implements Operation {
    PLUS("+")  { public double apply(double x, double y) { return x + y; } },
    MINUS("-") { public double apply(double x, double y) { return x - y; } },
    TIMES("*") { public double apply(double x, double y) { return x * y; } },
    DIVIDE("/"){ public double apply(double x, double y) { return x / y; } };

    private final String symbol;
    BasicOperation(String symbol) { this.symbol = symbol; }
    @Override public String toString() { return symbol; }
}

public enum ExtendedOperation implements Operation {
    EXP("^")  { public double apply(double x, double y) { return Math.pow(x, y); } },
    REMAINDER("%") { public double apply(double x, double y) { return x % y; } };

    private final String symbol;
    ExtendedOperation(String symbol) { this.symbol = symbol; }
    @Override public String toString() { return symbol; }
}
```

Client code can use `Operation` as the type and accept both `BasicOperation` and `ExtendedOperation`.

---

## Item 39: Prefer Annotations to Naming Patterns

Before annotations, frameworks used **naming patterns** to indicate special treatment. JUnit 3 required test method names to start with `test`. **Problems**: typos fail silently (`tsetSafetyOverride` is just ignored), no way to associate parameters, no way to restrict to specific program elements.

Annotations solve all of these:

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Test {
}

public class Sample {
    @Test public static void m1() { } // should pass
    @Test public static void m2() {   // should fail
        throw new RuntimeException("Boom");
    }
    public static void m3() { }       // not a test (no annotation)
}
```

The test runner uses reflection to find methods annotated with `@Test` and invokes them. Misspelling `@Tset` produces a **compile error** (unlike the naming pattern).

### Annotations with Parameters

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ExceptionTest {
    Class<? extends Throwable> value();
}

@ExceptionTest(ArithmeticException.class)
public static void m1() {
    int i = 1 / 0; // should pass — throws the expected exception
}
```

### Repeatable Annotations (Java 8+)

```java
@Repeatable(ExceptionTestContainer.class)
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ExceptionTest {
    Class<? extends Throwable> value();
}

@ExceptionTest(IndexOutOfBoundsException.class)
@ExceptionTest(NullPointerException.class)
public static void doublyBad() { ... }
```

---

## Item 40: Consistently Use the Override Annotation

Always use `@Override` on every method that overrides a superclass declaration or implements an interface method. The compiler will catch errors:

```java
public class Bigram {
    private final char first, second;

    // BUG: this OVERLOADS equals, not overrides (param is Bigram, not Object)
    public boolean equals(Bigram b) {
        return b.first == first && b.second == second;
    }

    // CORRECT — @Override catches the bug at compile time
    @Override public boolean equals(Object o) {
        if (!(o instanceof Bigram)) return false;
        Bigram b = (Bigram) o;
        return b.first == first && b.second == second;
    }
}
```

Without `@Override`, the `equals(Bigram)` method silently overloads instead of overriding — `HashMap` calls `Object.equals(Object)`, which is identity-based, so the `Bigram` class malfunctions in collections.

**Exception**: you don't need `@Override` on concrete class methods that implement abstract methods (the compiler will error if you don't implement them), but it's still good practice for documentation.

---

## Item 41: Use Marker Interfaces to Define Types

A **marker interface** is an interface with no methods that designates a class as having some property (e.g., `Serializable`, `Cloneable`).

### Marker Interface vs Marker Annotation

| Aspect | Marker Interface | Marker Annotation |
|--------|-----------------|-------------------|
| **Defines a type** | Yes — can be used in method signatures | No |
| **Compile-time checking** | Yes — `ObjectOutputStream.writeObject(Serializable)` catches errors at compile time | No — must wait for runtime |
| **Targeted to specific types** | Yes — can extend a specific interface to restrict which classes can be marked | Only via `@Target` (class/method/field level — can't restrict to specific supertypes) |
| **Usable beyond classes** | No — only on classes/interfaces | Yes — on methods, fields, packages, modules, etc. |
| **Part of a framework** | Awkward to add later | Natural — annotations can be added to an existing framework |

### When to Use Which

- **If the marker applies only to classes/interfaces and you might want to write methods that accept only objects with the marker**: use a marker interface (it defines a type)
- **If the marker can apply to any program element (methods, fields, etc.), or if the marker is part of a framework that uses annotations extensively**: use a marker annotation

`Serializable` should arguably have been a marker interface with compile-time enforcement, but `ObjectOutputStream.writeObject` accepts `Object` instead of `Serializable` — a missed opportunity for compile-time checking.
