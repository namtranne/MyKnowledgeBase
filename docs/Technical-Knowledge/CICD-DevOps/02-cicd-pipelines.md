---
sidebar_position: 3
title: "02 — CI/CD Pipelines"
slug: 02-cicd-pipelines
---

# 🔄 CI/CD Pipelines

CI/CD is the backbone of modern software delivery. A well-designed pipeline turns every code change into a tested, verified, deployable artifact — automatically. This chapter covers pipeline architecture, tooling, and the practices that separate hobby projects from production-grade delivery systems.

---

## 1. What Is CI/CD?

CI/CD is actually three distinct practices, often conflated:

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Continuous Integration (CI)                                        │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │  Developers merge to main frequently (multiple/day)      │        │
│   │  Every merge triggers automated build + test             │        │
│   │  Catch integration bugs early                            │        │
│   └─────────────────────────────────────────────────────────┘        │
│                          │                                           │
│                          ▼                                           │
│   Continuous Delivery (CD)                                           │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │  Every change that passes CI is deployable              │        │
│   │  Deployment to production is a manual decision          │        │
│   │  Artifact is always in a releasable state               │        │
│   └─────────────────────────────────────────────────────────┘        │
│                          │                                           │
│                          ▼                                           │
│   Continuous Deployment                                              │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │  Every change that passes all automated checks           │        │
│   │  is automatically deployed to production                 │        │
│   │  No manual gate — full automation                        │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

| Practice | Auto Build/Test | Auto Deploy to Staging | Auto Deploy to Prod |
|----------|:--------------:|:---------------------:|:-------------------:|
| **Continuous Integration** | ✅ | ❌ | ❌ |
| **Continuous Delivery** | ✅ | ✅ | ❌ (manual approval) |
| **Continuous Deployment** | ✅ | ✅ | ✅ |

:::tip Senior-Level Insight
In interviews, explicitly distinguish between Continuous *Delivery* and Continuous *Deployment*. Most companies practice Continuous Delivery (deploy button), not Continuous Deployment. True Continuous Deployment requires exceptional test coverage, feature flags, and observability to be safe. Mention that you'd choose Continuous Deployment only when the organization has mature testing, monitoring, and rollback capabilities.
:::

---

## 2. CI Pipeline Stages

A production-grade CI pipeline validates every commit across multiple dimensions before producing a deployable artifact.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CI Pipeline                                      │
│                                                                           │
│  ┌─────────┐  ┌──────┐  ┌───────┐  ┌──────────┐  ┌───────────┐         │
│  │  Code   │  │      │  │       │  │  Unit    │  │Integration│         │
│  │ Commit  │─▶│ Lint │─▶│ Build │─▶│  Tests   │─▶│  Tests    │         │
│  │         │  │      │  │       │  │          │  │           │         │
│  └─────────┘  └──────┘  └───────┘  └──────────┘  └─────┬─────┘         │
│                                                         │               │
│                                                         ▼               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐       │
│  │  Publish    │  │   Security   │  │    Code Quality          │       │
│  │  Artifact   │◀─│   Scan       │◀─│    (coverage, sonar)     │       │
│  │             │  │   (SAST)     │  │                          │       │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘       │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

| Stage | Purpose | Failure Action | Typical Duration |
|-------|---------|---------------|:----------------:|
| **Lint** | Code style, formatting, static checks | Block merge | 10–30s |
| **Build** | Compile, transpile, bundle | Block merge | 30s–5min |
| **Unit Tests** | Test individual functions/classes | Block merge | 30s–3min |
| **Integration Tests** | Test service interactions (DB, APIs) | Block merge | 2–10min |
| **Code Quality** | Coverage thresholds, SonarQube analysis | Block or warn | 1–3min |
| **Security Scan (SAST)** | Static analysis for vulnerabilities | Block or warn | 1–5min |
| **Publish Artifact** | Push Docker image, JAR, or package | Retry or alert | 30s–2min |

### GitHub Actions CI Example

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  security:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 3. CD Pipeline Stages

The CD pipeline takes a verified artifact and promotes it through environments until it reaches production.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CD Pipeline                                      │
│                                                                           │
│  ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │ Artifact  │    │ Deploy   │    │  Smoke    │    │  Manual Approval │  │
│  │ Promotion │───▶│ Staging  │───▶│  Tests    │───▶│  (for Delivery)  │  │
│  │           │    │          │    │           │    │                  │  │
│  └───────────┘    └──────────┘    └───────────┘    └────────┬─────────┘  │
│                                                             │            │
│                                                             ▼            │
│  ┌────────────────┐    ┌───────────────┐    ┌────────────────────────┐   │
│  │  Post-deploy   │    │   Deploy      │    │   Canary / Gradual    │   │
│  │  Health Check  │◀───│   Production  │◀───│   Traffic Shift       │   │
│  │                │    │               │    │                       │   │
│  └────────────────┘    └───────────────┘    └────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

| Stage | Description | Gate Criteria |
|-------|-------------|--------------|
| **Artifact promotion** | Tag/copy the CI artifact for the target environment | CI pipeline passed |
| **Deploy to staging** | Deploy exact production artifact to staging | Staging environment healthy |
| **Smoke tests** | Validate core user flows work end-to-end | All critical paths pass |
| **Manual approval** | Human gate before production (Continuous Delivery) | Product/engineering sign-off |
| **Canary / gradual rollout** | Send small % of traffic to new version | Error rate, latency within thresholds |
| **Deploy to production** | Full production deployment | Canary metrics pass |
| **Post-deploy health check** | Verify production health after deployment | All health endpoints return 200 |

---

## 4. Pipeline Design Principles

| Principle | Description | Why It Matters |
|-----------|-------------|---------------|
| **Fast feedback** | Fail fast — run cheapest checks first | Developers don't wait 30min for a typo failure |
| **Reproducibility** | Same commit → same artifact → same behavior | Eliminates "it worked in CI" discrepancies |
| **Immutable artifacts** | Build once, deploy everywhere | No environment-specific builds |
| **Environment parity** | Staging mirrors production | Catches environment-specific bugs before prod |
| **Idempotent deployments** | Deploying the same version twice has no side effects | Safe retries after partial failures |
| **Pipeline as code** | Pipeline definition lives in the repo (YAML/Jenkinsfile) | Version-controlled, reviewable, auditable |
| **Trunk-based flow** | Short-lived branches, frequent merges | Reduces merge conflicts and integration risk |

### Immutable Artifact Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Immutable Artifact Pattern                        │
│                                                                       │
│   CI Build                                                            │
│   ┌─────────┐        ┌───────────────────────────────────────┐       │
│   │ Source  │──────▶ │  Docker Image: app:abc123f            │       │
│   │ Code    │  build │  (immutable — same image everywhere)   │       │
│   └─────────┘        └───────────────────┬───────────────────┘       │
│                                          │                            │
│                    ┌─────────────────────┼──────────────────────┐     │
│                    │                     │                      │     │
│                    ▼                     ▼                      ▼     │
│              ┌──────────┐         ┌──────────┐          ┌──────────┐ │
│              │   Dev    │         │ Staging  │          │   Prod   │ │
│              │          │         │          │          │          │ │
│              │ app:abc1 │         │ app:abc1 │          │ app:abc1 │ │
│              │ + dev    │         │ + staging│          │ + prod   │ │
│              │   config │         │   config │          │   config │ │
│              └──────────┘         └──────────┘          └──────────┘ │
│                                                                       │
│   Config injected at deploy time (env vars, ConfigMaps, secrets)      │
│   Image NEVER changes — only config differs per environment           │
└──────────────────────────────────────────────────────────────────────┘
```

:::tip Senior-Level Insight
Never rebuild the artifact for each environment. Build once in CI, push to a registry, and promote the same image through dev → staging → prod. Environment-specific values come from ConfigMaps, Secrets, or environment variables at deploy time. This guarantees that what you tested is exactly what you ship.
:::

---

## 5. Automated Testing in Pipelines

### Test Pyramid in CI

```
            ┌──────────────┐
           /│   E2E Tests   │\         Slow, expensive, fragile
          / │ (Cypress/PW)  │ \        Run on merge to main only
         /  └──────────────┘  \
        /   ┌──────────────────┐\
       /    │Integration Tests  │ \     Medium speed, test boundaries
      /     │ (DB, API, queues) │  \    Run on every PR
     /      └──────────────────┘   \
    /       ┌──────────────────────┐\
   /        │    Unit Tests         │ \   Fast, isolated, plentiful
  /         │ (functions, classes)  │  \  Run on every commit
 /          └──────────────────────┘   \
└──────────────────────────────────────┘
```

### Strategies for Fast, Reliable Testing

| Strategy | How | Impact |
|----------|-----|--------|
| **Test parallelization** | Split test suite across multiple CI runners | 30min suite → 5min with 6 runners |
| **Test sharding** | Divide tests by file/module across parallel jobs | Balanced load across runners |
| **Selective testing** | Only run tests affected by changed files | 80% reduction in test time on PRs |
| **Flaky test quarantine** | Isolate flaky tests; don't block the pipeline | Reduces false failures, maintains velocity |
| **Test result caching** | Skip unchanged tests | Major savings for monorepos |
| **Contract testing** | Validate API contracts without full integration | Faster than spinning up dependencies |

### Handling Flaky Tests

```
┌──────────────────────────────────────────────────────────────┐
│                  Flaky Test Management                        │
│                                                               │
│  1. Detect:  Track test pass/fail rates over time             │
│              Flag tests with >2% flake rate                   │
│                                                               │
│  2. Quarantine:  Move flaky tests to a separate suite         │
│                  Don't block merges on quarantined tests       │
│                                                               │
│  3. Fix:     Assign ownership, fix root causes                │
│              Common causes: timing, shared state, test order  │
│                                                               │
│  4. Retry:   Auto-retry failed tests (max 2 retries)          │
│              If passes on retry → flaky, not broken            │
│                                                               │
│  5. Report:  Dashboard showing flake rate per test/team       │
│              Weekly flaky test burn-down                       │
└──────────────────────────────────────────────────────────────┘
```

:::warning
Auto-retrying flaky tests hides problems. Use retries as a short-term mitigation, but track flake rates and fix root causes. A pipeline that needs 3 retries to pass is a pipeline you can't trust.
:::

---

## 6. Database Migrations in CI/CD

Database schema changes are the hardest part of CI/CD because you can't just "roll back" a dropped column.

### Migration Safety Rules

| Rule | Why | Example |
|------|-----|---------|
| **Forward-only migrations** | Rollback scripts are error-prone and rarely tested | Use expand-contract instead |
| **Backwards-compatible changes** | Old code must work with new schema during rollout | Add columns as nullable, don't rename |
| **Separate deploy from migrate** | Migration failures shouldn't block code deploy | Run migrations as a pre-deploy step |
| **Test migrations on production-like data** | Empty DB ≠ 100M row table with locks | Clone prod data to staging |
| **Avoid long-running locks** | `ALTER TABLE` on large tables locks reads/writes | Use pt-online-schema-change or `gh-ost` |

### Expand-Contract Pattern

```
Phase 1: EXPAND (deploy new schema alongside old)
┌──────────────────────────────────────────────────────┐
│  Migration: Add new column "email_v2" (nullable)      │
│  App v1: Reads/writes "email"                         │
│  App v2: Writes to BOTH "email" AND "email_v2"        │
│          Reads from "email_v2" (falls back to "email") │
│  Backfill: Copy existing "email" → "email_v2"         │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
Phase 2: MIGRATE (switch to new column)
┌──────────────────────────────────────────────────────┐
│  App v3: Reads/writes "email_v2" only                 │
│  Verify: All data exists in "email_v2"                │
│  Monitor for 1+ release cycles                        │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
Phase 3: CONTRACT (remove old column)
┌──────────────────────────────────────────────────────┐
│  Migration: Drop "email" column                       │
│  Migration: Rename "email_v2" → "email"               │
│  This is a separate deploy cycle from Phase 2          │
└──────────────────────────────────────────────────────┘
```

:::tip Senior-Level Insight
In interviews, emphasize that database migrations and code deployments should be **decoupled**. Run migrations before deploying new code. The new schema must be compatible with both old and new code during the rollout window. This is non-negotiable for zero-downtime deployments.
:::

---

## 7. Artifact Management

### Versioning Strategy

| Strategy | Format | Use Case |
|----------|--------|----------|
| **Semantic Versioning** | `MAJOR.MINOR.PATCH` (e.g., `2.4.1`) | Libraries, APIs with compatibility contracts |
| **Calendar Versioning** | `YYYY.MM.DD` (e.g., `2025.01.15`) | Applications with continuous deployment |
| **Git SHA** | `abc123f` (7-char short hash) | Internal artifacts, Docker images |
| **Build number** | `build-1234` | CI system incremental builds |

### Artifact Promotion Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                   Artifact Promotion                               │
│                                                                    │
│  CI Build                                                          │
│  ┌──────────────────────────────────────────────────┐              │
│  │  Build artifact: my-app:abc123f                   │              │
│  │  Push to registry with SHA tag                    │              │
│  └───────────────────────┬──────────────────────────┘              │
│                          │                                         │
│  Dev Environment         ▼                                         │
│  ┌──────────────────────────────────────────────────┐              │
│  │  Tag: my-app:abc123f-dev                          │              │
│  │  Deploy to dev, run smoke tests                   │              │
│  └───────────────────────┬──────────────────────────┘              │
│                          │ ✅ Tests pass                           │
│  Staging Environment     ▼                                         │
│  ┌──────────────────────────────────────────────────┐              │
│  │  Tag: my-app:abc123f-staging                      │              │
│  │  Deploy same image, run integration + E2E tests   │              │
│  └───────────────────────┬──────────────────────────┘              │
│                          │ ✅ Tests pass + manual approval         │
│  Production              ▼                                         │
│  ┌──────────────────────────────────────────────────┐              │
│  │  Tag: my-app:abc123f-prod                         │              │
│  │  Tag: my-app:2.4.1 (release version)              │              │
│  │  Deploy same image to production                  │              │
│  └──────────────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 8. Environment Management

### Environment Parity

| Aspect | Dev | Staging | Production |
|--------|-----|---------|------------|
| **Infrastructure** | Minimal (single node) | Production-like (scaled down) | Full scale |
| **Data** | Seed data / fixtures | Anonymized prod snapshot | Real data |
| **Config** | Local overrides | Production-like config | Production config |
| **Secrets** | Local dummy values | Staging secrets (isolated) | Production secrets (vaulted) |
| **External services** | Mocks / containers | Sandbox APIs | Live APIs |
| **Monitoring** | Optional | Full monitoring stack | Full monitoring + alerting |

### Secrets Injection

| Method | Tool | Pros | Cons |
|--------|------|------|------|
| **Environment variables** | K8s Secrets, Docker env | Simple, universal | Visible in process listing, logs |
| **Secrets manager** | AWS Secrets Manager, HashiCorp Vault | Rotation, audit, access control | Added complexity, latency |
| **CI/CD secrets** | GitHub Secrets, GitLab CI Variables | Scoped to pipeline | Not available at runtime |
| **Sidecar injection** | Vault Agent, AWS SDK | Transparent to app | Extra container overhead |

```yaml
# Kubernetes secret injection via environment variables
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: api
      image: my-app:abc123f
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: external-api
              key: key
```

:::warning
Never store secrets in Git, Dockerfiles, or CI pipeline definitions in plain text. Use a secrets manager with audit logging. Rotate secrets regularly. If a secret is ever committed to Git, consider it compromised — rotate immediately, even if you force-pushed to remove it (it's still in the reflog and any clones).
:::

---

## 9. GitOps

GitOps uses **Git as the single source of truth** for both application code and infrastructure configuration. The desired state is declared in Git, and an operator reconciles the cluster to match.

### GitOps Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitOps Flow                                    │
│                                                                       │
│  Developer                                                            │
│  ┌──────────────────┐                                                 │
│  │ 1. Commit code   │                                                 │
│  │    to app repo   │                                                 │
│  └────────┬─────────┘                                                 │
│           │                                                           │
│           ▼                                                           │
│  ┌──────────────────┐     ┌─────────────────────────────┐             │
│  │ 2. CI Pipeline   │────▶│ 3. Push image to registry   │             │
│  │    builds & tests│     │    app:abc123f               │             │
│  └──────────────────┘     └──────────────┬──────────────┘             │
│                                          │                            │
│                                          ▼                            │
│  ┌──────────────────────────────────────────────────────┐             │
│  │ 4. Update config repo (Kustomize / Helm values)      │             │
│  │    image: app:abc123f                                 │             │
│  │    (automated PR or direct commit)                    │             │
│  └───────────────────────┬──────────────────────────────┘             │
│                          │                                            │
│                          ▼                                            │
│  ┌──────────────────────────────────────────────────────┐             │
│  │ 5. GitOps Operator (ArgoCD / Flux)                    │             │
│  │    Watches config repo → detects drift                │             │
│  │    Reconciles cluster to match desired state          │             │
│  └───────────────────────┬──────────────────────────────┘             │
│                          │                                            │
│                          ▼                                            │
│  ┌──────────────────────────────────────────────────────┐             │
│  │ 6. Kubernetes cluster updated                         │             │
│  │    Rolling update to app:abc123f                      │             │
│  └──────────────────────────────────────────────────────┘             │
│                                                                       │
│  Rollback = git revert the config commit                              │
│  Audit trail = git log                                                │
└──────────────────────────────────────────────────────────────────────┘
```

### Push-Based vs Pull-Based Deployment

| Aspect | Push-Based (Traditional CI/CD) | Pull-Based (GitOps) |
|--------|-------------------------------|---------------------|
| **Who deploys** | CI pipeline pushes to cluster | Operator in cluster pulls from Git |
| **Credentials** | CI needs cluster access | Only operator has cluster access |
| **Drift detection** | None — manual checking | Continuous reconciliation |
| **Audit trail** | CI logs (ephemeral) | Git history (permanent) |
| **Rollback** | Re-run old pipeline or manual | `git revert` the config commit |
| **Tools** | Jenkins, GitHub Actions | ArgoCD, Flux, Rancher Fleet |

:::tip Senior-Level Insight
In a GitOps model, the application repo and the config repo are separate. The app repo contains source code; the config repo contains Kubernetes manifests (or Helm charts / Kustomize). This separation means a config change (scaling replicas, updating env vars) doesn't trigger a full CI rebuild, and vice versa.
:::

---

## 10. Trunk-Based Development

Trunk-based development eliminates long-lived feature branches in favor of frequent, small merges to `main`.

### Branching Strategies Compared

| Strategy | Branch Lifetime | Merge Frequency | CI Complexity | Best For |
|----------|:--------------:|:--------------:|:-------------:|----------|
| **Trunk-based** | Hours | Multiple/day | Low | High-velocity teams, microservices |
| **GitHub Flow** | Days | Daily | Low–Medium | Small teams, SaaS products |
| **Git Flow** | Weeks–months | Infrequent | High | Release-driven products (mobile apps) |
| **Release branches** | Until release | Per sprint | Medium | Products with support windows |

### Feature Flags Replace Long-Lived Branches

```
Traditional approach (risky):
  main ──────────────────────────────────────▶
      \                                    /
       \── feature/big-rewrite ──(3 months)──/   ← MERGE HELL

Trunk-based approach (safe):
  main ──●──●──●──●──●──●──●──●──●──●──────▶
          │  │  │  │  │  │
          All commits have feature flag:
          if (featureFlags.isEnabled("new-checkout")) {
              newCheckoutFlow();
          } else {
              existingCheckoutFlow();
          }
```

---

## 11. Pipeline Security

### Security Gates in CI/CD

| Gate | What It Checks | Tool Examples | When to Run |
|------|---------------|---------------|-------------|
| **SAST** | Source code vulnerabilities | SonarQube, Semgrep, CodeQL | Every PR |
| **DAST** | Running application vulnerabilities | OWASP ZAP, Burp Suite | Staging deploy |
| **SCA (Dependency Scanning)** | Known CVEs in dependencies | Dependabot, Snyk, Trivy | Every PR |
| **Container Scanning** | OS-level CVEs in Docker images | Trivy, Docker Scout, Grype | After image build |
| **Secret Scanning** | Leaked credentials in code | GitLeaks, TruffleHog | Pre-commit + PR |
| **License Compliance** | Incompatible open-source licenses | FOSSA, WhiteSource | Weekly or per release |
| **SBOM Generation** | Software Bill of Materials | Syft, Docker SBOM | Every release |
| **Artifact Signing** | Verify artifact authenticity | Sigstore cosign, Notary | After build |

### Supply Chain Security

```
┌─────────────────────────────────────────────────────────────┐
│               Software Supply Chain Security                 │
│                                                              │
│  Source Code                                                 │
│  ├── Signed commits (GPG / SSH signing)                      │
│  ├── Protected branches (require reviews)                    │
│  └── Secret scanning pre-commit hooks                        │
│                                                              │
│  Dependencies                                                │
│  ├── Lock files committed (package-lock.json, go.sum)        │
│  ├── Dependency scanning (Snyk, Dependabot)                  │
│  └── Private registry mirror (Artifactory, Nexus)            │
│                                                              │
│  Build                                                       │
│  ├── Hermetic builds (pinned tool versions)                  │
│  ├── Reproducible builds (same input → same output)          │
│  └── SLSA provenance attestation                             │
│                                                              │
│  Artifacts                                                   │
│  ├── Signed images (cosign / Docker Content Trust)           │
│  ├── SBOM attached to image                                  │
│  └── Admission controller validates signatures               │
│                                                              │
│  Runtime                                                     │
│  ├── Image pull policy: Always from trusted registry          │
│  ├── Pod security standards (restricted profile)             │
│  └── Runtime vulnerability scanning (Falco, Sysdig)          │
└─────────────────────────────────────────────────────────────┘
```

:::tip Senior-Level Insight
Supply chain attacks (SolarWinds, Log4Shell, Codecov) are a top concern. In interviews, discuss SLSA (Supply-chain Levels for Software Artifacts) — a framework with four levels of increasing supply chain security. Level 3 requires a hardened build platform with non-falsifiable provenance. Mention that you'd sign images with Sigstore cosign and verify signatures with a Kubernetes admission controller (Kyverno or OPA Gatekeeper).
:::

---

## 12. Pipeline Tools Comparison

| Feature | Jenkins | GitHub Actions | GitLab CI | CircleCI | AWS CodePipeline |
|---------|---------|---------------|-----------|----------|-----------------|
| **Hosting** | Self-managed | GitHub-managed | Self/SaaS | SaaS | AWS-managed |
| **Config** | Jenkinsfile (Groovy) | YAML | YAML | YAML | JSON/Console |
| **Marketplace** | Plugin ecosystem | Actions marketplace | CI templates | Orbs | CodeBuild images |
| **Container support** | Plugin-based | Native | Native | Native | CodeBuild |
| **Self-hosted runners** | Always self-hosted | ✅ Supported | ✅ Supported | ✅ Supported | ❌ AWS only |
| **Secrets management** | Credentials plugin | Encrypted secrets | CI/CD variables | Contexts | AWS Secrets Manager |
| **Scalability** | Manual (add agents) | Auto-scaled | Auto-scaled | Auto-scaled | Fully managed |
| **Cost** | Infra cost | Free tier + per-minute | Free tier + per-minute | Free tier + credits | Per-pipeline execution |
| **Learning curve** | Steep (Groovy DSL) | Low | Low–Medium | Low | Medium |
| **Best for** | Complex enterprise pipelines | GitHub-native workflows | GitLab-native workflows | Fast builds, Docker | AWS-native applications |

:::warning
Avoid vendor lock-in in your pipeline definition. While GitHub Actions YAML syntax is specific to GitHub, keep the actual build/test/deploy logic in scripts (`Makefile`, `build.sh`) that can run on any CI system. Your CI config should call these scripts, not contain the logic itself.
:::

---

## 🔗 Related Chapters

- **[01 — Containers & Virtualization](./01-containers-virtualization.md)** — Build container images that pipelines deploy
- **[03 — Deployment Strategies](./03-deployment-strategies.md)** — How CD pipelines roll out changes safely
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice pipeline design questions
