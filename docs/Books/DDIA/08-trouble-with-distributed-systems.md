# Chapter 8 — The Trouble with Distributed Systems

This chapter catalogs everything that goes wrong in distributed systems. Understanding these failure modes is essential for building systems that handle them correctly.

**Core insight:** a distributed system is fundamentally different from a single-machine program. On a single machine, things either work or they don't. In a distributed system, **some parts can be broken while others work** — and you may not even be able to tell which.

---

## Faults and Partial Failures

### Single Machine vs Distributed System

**Single machine:** deterministic. Given the same inputs, the same operation always produces the same output. Hardware failures usually cause total failure (kernel panic, blue screen) — by design, because a half-working computer that gives wrong results is worse than one that obviously crashes.

**Distributed system:** **nondeterministic partial failures**. Some parts work, some fail, some are slow, some give wrong answers — and you can't reliably tell which is which from any single vantage point. The system may be in a state that has never been tested or anticipated.

### Cloud Computing vs Supercomputing

| Approach | Philosophy | How Faults Are Handled |
|----------|-----------|----------------------|
| **Supercomputing (HPC)** | Treat the cluster like a single large computer. Checkpoint computation regularly. If any node fails, stop everything, restore from checkpoint, restart. | Works for batch computation; unacceptable for interactive services (users can't wait for a restart) |
| **Cloud / Internet services** | Accept that faults are continuous. Build systems that tolerate partial failure. Serve users 24/7 with no planned downtime. | Must handle faults gracefully at every layer — the focus of this book |

**Key differences in cloud environments:**
- Nodes are built from commodity hardware — higher individual failure rate
- Communication via IP networks (variable latency, no guaranteed bandwidth)
- Geographic distribution (multiple datacenters)
- Shared infrastructure (noisy neighbors — someone else's job can degrade your performance)
- Nodes can be terminated without warning (cloud provider maintenance, spot instances)

---

## Unreliable Networks

Distributed systems communicate via **asynchronous packet networks** — the internet, datacenter Ethernet, etc. These are fundamentally unreliable.

### What Can Go Wrong

When you send a request over the network:

```
Client ──── request ────▶ ???
       ◀──── ??? ────── Server

Possible outcomes:
1. Request is lost (never reaches server)
2. Request is waiting in a queue (will eventually arrive)
3. Server has crashed (request is never processed)
4. Server is alive but too slow to respond (overloaded, GC pause)
5. Server processed the request but the response is lost
6. Server processed the request but the response is queued/delayed
```

**The sender cannot distinguish between these cases.** It only knows: "I sent a request and didn't get a response within my timeout."

### The Timeout Dilemma

**Setting the timeout:**
- **Too short:** declare healthy-but-slow nodes as dead → trigger unnecessary failovers → increased load on remaining nodes (they now handle the "dead" node's traffic) → can cascade into overloading the whole system
- **Too long:** wait a long time before detecting actual failures → long period of unavailability

**There is no "correct" timeout** because network delays have **no upper bound** (in asynchronous networks).

### Why Network Delays Are Unbounded

Unlike telephone networks (circuit-switched — dedicated bandwidth, predictable latency), computer networks are **packet-switched** — packets share network capacity dynamically.

**Queueing happens at every stage:**

```
Application → OS send buffer → NIC → [Network switch queue] → NIC → OS receive buffer → Application
                                         ↑
                                    QUEUEING HERE
                                    (can overflow → packet dropped)
```

| Queue Location | What Happens When Full |
|----------------|----------------------|
| Network switch | Packets dropped. TCP retransmits (after a timeout), adding more delay. UDP just loses the data. |
| OS TCP receive buffer | Sender is told to slow down (TCP flow control / backpressure) |
| VM hypervisor network queue | Guests paused while VM networking catches up |
| Application-level buffers | Request queued behind other requests (**head-of-line blocking**) |

**TCP vs UDP tradeoff:**

| Protocol | Behavior on Packet Loss | Best For |
|----------|------------------------|---------|
| **TCP** | Automatically retransmits lost packets. Reliable but adds latency (each retransmit adds a timeout + round trip). | Most applications — database connections, HTTP, etc. |
| **UDP** | Doesn't retransmit. Data may be lost. | Latency-sensitive applications where late data is useless (VoIP, live video, gaming, real-time sensor data) |

### Measuring and Adapting

Rather than hard-coding timeout values, **measure the actual network behavior continuously** and adjust:

- Track response time distributions (p50, p95, p99) per service
- Use **adaptive timeouts** that adjust based on observed response times and jitter
- **Phi Accrual failure detector** (used by Akka, Cassandra): continuously updates a failure probability based on observed heartbeat intervals. Declares a node failed when the probability exceeds a threshold.

### Network Faults in Practice

Network partitions (one part of the network can't communicate with another) are not rare:
- Researchers at Microsoft found that a **datacenter network has about 12 network fault events per month** that each cause communication failure between some subset of machines
- Sharks have been known to bite undersea cables
- Misconfigured switches, firmware bugs, cable damage, human error during maintenance

**You must assume network faults will happen** and test your system's behavior under them (e.g., Chaos Monkey, network partition injection).

---

## Unreliable Clocks

Time is critical for many things in distributed systems: ordering events, measuring durations, triggering timeouts, scheduling jobs, determining cache expiration. But **clocks in a distributed system are unreliable**.

### Two Types of Clocks

| Clock Type | What It Measures | API | Properties |
|-----------|-----------------|-----|------------|
| **Time-of-day clock** | Wall-clock time (date and time). Synchronized with NTP. | `System.currentTimeMillis()`, `clock_gettime(CLOCK_REALTIME)` | May **jump forward or backward** (NTP sync, leap second adjustment). Not suitable for measuring elapsed time. |
| **Monotonic clock** | Elapsed time since some arbitrary point. Always moves forward. | `System.nanoTime()`, `clock_gettime(CLOCK_MONOTONIC)` | Absolute value is meaningless (different on different machines). Only useful for measuring **duration** between two points on the same machine. |

**Rule of thumb:**
- **Measuring elapsed time (timeouts, performance):** always use monotonic clock
- **Timestamping events for humans:** use time-of-day clock (but don't rely on its precision for ordering)

### Clock Synchronization and Its Limits

Quartz crystal oscillators in computers **drift** — they run slightly fast or slow:

| Clock Drift | Impact |
|-------------|--------|
| 200 ppm (parts per million) | 6ms drift after 30 seconds |
| 200 ppm over a day | 17 seconds of drift |

**NTP synchronization limitations:**
- Over the public internet: accuracy typically 35ms or worse (network delays vary)
- On a local network with dedicated NTP servers: accuracy around 1ms (best case)
- If the local clock is too far off, NTP may refuse to adjust (requires manual fix) or may be configured to reset (causing a jump)
- NTP can set the clock **backward** (if the local clock was running fast)
- Firewalls may block NTP traffic silently
- Leap seconds: NTP can either reset the clock by 1 second (causing a jump) or "smear" the leap second over a period (clock runs at a slightly different rate)
- **VM clocks are especially bad:** VMs can be paused for arbitrary periods (live migration), during which the clock stops. On resume, the clock is wrong until NTP corrects it.
- Mobile device clocks may be set to wrong time by users

### Timestamps for Ordering Events Are Dangerous

**Problem:** using wall-clock timestamps to determine which write "came first."

```
Node 1 (clock slightly fast):    write x = 'A' at timestamp 42.004
Node 2 (clock slightly slow):    write x = 'B' at timestamp 42.003

Last Write Wins (LWW) with timestamps:
  42.004 > 42.003 → keep 'A', discard 'B'

But in reality, B was written AFTER A — Node 2's clock was just slow!
→ B's write is silently lost.
```

**This is how Cassandra's default conflict resolution works.** It can silently lose writes that are within the clock skew interval. Two events within the confidence interval of the clocks **cannot be reliably ordered**.

**Solution:** use **logical clocks** (Lamport timestamps, version vectors) — counters that track causal ordering without relying on physical time. Use physical timestamps only for informational/display purposes, never for correctness.

### Confidence Intervals

Every clock reading should be understood as a **range**, not a precise point:

```
Actual time is somewhere in: [earliest, latest]
The width of this interval depends on:
  • Time since last NTP sync
  • Observed drift rate of the local oscillator
  • Network delay to the NTP server
```

**Google's TrueTime API** makes this explicit: `TrueTime.now()` returns `[earliest, latest]` — a confidence interval.

**Google Spanner** uses TrueTime for globally consistent transactions:
1. Before committing a transaction, Spanner gets the current TrueTime interval `[earliest, latest]`
2. If two transactions' intervals don't overlap → their ordering is unambiguous
3. If intervals overlap → **Spanner intentionally waits** until the intervals no longer overlap before committing
4. This wait is typically a few milliseconds (because Google deploys GPS and atomic clocks in each datacenter for tight synchronization)

### Process Pauses

A process can be **paused for arbitrarily long** without knowing it:

| Cause | Duration | Impact |
|-------|----------|--------|
| **Garbage collection (GC)** | Hundreds of milliseconds to several seconds (stop-the-world GC in Java, .NET) | Thread is frozen mid-operation; any leases/locks it holds may expire without it knowing |
| **VM suspension** | Seconds to minutes (live migration, hypervisor scheduling) | Entire VM is frozen; clock stops; on resume, the VM has no idea how long it was paused |
| **OS context switches** | Milliseconds to seconds (heavy system load, swapping to disk) | Process has no control over when it's scheduled |
| **Disk I/O** | Milliseconds to seconds (synchronous I/O, page faults, swapping) | Thread blocks on I/O |
| **Signals (SIGSTOP)** | Indefinite (until SIGCONT is sent) | Process completely suspended |

**Dangerous scenario: lease-based locks**

```
Thread 1 acquires a lease (lock) for 10 seconds.
Thread 1 enters a GC pause for 15 seconds.
Lease expires after 10 seconds.
Thread 2 acquires the lease (Thread 1's lease expired).
Thread 2 starts modifying the protected resource.
Thread 1 wakes up from GC, still believes it holds the lease.
Thread 1 also modifies the protected resource.
→ BOTH threads modifying the resource simultaneously → DATA CORRUPTION
```

**Mitigations:**
- Use **fencing tokens** (see below)
- Treat GC pauses like brief planned outages: have the runtime notify other nodes before GC, redirect traffic during GC
- Use GC only for short-lived objects; periodically restart processes to clear long-lived object accumulation
- For real-time systems: avoid GC entirely (C/C++, Rust) or use GC with bounded pause times

---

## Knowledge, Truth, and Lies

### A Node Cannot Trust Itself

A node's self-assessment is unreliable:
- A node might think it's the leader, but a network partition has isolated it and other nodes have elected a new leader
- A node might think its lease is valid, but a GC pause caused it to expire without the node knowing
- A node might think it knows the correct time, but its clock has drifted

**Truth in a distributed system is determined by the majority.** A decision requires agreement from a **quorum** (typically a majority of nodes). No single node can unilaterally decide anything — not even about itself.

### Fencing Tokens

The definitive solution to the lease/lock expiration problem:

```
Lock Service                      Resource (Storage)
    │                                    │
    ├── Grant lock, token=33 ──▶ Thread 1 │
    │                           │         │
    │   (Thread 1 pauses — GC)  │         │
    │                           │         │
    ├── Grant lock, token=34 ──▶ Thread 2 │
    │                           │         │
    │                           ├── write(data, token=34) ──▶ Accepted
    │                           │         │
    │   (Thread 1 resumes)      │         │
    │                           │         │
    ├── Thread 1 tries:         │         │
    │   write(data, token=33) ──┼────────▶│ REJECTED (33 < 34)
```

**How it works:**
1. The lock service issues a **monotonically increasing token** with every lock grant
2. The client includes its token with every request to the protected resource
3. The resource server **tracks the highest token it has seen** and **rejects** any request with a lower token
4. Even if a paused client wakes up and tries to use an expired lock, its old token will be rejected

**This requires the resource server to actively enforce tokens** — you cannot rely on clients to check their own lock status.

### Byzantine Faults

**Byzantine fault:** a node behaves incorrectly — sending wrong data, lying about its state, or actively trying to subvert the system.

| Scenario | Byzantine? | Approach |
|----------|-----------|----------|
| Datacenter nodes under your control | Not Byzantine (you trust your own software, even if buggy) | Standard fault tolerance |
| Blockchain / cryptocurrency | Byzantine (participants don't trust each other) | Byzantine Fault Tolerance (BFT) — tolerates up to 1/3 of nodes being malicious |
| Aerospace (radiation-induced bit flips) | Byzantine (hardware may produce wrong results) | Hardware redundancy + BFT |
| Multi-organization systems | Potentially Byzantine (participants may have conflicting incentives) | BFT or legal/contractual controls |

**Most internal systems don't need BFT** — it's expensive (requires 3f+1 nodes to tolerate f Byzantine faults) and complex. Instead, use:
- **Checksums** to detect corrupted network packets and disk data
- **Input validation** to catch malformed requests
- **Multiple NTP servers** to detect a rogue time source

### System Models

To reason about what's possible in a distributed system, we formalize our assumptions:

**Timing models:**

| Model | Network Delay | Process Pauses | Clock Drift | Realistic? |
|-------|--------------|----------------|-------------|-----------|
| **Synchronous** | Bounded (known max) | Bounded | Bounded | No — real networks violate these bounds |
| **Partially synchronous** | Usually bounded, occasionally exceeds bounds | Usually bounded, occasionally exceeds | Usually bounded | **Yes — the realistic model** |
| **Asynchronous** | Unbounded (no assumptions) | Unbounded | Can't use clocks at all | Too restrictive — can't even implement timeouts |

**Failure models:**

| Model | What Can Happen | Examples |
|-------|----------------|---------|
| **Crash-stop** | A node fails by halting permanently. Once crashed, never comes back. | Simplest model; not very realistic |
| **Crash-recovery** | A node can crash and later restart. Durable storage survives the crash; in-memory state is lost. | **Most common model for practical systems.** |
| **Byzantine** | A node can do anything — send wrong messages, lie, behave maliciously. | Blockchain, aerospace, multi-organization |

### Safety and Liveness Properties

Every correctness guarantee of a distributed algorithm can be classified as:

| Property Type | Definition | Example | On Violation |
|--------------|-----------|---------|-------------|
| **Safety** | "Nothing bad happens" | Uniqueness: at most one node believes it's the leader | If violated at any point, the violation is permanent and identifiable — the point in time can be identified |
| **Liveness** | "Something good eventually happens" | Availability: a request eventually receives a response | If not yet satisfied, there's still hope it will be satisfied in the future |

**The challenge:** safety must hold **at all times, even during faults**. Liveness must hold **eventually**, but may be temporarily violated during faults (e.g., a request might not get a response while a partition is occurring, but it should eventually when the partition heals).

Distributed algorithms are typically required to provide safety under all circumstances and liveness under favorable conditions (e.g., "if fewer than half the nodes crash and the network eventually recovers").
