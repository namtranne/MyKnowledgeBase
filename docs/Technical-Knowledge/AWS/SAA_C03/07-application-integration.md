---
sidebar_position: 8
title: "07 — Application Integration"
slug: 07-application-integration
---

# Application Integration & Decoupling

Decoupling is a core exam theme — questions ask how to build scalable, loosely coupled architectures using queues, topics, event buses, and API management.

---

## Architecture Patterns

### Synchronous vs Asynchronous

| Pattern | How | Risk | Solution |
|---------|-----|------|----------|
| **Synchronous** | Service A calls Service B and waits | If B is slow/down, A is affected | Tightly coupled — avoid for high scale |
| **Asynchronous** | Service A sends message, Service B processes later | Message can be lost if not durable | Use SQS, SNS, EventBridge for durability |

### Key Decoupling Patterns

```
1. Queue-Based (SQS)
   Producer → [SQS Queue] → Consumer
   (1:1, consumer pulls)

2. Pub/Sub (SNS)
   Publisher → [SNS Topic] → Subscriber A
                           → Subscriber B
                           → Subscriber C
   (1:many, push-based)

3. Fan-Out (SNS + SQS)
   Publisher → [SNS Topic] → [SQS Queue A] → Consumer A
                           → [SQS Queue B] → Consumer B
   (1:many with independent processing)

4. Event Bus (EventBridge)
   Event Source → [EventBridge] → Rule 1 → Target A
                                → Rule 2 → Target B
   (event-driven routing with filtering)
```

---

## Amazon SQS (Simple Queue Service)

Fully managed **message queue**. The most commonly tested decoupling service.

### Queue Types

| Feature | Standard Queue | FIFO Queue |
|---------|---------------|------------|
| **Ordering** | Best-effort (generally in order) | **Strict FIFO** (guaranteed order) |
| **Duplicates** | At-least-once (possible duplicates) | **Exactly-once** processing |
| **Throughput** | Nearly unlimited | 300 msg/s (3,000 with batching, 70K with high throughput mode) |
| **Name** | Any name | Must end with `.fifo` suffix |
| **Deduplication** | None | Content-based or deduplication ID |
| **Message groups** | N/A | Messages grouped by **Message Group ID** (ordered within group) |

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Message size** | Max **256 KB** (use **SQS Extended Client Library** + S3 for larger payloads) |
| **Retention** | 1 minute to **14 days** (default 4 days) |
| **Visibility Timeout** | After a consumer receives a message, it's hidden for X seconds (default 30s, max 12h). If not deleted, message reappears for retry. |
| **Long Polling** | Consumer waits up to **20 seconds** for messages (reduces empty responses + API costs). Set `WaitTimeSeconds > 0`. |
| **Short Polling** | Returns immediately even if no messages (default). Wasteful. |
| **Delay Queue** | Messages are invisible for a configured delay (0 to **15 minutes**) before becoming available. |
| **Dead Letter Queue (DLQ)** | After `maxReceiveCount` failed processing attempts, message moves to DLQ for investigation. |
| **DLQ Redrive** | Move messages from DLQ back to the source queue for reprocessing. |
| **Temporary Queue** | Request-response pattern via SQS. Auto-deleted after use. |

### SQS + Auto Scaling Pattern

```
              CloudWatch Alarm
              (ApproximateNumberOfMessagesVisible)
                     │
                     ▼
Producers → [SQS Queue] → ASG (EC2 Consumers)
                           ├── Scale out: queue depth ↑
                           └── Scale in:  queue depth ↓
```

This is a **very common exam pattern** — scale EC2 fleet based on SQS queue depth.

### SQS Access Control

- **IAM policies** — control who can send/receive
- **SQS Access Policy** (resource-based) — cross-account access, allow SNS/S3 to write to queue

### SQS Encryption

- **In-transit:** HTTPS endpoints (always available)
- **At-rest:** SSE-SQS (AWS managed, default) or SSE-KMS (customer managed key)

---

## Amazon SNS (Simple Notification Service)

**Pub/Sub messaging** — one message to many subscribers.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Topic** | A named channel for message distribution |
| **Publisher** | Sends messages to a topic (AWS services, applications) |
| **Subscribers** | SQS, Lambda, HTTP/S, email, SMS, mobile push, Kinesis Data Firehose |
| **Fan-out** | One message → delivered to all subscribers |
| **FIFO Topics** | Ordered + deduplicated (subscribers must be FIFO SQS queues or Lambda) |
| **Message filtering** | Subscriber sets a **filter policy** to receive only matching messages |
| **Max message size** | 256 KB |

### SNS + SQS Fan-Out Pattern

The most important SNS pattern for the exam:

```
                          ┌─── [SQS Queue - Processing] ──→ Worker A
                          │
Event ──→ [SNS Topic] ────┼─── [SQS Queue - Analytics]  ──→ Worker B
                          │
                          └─── [SQS Queue - Archive]     ──→ Worker C
```

**Why not send directly to each queue?**
- SNS provides **one-to-many** delivery
- Adding new consumers doesn't require changing the producer
- Each queue has independent retry/DLQ behavior
- Atomicity — the event is published once

### Message Filtering

Subscribers can filter messages based on attributes:

```json
// Message attributes
{
  "orderType": "electronics",
  "amount": 150
}

// Filter policy on subscriber (only receives electronics orders > $100)
{
  "orderType": ["electronics"],
  "amount": [{"numeric": [">", 100]}]
}
```

### SNS FIFO Topics

- **Ordering** by Message Group ID
- **Deduplication** by content or deduplication ID
- Subscribers must be **SQS FIFO queues** or **Lambda**
- Throughput: 300 msg/s (3,000 with batching)

---

## Amazon EventBridge

**Serverless event bus** — routes events from sources to targets based on rules. The evolution of CloudWatch Events.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Event Bus** | Default (AWS events), custom (your events), partner (SaaS) |
| **Event Source** | AWS services, custom apps, SaaS partners (Zendesk, Datadog, Stripe, etc.) |
| **Rules** | Match events using JSON patterns → route to targets |
| **Targets** | Lambda, SQS, SNS, Step Functions, Kinesis, ECS, API Gateway, and many more |
| **Scheduling** | Cron and rate-based schedules (replaces CloudWatch Events cron) |
| **Schema Registry** | Auto-discovers and stores event schemas |
| **Archive & Replay** | Archive events and replay them later (great for testing/debugging) |
| **Cross-account** | Send events to event buses in other accounts |
| **Cross-Region** | Send events to event buses in other Regions |

### EventBridge vs SNS

| Feature | EventBridge | SNS |
|---------|------------|-----|
| **Event sources** | AWS, SaaS partners, custom | Custom, AWS services |
| **Filtering** | Advanced JSON content-based filtering | Attribute-based filtering |
| **Targets** | 15+ AWS services | SQS, Lambda, HTTP, email, SMS |
| **Archive/Replay** | Yes | No |
| **Schema discovery** | Yes | No |
| **Throughput** | Lower than SNS | Higher throughput |
| **Use case** | Event-driven architectures, SaaS integration | Fan-out, notifications |

:::tip Exam pattern
"Event-driven routing with rules" → **EventBridge**. "Fan-out to multiple SQS queues" → **SNS + SQS**. "Receive events from SaaS partners" → **EventBridge**. "Scheduled cron jobs serverless" → **EventBridge Scheduler**.
:::

### EventBridge Pipes

**Point-to-point integrations** between event producers and consumers with optional filtering, enrichment, and transformation — without writing custom integration code.

| Feature | Detail |
|---------|--------|
| **Sources** | SQS, Kinesis Data Streams, DynamoDB Streams, MSK, MQ, self-managed Kafka |
| **Targets** | Step Functions, Lambda, ECS tasks, API Gateway, EventBridge bus, Kinesis, SNS, SQS, and more |
| **Filtering** | Filter events before processing (reduce cost and noise) |
| **Enrichment** | Call Lambda, Step Functions, API Gateway, or API destination to enrich data before delivery |
| **Transformation** | Transform input to match target format |

```
Source (SQS) → [Filter] → [Enrich via Lambda] → [Transform] → Target (Step Functions)
```

**Pipes vs EventBridge Rules:**
- **Pipes:** Point-to-point, with built-in filtering + enrichment + transformation in a single flow
- **Rules:** Event-pattern matching with fan-out to multiple targets, no built-in enrichment step

:::tip Exam pattern
"Connect SQS to Step Functions with filtering and enrichment" → **EventBridge Pipes**. "Point-to-point integration between event source and target" → **EventBridge Pipes**.
:::

---

## AWS Step Functions

**Orchestrate workflows** as visual state machines.

### Key Concepts

| Concept | Detail |
|---------|--------|
| **State Machine** | JSON/YAML definition of a workflow |
| **States** | Task, Choice, Parallel, Wait, Map, Pass, Succeed, Fail |
| **Visual workflow** | Auto-generated visual designer showing execution flow |
| **Error handling** | Retry, Catch, Timeout — built into the state machine definition |
| **Integration** | 200+ AWS services (Lambda, ECS, DynamoDB, SQS, SNS, Glue, SageMaker, etc.) |

### Workflow Types

| Type | Max Duration | Execution Model | Use Case |
|------|-------------|-----------------|----------|
| **Standard** | Up to **1 year** | Exactly-once | Long-running processes, human approval, ETL |
| **Express** | Up to **5 minutes** | At-least-once (async) or at-most-once (sync) | High-volume, short (IoT, streaming, data transform) |

### Step Functions Patterns

| Pattern | How |
|---------|-----|
| **Sequential** | State A → State B → State C |
| **Parallel** | Run multiple branches simultaneously |
| **Choice** | Conditional branching (if/else) |
| **Map** | Iterate over a collection (like for-each) |
| **Wait** | Pause for a duration or until a timestamp |
| **Human approval** | Wait for a callback token (task token pattern) |
| **Error handling** | Retry with exponential backoff + Catch fallback states |

:::tip Exam pattern
"Orchestrate multiple Lambda functions" → **Step Functions**.
"Visual workflow with error handling" → **Step Functions**.
"Long-running process with human approval" → **Step Functions (Standard)**.
:::

---

## Amazon API Gateway

Fully managed service to **create, publish, and manage APIs** at any scale.

### API Types

| Type | Protocol | Use Case |
|------|----------|----------|
| **REST API** | HTTP (RESTful) | Full-featured: caching, throttling, API keys, request validation, WAF |
| **HTTP API** | HTTP | Simpler, faster, cheaper. JWT auth, CORS. No caching/WAF. |
| **WebSocket API** | WebSocket | Real-time two-way communication (chat, gaming, dashboards) |

### Key Features

| Feature | Detail |
|---------|--------|
| **Integration** | Lambda, HTTP endpoints, AWS services (DynamoDB, Step Functions, SQS) |
| **Authentication** | IAM, Cognito User Pools, Lambda Authorizer, API Keys |
| **Throttling** | Rate limiting: default 10,000 req/s, burst 5,000 |
| **Caching** | API response caching (300 MB, TTL 0-3600s) — REST API only |
| **Stages** | Deploy API to stages (dev, staging, prod) with stage variables |
| **Usage Plans** | Control per-client API key access (rate, burst, quota) |
| **Request/Response transformation** | Mapping templates (VTL) to transform request/response |
| **WAF** | Attach AWS WAF for Layer 7 protection — REST API only |
| **Custom domain** | Map your domain to API Gateway via Route 53 + ACM |
| **CORS** | Must enable for cross-origin browser requests |

### API Gateway + Lambda (Serverless API)

```
Client → API Gateway (REST) → Lambda Function → DynamoDB
                │
                ├── Authentication (Cognito / IAM)
                ├── Throttling (10K req/s)
                ├── Caching (reduce Lambda invocations)
                ├── Request validation
                └── WAF (protect against attacks)
```

### API Gateway Endpoint Types

| Type | Behavior |
|------|----------|
| **Edge-Optimized** (default) | Routed through CloudFront edge locations. Best for global clients. |
| **Regional** | For clients in the same Region. Can attach your own CloudFront distribution. |
| **Private** | Only accessible within your VPC via VPC Interface Endpoint. |

:::tip Exam pattern
"Serverless REST API" → **API Gateway + Lambda**. "Throttle API requests" → **API Gateway throttling + Usage Plans**. "WebSocket real-time" → **API Gateway WebSocket API**.
:::

---

## AWS AppSync

Managed **GraphQL API** service.

| Feature | Detail |
|---------|--------|
| **Protocol** | GraphQL |
| **Data sources** | DynamoDB, Lambda, RDS (Aurora), HTTP, OpenSearch, EventBridge |
| **Real-time** | WebSocket-based subscriptions for real-time data |
| **Offline** | Built-in offline data sync for mobile apps |
| **Caching** | Server-side caching |
| **Auth** | API key, Cognito, IAM, OIDC |
| **Use case** | Mobile/web apps needing real-time data, multiple data sources in one API |

:::tip Exam pattern
"GraphQL API" → **AppSync**. "Real-time data sync for mobile" → **AppSync**.
:::

---

## Amazon MQ

Managed **message broker** for **Apache ActiveMQ** and **RabbitMQ**.

| Feature | Detail |
|---------|--------|
| **Protocols** | AMQP, MQTT, STOMP, OpenWire, WSS |
| **Use case** | Migrate on-prem message brokers (ActiveMQ/RabbitMQ) to AWS **without code changes** |
| **HA** | Active/standby across AZs (ActiveMQ), cluster across AZs (RabbitMQ) |
| **Scale** | Doesn't scale as well as SQS/SNS |

**MQ vs SQS/SNS:**
- Use **SQS/SNS** for new cloud-native applications (serverless, unlimited scale)
- Use **Amazon MQ** when migrating from on-prem with existing protocols (AMQP, MQTT, etc.)

:::tip Exam pattern
"Migrate on-prem ActiveMQ/RabbitMQ to AWS" → **Amazon MQ**. "New cloud-native decoupling" → **SQS/SNS**.
:::

---

## Amazon SES (Simple Email Service)

**Scalable email sending and receiving** service.

| Feature | Detail |
|---------|--------|
| **Purpose** | Send transactional emails, marketing emails, and bulk email |
| **Sending** | SMTP interface or SES API |
| **Receiving** | Receive emails → trigger Lambda, store in S3, publish to SNS |
| **Deliverability** | Dedicated IPs, DKIM/SPF/DMARC authentication, reputation dashboard |
| **Templates** | HTML email templates with personalization |
| **Use case** | Order confirmations, password resets, marketing campaigns, notifications |

**SES vs SNS for email:**
- **SES:** Full-featured email service — rich HTML emails, attachments, bulk sending, deliverability management
- **SNS:** Simple text notifications — plain text email, SMS, push. Not for formatted/bulk email.

:::tip Exam pattern
"Send transactional/marketing emails" → **SES**. "Simple notification to email/SMS" → **SNS**. "Receive emails and process them" → **SES** (incoming email → S3/Lambda/SNS).
:::

---

## Amazon AppFlow

Managed **data integration** service — securely transfer data between **SaaS apps** and AWS.

| Feature | Detail |
|---------|--------|
| **Sources** | Salesforce, SAP, Zendesk, Slack, ServiceNow, Google Analytics, and more |
| **Destinations** | S3, Redshift, Salesforce, Snowflake, and more |
| **Frequency** | On schedule, on event, or on demand |
| **Transformations** | Filter, validate, map fields |
| **Encryption** | In transit and at rest |

:::tip Exam pattern
"Transfer data from Salesforce to S3" → **Amazon AppFlow**.
:::

---

## Integration Exam Cheat Sheet

| Scenario | Answer |
|----------|--------|
| "Decouple producer and consumer" | SQS |
| "Fan-out to multiple consumers" | SNS → SQS (fan-out pattern) |
| "Event-driven routing with rules" | EventBridge |
| "Process events from SaaS (Zendesk, etc.)" | EventBridge |
| "Scheduled serverless cron jobs" | EventBridge Scheduler |
| "Orchestrate multiple Lambda functions" | Step Functions |
| "Long-running workflow with human approval" | Step Functions (Standard) |
| "Serverless REST API" | API Gateway + Lambda |
| "WebSocket real-time API" | API Gateway WebSocket |
| "GraphQL API" | AppSync |
| "Migrate on-prem ActiveMQ" | Amazon MQ |
| "Transfer SaaS data to S3" | AppFlow |
| "Scale workers based on queue depth" | SQS + ASG (custom CloudWatch metric) |
| "Exactly-once ordered processing" | SQS FIFO |
| "Messages fail after N retries" | SQS Dead Letter Queue |
| "Reduce SQS API calls" | Long Polling (WaitTimeSeconds > 0) |
| "Send transactional/marketing emails" | Amazon SES |
| "Point-to-point integration with enrichment" | EventBridge Pipes |
