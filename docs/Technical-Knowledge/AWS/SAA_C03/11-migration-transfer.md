---
sidebar_position: 12
title: "11 — Migration & Transfer"
slug: 11-migration-transfer
---

# Migration & Transfer

These services help move workloads, data, and databases to AWS. Know which service to use for each migration scenario.

---

## Migration Strategies — The 7 Rs

| Strategy | What | When |
|----------|------|------|
| **Retire** | Decommission (turn off) | Application no longer needed |
| **Retain** | Keep as-is (don't migrate) | Not ready, too complex, recently upgraded |
| **Relocate** | Move to AWS without changes (VMware → VMware on AWS) | Lift-and-shift at hypervisor level |
| **Rehost** ("Lift and Shift") | Move as-is to EC2 | Quick migration, minimal changes |
| **Replatform** ("Lift, Tinker, and Shift") | Minor optimizations (e.g., RDS instead of self-managed DB) | Quick wins without re-architecting |
| **Repurchase** ("Drop and Shop") | Move to a SaaS product | Replace CRM with Salesforce, HR with Workday |
| **Refactor / Re-architect** | Redesign using cloud-native services | Maximize cloud benefits, serverless, microservices |

:::tip Exam pattern
"Migrate with minimal changes" → **Rehost**. "Migrate database to RDS but keep the app" → **Replatform**. "Redesign as microservices" → **Refactor**. "Move to SaaS" → **Repurchase**.
:::

---

## AWS Application Discovery Service

**Discover on-premises servers** to plan migration.

| Agent Type | How | Data Collected |
|-----------|-----|---------------|
| **Agentless Discovery (via Connector)** | VMware vCenter connector | VM inventory, performance data (CPU, RAM, disk, network) |
| **Agent-based Discovery** | Install agent on servers | Detailed: running processes, network connections, system performance |

- Data stored in **AWS Migration Hub**
- Use case: Understand current on-prem environment before migration planning

---

## AWS Migration Hub

**Central place to track migration** across multiple AWS migration tools.

| Feature | Detail |
|---------|--------|
| **Tracking** | Track progress of migrations from Application Discovery, DMS, Application Migration Service |
| **Orchestrator** | Automate and orchestrate multi-service migration workflows |
| **Strategy Recommendations** | ML-based recommendations for migration strategy (which R to use) |

---

## AWS Application Migration Service (MGN)

**Lift-and-shift (rehost)** migration for servers.

| Feature | Detail |
|---------|--------|
| **Replaces** | CloudEndure Migration and Server Migration Service (SMS) |
| **How** | Install replication agent on source servers → continuous block-level replication to AWS |
| **Source** | Physical servers, VMware, Hyper-V, Azure VMs, other clouds |
| **Target** | EC2 instances |
| **Cutover** | Test instances first → perform cutover (minutes of downtime) |
| **Use case** | Migrate servers to EC2 with minimal downtime |

```
On-Premises                    AWS
┌──────────┐                 ┌──────────────────┐
│ Source    │   Continuous    │ Staging Area      │
│ Servers  │────replication──▶│ (lightweight EC2) │
│ (agent)  │                 │                    │
└──────────┘                 │ Test instances     │
                             │ ──▶ Cutover ──▶   │
                             │ Production EC2     │
                             └──────────────────┘
```

:::tip Exam pattern
"Lift and shift servers to AWS" → **Application Migration Service (MGN)**. "Migrate VMs to EC2" → **MGN**.
:::

---

## AWS Database Migration Service (DMS)

**Migrate databases** to AWS with minimal downtime.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Replication Instance** | EC2 instance that runs migration tasks |
| **Source endpoint** | On-prem, EC2, or cloud database |
| **Target endpoint** | RDS, Aurora, DynamoDB, S3, Redshift, Kinesis, DocumentDB, Neptune, OpenSearch |
| **Continuous replication** | CDC (Change Data Capture) — ongoing sync after initial load |

### Migration Types

| Type | Flow | Tool Needed |
|------|------|------------|
| **Homogeneous** | Same engine → same engine (MySQL → RDS MySQL) | DMS only |
| **Heterogeneous** | Different engine → different engine (Oracle → Aurora PostgreSQL) | **SCT** (Schema Conversion Tool) + DMS |

### AWS Schema Conversion Tool (SCT)

- Converts database schema, views, stored procedures from one engine to another
- Converts data warehouse schemas (Teradata/Netezza → Redshift)
- Identifies conversion issues and suggests fixes
- **Not needed** for homogeneous migrations

### DMS Common Patterns

| Pattern | Detail |
|---------|--------|
| Oracle → Aurora PostgreSQL | SCT (convert schema) + DMS (migrate data + CDC) |
| MySQL → RDS MySQL | DMS only (homogeneous) |
| On-prem → S3 → Redshift | DMS to S3, then COPY to Redshift |
| MongoDB → DocumentDB | DMS (supports MongoDB as source) |
| On-prem → DynamoDB | DMS with custom table mapping |

### DMS + Snow Family

- For very large migrations over limited bandwidth:
  1. Use **DMS** to extract data to a **Snowball Edge** device
  2. Ship Snowball to AWS
  3. Load data from Snowball into S3
  4. Use DMS to load from S3 into target database

:::tip Exam pattern
"Migrate database with minimal downtime" → **DMS with CDC**. "Oracle to Aurora" → **SCT + DMS**. "Ongoing replication from on-prem to RDS" → **DMS with CDC**.
:::

---

## AWS Snow Family

Covered in depth in [Storage](./04-storage). Key migration points:

| Device | Capacity | Use Case |
|--------|----------|----------|
| **Snowcone** | 8–14 TB | Small edge, remote locations, limited space |
| **Snowball Edge Storage** | 80 TB | Large data migrations |
| **Snowball Edge Compute** | 42 TB + GPUs | Edge computing + migration |
| **Snowmobile** | 100 PB | Massive data center migrations |

**Decision:** If network transfer > 1 week → consider Snow devices.

---

## AWS DataSync

Covered in depth in [Storage](./04-storage). Key migration points:

| Feature | Detail |
|---------|--------|
| **Purpose** | Fast online data transfer (on-prem ↔ AWS, or AWS ↔ AWS) |
| **Speed** | Up to 10 Gbps, with automatic encryption |
| **Sources** | NFS, SMB, HDFS, S3-compatible, S3, EFS, FSx |
| **Destinations** | S3, EFS, FSx |
| **Scheduling** | Hourly, daily, weekly |
| **Use case** | Initial data migration, ongoing sync, replication between AWS storage |

---

## AWS Transfer Family

Covered in depth in [Storage](./04-storage). Key migration points:

- Managed **SFTP, FTPS, FTP, AS2** into/out of S3 or EFS
- Use case: Migrate file transfer workflows that use SFTP/FTP without changing client behavior

---

## Migration Decision Tree

```
What are you migrating?
│
├── Servers / VMs?
│   ├── Rehost (lift & shift) ──▶ Application Migration Service (MGN)
│   └── VMware-based ──▶ VMware Cloud on AWS (relocate)
│
├── Databases?
│   ├── Same engine ──▶ DMS (homogeneous)
│   └── Different engine ──▶ SCT + DMS (heterogeneous)
│
├── Large data (TB/PB)?
│   ├── Good network ──▶ DataSync or DMS
│   ├── Limited bandwidth ──▶ Snow Family
│   └── Exabytes ──▶ Snowmobile
│
├── Files / NFS / SMB?
│   ├── One-time or scheduled migration ──▶ DataSync
│   ├── Ongoing hybrid access ──▶ Storage Gateway
│   └── SFTP-based workflows ──▶ Transfer Family
│
└── Application discovery needed?
    └── Application Discovery Service → Migration Hub
```

---

## Machine Learning Services (Brief Overview)

These services appear in the in-scope list but are **lightly tested**. Know what each does.

| Service | Purpose |
|---------|---------|
| **Amazon SageMaker** | Build, train, and deploy ML models |
| **Amazon Rekognition** | Image and video analysis (faces, objects, text, content moderation) |
| **Amazon Comprehend** | NLP — sentiment analysis, entity recognition, language detection |
| **Amazon Lex** | Build conversational chatbots (powers Alexa) |
| **Amazon Polly** | Text-to-speech |
| **Amazon Transcribe** | Speech-to-text |
| **Amazon Translate** | Language translation |
| **Amazon Textract** | Extract text and data from scanned documents |
| **Amazon Forecast** | Time-series forecasting with ML |
| **Amazon Kendra** | Intelligent document search (enterprise search) |
| **Amazon Personalize** | Real-time personalization / recommendations |
| **Amazon Fraud Detector** | Detect online fraud |

:::tip Exam pattern
ML services rarely appear as the primary focus of a question. They're more likely distractors or part of "which service does X?" questions. Know the one-line purpose of each.
:::

---

## Other In-Scope Services (Brief)

### AWS Amplify
- Build and deploy **full-stack web and mobile applications**
- Frontend: hosting, CI/CD. Backend: authentication, API, storage, functions.
- Use case: Developers building web/mobile apps quickly

### Amazon Pinpoint
- **Marketing communication** service
- Email, SMS, push notifications, voice, in-app messaging
- Segmentation, campaigns, analytics
- Use case: Targeted marketing messages to users

### AWS Device Farm
- **Test mobile and web apps** on real devices in the cloud
- Automated testing on hundreds of device/OS combinations

### Amazon WorkSpaces

- **Managed virtual desktops** (Desktop as a Service — DaaS)
- Provision Windows or Linux desktops in the cloud
- Persistent storage, user profile, accessible from any device
- Integrates with on-prem AD via AWS Directory Service
- Use case: Remote workers needing secure access to corporate desktop environments, BYOD scenarios

### Amazon AppStream 2.0

- **Application streaming** — stream desktop applications to users' browsers
- Applications run on AWS, users interact via a web browser (no install needed)
- Use case: Deliver specific applications (CAD, design, analytics) without deploying full desktops
- Unlike WorkSpaces (full desktop), AppStream streams **individual applications**

:::tip Exam pattern
"Remote workers need virtual desktops" → **WorkSpaces**. "Stream specific applications to users' browsers" → **AppStream 2.0**. "BYOD access to corporate desktop" → **WorkSpaces**.
:::

### Amazon Elastic Transcoder
- **Transcode media files** (video/audio) in the cloud
- S3 source → pipeline → S3 destination (different formats/resolutions)
- Being replaced by **AWS Elemental MediaConvert** for new workloads

---

## Migration Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Lift and shift servers" | Application Migration Service (MGN) |
| "Migrate database, minimal downtime" | DMS (with CDC for ongoing replication) |
| "Oracle to Aurora PostgreSQL" | SCT + DMS |
| "MySQL to RDS MySQL" | DMS only (homogeneous) |
| "Move petabytes, limited bandwidth" | Snow Family (Snowball Edge) |
| "Move exabytes" | Snowmobile |
| "Migrate NFS data to S3/EFS" | DataSync |
| "Ongoing hybrid file access" | Storage Gateway |
| "SFTP file transfers to S3" | Transfer Family |
| "Discover on-prem servers" | Application Discovery Service |
| "Track migration progress" | Migration Hub |
| "Migrate VMware workloads" | VMware Cloud on AWS |
| "Image/video recognition" | Rekognition |
| "Chatbot" | Lex |
| "Text-to-speech" | Polly |
| "Document search" | Kendra |
| "Remote virtual desktops" | WorkSpaces |
| "Stream apps to browser" | AppStream 2.0 |
