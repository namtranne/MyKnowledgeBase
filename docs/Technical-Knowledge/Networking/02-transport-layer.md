---
sidebar_position: 3
title: "02 — TCP, UDP & Transport Layer"
---

# ⚡ TCP, UDP & Transport Layer

The transport layer is the backbone of reliable (and unreliable) communication on the internet. This chapter deep-dives into TCP internals, UDP characteristics, and the modern QUIC protocol.

---

## 🔷 TCP Deep Dive

### TCP Header Format

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│           Source Port (16)        │       Destination Port (16)    │
├───────────────────────────────────┼───────────────────────────────┤
│                    Sequence Number (32)                            │
├───────────────────────────────────────────────────────────────────┤
│                 Acknowledgment Number (32)                         │
├───────┼───────┼─┼─┼─┼─┼─┼─┼─┼─┼─┼───────────────────────────────┤
│ Data  │       │U│A│P│R│S│F│                                       │
│Offset │ Rsrvd │R│C│S│S│Y│I│          Window Size (16)             │
│  (4)  │  (4)  │G│K│H│T│N│N│                                       │
├───────────────────────────────────┼───────────────────────────────┤
│          Checksum (16)            │       Urgent Pointer (16)     │
├───────────────────────────────────┴───────────────────────────────┤
│                     Options (variable)                            │
├───────────────────────────────────────────────────────────────────┤
│                          Payload                                  │
└───────────────────────────────────────────────────────────────────┘
```

| Field | Size | Purpose |
|-------|:----:|---------|
| Source Port | 16 bits | Sender's port number |
| Destination Port | 16 bits | Receiver's port number |
| Sequence Number | 32 bits | Position of the first data byte in this segment |
| Acknowledgment Number | 32 bits | Next byte expected from the other side |
| Data Offset | 4 bits | Size of TCP header (in 32-bit words) |
| Flags | 6 bits | URG, ACK, PSH, RST, SYN, FIN |
| Window Size | 16 bits | Receive window for flow control |
| Checksum | 16 bits | Error detection |
| Urgent Pointer | 16 bits | Points to urgent data (if URG flag set) |

:::info Key Flags
- **SYN** — Synchronize sequence numbers (connection setup)
- **ACK** — Acknowledgment field is valid
- **FIN** — Sender is finished sending data
- **RST** — Reset the connection (abort)
- **PSH** — Push data to application immediately
- **URG** — Urgent pointer field is valid
:::

---

### 🤝 Three-Way Handshake

TCP uses a **three-way handshake** to establish a reliable connection before any data is transmitted.

```
     Client                                   Server
       │                                        │
       │  1. SYN (seq=x)                        │
       │ ─────────────────────────────────────►  │
       │                                        │
       │  2. SYN-ACK (seq=y, ack=x+1)          │
       │  ◄─────────────────────────────────────│
       │                                        │
       │  3. ACK (seq=x+1, ack=y+1)            │
       │ ─────────────────────────────────────►  │
       │                                        │
       │         CONNECTION ESTABLISHED          │
       │  ◄═══════════════════════════════════►  │
```

**Step-by-step with sequence numbers:**

| Step | Sender | Flags | Seq | Ack | Meaning |
|:----:|--------|-------|:---:|:---:|---------|
| 1 | Client → Server | SYN | 1000 | — | "I want to connect. My initial seq is 1000." |
| 2 | Server → Client | SYN+ACK | 5000 | 1001 | "OK. My initial seq is 5000. I expect your next byte at 1001." |
| 3 | Client → Server | ACK | 1001 | 5001 | "Got it. I expect your next byte at 5001." |

:::warning Why Three Ways? Why Not Two?
A two-way handshake cannot handle **duplicate delayed SYN segments**. If an old SYN arrives at the server, it would allocate resources for a connection the client doesn't want. The third ACK confirms the client actually intends to connect.
:::

---

### 👋 Four-Way Termination

TCP connection termination requires **four segments** because each direction must be closed independently (half-close).

```
     Client                                   Server
       │                                        │
       │  1. FIN (seq=u)                        │
       │ ─────────────────────────────────────►  │  Client: "I'm done sending"
       │                                        │
       │  2. ACK (seq=v, ack=u+1)               │
       │  ◄─────────────────────────────────────│  Server: "Got it, but I may still send"
       │                                        │
       │       (Server may continue sending)     │
       │                                        │
       │  3. FIN (seq=w, ack=u+1)               │
       │  ◄─────────────────────────────────────│  Server: "I'm done sending too"
       │                                        │
       │  4. ACK (seq=u+1, ack=w+1)             │
       │ ─────────────────────────────────────►  │  Client: "Got it. Closing."
       │                                        │
       │         ┌─────────────────┐            │
       │         │  TIME_WAIT      │            │
       │         │  (2 × MSL)      │            │
       │         └─────────────────┘            │
       │                                        │
       │         CONNECTION CLOSED               │
```

:::tip Why TIME_WAIT?
The client enters **TIME_WAIT** for **2 × MSL** (Maximum Segment Lifetime, typically 60 seconds) to:
1. Ensure the final ACK reaches the server (if lost, the server will retransmit FIN)
2. Allow old duplicate segments to expire before the same port pair is reused
:::

---

### 🔄 TCP State Diagram

```
                              ┌──────────────┐
                   ┌──────────│    CLOSED     │◄─────────────┐
                   │          └──────┬───────┘              │
                   │                 │                       │
            Passive Open        Active Open             Timeout /
           (server calls       (client calls            RST received
             listen())          connect())
                   │                 │                       │
                   ▼                 ▼                       │
            ┌──────────┐     ┌──────────────┐               │
            │  LISTEN  │     │  SYN_SENT    │               │
            └────┬─────┘     └──────┬───────┘               │
                 │                  │                        │
            Recv SYN,          Recv SYN+ACK,                │
            Send SYN+ACK      Send ACK                      │
                 │                  │                        │
                 ▼                  ▼                        │
          ┌──────────────┐  ┌──────────────┐                │
          │ SYN_RECEIVED │  │ ESTABLISHED  │◄───┐           │
          └──────┬───────┘  └──────┬───────┘    │           │
                 │                 │             │           │
            Recv ACK          Close /        Recv SYN+ACK   │
                 │          Send FIN             │           │
                 │                 │             │           │
                 └────────►┌──────┴───────┐     │           │
                           │ ESTABLISHED  │─────┘           │
                           └──────┬───────┘                 │
                                  │                         │
                    ┌─────────────┴──────────────┐          │
                    │                            │          │
              Close/Send FIN              Recv FIN/Send ACK │
                    │                            │          │
                    ▼                            ▼          │
             ┌──────────────┐           ┌──────────────┐    │
             │  FIN_WAIT_1  │           │  CLOSE_WAIT  │    │
             └──────┬───────┘           └──────┬───────┘    │
                    │                          │            │
        ┌───────────┼───────────┐        Close/Send FIN    │
        │           │           │              │            │
   Recv FIN+ACK  Recv ACK   Recv FIN          ▼            │
   Send ACK         │      Send ACK    ┌──────────────┐    │
        │           │           │      │   LAST_ACK   │    │
        │           ▼           ▼      └──────┬───────┘    │
        │    ┌──────────┐ ┌──────────┐        │            │
        │    │FIN_WAIT_2│ │ CLOSING  │   Recv ACK          │
        │    └────┬─────┘ └────┬─────┘        │            │
        │         │            │              │            │
        │    Recv FIN     Recv ACK            │            │
        │    Send ACK          │              │            │
        │         │            │              │            │
        ▼         ▼            ▼              ▼            │
     ┌────────────────────────────────────────────┐        │
     │              TIME_WAIT                     │        │
     │           (wait 2 × MSL)                   │────────┘
     └────────────────────────────────────────────┘
```

### TCP States Summary

| State | Description |
|-------|-------------|
| **CLOSED** | No connection exists |
| **LISTEN** | Server waiting for incoming connections |
| **SYN_SENT** | Client has sent SYN, waiting for SYN-ACK |
| **SYN_RECEIVED** | Server received SYN, sent SYN-ACK, waiting for ACK |
| **ESTABLISHED** | Connection is open, data transfer in progress |
| **FIN_WAIT_1** | Sent FIN, waiting for ACK or FIN |
| **FIN_WAIT_2** | Received ACK for our FIN, waiting for peer's FIN |
| **CLOSE_WAIT** | Received FIN from peer, waiting for application to close |
| **LAST_ACK** | Sent FIN after receiving peer's FIN, waiting for final ACK |
| **CLOSING** | Both sides sent FIN simultaneously |
| **TIME_WAIT** | Waiting for 2×MSL before fully closing |

:::warning CLOSE_WAIT Leak
A high number of `CLOSE_WAIT` connections is a **bug in your application** — it means your code received a FIN from the remote side but hasn't called `close()` on the socket. This is a common production issue.

```bash
# Check for CLOSE_WAIT connections
netstat -an | grep CLOSE_WAIT | wc -l
ss -s  # Summary of socket states
```
:::

---

### 🪟 Flow Control: Sliding Window Protocol

TCP uses a **sliding window** to control how much data the sender can transmit before needing an acknowledgment. The receiver advertises its available buffer space via the **window size** field.

```
Sender's View of Data:
┌───────────────────────────────────────────────────────────────┐
│  Already    │    Sent but not   │   Can send   │   Cannot    │
│  ACK'd      │    ACK'd yet      │  immediately │   send yet  │
│             │                   │              │             │
│ ◄───────────┼───────────────────┼──────────────┼───────────► │
│             │                   │              │             │
│             └───── Window ──────┘              │             │
│                  (In-flight)      (Available)  │             │
└───────────────────────────────────────────────────────────────┘
                    ▲                    ▲
              Send base           Send base + Window size
```

**Key concepts:**
- **Receive Window (rwnd):** Advertised by receiver — "I have this much buffer space"
- **Effective Window:** `min(cwnd, rwnd)` — sender uses the smaller of congestion window and receive window
- **Window Scaling:** TCP option that allows window sizes larger than 65535 bytes (up to ~1 GB)

---

### 🚦 Congestion Control

TCP congestion control prevents the sender from overwhelming the network. It uses a **congestion window (cwnd)** that grows and shrinks based on network conditions.

#### Phases of Congestion Control

```
cwnd
 ▲
 │                                    ╱
 │                              ╱───╱   Congestion
 │                        ╱───╱       Avoidance
 │                  ╱───╱            (linear growth)
 │          ╱─────╱
 │     ssthresh ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
 │        ╱                                   │ Packet loss!
 │      ╱   Slow Start                        │ cwnd = cwnd/2
 │    ╱     (exponential growth)               │ ssthresh = cwnd/2
 │  ╱                                         ▼
 │╱                                     ╱───╱
 │                                ╱───╱
 └──────────────────────────────────────────────► time
```

| Phase | Behavior | Trigger |
|-------|----------|---------|
| **Slow Start** | cwnd doubles every RTT (exponential) | Connection start or timeout |
| **Congestion Avoidance** | cwnd grows by 1 MSS per RTT (linear) | cwnd reaches ssthresh |
| **Fast Retransmit** | Retransmit after 3 duplicate ACKs (don't wait for timeout) | 3 dup ACKs received |
| **Fast Recovery** | Set ssthresh = cwnd/2, cwnd = ssthresh + 3 | After fast retransmit |

:::info Modern Congestion Control Algorithms
- **Reno** — Classic: slow start → congestion avoidance → fast retransmit/recovery
- **Cubic** — Default in Linux: uses a cubic function for window growth (more aggressive)
- **BBR** (Bottleneck Bandwidth and RTT) — Google's algorithm: models the network path to maximize throughput without filling buffers
:::

---

### ⚙️ Nagle's Algorithm & TCP_NODELAY

**Nagle's Algorithm** reduces the number of small packets on the network by buffering small writes until either:
- A full MSS (Maximum Segment Size) of data is available, or
- The previous packet has been ACK'd

```
Without Nagle (TCP_NODELAY):          With Nagle:
┌───┐ ┌───┐ ┌───┐ ┌───┐              ┌─────────────────┐
│ H │ │ e │ │ l │ │ l │   ──────►    │     Hello       │
└───┘ └───┘ └───┘ └───┘              └─────────────────┘
 4 packets, 4 ACKs                    1 packet, 1 ACK
```

:::warning When to Disable Nagle (Enable TCP_NODELAY)
Disable Nagle's algorithm for **latency-sensitive** applications:
- Real-time gaming
- Interactive SSH sessions
- Financial trading systems
- Any protocol where small messages need immediate delivery

```java
socket.setTcpNoDelay(true); // Disable Nagle's algorithm
```
:::

---

### 💓 TCP Keepalive

TCP keepalive probes detect dead connections when no data is being exchanged.

| Parameter | Default (Linux) | Description |
|-----------|:---------------:|-------------|
| `tcp_keepalive_time` | 7200s (2h) | Time before first probe |
| `tcp_keepalive_intvl` | 75s | Interval between probes |
| `tcp_keepalive_probes` | 9 | Number of probes before declaring dead |

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60)    # Start probing after 60s idle
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)   # Probe every 10s
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)      # Give up after 5 probes
```

:::tip Application-Level Keepalive vs TCP Keepalive
Most production systems use **application-level** keepalive (e.g., HTTP/2 PING frames, WebSocket ping/pong) rather than relying on TCP keepalive because:
1. TCP keepalive defaults are too slow (2 hours!)
2. TCP keepalive doesn't detect application-level hangs
3. Middleboxes (NATs, load balancers) may drop idle TCP connections before keepalive fires
:::

---

### 🚧 Head-of-Line Blocking

**Head-of-line (HOL) blocking** occurs when a lost or delayed packet blocks all subsequent packets from being delivered to the application, even if they've already arrived.

```
Stream: [Pkt 1] [Pkt 2] [Pkt 3] [Pkt 4] [Pkt 5]

What arrives:  [Pkt 1] [  ✗  ] [Pkt 3] [Pkt 4] [Pkt 5]
                         ▲
                    Pkt 2 lost!
                    
Application sees:  [Pkt 1] ... waiting ... waiting ...
                   (Pkt 3, 4, 5 are buffered but NOT delivered)
```

TCP guarantees **in-order delivery**, so even though packets 3–5 have arrived, the application won't see them until packet 2 is retransmitted and received. This is a fundamental limitation of TCP that QUIC addresses.

---

## 🔶 UDP

### UDP Header Format

UDP has a minimal 8-byte header — much simpler than TCP's 20+ bytes.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├───────────────────────────────────┬───────────────────────────────┤
│         Source Port (16)          │      Destination Port (16)    │
├───────────────────────────────────┼───────────────────────────────┤
│           Length (16)             │         Checksum (16)         │
├───────────────────────────────────┴───────────────────────────────┤
│                            Payload                               │
└──────────────────────────────────────────────────────────────────┘
```

### When to Use UDP

| Use Case | Why UDP? |
|----------|----------|
| **DNS queries** | Small request/response, speed matters more than reliability |
| **Video streaming** | Losing a frame is better than buffering; real-time matters |
| **Online gaming** | Stale game state is useless; latest update is what matters |
| **VoIP** | Dropped audio is better than delayed audio |
| **IoT telemetry** | High volume, small packets, occasional loss is acceptable |
| **DHCP** | No existing connection to rely on |

---

## ⚖️ TCP vs UDP Comparison

| Feature | TCP | UDP |
|---------|-----|-----|
| **Connection** | Connection-oriented (3-way handshake) | Connectionless |
| **Reliability** | Guaranteed delivery, retransmission | Best-effort, no retransmission |
| **Ordering** | In-order delivery guaranteed | No ordering guarantee |
| **Flow control** | Sliding window | None |
| **Congestion control** | Yes (slow start, AIMD, etc.) | None |
| **Header size** | 20–60 bytes | 8 bytes |
| **Speed** | Slower (overhead) | Faster (minimal overhead) |
| **Broadcasting** | No | Yes (multicast/broadcast) |
| **Error checking** | Checksum + retransmission | Checksum only (optional in IPv4) |
| **Use cases** | HTTP, email, file transfer, SSH | DNS, streaming, gaming, VoIP |
| **HOL blocking** | Yes | No |

:::tip Interview Rule of Thumb
- Need **reliability** and **ordering**? → TCP
- Need **speed** and can **tolerate loss**? → UDP
- Need **both**? → QUIC (or build reliability on top of UDP)
:::

---

## 🚀 QUIC Protocol (HTTP/3 Transport)

**QUIC** (Quick UDP Internet Connections) is a transport protocol built on top of UDP, designed by Google and standardized as the transport for **HTTP/3**.

### Why QUIC?

```
TCP + TLS Handshake:               QUIC Handshake:
                                   
Client    Server                   Client    Server
  │ SYN      │                       │ Initial   │
  │─────────►│  1 RTT                │──────────►│  0-RTT (resumption)
  │ SYN-ACK  │                       │           │  or 1-RTT (new)
  │◄─────────│  2 RTT                │◄──────────│
  │ ACK      │                       │  Data     │
  │─────────►│  3 RTT (start TLS)    │──────────►│
  │ ClientHi │                       │           │
  │─────────►│                       Connection established!
  │ ServerHi │                       
  │◄─────────│                       
  │ Finished │                       
  │─────────►│  Total: 2-3 RTTs      Total: 0-1 RTTs
```

### QUIC Key Features

| Feature | Description |
|---------|-------------|
| **0-RTT connection** | Resume previous connections with zero round trips |
| **No HOL blocking** | Independent streams — lost packet only blocks its own stream |
| **Built-in TLS 1.3** | Encryption is mandatory and integrated |
| **Connection migration** | Connections survive IP changes (e.g., Wi-Fi → cellular) |
| **Multiplexed streams** | Multiple streams in one connection without HOL blocking |
| **Improved loss recovery** | Better packet loss detection than TCP |
| **Connection ID** | Uses connection IDs instead of IP+port tuples |

:::info QUIC vs TCP
QUIC essentially solves TCP's biggest pain points:
1. **Handshake latency** — Combined transport + crypto handshake
2. **HOL blocking** — Independent streams
3. **Connection migration** — Connection IDs survive IP changes
4. **Ossification** — Built on UDP to avoid middlebox interference
:::

---

## 🔥 Interview Questions

### Conceptual

1. **Explain the TCP three-way handshake. Why three packets instead of two?**
   > SYN → SYN-ACK → ACK. Two packets can't handle delayed duplicate SYN segments — the third ACK confirms the client's intent and synchronizes sequence numbers in both directions.

2. **What happens if the final ACK in the handshake is lost?**
   > The server stays in SYN_RECEIVED and retransmits SYN-ACK. The client, already in ESTABLISHED, will respond with ACK again. If retransmissions exhaust, the server resets.

3. **Why does TIME_WAIT last 2×MSL?**
   > To ensure: (1) the final ACK has time to reach the server and be retransmitted if lost, and (2) all old duplicate segments from this connection expire before the port pair is reused.

4. **Explain TCP flow control vs congestion control.**
   > Flow control (rwnd) prevents overwhelming the **receiver's buffer**. Congestion control (cwnd) prevents overwhelming the **network**. Effective window = min(rwnd, cwnd).

5. **What is head-of-line blocking and how does QUIC solve it?**
   > In TCP, a lost packet blocks all subsequent data. QUIC uses independent streams over UDP, so a lost packet only blocks its own stream.

### Scenario-Based

6. **Your server has thousands of connections in TIME_WAIT. How do you handle it?**
   > Options: enable `SO_REUSEADDR`/`SO_REUSEPORT`, reduce `tcp_fin_timeout`, enable `tcp_tw_reuse` (Linux). Investigate why connections are being created/destroyed so frequently — consider connection pooling.

7. **A real-time multiplayer game is laggy. Should you switch from TCP to UDP?**
   > Yes, for game state updates: UDP avoids HOL blocking and retransmission delays. Implement application-level reliability only for critical data (e.g., chat messages). Use TCP for login/matchmaking.

8. **Your application sends many small writes. Performance is poor. What's happening?**
   > Likely Nagle's algorithm is batching small writes, adding latency. Also check for the "Nagle + delayed ACK" interaction (Silly Window Syndrome). Fix: set `TCP_NODELAY` or batch writes at the application level.

9. **Explain why QUIC was built on UDP instead of as a new transport protocol.**
   > New transport protocols can't be deployed because middleboxes (NATs, firewalls) only understand TCP and UDP. Building on UDP lets QUIC work with existing infrastructure while innovating at the transport layer.

10. **You see a high number of CLOSE_WAIT connections. What's wrong?**
    > Your application received FIN from the remote side but hasn't called `close()`. This is a resource leak bug in your code — likely a missing `finally` block or unclosed connection in an error path.
