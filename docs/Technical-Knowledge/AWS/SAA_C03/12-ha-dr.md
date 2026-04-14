---
sidebar_position: 13
title: "12 — High Availability & Disaster Recovery"
slug: 12-ha-dr
---

# High Availability & Disaster Recovery

Domain 2 (26%) heavily tests HA and DR patterns. You must match RPO/RTO requirements with the right architecture and budget.

---

## Key Concepts

### RPO and RTO

| Concept | Definition | Question |
|---------|-----------|----------|
| **RPO (Recovery Point Objective)** | Maximum acceptable data loss (measured in time) | "How much data can we afford to lose?" |
| **RTO (Recovery Time Objective)** | Maximum acceptable downtime after a failure | "How quickly must we recover?" |

```
    Data Loss        ◄── RPO ──►  ◄── RTO ──►      Application
    (unrecoverable)                                  back online
─────────────────────●────────────●─────────────────────▶
                   Disaster    Recovery
                   happens     complete
```

**Lower RPO/RTO = More expensive.** The exam tests your ability to choose the cheapest option that meets both requirements.

---

## High Availability Patterns

### Single-Region HA (Multi-AZ)

The **default HA pattern** — deploy across multiple AZs within one Region.

```
                    Region: us-east-1
┌────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────AZ-a──────────┐  ┌──────────AZ-b──────────┐
│  │                        │  │                         │
│  │  Web Server (EC2)      │  │  Web Server (EC2)       │
│  │  App Server (EC2)      │  │  App Server (EC2)       │
│  │  NAT Gateway           │  │  NAT Gateway            │
│  │  RDS Primary           │  │  RDS Standby (Multi-AZ) │
│  │                        │  │                         │
│  └────────────────────────┘  └─────────────────────────┘
│                                                 │
│  ┌─── Elastic Load Balancer (spans AZs) ───┐   │
│  │         Auto Scaling Group               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Multi-AZ services (automatic):**
- ELB (ALB, NLB) — spans AZs
- RDS Multi-AZ — synchronous standby, automatic failover
- Aurora — 6 copies across 3 AZs
- ElastiCache (Redis Multi-AZ) — automatic failover
- EFS — multi-AZ by default
- DynamoDB — replication across 3 AZs (built-in)
- NAT Gateway — HA within a single AZ (deploy per-AZ for full HA)

### Multi-Region HA

For the highest availability and disaster recovery:

```
             Route 53 (Failover / Latency routing)
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
    Region: us-east-1       Region: eu-west-1
    (Primary)               (Secondary/DR)
    ┌─────────────┐         ┌─────────────┐
    │ ALB         │         │ ALB         │
    │ ASG (EC2)   │         │ ASG (EC2)   │
    │ Aurora      │────CRR──│ Aurora      │
    │ (Writer)    │         │ (Reader)    │
    │ S3          │────CRR──│ S3          │
    └─────────────┘         └─────────────┘
```

---

## Disaster Recovery Strategies

### The Four DR Strategies (Ordered by Cost & Speed)

| Strategy | Description | RTO | RPO | Cost |
|----------|-------------|-----|-----|------|
| **Backup & Restore** | Regular backups to S3/Glacier. Restore from backups when disaster occurs. | **Hours** | Hours (depends on backup frequency) | $ (cheapest) |
| **Pilot Light** | Core systems always running in DR Region (database replicas). Scale up compute on failover. | **10–30 min** | Minutes (continuous replication) | $$ |
| **Warm Standby** | Scaled-down but **functional** copy of production in DR Region. Scale up on failover. | **Minutes** | Minutes | $$$ |
| **Multi-Site Active-Active** | Full production in **both Regions** simultaneously. Route 53 distributes traffic. | **Near-zero** (real-time failover) | Near-zero | $$$$ (most expensive) |

### Backup & Restore

```
Normal Operation:
  Production (us-east-1)
  │
  ├── EBS Snapshots ──▶ S3 (us-east-1 & cross-Region copy)
  ├── RDS Snapshots  ──▶ S3 (cross-Region copy)
  ├── S3 data        ──▶ S3 CRR to DR Region
  └── AMI copies     ──▶ DR Region

During Disaster:
  DR Region (eu-west-1)
  │
  ├── Restore EBS from snapshots
  ├── Restore RDS from snapshots
  ├── Launch EC2 from AMI copies
  └── Update Route 53 DNS
```

**Pros:** Cheapest. **Cons:** Longest RTO (hours), potential data loss.

### Pilot Light

```
Normal Operation:
  Production (us-east-1)         DR (eu-west-1) — Pilot Light
  ┌─────────────────┐            ┌─────────────────┐
  │ Full production  │            │ Database replica │ ← always running
  │ - ALB + ASG      │   ──CRR──▶│ (Aurora Global   │
  │ - App servers    │            │  or RDS cross-   │
  │ - Database       │            │  Region replica) │
  │ - Caches         │            │                  │
  └─────────────────┘            │ (No app servers) │
                                  └─────────────────┘

During Disaster:
  DR (eu-west-1) — Scale Up
  ┌─────────────────┐
  │ Promote DB       │
  │ Launch ALB + ASG │ ← rapid provisioning
  │ Scale to prod    │
  │ Update DNS       │
  └─────────────────┘
```

**Key:** Only the **critical core** (database) is always running. Everything else is provisioned on demand.

### Warm Standby

```
Normal Operation:
  Production (us-east-1)         DR (eu-west-1) — Warm Standby
  ┌─────────────────┐            ┌─────────────────┐
  │ Full production  │            │ Scaled-down copy │
  │ - ALB + ASG(10)  │   ──CRR──▶│ - ALB + ASG(1)   │
  │ - App servers    │            │ - App servers    │
  │ - Database       │            │ - Database       │
  │ - Caches         │            │   replica        │
  └─────────────────┘            └─────────────────┘

During Disaster:
  DR — Scale UP to full production capacity
  Route 53 failover routing ──▶ DR Region
```

**Key:** Everything is running but at **minimum capacity**. Just scale up on failover.

### Multi-Site Active-Active

```
Normal Operation:
  Route 53 (weighted/latency routing to BOTH)
           │
  ┌────────┴────────┐
  ▼                 ▼
  us-east-1         eu-west-1
  ┌──────────┐      ┌──────────┐
  │ Full prod │      │ Full prod │
  │ ALB+ASG   │      │ ALB+ASG   │
  │ Aurora    │◄────▶│ Aurora    │  (Global Database)
  │ DynamoDB  │◄────▶│ DynamoDB  │  (Global Tables)
  │ S3        │◄────▶│ S3        │  (CRR)
  └──────────┘      └──────────┘

During Disaster:
  Route 53 health check detects failure
  ──▶ Automatically routes ALL traffic to healthy Region
```

**Key:** Both Regions serve traffic simultaneously. RPO/RTO near zero.

:::tip Exam pattern
Questions provide RPO/RTO requirements + budget constraint. Match the **cheapest strategy** that meets both:
- "RTO of hours, minimize cost" → **Backup & Restore**
- "RTO < 30 minutes, database must be up-to-date" → **Pilot Light**
- "RTO of minutes" → **Warm Standby**
- "Near-zero downtime" → **Active-Active**
:::

---

## Key HA/DR Services

### Route 53 for DR

| Feature | DR Use |
|---------|--------|
| **Health Checks** | Monitor endpoint health → trigger failover |
| **Failover Routing** | Primary/secondary with automatic failover |
| **Latency Routing** | Route to the fastest Region (active-active) |
| **Weighted Routing** | Gradually shift traffic between Regions |

### Aurora for DR

| Feature | Detail |
|---------|--------|
| **Multi-AZ** | Built-in: 6 copies across 3 AZs, < 30s failover |
| **Cross-Region Read Replicas** | Promote to standalone in another Region |
| **Aurora Global Database** | < 1 second replication lag, promote in < 1 minute |

### DynamoDB for DR

| Feature | Detail |
|---------|--------|
| **Built-in** | Data replicated across 3 AZs automatically |
| **Global Tables** | Multi-Region, active-active with sub-second replication |
| **PITR** | Restore to any second in the last 35 days |
| **On-demand backup** | Full backup, no performance impact |

### S3 for DR

| Feature | Detail |
|---------|--------|
| **Built-in durability** | 11 nines across 3+ AZs |
| **Cross-Region Replication (CRR)** | Async replication to another Region |
| **Versioning** | Recover from accidental deletes |
| **Object Lock** | WORM protection |

### AWS Backup for DR

- Cross-Region backup copies
- Cross-account backup copies
- Vault Lock for compliance
- Centralized backup for EBS, RDS, DynamoDB, EFS, FSx, S3

### AWS Elastic Disaster Recovery (DRS)

**Purpose-built DR service** — continuous block-level replication of servers to AWS for rapid recovery.

| Feature | Detail |
|---------|--------|
| **Replaces** | CloudEndure Disaster Recovery |
| **How** | Install replication agent on source servers → continuous block-level replication to staging area in AWS |
| **RPO** | **Sub-second** (continuous replication) |
| **RTO** | **Minutes** (launch recovery instances from replicated data) |
| **Sources** | Physical servers, VMware, Hyper-V, Azure VMs, other clouds, EC2 instances |
| **Recovery** | Launch recovery instances in AWS at any point-in-time |
| **Testing** | Non-disruptive DR drills without impacting source servers |
| **Failback** | Replicate back to the original site when it recovers |

```
On-Premises / Other Cloud              AWS
┌──────────────┐                  ┌──────────────────────┐
│ Source        │   Continuous     │ Staging Area          │
│ Servers      │───replication───▶│ (lightweight, low     │
│ (DRS agent)  │   (sub-second)  │  cost instances)      │
└──────────────┘                  │                       │
                                  │ During Disaster:      │
                                  │ Launch full recovery  │
                                  │ instances (minutes)   │
                                  └──────────────────────┘
```

**DRS vs MGN (Application Migration Service):**

| Feature | DRS | MGN |
|---------|-----|-----|
| **Purpose** | **Ongoing disaster recovery** | **One-time migration** |
| **Lifecycle** | Continuous — replication runs indefinitely | Migrate and done — agent removed after cutover |
| **Failback** | Yes — replicate back to original site | No — one-directional migration |
| **Use case** | Keep DR ready for on-prem or cloud servers | Move servers to AWS permanently |

:::tip Exam pattern
"Continuous DR for on-prem servers with sub-second RPO" → **AWS Elastic Disaster Recovery (DRS)**. "DR with minutes RTO, continuous replication" → **DRS**. "Migrate servers permanently" → **MGN** (not DRS).
:::

---

## Immutable Infrastructure

**Don't patch — replace.** Instead of updating servers in-place, deploy new ones from a known-good image.

| Pattern | How |
|---------|-----|
| **Golden AMI** | Pre-bake all software into an AMI. Launch new instances from AMI. |
| **Blue/Green deployment** | Run new environment alongside old. Switch traffic. Roll back if issues. |
| **Immutable Beanstalk** | Deploy to a new ASG. Swap when healthy. Terminate old ASG. |
| **Infrastructure as Code** | CloudFormation/Terraform. Destroy and recreate environments identically. |
| **Containers** | New image for every release. Roll out new containers, stop old ones. |

**Benefits:** Consistency, no configuration drift, easy rollback, predictable.

---

## Automation for HA

### Auto Scaling

- Automatically replace unhealthy instances
- Scale based on demand (CloudWatch metrics)
- Maintain desired capacity

### CloudWatch + Alarms + Actions

- Detect failures → trigger Auto Scaling, SNS, Lambda
- EC2 instance recovery alarm
- Composite alarms for complex conditions

### EventBridge + Lambda

- React to events (state changes, failures) → trigger automated remediation
- Example: EC2 stopped unexpectedly → Lambda starts a new instance

### AWS CloudFormation

- Recreate entire environments from templates
- StackSets for multi-account/multi-Region deployment
- DeletionPolicy: Retain/Snapshot to protect critical resources

---

## Service Quotas & Throttling

| Concept | Detail |
|---------|--------|
| **Service Quotas** | Per-account limits on AWS resources (e.g., max VPCs, max EC2 instances) |
| **Soft limits** | Can be increased by request |
| **Hard limits** | Cannot be changed |
| **Throttling** | API rate limits — too many requests → HTTP 429 / throttling error |
| **DR consideration** | DR Region may have **default quotas** — request increases before disaster |

:::warning
**Exam trap:** Your DR Region must have sufficient service quotas to handle production load. Request quota increases in the standby Region **proactively**.
:::

---

## HA/DR Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Highly available" | Multi-AZ deployment |
| "Survive Region failure" | Multi-Region (DR strategy) |
| "RTO hours, cheapest" | Backup & Restore |
| "RTO < 30 min, only DB running" | Pilot Light |
| "RTO minutes, scaled-down copy running" | Warm Standby |
| "Near-zero RTO/RPO" | Multi-Site Active-Active |
| "Auto failover for database" | RDS Multi-AZ or Aurora |
| "Cross-Region database DR" | Aurora Global Database |
| "Multi-Region active-active NoSQL" | DynamoDB Global Tables |
| "Cross-Region S3 data" | S3 CRR |
| "Automatic DNS failover" | Route 53 Failover routing + health checks |
| "Centralized backup across services" | AWS Backup |
| "Prevent accidental data deletion" | S3 Versioning + Object Lock, Backup Vault Lock |
| "Don't patch, replace" | Immutable infrastructure (Golden AMI, Blue/Green) |
| "Continuous DR for on-prem servers" | AWS Elastic Disaster Recovery (DRS) |
| "Ensure DR Region has capacity" | Pre-provision service quotas in DR Region |
