---
sidebar_position: 4
title: "03 — Deployment Strategies"
slug: 03-deployment-strategies
---

# 🚀 Deployment Strategies

How you deploy changes to production determines whether your releases are boring non-events or high-stress fire drills. This chapter covers every deployment strategy a senior engineer needs to know — from rolling updates to progressive delivery — along with feature flags, zero-downtime migrations, and rollback planning.

---

## 1. Rolling Deployment

A rolling deployment gradually replaces old instances with new ones, one batch at a time, until all instances are running the new version.

```
Rolling Deployment (4 replicas, maxSurge=1, maxUnavailable=1)

Time 0:  [v1] [v1] [v1] [v1]       ← all old
Time 1:  [v1] [v1] [v1] [  ] [v2]  ← one removed, one new starting
Time 2:  [v1] [v1] [  ] [v2] [v2]  ← progressing
Time 3:  [v1] [  ] [v2] [v2] [v2]  ← progressing
Time 4:  [v2] [v2] [v2] [v2]       ← all new
```

### Kubernetes Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # max extra pods during update
      maxUnavailable: 1    # max pods that can be unavailable
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:2.0.0
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
```

| Parameter | Description | Trade-off |
|-----------|-------------|-----------|
| **maxSurge** | Extra pods allowed above desired count | Higher = faster rollout, more resources |
| **maxUnavailable** | Pods allowed to be down during update | Higher = faster rollout, lower capacity |
| **minReadySeconds** | Wait time before marking pod as available | Higher = safer but slower |

| Advantage | Disadvantage |
|-----------|-------------|
| Zero downtime (when configured correctly) | Two versions run simultaneously |
| Built into Kubernetes natively | Rollback takes time (reverse rolling update) |
| Simple to configure | Database compatibility required for both versions |
| No extra infrastructure cost | Hard to test with specific traffic % |

---

## 2. Blue-Green Deployment

Blue-green deployment maintains two identical environments. Only one serves production traffic at a time. The switch is instant — just update the router/load balancer.

```
┌──────────────────────────────────────────────────────────────────┐
│                   Blue-Green Deployment                           │
│                                                                   │
│                   ┌──────────────┐                                │
│                   │ Load Balancer│                                │
│                   │   / Router   │                                │
│                   └──────┬───────┘                                │
│                          │                                        │
│            ┌─────────────┼─────────────┐                         │
│            │             │             │                          │
│            ▼             │             ▼                          │
│   ┌──────────────┐       │    ┌──────────────┐                   │
│   │  BLUE (v1)   │       │    │  GREEN (v2)  │                   │
│   │  ──────────  │       │    │  ──────────  │                   │
│   │  [v1] [v1]   │◀──LIVE│    │  [v2] [v2]   │ ← idle / testing │
│   │  [v1] [v1]   │       │    │  [v2] [v2]   │                   │
│   └──────────────┘       │    └──────────────┘                   │
│                          │                                        │
│   After verification:    │                                        │
│                          │                                        │
│   ┌──────────────┐       │    ┌──────────────┐                   │
│   │  BLUE (v1)   │       │    │  GREEN (v2)  │                   │
│   │  ──────────  │       │    │  ──────────  │                   │
│   │  [v1] [v1]   │ idle  │───▶│  [v2] [v2]   │◀── LIVE          │
│   │  [v1] [v1]   │       │    │  [v2] [v2]   │                   │
│   └──────────────┘       │    └──────────────┘                   │
│                                                                   │
│   Rollback: Switch router back to Blue — instant                  │
└──────────────────────────────────────────────────────────────────┘
```

| Advantage | Disadvantage |
|-----------|-------------|
| Instant switch (DNS or LB rule change) | Double the infrastructure cost |
| Instant rollback (switch back) | Database must be compatible with both versions |
| Full testing of new version before go-live | Stateful services are complex (shared DB) |
| Zero downtime | Idle environment costs money |

### Implementation with AWS

```bash
# Using AWS ALB target groups
# Blue target group: tg-blue (currently active)
# Green target group: tg-green (new version deployed)

# Switch traffic from Blue to Green
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:...:listener/... \
  --default-actions '[{
    "Type": "forward",
    "TargetGroupArn": "arn:aws:...:targetgroup/tg-green/..."
  }]'

# Rollback: switch back to Blue
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:...:listener/... \
  --default-actions '[{
    "Type": "forward",
    "TargetGroupArn": "arn:aws:...:targetgroup/tg-blue/..."
  }]'
```

:::tip Senior-Level Insight
Blue-green deployments shine when you need the ability to instantly roll back. The key challenge is the database — if v2 ran migrations, switching back to v1 might break. The solution is to decouple database migrations from application deployments: run expand-phase migrations before the switch, and contract-phase cleanup after confirming v2 is stable.
:::

---

## 3. Canary Deployment

A canary deployment sends a small percentage of production traffic to the new version. If metrics are healthy, traffic is gradually shifted until the new version serves 100%.

```
Canary Deployment — Progressive Traffic Shift

Phase 1 (5% canary):
┌─────────────────────────────────────────────────┐
│           Load Balancer (95/5 split)             │
│      ┌──────────────┐    ┌──────────────┐       │
│      │  Stable (v1) │    │ Canary (v2)  │       │
│      │  ══════════  │    │ ══════════   │       │
│      │  95% traffic │    │  5% traffic  │       │
│      │  [v1]x10     │    │  [v2]x1      │       │
│      └──────────────┘    └──────────────┘       │
│      Monitor: error rate, latency, saturation    │
└─────────────────────────────────────────────────┘
           │
           ▼  Metrics healthy? → promote
Phase 2 (25%):   [v1] 75%  ←→  [v2] 25%
           │
           ▼  Metrics healthy? → promote
Phase 3 (50%):   [v1] 50%  ←→  [v2] 50%
           │
           ▼  Metrics healthy? → promote
Phase 4 (100%):               [v2] 100%  ← fully rolled out
```

### Canary Promotion Criteria

| Metric | Threshold | Action if Violated |
|--------|-----------|-------------------|
| **Error rate (5xx)** | < 0.5% (or no increase vs baseline) | Auto-rollback |
| **P99 latency** | < 500ms (or < 10% increase vs baseline) | Auto-rollback |
| **CPU/Memory** | Within 20% of baseline | Investigate, pause rollout |
| **Business metrics** | Conversion rate stable | Pause and investigate |
| **Custom health** | App-specific (e.g., payment success rate) | Auto-rollback |

### Kubernetes Canary with Istio

```yaml
# VirtualService — traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
    - my-app.example.com
  http:
    - route:
        - destination:
            host: my-app-stable
            port:
              number: 80
          weight: 95
        - destination:
            host: my-app-canary
            port:
              number: 80
          weight: 5
```

---

## 4. A/B Testing Deployment

A/B testing routes traffic based on **user attributes** (not random percentage) to compare feature variants and measure business outcomes.

```
A/B Testing — User-Segment-Based Routing

┌──────────────────────────────────────────────────────────────┐
│                    Traffic Router                              │
│                                                               │
│  Rules:                                                       │
│  ├── User in segment "beta-testers" → Version B              │
│  ├── User in region "us-west" → Version B                    │
│  ├── User with account age > 1yr → Version B                 │
│  └── Everyone else → Version A                               │
│                                                               │
│       ┌──────────────┐         ┌──────────────┐              │
│       │ Version A    │         │ Version B    │              │
│       │ (control)    │         │ (experiment) │              │
│       │              │         │              │              │
│       │ Old checkout │         │ New checkout │              │
│       │ flow         │         │ flow         │              │
│       └──────────────┘         └──────────────┘              │
│                                                               │
│  Measure: conversion rate, revenue, engagement, bounce rate   │
│  Requires: statistical significance before declaring winner   │
└──────────────────────────────────────────────────────────────┘
```

| Aspect | Canary | A/B Test |
|--------|--------|----------|
| **Goal** | Validate technical stability | Measure business impact |
| **Traffic split** | Random percentage | User-segment-based |
| **Duration** | Minutes to hours | Days to weeks |
| **Metrics** | Error rate, latency | Conversion, revenue, engagement |
| **Decision** | Automated (metrics-based) | Manual (statistical significance) |
| **Rollback** | Automatic on failure | Manual after analysis |

---

## 5. Shadow / Dark Deployment

A shadow deployment mirrors production traffic to the new version **without serving responses back to users**. The new version processes real traffic but its responses are discarded — only observed for correctness and performance.

```
Shadow / Dark Deployment

┌────────────────────────────────────────────────────────┐
│                                                         │
│  User Request ─────┐                                    │
│                    │                                    │
│                    ▼                                    │
│            ┌──────────────┐                             │
│            │ Traffic      │                             │
│            │ Splitter     │                             │
│            └──────┬───────┘                             │
│                   │                                     │
│         ┌─────────┼─────────┐                          │
│         │         │         │                           │
│         ▼         │         ▼                           │
│  ┌──────────┐     │  ┌──────────┐                      │
│  │ Prod v1  │     │  │Shadow v2 │                      │
│  │ (serves  │     │  │(receives │                      │
│  │ response)│     │  │ traffic, │                      │
│  └────┬─────┘     │  │ response │                      │
│       │           │  │ discarded│                      │
│       ▼           │  └────┬─────┘                      │
│  User gets        │       │                             │
│  v1 response      │       ▼                             │
│                   │  Compare: latency, errors,          │
│                   │  correctness vs v1                   │
│                   │                                     │
└────────────────────────────────────────────────────────┘
```

| Advantage | Disadvantage |
|-----------|-------------|
| Zero risk to users (responses discarded) | Double the compute cost |
| Tests with real production traffic patterns | Write operations are dangerous (must be idempotent or no-op) |
| Validates performance under real load | Complex to set up traffic mirroring |
| Great for ML model validation | Can't test user-facing behavior changes |

:::warning
Shadow deployments are dangerous for write operations. If the shadow version writes to a database, sends emails, or charges credit cards, you'll have duplicated side effects. Use shadow deployments only for read-heavy services, or ensure write operations are no-op'd in the shadow environment.
:::

---

## 6. Deployment Strategy Comparison

| Strategy | Downtime | Rollback Speed | Resource Cost | Complexity | Risk Level | Best For |
|----------|:--------:|:--------------:|:------------:|:----------:|:----------:|----------|
| **Rolling** | None | Medium (reverse roll) | Low (same infra) | Low | Medium | Standard stateless services |
| **Blue-Green** | None | Instant (switch back) | High (2x infra) | Medium | Low | Critical services needing instant rollback |
| **Canary** | None | Fast (shift traffic) | Low–Medium | High | Low | High-traffic services, risk-averse teams |
| **A/B Testing** | None | Medium | Low–Medium | High | Low | Feature experimentation |
| **Shadow** | None | N/A (not serving) | High (2x compute) | High | Very Low | ML models, major rewrites |
| **Recreate** | Yes | Slow (redeploy old) | Low | Very Low | High | Dev/test environments, stateful apps |

---

## 7. Feature Flags

Feature flags decouple **deployment** from **release**. Code is deployed to production but features are activated independently through configuration.

### Feature Flag Types

| Type | Purpose | Lifetime | Example |
|------|---------|----------|---------|
| **Release flag** | Gate incomplete features | Days–weeks | `new-checkout-flow` |
| **Experiment flag** | A/B test variants | Days–weeks | `checkout-button-color` |
| **Ops flag** | Circuit breaker / kill switch | Permanent | `enable-recommendation-service` |
| **Permission flag** | User-tier access control | Permanent | `premium-analytics-dashboard` |

### Flag Evaluation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  Feature Flag Evaluation                          │
│                                                                   │
│  Application Code                                                 │
│  ┌───────────────────────────────────────────────────┐            │
│  │  if (featureFlags.isEnabled("new-checkout",       │            │
│  │      context: { userId, region, plan })) {         │            │
│  │      renderNewCheckout();                          │            │
│  │  } else {                                          │            │
│  │      renderOldCheckout();                          │            │
│  │  }                                                 │            │
│  └────────────────────┬──────────────────────────────┘            │
│                       │                                           │
│                       ▼                                           │
│  ┌───────────────────────────────────────────────────┐            │
│  │  Flag Management Service                          │            │
│  │  ┌───────────────────────────────────────────┐    │            │
│  │  │  Rules Engine                              │    │            │
│  │  │  ├── 100% ON for internal employees       │    │            │
│  │  │  ├── 25% rollout for US users             │    │            │
│  │  │  ├── 0% for EU users (GDPR review)        │    │            │
│  │  │  └── Kill switch: OFF globally if needed  │    │            │
│  │  └───────────────────────────────────────────┘    │            │
│  └───────────────────────────────────────────────────┘            │
│                                                                   │
│  Evaluation factors: userId, region, plan, percentage,            │
│                      device, custom attributes                    │
└──────────────────────────────────────────────────────────────────┘
```

### Feature Flag Best Practices

| Practice | Why |
|----------|-----|
| **Short-lived release flags** | Remove after feature is fully rolled out; dead flags are tech debt |
| **Flag naming convention** | `team.feature.variant` (e.g., `checkout.new-flow.enabled`) |
| **Default to OFF** | New flags should be disabled by default |
| **Kill switch for every feature** | Ability to instantly disable any feature in production |
| **Audit log** | Track who changed what flag, when |
| **Stale flag alerts** | Alert if a flag hasn't been cleaned up after N days |
| **Testing with flags** | Test both ON and OFF paths in CI |

---

## 8. Feature Flag Architecture

### Client-Side vs Server-Side

| Aspect | Server-Side Flags | Client-Side Flags |
|--------|------------------|------------------|
| **Evaluation** | On the server per request | In the browser/app |
| **Latency** | Network round-trip to flag service | Local evaluation (cached rules) |
| **Security** | Flag rules hidden from users | Rules visible in client bundle |
| **Use case** | Backend logic, API behavior | UI features, layout changes |
| **Update speed** | Instant (server fetches on each request) | Polling interval (e.g., every 30s) |

### Flag Management Platforms

| Platform | Type | Key Features | Pricing |
|----------|------|-------------|---------|
| **LaunchDarkly** | SaaS | Real-time streaming, targeting, experiments | Per seat + MAU |
| **Unleash** | Open-source / SaaS | Self-hostable, strategies, variants | Free (OSS) / paid |
| **Flagsmith** | Open-source / SaaS | Self-hostable, remote config | Free (OSS) / paid |
| **Split** | SaaS | Feature delivery + metrics | Per seat |
| **ConfigCat** | SaaS | Simple, generous free tier | Per config reads |
| **Custom (DB/Config)** | Self-built | Full control | Engineering time |

:::tip Senior-Level Insight
In interviews, discuss **flag tech debt**. Every feature flag is an `if/else` branch that increases code complexity and test surface area. Establish a process: after a feature is fully rolled out (100% for 2+ weeks), remove the flag. Track flag age in your management platform and create tickets for flags older than 30 days. Some teams enforce this with automated alerts or even build failures for expired flags.
:::

---

## 9. Zero-Downtime Database Migrations

Database changes are the riskiest part of any deployment. Unlike application code, you can't simply "roll back" a destructive schema change.

### The Expand-Contract Pattern

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  STEP 1: EXPAND — Add new structure alongside old                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ALTER TABLE users ADD COLUMN full_name VARCHAR(255);          │  │
│  │  -- "name" column still exists and works                       │  │
│  │  -- Both old and new code work with this schema                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  STEP 2: MIGRATE — Deploy dual-write code + backfill                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  App v2: writes to BOTH "name" AND "full_name"                 │  │
│  │  Background job: backfill full_name = name WHERE full_name NULL│  │
│  │  Reads prefer "full_name", fallback to "name"                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  STEP 3: SWITCH — Deploy code that only uses new column              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  App v3: reads/writes "full_name" only                         │  │
│  │  Verify: all rows have full_name populated                     │  │
│  │  Monitor: no queries using "name" column                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  STEP 4: CONTRACT — Remove old structure (separate deploy)           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ALTER TABLE users DROP COLUMN name;                           │  │
│  │  -- Only after confirming no code references "name"            │  │
│  │  -- This is a one-way door — make sure!                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Common Migration Patterns

| Change | Dangerous Approach | Safe Approach |
|--------|--------------------|---------------|
| **Rename column** | `ALTER TABLE RENAME COLUMN` | Add new column → dual-write → backfill → switch → drop old |
| **Change column type** | `ALTER TABLE ALTER COLUMN TYPE` | Add new column of new type → backfill with conversion → switch → drop |
| **Add NOT NULL** | `ALTER TABLE ALTER COLUMN SET NOT NULL` | Add default → backfill NULLs → then add NOT NULL constraint |
| **Drop column** | `ALTER TABLE DROP COLUMN` | Remove all code references first → deploy → then drop column |
| **Add index** | `CREATE INDEX` (blocks writes) | `CREATE INDEX CONCURRENTLY` (Postgres) or online DDL |
| **Large table ALTER** | Direct ALTER (locks table) | `gh-ost` (MySQL) or `pg_repack` (Postgres) |

### Online Schema Change Tools

| Tool | Database | How It Works |
|------|----------|-------------|
| **gh-ost** | MySQL | Creates shadow table, copies data, swaps atomically |
| **pt-online-schema-change** | MySQL | Trigger-based shadow table approach |
| **pg_repack** | PostgreSQL | Reorganizes tables without locks |
| **CREATE INDEX CONCURRENTLY** | PostgreSQL | Built-in non-locking index creation |
| **LHM (Large Hadron Migrator)** | MySQL | Chunked copy + triggers |

:::warning
Never run `ALTER TABLE` directly on a large production table without understanding the locking behavior. In MySQL, many ALTER TABLE operations take a full table lock. In PostgreSQL, adding a column with a DEFAULT is non-locking since PG 11, but adding a NOT NULL constraint or changing a type still requires a full table rewrite. Always test migrations on a production-sized dataset first.
:::

---

## 10. Health Checks

Health checks are the foundation of safe deployments. Orchestrators use them to decide whether a container is ready to receive traffic, alive and functioning, or needs to be restarted.

### Kubernetes Probe Types

| Probe | Purpose | Failure Action | When to Use |
|-------|---------|---------------|-------------|
| **Startup probe** | Has the app finished initializing? | Delay other probes until startup completes | Apps with slow startup (loading caches, warming up) |
| **Readiness probe** | Can the app serve traffic right now? | Remove pod from Service endpoints (stop sending traffic) | During rolling updates, temporary overload |
| **Liveness probe** | Is the app still alive and not deadlocked? | Kill and restart the pod | Detect deadlocks, infinite loops |

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: api
      image: my-app:2.0.0
      ports:
        - containerPort: 8080

      startupProbe:
        httpGet:
          path: /health/startup
          port: 8080
        failureThreshold: 30
        periodSeconds: 2
        # Allows up to 60s for startup

      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 5
        failureThreshold: 3

      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 10
        failureThreshold: 3
```

### Health Endpoint Design

```
GET /health/live     → Am I alive? (not deadlocked)
  ✅ 200 { "status": "UP" }
  ❌ 503 { "status": "DOWN" }

GET /health/ready    → Can I serve traffic?
  ✅ 200 { "status": "READY", "checks": { "db": "UP", "cache": "UP" } }
  ❌ 503 { "status": "NOT_READY", "checks": { "db": "DOWN", "cache": "UP" } }

GET /health/startup  → Have I finished initializing?
  ✅ 200 { "status": "STARTED" }
  ❌ 503 { "status": "STARTING" }
```

| Endpoint | Should Check | Should NOT Check |
|----------|-------------|-----------------|
| **/health/live** | App process is running, no deadlock | External dependencies (DB, cache) |
| **/health/ready** | DB connection, cache connection, required services | Slow external APIs |
| **/health/startup** | Config loaded, caches warmed, migrations run | Nothing beyond initial setup |

:::tip Senior-Level Insight
A common mistake is making the liveness probe depend on external services (database, cache). If the database goes down, the liveness check fails, Kubernetes restarts all pods, and now you have a cascading failure — the pods restart, reconnect to the database, overwhelm it with connections, and the cycle continues. Liveness should only check if the process itself is healthy. Use readiness to stop traffic when dependencies are down.
:::

---

## 11. Rollback Strategies

| Strategy | Speed | When to Use | Limitations |
|----------|:-----:|-------------|-------------|
| **Automatic rollback** | Seconds | Metrics-based (canary fails) | Requires well-defined thresholds |
| **Manual rollback** | Minutes | Human judgment needed | Slower, requires on-call engineer |
| **Git revert + redeploy** | 5–15 min | Code-level rollback | Full CI/CD pipeline runs again |
| **Blue-green switch** | Seconds | Route traffic to previous environment | Requires blue-green setup |
| **Feature flag disable** | Seconds | Kill the feature, not the deploy | Only works if behind a flag |
| **Database rollback** | Hours–days | Schema/data issues | Extremely risky; data loss possible |

### Automated Rollback Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  Automated Rollback Flow                      │
│                                                               │
│  Deploy v2 (canary: 5%)                                       │
│       │                                                       │
│       ▼                                                       │
│  ┌───────────────────────────────────────────────────┐        │
│  │  Monitoring window (5 min)                         │        │
│  │  ├── Error rate > 0.5%?              → ROLLBACK    │        │
│  │  ├── P99 latency > 500ms?            → ROLLBACK    │        │
│  │  ├── Crash loop detected?            → ROLLBACK    │        │
│  │  └── All healthy?                    → PROMOTE     │        │
│  └──────────────────────┬────────────────────────────┘        │
│                         │                                     │
│           ┌─────────────┼─────────────┐                      │
│           │                           │                       │
│           ▼                           ▼                       │
│  ┌──────────────┐            ┌──────────────┐                │
│  │   ROLLBACK   │            │   PROMOTE    │                │
│  │   Route 100% │            │   Increase   │                │
│  │   back to v1 │            │   to 25%     │                │
│  │   Alert team │            │   Repeat     │                │
│  │   Create P2  │            │   monitoring │                │
│  └──────────────┘            └──────────────┘                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Rollback Challenges

| Scenario | Challenge | Mitigation |
|----------|-----------|------------|
| v2 wrote new data formats | v1 can't read new format | Forward-compatible schemas; dual-write |
| v2 ran database migration | Can't un-migrate without data loss | Expand-contract pattern; migrations are always forward |
| v2 sent external side effects | Can't un-send emails or API calls | Idempotency keys; feature flags |
| v2 created new records | v1 schema doesn't have new columns | New columns should be nullable; ignored by v1 |

:::warning
Database rollbacks are the single biggest risk in any deployment. Design your migrations to be **forward-only** and **backwards-compatible**. If v2's migration added a column, v1 should still work (it just ignores the new column). If v2 dropped a column that v1 needs, you have a serious problem — which is why the contract phase of expand-contract happens in a *separate* deploy cycle, long after v1 is gone.
:::

---

## 12. Progressive Delivery

Progressive delivery combines **canary deployments**, **feature flags**, and **automated analysis** into a unified, metrics-driven release pipeline.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Progressive Delivery Pipeline                      │
│                                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ Deploy   │    │ Canary   │    │ Analysis │    │ Promote  │       │
│  │ canary   │───▶│ 5%       │───▶│ automated│───▶│ to 25%   │──┐   │
│  │ (v2)     │    │ traffic  │    │ metrics  │    │          │  │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │   │
│                                                                │   │
│       ┌────────────────────────────────────────────────────────┘   │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ Canary   │    │ Analysis │    │ Promote  │    │ Full     │    │
│  │ 25%      │───▶│ automated│───▶│ to 50%   │───▶│ rollout  │    │
│  │ traffic  │    │ metrics  │    │          │    │ 100%     │    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│                                                                   │
│  At any step: metrics fail → automatic rollback to v1             │
│                                                                   │
│  Tools: Argo Rollouts, Flagger, Spinnaker, Harness               │
└──────────────────────────────────────────────────────────────────┘
```

### Argo Rollouts Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: my-app
        - setWeight: 25
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
      rollbackWindow:
        revisions: 2
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:2.0.0
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] >= 0.995
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status=~"2.."
            }[5m])) /
            sum(rate(http_requests_total{
              service="{{args.service-name}}"
            }[5m]))
```

:::tip Senior-Level Insight
Progressive delivery is the gold standard for production-grade deployments. In interviews, describe the full loop: deploy canary → monitor key metrics (error rate, latency, business KPIs) → automated analysis (comparing canary vs baseline using statistical methods) → promote or rollback. Mention Argo Rollouts or Flagger as tools, and emphasize that the analysis step should compare canary metrics against a **baseline** (not static thresholds) to account for normal traffic variations.
:::

---

## 🔗 Related Chapters

- **[01 — Containers & Virtualization](./01-containers-virtualization.md)** — Container fundamentals that underpin deployment
- **[02 — CI/CD Pipelines](./02-cicd-pipelines.md)** — Build pipelines that feed into deployment strategies
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice deployment scenario questions
