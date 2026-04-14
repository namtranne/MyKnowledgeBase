---
sidebar_position: 3
title: "02 — EKS Setup on AWS"
slug: 02-eks-setup
---

# Setting Up Kubernetes on AWS with EKS

## 1. What is Amazon EKS?

**Amazon Elastic Kubernetes Service (EKS)** is a managed Kubernetes service that runs the Kubernetes control plane for you. AWS handles:

- Control plane provisioning and scaling
- etcd management and backups
- Kubernetes version upgrades
- High availability across multiple Availability Zones
- Security patching of the control plane

You are responsible for:

- Worker nodes (EC2 instances or Fargate)
- Application deployment and configuration
- Networking configuration (VPC, subnets, security groups)
- IAM roles and policies

### EKS Architecture on AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Region                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Amazon EKS                            │    │
│  │         (Managed Control Plane — 3 AZ HA)               │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │    │
│  │  │API Server│  │ Scheduler │  │ Controller Manager    │  │    │
│  │  └──────────┘  └───────────┘  └──────────────────────┘  │    │
│  │                 ┌──────┐                                │    │
│  │                 │ etcd │                                │    │
│  │                 └──────┘                                │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                         │
│         ┌─────────────┼─────────────┐                          │
│         ▼             ▼             ▼                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │  AZ-a      │ │  AZ-b      │ │  AZ-c      │                 │
│  │            │ │            │ │            │                 │
│  │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │                 │
│  │ │EC2 Node│ │ │ │EC2 Node│ │ │ │EC2 Node│ │                 │
│  │ │(Worker)│ │ │ │(Worker)│ │ │ │(Worker)│ │                 │
│  │ └────────┘ │ │ └────────┘ │ │ └────────┘ │                 │
│  │            │ │            │ │            │                 │
│  │  Private   │ │  Private   │ │  Private   │                 │
│  │  Subnet    │ │  Subnet    │ │  Subnet    │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supporting AWS Services                                  │   │
│  │  • ECR (Container Registry)    • CloudWatch (Logging)    │   │
│  │  • ALB (Load Balancer)         • IAM (Access Control)    │   │
│  │  • Route 53 (DNS)              • EBS/EFS (Storage)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

Before creating an EKS cluster, install and configure the following tools.

### Step 2.1 — Install the AWS CLI

The AWS CLI is used to interact with all AWS services.

```bash
# macOS (using Homebrew)
brew install awscli

# Linux (x86_64)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

**Why:** Every EKS operation (cluster creation, IAM configuration, ECR pushes) requires the AWS CLI or an SDK that wraps it.

### Step 2.2 — Configure AWS Credentials

```bash
aws configure
```

You will be prompted for:

| Prompt | Value |
|--------|-------|
| AWS Access Key ID | Your IAM user access key |
| AWS Secret Access Key | Your IAM user secret key |
| Default region name | e.g. `ap-southeast-2` |
| Default output format | `json` |

**Why:** These credentials authenticate your local machine against AWS APIs. For production, use IAM roles and SSO rather than long-lived access keys.

:::tip Using named profiles
If you have multiple AWS accounts, use named profiles:
```bash
aws configure --profile my-dev-account
export AWS_PROFILE=my-dev-account
```
:::

### Step 2.3 — Install kubectl

`kubectl` is the primary CLI tool for interacting with Kubernetes clusters.

```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
```

**Why:** kubectl translates your commands into API calls to the Kubernetes API server. You'll use it for every deployment, debugging, and cluster management task.

### Step 2.4 — Install eksctl

`eksctl` is the official CLI for creating and managing EKS clusters. It abstracts away CloudFormation complexity.

```bash
# macOS
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl

# Linux
curl --silent --location \
  "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" \
  | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Verify
eksctl version
```

**Why:** While you *can* create EKS clusters through the AWS Console or Terraform, eksctl is purpose-built for EKS and handles VPC creation, IAM roles, node groups, and cluster add-ons in a single command.

### Step 2.5 — Install Helm (Optional but Recommended)

Helm is a package manager for Kubernetes, used to install complex applications (e.g., ingress controllers, monitoring stacks).

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

**Why:** Many AWS integrations (ALB Controller, EBS CSI Driver, Cluster Autoscaler) are installed via Helm charts.

---

## 3. Create an EKS Cluster

### Step 3.1 — Create the Cluster with eksctl

The simplest approach creates a fully functional cluster with managed node groups:

```bash
eksctl create cluster \
  --name my-cluster \
  --region ap-southeast-2 \
  --version 1.29 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed
```

**What each flag does:**

| Flag | Purpose |
|------|---------|
| `--name` | Unique name for the EKS cluster |
| `--region` | AWS region where the cluster will be created |
| `--version` | Kubernetes version to use |
| `--nodegroup-name` | Name for the group of worker nodes |
| `--node-type` | EC2 instance type for each worker node |
| `--nodes` | Desired number of worker nodes at launch |
| `--nodes-min` / `--nodes-max` | Auto Scaling Group bounds |
| `--managed` | Uses EKS-managed node groups (AWS handles node AMI updates and draining) |

**What happens behind the scenes (15–20 minutes):**

1. eksctl creates a **CloudFormation stack** for the VPC (2 public + 2 private subnets, NAT gateway, internet gateway)
2. A second stack creates the **EKS control plane** with the specified Kubernetes version
3. A third stack creates the **managed node group** with the specified EC2 instance type and scaling configuration
4. eksctl automatically updates your **kubeconfig** so `kubectl` can communicate with the new cluster

### Step 3.2 — Using a Configuration File (Recommended for Production)

For reproducible, version-controlled cluster definitions, use a YAML config file:

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-cluster
  region: ap-southeast-2
  version: "1.29"

iam:
  withOIDC: true

vpc:
  cidr: "10.0.0.0/16"
  nat:
    gateway: Single

managedNodeGroups:
  - name: general-purpose
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    volumeSize: 50
    volumeType: gp3
    labels:
      role: general
    tags:
      environment: production
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

cloudWatch:
  clusterLogging:
    enableTypes:
      - api
      - audit
      - authenticator
      - controllerManager
      - scheduler

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
```

Apply it:

```bash
eksctl create cluster -f cluster-config.yaml
```

**Key configuration decisions explained:**

- **`withOIDC: true`** — enables IAM Roles for Service Accounts (IRSA), allowing Pods to assume IAM roles directly instead of using node-level permissions. This is a security best practice.
- **`nat.gateway: Single`** — uses one NAT gateway to save costs. For production with strict HA requirements, use `HighlyAvailable` (one per AZ).
- **`volumeType: gp3`** — gp3 EBS volumes are cheaper than gp2 and offer consistent baseline performance.
- **`AmazonSSMManagedInstanceCore`** — enables SSM Session Manager access to nodes (no need for SSH keys or bastion hosts).
- **`cloudWatch.clusterLogging`** — sends control plane logs to CloudWatch for auditing and troubleshooting.

### Step 3.3 — Verify the Cluster

```bash
# Check cluster status
eksctl get cluster --region ap-southeast-2

# Verify kubectl connectivity
kubectl cluster-info

# Check nodes are Ready
kubectl get nodes -o wide
```

Expected output:

```
NAME                                           STATUS   ROLES    AGE   VERSION
ip-10-0-1-123.ap-southeast-2.compute.internal  Ready    <none>   5m    v1.29.0-eks-...
ip-10-0-2-456.ap-southeast-2.compute.internal  Ready    <none>   5m    v1.29.0-eks-...
ip-10-0-3-789.ap-southeast-2.compute.internal  Ready    <none>   5m    v1.29.0-eks-...
```

**Why all nodes show `<none>` for ROLES:** In EKS, worker nodes don't get the `worker` role label by default. The control plane is fully managed and not visible as a node.

---

## 4. Configure IAM for EKS

### Step 4.1 — Understand the IAM Model

EKS uses multiple IAM roles:

```
┌──────────────────────────────────────────────┐
│              IAM Roles for EKS               │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Cluster Role                            │ │
│  │ Used by the EKS control plane           │ │
│  │ Policies: AmazonEKSClusterPolicy        │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Node Group Role                         │ │
│  │ Used by EC2 worker nodes                │ │
│  │ Policies: AmazonEKSWorkerNodePolicy,    │ │
│  │   AmazonEKS_CNI_Policy,                 │ │
│  │   AmazonEC2ContainerRegistryReadOnly    │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Pod-Level Roles (IRSA)                  │ │
│  │ Used by individual Pods via             │ │
│  │ ServiceAccounts                         │ │
│  │ Fine-grained: each app gets only the    │ │
│  │ permissions it needs                    │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Step 4.2 — Set Up IAM Roles for Service Accounts (IRSA)

IRSA allows individual Pods to assume specific IAM roles, following the principle of least privilege.

**Step 1 — Associate the OIDC provider (if not done during cluster creation):**

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region ap-southeast-2 \
  --approve
```

**Why:** This creates an OpenID Connect (OIDC) identity provider in IAM, allowing Kubernetes service accounts to be mapped to IAM roles.

**Step 2 — Create an IAM role bound to a service account:**

```bash
eksctl create iamserviceaccount \
  --name my-app-sa \
  --namespace default \
  --cluster my-cluster \
  --region ap-southeast-2 \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve \
  --override-existing-serviceaccounts
```

**What this does:**

1. Creates an IAM role with a trust policy that allows the specific Kubernetes service account to assume it
2. Creates (or updates) a Kubernetes ServiceAccount annotated with the IAM role ARN
3. The EKS Pod Identity webhook automatically injects AWS credentials into Pods using this ServiceAccount

**Step 3 — Use the service account in your Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: s3-reader
spec:
  serviceAccountName: my-app-sa
  containers:
    - name: app
      image: my-app:1.0.0
```

The application inside this Pod can now call S3 APIs without hardcoded credentials.

---

## 5. Install Essential EKS Add-ons

### Step 5.1 — AWS Load Balancer Controller

This controller watches for Ingress and Service resources and provisions AWS ALBs/NLBs automatically.

**Step 1 — Create the IAM policy:**

```bash
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.1/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json
```

**Why:** The controller needs IAM permissions to create/modify ALBs, target groups, security groups, and listeners in your AWS account.

**Step 2 — Create the service account with the policy:**

```bash
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace kube-system \
  --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

**Step 3 — Install via Helm:**

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

**Step 4 — Verify:**

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

### Step 5.2 — Amazon EBS CSI Driver

Required for dynamically provisioning EBS volumes as PersistentVolumes.

```bash
# Create IRSA for the driver
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve

# Install as an EKS add-on
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster my-cluster \
  --service-account-role-arn arn:aws:iam::<ACCOUNT_ID>:role/<EBS_CSI_ROLE> \
  --force
```

**Why:** Without the EBS CSI driver, Pods cannot request persistent storage via PersistentVolumeClaims on EKS.

**Create a StorageClass:**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

**Configuration choices:**

- `reclaimPolicy: Delete` — the EBS volume is deleted when the PVC is deleted (use `Retain` for critical data)
- `volumeBindingMode: WaitForFirstConsumer` — delays volume creation until a Pod is scheduled, ensuring the volume is in the correct AZ
- `allowVolumeExpansion: true` — allows resizing PVCs without recreating them

### Step 5.3 — Cluster Autoscaler

Automatically adjusts the number of worker nodes based on Pod scheduling demands.

```bash
# Create IRSA
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace kube-system \
  --name cluster-autoscaler \
  --attach-policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/ClusterAutoscalerPolicy \
  --approve

# Install via Helm
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  -n kube-system \
  --set autoDiscovery.clusterName=my-cluster \
  --set awsRegion=ap-southeast-2 \
  --set rbac.serviceAccount.create=false \
  --set rbac.serviceAccount.name=cluster-autoscaler
```

**How it works:**

1. When a Pod can't be scheduled due to insufficient node resources, the autoscaler provisions a new EC2 instance
2. When nodes are underutilised and all Pods can be rescheduled elsewhere, the autoscaler drains and terminates the excess node
3. Scaling respects the `--nodes-min` and `--nodes-max` values from the node group configuration

---

## 6. Push Container Images to Amazon ECR

### Step 6.1 — Create an ECR Repository

```bash
aws ecr create-repository \
  --repository-name my-app \
  --region ap-southeast-2 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

**Why `scanOnPush=true`:** ECR automatically scans images for known CVEs when they're pushed, helping you catch vulnerabilities before deployment.

### Step 6.2 — Build and Push an Image

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region ap-southeast-2 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com

# Build the image
docker build -t my-app:1.0.0 .

# Tag for ECR
docker tag my-app:1.0.0 <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0

# Push
docker push <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0
```

### Step 6.3 — Reference in Kubernetes

```yaml
spec:
  containers:
    - name: app
      image: <ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/my-app:1.0.0
```

Nodes in the EKS cluster can pull from ECR automatically because the node IAM role includes `AmazonEC2ContainerRegistryReadOnly`.

---

## 7. Deploy an Application

### Step 7.1 — Create the Deployment

```yaml
# k8s/deployment.yaml
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
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa
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
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: APP_ENV
              value: "production"
```

### Step 7.2 — Create the Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

### Step 7.3 — Create the Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:<region>:<account>:certificate/<cert-id>
spec:
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

### Step 7.4 — Apply Everything

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Watch the rollout
kubectl rollout status deployment/my-app

# Get the ALB DNS name
kubectl get ingress my-app-ingress
```

The ALB DNS name from the Ingress output can be mapped to your domain in Route 53.

---

## 8. Monitoring and Logging

### CloudWatch Container Insights

```bash
# Enable Container Insights
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name amazon-cloudwatch-observability \
  --region ap-southeast-2
```

This deploys a CloudWatch agent as a DaemonSet on every node, collecting:

- **Container metrics** — CPU, memory, network, disk per Pod
- **Node metrics** — instance-level resource usage
- **Cluster metrics** — aggregate health across all nodes

### kubectl Debugging Commands

```bash
# Check pod logs
kubectl logs deployment/my-app -f --all-containers

# Describe a pod for events and status
kubectl describe pod <pod-name>

# Get cluster events sorted by time
kubectl get events --sort-by='.lastTimestamp' -n default

# Open a shell inside a running container
kubectl exec -it <pod-name> -- /bin/sh
```

---

## 9. Cluster Management

### Updating Kubernetes Version

```bash
# Update the control plane
eksctl upgrade cluster --name my-cluster --version 1.30 --approve

# Update the node group
eksctl upgrade nodegroup \
  --name standard-workers \
  --cluster my-cluster \
  --kubernetes-version 1.30
```

**Why upgrade sequentially:** The control plane must be upgraded before node groups. Kubernetes supports a one-minor-version skew between control plane and nodes.

### Scaling Node Groups

```bash
# Manual scaling
eksctl scale nodegroup \
  --cluster my-cluster \
  --name standard-workers \
  --nodes 5

# Or use kubectl to scale deployments
kubectl scale deployment my-app --replicas=10
```

### Deleting the Cluster

```bash
eksctl delete cluster --name my-cluster --region ap-southeast-2
```

**Warning:** This deletes all resources created by eksctl including the VPC, subnets, NAT gateways, and node groups. Persistent volumes with `reclaimPolicy: Delete` are also removed.

---

## 10. Summary

| Step | What You Did | Why |
|------|-------------|-----|
| Install tools | AWS CLI, kubectl, eksctl, Helm | Required CLIs for cluster lifecycle |
| Create cluster | `eksctl create cluster` | Provisions VPC, control plane, and nodes |
| Configure IAM | OIDC + IRSA | Least-privilege access for Pods |
| Install add-ons | ALB Controller, EBS CSI, Autoscaler | Production-grade networking, storage, and scaling |
| Push images | ECR build/tag/push | Container registry integrated with IAM |
| Deploy app | Deployment + Service + Ingress | Runs your app with load balancing and health checks |
| Monitor | Container Insights + kubectl | Observability into cluster and application health |

With the cluster running and an application deployed, the next chapter covers how to safely update your applications using **rolling deployments** and **canary deployments**.
