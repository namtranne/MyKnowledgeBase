---
sidebar_position: 18
title: "Week 17: Advanced DP"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 17: Advanced DP

By now you've solved classic 1D and 2D DP problems. This week we tackle the patterns that appear most often in interviews and contests: **knapsack variants**, **state-machine DP**, **tree DP**, and **interval DP**. Mastering these gives you a toolkit that covers roughly 80 percent of all DP problems you'll encounter.

---

## 1 — Knapsack Patterns

**Why knapsack is the master pattern.** A surprising number of interview problems are knapsack problems in disguise. Whenever you must select from a collection of items under a budget constraint (weight, count, capacity, target sum), you are likely facing a knapsack variant. Recognising this lets you immediately reach for a well-understood template rather than deriving a recurrence from scratch.

**Intuition.** Imagine packing a suitcase for a trip. Each item has a weight and a value (how much you want it). Your suitcase has a weight limit. For each item you face a binary choice: pack it or leave it. The 0/1 knapsack finds the combination that maximises total value without exceeding the weight limit. The "unbounded" variant is like a shop where you can buy unlimited copies of each item.

**Interview signals.** "Partition into two equal subsets" (target = sum/2). "Count ways to assign + and - to reach a target" (Target Sum). "Minimise the difference between two groups" (Last Stone Weight II). "Select strings within a 0-count and 1-count budget" (Ones and Zeroes). All of these reduce to knapsack.

### 1.1 The 0/1 Knapsack

You have `n` items, each with a weight `w[i]` and value `v[i]`, and a knapsack of capacity `W`. Each item can be taken **at most once**. Maximize total value.

**Recurrence**

```
dp[i][c] = max(dp[i-1][c], dp[i-1][c - w[i]] + v[i])   if c >= w[i]
         = dp[i-1][c]                                     otherwise
```

Because each row only depends on the previous row, we can compress to a **1D array** by iterating capacity **right-to-left**:

```java
public static int knapsack01(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++) {
        for (int c = capacity; c >= weights[i]; c--) {
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

<AlgoViz
  title="0/1 Knapsack"
  description="Items: weights [2,3,4,5], values [3,4,5,6], capacity=8. Fill the 1D DP array right-to-left for each item. dp[c] = max value achievable with capacity c."
  steps={[
    { array: [0, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [], variables: { items: "w=[2,3,4,5] v=[3,4,5,6]", capacity: 8 }, explanation: "Initialize dp[0..8] = 0. We process each item and update reachable capacities right-to-left.", code: "int[] dp = new int[capacity + 1];" },
    { array: [0, 0, 3, 3, 3, 3, 3, 3, 3], highlights: [2, 3, 4, 5, 6, 7, 8], variables: { item: "w=2, v=3", scan: "c=8 down to 2" }, explanation: "Item 0 (w=2, v=3): For c=8..2, dp[c] = max(dp[c], dp[c-2]+3). All capacities from 2 onward become 3.", code: "dp[c] = Math.max(dp[c], dp[c-2] + 3);" },
    { array: [0, 0, 3, 4, 4, 7, 7, 7, 7], highlights: [3, 4, 5, 6, 7, 8], variables: { item: "w=3, v=4", scan: "c=8 down to 3" }, explanation: "Item 1 (w=3, v=4): dp[3]=max(3,0+4)=4. dp[5]=max(3,3+4)=7. Both items fit at capacity 5.", code: "dp[c] = Math.max(dp[c], dp[c-3] + 4);" },
    { array: [0, 0, 3, 4, 5, 7, 8, 9, 9], highlights: [4, 6, 7, 8], variables: { item: "w=4, v=5", scan: "c=8 down to 4" }, explanation: "Item 2 (w=4, v=5): dp[4]=5, dp[6]=max(7,3+5)=8, dp[7]=max(7,4+5)=9. Three-item combos explored.", code: "dp[c] = Math.max(dp[c], dp[c-4] + 5);" },
    { array: [0, 0, 3, 4, 5, 7, 8, 9, 10], highlights: [8], secondary: [5, 7], variables: { item: "w=5, v=6", scan: "c=8 down to 5", result: 10 }, explanation: "Item 3 (w=5, v=6): dp[8]=max(9,dp[3]+6)=max(9,10)=10. Optimal: items w=3,w=5 (values 4+6=10). Answer: 10.", code: "dp[8] = Math.max(9, dp[3] + 6); // 10" },
  ]}
/>

**When to recognize it:** "Pick or skip each item exactly once; maximize/minimize something under a budget."

Common problems that reduce to 0/1 knapsack:
- **Partition Equal Subset Sum** — target = total_sum // 2, values = weights = nums.
- **Target Sum** — shift: count subsets that sum to `(total + target) // 2`.
- **Last Stone Weight II** — minimize `total - 2 * best_subset_sum`.
- **Ones and Zeroes** — 2D knapsack with two budgets (zeros count, ones count).

### 1.2 Unbounded Knapsack

Each item can be used **unlimited times**. The only change: iterate capacity **left-to-right**.

```java
public static int knapsackUnbounded(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++) {
        for (int c = weights[i]; c <= capacity; c++) {
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}
```

Classic reductions:
- **Coin Change** — minimize coins (set initial dp to infinity, dp[0] = 0).
- **Coin Change II** — count combinations (dp[0] = 1, accumulate counts).
- **Perfect Squares** — coins are 1, 4, 9, 16, ...
- **Integer Break** — maximize product; pieces are 1..n, each usable unlimited times.

### 1.3 Bounded Knapsack (Binary Lifting)

Each item has a limited count `k[i]`. Decompose `k[i]` into powers of 2 (1, 2, 4, ..., remainder) and treat each group as a 0/1 item. This reduces `O(n * W * max_k)` to `O(n * W * log(max_k))`.

---

## 2 — State-Machine DP (Buy & Sell Stock Variants)

**Why state-machine DP exists.** Standard DP has one state per position (e.g., `dp[i]` = best answer using the first i elements). But some problems have **multiple modes** at each position — you might be holding a stock, have just sold one, or be resting. A single `dp[i]` cannot capture all these modes. State-machine DP extends the framework by maintaining one value per mode per position, with explicit transitions between modes. This elegantly handles cooldowns, transaction fees, and limited transaction counts.

**Intuition.** Think of a traffic light. At any moment the light is in one of three states: green, yellow, red. Each state has specific rules about which state comes next and what actions are allowed. State-machine DP works the same way: define the states your problem can be in, the transitions between them, and compute the best outcome in each state at each step.

**Interview signals.** "Buy and sell stock with cooldown." "Buy and sell with transaction fee." "At most K transactions." Any problem where the optimal action at step i depends not just on what happened before, but on what *mode* you are currently in.

**Common mistakes.** Forgetting to track the previous state before overwriting (e.g., using `sold` before computing the new `rest` when `rest` depends on the old `sold`). Not initialising `hold` to negative infinity (you cannot sell before buying). Confusing "at most K transactions" with "exactly K transactions."

Many DP problems have **multiple states** at each step. Model them as a finite state machine where transitions correspond to actions.

### 2.1 General Framework

Define states at day `i`:

| State | Meaning |
|-------|---------|
| `hold` | Currently holding a share |
| `sold` | Just sold (in cooldown or collecting fee) |
| `rest` | Not holding, free to buy |

**Transitions** (example: cooldown + fee variant):

```
hold[i] = max(hold[i-1], rest[i-1] - price[i])
sold[i] = hold[i-1] + price[i] - fee
rest[i] = max(rest[i-1], sold[i-1])       # cooldown: use sold[i-1] not sold[i]
```

Since each state only depends on the previous day, we need only O(1) space.

### 2.2 Template — Buy & Sell with Cooldown

```java
public static int maxProfitCooldown(int[] prices) {
    int hold = Integer.MIN_VALUE, sold = 0, rest = 0;
    for (int p : prices) {
        int prevHold = hold;
        hold = Math.max(hold, rest - p);
        rest = Math.max(rest, sold);
        sold = prevHold + p;
    }
    return Math.max(sold, rest);
}
```

<AlgoViz
  title="Buy & Sell Stock with Cooldown — State Machine DP"
  description="prices=[1,2,3,0,2]. Three states: hold (own share), sold (just sold, cooldown next), rest (free to buy). Track transitions each day."
  steps={[
    {
      array: [1, 2, 3, 0, 2],
      labels: { 0: "day 0", 1: "day 1", 2: "day 2", 3: "day 3", 4: "day 4" },
      highlights: [],
      variables: { hold: "-INF", sold: 0, rest: 0 },
      explanation: "Init: hold=-INF (cannot sell without buying), sold=0, rest=0. Three states model the cooldown constraint between sell and next buy.",
      code: "int hold = MIN_VALUE, sold = 0, rest = 0;"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [0],
      variables: { hold: -1, sold: "-INF", rest: 0, price: 1 },
      explanation: "Day 0 (price=1): hold=max(-INF, 0-1)=-1 (buy at 1). rest=max(0,0)=0. sold=-INF+1=-INF (never held, can't sell).",
      code: "hold = Math.max(-INF, rest - 1); // buy at 1"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [1],
      variables: { hold: -1, sold: 1, rest: 0, price: 2 },
      explanation: "Day 1 (price=2): hold=max(-1, 0-2)=-1 (keep holding). sold=-1+2=1 (sell for profit). rest=max(0,-INF)=0.",
      code: "sold = prevHold + 2; // sell: profit = 2 - 1 = 1"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [2],
      variables: { hold: -1, sold: 2, rest: 1, price: 3 },
      explanation: "Day 2 (price=3): hold=max(-1, 0-3)=-1 (don't rebuy). rest=max(0,1)=1 (cooldown from sell). sold=-1+3=2.",
      code: "rest = Math.max(0, sold_prev); // cooldown"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [3],
      variables: { hold: 1, sold: -1, rest: 2, price: 0 },
      explanation: "Day 3 (price=0): hold=max(-1, 1-0)=1 (buy at bargain price 0 after resting). rest=max(1,2)=2. sold=-1+0=-1.",
      code: "hold = Math.max(-1, rest - 0); // buy at 0"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [4],
      variables: { hold: 1, sold: 3, rest: 2, price: 2 },
      explanation: "Day 4 (price=2): sold=1+2=3 (sell share bought at 0 for +2). hold=max(1,2-2)=1. rest=max(2,-1)=2.",
      code: "sold = prevHold + 2; // sell for total profit 3"
    },
    {
      array: [1, 2, 3, 0, 2],
      highlights: [0, 1, 2, 3, 4],
      variables: { result: 3, strategy: "buy@1 sell@2, cooldown, buy@0 sell@2", profit: "1 + 2 = 3" },
      explanation: "Result: max(sold=3, rest=2) = 3. Buy day 0 sell day 1 (+1), cooldown day 2, buy day 3 sell day 4 (+2). Total profit = 3.",
      code: "return Math.max(sold, rest); // 3"
    }
  ]}
/>

### 2.3 Template — Buy & Sell with Transaction Fee

```java
public static int maxProfitFee(int[] prices, int fee) {
    int hold = Integer.MIN_VALUE, cash = 0;
    for (int p : prices) {
        hold = Math.max(hold, cash - p);
        cash = Math.max(cash, hold + p - fee);
    }
    return cash;
}
```

### 2.4 At Most k Transactions

Add a transaction dimension:

```java
public static int maxProfitK(int[] prices, int k) {
    if (k >= prices.length / 2) {
        int profit = 0;
        for (int i = 0; i < prices.length - 1; i++)
            profit += Math.max(0, prices[i + 1] - prices[i]);
        return profit;
    }
    int[] buy = new int[k + 1], sell = new int[k + 1];
    Arrays.fill(buy, Integer.MIN_VALUE);
    for (int p : prices) {
        for (int j = 1; j <= k; j++) {
            buy[j] = Math.max(buy[j], sell[j - 1] - p);
            sell[j] = Math.max(sell[j], buy[j] + p);
        }
    }
    return sell[k];
}
```

---

<AlgoViz
  title="Longest Common Subsequence"
  description="Find the LCS of 'AGGTAB' and 'GXTXAYB'. Build a 2D DP table row by row. If chars match, dp[i][j] = dp[i-1][j-1]+1; else max of left/above. LCS = 'GTAB', length = 4."
  steps={[
    { array: [0, 0, 0, 0, 0, 0, 0, 0], highlights: [], variables: { s1: "AGGTAB", s2: "GXTXAYB", row: "init" }, explanation: "Initialize dp row 0 to all zeros. Columns represent chars of s2: _, G, X, T, X, A, Y, B.", code: "int[][] dp = new int[m+1][n+1];" },
    { array: [0, 0, 0, 0, 0, 1, 1, 1], highlights: [5], variables: { row: "i=1 (A)", match: "A==A at j=5" }, explanation: "Row 1 (A): A matches s2[5]='A'. dp[1][5]=1. Propagates right: dp[1][6..7]=1.", code: "dp[1][5] = dp[0][4] + 1; // 'A' matches" },
    { array: [0, 1, 1, 1, 1, 1, 1, 1], highlights: [1], variables: { row: "i=2 (G)", match: "G==G at j=1" }, explanation: "Row 2 (G): G matches s2[1]='G'. dp[2][1]=1. Rest carries forward as max(above, left).", code: "dp[2][1] = dp[1][0] + 1; // 'G' matches" },
    { array: [0, 1, 1, 1, 1, 1, 1, 1], highlights: [1], variables: { row: "i=3 (G)", note: "G matches again but no improvement" }, explanation: "Row 3 (second G): G matches s2[1]='G' again, but dp already 1 there. No length increase in this row.", code: "dp[3][1] = max(dp[2][1], dp[2][0]+1) = 1" },
    { array: [0, 1, 1, 2, 2, 2, 2, 2], highlights: [3], variables: { row: "i=4 (T)", match: "T==T at j=3", lcs_so_far: "GT" }, explanation: "Row 4 (T): T matches s2[3]='T'. dp[4][3] = dp[3][2]+1 = 2. LCS so far: 'GT'.", code: "dp[4][3] = dp[3][2] + 1; // 'GT'" },
    { array: [0, 1, 1, 2, 2, 3, 3, 3], highlights: [5], variables: { row: "i=5 (A)", match: "A==A at j=5", lcs_so_far: "GTA" }, explanation: "Row 5 (A): A matches s2[5]='A'. dp[5][5] = dp[4][4]+1 = 3. LCS so far: 'GTA'.", code: "dp[5][5] = dp[4][4] + 1; // 'GTA'" },
    { array: [0, 1, 1, 2, 2, 3, 3, 4], highlights: [7], variables: { row: "i=6 (B)", match: "B==B at j=7", result: 4, lcs: "GTAB" }, explanation: "Row 6 (B): B matches s2[7]='B'. dp[6][7] = dp[5][6]+1 = 4. Final LCS = 'GTAB', length = 4.", code: "dp[6][7] = dp[5][6] + 1; // 'GTAB'" },
  ]}
/>

<AlgoViz
  title="Edit Distance"
  description="Transform 'horse' into 'ros'. Build a DP table where dp[i][j] = min operations to convert horse[0..i-1] to ros[0..j-1]. Operations: insert, delete, replace. Result = 3."
  steps={[
    { array: [0, 1, 2, 3], highlights: [], variables: { source: "horse", target: "ros", row: "init" }, explanation: "Initialize row 0: converting empty string to 'r','ro','ros' costs 1,2,3 inserts. Columns: _, r, o, s.", code: "dp[0][j] = j; // insert j characters" },
    { array: [1, 1, 2, 3], highlights: [0, 1], variables: { row: "i=1 (h)", ops: "h!=r: replace" }, explanation: "Row 1 (h): dp[1][0]=1 (delete h). dp[1][1]=min(2,2,0+1)=1: replace h with r. Cost stays 1.", code: "dp[1][1] = dp[0][0] + 1; // replace 'h'->'r'" },
    { array: [2, 2, 1, 2], highlights: [2], variables: { row: "i=2 (o)", ops: "o==o: match!" }, explanation: "Row 2 (o): dp[2][2]=dp[1][1]=1, o matches o — no cost. Best so far: 'ho' to 'ro' costs 1 (replace h).", code: "dp[2][2] = dp[1][1]; // 'o'=='o', free" },
    { array: [3, 2, 2, 2], highlights: [3], variables: { row: "i=3 (r)", ops: "r==r at j=1" }, explanation: "Row 3 (r): dp[3][1]=dp[2][0]+0... actually r==r gives dp[3][1]=2. dp[3][3]=2: 'hor' to 'ros' costs 2.", code: "dp[3][1] = dp[2][0]; // 'r'=='r'" },
    { array: [4, 3, 3, 3], highlights: [1, 2, 3], variables: { row: "i=4 (s)", ops: "s==s at j=3" }, explanation: "Row 4 (s): s matches s at j=3. dp[4][3]=dp[3][2]+0=... but dp[3][2]=2, so dp[4][3]=min options=3.", code: "dp[4][3] = min(dp[3][2]+1, dp[4][2]+1, dp[3][3]+1)" },
    { array: [5, 4, 4, 3], highlights: [3], variables: { row: "i=5 (e)", result: 3, ops: "delete h, replace r, delete e" }, explanation: "Row 5 (e): dp[5][3]=3. Answer: 3 operations. One solution: replace h with r, delete r, delete e.", code: "return dp[5][3]; // 3" },
  ]}
/>

## 3 — Tree DP

Tree DP computes answers **bottom-up** via post-order traversal. Each node's state depends on its children.

### 3.1 Pattern

```java
public static int[] treeDp(TreeNode node) {
    if (node == null) return new int[]{0, 0}; // {include, exclude}
    int[] left = treeDp(node.left);
    int[] right = treeDp(node.right);
    int includeNode = node.val + left[1] + right[1];
    int excludeNode = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
    return new int[]{includeNode, excludeNode};
}
```

### 3.2 House Robber III

Cannot rob two directly-linked (parent-child) houses.

```java
public static int rob(TreeNode root) {
    int[] result = dfs(root);
    return Math.max(result[0], result[1]);
}

private static int[] dfs(TreeNode node) {
    if (node == null) return new int[]{0, 0}; // {robThis, skipThis}
    int[] left = dfs(node.left);
    int[] right = dfs(node.right);
    int robThis = node.val + left[1] + right[1];
    int skipThis = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
    return new int[]{robThis, skipThis};
}
```

### 3.3 Other Tree DP Examples

- **Binary Tree Maximum Path Sum** — track max single-branch vs. max overall.
- **Diameter of Binary Tree** — track depth, update global diameter.
- **Unique BSTs (Catalan)** — `dp[n] = sum(dp[i-1] * dp[n-i] for i in 1..n)`.

---

## 4 — Interval DP

Interval DP solves problems where the answer for a range `[i, j]` depends on splitting it into subranges.

### 4.1 Template

```java
public static int intervalDp(int[] arr) {
    int n = arr.length;
    int[][] dp = new int[n][n];
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = Integer.MAX_VALUE;
            for (int k = i; k < j; k++) {
                dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + cost(i, j, k));
            }
        }
    }
    return dp[0][n - 1];
}
```

### 4.2 Matrix Chain Multiplication

Given dimensions array `dims` where matrix `i` has dimensions `dims[i] × dims[i+1]`, find the minimum number of scalar multiplications needed to compute the product of all matrices.

```java
public static int matrixChainOrder(int[] dims) {
    int n = dims.length - 1;
    int[][] dp = new int[n][n];
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = Integer.MAX_VALUE;
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                dp[i][j] = Math.min(dp[i][j], cost);
            }
        }
    }
    return dp[0][n - 1];
}
```

<AlgoViz
  title="Matrix Chain Multiplication — Interval DP"
  description="Dims=[10,30,5,60]. 3 matrices: A1(10×30), A2(30×5), A3(5×60). Find optimal parenthesization minimizing scalar multiplications."
  steps={[
    {
      array: [10, 30, 5, 60],
      labels: { 0: "d[0]", 1: "d[1]", 2: "d[2]", 3: "d[3]" },
      highlights: [],
      variables: { matrices: "A1(10×30) A2(30×5) A3(5×60)", "dp[i][i]": "all 0" },
      explanation: "Dimensions define 3 matrices. dp[i][j] = min scalar multiplications for matrices i..j. Base case: dp[i][i] = 0 (single matrix, no work).",
      code: "int[][] dp = new int[n][n]; // base: dp[i][i] = 0"
    },
    {
      array: [10, 30, 5, 60],
      highlights: [0, 1, 2],
      variables: { len: 2, "dp[0][1]": "10×30×5 = 1500", split: "k=0 only" },
      explanation: "Length 2: dp[0][1] = cost of A1×A2. Only one split point (k=0). Cost = dims[0]×dims[1]×dims[2] = 10×30×5 = 1500.",
      code: "dp[0][1] = 10 * 30 * 5; // 1500"
    },
    {
      array: [10, 30, 5, 60],
      highlights: [1, 2, 3],
      variables: { len: 2, "dp[1][2]": "30×5×60 = 9000", split: "k=1 only" },
      explanation: "dp[1][2] = cost of A2×A3. Only one split (k=1). Cost = 30×5×60 = 9000.",
      code: "dp[1][2] = 30 * 5 * 60; // 9000"
    },
    {
      array: [10, 30, 5, 60],
      highlights: [0, 1, 2, 3],
      variables: { len: 3, "k=0": "(A1)×(A2·A3) = 0+9000+18000 = 27000", "k=1": "(A1·A2)×(A3) = 1500+0+3000 = 4500" },
      explanation: "Length 3: dp[0][2]. Try k=0: dp[0][0]+dp[1][2]+10×30×60 = 0+9000+18000 = 27000. Try k=1: dp[0][1]+dp[2][2]+10×5×60 = 1500+0+3000 = 4500.",
      code: "dp[0][2] = Math.min(27000, 4500); // try each split"
    },
    {
      array: [10, 30, 5, 60],
      highlights: [],
      variables: { "dp[0][2]": 4500, "optimal split": "k=1", parenthesization: "(A1·A2)×A3" },
      explanation: "dp[0][2] = 4500 at split k=1. Compute A1×A2 first (1500 ops producing 10×5 matrix), then multiply by A3 (3000 ops). Total = 4500.",
      code: "// (A1·A2)×A3 = 1500 + 3000 = 4500"
    },
    {
      array: [10, 30, 5, 60],
      highlights: [0, 1, 2, 3],
      variables: { result: 4500, savings: "27000 - 4500 = 22500", complexity: "O(n³)" },
      explanation: "Answer: 4500. Parenthesization matters enormously — (A1·A2)×A3 is 6× cheaper than A1×(A2·A3). O(n³) time, O(n²) space.",
      code: "return dp[0][n-1]; // 4500"
    }
  ]}
/>

### 4.3 Burst Balloons (LC 312)

Add sentinel 1s at both ends. `dp[i][j]` = max coins from bursting all balloons in `(i, j)` exclusive.

```java
public static int maxCoins(int[] nums) {
    int[] vals = new int[nums.length + 2];
    vals[0] = vals[nums.length + 1] = 1;
    System.arraycopy(nums, 0, vals, 1, nums.length);
    int n = vals.length;
    int[][] dp = new int[n][n];
    for (int len = 2; len < n; len++) {
        for (int i = 0; i < n - len; i++) {
            int j = i + len;
            for (int k = i + 1; k < j; k++) {
                dp[i][j] = Math.max(dp[i][j],
                    dp[i][k] + dp[k][j] + vals[i] * vals[k] * vals[j]);
            }
        }
    }
    return dp[0][n - 1];
}
```

### 4.3 Other Interval DP Problems

- **Palindrome Partitioning II** — min cuts to partition into palindromes.
- **Minimum Cost to Cut a Stick** — sort cuts, add endpoints, interval DP over cut indices.
- **Strange Printer** — `dp[i][j]` = min turns to print `s[i..j]`.

#### Palindrome Partitioning DP

Given string `s`, find the minimum number of cuts to partition it into palindromic substrings.

```java
public static int minCut(String s) {
    int n = s.length();
    boolean[][] isPalin = new boolean[n][n];
    for (int i = n - 1; i >= 0; i--)
        for (int j = i; j < n; j++)
            isPalin[i][j] = s.charAt(i) == s.charAt(j) && (j - i <= 2 || isPalin[i + 1][j - 1]);

    int[] dp = new int[n];
    Arrays.fill(dp, Integer.MAX_VALUE);
    for (int i = 0; i < n; i++) {
        if (isPalin[0][i]) { dp[i] = 0; continue; }
        for (int j = 1; j <= i; j++)
            if (isPalin[j][i]) dp[i] = Math.min(dp[i], dp[j - 1] + 1);
    }
    return dp[n - 1];
}
```

<AlgoViz
  title="Palindrome Partitioning — Minimum Cuts DP"
  description="s='aab'. Precompute palindrome table, then dp[i] = min cuts to partition s[0..i] into palindromes. Result: 1 cut → 'aa' | 'b'."
  steps={[
    {
      array: ["a", "a", "b"],
      labels: { 0: "s[0]", 1: "s[1]", 2: "s[2]" },
      highlights: [],
      variables: { s: "aab", goal: "min cuts for all-palindrome partition" },
      explanation: "Goal: partition 'aab' into palindromic substrings with minimum cuts. Step 1: precompute which substrings are palindromes.",
      code: "boolean[][] isPalin = new boolean[n][n];"
    },
    {
      array: ["a", "a", "b"],
      highlights: [0, 1],
      variables: { "isPalin[0][0]": "'a' ✓", "isPalin[1][1]": "'a' ✓", "isPalin[2][2]": "'b' ✓", "isPalin[0][1]": "'aa' ✓", "isPalin[1][2]": "'ab' ✗", "isPalin[0][2]": "'aab' ✗" },
      explanation: "Palindrome table built. Single chars always palindromes. 'aa' is palindrome. 'ab' and 'aab' are not. This table enables O(1) palindrome checks.",
      code: "isPalin[i][j] = (s[i]==s[j]) && (j-i<=2 || isPalin[i+1][j-1]);"
    },
    {
      array: [0, "?", "?"],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]" },
      highlights: [0],
      variables: { "dp[0]": 0, reason: "s[0..0]='a' is palindrome → 0 cuts" },
      explanation: "dp[0]: is s[0..0]='a' a palindrome? Yes → dp[0]=0. No cuts needed for a single palindromic char.",
      code: "if (isPalin[0][0]) dp[0] = 0;"
    },
    {
      array: [0, 0, "?"],
      highlights: [1],
      variables: { "dp[1]": 0, reason: "s[0..1]='aa' is palindrome → 0 cuts" },
      explanation: "dp[1]: is s[0..1]='aa' a palindrome? Yes → dp[1]=0. The entire substring is one palindrome, no cuts needed.",
      code: "if (isPalin[0][1]) dp[1] = 0;"
    },
    {
      array: [0, 0, 1],
      highlights: [2],
      variables: { "dp[2]": 1, "s[0..2]='aab'": "✗ not palindrome", "s[2..2]='b'": "✓ → dp[1]+1 = 1", "s[1..2]='ab'": "✗ skip" },
      explanation: "dp[2]: 'aab' is not a palindrome. Check cuts: s[2..2]='b' is palindrome → dp[1]+1=0+1=1. s[1..2]='ab' is not. Best = 1.",
      code: "dp[2] = Math.min(dp[2], dp[1] + 1); // 1 cut"
    },
    {
      array: [0, 0, 1],
      highlights: [0, 1, 2],
      variables: { result: 1, partition: "'aa' | 'b'", cuts: 1 },
      explanation: "Answer: dp[2] = 1 cut. Optimal partition: 'aa' | 'b' — both substrings are palindromes. O(n²) time.",
      code: "return dp[n-1]; // 1"
    }
  ]}
/>

#### Wildcard Matching

Match a string against a pattern containing `?` (matches any single character) and `*` (matches any sequence including empty).

```java
public static boolean isMatch(String s, String p) {
    int m = s.length(), n = p.length();
    boolean[][] dp = new boolean[n + 1][m + 1];
    dp[0][0] = true;
    for (int i = 1; i <= n; i++)
        if (p.charAt(i - 1) == '*') dp[i][0] = dp[i - 1][0];

    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            char pc = p.charAt(i - 1);
            if (pc == '?' || pc == s.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1];
            else if (pc == '*')
                dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        }
    }
    return dp[n][m];
}
```

<AlgoViz
  title="Wildcard Matching — 2D DP Table"
  description="Pattern 'a*d' vs string 'abcd'. '?' matches one char, '*' matches any sequence. dp[i][j] = does pattern[0..i-1] match string[0..j-1]."
  steps={[
    {
      array: ["a", "b", "c", "d"],
      labels: { 0: "s[0]", 1: "s[1]", 2: "s[2]", 3: "s[3]" },
      highlights: [],
      variables: { pattern: "a*d", string: "abcd", "dp[0][0]": "T (empty matches empty)" },
      explanation: "Match pattern 'a*d' against string 'abcd'. dp[0][0]=true (empty matches empty). All other dp[0][j]=false (empty pattern can't match non-empty string).",
      code: "dp[0][0] = true; // empty matches empty"
    },
    {
      array: ["a", "b", "c", "d"],
      highlights: [0],
      variables: { "row p='a'": "exact match required", "dp[1][1]": "T (a==a)", "dp[1][2..4]": "all F" },
      explanation: "Row 1 (p[0]='a'): dp[1][1]=dp[0][0] && a==a = true. Columns 2-4 false — pattern 'a' cannot match 'ab', 'abc', or 'abcd'.",
      code: "dp[1][1] = dp[0][0]; // 'a' matches 'a'"
    },
    {
      array: ["a", "b", "c", "d"],
      highlights: [0, 1, 2, 3],
      variables: { "row p='*'": "matches any sequence", "dp[2][1]": "T", "dp[2][2]": "T", "dp[2][3]": "T", "dp[2][4]": "T" },
      explanation: "Row 2 (p[1]='*'): dp[2][j] = dp[1][j] (match empty) || dp[2][j-1] (extend). Since dp[2][1]=dp[1][1]=T, all subsequent columns propagate true. 'a*' matches 'a', 'ab', 'abc', 'abcd'.",
      code: "dp[2][j] = dp[1][j] || dp[2][j-1]; // * extends"
    },
    {
      array: ["a", "b", "c", "d"],
      highlights: [3],
      variables: { "row p='d'": "exact match required", "dp[3][1..3]": "all F", "dp[3][4]": "T" },
      explanation: "Row 3 (p[2]='d'): must match exactly. dp[3][4]=dp[2][3] && d==d = T. Columns 1-3 false — 'd' doesn't match 'a','b','c'. The '*' consumed 'bc'.",
      code: "dp[3][4] = dp[2][3] && ('d' == 'd'); // true"
    },
    {
      array: ["a", "b", "c", "d"],
      highlights: [0, 1, 2, 3],
      secondary: [1, 2],
      variables: { result: true, starMatched: "'bc'", fullMatch: "a[bc]d" },
      explanation: "Result: dp[3][4] = true. Pattern 'a*d' matches 'abcd' — the '*' greedily matched 'bc'. O(m×n) time, O(m×n) space.",
      code: "return dp[n][m]; // true"
    },
    {
      array: ["a", "b", "c", "d"],
      highlights: [],
      variables: { "key transitions": "? → diagonal, * → above OR left", "star empty": "dp[i-1][j]", "star extends": "dp[i][j-1]" },
      explanation: "Summary: '?' and exact matches take dp[i-1][j-1] (diagonal). '*' takes dp[i-1][j] (match empty) OR dp[i][j-1] (extend match by one more char). This covers all wildcard semantics.",
      code: "// ? or match: dp[i-1][j-1]\n// *: dp[i-1][j] || dp[i][j-1]"
    }
  ]}
/>

---

## 5 — DP Optimization Hints

| Technique | When to Use | Complexity Gain |
|-----------|-------------|-----------------|
| Space compression (rolling array) | Current row depends only on previous row | O(n * m) space to O(m) |
| Monotonic queue / deque | Sliding window min/max in transitions | O(n * k) to O(n) |
| Convex hull trick | Transitions of the form `dp[j] + b[j] * a[i]` | O(n^2) to O(n log n) or O(n) |
| Knuth's optimization | Interval DP where optimal split point is monotone | O(n^3) to O(n^2) |
| Divide-and-conquer optimization | 1D DP where opt split is monotone | O(n * m) to O(n * m * log n) or better |
| Bitmask DP | States are subsets of a small set (n lte 20) | Enumerate subsets |

For interview-level problems, **space compression** and **monotonic queue** are the most common. The others appear in competitive programming.

---

## 6 — Complexity Reference

| Problem | Time | Space | Core Pattern |
|---------|------|-------|-------------|
| 0/1 Knapsack | O(n * W) | O(W) | Knapsack |
| Unbounded Knapsack | O(n * W) | O(W) | Knapsack |
| Partition Equal Subset Sum | O(n * sum/2) | O(sum/2) | 0/1 Knapsack |
| Target Sum | O(n * sum) | O(sum) | 0/1 Knapsack (count) |
| Coin Change II | O(n * amount) | O(amount) | Unbounded Knapsack |
| Combination Sum IV | O(n * target) | O(target) | Unbounded (permutation) |
| Best Time Buy/Sell Cooldown | O(n) | O(1) | State Machine |
| Best Time Buy/Sell with Fee | O(n) | O(1) | State Machine |
| House Robber III | O(n) | O(h) | Tree DP |
| Burst Balloons | O(n^3) | O(n^2) | Interval DP |
| Palindrome Partitioning II | O(n^2) | O(n^2) | Interval / Expand |
| Min Cost to Cut Stick | O(c^3) | O(c^2) | Interval DP (c = cuts) |
| Unique BSTs | O(n^2) | O(n) | Catalan / Interval |
| Cherry Pickup II | O(m * n^2) | O(n^2) | Multi-agent DP |
| Max Profit Job Scheduling | O(n log n) | O(n) | DP + Binary Search |
| Interleaving String | O(m * n) | O(n) | 2D DP |
| Perfect Squares | O(n * sqrt(n)) | O(n) | Unbounded Knapsack |
| Min Cost Climbing Stairs | O(n) | O(1) | Linear DP |
| Delete and Earn | O(n + max_val) | O(max_val) | House Robber reduction |
| Integer Break | O(n^2) | O(n) | Unbounded Knapsack |
| Ones and Zeroes | O(l * m * n) | O(m * n) | 2D 0/1 Knapsack |
| Last Stone Weight II | O(n * S/2) | O(S/2) | 0/1 Knapsack |
| Min Cost Tickets | O(n) or O(365) | O(365) | DP on days |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "partition array into two equal-sum subsets" | 0/1 knapsack with target = sum/2 | 0/1 Knapsack feasibility |
| "count ways to assign +/- to reach target" | 0/1 knapsack count with shifted target | Target Sum reduction |
| "minimum difference between two group sums" | 0/1 knapsack, find best reachable sum near sum/2 | Last Stone Weight II |
| "count combinations of coins summing to amount" | Unbounded knapsack, iterate items outer, capacity inner | Coin Change II |
| "buy/sell stock with cooldown or fee" | State-machine DP with hold/sold/rest transitions | State Machine template |
| "at most K transactions" | Add transaction dimension to state machine | K-transaction Stock DP |
| "rob houses on a tree (no adjacent)" | Tree DP returning (rob, skip) tuple per node | Tree DP (House Robber III) |
| "burst balloons for max coins" | Interval DP, think which balloon bursts LAST | Interval DP (Burst Balloons) |
| "minimum cuts to partition into palindromes" | Expand-around-center plus linear DP for min cuts | Palindrome Partitioning II |
| "minimum cost to cut a stick at given positions" | Sort cuts, add endpoints, interval DP | Interval DP |

---

## 7 — Worked Example: Partition Equal Subset Sum

**Why not brute force?** Enumerating all 2^n subsets and checking if any sums to target is exponential — infeasible for n beyond 20. The knapsack DP leverages the structure of the problem: you do not need to track *which* elements are in the subset, only *what sums are reachable*. A boolean DP array of size target+1 tracks this in O(n * target) time, which is pseudo-polynomial but efficient enough for typical constraints (n up to 200, sum up to 20,000).

**Key insight:** Reducing "partition into two equal subsets" to "does a subset summing to total/2 exist" is the crucial first step. Once you see the knapsack structure, the template writes itself. The right-to-left iteration order ensures each element is used at most once (0/1 property).

**Problem (LC 416):** Given an integer array `nums`, return `True` if you can partition it into two subsets with equal sum.

### Step 1 — Reduce to 0/1 Knapsack

If `total = sum(nums)` is odd, return `False` immediately. Otherwise, we need to find a subset that sums to `target = total // 2`. This is exactly the 0/1 knapsack feasibility problem.

### Step 2 — Define State

`dp[c]` = can we form sum `c` using some subset of items seen so far?

- Base case: `dp[0] = True` (empty subset sums to 0).
- Transition: for each num, set `dp[c] = dp[c] or dp[c - num]` for `c` from `target` down to `num`.

### Step 3 — Trace Through Example

`nums = [1, 5, 11, 5]`, total = 22, target = 11.

**Initial dp** (indices 0..11):

```
dp = [T, F, F, F, F, F, F, F, F, F, F, F]
```

**Process num = 1** (c from 11 down to 1):

```
dp[1] = dp[1] or dp[0] = F or T = T
dp = [T, T, F, F, F, F, F, F, F, F, F, F]
```

**Process num = 5** (c from 11 down to 5):

```
dp[6] = dp[6] or dp[1] = F or T = T
dp[5] = dp[5] or dp[0] = F or T = T
dp = [T, T, F, F, F, T, T, F, F, F, F, F]
```

**Process num = 11** (c from 11 down to 11):

```
dp[11] = dp[11] or dp[0] = F or T = T
dp = [T, T, F, F, F, T, T, F, F, F, F, T]
```

We already have `dp[11] = True`. We could stop early, but let's finish.

**Process num = 5** (c from 11 down to 5):

```
dp[11] stays T (dp[6]=T confirms it again)
dp[10] = dp[10] or dp[5] = F or T = T
dp[7]  = dp[7]  or dp[2] = F or F = F
dp[6]  stays T
dp[5]  stays T
dp = [T, T, F, F, F, T, T, F, F, F, T, T]
```

**Answer:** `dp[11] = True`. The subset `[5, 5, 1]` sums to 11, and `[11]` sums to 11.

### Step 4 — Final Code

```java
public static boolean canPartition(int[] nums) {
    int total = 0;
    for (int num : nums) total += num;
    if (total % 2 != 0) return false;
    int target = total / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums) {
        for (int c = target; c >= num; c--) {
            dp[c] = dp[c] || dp[c - num];
        }
        if (dp[target]) return true;
    }
    return dp[target];
}
```

**Time:** O(n * target). **Space:** O(target).

### Animation

<AlgoViz
  title="Partition Equal Subset Sum (0/1 Knapsack)"
  description="DP array tracks reachable sums. For nums = [1, 5, 11, 5], total = 22, target = 11. Iterate right-to-left to avoid reusing items."
  steps={[
    { array: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [0], variables: { num: "start", target: 11 }, explanation: "Initial dp: dp[0] = true (T=1), all others false (F=0).", code: "dp[0] = true;" },
    { array: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [1], variables: { num: 1, c: "11 down to 1" }, explanation: "Process num=1: dp[1] = dp[1] || dp[0] = true.", code: "dp[1] = dp[1] || dp[1 - 1];" },
    { array: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0], highlights: [5, 6], variables: { num: 5, c: "11 down to 5" }, explanation: "Process num=5: dp[6] = dp[1] = true, dp[5] = dp[0] = true.", code: "dp[c] = dp[c] || dp[c - 5];" },
    { array: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1], highlights: [11], variables: { num: 11, c: "11 down to 11" }, explanation: "Process num=11: dp[11] = dp[0] = true. Target reached!", code: "dp[11] = dp[11] || dp[11 - 11];" },
    { array: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1], highlights: [10, 11], variables: { num: 5, c: "11 down to 5", result: "true" }, explanation: "Process num=5 (second): dp[10] = dp[5] = true. Final answer: dp[11] = true. Subsets: [5,5,1] and [11].", code: "return dp[target]; // true" },
  ]}
/>

---

## 8 — Practice Problems (21 Problems, 3 Days)

### Day 1 — Knapsack Foundations (7 problems)

| No. | Problem | Difficulty | Key Idea |
|-----|---------|-----------|----------|
| 1 | [Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) | Easy | Linear DP warmup — `dp[i] = cost[i] + min(dp[i-1], dp[i-2])` |
| 2 | [Delete and Earn](https://leetcode.com/problems/delete-and-earn/) | Medium | Reduce to House Robber by grouping by value |
| 3 | [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) | Medium | 0/1 knapsack feasibility, target = sum/2 |
| 4 | [Target Sum](https://leetcode.com/problems/target-sum/) | Medium | 0/1 knapsack count — find subset summing to `(total + target) / 2` |
| 5 | [Last Stone Weight II](https://leetcode.com/problems/last-stone-weight-ii/) | Medium | 0/1 knapsack — minimize `total - 2 * best_sum` |
| 6 | [Ones and Zeroes](https://leetcode.com/problems/ones-and-zeroes/) | Medium | 2D 0/1 knapsack with budgets for 0s and 1s |
| 7 | [Coin Change II](https://leetcode.com/problems/coin-change-ii/) | Medium | Unbounded knapsack — count combinations |

### Day 2 — State Machine & Tree DP (7 problems)

| No. | Problem | Difficulty | Key Idea |
|-----|---------|-----------|----------|
| 8 | [Best Time Buy Sell with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) | Medium | 3-state machine: hold, sold, rest |
| 9 | [Best Time Buy Sell with Fee](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/) | Medium | 2-state machine: hold, cash |
| 10 | [House Robber III](https://leetcode.com/problems/house-robber-iii/) | Medium | Tree DP — return (rob, skip) per node |
| 11 | [Combination Sum IV](https://leetcode.com/problems/combination-sum-iv/) | Medium | Unbounded knapsack counting **permutations** — iterate target outer |
| 12 | [Min Cost Tickets](https://leetcode.com/problems/minimum-cost-for-tickets/) | Medium | DP on travel days with 1/7/30-day passes |
| 13 | [Integer Break](https://leetcode.com/problems/integer-break/) | Medium | `dp[i] = max(j * (i-j), j * dp[i-j])` for j in 1..i-1 |
| 14 | [Perfect Squares](https://leetcode.com/problems/perfect-squares/) | Medium | Unbounded knapsack — coins are perfect squares |

### Day 3 — Interval DP & Hard Variants (7 problems)

| No. | Problem | Difficulty | Key Idea |
|-----|---------|-----------|----------|
| 15 | [Interleaving String](https://leetcode.com/problems/interleaving-string/) | Medium | 2D DP — `dp[i][j]` = can s1[:i] and s2[:j] form s3[:i+j] |
| 16 | [Max Profit in Job Scheduling](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) | Hard | Sort by end time, DP + binary search for last non-overlapping |
| 17 | [Burst Balloons](https://leetcode.com/problems/burst-balloons/) | Hard | Interval DP — think of last balloon to burst in range |
| 18 | [Palindrome Partitioning II](https://leetcode.com/problems/palindrome-partitioning-ii/) | Hard | Expand-around-center to mark palindromes + linear DP for min cuts |
| 19 | [Minimum Cost to Cut a Stick](https://leetcode.com/problems/minimum-cost-to-cut-a-stick/) | Hard | Sort cuts, add endpoints, interval DP over cut indices |
| 20 | [Unique Binary Search Trees](https://leetcode.com/problems/unique-binary-search-trees/) | Medium | Catalan number via DP: `dp[n] = sum(dp[i-1] * dp[n-i])` |
| 21 | [Cherry Pickup II](https://leetcode.com/problems/cherry-pickup-ii/) | Hard | Two robots DP — state is `(row, col1, col2)`, compress to 2D |

---

## 9 — Mock Interviews

### Mock Interview 1: Knapsack & State Machine

**Interviewer:** "Given an array of positive integers, determine if it can be partitioned into two subsets with equal sum."

**Follow-ups:**

1. "Walk me through how you reduce this to 0/1 knapsack."
   - Total must be even. Target = total / 2. Each number is an item with weight = value = num. We need to determine if we can exactly fill capacity = target.

2. "Your solution uses O(target) space. Can you reconstruct which elements are in each subset?"
   - Use a 2D boolean table `dp[i][c]`. Backtrack: if `dp[i][c] != dp[i-1][c]`, item `i` was included. Walk backwards from `dp[n][target]`.

3. "What if instead of two subsets, you need to minimize the difference between k subsets?"
   - For k = 2 this is the same problem. For general k, this is NP-hard (multi-way partition). Approximation algorithms or bitmask DP (if n is small) are needed. For k = 3 with small sums, 2D knapsack on two of the three targets works.

4. "Now solve Best Time to Buy and Sell Stock with Cooldown. How do you model states?"
   - Three states per day: `hold` (own a share), `sold` (just sold, entering cooldown), `rest` (no share, free to buy). Transitions: hold = max(hold, rest - price), sold = hold + price, rest = max(rest, sold_prev). Answer: max(sold, rest) at the end.

---

### Mock Interview 2: Interval DP & Tree DP

**Interviewer:** "You have n balloons with values. Bursting balloon i gives `nums[left] * nums[i] * nums[right]` coins. Find the max coins."

**Follow-ups:**

1. "Why does a greedy approach fail here?"
   - Bursting a balloon changes the neighbors of adjacent balloons. The subproblems are not independent if we think of which balloon to burst first. We need to think of which balloon to burst **last** in each subrange.

2. "Explain the sentinel trick and the recurrence."
   - Pad array with 1s: `[1] + nums + [1]`. Define `dp[i][j]` = max coins from bursting all balloons strictly between index i and j. For each k in (i, j), if k is the last balloon burst in this range, the coins earned are `nums[i] * nums[k] * nums[j]` (since everything else in (i,j) is already gone). Recurrence: `dp[i][j] = max over k of (dp[i][k] + dp[k][j] + nums[i]*nums[k]*nums[j])`.

3. "What is the time and space complexity?"
   - Time: O(n^3) — three nested loops (length, i, k). Space: O(n^2) for the DP table.

4. "Now solve House Robber III. How does tree DP differ from array DP?"
   - In tree DP the substructure follows the tree shape, not a linear index. We do post-order DFS returning a tuple `(rob_this_node, skip_this_node)`. If we rob the current node, we must skip both children. If we skip, children are free to be robbed or skipped optimally. Time O(n), space O(h) for recursion stack.

5. "Can you extend House Robber III to a general graph (not a tree)?"
   - On general graphs this becomes the Maximum Weight Independent Set problem, which is NP-hard. For trees it's polynomial because the tree structure gives non-overlapping subproblems. For graphs with small treewidth, tree decomposition can help.

---

## 10 — Tips & Edge Cases

### General DP Tips

- **Identify the pattern first.** Is it knapsack? State machine? Interval? Tree? This determines your recurrence structure.
- **Start with the brute-force recurrence.** Write the top-down recursive solution, then convert to bottom-up if needed for space optimization.
- **Check for space compression.** If `dp[i]` only depends on `dp[i-1]`, use a rolling array or just two variables.
- **Iteration order matters.** 0/1 knapsack iterates capacity right-to-left; unbounded iterates left-to-right. Getting this wrong silently produces incorrect answers.

### Knapsack Edge Cases

- **Sum overflow:** When target is `sum(nums)`, and nums can have large values, check that target fits in your integer type. Java's `int` overflows at 2^31 - use `long` if the sum can exceed Integer.MAX_VALUE.
- **Empty input:** `nums = []` — sum is 0, partition is trivially true.
- **Single element:** Cannot partition `[7]` into two equal subsets.
- **All identical elements:** `[3, 3, 3, 3]` — works if count is even.
- **Target parity:** Always check `total % 2 != 0` first to short-circuit.

### State Machine Edge Cases

- **Single price:** `prices = [5]` — no transaction possible, profit = 0.
- **Monotonically decreasing:** `prices = [5, 4, 3, 2, 1]` — best profit is 0 (never buy).
- **Fee exceeds all gains:** Every sell yields negative net profit — answer is 0, not negative.
- **Cooldown with length-2 input:** `prices = [1, 2]` — buy day 0, sell day 1, profit = 1. Cooldown doesn't matter.

### Interval DP Edge Cases

- **Single element:** `dp[i][i]` is usually a base case (0 or the element itself).
- **Length-2 intervals:** Often the first non-trivial case. Make sure your loop starts at the right length.
- **Sentinel values:** Burst Balloons and Min Cost to Cut a Stick both need sentinel endpoints — forgetting them is a common bug.

### Tree DP Edge Cases

- **Null/empty tree:** Return 0 or appropriate identity.
- **Single node:** The answer is just the node's value (no children to consider).
- **Skewed tree (linked list):** Tree DP degenerates to linear DP. Recursion depth can cause a StackOverflowError in Java — consider increasing stack size via `-Xss` or using iterative post-order traversal.
- **Negative values:** House Robber III assumes positive values. If negatives are allowed, the "skip" option must account for the possibility that robbing a negative node is worse than skipping.

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Wrong iteration order in 0/1 knapsack | Always right-to-left for 0/1, left-to-right for unbounded |
| Counting permutations instead of combinations | Combinations: outer loop over items. Permutations: outer loop over target |
| Off-by-one in interval DP ranges | Draw out indices for n = 3 and verify manually |
| Forgetting base cases in tree DP | Always handle `None` node before recursing |
| Not adding sentinels in Burst Balloons | Pad with `[1] + nums + [1]` |
| Mixing up "last burst" vs "first burst" thinking | Interval DP for balloons: think about which balloon is burst **last** |
