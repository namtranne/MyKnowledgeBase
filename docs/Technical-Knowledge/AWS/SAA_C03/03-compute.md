---
sidebar_position: 4
title: "03 — Compute"
slug: 03-compute
---

# Compute Services

Compute is tested across all four exam domains — EC2 purchasing for cost optimization, Auto Scaling for resilience, Lambda for serverless architecture, and containers for microservices.

---

## EC2 (Elastic Compute Cloud)

The most foundational compute service. Know it thoroughly.

### Instance Families

| Family | Optimized For | Example Use Case | Naming Example |
|--------|--------------|------------------|----------------|
| **General Purpose** (M, T, A) | Balanced CPU/memory | Web servers, code repos, small databases | `m6i.xlarge`, `t3.medium` |
| **Compute Optimized** (C) | High-performance processors | Batch processing, ML inference, gaming, HPC | `c6i.2xlarge` |
| **Memory Optimized** (R, X, z) | Large in-memory datasets | In-memory databases, real-time analytics, SAP HANA | `r6i.4xlarge`, `x2idn.metal` |
| **Storage Optimized** (I, D, H) | High sequential read/write | Data warehousing, distributed filesystems, HDFS | `i3.xlarge`, `d3.xlarge` |
| **Accelerated** (P, G, Inf, Trn, DL) | GPU/custom hardware | ML training, video encoding, HPC, graphics rendering | `p4d.24xlarge`, `g5.xlarge` |

**Instance naming convention:** `m6i.xlarge`
- `m` = family (general purpose)
- `6` = generation
- `i` = additional attribute (Intel processor; `g` = Graviton, `a` = AMD)
- `xlarge` = size

### T-Series Burstable Instances

T instances (T3, T3a, T4g) are **burstable** — they earn CPU credits during idle periods and spend them during bursts.

| Mode | Behavior |
|------|----------|
| **Standard** | Earns/spends credits. If credits run out, CPU is limited to baseline. |
| **Unlimited** | Can burst beyond credit balance — you pay for surplus credits. Risk of unexpected charges. |

**Use case:** Variable workloads where CPU is usually low but occasionally spikes (dev/test, small websites).
**Don't use for:** Consistent high CPU — use M or C family instead.

### Purchasing Options

| Option | Discount | Commitment | Best For |
|--------|----------|-----------|----------|
| **On-Demand** | None (full price) | None | Unpredictable, short-term, spiky workloads |
| **Reserved Instances (1yr/3yr)** | Up to 72% | 1 or 3 year term | Steady-state, predictable workloads |
| **Savings Plans** | Up to 72% | $/hr commitment for 1 or 3 years | Flexible across instance families/Regions/compute services |
| **Spot Instances** | Up to 90% | None (can be reclaimed with **2-min** notice) | Fault-tolerant, flexible (batch, CI/CD, big data) |
| **Dedicated Hosts** | Varies | Per-host billing | License compliance (per-socket/per-core), regulatory |
| **Dedicated Instances** | Varies | Per-instance + per-Region fee | Hardware isolation without host management |
| **Capacity Reservations** | None (On-Demand price) | Reserve capacity in specific AZ | Guarantee capacity for DR or compliance |

**Reserved Instance types:**
- **Standard RI:** Highest discount, specific instance family/type/AZ/Region. Can sell on RI Marketplace.
- **Convertible RI:** Lower discount, but can change instance family/type/OS/tenancy. Cannot sell.
- **Scheduled RI:** Deprecated — use Savings Plans instead.

**Savings Plans types:**
- **Compute Savings Plans:** Most flexible — applies to **EC2, Fargate, and Lambda** in any Region/family. Best for organizations using multiple compute services.
- **EC2 Instance Savings Plans:** Locked to a specific instance family in a Region — deeper discount but less flexible

:::tip Exam pattern
"Steady-state production workload" → **Reserved Instances or Savings Plans**. "Fault-tolerant batch processing" → **Spot Instances**. "License compliance (per-socket)" → **Dedicated Hosts**. "Flexible across instance families" → **Compute Savings Plans**.
:::

### Spot Instances Deep Dive

| Feature | Detail |
|---------|--------|
| **Discount** | Up to 90% off On-Demand |
| **Interruption** | 2-minute notice before reclamation |
| **Spot Fleet** | Mix of Spot + On-Demand instances across pools for capacity |
| **Spot Block** | Deprecated (was uninterrupted for 1-6 hours) |
| **Best practices** | Use diverse instance types/AZs, checkpointing, graceful shutdown |

**Spot Fleet strategies:**
- `lowestPrice` — launches from the cheapest pool
- `diversified` — distributes across all pools (better availability)
- `capacityOptimized` — launches from pools with most available capacity (recommended)
- `priceCapacityOptimized` — considers both price and capacity (best default)

### Placement Groups

| Type | Behavior | Use Case | Limits |
|------|----------|----------|--------|
| **Cluster** | All instances on same rack, same AZ | Low-latency, high throughput (HPC, tightly coupled) | Single AZ only |
| **Spread** | Each instance on different hardware | Critical instances that must not share hardware | Max **7 instances per AZ** |
| **Partition** | Instances divided into partitions on separate racks | Large distributed workloads (HDFS, HBase, Cassandra, Kafka) | Max 7 partitions per AZ |

### EC2 Instance Store (Ephemeral Storage)

**Instance Store** volumes are block storage **physically attached** to the host machine. They provide the highest I/O performance available on EC2.

| Feature | Detail |
|---------|--------|
| **Performance** | Very high IOPS (millions of IOPS for NVMe-based stores) |
| **Persistence** | **Ephemeral** — data is lost when instance stops, terminates, or underlying hardware fails |
| **Cost** | Included in the instance price (no extra charge) |
| **Resize** | Cannot be resized |
| **Detach/Reattach** | Cannot be detached and moved to another instance |
| **Backup** | No native snapshot support — you must replicate data yourself |

**Data is lost when:**
- The instance **stops** or **terminates**
- The underlying host **fails**

**Data survives:**
- Instance **reboot** (data persists)

**Use cases:**
- Buffer, cache, scratch data, temporary content
- High-performance temporary storage (e.g., processing large datasets)
- Applications that replicate data across instances (HDFS, distributed databases)

### Instance Store vs EBS

| Feature | Instance Store | EBS |
|---------|---------------|-----|
| **Attachment** | Physically attached to host | Network-attached |
| **Persistence** | **Lost** on stop/terminate | **Persists** independently |
| **Performance** | Very high (local NVMe) | High (gp3: 16K IOPS, io2: 256K IOPS) |
| **Cost** | Free (included with instance) | Per-GB + IOPS charges |
| **Snapshots** | No | Yes (to S3) |
| **Reattach** | No | Yes (within same AZ) |
| **Boot volume** | No (some instance types) | Yes |
| **Encryption** | Depends on instance type | KMS-based |
| **Use case** | Temp data, cache, buffer | Databases, boot volumes, persistent storage |

:::tip Exam pattern
"Highest I/O performance for temporary data" → **Instance Store**. "Data must survive instance stop" → **EBS**. "What happens to data when instance terminates?" → Instance Store data is **lost**, EBS data **persists** (unless DeleteOnTermination is true).
:::

### Elastic Network Interface (ENI)

A **virtual network card** that represents a network interface for an EC2 instance.

| Feature | Detail |
|---------|--------|
| **Primary ENI** | Created automatically when an instance launches. Cannot be detached. |
| **Secondary ENI** | Can be created and attached/detached from instances in the **same AZ** |
| **Attributes** | Private IPv4, Elastic IP, public IPv4, one or more security groups, MAC address |
| **Multi-ENI** | Attach multiple ENIs for dual-homing (management network + data network) |
| **Failover** | Move a secondary ENI from a failed instance to a standby instance (low-budget HA) |

**Use cases:**
- **Dual-homed instances:** Separate management and application traffic on different subnets
- **Low-budget HA:** Move ENI (and its private IP) to a standby instance on failure
- **Licensing:** Software tied to a MAC address — ENI retains its MAC address

:::tip Exam pattern
"Move a private IP to another instance on failure" → **Secondary ENI** (move between instances in the same AZ). "Separate management traffic from application traffic" → **Multiple ENIs** on different subnets.
:::

### EC2 User Data & Instance Metadata

- **User Data:** Script that runs **once** on first boot (by default). Automate software installation, configuration, etc.
- **Instance Metadata Service (IMDS):** Available at `http://169.254.169.254/latest/meta-data/`
  - Provides: instance ID, public/private IP, IAM role credentials, AZ, instance type, security groups
  - **IMDSv2** (token-based) is **recommended** — requires a PUT request to get a session token first. Mitigates SSRF attacks.

### EC2 Hibernation

- Saves the **RAM contents** to the root EBS volume, then stops the instance
- On start: RAM is restored, processes resume — faster boot than cold start
- Use case: Long-running processes that take time to initialize
- Requirements: Root volume must be EBS (encrypted), RAM ≤ 150 GB, instance families supported
- Max hibernation duration: **60 days**

### AMI (Amazon Machine Image)

- Template for launching EC2 instances (OS, software, configuration)
- **Region-specific** — copy to other Regions for multi-Region deployment
- Types: Public (AWS-provided), Marketplace, Custom (your own)
- **Golden AMI pattern:** Pre-bake all software/config into an AMI for fast, consistent deployments

---

## Auto Scaling

### Auto Scaling Group (ASG)

Manages a fleet of EC2 instances — automatically adds/removes instances based on demand.

**Components:**
- **Launch Template** (preferred) or Launch Configuration (legacy): Defines instance config (AMI, type, SG, user data, key pair)
- **ASG settings:** Minimum, desired, and maximum instance count
- **Health checks:** EC2 (default) or ELB health checks

### Scaling Policies

| Policy Type | How It Works | Example |
|-------------|-------------|---------|
| **Target Tracking** | Maintain a metric at a target value. ASG auto-adjusts. | "Keep average CPU at 50%" |
| **Step Scaling** | Add/remove instances in steps based on alarm thresholds | "If CPU > 70% add 1, if > 90% add 3" |
| **Simple Scaling** | Add/remove a fixed number when alarm triggers | "If CPU > 70%, add 1 instance" (legacy) |
| **Scheduled** | Scale at specific times | "Scale to 10 instances at 8am, back to 2 at 10pm" |
| **Predictive** | ML-based prediction of traffic patterns; pre-scales | For recurring patterns (daily, weekly cycles) |

**Cooldown period:** After a scaling event, the ASG waits (default **300 seconds**) before allowing another scaling action. Prevents rapid oscillation.

**Warm pool:** Pre-initialized instances in a stopped/running/hibernated state. When ASG needs to scale out, instances from the warm pool launch faster than cold starts.

### Scaling Metrics

| Metric | Use Case |
|--------|----------|
| `CPUUtilization` | General workload scaling |
| `RequestCountPerTarget` | Web server scaling based on traffic |
| `NetworkIn` / `NetworkOut` | Network-intensive applications |
| Custom metric (via CloudWatch) | Application-specific (queue depth, active sessions) |

**SQS-based scaling pattern:** Publish `ApproximateNumberOfMessagesVisible` as a CloudWatch metric → ASG scales based on queue depth. Common exam scenario.

### Instance Refresh

Gradually replace instances in an ASG with a new launch template version:
- Set a **minimum healthy percentage** (e.g., 90%) — ASG replaces instances in batches
- Use case: Rolling out new AMI, changing instance type

---

## Elastic Load Balancing (ELB)

### Load Balancer Types

| Load Balancer | Layer | Protocol | Key Features |
|---------------|-------|----------|-------------|
| **ALB** (Application) | Layer 7 | HTTP/HTTPS/gRPC | Path/host-based routing, WebSockets, HTTP/2 |
| **NLB** (Network) | Layer 4 | TCP/UDP/TLS | Ultra-low latency, static IP, millions of RPS |
| **GWLB** (Gateway) | Layer 3 | IP (GENEVE) | Inline traffic inspection (firewalls, IDS/IPS) |
| **CLB** (Classic) | Layer 4/7 | HTTP/TCP | **Legacy** — never pick on the exam |

### Application Load Balancer (ALB) — Deep Dive

**Routing capabilities:**
- **Path-based:** `/api/*` → Service A, `/images/*` → Service B
- **Host-based:** `api.example.com` → Service A, `web.example.com` → Service B
- **HTTP header-based:** Route by custom headers
- **Query string-based:** `?platform=mobile` → Mobile targets
- **Source IP-based:** Route based on client IP CIDR

**Target types:**
- EC2 instances (by instance ID)
- IP addresses (including on-premises targets via Direct Connect/VPN)
- Lambda functions
- Other ALBs (chaining)

**Key features:**
- **SSL/TLS termination** at the ALB — uses ACM certificates
- **Sticky sessions** — cookie-based (application or duration-based)
- **Connection draining** (deregistration delay) — allows in-flight requests to complete
- **WAF integration** — attach WAF rules directly to ALB
- **Authentication** — integrates with Cognito or OIDC providers
- **Access logs** → S3 bucket

**Headers:** ALB adds `X-Forwarded-For` (client IP), `X-Forwarded-Port`, `X-Forwarded-Proto` headers to requests.

### Network Load Balancer (NLB) — Deep Dive

| Feature | Detail |
|---------|--------|
| **Performance** | Millions of requests/second, ultra-low latency (~100μs) |
| **Static IP** | One static IP per AZ (or assign Elastic IPs) |
| **Source IP** | Preserves the client's source IP |
| **Protocols** | TCP, UDP, TLS |
| **Health checks** | TCP, HTTP, HTTPS |
| **PrivateLink** | Expose services to other VPCs via NLB + VPC endpoint |
| **Cross-zone** | Disabled by default (enable for even distribution) |

:::tip Exam pattern
"Low latency" or "static IP" or "TCP/UDP" or "millions of connections" → **NLB**.
"Path-based routing" or "HTTP headers" or "WebSockets" → **ALB**.
"Inline firewall/IDS inspection" → **GWLB**.
:::

### Gateway Load Balancer (GWLB)

- Routes traffic through **third-party virtual appliances** (firewalls, IDS/IPS, deep packet inspection)
- Uses **GENEVE** protocol on port 6081
- Operates at **Layer 3** (network layer)
- Creates a **Gateway Load Balancer Endpoint** in your VPC
- Traffic flow: Client → GWLB Endpoint → GWLB → Appliance → GWLB → Destination

### Cross-Zone Load Balancing

| LB Type | Default | Cost |
|---------|---------|------|
| ALB | Enabled | Free |
| NLB | Disabled | Charges for inter-AZ data |
| GWLB | Disabled | Charges for inter-AZ data |

### Connection Draining / Deregistration Delay

When an instance is being deregistered or unhealthy:
- LB stops sending new requests to the instance
- Existing in-flight requests are allowed to complete (up to the deregistration delay timeout)
- Default: 300 seconds. Set to 0 for short-lived requests.

### SSL/TLS on Load Balancers

- Use **AWS Certificate Manager (ACM)** to provision SSL/TLS certificates
- **Server Name Indication (SNI):** ALB and NLB support multiple SSL certificates on one listener (different certs for different domains)
- CLB supports only one certificate per listener

---

## AWS Lambda

Serverless compute — upload code, AWS runs it. No servers to manage.

### Key Specifications

| Feature | Limit |
|---------|-------|
| **Memory** | 128 MB – 10,240 MB (CPU scales proportionally) |
| **Timeout** | Max **15 minutes** |
| **Temp storage** | `/tmp` up to **10 GB** |
| **Environment variables** | 4 KB total |
| **Deployment package** | 50 MB zipped, 250 MB unzipped (or container image up to 10 GB) |
| **Concurrency** | Default 1,000 per Region (soft limit, requestable increase) |
| **Layers** | Up to 5 layers, 250 MB total unzipped |

### Lambda Invocation Types

| Type | Behavior | Retry | Example |
|------|----------|-------|---------|
| **Synchronous** | Caller waits for response | No auto-retry (caller handles) | API Gateway, ALB |
| **Asynchronous** | Fire and forget | Retries 2x, then to DLQ/destination | S3 events, SNS, EventBridge |
| **Event Source Mapping** | Lambda polls the source | Retries until success or data expires | SQS, DynamoDB Streams, Kinesis |

### Common Lambda Integrations (Exam Favorites)

| Pattern | How |
|---------|-----|
| Serverless REST API | **API Gateway → Lambda → DynamoDB** |
| Process uploaded files | **S3 event → Lambda** (thumbnails, transcoding, validation) |
| React to DB changes | **DynamoDB Streams → Lambda** |
| Process queue messages | **SQS → Lambda** (event source mapping) |
| Scheduled jobs | **EventBridge rule (cron) → Lambda** |
| CDN customization | **CloudFront → Lambda@Edge / CloudFront Functions** |
| Stream processing | **Kinesis → Lambda** |
| Fan-out | **SNS → Lambda** |

### Lambda Concurrency

| Type | Behavior |
|------|----------|
| **Unreserved** | Shared pool for all functions in the Region (default 1,000 total) |
| **Reserved** | Guarantees concurrency for a function; limits max to that number |
| **Provisioned** | Pre-initializes execution environments — **eliminates cold starts** |

**Cold start:** First invocation loads runtime + code + dependencies → higher latency. Subsequent invocations reuse the warm environment. Use **Provisioned Concurrency** for latency-sensitive workloads.

### Lambda Networking

- **Default:** Lambda runs in an AWS-managed VPC. Has internet access but cannot access your private VPC resources.
- **VPC-enabled Lambda:** Attach Lambda to your VPC subnets. Can access private resources (RDS, ElastiCache). Needs a **NAT Gateway** for internet access (Lambda in private subnet → NAT in public subnet → IGW).
- Uses **Hyperplane ENI** — shared network interfaces, so VPC Lambda starts much faster than before.

### Lambda@Edge vs CloudFront Functions

| Feature | Lambda@Edge | CloudFront Functions |
|---------|------------|---------------------|
| **Runtime** | Node.js, Python | JavaScript only |
| **Execution location** | Regional Edge Caches | Edge Locations (closer to user) |
| **Max execution time** | 5 sec (viewer), 30 sec (origin) | < 1 ms |
| **Max memory** | 128 MB–10 GB | 2 MB |
| **Network/file access** | Yes | No |
| **Use case** | Complex logic, external calls | Simple transforms (headers, URL rewrites) |

---

## Container Services

### Container Overview

| Service | What It Is |
|---------|-----------|
| **Amazon ECS** | AWS-native container orchestrator |
| **Amazon EKS** | Managed Kubernetes |
| **AWS Fargate** | Serverless compute engine for containers (no EC2 management) |
| **Amazon ECR** | Container image registry (like Docker Hub, but private in AWS) |

### Amazon ECS (Elastic Container Service)

**Launch types:**

| Launch Type | You Manage | AWS Manages |
|-------------|-----------|-------------|
| **EC2 Launch Type** | EC2 instances, capacity, patching | Orchestration, scheduling |
| **Fargate Launch Type** | Nothing (serverless) | Infrastructure, scaling, patching |

**ECS components:**
- **Cluster:** Logical grouping of tasks/services
- **Task Definition:** Blueprint for your application (container image, CPU, memory, ports, volumes, IAM role)
- **Task:** Running instance of a task definition
- **Service:** Maintains a desired number of tasks (auto-restarts failed tasks, integrates with ELB)

**ECS IAM roles:**
- **Task Role:** IAM role assumed by the container — what the application can access
- **Task Execution Role:** Used by ECS agent to pull images from ECR, push logs to CloudWatch

**ECS + ALB:** Use **dynamic port mapping** — ALB routes traffic to the correct container port. Allows multiple containers of the same service on a single EC2 instance.

### Amazon EKS (Elastic Kubernetes Service)

- Managed **Kubernetes** control plane
- Supports **EC2 launch type** and **Fargate launch type**
- Compatible with all Kubernetes tooling (kubectl, Helm, etc.)
- Use case: Teams already using Kubernetes, need to run K8s in AWS
- **EKS Anywhere:** Run EKS on your own on-premises infrastructure
- **EKS Distro:** Same Kubernetes distribution used by EKS, for self-managed deployments

### AWS Fargate

- **Serverless containers** — no EC2 instances to manage
- Works with both ECS and EKS
- You define CPU and memory per task
- AWS handles provisioning, scaling, patching
- Pay per vCPU and memory per second

:::tip Exam pattern
"Run containers without managing servers" → **Fargate**. "Already using Kubernetes" → **EKS**. "Simplest AWS container orchestration" → **ECS**. "Need to store container images" → **ECR**.
:::

### Amazon ECR (Elastic Container Registry)

- Fully managed Docker container registry
- Stores, manages, and deploys container images
- Integrated with ECS, EKS, and Lambda
- Supports **image scanning** for vulnerabilities
- **Lifecycle policies** to clean up old/untagged images
- Cross-Region and cross-account **replication**

---

## AWS Elastic Beanstalk

**Platform as a Service (PaaS)** — deploy applications without managing infrastructure.

- Supports: Java, .NET, PHP, Node.js, Python, Ruby, Go, Docker
- Automatically provisions: EC2, ASG, ELB, RDS, CloudWatch
- You upload code → Beanstalk handles deployment, scaling, monitoring, health checks
- Full control over underlying resources (can SSH into instances, customize)

**Deployment policies:**

| Policy | Downtime | Speed | Risk |
|--------|----------|-------|------|
| **All at once** | Yes | Fastest | High (full outage during deploy) |
| **Rolling** | No | Moderate | Some capacity reduction |
| **Rolling with additional batch** | No | Moderate | Maintains full capacity |
| **Immutable** | No | Slow | Lowest risk (new ASG) |
| **Traffic splitting** | No | Slow | Canary testing (sends % of traffic to new version) |
| **Blue/Green** | No | Moderate | Separate environment + DNS swap |

:::tip Exam pattern
"Easiest way to deploy a web application" or "developer-focused deployment" → **Elastic Beanstalk**. "Full control over infrastructure" → **EC2 directly** or **ECS**.
:::

---

## AWS Batch

Fully managed **batch computing** service. Runs hundreds of thousands of batch computing jobs.

- **Jobs:** Shell scripts, Linux executables, Docker container images
- Automatically provisions the optimal quantity and type of compute (EC2 or Spot)
- **No infrastructure to manage** — define jobs, submit them, Batch handles the rest
- Supports **multi-node parallel jobs** for HPC workloads

**Batch vs Lambda:**

| Feature | AWS Batch | Lambda |
|---------|----------|--------|
| **Time limit** | No limit | 15 minutes |
| **Runtime** | Any (Docker) | Limited runtimes |
| **Disk space** | EBS volumes (unlimited) | 10 GB /tmp |
| **Use case** | Long-running batch processing, HPC | Short event-driven processing |
| **Server management** | None (uses managed EC2/Spot) | None (serverless) |

:::tip Exam pattern
"Process jobs that run for hours" → **AWS Batch**. "Process events in under 15 minutes" → **Lambda**.
:::

---

## Other Compute Services

### AWS Outposts
- AWS infrastructure in your data center — covered in [Global Infrastructure](./01-global-infrastructure)

### VMware Cloud on AWS
- Run VMware workloads natively on AWS
- Use case: Migrate VMware-based data centers to AWS without re-architecting
- Managed by VMware

### AWS Wavelength
- Ultra-low latency for 5G applications — covered in [Global Infrastructure](./01-global-infrastructure)

### AWS App Runner

**Simplest way** to deploy containerized web applications and APIs at scale — no infrastructure experience needed.

| Feature | Detail |
|---------|--------|
| **Source** | Container image (ECR) or source code (GitHub) |
| **Auto-scaling** | Built-in — scales from zero to high traffic automatically |
| **HTTPS** | Automatic TLS, load balancing, and health checks |
| **VPC access** | Can connect to private VPC resources (RDS, ElastiCache) |
| **Use case** | Web apps, APIs, microservices — when you want zero infrastructure management |

**App Runner vs Beanstalk vs ECS/Fargate:**
- **App Runner:** Simplest — no infrastructure config, auto-scales from zero
- **Beanstalk:** More control — configurable instances, deployment strategies
- **ECS/Fargate:** Most control — task definitions, service mesh, complex orchestration

:::tip Exam pattern
"Simplest way to deploy a containerized web app" → **App Runner** (simpler than ECS/Fargate or Beanstalk). "Deploy from source code or container image with zero config" → **App Runner**.
:::

### AWS Serverless Application Repository
- Discover and deploy pre-built serverless applications
- Publish and share your own Lambda-based applications

---

## Compute Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Steady-state production EC2" | Reserved Instances or Savings Plans |
| "Fault-tolerant batch processing" | Spot Instances |
| "Per-socket/per-core licensing" | Dedicated Hosts |
| "Low-latency HPC, tightly coupled" | Cluster Placement Group |
| "Max 7 instances per AZ, separate hardware" | Spread Placement Group |
| "Run containers without managing servers" | AWS Fargate |
| "Already using Kubernetes" | Amazon EKS |
| "Easiest web app deployment" | Elastic Beanstalk |
| "Process events < 15 min" | Lambda |
| "Long-running batch jobs (hours)" | AWS Batch |
| "Millions of TCP connections, static IP" | NLB |
| "Path-based HTTP routing" | ALB |
| "Inline firewall inspection" | GWLB |
| "Eliminate Lambda cold starts" | Provisioned Concurrency |
| "Highest I/O temp storage" | EC2 Instance Store |
| "Data must persist after instance stop" | EBS (not Instance Store) |
| "Simplest container deployment" | AWS App Runner |
| "Move private IP to standby instance" | Secondary ENI |
| "Auto-scale based on SQS queue depth" | ASG + custom CloudWatch metric |
