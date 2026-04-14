---
sidebar_position: 19
title: "Week 18: Matrix Exponentiation + Game Theory"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 18: Matrix Exponentiation + Game Theory

## Overview

This week covers two powerful paradigms. **Matrix exponentiation** lets you compute the n-th term of any linear recurrence in O(n³ log k) time, turning problems with astronomically large n into trivially fast computations. **Game theory** gives you frameworks — Nim, Sprague-Grundy, minimax — to determine optimal play in combinatorial games. Together, they unlock an entire class of competitive-programming and interview problems.

<AlgoViz
  title="Matrix Exponentiation — Computing M^10"
  description="Watch binary exponentiation applied to a 2x2 Fibonacci matrix to compute F(10)."
  steps={[
    { label: "Init", description: "M = [[1,1],[1,0]], result = I (identity), k = 10 (binary 1010)", result: "[[1,0],[0,1]]", base: "[[1,1],[1,0]]", k: 10 },
    { label: "Bit 0 = 0", description: "Bit is 0: skip multiply. Square base: base = M^2 = [[2,1],[1,1]]", result: "[[1,0],[0,1]]", base: "[[2,1],[1,1]]", k: 5 },
    { label: "Bit 1 = 1", description: "Bit is 1: result = I * M^2 = M^2. Square base: base = M^4", result: "[[2,1],[1,1]]", base: "[[5,3],[3,2]]", k: 2 },
    { label: "Bit 2 = 0", description: "Bit is 0: skip multiply. Square base: base = M^8", result: "[[2,1],[1,1]]", base: "[[34,21],[21,13]]", k: 1 },
    { label: "Bit 3 = 1", description: "Bit is 1: result = M^2 * M^8 = M^10. F(10) = result[0][1] = 55", result: "[[89,55],[55,34]]", base: "done", k: 0 }
  ]}
/>

---

## Part A — Matrix Exponentiation

### Matrix Multiplication

Multiplying two n×n matrices A and B produces matrix C where each entry is:

$$C[i][j] = \sum_{k=0}^{n-1} A[i][k] \cdot B[k][j]$$

Time complexity: **O(n³)** for n×n matrices.

**When to use this template.** Use this matrix multiplication routine as a building block whenever you need matrix exponentiation. Keep the modular arithmetic version -- virtually all competitive programming matrix problems require answers mod a prime. The dimension n is typically small (2-10), so the O(n^3) cost per multiplication is negligible compared to the log(k) multiplications needed.

```java
static long[][] matMul(long[][] A, long[][] B, long mod) {
    int n = A.length, m = B[0].length, k = B.length;
    long[][] C = new long[n][m];
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long s = 0;
            for (int p = 0; p < k; p++)
                s += A[i][p] * B[p][j] % mod;
            C[i][j] = s % mod;
        }
    return C;
}
```

### Matrix Exponentiation by Squaring

Just like scalar exponentiation by squaring computes x^k in O(log k), matrix exponentiation computes M^k in **O(n³ log k)** — each of the O(log k) multiplications costs O(n³).

**When to use this template.** Reach for matrix power whenever you have a fixed-size linear recurrence or state transition and need the result after an astronomically large number of steps (n up to 10^18). The matrix dimension d must be small (typically under 100) for this to be practical. If d is large but n is small, iterative DP is faster.

```java
static long[][] matPow(long[][] M, long k, long mod) {
    int n = M.length;
    long[][] result = new long[n][n];
    for (int i = 0; i < n; i++) result[i][i] = 1; // identity

    long[][] base = new long[n][n];
    for (int i = 0; i < n; i++)
        base[i] = M[i].clone();

    while (k > 0) {
        if ((k & 1) == 1)
            result = matMul(result, base, mod);
        base = matMul(base, base, mod);
        k >>= 1;
    }
    return result;
}
```

### Solving Linear Recurrences

**Why this technique exists.** Computing the n-th term of a linear recurrence like Fibonacci iteratively takes O(n) time. For n = 10^18, that is impossibly slow. Matrix exponentiation reformulates the recurrence as repeated matrix multiplication, then applies exponentiation by squaring to compute M^n in O(d^3 * log n) where d is the recurrence depth (2 for Fibonacci, 3 for Tribonacci). For Fibonacci, this means computing F(10^18) with only about 60 matrix multiplications of 2x2 matrices -- essentially instantaneous.

**The intuition.** A linear recurrence says "the next value is a linear combination of the previous d values." This is exactly what matrix-vector multiplication does: multiply a vector of the last d values by a transition matrix to get the next vector. Repeating this n times is the same as multiplying by M^n. And just as you can compute 2^60 with 60 multiplications (by squaring: 2, 4, 16, 256, ...), you can compute M^60 with 60 matrix multiplications.

**Interview signals.** Look for: (1) "compute f(n) for very large n" with n up to 10^18, (2) "count strings/paths of length n with transition rules" (model as adjacency matrix), (3) "phone keypad dialing" or "count vowel permutations" (transition graph + matrix power), (4) any DP where the state space is small but n is huge.

Any linear recurrence of the form:

$$f(n) = a_1 f(n-1) + a_2 f(n-2) + \cdots + a_d f(n-d)$$

can be expressed as a matrix equation:

$$\begin{bmatrix} f(n) \\ f(n-1) \\ \vdots \\ f(n-d+1) \end{bmatrix} = \begin{bmatrix} a_1 & a_2 & \cdots & a_d \\ 1 & 0 & \cdots & 0 \\ 0 & 1 & \cdots & 0 \\ \vdots & & \ddots & 0 \end{bmatrix}^{n-d+1} \begin{bmatrix} f(d-1) \\ f(d-2) \\ \vdots \\ f(0) \end{bmatrix}$$

This transforms computing f(n) from O(n) iterative steps (or O(2^n) naive recursion) into **O(d³ log n)** — feasible even when n = 10^18.

### Classic Example: Fibonacci via Matrix

The Fibonacci recurrence F(n) = F(n-1) + F(n-2), with F(0) = 0, F(1) = 1, maps to a 2×2 matrix:

$$\begin{bmatrix} F(n+1) \\ F(n) \end{bmatrix} = \begin{bmatrix} 1 & 1 \\ 1 & 0 \end{bmatrix}^n \begin{bmatrix} F(1) \\ F(0) \end{bmatrix}$$

After computing M^n, the answer F(n) is in position `M^n[1][0]` (or equivalently `M^n[0][1]`).

```java
static long fibonacci(int n, long mod) {
    if (n <= 1) return n;
    long[][] M = {{1, 1}, {1, 0}};
    long[][] result = matPow(M, n, mod);
    return result[0][1];
}
```

### Example: Tribonacci via 3×3 Matrix

The Tribonacci recurrence T(n) = T(n-1) + T(n-2) + T(n-3), with T(0) = 0, T(1) = T(2) = 1:

$$\begin{bmatrix} T(n) \\ T(n-1) \\ T(n-2) \end{bmatrix} = \begin{bmatrix} 1 & 1 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{bmatrix}^{n-2} \begin{bmatrix} T(2) \\ T(1) \\ T(0) \end{bmatrix}$$

```java
static long tribonacci(int n, long mod) {
    if (n == 0) return 0;
    if (n <= 2) return 1;
    long[][] M = {{1, 1, 1}, {1, 0, 0}, {0, 1, 0}};
    long[][] result = matPow(M, n - 2, mod);
    // result * [T(2), T(1), T(0)]^T = result * [1, 1, 0]^T
    return (result[0][0] + result[0][1]) % mod;
}
```

### Matrix Inversion (Brief)

Matrix inversion finds M⁻¹ such that M · M⁻¹ = I. Computed via **Gaussian elimination** on the augmented matrix [M | I], performing row operations until the left half becomes I and the right half becomes M⁻¹. Time: O(n³). This is occasionally needed when you must reverse a transformation or solve a system of linear equations directly, but most competitive problems use matrix exponentiation rather than inversion.

**Common mistakes.** (1) Off-by-one in the exponent: if f(n) depends on the last d values and you want f(n), the power is n-d+1, not n. (2) Forgetting to mod intermediate products -- even `long` overflows when multiplying two values near 10^9. (3) Constructing the companion matrix with coefficients in the wrong order (first row must be [a1, a2, ..., ad], matching how the recurrence is written). (4) Using matrix exponentiation when n is small enough for simple DP -- the overhead of O(d^3 log n) is wasteful if d^3 exceeds n.

### Complete Template

**When to use this template.** Use the `solveLinearRecurrence` function below as a drop-in solution for any problem that gives you a linear recurrence with constant coefficients and asks for a value at large n. You supply the coefficients and base values; the function builds the companion matrix and exponentiates it. This covers Fibonacci, Tribonacci, custom recurrences, and transition-counting problems.

```java
import java.util.*;

static long[][] matMul(long[][] A, long[][] B, long mod) {
    int n = A.length, m = B[0].length, k = B.length;
    long[][] C = new long[n][m];
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long s = 0;
            for (int p = 0; p < k; p++)
                s += A[i][p] * B[p][j] % mod;
            C[i][j] = s % mod;
        }
    return C;
}

static long[][] matPow(long[][] M, long k, long mod) {
    int n = M.length;
    long[][] result = new long[n][n];
    for (int i = 0; i < n; i++) result[i][i] = 1;
    long[][] base = new long[n][];
    for (int i = 0; i < n; i++) base[i] = M[i].clone();
    while (k > 0) {
        if ((k & 1) == 1) result = matMul(result, base, mod);
        base = matMul(base, base, mod);
        k >>= 1;
    }
    return result;
}

static long solveLinearRecurrence(long[] coeffs, long[] baseValues,
                                   long n, long mod) {
    int d = coeffs.length;
    if (n < d) return baseValues[(int) n] % mod;

    long[][] M = new long[d][d];
    for (int j = 0; j < d; j++) M[0][j] = coeffs[j];
    for (int i = 1; i < d; i++) M[i][i - 1] = 1;

    long[][] result = matPow(M, n - d + 1, mod);

    long ans = 0;
    for (int j = 0; j < d; j++)
        ans = (ans + result[0][j] * baseValues[d - 1 - j]) % mod;
    return ans;
}
```

---

## Part B — Game Theory

### Combinatorial Game Theory Basics

A **combinatorial game** has these properties:
1. **Two players** alternate turns
2. **Perfect information** — both players see the entire game state
3. **No chance** — no dice, no hidden cards
4. **Normal play convention** — the player who cannot move loses

Every position is either a **winning position** (W) or a **losing position** (L):
- A position is **L** if every move leads to a W position (the current player has no winning move)
- A position is **W** if there exists at least one move to an L position (the current player can force a loss on the opponent)

### The Nim Game

**Why this technique exists.** Nim is the foundational game in combinatorial game theory. Its elegant XOR-based solution provides the building block for the Sprague-Grundy theorem, which extends the same analysis to all impartial games. Understanding Nim is not just about solving one game -- it gives you the mental model for decomposing any game into independent sub-games and combining their analyses.

**Nim**: Several piles of stones. Each turn, a player removes any positive number of stones from exactly one pile. The player who takes the last stone wins.

**Nim theorem**: The first player wins if and only if the XOR of all pile sizes is non-zero.

$$\text{XOR} = p_1 \oplus p_2 \oplus \cdots \oplus p_k$$

- If XOR = 0: **second player wins** (every move the first player makes creates a non-zero XOR, which the second player can fix back to zero)
- If XOR ≠ 0: **first player wins** (they can always move to a position with XOR = 0)

**Proof sketch**: XOR = 0 is a P-position (previous player wins / current player loses). From any position with XOR ≠ 0, there exists a move to reach XOR = 0. From any position with XOR = 0, every move leads to XOR ≠ 0. The terminal state (all piles empty) has XOR = 0, confirming it as a P-position.

### Sprague-Grundy Theorem

**Why this technique exists.** The Nim theorem only handles standard Nim (take any number from one pile). But many game problems have custom rules: "take 1, 3, or 4 stones," "split a pile into two unequal piles," etc. Sprague-Grundy shows that *every* impartial game position behaves exactly like a Nim pile of some size (its Grundy number). This means you can solve arbitrarily complex games by computing Grundy numbers for individual sub-games and XOR-ing them together -- the same way you would XOR pile sizes in Nim.

**The intuition.** The Grundy number of a position is the "minimum excludant" (mex) of the Grundy numbers of all positions you can move to. The mex of a set S is the smallest non-negative integer not in S. A position with Grundy number 0 is losing (just like a Nim pile of size 0 -- you cannot take anything useful). A position with Grundy number g greater than 0 is winning because you can always move to a position with Grundy number 0. The XOR composition rule for independent sub-games is the deepest result: it says that playing multiple independent games simultaneously is equivalent to playing Nim with piles equal to each game's Grundy number.

The **Sprague-Grundy theorem** generalizes Nim to all impartial games (games where both players have the same moves from every position).

Every position has a **Grundy number** (nimber) `g`:
- A position is losing if and only if `g = 0`
- A composite game (independent sub-games) has Grundy number equal to the XOR of its sub-games' Grundy numbers

### Computing Grundy Numbers

**When to use this template.** Use Grundy number computation when facing a game with custom move rules (not standard Nim). If the game consists of independent sub-games, compute each sub-game's Grundy number and XOR them together. The memoized recursive approach below works for any game where the state space is small enough to enumerate (typically up to 10^5-10^6 states).

```java
static int mex(Set<Integer> s) {
    int i = 0;
    while (s.contains(i)) i++;
    return i;
}

static Map<Integer, Integer> memo = new HashMap<>();

static int grundy(int pos, Function<Integer, List<Integer>> movesFn) {
    if (memo.containsKey(pos)) return memo.get(pos);

    Set<Integer> reachable = new HashSet<>();
    for (int nextPos : movesFn.apply(pos))
        reachable.add(grundy(nextPos, movesFn));

    int result = mex(reachable);
    memo.put(pos, result);
    return result;
}
```

**Example — subtraction game**: Players alternate removing 1, 2, or 3 stones from a pile. Grundy numbers cycle: g(0)=0, g(1)=1, g(2)=2, g(3)=3, g(4)=0, g(5)=1, ... i.e., g(n) = n % 4.

### Minimax Algorithm

**Why this technique exists.** Unlike Nim and Sprague-Grundy (which handle impartial games where both players have the same moves), minimax handles partisan games where players have different objectives -- one maximizes, the other minimizes. This covers most "competitive scoring" problems like Stone Game variants, where the question is not just who wins but by how much.

For **partisan games** (like Stone Game, where players maximize/minimize a score), use **minimax**:

**When to use this template.** Apply minimax when both players play optimally and you need the score difference or optimal outcome. The state must be memoizable (small enough to cache). If the game has perfect information and no randomness, minimax with memoization gives the exact answer.

```java
Map<State, Integer> memo = new HashMap<>();

int minimax(State state, boolean isMaximizing) {
    if (memo.containsKey(state)) return memo.get(state);
    if (isTerminal(state)) return evaluate(state);

    int best;
    if (isMaximizing) {
        best = Integer.MIN_VALUE;
        for (var move : getMoves(state))
            best = Math.max(best, move.score + minimax(move.next, false));
    } else {
        best = Integer.MAX_VALUE;
        for (var move : getMoves(state))
            best = Math.min(best, move.score - minimax(move.next, true));
    }

    memo.put(state, best);
    return best;
}
```

### Alpha-Beta Pruning

Alpha-beta pruning optimizes minimax by maintaining a window [alpha, beta]. If a branch can't possibly improve the current best choice, it's pruned:
- **Alpha** = best score the maximizer can guarantee so far
- **Beta** = best score the minimizer can guarantee so far
- When alpha ≥ beta, prune the remaining branches

This reduces the effective branching factor from b to roughly √b in practice, making deep searches feasible.

### Game State DP

Many game problems reduce to a DP where `dp[state]` = True/False indicating whether the current player can force a win:

**When to use this template.** Use this boolean game DP when the question is simply "can the first player win?" rather than "what is the optimal score?" This is simpler than minimax because you only track win/lose, not scores. The key insight: a state is winning if *any* move leads to a losing state for the opponent; it is losing if *all* moves lead to winning states for the opponent.

```java
Map<State, Boolean> memo = new HashMap<>();

boolean canWin(State state) {
    if (memo.containsKey(state)) return memo.get(state);
    if (isTerminal(state)) {
        memo.put(state, false); // current player can't move — loses
        return false;
    }

    for (State nextState : getMoves(state)) {
        if (!canWin(nextState)) {
            memo.put(state, true);
            return true;
        }
    }

    memo.put(state, false);
    return false;
}
```

### Nim Game Full Implementation

```java
static String[] nimWinner(int[] piles) {
    int xorSum = 0;
    for (int p : piles) xorSum ^= p;

    if (xorSum == 0) return new String[]{"Second", ""};

    for (int i = 0; i < piles.length; i++) {
        int target = piles[i] ^ xorSum;
        if (target < piles[i]) {
            int remove = piles[i] - target;
            return new String[]{"First",
                "Remove " + remove + " from pile " + i};
        }
    }
    return new String[]{"First", ""};
}
```

---

## Worked Examples

### Example 1: Fibonacci F(10) via Matrix Exponentiation

Compute F(10) using M = [[1,1],[1,0]]:

```
We need M^10. Binary representation: 10 = 1010₂

Start: result = I = [[1,0],[0,1]], base = M = [[1,1],[1,0]]

k = 10 (1010₂):
  Bit 0 = 0: skip multiply, square base
    base = M^2 = [[2,1],[1,1]]

  Bit 1 = 1: result = I × M^2 = M^2 = [[2,1],[1,1]], square base
    base = M^4 = [[5,3],[3,2]]

  Bit 2 = 0: skip multiply, square base
    base = M^8 = [[34,21],[21,13]]

  Bit 3 = 1: result = M^2 × M^8 = M^10, square base (done)
    result = [[2,1],[1,1]] × [[34,21],[21,13]]
           = [[2×34+1×21, 2×21+1×13], [1×34+1×21, 1×21+1×13]]
           = [[89, 55], [55, 34]]

F(10) = result[0][1] = 55 ✓
```

Only 4 matrix multiplications instead of 10 iterative steps.

### Example 2: Nim Game [3, 4, 5]

Piles: [3, 4, 5]

```
Compute XOR:
  3 = 011
  4 = 100
  5 = 101
  XOR = 011 ⊕ 100 ⊕ 101 = 010 = 2

XOR = 2 ≠ 0 → First player wins!

Finding the winning first move:
  For each pile, check if pile ^ xor_sum < pile:
    Pile 0 (3): 3 ^ 2 = 1 < 3 ✓ → Remove 3-1 = 2 stones from pile 0

After removing 2 from pile 0: [1, 4, 5]
  Check: 1 ⊕ 4 ⊕ 5 = 001 ⊕ 100 ⊕ 101 = 000 = 0 ✓

Now the second player faces XOR = 0, a losing position.
Whatever they do, the first player can always restore XOR to 0.
```

---

## Pattern Recognition

| Signal | Technique |
|---|---|
| "compute f(n) for very large n" (n ≤ 10^18) | Matrix exponentiation |
| "linear recurrence" or "f(n) depends on f(n-1), f(n-2), ..." | Build companion matrix, exponentiate |
| "count paths of length k in a graph" | Adjacency matrix raised to k-th power |
| "who wins the game" / "optimal play" | Game theory (Nim/Grundy/minimax) |
| "take turns removing" / "two players alternate" | Check for Nim variant or game DP |
| XOR of pile sizes / divisibility pattern | Nim theorem or Sprague-Grundy |
| "can the first player always win" | Game state DP: dp[state] = win/lose |
| "maximize score difference" / "both play optimally" | Minimax DP |
| "phone keypad" / "count strings of length n" with transitions | Matrix exponentiation on transition matrix |

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "compute f(n) for n up to 10^18" | Matrix exponentiation | Linear recurrence as matrix power reduces O(n) to O(d^3 log n) |
| "f(n) = a*f(n-1) + b*f(n-2) + ..." | Companion matrix + matrix power | Fixed-depth linear recurrence maps directly to a d x d matrix |
| "count paths of length k in a graph" | Adjacency matrix raised to power k | Entry (i,j) of A^k counts distinct k-length walks from i to j |
| "phone keypad dialing" / "count strings with transition rules" | Transition matrix exponentiation | Model valid transitions as a graph, then count length-n paths |
| "two players alternate" / "who wins the game" | Game theory (Nim / Grundy / minimax) | Classify positions as winning or losing by backward induction |
| "remove stones from piles" / "XOR of pile sizes" | Nim theorem | First player wins iff XOR of all pile sizes is non-zero |
| "take 1, 3, or 4 stones" (custom move set) | Sprague-Grundy + mex | Compute Grundy number as mex of reachable Grundy values |
| "independent sub-games played simultaneously" | XOR of Grundy numbers | Sprague-Grundy composition: combined game Grundy = XOR of parts |
| "maximize score difference" / "both play optimally" | Minimax DP | Alternate between max and min at each recursive level |
| "can the first player always win" with small state space | Bitmask game DP | Encode chosen elements as bitmask; memoize win/lose per state |
| "even/odd parity determines winner" | Mathematical analysis | Check for parity shortcuts before implementing full game DP |

---

## Problem Set (21 Problems)

### Day 1–2: Foundations (6 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Fibonacci Number | Easy | Matrix exponentiation (2×2) | [LC 509](https://leetcode.com/problems/fibonacci-number/) |
| 2 | N-th Tribonacci Number | Easy | Matrix exponentiation (3×3) | [LC 1137](https://leetcode.com/problems/n-th-tribonacci-number/) |
| 3 | Nim Game | Easy | XOR = n%4 check (degenerate Nim) | [LC 292](https://leetcode.com/problems/nim-game/) |
| 4 | Stone Game | Medium | Game DP / math (first player always wins) | [LC 877](https://leetcode.com/problems/stone-game/) |
| 5 | Stone Game II | Medium | Minimax DP with suffix sums | [LC 1140](https://leetcode.com/problems/stone-game-ii/) |
| 6 | Predict the Winner | Medium | Minimax DP — score difference | [LC 486](https://leetcode.com/problems/predict-the-winner/) |

### Day 3–4: Core Practice (8 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Stone Game III | Hard | DP with suffix sums, three-way outcome | [LC 1406](https://leetcode.com/problems/stone-game-iii/) |
| 8 | Stone Game IV | Hard | Game DP — can you always take perfect square | [LC 1510](https://leetcode.com/problems/stone-game-iv/) |
| 9 | Can I Win | Medium | Bitmask DP game state | [LC 464](https://leetcode.com/problems/can-i-win/) |
| 10 | Flip Game II | Medium | Grundy numbers / game DP on string state | [LC 294](https://leetcode.com/problems/flip-game-ii/) |
| 11 | Cat and Mouse | Hard | BFS game on graph, three-state (mouse/cat/draw) | [LC 913](https://leetcode.com/problems/cat-and-mouse/) |
| 12 | Stone Game VII | Medium | Minimax DP — maximize score difference | [LC 1690](https://leetcode.com/problems/stone-game-vii/) |
| 13 | Divisor Game | Easy | Game DP / math (even wins) | [LC 1025](https://leetcode.com/problems/divisor-game/) |
| 14 | Knight Dialer | Medium | Matrix exponentiation on 10-state transition | [LC 935](https://leetcode.com/problems/knight-dialer/) |

### Day 5–7: Advanced & Integration (7 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Cat and Mouse II | Hard | BFS game DP on grid with bounded moves | [LC 1728](https://leetcode.com/problems/cat-and-mouse-ii/) |
| 16 | Stone Game VIII | Hard | Prefix sum DP with optimal play | [LC 1872](https://leetcode.com/problems/stone-game-viii/) |
| 17 | Stone Game IX | Medium | Game theory with modular counting | [LC 2029](https://leetcode.com/problems/stone-game-ix/) |
| 18 | Chalkboard XOR Game | Hard | XOR game theory — even/odd parity | [LC 810](https://leetcode.com/problems/chalkboard-xor-game/) |
| 19 | Minimum Cost to Reach Destination in Time | Hard | DP on (city, time) state space | [LC 1928](https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/) |
| 20 | Race Car | Hard | BFS / DP on (position, speed) state | [LC 818](https://leetcode.com/problems/race-car/) |
| 21 | Count Vowels Permutation | Hard | Matrix exponentiation on 5-state transition | [LC 1220](https://leetcode.com/problems/count-vowels-permutation/) |

---

## Mock Interview

### Problem 1: Knight Dialer (Matrix Exponentiation Approach)

**Interviewer**: A chess knight sits on a phone dial pad. Given n, how many distinct numbers of length n can the knight dial, starting from any digit? Return modulo 10^9 + 7.

**Candidate**:

**Step 1 — Model as transitions.** The phone keypad is 0-9. From each digit, the knight can jump to specific others:
```
0 → [4, 6]      5 → []
1 → [6, 8]      6 → [0, 1, 7]
2 → [7, 9]      7 → [2, 6]
3 → [4, 8]      8 → [1, 3]
4 → [0, 3, 9]   9 → [2, 4]
```

**Step 2 — Build transition matrix.** Create a 10×10 matrix T where T[i][j] = 1 if a knight on j can jump to i:

```java
public int knightDialer(int n) {
    final long MOD = 1_000_000_007;
    int[][] jumps = {
        {4,6},{6,8},{7,9},{4,8},{0,3,9},
        {},{0,1,7},{2,6},{1,3},{2,4}
    };

    long[][] T = new long[10][10];
    for (int src = 0; src < 10; src++)
        for (int dst : jumps[src])
            T[dst][src] = 1;

    long[][] result = matPow(T, n - 1, MOD);

    long total = 0;
    for (int i = 0; i < 10; i++)
        for (int j = 0; j < 10; j++)
            total = (total + result[i][j]) % MOD;
    return (int) total;
}
```

**Step 3 — Complexity.** O(10³ · log n) = O(1000 · log n). For n = 5000, the iterative O(10·n) DP is fine, but if n = 10^18, matrix exponentiation is essential.

**Follow-up 1**: *Can you reduce the matrix size?* Yes — digits with symmetric behavior can be grouped. For example, `{1,3,7,9}` behave identically, `{2,8}` behave identically, and `{4,6}` behave identically. This reduces the 10×10 matrix to a 5×5 matrix.

**Follow-up 2**: *What if the knight can also stay in place?* Add 1 on the diagonal of T (self-loops). The matrix approach handles this naturally.

**Follow-up 3**: *What if certain digits are blocked?* Zero out the corresponding rows and columns in T.

---

### Problem 2: Stone Game II (Minimax DP)

**Interviewer**: Alice and Bob take turns picking stones. On each turn, a player takes stones from the first X piles where 1 ≤ X ≤ 2M, then M = max(M, X). Alice goes first. Return the maximum stones Alice can get.

**Candidate**:

**Step 1 — State space.** State = (index i, current M). At each state, the current player picks from piles[i..i+X-1] for some X in [1, 2M].

**Step 2 — Suffix sums.** Precompute suffix sums so we can quickly get the total stones from index i onward.

**Step 3 — DP formulation.** `dp[i][m]` = maximum stones the current player can take from piles[i:] with parameter M = m. The current player wants to maximize their own stones, which is (total remaining) - (what the opponent gets):

```java
public int stoneGameII(int[] piles) {
    int n = piles.length;
    int[] suffix = new int[n + 1];
    for (int i = n - 1; i >= 0; i--)
        suffix[i] = suffix[i + 1] + piles[i];

    int[][] memo = new int[n][n + 1];
    for (int[] row : memo) Arrays.fill(row, -1);

    return dp(0, 1, suffix, memo, n);
}

private int dp(int i, int m, int[] suffix, int[][] memo, int n) {
    if (i >= n) return 0;
    if (memo[i][m] != -1) return memo[i][m];

    int best = 0;
    for (int x = 1; x <= 2 * m && i + x <= n; x++) {
        int taken = suffix[i] - suffix[i + x];
        int oppGets = dp(i + x, Math.max(m, x), suffix, memo, n);
        int meGets = suffix[i + x] - oppGets;
        best = Math.max(best, taken + meGets);
    }

    return memo[i][m] = best;
}
```

**Step 4 — Complexity.** O(n² · n) in the worst case — n choices for i, up to n for m, and up to 2m choices per state.

**Follow-up 1**: *How does this differ from Stone Game I?* Stone Game I is a special case with exactly 2 choices per turn. It also has a mathematical proof that Alice always wins with even-length arrays.

**Follow-up 2**: *Can you use alpha-beta pruning here?* Yes, though memoization already prunes repeated states. Alpha-beta is more beneficial in tree-search (e.g., chess) where the state space is too large to memoize.

**Follow-up 3**: *What if we add the constraint that M can also decrease?* Then M is no longer monotonically increasing, potentially expanding the state space — but the same DP framework works with the modified transition.

---

## Tips and Pitfalls

1. **Matrix size determines feasibility**: A 10×10 matrix exponentiation is fast. A 1000×1000 matrix is borderline. Always minimize the matrix dimension by exploiting symmetry.

2. **Base case for matrix power**: M^0 = Identity matrix. Make sure your identity matrix initialization is correct. A common bug is starting with zeros.

3. **Modular arithmetic throughout**: When computing matrix powers modulo a prime, apply mod at every multiplication step to avoid integer overflow. In Java, use `long` for all intermediate products.

4. **Grundy number memoization**: Without memoization, Grundy computation is exponential. Always cache results.

5. **Recognizing Nim in disguise**: Many game problems are Nim variants. If a game has independent sub-games where you choose which sub-game to play, XOR the Grundy numbers.

6. **Game DP state encoding**: Use bitmasks for small sets of choices (e.g., Can I Win with up to 20 numbers → 2^20 states). Tuple the full state for larger games.

7. **Minimax optimization**: Suffix sums or prefix sums are almost always needed in Stone Game variants to avoid O(n) summation inside the DP transition.

8. **Companion matrix construction**: For f(n) = a₁f(n-1) + a₂f(n-2) + ... + a_d f(n-d), the first row is [a₁, a₂, ..., a_d] and the sub-diagonal is all 1s. Double-check the order of base values.

9. **Transition matrices for counting**: "Count strings/paths of length n with transition rules" → build the adjacency/transition matrix and exponentiate to n-1.

10. **Even/odd parity in games**: Some games (Divisor Game, Chalkboard XOR) have elegant solutions based on parity of the starting state. Always check for a math shortcut before implementing full game DP.
