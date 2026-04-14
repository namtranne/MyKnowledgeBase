---
sidebar_position: 5
title: "04 — Storage"
slug: 04-storage
---

# Storage Services

Storage appears in every exam domain — choosing the right storage class for cost, configuring encryption for security, setting up replication for resilience, and selecting the right type for performance.

---

## S3 (Simple Storage Service)

The most important storage service on the exam. Know it **deeply**.

### Core Concepts

- **Bucket:** Container for objects. **Globally unique name**. Created in a specific Region.
- **Object:** A file + metadata. **Key** (full path), **value** (file data, up to **5 TB**).
- **Prefix:** The "folder path" in the key (e.g., `photos/2024/january/`). Not real folders — it's part of the key string.
- **No directory hierarchy** — it's a flat namespace with prefix-based organization.

**Upload limits:**
- Single PUT: up to **5 GB**
- **Multipart upload:** Required for objects > 5 GB, recommended for > **100 MB**
- **S3 Transfer Acceleration:** Uses CloudFront edge locations to accelerate uploads over long distances (especially cross-continent)

### Storage Classes — Overview

| Class | Availability | AZs | Min Storage Duration | Retrieval Fee | Retrieval Speed |
|-------|-------------|-----|---------------------|---------------|-----------------|
| **S3 Standard** | 99.99% | ≥ 3 | None | None | Immediate |
| **S3 Standard-IA** | 99.9% | ≥ 3 | 30 days | Per-GB | Immediate |
| **S3 One Zone-IA** | 99.5% | **1** | 30 days | Per-GB | Immediate |
| **S3 Glacier Instant Retrieval** | 99.9% | ≥ 3 | 90 days | Per-GB | **Milliseconds** |
| **S3 Glacier Flexible Retrieval** | 99.99% | ≥ 3 | 90 days | Per-GB | Minutes to hours |
| **S3 Glacier Deep Archive** | 99.99% | ≥ 3 | 180 days | Per-GB | Hours |
| **S3 Intelligent-Tiering** | 99.9% | ≥ 3 | None | **None** | Immediate / ms |
| **S3 Express One Zone** | 99.95% | **1** | None | None | **Single-digit ms** |

**All classes** have **99.999999999% (11 nines) durability** — except One Zone-IA which stores data in a single AZ (same durability within that AZ, but AZ loss = data loss). S3 Express One Zone has **99.95% availability** and is designed for performance-critical workloads.

### Storage Classes — Deep Dive

#### S3 Standard

| Aspect | Detail |
|--------|--------|
| **Storage cost** | Highest per-GB storage cost (~$0.023/GB/month in us-east-1) |
| **Retrieval cost** | None |
| **Min storage duration charge** | None — no penalty for short-lived objects |
| **Min object size charge** | None |
| **AZs** | ≥ 3 |
| **First-byte latency** | Milliseconds |

**When to use:**
- Data accessed **frequently** (daily or multiple times per week)
- Short-lived objects (logs processed and deleted within days)
- Data with **unknown** duration of stay (if you don't want to use Intelligent-Tiering)
- Any object smaller than **128 KB** (smaller objects are charged a minimum 128 KB in IA classes, making Standard cheaper)

**When NOT to use:**
- Data accessed less than once a month → Standard-IA or Glacier saves 40-90%
- Data you'll never delete quickly → lifecycle to cheaper classes

---

#### S3 Standard-IA (Infrequent Access)

| Aspect | Detail |
|--------|--------|
| **Storage cost** | ~$0.0125/GB/month (**~46% cheaper** than Standard) |
| **Retrieval cost** | $0.01/GB retrieved |
| **Min storage duration charge** | **30 days** — deleted before 30 days? Still charged for 30 days |
| **Min object size charge** | **128 KB** — objects < 128 KB are charged as 128 KB |
| **AZs** | ≥ 3 |
| **First-byte latency** | Milliseconds (same as Standard) |

**When to use:**
- Data accessed **once a month or less**, but needs **instant retrieval** when accessed
- Backups, disaster recovery copies, older application data
- Objects you keep for **30+ days**
- Objects **≥ 128 KB** in size

**When NOT to use:**
- Data accessed daily or weekly → Standard is cheaper (retrieval costs add up)
- Objects smaller than 128 KB → Standard is cheaper due to minimum size charge
- Objects stored for less than 30 days → Standard is cheaper due to minimum duration charge
- Data you can recreate → One Zone-IA is 20% cheaper

**Break-even analysis:** Standard-IA becomes cheaper than Standard when you access data **less than about once per month**. If you retrieve the same object multiple times per month, the retrieval fees can exceed the storage savings.

---

#### S3 One Zone-IA

| Aspect | Detail |
|--------|--------|
| **Storage cost** | ~$0.01/GB/month (**~20% cheaper** than Standard-IA, **~57% cheaper** than Standard) |
| **Retrieval cost** | $0.01/GB retrieved |
| **Min storage duration charge** | **30 days** |
| **Min object size charge** | **128 KB** |
| **AZs** | **1** — data lost if that AZ is destroyed |
| **First-byte latency** | Milliseconds |

**When to use:**
- Infrequently accessed data that **can be recreated** if lost
- Secondary backup copies (primary backup is in another class/Region)
- Thumbnails, transcoded media, processed analytics outputs
- Cross-Region Replication secondary copies

**When NOT to use:**
- Your **only copy** of important data → use Standard-IA (multi-AZ)
- Data required by compliance/regulation → auditors expect multi-AZ durability
- Primary production data of any kind

:::warning
One Zone-IA stores data in a **single AZ**. If that AZ suffers a catastrophic failure (extremely rare but possible), **data is permanently lost**. Only use for data you can recreate or have backed up elsewhere.
:::

---

#### S3 Glacier Instant Retrieval

| Aspect | Detail |
|--------|--------|
| **Storage cost** | ~$0.004/GB/month (**~68% cheaper** than Standard-IA) |
| **Retrieval cost** | $0.03/GB retrieved (3x higher than IA classes) |
| **Min storage duration charge** | **90 days** |
| **Min object size charge** | **128 KB** |
| **AZs** | ≥ 3 |
| **First-byte latency** | **Milliseconds** (same speed as Standard!) |

**When to use:**
- Archive data accessed **once per quarter or less**, but when accessed must be available **instantly**
- Medical images, news media assets, user-generated content archives
- Data kept for **90+ days** minimum

**When NOT to use:**
- Data accessed monthly → Standard-IA is cheaper overall (lower retrieval fee)
- Data where you can tolerate minutes/hours of retrieval delay → Glacier Flexible is cheaper
- Objects stored less than 90 days → Standard-IA is cheaper

**Key insight:** Despite the "Glacier" name, retrieval is **millisecond-speed** — identical to Standard. The tradeoff is higher retrieval cost for much cheaper storage.

---

#### S3 Glacier Flexible Retrieval (formerly "S3 Glacier")

| Aspect | Detail |
|--------|--------|
| **Storage cost** | ~$0.0036/GB/month (**~10% cheaper** than Glacier Instant) |
| **Retrieval cost** | Varies by speed (see below) |
| **Min storage duration charge** | **90 days** |
| **Min object size charge** | 40 KB + 32 KB metadata overhead |
| **AZs** | ≥ 3 |
| **First-byte latency** | Minutes to hours (not instant) |

**Retrieval tiers:**

| Tier | Speed | Cost | Use Case |
|------|-------|------|----------|
| **Expedited** | **1–5 minutes** | $0.03/GB + $10 per 1,000 requests | Urgent, occasional access |
| **Standard** | **3–5 hours** | $0.01/GB + $0.05 per 1,000 requests | Normal retrieval |
| **Bulk** | **5–12 hours** | $0.0025/GB + $0.025 per 1,000 requests | Large volumes, lowest cost |

**Provisioned capacity:** For guaranteed Expedited retrieval availability, purchase provisioned capacity units ($100/month per unit — each guarantees 3 Expedited retrievals every 5 minutes and 150 MB/s throughput).

**When to use:**
- Archive data you rarely access (once or twice a year)
- Compliance archives that must be retained but are almost never read
- Backup archives where retrieval within a few hours is acceptable
- Data kept for **90+ days**

**When NOT to use:**
- Data that must be available instantly when requested → Glacier Instant Retrieval
- Data accessed more than once per quarter → Standard-IA
- Long-term archives where 12+ hours is acceptable → Deep Archive is 77% cheaper

---

#### S3 Glacier Deep Archive

| Aspect | Detail |
|--------|--------|
| **Storage cost** | ~$0.00099/GB/month (**cheapest** — ~$1/TB/month!) |
| **Retrieval cost** | Varies by speed (see below) |
| **Min storage duration charge** | **180 days** |
| **Min object size charge** | 40 KB + 32 KB metadata overhead |
| **AZs** | ≥ 3 |
| **First-byte latency** | Hours |

**Retrieval tiers:**

| Tier | Speed | Cost |
|------|-------|------|
| **Standard** | **12 hours** | $0.02/GB |
| **Bulk** | **48 hours** | $0.0025/GB |

**When to use:**
- Data retained for **regulatory compliance** (7+ years — financial, healthcare, legal)
- Data accessed **once a year or never** (but must be kept)
- **Cheapest possible storage** when retrieval speed doesn't matter
- Replacing physical tape archives
- Data kept for **180+ days** minimum

**When NOT to use:**
- Anything that might need access within hours → Glacier Flexible Retrieval
- Data stored less than 180 days → you're still charged for 180 days
- Data you might need unexpectedly → Intelligent-Tiering with optional archive tiers

**Cost comparison:** At ~$1/TB/month, storing 100 TB for a year costs ~$1,200. The same in S3 Standard would cost ~$27,600. That's a **95% savings**.

---

#### S3 Intelligent-Tiering

| Aspect | Detail |
|--------|--------|
| **Storage cost** | Same rates as the tier the object is currently in |
| **Retrieval cost** | **None** — no retrieval fees when objects move between tiers |
| **Monitoring fee** | $0.0025 per 1,000 objects/month |
| **Min storage duration charge** | **None** |
| **Min object size charge** | None (objects < 128 KB stay in Frequent Access, never auto-tiered) |
| **AZs** | ≥ 3 |
| **First-byte latency** | Milliseconds (Frequent + Infrequent + Archive Instant tiers) |

**Automatic tiers (no configuration needed):**

| Tier | When Object Moves Here | Storage Rate |
|------|----------------------|-------------|
| **Frequent Access** | Default, or accessed again | Same as S3 Standard |
| **Infrequent Access** | Not accessed for **30 days** | Same as S3 Standard-IA |
| **Archive Instant Access** | Not accessed for **90 days** | Same as Glacier Instant |

**Optional tiers (you configure the days):**

| Tier | Configure After | Storage Rate | Retrieval |
|------|----------------|-------------|-----------|
| **Archive Access** | 90–730 days | Same as Glacier Flexible | 3–5 hours (async restore) |
| **Deep Archive Access** | 180–730 days | Same as Glacier Deep Archive | 12 hours (async restore) |

**When to use:**
- **Unknown or changing** access patterns
- Data where you **don't want to manage lifecycle rules** manually
- Datasets with mixed access patterns (some objects hot, some cold)
- When the **monitoring fee is negligible** compared to storage savings (large objects)

**When NOT to use:**
- Objects smaller than 128 KB → monitoring fee overhead makes it more expensive than Standard
- You already **know the access pattern** → use lifecycle rules to the exact class for maximum savings
- Very few large objects → monitoring fee is negligible, so it's fine, but lifecycle rules give the same result
- Short-lived objects (deleted within days) → Standard is simpler and equivalent cost

:::tip Key advantage
Intelligent-Tiering charges **no retrieval fees** when objects move back to Frequent Access. With manual lifecycle rules + IA/Glacier classes, you pay retrieval fees every time. If your access pattern is unpredictable and objects might be accessed again, Intelligent-Tiering can be cheaper overall.
:::

---

#### S3 Express One Zone

| Aspect | Detail |
|--------|--------|
| **Storage cost** | Higher than Standard (~$0.16/GB/month) |
| **Request cost** | 50% cheaper than Standard |
| **Retrieval cost** | None |
| **Min storage duration charge** | None |
| **AZs** | **1** (single AZ, chosen at creation) |
| **First-byte latency** | **Single-digit milliseconds** (10x faster than Standard) |
| **Bucket type** | **Directory buckets** (different from general-purpose buckets) |

**When to use:**
- Performance-critical applications requiring **consistent single-digit millisecond** latency
- ML training and inference (fast data loading)
- Interactive analytics, financial modeling, real-time media processing
- Frequently accessed data that benefits from ultra-low latency

**When NOT to use:**
- Data that needs multi-AZ durability → use S3 Standard
- Infrequently accessed data → IA or Glacier classes are cheaper
- Data requiring lifecycle transitions → Express One Zone doesn't support lifecycle rules to other classes

**Key differences from other classes:**
- Uses **directory buckets** (not general-purpose buckets) with a different bucket naming convention
- Supports a subset of S3 APIs (optimized for performance)
- Data stored in a **single AZ** — not suitable as sole copy of critical data

:::tip Exam pattern
"Lowest latency S3 storage" or "single-digit millisecond performance for data lake" → **S3 Express One Zone**. "ML training with fast data access" → **S3 Express One Zone**.
:::

---

### Storage Class Cost Comparison (us-east-1, approximate)

| Class | Storage $/GB/month | Relative to Standard | Retrieval $/GB | Min Duration |
|-------|-------------------|---------------------|---------------|-------------|
| **Standard** | $0.023 | Baseline | $0.00 | None |
| **Standard-IA** | $0.0125 | 46% cheaper | $0.01 | 30 days |
| **One Zone-IA** | $0.01 | 57% cheaper | $0.01 | 30 days |
| **Glacier Instant** | $0.004 | 83% cheaper | $0.03 | 90 days |
| **Glacier Flexible** | $0.0036 | 84% cheaper | $0.01–$0.03 | 90 days |
| **Glacier Deep Archive** | $0.00099 | **96% cheaper** | $0.02 | 180 days |
| **Intelligent-Tiering** | Varies by tier | Auto-optimized | $0.00 | None |

### Storage Class Decision Tree

```
How often is the data accessed?
│
├── Multiple times per day/week
│   └──▶ S3 Standard
│
├── Once a month or less (but need instant access)
│   ├── Can data be recreated if lost?
│   │   ├── Yes ──▶ S3 One Zone-IA (cheapest)
│   │   └── No  ──▶ S3 Standard-IA
│   └── Object size < 128 KB?
│       └── Yes ──▶ S3 Standard (min size charge makes IA costlier)
│
├── Once a quarter or less (instant access required)
│   └──▶ S3 Glacier Instant Retrieval
│
├── Once or twice a year (can wait hours)
│   └──▶ S3 Glacier Flexible Retrieval
│
├── Almost never / compliance retention
│   └──▶ S3 Glacier Deep Archive
│
└── Access pattern is unknown or changes over time
    └──▶ S3 Intelligent-Tiering
```

### S3 Analytics — Storage Class Analysis

Don't guess which storage class to use — **measure it:**
- Enable **S3 Analytics** on a bucket to analyze access patterns
- After **30+ days** of data collection, provides recommendations for transitioning objects to IA classes
- Helps you design **lifecycle rules** based on real usage data
- Only recommends Standard → Standard-IA transitions (not Glacier)
- Visualize in the S3 console or export to a CSV

:::tip Exam patterns for storage classes
| Question Pattern | Answer |
|-----------------|--------|
| "Minimize cost, rarely accessed, instant retrieval" | **S3 Standard-IA** (monthly) or **Glacier Instant Retrieval** (quarterly) |
| "Unknown or changing access pattern" | **S3 Intelligent-Tiering** |
| "Cheapest archive, retrieval can wait 12+ hours" | **S3 Glacier Deep Archive** |
| "Archive with millisecond access" | **S3 Glacier Instant Retrieval** |
| "Data can be recreated, infrequent access" | **S3 One Zone-IA** |
| "Regulatory compliance, retain for 7 years" | **Glacier Deep Archive** + lifecycle rule |
| "Replace tape backup" | **Glacier Deep Archive** (or Tape Gateway for hybrid) |
| "Transition data automatically as it ages" | **S3 Lifecycle Rules** (Standard → IA → Glacier → Deep Archive → Delete) |
| "Reduce cost without managing lifecycle rules" | **S3 Intelligent-Tiering** |
| "Many small files (< 128 KB), infrequent access" | Stay in **S3 Standard** (IA min size charge makes it costlier) |
| "Analyze access patterns before choosing class" | **S3 Analytics** |
:::

### Lifecycle Rules

Automatically transition objects between storage classes or expire/delete them:

```
Day 0:   S3 Standard
Day 30:  → S3 Standard-IA (min 30 days before transition)
Day 60:  → S3 One Zone-IA
Day 90:  → S3 Glacier Flexible Retrieval
Day 365: → S3 Glacier Deep Archive
Day 730: → Delete (expiration action)
```

- **Transition actions:** Move objects to another storage class
- **Expiration actions:** Delete objects or old versions
- Can filter by **prefix** or **tags**
- **Minimum 30 days** in Standard before transitioning to IA classes
- Can apply to **current versions** and/or **previous versions** (if versioning enabled)

### Versioning

- Every PUT creates a new version of the object
- Deleting an object adds a **delete marker** (doesn't physically delete — recoverable)
- To permanently delete: specify the version ID
- **Required** for Cross-Region Replication
- Once enabled, can only be **suspended** (not disabled)
- Protects against accidental deletes and overwrites

### S3 Encryption

| Method | Key Management | Key Points |
|--------|---------------|------------|
| **SSE-S3** | AWS manages everything | Default encryption. AES-256. Simplest. |
| **SSE-KMS** | You control key in KMS | Audit trail via CloudTrail. Subject to KMS API rate limits (GenerateDataKey). |
| **SSE-C** | You provide key with every request | AWS doesn't store the key. Must use HTTPS. |
| **Client-side** | You encrypt before uploading | Full control. AWS never sees unencrypted data. |
| **DSSE-KMS** | Dual-layer encryption with KMS | Two layers of encryption for compliance. |

**Default encryption:** As of January 2023, all new S3 objects are encrypted with **SSE-S3** by default. You can change the default to SSE-KMS.

**Bucket policy to enforce encryption:**
```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringNotEquals": {
      "s3:x-amz-server-side-encryption": "aws:kms"
    }
  }
}
```

### S3 Access Control

| Mechanism | When to Use |
|-----------|-------------|
| **Bucket Policies** (resource-based) | Most common. Cross-account. Enforce encryption. IP-based access. |
| **IAM Policies** (identity-based) | Control what IAM users/roles can do with S3 |
| **Access Points** | Named network endpoints with per-prefix access policies. Simplify access for many teams. |
| **Object ACLs** | Legacy — mostly disabled on new buckets |
| **Block Public Access** | Account/bucket level. Overrides any policy granting public access. **Enable this always.** |
| **S3 Object Lock** | WORM (Write Once Read Many). Prevent deletion/modification. |
| **S3 Object Ownership** | Controls whether ACLs are used. BucketOwnerEnforced disables ACLs. |

### S3 Access Points

- Named network endpoints with their own DNS name and access policy
- Each access point has its own policy (simpler than one complex bucket policy)
- Can restrict to a specific VPC (VPC origin only)
- Great for large orgs with many teams sharing one bucket

**S3 Multi-Region Access Points:**
- A single global endpoint that routes to the nearest S3 bucket
- Uses AWS Global Accelerator for optimized routing
- Supports **active-active** replication with S3 Replication

### S3 Replication

| Type | From → To | Use Case |
|------|----------|----------|
| **Cross-Region Replication (CRR)** | Bucket in Region A → Bucket in Region B | DR, lower latency, compliance |
| **Same-Region Replication (SRR)** | Bucket in same Region → another bucket | Log aggregation, prod-to-test sync, compliance |

**Requirements:**
- Versioning must be enabled on **both** source and destination
- Buckets can be in different accounts (cross-account replication)
- Replication is **asynchronous**
- Only **new objects** are replicated after enabling (use **S3 Batch Replication** for existing objects)
- Delete markers are **not replicated** by default (can enable)
- No **chaining:** A → B → C doesn't work (A's objects don't replicate to C)

### S3 Object Lock & Glacier Vault Lock

**S3 Object Lock (Compliance/Governance):**
- **WORM model** — prevent object deletion or modification for a retention period
- **Compliance mode:** Nobody can delete or change — not even the root user
- **Governance mode:** Only users with special permissions can delete/change
- Requires versioning

**Glacier Vault Lock:**
- Lock the vault policy (make it immutable)
- Once locked, the policy can never be changed
- Use case: Regulatory compliance (SEC Rule 17a-4, HIPAA)

### S3 Event Notifications

S3 can trigger notifications on events (object created, deleted, restored, etc.):
- **Targets:** SNS, SQS, Lambda, EventBridge
- **EventBridge:** Recommended — supports advanced filtering, multiple destinations, archive/replay

### S3 Performance

- **Baseline:** 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second **per prefix**
- **Multi-part upload:** Parallelize uploads for large files
- **S3 Transfer Acceleration:** Edge locations → S3 bucket (faster for long-distance uploads)
- **S3 Select / Glacier Select:** Filter data server-side using SQL — retrieve only what you need (less data transferred)
- **Byte-range fetches:** Parallelize downloads by requesting specific byte ranges

### S3 Presigned URLs

- Generate a URL with temporary access (upload or download)
- Inherits the permissions of the IAM user/role that generated it
- Configurable expiration (default 1 hour, max 7 days for console-generated)
- Use case: Allow users to upload/download without AWS credentials

### S3 Object Lambda

**Transform data as it's retrieved** from S3 using a Lambda function — no need to store multiple copies.

| Feature | Detail |
|---------|--------|
| **How** | S3 Object Lambda Access Point → Lambda function → modified data returned to caller |
| **Use cases** | Redact PII before returning to unauthorized apps, decompress on-the-fly, resize images dynamically, convert data formats, enrich with external data |
| **Advantage** | One copy of the data in S3, multiple views via different Lambda functions |

```
Application → S3 Object Lambda Access Point → Lambda (transform) → S3 Access Point → S3 Bucket
```

:::tip Exam pattern
"Transform S3 data on retrieval without storing multiple copies" → **S3 Object Lambda**. "Redact PII when reading from S3" → **S3 Object Lambda**.
:::

### S3 Batch Operations

**Execute operations across billions of S3 objects** with a single request.

| Feature | Detail |
|---------|--------|
| **Operations** | Copy objects, invoke Lambda, restore from Glacier, replace tags, replace ACLs, apply Object Lock, replicate existing objects |
| **Input** | S3 Inventory report or CSV manifest of objects |
| **Scale** | Billions of objects per job |
| **Tracking** | Job completion reports, EventBridge notifications, CloudWatch metrics |
| **Use case** | Bulk operations, migrate existing objects to new encryption, batch-restore from Glacier |

**S3 Batch Replication:** A specific use of Batch Operations to **replicate existing objects** that were already in the bucket before replication was enabled (normal replication only applies to new objects).

:::tip Exam pattern
"Replicate existing objects to another Region" → **S3 Batch Replication** (via Batch Operations). "Apply tags to billions of existing objects" → **S3 Batch Operations**. "Restore many Glacier objects at once" → **S3 Batch Operations**.
:::

### S3 Static Website Hosting

- Host static websites directly from S3
- Bucket name should match the domain name
- Enable **public access** + bucket policy to allow `s3:GetObject`
- Combine with **CloudFront** for HTTPS and caching
- Common 403 error: missing public access or bucket policy

---

## EBS (Elastic Block Store)

Network-attached **block storage** for EC2 instances. Like a virtual hard drive.

### Volume Types

| Volume Type | Category | IOPS | Throughput | Use Case |
|-------------|----------|------|-----------|----------|
| **gp3** | General Purpose SSD | 3,000–16,000 | 125–1,000 MB/s | Most workloads (default choice) |
| **gp2** | General Purpose SSD | 100–16,000 (burst 3,000) | 125–250 MB/s | Legacy — use gp3 instead |
| **io2 Block Express** | Provisioned IOPS SSD | Up to **256,000** | 4,000 MB/s | Mission-critical (SAP HANA, Oracle) |
| **io2/io1** | Provisioned IOPS SSD | Up to 64,000 | 1,000 MB/s | High-performance databases |
| **st1** | Throughput Optimized HDD | N/A | Up to 500 MB/s | Big data, data warehouses, log processing |
| **sc1** | Cold HDD | N/A | Up to 250 MB/s | Cheapest. Infrequently accessed data. |

**Key facts:**
- Only **SSD volumes** (gp2, gp3, io1, io2) can be used as **boot volumes**
- HDD volumes (st1, sc1) cannot be boot volumes
- **gp3** is independently configurable (IOPS and throughput are decoupled from size)
- **gp2** IOPS scales with volume size (3 IOPS/GB, up to 16,000)

### EBS Key Concepts

| Concept | Detail |
|---------|--------|
| **AZ-locked** | EBS volume in `us-east-1a` can only attach to instances in `us-east-1a` |
| **Snapshots** | Point-in-time backup → stored in S3 (managed by AWS). Incremental. |
| **Move across AZs** | Snapshot → restore in new AZ |
| **Move across Regions** | Snapshot → copy to new Region → restore |
| **Multi-Attach** | io1/io2 only. Up to **16 instances** in the same AZ. Requires cluster-aware filesystem. |
| **Encryption** | AES-256 via KMS. Encrypts data at rest, in transit, snapshots, and volumes from snapshots. |
| **Resize** | Can increase size, change type, adjust IOPS while in use (no downtime). Cannot decrease size. |

### EBS Snapshots

- **Incremental** — only changed blocks are stored (first snapshot is full)
- Can create from running instances (recommended to detach for consistency)
- **EBS Snapshot Archive:** Move snapshots to archive tier — 75% cheaper, 24-72 hour restore
- **Recycle Bin:** Protect against accidental snapshot deletion — set retention rules (1 day to 1 year)
- **Fast Snapshot Restore (FSR):** Eliminate initialization latency when restoring — expensive

### EBS Encryption

- Uses **KMS keys** (AWS managed or customer managed)
- **Encrypted volume:** Data at rest, data in transit between volume and instance, all snapshots, all volumes from those snapshots — all encrypted
- **Encrypt an unencrypted volume:** Snapshot → copy with encryption → restore from encrypted snapshot
- Can set **encryption by default** for the account in a Region

---

## EFS (Elastic File System)

Managed **NFS** file system. Unlike EBS, it's **shared** across multiple instances and **spans AZs**.

| Feature | Detail |
|---------|--------|
| **Protocol** | NFSv4.1 |
| **OS support** | **Linux only** (POSIX-compliant) |
| **Capacity** | Elastic — grows/shrinks automatically. No provisioning. |
| **Multi-AZ** | Accessible from all AZs in the Region |
| **Concurrent access** | Thousands of connections simultaneously |

### Performance Modes

| Mode | Use Case |
|------|----------|
| **General Purpose** (default) | Latency-sensitive (web serving, CMS, home directories) |
| **Max I/O** | Higher aggregate throughput at higher latency (big data, media processing). Legacy — use Elastic instead. |

### Throughput Modes

| Mode | Behavior |
|------|----------|
| **Bursting** | Throughput scales with file system size. Credits for bursting. |
| **Provisioned** | Specify throughput independently of storage size |
| **Elastic** (recommended) | Automatically scales throughput up/down based on workload. Pay for what you use. |

### Storage Classes

| Class | Description |
|-------|-------------|
| **Standard** | Frequently accessed files |
| **Standard-IA** | Infrequently accessed files — lower storage cost, retrieval fee |
| **One Zone** | Single AZ — lower cost, lower availability |
| **One Zone-IA** | Single AZ + infrequent access — lowest cost |

**Lifecycle policies:** Automatically move files between Standard and IA based on last access time (7, 14, 30, 60, 90 days).

### EBS vs EFS Comparison

| Feature | EBS | EFS |
|---------|-----|-----|
| **Type** | Block storage | File storage (NFS) |
| **Attachment** | Single instance (or Multi-Attach for io1/io2) | Many instances, multi-AZ |
| **Scaling** | Fixed size (manual resize) | Automatic (elastic) |
| **AZ scope** | Single AZ | Multi-AZ |
| **OS** | Linux and Windows | Linux only |
| **Performance** | High IOPS (gp3/io2) | General purpose or high throughput |
| **Cost** | Generally cheaper per GB | More expensive, but shared |
| **Use case** | Database storage, boot volumes | Shared file storage, CMS, home dirs |

---

## FSx (Managed Third-Party File Systems)

| FSx Type | Protocol | Use Case | Key Feature |
|----------|----------|----------|-------------|
| **FSx for Lustre** | Lustre | HPC, ML training, high-throughput computing | Integrates with S3 (hot data ↔ cold data). Sub-ms latencies. |
| **FSx for Windows File Server** | SMB | Windows workloads, AD integration, shared storage | Multi-AZ, AD integration, supports DFS namespaces |
| **FSx for NetApp ONTAP** | NFS/SMB/iSCSI | Multi-protocol, hybrid cloud | Data dedup, compression, SnapMirror replication |
| **FSx for OpenZFS** | NFS | Linux workloads migrating from on-prem ZFS | Snapshots, compression, up to 1M IOPS |

### FSx for Lustre — Deep Dive

| Feature | Detail |
|---------|--------|
| **Performance** | Hundreds of GB/s throughput, millions of IOPS |
| **S3 integration** | Can read from/write to S3 transparently (lazy loading) |
| **Deployment types** | **Scratch** (temp, no replication, highest perf) / **Persistent** (HA, replicated within AZ) |
| **Use case** | HPC, genomics, financial modeling, video rendering |

### FSx for Windows File Server — Deep Dive

| Feature | Detail |
|---------|--------|
| **Protocol** | SMB (native Windows) |
| **AD integration** | AWS Managed Microsoft AD or self-managed AD |
| **Multi-AZ** | Automatic failover to standby |
| **Features** | DFS, VSS user-initiated restores, quotas |
| **Use case** | Windows home directories, enterprise file shares, CMS |

:::tip Exam pattern
"Lustre" or "HPC" → **FSx for Lustre**. "Windows SMB" or "Active Directory file shares" → **FSx for Windows File Server**. "Multi-protocol" or "NetApp migration" → **FSx for NetApp ONTAP**.
:::

---

## AWS Storage Gateway

**Hybrid cloud storage** — connects on-premises environments to AWS cloud storage. Runs as a VM on-premises (or hardware appliance).

| Gateway Type | Protocol | Backend Storage | Use Case |
|--------------|----------|----------------|----------|
| **S3 File Gateway** | NFS / SMB | S3 (all classes) | File shares backed by S3. On-prem users see files, stored in S3 as objects. |
| **FSx File Gateway** | SMB | FSx for Windows | Local cache for FSx for Windows File Server. Low-latency access. |
| **Volume Gateway — Cached** | iSCSI | S3 + local cache | Primary data in S3, frequently accessed data cached locally. |
| **Volume Gateway — Stored** | iSCSI | Local + async backup to S3 | Primary data on-premises, async EBS snapshots to S3. |
| **Tape Gateway** | iSCSI (VTL) | S3 Glacier / Deep Archive | Replace physical tape backup with virtual tapes in cloud. |

```
On-Premises                                AWS Cloud
┌──────────────┐                     ┌──────────────────────┐
│ Application  │                     │                      │
│ Servers      │                     │  S3 / FSx / Glacier  │
│              │     Storage         │                      │
│ ──────────▶  │◄───Gateway ────────▶│  (cloud storage)     │
│              │   (VM/appliance)    │                      │
│ NFS/SMB/iSCSI│     local cache     │                      │
└──────────────┘                     └──────────────────────┘
```

:::tip Exam pattern
"On-premises application needs NFS access to S3" → **S3 File Gateway**. "Backup tapes to cloud" → **Tape Gateway**. "On-prem block storage with cloud backup" → **Volume Gateway**. "Cache FSx for Windows locally" → **FSx File Gateway**.
:::

---

## AWS Snow Family

**Physical devices** for offline data transfer and edge computing when network transfer is too slow, expensive, or impossible.

| Device | Storage | Transfer Time | Compute | Use Case |
|--------|---------|--------------|---------|----------|
| **Snowcone** | 8 TB HDD / 14 TB SSD | Small datasets | 2 vCPUs, 4 GB RAM | Edge computing, IoT, small migrations |
| **Snowball Edge Storage Optimized** | 80 TB | Petabytes | 40 vCPUs, 80 GB RAM | Large data migrations, local computing |
| **Snowball Edge Compute Optimized** | 42 TB | Petabytes | 52 vCPUs, 208 GB RAM, optional GPU | ML inference, video analysis at edge |
| **Snowmobile** | 100 PB (a truck!) | Exabytes | N/A | Massive data center migrations |

**When to use Snow vs network transfer:**
- Rule of thumb: If network transfer would take **more than a week**, consider Snow devices
- **10 TB** over 100 Mbps ≈ 9 days → consider Snowball
- **100+ PB** → Snowmobile

**Snowball Edge process:**
1. Request device from AWS Console
2. AWS ships the device to you
3. Load data onto device
4. Ship device back to AWS
5. AWS loads data into S3

**Edge computing:** Snowball Edge can run EC2 instances and Lambda functions locally for edge processing.

:::tip Exam pattern
"Move petabytes of data to AWS, limited bandwidth" → **Snowball Edge**. "Exabytes of data" → **Snowmobile**. "Edge computing in remote location" → **Snowball Edge Compute Optimized** or **Snowcone**.
:::

---

## AWS Backup

**Centralized, fully managed backup service** across AWS services.

| Feature | Detail |
|---------|--------|
| **Supported services** | EC2, EBS, S3, RDS, Aurora, DynamoDB, EFS, FSx, Storage Gateway, DocumentDB, Neptune, VMware on AWS |
| **Backup Plans** | Define frequency, retention, lifecycle (transition to cold storage) |
| **Backup Vault** | Encrypted container for backups. Supports vault lock (WORM). |
| **Cross-Region backup** | Copy backups to another Region for DR |
| **Cross-account backup** | Copy backups to another AWS account (using AWS Organizations) |
| **On-demand & scheduled** | Manual or automated backups via backup plans |

**Vault Lock:**
- WORM model — backups cannot be deleted during retention period
- Compliance mode — even root cannot delete
- Required for regulatory compliance (SEC, HIPAA)

:::tip Exam pattern
"Centralized backup across multiple services" → **AWS Backup**. "Cross-Region/cross-account backup" → **AWS Backup with copy rules**. "Immutable backups for compliance" → **AWS Backup Vault Lock**.
:::

---

## AWS DataSync

**Online data transfer service** — fast transfer between on-premises storage and AWS, or between AWS storage services.

| Feature | Detail |
|---------|--------|
| **Source** | NFS, SMB, HDFS, self-managed object storage, S3, EFS, FSx |
| **Destination** | S3 (all classes), EFS, FSx |
| **Speed** | Up to **10 Gbps** per agent. Automatic encryption in transit. |
| **Scheduling** | Hourly, daily, weekly |
| **Bandwidth throttling** | Limit to avoid saturating network |
| **Incremental transfer** | Only changed data is transferred |

**DataSync vs Storage Gateway:**
- **DataSync:** One-time or scheduled **bulk data migration/sync**
- **Storage Gateway:** Ongoing hybrid storage access (cache, file shares, backup)

**DataSync vs Snow:**
- **DataSync:** Online transfer over the network (good for < several TB or good bandwidth)
- **Snow:** Offline physical device (good for petabytes or limited bandwidth)

---

## AWS Transfer Family

**Managed SFTP, FTPS, FTP, and AS2 transfers** directly into/out of S3 or EFS.

- Fully managed — no servers to manage
- Supports existing workflows that use SFTP/FTPS/FTP
- Integrates with AD, LDAP, or custom identity providers for authentication
- Use case: B2B file exchanges, data processing pipelines from external partners

---

## Storage Comparison Table

| Storage | Type | Scope | Protocol | Max Size | Use Case |
|---------|------|-------|----------|----------|----------|
| **S3** | Object | Regional | HTTP/S3 API | 5 TB/object | General-purpose object storage |
| **EBS** | Block | AZ | Attached to EC2 | 64 TB/volume | Database storage, boot volumes |
| **EFS** | File | Regional | NFS | Elastic | Shared Linux file storage |
| **FSx Lustre** | File | AZ | Lustre | Elastic | HPC, ML |
| **FSx Windows** | File | Multi-AZ | SMB | Elastic | Windows file shares |
| **Storage Gateway** | Hybrid | On-prem ↔ AWS | NFS/SMB/iSCSI | Various | Hybrid cloud storage |
| **Snow Family** | Physical | Shipped | Direct attach | 8 TB – 100 PB | Offline data transfer, edge computing |

---

## Storage Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Shared file storage across EC2 Linux instances" | EFS |
| "Shared file storage for Windows" | FSx for Windows File Server |
| "High IOPS database volume" | EBS io2 / io2 Block Express |
| "Cost-effective general purpose volume" | EBS gp3 |
| "Archive data, 12+ hour retrieval OK" | S3 Glacier Deep Archive |
| "Unknown access pattern" | S3 Intelligent-Tiering |
| "On-prem NFS access to S3" | S3 File Gateway |
| "Replace tape backups" | Tape Gateway |
| "Move petabytes, limited bandwidth" | Snowball Edge |
| "HPC file system integrated with S3" | FSx for Lustre |
| "Centralized backup for multiple services" | AWS Backup |
| "Migrate NFS data to AWS" | AWS DataSync |
| "SFTP server for partner file exchange" | AWS Transfer Family |
| "Prevent deletion of backups" | S3 Object Lock or Backup Vault Lock |
| "Transform S3 data on retrieval" | S3 Object Lambda |
| "Bulk operations on billions of S3 objects" | S3 Batch Operations |
| "Replicate existing S3 objects" | S3 Batch Replication |
| "Lowest latency S3 storage" | S3 Express One Zone |
| "Cross-Region data replication for S3" | S3 Cross-Region Replication |
