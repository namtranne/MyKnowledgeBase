---
sidebar_position: 12
title: "Week 11: Bitmask DP"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 11: Bitmask DP

## Why This Week Matters

Some of the hardest interview problems have a hidden gift: **n is small** (≤ 20). When you see a constraint like "assign N items to N slots," "visit all nodes exactly once," or "partition into groups," and n is tiny, the answer is almost always bitmask DP. This technique encodes subset membership into a single integer and uses it as a DP state, turning exponential brute-force into tractable O(2^n · n) or O(3^n) solutions. It appears frequently in Google, Meta, and competitive programming rounds.

---

## Core Theory

<AlgoViz
  title="Bitmask Subset Enumeration"
  steps={[
    { description: "Start: mask = 0b1101 (13), representing subset {0, 2, 3} of n=4 elements.", state: { mask: "1101", subset: "{0, 2, 3}", sub: "1101", step: "Initialize sub = mask" } },
    { description: "sub = 1101 (13) — process subset {0, 2, 3}.", state: { mask: "1101", sub: "1101", decimal: 13, processing: "{0, 2, 3}" } },
    { description: "Compute (sub - 1) & mask = (12) & 13 = 1100 & 1101 = 1100 (12).", state: { mask: "1101", sub: "1100", decimal: 12, processing: "{2, 3}" } },
    { description: "Compute (sub - 1) & mask = (11) & 13 = 1011 & 1101 = 1001 (9).", state: { mask: "1101", sub: "1001", decimal: 9, processing: "{0, 3}" } },
    { description: "Compute (sub - 1) & mask = (8) & 13 = 1000 & 1101 = 1000 (8).", state: { mask: "1101", sub: "1000", decimal: 8, processing: "{3}" } },
    { description: "Compute (sub - 1) & mask = (7) & 13 = 0111 & 1101 = 0101 (5).", state: { mask: "1101", sub: "0101", decimal: 5, processing: "{0, 2}" } },
    { description: "Compute (sub - 1) & mask = (4) & 13 = 0100 & 1101 = 0100 (4).", state: { mask: "1101", sub: "0100", decimal: 4, processing: "{2}" } },
    { description: "Compute (sub - 1) & mask = (3) & 13 = 0011 & 1101 = 0001 (1).", state: { mask: "1101", sub: "0001", decimal: 1, processing: "{0}" } },
    { description: "Compute (sub - 1) & mask = (0) & 13 = 0000. sub = 0, loop ends. All 8 subsets enumerated in O(2^k) time.", state: { mask: "1101", sub: "0000", decimal: 0, processing: "{} (empty set)" } }
  ]}
/>

### 1. Bitmask Basics — Subsets as Integers

A bitmask is an integer whose binary representation encodes which elements are "in" a subset. For a set of n elements, there are 2^n possible subsets, each represented by an integer in `[0, 2^n - 1]`.

| Operation | Code | Meaning |
|---|---|---|
| Create mask with bit `i` set | `1 << i` | Singleton subset `{i}` |
| Add element `i` to mask | `mask \| (1 << i)` | Set union with `{i}` |
| Remove element `i` from mask | `mask & ~(1 << i)` | Set difference with `{i}` |
| Check if `i` is in mask | `mask & (1 << i)` | Nonzero if i ∈ mask |
| Toggle element `i` | `mask ^ (1 << i)` | Add if absent, remove if present |
| Count elements (popcount) | `Integer.bitCount(mask)` | Size of the subset |
| Full set of n elements | `(1 << n) - 1` | All bits set |
| Lowest set bit | `mask & (-mask)` | Isolate rightmost 1 |
| Remove lowest set bit | `mask & (mask - 1)` | Turn off rightmost 1 |

**Why bitmask DP exists.** Many optimization problems are inherently about subsets: "which items do we include?" or "which tasks have been completed?" Without bitmasks, tracking subset membership requires sets or boolean arrays that are expensive to copy and hash. A bitmask collapses an entire subset into a single integer, making it trivially cheap to store in a DP array index, copy between states, and compare. This turns the exponential search space of 2^n subsets into an addressable array, letting us systematically compute optimal values bottom-up.

**The intuition.** Think of a bitmask as a row of light switches. Each switch (bit) represents one element: ON means "included," OFF means "excluded." The integer value of the switches gives you a unique address for that combination. Operations like "add element 3" become `mask | (1 left-shift 3)` -- a single CPU instruction instead of a set insertion. This hardware-level efficiency is why bitmask DP can handle 2^20 (about one million) states comfortably.

**Interview signals.** Look for these clues in the problem statement: (1) the constraint `n` is suspiciously small (n is at most 20), (2) the problem asks about assigning, visiting, or partitioning a *set* of items, (3) brute-force enumeration of all permutations or subsets is implied but needs pruning, (4) phrases like "each exactly once" or "non-overlapping groups."

**Common mistakes.** (1) Confusing 0-indexed and 1-indexed bits -- always use 0-indexed (`1 left-shift 0` for the first element). (2) Using `mask == (1 left-shift n)` as the full set instead of `(1 left-shift n) - 1`. (3) Forgetting that Java `int` has 32 bits -- for n greater than 30, use `long` masks.

**Example:** For n = 4, the subset `{0, 2, 3}` is represented as `0b1101 = 13`.

```java
int n = 4;
int mask = (1 << 0) | (1 << 2) | (1 << 3);  // 13
System.out.println(Integer.toBinaryString(mask));  // "1101"
System.out.println(mask & (1 << 2));  // 4 (nonzero → element 2 is present)
System.out.println(mask & (1 << 1));  // 0 (element 1 is absent)
```

---

### 2. Iterating Over All Subsets of a Mask

A critical technique: enumerate every subset of a given mask in O(2^k) time where k is the number of set bits.

```java
void iterateSubsets(int mask) {
    int sub = mask;
    while (sub > 0) {
        // process sub — it is a subset of mask
        sub = (sub - 1) & mask;
    }
    // don't forget sub = 0 (empty set) if needed
}
```

**Why it works:** `(sub - 1) & mask` clears the lowest set bit of `sub` that is also in `mask`, effectively stepping to the next smaller subset. The total work across all masks is O(3^n) by the binomial theorem: Σ C(n,k)·2^k = 3^n.

---

### 3. Bitmask DP Formulation

**State:** `dp[mask]` = optimal value considering the set of elements represented by `mask`.

**Transition:** Try adding each element not yet in `mask`, or try every partition of `mask` into two subsets.

**Base case:** `dp[0]` = initial value (empty set).

**General template:**

```java
import java.util.*;

int bitmaskDp(int n) {
    int full = (1 << n) - 1;
    int[] dp = new int[1 << n];
    Arrays.fill(dp, Integer.MAX_VALUE / 2);
    dp[0] = 0;

    for (int mask = 1; mask <= full; mask++) {
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) {
                int prev = mask ^ (1 << i);  // mask without element i
                dp[mask] = Math.min(dp[mask], dp[prev] + cost(prev, i));
            }
        }
    }
    return dp[full];
}
```

---

### 4. TSP (Travelling Salesman Problem)

**When to use this template:** Any problem that asks you to find the optimal ordering of n items (n is at most 20) where the cost of the next choice depends on which item you choose *and* which item you chose last. The TSP template generalizes beyond geography -- it applies to shortest superstrings, optimal task sequencing, and any "visit all, minimize cost" formulation.

**How it works:** We add a second dimension to the DP state: `dp[mask][last]` tracks not just *which* items are done, but *which item was done most recently*. This extra dimension is necessary because the transition cost depends on the previous choice (the distance from the last city to the next). Without it, we would lose the information needed to compute edge costs.

The classic bitmask DP problem. Given n cities and a distance matrix, find the minimum cost to visit every city exactly once and return to the start.

**State:** `dp[mask][i]` = minimum cost to visit all cities in `mask`, ending at city `i`.

**Transition:** `dp[mask][i] = min(dp[mask ^ (1 << i)][j] + dist[j][i])` for all `j` in `mask` where `j ≠ i`.

**Time:** O(2^n · n²) | **Space:** O(2^n · n)

```java
import java.util.*;

int tsp(int[][] dist) {
    int n = dist.length;
    int INF = Integer.MAX_VALUE / 2;
    int[][] dp = new int[1 << n][n];
    for (int[] row : dp) Arrays.fill(row, INF);

    // Start from city 0
    dp[1][0] = 0;

    for (int mask = 1; mask < (1 << n); mask++) {
        for (int last = 0; last < n; last++) {
            if (dp[mask][last] == INF) continue;
            if ((mask & (1 << last)) == 0) continue;
            for (int nxt = 0; nxt < n; nxt++) {
                if ((mask & (1 << nxt)) != 0) continue;  // already visited
                int newMask = mask | (1 << nxt);
                dp[newMask][nxt] = Math.min(
                    dp[newMask][nxt],
                    dp[mask][last] + dist[last][nxt]
                );
            }
        }
    }

    int full = (1 << n) - 1;
    // Return to city 0
    int ans = INF;
    for (int i = 0; i < n; i++) {
        ans = Math.min(ans, dp[full][i] + dist[i][0]);
    }
    return ans;
}
```

---

### 5. Profile DP (Broken Profile)

For grid problems with a **small width** (m ≤ 20), encode the state of one row or column boundary as a bitmask. Process cells one by one, and the mask represents which cells in the current column boundary are occupied.

**Use cases:** Tiling a grid with dominoes, placing non-attacking pieces with row constraints.

**Key insight:** The mask represents the "profile" — the boundary between processed and unprocessed cells.

---

### 6. When to Use Bitmask DP

| Constraint | Technique | Complexity |
|---|---|---|
| n ≤ 20 | Bitmask DP with `dp[mask]` | O(2^n · n) |
| n ≤ 15 with extra state | `dp[mask][state]` | O(2^n · n · S) |
| Subset enumeration | Iterate subsets of each mask | O(3^n) |
| n ≤ 10 with heavy per-state work | Feasible even with O(2^n · n²) | ~10^6 |
| n > 23 | Bitmask DP is too slow — look for other approaches | — |

**Red flags that suggest bitmask DP:**
- "Assign N items to N positions"
- "Visit all nodes exactly once"
- "Partition into groups/teams"
- "Minimum cost to complete all tasks"
- n ≤ 20 in constraints

---

## Worked Example: Shortest Path Visiting All Nodes (LC 847)

**Problem:** Given an undirected graph with n nodes (0 to n-1), find the shortest path that visits every node. You may revisit nodes and edges.

**Input:** `graph = [[1,2,3],[0],[0],[0]]` (star graph, n = 4)

**Why not brute force?** A brute-force approach would enumerate all n! permutations of nodes and compute the shortest path through each ordering. For n = 12, that is 479 million permutations -- far too slow. Bitmask BFS reduces this to n times 2^n states (12 times 4096 = 49,152), each processed in O(degree) time. The exponential factor drops from n! to 2^n, which is the key speedup.

**Key insight:** BFS with state = (current_node, visited_mask). Unlike standard BFS, we track *which* nodes we have visited, not just *which* node we are at. Two arrivals at the same node with different visited masks are genuinely different states because future exploration depends on what remains unvisited. This is why the state space is n times 2^n rather than just n.

**Step-by-step trace:**

```
n = 4, full_mask = 0b1111 = 15

Initial states (start from every node):
  (node=0, mask=0001, dist=0)
  (node=1, mask=0010, dist=0)
  (node=2, mask=0100, dist=0)
  (node=3, mask=1000, dist=0)

From (0, 0001, 0): visit neighbors 1,2,3
  → (1, 0011, 1), (2, 0101, 1), (3, 1001, 1)

From (1, 0010, 0): visit neighbor 0
  → (0, 0011, 1)

From (0, 0011, 1): visit neighbors 2,3
  → (2, 0111, 2), (3, 1011, 2)

From (2, 0101, 1): visit neighbor 0
  → (0, 0101, 2) [already visited with this mask? no, 0 with mask 0101]
  → then from (0, 0101, 2): visit 1 → (1, 0111, 3), visit 3 → (3, 1101, 3)

...continuing BFS...

From (2, 0111, 2): visit neighbor 0
  → (0, 0111, 3): visit 3 → (3, 1111, 4) ✓ FOUND!

Answer: 4
```

**Implementation:**

```java
import java.util.*;

int shortestPathLength(int[][] graph) {
    int n = graph.length;
    int full = (1 << n) - 1;
    if (n == 1) return 0;

    ArrayDeque<int[]> queue = new ArrayDeque<>();
    boolean[][] visited = new boolean[n][1 << n];

    for (int i = 0; i < n; i++) {
        queue.offer(new int[]{i, 1 << i, 0});
        visited[i][1 << i] = true;
    }

    while (!queue.isEmpty()) {
        int[] cur = queue.poll();
        int node = cur[0], mask = cur[1], dist = cur[2];
        for (int nei : graph[node]) {
            int newMask = mask | (1 << nei);
            if (newMask == full) return dist + 1;
            if (!visited[nei][newMask]) {
                visited[nei][newMask] = true;
                queue.offer(new int[]{nei, newMask, dist + 1});
            }
        }
    }
    return -1;
}
```

---

## Pattern Recognition Guide

| Pattern | Example Problem | Approach |
|---|---|---|
| "Assign N items to N slots" | Beautiful Arrangement | `dp[mask]` = ways to assign first `popcount(mask)` positions |
| "Visit all nodes" | Shortest Path Visiting All Nodes | BFS with `(node, mask)` state |
| "Partition into K groups" | Partition to K Equal Sum Subsets | `dp[mask]` = # groups formed with elements in mask |
| "Select minimum team" | Smallest Sufficient Team | `dp[mask]` = smallest team covering skill-mask |
| "Minimum cost matching" | Minimum XOR Sum of Two Arrays | `dp[mask]` = min cost matching first `popcount(mask)` items of A to subset mask of B |
| "Spell word with stickers" | Stickers to Spell Word | `dp[mask]` = min stickers for letter-mask |
| "Row-by-row placement" | Maximum Students Taking Exam | Profile DP with row mask |
| "Color grid with constraints" | Painting a Grid With Three Colors | Enumerate valid column states, transition between adjacent columns |

---

## Problem Set (21 Problems)

### Tier 1: Foundation (Learn the Pattern)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 1 | Shortest Path Visiting All Nodes | Hard | BFS + bitmask state | [LC 847](https://leetcode.com/problems/shortest-path-visiting-all-nodes/) |
| 2 | Beautiful Arrangement | Medium | `dp[mask]` counting permutations | [LC 526](https://leetcode.com/problems/beautiful-arrangement/) |
| 3 | Partition to K Equal Sum Subsets | Medium | `dp[mask]` with target tracking | [LC 698](https://leetcode.com/problems/partition-to-k-equal-sum-subsets/) |
| 4 | Fair Distribution of Cookies | Medium | `dp[mask]` + subset enumeration | [LC 2305](https://leetcode.com/problems/fair-distribution-of-cookies/) |
| 5 | Find Minimum Time to Finish All Jobs | Hard | Binary search + bitmask DP | [LC 1723](https://leetcode.com/problems/find-minimum-time-to-finish-all-jobs/) |
| 6 | Special Permutations | Medium | `dp[mask][last]` permutation DP | [LC 2741](https://leetcode.com/problems/special-permutations/) |
| 7 | Minimum Number of Work Sessions | Medium | `dp[mask]` with remaining time | [LC 1986](https://leetcode.com/problems/minimum-number-of-work-sessions-to-finish-the-tasks/) |

### Tier 2: Application (Apply Confidently)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 8 | Smallest Sufficient Team | Hard | `dp[skill_mask]` = smallest team | [LC 1125](https://leetcode.com/problems/smallest-sufficient-team/) |
| 9 | Find the Shortest Superstring | Hard | TSP-style `dp[mask][last]` | [LC 943](https://leetcode.com/problems/find-the-shortest-superstring/) |
| 10 | Stickers to Spell Word | Hard | `dp[letter_mask]` + sticker contribution | [LC 691](https://leetcode.com/problems/stickers-to-spell-word/) |
| 11 | Minimum Incompatibility | Hard | Partition into k subsets + subset enum | [LC 1681](https://leetcode.com/problems/minimum-incompatibility/) |
| 12 | Number of Ways to Wear Different Hats | Hard | `dp[person_mask]` iterating over hats | [LC 1434](https://leetcode.com/problems/number-of-ways-to-wear-different-hats-to-each-other/) |
| 13 | Distribute Repeating Integers | Hard | `dp[customer_mask]` + subset matching | [LC 1655](https://leetcode.com/problems/distribute-repeating-integers/) |
| 14 | Parallel Courses II | Hard | `dp[mask]` with prerequisite handling | [LC 1494](https://leetcode.com/problems/parallel-courses-ii/) |

### Tier 3: Mastery (Interview + Competition Edge)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 15 | Minimum Cost to Connect Two Groups | Hard | `dp[mask]` bipartite matching | [LC 1595](https://leetcode.com/problems/minimum-cost-to-connect-two-groups-of-points/) |
| 16 | Minimum XOR Sum of Two Arrays | Hard | `dp[mask]` assignment problem | [LC 1879](https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/) |
| 17 | Maximum AND Sum of Array | Hard | `dp[mask]` with slot capacity | [LC 2172](https://leetcode.com/problems/maximum-and-sum-of-array/) |
| 18 | The Number of Good Subsets | Hard | `dp[prime_mask]` with prime factorization | [LC 1994](https://leetcode.com/problems/the-number-of-good-subsets/) |
| 19 | Painting a Grid With Three Different Colors | Hard | Profile DP, enumerate valid columns | [LC 1931](https://leetcode.com/problems/painting-a-grid-with-three-different-colors/) |
| 20 | Maximum Students Taking Exam | Hard | Profile DP with seat mask | [LC 1349](https://leetcode.com/problems/maximum-students-taking-exam/) |
| 21 | Number of Ways to Paint N×3 Grid | Hard | State compression, valid row patterns | [LC 1411](https://leetcode.com/problems/number-of-ways-to-paint-nx3-grid/) |

---

## Mock Interview

### Problem 1: Shortest Path Visiting All Nodes (LC 847) — 25 minutes

**Interviewer:** "Given an undirected, connected graph of n nodes, find the length of the shortest path that visits every node. You may start and stop at any node, and you may revisit nodes."

**Candidate approach:**

1. **Clarify:** n ≤ 12, so 2^12 = 4096 states per node — very feasible. Can revisit nodes/edges.
2. **Key insight:** Standard BFS won't work because revisiting is allowed but we need to track *which* nodes are visited. Use state `(current_node, visited_mask)`.
3. **Algorithm:** Multi-source BFS starting from every node. State = `(node, mask)`. Transition: move to neighbor, update mask. First time we reach `full_mask` is the answer.
4. **Time:** O(n · 2^n) states, each processed once → O(n² · 2^n) with adjacency list.
5. **Space:** O(n · 2^n).

**Follow-up 1:** "What if the graph is weighted?"

> Replace BFS with Dijkstra. Use a priority queue with state `(cost, node, mask)`. Same state space, but O(n² · 2^n · log(n · 2^n)) time.

**Follow-up 2:** "What if n could be up to 10^5?"

> Bitmask DP is impossible. For a tree, the answer is `2 * (n - 1) - diameter` (traverse every edge twice, minus the longest path). For general graphs, this becomes an NP-hard problem (Hamiltonian path), so approximation or heuristics would be needed.

**Follow-up 3:** "Can you reconstruct the actual path?"

> Track parent pointers: for each state `(node, mask)`, store which `(prev_node, prev_mask)` led to it. After finding the answer, backtrack through parents to reconstruct the sequence.

---

### Problem 2: Partition to K Equal Sum Subsets (LC 698) — 20 minutes

**Interviewer:** "Given an array of integers and an integer k, determine if it's possible to divide the array into k non-empty subsets whose sums are all equal."

**Candidate approach:**

1. **Clarify:** Total sum must be divisible by k, otherwise impossible. Each subset must sum to `target = total_sum / k`. n ≤ 16.
2. **Pruning:** Sort descending. If any element > target, return False.
3. **Bitmask DP:** `dp[mask]` = remaining capacity in the current bucket after assigning elements in `mask`. If `dp[mask]` is achievable, try adding each unassigned element.

```java
import java.util.*;

boolean canPartitionKSubsets(int[] nums, int k) {
    int total = 0;
    for (int x : nums) total += x;
    if (total % k != 0) return false;
    int target = total / k;
    for (int x : nums) if (x > target) return false;

    int n = nums.length;
    int[] dp = new int[1 << n];
    Arrays.fill(dp, -1);
    dp[0] = 0;  // 0 elements assigned, 0 remainder

    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] == -1) continue;
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) continue;
            if (dp[mask] + nums[i] <= target) {
                dp[mask | (1 << i)] = (dp[mask] + nums[i]) % target;
            }
        }
    }
    return dp[(1 << n) - 1] == 0;
}
```

4. **Time:** O(n · 2^n). **Space:** O(2^n).

**Follow-up 1:** "How would you optimize for larger n?"

> Use backtracking with pruning: sort descending, skip duplicates, prune when remaining elements can't fill buckets. Also, if k == 1, return True immediately; if k == n, check all elements equal.

**Follow-up 2:** "What if we need to count the number of ways to partition?"

> Use inclusion-exclusion or extend bitmask DP to count valid partitions. Enumerate all subsets summing to target, then use subset-cover DP.

---

## Tips & Pitfalls

### Complexity Awareness

- **Subset enumeration over all masks** costs O(3^n), not O(4^n). This comes from `Σ_{k=0}^{n} C(n,k)` · 2^k = 3^n. For n = 15, that's ~14 million — feasible. For n = 20, it's ~3.5 billion — too slow.
- **dp[mask] alone** is O(2^n · n) which handles n ≤ 23.
- **dp[mask][i]** is O(2^n · n²) which handles n ≤ 20.

### Memory Optimization

- For n = 20: `2^20 = 1,048,576`. An `int[]` ≈ 4 MB. An `int[mask][node]` ≈ `20 * 4 MB = 80 MB` — watch memory limits.
- Use arrays instead of hash maps. `int[] dp = new int[1 << n]` with `Arrays.fill(dp, INF)` is much faster than `HashMap`.
- If only the previous "layer" is needed (e.g., by popcount), you can sometimes reduce memory, but this is rare for bitmask DP.

### Memoization vs. Bottom-Up

| Approach | Pros | Cons |
|---|---|---|
| Bottom-up (iterative) | Cache-friendly, no recursion overhead, easy to optimize | Must iterate all 2^n masks even if many unreachable |
| Top-down (memoization) | Only visits reachable states, easier to write | Recursion overhead, hash map slower than array |

**Rule of thumb:** Use bottom-up when most masks are reachable (TSP, assignment). Use top-down when many masks are unreachable (sparse transitions, heavy pruning).

### Common Mistakes

1. **Off-by-one in bit indexing:** Elements are 0-indexed. `1 << n` is NOT a valid element — it's the mask with only bit n set (out of range for n elements).
2. **Forgetting the empty subset:** When iterating subsets of a mask, the loop `sub = (sub - 1) & mask` terminates at `sub = 0`. Handle the empty subset separately if needed.
3. **Integer overflow:** In languages like C++/Java, use `long` for masks when n > 30 (though bitmask DP is impractical at that size anyway).
4. **Wrong transition direction:** Make sure you're building `dp[new_mask]` from `dp[old_mask]` (bottom-up) or recursing from `dp[mask]` to `dp[submask]` (top-down), not mixing them up.
5. **Profile DP row ordering:** Process cells left-to-right, top-to-bottom. The mask represents the boundary *between* processed and unprocessed regions.
