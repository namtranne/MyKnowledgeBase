---
sidebar_position: 2
title: "01 — SRE Fundamentals"
slug: 01-sre-fundamentals
---

# 🏗️ SRE Fundamentals

Site Reliability Engineering is the discipline that applies software engineering practices to operations problems. Understanding SRE fundamentals — SLAs, SLOs, SLIs, error budgets, and toil — is essential for any senior engineer responsible for production systems.

---

## 1. SRE Philosophy

**Site Reliability Engineering** originated at Google in 2003 when Ben Treynor Sloss was tasked with running a production team. The core idea: **"class SRE implements DevOps."**

### SRE vs Traditional Ops vs DevOps

| Aspect | Traditional Ops | DevOps | SRE |
|--------|----------------|--------|-----|
| **Focus** | Stability above all | Culture + collaboration | Reliability via engineering |
| **Change attitude** | Resist change | Embrace change | Accept change within error budget |
| **Automation** | Manual runbooks | CI/CD pipelines | Automate everything; eliminate toil |
| **On-call** | Ops team only | Shared responsibility | Capped at 50% ops work |
| **Measurement** | Uptime % | Deployment frequency | SLOs, error budgets, burn rates |
| **Failure response** | Blame individuals | Blameless culture | Blameless postmortems + action items |

### Core SRE Tenets

1. **Reliability is the most important feature** — users can't use features if the service is down.
2. **SLOs drive decisions** — every reliability target is explicit and measurable.
3. **Error budgets unlock velocity** — teams spend budget on risk (new features, experiments).
4. **Toil is the enemy** — manual, repetitive, automatable work must be eliminated.
5. **50% cap on operational work** — SREs spend at least 50% of time on engineering projects.

:::tip Senior-Level Insight
Google's SRE model explicitly rejects 100% availability as a goal. Pursuing the last fraction of a nine costs exponentially more and slows feature development. The optimal reliability target balances user expectations, engineering cost, and business value.
:::

---

## 2. Service Level Indicators (SLIs)

An **SLI** is a quantitative measurement of some aspect of the service's behavior. It answers: _"How is the service performing right now?"_

### Choosing Good SLIs

| SLI Type | What It Measures | Example | Good For |
|----------|-----------------|---------|----------|
| **Availability** | Proportion of successful requests | `successful_requests / total_requests` | APIs, web services |
| **Latency** | Time to serve a request | p50, p95, p99 response time | User-facing services |
| **Throughput** | Rate of requests processed | Requests per second (RPS) | Data pipelines, batch jobs |
| **Error rate** | Proportion of failed requests | `errors / total_requests` | APIs, microservices |
| **Durability** | Likelihood data is retained | Proportion of data recoverable | Storage systems |
| **Freshness** | How recently data was updated | Time since last successful sync | Caches, replicas, search indices |
| **Correctness** | Proportion of correct results | Correct responses / total responses | ML inference, calculation services |

### SLI Specification vs Implementation

```
SLI Specification (what to measure):
  "The proportion of homepage requests that load in < 200ms"

SLI Implementation (how to measure):
  Option A: Server-side latency from load balancer logs
  Option B: Client-side latency from Real User Monitoring (RUM)
  Option C: Synthetic monitoring probes from multiple regions
```

:::warning
Server-side SLIs miss network latency experienced by users. Client-side SLIs include device rendering time you can't control. Choose the measurement point closest to the user experience you care about.
:::

### SLI Measurement Points

```
  Client                  CDN / LB           App Server           Database
    │                        │                    │                   │
    ├──── Request ──────────▶│                    │                   │
    │                        ├──── Forward ──────▶│                   │
    │                        │                    ├──── Query ───────▶│
    │                        │                    │◀─── Result ───────┤
    │                        │◀─── Response ──────┤                   │
    │◀─── Response ──────────┤                    │                   │
    │                        │                    │                   │
    ▲                        ▲                    ▲                   ▲
  Client SLI           Edge SLI            Server SLI          DB SLI
 (RUM / JS)          (LB access log)     (app metrics)       (query time)
```

---

## 3. Service Level Objectives (SLOs)

An **SLO** is a target value or range for a service level measured by an SLI. It answers: _"How reliable should the service be?"_

### SLO Structure

```
SLO = SLI + Target + Time Window

Example:
  "99.9% of HTTP requests will return a successful response
   within 200ms, measured over a rolling 30-day window."
```

### Choosing SLO Targets

| Factor | Guidance |
|--------|----------|
| **User expectations** | What reliability level makes users happy? |
| **Business requirements** | What does the business need to function? |
| **Dependency SLOs** | Your SLO can't exceed your weakest dependency |
| **Engineering cost** | Each additional nine costs ~10× more |
| **Current performance** | Set SLOs based on achievable targets, not aspirations |
| **Competition** | Match or beat competitor reliability |

### SLO Examples by Service Type

| Service Type | SLI | SLO Target | Window |
|-------------|-----|------------|--------|
| Payment API | Availability | 99.99% | 30 days |
| Payment API | Latency (p99) | < 500ms | 30 days |
| Homepage | Availability | 99.9% | 30 days |
| Homepage | Latency (p95) | < 200ms | 30 days |
| Batch pipeline | Freshness | Data < 1 hour old | 30 days |
| Search index | Correctness | 99.5% relevant results | 30 days |

:::tip Senior-Level Insight
Start with **fewer, well-chosen SLOs** rather than many weak ones. A common mistake is creating an SLO for every metric. Focus on SLOs that correlate with user happiness. If users aren't complaining when the SLO is met, it's a good SLO.
:::

---

## 4. Service Level Agreements (SLAs)

An **SLA** is a formal contract between a service provider and a customer that specifies consequences when SLOs are not met. It answers: _"What happens when we break our promises?"_

### SLA vs SLO vs SLI

| Concept | Audience | Binding? | Example |
|---------|----------|----------|---------|
| **SLI** | Engineers | No | p99 latency = 142ms |
| **SLO** | Engineering team | Internally | p99 latency < 200ms, 99.9% of time |
| **SLA** | Customers / Legal | Yes (contract) | p99 latency < 300ms or service credits |

### Relationship Hierarchy

```
  ┌────────────────────────────────────────────────────┐
  │                    SLA (External)                   │
  │  "99.9% availability or we issue service credits"   │
  │                                                     │
  │   ┌──────────────────────────────────────────────┐  │
  │   │              SLO (Internal)                   │  │
  │   │  "99.95% availability target"                 │  │
  │   │  (tighter than SLA → buffer for safety)       │  │
  │   │                                               │  │
  │   │   ┌────────────────────────────────────────┐  │  │
  │   │   │           SLI (Measurement)            │  │  │
  │   │   │  "Successful requests / total requests"│  │  │
  │   │   └────────────────────────────────────────┘  │  │
  │   └──────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────┘
```

### Real-World SLA Examples

| Provider | SLA | Penalty |
|----------|-----|---------|
| AWS EC2 | 99.99% monthly uptime | 10% credit (< 99.99%), 30% credit (< 99.0%) |
| Google Cloud | 99.95% monthly uptime | 10-50% credit depending on downtime |
| Stripe API | 99.99% uptime | Service credits |
| PagerDuty | 99.9% uptime | Credit for affected period |

:::warning
Always set SLOs **tighter** than SLAs. If your SLA is 99.9%, your internal SLO should be 99.95% or higher. This gives you a safety buffer before contractual penalties kick in.
:::

---

## 5. Calculating Availability — The Nines Table

### Downtime per Nines Level

| Availability % | "Nines" | Downtime/Year | Downtime/Month | Downtime/Week |
|:-:|:-:|:-:|:-:|:-:|
| 99% | Two nines | 3.65 days | 7.31 hours | 1.68 hours |
| 99.9% | Three nines | 8.76 hours | 43.83 min | 10.08 min |
| 99.95% | Three and a half | 4.38 hours | 21.92 min | 5.04 min |
| 99.99% | Four nines | 52.60 min | 4.38 min | 1.01 min |
| 99.999% | Five nines | 5.26 min | 26.30 sec | 6.05 sec |
| 99.9999% | Six nines | 31.56 sec | 2.63 sec | 0.60 sec |

### Calculating Compound Availability

When services depend on each other, overall availability is the **product** of individual availabilities (for serial dependencies).

```
Serial dependency (A → B → C):
  A_total = A_a × A_b × A_c
  = 0.999 × 0.999 × 0.999
  = 0.997 (99.7%)
  ≈ 26.3 hours downtime/year

Parallel redundancy (A || B):
  A_total = 1 - (1 - A_a) × (1 - A_b)
  = 1 - (0.001) × (0.001)
  = 1 - 0.000001
  = 0.999999 (99.9999%)
```

```
 Serial (all must work):           Parallel (any one works):

 ┌───┐   ┌───┐   ┌───┐            ┌───┐
 │ A │──▶│ B │──▶│ C │          ┌─│ A │─┐
 └───┘   └───┘   └───┘          │ └───┘ │
                              ──┤       ├──
 Total = A × B × C              │ ┌───┐ │
                                 └─│ B │─┘
                                   └───┘
                              Total = 1-(1-A)(1-B)
```

:::tip Senior-Level Insight
A service calling 10 downstream dependencies, each at 99.9%, has a compound availability of 99.9%^10 = **99.0%** — dropping from three nines to two nines. This is why minimizing critical-path dependencies matters enormously.
:::

---

## 6. Error Budgets

An **error budget** is the maximum allowable threshold for errors and downtime. It is derived directly from the SLO.

### Calculating Error Budget

```
Error Budget = 1 − SLO

Example:
  SLO = 99.9% availability
  Error Budget = 1 − 0.999 = 0.1% = 0.001

  Over 30 days:
  Budget = 30 days × 24h × 60min × 0.001 = 43.2 minutes of downtime
  Budget = 30 days × 24h × 3600s × 0.001 = 2,592 seconds of downtime

  If you serve 1,000,000 requests/day in 30 days:
  Budget = 30,000,000 × 0.001 = 30,000 failed requests allowed
```

### Error Budget Consumption Tracker

```
Error Budget: 43.2 min / month (SLO = 99.9%)

Week 1: Deploy caused 5 min outage          ████░░░░░░  11.6% used
Week 2: DB failover took 8 min              █████████░  30.1% used
Week 3: Network blip lost 2 min             ██████████  34.7% used
Week 4: Remaining budget                    ░░░░░░░░░░  28.2 min left

Status: ✅ Budget healthy — can proceed with risky deploys
```

### How Error Budgets Drive Decisions

| Budget Status | Action |
|:--|:--|
| **Budget healthy (> 50% remaining)** | Ship new features, experiment, take risks |
| **Budget warning (25-50% remaining)** | Proceed cautiously, reduce deploy frequency |
| **Budget critical (< 25% remaining)** | Focus on reliability, limit risky changes |
| **Budget exhausted (0% remaining)** | Feature freeze, all hands on reliability |

---

## 7. Error Budget Policies

An **error budget policy** defines explicit actions to take when the error budget is consumed at various thresholds.

### Sample Error Budget Policy

| Threshold | Actions |
|-----------|---------|
| **Budget > 50%** | Normal operations. Ship features, run experiments. |
| **Budget 25-50%** | Increase review rigor. Require SRE approval for risky changes. |
| **Budget 10-25%** | Halt non-critical deploys. Prioritize reliability work. Escalate to engineering leadership. |
| **Budget < 10%** | Feature freeze. All engineering effort on reliability. Incident-level response to any new issues. |
| **Budget exhausted** | Complete change freeze except reliability fixes. Postmortem required for budget depletion. Leadership review. |

```python
class ErrorBudgetPolicy:
    def __init__(self, slo: float, window_days: int = 30):
        self.slo = slo
        self.budget_total = (1 - slo) * window_days * 24 * 60  # minutes
        self.budget_remaining = self.budget_total

    def consume(self, downtime_minutes: float):
        self.budget_remaining -= downtime_minutes
        ratio = self.budget_remaining / self.budget_total

        if ratio <= 0:
            return "FREEZE: Budget exhausted — feature freeze"
        elif ratio <= 0.10:
            return "CRITICAL: Halt non-critical deploys"
        elif ratio <= 0.25:
            return "WARNING: Increase review rigor"
        elif ratio <= 0.50:
            return "CAUTION: Proceed carefully"
        else:
            return "HEALTHY: Normal operations"

policy = ErrorBudgetPolicy(slo=0.999, window_days=30)
print(f"Total budget: {policy.budget_total:.1f} min")  # 43.2 min
print(policy.consume(5.0))   # HEALTHY
print(policy.consume(15.0))  # CAUTION
print(policy.consume(15.0))  # CRITICAL
print(policy.consume(10.0))  # FREEZE
```

:::tip Senior-Level Insight
Error budget policies only work if leadership commits to enforcing them. The policy must be agreed upon **before** incidents happen — not negotiated during a crisis. Document it, get sign-off from product and engineering leaders, and refer to it during SLO review meetings.
:::

---

## 8. Toil

**Toil** is manual, repetitive, automatable, tactical, devoid of enduring value, and scales linearly with service growth. Google's SRE book defines toil as work that "tends to be manual, repetitive, automatable, tactical, without enduring value, and O(n) with service growth."

### Identifying Toil

| Characteristic | Example | Not Toil |
|---------------|---------|----------|
| **Manual** | SSH into server to restart a process | Writing automation to auto-restart |
| **Repetitive** | Running the same deploy script every week | Designing a new deployment system |
| **Automatable** | Copying logs from server to analysis tool | Investigating a novel incident |
| **Reactive** | Responding to the same alert type repeatedly | Proactive capacity planning |
| **No enduring value** | Manually scaling up before a traffic spike | Building auto-scaling infrastructure |
| **O(n) with growth** | Adding config for each new customer manually | Building self-service onboarding |

### Toil Budget

Google targets a **50% cap on toil** for SRE teams. If toil exceeds 50%, something is structurally wrong.

```
Ideal SRE Time Distribution:

  Engineering work (projects)  ████████████████████  50%
  On-call + incidents          ██████████            25%
  Toil (manual ops)            ██████                15%
  Overhead (meetings, etc.)    ████                  10%
                               ─────────────────────────
                               Total                 100%
```

### Toil Reduction Strategies

| Strategy | Example |
|----------|---------|
| **Eliminate** | Remove the need entirely (e.g., self-healing systems) |
| **Automate** | Script repetitive tasks (e.g., auto-remediation runbooks) |
| **Reduce frequency** | Batch operations (e.g., weekly deploys instead of daily manual ones) |
| **Shift left** | Make developers handle their own service's toil (ownership) |
| **Simplify** | Reduce system complexity so less toil is generated |

---

## 9. SLO-Based Alerting

Traditional alerting fires on **thresholds** (e.g., CPU > 80%). SLO-based alerting fires when the **error budget is being consumed too quickly**.

### Burn Rate

**Burn rate** measures how fast the error budget is being consumed relative to the SLO window.

```
Burn Rate = (error rate observed) / (error rate allowed by SLO)

Example:
  SLO = 99.9% → allowed error rate = 0.1%
  Observed error rate = 0.5%
  Burn rate = 0.5% / 0.1% = 5×

  At 5× burn rate, a 30-day budget is consumed in 6 days.
  Time to exhaustion = window / burn_rate = 30 / 5 = 6 days
```

### Multi-Window, Multi-Burn-Rate Alerts

| Alert | Burn Rate | Long Window | Short Window | Severity | Action |
|-------|:---------:|:-----------:|:------------:|:--------:|--------|
| Page (urgent) | 14.4× | 1 hour | 5 min | P1 — Page | 2% budget consumed in 1 hour |
| Page (moderate) | 6× | 6 hours | 30 min | P2 — Page | 5% budget consumed in 6 hours |
| Ticket (slow) | 3× | 1 day | 2 hours | P3 — Ticket | 10% budget consumed in 1 day |
| Ticket (gradual) | 1× | 3 days | 6 hours | P4 — Ticket | Budget on track to exhaust |

```
Multi-Window Alert Logic (pseudocode):

alert_fires = (
    error_rate_long_window > (1 - SLO) × burn_rate
    AND
    error_rate_short_window > (1 - SLO) × burn_rate
)
```

The **long window** detects sustained budget consumption. The **short window** confirms the issue is still happening (avoids alert on a resolved spike).

:::warning
Avoid alerting on raw metrics like CPU or memory. These are **causes**, not **symptoms**. Users don't care about CPU — they care about latency and errors. Alert on SLIs that correlate with user pain, then investigate causes during triage.
:::

---

## 10. Production Readiness Review (PRR)

A **Production Readiness Review** is a structured checklist that ensures a new service meets reliability standards before launch.

### PRR Checklist Template

| Category | Check | Status |
|----------|-------|:------:|
| **SLOs** | SLOs defined and agreed with stakeholders | ☐ |
| **SLOs** | SLI instrumentation in place | ☐ |
| **SLOs** | Error budget policy documented | ☐ |
| **Monitoring** | Dashboards for key metrics (latency, errors, saturation) | ☐ |
| **Monitoring** | SLO-based alerts configured | ☐ |
| **Monitoring** | Logging with structured format and appropriate levels | ☐ |
| **Monitoring** | Distributed tracing enabled | ☐ |
| **Incident Response** | Runbook written and reviewed | ☐ |
| **Incident Response** | On-call rotation established | ☐ |
| **Incident Response** | Escalation path documented | ☐ |
| **Resilience** | Circuit breakers on downstream calls | ☐ |
| **Resilience** | Timeout and retry policies configured | ☐ |
| **Resilience** | Graceful degradation for non-critical dependencies | ☐ |
| **Resilience** | Load testing completed | ☐ |
| **Resilience** | Chaos testing performed | ☐ |
| **Data** | Backup and restore tested | ☐ |
| **Data** | Data retention policies set | ☐ |
| **Security** | AuthN/AuthZ in place | ☐ |
| **Security** | Secrets managed properly (no hardcoded secrets) | ☐ |
| **Security** | Input validation and rate limiting | ☐ |
| **Capacity** | Capacity plan documented | ☐ |
| **Capacity** | Auto-scaling configured and tested | ☐ |
| **Deployment** | Canary / blue-green deployment pipeline | ☐ |
| **Deployment** | Rollback procedure tested | ☐ |
| **Deployment** | Feature flags for risky changes | ☐ |

### PRR Workflow

```
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Design   │───▶│  Build   │───▶│  PRR     │───▶│ Launch   │
  │ Review   │    │ & Test   │    │ Review   │    │ to Prod  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                       │
                                  ┌────┴────┐
                                  │ Gaps?   │
                                  │ Fix &   │
                                  │ Re-review│
                                  └─────────┘
```

:::tip Senior-Level Insight
PRRs shouldn't be a gate that blocks launches — they should be a **partnership** between development teams and SRE. The best PRRs are iterative: start early in the design phase, not as a last-minute checkbox. If a team consistently passes PRRs easily, that's a sign the process is working.
:::

---

## 11. SRE Team Models

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Centralized SRE** | Single SRE team supports all services | Consistent practices, shared tooling | Bottleneck, limited domain expertise |
| **Embedded SRE** | SREs sit within product teams | Deep domain knowledge, faster response | Inconsistent practices across teams |
| **Consulting SRE** | SREs advise but don't own operations | Scales well, empowers dev teams | Less hands-on, slower adoption |
| **Platform SRE** | SREs build reliability platform/tooling | Leverage across org, self-service | Disconnected from production services |
| **Hybrid** | Mix of embedded + platform SREs | Balances expertise with scale | Complex organizational structure |

---

## 12. Key Formulas — Quick Reference

| Formula | Expression | Example |
|---------|------------|---------|
| **Availability** | `successful / total` | 999,000 / 1,000,000 = 99.9% |
| **Error Budget** | `1 − SLO` | 1 − 0.999 = 0.001 (0.1%) |
| **Budget (minutes)** | `(1 − SLO) × window_min` | 0.001 × 43,200 = 43.2 min |
| **Burn Rate** | `observed_error_rate / allowed_error_rate` | 0.5% / 0.1% = 5× |
| **Time to Exhaust** | `window / burn_rate` | 30 days / 5 = 6 days |
| **Compound (serial)** | `A₁ × A₂ × ... × Aₙ` | 0.999³ = 0.997 |
| **Compound (parallel)** | `1 − (1−A₁)(1−A₂)...(1−Aₙ)` | 1 − 0.001² = 0.999999 |

---

## 13. Common Interview Questions — SRE Fundamentals

| Question | Key Points to Cover |
|----------|-------------------|
| What's the difference between SLA, SLO, and SLI? | SLI measures, SLO targets, SLA contracts with penalties |
| How do you choose SLOs for a new service? | User expectations, dependency SLOs, cost of nines, current baseline |
| Explain error budgets and how they affect feature velocity | Budget = 1 − SLO; healthy → ship fast; exhausted → freeze features |
| What is toil and how do you reduce it? | Manual, repetitive, automatable work; 50% cap; automate or eliminate |
| How would you set up alerting for SLOs? | Burn rate alerts, multi-window, alert on symptoms not causes |
| Your service has 10 dependencies each at 99.9% — what's overall availability? | 99.9%^10 ≈ 99.0% — two nines, must reduce critical deps or add redundancy |
| What happens when an error budget is exhausted? | Follow error budget policy: feature freeze, reliability focus, leadership review |

---
