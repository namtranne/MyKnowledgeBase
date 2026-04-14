---
sidebar_position: 6
title: "05 — Interview Questions"
slug: 05-interview-questions
---

# 🎯 Reliability Engineering — Interview Questions

This chapter contains scenario-based, design, and conceptual interview questions covering all reliability engineering topics. Each question includes a detailed model answer at senior-engineer depth.

---

## Quick Reference Tables

### Nines Table

| Availability | Nines | Downtime/Year | Downtime/Month | Downtime/Week |
|:------------:|:-----:|:-------------:|:--------------:|:-------------:|
| 99% | 2 | 3.65 days | 7.31 hours | 1.68 hours |
| 99.9% | 3 | 8.76 hours | 43.83 min | 10.08 min |
| 99.95% | 3.5 | 4.38 hours | 21.92 min | 5.04 min |
| 99.99% | 4 | 52.60 min | 4.38 min | 1.01 min |
| 99.999% | 5 | 5.26 min | 26.30 sec | 6.05 sec |

### Circuit Breaker States

| State | Behavior | Transition Out |
|-------|----------|---------------|
| **Closed** | Requests pass, failures counted | → Open when threshold exceeded |
| **Open** | Fast-fail all requests | → Half-Open after timeout |
| **Half-Open** | Limited probe requests | → Closed (success) or → Open (failure) |

### Rate Limiting Algorithm Comparison

| Algorithm | Accuracy | Memory | Burst | Best For |
|-----------|:--------:|:------:|:-----:|----------|
| Token Bucket | Good | O(1) | ✅ | APIs, general use |
| Leaky Bucket | Good | O(n) | ❌ | Constant rate output |
| Fixed Window | Poor | O(1) | ⚠️ 2× edge | Low-precision |
| Sliding Log | Perfect | O(n) | ✅ | Low-rate, precise |
| Sliding Counter | Very Good | O(1) | ⚠️ | Production default |

### DR Pattern Comparison

| Pattern | RTO | RPO | Cost |
|---------|:---:|:---:|:----:|
| Backup & Restore | Hours | Hours | $ |
| Pilot Light | 10-30 min | Minutes | $$ |
| Warm Standby | Minutes | Seconds | $$$ |
| Active-Active | ~0 | ~0 | $$$$ |

---

## Category 1 — SRE Fundamentals

### Q1: What's the difference between SLA, SLO, and SLI? Give concrete examples.

**Answer:**

The three form a hierarchy from measurement to contract:

- **SLI (Service Level Indicator)** — A quantitative measurement of service behavior. It's the raw metric.
  - Example: "99.2% of API requests returned a 2xx status code in the last 30 days."
  - Example: "p99 latency was 142ms."

- **SLO (Service Level Objective)** — An internal target for an SLI. It's the goal the engineering team commits to.
  - Example: "99.9% of API requests must return 2xx, measured over a rolling 30-day window."
  - Example: "p99 latency must be below 200ms."

- **SLA (Service Level Agreement)** — A contractual promise to customers with penalties for violations. Always set looser than SLOs to provide a safety buffer.
  - Example: "99.9% uptime per month, or customer receives 10% service credit."

The relationship: SLI measures actual performance → SLO sets the internal target (tighter) → SLA defines the external contractual commitment (looser, with penalties).

:::tip Senior-Level Insight
A common pitfall is setting SLOs equal to SLAs. Always maintain a buffer — if your SLA promises 99.9%, set your SLO at 99.95%. This gives you an early warning before contractual penalties apply. Your SLO breach should trigger internal action; your SLA breach triggers customer compensation.
:::

---

### Q2: How would you set SLOs for a brand-new service?

**Answer:**

1. **Identify user journeys** — What do users actually do? (e.g., "search products", "checkout", "view dashboard")
2. **Choose SLIs that correlate with user happiness** — Availability and latency for synchronous APIs, freshness for data pipelines, correctness for ML services.
3. **Measure current baseline** — Run the service in production (or load test) and observe actual performance for 2-4 weeks.
4. **Set initial SLO slightly below baseline** — If p99 latency is currently 180ms, set SLO at 200ms. Don't set aspirational targets.
5. **Consider dependencies** — Your SLO can't exceed your weakest dependency. If your database is 99.95%, your service can't reliably promise 99.99%.
6. **Align with business** — Payment processing may need 99.99%; an internal admin tool may only need 99.5%.
7. **Start with fewer SLOs** — 2-3 well-chosen SLOs beat 10 that nobody tracks.
8. **Iterate** — Revisit SLOs quarterly. Tighten if easily met, loosen if consuming too much engineering effort.

---

### Q3: Explain error budgets and how they affect feature velocity.

**Answer:**

An error budget is the maximum allowable unreliability, derived from the SLO: `Error Budget = 1 - SLO`.

For a 99.9% SLO over 30 days:
- Budget = 0.1% = 43.2 minutes of downtime per month.

**Impact on velocity:**

| Budget Status | Team Behavior |
|:--|:--|
| Healthy (> 50% remaining) | Ship features aggressively, experiment, take calculated risks |
| Cautious (25-50%) | Require extra review for risky changes, reduce deploy frequency |
| Critical (< 25%) | Feature freeze on risky changes, focus on reliability improvements |
| Exhausted (0%) | Full feature freeze until budget replenishes or reliability improves |

The key insight: error budgets align product and engineering incentives. Product teams want fast feature delivery; SRE teams want reliability. Error budgets give both sides a shared framework — when budget is healthy, ship fast; when it's low, fix reliability. This eliminates the "ops vs dev" tension.

---

### Q4: Your service calls 10 downstream dependencies, each at 99.9% availability. What's the overall availability? How do you improve it?

**Answer:**

**Compound availability (serial dependencies):** 99.9%^10 = 99.0% — dropped from three nines to two nines. That's 3.65 days of downtime per year versus 8.76 hours.

**Improvement strategies:**

1. **Reduce critical path dependencies** — Not all 10 need to be synchronous. Move analytics, logging, and non-critical calls to async.
2. **Add redundancy for critical deps** — Run two instances of a critical service. Parallel availability: 1 - (0.001)^2 = 99.9999%.
3. **Graceful degradation** — If recommendations service is down, show trending items instead. Don't fail the whole page.
4. **Caching** — Cache responses from downstream services. Serve stale data during outages.
5. **Circuit breakers** — Stop calling a failing dependency; return fallback immediately.
6. **Timeout budgets** — Propagate deadlines so total latency stays bounded.

---

## Category 2 — Resilience Patterns

### Q5: Explain the circuit breaker pattern. Walk through all three states.

**Answer:**

The circuit breaker monitors calls to a downstream service and trips when failures exceed a threshold, preventing cascading failure.

**States:**

1. **Closed** (normal operation):
   - All requests pass through to the downstream service.
   - Failures are counted within a sliding window (e.g., last 10 calls or last 60 seconds).
   - If failure rate exceeds threshold (e.g., 50% of last 10 calls fail), transition to **Open**.

2. **Open** (fail-fast):
   - No requests are sent to the downstream service.
   - All calls immediately return a fallback response or throw an exception.
   - A timer starts. After a configured duration (e.g., 30 seconds), transition to **Half-Open**.
   - Purpose: give the downstream service time to recover without hammering it.

3. **Half-Open** (probing):
   - A limited number of probe requests (e.g., 3-5) are sent to the downstream service.
   - If probes succeed: transition back to **Closed** (service recovered).
   - If probes fail: transition back to **Open** (service still unhealthy, reset timer).

**Implementation considerations:**
- Use count-based windows for high-throughput services, time-based for low-throughput.
- Set a `minimumNumberOfCalls` to avoid tripping on insufficient data.
- Track slow calls separately — a service returning 200 OK but taking 10 seconds is effectively failing.
- Always provide a meaningful fallback (cached data, default value, empty list).

---

### Q6: When would you use exponential backoff with jitter vs without?

**Answer:**

**Without jitter:** All clients retry at the same intervals (1s, 2s, 4s, 8s...). If 100 clients fail at the same time, they all retry at t=1s, then t=3s, then t=7s — creating synchronized bursts that can prevent the server from recovering. This is called the **thundering herd problem**.

**With jitter:** Each client adds randomness. Client A retries at 0.7s, Client B at 1.3s, Client C at 0.2s. This spreads retries across the window, reducing peak load on the recovering service.

**Always use jitter in production.** The only case for no-jitter is single-client local retries where thundering herd isn't a concern (e.g., retrying a local file read).

**Jitter variants:**
- **Full jitter:** `random(0, base * 2^attempt)` — most spread, best for distributed systems.
- **Equal jitter:** `base * 2^attempt / 2 + random(0, base * 2^attempt / 2)` — guaranteed minimum wait.
- **Decorrelated jitter:** `random(base, previous_delay * 3)` — each retry based on previous delay.

:::tip Senior-Level Insight
AWS recommends full jitter as the default. Their analysis shows it produces the best overall throughput under contention. Equal jitter is useful when you need a guaranteed minimum delay between retries (e.g., waiting for a leader election that takes at least N seconds).
:::

---

### Q7: How do you prevent cascading failures in a microservice architecture?

**Answer:**

Cascading failures propagate when one service's failure causes its callers to fail, which causes their callers to fail, etc. Prevention requires defense at every layer:

1. **Timeouts on every outbound call** — Never wait indefinitely. Set connect timeout (1-3s) and read timeout (5-15s).
2. **Circuit breakers on every dependency** — Stop calling a service that's failing. Return fallback.
3. **Bulkheads for resource isolation** — Separate thread pools per dependency so a hanging service doesn't consume all threads.
4. **Graceful degradation** — Classify dependencies as critical vs non-critical. Non-critical failures return fallback; only critical failures propagate.
5. **Load shedding** — When overwhelmed, reject excess requests (429) rather than serving all slowly.
6. **Backpressure** — In async systems, signal producers to slow down when consumers can't keep up.
7. **Health checks** — Remove unhealthy instances from load balancer pools quickly.
8. **Retry budgets** — Limit total retries across the system. If 100 clients each retry 3 times, the failing service sees 400 requests instead of 100.

The combination of **timeouts + circuit breakers + bulkheads** is called the "resilience triad" and should be applied to every service-to-service call.

---

### Q8: Explain the difference between fail-fast and fail-safe. When do you use each?

**Answer:**

| | Fail-Fast | Fail-Safe |
|---|---|---|
| **On error** | Immediately report failure | Absorb failure, continue |
| **Priority** | Data correctness | Service availability |
| **Example** | Payment processing | Recommendation widget |

**Use fail-fast when:**
- Data integrity is critical (financial transactions, writes to primary DB)
- The error indicates a programmer bug that should be fixed, not hidden
- Continuing would make the problem worse (double-charging a customer)
- The circuit breaker is in OPEN state (fast-fail is intentional)

**Use fail-safe when:**
- Availability is more important than completeness (serving a webpage with recommendations missing is better than a 500 error)
- Stale or default data is acceptable
- The failing component is non-critical to the user's primary goal
- You can serve a degraded experience that's still useful

In practice, a single request often uses both: fail-fast for the core operation (charge payment) and fail-safe for ancillary operations (send confirmation email, log analytics event).

---

## Category 3 — Rate Limiting

### Q9: Design rate limiting for a global API serving millions of requests per second.

**Answer:**

**Requirements clarification:**
- Global: multiple regions (US, EU, Asia)
- Per-customer rate limits (API key based)
- Burst tolerance needed (APIs should allow short bursts)
- Must be fast (< 1ms overhead per request)

**Algorithm choice:** Token bucket — allows controlled bursts, O(1) per check, industry standard for APIs.

**Architecture:**

```
  Client Request
       │
       ▼
  ┌─────────────┐    Tier-1: Edge rate limiting
  │ API Gateway │    (per-IP, coarse-grained)
  │ (NGINX/Kong)│    Rate limiting at CDN edge (Cloudflare, AWS WAF)
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐    Tier-2: Application rate limiting
  │ Rate Limit  │    (per-API-key, fine-grained)
  │ Service     │    Token bucket per API key
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ Redis Cluster│    Centralized counter store
  │ (per region) │    Lua scripts for atomic operations
  └─────────────┘
```

**Distributed strategy:**
- Each region has its own Redis cluster for local rate limiting (low latency).
- For global limits, use async aggregation: each region tracks local counts and periodically syncs to a global counter. Accept slight over-admission (e.g., 105% of limit) in exchange for low latency.
- For strict global limits (billing, compliance), use a centralized rate limiter with higher latency.

**Failure handling:**
- If Redis is unavailable: fail-open (allow requests) with local in-memory rate limiting as fallback.
- Circuit-break the rate limiter itself — if checking limits adds > 5ms, bypass and log.

**Response headers:** Always return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429.

---

### Q10: Compare token bucket and sliding window counter. When would you choose each?

**Answer:**

| Aspect | Token Bucket | Sliding Window Counter |
|--------|-------------|----------------------|
| **Burst** | Allows bursts up to bucket capacity | Smooth enforcement, no large bursts |
| **Memory** | O(1) per key | O(1) per key |
| **Precision** | Good for rate, not window-precise | Very good (weighted approximation) |
| **Implementation** | Counter + timestamp | Two counters + window tracking |
| **Use case** | APIs (users expect burst tolerance) | Background job limits, strict enforcement |

**Choose token bucket when:**
- You want to allow controlled bursts (e.g., user opens app and makes 10 API calls in 1 second, then goes quiet).
- You're building a public API (industry convention).
- You need simplicity and speed.

**Choose sliding window counter when:**
- You need smooth, predictable rate enforcement (no bursts).
- You want window-accurate counts without the memory cost of sliding window log.
- You're limiting background processes or batch jobs.

---

### Q11: How would you handle rate limiting when your Redis cluster goes down?

**Answer:**

This is a critical operational question. Options:

1. **Fail-open (allow all):**
   - Remove rate limiting entirely when Redis is unavailable.
   - Risk: service is unprotected from abuse/overload.
   - Mitigation: use local in-memory rate limiting per instance with a generous limit.

2. **Fail-closed (reject all):**
   - Return 503 for all requests when rate limiter is unavailable.
   - Risk: self-inflicted outage. A rate limiter failure becomes a total outage.
   - Almost never the right choice.

3. **Hybrid (recommended):**
   - Fall back to **local in-memory rate limiting** per application instance.
   - Split the global limit across instances: `local_limit = global_limit / num_instances`.
   - Accept that limits will be approximate (some over-admission possible).
   - Alert the on-call team that distributed rate limiting is degraded.
   - Circuit-break Redis — once it's detected as down, don't add latency by trying to reach it.

4. **Cached limits:**
   - Cache the last known rate limit counters locally.
   - Use cached values with a staleness timeout (e.g., 30 seconds).
   - If cache is too stale, fall back to local limits.

:::warning
The worst possible outcome is a rate limiter failure causing a service outage. Rate limiting is a protective mechanism — if it fails, the service should still work, just with reduced protection. Always design rate limiters to fail-open or degrade gracefully.
:::

---

## Category 4 — Incident Management

### Q12: Your service's error rate doubles after a deploy. Walk through your response.

**Answer:**

**Phase 1 — Detection & Triage (0-5 minutes):**
1. Alert fires: error rate exceeded threshold (e.g., 1% → 2%).
2. Acknowledge the alert within 5 minutes.
3. Check: Is this correlated with a recent deploy? → Yes, deploy happened 10 minutes ago.
4. Assess severity: If the error rate is user-facing and affecting checkout, this is SEV1/SEV2. If it's an internal service, possibly SEV3.
5. If SEV1/SEV2: Declare incident, assign IC, open war room channel.

**Phase 2 — Mitigation (5-15 minutes):**
1. **Immediate rollback** — This is almost always the right first action when errors correlate with a deploy. Don't debug first; roll back first.
   ```
   kubectl rollout undo deployment/my-service
   ```
2. Monitor error rate: Is it decreasing? If yes, rollback was effective.
3. If rollback is not possible (database migration, data format change): Enable feature flag to disable the new code path.
4. Update status page and stakeholder channel.

**Phase 3 — Verification (15-30 minutes):**
1. Confirm error rate returned to baseline.
2. Check for any data corruption or side effects during the error window.
3. Verify no downstream services were impacted.
4. If stable, downgrade severity.

**Phase 4 — Resolution (hours/days):**
1. Investigate the root cause in the deploy diff.
2. Add test coverage for the failure case.
3. Fix the bug and re-deploy through normal canary process.

**Phase 5 — Postmortem:**
1. Write blameless postmortem with timeline, root cause, and action items.
2. Action items: improve canary detection, add test for this case, review deploy checklist.

---

### Q13: Write a postmortem for the following scenario: A database migration deleted a column that was still in use, causing 500 errors for 45 minutes.

**Answer:**

```markdown
# Postmortem: Column Deletion Caused 500 Errors

## Summary
A database migration dropped the `user_preferences` column from the
`users` table while the application code still referenced it, causing
500 errors on all user profile endpoints for 45 minutes.

## Impact
- Duration: 45 minutes (14:00 - 14:45 UTC)
- Users affected: ~12,000 (all users accessing profile pages)
- Error rate: Profile API returned 500 for 100% of requests
- SLO impact: Monthly availability dropped from 99.97% to 99.89%

## Timeline
| Time | Event |
|------|-------|
| 13:55 | Migration PR #892 merged and auto-deployed |
| 14:00 | Error rate alert fires for profile-service |
| 14:03 | On-call acknowledges, sees 500 errors |
| 14:08 | IC assigned, SEV2 declared |
| 14:12 | Correlation with migration identified |
| 14:15 | Attempted app rollback — doesn't help (column gone) |
| 14:20 | Decision: recreate column from backup |
| 14:35 | Column restored from point-in-time backup |
| 14:40 | Migration rollback applied (re-add column) |
| 14:45 | Error rate returns to zero, incident resolved |

## Root Cause
The migration script dropped `user_preferences` column as part of
a schema cleanup. The column was marked "unused" in a design doc
from 6 months ago, but the profile API still read from it. The PR
reviewer didn't check for application references.

## Contributing Factors
1. No automated check for column references before dropping
2. Migration and code change were in separate PRs (not atomic)
3. Staging environment had different data, masking the issue
4. No expand-contract migration pattern used

## Action Items
| # | Action | Owner | Priority | Due |
|---|--------|-------|----------|-----|
| 1 | Add CI check: scan code for column references before drop migrations | @alice | P0 | 1 week |
| 2 | Adopt expand-contract pattern for all schema changes | @bob | P1 | 2 weeks |
| 3 | Require code + migration in same PR when coupled | @carol | P0 | 1 week |
| 4 | Add migration dry-run in staging with production-like data | @dave | P1 | 3 weeks |
| 5 | Create runbook for "restore dropped column" procedure | @alice | P2 | 2 weeks |
```

:::tip Senior-Level Insight
This scenario highlights the importance of the **expand-contract migration pattern**: (1) add new column, (2) migrate application code, (3) backfill data, (4) drop old column. Never drop a column and update code in a single deploy. Each step should be independently reversible.
:::

---

### Q14: How do you structure an on-call rotation to avoid burnout?

**Answer:**

1. **Rotation schedule:** Weekly rotations (not daily — too much context switching). Primary + secondary on-call. Minimum 6-8 people in the rotation to ensure enough rest.

2. **Workload management:**
   - Target: < 2 pages per on-call shift (per person, per week).
   - If consistently exceeding this: fix noisy alerts, automate responses, or add team members.
   - Maximum 25% of work time on reactive operational tasks.

3. **Alert quality:**
   - Every alert must be actionable — if it pages someone at 3 AM, there must be something to do.
   - Remove alerts that always resolve themselves (noise).
   - Use multi-window burn rate alerts instead of threshold alerts.

4. **Compensation and recognition:**
   - On-call pay or comp time for after-hours pages.
   - Acknowledge on-call burden in performance reviews.
   - Allow flex time after difficult on-call shifts.

5. **Handoff process:**
   - End-of-shift handoff document: active incidents, known issues, upcoming risks.
   - 15-minute handoff meeting between outgoing and incoming on-call.

6. **Continuous improvement:**
   - Track pages per shift, MTTA, MTTR, and repeat incidents.
   - Postmortem every high-severity incident.
   - Weekly on-call review meeting: what happened, what can be automated, what needs fixing.

---

## Category 5 — Disaster Recovery

### Q15: Design a disaster recovery plan for a payment processing system.

**Answer:**

**Requirements:**
- Payment systems are Tier 0: RTO < 1 minute, RPO = 0 (no data loss).
- Must comply with PCI-DSS (data security).
- Global customer base — multi-region.

**Architecture: Multi-Site Active-Active**

```
  Region A (US-East)                    Region B (US-West)
  ┌───────────────────┐                ┌───────────────────┐
  │  Payment API      │                │  Payment API      │
  │  ████████████     │                │  ████████████     │
  │  Database (Primary)│  Synchronous  │  Database (Primary)│
  │  ████████████     │◄─────────────▶│  ████████████     │
  └───────────────────┘  Replication   └───────────────────┘
          ▲                                     ▲
          │           ┌────────────┐             │
          └───────────│ Global LB  │─────────────┘
                      │ (Route 53  │
                      │  / GLB)    │
                      └────────────┘
```

**Key decisions:**

1. **Data replication:** Synchronous replication between regions. Accept the latency cost (write takes ~50-100ms extra) to guarantee RPO = 0.

2. **Conflict resolution:** Use region-aware sharding so each transaction is owned by one region. Customer is routed to their home region; failover sends them to the other.

3. **Failover:** Global load balancer with health checks. Automatic failover within 30-60 seconds. No DNS dependency (DNS TTL is too slow for < 1 min RTO).

4. **Testing:** Monthly controlled failover to DR region. Quarterly game day with full traffic rerouting. Weekly canary restores of database backups.

5. **Data integrity:** After failover, run reconciliation jobs to verify no transactions were lost or duplicated. Use idempotency keys on all payment operations.

---

### Q16: Compare RTO and RPO. How do you determine the right values for a service?

**Answer:**

**RPO (Recovery Point Objective)** = "How much data can I lose?"
- RPO = 0: No data loss (synchronous replication, active-active)
- RPO = 1 hour: Can lose up to 1 hour of data (hourly backups)
- RPO = 24 hours: Can lose up to a day (daily backups)

**RTO (Recovery Time Objective)** = "How long can I be down?"
- RTO = 0: No downtime (active-active, instant failover)
- RTO = 15 minutes: Service must recover within 15 min (warm standby)
- RTO = 4 hours: Can tolerate half a business day of downtime

**How to determine values:**

1. **Quantify business impact:**
   - Revenue loss per minute of downtime
   - Cost per unit of data lost (e.g., per transaction, per order)
   - Regulatory requirements (financial services may mandate RPO = 0)

2. **Categorize services by tier:**
   - Tier 0 (payments, auth): RTO < 1 min, RPO = 0
   - Tier 1 (core API): RTO < 15 min, RPO < 1 min
   - Tier 2 (search, recommendations): RTO < 1 hour, RPO < 1 hour
   - Tier 3 (analytics, batch): RTO < 4 hours, RPO < 24 hours

3. **Balance cost vs risk:**
   - Reducing RTO/RPO costs exponentially more.
   - RPO = 0 requires synchronous replication (expensive, adds latency).
   - RTO = 0 requires active-active infrastructure (2x+ cost).
   - Find the knee of the cost curve where marginal improvement isn't worth the expense.

---

### Q17: How would you test disaster recovery without impacting production?

**Answer:**

**Progressive testing strategy (from safest to most realistic):**

1. **Tabletop exercise** (zero risk):
   - Gather the team in a room. Present a disaster scenario on paper.
   - Walk through the runbook step by step. Identify gaps.
   - "Database primary in us-east-1 goes down at 2 AM Saturday. What do we do?"

2. **Canary restore** (low risk):
   - Restore latest backup to an isolated test environment.
   - Verify data integrity: check row counts, run validation queries, compare checksums.
   - Measure restore time (this is your actual RTO baseline).

3. **Component failover** (low-medium risk):
   - Fail over a single non-critical database to its replica.
   - Measure failover time, data loss, and application behavior.
   - Do this during low-traffic periods.

4. **Controlled regional failover** (medium risk):
   - Redirect a small percentage of traffic (1-5%) to the DR region.
   - Gradually increase to 100% while monitoring errors and latency.
   - Fail back to primary region when satisfied.

5. **Game day** (medium-high risk):
   - Simulate a full region failure in production during business hours.
   - Intentionally block traffic to primary region.
   - Observe automated failover, measure RTO/RPO, identify gaps.
   - Have rollback plan ready.

6. **Chaos engineering** (ongoing, medium risk):
   - Inject failures randomly in production (Netflix Chaos Monkey).
   - Kill pods, introduce latency, partition networks.
   - Validates resilience patterns are working continuously.

---

### Q18: A junior engineer accidentally deleted a production database table. Walk through the recovery process.

**Answer:**

**Immediate actions (0-5 minutes):**
1. **Stop the bleeding** — Revoke the engineer's write access immediately (prevent further damage).
2. **Assess scope** — Which table? How critical? Is data actively being written?
3. **Declare incident** — SEV1 if it's a critical table (users, orders, payments).
4. **Prevent compounding** — If application is crashing due to missing table, enable maintenance mode or circuit-break the affected endpoints.

**Recovery (5-60 minutes):**
1. **Check if point-in-time recovery (PITR) is available:**
   - AWS RDS: Restore to point-in-time just before deletion.
   - This creates a new database instance with data intact.

2. **If PITR unavailable, restore from backup:**
   - Identify the most recent backup before the deletion.
   - Restore to a new instance.
   - Data written between backup and deletion is lost (RPO = backup interval).

3. **Recover only the deleted table:**
   - Don't replace the entire database — that would lose data written since the backup.
   - Export just the deleted table from the restored backup.
   - Import into the production database.

4. **Reconcile any lost data:**
   - Check application logs, event queues, or CDC streams for writes that occurred between the last backup and the deletion.
   - Replay those writes to minimize data loss.

**Prevention:**
- Restrict production database access (principle of least privilege).
- Require approval for destructive DDL (DROP, TRUNCATE).
- Enable deletion protection on critical databases.
- Use infrastructure-as-code for schema changes (migrations, not ad-hoc SQL).
- Continuous WAL/CDC replication for RPO ≈ 0.

---

## Category 6 — Scenario & Design Questions

### Q19: Design a system that can handle 10x traffic spikes during flash sales.

**Answer:**

**Challenges:** Predictable but extreme load spike (10x normal), concentrated on specific endpoints (product page, cart, checkout), limited duration (minutes to hours).

**Strategy:**

1. **Pre-scaling:**
   - Scale compute to 10x capacity 30 minutes before sale starts.
   - Pre-warm caches with sale product data.
   - Pre-warm connection pools to databases and downstream services.

2. **Traffic management:**
   - **Virtual waiting room** — Queue users before the sale page. Release in controlled batches.
   - **Rate limiting per user** — Prevent bots from monopolizing capacity.
   - **CDN for static assets** — Offload product images, CSS, JS to CDN.

3. **Architecture optimizations:**
   - **Read path:** Cache product catalog aggressively (Redis, CDN). Serve stale prices if cache miss.
   - **Write path:** Queue checkout requests. Process asynchronously. Show "order pending" immediately.
   - **Database:** Read replicas for product queries. Primary only for inventory decrements.
   - **Inventory:** Use optimistic locking or atomic decrements. Accept slight oversell risk and reconcile.

4. **Degradation plan:**
   - If load exceeds 10x: shed non-critical features (recommendations, reviews, personalization).
   - If checkout queue exceeds capacity: display wait time estimate, don't accept new entries.
   - If inventory service fails: fail-closed (don't sell what you might not have).

5. **Monitoring:**
   - Real-time dashboard for queue depth, error rate, latency, inventory levels.
   - Pre-defined alerts with runbooks for each failure scenario.
   - IC on standby during the sale window.

---

### Q20: You're responsible for reliability of a service handling 100k requests/second. How do you approach SLO-based alerting?

**Answer:**

**Step 1 — Define SLOs:**
- Availability: 99.95% of requests return non-5xx in a 30-day window.
- Latency: 99% of requests complete in < 200ms.
- Error budget: 0.05% = 21.6 minutes of downtime per month.

**Step 2 — Calculate burn rates:**

At 100k req/s, allowed error rate = 0.05% = 50 errors/second.

| Alert | Burn Rate | Meaning | Long Window | Short Window | Action |
|:-----:|:---------:|---------|:-----------:|:------------:|--------|
| P1 | 14.4x | Budget gone in 50 min | 1 hour | 5 min | Page immediately |
| P2 | 6x | Budget gone in 5 hours | 6 hours | 30 min | Page |
| P3 | 3x | Budget gone in 10 days | 1 day | 2 hours | Ticket |
| P4 | 1x | On track to exhaust in 30 days | 3 days | 6 hours | Low-priority ticket |

**Step 3 — Multi-window alert logic:**
```
fire_alert = (
    error_rate_in_long_window > SLO_error_rate * burn_rate
    AND
    error_rate_in_short_window > SLO_error_rate * burn_rate
)
```

The long window catches sustained problems. The short window confirms the issue is still happening (avoids alerting on a resolved spike).

**Step 4 — What NOT to alert on:**
- Don't alert on CPU > 80% — that's a cause, not a symptom.
- Don't alert on individual server errors — they're noise.
- Don't alert on dependency health checks — alert on your own SLIs.
- Do alert when error budget is being consumed faster than expected.

---

### Q21: How would you implement a production readiness review for a new microservice?

**Answer:**

A PRR ensures a new service meets reliability standards before receiving production traffic. Structure it as a collaborative checklist, not a gate.

**Process:**

1. **Early engagement** — SRE/platform team reviews the design doc for reliability concerns (dependencies, failure modes, data durability).

2. **Pre-launch checklist:**

   | Category | Items |
   |----------|-------|
   | **Observability** | SLIs instrumented, dashboards built, structured logging, distributed tracing |
   | **Alerting** | SLO-based alerts configured, on-call rotation established, escalation path documented |
   | **Resilience** | Circuit breakers on all downstream calls, timeouts configured, retry with backoff, graceful degradation for non-critical deps |
   | **Data** | Backup strategy defined and tested, retention policies set, PITR enabled for databases |
   | **Security** | AuthN/AuthZ, input validation, rate limiting, no hardcoded secrets |
   | **Capacity** | Load tested to 2x expected peak, auto-scaling configured, resource limits set |
   | **Deployment** | Canary pipeline, rollback tested, feature flags for risky paths |
   | **Runbooks** | Runbook for top 5 anticipated failure scenarios, written and reviewed |
   | **Dependencies** | All downstream services documented, critical vs non-critical classified |

3. **Review meeting** — Service team presents to SRE/platform team. Walk through each category. Identify gaps.

4. **Graduation** — Once all P0 items are resolved, approve for production. P1/P2 items can be tracked as follow-up work.

5. **Post-launch review** — After 2 weeks in production, review actual SLI data. Adjust SLOs, alerts, and capacity based on real traffic.

---

### Q22: Explain how you would handle a split-brain scenario in a distributed database during a network partition.

**Answer:**

**Split-brain** occurs when a network partition causes two nodes to both believe they are the primary, accepting writes independently. This can lead to data divergence and corruption.

**Prevention:**

1. **Quorum-based consensus** — Use an odd number of nodes (3, 5). A node needs majority agreement (quorum) to become primary. With 3 nodes, if the partition splits 2-1, only the side with 2 nodes can form a quorum and accept writes.

2. **Fencing tokens** — When a new leader is elected, it gets a monotonically increasing token. Storage nodes reject writes from leaders with old tokens, preventing stale leaders from corrupting data.

3. **STONITH (Shoot The Other Node In The Head)** — The surviving side forcefully shuts down the other side (via out-of-band mechanism like IPMI). Ensures only one side is operational.

**Recovery if split-brain occurred:**

1. Identify the period of split-brain (dual-primary).
2. Compare writes from both sides during that period.
3. Apply conflict resolution: last-writer-wins, application-specific merge, or manual reconciliation.
4. For financial data, manual reconciliation is often required — automated merge can't determine business intent.

---

## Summary — Top 10 Things to Remember

1. **SLO = SLI + Target + Window.** SLOs drive decisions; SLAs are contracts.
2. **Error budget = 1 - SLO.** Budget healthy → ship fast. Budget exhausted → freeze.
3. **Compound availability degrades fast.** 10 deps at 99.9% = 99.0% overall.
4. **Circuit breaker:** Closed → Open → Half-Open. Always provide fallback.
5. **Always use jitter with retries.** Full jitter prevents thundering herd.
6. **Timeouts + Circuit Breakers + Bulkheads** = resilience triad for every call.
7. **Token bucket** is the standard API rate limiting algorithm.
8. **Mitigation first, investigation second.** Rollback, then understand why.
9. **RTO = how long can you be down. RPO = how much data can you lose.**
10. **Test your DR plan.** Untested recovery is wishful thinking.

---
