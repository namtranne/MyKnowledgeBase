---
sidebar_position: 14
title: "13 — Cost Optimization"
slug: 13-cost-optimization
---

# Cost Optimization

Domain 4 is 20% of the exam. Nearly every question has a "most cost-effective" angle. You need to know pricing models, cost tools, and optimization patterns across all services.

---

## AWS Cost Management Tools

| Tool | Purpose | Key Feature |
|------|---------|------------|
| **AWS Cost Explorer** | Visualize, analyze, and forecast spend | RI/SP purchase recommendations, trend analysis, daily/monthly granularity |
| **AWS Budgets** | Set budget alerts | Notify before overspending. Budget types: cost, usage, RI/SP utilization, RI/SP coverage |
| **AWS Cost and Usage Report (CUR)** | Most detailed cost data | Line-item billing data → S3. Integrate with Athena, QuickSight, Redshift for analysis |
| **AWS Cost Allocation Tags** | Categorize costs | User-defined tags (e.g., team, project) + AWS-generated tags. Enable in Billing Console. |
| **AWS Pricing Calculator** | Estimate costs before deploying | Model architectures and compare pricing options |
| **AWS Trusted Advisor** | Best practice checks | Cost optimization checks (idle resources, underutilized, unused reservations) |
| **AWS Compute Optimizer** | Right-sizing recommendations | ML-based EC2, ASG, Lambda, EBS, ECS optimization |

### AWS Cost Explorer

- **Forecast** future costs based on historical trends
- **RI/SP recommendations:** Suggests optimal Reserved Instance or Savings Plans purchases
- **Right-sizing recommendations:** Identifies overprovisioned EC2 instances
- **Granularity:** Monthly, daily, or hourly
- **Filtering:** By service, account, tag, Region, instance type, etc.

### AWS Budgets

| Budget Type | Tracks |
|-------------|--------|
| **Cost budget** | Total spend vs budget |
| **Usage budget** | Service usage vs budget |
| **RI utilization** | Are your RIs being used? |
| **RI coverage** | How much of your usage is covered by RIs? |
| **Savings Plans utilization** | Are your Savings Plans being used? |
| **Savings Plans coverage** | How much usage is covered by SPs? |

**Budget actions:** Automatically apply SCPs, stop EC2/RDS instances, or notify via SNS when thresholds are reached.

---

## Compute Cost Optimization

### EC2 Pricing Strategies

| Strategy | When to Use | Savings |
|----------|------------|---------|
| **On-Demand** | Unknown/variable/short-term workloads | Baseline (full price) |
| **Reserved Instances (1yr/3yr)** | Steady-state, predictable 24/7 workloads | Up to 72% |
| **Compute Savings Plans** | Flexible commitment across instance families/Regions | Up to 66% |
| **EC2 Instance Savings Plans** | Locked to specific family in Region | Up to 72% |
| **Spot Instances** | Fault-tolerant, flexible workloads | Up to 90% |
| **Spot Fleet** | Mix of Spot + On-Demand for reliable capacity | Up to 90% |

### Right-Sizing

- Use **Compute Optimizer** to identify over/under-provisioned instances
- Check CPU, memory, network utilization in CloudWatch
- Start with a smaller instance → scale up if needed
- Consider **Graviton (ARM) instances** — ~20% cheaper, better performance for many workloads

### Serverless vs Servers

| Workload Pattern | Best Option | Why |
|-----------------|-------------|-----|
| Steady, predictable traffic | EC2 (Reserved/SP) | Cheapest per-hour at scale |
| Variable, spiky, unpredictable | Lambda / Fargate | Pay only for what you use |
| Idle 80% of the time | Lambda | No charge when idle |
| Consistent high utilization | EC2 (Reserved) | Lambda can be more expensive at sustained high load |

### Auto Scaling Optimization

- **Target Tracking** at optimal utilization (e.g., 70% CPU) — not too high (performance risk), not too low (wasted capacity)
- **Mixed Instance Policy:** Combine instance types + Spot + On-Demand in ASG for cost savings
- **Predictive Scaling:** Pre-scale before traffic spikes (avoids paying for over-provisioning)
- **Scheduled Scaling:** Scale down during off-hours (nights, weekends)

### Load Balancer Cost

| LB Type | Pricing Model |
|---------|--------------|
| **ALB** | Per hour + per LCU (request, connection, bandwidth, rule) |
| **NLB** | Per hour + per NLCU |
| **GWLB** | Per hour + per GLCU |

**Optimize:** Use the simplest LB that meets requirements. Don't use ALB if you only need L4 (NLB is often cheaper for TCP).

---

## Storage Cost Optimization

### S3 Cost Optimization

| Strategy | Detail |
|----------|--------|
| **Lifecycle rules** | Transition to cheaper classes over time (Standard → IA → Glacier) |
| **Intelligent-Tiering** | Auto-tiering for unknown access patterns (small monitoring fee) |
| **S3 Analytics** | Analyze access patterns to decide optimal lifecycle policies |
| **Requester Pays** | Bucket owner doesn't pay for data transfer — requester does |
| **Compression** | Compress before uploading (GZIP files) — store less data |
| **Right format** | Columnar formats (Parquet, ORC) for analytics — smaller, faster queries |

### S3 Storage Class Cost Comparison (approximate, us-east-1)

| Class | Storage $/GB/month | Retrieval Cost |
|-------|-------------------|---------------|
| Standard | $0.023 | None |
| Standard-IA | $0.0125 | $0.01/GB |
| One Zone-IA | $0.01 | $0.01/GB |
| Glacier Instant | $0.004 | $0.03/GB |
| Glacier Flexible | $0.0036 | $0.01–$0.03/GB |
| Glacier Deep Archive | $0.00099 | $0.02–$0.05/GB |

### EBS Cost Optimization

| Strategy | Detail |
|----------|--------|
| **gp3 over gp2** | gp3 is cheaper and decouples IOPS from size |
| **Delete unused volumes** | Unattached EBS volumes still cost money |
| **Snapshot lifecycle** | Use DLM (Data Lifecycle Manager) to auto-delete old snapshots |
| **Snapshot Archive** | Move infrequently accessed snapshots to archive (75% cheaper) |
| **HDD for throughput** | Use st1/sc1 for sequential workloads — much cheaper than SSD |
| **Right-size volumes** | Don't over-provision. gp3 IOPS/throughput are independently configurable. |

### EFS Cost Optimization

| Strategy | Detail |
|----------|--------|
| **IA storage class** | Enable lifecycle to move infrequent files to EFS-IA (up to 92% savings) |
| **One Zone** | If you don't need multi-AZ, use One Zone EFS (47% cheaper) |
| **Elastic throughput** | Pay for what you use instead of provisioning fixed throughput |

---

## Database Cost Optimization

### RDS/Aurora

| Strategy | Detail |
|----------|--------|
| **Reserved Instances** | Up to 72% savings for steady databases |
| **Aurora Serverless v2** | Scale compute based on demand — great for variable workloads |
| **Right-size instances** | Don't over-provision. Use Performance Insights to analyze. |
| **Read Replicas** | Offload reads from expensive primary — can use cheaper instance type |
| **Stop idle databases** | RDS instances can be stopped for up to 7 days (auto-restarts) |
| **Multi-AZ only for prod** | Don't use Multi-AZ for dev/test (2x cost) |
| **Aurora I/O-Optimized** | If I/O costs > 25% of total Aurora cost, switch to I/O-Optimized pricing |

### DynamoDB

| Strategy | Detail |
|----------|--------|
| **On-Demand mode** | For unpredictable workloads (no wasted capacity) |
| **Provisioned + Auto Scaling** | For predictable workloads (cheaper at steady state) |
| **Reserved Capacity** | Commitment discount for provisioned mode |
| **TTL** | Auto-expire old items (no WCU cost for deletions) |
| **DAX** | Cache reads to reduce RCU consumption |

### ElastiCache

- Right-size node types based on actual memory/CPU usage
- Use **Reserved Nodes** for steady-state caches (up to 55% savings)
- Consider **Serverless** option for variable workloads

---

## Network Cost Optimization

### Data Transfer Costs

| Transfer | Cost |
|----------|------|
| **Data IN** to AWS | **Free** |
| **Data OUT** to internet | $0.09/GB (first 10 TB), tiered pricing |
| **Between AZs** (same Region) | $0.01/GB each way ($0.02 total) |
| **Within same AZ** | Free (using private IP) |
| **Between Regions** | $0.02/GB |
| **VPC Peering same Region** | Same as inter-AZ ($0.01/GB each way) |
| **VPC Peering cross-Region** | Same as inter-Region |
| **CloudFront to internet** | Lower than direct S3/EC2 to internet |

### NAT Gateway Cost Optimization

| Strategy | Detail |
|----------|--------|
| **VPC Gateway Endpoints** | Free access to S3 and DynamoDB — avoids NAT data processing charges |
| **Interface Endpoints** | Pay for endpoint, but may be cheaper than NAT for high-traffic services |
| **Single NAT (dev)** | One NAT Gateway instead of per-AZ (saves cost, reduces HA) |
| **Per-AZ NAT (prod)** | Required for HA, but more expensive |

### CloudFront Cost Benefits

- **Cheaper data transfer** than direct from S3/EC2
- Caching reduces origin requests (lower compute/storage costs)
- **Free data transfer** from S3 origin to CloudFront (via OAC)
- Use **Price Class** to limit edge locations:
  - Price Class All (all edge locations — best performance, highest cost)
  - Price Class 200 (most edge locations — good balance)
  - Price Class 100 (cheapest edge locations only — US, Europe)

### Direct Connect vs VPN Cost

| Connection | Monthly Cost | Data Transfer | Use When |
|-----------|-------------|--------------|----------|
| **VPN** | ~$36/month per connection | Standard data transfer | Quick setup, lower bandwidth needs |
| **Direct Connect 1 Gbps** | ~$220/month per port | Lower data transfer rates | High bandwidth, consistent latency |
| **Direct Connect 10 Gbps** | ~$1,600/month per port | Lowest data transfer rates | Very high bandwidth |

**Decision:** Direct Connect is cheaper per GB at very high volumes; VPN is cheaper for low-to-moderate data transfer.

### VPC Endpoint Cost vs NAT Gateway Cost

```
Without Endpoints:
  Private Subnet → NAT Gateway → Internet → AWS Service (S3)
  Cost: NAT Gateway hourly + $0.045/GB NAT processing + data transfer

With Gateway Endpoint (S3/DynamoDB):
  Private Subnet → Gateway Endpoint → S3
  Cost: FREE

With Interface Endpoint:
  Private Subnet → Interface Endpoint → AWS Service
  Cost: ~$0.01/hour per AZ + $0.01/GB processed
```

:::tip Exam pattern
"Reduce data transfer cost" → **VPC Endpoints**, **CloudFront**, **same-AZ deployment**. "Reduce NAT Gateway cost" → **Gateway Endpoints for S3/DynamoDB**. "Cheapest outbound data" → **CloudFront** (lower rates than direct).
:::

---

## Cost Optimization Across Domains

### Multi-Account Cost Management

| Feature | Detail |
|---------|--------|
| **Consolidated Billing** | Single payer account, volume discounts applied across all accounts |
| **RI/SP Sharing** | Reserved Instances and Savings Plans purchased in one account benefit all accounts |
| **Cost Allocation Tags** | Track costs by project, team, environment across accounts |
| **AWS Budgets** | Set per-account or Organization-level budgets |

### Tagging Strategy

- **Required tags:** `Environment` (prod/dev/test), `Project`, `Owner`, `CostCenter`
- Use **Tag Policies** (AWS Organizations) to enforce consistent tagging
- Activate tags in the **Billing Console** for cost allocation
- Use **Config Rules** to detect untagged resources

### Architecture Cost Patterns

| Pattern | Why It Saves |
|---------|-------------|
| **Serverless** | Pay only for execution time/requests (no idle cost) |
| **Containers on Fargate** | No EC2 management, pay per vCPU/memory-second |
| **Caching (ElastiCache, DAX, CloudFront)** | Reduces expensive database/compute operations |
| **S3 lifecycle policies** | Automatically moves data to cheaper tiers |
| **Spot + On-Demand mix** | Up to 90% savings on fault-tolerant portions |
| **Right-sizing** | Reduce waste from oversized instances |
| **Scheduled scaling** | Scale down off-hours (nights, weekends) |
| **Single-AZ for dev/test** | Don't pay for Multi-AZ in non-production |
| **VPC Endpoints** | Eliminate NAT Gateway data processing charges |

---

## Cost Optimization Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Reduce EC2 cost, steady workload" | Reserved Instances or Savings Plans |
| "Reduce cost for batch processing" | Spot Instances |
| "Reduce cost for variable DB workload" | Aurora Serverless or DynamoDB On-Demand |
| "Reduce S3 cost for old data" | Lifecycle rules to IA/Glacier |
| "Unknown S3 access pattern" | Intelligent-Tiering |
| "Reduce NAT Gateway cost" | VPC Gateway Endpoints for S3/DynamoDB |
| "Reduce data transfer cost" | CloudFront, VPC Endpoints, same-AZ |
| "Identify unused resources" | Trusted Advisor, Cost Explorer |
| "Right-size EC2 instances" | Compute Optimizer |
| "Set budget alerts" | AWS Budgets |
| "Detailed billing analysis" | Cost and Usage Report + Athena |
| "Track costs by team/project" | Cost Allocation Tags |
| "Reduce Lambda cost" | Right-size memory (proportional CPU), Compute Savings Plans |
| "Cheapest EBS volume" | sc1 (cold HDD) — if IOPS not needed |
| "Reduce EBS snapshot cost" | Snapshot Archive or delete unused snapshots |
| "Reduce CloudFront cost" | Price Class 100 (fewer edge locations) |
| "Share RI savings across accounts" | AWS Organizations consolidated billing |
| "Cheapest DB for dev/test" | Single-AZ RDS or Aurora Serverless (scales to zero) |
