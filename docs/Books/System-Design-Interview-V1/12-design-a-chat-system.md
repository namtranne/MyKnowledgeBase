# Chapter 12 — Design a Chat System

> A chat system enables real-time messaging between users. This design covers 1-on-1 chat, group chat, online presence indication, and multi-device synchronization — similar to WhatsApp, Facebook Messenger, or Slack.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Chat types** | 1-on-1 and group chat (max 100 members) |
| **Platforms** | Mobile and web |
| **Scale** | 50 million DAU |
| **Message size** | Text only (max 100 KB); media via CDN links |
| **Encryption** | End-to-end encryption is a nice-to-have, not MVP |
| **History** | Chat history stored forever |
| **Online presence** | Show online/offline status |
| **Push notifications** | Notify offline users of new messages |
| **Multi-device** | Sync messages across phone, tablet, laptop |

### Estimation

```
  50M DAU, each sends ~40 messages/day
  Messages/day: 50M × 40 = 2 billion
  QPS: 2B / 86,400 ≈ ~23,000 QPS
  Peak: ~46,000 QPS
  
  Average message size: 100 bytes
  Storage/day: 2B × 100 bytes = 200 GB/day
  Storage/year: 200 GB × 365 = 73 TB/year
```

---

## Communication Protocols

### The Problem with HTTP

HTTP is request-response: the client asks, the server answers. But chat requires the server to **push** messages to clients without being asked.

| Protocol | Direction | Mechanism | Latency | Use Case |
|----------|-----------|-----------|---------|----------|
| **HTTP Polling** | Client → Server | Client asks "any new messages?" every N seconds | High (N seconds) | Simple, low-scale |
| **HTTP Long Polling** | Client → Server (held open) | Server holds the connection until a message arrives | Medium | Better than polling |
| **WebSocket** | Bidirectional | Persistent full-duplex TCP connection | Low (real-time) | **Best for chat** |
| **Server-Sent Events (SSE)** | Server → Client | Server pushes events over HTTP | Low | One-way streaming |

### HTTP Polling

```
  Client: "Any new messages?"  → Server: "No."     (wasted call)
  Client: "Any new messages?"  → Server: "No."     (wasted call)
  Client: "Any new messages?"  → Server: "Yes! [msg]"
  Client: "Any new messages?"  → Server: "No."     (wasted call)
```

**Problem**: Most responses are empty. Wastes server resources. Higher the polling frequency, more waste.

### HTTP Long Polling

```
  Client: "Any new messages?"  → Server holds connection open...
                                   ...waits...
                                   ...message arrives!
                               → Server: "Yes! [msg]"
  Client: "Any new messages?"  → Server holds again...
```

**Problems:**
- Sender and receiver may connect to different servers → need a way to route
- Server holds connections → resource-intensive
- Connection timeout → must reconnect frequently

### WebSocket (Recommended for Chat)

```
  Client ←────── WebSocket Connection ──────→ Server
  
  1. Client initiates HTTP request with Upgrade: websocket
  2. Server responds 101 Switching Protocols
  3. Full-duplex persistent connection established
  4. Both sides can send messages at any time
  
  Client: "Hello!"  ──▶
                     ◀──  Server: "Message from User B: Hi!"
  Client: "Thanks!" ──▶
```

**Advantages:**
- True real-time, bidirectional communication
- Low overhead (no HTTP headers per message after handshake)
- Persistent connection — no reconnection cost per message

**WebSocket is used for ALL real-time messaging.** Non-real-time features (signup, profile, settings) still use HTTP REST.

---

## High-Level Architecture

```
  ┌──────────────────────────────────────────────────────┐
  │                     Clients                           │
  │   (WebSocket for chat, HTTP for everything else)     │
  └──────┬──────────────────────────────────┬────────────┘
         │ WebSocket                        │ HTTP
         ▼                                  ▼
  ┌──────────────┐                   ┌──────────────┐
  │  Chat        │                   │  API         │
  │  Servers     │                   │  Servers     │
  │  (Stateful)  │                   │  (Stateless) │
  └──────┬───────┘                   └──────────────┘
         │                              │
    ┌────┴────────────┬─────────────────┤
    ▼                 ▼                 ▼
  ┌─────────┐  ┌──────────┐     ┌──────────┐
  │ Message │  │ Presence │     │ User     │
  │ Store   │  │ Service  │     │ Service  │
  │(KV/NoSQL│  └──────────┘     │ Group Svc│
  └─────────┘                   │ Auth     │
                                └──────────┘
```

### Why Chat Servers Are Stateful

Each chat server maintains WebSocket connections to clients. If User A connects to Chat Server 1, all messages to User A must be routed through Server 1.

**Connection management**: A service discovery or routing layer maps `user_id → chat_server_id`:

```
  User A → Chat Server 1 (WebSocket)
  User B → Chat Server 3 (WebSocket)
  
  Routing table (Redis/ZooKeeper):
    user_A → server_1
    user_B → server_3
```

---

## 1-on-1 Chat Message Flow

```
  User A sends "Hello" to User B:
  
  1. User A ──[WebSocket]──▶ Chat Server 1
  
  2. Chat Server 1:
     a. Generate message_id (Snowflake, or local sequence)
     b. Look up: where is User B connected?
        ├── User B is on Chat Server 3
        │   → Route message to Chat Server 3
        └── User B is offline
            → Store message; send push notification
  
  3. Chat Server 3 ──[WebSocket]──▶ User B: "Hello"
  
  4. Store message in Message Store (async, for history)
```

### Message Routing Between Servers

How does Chat Server 1 deliver a message to Chat Server 3?

```
  Option A: Direct server-to-server communication
    Chat Server 1 ──▶ Chat Server 3
    Simple but creates O(N²) connections between N servers
    
  Option B: Message queue (Recommended)
    Chat Server 1 ──▶ [Kafka / Redis Pub/Sub] ──▶ Chat Server 3
    Decoupled, scalable, handles server failures gracefully
```

**Per-user message queue/channel**: Each user has a dedicated queue/channel. When User B's chat server subscribes to User B's channel, it receives all messages for User B.

```
  Kafka topics or Redis channels:
    inbox:user_A → messages for User A
    inbox:user_B → messages for User B
    
  Chat Server 3 subscribes to inbox:user_B
  Chat Server 1 publishes to inbox:user_B
```

---

## Group Chat

### Small Groups (≤ 100 members)

```
  User A sends "Meeting at 3pm" to Group G (members: A, B, C, D):
  
  1. User A ──▶ Chat Server 1
  2. Chat Server 1:
     a. Look up Group G members: [A, B, C, D]
     b. Publish to inbox:user_B, inbox:user_C, inbox:user_D
  3. Each member's chat server delivers the message
```

For small groups, this is efficient — at most 100 publish operations per message.

### Group Message Storage

```
  Table: group_messages
  
  channel_id | message_id | sender_id | content    | created_at
  group_123  | msg_001    | user_A    | "Meeting"  | 2024-03-15 10:30:00
  group_123  | msg_002    | user_B    | "OK"       | 2024-03-15 10:30:05
```

Partition by `channel_id` for fast retrieval of a group's history.

---

## Message Storage

### Why Not a Relational Database?

| Concern | Relational DB | Key-Value / Wide-Column |
|---------|---------------|------------------------|
| Write pattern | Heavy writes stress RDBMS | Optimized for append-only writes |
| Read pattern | Recent messages (tail reads) | Efficient range queries by key |
| Scale | Hard to shard conversations | Natural partition by channel_id |
| Data model | Requires joins | Denormalized, single-table |

### Recommended: Key-Value Store (Cassandra or HBase)

```
  Partition key: channel_id (conversation or group)
  Clustering key: message_id (time-ordered, Snowflake)
  
  channel_id  | message_id      | sender_id | content   | created_at
  conv_A_B    | 17293847501234  | user_A    | "Hello"   | ...
  conv_A_B    | 17293847502345  | user_B    | "Hi!"     | ...
  conv_A_B    | 17293847503456  | user_A    | "How are" | ...
```

**Why this works:**
- All messages in a conversation are co-located (same partition)
- Messages are sorted by time (clustering key)
- "Fetch last 50 messages" = single efficient range query
- Append-only writes — no updates
- Scales horizontally by conversation partition

### Message ID Generation

Within a conversation, messages must be strictly ordered. Options:

| Approach | Pros | Cons |
|----------|------|------|
| **Snowflake** | Globally unique, time-sortable | Slight clock skew risk across servers |
| **Local sequence per channel** | Guaranteed ordering within conversation | Requires a per-channel counter (Redis INCR) |
| **Combined** | Snowflake for global uniqueness + local sequence for ordering | More complex |

**Facebook Messenger** uses a per-conversation sequence number generated by the server that processes the send.

---

## Message Synchronization (Multi-Device)

How does a user see messages on all their devices?

```
  User A's devices:
    Phone:  last_seen_message_id = 100
    Laptop: last_seen_message_id = 95
    Tablet: last_seen_message_id = 80
    
  When Laptop connects:
    → Query: SELECT * FROM messages 
             WHERE channel_id = 'conv_A_B' 
             AND message_id > 95
             ORDER BY message_id ASC
    → Returns messages 96-100
```

Each device tracks its own `cur_max_message_id`. On reconnect, fetch messages since that ID.

---

## Online Presence

### How Presence Works

```
  User A opens app:
    → WebSocket connects → Presence Service: set user_A = "online"
    
  User A closes app:
    → WebSocket disconnects → Presence Service: set user_A = "offline"
    
  User A's friends see:
    → Query Presence Service: is user_A online?
    → Green dot or "last seen 5 min ago"
```

### Heartbeat Mechanism

WebSocket disconnection isn't always clean (network dies, app crashes):

```
  Client sends heartbeat every 30 seconds:
    → "I'm alive" → Presence Service updates last_heartbeat
    
  Presence Service:
    → If last_heartbeat > 90 seconds ago → mark user as "offline"
```

### Presence Fan-Out

How do User A's friends know when A comes online?

```
  Option A: Polling (each friend checks periodically)
    Simple but doesn't scale for large friend lists
    
  Option B: Pub/Sub per user
    User A's friends subscribe to user_A's presence channel
    When A's status changes → publish to channel → all subscribers notified
    
  Option C: Group-based presence (Slack model)
    Only broadcast presence to members of active group channels
    Reduces fan-out significantly
```

For large friend lists, **lazy presence** is more practical: only check a friend's status when their chat window is open.

---

## End-to-End Encryption (E2EE)

While not MVP, here's the approach used by Signal/WhatsApp:

```
  Signal Protocol:
  1. Each user has a key pair (public + private)
  2. Sender encrypts with recipient's public key
  3. Only recipient can decrypt with their private key
  4. Server NEVER sees plaintext messages
  
  For groups: each message is encrypted N times (once per member's public key)
```

**Implication for system design**: Server stores encrypted blobs. No server-side search, no content moderation, no spam filtering on message content.

---

## Interview Cheat Sheet

**Q: Why WebSocket instead of HTTP for chat?**
> HTTP is request-response — the client must constantly poll for new messages, wasting resources. WebSocket provides a persistent, bidirectional connection where the server can push messages to the client in real-time with minimal overhead. After the initial handshake, communication is full-duplex with no HTTP header overhead per message.

**Q: How do you route messages between users on different servers?**
> Use a message queue (Kafka) or pub/sub system (Redis). Each user has a dedicated channel/topic. When User A sends a message to User B, the message is published to User B's channel. User B's chat server subscribes to that channel and delivers the message via WebSocket. This decouples chat servers and handles server failures gracefully.

**Q: Why a NoSQL database for message storage?**
> Chat messages are append-only with a read pattern of "get recent messages for this conversation." A wide-column store like Cassandra or HBase excels at this: partition by conversation_id, cluster by message_id (time-ordered). This gives efficient range queries for recent messages and scales horizontally. Relational databases struggle with the write volume and don't naturally partition by conversation.

**Q: How do you handle group chat at scale?**
> For small groups (≤100 members), publish the message to each member's inbox channel — at most 100 writes per message. Store messages partitioned by group_id for efficient history retrieval. For very large groups (1000+), consider fan-out on read instead of push, or use a tiered approach where only active members receive pushes while others get pull-based delivery.

**Q: How does multi-device synchronization work?**
> Each device tracks the ID of the last message it has seen (cur_max_message_id). When a device connects or comes online, it queries for all messages with ID greater than its last seen ID. This is a simple, efficient range query on the message store. Push new messages to all connected devices in real-time via their WebSocket connections.

**Q: How do you implement online presence?**
> Use a heartbeat mechanism: clients send periodic heartbeats (every 30 seconds) over the WebSocket connection. The presence service tracks the last heartbeat timestamp. If no heartbeat for 90+ seconds, mark the user as offline. Broadcast presence changes to relevant users via pub/sub — either to all friends or only to active conversation participants (lazy presence) for scalability.
