---
sidebar_position: 7
title: "06 — Managing Long-Running Tasks"
---

# ⏳ Managing Long-Running Tasks

Some operations take minutes, hours, or even days: video transcoding, report generation, data migrations, ML model training, batch imports. These cannot complete within a single HTTP request-response cycle, and they introduce unique challenges around reliability, visibility, and resource management.

---

## 🔍 The Core Problem

Long-running tasks are different from regular request processing in every dimension:

| Challenge | Why It's Hard |
|-----------|--------------|
| **Duration** | HTTP timeouts, load balancer limits, connection drops |
| **Failure** | A 2-hour task that fails at 1h59m must be recoverable |
| **Visibility** | Users need to know progress and estimated completion time |
| **Resource management** | Tasks consume CPU/memory for extended periods — must not starve the system |
| **Ordering** | Some tasks depend on others, creating complex dependency graphs |
| **Cancellation** | Users may cancel a task mid-execution — must clean up gracefully |
| **Idempotency** | Retried tasks must not produce duplicate side effects |
| **Scaling** | Adding workers should distribute tasks without double-processing |
| **Prioritization** | Urgent tasks should preempt or skip ahead of bulk operations |

### Examples of Long-Running Tasks

| Domain | Task | Duration | Failure Impact |
|--------|------|----------|---------------|
| **Media** | Video transcoding (4K, multiple formats) | 10-60 minutes | Re-upload required |
| **Data** | Database migration (100M rows) | 1-8 hours | Partial migration, data inconsistency |
| **Finance** | End-of-day settlement processing | 2-4 hours | Regulatory violation |
| **ML** | Model training on large datasets | Hours-days | Wasted compute ($$$) |
| **E-commerce** | Product catalog bulk import (100K items) | 30-120 minutes | Incomplete catalog |
| **Analytics** | Report generation across billions of rows | 5-30 minutes | User waits, timeout |
| **DevOps** | Infrastructure provisioning (Terraform) | 5-30 minutes | Partial infrastructure |

---

## 🔧 Approach 1: Async Task Queue with Worker Pools

The fundamental pattern: decouple task submission from task execution using a message queue.

### Architecture

```
┌──────────┐     Submit task     ┌─────────────┐     Claim task     ┌──────────────┐
│   API    │ ─────────────────► │   Message   │ ─────────────────► │   Worker     │
│  Server  │                    │    Queue    │                    │   Pool       │
│          │ ◄── task_id ────── │ (RabbitMQ / │                    │              │
└──────────┘                    │  SQS / Redis│                    │  Worker 1    │
     │                          │  Streams)   │                    │  Worker 2    │
     │                          └─────────────┘                    │  Worker 3    │
     │                                                             │  ...         │
     │  Poll status                                                └──────┬───────┘
     │                                                                    │
     ▼                                                                    │
┌──────────┐                                                              │
│  Status  │ ◄──── Progress updates ──────────────────────────────────────┘
│  Store   │
│ (Redis/DB│
└──────────┘
```

### Task Lifecycle

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  PENDING   │────►│  CLAIMED   │────►│  RUNNING   │────►│ COMPLETED  │
└────────────┘     └────────────┘     └──────┬─────┘     └────────────┘
                        │                    │
                        │              ┌─────┴──────┐
                   claim_timeout       │            │
                        │              ▼            ▼
                        ▼         ┌────────┐  ┌──────────┐
                   ┌────────┐    │ FAILED  │  │CANCELLED │
                   │PENDING │    │(retry?) │  │          │
                   │(re-queue)   └────┬────┘  └──────────┘
                   └────────┘         │
                                      ▼
                                 ┌──────────┐
                                 │  DEAD    │
                                 │ LETTER   │
                                 └──────────┘
```

### Implementation

```python
# Task submission (API server)
@app.post("/api/reports")
async def create_report(request: ReportRequest):
    task_id = str(uuid.uuid4())
    
    # Store initial task state
    await task_store.create(task_id, {
        "status": "PENDING",
        "type": "report_generation",
        "params": request.dict(),
        "submitted_at": datetime.utcnow().isoformat(),
        "progress": 0,
    })
    
    # Enqueue the task
    await queue.publish("tasks.reports", {
        "task_id": task_id,
        "params": request.dict(),
    })
    
    # Return immediately with task ID
    return {"task_id": task_id, "status_url": f"/api/tasks/{task_id}"}


# Task status polling (API server)
@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = await task_store.get(task_id)
    return {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
        "result_url": task.get("result_url"),
        "error": task.get("error"),
        "started_at": task.get("started_at"),
        "completed_at": task.get("completed_at"),
    }


# Worker (separate process)
class ReportWorker:
    async def process(self, message):
        task_id = message["task_id"]
        
        try:
            await self.update_status(task_id, "RUNNING", progress=0)
            
            # Phase 1: Query data (40% of work)
            data = await self.query_data(message["params"])
            await self.update_status(task_id, "RUNNING", progress=40)
            
            # Phase 2: Process data (40% of work)
            result = await self.process_data(data)
            await self.update_status(task_id, "RUNNING", progress=80)
            
            # Phase 3: Upload result (20% of work)
            url = await self.upload_result(result)
            await self.update_status(task_id, "COMPLETED", progress=100, result_url=url)
            
        except CancelledException:
            await self.update_status(task_id, "CANCELLED")
            await self.cleanup(task_id)
            
        except Exception as e:
            await self.update_status(task_id, "FAILED", error=str(e))
            raise  # Let the queue handle retry
```

### Queue Technology Comparison

| Queue | Delivery Guarantee | Delayed/Scheduled | Priority | Best For |
|-------|:-----------------:|:-----------------:|:--------:|---------|
| **RabbitMQ** | At-least-once | Plugin | Yes | Traditional task queues |
| **Amazon SQS** | At-least-once | Yes (up to 15min) | Yes (2 levels) | AWS-native, serverless |
| **Redis Streams** | At-least-once | No (manual) | No | Low-latency, simple |
| **Kafka** | At-least-once / Exactly-once | No | No | High-throughput pipelines |
| **Celery** | At-least-once | Yes | Yes | Python ecosystem |
| **BullMQ** | At-least-once | Yes | Yes | Node.js ecosystem |

---

## 🔧 Approach 2: Retry Strategies

Long-running tasks fail — networks time out, services go down, resources run out. A robust retry strategy is essential.

### Retry Policies

#### Fixed Interval

```
Attempt 1: fail → wait 5s
Attempt 2: fail → wait 5s
Attempt 3: fail → wait 5s
Attempt 4: success ✓
```

**Problem:** Doesn't adapt to the failure cause. If the downstream service is overloaded, constant retries make it worse.

#### Exponential Backoff

```
Attempt 1: fail → wait 1s
Attempt 2: fail → wait 2s
Attempt 3: fail → wait 4s
Attempt 4: fail → wait 8s
Attempt 5: fail → wait 16s (cap at 30s)
Attempt 6: success ✓
```

**Better:** Gives the failing service time to recover. But all retrying clients synchronize their retries (thundering herd).

#### Exponential Backoff with Jitter

```
Attempt 1: fail → wait 1s + random(0, 1s)   = 1.4s
Attempt 2: fail → wait 2s + random(0, 2s)   = 3.1s
Attempt 3: fail → wait 4s + random(0, 4s)   = 5.7s
Attempt 4: fail → wait 8s + random(0, 8s)   = 11.2s
Attempt 5: success ✓
```

**Best for most cases:** Prevents synchronized retries and spreads load evenly.

```python
import random
import math

def calculate_backoff(attempt, base=1, max_delay=60):
    """Exponential backoff with full jitter"""
    exp_delay = min(base * (2 ** attempt), max_delay)
    return random.uniform(0, exp_delay)

def calculate_backoff_decorrelated(attempt, base=1, max_delay=60, prev_delay=None):
    """Decorrelated jitter — better spread than full jitter"""
    if prev_delay is None:
        prev_delay = base
    delay = random.uniform(base, prev_delay * 3)
    return min(delay, max_delay)
```

### Dead Letter Queues (DLQ)

After exhausting all retry attempts, messages move to a Dead Letter Queue for manual inspection and replay.

```
Main Queue → Worker
    │
    ├── Success → ACK (remove from queue)
    ├── Fail (attempt 1) → NACK → re-queue with delay
    ├── Fail (attempt 2) → NACK → re-queue with longer delay
    ├── Fail (attempt 3) → NACK → re-queue with even longer delay
    └── Fail (attempt 4) → Move to DLQ
                                │
                                ▼
                          ┌──────────┐
                          │   DLQ    │ → Alert on-call engineer
                          │          │ → Manual inspection
                          │          │ → Fix and replay
                          └──────────┘
```

### Retry Budget

Limit the total retry rate across all clients to prevent retry storms from overwhelming a recovering service.

```python
class RetryBudget:
    def __init__(self, budget_ratio=0.1, window_seconds=60):
        self.budget_ratio = budget_ratio
        self.window = window_seconds
        self.requests = deque()
        self.retries = deque()
    
    def record_request(self):
        self.requests.append(time.time())
        self._prune()
    
    def can_retry(self):
        self._prune()
        total = len(self.requests)
        retried = len(self.retries)
        
        if total == 0:
            return True
        
        # Allow retries up to 10% of total request volume
        return retried / total < self.budget_ratio
    
    def record_retry(self):
        self.retries.append(time.time())
```

---

## 🔧 Approach 3: Heartbeats and Lease-Based Ownership

How do you detect when a worker processing a long task has crashed? You can't just use a timeout — the task might legitimately take hours.

### The Problem

```
Worker A claims task at T=0
Worker A starts processing...
Worker A crashes at T=30min (no notification)

                    How does the system know?
                    When should it re-assign the task?
                    What if Worker A didn't crash but is just slow?
```

### Heartbeat Pattern

The worker periodically signals that it's alive and still working on the task.

```
Worker                                    Task Manager
  │                                            │
  ├── claim task ──────────────────────────────►│
  │                                            │ lease_expires = now + 60s
  │                                            │
  │   ... processing ...                       │
  │                                            │
  ├── heartbeat (I'm alive!) ─────────────────►│ lease_expires = now + 60s
  │                                            │
  │   ... processing ...                       │
  │                                            │
  ├── heartbeat (I'm alive!) ─────────────────►│ lease_expires = now + 60s
  │                                            │
  │   ... processing ...                       │
  │                                            │
  ╳   CRASH                                    │
  │                                            │
  │                                            │ ... 60 seconds pass ...
  │                                            │ No heartbeat received!
  │                                            │ → Mark task as FAILED
  │                                            │ → Re-queue for another worker
```

### Implementation

```python
class TaskWorker:
    def __init__(self, task_manager, heartbeat_interval=30):
        self.task_manager = task_manager
        self.heartbeat_interval = heartbeat_interval
    
    async def process_task(self, task):
        # Start heartbeat in background
        heartbeat_task = asyncio.create_task(
            self._heartbeat_loop(task.id)
        )
        
        try:
            result = await self._do_work(task)
            await self.task_manager.complete(task.id, result)
        except Exception as e:
            await self.task_manager.fail(task.id, str(e))
            raise
        finally:
            heartbeat_task.cancel()
    
    async def _heartbeat_loop(self, task_id):
        while True:
            try:
                await self.task_manager.heartbeat(
                    task_id, 
                    lease_duration=self.heartbeat_interval * 2
                )
                await asyncio.sleep(self.heartbeat_interval)
            except asyncio.CancelledError:
                break


class TaskManager:
    async def heartbeat(self, task_id, lease_duration):
        """Extend the lease on a task"""
        await self.db.execute("""
            UPDATE tasks 
            SET lease_expires_at = NOW() + INTERVAL '%s seconds',
                last_heartbeat_at = NOW()
            WHERE id = %s AND status = 'RUNNING'
        """, lease_duration, task_id)
    
    async def reap_dead_tasks(self):
        """Background job: find tasks with expired leases"""
        dead_tasks = await self.db.query("""
            SELECT * FROM tasks 
            WHERE status = 'RUNNING' 
            AND lease_expires_at < NOW()
        """)
        
        for task in dead_tasks:
            if task.retry_count < task.max_retries:
                await self.requeue(task)
            else:
                await self.move_to_dlq(task)
```

### Lease Duration Trade-offs

| Short Lease (10s) | Long Lease (5min) |
|-------------------|-------------------|
| Fast failure detection | Slow failure detection |
| High heartbeat overhead | Low heartbeat overhead |
| Risk of false positives (healthy worker loses lease) | Longer delay before re-assigning dead tasks |
| Good for short tasks (< 1 min) | Good for long tasks (> 10 min) |

**Rule of thumb:** Set heartbeat interval to 1/3 of the lease duration. If heartbeat = 30s, lease = 90s.

---

## 🔧 Approach 4: Workflow Engines

For complex multi-step long-running tasks with branching, parallelism, and human-in-the-loop steps, a workflow engine provides durable execution guarantees.

### Temporal

```java
@WorkflowInterface
public interface VideoProcessingWorkflow {
    @WorkflowMethod
    VideoResult processVideo(VideoUpload upload);
    
    @QueryMethod
    ProcessingStatus getStatus();
    
    @SignalMethod
    void cancel();
}

public class VideoProcessingWorkflowImpl implements VideoProcessingWorkflow {
    private ProcessingStatus status = new ProcessingStatus();
    private boolean cancelled = false;
    
    @Override
    public VideoResult processVideo(VideoUpload upload) {
        // Step 1: Validate (seconds)
        status.setPhase("VALIDATING");
        ValidationResult validation = activities.validate(upload);
        
        if (cancelled) throw new CancelledException();
        
        // Step 2: Transcode to multiple formats (minutes-hours)
        status.setPhase("TRANSCODING");
        List<Promise<TranscodeResult>> futures = new ArrayList<>();
        
        for (String format : List.of("720p", "1080p", "4k")) {
            futures.add(Async.function(activities::transcode, upload, format));
        }
        
        // Wait for all transcoding jobs (parallel execution)
        List<TranscodeResult> results = new ArrayList<>();
        for (Promise<TranscodeResult> f : futures) {
            if (cancelled) throw new CancelledException();
            results.add(f.get());
            status.incrementCompleted();
        }
        
        // Step 3: Generate thumbnails (seconds)
        status.setPhase("THUMBNAILS");
        List<String> thumbnails = activities.generateThumbnails(upload);
        
        // Step 4: Update catalog (milliseconds)
        status.setPhase("PUBLISHING");
        activities.publishToCatalog(upload.getId(), results, thumbnails);
        
        status.setPhase("COMPLETED");
        return new VideoResult(results, thumbnails);
    }
    
    @Override
    public ProcessingStatus getStatus() {
        return status;
    }
    
    @Override
    public void cancel() {
        this.cancelled = true;
    }
}
```

### Temporal Features for Long-Running Tasks

| Feature | How It Helps |
|---------|-------------|
| **Durable execution** | Workflow state survives worker crashes — auto-resumes from last checkpoint |
| **Activity timeouts** | Per-step timeouts with configurable retry policies |
| **Heartbeating** | Activities report progress; Temporal detects dead workers |
| **Signals** | External events can modify running workflows (cancel, pause, escalate) |
| **Queries** | Read workflow state without affecting execution (progress, status) |
| **Child workflows** | Decompose complex tasks into sub-workflows |
| **Cron schedules** | Built-in cron-style recurring workflows |
| **Versioning** | Deploy new workflow code without breaking running workflows |

### AWS Step Functions

For AWS-native environments, Step Functions provide similar orchestration with serverless execution:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Validate    │────►│  Parallel    │────►│  Publish     │
│  (Lambda)    │     │  Transcode   │     │  (Lambda)    │
│  10 sec      │     │              │     │  5 sec       │
└──────────────┘     │ ┌──────────┐ │     └──────────────┘
                     │ │ 720p     │ │
                     │ │ (ECS)    │ │
                     │ │ 30 min   │ │
                     │ ├──────────┤ │
                     │ │ 1080p    │ │
                     │ │ (ECS)    │ │
                     │ │ 45 min   │ │
                     │ ├──────────┤ │
                     │ │ 4K       │ │
                     │ │ (ECS)    │ │
                     │ │ 90 min   │ │
                     │ └──────────┘ │
                     └──────────────┘
```

### When to Use a Workflow Engine vs Custom Implementation

| Factor | Custom (Queue + Workers) | Workflow Engine |
|--------|------------------------|-----------------|
| **Task complexity** | Simple, 1-3 steps | Complex, branching, parallel, loops |
| **Duration** | Minutes | Hours to days |
| **Failure recovery** | You build it | Built-in replay and retry |
| **Visibility** | You build dashboards | Built-in UI and history |
| **Team familiarity** | Familiar with queues | Willing to learn new paradigm |
| **Operational cost** | Manage queue infrastructure | Manage Temporal cluster (or use cloud) |
| **Vendor lock-in** | None | Moderate (Step Functions) to Low (Temporal) |

---

## 🔧 Approach 5: Timeout and Deadline Propagation

In distributed systems, a single user request may trigger a chain of service calls. Without proper timeout management, a slow downstream service can exhaust resources across the entire call chain.

### The Problem: Cascading Timeouts

```
User → API Gateway (timeout: 30s)
         → Order Service (timeout: 25s)
              → Inventory Service (timeout: 20s)
                   → Database (timeout: 15s)
                        → Slow query: 14.9s ← Just barely made it

But the user already gave up after 10s and closed the browser.
All downstream work after 10s was WASTED.
```

### Deadline Propagation

Pass a **deadline** (absolute time by which the response must be returned) through the call chain. Each service checks the remaining budget before starting work.

```python
class DeadlineContext:
    def __init__(self, deadline: datetime):
        self.deadline = deadline
    
    @property
    def remaining_ms(self):
        delta = self.deadline - datetime.utcnow()
        return max(0, int(delta.total_seconds() * 1000))
    
    @property
    def is_expired(self):
        return self.remaining_ms <= 0
    
    def child_deadline(self, max_ms=None):
        """Create a child deadline with optional cap"""
        remaining = self.remaining_ms
        if max_ms:
            remaining = min(remaining, max_ms)
        return DeadlineContext(
            datetime.utcnow() + timedelta(milliseconds=remaining)
        )


# In each service:
async def handle_request(request, deadline: DeadlineContext):
    if deadline.is_expired:
        raise DeadlineExceeded("Request deadline already passed")
    
    # Set downstream timeout to remaining budget
    result = await inventory_client.check_stock(
        product_id,
        timeout_ms=deadline.remaining_ms - 100  # Leave 100ms for response processing
    )
    
    if deadline.is_expired:
        raise DeadlineExceeded("Deadline exceeded after inventory check")
    
    return process_result(result)
```

### gRPC Deadline Propagation

gRPC has first-class support for deadlines — they propagate automatically through the call chain:

```protobuf
// Client sets a deadline
stub.withDeadlineAfter(5, TimeUnit.SECONDS)
    .processOrder(request);

// Every downstream gRPC call inherits the remaining deadline
// If 3 seconds have passed, the next call has 2 seconds remaining
// If the deadline expires, all in-flight calls are cancelled automatically
```

---

## 🔧 Approach 6: Progress Tracking and User Communication

Users hate staring at a spinner with no information. Good progress tracking builds trust and reduces support tickets.

### Progress Reporting Architecture

```
┌──────────┐     SSE / WebSocket     ┌──────────────┐     Progress     ┌──────────┐
│  Client  │ ◄───────────────────── │  Progress    │ ◄───────────── │  Worker  │
│  (UI)    │                        │  Service     │                │          │
└──────────┘                        └──────────────┘                └──────────┘
                                          │
                                    ┌─────┴─────┐
                                    │   Redis   │
                                    │ (pub/sub) │
                                    └───────────┘
```

### Implementation

```python
class ProgressTracker:
    def __init__(self, redis_client, task_id):
        self.redis = redis_client
        self.task_id = task_id
        self.channel = f"task:{task_id}:progress"
    
    async def update(self, phase, progress, message=None, eta_seconds=None):
        payload = {
            "task_id": self.task_id,
            "phase": phase,
            "progress": progress,       # 0-100
            "message": message,
            "eta_seconds": eta_seconds,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Store current state (for polling)
        await self.redis.hset(f"task:{self.task_id}", mapping=payload)
        
        # Publish update (for real-time push)
        await self.redis.publish(self.channel, json.dumps(payload))
    
    async def estimate_eta(self, items_processed, total_items, elapsed_seconds):
        if items_processed == 0:
            return None
        rate = items_processed / elapsed_seconds
        remaining = total_items - items_processed
        return int(remaining / rate)


# Worker usage:
async def process_bulk_import(tracker, items):
    total = len(items)
    start = time.time()
    
    for i, item in enumerate(items):
        await import_item(item)
        
        if i % 100 == 0:  # Update every 100 items
            elapsed = time.time() - start
            eta = await tracker.estimate_eta(i, total, elapsed)
            await tracker.update(
                phase="importing",
                progress=int(i / total * 100),
                message=f"Imported {i}/{total} items",
                eta_seconds=eta,
            )
    
    await tracker.update(
        phase="completed",
        progress=100,
        message=f"Successfully imported {total} items",
    )
```

### User-Facing Progress UI Best Practices

| Practice | Why |
|----------|-----|
| **Show phase, not just percentage** | "Generating report (3/5 steps)" is more informative than "60%" |
| **Show ETA when possible** | Users can decide whether to wait or come back later |
| **Use determinate progress bars** | Indeterminate spinners cause anxiety — estimate if you can |
| **Email on completion** | Don't require users to keep the page open |
| **Allow background processing** | "We'll email you when it's ready" — let users close the tab |
| **Show speed/throughput** | "Processing 1,200 items/sec" builds confidence |
| **Provide a cancel button** | Users should always be in control |

---

## 🔧 Approach 7: Graceful Shutdown and Task Draining

When deploying new code or scaling down workers, in-flight tasks must complete cleanly.

### Graceful Shutdown Protocol

```
1. SIGTERM received (deployment starting)
2. Stop accepting new tasks (deregister from queue)
3. Wait for in-flight tasks to complete (drain timeout)
4. If drain timeout exceeded, checkpoint and re-queue remaining tasks
5. Exit cleanly
```

```python
class GracefulWorker:
    def __init__(self):
        self.shutting_down = False
        self.active_tasks = set()
        
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)
    
    def _handle_shutdown(self, signum, frame):
        logger.info("Shutdown signal received, draining tasks...")
        self.shutting_down = True
    
    async def run(self):
        while not self.shutting_down:
            task = await self.queue.claim(timeout=1)
            if task:
                self.active_tasks.add(task.id)
                asyncio.create_task(self._process(task))
        
        # Drain: wait for active tasks to complete
        logger.info(f"Draining {len(self.active_tasks)} active tasks...")
        drain_deadline = time.time() + 30  # 30-second drain timeout
        
        while self.active_tasks and time.time() < drain_deadline:
            await asyncio.sleep(0.5)
        
        if self.active_tasks:
            logger.warning(f"Force-stopping {len(self.active_tasks)} tasks")
            for task_id in self.active_tasks:
                await self.requeue(task_id)
    
    async def _process(self, task):
        try:
            await self.handle(task)
        finally:
            self.active_tasks.discard(task.id)
```

### Kubernetes Integration

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120  # Allow 2 minutes for drain
      containers:
      - name: worker
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]  # Allow LB to deregister
```

---

## 🔧 Approach 8: Checkpointing for Resumability

For very long tasks, periodically save progress so that a restarted task can resume from the last checkpoint instead of starting over.

### Implementation

```python
class CheckpointedProcessor:
    def __init__(self, db, checkpoint_interval=1000):
        self.db = db
        self.checkpoint_interval = checkpoint_interval
    
    async def process_migration(self, task_id, query, batch_size=100):
        # Load checkpoint if resuming
        checkpoint = await self.db.query(
            "SELECT last_processed_id, items_processed FROM checkpoints WHERE task_id = %s",
            task_id
        )
        
        last_id = checkpoint.last_processed_id if checkpoint else 0
        processed = checkpoint.items_processed if checkpoint else 0
        
        while True:
            batch = await self.db.query(
                "SELECT * FROM source_table WHERE id > %s ORDER BY id LIMIT %s",
                last_id, batch_size
            )
            
            if not batch:
                break
            
            for item in batch:
                await self.migrate_item(item)
                last_id = item.id
                processed += 1
                
                # Checkpoint every N items
                if processed % self.checkpoint_interval == 0:
                    await self.save_checkpoint(task_id, last_id, processed)
        
        await self.mark_complete(task_id)
    
    async def save_checkpoint(self, task_id, last_id, processed):
        await self.db.execute("""
            INSERT INTO checkpoints (task_id, last_processed_id, items_processed, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (task_id) 
            DO UPDATE SET last_processed_id = %s, items_processed = %s, updated_at = NOW()
        """, task_id, last_id, processed, last_id, processed)
```

### Checkpoint Schema

```sql
CREATE TABLE checkpoints (
    task_id             UUID PRIMARY KEY,
    last_processed_id   BIGINT NOT NULL,
    items_processed     BIGINT NOT NULL,
    metadata            JSONB,            -- task-specific resume data
    updated_at          TIMESTAMP NOT NULL
);
```

### When to Checkpoint

| Strategy | When | Trade-off |
|----------|------|-----------|
| **Every N items** | After processing 1000 items | Predictable, simple |
| **Time-based** | Every 60 seconds | Consistent regardless of item processing speed |
| **Phase-based** | After each major phase | Natural boundaries, coarser granularity |
| **Hybrid** | Every N items OR every T seconds, whichever comes first | Best coverage |

---

## ⚖️ Comparison Matrix

| Strategy | Complexity | Reliability | Visibility | Best For |
|----------|:----------:|:-----------:|:----------:|----------|
| **Task Queue + Workers** | Low | Medium | Low | Simple async tasks |
| **Retry + DLQ** | Low | High | Medium | Any fallible task |
| **Heartbeat/Lease** | Medium | High | Medium | Worker crash detection |
| **Workflow Engine** | Medium-High | Very High | Very High | Complex, multi-step tasks |
| **Deadline Propagation** | Medium | High | Low | Chained service calls |
| **Progress Tracking** | Low | N/A | Very High | User-facing tasks |
| **Graceful Shutdown** | Medium | High | Low | Deployment safety |
| **Checkpointing** | Medium | Very High | Medium | Very long tasks (hours+) |

### Decision Framework

```
How long does the task take?
├── < 30 seconds → Sync processing (or simple async with timeout)
├── 30 seconds - 10 minutes → Task queue + workers + retry
├── 10 minutes - 1 hour → Add heartbeats + progress tracking + checkpointing
└── > 1 hour → Workflow engine (Temporal / Step Functions)

How many steps does the task have?
├── 1 step → Simple task queue
├── 2-4 steps → Orchestrated task with state machine
└── 5+ steps (with branching) → Workflow engine

How important is visibility?
├── Internal/batch → Basic logging
├── User-facing → Progress tracking + SSE/WebSocket + email notification
└── Business-critical → Workflow engine with full audit trail
```

---

## 🧠 Key Takeaways

1. **Never process long tasks synchronously** — return a task ID immediately and process asynchronously
2. **Exponential backoff with jitter is the gold standard** for retry strategies — it prevents thundering herds and gives failing services time to recover
3. **Heartbeats are essential for crash detection** — without them, you won't know a worker died until a timeout expires (which you have to guess)
4. **Checkpointing turns a catastrophe into a minor inconvenience** — a 4-hour task that fails at 3h50m should resume from 3h49m, not restart
5. **Workflow engines (Temporal, Step Functions) are worth the investment** for anything complex — they handle retries, timeouts, crash recovery, versioning, and visibility out of the box
6. **Deadline propagation prevents wasted work** — if the user gave up after 10 seconds, don't keep processing for 2 more minutes
7. **Graceful shutdown is a deployment requirement** — killing workers mid-task causes data corruption, duplicate processing, and lost work
8. **Progress tracking reduces support tickets** — users with visibility into task status rarely file tickets asking "where's my report?"

:::info Interview Strategy
When asked "How do you handle a long-running task like video transcoding?", start with the architecture: "I'd decouple submission from processing using a task queue." Then layer on reliability: retries, heartbeats, DLQ. Then user experience: progress tracking, ETA, email notification. If they push on complexity, mention Temporal or Step Functions. Mention checkpointing for very long tasks — it shows you've dealt with real production failures.
:::
