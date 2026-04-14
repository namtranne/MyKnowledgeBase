---
sidebar_position: 5
title: "04 — Incident Management & DR"
slug: 04-incident-management-dr
---

# 🚨 Incident Management & Disaster Recovery

How you respond to incidents and recover from disasters separates good engineering organizations from great ones. This chapter covers the full incident lifecycle, blameless postmortems, disaster recovery patterns, and the operational practices that keep production reliable.

---

## 1. Incident Lifecycle

Every incident follows a predictable lifecycle. Having a structured process ensures consistent, efficient response.

```
  ┌───────────┐    ┌─────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
  │ Detection │───▶│ Triage  │───▶│ Mitigation │───▶│ Resolution │───▶│ Postmortem │
  └───────────┘    └─────────┘    └────────────┘    └────────────┘    └────────────┘
    Alerts,          Severity,      Stop the          Root cause        Learn &
    monitoring,      IC assigned,   bleeding —        fixed,            prevent
    customer         team paged     restore service   deploy fix        recurrence
    reports
```

| Phase | Goal | Activities | Duration Target |
|-------|------|-----------|:---------------:|
| **Detection** | Know something is wrong | Alerts fire, customer reports, anomaly detection | < 5 minutes |
| **Triage** | Assess severity, mobilize | Assign IC, determine severity, page responders | < 10 minutes |
| **Mitigation** | Restore service ASAP | Rollback, failover, scale up, feature toggle | < 30 min (SEV1) |
| **Resolution** | Fix the root cause | Deploy permanent fix, verify recovery | Hours to days |
| **Postmortem** | Prevent recurrence | Timeline, root cause analysis, action items | Within 3-5 days |

:::tip Senior-Level Insight
**Mitigation is not resolution.** Rolling back a bad deploy mitigates the incident (service restored), but the underlying bug still exists. Track mitigation and resolution as separate milestones. During an active incident, always prioritize mitigation — fix it fast, understand it later.
:::

---

## 2. Incident Severity Levels

| Level | Name | Definition | Response Time | Examples |
|:-----:|------|-----------|:-------------:|---------|
| **SEV1** | Critical | Complete service outage or data loss affecting many users | < 15 min | Payment system down, data breach, total outage |
| **SEV2** | Major | Significant degradation affecting core functionality | < 30 min | Elevated error rates (> 5%), major feature broken |
| **SEV3** | Minor | Limited impact, workaround available | < 4 hours | Single endpoint slow, non-critical feature degraded |
| **SEV4** | Low | Cosmetic or minimal impact | Next business day | UI glitch, log noise, minor config issue |

### Severity Decision Matrix

```
                        User Impact
                   Low         High
                ┌──────────┬──────────┐
  Scope   Few   │  SEV4    │  SEV3    │
  of      Users │          │          │
  Impact        ├──────────┼──────────┤
          Many  │  SEV3    │  SEV1/2  │
          Users │          │          │
                └──────────┴──────────┘
```

### Escalation Rules

| Severity | Who Gets Paged | Communication Cadence | Stakeholder Updates |
|:--------:|---------------|:--------------------:|:-------------------:|
| SEV1 | On-call + IC + Eng Manager + VP | Every 15 min | Every 30 min |
| SEV2 | On-call + IC + Eng Manager | Every 30 min | Every hour |
| SEV3 | On-call team | Every 2 hours | End of day |
| SEV4 | Team backlog | N/A | N/A |

---

## 3. Incident Commander Role

The **Incident Commander (IC)** is the single person responsible for coordinating the incident response. They do not debug — they orchestrate.

### IC Responsibilities

| Responsibility | Details |
|---------------|---------|
| **Coordination** | Assign roles, delegate tasks, manage handoffs |
| **Communication** | Post updates to status page, stakeholder channel, leadership |
| **Decision-making** | Approve rollbacks, failovers, escalations |
| **Scoping** | Determine blast radius, affected services, impacted users |
| **Documentation** | Ensure timeline is maintained during incident |
| **Escalation** | Bring in additional experts when needed |
| **De-escalation** | Declare incident resolved, initiate postmortem |

### Incident Roles

```
                      ┌──────────────────┐
                      │    Incident      │
                      │   Commander (IC) │
                      └────────┬─────────┘
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────┐
     │  Operations   │ │Communication │ │  Subject    │
     │  Lead         │ │  Lead        │ │  Matter     │
     │               │ │              │ │  Experts    │
     │ - Debug       │ │ - Status page│ │ - DB expert │
     │ - Fix         │ │ - Slack      │ │ - Network   │
     │ - Rollback    │ │ - Customers  │ │ - Security  │
     └───────────────┘ └──────────────┘ └─────────────┘
```

:::warning
The IC should **never** be the person debugging the issue. Debugging requires deep focus; coordination requires broad awareness. Combining both roles leads to tunnel vision and missed communication. In small teams, explicitly hand off IC duties before diving into debugging.
:::

---

## 4. Runbooks

A **runbook** is a documented procedure for handling a specific operational task or incident type. Good runbooks turn tribal knowledge into repeatable processes.

### Runbook Template

```markdown
# Runbook: [Service Name] — [Issue Type]

## Overview
- **Service:** Order Processing Service
- **Trigger:** Alert: order_processing_error_rate > 5%
- **Severity:** SEV2
- **Owner:** Payments Team
- **Last Updated:** 2024-01-15

## Diagnostic Steps
1. Check error rate dashboard: [link]
2. Check recent deployments: `kubectl rollout history deployment/orders`
3. Check downstream dependency health:
   - Payment Gateway: [status page link]
   - Inventory Service: [health check link]
4. Check database connection pool: [metrics link]
5. Review recent error logs:
   `kubectl logs -l app=orders --since=15m | grep ERROR`

## Mitigation Steps

### If caused by recent deploy:
1. Rollback: `kubectl rollout undo deployment/orders`
2. Verify error rate decreasing on dashboard
3. Notify #engineering-deploys channel

### If caused by downstream dependency:
1. Enable circuit breaker override: [feature flag link]
2. Activate cached fallback mode
3. Monitor recovery

### If caused by database:
1. Check connection pool saturation
2. Kill long-running queries: [link to query kill procedure]
3. If primary down, initiate failover: [failover procedure link]

## Escalation
- If not resolved in 30 min → page Database On-Call
- If customer-facing impact > 1 hour → notify VP Engineering

## Verification
- [ ] Error rate returned to baseline (< 0.1%)
- [ ] No customer complaints in support queue
- [ ] All health checks green
```

### Runbook Automation Levels

| Level | Description | Example |
|:-----:|-------------|---------|
| **0** | No runbook — tribal knowledge | "Ask Alice, she knows" |
| **1** | Documented steps — human executes | Wiki page with CLI commands |
| **2** | Semi-automated — scripts for key steps | Diagnostic script + manual decision |
| **3** | Fully automated — self-healing | Auto-rollback on error rate spike |
| **4** | Proactive — prevents incidents | Auto-scale before traffic spike |

---

## 5. Blameless Postmortems

A **blameless postmortem** is a structured review conducted after an incident to understand what happened, why, and how to prevent it from recurring — without blaming individuals.

### Postmortem Template

```markdown
# Postmortem: [Incident Title]

## Metadata
- **Date:** 2024-01-15
- **Duration:** 2 hours 15 minutes (10:30 - 12:45 UTC)
- **Severity:** SEV1
- **Incident Commander:** Jane Smith
- **Author:** Jane Smith
- **Status:** Action items in progress

## Summary
A configuration change to the rate limiter caused the payment service
to reject all requests for 2 hours, preventing customers from
completing purchases. Revenue impact estimated at $150,000.

## Impact
- **Users affected:** ~45,000 (all users attempting checkout)
- **Revenue impact:** ~$150,000 in lost transactions
- **SLO impact:** 99.8% availability (monthly SLO: 99.95%) — budget exhausted
- **Support tickets:** 312 tickets filed

## Timeline (all times UTC)
| Time | Event |
|------|-------|
| 10:15 | Config change deployed to rate limiter (PR #4521) |
| 10:30 | Error rate alert fires (> 5% threshold) |
| 10:35 | On-call engineer acknowledges alert |
| 10:45 | IC declared, SEV1 incident opened |
| 10:50 | Root cause identified — rate limit config set to 0 |
| 11:00 | Rollback initiated |
| 11:15 | Rollback failed — config stored in database, not deploy artifact |
| 11:30 | Manual config fix applied, rate limits restored |
| 11:45 | Error rates returning to normal |
| 12:30 | All queued transactions processed |
| 12:45 | Incident resolved, monitoring confirmed stable |

## Root Cause
The rate limiter configuration change (PR #4521) set the global rate
limit to 0 instead of 10,000. The config value was specified in
requests-per-second but the engineer entered requests-per-millisecond,
resulting in a value that rounded to 0.

## Contributing Factors
1. Config change had no validation (0 is a valid integer)
2. Config was not tested in staging (staging has different config path)
3. Rollback required database change, not just deploy rollback
4. Alert took 15 minutes to fire (threshold too high)

## What Went Well
- IC was assigned quickly and coordinated effectively
- Customer communication was timely (status page updated at 10:50)
- Team collaboration in war room was productive

## What Went Wrong
- Config change had no peer review requirement
- No canary for config changes
- Rollback path was not well understood
- Alert threshold was too high — could have caught earlier

## Action Items
| # | Action | Owner | Priority | Due Date |
|---|--------|-------|----------|----------|
| 1 | Add validation: rate limit > 0 | @alice | P0 | 2024-01-22 |
| 2 | Require peer review for config changes | @bob | P0 | 2024-01-22 |
| 3 | Add canary rollout for config changes | @carol | P1 | 2024-02-01 |
| 4 | Make config rollback-able via deploy pipeline | @dave | P1 | 2024-02-01 |
| 5 | Lower error rate alert threshold to 1% | @alice | P0 | 2024-01-17 |
| 6 | Add unit for config values (req/s label) | @bob | P2 | 2024-02-15 |
```

### 5 Whys Technique

```
Problem: Customers couldn't check out for 2 hours.

Why 1: The payment service rejected all requests.
Why 2: The rate limiter was set to 0 requests/second.
Why 3: A config change specified 0 instead of 10,000.
Why 4: The engineer entered the value in wrong units (ms vs s).
Why 5: The config system has no validation or unit labels.

Root Cause: Missing input validation and ambiguous configuration format.
Fix: Add validation (min > 0), explicit unit labels, and canary rollout.
```

:::tip Senior-Level Insight
The most valuable part of a postmortem is **action items with owners and due dates**. Without them, the postmortem is just documentation. Track action items in your project management tool, review completion in weekly SRE meetings, and close the postmortem only when all P0/P1 items are done.
:::

---

## 6. RTO vs RPO

| Metric | Definition | Question It Answers | Set By |
|--------|-----------|-------------------|--------|
| **RTO** (Recovery Time Objective) | Max acceptable time to restore service after disruption | "How long can we be down?" | Business requirements |
| **RPO** (Recovery Point Objective) | Max acceptable data loss measured in time | "How much data can we lose?" | Data criticality |

### RTO and RPO Illustrated

```
  Data Loss ◄─── RPO ───►│◄──── RTO ────►│ Recovery
                          │               │
  ──────────────────────── ─ ─ ─ ─ ─ ─ ─ ──────────────
  ▲                       ▲               ▲
  Last good               Disaster        Service
  backup                  occurs          restored

  RPO = 0  → No data loss acceptable (synchronous replication)
  RPO = 1h → Can lose up to 1 hour of data (hourly backups)
  RPO = 24h → Can lose up to 1 day of data (daily backups)

  RTO = 0  → No downtime acceptable (active-active)
  RTO = 1h → Must recover within 1 hour (warm standby)
  RTO = 24h → Can take up to 1 day to recover (backup & restore)
```

### RTO/RPO by Service Tier

| Service Tier | Example | RPO | RTO | DR Strategy |
|:------------:|---------|:---:|:---:|-------------|
| **Tier 0** | Payment processing | 0 | < 1 min | Multi-site active-active |
| **Tier 1** | Core API, user auth | < 1 min | < 15 min | Hot standby + auto-failover |
| **Tier 2** | Search, recommendations | < 1 hour | < 1 hour | Warm standby |
| **Tier 3** | Analytics, reporting | < 24 hours | < 4 hours | Pilot light |
| **Tier 4** | Dev/staging environments | < 7 days | < 24 hours | Backup & restore |

---

## 7. Backup Strategies

| Strategy | How It Works | RPO | Storage Cost | Restore Time | Restore Complexity |
|----------|-------------|:---:|:-----------:|:------------:|:-----------------:|
| **Full backup** | Complete copy of all data | Window between backups | High | Fast | Simple |
| **Incremental** | Only changes since last backup (any type) | Window between incrementals | Low | Slow (chain) | Complex |
| **Differential** | Changes since last full backup | Window between differentials | Medium | Medium | Moderate |
| **Continuous (WAL/CDC)** | Stream every change in real-time | Seconds | Medium-high | Fast | Moderate |
| **Snapshot** | Point-in-time filesystem snapshot | Snapshot interval | Low (CoW) | Fast | Simple |

### Backup Strategy Comparison

```
Full Backup:
  Mon: [██████████]  Full (10 GB)
  Tue: [██████████]  Full (10 GB)
  Wed: [██████████]  Full (10 GB)
  Total storage: 30 GB | Restore: pick any day

Incremental Backup:
  Mon: [██████████]  Full (10 GB)
  Tue: [██]          Changes since Mon (2 GB)
  Wed: [█]           Changes since Tue (1 GB)
  Total storage: 13 GB | Restore Wed: need Mon + Tue + Wed

Differential Backup:
  Mon: [██████████]  Full (10 GB)
  Tue: [██]          Changes since Mon (2 GB)
  Wed: [███]         Changes since Mon (3 GB)
  Total storage: 15 GB | Restore Wed: need Mon + Wed only
```

### The 3-2-1 Backup Rule

```
  3 copies of data     2 different media       1 offsite copy
  ┌──────────┐         ┌──────────┐           ┌──────────┐
  │ Primary  │         │ Local    │           │ Cloud /  │
  │ Database │         │ Disk     │           │ Offsite  │
  ├──────────┤         ├──────────┤           │ Region   │
  │ Backup 1 │         │ Tape /   │           └──────────┘
  ├──────────┤         │ Object   │
  │ Backup 2 │         │ Storage  │
  └──────────┘         └──────────┘
```

:::warning
Backups are worthless if you never test restores. Schedule regular **canary restores** — restore a backup to a test environment and verify data integrity. Teams frequently discover their backups are corrupt or incomplete only during an actual disaster.
:::

---

## 8. Disaster Recovery Patterns

### Pattern Comparison

| Pattern | RTO | RPO | Cost | Complexity | Use Case |
|---------|:---:|:---:|:----:|:----------:|----------|
| **Backup & Restore** | Hours | Hours-days | $ | Low | Dev, non-critical |
| **Pilot Light** | 10-30 min | Minutes | $$ | Medium | Core services (minimal footprint) |
| **Warm Standby** | Minutes | Seconds-min | $$$ | Medium-high | Business-critical |
| **Multi-Site Active-Active** | ~0 | ~0 | $$$$ | High | Mission-critical |

### Architecture Diagrams

```
Pattern 1: Backup & Restore

  Primary Region                     DR Region (cold)
  ┌──────────────────┐               ┌──────────────────┐
  │  App Servers     │               │                  │
  │  ████████████    │    Backups    │  (nothing        │
  │  Database        │───────────▶  │   running)       │
  │  ████████████    │    to S3      │                  │
  └──────────────────┘               │  Restore from    │
                                      │  backup when     │
                                      │  needed          │
                                      └──────────────────┘
  RTO: Hours | RPO: Last backup

────────────────────────────────────────────────────────────

Pattern 2: Pilot Light

  Primary Region                     DR Region
  ┌──────────────────┐               ┌──────────────────┐
  │  App Servers     │               │  (no app servers │
  │  ████████████    │               │   — launch on    │
  │  Database        │  Replication  │   demand)        │
  │  ████████████    │──────────────▶│  Database        │
  └──────────────────┘               │  ████████████    │
                                      │  (replica warm)  │
                                      └──────────────────┘
  RTO: 10-30 min | RPO: Minutes (replication lag)

────────────────────────────────────────────────────────────

Pattern 3: Warm Standby

  Primary Region                     DR Region
  ┌──────────────────┐               ┌──────────────────┐
  │  App Servers     │               │  App Servers     │
  │  ████████████    │               │  ████ (scaled    │
  │  Database        │  Replication  │       down)      │
  │  ████████████    │──────────────▶│  Database        │
  └──────────────────┘               │  ████████████    │
                                      │  (sync replica)  │
                                      └──────────────────┘
  RTO: Minutes | RPO: Seconds

────────────────────────────────────────────────────────────

Pattern 4: Multi-Site Active-Active

  Region A                            Region B
  ┌──────────────────┐               ┌──────────────────┐
  │  App Servers     │               │  App Servers     │
  │  ████████████    │◄─────────────▶│  ████████████    │
  │  Database        │  Bi-dir       │  Database        │
  │  ████████████    │  replication   │  ████████████    │
  └──────────────────┘               └──────────────────┘
         ▲                                  ▲
         │          ┌──────────┐            │
         └──────────│ Global   │────────────┘
                    │ Load     │
                    │ Balancer │
                    └──────────┘
  RTO: ~0 | RPO: ~0 (but conflict resolution needed)
```

---

## 9. Cross-Region DR

### Data Replication Strategies

| Strategy | RPO | Latency Impact | Consistency |
|----------|:---:|:--------------:|:-----------:|
| **Synchronous replication** | 0 | High (write waits for DR ack) | Strong |
| **Asynchronous replication** | Seconds-minutes | None (fire and forget) | Eventual |
| **Semi-synchronous** | ~0 | Moderate (ack from 1 replica) | Strong (usually) |

### DNS Failover

```
Normal Operation:
  api.example.com ──▶ Region A (primary)     ✅
                      Region B (standby)      (idle)

Failover:
  1. Health check detects Region A failure
  2. DNS TTL expires (or forced update)
  3. api.example.com ──▶ Region B (promoted)  ✅
                         Region A (down)       ❌

  Concerns:
  - DNS TTL propagation delay (30s - 5min)
  - Client DNS caching (may ignore TTL)
  - Mitigation: Use low TTL (30-60s) for critical services
```

### Traffic Rerouting Methods

| Method | Speed | Complexity | Use Case |
|--------|:-----:|:----------:|----------|
| **DNS failover** | 30s - 5 min | Low | Simple active-passive |
| **Global load balancer** | < 30s | Medium | Multi-region active-active |
| **Anycast routing** | Instant | High | CDN, DNS servers |
| **Service mesh routing** | < 10s | High | Microservices with Istio/Envoy |

---

## 10. DR Testing

Untested DR plans are just documentation. Regular testing validates that recovery procedures work.

### Testing Methods

| Method | Scope | Risk | Frequency | Description |
|--------|:-----:|:----:|:---------:|-------------|
| **Tabletop exercise** | Discussion | None | Quarterly | Walk through scenarios verbally |
| **Walkthrough** | Procedures | None | Quarterly | Step through runbooks without executing |
| **Component test** | Single system | Low | Monthly | Failover a single database or service |
| **Controlled failover** | Full stack | Medium | Semi-annually | Failover entire region in controlled manner |
| **Game day** | Production | Medium-high | Annually | Simulate real disaster in production |
| **Canary restore** | Data | Low | Weekly | Restore backup to test env, verify integrity |
| **Chaos engineering** | Production | Medium | Ongoing | Randomly inject failures (Chaos Monkey) |

### Game Day Template

```markdown
# Game Day: Region A Failover

## Objective
Validate that Region B can assume full production traffic
within RTO (15 minutes) when Region A becomes unavailable.

## Pre-Conditions
- [ ] Region B data replication lag < 5 seconds
- [ ] Region B app servers scaled to handle full traffic
- [ ] Rollback plan documented and reviewed
- [ ] Customer communication drafted (but not sent)
- [ ] All participants briefed

## Scenario
At 10:00 AM (low traffic), simulate Region A failure:
1. Block all traffic to Region A at load balancer
2. Stop accepting writes in Region A database
3. Observe automatic failover behavior
4. Measure time to full recovery in Region B

## Success Criteria
- [ ] Region B serving 100% traffic within 15 minutes
- [ ] No data loss (verify with canary records)
- [ ] All health checks green in Region B
- [ ] Alerts fired correctly during failover
- [ ] Customer-facing error rate < 1% during transition

## Rollback Plan
If failover fails:
1. Re-enable Region A at load balancer
2. Restore Region A writes
3. Redirect traffic back to Region A
```

:::tip Senior-Level Insight
The most important outcome of DR testing isn't "did it work?" — it's **"what did we learn?"** Every game day should produce a list of improvements. If your game days consistently pass without finding issues, you're not testing aggressively enough. Gradually increase scope and realism.
:::

---

## 11. Change Management

Most outages are caused by changes, not hardware failures. Effective change management reduces the blast radius of deployments.

### Change Management Practices

| Practice | Description | Impact |
|----------|-------------|--------|
| **Canary deploys** | Roll out to 1-5% of traffic first | Limits blast radius to small subset |
| **Blue-green deploys** | Run old and new versions simultaneously | Instant rollback by switching traffic |
| **Feature flags** | Decouple deploy from release | Kill switch for risky features |
| **Change review** | Peer review for all production changes | Catches errors before they reach prod |
| **Change windows** | Deploy during low-traffic periods | Reduces user impact of failures |
| **Progressive rollout** | 1% → 5% → 25% → 50% → 100% | Controlled exposure, early detection |
| **Rollback plan** | Document how to undo every change | Ensures fast recovery |
| **Blast radius tags** | Label changes by risk level | High-risk changes get extra scrutiny |

### Blast Radius Reduction

```
  Highest Risk                            Lowest Risk
  ◄──────────────────────────────────────────────────────►

  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Global  │  │ Regional │  │  Canary  │  │  Single  │
  │  Deploy  │  │  Deploy  │  │  Deploy  │  │   Host   │
  │  (all    │  │  (1      │  │  (1-5%   │  │  (1 pod) │
  │  regions)│  │  region) │  │  traffic)│  │          │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
   100% users    ~33% users    1-5% users    ~0.1% users
```

### Change Risk Assessment

| Risk Factor | Low Risk | Medium Risk | High Risk |
|------------|----------|-------------|-----------|
| **Scope** | Single config value | New feature flag | Database migration |
| **Reversibility** | Instant rollback | Rollback in minutes | Irreversible (data change) |
| **Blast radius** | Single service | Multiple services | All services / infra |
| **Testing** | Full test coverage | Partial coverage | Untested path |
| **Timing** | Off-peak hours | Normal hours | Peak traffic |

---

## 12. Incident Metrics

Track these metrics to measure and improve your incident response capability.

| Metric | Definition | Target |
|--------|-----------|--------|
| **MTTD** (Mean Time to Detect) | Time from incident start to alert | < 5 min |
| **MTTA** (Mean Time to Acknowledge) | Time from alert to human response | < 5 min |
| **MTTM** (Mean Time to Mitigate) | Time from detection to service restored | < 30 min (SEV1) |
| **MTTR** (Mean Time to Resolve) | Time from detection to root cause fixed | Varies |
| **MTBF** (Mean Time Between Failures) | Average time between incidents | Increasing trend |
| **Incident count** | Number of incidents per period | Decreasing trend |
| **Action item closure rate** | % of postmortem actions completed | > 90% |
| **Repeat incidents** | Incidents with same root cause as previous | 0 (goal) |

```
Incident Response Timeline:

  ◄── MTTD ──►◄── MTTA ──►◄────── MTTM ──────►◄── to fix ──►
  │            │            │                    │             │
  ▼            ▼            ▼                    ▼             ▼
Incident    Alert        Human              Service        Root cause
starts      fires        responds           restored       fixed

◄────────────────────── MTTR ──────────────────────────────►
```

---

## 13. Common Interview Questions — Incident Management & DR

| Question | Key Points |
|----------|------------|
| Walk through how you'd handle a SEV1 outage | Detection → IC assignment → triage → mitigation (rollback/failover) → communication → resolution → postmortem |
| What's in a good postmortem? | Timeline, impact, root cause, contributing factors, action items with owners and dates, blameless tone |
| RTO vs RPO — how do you choose values? | Business impact drives both; RPO = how much data loss is acceptable; RTO = how long downtime is tolerable; cost increases as both approach 0 |
| Compare DR patterns | Backup & restore (cheap, slow) → Pilot light → Warm standby → Active-active (expensive, fast) |
| How do you test DR plans? | Tabletop → walkthrough → component test → controlled failover → game day; test regularly, learn from each |
| What causes cascading failures during incidents? | No timeouts, no circuit breakers, shared resources, thundering herd on recovery; prevent with resilience patterns |

---
