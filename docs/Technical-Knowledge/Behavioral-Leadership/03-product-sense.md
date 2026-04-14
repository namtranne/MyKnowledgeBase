---
sidebar_position: 4
title: "03 — Product Sense"
slug: 03-product-sense
---

# 📊 Product Sense & Metrics

Product sense separates engineers who **ship code** from engineers who **ship outcomes**. At FAANG companies, senior engineers are expected to reason about user behavior, define success metrics, design experiments, and make data-informed trade-offs. This chapter gives you the frameworks, vocabulary, and case studies to demonstrate product thinking in interviews.

---

## 1. Why Product Sense Matters for Engineers

### The Shift from "Feature Builder" to "Product Engineer"

| Level | Mindset | Example |
|-------|---------|---------|
| **Junior** | "I built the feature the PM asked for" | Implements spec as written |
| **Mid** | "I built the feature and suggested improvements" | Proposes edge case handling, performance optimization |
| **Senior** | "I questioned whether this is the right feature to build" | Challenges assumptions, proposes alternatives based on data |
| **Staff+** | "I identified the problem and proposed the solution strategy" | Defines the product roadmap intersection with technical strategy |

### What Interviewers Evaluate

| Signal | Strong Candidate | Weak Candidate |
|--------|-----------------|----------------|
| **User empathy** | "The key user segment is power users who create 10+ items/day" | "Users want more features" |
| **Metric fluency** | "We should track D7 retention as the leading indicator" | "We'll see if people like it" |
| **Trade-off reasoning** | "This increases engagement but may hurt new-user onboarding" | "Let's just A/B test it" |
| **Business context** | "This feature targets our 15% premium conversion rate" | "The PM wanted it" |

:::tip Senior-Level Insight
At L5+, you'll get questions like "How would you measure the success of Search?" or "If you were the PM for Notifications, what would you prioritize?" These aren't PM questions — they test whether you think beyond code. Engineers who can't articulate **why** they're building something plateau at mid-level.
:::

---

## 2. User Personas

A user persona is a fictional but data-grounded representation of a key user segment. Building personas forces you to think about **who** you're building for.

### Persona Template

| Field | Description | Example |
|-------|------------|---------|
| **Name** | Fictional name for memorability | "Power Pam" |
| **Segment** | What group they represent | Top 5% content creators |
| **Demographics** | Age, role, technical proficiency | 28, freelance designer, tech-savvy |
| **Goals** | What they want to achieve | Publish 3 portfolio pieces/week with minimal friction |
| **Pain Points** | Current frustrations | Slow image upload, no batch editing, mobile experience is poor |
| **Behavior** | Usage patterns | Daily active, 45-min sessions, primarily desktop |
| **Success Metric** | How to measure their satisfaction | Weekly publish rate, time-to-publish, NPS |

### Why Personas Matter in Engineering Interviews

| Context | How to Use Personas |
|---------|-------------------|
| **System design** | "The primary persona is a mobile user on a 3G connection, so I'll prioritize offline-first and compressed payloads" |
| **Feature prioritization** | "Power users represent 5% of users but 40% of content — optimizing for them has disproportionate impact" |
| **Trade-off decisions** | "This adds complexity for new users but solves a critical pain point for our highest-value segment" |

### User Journey Mapping

A user journey traces the steps a persona takes to accomplish their goal:

```
Discovery → Signup → Onboarding → First Value → Habitual Use → Advocacy
    ↓          ↓         ↓            ↓              ↓            ↓
  (Ad/SEO)  (Form)   (Tutorial)   (First post)   (Daily use)  (Referral)
```

| Stage | Key Metric | Drop-off Risk |
|-------|-----------|---------------|
| **Discovery** | Impressions, CTR | Ad fatigue, poor SEO |
| **Signup** | Conversion rate | Friction (too many fields, no SSO) |
| **Onboarding** | Completion rate | Confusing UX, no clear value prop |
| **First Value** | Time to value (TTV) | Feature complexity, slow loading |
| **Habitual Use** | D7/D30 retention | Missing features, bugs, performance |
| **Advocacy** | NPS, referral rate | No sharing mechanism, poor experience |

---

## 3. Defining Success Metrics

### North Star Metric

The **North Star Metric (NSM)** is the single metric that best captures the core value your product delivers to customers.

| Product | North Star Metric | Why |
|---------|------------------|-----|
| **Facebook** | Daily Active Users (DAU) | Measures daily engagement with the platform |
| **Airbnb** | Nights Booked | Directly measures value delivery (host earns, guest stays) |
| **Spotify** | Time Spent Listening | Measures core engagement with the product |
| **Slack** | Messages Sent per Team/Week | Measures team adoption and value delivery |
| **Netflix** | Hours Watched per Subscriber | Measures content consumption and retention driver |
| **Uber** | Weekly Trips Completed | Measures core transaction volume |

### Counter Metrics (Guardrails)

Every metric can be gamed. Counter metrics ensure you're not improving one thing at the expense of another.

| Primary Metric | Counter Metric | Why |
|---------------|----------------|-----|
| User engagement (time spent) | Content quality score | Don't increase time via addictive dark patterns |
| Conversion rate | Return rate | Don't convert users who'll immediately churn |
| Page load speed | Feature completeness | Don't strip features just to be fast |
| Revenue per user | User satisfaction (NPS) | Don't extract value at the expense of experience |
| DAU | User-reported satisfaction | Don't drive compulsive usage that creates backlash |

:::warning
Never propose a metric without a counter metric. Interviewers will specifically probe for gaming scenarios. "How could someone hit that metric without actually delivering value?" Have an answer ready.
:::

### Leading vs. Lagging Indicators

| Type | Definition | Example | Use Case |
|------|-----------|---------|----------|
| **Leading** | Predicts future outcomes | Weekly active rate, feature adoption in week 1 | Early intervention, course correction |
| **Lagging** | Measures past outcomes | Monthly revenue, annual churn rate | Business reporting, trend analysis |

**Interview tip:** Always propose at least one leading indicator. "Revenue will tell us if we succeeded, but **D7 feature adoption rate** will tell us within a week if we're on track."

---

## 4. Key Metric Types

### Engagement Metrics

| Metric | Formula | Good Benchmark | What It Tells You |
|--------|---------|:--------------:|------------------|
| **DAU / MAU** | Daily Active / Monthly Active | > 50% (social), > 25% (utility) | Stickiness — how often users return |
| **Session Duration** | Avg time per session | Varies by product | Depth of engagement per visit |
| **Sessions per Day** | Avg sessions / DAU | > 2 (high engagement) | Frequency of engagement |
| **Feature Adoption** | Users of feature / Total users | > 20% for core features | Is the feature discoverable and useful? |

### Retention Metrics

| Metric | Time Window | Good Benchmark | What It Tells You |
|--------|:----------:|:--------------:|------------------|
| **D1 Retention** | Day 1 | > 40% | First impression quality |
| **D7 Retention** | Day 7 | > 20% | Early habit formation |
| **D30 Retention** | Day 30 | > 10% | Long-term product-market fit |
| **Weekly Retention** | Week over week | > 60% | Ongoing engagement stability |

### Retention Curve Shapes

```
Retention
  100% │\
       │ \
       │  \────────────── Good: flattens (found PMF)
       │   \
       │    \
       │     \____________ Okay: slow decline
       │      \
       │       \
       │        \_________ Bad: steady decline (no PMF)
       │         \
    0% └──────────────────
       D1  D7  D14  D30  D60  D90
```

**The key insight:** A healthy product has a retention curve that **flattens** — meaning a stable cohort of users stays permanently. If the curve trends toward zero, you haven't found product-market fit.

### Conversion Metrics

| Metric | Formula | Context |
|--------|---------|---------|
| **Signup Conversion** | Signups / Landing page visitors | Measures marketing + onboarding |
| **Activation Rate** | Users completing key action / Signups | Measures onboarding effectiveness |
| **Free-to-Paid** | Paid subscribers / Free users | Measures premium value proposition |
| **Cart Conversion** | Purchases / Add-to-carts | Measures checkout friction |

### Revenue Metrics

| Metric | Formula | Why It Matters |
|--------|---------|---------------|
| **ARPU** | Total Revenue / Active Users | Revenue per user, track over time |
| **LTV** | ARPU × Average Lifespan | Lifetime value; must exceed CAC |
| **CAC** | Marketing Spend / New Customers | Customer acquisition cost |
| **LTV:CAC Ratio** | LTV / CAC | Should be > 3:1 for healthy business |
| **MRR** | Monthly Recurring Revenue | SaaS health indicator |
| **Net Revenue Retention** | MRR from existing customers (including expansion) / Previous MRR | > 100% means expansion exceeds churn |

:::tip Senior-Level Insight
In interviews, connect engineering decisions to revenue metrics. "Reducing page load time from 3s to 1s increased our conversion rate by 8%, which at our volume translates to $4M annual revenue uplift." This is the language that gets you to Staff level.
:::

---

## 5. AARRR Framework (Pirate Metrics)

The AARRR framework (coined by Dave McClure) maps the customer lifecycle into five stages, each with its own metrics.

### The Five Stages

| Stage | Question | Key Metrics | Example Actions |
|-------|---------|-------------|----------------|
| **Acquisition** | How do users find you? | Traffic, channel mix, CPC, organic vs. paid | SEO, content marketing, paid ads |
| **Activation** | Do they have a great first experience? | Signup rate, onboarding completion, time-to-value | Simplified signup, guided tutorial |
| **Retention** | Do they come back? | D1/D7/D30, DAU/MAU ratio, churn rate | Push notifications, email campaigns, feature improvements |
| **Revenue** | Do they pay? | Conversion rate, ARPU, LTV, MRR | Pricing optimization, upsell features |
| **Referral** | Do they tell others? | NPS, referral rate, viral coefficient (K-factor) | Referral programs, sharing features |

### AARRR Funnel Visualization

```
    Acquisition:  100,000 visitors
         │
         ▼
    Activation:    10,000 signups (10% conversion)
         │
         ▼
    Retention:      4,000 D30 active (40% retention)
         │
         ▼
    Revenue:        1,000 paid users (25% conversion)
         │
         ▼
    Referral:         200 referrers (20% refer others)
```

### How Engineers Use AARRR

| Stage | Engineering Impact |
|-------|-------------------|
| **Acquisition** | Page load speed (every 100ms delay = 1% conversion drop), SEO-friendly rendering |
| **Activation** | Frictionless signup (SSO, magic links), fast time-to-value |
| **Retention** | Reliability (bugs cause churn), performance (slow apps lose users), new features |
| **Revenue** | Payment integration reliability, A/B testing infrastructure |
| **Referral** | Sharing APIs, deep linking, referral tracking systems |

---

## 6. A/B Testing

A/B testing (also called split testing or controlled experimentation) is the gold standard for measuring the causal impact of product changes.

### A/B Test Anatomy

| Component | Description | Example |
|-----------|------------|---------|
| **Hypothesis** | What you believe will happen and why | "Adding social proof to the checkout page will increase conversion by 5% because users trust peer validation" |
| **Control (A)** | The existing experience | Current checkout page |
| **Treatment (B)** | The modified experience | Checkout page with "1,234 people bought this today" |
| **Randomization Unit** | How users are split | User ID (not session, to avoid cross-contamination) |
| **Primary Metric** | The metric you're trying to move | Checkout conversion rate |
| **Guardrail Metrics** | Metrics that must not degrade | Page load time, return rate, customer support tickets |
| **Sample Size** | Number of users needed | Calculated based on desired statistical power |
| **Duration** | How long to run | At least 1–2 full business cycles (typically 2+ weeks) |

### Statistical Significance

| Term | Definition | Typical Value |
|------|-----------|:------------:|
| **Significance Level (α)** | Probability of false positive (Type I error) | 0.05 (5%) |
| **Statistical Power (1 - β)** | Probability of detecting a real effect | 0.80 (80%) |
| **Minimum Detectable Effect (MDE)** | Smallest effect you want to detect | Depends on business context |
| **p-value** | Probability of observing results if null hypothesis is true | < 0.05 to reject null |
| **Confidence Interval** | Range of plausible values for the true effect | 95% CI |

### Sample Size Calculation

The required sample size per variant depends on:

| Factor | Impact on Sample Size | Direction |
|--------|----------------------|-----------|
| Baseline conversion rate | Higher baseline → larger sample | ↑ |
| Minimum detectable effect | Smaller MDE → much larger sample | ↑↑ |
| Significance level (α) | Lower α → larger sample | ↑ |
| Power (1 - β) | Higher power → larger sample | ↑ |

**Rule of thumb:** To detect a 1% absolute change in a 10% conversion rate at α=0.05, power=0.80, you need approximately **14,700 users per variant** (29,400 total).

### Common A/B Testing Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Peeking** | Checking results daily and stopping early when p < 0.05 | Pre-commit to sample size; use sequential testing if you must peek |
| **Novelty Effect** | Users engage more simply because something is new | Run tests for 2+ weeks; exclude first 2–3 days from analysis |
| **Selection Bias** | Non-random assignment (e.g., only mobile users) | Ensure randomization at the user level; verify balance across segments |
| **Multiple Testing** | Testing 10 metrics, finding 1 significant by chance | Adjust α with Bonferroni correction or define a single primary metric |
| **Simpson's Paradox** | Overall trend reverses when segmented | Always analyze by key segments (platform, country, new vs. returning) |
| **Interaction Effects** | Two concurrent experiments interfere with each other | Use mutually exclusive experiment layers or analyze interactions |
| **Under-powered Tests** | Not enough users to detect the effect | Calculate sample size upfront; if insufficient traffic, increase MDE or extend duration |

:::tip Senior-Level Insight
In interviews, show that you understand the **nuances** of experimentation, not just the basics. Mentioning concepts like novelty effects, network effects in marketplace experiments, or the difference between individual-level and cluster-level randomization signals deep product sense.
:::

---

## 7. Product Trade-off Framework

### The 2×2 Decision Matrix

| | **Low Effort** | **High Effort** |
|---|:---:|:---:|
| **High Impact** | ✅ **Do First** — Quick wins | 🟡 **Plan Carefully** — Major projects |
| **Low Impact** | ⚠️ **Fill Time** — Nice to have | ❌ **Don't Do** — Resource sink |

### One-Way vs. Two-Way Doors (Amazon Framework)

| Type | Definition | Examples | Approach |
|------|-----------|---------|----------|
| **One-Way Door** | Irreversible or very costly to reverse | Database migration, API contract change, pricing model | Careful analysis, stakeholder buy-in, extensive testing |
| **Two-Way Door** | Easily reversible | UI change, feature flag, copy change | Move fast, measure, iterate |

:::warning
Engineers tend to treat **all** decisions as one-way doors. This leads to over-engineering and analysis paralysis. In interviews, demonstrate that you can distinguish between the two and apply appropriate rigor to each.
:::

### Trade-off Discussion Framework

When asked "How would you decide between X and Y?":

```
Step 1: Define the criteria (what matters most)
Step 2: Score each option against the criteria
Step 3: Identify irreversible vs. reversible aspects
Step 4: State your recommendation with reasoning
Step 5: Acknowledge what you're giving up (trade-offs)
```

**Example:** "Build vs. Buy for an ML feature store"

| Criterion | Build In-House | Buy (e.g., Feast/Tecton) |
|-----------|:---:|:---:|
| Customization | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Time to Value | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Maintenance Cost | ⭐⭐ (ongoing eng time) | ⭐⭐⭐⭐ (vendor handles) |
| Team Learning | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Risk | ⭐⭐ (unknown unknowns) | ⭐⭐⭐⭐ (proven solution) |
| **Recommendation** | **Buy first (two-way door), build later if needs diverge** | |

---

## 8. Feature Prioritization

### RICE Scoring

RICE is a prioritization framework that scores features on four dimensions:

| Factor | Definition | Scale | Example |
|--------|-----------|-------|---------|
| **R — Reach** | How many users will this impact per quarter? | Number of users | 10,000 users/quarter |
| **I — Impact** | How much will it impact each user? | 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal | 2 (high) |
| **C — Confidence** | How sure are you of reach and impact estimates? | 100% = high, 80% = medium, 50% = low | 80% |
| **E — Effort** | How many person-months to build? | Person-months | 3 person-months |

**Formula:** `RICE Score = (Reach × Impact × Confidence) / Effort`

**Example calculation:**

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|:-----:|:------:|:----------:|:------:|:----------:|
| Search autocomplete | 50,000 | 2 | 80% | 2 | **40,000** |
| Dark mode | 30,000 | 1 | 100% | 1 | **30,000** |
| Export to PDF | 5,000 | 2 | 60% | 4 | **1,500** |
| API v2 redesign | 2,000 | 3 | 50% | 6 | **500** |

→ Prioritize: Search autocomplete > Dark mode > Export > API v2

### Opportunity Cost

Every feature you build has an **opportunity cost** — the value of the next-best feature you didn't build.

| Decision | Chosen Feature | Opportunity Cost | How to Evaluate |
|----------|---------------|-----------------|-----------------|
| Build chat vs. notifications | Chat | Delayed notifications by 3 months; notifications drive 2× engagement | Compare long-term impact curves |
| Optimize mobile vs. desktop | Mobile | Desktop power users underserved | Check revenue split by platform |
| Refactor vs. new feature | Refactor | Delayed feature launch by 6 weeks | Calculate velocity gain from refactor vs. feature revenue |

---

## 9. Data-Informed Decision Making

### Critical Thinking About Data

| Concept | Definition | Example | Why It Matters |
|---------|-----------|---------|---------------|
| **Correlation ≠ Causation** | Two things moving together doesn't mean one causes the other | Ice cream sales and drowning deaths both increase in summer | Don't assume a feature caused a metric change without a controlled experiment |
| **Simpson's Paradox** | A trend that appears in groups reverses when the groups are combined | Treatment A has higher success rate in both hospitals, but B has higher rate overall (due to case mix) | Always segment your data by key dimensions |
| **Survivorship Bias** | Only looking at successes, ignoring failures | "All successful startups did X" — but so did many failed ones | Consider the full population, not just visible outcomes |
| **Selection Bias** | Sample is not representative of the population | Surveying only active users about feature satisfaction | Ensure your sample represents all user segments |
| **Confirmation Bias** | Seeking data that supports your existing belief | Only looking at metrics that improved, ignoring those that degraded | Pre-commit to success criteria before running experiments |
| **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure | Optimizing for "clicks" leads to clickbait | Always pair primary metrics with counter metrics |

:::warning
In interviews, demonstrating awareness of statistical pitfalls is a strong signal. When proposing a metric, proactively say: "One risk with this metric is Goodhart's Law — teams might optimize for X at the expense of Y, so I'd add Y as a guardrail metric."
:::

### The Metric Pyramid

```
                    ┌─────────────┐
                    │  North Star │     ← One metric that captures core value
                    │   Metric    │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                │          │          │
          ┌─────┴─────┐ ┌─┴───┐ ┌───┴─────┐
          │ Leading    │ │ L2  │ │ Lagging │     ← Input and output metrics
          │ Indicators │ │     │ │ Results │
          └─────┬─────┘ └──┬──┘ └───┬─────┘
                │          │        │
        ┌───────┼───────┐  │  ┌────┼────┐
        │       │       │  │  │    │    │
    ┌───┴───┐ ┌┴──┐ ┌──┴┐ │ ┌┴──┐ │ ┌──┴───┐
    │Feature│ │UX │ │Perf│ │ │Rev│ │ │Churn │  ← Operational metrics
    │Metrics│ │   │ │   │ │ │   │ │ │      │
    └───────┘ └───┘ └───┘   └───┘   └──────┘
```

---

## 10. Product Design Questions in Interviews

### Common Question Formats

| Question Type | Example | What They're Assessing |
|--------------|---------|----------------------|
| **Measure success** | "How would you measure the success of Instagram Stories?" | Metric fluency, understanding of user behavior |
| **Improve feature** | "How would you improve YouTube search?" | User empathy, product thinking, prioritization |
| **Design feature** | "Design a notification system for a social app" | End-to-end product thinking, technical trade-offs |
| **Diagnose metric** | "DAU dropped 10% — what would you investigate?" | Analytical thinking, hypothesis generation |
| **Trade-off** | "Should we add feature X or improve performance of Y?" | Prioritization framework, business reasoning |

### Framework for "How Would You Measure Success of Feature X?"

| Step | Action | Example (Instagram Reels) |
|------|--------|--------------------------|
| 1. **Clarify the feature** | What does it do? Who is it for? | Short-form video creation and consumption |
| 2. **Identify user segments** | Creators vs. consumers | Creators: content output; consumers: engagement |
| 3. **Define primary metric** | The one metric that matters most | Time spent watching Reels / Total session time |
| 4. **Add supporting metrics** | 2–3 metrics that provide context | Reels created/week, completion rate, shares |
| 5. **Add counter metrics** | What shouldn't degrade | Feed engagement, Stories usage, user satisfaction |
| 6. **Define success threshold** | What "good" looks like | >15% of session time on Reels within 3 months |
| 7. **Propose measurement plan** | How you'll actually track this | A/B test with holdout group, cohort analysis |

### Framework for "DAU Dropped 10% — What Would You Investigate?"

| Step | Check | Why |
|------|-------|-----|
| 1. **Is the data correct?** | Logging bug, tracking changes, data pipeline issues | False alarm? |
| 2. **Is it seasonal?** | Holiday, end of school, major event | External factor? |
| 3. **Segment the drop** | By platform (iOS, Android, web), geography, user type | Is it universal or concentrated? |
| 4. **Check for changes** | Recent deploys, feature launches, partner integrations | Did we cause this? |
| 5. **Check infrastructure** | Outages, latency spikes, error rates | Technical issue? |
| 6. **Check competitors** | Competitor launch, market shift | External competitive pressure? |
| 7. **Quantify impact** | Revenue impact, recovery timeline | How bad is this? |

:::tip Senior-Level Insight
When answering metric diagnosis questions, always start with **"Is the data correct?"** — this shows that you've been burned by false alarms before and think critically about data quality. Then proceed to structural investigation. Interviewers love hearing about actual debugging of metric anomalies.
:::

---

## 11. Engineering Impact on Product

### How Technical Decisions Drive Business Outcomes

| Engineering Decision | Product Impact | Business Metric Affected |
|---------------------|---------------|------------------------|
| Reduce page load time by 1s | Lower bounce rate, higher engagement | Conversion (+7% per second saved, per Google research) |
| Improve reliability to 99.99% | Users trust the platform, fewer churn triggers | Retention (+5% for every nine of availability) |
| Ship 2× faster (CI/CD) | Features reach users sooner, faster iteration | Time-to-market, competitive advantage |
| Reduce technical debt | Faster future development, fewer bugs | Developer velocity, defect rate |
| Add offline support | Users engage in poor-connectivity environments | DAU (especially in emerging markets) |
| Improve search relevance | Users find what they need faster | Engagement, conversion, session duration |

### Performance Budgets

| Metric | Target | Impact if Exceeded |
|--------|--------|-------------------|
| **Time to Interactive (TTI)** | < 3.0s on 4G | Every 100ms → 1% conversion drop |
| **Largest Contentful Paint (LCP)** | < 2.5s | Users perceive page as "slow" above this |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Layout jank causes accidental clicks, frustration |
| **First Input Delay (FID)** | < 100ms | Perceived unresponsiveness drives bounce |
| **API Response Time (p95)** | < 500ms | Mobile users are less tolerant of latency |
| **Error Rate** | < 0.1% | Errors erode trust; 1% error rate = 10K errors at 1M requests |

---

## 12. Case Studies

### Case Study 1: Instagram Reels Launch Metrics

**Context:** Instagram launched Reels to compete with TikTok in 2020. How would you measure its success?

| Metric Category | Specific Metric | Why This Metric |
|----------------|----------------|----------------|
| **Primary (North Star)** | % of session time spent on Reels | Measures whether Reels captures attention within the existing app |
| **Creator Health** | Weekly Reels published per creator | Supply side of the marketplace must grow |
| **Consumer Engagement** | Average Reels watched per session, completion rate | Do people watch to the end? |
| **Viral / Discovery** | % of Reels views from non-followers | Is the algorithm surfacing content beyond social graph? |
| **Counter Metric** | Feed + Stories time (should not drop > 5%) | Reels should grow the pie, not cannibalize existing engagement |
| **Counter Metric** | NPS / app store rating | Ensure Reels doesn't degrade overall satisfaction |
| **Revenue** | Ad revenue from Reels placements | Long-term monetization pathway |

**Trade-off discussion:** Reels cannibalizing Stories is acceptable if total engagement grows. But cannibalizing Feed (where most ads run) is dangerous to revenue. This tension drives the ranking algorithm's design.

---

### Case Study 2: Netflix Recommendation Engine

**Context:** Netflix's recommendation system drives ~80% of content watched. How would you measure its success?

| Metric Category | Specific Metric | Target |
|----------------|----------------|--------|
| **Primary** | Hours viewed per subscriber/month | Increasing trend |
| **Discovery** | % of plays from recommendations (vs. search) | > 80% |
| **Content Efficiency** | % of catalog that receives > 1K views/month | > 60% (long tail distribution) |
| **Satisfaction** | Thumbs up/down ratio on recommended content | > 85% positive |
| **Retention Impact** | D30 retention of users who follow recommendations vs. those who don't | Recommendation followers retain 20%+ better |
| **Counter Metric** | Content diversity in recommendations | Avoid filter bubbles — users should see diverse genres |

---

### Case Study 3: A/B Test Example — Checkout Page Redesign

**Setup:**

| Parameter | Value |
|-----------|-------|
| **Hypothesis** | Simplifying checkout from 4 steps to 2 steps will increase conversion by 3% |
| **Primary Metric** | Checkout completion rate (currently 68%) |
| **Counter Metrics** | Average order value, return rate, support tickets |
| **Baseline** | 68% conversion |
| **MDE** | 3% absolute (68% → 71%) |
| **α** | 0.05 |
| **Power** | 0.80 |
| **Required Sample** | ~5,800 per variant (11,600 total) |
| **Duration** | 2 weeks (to capture weekday/weekend patterns) |

**Results:**

| Metric | Control | Treatment | Difference | Significant? |
|--------|:-------:|:---------:|:----------:|:------------:|
| Conversion | 68.2% | 72.1% | +3.9% | ✅ (p = 0.003) |
| Avg Order Value | $47.30 | $46.80 | -$0.50 | ❌ (p = 0.42) |
| Return Rate | 8.1% | 8.3% | +0.2% | ❌ (p = 0.71) |
| Support Tickets | 12/day | 14/day | +2/day | ❌ (p = 0.31) |

**Decision:** Ship treatment. Conversion improvement is significant and practically meaningful. Counter metrics show no meaningful degradation. The $0.50 AOV difference is not statistically significant and likely noise.

---

## 13. Summary

| Topic | Key Takeaway |
|-------|-------------|
| **Product sense** | Senior engineers think about outcomes, not just output |
| **Personas** | Know who you're building for; segment by behavior, not demographics |
| **North Star** | One metric that captures core value; always pair with counter metrics |
| **AARRR** | Acquisition → Activation → Retention → Revenue → Referral |
| **A/B Testing** | Hypothesis first, pre-calculate sample size, watch for novelty effects and Simpson's paradox |
| **Trade-offs** | Use one-way/two-way door framework; score with RICE |
| **Data thinking** | Correlation ≠ causation; always segment; beware Goodhart's Law |
| **Engineering impact** | Performance, reliability, and velocity directly drive business metrics |
| **In interviews** | Start with the user, define metrics, propose guardrails, quantify impact |
