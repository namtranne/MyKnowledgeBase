---
sidebar_position: 2
title: "01 — Behavioral Interviews"
slug: 01-behavioral-interviews
---

# 🎤 Behavioral Interviews

Behavioral interviews account for **30–50% of FAANG interview loops** and carry **equal weight** to technical rounds. A brilliant coder who can't articulate impact, handle conflict, or demonstrate leadership will not pass the hiring bar. This chapter gives you a repeatable system for preparing, structuring, and delivering compelling behavioral answers.

---

## 1. Why Behavioral Interviews Matter

### The Business Case

| Factor | Why It Matters |
|--------|---------------|
| **Culture fit** | A senior engineer who clashes with team values costs more than a mis-hired junior |
| **Predictive power** | Past behavior is the best predictor of future behavior |
| **Collaboration signal** | Technical ability alone doesn't ship products — teamwork does |
| **Leadership assessment** | Senior/Staff roles require influence, mentorship, and strategic thinking |
| **Risk mitigation** | One toxic hire can cause 10–20% team attrition |

### Weight Across Companies

| Company | Behavioral Rounds | % of Total Loop | Key Focus |
|---------|:-----------------:|:---------------:|-----------|
| **Amazon** | 1–2 dedicated + woven into all rounds | ~40–50% | Leadership Principles |
| **Google** | 1 dedicated "Googleyness & Leadership" | ~25% | Collaboration, cognitive ability |
| **Meta** | 1 dedicated behavioral | ~25–30% | Move fast, impact, directness |
| **Apple** | Woven into all rounds | ~30% | Attention to detail, cross-functional |
| **Netflix** | Culture-focused conversation | ~30–40% | Freedom & Responsibility |
| **Microsoft** | 1–2 behavioral rounds | ~25–30% | Growth mindset, collaboration |

:::tip Senior-Level Insight
At senior/staff level, behavioral carries **more** weight than at junior levels. Companies assume you can code — they want to know if you can lead, influence, and make sound decisions under ambiguity. A "hire" on technical and "no hire" on behavioral is a **reject** at most FAANG companies.
:::

---

## 2. The STAR Framework

STAR is the gold standard for structuring behavioral answers. Every answer should follow this structure:

### The Four Components

| Component | What to Include | Time Allocation | Common Mistakes |
|-----------|----------------|:---------------:|-----------------|
| **S — Situation** | Set the scene: team, project, timeline, stakes | ~15% (20–30 sec) | Too much background, irrelevant detail |
| **T — Task** | Your specific responsibility or challenge | ~10% (10–20 sec) | Describing the team's task, not yours |
| **A — Action** | What **you** specifically did, step by step | ~50% (60–90 sec) | Using "we" instead of "I", being vague |
| **R — Result** | Quantified outcome, impact, what changed | ~25% (30–45 sec) | No metrics, no business impact |

### STAR Timing Guide

Total answer length: **2–3 minutes**. Practice with a timer.

```
┌──────────────────────────────────────────────────────────┐
│ S (20-30s) │ T (10-20s) │    A (60-90s)    │ R (30-45s) │
│  Context   │   Your     │   Your specific  │  Measured  │
│  & stakes  │   role     │   actions        │  outcome   │
└──────────────────────────────────────────────────────────┘
         Total: 2–3 minutes (aim for 2:30)
```

### Example: STAR in Action

**Question:** *"Tell me about a time you improved system performance."*

| STAR | Content |
|------|---------|
| **Situation** | "Our e-commerce checkout service was handling 2,000 requests/sec during peak hours. Response times had degraded to p99 of 1.2 seconds, and the product team reported a 3% cart abandonment increase correlated with latency." |
| **Task** | "As the senior backend engineer owning the checkout service, I was tasked with reducing p99 latency below 300ms within 4 weeks before Black Friday." |
| **Action** | "I started by profiling the hot path and identified three bottlenecks: (1) N+1 queries to the inventory service — I batched these into a single bulk API call, (2) synchronous payment validation — I moved it to an async flow with a message queue, and (3) missing database indexes on the orders table — I added composite indexes on `(user_id, created_at)`. I also set up a Grafana dashboard to track p99 latency in real-time and ran load tests simulating 5× peak traffic." |
| **Result** | "P99 latency dropped from 1.2s to 180ms — an 85% improvement. Cart abandonment decreased by 4.2%, translating to roughly $2.1M in recovered annual revenue. The monitoring dashboard I built became the team standard, and I documented the optimization playbook which the platform team adopted org-wide." |

:::tip Senior-Level Insight
Notice the **specificity** in the Action — three concrete steps, each with technical detail. Vague statements like "I optimized the database" will not pass the bar. Interviewers want to hear your **thought process**, not just the outcome.
:::

---

## 3. STAR+ Enhancement — Adding Learnings

The STAR+ format adds a fifth component: **Learnings / Reflection**. This is especially powerful for failure stories and demonstrates growth mindset.

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| **L — Learnings** | What you'd do differently, what you took away | Failure stories, conflict resolution, tight-deadline stories |

### STAR+ Example

**Question:** *"Tell me about a project that didn't go as planned."*

> **Situation:** "We were migrating our monolith to microservices. I led the extraction of the user authentication service — a 3-month project with a team of four."
>
> **Task:** "I owned the technical design and migration plan, including zero-downtime cutover."
>
> **Action:** "I designed a strangler fig pattern, wrote the new service in Go, and built a feature flag system for gradual traffic shifting. However, I underestimated the complexity of session state migration. I spent three weeks on an in-memory session store approach before realizing we needed distributed sessions. I then pivoted to Redis-backed sessions with a dual-write strategy."
>
> **Result:** "We delivered 3 weeks late — 15 weeks instead of 12. The service itself performed well: auth latency improved by 40%, and we successfully migrated 12M active sessions. But the delay pushed back two dependent projects."
>
> **Learnings:** "I learned to do **spike investigations** before committing to technical approaches. Now I always allocate the first sprint for proof-of-concept validation on the riskiest assumptions. I also started using a pre-mortem exercise with my team before kicking off major projects — asking 'What could go wrong?' upfront. I've since applied this to three more migrations, all delivered on time."

:::warning Common Mistake
Don't fabricate a neat "happy ending" for failure stories. Interviewers can tell. Genuine reflection with specific behavioral changes is far more compelling than pretending everything worked out perfectly.
:::

---

## 4. Story Selection Criteria

Not every experience makes a good interview story. Use these filters to select your strongest stories:

### Selection Rubric

| Criterion | ✅ Strong Story | ❌ Weak Story |
|-----------|----------------|---------------|
| **Recency** | Last 2–3 years | More than 5 years ago |
| **Impact** | Measurable business or technical outcome | "It worked" with no metrics |
| **Ownership** | You drove the decision and execution | You followed instructions |
| **Complexity** | Non-trivial, required judgment calls | Straightforward task |
| **Relevance** | Maps to the company's values/principles | Generic, untargeted |
| **Conflict/Challenge** | Involved disagreement, ambiguity, or failure | Everything went smoothly |
| **Scope** | Cross-team or org-level influence | Limited to your own code |

### Story Scoring Matrix

Rate each candidate story on a 1–5 scale:

| Story Candidate | Recency | Impact | Ownership | Complexity | Conflict | Total |
|----------------|:-------:|:------:|:---------:|:----------:|:--------:|:-----:|
| Example: Checkout optimization | 5 | 5 | 5 | 4 | 3 | 22/25 |
| Example: Bug fix last week | 5 | 2 | 3 | 2 | 1 | 13/25 |

Target stories scoring **18+** out of 25. Discard anything below 15.

---

## 5. Story Library Template

Prepare **6–8 versatile stories** that can be adapted to multiple question types. Use this template:

| # | Story Title | Theme(s) | STAR Summary | Metrics | Maps to Principles |
|:-:|-------------|----------|-------------|---------|-------------------|
| 1 | Checkout Latency Fix | Technical leadership, impact | Profiled & optimized checkout service | 85% p99 reduction, $2.1M revenue | Ownership, Dive Deep, Deliver Results |
| 2 | Failed Microservice Migration | Failure, learning, planning | Led auth service extraction, pivoted approach | 3 weeks late, 40% latency improvement | Learn & Be Curious, Earn Trust, Ownership |
| 3 | Cross-team API Standards | Influence, collaboration | Proposed & drove API design standards across 5 teams | 60% fewer integration bugs, 30% faster onboarding | Invent & Simplify, Insist on Highest Standards |
| 4 | Junior Engineer Mentorship | Mentoring, development | Structured mentorship for struggling team member | Mentee promoted in 9 months | Hire & Develop the Best |
| 5 | Stakeholder Disagreement | Conflict, communication | Pushed back on PM's timeline, proposed alternative | Shipped 2 weeks later but with 99.9% reliability | Have Backbone, Earn Trust |
| 6 | Incident Response (P1) | Crisis, leadership | Led response to 4-hour production outage | MTTR reduced 60%, created incident playbook | Bias for Action, Dive Deep |
| 7 | Technical Debt Prioritization | Trade-offs, strategy | Built business case for refactoring, got stakeholder buy-in | 40% reduction in deploy time | Think Big, Customer Obsession |
| 8 | Ambiguous Product Requirement | Ambiguity, proactivity | Drove clarity when PM spec was incomplete | Feature launched on time, 15% adoption increase | Bias for Action, Are Right A Lot |

:::tip Senior-Level Insight
Your 6–8 stories should cover at **least 80%** of all possible behavioral questions. The key is picking stories with multiple angles — a single story about a conflict that also involved technical decision-making and cross-team collaboration can answer three different question types.
:::

---

## 6. Story Themes to Prepare

Every behavioral question maps to one or more of these themes. Ensure your story library covers all of them:

### Theme Checklist

| # | Theme | Example Question | Why It's Asked |
|:-:|-------|-----------------|----------------|
| 1 | **Conflict Resolution** | "Tell me about a time you disagreed with a coworker" | Can you handle tension professionally? |
| 2 | **Failure & Learning** | "Describe a project that failed" | Do you own mistakes and grow from them? |
| 3 | **Technical Leadership** | "Tell me about a technical decision you drove" | Can you lead without authority? |
| 4 | **Ambiguity Handling** | "How do you handle unclear requirements?" | Can you operate without a playbook? |
| 5 | **Mentorship** | "Tell me about mentoring a junior engineer" | Do you invest in others' growth? |
| 6 | **Cross-team Collaboration** | "Describe working across multiple teams" | Can you align diverse stakeholders? |
| 7 | **Difficult Stakeholder** | "Tell me about managing a difficult stakeholder" | Can you navigate organizational politics? |
| 8 | **Tight Deadline** | "Describe delivering under a tight deadline" | Can you make pragmatic trade-offs? |
| 9 | **Trade-off Decision** | "Tell me about a difficult technical trade-off" | Can you reason about complex decisions? |

### Theme Coverage Matrix

Map your 6–8 stories across all themes to identify gaps:

| Story → | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Conflict | ✅ | | ✅ | | ✅ | | | |
| Failure | | ✅ | | | | | ✅ | |
| Tech Leadership | ✅ | | ✅ | | | ✅ | | ✅ |
| Ambiguity | | | | | | | | ✅ |
| Mentorship | | | | ✅ | | | | |
| Cross-team | | | ✅ | | | ✅ | | |
| Stakeholder | | | | | ✅ | | | |
| Deadline | | | | | | ✅ | ✅ | |
| Trade-off | ✅ | ✅ | | | ✅ | | ✅ | |

If any row is empty, you need another story.

---

## 7. Delivery Tips

How you deliver matters as much as what you say.

### The Golden Rules

| Rule | Why | How |
|------|-----|-----|
| **Time it: 2–3 minutes** | Shorter is too shallow; longer loses attention | Practice with a stopwatch; aim for 2:30 |
| **Use "I", not "we"** | Interviewer needs to assess **your** contribution | Replace every "we decided" with "I proposed / I recommended" |
| **Be specific** | Vague answers signal that you weren't the driver | Name the technology, the metric, the decision |
| **Quantify results** | Numbers are memorable and credible | Revenue, latency, error rate, adoption %, time saved |
| **Show your reasoning** | Interviewers care about **how** you think | Explain why you chose approach A over B |
| **Pause for follow-ups** | Don't monologue for 5 minutes | Deliver the core story, then let them probe |

### Quantification Cheat Sheet

| Category | Weak | Strong |
|----------|------|--------|
| Performance | "It was faster" | "P99 latency dropped from 1.2s to 180ms (85% reduction)" |
| Business | "Users liked it" | "DAU increased 12%, driving $500K annual revenue uplift" |
| Reliability | "Fewer outages" | "Incidents dropped from 4/month to 1/quarter, MTTR reduced 60%" |
| Productivity | "Faster development" | "Deploy frequency increased from weekly to 4×/day, lead time reduced from 5 days to 4 hours" |
| Team | "I helped them improve" | "Mentee went from needing daily code review guidance to independently leading a feature in 3 months" |

:::warning
If you genuinely don't have a metric, **estimate** with a reasonable range and flag it: "I estimate we saved approximately 10–15 engineering hours per sprint based on before/after velocity tracking." An honest estimate beats a vague "it was better."
:::

---

## 8. Common Pitfalls

| Pitfall | What It Looks Like | Why It Hurts | Fix |
|---------|--------------------|-------------|-----|
| **Being too vague** | "I worked on performance stuff" | No signal for the interviewer to evaluate | Be concrete: "I profiled the checkout API using flame graphs and identified 3 bottlenecks" |
| **Blaming others** | "The PM gave us bad requirements" | Shows lack of ownership | Reframe: "The requirements were ambiguous, so I scheduled a clarification session with the PM and proposed a phased rollout" |
| **No quantified results** | "The project was successful" | Unverifiable, unmemorable | Add numbers: "reduced deploy time by 60%, from 45 minutes to 18 minutes" |
| **Not owning the action** | "We decided as a team" | Interviewer can't assess YOUR contribution | Use "I": "I proposed the caching strategy, built the prototype, and presented the benchmark results to the team" |
| **Rambling** | 5+ minute answer with tangents | Interviewer loses interest, can't follow | Practice timed delivery; cut ruthlessly; front-load the key insight |
| **Hypothetical answers** | "I would do X in that situation" | Behavioral interviews require **past** behavior | Redirect: "Let me share a time when I actually faced this..." |
| **Humble bragging** | "My only weakness is working too hard" | Inauthentic, red flag for self-awareness | Be genuine: share a real weakness and concrete steps you've taken to address it |
| **Lack of structure** | Jumping between points without a clear flow | Hard to follow, appears disorganized | Use STAR; announce transitions: "So the result was..." |

---

## 9. Handling Follow-up Questions

Interviewers will probe deeper. Anticipate these follow-ups and prepare for them:

### Common Follow-ups and How to Handle Them

| Follow-up | What They're Really Asking | How to Respond |
|-----------|---------------------------|---------------|
| "Tell me more about X" | They want deeper technical or behavioral detail | Zoom into the specific area; add technical details you initially omitted for brevity |
| "What would you do differently?" | Do you have self-awareness and growth mindset? | Be honest; name 1–2 concrete changes and explain why |
| "What was the biggest challenge?" | Can you identify and articulate complexity? | Pick the hardest part, explain why it was hard, and how you overcame it |
| "How did you get buy-in?" | Can you influence without authority? | Describe your communication strategy: data, prototypes, stakeholder meetings |
| "What did others think?" | Are you collaborative or a lone wolf? | Show you considered other perspectives and how you incorporated feedback |
| "What were the trade-offs?" | Can you reason about complex decisions? | Name 2–3 alternatives you considered, explain your decision criteria |
| "How did you measure success?" | Are you data-driven? | Describe the metrics you defined upfront and how you tracked them |
| "What did you learn?" | Growth mindset and reflection | Share a specific behavioral or technical change you made as a result |

### The "Peel the Onion" Technique

Interviewers often drill down 2–3 levels. Prepare your stories with layers:

```
Level 1: "I improved system performance"
  └─ Level 2: "Specifically, I reduced p99 latency by 85%"
       └─ Level 3: "The key bottleneck was N+1 queries — I identified this
                    using distributed tracing, then refactored to batch
                    requests using a DataLoader pattern"
```

:::tip Senior-Level Insight
If you can only go one level deep on a story, it's not your story. Interviewers will probe until they find the boundary of your actual involvement. Choose stories where you can go **three levels deep** on the technical and decision-making details.
:::

---

## 10. Complete STAR Example Stories

### Example 1: Conflict Resolution

**Question:** *"Tell me about a time you disagreed with a teammate on a technical approach."*

> **Situation:** I was working on a real-time notification system at my company. A senior colleague proposed using WebSockets for all notifications, including non-time-critical ones like weekly digest emails. The team was split, and we had a 2-week window before the sprint commitment.
>
> **Task:** As the tech lead for the notification platform, I needed to drive a technical decision that balanced real-time requirements with system complexity and cost.
>
> **Action:** Rather than debating opinions, I took a data-driven approach. First, I categorized our 14 notification types by latency sensitivity — only 4 of 14 needed sub-second delivery. I then built a comparison matrix:
>
> | Approach | Latency | Connection Cost | Complexity | Offline Support |
> |----------|---------|-----------------|------------|-----------------|
> | WebSocket-only | &lt;100ms | High (persistent connections) | High | ❌ |
> | Push + polling hybrid | &lt;1s for critical, minutes for rest | Medium | Medium | ✅ |
> | Event-driven (SNS/SQS) | &lt;500ms | Low | Low | ✅ |
>
> I scheduled a 30-minute design review, presented the data, and proposed the hybrid approach. My colleague still preferred WebSockets for architectural simplicity. I acknowledged his point, then showed that persistent connections at our scale (2M users) would cost ~$18K/month in infrastructure versus ~$3K for the hybrid approach. I also highlighted that the hybrid approach was more resilient to network issues, which our mobile users frequently experienced.
>
> **Result:** The team adopted the hybrid approach. We launched on schedule, and notification delivery reliability was 99.7% (up from 94% with the previous polling-only system). My colleague later thanked me for the thorough analysis and we co-authored an internal tech blog post on the decision framework. The cost savings of $15K/month was cited in our quarterly business review.

**Analysis of this answer:**

| Dimension | Assessment |
|-----------|-----------|
| Specificity | ✅ Named 14 notification types, 4 latency-sensitive, exact cost figures |
| Ownership | ✅ "I categorized", "I built", "I scheduled", "I proposed" |
| Conflict handling | ✅ Data-driven, respectful, acknowledged opposing view |
| Result | ✅ Quantified: 99.7% reliability, $15K/month savings |
| Relationship | ✅ Maintained positive relationship, co-authored post |

---

### Example 2: Failure & Learning

**Question:** *"Describe a time when a project you led didn't meet its goals."*

> **Situation:** I led the migration of our payment processing from a third-party gateway to an in-house solution. The project had a 4-month timeline and involved integrating with 3 payment providers (Stripe, PayPal, Braintree).
>
> **Task:** I was responsible for the technical architecture, migration plan, and leading a team of 3 engineers. The goal was to reduce per-transaction fees by 40% and increase payment success rates.
>
> **Action:** I designed the abstraction layer and built the Stripe integration first as a template for the others. Where I went wrong was underestimating the complexity of PCI compliance requirements for the in-house solution. I assumed our existing security infrastructure would suffice, but we needed a dedicated PCI-DSS Level 1 audit, network segmentation, and encrypted card vault — each taking longer than expected. I also failed to involve our security team early enough; when they reviewed the design in week 8, they identified three compliance gaps that required architectural changes. To recover, I restructured the project: descoped Braintree to phase 2, fast-tracked the compliance requirements by bringing in an external PCI consultant, and moved to daily standups with the security team.
>
> **Result:** We delivered the Stripe and PayPal integrations in 5.5 months instead of 4 — a 37% delay. Transaction fees decreased by 28% (not the target 40% since Braintree was descoped). Payment success rates improved by 6%, from 94.2% to 99.8%. The Braintree integration shipped 2 months later.
>
> **Learnings:** This taught me three things: (1) Always engage compliance and security teams at the **design phase**, not the review phase. I now include security as a stakeholder in all architecture design documents. (2) For projects with regulatory requirements, I add a 30% buffer to timelines. (3) I started running pre-mortems at project kickoffs — asking "What will make this project fail?" — which has helped me identify blind spots on every subsequent project.

---

### Example 3: Ambiguity & Proactive Leadership

**Question:** *"Tell me about a time you had to make a decision with incomplete information."*

> **Situation:** Our team was building a new recommendation engine. The PM had a high-level vision — "personalized content feed" — but no detailed spec, no defined success metrics, and the data science team hadn't finalized their ML models. Meanwhile, we had a hard launch deadline tied to a partnership announcement in 8 weeks.
>
> **Task:** As the senior engineer on the project, I needed to unblock the engineering team and start building despite the ambiguity.
>
> **Action:** I took three steps to create structure from chaos. First, I organized a rapid alignment meeting with PM, data science, and design to define the minimum viable scope — we agreed on 3 content types (articles, videos, products) with a simple collaborative filtering model as V1. Second, I designed the system with a **pluggable recommendation interface**, so we could swap the ML model without changing the serving layer. This meant we could start building the API, content indexer, and UI while data science finalized their model. Third, I defined provisional success metrics with the PM: CTR > 8%, average session duration increase > 15%, and no regression in page load time. I documented these in a one-page decision doc that all stakeholders signed off on.
>
> **Result:** We launched on time with the partnership. V1 achieved 11.2% CTR (above the 8% target) and 22% session duration increase. When the data science team shipped their improved model 3 weeks later, the pluggable architecture let us swap it in with a one-line config change. The PM adopted my decision-doc format for all subsequent projects.
>
> **Learnings:** I learned that "waiting for complete information" is itself a decision — and usually the wrong one. Since then, I default to defining the **minimum viable decision** and building systems that accommodate future changes rather than trying to predict the perfect approach upfront.

---

## 11. Practice Framework

### The 3-Phase Preparation System

| Phase | Duration | Activities |
|-------|----------|-----------|
| **Phase 1: Story Mining** | Week 1–2 | Review past projects, identify 10–12 candidate stories, score with rubric |
| **Phase 2: Story Crafting** | Week 2–3 | Write out STAR format for top 8 stories, add metrics, map to themes |
| **Phase 3: Story Delivery** | Week 3–4+ | Practice aloud, record yourself, get peer feedback, iterate |

### Practice Techniques

| Technique | How | Why |
|-----------|-----|-----|
| **Record yourself** | Use your phone; review for filler words, timing, clarity | You can't improve what you can't observe |
| **Peer mock interviews** | Trade sessions with a friend preparing for similar roles | Simulates real pressure and gets fresh perspectives |
| **Mirror method** | Practice in front of a mirror, watching body language | For on-site interviews, non-verbal communication matters |
| **Timer drill** | Set a 2:30 timer; tell the complete story within it | Forces conciseness and prioritization |
| **Random prompt practice** | Have someone pick random questions; respond with no prep time | Builds the skill of quickly mapping questions to your story library |

### Self-Evaluation Checklist

After each practice attempt, score yourself:

- [ ] Did I stay under 3 minutes?
- [ ] Did I use "I" consistently (not "we")?
- [ ] Did I include at least 2 quantified results?
- [ ] Was my Action section the longest part?
- [ ] Did I explain **why** I chose my approach?
- [ ] Could I go 2–3 levels deeper if probed?
- [ ] Did I avoid filler words (um, like, basically)?
- [ ] Would this story work for at least 2 different question themes?

:::tip Senior-Level Insight
The best behavioral interviewees don't sound rehearsed — they sound **structured**. The goal of practice isn't to memorize scripts but to internalize the STAR framework so deeply that structure becomes natural. Practice until the framework disappears and only the story remains.
:::

---

## 12. Quick Reference — STAR Cheat Sheet

| Element | Key Question | Time | Must Include |
|---------|-------------|:----:|-------------|
| **Situation** | What was the context? | 20–30s | Team, project, stakes, timeline |
| **Task** | What was YOUR responsibility? | 10–20s | Your specific role and goal |
| **Action** | What did YOU do? | 60–90s | Concrete steps, decisions, reasoning |
| **Result** | What was the measured impact? | 30–45s | Numbers, business impact, what changed |
| **Learnings** *(optional)* | What did you take away? | 15–20s | Behavioral change, applied to future work |

### Red Flags to Self-Monitor

| 🚩 Red Flag | Correction |
|-------------|-----------|
| "We decided to..." | → "I recommended..." |
| "It was successful" | → "Revenue increased 15%, latency dropped 40%" |
| "The requirements were bad" | → "I identified gaps in the requirements and proactively drove clarification" |
| "I don't have a good example" | → Never say this. Pause, think, and adapt a story from your library |
| Running past 4 minutes | → Cut context, front-load the key insight |

---

## 13. Summary

| Topic | Key Takeaway |
|-------|-------------|
| **STAR** | Situation → Task → Action → Result; Action is the longest section |
| **STAR+** | Add Learnings for failure/growth stories |
| **Story Library** | Prepare 6–8 versatile stories covering 9 themes |
| **Selection** | Recent, high-impact, demonstrates ownership, measurable |
| **Delivery** | 2–3 minutes, "I" not "we", quantify everything |
| **Pitfalls** | Avoid vagueness, blame, no metrics, "we" language |
| **Follow-ups** | Prepare 3 levels of depth for every story |
| **Practice** | Record, get feedback, iterate weekly |
