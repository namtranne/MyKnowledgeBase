---
sidebar_position: 1
title: "Operating Systems Interview Guide"
---

# 🖥️ Operating Systems for Software Engineers

> **Learn operating systems the way you'll actually use them — as the foundation for every production system you design, debug, and optimize.**

---

## 🤔 Why Operating Systems Matter for Your Career

You don't need to write an OS to benefit deeply from understanding one. Every day as a software engineer, you make decisions that depend on OS behavior — often without realizing it:

- **Why did my service latency spike after adding 50 more threads?** → Thread creation cost, context switches, and scheduler behavior
- **Why does the database slow to a crawl when the working set exceeds RAM?** → Page faults, thrashing, and virtual memory
- **Why did the production server become unresponsive after a memory leak?** → OOM killer, cgroups, and memory pressure
- **Why does `strace` show thousands of `futex` syscalls?** → Lock contention and synchronization overhead
- **Why does my Java app use 2 GB of RSS but heap usage is only 300 MB?** → Stack size, mmap regions, and allocator overhead
- **Why did `kill -9` make the outage worse?** → Signals, graceful shutdown, and container lifecycle

**Operating systems is the layer between your code and the hardware.** Understanding it is what separates engineers who guess at configuration from engineers who reason about it. The best debuggers, performance tuners, and system designers all share one trait: they think in terms of OS primitives.

---

## 🎯 Learning Outcomes

After completing this guide, you will be able to:

| Outcome | Example |
|---------|---------|
| **Debug production issues faster** | Diagnose latency spikes, OOM kills, and CPU saturation using `strace`, `perf`, `vmstat`, and `/proc` |
| **Design better concurrent systems** | Choose the right threading model, lock type, and synchronization primitive for your workload |
| **Tune system performance** | Adjust scheduler priorities, cgroup limits, and kernel parameters with confidence |
| **Reason about resource constraints** | Predict how memory, CPU, and I/O behave under load before deploying |
| **Ace OS portions of system design interviews** | Explain trade-offs between processes vs threads, virtualization, container isolation, and I/O models |
| **Work effectively with DevOps/SRE** | Read OOM logs, interpret cgroup metrics, and collaborate on production debugging |

---

## 🗺️ Learning Roadmap

The chapters are ordered so each builds on the previous one. But they can also be studied independently based on what you need for current work.

| Phase | Topic | Difficulty | Est. Time | Why It Matters |
|-------|-------|-----------|-----------|----------------|
| 1 | [Processes & Threads](./01-process-thread-management) | 🟢 Beginner → 🟡 Intermediate | 3–4 hours | The unit of execution — everything else builds on this |
| 2 | [CPU Scheduling](./02-cpu-scheduling) | 🟢 Beginner → 🟡 Intermediate | 2–3 hours | Explains latency, throughput, and priority behavior |
| 3 | [Memory Management](./03-memory-management) | 🟡 Intermediate → 🔴 Advanced | 4–5 hours | Debugging memory issues, OOM, and performance tuning |
| 4 | [Synchronization & Deadlocks](./04-synchronization-deadlocks) | 🟡 Intermediate → 🔴 Advanced | 4–5 hours | Writing correct concurrent code |
| 5 | [File Systems & I/O](./05-file-systems-io) | 🟡 Intermediate | 3–4 hours | Storage performance, data integrity, I/O model selection |
| 6 | [Linux Internals & System Calls](./06-linux-internals) | 🔴 Advanced | 3–4 hours | Production debugging, container internals, system call mechanics |
| 7 | [Common Interview Questions](./07-interview-questions) | 🟢–🔴 Mixed | 2–3 hours | Curated conceptual, coding, and scenario questions |

---

## ✅ Study Checklist

Use this checklist to track progress. Each item maps to a real engineering skill.

### Processes & Threads
- [ ] Explain process vs thread trade-offs to a colleague
- [ ] Diagnose why a process consumes more memory than expected
- [ ] Choose between threads and processes for a new service
- [ ] Understand context switch cost implications on latency
- [ ] Use IPC mechanisms (pipes, shared memory, sockets) when appropriate
- [ ] Explain fork() + exec() pattern and when to use it

### CPU Scheduling
- [ ] Predict how a CPU-bound vs I/O-bound workload behaves under different schedulers
- [ ] Explain what "nice value" does and when to use it
- [ ] Calculate turnaround/waiting/response time for scheduling algorithms
- [ ] Use `chrt`, `taskset`, and `nice` in production
- [ ] Understand CFS vruntime and why Linux uses it

### Memory Management
- [ ] Diagnose "why is the server using all its memory?"
- [ ] Distinguish between page cache, heap, and stack usage
- [ ] Explain what happens when an application is OOM-killed
- [ ] Choose between brk/sbrk and mmap for allocation strategy
- [ ] Understand TLB, huge pages, and when they matter
- [ ] Detect and diagnose memory leaks using system tools

### Synchronization & Deadlocks
- [ ] Write correct concurrent code using mutex, semaphore, and condition variables
- [ ] Identify and fix race conditions in code review
- [ ] Diagnose a deadlock in production using thread dumps
- [ ] Choose between lock-based and lock-free approaches
- [ ] Understand when to use spinlocks vs mutexes
- [ ] Apply lock ordering to prevent deadlock

### File Systems & I/O
- [ ] Choose a RAID level for a given workload (DB, log storage, backup)
- [ ] Optimize file I/O using mmap and zero-copy
- [ ] Explain why your SSD benchmark is slower than expected
- [ ] Select the right I/O model (blocking, non-blocking, async, io_uring)
- [ ] Understand how epoll/kqueue scale to 100K+ connections
- [ ] Configure journaling modes based on durability requirements

### Linux Internals
- [ ] Trace a running process with `strace` and interpret syscalls
- [ ] Profile CPU usage with `perf` and generate flame graphs
- [ ] Configure cgroups and namespaces (containers)
- [ ] Write signal handlers and implement graceful shutdown
- [ ] Tune kernel parameters (sysctl) for production workloads
- [ ] Debug "my container keeps getting OOM-killed"

---

## 📖 Chapters

| # | Chapter | Key Topics | SE Relevance |
|---|---------|-----------|--------------|
| 01 | [Processes & Threads](./01-process-thread-management) | Process lifecycle, PCB, threading models, IPC, fork & COW | Choosing execution model, debugging multi-process apps |
| 02 | [CPU Scheduling](./02-cpu-scheduling) | Scheduling algorithms, Gantt charts, CFS, real-world Linux scheduling | Tuning service latency, CPU affinity, priority |
| 03 | [Memory Management](./03-memory-management) | Paging, virtual memory, TLB, page replacement, malloc, thrashing | OOM debugging, memory tuning, leak detection |
| 04 | [Synchronization & Deadlocks](./04-synchronization-deadlocks) | Locks, semaphores, classic problems, deadlock handling, lock-free DS | Writing correct concurrent code, debugging concurrency |
| 05 | [File Systems & I/O](./05-file-systems-io) | Inodes, RAID, disk scheduling, epoll/kqueue, zero-copy | Storage performance, I/O model selection, DB storage |
| 06 | [Linux Internals](./06-linux-internals) | System calls, /proc, signals, cgroups, namespaces, perf tuning | Production debugging, container internals, sysadmin |
| 07 | [Interview Questions](./07-interview-questions) | Conceptual, coding, and scenario-based questions with answers | System design interviews, architecture discussions |

---

## 🎯 Career-Focused Learning Tips

:::tip How to Get the Most From This Guide

**Don't just read — practice.** OS concepts click when you apply them:

1. **Open a terminal and try things.** Run `strace -p <pid>`, `cat /proc/<pid>/maps`, `pmap -x <pid>`, `perf top`. Explore a running process.
2. **Write small C programs** that use `fork()`, `mmap()`, pipes, shared memory, pthreads. Feeling the cost of syscalls firsthand is invaluable.
3. **When you hit a production issue**, come back here and look up the relevant chapter. Real-world problems are the best teachers.
4. **Connect the dots.** When you read about databases, think: "how does the storage engine use mmap?" When you read about containers, think: "how does Kubernetes enforce memory limits?"
5. **Discuss with peers.** Explaining fork() + COW to a colleague is the best way to find gaps in your understanding.

:::

:::info Prerequisites
This guide assumes familiarity with basic programming in C/Java/Python, command-line Linux, and undergraduate-level CS concepts. Each chapter builds on the previous one, but they can also be studied independently based on your current work or interview targets.
:::
