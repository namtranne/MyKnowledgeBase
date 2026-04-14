---
sidebar_position: 2
title: "01 — Containers & Virtualization"
slug: 01-containers-virtualization
---

# 🐳 Containers & Virtualization

Containers and virtual machines are the two foundational technologies that underpin modern infrastructure. Every senior engineer must understand their architectures, trade-offs, and when to choose one over the other. This chapter covers virtualization from bare metal to orchestration.

---

## 1. Virtual Machines

A virtual machine (VM) emulates an entire computer — complete with its own OS kernel, drivers, and user-space libraries — running on top of a **hypervisor**.

### Hypervisor Types

```
Type 1 — Bare-Metal Hypervisor
┌─────────────────────────────────────────────────────┐
│                    VM 1         VM 2        VM 3    │
│               ┌──────────┐ ┌──────────┐ ┌────────┐ │
│               │ App A    │ │ App B    │ │ App C  │ │
│               │ Bins/Libs│ │ Bins/Libs│ │Bins/Lib│ │
│               │ Guest OS │ │ Guest OS │ │Guest OS│ │
│               └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐   │
│  │           Hypervisor (Type 1)                │   │
│  │    VMware ESXi / KVM / Hyper-V / Xen         │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │              Bare-Metal Hardware              │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Type 2 — Hosted Hypervisor
┌─────────────────────────────────────────────────────┐
│                    VM 1         VM 2                 │
│               ┌──────────┐ ┌──────────┐             │
│               │ App A    │ │ App B    │             │
│               │ Bins/Libs│ │ Bins/Libs│             │
│               │ Guest OS │ │ Guest OS │             │
│               └──────────┘ └──────────┘             │
│  ┌──────────────────────────────────────────────┐   │
│  │      Hypervisor (Type 2)                     │   │
│  │    VirtualBox / VMware Workstation / Parallels│   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │             Host Operating System             │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │              Hardware                         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

| Feature | Type 1 (Bare-Metal) | Type 2 (Hosted) |
|---------|-------------------|-----------------|
| **Runs on** | Directly on hardware | On top of a host OS |
| **Performance** | Near-native | Overhead from host OS |
| **Examples** | VMware ESXi, KVM, Hyper-V, Xen | VirtualBox, VMware Workstation, Parallels |
| **Use case** | Production data centers, cloud providers | Development, testing, desktop virtualization |
| **Isolation** | Strong hardware-level isolation | Depends on host OS security |

:::tip Senior-Level Insight
AWS EC2 uses a modified Xen hypervisor (older instances) and the **Nitro hypervisor** (newer instances). Nitro offloads networking, storage, and security to dedicated hardware cards, achieving near-bare-metal performance. This is a great example to cite when discussing cloud VM performance.
:::

---

## 2. Containers

Containers provide **OS-level virtualization** — they share the host kernel but isolate processes using Linux kernel features: **namespaces** (isolation) and **cgroups** (resource limits).

### Container Architecture

```
┌─────────────────────────────────────────────────────┐
│            Container 1   Container 2   Container 3  │
│           ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│           │  App A   │  │  App B   │  │  App C   │ │
│           │ Bins/Libs│  │ Bins/Libs│  │ Bins/Libs│ │
│           └──────────┘  └──────────┘  └──────────┘ │
│  ┌──────────────────────────────────────────────┐   │
│  │          Container Runtime (containerd)       │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │          Host Operating System (Linux)         │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │              Hardware                         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Linux Kernel Features Behind Containers

| Feature | Purpose | What It Isolates |
|---------|---------|-----------------|
| **PID namespace** | Process isolation | Each container sees its own PID 1 |
| **Network namespace** | Network isolation | Own IP address, ports, routing table |
| **Mount namespace** | Filesystem isolation | Own root filesystem |
| **UTS namespace** | Hostname isolation | Own hostname |
| **IPC namespace** | Inter-process comm isolation | Own shared memory, semaphores |
| **User namespace** | User/group isolation | Root inside container ≠ root on host |
| **cgroups** | Resource limiting | CPU, memory, disk I/O, network bandwidth |

---

## 3. VMs vs Containers — Comparison

| Aspect | Virtual Machines | Containers |
|--------|-----------------|------------|
| **Isolation** | Full hardware-level (separate kernel) | Process-level (shared kernel) |
| **Startup time** | 30s–minutes | Milliseconds–seconds |
| **Image size** | GBs (full OS) | MBs (app + libs only) |
| **Resource overhead** | High (each VM runs full OS) | Low (shared kernel) |
| **Density** | 10–50 VMs per host | 100–1000+ containers per host |
| **Portability** | Hypervisor-specific formats | OCI-standard, runs anywhere |
| **Security isolation** | Stronger (separate kernel) | Weaker (shared kernel attack surface) |
| **Performance** | Near-native with Type 1 | Near-native (no hypervisor overhead) |
| **OS support** | Can run different OS families | Must match host kernel (Linux on Linux) |
| **State** | Typically stateful | Designed to be stateless/ephemeral |
| **Use case** | Legacy apps, strong isolation needs | Microservices, CI/CD, cloud-native |

:::warning
Containers share the host kernel. A kernel vulnerability (e.g., a privilege escalation exploit) can potentially escape the container boundary. For workloads requiring hard multi-tenancy (e.g., running untrusted code), consider **gVisor** (user-space kernel), **Kata Containers** (lightweight VM per container), or **Firecracker** (microVM).
:::

---

## 4. Docker Architecture

Docker is the most widely-used container platform. Its architecture has evolved from a monolithic daemon to a modular, OCI-compliant stack.

```
┌──────────────────────────────────────────────────────────────┐
│                      Docker Architecture                      │
│                                                               │
│  ┌────────────┐      ┌────────────────────────────────────┐  │
│  │ Docker CLI │─────▶│         Docker Daemon (dockerd)    │  │
│  │  (client)  │ REST │                                    │  │
│  └────────────┘  API │  ┌──────────────────────────────┐  │  │
│                      │  │       containerd              │  │  │
│  ┌────────────┐      │  │  (container lifecycle mgmt)   │  │  │
│  │ Docker     │─────▶│  │                              │  │  │
│  │ Compose    │      │  │  ┌────────┐  ┌────────┐      │  │  │
│  └────────────┘      │  │  │  runc  │  │  runc  │      │  │  │
│                      │  │  │(OCI rt)│  │(OCI rt)│      │  │  │
│                      │  │  └───┬────┘  └───┬────┘      │  │  │
│                      │  └──────┼───────────┼───────────┘  │  │
│                      │         │           │              │  │
│                      │    Container 1  Container 2        │  │
│                      └────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Docker Registry (Docker Hub / ECR / GCR)  │   │
│  │              Stores and distributes container images    │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Docker CLI** | User-facing command-line tool; sends REST API calls to the daemon |
| **Docker Daemon (dockerd)** | Manages images, containers, networks, volumes; exposes the API |
| **containerd** | Industry-standard container runtime; manages container lifecycle |
| **runc** | Low-level OCI runtime; creates and runs containers using Linux namespaces/cgroups |
| **Docker Registry** | Remote storage for images (Docker Hub, Amazon ECR, Google GCR, GitHub GHCR) |

---

## 5. Docker Images & Layers

### Union Filesystem

Docker images are built as a stack of **read-only layers**. Each instruction in a Dockerfile creates a new layer. When a container runs, a thin **writable layer** is added on top.

```
┌───────────────────────────────────┐
│    Writable Container Layer       │  ← runtime writes go here
├───────────────────────────────────┤
│    Layer 4: COPY app.jar /app/    │  ← application code
├───────────────────────────────────┤
│    Layer 3: RUN apt-get install   │  ← dependencies
├───────────────────────────────────┤
│    Layer 2: ENV JAVA_HOME=/usr    │  ← environment config
├───────────────────────────────────┤
│    Layer 1: FROM eclipse-temurin  │  ← base image
└───────────────────────────────────┘
        overlay2 filesystem
```

| Concept | Description |
|---------|-------------|
| **Layer** | A set of filesystem changes (files added/modified/deleted) |
| **Image** | An ordered collection of layers + metadata |
| **Tag** | A human-readable pointer to a specific image (e.g., `nginx:1.25-alpine`) |
| **Digest** | An immutable SHA-256 hash identifying an exact image (`sha256:abc123...`) |
| **Base image** | The starting point (`FROM`); e.g., `ubuntu:22.04`, `alpine:3.19`, `scratch` |
| **overlay2** | Default union filesystem driver in Docker; efficient layer merging |

### Layer Caching

Docker caches each layer. If a layer's instruction and inputs haven't changed, Docker reuses the cached layer. **Order matters** — changing an early layer invalidates all subsequent caches.

```
# Bad ordering — changing source code invalidates dependency cache
COPY . /app                    ← source code changes often
RUN pip install -r requirements.txt  ← re-installs every build!

# Good ordering — dependencies cached separately
COPY requirements.txt /app/    ← changes rarely
RUN pip install -r requirements.txt  ← cached until requirements change
COPY . /app                    ← only this layer rebuilds
```

---

## 6. Dockerfile Best Practices

### Multi-Stage Build

Multi-stage builds reduce final image size by separating the **build environment** from the **runtime environment**.

```dockerfile
# ── Stage 1: Build ──────────────────────────────────────
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN ./mvnw package -DskipTests

# ── Stage 2: Runtime ────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/target/app.jar ./app.jar

USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Best Practices Table

| Practice | Why | Example |
|----------|-----|---------|
| **Use specific base image tags** | Avoid breaking changes from `latest` | `FROM node:20.11-alpine` not `FROM node` |
| **Multi-stage builds** | Build tools excluded from final image | See above |
| **Order layers by change frequency** | Maximize cache hits | COPY deps → install → COPY source |
| **Use `.dockerignore`** | Exclude unnecessary files from build context | `.git`, `node_modules`, `*.md` |
| **Run as non-root** | Limit container compromise blast radius | `RUN adduser` + `USER appuser` |
| **Minimize layers** | Reduce image size and pull time | Combine RUN commands with `&&` |
| **Use COPY, not ADD** | ADD has auto-extract and URL behavior | `COPY` is explicit and predictable |
| **Set HEALTHCHECK** | Enables orchestrator health monitoring | `HEALTHCHECK CMD curl -f ...` |
| **Pin package versions** | Reproducible builds | `RUN apt-get install curl=7.88.1-10` |
| **Scan images** | Detect known CVEs before deployment | `docker scout`, Trivy, Snyk |

### .dockerignore Example

```
.git
.gitignore
node_modules
npm-debug.log
Dockerfile
docker-compose*.yml
*.md
.env
.vscode
coverage/
dist/
```

:::tip Senior-Level Insight
In interviews, mention that the final image from a multi-stage build contains only the runtime — no compilers, build tools, or source code. This reduces the **attack surface** (fewer binaries for exploits) and **image size** (often from 1 GB+ down to 50–100 MB). Always pair this with running as a non-root user.
:::

---

## 7. Container Lifecycle

```
         docker create
              │
              ▼
┌──────────────────────┐
│       CREATED         │
└──────────┬───────────┘
           │ docker start
           ▼
┌──────────────────────┐     docker pause     ┌──────────────────────┐
│       RUNNING         │ ──────────────────▶  │       PAUSED          │
│                       │ ◀──────────────────  │                       │
└──────────┬───────────┘   docker unpause     └──────────────────────┘
           │
           │ docker stop (SIGTERM → 10s → SIGKILL)
           │ docker kill (SIGKILL immediately)
           ▼
┌──────────────────────┐
│       STOPPED         │
└──────────┬───────────┘
           │ docker rm
           ▼
┌──────────────────────┐
│       REMOVED         │
└──────────────────────┘
```

| Command | Signal | Behavior |
|---------|--------|----------|
| `docker stop` | SIGTERM → SIGKILL after grace period (default 10s) | Graceful shutdown; app can clean up |
| `docker kill` | SIGKILL (default) | Immediate termination; no cleanup |
| `docker rm` | — | Removes stopped container and its writable layer |
| `docker rm -f` | SIGKILL + remove | Force kill and remove in one step |

:::warning
Always handle SIGTERM in your application to enable graceful shutdown. Close database connections, finish in-flight requests, flush buffers. If your app ignores SIGTERM, Docker waits the grace period then sends SIGKILL — which can cause data corruption or dropped requests.
:::

---

## 8. Container Networking

### Network Modes

```
┌──────────────────────────────────────────────────────────┐
│                   Docker Host                             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  bridge (docker0)              172.17.0.0/16        │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │  │
│  │  │ Container │  │ Container │  │ Container │       │  │
│  │  │ 172.17.0.2│  │ 172.17.0.3│  │ 172.17.0.4│       │  │
│  │  └───────────┘  └───────────┘  └───────────┘       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  host mode                                          │  │
│  │  Container shares host network namespace             │  │
│  │  No port mapping needed — uses host ports directly   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  overlay (multi-host)                               │  │
│  │  VXLAN tunnel between Docker hosts                   │  │
│  │  Used by Docker Swarm and Kubernetes                 │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

| Mode | Isolation | Use Case | Port Mapping |
|------|-----------|----------|:------------:|
| **bridge** (default) | Own network namespace, NAT to host | Single-host multi-container | Required (`-p 8080:80`) |
| **host** | Shares host network namespace | Maximum network performance | Not needed |
| **overlay** | VXLAN across multiple hosts | Multi-host orchestration (Swarm, K8s) | Service-level |
| **macvlan** | Container gets own MAC address on LAN | Legacy apps needing LAN presence | Not needed |
| **none** | No networking | Security-sensitive batch jobs | N/A |

### DNS Resolution

Docker provides built-in DNS for user-defined networks. Containers can reach each other by **service name**.

```bash
# Create a custom network
docker network create my-app-net

# Containers on the same network resolve each other by name
docker run -d --name db --network my-app-net postgres:16
docker run -d --name api --network my-app-net my-api:latest

# Inside "api" container:
# ping db        → resolves to db container's IP
# curl db:5432   → connects to postgres
```

---

## 9. Container Storage

### Storage Options

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Host                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │                     Container                              │    │
│  │  ┌──────────┐    ┌──────────────┐    ┌────────────────┐   │    │
│  │  │  Volume   │    │  Bind Mount  │    │     tmpfs      │   │    │
│  │  │ /data     │    │ /app/config  │    │ /tmp           │   │    │
│  │  └─────┬────┘    └──────┬───────┘    └───────┬────────┘   │    │
│  └────────┼───────────────┼────────────────────┼─────────────┘    │
│           │               │                    │                   │
│           ▼               ▼                    ▼                   │
│  ┌──────────────┐ ┌──────────────┐    ┌──────────────┐            │
│  │Docker-managed│ │Host directory│    │Host RAM only │            │
│  │/var/lib/dock │ │/home/me/conf │    │(never on disk)│            │
│  │er/volumes/   │ │              │    │              │            │
│  └──────────────┘ └──────────────┘    └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

| Type | Managed By | Persistence | Use Case |
|------|-----------|:-----------:|----------|
| **Volume** | Docker (`docker volume create`) | ✅ Survives container removal | Databases, persistent app data |
| **Bind mount** | Host filesystem path | ✅ Host filesystem | Development (mount source code), config files |
| **tmpfs** | Host RAM | ❌ Memory only | Secrets, scratch space, sensitive temp data |

```bash
# Named volume — portable, Docker-managed
docker run -d --name pg -v pgdata:/var/lib/postgresql/data postgres:16

# Bind mount — host path mapped into container
docker run -d -v $(pwd)/config:/app/config:ro my-app:latest

# tmpfs — in-memory, not persisted
docker run -d --tmpfs /tmp:size=100m my-app:latest
```

:::warning
Containers should be **stateless** whenever possible. Store state in external systems (databases, object storage, caches). If a container must hold state (e.g., database container), always use a named volume — never rely on the writable container layer.
:::

---

## 10. Docker Compose

Docker Compose defines and runs multi-container applications using a declarative YAML file.

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-net

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - app-net

  cache:
    image: redis:7-alpine
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
    networks:
      - app-net

volumes:
  pgdata:
    driver: local

networks:
  app-net:
    driver: bridge
```

```bash
docker compose up -d        # start all services in background
docker compose logs -f api  # follow logs for api service
docker compose down -v      # stop and remove containers + volumes
docker compose ps           # list running services
```

---

## 11. Container Security

| Layer | Practice | Implementation |
|-------|----------|---------------|
| **Image** | Use minimal base images | `alpine`, `distroless`, `scratch` |
| **Image** | Scan for vulnerabilities | `docker scout cves`, Trivy, Snyk |
| **Image** | Pin image digests in production | `FROM nginx@sha256:abc123...` |
| **Build** | Don't embed secrets in images | Use build-time `--secret` flag or runtime injection |
| **Runtime** | Run as non-root user | `USER 1001` in Dockerfile |
| **Runtime** | Read-only root filesystem | `docker run --read-only` |
| **Runtime** | Drop all capabilities, add only needed | `--cap-drop=ALL --cap-add=NET_BIND_SERVICE` |
| **Runtime** | Set resource limits | `--memory=512m --cpus=1.0` |
| **Runtime** | Use seccomp and AppArmor profiles | Restrict system calls |
| **Network** | Use user-defined networks | Isolate service groups; don't use default bridge |
| **Secrets** | Use Docker secrets or env injection | Never hardcode in Dockerfile or image layers |

```bash
# Security-hardened container run
docker run -d \
  --name secure-app \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp:size=50m \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --memory=512m \
  --cpus=1.0 \
  --security-opt=no-new-privileges \
  --pids-limit=100 \
  my-app:1.0.0
```

:::tip Senior-Level Insight
In production, pin images by **digest** (`sha256:...`), not tag. Tags are mutable — someone can push a different image to the same tag. Digests are immutable and guarantee reproducibility. Combine this with image signing (Docker Content Trust / Sigstore cosign) for supply chain security.
:::

---

## 12. Container Orchestration Overview

When you run hundreds or thousands of containers, you need an orchestrator to handle scheduling, scaling, networking, and self-healing.

### Why Orchestration?

| Problem | Orchestrator Solution |
|---------|----------------------|
| Where to run containers? | **Scheduling** — place containers on nodes with available resources |
| Container crashed? | **Self-healing** — automatically restart failed containers |
| Traffic spike? | **Auto-scaling** — add/remove container replicas based on metrics |
| How do containers find each other? | **Service discovery** — DNS-based or label-based routing |
| How to update without downtime? | **Rolling updates** — gradually replace old versions with new |
| How to manage config/secrets? | **ConfigMaps and Secrets** — inject configuration at runtime |

### Kubernetes Key Concepts

```
┌──────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                          │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │  Control Plane                                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │    │
│  │  │API Server│ │Scheduler │ │Controller│ │  etcd    │ │    │
│  │  │          │ │          │ │ Manager  │ │(state DB)│ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───────────────────────┐  ┌───────────────────────┐         │
│  │  Worker Node 1         │  │  Worker Node 2         │        │
│  │  ┌──────────────────┐  │  │  ┌──────────────────┐  │        │
│  │  │  Pod (app:v2)    │  │  │  │  Pod (app:v2)    │  │        │
│  │  │ ┌──────────────┐ │  │  │  │ ┌──────────────┐ │  │        │
│  │  │ │  Container   │ │  │  │  │ │  Container   │ │  │        │
│  │  │ └──────────────┘ │  │  │  │ └──────────────┘ │  │        │
│  │  └──────────────────┘  │  │  └──────────────────┘  │        │
│  │  ┌─────────┐ ┌──────┐  │  │  ┌─────────┐ ┌──────┐ │        │
│  │  │ kubelet │ │kube- │  │  │  │ kubelet │ │kube- │ │        │
│  │  │         │ │proxy │  │  │  │         │ │proxy │ │        │
│  │  └─────────┘ └──────┘  │  │  └─────────┘ └──────┘ │        │
│  └───────────────────────┘  └───────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

| K8s Concept | Description |
|-------------|-------------|
| **Pod** | Smallest deployable unit; one or more containers sharing network/storage |
| **Deployment** | Declares desired state (replicas, image version); handles rolling updates |
| **Service** | Stable network endpoint for a set of pods (ClusterIP, NodePort, LoadBalancer) |
| **Ingress** | HTTP(S) routing from external traffic to services |
| **ConfigMap / Secret** | Inject configuration and sensitive data into pods |
| **Namespace** | Logical cluster partitioning for multi-team/multi-env isolation |
| **DaemonSet** | Ensures one pod per node (log agents, monitoring) |
| **StatefulSet** | Ordered, stable pods with persistent storage (databases, Kafka) |

---

## 13. OCI Standard

The **Open Container Initiative (OCI)** defines industry standards to ensure containers are portable across runtimes and platforms.

| Spec | Purpose | Defines |
|------|---------|---------|
| **Image Spec** | Standardize container image format | Layer format, manifest, config, content addressing |
| **Runtime Spec** | Standardize how containers are run | Lifecycle operations, namespaces, cgroups config |
| **Distribution Spec** | Standardize image distribution (registries) | API for push/pull operations |

:::tip Senior-Level Insight
When discussing Docker in interviews, emphasize that Docker is one implementation of the OCI standard. Kubernetes no longer uses Docker (dockershim was removed in K8s 1.24). Kubernetes uses **containerd** or **CRI-O** directly — both are OCI-compliant runtimes. Docker images still work because they conform to the OCI image spec.
:::

---

## 🔗 Related Chapters

- **[02 — CI/CD Pipelines](./02-cicd-pipelines.md)** — Build and deploy containerized applications
- **[03 — Deployment Strategies](./03-deployment-strategies.md)** — Roll out container updates safely
- **[04 — Common Interview Questions](./04-interview-questions.md)** — Practice container and DevOps scenarios
