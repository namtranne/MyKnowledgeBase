---
sidebar_position: 4
title: "03 — Multistep Process"
---

# 🔗 Multistep Process

How do you coordinate an operation that spans multiple services, databases, or external systems — where each step can independently fail? This is one of the hardest problems in distributed systems, and getting it wrong leads to inconsistent data, stuck transactions, and lost revenue.

---

## 🔍 The Core Problem

In a monolithic system with a single database, you wrap everything in a transaction:

```sql
BEGIN;
  INSERT INTO orders (...) VALUES (...);
  UPDATE inventory SET stock = stock - 1 WHERE product_id = 42;
  INSERT INTO payments (...) VALUES (...);
COMMIT;
```

All-or-nothing. Easy.

In a microservices architecture, each step involves a **different service with its own database**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Order Service│────►│ Inventory    │────►│ Payment      │────►│ Notification │
│ (Postgres)   │     │ Service      │     │ Service      │     │ Service      │
│              │     │ (Postgres)   │     │ (Stripe API) │     │ (SendGrid)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

You can't wrap a cross-service operation in a single ACID transaction. What happens if Payment fails after Inventory was already decremented? What if the Notification service is down?

### Why Distributed Transactions Are Hard

| Challenge | Explanation |
|-----------|-------------|
| **No global transaction manager** | Each service owns its database — no shared `COMMIT` |
| **Partial failure** | Any step can fail independently (network, timeout, bug) |
| **Network partitions** | Services may not be able to communicate at all |
| **Latency** | Holding locks across services for consensus destroys throughput |
| **Autonomy** | Services should be independently deployable — coupling them via 2PC breaks this |
| **FLP Impossibility** | No consensus protocol can guarantee termination in an asynchronous system with even one failure |

---

## 🔧 Approach 1: Two-Phase Commit (2PC)

The classical solution for distributed transactions. A **coordinator** ensures all participants either commit or abort together.

### How 2PC Works

```
                    ┌─────────────────┐
                    │   Coordinator   │
                    └────────┬────────┘
                             │
              Phase 1: PREPARE (Can you commit?)
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  Service  │     │  Service  │     │  Service  │
     │    A      │     │    B      │     │    C      │
     │           │     │           │     │           │
     │  YES ✓   │     │  YES ✓   │     │  YES ✓   │
     └──────────┘     └──────────┘     └──────────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
              Phase 2: COMMIT (All said YES)
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  COMMIT  │     │  COMMIT  │     │  COMMIT  │
     └──────────┘     └──────────┘     └──────────┘
```

### Phase 1: Prepare

1. Coordinator sends `PREPARE` to all participants
2. Each participant:
   - Writes all changes to local storage (but does NOT commit)
   - Acquires all necessary locks
   - Writes a **prepare record** to its WAL
   - Responds `YES` (ready) or `NO` (cannot commit)

### Phase 2: Commit or Abort

- **If ALL participants said YES:** Coordinator sends `COMMIT` → all participants commit
- **If ANY participant said NO:** Coordinator sends `ABORT` → all participants rollback

### The Fatal Flaw: Blocking

2PC has a critical vulnerability: **if the coordinator crashes after Phase 1 but before Phase 2, all participants are stuck holding locks**, unable to commit or rollback until the coordinator recovers.

```
Coordinator: sends PREPARE to A, B, C
A: responds YES (now holding locks)
B: responds YES (now holding locks)
C: responds YES (now holding locks)

--- Coordinator CRASHES ---

A, B, C: holding locks indefinitely, waiting for COMMIT or ABORT
         → Blocking all other transactions on those rows
         → System grinds to a halt
```

### 2PC Trade-offs

| Aspect | Assessment |
|--------|-----------|
| **Consistency** | Strong — all-or-nothing guaranteed |
| **Availability** | Poor — coordinator failure blocks everything |
| **Latency** | High — 2 round trips + lock holding |
| **Throughput** | Low — locks held across network round trips |
| **Autonomy** | Violated — services coupled to coordinator |
| **Use cases** | Databases within the same organization (XA transactions), not microservices |

:::warning When to Avoid 2PC
Avoid 2PC across independently deployed microservices. It creates tight coupling, reduces availability, and introduces a single point of failure (the coordinator). Use the Saga pattern instead.
:::

### Where 2PC Is Still Used

Despite its drawbacks across microservices, 2PC remains the right tool in several narrow, well-controlled contexts.

#### 1. XA Transactions — Database + Message Queue Atomicity

**The problem:** An application must write to a database AND publish a message to a broker (JMS/ActiveMQ) atomically. If the DB write succeeds but the message publish fails (or vice versa), downstream systems get an inconsistent view.

**How XA solves it:** A JTA transaction manager (Atomikos, Narayana, Bitronix) acts as the 2PC coordinator across both the database and the message broker — both are XA-capable resources.

```
┌──────────────────────────────────────────────────────┐
│               JTA Transaction Manager                │
│               (Atomikos / Narayana)                   │
│                                                      │
│   Phase 1: PREPARE                                   │
│       ├── PostgreSQL XA Resource → YES ✓             │
│       └── ActiveMQ XA Resource   → YES ✓             │
│                                                      │
│   Phase 2: COMMIT                                    │
│       ├── PostgreSQL → COMMITTED                     │
│       └── ActiveMQ   → COMMITTED                     │
└──────────────────────────────────────────────────────┘
```

```java
@Transactional // JTA-managed XA transaction
public void placeOrder(OrderRequest request) {
    // XA Resource 1: PostgreSQL
    Order order = new Order(request);
    orderRepository.save(order);

    // XA Resource 2: ActiveMQ (JMS)
    jmsTemplate.convertAndSend("order-events", new OrderCreatedEvent(order.getId()));

    // If either resource fails to PREPARE → both are rolled back
    // If both PREPARE successfully → both COMMIT atomically
}
```

**Why it works here:** Both resources live in the same JVM / same datacenter. The coordinator (JTA) is co-located — not a remote service. Transactions are short-lived (milliseconds). The coordinator's transaction log is on local disk, so recovery after crash is fast.

**Where you see this:** Legacy enterprise Java apps (JEE/Spring + JMS), banking core systems where regulations demand strict atomicity between the ledger write and the audit event.

:::tip When to Use Outbox Instead
If you're choosing between XA and the Transactional Outbox pattern for DB + message queue atomicity, **prefer Outbox** in greenfield systems. It avoids XA's coupling, complexity, and lock-holding. XA makes sense when you're already in a JEE stack with an existing JTA setup, or when you need synchronous guarantee that the message was accepted by the broker before returning to the caller.
:::

#### 2. Database-Internal Distributed Transactions

Modern distributed SQL databases (CockroachDB, Google Spanner, TiDB) use 2PC **internally** for cross-shard transactions — but they eliminate the fatal flaw (coordinator as SPOF) by making the coordinator itself a replicated, fault-tolerant entity.

**CockroachDB — Parallel Commits with Raft-Replicated Coordinator**

CockroachDB splits data into ranges (~512 MB each), each replicated via Raft. A transaction that touches multiple ranges uses an internal 2PC protocol:

```
Transaction: Transfer $100 from Account A (Range 1) to Account B (Range 3)

┌──────────────────────────────────────────────────────────────────────┐
│                    CockroachDB Internal 2PC                          │
│                                                                      │
│  Transaction Record (coordinator state)                              │
│  → stored on Range 1 (where the first write landed)                  │
│  → replicated via Raft across 3+ nodes — NOT a single point of      │
│    failure                                                           │
│                                                                      │
│  1. Write intent to Range 1: Account A -= $100  (PENDING)            │
│  2. Write intent to Range 3: Account B += $100  (PENDING)            │
│                                                                      │
│  3. Parallel Commit: atomically mark transaction record COMMITTED    │
│     + verify all intents are resolvable                              │
│                                                                      │
│  4. Async cleanup: convert PENDING intents → committed values        │
└──────────────────────────────────────────────────────────────────────┘
```

The key innovation: the transaction record is itself a Raft-replicated piece of data. If the node coordinating the transaction crashes, another replica of that range takes over and can read the transaction record to resolve the in-doubt state. The blocking problem vanishes.

**Google Spanner — 2PC with Paxos Groups + TrueTime**

Spanner takes this further. Each shard is a Paxos group (not a single node). When a transaction spans multiple shards:

```
Cross-shard transaction in Spanner:

  Coordinator (Paxos group for shard A)
       │
       ├── PREPARE → Shard B (Paxos group) → votes YES via Paxos
       ├── PREPARE → Shard C (Paxos group) → votes YES via Paxos
       │
       │   All YES → Coordinator decides COMMIT
       │   Commit decision replicated via Paxos (survives coordinator failure)
       │
       ├── COMMIT → Shard B
       └── COMMIT → Shard C

  Timestamp assigned via TrueTime:
    → commit-wait ensures no other transaction can have an earlier
      timestamp that hasn't been observed yet
    → External consistency (linearizability) across the globe
```

Spanner's 2PC is safe because every participant in the protocol is a fault-tolerant Paxos group, not a single node. The coordinator's decision is Paxos-replicated, so the in-doubt blocking problem is eliminated. TrueTime (GPS + atomic clocks) provides globally consistent timestamps without cross-node coordination for reads.

**Why this is different from microservice 2PC:**

| Factor | Microservice 2PC | Database-Internal 2PC |
|--------|-----------------|----------------------|
| **Coordinator** | Single application node (SPOF) | Raft/Paxos group (fault-tolerant) |
| **Participants** | Independent services, separate teams | Co-designed storage nodes, same codebase |
| **Network** | Cross-datacenter, unpredictable | Same datacenter / tightly controlled |
| **Lock duration** | Seconds to minutes (service latency) | Microseconds to milliseconds |
| **Recovery** | Manual DBA intervention | Automatic via replicated transaction log |

#### 3. Short-Lived, Same-Datacenter Operations

When all participants are co-located in the same datacenter, the coordinator is highly available, and transactions complete in milliseconds, 2PC's drawbacks become negligible.

**Example: Financial batch settlement**

A clearing system processes end-of-day settlements. Each settlement atomically updates the general ledger, the regulatory reporting table, and the position-keeping system — all separate Oracle databases in the same datacenter, coordinated by Oracle's distributed transaction manager:

```sql
-- Oracle Distributed Transaction (implicit 2PC via database links)
BEGIN
    -- Update general ledger (DB Link to ledger database)
    UPDATE ledger_db.gl_entries@LEDGER_LINK
    SET status = 'SETTLED', settled_at = SYSDATE
    WHERE batch_id = :batch_id;

    -- Update regulatory reporting (DB Link to reporting database)
    INSERT INTO reporting_db.settlements@REPORTING_LINK
        (batch_id, total_amount, currency, settled_at)
    VALUES (:batch_id, :total, 'AUD', SYSDATE);

    -- Update local position-keeping
    UPDATE positions
    SET balance = balance + :net_amount
    WHERE account_id = :account_id;

    COMMIT; -- Oracle automatically runs 2PC across the DB links
END;
```

**Why 2PC works here:**
- All databases are in the **same datacenter** (sub-millisecond network)
- Transactions are **short-lived** (< 100ms)
- The coordinator (the initiating Oracle instance) is a **highly available RAC cluster**
- The transaction volume is **bounded** (batch processing, not real-time API traffic)
- The organization **controls all participants** (no cross-team autonomy concerns)

#### 4. Kafka Transactions (Exactly-Once Semantics)

Kafka's exactly-once semantics (EOS) for read-process-write pipelines uses a 2PC-like protocol internally. The Transaction Coordinator (a Kafka broker) ensures that consumed offsets and produced messages are committed atomically.

```
Kafka Exactly-Once: consume from topic A → process → produce to topic B

┌──────────────────────────────────────────────────────────────────┐
│              Kafka Transaction Coordinator                       │
│              (partition of __transaction_state topic)             │
│                                                                  │
│  1. Producer: beginTransaction()                                 │
│  2. Producer: send(topicB, processedRecord)   → buffered         │
│  3. Producer: sendOffsetsToTransaction(topicA, offsets)           │
│                                                                  │
│  Phase 1 (PREPARE):                                              │
│     Coordinator writes PREPARE to __transaction_state             │
│                                                                  │
│  Phase 2 (COMMIT):                                               │
│     Coordinator writes commit markers to topicB partitions        │
│     Coordinator writes committed offsets to __consumer_offsets     │
│     Coordinator writes COMPLETE to __transaction_state             │
│                                                                  │
│  Consumer (read_committed): only sees records with commit markers │
└──────────────────────────────────────────────────────────────────┘
```

```java
producer.initTransactions();

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> record : records) {
            String result = process(record.value());
            producer.send(new ProducerRecord<>("output-topic", record.key(), result));
        }
        // Atomically commit produced records + consumed offsets
        producer.sendOffsetsToTransaction(currentOffsets(records), consumerGroupId);
        producer.commitTransaction();
    } catch (Exception e) {
        producer.abortTransaction();
    }
}
```

**Why 2PC works here:**
- The coordinator (`__transaction_state` partition) is a **replicated Kafka partition** — not a single-node SPOF
- All participants are Kafka brokers within the **same cluster** — tightly controlled environment
- Transactions are **short-lived** (typically < 1 second)
- This is internal to one system (Kafka), not cross-service coordination

---

## 🔧 Approach 2: The Saga Pattern

A Saga is a sequence of **local transactions** where each step has a corresponding **compensating transaction** (undo). If any step fails, the previously completed steps are reversed by executing their compensations in reverse order.

### Saga vs 2PC

| Aspect | 2PC | Saga |
|--------|-----|------|
| **Consistency** | Strong (ACID) | Eventual (ACD — no Isolation) |
| **Availability** | Low (blocking) | High (no global locks) |
| **Coupling** | Tight (coordinator) | Loose (events or orchestrator) |
| **Latency** | High (2 round trips + locks) | Lower (no cross-service locks) |
| **Compensations** | Automatic rollback | Must be explicitly designed |
| **Isolation** | Guaranteed | Not guaranteed — requires countermeasures |

### Order Processing Saga Example

```
Step 1: Create Order        → Compensation: Cancel Order
Step 2: Reserve Inventory   → Compensation: Release Inventory
Step 3: Process Payment     → Compensation: Refund Payment
Step 4: Send Notification   → (No compensation needed — informational)
```

**Happy path:**
```
Create Order ✓ → Reserve Inventory ✓ → Process Payment ✓ → Send Notification ✓
```

**Failure at Step 3 (Payment fails):**
```
Create Order ✓ → Reserve Inventory ✓ → Process Payment ✗
                                           │
                                    Trigger compensations (reverse order):
                                           │
                                    Release Inventory ✓ → Cancel Order ✓
```

### Orchestration-Based Saga

A central **orchestrator** (coordinator service) controls the saga execution.

```
                    ┌─────────────────────────┐
                    │   Order Saga            │
                    │   Orchestrator          │
                    │                         │
                    │   State: RESERVING_INV  │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ Order Service│     │  Inventory   │     │   Payment    │
    │              │     │  Service     │     │   Service    │
    └──────────────┘     └──────────────┘     └──────────────┘
```

```java
public class OrderSagaOrchestrator {
    
    public void execute(OrderRequest request) {
        SagaState state = SagaState.create(request);
        
        try {
            // Step 1
            state.setPhase(CREATING_ORDER);
            Order order = orderService.createOrder(request);
            state.setOrderId(order.getId());
            
            // Step 2
            state.setPhase(RESERVING_INVENTORY);
            inventoryService.reserve(order.getItems());
            
            // Step 3
            state.setPhase(PROCESSING_PAYMENT);
            paymentService.charge(order.getPaymentDetails());
            
            // Step 4
            state.setPhase(SENDING_NOTIFICATION);
            notificationService.sendConfirmation(order);
            
            state.setPhase(COMPLETED);
            
        } catch (Exception e) {
            compensate(state);
        }
    }
    
    private void compensate(SagaState state) {
        switch (state.getPhase()) {
            case PROCESSING_PAYMENT:
                // Payment failed — undo inventory reservation
                inventoryService.release(state.getOrderId());
                // Fall through
            case RESERVING_INVENTORY:
                // Inventory failed — cancel order
                orderService.cancel(state.getOrderId());
                break;
            case SENDING_NOTIFICATION:
                // Notification failed — payment already done
                // Log for manual retry, don't compensate payment
                break;
        }
        state.setPhase(COMPENSATED);
    }
}
```

**Orchestration advantages:** Centralized logic, easy to understand flow, simple to add new steps, clear ownership of the saga state.

**Orchestration disadvantages:** Single point of failure (the orchestrator), tight coupling to the orchestrator, potential bottleneck.

### Choreography-Based Saga

No central coordinator — each service listens for events and reacts by performing its step and emitting the next event.

```
┌──────────────┐  OrderCreated  ┌──────────────┐  InventoryReserved  ┌──────────────┐
│ Order Service│ ────────────► │  Inventory   │ ──────────────────► │   Payment    │
│              │               │  Service     │                     │   Service    │
└──────────────┘               └──────────────┘                     └──────────────┘
       ▲                              │                                    │
       │                    InventoryReserveFailed               PaymentProcessed
       │                              │                                    │
       │                              ▼                                    ▼
       │                    ┌──────────────┐                     ┌──────────────┐
       └────────────────── │  Order set   │                     │ Notification │
         OrderCancelled    │  to FAILED   │                     │   Service    │
                           └──────────────┘                     └──────────────┘
```

**Choreography advantages:** No single point of failure, services are fully decoupled, easier to scale independently.

**Choreography disadvantages:** Hard to track the overall saga state, difficult to debug, implicit flow is harder to understand, risk of cyclic dependencies.

### When to Use Which

| Factor | Orchestration | Choreography |
|--------|--------------|-------------|
| **Number of steps** | > 4 steps | ≤ 4 steps |
| **Complexity** | Complex branching logic | Linear flow |
| **Visibility** | Need centralized monitoring | Each service monitors itself |
| **Team structure** | One team owns the flow | Multiple autonomous teams |
| **Coupling tolerance** | Acceptable coupling to orchestrator | Need maximum decoupling |

---

## 🔧 Approach 3: Transactional Outbox Pattern

The **dual-write problem**: How do you atomically update a database AND publish an event? If the DB write succeeds but the event publish fails, downstream systems miss the event. If the event publishes but the DB write fails, downstream systems act on phantom data.

### The Problem

```
// DANGEROUS: dual write — not atomic
db.save(order);                    // Step 1: DB write
kafka.publish("OrderCreated", order);  // Step 2: Event publish

// What if Step 1 succeeds but Step 2 fails? → Downstream never knows about the order
// What if Step 2 succeeds but Step 1 fails? → Downstream acts on a non-existent order
```

### The Solution: Outbox Table

Write the event to an **outbox table** in the **same database transaction** as the business data. A separate process reads the outbox and publishes to the message broker.

```
┌─────────────────────────────────────────────────────────┐
│                    SAME DATABASE TRANSACTION            │
│                                                         │
│  INSERT INTO orders (id, ...) VALUES (...);             │
│  INSERT INTO outbox (id, event_type, payload)           │
│         VALUES (uuid, 'OrderCreated', '{"order":...}'); │
│                                                         │
│  COMMIT;  ← Both writes succeed or both fail — ATOMIC  │
└─────────────────────────────────────────────────────────┘
           │
           │  Outbox Relay (polling or CDC)
           ▼
┌─────────────────────┐
│  Message Broker     │
│  (Kafka / RabbitMQ) │
└─────────────────────┘
```

### Outbox Table Schema

```sql
CREATE TABLE outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(255) NOT NULL,    -- e.g., 'Order'
    aggregate_id    VARCHAR(255) NOT NULL,    -- e.g., order ID
    event_type      VARCHAR(255) NOT NULL,    -- e.g., 'OrderCreated'
    payload         JSONB NOT NULL,           -- event data
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMP,                -- NULL until published
    retry_count     INT DEFAULT 0
);

CREATE INDEX idx_outbox_unpublished 
    ON outbox (created_at) 
    WHERE published_at IS NULL;
```

### Relay Strategies

#### Option A: Polling Publisher

```python
def outbox_relay():
    while True:
        with db.transaction():
            events = db.query("""
                SELECT * FROM outbox 
                WHERE published_at IS NULL 
                ORDER BY created_at 
                LIMIT 100 
                FOR UPDATE SKIP LOCKED
            """)
            
            for event in events:
                kafka.publish(event.event_type, event.payload)
                db.execute(
                    "UPDATE outbox SET published_at = NOW() WHERE id = %s",
                    event.id
                )
        
        time.sleep(0.1)  # 100ms polling interval
```

#### Option B: CDC-Based Relay (Preferred)

Use Debezium to capture changes from the outbox table via the database WAL — no polling needed.

```
PostgreSQL WAL → Debezium → Kafka Connect → Kafka Topic
```

This is more efficient (no polling overhead) and has lower latency (events published within milliseconds of the commit).

### Outbox Pattern Guarantees

| Guarantee | How |
|-----------|-----|
| **At-least-once delivery** | Relay retries until event is published and marked |
| **Ordering** | Events are published in `created_at` order (per aggregate) |
| **No data loss** | Event is in the same transaction as the business data |
| **Idempotent consumers** | Consumers must handle duplicates (relay may re-publish on crash) |

---

## 🔧 Approach 4: State Machine

Model the multistep process as a **finite state machine** with explicit states and transitions. This makes the process debuggable, recoverable, and auditable.

### Order State Machine

```
                    ┌────────────┐
                    │  CREATED   │
                    └─────┬──────┘
                          │ reserve inventory
                          ▼
                    ┌────────────┐
              ┌─── │ RESERVING  │ ───┐
              │    └────────────┘    │
         reserved              reserve_failed
              │                      │
              ▼                      ▼
        ┌────────────┐         ┌────────────┐
        │  RESERVED  │         │ CANCELLED  │
        └─────┬──────┘         └────────────┘
              │ charge payment
              ▼
        ┌────────────┐
   ┌─── │  CHARGING  │ ───┐
   │    └────────────┘    │
charged              charge_failed
   │                      │
   ▼                      ▼
┌────────────┐      ┌────────────┐
│ CONFIRMED  │      │COMPENSATING│
└─────┬──────┘      └─────┬──────┘
      │ ship                │ release inventory
      ▼                     ▼
┌────────────┐        ┌────────────┐
│  SHIPPED   │        │ CANCELLED  │
└────────────┘        └────────────┘
```

### Implementation

```java
@Entity
public class OrderStateMachine {
    @Id
    private UUID id;
    
    @Enumerated(EnumType.STRING)
    private OrderState state;
    
    @Version
    private Long version;  // Optimistic locking
    
    private Instant lastTransitionAt;
    private String lastError;
    
    public void transition(OrderEvent event) {
        OrderState nextState = TRANSITIONS.get(new StateEvent(state, event));
        
        if (nextState == null) {
            throw new IllegalStateTransition(
                "Cannot apply " + event + " in state " + state
            );
        }
        
        this.state = nextState;
        this.lastTransitionAt = Instant.now();
    }
    
    private static final Map<StateEvent, OrderState> TRANSITIONS = Map.of(
        new StateEvent(CREATED, INVENTORY_RESERVED),     RESERVED,
        new StateEvent(CREATED, INVENTORY_FAILED),       CANCELLED,
        new StateEvent(RESERVED, PAYMENT_CHARGED),       CONFIRMED,
        new StateEvent(RESERVED, PAYMENT_FAILED),        COMPENSATING,
        new StateEvent(COMPENSATING, INVENTORY_RELEASED), CANCELLED,
        new StateEvent(CONFIRMED, SHIPPED),              SHIPPED
    );
}
```

### Why State Machines Matter

| Benefit | How |
|---------|-----|
| **Recoverability** | On restart, read the current state from DB and resume from that point |
| **Visibility** | Dashboard can show exactly where each order is in the process |
| **Debugging** | State transition log provides a complete audit trail |
| **Validation** | Invalid transitions are rejected at the model level |
| **Timeout handling** | A background job can detect orders stuck in a state for too long |

### Stuck State Detection

```sql
-- Find orders stuck in RESERVING for more than 5 minutes
SELECT * FROM orders 
WHERE state = 'RESERVING' 
AND last_transition_at < NOW() - INTERVAL '5 minutes';

-- These orders likely had their inventory service call time out
-- → Retry or compensate
```

---

## 🔧 Approach 5: Workflow Engines (Temporal, Step Functions)

For complex, long-running multistep processes, a **workflow engine** provides durable execution, automatic retries, timeouts, and state management out of the box.

### Temporal Example

```java
@WorkflowInterface
public interface OrderWorkflow {
    @WorkflowMethod
    void processOrder(OrderRequest request);
}

public class OrderWorkflowImpl implements OrderWorkflow {
    
    private final OrderActivities orderActivities = 
        Workflow.newActivityStub(OrderActivities.class, ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(30))
            .setRetryOptions(RetryOptions.newBuilder()
                .setMaximumAttempts(3)
                .setBackoffCoefficient(2.0)
                .build())
            .build());
    
    @Override
    public void processOrder(OrderRequest request) {
        // Each activity call is durable — survives process crashes
        String orderId = orderActivities.createOrder(request);
        
        try {
            orderActivities.reserveInventory(orderId, request.getItems());
            orderActivities.processPayment(orderId, request.getPayment());
            orderActivities.sendConfirmation(orderId);
        } catch (ActivityFailure e) {
            // Compensate all completed steps
            Saga saga = new Saga(new Saga.Options.Builder().build());
            saga.addCompensation(() -> orderActivities.releaseInventory(orderId));
            saga.addCompensation(() -> orderActivities.cancelOrder(orderId));
            saga.compensate();
            throw e;
        }
    }
}
```

### Temporal vs Manual Saga Implementation

| Feature | Manual Saga | Temporal |
|---------|-------------|---------|
| **State persistence** | You build it (DB + state machine) | Built-in (event-sourced) |
| **Retry logic** | You implement backoff, DLQ | Declarative retry policies |
| **Timeout handling** | Background jobs polling for stuck states | Built-in activity timeouts |
| **Crash recovery** | You build replay logic | Automatic replay from event history |
| **Visibility** | You build dashboards | Built-in Web UI with full history |
| **Versioning** | Manual migration of in-flight workflows | Built-in workflow versioning |
| **Complexity** | Medium (for simple flows) | Higher setup cost, lower ongoing cost |

### AWS Step Functions Example

```json
{
  "StartAt": "CreateOrder",
  "States": {
    "CreateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:createOrder",
      "Next": "ReserveInventory",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "OrderFailed"
      }]
    },
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:reserveInventory",
      "TimeoutSeconds": 30,
      "Next": "ProcessPayment",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "ReleaseInventoryCompensation"
      }]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:processPayment",
      "Next": "SendNotification",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "RefundAndRelease"
      }]
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:sendNotification",
      "End": true
    },
    "RefundAndRelease": {
      "Type": "Parallel",
      "Branches": [
        {"StartAt": "RefundPayment", "States": {"RefundPayment": {"Type": "Task", "Resource": "...", "End": true}}},
        {"StartAt": "ReleaseInventory", "States": {"ReleaseInventory": {"Type": "Task", "Resource": "...", "End": true}}}
      ],
      "Next": "CancelOrder"
    },
    "CancelOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:cancelOrder",
      "Next": "OrderFailed"
    },
    "OrderFailed": {
      "Type": "Fail",
      "Error": "OrderProcessingFailed"
    }
  }
}
```

---

## 🛡️ Saga Isolation: Dealing with Dirty Reads

Since Sagas don't hold global locks, intermediate states are visible to other transactions. This can cause problems:

### The Problem

```
Saga 1: Reserve $100 from Account A → Transfer to Account B
Saga 2: Read Account A balance (sees the reserved state)

If Saga 1 later compensates (refunds $100), Saga 2's decisions were based on stale data.
```

### Countermeasures

| Strategy | Description | Example |
|----------|-------------|---------|
| **Semantic locks** | Mark resources as "pending" during saga | `order.status = PENDING` — other sagas skip pending orders |
| **Commutative updates** | Design operations that can be applied in any order | Increment/decrement counters instead of setting absolute values |
| **Pessimistic view** | Reread data before making decisions | Requery inventory before confirming order |
| **Reread value** | Verify data hasn't changed before the final step | Compare version before committing |
| **Version file** | Record operations in a log, apply in order | Event sourcing pattern |

---

## ⚖️ Comparison Matrix

| Approach | Consistency | Availability | Complexity | Best For |
|----------|:-----------:|:------------:|:----------:|----------|
| **2PC** | Strong | Low | Medium | Same-datacenter DB transactions |
| **Saga (Orchestration)** | Eventual | High | Medium | Complex business workflows |
| **Saga (Choreography)** | Eventual | Very High | High (debugging) | Autonomous microservices |
| **Outbox Pattern** | Atomic (local) | High | Low-Medium | Reliable event publishing |
| **State Machine** | N/A (modeling tool) | N/A | Low | Any multistep process |
| **Workflow Engine** | Eventual | High | Low (runtime) | Long-running, complex workflows |

---

## 🧠 Key Takeaways

1. **Avoid 2PC across microservices** — it's a consistency-availability trade-off that rarely makes sense for internet-scale systems
2. **Sagas are the standard pattern** for cross-service transactions — but you must design compensating actions for every step
3. **Orchestration is easier to understand; choreography is easier to scale** — choose based on team structure and complexity
4. **The Transactional Outbox solves the dual-write problem** — never write to a database and a message queue in separate calls without it
5. **State machines make multistep processes debuggable** — you can always answer "where is this order right now?"
6. **Workflow engines (Temporal, Step Functions) are worth the investment** for complex flows — they handle retries, timeouts, and crash recovery so you don't have to
7. **Sagas lack isolation** — use semantic locks, commutative updates, or reread strategies to mitigate dirty reads

:::info Interview Strategy
When asked "How do you handle transactions across microservices?", begin by stating why 2PC is problematic (blocking, availability), then pivot to the Saga pattern. Draw the happy path AND the compensation path. Mention the outbox pattern for reliable event publishing. If asked about complexity, bring up Temporal or Step Functions as a way to tame it.
:::
