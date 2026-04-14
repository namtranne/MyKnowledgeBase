---
sidebar_position: 6
title: "05 — Networking"
slug: 05-networking
---

# Networking

Networking is woven into every exam domain — VPC security for Domain 1, multi-AZ/Region for Domain 2, CloudFront/Global Accelerator for Domain 3, and NAT/endpoint cost for Domain 4.

---

## VPC (Virtual Private Cloud)

A VPC is your **private, isolated network** in AWS. You control IP ranges, subnets, routing, and security.

### VPC Architecture

```
VPC (10.0.0.0/16) — Region: us-east-1
│
├── Public Subnet (10.0.1.0/24) — AZ-a
│   ├── Route Table → 0.0.0.0/0 → Internet Gateway
│   ├── Web Server (EC2) — public IP
│   └── NAT Gateway (for private subnet outbound)
│
├── Private Subnet (10.0.2.0/24) — AZ-a
│   ├── Route Table → 0.0.0.0/0 → NAT Gateway
│   ├── App Server (EC2) — no public IP
│   └── RDS instance
│
├── Public Subnet (10.0.3.0/24) — AZ-b
│   ├── Route Table → 0.0.0.0/0 → Internet Gateway
│   └── Web Server (EC2) — public IP
│
├── Private Subnet (10.0.4.0/24) — AZ-b
│   ├── Route Table → 0.0.0.0/0 → NAT Gateway
│   ├── App Server (EC2) — no public IP
│   └── RDS instance (Multi-AZ standby)
│
├── Internet Gateway (IGW) — one per VPC
├── NAT Gateway (in each public subnet for HA)
└── VPC Endpoints (for S3, DynamoDB, etc.)
```

### VPC Key Concepts

| Concept | Detail |
|---------|--------|
| **CIDR block** | IP range for the VPC (e.g., `10.0.0.0/16` = 65,536 IPs). Min /28, max /16. |
| **Secondary CIDRs** | Can add up to 5 CIDR blocks (expandable to 50) |
| **Default VPC** | Every account has one per Region. Has public subnets, IGW, default SG/NACL. |
| **DNS hostnames** | Must enable for instances to get public DNS names |
| **DNS resolution** | Enabled by default — Route 53 Resolver handles DNS queries |

### Subnets

- **Public subnet:** Has a route to an **Internet Gateway** (IGW). Instances can have public IPs.
- **Private subnet:** No route to IGW. Uses **NAT Gateway** for outbound internet access.
- Subnets are **AZ-scoped** — each subnet lives in exactly one AZ.
- AWS **reserves 5 IPs** per subnet (first 4 + last 1): network, VPC router, DNS, future use, broadcast.

### Internet Gateway (IGW)

- Allows internet access for instances in **public subnets**
- **One per VPC**
- Performs **NAT** for instances with public IPv4 addresses
- Horizontally scaled, redundant, no bandwidth limits
- Must add a route: `0.0.0.0/0 → IGW` in the public subnet route table

### NAT Gateway

- Allows **private subnet** instances to reach the internet (outbound only)
- Managed, HA **within a single AZ**
- For **multi-AZ HA:** Deploy one NAT Gateway **per AZ** (each in a public subnet)
- **5-45 Gbps** bandwidth (auto-scales)
- Not free — per-hour + per-GB data processing charges
- Cannot be used by instances in the same subnet

**NAT Instance (legacy):**
- Self-managed EC2 instance acting as NAT
- Must disable source/destination check
- Lower cost for small workloads but **not recommended** — use NAT Gateway

:::tip Exam pattern
"Reduce NAT Gateway cost" → Use **VPC Gateway Endpoints** for S3/DynamoDB (free, avoids NAT). "HA for NAT" → NAT Gateway **per AZ**. "NAT instance vs NAT Gateway" → **NAT Gateway** (managed, scalable).
:::

### Elastic IP (EIP)

- Static IPv4 address
- Can attach to one instance or NAT Gateway at a time
- **Charged when NOT associated** with a running instance (to discourage waste)
- Max 5 per Region (soft limit)

---

## Security Groups vs NACLs

| Feature | Security Group | Network ACL (NACL) |
|---------|---------------|-------------------|
| **Scope** | Instance (ENI) level | Subnet level |
| **State** | **Stateful** — return traffic auto-allowed | **Stateless** — must explicitly allow return traffic |
| **Rules** | **Allow only** | Allow **AND** Deny |
| **Default** | Deny all inbound, allow all outbound | Allow all inbound and outbound |
| **Evaluation** | All rules evaluated together | Rules evaluated **in order** (lowest number first, first match wins) |
| **Applied to** | Assigned to instances | Automatically applies to all instances in the subnet |
| **Changes** | Take effect immediately | Take effect immediately |

### Security Group Key Points

- Can reference **another security group** as a source (e.g., "allow traffic from SG of ALB")
- Can reference IPs or CIDR blocks
- **Cannot deny** specific IPs — only allow
- Default SG: allows all traffic from instances in the same SG, allows all outbound
- Max **60 inbound + 60 outbound** rules per SG (adjustable)

### NACL Key Points

- **Numbered rules** — evaluated lowest to highest. First match wins. Highest = `*` (default deny).
- Best practice: Number rules in increments of 100 (100, 200, 300…) for easy insertion
- **Ephemeral ports:** Return traffic uses ephemeral ports (1024-65535). NACL outbound rules must allow these.
- Default NACL: allows all. Custom NACLs: **deny all** by default.

:::tip Exam pattern
"Block a specific IP address" → **NACL** (deny rule). Security groups can only allow.
"Allow traffic from ALB to instances" → **Security Group** referencing ALB's SG.
"Subnet-level firewall" → **NACL**.
:::

---

## VPC Endpoints

**Private connectivity** to AWS services without going through the internet, NAT, or VPN.

### Gateway Endpoints

| Feature | Detail |
|---------|--------|
| **Services** | **S3** and **DynamoDB** only |
| **How** | Route table entry pointing to the endpoint |
| **Cost** | **Free** |
| **HA** | Built-in |
| **Policy** | VPC Endpoint Policy to restrict access |

### Interface Endpoints (PrivateLink)

| Feature | Detail |
|---------|--------|
| **Services** | Most AWS services (SQS, SNS, KMS, CloudWatch, etc.) |
| **How** | **ENI** (elastic network interface) in your subnet with a private IP |
| **Cost** | Per-hour + per-GB data processed |
| **HA** | Deploy in multiple AZs |
| **DNS** | Private DNS resolves service hostname to the endpoint IP |
| **Security** | Security groups on the ENI |

:::tip Exam pattern
"Access S3 from private subnet without internet" → **S3 Gateway Endpoint** (free).
"Access SQS/KMS/CloudWatch from private subnet" → **Interface Endpoint**.
"Reduce NAT Gateway data transfer cost" → Gateway/Interface Endpoints.
:::

---

## VPC Connectivity

### VPC Peering

| Feature | Detail |
|---------|--------|
| **What** | Direct network connection between two VPCs |
| **Routing** | **Non-transitive** — A↔B and B↔C does NOT mean A↔C |
| **Cross-Region** | Yes |
| **Cross-account** | Yes |
| **CIDR** | Must **not overlap** |
| **Limit** | Update route tables in both VPCs |

### Transit Gateway

| Feature | Detail |
|---------|--------|
| **What** | Regional hub connecting VPCs, VPNs, Direct Connect |
| **Routing** | **Transitive** — hub-and-spoke model |
| **Scale** | Thousands of VPCs and on-prem networks |
| **Cross-Region** | Transit Gateway peering between Regions |
| **Features** | Route tables, multicast, ECMP for VPN bandwidth |
| **Use case** | Large enterprise networks, replace complex peering meshes |

```
                  Transit Gateway
                  ┌─────────────┐
     VPC-A ◄─────►│             │◄─────► VPN to on-prem
     VPC-B ◄─────►│   Hub       │◄─────► Direct Connect
     VPC-C ◄─────►│             │◄─────► Transit GW (other Region)
     VPC-D ◄─────►│             │
                  └─────────────┘
```

**ECMP (Equal-Cost Multi-Path):** Use multiple VPN tunnels to increase VPN bandwidth via Transit Gateway.

### Site-to-Site VPN

| Feature | Detail |
|---------|--------|
| **Connection** | Encrypted tunnel over **public internet** |
| **Components** | **Virtual Private Gateway** (AWS side) + **Customer Gateway** (on-prem side) |
| **Bandwidth** | Up to 1.25 Gbps per tunnel (2 tunnels per VPN connection) |
| **Latency** | Variable (public internet) |
| **Setup time** | Minutes |
| **Cost** | Per VPN connection-hour + data transfer |

**VPN CloudHub:** Multiple VPN connections to a single Virtual Private Gateway — enables spoke-to-spoke communication between branch offices via AWS.

### AWS Direct Connect

| Feature | Detail |
|---------|--------|
| **Connection** | **Dedicated private fiber** — not over the internet |
| **Bandwidth** | 1 Gbps, 10 Gbps, 100 Gbps (Dedicated); 50 Mbps–10 Gbps (Hosted) |
| **Latency** | Consistent, low latency |
| **Encryption** | **Not encrypted by default** — add VPN on top for encryption |
| **Setup time** | Weeks to months (physical installation) |
| **Resiliency** | Single connection = single point of failure |

**Direct Connect HA patterns:**
- **High resiliency:** Two connections at two different Direct Connect locations
- **Maximum resiliency:** Two connections at each of two different locations (4 total)
- **Fallback:** Direct Connect primary + VPN backup

**Direct Connect Gateway:** Connect a Direct Connect to VPCs in **multiple Regions**.

**Virtual Interfaces (VIFs):**
- **Public VIF:** Access AWS public services (S3, DynamoDB) over Direct Connect
- **Private VIF:** Access VPC resources
- **Transit VIF:** Access VPCs via Transit Gateway

### AWS PrivateLink (VPC Endpoint Services)

- Expose a service in your VPC to other VPCs **without peering, VPN, or public internet**
- Service provider: NLB → VPC Endpoint Service
- Service consumer: Interface Endpoint in their VPC → connects to the service
- **One-directional** — consumer accesses provider's service
- Does NOT require matching CIDRs
- Scales to thousands of consumers

```
Provider VPC                         Consumer VPC
┌──────────────┐                    ┌──────────────┐
│  Service     │                    │              │
│  (behind NLB)│◄── PrivateLink ──▶│  Interface   │
│              │    (AWS backbone)  │  Endpoint    │
└──────────────┘                    └──────────────┘
```

:::tip Exam pattern
"Expose service to other VPCs without peering" → **PrivateLink** (NLB + Endpoint Service).
"Hub and spoke network for many VPCs" → **Transit Gateway**.
"Encrypted connection over public internet" → **Site-to-Site VPN**.
"Dedicated private connection" → **Direct Connect**.
"Encrypt Direct Connect traffic" → **VPN over Direct Connect**.
:::

---

## Route 53

AWS's **DNS service** and **domain registrar**. Global service.

### Record Types

| Type | Purpose |
|------|---------|
| **A** | Maps hostname to IPv4 address |
| **AAAA** | Maps hostname to IPv6 address |
| **CNAME** | Maps hostname to another hostname. **Cannot** be used for zone apex (e.g., `example.com`). |
| **Alias** | AWS-specific. Maps hostname to AWS resource. **Can** be used for zone apex. Free for AWS resources. |
| **MX** | Mail exchange servers |
| **NS** | Name servers for the hosted zone |
| **TXT** | Text records (verification, SPF) |

**Alias vs CNAME:**
- **Alias:** Free, works at zone apex, targets: ELB, CloudFront, S3 website, API Gateway, VPC Interface Endpoint, Global Accelerator, Route 53 record in same zone
- **CNAME:** Costs per query, **cannot** be zone apex, can target any hostname
- **Alias cannot target EC2 public DNS**

### Routing Policies

| Policy | How It Works | Use Case |
|--------|-------------|----------|
| **Simple** | Returns one or more values. No health checks (client chooses randomly). | Basic DNS resolution |
| **Weighted** | Distribute traffic by weight (e.g., 70/30). Health checks supported. | A/B testing, gradual migration |
| **Latency-based** | Route to the Region with lowest latency for the user. | Multi-Region applications |
| **Failover** | Primary + secondary with health checks. Automatic failover. | Active-passive DR |
| **Geolocation** | Route based on user's **geographic location** (continent, country, state). | Content localization, compliance, restrict access |
| **Geoproximity** | Route based on geographic distance. Adjustable **bias** to shift traffic. | Gradually shift traffic between Regions |
| **Multi-value** | Return up to 8 healthy records. Client picks one. | Client-side load balancing (not a substitute for ELB) |
| **IP-based** | Route based on client IP CIDR ranges. | Optimize for specific ISPs, routing costs |

### Health Checks

- Monitor endpoint health (HTTP, HTTPS, TCP)
- **Interval:** 30 seconds (standard) or 10 seconds (fast, higher cost)
- **Threshold:** Configurable number of consecutive failures to mark unhealthy
- Can monitor: endpoints, other health checks (**calculated health checks**), CloudWatch alarms
- Health checkers are global — requests come from multiple Regions

**Calculated health checks:** Combine multiple health checks with AND, OR, NOT logic.

### Hosted Zones

- **Public Hosted Zone:** Resolves names on the public internet
- **Private Hosted Zone:** Resolves names within your VPCs (enable DNS resolution and DNS hostnames in VPC)

**Cost:** $0.50/month per hosted zone + per-query charges (Alias queries to AWS resources are free).

### Route 53 Resolver

- Enables DNS resolution between your VPC and on-premises network
- **Inbound Endpoint:** On-prem → can resolve AWS private DNS names
- **Outbound Endpoint:** VPC → can resolve on-prem DNS names (forward rules)

---

## Amazon CloudFront

**Content Delivery Network (CDN)** — caches content at 400+ edge locations worldwide.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Distribution** | A CloudFront configuration — one or more origins, caching behaviors, domain name |
| **Origin** | Source of content: S3 bucket, ALB, EC2, API Gateway, custom HTTP server |
| **Edge Location** | Where content is cached (400+ worldwide) |
| **Regional Edge Cache** | Larger cache between edge and origin — reduces origin load |
| **TTL** | How long objects stay in cache (default 24 hours) |

### Origin Types

| Origin | Access Control | Notes |
|--------|---------------|-------|
| **S3 bucket** | **Origin Access Control (OAC)** — recommended. Restricts S3 to CloudFront only. | Replace legacy OAI (Origin Access Identity). |
| **ALB / EC2 / Custom origin** | Security group must allow CloudFront IPs | ALB must be public. EC2 can be public. |
| **API Gateway** | API Gateway resource policy | Edge-optimized or Regional |
| **MediaStore / MediaPackage** | IAM-based | Video streaming |

### Caching Behavior

- **Cache based on:** URL path, query strings, headers, cookies
- **Cache key:** Determines what's considered a unique cached object
- **Cache Policy:** What to include in the cache key (query strings, headers, cookies)
- **Origin Request Policy:** What to forward to the origin (may include more than cache key)

**Invalidation:** Force removal of cached objects before TTL expiry. Use `/*` for all or specific paths. Costs per invalidation request.

### CloudFront Security

| Feature | Detail |
|---------|--------|
| **HTTPS** | Viewer → CloudFront (required), CloudFront → Origin (configurable) |
| **SSL certs** | ACM certificate in **us-east-1** (required for CloudFront) |
| **SNI** | Server Name Indication — multiple SSL certs per edge location |
| **Geo-restriction** | Allowlist or blocklist countries |
| **Signed URLs** | Time-limited access to individual files |
| **Signed Cookies** | Time-limited access to multiple files |
| **WAF integration** | Attach WAF Web ACL for Layer 7 protection |
| **Shield** | Standard (free) + Advanced (DDoS protection) |
| **Field-level encryption** | Encrypt specific POST fields at edge (e.g., credit card) |

**Signed URLs vs Signed Cookies:**
- **Signed URL:** One URL per file. Best for individual file access.
- **Signed Cookie:** One cookie for multiple files. Best for streaming or entire website access.

### CloudFront Functions vs Lambda@Edge

| Feature | CloudFront Functions | Lambda@Edge |
|---------|---------------------|-------------|
| **Location** | Edge Locations | Regional Edge Caches |
| **Language** | JavaScript | Node.js, Python |
| **Max time** | < 1 ms | 5–30 sec |
| **Max memory** | 2 MB | Up to 10 GB |
| **Triggers** | Viewer request/response only | Viewer + Origin request/response |
| **Network** | No | Yes |
| **Use case** | Header manipulation, URL rewrites, cache key normalization | Authentication, image resize, origin selection |

---

## AWS Global Accelerator

Uses the **AWS global network** to improve performance for global applications.

| Feature | Detail |
|---------|--------|
| **Static IPs** | 2 static anycast IPs (globally routed) |
| **Protocol** | TCP, UDP |
| **Endpoints** | ALB, NLB, EC2, Elastic IPs |
| **Health checks** | Automatic failover between endpoints |
| **Performance** | Routes traffic over AWS backbone (not public internet) — consistent low latency |

### CloudFront vs Global Accelerator

| Feature | CloudFront | Global Accelerator |
|---------|-----------|-------------------|
| **Purpose** | Cache content at edge | Route traffic over AWS network |
| **Content** | Static + dynamic | Dynamic (TCP/UDP) |
| **Caching** | Yes | No |
| **Protocol** | HTTP/HTTPS/WebSocket | TCP/UDP |
| **Static IP** | No (uses DNS) | Yes (2 anycast IPs) |
| **Use case** | CDN, static websites, video | Gaming, IoT, VoIP, financial trading |

:::tip Exam pattern
"Improve performance for cacheable content" → **CloudFront**.
"Static IP + TCP/UDP acceleration" → **Global Accelerator**.
"Failover between multi-Region endpoints with static IP" → **Global Accelerator**.
:::

---

## VPC Flow Logs

Capture information about **IP traffic** going to/from network interfaces in your VPC.

| Feature | Detail |
|---------|--------|
| **Levels** | VPC, Subnet, or ENI level |
| **Destinations** | CloudWatch Logs, S3, Kinesis Data Firehose |
| **Content** | Source/dest IP, port, protocol, packets, bytes, action (accept/reject), timestamp |
| **Cost** | Data ingestion + storage charges |
| **Limitation** | Doesn't capture content — only metadata |

**What Flow Logs DON'T capture:**
- DNS queries to Route 53 Resolver
- DHCP traffic
- Traffic to 169.254.169.254 (metadata)
- Traffic to/from Windows license activation
- Traffic between an endpoint and a Network Load Balancer

:::tip Exam pattern
"Monitor network traffic" or "troubleshoot connectivity" → **VPC Flow Logs**.
"Detect threats from network activity" → **GuardDuty** (analyzes Flow Logs automatically).
:::

---

## Network Firewall

**Managed firewall** service for VPC — stateful inspection, intrusion prevention, web filtering.

| Feature | Detail |
|---------|--------|
| **Layer** | Layer 3–7 |
| **Rules** | IP, port, protocol, domain name filtering, Suricata-compatible IPS rules |
| **Deployment** | Per AZ in a VPC (firewall endpoint) |
| **Integration** | Route traffic through firewall via VPC routing |
| **Use case** | Fine-grained network filtering beyond security groups and NACLs |

**Network Firewall vs Security Group vs NACL vs WAF:**
- **Security Group:** Instance-level, stateful, allow-only
- **NACL:** Subnet-level, stateless, allow/deny
- **WAF:** HTTP/HTTPS Layer 7, on ALB/CloudFront/API Gateway
- **Network Firewall:** VPC-level, Layer 3-7, IPS/IDS, domain filtering

---

## AWS Client VPN

- Managed **OpenVPN-based** VPN for individual users to connect to AWS
- Users install VPN client software → connect to AWS VPC
- Supports AD integration, MFA, certificate-based authentication
- Use case: Remote employees accessing private VPC resources

---

## Networking Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Block a specific IP" | NACL deny rule |
| "Allow traffic from ALB to EC2" | Security Group referencing ALB's SG |
| "Private subnet access to S3 without internet" | S3 Gateway Endpoint (free) |
| "Private subnet access to SQS/KMS" | Interface Endpoint |
| "Connect 50 VPCs + on-prem" | Transit Gateway |
| "Connect 2 VPCs directly" | VPC Peering |
| "Expose service to other VPCs" | PrivateLink (NLB + Endpoint Service) |
| "Dedicated private connection to AWS" | Direct Connect |
| "Quick encrypted connection to AWS" | Site-to-Site VPN |
| "Encrypt Direct Connect traffic" | VPN over Direct Connect |
| "Active-passive DR with DNS" | Route 53 Failover routing |
| "Route users to nearest Region" | Route 53 Latency-based routing |
| "Cache content globally" | CloudFront |
| "Static IP + TCP/UDP global routing" | Global Accelerator |
| "HA for NAT" | NAT Gateway per AZ |
| "Firewall at VPC level with IPS" | AWS Network Firewall |
| "Remote users connect to VPC" | AWS Client VPN |
