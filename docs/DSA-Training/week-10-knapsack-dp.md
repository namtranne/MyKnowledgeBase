---
sidebar_position: 11
title: "Week 10: Knapsack DP"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 10: Knapsack DP

The knapsack family is the backbone of optimization DP. Nearly every problem involving "choose items subject to a constraint to maximize/minimize a value" maps to a knapsack variant. Master three flavors — **0/1**, **unbounded**, and **bounded** — plus the special cases of **subset sum** and **coin change**, and you'll recognize knapsack structure in dozens of LeetCode problems.

**Why this family of techniques exists.** Consider a thief choosing items to steal from a store, limited by their bag's weight capacity. The brute force approach tries all 2^n subsets of items to find the one with maximum value that fits — exponentially slow. Knapsack DP exploits the fact that decisions are independent per item (take it or leave it) and that the capacity constraint is a single dimension. By building a table of "best value achievable with items 1..i and capacity c," each cell depends only on the previous row, yielding O(nW) time instead of O(2^n).

**The intuition — a real-world analogy.** Imagine packing for a hiking trip with a weight limit. You have a tent (heavy but valuable), sleeping bag, stove, extra clothes, food, etc. Instead of trying every possible combination, you think about it incrementally: "If I have already made the best decisions for the first 5 items, and item 6 weighs 3 kg, I either include it (and look up the best I can do with 3 kg less capacity using items 1-5) or exclude it (and keep the same answer as items 1-5)." This incremental "take or skip" decision, repeated for each item at each capacity, is the knapsack recurrence.

**Interview signals.** Any problem that says "select items to maximize/minimize value subject to a weight/capacity/budget constraint" is a knapsack variant. Watch for: "partition array into two equal subsets" (subset sum), "minimum coins to make amount" (unbounded knapsack), "number of ways to make change" (counting knapsack), "target sum with + and - signs" (subset sum reduction), "0s and 1s count constraint" (multi-dimensional knapsack), or "job scheduling with deadlines and profits" (knapsack with sorting). The key tell is that each item can be "taken" or "not taken," and there is a numeric constraint limiting what can be taken.

**Common mistakes beginners make.** (1) Iterating capacity forwards in 0/1 knapsack (accidentally allowing items to be reused, turning it into unbounded knapsack). (2) Iterating capacity backwards in unbounded knapsack (accidentally restricting items to single use). (3) Confusing combinations vs. permutations in coin change problems — the loop order (coins outer vs. amounts outer) determines which you get. (4) Not recognizing that a problem is knapsack in disguise — "partition equal subset sum" does not mention knapsacks at all, but it reduces to subset sum with target = totalSum/2.

---

## Core Theory

### 1. 0/1 Knapsack

**Problem:** Given `n` items with weights `w[i]` and values `v[i]`, and a knapsack of capacity `W`, select items (each at most once) to maximize total value without exceeding capacity.

#### 2D DP

**When to use this template.** Use the full 2D knapsack table when you need to reconstruct which items were selected, or when you are learning the technique for the first time. The 2D version makes the recurrence visually clear — row `i` represents decisions about the first `i` items, and column `c` represents available capacity. For interview solutions where only the optimal value is needed, prefer the space-optimized 1D version below.

Define `dp[i][c]` = maximum value using items `0..i-1` with capacity `c`.

**Recurrence:**

$$
dp[i][c] = \begin{cases}
dp[i-1][c] & \text{if } w[i-1] > c \quad \text{(can't take item)} \\
\max(dp[i-1][c],\; dp[i-1][c - w[i-1]] + v[i-1]) & \text{otherwise}
\end{cases}
$$

```java
import java.util.*;

static int knapsack01_2D(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1];

    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= capacity; c++) {
            dp[i][c] = dp[i - 1][c];
            if (weights[i - 1] <= c)
                dp[i][c] = Math.max(dp[i][c],
                           dp[i - 1][c - weights[i - 1]] + values[i - 1]);
        }
    return dp[n][capacity];
}
```

#### Space-Optimized 1D (Iterate Backwards)

**When to use this template.** Use the 1D space-optimized version when you only need the maximum value (not which items were selected) and want O(W) memory instead of O(nW). This is the standard interview-ready implementation for 0/1 knapsack. The critical detail is iterating capacity backwards — forgetting this silently converts the algorithm into unbounded knapsack.

Since `dp[i][c]` depends on `dp[i-1][c]` and `dp[i-1][c - w]` (both from the previous row, at the same or smaller capacity), we can use a single 1D array — but we **must iterate capacity backwards** to avoid using an already-updated value from the current row.

```java
static int knapsack01(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++)
        for (int c = capacity; c >= weights[i]; c--)
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
    return dp[capacity];
}
```

**Why backwards?** If we go forwards, `dp[c - w[i]]` may already reflect "item `i` was taken," effectively allowing the same item to be used multiple times — which is the unbounded knapsack, not 0/1.

#### Reconstructing the Selected Items

```java
static List<Integer> knapsack01Items(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= capacity; c++) {
            dp[i][c] = dp[i - 1][c];
            if (weights[i - 1] <= c)
                dp[i][c] = Math.max(dp[i][c],
                           dp[i - 1][c - weights[i - 1]] + values[i - 1]);
        }

    LinkedList<Integer> selected = new LinkedList<>();
    int c = capacity;
    for (int i = n; i > 0; i--)
        if (dp[i][c] != dp[i - 1][c]) {
            selected.addFirst(i - 1);
            c -= weights[i - 1];
        }
    return selected;
}
```

---

### 2. Unbounded Knapsack

**Problem:** Same as 0/1, but each item can be used **unlimited** times.

**When to use this template.** Reach for unbounded knapsack whenever each item (or coin, or resource) can be used an unlimited number of times. The only difference from 0/1 knapsack is iterating capacity forwards, which allows `dp[c - w[i]]` to reflect choices already made in the current pass. Coin change problems are the most common instance of this pattern.

The only change: iterate capacity **forwards** (so that the same item can contribute multiple times within the same row).

```java
static int knapsackUnbounded(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++)
        for (int c = weights[i]; c <= capacity; c++) // forwards!
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
    return dp[capacity];
}
```

**Alternatively**, iterate over capacity in the outer loop and items in the inner loop (equivalent for unbounded):

```java
static int knapsackUnboundedV2(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int c = 1; c <= capacity; c++)
        for (int i = 0; i < weights.length; i++)
            if (weights[i] <= c)
                dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
    return dp[capacity];
}
```

**Coin Change** is the canonical unbounded knapsack: coins are "items" with weight = denomination and value = 1 (minimize) or ways count.

---

### 3. Bounded Knapsack

**Problem:** Item `i` can be used at most `count[i]` times.

#### Naive Approach: O(n × W × max_count)

Treat each copy as a separate 0/1 item. Slow when counts are large.

#### Binary Representation Trick: O(n × W × log(max_count))

Split `count[i]` copies of item `i` into groups of powers of 2: `1, 2, 4, 8, ..., remainder`. Each group becomes a single 0/1 item. This lets us represent any number from 0 to `count[i]` using subset selection on these groups.

```java
static int knapsackBounded(int[] weights, int[] values, int[] counts, int capacity) {
    // Expand items using binary representation
    List<Integer> expW = new ArrayList<>(), expV = new ArrayList<>();
    for (int i = 0; i < weights.length; i++) {
        int remaining = counts[i], k = 1;
        while (remaining > 0) {
            int take = Math.min(k, remaining);
            expW.add(weights[i] * take);
            expV.add(values[i] * take);
            remaining -= take;
            k *= 2;
        }
    }

    // Solve as 0/1 knapsack
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < expW.size(); i++)
        for (int c = capacity; c >= expW.get(i); c--)
            dp[c] = Math.max(dp[c], dp[c - expW.get(i)] + expV.get(i));
    return dp[capacity];
}
```

**Example:** Item with weight=2, value=3, count=7 becomes four 0/1 items:
- 1 copy: weight=2, value=3
- 2 copies: weight=4, value=6
- 4 copies: weight=8, value=12 (but 1+2+4=7 = count, so no remainder here)

Any number 0–7 can be represented by selecting a subset of `{1, 2, 4}`.

---

### 4. Subset Sum

**Problem:** Given a set of positive integers and a target `S`, determine if any subset sums to exactly `S`.

This is a **special case of 0/1 knapsack** where weight = value = the number itself, and we check reachability rather than maximizing.

**When to use this template.** Use subset sum whenever the question asks whether a specific total is achievable from a set of numbers, each used at most once. Many partition and target-sum problems reduce to this pattern after algebraic manipulation — for example, "partition into two equal subsets" becomes subset sum with `target = totalSum / 2`, and "target sum with +/- signs" becomes subset sum with `target = (total + target) / 2`.

```java
static boolean subsetSum(int[] nums, int target) {
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums)
        for (int s = target; s >= num; s--) // backwards for 0/1
            dp[s] = dp[s] || dp[s - num];
    return dp[target];
}
```

**Counting variant** (number of subsets summing to `target`):

```java
static int subsetSumCount(int[] nums, int target) {
    int[] dp = new int[target + 1];
    dp[0] = 1;
    for (int num : nums)
        for (int s = target; s >= num; s--)
            dp[s] += dp[s - num];
    return dp[target];
}
```

---

### 5. Coin Change

#### Minimum Coins (LC 322)

**Problem:** Given coin denominations and an amount, find the minimum number of coins to make that amount, or -1 if impossible.

This is an **unbounded knapsack** minimization problem.

**When to use this template.** Use this template for any "minimum number of items to reach a target" problem where items are reusable. The canonical example is coin change, but it also covers minimum perfect squares summing to n (LC 279) and minimum cost for tickets (LC 983) with appropriate modifications. Initialize non-zero entries to `Integer.MAX_VALUE` and use `min` instead of `max`.

```java
static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++) // forwards: unlimited coins
            if (dp[a - coin] != Integer.MAX_VALUE)
                dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}
```

**BFS alternative:** Treat amounts as graph nodes, edges as coin transitions. BFS from 0 finds the shortest path (minimum coins) to `amount`. This is equivalent but uses O(amount) space for the queue.

```java
static int coinChangeBfs(int[] coins, int amount) {
    if (amount == 0) return 0;
    boolean[] visited = new boolean[amount + 1];
    visited[0] = true;
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    queue.offer(0);
    int steps = 0;
    while (!queue.isEmpty()) {
        steps++;
        int size = queue.size();
        for (int q = 0; q < size; q++) {
            int curr = queue.poll();
            for (int coin : coins) {
                int nxt = curr + coin;
                if (nxt == amount) return steps;
                if (nxt < amount && !visited[nxt]) {
                    visited[nxt] = true;
                    queue.offer(nxt);
                }
            }
        }
    }
    return -1;
}
```

#### Number of Ways (LC 518)

**Problem:** Count the number of combinations (not permutations) that make up the amount.

**When to use this template.** Use this counting template when the problem asks "how many ways" to reach a target with reusable items and order does not matter (combinations). The critical detail is the loop order: coins in the outer loop and amounts in the inner loop ensures each combination is counted exactly once. Swapping the loop order gives permutation counting instead (LC 377).

```java
static int coinChangeWays(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    dp[0] = 1;
    for (int coin : coins)                        // outer loop: coins
        for (int a = coin; a <= amount; a++)       // inner loop: amounts
            dp[a] += dp[a - coin];
    return dp[amount];
}
```

**Combinations vs permutations:** The loop order matters.
- **Coins outer, amounts inner** → combinations (each coin set counted once).
- **Amounts outer, coins inner** → permutations (order matters, as in LC 377 Combination Sum IV).

```java
static int combinationSumPermutations(int[] nums, int target) {
    int[] dp = new int[target + 1];
    dp[0] = 1;
    for (int a = 1; a <= target; a++)              // outer loop: amounts
        for (int num : nums)                       // inner loop: items
            if (num <= a)
                dp[a] += dp[a - num];
    return dp[target];
}
```

---

## Worked Example: 0/1 Knapsack

**Items:** `[(weight=2, value=3), (3, 4), (4, 5), (5, 6)]`, **Capacity = 8**

**Why not brute force?** With 4 items, brute force checks 2^4 = 16 subsets — trivial. But in general with n items, brute force is O(2^n), which is impractical for n = 40+. The DP approach is O(n * W) = O(4 * 8) = 32 operations, and scales linearly with both n and W.

### Full DP Table

|  | c=0 | c=1 | c=2 | c=3 | c=4 | c=5 | c=6 | c=7 | c=8 |
|--|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| No items (i=0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Item 0 (w=2,v=3) | 0 | 0 | **3** | 3 | 3 | 3 | 3 | 3 | 3 |
| Item 1 (w=3,v=4) | 0 | 0 | 3 | **4** | 4 | **7** | 7 | 7 | 7 |
| Item 2 (w=4,v=5) | 0 | 0 | 3 | 4 | **5** | 7 | **8** | **9** | 9 |
| Item 3 (w=5,v=6) | 0 | 0 | 3 | 4 | 5 | 7 | 8 | **9** | 9 |

### Step-by-Step Trace

**Row i=1 (Item 0: w=2, v=3):**
- c=0,1: Can't fit (w=2 > c). `dp[1][c] = dp[0][c] = 0`.
- c=2: `max(dp[0][2], dp[0][0] + 3) = max(0, 3) = 3`. Take item 0.
- c=3..8: Same decision. `max(0, 3) = 3`.

**Row i=2 (Item 1: w=3, v=4):**
- c=0..2: Can't fit. Copy from above.
- c=3: `max(dp[1][3], dp[1][0] + 4) = max(3, 4) = 4`. Take item 1 only.
- c=4: `max(dp[1][4], dp[1][1] + 4) = max(3, 4) = 4`. Take item 1 only.
- c=5: `max(dp[1][5], dp[1][2] + 4) = max(3, 3+4) = 7`. Take items 0 and 1.
- c=6..8: `max(3, 7) = 7`. Items 0+1.

**Row i=3 (Item 2: w=4, v=5):**
- c=4: `max(dp[2][4], dp[2][0] + 5) = max(4, 5) = 5`. Take item 2 only.
- c=6: `max(dp[2][6], dp[2][2] + 5) = max(7, 3+5) = 8`. Items 0+2.
- c=7: `max(dp[2][7], dp[2][3] + 5) = max(7, 4+5) = 9`. Items 1+2.

**Row i=4 (Item 3: w=5, v=6):**
- c=7: `max(dp[3][7], dp[3][2] + 6) = max(9, 3+6) = 9`. Items 1+2 still wins.
- c=8: `max(dp[3][8], dp[3][3] + 6) = max(9, 4+6) = 10`... wait, let me recalculate.

Actually, let me recheck c=8 for i=3:
- c=8: `max(dp[2][8], dp[2][4] + 5) = max(7, 4+5) = 9`. Items 1+2.

And c=8 for i=4:
- c=8: `max(dp[3][8], dp[3][3] + 6) = max(9, 4+6) = 10`.

Let me correct the table:

|  | c=0 | c=1 | c=2 | c=3 | c=4 | c=5 | c=6 | c=7 | c=8 |
|--|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| No items | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Item 0 (2,3) | 0 | 0 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Items 0-1 (3,4) | 0 | 0 | 3 | 4 | 4 | 7 | 7 | 7 | 7 |
| Items 0-2 (4,5) | 0 | 0 | 3 | 4 | 5 | 7 | 8 | 9 | 9 |
| Items 0-3 (5,6) | 0 | 0 | 3 | 4 | 5 | 7 | 8 | 9 | **10** |

**Answer: 10** (select items 1 and 3: weight 3+5=8, value 4+6=10).

**Key insight:** At each cell, the decision is binary: take this item (and lose its weight from capacity, gaining its value) or skip it (and keep the best answer from fewer items at the same capacity). The backward iteration in the space-optimized version ensures each item is considered exactly once by reading from "stale" values that have not yet been updated in the current item's pass.

<AlgoViz title="0/1 Knapsack DP — Row by Row" description="Items: (w=2,v=3), (w=3,v=4), (w=4,v=5), (w=5,v=6). Capacity=8. Array shows dp row after each item." steps={[
  { array: [0, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [], variables: { item: "none", row: "i=0" }, explanation: "Base case: no items. All capacities have value 0.", code: "int[] dp = new int[capacity + 1];" },
  { array: [0, 0, 3, 3, 3, 3, 3, 3, 3], highlights: [2, 3, 4, 5, 6, 7, 8], variables: { item: "w=2 v=3", row: "i=1" }, explanation: "Item 0 (w=2, v=3): for c >= 2, dp[c] = max(0, dp[c-2]+3) = 3.", code: "dp[c] = Math.max(dp[c], dp[c-2] + 3);" },
  { array: [0, 0, 3, 4, 4, 7, 7, 7, 7], highlights: [3, 4, 5, 6, 7, 8], variables: { item: "w=3 v=4", row: "i=2" }, explanation: "Item 1 (w=3, v=4): dp[3]=4, dp[5]=max(3,3+4)=7. Items 0+1 fit at c=5.", code: "dp[c] = Math.max(dp[c], dp[c-3] + 4);" },
  { array: [0, 0, 3, 4, 5, 7, 8, 9, 9], highlights: [4, 6, 7, 8], variables: { item: "w=4 v=5", row: "i=3" }, explanation: "Item 2 (w=4, v=5): dp[4]=5, dp[6]=8 (items 0+2), dp[7]=9 (items 1+2).", code: "dp[c] = Math.max(dp[c], dp[c-4] + 5);" },
  { array: [0, 0, 3, 4, 5, 7, 8, 9, 10], highlights: [8], variables: { item: "w=5 v=6", row: "i=4", answer: "10" }, explanation: "Item 3 (w=5, v=6): dp[8]=max(9, dp[3]+6)=max(9,10)=10. Select items 1+3.", code: "dp[8] = Math.max(9, 4+6) = 10;" }
]} />

### Backtracking

- `dp[4][8] = 10 ≠ dp[3][8] = 9` → item 3 selected. Remaining capacity: 8-5=3.
- `dp[3][3] = 4 = dp[2][3] = 4` → item 2 not selected.
- `dp[2][3] = 4 ≠ dp[1][3] = 3` → item 1 selected. Remaining capacity: 3-3=0.
- Done. Selected: **items 1 and 3**.

---

## Pattern Recognition

| Signal in Problem Statement | Likely Technique |
|---|---|
| "Select items with **weight/value** constraint" | 0/1 or unbounded knapsack |
| "Can you **reach sum X** from the array?" | Subset sum (boolean knapsack) |
| "**Number of ways** to make amount" | Counting knapsack (coin change II) |
| "**Minimum coins/items** to reach target" | Unbounded knapsack minimization |
| "**Partition** array into two equal subsets" | Subset sum with target = totalSum/2 |
| "Each item used **at most once**" | 0/1 knapsack (backward iteration) |
| "Each item used **unlimited** times" | Unbounded knapsack (forward iteration) |
| "Each item used **at most k** times" | Bounded knapsack (binary trick) |
| "**Maximize profit** with time/weight limits" | Knapsack (possibly with sorting) |
| "**0s and 1s** count constraint" | Multi-dimensional knapsack (LC 474) |
| "Ordered selection from **piles/groups**" | Group knapsack variant (LC 2218) |

---

## Pattern Recognition Guide

Use this table when reading a problem statement. Scan for the clue phrases below, then apply the corresponding technique.

| Problem Clue | Technique | Why |
|---|---|---|
| "select items, each used at most once, maximize value under weight limit" | 0/1 Knapsack (backward iteration) | Binary take-or-skip decision per item; backward loop prevents item reuse |
| "unlimited supply of items/coins to reach amount" | Unbounded Knapsack (forward iteration) | Forward loop intentionally allows same item to contribute multiple times |
| "can you make exact sum S from array elements" | Subset Sum (boolean 0/1 knapsack) | Weight equals value equals element; `dp[s]` tracks reachability, not optimization |
| "minimum coins/items to reach amount" | Unbounded knapsack minimization | Each coin reusable; `dp[a] = min(dp[a], dp[a-coin] + 1)` with forward iteration |
| "number of ways to make change" (combinations) | Counting knapsack, coins outer loop | Coins-outer prevents counting same coin set in different orders |
| "number of ordered ways to reach target" (permutations) | Counting knapsack, amounts outer loop | Amounts-outer allows reordering, counting `[1,2]` and `[2,1]` separately |
| "partition array into two equal-sum subsets" | Subset sum with `target = totalSum / 2` | Equal partition means each half sums to half; reduces to single-target reachability |
| "assign +/- signs to reach target sum" | Subset sum with `target = (total + target) / 2` | Algebraic reduction: positive subset minus negative subset equals target |
| "two constraints (e.g., count of 0s and count of 1s)" | 2D knapsack with two capacity dimensions | Each constraint becomes a DP dimension; iterate both backwards for 0/1 |
| "select top items from ordered piles/groups" | Group knapsack (prefix selection per group) | Each pile is a group; you take a prefix of 0 to k items, not arbitrary selection |
| "job scheduling with start/end times and profits" | Sort by end time plus binary search plus knapsack DP | Sorting enables binary search for last compatible job; `dp[i] = max(skip, take + dp[prev])` |
| "minimize difference between two partitions" | Subset sum with `target = totalSum / 2` | Find closest achievable sum to half; gap between partitions is `totalSum - 2 * bestSum` |

---

## Problem Set (21 Problems)

### Foundational

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 1 | 416. Partition Equal Subset Sum | Medium | Subset sum with target = sum/2 | [LeetCode 416](https://leetcode.com/problems/partition-equal-subset-sum/) |
| 2 | 494. Target Sum | Medium | Subset sum: find subset with sum `(total + target) / 2` | [LeetCode 494](https://leetcode.com/problems/target-sum/) |
| 3 | 322. Coin Change | Medium | Unbounded knapsack minimization | [LeetCode 322](https://leetcode.com/problems/coin-change/) |
| 4 | 518. Coin Change II | Medium | Unbounded knapsack counting (combinations) | [LeetCode 518](https://leetcode.com/problems/coin-change-ii/) |
| 5 | 279. Perfect Squares | Medium | Unbounded knapsack: squares as coins | [LeetCode 279](https://leetcode.com/problems/perfect-squares/) |
| 6 | 377. Combination Sum IV | Medium | Unbounded permutation counting (swap loop order) | [LeetCode 377](https://leetcode.com/problems/combination-sum-iv/) |
| 7 | 343. Integer Break | Medium | Unbounded knapsack or math (maximize product) | [LeetCode 343](https://leetcode.com/problems/integer-break/) |

### Intermediate

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 8 | 474. Ones and Zeroes | Medium | 2D knapsack: two capacity dimensions (0s and 1s) | [LeetCode 474](https://leetcode.com/problems/ones-and-zeroes/) |
| 9 | 1049. Last Stone Weight II | Medium | Partition into two groups minimizing diff → subset sum | [LeetCode 1049](https://leetcode.com/problems/last-stone-weight-ii/) |
| 10 | 983. Minimum Cost For Tickets | Medium | DP on days with ticket "coins" of size 1, 7, 30 | [LeetCode 983](https://leetcode.com/problems/minimum-cost-for-tickets/) |
| 11 | 1155. Number of Dice Rolls With Target Sum | Medium | Bounded knapsack: each die = item with faces values | [LeetCode 1155](https://leetcode.com/problems/number-of-dice-rolls-with-target-sum/) |
| 12 | 1402. Reducing Dishes | Hard | Sort + greedy/DP: prefix-sum trick for satisfaction | [LeetCode 1402](https://leetcode.com/problems/reducing-dishes/) |
| 13 | 1235. Maximum Profit in Job Scheduling | Hard | Sort by end time + binary search + knapsack DP | [LeetCode 1235](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) |
| 14 | 698. Partition to K Equal Sum Subsets | Medium | Backtracking + bitmask DP for k partitions | [LeetCode 698](https://leetcode.com/problems/partition-to-k-equal-sum-subsets/) |

### Advanced

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 15 | 879. Profitable Schemes | Hard | 3D knapsack: members × min-profit thresholds | [LeetCode 879](https://leetcode.com/problems/profitable-schemes/) |
| 16 | 956. Tallest Billboard | Hard | Meet-in-middle or DP on difference of two rod groups | [LeetCode 956](https://leetcode.com/problems/tallest-billboard/) |
| 17 | 805. Split Array With Same Average | Hard | Subset sum with size constraint + pruning | [LeetCode 805](https://leetcode.com/problems/split-array-with-same-average/) |
| 18 | 2218. Maximum Value of K Coins From Piles | Hard | Group knapsack: select from ordered piles | [LeetCode 2218](https://leetcode.com/problems/maximum-value-of-k-coins-from-piles/) |
| 19 | 2431. Maximize Total Tastiness of Purchased Fruits | Medium | 0/1 knapsack with coupon modification | [LeetCode 2431](https://leetcode.com/problems/maximize-total-tastiness-of-purchased-fruits/) |
| 20 | 2585. Number of Ways to Earn Points | Hard | Bounded knapsack counting across question types | [LeetCode 2585](https://leetcode.com/problems/number-of-ways-to-earn-points/) |
| 21 | 3180. Maximum Total Reward Using Operations | Hard | Subset-sum variant with ordering constraint on rewards | [LeetCode 3180](https://leetcode.com/problems/maximum-total-reward-using-operations-i/) |

---

## Mock Interview

### Problem 1: Coin Change (LC 322)

**Interviewer:** Given coins of denominations `[1, 5, 10, 25]` and an amount of 37 cents, what's the minimum number of coins needed?

**Candidate Approach:**

This is an unbounded knapsack minimization. Each coin can be used unlimited times.

```java
static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)
            if (dp[a - coin] != Integer.MAX_VALUE)
                dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}
```

**Trace for amount=37, coins=[1,5,10,25]:**
- After processing coin=1: `dp = [0, 1, 2, 3, ..., 37]`
- After processing coin=5: `dp[5]=1, dp[10]=2, ..., dp[37]=min(33, dp[32]+1)=...`
- After processing coin=10: `dp[10]=1, dp[20]=2, dp[30]=3, dp[35]=4, dp[37]=min(prev, dp[27]+1)`
- After processing coin=25: `dp[25]=1, dp[30]=2, dp[35]=2, dp[37]=min(prev, dp[12]+1)=min(prev, 4)`

Final: `dp[37] = 4` (25 + 10 + 1 + 1).

**Follow-up Questions:**

**Q: What if we also want to know which coins were used?**
A: Track a `parent` array: `parent[a] = coin` that achieved the minimum. Backtrack from `amount`:
```java
static int[] coinChangeReconstruct(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    int[] parent = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    Arrays.fill(parent, -1);
    dp[0] = 0;
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)
            if (dp[a - coin] != Integer.MAX_VALUE && dp[a - coin] + 1 < dp[a]) {
                dp[a] = dp[a - coin] + 1;
                parent[a] = coin;
            }
    if (dp[amount] == Integer.MAX_VALUE) return new int[]{};
    List<Integer> result = new ArrayList<>();
    int a = amount;
    while (a > 0) { result.add(parent[a]); a -= parent[a]; }
    return result.stream().mapToInt(Integer::intValue).toArray();
}
```

**Q: The DP is O(amount × len(coins)). What if amount is very large (e.g., 10^9)?**
A: For the specific case of standard currency denominations (1, 5, 10, 25), greedy works optimally. For arbitrary denominations, if the number of distinct coins is small, consider BFS (it finds the shortest path and terminates early). For mathematical structure (e.g., denominations that are multiples), use the Chicken McNugget theorem or Frobenius numbers to reason about reachability.

**Q: How does BFS compare to DP for this problem?**
A: BFS is equivalent to DP but explores level-by-level (by number of coins). It can be faster when the answer is small because it stops as soon as it reaches `amount`. DP always fills the entire table. Worst-case, both are O(amount × coins). BFS uses O(amount) queue space.

**Q: What about Coin Change II (counting ways)?**
A: Change `min` to `+` and initialize `dp[0] = 1`. The critical difference is loop order: coins in the outer loop gives **combinations**; amounts in the outer loop gives **permutations**.

---

### Problem 2: Partition Equal Subset Sum (LC 416)

**Interviewer:** Given a non-empty array of positive integers, determine if it can be partitioned into two subsets with equal sum.

**Candidate Approach:**

If total sum is odd, return False immediately. Otherwise, this reduces to: "can we find a subset summing to `total // 2`?" — a classic subset sum (0/1 knapsack with boolean DP).

```java
static boolean canPartition(int[] nums) {
    int total = 0;
    for (int n : nums) total += n;
    if (total % 2 != 0) return false;
    int target = total / 2;

    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums)
        for (int s = target; s >= num; s--)
            dp[s] = dp[s] || dp[s - num];
    return dp[target];
}
```

**Time:** O(n × target). **Space:** O(target).

**Follow-up Questions:**

**Q: Can you use a bitset to speed this up?**
A: Yes. Represent `dp` as a `BitSet` where bit `k` is set if sum `k` is achievable. For each number, OR the shifted bitset with itself. Java's `BitSet` handles arbitrary-precision bit operations efficiently.
```java
static boolean canPartitionBitset(int[] nums) {
    int total = 0;
    for (int n : nums) total += n;
    if (total % 2 != 0) return false;
    int target = total / 2;
    BitSet dp = new BitSet(target + 1);
    dp.set(0); // sum 0 is achievable
    for (int num : nums) {
        // Iterate backwards to avoid reusing the same num
        for (int s = target; s >= num; s--)
            if (dp.get(s - num)) dp.set(s);
    }
    return dp.get(target);
}
```

**Q: What if we need to partition into k equal subsets (LC 698)?**
A: Subset sum DP doesn't extend directly to k > 2. Use backtracking with pruning, or bitmask DP where `dp[mask]` tracks the remaining capacity in the current bucket after assigning the elements in `mask`. The bitmask approach is O(2^n × n) which works for n ≤ 20.

**Q: What if elements can be negative?**
A: Shift all values by adding `|min_val|` so everything is non-negative, then adjust the target. Alternatively, use a hash map instead of an array for the DP state.

**Q: What's the time complexity, and can we do better?**
A: O(n × sum/2). Under SETH (Strong Exponential Time Hypothesis), this is essentially optimal for general instances. The bitset optimization gives a practical speedup but doesn't change the asymptotic bound.

---

## Tips and Pitfalls

### Forward vs. Backward Iteration

This is the single most important detail in knapsack DP:

| Knapsack Type | Inner Loop Direction | Why |
|---|---|---|
| 0/1 (each item once) | **Backwards** (`capacity → w[i]`) | Prevents reusing an item within the same row |
| Unbounded (unlimited) | **Forwards** (`w[i] → capacity`) | Intentionally allows reuse from current row |
| Bounded (k copies) | Use binary trick → 0/1 | Reduces to 0/1 with O(log k) items per original |

**Debugging tip:** If your 0/1 knapsack gives values that are too high, you're probably iterating forwards and accidentally reusing items.

### Boolean DP vs. Counting DP

| Task | DP Type | Initialization | Update |
|---|---|---|---|
| "Can we reach target?" | Boolean | `dp[0] = true` | `dp[s] = dp[s] \|\| dp[s - num]` |
| "How many ways to reach target?" | Counting | `dp[0] = 1` | `dp[s] += dp[s - num]` |
| "Min items to reach target?" | Minimization | `dp[0] = 0`, rest `MAX_VALUE` | `Math.min(dp[s], dp[s-num] + 1)` |
| "Max value within capacity?" | Maximization | `dp = new int[cap+1]` | `Math.max(dp[c], dp[c-w] + v)` |

### Handling Large Capacities

When the capacity (or target sum) is very large (e.g., 10^8) but item values are small, standard knapsack is too slow. Flip the DP:

**Value-based DP:** Instead of `dp[capacity] = max_value`, use `dp[value] = min_weight`. Then find the largest value where `dp[value] <= capacity`.

```java
static int knapsackLargeCapacity(int[] weights, int[] values, int capacity) {
    int maxVal = 0;
    for (int v : values) maxVal += v;
    int[] dp = new int[maxVal + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int i = 0; i < weights.length; i++)
        for (int v = maxVal; v >= values[i]; v--)
            if (dp[v - values[i]] != Integer.MAX_VALUE)
                dp[v] = Math.min(dp[v], dp[v - values[i]] + weights[i]);
    for (int v = maxVal; v >= 0; v--)
        if (dp[v] <= capacity)
            return v;
    return 0;
}
```

**Time:** O(n × sum_of_values) instead of O(n × capacity). This is better when values are small but capacity is huge.

### Common Transformations

Many problems don't look like knapsack at first. Here are common reductions:

1. **"Partition into two groups minimizing difference"** → Subset sum with target = totalSum/2. Answer = totalSum - 2 × best_achievable. (LC 1049)

2. **"Assign + or - to each number to reach target"** → Find subset with sum `(total + target) / 2`. (LC 494)

3. **"Minimum cost to travel on given days"** → DP on days with tickets as items of different durations. (LC 983)

4. **"Select from piles in order"** → Group knapsack where each pile is a group and you take a prefix. (LC 2218)

5. **"Job scheduling with profits"** → Sort by end time, binary search for last non-overlapping job, knapsack-style DP. (LC 1235)

### Overflow and Edge Cases

1. **Target = 0:** Always achievable (empty subset). Make sure `dp[0]` is initialized correctly.

2. **All zeros in array:** Every partition works. Handle separately if needed.

3. **Single element:** Can only reach 0 or that element. The DP handles this naturally.

4. **Large values with modular arithmetic:** When counting (e.g., LC 1155, LC 2585), take results modulo 10^9 + 7 at each step to prevent overflow.

5. **Negative numbers in subset sum:** Standard array-based DP doesn't handle negative indices. Use offset (shift by `|min_possible_sum|`) or a hash map.
