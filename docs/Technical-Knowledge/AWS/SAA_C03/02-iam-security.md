---
sidebar_position: 3
title: "02 — IAM & Secure Access"
slug: 02-iam-security
---

# IAM & Secure Access

IAM is the foundation of **everything** in AWS. Every API call is authenticated and authorized through IAM. This topic is part of Domain 1 (30% of the exam) — understand it deeply.

---

## IAM Fundamentals

### Root Account

The **root account** is the email/password used to create the AWS account. It has **unrestricted access** to everything.

**Security best practices for root:**
- ✅ Enable MFA immediately (hardware MFA preferred)
- ✅ Create an IAM admin user for daily work
- ✅ Delete root access keys if they exist
- ✅ Use root only for tasks that require it (changing account settings, closing account, restoring IAM permissions, changing support plan, enabling S3 in an older account)
- ❌ Never use root for daily tasks
- ❌ Never share root credentials

### IAM Users

Individual identities for people or applications. Each user can have:
- **Console password** — for AWS Management Console access
- **Access keys** (access key ID + secret access key) — for API/CLI/SDK access
- Users belong to **one AWS account** and have **no permissions by default**

:::warning
**Never embed access keys in application code or on EC2 instances.** Use IAM roles instead. This is a very common exam question.
:::

### IAM Groups

Collections of IAM users. Purpose: simplify permission management.

- Attach policies to groups, not individual users
- A user can belong to **multiple groups** (max 10)
- Groups **cannot be nested** (no groups within groups)
- Groups are **not identities** — you can't reference a group in a resource-based policy's `Principal`

### IAM Roles

Temporary credentials assumed by users, applications, or AWS services. **No permanent credentials** — uses STS (Security Token Service) to issue temporary tokens.

**When to use roles (exam favorites):**

| Scenario | Role Type |
|----------|-----------|
| EC2 instance needs S3/DynamoDB access | **Instance Profile** (role wrapper for EC2) |
| Lambda function needs DynamoDB access | **Execution Role** |
| Cross-account access | **Cross-Account Role** with trust policy |
| Federated users (SAML/OIDC) | **Federation Role** |
| AWS service needs to act on your behalf | **Service-Linked Role** |

**Role components:**
1. **Trust Policy:** Who can assume this role (the "who")
2. **Permission Policy:** What the role can do (the "what")
3. **Session duration:** How long temporary credentials last (1–12 hours)

```json
// Trust policy - who can assume this role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

## IAM Policies Deep Dive

### Policy Structure

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        },
        "Bool": {
          "aws:SecureTransport": "true"
        }
      }
    }
  ]
}
```

| Field | Purpose |
|-------|---------|
| `Version` | Always `"2012-10-17"` (the current policy language version) |
| `Statement` | Array of permission rules |
| `Sid` | Optional identifier for the statement |
| `Effect` | `Allow` or `Deny` |
| `Action` | API actions (e.g., `s3:GetObject`, `ec2:RunInstances`) |
| `Resource` | ARNs of resources the actions apply to |
| `Condition` | Optional conditions (IP, time, MFA, tags, encryption, etc.) |

### Policy Evaluation Logic

```
  Start
    │
    ▼
  Explicit DENY in any policy?  ──YES──▶  DENIED
    │
    NO
    │
    ▼
  Explicit ALLOW in any policy? ──YES──▶  ALLOWED
    │                                     (if also allowed by
    NO                                     SCP, permission boundary,
    │                                      and resource policy)
    ▼
  DENIED (implicit deny)
```

**Critical rules:**
1. By default, everything is **denied** (implicit deny)
2. An explicit **Allow** grants access
3. An explicit **Deny** ALWAYS wins — even over an explicit Allow
4. All applicable policies are evaluated together (union)
5. Cross-account: BOTH the identity policy AND resource policy must allow

### Policy Types

| Policy Type | Attached To | Purpose | Key Detail |
|-------------|------------|---------|------------|
| **Identity-based (managed)** | Users, groups, roles | "What can this identity do?" | AWS managed (predefined) or customer managed |
| **Identity-based (inline)** | Single user, group, or role | Strict 1:1 relationship | Deleted when identity is deleted |
| **Resource-based** | S3, SQS, KMS, SNS, Lambda, etc. | "Who can access this resource?" | Has a `Principal` field. Enables cross-account access. |
| **Permission Boundaries** | IAM users and roles | Maximum permissions ceiling | Doesn't grant — only limits. Intersection with identity policy. |
| **Service Control Policies (SCPs)** | AWS Organizations OUs/accounts | Maximum permissions for an account | Doesn't grant — only limits. Applied to all principals in the account. |
| **Session Policies** | STS sessions | Limit permissions for a session | Passed when assuming a role or federating |
| **Access Control Lists (ACLs)** | S3 buckets, objects | Legacy cross-account access | Mostly replaced by bucket policies |
| **VPC Endpoint Policies** | VPC endpoints | Control access through VPC endpoints | Restrict which principals/actions can use the endpoint |

### Permission Boundaries

A **permission boundary** sets the **maximum permissions** an IAM entity can have. It doesn't grant permissions — it only restricts.

**Effective permissions** = Permission Boundary ∩ Identity Policy

```
┌─────────────────────────────────┐
│     Permission Boundary         │
│   (max allowed permissions)     │
│                                 │
│    ┌──────────────────┐         │
│    │  Identity Policy │         │
│    │  (Allow s3:*)    │         │
│    │                  │ ◄── Only this intersection is effective
│    └──────────────────┘         │
│                                 │
└─────────────────────────────────┘
```

Use case: Allow developers to create IAM roles but constrain them — "You can create roles, but only with permissions within this boundary."

:::tip Exam pattern
When a question says "delegate IAM administration while preventing privilege escalation," think **permission boundaries**.
:::

---

## AWS Security Token Service (STS)

STS provides **temporary security credentials** (access key, secret key, session token) with configurable expiration.

### Key STS API calls

| API | Use Case |
|-----|----------|
| `AssumeRole` | Assume a role in your account or cross-account |
| `AssumeRoleWithSAML` | Assume a role using SAML assertion (enterprise federation) |
| `AssumeRoleWithWebIdentity` | Assume a role using web identity token (Google, Facebook, Amazon) — prefer Cognito instead |
| `GetSessionToken` | Get temp credentials for an IAM user (useful for MFA-protected API calls) |
| `GetFederationToken` | Get temp credentials for a federated user |

### Cross-Account Access Flow

```
Account A (Trusting)                    Account B (Trusted)
┌──────────────────────┐               ┌──────────────────────┐
│  1. Create Role with │               │  3. User calls       │
│     trust policy     │◄──────────────│     sts:AssumeRole   │
│     allowing         │               │                      │
│     Account B        │               │  4. Receives temp    │
│                      │──────────────▶│     credentials      │
│  2. Attach permission│               │                      │
│     policies to role │               │  5. Uses temp creds  │
│                      │               │     to access        │
│                      │◄──────────────│     Account A        │
└──────────────────────┘               └──────────────────────┘
```

:::tip Exam pattern
Cross-account access: either **IAM role assumption** (STS) or **resource-based policies** (e.g., S3 bucket policy with cross-account principal). Resource-based policies don't require giving up original permissions.
:::

---

## AWS Organizations

Centrally manage **multiple AWS accounts**. Critical for enterprise architectures.

### Key Concepts

```
Organization Root
├── Management Account (payer account — cannot be restricted by SCPs)
├── OU: Security
│   ├── Account: security-audit
│   └── Account: security-logging
├── OU: Production
│   ├── SCP: DenyRegionOutsideEU
│   ├── SCP: DenyRootUserActions
│   ├── Account: prod-app
│   └── Account: prod-db
├── OU: Development
│   ├── SCP: DenyExpensiveInstances
│   ├── Account: dev-sandbox
│   └── Account: dev-test
└── OU: Sandbox
    └── Account: experimentation
```

### Service Control Policies (SCPs)

SCPs are the **guardrails** for accounts in an Organization.

**Critical SCP rules:**
- SCPs **don't grant permissions** — they set the **maximum allowable permissions**
- SCPs apply to **all IAM users and roles** in the account (including root) — except the management account
- SCPs **do NOT affect service-linked roles**
- SCPs are inherited: child OUs inherit parent OU SCPs
- The **management account** is never affected by SCPs

**Effective permissions** = SCP ∩ Identity Policy

```json
// Example SCP: Deny all actions outside eu-west-1
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAllOutsideEU",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        },
        "ArnNotLike": {
          "aws:PrincipalARN": "arn:aws:iam::*:role/OrganizationAdmin"
        }
      }
    }
  ]
}
```

### Consolidated Billing

- **Single payment method** for all accounts
- **Volume discounts** — combined usage across accounts for S3, EC2, etc.
- **Reserved Instance / Savings Plan sharing** — RIs and SPs purchased in one account apply to usage in other accounts in the Organization

### AWS Organizations Features

| Feature | Purpose |
|---------|---------|
| **Consolidated Billing** | Single bill, volume discounts |
| **SCPs** | Permission guardrails across accounts |
| **Tag Policies** | Enforce consistent tagging across accounts |
| **Backup Policies** | Centrally manage AWS Backup plans |
| **AI Services Opt-out Policies** | Control AI service data usage across accounts |

---

## AWS Control Tower

**Automated multi-account governance** built on top of AWS Organizations.

| Feature | Purpose |
|---------|---------|
| **Landing Zone** | Pre-configured, best-practice multi-account environment |
| **Account Factory** | Automates provisioning of new AWS accounts with pre-approved configurations |
| **Guardrails (Controls)** | Pre-built governance rules (preventive via SCPs, detective via Config rules) |
| **Dashboard** | Central view of compliance across all accounts |

**Guardrail types:**
- **Preventive:** Implemented as SCPs — block non-compliant actions
- **Detective:** Implemented as AWS Config rules — detect and report non-compliance
- **Proactive:** Implemented as CloudFormation hooks — check resources before creation

:::tip Exam pattern
"Set up multi-account environment with best practices" → **AWS Control Tower**. "Prevent specific actions across accounts" → **SCPs** (either directly or via Control Tower guardrails).
:::

---

## Identity Federation

Federation allows **external users** to access AWS resources without creating IAM users.

### Federation Options

| Method | Identity Source | Protocol | Use Case |
|--------|----------------|----------|----------|
| **IAM Identity Center (SSO)** | Any (built-in, AD, external IdP) | SAML 2.0 / OIDC | Central access to multiple AWS accounts & business apps |
| **SAML 2.0 Federation** | Corporate AD / LDAP via IdP | SAML 2.0 | Enterprise SSO to AWS Console/API |
| **Web Identity Federation** | Google, Facebook, Amazon | OIDC | Mobile/web apps (use Cognito instead) |
| **Amazon Cognito** | Social IdPs, SAML, OIDC, user pools | OIDC | Mobile/web application users |
| **AWS Directory Service** | Microsoft AD | LDAP/Kerberos | Extend on-prem AD to AWS |
| **Custom Identity Broker** | Any | STS | Legacy, custom federation logic |

### AWS IAM Identity Center (formerly AWS SSO)

**The recommended approach** for managing workforce access to multiple AWS accounts and business applications.

```
┌──────────────────────────────────────────────────────────┐
│                  IAM Identity Center                      │
│                                                           │
│  Identity Source:                                         │
│  • Built-in directory                                     │
│  • AWS Managed Microsoft AD                               │
│  • External IdP (Okta, Azure AD, etc.)                    │
│                                                           │
│  Permission Sets (IAM policies):                          │
│  • ViewOnlyAccess                                         │
│  • DatabaseAdmin                                          │
│  • PowerUserAccess                                        │
│                                                           │
│  Assignment:                                              │
│  User/Group ──▶ Permission Set ──▶ AWS Account(s)         │
│                                                           │
│  Users get single sign-on access to:                      │
│  • Multiple AWS accounts                                  │
│  • Business applications (Salesforce, Slack, etc.)        │
│  • Custom SAML 2.0 applications                           │
└──────────────────────────────────────────────────────────┘
```

:::tip Exam pattern
"Employees need access to multiple AWS accounts with single sign-on" → **IAM Identity Center**. "Active Directory users need AWS access" → **IAM Identity Center with AD as identity source** (or AWS Managed Microsoft AD).
:::

### AWS Directory Service

| Option | What It Is | Use Case |
|--------|-----------|----------|
| **AWS Managed Microsoft AD** | Full Microsoft AD managed by AWS | On-prem AD trust relationship, AD-aware workloads in AWS |
| **AD Connector** | Proxy to redirect requests to on-prem AD | Use existing on-prem AD without replication to AWS |
| **Simple AD** | Standalone managed directory (Samba) | Small/simple AD needs, no trust with on-prem needed |

**Trust relationships:**
- AWS Managed Microsoft AD can establish a **two-way forest trust** with your on-premises AD
- AD Connector is a **proxy only** — no caching, all auth goes to on-prem
- Use AWS Managed Microsoft AD when you need AD features in AWS (domain join EC2, etc.)

---

## Resource-Based Policies

Some AWS services support **resource-based policies** — JSON policies attached directly to the resource.

### Services with Resource-Based Policies

| Service | Resource Policy Name |
|---------|---------------------|
| S3 | Bucket Policy |
| SQS | Queue Policy |
| SNS | Topic Policy |
| KMS | Key Policy |
| Lambda | Function Policy |
| ECR | Repository Policy |
| Secrets Manager | Secret Policy |
| API Gateway | Resource Policy |
| AWS Backup | Vault Access Policy |

### Cross-Account with Resource-Based Policies

Resource-based policies support cross-account access by specifying another account's principal:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:root"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

**Key difference from role assumption:**
- With **resource-based policies**: the principal retains their own permissions AND gets the resource policy permissions
- With **role assumption**: the principal gives up their original permissions and gets only the role's permissions

---

## IAM Access Analyzer

Helps identify resources shared with **external entities** (accounts, organizations, users outside your zone of trust).

- Analyzes resource-based policies (S3, IAM roles, KMS keys, Lambda, SQS)
- Generates **findings** for any resource accessible from outside your account/organization
- Can validate policies against IAM best practices
- Can **generate policies** based on CloudTrail access activity (least privilege)

:::tip Exam pattern
"Identify resources shared externally" or "ensure no public access" → **IAM Access Analyzer**.
:::

---

## AWS Resource Access Manager (RAM)

Share AWS resources **across accounts** within your Organization (or with specific accounts) without creating duplicate resources.

**Shareable resources include:**
- VPC Subnets (most common exam scenario)
- Transit Gateways
- Route 53 Resolver rules
- License Manager configurations
- Aurora DB clusters
- AWS App Mesh meshes
- CodeBuild projects

**VPC Subnet sharing:**
- Share subnets with other accounts → instances in different accounts can launch in the same subnet
- Each account manages its own resources but uses shared networking
- Reduces VPC peering complexity

:::tip Exam pattern
"Multiple accounts need to use the same VPC/subnet" → **RAM to share subnets**. "Share Transit Gateway across accounts" → **RAM**.
:::

---

## Best Practices Summary

| Practice | Implementation |
|----------|---------------|
| **Least privilege** | Grant minimum permissions needed. Start with zero access, add as needed. |
| **Use roles, not keys** | EC2 → instance profile. Lambda → execution role. Never embed access keys. |
| **Enable MFA** | Require MFA for root, privileged users, and sensitive operations. |
| **Use groups** | Attach policies to groups, assign users to groups. |
| **Rotate credentials** | Regularly rotate access keys. Use credential reports to audit. |
| **Use managed policies** | Prefer AWS managed policies for common use cases. |
| **Use SCPs for guardrails** | Restrict dangerous actions at the Organization level. |
| **Audit regularly** | IAM Credential Reports, Access Advisor, Access Analyzer. |
| **Federate, don't create IAM users** | For workforce access, use IAM Identity Center. |
| **Use conditions** | Restrict by IP, MFA, time, tags, encryption, etc. |

---

## IAM Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "EC2 needs to access S3" | IAM role with instance profile |
| "Cross-account access to S3" | S3 bucket policy OR cross-account role |
| "Restrict actions across multiple accounts" | SCPs in AWS Organizations |
| "Employees need SSO to multiple accounts" | IAM Identity Center |
| "Prevent privilege escalation by developers" | Permission boundaries |
| "Federate corporate AD users to AWS" | IAM Identity Center + AD Connector or AWS Managed Microsoft AD |
| "Mobile app users need AWS access" | Amazon Cognito |
| "Audit who has access to what" | IAM Access Analyzer + Credential Report + Access Advisor |
| "Share VPC subnets across accounts" | AWS RAM |
| "Block all actions outside approved Regions" | SCP with region condition |
| "Root user shouldn't perform daily operations" | SCP to deny root actions (except management account) |
| "Temporary credentials for cross-account" | STS AssumeRole |
