---
sidebar_position: 2
title: "01 — OSI & TCP/IP Models"
---

# 🏗️ OSI & TCP/IP Models

Understanding the layered networking models is the foundation for every networking interview question. This chapter covers both models in detail, how they map to each other, and how data is encapsulated as it travels through the stack.

---

## 📚 The OSI 7-Layer Model

The **Open Systems Interconnection (OSI)** model is a conceptual framework that standardizes networking into **7 layers**. Each layer has specific responsibilities and communicates with the layers directly above and below it.

### Layer-by-Layer Breakdown

#### Layer 7 — Application Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Provides network services directly to end-user applications |
| **What it does** | Defines protocols for data exchange between applications |
| **Protocols** | HTTP, HTTPS, FTP, SMTP, POP3, IMAP, DNS, DHCP, SNMP, SSH, Telnet, LDAP |
| **Data unit** | Data / Message |
| **Devices** | Application gateways, proxies |

:::tip Interview Insight
The Application Layer does **not** refer to the application itself (e.g., Chrome). It refers to the **protocols** the application uses to communicate over the network.
:::

#### Layer 6 — Presentation Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Data translation, encryption, and compression |
| **What it does** | Converts data between application format and network format |
| **Functions** | Encryption/decryption (TLS/SSL), data compression, character encoding (ASCII, UTF-8), serialization (JSON, XML, Protobuf) |
| **Data unit** | Data |
| **Examples** | JPEG, GIF, MPEG, TLS/SSL, ASCII, EBCDIC |

#### Layer 5 — Session Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Manages sessions (connections) between applications |
| **What it does** | Establishes, maintains, and terminates sessions |
| **Functions** | Session establishment, synchronization, dialog control (half/full duplex) |
| **Data unit** | Data |
| **Protocols** | NetBIOS, RPC, PPTP, SIP |

:::info Layers 5–7 in Practice
In the TCP/IP model, layers 5–7 are merged into a single **Application Layer**. Most modern protocols handle presentation and session management within the application layer itself (e.g., TLS operates between transport and application).
:::

#### Layer 4 — Transport Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | End-to-end communication, reliability, and flow control |
| **What it does** | Segments data, provides reliable or unreliable delivery |
| **Protocols** | TCP (reliable), UDP (unreliable), SCTP, QUIC |
| **Data unit** | **Segment** (TCP) / **Datagram** (UDP) |
| **Addressing** | Port numbers (0–65535) |
| **Key concepts** | Segmentation, flow control, error recovery, multiplexing |

#### Layer 3 — Network Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Logical addressing and routing between networks |
| **What it does** | Determines the best path for data across networks |
| **Protocols** | IP (IPv4/IPv6), ICMP, IGMP, IPsec, OSPF, BGP, RIP |
| **Data unit** | **Packet** |
| **Addressing** | IP addresses |
| **Devices** | Routers, Layer 3 switches |
| **Key concepts** | Routing, fragmentation, TTL, subnetting |

#### Layer 2 — Data Link Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Reliable transfer between directly connected nodes |
| **What it does** | Frames data, handles MAC addressing, error detection |
| **Sub-layers** | LLC (Logical Link Control), MAC (Media Access Control) |
| **Protocols** | Ethernet (802.3), Wi-Fi (802.11), PPP, ARP, VLAN (802.1Q) |
| **Data unit** | **Frame** |
| **Addressing** | MAC addresses (48-bit, e.g., `AA:BB:CC:DD:EE:FF`) |
| **Devices** | Switches, bridges, NICs |
| **Key concepts** | Framing, MAC addressing, error detection (CRC), flow control |

#### Layer 1 — Physical Layer

| Aspect | Details |
|--------|---------|
| **Purpose** | Transmits raw bits over physical medium |
| **What it does** | Defines electrical signals, cable types, connectors |
| **Media** | Copper (Cat5/6), fiber optic, wireless radio waves |
| **Data unit** | **Bits** |
| **Devices** | Hubs, repeaters, modems, cables |
| **Key concepts** | Bit rate, encoding, modulation, signal attenuation |

---

## 🌐 The TCP/IP 4-Layer Model

The **TCP/IP model** (also called the Internet Protocol Suite) is the practical model used by the internet. It has **4 layers**.

| TCP/IP Layer | OSI Equivalent | Protocols |
|:------------:|:--------------:|-----------|
| **Application** | Layers 5, 6, 7 | HTTP, HTTPS, FTP, DNS, SMTP, SSH, TLS |
| **Transport** | Layer 4 | TCP, UDP, QUIC |
| **Internet** | Layer 3 | IP, ICMP, ARP, IGMP |
| **Network Access** | Layers 1, 2 | Ethernet, Wi-Fi, PPP |

---

## ⚖️ OSI vs TCP/IP Comparison

| Feature | OSI Model | TCP/IP Model |
|---------|-----------|-------------|
| **Layers** | 7 | 4 |
| **Developed by** | ISO | DARPA / IETF |
| **Approach** | Theoretical, protocol-independent | Practical, protocol-dependent |
| **Session & Presentation** | Separate layers | Merged into Application |
| **Network layer** | Connection-oriented & connectionless | Primarily connectionless (IP) |
| **Usage** | Teaching & reference | Actual internet implementation |
| **Protocol fit** | Protocols designed after the model | Model designed after protocols |
| **Transport** | Defines 5 classes | TCP and UDP |
| **Reliability** | Transport layer guarantees | End-to-end principle |

:::tip Why TCP/IP Won
The OSI model was designed **before** the protocols — a top-down approach. TCP/IP was built **around existing protocols** (TCP, IP) — a bottom-up approach. The pragmatic, working implementation won over the elegant theory.
:::

---

## 📦 Encapsulation & Decapsulation

As data moves **down** the stack (sending), each layer wraps the data with its own header (and sometimes trailer). This is **encapsulation**. The reverse process when receiving is **decapsulation**.

```
┌─────────────────────────────────────────────────────────────┐
│                    ENCAPSULATION (Sending)                   │
│                                                             │
│  Application Layer                                          │
│  ┌───────────────────────────────────┐                      │
│  │            DATA                   │                      │
│  └───────────────────────────────────┘                      │
│                    ▼                                         │
│  Transport Layer (Segment)                                  │
│  ┌──────────┬────────────────────────┐                      │
│  │ TCP/UDP  │         DATA           │                      │
│  │ Header   │                        │                      │
│  └──────────┴────────────────────────┘                      │
│                    ▼                                         │
│  Network Layer (Packet)                                     │
│  ┌──────────┬──────────┬─────────────┐                      │
│  │    IP    │ TCP/UDP  │    DATA     │                      │
│  │  Header  │ Header   │            │                      │
│  └──────────┴──────────┴─────────────┘                      │
│                    ▼                                         │
│  Data Link Layer (Frame)                                    │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Ethernet │    IP    │ TCP/UDP  │   DATA   │   FCS    │   │
│  │  Header  │  Header  │ Header   │          │ Trailer  │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│                    ▼                                         │
│  Physical Layer                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           0110100101010011010101...                   │   │
│  │              (Raw bits on the wire)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### PDU Names at Each Layer

| Layer | PDU Name | Added Header |
|:-----:|----------|-------------|
| Application | **Data** / Message | Application-specific |
| Transport | **Segment** (TCP) / **Datagram** (UDP) | Source/dest port, sequence numbers |
| Network | **Packet** | Source/dest IP, TTL, protocol |
| Data Link | **Frame** | Source/dest MAC, type, FCS trailer |
| Physical | **Bits** | Preamble, encoding |

:::warning Common Mistake
A frequent interview error is calling everything a "packet." Use the correct PDU name for each layer — **segment** at transport, **packet** at network, **frame** at data link, **bits** at physical.
:::

---

## 🔌 Common Protocols & Port Numbers

| Port | Protocol | Layer | Transport | Description |
|:----:|----------|:-----:|:---------:|-------------|
| 20 | FTP Data | Application | TCP | File transfer (data channel) |
| 21 | FTP Control | Application | TCP | File transfer (control channel) |
| 22 | SSH | Application | TCP | Secure shell |
| 23 | Telnet | Application | TCP | Remote terminal (insecure) |
| 25 | SMTP | Application | TCP | Email sending |
| 53 | DNS | Application | TCP/UDP | Domain name resolution |
| 67/68 | DHCP | Application | UDP | Dynamic IP assignment |
| 80 | HTTP | Application | TCP | Web traffic |
| 110 | POP3 | Application | TCP | Email retrieval |
| 143 | IMAP | Application | TCP | Email retrieval (keeps on server) |
| 443 | HTTPS | Application | TCP | Secure web traffic |
| 465 | SMTPS | Application | TCP | SMTP over TLS |
| 993 | IMAPS | Application | TCP | IMAP over TLS |
| 3306 | MySQL | Application | TCP | MySQL database |
| 5432 | PostgreSQL | Application | TCP | PostgreSQL database |
| 6379 | Redis | Application | TCP | Redis cache |
| 8080 | HTTP Alt | Application | TCP | Alternative HTTP |
| 8443 | HTTPS Alt | Application | TCP | Alternative HTTPS |
| 27017 | MongoDB | Application | TCP | MongoDB database |

:::tip Must-Know Ports
For interviews, you must know: **22** (SSH), **53** (DNS), **80** (HTTP), **443** (HTTPS), **25** (SMTP), **3306** (MySQL), **5432** (PostgreSQL).
:::

---

## ❓ How Data Flows: A Complete Example

When you send an HTTP request from your browser to `example.com`:

```
Your Computer                                    Web Server
═══════════                                    ═══════════

[Application] HTTP GET /index.html  ──────►  [Application]
      │                                             ▲
      ▼                                             │
[Transport]   TCP Segment (port 443)  ──────►  [Transport]
      │                                             ▲
      ▼                                             │
[Network]     IP Packet (93.184.216.34) ─────► [Network]
      │                                             ▲
      ▼                                             │
[Data Link]   Ethernet Frame (MAC addr) ─────► [Data Link]
      │                                             ▲
      ▼                                             │
[Physical]    Electrical/Light signals  ─────► [Physical]
```

Each intermediate router:
1. **Decapsulates** up to Layer 3 (Network) to read the destination IP
2. Looks up the next hop in its routing table
3. **Re-encapsulates** with new Layer 2 headers (new source/destination MAC)
4. Forwards the frame

:::note Key Insight
MAC addresses change at every hop (Layer 2), but IP addresses remain the same end-to-end (Layer 3). This is a fundamental concept that interviewers love to test.
:::

---

## 🔥 Interview Questions

### Conceptual

1. **Explain the OSI model and the purpose of each layer.**
   > Walk through all 7 layers from Physical to Application, naming the PDU, key protocols, and devices at each layer.

2. **How does the TCP/IP model differ from the OSI model?**
   > TCP/IP has 4 layers vs 7, was designed around existing protocols (bottom-up vs top-down), and merges the top 3 OSI layers into one Application layer.

3. **What is encapsulation? Walk through it for an HTTP request.**
   > Each layer adds its header: HTTP data → TCP segment (add ports) → IP packet (add IPs) → Ethernet frame (add MACs) → bits on the wire.

4. **What changes at each hop as a packet traverses routers?**
   > Layer 2 headers (MAC addresses) change at each hop. Layer 3 (IP addresses) and above remain the same. TTL decrements at each router.

5. **What layer does a switch operate at? A router?**
   > Switch = Layer 2 (uses MAC addresses). Router = Layer 3 (uses IP addresses). A Layer 3 switch can do both.

### Scenario-Based

6. **You can ping an IP address but can't reach a website by name. Which layer is likely the problem?**
   > Layer 7 (Application) — specifically DNS resolution is failing. The network connectivity (Layers 1–4) is working since ping succeeds.

7. **Two hosts on the same subnet can't communicate. Where would you start troubleshooting?**
   > Start at Layer 1 (physical connectivity: cables, link lights), then Layer 2 (MAC table, ARP, switch port configuration), then Layer 3 (IP config, subnet mask).

8. **Why does the OSI model have 7 layers instead of fewer?**
   > Separation of concerns: each layer can evolve independently. However, in practice, the TCP/IP model's 4-layer approach proved more practical, which is why layers 5–7 are often combined.
