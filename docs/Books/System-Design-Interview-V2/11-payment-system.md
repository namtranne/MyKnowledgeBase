# Chapter 11: Payment System

## 1. Problem Statement & Requirements

### What Are We Designing?

A **payment system** — the backend infrastructure that processes financial transactions for an e-commerce platform. Think of the engine behind Stripe, the payment flow inside Amazon, or the settlement layer of a marketplace like Shopify.

This is one of the most important system design questions because **money is at stake**. Unlike a social feed where a lost post is annoying, a lost payment or a double charge has real financial and legal consequences. The core challenge is not throughput — it's **correctness, reliability, and auditability**.

Payment systems touch on idempotency, distributed transactions, reconciliation, compliance, and state machine design — concepts that interviewers love because they separate engineers who build "works-most-of-the-time" systems from those who build "never-loses-money" systems.

### Functional Requirements

1. **Pay-in (checkout)** — buyer pays a merchant for goods/services
2. **Pay-out (settlement)** — system disburses collected funds to the merchant's bank account
3. **Multiple payment methods** — credit card, debit card, digital wallets (Apple Pay, Google Pay), bank transfers
4. **Payment status tracking** — buyer and merchant can query the state of a payment
5. **Refunds** — merchant or system can reverse a completed payment
6. **Ledger** — record every financial movement with double-entry bookkeeping
7. **Wallet** — track internal balances for merchants and platform

### Non-Functional Requirements

| Requirement | Target | Why |
|---|---|---|
| Reliability | **Never lose money, never charge twice** | Financial and legal obligation |
| Consistency | Strong (ACID) for payment operations | Double-charging or lost payments are unacceptable |
| Fault tolerance | Survive network partitions, PSP outages | Payments must eventually complete or cleanly fail |
| Idempotency | Every operation is safe to retry | Networks are unreliable; retries are inevitable |
| Compliance | PCI-DSS Level 1 | Legal mandate for handling card data |
| Auditability | Complete, immutable record of all transactions | Regulatory and dispute resolution |
| Latency | < 2s for payment initiation, < 5s end-to-end | User experience at checkout |
| Availability | 99.99% for payment service | Revenue directly tied to uptime |

### Scale Estimation (Back-of-Envelope)

```
Daily transactions:      1,000,000
Avg TPS:                 1M / 86,400 ≈ 12 TPS
Peak TPS:                ~100 TPS (during flash sales)
Avg transaction size:    $50
Daily volume:            $50M
Yearly volume:           ~$18B

Data sizes:
  Payment records:       1M/day × 1 KB ≈ 1 GB/day, 365 GB/year
  Ledger entries:        2M/day (double-entry) × 200 B ≈ 400 MB/day
  Events/audit logs:     5M/day × 500 B ≈ 2.5 GB/day
```

**Key insight**: 100 TPS peak is trivially handled by a single database. The challenge is NOT scale — it's **correctness**. A social media platform at 100K TPS can tolerate occasional data loss. A payment system at 100 TPS cannot tolerate a single incorrect transaction. **Correctness >>> Throughput.**

---

## 2. High-Level Design

### System Architecture

```
┌─────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────┐    ┌──────────┐
│  Buyer   │───▶│  E-commerce  │───▶│ Payment Service │───▶│   PSP   │───▶│   Card   │
│ (Client) │    │   Service    │    │  (Our System)   │    │(Stripe) │    │ Network  │
└─────────┘    └──────────────┘    └────────┬────────┘    └────┬────┘    │(Visa/MC) │
                                            │                  │         └────┬─────┘
                                   ┌────────▼────────┐         │              │
                                   │ Payment Executor│◀────────┘              │
                                   └────────┬────────┘    (webhook)      ┌────▼─────┐
                                            │                            │  Issuing │
                                   ┌────────▼────────┐                   │   Bank   │
                                   │     Ledger      │                   └──────────┘
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │     Wallet      │
                                   └─────────────────┘
```

### Component Breakdown

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PAYMENT SYSTEM                               │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Payment Service │  │Payment Executor│  │   PSP Adapter Layer    │  │
│  │                │  │                │  │                        │  │
│  │ • Orchestration│  │ • Calls PSP    │  │ • Stripe adapter       │  │
│  │ • Idempotency  │  │ • Retries      │  │ • Adyen adapter        │  │
│  │ • State machine│  │ • Timeout mgmt │  │ • PayPal adapter       │  │
│  │ • Validation   │  │ • Circuit break│  │ • Unified interface    │  │
│  └───────┬────────┘  └───────┬────────┘  └────────────────────────┘  │
│          │                   │                                        │
│  ┌───────▼────────┐  ┌──────▼─────────┐  ┌────────────────────────┐  │
│  │    Ledger      │  │    Wallet      │  │  Reconciliation Svc    │  │
│  │                │  │                │  │                        │  │
│  │ • Double-entry │  │ • Balances     │  │ • Daily batch          │  │
│  │ • Append-only  │  │ • Settlements  │  │ • Mismatch detection   │  │
│  │ • Audit trail  │  │ • Pay-outs     │  │ • Alerting             │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Key Properties |
|---|---|---|
| **Payment Service** | Receives payment requests, validates, orchestrates flow | Idempotent, stateful (state machine) |
| **Payment Executor** | Communicates with external PSPs | Retries, circuit breaker, timeout handling |
| **PSP (External)** | Processes card transactions, tokenization, fraud detection | Stripe, Adyen, Braintree, etc. |
| **Ledger** | Records all financial movements (double-entry bookkeeping) | Append-only, immutable, auditable |
| **Wallet** | Tracks internal balances for merchants and platform | Derived from ledger, eventual consistency OK |
| **Reconciliation** | Verifies our records match PSP/bank settlement files | Daily batch, catches discrepancies |

### API Design

#### Initiate a Payment

```
POST /v1/payments
Content-Type: application/json
Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890

{
  "order_id": "order_abc123",
  "buyer_id": "user_456",
  "merchant_id": "merchant_789",
  "amount": 5000,           // in cents ($50.00)
  "currency": "USD",
  "payment_method": {
    "type": "card",
    "token": "tok_visa_4242"  // PSP-issued token, NOT raw card number
  },
  "metadata": {
    "order_description": "2x Widget Pro"
  }
}
```

**Response:**

```json
{
  "payment_id": "pay_xyz789",
  "status": "PENDING",
  "amount": 5000,
  "currency": "USD",
  "created_at": "2026-02-25T10:30:00Z",
  "redirect_url": "https://psp.com/3dsecure/abc"   // if 3D Secure needed
}
```

#### Query Payment Status

```
GET /v1/payments/pay_xyz789

Response:
{
  "payment_id": "pay_xyz789",
  "status": "SUCCESS",
  "amount": 5000,
  "currency": "USD",
  "psp_reference": "ch_stripe_123",
  "created_at": "2026-02-25T10:30:00Z",
  "updated_at": "2026-02-25T10:30:05Z"
}
```

#### Initiate Refund

```
POST /v1/payments/pay_xyz789/refund
Idempotency-Key: refund-a1b2c3d4

{
  "amount": 5000,        // full or partial refund
  "reason": "customer_request"
}
```

---

## 3. Payment Service Provider (PSP) Integration

### What Does a PSP Do?

A **Payment Service Provider** (Stripe, Adyen, Square, Braintree) is the layer between your system and the banking infrastructure. They handle:

```
┌────────────────────────────────────────────────────────────────┐
│                    PSP RESPONSIBILITIES                        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Tokenization │  │    Fraud     │  │  Card Processing     │  │
│  │              │  │  Detection   │  │                      │  │
│  │ Card number  │  │              │  │ Auth → Capture →     │  │
│  │ → Token      │  │ ML models,  │  │ Settlement           │  │
│  │ (never store │  │ velocity    │  │                      │  │
│  │  raw PAN)    │  │ checks      │  │ Talks to Visa/MC     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PCI-DSS     │  │   3D Secure  │  │  Multi-Currency      │  │
│  │  Compliance  │  │  (SCA)       │  │  Support             │  │
│  │              │  │              │  │                      │  │
│  │ Secure vault │  │ Extra auth   │  │ FX conversion,       │  │
│  │ for card data│  │ step for EU  │  │ local payment methods│  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Hosted Payment Page vs API Integration

| Approach | How It Works | Pros | Cons |
|---|---|---|---|
| **Hosted page** | PSP provides a checkout page; buyer is redirected | Minimal PCI scope, PSP handles UI | Less control over UX |
| **API integration** | We collect card details, send to PSP via API | Full UX control | Higher PCI scope, more complexity |
| **Hybrid (Elements)** | PSP provides embeddable UI components (Stripe Elements) | Best of both: UX control + low PCI scope | Tied to specific PSP |

**Interview tip**: Most companies use the hybrid approach. Stripe Elements or Adyen Drop-in components let you embed PSP-hosted input fields in your checkout page. Card data goes directly from the browser to the PSP — it never touches your server, keeping you at the lowest PCI-DSS compliance level (SAQ-A).

### PSP Callback (Webhook)

Payment processing is inherently **asynchronous**. Even if the PSP responds synchronously to your API call, the final settlement happens later. PSPs use **webhooks** to notify you of events:

```
┌──────────┐         ┌──────────────────┐         ┌──────────┐
│   Our    │──(1)───▶│      PSP         │──(2)───▶│  Card    │
│  Server  │         │   (Stripe)       │         │ Network  │
│          │◀──(3)───│                  │◀──(4)───│          │
│          │         │                  │         │          │
│          │◀──(5)───│  Webhook POST    │         │          │
│          │         │  to our endpoint │         │          │
└──────────┘         └──────────────────┘         └──────────┘

(1) POST /v1/charges {amount, token, idempotency_key}
(2) PSP forwards to card network
(3) Synchronous response: {status: "pending"} or {status: "succeeded"}
(4) Card network confirms with PSP
(5) Webhook: POST /webhooks/stripe {event: "charge.succeeded", charge_id: "..."}
```

**Webhook reliability**: Webhooks can fail (our server is down, network issue). PSPs retry webhooks with exponential backoff (typically for 24-72 hours). We must also implement a **polling fallback** — periodically query the PSP for payment status in case we miss a webhook.

### Tokenization Flow

```
┌────────┐    ┌──────────────────┐    ┌──────────┐
│Browser │───▶│  PSP (Stripe.js) │───▶│ PSP Vault│
│        │    │                  │    │          │
│ Card:  │    │  Securely sends  │    │ Stores   │
│ 4242.. │    │  card data       │    │ card     │
│        │◀──│  Returns token   │◀──│          │
│        │    │  tok_visa_4242   │    │          │
└───┬────┘    └──────────────────┘    └──────────┘
    │
    │ (sends token, NOT card number)
    │
┌───▼────┐
│  Our   │   We only ever see the token.
│ Server │   Raw card data never touches our infrastructure.
└────────┘
```

---

## 4. Payment Flow — Detailed Step-by-Step

### Complete Pay-in Flow

```
 Buyer          E-commerce       Payment         Payment        PSP           Card
(Browser)       Service          Service         Executor     (Stripe)       Network
   │                │                │               │            │             │
   │  1. Place Order│                │               │            │             │
   │───────────────▶│                │               │            │             │
   │                │ 2. Create      │               │            │             │
   │                │    payment req │               │            │             │
   │                │───────────────▶│               │            │             │
   │                │                │ 3. Validate   │            │             │
   │                │                │    + Check    │            │             │
   │                │                │    idempotency│            │             │
   │                │                │    + Save     │            │             │
   │                │                │    PENDING    │            │             │
   │                │                │               │            │             │
   │                │                │ 4. Execute    │            │             │
   │                │                │──────────────▶│            │             │
   │                │                │               │ 5. Call PSP│             │
   │                │                │               │───────────▶│             │
   │                │                │               │            │ 6. Auth     │
   │                │                │               │            │────────────▶│
   │                │                │               │            │             │
   │                │                │               │            │ 7. Response │
   │                │                │               │            │◀────────────│
   │                │                │               │ 8. PSP resp│             │
   │                │                │               │◀───────────│             │
   │                │                │ 9. Update     │            │             │
   │                │                │◀──────────────│            │             │
   │                │                │    status     │            │             │
   │                │                │                            │             │
   │                │                │ 10. Update ledger          │             │
   │                │                │     Update wallet          │             │
   │                │                │                            │             │
   │                │ 11. Payment    │               │            │             │
   │                │     result     │               │            │             │
   │                │◀───────────────│               │            │             │
   │ 12. Order      │                │               │            │             │
   │     confirmed  │                │               │            │             │
   │◀───────────────│                │               │            │             │
   │                │                │               │            │             │
   │                │                │ 13. Webhook   │            │             │
   │                │                │◀──────────────────────────▶│             │
   │                │                │  (async confirmation)      │             │
```

### Step-by-Step Explanation

| Step | Action | Details |
|---|---|---|
| 1 | Buyer clicks "Place Order" | Browser sends order + payment token to e-commerce service |
| 2 | E-commerce creates payment request | Generates idempotency key, sends to payment service |
| 3 | Payment service validates & persists | Checks idempotency key, validates amount/currency, saves record with status `PENDING` |
| 4 | Delegates to payment executor | Executor handles the external PSP communication |
| 5 | Executor calls PSP API | Sends amount, currency, token, and **idempotency key** to PSP |
| 6-7 | Card network authorization | PSP → Card Network → Issuing Bank → approve/decline |
| 8 | PSP returns result | Synchronous: `succeeded`, `failed`, or `requires_action` (3D Secure) |
| 9 | Executor returns result | Payment service updates status to `SUCCESS` or `FAILED` |
| 10 | Ledger & wallet updated | Double-entry ledger records the transaction; wallet balance updated |
| 11-12 | Result propagated to buyer | E-commerce service shows confirmation or error page |
| 13 | Webhook (async) | PSP sends async confirmation; we reconcile with our records |

### 3D Secure (SCA) — Additional Authentication

In regions requiring Strong Customer Authentication (EU PSD2), the flow includes a redirect:

```
Normal flow:    Client → Server → PSP → ✅ Done
3DS flow:       Client → Server → PSP → ⚠️ requires_action
                Client → PSP 3DS page (enter OTP) → PSP → ✅ Done
                PSP → Webhook → Server updates status
```

---

## 5. Double Payment Prevention — The Critical Problem

This is **the** most important topic in payment system design. Getting this wrong means charging a customer twice — which causes chargebacks, customer churn, and potential legal issues.

### Why Double Payments Happen

```
Client ──(1)──▶ Payment Service ──(2)──▶ PSP
                                          │
              ╳ Network timeout ◀────────(3)── PSP processes successfully
                                                but response is lost
Client ──(4)──▶ Payment Service ──(5)──▶ PSP    ← DANGER: second charge!
  (retry)
```

Scenarios that cause duplicate charges:
1. **Network timeout** — PSP processed payment, but response was lost
2. **Client retry** — user clicks "Pay" twice, or browser retries
3. **Server retry** — our service retries after a crash/restart
4. **Load balancer retry** — infrastructure-level retry on 502/503

### The Solution: Idempotency Key

An **idempotency key** is a client-generated unique identifier (UUID) sent with every payment request. The server guarantees: **same key → same result, processed exactly once.**

```
┌──────────────────────────────────────────────────────────┐
│                  IDEMPOTENCY FLOW                        │
│                                                          │
│  Request 1:  key=abc-123, amount=$50                     │
│  ┌──────────────────────────────────────────┐            │
│  │ 1. Check DB: does key "abc-123" exist?   │            │
│  │    → NO                                  │            │
│  │ 2. Process payment                       │            │
│  │ 3. Store result with key "abc-123"       │            │
│  │ 4. Return: {status: "success"}           │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  Request 2 (retry):  key=abc-123, amount=$50             │
│  ┌──────────────────────────────────────────┐            │
│  │ 1. Check DB: does key "abc-123" exist?   │            │
│  │    → YES                                 │            │
│  │ 2. Return STORED result (no reprocessing)│            │
│  │    → {status: "success"}                 │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  Result: Customer charged EXACTLY ONCE ✓                 │
└──────────────────────────────────────────────────────────┘
```

### Database Schema for Idempotency

```sql
CREATE TABLE payments (
    payment_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key     VARCHAR(255) NOT NULL,
    buyer_id            VARCHAR(255) NOT NULL,
    merchant_id         VARCHAR(255) NOT NULL,
    amount              BIGINT NOT NULL,          -- cents
    currency            VARCHAR(3) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    psp_reference       VARCHAR(255),
    psp_response        JSONB,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_idempotency UNIQUE (idempotency_key)
);
```

The `UNIQUE` constraint on `idempotency_key` is the safety net. If two concurrent requests arrive with the same key, one will succeed and the other will get a constraint violation — which we catch and return the existing result.

### Implementation Pseudocode

```python
def process_payment(request):
    idempotency_key = request.headers["Idempotency-Key"]

    # Step 1: Check for existing payment with this key
    existing = db.query(
        "SELECT * FROM payments WHERE idempotency_key = %s",
        idempotency_key
    )

    if existing:
        # Already processed — return the stored result
        return existing.to_response()

    # Step 2: Create payment record (PENDING)
    try:
        payment = db.insert(
            "INSERT INTO payments (idempotency_key, buyer_id, merchant_id, "
            "amount, currency, status) VALUES (%s, %s, %s, %s, %s, 'PENDING')",
            idempotency_key, request.buyer_id, request.merchant_id,
            request.amount, request.currency
        )
    except UniqueConstraintViolation:
        # Race condition: another request with same key was just inserted
        existing = db.query(
            "SELECT * FROM payments WHERE idempotency_key = %s",
            idempotency_key
        )
        return existing.to_response()

    # Step 3: Call PSP (with the SAME idempotency key!)
    psp_result = psp_client.charge(
        amount=request.amount,
        currency=request.currency,
        token=request.payment_token,
        idempotency_key=idempotency_key       # critical!
    )

    # Step 4: Update payment status
    db.update(
        "UPDATE payments SET status = %s, psp_reference = %s, "
        "psp_response = %s WHERE payment_id = %s",
        psp_result.status, psp_result.reference,
        psp_result.raw_response, payment.payment_id
    )

    return payment.to_response()
```

### Idempotency at Every Layer

```
Client ─── Idempotency Key ───▶ Payment Service ─── Same Key ───▶ PSP
  │                                    │                            │
  │  Client generates UUID             │  Stores in DB with         │  PSP also uses this
  │  before first attempt              │  UNIQUE constraint         │  key to deduplicate
  │                                    │                            │
  └── Retries send SAME key ──────────▶└── Returns cached result ──▶└── Returns cached result
```

### Network Timeout — The Trickiest Case

```
What happens when PSP call times out?

WRONG approach:
  1. Call PSP → timeout
  2. Create NEW payment with NEW idempotency key    ← DOUBLE CHARGE!
  3. Call PSP again

CORRECT approach:
  1. Call PSP → timeout
  2. Retry with SAME idempotency key                ← PSP deduplicates
  3. If PSP already processed it, returns same result
  4. If PSP didn't process it, processes now
```

**Rule**: On timeout, NEVER generate a new idempotency key. Always retry with the same key. This is why the idempotency key is generated at the very start of the flow and persisted immediately.

---

## 6. Reconciliation — Deep Dive

### What Is Reconciliation?

Reconciliation is the process of **comparing our internal records with external records** (PSP settlement files, bank statements) to ensure every transaction is accounted for. It's the financial safety net that catches anything the real-time system missed.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Our Ledger     │     │  PSP Settlement  │     │  Bank Statement  │
│                  │     │     File         │     │                  │
│  pay_001  $50 ✓  │     │  pay_001  $50 ✓  │     │  $4,950 deposit  │
│  pay_002  $30 ✓  │     │  pay_002  $30 ✓  │     │                  │
│  pay_003  $20 ✓  │     │  pay_003  $20 ✓  │     │  (matches total  │
│  pay_004  $75 ✓  │     │  pay_004  $75 ✓  │     │   minus fees)    │
│  pay_005  $25 ?  │     │  (missing!)      │     │                  │
│  (missing!)      │     │  pay_006  $40 ?  │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └──────────────────┘
         │                        │
         └───────────┬────────────┘
                     │
              ┌──────▼──────┐
              │ Reconcile   │
              │             │
              │ ✓ Matched: 4│
              │ ✗ Missing   │
              │   in PSP: 1 │
              │ ✗ Missing   │
              │   in ours: 1│
              └─────────────┘
```

### Why Reconciliation Matters

| Scenario | What Happened | How Reconciliation Catches It |
|---|---|---|
| Missed webhook | PSP charged customer, but we never got the callback | Transaction in PSP file, missing in our ledger |
| Ghost charge | We marked payment failed, but PSP actually charged | Mismatch in status between our records and PSP |
| Fraud | Unauthorized transaction | Transaction in PSP file that we never initiated |
| System bug | Ledger update failed after PSP success | PSP says success, our ledger says pending |
| Amount mismatch | Currency conversion error or fee miscalculation | Same transaction, different amounts |

### Reconciliation Process

```
┌────────────────────────────────────────────────────────────────┐
│                 DAILY RECONCILIATION JOB                       │
│                                                                │
│  ┌─────────────────────┐                                       │
│  │ 1. Download Files   │  Pull settlement files from PSP       │
│  │    (SFTP/API)       │  and bank statements                  │
│  └──────────┬──────────┘                                       │
│             │                                                  │
│  ┌──────────▼──────────┐                                       │
│  │ 2. Parse & Normalize│  Convert PSP-specific formats         │
│  │                     │  into our internal format              │
│  └──────────┬──────────┘                                       │
│             │                                                  │
│  ┌──────────▼──────────┐                                       │
│  │ 3. Match            │  Join on PSP reference ID             │
│  │                     │  Compare amount, currency, status     │
│  └──────────┬──────────┘                                       │
│             │                                                  │
│  ┌──────────▼──────────────────────────────────┐               │
│  │ 4. Categorize Results                       │               │
│  │                                             │               │
│  │  ✓ MATCHED         — amounts and status OK  │               │
│  │  ✗ AMOUNT_MISMATCH — different amounts      │               │
│  │  ✗ MISSING_OURS    — in PSP, not in ledger  │               │
│  │  ✗ MISSING_PSP     — in ledger, not in PSP  │               │
│  │  ✗ STATUS_MISMATCH — different status        │               │
│  └──────────┬──────────────────────────────────┘               │
│             │                                                  │
│  ┌──────────▼──────────┐                                       │
│  │ 5. Generate Report  │  Summary for finance team             │
│  │    + Alert           │  Pages on-call for critical mismatches│
│  └──────────┬──────────┘                                       │
│             │                                                  │
│  ┌──────────▼──────────┐                                       │
│  │ 6. Manual Resolution│  Finance team investigates and        │
│  │                     │  resolves each discrepancy            │
│  └─────────────────────┘                                       │
└────────────────────────────────────────────────────────────────┘
```

### Reconciliation Timing

```
T+0  (Day 0):     Transactions happen in real-time
T+1  (Day 1):     PSP generates settlement file for Day 0
T+1  (Day 1):     Our reconciliation job runs, compares with our ledger
T+2  (Day 2):     Discrepancies investigated, adjustments made
T+3+ (Day 3+):    Bank settlement arrives, second-level reconciliation
```

**Interview tip**: Reconciliation is often overlooked by candidates but is a critical differentiator. Mentioning it shows you understand that real-world payment systems need a safety net beyond real-time processing. Every payment company runs reconciliation — it's not optional.

---

## 7. Ledger System

### Double-Entry Bookkeeping

Every financial transaction creates **exactly two entries** — a debit and a credit. The fundamental rule: **total debits must always equal total credits**. This is a 500-year-old accounting principle (invented in Renaissance Italy) that prevents money from appearing or disappearing.

```
┌────────────────────────────────────────────────────────────────┐
│                    DOUBLE-ENTRY EXAMPLE                        │
│                                                                │
│  Buyer pays $50 to Merchant:                                   │
│                                                                │
│  ┌─────────────────────┐     ┌──────────────────────────┐      │
│  │  Buyer Cash Account │     │ Merchant Receivable Acct │      │
│  │                     │     │                          │      │
│  │  DEBIT  -$50.00     │     │  CREDIT  +$50.00         │      │
│  │  (money leaves)     │     │  (money arrives)         │      │
│  └─────────────────────┘     └──────────────────────────┘      │
│                                                                │
│  SUM of all debits  = SUM of all credits  (always!)            │
│        -$50.00      =      +$50.00          ✓                  │
└────────────────────────────────────────────────────────────────┘
```

### With Platform Fees

Real marketplaces take a fee. A $50 payment with a 10% platform fee generates **three** pairs of entries:

```
Buyer pays $50 for a product. Platform takes 10% ($5).

Entry 1: Money leaves buyer
  DEBIT   buyer_cash                -$50.00
  CREDIT  platform_receivable       +$50.00

Entry 2: Platform takes its fee
  DEBIT   platform_receivable       -$5.00
  CREDIT  platform_revenue          +$5.00

Entry 3: Remaining goes to merchant
  DEBIT   platform_receivable       -$45.00
  CREDIT  merchant_balance          +$45.00

Verification:
  Total debits:   -50 + (-5) + (-45) = -100
  Total credits:  +50 + (+5) + (+45) = +100
  Net = 0  ✓ (money is conserved)
```

### Ledger Table Schema

```sql
CREATE TABLE ledger_entries (
    entry_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES payments(payment_id),
    account_id      VARCHAR(255) NOT NULL,      -- which account
    entry_type      VARCHAR(10) NOT NULL,        -- 'DEBIT' or 'CREDIT'
    amount          BIGINT NOT NULL,             -- always positive (sign determined by type)
    currency        VARCHAR(3) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Immutable: no UPDATE or DELETE allowed at the application level
    CONSTRAINT chk_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_ledger_payment ON ledger_entries(payment_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id, created_at);
```

### Append-Only — The Golden Rule

Ledger entries are **never updated or deleted**. If a payment needs to be reversed, you create new entries that reverse the original:

```
Original payment (pay_001):
  DEBIT   buyer_cash        -$50.00
  CREDIT  merchant_balance  +$50.00

Refund (pay_001_refund):
  DEBIT   merchant_balance  -$50.00    ← reverses the credit
  CREDIT  buyer_cash        +$50.00    ← reverses the debit

Net effect: $0 moved. Complete audit trail preserved.
```

**Why append-only?**
- **Auditability**: regulators can see the full history
- **Debuggability**: you can reconstruct the state at any point in time
- **Integrity**: no one can cover their tracks by modifying records
- **Compliance**: SOX, PCI-DSS, and financial regulations require immutable records

### Ledger vs Wallet

| Aspect | Ledger | Wallet |
|---|---|---|
| Purpose | Record every movement | Show current balance |
| Nature | Append-only log | Computed aggregate |
| Update | Insert new entry | Recalculated from ledger |
| Query | "What happened?" (history) | "How much is available?" (snapshot) |
| Source of truth | Yes — the primary record | Derived — can be rebuilt from ledger |

---

## 8. Payment Status & State Machine

### State Machine Diagram

```
                            ┌──────────────┐
                            │  NOT_STARTED │
                            └──────┬───────┘
                                   │ Payment request received
                                   ▼
                            ┌──────────────┐
                     ┌──────│   PENDING     │──────┐
                     │      └──────┬───────┘      │
                     │             │               │
                     │ Validation  │ Valid          │ Invalid
                     │ failed      │               │
                     │             ▼               ▼
                     │      ┌──────────────┐ ┌──────────────┐
                     │      │  EXECUTING   │ │   REJECTED   │
                     │      └──────┬───────┘ └──────────────┘
                     │             │
                     │    ┌────────┼────────┐
                     │    │        │        │
                     │    ▼        ▼        ▼
                     │ ┌───────┐┌──────┐┌─────────────────┐
                     │ │SUCCESS││FAILED││REQUIRES_ACTION  │
                     │ └───┬───┘└──────┘│ (3D Secure)     │
                     │     │            └────────┬────────┘
                     │     │                     │
                     │     │              ┌──────┴──────┐
                     │     │              │             │
                     │     │              ▼             ▼
                     │     │         ┌───────┐    ┌──────┐
                     │     │         │SUCCESS│    │FAILED│
                     │     │         └───┬───┘    └──────┘
                     │     │             │
                     │     ▼             ▼
                     │  ┌──────────────────┐
                     │  │   SETTLED        │   (funds transferred)
                     │  └──────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  CANCELLED   │
              └──────────────┘
```

### Refund State Machine

```
SUCCESS ──▶ REFUND_REQUESTED ──▶ REFUND_PROCESSING ──▶ REFUNDED
                                        │
                                        └──▶ REFUND_FAILED
```

### State Transition Rules

| From | To | Trigger | Notes |
|---|---|---|---|
| NOT_STARTED | PENDING | Payment request received | Record created in DB |
| PENDING | EXECUTING | Validation passes | PSP call initiated |
| PENDING | REJECTED | Validation fails | Bad input, insufficient funds signal |
| EXECUTING | SUCCESS | PSP confirms | Charge completed |
| EXECUTING | FAILED | PSP declines | Card declined, fraud block |
| EXECUTING | REQUIRES_ACTION | PSP needs 3DS | Redirect buyer |
| REQUIRES_ACTION | SUCCESS | 3DS completed | Buyer authenticated |
| REQUIRES_ACTION | FAILED | 3DS failed/timeout | Buyer didn't authenticate |
| SUCCESS | REFUND_REQUESTED | Refund initiated | Merchant or system triggers |
| REFUND_REQUESTED | REFUND_PROCESSING | Refund sent to PSP | PSP processing reversal |
| REFUND_PROCESSING | REFUNDED | PSP confirms refund | Money returned to buyer |

**Critical rule**: No backward transitions. If a payment is `SUCCESS`, you cannot move it back to `PENDING`. To reverse the financial effect, create a refund — a separate flow that creates new ledger entries. This preserves the audit trail.

### State Transition Table (in DB)

```sql
CREATE TABLE payment_state_transitions (
    transition_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES payments(payment_id),
    from_status     VARCHAR(30) NOT NULL,
    to_status       VARCHAR(30) NOT NULL,
    reason          TEXT,
    actor           VARCHAR(100),               -- 'system', 'webhook', 'admin'
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Every state change is logged. This is invaluable for debugging ("why was this payment marked failed?") and compliance.

---

## 9. Handling Failures

Payment systems operate in an environment where **everything fails**: networks drop, PSPs have outages, databases restart, and services crash mid-transaction. The system must handle every failure mode gracefully.

### Failure Scenarios & Solutions

```
┌──────────────────────────────────────────────────────────────────┐
│                    FAILURE HANDLING MATRIX                       │
│                                                                  │
│  Failure                │ Solution                    │ Key      │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  PSP call timeout       │ Retry with same             │ Idem-    │
│                         │ idempotency key             │ potency  │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  Webhook not received   │ Polling fallback +          │ Polling  │
│                         │ reconciliation              │          │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  Payment service crash  │ On restart, check pending   │ Recovery │
│  mid-processing         │ payments and resume         │ process  │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  Ledger write fails     │ Retry via message queue     │ At-least │
│  after PSP success      │ (eventual consistency)      │ -once    │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  PSP is completely      │ Circuit breaker, failover   │ Multi-   │
│  down                   │ to secondary PSP            │ PSP      │
│  ───────────────────────┼─────────────────────────────┼───────── │
│  Partial refund fails   │ Compensation transaction    │ Saga     │
│                         │ + manual review queue       │ pattern  │
└──────────────────────────────────────────────────────────────────┘
```

### Retry Strategy with Exponential Backoff

```
Attempt 1:  Call PSP → timeout
            Wait 1 second
Attempt 2:  Call PSP (same idempotency key) → timeout
            Wait 2 seconds
Attempt 3:  Call PSP (same idempotency key) → timeout
            Wait 4 seconds
Attempt 4:  Call PSP (same idempotency key) → SUCCESS ✓

Max retries: 5
Max backoff: 30 seconds
After max retries: move to dead letter queue for manual investigation
```

### Webhook Missed — Polling Fallback

```
┌────────────────────────────────────────────────────────────┐
│                WEBHOOK + POLLING STRATEGY                   │
│                                                            │
│  Primary: Webhook (push)                                   │
│  ┌──────────┐    Webhook POST     ┌──────────────┐         │
│  │   PSP    │───────────────────▶│ Our Webhook  │         │
│  │          │                    │  Endpoint    │         │
│  └──────────┘                    └──────────────┘         │
│                                                            │
│  Fallback: Polling (pull)                                  │
│  ┌──────────────────┐   GET /v1/charges/{id}  ┌─────────┐ │
│  │  Polling Service │──────────────────────▶  │   PSP   │ │
│  │                  │                         │         │ │
│  │  Runs every 5min │  "Any PENDING payments  │         │ │
│  │  for payments    │   older than 10 min?"   │         │ │
│  │  stuck > 10 min  │                         │         │ │
│  └──────────────────┘                         └─────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Dead Letter Queue (DLQ)

When all retries are exhausted, the payment event goes to a dead letter queue:

```
Normal flow:     Payment Event → Processing → Success
Retry flow:      Payment Event → Processing → Fail → Retry Queue → Processing → Success
DLQ flow:        Payment Event → Processing → Fail → Retry (×5) → Dead Letter Queue
                                                                       │
                                                           ┌───────────▼──────────┐
                                                           │  Alert on-call       │
                                                           │  Manual investigation│
                                                           │  Dashboard visibility│
                                                           └──────────────────────┘
```

### Saga Pattern for Multi-Step Failures

When a payment involves multiple services (payment, inventory, shipping), use the saga pattern:

```
Forward flow (happy path):
  1. Reserve inventory    ✓
  2. Charge payment       ✓
  3. Create shipment      ✓

Compensation flow (step 3 fails):
  1. Reserve inventory    ✓
  2. Charge payment       ✓
  3. Create shipment      ✗ FAILED
  4. Refund payment       ← compensation
  5. Release inventory    ← compensation
```

Each step has a compensating action. If any step fails, the saga executes compensations in reverse order to undo the partial work.

---

## 10. Pay-out Flow

### What Is Pay-out?

Pay-in is money coming in (buyer to platform). **Pay-out** is money going out (platform to merchant). After collecting payments throughout the day, the platform must settle with each merchant.

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Daily  │    │  Aggregate   │    │  Pay-out     │    │  Merchant's  │
│  Sales  │───▶│  Calculate   │───▶│  Service     │───▶│  Bank        │
│  Data   │    │  Net Amount  │    │  (ACH/Wire)  │    │  Account     │
└─────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Pay-out Calculation

```
Merchant "Coffee Shop" — Daily Settlement (Feb 24, 2026)

Gross sales:                        $5,240.00
  - Transaction 1: $12.50
  - Transaction 2: $8.75
  - Transaction 3: $45.00
  - ... (347 transactions)

Minus refunds:                      -$125.00
Minus platform fee (2.9% + $0.30):  -$253.26
Minus chargebacks:                  -$45.00

═══════════════════════════════════════════
Net pay-out amount:                 $4,816.74

Pay-out schedule:  T+2 (2 business days after transaction)
Transfer method:   ACH bank transfer
```

### Pay-out Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAY-OUT PIPELINE                            │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  Settlement  │  Daily batch job at 00:00 UTC                     │
│  │  Calculator  │  Aggregates all successful payments per merchant  │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │   Deduction  │  Subtracts: platform fees, refunds, chargebacks,  │
│  │   Engine     │  reserves (holdback for potential chargebacks)     │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │   Pay-out    │  Creates pay-out record with status PENDING       │
│  │   Creator    │  Updates ledger with pay-out entries              │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │   Bank       │  Initiates ACH/wire transfer via banking PSP      │
│  │   Transfer   │  Updates status to PROCESSING                     │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │ Confirmation │  Bank confirms transfer (1-3 business days)       │
│  │              │  Updates status to COMPLETED                      │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Pay-out Ledger Entries

```
Pay-out of $4,816.74 to merchant:

  DEBIT   merchant_balance      -$4,816.74    (reduce merchant's platform balance)
  CREDIT  merchant_bank_payout  +$4,816.74    (record outgoing bank transfer)
```

### Pay-out Schedule Options

| Schedule | Use Case | Pros | Cons |
|---|---|---|---|
| T+0 (instant) | Gig economy, drivers | Best merchant experience | Higher fraud risk, cash flow pressure |
| T+1 | Large marketplaces | Good balance | Need reserves for chargebacks |
| T+2 (standard) | Most e-commerce | Standard banking timeline | Merchants wait 2 days |
| Weekly | Small merchants | Simpler operations | Longer wait for merchants |
| Monthly | Enterprise | Minimal operational overhead | Poor for cash-flow-sensitive merchants |

---

## 11. Security & Compliance

### PCI-DSS (Payment Card Industry Data Security Standard)

PCI-DSS is a mandatory standard for any entity that stores, processes, or transmits cardholder data. There are four compliance levels based on transaction volume:

| Level | Annual Transactions | Requirement |
|---|---|---|
| 1 | > 6 million | On-site audit by QSA (Qualified Security Assessor) |
| 2 | 1-6 million | Self-Assessment Questionnaire (SAQ) |
| 3 | 20K-1M (e-commerce) | SAQ |
| 4 | < 20K | SAQ |

### How We Minimize PCI Scope

```
┌────────────────────────────────────────────────────────────────┐
│              PCI SCOPE MINIMIZATION STRATEGY                   │
│                                                                │
│  ❌ BAD: Raw card data flows through our servers               │
│                                                                │
│  Browser ──card──▶ Our Server ──card──▶ PSP                    │
│                    ▲                                           │
│                    │ PCI Level 1 required!                     │
│                    │ Full audit, massive cost                  │
│                                                                │
│  ✅ GOOD: Card data goes directly to PSP                       │
│                                                                │
│  Browser ──card──▶ PSP (Stripe.js) ──▶ Returns token           │
│  Browser ──token──▶ Our Server ──token──▶ PSP                  │
│                     ▲                                          │
│                     │ PCI SAQ-A (minimal scope!)               │
│                     │ Self-assessment questionnaire             │
└────────────────────────────────────────────────────────────────┘
```

### Key PCI-DSS Requirements (Simplified)

| Requirement | What It Means | Our Approach |
|---|---|---|
| Never store CVV | CVV cannot be stored post-authorization | PSP tokenization — we never see CVV |
| Encrypt card data | Card numbers encrypted at rest + in transit | We don't store card data at all |
| Access controls | Limit who can access cardholder data | No cardholder data in our systems |
| Audit logging | Log all access to cardholder data | Comprehensive audit trails |
| Network security | Segment the cardholder data environment | Not applicable — data stays at PSP |
| Vulnerability mgmt | Regular security scans and patches | Standard security practices |

### Fraud Detection Layers

```
┌──────────────────────────────────────────────────────────┐
│                  FRAUD DETECTION STACK                    │
│                                                          │
│  Layer 1: Velocity Checks (our system)                   │
│  ├── Max 3 payment attempts per card per hour            │
│  ├── Max $5,000 per card per day                         │
│  └── Flag unusual geographic patterns                    │
│                                                          │
│  Layer 2: PSP ML Models (Stripe Radar, etc.)             │
│  ├── Device fingerprinting                               │
│  ├── Behavioral analysis                                 │
│  └── Cross-merchant fraud patterns                       │
│                                                          │
│  Layer 3: 3D Secure (3DS / SCA)                          │
│  ├── Additional authentication for high-risk txns        │
│  ├── OTP via SMS or bank app                             │
│  └── Liability shifts to issuing bank                    │
│                                                          │
│  Layer 4: Manual Review                                  │
│  ├── High-value transactions flagged for human review    │
│  └── Suspicious pattern investigation                    │
└──────────────────────────────────────────────────────────┘
```

### Data Security Best Practices

```
At Rest:
  • All databases encrypted (AES-256)
  • Payment tokens stored, never raw card numbers
  • Secrets in vault (HashiCorp Vault, AWS KMS)
  • Database access via IAM roles, not passwords

In Transit:
  • TLS 1.2+ for all connections
  • Certificate pinning for PSP communication
  • mTLS between internal microservices

Access Control:
  • Principle of least privilege
  • Payment operations require MFA for humans
  • Service-to-service auth via short-lived tokens
  • All access logged and auditable
```

---

## 12. Scaling & Architecture

### Why Payment Systems Scale Differently

Most system design problems optimize for throughput. Payment systems optimize for **correctness with adequate throughput**. 100 TPS is nothing for modern infrastructure — but each of those 100 transactions must be perfectly correct.

```
┌──────────────────────────────────────────────────────────┐
│            PAYMENT SYSTEM SCALING PRIORITIES              │
│                                                          │
│  Priority 1: Correctness                                 │
│  ├── ACID transactions (PostgreSQL, not NoSQL)           │
│  ├── Idempotency at every layer                          │
│  └── Double-entry ledger invariants                      │
│                                                          │
│  Priority 2: Availability                                │
│  ├── Multi-AZ deployment                                 │
│  ├── Circuit breakers for PSP calls                      │
│  └── Graceful degradation                                │
│                                                          │
│  Priority 3: Scalability (only after 1 & 2)              │
│  ├── Horizontal scaling of stateless services            │
│  ├── Database read replicas for queries                  │
│  └── Sharding by merchant_id for write scaling           │
└──────────────────────────────────────────────────────────┘
```

### Architecture for Scale

```
                     ┌──────────────┐
                     │ Load Balancer│
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼──────┐┌────▼────┐┌───────▼──────┐
       │  Payment    ││ Payment ││  Payment     │   Stateless, horizontally
       │  Service    ││ Service ││  Service     │   scalable
       │  (Node 1)   ││ (Node 2)││  (Node 3)   │
       └──────┬──────┘└────┬────┘└───────┬──────┘
              │            │             │
              └────────────┼─────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
       ┌──────▼──────┐┌───▼──────┐  ┌──────▼──────┐
       │  PostgreSQL  ││  Redis   │  │  Kafka /    │
       │  (Primary)   ││  Cache   │  │  SQS        │
       │              ││          │  │             │
       │  Payments    ││Idempotency│ │Async events:│
       │  Ledger      ││  cache   │  │• Ledger     │
       │  State       ││          │  │• Wallet     │
       └──────┬───────┘└──────────┘  │• Notifs     │
              │                      └─────────────┘
       ┌──────▼───────┐
       │  PostgreSQL  │
       │  (Replica)   │   Read queries, reconciliation
       └──────────────┘
```

### Database Choice: RDBMS, Not NoSQL

| Need | Why RDBMS (PostgreSQL) | Why NOT NoSQL |
|---|---|---|
| ACID transactions | Built-in, battle-tested | Varies; most are eventually consistent |
| Foreign keys | Enforce referential integrity | Not available |
| Complex queries | SQL JOINs for reconciliation | Limited query capabilities |
| Unique constraints | Idempotency key enforcement | Not guaranteed in distributed NoSQL |
| Audit & compliance | Mature tooling, point-in-time recovery | Harder to audit |

At 100 TPS peak, a single PostgreSQL instance handles the write load easily. For read scaling, add replicas. For write scaling (if ever needed), shard by `merchant_id`.

### Async Processing with Message Queues

Synchronous operations (critical path):
- Payment creation
- PSP communication
- Status update

Asynchronous operations (via message queue):
- Ledger entry creation
- Wallet balance update
- Email/push notification
- Analytics event emission
- Webhook delivery to merchant

```
Payment Service ──▶ Message Queue ──▶ Ledger Consumer
                                  ──▶ Wallet Consumer
                                  ──▶ Notification Consumer
                                  ──▶ Analytics Consumer
```

**Why async?** If the notification service is down, the payment should still succeed. Non-critical operations are decoupled using at-least-once message delivery with idempotent consumers.

### Multi-Region Considerations

For global payment platforms:

```
┌──────────────────────┐     ┌──────────────────────┐
│   US Region          │     │   EU Region          │
│                      │     │                      │
│  Payment Service     │     │  Payment Service     │
│  PostgreSQL (primary)│◀───▶│  PostgreSQL (primary)│
│  PSP: Stripe US      │     │  PSP: Adyen EU       │
│                      │     │                      │
│  Handles USD txns    │     │  Handles EUR txns    │
│  US merchant data    │     │  EU merchant data    │
│  US compliance       │     │  GDPR + PSD2         │
└──────────────────────┘     └──────────────────────┘

Each region is independent — no cross-region payment processing.
Data residency: EU cardholder data stays in EU (GDPR).
PSP routing: local PSP endpoints for lower latency and compliance.
```

---

## 13. Trade-offs & Interview Tips

### Key Trade-offs

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Consistency vs Availability | Strong consistency (CP) | High availability (AP) | **CP** — financial data must be consistent |
| Sync vs Async processing | Synchronous (simpler) | Async (more resilient) | Hybrid: sync for critical path, async for side effects |
| Single PSP vs Multi-PSP | One PSP (simpler integration) | Multiple PSPs (redundancy) | **Multi-PSP** for production; single for MVP |
| Build vs Buy | Build payment processing | Use PSP (Stripe, Adyen) | **Buy** (PSP) — PCI compliance alone justifies it |
| SQL vs NoSQL | RDBMS (ACID, familiar) | NoSQL (scale, flexibility) | **SQL** — correctness requirements demand ACID |
| Monolith vs Microservices | Single payment service | Split into micro-services | Start monolith, extract when needed |

### Common Follow-up Questions

| Question | Key Points to Cover |
|---|---|
| "How do you handle currency conversion?" | Store amounts in smallest unit (cents); FX at time of charge; store both original and converted amounts |
| "What if the PSP goes down?" | Circuit breaker, failover to secondary PSP, queue and retry |
| "How do you handle chargebacks?" | Separate chargeback service; evidence submission API; ledger reversal entries |
| "How do you prevent internal fraud?" | Separation of duties; dual-approval for refunds > $X; audit trails; access logging |
| "How do you handle subscriptions?" | Recurring payment scheduler; retry on failure (dunning); grace periods |
| "What about cryptocurrency payments?" | Treat crypto PSP as another adapter; volatility risk; separate settlement flow |
| "How do you test payment systems?" | PSP sandbox environments; chaos engineering; shadow traffic; reconciliation as verification |

### Interview Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────┐
│              PAYMENT SYSTEM — QUICK REFERENCE                    │
│                                                                  │
│  Core Principle:  Correctness >>> Throughput                     │
│                                                                  │
│  Must-Mention Topics:                                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. Idempotency key  — prevents double charging             │ │
│  │ 2. PSP integration  — never store raw card data            │ │
│  │ 3. Double-entry     — ledger with debit + credit           │ │
│  │ 4. Reconciliation   — daily batch to catch discrepancies   │ │
│  │ 5. State machine    — explicit payment lifecycle           │ │
│  │ 6. Retry handling   — same idempotency key on retry        │ │
│  │ 7. Webhook + poll   — dual strategy for PSP notifications  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Architecture Choices:                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Database: PostgreSQL (ACID, not NoSQL)                   │ │
│  │ • PSP: Stripe/Adyen (don't build card processing)          │ │
│  │ • Async: Kafka/SQS for non-critical ops                    │ │
│  │ • Ledger: append-only, immutable                           │ │
│  │ • Amounts: store in cents (BIGINT, not FLOAT)              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Red Flags (things that lose points):                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ✗ Using NoSQL for payment records                          │ │
│  │ ✗ Storing raw credit card numbers                          │ │
│  │ ✗ No idempotency strategy                                  │ │
│  │ ✗ Using FLOAT for money (use BIGINT cents)                 │ │
│  │ ✗ Ignoring reconciliation                                  │ │
│  │ ✗ No failure handling strategy                             │ │
│  │ ✗ Saying "we'll build our own card processor"              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Impressive Topics (bonus points):                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ★ Mention T+1/T+2 settlement timelines                    │ │
│  │ ★ Explain auth vs capture (two-step payment)               │ │
│  │ ★ Discuss chargeback handling                              │ │
│  │ ★ Mention PSD2/SCA for EU payments                        │ │
│  │ ★ Talk about money stored in cents to avoid float errors   │ │
│  │ ★ Explain saga pattern for distributed transactions        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Auth vs Capture — Two-Step Payment

Many e-commerce platforms separate authorization from capture:

```
Step 1: AUTHORIZE  (when order is placed)
  • "Can this card pay $50?"
  • Bank puts a hold on $50 (not yet charged)
  • Money not transferred yet

Step 2: CAPTURE    (when order ships, hours/days later)
  • "Charge the $50 we authorized"
  • Money is actually transferred
  • Partial capture possible ($30 of $50)

Why?
  • Only charge when you can fulfill the order
  • If item is out of stock, void the auth (no charge)
  • Required by card network rules in many cases
```

### Data Model Summary

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│    payments      │     │   ledger_entries     │     │     wallets      │
│─────────────────│     │─────────────────────│     │──────────────────│
│ payment_id  (PK)│     │ entry_id  (PK)      │     │ wallet_id  (PK)  │
│ idempotency_key │────▶│ payment_id (FK)     │     │ merchant_id      │
│ buyer_id        │     │ account_id          │     │ balance          │
│ merchant_id     │     │ entry_type          │     │ currency         │
│ amount          │     │ amount              │     │ updated_at       │
│ currency        │     │ currency            │     └──────────────────┘
│ status          │     │ created_at          │
│ psp_reference   │     └─────────────────────┘
│ created_at      │
│ updated_at      │     ┌─────────────────────┐
└─────────────────┘     │ payment_state_trans  │
                        │─────────────────────│
                        │ transition_id (PK)  │
                        │ payment_id (FK)     │
                        │ from_status         │
                        │ to_status           │
                        │ reason              │
                        │ created_at          │
                        └─────────────────────┘
```

---

## Summary

Designing a payment system is about building a system that **never loses money and never charges twice**. The key takeaways:

1. **Idempotency is everything** — every operation must be safe to retry with the same result
2. **Use a PSP** — don't process cards yourself; PCI-DSS compliance alone is reason enough
3. **Double-entry ledger** — the accounting backbone that ensures money is always conserved
4. **Reconciliation** — the safety net that catches what real-time processing misses
5. **State machine** — explicit states with logged transitions and no backward movement
6. **Correctness over throughput** — use RDBMS, ACID transactions, and strong consistency
7. **Plan for failure** — retries, webhooks + polling, dead letter queues, circuit breakers

The payment system is one of the most practical system design questions because it tests whether you understand that **some systems cannot afford to be "eventually correct."** Every penny must be accounted for, every transaction traceable, and every failure recoverable.
