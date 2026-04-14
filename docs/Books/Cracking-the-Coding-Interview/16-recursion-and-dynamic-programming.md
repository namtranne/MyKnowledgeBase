# Chapter 8 — Recursion and Dynamic Programming

> Recursion and dynamic programming are the most feared — and most rewarding — topics in coding interviews. Every DP problem is fundamentally a recursive problem with overlapping subproblems. Master the mental shift from "brute force recursion" to "optimized DP" and you'll crack a huge category of interview questions.

---

## How to Approach Recursive Problems

### The Recursive Thinking Framework

1. **Define the subproblem:** What smaller instance of the same problem can I solve?
2. **Trust the recursion:** Assume the recursive call returns the correct answer
3. **Define the base case:** What is the simplest instance that I can solve directly?
4. **Combine:** How do I build the full solution from the subproblem solutions?

```
┌─────────────────────────────────────────────────────────────┐
│  Recursive Problem-Solving Template                         │
│                                                             │
│  function solve(problem):                                   │
│      if problem is base case:                               │
│          return base solution                               │
│                                                             │
│      subproblem = reduce(problem)                           │
│      subresult = solve(subproblem)     ← trust this works  │
│      return combine(subresult)                              │
└─────────────────────────────────────────────────────────────┘
```

### Example: Computing N!

```java
int factorial(int n) {
    if (n <= 1) return 1;            // base case
    return n * factorial(n - 1);     // recursive case
}
```

```
factorial(5)
  = 5 × factorial(4)
  = 5 × 4 × factorial(3)
  = 5 × 4 × 3 × factorial(2)
  = 5 × 4 × 3 × 2 × factorial(1)
  = 5 × 4 × 3 × 2 × 1
  = 120
```

---

## Recursive vs Iterative Solutions

| Aspect | Recursive | Iterative |
|--------|-----------|-----------|
| Clarity | Often more intuitive for tree/graph problems | Can be harder to read for complex logic |
| Space | O(depth) stack frames | O(1) for simple loops |
| Stack overflow | Risk for deep recursion (N > ~10,000) | No risk |
| Performance | Function call overhead | Slightly faster |
| When to use | Trees, divide & conquer, backtracking | When space matters, simple iteration |

> In interviews, start with the recursive solution for clarity, then optimize. Mention the stack space trade-off.

---

## Dynamic Programming & Memoization

### What Is DP?

Dynamic programming applies when a problem has:

1. **Overlapping subproblems** — the same subproblem is solved multiple times
2. **Optimal substructure** — the optimal solution contains optimal solutions to subproblems

### The Fibonacci Example: From O(2^N) to O(N) to O(1)

#### Approach 1: Naive Recursion — O(2^N)

```java
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

The recursion tree shows massive redundancy:

```
                     fib(6)
                   /        \
              fib(5)         fib(4)
             /     \         /     \
          fib(4)  fib(3)  fib(3)  fib(2)
          /   \    / \     / \     / \
       fib(3) fib(2) ...  ...    ...
       / \
      ...

  fib(3) is computed 3 times
  fib(2) is computed 5 times
  fib(1) is computed 8 times

  Total nodes ≈ 2^N → exponential!
```

#### Approach 2: Memoization (Top-Down) — O(N) Time, O(N) Space

Cache results of subproblems to avoid recomputation:

```java
int fib(int n) {
    return fib(n, new int[n + 1]);
}

int fib(int n, int[] memo) {
    if (n <= 1) return n;
    if (memo[n] == 0) {
        memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
    }
    return memo[n];
}
```

```
With memoization, fib(6) only computes each value once:

  fib(6) → fib(5) → fib(4) → fib(3) → fib(2) → fib(1) → fib(0)
                                                      ↑        ↑
                                                   (base)   (base)

  N + 1 computations total → O(N)
```

#### Approach 3: Tabulation (Bottom-Up) — O(N) Time, O(N) Space

Build up from the base cases iteratively:

```java
int fib(int n) {
    if (n <= 1) return n;
    int[] dp = new int[n + 1];
    dp[0] = 0;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}
```

#### Approach 4: Space-Optimized — O(N) Time, O(1) Space

Since we only need the last two values:

```java
int fib(int n) {
    if (n <= 1) return n;
    int prev2 = 0, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```

### Comparison

| Approach | Time | Space | Technique |
|----------|------|-------|-----------|
| Naive recursion | O(2^N) | O(N) stack | Brute force |
| Memoization | O(N) | O(N) memo + O(N) stack | Top-down DP |
| Tabulation | O(N) | O(N) table | Bottom-up DP |
| Space-optimized | O(N) | O(1) | Bottom-up DP |

> **Top-down vs bottom-up:** Memoization is often easier to write (just add caching to the recursive solution). Tabulation avoids recursion overhead and stack limits. Choose based on the problem.

---

## DP Problem Identification Framework

```
┌──────────────────────────────────────────────────────────┐
│  "Is this a DP problem?"                                 │
│                                                          │
│  Signal 1: "Find the minimum/maximum/count of..."        │
│  Signal 2: "How many ways to..."                         │
│  Signal 3: "Can you reach / is it possible to..."        │
│  Signal 4: Making a choice at each step                  │
│  Signal 5: Optimal substructure (optimal solution uses   │
│            optimal sub-solutions)                        │
│  Signal 6: Overlapping subproblems (same subproblem      │
│            solved multiple times)                        │
│                                                          │
│  If greedy works → use greedy (simpler)                  │
│  If choices have consequences → likely DP                │
│  If order doesn't matter → might be greedy              │
│  If you need to explore ALL paths → backtracking         │
└──────────────────────────────────────────────────────────┘
```

---

## Common DP Patterns

### Pattern 1: Linear DP (1D)

**Climbing Stairs:** How many distinct ways to climb N stairs, taking 1 or 2 steps?

```java
int climbStairs(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```

**State transition:** `dp[i] = dp[i-1] + dp[i-2]`

```
  stairs:  1   2   3   4   5   6   7
  ways:    1   2   3   5   8   13  21   ← Fibonacci!
```

### Pattern 2: Grid DP (2D)

**Unique Paths:** How many ways to go from top-left to bottom-right in an m×n grid, moving only right or down?

```java
int uniquePaths(int m, int n) {
    int[][] dp = new int[m][n];
    for (int i = 0; i < m; i++) dp[i][0] = 1;
    for (int j = 0; j < n; j++) dp[0][j] = 1;
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}
```

**State transition:** `dp[i][j] = dp[i-1][j] + dp[i][j-1]`

```
Grid (3×3):
  ┌───┬───┬───┐
  │ 1 │ 1 │ 1 │
  ├───┼───┼───┤
  │ 1 │ 2 │ 3 │
  ├───┼───┼───┤
  │ 1 │ 3 │ 6 │  ← 6 unique paths
  └───┴───┴───┘
```

### Pattern 3: String DP

**Edit Distance (Levenshtein):** Minimum operations (insert, delete, replace) to transform word1 into word2.

```java
int editDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],    // replace
                               Math.min(dp[i - 1][j],          // delete
                                        dp[i][j - 1]));        // insert
            }
        }
    }
    return dp[m][n];
}
```

**State transition:**

```
If chars match: dp[i][j] = dp[i-1][j-1]
If not:         dp[i][j] = 1 + min(dp[i-1][j-1],   ← replace
                                   dp[i-1][j],       ← delete
                                   dp[i][j-1])       ← insert
```

### Pattern 4: Knapsack

**0/1 Knapsack:** Given items with weights and values, maximize value within weight capacity W.

```java
int knapsack(int[] weights, int[] values, int W) {
    int n = weights.length;
    int[][] dp = new int[n + 1][W + 1];

    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];  // don't take item i
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(dp[i][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]);  // take item i
            }
        }
    }
    return dp[n][W];
}
```

**State transition:** `dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])`

**Space optimization:** Since each row depends only on the previous row, use a 1D array and iterate w from right to left:

```java
int knapsack(int[] weights, int[] values, int W) {
    int[] dp = new int[W + 1];
    for (int i = 0; i < weights.length; i++) {
        for (int w = W; w >= weights[i]; w--) {
            dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[W];
}
```

### Pattern 5: Interval DP

**Longest Palindromic Subsequence:**

```java
int longestPalindromicSubseq(String s) {
    int n = s.length();
    int[][] dp = new int[n][n];

    for (int i = n - 1; i >= 0; i--) {
        dp[i][i] = 1;
        for (int j = i + 1; j < n; j++) {
            if (s.charAt(i) == s.charAt(j)) {
                dp[i][j] = dp[i + 1][j - 1] + 2;
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[0][n - 1];
}
```

---

## State Transition Diagrams

Visualizing DP transitions helps identify the pattern:

```
Climbing Stairs (1 or 2 steps):

  State: step number
  Transition: dp[i] ← dp[i-1] + dp[i-2]

  ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
  │ dp[0]│─────▶│ dp[1]│─────▶│ dp[2]│─────▶│ dp[3]│
  │  = 1 │      │  = 1 │  ┌──▶│  = 2 │  ┌──▶│  = 3 │
  └──────┘      └──────┘  │   └──────┘  │   └──────┘
                    └──────┘       └──────┘


0/1 Knapsack:

  State: (item index, remaining capacity)
  Transition: dp[i][w] ← max(skip, take)

  ┌──────────┐     ┌──────────┐
  │dp[i-1][w]│────▶│ dp[i][w] │  ← skip item i
  └──────────┘  ┌─▶│          │
                │  └──────────┘
  ┌────────────┐│
  │dp[i-1]     ││                  ← take item i
  │[w-weight_i]│┘                    (add value_i)
  └────────────┘
```

---

## Space Optimization Techniques

| Original | Optimized | When |
|----------|-----------|------|
| 2D table `dp[n][m]` | 1D array `dp[m]` | Each row depends only on the previous row |
| 1D array `dp[n]` | 2 variables | Each entry depends on a fixed number of previous entries |
| Full recursion tree | Memoization hashmap | Only a fraction of states are actually visited |

### Rolling Array Technique

```java
// 2D → 1D for grid DP
int uniquePaths(int m, int n) {
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[j] += dp[j - 1];
        }
    }
    return dp[n - 1];
}
```

---

## Backtracking vs DP

| Aspect | Backtracking | DP |
|--------|-------------|-----|
| Goal | Find all solutions or one valid solution | Find optimal solution or count |
| Approach | Build incrementally, abandon invalid paths | Solve subproblems, combine results |
| Overlapping subproblems? | No (each path is unique) | Yes (same subproblem reused) |
| Pruning | Cuts invalid branches early | Caches computed results |
| Examples | N-Queens, Sudoku, permutations | Knapsack, coin change, edit distance |

### Backtracking Template

```java
void backtrack(List<List<Integer>> result, List<Integer> current, int[] choices, int start) {
    if (isComplete(current)) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = start; i < choices.length; i++) {
        if (!isValid(current, choices[i])) continue;
        current.add(choices[i]);
        backtrack(result, current, choices, i + 1);
        current.remove(current.size() - 1);  // undo choice
    }
}
```

---

## Interview Questions Overview

### 8.1 — Triple Step

> A child runs up stairs with 1, 2, or 3 steps. Count the number of ways to run up N stairs.

```java
int tripleStep(int n) {
    if (n < 0) return 0;
    if (n == 0) return 1;
    int[] memo = new int[n + 1];
    Arrays.fill(memo, -1);
    return tripleStepMemo(n, memo);
}

int tripleStepMemo(int n, int[] memo) {
    if (n < 0) return 0;
    if (n == 0) return 1;
    if (memo[n] != -1) return memo[n];
    memo[n] = tripleStepMemo(n - 1, memo) +
              tripleStepMemo(n - 2, memo) +
              tripleStepMemo(n - 3, memo);
    return memo[n];
}
```

**State:** `dp[n] = dp[n-1] + dp[n-2] + dp[n-3]`

### 8.2 — Robot in a Grid

> A robot sits at the top-left of an r×c grid. It can move right or down. Some cells are "off limits." Find a path from top-left to bottom-right.

**Approach:** DFS/backtracking with memoization. Mark failed cells to avoid revisiting.

```java
List<Point> findPath(boolean[][] grid) {
    List<Point> path = new ArrayList<>();
    Set<Point> failedPoints = new HashSet<>();
    if (findPath(grid, grid.length - 1, grid[0].length - 1, path, failedPoints)) {
        return path;
    }
    return null;
}

boolean findPath(boolean[][] grid, int row, int col, List<Point> path, Set<Point> failed) {
    if (row < 0 || col < 0 || !grid[row][col]) return false;
    Point p = new Point(row, col);
    if (failed.contains(p)) return false;

    boolean isOrigin = (row == 0 && col == 0);
    if (isOrigin || findPath(grid, row - 1, col, path, failed)
                 || findPath(grid, row, col - 1, path, failed)) {
        path.add(p);
        return true;
    }
    failed.add(p);
    return false;
}
```

### 8.3 — Magic Index

> A sorted array where A[i] = i. Find a magic index (if one exists).

**Approach:** Binary search variant. If `A[mid] == mid`, found it. If `A[mid] > mid`, magic index must be to the left. If `A[mid] < mid`, must be to the right.

For non-distinct values, search both sides but skip ahead intelligently.

### 8.4 — Power Set

> Return all subsets of a set.

**Approach 1: Recursive** — each element is either included or excluded:

```java
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    generateSubsets(nums, 0, new ArrayList<>(), result);
    return result;
}

void generateSubsets(int[] nums, int index, List<Integer> current, List<List<Integer>> result) {
    if (index == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    generateSubsets(nums, index + 1, current, result);
    current.add(nums[index]);
    generateSubsets(nums, index + 1, current, result);
    current.remove(current.size() - 1);
}
```

**Approach 2: Bitmask** — iterate from 0 to 2^N - 1, each bit represents inclusion:

```java
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    for (int mask = 0; mask < (1 << nums.length); mask++) {
        List<Integer> subset = new ArrayList<>();
        for (int i = 0; i < nums.length; i++) {
            if ((mask & (1 << i)) != 0) subset.add(nums[i]);
        }
        result.add(subset);
    }
    return result;
}
```

### 8.5 — Recursive Multiply

> Multiply two positive integers without using the `*` operator. Minimize operations.

Use bit shifting (doubling) and addition. Similar to Russian peasant multiplication.

```java
int multiply(int a, int b) {
    int smaller = Math.min(a, b);
    int bigger = Math.max(a, b);
    return multiplyHelper(smaller, bigger);
}

int multiplyHelper(int smaller, int bigger) {
    if (smaller == 0) return 0;
    if (smaller == 1) return bigger;
    int half = smaller >> 1;
    int halfProduct = multiplyHelper(half, bigger);
    if (smaller % 2 == 0) return halfProduct + halfProduct;
    return halfProduct + halfProduct + bigger;
}
```

### 8.6 — Towers of Hanoi

> Move N disks from tower 1 to tower 3, using tower 2 as auxiliary. Only one disk at a time; no larger disk on smaller.

```java
void hanoi(int n, char from, char to, char aux) {
    if (n == 0) return;
    hanoi(n - 1, from, aux, to);
    System.out.println("Move disk " + n + " from " + from + " to " + to);
    hanoi(n - 1, aux, to, from);
}
```

```
N = 3:
  Move 1: A → C
  Move 2: A → B
  Move 1: C → B
  Move 3: A → C
  Move 1: B → A
  Move 2: B → C
  Move 1: A → C

  Total moves: 2^N - 1 = 7
```

### 8.7 — Permutations without Dups

> Compute all permutations of a string of unique characters.

```java
List<String> permutations(String s) {
    List<String> result = new ArrayList<>();
    permute(s.toCharArray(), 0, result);
    return result;
}

void permute(char[] arr, int index, List<String> result) {
    if (index == arr.length) {
        result.add(new String(arr));
        return;
    }
    for (int i = index; i < arr.length; i++) {
        swap(arr, index, i);
        permute(arr, index + 1, result);
        swap(arr, index, i);
    }
}
```

### 8.8 — Permutations with Dups

> Compute all permutations of a string with duplicate characters (no duplicate permutations).

**Approach:** Use a frequency map. At each position, try each unique character (decrement its count, recurse, restore).

### 8.9 — Parens

> Print all valid combinations of N pairs of parentheses.

```java
void generateParens(int open, int close, char[] str, int index, List<String> result) {
    if (open == 0 && close == 0) {
        result.add(new String(str));
        return;
    }
    if (open > 0) {
        str[index] = '(';
        generateParens(open - 1, close, str, index + 1, result);
    }
    if (close > open) {
        str[index] = ')';
        generateParens(open, close - 1, str, index + 1, result);
    }
}
```

### 8.10 — Paint Fill

> Implement the "paint fill" function (flood fill) — given a screen, a point, and a new color, fill the surrounding area.

BFS or DFS from the starting point, changing the color of same-colored adjacent cells.

### 8.11 — Coins

> Given coin denominations (25, 10, 5, 1), count the number of ways to represent N cents.

```java
int makeChange(int amount, int[] coins) {
    int[][] dp = new int[coins.length + 1][amount + 1];
    for (int i = 0; i <= coins.length; i++) dp[i][0] = 1;

    for (int i = 1; i <= coins.length; i++) {
        for (int j = 1; j <= amount; j++) {
            dp[i][j] = dp[i - 1][j];  // don't use coin i
            if (coins[i - 1] <= j) {
                dp[i][j] += dp[i][j - coins[i - 1]];  // use coin i (can reuse)
            }
        }
    }
    return dp[coins.length][amount];
}
```

### 8.12 — Eight Queens

> Place 8 queens on an 8×8 chessboard such that no two queens threaten each other.

Classic backtracking problem. Place queens row by row, checking column and diagonal conflicts.

```java
void placeQueens(int row, int[] columns, List<int[]> results) {
    if (row == 8) {
        results.add(columns.clone());
        return;
    }
    for (int col = 0; col < 8; col++) {
        if (isValid(columns, row, col)) {
            columns[row] = col;
            placeQueens(row + 1, columns, results);
        }
    }
}

boolean isValid(int[] columns, int row, int col) {
    for (int r = 0; r < row; r++) {
        if (columns[r] == col) return false;
        if (Math.abs(columns[r] - col) == row - r) return false;
    }
    return true;
}
```

### 8.13 — Stack of Boxes

> Stack boxes such that each box is strictly larger in all dimensions than the box above it. Maximize total height.

**Approach:** Sort by one dimension. Then it's a variant of Longest Increasing Subsequence (LIS). Use DP with memoization.

### 8.14 — Boolean Evaluation

> Given a boolean expression with `0`, `1`, `&`, `|`, `^` and a desired result (true/false), count the number of ways to parenthesize the expression to get that result.

**Approach:** For each operator, split the expression into left and right. Recursively count ways each side can be true/false. Combine based on operator truth table. Memoize on `(left_index, right_index, result)`.

---

## DP Pattern Summary Table

| Pattern | State | Transition | Example |
|---------|-------|-----------|---------|
| **Linear** | `dp[i]` | `dp[i] = f(dp[i-1], dp[i-2], ...)` | Fibonacci, climbing stairs |
| **Grid** | `dp[i][j]` | `dp[i][j] = f(dp[i-1][j], dp[i][j-1])` | Unique paths, min path sum |
| **String** | `dp[i][j]` on two strings | Compare `s1[i]` and `s2[j]` | Edit distance, LCS |
| **Knapsack** | `dp[i][w]` (item, capacity) | Take or skip | 0/1 Knapsack, subset sum |
| **Interval** | `dp[i][j]` on substring `[i..j]` | Try all split points | Palindrome, matrix chain |
| **Tree** | `dp[node]` | Combine children results | Tree diameter, house robber III |
| **Bitmask** | `dp[mask]` | Flip bits to transition | TSP, task assignment |

---

## Key Takeaways

1. **Every DP problem starts as recursion** — write the brute-force recursive solution first, then optimize
2. **Draw the recursion tree** — if you see overlapping subproblems, it's a DP problem
3. **Define the state clearly** — what information do you need to solve a subproblem?
4. **Write the state transition** — this is the heart of every DP solution
5. **Top-down is easier to write; bottom-up is easier to optimize** — know both
6. **Space optimization** — if you only need the previous row/few values, reduce space
7. **Backtracking ≠ DP** — backtracking explores all paths; DP combines optimal subresults
8. **Practice the patterns** — most DP problems map to one of the patterns above
9. **Start small** — manually compute dp[0], dp[1], dp[2] to verify your transition
10. **Time complexity = number of states × time per state** — use this to estimate complexity
