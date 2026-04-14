# Chapter 12: Digital Wallet

## 1. Problem Statement & Requirements

### What Are We Designing?

A **digital wallet system** — the backend that powers wallet balances in products like Apple Pay Cash, Venmo, PayPal balance, Stripe wallet, or in-app wallets for ride-hailing and food-delivery platforms. Users load money into their wallet, transfer money to other users, and pay merchants — all backed by a system that must **never lose a cent**.

This is one of the hardest system design problems because it sits at the intersection of **distributed transactions**, **financial correctness**, and **high throughput**. A single bug can cause real monetary loss or regulatory violation. Interviewers love it because it forces you to reason about consistency guarantees that go far beyond typical web applications.

### Functional Requirements

1. **Transfer money** — move funds from one wallet to another (P2P)
2. **Check balance** — retrieve current wallet balance in real time
3. **Transaction history** — list past credits and debits with metadata
4. **Deposit / withdraw** — load money from external bank or card; cash out to bank
5. **Multi-currency support** — wallets may hold balances in different currencies

### Non-Functional Requirements

| Requirement | Target | Why |
|---|---|---|
| **Correctness** | Zero discrepancy — every cent accounted for | Financial regulation, user trust |
| **Reliability** | No money lost, even during failures | Fundamental contract with users |
| **Availability** | 99.999% for balance reads, 99.99% for transfers | Revenue-critical path |
| **Consistency** | Strong for writes, eventual OK for reads | Cannot double-spend or create money |
| **Auditability** | Full, immutable audit trail | AML/KYC regulations, dispute resolution |
| **Latency** | < 500ms for transfers, < 100ms for balance | Competitive UX |
| **Throughput** | 1 million TPS at peak | Think global payment platforms |

### Scale Estimation (Back-of-Envelope)

```
Active wallets:           500 million
Daily active users:       50 million
Transfers per day:        200 million
Average TPS:              200M / 86,400 ≈ 2,300 TPS
Peak TPS (10× avg):       ~23,000 TPS (single-region)
Global peak (all regions): ~1,000,000 TPS target

Per transfer data:
  Event record:           ~200 bytes
  Daily event volume:     200M × 2 events/transfer × 200B ≈ 80 GB/day
  Annual event volume:    ~29 TB/year

Balance reads per day:    2 billion (10× transfers)
Balance read QPS avg:     ~23,000, peak ~230,000
```

**Key insight**: the challenge is not raw throughput alone — it is maintaining **strict correctness** (no double-spending, no phantom money) while handling millions of concurrent transfers that may touch overlapping wallets.

---

## 2. High-Level Design

### API Design

```
POST /v1/wallet/transfer
Body: {
  "from_wallet_id": "w_abc123",
  "to_wallet_id":   "w_def456",
  "amount":         "25.00",
  "currency":       "USD",
  "idempotency_key": "txn_8f14e45f"
}
Response 200: {
  "transfer_id": "tr_99a1b2c3",
  "status": "COMPLETED",
  "timestamp": "2026-02-25T10:30:00Z"
}

GET /v1/wallet/balance?wallet_id=w_abc123
Response 200: {
  "wallet_id": "w_abc123",
  "balance": "1042.50",
  "currency": "USD",
  "as_of": "2026-02-25T10:30:01Z"
}

GET /v1/wallet/transactions?wallet_id=w_abc123&limit=20&cursor=evt_xxx
Response 200: {
  "transactions": [
    {
      "event_id": "evt_001",
      "type": "DEBIT",
      "amount": "25.00",
      "counterparty": "w_def456",
      "transfer_id": "tr_99a1b2c3",
      "timestamp": "2026-02-25T10:30:00Z"
    }
  ],
  "next_cursor": "evt_002"
}
```

Design notes:
- **Amount as string**: avoids floating-point precision issues — always use fixed-point or decimal representation for money.
- **Idempotency key**: client-generated unique key to prevent duplicate transfers on retries.
- **Cursor-based pagination**: more efficient than offset for append-heavy transaction logs.

### System Architecture

```
┌─────────┐       ┌──────────────┐       ┌─────────────────┐
│  Client  │──────▶│  API Gateway │──────▶│ Transfer Service │
│ (mobile/ │       │  (auth, rate │       │  (orchestrates   │
│  web)    │       │   limiting)  │       │   the transfer)  │
└─────────┘       └──────────────┘       └────────┬────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │                        │                        │
                          ▼                        ▼                        ▼
                  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                  │Wallet Service│       │Ledger Service│       │ Idempotency  │
                  │ (balance,    │       │ (append-only │       │   Store      │
                  │  validation) │       │  event log)  │       │ (dedup keys) │
                  └──────┬───────┘       └──────┬───────┘       └──────────────┘
                         │                      │
                         ▼                      ▼
                  ┌──────────────┐       ┌──────────────┐
                  │  Balance DB  │       │  Event Store │
                  │ (read model) │       │ (write model)│
                  └──────────────┘       └──────────────┘
```

### Component Responsibilities

| Component | Role |
|---|---|
| **API Gateway** | Authentication, rate limiting, request routing, TLS termination |
| **Transfer Service** | Orchestrates the end-to-end transfer flow; coordinates debit + credit |
| **Wallet Service** | Validates balances, enforces business rules (limits, currency), serves balance queries |
| **Ledger Service** | Appends immutable events to the event store; source of truth |
| **Idempotency Store** | Maps idempotency keys to results; prevents duplicate processing |
| **Balance DB** | Materialized read model — current balances derived from events |
| **Event Store** | Append-only log of all financial events — the authoritative record |

### Transfer Flow (Happy Path)

```
Client          API GW         Transfer Svc      Ledger Svc        Wallet Svc
  │                │                │                │                 │
  │─── POST /transfer ──▶│         │                │                 │
  │                │──── validate ──▶│               │                 │
  │                │                │── check idemp. key ──────────────│
  │                │                │◀─ not duplicate ─────────────────│
  │                │                │                │                 │
  │                │                │── check balance(A) ─────────────▶│
  │                │                │◀─ balance sufficient ───────────│
  │                │                │                │                 │
  │                │                │── append DEBIT event(A) ───────▶│
  │                │                │── append CREDIT event(B) ──────▶│
  │                │                │◀─ events persisted ────────────│
  │                │                │                │                 │
  │                │                │── update balance(A) ────────────▶│
  │                │                │── update balance(B) ────────────▶│
  │                │                │                │                 │
  │                │◀─── 200 OK ────│               │                 │
  │◀── transfer result ──│         │                │                 │
```

---

## 3. In-Memory Stores vs Database for Balance

Storing and querying balances at 1M TPS is a significant challenge. Let's examine the options.

### Option 1: Traditional RDBMS with Row-Level Locking

```
┌─────────────────────────┐
│   wallets table         │
│─────────────────────────│
│ wallet_id │ balance     │
│───────────┼─────────────│
│ w_abc123  │ 1042.50     │  ◀── UPDATE wallets SET balance = balance - 25
│ w_def456  │  300.00     │      WHERE wallet_id = 'w_abc123'
└─────────────────────────┘      AND balance >= 25;
```

**Pros**: simple, ACID transactions, well understood.
**Cons**: row-level contention on hot wallets (e.g., a merchant wallet receiving thousands of payments/sec). A single row can sustain ~1K updates/sec on modern hardware before lock contention degrades performance.

### Option 2: Redis for In-Memory Balance

```
Redis:  MULTI
        DECRBY wallet:w_abc123 2500   (amount in cents)
        INCRBY wallet:w_def456 2500
        EXEC
```

**Pros**: extremely fast (~100K ops/sec per node), atomic multi-key ops within same shard.
**Cons**: durability risk (even with AOF, a crash window exists), cross-shard atomicity not natively supported, no built-in audit trail.

### Option 3: Event Sourcing (Derive Balance from Events)

```
Event Log:
  evt_001 | w_abc123 | DEBIT  | 25.00 | tr_99a1b2c3
  evt_002 | w_def456 | CREDIT | 25.00 | tr_99a1b2c3

Balance(w_abc123) = SUM of all events for w_abc123
                  = initial_deposit - 25.00
                  = 1042.50
```

**Pros**: immutable audit trail, can reconstruct any historical state, append-only writes are fast.
**Cons**: computing balance by replaying all events is slow; requires snapshots and a materialized read model.

### Recommendation for Interview

Use **Event Sourcing** as the write model (source of truth) with a **materialized balance** as the read model. This gives you correctness + auditability from events, and performance from pre-computed balances. This is the approach the rest of this chapter follows.

```
┌──────────────────────────────────────────────────┐
│              Recommended Architecture            │
│                                                  │
│  Writes ──▶ Event Store (append-only, immutable) │
│                  │                               │
│                  ▼                               │
│         Event Processor (async)                  │
│                  │                               │
│                  ▼                               │
│  Reads ◀── Balance Store (materialized view)     │
└──────────────────────────────────────────────────┘
```

---

## 4. Distributed Transactions — The Core Problem

### Why Is This Hard?

A transfer involves **two wallets**. In a sharded database (required at scale), wallet A and wallet B likely live on different shards or even different databases.

```
Shard 1 (wallets A–M)          Shard 2 (wallets N–Z)
┌──────────────────┐           ┌──────────────────┐
│ wallet A: $100   │           │ wallet P: $200   │
│                  │           │                  │
│ Debit $30 ───────┼───────────┼──▶ Credit $30    │
│                  │           │                  │
│ wallet A: $70    │           │ wallet P: $230   │
└──────────────────┘           └──────────────────┘

What if the debit succeeds but the credit fails?
  → $30 vanishes from the system. Unacceptable.
```

We need a mechanism to make the cross-shard debit+credit **atomic**. Three main approaches exist.

### Approach 1: Two-Phase Commit (2PC)

```
                    Coordinator
                    (Transfer Service)
                         │
            ┌────────────┼────────────┐
            │     PHASE 1: PREPARE    │
            ▼                         ▼
      ┌──────────┐             ┌──────────┐
      │ Shard 1  │             │ Shard 2  │
      │ (debit A)│             │(credit B)│
      │          │             │          │
      │ VOTE:YES │             │ VOTE:YES │
      └────┬─────┘             └────┬─────┘
           │                        │
           └────────┬───────────────┘
                    ▼
            ┌────────────┐
            │ PHASE 2:   │
            │ COMMIT     │
            └────┬───┬───┘
                 │   │
            ┌────┘   └────┐
            ▼              ▼
      ┌──────────┐  ┌──────────┐
      │ Shard 1  │  │ Shard 2  │
      │ COMMITTED│  │ COMMITTED│
      └──────────┘  └──────────┘
```

**How it works**:
1. **Prepare phase**: coordinator asks all participants to prepare (acquire locks, validate). Each votes YES or NO.
2. **Commit phase**: if all vote YES → coordinator sends COMMIT. If any votes NO → coordinator sends ABORT.

**Pros**:
- Strong consistency — the transfer is fully atomic.
- Conceptually straightforward.

**Cons**:
- **Blocking**: participants hold locks during the entire protocol. If the coordinator crashes after PREPARE but before COMMIT, participants are stuck holding locks indefinitely.
- **Performance**: lock duration spans network round trips; throughput drops significantly.
- **Single point of failure**: the coordinator. Must be made highly available itself.
- Not suitable for high-TPS systems — typically maxes out at hundreds of TPS.

### Approach 2: Saga Pattern

```
                    Saga Orchestrator
                         │
                         ▼
               ┌─────────────────┐
               │ Step 1: Debit A │
               │   (local txn)   │
               └────────┬────────┘
                        │ success
                        ▼
               ┌─────────────────┐
               │ Step 2: Credit B│
               │   (local txn)   │
               └────────┬────────┘
                        │
                 ┌──────┴──────┐
                 │             │
              success        failure
                 │             │
                 ▼             ▼
            ┌─────────┐  ┌──────────────┐
            │  DONE   │  │ Compensate:  │
            │         │  │ Refund A     │
            └─────────┘  └──────────────┘
```

**How it works**: break the distributed transaction into a **sequence of local transactions**, each on its own shard. If any step fails, execute **compensating transactions** to undo prior steps.

**Two flavors**:

| | Choreography | Orchestration |
|---|---|---|
| Coordination | Each service listens to events and reacts | Central orchestrator directs the flow |
| Coupling | Loose (event-driven) | Tighter (orchestrator knows all steps) |
| Observability | Hard to trace full flow | Easy — orchestrator has full view |
| Complexity | Grows with number of steps | Centralized, easier to reason about |
| Best for | Simple, few-step sagas | Complex, multi-step flows |

**For a digital wallet, use orchestration** — the flow is critical and must be observable.

**Pros**:
- No distributed locks — each step is a local transaction.
- Higher throughput than 2PC.
- Works across heterogeneous systems (different DBs, services).

**Cons**:
- **Eventually consistent** — between debit and credit, the system is in an intermediate state.
- **Compensating transactions are hard to get right**: what if the compensating transaction itself fails? Need retry + idempotency.
- **Dirty reads possible**: another query might see wallet A debited but wallet B not yet credited.

### Approach 3: Try-Confirm/Cancel (TCC)

```
                      TCC Coordinator
                           │
              ┌────────────┼────────────┐
              │       PHASE 1: TRY      │
              ▼                         ▼
        ┌──────────┐             ┌──────────┐
        │ Shard 1  │             │ Shard 2  │
        │ FREEZE   │             │ RESERVE  │
        │ $30 in A │             │ slot in B│
        └────┬─────┘             └────┬─────┘
             │ reserved                │ reserved
             └────────┬───────────────┘
                      ▼
        ┌─────────────────────────────┐
        │  All reserved? ──▶ CONFIRM  │
        │  Any failed?   ──▶ CANCEL   │
        └────────────┬────────────────┘
                     │
           ┌─────────┴──────────┐
           ▼                    ▼
     ┌──────────┐        ┌──────────┐
     │ CONFIRM: │        │ CONFIRM: │
     │ Deduct A │        │ Credit B │
     └──────────┘        └──────────┘
```

**How it works**:
1. **Try**: reserve resources (freeze $30 in wallet A's available balance, but don't deduct yet).
2. **Confirm**: if all Try's succeed, execute the actual transfer.
3. **Cancel**: if any Try fails, release all reservations.

**Key difference from Saga**: TCC **reserves** resources upfront, so there's no dirty-read window where money has been deducted but not yet credited. The available balance decreases during Try, but the actual balance doesn't change until Confirm.

**Pros**:
- Better isolation than Saga — no intermediate states visible to users.
- No compensating transactions needed (Cancel just releases reservations).
- Well-suited for financial operations.

**Cons**:
- Every service must implement Try/Confirm/Cancel interfaces — higher development cost.
- Frozen funds impact user experience (balance shows as reduced during reservation).
- Still eventually consistent (between Try and Confirm).

### Comparison Table

| Aspect | 2PC | Saga | TCC |
|---|---|---|---|
| **Consistency** | Strong (atomic) | Eventual | Eventual (but better isolation) |
| **Isolation** | Full | None (dirty reads possible) | Reservation-based (good) |
| **Performance** | Low (locks held across network) | High (local transactions) | Medium-High |
| **Complexity** | Medium | Medium (compensating logic) | High (3 interfaces per service) |
| **Failure handling** | Coordinator recovery | Compensating transactions | Cancel reservations |
| **Blocking** | Yes (lock-based) | No | No |
| **Best for** | Small-scale, strong consistency | Microservices, high throughput | Financial systems needing isolation |
| **Used by** | Traditional banks | E-commerce, order flows | Payment processors, wallets |

### Interview Recommendation

For a digital wallet, **TCC** is the strongest answer because it provides the isolation financial systems demand without the blocking penalty of 2PC. If the interviewer pushes back on complexity, **Saga with orchestration** is a pragmatic fallback. Always mention all three and explain the trade-offs.

---

## 5. Event Sourcing — Deep Dive

### Core Idea

Instead of storing the **current state** (balance = $1042.50), store every **event** (fact) that ever happened. The current state is derived by replaying events.

```
Traditional (state-based):          Event Sourcing:
┌─────────────────────┐            ┌──────────────────────────────────┐
│ wallet_id │ balance  │            │ event_id │ wallet │ type  │ amt  │
│───────────┼──────────│            │──────────┼────────┼───────┼──────│
│ w_abc123  │ 1042.50  │            │ evt_001  │ w_abc  │CREDIT │ 1000 │
│           │          │            │ evt_002  │ w_abc  │CREDIT │  100 │
│  (how did we get     │            │ evt_003  │ w_abc  │DEBIT  │   50 │
│   here? no idea.)    │            │ evt_004  │ w_abc  │DEBIT  │  7.50│
└─────────────────────┘            │                                  │
                                    │ Balance = 1000+100-50-7.50      │
                                    │        = 1042.50  ✓             │
                                    └──────────────────────────────────┘
```

### Event Log Structure

Each event is an **immutable, append-only** record:

```json
{
  "event_id":       "evt_004",
  "wallet_id":      "w_abc123",
  "transfer_id":    "tr_99a1b2c3",
  "type":           "DEBIT",
  "amount":         "25.00",
  "currency":       "USD",
  "balance_after":  "1017.50",
  "idempotency_key":"txn_8f14e45f",
  "created_at":     "2026-02-25T10:30:00Z",
  "metadata": {
    "description": "Transfer to w_def456",
    "ip_address":  "192.168.1.1"
  }
}
```

Key fields:
- **event_id**: globally unique, monotonically increasing within a wallet (for ordering).
- **transfer_id**: links the debit and credit events of a single transfer.
- **balance_after**: denormalization — avoids replaying all events just to show a balance on a receipt. This is computed at write time.
- **idempotency_key**: used for deduplication.

### Advantages of Event Sourcing for Wallets

```
┌──────────────────────────────────────────────────────────┐
│                  Why Event Sourcing?                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. COMPLETE AUDIT TRAIL                                │
│     Every transaction is permanently recorded.           │
│     Regulators can trace any discrepancy.                │
│                                                          │
│  2. TEMPORAL QUERIES                                    │
│     "What was the balance at 3:00 PM yesterday?"        │
│     → Replay events up to that timestamp.               │
│                                                          │
│  3. DEBUGGING & DISPUTE RESOLUTION                      │
│     User claims "I didn't make that transfer."          │
│     → Inspect the exact event, its metadata, IP, time.  │
│                                                          │
│  4. APPEND-ONLY = FAST WRITES                           │
│     No row updates, no lock contention on balance row.  │
│     Sequential writes are the fastest I/O pattern.      │
│                                                          │
│  5. NATURAL FIT FOR CQRS                                │
│     Separates write path (events) from read path        │
│     (materialized balances). Scale independently.       │
│                                                          │
│  6. REPLAY & REBUILD                                    │
│     Introduce a new read model? Replay all events       │
│     to populate it. Zero data migration.                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Replay Problem & Snapshots

A wallet with 1 million events cannot afford to replay them all on every balance query. Solution: **snapshots**.

```
Event timeline for wallet w_abc123:

evt_001 ──▶ evt_002 ──▶ ... ──▶ evt_500000 ──▶ evt_500001 ──▶ ... ──▶ evt_500042
                                     │
                                     ▼
                              ┌──────────────┐
                              │  SNAPSHOT     │
                              │  balance:     │
                              │   $8,234.00   │
                              │  version:     │
                              │   evt_500000  │
                              └──────────────┘

Current balance = snapshot.balance
               + SUM(events after evt_500000)
               = $8,234.00 + (events 500001..500042)
               = $8,234.00 + $12.50 - $3.00 + ...
               = $8,243.50

Only 42 events to replay instead of 500,042!
```

**Snapshot strategy**:
- Create a snapshot every N events (e.g., every 10,000) or periodically (e.g., hourly).
- Store snapshots in a separate table indexed by `(wallet_id, snapshot_version)`.
- On balance query: load latest snapshot → replay only events after it.

### Event Ordering Guarantee

Within a single wallet, events **must** be strictly ordered. Across wallets, ordering doesn't matter for correctness.

This maps perfectly to partitioning by `wallet_id` — all events for a wallet go to the same partition, and ordering is guaranteed within a partition (e.g., Kafka partition, database shard).

---

## 6. CQRS (Command Query Responsibility Segregation)

### Architecture

```
                    ┌──────────────────────────┐
                    │      WRITE PATH          │
                    │  (Command Side)          │
                    │                          │
  Transfer ────────▶│  Validate → Append Event │
  Request           │  to Event Store          │
                    │                          │
                    └────────────┬─────────────┘
                                 │
                          Events published
                          (Kafka / CDC)
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │    EVENT PROCESSOR       │
                    │                          │
                    │  Consumes events         │
                    │  Updates read models     │
                    │  (balances, history,     │
                    │   analytics)             │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      READ PATH           │
                    │  (Query Side)            │
                    │                          │
  Balance  ◀────────│  Read from Balance Store │
  Query             │  (Redis / read replica)  │
                    │                          │
                    └──────────────────────────┘
```

### Why CQRS for Digital Wallets?

| Concern | Without CQRS | With CQRS |
|---|---|---|
| Write pattern | UPDATE balance row (contention) | Append event (fast, no contention) |
| Read pattern | Read same row being written (lock contention) | Read from separate optimized store |
| Scaling reads | Scale the same DB as writes (expensive) | Scale read store independently (cheap) |
| Read latency | Competes with writes for DB resources | Dedicated read store, sub-millisecond |
| Multiple views | Complex queries on write-optimized schema | Build purpose-built read models |

### Write Model: Event Store

- Append-only table or log (Kafka, EventStoreDB, or a partitioned PostgreSQL table).
- Schema optimized for sequential writes.
- Partitioned by `wallet_id` for locality and ordering.

### Read Model: Materialized Balance

- Stored in Redis (for speed) or a read-optimized relational table.
- Updated asynchronously by the Event Processor.
- May also include: transaction history (denormalized), spending analytics, daily summaries.

### Eventual Consistency

The read model lags behind the write model by the processing delay (typically milliseconds to low seconds). This means:

```
Timeline:
  T0: Transfer event written to event store
  T1: Event processor picks up event (T0 + 50ms)
  T2: Balance store updated (T0 + 80ms)

  If user queries balance between T0 and T2, they see stale balance.
```

**Mitigation strategies**:
1. **Read-your-writes consistency**: after a transfer, the Transfer Service returns the new balance directly (computed at write time via `balance_after` field). The client uses this value instead of querying the read model.
2. **Synchronous read model update**: for the balance specifically, update the read model in the same transaction as the event write. Sacrifices some CQRS purity for better UX.
3. **Version-aware reads**: client sends the last known event version; the read service waits until it has processed up to that version before responding.

---

## 7. Idempotency & Exactly-Once Processing

### Why Idempotency Is Critical

Networks are unreliable. A client may retry a transfer request because:
- The response was lost (transfer succeeded but client didn't get confirmation).
- A load balancer timed out and retried.
- The user double-tapped the "Send" button.

Without idempotency, retries cause **duplicate transfers** — the user is charged twice.

### Idempotency Key Flow

```
Client                    Transfer Service              Idempotency Store
  │                            │                              │
  │── POST /transfer ─────────▶│                              │
  │   idemp_key: "txn_8f14"   │                              │
  │                            │── LOOKUP idemp_key ─────────▶│
  │                            │◀─ NOT FOUND ────────────────│
  │                            │                              │
  │                            │── process transfer ──────────│
  │                            │                              │
  │                            │── STORE {key, result} ──────▶│
  │                            │                              │
  │◀── 200 OK, transfer_id ───│                              │
  │                            │                              │
  │                            │                              │
  │── RETRY (same idemp_key) ─▶│                              │
  │                            │── LOOKUP idemp_key ─────────▶│
  │                            │◀─ FOUND, return cached ─────│
  │                            │                              │
  │◀── 200 OK (same result) ──│                              │
```

### Implementation Details

```
Idempotency Store (Redis or DB table):

┌──────────────────────────────────────────────────────┐
│ idempotency_key (PK) │ transfer_id │ status │ expiry │
│──────────────────────┼─────────────┼────────┼────────│
│ txn_8f14e45f         │ tr_99a1b2c3 │ 200 OK │ 24h    │
│ txn_a02bc33d         │ tr_55x7y8z  │ 200 OK │ 24h    │
└──────────────────────────────────────────────────────┘
```

Rules:
- Keys expire after 24 hours (transfers older than 24h won't be retried).
- The lookup-and-store must be atomic (use Redis `SETNX` or DB `INSERT ... ON CONFLICT`).
- Store the **full response**, not just "processed" — the client expects the same response on retry.

### Event-Level Deduplication

Beyond request-level idempotency, the Event Processor must also be idempotent:

```
At-Least-Once Delivery     +     Idempotent Processing
(Kafka consumer may           (Event Processor checks
 re-deliver on rebalance)      event_id before updating
                                read model)
                           =
                         Exactly-Once Semantics
```

The Event Processor maintains a **high-water mark** — the `event_id` of the last processed event per wallet. On receiving an event, it checks: "Is this event_id > my high-water mark?" If not, skip it (already processed).

---

## 8. Audit & Compliance

### Regulatory Requirements

Financial systems are subject to strict regulations:

| Regulation | What It Requires |
|---|---|
| **AML** (Anti-Money Laundering) | Monitor for suspicious patterns — large transfers, structuring (many small transfers to avoid thresholds), rapid movement of funds |
| **KYC** (Know Your Customer) | Verify user identity before allowing transfers above certain thresholds |
| **PCI DSS** | If handling card data — encryption, access controls, audit logs |
| **SOX** (Sarbanes-Oxley) | Financial record integrity, internal controls |
| **GDPR / Privacy** | Right to be forgotten — tricky with immutable event logs (use pseudonymization) |

### Event Log as Audit Trail

The event log naturally satisfies audit requirements:

```
Auditor's query: "Show me all transactions for user X in January 2026"

SELECT * FROM events
WHERE wallet_id = 'w_abc123'
  AND created_at BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY event_id;

Result: complete, immutable, tamper-evident record.
```

### Balance Reconciliation

Periodic reconciliation ensures the materialized balance matches the event log:

```
Reconciliation Job (runs daily):

For each wallet:
  event_balance  = SUM(CASE type WHEN 'CREDIT' THEN amount
                                  WHEN 'DEBIT'  THEN -amount END)
                   FROM events WHERE wallet_id = ?

  stored_balance = SELECT balance FROM balance_store
                   WHERE wallet_id = ?

  IF event_balance ≠ stored_balance:
      ALERT("Balance mismatch for wallet %s: events=%s, stored=%s",
            wallet_id, event_balance, stored_balance)
      → Investigate and correct
```

### Suspicious Activity Detection

```
┌─────────────────────────────────────────────────┐
│         AML Monitoring Pipeline                 │
│                                                 │
│  Event Store ──▶ Stream Processor ──▶ Rules     │
│                   (Kafka Streams /     Engine    │
│                    Flink)                        │
│                                                 │
│  Rules:                                         │
│  • Single transfer > $10,000 → flag             │
│  • Sum of transfers in 24h > $50,000 → flag     │
│  • >10 transfers to same wallet in 1h → flag    │
│  • Transfer to/from sanctioned entity → block   │
│                                                 │
│  Output: alerts to compliance team,             │
│          automatic holds on suspicious wallets   │
└─────────────────────────────────────────────────┘
```

---

## 9. Handling Edge Cases

### Insufficient Balance

```
Transfer: wallet A ($50.00) → wallet B, amount $75.00

Transfer Service:
  1. Read current balance of A → $50.00
  2. $50.00 < $75.00 → REJECT
  3. Return 400: {"error": "INSUFFICIENT_BALANCE", "available": "50.00"}

Important: the balance check and debit must be atomic to prevent
race conditions (checked $50, another transfer debits $30 before
this one writes, now balance goes to -$20).
```

**Solution**: use optimistic locking or conditional writes:

```sql
-- Optimistic locking with version
UPDATE wallet_balances
SET balance = balance - 75.00, version = version + 1
WHERE wallet_id = 'w_abc123'
  AND balance >= 75.00
  AND version = 42;

-- If rows_affected = 0 → either insufficient balance or version conflict → retry
```

### Concurrent Transfers from Same Wallet

This is the **hot wallet problem** — e.g., a merchant wallet receiving hundreds of payments per second, or a popular user sending multiple transfers simultaneously.

```
Timeline (concurrent transfers from wallet A with $100):

  T1: Transfer 1 reads balance = $100, attempts debit $60
  T2: Transfer 2 reads balance = $100, attempts debit $60

  Without protection: both succeed → balance = -$20! WRONG!
```

**Solutions**:

1. **Optimistic concurrency control (OCC)**:
   - Read balance + version → attempt write with version check → retry on conflict.
   - Works well when contention is low to moderate.

2. **Partition by wallet_id, single writer per partition**:
   - All operations for a wallet are routed to the same partition (thread/actor).
   - Serialized within the partition — no concurrent writes to the same wallet.
   - High throughput: with 10,000 partitions and ~1K ops/sec each = 10M ops/sec.

3. **Database-level serialization**:
   - `SELECT ... FOR UPDATE` acquires an exclusive lock on the wallet row.
   - Simple but limits concurrency on hot wallets.

```
Recommended: Partition by wallet_id

                    ┌─────────────────────────────┐
                    │     Consistent Hashing       │
                    │     hash(wallet_id) % N      │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │Partition 0│    │Partition 1│    │Partition 2│
        │           │    │           │    │           │
        │ wallet A  │    │ wallet B  │    │ wallet C  │
        │ wallet D  │    │ wallet E  │    │ wallet F  │
        │           │    │           │    │           │
        │ single    │    │ single    │    │ single    │
        │ writer    │    │ writer    │    │ writer    │
        └──────────┘    └──────────┘    └──────────┘
```

### Negative Balances

A negative balance should **never** occur in a properly designed system. If detected:

- Immediately alert the on-call team.
- Freeze the wallet to prevent further damage.
- Investigate: race condition bug? compensating transaction error? event replay issue?
- Reconcile against the event log to determine correct balance.

### Currency Conversion

```
Transfer: wallet A (USD) → wallet B (EUR), amount $100

                    ┌───────────────────┐
                    │ Exchange Rate Svc  │
                    │   USD/EUR = 0.92   │
                    └────────┬──────────┘
                             │
                             ▼
  Debit A:  $100.00 USD
  Credit B: €92.00 EUR

  Events:
    {wallet: A, type: DEBIT,  amount: 100.00, currency: USD, fx_rate: 0.92}
    {wallet: B, type: CREDIT, amount:  92.00, currency: EUR, fx_rate: 0.92}
```

Key considerations:
- Lock the exchange rate at the start of the transfer (don't let it change mid-transfer).
- Store the exchange rate in the event for auditability.
- Handle rounding carefully — always round in favor of the platform (or use banker's rounding).

### Transfer to Non-Existent Wallet

- Validate wallet existence **before** starting the transfer.
- Return `404: {"error": "WALLET_NOT_FOUND"}`.
- Do not create wallets implicitly during transfers.

### System Clock Skew

- Use **logical clocks** (event sequence numbers) for ordering, not wall-clock timestamps.
- Timestamps are informational for human readability but should not determine event order.
- NTP synchronization across servers keeps wall clocks within milliseconds, but don't rely on it for correctness.

---

## 10. Scaling Strategies

### Partitioning / Sharding

```
Shard by wallet_id:

  hash(wallet_id) % num_shards → shard assignment

  Shard 0: wallets {A, D, G, ...}
  Shard 1: wallets {B, E, H, ...}
  Shard 2: wallets {C, F, I, ...}
  ...
  Shard N-1: wallets {...}

Benefits:
  - Events for a wallet are co-located → local transactions
  - Ordering guaranteed within a shard
  - Horizontal scaling: add more shards for more throughput
  - Each shard handles ~1K–5K TPS
  - 1000 shards × 1K TPS = 1M TPS ✓
```

### Read Scaling

```
                    Event Store
                    (write path)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Redis   │ │ Redis   │ │ Redis   │
         │Cluster 1│ │Cluster 2│ │Cluster 3│
         │(region1)│ │(region2)│ │(region3)│
         └─────────┘ └─────────┘ └─────────┘
              ▲          ▲          ▲
              │          │          │
         Balance     Balance     Balance
         queries     queries     queries
```

- **Redis clusters** for balance reads — sub-millisecond latency.
- **Read replicas** of the event store for transaction history queries.
- **CDN** is not applicable here (personalized, real-time data).

### Event Store Choices

| Option | Pros | Cons |
|---|---|---|
| **Kafka** | High throughput, built-in partitioning, replayable | Not a database — limited querying, retention policies needed |
| **EventStoreDB** | Purpose-built for event sourcing, projections | Smaller community, operational complexity |
| **PostgreSQL (partitioned)** | Familiar, strong tooling, ACID for local txns | Manual partitioning, less throughput than Kafka |
| **CockroachDB / TiDB** | Distributed SQL, auto-sharding | Overhead of distributed consensus per write |

**Recommended**: Kafka for the event pipeline (durability, replayability, pub/sub) with PostgreSQL for the queryable event archive (regulatory queries, audits).

### Geographic Distribution

For a global wallet system:

```
┌─────────────────────────────────────────────────────────┐
│                    Global Architecture                  │
│                                                         │
│   US Region              EU Region              APAC    │
│  ┌──────────┐          ┌──────────┐          ┌────────┐ │
│  │ Transfer │          │ Transfer │          │Transfer│ │
│  │ Service  │          │ Service  │          │Service │ │
│  │          │          │          │          │        │ │
│  │ Shard    │          │ Shard    │          │ Shard  │ │
│  │ 0-333   │          │ 334-666  │          │667-999 │ │
│  └──────────┘          └──────────┘          └────────┘ │
│                                                         │
│  Cross-region transfers: async via Kafka replication    │
│  Same-region transfers: low-latency local processing   │
└─────────────────────────────────────────────────────────┘
```

- Assign wallets to regions (e.g., by user's home country).
- Same-region transfers are fast (local shards).
- Cross-region transfers use async coordination (Saga/TCC across regions).

---

## 11. Data Model

### Events Table (Source of Truth)

```sql
CREATE TABLE events (
    event_id        BIGINT       PRIMARY KEY,  -- monotonic within partition
    wallet_id       VARCHAR(64)  NOT NULL,
    transfer_id     VARCHAR(64)  NOT NULL,
    type            VARCHAR(10)  NOT NULL,      -- 'CREDIT' or 'DEBIT'
    amount          DECIMAL(18,2) NOT NULL,
    currency        VARCHAR(3)   NOT NULL,
    balance_after   DECIMAL(18,2) NOT NULL,     -- denormalized for fast reads
    idempotency_key VARCHAR(64)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL,
    metadata        JSONB,

    UNIQUE (wallet_id, idempotency_key)         -- deduplication constraint
) PARTITION BY HASH (wallet_id);
```

### Snapshots Table

```sql
CREATE TABLE snapshots (
    wallet_id       VARCHAR(64)   NOT NULL,
    balance         DECIMAL(18,2) NOT NULL,
    currency        VARCHAR(3)    NOT NULL,
    last_event_id   BIGINT        NOT NULL,
    snapshot_version BIGINT       NOT NULL,
    created_at      TIMESTAMP     NOT NULL,

    PRIMARY KEY (wallet_id, snapshot_version)
);
```

### Transfers Table

```sql
CREATE TABLE transfers (
    transfer_id     VARCHAR(64)   PRIMARY KEY,
    from_wallet_id  VARCHAR(64)   NOT NULL,
    to_wallet_id    VARCHAR(64)   NOT NULL,
    amount          DECIMAL(18,2) NOT NULL,
    currency        VARCHAR(3)    NOT NULL,
    status          VARCHAR(20)   NOT NULL,     -- PENDING, COMPLETED, FAILED, REVERSED
    idempotency_key VARCHAR(64)   UNIQUE NOT NULL,
    created_at      TIMESTAMP     NOT NULL,
    completed_at    TIMESTAMP,
    failure_reason  TEXT
);
```

### Wallets Table

```sql
CREATE TABLE wallets (
    wallet_id       VARCHAR(64)   PRIMARY KEY,
    user_id         VARCHAR(64)   NOT NULL,
    currency        VARCHAR(3)    NOT NULL DEFAULT 'USD',
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, FROZEN, CLOSED
    daily_limit     DECIMAL(18,2) DEFAULT 10000.00,
    created_at      TIMESTAMP     NOT NULL,

    UNIQUE (user_id, currency)  -- one wallet per currency per user
);
```

### Balance Store (Read Model)

```sql
-- In Redis:
-- Key: balance:{wallet_id}
-- Value: {"balance": "1042.50", "currency": "USD", "last_event_id": 500042}

-- Or in PostgreSQL (read replica):
CREATE TABLE wallet_balances (
    wallet_id       VARCHAR(64)   PRIMARY KEY,
    balance         DECIMAL(18,2) NOT NULL,
    currency        VARCHAR(3)    NOT NULL,
    last_event_id   BIGINT        NOT NULL,
    version         BIGINT        NOT NULL DEFAULT 0,  -- for optimistic locking
    updated_at      TIMESTAMP     NOT NULL
);
```

### Entity Relationships

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  Wallet  │──1:N──│   Event      │──N:1──│ Transfer │
│          │       │              │       │          │
│wallet_id │       │event_id      │       │transfer_id│
│user_id   │       │wallet_id (FK)│       │from_wallet│
│currency  │       │transfer_id   │       │to_wallet  │
│status    │       │type          │       │amount     │
└──────────┘       │amount        │       │status     │
     │             │balance_after │       └──────────┘
     │1:N          └──────────────┘
     │
┌──────────┐
│ Snapshot │
│          │
│wallet_id │
│balance   │
│last_evt  │
└──────────┘
```

---

## 12. Comparison: Traditional vs Event Sourcing

| Aspect | Traditional (Update Balance Row) | Event Sourcing |
|---|---|---|
| **Data model** | Mutable `balance` column | Immutable event log |
| **Write pattern** | `UPDATE ... SET balance = balance ± amount` | `INSERT INTO events ...` |
| **Audit trail** | Must build separately (triggers, audit tables) | Built-in — the event log IS the trail |
| **Debugging** | "Balance is wrong" → hard to trace what happened | Replay events to any point in time |
| **Dispute resolution** | Need extensive logging | Every detail captured in events |
| **Performance (writes)** | Row-level contention on hot wallets | Append-only, sequential I/O, no contention |
| **Performance (reads)** | Direct row lookup — instant | Needs materialized view (CQRS) or snapshots |
| **Complexity** | Lower — simpler mental model | Higher — event processors, snapshots, CQRS |
| **Consistency** | Immediate (single-row update) | Eventual (with CQRS read model) |
| **Schema evolution** | ALTER TABLE, data migration | Add new event types, replay to build new views |
| **Storage** | Only current state (~100 bytes/wallet) | All events ever (~200 bytes × N events/wallet) |
| **Regulatory compliance** | Requires additional logging infrastructure | Native compliance via immutable log |
| **Rebuild capability** | Cannot rebuild past states | Replay from any point; build new projections |

**Bottom line**: event sourcing has higher upfront complexity but provides correctness, auditability, and debugging capabilities that are non-negotiable in financial systems. This is why most modern payment platforms (Stripe, Square, modern banks) use event sourcing internally.

---

## 13. Trade-offs & Interview Tips

### Decision Matrix: 2PC vs Saga vs TCC

```
Ask yourself:                          Choose:
─────────────────────────────────────────────────
"Do I need strong consistency         → 2PC
 and can tolerate low throughput?"

"Do I need high throughput and        → Saga
 can tolerate eventual consistency?"

"Do I need high throughput WITH       → TCC
 good isolation (no dirty reads)?"
```

### Event Sourcing vs CRUD Decision

```
Choose Event Sourcing when:            Choose CRUD when:
───────────────────────────────        ──────────────────────────
✓ Audit trail is mandatory             ✓ Simplicity is priority
✓ Financial/regulated domain           ✓ No regulatory requirement
✓ Need to reconstruct past states      ✓ Current state is sufficient
✓ High write throughput needed         ✓ Strong consistency needed
✓ Multiple read models (CQRS)          ✓ Small scale, low complexity
✓ Team has event sourcing experience   ✓ Team is unfamiliar with ES
```

### Handling Out-of-Order Events

If events arrive out of order (e.g., due to network delays or partition rebalancing):

1. **Sequence numbers**: each event has a monotonically increasing sequence within a wallet. The consumer processes events in sequence order, buffering out-of-order events until gaps are filled.
2. **Idempotent + commutative operations**: design operations so order doesn't matter (e.g., "add $10" then "subtract $5" gives the same balance regardless of order). However, balance-after fields depend on order.
3. **Reprocessing**: if ordering is lost, replay from the last known good snapshot. The event store (Kafka) preserves order within a partition.

**Interview answer**: "We partition by wallet_id so all events for a wallet go to the same Kafka partition. Kafka guarantees ordering within a partition, so out-of-order delivery within a wallet shouldn't occur. Across wallets, ordering doesn't matter for correctness."

### Common Follow-Up Questions & Answers

**Q: "What happens if the event store goes down?"**
A: Kafka is replicated across brokers (replication factor 3). If one broker fails, others serve the partition. If the entire cluster is down, the write path is unavailable — transfers queue up in the Transfer Service with retry. The read path (balance queries) still works from the materialized read model.

**Q: "How do you handle a wallet that receives thousands of payments per second?"**
A: This is the hot-partition problem. Options: (1) sub-partition the wallet into virtual sub-wallets (e.g., 10 sub-wallets), each handles a portion of credits, periodically consolidate; (2) buffer incoming credits in a staging area, batch-apply them.

**Q: "How do you prevent double-spending?"**
A: Combination of (1) idempotency keys at the API layer, (2) optimistic locking on the balance check, (3) single-writer-per-wallet via partitioning. These three layers make double-spending effectively impossible.

**Q: "What about chargebacks?"**
A: A chargeback is a new event (CHARGEBACK_DEBIT) appended to the event log. It doesn't mutate past events — it creates a new compensating event. The balance is updated accordingly. This preserves the full audit trail.

**Q: "How would you migrate from a traditional system to event sourcing?"**
A: Dual-write period: (1) write to both old system and new event store, (2) validate they produce identical results, (3) gradually shift reads to the event-sourced read model, (4) once confident, cut over writes entirely.

### Quick Reference Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────────┐
│                  DIGITAL WALLET — CHEAT SHEET                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Architecture:  Event Sourcing + CQRS                              │
│  Write model:   Append-only event log (Kafka + PostgreSQL)         │
│  Read model:    Materialized balances (Redis)                      │
│  Partitioning:  By wallet_id (co-locate all events for a wallet)   │
│  Dist. txn:     TCC (Try-Confirm/Cancel) across shards             │
│  Idempotency:   Client-generated key → deduplicated at API layer   │
│  Snapshots:     Every 10K events per wallet                        │
│  Audit:         Event log IS the audit trail                       │
│  Reconciliation: Daily job — event sum vs materialized balance     │
│  Throughput:    Shard × TPS/shard (1000 × 1K = 1M TPS)            │
│                                                                     │
│  Key trade-off: complexity of event sourcing vs correctness needs  │
│  Key insight:   financial systems demand auditability — ES wins    │
│  Key risk:      hot wallets — mitigate via sub-partitioning        │
│                                                                     │
│  Three pillars of correctness:                                     │
│    1. Idempotency (no duplicate transfers)                         │
│    2. Atomicity (debit + credit succeed or both fail)              │
│    3. Ordering (events processed in sequence per wallet)           │
│                                                                     │
│  Interview flow:                                                    │
│    Requirements → API → High-level design → Event sourcing →       │
│    Distributed txns (2PC vs Saga vs TCC) → CQRS → Scaling →       │
│    Edge cases → Audit/compliance                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 14. Complete System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DIGITAL WALLET SYSTEM                            │
│                                                                          │
│  ┌─────────┐     ┌─────────────┐     ┌──────────────────┐              │
│  │ Client  │────▶│ API Gateway │────▶│ Transfer Service  │              │
│  │         │     │ • Auth      │     │ • Orchestration   │              │
│  │         │     │ • Rate limit│     │ • TCC Coordinator │              │
│  │         │     │ • TLS       │     │ • Idempotency     │              │
│  └─────────┘     └─────────────┘     └───────┬──────────┘              │
│                                               │                          │
│                    ┌──────────────────────────┼─────────────┐            │
│                    │                          │             │            │
│                    ▼                          ▼             ▼            │
│           ┌──────────────┐          ┌──────────────┐  ┌──────────┐     │
│           │Wallet Service│          │Ledger Service│  │Idempotency│     │
│           │• Balance chk │          │• Event append│  │  Store    │     │
│           │• Limits      │          │• Ordering    │  │  (Redis)  │     │
│           │• Freeze/hold │          │              │  └──────────┘     │
│           └──────┬───────┘          └──────┬───────┘                    │
│                  │                         │                            │
│                  ▼                         ▼                            │
│           ┌──────────────┐          ┌──────────────┐                    │
│           │ Balance DB   │          │  Event Store │                    │
│           │   (Redis)    │◀─ async ─│   (Kafka +   │                    │
│           │              │  update  │  PostgreSQL) │                    │
│           └──────────────┘          └──────┬───────┘                    │
│                  ▲                         │                            │
│                  │                         ▼                            │
│           Balance queries          ┌──────────────┐                    │
│                                    │Event Processor│                    │
│                                    │• Update balance│                   │
│                                    │• AML checks   │                    │
│                                    │• Snapshots    │                    │
│                                    └──────────────┘                    │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐      │
│  │                    Supporting Services                        │      │
│  │  • Exchange Rate Service   • Notification Service             │      │
│  │  • KYC/AML Service         • Reconciliation Jobs              │      │
│  │  • Dispute Resolution      • Monitoring & Alerting            │      │
│  └───────────────────────────────────────────────────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Study tip: when practicing this design, start with the transfer flow and work outward. The interviewer wants to see you reason about correctness first, then scalability. Always lead with "money cannot be lost" as your guiding constraint.*
