# Chapter 12 — Serialization

This chapter concerns the Java-specific **object serialization** API (`java.io.Serializable`, `ObjectOutputStream`, `ObjectInputStream`). Serialization translates an object's in-memory representation into a byte stream and back. While powerful, it is **one of the most dangerous features in Java** — responsible for remote code execution vulnerabilities, denial-of-service attacks, and countless maintenance headaches.

---

## Item 85: Prefer Alternatives to Java Serialization

**Java serialization is dangerous and should be avoided.** The fundamental problem: deserialization is effectively a **hidden constructor** that can instantiate any `Serializable` class on the classpath, invoking its code — even if that code was never intended to be invoked by untrusted input.

### The Attack Surface

Any class that implements `Serializable` is part of the attack surface. An attacker who controls the byte stream can:

- **Instantiate any serializable class** on the classpath
- **Invoke gadget chains** — sequences of method invocations triggered during deserialization that lead to arbitrary code execution
- **Cause denial of service** — construct deeply nested or circular object graphs that consume unbounded memory or CPU

### Deserialization Bomb — DoS Example

```java
// This 200-byte stream takes over 100 years of CPU to deserialize
static byte[] bomb() {
    Set<Object> root = new HashSet<>();
    Set<Object> s1 = root;
    Set<Object> s2 = new HashSet<>();
    for (int i = 0; i < 100; i++) {
        Set<Object> t1 = new HashSet<>();
        Set<Object> t2 = new HashSet<>();
        t1.add("foo");
        s1.add(t1); s1.add(t2);
        s2.add(t1); s2.add(t2);
        s1 = t1; s2 = t2;
    }
    return serialize(root);
}
```

The `HashSet` deserialization must compute hash codes. The sharing structure creates 2^100 `hashCode` computations — the stream is tiny but deserialization is astronomically expensive.

### The Solution — Use Cross-Platform Structured-Data Representations

| Format | Strengths | Weaknesses |
|--------|-----------|------------|
| **JSON** | Human-readable, universal, language-independent, excellent tooling | Text-based (larger), no schema enforcement built-in |
| **Protocol Buffers (protobuf)** | Binary (compact, fast), strongly typed schema, backward/forward compatible, code generation | Not human-readable, requires `.proto` schema files |
| **Avro** | Schema evolution, compact binary, good for Hadoop/Kafka | Less widespread outside data engineering |
| **MessagePack** | Binary JSON — compact, fast | Less tooling than JSON or protobuf |

**If you must use Java serialization** (legacy systems), never deserialize untrusted data. Use **deserialization filters** (`ObjectInputFilter`, Java 9+) to whitelist allowed classes.

### Interview Angle

**Q: Why is Java serialization considered dangerous?**
A: Deserialization acts as a hidden constructor that can instantiate any `Serializable` class on the classpath. An attacker controlling the byte stream can trigger gadget chains for remote code execution, or construct deserialization bombs for denial of service. Modern alternatives (JSON, protobuf) are safer because they don't execute arbitrary code during parsing.

---

## Item 86: Implement Serializable with Great Caution

Implementing `Serializable` has significant, long-term costs that are often underestimated.

### Costs of Implementing Serializable

| Cost | Explanation |
|------|-------------|
| **Reduced flexibility to change the class** | The serialized form becomes part of the public API. Private fields and internal structure are frozen — changing them breaks compatibility with existing serialized instances. |
| **Increased bug and security risk** | Deserialization is a hidden constructor that bypasses normal invariant checking. An attacker can craft byte streams that create objects violating class invariants. |
| **Increased testing burden** | Every new release must be tested for serialization compatibility with all previous versions. |
| **Inheritance complications** | If a class is designed for inheritance (Item 19) and is `Serializable`, subclasses are forced into serialization. The superclass must provide accessible no-arg constructor or implement custom serialization. |

### When to Implement Serializable

- **Value classes** designed for frameworks that require it (JPA entities, RMI parameters)
- **Classes designed for inheritance** should **rarely** implement `Serializable` — it imposes an unreasonable burden on subclass implementors
- **Inner classes** should **never** implement `Serializable` (their synthetic fields make the serialized form undefined)
- **Static member classes** can implement `Serializable`

### Protecting Invariants During Deserialization

If you must implement `Serializable`, provide a `readObject` method that validates invariants:

```java
private void readObject(ObjectInputStream s) throws IOException, ClassNotFoundException {
    s.defaultReadObject();
    // Validate invariants
    if (start.compareTo(end) > 0)
        throw new InvalidObjectException(start + " after " + end);
}
```

---

## Item 87: Consider Using a Custom Serialized Form

The **default serialized form** encodes every reachable field — including implementation details that should never be part of the API.

### When the Default Form Is Acceptable

The default form is reasonable when the **physical representation** (how data is stored in fields) is identical to the **logical content** (what the data means):

```java
// Good candidate for default serialized form
// Physical representation = logical content
public class Name implements Serializable {
    private final String lastName;
    private final String firstName;
    private final String middleName; // may be null
}
```

### When the Default Form Is Terrible

```java
// TERRIBLE default serialized form — exposes internal linked list structure
public final class StringList implements Serializable {
    private int size = 0;
    private Entry head = null;

    private static class Entry implements Serializable {
        String data;
        Entry next;
        Entry previous;
    }
}
```

**Problems with the default form here**:

| Problem | Consequence |
|---------|-------------|
| **Permanently ties API to internal representation** | Can never switch from linked list to array list |
| **Excessive space** | Serializes every link — doubles the size |
| **Excessive time** | Must traverse the entire graph |
| **Stack overflow risk** | Recursive traversal of long lists overflows the stack |

### Custom Serialized Form

```java
public final class StringList implements Serializable {
    private transient int size = 0;
    private transient Entry head = null;

    // Logical representation — just the strings and count
    private void writeObject(ObjectOutputStream s) throws IOException {
        s.defaultWriteObject();
        s.writeInt(size);
        for (Entry e = head; e != null; e = e.next)
            s.writeObject(e.data);
    }

    private void readObject(ObjectInputStream s) throws IOException, ClassNotFoundException {
        s.defaultReadObject();
        int numElements = s.readInt();
        for (int i = 0; i < numElements; i++)
            add((String) s.readObject());
    }
    // ...
}
```

### transient — Excluding Fields from Serialization

Mark fields `transient` if they can be computed from other fields, or if they represent implementation details:

```java
private transient long cachedHashCode; // derived — don't serialize
private transient Thread workerThread; // not serializable
```

**Rule**: if you're using a custom serialized form, mark **every** field that isn't part of the logical state as `transient`.

### serialVersionUID

Always declare an explicit `serialVersionUID`:

```java
private static final long serialVersionUID = 1L; // pick any long value
```

Without it, the runtime generates one based on the class structure — changing anything in the class changes the UID, breaking deserialization of old instances. With an explicit UID, you control compatibility.

---

## Item 88: Write readObject Methods Defensively

A `readObject` method is effectively a **public constructor** — it creates an object from a byte stream. It must validate its input and make defensive copies of mutable fields, just like any constructor.

### The Problem — Mutable Fields in Deserialized Objects

```java
public final class Period implements Serializable {
    private final Date start;
    private final Date end;

    public Period(Date start, Date end) {
        this.start = new Date(start.getTime()); // defensive copy
        this.end   = new Date(end.getTime());
        if (this.start.compareTo(this.end) > 0)
            throw new IllegalArgumentException();
    }
}
```

The constructor is safe, but **deserialization bypasses the constructor**. An attacker can:

1. **Create an invalid Period**: craft a byte stream where `end` is before `start`
2. **Mutate after deserialization**: the serialized stream can contain extra references to the internal `Date` objects — the attacker retains a reference and mutates them after deserialization

### The Fix — Defensive readObject

```java
private void readObject(ObjectInputStream s) throws IOException, ClassNotFoundException {
    s.defaultReadObject();

    // Defensive copy of mutable fields
    start = new Date(start.getTime());
    end   = new Date(end.getTime());

    // Validate invariants
    if (start.compareTo(end) > 0)
        throw new InvalidObjectException(start + " after " + end);
}
```

**Critical**: defensive copy **before** validation (same as constructors — Item 50). Don't use `clone()` for defensive copies in `readObject` — the field might be a malicious subclass.

### Guidelines for readObject

- **Validate every invariant** that the constructor checks
- **Defensively copy every mutable field** (use `new`, not `clone`)
- **Don't invoke overridable methods** — the subclass may not be fully initialized during deserialization
- If in doubt, use the **serialization proxy pattern** (Item 90)

---

## Item 89: For Instance Control, Prefer Enum Types to readResolve

If a singleton class implements `Serializable`, the default deserialization creates a **new instance** — violating the singleton property.

### readResolve — The Old Fix

```java
// readResolve for singleton — replaces deserialized instance with the canonical one
private Object readResolve() {
    return INSTANCE; // discard the deserialized object
}
```

**Problems with readResolve**:
- All instance fields with object references must be `transient` — otherwise an attacker can craft a stream that retains a reference to the deserialized singleton before `readResolve` runs
- Complex, error-prone, easy to get wrong

### Enum — The Better Fix

```java
public enum Elvis {
    INSTANCE;

    private String[] favoriteSongs = { "Hound Dog", "Heartbreak Hotel" };

    public void printFavorites() {
        System.out.println(Arrays.toString(favoriteSongs));
    }
}
```

The JVM guarantees that enum deserialization returns the existing constant — no `readResolve` needed, no attack surface. **Use enums for instance-controlled classes** whenever possible (Item 3).

### When readResolve Is Necessary

When the class is not an enum but needs instance control, and its instances are not known at compile time. In this case, `readResolve` is acceptable but requires extreme care:

- Make **all** reference fields `transient`
- The `readResolve` method must be at least `protected` (not `private`) if the class is inheritable — otherwise subclasses can't use it

---

## Item 90: Consider Serialization Proxies Instead of Serialized Instances

The **serialization proxy pattern** is the safest and most robust way to implement `Serializable` on a non-trivial class. It dramatically reduces the security and correctness risks of serialization.

### The Pattern

1. Design a `private static` nested class (the **serialization proxy**) that concisely represents the logical state of the enclosing class
2. The enclosing class's `writeReplace()` returns a proxy instance
3. The proxy's `readResolve()` constructs the enclosing class using its **public constructor** — ensuring all invariant checks run

```java
public final class Period implements Serializable {
    private final Date start;
    private final Date end;

    public Period(Date start, Date end) {
        this.start = new Date(start.getTime());
        this.end   = new Date(end.getTime());
        if (this.start.compareTo(this.end) > 0)
            throw new IllegalArgumentException();
    }

    // Serialization proxy
    private static class SerializationProxy implements Serializable {
        private final Date start;
        private final Date end;

        SerializationProxy(Period p) {
            this.start = p.start;
            this.end = p.end;
        }

        // Deserialization uses Period's public constructor — all checks enforced
        private Object readResolve() {
            return new Period(start, end);
        }

        private static final long serialVersionUID = 234098243823485285L;
    }

    // writeReplace returns the proxy
    private Object writeReplace() {
        return new SerializationProxy(this);
    }

    // Prevent direct deserialization of Period
    private void readObject(ObjectInputStream stream) throws InvalidObjectException {
        throw new InvalidObjectException("Proxy required");
    }
}
```

### Why the Proxy Pattern Is Superior

| Benefit | Explanation |
|---------|-------------|
| **Uses the real constructor** | All invariant checks and defensive copies are guaranteed — no duplicate validation logic |
| **Eliminates extralinguistic attacks** | The enclosing class can't be instantiated via deserialization (readObject throws) |
| **Allows final fields** | No need for mutable fields or transient hacks |
| **Allows different class on deserialization** | readResolve can return a different type (e.g., `EnumSet` returns `RegularEnumSet` or `JumboEnumSet`) |
| **Defense in depth** | Even if the proxy is somehow tampered with, the constructor rejects invalid state |

### Limitations

- Not compatible with classes designed for inheritance (proxies require the exact class)
- Not compatible with classes whose object graphs contain circular references (the enclosing object doesn't exist during proxy deserialization)
- Slightly slower — additional object creation

### Interview Angle

**Q: How would you make a Java class safely serializable?**
A: First, consider whether you actually need Java serialization — JSON or protobuf are safer alternatives. If you must use Java serialization, use the serialization proxy pattern: a private static nested class captures the logical state, `writeReplace()` returns the proxy, and the proxy's `readResolve()` uses the class's public constructor to reconstruct the object. This ensures all invariant checks run during deserialization and eliminates the attack surface of direct byte-stream construction.
