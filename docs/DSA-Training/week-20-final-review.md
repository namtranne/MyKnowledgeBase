---
sidebar_position: 21
title: "Week 20: Final Review + Mock Interviews"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 20: Final Review + Mock Interviews

This is the capstone week. Everything you've built over the past 19 weeks converges here — mixed cross-technique problems that defy single-topic classification, timed mock interviews that simulate real pressure, and a structured retrospective to sharpen what remains dull. Treat this week as a dress rehearsal: no new theory, just relentless application and honest self-assessment.

---

## Overview

- **Focus:** Mixed cross-technique problems and comprehensive mock interviews
- **Goal:** Simulate real interview conditions and identify remaining weak areas
- **Structure:** 21 cross-technique problems (Days 1–7) + 4 mock interviews (spread across the week)
- **Mindset:** You are not learning new material — you are stress-testing everything you already know

By the end of this week you should be able to pick up any LeetCode hard, classify the techniques it requires within 5 minutes, and execute a clean solution within 25.

<AlgoViz
  title="Mock Interview Walkthrough — Full Problem Lifecycle"
  description="Follow a candidate through a timed 45-minute mock interview: understand, plan, code, and test."
  steps={[
    { label: "0:00 — Read", description: "Read the problem statement twice. Identify: input types, output, constraints (n up to 10^5), edge cases (empty input, single element).", phase: "understand" },
    { label: "2:00 — Clarify", description: "Ask clarifying questions: Are inputs sorted? Can values be negative? Any duplicates? What should we return if no solution exists?", phase: "understand" },
    { label: "5:00 — Brute Force", description: "State the brute-force approach and its complexity. Example: nested loops give O(n^2). This shows structured thinking.", phase: "plan" },
    { label: "7:00 — Optimize", description: "Identify the optimal technique. Recognize the pattern: monotonic stack, binary search, DP, etc. State the target complexity: O(n log n).", phase: "plan" },
    { label: "10:00 — Outline", description: "Sketch the approach in 3-4 bullet points. Confirm with the interviewer before coding. State time and space complexity.", phase: "plan" },
    { label: "12:00 — Code", description: "Write clean Java code with meaningful variable names. Handle edge cases inline. Use standard library: HashMap, PriorityQueue, ArrayDeque.", phase: "code" },
    { label: "30:00 — Debug", description: "Walk through code with a small example. Trace variable values at each step. Check off-by-one errors and boundary conditions.", phase: "test" },
    { label: "35:00 — Edge Cases", description: "Test: empty array, single element, all-same values, maximum input size. Fix any bugs found.", phase: "test" },
    { label: "40:00 — Follow-ups", description: "Interviewer asks follow-ups: What if the input is streamed? Can you do it in-place? What about a different constraint?", phase: "discuss" },
    { label: "45:00 — Done", description: "Summarize: approach, complexity, trade-offs. A clean solution with clear communication is the goal.", phase: "complete" }
  ]}
/>

---

## Self-Assessment Checklist

Before diving into problems, take 30 minutes to honestly rate yourself. This table covers all 19 prior weeks. Fill in every row — the gaps you find here will guide your remaining study time.

| # | Week | Topic | Confidence (1–5) | Weakest Subtopic | Action Plan |
|---|------|-------|:-----------------:|-------------------|-------------|
| 1 | Week 1 | Monotonic Stack | | | |
| 2 | Week 2 | Advanced Binary Search | | | |
| 3 | Week 3 | Prefix Sum + Difference Array | | | |
| 4 | Week 4 | Union-Find (DSU) | | | |
| 5 | Week 5 | Topological Sort | | | |
| 6 | Week 6 | Shortest Paths | | | |
| 7 | Week 7 | Advanced Trees | | | |
| 8 | Week 8 | Segment Tree + BIT | | | |
| 9 | Week 9 | DP — Subsequences | | | |
| 10 | Week 10 | Knapsack DP | | | |
| 11 | Week 11 | Bitmask DP | | | |
| 12 | Week 12 | Tree / Interval / Digit DP | | | |
| 13 | Week 13 | DP Optimization | | | |
| 14 | Week 14 | String Algorithms I | | | |
| 15 | Week 15 | String Algorithms II | | | |
| 16 | Week 16 | Number Theory | | | |
| 17 | Week 17 | Combinatorics + Probability | | | |
| 18 | Week 18 | Geometry + Sweep Line | | | |
| 19 | Week 19 | Game Theory + Interactive | | | |

**Scoring guide:**
- **1** — Cannot recall the core technique; need to re-study from scratch
- **2** — Recognize the pattern but struggle to implement correctly
- **3** — Can solve medium problems with some thought; hard problems are a coin flip
- **4** — Confident on most problems; occasional edge-case mistakes
- **5** — Can solve hards cleanly and explain optimizations to others

**Any topic rated 1–2 deserves at least 2 hours of targeted re-study this week.**

---

## Master Pattern Recognition Guide

The single most important interview skill is *recognizing which technique to apply*. The table below maps constraint clues and problem-statement keywords to the appropriate technique. When you read a new problem, scan for these signals before thinking about implementation.

| Constraint / Keyword | Primary Technique | Week Reference |
|---|---|---|
| n is at most 20, "assign items to slots," "visit all" | Bitmask DP | Week 11 |
| "optimal value for subtree," tree structure | Tree DP | Week 12 |
| "merge segments," "burst balloons," n is at most 500 | Interval DP | Week 12 |
| "count numbers in [L, R] with property," n up to 10^18 | Digit DP | Week 12 |
| "dp[i] = min(dp[j] + f(j) * g(i))," slopes monotonic | Convex Hull Trick | Week 13 |
| "non-overlapping intervals, maximize profit" | DP + Binary Search | Week 13 |
| "find pattern in text," "repeated substring" | KMP / Z-function | Week 14 |
| "longest duplicate substring," "substring equality" | Rolling Hash + Binary Search | Week 14 |
| "autocomplete," "prefix search," "word break" | Trie | Week 15 |
| "longest palindromic substring," "count palindromes" | Manacher's Algorithm | Week 15 |
| "mod 10^9+7," "count divisors," "trailing zeroes" | Number Theory / Modular Arithmetic | Week 16 |
| "how many ways," "arrangements," "distribute items" | Combinatorics (nCr, Stars-and-Bars) | Week 17 |
| "at least one of," "none of," "derangement" | Inclusion-Exclusion | Week 17 |
| "compute f(n) for n up to 10^18," "linear recurrence" | Matrix Exponentiation | Week 18 |
| "who wins the game," "two players alternate" | Game Theory (Nim / Grundy / Minimax) | Week 18 |
| "overlapping intervals," "meeting rooms," "skyline" | Sweep Line | Week 19 |
| "convex hull," "max points on a line" | Computational Geometry | Week 19 |
| "critical connection," "bridge," "strongly connected" | Tarjan's / Kosaraju's | Week 19 |

<AlgoViz
  title="Pick the Right Algorithm — Decision Tree Walkthrough"
  description="Walk through the 5-minute classification framework on a real problem: 'Split Array Largest Sum' (LC 410)."
  steps={[
    {
      variables: { problem: "Split array into k subarrays, minimize the max subarray sum", n: "\u2264 10\u2075", k: "\u2264 50" },
      explanation: "Problem: given array of n non-negative integers and integer k, split into k contiguous subarrays minimizing the largest sum. Step 1: READ CONSTRAINTS.",
      code: "// Step 1: Read constraints \u2192 n \u2264 10^5"
    },
    {
      variables: { "n \u2264 10\u2075": "need O(n log n) or better", "O(n\u00B2)": "10\u00B9\u2070 = TLE", "O(n log S)": "fits!" },
      explanation: "Step 1 result: n up to 10\u2075 rules out O(n\u00B2). We need O(n log n) or O(n log S) where S = sum of array.",
      code: "// O(n^2 * k) DP too slow; need sublinear in some dimension"
    },
    {
      variables: { input: "array (sequence)", structure: "contiguous subarrays", "not a graph": true, "not a tree": true },
      explanation: "Step 2: IDENTIFY STRUCTURE. Input is a sequence (array), we split into contiguous parts. This suggests DP on sequences or binary search on answer.",
      code: "// Structure: array \u2192 DP or Binary Search"
    },
    {
      hashMap: [["split array", "DP or BS"], ["minimize maximum", "BS on answer"], ["contiguous", "greedy check"], ["n \u2264 10\u2075", "O(n log S)"]],
      variables: { "pattern match": "Binary Search on Answer (Week 2)", confidence: "HIGH" },
      explanation: "Step 3: CHECK PATTERNS. 'Minimize the maximum' is a classic binary search on answer signal. The answer space is [max(arr), sum(arr)].",
      code: "// 'minimize maximum' \u2192 binary search on the answer value"
    },
    {
      array: [7, 2, 5, 10, 8],
      highlights: [3],
      variables: { lo: "max(arr) = 10", hi: "sum(arr) = 32", k: 2, "search space": "[10, 32]" },
      explanation: "Step 4: VERIFY with example. Array [7,2,5,10,8], k=2. Binary search on answer: lo=10 (can't be less than max element), hi=32 (entire array in one group).",
      code: "int lo = max(nums), hi = sum(nums);"
    },
    {
      array: [7, 2, 5, 10, 8],
      highlights: [0, 1, 2],
      secondary: [3, 4],
      pointers: { 2: "split here" },
      variables: { mid: 21, "group 1": "7+2+5=14 \u2264 21", "group 2": "10+8=18 \u2264 21", "groups needed": "2 \u2264 k=2 \u2713" },
      explanation: "Try mid=21: greedily pack elements. Group 1: [7,2,5]=14. Group 2: [10,8]=18. Needed 2 groups \u2264 k=2 \u2192 feasible! Try smaller.",
      code: "if (canSplit(nums, k, mid)) hi = mid; else lo = mid + 1;"
    },
    {
      array: [7, 2, 5, 10, 8],
      highlights: [0, 1, 2],
      secondary: [3, 4],
      variables: { answer: 18, "split": "[7,2,5] | [10,8]", "max sum": "max(14, 18) = 18", complexity: "O(n log S)" },
      explanation: "After binary search converges: answer = 18. Split: [7,2,5] (sum=14) and [10,8] (sum=18). Minimized maximum = 18.",
      code: "return lo; // 18"
    },
    {
      hashMap: [["Technique", "Binary Search on Answer"], ["Feasibility", "Greedy O(n)"], ["Time", "O(n log S)"], ["Week", "Week 2 + Greedy"], ["Alternative", "DP O(n\u00B2k) for negatives"]],
      variables: { classified: "Binary Search (Week 2)", "time to classify": "< 5 minutes" },
      explanation: "Classification complete: Binary Search on Answer with greedy feasibility check. If array has negative numbers, must fall back to DP. This framework works for any problem!",
      code: "// Classified in < 5 min. Ready to code."
    }
  ]}
/>

**How to use this table during practice:** After reading a problem, identify 2-3 matching signals from the left column. If multiple techniques match, the problem likely combines them (e.g., "bitmask" + "shortest path" = BFS with bitmask state). The Week Reference column tells you where to review if the technique feels rusty.

---

## Mixed Problem Set (21 Problems)

These problems deliberately combine techniques from different weeks. You cannot solve them by pattern-matching a single topic — you must recognize which tools to pull from your toolkit and how they compose. This is exactly what interviews test.

### Day 1–2: Cross-Technique Warm-Up (6 Problems)

| # | Problem | Difficulty | Techniques Combined | Link |
|---|---------|:----------:|---------------------|------|
| 1 | Trapping Rain Water II | Hard | BFS + Heap (Graph + Data Structure) | [LC 407](https://leetcode.com/problems/trapping-rain-water-ii/) |
| 2 | Longest Increasing Path in a Matrix | Hard | DFS + Memoization (Graph + DP) | [LC 329](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) |
| 3 | Minimum Window Subsequence | Hard | DP + Two Pointers | [LC 727](https://leetcode.com/problems/minimum-window-subsequence/) |
| 4 | Shortest Path to Get All Keys | Hard | BFS + Bitmask | [LC 864](https://leetcode.com/problems/shortest-path-to-get-all-keys/) |
| 5 | Strange Printer | Hard | Interval DP | [LC 664](https://leetcode.com/problems/strange-printer/) |
| 6 | Frog Jump | Hard | DP + HashMap | [LC 403](https://leetcode.com/problems/frog-jump/) |

**Day 1–2 guidance:**
- Problem 1 extends 2D trapping rain water — think about why a min-heap on the boundary works and how it relates to Dijkstra.
- Problem 4 is a classic BFS-with-state problem; the bitmask encodes which keys you hold. Relate this to Week 11 (Bitmask DP) and Week 6 (Shortest Paths).
- Problem 5 looks like a printing puzzle but is pure interval DP from Week 12.

### Day 3–4: Technique Fusion (8 Problems)

| # | Problem | Difficulty | Techniques Combined | Link |
|---|---------|:----------:|---------------------|------|
| 7 | Burst Balloons | Hard | Interval DP | [LC 312](https://leetcode.com/problems/burst-balloons/) |
| 8 | Maximum Frequency Stack | Hard | Stack + HashMap Design | [LC 895](https://leetcode.com/problems/maximum-frequency-stack/) |
| 9 | Smallest Sufficient Team | Hard | Bitmask DP | [LC 1125](https://leetcode.com/problems/smallest-sufficient-team/) |
| 10 | Cherry Pickup II | Hard | 3D DP | [LC 1463](https://leetcode.com/problems/cherry-pickup-ii/) |
| 11 | Median of Two Sorted Arrays | Hard | Binary Search | [LC 4](https://leetcode.com/problems/median-of-two-sorted-arrays/) |
| 12 | Word Ladder II | Hard | BFS + DFS Backtrack | [LC 126](https://leetcode.com/problems/word-ladder-ii/) |
| 13 | Maximum Profit in Job Scheduling | Hard | DP + Binary Search | [LC 1235](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) |
| 14 | Count of Smaller Numbers After Self | Hard | BIT / Merge Sort | [LC 315](https://leetcode.com/problems/count-of-smaller-numbers-after-self/) |

**Day 3–4 guidance:**
- Problem 7 is the quintessential interval DP — if you can explain why we fix the *last* balloon to burst in a range, you truly understand the technique.
- Problem 8 is a design problem that blends Week 1 (Stack) ideas with frequency tracking. Think about what data structure makes both push and pop O(1).
- Problem 11 is a legendary interview question. The binary search is on partition position, not on values. Revisit Week 2 if this feels shaky.
- Problem 14 can be solved with BIT (Week 8) or merge sort — try both approaches.

### Day 5–7: Championship Round (7 Problems)

| # | Problem | Difficulty | Techniques Combined | Link |
|---|---------|:----------:|---------------------|------|
| 15 | Palindrome Pairs | Hard | Trie + String | [LC 336](https://leetcode.com/problems/palindrome-pairs/) |
| 16 | Number of Music Playlists | Hard | Combinatorics DP | [LC 920](https://leetcode.com/problems/number-of-music-playlists/) |
| 17 | Sum of Distances in Tree | Hard | Tree DP + Rerooting | [LC 834](https://leetcode.com/problems/sum-of-distances-in-tree/) |
| 18 | Critical Connections in a Network | Hard | Tarjan's Bridges | [LC 1192](https://leetcode.com/problems/critical-connections-in-a-network/) |
| 19 | Split Array Largest Sum | Hard | Binary Search on Answer / DP | [LC 410](https://leetcode.com/problems/split-array-largest-sum/) |
| 20 | Russian Doll Envelopes | Hard | Sort + LIS (Longest Increasing Subsequence) | [LC 354](https://leetcode.com/problems/russian-doll-envelopes/) |
| 21 | Cat and Mouse | Hard | Game Theory + BFS | [LC 913](https://leetcode.com/problems/cat-and-mouse/) |

**Day 5–7 guidance:**
- Problem 15 requires careful case analysis — a word can pair as prefix or suffix. The Trie accelerates lookup but the palindrome-checking logic is the real challenge.
- Problem 17 uses the rerooting technique from Week 12 — two DFS passes. If you can't recall why the second pass works, revisit Tree DP.
- Problem 21 is a game theory problem solved with topological-sort-like BFS on game states. It ties together Weeks 5, 6, and 19.

<AlgoViz
  title="Combined Techniques — Maximum Profit in Job Scheduling"
  description="Solve LC 1235 using Sort + Binary Search + DP together. Given jobs with [start, end, profit], find max profit without overlapping."
  steps={[
    {
      array: [50, 20, 70, 60],
      array2: [1, 2, 4, 5],
      labels: { 0: "job0", 1: "job1", 2: "job2", 3: "job3" },
      labels2: { 0: "start", 1: "start", 2: "start", 3: "start" },
      highlights: [0, 1, 2, 3],
      variables: { "jobs": "[(1,3,50),(2,5,20),(4,6,70),(5,8,60)]", step: "Sort by end time" },
      explanation: "4 jobs: (start,end,profit). Step 1 (Sort, Week 2): sort by end time. Already sorted: ends at 3, 5, 6, 8. Array shows profits.",
      code: "Arrays.sort(jobs, (a,b) -> a[1] - b[1]); // sort by end"
    },
    {
      array: [50, 20, 70, 60],
      labels: { 0: "dp[0]", 1: "dp[1]", 2: "dp[2]", 3: "dp[3]" },
      highlights: [0],
      variables: { "job 0": "(1,3,50)", "compatible prev": "none", "dp[0]": "max(0, 50) = 50" },
      explanation: "Step 2 (DP, Week 9): dp[i] = max profit considering jobs 0..i. Job 0 (1,3,50): no previous job ends before start=1. dp[0] = 50.",
      code: "dp[0] = jobs[0].profit; // 50"
    },
    {
      array: [50, 50, 70, 60],
      highlights: [1],
      secondary: [0],
      variables: { "job 1": "(2,5,20)", "binary search": "latest end \u2264 2 = none", "dp[1]": "max(dp[0]=50, 20+0) = 50" },
      explanation: "Job 1 (2,5,20): binary search (Week 2) for latest job ending \u2264 start=2 \u2192 none found. dp[1] = max(dp[0], 20) = max(50, 20) = 50.",
      code: "j = binarySearch(ends, start); dp[1] = max(dp[0], 20+0);"
    },
    {
      array: [50, 50, 120, 60],
      highlights: [2],
      secondary: [0],
      pointers: { 0: "compatible!" },
      variables: { "job 2": "(4,6,70)", "binary search": "latest end \u2264 4 = job0 (end=3)", "dp[2]": "max(50, 70+dp[0]=120) = 120" },
      explanation: "Job 2 (4,6,70): binary search for latest end \u2264 4 \u2192 job 0 (end=3). dp[2] = max(dp[1]=50, 70 + dp[0]=50) = max(50, 120) = 120.",
      code: "j = binarySearch(ends, 4); // j=0; dp[2] = max(50, 70+50);"
    },
    {
      array: [50, 50, 120, 120],
      highlights: [3],
      secondary: [1],
      pointers: { 1: "compatible" },
      variables: { "job 3": "(5,8,60)", "binary search": "latest end \u2264 5 = job1 (end=5)", "dp[3]": "max(120, 60+dp[1]=110) = 120" },
      explanation: "Job 3 (5,8,60): binary search for latest end \u2264 5 \u2192 job 1 (end=5). dp[3] = max(dp[2]=120, 60 + dp[1]=50) = max(120, 110) = 120.",
      code: "j = binarySearch(ends, 5); // j=1; dp[3] = max(120, 60+50);"
    },
    {
      array: [50, 50, 120, 120],
      highlights: [0, 2],
      labels: { 0: "taken", 2: "taken" },
      variables: { answer: 120, "optimal selection": "job0 + job2", "profit": "50 + 70 = 120" },
      explanation: "Answer: 120. Optimal selection: job 0 (1,3,50) + job 2 (4,6,70) = 120. They don't overlap (job 0 ends at 3, job 2 starts at 4).",
      code: "return dp[n-1]; // 120"
    },
    {
      array: [50, 50, 120, 120],
      hashMap: [["Sort", "O(n log n) \u2014 Week 2"], ["Binary Search", "O(log n) per job \u2014 Week 2"], ["DP", "O(n) transitions \u2014 Week 9"], ["Total", "O(n log n)"]],
      variables: { "techniques used": 3, "weeks referenced": "2, 9", complexity: "O(n log n)" },
      explanation: "Three techniques combined: Sort (by end time) + Binary Search (find compatible job) + DP (optimal substructure). This is the essence of cross-technique problems in interviews.",
      code: "// Sort + BS + DP = O(n log n) total"
    }
  ]}
/>

---

## Comprehensive Mock Interviews

Run these as close to real conditions as possible: set a timer, don't look at hints, write code in a plain editor (not an IDE with autocomplete), and explain your thinking out loud. If you have a study partner, take turns being interviewer and candidate.

---

### Mock Interview 1: Graphs + DP (45 minutes)

#### Problem 1 (20 min): Network Delay Time

> There are `n` network nodes labeled `1` to `n`. You are given a list of directed edges `times[i] = (u, v, w)` representing the time it takes for a signal to travel from `u` to `v`. Given a starting node `k`, return the minimum time for all nodes to receive the signal. If not all nodes are reachable, return `-1`.

**Expected approach:** Dijkstra's algorithm with a min-heap. Time O(E log V).

**Follow-ups the interviewer might ask:**
1. What if some edges have negative weights? (Switch to Bellman-Ford; discuss why Dijkstra fails)
2. What if we want the shortest path that visits at most `k` edges? (Bellman-Ford with `k` iterations or BFS on layered graph)
3. How would you find the node that is the *last* to receive the signal? (Track distances; return the node with max distance)

**Evaluation criteria:**
- Correctly identifies this as a single-source shortest path problem
- Chooses Dijkstra over BFS (weighted edges)
- Handles the "unreachable node" edge case
- Clean heap implementation without re-processing settled nodes

<AlgoViz
  title="Dijkstra's Algorithm \u2014 Network Delay from Node 1"
  description="Find shortest paths from node 1 to all nodes in a weighted directed graph using a min-heap."
  steps={[
    {
      array: [0, 999, 999, 999],
      labels: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [0],
      variables: { source: 1, edges: "1\u21922(w=1), 1\u21923(w=4), 2\u21923(w=2), 3\u21924(w=1)", heap: "[(0, node1)]" },
      explanation: "Initialize: dist[1]=0, all others = \u221E. Push (0, node1) onto min-heap. Edges: 1\u21922(1), 1\u21923(4), 2\u21923(2), 3\u21924(1).",
      code: "dist[source] = 0; heap.offer(new int[]{0, source});"
    },
    {
      array: [0, 1, 4, 999],
      highlights: [0],
      secondary: [1, 2],
      pointers: { 0: "settled" },
      variables: { "pop": "(0, node1)", "relax 1\u21922": "0+1=1 < \u221E", "relax 1\u21923": "0+4=4 < \u221E" },
      explanation: "Pop (0, node1). Relax edges: dist[2] = min(\u221E, 0+1) = 1. dist[3] = min(\u221E, 0+4) = 4. Push (1,node2) and (4,node3).",
      code: "if (d + w < dist[v]) { dist[v] = d + w; heap.offer({dist[v], v}); }"
    },
    {
      array: [0, 1, 3, 999],
      highlights: [0, 1],
      secondary: [2],
      pointers: { 1: "settled" },
      variables: { "pop": "(1, node2)", "relax 2\u21923": "1+2=3 < 4 \u2192 update!", "dist[3]": "4 \u2192 3" },
      explanation: "Pop (1, node2). Relax edge 2\u21923: dist[3] = min(4, 1+2) = 3. Found a shorter path to node 3 through node 2!",
      code: "dist[3] = min(4, 1+2); // 3 < 4, update and push (3, node3)"
    },
    {
      array: [0, 1, 3, 4],
      highlights: [0, 1, 2],
      secondary: [3],
      pointers: { 2: "settled" },
      variables: { "pop": "(3, node3)", "relax 3\u21924": "3+1=4 < \u221E", "dist[4]": 4 },
      explanation: "Pop (3, node3). Relax edge 3\u21924: dist[4] = min(\u221E, 3+1) = 4. All nodes now reachable.",
      code: "dist[4] = min(INF, 3+1); // 4"
    },
    {
      array: [0, 1, 3, 4],
      highlights: [0, 1, 2, 3],
      pointers: { 3: "settled" },
      variables: { "pop": "(4, node4)", "edges from 4": "none", "all settled": true },
      explanation: "Pop (4, node4). No outgoing edges. All nodes settled. The maximum distance is 4 (to node 4) = network delay time.",
      code: "// heap empty; max(dist) = 4 = answer"
    },
    {
      array: [0, 1, 3, 4],
      highlights: [3],
      variables: { answer: 4, "shortest paths": "1\u21921(0), 1\u21922(1), 1\u21922\u21923(3), 1\u21922\u21923\u21924(4)", complexity: "O(E log V)" },
      explanation: "Network delay = max(dist) = 4. If any node had dist = \u221E, answer would be -1. Dijkstra runs in O(E log V) with a binary heap.",
      code: "return allReachable ? maxDist : -1; // 4"
    }
  ]}
/>

---

#### Problem 2 (25 min): Longest Increasing Path in a Matrix

> Given an `m × n` integer matrix, find the length of the longest strictly increasing path. You can move in four directions (up, down, left, right).

**Expected approach:** DFS from every cell with memoization. Time O(mn), space O(mn).

**Follow-ups the interviewer might ask:**
1. Can you count the *number* of longest increasing paths? (Extend the memo to store count alongside length)
2. Can you return the lexicographically smallest longest path? (During DFS, when lengths tie, prefer the cell with the smaller value; reconstruct the path)
3. What if the matrix is very large and doesn't fit in memory? (Discuss external-memory BFS by topological order of cell values)

**Evaluation criteria:**
- Recognizes DAG structure (strictly increasing means no cycles)
- Uses memoization, not brute-force DFS
- Correctly handles all four directions and bounds checking
- Discusses time complexity confidently

---

### Mock Interview 2: Strings + Math (45 minutes)

#### Problem 1 (20 min): Word Search II

> Given an `m × n` board of characters and a list of words, find all words that can be formed by sequentially adjacent cells (horizontal/vertical). Each cell can be used at most once per word.

**Expected approach:** Build a Trie from the word list, then run backtracking DFS from each cell using the Trie for pruning.

**Follow-ups the interviewer might ask:**
1. How do you optimize if many words share prefixes? (The Trie already handles this — explain prefix pruning)
2. What if words are added in a streaming fashion? (Insert into the Trie incrementally; the board search is the bottleneck)
3. Can you prune the Trie as you find words to avoid redundant work? (Yes — remove leaf nodes after finding a word)

**Evaluation criteria:**
- Chooses Trie over checking each word independently
- Correctly implements backtracking with visited marking
- Handles the "same cell used twice" constraint
- Discusses Trie pruning optimization

---

#### Problem 2 (25 min): Count Primes + Combinatorics Extension

> *Part A:* Count the number of primes less than `n`.
>
> *Part B (follow-up):* Given primes less than `n`, efficiently compute C(n, k) mod p where `p` is a large prime.

**Expected approach (Part A):** Sieve of Eratosthenes. Time O(n log log n), space O(n).

**Expected approach (Part B):** Precompute factorials and inverse factorials mod p using Fermat's little theorem. C(n,k) = n! / (k! × (n-k)!) mod p.

**Follow-ups the interviewer might ask:**
1. What if `n` is very large (> 10^8) — can you use a segmented sieve? (Yes — sieve in blocks of √n)
2. What if `p` is not prime? (Use Lucas' theorem for prime powers, then CRT)
3. Can you compute C(n,k) mod p when n is very large but k is small? (Compute numerator and denominator products directly)

**Evaluation criteria:**
- Implements sieve correctly (starts from `i*i`, marks composites)
- Understands modular inverse via Fermat's little theorem
- Handles edge cases (n ≤ 2, k = 0, k = n)
- Can discuss trade-offs between precomputation and direct computation

---

### Mock Interview 3: Data Structures + Binary Search (45 minutes)

#### Problem 1 (20 min): Sliding Window Maximum

> Given an array of integers `nums` and a sliding window of size `k`, return the maximum value in each window as it slides from left to right.

**Expected approach:** Monotonic deque (decreasing). Time O(n), space O(k).

**Follow-ups the interviewer might ask:**
1. What if you need both the min and max in each window? (Maintain two deques — one decreasing for max, one increasing for min)
2. What if the window size is variable — you receive add/remove operations? (Consider a multiset or two-heap approach)
3. Can you solve this with a segment tree? (Yes — range max query, but O(n log n) vs O(n) with deque)

**Evaluation criteria:**
- Chooses monotonic deque over naive or heap approach
- Correctly maintains the deque invariant (removes smaller elements from back, expired indices from front)
- Handles window boundaries correctly
- Explains why deque gives amortized O(1) per element

<AlgoViz
  title="Sliding Window Maximum \u2014 Monotonic Deque on [1, 3, -1, -3, 5, 3]"
  description="Maintain a decreasing deque of indices to find the maximum in each window of size k=3 in O(n) total time."
  steps={[
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [0, 1, 2],
      variables: { k: 3, deque: "[]", phase: "build first window" },
      explanation: "Array: [1, 3, -1, -3, 5, 3], window size k=3. Maintain a deque of indices where values are strictly decreasing. Process elements left to right.",
      code: "Deque<Integer> dq = new ArrayDeque<>(); // stores indices"
    },
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [1],
      secondary: [0],
      pointers: { 0: "removed", 1: "front" },
      variables: { i: 1, "nums[1]=3 > nums[0]=1": "remove 0", deque: "[1]" },
      explanation: "Process index 0: deque=[0]. Process index 1: nums[1]=3 > nums[0]=1, so pop 0 from back (it can never be a window max). Deque=[1].",
      code: "while (!dq.isEmpty() && nums[i] >= nums[dq.peekLast()]) dq.pollLast();"
    },
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [0, 1, 2],
      pointers: { 1: "max=3" },
      variables: { i: 2, deque: "[1, 2]", "window [0,2]": "max = nums[1] = 3", "result": "[3]" },
      explanation: "Process index 2: nums[2]=-1 < nums[1]=3, push. Deque=[1,2]. First complete window [0..2]: max = nums[deque.front] = nums[1] = 3.",
      code: "dq.addLast(i); result[0] = nums[dq.peekFirst()]; // 3"
    },
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [1, 2, 3],
      pointers: { 1: "max=3" },
      variables: { i: 3, deque: "[1, 2, 3]", "window [1,3]": "max = nums[1] = 3", "result": "[3, 3]" },
      explanation: "Process index 3: nums[3]=-3 < nums[2]=-1, push. Deque=[1,2,3]. Index 1 still in window. Window [1..3] max = 3.",
      code: "dq.addLast(3); result[1] = nums[dq.peekFirst()]; // 3"
    },
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [2, 3, 4],
      secondary: [1],
      pointers: { 4: "max=5" },
      variables: { i: 4, "expire": "index 1 out of window", "5 > all": "clear deque", deque: "[4]", "result": "[3, 3, 5]" },
      explanation: "Process index 4: expire index 1 (out of window). nums[4]=5 > all deque values, clear entire deque. Deque=[4]. Window [2..4] max = 5.",
      code: "while (dq.peekFirst() <= i-k) dq.pollFirst(); // expire old"
    },
    {
      array: [1, 3, -1, -3, 5, 3],
      highlights: [3, 4, 5],
      pointers: { 4: "max=5" },
      variables: { i: 5, deque: "[4, 5]", "window [3,5]": "max = nums[4] = 5", "result": "[3, 3, 5, 5]" },
      explanation: "Process index 5: nums[5]=3 < nums[4]=5, push. Deque=[4,5]. Window [3..5] max = nums[4] = 5. Final result: [3, 3, 5, 5].",
      code: "dq.addLast(5); result[3] = nums[dq.peekFirst()]; // 5"
    },
    {
      array: [3, 3, 5, 5],
      highlights: [0, 1, 2, 3],
      labels: { 0: "w1", 1: "w2", 2: "w3", 3: "w4" },
      variables: { result: "[3, 3, 5, 5]", "amortized": "O(1) per element", "total": "O(n)", "key": "each element enters/exits deque at most once" },
      explanation: "Result: [3, 3, 5, 5]. Each element is pushed and popped from the deque at most once, giving O(n) amortized time. The deque always holds a decreasing subsequence of active window values.",
      code: "return result; // [3, 3, 5, 5] in O(n)"
    }
  ]}
/>

---

#### Problem 2 (25 min): Split Array Largest Sum

> Given an array of non-negative integers `nums` and an integer `k`, split the array into `k` non-empty contiguous subarrays such that the largest sum among them is minimized. Return that minimized largest sum.

**Expected approach (primary):** Binary search on the answer. The search space is `[max(nums), sum(nums)]`. For a candidate answer `mid`, greedily check if you can split into ≤ k subarrays.

**Expected approach (alternative):** DP where `dp[i][j]` = minimum largest sum splitting the first `i` elements into `j` groups.

**Follow-ups the interviewer might ask:**
1. Which approach is better and when? (BS is O(n log S) where S = sum; DP is O(n²k). BS wins for large n.)
2. What if you need to split into *exactly* k parts, not *at most* k? (Greedy in BS naturally handles this — if you can do it in fewer, you can pad)
3. What if the array contains negative numbers? (BS on answer breaks because the greedy check no longer works; must use DP)

**Evaluation criteria:**
- Can articulate both approaches and their trade-offs
- Binary search bounds are correct (`lo = max`, `hi = sum`)
- Greedy feasibility check is clean and correct
- Discusses when DP is necessary (negative numbers)

---

### Mock Interview 4: Hard Mixed (45 minutes)

#### Problem 1 (20 min): Burst Balloons

> Given `n` balloons with values `nums[0..n-1]`, bursting balloon `i` earns `nums[left] × nums[i] × nums[right]` coins where `left` and `right` are the nearest surviving neighbors. Find the maximum coins you can collect by bursting all balloons.

**Expected approach:** Interval DP. Define `dp[i][j]` = max coins from bursting all balloons in range `(i, j)` exclusive. The key insight is to think about the *last* balloon burst in each interval, not the first.

**Follow-ups the interviewer might ask:**
1. How do you reconstruct which order to burst? (Store the choice of last-burst balloon in each interval; backtrack)
2. What if the balloons are arranged in a circle? (Duplicate the array: `nums + nums`, then take the best interval of length `n`)
3. What's the time complexity? (O(n³) time, O(n²) space)

**Evaluation criteria:**
- Identifies interval DP pattern
- Explains the "last balloon burst" insight clearly
- Correctly pads the array with boundary 1s
- Implements the triple loop without off-by-one errors

---

#### Problem 2 (25 min): Swim in Rising Water

> You are given an `n × n` grid where `grid[i][j]` represents the elevation at position `(i,j)`. Starting at `(0,0)`, you want to reach `(n-1, n-1)`. At time `t`, you can swim to any adjacent cell with elevation ≤ t. Find the minimum time to reach the destination.

**Expected approach (primary):** Modified Dijkstra — the cost to reach a cell is `max(current_time, grid[i][j])`. Use a min-heap.

**Alternative approaches:**
- **Binary search + BFS/DFS:** Binary search on time `t`, then check if a path exists using only cells with elevation ≤ `t`.
- **DSU (Union-Find):** Sort all cells by elevation; union adjacent cells as you process them in order. Stop when `(0,0)` and `(n-1,n-1)` are connected.

**Follow-ups the interviewer might ask:**
1. Compare the three approaches in terms of complexity. (Dijkstra: O(n² log n), BS+BFS: O(n² log n), DSU: O(n² α(n²)))
2. What if the grid updates in real-time — cells change elevation? (Discuss online vs offline; DSU with rollback or re-run Dijkstra)
3. What if you want the path, not just the time? (Track parent pointers in Dijkstra)

**Evaluation criteria:**
- Recognizes this as a minimax path problem
- Can implement at least two of the three approaches
- Correctly uses `max` instead of `sum` for path cost
- Handles the starting cell's elevation correctly

---

## Retrospective Template

After completing the mock interviews, fill in this template honestly. This is your roadmap for continued improvement.

### Performance Summary

| Mock Interview | Problem 1 Result | Problem 2 Result | Time Used | Notes |
|----------------|:-----------------:|:-----------------:|:---------:|-------|
| Mock 1: Graphs + DP | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ | /45 min | |
| Mock 2: Strings + Math | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ | /45 min | |
| Mock 3: DS + Binary Search | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ | /45 min | |
| Mock 4: Hard Mixed | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ | /45 min | |

*(✅ = solved optimally, ⚠️ = solved with hints/suboptimal, ❌ = did not solve)*

### What to Review

**Top 3 weakest topics:**
1. _____
2. _____
3. _____

**Problems I couldn't solve within the time limit:**
- _____
- _____
- _____

**Patterns I failed to recognize:**
- _____
- _____

**Follow-up questions I struggled with:**
- _____
- _____

**Recurring mistakes (bugs, edge cases, complexity errors):**
- _____

---

### Next Steps After the Roadmap

You've completed 20 weeks of structured DSA training. Here's how to maintain and extend your skills:

1. **LeetCode Weekly Contests** — Participate every week. Contests force you to solve under time pressure with unfamiliar problems. Aim to solve 3/4 consistently before targeting 4/4.

2. **Targeted Weak-Area Practice** — Use the self-assessment and retrospective above. For any topic rated 1–3, solve 5 additional problems at medium/hard difficulty.

3. **Explain Solutions Out Loud** — Practice rubber-duck debugging for interviews. Record yourself explaining a solution; listen back for clarity. If you can't explain it simply, you don't understand it deeply enough.

4. **System Design Preparation** — DSA is half the interview. Study system design in parallel — the Knowledge Base's System Design section covers this preparation path.

5. **Spaced Repetition** — Revisit solved problems after 1 week, 2 weeks, and 1 month. If you can't re-solve them cleanly, they need more practice.

6. **Mock Interviews with Humans** — Find a study partner or use platforms like Pramp, interviewing.io, or Neetcode. The social pressure of a real interviewer reveals weaknesses that solo practice hides.

---

## Final Tips for Interview Day

### Time Management (45-Minute Problem)

| Phase | Time | What to Do |
|-------|:----:|------------|
| **Understand** | 5 min | Read the problem twice. Identify input/output types, constraints, and edge cases. Ask clarifying questions. |
| **Plan** | 5 min | Identify the technique(s). Sketch the approach on paper/whiteboard. State time/space complexity. |
| **Code** | 15–20 min | Write clean code. Use meaningful variable names. Handle edge cases inline. |
| **Test** | 5 min | Walk through your code with a small example. Test edge cases (empty input, single element, large values). |

### The 5-Minute Classification Framework

Before touching code, spend the first 5 minutes classifying the problem. This framework prevents the most common interview failure mode: jumping into the wrong approach and wasting 15 minutes before realizing it.

**Step 1 - Read constraints.** The constraint on n is the single strongest signal. n up to 20 means bitmask DP or brute force. n up to 500 means O(n cubed) is okay (interval DP). n up to 10^5 means you need O(n log n) or better. n up to 10^18 means matrix exponentiation or mathematical formula.

**Step 2 - Identify the structure.** Is the input a tree? A graph? A sequence? A set? A grid? The structure dictates the technique family: tree inputs use tree DP/DFS, graph inputs use shortest paths/BFS/SCC, sequences use DP/binary search, sets use bitmask DP.

**Step 3 - Check for known patterns.** Does the problem match any row in the Master Pattern Recognition Guide above? If yes, you have a starting point. If it matches two rows, the problem likely combines both techniques.

**Step 4 - Verify with a small example.** Before coding, trace your approach on the sample input. If it gives the right answer and the complexity fits the constraints, proceed. If not, reconsider.

### Communication Principles

- **Think out loud** — The interviewer is evaluating your problem-solving process, not just your final code. Silence is your enemy.
- **Start with brute force** — Even if you know the optimal solution, briefly mention the brute force approach. It shows structured thinking and gives you a fallback.
- **State trade-offs** — When choosing between approaches, explain *why* you're picking one over the other (time vs. space, simplicity vs. optimality).
- **Ask clarifying questions upfront** — Are inputs sorted? Can there be duplicates? What's the range of n? These questions signal experience.
- **Test before declaring done** — Walk through your code with the given example, then try an edge case. Interviewers notice when you self-verify.

### Common Pitfalls to Avoid

- **Jumping to code too quickly** — A 2-minute planning pause prevents 10 minutes of debugging.
- **Ignoring constraints** — If n ≤ 10^5, an O(n²) solution will likely TLE. Read the constraints before choosing your approach.
- **Off-by-one errors** — Be deliberate about whether your ranges are inclusive or exclusive. Draw it out if needed.
- **Not handling edge cases** — Empty arrays, single elements, all-same values, negative numbers, overflow. Think about these *before* coding.
- **Overcomplicating the solution** — If your solution feels too complex, step back. There's probably a simpler approach.

---

*Congratulations on completing the 20-week DSA Training Roadmap. The techniques you've built are the foundation — consistent practice and honest self-assessment are what turn them into interview success. Good luck.*
