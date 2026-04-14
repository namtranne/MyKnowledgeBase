# Chapter 3 — Storage & Retrieval

A database does two fundamental things: **store data** when you give it, and **give it back** when you ask. Understanding how storage engines work internally is essential for choosing the right one and tuning it for your workload.

Two major families of storage engines:
1. **Log-structured** storage engines (LSM-trees)
2. **Page-oriented** storage engines (B-trees)

---

## Log-Structured Storage Engines

### The Simplest Database: An Append-Only Log

```bash
#!/bin/bash
db_set () { echo "$1,$2" >> database; }
db_get () { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1; }
```

**Writes** are O(1) — just append to the file (sequential I/O, the fastest possible write operation).
**Reads** are O(n) — must scan the entire file from beginning to end to find the latest value for a key.

This is actually the foundation of many real database storage engines. The challenge is making reads efficient.

### Hash Indexes

**Idea:** keep an **in-memory hash map** mapping every key to its **byte offset** in the data file.

```
In-memory hash map          Data file on disk
┌──────────────────┐        ┌────────────────────────────────────┐
│ key  → offset    │        │ key1,value1\nkey2,value2\nkey1,...  │
│ "foo" → 0        │        │ ^0           ^16          ^32      │
│ "bar" → 16       │        └────────────────────────────────────┘
│ "foo" → 32       │
└──────────────────┘
```

- **Write**: append key-value pair to file, update hash map entry for that key
- **Read**: look up key in hash map → byte offset → seek to that position on disk → read value

This is how **Bitcask** (the default storage engine in Riak) works. It offers very high write and read throughput, subject to the constraint that **all keys fit in RAM**.

**Best suited for:** workloads with many writes per key but a manageable number of distinct keys (e.g., URL → view count).

#### Compaction and Segment Merging

The log file grows forever if we only append. Solution: **segment the log** and **compact** old segments.

```
Segment 1 (active):    mew:1078  purr:2103  purr:2104  mew:1079
Segment 2 (frozen):    mew:1075  purr:2100  mew:1076  purr:2101

After compaction + merge:
Merged segment:         mew:1079  purr:2104
                        (only latest value for each key retained)
```

**How it works:**
1. When the active segment reaches a size threshold, close it and start a new segment
2. Background thread merges old segments: keep only the latest value for each key
3. Merged segment written to a new file; old segments deleted after merge completes
4. Each segment has its own in-memory hash map
5. **Read path**: check active segment's hash map first, then next-most-recent, etc.
6. Merging keeps the number of segments small → lookups check few hash maps

#### Practical Implementation Details

| Concern | Solution |
|---------|----------|
| **File format** | Binary format with length-prefixed values (not CSV — faster and avoids escaping issues) |
| **Deleting records** | Append a **tombstone** record; merging process discards all values for keys with tombstones |
| **Crash recovery** | Store a snapshot of each segment's hash map on disk; on restart, load snapshot instead of scanning entire segment. Also: checksums on records to detect corruption from partial writes. |
| **Concurrency** | Single writer thread (appends are sequential). Data files are append-only and immutable → **safe for concurrent reads** without locking |

#### Why Append-Only Is Better Than Update-In-Place

1. **Sequential writes** are much faster than random writes — on both HDDs (seek time) and SSDs (erase-before-write penalty)
2. **Concurrency and crash recovery** are simpler — no risk of a crash leaving a file with half-old, half-new data
3. **No fragmentation** — merging old segments produces clean, defragmented files

#### Limitations of Hash Indexes

- **Memory bound**: all keys must fit in RAM. On-disk hash maps are possible but slow (lots of random I/O, expensive resizing, complex collision handling)
- **No range queries**: `SELECT * WHERE key BETWEEN 'aaa' AND 'zzz'` requires looking up each key individually

### SSTables (Sorted String Tables)

**Key innovation over hash-indexed segments:** require that key-value pairs within each segment file are **sorted by key**.

This seemingly small change has profound consequences:

#### Advantage 1: Efficient Merging

Merging sorted segments works exactly like **merge-sort** — read both files sequentially, compare the front keys, write the smaller one to the output. This is efficient even for files much larger than available memory, because you're always reading and writing sequentially.

When the same key appears in multiple segments, the most recent segment's value wins (segments are time-ordered).

#### Advantage 2: Sparse In-Memory Index

You no longer need to index **every** key in memory. Keep a **sparse index** with one entry per few kilobytes of segment data:

```
Sparse in-memory index:          SSTable on disk:
┌───────────────────────┐        ┌──────────────────────────────────────────────┐
│ "handbag"  → offset A │        │ handbag│handcraft│handful│handicap│handiwork │
│ "handsome" → offset B │        │   ^A                               ^B       │
│ "hangout"  → offset C │        │              handsome│handwaving│hangout     │
└───────────────────────┘        │                 ^B                  ^C       │
                                 └──────────────────────────────────────────────┘
```

To find "handiwork": look up the sparse index → "handbag" is at offset A, "handsome" is at offset B → "handiwork" must be between A and B → scan from offset A. Scanning a few KB is very fast.

#### Advantage 3: Block Compression

Since reads scan a range of records anyway, group records into **compressed blocks**. Each sparse index entry points to the start of a compressed block. This reduces disk I/O and leverages the fact that sorted data compresses very well (similar prefixes, etc.).

### Building SSTables: The Memtable

Incoming writes arrive in random order — how do we produce sorted output?

**Solution: use a balanced in-memory tree as a write buffer (the "memtable").**

| Step | What Happens |
|------|-------------|
| 1 | Write arrives → insert into an in-memory balanced tree (Red-Black tree or AVL tree), called the **memtable** |
| 2 | Memtable grows past a size threshold (e.g., a few MB) |
| 3 | Write the memtable to disk as an SSTable segment (data is already sorted in the tree) |
| 4 | New writes go to a fresh memtable while the old one is being flushed |
| 5 | Read path: check memtable first → most recent SSTable → next-older → ... |
| 6 | Background merge/compaction reduces the number of SSTable segments |

**Crash recovery problem:** the memtable is in memory — if the process crashes, recent writes are lost.

**Solution: Write-Ahead Log (WAL)** — a separate, append-only log file. Every write is first appended to the WAL, then inserted into the memtable. On crash, replay the WAL to reconstruct the memtable. When the memtable is flushed to an SSTable, the corresponding WAL can be discarded.

### LSM-Tree (Log-Structured Merge-Tree)

The **LSM-tree** is the name for the overall indexing structure: memtable + SSTables + compaction.

**Used by:** LevelDB, RocksDB, Cassandra, HBase, ScyllaDB, Lucene (for its term dictionary).

#### Compaction Strategies

| Strategy | How It Works | Trade-offs |
|----------|-------------|------------|
| **Size-tiered** (HBase, Cassandra default) | Newer, smaller SSTables are merged into older, larger SSTables | Higher write throughput; can temporarily use more disk space |
| **Leveled** (LevelDB, RocksDB, Cassandra alternative) | Key range split into smaller SSTables across multiple levels (L0, L1, L2, ...); each level is 10x larger than the previous. SSTables at each level have non-overlapping key ranges | Less disk space; more predictable read performance; more I/O for compaction |

#### Bloom Filters: Avoiding Unnecessary Disk Reads

**Problem:** to determine if a key exists, you might need to check the memtable + all SSTables (from most recent to oldest). If the key doesn't exist, you scan everything for nothing.

**Solution: Bloom filter** — a memory-efficient probabilistic data structure that can tell you:
- "This key **definitely does not exist**" → skip this SSTable
- "This key **might exist**" → check this SSTable

Bloom filters have **no false negatives** (never miss an existing key) but **can have false positives** (occasionally say a key might exist when it doesn't — but the cost is just one extra disk read).

---

## B-Trees

The most widely used indexing structure in databases. Standard in **virtually every relational database** and many non-relational ones.

### Structure

```
                          ┌──────────────────────┐
                          │ ref│100│ref│200│ref   │  Root page
                          └─┬────────┬────────┬──┘
                 ┌──────────┘        │        └──────────┐
                 ▼                   ▼                   ▼
         ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
         │ref│30│ref│70│ref│ │ref│130│ref│160│ref│ │ref│250│ref│300│ref│
         └─┬────┬────┬──┘   └─┬─────┬────┬──┘   └─┬─────┬────┬──┘
           ▼    ▼    ▼         ▼     ▼    ▼         ▼     ▼    ▼
         [leaf pages with actual key-value data]
```

- Database broken into fixed-size **pages** (typically 4 KB, matching the OS page size and disk sector alignment)
- Each page is read/written as a unit
- Pages contain **keys** and **references to child pages** (internal pages) or actual **values** (leaf pages)
- Keys within a page are sorted
- **Branching factor**: number of child references per page (typically several hundred)

**Capacity math:**
- Branching factor 500 → 4 levels → 500^4 = **62.5 billion keys** (256 TB of data with 4 KB pages)
- Most B-trees are only 3-4 levels deep — reads require 3-4 page reads

### Read Path

1. Start at root page
2. Binary search for the key within the page
3. Follow the child reference that brackets the key
4. Repeat until reaching a leaf page
5. Leaf page contains the value (or a pointer to it)

### Write Path (The Key Difference from LSM-Trees)

1. Find the leaf page containing the key (same traversal as read)
2. **Overwrite the page in place** with the new value
3. If the page doesn't have enough room → **split** the page into two half-full pages and update the parent

**This is fundamentally different from LSM-trees**, which only append and never modify existing files. B-trees modify pages in place — this is a random write operation.

### Making B-Trees Reliable

**Problem:** overwriting a page in place is dangerous. If the system crashes mid-write, you can have a corrupted page. If a page split requires updating parent + both new child pages, a crash after writing one but not the others leaves the tree in an inconsistent state.

**Solution 1: Write-Ahead Log (WAL / redo log)**
- Before modifying any B-tree page, write the intended modification to an append-only WAL
- If the system crashes, replay the WAL to bring the B-tree back to a consistent state
- Used by virtually all B-tree implementations

**Solution 2: Copy-on-Write**
- Never modify a page in place
- Write a new version of the page to a different location
- Update the parent to point to the new page (which also creates a new version of the parent...)
- Atomically switch the root pointer to the new root
- Old pages garbage collected after no readers reference them
- Used by: LMDB, BoltDB, CouchDB (append-only B-trees)
- Also enables easy consistent snapshots (each root pointer = a snapshot)

**Concurrency control:**
- Multiple threads reading/writing the same B-tree need coordination
- **Latches** (lightweight locks) protect pages during modification
- This is more complex than LSM-trees, where immutability of flushed segments avoids most concurrency issues

### B-Tree Optimizations

| Optimization | Description |
|-------------|-------------|
| **Copy-on-write instead of WAL** | LMDB approach — no in-place modification, no WAL needed |
| **Key abbreviation** | Store abbreviated keys in internal pages to increase branching factor (only need enough to determine boundaries) |
| **Sequential leaf layout** | Try to lay leaf pages in sequential order on disk for faster range scans (difficult to maintain as tree grows) |
| **Sibling pointers** | Each leaf page has a pointer to its left and right sibling → range scans don't need to jump back to parent pages |
| **Fractal trees** | Borrow log-structured ideas: buffer writes at internal nodes, flush down lazily. Reduces random I/O. |

---

## LSM-Trees vs B-Trees: Deep Comparison

### Write Performance

**LSM-trees win on write throughput** because they only perform sequential writes (appending to log + flushing sorted segments). B-trees require random writes (overwriting pages at arbitrary positions on disk).

**Write amplification** is a concern for both:
- **B-tree**: every write modifies at least one page (4 KB even for a tiny update) + the WAL entry. Page splits add more writes.
- **LSM-tree**: data is written to WAL + memtable flush + compaction rewrites. A single write may be rewritten 10-30x during compaction over the lifetime of the data.
- LSM-trees generally have **lower write amplification** in practice (especially with large datasets) because their sequential writes are much more efficient on SSDs.

### Read Performance

**B-trees win on read performance** — the structure directly maps keys to locations. One tree traversal (3-4 random reads) finds any key.

**LSM-trees** may need to check the memtable, then multiple SSTable levels. Even with Bloom filters, reads can be slower — especially for keys that don't exist (must check all levels).

### Space Efficiency

**LSM-trees are more space-efficient:**
- Compaction removes fragmentation and obsolete entries
- No page-level internal fragmentation (B-tree pages may be partially empty after splits)
- Lower storage overhead overall, especially with compression

**LSM-trees can temporarily use extra disk space** during compaction (old segments not deleted until merge completes).

### Compaction Interference

**A critical operational concern for LSM-trees:**
- Compaction runs in background threads, sharing disk I/O bandwidth with reads and writes
- At higher percentiles, read/write latency can spike during compaction storms
- If write throughput is very high, compaction may not keep up → unbounded number of SSTables → reads get slower and slower → disk space runs out
- Need monitoring to detect when compaction falls behind

### Predictability

**B-trees are more predictable:**
- Each key exists in exactly one place (no duplicates across segments)
- Response time doesn't depend on compaction state
- Strong transactional semantics are easier (range locks on pages)

### Summary Table

| Aspect | LSM-Trees | B-Trees |
|--------|-----------|---------|
| Write throughput | Higher (sequential I/O) | Lower (random I/O) |
| Write amplification | Lower on average | Higher per write |
| Read latency (p50) | Comparable | Slightly better |
| Read latency (p99) | Can spike during compaction | More predictable |
| Space usage | More compact | Page fragmentation |
| Range queries | Good within merged segments | Excellent (sorted leaf pages) |
| Transaction support | Harder (key in multiple places) | Easier (single location per key) |
| Compaction overhead | Requires background I/O | None |

---

## Other Indexing Structures

### Secondary Indexes

Both B-trees and LSM-trees can serve as secondary indexes (in addition to the primary key index). The main difference: secondary index values may not be unique.

**Two approaches for non-unique secondary indexes:**
1. Make each index entry a list of matching row IDs
2. Append the row ID to the key to make it unique → use as a normal index

### Clustered vs Non-Clustered Indexes

| Type | What the Index Stores | Implications |
|------|----------------------|--------------|
| **Non-clustered (heap file)** | Reference (pointer) to the row in a separate heap file | Extra hop to fetch data; heap file can be unordered |
| **Clustered** | The actual row data stored within the index | Fastest reads for this index; can only cluster by one key |
| **Covering index** (index with included columns) | Stores some column values alongside the index key | Can answer queries without fetching the row ("index-only query") |

- **MySQL InnoDB**: primary key index is always clustered; secondary indexes store the primary key as a pointer
- **PostgreSQL**: heap file by default; supports covering indexes via `INCLUDE` clause
- **SQL Server**: one clustered index per table (user's choice which key); rest are non-clustered

**Trade-off:** clustered and covering indexes speed up reads but slow down writes (additional data to maintain on every write) and require more storage.

### Multi-Column Indexes

**Concatenated index:** combine multiple columns into a single key (e.g., `(last_name, first_name)`). Works well for queries that filter on **a prefix** of the key columns. Useless for queries on only the second column.

```sql
-- This index on (last_name, first_name) helps these queries:
SELECT * FROM people WHERE last_name = 'Smith';
SELECT * FROM people WHERE last_name = 'Smith' AND first_name = 'John';

-- But NOT this query:
SELECT * FROM people WHERE first_name = 'John';
```

**Multi-dimensional indexes:** needed when you must filter on multiple independent dimensions simultaneously.

**Use case: geospatial queries**

```sql
-- Find all restaurants within a geographic rectangle
SELECT * FROM restaurants
WHERE latitude  BETWEEN 51.45 AND 51.55
  AND longitude BETWEEN -0.15 AND 0.05;
```

A standard B-tree index on `(latitude, longitude)` can efficiently filter by latitude but then must scan all matching latitudes for the longitude range. An **R-tree** (used by PostGIS) indexes two-dimensional space directly, enabling efficient rectangular and nearest-neighbor queries.

**Other multi-dimensional use cases:**
- E-commerce: filter by `(color_red, color_green, color_blue)` for color search
- Weather: query by `(date, temperature)` ranges
- Any problem where you need to search across multiple independent dimensions simultaneously

### Full-Text Search and Fuzzy Indexes

Exact-match indexes (B-tree, hash) don't help when you need to search for:
- Misspellings (edit distance / Levenshtein distance)
- Synonyms and linguistic variations
- Substring or prefix matches

**Lucene's approach (used by Elasticsearch and Solr):**
- **Term dictionary**: an SSTable-like structure mapping terms to lists of document IDs (posting lists)
- **Fuzzy search**: the in-memory index is a finite-state automaton (similar to a trie) over the term dictionary. This automaton can efficiently find all terms within a given edit distance of the search term (Levenshtein automaton).
- Documents are scored by relevance (TF-IDF, BM25) based on term frequency, document frequency, and other factors

### In-Memory Databases

| Database | Model | Durability Approach |
|----------|-------|-------------------|
| **Memcached** | Key-value cache | None — data lost on restart |
| **Redis** | Key-value, lists, sets, sorted sets, hyperloglogs | Async disk snapshots (RDB) + append-only file (AOF). Forkless and RDB persistence options. |
| **VoltDB** | In-memory relational (SQL) | Synchronous replication to multiple nodes; command logging |
| **MemSQL / SingleStore** | In-memory relational with disk-based storage | WAL + snapshots |
| **SAP HANA** | In-memory columnar + row | Replication + checkpointing |
| **RAMCloud** | Key-value | Durable via log-structured replication to disk on other servers |

**Why in-memory databases are faster:**
- The performance advantage is **not** primarily from avoiding disk reads — the OS page cache already serves frequently-accessed data from memory
- The real advantage is **avoiding the CPU overhead of encoding data structures into a disk-friendly format**. In-memory databases can use data structures as-is (pointers, trees, hash tables) without serialization
- They can also implement data structures that are **hard to build on disk**: Redis sorted sets (skip lists), priority queues, HyperLogLog, etc.

**Anti-caching approach (beyond available RAM):**
- When memory is full, evict least-recently-used records to disk
- On access, load them back into memory
- Similar to OS virtual memory / paging, but the database manages it at **record granularity** (much smarter than OS page granularity — the DB knows which records are related and accessed together)

---

## Transaction Processing vs Analytics (OLTP vs OLAP)

These are fundamentally different workloads with different optimal storage designs.

| Property | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
|----------|------|------|
| **Read pattern** | Fetch a small number of records by key, with indexes | Aggregate over millions/billions of records |
| **Write pattern** | Random-access inserts/updates from user input | Bulk import (ETL) or continuous event stream |
| **Primary users** | End users via web/mobile applications | Internal analysts, data scientists, BI tools |
| **Data represents** | Latest state of the world (current balance, current inventory) | Complete history of events over time |
| **Dataset size** | Gigabytes to low terabytes | Terabytes to petabytes |
| **Bottleneck** | Disk seek time (random I/O) | Disk bandwidth (sequential scan throughput) |
| **Examples** | PostgreSQL, MySQL, Oracle, MongoDB | Amazon Redshift, Google BigQuery, Snowflake, ClickHouse |

### Data Warehousing

Running analytic queries on the OLTP database is a bad idea — heavy scans compete with latency-sensitive user transactions for resources.

**Solution: separate OLTP and OLAP systems.**

```
OLTP Databases          ETL Process              Data Warehouse
┌───────────┐                                   ┌──────────────────┐
│ PostgreSQL │──┐                                │                  │
├───────────┤  │     Extract                     │   Amazon         │
│ MySQL     │──┼──── Transform ───── Load ──────▶│   Redshift /     │
├───────────┤  │                                 │   Snowflake /    │
│ MongoDB   │──┘                                 │   BigQuery       │
└───────────┘                                   └──────────────────┘
                                                  Optimized for:
                                                  • Full table scans
                                                  • Columnar storage
                                                  • Aggregation queries
```

**ETL (Extract-Transform-Load):**
1. **Extract** data from OLTP databases (periodic dumps or continuous CDC streams)
2. **Transform** into an analysis-friendly schema (denormalize, clean, derive new fields)
3. **Load** into the data warehouse

### Star and Snowflake Schemas

Data warehouses commonly use **dimensional modeling** — the star schema:

```
                    ┌────────────────┐
                    │ dim_date       │
                    │ date_key (PK)  │
                    │ day, month,    │
                    │ year, quarter  │
                    └───────┬────────┘
                            │
┌───────────────┐   ┌───────┴────────┐   ┌────────────────┐
│ dim_product   │   │ fact_sales     │   │ dim_store      │
│ product_key   │◀──│ date_key (FK)  │──▶│ store_key (PK) │
│ name, category│   │ product_key(FK)│   │ city, state,   │
│ brand, price  │   │ store_key (FK) │   │ country        │
└───────────────┘   │ customer_key   │   └────────────────┘
                    │ quantity_sold  │
                    │ revenue        │
                    │ discount       │
                    └───────┬────────┘
                            │
                    ┌───────┴────────┐
                    │ dim_customer   │
                    │ customer_key   │
                    │ name, age,     │
                    │ segment        │
                    └────────────────┘
```

- **Fact table** (center): records individual events/transactions. Can have billions of rows and hundreds of columns. Each row = one sale/click/transaction.
- **Dimension tables** (surrounding): describe the who/what/where/when/how/why of each event. Typically much smaller. The foreign keys in the fact table reference dimension tables.
- **Snowflake schema**: further normalize dimension tables (e.g., `dim_product` → `dim_brand` → `dim_manufacturer`). More normalized but harder to query.

---

## Column-Oriented Storage

### The Problem with Row-Oriented Storage for Analytics

A typical analytic query touches only 4-5 columns out of 100+ in the fact table:

```sql
SELECT dim_date.weekday, SUM(fact_sales.revenue)
FROM fact_sales
JOIN dim_date ON fact_sales.date_key = dim_date.date_key
WHERE dim_date.year = 2025 AND fact_sales.product_key IN (31, 68, 69)
GROUP BY dim_date.weekday;
```

In a **row-oriented** store, the engine must read **entire rows** from disk (all 100 columns), even though only `date_key`, `product_key`, and `revenue` are needed. With billions of rows, this wastes enormous disk bandwidth.

### The Solution: Store Each Column Separately

```
Row-oriented (traditional):
Row 1: [date_key=1001, product_key=69, store_key=4, customer_key=8, qty=1, revenue=99.50, ...]
Row 2: [date_key=1001, product_key=31, store_key=7, customer_key=3, qty=2, revenue=45.00, ...]
Row 3: [date_key=1002, product_key=68, store_key=4, customer_key=8, qty=1, revenue=12.99, ...]

Column-oriented:
date_key file:      [1001, 1001, 1002, 1002, 1003, ...]
product_key file:   [69,   31,   68,   69,   31,   ...]
store_key file:     [4,    7,    4,    2,    7,    ...]
revenue file:       [99.5, 45.0, 12.99,88.0, 45.0, ...]
```

The query only reads the `date_key`, `product_key`, and `revenue` column files — skipping all other columns entirely.

**Critical requirement:** the n-th entry in every column file must correspond to the same row. This enables reconstructing complete rows when needed.

### Column Compression

Column data compresses very well because values in a column tend to be **repetitive** (same product IDs, same dates, same store IDs appear many times).

#### Bitmap Encoding

For a column with a small number of distinct values (e.g., 50 products out of billions of rows):

```
product_key column values: [69, 69, 69, 31, 31, 68, 69, 31, 68, 31, ...]

Bitmap for product_key = 31: [0, 0, 0, 1, 1, 0, 0, 1, 0, 1, ...]
Bitmap for product_key = 68: [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, ...]
Bitmap for product_key = 69: [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, ...]
```

**For queries with WHERE clauses**, combine bitmaps with bitwise operations:

```
WHERE product_key IN (31, 68):
  bitmap_31 OR bitmap_68 = [0,0,0,1,1,1,0,1,1,1,...] → rows matching the condition

WHERE product_key = 31 AND store_key = 4:
  bitmap_product_31 AND bitmap_store_4 = [...] → rows matching both conditions
```

Bitwise AND/OR on compressed bitmaps is **extremely fast** — operates on CPU cache-friendly chunks of data, uses SIMD instructions.

#### Run-Length Encoding

Bitmaps with mostly zeros (sparse) compress very well with run-length encoding:

```
bitmap_31: [0,0,0,1,1,0,0,1,0,1,...] → "3 zeros, 2 ones, 2 zeros, 1 one, 1 zero, 1 one, ..."
```

#### Vectorized Processing

Column-oriented storage enables **vectorized execution**: instead of processing one row at a time, the CPU operates on a chunk of compressed column data at once. Modern CPUs can process 64 or 128 values in a single instruction (SIMD). This dramatically reduces CPU overhead per value.

### Sort Order in Column Storage

All column files must maintain the **same row ordering**. By default, insertion order — but you can sort the data to improve compression and query performance.

**Benefits of sorting:**
1. **Better compression** of the first sort key (long runs of identical values)
2. **Faster range queries** on the sort key
3. **Secondary sort keys** also benefit from improved locality

**Multiple sort orders:**
- Store the same data sorted differently in separate replicas (Vertica does this)
- Each replica optimized for different query patterns
- Analogous to having multiple secondary indexes, but at the storage level

### Writing to Column Storage

Column storage is optimized for reads — writes are harder because inserting a single row requires modifying every column file at the correct position.

**Solution: LSM-tree approach.**
1. Writes go to an in-memory store (row-oriented — easy to insert)
2. When large enough, the in-memory batch is written to disk in column format, merged with existing column files
3. Queries combine in-memory data with on-disk column files

This is how **Vertica**, **Apache Druid**, and **ClickHouse** handle writes efficiently.

### Materialized Views and Data Cubes

**Materialized view:** a precomputed, cached result of a query, stored as a table. Updated (eagerly or lazily) when underlying data changes. Speeds up frequently-run queries at the cost of write overhead.

**Data cube (OLAP cube):** a specialized materialized view that precomputes aggregates for all combinations of a set of dimensions:

```
             Product A    Product B    Product C    Total
2025-01-01     500          300          700         1500
2025-01-02     450          350          650         1450
2025-01-03     520          280          720         1520
Total         1470          930         2070         4470
```

Each cell = `SUM(revenue)` for that date + product combination.

**Trade-off:** data cubes make specific aggregate queries instant (just look up the cell) but are inflexible — you can only query the exact dimensions that were precomputed. Raw data is still needed for ad-hoc queries that slice differently.
