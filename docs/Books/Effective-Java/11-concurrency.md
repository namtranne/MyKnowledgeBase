# Chapter 11 — Concurrency

Threads allow multiple activities to proceed concurrently. Concurrent programming is harder than single-threaded programming — more things can go wrong, and failures can be difficult to reproduce. But concurrency is a fact of life in modern Java programming. This chapter contains advice that helps you write clear, correct, well-documented concurrent programs.

---

## Item 78: Synchronize Access to Shared Mutable Data

The `synchronized` keyword ensures that only one thread executes a synchronized block at a time. But synchronization is **not just about mutual exclusion** — it also guarantees **visibility**. Without synchronization, changes made by one thread may never be seen by other threads.

### The Visibility Problem

```java
// BROKEN — runs forever on some JVMs
public class StopThread {
    private static boolean stopRequested;

    public static void main(String[] args) throws InterruptedException {
        Thread backgroundThread = new Thread(() -> {
            int i = 0;
            while (!stopRequested) // may never see the update
                i++;
        });
        backgroundThread.start();

        TimeUnit.SECONDS.sleep(1);
        stopRequested = true; // background thread may never see this
    }
}
```

The JIT compiler can **hoist** the read of `stopRequested` out of the loop (since there's no synchronization, the compiler is allowed to assume no other thread modifies it):

```java
// What the JIT compiler may do (legally):
if (!stopRequested)
    while (true) i++; // infinite loop
```

### Fix 1 — Synchronized Methods

```java
private static synchronized void requestStop() { stopRequested = true; }
private static synchronized boolean stopRequested() { return stopRequested; }
```

Both the write **and** the read must be synchronized — synchronizing only the write is insufficient (the read thread still might not see the update).

### Fix 2 — volatile

```java
private static volatile boolean stopRequested;
```

`volatile` guarantees that any thread reading the field sees the most recently written value. It provides **visibility** but **not atomicity** — suitable for flags and simple state, not for compound operations.

### volatile Is Not Enough for Compound Operations

```java
// BROKEN — not atomic
private static volatile int nextSerialNumber = 0;
public static int generateSerialNumber() {
    return nextSerialNumber++; // read-modify-write: THREE operations, not one
}
```

Two threads can read the same value, both increment, and store the same result — a **safety failure** (lost update). Fix: use `AtomicInteger`:

```java
private static final AtomicInteger nextSerialNumber = new AtomicInteger();
public static int generateSerialNumber() {
    return nextSerialNumber.getAndIncrement(); // atomic read-modify-write
}
```

### The Best Approach — Don't Share Mutable Data

**Confine mutable data to a single thread.** Share only immutable data across threads. When sharing is necessary, synchronize properly.

### java.util.concurrent.atomic

| Class | Purpose |
|-------|---------|
| `AtomicInteger` | Atomic int operations (get-and-increment, compare-and-set) |
| `AtomicLong` | Atomic long operations |
| `AtomicBoolean` | Atomic boolean operations |
| `AtomicReference<V>` | Atomic reference operations |
| `LongAdder` | High-contention counter (faster than AtomicLong under heavy contention) |

---

## Item 79: Avoid Excessive Synchronization

Excessive synchronization causes reduced performance, deadlocks, and nondeterministic behavior.

### Never Call Alien Methods from Synchronized Blocks

An **alien method** is a method that is overridable, or is provided by a client as a function object. You have no control over what it does.

```java
// BROKEN — calls alien method from synchronized block
private final List<SetObserver<E>> observers = new ArrayList<>();

private void notifyElementAdded(E element) {
    synchronized (observers) {
        for (SetObserver<E> observer : observers)
            observer.added(this, element); // ALIEN METHOD — could do anything
    }
}
```

If `observer.added()` tries to modify `observers` (add/remove an observer), it either:
- **Deadlocks** (if it tries to acquire the same lock from another thread)
- **Throws `ConcurrentModificationException`** (if it modifies the list during iteration)

### Fix 1 — Copy Before Iterating

```java
private void notifyElementAdded(E element) {
    List<SetObserver<E>> snapshot;
    synchronized (observers) {
        snapshot = new ArrayList<>(observers); // defensive copy
    }
    for (SetObserver<E> observer : snapshot)
        observer.added(this, element); // outside the lock
}
```

### Fix 2 — CopyOnWriteArrayList

```java
private final List<SetObserver<E>> observers = new CopyOnWriteArrayList<>();

private void notifyElementAdded(E element) {
    for (SetObserver<E> observer : observers)
        observer.added(this, element); // no synchronization needed
}
```

`CopyOnWriteArrayList` creates a fresh copy of the underlying array on every mutation. Iteration is lock-free and sees a consistent snapshot. Perfect for observer lists (rarely modified, frequently iterated).

### Open Calls

**Move alien method invocations outside synchronized blocks.** A method call from outside a synchronized block is called an **open call**. Open calls prevent deadlocks and improve concurrency.

### Synchronize Internally or Externally?

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Externally synchronized** | Client is responsible for locking (e.g., `Collections.synchronizedList`) | When high-contention performance isn't needed; simpler |
| **Internally synchronized** | Class manages its own locking (e.g., `ConcurrentHashMap`) | When you can achieve higher concurrency with fine-grained or lock-free techniques |

If you synchronize internally, use concurrency techniques:
- **Lock splitting** (separate locks for independent state)
- **Lock striping** (partitioned locks, as in `ConcurrentHashMap`)
- **Non-blocking algorithms** (`AtomicInteger`, compare-and-swap)

---

## Item 80: Prefer Executors, Tasks, and Streams to Threads

The `java.util.concurrent` framework provides a **flexible, powerful thread management system**.

### Executors — Don't Create Threads Directly

```java
// Create a thread pool
ExecutorService exec = Executors.newFixedThreadPool(nThreads);

// Submit work
exec.execute(runnable);           // fire-and-forget
Future<V> f = exec.submit(callable); // returns a result

// Shutdown
exec.shutdown();
```

### Executor Types

| Factory Method | Pool Behavior | Use Case |
|---------------|---------------|----------|
| `newCachedThreadPool()` | Creates threads as needed, reuses idle threads (60s timeout) | Light-load servers, short-lived tasks |
| `newFixedThreadPool(n)` | Fixed number of threads, unbounded queue | Heavy-load production servers |
| `newSingleThreadExecutor()` | Single thread, tasks executed sequentially | Sequential task processing |
| `newScheduledThreadPool(n)` | Fixed threads with scheduling support | Periodic/delayed tasks |
| `newWorkStealingPool()` | Fork-join pool, work-stealing (Java 8+) | CPU-intensive parallel tasks |

### Tasks vs Threads — The Right Abstraction

Don't think about threads — think about **tasks**:

| Concept | Description |
|---------|-------------|
| **Runnable** | A task that returns no result and throws no checked exception |
| **`Callable<V>`** | A task that returns a result and can throw a checked exception |
| **`Future<V>`** | A handle for the result of an asynchronous computation |
| **`CompletableFuture<V>`** | A composable Future with callbacks, chaining, and combining (Java 8+) |

The executor framework separates **task submission** from **task execution** — you define what to do, and the framework decides how and when to run it.

### Fork-Join Framework

For CPU-intensive recursive tasks, use `ForkJoinPool` and `RecursiveTask<V>` / `RecursiveAction`. The work-stealing algorithm keeps all cores busy. Parallel streams (`Stream.parallel()`) run on the common `ForkJoinPool` — so a single slow parallel stream can starve other parallel computations.

---

## Item 81: Prefer Concurrency Utilities to wait and notify

Since Java 5, there's almost **never a reason** to use `wait()`, `notify()`, or `notifyAll()`. The `java.util.concurrent` utilities are higher-level, safer, and more performant.

### Three Categories of Concurrency Utilities

#### 1. Concurrent Collections

| Collection | Description | Replaces |
|-----------|-------------|----------|
| `ConcurrentHashMap` | High-concurrency hash map with lock striping | `Collections.synchronizedMap(new HashMap<>())` |
| `CopyOnWriteArrayList` | Snapshot-on-write list; lock-free reads | `Collections.synchronizedList(new ArrayList<>())` |
| `ConcurrentLinkedQueue` | Non-blocking concurrent queue | Manual synchronized queue |
| `BlockingQueue` | Queue with blocking put/take operations | Producer-consumer with wait/notify |

**Never use `Collections.synchronizedMap`** when `ConcurrentHashMap` will do — it's dramatically faster under contention.

```java
// ConcurrentHashMap — atomic compound operations
Map<String, Long> freq = new ConcurrentHashMap<>();
freq.merge(word, 1L, Long::sum); // atomic: if absent put 1, else add 1
```

#### 2. Synchronizers

| Synchronizer | Purpose | Example |
|-------------|---------|---------|
| `CountDownLatch` | One-shot barrier: N threads wait until a count reaches zero | "Start all threads simultaneously, wait for all to finish" |
| `Semaphore` | Controls concurrent access to a shared resource (N permits) | Rate limiting, connection pools |
| `CyclicBarrier` | Reusable barrier: N threads wait for each other at a rendezvous point | Iterative parallel algorithms |
| `Phaser` | Flexible barrier supporting dynamic thread registration | Advanced multi-phase computation |
| `Exchanger` | Two threads exchange data at a synchronization point | Pipeline handoffs |

### CountDownLatch — Concurrent Timer Example

```java
public static long time(Executor executor, int concurrency,
                        Runnable action) throws InterruptedException {
    CountDownLatch ready = new CountDownLatch(concurrency);
    CountDownLatch start = new CountDownLatch(1);
    CountDownLatch done  = new CountDownLatch(concurrency);

    for (int i = 0; i < concurrency; i++) {
        executor.execute(() -> {
            ready.countDown(); // signal "I'm ready"
            try {
                start.await();  // wait for the go signal
                action.run();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown(); // signal "I'm done"
            }
        });
    }

    ready.await(); // wait for all threads to be ready
    long startNanos = System.nanoTime();
    start.countDown(); // fire the starting gun
    done.await();  // wait for all threads to finish
    return System.nanoTime() - startNanos;
}
```

#### 3. If You Must Use wait/notify

Always use the **standard idiom** — wait inside a loop:

```java
synchronized (obj) {
    while (!conditionIsTrue)
        obj.wait(); // releases lock, reacquires on wake
    // perform action
}
```

**Why a loop?**
- **Spurious wakeups**: threads can wake up without `notify` (JVM is allowed to do this)
- **Condition may have changed**: between `notify` and lock reacquisition, another thread may have consumed the resource
- **Accidental `notifyAll`**: another thread may have notified for a different condition

**Always prefer `notifyAll` to `notify`** — `notify` wakes a single arbitrary thread, which may not be the right one. `notifyAll` wakes all waiting threads (they recheck their condition in the loop).

---

## Item 82: Document Thread Safety

The presence or absence of `synchronized` in a method signature is an **implementation detail**, not part of the API. You must **explicitly document the thread-safety level** of every class.

### Thread-Safety Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Immutable** | Instances are constant. No external synchronization needed. | `String`, `Long`, `BigInteger` |
| **Unconditionally thread-safe** | Mutable, but internally synchronized. No external synchronization needed. | `AtomicLong`, `ConcurrentHashMap` |
| **Conditionally thread-safe** | Like unconditionally thread-safe, but some methods require external synchronization for compound operations. | `Collections.synchronized*` wrappers — iteration requires manual synchronization on the collection |
| **Not thread-safe** | Mutable, no internal synchronization. Clients must surround each method invocation (or sequence) with external synchronization. | `ArrayList`, `HashMap` |
| **Thread-hostile** | Unsafe even with external synchronization. Usually from modifying static data without synchronization. | Rare — indicates a bug (e.g., unsynchronized static field modification) |

### Lock Fields for Internally Synchronized Classes

```java
// Private lock object — prevents client interference and subclass deadlocks
private final Object lock = new Object();

public void foo() {
    synchronized (lock) {
        // ... mutate shared state
    }
}
```

**Never synchronize on a publicly accessible lock** (`this`, a public field, or the class object) — clients can hold the lock and cause denial-of-service or deadlocks.

---

## Item 83: Use Lazy Initialization Judiciously

**Lazy initialization** defers field initialization until its value is first needed. It's primarily an **optimization** — don't do it unless you have to.

### Four Approaches

#### 1. Normal Initialization (Default — Use This)

```java
private final FieldType field = computeFieldValue();
```

Best for most cases. Simple, clear, and thread-safe (for final fields).

#### 2. Synchronized Accessor (For Instance Fields)

```java
private FieldType field;

private synchronized FieldType getField() {
    if (field == null)
        field = computeFieldValue();
    return field;
}
```

Safe but contended — every access acquires the lock.

#### 3. Lazy Initialization Holder Class (For Static Fields — PREFERRED)

```java
private static class FieldHolder {
    static final FieldType field = computeFieldValue();
}

private static FieldType getField() {
    return FieldHolder.field;
}
```

**Why this works**: the JVM guarantees that `FieldHolder` is not initialized until `getField()` is first called. Class initialization is thread-safe by JLS. After initialization, no synchronization overhead — just a field access.

#### 4. Double-Check Idiom (For Instance Fields — When Performance Matters)

```java
private volatile FieldType field;

private FieldType getField() {
    FieldType result = field; // local variable avoids double volatile read
    if (result != null)
        return result;

    synchronized (this) {
        if (field == null)
            field = computeFieldValue();
        return field;
    }
}
```

After initialization, no synchronization — just a `volatile` read. The local variable `result` is an optimization: it ensures `field` is read only once in the common (already initialized) case.

### Single-Check Idiom (Tolerant of Repeated Initialization)

```java
private volatile FieldType field;

private FieldType getField() {
    FieldType result = field;
    if (result == null)
        field = result = computeFieldValue();
    return result;
}
```

Omits the second check — the field may be initialized multiple times by different threads. Acceptable only when repeated initialization is harmless.

### Interview Angle

**Q: How do you implement a thread-safe singleton with lazy initialization?**
A: Best approach: use the lazy initialization holder class idiom. The inner static class is not loaded until `getInstance()` is called. The JVM guarantees thread-safe class initialization, so no explicit synchronization is needed. For instance fields, use the double-check idiom with a `volatile` field.

---

## Item 84: Don't Depend on the Thread Scheduler

Any program whose correctness or performance depends on the **thread scheduler** is not portable. The scheduler determines which runnable threads get to run, for how long, and on which cores — and this varies across JVM implementations and operating systems.

### Rules

| Rule | Rationale |
|------|-----------|
| **Keep runnable thread count close to processor count** | If too many threads are runnable, the scheduler must time-slice, increasing context-switch overhead and reducing throughput |
| **Threads should do useful work, then wait** | A thread that busy-waits (spinning in a tight loop checking a condition) wastes CPU and hurts other threads |
| **Never use `Thread.yield()`** | It has no reliable semantics — it may do nothing. Used to "fix" scheduling problems, but those problems indicate a design flaw. |
| **Never tune thread priorities** | Thread priorities are among the least portable features of Java. They might work on your machine and break on another. |

### Busy-Waiting — The Anti-Pattern

```java
// TERRIBLE — busy-waiting
while (true) {
    synchronized (this) {
        if (conditionIsMet) break;
    }
    // spins, wasting CPU
}

// CORRECT — wait/notify or higher-level synchronizer
synchronized (this) {
    while (!conditionIsMet)
        wait(); // releases CPU until notified
}

// BEST — use java.util.concurrent
latch.await(); // blocks efficiently until countdown reaches zero
```

If a program works only because of `Thread.yield()` or thread priority tuning, it will likely fail on different hardware or JVM versions. Fix the underlying design — typically by reducing the number of concurrently runnable threads or by using proper synchronization primitives.
