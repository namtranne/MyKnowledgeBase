# Chapter III — Special Situations

> Not everyone coming to this book is a fresh CS graduate. Whether you're an experienced engineer, a tester, a PM, a manager, or at a startup facing acquisition — there are specific strategies for your path. The core skills remain the same, but the emphasis shifts.

---

## Experienced Candidates

### Do Experienced Engineers Get Different Questions?

The short answer: **slightly, but not as much as you'd hope.**

| Aspect | Junior Candidates | Experienced Candidates |
|--------|------------------|----------------------|
| **Algorithm questions** | Core focus | Still heavily tested (slightly less emphasis) |
| **System design** | Basic or skipped | **Significant weight** — expected to design at scale |
| **Resume deep-dive** | Light | **In-depth** — "Tell me about the hardest bug you've faced" |
| **Behavioral** | Basic stories | **Rich narratives** expected — years of experience should show |
| **Bar level** | Standard | Mixed — some interviewers lower it (years since school), others raise it (more exposure to problem types) |

> On average, the bar for experienced candidates balances out. But system design and architecture questions scale directly with your years of experience.

### How to Prepare as an Experienced Candidate

1. **Don't skip algorithms** — many experienced engineers make this mistake. Companies that ask algorithm questions to juniors ask them to seniors too
2. **Own your system design stories** — be ready to whiteboard systems you've actually built, explain tradeoffs you made, and discuss what you'd do differently
3. **Prepare depth, not breadth, for behavioral** — your "hardest bug" story should be genuinely hard, not a trivial production incident
4. **Brush up on fundamentals** — if it's been years since you implemented a graph traversal, practice it. The skills come back faster than you think

### Senior Engineer Considerations

For staff/principal-level roles, expect additional evaluation on:

| Dimension | What They're Looking For |
|-----------|------------------------|
| **Technical leadership** | How do you influence technical direction across teams? |
| **Ambiguity tolerance** | Can you define the right problem, not just solve a given one? |
| **Cross-functional impact** | How do you work with product, design, and other engineering teams? |
| **Mentorship** | Do you elevate the engineers around you? |
| **System design depth** | Can you design for scale, reliability, and maintainability simultaneously? |

---

## Testers and SDETs

SDETs (Software Design Engineers in Test) write code — but to test features rather than build them. This means **double the prep work**: you need to be both a great coder and a great tester.

### Preparation Strategy

```
┌─────────────────────────────────────────────────────┐
│              SDET Interview Prep                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. Core Testing Problems                            │
│     "How would you test a light bulb?"               │
│     "How would you test Microsoft Word?"             │
│                                                       │
│  2. Coding & Algorithm Questions                     │
│     Same questions a developer would get             │
│     (bar is slightly lower, but still high)          │
│                                                       │
│  3. Testing the Coding Questions                     │
│     "Write code to do X" → "Now test it"             │
│     Any problem can become an SDET problem           │
│                                                       │
│  4. Communication Skills                             │
│     SDETs work across many teams                     │
│     Behavioral questions are important               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Testing Question Framework

When asked "How would you test X?", use this systematic approach:

| Step | Action | Example (Testing a Pen) |
|------|--------|------------------------|
| 1. **Clarify** | Who uses it? What for? | Writing, drawing, signing, specific surfaces? |
| 2. **Normal cases** | Does it work as expected? | Writes on paper, ink flows smoothly |
| 3. **Edge cases** | Unusual but valid usage | Writing upside down, extreme temperatures, low ink |
| 4. **Error cases** | Misuse and failure modes | Dropping, bending, submerging in water |
| 5. **Performance** | Stress testing | How long until ink runs out? Speed of writing? |
| 6. **Security/Safety** | Safety considerations | Is the ink non-toxic? Does the cap prevent choking? |

### Career Path Warning

> If you're taking an SDET role as an "easy way in" to a top company, be aware: transitioning from SDET to SDE is **difficult** once you've been in the role for 2+ years. Keep your coding and algorithm skills razor-sharp, and try to switch within 1–2 years. Never let your coding skills atrophy.

---

## Product (and Program) Managers

PM interviews are fundamentally different from engineering interviews. The skills being evaluated shift significantly:

### What PM Interviewers Assess

| Skill Area | Weight | How It's Tested |
|------------|--------|----------------|
| **Handling Ambiguity** | Medium | Open-ended problems: "Design a product for X" — they want structured thinking, not paralysis |
| **Customer Focus (Attitude)** | High | "Design an alarm clock for the blind" — do you ask about the customer, or assume they're like you? |
| **Customer Focus (Technical)** | Varies | Domain-specific knowledge for complex products (e.g., security team needs security expertise) |
| **Multi-Level Communication** | High | "Explain TCP/IP to your grandmother" — can you adjust complexity for the audience? |
| **Passion for Technology** | High | "Why are you interested in this company?" — they want genuine enthusiasm, not rehearsed answers |
| **Teamwork / Leadership** | Highest | "Tell me about a time a teammate wasn't pulling their weight" — conflict resolution, initiative, EQ |

### Common PM Question Types

| Category | Example |
|----------|---------|
| **Product design** | "Design a parking garage for downtown San Francisco" |
| **Estimation** | "How many golf balls fit in a school bus?" |
| **Strategy** | "If you were the CEO of YouTube, what would you change?" |
| **Behavioral** | "Tell me about a time you had to convince a team to adopt your idea" |
| **Technical** | "How would you explain APIs to a non-technical stakeholder?" |

### PM Preparation Tips

1. Practice estimation questions with the **back-of-the-envelope** approach
2. For product design, always start by asking **who the user is** and **what problem they have**
3. Structure your answers visually — draw product flows, user journeys, and prioritization matrices
4. Read about the company's products deeply — have specific opinions and improvement ideas

---

## Dev Leads and Managers

Strong coding skills are **almost always required** for dev lead positions and often for management roles. Google, in particular, holds engineering managers to the same coding bar as ICs.

### What's Evaluated Beyond Coding

| Area | What They Want to See |
|------|----------------------|
| **Teamwork / Leadership** | How you handle disagreements with managers, motivate underperformers, and build trust |
| **Prioritization** | How you cut scope to meet deadlines without sacrificing quality on what matters |
| **Communication** | Can you communicate effectively with executives, engineers, and non-technical partners? |
| **Getting Things Done** | Do you strike the right balance between planning and executing? Can you unblock teams? |

### Interview Format for Engineering Managers

```
Typical EM Interview Loop:

Round 1: Coding / Algorithm          ← Yes, you still code
Round 2: System Design               ← Expected to be strong here
Round 3: People Management           ← Past project deep-dive, team scenarios
Round 4: Cross-functional            ← Working with product, design, leadership
Round 5: Hiring Manager / VP         ← Culture, vision, leadership philosophy
```

### Management Scenario Questions

| Scenario | What They're Assessing |
|----------|----------------------|
| "A team member consistently misses deadlines" | Coaching ability, empathy, accountability balance |
| "Two senior engineers disagree on architecture" | Conflict resolution, technical judgment, decision-making |
| "You inherited a demoralized team" | Culture building, motivation techniques, diagnosing root causes |
| "You need to deliver a feature in half the estimated time" | Scope negotiation, prioritization, communicating up |
| "A direct report wants to be promoted but isn't ready" | Honest feedback, growth planning, setting expectations |

### Preparation Strategy

- Use the **Interview Preparation Grid** (Chapter V) thoroughly — have deep stories for every cell
- For each story, know: the situation, your specific actions, the measurable outcome, and what you'd do differently
- Practice explaining technical decisions to non-technical audiences
- Be ready to discuss your **management philosophy** — how you think about team building, feedback, and growth

---

## Startups

Startup interviews are highly variable, but some patterns hold:

### Getting In

```
Best paths to a startup interview:

Personal referral ──────────────── Most effective (even loose connections work)
    │
Direct outreach ─────────────────── Express genuine interest; startups are responsive
    │
Job listings ────────────────────── Works, but competitive for top startups
    │
Professional recruiter ──────────── Especially useful for visa situations
```

### What Startups Look For

| Factor | Why It Matters | How to Show It |
|--------|---------------|----------------|
| **Personality fit** | Small team = every person matters culturally | Be genuine, engaging, and conversational |
| **Specific skill set** | Need to "hit the ground running" — no 6-month onboarding | Know their tech stack; highlight relevant project experience |
| **Prior experience** | More weight on what you've actually built | Deep-dive into past projects with technical specifics |
| **Initiative** | Entrepreneurial environment needs self-starters | Side projects, open source contributions, things built "just for fun" |
| **Breadth** | Small teams need generalists who can wear many hats | Show experience across frontend, backend, infra, or whatever is relevant |

### Startup-Specific Considerations

**Visa / Work Authorization**: Many smaller US startups cannot sponsor work visas. Focus on larger startups or work with a specialized recruiter if this applies to you.

**Equity**: Understand the basics of startup equity:

| Term | What It Means |
|------|--------------|
| **Vesting schedule** | Typically 4 years with a 1-year cliff |
| **Strike price** | The price you pay to exercise options |
| **Preferred vs common** | Investors get preferred; employees get common (worth less in a liquidation) |
| **Dilution** | Future funding rounds reduce your ownership percentage |
| **409A valuation** | The IRS-approved fair market value of common stock |

> Don't optimize solely for equity. At early-stage startups, the expected value of equity is often close to zero. Optimize for learning, growth, and the team.

---

## Acquisitions and Acquihires

When a startup is being acquired, the acquirer often interviews most or all employees as part of technical due diligence.

### Why Acquisitions Interview

- Employees of the acquirer had to pass these interviews — acquisitions shouldn't be a backdoor
- The team is a core motivator for the acquisition, so assessing skills makes sense
- Multi-billion dollar acquisitions of established products typically skip this; acquihires do not

### How Important Are These Interviews?

| Impact | Description |
|--------|-------------|
| **Make or break the deal** | Poor team performance can kill the acquisition |
| **Determine who gets offers** | Individual performance determines individual outcomes |
| **Affect price** | Acquisition price can be influenced by how many employees join |

### Who Gets Interviewed?

- All engineers (primary motivator for most acquihires)
- Sales, customer support, PMs may also be interviewed
- The CEO is typically slotted into a PM or dev manager interview
- Some CEOs opt out and leave upon acquisition

### What Happens to Underperformers?

| Outcome | Likelihood |
|---------|-----------|
| No offer from acquirer | Most common |
| Temporary "knowledge transfer" contract (typically 6 months) | Occasional |
| Re-interview for a more appropriate level/role | Rare but possible |
| CEO override for particularly strong employees | Very rare |

### Common Mis-Slotting Issues

- **Data scientists/DB engineers labeled as "software engineers"** — they underperform on SWE interviews because the skills don't match
- **Junior engineers sold as senior** — they're held to an unfairly high bar
- In both cases, re-interviewing at an appropriate level is sometimes possible

### Preparing Your Team for Acquisition Interviews

1. **Don't wait** — acquisition conversations can accelerate suddenly ("come in at the end of this week")
2. Consider pausing "real" work for 2–3 weeks of dedicated interview prep
3. Study individually, in pairs, and through mock interviews — use all three approaches
4. People without CS degrees need extra time on fundamentals (Big O, core data structures)
5. Your "best" and "worst" interview performers may surprise you — don't count anyone out

> Employees are held to essentially the same standard as regular candidates, with slight leeway — "on the fence" employees can be pulled through by strong overall team performance.

---

## For Interviewers

If you're using this book to improve your interviewing skills, here are the key principles:

### Question Selection

| Do | Don't |
|----|-------|
| Ask questions similar to those in this book | Ask the exact questions from this book (candidates read it too) |
| Ask medium and hard problems | Ask easy questions (performance clusters, minor issues dominate) |
| Use hard **questions**, not hard **knowledge** | Require obscure algorithms (Dijkstra's, AVL tree details) |
| Look for questions with multiple hurdles/optimizations | Use "Aha!" questions that hinge on a single insight |
| Choose questions that allow partial credit | Use all-or-nothing questions |

### Conducting the Interview

| Principle | Details |
|-----------|---------|
| **Offer positive reinforcement** | "Right, exactly." "Great point." "Good work." — candidates cling to every signal |
| **Avoid "scary" questions** | Math, probability, low-level memory — these intimidate even when they shouldn't. Reassure candidates explicitly |
| **Probe deeper on behavioral** | If a candidate talks about "the team" instead of themselves, ask specifically about their role — especially for leaders and women |
| **Coach struggling candidates** | Suggest examples, brute force, or algorithmic approaches. You're separating interview skills from job skills |
| **Give silence when needed** | Distinguish between "I'm stuck" and "I'm thinking." Some candidates need quiet time — give it to them |

### Know Your Question Mode

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **Sanity Check** | Minimum competence filter | Early screening, low-complexity roles |
| **Quality Check** | Rigorous problem-solving evaluation | Core technical interviews |
| **Specialist** | Test domain-specific expertise | Only when the role genuinely requires it |
| **Proxy Knowledge** | Assess learning ability via expected baseline | When you want to verify depth of experience |

### Common Interviewer Mistakes

1. **Asking specialist questions to generalists** — unfair and uninformative
2. **Treating sanity checks as quality checks** — over-interpreting small differences on easy questions
3. **Hiring for specialization when you need generalists** — or vice versa
4. **Not calibrating** — if you've only asked your question to 3 people, you can't reliably evaluate the 4th
5. **Talking too much** — some interviewers fill silence out of their own discomfort, preventing candidates from thinking

---

## Career Transition Guidance

### Moving Between Roles

| From → To | Key Challenge | Strategy |
|-----------|--------------|----------|
| **SDET → SDE** | Perceived as "not a real developer" | Keep coding skills sharp, contribute to product code, switch within 1–2 years |
| **PM → Engineering** | Coding skills may have atrophied | Rebuild with side projects, take on technical PM work, consider bootcamps |
| **Big Company → Startup** | Used to structure and resources | Highlight autonomy and initiative, show side projects, demonstrate breadth |
| **Startup → Big Company** | May lack formal CS fundamentals | Invest in algorithm/DS practice, study system design patterns, prepare for structured interviews |
| **Manager → IC** | May be rusty on coding | Re-sharpen through LeetCode and side projects, emphasize your architectural experience |
| **IC → Manager** | No management track record | Lead projects informally, mentor juniors, take on tech lead responsibilities |

### Tips for Non-Traditional Backgrounds

- **Bootcamp graduates**: You'll face bias — counter it with strong coding performance and impressive projects
- **Self-taught developers**: Same advice, plus be ready to explain your learning journey compellingly
- **Career changers**: Frame your previous experience as an asset (domain knowledge, communication, different perspectives)
- **Returning after a break**: Be honest about the gap, show what you did to stay current, demonstrate that your skills are intact
