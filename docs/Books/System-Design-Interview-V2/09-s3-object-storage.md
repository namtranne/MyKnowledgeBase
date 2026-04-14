# Chapter 9: S3-like Object Storage

## 1. Problem Statement & Requirements

### What Are We Designing?

A **distributed object storage system** modeled after Amazon S3 — the backbone of modern cloud infrastructure. Object storage powers everything from static website hosting and data lakes to machine learning pipelines and mobile app backends. We need to design a system that stores hundreds of petabytes of data across billions of objects with extreme durability (11 nines), high availability, and efficient storage utilization.

Unlike traditional file systems or block storage, object storage treats data as discrete units (objects) identified by unique keys within flat namespaces (buckets). This simplicity at the API level unlocks massive horizontal scalability.

### Functional Requirements

1. **Bucket operations** — create, delete, list buckets per user/account
2. **Object upload** — PUT objects of any size (bytes to multi-GB) into a bucket
3. **Object download** — GET objects by bucket + key
4. **Object delete** — remove objects from a bucket
5. **Object listing** — list objects in a bucket with prefix filtering and pagination
6. **Object versioning** — maintain multiple versions of the same key
7. **Multipart upload** — upload large objects in parallel chunks with resume capability
8. **Metadata** — user-defined key-value metadata attached to objects

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| Durability | **99.999999999%** (11 nines) — lose at most 1 object per 10 billion per year |
| Availability | **99.99%** (4 nines) — ≤ 52 min downtime/year |
| Storage efficiency | 1.5x overhead (via erasure coding) vs 3x for naive replication |
| Latency (small objects) | < 100ms p99 for objects < 1MB |
| Latency (large objects) | Throughput-optimized, multi-GB downloads in seconds |
| Scale | Hundreds of PBs, billions of objects, millions of buckets |
| Consistency | Strong read-after-write consistency (S3 achieved this in Dec 2020) |

### Scale Estimation (Back-of-Envelope)

```
Total storage:           100 PB = 100,000 TB
Avg object size:         ~1 MB (highly variable — median is much smaller)
Total objects:           100 PB / 1 MB = 100 billion objects
Daily uploads:           ~1 billion new objects/day
Upload throughput:       1B / 86,400 ≈ 11,500 objects/sec
Peak upload:             ~30,000 objects/sec

Read:write ratio:        ~10:1 (reads dominate)
Read throughput:         ~100,000–300,000 objects/sec
Bandwidth (writes):      1B × 1MB / 86,400 ≈ 12 GB/s sustained
Bandwidth (reads):       ~100+ GB/s sustained

Metadata per object:     ~500 bytes (key, size, checksum, timestamps, etc.)
Metadata total:          100B × 500B = 50 TB of metadata
```

### Storage Types Compared

| Property | Block Storage | File Storage | Object Storage |
|---|---|---|---|
| **Access** | Raw blocks (LBA) | Hierarchical paths | Flat key-value |
| **Protocol** | iSCSI, FC, NVMe | NFS, SMB/CIFS | HTTP REST |
| **Metadata** | Minimal (block ID) | POSIX (perms, owner) | Rich custom metadata |
| **Mutability** | In-place update | In-place update | **Immutable** (replace whole object) |
| **Scalability** | Single-server limited | Moderate | **Practically unlimited** |
| **Use case** | Databases, VMs, OS disks | Shared file systems, NAS | Media, backups, data lakes, static assets |
| **Latency** | Sub-ms | Low ms | ~10-100ms |
| **Max size** | Volume-limited | File-limited | 5 TB per object (S3) |
| **Examples** | EBS, Persistent Disk | EFS, FSx | S3, GCS, Azure Blob |

**Key insight for interviews**: Object storage sacrifices in-place mutability and POSIX semantics for essentially infinite scalability. You cannot `append` to or `seek` within an object — you replace it entirely. This constraint is what enables the design's simplicity.

---

## 2. High-Level Design

### Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                       OBJECT STORAGE                        │
│                                                             │
│  Bucket: "my-photos"     (logical container, like a NS)     │
│  ├── Key: "vacation/beach.jpg"   → Object (binary + meta)   │
│  ├── Key: "vacation/sunset.png"  → Object (binary + meta)   │
│  └── Key: "profile.jpg"         → Object (binary + meta)    │
│                                                             │
│  Bucket: "logs"                                             │
│  ├── Key: "2024/01/01/app.log"  → Object                    │
│  └── Key: "2024/01/02/app.log"  → Object                    │
└─────────────────────────────────────────────────────────────┘
```

- **Bucket**: A logical container (namespace) for objects. Globally unique name.
- **Object**: The unit of storage — immutable binary data + metadata.
- **Key**: A unique identifier within a bucket. Flat namespace, but `/` is conventionally used to simulate directories.

### API Design (REST)

| Operation | HTTP Method | Endpoint | Description |
|---|---|---|---|
| Create bucket | `PUT` | `/{bucket}` | Create a new bucket |
| Delete bucket | `DELETE` | `/{bucket}` | Delete empty bucket |
| Upload object | `PUT` | `/{bucket}/{key}` | Upload/overwrite object |
| Download object | `GET` | `/{bucket}/{key}` | Download object data |
| Delete object | `DELETE` | `/{bucket}/{key}` | Delete object (or add delete marker) |
| List objects | `GET` | `/{bucket}?list-type=2&prefix=X&max-keys=N` | List objects with prefix filter |
| Head object | `HEAD` | `/{bucket}/{key}` | Get metadata without body |
| Initiate multipart | `POST` | `/{bucket}/{key}?uploads` | Start multipart upload |
| Upload part | `PUT` | `/{bucket}/{key}?partNumber=N&uploadId=X` | Upload one part |
| Complete multipart | `POST` | `/{bucket}/{key}?uploadId=X` | Finalize multipart upload |

### Three-Layer Architecture

```
                          ┌─────────────────────┐
                          │      Clients         │
                          │  (SDK, CLI, Browser) │
                          └─────────┬───────────┘
                                    │ HTTPS
                          ┌─────────▼───────────┐
                    ┌─────│    Load Balancer     │─────┐
                    │     └─────────────────────┘     │
              ┌─────▼─────┐                     ┌─────▼─────┐
              │  API GW 1  │       ...          │  API GW N  │
              └─────┬─────┘                     └─────┬─────┘
                    │                                  │
         ┌──────────┼──────────────────────────────────┘
         │          │
         ▼          ▼
  ┌──────────────────────────────────────────────────────────┐
  │                  LAYER 1: API / GATEWAY                   │
  │  • Authentication (IAM, SigV4)                           │
  │  • Authorization (bucket policies, ACLs)                 │
  │  • Rate limiting & throttling                            │
  │  • Request routing                                       │
  │  • TLS termination                                       │
  └───────┬──────────────────────────────┬───────────────────┘
          │                              │
          ▼                              ▼
  ┌────────────────────┐    ┌──────────────────────────────┐
  │ LAYER 2: METADATA  │    │  LAYER 3: DATA STORE          │
  │ STORE              │    │                                │
  │ • Bucket info      │    │  • Binary object data          │
  │ • Object metadata  │    │  • Erasure-coded chunks        │
  │ • Key → location   │    │  • Compaction & GC             │
  │   mapping          │    │  • Replication / EC            │
  │ • Version history  │    │  • Checksum verification       │
  │ • Sharded DB       │    │  • Distributed across nodes    │
  └────────────────────┘    └──────────────────────────────┘
```

**Layer 1 — API/Gateway**: Stateless HTTP servers behind a load balancer. Handle authentication, authorization, rate limiting, and routing requests to the appropriate metadata or data services.

**Layer 2 — Metadata Store**: Stores all non-data information: bucket details, object metadata, key-to-storage-location mapping. This is the "brain" that knows where everything is.

**Layer 3 — Data Store**: The "heart" — stores actual binary object data across a fleet of storage nodes. Optimized for durability (erasure coding), throughput, and efficient disk utilization.

### Write Path (Upload Object)

```
Client                API Gateway           Metadata Store         Data Store
  │                       │                       │                    │
  │── PUT /bucket/key ──→ │                       │                    │
  │                       │── auth + validate ──→  │                    │
  │                       │                       │── check bucket ──→ │
  │                       │                       │←── ok ────────────│
  │                       │                       │                    │
  │                       │───── stream data ─────────────────────────→│
  │                       │                       │                ┌───┤
  │                       │                       │                │EC │
  │                       │                       │                │enc│
  │                       │                       │                └───┤
  │                       │                       │←── data_location ──│
  │                       │                       │                    │
  │                       │── save metadata ─────→│                    │
  │                       │   (key, location,     │                    │
  │                       │    size, checksum,    │                    │
  │                       │    version_id)        │                    │
  │                       │←── ack ──────────────│                    │
  │←── 200 OK ───────────│                       │                    │
```

### Read Path (Download Object)

```
Client                API Gateway           Metadata Store         Data Store
  │                       │                       │                    │
  │── GET /bucket/key ──→ │                       │                    │
  │                       │── auth + validate ──→  │                    │
  │                       │── lookup key ────────→ │                    │
  │                       │←── metadata + loc ───│                    │
  │                       │                       │                    │
  │                       │───── fetch data ──────────────────────────→│
  │                       │                       │                ┌───┤
  │                       │                       │                │EC │
  │                       │                       │                │dec│
  │                       │                       │                └───┤
  │                       │←──────────── stream data ─────────────────│
  │←── 200 OK + body ────│                       │                    │
```

---

## 3. Data Store Deep Dive

### Why Not "One Object = One File"?

The naive approach — store each object as a separate file on a POSIX filesystem — fails catastrophically at scale:

| Problem | Detail |
|---|---|
| **Inode exhaustion** | Linux ext4 has ~4 billion inodes max. With billions of tiny objects, you run out of inodes before disk space. |
| **Directory overhead** | Directories with millions of entries degrade to O(n) lookups on many filesystems. |
| **Small file penalty** | A 1 KB object still consumes a 4 KB disk block (filesystem block size). 75% waste. |
| **Metadata overhead** | Each file has its own inode (~256 bytes), dentry, and POSIX metadata — huge overhead for small objects. |
| **fsync overhead** | Syncing millions of small files to disk is far slower than sequential writes. |

**The solution**: Pack many objects into large aggregate files.

### Write-Ahead Log / Append-Only Data Files

Inspired by LSM-tree storage engines (like those in Cassandra, RocksDB), the data store uses an **append-only log** approach:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Data File (1 GB)                              │
│                                                                      │
│  ┌────────┬────────┬──────────────┬────────┬────────┬───────────┐   │
│  │ Obj A  │ Obj B  │   Obj C      │ Obj D  │ Obj E  │ (free)    │   │
│  │ 100B   │ 50KB   │   2MB        │ 500B   │ 1MB    │           │   │
│  └────────┴────────┴──────────────┴────────┴────────┴───────────┘   │
│  offset:0  offset:100  offset:51300  ...                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    Object Index (in memory + persistent)             │
│                                                                      │
│  object_id    │ data_file   │  offset    │  length   │  checksum    │
│  ─────────────┼─────────────┼────────────┼───────────┼──────────────│
│  obj_A_uuid   │ file_001    │  0         │  100      │  0xABCD1234  │
│  obj_B_uuid   │ file_001    │  100       │  51200    │  0xDEF05678  │
│  obj_C_uuid   │ file_001    │  51300     │  2097152  │  0x12340000  │
│  obj_D_uuid   │ file_001    │  2148452   │  500      │  0x56780000  │
│  obj_E_uuid   │ file_001    │  2148952   │  1048576  │  0x9ABC0000  │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Node Architecture

Each data node manages local disks and exposes a simple internal API:

```
┌─────────────────────────────────────────────────────────────┐
│                       DATA NODE                              │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Write Manager                       │  │
│  │  • Active data file (currently being appended to)     │  │
│  │  • WAL buffer (in-memory, flushed periodically)       │  │
│  │  • fsync policy (every N writes or M milliseconds)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Read Manager                        │  │
│  │  • Object index (object_id → file, offset, length)    │  │
│  │  • File handle cache (avoid repeated open/close)      │  │
│  │  • Read-ahead buffer for sequential access            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Disk Management                      │  │
│  │  • Data files: file_001.dat, file_002.dat, ...        │  │
│  │  • Compaction engine                                  │  │
│  │  • Disk health monitoring (SMART)                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Disks: [/dev/sda] [/dev/sdb] [/dev/sdc] ...               │
└─────────────────────────────────────────────────────────────┘
```

### Write Flow (Data Store Internal)

```
1. Receive write request(object_id, data, checksum)
2. Validate checksum: CRC32(data) == checksum
3. Acquire write lock on active data file
4. Append to active data file:
   ┌────────────────────────────────────────────┐
   │  [header: obj_id | length | checksum]      │
   │  [data bytes..........................]     │
   │  [footer: checksum_of_record]              │
   └────────────────────────────────────────────┘
5. Record (data_file, offset, length) in local index
6. If active file >= 1 GB:
     - Seal current file (mark read-only)
     - Create new active file
7. Periodically fsync to ensure durability
8. Return (data_file, offset, length) to caller
```

### Read Flow (Data Store Internal)

```
1. Receive read request(object_id)
2. Lookup in index: object_id → (data_file, offset, length)
3. Open data_file (or use cached file handle)
4. Seek to offset
5. Read exactly length bytes
6. Validate checksum
7. Return data
```

### Compaction and Garbage Collection

When objects are deleted, they are not immediately removed from data files (that would require rewriting). Instead:

```
BEFORE COMPACTION:

Data File 001:
┌────────┬──────────┬────────┬──────────┬────────┐
│ Obj A  │ Obj B    │ Obj C  │ Obj D    │ Obj E  │
│ LIVE   │ DELETED  │ LIVE   │ DELETED  │ LIVE   │
└────────┴──────────┴────────┴──────────┴────────┘
  Utilization: 60% (40% is dead data)

AFTER COMPACTION:

Data File 001 (new):
┌────────┬────────┬────────┐
│ Obj A  │ Obj C  │ Obj E  │
│ LIVE   │ LIVE   │ LIVE   │
└────────┴────────┴────────┘
  Utilization: 100%

Old Data File 001: [deleted after new file is sealed and index updated]
```

**Compaction triggers**:
- When a data file's utilization drops below a threshold (e.g., 50%)
- During low-traffic periods (scheduled)
- When disk space falls below threshold

**Compaction process**:
1. Scan data file, identify live objects (cross-reference with metadata store)
2. Copy live objects to a new data file sequentially
3. Update the index to point to new file/offsets
4. Delete the old data file

This is analogous to how LSM-tree compaction and HBase major compaction work.

---

## 4. Metadata Store Deep Dive

### Schema Design

**Buckets Table**:

```sql
CREATE TABLE buckets (
    bucket_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    bucket_name   VARCHAR(63) UNIQUE NOT NULL,   -- globally unique
    owner_id      BIGINT NOT NULL,
    acl           JSON,
    region        VARCHAR(32),
    versioning    ENUM('disabled', 'enabled', 'suspended'),
    created_at    TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_owner (owner_id)
);
```

**Objects Table**:

```sql
CREATE TABLE objects (
    bucket_id     BIGINT NOT NULL,
    object_key    VARCHAR(1024) NOT NULL,
    version_id    VARCHAR(64) NOT NULL,          -- UUID or timestamp-based
    object_id     VARCHAR(64) NOT NULL,          -- internal UUID
    is_latest     BOOLEAN DEFAULT TRUE,
    is_deleted    BOOLEAN DEFAULT FALSE,         -- delete marker
    size          BIGINT,
    content_type  VARCHAR(256),
    checksum      VARCHAR(64),                   -- e.g., SHA-256
    user_metadata JSON,
    storage_class ENUM('STANDARD', 'IA', 'GLACIER'),
    created_at    TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (bucket_id, object_key, version_id),
    INDEX idx_listing (bucket_id, object_key, is_latest)
);
```

**Object Data Location Table** (maps logical objects to physical storage):

```sql
CREATE TABLE object_data_locations (
    object_id     VARCHAR(64) PRIMARY KEY,
    -- For erasure-coded storage, we have multiple chunks
    chunk_locations JSON,
    /*
      Example JSON:
      [
        {"chunk_id": 0, "node_id": "dn-101", "file": "file_042", "offset": 1024, "length": 65536},
        {"chunk_id": 1, "node_id": "dn-203", "file": "file_017", "offset": 8192, "length": 65536},
        ...
      ]
    */
    encoding      ENUM('REPLICATED', 'ERASURE_8_4'),
    total_size    BIGINT,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

### Scaling Metadata

With 100 billion objects, metadata alone is ~50 TB. A single database cannot handle this.

**Sharding strategy**:

```
                    ┌──────────────────────┐
                    │   Metadata Router    │
                    │  shard = hash(       │
                    │    bucket_id) % N    │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     ┌──────────┐       ┌──────────┐       ┌──────────┐
     │ Shard 0  │       │ Shard 1  │       │ Shard 2  │
     │ Primary  │       │ Primary  │       │ Primary  │
     │ Replica  │       │ Replica  │       │ Replica  │
     │ Replica  │       │ Replica  │       │ Replica  │
     └──────────┘       └──────────┘       └──────────┘
```

- **Shard key**: `bucket_id` — all objects in a bucket land on the same shard, enabling efficient listing
- **Hot bucket problem**: A single viral bucket (e.g., popular CDN origin) may overload a shard. Mitigation: further sub-shard by key prefix for extremely large buckets
- **Replication**: Each shard has 2-3 replicas (one primary + followers) for HA

**Database choice**:

| Option | Pros | Cons |
|---|---|---|
| **Sharded MySQL (Vitess)** | Mature, ACID, strong consistency, rich queries | Operational complexity, resharding pain |
| **CockroachDB / TiDB** | Auto-sharding, distributed SQL, strong consistency | Relatively newer, latency overhead |
| **DynamoDB-style KV** | Ultra-scalable, managed | Limited query patterns, eventual consistency |
| **Custom (like S3 internal)** | Optimized for workload | Massive engineering investment |

AWS S3 internally uses a custom metadata store built on top of a sharded, strongly-consistent distributed database.

### Object Listing

Object listing is one of the trickiest operations because it must simulate a hierarchical directory structure over a flat namespace.

**API**: `GET /bucket?prefix=photos/2024/&delimiter=/&max-keys=1000&continuation-token=xxx`

```
Bucket "my-data" contains these keys:
  photos/2024/jan/a.jpg
  photos/2024/jan/b.jpg
  photos/2024/feb/c.jpg
  photos/2024/readme.txt
  logs/app.log

Request: prefix="photos/2024/" delimiter="/"

Response:
  Common Prefixes:    ["photos/2024/jan/", "photos/2024/feb/"]
  Objects:            ["photos/2024/readme.txt"]
  IsTruncated:        false
```

**Implementation**: The metadata store uses a B-tree or sorted index on `(bucket_id, object_key)` so prefix scans are efficient range queries.

**Pagination**: `continuation-token` is typically an opaque cursor encoding the last key returned, enabling stateless pagination via `WHERE object_key > :last_key ORDER BY object_key LIMIT :max_keys`.

### Strong Read-After-Write Consistency

In December 2020, S3 achieved strong consistency — a GET immediately after a PUT always returns the latest data. This requires:

1. Metadata writes go through a consensus protocol (Raft/Paxos)
2. Reads are served from the leader or use read quorums
3. A "witness" mechanism ensures data is durable before acknowledging the PUT

---

## 5. Durability & Reliability — Deep Dive

### Durability Target: 11 Nines

**99.999999999% durability** means: if you store 10 billion objects, you statistically expect to lose **at most 1 object per year**.

This is achieved through a combination of:
1. Data redundancy (replication or erasure coding)
2. Geographic distribution (across racks, data centers, regions)
3. Integrity verification (checksums, scrubbing)
4. Rapid failure detection and repair

### Strategy 1: Replication

```
                        ┌─────────────────┐
        ┌──────────────→│   Replica 1     │  Rack A, DC East
        │               │   (full copy)   │
        │               └─────────────────┘
        │
  ┌─────┴─────┐         ┌─────────────────┐
  │  Object   │────────→ │   Replica 2     │  Rack B, DC East
  │  "photo"  │          │   (full copy)   │
  └─────┬─────┘         └─────────────────┘
        │
        │               ┌─────────────────┐
        └──────────────→│   Replica 3     │  Rack C, DC West
                        │   (full copy)   │
                        └─────────────────┘
```

| Aspect | Detail |
|---|---|
| **Copies** | 3 (configurable) |
| **Storage overhead** | **3x** — store 1 TB, use 3 TB |
| **Read performance** | Excellent — read from any replica |
| **Write performance** | Good — write to all replicas (quorum: 2/3) |
| **Recovery speed** | Fast — just copy from surviving replica |
| **Failure tolerance** | Survives 2 simultaneous node failures |
| **Best for** | Small, frequently accessed objects; metadata |

### Strategy 2: Erasure Coding (Reed-Solomon)

Erasure coding is the workhorse of production object storage. It provides replication-level durability at a fraction of the storage cost.

**How (8,4) Reed-Solomon works**:

```
Original Object (e.g., 8 MB)
┌──────────────────────────────────────────────────────────────────┐
│                         8 MB of data                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                    Split into 8 equal chunks
                              │
                              ▼
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ D1 │ D2 │ D3 │ D4 │ D5 │ D6 │ D7 │ D8 │   8 data chunks (1 MB each)
└──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┴──┬─┘
   │    │    │    │    │    │    │    │
   └────┴────┴────┴────┴────┴────┴────┘
                    │
          Reed-Solomon Encoding
          (linear algebra over GF(2^8))
                    │
                    ▼
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ D1 │ D2 │ D3 │ D4 │ D5 │ D6 │ D7 │ D8 │ P1 │ P2 │ P3 │ P4 │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
  │    │    │    │    │    │    │    │    │    │    │    │
  ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
Node Node Node Node Node Node Node Node Node Node Node Node
 01   02   03   04   05   06   07   08   09   10   11   12
```

**Key properties**:

| Property | Value |
|---|---|
| Data chunks (k) | 8 |
| Parity chunks (m) | 4 |
| Total chunks | 12 |
| Failure tolerance | Any 4 chunks can be lost → data is recoverable |
| Storage overhead | 12/8 = **1.5x** (vs 3x for replication) |
| Minimum chunks to recover | Any 8 of 12 |

**Recovery example**: If nodes 3, 7, 10, and 12 fail simultaneously:

```
Available:  D1, D2, __, D4, D5, D6, __, D8, P1, __, P3, __
                    ↑                   ↑         ↑         ↑
                  lost                lost      lost      lost

Reed-Solomon decoding with any 8 surviving chunks:
  Use D1, D2, D4, D5, D6, D8, P1, P3  →  Reconstruct D3, D7, P2, P4
```

### Replication vs Erasure Coding — Decision Matrix

| Factor | Replication (3x) | Erasure Coding (8,4) |
|---|---|---|
| Storage overhead | 3x (200% extra) | 1.5x (50% extra) |
| Read latency | Lower (read any copy) | Higher (may need decode) |
| Write latency | Moderate (write 3 copies) | Higher (encode + write 12 chunks) |
| Recovery speed | Fast (copy 1 full replica) | Slower (read 8 chunks, decode, write) |
| CPU cost | Minimal | Significant (GF arithmetic) |
| Network cost (write) | 3x data transferred | 1.5x data transferred |
| Network cost (recovery) | 1x object size | 8/12 × object size for reading |
| Best for | Hot data, small objects, metadata | Warm/cold data, large objects |
| Used by | HDFS (default), etcd, ZooKeeper | S3, GCS, Azure, Ceph, MinIO |

**Practical hybrid approach**: Use replication for hot/small objects and metadata; use erasure coding for bulk data storage. Many production systems (including S3) use this hybrid approach.

### Placement Strategy

```
         Data Center 1                    Data Center 2
┌──────────────────────────┐    ┌──────────────────────────┐
│  Rack A      Rack B      │    │  Rack C      Rack D      │
│ ┌──────┐   ┌──────┐     │    │ ┌──────┐   ┌──────┐     │
│ │Node 1│   │Node 3│     │    │ │Node 5│   │Node 7│     │
│ │ D1   │   │ D3   │     │    │ │ D5   │   │ D7   │     │
│ │ P3   │   │ P1   │     │    │ │ P4   │   │ P2   │     │
│ ├──────┤   ├──────┤     │    │ ├──────┤   ├──────┤     │
│ │Node 2│   │Node 4│     │    │ │Node 6│   │Node 8│     │
│ │ D2   │   │ D4   │     │    │ │ D6   │   │ D8   │     │
│ └──────┘   └──────┘     │    │ └──────┘   └──────┘     │
└──────────────────────────┘    └──────────────────────────┘
```

**Placement rules**:
- No two chunks of the same object on the same node
- No two chunks on the same rack (if possible)
- Distribute across data centers for DC-level fault tolerance
- Respect failure domains: rack → DC → region

### Durability Calculation

For an (8,4) erasure coding scheme with rack-aware placement:

```
Given:
  - Annual disk failure rate (AFR): 2%
  - Chunks per object: 12 (across 12 nodes on different racks)
  - Object loss requires: 5+ simultaneous chunk losses (before repair)
  - Mean time to repair (MTTR): 6 hours
  - Probability of a chunk being unavailable during MTTR window:
      P(chunk_fail) ≈ AFR × (MTTR / 8760 hours) = 0.02 × (6/8760) ≈ 1.37 × 10⁻⁵

  - P(object loss) = C(12,5) × P(chunk_fail)^5
                    = 792 × (1.37 × 10⁻⁵)^5
                    ≈ 792 × 4.89 × 10⁻²⁵
                    ≈ 3.87 × 10⁻²²

  - Durability = 1 - P(loss) ≈ 99.99999999999999999999978%
                 (~22 nines, well exceeding 11 nines target)
```

The actual calculation is more nuanced (correlated failures, whole-rack failures, etc.), but the principle holds: erasure coding across independent failure domains yields extraordinary durability.

### Data Integrity — Checksums and Scrubbing

```
WRITE PATH:
  Client computes checksum ──→ Sends data + checksum
  Data node verifies checksum ──→ Stores data + checksum
  Each chunk gets its own checksum

READ PATH:
  Data node reads data ──→ Verifies stored checksum
  Returns data to client ──→ Client verifies end-to-end checksum

BACKGROUND SCRUBBING:
  ┌─────────────────────────────────────────────┐
  │  Scrubber Process (runs continuously)       │
  │                                             │
  │  For each data file:                        │
  │    For each object in file:                 │
  │      Read data                              │
  │      Compute checksum                       │
  │      Compare with stored checksum           │
  │      If mismatch → trigger repair:          │
  │        1. Fetch healthy chunks from peers   │
  │        2. Reconstruct corrupted chunk       │
  │        3. Replace bad chunk                 │
  │        4. Alert monitoring                  │
  │                                             │
  │  Cycle time: ~2 weeks for full scan         │
  └─────────────────────────────────────────────┘
```

**Checksum algorithms used in practice**:

| Algorithm | Speed | Strength | Use Case |
|---|---|---|---|
| CRC32C | Very fast (hardware-accelerated) | Detects most bit errors | Per-chunk integrity |
| MD5 | Fast | 128-bit, collision-prone | Legacy S3 ETag (not for security) |
| SHA-256 | Moderate | Cryptographic strength | Content-addressable storage, verification |
| xxHash | Extremely fast | Non-cryptographic, excellent distribution | Internal integrity checks |

---

## 6. Object Versioning

### How Versioning Works

When versioning is **enabled** on a bucket, every PUT creates a new version instead of overwriting:

```
Timeline of operations on key "report.pdf":

T1: PUT report.pdf (v1)  ──→  version_id = "aaa111", is_latest = true
T2: PUT report.pdf (v2)  ──→  version_id = "bbb222", is_latest = true
                               v1: is_latest = false
T3: PUT report.pdf (v3)  ──→  version_id = "ccc333", is_latest = true
                               v2: is_latest = false
T4: DELETE report.pdf    ──→  version_id = "ddd444", is_latest = true
                               type = DELETE_MARKER
                               v3: is_latest = false

State after T4:
┌──────────────┬────────────┬───────────┬──────────────┐
│ object_key   │ version_id │ is_latest │ type         │
├──────────────┼────────────┼───────────┼──────────────┤
│ report.pdf   │ ddd444     │ true      │ DELETE_MARKER│
│ report.pdf   │ ccc333     │ false     │ DATA         │
│ report.pdf   │ bbb222     │ false     │ DATA         │
│ report.pdf   │ aaa111     │ false     │ DATA         │
└──────────────┴────────────┴───────────┴──────────────┘
```

### Version Access Patterns

```
GET /bucket/report.pdf
  → Returns 404 (latest version is a delete marker)

GET /bucket/report.pdf?versionId=ccc333
  → Returns v3 data (specific version access)

DELETE /bucket/report.pdf?versionId=bbb222
  → Permanently deletes v2 (hard delete of specific version)

GET /bucket/report.pdf  (after removing delete marker ddd444)
  → Returns v3 data (v3 becomes latest again)
```

### Versioning States

```
┌─────────────────┐       enable        ┌─────────────────┐
│   UNVERSIONED   │ ──────────────────→  │    ENABLED      │
│ (default state) │                      │ (new versions   │
│                 │                      │  on every PUT)  │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                              suspend
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │   SUSPENDED     │
                                         │ (PUT creates    │
                                         │  "null" version │
                                         │  ID overwrite)  │
                                         └─────────────────┘
```

**Important**: Once versioning is enabled, it cannot be fully disabled — only suspended. Previous versions remain accessible.

### Version Lifecycle Policies

To control storage costs, lifecycle policies automate version management:

```json
{
  "Rules": [
    {
      "ID": "cleanup-old-versions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90,
        "NewerNoncurrentVersions": 3
      }
    },
    {
      "ID": "transition-old-versions",
      "Status": "Enabled",
      "NoncurrentVersionTransition": {
        "NoncurrentDays": 30,
        "StorageClass": "GLACIER"
      }
    }
  ]
}
```

This keeps the latest 3 non-current versions for 90 days and transitions non-current versions to Glacier after 30 days.

---

## 7. Large Object Upload (Multipart Upload)

### Why Multipart Upload?

| Problem with single PUT | Multipart Solution |
|---|---|
| 5 GB single PUT limit (S3) | Up to 5 TB per object |
| Network failure = restart from scratch | Retry only failed parts |
| Cannot parallelize upload | Upload parts concurrently |
| Memory pressure on client & server | Stream parts individually |
| No progress tracking | Track per-part completion |

### Multipart Upload Flow

```
Client                          API Gateway              Metadata Store    Data Store
  │                                  │                        │               │
  │ 1. POST /bucket/key?uploads      │                        │               │
  │─────────────────────────────────→│                        │               │
  │                                  │── create upload ──────→│               │
  │                                  │←── upload_id ─────────│               │
  │←── 200 {uploadId: "xyz123"} ────│                        │               │
  │                                  │                        │               │
  │ 2. PUT /bucket/key              │                        │               │
  │    ?partNumber=1&uploadId=xyz123 │                        │               │
  │    Body: [part 1 data, 100MB]    │                        │               │
  │─────────────────────────────────→│───── store part ──────────────────────→│
  │                                  │←──── ETag_1 ─────────────────────────│
  │←── 200 {ETag: "etag_1"} ───────│                        │               │
  │                                  │                        │               │
  │    (parts 2-10 uploaded in       │                        │               │
  │     parallel, same flow)         │                        │               │
  │                                  │                        │               │
  │ 3. POST /bucket/key             │                        │               │
  │    ?uploadId=xyz123              │                        │               │
  │    Body: {parts: [               │                        │               │
  │      {partNum:1, ETag:"etag_1"}, │                        │               │
  │      {partNum:2, ETag:"etag_2"}, │                        │               │
  │      ...                         │                        │               │
  │    ]}                            │                        │               │
  │─────────────────────────────────→│                        │               │
  │                                  │── validate parts ─────→│               │
  │                                  │── assemble object ────→│               │
  │                                  │── create object meta ──→│               │
  │                                  │←── ok ────────────────│               │
  │←── 200 OK ─────────────────────│                        │               │
```

### Part Constraints and Sizing

| Constraint | Value (S3) |
|---|---|
| Minimum part size | 5 MB (except last part) |
| Maximum part size | 5 GB |
| Maximum parts | 10,000 |
| Maximum object size | 5 TB |
| Recommended part size | 100 MB – 1 GB for large files |

**Optimal part size calculation**:

```
Object size: 50 GB
Target parallelism: 10 concurrent uploads
Network bandwidth: 1 Gbps (≈ 125 MB/s)

Part size = 50 GB / 100 parts = 500 MB  (leaves room for up to 10,000)
Upload time per part = 500 MB / 125 MB/s = 4 seconds
Total time (10 parallel) = (100 parts / 10 parallel) × 4s = 40 seconds
```

### Incomplete Upload Cleanup

Incomplete multipart uploads consume storage. Cleanup strategies:

```
┌─────────────────────────────────────────────────────┐
│              Multipart Upload Lifecycle              │
│                                                      │
│  Initiate ──→ Upload Parts ──→ Complete              │
│     │              │               │                 │
│     │              │               └─→ Object Created│
│     │              │                                 │
│     │              └──→ Abort (explicit)              │
│     │                   └─→ Parts Deleted            │
│     │                                                │
│     └──→ Expire (lifecycle rule, e.g., 7 days)       │
│           └─→ Auto-abort + Parts Deleted             │
└─────────────────────────────────────────────────────┘
```

**Lifecycle rule for auto-cleanup**:

```json
{
  "Rules": [{
    "ID": "abort-incomplete-uploads",
    "Status": "Enabled",
    "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
    }
  }]
}
```

### Part Tracking in Metadata Store

```sql
CREATE TABLE multipart_uploads (
    upload_id     VARCHAR(64) PRIMARY KEY,
    bucket_id     BIGINT NOT NULL,
    object_key    VARCHAR(1024) NOT NULL,
    initiated_at  TIMESTAMP DEFAULT NOW(),
    status        ENUM('IN_PROGRESS', 'COMPLETED', 'ABORTED'),
    INDEX idx_bucket (bucket_id, object_key)
);

CREATE TABLE upload_parts (
    upload_id     VARCHAR(64) NOT NULL,
    part_number   INT NOT NULL,
    size          BIGINT,
    etag          VARCHAR(64),             -- MD5 of part data
    data_location JSON,                    -- where the part is stored
    uploaded_at   TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (upload_id, part_number)
);
```

---

## 8. Object Lifecycle & Storage Classes

### Storage Tiers

```
                    Access Frequency
        High ◄─────────────────────────► Low
        
  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  STANDARD    │  │  STANDARD-IA │  │  GLACIER     │  │  GLACIER     │
  │              │  │  (Infrequent │  │  INSTANT     │  │  DEEP        │
  │  - Hot data  │  │   Access)    │  │  RETRIEVAL   │  │  ARCHIVE     │
  │  - ms access │  │              │  │              │  │              │
  │  - $$$/GB    │  │  - Warm data │  │  - Cold data │  │  - Frozen    │
  │              │  │  - ms access │  │  - ms access │  │  - hrs access│
  │              │  │  - $$/GB +   │  │  - $/GB +    │  │  - ¢/GB +   │
  │              │  │    retrieval │  │    retrieval  │  │    retrieval │
  │              │  │    fee       │  │    fee        │  │    fee       │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │                 │
    $0.023/GB         $0.0125/GB        $0.004/GB         $0.00099/GB
    per month          per month         per month          per month
```

### Lifecycle Rules Engine

```
┌──────────────────────────────────────────────────────────────────┐
│                    Lifecycle Rules Engine                         │
│                                                                  │
│  Runs daily (or continuously) as a background job                │
│                                                                  │
│  For each bucket with lifecycle rules:                           │
│    For each object in bucket:                                    │
│      Evaluate all rules against object:                         │
│        - Age (days since creation)                               │
│        - Last access time                                        │
│        - Key prefix match                                        │
│        - Object size                                             │
│        - Version status (current vs non-current)                │
│      Actions:                                                    │
│        - Transition: move to cheaper storage class               │
│        - Expiration: delete object (or version)                  │
│        - Abort incomplete multipart uploads                      │
└──────────────────────────────────────────────────────────────────┘
```

**Example lifecycle configuration**:

```
Object: logs/app-2024-01-15.log

Day 0-30:    STANDARD        (frequent access for debugging)
Day 30-90:   STANDARD-IA     (occasional access for analysis)
Day 90-365:  GLACIER INSTANT (rare access for compliance)
Day 365+:    DELETE           (retention period expired)
```

### How Storage Tiers Work Internally

| Tier | Storage Medium | Erasure Coding | Retrieval |
|---|---|---|---|
| Standard | SSD + HDD mix | (8,4) on fast disks | Immediate |
| Standard-IA | HDD only | (8,4) on dense HDDs | Immediate (but per-request fee) |
| Glacier Instant | HDD archive pools | (12,4) higher ratio | Immediate (higher fee) |
| Glacier Deep | Tape / offline HDD | (12,4) on tape | 12-48 hours (stage from tape) |

Transitioning between tiers involves:
1. Reading the object data
2. Re-encoding with the target tier's erasure coding scheme
3. Writing to the target storage pool
4. Updating metadata with new storage class and data locations
5. Deleting from the source pool

---

## 9. Architecture & Scaling

### Overall System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CONTROL PLANE                                    │
│                                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Name Node /  │  │  Placement    │  │  Cluster     │  │  Lifecycle │  │
│  │ Master       │  │  Manager      │  │  Manager     │  │  Engine    │  │
│  │              │  │              │  │              │  │            │  │
│  │ • Namespace  │  │ • Rack-aware  │  │ • Node joins │  │ • Tier     │  │
│  │ • Metadata   │  │   placement  │  │ • Heartbeats │  │   transition│  │
│  │ • Coord.     │  │ • EC groups  │  │ • Decommission│  │ • Expiry   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │                 │          │
│         └─────────────────┴─────────────────┴─────────────────┘          │
│                                    │                                     │
│                            Raft / Paxos                                  │
│                          (Leader Election)                               │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Data Plane Bus  │
                              │  (internal RPC)  │
                              └────────┬────────┘
                                       │
          ┌──────────────┬─────────────┼─────────────┬──────────────┐
          ▼              ▼             ▼             ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐
    │ Data Node │  │ Data Node │  │ Data Node │  │ Data Node │  │  ...    │
    │    01     │  │    02     │  │    03     │  │    04     │  │         │
    │ 100 TB    │  │ 100 TB    │  │ 100 TB    │  │ 100 TB    │  │         │
    │ Rack A    │  │ Rack A    │  │ Rack B    │  │ Rack B    │  │         │
    └───────────┘  └───────────┘  └───────────┘  └───────────┘  └─────────┘
```

### Data Node Management

**Heartbeat protocol**:

```
Data Node ──── heartbeat (every 10s) ────→ Cluster Manager
              {
                node_id: "dn-042",
                status: "healthy",
                disk_usage: [
                  {disk: "/dev/sda", total: 10TB, used: 7.2TB, iops: 150},
                  {disk: "/dev/sdb", total: 10TB, used: 8.1TB, iops: 200}
                ],
                cpu_load: 0.45,
                network_bw: "8.2 Gbps",
                active_repairs: 3,
                data_files_count: 12500,
                objects_count: 45000000
              }

If heartbeat missing for 30s:
  Cluster Manager marks node as "suspect"
  
If heartbeat missing for 5 min:
  Cluster Manager marks node as "dead"
  Initiates repair: re-replicate/re-encode affected chunks
```

**Node join/decommission**:

```
JOIN:
  1. New node registers with cluster manager
  2. Assigned a node_id and rack/DC info
  3. Begins accepting writes
  4. Rebalancing: existing data migrated to new node gradually

DECOMMISSION:
  1. Node marked as "decommissioning"
  2. Stops accepting new writes
  3. All chunks migrated to other healthy nodes
  4. After migration complete, node removed from cluster
  5. No data loss during the process
```

### Name Node / Master Node HA

The name node (master) is the most critical single point of failure. High availability through consensus:

```
                    ┌──────────────────────┐
                    │     Raft Group        │
                    │                      │
                    │  ┌─────────────────┐ │
                    │  │   Leader        │ │◄── Handles all writes
                    │  │  (Name Node 1) │ │    and consistent reads
                    │  └────────┬────────┘ │
                    │           │           │
                    │     Raft Log          │
                    │     Replication       │
                    │           │           │
                    │  ┌────────▼────────┐ │
                    │  │  Follower       │ │◄── Hot standby, can serve
                    │  │ (Name Node 2)  │ │    stale reads
                    │  └────────┬────────┘ │
                    │           │           │
                    │  ┌────────▼────────┐ │
                    │  │  Follower       │ │◄── Becomes leader if
                    │  │ (Name Node 3)  │ │    current leader fails
                    │  └─────────────────┘ │
                    └──────────────────────┘
                    
Leader election: ~1-5 seconds on leader failure
```

### Data Placement with Consistent Hashing

```
             Virtual Node Ring (Consistent Hashing)

                        dn-01(v1)
                      ╱            ╲
                 dn-04(v2)       dn-02(v1)
                ╱                       ╲
           dn-03(v1)                  dn-01(v2)
                ╲                       ╱
                 dn-04(v1)       dn-03(v2)
                      ╲            ╱
                        dn-02(v2)

Object "photo.jpg":
  hash("photo.jpg") → position on ring
  → Primary: dn-02
  → Walk clockwise for next distinct nodes
  → Secondary chunks: dn-01, dn-03, dn-04, ...
  
Constraint: successive nodes must be in different racks/DCs
```

**Why consistent hashing matters**: When a node joins or leaves, only ~1/N of the data needs to be redistributed (vs rehashing everything with modular hashing).

### Cross-Region Replication

```
            Region: US-EAST                     Region: EU-WEST
     ┌──────────────────────────┐        ┌──────────────────────────┐
     │  ┌────────────────────┐  │        │  ┌────────────────────┐  │
     │  │  Object Storage    │  │  Async │  │  Object Storage    │  │
     │  │  Cluster (Primary) │──┼────────┼─→│  Cluster (Replica) │  │
     │  └────────────────────┘  │  Repl  │  └────────────────────┘  │
     │                          │        │                          │
     │  PUT acknowledged after  │        │  Replica eventually     │
     │  local durability only   │        │  consistent (seconds    │
     │                          │        │  to minutes lag)         │
     └──────────────────────────┘        └──────────────────────────┘

Replication stream:
  1. Source bucket configured with CRR (Cross-Region Replication)
  2. Change events streamed to replication queue
  3. Replication workers read changes, fetch objects, write to destination
  4. Track replication lag per-object
```

**Use cases**: Disaster recovery, compliance (data sovereignty), latency reduction for global users.

### Garbage Collection — Mark and Sweep

```
┌──────────────────────────────────────────────────────────────┐
│                  Garbage Collection Process                    │
│                                                              │
│  PHASE 1: MARK (identify garbage)                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Scan metadata store for:                              │  │
│  │  • Deleted objects (past retention period)             │  │
│  │  • Expired versions (per lifecycle policy)             │  │
│  │  • Orphaned chunks (no metadata reference)             │  │
│  │  • Aborted multipart upload parts                      │  │
│  │                                                        │  │
│  │  Output: set of (data_file, offset, length) to delete  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  PHASE 2: SWEEP (reclaim space)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  For each data file with garbage:                      │  │
│  │    If garbage_ratio > threshold (e.g., 30%):           │  │
│  │      Compact: copy live objects to new file            │  │
│  │      Update index references                           │  │
│  │      Delete old file                                   │  │
│  │    Else:                                               │  │
│  │      Leave for next GC cycle (not worth compacting)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Safety: GC only runs after a "grace period" to avoid       │
│  deleting data that might be referenced by in-flight reads  │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Access Control & Security

### Authorization Model

```
┌──────────────────────────────────────────────────────────────┐
│                   ACCESS CONTROL LAYERS                       │
│                                                              │
│  Layer 1: IAM Policies (identity-based)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "Allow user:alice to s3:GetObject on bucket-X/*"     │  │
│  │  "Deny user:bob to s3:* on bucket-Y/*"                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 2: Bucket Policies (resource-based)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  "Allow Principal:* Action:s3:GetObject on bucket-X/*"│  │
│  │  Condition: source IP in 10.0.0.0/8                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Layer 3: ACLs (legacy, object-level)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Object "photo.jpg": owner=alice, public-read         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Evaluation: DENY by default                                 │
│  Any explicit DENY → denied                                  │
│  Must have at least one ALLOW (IAM or bucket policy)         │
│  No ALLOW = denied                                           │
└──────────────────────────────────────────────────────────────┘
```

### Pre-Signed URLs

Pre-signed URLs grant temporary access to private objects without requiring the requester to have credentials:

```
Generation (server-side):
  URL = sign(
    method:     "GET",
    bucket:     "private-assets",
    key:        "report.pdf",
    expires:    3600,              // 1 hour
    secret_key: owner's_secret_key
  )
  
  Result:
  https://s3.example.com/private-assets/report.pdf
    ?X-Amz-Algorithm=AWS4-HMAC-SHA256
    &X-Amz-Credential=AKIA.../20240115/us-east-1/s3/aws4_request
    &X-Amz-Date=20240115T120000Z
    &X-Amz-Expires=3600
    &X-Amz-Signature=abc123...

Usage (client-side):
  Any client with this URL can GET the object for 1 hour.
  No credentials needed — the signature authenticates the request.

Server verification:
  1. Parse signature parameters
  2. Check expiration time
  3. Reconstruct signing string
  4. Verify HMAC signature matches
  5. Check IAM permissions of the signer
```

**Use cases**: Sharing private files via links, direct browser uploads (PUT pre-signed URLs), time-limited access for partners.

### Encryption

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION OPTIONS                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  SSE-S3 (Server-Side Encryption, S3-managed keys)       │    │
│  │                                                          │    │
│  │  Client ──data──→ S3 ──encrypt(AES-256)──→ Disk         │    │
│  │  S3 manages keys, rotates automatically                  │    │
│  │  Simplest option, no customer key management             │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  SSE-KMS (Server-Side Encryption, KMS-managed keys)     │    │
│  │                                                          │    │
│  │  Client ──data──→ S3 ──request key──→ KMS               │    │
│  │                       ←──data key───                     │    │
│  │                   encrypt(AES-256)──→ Disk               │    │
│  │  Customer controls key policy, audit trail in KMS        │    │
│  │  Envelope encryption: data key encrypted by master key   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  SSE-C (Server-Side Encryption, Customer-provided keys) │    │
│  │                                                          │    │
│  │  Client ──data + key──→ S3 ──encrypt──→ Disk            │    │
│  │  S3 does NOT store the key — customer must provide       │    │
│  │  it on every GET. Requires HTTPS.                        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Client-Side Encryption                                  │    │
│  │                                                          │    │
│  │  Client ──encrypt locally──→ S3 stores ciphertext       │    │
│  │  S3 never sees plaintext. Customer manages everything.  │    │
│  │  Maximum security, maximum customer responsibility.      │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Encryption Comparison

| Type | Key Management | S3 Sees Plaintext | Audit Trail | Complexity |
|---|---|---|---|---|
| SSE-S3 | AWS manages | Yes (briefly) | Limited | Lowest |
| SSE-KMS | Customer via KMS | Yes (briefly) | Full (CloudTrail) | Medium |
| SSE-C | Customer provides | Yes (briefly) | Customer's responsibility | High |
| Client-side | Customer manages | **No** | Customer's responsibility | Highest |

---

## 11. Trade-offs, Interview Tips & Cheat Sheet

### Key Design Decisions to Discuss

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Data redundancy | Replication (3x) | Erasure coding (8,4) | EC for data, replication for metadata |
| Metadata DB | Sharded SQL | Distributed KV | Sharded SQL (need listing queries) |
| Consistency | Strong | Eventual | Strong (S3 moved to this in 2020) |
| Small object handling | Inline in metadata | Aggregate in data files | Aggregate (simpler architecture) |
| Data file format | Custom append log | Use existing (e.g., SSTable) | Custom for control, but mention SSTable |
| Object ID generation | UUID v4 | Snowflake-style | UUID for simplicity, Snowflake for ordering |

### Consistency Model Deep Dive

```
METADATA (strong consistency — Raft-based):
  PUT key=A, value=1
  GET key=A → always returns 1 (or newer)

DATA (read-after-write consistency):
  PUT object "photo.jpg"
  GET object "photo.jpg" → always returns the latest PUT
  
  How: 
  1. PUT writes data, then commits metadata atomically
  2. GET reads metadata first (strongly consistent), then fetches data
  3. Metadata commit is the "linearization point"

LIST (strong consistency since S3 2020):
  PUT object "new-file.txt"
  LIST bucket → includes "new-file.txt"
  
  Pre-2020 S3 had eventual consistency for LIST after PUT/DELETE
  (stale index propagation delay)
```

### Small vs Large Object Optimization

| Aspect | Small Objects (< 256 KB) | Large Objects (> 10 MB) |
|---|---|---|
| Bottleneck | Metadata IOPS | Network throughput |
| Storage concern | Disk space waste from alignment | Efficient streaming |
| Upload strategy | Single PUT | Multipart upload |
| Erasure coding | May use replication instead (EC overhead per-object) | EC is very efficient |
| Caching | Cache in memory (CDN, read cache) | Stream from disk |
| Batching | Batch many into aggregate files | Individual handling OK |

### Common Follow-Up Questions

**Q: How do you handle hot objects (viral content)?**
- CDN caching in front of the object store
- Read replicas for popular objects
- Request routing to distribute across replicas
- Rate limiting per-key if needed

**Q: How do you handle cross-region consistency?**
- Single-region writes with async replication
- For strong cross-region: consensus across regions (high latency)
- Typically eventual consistency for cross-region, strong within region

**Q: How does S3 achieve strong consistency without sacrificing performance?**
- Per-object linearization through the metadata layer
- Metadata commits use a strongly-consistent store (like Paxos/Raft)
- "Witness" nodes confirm data durability before metadata commit
- Read path always goes through metadata first

**Q: How do you handle data center failure?**
- Erasure coding chunks spread across DCs
- With (8,4) across 3 DCs: can lose an entire DC and still read
- Metadata replicated across DCs via Raft
- DNS failover to redirect traffic to surviving DCs

**Q: How do you handle disk failures silently (bit rot)?**
- Background scrubbing: periodically read all data, verify checksums
- Any corruption detected → immediately repair from other chunks
- SMART monitoring for proactive disk replacement

**Q: How does object listing scale?**
- B-tree index on (bucket_id, key) enables efficient prefix scans
- For extremely large buckets (billions of keys): secondary index partitioned by prefix
- Continuation tokens enable stateless pagination
- S3 Inventory for bulk listing (async, CSV/Parquet output)

### Interview Framework — 4-Step Approach

```
Step 1: CLARIFY (3-5 min)
  ├── What types of objects? (size distribution, access patterns)
  ├── Durability vs availability priority?
  ├── Scale: how many objects? How much data?
  ├── Consistency requirements?
  └── Multi-region?

Step 2: HIGH-LEVEL DESIGN (10 min)
  ├── Three-layer architecture (API, Metadata, Data)
  ├── API design (REST endpoints)
  ├── Write path and read path
  └── Key data flow diagrams

Step 3: DEEP DIVE (15-20 min)
  ├── Data store: append-only files, index
  ├── Erasure coding vs replication
  ├── Metadata sharding strategy
  ├── Durability math
  ├── Versioning or multipart upload
  └── Consistency model

Step 4: WRAP UP (5 min)
  ├── Failure scenarios and mitigations
  ├── Monitoring and observability
  ├── Storage tiers and cost optimization
  └── Future improvements (e.g., intelligent tiering, analytics)
```

### Quick Reference Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────┐
│              S3-LIKE OBJECT STORAGE — CHEAT SHEET                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARCHITECTURE:   3 layers — API Gateway, Metadata, Data Store   │
│  DATA MODEL:     Bucket (namespace) → Key → Object (immutable)  │
│  API:            REST — PUT/GET/DELETE /bucket/key               │
│                                                                  │
│  DATA STORE:                                                     │
│  • Append-only data files (~1 GB each)                          │
│  • Index: object_id → (file, offset, length)                    │
│  • Compaction for garbage collection                            │
│                                                                  │
│  DURABILITY (11 nines):                                         │
│  • Erasure coding (8,4) = 1.5x overhead, tolerate 4 failures   │
│  • Rack-aware and DC-aware chunk placement                      │
│  • Checksums (CRC32C) + periodic background scrubbing           │
│                                                                  │
│  METADATA:                                                       │
│  • Sharded SQL (by bucket_id)                                   │
│  • Strong consistency via Raft/Paxos                            │
│  • Prefix-based listing with B-tree index                       │
│                                                                  │
│  VERSIONING:                                                     │
│  • Each PUT = new version_id                                    │
│  • DELETE = delete marker (soft delete)                          │
│  • Previous versions remain accessible by version_id            │
│                                                                  │
│  MULTIPART UPLOAD:                                               │
│  • Initiate → Upload parts (parallel) → Complete                │
│  • 5MB-5GB per part, up to 10,000 parts, 5TB max object        │
│  • Retry individual failed parts                                │
│                                                                  │
│  SECURITY:                                                       │
│  • IAM policies + bucket policies + ACLs                        │
│  • Pre-signed URLs for temporary access                         │
│  • SSE-S3 / SSE-KMS / SSE-C / client-side encryption           │
│                                                                  │
│  KEY NUMBERS:                                                    │
│  • Durability: 99.999999999% (11 nines)                         │
│  • Availability: 99.99% (4 nines)                               │
│  • EC overhead: 1.5x (vs 3x replication)                        │
│  • Max object: 5 TB (via multipart)                             │
│  • Max single PUT: 5 GB                                         │
│  • EC (8,4): tolerates 4 failures, needs any 8 of 12 chunks    │
│                                                                  │
│  REAL-WORLD SYSTEMS:                                             │
│  • Amazon S3, Google Cloud Storage, Azure Blob Storage          │
│  • Open source: MinIO, Ceph (RADOS Gateway), OpenStack Swift    │
└──────────────────────────────────────────────────────────────────┘
```

### What Interviewers Are Really Testing

| Signal | What They Want to See |
|---|---|
| **Scale intuition** | You understand billions of objects = special data store design, not just "use a database" |
| **Durability reasoning** | You can explain erasure coding, not just say "replicate 3x" |
| **Trade-off articulation** | Replication vs EC, strong vs eventual, cost vs performance |
| **Layered thinking** | Clean separation of API, metadata, and data layers |
| **Failure handling** | Disk failure, node failure, DC failure — and how each is handled |
| **Practical knowledge** | Awareness of real S3 features: versioning, multipart, lifecycle, pre-signed URLs |

---

## 12. Appendix: Real-World Reference

### How Amazon S3 Actually Works (Public Knowledge)

Based on public talks, papers, and documentation:

- **Metadata**: Custom strongly-consistent distributed database, replicated with Paxos
- **Data**: Distributed across multiple AZs using erasure coding
- **Consistency**: Strong read-after-write since December 2020 (previously eventual for overwrites and deletes)
- **Scale**: Over 100 trillion objects as of 2023
- **Durability**: Designed for 99.999999999% (achieved through EC + checksums + scrubbing)
- **Storage classes**: 8+ tiers from S3 Express One Zone (single-digit ms) to Glacier Deep Archive

### Open-Source Alternatives

| System | Architecture | Erasure Coding | Best For |
|---|---|---|---|
| **MinIO** | Distributed, S3-compatible | Yes (Reed-Solomon) | Private cloud S3 replacement |
| **Ceph (RGW)** | RADOS + Gateway | Yes | Unified storage (block + file + object) |
| **OpenStack Swift** | Proxy + storage nodes | No (replication only) | OpenStack ecosystems |
| **SeaweedFS** | Master + Volume servers | Yes | Simple, fast, POSIX-compatible |

### Further Reading

- Amazon S3 consistency model: https://aws.amazon.com/s3/consistency/
- Facebook's f4 warm storage (erasure coding at scale)
- Google Colossus (successor to GFS, powers GCS)
- Azure Storage: architecture of a cloud-scale storage service (SOSP 2011)
- Reed-Solomon error correction mathematics
- HDFS Erasure Coding (Apache Hadoop 3.0+)
