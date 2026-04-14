---
sidebar_position: 2
title: "01 — What is Kubernetes"
slug: 01-what-is-kubernetes
---

# What is Kubernetes

## 1. Overview

**Kubernetes** (often abbreviated as **K8s**) is an open-source container orchestration platform originally developed by Google and now maintained by the Cloud Native Computing Foundation (CNCF). It automates the deployment, scaling, and management of containerised applications.

### Why Kubernetes Exists

Before Kubernetes, deploying applications involved one of three eras:

| Era | How Apps Ran | Problems |
|-----|-------------|----------|
| **Traditional** | Directly on physical servers | No resource isolation; one app could starve others |
| **Virtualised** | Inside VMs on hypervisors | Better isolation, but heavy — each VM runs a full OS |
| **Container** | Inside lightweight containers | Fast and portable, but managing hundreds of containers manually is impractical |

Kubernetes solves the **container management problem** — it provides a framework to run distributed systems resiliently, handling failover, scaling, and service discovery automatically.

### Key Benefits

- **Self-healing** — restarts failed containers, replaces unhealthy nodes, kills containers that don't respond to health checks
- **Horizontal scaling** — scale out or in with a single command or automatically based on CPU/memory usage
- **Service discovery & load balancing** — exposes containers using DNS names or IP addresses and distributes traffic
- **Automated rollouts & rollbacks** — gradually rolls out changes and rolls back if something goes wrong
- **Secret & configuration management** — stores and manages sensitive data (passwords, tokens, keys) without rebuilding images
- **Storage orchestration** — automatically mounts storage systems (local, cloud, NFS)

---

## 2. Architecture

Kubernetes follows a **master-worker** architecture. A Kubernetes cluster consists of a **Control Plane** (master) and one or more **Worker Nodes**.

```
┌──────────────────────────────────────────────────────────┐
│                     CONTROL PLANE                        │
│                                                          │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  API Server   │  │ Scheduler │  │ Controller Manager│  │
│  │  (kube-api)   │  │           │  │                  │  │
│  └──────┬───────┘  └─────┬─────┘  └────────┬─────────┘  │
│         │                │                  │            │
│         └────────────────┼──────────────────┘            │
│                          │                               │
│                   ┌──────┴──────┐                        │
│                   │    etcd     │                        │
│                   │ (key-value) │                        │
│                   └─────────────┘                        │
└──────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Worker Node  │ │  Worker Node  │ │  Worker Node  │
│               │ │               │ │               │
│ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │
│ │  kubelet  │ │ │ │  kubelet  │ │ │ │  kubelet  │ │
│ ├───────────┤ │ │ ├───────────┤ │ │ ├───────────┤ │
│ │kube-proxy │ │ │ │kube-proxy │ │ │ │kube-proxy │ │
│ ├───────────┤ │ │ ├───────────┤ │ │ ├───────────┤ │
│ │ Container │ │ │ │ Container │ │ │ │ Container │ │
│ │  Runtime  │ │ │ │  Runtime  │ │ │ │  Runtime  │ │
│ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │
│               │ │               │ │               │
│  [Pod] [Pod]  │ │  [Pod] [Pod]  │ │  [Pod] [Pod]  │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 2.1 Control Plane Components

Each component plays a distinct role. Understanding them is critical for troubleshooting.

#### kube-apiserver

- The **front door** to Kubernetes — every interaction (CLI, UI, internal components) goes through the API server
- Exposes a RESTful API over HTTPS
- Validates and processes API requests, then persists the resulting state to etcd
- Stateless — you can run multiple instances for high availability

**How it works in practice:** when you run `kubectl apply -f deployment.yaml`, the request hits the API server, which validates the manifest, writes the desired state to etcd, and notifies other components.

#### etcd

- A distributed **key-value store** that holds all cluster state and configuration
- Acts as the single source of truth — if etcd is lost and not backed up, the cluster configuration is gone
- Uses the Raft consensus protocol for consistency across replicas
- Should always be backed up in production (`etcdctl snapshot save`)

**What it stores:** node information, pod specs, ConfigMaps, Secrets, service accounts, RBAC roles, current state of every resource.

#### kube-scheduler

- Watches for newly created Pods that have no assigned node
- Selects the best node for each Pod based on:
  - Resource requirements (CPU, memory requests/limits)
  - Hardware/software constraints (node selectors, affinity rules, taints/tolerations)
  - Data locality and inter-workload interference
- Does **not** run the Pod — it only decides *where* the Pod should go

**Example:** if a Pod requests 2 CPU cores and 4 GB RAM, the scheduler filters out nodes that can't satisfy those requirements, then ranks the remaining nodes by scoring criteria.

#### kube-controller-manager

- Runs a collection of **controller loops** that watch the cluster state and make changes to move the current state toward the desired state
- Key controllers include:
  - **Node Controller** — monitors node health, evicts pods from unhealthy nodes
  - **ReplicaSet Controller** — ensures the correct number of pod replicas are running
  - **Deployment Controller** — manages rollout of new versions
  - **Job Controller** — tracks one-off and cron jobs to completion
  - **Service Account Controller** — creates default service accounts for new namespaces

#### cloud-controller-manager

- Integrates with cloud provider APIs (AWS, GCP, Azure)
- Manages cloud-specific resources like load balancers, storage volumes, and node lifecycle
- In EKS, AWS manages this component for you

### 2.2 Worker Node Components

#### kubelet

- The **primary agent** running on every worker node
- Receives Pod specifications (PodSpecs) from the API server and ensures the described containers are running and healthy
- Reports node and Pod status back to the control plane
- Does **not** manage containers that were not created by Kubernetes

#### kube-proxy

- A network proxy running on each node
- Maintains network rules that allow communication to Pods from inside or outside the cluster
- Implements Kubernetes **Service** abstraction using iptables rules (or IPVS in newer clusters)
- Handles TCP, UDP, and SCTP forwarding

#### Container Runtime

- The software responsible for actually running containers
- Kubernetes supports any runtime that implements the **Container Runtime Interface (CRI)**
- Common runtimes: **containerd** (default in most distributions), **CRI-O**
- Docker was deprecated as a runtime in Kubernetes v1.24 (containers built with Docker still work — only the runtime interface changed)

---

## 3. Core Concepts & Objects

### 3.1 Pods

A **Pod** is the smallest deployable unit in Kubernetes. It represents one or more containers that share:

- The same **network namespace** (same IP address, port space)
- The same **storage volumes**
- The same **lifecycle** (scheduled, started, and stopped together)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  containers:
    - name: app
      image: my-app:1.0.0
      ports:
        - containerPort: 8080
      resources:
        requests:
          cpu: "250m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 5
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 3
```

**Step-by-step breakdown of this manifest:**

1. `apiVersion: v1` — uses the core API group (Pods are a core resource)
2. `kind: Pod` — declares this resource as a Pod
3. `metadata.name` — the unique name for this Pod within its namespace
4. `metadata.labels` — key-value pairs used for selection and grouping
5. `spec.containers` — list of containers to run inside the Pod
6. `image: my-app:1.0.0` — the container image and tag to pull
7. `resources.requests` — the minimum CPU/memory the scheduler guarantees
8. `resources.limits` — the maximum CPU/memory the container can use (throttled or killed if exceeded)
9. `livenessProbe` — Kubernetes restarts the container if this check fails
10. `readinessProbe` — the Pod is removed from Service endpoints if this check fails (stops receiving traffic)

:::tip When to use multi-container Pods
Use multi-container Pods for **tightly coupled** processes, such as a sidecar that collects logs from the main application container, or an init container that runs database migrations before the app starts.
:::

### 3.2 ReplicaSets

A **ReplicaSet** ensures that a specified number of identical Pod replicas are running at any given time.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-app-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:1.0.0
```

**How it works:**

1. The ReplicaSet controller watches the cluster for Pods matching `selector.matchLabels`
2. If fewer than `replicas: 3` are running, it creates new Pods from `template`
3. If more than 3 are running (e.g., after scaling down), it terminates excess Pods
4. If a Pod crashes or a node goes down, the controller automatically creates a replacement

:::note
You rarely create ReplicaSets directly. Instead, you create a **Deployment** which manages ReplicaSets for you and adds rollout capabilities.
:::

### 3.3 Deployments

A **Deployment** is the recommended way to manage stateless applications. It sits above ReplicaSets and provides declarative updates.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
```

**Key fields explained:**

- `strategy.type: RollingUpdate` — new Pods are created before old ones are terminated (zero-downtime)
- `maxSurge: 1` — at most 1 Pod above the desired count during the update
- `maxUnavailable: 0` — no Pods may be unavailable during the update (every old Pod must be running until a new one is ready)

**Deployment lifecycle:**

```
Deployment (v1)
  └── ReplicaSet-A (3 replicas) ← all traffic

  # After image update to v2:

Deployment (v2)
  ├── ReplicaSet-A (scaling down: 3 → 0)
  └── ReplicaSet-B (scaling up: 0 → 3) ← traffic shifts here
```

### 3.4 Services

A **Service** provides a stable network endpoint for a set of Pods. Pods are ephemeral (they come and go), but Services provide a persistent IP address and DNS name.

| Service Type | Description | Use Case |
|-------------|-------------|----------|
| `ClusterIP` | Internal-only IP accessible within the cluster | Backend services communicating with each other |
| `NodePort` | Exposes the service on each node's IP at a static port (30000–32767) | Development, direct node access |
| `LoadBalancer` | Provisions an external load balancer (cloud-provider specific) | Production — exposes services to the internet |
| `ExternalName` | Maps a service to a DNS name (CNAME record) | Referencing external services |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

**How this works:**

1. The Service selects all Pods with label `app: my-app`
2. External traffic hits the load balancer on port `80`
3. The load balancer forwards traffic to port `8080` on the selected Pods
4. kube-proxy maintains the iptables/IPVS rules for routing

### 3.5 Namespaces

Namespaces provide logical isolation within a cluster. They partition resources and can have their own resource quotas and RBAC policies.

```bash
# List all namespaces
kubectl get namespaces

# Create a namespace
kubectl create namespace staging

# Deploy into a specific namespace
kubectl apply -f deployment.yaml -n staging
```

Default namespaces in every cluster:

| Namespace | Purpose |
|-----------|---------|
| `default` | Where resources go if no namespace is specified |
| `kube-system` | System components (DNS, proxy, metrics server) |
| `kube-public` | Publicly readable data (e.g., cluster info) |
| `kube-node-lease` | Node heartbeat leases for health detection |

### 3.6 ConfigMaps and Secrets

**ConfigMaps** hold non-sensitive configuration data. **Secrets** hold sensitive data (base64-encoded, optionally encrypted at rest).

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_PASSWORD: cGFzc3dvcmQxMjM=   # base64 of "password123"
```

**Injecting into Pods:**

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

### 3.7 Ingress

An **Ingress** manages external HTTP/HTTPS access to services, providing URL-based routing, SSL termination, and name-based virtual hosting.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

**Ingress requires an Ingress Controller** to function. In EKS, the **AWS Load Balancer Controller** creates ALBs/NLBs automatically from Ingress resources.

---

## 4. Kubernetes Networking Model

Kubernetes imposes three fundamental networking rules:

1. **Pod-to-Pod** — every Pod can communicate with every other Pod without NAT
2. **Pod-to-Service** — Pods access Services via cluster DNS (`<service>.<namespace>.svc.cluster.local`)
3. **External-to-Service** — external traffic enters through LoadBalancer, NodePort, or Ingress

```
                    Internet
                       │
              ┌────────┴────────┐
              │  Load Balancer  │
              │  (AWS ALB/NLB)  │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │    Ingress      │
              │   Controller    │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Service A│  │ Service B│  │ Service C│
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │              │              │
   ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
   │Pod│ Pod │    │Pod│ Pod │   │Pod│ Pod │
   └────────┘    └─────────┘   └─────────┘
```

### CNI (Container Network Interface)

Kubernetes delegates networking to **CNI plugins**. In EKS, the default is the **Amazon VPC CNI plugin**, which assigns real VPC IP addresses to Pods — meaning Pods are directly routable within the VPC.

---

## 5. Storage

### Volume Types

| Type | Lifecycle | Use Case |
|------|-----------|----------|
| `emptyDir` | Same as the Pod | Temporary scratch space, inter-container sharing |
| `hostPath` | Same as the Node | Accessing node-level files (logging agents) |
| `PersistentVolume` (PV) | Independent of Pods | Durable storage (databases, file storage) |
| `PersistentVolumeClaim` (PVC) | Bound to a PV | Request storage without knowing backend details |

### PersistentVolumeClaim Example

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 20Gi
```

In EKS, the **Amazon EBS CSI driver** dynamically provisions EBS volumes when a PVC is created with a matching StorageClass.

---

## 6. Essential kubectl Commands

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes -o wide

# Working with resources
kubectl get pods -n <namespace>
kubectl describe pod <pod-name>
kubectl logs <pod-name> -f --tail=100
kubectl exec -it <pod-name> -- /bin/sh

# Deployments
kubectl apply -f deployment.yaml
kubectl rollout status deployment/my-app
kubectl rollout history deployment/my-app
kubectl rollout undo deployment/my-app

# Scaling
kubectl scale deployment my-app --replicas=5

# Debugging
kubectl get events --sort-by='.lastTimestamp'
kubectl top nodes
kubectl top pods
```

---

## 7. Summary

| Concept | What It Does |
|---------|-------------|
| **Pod** | Smallest deployable unit; wraps one or more containers |
| **ReplicaSet** | Ensures N identical Pods are always running |
| **Deployment** | Manages ReplicaSets; enables declarative updates and rollbacks |
| **Service** | Stable network endpoint for a set of Pods |
| **Ingress** | HTTP/HTTPS routing, SSL termination, virtual hosts |
| **ConfigMap/Secret** | Externalise configuration and sensitive data from images |
| **Namespace** | Logical isolation within a cluster |
| **PVC** | Request durable storage without knowing backend details |

With these fundamentals in place, the next chapter walks through setting up a production-ready EKS cluster on AWS.
