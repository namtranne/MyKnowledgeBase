---
sidebar_position: 5
title: "04 — Common Interview Questions"
slug: 04-interview-questions
---

# 🎯 Common Interview Questions — CI/CD & DevOps

This chapter contains real interview questions with detailed, senior-level answers across containers, CI/CD pipelines, deployment strategies, and production operations. Each answer is structured to demonstrate depth, trade-off awareness, and practical experience.

---

## 1. Containers & Docker

### Q1: Explain the difference between containers and virtual machines. When would you choose one over the other?

**Answer:**

Virtual machines provide **hardware-level virtualization** through a hypervisor. Each VM runs a complete guest OS with its own kernel, resulting in strong isolation but significant overhead (GBs of disk, minutes to boot).

Containers provide **OS-level virtualization** using Linux namespaces and cgroups. They share the host kernel, making them lightweight (MBs of disk, seconds to start) but with weaker isolation boundaries.

| Factor | Choose VMs | Choose Containers |
|--------|-----------|-------------------|
| **Multi-tenancy** | Untrusted workloads needing hard isolation | Trusted workloads within the same organization |
| **OS diversity** | Need to run different OS families (Linux + Windows) | All workloads share the same OS family |
| **Legacy apps** | App requires specific OS kernel version or drivers | Cloud-native, 12-factor apps |
| **Startup speed** | Startup time is not critical | Need sub-second scaling |
| **Density** | 10–50 per host is sufficient | Need 100–1000+ per host |

In practice, most modern architectures use containers (via Kubernetes) for application workloads and VMs as the underlying infrastructure (EC2 instances running K8s nodes). They're complementary, not competing.

---

### Q2: How does a Docker multi-stage build work, and why is it important?

**Answer:**

A multi-stage build uses multiple `FROM` statements in a single Dockerfile. Each `FROM` starts a new build stage. You can selectively copy artifacts from earlier stages into later ones, discarding everything else.

```dockerfile
# Stage 1: Build — includes compiler, build tools, source code
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

# Stage 2: Runtime — minimal image with only the binary
FROM gcr.io/distroless/static-debian12
COPY --from=builder /server /server
ENTRYPOINT ["/server"]
```

**Why it matters:**

1. **Smaller images** — final image contains only the runtime binary, not Go compiler, source code, or build dependencies. Typical reduction: 1.2 GB → 15 MB.
2. **Reduced attack surface** — fewer binaries means fewer CVE targets.
3. **Faster deployments** — smaller images pull faster from registries.
4. **Better caching** — dependency download stage is cached separately from source code compilation.

---

### Q3: A container is using 100% CPU and affecting other containers on the same host. How do you prevent this?

**Answer:**

Set resource limits using cgroups (exposed through Docker/Kubernetes resource specifications):

```yaml
# Kubernetes resource limits
resources:
  requests:
    cpu: "500m"      # guaranteed minimum: 0.5 CPU core
    memory: "256Mi"  # guaranteed minimum: 256 MB
  limits:
    cpu: "1000m"     # hard cap: 1 CPU core
    memory: "512Mi"  # hard cap: 512 MB (OOMKilled if exceeded)
```

- **Requests** are scheduling guarantees — the scheduler ensures the node has this capacity available.
- **Limits** are hard caps — the container is throttled (CPU) or killed (memory) if it exceeds them.
- CPU limits use CFS (Completely Fair Scheduler) throttling — the container gets its allotted time slice, then pauses until the next period.
- Memory limits are enforced by the OOM killer — exceeding the limit results in the process being terminated.

Always set both requests and limits. Without limits, a single runaway container can consume all node resources and cause a **noisy neighbor** problem affecting every pod on the node.

---

### Q4: Explain Docker networking. How do containers communicate with each other and with the outside world?

**Answer:**

Docker provides several network drivers:

| Driver | How It Works | Use Case |
|--------|-------------|----------|
| **bridge** | Virtual bridge (docker0); containers get private IPs; NAT for external access | Default; single-host multi-container |
| **host** | Container shares host network namespace directly | Maximum performance; port conflicts possible |
| **overlay** | VXLAN tunnel across multiple Docker hosts | Swarm / multi-host clusters |
| **macvlan** | Container gets its own MAC on the physical network | Legacy apps needing LAN identity |
| **none** | No networking | Security-sensitive batch processing |

**Container-to-container communication:** On user-defined bridge networks, Docker provides built-in DNS — containers resolve each other by name (e.g., `api` container can reach `db` container via hostname `db`). The default bridge network doesn't provide DNS; you'd need `--link` (deprecated).

**External access:** Use port mapping (`-p 8080:80`) which creates iptables rules to forward host port 8080 to container port 80 via NAT.

---

## 2. CI/CD Pipelines

### Q5: Design a CI/CD pipeline for a microservices architecture with 20 services.

**Answer:**

```
┌──────────────────────────────────────────────────────────────────┐
│            Microservices CI/CD Architecture                       │
│                                                                   │
│  Monorepo or polyrepo?                                            │
│  → Monorepo with path-based triggers                             │
│  → Each service has its own pipeline definition                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Per-Service CI (triggered by path changes)                  │ │
│  │                                                              │ │
│  │  1. Detect changed services (git diff --name-only)           │ │
│  │  2. Run in parallel for each changed service:                │ │
│  │     ├── Lint + format check                                  │ │
│  │     ├── Unit tests                                           │ │
│  │     ├── Build Docker image                                   │ │
│  │     ├── Integration tests (with service dependencies)        │ │
│  │     ├── Contract tests (Pact/Spring Cloud Contract)          │ │
│  │     ├── Security scan (SAST + container scan)                │ │
│  │     └── Push image to registry (tagged with git SHA)         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  CD Pipeline (GitOps)                                        │ │
│  │                                                              │ │
│  │  1. Update config repo with new image tags                   │ │
│  │  2. ArgoCD detects drift → deploys to staging                │ │
│  │  3. E2E tests on staging                                     │ │
│  │  4. Manual approval gate                                     │ │
│  │  5. ArgoCD deploys to production (canary)                    │ │
│  │  6. Automated analysis (5min per step)                       │ │
│  │  7. Progressive rollout: 5% → 25% → 50% → 100%             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Key design decisions:                                            │
│  ├── Contract tests prevent cross-service breaking changes       │
│  ├── Only changed services rebuild (10min vs 2hr full build)     │
│  ├── Each service can deploy independently                       │
│  ├── Shared libraries versioned with semver                      │
│  └── Feature flags for coordinated cross-service features        │
└──────────────────────────────────────────────────────────────────┘
```

**Key points to emphasize:**
- **Selective builds** — only rebuild changed services (use path filters or `git diff`).
- **Contract testing** — each service validates its API contracts against consumers to prevent breaking changes without full E2E tests.
- **Independent deployability** — each service deploys independently; no coordinated releases.
- **GitOps** — config repo as source of truth; ArgoCD reconciles cluster state.
- **Progressive delivery** — canary with automated metrics analysis for each service.

---

### Q6: How do you handle database migrations safely in a CI/CD pipeline?

**Answer:**

The core principle is: **database migrations and application deployments must be decoupled**, and **migrations must be backwards-compatible**.

**Process:**
1. **Run migrations as a separate CI/CD step** — before the application deploy, not during it.
2. **Use the expand-contract pattern** — never rename/drop columns directly.
3. **Test migrations on production-sized data** — a migration that takes 2ms on test data might lock a 100M-row table for 20 minutes.
4. **Use online schema change tools** — `gh-ost` (MySQL) or `CREATE INDEX CONCURRENTLY` (Postgres) to avoid locking.

**Example: Renaming a column safely over 3 deploy cycles:**

| Deploy | Migration | App Code | Risk |
|:------:|-----------|----------|:----:|
| **1** | Add `full_name` column (nullable) | Writes to both `name` and `full_name`; reads from `full_name` with fallback | Low |
| **2** | Backfill `full_name` from `name` (batch job) | Reads only from `full_name` | Low |
| **3** | Drop `name` column | Already using `full_name` only | Medium |

Each deploy is independently safe and rollback-able. If Deploy 2 has issues, you roll back to code that still writes to both columns — no data loss.

---

### Q7: What is GitOps? How does it differ from traditional CI/CD?

**Answer:**

GitOps uses Git as the **single source of truth** for declarative infrastructure and application configuration. An operator running inside the cluster continuously reconciles the actual state to match the desired state in Git.

| Aspect | Traditional CI/CD | GitOps |
|--------|------------------|--------|
| **Deployment trigger** | CI pipeline pushes to cluster | Operator pulls from Git |
| **Cluster credentials** | CI system needs cluster access | Only the operator has cluster access |
| **Drift detection** | None (manual auditing) | Continuous — operator detects and corrects drift |
| **Audit trail** | CI logs (often ephemeral) | Git history (permanent, immutable) |
| **Rollback** | Re-run old pipeline or manual | `git revert` → operator auto-applies |
| **Security** | Broader credential exposure | Minimal attack surface |

**Tools:** ArgoCD (declarative, UI-driven), Flux (lightweight, CLI-driven), Rancher Fleet (multi-cluster).

The key insight is that GitOps makes the **desired state** explicit, version-controlled, and auditable. Every production change is a Git commit with an author, timestamp, and review history.

---

### Q8: A CI pipeline that used to take 8 minutes now takes 45 minutes. How do you diagnose and fix this?

**Answer:**

**Diagnosis approach:**
1. **Identify the slow stage** — look at pipeline timing breakdown (most CI tools show per-step duration).
2. **Check for cache misses** — dependency downloads, Docker layer rebuilds.
3. **Check for test growth** — new tests added without parallelization.
4. **Check for flaky retries** — auto-retries hiding slow/failing tests.
5. **Check infrastructure** — runner resource contention, network issues.

**Common fixes:**

| Root Cause | Fix | Expected Improvement |
|-----------|-----|:--------------------:|
| Dependency download every run | Cache `node_modules`, `.m2`, etc. | 2–5 min |
| Docker build from scratch | Use layer caching, BuildKit cache mounts | 3–10 min |
| Tests running sequentially | Parallelize across runners / shards | 50–80% |
| All tests run on every change | Selective testing (affected tests only) | 60–90% |
| Monolith test suite | Split into unit (fast) + integration (slow) | Variable |
| Large Docker image push | Multi-stage builds, smaller base images | 1–3 min |
| Flaky test retries | Fix flaky tests, don't just retry | Variable |

---

## 3. Deployment Strategies

### Q9: Compare blue-green and canary deployments. When would you choose each?

**Answer:**

| Aspect | Blue-Green | Canary |
|--------|-----------|--------|
| **Traffic shift** | Instant 0% → 100% | Gradual 5% → 25% → 50% → 100% |
| **Rollback speed** | Instant (switch back) | Fast (shift traffic back) |
| **Blast radius** | Full (all users at once) | Limited (small % first) |
| **Resource cost** | 2x (two full environments) | 1.1x (small canary set) |
| **Validation** | Pre-switch testing (synthetic) | Real production traffic |
| **Complexity** | Medium | High (metrics, analysis) |

**Choose blue-green when:**
- You need instant rollback capability.
- You can afford double the infrastructure.
- Your validation can be done with synthetic tests before switching.
- The change is low-risk or you're already confident.

**Choose canary when:**
- You want to validate with real production traffic.
- The change is risky or affects performance characteristics.
- You have good observability (metrics, alerting, dashboards).
- You want automated promotion/rollback based on metrics.

In practice, many teams combine both: use blue-green for the infrastructure switch and canary for the traffic shift within the green environment.

---

### Q10: A canary deployment shows increased error rates. Walk me through your response.

**Answer:**

**Immediate actions (0–5 minutes):**
1. **Auto-rollback should trigger** — if automated analysis is in place, the canary should already be rolling back. If not, manually shift 100% traffic back to stable.
2. **Verify rollback success** — confirm error rate returns to baseline after rollback.
3. **Preserve evidence** — don't delete canary pods yet; capture logs, metrics snapshots.

**Investigation (5–30 minutes):**
1. **Identify the error pattern** — is it all requests or specific endpoints? Specific user segments?
2. **Check logs** — filter by canary pod IDs; look for stack traces, error codes.
3. **Compare canary vs stable** — are they hitting the same dependencies? Same database? Different config?
4. **Check recent changes** — what commits were in this deploy? Any config changes?
5. **Check dependencies** — is a downstream service degraded? Did a database migration run?

**Root cause categories:**

| Category | Example | Resolution |
|----------|---------|------------|
| **Code bug** | Null pointer on a new code path | Fix code, add test, redeploy |
| **Config mismatch** | Missing environment variable | Fix config, redeploy |
| **Dependency issue** | Downstream service incompatible | Fix API contract, coordinate release |
| **Resource issue** | OOM due to memory leak in new code | Fix leak, increase limits temporarily |
| **Data issue** | Migration not run, schema mismatch | Run migration first, then redeploy |

**Post-incident:**
- Write a brief incident report: what happened, why, how to prevent.
- Add the failure scenario to automated tests.
- Review whether canary metrics were sensitive enough to catch this earlier.

---

### Q11: How would you implement feature flags for a gradual rollout of a new checkout flow?

**Answer:**

```
Rollout Plan for "New Checkout Flow"

Week 1:  Internal employees only (dogfooding)
         flag: new-checkout → rules: email ends with @company.com

Week 2:  1% of users (beta opt-in)
         flag: new-checkout → rules: user.beta_tester = true OR 1% random

Week 3:  10% of users
         flag: new-checkout → rules: 10% random by userId (sticky)

Week 4:  50% of users
         flag: new-checkout → rules: 50% random by userId

Week 5:  100% of users
         flag: new-checkout → rules: 100% enabled

Week 7:  Remove flag from code (cleanup)
```

**Implementation:**

```java
// Server-side flag evaluation
public CheckoutResponse processCheckout(CheckoutRequest request, User user) {
    FlagContext context = FlagContext.builder()
        .userId(user.getId())
        .email(user.getEmail())
        .region(user.getRegion())
        .plan(user.getPlan())
        .build();

    if (featureFlags.isEnabled("new-checkout", context)) {
        return newCheckoutService.process(request);
    } else {
        return legacyCheckoutService.process(request);
    }
}
```

**Key design decisions:**
- **Sticky assignment** — use consistent hashing on userId so users don't flip between old and new mid-session.
- **Kill switch** — ability to instantly disable the flag globally if something goes wrong.
- **Metrics per variant** — track conversion rate, error rate, and latency separately for each variant.
- **Cleanup deadline** — set a ticket for 2 weeks after 100% rollout to remove the flag from code.

---

### Q12: How do you handle database schema migrations with zero downtime?

**Answer:**

The fundamental principle: **the schema must be compatible with both the old and new application code during the rollout window**.

**Safe vs Unsafe Operations:**

| Operation | Safe? | Why | Safe Alternative |
|-----------|:-----:|-----|-----------------|
| Add nullable column | ✅ | Old code ignores it | — |
| Add column with default | ✅ | Old code ignores it (PG 11+: instant) | — |
| Add index | ⚠️ | May lock table | `CREATE INDEX CONCURRENTLY` |
| Drop column | ❌ | Old code may reference it | Remove code refs first, then drop |
| Rename column | ❌ | Old code uses old name | Add new → dual-write → drop old |
| Change column type | ❌ | May require table rewrite | Add new column of new type → migrate |
| Add NOT NULL | ❌ | Existing NULLs cause failure | Backfill NULLs first, then add constraint |

**Process for a column rename (`name` → `full_name`):**

Deploy 1 (Expand):
```sql
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
```
App v2: writes to both `name` and `full_name`.

Deploy 2 (Backfill):
```sql
UPDATE users SET full_name = name WHERE full_name IS NULL;
-- Run in batches of 10,000 to avoid long locks
```
App v3: reads from `full_name` only.

Deploy 3 (Contract):
```sql
ALTER TABLE users DROP COLUMN name;
```
This happens weeks after Deploy 2, once all code references to `name` are gone.

---

## 4. Production Operations

### Q13: Your team just deployed a new version and users are reporting 500 errors. Walk through your incident response.

**Answer:**

**Phase 1: Detect & Mitigate (0–5 minutes)**
1. **Confirm the issue** — check error rate dashboards, not just user reports.
2. **Rollback immediately** if it correlates with the deployment. Don't debug in production while users are affected.
3. **Communicate** — update status page, notify stakeholders.

**Phase 2: Diagnose (5–30 minutes)**
1. **Timeline** — when did errors start? Does it match deploy time?
2. **Scope** — all users or specific segment? All endpoints or specific?
3. **Logs** — filter by error status codes; look for patterns.
4. **Metrics** — CPU, memory, DB connections, downstream latency.
5. **Recent changes** — code diff, config changes, infrastructure changes, dependency updates.

**Phase 3: Fix & Verify**
1. If rollback fixed it → investigate root cause in the deployment.
2. If rollback didn't fix it → it's not the deployment; check infrastructure, dependencies, external services.
3. Verify the fix in staging before redeploying.

**Phase 4: Post-Incident**
1. Write post-mortem: timeline, root cause, contributing factors.
2. Action items: add tests, improve monitoring, update runbook.
3. Review: could we have caught this before production?

---

### Q14: How would you design a CI/CD pipeline that prevents deploying a vulnerable application?

**Answer:**

```
Security-Integrated Pipeline

┌─────────────────────────────────────────────────────────────────┐
│  Pre-commit                                                      │
│  ├── Secret scanning (gitleaks)         — block if secrets found│
│  └── Commit signing (GPG)               — verify author identity│
│                                                                  │
│  Pull Request                                                    │
│  ├── SAST (CodeQL / Semgrep)            — block on HIGH/CRIT   │
│  ├── Dependency scan (Snyk)             — block on known CVEs  │
│  ├── License compliance (FOSSA)         — warn on copyleft     │
│  └── Unit + integration tests           — block on failure     │
│                                                                  │
│  Merge to main                                                   │
│  ├── Build Docker image                                         │
│  ├── Container scan (Trivy)             — block on CRIT CVEs   │
│  ├── SBOM generation (Syft)             — attach to image      │
│  ├── Image signing (cosign)             — provenance attestation│
│  └── Push to registry                                           │
│                                                                  │
│  Deploy to staging                                               │
│  ├── DAST (OWASP ZAP)                  — scan running app      │
│  └── Penetration test (automated)       — weekly schedule       │
│                                                                  │
│  Deploy to production                                            │
│  ├── Admission controller (Kyverno)     — reject unsigned images│
│  ├── Pod security standards             — enforce restricted    │
│  └── Runtime monitoring (Falco)         — detect anomalies     │
└─────────────────────────────────────────────────────────────────┘
```

**Key principles:**
- **Shift left** — catch vulnerabilities as early as possible (pre-commit, PR).
- **Don't just scan — gate** — scans that don't block merges are ignored.
- **Sign everything** — artifact provenance ensures you're deploying what you built.
- **Defense in depth** — security at every layer (code, dependencies, image, runtime).
- **Balance speed and security** — run expensive scans asynchronously; only block on critical findings.

---

### Q15: Compare containerized deployment vs serverless. When would you choose each?

**Answer:**

| Aspect | Containers (ECS/EKS) | Serverless (Lambda) |
|--------|---------------------|---------------------|
| **Startup** | Seconds | Milliseconds (warm) / seconds (cold start) |
| **Scaling** | Horizontal (add pods/tasks) | Per-request auto-scaling |
| **Cost model** | Pay for running instances | Pay per invocation + duration |
| **Max execution** | Unlimited | 15 minutes (Lambda) |
| **State** | Stateful possible (volumes) | Stateless only |
| **Networking** | Full control | VPC integration adds latency |
| **Observability** | Full control (any tool) | Vendor tools (CloudWatch) |
| **Vendor lock-in** | Low (OCI standard, portable) | High (Lambda-specific code) |
| **Complexity** | High (K8s knowledge required) | Low (no infrastructure management) |

**Choose containers when:**
- Long-running processes (web servers, stream processors).
- Need persistent connections (WebSockets, gRPC streams).
- Require fine-grained resource control.
- Want portability across cloud providers.
- High, steady traffic (cost-effective at scale).

**Choose serverless when:**
- Event-driven, short-lived tasks (file processing, webhooks).
- Unpredictable, bursty traffic (scales to zero).
- Want minimal operational overhead.
- Cost-sensitive with low traffic (pay-per-use).
- Rapid prototyping.

---

### Q16: How would you set up a CI/CD pipeline for a monorepo with multiple services?

**Answer:**

**Challenge:** A monorepo with 20 services shouldn't rebuild all 20 on every commit.

**Solution: Path-based selective builds.**

```yaml
# GitHub Actions — per-service trigger
name: Service A CI
on:
  push:
    paths:
      - 'services/service-a/**'
      - 'libs/shared/**'        # rebuild if shared library changes
    branches: [main]
  pull_request:
    paths:
      - 'services/service-a/**'
      - 'libs/shared/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and test Service A
        working-directory: services/service-a
        run: |
          make lint
          make test
          make build
      - name: Build and push image
        if: github.ref == 'refs/heads/main'
        run: |
          docker build -t ghcr.io/org/service-a:${{ github.sha }} services/service-a
          docker push ghcr.io/org/service-a:${{ github.sha }}
```

**Key patterns:**
- **Path-based triggers** — only build services whose code changed.
- **Shared library detection** — if `libs/shared` changes, rebuild all services that depend on it.
- **Dependency graph** — tools like Nx, Turborepo, or Bazel understand the dependency graph and build only affected targets.
- **Independent deployability** — each service deploys independently; no coordinated releases.
- **Consistent tooling** — shared CI templates / reusable workflows across all services.

---

### Q17: Describe the expand-contract pattern for a database migration with a real-world example.

**Answer:**

**Scenario:** We need to split the `address` text field into structured fields (`street`, `city`, `state`, `zip`) without downtime.

| Phase | Deploy | Database Change | Application Code | Duration |
|:-----:|:------:|----------------|-------------------|:--------:|
| **Expand** | 1 | Add `street`, `city`, `state`, `zip` columns (all nullable) | v2: Writes to all 5 columns; reads from new fields with fallback to `address` | Day 1 |
| **Migrate** | 1 | Background job: parse `address` → populate new columns | v2: Same dual-write/read behavior | Days 2–3 |
| **Switch** | 2 | Verify 100% of rows have new fields populated | v3: Reads/writes only new structured fields | Day 4 |
| **Contract** | 3 | `ALTER TABLE DROP COLUMN address` | v3: No reference to old column | Day 14+ |

**Why 3 separate deploys?**
- Each deploy is independently rollback-safe.
- If v2 has a bug, roll back — old column still has all data.
- If v3 has a bug, roll back to v2 — dual-write code still works.
- The DROP only happens after we're confident no code uses the old column.

---

### Q18: You're designing a feature flag system from scratch. What are the key components?

**Answer:**

```
Feature Flag System Architecture

┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────┐     ┌──────────────────────────┐        │
│  │  Admin UI        │────▶│  Flag Management API      │       │
│  │  (create, edit,  │     │  (CRUD, targeting rules,  │       │
│  │   toggle flags)  │     │   audit log)              │       │
│  └─────────────────┘     └────────────┬─────────────┘        │
│                                       │                       │
│                                       ▼                       │
│                          ┌──────────────────────┐             │
│                          │  Flag Store           │             │
│                          │  (Redis / PostgreSQL) │             │
│                          └────────────┬─────────┘             │
│                                       │                       │
│                     ┌─────────────────┼──────────────┐       │
│                     │                 │              │        │
│                     ▼                 ▼              ▼        │
│              ┌────────────┐   ┌────────────┐  ┌──────────┐   │
│              │ Service A   │   │ Service B   │  │ Frontend │  │
│              │ SDK         │   │ SDK         │  │ SDK      │  │
│              │ (cache +    │   │ (cache +    │  │ (cache + │  │
│              │  evaluate)  │   │  evaluate)  │  │ evaluate)│  │
│              └────────────┘   └────────────┘  └──────────┘   │
│                                                               │
│  SDK caches rules locally (poll every 30s or SSE stream)      │
│  Evaluation is local — no network call per flag check         │
└──────────────────────────────────────────────────────────────┘
```

**Key components:**
1. **Flag store** — flags, rules, and targeting configuration.
2. **Evaluation engine** — determines flag value based on user context (userId, region, plan, percentage).
3. **SDK** — thin client that caches rules and evaluates locally (no network call per check).
4. **Admin UI** — create/edit flags, set targeting rules, view audit log.
5. **Audit log** — who changed what flag, when (critical for incident response).
6. **Stale flag detection** — alert when flags are older than N days without cleanup.

**Targeting rule evaluation order:**
1. Kill switch (globally OFF) → return false
2. User allowlist → return true/false
3. User segment rules (region, plan) → evaluate
4. Percentage rollout (consistent hash on userId) → evaluate
5. Default value → return configured default

---

### Q19: How do you ensure your CI/CD pipeline itself is reliable and not a bottleneck?

**Answer:**

| Problem | Solution |
|---------|----------|
| **Pipeline flakiness** | Quarantine flaky tests; retry with exponential backoff; track flake rate |
| **Slow builds** | Caching (dependencies, Docker layers); parallelization; selective builds |
| **Runner contention** | Auto-scaling runners (GitHub Actions larger runners, self-hosted with K8s) |
| **Single point of failure** | Multi-region CI; fallback runners; don't depend on one SaaS provider |
| **Configuration drift** | Pipeline-as-code in the repo; review pipeline changes like code |
| **Secret sprawl** | Centralized secrets manager; rotate regularly; audit access |
| **Lack of observability** | Dashboard: build times, success rate, queue depth, flake rate |

**Metrics to track:**
- **Lead time** — commit to production (target: < 1 hour).
- **Build success rate** — should be > 95%; < 90% means serious flakiness.
- **Build duration** — p50 and p95; set alerts if p95 exceeds 2x baseline.
- **Queue wait time** — time waiting for a runner; indicates capacity needs.
- **MTTR for pipeline failures** — how fast broken pipelines are fixed.

---

### Q20: Design a rollback strategy for a system that includes both application code and database schema changes.

**Answer:**

**Key principle: You almost never roll back database changes. You roll forward.**

```
Deployment: App v2 + Migration M2

  Rollback scenario:

  ┌──────────────────────────────────────────────────────────────┐
  │                                                               │
  │  Can you rollback the app without rolling back the DB?        │
  │                                                               │
  │  YES (migration is backwards-compatible):                     │
  │  ├── Roll back app v2 → v1                                   │
  │  ├── v1 works with the new schema (new columns are nullable, │
  │  │   v1 just ignores them)                                    │
  │  └── Fix the bug, redeploy v2                                │
  │                                                               │
  │  NO (migration breaks v1):                                    │
  │  ├── THIS SHOULD NEVER HAPPEN                                │
  │  ├── If it does: deploy v1.1 (v1 + compatibility patch)      │
  │  │   that works with the new schema                           │
  │  └── Root cause: migration was deployed without backwards-    │
  │      compatible guarantee. Fix the process.                   │
  │                                                               │
  │  DATABASE ROLLBACK (last resort):                             │
  │  ├── Extremely dangerous — potential data loss                │
  │  ├── Requires point-in-time recovery or manual reversal       │
  │  ├── Only for catastrophic data corruption                    │
  │  └── Involves DBA team and extended downtime                  │
  │                                                               │
  └──────────────────────────────────────────────────────────────┘
```

**Prevention is the strategy:**
1. All migrations must be backwards-compatible (expand-contract).
2. Test the rollback scenario: deploy v2, then deploy v1, verify v1 works.
3. Migrations and code deploys are separate pipeline stages.
4. Database changes deploy first; if migration fails, code deploy doesn't start.
5. Feature flags protect new code paths — disable the flag instead of rolling back.

---

## 5. Quick Reference

### Deployment Strategy Decision Matrix

| Your Priority | Recommended Strategy |
|---------------|---------------------|
| Instant rollback | Blue-Green |
| Minimize blast radius | Canary |
| Measure business impact | A/B Testing |
| Validate without user impact | Shadow |
| Simplicity | Rolling Update |
| Combine all benefits | Progressive Delivery (Argo Rollouts) |

### Docker Commands Cheat Sheet

| Command | Purpose |
|---------|---------|
| `docker build -t app:v1 .` | Build image from Dockerfile |
| `docker run -d -p 8080:80 app:v1` | Run container in background with port mapping |
| `docker exec -it <id> /bin/sh` | Open shell inside running container |
| `docker logs -f <id>` | Follow container logs |
| `docker ps -a` | List all containers (including stopped) |
| `docker images` | List local images |
| `docker system prune -a` | Remove all unused images, containers, volumes |
| `docker compose up -d` | Start multi-container application |
| `docker compose down -v` | Stop and remove containers + volumes |
| `docker scout cves <image>` | Scan image for vulnerabilities |
| `docker buildx build --platform linux/amd64,linux/arm64` | Multi-architecture build |

### Pipeline Stages Overview

```
┌─────────┐  ┌──────┐  ┌───────┐  ┌──────┐  ┌──────────┐  ┌────────┐
│  Lint   │─▶│Build │─▶│ Unit  │─▶│ Intg │─▶│ Security │─▶│Publish │
│         │  │      │  │ Test  │  │ Test │  │   Scan   │  │Artifact│
└─────────┘  └──────┘  └───────┘  └──────┘  └──────────┘  └────┬───┘
                                                                │
┌───────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │
│  Health   │  │  Deploy   │  │  Canary  │  │   Deploy       │◀─┘
│  Check    │◀─│  Prod     │◀─│  Analysis│◀─│   Staging      │
└───────────┘  └───────────┘  └──────────┘  └────────────────┘
```

### CI/CD Tools Comparison

| Tool | Best For | Config Language | Self-Hosted | Free Tier |
|------|----------|----------------|:-----------:|:---------:|
| **GitHub Actions** | GitHub-native projects | YAML | ✅ | ✅ |
| **GitLab CI** | GitLab-native projects | YAML | ✅ | ✅ |
| **Jenkins** | Complex enterprise pipelines | Groovy | ✅ (only) | ✅ (OSS) |
| **CircleCI** | Fast Docker builds | YAML | ✅ | ✅ |
| **ArgoCD** | Kubernetes GitOps | YAML/Helm | ✅ | ✅ (OSS) |
| **AWS CodePipeline** | AWS-native workloads | JSON/Console | ❌ | ❌ |
| **Tekton** | K8s-native CI/CD | YAML (CRDs) | ✅ | ✅ (OSS) |
| **Spinnaker** | Multi-cloud deployment | UI/JSON | ✅ | ✅ (OSS) |

---

## 🔗 Related Chapters

- **[01 — Containers & Virtualization](./01-containers-virtualization.md)** — Docker, images, networking fundamentals
- **[02 — CI/CD Pipelines](./02-cicd-pipelines.md)** — Pipeline design and implementation
- **[03 — Deployment Strategies](./03-deployment-strategies.md)** — Blue-green, canary, feature flags
