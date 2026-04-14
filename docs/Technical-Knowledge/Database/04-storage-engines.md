---
sidebar_position: 5
title: "04 — Storage Engines & Data Structures"
---

# 💾 Storage Engines & Data Structures

Understanding how data is physically stored, organized, and retrieved from disk is what differentiates senior engineers from those who just write SQL. This chapter covers the internals that databases hide behind their query interfaces.

---

## 📄 Page-Oriented Storage

Databases don't read/write individual rows — they operate on fixed-size **pages** (typically 4 KB, 8 KB, or 16 KB). A page is the smallest unit of I/O.

### How Rows Map to Pages

```
Disk:
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Page 0  │ Page 1  │ Page 2  │ Page 3  │ Page 4  │
│ (header)│ (data)  │ (data)  │ (data)  │ (free)  │
└─────────┴─────────┴─────────┴─────────┴─────────┘

Inside a data page (e.g., PostgreSQL 8KB page):
┌──────────────────────────────────────────────┐
│  Page Header (24 bytes)                      │
│  - page_lsn, checksum, flags                 │
├──────────────────────────────────────────────┤
│  Item Pointers (line pointers array)         │
│  [offset1, len1] [offset2, len2] ...         │
│  ↓ grows downward                            │
├──────────────────────────────────────────────┤
│                                              │
│         Free Space                           │
│                                              │
├──────────────────────────────────────────────┤
│  ↑ grows upward                              │
│  Tuple Data (actual row data)                │
│  [row3] [row2] [row1]                        │
├──────────────────────────────────────────────┤
│  Special Space (e.g., B-Tree pointers)       │
└──────────────────────────────────────────────┘
```

:::info Key Insight
Item pointers provide **indirection** — when a row is updated, only the pointer needs to change, not every index entry that references the row. This is how PostgreSQL's HOT (Heap-Only Tuple) optimization works.
:::

---

## 📁 Heap Files vs. Sorted Files

| Aspect | Heap File | Sorted File |
|--------|-----------|-------------|
| **Organization** | Rows stored in insertion order | Rows sorted by a key |
| **Insert** | Fast — append to any page with space | Slow — must find correct position, may cause page splits |
| **Point lookup (by key)** | Slow — full scan without index | Fast — binary search |
| **Range scan** | Slow — full scan | Fast — sequential read |
| **Used by** | PostgreSQL (heap), Oracle | InnoDB clustered index (rows sorted by PK) |

In practice, most databases use **heap files** with **B+Tree indexes** for lookups, or **clustered indexes** where the table data itself is stored in B+Tree order.

---

## 🌲 B-Tree Storage Engine

### How InnoDB Works

InnoDB (MySQL's default engine) uses a **clustered B+Tree** where the leaf nodes contain the actual row data, sorted by primary key.

```
InnoDB Clustered Index:

                    ┌──────────────────┐
                    │   Root Page      │
                    │   [50 | 100]     │
                    └──┬─────┬─────┬──┘
            ┌──────────┘     │     └──────────┐
            ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ Internal   │   │ Internal   │   │ Internal   │
   │ [10|20|30] │   │ [60|70|80] │   │[110|120]   │
   └┬──┬──┬──┬─┘   └┬──┬──┬──┬─┘   └┬──┬──┬────┘
    ▼  ▼  ▼  ▼       ▼  ▼  ▼  ▼       ▼  ▼  ▼
   ┌──┐┌──┐┌──┐┌──┐ (leaf pages containing full row data)
   │  ││  ││  ││  │
   │PK│ │PK│ │PK│ │PK│
   │=1│ │=2│ │=3│ │=4│
   │..│ │..│ │..│ │..│
   │  │ │  │ │  │ │  │
   └↔─┘└↔─┘└↔─┘└↔─┘  ◄── Leaf pages doubly linked
```

### Page Splits and Merges

When a leaf page is full and a new row must be inserted:

```
Before (page full):
┌────────────────────────┐
│ [1, 2, 3, 4, 5, 6, 7] │  ← full
└────────────────────────┘

After split (insert key 4.5):
┌──────────────┐    ┌──────────────┐
│ [1, 2, 3, 4] │ ↔  │ [4.5, 5, 6, 7] │
└──────────────┘    └──────────────┘
                ▲
    Parent updated with new pointer
```

**Page splits** are expensive:
- Allocate a new page
- Move half the data
- Update parent internal node
- May cascade upward

:::warning Write Amplification
Random inserts (e.g., UUID primary keys) cause frequent page splits. Sequential primary keys (auto-increment) append to the rightmost leaf — no splits.

This is why many teams prefer **auto-increment** or **time-sorted** IDs over **UUID v4** for InnoDB.
:::

### Secondary Indexes in InnoDB

Secondary indexes store the indexed column value + the **primary key** (not a physical row pointer).

```
Secondary index on email:

   Leaf: [alice@ex.com → PK=42] [bob@ex.com → PK=17] [carol@ex.com → PK=88]

Lookup: email = 'bob@ex.com'
  Step 1: Search secondary index → find PK = 17
  Step 2: Search clustered index with PK = 17 → find full row
```

---

## 🪨 LSM-Tree Storage Engine

### How LSM-Trees Work (RocksDB, LevelDB, Cassandra, HBase)

The **Log-Structured Merge-Tree** optimizes for **writes** by converting random writes into sequential writes.

```
Write path:

  1. Write to WAL (on disk, sequential)         ← durability
  2. Insert into MemTable (in-memory, sorted)    ← fast
  3. When MemTable is full → flush to SSTable    ← becomes immutable sorted file

  Application
      │
      ▼
  ┌────────┐
  │  WAL   │  (write-ahead log on disk)
  └────────┘
      │
      ▼
  ┌──────────────┐
  │   MemTable   │  (in-memory sorted structure, e.g., red-black tree)
  │  [3→c, 5→e, │
  │   7→g, 9→i] │
  └──────┬───────┘
         │ flush when full
         ▼
  ┌────────────────────────────────────────────┐
  │              SSTables on Disk              │
  │                                            │
  │  Level 0:  [SST-1] [SST-2] [SST-3]        │  ← recently flushed
  │            (may overlap)                    │
  │                                            │
  │  Level 1:  [SST-A ──────── SST-B]         │  ← merged, non-overlapping
  │                                            │
  │  Level 2:  [SST-X ── SST-Y ── SST-Z]     │  ← larger, non-overlapping
  │                                            │
  │  Level N:  [...largest level...]           │
  └────────────────────────────────────────────┘
```

### Read Path

Reads must check **multiple locations** (this is the LSM-Tree trade-off):

```
Read for key=7:

  1. Check MemTable        → not found
  2. Check Immutable MemTable → not found
  3. Check Level 0 SSTables  → not found
  4. Check Level 1 SSTables  → found! key=7, value=g

Optimization: Bloom filters on each SSTable quickly eliminate
SSTables that definitely don't contain the key.
```

### Compaction

**Compaction** merges SSTables to:
- Remove deleted entries (tombstones)
- Merge duplicate keys (keep latest version)
- Reduce read amplification (fewer files to check)

```
Compaction (size-tiered):

  Level 0:  [SST-1] [SST-2] [SST-3] [SST-4]
                    │ merge
                    ▼
  Level 1:  [    SST-A (merged, sorted)    ]

Compaction (leveled):
  - Each level is 10x larger than previous
  - Level 0: 4 SSTables max
  - Level 1: 10 SSTables, non-overlapping ranges
  - Level 2: 100 SSTables, non-overlapping ranges
```

| Compaction Strategy | Write Amp | Read Amp | Space Amp | Best For |
|:-------------------:|:---------:|:--------:|:---------:|----------|
| **Size-tiered** | Low | High | High | Write-heavy workloads |
| **Leveled** | High | Low | Low | Read-heavy, space-constrained |

---

## ⚖️ B-Tree vs. LSM-Tree Comparison

| Aspect | B-Tree (InnoDB) | LSM-Tree (RocksDB/Cassandra) |
|--------|:---------------:|:----------------------------:|
| **Write performance** | Moderate (random I/O, page splits) | Excellent (sequential writes) |
| **Read performance** | Excellent (single tree traversal) | Moderate (check multiple levels) |
| **Write amplification** | Low-moderate (in-place updates) | High (compaction rewrites data) |
| **Read amplification** | Low (1 index traversal) | Higher (multiple SSTables) |
| **Space amplification** | Low (in-place) | Variable (dead data before compaction) |
| **Range queries** | Excellent (linked leaf nodes) | Good (within each SSTable) |
| **Concurrency** | Row-level locks or MVCC | Lock-free writes (append-only) |
| **Point lookups** | Fast | Fast with Bloom filters |
| **Use cases** | OLTP, relational databases | Time-series, write-heavy, key-value |
| **Examples** | MySQL InnoDB, PostgreSQL | RocksDB, LevelDB, Cassandra, HBase |

:::tip Interview Insight
When asked "B-Tree or LSM-Tree?", frame it as a **trade-off**:
- **B-Tree:** Predictable read latency, good for OLTP with mixed read/write workloads
- **LSM-Tree:** Higher write throughput, good for append-heavy workloads (logs, time-series, IoT)
The key metric is **write amplification** vs. **read amplification**.
:::

---

## 📝 Write-Ahead Log (WAL)

The WAL is the cornerstone of **durability** and **crash recovery**.

### How WAL Works

```
Normal operation:
  1. Transaction modifies data
  2. WAL record written to disk (sequential I/O)    ← FAST
  3. Data page modified in buffer pool (memory)
  4. COMMIT → WAL flush guarantees durability
  5. Dirty pages written to disk later (checkpoint)  ← ASYNC

Crash recovery:
  1. Read WAL from last checkpoint
  2. REDO: Replay committed changes not yet in data files
  3. UNDO: Roll back uncommitted changes
  4. Database is consistent again
```

### WAL Record Structure

```
┌────────┬──────────┬──────────┬──────────────────┬──────────┐
│  LSN   │  Tx ID   │  Type    │  Page/Offset     │  Data    │
│ (seq#) │          │ (INSERT/ │  (where to apply)│ (before/ │
│        │          │  UPDATE/ │                  │  after)  │
│        │          │  DELETE) │                  │          │
└────────┴──────────┴──────────┴──────────────────┴──────────┘
```

**LSN (Log Sequence Number):** A monotonically increasing identifier for each WAL record. Every data page stores the LSN of the last WAL record applied to it. During recovery, if `page_lsn < wal_lsn`, the WAL record must be replayed.

---

## 📊 Column-Oriented Storage (OLAP)

### Row-Oriented vs. Column-Oriented

```
Row-oriented (OLTP):
┌────────┬──────┬──────┬──────┐
│  id    │ name │ age  │ city │  ← Row 1
├────────┼──────┼──────┼──────┤
│  id    │ name │ age  │ city │  ← Row 2
├────────┼──────┼──────┼──────┤
│  id    │ name │ age  │ city │  ← Row 3
└────────┴──────┴──────┴──────┘

On disk: [id1,name1,age1,city1] [id2,name2,age2,city2] [id3,name3,age3,city3]


Column-oriented (OLAP):
┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  id1   │ │name1 │ │age1  │ │city1 │
│  id2   │ │name2 │ │age2  │ │city2 │
│  id3   │ │name3 │ │age3  │ │city3 │
└────────┘ └──────┘ └──────┘ └──────┘

On disk: [id1,id2,id3] [name1,name2,name3] [age1,age2,age3] [city1,city2,city3]
```

### Comparison Table

| Aspect | Row-Oriented | Column-Oriented |
|--------|:------------:|:---------------:|
| **Best for** | OLTP (read/write single rows) | OLAP (aggregations over columns) |
| **SELECT *** | Fast (all columns together) | Slow (must read all column files) |
| **SELECT SUM(age)** | Slow (reads entire rows) | Fast (reads only age column) |
| **INSERT** | Fast (append one row) | Slow (append to every column file) |
| **Compression** | Moderate | Excellent (similar values together) |
| **Cache efficiency** | Lower (unused columns in cache) | Higher (only needed columns) |
| **Examples** | MySQL, PostgreSQL, Oracle | ClickHouse, Redshift, BigQuery, Parquet |

### Column Compression Techniques

| Technique | How It Works | Example |
|-----------|-------------|---------|
| **Run-Length Encoding (RLE)** | Stores value + count for consecutive repeats | `[CA,CA,CA,CA,NY,NY]` → `[CA×4, NY×2]` |
| **Dictionary Encoding** | Replace values with integer codes | `["shipped","pending","shipped"]` → `{0:shipped,1:pending}` → `[0,1,0]` |
| **Bitmap Encoding** | One bitmap per distinct value | `status=shipped: [1,0,1,0,1]`, `status=pending: [0,1,0,1,0]` |
| **Delta Encoding** | Store differences from previous value | `[100,103,107,108]` → `[100, +3, +4, +1]` |

:::info Vectorized Execution
Column stores enable **vectorized query execution** — processing a batch of values from a single column at once using SIMD CPU instructions. This is why ClickHouse and DuckDB are orders of magnitude faster than row stores for analytics.
:::

---

## 🧊 Buffer Pool / Page Cache

The **buffer pool** (InnoDB) or **shared buffers** (PostgreSQL) is an in-memory cache of frequently accessed disk pages.

```
                        Application
                            │
                            ▼
                    ┌───────────────┐
                    │  Query Engine │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Buffer Pool  │  ← In-memory page cache
                    │               │
                    │ ┌───┐┌───┐┌───┐│
                    │ │Pg1││Pg5││Pg9│|  ← Cached pages
                    │ │   ││   ││   ││
                    │ └───┘└───┘└───┘│
                    └───────┬───────┘
                            │ cache miss → read from disk
                    ┌───────▼───────┐
                    │     Disk      │
                    │ [Pg1][Pg2]... │
                    └───────────────┘
```

### Buffer Pool Management

| Concept | Description |
|---------|-------------|
| **Page replacement** | When buffer pool is full, evict a page using LRU (or clock sweep in PostgreSQL) |
| **Dirty pages** | Pages modified in memory but not yet flushed to disk |
| **Pin count** | Pages currently in use can't be evicted |
| **Checkpoint** | Periodic flush of all dirty pages to disk + WAL truncation |
| **Double write buffer (InnoDB)** | Pages written to a special area before the actual location — prevents torn pages |

### InnoDB Buffer Pool Specifics

```
InnoDB Buffer Pool LRU:

┌─────────────────────────────────────────┐
│          Young Sublist (5/8)             │  ← Frequently accessed pages
│  [hot] [hot] [hot] [hot] [hot]          │
├─────────────────────────────────────────┤
│          Old Sublist (3/8)              │  ← Recently loaded pages
│  [new] [new] [new]                      │     (promoted to young if accessed again)
└─────────────────────────────────────────┘
     evict from tail ──────────────────►
```

InnoDB uses a **midpoint insertion strategy**: new pages enter the old sublist. Only if they're accessed again within a time window do they get promoted to the young sublist. This prevents a single table scan from flushing the entire buffer pool.

---

## 🎯 Interview Questions

### Q1: "Explain how a SELECT query is executed from start to finish."

1. **Parser:** SQL text → Abstract Syntax Tree (AST)
2. **Analyzer:** Resolve table/column names, check permissions
3. **Optimizer:** Generate candidate plans, estimate costs, choose cheapest plan
4. **Executor:** Execute the plan — access pages via buffer pool
5. **Buffer Pool:** Check if page is cached; if not, read from disk
6. **Return results:** Stream rows back to the client

### Q2: "Why might you choose an LSM-Tree over a B-Tree?"

When the workload is **write-heavy** (e.g., logging, time-series, IoT sensor data). LSM-Trees convert random writes into sequential writes (MemTable flush), achieving 10-100x higher write throughput. The trade-off is read amplification (checking multiple levels) and write amplification during compaction.

### Q3: "What is write amplification and why does it matter?"

Write amplification is the ratio of **bytes written to storage** vs. **bytes written by the application**. In LSM-Trees, a single write may be rewritten multiple times during compaction (written to L0, then compacted to L1, then L2, etc.). High write amplification wears out SSDs faster and consumes I/O bandwidth.

### Q4: "How does a database recover from a crash?"

1. On startup, read the WAL from the last checkpoint
2. **REDO phase:** Replay all committed transactions whose changes aren't in the data files (page LSN < WAL LSN)
3. **UNDO phase:** Roll back any uncommitted transactions found in the WAL
4. Database is now in a consistent state — ready to accept connections

### Q5: "Why are column stores faster for analytics?"

1. **Read only needed columns** — skip irrelevant data entirely
2. **Better compression** — similar values in a column compress well (dictionary, RLE)
3. **Vectorized execution** — process batches of values using SIMD instructions
4. **Cache efficiency** — only relevant data in CPU cache

---

## 🔗 Related Chapters

- **[02 — Indexing & Query Optimization](./02-indexing-query-optimization.md)** — B+Tree index structure
- **[03 — Transactions & Concurrency](./03-transactions-concurrency.md)** — WAL, MVCC, undo logs
- **[05 — Replication & Partitioning](./05-replication-partitioning.md)** — WAL-based replication
