# Chapter 10 — Batch Processing

Three types of systems classified by their response pattern:

| Type | Input/Output | Performance Metric | Example |
|------|-------------|-------------------|---------|
| **Services (online)** | Request → Response | Response time, availability | Web servers, APIs |
| **Batch processing (offline)** | Large dataset → Derived dataset | Throughput (records/second) | MapReduce, Spark, data pipelines |
| **Stream processing (near-real-time)** | Continuous event stream → Continuous output | Latency, throughput | Kafka Streams, Flink |

Batch processing takes a **bounded, fixed-size input dataset**, processes it, and produces a **derived output**. No user is waiting for the result — it runs in the background on a schedule or trigger.

---

## The Unix Philosophy

The conceptual foundation for batch processing. Unix pipes from the 1970s embody principles that MapReduce and modern dataflow engines inherit directly.

### Core Principles

1. **Each program does one thing well** — write programs that do one thing and do it well
2. **Output of every program becomes input to another** — expect every output to become input
3. **Uniform interface** — text streams as the universal connector between programs
4. **Design for composition** — don't clutter output with extraneous information; favor flat text over binary formats
5. **Immutable inputs** — programs don't modify their input files; they produce new output

### Example: Log Analysis Pipeline

```bash
cat /var/log/nginx/access.log |
  awk '{print $7}' |           # Extract the URL path (7th field)
  sort |                        # Sort alphabetically
  uniq -c |                     # Count unique occurrences
  sort -rn |                    # Sort by count (descending)
  head -n 5                     # Top 5 URLs
```

Each step is simple and reusable. The `sort` command automatically handles datasets larger than memory (spilling to disk, parallel merge-sort). The pipeline is debuggable — you can examine intermediate output at any stage.

**The key insight for data systems:** by decomposing complex processing into composable steps with a uniform interface (text streams / files), you get:
- **Debuggability:** examine intermediate results
- **Reusability:** each step can be used in other pipelines
- **Fault tolerance:** if a step fails, restart it from its input (which is unchanged)
- **Parallelism:** the OS handles pipe buffering; tools like `sort` parallelize internally

### Where Unix Pipes Fall Short

- **Single machine only** — can't distribute across a cluster
- **Text-only interface** — parsing text is fragile, no type safety, no schema
- **No support for multiple inputs** — a program reads one stdin, writes one stdout (no joins)

MapReduce addresses these limitations while preserving the Unix philosophy.

---

## MapReduce and Distributed Filesystems

**MapReduce = Unix philosophy applied to a distributed filesystem (HDFS).**

### HDFS (Hadoop Distributed File System)

Based on Google's GFS (Google File System) paper. Architecture:

```
                    ┌──────────────┐
                    │   NameNode   │  (metadata: which blocks on which DataNodes)
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ DataNode 1│   │ DataNode 2│   │ DataNode 3│
    │           │   │           │   │           │
    │ Block A-1 │   │ Block A-2 │   │ Block A-3 │  ← 3 replicas of Block A
    │ Block B-1 │   │ Block C-1 │   │ Block B-2 │
    │ Block D-1 │   │ Block D-2 │   │ Block C-2 │
    └───────────┘   └───────────┘   └───────────┘
```

- Files split into **blocks** (typically 128 MB each)
- Each block replicated across multiple machines (default: 3 replicas on different racks)
- **NameNode** tracks which blocks are on which DataNodes (metadata fits in memory)
- Designed for **high aggregate throughput** (streaming reads of large files), not low-latency random access
- Runs on **commodity hardware** — tolerates individual machine failures through replication

### How MapReduce Works

A MapReduce job has two user-defined functions connected by a framework-managed shuffle:

```
Input files                    Map Phase                 Shuffle & Sort              Reduce Phase              Output files
(HDFS)                                                                                                        (HDFS)

┌──────────┐    ┌─────────┐                                              ┌─────────┐    ┌──────────┐
│ Split 1  │───▶│ Mapper 1│──┐                                       ┌──▶│Reducer 1│───▶│ Output 1 │
├──────────┤    └─────────┘  │    ┌──────────────────────────┐       │   └─────────┘    └──────────┘
│ Split 2  │───▶│ Mapper 2│──┼───▶│ Partition by key,        │───────┤
├──────────┤    └─────────┘  │    │ Sort by key within       │       │   ┌─────────┐    ┌──────────┐
│ Split 3  │───▶│ Mapper 3│──┘    │ each partition           │───────┴──▶│Reducer 2│───▶│ Output 2 │
└──────────┘    └─────────┘       └──────────────────────────┘           └─────────┘    └──────────┘
```

**Map phase:**
- Input split into chunks; **one mapper per chunk** (locality: mapper runs on the machine that stores the chunk when possible)
- Mapper is called once per input record
- Mapper outputs zero or more **(key, value) pairs** — the key is the grouping criterion
- Mappers must be **pure functions** (no side effects, no external state)

**Shuffle and Sort:**
- Framework collects all mapper outputs
- **Partitions** them by key (hash of key mod number of reducers — all values for the same key go to the same reducer)
- **Sorts** all values by key within each partition
- Transfers data across the network to reducer machines

**Reduce phase:**
- Reducer receives a key and **all values for that key** (sorted, from all mappers)
- Produces output (aggregation, joining, filtering)
- Output written to HDFS

### MapReduce Joins

Joining datasets in a distributed system is the most challenging aspect of batch processing. The key idea: **bring related data to the same place** (same reducer) using the shuffle phase.

#### Sort-Merge Join (Reduce-Side Join)

**Problem:** join a large "events" dataset with a smaller "users" dataset on `user_id`.

```
Mapper 1 (reads events):    emit (user_id, {"type": "event", ...})
Mapper 2 (reads users):     emit (user_id, {"type": "user", name: "Alice", ...})

Shuffle: all records with user_id = 123 go to the same reducer

Reducer receives:
  user_id = 123:
    {"type": "user", name: "Alice"}    ← user record (sorted first via secondary sort)
    {"type": "event", action: "click"} ← event record
    {"type": "event", action: "buy"}   ← event record

Reducer loads user record into memory, then iterates through events,
emitting joined records: {user: "Alice", action: "click"}, {user: "Alice", action: "buy"}
```

**Secondary sort:** within the same key, tag records so the "user" record comes before "event" records → reducer sees the user first, loads it into memory, then streams through events without loading all events into memory.

This works even when both datasets are too large to fit in memory — the framework handles the distributed sort.

#### Broadcast Hash Join (Map-Side Join)

When one side of the join is **small enough to fit in memory**:

```
Small dataset (users): loaded into memory as a hash map on each mapper
Large dataset (events): each mapper reads its partition and looks up user_id in the hash map
```

- No reducer needed, no shuffle — much faster than reduce-side join
- Each mapper loads the entire small dataset into memory
- The small dataset can be loaded from HDFS or distributed via a distributed cache (Hadoop DistributedCache)

#### Partitioned Hash Join (Bucket Map Join)

When both datasets are pre-partitioned the same way (by the same key, same number of partitions):

```
Both datasets partitioned by user_id into 100 buckets:
  events_bucket_42 ← contains events for user_ids that hash to bucket 42
  users_bucket_42  ← contains user records for user_ids that hash to bucket 42

Each mapper loads only the matching users_bucket into memory
and joins with the matching events_bucket.
```

Much less memory needed per mapper (only 1/100th of the small dataset).

### MapReduce Output Patterns

MapReduce follows Unix principles: **never modify the input; always produce new output.**

| Output Pattern | Description |
|----------------|-------------|
| **Building search indexes** | Mappers partition documents, reducers build index segments. Deploy index segments to serving cluster. (Google's original use case.) |
| **Building key-value stores** | Reducer writes sorted key-value files (e.g., HFile for HBase, SSTable). Bulk-load these files into the serving database. Much faster than individual INSERT statements. |
| **Precomputing aggregations** | Compute materialized views, summary statistics, ML features — write results for fast serving |

**Why immutable outputs matter:**
- If the job fails, rerun it — the input is unchanged
- Easy debugging — examine intermediate outputs at every stage
- Can run multiple versions of the same job (A/B testing) on the same input
- Human review before swapping the output into production

---

## Beyond MapReduce

### The Problem with MapReduce Materialization

MapReduce **fully materializes** every intermediate result — writes mapper output to disk (on local filesystem) and reducer output to HDFS (replicated).

For workflows with multiple MapReduce jobs chained together, this creates significant overhead:

```
Job 1: Map → Shuffle → Reduce → Write to HDFS (replicated 3x)
Job 2: Read from HDFS → Map → Shuffle → Reduce → Write to HDFS (replicated 3x)
Job 3: Read from HDFS → Map → Shuffle → Reduce → Write to HDFS (replicated 3x)

Problems:
1. Each intermediate result is written to HDFS and replicated — enormous I/O
2. Job 2 can't start until Job 1 is completely finished
3. Mappers in Job 2 are often trivial (just read and re-partition previous output)
4. Scheduler must figure out data locality for each job independently
```

### Dataflow Engines (Spark, Tez, Flink)

Model the entire workflow as a **single job** — a directed acyclic graph (DAG) of operators connected by data channels:

```
MapReduce workflow:                    Dataflow engine:

[Map] → disk → [Reduce] → HDFS →     [Operator] → memory → [Operator] → memory → [Operator]
[Map] → disk → [Reduce] → HDFS →                    └─── disk (spill if needed)
[Map] → disk → [Reduce]                              └─── network (if repartition needed)
```

**Key improvements over MapReduce:**

| Improvement | Impact |
|-------------|--------|
| **No unnecessary map stages** | If the input is already partitioned correctly, skip the map step |
| **Sort only when needed** | MapReduce always sorts between map and reduce. Dataflow engines only sort when the operator requires it (e.g., sort-merge join). Hash joins don't need sorted input. |
| **In-memory intermediate state** | Intermediate data kept in memory (or spilled to local disk if too large). Not written to HDFS until the final output. |
| **Pipelining** | Operators can start as soon as their input is ready — no need to wait for the entire preceding stage to finish |
| **JVM reuse** | Existing JVM processes are reused for new operators — eliminates per-job JVM startup overhead |
| **Locality optimization** | The scheduler has a global view of the entire DAG and can co-locate operators that exchange data on the same machine |

**Spark** uses the abstraction of **RDDs (Resilient Distributed Datasets)** — immutable, partitioned collections that track their lineage (how they were computed from other RDDs). If a partition is lost (machine failure), it can be recomputed from its source data.

**Flink** uses **checkpointing** — periodically saves the state of each operator. On failure, restart from the last checkpoint and replay the input since then.

**Tez** (from the Hadoop ecosystem) provides a lightweight dataflow framework that Hive and Pig compile to.

**Key requirement for fault tolerance:** operators should be **deterministic** (same input → same output). If a failed operator is re-executed and produces different output (because it depends on randomness or external state), downstream operators that already processed the old output have a consistency problem → must also be re-executed → cascading re-execution.

### Graph Processing: Pregel / Bulk Synchronous Parallel (BSP)

**Problem:** many important algorithms operate on graphs — PageRank, shortest paths, connected components, community detection, fraud detection. These algorithms are **iterative** — repeat computation until convergence. MapReduce has no native iteration support (you'd have to schedule a new MapReduce job for each iteration).

**Pregel model (Google, 2010):**

Computation proceeds in **supersteps**:

```
Superstep 0:              Superstep 1:              Superstep 2:
┌─────────┐               ┌─────────┐               ┌─────────┐
│Vertex A │──message──▶   │Vertex A │──message──▶   │Vertex A │
│ process │               │ process │               │ (halted)│
│ messages│               │ messages│               │         │
└─────────┘               └─────────┘               └─────────┘
┌─────────┐               ┌─────────┐               ┌─────────┐
│Vertex B │──message──▶   │Vertex B │               │Vertex B │
│ process │               │ (halted)│               │ (halted)│
└─────────┘               └─────────┘               └─────────┘
```

1. Each vertex processes messages received from the previous superstep
2. Each vertex can: update its state, send messages to other vertices (along edges), vote to halt
3. A halted vertex wakes up if it receives a new message
4. Algorithm terminates when **all vertices have voted to halt AND no messages are in transit**

**Implementations:** Apache Giraph, Spark GraphX, Flink Gelly.

**Challenge:** graph partitioning. Sending messages between vertices on different machines requires network communication. A "good" graph partition (few edges crossing machine boundaries) is itself a hard optimization problem. In practice, many graphs (social networks, web graphs) have high cross-partition connectivity → significant network overhead regardless of partitioning strategy.

### High-Level APIs and Declarative Optimizations

The trend in batch processing is toward **declarative, SQL-like APIs** that allow the framework to optimize execution:

| Tool | What It Does |
|------|-------------|
| **Hive** | SQL queries on HDFS → compiled to MapReduce/Tez/Spark |
| **Spark SQL** | SQL and DataFrame API on Spark |
| **Pig** | Procedural data flow language → compiled to MapReduce/Tez |
| **Presto / Trino** | Interactive SQL on HDFS/S3/databases (MPP engine, no MapReduce) |
| **Apache Drill** | Schema-free SQL on JSON, Parquet, HBase, etc. |
| **Impala** | MPP SQL engine for Hadoop, optimized for low-latency interactive queries |

**Why declarative matters:** when you express logic as SQL or DataFrames instead of imperative map/reduce functions, the optimizer can:
- Push predicates down to the scan level (read fewer rows)
- Choose the best join algorithm (broadcast hash join vs sort-merge join)
- Use columnar storage and vectorized processing
- Optimize the physical execution plan across the entire query

This mirrors the advantage of SQL over imperative queries in single-machine databases — the optimizer knows tricks that most developers don't.
