---
sidebar_position: 18
title: "Week 17: Combinatorics + Probability + Inclusion-Exclusion"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 17: Combinatorics + Probability + Inclusion-Exclusion

Combinatorics and probability problems are among the most feared in interviews — they require mathematical reasoning that feels different from typical algorithm design. This week builds your toolkit from scratch: counting principles, advanced identities, and probabilistic DP, all with code you can directly apply.

<AlgoViz
  title="Permutations — Recursion Tree"
  description="Visualize the recursive generation of all permutations of [1, 2, 3]."
  steps={[
    { label: "Start", description: "Begin with empty permutation, remaining: [1, 2, 3]", current: "[]", remaining: "[1,2,3]" },
    { label: "Choose 1", description: "Pick 1 first, recurse on [2, 3]", current: "[1]", remaining: "[2,3]" },
    { label: "Choose 1,2", description: "Pick 2 next, recurse on [3]", current: "[1,2]", remaining: "[3]" },
    { label: "Leaf", description: "Only 3 left — permutation [1,2,3] complete", current: "[1,2,3]", result: "true" },
    { label: "Backtrack", description: "Backtrack: pick 3 instead of 2", current: "[1,3]", remaining: "[2]" },
    { label: "Leaf", description: "Permutation [1,3,2] complete", current: "[1,3,2]", result: "true" },
    { label: "Backtrack", description: "Backtrack to root, choose 2 first", current: "[2]", remaining: "[1,3]" },
    { label: "Continue", description: "Generates [2,1,3], [2,3,1], [3,1,2], [3,2,1]", current: "...", result: "6 total permutations = 3!" }
  ]}
/>

---

## Core Theory

### 1. Permutations & Combinations

**Why this technique exists.** Counting problems form the backbone of many interview and competition problems. Rather than enumerating all possibilities (which is often exponentially slow), permutation and combination formulas give you closed-form answers in O(1) after precomputation. The key decision is whether order matters (permutation) or not (combination), which determines which formula to apply.

**Interview signals.** Look for: (1) "how many ways to arrange/select," (2) "count orderings" vs. "count subsets," (3) constraints mentioning mod 10^9+7 (indicating large factorials that need modular arithmetic), (4) "choose r from n items."

#### Definitions

- **Permutation** (order matters): The number of ways to choose and arrange r items from n:

$$nPr = \frac{n!}{(n-r)!}$$

- **Combination** (order doesn't matter): The number of ways to choose r items from n:

$$nCr = \binom{n}{r} = \frac{n!}{r!(n-r)!}$$

#### Key Identities

| Identity | Meaning |
|----------|---------|
| C(n, 0) = C(n, n) = 1 | One way to choose nothing or everything |
| C(n, k) = C(n, n−k) | Symmetry |
| C(n, k) = C(n−1, k−1) + C(n−1, k) | Pascal's rule (recursive definition) |
| Σ C(n, k) for k=0..n = 2ⁿ | Total subsets of size n |

#### Computing nCr mod p (p prime)

**When to use this template.** Reach for this precomputed factorial approach whenever a problem asks you to compute binomial coefficients modulo a prime (typically 10^9+7). If you need multiple nCr queries during DP transitions or combinatorial enumeration, the O(n) precomputation pays for itself immediately. This is the standard competitive programming setup for any counting problem with a mod constraint.

For competitive programming, precompute factorial and inverse-factorial arrays, then answer any nCr query in O(1):

```java
import java.util.*;

static final int MOD = 1_000_000_007;
static long[] fact, invFact;

static void precompute(int maxN) {
    fact = new long[maxN + 1];
    invFact = new long[maxN + 1];
    fact[0] = 1;
    for (int i = 1; i <= maxN; i++)
        fact[i] = fact[i - 1] * i % MOD;

    invFact[maxN] = modPow(fact[maxN], MOD - 2, MOD);
    for (int i = maxN - 1; i >= 0; i--)
        invFact[i] = invFact[i + 1] * (i + 1) % MOD;
}

static { precompute(200_000); }

static long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
}
```

**Why compute `inv_fact` backwards?** We compute `inv_fact[max_n]` using one modular exponentiation (O(log MOD)), then use the recurrence `inv_fact[i] = inv_fact[i+1] × (i+1)` — only O(1) per entry.

#### Pascal's Triangle (for small n or non-prime moduli)

When n is small (≤ ~5000) or the modulus isn't prime, build Pascal's triangle with DP:

```java
static long[][] pascal(int maxN, int mod) {
    long[][] C = new long[maxN + 1][maxN + 1];
    for (int i = 0; i <= maxN; i++) {
        C[i][0] = 1;
        for (int j = 1; j <= i; j++)
            C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % mod;
    }
    return C;
}
```

---

### 2. Catalan Numbers

**Why this technique exists.** The Catalan numbers appear whenever a problem involves recursively splitting something into two independent parts with a constraint that preserves structure. They count the number of ways to match parentheses, build binary trees, triangulate polygons, and stay below a diagonal on a grid -- problems that seem unrelated but share the same recursive decomposition. Recognizing a problem as Catalan-structured gives you an immediate closed-form answer instead of a complex DP.

**The intuition.** Consider balanced parentheses with n pairs. The first open paren must close at some position 2k (matching with the k-th close paren). This splits the remaining parens into two independent groups: k-1 pairs inside and n-k pairs outside. Summing over all possible k gives the Catalan recurrence: C(n) = sum of C(i) * C(n-1-i) for i from 0 to n-1. This is the same recurrence as "number of BSTs with n nodes" (the root splits values into left and right subtrees) and "triangulations of an (n+2)-gon" (choosing the first triangle splits the polygon).

**Interview signals.** If the answer sequence for small inputs starts 1, 1, 2, 5, 14, 42, it is almost certainly Catalan. Look for: (1) "count valid parenthesizations," (2) "structurally unique BSTs," (3) "number of ways to triangulate," (4) grid paths that stay below the diagonal.

The nth Catalan number is:

$$C_n = \frac{1}{n+1}\binom{2n}{n} = \frac{(2n)!}{(n+1)!\,n!}$$

First few values: 1, 1, 2, 5, 14, 42, 132, 429, ...

#### Five Classic Interpretations

| Interpretation | n | C_n counts |
|----------------|---|------------|
| **Balanced parentheses** | pairs of parens | Distinct valid sequences of n pairs |
| **Unique BSTs** | nodes | Structurally unique BSTs with nodes 1..n |
| **Triangulations** | extra vertices | Ways to triangulate a convex (n+2)-gon |
| **Monotonic lattice paths** | grid size | Paths from (0,0) to (n,n) staying below diagonal |
| **Non-crossing partitions** | elements | Non-crossing pair partitions of 2n points on a circle |

#### Recurrence

$$C_n = \sum_{i=0}^{n-1} C_i \cdot C_{n-1-i}, \quad C_0 = 1$$

This comes from choosing where the root splits a BST (or where the first matching paren closes).

```java
static long catalanDp(int n) {
    long[] dp = new long[n + 1];
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int j = 0; j < i; j++)
            dp[i] += dp[j] * dp[i - 1 - j];
    return dp[n];
}

static long catalanFormula(int n, int mod) {
    return nCr(2 * n, n) * modPow(n + 1, mod - 2, mod) % mod;
}
```

---

### 3. Stars and Bars

**Why this technique exists.** Many counting problems boil down to distributing identical objects among distinct containers. Enumerating all distributions is exponential, but Stars and Bars gives you a closed-form answer using a single binomial coefficient. The technique transforms a distribution problem into a combinatorial one: placing dividers among objects.

**Interview signals.** Look for: (1) "distribute n items among k groups," (2) "number of non-negative integer solutions to x1 + x2 + ... + xk = n," (3) "multiset of size n from k types," (4) problems that combine distribution with upper-bound constraints (which require PIE on top of Stars and Bars).

**Problem:** Distribute n identical items into k distinct bins (each bin can have 0 or more).

$$\text{Ways} = \binom{n + k - 1}{k - 1}$$

**Intuition:** Imagine n stars in a row. Place k−1 bars among them to divide into k groups.

**With minimum constraints:** If each bin must have at least `mᵢ` items, subtract minimums first. Let n' = n − Σmᵢ, then the answer is C(n' + k − 1, k − 1), provided n' ≥ 0.

**With upper-bound constraints:** Use inclusion-exclusion (see below).

**Example:** Distribute 10 candies among 3 children = C(12, 2) = 66 ways.

---

### 4. Principle of Inclusion-Exclusion (PIE)

**Why this technique exists.** Directly counting objects that satisfy *none* of several constraints (e.g., "numbers not divisible by 2, 3, or 5") is often intractable. PIE provides a systematic way to compute this by alternately adding and subtracting overcounts. It transforms a difficult "none of" question into a sum of simpler "at least one of" questions. PIE is the mathematical backbone behind derangements, Euler's totient function, and many competitive programming counting problems.

**The intuition.** Imagine counting students who failed no exam. Start with all students (universe). Subtract those who failed exam A, those who failed B, those who failed C. But now you have subtracted students who failed both A and B twice, so add them back. But students who failed all three were subtracted three times and added back three times, so subtract them once more. This zigzag of over-correction and re-correction converges to the exact count.

**Common mistakes.** (1) Getting the sign wrong: odd-sized intersections are *added*, even-sized are *subtracted* when computing the union. When computing the complement ("none of"), the signs flip. (2) Forgetting that PIE with k constraints requires iterating over all 2^k subsets -- only practical for k up to about 20. (3) Confusing PIE with the complement principle (which is just PIE with one set).

#### The Formula

For sets A₁, A₂, ..., Aₙ:

$$|A_1 \cup A_2 \cup \cdots \cup A_n| = \sum|A_i| - \sum|A_i \cap A_j| + \sum|A_i \cap A_j \cap A_k| - \cdots$$

Equivalently, to count elements in **none** of the sets (complement):

$$|\text{none}| = |U| - \sum|A_i| + \sum|A_i \cap A_j| - \cdots$$

#### Application: Count of integers in [1, N] divisible by at least one of given primes

```java
static int countDivisible(int n, int[] primes) {
    int total = 0;
    int k = primes.length;
    for (int mask = 1; mask < (1 << k); mask++) {
        long product = 1;
        int bits = 0;
        for (int i = 0; i < k; i++) {
            if ((mask & (1 << i)) != 0) {
                product *= primes[i];
                bits++;
            }
        }
        int contribution = (int) (n / product);
        if (bits % 2 == 1) total += contribution;
        else total -= contribution;
    }
    return total;
}
```

**Complexity:** O(2ⁿ) subsets × O(k) per subset. Practical only for small number of sets (k ≤ 20).

#### Derangements

A **derangement** is a permutation where no element appears in its original position.

$$D_n = n! \sum_{k=0}^{n} \frac{(-1)^k}{k!}$$

This comes directly from PIE: let Aᵢ = "permutations where element i is fixed." Then |derangements| = |none of A₁..Aₙ|.

**When to use this template.** Use the recurrence-based approach below whenever a problem involves permutations where specific elements must not be in specific positions. The recurrence D(n) = (n-1)(D(n-1) + D(n-2)) avoids floating-point issues from the summation formula and runs in O(n) time with O(n) space.

```java
static long derangements(int n) {
    if (n == 0) return 1;
    if (n == 1) return 0;
    long[] dp = new long[n + 1];
    dp[0] = 1;
    dp[1] = 0;
    for (int i = 2; i <= n; i++)
        dp[i] = (i - 1) * (dp[i - 1] + dp[i - 2]);
    return dp[n];
}
```

The recurrence D(n) = (n−1)(D(n−1) + D(n−2)) is more efficient than the summation formula and avoids floating-point issues.

---

### 5. Probability & Expected Value

**Why this technique exists.** Probability problems in interviews test mathematical reasoning combined with algorithmic thinking. The two key tools -- linearity of expectation and probability DP -- cover nearly all interview probability problems. Linearity of expectation is shockingly powerful because it works without independence, often reducing complex expected-value problems to simple summations. Probability DP handles multi-step stochastic processes where you need exact probabilities, not just expectations.

**Common mistakes.** (1) Assuming independence when applying linearity of expectation (you do not need independence -- that is the whole point). (2) Using floating-point arithmetic when the problem asks for exact answers mod a prime (use modular inverse instead of division). (3) Forgetting that probability DP transitions must multiply by transition probabilities, not add them.

#### Linearity of Expectation

The most powerful tool in probabilistic analysis:

$$E[X + Y] = E[X] + E[Y]$$

This holds **even when X and Y are dependent** — no independence required!

**Example:** Expected number of fixed points in a random permutation of n elements.
- Let Xᵢ = 1 if element i is in position i, 0 otherwise.
- E[Xᵢ] = 1/n for each i.
- E[total fixed points] = Σ E[Xᵢ] = n × (1/n) = 1.

So on average, a random permutation has exactly 1 fixed point — regardless of n!

#### Indicator Random Variables

Break a complex count into binary indicators:
1. Define Xᵢ is 0 or 1 for each "event of interest."
2. E[total] = Σ E[Xᵢ] = Σ P(Xᵢ = 1).

This simplifies problems where directly computing the distribution is hard.

#### DP for Probability

Many probability problems reduce to DP where:
- State: current configuration (position, count, etc.)
- Transition: multiply by transition probabilities
- Base case: known terminal probability (often 1 or 0)

**When to use this template.** Use this forward-probability DP pattern when a problem involves a stochastic process with discrete states and you need the probability of being in a particular state after k steps. Each state distributes its probability mass to successor states weighted by transition probabilities. This covers problems like "knight probability on chessboard," "random walk reaching target," and "card game outcome probabilities."

Template:

```java
// dp[state] = probability of reaching 'state'.
// For each state, distribute probability to next states.
Map<State, Double> dp = new HashMap<>();
dp.put(initialState, 1.0);

for (int step = 0; step < numSteps; step++) {
    Map<State, Double> newDp = new HashMap<>();
    for (var entry : dp.entrySet()) {
        State state = entry.getKey();
        double prob = entry.getValue();
        for (var transition : getTransitions(state)) {
            newDp.merge(transition.next, prob * transition.prob, Double::sum);
        }
    }
    dp = newDp;
}
```

---

### 6. Burnside's Lemma (Brief)

When counting **distinct objects under symmetry** (e.g., rotations of a necklace):

$$\text{distinct objects} = \frac{1}{|G|} \sum_{g \in G} |Fix(g)|$$

Where G is the symmetry group and Fix(g) is the number of colorings unchanged by symmetry g.

**Example:** Colorings of a 4-bead necklace with 2 colors under rotation:
- Identity: all 2⁴ = 16 are fixed.
- 90° rotation: only same-color beads → 2 fixed.
- 180° rotation: pairs must match → 2² = 4 fixed.
- 270° rotation: same as 90° → 2 fixed.
- Distinct = (16 + 2 + 4 + 2) / 4 = 6.

**Interview signals.** Look for: (1) "count distinct necklaces/bracelets" (rotational and reflective symmetry), (2) "distinct colorings of a grid/cube under symmetry," (3) problems where naive counting overcounts symmetric configurations. If a problem says "up to rotation" or "rotationally equivalent," Burnside's lemma is almost certainly the right tool.

---

### 7. Pigeonhole Principle

**Why this technique exists.** The pigeonhole principle is deceptively simple but is the key insight behind proving existence results in many algorithm problems. It tells you that something *must* exist (a duplicate, a cycle, a collision) without needing to find it explicitly. This shifts the problem from "does X exist?" (which might seem hard) to "X must exist, now find it efficiently."

**Interview signals.** Look for: (1) array of n+1 elements with values in range [1, n] (guaranteed duplicate), (2) linked list cycle detection, (3) "prove that a repeated substring must exist," (4) birthday paradox style probability arguments.

If **n + 1** items are placed into **n** bins, at least one bin contains **≥ 2 items**.

Generalized: If kn + 1 items into n bins, some bin has ≥ k + 1 items.

#### Applications in Coding Problems

| Application | Pigeonhole Reasoning |
|-------------|---------------------|
| **Duplicate in array of n+1 elements in [1,n]** | n values, n+1 elements → duplicate exists |
| **Cycle detection (Floyd's)** | Finite states → repeated state → cycle |
| **Birthday paradox** | ~23 people → >50% chance of shared birthday among 365 |
| **Substring problems** | Limited alphabet → repeated patterns guaranteed |

---

## Worked Examples

### Example 1: Derangements D(4) using PIE

Count permutations of `{1, 2, 3, 4}` where no element is in its original position.

**Total permutations:** 4! = 24

**Let Aᵢ = permutations fixing element i.**

| Term | Sets | Count | Formula |
|------|------|-------|---------|
| +Σ\|Aᵢ\| | A₁, A₂, A₃, A₄ | 4 × 3! = 24 | Fix one, permute rest |
| −Σ\|Aᵢ∩Aⱼ\| | C(4,2) = 6 pairs | 6 × 2! = 12 | Fix two, permute rest |
| +Σ\|Aᵢ∩Aⱼ∩Aₖ\| | C(4,3) = 4 triples | 4 × 1! = 4 | Fix three, permute rest |
| −\|A₁∩A₂∩A₃∩A₄\| | 1 quadruple | 1 × 0! = 1 | All fixed |

**Derangements = 24 − 24 + 12 − 4 + 1 = 9**

The 9 derangements of `{1,2,3,4}`:
(2,1,4,3), (2,3,4,1), (2,4,1,3), (3,1,4,2), (3,4,1,2), (3,4,2,1), (4,1,2,3), (4,3,1,2), (4,3,2,1)

**Verify with recurrence:** D(2) = 1, D(3) = 2, D(4) = 3 × (D(3) + D(2)) = 3 × 3 = 9 ✓

---

### Example 2: Computing C(10, 3) mod 10⁹+7

Using precomputed factorials and inverse factorials:

**Step 1:** Precompute factorials mod 10⁹+7:
- fact[0] = 1
- fact[1] = 1
- fact[2] = 2
- fact[3] = 6
- ...
- fact[10] = 3628800

**Step 2:** Compute inverse factorials:
- inv_fact[10] = pow(3628800, 10⁹+5, 10⁹+7)  (using Fermat)
- inv_fact[9] = inv_fact[10] × 10 mod (10⁹+7)
- ... (fill downward)
- inv_fact[3] = ..., inv_fact[7] = ...

**Step 3:** Answer:
- C(10, 3) = fact[10] × inv_fact[3] × inv_fact[7] mod (10⁹+7)
- = 3628800 × inv(6) × inv(5040) mod (10⁹+7)
- = 3628800 / 6 / 5040 = 120

**Direct verification:** C(10,3) = 10×9×8 / (3×2×1) = 720/6 = 120 ✓

The precomputed approach is essential when you need thousands of nCr queries (e.g., in DP transitions).

---

## Pattern Recognition

| Pattern / Clue | Technique |
|----------------|-----------|
| "count arrangements" / "how many ways" | Permutations, combinations, or DP |
| "probability of" / "expected number of" | Probability DP or linearity of expectation |
| "distinct configurations" / "up to rotation" | Burnside's lemma |
| "at least one" / "none of" / "not divisible by any" | Inclusion-exclusion |
| "distribute items into bins" | Stars and bars (possibly + PIE for upper bounds) |
| "balanced parentheses" / "unique BSTs" | Catalan numbers |
| "no element in original position" | Derangements |
| "mod 10⁹+7" with large n | Precompute fact[] and inv_fact[] |
| "next permutation" / "kth permutation" | Factoradic number system |
| "grid paths avoiding diagonal" | Catalan / ballot problem |

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "count arrangements of n items" or "how many ways to choose" | Combinatorics (nCr/nPr) | Direct counting with factorial precomputation and modular arithmetic |
| "probability of reaching state X after k steps" | DP with probabilities | States transition with fractional weights; accumulate probability forward |
| "expected number of events" or "average count" | Linearity of expectation | Break into indicator variables; E[sum] = sum of E[each], even with dependence |
| "no element in its original position" | Derangements (PIE) | Classic inclusion-exclusion on fixed points; use recurrence D(n) = (n-1)(D(n-1) + D(n-2)) |
| "distribute n identical items into k bins" | Stars and bars | Counting compositions: C(n+k-1, k-1); combine with PIE for upper bounds |
| "distinct structures under rotation/reflection" | Burnside's lemma | Average fixed-point counts over all symmetry group operations |
| "at least one of" / "not divisible by any of" | Inclusion-exclusion (PIE) | Alternating add/subtract over subsets corrects overcounting systematically |
| "balanced parentheses" / "unique BSTs" / "triangulate polygon" | Catalan numbers | Recursive split into two independent sub-problems yields Catalan recurrence |
| "answer mod 10^9+7" with n up to 10^5 or larger | Precompute fact[] + invFact[] | Fermat's little theorem gives O(1) per nCr query after O(n) precomputation |
| "kth permutation" or "next lexicographic permutation" | Factoradic number system | Decompose k into factorial bases to build the permutation digit by digit |
| "count strings with repeated characters" | Multinomial coefficient | n! / (c1! * c2! * ... * ck!) with precomputed inverse factorials |
| "grid paths staying below diagonal" or "ballot problem" | Catalan / reflection principle | Total paths minus bad paths that cross boundary, counted via reflection |

---

## Practice Problems (21 Problems)

### Day 1–2: Permutations, Combinations & Catalan Numbers (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 1 | Unique Paths | Medium | C(m+n−2, m−1) or grid DP | [LC 62](https://leetcode.com/problems/unique-paths/) |
| 2 | Unique Paths II | Medium | DP with obstacles (can't use formula directly) | [LC 63](https://leetcode.com/problems/unique-paths-ii/) |
| 3 | Different Ways to Add Parentheses | Medium | Divide-and-conquer on operators (Catalan-like) | [LC 241](https://leetcode.com/problems/different-ways-to-add-parentheses/) |
| 4 | Unique Binary Search Trees | Medium | Catalan number C_n | [LC 96](https://leetcode.com/problems/unique-binary-search-trees/) |
| 5 | Permutation Sequence | Hard | Factoradic: build kth permutation digit by digit | [LC 60](https://leetcode.com/problems/permutation-sequence/) |
| 6 | Next Permutation | Medium | Find rightmost ascent, swap, reverse suffix | [LC 31](https://leetcode.com/problems/next-permutation/) |

### Day 3–4: Counting & Probability DP (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 7 | Count Sorted Vowel Strings | Medium | Stars-and-bars C(n+4, 4) or DP | [LC 1641](https://leetcode.com/problems/count-sorted-vowel-strings/) |
| 8 | Count Number of Homogenous Substrings | Medium | Counting runs: each run of length L contributes L(L+1)/2 | [LC 1759](https://leetcode.com/problems/count-number-of-homogenous-substrings/) |
| 9 | Knight Probability in Chessboard | Medium | Probability DP: dp[step][r][c] = probability of being at (r,c) | [LC 688](https://leetcode.com/problems/knight-probability-in-chessboard/) |
| 10 | Soup Servings | Medium | Probability DP with memoization; converges for large N | [LC 808](https://leetcode.com/problems/soup-servings/) |
| 11 | New 21 Game | Medium | Sliding-window probability DP | [LC 837](https://leetcode.com/problems/new-21-game/) |
| 12 | Count Anagrams | Hard | Multinomial coefficient: n! / (c₁!·c₂!·...·cₖ!) with mod inverse | [LC 2514](https://leetcode.com/problems/count-anagrams/) |
| 13 | Distinct Subsequences | Hard | DP: dp[i][j] = ways to form t[0..j] from s[0..i] | [LC 115](https://leetcode.com/problems/distinct-subsequences/) |
| 14 | Kth Smallest Instructions | Hard | Combinatorics: count paths with 'H' vs 'V', choose greedily | [LC 1643](https://leetcode.com/problems/kth-smallest-instructions/) |

### Day 5–7: Advanced Combinatorics & Inclusion-Exclusion (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 15 | Number of Music Playlists | Hard | PIE or DP: dp[i][j] = playlists of length i using exactly j songs | [LC 920](https://leetcode.com/problems/number-of-music-playlists/) |
| 16 | Probability of Two Boxes Having Same Number of Distinct Balls | Hard | Enumerate splits, count favorable / total via multinomials | [LC 1467](https://leetcode.com/problems/probability-of-a-two-boxes-having-the-same-number-of-distinct-balls/) |
| 17 | Count Ways to Distribute Candies | Hard | Stirling numbers of the second kind + PIE | [LC 1692](https://leetcode.com/problems/distribute-repeating-integers/) |
| 18 | Count All Valid Pickup and Delivery Options | Hard | Product formula: Π(2i−1) for interleaving pairs | [LC 1359](https://leetcode.com/problems/count-all-valid-pickup-and-delivery-options/) |
| 19 | Count Vowels Permutation | Hard | Matrix exponentiation or DP on transition rules | [LC 1220](https://leetcode.com/problems/count-vowels-permutation/) |
| 20 | Number of Ways to Rearrange Sticks | Hard | Stirling numbers of the first kind: dp[n][k] | [LC 1866](https://leetcode.com/problems/number-of-ways-to-rearrange-sticks-with-k-sticks-visible/) |
| 21 | Painting a Grid With Three Different Colors | Hard | Profile DP: enumerate valid column states, transition between columns | [LC 1931](https://leetcode.com/problems/painting-a-grid-with-three-different-colors/) |

---

## Mock Interview

### Problem 1: Number of Music Playlists (LC 920)

**Interviewer:** You want to create a playlist of `goal` songs from a library of `n` songs. Every song must appear at least once, and a song can only be replayed after `k` other songs have been played. Return the number of playlists mod 10⁹+7.

**Candidate approach:**

**DP formulation:**
- Let `dp[i][j]` = number of playlists of length `i` using exactly `j` distinct songs.
- **Add a new song:** Choose from `n − (j−1)` unused songs → `dp[i-1][j-1] × (n − j + 1)`
- **Replay an old song:** Must be one of `j − k` eligible songs (j songs used, k most recent are blocked) → `dp[i-1][j] × max(j − k, 0)`

```java
public int numMusicPlaylists(int n, int goal, int k) {
    final int MOD = 1_000_000_007;
    long[][] dp = new long[goal + 1][n + 1];
    dp[0][0] = 1;
    for (int i = 1; i <= goal; i++) {
        for (int j = 1; j <= n; j++) {
            dp[i][j] = dp[i - 1][j - 1] * (n - j + 1) % MOD;
            if (j > k)
                dp[i][j] = (dp[i][j] + dp[i - 1][j] * (j - k)) % MOD;
        }
    }
    return (int) dp[goal][n];
}
```

**Complexity:** O(goal × n) time, O(goal × n) space (can be optimized to O(n) with rolling array).

**Follow-up 1:** *Can you solve this with inclusion-exclusion instead of DP?*

Yes. Let f(j) = playlists of length `goal` using **at most** j songs (each replayable after k others). By PIE:
- answer = Σ (−1)^(n−j) × C(n, j) × f(j) for j=1..n
- f(j) = j × (j−1) × ... × (j−k) × (j−k)^(goal−k−1) ... (complex but closed-form for each j)

The DP approach is more straightforward for implementation.

**Follow-up 2:** *What if there's no replay restriction (k = 0)?*

Then dp[i][j] = dp[i-1][j-1] × (n−j+1) + dp[i-1][j] × j. This is the formula for **Stirling numbers of the second kind** × n!: answer = S(goal, n) × n!.

**Follow-up 3:** *How would you handle expected number of distinct songs after playing `goal` random songs (no restrictions)?*

Use **linearity of expectation**: E[distinct songs] = Σ P(song i appears at least once) = n × (1 − ((n−1)/n)^goal). No DP needed.

---

### Problem 2: Knight Probability in Chessboard (LC 688)

**Interviewer:** A knight starts at position (row, column) on an n×n chessboard. It makes exactly k moves, each uniformly random from the 8 possible knight moves. Return the probability it remains on the board after k moves.

**Candidate approach:**

**Probability DP:**
- `dp[step][r][c]` = probability the knight is at (r, c) after `step` moves (and has never left the board).
- Base: `dp[0][row][column] = 1.0`
- Transition: For each (r, c) with `dp[step][r][c] > 0`, distribute `dp[step][r][c] / 8` to each valid neighbor.
- Answer: sum of all `dp[k][r][c]`.

```java
public double knightProbability(int n, int k, int row, int column) {
    int[][] moves = {{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}};
    double[][] dp = new double[n][n];
    dp[row][column] = 1.0;

    for (int step = 0; step < k; step++) {
        double[][] newDp = new double[n][n];
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (dp[r][c] > 0) {
                    for (int[] m : moves) {
                        int nr = r + m[0], nc = c + m[1];
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n)
                            newDp[nr][nc] += dp[r][c] / 8.0;
                    }
                }
            }
        }
        dp = newDp;
    }

    double total = 0;
    for (double[] row2 : dp)
        for (double val : row2) total += val;
    return total;
}
```

**Complexity:** O(k × n²) time, O(n²) space.

**Follow-up 1:** *What is the expected number of moves before the knight falls off?*

Define E[r][c] = expected moves from (r,c) before falling off. Set up equations: E[r][c] = 1 + (1/8) × Σ E[nr][nc] for valid neighbors. Solve the linear system (or iterate until convergence). This uses **linearity of expectation** implicitly.

**Follow-up 2:** *Can you optimize for very large k?*

Model the transition as an n² × n² matrix. The probability vector after k steps is M^k × v₀. Use **matrix exponentiation** in O(n⁶ log k). Practical only for small n.

**Follow-up 3:** *What if the board has blocked cells the knight can't land on?*

Treat blocked cells like off-board cells: don't distribute probability to them. The DP structure is identical; just check the blocked condition alongside the bounds check.

---

## Tips & Pitfalls

1. **Overflow with factorials.** Always mod at every multiplication step. Never compute `n!` first and mod later — factorials grow astronomically. In Java, even `long` overflows quickly without modding.

2. **Precomputing inverse factorials.** The backward recurrence `inv_fact[i] = inv_fact[i+1] * (i+1) % MOD` requires only **one** modular exponentiation (for `inv_fact[max_n]`). This is O(n) total, much better than computing n separate mod inverses.

3. **PIE sign alternation.** The sign alternates with the number of sets in each intersection:
   - Odd number of sets → **add**
   - Even number of sets → **subtract**
   
   A common bug is getting the sign wrong. Use `(-1)^(bits+1)` or equivalently check `bits % 2`.

4. **Linearity of expectation simplifies hard problems.** When asked "expected number of X", try indicator variables before building complex probability DPs. Many problems that seem to need the full distribution only need the expectation, which is far simpler.

5. **Catalan number recognition.** If the answer sequence starts 1, 2, 5, 14, 42, it's almost certainly Catalan. Look for recursive structures that split into two independent sub-problems.

6. **Stirling numbers** appear in two flavors:
   - **First kind** (unsigned) `c(n,k)`: permutations of n with exactly k cycles → "rearrange sticks" problems.
   - **Second kind** `S(n,k)`: partitions of n elements into k non-empty subsets → "distribute into groups" problems.
   
   Both satisfy DP recurrences and connect to PIE.

7. **When to use PIE vs. DP:**
   - PIE works when you can enumerate subsets of "bad" constraints (typically ≤ 20 constraints).
   - DP works when the state space is manageable and transitions are clear.
   - Sometimes both approaches are valid; PIE often gives a closed-form while DP gives a table.

8. **Probability DP precision.** Use `float` for small instances, but for exact answers mod a prime, track numerators mod p and multiply by modular inverses instead of using floating-point division.

9. **Multinomial coefficients.** The number of ways to arrange n items with repetitions (c₁ of type 1, c₂ of type 2, ...):
   
   $$\frac{n!}{c_1! \cdot c_2! \cdots c_k!} = \text{fact}[n] \times \prod \text{inv\_fact}[c_i] \mod p$$
   
   This appears frequently in anagram-counting and string arrangement problems.
