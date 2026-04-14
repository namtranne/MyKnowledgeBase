---
sidebar_position: 7
title: "06 — Linux Internals & System Calls"
slug: 06-linux-internals
---

# 🐧 Linux Internals & System Calls

This chapter dives into Linux-specific internals that are frequently tested in senior engineering interviews — from system call mechanics to containers and performance tuning.

---

## 1. Kernel Architecture

### Monolithic vs Microkernel

```
Monolithic Kernel (Linux):          Microkernel (Mach, QNX, L4):
┌──────────────────────────┐        ┌──────────────────────────┐
│       User Space          │        │       User Space          │
│  ┌──────┐  ┌──────────┐  │        │  ┌──────┐  ┌──────────┐  │
│  │ App  │  │ App      │  │        │  │ App  │  │ File Sys │  │
│  └──────┘  └──────────┘  │        │  └──────┘  │ Driver   │  │
├══════════════════════════┤        │            │ Network  │  │
│       Kernel Space        │        │            └──────────┘  │
│  ┌──────────────────────┐│        ├══════════════════════════┤
│  │ Scheduler            ││        │     Microkernel           │
│  │ Memory Manager       ││        │  ┌──────────────────────┐│
│  │ File Systems         ││        │  │ IPC, Scheduling      ││
│  │ Network Stack        ││        │  │ Basic Memory Mgmt    ││
│  │ Device Drivers       ││        │  └──────────────────────┘│
│  │ IPC                  ││        └══════════════════════════┘
│  └──────────────────────┘│
└══════════════════════════┘
 Everything in kernel ring 0         Only essentials in kernel;
 Fast (no IPC overhead)              Services run in user space
 One bug can crash kernel            Better isolation, more IPC overhead
```

| Aspect | Monolithic (Linux) | Microkernel |
|--------|-------------------|-------------|
| **Performance** | Fast (direct function calls) | Slower (IPC between services) |
| **Reliability** | One bug can crash entire kernel | Faulty service can restart without crash |
| **Code size** | Large (Linux: 30M+ LOC) | Small kernel, services in user space |
| **Extensibility** | Loadable kernel modules (LKM) | Add user-space servers |
| **Examples** | Linux, FreeBSD, Windows NT (hybrid) | QNX, L4, MINIX, Fuchsia (Zircon) |

:::info Linux Modules
Linux is monolithic but supports **loadable kernel modules** (`.ko` files) that can be inserted/removed at runtime without rebooting. This gives some microkernel-like flexibility.
```bash
lsmod                           # List loaded modules
modprobe overlay                 # Load the overlay filesystem module
rmmod overlay                    # Remove module
```
:::

---

## 2. System Calls: How They Work

A system call is the interface between user-space programs and the kernel.

```
User Application
      │
      │  1. Sets syscall number in register (e.g., rax = __NR_write = 1)
      │  2. Sets arguments in registers (rdi, rsi, rdx, ...)
      │  3. Executes syscall instruction (x86-64) or int 0x80 (x86-32)
      │
      ▼
┌─────────────────────────────────────────────┐
│              CPU Mode Switch                 │
│   User Mode (Ring 3) → Kernel Mode (Ring 0)  │
│   Saves user-space registers to kernel stack │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│           Kernel Syscall Handler             │
│   1. Lookup handler in sys_call_table[rax]   │
│   2. Validate arguments                      │
│   3. Execute kernel function (e.g., sys_write)│
│   4. Return result in rax register           │
└─────────────────────────────────────────────┘
      │
      ▼
      CPU switches back to User Mode (Ring 3)
      │
      ▼
User Application continues with return value
```

### Cost of a System Call

| Component | Cost |
|-----------|------|
| Mode switch (user → kernel → user) | ~100–200 ns |
| Register save/restore | Included above |
| Argument validation | Variable |
| Actual work (read from disk, etc.) | Dominates for I/O syscalls |

:::tip Minimizing Syscall Overhead
- **Buffered I/O** (stdio): batches small writes into larger ones
- **vDSO** (virtual Dynamic Shared Object): some "syscalls" like `gettimeofday` run entirely in user space via a kernel-mapped shared library
- **io_uring**: submit batches of I/O operations with a single syscall
:::

---

## 3. Important System Calls

| Category | Syscall | Description |
|----------|---------|-------------|
| **Process** | `fork()` | Create child process (COW) |
| | `exec()` family | Replace process image with new program |
| | `wait()` / `waitpid()` | Wait for child process to finish |
| | `exit()` | Terminate process |
| | `clone()` | Create process or thread (Linux-specific, used by pthreads) |
| | `getpid()` / `getppid()` | Get process/parent PID |
| **File I/O** | `open()` | Open file, return file descriptor |
| | `read()` / `write()` | Read/write bytes from/to fd |
| | `close()` | Close file descriptor |
| | `lseek()` | Move file offset |
| | `stat()` / `fstat()` | Get file metadata (inode info) |
| | `dup()` / `dup2()` | Duplicate file descriptor |
| **Memory** | `mmap()` | Map file or anonymous memory into address space |
| | `munmap()` | Unmap memory region |
| | `brk()` / `sbrk()` | Adjust program break (heap) |
| | `mprotect()` | Set memory protection (read/write/exec) |
| | `madvise()` | Advise kernel on memory usage patterns |
| **Network** | `socket()` | Create network socket |
| | `bind()` | Bind socket to address |
| | `listen()` / `accept()` | Listen for and accept connections |
| | `connect()` | Connect to remote socket |
| | `send()` / `recv()` | Send/receive data over socket |
| **Other** | `ioctl()` | Device-specific control operations (catch-all) |
| | `epoll_create()` / `epoll_ctl()` / `epoll_wait()` | Scalable I/O multiplexing |
| | `futex()` | Fast userspace mutex (underlying primitive for pthreads) |

### fork + exec Pattern

```c
pid_t pid = fork();

if (pid == 0) {
    // Child: replace with new program
    execvp("ls", (char *[]){"ls", "-la", NULL});
    perror("exec failed");  // Only reached if exec fails
    _exit(1);
} else {
    // Parent: wait for child
    int status;
    waitpid(pid, &status, 0);

    if (WIFEXITED(status))
        printf("Child exited with code %d\n", WEXITSTATUS(status));
    else if (WIFSIGNALED(status))
        printf("Child killed by signal %d\n", WTERMSIG(status));
}
```

---

## 4. Process Management in Linux

### /proc Filesystem

```bash
# Process-specific information
ls /proc/1234/             # All info about PID 1234
cat /proc/1234/status      # Human-readable status
cat /proc/1234/cmdline     # Command line arguments
cat /proc/1234/environ     # Environment variables
cat /proc/1234/maps        # Memory mappings (virtual addresses)
cat /proc/1234/fd/         # Open file descriptors (symlinks)
cat /proc/1234/io          # I/O counters (bytes read/written)
cat /proc/1234/limits      # Resource limits (ulimit values)
cat /proc/1234/stat        # Raw status (scheduling, memory, etc.)

# System-wide information
cat /proc/cpuinfo          # CPU details
cat /proc/meminfo          # Memory statistics
cat /proc/loadavg          # Load averages (1, 5, 15 min)
cat /proc/uptime           # System uptime
cat /proc/version          # Kernel version
cat /proc/filesystems      # Supported file systems
```

### Essential Process Management Commands

```bash
# Process listing
ps aux                      # All processes, detailed
ps -eo pid,ppid,user,%cpu,%mem,stat,cmd --sort=-%cpu  # Custom format
pstree -p                   # Process tree with PIDs

# Real-time monitoring
top                         # Classic real-time monitor
htop                        # Enhanced interactive monitor
atop                        # Advanced system & process monitor

# Process control
kill -TERM <pid>            # Graceful termination (SIGTERM)
kill -9 <pid>               # Force kill (SIGKILL, cannot be caught)
kill -STOP <pid>            # Pause process (SIGSTOP)
kill -CONT <pid>            # Resume paused process (SIGCONT)
```

---

## 5. Signals

Signals are **software interrupts** — asynchronous notifications sent to a process.

| Signal | Number | Default Action | Catchable? | Purpose |
|--------|--------|---------------|-----------|---------|
| `SIGHUP` | 1 | Terminate | Yes | Terminal disconnected; daemons: reload config |
| `SIGINT` | 2 | Terminate | Yes | Ctrl+C — interrupt from keyboard |
| `SIGQUIT` | 3 | Core dump | Yes | Ctrl+\ — quit with core dump |
| `SIGILL` | 4 | Core dump | Yes | Illegal instruction |
| `SIGABRT` | 6 | Core dump | Yes | abort() called |
| `SIGFPE` | 8 | Core dump | Yes | Floating-point exception (div by zero) |
| `SIGKILL` | 9 | Terminate | **No** | Force kill — cannot be caught, blocked, or ignored |
| `SIGSEGV` | 11 | Core dump | Yes | Segmentation fault (invalid memory access) |
| `SIGPIPE` | 13 | Terminate | Yes | Write to pipe with no reader |
| `SIGALRM` | 14 | Terminate | Yes | Timer alarm |
| `SIGTERM` | 15 | Terminate | Yes | Graceful termination request (default `kill`) |
| `SIGCHLD` | 17 | Ignore | Yes | Child process stopped or terminated |
| `SIGSTOP` | 19 | Stop | **No** | Pause process — cannot be caught |
| `SIGCONT` | 18 | Continue | Yes | Resume stopped process |
| `SIGUSR1` | 10 | Terminate | Yes | User-defined signal 1 |
| `SIGUSR2` | 12 | Terminate | Yes | User-defined signal 2 |

```c
#include <signal.h>
#include <stdio.h>

volatile sig_atomic_t running = 1;

void handle_sigterm(int sig) {
    printf("Caught SIGTERM, shutting down gracefully...\n");
    running = 0;  // Signal main loop to exit
}

void handle_sighup(int sig) {
    printf("Caught SIGHUP, reloading configuration...\n");
    reload_config();
}

int main() {
    struct sigaction sa;
    sa.sa_handler = handle_sigterm;
    sa.sa_flags = 0;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGTERM, &sa, NULL);

    sa.sa_handler = handle_sighup;
    sigaction(SIGHUP, &sa, NULL);

    while (running) {
        do_work();
    }

    cleanup();
    return 0;
}
```

:::tip Graceful Shutdown Pattern
1. Catch `SIGTERM` (sent by `kill`, Docker stop, Kubernetes pod termination)
2. Stop accepting new work
3. Finish in-progress requests (with a timeout)
4. Flush buffers, close connections
5. Exit cleanly

Docker sends `SIGTERM`, waits 10 seconds (configurable via `stop_grace_period`), then sends `SIGKILL`.
:::

---

## 6. Linux Memory Management

### OOM Killer

When the system runs out of memory and all reclaim attempts fail, the **OOM Killer** selects and kills a process to free memory.

```bash
# View OOM score (higher = more likely to be killed)
cat /proc/<pid>/oom_score

# Adjust OOM score (-1000 to 1000)
echo -1000 > /proc/<pid>/oom_score_adj   # Protect from OOM
echo  1000 > /proc/<pid>/oom_score_adj   # Prefer to kill

# Check OOM kills in kernel log
dmesg | grep -i "oom\|killed process"
journalctl -k | grep -i "oom"
```

### cgroups (Control Groups)

cgroups limit, account for, and isolate **resource usage** of process groups.

```bash
# cgroups v2 (modern, unified hierarchy)
# Create a cgroup
mkdir /sys/fs/cgroup/mygroup

# Set memory limit (100 MB)
echo 104857600 > /sys/fs/cgroup/mygroup/memory.max

# Set CPU limit (50% of one core)
echo "50000 100000" > /sys/fs/cgroup/mygroup/cpu.max

# Add a process to the cgroup
echo <pid> > /sys/fs/cgroup/mygroup/cgroup.procs

# Monitor usage
cat /sys/fs/cgroup/mygroup/memory.current
cat /sys/fs/cgroup/mygroup/cpu.stat
```

| Resource Controller | What It Controls |
|---------------------|-----------------|
| `memory` | RAM limit, swap limit, OOM control |
| `cpu` | CPU time allocation, bandwidth throttling |
| `io` | Block I/O bandwidth, IOPS limits |
| `pids` | Maximum number of processes |
| `cpuset` | Pin to specific CPU cores |

### Namespaces

Namespaces provide **isolation** — each namespace has its own view of a system resource.

| Namespace | Flag | Isolates |
|-----------|------|----------|
| **PID** | `CLONE_NEWPID` | Process IDs (container's PID 1 ≠ host's PID 1) |
| **Network** | `CLONE_NEWNET` | Network stack (interfaces, IPs, routes, iptables) |
| **Mount** | `CLONE_NEWNS` | Filesystem mount points |
| **UTS** | `CLONE_NEWUTS` | Hostname and domain name |
| **IPC** | `CLONE_NEWIPC` | System V IPC, POSIX message queues |
| **User** | `CLONE_NEWUSER` | User and group IDs (rootless containers) |
| **Cgroup** | `CLONE_NEWCGROUP` | Cgroup root directory |
| **Time** | `CLONE_NEWTIME` | System clock offsets (Linux 5.6+) |

```bash
# See namespaces of a process
ls -la /proc/<pid>/ns/

# Enter a container's namespace
nsenter -t <pid> -m -u -i -n -p -- /bin/bash

# Create a new namespace (unshare)
unshare --pid --fork --mount-proc /bin/bash
# Now PID 1 inside this namespace is the bash shell
```

---

## 7. Containers: How They Work

Containers are **not VMs** — they're processes with isolated views of the system using **cgroups + namespaces + union filesystem**.

```
┌─────────────────────────────────────────────────┐
│                   Host Kernel                    │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │  Container A      │  │  Container B      │     │
│  │  ┌──────────────┐│  │  ┌──────────────┐│     │
│  │  │  App Process  ││  │  │  App Process  ││     │
│  │  └──────────────┘│  │  └──────────────┘│     │
│  │  PID namespace    │  │  PID namespace    │     │
│  │  Net namespace    │  │  Net namespace    │     │
│  │  Mount namespace  │  │  Mount namespace  │     │
│  │  cgroup limits    │  │  cgroup limits    │     │
│  │  Union FS (overlay)│ │  Union FS (overlay)│    │
│  └──────────────────┘  └──────────────────┘     │
│                                                  │
│                  Shared Kernel                    │
└─────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Namespaces** | Isolation (PID, network, mount, user) |
| **cgroups** | Resource limits (CPU, memory, I/O) |
| **Union FS** (OverlayFS) | Layered filesystem — base image layers (read-only) + writable layer on top |
| **seccomp** | Restrict available system calls |
| **Capabilities** | Fine-grained root privileges (CAP_NET_ADMIN, CAP_SYS_ADMIN, etc.) |

:::warning Containers vs VMs
Containers share the **host kernel** — a kernel exploit in a container can potentially affect the host. VMs run separate kernels with hardware-level isolation (hypervisor). For untrusted workloads, consider **gVisor** (user-space kernel) or **Kata Containers** (lightweight VM per container).
:::

---

## 8. Debugging Tools

### strace — Trace System Calls

```bash
# Trace all syscalls of a running process
strace -p <pid>

# Trace a command from start
strace -f -e trace=open,read,write ./my_program

# Count syscalls and show summary
strace -c ./my_program

# Trace with timestamps
strace -t -T -p <pid>    # -t = wall clock, -T = time in syscall

# Common filters
strace -e trace=network ./server    # Network calls only
strace -e trace=file ./app          # File operations only
strace -e trace=memory ./app        # Memory operations only
```

### ltrace — Trace Library Calls

```bash
# Trace shared library calls (malloc, printf, etc.)
ltrace ./my_program

# Filter specific functions
ltrace -e malloc+free ./my_program
```

### perf — Performance Analysis

```bash
# CPU profiling (sample stack traces)
perf record -g -p <pid> -- sleep 30
perf report                            # Interactive report

# Count hardware events
perf stat ./my_program
# Output: cycles, instructions, cache-misses, branch-misses, etc.

# Real-time per-CPU stats
perf top

# Trace specific events
perf trace -p <pid>    # Like strace but faster (kernel-level)
```

### Other Useful Tools

```bash
# I/O monitoring
iostat -x 1             # Disk I/O statistics every second
iotop                   # Per-process I/O usage

# Memory analysis
free -h                 # System memory overview
vmstat 1                # Virtual memory stats every second
pmap <pid>              # Process memory map

# Network debugging
ss -tlnp                # TCP listening sockets
ss -s                   # Socket statistics summary
tcpdump -i eth0 port 80 # Packet capture

# File descriptor investigation
lsof -p <pid>           # All open files for a process
lsof -i :8080           # What's listening on port 8080
```

---

## 9. /proc and /sys Filesystems

### /proc (Process and Kernel Info)

| Path | Content |
|------|---------|
| `/proc/[pid]/` | Per-process info (status, maps, fd, stack) |
| `/proc/cpuinfo` | CPU model, cores, flags |
| `/proc/meminfo` | Detailed memory statistics |
| `/proc/loadavg` | System load (1, 5, 15 min averages) |
| `/proc/net/tcp` | Active TCP connections |
| `/proc/sys/` | Tunable kernel parameters (sysctl) |
| `/proc/interrupts` | IRQ counters per CPU |
| `/proc/vmstat` | Virtual memory statistics |

### /sys (Device and Kernel Objects)

| Path | Content |
|------|---------|
| `/sys/block/` | Block device info (disk schedulers, queues) |
| `/sys/class/net/` | Network interface properties |
| `/sys/fs/cgroup/` | cgroup v2 hierarchy |
| `/sys/devices/system/cpu/` | CPU topology, frequency scaling |
| `/sys/kernel/` | Kernel subsystem parameters |

---

## 10. Performance Tuning

### Key Tunable Parameters

```bash
# Virtual Memory
sysctl vm.swappiness                    # 0-100, how aggressively to swap (default: 60)
sysctl vm.swappiness=10                 # Reduce swapping for database servers
sysctl vm.dirty_ratio=20               # % of RAM before synchronous writeback
sysctl vm.dirty_background_ratio=5     # % of RAM before async writeback starts
sysctl vm.overcommit_memory=0          # 0=heuristic, 1=always allow, 2=strict

# File Descriptors
sysctl fs.file-max=2097152             # System-wide FD limit
ulimit -n 65535                        # Per-process FD limit (current shell)
# Persistent: /etc/security/limits.conf
# * soft nofile 65535
# * hard nofile 65535

# Network (TCP)
sysctl net.core.somaxconn=65535                # Max listen backlog
sysctl net.ipv4.tcp_max_syn_backlog=65535      # SYN queue size
sysctl net.ipv4.tcp_tw_reuse=1                 # Reuse TIME_WAIT sockets
sysctl net.core.netdev_max_backlog=5000        # NIC input queue
sysctl net.ipv4.tcp_fin_timeout=10             # TIME_WAIT duration
sysctl net.ipv4.ip_local_port_range="1024 65535"  # Ephemeral port range

# Network Buffers
sysctl net.core.rmem_max=16777216      # Max socket receive buffer
sysctl net.core.wmem_max=16777216      # Max socket send buffer
```

### Performance Investigation Checklist

```
Problem: System is slow
         │
         ├─▶ CPU bound?
         │   └── top/htop → look for %CPU > 90%
         │       perf top → find hot functions
         │       perf record → generate flame graph
         │
         ├─▶ Memory bound?
         │   └── free -h → check available memory
         │       vmstat 1 → check si/so (swap in/out)
         │       dmesg → check for OOM kills
         │
         ├─▶ I/O bound?
         │   └── iostat -x 1 → check %util, await, iops
         │       iotop → find I/O-heavy processes
         │       check disk queue depth (avgqu-sz)
         │
         └─▶ Network bound?
             └── ss -s → connection counts
                 sar -n DEV 1 → bandwidth per interface
                 tcpdump/wireshark → packet analysis
```

---

## 🔥 Interview Questions

### Conceptual

1. **How does a system call work? What happens when you call `write()`?** Walk through the entire path from user space to kernel and back.
2. **What is the difference between a monolithic kernel and a microkernel?** What are the trade-offs? Where does Linux fall?
3. **Explain how containers work at the OS level.** (cgroups for resource limits, namespaces for isolation, overlayfs for the filesystem.)
4. **What is the difference between SIGTERM and SIGKILL?** Why can't SIGKILL be caught?
5. **What is strace? How would you use it to debug a program?**

### Scenario-Based

6. **A process is consuming 100% CPU. How do you investigate?**
   - `top`/`htop` → identify the PID
   - `strace -p <pid>` → is it stuck in a syscall loop?
   - `perf top` or `perf record -g -p <pid>` → find the hot code path
   - `gdb -p <pid>` → attach debugger, examine threads and backtraces

7. **Your server runs out of file descriptors. How do you fix it?**
   - `lsof -p <pid> | wc -l` → count open FDs
   - Check `ulimit -n` and `/proc/<pid>/limits`
   - Increase: `/etc/security/limits.conf` + `sysctl fs.file-max`
   - Debug: look for FD leaks (connections not closed, files not closed)

8. **A container is being OOM-killed. How do you diagnose?**
   - `dmesg | grep oom` → confirm OOM kill
   - Check cgroup memory limit: `cat /sys/fs/cgroup/.../memory.max`
   - Check actual usage: `cat /sys/fs/cgroup/.../memory.current`
   - Profile memory usage in the application (heap dump, profiler)
   - Either increase memory limit or fix the leak

9. **How would you reduce the latency of a network server?**
   - Pin threads to cores (avoid context switches): `taskset`
   - Use epoll edge-triggered mode
   - Tune TCP: `tcp_nodelay`, increase backlog
   - Reduce syscalls: io_uring, batching
   - Kernel bypass: DPDK for ultra-low-latency

### Quick Recall

| Question | Answer |
|----------|--------|
| Linux kernel type | Monolithic (with loadable modules) |
| Syscall instruction (x86-64) | `syscall` |
| Container isolation primitives | cgroups + namespaces |
| Number of Linux namespaces | 8 (pid, net, mnt, uts, ipc, user, cgroup, time) |
| View syscalls of a process | `strace -p [pid]` |
| View open files of a process | `lsof -p [pid]` |
| Default swappiness | 60 |
| SIGKILL signal number | 9 |
| SIGTERM signal number | 15 |
| Default file descriptor limit | 1024 (soft) |
