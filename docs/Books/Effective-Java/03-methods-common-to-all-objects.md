# Chapter 3 — Methods Common to All Objects

`Object` is a concrete class designed for extension. All of its non-final methods (`equals`, `hashCode`, `toString`, `clone`, `finalize`) have **general contracts** that govern how they must behave. Any class that overrides them must obey these contracts — violating them causes `HashMap`, `HashSet`, `TreeSet`, and other contract-dependent classes to malfunction silently.

---

## Item 10: Obey the General Contract When Overriding equals

The simplest correct approach is **not to override `equals`**. This is the right choice when:

- Each instance is inherently unique (e.g., `Thread`)
- The class doesn't need a "logical equality" test (e.g., `java.util.regex.Pattern`)
- A superclass `equals` already does the right thing (e.g., `AbstractList` for `ArrayList`)
- The class is private/package-private and `equals` will never be called

**Override `equals` when**: a class has a notion of **logical equality** that differs from object identity, and the superclass hasn't already overridden it. This is typically the case for **value classes** (e.g., `Integer`, `String`, `Date`).

### The equals Contract (from `Object.equals` javadoc)

| Property | Requirement |
|----------|------------|
| **Reflexive** | `x.equals(x)` must return `true` |
| **Symmetric** | `x.equals(y)` ⟺ `y.equals(x)` |
| **Transitive** | `x.equals(y)` ∧ `y.equals(z)` → `x.equals(z)` |
| **Consistent** | Multiple invocations return the same result (if objects unchanged) |
| **Non-null** | `x.equals(null)` must return `false` |

### Symmetry Violation — A Subtle Trap

```java
public final class CaseInsensitiveString {
    private final String s;

    @Override
    public boolean equals(Object o) {
        if (o instanceof CaseInsensitiveString)
            return s.equalsIgnoreCase(((CaseInsensitiveString) o).s);
        if (o instanceof String) // BAD — String doesn't know about us
            return s.equalsIgnoreCase((String) o);
        return false;
    }
}
```

`cis.equals("Polish")` returns `true`, but `"Polish".equals(cis)` returns `false` — **symmetry violated**. Fix: don't try to interoperate with `String`.

### Transitivity — The Fundamental Problem with equals and Inheritance

**There is no way to extend an instantiable class and add a value component while preserving the equals contract.** This is a fundamental limitation of object-oriented languages.

```java
public class Point {
    private final int x, y;
    // equals checks x and y
}

public class ColorPoint extends Point {
    private final Color color;
    // How to implement equals?
}
```

- If `ColorPoint.equals` ignores color when comparing with `Point` → symmetry works but transitivity breaks
- If `ColorPoint.equals` returns `false` for non-ColorPoint → symmetry breaks
- The Liskov substitution principle says we can't use `getClass()` instead of `instanceof` either

**Solution**: favor composition over inheritance (Item 18). Make `ColorPoint` contain a `Point` field rather than extending it.

### Recipe for a High-Quality equals Method

1. **Use `==` to check for self-reference** (performance optimization)
2. **Use `instanceof` to check the argument type** (also handles `null` check)
3. **Cast the argument** to the correct type
4. **Check each "significant" field** for equality
5. **Verify symmetry, transitivity, and consistency** with tests

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof PhoneNumber)) return false;
    PhoneNumber pn = (PhoneNumber) o;
    return pn.lineNum == lineNum
        && pn.prefix == prefix
        && pn.areaCode == areaCode;
}
```

### Field Comparison Performance

| Field Type | Comparison | Notes |
|-----------|-----------|-------|
| Primitive (not `float`/`double`) | `==` | Fastest |
| `float` | `Float.compare(f1, f2)` | Handles `NaN` and `-0.0` |
| `double` | `Double.compare(d1, d2)` | Handles `NaN` and `-0.0` |
| Object reference | `.equals()` with null guard | `Objects.equals(a, b)` handles nulls |
| Array | `Arrays.equals()` | Element-wise comparison |

**Performance tip**: compare fields most likely to differ first, and cheapest-to-compare first. Don't compare derived fields if they're computed from other fields you've already compared.

---

## Item 11: Always Override hashCode When You Override equals

**You must override `hashCode` in every class that overrides `equals`.** Failure to do so breaks the contract for hash-based collections (`HashMap`, `HashSet`, `Hashtable`).

### The hashCode Contract

| Rule | Consequence of Violation |
|------|------------------------|
| If `a.equals(b)`, then `a.hashCode() == b.hashCode()` | **Equal objects MUST have equal hash codes.** Without this, `HashMap.get()` looks in the wrong bucket. |
| If `!a.equals(b)`, hash codes **should** differ | Unequal objects having the same hash code is legal but kills performance — everything chains in one bucket → O(n) lookup |
| `hashCode()` must return the same value on repeated calls (if object unchanged) | Consistency during lifetime |

### What Happens When You Forget

```java
Map<PhoneNumber, String> m = new HashMap<>();
m.put(new PhoneNumber(707, 867, 5309), "Jenny");
m.get(new PhoneNumber(707, 867, 5309)); // returns null!
```

The two `PhoneNumber` instances are `equals`, but have different hash codes (default `Object.hashCode()` is based on memory address). The `get` looks in a different hash bucket than where `put` stored it.

### Recipe for a Good hashCode

```java
@Override
public int hashCode() {
    int result = Short.hashCode(areaCode);
    result = 31 * result + Short.hashCode(prefix);
    result = 31 * result + Short.hashCode(lineNum);
    return result;
}
```

**Why 31?** It's an odd prime. `31 * i` can be optimized by the JVM to `(i << 5) - i` (shift and subtract — faster than multiply).

### One-Line Alternative (Slightly Slower)

```java
@Override
public int hashCode() {
    return Objects.hash(lineNum, prefix, areaCode);
}
```

This creates an array and auto-boxes primitives — adequate for most use, but not for performance-critical classes.

### Lazy Initialization with Caching (for Immutable Classes)

```java
private int hashCode; // automatically initialized to 0

@Override
public int hashCode() {
    int result = hashCode;
    if (result == 0) {
        result = Short.hashCode(areaCode);
        result = 31 * result + Short.hashCode(prefix);
        result = 31 * result + Short.hashCode(lineNum);
        hashCode = result;
    }
    return result;
}
```

### Interview Angle

**Q: What happens if you override equals but not hashCode?**
A: Hash-based collections (HashMap, HashSet) break. Two equal objects may hash to different buckets, so `map.get(key)` fails to find entries stored with an equal key. This violates the hashCode contract: equal objects must have equal hash codes.

---

## Item 12: Always Override toString

`Object.toString()` returns `ClassName@hexHashCode` (e.g., `PhoneNumber@163b91`). This is useless for debugging.

### Why Override toString

- **Debugging**: printed in assertions, error messages, debugger displays, logging
- **Collections**: when a collection prints its elements, it calls `toString()` on each
- **Logging**: every `log.info("User: " + user)` calls `toString()`

### Best Practices

| Practice | Rationale |
|----------|-----------|
| **Include all interesting information** | `PhoneNumber` should show `(707) 867-5309`, not just `PhoneNumber@163b91` |
| **Document the format (or explicitly say it's unspecified)** | If you specify a format, provide a matching static factory or constructor for parsing |
| **Provide programmatic access to all fields in toString** | Otherwise, developers will parse the string representation — brittle |

```java
// Good toString — all significant data, readable format
@Override
public String toString() {
    return String.format("(%03d) %03d-%04d", areaCode, prefix, lineNum);
}
```

**Don't bother** for static utility classes, most enums (the default is the constant name, which is usually fine), or classes where the superclass already provides a good `toString`.

---

## Item 13: Override clone Judiciously

The `Cloneable` interface and `Object.clone()` mechanism is deeply broken. `Cloneable` has no methods — it modifies the behavior of `Object.clone()`, which is a **protected native method**. If a class implements `Cloneable`, `Object.clone()` returns a field-by-field copy; otherwise, it throws `CloneNotSupportedException`. This is an **extralinguistic mechanism** — it creates objects without calling a constructor.

### Problems with clone

| Problem | Description |
|---------|-------------|
| **No constructor call** | clone bypasses constructors, which violates fundamental OO principles |
| **Covariant return types required** | `clone()` must return the actual type, not `Object` |
| **Mutable field sharing** | Shallow copy shares internal arrays/objects — mutations on the clone affect the original |
| **Final fields conflict** | `clone()` can't assign to `final` fields — fundamentally incompatible with immutable field design |
| **Exception handling** | `CloneNotSupportedException` is checked but almost never thrown — pure boilerplate |

### If You Must Implement clone

For a class with only primitive fields or references to immutable objects:

```java
@Override
public PhoneNumber clone() {
    try {
        return (PhoneNumber) super.clone();
    } catch (CloneNotSupportedException e) {
        throw new AssertionError(); // can't happen
    }
}
```

For a class with mutable fields (e.g., an array-backed Stack):

```java
@Override
public Stack clone() {
    try {
        Stack result = (Stack) super.clone();
        result.elements = elements.clone(); // deep copy mutable internals
        return result;
    } catch (CloneNotSupportedException e) {
        throw new AssertionError();
    }
}
```

### Better Alternatives

**Copy constructor** or **copy factory method** — cleaner, safer, more flexible:

```java
// Copy constructor
public Yum(Yum yum) { ... }

// Copy factory
public static Yum newInstance(Yum yum) { ... }
```

Advantages over `clone`: uses a constructor (no extralinguistic magic), can accept an interface type (`Collection`, `Map`), doesn't throw checked exceptions, doesn't conflict with `final` fields.

**Recommendation**: don't implement `Cloneable` in new code. Use copy constructors or copy factories instead. The only exception is arrays — `array.clone()` is the cleanest way to copy an array.

---

## Item 14: Consider Implementing Comparable

`Comparable` establishes a **natural ordering** for a class. Implementing it enables interoperability with `TreeSet`, `TreeMap`, `Collections.sort()`, `Arrays.sort()`, and the `sorted()` stream operation.

### The compareTo Contract

Similar to `equals`, with ordering semantics:

| Property | Requirement |
|----------|------------|
| **Antisymmetric** | `sgn(x.compareTo(y)) == -sgn(y.compareTo(x))` |
| **Transitive** | `x.compareTo(y) > 0` ∧ `y.compareTo(z) > 0` → `x.compareTo(z) > 0` |
| **Consistent with equals** | `x.compareTo(y) == 0` implies `x.equals(y)` (strongly recommended) |

**Violation consequence**: `BigDecimal` violates consistency with equals. `new BigDecimal("1.0")` and `new BigDecimal("1.00")` are unequal via `equals` but compare as equal via `compareTo`. A `HashSet` contains both; a `TreeSet` contains only one.

### Modern compareTo — Using Comparator Construction Methods (Java 8+)

```java
private static final Comparator<PhoneNumber> COMPARATOR =
    comparingInt((PhoneNumber pn) -> pn.areaCode)
        .thenComparingInt(pn -> pn.prefix)
        .thenComparingInt(pn -> pn.lineNum);

@Override
public int compareTo(PhoneNumber pn) {
    return COMPARATOR.compare(this, pn);
}
```

### Never Use Subtraction for compareTo

```java
// BROKEN — integer overflow risk
static Comparator<Object> hashCodeOrder = (o1, o2) -> o1.hashCode() - o2.hashCode();

// CORRECT — use static compare methods
static Comparator<Object> hashCodeOrder = (o1, o2) -> Integer.compare(o1.hashCode(), o2.hashCode());

// ALSO CORRECT — use comparator construction methods
static Comparator<Object> hashCodeOrder = Comparator.comparingInt(Object::hashCode);
```

### Interview Angle

**Q: What's the difference between Comparable and Comparator?**
A: `Comparable<T>` defines the **natural ordering** of a class (one per class, implemented by the class itself). `Comparator<T>` defines **external orderings** (many possible, created independently of the class). Use `Comparable` for the obvious/default ordering, `Comparator` for alternative orderings.
