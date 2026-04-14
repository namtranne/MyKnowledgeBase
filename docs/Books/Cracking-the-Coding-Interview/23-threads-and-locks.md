# Chapter 15 — Threads and Locks

> Concurrency is one of the most challenging topics in software engineering — and one of the most commonly tested at senior-level interviews. Understanding threads, synchronization, and deadlocks isn't just academic; it's essential for building reliable, high-performance systems. This chapter covers the fundamentals of concurrent programming in Java and the patterns you need for interviews.

---

## Threads in Java

A **thread** is the smallest unit of execution within a process. Multiple threads share the same memory space (heap), but each has its own stack.

```
┌──────────────────────────────────────────────────────────────┐
│                         PROCESS                               │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Shared Resources:                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   Heap   │  │  Static  │  │   Code   │                   │
│  │ (objects)│  │ (globals)│  │ (methods)│                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                                │
│  Per-Thread Resources:                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Thread 1 │  │ Thread 2 │  │ Thread 3 │                   │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │                   │
│  │ │Stack │ │  │ │Stack │ │  │ │Stack │ │                   │
│  │ ├──────┤ │  │ ├──────┤ │  │ ├──────┤ │                   │
│  │ │  PC  │ │  │ │  PC  │ │  │ │  PC  │ │                   │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Thread vs. Process

| Feature | Process | Thread |
|---------|---------|--------|
| **Memory** | Separate address space | Shared address space |
| **Creation cost** | High (fork, copy page tables) | Low (shared heap, new stack) |
| **Communication** | IPC (pipes, sockets, shared memory) | Shared variables (direct) |
| **Context switch** | Expensive (TLB flush, cache miss) | Cheaper (same address space) |
| **Isolation** | Strong (crash doesn't affect others) | Weak (one thread crash kills process) |
| **Overhead** | More memory per process | Less memory per thread |

### Creating Threads

**Approach 1: Extending Thread**

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Running in: " + Thread.currentThread().getName());
    }
}

MyThread t = new MyThread();
t.start();
```

**Approach 2: Implementing Runnable (Preferred)**

```java
public class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("Running in: " + Thread.currentThread().getName());
    }
}

Thread t = new Thread(new MyRunnable());
t.start();

// Or with lambda
Thread t2 = new Thread(() -> {
    System.out.println("Lambda thread: " + Thread.currentThread().getName());
});
t2.start();
```

> **Why Runnable is preferred**: Java doesn't support multiple inheritance. Implementing `Runnable` leaves your class free to extend another class. It also separates the task (what to do) from the mechanism (how to run it).

### Thread Lifecycle

```
┌───────────┐   start()   ┌───────────┐  scheduler   ┌───────────┐
│    NEW    │────────────→│ RUNNABLE  │────────────→│  RUNNING  │
└───────────┘             └─────┬─────┘              └──┬──┬──┬──┘
                                │                       │  │  │
                                │    ┌──────────────────┘  │  │
                                │    │                     │  │
                                │    │  sleep()/wait()     │  │ run() ends
                                │    │  join()/IO          │  │
                                │    ▼                     │  ▼
                          ┌─────────────┐                 │ ┌───────────┐
                          │   WAITING   │                 │ │TERMINATED │
                          │  TIMED_WAIT │                 │ └───────────┘
                          └──────┬──────┘                 │
                                 │                        │
                                 │  notify()/timeout      │
                                 │  join completes        │
                                 └────────────────────────┘
```

| State | Description | How to Enter |
|-------|-------------|-------------|
| **NEW** | Thread created but not started | `new Thread()` |
| **RUNNABLE** | Ready to run (or running on a CPU) | `start()`, `notify()`, timeout expires |
| **WAITING** | Waiting indefinitely for another thread | `wait()`, `join()`, `LockSupport.park()` |
| **TIMED_WAITING** | Waiting with a timeout | `sleep(ms)`, `wait(ms)`, `join(ms)` |
| **BLOCKED** | Waiting to acquire a monitor lock | Trying to enter `synchronized` block |
| **TERMINATED** | `run()` has completed or exception thrown | `run()` returns or uncaught exception |

### Key Thread Methods

```java
Thread t = new Thread(() -> {
    try {
        Thread.sleep(2000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

t.start();

t.join();         // current thread waits for t to finish
t.join(5000);     // wait at most 5 seconds

Thread.yield();   // hint to scheduler: give other threads a chance (rarely used)

t.isAlive();      // true if started and not terminated
t.interrupt();    // sets interrupt flag, wakes from sleep/wait
```

---

## Synchronization and Locks

When multiple threads access shared mutable state, synchronization is required to prevent data races and ensure correctness.

### The Problem: Race Condition

```java
public class Counter {
    private int count = 0;

    public void increment() {
        count++;  // NOT atomic: read → modify → write
    }
}
```

```
Thread 1: read count (0) ──→ increment (1) ──→ write count (1)
Thread 2:        read count (0) ──→ increment (1) ──→ write count (1)

Expected: count = 2
Actual:   count = 1  ← RACE CONDITION
```

### synchronized Keyword

**Method-level synchronization:**

```java
public class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

**Block-level synchronization (preferred — finer granularity):**

```java
public class Counter {
    private final Object lock = new Object();
    private int count = 0;

    public void increment() {
        synchronized (lock) {
            count++;
        }
    }
}
```

> Every object in Java has an intrinsic monitor lock. `synchronized` acquires this lock on entry and releases it on exit (even on exception). Only one thread can hold the lock at a time.

### Lock Interface (java.util.concurrent.locks)

For more control than `synchronized`:

```java
import java.util.concurrent.locks.ReentrantLock;

public class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();
        try {
            count++;
        } finally {
            lock.unlock();
        }
    }
}
```

### ReentrantLock vs. synchronized

| Feature | synchronized | ReentrantLock |
|---------|:----------:|:------------:|
| **Automatic release** | Yes (on scope exit) | No (must call `unlock()` in `finally`) |
| **Try lock** | No | `tryLock()`, `tryLock(timeout)` |
| **Fair ordering** | No | `new ReentrantLock(true)` |
| **Multiple conditions** | One (`wait`/`notify`) | Multiple `Condition` objects |
| **Interruptible** | No | `lockInterruptibly()` |
| **Performance** | Similar (modern JVMs) | Similar (modern JVMs) |

### ReadWriteLock

Allows multiple concurrent readers OR a single writer:

```java
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class Cache<K, V> {
    private final Map<K, V> map = new HashMap<>();
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();

    public V get(K key) {
        rwLock.readLock().lock();
        try {
            return map.get(key);
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public void put(K key, V value) {
        rwLock.writeLock().lock();
        try {
            map.put(key, value);
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}
```

### volatile Keyword

Ensures visibility of changes across threads. Does **not** provide atomicity for compound operations.

```java
public class Flag {
    private volatile boolean running = true;

    public void stop() {
        running = false;
    }

    public void run() {
        while (running) {
            // without volatile, thread may cache 'running' and loop forever
        }
    }
}
```

| Feature | volatile | synchronized |
|---------|---------|-------------|
| **Visibility** | ✓ | ✓ |
| **Atomicity** | Only for single read/write | ✓ (entire block) |
| **Blocking** | No | Yes |
| **Use case** | Flags, status variables | Compound operations, critical sections |

### Atomic Classes

`java.util.concurrent.atomic` provides lock-free thread-safe operations:

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();           // atomic increment
counter.compareAndSet(1, 2);         // CAS operation
counter.getAndAdd(5);                // atomic add, return old value

AtomicReference<String> ref = new AtomicReference<>("initial");
ref.compareAndSet("initial", "updated");
```

> Atomic classes use **Compare-And-Swap (CAS)** — a CPU-level atomic instruction. They're faster than locks for simple operations because they avoid context switches, but they can spin under heavy contention.

### wait() / notify() / notifyAll()

These methods coordinate threads using an object's intrinsic monitor. Must be called within a `synchronized` block.

**Producer-Consumer Example:**

```java
public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void produce(T item) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();
        }
        queue.add(item);
        notifyAll();
    }

    public synchronized T consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.remove();
        notifyAll();
        return item;
    }
}
```

> Always use `while` (not `if`) around `wait()` — this guards against **spurious wakeups** and ensures the condition is truly met before proceeding.

```
Producer                              Consumer
   │                                     │
   │  produce("A")                       │
   │  queue not full → add "A"           │
   │  notifyAll() ─────────────────────→ │  wakes up
   │                                     │  consume() → "A"
   │                                     │  notifyAll()
   │                                     │
   │  produce("B")                       │
   │  produce("C")                       │
   │  queue full → wait() ←─────────────│
   │                                     │  consume() → "B"
   │  ←──────────── notifyAll()          │
   │  wakes up, produce("D")            │
```

---

## Deadlocks and Deadlock Prevention

A **deadlock** occurs when two or more threads are blocked forever, each waiting for a resource held by another.

### Four Conditions for Deadlock (Coffman Conditions)

All four must hold simultaneously for a deadlock to occur:

| Condition | Description | Example |
|-----------|-------------|---------|
| **Mutual Exclusion** | Resource can be held by only one thread | Lock, file handle, database row |
| **Hold and Wait** | Thread holds resources while waiting for more | Thread holds Lock A, waits for Lock B |
| **No Preemption** | Resources can't be forcibly taken away | Thread won't release Lock A until it's done |
| **Circular Wait** | Circular chain of threads, each waiting for the next | T1 waits for T2's lock, T2 waits for T1's lock |

### Deadlock Example

```java
final Object lockA = new Object();
final Object lockB = new Object();

// Thread 1
new Thread(() -> {
    synchronized (lockA) {
        Thread.sleep(100);
        synchronized (lockB) {      // waits for Thread 2 to release lockB
            System.out.println("Thread 1");
        }
    }
}).start();

// Thread 2
new Thread(() -> {
    synchronized (lockB) {
        Thread.sleep(100);
        synchronized (lockA) {      // waits for Thread 1 to release lockA
            System.out.println("Thread 2");
        }
    }
}).start();

// DEADLOCK: Thread 1 holds lockA, waits for lockB
//           Thread 2 holds lockB, waits for lockA
```

```
Thread 1                    Thread 2
   │                           │
   │ acquire lockA ✓           │ acquire lockB ✓
   │        │                  │        │
   │        │    ┌─────────────│────────┘
   │        │    │             │
   │        └────│─────────────│──→ waiting for lockB
   │             │             │
   │             └─────────────│──→ waiting for lockA
   │                           │
   ▼         DEADLOCK          ▼
```

### Prevention Strategies

| Strategy | Breaks Which Condition | Implementation |
|----------|----------------------|----------------|
| **Lock Ordering** | Circular Wait | Always acquire locks in a consistent global order |
| **Lock Timeout** | Hold and Wait | `tryLock(timeout)` — give up if can't acquire |
| **All-or-Nothing** | Hold and Wait | Acquire all locks atomically or none |
| **Deadlock Detection** | N/A (recovery) | Detect cycles in wait-for graph, kill a thread |

### Lock Ordering Solution

```java
public void transferMoney(Account from, Account to, int amount) {
    Account first = from.id < to.id ? from : to;
    Account second = from.id < to.id ? to : from;

    synchronized (first) {
        synchronized (second) {
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

### tryLock with Timeout

```java
public boolean transfer(Account from, Account to, int amount) {
    ReentrantLock lock1 = from.getLock();
    ReentrantLock lock2 = to.getLock();

    try {
        if (lock1.tryLock(1, TimeUnit.SECONDS)) {
            try {
                if (lock2.tryLock(1, TimeUnit.SECONDS)) {
                    try {
                        from.debit(amount);
                        to.credit(amount);
                        return true;
                    } finally {
                        lock2.unlock();
                    }
                }
            } finally {
                lock1.unlock();
            }
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
    return false;
}
```

### The Dining Philosophers Problem

Five philosophers sit around a table, each with a fork on their left and right. To eat, a philosopher needs both forks.

```
            P1
        F5 /  \ F1
          /    \
      P5 |     | P2
          \    /
        F4 \  / F2
            P4
          F3 |
            P3
```

**Naive solution (deadlock-prone):** Each philosopher picks up the left fork, then the right fork.

**Fix: Break circular wait** by having one philosopher pick up the right fork first:

```java
public class Philosopher implements Runnable {
    private final Object leftFork;
    private final Object rightFork;
    private final int id;

    public Philosopher(int id, Object left, Object right) {
        this.id = id;
        if (id == 0) {
            this.leftFork = right;
            this.rightFork = left;
        } else {
            this.leftFork = left;
            this.rightFork = right;
        }
    }

    @Override
    public void run() {
        while (true) {
            think();
            synchronized (leftFork) {
                synchronized (rightFork) {
                    eat();
                }
            }
        }
    }

    private void think() { /* ... */ }
    private void eat() { /* ... */ }
}
```

---

## Interview Questions Overview

| # | Problem | Key Concept |
|---|---------|------------|
| 15.1 | **Thread vs. Process** | Shared memory vs. isolated address spaces, creation cost, communication |
| 15.2 | **Context Switch** | Saving/restoring registers, program counter, stack pointer; TLB flush for processes |
| 15.3 | **Dining Philosophers** | Deadlock avoidance through lock ordering or resource hierarchy |
| 15.4 | **Deadlock-Free Class** | Design a lock manager that enforces ordering to prevent deadlocks |
| 15.5 | **Call In Order** | Ensure methods execute in order using Semaphores or CountDownLatch |
| 15.6 | **Synchronized Methods** | If class has synchronized methods A and B, different instances can call them simultaneously |
| 15.7 | **FizzBuzz** | Multithreaded FizzBuzz using synchronization, Semaphores, or lock-based coordination |

### Call In Order (15.5) — Solution with Semaphores

```java
public class OrderedExecution {
    private final Semaphore sem2 = new Semaphore(0);
    private final Semaphore sem3 = new Semaphore(0);

    public void first() {
        System.out.println("First");
        sem2.release();
    }

    public void second() throws InterruptedException {
        sem2.acquire();
        System.out.println("Second");
        sem3.release();
    }

    public void third() throws InterruptedException {
        sem3.acquire();
        System.out.println("Third");
    }
}
```

### Multithreaded FizzBuzz (15.7) — Approach

```java
public class FizzBuzz {
    private int n;
    private int current = 1;

    public FizzBuzz(int n) { this.n = n; }

    public synchronized void fizz() throws InterruptedException {
        while (current <= n) {
            if (current % 3 == 0 && current % 5 != 0) {
                System.out.println("Fizz");
                current++;
                notifyAll();
            } else {
                wait();
            }
        }
    }

    public synchronized void buzz() throws InterruptedException {
        while (current <= n) {
            if (current % 5 == 0 && current % 3 != 0) {
                System.out.println("Buzz");
                current++;
                notifyAll();
            } else {
                wait();
            }
        }
    }

    public synchronized void fizzbuzz() throws InterruptedException {
        while (current <= n) {
            if (current % 15 == 0) {
                System.out.println("FizzBuzz");
                current++;
                notifyAll();
            } else {
                wait();
            }
        }
    }

    public synchronized void number() throws InterruptedException {
        while (current <= n) {
            if (current % 3 != 0 && current % 5 != 0) {
                System.out.println(current);
                current++;
                notifyAll();
            } else {
                wait();
            }
        }
    }
}
```

---

## java.util.concurrent Overview

The `java.util.concurrent` package provides high-level concurrency utilities that are safer and more powerful than low-level thread primitives.

### ExecutorService and Thread Pools

```java
ExecutorService pool = Executors.newFixedThreadPool(4);

Future<Integer> future = pool.submit(() -> {
    return computeExpensiveResult();
});

int result = future.get();

pool.shutdown();
pool.awaitTermination(10, TimeUnit.SECONDS);
```

| Pool Type | Behavior | Use Case |
|-----------|----------|----------|
| `newFixedThreadPool(n)` | Fixed number of threads | Known concurrency level |
| `newCachedThreadPool()` | Creates threads as needed, reuses idle ones | Many short-lived tasks |
| `newSingleThreadExecutor()` | Single thread, queued tasks | Sequential execution guarantee |
| `newScheduledThreadPool(n)` | Scheduled/periodic execution | Cron-like tasks, delayed execution |

### CountDownLatch

Allows one or more threads to wait until a set of operations completes:

```java
CountDownLatch latch = new CountDownLatch(3);

for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doWork();
        latch.countDown();
    }).start();
}

latch.await();
System.out.println("All 3 tasks complete");
```

### Semaphore

Controls access to a resource with a limited number of permits:

```java
Semaphore semaphore = new Semaphore(3);

void accessResource() throws InterruptedException {
    semaphore.acquire();
    try {
        useSharedResource();
    } finally {
        semaphore.release();
    }
}
```

### CyclicBarrier

Threads wait at a barrier point until all arrive, then all proceed together:

```java
CyclicBarrier barrier = new CyclicBarrier(3, () -> {
    System.out.println("All threads reached barrier");
});

for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doPhase1();
        barrier.await();
        doPhase2();
        barrier.await();
    }).start();
}
```

### Comparison

| Utility | Reusable? | Count | Use Case |
|---------|:---------:|-------|----------|
| `CountDownLatch` | No | Counts down to 0 | Wait for N tasks to complete |
| `CyclicBarrier` | Yes | Waits for N threads | Phased computation, parallel iteration |
| `Semaphore` | Yes | Permits (up and down) | Resource pooling, rate limiting |

---

## CompletableFuture

Modern async programming in Java:

```java
CompletableFuture<String> userFuture = CompletableFuture
    .supplyAsync(() -> fetchUser(userId));

CompletableFuture<List<Order>> ordersFuture = CompletableFuture
    .supplyAsync(() -> fetchOrders(userId));

CompletableFuture<String> combined = userFuture
    .thenCombine(ordersFuture, (user, orders) -> {
        return formatSummary(user, orders);
    });

combined
    .thenAccept(System.out::println)
    .exceptionally(ex -> { System.err.println(ex); return null; });
```

### Composition Patterns

| Method | Description |
|--------|-------------|
| `thenApply(fn)` | Transform result (like `map`) |
| `thenCompose(fn)` | Chain with another CompletableFuture (like `flatMap`) |
| `thenCombine(other, fn)` | Combine two futures when both complete |
| `allOf(cf1, cf2, ...)` | Complete when all complete |
| `anyOf(cf1, cf2, ...)` | Complete when any completes |
| `exceptionally(fn)` | Handle exceptions |
| `handle(fn)` | Handle both success and failure |

---

## Thread Safety Patterns

### Immutable Objects

The simplest way to achieve thread safety — no synchronization needed:

```java
public final class ImmutablePoint {
    private final int x;
    private final int y;

    public ImmutablePoint(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }
    public int getY() { return y; }

    public ImmutablePoint translate(int dx, int dy) {
        return new ImmutablePoint(x + dx, y + dy);
    }
}
```

### Thread-Local Storage

Each thread gets its own copy of a variable:

```java
private static final ThreadLocal<SimpleDateFormat> dateFormat =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

String formatted = dateFormat.get().format(new Date());
```

### Concurrent Collections

| Collection | Thread-Safe Alternative | Notes |
|-----------|----------------------|-------|
| `ArrayList` | `CopyOnWriteArrayList` | Good for read-heavy, write-rare |
| `HashMap` | `ConcurrentHashMap` | Segment-based locking, high concurrency |
| `TreeMap` | `ConcurrentSkipListMap` | Concurrent sorted map |
| `LinkedList` (as Queue) | `ConcurrentLinkedQueue` | Lock-free queue |
| `PriorityQueue` | `PriorityBlockingQueue` | Blocking priority queue |

---

## Lock-Free Data Structures

Lock-free algorithms use atomic operations (CAS) instead of locks:

```java
public class LockFreeStack<T> {
    private final AtomicReference<Node<T>> top = new AtomicReference<>();

    public void push(T value) {
        Node<T> newNode = new Node<>(value);
        Node<T> oldTop;
        do {
            oldTop = top.get();
            newNode.next = oldTop;
        } while (!top.compareAndSet(oldTop, newNode));
    }

    public T pop() {
        Node<T> oldTop;
        Node<T> newTop;
        do {
            oldTop = top.get();
            if (oldTop == null) return null;
            newTop = oldTop.next;
        } while (!top.compareAndSet(oldTop, newTop));
        return oldTop.value;
    }

    private static class Node<T> {
        final T value;
        Node<T> next;
        Node(T value) { this.value = value; }
    }
}
```

> Lock-free data structures guarantee system-wide progress: at least one thread always makes progress, even if other threads are delayed. They're crucial in high-performance, low-latency systems.

---

## Quick Reference: Concurrency Decision Guide

```
Need thread safety?
│
├── Is the data immutable?
│   └── YES → No synchronization needed ✓
│
├── Is it a simple flag or counter?
│   └── YES → Use volatile (flag) or AtomicInteger (counter)
│
├── Is it a collection?
│   └── YES → Use ConcurrentHashMap, CopyOnWriteArrayList, etc.
│
├── Is it a single critical section?
│   └── YES → Use synchronized (simplest) or ReentrantLock (more control)
│
├── Need multiple readers, one writer?
│   └── YES → Use ReadWriteLock
│
├── Need to coordinate thread execution order?
│   └── YES → Use CountDownLatch, CyclicBarrier, or Semaphore
│
└── Need async composition?
    └── YES → Use CompletableFuture
```

> Concurrency bugs are the hardest to find because they're non-deterministic — they may appear only under specific timing, load, or hardware conditions. Design for thread safety from the start; retrofitting it is painful and error-prone.
