# Chapter 8: Distributed Email Service

## 1. Problem Statement & Requirements

### What Are We Designing?

A **large-scale email service** comparable to Gmail, Outlook, or Yahoo Mail — capable of handling billions of users, tens of billions of emails per day, and providing fast read/search with zero data loss. Email remains one of the most critical communication systems on the internet, and designing it at scale involves distributed storage, protocol handling, search indexing, spam defense, and multi-device synchronization.

### Functional Requirements

1. **Send emails** to internal and external recipients (with attachments)
2. **Receive emails** from external SMTP servers
3. **Read emails** — inbox, folders, labels, read/unread status
4. **Search emails** by subject, body, sender, date range, attachments
5. **Organize** — folders, labels, filters, auto-rules
6. **Anti-spam & anti-virus** scanning on all incoming mail
7. **Attachments** — upload/download, inline images
8. **Multiple clients** — web, mobile (iOS/Android), desktop (IMAP)
9. **Threaded conversations** — group related emails together
10. **Push notifications** for new mail in real time

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| Reliability | **Never lose an email** — data durability is paramount |
| Availability | 99.99% uptime (≤ 52 min downtime/year) |
| Scalability | Support 1B+ user accounts |
| Read latency | < 200ms p99 for inbox load |
| Search latency | < 500ms p99 for full-text queries |
| Consistency | Eventual consistency acceptable for labels/read status; strong for send/receive |
| Security | TLS in transit, encryption at rest, spam/phishing protection |

### Scale Estimation (Back-of-Envelope)

```
Total users:             1,000,000,000 (1B)
DAU (40%):               400,000,000
Avg emails received/day: 40 per user
Total emails/day:        400M × 40 = 16,000,000,000 (16B)
Emails/sec:              16B / 86,400 ≈ 185,000 emails/sec

Avg email size:          50 KB (metadata + body, excluding large attachments)
Daily new data:          16B × 50KB = 800 TB/day
Yearly data:             800 TB × 365 ≈ 292 PB/year

Avg attachment rate:     20% of emails have attachments
Avg attachment size:     500 KB
Attachment data/day:     16B × 0.2 × 500KB = 1.6 PB/day

Emails sent/day/user:   ~10
Outgoing emails/day:     400M × 10 = 4B
```

### Protocol Landscape

| Protocol | Port | Direction | Purpose |
|---|---|---|---|
| **SMTP** | 25 (relay), 587 (submission) | Outbound / Inbound | Sending & relaying email between servers |
| **IMAP** | 143 / 993 (TLS) | Client ← Server | Read/manage emails, server-side storage, multi-device |
| **POP3** | 110 / 995 (TLS) | Client ← Server | Download emails to local client (legacy) |
| **HTTP/HTTPS** | 80 / 443 | Client ↔ Server | Web & mobile API, modern primary interface |
| **WebSocket** | 443 | Server → Client | Real-time push notifications |

---

## 2. Email Protocols Deep Dive

### SMTP — Simple Mail Transfer Protocol

SMTP is the **backbone of email delivery**. Every email ever sent traverses SMTP at some point.

**How sending works:**

```
┌──────────┐    SMTP     ┌────────────────┐   DNS MX    ┌───────────────────┐
│  Sender  │───────────→ │ Sender's Mail  │───lookup──→ │ Recipient's MX    │
│  Client  │  port 587   │ Server (MTA)   │─────────→   │ Server            │
└──────────┘   (submit)  └────────────────┘   SMTP :25   └───────────────────┘
                                                                  │
                                                                  ▼
                                                         ┌───────────────────┐
                                                         │ Recipient Mailbox │
                                                         └───────────────────┘
```

**SMTP session example:**

```
C: EHLO mail.sender.com
S: 250-mail.recipient.com Hello
S: 250-SIZE 35882577
S: 250-STARTTLS
S: 250 OK

C: MAIL FROM:<alice@sender.com>
S: 250 OK

C: RCPT TO:<bob@recipient.com>
S: 250 OK

C: DATA
S: 354 Start mail input
C: Subject: Hello Bob
C: From: alice@sender.com
C: To: bob@recipient.com
C:
C: Hey Bob, how are you?
C: .
S: 250 OK: queued as ABC123

C: QUIT
S: 221 Bye
```

**Key SMTP concepts:**

| Concept | Description |
|---|---|
| **MTA** (Mail Transfer Agent) | Server that relays mail (Postfix, Sendmail) |
| **MDA** (Mail Delivery Agent) | Delivers mail to the user's mailbox |
| **MUA** (Mail User Agent) | Client application (Gmail web, Thunderbird) |
| **MX Record** | DNS record specifying which server handles email for a domain |
| **Relay** | Forwarding email through intermediate servers |
| **Envelope vs Headers** | SMTP envelope (MAIL FROM/RCPT TO) can differ from message headers |

**DNS MX Lookup Flow:**

```
1. Sender wants to email bob@example.com
2. DNS query: "What are the MX records for example.com?"
3. Response:
     example.com  MX  10  mx1.example.com
     example.com  MX  20  mx2.example.com   (fallback)
4. Resolve mx1.example.com → 203.0.113.10
5. Connect to 203.0.113.10:25 via SMTP
6. Deliver the email
```

Lower MX priority numbers indicate **higher preference**. Fallback MX servers provide redundancy.

### IMAP — Internet Message Access Protocol

IMAP keeps emails **on the server** and synchronizes state across multiple devices.

**Key IMAP features:**
- Server-side storage — email lives on server, not downloaded permanently
- Folder management — create, rename, delete folders
- Flag synchronization — read/unread, starred, deleted across devices
- Partial fetch — download headers only, then body on demand
- IDLE command — long-lived connection for push notifications
- Search on server — offload search to the server

**Why IMAP dominates modern email:**
1. Multi-device world — users read email on phone, laptop, tablet
2. Server-side search — no need to download everything
3. Storage efficiency — thin clients don't need all email locally
4. Centralized backup — server handles durability

### POP3 — Post Office Protocol v3

POP3 is a **download-and-delete** model:

```
Client connects → Downloads all new emails → Deletes from server (default)
```

| Feature | IMAP | POP3 |
|---|---|---|
| Storage location | Server | Client (local) |
| Multi-device | Full sync | No sync — each device gets different emails |
| Offline access | Partial (cached) | Full (everything downloaded) |
| Server load | Higher (stores everything) | Lower (just a mailbox relay) |
| Modern usage | **Dominant** | Legacy / niche |

POP3 is mostly obsolete for consumer email but still used in some enterprise environments.

### Modern Reality: HTTP APIs

Gmail, Outlook, and most modern clients actually use **proprietary HTTP/REST APIs** rather than raw IMAP. IMAP is maintained for third-party client compatibility. The web and mobile apps communicate via:

```
Client ←→ HTTPS (REST/GraphQL) ←→ API Gateway ←→ Backend Services
Client ←→ WebSocket ←→ Push Notification Service
```

---

## 3. High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS (Web / Mobile / Desktop)                  │
└──────────┬──────────────────────────┬───────────────────────┬───────────────┘
           │ HTTP/WS                  │ HTTP/WS               │ IMAP
           ▼                          ▼                        ▼
┌────────────────┐          ┌──────────────────┐    ┌──────────────────┐
│  Load Balancer │          │  Load Balancer   │    │  IMAP Gateway    │
└───────┬────────┘          └────────┬─────────┘    └────────┬─────────┘
        │                            │                        │
        ▼                            ▼                        │
┌────────────────┐          ┌──────────────────┐              │
│  Web/API       │          │  WebSocket       │              │
│  Servers       │          │  Servers         │              │
└───┬────┬───┬───┘          └────────┬─────────┘              │
    │    │   │                       │                         │
    │    │   │      ┌────────────────┴─────────────────────────┘
    │    │   │      │
    ▼    │   │      ▼
┌────────┴───┴──────────────────────────────────────────────────────────────┐
│                        INTERNAL SERVICE LAYER                             │
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Send     │  │ Receive  │  │ Search   │  │ Mailbox  │  │ Contact   │  │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       │              │             │              │                        │
└───────┼──────────────┼─────────────┼──────────────┼────────────────────────┘
        │              │             │              │
   ┌────▼────┐   ┌─────▼────┐  ┌────▼─────┐  ┌────▼──────────────────────┐
   │Outgoing │   │ Incoming │  │ Search   │  │      DATA LAYER           │
   │ Queue   │   │  Queue   │  │ Index    │  │                           │
   └────┬────┘   └────┬─────┘  │(Elastic) │  │ ┌────────┐ ┌───────────┐ │
        │              │        └──────────┘  │ │Metadata│ │Email Body │ │
        ▼              ▼                      │ │  DB    │ │  Store    │ │
   ┌─────────┐   ┌──────────┐                 │ └────────┘ └───────────┘ │
   │  SMTP   │   │Processing│                 │ ┌────────┐ ┌───────────┐ │
   │ Sender  │   │ Pipeline │                 │ │ Cache  │ │   Blob    │ │
   │ Workers │   │(spam/AV) │                 │ │(Redis) │ │  Storage  │ │
   └─────────┘   └──────────┘                 │ └────────┘ └───────────┘ │
                                              └───────────────────────────┘
```

### Component Responsibilities

| Component | Role |
|---|---|
| **Web/API Servers** | Handle HTTP requests — compose, read, search, folder management |
| **WebSocket Servers** | Maintain persistent connections for real-time new-mail push |
| **IMAP Gateway** | Translate IMAP protocol to internal API calls |
| **Send Service** | Validate outgoing email, enqueue for delivery |
| **Receive Service** | Accept inbound SMTP, enqueue for processing |
| **Processing Pipeline** | Spam check, virus scan, rule application, storage |
| **Search Service** | Full-text search over email content |
| **Mailbox Service** | CRUD on mailbox — read, move, label, delete |
| **Outgoing Queue** | Buffer outgoing emails, enable retry and rate limiting |
| **Incoming Queue** | Buffer inbound emails before processing |
| **Metadata DB** | User profiles, folder structure, email metadata (Cassandra/HBase) |
| **Email Body Store** | Actual email content — HTML + plain text (distributed object store) |
| **Blob Storage** | Large attachments (S3-compatible) |
| **Search Index** | Elasticsearch cluster or custom inverted index |
| **Cache (Redis)** | Recent emails, folder listings, session data |

---

## 4. Email Storage Deep Dive

### Why Traditional RDBMS Fails at Email Scale

| Challenge | RDBMS Limitation |
|---|---|
| **800 TB/day ingestion** | Single-master writes bottleneck |
| **Billions of rows per table** | Index maintenance becomes prohibitive |
| **Variable-size bodies** | BLOBs in RDBMS are inefficient for multi-KB email bodies |
| **User-centric access** | JOINs across users are rare; per-user partitioning is natural |
| **Schema evolution** | Adding headers/labels requires ALTER TABLE on massive tables |

### Why Simple Filesystem Fails

- No transactional guarantees across metadata + body
- No built-in replication or fault tolerance
- Inode limits on large directories (millions of emails per user)
- No efficient search or indexing
- Difficult to shard across machines

### Recommended Storage Architecture

```
┌─────────────────────────────────────────────────────┐
│                   STORAGE TIERS                      │
│                                                      │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  Metadata Store   │   │   Email Body Store     │  │
│  │  (Cassandra/HBase)│   │   (Cassandra/HBase/    │  │
│  │                   │   │    custom blob store)   │  │
│  │  • email_id       │   │                        │  │
│  │  • user_id        │   │  • email_id → body     │  │
│  │  • from, to, cc   │   │  • HTML + plain text   │  │
│  │  • subject        │   │  • Compressed (LZ4)    │  │
│  │  • timestamp      │   │                        │  │
│  │  • labels/folders │   │                        │  │
│  │  • read/unread    │   │                        │  │
│  │  • thread_id      │   │                        │  │
│  │  • has_attachment  │   │                        │  │
│  │  • snippet        │   │                        │  │
│  └──────────────────┘   └────────────────────────┘  │
│                                                      │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  Blob Storage     │   │  Cache Layer           │  │
│  │  (S3 / GCS)      │   │  (Redis Cluster)       │  │
│  │                   │   │                        │  │
│  │  • Attachments    │   │  • Recent 50 emails    │  │
│  │  • Inline images  │   │  • Folder counts       │  │
│  │  • Referenced by  │   │  • Contact list        │  │
│  │    attachment_id  │   │  • Session tokens      │  │
│  └──────────────────┘   └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data Model

**Email Metadata Table** (Cassandra — partition key: `user_id`, clustering key: `folder_id, timestamp DESC`)

```
CREATE TABLE email_metadata (
    user_id       UUID,
    folder_id     TEXT,          -- 'inbox', 'sent', 'drafts', 'trash', custom
    email_id      TIMEUUID,     -- time-sortable unique ID
    timestamp     TIMESTAMP,
    from_addr     TEXT,
    to_addrs      LIST<TEXT>,
    cc_addrs      LIST<TEXT>,
    subject       TEXT,
    snippet       TEXT,          -- first ~100 chars for preview
    is_read       BOOLEAN,
    is_starred    BOOLEAN,
    labels        SET<TEXT>,
    thread_id     UUID,
    has_attachment BOOLEAN,
    body_ref      TEXT,          -- pointer to body store
    attachment_refs LIST<TEXT>,  -- pointers to blob storage

    PRIMARY KEY ((user_id), folder_id, timestamp, email_id)
) WITH CLUSTERING ORDER BY (folder_id ASC, timestamp DESC, email_id DESC);
```

This model supports efficient queries:
- **"Show inbox, newest first"** → partition `user_id`, filter `folder_id = 'inbox'`, natural DESC order
- **"Show unread count per folder"** → maintained via counter table or materialized view
- **"All emails in a thread"** → secondary index on `thread_id` or separate thread table

**Email Body Table:**

```
CREATE TABLE email_body (
    email_id   TIMEUUID,
    body_html  BLOB,      -- compressed HTML content
    body_text  TEXT,       -- plain text fallback
    headers    MAP<TEXT, TEXT>,  -- raw MIME headers
    PRIMARY KEY (email_id)
);
```

**Attachment Reference Table:**

```
CREATE TABLE attachments (
    attachment_id  UUID,
    email_id       TIMEUUID,
    filename       TEXT,
    content_type   TEXT,
    size_bytes     BIGINT,
    blob_url       TEXT,       -- S3/GCS path
    checksum       TEXT,       -- SHA-256 for dedup
    PRIMARY KEY (attachment_id)
);
```

### Partitioning Strategy

```
                    ┌─────────────────────┐
                    │    user_id hash      │
                    │   consistent ring    │
                    └──────┬──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                   ▼
  ┌───────────┐     ┌───────────┐       ┌───────────┐
  │  Shard A  │     │  Shard B  │       │  Shard C  │
  │ users 0-N │     │ users N-M │       │ users M-Z │
  │           │     │           │       │           │
  │ All emails│     │ All emails│       │ All emails│
  │ for these │     │ for these │       │ for these │
  │ users     │     │ users     │       │ users     │
  └───────────┘     └───────────┘       └───────────┘
```

**Partition by `user_id`** to achieve data locality — all emails for a single user reside on the same shard. This eliminates cross-shard queries for the most common operation (loading a user's inbox).

**Hot user mitigation:** Power users (corporate accounts receiving thousands of emails/day) can overwhelm a single shard. Solutions:
- Sub-partition by folder within the user partition
- Dedicated shard assignment for VIP accounts
- Time-based bucketing: partition key = `(user_id, year_month)`

### Storage Tiering

```
┌────────────────────────────────────────────────────┐
│                  STORAGE TIERS                      │
│                                                     │
│  HOT (SSD, in-memory cache)                        │
│  ├── Last 30 days of emails                        │
│  ├── Frequently accessed folders (inbox, sent)     │
│  └── Low latency: < 10ms reads                     │
│                                                     │
│  WARM (HDD / cheaper SSD)                          │
│  ├── 30 days – 1 year old                          │
│  ├── Less frequently accessed                      │
│  └── Medium latency: < 100ms reads                 │
│                                                     │
│  COLD (Object storage / archive)                   │
│  ├── > 1 year old                                  │
│  ├── Rarely accessed (but must remain searchable)  │
│  └── Higher latency: < 1s reads (acceptable)       │
└────────────────────────────────────────────────────┘
```

Transition between tiers is handled by a background compaction/migration service. Gmail, for instance, keeps metadata in hot tier but moves old email bodies to cold storage.

---

## 5. Email Sending Flow (Detailed)

### End-to-End Sending Path

```
┌──────┐   1. Compose    ┌──────────┐  2. Validate   ┌──────────┐
│Client│ ──────────────→  │ API      │ ─────────────→ │  Send    │
│(Web) │   HTTP POST      │ Server   │  + store sent  │ Service  │
└──────┘                  └──────────┘                 └────┬─────┘
                                                            │
                          3. Enqueue                        │
                    ┌──────────────────────────────────────┘
                    ▼
             ┌─────────────┐  4. Dequeue   ┌─────────────────┐
             │  Outgoing   │ ────────────→ │  SMTP Sender    │
             │  Queue      │               │  Worker Pool    │
             └─────────────┘               └────────┬────────┘
                                                     │
                                          5. DNS MX  │
                                             lookup  │
                                                     ▼
                                           ┌──────────────────┐
                                           │ Recipient's MX   │
                                           │ Server           │
                                           └──────────────────┘
```

### Step-by-Step Flow

**Step 1: User composes email**
- Client sends HTTP POST to `/api/v1/emails/send`
- Payload: `{ to, cc, bcc, subject, body_html, body_text, attachments[] }`

**Step 2: API server validation**
- Authenticate user (JWT / session token)
- Validate recipient addresses (basic format check)
- Check attachment size limits (typically 25MB per email)
- Rate limit check (prevent spam from compromised accounts)
- Upload attachments to blob storage, get references
- Store email in user's "Sent" folder
- Return 202 Accepted (async delivery)

**Step 3: Enqueue to outgoing queue**
- Message placed on outgoing Kafka/SQS topic
- Partitioned by recipient domain for batching to same MX server
- Includes full MIME-formatted message

**Step 4: SMTP Sender worker processes message**
- Dequeue message
- Look up recipient domain MX records via DNS
- Cache MX results with TTL (typically 1 hour)
- Group messages to same domain for connection reuse

**Step 5: SMTP delivery**
- Open TLS connection to recipient MX server (port 25)
- Authenticate via STARTTLS
- Send email using SMTP protocol
- Handle response codes

### Bounce Handling

| Bounce Type | SMTP Code | Meaning | Action |
|---|---|---|---|
| **Hard bounce** | 550, 551, 552, 553 | Permanent failure (user doesn't exist, domain invalid) | Mark address invalid, notify sender, stop retrying |
| **Soft bounce** | 421, 450, 451, 452 | Temporary failure (mailbox full, server busy) | Retry with exponential backoff |
| **Greylisting** | 451 | Server temporarily rejects unknown senders | Retry after 5-15 minutes (normal behavior) |

**Retry strategy:**

```
Attempt 1: Immediate
Attempt 2: After 5 minutes
Attempt 3: After 30 minutes
Attempt 4: After 2 hours
Attempt 5: After 8 hours
Attempt 6: After 24 hours
Give up:   After 72 hours → send bounce-back notification to sender
```

### Sender Authentication (SPF, DKIM, DMARC)

These three protocols work together to prevent email spoofing:

```
┌─────────────────────────────────────────────────────────────┐
│                SENDER AUTHENTICATION STACK                   │
│                                                              │
│  ┌─────────┐                                                │
│  │  SPF    │  "Which servers are allowed to send for        │
│  │         │   this domain?"                                 │
│  │         │  DNS TXT: v=spf1 include:_spf.google.com ~all  │
│  └─────────┘                                                │
│                                                              │
│  ┌─────────┐                                                │
│  │  DKIM   │  "Is this email really from who it claims?"    │
│  │         │  Cryptographic signature in email header        │
│  │         │  Public key published in DNS TXT record         │
│  └─────────┘                                                │
│                                                              │
│  ┌─────────┐                                                │
│  │  DMARC  │  "What should receivers do if SPF/DKIM fail?"  │
│  │         │  DNS TXT: v=DMARC1; p=reject; rua=...          │
│  │         │  Policies: none, quarantine, reject             │
│  └─────────┘                                                │
└─────────────────────────────────────────────────────────────┘
```

**SPF (Sender Policy Framework):**
- Domain publishes a DNS TXT record listing authorized sending IPs
- Receiving server checks if the sending IP matches the SPF record
- Prevents random servers from forging your domain

**DKIM (DomainKeys Identified Mail):**
- Sending server signs the email with a private key
- Public key is published in DNS
- Receiver verifies the signature → proves email wasn't tampered with

**DMARC (Domain-based Message Authentication, Reporting & Conformance):**
- Builds on SPF + DKIM
- Tells receivers what to do when authentication fails (none / quarantine / reject)
- Provides reporting back to the domain owner

---

## 6. Email Receiving Flow (Detailed)

### End-to-End Receiving Path

```
┌───────────┐  SMTP   ┌────────────┐  Enqueue  ┌──────────┐
│ External  │ ──────→ │  Our MX    │ ────────→ │ Incoming │
│ Sender    │  :25    │  Servers   │           │  Queue   │
└───────────┘         └────────────┘           └────┬─────┘
                                                     │
                                               Dequeue│
                                                     ▼
                                          ┌──────────────────┐
                                          │   PROCESSING     │
                                          │   PIPELINE       │
                                          │                  │
                                          │  ┌────────────┐  │
                                          │  │ Spam Check │  │
                                          │  └─────┬──────┘  │
                                          │        ▼         │
                                          │  ┌────────────┐  │
                                          │  │ Virus Scan │  │
                                          │  └─────┬──────┘  │
                                          │        ▼         │
                                          │  ┌────────────┐  │
                                          │  │ Content    │  │
                                          │  │ Classify   │  │
                                          │  └─────┬──────┘  │
                                          │        ▼         │
                                          │  ┌────────────┐  │
                                          │  │ User Rules │  │
                                          │  │ & Filters  │  │
                                          │  └─────┬──────┘  │
                                          └────────┼─────────┘
                                                   │
                      ┌────────────────────────────┼──────────────┐
                      ▼                            ▼              ▼
              ┌──────────────┐          ┌──────────────┐  ┌──────────────┐
              │ Email Store  │          │ Search Index │  │   Push       │
              │ (body+meta)  │          │ (async)      │  │ Notification │
              └──────────────┘          └──────────────┘  └──────────────┘
```

### Step-by-Step Flow

**Step 1: SMTP Connection**
- External server connects to our MX server on port 25
- TLS negotiation (STARTTLS)
- SMTP handshake: EHLO, MAIL FROM, RCPT TO, DATA

**Step 2: Basic Validation**
- Verify recipient exists in our system (reject unknown users early → saves processing)
- Check message size limits (e.g., 25MB)
- Verify sender authentication (SPF, DKIM, DMARC checks)
- Accept or reject with appropriate SMTP response code
- Apply connection-level rate limiting per source IP

**Step 3: Enqueue to Incoming Queue**
- Raw email (MIME format) placed on incoming Kafka topic
- Partition by recipient `user_id` for ordering per user
- Acknowledge to sender's SMTP server (250 OK) — we now own responsibility for this email

**Step 4: Processing Pipeline**

Each stage is a separate service reading from / writing to queues:

| Stage | Tool / Technique | Action |
|---|---|---|
| **Spam Detection** | ML models, SpamAssassin, Bayesian filters, reputation DB | Assign spam score (0-10). Score > 7 → spam folder |
| **Virus Scanning** | ClamAV, custom scanners | Scan attachments + body for malware. Quarantine if found |
| **Phishing Detection** | URL reputation, homoglyph detection | Flag suspicious links, display warnings |
| **Content Classification** | ML categorization | Primary / Social / Promotions / Updates (Gmail-style) |
| **User Rules & Filters** | Rule engine | Apply user-defined filters (e.g., "from:boss → label:important") |

**Step 5: Store Email**
- Write email body to body store (compressed)
- Write metadata to metadata DB
- Upload attachments to blob storage
- Update folder counters (unread count)

**Step 6: Index for Search**
- Async job extracts searchable text from subject, body, headers
- Pushes to search indexing pipeline
- Elasticsearch indexes the document

**Step 7: Push Notification**
- Check if user has active WebSocket connection
- If online → push new email notification via WebSocket
- If mobile → send push notification via APNs / FCM
- IMAP IDLE → notify connected IMAP clients

### Handling Edge Cases

| Scenario | Solution |
|---|---|
| Recipient doesn't exist | Reject during SMTP handshake (550 User not found) |
| Mailbox full / over quota | Reject with 452 (insufficient storage) |
| Spam flood from single IP | Connection-level rate limiting + IP reputation |
| Processing pipeline backlog | Queue absorbs burst; auto-scale workers |
| Duplicate delivery (sender retries) | Idempotency via Message-ID header dedup |

---

## 7. Search Deep Dive

### Requirements

- Full-text search over email subject, body, sender, recipient
- Per-user isolation (user A cannot search user B's emails)
- Low latency (< 500ms p99)
- Support boolean queries: `from:alice subject:meeting has:attachment`
- Handle 1B+ users × thousands of emails each

### Architecture

```
┌───────────┐         ┌───────────────────────────────────┐
│  Client   │ ──────→ │       Search Service               │
│  Query    │         │                                     │
└───────────┘         │  1. Parse query                    │
                      │  2. Route to user's shard          │
                      │  3. Execute against search index   │
                      │  4. Fetch metadata for results     │
                      │  5. Return ranked results          │
                      └──────────┬────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌──────────────┐         ┌──────────────────┐
           │ Elasticsearch│         │  Metadata DB     │
           │ Cluster      │         │  (for snippets   │
           │ (inverted    │         │   & display)     │
           │  index)      │         └──────────────────┘
           └──────────────┘
```

### Index Structure

The inverted index maps terms to (user_id, email_id) pairs:

```
Term              → Posting List
─────────────────────────────────────
"meeting"         → [(user_1, email_5), (user_1, email_89), (user_2, email_12), ...]
"quarterly"       → [(user_1, email_5), (user_3, email_44), ...]
"alice@company"   → [(user_2, email_12), (user_2, email_15), ...]
```

### Per-User Index Partitioning

To enforce isolation and improve query performance, partition the search index by `user_id`:

```
┌──────────────────────────────────────────────┐
│              SEARCH INDEX SHARDS              │
│                                               │
│  Shard 0: users [0, N)                       │
│  ┌─────────────────────────────────────────┐ │
│  │ user_1: "meeting" → [email_5, email_89] │ │
│  │ user_1: "report"  → [email_5, email_22] │ │
│  │ user_2: "meeting" → [email_12]          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Shard 1: users [N, M)                       │
│  ┌─────────────────────────────────────────┐ │
│  │ user_3: "budget"  → [email_44, ...]     │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Every search query is scoped to a single user → hits exactly one shard → no scatter-gather needed.

### Indexing Pipeline

```
New Email Stored ──→ Indexing Queue ──→ Index Worker ──→ Elasticsearch

Index Worker:
  1. Extract plain text from HTML body (strip tags)
  2. Extract text from attachments (PDF, DOCX via Apache Tika)
  3. Tokenize, stem, remove stop words
  4. Build document:
     {
       user_id:    "user_123",
       email_id:   "email_456",
       from:       "alice@example.com",
       to:         ["bob@example.com"],
       subject:    "Q3 Budget Meeting",
       body:       "Hi team, attached is the quarterly budget...",
       date:       "2026-02-20T10:00:00Z",
       labels:     ["inbox", "important"],
       has_attach: true,
       attach_text: "Revenue projections for Q3..."
     }
  5. Index into user's partition in Elasticsearch
```

### Query Parsing

Gmail-style queries are parsed into structured Elasticsearch queries:

| User Query | Parsed Filter |
|---|---|
| `from:alice subject:meeting` | `{ bool: { must: [{ term: { from: "alice" }}, { match: { subject: "meeting" }}]}}` |
| `has:attachment after:2026/01/01` | `{ bool: { must: [{ term: { has_attach: true }}, { range: { date: { gte: "2026-01-01" }}}]}}` |
| `budget OR forecast` | `{ bool: { should: [{ match: { body: "budget" }}, { match: { body: "forecast" }}]}}` |

### Search Performance Optimizations

| Technique | Benefit |
|---|---|
| Per-user partitioning | Single-shard queries, no scatter-gather |
| Async indexing | Doesn't slow down email delivery |
| Index only recent N years on hot tier | Reduces index size by 60-80% |
| Cache frequent queries | "inbox", "starred" are essentially saved searches |
| Prefix-based suggestions | Trie structure for autocomplete on contacts/subjects |

---

## 8. Email Threading / Conversations

### How Threading Works

Email threading relies on three MIME headers defined in RFC 2822:

```
Message-ID:  <unique-id-1@sender.com>      -- Unique ID for this email
In-Reply-To: <unique-id-0@sender.com>      -- The email being replied to
References:  <unique-id-0@sender.com>       -- Full chain of ancestors
             <unique-id-1@sender.com>
```

### Building a Conversation View

```
Thread: "Q3 Budget Discussion"

   ┌─────────────────────────────────────────┐
   │ Email A (original)                      │
   │ Message-ID: <A@co.com>                  │
   │ From: Alice                             │
   │ Subject: Q3 Budget Discussion           │
   └────────────┬────────────────────────────┘
                │
   ┌────────────▼────────────────────────────┐
   │ Email B (reply)                         │
   │ Message-ID: <B@co.com>                  │
   │ In-Reply-To: <A@co.com>                 │
   │ References: <A@co.com>                  │
   │ From: Bob                               │
   │ Subject: Re: Q3 Budget Discussion       │
   └────────────┬────────────────────────────┘
                │
   ┌────────────▼────────────────────────────┐
   │ Email C (reply to reply)                │
   │ Message-ID: <C@co.com>                  │
   │ In-Reply-To: <B@co.com>                 │
   │ References: <A@co.com> <B@co.com>       │
   │ From: Alice                             │
   │ Subject: Re: Re: Q3 Budget Discussion   │
   └─────────────────────────────────────────┘
```

### Data Model for Threads

```
Thread Table (Cassandra):
┌──────────┬───────────┬──────────────┬────────────────┬─────────┐
│ user_id  │ thread_id │ email_id     │ timestamp      │ snippet │
├──────────┼───────────┼──────────────┼────────────────┼─────────┤
│ user_1   │ thread_A  │ email_001    │ 2026-02-20 10:00│ "Hi..." │
│ user_1   │ thread_A  │ email_005    │ 2026-02-20 11:30│ "Re:..."│
│ user_1   │ thread_A  │ email_009    │ 2026-02-20 14:00│ "Sure." │
│ user_1   │ thread_B  │ email_002    │ 2026-02-20 10:15│ "FYI.." │
└──────────┴───────────┴──────────────┴────────────────┴─────────┘
```

**Materialized conversation view:** Pre-compute the thread summary (participants, last message timestamp, snippet of latest reply, unread count within thread) to avoid assembling it at read time. Update asynchronously when new emails arrive in a thread.

### Thread Assignment Algorithm

```
On receiving a new email:
  1. Check In-Reply-To and References headers
  2. If they reference a known Message-ID → add to that thread
  3. If no references but Subject matches (strip "Re:", "Fwd:") and
     participants overlap → heuristically group (Gmail approach)
  4. Otherwise → create a new thread
```

---

## 9. Synchronization

### The Multi-Device Problem

A user reads email on their phone, stars it, then opens their laptop. The state must be consistent. IMAP was designed for this, but modern email uses HTTP APIs with similar challenges.

### Sync Strategies

**1. IMAP IDLE (Push)**

```
Client ──→ IMAP IDLE command ──→ Server holds connection open
                                        │
                              New email arrives
                                        │
Server ──→ "* 42 EXISTS" ──→ Client fetches email 42
```

IMAP IDLE keeps a TCP connection open. The server pushes notifications when new mail arrives. Efficient for desktop clients but drains mobile battery.

**2. Incremental Sync (Delta Sync)**

The client stores a **sync token** (opaque cursor representing the last known state):

```
Client: GET /api/v1/sync?token=abc123
Server: {
  "new_emails":     [{ email_id: 501, ... }, { email_id: 502, ... }],
  "updated_emails": [{ email_id: 300, is_read: true }],
  "deleted_emails": [499],
  "next_token":     "def456"
}
```

This approach:
- Minimizes bandwidth (only send changes)
- Works well for mobile (periodic sync)
- Token encapsulates server-side state (timestamp or sequence number)

**3. Full Sync (Rare)**

If the sync token is too old or invalid, the server forces a full sync of the mailbox state. This is expensive and should be avoided.

### Conflict Resolution

When two devices modify the same email simultaneously:

| Conflict | Resolution Strategy |
|---|---|
| Both mark as read | No conflict — same outcome (idempotent) |
| One marks read, one marks unread | **Last-writer-wins** using timestamp |
| One moves to Trash, one labels | Apply both operations (move + label) if non-contradictory |
| One deletes, one stars | Delete wins (destructive action takes precedence), or configurable |

Most email systems use **last-writer-wins with CRDTs for labels/flags**. Labels are modeled as sets — add/remove operations commute and converge naturally.

### Changelog Table (Server-side)

```
┌──────────┬──────────┬───────────┬─────────────────┬───────────────┐
│ user_id  │ seq_num  │ email_id  │ operation       │ timestamp     │
├──────────┼──────────┼───────────┼─────────────────┼───────────────┤
│ user_1   │ 1001     │ email_50  │ MARK_READ       │ 2026-02-25T.. │
│ user_1   │ 1002     │ email_51  │ NEW_EMAIL       │ 2026-02-25T.. │
│ user_1   │ 1003     │ email_50  │ ADD_LABEL:work  │ 2026-02-25T.. │
│ user_1   │ 1004     │ email_49  │ MOVE:trash      │ 2026-02-25T.. │
└──────────┴──────────┴───────────┴─────────────────┴───────────────┘

Sync token = last consumed seq_num
Client sends: "give me everything after seq_num 1001"
Server returns: rows 1002, 1003, 1004
```

---

## 10. Scaling Strategies

### Sharding

| Data | Shard Key | Rationale |
|---|---|---|
| Email metadata | `user_id` | All user emails on one shard; inbox load = single-shard query |
| Email bodies | `email_id` | Bodies are accessed individually, spread load evenly |
| Search index | `user_id` | Per-user search isolation |
| Attachments | `attachment_id` (content-hash) | Enables deduplication across users |

### Caching Strategy

```
┌──────────────────────────────────────────────────────┐
│                  CACHE LAYERS                         │
│                                                       │
│  L1: Application-level cache (in-process)            │
│      • Parsed user session, auth tokens              │
│      • TTL: request duration                         │
│                                                       │
│  L2: Redis Cluster                                   │
│      • Recent 50 emails per user (inbox page 1)      │
│      • Folder unread counts                          │
│      • Contact list / autocomplete                   │
│      • TTL: 5-15 minutes                             │
│      • Invalidation: on new email / state change     │
│                                                       │
│  L3: CDN (CloudFront / Akamai)                       │
│      • Static assets (JS, CSS, images)               │
│      • User profile photos                           │
│      • Attachment thumbnails                         │
│      • TTL: hours-days                               │
└──────────────────────────────────────────────────────┘
```

### Rate Limiting

| Dimension | Limit | Purpose |
|---|---|---|
| Outgoing emails per user per hour | 500 | Prevent compromised account spam |
| Outgoing emails per user per day | 2,000 | Abuse prevention |
| Incoming SMTP connections per IP | 50/min | DDoS protection |
| API requests per user per minute | 1,000 | General API protection |
| Attachment upload size | 25 MB per email | Storage protection |

### Message Queue Usage

```
┌───────────────────────────────────────────────────────────────┐
│                    QUEUE TOPOLOGY                              │
│                                                                │
│  ┌─────────────────┐                                          │
│  │ Outgoing Queue   │  Topics: by recipient domain            │
│  │ (Kafka)          │  Partitions: ~100 per topic             │
│  │                  │  Consumers: SMTP sender worker pool     │
│  │                  │  Retry: DLQ after 72h of failures       │
│  └─────────────────┘                                          │
│                                                                │
│  ┌─────────────────┐                                          │
│  │ Incoming Queue   │  Topics: by pipeline stage              │
│  │ (Kafka)          │  Partitions: by user_id hash            │
│  │                  │  Consumers: processing pipeline workers │
│  └─────────────────┘                                          │
│                                                                │
│  ┌─────────────────┐                                          │
│  │ Indexing Queue   │  Topics: search-index-updates           │
│  │ (Kafka)          │  Consumers: Elasticsearch indexers      │
│  └─────────────────┘                                          │
│                                                                │
│  ┌─────────────────┐                                          │
│  │ Notification Q   │  Topics: push-notifications             │
│  │ (Kafka/SQS)     │  Consumers: WebSocket + APNs/FCM pushers│
│  └─────────────────┘                                          │
└───────────────────────────────────────────────────────────────┘
```

### Auto-Scaling Dimensions

| Component | Scale Trigger | Scale Strategy |
|---|---|---|
| API servers | CPU > 70% or request latency > 200ms | Horizontal pod autoscaler |
| SMTP senders | Outgoing queue depth > 10K | Add workers |
| Processing pipeline | Incoming queue lag > 5 min | Add pipeline workers |
| Elasticsearch | Query latency > 500ms or disk > 80% | Add nodes / shards |
| WebSocket servers | Connection count > 80% capacity | Add servers, rebalance |

---

## 11. Spam & Security

### Spam Detection Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                  SPAM DETECTION LAYERS                          │
│                                                                 │
│  Layer 1: Connection Level (before accepting email)            │
│  ├── IP reputation (blocklists: Spamhaus, Barracuda)           │
│  ├── Reverse DNS check (PTR record must exist)                 │
│  ├── SPF verification                                          │
│  └── Rate limiting per source IP                               │
│                                                                 │
│  Layer 2: Header Analysis (after accepting, during processing) │
│  ├── DKIM signature verification                               │
│  ├── DMARC policy evaluation                                   │
│  ├── Header consistency checks (forged headers)                │
│  └── Known spam pattern matching                               │
│                                                                 │
│  Layer 3: Content Analysis                                     │
│  ├── Bayesian text classification                              │
│  ├── ML model (trained on billions of spam/ham examples)       │
│  ├── URL reputation (known phishing domains)                   │
│  ├── Image analysis (OCR for text-in-image spam)               │
│  └── SpamAssassin rule scoring                                 │
│                                                                 │
│  Layer 4: User Feedback Loop                                   │
│  ├── "Report spam" signals → retrain models                    │
│  ├── "Not spam" signals → adjust per-user filters              │
│  └── Aggregate signals across all users for global model       │
│                                                                 │
│  Final Score: 0-10                                             │
│  ├── 0-3: Inbox                                                │
│  ├── 4-6: Review / Promotions                                  │
│  └── 7-10: Spam folder                                         │
└────────────────────────────────────────────────────────────────┘
```

### SPF, DKIM, DMARC in Practice

**SPF Record Example:**

```
example.com  TXT  "v=spf1 ip4:192.0.2.0/24 include:_spf.google.com -all"

Meaning:
  - Allow emails from IP range 192.0.2.0/24
  - Allow Google's mail servers (if using Gmail for business)
  - Hard-fail (-all) everything else
```

**DKIM Signature Example:**

```
DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=selector1;
  h=from:to:subject:date:message-id;
  bh=base64_body_hash;
  b=base64_signature;
```

The receiving server:
1. Extracts domain `d=example.com` and selector `s=selector1`
2. Queries DNS: `selector1._domainkey.example.com` TXT record
3. Gets the public key
4. Verifies the signature against the email headers and body hash

**DMARC Record Example:**

```
_dmarc.example.com  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100"

Meaning:
  - p=reject: reject emails failing both SPF and DKIM
  - rua=...: send aggregate reports to this address
  - pct=100: apply to 100% of emails
```

### Encryption

| Layer | Mechanism | What It Protects |
|---|---|---|
| **In transit** | TLS 1.3 (STARTTLS for SMTP) | Email content between servers |
| **At rest** | AES-256 encryption on storage volumes | Emails on disk |
| **End-to-end** | S/MIME or PGP (user-managed keys) | Only sender and recipient can read |
| **API traffic** | HTTPS with certificate pinning | Client-server communication |

### Outgoing Abuse Prevention

- Per-account sending rate limits
- ML anomaly detection (account suddenly sends 10K emails)
- CAPTCHA verification for suspicious patterns
- Automatic account suspension + human review queue
- Shared IP reputation management (warm up new IPs gradually)

---

## 12. Reliability & Fault Tolerance

### Data Durability

Email must **never be lost**. The system achieves this through:

```
┌──────────────────────────────────────────────────────┐
│              DURABILITY GUARANTEES                     │
│                                                       │
│  1. Write-ahead log (WAL) before acknowledging        │
│     the SMTP sender                                   │
│                                                       │
│  2. Replication factor = 3                            │
│     (data written to 3 nodes before ACK)              │
│                                                       │
│  3. Cross-datacenter replication                      │
│     (async replication to secondary DC)               │
│                                                       │
│  4. Message queue persistence                         │
│     (Kafka retains messages on disk with replication) │
│                                                       │
│  5. Periodic backup to cold storage                   │
│     (daily snapshots to S3/GCS)                       │
└──────────────────────────────────────────────────────┘
```

**Key principle:** We only respond `250 OK` to the sender's SMTP server **after** the email is persisted to the incoming queue with replication. If our system crashes before processing, the queue replays the message on recovery.

### Failure Scenarios & Mitigations

| Failure | Impact | Mitigation |
|---|---|---|
| Single storage node dies | Reads/writes to that shard affected | Replication (RF=3), automatic failover |
| Entire datacenter outage | All users in that DC affected | Active-active multi-DC, DNS-based failover |
| Queue broker crash | In-flight messages at risk | Kafka replication, consumer offset tracking |
| Search index corruption | Search unavailable | Rebuild from email store (source of truth) |
| API server crash | Active requests fail | Stateless servers behind LB, auto-restart |
| Spam filter false positive | Legitimate email in spam folder | User "Not Spam" button, periodic review |

### Consistency Model

Email systems generally favor **availability over strict consistency** (AP in CAP theorem):

| Operation | Consistency Level | Rationale |
|---|---|---|
| Sending email | Strong (ack after durable write) | Can't lose a sent email |
| Receiving email | Strong (ack after queue persistence) | Can't lose an inbound email |
| Read/unread status | Eventual | Brief inconsistency across devices is acceptable |
| Labels / folders | Eventual | Same — converges within seconds |
| Search index | Eventual | New email may take 1-5s to become searchable |
| Unread count | Eventual | Counter may briefly lag behind actual state |

---

## 13. Trade-offs & Interview Tips

### Key Design Decisions & Trade-offs

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Email body storage | Same store as metadata | Separate blob/body store | **Separate** — different access patterns and sizes |
| Search index | Co-located with data | Dedicated Elasticsearch cluster | **Dedicated** — search has different scaling needs |
| Push vs pull | WebSocket push | Client polling | **Hybrid** — WebSocket for web, push notification for mobile, IMAP IDLE for desktop |
| Attachment storage | Inline in email store | External blob storage (S3) | **External** — blob storage is cheaper and better for large files |
| Thread model | Database-level threading | Client-side assembly | **Server-side** — pre-compute threads, cache conversation views |
| Spam detection timing | Synchronous (block delivery) | Async (deliver then reclassify) | **Synchronous** for known spam, **async** for borderline cases |
| Consistency | Strong everywhere | Eventual for non-critical ops | **Eventual** for read/label state, **strong** for send/receive |

### Common Follow-up Questions

**Q: "How do you handle a user with 10M+ emails?"**
- Time-based bucketing of partition keys: `(user_id, year_month)`
- Aggressive archival to cold storage
- Limit search to recent N years by default, full search on demand

**Q: "How do you ensure exactly-once delivery?"**
- Idempotent writes keyed by `Message-ID` header
- Deduplication window (check last 7 days of Message-IDs)
- At-least-once delivery + client-side dedup

**Q: "How do you handle 100KB+ emails at 185K/sec?"**
- Separate data and metadata paths
- Stream large bodies directly to blob storage
- Compress bodies with LZ4 (fast compression)
- Pipeline stages process metadata without loading full body

**Q: "How does Gmail categorize into Primary/Social/Promotions?"**
- ML classification using sender reputation, content features, user behavior
- Features: domain of sender, presence of unsubscribe header, link density, past user interaction
- Continuously retrained on user feedback (move between categories)

**Q: "What about email forwarding and mailing lists?"**
- Forwarding: rewrite envelope sender, preserve original headers
- Mailing lists: expand recipient list at send time, BCC handling
- List-Unsubscribe header for one-click unsubscribe

**Q: "How do you migrate from one storage system to another?"**
- Dual-write during migration period
- Background backfill of historical data
- Feature flags to gradually shift reads to new system
- Verify data integrity via checksums before cutover

### Interview Approach Framework

```
Step 1: Clarify Requirements (2-3 min)
  ├── "Are we designing the full email service or just one aspect?"
  ├── "What scale? Consumer (1B users) or enterprise?"
  ├── "Which features are in scope? Search? Spam? Threading?"
  └── "Any specific non-functional requirements to emphasize?"

Step 2: Back-of-Envelope Estimation (2-3 min)
  ├── DAU, emails/day, storage/day
  ├── Read:write ratio (reads dominate ~10:1)
  └── Peak traffic patterns (morning email check spike)

Step 3: High-Level Design (8-10 min)
  ├── Three main flows: Send, Receive, Read
  ├── Component diagram with queues, storage, processing
  └── Protocol choices (SMTP, HTTP, WebSocket)

Step 4: Deep Dive (10-15 min) — Pick 2-3 areas
  ├── Storage design & data model
  ├── Search architecture
  ├── Spam detection pipeline
  ├── Sync & consistency model
  └── Scaling & fault tolerance

Step 5: Wrap-up (2-3 min)
  ├── Summarize key trade-offs
  ├── Mention what you'd add with more time
  └── Discuss monitoring: delivery latency, spam false-positive rate, search p99
```

### Quick Reference Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────┐
│          DISTRIBUTED EMAIL SERVICE — CHEAT SHEET                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PROTOCOLS                                                       │
│    Send: SMTP (port 587 submit, port 25 relay)                   │
│    Read: IMAP (port 993) / HTTP API (port 443)                   │
│    Push: WebSocket / IMAP IDLE / APNs+FCM                        │
│    Auth: SPF + DKIM + DMARC                                      │
│                                                                   │
│  STORAGE                                                         │
│    Metadata:    Cassandra / HBase (partition by user_id)          │
│    Bodies:      Distributed blob store (compressed, tiered)      │
│    Attachments: S3/GCS (deduplicated by content hash)            │
│    Search:      Elasticsearch (partitioned by user_id)           │
│    Cache:       Redis (recent emails, folder counts)             │
│                                                                   │
│  KEY NUMBERS                                                     │
│    1B users, 400M DAU, 16B emails/day, 185K emails/sec          │
│    800 TB/day new email data                                     │
│    50KB avg email, 25MB max attachment                            │
│    < 200ms p99 inbox load, < 500ms p99 search                    │
│                                                                   │
│  CRITICAL DESIGN CHOICES                                         │
│    ✓ Partition by user_id for data locality                      │
│    ✓ Async processing pipeline via message queues                │
│    ✓ Separate metadata, body, and attachment storage             │
│    ✓ Hot/warm/cold storage tiering                               │
│    ✓ Per-user search index partitioning                          │
│    ✓ Incremental sync with changelog + sync tokens               │
│    ✓ Multi-layer spam detection (IP → header → content → ML)     │
│    ✓ Never ACK sender before durable queue write (no data loss)  │
│                                                                   │
│  ANTI-SPAM STACK                                                 │
│    IP reputation → SPF/DKIM/DMARC → Bayesian + ML → User        │
│    feedback loop → Score 0-10 → Inbox / Promo / Spam             │
│                                                                   │
│  RELIABILITY                                                     │
│    RF=3, WAL before ACK, cross-DC replication, queue persistence │
│    Idempotent delivery via Message-ID dedup                      │
│    Exponential backoff retry (up to 72h then bounce)             │
│                                                                   │
│  MONITORING                                                      │
│    • Email delivery latency (send → recipient inbox)             │
│    • Spam false-positive / false-negative rates                  │
│    • Search p99 latency                                          │
│    • Queue depth (incoming/outgoing)                             │
│    • Storage utilization per tier                                │
│    • Bounce rate per sending IP                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

*Chapter 8 covers one of the oldest yet most complex distributed systems. The key insight is that email is fundamentally an asynchronous, store-and-forward protocol — embrace queues, eventual consistency for non-critical paths, and strict durability for the email delivery path itself.*
