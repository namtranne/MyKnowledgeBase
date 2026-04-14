---
sidebar_position: 5
title: "04 — Synchronization & Deadlocks"
slug: 04-synchronization-deadlocks
---

# 🔒 Synchronization & Deadlocks

When multiple threads or processes access shared resources, **coordination** is essential to prevent data corruption. This chapter covers the primitives, classic problems, and deadlock theory that every senior engineer must know.

---

## 1. Race Conditions

A **race condition** occurs when the outcome of a program depends on the **timing** of uncontrollable events (e.g., thread scheduling).

```c
// Shared variable
int counter = 0;

// Thread A                    // Thread B
load  counter → reg (0)        load  counter → reg (0)
add   reg, 1  → reg (1)       add   reg, 1  → reg (1)
store reg → counter (1)        store reg → counter (1)

// Expected: counter = 2
// Actual:   counter = 1  ← RACE CONDITION (lost update)
```

The root cause: the increment operation (`counter++`) is **not atomic** — it consists of load, add, and store, and another thread can interleave between these steps.

---

## 2. Critical Section Problem

A **critical section** is a code segment that accesses shared resources. The solution must satisfy:

| Property | Description |
|----------|-------------|
| **Mutual Exclusion** | At most one thread in the critical section at a time |
| **Progress** | If no thread is in the CS, a waiting thread must eventually enter |
| **Bounded Waiting** | A thread cannot be starved indefinitely — there's a limit on how many times other threads enter before it |

```
Thread Lifecycle with Critical Section:

  Entry Section      ← Acquire lock / check conditions
  ──────────────
  Critical Section   ← Access shared resources
  ──────────────
  Exit Section       ← Release lock
  ──────────────
  Remainder Section  ← Non-critical code
```

---

## 3. Peterson's Solution

A **software-only** solution for two threads. Elegant but impractical on modern hardware due to **instruction reordering** and **cache coherence** issues.

```c
// Shared variables
volatile int flag[2] = {0, 0};
volatile int turn;

void enter_critical_section(int i) {
    int j = 1 - i;           // The other thread
    flag[i] = 1;             // I want to enter
    turn = j;                // But I'll let you go first
    while (flag[j] && turn == j)
        ;                    // Busy wait
}

void exit_critical_section(int i) {
    flag[i] = 0;
}
```

:::warning Modern Hardware
Peterson's solution requires **sequential consistency**, which modern CPUs don't provide by default. On x86/ARM, you need **memory barriers** (`__sync_synchronize()` or `std::atomic`) to prevent reordering. In practice, use OS-provided primitives.
:::

---

## 4. Hardware Solutions

### Test-and-Set (TAS)

An **atomic** hardware instruction that sets a value and returns the old value in a single operation.

```c
// Hardware-provided atomic instruction
bool test_and_set(bool *target) {
    bool old = *target;
    *target = true;
    return old;     // Returns previous value atomically
}

// Usage: spinlock
volatile bool lock = false;

void acquire() {
    while (test_and_set(&lock))
        ;  // Spin until we get false (was unlocked)
}

void release() {
    lock = false;
}
```

### Compare-and-Swap (CAS)

More flexible — atomically compares and conditionally updates.

```c
// Hardware-provided atomic instruction
bool compare_and_swap(int *ptr, int expected, int new_val) {
    if (*ptr == expected) {
        *ptr = new_val;
        return true;    // Success
    }
    return false;       // Failed, someone else changed it
}

// Usage: lock-free increment
void atomic_increment(int *counter) {
    int old;
    do {
        old = *counter;
    } while (!compare_and_swap(counter, old, old + 1));
}
```

:::tip CAS in Practice
- **Java:** `AtomicInteger.compareAndSet(expected, newValue)`
- **C11:** `atomic_compare_exchange_strong(&obj, &expected, desired)`
- **C++:** `std::atomic::compare_exchange_strong(expected, desired)`
- **Go:** `atomic.CompareAndSwapInt64(&val, old, new)`
:::

---

## 5. Synchronization Primitives

### Mutex (Mutual Exclusion)

Binary lock — only the **owner** can unlock it.

```c
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void *thread_func(void *arg) {
    pthread_mutex_lock(&mutex);       // Block if already locked
    // Critical section
    shared_counter++;
    pthread_mutex_unlock(&mutex);     // Only owner can unlock
    return NULL;
}
```

### Semaphore

A **counting** synchronization primitive. `wait()` decrements (blocks if 0), `signal()` increments.

```c
#include <semaphore.h>

sem_t sem;
sem_init(&sem, 0, 3);    // Allow up to 3 concurrent accessors

void *worker(void *arg) {
    sem_wait(&sem);        // Decrement; block if count = 0
    // Access limited resource (e.g., connection pool)
    sem_post(&sem);        // Increment; wake a waiting thread
    return NULL;
}
```

| Type | Initial Value | Use Case |
|------|-------------|----------|
| **Binary semaphore** | 1 | Mutual exclusion (like mutex, but any thread can signal) |
| **Counting semaphore** | N | Limit concurrent access to N resources |

:::info Mutex vs Binary Semaphore
They look similar but differ in **ownership**. A mutex has an owner — only the thread that locked it can unlock it. A binary semaphore has no owner — any thread can call `signal()`. This matters for priority inheritance and debugging.
:::

### Monitor

A high-level synchronization construct that bundles a lock with condition variables. Java's `synchronized` keyword implements a monitor.

```java
public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void put(T item) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();       // Release monitor lock and sleep
        }
        queue.add(item);
        notifyAll();      // Wake all waiting threads
    }

    public synchronized T take() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        notifyAll();
        return item;
    }
}
```

### Condition Variable

Allows threads to **wait for a condition** to become true, paired with a mutex.

```c
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;
int data_ready = 0;

// Producer
pthread_mutex_lock(&mutex);
data_ready = 1;
pthread_cond_signal(&cond);          // Wake one waiting thread
pthread_mutex_unlock(&mutex);

// Consumer
pthread_mutex_lock(&mutex);
while (!data_ready) {                // Always use while, not if!
    pthread_cond_wait(&cond, &mutex); // Atomically unlock + sleep
}
// Process data
pthread_mutex_unlock(&mutex);
```

:::warning Spurious Wakeups
`pthread_cond_wait()` can return even when no signal was sent (spurious wakeup). This is why you **must** use a `while` loop to re-check the condition, never an `if`.
:::

### Read-Write Lock

Allows **concurrent reads** but **exclusive writes**.

```c
pthread_rwlock_t rwlock = PTHREAD_RWLOCK_INITIALIZER;

// Reader (many can hold simultaneously)
pthread_rwlock_rdlock(&rwlock);
// Read shared data
pthread_rwlock_unlock(&rwlock);

// Writer (exclusive access)
pthread_rwlock_wrlock(&rwlock);
// Modify shared data
pthread_rwlock_unlock(&rwlock);
```

| Mode | Compatibility |
|------|--------------|
| Read lock held | More readers can enter; writers block |
| Write lock held | All readers and writers block |

### Spinlock vs Mutex

| Aspect | Spinlock | Mutex |
|--------|----------|-------|
| **Blocking** | Busy-waits (burns CPU cycles) | Sleeps (context switch to kernel) |
| **CPU usage while waiting** | 100% | 0% (sleeping) |
| **Best for** | Very short critical sections (&lt;1 μs) | Longer critical sections |
| **Context switch** | None | Yes (sleep/wake) |
| **Can be used in interrupt context?** | Yes | No (can't sleep in interrupts) |
| **Typical use** | Kernel, lock-free data structures | Application-level synchronization |

:::tip Adaptive Mutexes
Many real implementations (glibc, Go, Java) use **adaptive mutexes**: spin briefly first (hoping the lock is released quickly), then fall back to sleeping. This combines the advantages of both.
:::

---

## 6. Classic Synchronization Problems

### Producer-Consumer (Bounded Buffer)

```c
#include <pthread.h>
#include <semaphore.h>

#define BUFFER_SIZE 10
int buffer[BUFFER_SIZE];
int in = 0, out = 0;

sem_t empty;   // Counts empty slots
sem_t full;    // Counts filled slots
pthread_mutex_t mutex;

void init() {
    sem_init(&empty, 0, BUFFER_SIZE);
    sem_init(&full, 0, 0);
    pthread_mutex_init(&mutex, NULL);
}

void *producer(void *arg) {
    while (1) {
        int item = produce_item();
        sem_wait(&empty);              // Wait for empty slot
        pthread_mutex_lock(&mutex);    // Protect buffer access
        buffer[in] = item;
        in = (in + 1) % BUFFER_SIZE;
        pthread_mutex_unlock(&mutex);
        sem_post(&full);               // Signal: one more item
    }
}

void *consumer(void *arg) {
    while (1) {
        sem_wait(&full);               // Wait for item
        pthread_mutex_lock(&mutex);
        int item = buffer[out];
        out = (out + 1) % BUFFER_SIZE;
        pthread_mutex_unlock(&mutex);
        sem_post(&empty);              // Signal: one more empty slot
        consume_item(item);
    }
}
```

### Readers-Writers Problem

**First readers-writers:** readers have priority (writers may starve).

```c
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t write_lock = PTHREAD_MUTEX_INITIALIZER;
int reader_count = 0;

void *reader(void *arg) {
    pthread_mutex_lock(&mutex);
    reader_count++;
    if (reader_count == 1)
        pthread_mutex_lock(&write_lock);  // First reader locks out writers
    pthread_mutex_unlock(&mutex);

    // --- Read shared data ---

    pthread_mutex_lock(&mutex);
    reader_count--;
    if (reader_count == 0)
        pthread_mutex_unlock(&write_lock); // Last reader lets writers in
    pthread_mutex_unlock(&mutex);
}

void *writer(void *arg) {
    pthread_mutex_lock(&write_lock);
    // --- Write shared data ---
    pthread_mutex_unlock(&write_lock);
}
```

### Dining Philosophers

Five philosophers sit around a table, each needing two forks to eat. Classic deadlock scenario.

```
         P0
       /    \
     F4      F0
     /        \
   P4          P1
    |          |
   F3         F1
     \        /
      P3    P2
        \  /
         F2
```

**Solutions:**
1. **Resource ordering:** Always pick the lower-numbered fork first → breaks circular wait
2. **Limit concurrency:** Allow at most 4 philosophers to sit (semaphore initialized to 4)
3. **Chandy/Misra:** Token-based solution for distributed systems

```c
pthread_mutex_t forks[5];

void philosopher(int id) {
    int left = id;
    int right = (id + 1) % 5;

    // Resource ordering: always lock lower-numbered fork first
    int first = (left < right) ? left : right;
    int second = (left < right) ? right : left;

    while (1) {
        think();
        pthread_mutex_lock(&forks[first]);
        pthread_mutex_lock(&forks[second]);
        eat();
        pthread_mutex_unlock(&forks[second]);
        pthread_mutex_unlock(&forks[first]);
    }
}
```

### Sleeping Barber

A barber shop with one barber, one barber chair, and N waiting chairs.

```c
sem_t customers;      // Counts waiting customers (init: 0)
sem_t barber_ready;   // Barber signals readiness (init: 0)
pthread_mutex_t mutex;
int waiting = 0;
int NUM_CHAIRS = 5;

void *barber_thread(void *arg) {
    while (1) {
        sem_wait(&customers);           // Sleep if no customers
        pthread_mutex_lock(&mutex);
        waiting--;
        pthread_mutex_unlock(&mutex);
        sem_post(&barber_ready);        // Barber is ready
        cut_hair();
    }
}

void *customer_thread(void *arg) {
    pthread_mutex_lock(&mutex);
    if (waiting < NUM_CHAIRS) {
        waiting++;
        sem_post(&customers);           // Wake barber if sleeping
        pthread_mutex_unlock(&mutex);
        sem_wait(&barber_ready);        // Wait for barber
        get_haircut();
    } else {
        pthread_mutex_unlock(&mutex);   // No seats, leave
    }
}
```

---

## 7. Deadlock

### Coffman Conditions

All **four** conditions must hold simultaneously for a deadlock to occur:

| Condition | Description |
|-----------|-------------|
| **1. Mutual Exclusion** | At least one resource is held in non-shareable mode |
| **2. Hold and Wait** | A thread holds at least one resource while waiting for another |
| **3. No Preemption** | Resources cannot be forcibly taken away from a thread |
| **4. Circular Wait** | A circular chain of threads, each waiting for a resource held by the next |

```
Circular Wait Example:

  Thread A ──holds──▶ Resource 1
     │                    ▲
     │                    │
   waits               holds
     │                    │
     ▼                    │
  Resource 2 ◀──holds── Thread B
```

### Deadlock Handling Strategies

#### Prevention (Break a Coffman Condition)

| Condition to Break | Strategy | Trade-off |
|-------------------|----------|-----------|
| Mutual Exclusion | Use shareable resources (read-only, lock-free structures) | Not always possible |
| Hold and Wait | Request all resources at once before starting | Low resource utilization, may cause starvation |
| No Preemption | If a thread can't get a resource, release everything and retry | Complex, risk of livelock |
| Circular Wait | **Impose a total ordering** on resources; always acquire in order | Most practical; widely used |

#### Avoidance (Banker's Algorithm)

The system maintains knowledge of maximum resource needs and only grants requests if the resulting state is **safe** (i.e., there exists at least one execution order that allows all threads to finish).

```
Banker's Algorithm Example:
3 resources (A=10, B=5, C=7), 5 processes

              Allocation    Max       Need (Max-Alloc)
              A  B  C      A  B  C    A  B  C
  P0          0  1  0      7  5  3    7  4  3
  P1          2  0  0      3  2  2    1  2  2
  P2          3  0  2      9  0  2    6  0  0
  P3          2  1  1      2  2  2    0  1  1
  P4          0  0  2      4  3  3    4  3  1

Available: A=3, B=3, C=2

Safe sequence: P1 → P3 → P4 → P2 → P0 ✓
(Each process can finish with Available + Allocation of completed processes)
```

:::info
The Banker's algorithm is mainly theoretical — real systems rarely know maximum resource needs in advance. It's important for interviews but not used in production OS scheduling.
:::

#### Detection and Recovery

- **Detection:** Build a wait-for graph; cycle = deadlock
- **Recovery:**
  - Kill one or more deadlocked processes
  - Preempt resources from a process and roll it back
  - Choose the victim with the least cost (least work done, fewest resources held)

### Resource Allocation Graph

```
No Deadlock:                    Deadlock:
                                
  P1 ──req──▶ R1 ──assign──▶ P2     P1 ──req──▶ R1 ──assign──▶ P2
                                      ▲                          │
  (P1 wants R1, P2 holds R1,         │                         req
   no cycle → no deadlock)            │                          │
                                   assign                        ▼
                                      │                         R2
                                      P1 ◀──────────────────────┘
                                   (Cycle → DEADLOCK!)
```

---

## 8. Livelock and Starvation

| Problem | Description | Example |
|---------|-------------|---------|
| **Livelock** | Threads keep changing state in response to each other but make no progress | Two people in a hallway, both step aside in the same direction repeatedly |
| **Starvation** | A thread is perpetually denied access to a resource | Low-priority thread never runs because high-priority threads keep arriving |

**Livelock example:**

```c
// Thread A                        // Thread B
while (1) {                        while (1) {
    lock(lockA);                       lock(lockB);
    if (!trylock(lockB)) {             if (!trylock(lockA)) {
        unlock(lockA);   // Back off       unlock(lockB);   // Back off
        // Both back off simultaneously and retry → livelock!
    }
}
```

**Solution:** Add randomized backoff (jitter) so threads don't retry at the exact same time.

---

## 9. Lock-Free Data Structures

Lock-free algorithms use **CAS** (compare-and-swap) instead of locks. At least one thread always makes progress, even if others are suspended.

### Lock-Free Stack (Treiber Stack)

```c
typedef struct Node {
    int data;
    struct Node *next;
} Node;

_Atomic(Node*) top = NULL;

void push(int val) {
    Node *new_node = malloc(sizeof(Node));
    new_node->data = val;
    Node *old_top;
    do {
        old_top = atomic_load(&top);
        new_node->next = old_top;
    } while (!atomic_compare_exchange_weak(&top, &old_top, new_node));
}

int pop(int *val) {
    Node *old_top;
    do {
        old_top = atomic_load(&top);
        if (old_top == NULL) return 0;  // Empty
    } while (!atomic_compare_exchange_weak(&top, &old_top, old_top->next));
    *val = old_top->data;
    free(old_top);  // Careful: ABA problem possible here
    return 1;
}
```

:::warning ABA Problem
Thread reads value A, another thread changes it to B then back to A. CAS succeeds (sees A) but the data structure has changed. Solutions: **hazard pointers**, **epoch-based reclamation**, or **tagged pointers** (pack a counter with the pointer).
:::

### Lock-Free Progress Guarantees

| Guarantee | Definition |
|-----------|-----------|
| **Wait-free** | Every thread completes in bounded steps (strongest) |
| **Lock-free** | At least one thread makes progress (system-wide progress) |
| **Obstruction-free** | A thread makes progress if run in isolation (weakest) |

---

## 10. Java Concurrency Primitives

| Primitive | Description | Use Case |
|-----------|-------------|----------|
| `synchronized` | Monitor-based mutual exclusion | Simple critical sections |
| `ReentrantLock` | Explicit lock with tryLock, fairness, conditions | Fine-grained control |
| `ReadWriteLock` | Concurrent reads, exclusive writes | Read-heavy workloads |
| `StampedLock` | Optimistic read locking (Java 8+) | Ultra-high-read workloads |
| `CountDownLatch` | One-time barrier — count down to zero, then release all waiters | Wait for N tasks to complete |
| `CyclicBarrier` | Reusable barrier — N threads must all arrive before any proceed | Phased computation |
| `Semaphore` | Counting semaphore | Rate limiting, resource pools |
| `Phaser` | Flexible barrier with dynamic registration | Advanced phased tasks |
| `CompletableFuture` | Composable async computations | Non-blocking pipelines |
| `AtomicInteger/Long/Reference` | Lock-free atomic operations via CAS | Counters, flags |

```java
// CompletableFuture pipeline
CompletableFuture.supplyAsync(() -> fetchUser(userId))
    .thenApplyAsync(user -> enrichWithProfile(user))
    .thenApplyAsync(user -> calculateRecommendations(user))
    .thenAcceptAsync(recs -> sendNotification(recs))
    .exceptionally(ex -> { log.error("Failed", ex); return null; });
```

```java
// CountDownLatch: main thread waits for 3 workers
CountDownLatch latch = new CountDownLatch(3);

for (int i = 0; i < 3; i++) {
    executor.submit(() -> {
        doWork();
        latch.countDown();
    });
}

latch.await();  // Blocks until count reaches 0
System.out.println("All workers done!");
```

---

## 🔥 Interview Questions

### Conceptual

1. **What is a race condition? Give a real-world example.** (Database double-spending, check-then-act on file existence.)
2. **Explain the difference between mutex and semaphore.** (Ownership, priority inheritance, use cases.)
3. **What are the four Coffman conditions for deadlock?** Can you break each one?
4. **Why use `while` instead of `if` with condition variables?** (Spurious wakeups + multiple waiters competing.)
5. **When would you choose a spinlock over a mutex?** (Very short critical sections, kernel context, real-time systems.)

### Design

6. **Design a thread-safe LRU cache.** (Hash map + doubly-linked list with a ReentrantReadWriteLock or `ConcurrentHashMap` + `synchronized` eviction.)
7. **How would you implement a rate limiter that's thread-safe?** (Token bucket with AtomicLong for CAS-based token replenishment.)
8. **How does `java.util.concurrent.ConcurrentHashMap` avoid locking the entire map?** (Segment-level locking in Java 7, CAS + synchronized on bins in Java 8+.)

### Scenario-Based

9. **How would you debug a deadlock in production?** (Thread dump via `jstack`/`kill -3`, look for "waiting to lock" cycles. Use `jcmd Thread.print`. In Linux: `/proc/<pid>/stack` or `gdb`.)
10. **Your application has high lock contention. How do you reduce it?** (Reduce critical section size, use read-write locks, partition data, use lock-free structures, use thread-local storage.)

### Quick Recall

| Question | Answer |
|----------|--------|
| CAS stands for | Compare-And-Swap |
| Java keyword for monitor | `synchronized` |
| POSIX condition variable wait | `pthread_cond_wait()` |
| Deadlock requires how many conditions? | All 4 (Coffman conditions) |
| Lock-free vs wait-free | Lock-free: system progress guaranteed. Wait-free: per-thread progress guaranteed. |
| ABA problem solution | Hazard pointers, epoch-based reclamation, tagged pointers |
