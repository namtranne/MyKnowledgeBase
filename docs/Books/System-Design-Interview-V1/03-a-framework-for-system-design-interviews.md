# Chapter 3 — A Framework for System Design Interviews

> The system design interview is not about arriving at a perfect solution. It's about demonstrating your ability to **think through ambiguity, make trade-offs, and communicate clearly** under pressure.

---

## What the Interview Is Really Testing

| What They're Assessing | What They're NOT Testing |
|------------------------|------------------------|
| Ability to collaborate and communicate | Memorized solutions |
| Skill at navigating ambiguity | Code-level implementation details |
| Problem-solving under constraints | Getting the "right" answer |
| Trade-off awareness | Knowing every technology |
| Knowledge of scale and bottlenecks | Completing the entire design |

**Red flags interviewers look for:**
- Jumping into solution without asking questions
- Over-engineering with no mention of trade-offs
- Tunnel vision — getting stuck on one component
- Stubbornness — not incorporating interviewer hints
- Designing in silence (no communication)

---

## The 4-Step Framework

### Step 1: Understand the Problem and Establish Design Scope (3–10 minutes)

**Do NOT jump into the solution.** Ask clarifying questions to narrow the scope.

#### Types of Questions to Ask

| Category | Example Questions |
|----------|------------------|
| **Functional requirements** | What are the most important features? Who are the users? What does the user do? |
| **Scale** | How many users? DAU? How many requests per second? |
| **Performance** | What's the expected latency? Read-heavy or write-heavy? |
| **Data** | How much data per user? How long is data retained? |
| **Non-functional** | High availability required? Consistency vs availability trade-off? |
| **Existing infrastructure** | Are we building from scratch? Can we use existing services (AWS, Kafka, etc.)? |
| **Constraints** | Budget? Team size? Timeline? |

#### Example: "Design a News Feed System"

Good clarifying questions:
1. Is this for mobile, web, or both?
2. What goes in the feed? Just text? Images? Videos?
3. How many friends can a user have?
4. How is the feed sorted — chronologically or by relevance?
5. How many users? What's the DAU?
6. Can the feed contain ads?

> **The goal**: Turn a vague problem into a well-scoped design challenge. Write down the agreed requirements.

---

### Step 2: Propose High-Level Design and Get Buy-In (10–15 minutes)

Develop an initial blueprint. Collaborate with the interviewer — treat them as a teammate.

#### Strategy

1. **Start with the API design** — define the key endpoints
2. **Draw the high-level diagram** — clients, servers, databases, caches, queues
3. **Walk through the main use cases** — show how data flows through the system
4. **Get explicit buy-in** — "Does this high-level approach make sense before I dive deeper?"

#### API Design Example (News Feed)

```
POST /v1/feed/publish
  body: { content, media_ids }
  → Creates a new post

GET /v1/feed
  params: { user_id, cursor, page_size }
  → Returns the user's personalized news feed
```

#### High-Level Diagram Example

```
  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │  Client  │────▶│  API Gateway │────▶│  Feed Service│
  │  (App)   │     │  / Load Bal  │     │              │
  └──────────┘     └──────────────┘     └──────┬───────┘
                                               │
                          ┌────────────────────┬┴──────────┐
                          ▼                    ▼           ▼
                   ┌──────────┐         ┌──────────┐ ┌────────┐
                   │  Post    │         │  User    │ │ Cache  │
                   │  Service │         │  Graph   │ │(Redis) │
                   └──────────┘         └──────────┘ └────────┘
```

#### Tips for This Step

- Use boxes and arrows — keep it simple
- Don't over-detail at this stage
- Cover the 2-3 most important flows
- Mention trade-offs: "We could use fan-out on write or fan-out on read — let me explain both"
- If the interviewer suggests changes, incorporate them

---

### Step 3: Design Deep Dive (10–25 minutes)

This is where you differentiate yourself. The interviewer will guide you toward areas they want to explore.

#### What to Expect

| Interviewer Signal | Your Response |
|-------------------|---------------|
| "How would you handle X at scale?" | Discuss sharding, caching, CDN, async processing |
| "What about failures?" | Discuss replication, failover, circuit breakers, retries |
| "How do you store this data?" | Discuss schema design, SQL vs NoSQL, indexing, partitioning |
| "What are the bottlenecks?" | Identify the hottest path, propose solutions |
| "How do you handle edge cases?" | Celebrity problem, race conditions, data consistency |

#### Deep Dive Strategies

**For each component, discuss:**
1. **Data model and storage** — what schema, what database, why
2. **Scaling strategy** — how this component scales independently
3. **Failure handling** — what happens when this component goes down
4. **Performance optimization** — caching, indexing, denormalization

**Use concrete numbers from Chapter 2:**
- "If we have 10M DAU doing 5 reads/day, that's ~580 QPS average, ~1,700 peak. A single Redis node handles 100K QPS, so cache is not a bottleneck."

---

### Step 4: Wrap Up (3–5 minutes)

Never end abruptly. Use this time strategically.

#### What to Cover

| Action | Example |
|--------|---------|
| **Summarize** | Briefly recap the design and key decisions |
| **Discuss bottlenecks** | "The main bottleneck is the database write path — we mitigate with sharding and async writes" |
| **Error handling** | Retries, dead letter queues, monitoring, alerting |
| **Operational concerns** | Metrics, logging, dashboards, deploy strategy |
| **Future scaling** | "At 10x growth, we'd need to split this service into two" |
| **Trade-offs revisited** | "We chose AP over CP for the feed — if we needed strict ordering, we'd change the approach" |

#### What NOT to Do

- Don't introduce entirely new components at this stage
- Don't say "I would just use [technology]" without explanation
- Don't ignore the interviewer's questions or redirect

---

## Time Budget Summary

| Step | Time | Goal |
|------|------|------|
| 1. Understand & Scope | 3–10 min | Narrow the problem; agree on requirements |
| 2. High-Level Design | 10–15 min | Blueprint with API, components, data flow |
| 3. Deep Dive | 10–25 min | Detailed design of critical components |
| 4. Wrap Up | 3–5 min | Summary, bottlenecks, future improvements |

---

## Common Mistakes and How to Avoid Them

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| **Jumping to solution** | Misses requirements; designs for wrong problem | Always ask 3–5 clarifying questions first |
| **Over-engineering** | Shows poor judgment; ignores constraints | Start simple; add complexity only when justified |
| **Designing in silence** | Interviewer can't evaluate your thinking | Think out loud; explain every decision |
| **Ignoring trade-offs** | Every choice has pros/cons; ignoring them = superficial | For every decision, state at least one trade-off |
| **Getting stuck** | Wastes time; shows inability to move forward | State what you're stuck on; ask for a hint; move on |
| **No numbers** | Design isn't grounded in reality | Use back-of-the-envelope estimates to validate choices |
| **Perfectionism** | No design is perfect in 45 minutes | Acknowledge limitations; focus on the core |

---

## Framework Applied: "Design a Chat System"

Quick demonstration of the 4-step framework in action:

### Step 1: Scope
- 1-on-1 chat or group? → Both
- Mobile, web, or both? → Both
- Scale? → 50M DAU
- Message history retention? → Forever
- Media support? → Text only for now
- End-to-end encryption? → Not for MVP
- Push notifications? → Yes

### Step 2: High-Level Design
- Clients connect via WebSocket for real-time messaging
- REST API for non-real-time operations (user profile, friend list)
- Message stored in a key-value store (Cassandra) for write-heavy workload
- Presence service tracks online/offline status
- Push notification service for offline users

### Step 3: Deep Dive (Interviewer asks about message delivery)
- WebSocket for persistent connection
- How to handle message ordering? Sequence IDs per conversation
- How to sync across devices? Last-read pointer per device
- Group chat fan-out? Write message once, notify all group members

### Step 4: Wrap Up
- Bottleneck: WebSocket connection management at scale
- Future: media support, E2E encryption, message search

---

## Interview Cheat Sheet

**Q: How do you approach a system design interview?**
> Four steps: (1) Clarify requirements — ask about features, scale, constraints, and non-functional requirements. (2) Propose a high-level design — API, major components, data flow — and get buy-in. (3) Deep dive into 2-3 critical components based on interviewer interest. (4) Wrap up with a summary, bottlenecks, error handling, and future improvements.

**Q: What's the biggest mistake candidates make?**
> Jumping straight into the solution without asking clarifying questions. This leads to solving the wrong problem, missing key requirements, and demonstrating poor communication skills. Always spend the first 5-10 minutes understanding and scoping the problem.

**Q: How detailed should the design be?**
> It depends on the interview length and interviewer signals. For a 45-minute interview, you won't design every component in detail. Focus on the core flow and the 2-3 most interesting/challenging components. Use the interviewer's questions as signals for where to go deep.

**Q: What if I don't know a specific technology?**
> Be honest. Describe what properties you need (e.g., "I need a write-optimized, horizontally scalable data store") and explain your reasoning. The interviewer cares more about your reasoning than whether you know Cassandra vs DynamoDB.
