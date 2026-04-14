# Chapter 11 — Testing

> Testing interview questions don't require writing code — they assess your ability to think critically, organize your approach, and demonstrate attention to detail. Strong candidates show structured thinking, cover edge cases systematically, and understand both the big picture and the small details.

---

## What the Interviewer Is Looking For

| Dimension | Description | How to Demonstrate |
|-----------|-------------|-------------------|
| **Big Picture Understanding** | Can you see beyond the immediate task? Do you understand how the component fits into a larger system? | Start with "who uses this?" and "what's the goal?" before diving into test cases |
| **Knowing How Pieces Fit Together** | Do you understand dependencies, integrations, and side effects? | Mention upstream/downstream systems, APIs, databases, and shared state |
| **Organization** | Can you structure your testing approach methodically? | Use categories (functional, boundary, failure, security, performance) rather than listing random tests |
| **Practicality** | Are your tests realistic and actionable? Can you prioritize? | Focus on high-impact, likely scenarios first; acknowledge test effort vs. value tradeoffs |

> The best testing answers follow a framework. Don't just list random test cases — categorize them, prioritize them, and explain your reasoning.

---

## Testing a Real-World Object

When asked to test a physical object (pen, elevator, coffee mug), follow this structured approach:

```
┌─────────────────────────────────────────────────────────────┐
│              REAL-WORLD OBJECT TESTING FRAMEWORK             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: WHO uses it?                                        │
│  ├── Primary users (everyday consumers)                      │
│  ├── Secondary users (maintenance, support)                  │
│  └── Edge users (children, elderly, disabled)                │
│                                                               │
│  Step 2: WHAT are the use cases?                             │
│  ├── Core functionality (the thing it's supposed to do)      │
│  ├── Secondary uses (unintended but common usage)            │
│  └── Misuse scenarios (how it might be used incorrectly)     │
│                                                               │
│  Step 3: WHAT are the bounds of use?                         │
│  ├── Environmental (temperature, humidity, altitude)         │
│  ├── Volume/frequency (how often, how much)                  │
│  └── Duration (how long can it be used continuously)         │
│                                                               │
│  Step 4: STRESS and failure conditions                       │
│  ├── What happens at the limits?                             │
│  ├── What causes failure?                                    │
│  └── How does it fail? (gracefully vs. catastrophically)     │
│                                                               │
│  Step 5: HOW would you perform each test?                    │
│  ├── Manual vs. automated                                    │
│  ├── Tools and setup required                                │
│  └── Pass/fail criteria                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Example: Testing a Coffee Mug

| Category | Test Cases |
|----------|-----------|
| **Functionality** | Holds liquid without leaking; handle is grippable; can drink from rim |
| **Durability** | Survives typical drop height (table to floor); dishwasher safe; microwave safe |
| **Boundary** | Filled to the brim — does it spill when walking? Extremely hot liquid — does handle get hot? |
| **Stress** | Thermal shock (boiling water into cold mug); repeated drops; filled with heavy liquids |
| **User Variation** | Left-handed users; users with limited grip strength; child safety |
| **Environment** | Outdoor use in freezing temperatures; high humidity; direct sunlight |

---

## Testing a Piece of Software

Software testing adds layers of complexity: state management, concurrency, platform variation, and integration dependencies.

### Manual vs. Automated Testing

| Aspect | Manual Testing | Automated Testing |
|--------|---------------|-------------------|
| **Best For** | Exploratory testing, UX validation, visual checks | Regression, load testing, repetitive scenarios |
| **Speed** | Slow, human-paced | Fast, machine-paced |
| **Cost** | High per-execution, low setup | Low per-execution, high setup |
| **Reliability** | Prone to human error, but catches unexpected issues | Consistent, but only tests what's written |
| **When to Choose** | New features, usability testing, ad-hoc exploration | CI/CD pipelines, nightly regressions, data-driven tests |

### Black-Box vs. White-Box Testing

```
┌─────────────────────────────┐   ┌─────────────────────────────┐
│       BLACK-BOX TESTING      │   │       WHITE-BOX TESTING      │
├─────────────────────────────┤   ├─────────────────────────────┤
│                               │   │                               │
│  ┌─────────┐   ┌─────────┐  │   │  ┌─────────────────────┐    │
│  │  Input  │──→│ Output  │  │   │  │   Internal Logic     │    │
│  └─────────┘   └─────────┘  │   │  │   ┌──→ Branch A      │    │
│                               │   │  │   │                  │    │
│  • No knowledge of internals │   │  │   ├──→ Branch B      │    │
│  • Test based on specs       │   │  │   │                  │    │
│  • Equivalence partitioning  │   │  │   └──→ Branch C      │    │
│  • Boundary value analysis   │   │  └─────────────────────┘    │
│                               │   │                               │
│  Also called:                │   │  • Full knowledge of code    │
│  Functional / Behavioral     │   │  • Path coverage             │
│                               │   │  • Statement/branch coverage │
│                               │   │  Also called:                │
│                               │   │  Structural / Glass-box      │
└─────────────────────────────┘   └─────────────────────────────┘
```

### Gray-Box Testing

Combines both: you know some internals (architecture, data flow) but test through external interfaces. Common in integration testing and API testing.

---

## Testing a Function

Function-level testing is the most specific. Use these categories systematically:

### The Function Testing Framework

| Category | Description | Example for `sqrt(int x)` |
|----------|-------------|--------------------------|
| **Normal Cases** | Typical, expected inputs | `sqrt(4) = 2`, `sqrt(9) = 3`, `sqrt(100) = 10` |
| **Edge Cases** | Boundary values, transitions | `sqrt(0) = 0`, `sqrt(1) = 1`, `sqrt(Integer.MAX_VALUE)` |
| **Null / Empty** | Null, empty, zero-length inputs | N/A for int; for `sqrt(Integer x)`: `sqrt(null)` |
| **Invalid Inputs** | Inputs the function shouldn't accept | `sqrt(-1)` — should throw or return error |
| **Boundary Values** | Min/max of data type | `sqrt(Integer.MIN_VALUE)`, `sqrt(Integer.MAX_VALUE)` |
| **Performance** | Large inputs, timing requirements | `sqrt(x)` for very large x — does it complete in time? |

### Example: Testing a Sorting Function

```java
void testSort() {
    // Normal cases
    assertSorted(sort(new int[]{3, 1, 2}));           // basic unsorted
    assertSorted(sort(new int[]{5, 3, 8, 1, 9, 2}));  // longer array

    // Already sorted
    assertSorted(sort(new int[]{1, 2, 3, 4, 5}));     // ascending
    assertSorted(sort(new int[]{5, 4, 3, 2, 1}));     // descending

    // Edge cases
    assertSorted(sort(new int[]{}));                   // empty array
    assertSorted(sort(new int[]{1}));                  // single element
    assertSorted(sort(new int[]{2, 2, 2, 2}));         // all duplicates

    // Boundary values
    assertSorted(sort(new int[]{Integer.MIN_VALUE, 0, Integer.MAX_VALUE}));

    // Null input
    assertThrows(() -> sort(null));                    // null array

    // Large input (performance)
    int[] large = generateRandom(1_000_000);
    long start = System.nanoTime();
    sort(large);
    assertTrue(System.nanoTime() - start < TIMEOUT);
}
```

---

## Troubleshooting Questions

Troubleshooting questions ask you to diagnose a reported bug or system failure. The key is to be systematic, not to guess.

### Troubleshooting Framework

```
┌────────────────────────────────────────────────────────────┐
│              TROUBLESHOOTING FRAMEWORK                      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UNDERSTAND THE SCENARIO                                 │
│     • What exactly is happening?                            │
│     • What should be happening?                             │
│     • When did it start? What changed?                      │
│     • How reproducible is it? (always, sometimes, rarely)   │
│                                                              │
│  2. BREAK DOWN THE PROBLEM                                  │
│     • Isolate components (client, server, network, DB)      │
│     • Which layer is the problem in?                        │
│     • What's the minimal reproduction case?                 │
│                                                              │
│  3. CREATE SPECIFIC, TESTABLE THEORIES                      │
│     • "If the problem is X, then I would expect to see Y"   │
│     • Test one theory at a time                             │
│     • Eliminate hypotheses systematically                   │
│                                                              │
│  4. FIX AND VERIFY                                          │
│     • Apply the fix                                         │
│     • Verify the original issue is resolved                 │
│     • Check for regressions                                 │
│     • Document the root cause                               │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Example: "Chrome crashes randomly"

| Step | Action |
|------|--------|
| **Understand** | Who reports it? How often? Which pages? Which OS/version? |
| **Reproduce** | Can you trigger it reliably? Specific tabs? Extensions loaded? |
| **Isolate** | Safe mode (no extensions)? Specific website? Amount of memory? |
| **Hypothesize** | Memory leak in extension X? Specific JavaScript API crash? GPU driver issue? |
| **Test** | Disable extensions one by one. Monitor memory. Check crash logs. |
| **Resolve** | Identify root cause, apply fix, regression test |

---

## Interview Questions Overview

| # | Problem | Key Approach |
|---|---------|-------------|
| 11.1 | **Find the Mistake** | Trace through code carefully, check off-by-one errors, verify logic conditions |
| 11.2 | **Random Crashes** | Identify patterns in crash timing, check memory issues, race conditions |
| 11.3 | **Chess Test** | Define move rules per piece, check valid/invalid moves, special moves (castling, en passant) |
| 11.4 | **No Test Tools** | Think creatively — use logging, assertions, manual testing, code review as alternatives |
| 11.5 | **Test a Pen** | Apply the real-world object framework: functionality, durability, boundary, user variation |
| 11.6 | **Test an ATM** | Cover: authentication, transactions, concurrency, error handling, security, hardware |

### Testing an ATM: Structured Approach

| Category | Test Cases |
|----------|-----------|
| **Authentication** | Valid PIN, invalid PIN, locked account, expired card, stolen card |
| **Transactions** | Withdraw (valid amount, insufficient funds, daily limit), deposit, balance inquiry, transfer |
| **Concurrency** | Simultaneous access from same account, network timeout during transaction |
| **Error Handling** | Card jam, cash jam, receipt paper out, power failure mid-transaction |
| **Security** | PIN masking, session timeout, skimmer detection, encryption of transmitted data |
| **Hardware** | Card reader, cash dispenser, receipt printer, touchscreen, network connectivity |
| **Boundary** | Withdraw $0, withdraw $0.01, withdraw maximum, deposit negative amount |

---

## The Testing Pyramid

Modern software testing follows a pyramid structure for optimal cost-effectiveness:

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲           Few, slow, expensive
                 ╱──────╲          Test full user flows
                ╱        ╲
               ╱Integration╲      Moderate count
              ╱──────────────╲     Test component interactions
             ╱                ╲
            ╱   Unit Tests     ╲   Many, fast, cheap
           ╱────────────────────╲  Test individual functions
          ╱______________________╲
```

| Level | Count | Speed | What It Tests | Tools |
|-------|-------|-------|--------------|-------|
| **Unit** | Hundreds–thousands | Milliseconds | Individual functions/methods | JUnit, pytest, Jest |
| **Integration** | Dozens–hundreds | Seconds | Component interactions, APIs | TestContainers, Postman |
| **E2E** | Few–dozens | Minutes | Full user workflows | Selenium, Cypress, Playwright |

> Follow the pyramid: if most of your tests are E2E and few are unit tests, your test suite will be slow, brittle, and expensive to maintain. Invert the pyramid.

---

## Test-Driven Development (TDD)

TDD flips the traditional write-then-test approach:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  RED          │────→│  GREEN       │────→│  REFACTOR    │
│  Write a      │     │  Write just  │     │  Clean up    │
│  failing test │     │  enough code │     │  the code    │
│               │     │  to pass     │     │              │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       └──────────────────────────────────────────┘
                    Repeat cycle
```

### TDD Benefits

- Forces you to think about requirements before implementation
- Produces naturally testable code (because the test comes first)
- Acts as living documentation
- Catches regressions immediately
- Encourages smaller, focused functions

### TDD Example

```java
// STEP 1 (RED): Write a failing test
@Test
void shouldReturnEmptyListForNoResults() {
    SearchEngine engine = new SearchEngine();
    List<String> results = engine.search("nonexistent");
    assertTrue(results.isEmpty());
}

// STEP 2 (GREEN): Write minimal code to pass
public class SearchEngine {
    public List<String> search(String query) {
        return Collections.emptyList();
    }
}

// STEP 3 (REFACTOR): Improve structure without changing behavior
// Then write the next test for actual search functionality
```

---

## Mutation Testing

Mutation testing evaluates the quality of your test suite by introducing small changes (mutants) to your code and checking if tests catch them.

| Mutation Type | Original | Mutated |
|--------------|----------|---------|
| **Conditional boundary** | `if (x > 0)` | `if (x >= 0)` |
| **Negate conditional** | `if (x == y)` | `if (x != y)` |
| **Math operator** | `a + b` | `a - b` |
| **Return value** | `return true;` | `return false;` |
| **Void method call** | `list.add(x);` | *(remove the call)* |

> **Mutation score** = killed mutants / total mutants. A score below 80% suggests your tests may have blind spots. A surviving mutant reveals a condition your tests don't exercise.

---

## Property-Based Testing

Instead of testing specific input-output pairs, property-based testing asserts invariants that must hold for all inputs.

```java
// Traditional test: specific examples
@Test void testSort() {
    assertEquals(List.of(1, 2, 3), sort(List.of(3, 1, 2)));
}

// Property-based: must hold for ALL valid inputs
@Property void sortedOutputIsSameLength(@ForAll List<Integer> input) {
    assertEquals(input.size(), sort(input).size());
}

@Property void sortedOutputIsOrdered(@ForAll List<Integer> input) {
    List<Integer> sorted = sort(input);
    for (int i = 1; i < sorted.size(); i++) {
        assertTrue(sorted.get(i - 1) <= sorted.get(i));
    }
}

@Property void sortedOutputHasSameElements(@ForAll List<Integer> input) {
    List<Integer> sorted = sort(input);
    assertTrue(sorted.containsAll(input) && input.containsAll(sorted));
}
```

> Property-based testing excels at finding edge cases you'd never think to write manually. Libraries: jqwik (Java), Hypothesis (Python), fast-check (JavaScript).

---

## Modern Testing Practices

### Test Doubles

| Type | Purpose | Example |
|------|---------|---------|
| **Stub** | Returns predetermined responses | `when(repo.findById(1)).thenReturn(user)` |
| **Mock** | Verifies interactions occurred | `verify(emailService).sendWelcome(user)` |
| **Spy** | Wraps real object, records calls | Real service with call tracking |
| **Fake** | Working implementation (simplified) | In-memory database instead of real DB |

### Code Coverage Metrics

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| **Line coverage** | Lines executed by tests | 80%+ |
| **Branch coverage** | Decision paths taken | 75%+ |
| **Condition coverage** | Boolean sub-expressions | 70%+ |
| **Path coverage** | Complete execution paths | Impractical for complex code |

> High coverage doesn't guarantee good tests. You can have 100% line coverage with zero assertions. Coverage tells you what's NOT tested — it doesn't tell you what's well-tested.

---

## Quick Reference: Testing Interview Checklist

```
Before answering any testing question:

□ Who is the user?
□ What is the primary use case?
□ What are the constraints and boundaries?
□ What are the failure modes?
□ How will I structure and organize my tests?
□ What are the priorities? (What to test first?)
□ What tools/approach would I use?
□ How do I know when I'm done testing?
```

> Testing interviews reveal how you think about quality and risk. The best answers are structured, thorough, and prioritized — not just a random list of test cases.
