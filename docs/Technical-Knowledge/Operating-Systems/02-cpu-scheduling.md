---
sidebar_position: 3
title: "02 — CPU Scheduling"
slug: 02-cpu-scheduling
---


# 🏗️ CPU Scheduling

> **The scheduler decides who runs, when, and for how long.** Understanding scheduling is how you explain latency jitter in your service, why a batch job starves your API, and how to tune container CPU limits.

---

## 🤔 The Engineer's Question: Why Did My Service Slow Down?

```
Scenario: You deploy a service alongside a nightly batch job on the same machine.

Monday: P99 latency = 45ms
Tuesday (batch runs): P99 latency = 2,300ms
Wednesday (batch stops): P99 latency = 44ms

The service and batch job run on separate processes. Why did the batch
job hurt your service's latency?
```

By the end of this chapter, you'll be able to reason about:
- Why your Java threads all spend time in `RUNNABLE` state but the service is slow (scheduler overhead)
- How to prevent a CPU-hungry job from starving latency-sensitive services
- Why adding `nice -n 10` to the batch job fixes the problem
- When to use CPU affinity (`taskset`) to isolate workloads

---

## 1. Scheduling Criteria

| Criterion | Definition | Goal |
|-----------|-----------|------|
| **CPU Utilization** | % of time the CPU is busy | Maximize (target: 40–90%) |
| **Throughput** | Number of processes completed per time unit | Maximize |
| **Turnaround Time** | Total time from submission to completion (waiting + execution) | Minimize |
| **Waiting Time** | Total time a process spends in the ready queue | Minimize |
| **Response Time** | Time from submission to first response (interactive systems) | Minimize |

:::tip
**Turnaround time** = Completion time − Arrival time  
**Waiting time** = Turnaround time − Burst time  
**Response time** = First run time − Arrival time
:::

**Engineering context:** For batch workloads (log processing, report generation), throughput and turnaround matter most. For user-facing services (web API, UI), response time is what users notice. A scheduler that optimizes throughput may make your interactive app feel sluggish.

---

## 2. Preemptive vs Non-Preemptive

| Aspect | Non-Preemptive (Cooperative) | Preemptive |
|--------|------------------------------|-----------|
| **CPU release** | Process voluntarily yields (I/O, exit) | OS forcibly removes process (timer interrupt) |
| **Starvation** | Long process can starve short ones | Short processes get fair share |
| **Context switches** | Fewer | More |
| **Complexity** | Simpler | Complex (needs careful synchronization) |
| **Real-time suitability** | Poor | Good |
| **Examples** | FCFS, SJF (non-preemptive) | SRTF, Round Robin, MLFQ, CFS |

**Engineering context:** Non-preemptive schedulers are simple but dangerous — a single buggy process that never does I/O can take down an entire system. All modern general-purpose OSes use preemptive scheduling. However, **cooperative scheduling** is making a comeback in user-space: Go's scheduler, async/await runtimes, and Java's virtual threads all rely on well-behaved coroutines that yield at well-defined points.

---

## 3. Scheduling Algorithms

### 3.1 FCFS — First Come, First Served

The simplest algorithm: processes run in the order they arrive.

**Properties:** Non-preemptive | Simple | Suffers from **Convoy Effect**

**Example:**

| Process | Arrival Time | Burst Time |
|---------|-------------|------------|
| P1 | 0 | 24 |
| P2 | 1 | 3 |
| P3 | 2 | 3 |

```
Gantt Chart:
|      P1 (0-24)      | P2 (24-27) | P3 (27-30) |
0                      24           27           30
```

| Process | Completion | Turnaround | Waiting |
|---------|-----------|------------|---------|
| P1 | 24 | 24 | 0 |
| P2 | 27 | 26 | 23 |
| P3 | 30 | 28 | 25 |
| **Average** | | **26.0** | **16.0** |

:::warning Convoy Effect
Short processes stuck behind a long one → high average waiting time. If P2 and P3 ran first, average waiting time drops dramatically.
:::

**Engineering takeaway:** FCFS is what happens when you naively use a single queue without any preemption — a single long request can hold up all others. This is why thread pools and async I/O exist.

---

### 3.2 SJF — Shortest Job First

Select the process with the **smallest burst time**.

#### Non-Preemptive SJF

| Process | Arrival Time | Burst Time |
|---------|-------------|------------|
| P1 | 0 | 7 |
| P2 | 2 | 4 |
| P3 | 4 | 1 |
| P4 | 5 | 4 |

```
Gantt Chart (non-preemptive):
| P1 (0-7) | P3 (7-8) | P2 (8-12) | P4 (12-16) |
0          7          8           12           16
```

| Process | Completion | Turnaround | Waiting |
|---------|-----------|------------|---------|
| P1 | 7 | 7 | 0 |
| P2 | 12 | 10 | 6 |
| P3 | 8 | 4 | 3 |
| P4 | 16 | 11 | 7 |
| **Average** | | **8.0** | **4.0** |

#### Preemptive SJF (SRTF — Shortest Remaining Time First)

At each time unit, the process with the **shortest remaining time** runs.

```
Same processes as above:

Gantt Chart (SRTF):
| P1(0-2) | P2(2-4) | P3(4-5) | P2(5-7) | P4(7-11) | P1(11-16) |
0         2         4         5         7          11          16
```

| Process | Completion | Turnaround | Waiting |
|---------|-----------|------------|---------|
| P1 | 16 | 16 | 9 |
| P2 | 7 | 5 | 1 |
| P3 | 5 | 1 | 0 |
| P4 | 11 | 6 | 2 |
| **Average** | | **7.0** | **3.0** |

:::info
SJF is **provably optimal** for minimizing average waiting time. The problem? You can't know burst times in advance. Real schedulers **estimate** using exponential averaging of past burst times.
:::

**Engineering takeaway:** SJF is ideal but impossible in practice. However, the *intuition* behind SJF — "run the task that will finish soonest first" — shows up everywhere: shortest-connection-first load balancers, shortest-job-first queues, and even garbage collection (parallel scavenge prioritizes young generation because those collect fastest).

---

### 3.3 Priority Scheduling

Each process has a **priority number**. The CPU goes to the highest-priority process (lower number = higher priority, by convention).

| Process | Arrival | Burst | Priority |
|---------|---------|-------|----------|
| P1 | 0 | 10 | 3 |
| P2 | 0 | 1 | 1 |
| P3 | 0 | 2 | 4 |
| P4 | 0 | 1 | 5 |
| P5 | 0 | 5 | 2 |

```
Gantt Chart (non-preemptive, all arrive at 0):
| P2(0-1) | P5(1-6) | P1(6-16) | P3(16-18) | P4(18-19) |
0         1         6          16          18          19
```

:::warning Starvation
Low-priority processes may **never run** if higher-priority processes keep arriving. Solution: **Aging** — gradually increase the priority of waiting processes over time.
:::

**Engineering takeaway:** Linux nice values (`nice -n 10`) implement exactly this. Using `nice` in production is a standard way to ensure batch jobs don't starve interactive services.

---

### 3.4 Round Robin (RR)

Each process gets a fixed **time quantum** (q). After q time units, the process is preempted and moved to the back of the ready queue.

**Example with q = 4:**

| Process | Arrival Time | Burst Time |
|---------|-------------|------------|
| P1 | 0 | 24 |
| P2 | 0 | 3 |
| P3 | 0 | 3 |

```
Gantt Chart (q=4):
| P1(0-4) | P2(4-7) | P3(7-10) | P1(10-14) | P1(14-18) | P1(18-22) | P1(22-26) | P1(26-30) |
0         4         7          10          14          18          22          26          30
```

| Process | Completion | Turnaround | Waiting |
|---------|-----------|------------|---------|
| P1 | 30 | 30 | 6 |
| P2 | 7 | 7 | 4 |
| P3 | 10 | 10 | 7 |
| **Average** | | **15.67** | **5.67** |

### Quantum Size Analysis

| Quantum | Effect |
|---------|--------|
| **Too small** (e.g., 1 ms) | Too many context switches → high overhead |
| **Too large** (e.g., 100 ms) | Degenerates to FCFS → poor response time |
| **Sweet spot** | Typically 10–100 ms; ~80% of bursts should complete within one quantum |

```
Context Switch Overhead vs Quantum Size:

Overhead │
  High   │ ╲
         │   ╲
         │     ╲
         │       ╲──────────────────
  Low    │
         └───────────────────────────
           1ms  10ms  50ms  100ms
                  Quantum Size
```

**Engineering takeaway:** Setting time quantum too small causes your server to spend most of its CPU time context switching. In containers, cgroup CPU shares effectively control quantum allocation — a container with 0.5 CPU gets half the quanta.

---

### 3.5 Multilevel Queue Scheduling

Processes are permanently assigned to a queue based on type. Each queue has its own algorithm.

```
High Priority
┌──────────────────────────────────┐
│  System processes     (RR, q=8)  │  ← Highest priority
├──────────────────────────────────┤
│  Interactive processes (RR, q=16)│
├──────────────────────────────────┤
│  Batch processes      (FCFS)     │  ← Lowest priority
└──────────────────────────────────┘
Low Priority
```

- Fixed-priority preemptive scheduling between queues
- A batch process only runs when system and interactive queues are empty
- **Problem:** no mobility between queues → starvation of lower queues

**Engineering takeaway:** This is what happens when you run a CPU-intensive cron job alongside an interactive API. The cron job sits in a low queue, but if the high-priority queues are always non-empty, the batch job may starve.

---

### 3.6 Multilevel Feedback Queue (MLFQ)

The most important general-purpose scheduler. Processes can **move between queues** based on behavior.

```
┌──────────────────────────────────────┐
│  Queue 0: RR with q=8    (highest)   │  ← New processes start here
├──────────────────────────────────────┤
│  Queue 1: RR with q=16              │  ← Demoted if uses full quantum
├──────────────────────────────────────┤
│  Queue 2: FCFS            (lowest)   │  ← CPU-bound processes sink here
└──────────────────────────────────────┘
```

**Rules:**
1. New processes enter the **highest-priority queue**
2. If a process **uses its entire quantum**, it's **demoted** to the next lower queue
3. If a process **gives up the CPU early** (I/O), it **stays** at the same level (or is promoted)
4. **Periodically boost** all processes to the top queue to prevent starvation

:::tip Why MLFQ Is Brilliant
- **I/O-bound processes** (interactive) stay at high priority because they frequently yield the CPU
- **CPU-bound processes** (batch) sink to lower queues and get longer quanta
- **Automatically classifies** processes without needing prior knowledge of burst times
- Used as the basis for schedulers in Windows, macOS, and FreeBSD
:::

**Engineering takeaway:** MLFQ's core insight — "processes that yield early are probably interactive, give them preference" — is why interactive apps feel snappy even under load. This is exactly what your OS does, and it's why `top` shows high CPU for batch processes but your web UI stays responsive.

---

### 3.7 Completely Fair Scheduler (CFS) — Linux Default

CFS (Linux 2.6.23+) doesn't use fixed time quanta. Instead, it tracks the **virtual runtime** (`vruntime`) of each process and always runs the process with the **smallest vruntime**.

```
Red-Black Tree (sorted by vruntime):

              vruntime=10ms
              /            \
      vruntime=5ms    vruntime=15ms
      /         \            \
  vruntime=2ms  vruntime=8ms  vruntime=20ms
  (runs next!)
```

**Key Concepts:**

| Concept | Description |
|---------|-------------|
| **vruntime** | Weighted CPU time consumed. Higher-priority (lower nice) processes accumulate vruntime slower |
| **Red-black tree** | All runnable tasks stored in an RB-tree keyed by vruntime. Leftmost node = next to run |
| **Time slice** | Proportional to the task's weight. `slice = (weight / total_weight) × period` |
| **Target latency** | Scheduling period (e.g., 6 ms for ≤8 tasks). Divided among all runnable tasks |
| **Minimum granularity** | Floor on time slice (~0.75 ms) to avoid excessive switching |
| **Nice values** | -20 (highest priority) to +19 (lowest). Each nice level ≈ 1.25× weight difference |

```
Example with 2 tasks, nice 0 and nice 5:
- Task A (nice 0, weight 1024): gets ~75% of CPU
- Task B (nice 5, weight 335):  gets ~25% of CPU
- Both have the same vruntime growth rate (from their perspective, it's "fair")
```

:::info CFS Replacement: EEVDF
Linux 6.6 (2023) replaced CFS with **EEVDF** (Earliest Eligible Virtual Deadline First). It improves latency for interactive tasks by considering virtual deadlines rather than just vruntime. The core idea of fairness remains.
:::

**Engineering takeaway:** CFS uses `vruntime` — not wall-clock time — to decide who runs next. A low-nice (high-priority) process's vruntime grows slower, so it gets proportionally more CPU. This is why `nice -n -5` makes a process noticeably faster.

---

## 4. Algorithm Comparison

| Algorithm | Preemptive? | Starvation? | Optimal? | Complexity | Best For |
|-----------|-----------|------------|---------|-----------|---------|
| **FCFS** | No | No (but convoy effect) | No | O(1) | Simple batch systems |
| **SJF** | No | Yes (long jobs) | Yes (min avg wait) | O(n) | When burst times are known |
| **SRTF** | Yes | Yes (long jobs) | Yes (min avg wait) | O(n) | Theoretical optimum |
| **Priority** | Either | Yes | No | O(n) | Systems with defined priorities |
| **Round Robin** | Yes | No | No | O(1) | Interactive / time-sharing |
| **MLFQ** | Yes | No (with boosting) | No | O(1) | General-purpose (Windows, macOS) |
| **CFS** | Yes | No | No | O(log n) | Linux general-purpose |

---

## 5. Real-World Scheduling in Linux

### Scheduling Classes (Priority Order)

```
┌─────────────────────────────────────────────┐
│  SCHED_DEADLINE   (Earliest Deadline First)  │  ← Highest priority
├─────────────────────────────────────────────┤
│  SCHED_FIFO       (Real-time FIFO)           │
│  SCHED_RR         (Real-time Round Robin)    │
├─────────────────────────────────────────────┤
│  SCHED_NORMAL/OTHER  (CFS, default)         │
│  SCHED_BATCH      (CPU-intensive batch)      │
│  SCHED_IDLE       (very low priority)        │  ← Lowest priority
└─────────────────────────────────────────────┘
```

### Useful Commands

```bash
# View process scheduling info
chrt -p <pid>                    # Show scheduling policy and priority
ps -eo pid,ni,pri,cls,comm      # Show nice, priority, class

# Change scheduling
nice -n 10 ./my_program          # Start with nice value 10
renice -n -5 -p <pid>            # Change nice value (root for negative)
chrt -f -p 50 <pid>              # Set SCHED_FIFO with priority 50

# View CPU affinity
taskset -p <pid>                 # Show CPU affinity mask
taskset -c 0,1 ./my_program     # Pin to CPU 0 and 1
```

**Engineering context:** These commands are your primary tools for isolating noisy neighbors in production. If a batch job is affecting your service's latency, `renice` it. If you're benchmarking, `taskset` to pin to a single core to avoid noise from other processes.

---

## 🛠️ Engineering Decision Framework

```
You need to run multiple workloads on the same machine. How do you
prevent one from hurting the others?

┌──────────────────────────────────────────────────────────┐
│  Step 1: Know your workloads                             │
│  - CPU-bound (batch, encoding) vs I/O-bound (web server) │
│  - Latency-sensitive (API) vs throughput (analytics)     │
├──────────────────────────────────────────────────────────┤
│  Step 2: Apply the right tool                            │
│  - CPU-bound batch → SCHED_BATCH or `nice`               │
│  - Latency-sensitive → SCHED_NORMAL, pin to core         │
│  - Real-time requirements → SCHED_FIFO / SCHED_RR        │
│  - Strong isolation → cgroups with cpu.max / cpu.weight  │
├──────────────────────────────────────────────────────────┤
│  Step 3: Verify with monitoring                           │
│  - pidstat -p <pid> 1 → per-process CPU %                │
│  - perf top → where CPU time is spent                    │
│  - vmstat 1 → system-wide CPU utilization                │
└──────────────────────────────────────────────────────────┘
```

---

## 🔥 Interview Questions

### Conceptual

1. **Compare FCFS and Round Robin. When would FCFS actually be better?** (When all processes have similar burst times and minimizing context switch overhead matters.)
2. **How does CFS achieve "fairness"?** Explain vruntime and the red-black tree.
3. **What is the convoy effect?** Which algorithm suffers from it? (FCFS — short processes wait behind a long one.)
4. **What is starvation? Which algorithms are susceptible?** How does aging solve it?
5. **What scheduling algorithm does Linux use?** (CFS / EEVDF for normal tasks, SCHED_FIFO / SCHED_RR for real-time.)

### Problem-Solving

6. **Given processes with arrival/burst times, calculate average waiting time under FCFS, SJF, and RR(q=3).** Practice this by hand — it's a common exam and interview question.
7. **A system has 80% I/O-bound processes and 20% CPU-bound. Which scheduler would you choose?** (MLFQ or CFS — both automatically favor I/O-bound interactive processes.)
8. **Why can't SJF be used in practice?** How do real schedulers approximate it? (Can't predict burst times. Use exponential averaging: τ(n+1) = α × t(n) + (1−α) × τ(n).)

### Quick Recall

| Question | Answer |
|----------|--------|
| Linux default scheduler | CFS (EEVDF since kernel 6.6) |
| CFS data structure | Red-black tree (sorted by vruntime) |
| Typical RR quantum | 10–100 ms |
| SCHED_FIFO priority range | 1–99 (99 = highest) |
| Nice value range | -20 (high priority) to +19 (low priority) |
| Default nice value | 0 |

---

