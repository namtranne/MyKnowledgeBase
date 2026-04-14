---
sidebar_position: 4
title: "03 — Deployment Strategies"
slug: 03-deployment-strategies
---

# Rolling & Canary Deployments on EKS

## 1. Why Deployment Strategies Matter

Deploying a new version of an application carries risk. A bad release can cause downtime, data corruption, or degraded user experience. Deployment strategies control **how** new versions replace old ones, allowing you to:

- Minimise or eliminate downtime
- Detect failures before they reach all users
- Roll back quickly if something goes wrong

| Strategy | Risk Level | Speed | Traffic Control | Complexity |
|----------|-----------|-------|-----------------|------------|
| **Recreate** | High | Fast | None (full cutover) | Low |
| **Rolling Update** | Medium | Moderate | Limited | Low |
| **Canary** | Low | Slow (deliberate) | Fine-grained | Medium–High |
| **Blue/Green** | Low | Fast cutover | Binary (old or new) | Medium |

This guide covers **Rolling Update** and **Canary** deployments in detail, as they are the most commonly used strategies in production Kubernetes environments.

---

## 2. Rolling Update Deployment

### 2.1 What is a Rolling Update?

A **rolling update** incrementally replaces old Pod instances with new ones. At no point are all Pods taken down simultaneously — Kubernetes ensures a minimum number of Pods are always available to serve traffic.

```
Timeline of a Rolling Update (3 replicas, maxSurge=1, maxUnavailable=0):

Step 1:  [v1] [v1] [v1]           ← all pods running v1
Step 2:  [v1] [v1] [v1] [v2]      ← new v2 pod created (surge)
Step 3:  [v1] [v1] [~~] [v2]      ← v2 ready, one v1 terminated
Step 4:  [v1] [v1] [v2] [v2]      ← another v2 pod created
Step 5:  [v1] [~~] [v2] [v2]      ← v1 terminated
Step 6:  [v1] [v2] [v2] [v2]      ← final v2 created
Step 7:  [~~] [v2] [v2] [v2]      ← last v1 terminated
Step 8:  [v2] [v2] [v2]           ← rollout complete
```

**Key characteristics:**

- Zero downtime — at least `replicas - maxUnavailable` Pods are always available
- Gradual — issues can be spotted during the rollout before all Pods are replaced
- Built into Kubernetes natively — no additional tools required
- Both old and new versions briefly run simultaneously (must ensure backward compatibility)

### 2.2 Step-by-Step: Configure a Rolling Update

#### Step 1 — Define the Deployment with a Rolling Update Strategy

```yaml
# rolling-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  minReadySeconds: 10
  revisionHistoryLimit: 5
  template:
    metadata:
      labels:
        app: my-app
        version: v1.0.0
    spec:
      containers:
        - name: app
          image: <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
      terminationGracePeriodSeconds: 30
```

**Configuration explained field by field:**

| Field | Value | Meaning |
|-------|-------|---------|
| `strategy.type` | `RollingUpdate` | Use the rolling update strategy (this is the default) |
| `maxSurge` | `1` | During the update, allow at most 1 extra Pod above the desired replica count. Accepts absolute numbers or percentages (e.g., `25%`) |
| `maxUnavailable` | `1` | During the update, allow at most 1 Pod to be unavailable. Set to `0` for strict zero-downtime but slower rollouts |
| `minReadySeconds` | `10` | A new Pod must be Ready for 10 seconds before Kubernetes considers it available. This prevents fast-failing Pods from being counted as healthy |
| `revisionHistoryLimit` | `5` | Keep the last 5 ReplicaSets so you can roll back to any of the previous 5 versions |
| `readinessProbe` | HTTP GET `/ready` | Kubernetes only routes traffic to the Pod after this probe succeeds. Critical for rolling updates — without it, traffic may hit Pods that aren't ready |
| `livenessProbe` | HTTP GET `/healthz` | Kubernetes restarts the container if this probe fails, handling hung processes |
| `terminationGracePeriodSeconds` | `30` | When a Pod is being terminated, it gets 30 seconds to finish in-flight requests before being killed |

#### Step 2 — Apply the Initial Deployment

```bash
kubectl apply -f rolling-deployment.yaml

# Verify all 4 replicas are running
kubectl get pods -l app=my-app
```

Expected output:

```
NAME                      READY   STATUS    RESTARTS   AGE
my-app-6d9f8c7b5-abc12   1/1     Running   0          30s
my-app-6d9f8c7b5-def34   1/1     Running   0          30s
my-app-6d9f8c7b5-ghi56   1/1     Running   0          30s
my-app-6d9f8c7b5-jkl78   1/1     Running   0          30s
```

#### Step 3 — Trigger a Rolling Update

Update the container image to a new version:

```bash
# Option A: Update via command line
kubectl set image deployment/my-app app=<ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:2.0.0

# Option B: Edit the YAML and re-apply (preferred — keeps manifests in version control)
# Change image tag from 1.0.0 to 2.0.0 in rolling-deployment.yaml
kubectl apply -f rolling-deployment.yaml

# Option C: Edit interactively (not recommended for production)
kubectl edit deployment/my-app
```

**What happens after triggering the update:**

1. Kubernetes creates a **new ReplicaSet** for version 2.0.0
2. The new ReplicaSet scales up by `maxSurge` (1 Pod)
3. Kubernetes waits for the new Pod to pass its `readinessProbe`
4. Once ready (and after `minReadySeconds`), the old ReplicaSet scales down by 1
5. Steps 2–4 repeat until all Pods are running version 2.0.0
6. The old ReplicaSet is retained (with 0 replicas) for potential rollback

#### Step 4 — Monitor the Rollout

```bash
# Watch the rollout progress in real time
kubectl rollout status deployment/my-app

# View detailed rollout events
kubectl describe deployment/my-app

# Watch pods being replaced
kubectl get pods -l app=my-app -w
```

Output during rollout:

```
Waiting for deployment "my-app" rollout to finish: 1 out of 4 new replicas have been updated...
Waiting for deployment "my-app" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "my-app" rollout to finish: 3 out of 4 new replicas have been updated...
Waiting for deployment "my-app" rollout to finish: 4 out of 4 new replicas have been updated...
deployment "my-app" successfully rolled out
```

#### Step 5 — Roll Back if Something Goes Wrong

```bash
# Immediately roll back to the previous version
kubectl rollout undo deployment/my-app

# Roll back to a specific revision
kubectl rollout history deployment/my-app          # list revisions
kubectl rollout undo deployment/my-app --to-revision=2

# Verify the rollback
kubectl rollout status deployment/my-app
kubectl get pods -l app=my-app -o jsonpath='{.items[*].spec.containers[0].image}'
```

**How rollback works:** Kubernetes doesn't "undo" — it scales up the old ReplicaSet and scales down the current one, using the same rolling update mechanism.

### 2.3 Tuning maxSurge and maxUnavailable

The interaction between these two parameters controls the speed and safety of your rollout:

| `maxSurge` | `maxUnavailable` | Behaviour | Use Case |
|-----------|------------------|-----------|----------|
| `1` | `0` | Safest — always at full capacity, slow rollout | Critical production services |
| `25%` | `25%` | Balanced — Kubernetes default | Most workloads |
| `0` | `1` | No extra Pods, but one can be unavailable | Resource-constrained clusters |
| `100%` | `0` | Creates all new Pods first, then removes old (like blue/green) | When you have spare cluster capacity |

**Choosing the right values:**

- **Prioritise availability** → set `maxUnavailable: 0` (every old Pod stays running until a new one is ready)
- **Prioritise speed** → increase `maxSurge` (more new Pods are created in parallel)
- **Constrained resources** → keep `maxSurge` low (avoid scheduling failures from insufficient capacity)

### 2.4 Handling Graceful Shutdown

When a Pod is terminated during a rolling update, in-flight requests must be handled:

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"]
```

**What happens during termination:**

1. Pod is marked as `Terminating` and removed from Service endpoints (kube-proxy updates iptables)
2. The `preStop` hook runs (5-second sleep allows in-flight requests to complete)
3. Kubernetes sends `SIGTERM` to the container
4. The application should catch `SIGTERM` and stop accepting new connections while finishing existing ones
5. After `terminationGracePeriodSeconds`, Kubernetes sends `SIGKILL` if the container is still running

**Why the `preStop` sleep:** There is a brief race condition between the Pod being removed from endpoints and the iptables rules being updated on all nodes. The sleep ensures no new traffic arrives during this window.

---

## 3. Canary Deployment

### 3.1 What is a Canary Deployment?

A **canary deployment** releases a new version to a **small subset of users** first. If the canary performs well (low error rate, acceptable latency), traffic is gradually shifted to the new version. If problems are detected, the canary is rolled back with minimal user impact.

```
Canary Deployment Phases:

Phase 1 — Canary launch (5% traffic)
┌─────────────────────────────────────────────┐
│                Traffic                       │
│     95% ──────────► [v1] [v1] [v1] [v1]     │
│      5% ──────────► [v2]                     │
└─────────────────────────────────────────────┘

Phase 2 — Canary validation (monitor metrics)
  ✓ Error rate < 0.1%
  ✓ P99 latency < 500ms
  ✓ No crash loops

Phase 3 — Progressive traffic shift
┌─────────────────────────────────────────────┐
│     50% ──────────► [v1] [v1]               │
│     50% ──────────► [v2] [v2]               │
└─────────────────────────────────────────────┘

Phase 4 — Full promotion
┌─────────────────────────────────────────────┐
│    100% ──────────► [v2] [v2] [v2] [v2]     │
└─────────────────────────────────────────────┘
```

**Key differences from rolling updates:**

| Aspect | Rolling Update | Canary |
|--------|---------------|--------|
| Traffic control | Proportional to Pod count | Fine-grained percentage-based |
| Validation period | None (continuous rollout) | Explicit observation window |
| Rollback blast radius | Percentage of users already on new version | Only canary percentage |
| Tooling | Built into Kubernetes | Requires additional tooling (e.g., Argo Rollouts, Flagger, Istio) |

### 3.2 Approach A: Native Kubernetes Canary (Manual)

This approach uses two Deployments with a shared Service. It's simple but lacks automated traffic splitting.

#### Step 1 — Deploy the Stable Version

```yaml
# stable-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
  labels:
    app: my-app
    track: stable
spec:
  replicas: 4
  selector:
    matchLabels:
      app: my-app
      track: stable
  template:
    metadata:
      labels:
        app: my-app
        track: stable
        version: v1.0.0
    spec:
      containers:
        - name: app
          image: <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### Step 2 — Create a Service that Selects Both Tracks

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app        # matches BOTH stable and canary pods
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

**Why this works:** The Service selector uses only `app: my-app`, which matches Pods from both the stable and canary Deployments. Traffic is distributed proportionally based on Pod count.

#### Step 3 — Deploy the Canary Version

```yaml
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  labels:
    app: my-app
    track: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      track: canary
  template:
    metadata:
      labels:
        app: my-app
        track: canary
        version: v2.0.0
    spec:
      containers:
        - name: app
          image: <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:2.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

Apply both:

```bash
kubectl apply -f stable-deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f canary-deployment.yaml
```

**Traffic distribution:** with 4 stable Pods and 1 canary Pod, approximately **20% of traffic** goes to the canary (1 out of 5 Pods). To achieve ~10%, use 9 stable replicas and 1 canary.

#### Step 4 — Monitor the Canary

```bash
# Watch pods from both deployments
kubectl get pods -l app=my-app -L version,track

# Check logs from the canary
kubectl logs -l track=canary -f

# Compare error rates (if using a metrics tool)
kubectl top pods -l app=my-app
```

#### Step 5 — Promote or Roll Back

**If the canary is healthy — promote:**

```bash
# Update stable deployment to v2
kubectl set image deployment/my-app-stable app=<ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:2.0.0

# Wait for rollout
kubectl rollout status deployment/my-app-stable

# Delete the canary deployment
kubectl delete deployment my-app-canary
```

**If the canary is failing — roll back:**

```bash
# Simply delete the canary
kubectl delete deployment my-app-canary
```

All traffic immediately returns to the stable v1 Pods.

:::warning Limitation of Native Canary
The traffic split is only controllable by adjusting replica counts. You cannot send exactly 5% of traffic to the canary — you'd need 19 stable Pods and 1 canary Pod. For precise traffic control, use Argo Rollouts or a service mesh.
:::

### 3.3 Approach B: Canary with Argo Rollouts (Recommended)

**Argo Rollouts** extends Kubernetes with advanced deployment strategies including weighted canary traffic splitting, automated analysis, and progressive delivery.

#### Step 1 — Install Argo Rollouts

```bash
# Create the namespace
kubectl create namespace argo-rollouts

# Install Argo Rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install the kubectl plugin for convenience
brew install argoproj/tap/kubectl-argo-rollouts    # macOS
# OR
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify
kubectl argo rollouts version
```

**Why Argo Rollouts:** It replaces the standard Deployment controller with a `Rollout` resource that understands canary semantics natively — weighted traffic splitting, automated metric analysis, and pause/promote gates.

#### Step 2 — Install an Ingress Controller for Traffic Splitting

Argo Rollouts integrates with several traffic management solutions. On EKS, the **AWS ALB Ingress** integration or **NGINX Ingress Controller** are common choices.

**Install NGINX Ingress Controller:**

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"=nlb
```

**Why NGINX:** It supports weighted traffic splitting via annotations, which Argo Rollouts leverages to route a precise percentage of traffic to the canary Pods.

#### Step 3 — Define the Argo Rollout Resource

```yaml
# argo-canary-rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: my-app
  strategy:
    canary:
      canaryService: my-app-canary-svc
      stableService: my-app-stable-svc
      trafficRouting:
        nginx:
          stableIngress: my-app-ingress
      steps:
        - setWeight: 5
        - pause: { duration: 2m }
        - setWeight: 20
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 2m }
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
```

**Step-by-step explanation of the canary strategy:**

| Step | Action | What Happens |
|------|--------|-------------|
| 1 | `setWeight: 5` | 5% of traffic goes to canary, 95% to stable |
| 2 | `pause: 2m` | Wait 2 minutes — observe error rates and latency |
| 3 | `setWeight: 20` | Increase canary traffic to 20% |
| 4 | `pause: 5m` | Wait 5 minutes — longer observation for higher traffic |
| 5 | `setWeight: 50` | Split traffic evenly |
| 6 | `pause: 5m` | Observe at 50% load |
| 7 | `setWeight: 80` | Near-full traffic to canary |
| 8 | `pause: 2m` | Final validation before promotion |
| — | (automatic) | Promote to 100%, scale down old ReplicaSet |

**You can also use manual pauses** for human approval:

```yaml
steps:
  - setWeight: 5
  - pause: {}          # pauses indefinitely until manually promoted
  - setWeight: 50
  - pause: { duration: 10m }
```

#### Step 4 — Create the Supporting Services and Ingress

```yaml
# services.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-stable-svc
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-canary-svc
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-stable-svc
                port:
                  number: 80
```

**How traffic routing works:**

1. Argo Rollouts manages both Services — it updates the selectors to point at the correct ReplicaSets
2. The `stableIngress` is the primary Ingress; Argo Rollouts creates a shadow canary Ingress with weight annotations
3. NGINX reads the weight annotations and splits traffic accordingly

#### Step 5 — Deploy and Apply

```bash
kubectl apply -f services.yaml
kubectl apply -f ingress.yaml
kubectl apply -f argo-canary-rollout.yaml

# Verify
kubectl argo rollouts get rollout my-app -w
```

#### Step 6 — Trigger a Canary Deployment

Update the image:

```bash
kubectl argo rollouts set image my-app app=<ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:2.0.0
```

Monitor the canary progression:

```bash
# Live dashboard in terminal
kubectl argo rollouts get rollout my-app -w
```

Output:

```
Name:            my-app
Namespace:       default
Status:          ॥ Paused
Strategy:        Canary
  Step:          1/8
  SetWeight:     5
  ActualWeight:  5
Images:          <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0 (stable)
                 <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:2.0.0 (canary)
Replicas:
  Desired:       4
  Current:       5
  Updated:       1
  Ready:         5
  Available:     5

NAME                                  KIND        STATUS     AGE
⟳ my-app                             Rollout     ॥ Paused   10m
├──# revision:2
│  └──⧉ my-app-7d9f8c7b5            ReplicaSet  ✔ Healthy  30s
│     └──□ my-app-7d9f8c7b5-xq2k4   Pod         ✔ Running  30s
└──# revision:1
   └──⧉ my-app-6b8f7a6c4            ReplicaSet  ✔ Healthy  10m
      ├──□ my-app-6b8f7a6c4-abc12    Pod         ✔ Running  10m
      ├──□ my-app-6b8f7a6c4-def34    Pod         ✔ Running  10m
      ├──□ my-app-6b8f7a6c4-ghi56    Pod         ✔ Running  10m
      └──□ my-app-6b8f7a6c4-jkl78    Pod         ✔ Running  10m
```

#### Step 7 — Promote or Abort

```bash
# Manually promote (skip remaining pause steps)
kubectl argo rollouts promote my-app

# Or abort (roll back to stable)
kubectl argo rollouts abort my-app

# After abort, mark the rollout as stable again
kubectl argo rollouts retry rollout my-app
```

### 3.4 Automated Canary Analysis with Argo Rollouts

Instead of manually watching dashboards, define **AnalysisTemplates** that automatically evaluate canary health using metrics from Prometheus, CloudWatch, or Datadog.

#### Step 1 — Define an AnalysisTemplate

```yaml
# analysis-template.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: canary-success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}",
                status=~"2.."
              }[2m]
            )) /
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}"}[2m]
            ))
    - name: latency-p99
      interval: 60s
      successCondition: result[0] <= 500
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(
                http_request_duration_milliseconds_bucket{
                  service="{{args.service-name}}"
                }[2m]
              )) by (le)
            )
```

**What this does:**

- **success-rate metric:** queries Prometheus every 60 seconds to check that the success rate (2xx responses / total responses) is >= 99%. If it fails 3 times, the canary is automatically aborted.
- **latency-p99 metric:** checks that the 99th percentile latency stays below 500ms. If it exceeds this threshold 3 times, the canary is rolled back.

#### Step 2 — Attach the Analysis to the Rollout

```yaml
# In the Rollout spec, add analysis to canary steps:
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 1m }
        - analysis:
            templates:
              - templateName: canary-success-rate
            args:
              - name: service-name
                value: my-app-canary-svc
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100
```

**Lifecycle with automated analysis:**

1. Traffic shifts to 5% canary
2. 1-minute pause for the canary to warm up
3. Analysis begins — Prometheus queries run every 60 seconds
4. If all metrics pass, the rollout continues to 50%, then 100%
5. If any metric fails 3 times, the rollout **automatically aborts** and all traffic returns to stable

#### Step 3 — Apply and Monitor

```bash
kubectl apply -f analysis-template.yaml
kubectl apply -f argo-canary-rollout.yaml

# Watch the analysis
kubectl argo rollouts get rollout my-app -w

# Check analysis run results
kubectl get analysisrun -l rollouts-pod-template-hash
```

---

## 4. Comparison: When to Use Which Strategy

| Criteria | Rolling Update | Canary (Native) | Canary (Argo Rollouts) |
|----------|---------------|-----------------|----------------------|
| **Simplicity** | Simplest — built in | Simple — two Deployments | Moderate — requires Argo install |
| **Traffic control** | By Pod count only | By Pod ratio only | Precise percentage-based |
| **Automated validation** | None | None | Yes (AnalysisTemplates) |
| **Rollback speed** | Fast (undo command) | Instant (delete canary) | Instant (abort) |
| **Suitable for** | Internal services, low-risk updates | Quick canary with basic needs | Production-critical services |
| **Observation window** | None (continuous) | Manual | Automated with metrics |

**Rules of thumb:**

- **Use rolling updates** for internal microservices, background workers, or when you have strong integration test coverage and confidence in the release
- **Use native canary** for a quick, tool-free validation of a risky change when you don't need precise traffic control
- **Use Argo Rollouts canary** for user-facing services where you need measurable validation (error rates, latency) before full promotion

---

## 5. CI/CD Integration

### GitHub Actions Pipeline for Canary Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to EKS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ap-southeast-2
  ECR_REPOSITORY: my-app
  EKS_CLUSTER: my-cluster

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsDeployRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name $EKS_CLUSTER --region $AWS_REGION

      - name: Deploy canary
        env:
          ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          kubectl argo rollouts set image my-app \
            app=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Wait for canary to complete
        run: |
          kubectl argo rollouts status my-app --timeout 600s
```

**Pipeline flow:**

1. Code push to `main` triggers the workflow
2. AWS credentials are obtained via OIDC (no long-lived secrets)
3. Docker image is built and pushed to ECR with the Git SHA as the tag
4. kubeconfig is updated to point at the EKS cluster
5. Argo Rollouts updates the image, triggering the canary steps
6. The pipeline waits for the canary to fully promote or times out after 10 minutes

---

## 6. Troubleshooting

### Common Issues and Solutions

| Problem | Symptom | Solution |
|---------|---------|----------|
| Rollout stuck | Pods never become Ready | Check `readinessProbe` path and port. Run `kubectl describe pod <name>` for events |
| ImagePullBackOff | Pod can't pull the image | Verify ECR repository exists, image tag is correct, and node IAM role has `AmazonEC2ContainerRegistryReadOnly` |
| Canary not receiving traffic | All traffic goes to stable | Verify Service selector matches both Deployments. For Argo, check that `trafficRouting` is configured |
| Rollback not working | `undo` has no effect | Check `revisionHistoryLimit` — if set to 0, old ReplicaSets are deleted |
| Pods evicted during rollout | OOMKilled or Evicted status | Increase `resources.limits.memory` or add resource quotas |
| Analysis always failing | AnalysisRun shows `Error` | Check Prometheus endpoint is reachable and query syntax is valid |

### Debugging Commands

```bash
# Check rollout events
kubectl describe rollout my-app

# Get analysis run details
kubectl describe analysisrun <name>

# View Pod events
kubectl get events --field-selector involvedObject.name=<pod-name>

# Check Service endpoints
kubectl get endpoints my-app-stable-svc
kubectl get endpoints my-app-canary-svc
```

---

## 7. Summary

| Topic | Key Takeaway |
|-------|-------------|
| **Rolling Update** | Built-in, zero-downtime strategy; tune `maxSurge`/`maxUnavailable` for your availability vs. speed trade-off |
| **Readiness Probes** | Essential for safe rolling updates — never deploy without them |
| **Native Canary** | Two Deployments with a shared Service; traffic split by Pod ratio |
| **Argo Rollouts Canary** | Precise traffic weights, automated analysis, progressive delivery |
| **Automated Analysis** | AnalysisTemplates query metrics to auto-promote or auto-abort canaries |
| **Graceful Shutdown** | Use `preStop` hooks and `terminationGracePeriodSeconds` to drain in-flight requests |
| **CI/CD** | Integrate with GitHub Actions for fully automated canary pipelines |
