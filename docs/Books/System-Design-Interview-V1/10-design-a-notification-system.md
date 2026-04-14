# Chapter 10 — Design a Notification System

> A notification system sends timely information to users via push notifications (iOS/Android), SMS, and email. It must handle millions of notifications daily, support multiple channels, and be reliable without being spammy.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Notification types** | Push notification (iOS, Android), SMS, Email |
| **Soft real-time** | Users should receive notifications within a few seconds, but slight delay is acceptable |
| **Triggers** | Scheduled notifications, event-driven notifications, user-triggered |
| **Opt-out** | Users can opt out of specific notification types |
| **Scale** | 10 million push, 1 million SMS, 5 million emails per day |
| **Devices** | One user may have multiple devices |

---

## Notification Channel Overview

### iOS Push Notification (APNs)

```
  Your Server ──▶ APNs (Apple Push Notification Service) ──▶ iOS Device
```

**Requirements:**
- Requires a **device token** (unique to each device + app)
- Requires a **TLS certificate** or **JWT token** for authentication
- Payload: JSON, max 4 KB
- APNs handles delivery, queuing, and battery optimization

### Android Push Notification (FCM)

```
  Your Server ──▶ FCM (Firebase Cloud Messaging) ──▶ Android Device
```

**Requirements:**
- Requires a **registration token** (per device)
- Requires a **server key** for authentication
- Payload: JSON, max 4 KB
- FCM also supports iOS, web push, and topics

### SMS

```
  Your Server ──▶ SMS Provider (Twilio, Vonage) ──▶ User's Phone
```

- Expensive (1-5 cents per message)
- Rate limited by carriers
- International delivery can be unreliable
- Use sparingly for high-value notifications (2FA, critical alerts)

### Email

```
  Your Server ──▶ Email Service (SendGrid, AWS SES, Mailchimp) ──▶ User's Inbox
```

- Cheapest channel
- Risk of being marked as spam
- Templates with rich HTML content
- Track opens, clicks, bounces, unsubscribes

---

## High-Level Design

### Initial Simple Design

```
  ┌────────────────┐     ┌─────────────────┐
  │  Service 1     │────▶│                 │──▶ APNs ──▶ iOS
  │  Service 2     │────▶│  Notification   │──▶ FCM  ──▶ Android
  │  Service 3     │────▶│  Service        │──▶ SMS  ──▶ Phone
  │  Cron Jobs     │────▶│  (Single Point) │──▶ Email ──▶ Inbox
  └────────────────┘     └─────────────────┘
```

**Problems with simple design:**
- Single point of failure (SPOF)
- Hard to scale different channels independently
- No retry on failure
- No rate limiting

### Improved Design with Message Queues

```
  ┌────────────┐     ┌────────────────┐
  │ Services / │────▶│  Notification  │
  │ Cron Jobs  │     │  Service       │
  └────────────┘     └──────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ iOS Queue│  │SMS Queue │  │Email Q   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ iOS      │  │ SMS      │  │ Email    │
        │ Workers  │  │ Workers  │  │ Workers  │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             ▼             ▼             ▼
           APNs         Twilio       SendGrid
             ▼             ▼             ▼
          iPhones       Phones       Inboxes
```

**Benefits:**
- Each channel scales independently
- Message queues buffer spikes
- Workers retry on failure
- No single point of failure

---

## Data Model

### Device Table

```sql
CREATE TABLE devices (
    id          BIGINT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    device_type ENUM('ios', 'android', 'web'),
    device_token VARCHAR(512) NOT NULL,
    created_at  TIMESTAMP,
    last_active TIMESTAMP,
    INDEX idx_user (user_id)
);
```

One user can have multiple devices. When sending a push notification, query all active devices for that user.

### Notification Table

```sql
CREATE TABLE notifications (
    id              BIGINT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    channel         ENUM('push', 'sms', 'email'),
    template_id     VARCHAR(64),
    content         JSON,
    status          ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled'),
    retry_count     INT DEFAULT 0,
    created_at      TIMESTAMP,
    sent_at         TIMESTAMP,
    INDEX idx_user_time (user_id, created_at)
);
```

### Notification Settings (Opt-Out)

```sql
CREATE TABLE notification_settings (
    user_id         BIGINT,
    channel         ENUM('push', 'sms', 'email'),
    category        VARCHAR(64),   -- e.g., 'marketing', 'transactional', 'social'
    is_enabled      BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, channel, category)
);
```

Always check user preferences before sending.

---

## Detailed Flow

### Sending a Notification

```
  1. Service calls: POST /api/v1/notifications
     { user_id: 123, channel: "push", template: "order_shipped", data: {...} }

  2. Notification Service:
     a. Validate input
     b. Check notification_settings → is user opted in?
        ├── Opted out → discard, return 200 (silently)
        └── Opted in → continue
     c. Check rate limit → too many notifications recently?
        ├── Over limit → queue for later or discard
        └── Under limit → continue
     d. Render template with data
     e. Look up user's devices (for push) or phone/email
     f. Enqueue message to appropriate channel queue
     g. Store notification record with status='pending'
     h. Return 202 Accepted

  3. Channel Worker:
     a. Dequeue message
     b. Send via third-party provider (APNs/FCM/Twilio/SendGrid)
     c. Handle response:
        ├── Success → update status='sent'
        ├── Retriable error → retry with backoff (max 3 retries)
        └── Permanent error → update status='failed', alert
```

---

## Reliability

### Preventing Notification Loss

| Risk | Mitigation |
|------|-----------|
| Worker crashes mid-send | Message stays in queue (not acknowledged until confirmed sent) |
| Queue data loss | Use persistent, replicated queues (Kafka, SQS) |
| Third-party outage | Retry with exponential backoff; dead letter queue for persistent failures |
| Database loss | Replicate notification records across availability zones |

### Exactly-Once Delivery (Deduplication)

Third-party providers may have at-least-once delivery, causing duplicates:

```
  Notification ID: "notif_abc123"
  
  Worker sends to APNs → timeout (no response)
  Worker retries → APNs delivers twice!
  
  Solution: Include a dedupe_id in the notification
  APNs/FCM can deduplicate on their side using collapse_key or apns-collapse-id
```

For SMS and email, use a deduplication table:

```sql
CREATE TABLE sent_notifications (
    notification_id BIGINT PRIMARY KEY,
    sent_at         TIMESTAMP
);

-- Before sending, check: INSERT IGNORE or ON CONFLICT DO NOTHING
-- If insert succeeds → send. If fails (duplicate) → skip.
```

---

## Rate Limiting

Protect users from notification fatigue and protect third-party providers from rate limits:

| Level | Limit Example |
|-------|---------------|
| **Per user** | Max 5 push notifications per hour |
| **Per channel** | Max 100K SMS per day (carrier limits) |
| **Per category** | Max 1 marketing email per day |
| **Global** | Max 1M push notifications per minute (APNs limits) |

Use Redis counters with TTL for rate limiting (same approach as Chapter 4).

---

## Notification Template System

Avoid hardcoding notification content. Use templates:

```
  Template: "order_shipped"
  Content: "Hi {name}, your order #{order_id} has shipped! 
            Track it here: {tracking_url}"
  
  Data: { name: "Alice", order_id: "12345", tracking_url: "..." }
  
  Rendered: "Hi Alice, your order #12345 has shipped! 
             Track it here: ..."
```

**Benefits**: Non-engineers can update copy, A/B test content, and maintain consistency across channels.

---

## Analytics and Monitoring

### Key Metrics

| Metric | Why It Matters |
|--------|---------------|
| **Delivery rate** | % of notifications successfully delivered |
| **Open rate** | % of push/email notifications opened by user |
| **Click-through rate** | % of notifications that led to a user action |
| **Unsubscribe rate** | Are we sending too many? |
| **Failure rate** | Are third-party providers failing? |
| **Latency (P50, P99)** | How fast are notifications delivered? |

### Event Tracking Pipeline

```
  Notification Events ──▶ Kafka ──▶ Analytics Pipeline (Flink/Spark)
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │  Analytics DB │
                                    │  (ClickHouse  │
                                    │   or BigQuery) │
                                    └──────────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │  Dashboard   │
                                    │  (Grafana)   │
                                    └──────────────┘
```

---

## Interview Cheat Sheet

**Q: How would you design a notification system?**
> Separate notification service from delivery workers via message queues — one queue per channel (push, SMS, email). The notification service handles validation, rate limiting, template rendering, and user preference checks. Workers dequeue and send via third-party providers (APNs, FCM, Twilio, SendGrid). Each channel scales independently. Use persistent queues for reliability and retries with exponential backoff for failures.

**Q: How do you prevent duplicate notifications?**
> Use a deduplication mechanism: before sending, check a deduplication table (or Redis set) using the notification ID. If already sent, skip. For push notifications, use APNs collapse_id or FCM collapse_key so the platform handles dedup. Design workers to be idempotent — sending the same notification twice has the same effect as sending it once.

**Q: How do you handle third-party provider failures?**
> Retry with exponential backoff (1s, 2s, 4s, 8s, max 3-5 retries). If all retries fail, move the message to a dead letter queue for manual review or later reprocessing. For critical notifications (2FA codes), consider failover to a secondary provider (e.g., if Twilio SMS fails, try Vonage). Monitor provider health and alert on elevated failure rates.

**Q: How do you prevent notification fatigue?**
> User-level rate limiting (max N notifications per hour), frequency capping per category (max 1 marketing notification per day), user preference settings (opt-out per channel and category), and smart aggregation (batch 10 social notifications into one digest). Track unsubscribe rates as a signal that limits are too aggressive.

**Q: How do you ensure reliability?**
> Persistent message queues (Kafka/SQS) survive crashes. Workers don't acknowledge messages until delivery is confirmed. Notification records are stored in a replicated database. Retry failed deliveries with backoff. Dead letter queue for permanently failed messages. Monitor delivery rates and alert on anomalies. No single point of failure — every component has redundancy.
