# Chapter 7 — Design a Unique ID Generator in Distributed Systems

> In a distributed system, you can't rely on a single auto-incrementing database sequence. You need a way to generate globally unique IDs across multiple servers without coordination.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Unique** | IDs must be globally unique across all servers |
| **Numerical** | IDs should be numerical values only (64-bit) |
| **Sortable by time** | IDs should be roughly sortable by generation time |
| **64-bit** | Fits in a long integer |
| **High throughput** | Generate 10,000+ IDs per second |
| **Low latency** | ID generation must be fast |

---

## Approach 1: Multi-Master Replication (Database Auto-Increment)

Use database auto-increment, but increment by N (number of servers):

```
  Server 1: 1, 3, 5, 7, 9, 11, ...    (increment by 2)
  Server 2: 2, 4, 6, 8, 10, 12, ...   (increment by 2)
```

| Pros | Cons |
|------|------|
| Simple to implement | Not time-sortable |
| Uses existing database | Hard to scale — adding a server changes the increment scheme |
| No single point of failure (multi-master) | IDs don't increase across servers (Server 2's ID may be less than Server 1's) |
| | Clock synchronization not guaranteed |

**Verdict**: Works for small-to-medium systems, but doesn't meet the time-sortable or easy-scaling requirements.

---

## Approach 2: UUID (Universally Unique Identifier)

A 128-bit identifier that can be generated independently by each server:

```
  UUID v4: 550e8400-e29b-41d4-a716-446655440000
           (128 bits, represented as 32 hex digits)
```

| Pros | Cons |
|------|------|
| No coordination between servers needed | 128-bit — too large (we need 64-bit) |
| Each server generates independently | Not numerically sortable by time |
| Very low probability of collision (2^122 space) | Not numeric — contains letters |
| Simple to implement | Not sequential — poor database index performance |
| | Can't extract timestamp from ID |

**UUID v7 (2022+)**: Addresses the sorting problem by embedding a Unix timestamp in the first 48 bits. Time-sortable but still 128-bit.

**Verdict**: Good for simplicity but doesn't meet 64-bit or time-sortable requirements.

---

## Approach 3: Ticket Server (Centralized)

A dedicated database server that issues sequential IDs:

```
  ┌──────────┐     ┌───────────────┐
  │ Service A│────▶│ Ticket Server │ → ID: 1001
  │ Service B│────▶│ (single DB    │ → ID: 1002
  │ Service C│────▶│  auto-incr)   │ → ID: 1003
  └──────────┘     └───────────────┘
```

**Flickr's implementation**: Uses MySQL `REPLACE INTO` with auto-increment on a dedicated ticket database. Two ticket servers for HA, each generating odd or even IDs.

| Pros | Cons |
|------|------|
| Numeric, sequential IDs | Single point of failure |
| Easy to implement | Becomes a bottleneck at high scale |
| Works well for medium scale | Adds network latency for every ID |
| | Hard to scale across data centers |

**Verdict**: Good for medium-scale systems. Flickr used this successfully, but it requires careful HA setup.

---

## Approach 4: Snowflake ID (Twitter) — Recommended

The gold standard for distributed ID generation. A 64-bit ID with embedded timestamp.

### Bit Layout

```
  ┌───────┬──────────────────────────────────────┬──────────┬──────────────┐
  │ Sign  │         Timestamp                     │ Machine  │  Sequence    │
  │ 1 bit │         41 bits                        │ ID       │  Number      │
  │       │         (milliseconds since epoch)     │ 10 bits  │  12 bits     │
  └───────┴──────────────────────────────────────┴──────────┴──────────────┘
    0       Bits 1-41                               Bits 42-51  Bits 52-63
```

### Component Breakdown

| Component | Bits | Range | Purpose |
|-----------|------|-------|---------|
| **Sign bit** | 1 | Always 0 (positive) | Reserved |
| **Timestamp** | 41 | 2^41 ms ≈ 69 years | Milliseconds since custom epoch |
| **Datacenter ID** | 5 | 0–31 (32 DCs) | Identifies the data center |
| **Machine ID** | 5 | 0–31 (32 machines/DC) | Identifies the server within a DC |
| **Sequence** | 12 | 0–4095 | Counter for IDs generated in the same millisecond |

### Key Properties

```
  Custom epoch: Jan 1, 2020 00:00:00 UTC
  
  ID generated at 2024-03-15 10:30:00.123 UTC on DC=5, Machine=12:
  
  Timestamp = (2024-03-15T10:30:00.123 - 2020-01-01T00:00:00.000) = X ms
  
  Binary: 0 | XXXXX...XXXXX (41 bits) | 00101 | 01100 | 000000000000
                timestamp               DC=5   M=12    seq=0
  
  IDs are naturally sorted by time (timestamp is the most significant portion)
```

### Capacity

```
  Per machine per millisecond: 2^12 = 4,096 IDs
  Per machine per second: 4,096 × 1,000 = 4,096,000 IDs/sec
  
  Total machines: 32 DCs × 32 machines = 1,024 machines
  Total system: 4,096,000 × 1,024 ≈ 4 billion IDs/sec
  
  Lifetime: 2^41 ms = 69.7 years from custom epoch
```

### Clock Synchronization Issue

Snowflake depends on synchronized clocks across machines. If a machine's clock drifts backward:

```
  t=100ms: generate ID with timestamp=100
  Clock drifts back to t=99ms
  t=99ms:  generate ID with timestamp=99 → OLDER than previous ID!
```

**Mitigations:**
1. **NTP (Network Time Protocol)** — synchronize clocks across machines
2. **Refuse to generate** IDs if clock goes backward — wait until time catches up
3. **Multi-leader approach** — tolerate small clock differences
4. **Logical clocks** — combine physical timestamp with logical counter

### Sequence Number Overflow

If 4,096 IDs/ms isn't enough (extremely high throughput):

```
  t=100ms: seq = 0, 1, 2, ... 4095
  seq overflows → wait until t=101ms → reset seq = 0
```

This introduces a tiny delay but prevents ID collision.

---

## Snowflake Variants in Industry

| System | Approach | Differences from Twitter Snowflake |
|--------|----------|-----------------------------------|
| **Twitter Snowflake** | Original 64-bit design | 41-bit timestamp, 10-bit machine, 12-bit sequence |
| **Discord** | Snowflake variant | Custom epoch (Discord's first second of 2015) |
| **Instagram** | Snowflake-inspired | 41-bit timestamp, 13-bit shard ID, 10-bit sequence |
| **Baidu (uid-generator)** | Enhanced Snowflake | Borrows bits from future seconds to handle bursts |
| **Sony (Sonyflake)** | Modified Snowflake | 39-bit timestamp (10ms resolution, 174 years), 8-bit sequence, 16-bit machine |
| **MongoDB ObjectId** | 96-bit variant | 32-bit timestamp, 40-bit random, 24-bit counter |

---

## Comparison Summary

| Approach | Unique | 64-bit | Sortable | Scale | Coordination |
|----------|--------|--------|----------|-------|-------------|
| Multi-Master | ✓ | ✓ | ✗ | Medium | Low |
| UUID | ✓ | ✗ (128-bit) | ✗ (v4) | High | None |
| Ticket Server | ✓ | ✓ | ✓ | Medium | Central DB |
| **Snowflake** | **✓** | **✓** | **✓** | **Very High** | **None (per-machine)** |

---

## Interview Cheat Sheet

**Q: How would you generate unique IDs in a distributed system?**
> Use a Snowflake-style approach: a 64-bit ID composed of a timestamp (41 bits), datacenter ID (5 bits), machine ID (5 bits), and sequence number (12 bits). Each machine generates IDs independently — no coordination needed. IDs are naturally sorted by time since the timestamp is in the most significant bits. This supports 4,096 IDs per millisecond per machine and works for 69 years from the custom epoch.

**Q: Why not just use UUID?**
> UUIDs are 128 bits (not 64), not numerically sortable by time (UUID v4), and contain non-numeric characters. They also create poor database index performance due to randomness. Snowflake IDs solve all these problems while maintaining the same "no coordination" benefit.

**Q: What if the clock goes backward on a server?**
> This is the main risk with timestamp-based IDs. Mitigations: (1) Use NTP to keep clocks synchronized. (2) If the clock goes backward, refuse to generate IDs until time catches up. (3) Log an alert for clock drift incidents. (4) As a fallback, some implementations use the sequence number to handle small clock adjustments.

**Q: What's the trade-off between Snowflake and a ticket server?**
> Snowflake: no coordination, very high throughput (4M IDs/sec/machine), but depends on clock synchronization. Ticket server: guaranteed sequential ordering, simple implementation, but is a centralized bottleneck and single point of failure. Choose Snowflake for high-scale distributed systems; ticket server for simpler systems where ordering guarantees are critical.
