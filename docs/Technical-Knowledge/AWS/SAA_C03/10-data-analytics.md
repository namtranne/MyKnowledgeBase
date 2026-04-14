---
sidebar_position: 11
title: "10 — Data Analytics"
slug: 10-data-analytics
---

# Data Analytics & Ingestion

Domain 3 (Task 3.5) covers data ingestion, transformation, and analytics. Know the purpose of each service and when to use it.

---

## Data Analytics Architecture Overview

```
Data Sources              Ingestion              Storage/Processing       Analytics/Visualization
┌─────────────┐     ┌──────────────────┐     ┌───────────────────────┐   ┌────────────────────┐
│ IoT devices │────▶│ Kinesis Data     │────▶│ S3 (Data Lake)        │──▶│ Amazon Athena      │
│ Clickstream │     │ Streams/Firehose │     │                       │   │ (SQL on S3)        │
│ Logs        │     │                  │     │ Redshift              │──▶│ Amazon QuickSight  │
│ Databases   │────▶│ AWS Glue         │────▶│ (Data Warehouse)      │   │ (BI Dashboards)    │
│ SaaS apps   │     │ (ETL)            │     │                       │   │                    │
│ Files       │────▶│ AWS DataSync     │     │ OpenSearch            │──▶│ Kibana/OpenSearch   │
│             │     │ AWS DMS          │     │ (Search & Analytics)  │   │ Dashboards         │
└─────────────┘     └──────────────────┘     └───────────────────────┘   └────────────────────┘
```

---

## Amazon Kinesis

**Real-time streaming data** platform. Four services under the Kinesis umbrella.

### Kinesis Data Streams

| Feature | Detail |
|---------|--------|
| **Purpose** | Ingest and process real-time streaming data |
| **Model** | Producers → Shards → Consumers |
| **Retention** | 24 hours (default) to **365 days** |
| **Consumers** | Lambda, Kinesis Data Analytics, Kinesis Client Library (KCL), custom apps |
| **Ordering** | Per-shard ordering (partition key determines shard) |
| **Capacity** | Provisioned mode (per shard) or On-Demand mode |
| **Replay** | Yes — consumers can re-read data |

**Shard capacity (Provisioned):**
- **Write:** 1 MB/s or 1,000 records/s per shard
- **Read:** 2 MB/s per shard (shared or enhanced fan-out)

**Enhanced fan-out:** Each consumer gets 2 MB/s per shard (dedicated, push-based). Use when you have multiple consumers.

### Kinesis Data Firehose

| Feature | Detail |
|---------|--------|
| **Purpose** | **Load streaming data** into destinations — no code, fully managed |
| **Sources** | Kinesis Data Streams, direct producers, CloudWatch Logs, IoT, etc. |
| **Destinations** | S3, Redshift (via S3 COPY), OpenSearch, Splunk, HTTP endpoints, 3rd-party (Datadog, New Relic, MongoDB) |
| **Transformation** | Optional Lambda function for data transformation |
| **Batching** | Near-real-time (60-second buffer minimum or 1 MB min) |
| **Replay** | **No** — data is delivered once, no retention |
| **Compression** | GZIP, Snappy, Zip (for S3 delivery) |
| **Format conversion** | JSON → Parquet/ORC (for S3) |

### Kinesis Data Streams vs Firehose

| Feature | Data Streams | Data Firehose |
|---------|-------------|---------------|
| **Processing** | Custom consumers (you write code or use Lambda) | Fully managed delivery |
| **Latency** | Real-time (~200ms) | Near-real-time (60s+ buffer) |
| **Replay** | Yes | No |
| **Scaling** | Manage shards or on-demand | Auto-scales |
| **Destinations** | Anything (custom code) | S3, Redshift, OpenSearch, HTTP, 3rd party |
| **Data retention** | 24h–365 days | No storage (delivers immediately) |
| **Use case** | Custom real-time processing, complex consumers | Simple data delivery to storage/analytics |

### Kinesis Data Analytics

- **Real-time analytics** on streaming data using **SQL** or **Apache Flink**
- Sources: Kinesis Data Streams, Kinesis Data Firehose
- Destinations: Kinesis Data Streams, Kinesis Data Firehose, Lambda
- Use case: Real-time dashboards, anomaly detection, time-series analytics

### Kinesis Video Streams

- Capture, process, and store **video streams** from devices
- Use case: Security cameras, smart home, industrial monitoring
- Integrates with Rekognition Video for real-time analysis

:::tip Exam pattern
"Real-time data streaming with replay" → **Kinesis Data Streams**. "Load streaming data into S3/Redshift" → **Kinesis Data Firehose**. "Real-time SQL on streams" → **Kinesis Data Analytics**. "Analyze video streams" → **Kinesis Video Streams**.
:::

---

## Amazon Athena

**Serverless SQL query engine** for data in S3.

| Feature | Detail |
|---------|--------|
| **Purpose** | Query data directly in S3 using standard SQL |
| **Engine** | Built on Presto/Trino |
| **Serverless** | No infrastructure to manage |
| **Cost** | $5 per TB of data scanned |
| **Formats** | CSV, JSON, Parquet, ORC, Avro, and more |
| **Integration** | Glue Data Catalog for schema management |
| **Federated query** | Query data in RDS, DynamoDB, Redshift, and other sources via Lambda connectors |

### Performance Optimization

| Technique | How It Helps |
|-----------|-------------|
| **Columnar formats** (Parquet, ORC) | Dramatically reduces data scanned (and cost) |
| **Partitioning** | Organize data by columns (e.g., `year=2024/month=01/`) → skip irrelevant partitions |
| **Compression** | Smaller files = less data scanned (GZIP, Snappy, LZ4) |
| **Larger files** | Avoid many small files — consolidate to 128 MB+ per file |
| **Bucketing** | Hash-based grouping within partitions |

:::tip Exam pattern
"Serverless SQL query on S3 data" → **Athena**. "Reduce Athena query cost" → use **Parquet/ORC** columnar format + **partitioning**. "Ad-hoc analysis of CloudTrail logs" → **Athena** (CloudTrail logs stored in S3).
:::

---

## AWS Glue

**Serverless ETL (Extract, Transform, Load)** service.

### Key Components

| Component | Purpose |
|-----------|---------|
| **Glue Data Catalog** | Central metadata repository — stores table definitions, schema, and location of data |
| **Glue Crawlers** | Automatically discover data schema and populate the Data Catalog |
| **Glue ETL Jobs** | Transform and move data between data stores (PySpark or Scala) |
| **Glue Studio** | Visual ETL job editor (drag-and-drop) |
| **Glue DataBrew** | No-code visual data preparation (clean, normalize) |

### Glue Data Catalog

```
                    Glue Data Catalog
                    (Central Schema Store)
                           │
           ┌───────────────┼───────────────┐
           │               │               │
        Athena          Redshift        EMR
        (query S3)   Spectrum (query S3)  (process S3)
```

- **Single source of truth** for data schema
- Used by Athena, Redshift Spectrum, EMR, and Glue ETL
- Populated by **Crawlers** or manually defined

### Common Glue Patterns

| Pattern | Flow |
|---------|------|
| S3 → clean/transform → S3 | Glue Crawler → Glue ETL → S3 (Parquet) |
| RDS → S3 for analytics | Glue ETL (JDBC connection) → S3 |
| Format conversion | CSV → Parquet (Glue ETL or Firehose) |

:::tip Exam pattern
"Convert CSV to Parquet" → **Glue ETL** or **Kinesis Firehose** (built-in format conversion). "Central metadata catalog for S3 data" → **Glue Data Catalog**. "Discover schema automatically" → **Glue Crawlers**.
:::

---

## AWS Lake Formation

**Build, secure, and manage data lakes** on top of S3.

| Feature | Detail |
|---------|--------|
| **Purpose** | Simplify data lake creation — days instead of months |
| **Built on** | Glue Data Catalog + S3 + IAM |
| **Key feature** | **Fine-grained access control** — column-level and row-level security |
| **Data sources** | S3, RDS, on-prem databases (via Glue JDBC) |
| **Consumers** | Athena, Redshift Spectrum, EMR |
| **Cross-account** | Centrally manage permissions for shared data lake |

### Lake Formation vs Glue

- **Glue:** ETL + Data Catalog (metadata)
- **Lake Formation:** Everything Glue does PLUS fine-grained security, data lake management, blueprints

:::tip Exam pattern
"Build a data lake with fine-grained access control" → **Lake Formation**. "Column-level security on S3 data" → **Lake Formation**.
:::

---

## Amazon EMR (Elastic MapReduce)

**Managed big data platform** for processing massive amounts of data using open-source tools.

| Feature | Detail |
|---------|--------|
| **Frameworks** | Apache Spark, Hadoop, Hive, HBase, Presto, Flink |
| **Deployment** | EC2 cluster, EKS, or Serverless |
| **Storage** | EMRFS (S3), HDFS (local EBS), or both |
| **Scaling** | Manual, auto-scaling, or EMR Serverless (fully managed) |
| **Use case** | Large-scale data processing, ML training, log analysis, ETL |

**EMR Node Types:**
- **Master node:** Manages the cluster (always required)
- **Core nodes:** Run tasks AND store data (HDFS)
- **Task nodes:** Run tasks only (no data — can use Spot Instances safely)

:::tip Exam pattern
"Big data processing with Spark/Hadoop" → **EMR**. "Process petabytes of data" → **EMR** (or Redshift for SQL analytics). "EMR cost optimization" → Use **Spot Instances for task nodes**.
:::

---

## Amazon Redshift

Covered in depth in [Databases](./06-databases). Key analytics points:

- **OLAP data warehouse** — columnar, SQL-based, petabyte-scale
- **Redshift Spectrum:** Query S3 data without loading into Redshift
- **Redshift Serverless:** No cluster management
- **Concurrency Scaling:** Auto-adds capacity for concurrent queries
- **Integration:** S3 COPY, Glue ETL, Kinesis Firehose, DMS

---

## Amazon OpenSearch Service (formerly Elasticsearch)

| Feature | Detail |
|---------|--------|
| **Purpose** | Search, analyze, and visualize data in near-real-time |
| **Engine** | OpenSearch (fork of Elasticsearch) + OpenSearch Dashboards (Kibana) |
| **Deployment** | Managed cluster (instances) or Serverless |
| **Use case** | Full-text search, log analytics, application monitoring, clickstream |
| **Integration** | Kinesis Data Firehose, CloudWatch Logs, S3, DynamoDB Streams |
| **Patterns** | DynamoDB → DynamoDB Streams → Lambda → OpenSearch (for search on DynamoDB data) |

:::tip Exam pattern
"Full-text search" → **OpenSearch**. "Log analytics dashboard" → **OpenSearch + OpenSearch Dashboards**. "Search capability on DynamoDB data" → **DynamoDB Streams → Lambda → OpenSearch**.
:::

---

## Amazon QuickSight

**Serverless BI (Business Intelligence)** visualization service.

| Feature | Detail |
|---------|--------|
| **Purpose** | Create interactive dashboards and visualizations |
| **Data sources** | S3, Athena, Redshift, RDS, Aurora, OpenSearch, Timestream, on-prem databases |
| **SPICE engine** | In-memory computation engine for fast performance |
| **Sharing** | Publish dashboards, embed in applications |
| **ML insights** | Anomaly detection, forecasting, auto-narratives |
| **Row-level security** | Control which rows each user can see |
| **Use case** | Business dashboards, ad-hoc analytics, embedded analytics |

:::tip Exam pattern
"Business intelligence dashboard" → **QuickSight**. "Visualize data from S3/Redshift" → **QuickSight**.
:::

---

## Amazon Managed Streaming for Apache Kafka (MSK)

| Feature | Detail |
|---------|--------|
| **Purpose** | Fully managed **Apache Kafka** |
| **Deployment** | MSK cluster (EC2-based) or **MSK Serverless** |
| **Consumers** | Kinesis Data Analytics (Flink), Lambda, custom consumers (Kafka consumers) |
| **Storage** | EBS volumes (configurable retention) |
| **Use case** | Migrate existing Kafka workloads to AWS, real-time streaming |

### MSK vs Kinesis

| Feature | MSK | Kinesis Data Streams |
|---------|-----|---------------------|
| **Protocol** | Apache Kafka | AWS proprietary |
| **Message size** | 1 MB default (configurable to 10 MB) | 1 MB max |
| **Retention** | Configurable (unlimited with tiered storage) | 24h–365 days |
| **Consumer model** | Pull (Kafka consumer groups) | Pull (KCL) or push (enhanced fan-out) |
| **Use case** | Existing Kafka workloads, Kafka ecosystem tools | AWS-native streaming, simpler |

:::tip Exam pattern
"Migrate on-prem Kafka to AWS" → **MSK**. "New streaming application, AWS-native" → **Kinesis**.
:::

---

## Other Analytics Services

### AWS Data Pipeline

- **Orchestrate data movement** between AWS services (S3, RDS, DynamoDB, Redshift, EMR)
- Schedule-based, with dependency management and retry logic
- Older service — for new workloads, use Glue or Step Functions instead

### AWS Data Exchange

- **Find, subscribe to, and use third-party data** in AWS
- Data providers publish datasets → subscribers access via S3, Redshift, API
- Use case: Weather data, financial data, healthcare data from third parties

---

## Data Analytics Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Real-time streaming with replay" | Kinesis Data Streams |
| "Load streaming data into S3/Redshift" | Kinesis Data Firehose |
| "Real-time SQL on streams" | Kinesis Data Analytics |
| "Serverless SQL query on S3" | Athena |
| "Reduce Athena query cost" | Columnar format (Parquet/ORC) + partitioning |
| "Central metadata catalog" | Glue Data Catalog |
| "ETL jobs (serverless)" | Glue ETL |
| "Convert CSV to Parquet" | Glue ETL or Firehose |
| "Build data lake with security" | Lake Formation |
| "Big data with Spark/Hadoop" | EMR |
| "Data warehouse (SQL OLAP)" | Redshift |
| "Query S3 from Redshift" | Redshift Spectrum |
| "Full-text search" | OpenSearch |
| "BI dashboards" | QuickSight |
| "Migrate Kafka to AWS" | MSK |
| "Subscribe to third-party data" | Data Exchange |
| "Video stream analysis" | Kinesis Video Streams + Rekognition |
