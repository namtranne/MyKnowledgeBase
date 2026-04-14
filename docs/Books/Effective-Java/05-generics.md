# Chapter 5 — Generics

Generics were added in Java 5. Before generics, every cast from a collection was a potential `ClassCastException` at runtime. Generics move type checking from **runtime** to **compile time**, eliminating an entire class of bugs. This chapter tells you how to maximize the benefits and minimize the complications.

---

## Item 26: Don't Use Raw Types

A **raw type** is the name of a generic type used without any type parameters: `List` instead of `List<String>`.

### Why Raw Types Are Dangerous

```java
// Raw type — runtime error, no compile-time safety
Collection stamps = ...;
stamps.add(new Coin(...)); // compiles without error
Stamp s = (Stamp) stamps.get(0); // ClassCastException at runtime!

// Parameterized type — compile-time error (prevents the bug)
Collection<Stamp> stamps = ...;
stamps.add(new Coin(...)); // COMPILE ERROR: incompatible types
```

With raw types, the error surfaces at runtime — potentially far from the code that inserted the wrong element. With generics, the error is caught at compile time, with a precise error message pointing to the exact line.

### Raw Types vs Parameterized Types

| Type | Description | Example | Compile-time safe? |
|------|-------------|---------|-------------------|
| **Raw** | No type parameter | `List` | No |
| **Parameterized** | Concrete type parameter | `List<String>` | Yes |
| **Unbounded wildcard** | Unknown type parameter | `List<?>` | Yes (read-only — can't add elements except `null`) |

### When to Use Raw Types (Only Two Cases)

1. **Class literals**: `List.class` is legal; `List<String>.class` is not
2. **instanceof checks**: `o instanceof Set` is legal; `o instanceof Set<String>` is not (type erasure)

```java
// Legitimate use of raw type — instanceof check
if (o instanceof Set) {
    Set<?> s = (Set<?>) o; // immediately cast to wildcard type
}
```

### Key Terminology

| Term | Example |
|------|---------|
| Parameterized type | `List<String>` |
| Actual type parameter | `String` |
| Generic type | `List<E>` |
| Formal type parameter | `E` |
| Unbounded wildcard type | `List<?>` |
| Raw type | `List` |
| Bounded type parameter | `<E extends Number>` |
| Recursive type bound | `<T extends Comparable<T>>` |
| Bounded wildcard type | `List<? extends Number>` |
| Generic method | `static <E> List<E> asList(E[] a)` |
| Type token | `String.class` |

---

## Item 27: Eliminate Unchecked Warnings

When you use generics, the compiler may produce **unchecked warnings**: unchecked cast, unchecked method invocation, unchecked parameterized vararg type, unchecked conversion.

### Rules

1. **Eliminate every unchecked warning you can.** Each one represents a potential `ClassCastException` at runtime.

2. **If you can't eliminate a warning but can prove the code is type-safe**, suppress it with `@SuppressWarnings("unchecked")` — and **always use the narrowest possible scope**:

```java
// BAD — suppresses all warnings in the method
@SuppressWarnings("unchecked")
public <T> T[] toArray(T[] a) { ... }

// GOOD — suppresses only the specific warning
public <T> T[] toArray(T[] a) {
    if (a.length < size) {
        @SuppressWarnings("unchecked")
        T[] result = (T[]) Arrays.copyOf(elements, size, a.getClass());
        return result;
    }
    // ...
}
```

3. **Always add a comment explaining why the suppression is safe.** This helps future maintainers and reviewers.

---

## Item 28: Prefer Lists to Arrays

Arrays and generics have fundamentally different type systems:

### Arrays Are Covariant; Generics Are Invariant

| Property | Arrays | Generics |
|----------|--------|----------|
| **Variance** | Covariant: `String[]` is a subtype of `Object[]` | Invariant: `List<String>` is NOT a subtype of `List<Object>` |
| **Type enforcement** | Runtime (`ArrayStoreException`) | Compile time |
| **Reified?** | Yes — arrays know their element type at runtime | No — type erasure removes type info at runtime |

```java
// Arrays — fails at RUNTIME
Object[] objectArray = new Long[1];
objectArray[0] = "I don't fit"; // ArrayStoreException at runtime

// Generics — fails at COMPILE TIME (better!)
List<Object> ol = new ArrayList<Long>(); // compile error
ol.add("I don't fit");
```

### Why You Can't Create Generic Arrays

```java
// Hypothetical — if this were allowed:
List<String>[] stringLists = new List<String>[1]; // (1) compile error
List<Integer> intList = List.of(42);              // (2)
Object[] objects = stringLists;                    // (3) legal — arrays are covariant
objects[0] = intList;                              // (4) no ArrayStoreException — erasure
String s = stringLists[0].get(0);                  // (5) ClassCastException!
```

The compiler prevents this at step (1). The solution: use `List<List<String>>` instead of `List<String>[]`.

### Practical Impact

If you get generic array creation errors or unchecked cast warnings with arrays, replace the array with a `List`. You trade a small amount of performance and conciseness for type safety.

---

## Item 29: Favor Generic Types

Making your own classes generic is straightforward and makes them more useful:

```java
// Before: Object-based stack — requires casts by clients
public class Stack {
    private Object[] elements;
    public Object pop() { ... }
}

// After: Generic stack — type-safe, no casts needed
public class Stack<E> {
    private E[] elements;
    public E pop() { ... }
}
```

### The Generic Array Creation Problem

You can't write `new E[]` (Item 28). Two workarounds:

**Option 1 — Suppress the warning on the cast:**

```java
@SuppressWarnings("unchecked")
public Stack() {
    elements = (E[]) new Object[DEFAULT_INITIAL_CAPACITY];
}
```

**Option 2 — Change the field type to `Object[]` and cast on access:**

```java
private Object[] elements; // not E[]

public E pop() {
    @SuppressWarnings("unchecked")
    E result = (E) elements[--size];
    elements[size] = null;
    return result;
}
```

Option 1 is more common and readable. Option 2 is theoretically purer (no heap pollution) but requires a cast on every access.

### Bounded Type Parameters

```java
// Only allows types that are Comparable
public class DelayQueue<E extends Delayed> implements BlockingQueue<E> {
    // E is guaranteed to be Delayed — can call Delayed methods without casting
}
```

---

## Item 30: Favor Generic Methods

Static utility methods are good candidates for generification:

```java
// Before — raw types, unchecked warnings
public static Set union(Set s1, Set s2) { ... }

// After — generic method
public static <E> Set<E> union(Set<E> s1, Set<E> s2) {
    Set<E> result = new HashSet<>(s1);
    result.addAll(s2);
    return result;
}
```

### The Generic Singleton Factory Pattern

For immutable objects that need to work with many types:

```java
private static final UnaryOperator<Object> IDENTITY_FN = t -> t;

@SuppressWarnings("unchecked")
public static <T> UnaryOperator<T> identityFunction() {
    return (UnaryOperator<T>) IDENTITY_FN;
}
```

One object serves as the identity function for all types — safe because the function is stateless and doesn't modify its argument.

### Recursive Type Bounds

The most common use is with `Comparable`:

```java
// T must be comparable to itself
public static <E extends Comparable<E>> E max(Collection<E> c) {
    if (c.isEmpty()) throw new IllegalArgumentException("Empty collection");
    E result = null;
    for (E e : c)
        if (result == null || e.compareTo(result) > 0)
            result = Objects.requireNonNull(e);
    return result;
}
```

Read `<E extends Comparable<E>>` as "any type E that can be compared to other E's" — which is exactly what mutual comparability means.

---

## Item 31: Use Bounded Wildcards to Increase API Flexibility

Parameterized types are **invariant**: `List<String>` is not a subtype of `List<Object>`. But sometimes you need more flexibility.

### The PECS Rule — Producer Extends, Consumer Super

> **PECS**: If a parameterized type represents a **P**roducer of `T`, use `<? extends T>`. If it represents a **C**onsumer of `T`, use `<? super T>`.

```java
// Before — too restrictive
public void pushAll(Iterable<E> src) {
    for (E e : src) push(e);
}

// After — src is a PRODUCER of E
public void pushAll(Iterable<? extends E> src) {
    for (E e : src) push(e);
}
```

Without the wildcard, `Stack<Number>.pushAll(List<Integer>)` won't compile even though `Integer extends Number`.

```java
// dst is a CONSUMER of E
public void popAll(Collection<? super E> dst) {
    while (!isEmpty()) dst.add(pop());
}
```

Without `? super E`, `Stack<Number>.popAll(List<Object>)` won't compile.

### Applying PECS — Real Examples

```java
// Before
public static <E> Set<E> union(Set<E> s1, Set<E> s2);

// After (both are producers)
public static <E> Set<E> union(Set<? extends E> s1, Set<? extends E> s2);

// Now this works:
Set<Integer> integers = Set.of(1, 3, 5);
Set<Double> doubles = Set.of(2.0, 4.0, 6.0);
Set<Number> numbers = union(integers, doubles);
```

### Comparable and Comparator Are Always Consumers

```java
// Maximum flexibility
public static <T extends Comparable<? super T>> T max(List<? extends T> list);
```

- `List<? extends T>` — the list is a **producer** of T values
- `Comparable<? super T>` — the Comparable is a **consumer** of T values (it takes T and compares)

### Rule for Return Types

**Never use wildcard types in return types.** It would force callers to use wildcard types:

```java
// BAD — forces callers to deal with wildcards
public Set<? extends E> getElements();

// GOOD — clean return type
public Set<E> getElements();
```

### Interview Angle

**Q: Explain PECS with an example.**
A: PECS = Producer Extends, Consumer Super. If a method reads items from a collection (producer), use `<? extends T>` to accept subtypes. If a method puts items into a collection (consumer), use `<? super T>` to accept supertypes. Example: `Collections.copy(List<? super T> dest, List<? extends T> src)` — `src` produces T values, `dest` consumes them.

---

## Item 32: Combine Generics and Varargs Judiciously

Varargs and generics don't mix well. Varargs creates an array, and generic arrays are illegal (Item 28). Yet the Java language **allows** generic varargs parameters — it produces a warning rather than an error because the prohibition would be too restrictive (methods like `Arrays.asList(T...)`, `Collections.addAll(Collection<? super T>, T...)`, and `EnumSet.of(E, E...)` are too useful).

### Heap Pollution

```java
// DANGEROUS — heap pollution
static void dangerous(List<String>... stringLists) {
    List<Integer> intList = List.of(42);
    Object[] objects = stringLists; // legal: varargs array is an Object[]
    objects[0] = intList;           // heap pollution
    String s = stringLists[0].get(0); // ClassCastException
}
```

### @SafeVarargs

Use `@SafeVarargs` on every method with a varargs parameter of a generic or parameterized type, **if the method is safe**. A generic varargs method is safe if:

1. It doesn't store anything into the varargs array
2. It doesn't expose the array (or a clone) to untrusted code

```java
@SafeVarargs
static <T> List<T> flatten(List<? extends T>... lists) {
    List<T> result = new ArrayList<>();
    for (List<? extends T> list : lists)
        result.addAll(list);
    return result;
}
```

**Alternative**: use a `List` parameter instead of varargs to avoid the problem entirely:

```java
static <T> List<T> flatten(List<List<? extends T>> lists) { ... }
```

---

## Item 33: Consider Typesafe Heterogeneous Containers

Normal generic containers limit you to a fixed number of type parameters (`Map<K, V>`, `Set<E>`). But sometimes you need a container that can hold values of **many different types** in a type-safe way.

### The Pattern — Type Token as Key

```java
public class Favorites {
    private Map<Class<?>, Object> favorites = new HashMap<>();

    public <T> void putFavorite(Class<T> type, T instance) {
        favorites.put(Objects.requireNonNull(type), instance);
    }

    public <T> T getFavorite(Class<T> type) {
        return type.cast(favorites.get(type));
    }
}

// Usage
Favorites f = new Favorites();
f.putFavorite(String.class, "Java");
f.putFavorite(Integer.class, 42);
f.putFavorite(Class.class, Favorites.class);

String favoriteString = f.getFavorite(String.class); // "Java"
Integer favoriteInteger = f.getFavorite(Integer.class); // 42
```

The key insight: `Class<T>` is the type token. The map key is `Class<?>` (wildcard — allows different Class objects as keys). The map value is `Object` (breaks the type link), but `getFavorite` restores it via `Class.cast()`.

### Limitations

1. **No generic type tokens**: you can't use `List<String>.class` — erasure prevents it. `List<String>` and `List<Integer>` share the same `Class` object at runtime. (There are workarounds using "super type tokens" but they're complex.)

2. **Can be corrupted by raw types**: a client passing `(Class) Integer.class` can bypass type safety. Defend with `type.cast(instance)` in `putFavorite`.

### Real-World Usage

This pattern is used in annotation APIs (`AnnotatedElement.getAnnotation(Class<T>)`), `ServiceLoader`, and dependency injection frameworks (Guice's `TypeLiteral`, Spring's `ResolvableType`).
