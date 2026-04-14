---
sidebar_position: 1
title: "Operating Systems Interview Guide"
---

# 🖥️ Operating Systems Interview Guide

A comprehensive, senior-engineer-level guide to Operating Systems concepts frequently tested in system design and backend engineering interviews.

---

## 🗺️ Learning Roadmap

| Phase | Topic | Difficulty | Estimated Time |
|-------|-------|-----------|----------------|
| 1 | [Processes & Threads](./01-process-thread-management) | 🟢 Beginner → 🟡 Intermediate | 3–4 hours |
| 2 | [CPU Scheduling](./02-cpu-scheduling) | 🟢 Beginner → 🟡 Intermediate | 2–3 hours |
| 3 | [Memory Management](./03-memory-management) | 🟡 Intermediate → 🔴 Advanced | 4–5 hours |
| 4 | [Synchronization & Deadlocks](./04-synchronization-deadlocks) | 🟡 Intermediate → 🔴 Advanced | 4–5 hours |
| 5 | [File Systems & I/O](./05-file-systems-io) | 🟡 Intermediate | 3–4 hours |
| 6 | [Linux Internals & System Calls](./06-linux-internals) | 🔴 Advanced | 3–4 hours |
| 7 | [Common Interview Questions](./07-interview-questions) | 🟢–🔴 Mixed | 2–3 hours |

---

## ✅ Study Checklist

### Processes & Threads
- [ ] Process vs thread differences
- [ ] Process states and transitions
- [ ] Context switching cost
- [ ] User-level vs kernel-level threads
- [ ] Multi-threading models (M:1, 1:1, M:N)
- [ ] fork(), copy-on-write
- [ ] IPC mechanisms (pipes, shared memory, sockets, signals)

### CPU Scheduling
- [ ] Preemptive vs non-preemptive scheduling
- [ ] FCFS, SJF, SRTF, Priority, Round Robin
- [ ] Multilevel Queue and MLFQ
- [ ] Linux CFS (Completely Fair Scheduler)
- [ ] Calculate turnaround time, waiting time, response time

### Memory Management
- [ ] Memory hierarchy and latency numbers
- [ ] Paging, page tables, TLB
- [ ] Virtual memory and demand paging
- [ ] Page replacement algorithms (FIFO, LRU, Optimal, Clock)
- [ ] Thrashing and working set model
- [ ] malloc internals (brk, sbrk, mmap)
- [ ] Stack vs heap

### Synchronization & Deadlocks
- [ ] Race conditions and critical sections
- [ ] Mutex, semaphore, monitor, condition variable
- [ ] Spinlock vs mutex trade-offs
- [ ] Producer-Consumer, Readers-Writers, Dining Philosophers
- [ ] Deadlock conditions (Coffman conditions)
- [ ] Banker's algorithm
- [ ] Lock-free / CAS-based structures

### File Systems & I/O
- [ ] Inode structure and file allocation methods
- [ ] Journaling file systems
- [ ] RAID levels (0, 1, 5, 6, 10)
- [ ] I/O models (blocking, non-blocking, async)
- [ ] I/O multiplexing (select, poll, epoll, kqueue)
- [ ] Zero-copy I/O

### Linux Internals
- [ ] User mode vs kernel mode transitions
- [ ] Key system calls (fork, exec, mmap, ioctl)
- [ ] Signals and signal handling
- [ ] Containers (cgroups + namespaces)
- [ ] Debugging tools (strace, perf)
- [ ] Performance tuning parameters

---

## 📖 Chapters

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [Processes & Threads](./01-process-thread-management) | Process lifecycle, PCB, threading models, IPC, fork & COW |
| 02 | [CPU Scheduling](./02-cpu-scheduling) | Scheduling algorithms, Gantt charts, CFS, real-world Linux scheduling |
| 03 | [Memory Management](./03-memory-management) | Paging, virtual memory, TLB, page replacement, malloc, thrashing |
| 04 | [Synchronization & Deadlocks](./04-synchronization-deadlocks) | Locks, semaphores, classic problems, deadlock handling, lock-free DS |
| 05 | [File Systems & I/O](./05-file-systems-io) | Inodes, RAID, disk scheduling, epoll/kqueue, zero-copy |
| 06 | [Linux Internals](./06-linux-internals) | System calls, /proc, signals, cgroups, namespaces, perf tuning |
| 07 | [Interview Questions](./07-interview-questions) | Conceptual, coding, and scenario-based questions with answers |

---

## 🎯 Interview Focus Areas

:::tip Senior Engineer Interviews
At the senior level, interviewers expect you to go beyond textbook definitions. Be ready to:
- **Explain trade-offs** — why would you choose one approach over another?
- **Connect to real systems** — how does Linux actually implement this?
- **Debug scenarios** — given symptoms, what's the root cause?
- **Discuss scale** — how do these concepts apply to distributed systems?
:::

:::info Prerequisites
This guide assumes familiarity with basic programming in C/Java, command-line Linux, and undergraduate-level CS concepts. Each chapter builds on the previous one, but they can also be studied independently.
:::
