---
sidebar_position: 12
title: "Week 11: DP II + Greedy"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 11: Dynamic Programming II + Greedy

Last week you built your 1D DP foundation — climbing stairs, house robber, coin change. This week the table gains a **second dimension** and entirely new problem families appear: **string matching**, **subsequence problems**, **knapsack variants**, and **greedy algorithms**. These patterns are among the most frequently tested in interviews at every level.

---

## 1 · Core Theory

### 1.1 Two-Dimensional DP

When a problem's state depends on **two changing parameters**, we need a 2D table. The three most common flavours:

| Flavour | State meaning | Example |
|---|---|---|
| Grid paths | `dp[i][j]` = ways/cost to reach cell (i, j) | Unique Paths, Minimum Path Sum |
| Two-string comparison | `dp[i][j]` = answer using first i chars of s1 and first j chars of s2 | LCS, Edit Distance |
| Knapsack | `dp[i][w]` = best value using first i items with capacity w | 0/1 Knapsack, Target Sum |

**General approach:**

1. Define what `dp[i][j]` represents precisely.
2. Find the **recurrence** — how `dp[i][j]` relates to smaller subproblems.
3. Identify **base cases** (first row, first column, or both).
4. Fill the table in the correct **order** (usually top-to-bottom, left-to-right).
5. Return `dp[m][n]` (or whichever cell holds the final answer).

### 1.2 Grid DP

Grid DP is the most visual form of 2D DP. You traverse a matrix and compute each cell from its neighbours.

**Unique Paths (LC 62):** Count paths from top-left to bottom-right moving only right or down.

```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

**With obstacles (LC 63):** If `grid[i][j]` is blocked, `dp[i][j] = 0`. Otherwise same recurrence.

**Minimum Path Sum (LC 64):** Instead of counting, minimise:

```
dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])
```

Space optimisation: since each row only depends on the current and previous row, you can compress to a single 1D array updated left-to-right.

<AlgoViz
  title="Unique Paths: 3×4 Grid DP"
  description="Count paths from top-left to bottom-right moving only right or down. dp[i][j] = dp[i-1][j] + dp[i][j-1]. The grid is represented as a flat array of 12 values (3 rows x 4 cols)."
  steps={[
    { array: [0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [], variables: { rows: 3, cols: 4, formula: "dp[i][j] = dp[i-1][j] + dp[i][j-1]" }, explanation: "Initialise a 3x4 dp grid with all zeros. We need to fill it so dp[i][j] = number of unique paths to reach cell (i,j).", code: "int[][] dp = new int[3][4];" },
    { array: [1,1,1,1, 0,0,0,0, 0,0,0,0], highlights: [0,1,2,3], variables: { row: 0, reason: "Only one way to reach any cell in row 0: keep going right" }, explanation: "Fill row 0: there is exactly 1 path to every cell in the first row (move right repeatedly).", code: "for (int j = 0; j < 4; j++) dp[0][j] = 1;" },
    { array: [1,1,1,1, 1,0,0,0, 1,0,0,0], highlights: [4,8], variables: { col: 0, reason: "Only one way to reach any cell in col 0: keep going down" }, explanation: "Fill column 0: there is exactly 1 path to every cell in the first column (move down repeatedly).", code: "for (int i = 0; i < 3; i++) dp[i][0] = 1;" },
    { array: [1,1,1,1, 1,2,0,0, 1,0,0,0], highlights: [5], secondary: [1,4], variables: { i: 1, j: 1, "dp[0][1]": 1, "dp[1][0]": 1, "dp[1][1]": "1+1=2" }, explanation: "dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2. Two paths: right-then-down or down-then-right.", code: "dp[1][1] = dp[0][1] + dp[1][0]; // 2" },
    { array: [1,1,1,1, 1,2,3,4, 1,0,0,0], highlights: [6,7], secondary: [5], variables: { "dp[1][2]": "1+2=3", "dp[1][3]": "1+3=4" }, explanation: "Continue row 1: dp[1][2]=1+2=3, dp[1][3]=1+3=4. More paths become available as we move right.", code: "dp[1][2] = dp[0][2] + dp[1][1]; // 3\ndp[1][3] = dp[0][3] + dp[1][2]; // 4" },
    { array: [1,1,1,1, 1,2,3,4, 1,3,6,10], highlights: [9,10,11], secondary: [5,6,7], variables: { "dp[2][1]": "2+1=3", "dp[2][2]": "3+3=6", "dp[2][3]": "4+6=10" }, explanation: "Row 2: dp[2][1]=3, dp[2][2]=6, dp[2][3]=10. Each cell sums the paths from above and from the left.", code: "dp[2][1] = dp[1][1] + dp[2][0]; // 3\ndp[2][2] = dp[1][2] + dp[2][1]; // 6\ndp[2][3] = dp[1][3] + dp[2][2]; // 10" },
    { array: [1,1,1,1, 1,2,3,4, 1,3,6,10], highlights: [11], variables: { answer: 10, grid: "3x4" }, explanation: "Answer: dp[2][3] = 10. There are 10 unique paths from the top-left to the bottom-right of a 3x4 grid.", code: "return dp[2][3]; // 10" }
  ]}
/>

### 1.3 Longest Common Subsequence (LCS)

**Why this technique exists.** Many real-world problems involve comparing two sequences — DNA alignment, version-control diffs, spell-check suggestions. Brute-forcing all subsequences of one string and checking each against the other is exponential (there are 2^n subsequences of a string of length n). LCS exploits the fact that the problem has **optimal substructure** and **overlapping subproblems**: the LCS of two strings can be built from the LCS of their prefixes, and the same prefix pairs recur many times during recursion. A 2D DP table collapses exponential work into polynomial time.

**Intuition.** Imagine laying both strings side by side and trying to draw lines connecting matching characters — no two lines can cross. The LCS is the maximum number of non-crossing lines you can draw. When characters match, you *must* use them (extending the diagonal). When they do not, you try dropping a character from each string independently and take the better result.

**Interview signals.** Look for phrases like "longest common," "subsequence" (not substring — that is a different problem), "minimum deletions to make two strings equal" (which equals `m + n - 2 * LCS`), or "find the overlap between two sequences."

**Common mistakes.** Confusing subsequence with substring (subsequence need not be contiguous). Forgetting the base-case row and column of zeros. Off-by-one errors from mixing 0-indexed strings with 1-indexed DP tables.

Given two strings `text1` and `text2`, find the length of their longest common subsequence.

**State:** `dp[i][j]` = LCS length of `text1[0..i-1]` and `text2[0..j-1]`.

**Recurrence:**

```
if text1[i-1] == text2[j-1]:
    dp[i][j] = dp[i-1][j-1] + 1
else:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

**Base case:** `dp[0][j] = dp[i][0] = 0` (empty string has LCS 0 with anything).

**Why it works:** When characters match, they extend the LCS by one. When they don't, the LCS is the better of skipping one character from either string.

### 1.4 Edit Distance (Levenshtein Distance)

Given two strings `word1` and `word2`, find the minimum number of operations (insert, delete, replace) to transform one into the other.

**State:** `dp[i][j]` = minimum edits to convert `word1[0..i-1]` to `word2[0..j-1]`.

**Recurrence:**

```
if word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]           // no edit needed
else:
    dp[i][j] = 1 + min(
        dp[i-1][j],                    // delete from word1
        dp[i][j-1],                    // insert into word1
        dp[i-1][j-1]                   // replace
    )
```

**Base cases:** `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).

### 1.5 Longest Increasing Subsequence (LIS)

Find the length of the longest strictly increasing subsequence.

**O(n²) DP approach:** `dp[i]` = LIS ending at index i.

```
dp[i] = 1 + max(dp[j] for all j < i where nums[j] < nums[i])
```

**O(n log n) patience sorting approach:** Maintain an array `tails` where `tails[k]` is the smallest tail element of any increasing subsequence of length k+1. For each number, binary search for its position.

### 1.6 The 0/1 Knapsack Pattern

Given items with weights and values, and a capacity W, maximise value without exceeding capacity. Each item is used **at most once** (0/1 choice).

**State:** `dp[i][w]` = max value using items `0..i-1` with capacity w.

**Recurrence:**

```
dp[i][w] = max(
    dp[i-1][w],                              // skip item i
    dp[i-1][w - weight[i]] + value[i]        // take item i (if w >= weight[i])
)
```

**Variants:**
- **Unbounded knapsack** (Coin Change II): items can repeat — use `dp[i][w - weight[i]]` instead of `dp[i-1][w - weight[i]]`.
- **Target Sum** (LC 494): partition items into two groups — reduces to subset sum, a knapsack variant.
- **Ones and Zeroes** (LC 474): two-dimensional capacity (number of 0s and 1s).

### 1.7 String Matching DP

Problems like Regular Expression Matching (LC 10) and Wildcard Matching (LC 44) use 2D DP where `dp[i][j]` indicates whether a prefix of the string matches a prefix of the pattern.

Key insight for `*` handling:
- **Regex `*`:** matches zero or more of the **preceding** character — `dp[i][j] = dp[i][j-2]` (zero occurrences) or `dp[i-1][j]` if current char matches (one more occurrence).
- **Wildcard `*`:** matches any sequence — `dp[i][j] = dp[i-1][j]` (absorb one char) or `dp[i][j-1]` (treat as empty).

### 1.8 Greedy Algorithms

**Why greedy exists (and when it beats DP).** DP considers every possible decision path and picks the best one — powerful but potentially expensive. A greedy algorithm shortcuts this by making one locally optimal choice at each step and never looking back. When a problem has the *greedy choice property* (a local optimum leads to a global optimum), greedy gives the same answer as DP but often in O(n log n) or O(n) instead of O(n^2) or worse. The trade-off: greedy only works when you can prove local choices compose into a global optimum. If that proof fails, you must fall back to DP.

**Intuition.** Think of a buffet line where each dish has a cost and a satisfaction score, and you can only carry one plate. A greedy diner always picks the highest-satisfaction dish available. This works if the dishes do not interact — but if eating dessert first ruins your appetite for the main course, you need the DP approach of considering all meal orderings.

**Interview signals.** Look for phrases like "maximum number of non-overlapping," "minimum number of actions," "can you reach the end," "partition into fewest groups," or any problem where sorting by one attribute (end time, deadline, ratio) simplifies the decision. If the problem says "find ALL solutions" rather than "find the best," greedy is unlikely to be the right tool — you probably need backtracking or DP.

**Common mistakes.** Assuming a problem is greedy without proof (many problems that *look* greedy actually require DP — e.g., coin change with arbitrary denominations). Sorting by the wrong attribute (e.g., sorting intervals by start time when end time is needed for activity selection). Forgetting to handle ties carefully.

A greedy algorithm makes the **locally optimal choice** at each step, hoping to find the global optimum. Unlike DP, it never reconsiders past choices.

**When greedy works:** The problem must exhibit two properties:

1. **Greedy choice property:** A globally optimal solution can be constructed by making locally optimal choices.
2. **Optimal substructure:** An optimal solution contains optimal solutions to subproblems.

**Proving a greedy algorithm correct** (interview-level):

1. **Exchange argument:** Show that any optimal solution can be transformed into the greedy solution without worsening the objective.
2. **Stays ahead:** Show that at every step, the greedy solution is at least as good as any other.

### 1.9 Classic Greedy Patterns

**Interval scheduling / Activity selection:**
- Sort intervals by **end time**.
- Greedily pick the earliest-ending interval that doesn't overlap with the last picked.
- Maximises the number of non-overlapping intervals.

**Jump Game (LC 55):**
- Track the farthest index reachable so far.
- If current index exceeds the farthest reachable, return false.

**Jump Game II (LC 45):**
- BFS-like: track the current "level" boundary and the farthest reach within it.
- Each time you pass a boundary, increment jumps.

**Gas Station (LC 134):**
- If total gas &gt;= total cost, a solution exists.
- Track running surplus; whenever it drops negative, reset start to the next station.

**Partition Labels (LC 763):**
- Record the last occurrence of each character.
- Extend the current partition's end to the farthest last-occurrence of any character seen.

---

## 2 · Code Templates

### When to use Template 1 — Longest Common Subsequence

**Pattern:** Two-sequence comparison where order matters but elements need not be contiguous.

**Problem characteristics:** You are given two strings or arrays and asked for the longest/shortest common subsequence, the minimum deletions/insertions to make them equal, or the number of ways to interleave them. The key signal is that the answer depends on matching elements across two sequences while preserving relative order.

**How to adapt:** For "minimum deletions to make equal," the answer is `m + n - 2 * LCS`. For "longest common substring" (contiguous), reset `dp[i][j] = 0` on mismatch instead of taking the max. For "shortest common supersequence," the answer is `m + n - LCS`.

**Complexity in plain English:** You fill an m-by-n table one cell at a time, each cell doing constant work. Total time is proportional to the product of the two string lengths. Space can be reduced to a single row if you only need the length (not the reconstruction).

### Template 1 — Longest Common Subsequence

```java
import java.util.*;

public static int lcs(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[m][n];
}
```

<AlgoViz
  title="Longest Common Subsequence: s1='ABCDE', s2='ACE'"
  description="Fill a 2D DP table comparing two strings. When characters match, extend the diagonal. Otherwise take the max of the cell above or to the left. Track the LCS length growing from 0 to 3."
  steps={[
    { array: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], array2: ["","A","C","E","A","B","C","D","E"], highlights: [], variables: { s1: "ABCDE", s2: "ACE", table: "6x4 (rows=s1+1, cols=s2+1)" }, explanation: "Initialise a 6x4 dp table with all zeros. Row 0 and column 0 are base cases (empty string has LCS 0 with anything).", code: "int[][] dp = new int[6][4]; // all zeros" },
    { array: [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [5], variables: { i: 1, j: 1, "s1[0]": "A", "s2[0]": "A", match: "true", "dp[1][1]": "0+1=1" }, explanation: "i=1, j=1: 'A'=='A' -- match! dp[1][1] = dp[0][0]+1 = 1. First character of the LCS found.", code: "dp[1][1] = dp[0][0] + 1; // 1" },
    { array: [0,0,0,0, 0,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [6,7], variables: { "row1": "[0,1,1,1]", note: "'A' vs 'C','E' no match, propagate 1" }, explanation: "Row 1 complete: 'A' matches only 'A' in s2. The value 1 propagates rightward.", code: "dp[1][2] = max(dp[0][2], dp[1][1]); // 1" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [9,10,11], variables: { i: 2, char: "B", note: "No matches in s2" }, explanation: "Row 2 (char='B'): 'B' does not match any of 'A','C','E'. All values propagate from row above: [0,1,1,1].", code: "// 'B' != 'A','C','E' -> max from above" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,0,0,0, 0,0,0,0], highlights: [14], secondary: [9], variables: { i: 3, j: 2, "s1[2]": "C", "s2[1]": "C", match: "true", "dp[3][2]": "1+1=2" }, explanation: "i=3, j=2: 'C'=='C' -- match! dp[3][2] = dp[2][1]+1 = 2. LCS grows to length 2.", code: "dp[3][2] = dp[2][1] + 1; // 2" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,0,0,0], highlights: [17,18,19], variables: { i: 4, char: "D", note: "No new matches" }, explanation: "Row 4 (char='D'): no matches with 'A','C','E'. Values propagate: [0,1,2,2].", code: "// 'D' != 'A','C','E' -> max from above" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,1,2,3], highlights: [23], secondary: [18], variables: { i: 5, j: 3, "s1[4]": "E", "s2[2]": "E", match: "true", "dp[5][3]": "2+1=3" }, explanation: "i=5, j=3: 'E'=='E' -- match! dp[5][3] = dp[4][2]+1 = 3. LCS is complete!", code: "dp[5][3] = dp[4][2] + 1; // 3" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,1,2,3], highlights: [5,14,23], variables: { answer: 3, LCS: "ACE", path: "diagonal matches at (1,1),(3,2),(5,3)" }, explanation: "Answer: dp[5][3] = 3. Backtrack along diagonal matches to reconstruct: LCS = 'ACE'.", code: "return dp[m][n]; // 3" }
  ]}
/>

### Template 2 — Edit Distance

```java
public static int minDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],      // delete
                    Math.min(
                        dp[i][j - 1],  // insert
                        dp[i - 1][j - 1] // replace
                    )
                );
            }
        }
    }

    return dp[m][n];
}
```

### Template 3 — 0/1 Knapsack

```java
public static int knapsack(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= capacity; w++) {
            dp[i][w] = dp[i - 1][w]; // skip item
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(
                    dp[i][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1] // take item
                );
            }
        }
    }

    return dp[n][capacity];
}

/** Space-optimised to O(capacity). Iterate capacity BACKWARDS to preserve 0/1 property. */
public static int knapsackOptimised(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];

    for (int i = 0; i < weights.length; i++) {
        for (int w = capacity; w >= weights[i]; w--) {
            dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }

    return dp[capacity];
}
```

### Template 4 — Greedy Interval Scheduling

```java
public static int maxNonOverlapping(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // sort by end time
    int count = 0;
    int prevEnd = Integer.MIN_VALUE;

    for (int[] interval : intervals) {
        if (interval[0] >= prevEnd) {
            count++;
            prevEnd = interval[1];
        }
    }

    return count;
}
```

<AlgoViz
  title="Greedy Activity Selection"
  description="Given intervals [[1,3],[2,5],[4,7],[6,8],[5,9]], sort by end time and greedily pick the earliest-ending non-overlapping interval. This maximises the number of activities."
  steps={[
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [], variables: { intervals: "[[1,3],[2,5],[4,7],[6,8],[5,9]]", step: "Unsorted input" }, explanation: "Input: 5 intervals. First step: sort by end time to enable the greedy strategy.", code: "Arrays.sort(intervals, (a, b) -> a[1] - b[1]);" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [0,1], variables: { sorted: "[[1,3],[2,5],[4,7],[6,8],[5,9]]", note: "Already sorted by end time" }, explanation: "Sorted by end time: [[1,3],[2,5],[4,7],[6,8],[5,9]]. Already in order here.", code: "// sorted by end: 3, 5, 7, 8, 9" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [0,1], variables: { selected: "[[1,3]]", prevEnd: 3, count: 1 }, explanation: "Pick first interval [1,3]. It always starts our selection (earliest end time). Set prevEnd=3.", code: "count = 1; prevEnd = 3; // pick [1,3]" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], secondary: [2,3], variables: { check: "[2,5]", "2 >= 3": "false", result: "SKIP" }, explanation: "Check [2,5]: start=2, but prevEnd=3. Since 2 is less than 3, this overlaps with [1,3]. Skip it.", code: "// 2 < 3 -> overlaps, skip [2,5]" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [0,1,4,5], variables: { check: "[4,7]", "4 >= 3": "true", selected: "[[1,3],[4,7]]", prevEnd: 7, count: 2 }, explanation: "Check [4,7]: start=4 >= prevEnd=3. No overlap! Pick it. Update prevEnd=7.", code: "count = 2; prevEnd = 7; // pick [4,7]" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [0,1,4,5,6,7], secondary: [8,9], variables: { check: "[6,8]", "6 >= 7": "false", skip: "[6,8]", check2: "[5,9]", "5 >= 7": "false", skip2: "[5,9]" }, explanation: "[6,8]: start=6 is less than prevEnd=7 -- overlaps, skip. [5,9]: start=5 is less than 7 -- overlaps, skip.", code: "// 6 < 7 -> skip [6,8]\n// 5 < 7 -> skip [5,9]" },
    { array: [1,3, 2,5, 4,7, 6,8, 5,9], highlights: [0,1,4,5], variables: { answer: 2, selected: "[[1,3],[4,7]]", maxActivities: 2 }, explanation: "Done! Maximum 2 non-overlapping activities: [1,3] and [4,7]. The greedy choice (earliest end) is provably optimal.", code: "return count; // 2" }
  ]}
/>

### Template 5 — Longest Increasing Subsequence (O(n log n))

```java
import java.util.*;

public static int lis(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1);
        if (pos == tails.size()) {
            tails.add(num);
        } else {
            tails.set(pos, num);
        }
    }
    return tails.size();
}
```

---

## 3 · Complexity Reference

| Algorithm / Pattern | Time | Space | Notes |
|---|---|---|---|
| LCS (2D DP) | O(m·n) | O(m·n) | O(min(m,n)) with rolling array |
| Edit Distance | O(m·n) | O(m·n) | O(n) with rolling array |
| LIS (DP) | O(n²) | O(n) | Quadratic baseline |
| LIS (patience sort) | O(n log n) | O(n) | Optimal |
| 0/1 Knapsack | O(n·W) | O(n·W) | O(W) with 1D array (reverse iteration) |
| Unbounded Knapsack | O(n·W) | O(W) | Forward iteration on capacity |
| Grid DP (m x n) | O(m·n) | O(m·n) | O(n) with single row |
| Regex / Wildcard Matching | O(m·n) | O(m·n) | Pattern × string |
| Greedy interval scheduling | O(n log n) | O(1) | Sort dominates |
| Jump Game | O(n) | O(1) | Single pass |
| Gas Station | O(n) | O(1) | Single pass |
| Partition Labels | O(n) | O(1) | Two passes (26-char alphabet) |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "longest common subsequence of two strings" | 2D DP comparing prefixes | LCS (Template 1) |
| "minimum operations to convert string A to B" | Edit distance with insert/delete/replace | Edit Distance (Template 2) |
| "select items with a weight budget, each used once" | 0/1 knapsack, iterate capacity backwards | Knapsack (Template 3) |
| "can you reach the end of the array?" | Track farthest reachable index greedily | Jump Game greedy |
| "maximum non-overlapping intervals" | Sort by end time, greedy pick earliest finish | Interval Scheduling (Template 4) |
| "longest increasing subsequence" | Patience sorting with binary search on tails | LIS (Template 5) |
| "partition into two equal-sum subsets" | Reduce to 0/1 knapsack with target = sum/2 | Knapsack (Template 3) |
| "count ways to make change using unlimited coins" | Unbounded knapsack, iterate capacity forwards | Unbounded Knapsack variant |
| "match string against a pattern with wildcards" | 2D DP over string prefix vs pattern prefix | String Matching DP |
| "minimum cost path through a grid" | Grid DP: each cell = grid value + min of top/left | Grid DP |

---

## 4 · Worked Example: Longest Common Subsequence

**Why not brute force?** A brute-force approach would generate all 2^m subsequences of `text1` and check each against `text2` — that is exponential and completely infeasible for strings of any meaningful length. Even the smarter approach of checking all O(m * n) subarray pairs is O(m * n * min(m, n)) because each comparison takes linear time. The DP approach achieves O(m * n) by reusing previously computed prefix comparisons, turning an exponential problem into a polynomial one.

**Key insight:** The DP table embodies a simple but powerful observation — if the current characters match, they *extend* the best solution from both prefixes shortened by one. If they do not match, the answer cannot be worse than the better of "skip a character from text1" or "skip a character from text2." This two-way choice at every cell is what gives the recurrence its structure.

**Problem:** Given `text1 = "abcde"` and `text2 = "ace"`, find the length of the longest common subsequence.

**Step 1 — Define the table.**

Create a (6 × 4) table where `dp[i][j]` = LCS length of `text1[0..i-1]` and `text2[0..j-1]`.

Initialise row 0 and column 0 to 0 (empty string vs anything = 0).

```
        ""    a    c    e
  ""  [  0    0    0    0 ]
   a  [  0    .    .    . ]
   b  [  0    .    .    . ]
   c  [  0    .    .    . ]
   d  [  0    .    .    . ]
   e  [  0    .    .    . ]
```

**Step 2 — Fill row by row.**

**Row 1 (i=1, char='a'):**

- j=1, char='a': `'a' == 'a'` → `dp[1][1] = dp[0][0] + 1 = 1`
- j=2, char='c': `'a' != 'c'` → `dp[1][2] = max(dp[0][2], dp[1][1]) = max(0, 1) = 1`
- j=3, char='e': `'a' != 'e'` → `dp[1][3] = max(dp[0][3], dp[1][2]) = max(0, 1) = 1`

```
        ""    a    c    e
  ""  [  0    0    0    0 ]
   a  [  0    1    1    1 ]
```

**Row 2 (i=2, char='b'):**

- j=1, char='a': `'b' != 'a'` → `max(dp[1][1], dp[2][0]) = max(1, 0) = 1`
- j=2, char='c': `'b' != 'c'` → `max(dp[1][2], dp[2][1]) = max(1, 1) = 1`
- j=3, char='e': `'b' != 'e'` → `max(dp[1][3], dp[2][2]) = max(1, 1) = 1`

```
   b  [  0    1    1    1 ]
```

**Row 3 (i=3, char='c'):**

- j=1, char='a': `'c' != 'a'` → `max(dp[2][1], dp[3][0]) = max(1, 0) = 1`
- j=2, char='c': `'c' == 'c'` → `dp[2][1] + 1 = 1 + 1 = 2` ← match extends LCS
- j=3, char='e': `'c' != 'e'` → `max(dp[2][3], dp[3][2]) = max(1, 2) = 2`

```
   c  [  0    1    2    2 ]
```

**Row 4 (i=4, char='d'):**

- j=1: `'d' != 'a'` → `max(1, 0) = 1`
- j=2: `'d' != 'c'` → `max(2, 1) = 2`
- j=3: `'d' != 'e'` → `max(2, 2) = 2`

```
   d  [  0    1    2    2 ]
```

**Row 5 (i=5, char='e'):**

- j=1: `'e' != 'a'` → `max(1, 0) = 1`
- j=2: `'e' != 'c'` → `max(2, 1) = 2`
- j=3: `'e' == 'e'` → `dp[4][2] + 1 = 2 + 1 = 3` ← final match

```
   e  [  0    1    2    3 ]
```

**Final table:**

```
        ""    a    c    e
  ""  [  0    0    0    0 ]
   a  [  0    1    1    1 ]
   b  [  0    1    1    1 ]
   c  [  0    1    2    2 ]
   d  [  0    1    2    2 ]
   e  [  0    1    2    3 ]
```

**Answer:** `dp[5][3] = 3`. The LCS is `"ace"`.

**Step 3 — Reconstruct the subsequence (backtrack).**

Start at `dp[5][3]`. At each cell:
- If characters match, include the character and move diagonally ↖ to `dp[i-1][j-1]`.
- Otherwise, move in the direction of the larger value (up or left).

```
dp[5][3]: 'e' == 'e' → include 'e', go to dp[4][2]
dp[4][2]: 'd' != 'c' → dp[3][2] >= dp[4][1] → go up to dp[3][2]
dp[3][2]: 'c' == 'c' → include 'c', go to dp[2][1]
dp[2][1]: 'b' != 'a' → dp[1][1] >= dp[2][0] → go up to dp[1][1]
dp[1][1]: 'a' == 'a' → include 'a', go to dp[0][0]
dp[0][0]: done
```

Collected in reverse: `e, c, a` → reversed: **`"ace"`**.

<AlgoViz
  title="LCS Table Fill: text1='abcde', text2='ace'"
  description="Watch how the 2D DP table fills row by row. When characters match (highlighted green), the diagonal value increments. Otherwise the cell takes the max of the cell above and to the left."
  steps={[
    { array: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [], variables: { rows: "6 (indices 0-5)", cols: "4 (indices 0-3)", text1: "abcde", text2: "ace" }, explanation: "Initialise dp table (6×4) with all zeros. Row 0 and column 0 are base cases.", code: "int[][] dp = new int[6][4];" },
    { array: [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [5], variables: { i: 1, j: 1, "text1[0]": "a", "text2[0]": "a", match: "true" }, explanation: "i=1, j=1: 'a'=='a' → dp[1][1] = dp[0][0]+1 = 1. Characters match — take diagonal + 1.", code: "dp[1][1] = dp[0][0] + 1; // 1" },
    { array: [0,0,0,0, 0,1,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [6], variables: { i: 1, j: 2, "text1[0]": "a", "text2[1]": "c", match: "false" }, explanation: "i=1, j=2: 'a'!='c' → dp[1][2] = max(dp[0][2], dp[1][1]) = max(0,1) = 1.", code: "dp[1][2] = Math.max(dp[0][2], dp[1][1]); // 1" },
    { array: [0,0,0,0, 0,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [7], variables: { i: 1, j: 3, "text1[0]": "a", "text2[2]": "e", match: "false" }, explanation: "i=1, j=3: 'a'!='e' → dp[1][3] = max(dp[0][3], dp[1][2]) = 1. Row 1 complete.", code: "dp[1][3] = Math.max(dp[0][3], dp[1][2]); // 1" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0], highlights: [9,10,11], variables: { i: 2, char: "b", row: "[0, 1, 1, 1]" }, explanation: "Row 2 (char='b'): no matches with 'a','c','e'. Values propagate from row above: [0,1,1,1].", code: "// 'b' != 'a','c','e' → all max from above" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,0, 0,0,0,0, 0,0,0,0], highlights: [14], variables: { i: 3, j: 2, "text1[2]": "c", "text2[1]": "c", match: "true" }, explanation: "i=3, j=2: 'c'=='c' → dp[3][2] = dp[2][1]+1 = 1+1 = 2. Second match found!", code: "dp[3][2] = dp[2][1] + 1; // 2" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,0,0,0, 0,0,0,0], highlights: [15], variables: { i: 3, j: 3, "text1[2]": "c", "text2[2]": "e", match: "false" }, explanation: "i=3, j=3: 'c'!='e' → dp[3][3] = max(dp[2][3], dp[3][2]) = max(1,2) = 2.", code: "dp[3][3] = Math.max(dp[2][3], dp[3][2]); // 2" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,0,0,0], highlights: [17,18,19], variables: { i: 4, char: "d", row: "[0, 1, 2, 2]" }, explanation: "Row 4 (char='d'): no matches. Values propagate: [0,1,2,2].", code: "// 'd' != 'a','c','e' → all max from above" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,1,2,3], highlights: [23], variables: { i: 5, j: 3, "text1[4]": "e", "text2[2]": "e", match: "true" }, explanation: "i=5, j=3: 'e'=='e' → dp[5][3] = dp[4][2]+1 = 2+1 = 3. Third match — LCS complete!", code: "dp[5][3] = dp[4][2] + 1; // 3" },
    { array: [0,0,0,0, 0,1,1,1, 0,1,1,1, 0,1,2,2, 0,1,2,2, 0,1,2,3], highlights: [5,14,23], variables: { answer: 3, lcs: "ace", path: "dp[5][3]→dp[4][2]→dp[3][2]→dp[2][1]→dp[1][1]→dp[0][0]" }, explanation: "Answer: dp[5][3] = 3. Backtrack along diagonal matches to reconstruct LCS = 'ace'.", code: "return dp[m][n]; // 3" }
  ]}
/>

---

## 5 · Problem Sets

### Day 1–2: LCS, Edit Distance & Core Greedy

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 1 | Longest Common Subsequence | Medium | 2D DP | ⭐ | [1143](https://leetcode.com/problems/longest-common-subsequence/) |
| 2 | Edit Distance | Medium | 2D DP | ⭐ | [72](https://leetcode.com/problems/edit-distance/) |
| 3 | Jump Game | Medium | Greedy | ⭐ | [55](https://leetcode.com/problems/jump-game/) |
| 4 | Jump Game II | Medium | Greedy | ⭐ | [45](https://leetcode.com/problems/jump-game-ii/) |
| 5 | Target Sum | Medium | 0/1 knapsack DP | ⭐ | [494](https://leetcode.com/problems/target-sum/) |
| 6 | Coin Change II | Medium | Unbounded knapsack | | [518](https://leetcode.com/problems/coin-change-ii/) |
| 7 | Unique Paths II | Medium | Grid DP with obstacles | | [63](https://leetcode.com/problems/unique-paths-ii/) |

### Day 3–4: Grid DP, Knapsack Variants & Greedy

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 8 | Interleaving String | Medium | 2D DP | | [97](https://leetcode.com/problems/interleaving-string/) |
| 9 | Minimum Path Sum | Medium | Grid DP | | [64](https://leetcode.com/problems/minimum-path-sum/) |
| 10 | Ones and Zeroes | Medium | 2D knapsack | | [474](https://leetcode.com/problems/ones-and-zeroes/) |
| 11 | Gas Station | Medium | Greedy circular | ⭐ | [134](https://leetcode.com/problems/gas-station/) |
| 12 | Hand of Straights | Medium | Greedy + TreeMap | | [846](https://leetcode.com/problems/hand-of-straights/) |
| 13 | Partition Labels | Medium | Greedy | ⭐ | [763](https://leetcode.com/problems/partition-labels/) |
| 14 | Task Scheduler | Medium | Greedy + math | ⭐ | [621](https://leetcode.com/problems/task-scheduler/) |

### Day 5–7: Hard String DP, LIS & Advanced Greedy

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 15 | Longest Increasing Subsequence | Medium | DP + binary search | ⭐ | [300](https://leetcode.com/problems/longest-increasing-subsequence/) |
| 16 | Regular Expression Matching | Hard | 2D DP | | [10](https://leetcode.com/problems/regular-expression-matching/) |
| 17 | Wildcard Matching | Hard | 2D DP | | [44](https://leetcode.com/problems/wildcard-matching/) |
| 18 | Best Time Buy Sell Stock with Cooldown | Medium | State machine DP | | [309](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) |
| 19 | Distinct Subsequences | Hard | 2D DP | | [115](https://leetcode.com/problems/distinct-subsequences/) |
| 20 | Maximum Profit in Job Scheduling | Hard | DP + binary search | ⭐ | [1235](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) |
| 21 | Merge Triplets to Form Target | Medium | Greedy | | [1899](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/) |

---

## 6 · Mock Interviews

### Mock 1 — 2D String DP (35 min)

**Interviewer:** "Given two strings, find the minimum number of operations to convert one into the other. You can insert, delete, or replace a character."

**Candidate talk-track:**

1. "This is edit distance — a classic 2D DP problem."
2. "I'll define `dp[i][j]` as the minimum edits to convert `word1[0..i-1]` to `word2[0..j-1]`."
3. "Base cases: converting an empty string requires i deletions or j insertions."
4. "Recurrence: if characters match, no edit needed, take diagonal. Otherwise, 1 + min of delete, insert, replace — the three adjacent cells."
5. Walk through a small example: `"horse"` → `"ros"`.

```java
public int minDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j],
                                Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
            }
        }
    }

    return dp[m][n];
}
```

**Follow-ups:**

- **"Can you optimise space?"**
  "Yes. Each row only depends on the previous row and the current row, so I can use two 1D arrays of size n+1. I need to save `dp[i-1][j-1]` before overwriting — I call it `prev`. This reduces space from O(m·n) to O(n)."

- **"What if delete costs 2, insert costs 3, and replace costs 5?"**
  "Same structure — just replace the `1 +` with the specific cost for each operation. The recurrence becomes `min(del_cost + dp[i-1][j], ins_cost + dp[i][j-1], rep_cost + dp[i-1][j-1])`."

- **"What if we want the actual sequence of operations, not just the count?"**
  "I'd backtrack through the filled table from `dp[m][n]`. At each cell, check which of the three directions (or diagonal match) led to the current value, and record the corresponding operation."

- **"What if one string is much longer than the other — say length 10⁵ vs 100?"**
  "Time is O(m·n) regardless, but space-optimised DP uses O(min(m,n)). I'd iterate over the shorter string for columns to minimise the 1D array size."

### Mock 2 — Greedy Strategy (35 min)

**Interviewer:** "There are n gas stations in a circle. Station i has `gas[i]` fuel and it costs `cost[i]` to travel to the next station. Starting with an empty tank, find the starting station index that lets you complete the full circuit, or return -1 if impossible."

**Candidate talk-track:**

1. "First observation: if total gas is less than total cost, it's impossible — not enough fuel overall."
2. "If a solution exists, it's unique. I'll use a greedy single-pass approach."
3. "Track a running tank surplus. If it drops below zero at station i, every station from the current start through i is invalid — reset start to i+1 and reset tank."
4. "Why the reset works: if we can't reach station i from any station in the range [start, i], then none of those can be a valid start. The answer must be later."

```java
public int canCompleteCircuit(int[] gas, int[] cost) {
    int totalGas = 0, totalCost = 0;
    for (int i = 0; i < gas.length; i++) {
        totalGas += gas[i];
        totalCost += cost[i];
    }
    if (totalGas < totalCost) return -1;

    int start = 0, tank = 0;
    for (int i = 0; i < gas.length; i++) {
        tank += gas[i] - cost[i];
        if (tank < 0) {
            start = i + 1;
            tank = 0;
        }
    }

    return start;
}
```

**Follow-ups:**

- **"Prove the greedy is correct."**
  "Exchange argument: suppose the true optimal start is S and our greedy picks G. Since total fuel suffices, any start that can survive every prefix sum is valid. If we failed at station k starting from some earlier point, every station in that range has a worse or equal prefix sum — so none can be the answer. G is the first station after the last failure, which by elimination is the only candidate."

- **"What if multiple valid starting stations exist?"**
  "The problem guarantees uniqueness when a solution exists. But if it didn't, this greedy finds the smallest valid index. To find all valid starts, we'd need a different approach — e.g., compute prefix sums for two laps and check each starting index."

- **"What if gas stations are on a line, not a circle?"**
  "Without the circular constraint, just track maximum prefix deficit. Start at the station after the point of maximum cumulative deficit."

- **"What if you can also carry at most K units of fuel?"**
  "The tank capacity constraint means we might pass a valid start because we can't store enough fuel for a future deficit. This requires a more complex simulation — possibly an ArrayDeque-based sliding window approach on the circular prefix sums."

---

## 7 · Tips and Edge Cases

**2D DP indexing:**
- Use 1-indexed DP tables (`dp[0][...]` and `dp[...][0]` as base cases) but 0-indexed strings. This avoids off-by-one errors: `dp[i][j]` corresponds to `s.charAt(i-1)`.
- Always double-check table dimensions: for strings of length m and n, the table is `(m+1) x (n+1)`.

**LCS / Edit Distance pitfalls:**
- For LCS reconstruction, break ties consistently (prefer up over left, or vice versa) to get a deterministic answer.
- Edit distance is symmetric: `edit(a, b) == edit(b, a)`. Use this to verify your solution.
- Watch for empty strings — `edit("", s)` = s.length(), `lcs("", s)` = 0.

**Knapsack pitfalls:**
- 0/1 vs unbounded: in 1D optimised form, 0/1 iterates capacity **backwards**, unbounded iterates **forwards**.
- Target Sum reduces to subset sum: find a subset with sum `(total + target) / 2`. If `(total + target)` is odd or target &gt; total, return 0 immediately.
- Ones and Zeroes is a 2D knapsack — `dp[mZeros][nOnes]`, iterate both dimensions backwards.

**String matching DP:**
- For regex `'*'`, remember it applies to the **preceding** element: `'a*'` matches zero or more `'a'`s. An isolated `'*'` (no preceding element) is invalid input.
- Wildcard `'*'` matches any sequence including empty. `'?'` matches exactly one character.
- Base case for patterns like `"a*b*c*"` matching empty string: iterate through pattern and check if all `*` can consume zero occurrences.

**Greedy pitfalls:**
- Not every problem that looks greedy is greedy. If your greedy fails a test case, check whether the problem has the greedy choice property. If not, fall back to DP.
- Jump Game: the greedy "farthest reach" approach is O(n) — don't write an O(n²) DP when greedy suffices.
- Task Scheduler: the formula `(maxFreq - 1) * (n + 1) + countOfMaxFreq` gives idle slots, but the answer is `Math.max(tasks.length, formula)` — when tasks overflow the idle slots, no idle time is needed.
- Hand of Straights: use a TreeMap. Process from the smallest value. If you can't form a group starting from the smallest available card, return false immediately.
- Partition Labels: two-pass approach. First pass records last index of each character. Second pass extends the partition boundary.

**LIS pitfalls:**
- The `tails` list in the O(n log n) approach does NOT contain the actual LIS — it's an auxiliary structure. To reconstruct the LIS, maintain parent pointers.
- `Collections.binarySearch` returns the insertion point (negated minus 1) when the element is not found, equivalent to bisect_left for unique elements.
- For "number of LIS" (LC 673), you need both `dpLen` and `dpCount` arrays — pure patience sorting doesn't easily give the count.

**General 2D DP:**
- When the problem involves two sequences, think 2D DP immediately.
- When one dimension is "items" and the other is "capacity/budget", think knapsack.
- Space optimisation from 2D to 1D is almost always possible when each row depends only on the previous row. Draw the dependency arrows to confirm.
- For problems with three or more states (e.g., Buy Sell Stock with Cooldown: hold, sold, rest), use a state machine with transitions between states at each step.
