---
sidebar_position: 2
title: "01 — Global Infrastructure"
slug: 01-global-infrastructure
---

# AWS Global Infrastructure

Before learning any service, you must understand **where** things run. AWS's global infrastructure is the physical foundation for everything else.

---

## Regions

A **Region** is a geographic area containing multiple isolated data center clusters. Examples: `us-east-1` (N. Virginia), `eu-west-1` (Ireland), `ap-southeast-1` (Singapore).

### How to choose a Region

| Factor | Consideration |
|--------|--------------|
| **Compliance / Data sovereignty** | Some regulations require data to stay in a specific country (e.g., GDPR → EU Region, data residency laws) |
| **Latency** | Pick the Region closest to your end users |
| **Service availability** | Not all services launch in all Regions simultaneously — check the [AWS Regional Services List](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) |
| **Cost** | Pricing varies by Region. `us-east-1` is typically the cheapest |

:::tip Exam pattern
When a question mentions **"data must remain in a specific country"** or **"regulatory requirements,"** the answer involves choosing the correct Region and possibly using SCPs to restrict other Regions.
:::

---

## Availability Zones (AZs)

Each Region has **2–6 Availability Zones** (most have 3). An AZ is one or more discrete data centers with:

- **Redundant power, networking, and connectivity**
- **Physical separation** — AZs are kilometers apart within a Region
- **High-bandwidth, low-latency private fiber** connecting AZs in the same Region
- **Independent failure domains** — a fire, flood, or power failure in one AZ shouldn't affect another

```
Region: us-east-1 (N. Virginia)
├── AZ: us-east-1a (Data centers cluster A)
├── AZ: us-east-1b (Data centers cluster B)
├── AZ: us-east-1c (Data centers cluster C)
├── AZ: us-east-1d (Data centers cluster D)
├── AZ: us-east-1e (Data centers cluster E)
└── AZ: us-east-1f (Data centers cluster F)
    All connected via redundant, low-latency private fiber
```

### AZ naming vs physical mapping

AWS **randomizes** AZ names across accounts. Your `us-east-1a` might be a different physical AZ than another account's `us-east-1a`. Use **AZ IDs** (e.g., `use1-az1`) for coordination between accounts.

:::tip Exam pattern
**"Highly available"** almost always means **"deploy across multiple AZs."** Any architecture question asking for HA that uses a single AZ is wrong.
:::

---

## Edge Locations

**Edge Locations** are points of presence (PoPs) used by:

- **Amazon CloudFront** — CDN: caches content close to end users
- **Amazon Route 53** — DNS: resolves domain names at the edge
- **AWS WAF** — Filters malicious web traffic at the edge
- **AWS Shield** — DDoS protection at the edge
- **Lambda@Edge / CloudFront Functions** — Run code at edge locations

There are **400+ edge locations** and **13+ Regional Edge Caches** worldwide — far more locations than Regions.

**Regional Edge Caches** sit between edge locations and the origin. They have larger caches and reduce the number of requests hitting your origin server.

```
User → Edge Location (cache hit?) → Regional Edge Cache (cache hit?) → Origin (S3/ALB/EC2)
```

---

## Local Zones

**Local Zones** are extensions of a Region placed in large population centers. They bring select AWS services (compute, storage, database, networking) closer to end users for **single-digit millisecond latency**.

- Example: `us-east-1-atl-2a` (Atlanta Local Zone of us-east-1)
- Use case: Real-time gaming, media content creation, live video streaming, AR/VR
- Services available: EC2, EBS, ELB, VPC subnets, and more
- The Local Zone subnet is part of your VPC in the parent Region

:::note Exam frequency
Local Zones rarely appear on the exam, but know they exist for **"lowest possible latency to users in a specific city"** scenarios.
:::

---

## Wavelength Zones

**Wavelength Zones** are AWS infrastructure embedded in **5G telecom provider networks** (Verizon, Vodafone, etc.).

- **Ultra-low latency** for mobile devices connected via 5G
- Use case: Connected vehicles, interactive live video, AR/VR, real-time gaming on mobile
- Traffic stays within the telecom network — doesn't traverse the public internet

:::note Exam frequency
Very rare on the exam. Know it exists for **"ultra-low latency for mobile/5G applications."**
:::

---

## AWS Outposts

**AWS Outposts** brings AWS infrastructure, services, APIs, and tools **on-premises** in your own data center.

- Fully managed by AWS (they install, maintain, and update)
- Runs native AWS services locally: EC2, EBS, S3, RDS, ECS, EKS, etc.
- Connected back to the nearest AWS Region
- Use case: Low-latency local processing, data residency requirements, local data processing before sending to cloud

| Feature | Outposts | Local Zone | Wavelength |
|---------|----------|------------|------------|
| **Location** | Your data center | AWS-managed in a city | Telecom 5G network |
| **Managed by** | AWS (on your premises) | AWS | AWS + Telecom |
| **Use case** | Hybrid, data residency | City-level low latency | 5G mobile ultra-low latency |
| **Connectivity** | Dedicated to parent Region | Part of parent Region VPC | Carrier gateway to Region |

---

## Global vs Regional vs AZ-Scoped Services

Understanding service scope is critical for the exam:

| Scope | Services | Meaning |
|-------|----------|---------|
| **Global** | IAM, Route 53, CloudFront, WAF (on CloudFront), S3 (namespace), AWS Organizations | Not tied to a specific Region. Data/config replicated globally. |
| **Regional** | VPC, S3 (bucket data), Lambda, API Gateway, ELB, RDS, DynamoDB, SQS, SNS, KMS | Operate within a specific Region. Must be explicitly replicated to other Regions. |
| **AZ-scoped** | EC2 instances, EBS volumes, Subnets, ENIs, NAT Gateway | Exist in a specific AZ. Cannot span AZs without additional architecture. |

:::tip Exam pattern
- **IAM is global** — users, roles, and policies are available across all Regions
- **S3 bucket names are globally unique**, but bucket data is stored in the Region you choose
- **EBS volumes are AZ-locked** — snapshot and restore to move to another AZ
- **VPCs are Regional** — subnets are AZ-scoped within a VPC
:::

---

## Key Numbers

| Item | Value |
|------|-------|
| AWS Regions | 30+ (and growing) |
| AZs per Region | 2–6 (typically 3) |
| Edge Locations | 400+ |
| Local Zones | 30+ |
| Wavelength Zones | 30+ |
