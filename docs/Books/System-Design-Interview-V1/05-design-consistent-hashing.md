# Chapter 5 — Design Consistent Hashing

> Consistent hashing is the technique that makes horizontal scaling of caches and databases practical. Without it, adding or removing a server invalidates almost all cached data.

---

## The Problem: Simple Hashing Breaks at Scale

### Naive Approach: Modular Hashing

```
server_index = hash(key) % N    (N = number of servers)
```

This works until you add or remove a server:

```
Before (4 servers):                After (5 servers):
  hash("key1") % 4 = 1              hash("key1") % 5 = 3    ← MOVED
  hash("key2") % 4 = 3              hash("key2") % 5 = 0    ← MOVED
  hash("key3") % 4 = 0              hash("key3") % 5 = 2    ← MOVED
  hash("key4") % 4 = 2              hash("key4") % 5 = 4    ← MOVED
```

**Impact**: When the server count changes by 1, approximately **(N-1)/N** of all keys are remapped. With 100 servers, adding one server invalidates ~99% of cached data → **cache avalanche** → database overwhelmed.

---

## The Solution: Consistent Hashing

### Core Concept: The Hash Ring

Instead of `hash % N`, map both servers and keys onto a circular hash space (ring):

```
                    0 / 2^32
                      │
                 ─────●─────
              ╱       │       ╲
            ╱         │         ╲
          ●  S0       │           ╲
         ╱            │            ●  S1
        │             │             │
        │             │             │
  ──────●─────────────┼─────────────●──────
        │   S3        │             │
        │             │             │
         ╲            │            ╱
          ╲           │          ● S2
            ╲         │        ╱
              ╲       │      ╱
                 ─────●─────
                   2^16
```

**Rules:**
1. Hash each server to a position on the ring: `hash(server_ip)` → position
2. Hash each key to a position on the ring: `hash(key)` → position
3. Walk **clockwise** from the key's position until you find a server → that server owns the key

```
  Key K1 at position 150 → clockwise → hits S1 at position 200 → S1 stores K1
  Key K2 at position 250 → clockwise → hits S2 at position 300 → S2 stores K2
```

### Adding a Server

When a new server S4 is added at position 175:

```
  Before:  K1 (150) → S1 (200)    K2 (250) → S2 (300)
  After:   K1 (150) → S4 (175)    K2 (250) → S2 (300)  ← only K1 remapped!
```

**Only keys between S4's predecessor and S4 are remapped** — a fraction of the total, not nearly all of them.

### Removing a Server

When S1 is removed:

```
  Before:  K1 (150) → S1 (200)
  After:   K1 (150) → S2 (300)    ← K1 remapped to next clockwise server
```

Again, only the keys that belonged to S1 are redistributed.

**With K keys and N servers, on average only K/N keys are remapped** when a server is added or removed, compared to almost all keys with simple hashing.

---

## The Problem with Basic Consistent Hashing

### Uneven Distribution

If servers are unevenly placed on the ring, some servers handle much more data than others:

```
  ┌─────────────────────────────────┐
  │  S0 handles 60% of the ring    │  ← overloaded
  │  S1 handles 5%                 │  ← underused
  │  S2 handles 35%                │
  └─────────────────────────────────┘
```

This creates **hotspots** and defeats the purpose of distributing load.

---

## Virtual Nodes (Vnodes)

The solution: each physical server is mapped to **multiple positions** on the ring using virtual nodes.

```
  Physical Server S0 → S0_0, S0_1, S0_2 (3 virtual nodes)
  Physical Server S1 → S1_0, S1_1, S1_2 (3 virtual nodes)
  
  Ring:
  
         S0_0
          │
     S1_2─┼──S0_1
          │
     S0_2─┼──S1_0
          │
         S1_1
```

**How it works:**
- `hash("S0_0")`, `hash("S0_1")`, `hash("S0_2")` → 3 positions for S0
- A key walks clockwise and finds a virtual node → maps to its physical server
- More virtual nodes → more evenly distributed load

### How Many Virtual Nodes?

| Virtual Nodes per Server | Standard Deviation of Load |
|-------------------------|---------------------------|
| 100 | ~10% variance |
| 200 | ~5% variance |
| 500+ | ~2% variance |

**Trade-off**: More virtual nodes = better balance, but more memory to store the ring mapping. In practice, 100–200 virtual nodes per server is common.

### Handling Heterogeneous Servers

If servers have different capacities, assign proportionally more virtual nodes to more powerful servers:

```
  Beefy server (16 CPU, 64 GB RAM) → 300 virtual nodes
  Small server (4 CPU, 16 GB RAM)  → 100 virtual nodes
```

---

## Consistent Hashing in Practice

### Real-World Usage

| System | How It Uses Consistent Hashing |
|--------|-------------------------------|
| **Amazon DynamoDB** | Partitions data across nodes; rebalances on node add/remove |
| **Apache Cassandra** | Distributes data across cluster nodes |
| **Discord** | Routes users to chat servers |
| **Akamai CDN** | Distributes web content across edge servers |
| **Memcached** | Client-side consistent hashing for cache distribution |
| **Maglev (Google)** | Software load balancer for network traffic |

### Key Properties

| Property | What It Means |
|----------|--------------|
| **Minimal disruption** | Adding/removing a node only moves K/N keys |
| **Horizontal scalability** | Add nodes to increase capacity proportionally |
| **Balanced load** | With virtual nodes, load is evenly distributed |
| **No central coordination** | Each client can independently compute key-to-server mapping |

---

## Implementation Details

### Hash Function Choice

The hash function must distribute values uniformly across the ring:

| Hash Function | Output Size | Speed | Uniformity |
|--------------|------------|-------|------------|
| MD5 | 128-bit | Medium | Good |
| SHA-1 | 160-bit | Medium | Good |
| MurmurHash | 32/128-bit | Fast | Excellent |
| xxHash | 32/64-bit | Very Fast | Excellent |

**Recommendation**: MurmurHash or xxHash for performance-critical systems. MD5/SHA-1 for when cryptographic properties are needed.

### Data Structure for the Ring

Use a **sorted map** (e.g., TreeMap in Java, SortedDict in Python):

```
Ring (sorted by position):
  position 100 → S0_2
  position 250 → S1_0
  position 400 → S0_0
  position 600 → S1_1
  position 800 → S0_1
  position 950 → S1_2

Lookup key with hash position 300:
  → Find first entry ≥ 300 → position 400 → S0_0
  → Key belongs to physical server S0

Time complexity: O(log N) where N = total virtual nodes
```

### Replication with Consistent Hashing

To replicate data for fault tolerance, store each key on the next **R** distinct physical servers clockwise:

```
  Replication factor R = 3
  
  Key at position 150:
    Primary:   S0 (position 200)
    Replica 1: S1 (position 350)  ← skip virtual nodes of same physical server
    Replica 2: S2 (position 500)
```

This is how DynamoDB and Cassandra handle replication — each key is stored on N successive distinct nodes on the ring.

---

## Consistent Hashing vs Rendezvous Hashing

| Aspect | Consistent Hashing | Rendezvous (HRW) Hashing |
|--------|-------------------|--------------------------|
| **Mechanism** | Hash ring with virtual nodes | Hash(key, server) — pick highest scoring server |
| **Memory** | O(V × N) for virtual nodes | O(N) per lookup |
| **Lookup time** | O(log(V × N)) with sorted map | O(N) — must evaluate all servers |
| **Add/remove node** | Move K/N keys | Move K/N keys |
| **Used by** | DynamoDB, Cassandra, Memcached | GitHub load balancing, some CDNs |

---

## Interview Cheat Sheet

**Q: What problem does consistent hashing solve?**
> When distributing data across N servers using `hash % N`, adding or removing a server remaps almost all keys — causing a cache avalanche. Consistent hashing maps both servers and keys onto a ring; a key is assigned to the next server clockwise. When a node changes, only K/N keys are remapped instead of nearly all.

**Q: What are virtual nodes and why are they needed?**
> With basic consistent hashing, servers can be unevenly distributed on the ring, causing hotspots. Virtual nodes assign each physical server multiple positions on the ring (100-200 typically). This creates a more uniform distribution of keys. More virtual nodes = better balance but more memory. You can also assign more virtual nodes to more powerful servers.

**Q: Where is consistent hashing used in real systems?**
> DynamoDB uses it to partition data across storage nodes. Cassandra uses it for data distribution and replication. CDNs use it to route content to edge servers. Memcached clients use it for cache distribution. Discord uses it to route users to chat servers. It's fundamental to any system that needs to distribute data across a dynamic set of nodes.

**Q: How does replication work with consistent hashing?**
> For a replication factor of R, each key is stored on R consecutive distinct physical servers walking clockwise around the ring. When a node fails, its keys are already replicated on the next nodes in the ring. The system only needs to create new replicas to restore the replication factor, not move all data.
