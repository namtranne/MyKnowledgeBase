---
sidebar_position: 6
title: "Kafka Streams — Safely Changing Topologies"
---

# Kafka Streams — Safely Changing Topologies

A practical guide to modifying Kafka Streams topologies in production without causing **rebalance storms**, **TopologyExceptions**, or service outages. Based on a real incident in `ms-pymt-status-publisher`.

---

## The Problem

Kafka Streams topologies are **not hot-swappable**. Unlike stateless HTTP services where you can freely add or remove endpoints, a Kafka Streams topology defines:

1. **Which topics** the application subscribes to (source nodes)
2. **Which processors** transform the data (processor nodes)
3. **Which state stores** each processor accesses
4. **Which topics** the application writes to (sink nodes)

Changing any of these during a rolling deployment — where old and new pods coexist — can cause two distinct failures:

| Failure | Cause | Symptom |
|---------|-------|---------|
| **TopologyException** | A state store is connected to a processor that doesn't exist | `Application run failed` — instant crash on startup |
| **Rebalance Storm** | Old and new pods disagree on which topics to subscribe to | Infinite re-join loop → health check failure → container killed |

Both are fatal. The service never reaches a healthy state.

---

## Understanding the Kafka Streams Partition Assignor

To understand why topology changes are dangerous, you need to understand how Kafka Streams assigns partitions.

### Normal Operation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Consumer Group                               │
│                                                                 │
│  Pod A (subscription: [topicA, topicB, topicC])                 │
│  Pod B (subscription: [topicA, topicB, topicC])                 │
│  Pod C (subscription: [topicA, topicB, topicC])                 │
│                                                                 │
│  StreamsPartitionAssignor:                                      │
│  ✅ All members agree on subscriptions                          │
│  → Assign partitions evenly across A, B, C                     │
│  → All pods process their assigned partitions                   │
└─────────────────────────────────────────────────────────────────┘
```

All pods have **identical topologies**, so they subscribe to the **same topics**. The `StreamsPartitionAssignor` distributes partitions evenly. Everything works.

### After a Topology Change (Rolling Deployment)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Consumer Group                               │
│                                                                 │
│  Pod A (OLD — subscription: [topicA, topicB, topicC])           │
│  Pod B (NEW — subscription: [topicA, topicB])  ← topicC gone   │
│  Pod C (NEW — subscription: [topicA, topicB])  ← topicC gone   │
│                                                                 │
│  StreamsPartitionAssignor:                                      │
│  ⚠️  Members disagree! Pod A subscribes to topicC,             │
│      but Pods B and C don't.                                    │
│  → Assigns topicC partitions to Pod B anyway                    │
│  → Pod B rejects: "assignment doesn't match subscription"       │
│  → Pod B requests re-join                                       │
│  → Triggers ANOTHER rebalance                                   │
│  → Infinite loop until health checks fail                       │
│                                                                 │
│  ❌ REBALANCE STORM                                             │
└─────────────────────────────────────────────────────────────────┘
```

The `StreamsPartitionAssignor` creates a **global assignment** across all subscribed topics from all members. When Pod B receives partitions for `topicC` (which it doesn't subscribe to), it logs:

```
Assigned partition topicC-0 for non-subscribed topic;
subscription is [topicA, topicB]
```

...and immediately requests to re-join the group. This triggers another rebalance, which produces the same mismatch, ad infinitum.

---

## Failure 1: TopologyException

### What Happens

Kafka Streams topologies have two phases:

1. **Topology construction** — `StreamsBuilder` builds the DAG of source → processor → sink nodes
2. **Infrastructure customization** — `KafkaStreamsInfrastructureCustomizer` connects processors to state stores

If you comment out a processor in phase 1 but forget to update phase 2, the customizer tries to connect a state store to a processor that doesn't exist:

```java
// Phase 1: Processor is NOT added (commented out)
// statusTransformerSupplier::getWorkflowTransfer is never called
// → Processor "WorkflowProcessorCommand" does not exist in topology

// Phase 2: Customizer still tries to connect it
topology.connectProcessorAndStateStores(
    "WorkflowProcessorCommand",   // ← doesn't exist!
    TLM_STATUS_STATE_STORE
);
```

### The Exception

```
org.apache.kafka.streams.errors.TopologyException:
  Invalid topology: Processor WorkflowProcessorCommand is not added yet.
    at InternalTopologyBuilder.connectProcessorAndStateStore(...)
    at Topology.connectProcessorAndStateStores(...)
    at PaymentStatusPublisherInfraCustomizers$1.configureTopology(...)
```

### The Fix

**Always keep the topology construction and the infrastructure customizer in sync.** If you comment out a processor, comment out its corresponding `connectProcessorAndStateStores` call.

```java
// ✅ CORRECT: Both are commented out together
// topology.connectProcessorAndStateStores(COMMAND_PROCESSOR_NAME, TLM_STATUS_STATE_STORE);

// ❌ WRONG: Processor removed but connection still exists
topology.connectProcessorAndStateStores(COMMAND_PROCESSOR_NAME, TLM_STATUS_STATE_STORE);
```

---

## Failure 2: Rebalance Storm

### What Happens

When you comment out a `builder.stream(topic, ...)` call, the topology no longer subscribes to that topic. During a rolling deployment:

1. Old pods still subscribe to the full set of topics
2. New pods subscribe to a reduced set
3. The `StreamsPartitionAssignor` assigns partitions from the old topic set to new pods
4. New pods reject the assignment ("non-subscribed topic")
5. Pods request re-join → another rebalance → same mismatch → infinite loop

### The Log Signature

```
SubscriptionState: Assigned partition payments.tlm.payment-timeout-event-v1.sandbox-0
  for non-subscribed topic; subscription is [
    payments.tlm.payment-enrichment-command-v2.sandbox,
    payments.tlm.payment-internal-command-generic-v1.sandbox,
    ...
  ]

ConsumerCoordinator: Request joining group due to: received assignment
  [...payment-timeout-event-v1.sandbox-0...] does not match the current subscription
  Subscribe(...); it is likely that the subscription has changed since we joined
  the group, will re-join with current subscription

ConsumerCoordinator: (Re-)joining group
```

This pattern repeats every ~3 seconds across all stream threads until the container fails health checks and is killed.

### The Fix

**Keep all source topic subscriptions, even if you're not processing them.** Comment out the *processing* but leave the *subscription* intact.

```java
// ✅ CORRECT: Subscribe to the topic (keep this)
final var timeoutEventStream = topologyBuilder.paymentTimeoutEventStream(builder);
// Don't process it (comment out this)
// topologyBuilder.processPaymentTimeoutEventStream(timeoutEventStream);

// ❌ WRONG: Remove both subscription AND processing
// final var timeoutEventStream = topologyBuilder.paymentTimeoutEventStream(builder);
// topologyBuilder.processPaymentTimeoutEventStream(timeoutEventStream);
```

When you keep the subscription:
- The topology still subscribes to the same set of topics
- The `StreamsPartitionAssignor` produces consistent assignments
- Records from the unused topics are consumed and offsets committed, but no processing occurs
- No rebalance storm during rolling deployments

---

## The Two-Layer Rule

When modifying a Kafka Streams topology, always think in two layers:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Topic Subscriptions (source nodes)                     │
│                                                                 │
│   builder.stream(topic, ...)  →  Creates a source node          │
│                                                                 │
│   🔒 NEVER remove during a rolling deployment.                  │
│      Keep subscribing even if you stop processing.              │
│      Remove ONLY after ALL pods are on the new topology         │
│      AND a full consumer group reset is planned.                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Processors + State Store Connections                   │
│                                                                 │
│   .transform(supplier, Named.as("ProcessorName"), stateStore)   │
│   topology.connectProcessorAndStateStores("ProcessorName", ...) │
│                                                                 │
│   🔒 ALWAYS modify together.                                    │
│      If you remove a .transform(), also remove the              │
│      corresponding connectProcessorAndStateStores() call.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Safe Topology Change Checklist

Before deploying a topology change:

- [ ] **Source nodes preserved?** — Every `builder.stream(topic)` call from the old topology still exists (even if the processing is removed)
- [ ] **Processors and state store connections in sync?** — Every `connectProcessorAndStateStores()` call has a matching `Named.as()` processor in the topology
- [ ] **No orphaned state store connections?** — No `connectProcessorAndStateStores()` for processors that were removed
- [ ] **Test with `TopologyTestDriver`?** — Run topology tests to verify the topology builds without exceptions
- [ ] **Rolling deployment safe?** — Old and new topologies subscribe to the exact same set of topics
- [ ] **Consumer group compatible?** — If subscriptions must change, plan a full deployment (not rolling) with consumer group coordination

---

## Real-World Example: ms-pymt-status-publisher

### Context

The `ms-pymt-status-publisher` service was being migrated from a "direct processing" model (each topic processed independently) to an "internal topology" model (all events forwarded to an internal topic, then processed centrally via `StatusPublisherInternalTopologyBuilder`).

### What Was Changed

In `StatusPublisherTopology.buildTopology()`, many topology builder calls were commented out:

```java
// BEFORE: 20+ topics subscribed, each with its own processing pipeline
final var operationEventStream = topologyBuilder.operationEventStream(builder);
final var paymentStatusUpdatedStream = topologyBuilder.paymentStatusUpdatedStream(builder);
final var timeoutEventStream = topologyBuilder.paymentTimeoutEventStream(builder);
// ... and their processing methods
topologyBuilder.getOperationPaymentStatusWrapper(operationEventStream);
topologyBuilder.processPaymentTimeoutEventStream(timeoutEventStream);

// AFTER (incorrect): Both subscription AND processing commented out
// final var operationEventStream = topologyBuilder.operationEventStream(builder);
// final var timeoutEventStream = topologyBuilder.paymentTimeoutEventStream(builder);
// topologyBuilder.getOperationPaymentStatusWrapper(operationEventStream);
// topologyBuilder.processPaymentTimeoutEventStream(timeoutEventStream);
```

### What Broke

**First deployment attempt — TopologyException:**

`PaymentStatusPublisherInfraCustomizers.configureTopology()` still called `connectProcessorAndStateStores()` for all 13+ processors that no longer existed. The service crashed immediately on startup.

**Second deployment attempt (after fixing customizer) — Rebalance Storm:**

The topology no longer subscribed to ~8 topics (timeout events, operation status, payment status updated, enrichment, business events, SPSE rejection, etc.). During rolling deployment, old pods still subscribed to these topics, causing the `StreamsPartitionAssignor` to assign their partitions to new pods. New pods rejected the assignment → infinite rebalance loop → health check failure → container killed.

### What Broke — Three Distinct Failures

**Attempt 1 — TopologyException (processor not found):**

`PaymentStatusPublisherInfraCustomizers.configureTopology()` still called `connectProcessorAndStateStores()` for all 13+ processors that no longer existed. The service crashed immediately on startup.

**Attempt 2 (after fixing customizer) — Rebalance Storm:**

The topology no longer subscribed to ~8 topics. During rolling deployment, old pods still subscribed to these topics, causing the `StreamsPartitionAssignor` to assign their partitions to new pods. New pods rejected the assignment → infinite rebalance loop → health check failure.

**Attempt 3 (after adding back orphaned source subscriptions) — Topology Optimization Conflict:**

We tried keeping `builder.stream(topic)` calls without downstream processing. But `topology.optimization: all` **pruned the orphaned source nodes** since they had no sinks. The optimizer restructured the sub-topologies, creating a different sub-topology layout than what the old consumer group metadata expected. The partition assignor assigned partitions from pruned topics to tasks in the wrong sub-topology:

```
TopologyException: Invalid topology: Topic payments.tlm.payment-opsp-internal-event-v2.sandbox
  is unknown to the topology. This may happen if different KafkaStreams instances of the same
  application execute different Topologies.
```

Even the actively-used internal event topic was affected because the optimizer placed it in a different sub-topology than what the old consumer group's task metadata expected.

### The Correct Fix

When `topology.optimization: all` is enabled, the only safe approach for a topology change that removes subscriptions is:

1. **Remove all orphaned sources** — they're pruned by the optimizer anyway
2. **Change the `application.id`** — forces a new consumer group with no stale metadata

```java
// ✅ Only keep streams that are actively processed
final var commandEventStream = topologyBuilder.commandEventStream(builder);
topologyBuilder.processCommandToInternalStream(commandEventStream);
topologyBuilder.processPsrCommandStream(commandEventStream);

final var commandEventV2Stream = topologyBuilder.commandEventV2Stream(builder);
topologyBuilder.forwardToV1InternalCommand(commandEventV2Stream);

final var tlmInternalEventStream = internalTopologyBuilder.internalTlmEventStream(builder);
internalTopologyBuilder.processInternalEventStream(tlmInternalEventStream);

// ❌ Don't add orphaned sources — the optimizer prunes them,
//    which changes the sub-topology structure
// final var timeoutEventStream = topologyBuilder.paymentTimeoutEventStream(builder);
```

```yaml
# application-sandbox.yml — new application.id to bypass stale consumer group
kafka:
  streams:
    application-id: payments.stream.tlm.outbound-payment-status-publisher.v2.sandbox
```

---

## Failure 3: Topology Optimization Conflict (Deep Dive)

### The `topology.optimization: all` Trap

When `topology.optimization: all` (or `StreamsConfig.OPTIMIZE`) is enabled, Kafka Streams applies several optimizations during `StreamsBuilder.build()`:

- **Merges repartition topics** — reduces internal topics
- **Reuses source topic changelogs** — avoids duplicate changelog topics
- **Prunes unused nodes** — removes source nodes with no downstream processing

The third optimization is the trap. If you add `builder.stream(topic)` but never chain any operations on the returned `KStream`, the optimizer removes the source node entirely:

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE optimization:                                            │
│                                                                 │
│  Sub-topology 0:                                                │
│    Source: topicA → Processor → Sink                            │
│    Source: topicB (orphaned, no downstream)                     │
│    Source: topicC (orphaned, no downstream)                     │
│                                                                 │
│ AFTER optimization:                                             │
│                                                                 │
│  Sub-topology 0:                                                │
│    Source: topicA → Processor → Sink                            │
│    (topicB and topicC PRUNED — not in topology at all)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Causes "Unknown Topic" Errors

The optimized topology has a different sub-topology structure than the old topology. When the new instance joins the same consumer group:

1. The consumer group coordinator still has task assignment metadata from the old topology
2. The old metadata maps partitions to sub-topologies using the OLD layout
3. The new instance creates tasks based on the NEW layout
4. Partitions from topics in sub-topology X (old layout) end up in tasks for sub-topology Y (new layout)
5. Sub-topology Y doesn't know about those topics → `TopologyException`

This can affect even ACTIVE topics (like `payment-opsp-internal-event-v2`) if the optimizer moved them to a different sub-topology number.

### The Only Safe Approach with Optimization Enabled

When `topology.optimization: all` is enabled and you need to change the topology structure:

```
Option A: Change application.id
  ✅ New consumer group = no stale metadata
  ⚠️  Loses committed offsets (starts from auto.offset.reset)
  ⚠️  Orphans old internal topics (changelog, repartition)

Option B: Disable optimization temporarily
  ✅ Keeps orphaned source nodes in topology
  ⚠️  May change sub-topology structure vs optimized version
  ⚠️  Still needs careful deployment

Option C: Full stop-and-restart
  ✅ All instances start clean with the new topology
  ⚠️  Brief downtime during restart
  ⚠️  Stale consumer group metadata may still cause issues
       (combine with application.id change for safety)
```

For production deployments, **Option A** (new `application.id`) is the safest. Use a versioned suffix like `.v2` and revert it after stabilization.

---

## Safe Topology Change Checklist

Before deploying a topology change:

- [ ] **Is `topology.optimization` enabled?** — If `all` or `StreamsConfig.OPTIMIZE`, orphaned source nodes will be pruned. Don't rely on keeping subscriptions without processing.
- [ ] **Processors and state store connections in sync?** — Every `connectProcessorAndStateStores()` call has a matching `Named.as()` processor in the topology
- [ ] **No orphaned state store connections?** — No `connectProcessorAndStateStores()` for processors that were removed
- [ ] **Sub-topology structure changed?** — If topics moved between sub-topologies, you MUST use a new `application.id` or do a full consumer group reset
- [ ] **Test with `TopologyTestDriver`?** — Run topology tests to verify the topology builds without exceptions
- [ ] **Consumer group clean?** — If changing `application.id`, verify the old consumer group and internal topics are cleaned up after stabilization

---

## Key Takeaways

1. **`topology.optimization: all` prunes unused source nodes.** You cannot keep topic subscriptions by adding `builder.stream(topic)` without downstream processing — the optimizer removes them.

2. **Processors and state store connections are tightly coupled.** Removing one without the other causes `TopologyException`.

3. **Topology changes alter sub-topology structure.** Even if you only remove processing (not subscriptions), the optimizer may restructure sub-topologies, causing partition assignment conflicts with stale consumer group metadata.

4. **The safe migration pattern with optimization enabled:** remove all orphaned code cleanly + change the `application.id` to start with a fresh consumer group.

5. **Never assume a topology change is safe.** Always verify with `TopologyTestDriver`, consider the deployment strategy, and check whether `topology.optimization` is enabled.
