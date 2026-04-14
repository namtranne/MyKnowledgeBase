# Chapter 1 — Reliability, Scalability & Maintainability

Modern applications are **data-intensive**, not compute-intensive. The bottleneck is rarely raw CPU power — it is the **amount of data**, the **complexity of data**, and the **speed at which it changes**.

A data-intensive application is typically assembled from standard building blocks:

| Component | Purpose | Examples |
|-----------|---------|----------|
| **Databases** | Store and retrieve data | PostgreSQL, MySQL, MongoDB, DynamoDB |
| **Caches** | Remember expensive computation results, speed up reads | Redis, Memcached, Varnish |
| **Search indexes** | Search by keyword, filter by attributes | Elasticsearch, Solr, Lucene |
| **Stream processing** | Send messages between processes asynchronously | Kafka, Flink, Pulsar |
| **Batch processing** | Periodically crunch large accumulated datasets | Spark, MapReduce, dbt |

The boundaries between these categories are blurring: Redis is used as a message queue, Kafka provides database-like durability guarantees. When you stitch multiple tools together behind an API, you become a **data system designer** — responsible for guarantees like "the cache is correctly invalidated when the underlying data changes."

Three concerns dominate the design of almost every data system: **reliability**, **scalability**, and **maintainability**.

---

## Reliability

> "Continuing to work correctly, even when things go wrong."

Reliability means the system performs its intended function at the expected performance level, tolerates user mistakes and unexpected usage, prevents unauthorized access, and continues doing all of this **in the face of faults**.

### Faults vs Failures — A Critical Distinction

- **Fault**: a single component deviates from its specification (a disk dies, a process crashes, a network packet is lost)
- **Failure**: the system as a whole stops providing the required service to users

The goal is never to eliminate all faults (impossible) — it is to build **fault-tolerance mechanisms** that prevent faults from escalating into failures. This is why Netflix built the **Chaos Monkey**: by deliberately injecting faults (killing random production processes), you exercise your fault-tolerance machinery constantly. Many critical production bugs stem from **untested error-handling paths** — code that was written but never actually triggered until a real outage.

### Hardware Faults

**Scale of the problem**: hard disks have a Mean Time To Failure (MTTF) of 10-50 years. On a storage cluster with 10,000 disks, you should statistically expect **one disk failure per day**.

**Traditional approach — hardware redundancy:**

| Component | Redundancy Mechanism |
|-----------|---------------------|
| Disks | RAID (mirroring, striping with parity) |
| Power supplies | Dual/redundant PSUs per server |
| CPUs | Hot-swappable processors |
| Datacenter power | UPS batteries + diesel generators |
| Network | Redundant NICs, switches, uplinks |

Hardware redundancy keeps a single machine running for years without interruption. For most applications historically, single-machine redundancy was sufficient because restoring from backup onto a new machine was fast enough.

**Modern shift — software fault tolerance:**

Cloud platforms like AWS design for **elasticity over single-machine reliability**. Virtual machines can disappear without warning. This drives a fundamental architectural shift: systems must tolerate the **loss of entire machines** through software-level redundancy (replication, failover). This also enables **rolling upgrades** — patch one node at a time without system-wide downtime.

### Software Faults

Hardware faults are typically **random and independent** — one machine's disk dying doesn't cause another machine's disk to die. Software faults are **systematic and correlated** — they can simultaneously affect every node in the system.

**Examples of systematic software faults:**

| Fault | Real-World Instance |
|-------|-------------------|
| Bug triggered by specific input | The Linux kernel leap second bug (June 30, 2012) caused widespread hangs across thousands of servers simultaneously |
| Runaway process consuming shared resources | A single process exhausting all CPU/memory/disk/bandwidth on a shared machine, starving co-located services |
| Cascading failures | A slow dependency causes timeouts, which cause retries, which increase load, which cause more timeouts — a positive feedback loop |
| Correlated node failures | A software update deployed to all nodes simultaneously contains a bug that crashes all of them |
| Silent data corruption | A service returns subtly wrong data without errors — consumers make bad decisions based on corrupted inputs |

**Why software faults are harder than hardware faults:**
- They lie dormant until triggered by unusual circumstances
- They are correlated — affect many nodes simultaneously (unlike independent hardware failures)
- They often involve assumptions about the environment that were true for months/years and then suddenly stop being true

**Mitigations (no silver bullet — layers of defense):**
- **Think carefully about assumptions and interactions**: what happens if this queue backs up? What if this service returns garbage instead of errors?
- **Thorough testing**: unit, integration, end-to-end, chaos/fault injection, property-based testing
- **Process isolation**: crash one process without taking down others (containers, separate JVMs)
- **Crash-and-restart design**: processes that can be killed and restarted cleanly (no corrupted state on disk)
- **Runtime invariant checking**: continuously verify invariants (e.g., "number of messages in = number of messages out" for a queue). Alert on discrepancies.
- **Monitoring and observability**: metrics, distributed tracing, structured logging. You can't fix what you can't see.

### Human Errors

Studies of large internet services show that **configuration errors by operators** cause the majority of outages (not hardware, not software bugs). Humans are unreliable — they cut corners, misunderstand complex systems, and make mistakes under pressure.

**Defense in depth against human errors:**

| Layer | Approach |
|-------|----------|
| **API/abstraction design** | Make the right thing easy and the wrong thing hard. Well-designed APIs, admin interfaces, and configuration formats that minimize room for error. But not so restrictive that people work around them. |
| **Sandbox environments** | Full production-like environments where people can explore and experiment safely with real data (anonymized). |
| **Testing at every level** | Unit tests for edge cases, integration tests for component interactions, end-to-end tests for user journeys, property-based tests for invariants, chaos engineering for fault resilience |
| **Quick rollback** | Fast rollback of configuration changes and code deployments. Blue-green deployments, canary releases, feature flags. |
| **Gradual rollouts** | Deploy changes to a small percentage of users/servers first. Monitor for anomalies before expanding. |
| **Telemetry and monitoring** | Detailed metrics, alerts, and dashboards. Performance baselines that detect deviations early. Real-time error rate tracking. |
| **Operational runbooks** | Documented procedures for common operations and incident response, reducing reliance on tribal knowledge under pressure |

---

## Scalability

> "As the system grows in data volume, traffic volume, or complexity, there should be reasonable ways of dealing with that growth."

Scalability is not a binary label ("this system is scalable / is not scalable"). It is a question: **"If the system grows in a particular way, what are our options for coping with the growth?"**

### Describing Load — Load Parameters

Before discussing scalability, you must precisely describe the **current load** using numbers that matter for your specific system:

- Requests per second to a web server
- Ratio of reads to writes in a database
- Number of simultaneously active users in a chat room
- Hit rate on a cache
- Number of messages per second in a message queue
- Volume of data stored and rate of growth

Different systems have different bottlenecks — the load parameters that matter are system-specific.

### Case Study: Twitter's Home Timeline (Fan-Out Problem)

Twitter has two main operations:
1. **Post tweet**: user publishes a new message (avg 4,600 tweets/sec, peak 12,000/sec)
2. **View home timeline**: user sees tweets from people they follow (300,000 requests/sec)

**Approach 1 — Pull model (fan-out on read):**

```
Post tweet:  INSERT INTO tweets (sender_id, text, timestamp) VALUES (...)
Read timeline: SELECT * FROM tweets
               JOIN follows ON tweets.sender_id = follows.followee_id
               WHERE follows.follower_id = :current_user
               ORDER BY timestamp DESC LIMIT 100
```

Simple, but the timeline query is expensive — it must join the tweets table with the follows table for every timeline request. At 300k reads/sec, this doesn't scale.

**Approach 2 — Push model (fan-out on write):**

Maintain a **per-user home timeline cache** (like a mailbox). When user X posts a tweet:
1. Look up all followers of X
2. Insert the tweet into each follower's timeline cache
3. Reading the timeline is now a simple, pre-computed lookup

This shifts work from read time to write time. Average tweet fan-out is manageable, but **celebrities with 30+ million followers** create a problem: a single tweet triggers 30 million cache writes.

**Approach 3 — Hybrid:**
- For normal users: fan-out on write (push to followers' caches)
- For celebrities: fan-out on read (merge their tweets into the timeline at read time)

This is what Twitter actually does. The architecture was driven by the distribution of followers per user (a power-law distribution where most users have few followers but some have millions).

**Key lesson**: the choice of approach depends on the specific distribution of your load parameters, not on abstract scalability principles.

### Describing Performance

When load increases, you can ask two questions:
1. **Fixed resources**: how does performance degrade?
2. **Fixed performance target**: how many more resources are needed?

#### Throughput vs Response Time

| Metric | Definition | Used For |
|--------|-----------|----------|
| **Throughput** | Number of records/requests processed per unit time | Batch processing systems (Hadoop, Spark) |
| **Response time** | Wall-clock time between client sending a request and receiving a response | Online/interactive systems (web servers, APIs) |

**Response time ≠ latency.** Response time = network round-trip + queueing + service time. Latency is just the waiting time (the time a request spends waiting to be handled).

#### Response Time Is a Distribution, Not a Single Number

The same request to the same service can take wildly different times due to: context switches, garbage collection pauses, disk I/O, network retransmits, cache misses, lock contention.

**Use percentiles, not averages:**

| Percentile | Meaning | Significance |
|-----------|---------|--------------|
| **p50 (median)** | Half of requests are faster, half slower | Typical user experience |
| **p95** | 95% of requests are faster | Reasonable worst case |
| **p99** | 99% of requests are faster | Important for SLAs; often affects power users (most data, most purchases) |
| **p999** | 99.9% of requests are faster | Diminishing returns to optimize further; often driven by uncontrollable factors |

**Why tail latencies matter:**
- Users with the **most data** (most purchases, most activity) are your most valuable users — and they're the ones most likely to experience slow requests
- A single end-user request may fan out to multiple backend services in parallel. If any one is slow, the whole request is slow (**tail latency amplification**). With 5 parallel backend calls at p99=1s, there's a ~5% chance that at least one call takes >1s.

**SLOs and SLAs:**
- **SLO (Service Level Objective)**: internal target (e.g., "p99 response time under 200ms")
- **SLA (Service Level Agreement)**: contract with customers, with consequences for violations (e.g., refunds)
- Typically defined as: "the median response time shall be less than 200ms, and the 99th percentile shall be less than 1s"

#### Head-of-Line Blocking

In systems with request queueing (most servers), a small number of slow requests can hold up processing of subsequent fast requests. Even if those subsequent requests would individually be fast, they experience high response times because they're stuck behind slow ones. This is why measuring response time **on the client side** is critical — server-side metrics don't capture queueing delays.

#### Measuring Percentiles in Practice

- **Sliding window**: compute percentiles over a rolling time window (e.g., last 10 minutes)
- **Approximate algorithms**: t-digest, HdrHistogram — compute percentiles without storing every data point
- **Forward decay**: weight recent data more heavily than older data
- **Don't aggregate percentiles by averaging** — averaging p99 values from multiple machines is mathematically meaningless. Aggregate the underlying histograms, then compute percentiles.

### Approaches for Coping with Load

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Scaling up (vertical)** | Move to a more powerful machine (more RAM, more CPUs, faster disks) | Simpler to reason about; practical limit (largest available machine) |
| **Scaling out (horizontal)** | Distribute load across multiple smaller machines (shared-nothing architecture) | Beyond single-machine limits; need fault tolerance |
| **Elastic scaling** | Automatically add/remove machines based on load | Unpredictable or spiky load patterns |
| **Manual scaling** | Human decides when to add capacity | Simpler, more predictable; avoids "scaling surprises" |

**Practical reality:**
- Keeping your database on a single node (scaling up) is simpler until forced to distribute. Distributing stateful systems across multiple nodes introduces enormous complexity.
- Stateless services are easy to distribute — just run more instances behind a load balancer.
- Stateful services (databases) are hard to distribute — partitioning, replication, consistency, transactions across nodes.
- There is no one-size-fits-all scalable architecture. An architecture designed for 100,000 requests/sec (each 1 KB) is very different from one designed for 3 requests/min (each 2 GB). The architecture depends on: read volume, write volume, data volume, data complexity, response time requirements, and access patterns.
- A system designed for 10x current load is usually very different from one designed for 100x.

---

## Maintainability

> "Over time, many different people will work on the system. They should all be able to work on it productively."

The majority of software cost is not the initial development — it is **ongoing maintenance**: fixing bugs, keeping systems operational, investigating failures, adapting to new platforms, repaying technical debt, adding new features.

### Operability — Making Life Easy for Operations

Good operations can work around bad software, but good software can't compensate for bad operations.

**What good operations teams do:**
- Monitor system health and quickly restore service when things go wrong
- Track down the root cause of problems (degraded performance, unexpected behavior)
- Keep software and platforms up to date (security patches, dependency upgrades)
- Understand how different systems interact and affect each other
- Anticipate future problems (capacity planning, traffic forecasting)
- Establish good practices for deployment, configuration management, and change control
- Perform complex maintenance tasks (database migrations, platform moves, certificate rotations)
- Maintain system security as configuration and environment changes
- Define repeatable processes that make operations predictable
- Preserve institutional knowledge (even as individuals come and go)

**Design for operability:**
- Provide **visibility** into system internals: runtime metrics, request tracing, resource utilization, error rates, queue depths, replication lag
- Support **automation** with standard tools: scriptable admin interfaces, configuration management, infrastructure-as-code
- **Avoid hidden dependencies**: make the coupling between systems explicit and documented
- Provide **good defaults** but allow administrators to override them
- Exhibit **predictable behavior**: no surprises during routine operations
- Support **self-healing** where possible, but always allow **manual override** for operators who know better

### Simplicity — Managing Complexity

As systems grow, they accumulate **accidental complexity** — complexity that is not inherent in the problem being solved but arises from the implementation:

| Symptom | Description |
|---------|-------------|
| Tight coupling | Change in one module requires changes in many others |
| Tangled dependencies | It's impossible to understand one component without understanding all the others |
| Inconsistent naming and terminology | Same concept called different things in different places |
| Hacks for performance | Special-case logic that makes the general case harder to understand |
| State space explosion | Too many possible states make it impossible to reason about correctness |

**The primary weapon against accidental complexity: abstraction.**

Good abstractions hide implementation details behind clean, well-defined interfaces:
- **SQL** hides the complexity of storage engines, query optimization, indexing, and concurrency control
- **Programming languages** hide machine code, register allocation, and memory management
- **TCP** hides packet retransmission, flow control, and congestion avoidance
- **Operating systems** hide hardware differences, process scheduling, and memory mapping

Finding good abstractions is hard — but when you find one, it enables the rest of the system to be simpler, more testable, and more evolvable.

### Evolvability (Extensibility, Modifiability, Plasticity)

System requirements change constantly: new features, changing business rules, new platforms, regulatory changes, organizational restructuring, scaling needs.

**Evolvability is tightly linked to simplicity**: a simple, well-abstracted system is much easier to modify than a tangled mess of interdependent components.

Agile methodologies (TDD, refactoring, continuous integration) provide a **process framework** for adapting to change at the team level. This chapter's discussion of evolvability applies the same philosophy at the **data system architecture level** — designing systems whose architecture can evolve as requirements change, without requiring a complete rewrite.

The rest of the book is essentially about building systems that achieve reliability, scalability, and maintainability through specific technical approaches: data models, storage engines, encoding formats, replication, partitioning, transactions, consensus algorithms, batch and stream processing.
