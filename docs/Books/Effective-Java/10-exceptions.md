# Chapter 10 — Exceptions

When used properly, exceptions improve a program's readability, reliability, and maintainability. When used improperly, they have the opposite effect. This chapter provides guidelines for using exceptions effectively.

---

## Item 69: Use Exceptions Only for Exceptional Conditions

Never use exceptions for ordinary control flow.

```java
// TERRIBLE — exceptions for loop termination
try {
    int i = 0;
    while (true)
        range[i++].climb();
} catch (ArrayIndexOutOfBoundsException e) { }

// CORRECT — standard loop
for (Mountain m : range)
    m.climb();
```

### Why Exception-Based Loops Are Wrong

| Reason | Details |
|--------|---------|
| **Obscures intent** | Code is unreadable — the catch clause hides the loop's termination condition |
| **Defeats JVM optimization** | The JVM cannot optimize try-catch blocks as aggressively as normal loops (array bounds checks are already optimized away by the JIT) |
| **Hides real bugs** | If `climb()` internally throws `ArrayIndexOutOfBoundsException` for a different reason, it's silently swallowed |
| **Slower** | Exception creation captures the stack trace — expensive compared to a simple bounds check |

### API Design Implication

APIs should provide **state-testing methods** or **distinguished return values** so clients can avoid exceptions in normal control flow:

```java
// State-testing method pattern (Iterator)
for (Iterator<Foo> i = collection.iterator(); i.hasNext(); ) {
    Foo foo = i.next();
}

// Distinguished return value pattern
String value = map.get(key); // returns null if absent, not an exception
```

| Approach | When to Use |
|----------|-------------|
| **State-testing method** (`hasNext()`) | When the object is accessed by a single thread, or the state won't change between check and use |
| **Distinguished return value** (`null`, `Optional.empty()`) | When concurrent access might change state between check and use, or when `null`/empty is unambiguous |

---

## Item 70: Use Checked Exceptions for Recoverable Conditions and Runtime Exceptions for Programming Errors

Java provides three kinds of throwables:

| Throwable | When to Use | Caller's Obligation |
|-----------|-------------|-------------------|
| **Checked exception** | Conditions the caller can reasonably be expected to **recover from** | Must catch or propagate (compiler-enforced) |
| **Runtime exception** | **Programming errors** — precondition violations (e.g., `ArrayIndexOutOfBoundsException` when using an invalid index) | No obligation — indicates a bug that should be fixed |
| **Error** | **JVM resource exhaustion** or invariant failure (`OutOfMemoryError`, `StackOverflowError`) | Should not be caught — unrecoverable |

### Decision Flowchart

```
Can the caller reasonably recover?
├── YES → Checked exception
│         Provide methods on the exception to aid recovery
│         (e.g., getAmount() on InsufficientFundsException)
└── NO  → Is it a programming error (precondition violation)?
          ├── YES → Runtime exception (IllegalArgumentException, etc.)
          └── NO  → Error (only for JVM-level failures)
```

### Key Rules

1. **All unchecked throwables should subclass `RuntimeException`** (directly or indirectly). Don't define throwables that are neither checked exceptions nor runtime exceptions.

2. **Never define `Error` subclasses** — that tier is reserved for the JVM.

3. **Provide recovery information** on checked exceptions. `InsufficientFundsException` should include how much was short, so the caller can inform the user.

4. **Checked exceptions force acknowledgment** — this is a feature when recovery is possible, and a burden when it isn't. If most callers will just rethrow or catch-and-log, consider using an unchecked exception instead.

---

## Item 71: Avoid Unnecessary Use of Checked Exceptions

Checked exceptions are a great feature of Java when used appropriately — they force callers to handle exceptional conditions, leading to more reliable programs. But overuse makes APIs painful:

```java
// Checked exception — every caller must handle it
try {
    obj.action(args);
} catch (TheCheckedException e) {
    // what can the caller actually do here?
    throw new AssertionError(); // or log and ignore — both bad
}
```

### When to Convert Checked to Unchecked

If the caller **can't recover** — if the best they can do is log it, wrap it, or rethrow it — the exception should be unchecked.

### The State-Testing Method Pattern

Replace a method that throws a checked exception with a pair: a state-testing method and an unconditional method:

```java
// Before: throws checked exception
try {
    obj.action(args);
} catch (TheCheckedException e) {
    // ... handle
}

// After: state-testing method + unconditional action
if (obj.actionPermitted(args)) {
    obj.action(args);
} else {
    // ... handle
}
```

This works well when the object is not being accessed concurrently and the state won't change between the check and the action.

---

## Item 72: Favor the Use of Standard Exceptions

The Java platform libraries provide a set of standard exceptions that cover most exception-throwing needs. Reusing them makes your API easier to learn (developers already know these exceptions) and improves readability.

### Most Commonly Reused Exceptions

| Exception | When to Use |
|-----------|-------------|
| `IllegalArgumentException` | Non-null parameter value is inappropriate (e.g., negative count) |
| `IllegalStateException` | Object state is inappropriate for the method invocation (e.g., using an uninitialized object) |
| `NullPointerException` | Parameter is null where prohibited |
| `IndexOutOfBoundsException` | Index parameter value is out of range |
| `ConcurrentModificationException` | Concurrent modification detected where prohibited |
| `UnsupportedOperationException` | Object does not support the method (e.g., `add()` on an unmodifiable collection) |
| `ArithmeticException` | Arithmetic error (division by zero, overflow in checked arithmetic) |
| `NumberFormatException` | String-to-number conversion with invalid format |

### Decision Guide

```
Is the argument null?
├── YES → NullPointerException
└── NO  → Is it an index value?
          ├── YES → IndexOutOfBoundsException
          └── NO  → Is it otherwise invalid?
                    ├── YES → IllegalArgumentException
                    └── Is the object in the wrong state?
                          └── YES → IllegalStateException
```

**Never throw `Exception`, `RuntimeException`, `Throwable`, or `Error` directly** — treat them as abstract (they're too generic).

---

## Item 73: Throw Exceptions Appropriate to the Abstraction

Higher-level layers should **translate** lower-level exceptions into exceptions appropriate to the higher-level abstraction:

```java
// Exception translation
public E get(int index) {
    try {
        return listIterator(index).next();
    } catch (NoSuchElementException e) {
        throw new IndexOutOfBoundsException("Index: " + index);
    }
}
```

### Exception Chaining

When the lower-level exception is useful for debugging, preserve it as the **cause**:

```java
// Exception chaining — preserves root cause
try {
    // lower-level operation
} catch (LowerLevelException cause) {
    throw new HigherLevelException("context message", cause);
}
```

The cause is accessible via `Throwable.getCause()` and appears in stack traces, enabling full diagnosis without leaking abstraction details.

### When NOT to Translate

If the lower-level exception happens to be appropriate for the higher level, just let it propagate. Don't translate for the sake of translation — only when the lower-level exception would be confusing or inappropriate at the higher level.

---

## Item 74: Document All Exceptions Thrown by Each Method

### Documentation Rules

| Rule | Details |
|------|---------|
| **Document every checked exception individually** | Use `@throws` with a description of the conditions under which each is thrown |
| **Document unchecked exceptions too** | They represent precondition violations — documenting them tells the caller what they need to satisfy |
| **Don't use `throws` clause for unchecked exceptions** | Only checked exceptions belong in the `throws` clause — this visually distinguishes checked from unchecked |
| **Don't declare `throws Exception` or `throws Throwable`** | This tells the caller nothing and prevents proper handling |

```java
/**
 * @throws IllegalArgumentException if count is negative
 * @throws NullPointerException if name is null
 * @throws IOException if the underlying stream fails
 */
public void process(String name, int count) throws IOException {
    // IllegalArgumentException and NullPointerException are unchecked
    // — not in throws clause, but documented in Javadoc
}
```

---

## Item 75: Include Failure-Capture Information in Detail Messages

When an exception's `toString()` is printed (in logs, stack traces, crash reports), the **detail message** is often the only information available for post-mortem analysis.

### What to Include

The detail message should contain the **values of all parameters and fields that contributed to the exception**:

```java
public class IndexOutOfBoundsException extends RuntimeException {
    private final int lowerBound;
    private final int upperBound;
    private final int index;

    public IndexOutOfBoundsException(int lowerBound, int upperBound, int index) {
        super(String.format("Lower bound: %d, Upper bound: %d, Index: %d",
                lowerBound, upperBound, index));
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
        this.index = index;
    }
}
```

### What NOT to Include

- **Security-sensitive information** (passwords, encryption keys, SSNs) — detail messages end up in logs, bug reports, and screen displays
- **User-level messages** — the detail message is for programmers and support engineers, not end users

---

## Item 76: Strive for Failure Atomicity

After an object throws an exception, the object should generally still be in a **well-defined, usable state** — ideally the state it was in before the method was invoked. This is called **failure atomicity**.

### Approaches to Achieve Failure Atomicity

| Approach | How It Works | Example |
|----------|-------------|---------|
| **Immutable objects** | State can't change — failure atomicity is free | `BigInteger`, `String` |
| **Check before mutation** | Validate parameters before modifying state | Check stack size before pop; throw `EmptyStackException` before decrementing `size` |
| **Order operations** | Put code that might fail before code that modifies state | `TreeMap.put()` — searching for the key (which might throw `ClassCastException`) happens before insertion |
| **Temporary copy** | Operate on a copy, then swap | Sort algorithms often copy to a working array; if sorting fails, the original is untouched |
| **Recovery code** | Intercept failure and roll back (rare — mainly for durability-oriented systems like databases) | Transaction rollback |

### When Failure Atomicity Is Not Achievable

- **`ConcurrentModificationException`** — the object is already corrupted; no point maintaining atomicity
- When achieving failure atomicity would significantly increase cost or complexity — it's a goal, not an absolute rule

---

## Item 77: Don't Ignore Exceptions

An empty `catch` block defeats the purpose of exceptions:

```java
// TERRIBLE — silently swallowed exception
try {
    // ... code that might throw
} catch (SomeException e) {
    // nothing here
}
```

**At minimum**, the catch block should contain a **comment explaining why it's acceptable to ignore the exception**, and the variable should be named `ignored`:

```java
try {
    // ... code that might throw
} catch (TimeoutException | ExecutionException ignored) {
    // Using default value; timeout is expected during graceful shutdown
}
```

### Consequences of Ignoring Exceptions

- **Silent bugs** — the program continues in an invalid state, causing failures far from the original problem
- **Missed outages** — errors in production go undetected
- **Impossible debugging** — no evidence that the exception occurred

This applies equally to **checked and unchecked exceptions**. An unchecked exception in a catch block represents an unexpected condition — at minimum, log it.

### Interview Angle

**Q: What are the consequences of an empty catch block?**
A: The exception is silently swallowed. The program continues in a potentially invalid state, and there's no evidence the error occurred. This turns a fixable bug into a mystery. At minimum, log the exception. If you genuinely want to ignore it, name the variable `ignored` and comment why.
