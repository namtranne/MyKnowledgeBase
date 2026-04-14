---
sidebar_position: 1
title: "Exam Overview"
---

# AWS Solutions Architect Associate (SAA-C03) — Exam Overview

*Your comprehensive study hub. Each chapter below covers a major topic area and maps directly to the four exam domains. Read in order — each section builds on the previous one.*

---

## About the Exam

| Detail | Info |
|--------|------|
| **Exam code** | SAA-C03 |
| **Duration** | 130 minutes |
| **Questions** | 65 (50 scored + 15 unscored pilot questions) |
| **Question types** | Multiple choice (1 correct) and multiple response (2+ correct out of 5+) |
| **Passing score** | 720 / 1,000 (scaled) |
| **Cost** | $150 USD |
| **Validity** | 3 years |
| **Prerequisite** | None (1+ year hands-on experience recommended) |

:::tip Scoring
The exam uses a **compensatory scoring model** — you don't need to pass each domain individually. A strong score in one domain can compensate for a weaker score in another. However, all four domains are tested.
:::

---

## Exam Domains & Weights

| Domain | Weight | Primary Focus |
|--------|--------|---------------|
| **1. Design Secure Architectures** | **30%** | IAM, encryption, VPC security, Organizations, compliance |
| **2. Design Resilient Architectures** | **26%** | Multi-AZ, Auto Scaling, DR strategies, decoupling, containers |
| **3. Design High-Performing Architectures** | **24%** | Compute, storage, databases, caching, CDN, data analytics |
| **4. Design Cost-Optimized Architectures** | **20%** | Pricing models, right-sizing, storage tiers, network costs |

:::info Key Insight
Domain 1 (Security) is the **heaviest** — nearly one-third of the exam. If you master IAM, encryption, and VPC security, you're already in a very strong position.
:::

---

## Study Guide Chapters

Read these in order for a connected learning journey:

### Foundation
| # | Chapter | Key Topics |
|---|---------|------------|
| 1 | [Global Infrastructure](./01-global-infrastructure.md) | Regions, AZs, Edge Locations, Local Zones, Wavelength |
| 2 | [IAM & Secure Access](./02-iam-security.md) | IAM users/roles/policies, Organizations, SCPs, SSO, STS, federation |

### Core Services
| # | Chapter | Key Topics |
|---|---------|------------|
| 3 | [Compute](./03-compute.md) | EC2, Auto Scaling, ELB, Lambda, ECS/EKS, Fargate, Beanstalk, Batch |
| 4 | [Storage](./04-storage.md) | S3, EBS, EFS, FSx, Storage Gateway, Snow Family, Backup |
| 5 | [Networking](./05-networking.md) | VPC, Security Groups, NACLs, Route 53, CloudFront, Direct Connect, VPN |
| 6 | [Databases](./06-databases.md) | RDS, Aurora, DynamoDB, ElastiCache, Redshift, specialty databases |

### Integration & Security
| # | Chapter | Key Topics |
|---|---------|------------|
| 7 | [Application Integration](./07-application-integration.md) | SQS, SNS, EventBridge, Step Functions, API Gateway, AppSync, MQ |
| 8 | [Security Services](./08-security-services.md) | KMS, WAF, Shield, GuardDuty, Macie, Cognito, Secrets Manager, ACM |
| 9 | [Monitoring & Governance](./09-monitoring-governance.md) | CloudWatch, CloudTrail, Config, SSM, Control Tower, CloudFormation |

### Specialized Topics
| # | Chapter | Key Topics |
|---|---------|------------|
| 10 | [Data Analytics](./10-data-analytics.md) | Kinesis, Athena, Glue, EMR, Redshift, QuickSight, Lake Formation |
| 11 | [Migration & Transfer](./11-migration-transfer.md) | DMS, Snow Family, DataSync, Application Migration, Transfer Family |

### Architecture Patterns
| # | Chapter | Key Topics |
|---|---------|------------|
| 12 | [High Availability & DR](./12-ha-dr.md) | Multi-AZ/Region, DR strategies (RPO/RTO), immutable infrastructure |
| 13 | [Cost Optimization](./13-cost-optimization.md) | Pricing, right-sizing, storage tiers, network costs, cost tools |
| 14 | [Exam Strategy](./14-exam-strategy.md) | Study plan, question techniques, common traps, key numbers |

---

## AWS Shared Responsibility Model

This is a **foundational concept** tested throughout the exam:

```
┌─────────────────────────────────────────────────────────┐
│                    CUSTOMER                              │
│  "Security IN the Cloud"                                 │
│                                                          │
│  • Customer data                                         │
│  • Platform, applications, IAM                           │
│  • Operating system, network, firewall configuration     │
│  • Client-side encryption & data integrity               │
│  • Server-side encryption (file system &/or data)        │
│  • Network traffic protection (encryption, integrity)    │
├─────────────────────────────────────────────────────────┤
│                      AWS                                 │
│  "Security OF the Cloud"                                 │
│                                                          │
│  • Hardware / AWS Global Infrastructure                  │
│  • Regions, Availability Zones, Edge Locations           │
│  • Compute, Storage, Database, Networking (hardware)     │
│  • Managed services infrastructure (patching, HA)        │
│  • Software: Virtualization layer                        │
└─────────────────────────────────────────────────────────┘
```

**Key exam distinction:**
- **IaaS** (EC2): Customer manages OS, patches, firewall → customer responsible
- **Managed services** (RDS): AWS manages OS/patches → customer manages data, access, encryption
- **Serverless** (Lambda, S3): AWS manages almost everything → customer manages code/data and access policies

---

## AWS Well-Architected Framework

The exam is built around the **six pillars** of the Well-Architected Framework:

| Pillar | Key Principle | Exam Focus |
|--------|--------------|------------|
| **Operational Excellence** | Automate, monitor, improve | CloudFormation, CloudWatch, SSM |
| **Security** | Least privilege, defense in depth | IAM, encryption, VPC, WAF |
| **Reliability** | Recover from failure, scale | Multi-AZ, Auto Scaling, DR |
| **Performance Efficiency** | Right resources for the job | Instance types, caching, CDN |
| **Cost Optimization** | Eliminate waste, maximize value | Reserved, Spot, right-sizing |
| **Sustainability** | Minimize environmental impact | Efficient resources, managed services |

:::tip Exam Approach
Every exam question is a scenario: *"A company needs X, what should you recommend?"* You're choosing between 4 options, and often 2-3 technically work — pick the one that **best fits the stated constraints** (cost, performance, security, operational complexity).
:::

---

## How to Use This Guide

1. **Read chapters 1-6** for core service knowledge (weeks 1-2)
2. **Read chapters 7-11** for integration, security, and specialized services (weeks 3-4)
3. **Read chapters 12-14** for architecture patterns and exam strategy (week 5)
4. **Take practice exams** and revisit weak areas (weeks 6-8)
5. **Book the exam** when consistently scoring 80%+ on practice tests
