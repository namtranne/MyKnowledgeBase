---
sidebar_position: 15
title: "14 — Exam Strategy"
slug: 14-exam-strategy
---

# Exam Strategy & Tips

Everything you need for exam day — study plan, question techniques, common traps, and the critical numbers to memorize.

---

## Study Plan

| Week | Focus | Activities |
|:----:|-------|-----------|
| 1–2 | **Core Services** | Read Chapters 1–6 (Infrastructure, IAM, Compute, Storage, Networking, Databases) |
| 3–4 | **Integration & Security** | Read Chapters 7–11 (Integration, Security, Monitoring, Analytics, Migration) |
| 5 | **Architecture Patterns** | Read Chapters 12–14 (HA/DR, Cost Optimization, Exam Strategy) |
| 6 | **Practice Exams (Round 1)** | Take 2-3 full practice exams (65 questions, timed 130 min). Identify weak areas. |
| 7 | **Review Weak Areas** | Re-read sections you scored low on. Deep-dive into service documentation. |
| 8 | **Practice Exams (Round 2)** | Take 2-3 more practice exams. Target **80%+** consistently before booking. |

### Recommended Resources

| Resource | Type | Notes |
|----------|------|-------|
| **AWS Skill Builder** | Official practice questions + training | Free tier available. Official practice exam. |
| **Tutorials Dojo (Jon Bonso)** | Practice exams | Highly regarded. Closest to real exam difficulty. |
| **WhizLabs** | Practice exams | Good quantity of questions. |
| **AWS Documentation** | Reference | Deep-dive into services you're weak on |
| **AWS Well-Architected Framework** | Whitepaper | Read the overview — exam is built on it |
| **AWS Free Tier** | Hands-on | Build a multi-tier VPC, deploy EC2+RDS+S3 |

### Hands-On Labs to Build

| Lab | Services Practiced |
|-----|-------------------|
| Multi-tier VPC with public/private subnets | VPC, subnets, IGW, NAT, route tables, SG, NACL |
| EC2 with Auto Scaling behind ALB | EC2, ASG, ALB, CloudWatch, target tracking |
| S3 static website with CloudFront | S3, CloudFront, Route 53, ACM |
| RDS with Multi-AZ and Read Replica | RDS, security groups, parameter groups |
| Serverless API | API Gateway, Lambda, DynamoDB |
| SQS → Lambda processing | SQS, Lambda, DLQ, IAM roles |
| Cross-Region S3 replication | S3 CRR, versioning, IAM roles |

---

## Question Approach

### Step-by-Step Method

1. **Read the LAST line first** — it tells you what they're actually asking:
   - "most cost-effective" → cheapest option that meets requirements
   - "least operational overhead" → managed/serverless service
   - "most secure" → most restrictive, encryption, least privilege
   - "highest availability" → multi-AZ, multi-Region
   - "best performance" → fastest, lowest latency
   - "minimum effort" → fewest changes, simplest solution

2. **Identify the constraints** in the question body:
   - Budget ("minimize cost")
   - Time ("within minutes")
   - Compliance ("data must stay in EU")
   - Technical ("must use MySQL")
   - Operational ("without managing servers")

3. **Eliminate obviously wrong answers** — usually 1-2 are clearly wrong

4. **Between remaining options**, apply the primary constraint from step 1

5. **When in doubt**, AWS prefers:
   - ✅ Managed services over self-managed
   - ✅ Serverless over servers
   - ✅ Multi-AZ over single-AZ
   - ✅ IAM roles over access keys
   - ✅ Encryption enabled over disabled
   - ✅ VPC endpoints over NAT for AWS services

### Key Words and What They Signal

| Question Phrase | Think About |
|----------------|-------------|
| "Highly available" | Multi-AZ, Auto Scaling, ELB |
| "Fault tolerant" | Multi-AZ, multi-Region, automated failover |
| "Durable" | S3 (11 nines), multi-AZ replication |
| "Decoupled" / "Loosely coupled" | SQS, SNS, EventBridge |
| "Serverless" | Lambda, Fargate, DynamoDB, S3, API Gateway |
| "Real-time" | Kinesis, DynamoDB Streams, ElastiCache |
| "Near-real-time" | Kinesis Firehose (60s buffer) |
| "Cost-effective" / "Minimize cost" | Spot, Reserved, lifecycle rules, right-sizing |
| "Least operational overhead" | Managed services, serverless |
| "Compliance" / "Regulatory" | KMS, CloudTrail, Config, Macie, specific Region |
| "Audit" | CloudTrail (API calls), Config (resource config) |
| "Encrypt" | KMS (at rest), ACM + TLS (in transit) |
| "Migrate" / "Move to AWS" | DMS, MGN, Snow Family, DataSync |
| "Single-digit millisecond" | DynamoDB |
| "Microsecond" | DAX, ElastiCache |
| "Static IP" | NLB (Elastic IP per AZ), Global Accelerator |
| "Ephemeral" / "Temporary storage" | EC2 Instance Store |
| "Virtual desktop" / "DaaS" | WorkSpaces |
| "Continuous DR replication" | Elastic Disaster Recovery (DRS) |

---

## Common Exam Traps

| Trap (Wrong Answer) | Correct Answer |
|---------------------|---------------|
| "Use a NAT instance" | **NAT Gateway** (managed, scalable, HA) |
| "Use Classic Load Balancer" | **ALB** or **NLB** (CLB is legacy) |
| "Store access keys on EC2 instance" | **IAM role with instance profile** |
| "Use S3 ACLs" | **Bucket policies** (ACLs are legacy) |
| "Single AZ for production" | **Multi-AZ** (always for production) |
| "Read replicas are synchronous" | Read replicas are **asynchronous**. Multi-AZ standby is synchronous. |
| "Use Glacier for frequently accessed data" | **S3 Standard** or **Standard-IA** |
| "Use CloudWatch for API audit" | **CloudTrail** (CloudWatch is for metrics/monitoring) |
| "Use public subnets for databases" | **Private subnets** (always for databases) |
| "Create IAM users for mobile app users" | **Cognito** (for application users) |
| "Scale up (vertical) for elasticity" | **Scale out (horizontal)** with Auto Scaling |
| "Use ElastiCache Memcached for persistence" | **Redis** (Memcached has no persistence) |
| "Use SNS for job processing queue" | **SQS** (SNS is pub/sub, SQS is queue) |
| "Copy EBS volume to another Region" | **Snapshot → copy snapshot to new Region → restore** |
| "RDS Multi-AZ for read scaling" | Multi-AZ is for **HA**, not read scaling. Use **Read Replicas**. |
| "Lambda for 30-minute processing" | **AWS Batch** or **ECS/Fargate** (Lambda max 15 min) |
| "SSE-KMS for maximum encryption control" | **CloudHSM** (for dedicated HSM control) |
| "Direct Connect for quick setup" | **VPN** (Direct Connect takes weeks/months) |
| "Instance Store data persists on stop" | Instance Store data is **lost** on stop/terminate. Only **EBS** persists. |
| "Use MGN for ongoing DR" | **DRS** for DR. MGN is for one-time migration. |

---

## Key Numbers to Memorize

### Compute

| Item | Value |
|------|-------|
| Lambda max timeout | **15 minutes** |
| Lambda max memory | **10,240 MB** |
| Lambda default concurrency | **1,000** per Region |
| Lambda /tmp storage | **10 GB** |
| Lambda deployment package (zip) | **50 MB** (250 MB unzipped) |
| Lambda container image | **10 GB** |
| EC2 Spot Instance interruption notice | **2 minutes** |
| ASG cooldown period | **300 seconds** (default) |
| Spread placement group limit | **7 instances per AZ** |
| EC2 Instance Store persistence | **Lost on stop/terminate** (survives reboot) |

### Storage

| Item | Value |
|------|-------|
| S3 object max size | **5 TB** |
| S3 single PUT limit | **5 GB** |
| S3 multipart upload threshold | **>100 MB** recommended |
| S3 durability | **99.999999999%** (11 nines) |
| S3 Standard availability | **99.99%** |
| S3 prefix performance | **3,500 PUT + 5,500 GET per second per prefix** |
| EBS gp3 baseline IOPS | **3,000** |
| EBS gp3 max IOPS | **16,000** |
| EBS io2 max IOPS | **64,000** (256,000 Block Express) |
| EBS max volume size | **64 TB** |
| EFS max file size | No limit (elastic) |

### Networking

| Item | Value |
|------|-------|
| VPC max CIDRs | **5** (expandable to 50) |
| VPC CIDR range | **/16** to **/28** |
| Reserved IPs per subnet | **5** (first 4 + last 1) |
| Security Group rules | **60 inbound + 60 outbound** (adjustable) |
| Security Groups per ENI | **5** (adjustable) |
| VPC Peering | **Non-transitive** |
| CloudFront edge locations | **400+** |
| Direct Connect setup time | **Weeks to months** |
| VPN max bandwidth | **1.25 Gbps per tunnel** |

### Database

| Item | Value |
|------|-------|
| RDS max read replicas | **5** (15 for Aurora) |
| Aurora storage auto-scale | **10 GB to 128 TB** |
| Aurora copies | **6 copies across 3 AZs** |
| Aurora failover | **< 30 seconds** |
| Aurora Global DB replication | **< 1 second** lag |
| DynamoDB item max size | **400 KB** |
| DynamoDB max GSIs per table | **20** (default) |
| DynamoDB max LSIs per table | **5** |
| ElastiCache Redis max nodes | **500** node groups (cluster mode) |
| RDS IAM auth token expiry | **15 minutes** |

### Messaging

| Item | Value |
|------|-------|
| SQS message max size | **256 KB** |
| SQS retention | **1 min to 14 days** (default 4 days) |
| SQS visibility timeout | **0 sec to 12 hours** (default 30 sec) |
| SQS long polling max | **20 seconds** |
| SQS delay queue max | **15 minutes** |
| SQS FIFO throughput | **300 msg/s** (3,000 with batching) |
| SNS message max size | **256 KB** |
| API Gateway default throttle | **10,000 req/s** (burst 5,000) |

### General

| Item | Value |
|------|-------|
| KMS direct encryption limit | **4 KB** (use envelope encryption for larger) |
| CloudTrail event delivery | **~15 minutes** |
| CloudWatch basic monitoring | **5-minute** intervals |
| CloudWatch detailed monitoring | **1-minute** intervals |
| Secrets Manager rotation | **Lambda-based**, auto for RDS/Redshift/DocumentDB |
| ACM CloudFront requirement | Certificate must be in **us-east-1** |
| RDS stop duration | Max **7 days** (auto-restarts) |
| EC2 hibernate max duration | **60 days** |

---

## Domain-Specific Quick References

### Domain 1: Secure Architectures (30%)

| Topic | Must Know |
|-------|----------|
| IAM | Policy evaluation (deny > allow > implicit deny), roles > keys, least privilege |
| Organizations | SCPs don't grant — they restrict. Management account is exempt. |
| Federation | IAM Identity Center (SSO) for workforce. Cognito for app users. |
| Encryption | KMS for managed keys. CloudHSM for dedicated hardware. ACM for certificates. |
| VPC Security | SG (stateful, allow only) vs NACL (stateless, allow + deny). Private subnets for databases. |
| Data Protection | S3 Object Lock (WORM). Glacier Vault Lock. Backup Vault Lock. Nitro Enclaves for sensitive processing. |
| DB Auth | RDS IAM Authentication (token-based, no passwords). |

### Domain 2: Resilient Architectures (26%)

| Topic | Must Know |
|-------|----------|
| Auto Scaling | Target tracking > step scaling. Cooldown period. Custom metrics (queue depth). |
| Load Balancing | ALB (L7, HTTP), NLB (L4, TCP/UDP, static IP), GWLB (L3, firewall). |
| Decoupling | SQS (queue), SNS (pub/sub), EventBridge (event routing). |
| Containers | ECS (AWS native), EKS (Kubernetes), Fargate (serverless). |
| DR | Know all 4 strategies and match to RPO/RTO + cost. DRS for continuous server DR. |
| Databases | Multi-AZ (HA, sync), Read Replicas (read scaling, async). |

### Domain 3: High-Performing Architectures (24%)

| Topic | Must Know |
|-------|----------|
| Compute | Right instance family. Lambda for event-driven. Batch for long-running. Instance Store for temp high-IOPS. |
| Storage | S3 (object), EBS (block), EFS (file), Instance Store (ephemeral). S3 Express One Zone for lowest latency. |
| Database | Aurora (best RDS), DynamoDB (NoSQL), ElastiCache/DAX (caching). |
| Networking | CloudFront (CDN), Global Accelerator (TCP/UDP), Direct Connect (dedicated). |
| Analytics | Athena (SQL on S3), Kinesis (streaming), Glue (ETL), Redshift (warehouse). |

### Domain 4: Cost-Optimized Architectures (20%)

| Topic | Must Know |
|-------|----------|
| EC2 pricing | On-Demand vs Reserved vs Spot vs Savings Plans. |
| Storage | S3 lifecycle, Intelligent-Tiering, Glacier tiers. |
| Networking | VPC Endpoints (free for S3/DynamoDB), CloudFront (cheaper data out). |
| Database | Aurora Serverless (variable), DynamoDB On-Demand (spiky). |
| Tools | Cost Explorer (analyze), Budgets (alert), Compute Optimizer (right-size). |

---

## Final Checklist Before the Exam

- [ ] Can you design a multi-tier VPC with public/private subnets, IGW, NAT, and VPC endpoints?
- [ ] Do you know the difference between Security Groups and NACLs?
- [ ] Can you explain IAM policy evaluation logic?
- [ ] Do you know when to use ALB vs NLB vs GWLB?
- [ ] Can you choose between S3 storage classes for any scenario?
- [ ] Do you understand RDS Multi-AZ vs Read Replicas?
- [ ] Can you design a serverless API (API Gateway + Lambda + DynamoDB)?
- [ ] Do you know all four DR strategies and their RPO/RTO/cost tradeoffs?
- [ ] Can you choose between SQS, SNS, and EventBridge?
- [ ] Do you know which EC2 purchasing option to use for each workload type?
- [ ] Can you identify cost optimization opportunities (endpoints, lifecycle, right-sizing)?
- [ ] Do you know the difference between Instance Store and EBS?
- [ ] Do you know when to use DRS vs MGN?
- [ ] Can you explain RDS IAM Authentication vs Secrets Manager for DB credentials?
- [ ] Do you know the key numbers above?
- [ ] Are you scoring **80%+** on practice exams?

---

## Exam Day Tips

1. **Time management:** 130 minutes for 65 questions ≈ 2 minutes per question. Flag hard ones and come back.
2. **Read carefully:** Look for words like "most," "least," "minimum," "maximum" — they change the answer.
3. **No penalty for guessing:** Answer every question. Never leave blanks.
4. **15 unscored questions:** You won't know which ones. Don't waste time trying to identify them.
5. **Two correct answers exist:** Often 2+ options work, but one is "better" (cheaper, simpler, more secure, more available).
6. **AWS preference:** When tied, choose managed over self-managed, serverless over servers, encryption over no encryption.

---

*"The exam doesn't test if you can run AWS services — it tests if you can design solutions using them. Think like an architect, not an operator."*

*Good luck on your SAA-C03! 🎯*
