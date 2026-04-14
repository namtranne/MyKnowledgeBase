# Chapter 4 — Classes and Interfaces

Classes and interfaces are the heart of Java. This chapter contains guidelines for designing classes and interfaces that are usable, robust, and flexible.

---

## Item 15: Minimize the Accessibility of Classes and Members

**Information hiding** (encapsulation) is the single most important factor distinguishing a well-designed component from a poorly designed one.

### Why Encapsulation Matters

- **Decouples components**: develop, test, optimize, understand, and modify in isolation
- **Enables parallel development**: teams work on different components independently
- **Reduces risk of large system failure**: bugs are localized to individual components
- **Enables performance tuning**: profiling reveals bottleneck components that can be optimized without affecting others

### Rule of Thumb

**Make each class or member as inaccessible as possible.** Use the lowest access level consistent with proper functioning.

### Access Levels (from most to least restrictive)

| Modifier | Class/Interface | Member |
|----------|----------------|--------|
| **private** | N/A (top-level) | Accessible only from the declaring class |
| **package-private** (default) | Accessible only within its package | Accessible only within its package |
| **protected** | N/A (top-level) | Package-private + accessible from subclasses |
| **public** | Accessible from everywhere | Accessible from everywhere |

### Key Rules

1. **Top-level classes/interfaces**: use package-private unless they're part of the public API. Package-private = implementation detail that can change freely.

2. **If a package-private class is used by only one class**: consider making it a private static nested class of that one class — reduces exposure even further.

3. **Instance fields should never be public** (Item 16). A public mutable field gives up control over invariants. Even `public final` fields for mutable objects (arrays, collections) are dangerous:

```java
// SECURITY HOLE — anyone can modify the array contents
public static final Thing[] VALUES = { ... };

// Fix 1: Unmodifiable list
public static final List<Thing> VALUES =
    Collections.unmodifiableList(Arrays.asList(PRIVATE_VALUES));

// Fix 2: Defensive copy
public static Thing[] values() {
    return PRIVATE_VALUES.clone();
}
```

4. **Module system (Java 9+)**: modules introduce two additional access levels. A public member in an unexported package is effectively inaccessible outside the module. However, the module system is advisory — the `--add-opens` flag bypasses it at runtime.

---

## Item 16: In Public Classes, Use Accessor Methods, Not Public Fields

```java
// BAD — public fields, no encapsulation
class Point {
    public double x;
    public double y;
}

// GOOD — accessors preserve flexibility
class Point {
    private double x;
    private double y;

    public double getX() { return x; }
    public double getY() { return y; }
    public void setX(double x) { this.x = x; }
    public void setY(double y) { this.y = y; }
}
```

**Why accessors matter for public classes**: you retain the ability to change the internal representation (e.g., switch from Cartesian to polar coordinates) without breaking clients. You can add validation, synchronization, or lazy computation.

**Exception**: for **package-private or private nested classes**, exposing fields directly is fine — the exposure is limited to the class/package scope, and direct field access is simpler.

### Real-World Violations

`java.awt.Point` and `java.awt.Dimension` have public fields — a permanent API mistake that has caused ongoing performance problems because defensive copies must be made everywhere.

---

## Item 17: Minimize Mutability

An **immutable class** is one whose instances cannot be modified after creation. All information is fixed for the lifetime of the object. Examples: `String`, `BigInteger`, `BigDecimal`, boxed primitives.

### Five Rules for Immutability

1. **Don't provide mutators** (no setters, no methods that modify state)
2. **Ensure the class can't be extended** (make it `final`, or use private constructors with static factories)
3. **Make all fields `final`** (enforced by compiler, expresses intent)
4. **Make all fields `private`** (prevents clients from accessing mutable internals)
5. **Ensure exclusive access to any mutable components** (make defensive copies in constructors, accessors, and `readObject`)

### Why Immutable Classes Are Superior

| Property | Benefit |
|----------|---------|
| **Simple** | An immutable object is always in exactly one state — the state it was created in |
| **Thread-safe** | No synchronization needed — can be shared freely across threads |
| **Can be shared freely** | Encourage reuse — no defensive copying needed |
| **Make great Map keys and Set elements** | Their hash codes never change |
| **Provide failure atomicity for free** | If an operation fails, the object remains in its original state (it can't be in any other) |
| **Internals can be shared** | `BigInteger.negate()` shares the internal magnitude array — safe because it's immutable |

### Functional Approach — Return New Instances

```java
public final class Complex {
    private final double re;
    private final double im;

    // Returns a NEW Complex — doesn't modify this instance
    public Complex plus(Complex c) {
        return new Complex(re + c.re, im + c.im);
    }

    public Complex minus(Complex c) {
        return new Complex(re - c.re, im - c.im);
    }
}
```

Notice: method names are prepositions (`plus`, `minus`) not verbs (`add`, `subtract`) — this signals they don't modify the receiver.

### The Performance Objection

**"Immutable objects create too many objects"** — this is usually wrong:

1. Modern GCs are optimized for short-lived objects
2. Immutable objects enable sharing and caching (e.g., `BigInteger` caches small values)
3. For multi-step operations, provide a **mutable companion class**: `StringBuilder` is the mutable companion for `String`, `BitSet` for hypothetical immutable bit sets

### Making a Class Effectively Immutable

If `final` is too restrictive, make constructors private and provide static factory methods:

```java
public class Complex {
    private final double re;
    private final double im;

    private Complex(double re, double im) {
        this.re = re;
        this.im = im;
    }

    public static Complex valueOf(double re, double im) {
        return new Complex(re, im);
    }
}
```

This allows future caching, subclassing within the package, and different internal representations.

### Interview Angle

**Q: Why are immutable objects preferred in concurrent programming?**
A: Immutable objects are inherently thread-safe — no synchronization is needed because their state can't change after construction. They can be freely shared across threads without defensive copying. They also make excellent Map keys because their hashCode never changes.

---

## Item 18: Favor Composition over Inheritance

**Implementation inheritance** (extending a class) violates encapsulation — a subclass depends on implementation details of its superclass. If the superclass changes its implementation in a new release, the subclass may break even though its code hasn't been touched.

### The Classic Problem — InstrumentedHashSet

```java
// BROKEN — inheritance misuse
public class InstrumentedHashSet<E> extends HashSet<E> {
    private int addCount = 0;

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);
    }

    public int getAddCount() { return addCount; }
}
```

`addAll(Arrays.asList("a", "b", "c"))` returns `addCount = 6`, not 3. Why? `HashSet.addAll()` internally calls `add()` for each element — so `addCount` is incremented by `addAll` and again by each `add`. This is an implementation detail that could change in any release.

### The Fix — Composition + Forwarding (Decorator Pattern)

```java
// Reusable forwarding class
public class ForwardingSet<E> implements Set<E> {
    private final Set<E> s;
    public ForwardingSet(Set<E> s) { this.s = s; }

    public boolean add(E e)           { return s.add(e); }
    public boolean addAll(Collection<? extends E> c) { return s.addAll(c); }
    // ... forward all other Set methods ...
}

// Wrapper class — uses composition
public class InstrumentedSet<E> extends ForwardingSet<E> {
    private int addCount = 0;

    public InstrumentedSet(Set<E> s) { super(s); }

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);
    }

    public int getAddCount() { return addCount; }
}
```

Now `InstrumentedSet` wraps any `Set` implementation. `addAll` calls the wrapped set's `addAll` — which may or may not call `add` — it doesn't matter because our `addAll` doesn't also call our `add`.

### When to Use Inheritance

Only use inheritance when the subclass truly **"is-a"** superclass. Ask: "Is every B really an A?" If the answer is anything other than an unqualified yes, use composition.

**Violations in the JDK**: `Stack extends Vector` (a stack is NOT a vector) and `Properties extends Hashtable` (a properties object is NOT a hashtable). These are permanent API mistakes.

---

## Item 19: Design and Document for Inheritance or Else Prohibit It

If you decide to allow inheritance, you must:

1. **Document self-use patterns**: which overridable methods call which other overridable methods, in what sequence, and how the results affect subsequent processing. Use `@implSpec` tags.

2. **Provide hooks for subclasses**: judiciously chosen `protected` methods that give subclasses access to internal workings (e.g., `AbstractList.removeRange()`).

3. **Test by writing subclasses**: the only way to verify that a class is suitable for inheritance is to write subclasses. Three subclasses is usually enough — at least one by someone outside your organization.

4. **Constructors must not invoke overridable methods**: the superclass constructor runs before the subclass constructor. If the superclass constructor calls an overridable method, the subclass override runs before the subclass constructor has completed — potential access to uninitialized fields.

```java
public class Super {
    public Super() { overrideMe(); } // DANGEROUS
    public void overrideMe() { }
}

public class Sub extends Super {
    private final Instant instant;
    Sub() { instant = Instant.now(); }

    @Override
    public void overrideMe() {
        System.out.println(instant); // prints null! Superclass constructor runs first
    }
}
```

**If you don't design for inheritance, prohibit it**: make the class `final`, or make all constructors private/package-private and provide static factory methods.

---

## Item 20: Prefer Interfaces to Abstract Classes

Java provides two mechanisms for defining types with multiple implementations: **interfaces** and **abstract classes**. Since Java 8, both can have default methods.

### Why Interfaces Are Usually Better

| Advantage | Explanation |
|-----------|-------------|
| **Existing classes can implement new interfaces** | `Comparable`, `Iterable`, `AutoCloseable` were added to existing classes retroactively. You can't retrofit abstract classes the same way — Java has single inheritance. |
| **Ideal for mixins** | A "mixin" is a type that a class implements in addition to its primary type, declaring additional behavior. `Comparable` is a mixin. Abstract classes can't be mixins (single inheritance). |
| **Enable non-hierarchical type frameworks** | A singer who is also a songwriter: `interface SingerSongwriter extends Singer, Songwriter`. With abstract classes, you'd need a combinatorial explosion of classes. |
| **Enable safe, powerful functionality additions via wrapper classes** | Item 18's decorator/wrapper pattern relies on interfaces. |

### Skeletal Implementation Pattern (Template Method via Interfaces)

Combine interfaces with abstract skeletal implementation classes:

```
Interface:                     Defines the type (e.g., Collection, List, Map)
Skeletal implementation:       AbstractCollection, AbstractList, AbstractMap
Concrete implementation:       ArrayList, LinkedList, HashMap
```

The skeletal implementation provides default method implementations that concrete classes can use, override, or ignore. This gives the power of abstract classes while preserving the flexibility of interfaces.

```java
// Skeletal implementation in action
static List<Integer> intArrayAsList(int[] a) {
    Objects.requireNonNull(a);
    return new AbstractList<Integer>() {
        @Override public Integer get(int i) { return a[i]; }
        @Override public Integer set(int i, Integer val) {
            int oldVal = a[i];
            a[i] = val;
            return oldVal;
        }
        @Override public int size() { return a.length; }
    };
}
```

### Default Methods (Java 8+)

Interfaces can now provide default implementations. Restrictions:
- Cannot provide defaults for `Object` methods (`equals`, `hashCode`, `toString`)
- Cannot contain instance fields or non-public static members

---

## Item 21: Design Interfaces for Posterity

Before Java 8, adding a method to an interface broke all existing implementations. **Default methods** solved this, but they're not risk-free.

**Real-world breakage**: `Collection.removeIf()` was added as a default method in Java 8. Apache Commons' `SynchronizedCollection` didn't override it — so `removeIf()` bypassed the synchronization wrapper, causing **thread-safety violations** in production code.

**Lesson**: it's impossible to write a default method that maintains all invariants of every conceivable implementation. Design interfaces carefully from the start. Use default methods to evolve interfaces, but don't rely on them to add fundamental behavior to existing interfaces without extensive testing.

---

## Item 22: Use Interfaces Only to Define Types

An interface should say something about what a client can **do** with instances of the class. Using interfaces for any other purpose is inappropriate.

### The Constant Interface Anti-Pattern

```java
// ANTI-PATTERN — do not use
public interface PhysicalConstants {
    double AVOGADROS_NUMBER = 6.022_140_857e23;
    double BOLTZMANN_CONSTANT = 1.380_648_52e-23;
}
```

**Problems**: pollutes implementing classes' API with constants, creates a commitment to the constants in binary compatibility. If a class no longer needs the constants, it still must implement the interface.

**Alternatives**: put constants in a relevant class (`Integer.MIN_VALUE`), use an enum, or use a non-instantiable utility class with `static import`.

---

## Item 23: Prefer Class Hierarchies to Tagged Classes

A **tagged class** uses a field (the "tag") to indicate the flavor of the instance:

```java
// ANTI-PATTERN — tagged class
class Figure {
    enum Shape { RECTANGLE, CIRCLE }
    final Shape shape; // tag field

    // Fields for RECTANGLE
    double length, width;
    // Fields for CIRCLE
    double radius;

    double area() {
        switch (shape) {
            case RECTANGLE: return length * width;
            case CIRCLE: return Math.PI * radius * radius;
            default: throw new AssertionError(shape);
        }
    }
}
```

**Problems**: boilerplate, memory waste (unused fields for each flavor), error-prone (forget a case in switch), violates SRP.

**Solution**: class hierarchy with an abstract base:

```java
abstract class Figure {
    abstract double area();
}

class Rectangle extends Figure {
    final double length, width;
    Rectangle(double length, double width) { this.length = length; this.width = width; }
    @Override double area() { return length * width; }
}

class Circle extends Figure {
    final double radius;
    Circle(double radius) { this.radius = radius; }
    @Override double area() { return Math.PI * radius * radius; }
}
```

---

## Item 24: Favor Static Member Classes over Nonstatic

A **nested class** should exist only to serve its enclosing class. Four kinds:

| Kind | Has reference to enclosing instance? | Use Case |
|------|--------------------------------------|----------|
| **Static member class** | No | Helper class that doesn't need access to enclosing instance (e.g., `Map.Entry`) |
| **Nonstatic member class** | Yes (implicit, hidden) | Adapter that provides a view of the outer class (e.g., `Map.keySet()`, `Set.iterator()`) |
| **Anonymous class** | Depends on context | Short, one-time-use implementations (largely superseded by lambdas) |
| **Local class** | Depends on context | Rarely used — declared inside a method body |

**Key rule**: if a member class doesn't need access to the enclosing instance, **always make it `static`**. Nonstatic member classes hold a hidden reference to the enclosing instance, which:
- Consumes extra memory
- Prevents the enclosing instance from being garbage-collected
- Can cause **subtle memory leaks** (common in Android development)

---

## Item 25: Limit Source Files to a Single Top-Level Class

Never put multiple top-level classes in a single source file. Java allows it, but the behavior depends on **the order in which source files are passed to the compiler** — which is unpredictable and can cause classes to be silently redefined.

**Fix**: one top-level class per source file. If helper classes are tightly coupled, use static member classes (Item 24).
