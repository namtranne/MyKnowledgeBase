---
sidebar_position: 5
title: "04 — Privacy & Compliance"
slug: 04-privacy-compliance
---

# 🏛️ Privacy & Compliance

Privacy isn't just a legal checkbox — it's an engineering discipline. Senior engineers are expected to design systems that handle personal data responsibly, comply with regulations by default, and maintain audit trails that prove it. This chapter covers PII classification, GDPR, data retention, consent, and the technical patterns that make compliance achievable at scale.

---

## 1. PII Classification

**Personally Identifiable Information (PII)** is any data that can identify an individual, directly or in combination with other data.

### PII Categories

| Category | Description | Examples | Risk Level |
|----------|-------------|----------|:----------:|
| **Direct Identifiers** | Uniquely identify a person on their own | SSN, passport number, driver's license, email, phone number | 🔴 High |
| **Quasi-Identifiers** | Can identify when combined with other data | ZIP code + birthdate + gender (87% of US is unique), job title + employer | 🟡 Medium |
| **Sensitive PII** | Requires extra protection due to harm potential | Race, ethnicity, religion, health data, sexual orientation, biometrics, financial records | 🔴 Critical |
| **Non-PII** | Cannot identify an individual | Aggregated statistics, anonymized data, weather data | 🟢 Low |

### Data Sensitivity Levels

```
┌─────────────────────────────────────────────────────────┐
│                DATA SENSITIVITY PYRAMID                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    ┌───────┐                             │
│                    │ TOP   │  Financial (SSN, bank acct) │
│                   ┌┤SECRET ├┐ Health (HIPAA), Biometric  │
│                  ┌┤│       │├┐                           │
│                 ┌┤│└───────┘│├┐                          │
│                │ │ SENSITIVE │ │ Religion, ethnicity,     │
│               ┌┤ │          │ ├┐ political views, sexual │
│              ┌┤│ └──────────┘ │├┐ orientation            │
│             │ │   PERSONAL     │ │ Name, email, phone,   │
│            ┌┤ │                │ ├┐ address, birthdate   │
│           │ │ └────────────────┘ │ │                     │
│          │  │     INTERNAL        │  │ Employee data,    │
│         ┌┤  │                     │  ├┐ internal metrics │
│        │ │  └─────────────────────┘  │ │                 │
│       │  │         PUBLIC             │  │ Published      │
│       │  │                            │  │ content, open  │
│       └──┴────────────────────────────┴──┘ source code   │
│                                                         │
│  Higher = more controls (encryption, access logging,    │
│  retention limits, breach notification)                 │
└─────────────────────────────────────────────────────────┘
```

:::tip Senior-Level Insight
When classifying data, think about **combinability**. A ZIP code alone isn't PII, but research by Latanya Sweeney showed that ZIP code + birthdate + gender uniquely identifies 87% of the US population. Your classification scheme must account for quasi-identifiers and the risk of re-identification through data linkage.
:::

---

## 2. GDPR Key Principles

The **General Data Protection Regulation (GDPR)** is the EU's data protection law, effective since May 2018. It applies to any organization processing data of EU residents, regardless of where the organization is based.

### The 7 Principles

| # | Principle | Meaning | Engineering Implication |
|:-:|-----------|---------|------------------------|
| 1 | **Lawfulness, Fairness, Transparency** | Must have a legal basis; be transparent about processing | Privacy policy, consent banners, purpose disclosure |
| 2 | **Purpose Limitation** | Collect data only for specified, explicit purposes | Separate data stores per purpose; don't repurpose data |
| 3 | **Data Minimization** | Collect only what's necessary | Don't store "just in case"; audit unused fields |
| 4 | **Accuracy** | Keep data accurate and up to date | Provide user edit capabilities; data quality checks |
| 5 | **Storage Limitation** | Don't keep data longer than necessary | Retention policies with automated deletion |
| 6 | **Integrity & Confidentiality** | Protect against unauthorized access, loss, destruction | Encryption, access controls, secure backups |
| 7 | **Accountability** | Controller must demonstrate compliance | Audit logs, DPIAs, records of processing activities |

### Legal Bases for Processing

| Legal Basis | Example | Notes |
|-------------|---------|-------|
| **Consent** | Marketing emails, analytics cookies | Must be freely given, specific, informed, unambiguous; revocable |
| **Contract** | Processing order details for a purchase | Limited to what's necessary for the contract |
| **Legal obligation** | Tax records retention | Regulatory requirement overrides deletion requests |
| **Vital interests** | Emergency medical data sharing | Rare; life-threatening situations |
| **Public interest** | Government public health data | Primarily for public authorities |
| **Legitimate interests** | Fraud prevention, network security | Requires balancing test (your interest vs data subject's rights) |

---

## 3. Data Subject Rights

GDPR grants individuals specific rights over their personal data. Engineers must build systems that can fulfill these rights within the required timeframes.

| Right | Description | Response Time | Engineering Requirements |
|-------|-------------|:-------------:|--------------------------|
| **Right of Access** | Provide a copy of all data held about the subject | 30 days | Data export API; search across all data stores |
| **Right to Rectification** | Correct inaccurate data | 30 days | Update APIs; propagate corrections to downstream systems |
| **Right to Erasure** (Right to Be Forgotten) | Delete all data when no longer necessary | 30 days | Cascading deletes; handle backups, logs, caches, replicas |
| **Right to Restrict Processing** | Stop processing but keep data | 30 days | "Frozen" flag on records; exclude from pipelines |
| **Right to Data Portability** | Export data in machine-readable format | 30 days | JSON/CSV export; standardized schema |
| **Right to Object** | Object to processing for specific purposes | Without delay | Opt-out flags per processing purpose |
| **Right Against Automated Decisions** | Not be subject to solely automated decisions with legal effects | Without delay | Human review capability; explanation of logic |

### Implementing Right to Erasure

```
┌──────────────────────────────────────────────────────┐
│              ERASURE REQUEST FLOW                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. User submits deletion request                    │
│     └─▶ Verify identity (prevent social engineering) │
│                                                      │
│  2. Check for legal holds                            │
│     └─▶ Tax records? Active litigation? Regulatory?  │
│         If yes → retain with justification           │
│                                                      │
│  3. Delete from primary databases                    │
│     └─▶ Users table, profiles, preferences           │
│                                                      │
│  4. Delete from search indices                       │
│     └─▶ Elasticsearch, Algolia, Solr                 │
│                                                      │
│  5. Delete from caches                               │
│     └─▶ Redis, CDN, application caches               │
│                                                      │
│  6. Delete from analytics / data warehouse           │
│     └─▶ BigQuery, Redshift, Snowflake                │
│                                                      │
│  7. Delete from logs (or anonymize)                  │
│     └─▶ Replace PII with tombstone markers           │
│                                                      │
│  8. Delete from backups                              │
│     └─▶ Flag for exclusion on next restore           │
│     └─▶ Or: accept data may exist in backups with    │
│         documented retention period                  │
│                                                      │
│  9. Notify downstream processors                     │
│     └─▶ Third-party APIs, partners, sub-processors   │
│                                                      │
│  10. Record the deletion action in audit log         │
│      └─▶ Log THAT deletion occurred (not WHAT was    │
│          deleted) for compliance proof               │
└──────────────────────────────────────────────────────┘
```

:::warning
Backups are the hardest part of erasure. Most organizations document their backup retention period (e.g., 90 days) and note that data may exist in backups until they naturally expire. The key is having a process to prevent restoring deleted data from backups — a "deletion manifest" that's checked during any restore operation.
:::

---

## 4. Engineer's GDPR Responsibilities

As a senior engineer, you're expected to embed privacy into technical design, not just check boxes.

### What's Expected of You

| Responsibility | What It Means in Practice |
|---------------|--------------------------|
| **Privacy by design** | Build privacy into architecture from day one, not as an afterthought |
| **Data mapping** | Know what PII your service stores, where it flows, and who has access |
| **Minimization** | Challenge product requirements: "Do we really need the user's birthdate?" |
| **Secure defaults** | Encryption at rest by default; access denied by default |
| **Retention enforcement** | Implement automated deletion after retention period expires |
| **Access controls** | Ensure only authorized roles can access PII; log every access |
| **Incident response** | Know your role in a data breach; have runbooks ready |
| **Vendor assessment** | Evaluate third-party data processors (analytics, CRM, logging) |
| **DPIA participation** | Contribute to Data Protection Impact Assessments for new features |

```python
# Privacy-by-design example: user model with built-in retention
from datetime import datetime, timedelta

class UserProfile:
    RETENTION_PERIOD = timedelta(days=365 * 3)  # 3 years after last activity

    def __init__(self, user_id, email, name):
        self.user_id = user_id
        self.email = email
        self.name = name
        self.last_active = datetime.utcnow()
        self.deletion_requested = False
        self.data_purposes = set()  # track why we hold this data

    def is_retention_expired(self) -> bool:
        return datetime.utcnow() - self.last_active > self.RETENTION_PERIOD

    def can_process_for(self, purpose: str) -> bool:
        return purpose in self.data_purposes and not self.deletion_requested
```

---

## 5. Data Retention Policies

### Designing a Retention Policy

| Element | Description | Example |
|---------|-------------|---------|
| **Data category** | What type of data | User account data, transaction logs, support tickets |
| **Retention period** | How long to keep it | 3 years after account closure |
| **Legal basis** | Why this duration | Tax law (7 years), contract, legitimate interest |
| **Deletion method** | How to delete | Hard delete, soft delete + purge job, anonymization |
| **Owner** | Who's responsible | Data Engineering team |
| **Review frequency** | When to reassess | Annually |

### Retention Implementation Patterns

```
Pattern 1: TTL-Based (Simple)
──────────────────────────────
Redis:    SET user:123:session "data" EX 3600    (1 hour TTL)
DynamoDB: TTL attribute → automatic deletion
Cassandra: INSERT ... USING TTL 86400           (1 day)

Pattern 2: Scheduled Purge Jobs
───────────────────────────────
┌──────────────────────────────────────────┐
│  Daily Cron Job (2 AM UTC)               │
│                                          │
│  DELETE FROM user_sessions               │
│  WHERE last_active < NOW() - INTERVAL    │
│  '90 days';                              │
│                                          │
│  DELETE FROM audit_logs                  │
│  WHERE created_at < NOW() - INTERVAL    │
│  '7 years';                             │
│                                          │
│  -- Batch delete to avoid table locks    │
│  -- DELETE ... LIMIT 10000              │
│  -- Repeat until 0 rows affected         │
└──────────────────────────────────────────┘

Pattern 3: Soft Delete + Deferred Purge
───────────────────────────────────────
1. Mark as deleted:    UPDATE users SET deleted_at = NOW() WHERE id = 123
2. Exclude from queries: WHERE deleted_at IS NULL
3. Purge job:          DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days'
4. Grace period:       User can recover account within 30 days
```

:::tip Senior-Level Insight
Batch your deletion jobs. A single `DELETE FROM logs WHERE created_at < '2023-01-01'` on a table with billions of rows will lock the table and likely cause an outage. Instead, delete in batches of 10,000 rows with a short sleep between batches. Consider partitioning by date so you can `DROP PARTITION` instead of row-by-row deletion — this is orders of magnitude faster.
:::

---

## 6. PII Redaction in Logs, Traces, and Error Messages

### The Problem

```
❌ Unredacted log:
  INFO  [2024-01-15] User login successful
  email=alice@example.com, ip=192.168.1.42,
  ssn=123-45-6789, credit_card=4111111111111111

❌ Unredacted error:
  ERROR: Failed to process payment for user
  John Smith (john@example.com), card ending 1111,
  billing address: 123 Main St, New York, NY 10001

❌ Unredacted trace:
  span: POST /api/users
  attributes: { email: "alice@example.com", phone: "+1-555-0123" }
```

### Redaction Strategies

| Strategy | How It Works | When to Use |
|----------|-------------|-------------|
| **Field-level omission** | Don't log PII fields at all | Default approach — best practice |
| **Masking** | `alice@***.com`, `***-**-6789` | When partial data is useful for debugging |
| **Tokenization** | Replace with reference token `usr_abc123` | When you need to correlate across systems |
| **Hashing** | SHA-256 of the value | When you need to match without revealing |
| **Encryption** | Encrypt PII in logs, decrypt for investigations | Audit-heavy environments |

### Implementation Example

```python
import re
import logging

class PIIRedactingFilter(logging.Filter):
    PATTERNS = [
        (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN_REDACTED]'),
        (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL_REDACTED]'),
        (re.compile(r'\b(?:\d{4}[- ]?){3}\d{4}\b'), '[CARD_REDACTED]'),
        (re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), '[PHONE_REDACTED]'),
    ]

    def filter(self, record):
        msg = record.getMessage()
        for pattern, replacement in self.PATTERNS:
            msg = pattern.sub(replacement, msg)
        record.msg = msg
        record.args = ()
        return True

logger = logging.getLogger()
logger.addFilter(PIIRedactingFilter())

# Output:  "User [EMAIL_REDACTED] logged in from 10.0.0.1"
logger.info("User alice@example.com logged in from 10.0.0.1")
```

### Structured Logging with PII Separation

```python
import structlog

def redact_pii(_, __, event_dict):
    """Move PII to a separate, access-controlled log stream."""
    pii_fields = {'email', 'phone', 'ssn', 'name', 'address'}
    pii_data = {k: event_dict.pop(k) for k in pii_fields if k in event_dict}
    if pii_data:
        event_dict['pii_ref'] = write_to_pii_log(pii_data)  # separate store
    return event_dict

structlog.configure(processors=[redact_pii, structlog.dev.ConsoleRenderer()])
```

:::warning
Log aggregation systems (ELK, Datadog, Splunk) often retain logs for months or years. Once PII enters your log pipeline, it's extremely difficult to remove retroactively — it's replicated across indices, backups, and retention tiers. The only reliable approach is **preventing PII from entering logs in the first place**.
:::

---

## 7. Consent Management

### Opt-In vs Opt-Out

| Model | How It Works | When Required | Example |
|-------|-------------|---------------|---------|
| **Opt-in** | User must actively consent before processing | GDPR (EU), default for marketing | Unchecked checkbox: "I agree to receive marketing emails" |
| **Opt-out** | Processing assumed unless user objects | CAN-SPAM (US), some analytics | Pre-checked checkbox, unsubscribe link |
| **Explicit consent** | Affirmative action for sensitive data | GDPR for sensitive categories | Separate, specific consent for health data processing |

### Consent Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 CONSENT MANAGEMENT SYSTEM                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌────────────────┐    ┌───────────┐  │
│  │  Consent    │    │  Consent       │    │  Consent  │  │
│  │  Collection │───▶│  Store         │◀───│  Check    │  │
│  │  (UI/API)   │    │  (Database)    │    │  (Middleware)│
│  └─────────────┘    └────────────────┘    └───────────┘  │
│                                                          │
│  Consent Record:                                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │  user_id:      "usr_123"                         │    │
│  │  purpose:      "marketing_emails"                │    │
│  │  status:       "granted"                         │    │
│  │  granted_at:   "2024-01-15T10:30:00Z"           │    │
│  │  expires_at:   "2025-01-15T10:30:00Z"           │    │
│  │  source:       "web_signup_form_v3"              │    │
│  │  ip_address:   "198.51.100.42"                   │    │
│  │  version:      "privacy_policy_v2.1"             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Purposes:                                               │
│  ├── essential_service    (no consent needed - contract)  │
│  ├── analytics            (consent required)             │
│  ├── marketing_emails     (consent required)             │
│  ├── third_party_sharing  (explicit consent required)    │
│  └── personalization      (consent or legit interest)    │
└──────────────────────────────────────────────────────────┘
```

```sql
CREATE TABLE consent_records (
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users(id),
    purpose        VARCHAR(100) NOT NULL,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('granted', 'withdrawn', 'expired')),
    granted_at     TIMESTAMPTZ,
    withdrawn_at   TIMESTAMPTZ,
    expires_at     TIMESTAMPTZ,
    source         VARCHAR(200) NOT NULL,
    ip_address     INET,
    policy_version VARCHAR(20) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, purpose, granted_at)
);

CREATE INDEX idx_consent_user_purpose ON consent_records(user_id, purpose, status);
```

---

## 8. Data Anonymization vs Pseudonymization

| Dimension | Anonymization | Pseudonymization |
|-----------|--------------|-----------------|
| **Definition** | Irreversibly remove all identifying information | Replace identifiers with tokens; reversible with a key |
| **Reversible?** | ❌ No (if done correctly) | ✅ Yes (with mapping table) |
| **GDPR applies?** | ❌ No — anonymized data is not personal data | ✅ Yes — still considered personal data |
| **Utility** | Lower (aggregated, less granular) | Higher (individual-level analysis possible) |
| **Risk** | Re-identification through linkage attacks | Key compromise reveals identities |
| **Techniques** | Aggregation, generalization, noise addition, k-anonymity | Tokenization, encryption, hashing with salt |
| **Use case** | Public datasets, research, analytics | Internal analytics, data sharing with processors |

### Anonymization Techniques

| Technique | How It Works | Example |
|-----------|-------------|---------|
| **Generalization** | Replace specific values with ranges | Age 34 → "30-39", ZIP 10001 → "100**" |
| **Suppression** | Remove the field entirely | Delete `name` column |
| **Noise addition** | Add random perturbation | Salary $95,000 → $93,000-$97,000 |
| **k-Anonymity** | Each record indistinguishable from k-1 others | k=5: any combination of quasi-identifiers appears ≥5 times |
| **l-Diversity** | Each equivalence class has l distinct sensitive values | Prevents homogeneity attack on k-anonymity |
| **Differential privacy** | Mathematical guarantee of privacy loss bound | Add calibrated noise (ε-differential privacy) |

```python
# Pseudonymization with reversible tokenization
import hashlib
import hmac

SECRET_KEY = b"server-side-secret-key"

def pseudonymize(value: str) -> str:
    """Create a consistent pseudonym — reversible only with the mapping table."""
    token = hmac.new(SECRET_KEY, value.encode(), hashlib.sha256).hexdigest()[:16]
    db.store_mapping(token, value)  # encrypted mapping table
    return f"pseudo_{token}"

def de_pseudonymize(token: str) -> str:
    """Reverse lookup — requires access to the mapping table."""
    return db.get_mapping(token)

# Usage in analytics pipeline
raw_email = "alice@example.com"
pseudo_id = pseudonymize(raw_email)  # "pseudo_a1b2c3d4e5f6g7h8"
```

:::tip Senior-Level Insight
True anonymization is harder than most people think. The Netflix Prize dataset was "anonymized" by removing names, but researchers re-identified users by correlating ratings with public IMDb reviews. Always assume an adversary has access to auxiliary datasets. Use **k-anonymity** at minimum, and consider **differential privacy** for public data releases.
:::

---

## 9. Audit Trails & Access Logging

### What to Log

| Event Category | Examples | Required Fields |
|---------------|---------|-----------------|
| **Authentication** | Login, logout, failed login, MFA events | User ID, IP, timestamp, success/failure, method |
| **Authorization** | Permission checks, role changes, access denied | User ID, resource, action, decision, policy |
| **Data access** | PII read, export, download | User ID, data subject, fields accessed, purpose |
| **Data modification** | Create, update, delete PII | User ID, before/after values, timestamp |
| **Configuration** | Permission changes, policy updates, key rotation | Admin ID, change details, approval |
| **Security events** | Suspicious activity, rate limit hits, WAF blocks | Source IP, rule triggered, action taken |

### Audit Log Schema

```json
{
  "event_id": "evt_20240115_abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "actor": {
    "user_id": "usr_456",
    "email_hash": "sha256:a1b2c3...",
    "ip": "198.51.100.42",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_789"
  },
  "action": "data.read",
  "resource": {
    "type": "user_profile",
    "id": "usr_123",
    "fields_accessed": ["email", "phone", "address"]
  },
  "context": {
    "service": "customer-support-app",
    "purpose": "support_ticket_resolution",
    "ticket_id": "TKT-4567"
  },
  "result": "success",
  "metadata": {
    "data_classification": "PII",
    "legal_basis": "legitimate_interest"
  }
}
```

### Audit Log Requirements

| Requirement | Implementation |
|------------|----------------|
| **Immutability** | Write-once storage (append-only), no UPDATE or DELETE |
| **Tamper evidence** | Hash chaining or merkle trees; WORM storage (S3 Object Lock) |
| **Retention** | 1-7 years depending on regulation (SOX: 7 years, GDPR: varies) |
| **Searchability** | Indexed by user_id, resource, time range |
| **Access control** | Only security/compliance team can read; no developer access |
| **Availability** | Separate from application DB; survives application failure |
| **No PII in logs** | Log references (user IDs), not PII values themselves |

---

## 10. Data Breach Notification

### GDPR Breach Notification Requirements

```
┌──────────────────────────────────────────────────────────┐
│              BREACH NOTIFICATION TIMELINE                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  T+0h     Breach detected                                │
│  ├───────────────────────────────────────────────────┐   │
│  │  Immediate: Contain the breach                    │   │
│  │  - Revoke compromised credentials                 │   │
│  │  - Isolate affected systems                       │   │
│  │  - Preserve forensic evidence                     │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  T+72h    Notify Supervisory Authority (DPA)             │
│  ├───────────────────────────────────────────────────┐   │
│  │  Required unless breach is unlikely to result     │   │
│  │  in risk to individuals. Report must include:     │   │
│  │  - Nature of breach                               │   │
│  │  - Categories and approximate number affected     │   │
│  │  - Likely consequences                            │   │
│  │  - Measures taken to address                      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  "Without undue delay"  Notify affected individuals      │
│  ├───────────────────────────────────────────────────┐   │
│  │  Required when breach likely results in HIGH      │   │
│  │  risk to individuals. Must include:               │   │
│  │  - Plain language description                     │   │
│  │  - DPO contact details                            │   │
│  │  - Likely consequences                            │   │
│  │  - Steps to protect themselves                    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Fines for non-compliance:                               │
│  - Up to €20M or 4% of global annual turnover            │
│    (whichever is greater)                                │
└──────────────────────────────────────────────────────────┘
```

### Engineer's Role in Breach Response

| Phase | Your Responsibility |
|-------|-------------------|
| **Detection** | Ensure monitoring/alerting exists for anomalous data access |
| **Containment** | Execute incident runbooks; revoke keys, rotate secrets |
| **Assessment** | Determine scope: what data, how many users, what systems |
| **Evidence preservation** | Capture logs, memory dumps, network captures before cleanup |
| **Remediation** | Fix the vulnerability; deploy patches |
| **Post-mortem** | Contribute to root cause analysis; propose preventive measures |

---

## 11. Privacy by Design Principles

The 7 foundational principles from Ann Cavoukian (2009), now codified in GDPR Article 25:

| # | Principle | Engineering Translation |
|:-:|-----------|------------------------|
| 1 | **Proactive not reactive** | Threat model before building; don't wait for incidents |
| 2 | **Privacy as the default** | Opt-in, not opt-out; minimal data collection by default |
| 3 | **Privacy embedded in design** | Encryption, access control, retention as architectural concerns |
| 4 | **Full functionality** | Privacy AND functionality — not either/or |
| 5 | **End-to-end security** | Protect data throughout its entire lifecycle |
| 6 | **Visibility and transparency** | Auditable systems; users understand what data is collected |
| 7 | **Respect for user privacy** | User-centric design; easy to exercise rights |

### Privacy Design Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Data minimization** | Only collect what's needed | Schema reviews; block unnecessary fields at API level |
| **Purpose binding** | Data tied to specific purposes | Metadata tags on data; purpose checks before processing |
| **Retention enforcement** | Auto-delete expired data | TTL, cron jobs, partitioned tables with drop |
| **Access tiering** | Restrict PII access by role | Column-level security, data masking for non-privileged roles |
| **Anonymize by default** | Analytics on anonymized data | Aggregate before export; differential privacy |
| **Consent gating** | Check consent before processing | Middleware that validates consent records |
| **PII inventory** | Know where PII lives | Data catalogs, automated PII scanning |

```python
# Privacy-by-design: purpose-bound data access
class DataAccessGateway:
    def get_user_data(self, user_id: str, purpose: str, accessor: str) -> dict:
        self._check_consent(user_id, purpose)
        self._check_authorization(accessor, purpose)
        self._log_access(user_id, purpose, accessor)

        user = self._fetch_user(user_id)
        return self._filter_fields_for_purpose(user, purpose)

    def _filter_fields_for_purpose(self, user: dict, purpose: str) -> dict:
        PURPOSE_FIELDS = {
            "order_fulfillment": ["name", "shipping_address"],
            "marketing": ["email", "preferences"],
            "analytics": ["pseudonymized_id", "signup_date", "region"],
            "support": ["name", "email", "order_history"],
        }
        allowed = PURPOSE_FIELDS.get(purpose, set())
        return {k: v for k, v in user.items() if k in allowed}
```

:::warning
Privacy by design isn't aspirational — it's a legal requirement under GDPR Article 25. In an interview, describe how you've built systems with privacy controls from the start: purpose-limited APIs, automated retention, consent-gated processing, and PII-free logging. This demonstrates maturity beyond "we'll add privacy later."
:::

---

## 🔗 Related Chapters

- **[01 — Authentication & Authorization](./01-authentication-authorization.md)** — Access controls that protect PII
- **[03 — Cryptography & Secure Design](./03-cryptography-secure-design.md)** — Encryption for data protection
- **[05 — Interview Questions](./05-interview-questions.md)** — Practice privacy scenario questions
