---
sidebar_position: 9
title: "08 — Security Services"
slug: 08-security-services
---

# Security Services

Domain 1 is 30% of the exam. Beyond IAM (covered in Chapter 2), you need to know encryption, threat detection, application protection, and data security services.

---

## AWS KMS (Key Management Service)

Managed **encryption key** service. Central to almost every "encryption" question on the exam.

### Key Types

| Key Type | Management | Cost | Rotation |
|----------|-----------|------|----------|
| **AWS Owned Keys** | AWS manages entirely | Free | AWS controls rotation |
| **AWS Managed Keys** | AWS creates/manages, you see in KMS | Free | Automatic (every 1 year) |
| **Customer Managed Keys (CMK)** | You create, control policies, enable/disable | $1/month + API calls | Optional automatic (every 1 year) or on-demand |
| **Imported Key Material** | You import your own key material | $1/month + API calls | Manual only. Can set expiration. |

### How KMS Encryption Works

**Envelope Encryption:**
1. You call `GenerateDataKey` → KMS returns a **plaintext data key** + **encrypted data key**
2. You use the plaintext data key to encrypt your data
3. Store the **encrypted data key** alongside the encrypted data
4. Delete the plaintext data key from memory
5. To decrypt: send the encrypted data key to KMS → get back plaintext data key → decrypt data

```
┌──────────────────────────────────────────────┐
│  Encrypted File                               │
│  ┌────────────────────┐  ┌─────────────────┐ │
│  │ Encrypted Data Key │  │ Encrypted Data  │ │
│  │ (encrypted by KMS) │  │ (encrypted by   │ │
│  │                    │  │  data key)      │ │
│  └────────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────┘
```

**Why envelope encryption?** KMS has a **4 KB limit** on direct encryption. For larger data, you must use a data key.

### KMS Key Policy

Every KMS key has a **key policy** (resource-based policy). Without a key policy, **nobody** can use the key — not even the root account.

**Default key policy:** Allows the root account full access. IAM policies can then grant usage.

**Cross-account KMS usage:**
1. Key policy must allow the external account
2. IAM policy in the external account must allow KMS actions

### KMS Multi-Region Keys

- **Same key material** replicated across Regions
- Same key ID in all Regions
- Encrypt in one Region, decrypt in another without re-encrypting or cross-Region API calls
- Use case: DynamoDB Global Tables encryption, Aurora Global Database, cross-Region S3 replication with encryption

### KMS API Rate Limits

| API | Shared Quota (per second per Region) |
|-----|-------------------------------------|
| `Encrypt`, `Decrypt`, `GenerateDataKey` | 5,500–30,000 (varies by Region and key type) |

**If throttled:** Use **data key caching** (via AWS Encryption SDK) or request a quota increase.

:::tip Exam pattern
"Audit who used encryption keys" → **KMS + CloudTrail**. "Encrypt at rest" → **KMS**. "SSE-KMS API throttling" → S3 uploads failing due to `GenerateDataKey` rate limit → reduce calls or request increase. "Cross-Region encryption" → **KMS Multi-Region Keys**.
:::

---

## AWS CloudHSM

**Dedicated Hardware Security Module** — you manage your own encryption keys in a tamper-resistant hardware device.

| Feature | KMS | CloudHSM |
|---------|-----|----------|
| **Management** | Shared multi-tenant AWS infrastructure | Dedicated single-tenant HSM hardware |
| **Key control** | AWS manages HSM, you manage key policies | You manage everything (keys + HSM cluster) |
| **Compliance** | FIPS 140-2 Level 3 | FIPS 140-2 **Level 3** |
| **Integration** | Native AWS service integration | SSL/TLS offloading, custom apps, Oracle TDE |
| **HA** | AWS-managed HA | You deploy HSMs across AZs (cluster) |
| **Key access** | AWS can help recover | **Irreversible** — if you lose keys, data is lost |

:::tip Exam pattern
"Full control over encryption keys" or "regulatory requirement for dedicated HSM" → **CloudHSM**. "SSL/TLS offloading with dedicated hardware" → **CloudHSM**.
:::

---

## AWS Certificate Manager (ACM)

**Provision, manage, and deploy SSL/TLS certificates**.

| Feature | Detail |
|---------|--------|
| **Public certificates** | Free. Automatically renewed. |
| **Private certificates** | Via ACM Private CA. Cost per certificate. |
| **Supported services** | ELB (ALB, NLB), CloudFront, API Gateway, Elastic Beanstalk |
| **Cannot use with** | EC2 directly (must use self-managed certs) |
| **Validation** | DNS validation (recommended — automated) or email validation |
| **Region requirement** | CloudFront requires cert in **us-east-1** |

### ACM + ELB Pattern

```
Client ──HTTPS──▶ ALB (SSL termination, ACM cert) ──HTTP──▶ EC2 instances
```

- SSL termination at the ALB — offloads encryption from EC2
- ALB handles certificate renewal automatically via ACM
- **End-to-end encryption:** ALB can also forward HTTPS to targets (requires certs on targets)

:::tip Exam pattern
"Manage SSL certificates with automatic renewal" → **ACM**. "HTTPS on CloudFront" → **ACM certificate in us-east-1**. "SSL termination at load balancer" → **ALB + ACM**.
:::

---

## AWS Secrets Manager

**Manage, rotate, and retrieve secrets** (database credentials, API keys, tokens).

| Feature | Detail |
|---------|--------|
| **Secret rotation** | Automatic rotation via Lambda (built-in for RDS, Redshift, DocumentDB) |
| **Encryption** | Encrypted at rest with KMS |
| **Cross-Region** | Replicate secrets to other Regions |
| **Integration** | RDS, Redshift, DocumentDB, Lambda, ECS, EKS, CloudFormation |
| **Versioning** | Maintains previous versions during rotation |
| **Access control** | IAM policies + resource-based policies |
| **Audit** | CloudTrail logs all API calls |

### Secrets Manager vs SSM Parameter Store

| Feature | Secrets Manager | SSM Parameter Store |
|---------|----------------|-------------------|
| **Auto-rotation** | Built-in (Lambda) | No native rotation |
| **Cost** | $0.40/secret/month | Free tier (Standard); $0.05/advanced/month |
| **Cross-Region replication** | Yes | No |
| **RDS integration** | Native rotation for RDS creds | Manual |
| **Use case** | Database credentials, API keys needing rotation | Configuration values, feature flags, simple secrets |

:::tip Exam pattern
"Rotate database credentials automatically" → **Secrets Manager**. "Store configuration values" → **SSM Parameter Store**. "Cross-Region secret replication" → **Secrets Manager**.
:::

---

## Amazon Cognito

**Authentication and authorization** for web and mobile applications.

### Cognito User Pools

| Feature | Detail |
|---------|--------|
| **Purpose** | User directory — sign-up, sign-in, password recovery |
| **Auth** | Username/password, social IdPs (Google, Facebook, Apple), SAML, OIDC |
| **Tokens** | Returns JWT tokens (ID token, access token, refresh token) |
| **MFA** | Supports SMS and TOTP MFA |
| **Customization** | Hosted UI, Lambda triggers for custom auth flows |
| **Integration** | API Gateway, ALB |

### Cognito Identity Pools (Federated Identities)

| Feature | Detail |
|---------|--------|
| **Purpose** | Provide **temporary AWS credentials** to access AWS services directly |
| **Auth sources** | Cognito User Pools, social IdPs, SAML, OIDC, anonymous access |
| **Output** | Temporary STS credentials (IAM role) |
| **Use case** | Mobile app directly accessing S3, DynamoDB, etc. |

### User Pools vs Identity Pools

```
User Pools                          Identity Pools
(Authentication)                    (Authorization / AWS Access)

User ──sign-in──▶ User Pool         Authenticated user ──▶ Identity Pool
                  │                                         │
                  ▼                                         ▼
              JWT Token ──▶ API Gateway     Temporary AWS Credentials (STS)
                            ALB                            │
                                                           ▼
                                              AWS Services (S3, DynamoDB...)
```

**Combined flow:** User signs in with User Pool → gets JWT → exchanges JWT with Identity Pool → gets AWS credentials → accesses AWS services.

:::tip Exam pattern
"Web/mobile app user authentication" → **Cognito User Pools**. "Mobile app directly accessing S3/DynamoDB" → **Cognito Identity Pools**. "Social login (Google, Facebook)" → **Cognito User Pools** (federation).
:::

---

## AWS WAF (Web Application Firewall)

**Filter HTTP/HTTPS requests** at Layer 7. Protects against common web exploits.

| Feature | Detail |
|---------|--------|
| **Deployed on** | CloudFront, ALB, API Gateway (REST), AppSync, Cognito User Pool |
| **Web ACL** | Collection of rules that define allow/block/count/CAPTCHA actions |
| **Rule types** | IP-based, geo-based, rate-based, SQL injection, XSS, size constraints, regex |
| **Managed rules** | AWS Managed Rules (free), AWS Marketplace rules (paid) |
| **Rate limiting** | Block IPs exceeding request rate threshold |
| **Bot control** | Managed rule group to detect and manage bot traffic |
| **IP sets** | Up to 10,000 IPs per IP set |
| **Logging** | CloudWatch, S3, Kinesis Data Firehose |

### WAF Rule Groups

| Type | Examples |
|------|---------|
| **AWS Managed Rules** | Core Rule Set (CRS), SQL injection, XSS, known bad inputs, Amazon IP reputation |
| **Marketplace Rules** | F5, Fortinet, Imperva |
| **Custom Rules** | Your own rules based on request attributes |

:::tip Exam pattern
"Protect against SQL injection / XSS" → **WAF**. "Block specific IPs" → **WAF IP set** (or NACL for VPC level). "Rate limit API requests" → **WAF rate-based rule** or **API Gateway throttling**. "Block requests from specific countries" → **WAF geo-match** or **CloudFront geo-restriction**.
:::

---

## AWS Shield

**DDoS protection** service.

| Tier | Cost | Features |
|------|------|----------|
| **Shield Standard** | **Free** | Always-on. Layer 3/4 protection. All AWS customers. |
| **Shield Advanced** | $3,000/month | Enhanced Layer 3/4/7 DDoS protection. 24/7 DDoS Response Team (DRT). Cost protection (credits for scaling charges during attack). Attack diagnostics. WAF included free. Protects: EC2, ELB, CloudFront, Global Accelerator, Route 53. |

:::tip Exam pattern
"DDoS protection" → **Shield Standard** (free, always on). "Advanced DDoS with response team and cost protection" → **Shield Advanced**.
:::

---

## Amazon GuardDuty

**Intelligent threat detection** using ML. Analyzes multiple data sources.

| Feature | Detail |
|---------|--------|
| **Data sources** | CloudTrail logs, VPC Flow Logs, DNS logs, S3 data events, EKS audit logs, RDS login activity, Lambda network activity, EBS volumes (malware) |
| **Detection** | Cryptocurrency mining, unauthorized access, compromised instances, data exfiltration, privilege escalation |
| **Output** | Findings → EventBridge (trigger Lambda, SNS, etc.) |
| **Multi-account** | Centralize via AWS Organizations (delegated administrator) |
| **No infrastructure** | One-click enable, no agents, no log management |
| **30-day free trial** | Then pay per data volume analyzed |

:::tip Exam pattern
"Detect threats without managing infrastructure" → **GuardDuty**. "Detect cryptocurrency mining on EC2" → **GuardDuty**. "Analyze VPC Flow Logs for threats" → **GuardDuty**.
:::

---

## Amazon Macie

**Discover, classify, and protect sensitive data** in S3 using ML.

| Feature | Detail |
|---------|--------|
| **Purpose** | Find PII (personally identifiable information), PHI, financial data in S3 |
| **Detection** | ML + pattern matching for credit cards, SSN, passports, etc. |
| **Output** | Findings → EventBridge → Lambda/SNS for remediation |
| **Multi-account** | Via AWS Organizations |
| **Use case** | Compliance (GDPR, HIPAA), data loss prevention |

:::tip Exam pattern
"Find sensitive data (PII) in S3 buckets" → **Macie**. "Compliance scanning for personal data" → **Macie**.
:::

---

## Amazon Inspector

**Automated vulnerability assessment** for EC2 instances, container images (ECR), and Lambda functions.

| Feature | Detail |
|---------|--------|
| **EC2** | Scans for OS vulnerabilities, network reachability |
| **ECR** | Scans container images for known CVEs |
| **Lambda** | Scans function code and dependencies |
| **Agent** | Uses SSM Agent (no separate agent install) |
| **Output** | Findings with severity, affected resource, remediation guidance |
| **Continuous** | Automatically scans when new instances launch or new images are pushed |

:::tip Exam pattern
"Scan EC2 for vulnerabilities" → **Inspector**. "Scan container images for CVEs" → **Inspector**. "Network reachability analysis" → **Inspector**.
:::

---

## Amazon Detective

**Investigate and analyze security findings**. Complements GuardDuty.

| Feature | Detail |
|---------|--------|
| **Purpose** | Root cause analysis of security findings |
| **Data sources** | VPC Flow Logs, CloudTrail, GuardDuty findings, EKS |
| **How** | Graph model that correlates events across resources and time |
| **Use case** | Deep investigation after GuardDuty detects something |

**GuardDuty detects → Detective investigates.**

---

## AWS Security Hub

**Central security dashboard** — aggregates findings from multiple security services.

| Feature | Detail |
|---------|--------|
| **Aggregates from** | GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, third-party tools |
| **Standards** | AWS Foundational Security Best Practices, CIS AWS Foundations, PCI DSS |
| **Automation** | Auto-remediate findings via EventBridge → Lambda/SSM |
| **Multi-account** | Via AWS Organizations (cross-account, cross-Region) |
| **Dashboard** | Overall security score, compliance status |

:::tip Exam pattern
"Centralized view of security findings" → **Security Hub**. "Automated compliance checks" → **Security Hub with security standards**.
:::

---

## AWS Firewall Manager

**Centrally manage firewall rules** across accounts in AWS Organizations.

| Feature | Detail |
|---------|--------|
| **Manages** | WAF rules, Shield Advanced, Security Groups, Network Firewall, Route 53 Resolver DNS Firewall |
| **Scope** | All accounts in an Organization |
| **Use case** | Enforce WAF rules on all ALBs, ensure Shield Advanced on all resources |
| **Prerequisite** | AWS Organizations, AWS Config enabled |

:::tip Exam pattern
"Apply WAF rules across all accounts" → **Firewall Manager**. "Centrally manage security groups" → **Firewall Manager**.
:::

---

## AWS Nitro Enclaves

**Isolated compute environment** within an EC2 instance for processing highly sensitive data.

| Feature | Detail |
|---------|--------|
| **Purpose** | Process sensitive data (PII, healthcare, financial) in a hardware-isolated environment |
| **Isolation** | No persistent storage, no interactive access, no external networking — fully isolated from the parent instance |
| **Attestation** | Cryptographic attestation proves the enclave is running trusted code (via KMS integration) |
| **Use case** | Process credit card numbers, private keys, healthcare records without exposing them to the OS or users |
| **KMS integration** | Only the enclave can decrypt data — even the instance owner/root cannot access the data inside the enclave |

:::tip Exam pattern
"Process sensitive data in an isolated environment on EC2" → **Nitro Enclaves**. "Ensure even administrators cannot access data being processed" → **Nitro Enclaves**.
:::

---

## AWS Artifact

**Compliance reports and agreements** — self-service portal.

| Feature | Detail |
|---------|--------|
| **Artifact Reports** | Download AWS compliance reports (SOC, PCI, ISO, etc.) |
| **Artifact Agreements** | Review and accept agreements (BAA for HIPAA, etc.) |
| **Use case** | Auditors need AWS compliance documentation |

---

## AWS Audit Manager

**Continuously audit** AWS usage for compliance.

| Feature | Detail |
|---------|--------|
| **Purpose** | Automate evidence collection for audits |
| **Frameworks** | PCI DSS, GDPR, HIPAA, SOC 2, and custom frameworks |
| **Evidence** | Automatically collects from CloudTrail, Config, Security Hub |
| **Use case** | Prepare for compliance audits, demonstrate control effectiveness |

---

## Data Security Controls Summary

### Encryption at Rest

| Service | Encryption Method |
|---------|------------------|
| S3 | SSE-S3 (default), SSE-KMS, SSE-C, client-side |
| EBS | KMS (AES-256) — can enable by default |
| EFS | KMS |
| RDS | KMS (set at creation, can't change later) |
| DynamoDB | AWS owned key (default) or KMS CMK |
| Redshift | KMS or CloudHSM |
| ElastiCache | KMS (Redis only) |
| SQS | SSE-SQS or SSE-KMS |
| SNS | SSE-KMS |

### Encryption in Transit

| Method | Used By |
|--------|---------|
| **TLS/SSL** | All AWS API endpoints (HTTPS), RDS connections, ELB listeners |
| **ACM certificates** | ALB, NLB, CloudFront, API Gateway |
| **VPN (IPSec)** | Site-to-Site VPN, Client VPN |
| **Direct Connect + VPN** | Encrypted dedicated connection |

### Key Rotation

| Service | Rotation |
|---------|----------|
| KMS customer managed keys | Automatic every year (optional), on-demand |
| KMS AWS managed keys | Automatic every year (mandatory) |
| Secrets Manager | Automatic via Lambda (configurable schedule) |
| ACM certificates | Automatic renewal (for DNS-validated certs) |
| IAM access keys | Manual (use credential report to identify old keys) |

---

## Security Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Encrypt data at rest" | KMS |
| "Full control over HSM" | CloudHSM |
| "Manage SSL/TLS certificates" | ACM |
| "Rotate database credentials" | Secrets Manager |
| "Web/mobile user sign-up/sign-in" | Cognito User Pools |
| "Mobile app access to S3 directly" | Cognito Identity Pools |
| "Block SQL injection/XSS" | WAF |
| "DDoS protection" | Shield (Standard = free, Advanced = paid) |
| "Detect threats (ML-based)" | GuardDuty |
| "Find PII in S3" | Macie |
| "Scan EC2 for vulnerabilities" | Inspector |
| "Investigate security incidents" | Detective |
| "Centralized security dashboard" | Security Hub |
| "Manage WAF across accounts" | Firewall Manager |
| "Compliance reports" | Artifact |
| "Audit evidence collection" | Audit Manager |
| "Cross-account key sharing" | KMS key policy + IAM policy |
| "Prevent object deletion" | S3 Object Lock (WORM) |
| "Immutable backup" | Glacier Vault Lock or Backup Vault Lock |
| "Process sensitive data in isolation" | Nitro Enclaves |
