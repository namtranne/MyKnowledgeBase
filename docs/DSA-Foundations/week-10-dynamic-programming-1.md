---
sidebar_position: 11
title: "Week 10: Dynamic Programming I"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 10: Dynamic Programming I

Last week you conquered advanced graphs — Dijkstra, Union-Find, MST, and topological sort. This week you enter the territory that separates "good" from "great" in coding interviews: **Dynamic Programming**. DP is consistently the most-tested pattern at top companies, and mastering its foundations here will make Week 11's advanced DP problems feel natural.

---

## 1 · Core Theory

### 1.1 What Is Dynamic Programming?

**Why this technique exists:** Many problems have a recursive structure where the same subproblems appear over and over. Plain recursion solves each one from scratch, leading to exponential time. DP eliminates this waste by storing subproblem results and reusing them, collapsing exponential complexity into polynomial. It is the single most common technique tested at FAANG-level interviews because it requires both problem decomposition skill and implementation discipline.

**Interview signal:** If the problem asks for "number of ways", "minimum/maximum cost", "is it possible", or "longest/shortest sequence", and brute force would enumerate an exponential number of choices, DP is almost certainly the intended approach. The other major signal is that choices at step `i` affect what is available at step `i+1` — this distinguishes DP from greedy.

Dynamic Programming is an algorithmic technique for solving problems that exhibit two key properties:

**Overlapping Subproblems** — the same smaller subproblems are solved repeatedly. Rather than recomputing them each time, we store results and reuse them.

**Optimal Substructure** — an optimal solution to the overall problem can be constructed from optimal solutions to its subproblems.

If a problem has both properties, DP applies. If it only has optimal substructure (no overlapping subproblems), plain recursion or divide-and-conquer suffices.

**DP vs Greedy:** Greedy makes one locally optimal choice and never revisits it. DP explores all subproblem combinations and guarantees a global optimum. Use greedy when you can prove the greedy choice property holds; otherwise, reach for DP.

**DP vs Divide and Conquer:** Both decompose problems. The difference is overlap — merge sort's subproblems are independent (no overlap), while Fibonacci's subproblems overlap heavily. When subproblems overlap, caching transforms exponential recursion into polynomial DP.

### 1.2 Top-Down (Memoization) vs Bottom-Up (Tabulation)

There are two equivalent ways to implement DP:

| | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|---|---|---|
| Direction | Start from the original problem, recurse into subproblems | Start from the smallest subproblems, build up |
| Implementation | Recursive function + cache (HashMap or array) | Iterative loops filling a table |
| Subproblems solved | Only those actually needed (lazy) | All subproblems in the table (eager) |
| Stack overhead | Recursion stack — can cause StackOverflowError for deep recursion | No recursion — handles large inputs |
| Ease of writing | Often more intuitive — mirrors the recurrence directly | Requires thinking about iteration order |
| Performance | Slight overhead from function calls and cache lookups | Usually faster in practice (cache-friendly, no call overhead) |

**Rule of thumb for interviews:** Start with top-down memoization (easier to derive), then convert to bottom-up if the interviewer asks for optimisation or if input size demands it.

### 1.3 The Four Steps to Any DP Solution

Every DP problem follows the same framework:

**Step 1 — Define the state.** What does `dp[i]` (or `dp[i][j]`) represent? This is the single most important decision. A good state definition makes the recurrence obvious; a bad one makes the problem unsolvable.

**Step 2 — Write the transition (recurrence).** How does `dp[i]` relate to smaller subproblems? This is the core logic of your solution.

**Step 3 — Identify base cases.** What are the values of `dp` for the smallest inputs? These are the initial conditions that stop recursion or seed the table.

**Step 4 — Determine the answer.** Which entry in the table holds the final result? It might be `dp[n]`, `dp[n-1]`, `max(dp)`, or something else entirely.

### 1.4 1D DP Patterns

**Common mistake:** Jumping straight to code without defining the state first. The state definition is the hardest and most important step — spend time getting it right on paper before writing any code. If the recurrence feels forced, the state is probably wrong.

Most beginner DP problems use a single dimension. Common patterns:

**Linear scan:** `dp[i]` depends on `dp[i-1]` (and possibly `dp[i-2]`). Examples: Fibonacci, Climbing Stairs, House Robber.

**Prefix optimisation:** `dp[i]` depends on `dp[j]` for all `j < i`. Examples: Longest Increasing Subsequence (naive O(n²)).

**Knapsack-style:** `dp[i]` iterates over a set of items or choices. Examples: Coin Change, Word Break.

**Kadane's pattern:** Track a running value that resets under certain conditions. Examples: Maximum Subarray, Maximum Product Subarray.

### 1.5 State Definition — Getting It Right

Common state definitions for 1D problems:

| Problem type | State definition |
|---|---|
| "Number of ways to reach step i" | `dp[i]` = number of distinct ways to reach position i |
| "Minimum cost to reach step i" | `dp[i]` = minimum cost to reach position i |
| "Maximum value using first i items" | `dp[i]` = best value considering items 0..i-1 |
| "Can we form amount i?" | `dp[i]` = True/False whether amount i is achievable |
| "Length of best subsequence ending at i" | `dp[i]` = length of the longest valid subsequence ending at index i |

**Tip:** If your recurrence feels forced or overly complex, your state definition is probably wrong. Try redefining what `dp[i]` represents.

### 1.6 Space Optimisation — Rolling Variables

**Why this technique exists:** Interviewers frequently ask "can you reduce space?" after you present a working DP solution. If `dp[i]` depends only on the last one or two entries, the entire array is waste — you only need to keep the entries that are still referenced. This reduces O(n) space to O(1) with minimal code change, and is an easy win in interviews.

**Interview signal:** If the interviewer says "can you optimise space?" and your recurrence looks back a fixed number of steps (1 or 2), immediately offer rolling variables. For 2D DP where each row depends only on the previous row, keep two rows and alternate.

When `dp[i]` only depends on the previous one or two entries, you don't need the entire array. Replace it with a few variables:

**Before (O(n) space):**

```java
int[] dp = new int[n + 1];
dp[1] = 1;
for (int i = 2; i <= n; i++)
    dp[i] = dp[i - 1] + dp[i - 2];
return dp[n];
```

**After (O(1) space):**

```java
int prev2 = 0, prev1 = 1;
for (int i = 2; i <= n; i++) {
    int tmp = prev1;
    prev1 = prev1 + prev2;
    prev2 = tmp;
}
return prev1;
```

This trick applies whenever the recurrence has a fixed "window" of dependencies. For 2D DP where `dp[i][j]` only depends on row `i-1`, keep only two rows and alternate.

---

## 2 · Code Templates

### Template 1 — Top-Down Memoization

**When to use this template:** Start here when you have identified the recurrence but are not yet sure about the iteration order. Top-down is the fastest to write in an interview because it mirrors the mathematical recurrence directly — just add a memo cache. Use the HashMap version when states are sparse or non-integer; use the array version when states are contiguous integers (faster in practice due to no hashing overhead).

```java
import java.util.*;

public static int solve(int n) {
    Map<Integer, Integer> memo = new HashMap<>();
    return dp(n, memo);
}

private static int dp(int state, Map<Integer, Integer> memo) {
    if (memo.containsKey(state)) return memo.get(state);
    if (state == 0) return BASE_VALUE;

    int result = COMBINE(dp(smallerState1, memo), dp(smallerState2, memo));
    memo.put(state, result);
    return result;
}
```

With an array-based memo (when states are contiguous integers), you can avoid HashMap overhead:

```java
public static int solve(int n) {
    int[] memo = new int[n + 1];
    Arrays.fill(memo, -1);
    return dp(n, memo);
}

private static int dp(int state, int[] memo) {
    if (state == 0) return BASE_VALUE;
    if (memo[state] != -1) return memo[state];
    memo[state] = COMBINE(dp(state - 1, memo), dp(state - 2, memo));
    return memo[state];
}
```

### Template 2 — Bottom-Up Tabulation

**When to use this template:** Convert to bottom-up when the interviewer asks for optimisation, when input sizes risk stack overflow (n greater than ~10,000 in Java), or when you need to apply space optimisation (rolling variables). Bottom-up is also slightly faster in practice due to cache-friendly sequential access and no function call overhead.

```java
public static int solve(int n) {
    int[] dp = new int[n + 1];
    dp[0] = BASE_VALUE;

    for (int i = 1; i <= n; i++) {
        dp[i] = COMBINE(dp[i - 1], dp[i - 2]);
    }
    return dp[n];
}
```

### Template 3 — Space-Optimised Fibonacci

**When to use this template:** Use this whenever `dp[i]` depends only on `dp[i-1]` and `dp[i-2]` — which covers Climbing Stairs, Fibonacci, Min Cost Climbing Stairs, and many other linear DP problems. The pattern generalises: if `dp[i]` depends on the last k entries, keep k rolling variables instead of the full array.

```java
public static int fib(int n) {
    if (n <= 1) return n;
    int prev2 = 0, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int tmp = prev1;
        prev1 = prev1 + prev2;
        prev2 = tmp;
    }
    return prev1;
}
```

<AlgoViz
  title="Fibonacci with Memoization — Cache Fills Bottom-Up"
  description="Compute fib(6) = 8. Top-down recursion with memo cache eliminates redundant subproblems."
  steps={[
    {
      array: [0, 1, -1, -1, -1, -1, -1],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [0, 1],
      variables: { call: "fib(6)", cached: 2 },
      explanation: "Base cases: fib(0)=0, fib(1)=1. All others start as -1 (uncached). fib(6) recurses into fib(5), which recurses down to fib(2).",
      code: "if (state <= 1) return state; // base cases"
    },
    {
      array: [0, 1, 1, -1, -1, -1, -1],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [2],
      secondary: [0, 1],
      variables: { call: "fib(2)", "fib(1)+fib(0)": "1+0=1", cached: 3 },
      explanation: "fib(2) = fib(1) + fib(0) = 1 + 0 = 1. Cache memo[2] = 1. First computed value.",
      code: "memo[2] = dp(1, memo) + dp(0, memo); // 1"
    },
    {
      array: [0, 1, 1, 2, -1, -1, -1],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [3],
      secondary: [1, 2],
      variables: { call: "fib(3)", "fib(2)+fib(1)": "1+1=2", cached: 4 },
      explanation: "fib(3) = fib(2) + fib(1) = 1 + 1 = 2. fib(2) is a cache hit! memo[3] = 2.",
      code: "memo[3] = dp(2, memo) + dp(1, memo); // cache hit on fib(2)"
    },
    {
      array: [0, 1, 1, 2, 3, -1, -1],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [4],
      secondary: [2, 3],
      variables: { call: "fib(4)", "fib(3)+fib(2)": "2+1=3", cached: 5 },
      explanation: "fib(4) = fib(3) + fib(2) = 2 + 1 = 3. Both are cache hits! memo[4] = 3.",
      code: "memo[4] = dp(3, memo) + dp(2, memo); // both cached"
    },
    {
      array: [0, 1, 1, 2, 3, 5, -1],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [5],
      secondary: [3, 4],
      variables: { call: "fib(5)", "fib(4)+fib(3)": "3+2=5", cached: 6 },
      explanation: "fib(5) = fib(4) + fib(3) = 3 + 2 = 5. Cache hits. memo[5] = 5.",
      code: "memo[5] = dp(4, memo) + dp(3, memo); // 5"
    },
    {
      array: [0, 1, 1, 2, 3, 5, 8],
      labels: { 0: "fib(0)", 1: "fib(1)", 2: "fib(2)", 3: "fib(3)", 4: "fib(4)", 5: "fib(5)", 6: "fib(6)" },
      highlights: [6],
      secondary: [4, 5],
      variables: { call: "fib(6)", "fib(5)+fib(4)": "5+3=8", answer: 8 },
      explanation: "fib(6) = fib(5) + fib(4) = 5 + 3 = 8. Only 7 subproblems solved (not 2^6 = 64). Memoization collapses exponential to O(n).",
      code: "memo[6] = dp(5, memo) + dp(4, memo); // 8"
    }
  ]}
/>

### Template 4 — 1D DP Decision (Take or Skip)

**When to use this template:** Use this for any problem where at each element you make a binary decision: include it (and skip the previous) or exclude it (and carry forward the best so far). This covers House Robber, 0/1 knapsack with a single constraint, and any "non-adjacent selection" problem. The `max(dp[i-1], dp[i-2] + nums[i])` recurrence is the signature of this pattern — recognise it instantly.

Used in House Robber, 0/1 knapsack variants, and similar "choose or skip" problems:

```java
public static int solve(int[] nums) {
    int n = nums.length;
    if (n == 0) return 0;

    int[] dp = new int[n];
    dp[0] = nums[0];
    if (n > 1) dp[1] = Math.max(nums[0], nums[1]);

    for (int i = 2; i < n; i++) {
        dp[i] = Math.max(
            dp[i - 1],              // skip nums[i]
            dp[i - 2] + nums[i]     // take nums[i]
        );
    }
    return dp[n - 1];
}
```

<AlgoViz
  title="House Robber — Take or Skip DP"
  description="nums = [2, 7, 9, 3, 1]. dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Cannot rob adjacent houses."
  steps={[
    {
      array: [2, 7, 9, 3, 1],
      labels: { 0: "house 0", 1: "house 1", 2: "house 2", 3: "house 3", 4: "house 4" },
      highlights: [],
      variables: { dp: "[?, ?, ?, ?, ?]" },
      explanation: "5 houses with values [2, 7, 9, 3, 1]. At each house, decide: rob it (skip previous) or skip it (keep previous best).",
      code: "dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [0],
      variables: { "dp[0]": 2, decision: "rob house 0" },
      explanation: "Base case: dp[0] = nums[0] = 2. Only one house → rob it.",
      code: "dp[0] = nums[0]; // 2"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [1],
      secondary: [0],
      variables: { "dp[0]": 2, "dp[1]": 7, decision: "rob house 1 (7 > 2)" },
      explanation: "dp[1] = max(nums[0], nums[1]) = max(2, 7) = 7. Better to rob house 1 than house 0.",
      code: "dp[1] = Math.max(nums[0], nums[1]); // 7"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [2],
      secondary: [0, 1],
      variables: { "dp[0]": 2, "dp[1]": 7, "dp[2]": 11, skip: 7, take: "2+9=11" },
      explanation: "dp[2] = max(dp[1], dp[0]+nums[2]) = max(7, 2+9) = max(7, 11) = 11. Rob houses 0 and 2.",
      code: "dp[2] = Math.max(7, 2 + 9); // 11 (take)"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [3],
      secondary: [1, 2],
      variables: { "dp[1]": 7, "dp[2]": 11, "dp[3]": 11, skip: 11, take: "7+3=10" },
      explanation: "dp[3] = max(dp[2], dp[1]+nums[3]) = max(11, 7+3) = max(11, 10) = 11. Skip house 3.",
      code: "dp[3] = Math.max(11, 7 + 3); // 11 (skip)"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [4],
      secondary: [2, 3],
      variables: { "dp[2]": 11, "dp[3]": 11, "dp[4]": 12, skip: 11, take: "11+1=12" },
      explanation: "dp[4] = max(dp[3], dp[2]+nums[4]) = max(11, 11+1) = 12. Rob houses 0, 2, and 4. Answer: 12.",
      code: "dp[4] = Math.max(11, 11 + 1); // 12 (take)"
    },
    {
      array: [2, 7, 9, 3, 1],
      highlights: [0, 2, 4],
      variables: { answer: 12, robbed: "houses 0, 2, 4", values: "2+9+1=12" },
      explanation: "Maximum loot = 12. Optimal: rob houses 0 (2), 2 (9), 4 (1). No two adjacent houses robbed.",
      code: "return dp[n - 1]; // 12"
    }
  ]}
/>

---

## 3 · Complexity Reference

| Pattern | Time | Space | Space (optimised) |
|---|---|---|---|
| Fibonacci / Climbing Stairs | O(n) | O(n) | O(1) |
| House Robber (take/skip) | O(n) | O(n) | O(1) |
| Kadane's (max subarray) | O(n) | O(1) | O(1) |
| Coin Change (unbounded) | O(n × amount) | O(amount) | O(amount) |
| LIS (naive) | O(n²) | O(n) | O(n) |
| LIS (patience sort / BS) | O(n log n) | O(n) | O(n) |
| Word Break | O(n² × L) | O(n) | O(n) |
| 0/1 Knapsack | O(n × W) | O(n × W) | O(W) |
| Unique Paths (grid) | O(m × n) | O(m × n) | O(n) |
| Longest Palindromic Substring | O(n²) | O(n²) | O(1) with expand |

---

## 4 · Worked Example — Climbing Stairs (LC 70)

**Problem:** You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. How many distinct ways can you reach the top?

### 4.1 State Definition

`dp[i]` = number of distinct ways to reach step `i`.

### 4.2 Recurrence

To reach step `i`, you either came from step `i-1` (took 1 step) or step `i-2` (took 2 steps):

```
dp[i] = dp[i - 1] + dp[i - 2]
```

### 4.3 Base Cases

- `dp[0] = 1` — one way to stand at the ground (do nothing)
- `dp[1] = 1` — one way to reach step 1 (single step)

### 4.4 Approach A — Top-Down Memoization

```java
public static int climbStairs(int n) {
    int[] memo = new int[n + 1];
    Arrays.fill(memo, -1);
    return dp(n, memo);
}

private static int dp(int i, int[] memo) {
    if (i <= 1) return 1;
    if (memo[i] != -1) return memo[i];
    memo[i] = dp(i - 1, memo) + dp(i - 2, memo);
    return memo[i];
}
```

**Trace for n = 5:**

```
dp(5)
├── dp(4)
│   ├── dp(3)
│   │   ├── dp(2)
│   │   │   ├── dp(1) = 1  ← base case
│   │   │   └── dp(0) = 1  ← base case
│   │   │   = 2  ← cached
│   │   └── dp(1) = 1  ← cached
│   │   = 3  ← cached
│   └── dp(2) = 2  ← cache hit!
│   = 5  ← cached
└── dp(3) = 3  ← cache hit!
= 8
```

| Call | Computed or Cached | Value |
|---|---|---|
| dp(0) | Computed (base) | 1 |
| dp(1) | Computed (base) | 1 |
| dp(2) | Computed: dp(1) + dp(0) = 1 + 1 | 2 |
| dp(3) | Computed: dp(2) + dp(1) = 2 + 1 | 3 |
| dp(4) | Computed: dp(3) + dp(2) = 3 + 2 | 5 |
| dp(5) | Computed: dp(4) + dp(3) = 5 + 3 | 8 |

Without memoization, the recursion tree has 2^n nodes. With memoization, only n + 1 unique subproblems are solved.

### 4.5 Approach B — Bottom-Up Tabulation

```java
public static int climbStairs(int n) {
    if (n <= 1) return 1;
    int[] dp = new int[n + 1];
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}
```

**Table fill for n = 5:**

| i | dp[i-2] | dp[i-1] | dp[i] = dp[i-1] + dp[i-2] |
|---|---|---|---|
| 0 | — | — | 1 (base) |
| 1 | — | — | 1 (base) |
| 2 | dp[0] = 1 | dp[1] = 1 | 2 |
| 3 | dp[1] = 1 | dp[2] = 2 | 3 |
| 4 | dp[2] = 2 | dp[3] = 3 | 5 |
| 5 | dp[3] = 3 | dp[4] = 5 | 8 |

**Answer:** dp[5] = **8**.

### 4.6 Approach C — Space Optimised

Since `dp[i]` only depends on `dp[i-1]` and `dp[i-2]`, we replace the array with two variables:

```java
public static int climbStairs(int n) {
    if (n <= 1) return 1;
    int prev2 = 1, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int tmp = prev1;
        prev1 = prev1 + prev2;
        prev2 = tmp;
    }
    return prev1;
}
```

| Iteration | prev2 (was dp[i-2]) | prev1 (was dp[i-1]) | new prev1 (dp[i]) |
|---|---|---|---|
| Start | 1 | 1 | — |
| i = 2 | 1 | 2 | 1 + 1 = 2 |
| i = 3 | 2 | 3 | 2 + 1 = 3 |
| i = 4 | 3 | 5 | 3 + 2 = 5 |
| i = 5 | 5 | 8 | 5 + 3 = 8 |

Time: O(n). Space: O(1).

<AlgoViz
  title="Climbing Stairs — DP Table Building"
  description="Bottom-up tabulation for n = 5. dp[i] = dp[i-1] + dp[i-2] builds the number of ways to reach each step."
  steps={[
    {
      array: [1, 1, 0, 0, 0, 0],
      pointers: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]" },
      highlights: [0, 1],
      variables: { n: 5 },
      explanation: "Base cases: dp[0] = 1 (one way to stand at ground), dp[1] = 1 (one way to reach step 1).",
      code: "dp[0] = 1; dp[1] = 1;"
    },
    {
      array: [1, 1, 2, 0, 0, 0],
      pointers: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]" },
      highlights: [2],
      secondary: [0, 1],
      variables: { n: 5, i: 2, "dp[i-1]": 1, "dp[i-2]": 1 },
      explanation: "i = 2: dp[2] = dp[1] + dp[0] = 1 + 1 = 2. Two ways to reach step 2.",
      code: "dp[2] = dp[1] + dp[0]; // 1 + 1 = 2"
    },
    {
      array: [1, 1, 2, 3, 0, 0],
      pointers: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]" },
      highlights: [3],
      secondary: [1, 2],
      variables: { n: 5, i: 3, "dp[i-1]": 2, "dp[i-2]": 1 },
      explanation: "i = 3: dp[3] = dp[2] + dp[1] = 2 + 1 = 3. Three ways to reach step 3.",
      code: "dp[3] = dp[2] + dp[1]; // 2 + 1 = 3"
    },
    {
      array: [1, 1, 2, 3, 5, 0],
      pointers: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]" },
      highlights: [4],
      secondary: [2, 3],
      variables: { n: 5, i: 4, "dp[i-1]": 3, "dp[i-2]": 2 },
      explanation: "i = 4: dp[4] = dp[3] + dp[2] = 3 + 2 = 5. Five ways to reach step 4.",
      code: "dp[4] = dp[3] + dp[2]; // 3 + 2 = 5"
    },
    {
      array: [1, 1, 2, 3, 5, 8],
      pointers: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]" },
      highlights: [5],
      secondary: [3, 4],
      variables: { n: 5, i: 5, "dp[i-1]": 5, "dp[i-2]": 3, answer: 8 },
      explanation: "i = 5: dp[5] = dp[4] + dp[3] = 5 + 3 = 8. Answer: 8 distinct ways to climb 5 steps.",
      code: "dp[5] = dp[4] + dp[3]; // 5 + 3 = 8 -> return dp[n];"
    }
  ]}
/>

<AlgoViz
  title="Min Cost Climbing Stairs — Bottom-Up DP"
  description="cost = [10, 15, 20, 10, 25]. dp[i] = cost[i] + min(dp[i-1], dp[i-2]). Find minimum cost to reach the top."
  steps={[
    {
      array: [10, 15, 20, 10, 25],
      labels: { 0: "cost[0]", 1: "cost[1]", 2: "cost[2]", 3: "cost[3]", 4: "cost[4]" },
      highlights: [],
      variables: { dp: "[?, ?, ?, ?, ?]", goal: "reach past step 4" },
      explanation: "Cost array [10, 15, 20, 10, 25]. dp[i] = minimum total cost to reach step i (and pay its toll). We can start at step 0 or step 1.",
      code: "dp[i] = cost[i] + Math.min(dp[i-1], dp[i-2]);"
    },
    {
      array: [10, 0, 0, 0, 0],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [0],
      variables: { "dp[0]": 10, "cost[0]": 10 },
      explanation: "Base case: dp[0] = cost[0] = 10. Standing on step 0 costs 10.",
      code: "dp[0] = cost[0]; // 10"
    },
    {
      array: [10, 15, 0, 0, 0],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [1],
      variables: { "dp[1]": 15, "cost[1]": 15 },
      explanation: "Base case: dp[1] = cost[1] = 15. Can jump directly to step 1 without paying step 0.",
      code: "dp[1] = cost[1]; // 15"
    },
    {
      array: [10, 15, 30, 0, 0],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [2],
      secondary: [0, 1],
      variables: { "dp[2]": 30, "cost[2]": 20, "min(dp[0],dp[1])": "min(10,15)=10" },
      explanation: "dp[2] = cost[2] + min(dp[0], dp[1]) = 20 + min(10, 15) = 20 + 10 = 30. Cheaper to come from step 0.",
      code: "dp[2] = 20 + Math.min(10, 15); // 30"
    },
    {
      array: [10, 15, 30, 25, 0],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [3],
      secondary: [1, 2],
      variables: { "dp[3]": 25, "cost[3]": 10, "min(dp[1],dp[2])": "min(15,30)=15" },
      explanation: "dp[3] = cost[3] + min(dp[1], dp[2]) = 10 + min(15, 30) = 10 + 15 = 25. Cheaper to come from step 1.",
      code: "dp[3] = 10 + Math.min(15, 30); // 25"
    },
    {
      array: [10, 15, 30, 25, 50],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [4],
      secondary: [2, 3],
      variables: { "dp[4]": 50, "cost[4]": 25, "min(dp[2],dp[3])": "min(30,25)=25" },
      explanation: "dp[4] = cost[4] + min(dp[2], dp[3]) = 25 + min(30, 25) = 25 + 25 = 50.",
      code: "dp[4] = 25 + Math.min(30, 25); // 50"
    },
    {
      array: [10, 15, 30, 25, 50],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]" },
      highlights: [3],
      variables: { "min(dp[3],dp[4])": "min(25,50)=25", answer: 25, path: "step 1 (15) → step 3 (10) → top" },
      explanation: "Answer = min(dp[n-2], dp[n-1]) = min(25, 50) = 25. Optimal: start at step 1 (cost 15), jump to step 3 (cost 10), then reach the top. Total = 25.",
      code: "return Math.min(dp[n-2], dp[n-1]); // 25"
    }
  ]}
/>

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "how many ways to reach step/target" | Linear DP (`dp[i] = dp[i-1] + dp[i-2]`) | Each position reachable from a fixed set of previous positions |
| "maximum value, cannot pick adjacent" | Take/skip DP (`dp[i] = max(dp[i-1], dp[i-2] + val)`) | Binary decision at each element with non-adjacency constraint |
| "minimum coins/steps to reach amount" | Unbounded knapsack DP (iterate coins, forward) | Each denomination usable unlimited times; min over all coin choices |
| "maximum contiguous subarray sum" | Kadane's algorithm (`cur = max(nums[i], cur + nums[i])`) | Extend current subarray or restart; O(n) single pass |
| "longest increasing subsequence" | 1D DP O(n^2) or patience sort O(n log n) | Each element extends the best subsequence ending before it |
| "can string be segmented into dictionary words" | DP with set lookup (`dp[i] = any dp[j] and word match`) | Try every split point; cache whether prefix is breakable |
| "partition into equal-sum subsets" | 0/1 knapsack DP (iterate items, capacity in reverse) | Each element used at most once; target is half the total sum |
| "number of unique paths in grid" | 2D DP (`dp[i][j] = dp[i-1][j] + dp[i][j-1]`) | Each cell reachable from above or left; count paths |
| "longest palindromic substring" | Expand-around-center or 2D interval DP | Expand from each center in O(n^2); DP checks all substrings |
| "maximum product subarray" | Modified Kadane (track both min and max) | Negative times negative flips sign; must track both extremes |

<AlgoViz
  title="Maximum Subarray — Kadane's Algorithm"
  description="nums = [-2, 1, -3, 4, -1, 2, 1]. At each element: extend the current subarray or restart. Track cur_sum and max_sum."
  steps={[
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      labels: { 0: "i=0", 1: "i=1", 2: "i=2", 3: "i=3", 4: "i=4", 5: "i=5", 6: "i=6" },
      highlights: [0],
      variables: { cur_sum: -2, max_sum: -2, decision: "start" },
      explanation: "i=0: Initialize cur_sum = nums[0] = -2, max_sum = -2. Only one element so far.",
      code: "cur_sum = nums[0]; max_sum = nums[0];"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [1],
      secondary: [0],
      variables: { cur_sum: 1, max_sum: 1, extend: "-2+1=-1", restart: 1, decision: "restart (1 > -1)" },
      explanation: "i=1: extend = -2 + 1 = -1, restart = 1. Restart wins — better to start fresh at 1. cur_sum = 1, max_sum = 1.",
      code: "cur_sum = Math.max(1, -2 + 1); // 1 (restart)"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [2],
      secondary: [1],
      variables: { cur_sum: -2, max_sum: 1, extend: "1+(-3)=-2", restart: -3, decision: "extend (-2 > -3)" },
      explanation: "i=2: extend = 1 + (-3) = -2, restart = -3. Extend wins (-2 is less bad than -3). cur_sum = -2. max_sum stays 1.",
      code: "cur_sum = Math.max(-3, 1 + (-3)); // -2 (extend)"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [3],
      secondary: [2],
      variables: { cur_sum: 4, max_sum: 4, extend: "-2+4=2", restart: 4, decision: "restart (4 > 2)" },
      explanation: "i=3: extend = -2 + 4 = 2, restart = 4. Restart wins — new subarray starts at index 3. cur_sum = 4, max_sum = 4.",
      code: "cur_sum = Math.max(4, -2 + 4); // 4 (restart)"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [4],
      secondary: [3],
      variables: { cur_sum: 3, max_sum: 4, extend: "4+(-1)=3", restart: -1, decision: "extend (3 > -1)" },
      explanation: "i=4: extend = 4 + (-1) = 3, restart = -1. Extend wins. cur_sum = 3. max_sum stays 4.",
      code: "cur_sum = Math.max(-1, 4 + (-1)); // 3 (extend)"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [5],
      secondary: [3, 4],
      variables: { cur_sum: 5, max_sum: 5, extend: "3+2=5", restart: 2, decision: "extend (5 > 2)" },
      explanation: "i=5: extend = 3 + 2 = 5, restart = 2. Extend wins. cur_sum = 5, max_sum = 5. Subarray [4, -1, 2].",
      code: "cur_sum = Math.max(2, 3 + 2); // 5 (extend)"
    },
    {
      array: [-2, 1, -3, 4, -1, 2, 1],
      highlights: [3, 4, 5, 6],
      variables: { cur_sum: 6, max_sum: 6, extend: "5+1=6", restart: 1, answer: 6, subarray: "[4, -1, 2, 1]" },
      explanation: "i=6: extend = 5 + 1 = 6, restart = 1. Extend wins. cur_sum = 6, max_sum = 6. Answer: 6, from subarray [4, -1, 2, 1] (indices 3-6).",
      code: "return max_sum; // 6"
    }
  ]}
/>

<AlgoViz
  title="Unique Paths — 2D Grid DP"
  description="3x4 grid. dp[i][j] = dp[i-1][j] + dp[i][j-1]. Count paths from top-left to bottom-right moving only right or down."
  steps={[
    {
      array: [1, 1, 1, 1],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights: [0, 1, 2, 3],
      array2: [1, 0, 0, 0],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      variables: { m: 3, n: 4, "row 0": "all 1s", "col 0": "all 1s" },
      explanation: "Row 0 (top): all 1s — only one way to reach each cell (go right). Column 0: all 1s — only one way (go down). Array = row 0, Array2 = row 1 being filled.",
      code: "dp[0][j] = 1; dp[i][0] = 1; // base cases"
    },
    {
      array: [1, 1, 1, 1],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 2, 0, 0],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [1],
      secondary: [1],
      variables: { "dp[1][1]": 2, "dp[0][1]+dp[1][0]": "1+1=2" },
      explanation: "dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2. Two paths: right-then-down, or down-then-right.",
      code: "dp[1][1] = dp[0][1] + dp[1][0]; // 2"
    },
    {
      array: [1, 1, 1, 1],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 2, 3, 0],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [2],
      secondary: [2],
      variables: { "dp[1][2]": 3, "dp[0][2]+dp[1][1]": "1+2=3" },
      explanation: "dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3. Three distinct paths reach this cell.",
      code: "dp[1][2] = dp[0][2] + dp[1][1]; // 3"
    },
    {
      array: [1, 1, 1, 1],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 2, 3, 4],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [3],
      secondary: [3],
      variables: { "dp[1][3]": 4, "dp[0][3]+dp[1][2]": "1+3=4", "row 1": "complete" },
      explanation: "dp[1][3] = dp[0][3] + dp[1][2] = 1 + 3 = 4. Row 1 complete: [1, 2, 3, 4].",
      code: "dp[1][3] = dp[0][3] + dp[1][2]; // 4"
    },
    {
      array: [1, 2, 3, 4],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 3, 0, 0],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [1],
      secondary: [1],
      variables: { row: "2", "dp[2][1]": 3, "dp[1][1]+dp[2][0]": "2+1=3" },
      explanation: "Row 2: prev row is now [1, 2, 3, 4]. dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3.",
      code: "dp[2][1] = dp[1][1] + dp[2][0]; // 3"
    },
    {
      array: [1, 2, 3, 4],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 3, 6, 0],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [2],
      secondary: [2],
      variables: { "dp[2][2]": 6, "dp[1][2]+dp[2][1]": "3+3=6" },
      explanation: "dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6. Six paths reach this cell.",
      code: "dp[2][2] = dp[1][2] + dp[2][1]; // 6"
    },
    {
      array: [1, 2, 3, 4],
      labels: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      array2: [1, 3, 6, 10],
      labels2: { 0: "col 0", 1: "col 1", 2: "col 2", 3: "col 3" },
      highlights2: [3],
      secondary: [3],
      variables: { "dp[2][3]": 10, "dp[1][3]+dp[2][2]": "4+6=10", answer: 10 },
      explanation: "dp[2][3] = dp[1][3] + dp[2][2] = 4 + 6 = 10. Answer: 10 unique paths from top-left to bottom-right in a 3x4 grid.",
      code: "return dp[m-1][n-1]; // dp[2][3] = 10"
    }
  ]}
/>

<AlgoViz
  title="Longest Palindromic Substring — Expand Around Center"
  description="s = babad. For each center, expand outward while s[L] equals s[R]. Track the longest palindrome found."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [],
      variables: { best: "none", bestLen: 0, centers: "9 (5 odd + 4 even)" },
      explanation: "String: b-a-b-a-d. Try each index as center of odd-length palindrome, and each gap as center of even-length. Expand outward while characters match.",
      code: "for each center: expand while s[L] == s[R]"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [0],
      variables: { center: 0, L: 0, R: 0, palindrome: "b", bestLen: 1 },
      explanation: "Center i=0: single char b. Cannot expand left (out of bounds). Palindrome = b, length 1.",
      code: "// center=0: L=0, R=0 -> b (len 1)"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [1],
      secondary: [0, 2],
      pointers: { 0: "L", 2: "R" },
      variables: { center: 1, L: 0, R: 2, "s[0]==s[2]": "b==b YES", palindrome: "bab", bestLen: 3 },
      explanation: "Center i=1: start with a, expand outward. s[0]=b == s[2]=b, match! Palindrome = bab (length 3). L=-1 out of bounds, stop. New best!",
      code: "// center=1: expand L=0,R=2 -> bab (len 3)"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [2],
      secondary: [1, 3],
      pointers: { 1: "L", 3: "R" },
      variables: { center: 2, "s[1]==s[3]": "a==a YES", "s[0]==s[4]": "b!=d NO", palindrome: "aba", bestLen: 3 },
      explanation: "Center i=2: expand. s[1]=a == s[3]=a, match! aba (len 3). Try further: s[0]=b != s[4]=d, stop. Ties with bab, no improvement.",
      code: "// center=2: aba (len 3), s[0]!=s[4] stops expansion"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [1, 2],
      variables: { "even 1-2": "a!=b NO", "even 2-3": "b!=a NO", "even 3-4": "a!=d NO", note: "no even palindromes" },
      explanation: "Even-length centers: check adjacent pairs. s[1]=a != s[2]=b, s[2]=b != s[3]=a, s[3]=a != s[4]=d. No even-length palindromes found.",
      code: "// even centers: all s[L] != s[R], skip"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [3],
      secondary: [2, 4],
      variables: { center: 3, "s[2]==s[4]": "b!=d NO", palindrome: "a", bestLen: 3 },
      explanation: "Center i=3: expand. s[2]=b != s[4]=d, stop immediately. Just a (len 1). Center i=4: just d (len 1). No improvement.",
      code: "// centers 3,4: single chars only, best unchanged"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "b", 1: "a", 2: "b", 3: "a", 4: "d" },
      highlights: [0, 1, 2],
      variables: { answer: "bab", start: 0, length: 3, complexity: "O(n^2) time, O(1) space" },
      explanation: "Longest palindrome = bab (indices 0..2, length 3). Checked all 2n-1 centers with O(n) expansion each. O(n^2) time, O(1) space — no DP table needed.",
      code: "return s.substring(start, start + maxLen); // bab"
    }
  ]}
/>

---

## 5 · Problem Sets

### Day 1–2: Easy-Focused — Building DP Intuition

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 1 | Climbing Stairs ⭐ | Easy | 1D DP | [70](https://leetcode.com/problems/climbing-stairs/) |
| 2 | Min Cost Climbing Stairs | Easy | 1D DP | [746](https://leetcode.com/problems/min-cost-climbing-stairs/) |
| 3 | Fibonacci Number | Easy | 1D DP | [509](https://leetcode.com/problems/fibonacci-number/) |
| 4 | House Robber ⭐ | Medium | 1D DP skip pattern | [198](https://leetcode.com/problems/house-robber/) |
| 5 | Maximum Subarray ⭐ | Medium | Kadane's | [53](https://leetcode.com/problems/maximum-subarray/) |
| 6 | Best Time to Buy and Sell Stock | Easy | Single pass / DP | [121](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) |
| 7 | Counting Bits | Easy | DP + bit | [338](https://leetcode.com/problems/counting-bits/) |

### Day 3–4: Medium-Focused — Classic DP Problems

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 8 | House Robber II ⭐ | Medium | Circular DP | [213](https://leetcode.com/problems/house-robber-ii/) |
| 9 | Coin Change ⭐ | Medium | Unbounded knapsack | [322](https://leetcode.com/problems/coin-change/) |
| 10 | Longest Increasing Subsequence ⭐ | Medium | 1D DP + BS | [300](https://leetcode.com/problems/longest-increasing-subsequence/) |
| 11 | Word Break ⭐ | Medium | DP + set lookup | [139](https://leetcode.com/problems/word-break/) |
| 12 | Decode Ways ⭐ | Medium | 1D DP string | [91](https://leetcode.com/problems/decode-ways/) |
| 13 | Unique Paths ⭐ | Medium | 2D DP (grid) | [62](https://leetcode.com/problems/unique-paths/) |
| 14 | Perfect Squares | Medium | BFS or DP | [279](https://leetcode.com/problems/perfect-squares/) |

### Day 5–7: Medium/Hard — Extending Your Range

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 15 | Longest Palindromic Substring ⭐ | Medium | Expand or DP | [5](https://leetcode.com/problems/longest-palindromic-substring/) |
| 16 | Maximum Product Subarray ⭐ | Medium | Track min/max | [152](https://leetcode.com/problems/maximum-product-subarray/) |
| 17 | Partition Equal Subset Sum ⭐ | Medium | 0/1 knapsack | [416](https://leetcode.com/problems/partition-equal-subset-sum/) |
| 18 | Triangle | Medium | Bottom-up DP | [120](https://leetcode.com/problems/triangle/) |
| 19 | Combination Sum IV | Medium | DP permutation | [377](https://leetcode.com/problems/combination-sum-iv/) |
| 20 | Jump Game | Medium | Greedy / DP | [55](https://leetcode.com/problems/jump-game/) |
| 21 | Palindrome Partitioning | Medium | DFS + DP | [131](https://leetcode.com/problems/palindrome-partitioning/) |

---

## 6 · Mock Interviews

### Mock 1 — House Robber Variant (35 min)

**Interviewer:** "You're a robber planning to rob houses along a street. Each house has a certain amount of money. If you rob two adjacent houses, the alarm triggers. Find the maximum money you can rob."

**Candidate talk-track:**

1. "This is a classic take-or-skip DP. At each house I decide: rob it (and add the value to the best I could do skipping the previous house) or skip it (carry forward the best so far)."
2. "State: `dp[i]` = maximum money robbing from houses 0..i."
3. "Recurrence: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`."
4. "Base cases: `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`."
5. Code the O(n) solution, then optimise to O(1) space with two variables.

```java
public static int rob(int[] nums) {
    if (nums.length == 0) return 0;
    if (nums.length == 1) return nums[0];
    int prev2 = nums[0], prev1 = Math.max(nums[0], nums[1]);
    for (int i = 2; i < nums.length; i++) {
        int tmp = prev1;
        prev1 = Math.max(prev1, prev2 + nums[i]);
        prev2 = tmp;
    }
    return prev1;
}
```

**Follow-ups:**

- **"What if the houses are arranged in a circle?"**
  "If I rob house 0, I can't rob house n-1 and vice versa. I run House Robber twice — once on houses 0..n-2, once on houses 1..n-1 — and take the max. This is LC 213 House Robber II."

- **"What if you can rob up to k houses apart instead of just 2?"**
  "The recurrence becomes `dp[i] = max(dp[i-1], dp[i-2] + nums[i], dp[i-3] + nums[i], ..., dp[i-k] + nums[i])`. Naive is O(nk), but I can use a sliding window maximum to reduce it to O(n)."

- **"What if each house also has a time cost to rob, and you have a total time budget?"**
  "Now it's a 0/1 knapsack with two dimensions — value (money) and weight (time). State becomes `dp[i][t]` = max money using first i houses with time budget t."

- **"Can you reconstruct which houses you actually robbed?"**
  "Yes. I keep the full dp array and backtrack: at each i, if `dp[i] != dp[i-1]`, house i was robbed, so I jump to i-2; otherwise I move to i-1. This recovers the exact set."

### Mock 2 — Coin Change (35 min)

**Interviewer:** "Given coins of different denominations and a total amount, find the fewest coins needed to make that amount. If impossible, return -1."

**Candidate talk-track:**

1. "This is unbounded knapsack — each coin can be used unlimited times."
2. "State: `dp[a]` = minimum coins to make amount `a`."
3. "Recurrence: for each coin `c`, if `a - c >= 0`, then `dp[a] = min(dp[a], dp[a - c] + 1)`."
4. "Base case: `dp[0] = 0` (zero coins for amount zero). Initialise everything else to infinity."
5. "If `dp[amount]` is still infinity, return -1."

```java
public static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (a - c >= 0 && dp[a - c] != Integer.MAX_VALUE && dp[a - c] + 1 < dp[a]) {
                dp[a] = dp[a - c] + 1;
            }
        }
    }
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}
```

<AlgoViz
  title="Coin Change DP — Minimum Coins for Amount"
  description="coins = [1, 3, 4], amount = 6. dp[a] = min coins to make amount a. Try each coin at each amount."
  steps={[
    {
      array: [0, 999, 999, 999, 999, 999, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [0],
      variables: { coins: "[1, 3, 4]", amount: 6 },
      explanation: "Base case: dp[0] = 0 (zero coins for amount 0). All others initialized to INF (not yet achievable).",
      code: "dp[0] = 0; Arrays.fill(dp, Integer.MAX_VALUE);"
    },
    {
      array: [0, 1, 999, 999, 999, 999, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [1],
      secondary: [0],
      variables: { a: 1, bestCoin: 1, "dp[1-1]+1": "0+1=1" },
      explanation: "dp[1]: try coin 1 → dp[0]+1 = 1. Coins 3, 4 too large. dp[1] = 1.",
      code: "dp[1] = Math.min(dp[1], dp[1-1] + 1); // 1"
    },
    {
      array: [0, 1, 2, 999, 999, 999, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [2],
      secondary: [1],
      variables: { a: 2, bestCoin: 1, "dp[2-1]+1": "1+1=2" },
      explanation: "dp[2]: try coin 1 → dp[1]+1 = 2. Coins 3, 4 too large. dp[2] = 2 (two 1-coins).",
      code: "dp[2] = Math.min(dp[2], dp[2-1] + 1); // 2"
    },
    {
      array: [0, 1, 2, 1, 999, 999, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [3],
      secondary: [0, 2],
      variables: { a: 3, coin1: "dp[2]+1=3", coin3: "dp[0]+1=1", best: 1 },
      explanation: "dp[3]: coin 1 → dp[2]+1=3. coin 3 → dp[0]+1=1. dp[3] = min(3, 1) = 1 (one 3-coin!).",
      code: "dp[3] = Math.min(dp[2]+1, dp[0]+1); // 1"
    },
    {
      array: [0, 1, 2, 1, 1, 999, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [4],
      secondary: [0, 1, 3],
      variables: { a: 4, coin1: "dp[3]+1=2", coin3: "dp[1]+1=2", coin4: "dp[0]+1=1", best: 1 },
      explanation: "dp[4]: coin 1→2, coin 3→2, coin 4→dp[0]+1=1. dp[4] = 1 (one 4-coin!).",
      code: "dp[4] = Math.min(2, Math.min(2, 1)); // 1"
    },
    {
      array: [0, 1, 2, 1, 1, 2, 999],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [5],
      secondary: [1, 2, 4],
      variables: { a: 5, coin1: "dp[4]+1=2", coin3: "dp[2]+1=3", coin4: "dp[1]+1=2", best: 2 },
      explanation: "dp[5]: coin 1→2, coin 3→3, coin 4→2. dp[5] = 2 (e.g., coins 1+4 or 4+1).",
      code: "dp[5] = Math.min(2, Math.min(3, 2)); // 2"
    },
    {
      array: [0, 1, 2, 1, 1, 2, 2],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]", 4: "dp[4]", 5: "dp[5]", 6: "dp[6]" },
      highlights: [6],
      secondary: [2, 3, 5],
      variables: { a: 6, coin1: "dp[5]+1=3", coin3: "dp[3]+1=2", coin4: "dp[2]+1=3", answer: 2 },
      explanation: "dp[6]: coin 1→3, coin 3→dp[3]+1=2, coin 4→3. dp[6] = 2 (two 3-coins: 3+3). Answer: 2 coins.",
      code: "return dp[amount]; // dp[6] = 2"
    }
  ]}
/>

**Follow-ups:**

- **"What if you want the number of ways to make the amount instead of minimum coins?"**
  "Change the recurrence to `dp[a] += dp[a - c]`. Base case `dp[0] = 1`. Same structure, different aggregation — this is LC 518 Coin Change 2."

- **"What if each coin can only be used once?"**
  "Now it's a 0/1 knapsack. I'd either add a second dimension for coin index, or iterate coins in the outer loop and amounts in reverse (right to left) to avoid reusing a coin."

- **"What if there's a limit of at most k coins total?"**
  "Add a dimension: `dp[a][j]` = whether we can make amount a using exactly j coins. Or, since we want minimum, just check if `dp[amount] <= k`."

- **"Can you reconstruct which coins were used?"**
  "Maintain a `parent[a]` array storing which coin was used to reach amount a. Then trace back from `amount` to 0, collecting coins along the way."

---

## 7 · Tips and Edge Cases

**Recognising DP problems:**
- The problem asks for count of ways, minimum/maximum value, or whether something is possible.
- Brute-force would enumerate an exponential number of combinations.
- Choices at each step affect future options.
- The problem has a natural recursive structure where subproblems repeat.

**Top-down vs bottom-up decision:**
- Default to top-down (memoization) during interviews — it's faster to write and less error-prone.
- Switch to bottom-up when: input size risks StackOverflowError with deep recursion, the interviewer asks for space optimisation, or you need to eliminate recursion overhead.

**Common bugs:**
- Off-by-one errors in table size: if your state goes from 0 to n, allocate `n + 1` entries.
- Wrong iteration order in bottom-up: you must fill smaller subproblems before larger ones.
- Forgetting base cases: every recursive path must terminate.
- Using `dp[i-2]` when `i < 2`: always guard index bounds or handle small inputs separately.

**Space optimisation checklist:**
- Does `dp[i]` depend only on `dp[i-1]`? Use one variable.
- Does `dp[i]` depend on `dp[i-1]` and `dp[i-2]`? Use two variables.
- Does `dp[i]` depend on the entire previous row (2D)? Keep two rows.
- Does `dp[i]` depend on `dp[j]` for arbitrary `j < i`? No space optimisation possible — keep the full array.

**Kadane's algorithm nuances:**
- Track `current_max = max(nums[i], current_max + nums[i])` — either extend the subarray or start fresh.
- For Maximum Product Subarray (LC 152), track both `current_max` and `current_min` because a negative times a negative flips the sign.
- Kadane's doesn't work for the "non-empty subarray" constraint if all numbers are negative — make sure your initialisation handles this (start with `nums[0]`, not `0`).

**Knapsack variants:**
- 0/1 knapsack (each item used at most once): iterate items outer, capacity inner in **reverse**.
- Unbounded knapsack (unlimited use): iterate capacity inner in **forward** order.
- Confusing these two iteration orders is the most common knapsack bug.

**String DP pitfalls:**
- Decode Ways (LC 91): watch for '0' — it can't be decoded alone, and "30", "40", etc. are invalid two-digit codes.
- Word Break (LC 139): use a HashSet for O(1) word lookup. The DP checks all possible last-word splits: for each `j` from `0` to `i`, `dp[i] = dp[j] &amp;&amp; wordSet.contains(s.substring(j, i))`.

**When stuck:**
- Write the brute-force recursive solution first. Identify repeated subproblems. Add memoization. You now have a DP solution.
- If the state feels too complex, try redefining it. Ask: "what's the minimum information I need to make the next decision?"
- Draw the recursion tree for a small input — overlapping subproblems become visually obvious.
