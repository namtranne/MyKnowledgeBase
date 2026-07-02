---
sidebar_position: 8
title: "07 — Common Interview Questions"
slug: 07-interview-questions
---

# 🚀 Common Interview Questions

A curated collection of operating systems questions frequently asked in senior software engineer interviews, with detailed answers, code solutions, and debugging scenarios.

:::tip 🛠️ Answer From Experience, Not Just Theory
The strongest interview answers connect the concept to something you've actually done or debugged. As you work through these, pull from the **🛠️ Applying This in Your SE Role** sections and **🔥 War Stories** in each chapter — "context switches are expensive *because* of cold caches, which is why I size thread pools to core count and once watched an unbounded pool OOM a service at peak" lands far better than a textbook definition. The scenario questions below are deliberately phrased the way they'd come up on the job.
:::

---

## 🎯 What Interviewers Actually Ask (Ranked by Frequency)

For most software engineering roles — especially backend — OS questions rarely look like *"define paging."* They're framed as **practical problems**: *"your service is slow / leaking / falling over — what's happening and how do you fix it?"* Here's what actually comes up, weighted by frequency for dev-focused interviews.

### 🟢 Tier 1 — Nearly always asked

| Topic | How it's practically framed | Chapter |
|-------|-----------------------------|---------|
| **Processes, threads & concurrency** | "Threads vs processes vs async for this workload?" · "How many threads would you give it?" · "Why does this service OOM under load?" | [01](./01-process-thread-management) |
| **Synchronization** (races, deadlocks, locks) | "Fix this race condition" · "Two DB transactions deadlock — why, and how do you prevent it?" · "Reduce lock contention" | [04](./04-synchronization-deadlocks) |

### 🟡 Tier 2 — Common (backend / performance roles)

| Topic | How it's practically framed | Chapter |
|-------|-----------------------------|---------|
| **Memory management** | "Why was the container OOMKilled when heap looked fine?" · "Stack vs heap" · cache locality: "why do arrays beat linked lists?" | [03](./03-memory-management) |
| **I/O models** | "How does Node/nginx/Redis handle 100K connections on a few threads?" · blocking vs non-blocking vs epoll | [05](./05-file-systems-io) |

### 🔴 Tier 3 — Senior / infra / SRE-leaning roles

| Topic | How it's practically framed | Chapter |
|-------|-----------------------------|---------|
| **Context-switching cost & scheduling** | The *why* behind thread-pool sizing and container CPU **throttling** (low avg CPU but bad p99) | [02](./02-cpu-scheduling) |
| **Linux production debugging** | "Investigate high CPU / a memory leak / FD exhaustion" (`top`, `perf`, `strace`, `lsof`); signals & graceful shutdown | [06](./06-linux-internals) |

:::tip The Through-Line
Interviewers want to see you connect a **symptom** (latency spike, OOM, deadlock, connection/port exhaustion) to the underlying **OS mechanism** and a **concrete fix**. Definitions get you a pass; the symptom → mechanism → fix chain is what signals seniority. The practical questions in [§3](#3-scenario-based-questions) below are phrased exactly this way.
:::

---

## 1. Conceptual Questions

### Q1: Explain the difference between a process and a thread

**Answer:**

A **process** is an independent program in execution with its own address space (code, data, heap, stack), file descriptors, and security credentials. A **thread** is a lightweight execution unit within a process that shares the process's address space and resources but has its own stack, program counter, and register set.

**Key trade-offs:**

| Factor | Process | Thread |
|--------|---------|--------|
| Creation cost | ~100 μs (fork + COW) | ~10 μs (just stack + TCB) |
| Context switch | Expensive (TLB flush, cache cold) | Cheaper (shared address space) |
| Communication | IPC required (pipes, sockets) | Direct shared memory |
| Isolation | Strong (separate address space) | Weak (one thread crashes all) |
| Memory overhead | Several MB per process | Several KB–MB per thread (stack) |

**When to use processes:** security isolation (Chrome tabs), fault tolerance (microservices), leveraging fork+exec.  
**When to use threads:** shared-state concurrency, lower overhead, tight coupling between tasks.

---

### Q2: What happens when you type a URL in a browser (OS perspective)

**Answer:**

```
1. KEYBOARD INPUT
   - Hardware interrupt → kernel keyboard driver
   - Characters buffered, delivered to browser process

2. DNS RESOLUTION
   - Browser calls getaddrinfo() → glibc resolver
   - Checks /etc/hosts, then DNS resolver cache
   - socket() + sendto() → UDP packet to DNS server (port 53)
   - Kernel: routing table lookup, ARP for gateway MAC
   - NIC sends packet → DNS response arrives → interrupt → kernel → user space

3. TCP CONNECTION
   - socket(AF_INET, SOCK_STREAM, 0) → file descriptor allocated
   - connect() → kernel sends SYN packet (3-way handshake: SYN → SYN-ACK → ACK)
   - Kernel allocates TCP control block, socket buffers

4. TLS HANDSHAKE (if HTTPS)
   - User-space TLS library (OpenSSL) performs handshake
   - Multiple read()/write() syscalls for certificate exchange
   - CPU-intensive: asymmetric crypto for key exchange

5. HTTP REQUEST
   - write() syscall → data copied to kernel socket buffer
   - Kernel segments into TCP packets, sends via NIC (DMA)

6. RESPONSE RECEIVED
   - NIC receives packets → hardware interrupt → kernel → TCP reassembly
   - Data available in socket buffer → epoll/kqueue wakes browser thread
   - read() syscall → data copied to user-space buffer

7. RENDERING
   - HTML parsing, DOM construction (user-space computation)
   - Additional requests for CSS, JS, images (repeat steps 3-6)
   - GPU rendering: ioctl() calls to GPU driver
   - Display: framebuffer written via DRM/KMS → compositor → screen
```

---

### Q3: How does virtual memory work?

**Answer:**

Virtual memory gives each process the illusion of having a **large, contiguous, private** address space. The key mechanisms:

1. **Address translation:** Every memory access goes through the MMU (Memory Management Unit), which translates virtual addresses to physical addresses using **page tables**
2. **Paging:** Virtual and physical memory are divided into fixed-size **pages** (typically 4 KB). The page table maps virtual page numbers to physical frame numbers
3. **TLB caching:** The TLB caches recent translations to avoid the expensive page table walk on every access (hit rate >99%)
4. **Demand paging:** Pages are loaded into physical memory only when accessed. Accessing an unmapped page triggers a **page fault**, and the kernel loads it from disk
5. **Swap space:** When physical memory is full, the kernel evicts (swaps out) less-used pages to disk, freeing frames for active pages

**Benefits:** process isolation, memory larger than physical RAM, shared libraries mapped once, simplified memory allocation, COW optimization for fork().

---

### Q4: Explain deadlock and how to prevent it

**Answer:**

A **deadlock** occurs when two or more threads are permanently blocked, each waiting for a resource held by another thread in the group. Four conditions (Coffman conditions) must all hold:

1. **Mutual exclusion** — resources are non-shareable
2. **Hold and wait** — threads hold resources while waiting for more
3. **No preemption** — resources can't be forcibly taken
4. **Circular wait** — a cycle of threads, each waiting for the next

**Prevention strategies** (break at least one condition):
- **Break circular wait** (most practical): impose a total ordering on locks and always acquire in order. If you need locks A, B, C, always lock in alphabetical order.
- **Break hold and wait:** acquire all locks atomically upfront (try-lock all or release all and retry)
- **Break no preemption:** use `tryLock()` with timeout; release all locks on failure and retry with backoff
- **Break mutual exclusion:** use lock-free data structures (CAS-based), read-write locks, or immutable data

---

### Q5: What is a context switch and why is it expensive?

**Answer:**

A context switch saves the state (registers, program counter, stack pointer) of the currently running process/thread and loads the state of the next one.

**Direct costs (~1–10 μs):**
- Save/restore CPU registers to/from PCB/TCB
- Switch kernel stack
- For process switches: switch page tables (CR3 register on x86), flush TLB

**Indirect costs (dominant, 10–1000+ μs):**
- **TLB flush:** all cached virtual-to-physical translations are invalidated (for process switches). The new process starts with TLB misses until its working set is cached
- **Cache pollution:** L1/L2/L3 cache contents are for the old process. The new process suffers cache misses as it warms up
- **Branch predictor pollution:** CPU branch prediction tables are trained for the old process

**Thread switches within the same process are cheaper** — no TLB flush or page table switch needed. This is a major reason threads are preferred for concurrent tasks within an application.

---

### Q6: How does the kernel handle a page fault?

**Answer:**

```
1. CPU executes instruction that accesses virtual address V
2. MMU checks TLB → miss → walks page table
3. Page Table Entry (PTE) shows valid bit = 0 → PAGE FAULT trap
4. CPU switches to kernel mode, saves faulting address in CR2 register (x86)
5. Kernel page fault handler runs:

   a. Check if address V is valid (within process's mapped regions)
      - Invalid → SIGSEGV (segmentation fault) → process killed
      - Valid → continue

   b. Check protection bits (e.g., writing to read-only page)
      - Violation → SIGSEGV
      - COW page → copy the page, update PTE, resume

   c. Page is valid but not in memory (demand paging):
      - Find a free physical frame (or evict a victim page)
      - If victim is dirty, write it to swap first
      - Read the faulted page from disk (swap or file)
      - Update PTE: set frame number, valid bit = 1
      - Flush TLB entry for this address

6. Kernel returns to user mode
7. CPU re-executes the faulting instruction (now succeeds)
```

**Minor vs Major fault:**
- **Minor:** page is in page cache but not mapped (just update PTE, ~1 μs)
- **Major:** page must be read from disk (~1–10 ms, 1000× slower)

---

### Q7: Explain the Linux boot process

**Answer:**

```
1. BIOS/UEFI
   - Power-On Self Test (POST)
   - Initialize hardware, find boot device
   - UEFI loads EFI bootloader from ESP (EFI System Partition)

2. BOOTLOADER (GRUB2)
   - Loads kernel image (vmlinuz) and initramfs into memory
   - Passes kernel parameters (root=, quiet, etc.)
   - Transfers control to kernel

3. KERNEL INITIALIZATION
   - Decompresses itself, sets up MMU and page tables
   - Initializes core subsystems: memory manager, scheduler, VFS
   - Mounts initramfs as temporary root filesystem
   - Loads essential drivers (disk, filesystem drivers)
   - Finds and mounts the real root filesystem
   - Executes /sbin/init (PID 1)

4. INIT SYSTEM (systemd)
   - PID 1 — parent of all processes
   - Reads unit files, resolves dependencies
   - Starts services in parallel (network, logging, dbus, etc.)
   - Reaches default target (multi-user.target or graphical.target)

5. USER SPACE
   - Login manager (getty/GDM/LightDM) → user session
   - Shell or desktop environment starts
```

---

## 2. Coding-Style Questions

### Q8: Implement a thread-safe singleton

```java
public class Singleton {
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                    // First check (no locking)
            synchronized (Singleton.class) {
                if (instance == null) {            // Second check (with lock)
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

:::tip Why `volatile`?
Without `volatile`, the JVM can reorder instructions: the `instance` reference may be assigned before the constructor finishes. Another thread could see a non-null but partially-constructed object. `volatile` prevents this reordering.

**Better alternative in Java:** Use an enum singleton or the initialization-on-demand holder idiom:
```java
public class Singleton {
    private Singleton() {}

    private static class Holder {
        static final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        return Holder.INSTANCE;  // Class loaded lazily, thread-safe by JVM spec
    }
}
```
:::

---

### Q9: Implement producer-consumer with mutex and condition variable

```c
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

#define BUFFER_SIZE 5

int buffer[BUFFER_SIZE];
int count = 0;
int in = 0, out = 0;

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full = PTHREAD_COND_INITIALIZER;
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;

void *producer(void *arg) {
    for (int i = 0; i < 20; i++) {
        pthread_mutex_lock(&mutex);

        while (count == BUFFER_SIZE) {
            pthread_cond_wait(&not_full, &mutex);
        }

        buffer[in] = i;
        in = (in + 1) % BUFFER_SIZE;
        count++;
        printf("Produced: %d (count: %d)\n", i, count);

        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

void *consumer(void *arg) {
    for (int i = 0; i < 20; i++) {
        pthread_mutex_lock(&mutex);

        while (count == 0) {
            pthread_cond_wait(&not_empty, &mutex);
        }

        int item = buffer[out];
        out = (out + 1) % BUFFER_SIZE;
        count--;
        printf("Consumed: %d (count: %d)\n", item, count);

        pthread_cond_signal(&not_full);
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

int main() {
    pthread_t prod, cons;
    pthread_create(&prod, NULL, producer, NULL);
    pthread_create(&cons, NULL, consumer, NULL);
    pthread_join(prod, NULL);
    pthread_join(cons, NULL);
    return 0;
}
```

---

### Q10: Implement a reader-writer lock

```java
public class ReadWriteLock {
    private int readers = 0;
    private int writers = 0;
    private int writeRequests = 0;

    public synchronized void lockRead() throws InterruptedException {
        while (writers > 0 || writeRequests > 0) {
            wait();
        }
        readers++;
    }

    public synchronized void unlockRead() {
        readers--;
        notifyAll();
    }

    public synchronized void lockWrite() throws InterruptedException {
        writeRequests++;
        while (readers > 0 || writers > 0) {
            wait();
        }
        writeRequests--;
        writers++;
    }

    public synchronized void unlockWrite() {
        writers--;
        notifyAll();
    }
}
```

:::info Design Choice
This implementation gives **write-preference**: pending write requests block new readers (checking `writeRequests > 0`). This prevents writer starvation but may starve readers under heavy write load. The choice depends on your workload.
:::

---

### Q11: Implement a simple thread pool

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class ThreadPool {
    private final BlockingQueue<Runnable> taskQueue;
    private final Thread[] workers;
    private volatile boolean isShutdown = false;

    public ThreadPool(int numThreads, int queueCapacity) {
        taskQueue = new LinkedBlockingQueue<>(queueCapacity);
        workers = new Thread[numThreads];

        for (int i = 0; i < numThreads; i++) {
            workers[i] = new Thread(() -> {
                while (!isShutdown || !taskQueue.isEmpty()) {
                    try {
                        Runnable task = taskQueue.poll(100, java.util.concurrent.TimeUnit.MILLISECONDS);
                        if (task != null) {
                            task.run();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    } catch (Exception e) {
                        System.err.println("Task failed: " + e.getMessage());
                    }
                }
            }, "pool-worker-" + i);
            workers[i].start();
        }
    }

    public void submit(Runnable task) throws InterruptedException {
        if (isShutdown) throw new IllegalStateException("Pool is shut down");
        taskQueue.put(task);
    }

    public void shutdown() {
        isShutdown = true;
        for (Thread worker : workers) {
            try {
                worker.join(5000);
            } catch (InterruptedException e) {
                worker.interrupt();
            }
        }
    }
}
```

---

## 3. Scenario-Based Questions

### Q12: Your server is running out of memory — how do you diagnose?

**Step-by-step approach:**

```bash
# 1. Confirm the problem
free -h                                  # Overall memory usage
dmesg | grep -i "oom\|killed"           # OOM kills?
cat /proc/meminfo                        # Detailed breakdown

# 2. Find the memory hog
ps aux --sort=-%mem | head -20           # Top processes by memory
top -o %MEM                              # Real-time, sorted by memory

# 3. Investigate the suspect process
pmap -x <pid>                            # Detailed memory map
cat /proc/<pid>/status | grep -i vm      # VmRSS, VmSize, etc.
cat /proc/<pid>/smaps_rollup             # Summarized memory stats

# 4. Check for memory leaks
#    For C/C++: run with valgrind or ASan
#    For Java: take heap dump
jmap -dump:live,format=b,file=heap.hprof <pid>
#    Analyze with Eclipse MAT or jhat

# 5. Check page cache usage
cat /proc/meminfo | grep -i cache        # Buffers + Cached
# Large cache is normal — kernel uses free RAM for caching
# Drop caches if needed (not recommended in production):
# echo 3 > /proc/sys/vm/drop_caches

# 6. Check swap
swapon --show                            # Swap devices and usage
vmstat 1                                 # si/so columns = swap activity
```

:::tip Common Causes
- **Memory leak** in application (growing RSS over time)
- **Too many processes** or **threads** (each has stack overhead)
- **Page cache pressure** from heavy file I/O
- **Memory-mapped files** consuming address space
- **Container memory limit** too low for the workload
:::

---

### Q13: A process is using 100% CPU — how do you investigate?

```bash
# 1. Identify the process
top                                      # Sort by CPU (default)
ps aux --sort=-%cpu | head -10

# 2. Check what it's doing at the OS level
strace -c -p <pid>                       # Syscall summary (is it doing I/O? spinning?)
strace -p <pid>                          # Live syscalls

# 3. Check thread-level CPU
top -H -p <pid>                          # Per-thread CPU usage
ps -T -p <pid>                           # List threads

# 4. Profile the code
perf record -g -p <pid> -- sleep 10      # CPU sampling with call graphs
perf report                              # Find hot functions
# Generate flame graph:
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

# 5. For Java applications
jstack <pid>                             # Thread dump — look for RUNNABLE threads
jcmd <pid> Thread.print                  # Alternative thread dump
# Take multiple thread dumps 5 seconds apart to find stuck threads:
for i in 1 2 3; do jstack <pid> > dump_$i.txt; sleep 5; done

# 6. Common causes
# - Infinite loop or busy-wait spin
# - Uncontrolled recursion
# - GC storm (check with jstat -gc <pid>)
# - Regex catastrophic backtracking
# - Hash collision causing O(n) lookups
```

---

### Q14: How would you debug a deadlock in production?

```bash
# 1. For Java applications
jstack <pid>                             # Look for "Found one Java-level deadlock"
jcmd <pid> Thread.print                  # Detailed thread dump
# jstack output will explicitly show:
# "Thread-1" waiting to lock 0xabc (held by "Thread-2")
# "Thread-2" waiting to lock 0xdef (held by "Thread-1")

# 2. For C/C++/pthreads
gdb -p <pid>                             # Attach debugger
# (gdb) info threads                     # List all threads
# (gdb) thread apply all bt              # Backtrace of every thread
# Look for threads blocked on pthread_mutex_lock

# 3. For Linux kernel/general
cat /proc/<pid>/stack                    # Kernel stack of each thread
cat /proc/<pid>/wchan                    # What the process is waiting on
cat /proc/<pid>/status | grep State      # D = uninterruptible sleep

# 4. Prevention going forward
# - Use lock ordering (always acquire locks in the same global order)
# - Use tryLock with timeout
# - Use lock-free data structures where possible
# - Use JMX monitoring for lock contention in Java
# - Implement deadlock detection (cycle in wait-for graph)
```

---

### Q15: System is slow — how to distinguish CPU-bound vs I/O-bound?

```bash
# 1. Quick overview
top                                      # Look at %CPU, %wa (I/O wait)
vmstat 1 5                               # Key columns: us, sy, wa, id
#   us = user CPU, sy = system CPU, wa = I/O wait, id = idle
#   High wa% → I/O bound
#   High us% + sy% → CPU bound
#   High id% → neither (look for network/lock contention)

# 2. I/O investigation
iostat -x 1                              # %util > 80% → disk is bottleneck
                                         # await > 10ms on SSD → I/O latency issue
iotop                                    # Per-process I/O

# 3. CPU investigation
mpstat -P ALL 1                          # Per-core CPU usage
perf top                                 # Real-time CPU profiling

# 4. Decision matrix
```

| Indicator | CPU-Bound | I/O-Bound | Lock Contention |
|-----------|----------|-----------|-----------------|
| `top` %CPU | High (>90%) | Low/Medium | Medium |
| `top` %wa | Low | High (>20%) | Low |
| `iostat` %util | Low | High (>80%) | Low |
| `vmstat` run queue (r) | High | Low | Low |
| `vmstat` blocked (b) | Low | High | Possibly high |
| Threads in `RUNNABLE` | Many | Few | Few (most `BLOCKED`) |
| `perf top` | Hot user functions | Syscalls (read/write) | Lock functions (futex) |

---

## 3b. Practical & Optimization Questions

These are the "related to actual software development" questions — the ones where the interviewer wants to see you turn OS theory into a performance or scaling decision.

### Q16: How do you size a thread pool?

**Answer:** Start by classifying the work, because the two cases have opposite answers:

- **CPU-bound** (hashing, compression, parsing, computation): `pool size ≈ number of cores`. Adding threads beyond core count doesn't add throughput — the extra threads just fight for the CPU and you pay the **context-switch + cold-cache tax** on every switch.
- **I/O-bound** (DB calls, HTTP fan-out): threads spend most of their time blocked, so you can go higher. **Little's Law** gives the target: `threads ≈ target_throughput × avg_latency`. Example: 500 req/s × 0.2 s average latency ≈ 100 threads.

**Watch out for:**

- **Mixing CPU-bound and I/O-bound work in one pool** starves both — give them separate pools.
- **Inside containers**, the runtime may see the *host's* core count, not your cgroup limit, and size pools far too large. Set `GOMAXPROCS` / `-XX:ActiveProcessorCount` to the cgroup CPU limit.
- **Downstream capacity:** a huge DB connection pool doesn't add throughput once you exceed what the database can execute in parallel — it just moves congestion into the DB.

> **Senior signal:** "I'd measure, not guess — but my starting point is `cores` for CPU-bound and `throughput × latency` for I/O-bound, with separate pools per workload class and a bounded queue with backpressure so a spike sheds load instead of spawning threads."

---

### Q17: A hot loop is slow even though the algorithm is O(n). How do you speed it up?

**Answer:** When the Big-O is already good, the bottleneck is usually the **memory hierarchy**, not instruction count. A cache miss to DRAM (~100 ns) is ~100× an L1 hit (~1 ns), so *how* you touch memory dominates.

- **Improve spatial locality:** iterate contiguous memory (arrays / `ArrayList`) instead of pointer-chasing structures (linked lists, node-based trees) so each cache line you pull in is fully used. This is why an array scan crushes a linked-list scan even at the same O(n).
- **Struct-of-arrays over array-of-structs** when you only touch a few fields in a hot loop — you stop dragging unused fields through the cache.
- **Access matrices in row-major order** to walk memory sequentially and let the hardware prefetcher work; column-major traversal misses on nearly every access.
- **Watch false sharing** in multithreaded code: two threads writing different variables that share a cache line ping-pong that line between cores. Pad/align to 64 bytes.
- **Reduce allocations** in the hot path — fresh allocations scatter data and thrash the cache; reuse buffers.

> **Senior signal:** "Profile first (`perf stat` for cache-misses). If the algorithm is already optimal, I'd look at data layout and access patterns — locality often buys more than micro-optimizing the code, because we're memory-bound, not compute-bound."

---

### Q18: How does a single-threaded server (Node.js, nginx, Redis) handle 100K concurrent connections?

**Answer:** With **I/O multiplexing** (`epoll` on Linux / `kqueue` on BSD) driving an **event loop**, not a thread per connection. One thread blocks in `epoll_wait`; the kernel returns only the sockets that are *ready*; the thread services them and loops. Because most connections are idle at any instant, one thread can shepherd tens of thousands cheaply — whereas thread-per-connection would need 100K threads (~100 GB of stacks) and drown in context switches. This is the solution to the **C10K problem**.

**The catch you must mention:** you can **never block the event loop**. One synchronous DB call, slow file read, or CPU-heavy operation freezes *every* connection that thread is multiplexing. That's why Redis avoids O(N) commands like `KEYS *` (use `SCAN`), and why Node/Netty offload blocking work to a separate worker pool.

> **Senior signal:** connect it to the trade-off — event loops give massive I/O concurrency but demand non-blocking discipline; a CPU-bound workload is still better served by a thread pool sized to cores.

---

### Q19: Your pod's average CPU is 30% but p99 latency is terrible, and it occasionally gets OOMKilled. What's going on?

**Answer:** Two classic container pitfalls, both rooted in cgroups:

**CPU throttling (the latency half).** A CPU *limit* is a hard **CFS bandwidth quota** (`cpu.cfs_quota_us`), not a soft target. If a burst of work briefly exceeds the quota, the kernel **freezes every thread in the cgroup until the next 100 ms period** — even if the node has idle cores. Averaged over a minute the CPU looks idle (30%); at 100 ms resolution the app is repeatedly paused mid-request, wrecking the tail. **Confirm** with `container_cpu_cfs_throttled_periods_total`; **fix** by raising/removing the limit and right-sizing from actual burst, not average.

**OOMKill (the memory half).** The cgroup limits **RSS**, not your language's heap. A JVM with a comfortable `-Xmx` can still be killed because thread stacks, metaspace, JIT code cache, and **native/off-heap buffers** (e.g., Netty direct byte buffers) all count toward RSS. **Confirm** by watching `container_memory_working_set_bytes` climb while heap stays flat — the gap is off-heap memory. **Fix** by budgeting the memory limit for total RSS (heap + native), capping `-XX:MaxDirectMemorySize`, and fixing any native-buffer leak.

> **Senior signal:** "Low *average* CPU tells you nothing about sub-second throttling, and 'heap looks fine' tells you nothing about RSS — the container enforces quota and RSS, so I'd look at throttled-periods and working-set metrics, not the averages on the main dashboard."

---

## 4. Key Numbers to Remember

### System Performance

| Metric | Typical Value |
|--------|--------------|
| Context switch time | 1–10 μs (direct) + cache effects |
| System call overhead | 100–200 ns |
| Thread creation time | ~10 μs |
| Process creation time (fork) | ~100 μs |
| Page fault (minor) | ~1 μs |
| Page fault (major, SSD) | ~100 μs |
| Page fault (major, HDD) | ~10 ms |

### Memory

| Metric | Typical Value |
|--------|--------------|
| L1 cache latency | ~1 ns |
| L2 cache latency | ~4 ns |
| L3 cache latency | ~10 ns |
| DRAM latency | ~100 ns |
| SSD random read | ~16 μs |
| HDD seek | ~2–10 ms |
| Page size | 4 KB (default), 2 MB / 1 GB (huge pages) |
| Thread stack size | 8 MB (Linux default) |
| Goroutine stack | 2–8 KB (growable) |

### Networking

| Metric | Typical Value |
|--------|--------------|
| Localhost round-trip | ~0.05 ms |
| Same-datacenter round-trip | ~0.5 ms |
| Cross-region round-trip | ~50–150 ms |
| TCP handshake | 1 RTT (SYN + SYN-ACK + ACK) |
| TLS handshake | 1–2 additional RTTs |
| Bandwidth (1 GbE) | ~125 MB/s |
| Bandwidth (10 GbE) | ~1.25 GB/s |

### Linux Limits

| Limit | Default | Max Configurable |
|-------|---------|-----------------|
| Open file descriptors (per process) | 1024 | 1,048,576+ |
| PIDs | 32768 | 4,194,304 |
| Threads per process | ~32K (limited by memory) | Depends on memory |
| TCP connections | Limited by FDs and ports | ~1M+ with tuning |
| Ephemeral port range | 32768–60999 | 1024–65535 |

---

## 5. Interview Cheat Sheet

:::tip Top 10 Things to Know Cold
1. **Process vs Thread** — memory isolation, creation cost, context switch cost
2. **Virtual memory** — page tables, TLB, page faults, demand paging
3. **Page replacement** — LRU, Clock algorithm, thrashing
4. **Synchronization** — mutex vs semaphore, CAS, condition variables
5. **Deadlock** — four conditions, prevention (lock ordering), detection
6. **CPU scheduling** — CFS/MLFQ, preemptive vs cooperative, nice values
7. **I/O multiplexing** — epoll (Linux), kqueue (macOS), edge vs level triggered
8. **Containers** — cgroups (resource limits) + namespaces (isolation)
9. **System calls** — fork/exec/wait, how user→kernel transition works
10. **Memory hierarchy** — latency numbers (L1 → DRAM → SSD → HDD → network)
:::

:::warning Common Mistakes in Interviews
- Confusing **concurrency** (interleaving) with **parallelism** (simultaneous)
- Using `if` instead of `while` with condition variables
- Forgetting that **spinlocks burn CPU** — only use for very short critical sections
- Not mentioning **cache effects** when discussing context switch cost
- Saying "mutex and semaphore are the same" — they differ in ownership
- Forgetting that `fork()` in a multi-threaded program only copies the calling thread
:::
