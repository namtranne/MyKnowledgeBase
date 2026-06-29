---
sidebar_position: 7
title: "06 — Socket Programming & I/O Models"
---

# 🔧 Socket Programming & I/O Models

Understanding sockets and I/O models is what separates senior engineers from junior ones in networking interviews. This chapter covers the socket lifecycle, practical programming, and the evolution from blocking I/O to high-performance event-driven architectures.

---

## 🔌 What is a Socket?

A **socket** is an endpoint for communication between two machines. It's identified by a combination of:

```
Socket = IP Address + Port Number

Example: 192.168.1.100:8080
         ^^^^^^^^^^^^^^ ^^^^
         IP Address     Port

Full connection identifier (5-tuple):
┌──────────────┬───────────────┬────────────┬──────────────┬───────────────┐
│  Protocol    │  Source IP    │ Source Port │  Dest IP     │  Dest Port    │
│  (TCP/UDP)   │              │            │              │               │
└──────────────┴───────────────┴────────────┴──────────────┴───────────────┘
```

---

## 🔄 TCP Socket Lifecycle

```
         Server                              Client
         ══════                              ══════

    ┌─ socket()                          socket() ─┐
    │  Create socket                     Create socket
    │                                              │
    ├─ bind()                                      │
    │  Assign IP:port                              │
    │                                              │
    ├─ listen()                                    │
    │  Mark as passive                             │
    │  (set backlog queue)                         │
    │                                              │
    ├─ accept()  ◄─────── 3-way handshake ──────── connect()
    │  Block until client connects                 │
    │  Returns NEW socket for this connection      │
    │                                              │
    │  ┌──────────────────────────────────────┐    │
    │  │        DATA TRANSFER                 │    │
    │  │                                      │    │
    ├──┤  recv() ◄──────── data ──────── send() ──┤
    │  │  send() ────────► data ───────► recv() ──┤
    │  │                                      │    │
    │  └──────────────────────────────────────┘    │
    │                                              │
    ├─ close() ◄────── 4-way termination ───── close()
    │  Release resources                     Release resources
    └──────────────────────────────────────────────┘
```

---

## 📡 Socket API

| Function | Description | Server/Client |
|----------|-------------|:-------------:|
| `socket()` | Create a new socket (returns file descriptor) | Both |
| `bind()` | Assign local IP address and port to the socket | Server |
| `listen()` | Mark socket as passive (ready to accept connections) | Server |
| `accept()` | Block until a client connects; returns a **new** socket for the connection | Server |
| `connect()` | Initiate connection to a server (triggers 3-way handshake) | Client |
| `send()` / `write()` | Send data through the socket | Both |
| `recv()` / `read()` | Receive data from the socket | Both |
| `close()` | Close the socket and release resources | Both |

:::info accept() Returns a NEW Socket
This is a crucial detail often tested in interviews. The original (listening) socket continues to accept new connections. Each `accept()` call returns a **new** socket file descriptor for that specific client connection. This is how one server port can handle thousands of concurrent connections.
:::

---

## 💻 Simple TCP Server/Client Examples

### Python

**Server:**

```python
import socket
import threading

def handle_client(conn, addr):
    print(f"Connected by {addr}")
    try:
        while True:
            data = conn.recv(1024)
            if not data:
                break
            conn.sendall(data.upper())
    finally:
        conn.close()

def start_server(host='0.0.0.0', port=8080):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((host, port))
        server.listen(128)
        print(f"Server listening on {host}:{port}")
        
        while True:
            conn, addr = server.accept()
            thread = threading.Thread(target=handle_client, args=(conn, addr))
            thread.daemon = True
            thread.start()

if __name__ == '__main__':
    start_server()
```

**Client:**

```python
import socket

def start_client(host='127.0.0.1', port=8080):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
        client.connect((host, port))
        client.sendall(b'Hello, Server!')
        data = client.recv(1024)
        print(f"Received: {data.decode()}")

if __name__ == '__main__':
    start_client()
```

### Java

**Server:**

```java
import java.io.*;
import java.net.*;

public class TcpServer {
    public static void main(String[] args) throws IOException {
        try (ServerSocket serverSocket = new ServerSocket(8080)) {
            System.out.println("Server listening on port 8080");
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                new Thread(() -> handleClient(clientSocket)).start();
            }
        }
    }
    
    private static void handleClient(Socket socket) {
        try (
            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(
                socket.getOutputStream(), true)
        ) {
            String line;
            while ((line = in.readLine()) != null) {
                out.println(line.toUpperCase());
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

**Client:**

```java
import java.io.*;
import java.net.*;

public class TcpClient {
    public static void main(String[] args) throws IOException {
        try (
            Socket socket = new Socket("127.0.0.1", 8080);
            PrintWriter out = new PrintWriter(
                socket.getOutputStream(), true);
            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream()))
        ) {
            out.println("Hello, Server!");
            System.out.println("Received: " + in.readLine());
        }
    }
}
```

---

## 📊 I/O Models

### The Five I/O Models

#### 1. Blocking I/O

```
Application                    Kernel
    │                            │
    │  recvfrom()                │
    │ ──────────────────────────►│
    │                            │  Wait for data...
    │        BLOCKED             │  ...
    │        (thread sleeps)     │  ...
    │                            │  Data arrives!
    │                            │  Copy data to user buffer
    │  Data returned             │
    │ ◄──────────────────────────│
    │                            │
    ▼  Process data              │
```

- Thread blocks until data is available
- Simple to program
- One thread per connection → doesn't scale

#### 2. Non-blocking I/O

```
Application                    Kernel
    │                            │
    │  recvfrom()                │
    │ ──────────────────────────►│  No data ready
    │  EWOULDBLOCK               │
    │ ◄──────────────────────────│
    │                            │
    │  recvfrom()                │
    │ ──────────────────────────►│  No data ready
    │  EWOULDBLOCK               │
    │ ◄──────────────────────────│
    │                            │
    │  recvfrom()                │
    │ ──────────────────────────►│  Data ready!
    │  Data returned             │  Copy to user buffer
    │ ◄──────────────────────────│
    │                            │
    ▼  Process data              │
```

- Application polls repeatedly (busy-waiting)
- Wastes CPU cycles checking
- Rarely used alone — combine with I/O multiplexing

#### 3. I/O Multiplexing (select/poll/epoll)

```
Application                    Kernel
    │                            │
    │  select(fds)               │  Monitor multiple FDs
    │ ──────────────────────────►│
    │                            │  Wait until ANY fd ready...
    │        BLOCKED             │  ...
    │                            │  fd 42 has data!
    │  "fd 42 is ready"         │
    │ ◄──────────────────────────│
    │                            │
    │  recvfrom(fd 42)           │
    │ ──────────────────────────►│  Copy data
    │  Data returned             │
    │ ◄──────────────────────────│
    │                            │
    ▼  Process data              │
```

- Single thread monitors **multiple** sockets
- Blocks only on the multiplexer call, not on individual sockets
- The foundation of event-driven servers

#### 4. Signal-driven I/O

```
Application                    Kernel
    │                            │
    │  sigaction(SIGIO)          │  Register signal handler
    │ ──────────────────────────►│
    │                            │
    │  (continue other work)     │  Wait for data...
    │  ...                       │  ...
    │                            │  Data arrives!
    │  SIGIO signal!            │
    │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
    │                            │
    │  recvfrom()                │
    │ ──────────────────────────►│  Copy data
    │  Data returned             │
    │ ◄──────────────────────────│
```

- Kernel notifies application via signal when data is ready
- Rarely used in practice (signals are messy, hard to debug)

#### 5. Asynchronous I/O (AIO)

```
Application                    Kernel
    │                            │
    │  aio_read()                │  "Read this and put it HERE"
    │ ──────────────────────────►│
    │  Returns immediately!      │
    │                            │  Wait for data...
    │  (continue other work)     │  ...
    │  ...                       │  Data arrives!
    │  ...                       │  Copy data to user buffer
    │                            │  
    │  Completion signal/callback│  Done!
    │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
    │                            │
    ▼  Process data              │
```

- True async: application doesn't block at all
- Kernel handles everything including the data copy
- `io_uring` in Linux is the modern implementation

### I/O Models Comparison

| Model | Blocking | Notification | Scalability | Complexity | Used In |
|-------|:--------:|:------------:|:-----------:|:----------:|---------|
| **Blocking** | Yes | None | Poor (1 thread/conn) | Low | Simple apps |
| **Non-blocking** | No (busy wait) | Poll | Poor (CPU waste) | Medium | Rarely alone |
| **I/O Multiplexing** | Partial (on select) | select/poll/epoll | Good | Medium | Nginx, Redis, Node.js |
| **Signal-driven** | No | SIGIO signal | Good | High | Rarely used |
| **Async I/O** | No | Callback/completion | Excellent | High | io_uring, IOCP (Windows) |

---

## ⚡ select vs poll vs epoll

| Feature | select | poll | epoll |
|---------|--------|------|-------|
| **Max FDs** | 1024 (FD_SETSIZE) | No hard limit | No hard limit |
| **FD passing** | Copy entire fd_set each call | Copy array each call | Register once, no copy |
| **Performance** | O(n) scan all FDs | O(n) scan all FDs | O(1) for ready events |
| **Ready notification** | Must check all FDs | Must check all FDs | Returns only ready FDs |
| **Edge/Level trigger** | Level only | Level only | Both (edge + level) |
| **Portability** | All platforms | All platforms | Linux only |
| **1000 connections** | Scan 1000 FDs | Scan 1000 FDs | Only report ready ones |
| **10K connections** | Slow | Slow | Fast |

:::tip epoll Edge vs Level Trigger
- **Level-triggered (default):** epoll reports "this FD is ready" as long as data is available. If you don't read all data, the next `epoll_wait` still reports it.
- **Edge-triggered:** epoll reports "this FD became ready" only once. You must read ALL available data or you'll miss the notification. More efficient but requires non-blocking sockets and careful coding.
:::

### epoll Example (C-like pseudocode)

```c
int epfd = epoll_create1(0);

struct epoll_event ev;
ev.events = EPOLLIN;
ev.data.fd = listen_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, listen_fd, &ev);

struct epoll_event events[MAX_EVENTS];
while (1) {
    int n = epoll_wait(epfd, events, MAX_EVENTS, -1);
    for (int i = 0; i < n; i++) {
        if (events[i].data.fd == listen_fd) {
            // New connection — accept and add to epoll
            int client_fd = accept(listen_fd, ...);
            epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);
        } else {
            // Data ready on existing connection
            handle_data(events[i].data.fd);
        }
    }
}
```

---

## 🏛️ Event-Driven Architecture: Reactor Pattern

The **reactor pattern** is the foundation of high-performance servers like Nginx, Redis, Node.js, and Netty.

```
┌──────────────────────────────────────────────────────┐
│                    Reactor                           │
│                                                      │
│  ┌──────────────┐    ┌────────────────────────┐      │
│  │  Event       │    │  Event Handlers         │      │
│  │  Demux       │    │                         │      │
│  │  (epoll)     │───►│  AcceptHandler          │      │
│  │              │    │  ReadHandler             │      │
│  │  Wait for    │    │  WriteHandler            │      │
│  │  events on   │    │  ...                    │      │
│  │  all FDs     │    │                         │      │
│  └──────────────┘    └────────────────────────┘      │
│                                                      │
│  Single thread (or thread pool) handles ALL events   │
└──────────────────────────────────────────────────────┘
```

**Single-reactor, single-thread (Redis model):**

```
                    ┌────────────────┐
All connections ───►│  Single Thread  │
                    │  (epoll loop)   │
                    │                 │
                    │  1. Wait event  │
                    │  2. Dispatch    │
                    │  3. Handle      │
                    │  4. Repeat      │
                    └────────────────┘
```

**Multi-reactor, multi-thread (Netty model):**

```
                    ┌──────────────┐
Connections ──────► │  Boss Group   │  (1-2 threads)
                    │  (Acceptor)   │  Accept new connections
                    └──────┬───────┘
                           │ Dispatch to worker
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker 1  │ │ Worker 2  │ │ Worker N  │  (N = CPU cores)
        │ (epoll)   │ │ (epoll)   │ │ (epoll)   │  Each handles many
        │           │ │           │ │           │  connections
        └──────────┘ └──────────┘ └──────────┘
```

:::tip 🔌 Why It Matters in Your SE Role
The reactor pattern delivers staggering concurrency from very few threads — but it comes with one ironclad rule you must respect in your handler code: **never block the event loop.** A single thread is multiplexing thousands of connections, so any operation that blocks it (a synchronous JDBC call, a slow file read, a CPU-heavy loop, an unbounded `KEYS *` on Redis) freezes *every* connection that thread serves, not just one. This is the practical reason:

- **Redis is single-threaded** → one slow command (`KEYS *`, a giant `SORT`, a heavy Lua script) stalls the entire server for all clients. You use `SCAN` instead of `KEYS`, and keep commands O(small).
- **In Netty / Node.js / WebFlux**, blocking work must be offloaded to a separate worker pool (`scheduler`/`worker_threads`/`boundedElastic`), leaving the event-loop threads free to keep dispatching I/O.

When a reactive service mysteriously stalls under load, "someone blocked the event loop" is the first hypothesis to check.
:::

---

## 💥 C10K Problem & Solutions

The **C10K problem** (1999): How to handle **10,000 concurrent connections** on a single server.

### Why Was It Hard?

| Approach | Problem |
|----------|---------|
| **Thread-per-connection** | 10K threads = huge memory (each thread ~1MB stack), context switching overhead |
| **select/poll** | O(n) scanning of all file descriptors on every call |

### Solutions

| Solution | How It Helps |
|----------|-------------|
| **epoll / kqueue** | O(1) event notification instead of O(n) scanning |
| **Event-driven architecture** | Single thread handles thousands of connections |
| **Non-blocking I/O** | Thread never blocks on individual connections |
| **Connection pooling** | Reuse connections instead of creating new ones |
| **Zero-copy** | Avoid copying data between kernel and user space |
| **Memory-mapped I/O** | Share memory between kernel and application |

:::info C10K → C10M
The C10K problem is solved. Modern challenges are **C10M** (10 million connections) and beyond, addressed by:
- **io_uring** — async I/O with shared ring buffers between kernel and user space
- **DPDK** — bypass the kernel for network I/O entirely
- **XDP / eBPF** — programmable network processing in the kernel
:::

---

## 🔗 Connection Pooling

Creating a TCP connection is expensive (3-way handshake + TLS). Connection pooling **reuses** established connections.

```
Without pooling:                    With pooling:

Request 1: Connect → Query → Close  Request 1: Get conn → Query → Return conn
Request 2: Connect → Query → Close  Request 2: Get conn → Query → Return conn
Request 3: Connect → Query → Close  Request 3: Get conn → Query → Return conn
                                     
3 handshakes, 3 teardowns            0 handshakes (reuse existing)
```

### Pool Configuration

| Parameter | Description | Typical Value |
|-----------|-------------|:-------------:|
| **Min pool size** | Connections kept warm even when idle | 5–10 |
| **Max pool size** | Maximum concurrent connections | 20–50 |
| **Connection timeout** | Max wait time to acquire connection from pool | 5–30s |
| **Idle timeout** | How long an idle connection stays in pool | 10–30 min |
| **Max lifetime** | Max age of a connection before forced close | 30–60 min |
| **Validation query** | Query to verify connection is still alive | `SELECT 1` |

```java
// HikariCP (Java) — the fastest JDBC connection pool
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(30000);
config.setIdleTimeout(600000);
config.setMaxLifetime(1800000);

HikariDataSource ds = new HikariDataSource(config);
```

:::warning Pool Sizing
**Formula (from HikariCP):** `pool_size = (core_count * 2) + effective_spindle_count`

For most applications with SSDs: **pool_size = CPU cores × 2 + 1** (e.g., 8 cores → 17 connections). Larger pools often **hurt** performance due to context switching and lock contention.
:::

---

## 🔧 Netty / Java NIO Concepts

| Concept | Description |
|---------|-------------|
| **Channel** | Represents a connection (like a socket), supports non-blocking I/O |
| **Buffer** | Container for data (ByteBuffer in NIO, ByteBuf in Netty) |
| **Selector** | Java's wrapper around epoll/kqueue — monitors multiple channels |
| **EventLoop** | Single-threaded event loop that processes I/O events for assigned channels |
| **EventLoopGroup** | Pool of EventLoops (Boss group for accepting, Worker group for I/O) |
| **ChannelPipeline** | Chain of handlers that process inbound/outbound data |
| **ChannelHandler** | Individual handler (codec, business logic, etc.) in the pipeline |

```
Netty Channel Pipeline:

Inbound data flow:
──────────────────────────────────────────────────►
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Decoder  │→ │  Decoder │→ │ Business │→ │  Logger  │
│ (Bytes→  │  │ (Frame→  │  │  Logic   │  │          │
│  Frame)  │  │  Object) │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

Outbound data flow:
◄──────────────────────────────────────────────────
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Encoder  │← │ Encoder  │← │ Business │
│ (Frame→  │  │ (Object→ │  │  Logic   │
│  Bytes)  │  │  Frame)  │  │          │
└──────────┘  └──────────┘  └──────────┘
```

---

## 🛠️ Applying This in Your SE Role

You probably won't hand-write an `epoll` loop — your framework (Netty, Node, asyncio, Spring WebFlux) did that for you. But you *do* configure connection pools, choose blocking vs reactive stacks, and debug "why does the service fall over at N connections?" — all of which are this chapter applied.

### Where this shows up in everyday work

| You're doing this… | …and the socket/I/O concept behind it is |
|--------------------|-------------------------------------------|
| Picking Spring MVC (thread-per-request) vs WebFlux (reactive) | Blocking I/O vs the reactor/event-loop model |
| Sizing HikariCP / a DB or HTTP pool | Connection pooling + the cost of the handshake |
| "Pool exhausted / connection timeout" errors | Leaks, slow queries, or an undersized/oversized pool |
| Debugging a stalled Redis or reactive service | A blocking/CPU-heavy op on a single-threaded event loop |
| Capacity-planning a chat/streaming server | C10K → event-driven architecture, off-heap connection state |

### What to actually do

- **Size pools small and deliberately, not "big for safety."** The HikariCP formula (`cores × 2 + spindles`) usually lands around 10–20 — far smaller than people expect. A bigger pool just pushes contention onto the database and adds context-switching; it rarely adds throughput.
- **Always return connections (try-with-resources / `finally`) and set an acquisition timeout.** A leak silently drains the pool until every request hangs waiting for a connection that never comes back.
- **Match the stack to the workload.** Reactive (WebFlux/Node) shines for high-concurrency, I/O-bound fan-out; classic thread-per-request is simpler and perfectly fine for moderate load — *as long as* you don't block reactive threads if you go reactive.
- **Keep event-loop work non-blocking and bounded.** Offload blocking/CPU work to a dedicated pool; on Redis, prefer `SCAN` over `KEYS` and avoid O(N) commands on big keys.

:::warning 🔥 War Story — Making the Pool Bigger Made Everything Slower
A service was hitting occasional "connection timeout — pool exhausted" errors under load, so the team did the obvious thing: they bumped HikariCP's `maximumPoolSize` from 20 to 200, reasoning that more connections meant more throughput. Latency got *worse*, not better — p99 climbed, the database's CPU spiked, and soon the whole fleet (each instance now demanding 200 connections) drove Postgres past its `max_connections` limit and it started rejecting connections outright.

The mistake was treating the pool as a throughput dial. A database can only execute as many queries in parallel as it has cores/disks; once you exceed that, extra connections don't run faster — they pile up, fighting over CPU and locks, and each query gets *slower* (the exact "larger pools hurt" warning above). With 200 connections per instance across a dozen instances, the DB was drowning in 2,400 connections, most of them just contending. **Fix:** drop the pool back to ~20 (the `cores × 2` neighborhood), and fix the real cause of exhaustion — a connection leak in an error path plus a couple of slow N+1 queries holding connections too long. Throughput went *up* with the smaller pool. The lesson — *a connection pool meters concurrency to match what the database can actually do; sizing it bigger than the DB's real parallelism converts a queue in your app into congestion in your database, which is strictly worse.*
:::

---

## 🔥 Interview Questions

### Conceptual

1. **What is a socket and how does it differ from a port?**
   > A port is a 16-bit number identifying a service on a host. A socket is an endpoint for communication identified by IP + port. Multiple sockets can share the same port (e.g., a server listening on port 80 creates a new socket for each client connection, all on port 80).

2. **Explain the difference between blocking and non-blocking I/O.**
   > Blocking: thread sleeps until data is available. Non-blocking: call returns immediately with EWOULDBLOCK if no data; application must poll. In practice, non-blocking is combined with I/O multiplexing (epoll) so the thread only wakes when data is actually ready.

3. **Why is epoll better than select for handling many connections?**
   > select: O(n) — copies all FDs to kernel and scans all of them each call, limited to 1024 FDs. epoll: O(1) — FDs registered once, kernel only returns ready FDs, no FD limit. At 10K connections, select scans 10K FDs; epoll returns only the few that have data.

4. **Explain the reactor pattern.**
   > A single thread (or small pool) uses I/O multiplexing (epoll) to wait for events on many connections. When an event occurs, it dispatches to the appropriate handler. This avoids thread-per-connection overhead. Used by Nginx, Redis, Node.js, Netty.

5. **What is the C10K problem and how was it solved?**
   > Handling 10K concurrent connections on one server. Thread-per-connection doesn't scale (memory, context switching). Solved by event-driven architecture with epoll/kqueue for O(1) event notification, non-blocking I/O, and efficient memory use.

### Scenario-Based

6. **You're designing a chat server that needs to handle 100K concurrent connections. What I/O model do you use?**
   > Use epoll-based event-driven architecture (Netty in Java, asyncio in Python, or libuv in Node.js). Multi-reactor pattern: boss thread accepts connections, distributes to worker threads (one per CPU core), each running their own epoll loop. Connection state stored in an off-heap buffer pool.

7. **Your database connection pool is exhausted (all connections busy). What do you investigate?**
   > Check for connection leaks (connections not returned to pool), slow queries holding connections too long, pool size too small for load, or N+1 query patterns. Monitor pool metrics (active/idle/waiting counts). Add connection timeout to fail fast.

8. **Why does Redis use a single-threaded event loop, and when does this become a bottleneck?**
   > Single thread avoids lock contention and context switching, keeping operations fast (100K+ ops/sec). Bottleneck: CPU-intensive commands (KEYS *, large SORT), large data structures, or when CPU is saturated. Solutions: Redis Cluster for horizontal scaling, io_threads for I/O in Redis 6+.

9. **Explain how Nginx handles thousands of concurrent connections with just a few worker processes.**
   > Each worker process runs an event loop using epoll. Non-blocking I/O means no worker ever blocks on a slow client. Workers handle events (accept, read, write) as they become ready. Typically one worker per CPU core. No thread-per-connection overhead.
