# Chapter 2 — Back-of-the-Envelope Estimation

> In system design interviews, you're expected to estimate system capacity using rough calculations. Precision isn't the goal — demonstrating structured thinking about scale is.

---

## Why Estimation Matters

- Interviewers want to see that you can **reason about scale** before diving into design
- Helps determine: how many servers? What storage? What bandwidth? What cache size?
- Jeff Dean (Google): "Back-of-the-envelope calculations are estimates you create using a combination of thought experiments and common performance numbers to get a good feel for which designs will meet your requirements."

---

## Power of Two — Data Volume Units

Every engineer should know these by heart:

| Power | Approximate Value | Name | Short |
|-------|------------------|------|-------|
| 2^10 | 1 Thousand | 1 Kilobyte | 1 KB |
| 2^20 | 1 Million | 1 Megabyte | 1 MB |
| 2^30 | 1 Billion | 1 Gigabyte | 1 GB |
| 2^40 | 1 Trillion | 1 Terabyte | 1 TB |
| 2^50 | 1 Quadrillion | 1 Petabyte | 1 PB |

**Useful approximations:**
- 1 ASCII character = 1 byte
- 1 Unicode/UTF-8 character = 2-4 bytes (typically assume 2)
- A UUID = 128 bits = 16 bytes
- A timestamp (epoch) = 4 bytes (32-bit) or 8 bytes (64-bit)
- An average metadata record ≈ 500 bytes – 1 KB
- An average web page ≈ 2–5 MB
- An average photo (compressed) ≈ 200 KB – 2 MB
- An average video (1 min, compressed) ≈ 5–50 MB

---

## Latency Numbers Every Programmer Should Know

These numbers, originally compiled by Jeff Dean and updated by others, define the performance landscape:

| Operation | Latency | Notes |
|-----------|---------|-------|
| L1 cache reference | 0.5 ns | |
| Branch mispredict | 5 ns | |
| L2 cache reference | 7 ns | 14x L1 |
| Mutex lock/unlock | 25 ns | |
| Main memory reference | 100 ns | 20x L2, 200x L1 |
| Compress 1 KB with Zippy | 3 μs (3,000 ns) | |
| Send 1 KB over 1 Gbps network | 10 μs | |
| Read 4 KB randomly from SSD | 150 μs | ~1 GB/sec SSD |
| Read 1 MB sequentially from memory | 250 μs | |
| Round trip within same datacenter | 500 μs | |
| Read 1 MB sequentially from SSD | 1 ms | 4x memory |
| HDD disk seek | 10 ms | 20x SSD random |
| Read 1 MB sequentially from HDD | 20 ms | 80x memory |
| Send packet CA → Netherlands → CA | 150 ms | |

### Key Takeaways from Latency Numbers

1. **Memory is fast; disk is slow** — 1 MB from memory (250 μs) vs 1 MB from HDD (20 ms) = **80x difference**
2. **SSD is much faster than HDD** — but still 4x slower than memory for sequential reads
3. **Avoid disk seeks** — HDD random seek is 10 ms, a catastrophic cost at scale
4. **Simple compression is fast** — compress data before sending over the network (3 μs to compress vs 10 μs to send 1 KB)
5. **Cross-datacenter round trips are expensive** — 500 μs within DC vs 150 ms cross-continent = **300x difference**
6. **Data centers should be close to users** — every 1,000 km adds ~6.7 ms of latency (speed of light in fiber)

---

## Availability Numbers

Availability is measured as a percentage of uptime. High availability (HA) systems target 99.9% or above.

| Availability % | Downtime/Year | Downtime/Month | Downtime/Week | Common Name |
|----------------|---------------|----------------|---------------|-------------|
| 99% | 3.65 days | 7.31 hours | 1.68 hours | Two nines |
| 99.9% | 8.77 hours | 43.83 min | 10.08 min | Three nines |
| 99.99% | 52.60 min | 4.38 min | 1.01 min | Four nines |
| 99.999% | 5.26 min | 26.30 sec | 6.05 sec | Five nines |
| 99.9999% | 31.56 sec | 2.63 sec | 0.60 sec | Six nines |

**Context for interviews:**
- Most cloud SLAs guarantee 99.9% – 99.99%
- AWS S3 targets 99.999999999% (11 nines) for **durability** (data not lost)
- Google targets 99.99% **availability** for Cloud Spanner
- An SLA of 99.99% means you have about **52 minutes per year** of total allowed downtime

---

## Estimation Framework

### Step 1: Clarify Assumptions

Always state your assumptions explicitly. Interviewers want to see your reasoning, not memorized numbers.

### Step 2: Common Estimation Types

| What to Estimate | Formula |
|-----------------|---------|
| **QPS (Queries Per Second)** | Daily Active Users × Avg queries per user / 86,400 |
| **Peak QPS** | QPS × 2 (or × 3 for spiky traffic) |
| **Storage** | Daily new records × record size × retention period |
| **Bandwidth** | QPS × average request/response size |
| **Cache size** | Follow the 80/20 rule: cache 20% of daily data |
| **Number of servers** | Peak QPS / QPS-per-server |

### Step 3: Round Aggressively

The goal is order-of-magnitude accuracy. Round to powers of 10 or convenient numbers.

---

## Worked Example: Twitter-Scale Estimation

**Assumptions:**
- 300 million Monthly Active Users (MAU)
- 50% use Twitter daily → **150 million DAU**
- Each user posts 2 tweets/day on average
- 10% of tweets have media (image)
- Data is stored for 5 years

### QPS Estimation

```
Tweet writes:
  150M DAU × 2 tweets/day = 300M tweets/day
  300M / 86,400 sec/day ≈ 300M / 100K ≈ 3,000 QPS (write)
  
  Peak QPS = 3,000 × 2 = 6,000 QPS

Tweet reads (assuming 10x read-to-write ratio):
  Read QPS ≈ 30,000 QPS
  Peak Read QPS ≈ 60,000 QPS
```

### Storage Estimation

```
Tweet text:
  tweet_id (8 bytes) + user_id (8 bytes) + text (140 chars × 2 bytes) + 
  timestamp (8 bytes) + metadata (100 bytes)
  ≈ 400 bytes per tweet

Daily text storage:
  300M tweets/day × 400 bytes = 120 GB/day

Media storage (10% of tweets have a 200 KB image):
  300M × 0.10 × 200 KB = 6 TB/day

Total daily storage ≈ 6.12 TB/day

5-year storage:
  6.12 TB/day × 365 days × 5 years ≈ 11.2 PB
```

### Bandwidth Estimation

```
Ingress (writes):
  6.12 TB/day / 86,400 sec ≈ 70 MB/s

Egress (reads — assuming 10x read-to-write):
  70 MB/s × 10 ≈ 700 MB/s ≈ 5.6 Gbps
```

### Cache Estimation (80/20 Rule)

```
Daily read data = 120 GB text + 60 TB media reads (assume 10x)
Cache 20% of daily text reads:
  120 GB × 10 (read amplification) × 0.20 = 240 GB of cache

This fits in a few Redis/Memcached nodes with 64-128 GB RAM each.
```

---

## Common Numbers for Interviews

### User Scale Reference

| Service | DAU (approx.) | QPS (approx.) |
|---------|--------------|---------------|
| Small startup | 10K – 100K | 10 – 1,000 |
| Mid-size app | 1M – 10M | 1K – 100K |
| Twitter | 150M | 300K+ |
| Facebook | 2B | 1M+ |
| Google Search | 1B+ | 100K+ |

### Infrastructure Reference

| Resource | Capacity |
|----------|----------|
| Single web server | 100 – 1,000 QPS (depends on complexity) |
| Single MySQL instance | ~1,000 – 10,000 QPS (reads); ~1,000 QPS (writes) |
| Redis (single node) | 100,000+ QPS |
| Kafka (single broker) | 100,000+ messages/sec |
| Network bandwidth (1 Gbps) | ~125 MB/s theoretical max |

---

## Tips for the Interview

1. **Write down your assumptions** — never calculate in your head silently
2. **Label your units** — bytes vs bits, seconds vs days
3. **Round numbers** — 365 ≈ 400, 86400 ≈ 100,000 for quick math
4. **State precision level** — "this is an order-of-magnitude estimate"
5. **Check reasonableness** — does 11 PB for 5 years of Twitter data feel right? (Yes — Twitter reportedly uses many petabytes)
6. **Use the right abbreviations** — QPS, DAU, MAU, TPS
7. **Know the common conversions**:
   - 1 day = 86,400 seconds ≈ 10^5 seconds
   - 1 month ≈ 2.5 × 10^6 seconds
   - 1 year ≈ 3 × 10^7 seconds
   - 1 million requests/day ≈ 12 QPS

---

## Interview Cheat Sheet

**Q: How would you estimate the storage needs for a URL shortener?**
> Assumptions: 100M new URLs/day, each mapping is ~500 bytes (short URL + long URL + metadata), retain for 10 years. Daily: 100M × 500 bytes = 50 GB/day. 10 years: 50 GB × 365 × 10 ≈ 183 TB. Add 3x for replication ≈ 550 TB total. This is large but manageable with sharding across a few hundred database nodes.

**Q: How do you estimate QPS for a service?**
> Start with DAU. Estimate average actions per user per day. Divide by 86,400 seconds. Multiply by 2–3x for peak. Example: 10M DAU × 5 actions/day = 50M/day ÷ 100K ≈ 500 QPS average, 1,500 QPS peak.

**Q: Why is back-of-the-envelope estimation important?**
> It helps validate whether a proposed architecture can actually handle the expected load before investing time in detailed design. It reveals bottlenecks early — if a single database can handle 5K QPS and you need 100K, you know upfront you need sharding or caching. It demonstrates engineering maturity to interviewers.

**Q: What latency numbers should I know?**
> Memory reference: 100 ns. SSD random read: 150 μs. Same-datacenter round trip: 500 μs. SSD sequential 1 MB: 1 ms. HDD seek: 10 ms. HDD sequential 1 MB: 20 ms. Cross-continent round trip: 150 ms. The key insight: memory is 80x faster than disk for sequential reads, and network latency within a datacenter is 300x less than cross-continent.
