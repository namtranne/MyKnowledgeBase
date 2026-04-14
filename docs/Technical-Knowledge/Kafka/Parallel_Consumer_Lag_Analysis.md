---
sidebar_position: 5
title: "Parallel Consumer: The Persistent Lag = 1 Mystery"
---

# Parallel Consumer: The Persistent Lag = 1 Mystery

*A deep investigation into why Confluent's parallel-consumer library always shows consumer lag = 1 per partition — even when all messages have been processed and the topic is idle.*

---

## Background: How Consumer Lag Works in Kafka

Before diving into the parallel-consumer, we need to establish how standard Kafka consumer lag is calculated.

### Key Terms

| Term | Definition |
|------|-----------|
| **Offset** | A sequential, monotonically increasing integer assigned to each record within a partition. Offset 0 is the first record, offset 1 is the second, and so on. |
| **Log End Offset (LEO)** | The offset of the *next* record that will be written to the partition. If the last record has offset 99, LEO = 100. |
| **Committed Offset** | The offset a consumer group has committed to the `__consumer_offsets` internal topic, signaling "I have processed all records before this offset." Committing offset 100 means "my next read should start at offset 100." |
| **Consumer Lag** | `LEO - Committed Offset`. A lag of 0 means the consumer is fully caught up. |
| **`__consumer_offsets`** | A special internal Kafka topic (50 partitions, log-compacted) that stores committed offsets. Each entry is keyed by `(group_id, topic, partition)` and valued with the committed offset. |

### Standard Consumer Offset Commit

In a standard Kafka consumer, the flow is:

```
poll() returns record at offset N
   → consumer POSITION advances to N+1 internally
   → application processes the record
   → commitSync() commits N+1 to __consumer_offsets
   → Lag = LEO - (N+1) = 0 (if no new messages)
```

The critical detail: `commitSync()` with no arguments commits the consumer's **internal position** — which automatically advances past every record returned by `poll()`, including any invisible records like transaction markers (explained below).

---

## What Is the Parallel Consumer?

The [Confluent parallel-consumer](https://github.com/confluentinc/parallel-consumer) is a library that enables concurrent processing of Kafka records *within a single partition*. In standard Kafka, a partition can only be processed by one thread sequentially. The parallel-consumer breaks this constraint by:

1. Polling records from Kafka normally (via a single consumer)
2. Dispatching records to a configurable thread pool for concurrent processing
3. Tracking per-record completion internally (not just per-partition)
4. Committing the highest *sequentially completed* offset back to Kafka

This design introduces a fundamental difference in how offsets are calculated and committed.

---

## Part 1 — Why Lag >= 1 During Active Processing

### The Two-Thread Architecture

The parallel-consumer runs two threads in a loop:

**Thread 1 — Broker Poll Thread** (`BrokerPollSystem.controlLoop`):

```java
// BrokerPollSystem.java, lines 135-148
while (runState != CLOSED) {
    handlePoll();       // Step 1: poll broker, register records as incomplete
    maybeDoCommit();    // Step 2: process any pending commit requests
}
```

**Thread 2 — Main Control Thread** (`AbstractParallelEoSStreamProcessor.controlLoop`):

```java
// AbstractParallelEoSStreamProcessor.java, lines 876-925
processWorkCompleteMailBox(timeToBlockFor);  // receive completed work results
if (shouldTryCommitNow) {
    commitOffsetsThatAreReady();             // trigger a commit
}
retrieveAndDistributeNewWork(userFunction, callback);  // dispatch to workers
```

### The Commit Delegation Chain

When the main control thread decides to commit (line 889), it calls `commitOffsetsThatAreReady()` which calls `committer.retrieveOffsetsAndCommit()`. The `committer` is the `BrokerPollSystem` itself:

```java
// AbstractParallelEoSStreamProcessor.java, lines 310-315
if (options.isUsingTransactionalProducer())
    this.committer = this.producerManager.get();
else
    this.committer = this.brokerPollSubsystem;  // ← for PERIODIC_CONSUMER_SYNC
```

`BrokerPollSystem.retrieveOffsetsAndCommit()` delegates to `ConsumerOffsetCommitter.commit()`, which checks thread ownership:

```java
// ConsumerOffsetCommitter.java, lines 69-81
void commit() throws TimeoutException, InterruptedException {
    if (isOwner()) {
        retrieveOffsetsAndCommit();       // direct commit (broker poll thread)
    } else if (isSync()) {
        commitAndWait();                  // queue-based commit (any other thread)
    } else {
        requestCommitInternal();          // fire-and-forget (async mode)
    }
}
```

The broker poll thread called `claim()` at startup, so it is the owner. When the **main control thread** calls `commit()`, it goes through `commitAndWait()`:

1. Puts a `CommitRequest` into a `ConcurrentLinkedQueue`
2. Calls `consumerMgr.wakeup()` to interrupt the broker poll thread's `poll()`
3. **Blocks** waiting for a `CommitResponse`

The broker poll thread picks up the request in `maybeDoCommit()`, performs the actual commit, and sends back the response. This ensures `consumer.commitSync()` and `consumer.poll()` are always called from the same thread (the broker poll thread), maintaining Kafka's thread-safety requirements.

### How the Committed Offset Is Calculated

The offset to commit is calculated in `PartitionState`:

```java
// PartitionState.java, lines 426-428
protected long getOffsetToCommit() {
    return getOffsetHighestSequentialSucceeded() + 1;
}
```

Where `getOffsetHighestSequentialSucceeded()` is:

```java
// PartitionState.java, lines 454-474
public long getOffsetHighestSequentialSucceeded() {
    long currentOffsetHighestSeen = offsetHighestSucceeded;
    Long firstIncompleteOffset = incompleteOffsets.keySet().ceiling(KAFKA_OFFSET_ABSENCE);
    boolean incompleteOffsetsWasEmpty = firstIncompleteOffset == null;

    if (incompleteOffsetsWasEmpty) {
        return currentOffsetHighestSeen;       // all records complete
    } else {
        return firstIncompleteOffset - 1;      // stop at the gap
    }
}
```

**In words:** find the lowest offset that hasn't been completed yet. The committable offset is one below that. If everything is complete, use the highest succeeded offset.

### Why Lag = 1 During Active Processing

The broker poll loop executes `handlePoll()` **before** `maybeDoCommit()` — always, in the same thread, sequentially. This ordering creates an unavoidable lag:

```
Broker Poll Thread (sequential):

  handlePoll()
    ├─ poll() returns record at offset N     (LEO = N+1)
    ├─ registerWork()
    │     └─ incompleteOffsets.put(N, ...)    ← N is now INCOMPLETE
    ▼
  maybeDoCommit()
    ├─ getOffsetHighestSequentialSucceeded()
    │     └─ firstIncompleteOffset = N       ← sees N as incomplete!
    │     └─ returns N - 1
    ├─ getOffsetToCommit() = (N-1) + 1 = N
    └─ commitSync( offset = N )

  Lag = LEO - committed = (N+1) - N = 1     ← always at least 1
```

The polled record is added to `incompleteOffsets` **immediately** upon polling:

```java
// PartitionState.java, lines 328-333
public void addNewIncompleteRecord(ConsumerRecord<K, V> record) {
    long offset = record.offset();
    maybeRaiseHighestSeenOffset(offset);
    incompleteOffsets.put(offset, Optional.of(record));
}
```

This happens before `maybeDoCommit()` can run. The commit therefore always sees the just-polled record as incomplete, producing lag >= 1.

When the consumer is keeping up (fast processing, low throughput per partition), all *previous* records are already complete by the time the next commit fires. Only the most recently polled record is incomplete — giving lag = **exactly 1**.

---

## Part 2 — Why Lag Persists at 1 Even When Idle

This is where it gets subtle. When the topic is completely idle (no new messages, all records processed), the code *should* produce lag = 0:

1. All records are processed → `onSuccess()` removes them from `incompleteOffsets`
2. `incompleteOffsets` is empty
3. `getOffsetHighestSequentialSucceeded()` returns `offsetHighestSucceeded` = N (the last record)
4. `getOffsetToCommit()` = N + 1
5. LEO = N + 1
6. Lag = 0

**But in practice, lag remains at 1.** The root cause is **transaction markers**.

### What Are Transaction Markers?

A **transaction marker** is a special control record that Kafka writes to a partition when a transactional producer commits or aborts a transaction. It is a real record with a real offset, but it is **invisible** to consumers — `consumer.poll()` never returns it.

```
How a transactional producer writes records:

  1. producer.beginTransaction()
  2. producer.send(record)          → written at offset N
  3. producer.commitTransaction()   → COMMIT marker written at offset N+1
                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      This is a real record with offset N+1,
                                      but consumers never see it.
  4. LEO = N + 2
```

Transaction markers exist for two types of events:
- **COMMIT marker**: written when `commitTransaction()` is called, signaling that all records in the transaction are valid and should be visible to `read_committed` consumers
- **ABORT marker**: written when `abortTransaction()` is called (or the transaction times out), signaling that all records in the transaction should be discarded by `read_committed` consumers

Both types consume a real offset in the partition log, but neither is ever delivered to a consumer via `poll()`.

### How Transaction Markers Cause Persistent Lag = 1

When the producer writing to your input topic is **transactional**, the partition looks like this:

```
Offset:  95    96    97     98       99
         [msg] [msg] [msg]  [msg]    [COMMIT marker]
                                     ^^^^^^^^^^^^^^^^
                                     invisible to consumer.poll()
LEO = 100
```

**Standard consumer behavior:**

```
poll() returns records at offsets 95-98
Consumer POSITION automatically advances to 100 (skips marker at 99)
commitSync() commits 100
Lag = LEO(100) - 100 = 0  ✓
```

The standard consumer commits its **internal position**, which automatically accounts for invisible records. The consumer never needs to know about the marker — the Kafka client handles it transparently.

**Parallel-consumer behavior:**

```
poll() returns records at offsets 95-98
addNewIncompleteRecord() for each: offsetHighestSeen = 98
All records processed: offsetHighestSucceeded = 98
getOffsetToCommit() = 98 + 1 = 99
Lag = LEO(100) - 99 = 1  ✗  (permanent!)
```

The parallel-consumer calculates its commit offset using `offsetHighestSucceeded + 1`, which is based entirely on the **record offsets it has seen**. It has no knowledge of the invisible COMMIT marker at offset 99. It commits offset 99 thinking "the next record to fetch is 99," but offset 99 is a marker that will be skipped — the *real* next fetchable record would be at offset 100.

The committed offset can *never* reach 100 because:
- The marker at offset 99 is never delivered as a `ConsumerRecord`
- It is never added to `incompleteOffsets`
- `onSuccess()` is never called for it
- `offsetHighestSucceeded` permanently stays at 98
- `getOffsetToCommit()` permanently returns 99

The parallel-consumer source code acknowledges this gap in the `offsetHighestSucceeded` field's Javadoc:

```java
// PartitionState.java, lines 128-132
/**
 * Highest offset which has completed successfully ("succeeded").
 *
 * Note that this may in some conditions, there may be a gap between
 * this and the next offset to poll - that being, there may be some
 * number of transaction marker records above it, and the next offset
 * to poll.
 */
```

And in the `OffsetSimultaneousEncoder`, there is explicit logic to detect and jump over these gaps — but only for the **encoding** of incomplete offset metadata, not for the committed offset value itself:

```java
// OffsetSimultaneousEncoder.java, lines 134-148
private long maybeRaiseOffsetHighestSucceeded(long baseOffsetToCommit,
                                               long highestSucceededOffset) {
    long nextExpectedMinusOne = baseOffsetToCommit - 1;
    boolean gapLargerThanOne = highestSucceededOffset < nextExpectedMinusOne;
    if (gapLargerThanOne) {
        long gap = nextExpectedMinusOne - highestSucceededOffset;
        log.debug("Gap detected in partition (highest succeeded: {} while "
            + "next expected poll offset: {} - gap is {}), probably tx markers.",
            highestSucceededOffset, nextExpectedMinusOne, gap);
        highestSucceededOffset = nextExpectedMinusOne;
    }
    return highestSucceededOffset;
}
```

This fix (from [GitHub issue #329](https://github.com/confluentinc/parallel-consumer/issues/329)) prevents the encoder from crashing when it encounters offset gaps caused by transaction markers. But it does **not** fix the lag calculation — the committed offset still stops one short of where it should be.

---

## Summary: Two Distinct Causes of Lag = 1

| Scenario | Cause | Duration | Lag Value |
|----------|-------|----------|-----------|
| Active processing (consumer keeping up) | The broker poll loop always registers new incomplete records *before* committing | Transient — disappears when topic goes idle | Exactly 1 per partition |
| Idle topic, all records processed | Transaction markers occupy invisible offsets that the parallel-consumer cannot commit past | **Permanent** — never resolves | Exactly 1 per partition (per trailing transaction) |

### Why Exactly 1 (Not 2 or 3)?

- **During active processing:** When the consumer is fast and throughput is low, each poll cycle returns only ~1 new record per partition. All *previous* records are already complete. Only the just-polled record is incomplete → lag = 1.
- **When idle with transaction markers:** Each Kafka transaction adds exactly **one** COMMIT marker per partition. If the last batch of records was produced in a single transaction, there is exactly one invisible marker → lag = 1. Two back-to-back transactions would give lag = 2, and so on.

### Standard Consumer vs Parallel Consumer

| Behavior | Standard Consumer | Parallel Consumer |
|----------|-------------------|-------------------|
| What is committed | Consumer's internal **position** (advances past all polled records, including invisible markers) | `offsetHighestSucceeded + 1` (calculated from visible records only) |
| Minimum lag when active | 0 (commits after processing) | 1 (polls before committing) |
| Lag when idle (no tx markers) | 0 | 0 |
| Lag when idle (with tx markers) | 0 | **1 per trailing transaction marker** |

---

## How to Verify

### 1. Check if the input topic has transactional producers

Look at the producer configuration of the upstream service writing to your input topic. If it sets `transactional.id`, it is a transactional producer and will write COMMIT markers.

### 2. Inspect the topic for offset gaps

```bash
# Consume with read_uncommitted to see ALL records including markers
kafka-console-consumer --bootstrap-server <broker> \
  --topic <your-topic> \
  --from-beginning \
  --isolation-level read_uncommitted \
  --property print.offset=true \
  --timeout-ms 10000
```

Compare the highest visible offset against the LEO:

```bash
# Get the LEO for each partition
kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list <broker> \
  --topic <your-topic> \
  --time -1
```

If LEO is higher than the highest visible consumer offset + 1, transaction markers (or aborted records) occupy the gap.

### 3. Check the committed offset directly

```bash
kafka-consumer-groups --bootstrap-server <broker> \
  --group <your-consumer-group> \
  --describe
```

Look at the `CURRENT-OFFSET`, `LOG-END-OFFSET`, and `LAG` columns. If lag = 1 and the topic is idle, this confirms the issue.

---

## Impact Assessment

**Is this harmful?** No. The lag = 1 is a cosmetic artifact. The consumer has processed every real message. The "missing" offset is a transaction marker that contains no user data. No messages are lost or unprocessed.

**Should you alert on it?** If you have consumer lag alerting, set the threshold to **> 1** (not > 0) when using the parallel-consumer with transactionally-produced input topics.

**Can it be fixed?** The parallel-consumer would need to use the Kafka consumer's internal position (via `consumer.position(partition)`) as the commit offset instead of calculating it from `offsetHighestSucceeded + 1`. This would require a change in the library itself.

---

## Appendix: Complete Code Trace

For reference, here is the full chain from poll to commit:

```
BrokerPollSystem.controlLoop()                          [Broker Poll Thread]
  └─ handlePoll()
       └─ pollBrokerForRecords()
            └─ consumerManager.poll(2000ms)             ← blocks up to 2s
       └─ pc.registerWork(polledRecords)
            └─ WorkManager.registerWork()
                 └─ PartitionStateManager.maybeRegisterNewRecordAsWork()
                      └─ PartitionState.maybeRegisterNewPollBatchAsWork()
                           └─ addNewIncompleteRecord()
                                └─ incompleteOffsets.put(offset, record)
  └─ maybeDoCommit()
       └─ CommitRequest found in queue?
            └─ AbstractOffsetCommitter.retrieveOffsetsAndCommit()
                 └─ WorkManager.collectCommitDataForDirtyPartitions()
                      └─ PartitionState.getCommitDataIfDirty()
                           └─ createOffsetAndMetadata()
                                └─ getOffsetToCommit()
                                     └─ getOffsetHighestSequentialSucceeded() + 1
                 └─ ConsumerOffsetCommitter.commitOffsets()
                      └─ consumerMgr.commitSync(offsets)
                 └─ onOffsetCommitSuccess()
                      └─ PartitionState.onOffsetCommitSuccess()
                           └─ lastCommittedOffset = committed.offset()
                           └─ setClean()

AbstractParallelEoSStreamProcessor.controlLoop()        [Main Control Thread]
  └─ processWorkCompleteMailBox()                       ← receives completed work
  └─ commitOffsetsThatAreReady()
       └─ committer.retrieveOffsetsAndCommit()
            └─ BrokerPollSystem.retrieveOffsetsAndCommit()
                 └─ ConsumerOffsetCommitter.commit()
                      └─ commitAndWait()                ← puts request in queue
                           └─ CommitRequest → queue     ← blocks for response
                           └─ consumerMgr.wakeup()      ← wakes broker poll thread
  └─ retrieveAndDistributeNewWork()                     ← dispatches to workers

Worker Thread Pool                                      [Worker Threads]
  └─ userFunction.apply(record)
       └─ on success:
            └─ PartitionState.onSuccess(offset)
                 └─ incompleteOffsets.remove(offset)
                 └─ updateHighestSucceededOffsetSoFar(offset)
                 └─ setDirty()
```

Default configuration values:

| Config | Default | Description |
|--------|---------|-------------|
| `commitInterval` | 5000ms | Time between periodic commits |
| `longPollTimeout` | 2000ms | Max time the broker poll thread blocks in `poll()` |
| `maxConcurrency` | configurable | Number of concurrent worker threads |
