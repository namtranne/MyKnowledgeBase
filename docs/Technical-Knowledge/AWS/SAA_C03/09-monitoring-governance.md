---
sidebar_position: 10
title: "09 — Monitoring & Governance"
slug: 09-monitoring-governance
---

# Monitoring & Governance

These services ensure your AWS environment is observable, auditable, compliant, and well-managed. They're tested across all four domains.

---

## Amazon CloudWatch

**Central monitoring and observability** service.

### CloudWatch Metrics

| Concept | Detail |
|---------|--------|
| **Metric** | A time-ordered set of data points (e.g., CPUUtilization, NetworkIn) |
| **Namespace** | Container for metrics (e.g., `AWS/EC2`, `AWS/RDS`, `Custom/MyApp`) |
| **Dimension** | Name-value pair that identifies a metric (e.g., InstanceId, AutoScalingGroupName) |
| **Period** | Length of time for each data point (1 sec, 5 sec, 10 sec, 30 sec, 1 min, 5 min) |
| **Resolution** | Standard (1-minute) or High (1-second, extra cost) |

**EC2 monitoring:**

| Level | Interval | Cost |
|-------|----------|------|
| **Basic monitoring** | 5-minute intervals | Free |
| **Detailed monitoring** | 1-minute intervals | Extra cost |

:::warning Important
**Default EC2 metrics do NOT include memory or disk usage.** You must install the **CloudWatch Agent** to collect:
- Memory utilization
- Disk space usage
- Custom application metrics
- System-level logs
:::

### CloudWatch Alarms

| Concept | Detail |
|---------|--------|
| **States** | `OK`, `ALARM`, `INSUFFICIENT_DATA` |
| **Actions** | EC2 actions (stop, terminate, reboot, recover), Auto Scaling, SNS notification |
| **Evaluation period** | Number of data points to evaluate |
| **Composite alarms** | Combine multiple alarms with AND/OR logic (reduce alarm noise) |

**EC2 instance recovery:** If an alarm triggers, automatically recover the instance to a new host (same private IP, EIP, metadata, placement group).

### CloudWatch Logs

| Concept | Detail |
|---------|--------|
| **Log Group** | Collection of log streams (e.g., `/aws/lambda/my-function`) |
| **Log Stream** | Sequence of events from a single source (e.g., one Lambda invocation) |
| **Retention** | Configurable: 1 day to 10 years, or never expire |
| **Metric Filters** | Extract metric data from log events (e.g., count ERROR occurrences) |
| **Logs Insights** | SQL-like query language for analyzing logs |
| **Subscription Filters** | Real-time delivery to Lambda, Kinesis, Kinesis Firehose |
| **Cross-account** | Deliver logs to a central logging account via subscription filters |

**Log sources:**
- EC2 instances (via CloudWatch Agent)
- Lambda functions (automatic)
- ECS containers
- VPC Flow Logs
- Route 53 DNS query logs
- CloudTrail
- API Gateway access logs
- Elastic Beanstalk

### CloudWatch Logs Insights

- Query logs using a **purpose-built SQL-like language**
- Automatically discovers fields from JSON logs
- Can query across multiple log groups
- Visualize results as bar charts, line graphs, stacked areas

### CloudWatch Dashboards

- **Visualize metrics** from multiple services on a single screen
- **Cross-Region** and **cross-account** dashboards
- Auto-refresh at configurable intervals
- Shareable with non-AWS users via custom URLs

### CloudWatch Contributor Insights

- Identify **top contributors** to a metric (e.g., top IP addresses causing 5xx errors)
- Works with VPC Flow Logs, CloudTrail, and any log group
- Use case: Find the top talkers or heaviest consumers

### CloudWatch Synthetics (Canary)

- **Synthetic monitoring** — automated scripts that test your endpoints
- Runs on a schedule (1 min to 12 hours)
- Tests: API endpoint availability, page load time, UI workflows
- Alerts when endpoints are broken or degraded

### CloudWatch Evidently

- **Feature flags** and **A/B testing**
- Safely launch features to a percentage of users
- Measure the impact of changes

### CloudWatch Container Insights

- **Collect and aggregate metrics and logs** from containerized applications
- Supports **ECS**, **EKS**, **Fargate**, and **self-managed Kubernetes**
- Metrics: CPU, memory, disk, network at cluster, service, task, and pod level
- Automated dashboards for container health and performance
- Can discover individual container-level metrics (enhanced observability on EKS)

:::tip Exam pattern
"Monitor containerized applications" or "container-level metrics for ECS/EKS" → **CloudWatch Container Insights**.
:::

---

## AWS CloudTrail

**Records all API calls** made in your AWS account. Essential for security, auditing, and compliance.

### Event Types

| Type | What | Default |
|------|------|---------|
| **Management Events** | Control plane operations (CreateBucket, RunInstances, AttachPolicy) | **Enabled by default** (free, first copy of management events) |
| **Data Events** | Data plane operations (S3 GetObject/PutObject, Lambda Invoke, DynamoDB GetItem) | **NOT enabled by default** (high volume, extra cost) |
| **Insights Events** | Detect **unusual API activity** (spike in writes, unusual error rate) | Not enabled by default |

### Key Features

| Feature | Detail |
|---------|--------|
| **Delivery** | Events delivered to S3 bucket (and optionally CloudWatch Logs) |
| **Latency** | Events typically appear within 15 minutes |
| **Retention** | 90 days in CloudTrail console (Event History). For longer: create a **Trail** → S3. |
| **Multi-Region** | A Trail can capture events in **all Regions** (recommended) |
| **Multi-account** | Organization trail — captures events for all accounts |
| **Log integrity** | **Log file integrity validation** — SHA-256 hash chain proves logs haven't been tampered with |
| **Event selectors** | Filter which events to record (e.g., only S3 data events for specific buckets) |

### CloudTrail Lake

- Managed **data lake** for CloudTrail events
- SQL-based query of events (up to 7 years retention)
- Replaces the need to query raw JSON logs in S3

:::tip Exam pattern
"Who deleted the S3 bucket?" → **CloudTrail**. "Track all API calls" → **CloudTrail**. "Prove logs haven't been tampered with" → **CloudTrail log file integrity**. "Audit API activity across all accounts" → **Organization Trail**.
:::

### CloudWatch vs CloudTrail

| Feature | CloudWatch | CloudTrail |
|---------|-----------|------------|
| **Purpose** | Monitor performance and operational health | Audit API calls and account activity |
| **Data** | Metrics, logs, alarms | API call events (who, what, when, from where) |
| **Question type** | "Monitor CPU" / "Alert on errors" | "Who did this?" / "Audit trail" |

---

## AWS Config

**Tracks resource configurations over time** and evaluates compliance against desired rules.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Configuration Recorder** | Records configurations of AWS resources (continuous) |
| **Configuration Items** | Point-in-time snapshot of a resource's configuration |
| **Config Rules** | Evaluate if resources comply with desired state |
| **Conformance Packs** | Collection of Config Rules and remediations as a single unit |
| **Remediation** | Auto-fix non-compliant resources via SSM Automation documents |
| **Aggregator** | Aggregate Config data across accounts and Regions |

### Config Rules

| Type | How | Example |
|------|-----|---------|
| **AWS Managed Rules** | Pre-built rules by AWS (150+) | `s3-bucket-versioning-enabled`, `ec2-instance-no-public-ip` |
| **Custom Rules** | Your own rules via Lambda | Check for specific tags, naming conventions |
| **Evaluation trigger** | On resource change or periodic (1h, 3h, 6h, 12h, 24h) | |

**Popular exam rules:**
- `restricted-ssh` — SG shouldn't allow 0.0.0.0/0 to port 22
- `s3-bucket-public-read-prohibited` — S3 buckets shouldn't be public
- `rds-instance-public-access-check` — RDS shouldn't be publicly accessible
- `encrypted-volumes` — EBS volumes should be encrypted

### Config + Remediation

```
Resource Change → Config Rule Evaluation → Non-Compliant?
                                            │
                                    YES ────┘
                                            │
                                            ▼
                                    Auto-Remediation
                                    (SSM Automation document)
```

:::tip Exam pattern
"Ensure all S3 buckets have encryption" → **Config Rule** (`s3-bucket-server-side-encryption-enabled`). "Track resource configuration changes over time" → **AWS Config**. "Auto-remediate non-compliant resources" → **Config + SSM Automation**.
:::

### CloudTrail vs Config

| Feature | CloudTrail | Config |
|---------|-----------|--------|
| **Focus** | Who did what (API calls) | What is the resource's current/historical configuration |
| **Question** | "Who changed the security group?" | "What was the security group's configuration before and after?" |
| **Rules** | No | Yes — evaluate compliance |

---

## AWS Systems Manager (SSM)

**Manage EC2 instances and on-premises servers** at scale. Critical for operational management.

### Key Capabilities

| Feature | Purpose |
|---------|---------|
| **SSM Agent** | Pre-installed on Amazon Linux 2, Ubuntu, Windows AMIs. Enables all SSM features. |
| **Run Command** | Execute commands/scripts on instances remotely (no SSH/RDP needed) |
| **Patch Manager** | Automate OS and application patching with patch baselines |
| **Session Manager** | Secure shell access to instances **without SSH** (no port 22, no bastion host, no keys) |
| **Parameter Store** | Centralized config/secret storage (see below) |
| **State Manager** | Define and maintain desired state (configurations) |
| **Inventory** | Collect metadata about instances (software, network, services) |
| **Maintenance Windows** | Schedule operations (patching, scripts) during defined windows |
| **Automation** | Automate runbooks (documents) for operational tasks |
| **OpsCenter** | Aggregate and manage operational issues (OpsItems) |

### SSM Parameter Store

| Feature | Detail |
|---------|--------|
| **Purpose** | Store configuration data and secrets |
| **Types** | String, StringList, SecureString (encrypted with KMS) |
| **Hierarchy** | Path-based organization (e.g., `/app/prod/db-password`) |
| **Versions** | Automatic versioning |
| **Tiers** | Standard (free, 10K params, 4KB max) / Advanced ($0.05/param/month, 100K params, 8KB max) |
| **Notifications** | EventBridge integration on parameter changes |

### Session Manager

```
No SSH keys, no bastion hosts, no port 22 inbound
User → AWS Console/CLI → Session Manager → SSM Agent → Instance
                                │
                                ├── Logged in CloudTrail
                                ├── Session data to S3/CloudWatch
                                └── IAM-based access control
```

:::tip Exam pattern
"Manage instances without SSH" → **SSM Session Manager**. "Run commands on multiple instances" → **SSM Run Command**. "Automate patching" → **SSM Patch Manager**. "Store configuration values" → **SSM Parameter Store**.
:::

---

## AWS CloudFormation

**Infrastructure as Code (IaC)** — define AWS resources in templates (JSON/YAML).

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Template** | JSON/YAML file describing resources |
| **Stack** | A collection of AWS resources created from a template |
| **Change Set** | Preview changes before applying them to a stack |
| **Drift detection** | Identify resources that changed outside CloudFormation |
| **StackSets** | Deploy stacks across **multiple accounts and Regions** |
| **Nested stacks** | Reuse common template patterns (e.g., VPC template used by multiple apps) |

### Template Sections

| Section | Purpose |
|---------|---------|
| `AWSTemplateFormatVersion` | Template version (always `2010-09-09`) |
| `Description` | Template description |
| `Parameters` | Input values at deployment time |
| `Mappings` | Static key-value lookups (e.g., AMI IDs per Region) |
| `Conditions` | Conditional resource creation (e.g., only in prod) |
| `Resources` | **Required.** AWS resources to create. |
| `Outputs` | Values to export (cross-stack references) |

### CloudFormation Features

| Feature | Purpose |
|---------|---------|
| **Rollback** | Automatic rollback on failure (or manual disable) |
| **DeletionPolicy** | Control what happens when resource is deleted: `Delete`, `Retain`, `Snapshot` |
| **DependsOn** | Explicit resource creation ordering |
| **cfn-init / cfn-signal** | Bootstrap instances with configurations, signal success/failure |
| **CreationPolicy** | Wait for success signal before marking resource complete |
| **UpdatePolicy** | How ASGs handle updates (rolling, replace) |

:::tip Exam pattern
"Deploy infrastructure consistently across accounts" → **CloudFormation StackSets**. "Infrastructure as code" → **CloudFormation**. "Preview changes before deploying" → **Change Sets**. "Detect manual changes to resources" → **Drift detection**.
:::

---

## AWS Organizations

Covered in [IAM & Secure Access](./02-iam-security), key governance features:

- **Consolidated billing** — single payer, volume discounts, RI/SP sharing
- **SCPs** — permission guardrails across accounts
- **Tag Policies** — enforce consistent tagging
- **AWS Control Tower** — automated multi-account setup with guardrails

---

## Additional Governance Services

### AWS Trusted Advisor

**Automated best practice checks** across five categories:

| Category | Example Checks |
|----------|---------------|
| **Cost Optimization** | Idle EC2 instances, underutilized EBS volumes, unassociated EIPs |
| **Performance** | EC2 instances using older generation, high utilization |
| **Security** | Open security groups (0.0.0.0/0 on port 22), MFA on root, IAM key rotation |
| **Fault Tolerance** | RDS without Multi-AZ, ELB without cross-zone |
| **Service Limits** | Approaching service quotas |

**Access levels:**
- **Basic/Developer support:** 7 core checks (S3 bucket permissions, SG, IAM, MFA, EBS snapshots, RDS snapshots, service limits)
- **Business/Enterprise support:** **All checks** + AWS Support API access

### AWS Compute Optimizer

- **ML-based right-sizing** recommendations for EC2, Auto Scaling groups, Lambda, EBS, ECS on Fargate
- Analyzes utilization metrics to recommend optimal instance types/sizes
- Can reduce costs and improve performance

### AWS Health Dashboard

| Dashboard | Scope |
|-----------|-------|
| **Service Health Dashboard** | Status of all AWS services globally |
| **Personal Health Dashboard** | Events affecting **your** AWS resources specifically |

Personal Health Dashboard features:
- Proactive notifications about events (maintenance, deprecation)
- EventBridge integration → trigger Lambda/SNS on health events
- Organization Health Dashboard for multi-account

### AWS Service Catalog

- **IT-governed catalog** of pre-approved CloudFormation templates
- Admins create **portfolios** containing **products** (templates)
- Users self-service deploy approved resources
- Controls: who can use what, versioning, constraints (launch constraints, tag constraints)
- Use case: Give developers self-service with guardrails

### AWS Proton

- **Automated infrastructure provisioning** for container and serverless applications
- Platform teams create environment templates and service templates
- Developers deploy from templates without knowing underlying infra details
- Use case: Standardize microservice deployment across teams

### AWS Well-Architected Tool

- Evaluate your workloads against the **six pillars** of the Well-Architected Framework
- Self-service review questionnaire
- Generates a report with improvement recommendations
- Use case: Architecture review, identify risks

### AWS License Manager

- **Track and manage software licenses** (Oracle, Microsoft, SAP, etc.)
- Set licensing rules (cores, sockets, instances)
- Enforce limits — prevent exceeding license agreements
- Supports EC2, RDS, on-premises servers

### Amazon Managed Grafana

- Managed Grafana for **visualization and dashboards**
- Data sources: CloudWatch, Prometheus, Elasticsearch, Timestream, X-Ray, and more
- Use case: Rich visualization dashboards for ops teams

### Amazon Managed Service for Prometheus

- Managed **Prometheus** (monitoring and alerting for containers)
- Compatible with Prometheus query language (PromQL)
- Integrates with EKS and self-managed Kubernetes
- Data stored in AWS, auto-scales

### AWS X-Ray

**Distributed tracing** for analyzing and debugging distributed applications.

| Feature | Detail |
|---------|--------|
| **Purpose** | Trace requests as they travel through your application components |
| **Data** | Service map, latency distribution, errors, faults |
| **Integration** | Lambda, API Gateway, ECS, EKS, EC2, Elastic Beanstalk |
| **SDK** | Instrument your code with X-Ray SDK |
| **Use case** | Debug performance issues in microservices, identify bottlenecks |

### AWS Service Quotas

- View and manage **service limits** (quotas) across AWS services
- Request quota increases
- Set CloudWatch alarms when approaching limits
- Use case: "How many VPCs can I have?" "How many EC2 instances can I run?"

---

## Monitoring & Governance Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Monitor CPU utilization" | CloudWatch |
| "Monitor memory/disk on EC2" | CloudWatch Agent |
| "Who made this API call?" | CloudTrail |
| "What was the config before the change?" | AWS Config |
| "Are resources compliant?" | AWS Config Rules |
| "Auto-remediate non-compliance" | Config + SSM Automation |
| "Manage instances without SSH" | SSM Session Manager |
| "Run commands on many instances" | SSM Run Command |
| "Store config/secrets" | SSM Parameter Store (or Secrets Manager) |
| "Infrastructure as code" | CloudFormation |
| "Deploy across accounts/Regions" | CloudFormation StackSets |
| "Check for cost savings opportunities" | Trusted Advisor |
| "Right-size EC2 instances" | Compute Optimizer |
| "Events affecting my resources" | Personal Health Dashboard |
| "Self-service approved deployments" | Service Catalog |
| "Monitor containers (ECS/EKS)" | CloudWatch Container Insights |
| "Debug microservice latency" | X-Ray |
| "Track software licenses" | License Manager |
| "Architecture review" | Well-Architected Tool |
