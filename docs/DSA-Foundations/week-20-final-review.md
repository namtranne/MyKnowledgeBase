---
sidebar_position: 21
title: "Week 20: Final Review + Mock Interviews"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 20: Final Review + Mock Interviews

Welcome to the **final week** of the 20-week DSA Foundations roadmap. There is no new material this week — instead, you will consolidate everything you have learned, sharpen your pattern recognition, and run **four full mock interviews** to simulate real conditions. The goal is simple: walk into your interview knowing you have seen every major pattern and practised the communication framework that turns knowledge into offers.

---

## 1 · Pattern Recognition Guide

The single most valuable skill in algorithm interviews is **recognising which technique a problem demands**. The table below maps common problem signals to the technique you should reach for. Memorise these associations — they are your first-pass filter on any new problem.

**Why pattern recognition is the meta-skill.** In an interview, you have 20-25 minutes to code a solution. If you spend 10 minutes deriving the approach from first principles, you are already behind. But if you recognise "this is a sliding window problem" within the first 30 seconds of reading, you immediately know the template, the data structures, and the complexity — and you spend your time on the nuances specific to *this* problem. Pattern recognition is not about memorising solutions; it is about building an index of approaches that lets you make the right choice fast.

**How to build this skill.** After solving each problem, write down the *signal* that should have pointed you to the technique. Over time, your mental pattern table will match (and exceed) the one below. The goal is to reach the point where reading a problem statement triggers automatic recall of the relevant approach.

### 1.1 Master Pattern Table

| Problem Signal | Technique | Typical Complexity | Example Problem |
|---|---|---|---|
| "Find pair/triple with target sum" | Two pointers (sorted) or hash map | O(n) – O(n^2) | Two Sum, 3Sum |
| "Subarray sum equals K" | Prefix sum + hash map | O(n) | Subarray Sum Equals K |
| "Longest/shortest substring with constraint" | Sliding window | O(n) | Longest Substring Without Repeating Characters |
| "Sorted array, find target" | Binary search | O(log n) | Search in Rotated Sorted Array |
| "Top K / Kth largest" | Heap (min-heap of size K) | O(n log K) | Top K Frequent Elements |
| "Merge sorted collections" | Heap or merge sort technique | O(n log K) | Merge K Sorted Lists |
| "Running median" | Two heaps (max-heap + min-heap) | O(log n) per insert | Find Median from Data Stream |
| "Merge/insert intervals" | Sort + linear scan | O(n log n) | Merge Intervals |
| "Tree traversal / path" | DFS (recursive or stack) | O(n) | Binary Tree Max Path Sum |
| "Level-order / shortest path (unweighted)" | BFS (queue) | O(V + E) | Word Ladder |
| "Shortest path (weighted, non-negative)" | Dijkstra (heap) | O(E log V) | Network Delay Time |
| "Shortest path (negative weights)" | Bellman-Ford | O(V * E) | Cheapest Flights Within K Stops |
| "Topological ordering / dependency" | Topological sort (Kahn or DFS) | O(V + E) | Course Schedule |
| "Connected components / cycle detection" | Union-Find or DFS | O(V + E) | Number of Islands |
| "Optimise recursive with overlapping subprobs" | Dynamic programming | Varies | Longest Increasing Subsequence |
| "Two sequences, match/edit/compare" | 2D DP | O(m * n) | Edit Distance, LCS |
| "Knapsack / subset target" | 0/1 or unbounded DP | O(n * W) | Partition Equal Subset Sum |
| "All permutations / combinations / subsets" | Backtracking | O(2^n) or O(n!) | Subsets, Permutations |
| "Constraint satisfaction (place N items)" | Backtracking with pruning | Exponential | N-Queens |
| "Design a cache / ordered access" | Hash map + doubly linked list | O(1) operations | LRU Cache |
| "Serialise / deserialise structure" | Preorder traversal + delimiter | O(n) | Serialize and Deserialize Binary Tree |
| "Trapping / histogram areas" | Monotonic stack or two pointers | O(n) | Trapping Rain Water |
| "Schedule jobs for max profit" | Sort + DP + binary search | O(n log n) | Maximum Profit in Job Scheduling |
| "Alien / custom ordering" | Topological sort from constraints | O(V + E) | Alien Dictionary |
| "Partition array with min-max objective" | Binary search on answer + greedy check | O(n log S) | Split Array Largest Sum |
| "Reverse/modify linked list in groups" | Iterative pointer manipulation | O(n) | Reverse Nodes in k-Group |

<AlgoViz
  title="Algorithm Selection Decision Walkthrough"
  description="Given a problem statement, walk through the mental process of selecting the right algorithm. Example: 'Find the longest substring with at most K distinct characters.'"
  steps={[
    { array: ["a","b","c","b","a","d","a","b"], highlights: [], variables: { problem: "Longest substring ≤ K distinct", K: 2, step: "Read problem" }, explanation: "Problem: Find the longest substring with at most K=2 distinct characters in 'abcbadab'. First, identify the signal words.", code: "// Step 1: Read the problem carefully" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [], variables: { signal1: "'longest substring'", signal2: "'with constraint'", signal3: "'contiguous'", decision: "→ Sliding Window" }, explanation: "Signal detection: 'longest substring' + 'with constraint' + contiguous range = SLIDING WINDOW pattern. Not two pointers (not sorted), not DP (no overlapping subproblems needed).", code: "// Signals: 'longest/shortest' + 'substring' → Sliding Window" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [], variables: { auxiliary: "HashMap (char freq)", window: "[left, right)", constraint: "map.size() ≤ K" }, explanation: "Choose auxiliary structure: HashMap to track character frequencies. Window constraint: map.size() must stay ≤ K. Expand right, shrink left when violated.", code: "Map<Character, Integer> freq = new HashMap<>();" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [0,1], variables: { window: "[0,1]", chars: "{a:1,b:1}", distinct: 2, maxLen: 2 }, explanation: "Apply template: expand right. Window 'ab' has 2 distinct chars (≤ K=2). Valid. maxLen=2.", code: "freq.merge(ch, 1, Integer::sum); // expand" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [2], secondary: [0,1], variables: { window: "[0,2]", chars: "{a:1,b:1,c:1}", distinct: 3, violation: "3 > K=2" }, explanation: "Add 'c': distinct=3 > K=2. Constraint violated! Shrink from left until valid.", code: "// map.size() > K → shrink left" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [1,2,3,4], secondary: [], variables: { window: "[1,4]", chars: "{b:1,c:1,b:2,a:1}→{b:2,c:1,a:1}...", shrunk: "remove 'a'", maxLen: 4 }, explanation: "Shrink left (remove 'a'), window becomes valid. Continue expanding. Window 'bcba' has chars within limit. Track maxLen.", code: "// shrink until map.size() <= K, update maxLen" },
    { array: ["a","b","c","b","a","d","a","b"], highlights: [], variables: { result: 4, timeComplexity: "O(n)", spaceComplexity: "O(K)", pattern: "Sliding Window + HashMap" }, explanation: "Final answer: longest substring with ≤2 distinct chars has length 4. O(n) time (each element visited at most twice), O(K) space for the map.", code: "return maxLen; // O(n) time, O(K) space" }
  ]}
/>

### 1.2 Top 20 Patterns Every Candidate Must Know

These are the 20 patterns that cover the vast majority of interview problems. If you can identify which pattern a problem belongs to within the first two minutes, you are in excellent shape.

1. **Hash Map Lookup** — "Have I seen this value before?" Store complements, indices, or frequencies for O(1) access.
2. **Two Pointers** — One from each end (sorted arrays, palindromes) or slow/fast (linked list cycles, middle finding).
3. **Sliding Window** — Maintain a window `[left, right)` and expand/shrink to satisfy a constraint. Track window state with a counter or hash map.
4. **Binary Search** — Not just for sorted arrays. Use on the answer space ("Can I achieve X?") and verify with a greedy check.
5. **Prefix Sum** — Precompute cumulative sums for O(1) range queries. Combine with a hash map for subarray-sum problems.
6. **Monotonic Stack** — Maintain a stack of elements in sorted order to find "next greater/smaller element" or compute histogram areas.
7. **BFS** — Level-order traversal, shortest path in unweighted graphs, multi-source BFS.
8. **DFS** — Tree path problems, graph cycle detection, connected components, backtracking foundation.
9. **Topological Sort** — Order nodes in a DAG respecting dependencies. Detect cycles in directed graphs.
10. **Union-Find** — Group elements by equivalence. Efficient connected-component tracking with path compression and union by rank.
11. **Heap / Priority Queue** — Top-K, merge K sorted structures, running median, Dijkstra.
12. **Interval Processing** — Sort by start (merge) or end (greedy selection). Sweep line for event-based problems.
13. **1D Dynamic Programming** — Climbing stairs, house robber, LIS. Build from base case, fill forward.
14. **2D Dynamic Programming** — Two-string comparison (LCS, edit distance), grid paths, knapsack.
15. **Backtracking** — Generate all candidates, prune invalid branches. Subsets, permutations, constraint satisfaction.
16. **Divide and Conquer** — Split into subproblems, solve recursively, merge results. Merge sort, median of two sorted arrays.
17. **Greedy** — Make the locally optimal choice at each step. Prove correctness by exchange argument.
18. **Graph Modelling** — Translate a non-obvious problem into a graph problem (word ladder, alien dictionary).
19. **Linked List Techniques** — Dummy head, reverse in place, merge, fast/slow pointers.
20. **Design Patterns** — LRU Cache (hash map + doubly linked list), iterator design, serialisation with delimiters.

<AlgoViz
  title="Multi-Technique Problem: Subarray Sum Equals K"
  description="Given nums=[1,2,3,-1,1,2] and K=3, find the number of contiguous subarrays that sum to K. This combines prefix sums + hash map — two techniques working together."
  steps={[
    { array: [1,2,3,-1,1,2], highlights: [], hashMap: [["prefix","count"]], variables: { K: 3, count: 0, technique: "Prefix Sum + HashMap" }, explanation: "Problem: count subarrays summing to K=3. Brute force is O(n^2). Key insight: if prefix[j]-prefix[i]=K, then subarray (i,j] sums to K.", code: "// prefix[j] - prefix[i] = K → prefix[i] = prefix[j] - K" },
    { array: [1,2,3,-1,1,2], highlights: [], hashMap: [["0","1"]], variables: { prefix: 0, count: 0, map: "{0:1}" }, explanation: "Initialise: prefix=0. Store {0:1} in map (empty prefix exists once). For each element, update prefix and check if (prefix-K) exists in map.", code: "map.put(0, 1); int prefix = 0, count = 0;" },
    { array: [1,2,3,-1,1,2], highlights: [0], hashMap: [["0","1"],["1","1"]], variables: { prefix: 1, "prefix-K": -2, found: 0, count: 0 }, explanation: "i=0: prefix=1. Check map for prefix-K = 1-3 = -2. Not found. Add {1:1} to map.", code: "prefix += 1; // map.get(-2) = 0" },
    { array: [1,2,3,-1,1,2], highlights: [0,1], hashMap: [["0","1"],["1","1"],["3","1"]], variables: { prefix: 3, "prefix-K": 0, found: 1, count: 1 }, explanation: "i=1: prefix=3. Check map for 3-3=0. Found with count 1! Subarray [0,1] sums to 3. count=1. Add {3:1}.", code: "count += map.get(0); // +1, subarray [1,2]" },
    { array: [1,2,3,-1,1,2], highlights: [2], secondary: [0,1], hashMap: [["0","1"],["1","1"],["3","1"],["6","1"]], variables: { prefix: 6, "prefix-K": 3, found: 1, count: 2 }, explanation: "i=2: prefix=6. Check for 6-3=3. Found! Subarray [2] (just element 3) sums to 3. count=2. Add {6:1}.", code: "count += map.get(3); // +1, subarray [3]" },
    { array: [1,2,3,-1,1,2], highlights: [3], hashMap: [["0","1"],["1","1"],["3","1"],["6","1"],["5","1"]], variables: { prefix: 5, "prefix-K": 2, found: 0, count: 2 }, explanation: "i=3: prefix=5. Check for 5-3=2. Not found. No new subarray. Add {5:1}.", code: "// map.get(2) = 0, no match" },
    { array: [1,2,3,-1,1,2], highlights: [4], hashMap: [["0","1"],["1","1"],["3","2"],["6","1"],["5","1"]], variables: { prefix: 6, "prefix-K": 3, found: 2, count: 4 }, explanation: "i=4: prefix=6. Check for 6-3=3. Found with count 2 (was updated)! Two subarrays end here summing to 3: [3,-1,1] and [-1,1,2...]. count=4. Update {6:...}.", code: "count += map.get(3); // +2" },
    { array: [1,2,3,-1,1,2], highlights: [5], hashMap: [["0","1"],["1","1"],["3","2"],["6","1"],["5","1"],["8","1"]], variables: { prefix: 8, "prefix-K": 5, found: 1, count: 5 }, explanation: "i=5: prefix=8. Check for 8-3=5. Found! One more subarray sums to 3. count=5.", code: "count += map.get(5); // +1" },
    { array: [1,2,3,-1,1,2], highlights: [0,1,2,3,4,5], variables: { result: 5, time: "O(n)", space: "O(n)", techniques: "Prefix Sum + HashMap" }, explanation: "Final: 5 subarrays sum to K=3. Two techniques combined: prefix sums convert range queries to point queries, HashMap gives O(1) lookup. Total O(n).", code: "return count; // 5" }
  ]}
/>

---

## 2 · Interview Preparation Tips

### 2.1 Time Management (45-Minute Interview)

| Phase | Time | What to Do |
|---|---|---|
| Clarify | 3–5 min | Restate the problem, confirm inputs/outputs, ask about edge cases, constraints |
| Approach | 5–7 min | Identify the pattern, describe your algorithm, state time/space complexity |
| Code | 15–20 min | Write clean code, name variables clearly, handle edge cases |
| Test | 5–7 min | Trace through 1–2 examples, check edge cases, fix bugs |
| Follow-ups | 5–10 min | Discuss optimisations, alternative approaches, scaling |

**Golden rule:** never start coding before you have stated your approach and the interviewer has agreed. Coding the wrong algorithm wastes 15 minutes you cannot recover.

### 2.2 Communication Framework: CACT

**C — Clarify**
- Restate the problem in your own words.
- Ask about input constraints: size, range, duplicates, negative numbers, empty inputs.
- Confirm the expected output format.
- Ask: "Are there any constraints I should know about?" and "Can I assume the input is valid?"

**A — Approach**
- State the brute-force solution and its complexity first. This shows you understand the problem.
- Then describe your optimised approach: which data structure, which pattern, why it works.
- State time and space complexity before writing a single line of code.
- Say: "I plan to use X because Y. Time will be O(...), space O(...). Does that sound good?"

**C — Code**
- Write code top-down: function signature first, then high-level structure, then fill in details.
- Use descriptive variable names (`left`, `right`, `window_sum` — not `i`, `j`, `s`).
- Talk as you code: "Now I'm initialising my hash map to track..." This lets the interviewer follow your thinking and redirect you if needed.
- If you are stuck, say so. "I'm considering two options here — let me think for a moment." Silence is acceptable; flailing is not.

**T — Test**
- Walk through your code with a concrete example. Point to each line and track variable values.
- Check edge cases: empty input, single element, all duplicates, maximum size.
- If you find a bug, fix it calmly. Finding your own bugs is a positive signal.

### 2.3 Common Mistakes to Avoid

1. **Jumping to code** — Starting to code before explaining your approach. The interviewer cannot evaluate your thinking if you are silently typing.
2. **Overcomplicating** — Reaching for an advanced technique when a simpler one works. Start simple, optimise only if prompted.
3. **Ignoring edge cases** — Empty arrays, single-element inputs, negative numbers, integer overflow. Mention them even if you do not handle all of them.
4. **Poor variable naming** — `a`, `b`, `c`, `tmp` make your code hard to follow. The interviewer is reading over your shoulder.
5. **Not testing** — Finishing and saying "I think that's correct" without walking through an example. Always trace.
6. **Panicking on bugs** — Bugs are expected. Stay calm, identify the issue, fix it, and move on.
7. **Fighting the interviewer** — If they give a hint, take it. They are trying to help you succeed.
8. **Forgetting complexity** — Always state time and space complexity. If you are unsure, reason through it out loud.

### 2.4 Whiteboard and Online Assessment Tips

**Whiteboard:**
- Write large and leave space between lines — you will need to insert fixes.
- Use the top-left corner for input/output examples.
- Draw diagrams for trees, graphs, and linked lists. Visual reasoning impresses interviewers.
- Practice writing code by hand. Your muscle memory is tuned for a keyboard; handwritten code has different failure modes (forgetting colons, parentheses, indentation).

**Online assessment:**
- Read ALL problems before starting. Some are easier and should be done first.
- Test locally before submitting — OA platforms often have limited submissions.
- Watch for time limits that hint at expected complexity (2 seconds with n = 10^5 usually means O(n log n) or better).

---

## 3 · Master Template Cheat Sheet

No new templates this week. Instead, here is a quick-reference index of every technique from Weeks 1–19 with the core idea in one line.

| # | Technique | One-Line Summary | Week |
|---|---|---|---|
| 1 | Frequency Counter | `map.merge(val, 1, Integer::sum)` — count occurrences in O(n) | 1 |
| 2 | Prefix Sum | `prefix[i] = prefix[i-1] + arr[i-1]` — range sum in O(1) | 1 |
| 3 | Two-Sum via Hash | Store `target - num` in a HashSet/HashMap for O(n) pair finding | 1 |
| 4 | Sliding Window (fixed) | Maintain window of size K, slide right, subtract left | 2 |
| 5 | Sliding Window (variable) | Expand right, shrink left while constraint violated | 2 |
| 6 | Two Pointers (converging) | `left = 0, right = n-1`, move inward based on condition | 2 |
| 7 | Linked List Reversal | Three pointers: `prev, curr, nxt` — reverse links in place | 3 |
| 8 | Fast/Slow Pointers | Detect cycles, find midpoint of linked list | 3 |
| 9 | Dummy Head | `ListNode dummy = new ListNode(0); dummy.next = head;` — simplify edge cases | 3 |
| 10 | Stack (valid parentheses) | Push openers, pop on closers, check match | 4 |
| 11 | Monotonic Stack | Maintain sorted order to find next-greater/smaller in O(n) | 4 |
| 12 | Queue / Deque | BFS frontier, sliding window maximum | 4 |
| 13 | Tree DFS (recursive) | `void dfs(TreeNode node) { if (node == null) return; dfs(left); dfs(right); }` | 5 |
| 14 | Tree BFS (level-order) | Queue-based traversal, process level by level | 5 |
| 15 | BST Search / Insert | Go left if smaller, right if larger — O(h) | 6 |
| 16 | BST Validation | Pass `(low, high)` bounds down the tree | 6 |
| 17 | Graph BFS | Queue + visited set, explore neighbours layer by layer | 7 |
| 18 | Graph DFS | Stack or recursion + visited set | 7 |
| 19 | Topological Sort (Kahn) | Track in-degrees, BFS from nodes with in-degree 0 | 8 |
| 20 | Union-Find | `find(x)` with path compression, `union(x, y)` by rank | 8 |
| 21 | Dijkstra | Min-heap of `(dist, node)`, relax edges greedily | 8 |
| 22 | Binary Search | `int lo = 0, hi = n-1; while (lo &lt;= hi) { int mid = lo + (hi-lo)/2; }` | 9 |
| 23 | Binary Search on Answer | Search the answer space, validate with greedy/simulation | 9 |
| 24 | 1D DP (bottom-up) | `dp[i] = best using elements 0..i` — fill left to right | 10 |
| 25 | 1D DP (top-down) | `HashMap&lt;Integer,Integer&gt; memo; int solve(int i) { ... }` — memoised recursion | 10 |
| 26 | 2D DP (two strings) | `dp[i][j]` compares prefixes of two sequences | 11 |
| 27 | Knapsack DP | `dp[w] = max value with capacity w` — iterate items, then capacity backwards | 11 |
| 28 | LIS (patience sorting) | Maintain `tails` array, binary search insertion point | 11 |
| 29 | Greedy (exchange argument) | Prove local choice is globally optimal | 11 |
| 30 | Heap Top-K | Min-heap of size K — push and pop to maintain top K | 12 |
| 31 | Two-Heap Median | Max-heap for lower half, min-heap for upper half | 12 |
| 32 | Interval Merge | Sort by start, extend or close based on overlap | 12 |
| 33 | Backtracking | `choose → explore → unchoose`, prune invalid branches | 12 |

**How to use this cheat sheet:** When you read a problem, scan this list. If the problem signal matches a technique, you know your starting point. If two techniques could apply, pick the one with better complexity.

### 3.1 Key Algorithm Review Animations

#### Quick Select (Kth Smallest Element)

Partition around a pivot, then recurse only on the side containing the target index. Average O(n), worst O(n²).

```java
public static int quickSelect(int[] arr, int lo, int hi, int k) {
    int pivot = arr[hi], store = lo;
    for (int i = lo; i < hi; i++) {
        if (arr[i] <= pivot) {
            int tmp = arr[store]; arr[store] = arr[i]; arr[i] = tmp;
            store++;
        }
    }
    int tmp = arr[store]; arr[store] = arr[hi]; arr[hi] = tmp;
    if (store == k) return arr[store];
    return store < k ? quickSelect(arr, store + 1, hi, k) : quickSelect(arr, lo, store - 1, k);
}
```

<AlgoViz
  title="Quick Select — Find Kth Smallest Element"
  description="arr=[7,2,1,8,6,3,5,4], find 3rd smallest (k=2, 0-indexed). Partition around pivot, recurse on one side only. Answer: 3."
  steps={[
    {
      array: [7, 2, 1, 8, 6, 3, 5, 4],
      highlights: [7],
      variables: { k: 2, target: "3rd smallest", pivot: "arr[7]=4" },
      explanation: "Find 3rd smallest (index k=2). Choose pivot = arr[hi] = 4. Partition: move elements ≤ 4 to the left.",
      code: "int pivot = arr[hi]; // pivot = 4"
    },
    {
      array: [2, 1, 3, 4, 6, 7, 5, 8],
      highlights: [3],
      secondary: [0, 1, 2],
      variables: { pivotIndex: 3, "≤4": "[2,1,3]", ">4": "[6,7,5,8]" },
      explanation: "After partition: elements ≤4 are [2,1,3] at indices 0-2, pivot 4 at index 3, elements >4 at indices 4-7. Pivot is at its final sorted position.",
      code: "// partition complete: pivot at index 3"
    },
    {
      array: [2, 1, 3, 4, 6, 7, 5, 8],
      highlights: [0, 1, 2],
      variables: { k: 2, pivotIndex: 3, decision: "k=2 < 3 → recurse LEFT" },
      explanation: "k=2 < pivotIndex=3 → the 3rd smallest is in the left partition [2,1,3]. Recurse on [lo=0, hi=2] only — ignore the right side entirely.",
      code: "return quickSelect(arr, 0, 2, 2); // recurse left"
    },
    {
      array: [2, 1, 3, 4, 6, 7, 5, 8],
      highlights: [2],
      secondary: [0, 1],
      variables: { subarray: "[2,1,3]", pivot: "arr[2]=3", "≤3": "[2,1]", ">3": "[]" },
      explanation: "Subarray [2,1,3]. Pivot = 3. After partition: [2,1,3]. Elements ≤3 are [2,1] at indices 0-1, pivot 3 at index 2.",
      code: "// partition [2,1,3]: pivot 3 lands at index 2"
    },
    {
      array: [2, 1, 3, 4, 6, 7, 5, 8],
      highlights: [2],
      variables: { k: 2, pivotIndex: 2, match: "k == pivotIndex!" },
      explanation: "k=2 == pivotIndex=2 → found! arr[2]=3 is the 3rd smallest element. No more recursion needed.",
      code: "if (store == k) return arr[store]; // 3"
    },
    {
      array: [2, 1, 3, 4, 6, 7, 5, 8],
      highlights: [2],
      variables: { result: 3, avgTime: "O(n)", worstTime: "O(n²)", spaceUsed: "O(1) iterative" },
      explanation: "Answer: 3. Quick Select processed only 8+3=11 elements total vs sorting all 8 (O(n log n)). Average O(n) because each recursion halves the search space.",
      code: "return 3; // 3rd smallest found in ~O(n)"
    }
  ]}
/>

#### Merge Sort

Divide array in half, recursively sort both halves, merge the sorted halves. O(n log n) guaranteed.

```java
public static void mergeSort(int[] arr, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(arr, lo, mid);
    mergeSort(arr, mid + 1, hi);
    merge(arr, lo, mid, hi);
}

private static void merge(int[] arr, int lo, int mid, int hi) {
    int[] temp = Arrays.copyOfRange(arr, lo, hi + 1);
    int i = 0, j = mid - lo + 1, k = lo;
    while (i <= mid - lo && j <= hi - lo)
        arr[k++] = temp[i] <= temp[j] ? temp[i++] : temp[j++];
    while (i <= mid - lo) arr[k++] = temp[i++];
    while (j <= hi - lo) arr[k++] = temp[j++];
}
```

<AlgoViz
  title="Merge Sort — Divide and Conquer"
  description="Sort [5,2,8,1] using merge sort. Divide into halves, sort recursively, merge sorted halves. Guaranteed O(n log n)."
  steps={[
    {
      array: [5, 2, 8, 1],
      highlights: [],
      variables: { phase: "divide", depth: 0 },
      explanation: "Start: [5,2,8,1]. Merge sort divides the array in half recursively until single elements, then merges sorted halves bottom-up.",
      code: "mergeSort(arr, 0, 3); // sort full array"
    },
    {
      array: [5, 2, 8, 1],
      highlights: [0, 1],
      secondary: [2, 3],
      variables: { left: "[5,2]", right: "[8,1]", mid: 1 },
      explanation: "Divide: split [5,2,8,1] at mid=1 into left=[5,2] and right=[8,1]. Recurse on left first.",
      code: "int mid = 0 + (3-0)/2; // mid=1"
    },
    {
      array: [5, 2, 8, 1],
      highlights: [0],
      secondary: [1],
      variables: { "left split": "[5] [2]", "right split": "[8] [1]" },
      explanation: "Divide further: [5,2]→[5],[2] and [8,1]→[8],[1]. Single elements are base cases — already sorted.",
      code: "if (lo >= hi) return; // base case: single element"
    },
    {
      array: [2, 5, 8, 1],
      highlights: [0, 1],
      variables: { merged: "[2,5]", compare: "2 < 5" },
      explanation: "Merge [5]+[2]: compare 5 vs 2, pick 2 first, then 5. Result: [2,5]. Left half sorted.",
      code: "arr[k++] = temp[i] <= temp[j] ? temp[i++] : temp[j++];"
    },
    {
      array: [2, 5, 1, 8],
      highlights: [2, 3],
      variables: { merged: "[1,8]", compare: "1 < 8" },
      explanation: "Merge [8]+[1]: compare 8 vs 1, pick 1 first, then 8. Result: [1,8]. Right half sorted.",
      code: "// merge right half: [8],[1] → [1,8]"
    },
    {
      array: [1, 2, 5, 8],
      highlights: [0, 1, 2, 3],
      variables: { merged: "[1,2,5,8]", comparisons: "1<2→1, 2<8→2, 5<8→5, 8" },
      explanation: "Final merge [2,5]+[1,8]: compare heads repeatedly. 1<2→take 1. 2<8→take 2. 5<8→take 5. Take 8. Result: [1,2,5,8].",
      code: "// merge [2,5] + [1,8] → [1,2,5,8]"
    },
    {
      array: [1, 2, 5, 8],
      highlights: [0, 1, 2, 3],
      variables: { result: "[1,2,5,8]", time: "O(n log n)", space: "O(n)", stable: true },
      explanation: "Sorted! Merge sort: O(n log n) guaranteed (no worst case degradation), O(n) extra space for temp array, stable (preserves equal-element order).",
      code: "// O(n log n) time, O(n) space, stable sort"
    }
  ]}
/>

#### Binary Search Variations

Search for an insertion point in a sorted array. The `lo < hi` pattern converges `lo` and `hi` to the answer.

```java
public static int searchInsert(int[] nums, int target) {
    int lo = 0, hi = nums.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

<AlgoViz
  title="Binary Search — lo/hi Convergence"
  description="arr=[1,3,5,7,9,11], target=6 (not present). Find insertion point. lo and hi converge from both ends to index 3."
  steps={[
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [],
      pointers: { 0: "lo", 5: "hi" },
      variables: { target: 6, lo: 0, hi: 6, searchSpace: "all 6 elements" },
      explanation: "Find where to insert 6 in sorted array [1,3,5,7,9,11]. lo=0, hi=6 (length). Search space = entire array.",
      code: "int lo = 0, hi = nums.length; // [0, 6)"
    },
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [3],
      pointers: { 0: "lo", 3: "mid", 5: "hi" },
      variables: { mid: 3, "nums[3]": 7, "7 >= 6": "hi = 3" },
      explanation: "mid=3, nums[3]=7 ≥ 6 → target is in left half. Set hi=3. Search space narrows to [0,3).",
      code: "hi = mid; // 7 >= 6, search left"
    },
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [1],
      pointers: { 0: "lo", 1: "mid", 2: "hi" },
      variables: { mid: 1, "nums[1]": 3, "3 < 6": "lo = 2" },
      explanation: "mid=1, nums[1]=3 < 6 → target is in right half. Set lo=2. Search space narrows to [2,3).",
      code: "lo = mid + 1; // 3 < 6, search right"
    },
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [2],
      pointers: { 2: "lo=mid", 2: "hi" },
      variables: { mid: 2, "nums[2]": 5, "5 < 6": "lo = 3" },
      explanation: "mid=2, nums[2]=5 < 6 → lo=3. Now lo=3 == hi=3 → loop ends. Converged!",
      code: "lo = mid + 1; // 5 < 6, lo becomes 3"
    },
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [3],
      pointers: { 3: "insert here" },
      variables: { result: 3, inserted: "[1,3,5,→6←,7,9,11]" },
      explanation: "lo=hi=3 → insert at index 3. The value 6 goes between 5 and 7. Binary search halved the space each step: 6→3→1 elements.",
      code: "return lo; // 3"
    },
    {
      array: [1, 3, 5, 7, 9, 11],
      highlights: [],
      variables: { pattern: "lo < hi with hi=mid", guarantee: "lo and hi always converge", time: "O(log n)" },
      explanation: "Key pattern: 'lo < hi' loop with 'hi = mid' (not mid-1) guarantees convergence without missing the answer. Works for first occurrence, insertion point, and lower-bound searches.",
      code: "// lo < hi + hi=mid: universal left-bound pattern"
    }
  ]}
/>

#### Sliding Window

Expand the window right, shrink from the left when constraint is violated. O(n) — each element visited at most twice.

```java
public static int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int maxLen = 0, left = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (last.containsKey(c) && last.get(c) >= left)
            left = last.get(c) + 1;
        last.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

<AlgoViz
  title="Sliding Window — Longest Substring Without Repeating Characters"
  description="s='abcbad'. Expand right edge, jump left edge past duplicates using a hash map of last-seen indices. Answer: 4 ('cbad')."
  steps={[
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [],
      variables: { left: 0, maxLen: 0, map: "{}" },
      explanation: "Find longest substring without repeating characters in 'abcbad'. Use hash map to track each character's last-seen index.",
      code: "Map<Character, Integer> last = new HashMap<>();"
    },
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [0, 1, 2],
      variables: { left: 0, right: 2, window: "abc", maxLen: 3, map: "{a:0, b:1, c:2}" },
      explanation: "Expand right through indices 0-2: 'a','b','c' — all unique. Window='abc', length 3. No shrinking needed.",
      code: "last.put(c, right); maxLen = Math.max(maxLen, 3);"
    },
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [2, 3],
      secondary: [1],
      variables: { left: 2, right: 3, window: "cb", maxLen: 3, "b last seen": 1, "left jumps": "1+1=2" },
      explanation: "right=3: 'b' last seen at index 1 ≥ left=0 → jump left to 2. Window='cb', length 2. Map updates b→3.",
      code: "left = last.get('b') + 1; // jump to 2"
    },
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [2, 3, 4],
      variables: { left: 2, right: 4, window: "cba", maxLen: 3, "a last seen": "0 < left=2 → no jump" },
      explanation: "right=4: 'a' last seen at index 0, but 0 < left=2 → no shrink needed (old 'a' is outside window). Window='cba', length 3.",
      code: "// last.get('a')=0 < left=2: ignore stale entry"
    },
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [2, 3, 4, 5],
      variables: { left: 2, right: 5, window: "cbad", maxLen: 4 },
      explanation: "right=5: 'd' is new. Window='cbad', length 4. New maximum! The window expanded without conflict.",
      code: "maxLen = Math.max(3, 5-2+1); // 4"
    },
    {
      array: ["a", "b", "c", "b", "a", "d"],
      highlights: [2, 3, 4, 5],
      variables: { result: 4, bestWindow: "cbad", time: "O(n)", space: "O(min(n, alphabet))" },
      explanation: "Done. Longest substring without repeating chars: 'cbad', length 4. Each element visited at most twice (once by right, once by left) → O(n).",
      code: "return maxLen; // 4"
    }
  ]}
/>

#### DFS on Graph

Explore as deep as possible before backtracking. Use a stack (or recursion) and a visited set to avoid cycles.

```java
public static List<Integer> dfsIterative(List<List<Integer>> graph, int start) {
    List<Integer> order = new ArrayList<>();
    boolean[] visited = new boolean[graph.size()];
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited[node]) continue;
        visited[node] = true;
        order.add(node);
        List<Integer> neighbors = graph.get(node);
        for (int i = neighbors.size() - 1; i >= 0; i--)
            if (!visited[neighbors.get(i)]) stack.push(neighbors.get(i));
    }
    return order;
}
```

<AlgoViz
  title="DFS on Graph — Stack-Based Traversal"
  description="Graph: 0→1, 0→2, 1→3, 2→3, 2→4. Start at node 0. DFS explores depth-first using an explicit stack, tracking visited nodes."
  steps={[
    {
      array: [0, 0, 0, 0, 0],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [],
      stack: ["0"],
      variables: { visited: "[]", order: "[]" },
      explanation: "Start: push node 0 onto stack. Visited set is empty. DFS will explore as deep as possible before backtracking.",
      code: "stack.push(start); // push node 0"
    },
    {
      array: [1, 0, 0, 0, 0],
      highlights: [0],
      stack: ["1", "2"],
      variables: { visited: "[0]", order: "[0]", popped: 0 },
      explanation: "Pop 0, mark visited, add to order. Push neighbors 1 and 2 (reversed for correct order). Stack=[1,2] (1 on top).",
      code: "visited[0]=true; order.add(0); stack.push(2); stack.push(1);"
    },
    {
      array: [1, 1, 0, 0, 0],
      highlights: [0, 1],
      stack: ["3", "2"],
      variables: { visited: "[0,1]", order: "[0,1]", popped: 1 },
      explanation: "Pop 1, mark visited. Push neighbor 3 (only unvisited neighbor). Stack=[3,2]. Exploring depth-first down 0→1→3 path.",
      code: "visited[1]=true; order.add(1); stack.push(3);"
    },
    {
      array: [1, 1, 0, 1, 0],
      highlights: [0, 1, 3],
      stack: ["2"],
      variables: { visited: "[0,1,3]", order: "[0,1,3]", popped: 3 },
      explanation: "Pop 3, mark visited. Node 3 has no unvisited neighbors. Stack=[2]. Backtrack — now explore the other branch.",
      code: "visited[3]=true; order.add(3); // no unvisited neighbors"
    },
    {
      array: [1, 1, 1, 1, 0],
      highlights: [0, 1, 2, 3],
      stack: ["4"],
      variables: { visited: "[0,1,2,3]", order: "[0,1,3,2]", popped: 2 },
      explanation: "Pop 2, mark visited. Neighbors: 3 (visited, skip), 4 (unvisited, push). Stack=[4].",
      code: "visited[2]=true; order.add(2); stack.push(4);"
    },
    {
      array: [1, 1, 1, 1, 1],
      highlights: [0, 1, 2, 3, 4],
      stack: [],
      variables: { visited: "[0,1,2,3,4]", order: "[0,1,3,2,4]" },
      explanation: "Pop 4, mark visited. No neighbors. Stack empty → DFS complete. Order: [0,1,3,2,4]. All 5 nodes explored.",
      code: "// stack empty, DFS complete: [0,1,3,2,4]"
    },
    {
      array: [1, 1, 1, 1, 1],
      highlights: [0, 1, 2, 3, 4],
      stack: [],
      variables: { order: "[0,1,3,2,4]", time: "O(V+E)", space: "O(V)" },
      explanation: "DFS traversal: [0,1,3,2,4]. Went deep (0→1→3) before backtracking (→2→4). O(V+E) time, O(V) space for visited array and stack.",
      code: "return order; // [0,1,3,2,4]"
    }
  ]}
/>

#### BFS Shortest Path

Explore level by level from source. Each node's distance is finalized when first visited. O(V+E) for unweighted graphs.

```java
public static int[] bfsShortestPath(List<List<Integer>> graph, int start) {
    int[] dist = new int[graph.size()];
    Arrays.fill(dist, -1);
    dist[start] = 0;
    Queue<Integer> queue = new ArrayDeque<>();
    queue.offer(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.get(node)) {
            if (dist[neighbor] == -1) {
                dist[neighbor] = dist[node] + 1;
                queue.offer(neighbor);
            }
        }
    }
    return dist;
}
```

<AlgoViz
  title="BFS Shortest Path — Level-by-Level Exploration"
  description="Unweighted graph: 0-1, 0-2, 1-3, 2-3, 3-4, 2-5. BFS from node 0 finds shortest distances to all nodes."
  steps={[
    {
      array: [0, -1, -1, -1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0],
      stack: ["0"],
      variables: { "dist[]": "[0,-1,-1,-1,-1,-1]", level: 0 },
      explanation: "Init: dist[0]=0 (source), all others -1 (unvisited). Enqueue node 0. BFS explores layer by layer — distance is finalized on first visit.",
      code: "dist[start] = 0; queue.offer(start);"
    },
    {
      array: [0, 1, 1, -1, -1, -1],
      highlights: [0],
      secondary: [1, 2],
      stack: ["1", "2"],
      variables: { "dist[]": "[0,1,1,-1,-1,-1]", level: 1, dequeued: 0 },
      explanation: "Dequeue 0. Visit neighbors 1 and 2: dist[1]=1, dist[2]=1. Both are 1 hop from source. Queue=[1,2].",
      code: "dist[1] = dist[0]+1; dist[2] = dist[0]+1;"
    },
    {
      array: [0, 1, 1, 2, -1, -1],
      highlights: [1],
      secondary: [3],
      stack: ["2", "3"],
      variables: { "dist[]": "[0,1,1,2,-1,-1]", level: 2, dequeued: 1 },
      explanation: "Dequeue 1. Neighbor 3 unvisited: dist[3]=2. Neighbor 0 already visited, skip. Queue=[2,3].",
      code: "dist[3] = dist[1]+1; // 2 hops from source"
    },
    {
      array: [0, 1, 1, 2, -1, 2],
      highlights: [2],
      secondary: [5],
      stack: ["3", "5"],
      variables: { "dist[]": "[0,1,1,2,-1,2]", level: 2, dequeued: 2 },
      explanation: "Dequeue 2. Neighbor 3 already visited (dist=2), skip. Neighbor 5 unvisited: dist[5]=2. Queue=[3,5].",
      code: "dist[5] = dist[2]+1; // also 2 hops"
    },
    {
      array: [0, 1, 1, 2, 3, 2],
      highlights: [3],
      secondary: [4],
      stack: ["5", "4"],
      variables: { "dist[]": "[0,1,1,2,3,2]", level: 3, dequeued: 3 },
      explanation: "Dequeue 3. Neighbor 4 unvisited: dist[4]=3. Queue=[5,4].",
      code: "dist[4] = dist[3]+1; // 3 hops from source"
    },
    {
      array: [0, 1, 1, 2, 3, 2],
      highlights: [5, 4],
      stack: [],
      variables: { dequeued: "5, then 4", neighbors: "all visited" },
      explanation: "Dequeue 5: no unvisited neighbors. Dequeue 4: no unvisited neighbors. Queue empty → BFS complete.",
      code: "// queue empty, all nodes visited"
    },
    {
      array: [0, 1, 1, 2, 3, 2],
      highlights: [0, 1, 2, 3, 4, 5],
      stack: [],
      variables: { "dist[]": "[0,1,1,2,3,2]", time: "O(V+E)", space: "O(V)" },
      explanation: "Final shortest distances from node 0: [0,1,1,2,3,2]. BFS guarantees shortest paths in unweighted graphs because it explores in distance order. O(V+E).",
      code: "return dist; // [0,1,1,2,3,2]"
    }
  ]}
/>

## Additional Pattern Recognition: When Two Patterns Compete

Sometimes a problem could be solved by multiple patterns. Here is how to choose:

| Competing Patterns | Decision Criterion | Example |
|---|---|---|
| Two pointers vs. sliding window | Two pointers for sorted arrays or converging search; sliding window for contiguous subarrays with constraints | Two Sum (sorted) vs. Longest Substring Without Repeating |
| DP vs. greedy | If locally optimal choices compose to global optimum (provable), use greedy. Otherwise, DP | Coin Change (DP) vs. Activity Selection (greedy) |
| BFS vs. DFS | BFS for shortest path in unweighted graphs or level-order; DFS for exhaustive search, path finding, or backtracking | Word Ladder (BFS) vs. Word Search (DFS) |
| Heap vs. sorting | Heap when you need dynamic Top-K (stream of elements); sorting when you process a fixed batch | Top K Frequent (heap) vs. Merge Intervals (sort) |
| HashMap vs. sorting | HashMap for O(n) with O(n) space; sorting for O(n log n) with O(1) space | Two Sum (HashMap) vs. Two Sum (sort + two pointers) |
| Monotonic stack vs. two pointers | Monotonic stack for next-greater/smaller and contribution problems; two pointers for trapping water (simpler code) | Trapping Rain Water supports both |

<AlgoViz
  title="Multi-Technique Problem: Subarray Sum Equals K (Prefix Sum + HashMap)"
  description="Combine two patterns — prefix sums and hash map lookup — to count subarrays summing to K=7 in [3,4,7,2,-3,1,4,2]. Neither technique alone suffices; together they give O(n)."
  steps={[
    { array: [3,4,7,2,-3,1,4,2], highlights: [], variables: { K: 7, technique_1: "Prefix Sum", technique_2: "HashMap", insight: "prefix[j] - prefix[i] = K means subarray (i..j] sums to K" }, explanation: "Key insight: if prefix[j] - prefix[i] = K, then subarray from i+1 to j sums to K. HashMap stores prefix sum frequencies for O(1) complement lookups.", code: "// Two patterns fused: prefix sum + hash map" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [0], variables: { prefix: 3, need: -4, map: "{0:1}", count: 0 }, explanation: "i=0: prefix=3. Check if prefix-K = 3-7 = -4 exists in map {0:1}. No. Store prefix 3 in map. Map: {0:1, 3:1}. count=0.", code: "prefix += 3; // 3. map.getOrDefault(-4, 0) → 0" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [0,1], secondary: [0,1], variables: { prefix: 7, need: 0, map: "{0:1, 3:1}", count: 1, found: "[3,4] sums to 7" }, explanation: "i=1: prefix=7. Check 7-7=0 in map → found (count 1)! Subarray [3,4]=7. count=1. Store 7 in map.", code: "prefix += 4; // 7. map.get(0)=1 → count++ // [3,4]" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [2], secondary: [2], variables: { prefix: 14, need: 7, map: "{0:1, 3:1, 7:1}", count: 2, found: "[7] sums to 7" }, explanation: "i=2: prefix=14. Check 14-7=7 in map → found! Subarray from after prefix=7 to here is [7]=7. count=2.", code: "prefix += 7; // 14. map.get(7)=1 → count++ // [7]" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [3,4], variables: { prefix_3: 16, prefix_4: 13, need_3: 9, need_4: 6, count: 2 }, explanation: "i=3: prefix=16, need 9, not found. i=4: prefix=13, need 6, not found. No new matching subarrays. count stays 2.", code: "// prefix 16 and 13: no matching complement in map" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [2,3,4,5], secondary: [2,3,4,5], variables: { prefix: 14, need: 7, count: 3, found: "[7,2,-3,1] sums to 7" }, explanation: "i=5: prefix=14. Check 14-7=7 in map → found! Subarray [7,2,-3,1] = 7+2-3+1 = 7. count=3.", code: "prefix += 1; // 14. map.get(7)=1 → count++ // [7,2,-3,1]" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [6], variables: { prefix: 18, need: 11, count: 3 }, explanation: "i=6: prefix=18. Check 18-7=11 in map → not found. count stays 3.", code: "prefix += 4; // 18. map.containsKey(11) → false" },
    { array: [3,4,7,2,-3,1,4,2], highlights: [5,6,7], secondary: [5,6,7], variables: { prefix: 20, need: 13, count: 4, found: "[1,4,2] sums to 7", allSubarrays: "[3,4], [7], [7,2,-3,1], [1,4,2]" }, explanation: "i=7: prefix=20. Check 20-7=13 in map → found! Subarray [1,4,2] = 1+4+2 = 7. Final count=4. Prefix sum identified the ranges; HashMap found them in O(1) each.", code: "return count; // 4 subarrays sum to 7" }
  ]}
/>

---

## 4 · Worked Example: Full Mock Interview Walkthrough (45 Minutes)

This section simulates a complete 45-minute interview from start to finish. Read it as if you are watching a candidate perform, and internalise the communication rhythm.

**Why this example matters.** Trapping Rain Water is the quintessential "multi-approach" problem — it can be solved with precomputed arrays, two pointers, or a monotonic stack. This makes it an excellent test of not just your algorithm knowledge, but your ability to *compare approaches*, articulate trade-offs, and pick the right one for the situation. Interviewers love it because the follow-ups reveal depth.

**Key insight for the two-pointer approach:** At any position, the water level is determined by the *shorter* of the two maximum heights (left max and right max). The two-pointer technique processes the side with the smaller max first, because that side is the bottleneck — regardless of what exists on the other side, the water at that position is bounded by the smaller max. This observation eliminates the need to precompute arrays.

**Problem chosen:** Trapping Rain Water (LC 42)

### Phase 1 — Clarify (3 minutes)

**Interviewer:** "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining."

**Candidate:**

"Let me make sure I understand. I'm given an array of heights. Water fills the space between bars. For each position, the water level is determined by the minimum of the tallest bar to its left and the tallest bar to its right, minus the bar's own height. I want the total water trapped across all positions."

"Quick clarifications: Can heights be zero? (Yes.) Can the array be empty or have fewer than 3 elements? (If so, the answer is 0.) Are all values non-negative integers? (Yes.)"

### Phase 2 — Approach (5 minutes)

**Candidate:**

"The brute-force approach: for each index i, scan left for the max height and scan right for the max height, then compute `min(left_max, right_max) - height[i]`. That is O(n^2) time."

"I can optimise in two ways:"

"**Option A — Precompute arrays.** Build `left_max[i]` and `right_max[i]` in two passes, then compute water in a third pass. O(n) time, O(n) space."

"**Option B — Two pointers.** Use `left` and `right` pointers starting at the ends, track `left_max` and `right_max` as running values. At each step, the side with the smaller max determines the water level. This is O(n) time, O(1) space."

"I'll implement the two-pointer approach since it has optimal space. Time is O(n), space is O(1)."

"Does that approach sound good?"

**Interviewer:** "Go ahead."

### Phase 3 — Code (15 minutes)

```java
public static int trap(int[] height) {
    if (height.length < 3) return 0;
    int left = 0, right = height.length - 1;
    int leftMax = height[left], rightMax = height[right];
    int water = 0;

    while (left < right) {
        if (leftMax <= rightMax) {
            left++;
            leftMax = Math.max(leftMax, height[left]);
            water += leftMax - height[left];
        } else {
            right--;
            rightMax = Math.max(rightMax, height[right]);
            water += rightMax - height[right];
        }
    }
    return water;
}
```

**Candidate (talking while coding):**

"I start both pointers at the edges. `left_max` and `right_max` track the tallest bars seen so far from each side. I always process the side with the smaller max because that side is the bottleneck — the water at that position is bounded by the smaller max regardless of what is on the other side. After updating the max, the water at the current position is `max - height` which is always non-negative because the max is at least as large as the current height."

### Phase 4 — Test (5 minutes)

**Candidate:**

"Let me trace through `height = [0,1,0,2,1,0,1,3,2,1,2,1]`."

```
left=0, right=11, left_max=0, right_max=1

left_max(0) <= right_max(1):
  left=1, left_max=max(0,1)=1, water += 1-1 = 0

left_max(1) <= right_max(1):
  left=2, left_max=max(1,0)=1, water += 1-0 = 1

left_max(1) <= right_max(1):
  left=3, left_max=max(1,2)=2, water += 2-2 = 0

right_max(1) < left_max(2):
  right=10, right_max=max(1,2)=2, water += 2-2 = 0

left_max(2) <= right_max(2):
  left=4, left_max=max(2,1)=2, water += 2-1 = 1   (total=2)

left_max(2) <= right_max(2):
  left=5, left_max=max(2,0)=2, water += 2-0 = 2   (total=4)

left_max(2) <= right_max(2):
  left=6, left_max=max(2,1)=2, water += 2-1 = 1   (total=5)

left_max(2) <= right_max(2):
  left=7, left_max=max(2,3)=3, water += 3-3 = 0   (total=5)

right_max(2) < left_max(3):
  right=9, right_max=max(2,1)=2, water += 2-1 = 1  (total=6)

right_max(2) < left_max(3):
  right=8, right_max=max(2,2)=2, water += 2-2 = 0  (total=6)

left=7, right=8: left < right still true
left_max(3) > right_max(2):
  right=7, right_max=max(2,3)=3, water += 3-3 = 0  (total=6)

left=7, right=7: loop ends.
```

"Answer: 6. That matches the expected output."

"Edge cases: empty array returns 0. Array `[3,0,3]` would give 3. Monotonically increasing or decreasing array gives 0."

### Animation

<AlgoViz
  title="Trapping Rain Water (Two Pointers)"
  description="Two pointers start from both ends. The side with the smaller max is the bottleneck and determines water level at that position. height = [0,1,0,2,1,0,1,3,2,1,2,1]."
  steps={[
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [0, 11], variables: { left: 0, right: 11, leftMax: 0, rightMax: 1, water: 0 }, explanation: "Initial: left=0, right=11. leftMax=0, rightMax=1.", code: "int left = 0, right = height.length - 1;" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [1], variables: { left: 1, right: 11, leftMax: 1, rightMax: 1, water: 0 }, explanation: "leftMax(0) <= rightMax(1): move left to 1. leftMax = max(0,1) = 1. water += 1-1 = 0.", code: "leftMax = Math.max(leftMax, height[++left]);" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [2], variables: { left: 2, right: 11, leftMax: 1, rightMax: 1, water: 1 }, explanation: "leftMax(1) <= rightMax(1): move left to 2. height=0. water += 1-0 = 1.", code: "water += leftMax - height[left]; // +1" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [3], variables: { left: 3, right: 11, leftMax: 2, rightMax: 1, water: 1 }, explanation: "leftMax(1) <= rightMax(1): move left to 3. leftMax = max(1,2) = 2. water += 2-2 = 0.", code: "leftMax = Math.max(leftMax, height[++left]);" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [10], variables: { left: 3, right: 10, leftMax: 2, rightMax: 2, water: 1 }, explanation: "rightMax(1) < leftMax(2): move right to 10. rightMax = max(1,2) = 2. water += 2-2 = 0.", code: "rightMax = Math.max(rightMax, height[--right]);" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [4, 5, 6], variables: { left: 6, right: 10, leftMax: 2, rightMax: 2, water: 5 }, explanation: "Process left 4,5,6: water += (2-1) + (2-0) + (2-1) = 1+2+1 = 4. Total water = 5.", code: "// three steps, water accumulates to 5" },
    { array: [0,1,0,2,1,0,1,3,2,1,2,1], highlights: [7, 8, 9], variables: { left: 7, right: 7, leftMax: 3, rightMax: 3, water: 6, result: 6 }, explanation: "Process remaining: left=7 (h=3, leftMax=3, +0), right=9 (+1), right=8 (+0). Pointers meet. Total water = 6.", code: "return water; // 6" },
  ]}
/>

### Phase 5 — Follow-ups (7 minutes)

**Interviewer:** "What about using a stack-based approach?"

**Candidate:** "I can use a monotonic stack. Iterate left to right, maintaining a decreasing stack of indices. When I encounter a bar taller than the stack top, I pop and compute the water trapped at the popped bar: the width is `current_index - new_stack_top - 1`, the height is `min(height[current], height[new_stack_top]) - height[popped]`. This is also O(n) time and O(n) space."

**Interviewer:** "What if the elevation map is 2D — a matrix of heights?"

**Candidate:** "That is the 3D trapping rain water problem (LC 407). I would use a min-heap on the boundary cells, process inward from the lowest boundary cell, and compute water as `boundary_min - cell_height` for cells lower than the boundary. The heap ensures I always process the lowest boundary next, which guarantees correct water levels. Time is O(mn log(mn))."

---

## 5 · Problem Sets — 21 Must-Do Review Problems

Every problem below is starred (⭐) — these are the most important problems from the entire 20-week curriculum. If you can solve all 21 cleanly, you are ready.

### Day 1: Arrays, Strings + Linked Lists Review

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 1 | Two Sum | Easy | Hash map | ⭐ | [1](https://leetcode.com/problems/two-sum/) |
| 2 | 3Sum | Medium | Sort + two pointers | ⭐ | [15](https://leetcode.com/problems/3sum/) |
| 3 | Trapping Rain Water | Hard | Two pointers / monotonic stack | ⭐ | [42](https://leetcode.com/problems/trapping-rain-water/) |
| 4 | Merge Intervals | Medium | Sort + linear scan | ⭐ | [56](https://leetcode.com/problems/merge-intervals/) |
| 5 | LRU Cache | Medium | Hash map + doubly linked list | ⭐ | [146](https://leetcode.com/problems/lru-cache/) |
| 6 | Reverse Nodes in k-Group | Hard | Iterative list reversal | ⭐ | [25](https://leetcode.com/problems/reverse-nodes-in-k-group/) |
| 7 | Median of Two Sorted Arrays | Hard | Binary search | ⭐ | [4](https://leetcode.com/problems/median-of-two-sorted-arrays/) |

### Day 2: Trees, Graphs + DP Review

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 8 | Binary Tree Maximum Path Sum | Hard | DFS, post-order | ⭐ | [124](https://leetcode.com/problems/binary-tree-maximum-path-sum/) |
| 9 | Serialize and Deserialize Binary Tree | Hard | Preorder + delimiter | ⭐ | [297](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) |
| 10 | Course Schedule | Medium | Topological sort | ⭐ | [207](https://leetcode.com/problems/course-schedule/) |
| 11 | Word Ladder | Hard | BFS shortest path | ⭐ | [127](https://leetcode.com/problems/word-ladder/) |
| 12 | Alien Dictionary | Hard | Topological sort | ⭐ | [269](https://leetcode.com/problems/alien-dictionary/) |
| 13 | Longest Increasing Subsequence | Medium | DP + binary search | ⭐ | [300](https://leetcode.com/problems/longest-increasing-subsequence/) |
| 14 | Edit Distance | Medium | 2D DP | ⭐ | [72](https://leetcode.com/problems/edit-distance/) |

### Day 3: Advanced + Hard Review

| # | Problem | Diff | Pattern | Star | LC |
|---|---|---|---|---|---|
| 15 | Longest Common Subsequence | Medium | 2D DP | ⭐ | [1143](https://leetcode.com/problems/longest-common-subsequence/) |
| 16 | Maximum Profit in Job Scheduling | Hard | DP + binary search | ⭐ | [1235](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) |
| 17 | Merge K Sorted Lists | Hard | Heap | ⭐ | [23](https://leetcode.com/problems/merge-k-sorted-lists/) |
| 18 | Find Median from Data Stream | Hard | Two heaps | ⭐ | [295](https://leetcode.com/problems/find-median-from-data-stream/) |
| 19 | N-Queens | Hard | Backtracking | ⭐ | [51](https://leetcode.com/problems/n-queens/) |
| 20 | Burst Balloons | Hard | Interval DP | ⭐ | [312](https://leetcode.com/problems/burst-balloons/) |
| 21 | Split Array Largest Sum | Hard | Binary search on answer | ⭐ | [410](https://leetcode.com/problems/split-array-largest-sum/) |

---

## 6 · Mock Interviews

### Mock 1 — Arrays + Trees (45 min)

**Interviewer:** "Given an array of integers, return indices of the two numbers that add up to a specific target. You may assume exactly one solution exists and you may not use the same element twice."

**Candidate talk-track:**

1. "Classic Two Sum. Brute force is O(n^2) — check every pair. I can do O(n) with a hash map: for each number, check if `target - num` is already in the map."
2. "One pass is sufficient. I store each number's index as I iterate. If the complement exists, I return both indices immediately."

```java
public static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement))
            return new int[]{seen.get(complement), i};
        seen.put(nums[i], i);
    }
    return new int[]{};
}
```

3. Walk through: `nums = [2,7,11,15], target = 9`. At i=0, seen = `{2:0}`. At i=1, complement = 2, found in seen. Return `[0,1]`.

**Follow-up 1 — "Now solve Binary Tree Maximum Path Sum."**

"A path can start and end at any node. I'll DFS post-order. At each node, I compute the max gain from the left and right subtrees (clamped to 0 — if negative, don't take it). The path *through* this node is `left_gain + right_gain + node.val`. I update a global max. The return value is `node.val + max(left_gain, right_gain)` — the best single-branch path upward."

```java
private int maxSum = Integer.MIN_VALUE;

public int maxPathSum(TreeNode root) {
    dfs(root);
    return maxSum;
}

private int dfs(TreeNode node) {
    if (node == null) return 0;
    int left = Math.max(dfs(node.left), 0);
    int right = Math.max(dfs(node.right), 0);
    maxSum = Math.max(maxSum, node.val + left + right);
    return node.val + Math.max(left, right);
}
```

**Follow-up 2 — "What if the tree is not binary — each node can have any number of children?"**

"Same idea, but instead of left/right, I sort all children's gains descending, take the top two positive gains for the through-path, and return `node.val + max_child_gain` upward. If all children return negative, I take none."

**Follow-up 3 — "What if you need to return the actual path, not just the sum?"**

"I'd modify the DFS to also return the path itself (as a list of node values). At each node, I'd track which branch produced the best gain and build the path by concatenating `left_path + [node] + right_path` when updating the global best. This adds O(n) space for path storage."

---

### Mock 2 — Graphs + DP (45 min)

**Interviewer:** "There are `numCourses` courses labelled 0 to numCourses-1. You are given prerequisites where `prerequisites[i] = [a, b]` means you must take course b before course a. Determine if it is possible to finish all courses."

**Candidate talk-track:**

1. "This is cycle detection in a directed graph. If there's a cycle in the prerequisite graph, it's impossible to finish all courses."
2. "I'll use Kahn's algorithm (BFS topological sort). Build an adjacency list and in-degree array. Start BFS from all nodes with in-degree 0. If I process all nodes, no cycle exists."

```java
public static boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());

    for (int[] p : prerequisites) {
        adj.get(p[1]).add(p[0]);
        inDegree[p[0]]++;
    }

    Queue<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < numCourses; i++)
        if (inDegree[i] == 0) queue.offer(i);

    int count = 0;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        count++;
        for (int nei : adj.get(node)) {
            if (--inDegree[nei] == 0) queue.offer(nei);
        }
    }
    return count == numCourses;
}
```

3. Trace: `numCourses=4, prerequisites=[[1,0],[2,1],[3,2]]`. In-degrees: `[0,1,1,1]`. Start with 0. Process 0 -> 1's in-degree drops to 0. Process 1 -> 2's in-degree drops to 0. Process 2 -> 3's in-degree drops to 0. Count = 4. Return True.

**Follow-up 1 — "Now solve Longest Common Subsequence."**

"Classic 2D DP. `dp[i][j]` = LCS length of `text1[0..i-1]` and `text2[0..j-1]`. If characters match, `dp[i][j] = dp[i-1][j-1] + 1`. Otherwise, `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`. Time and space O(m * n)."

```java
public static int longestCommonSubsequence(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}
```

**Follow-up 2 — "Can you reconstruct the actual subsequence?"**

"I'd backtrack through the DP table from `dp[m][n]`. If `text1[i-1] == text2[j-1]`, include that character and move diagonally. Otherwise, move in the direction of the larger value. This gives the LCS string in reverse, which I then reverse."

**Follow-up 3 — "What about Longest Common Substring instead of Subsequence?"**

"The recurrence changes: if characters match, `dp[i][j] = dp[i-1][j-1] + 1`. If they don't match, `dp[i][j] = 0` (the substring must be contiguous). Track the global maximum. The rest is the same."

**Follow-up 4 — "What if there are three strings instead of two?"**

"Extend to 3D DP: `dp[i][j][k]`. If all three characters match, `dp[i][j][k] = dp[i-1][j-1][k-1] + 1`. Otherwise, take the max of all three one-step-back options. Time is O(l * m * n)."

---

### Mock 3 — Design + Strings (45 min)

**Interviewer:** "Design a data structure that supports `get(key)` and `put(key, value)` in O(1) time with a fixed capacity. When capacity is exceeded, evict the least recently used item."

**Candidate talk-track:**

1. "This is LRU Cache. I need O(1) access (hash map) and O(1) ordering (doubly linked list). The hash map stores `key -> node`, and the doubly linked list maintains recency order with the most recently used at the head."
2. "On `get`: look up in the hash map, move the node to the head, return the value."
3. "On `put`: if key exists, update value and move to head. If not, create a new node, add to head. If capacity exceeded, remove the tail node and delete its entry from the hash map."

```java
class Node {
    int key, val;
    Node prev, next;
    Node() {}
    Node(int key, int val) { this.key = key; this.val = val; }
}

class LRUCache {
    private int cap;
    private Map<Integer, Node> cache = new HashMap<>();
    private Node head = new Node(), tail = new Node();

    public LRUCache(int capacity) {
        this.cap = capacity;
        head.next = tail;
        tail.prev = head;
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    public int get(int key) {
        if (!cache.containsKey(key)) return -1;
        Node node = cache.get(key);
        remove(node);
        addToHead(node);
        return node.val;
    }

    public void put(int key, int value) {
        if (cache.containsKey(key)) {
            Node node = cache.get(key);
            node.val = value;
            remove(node);
            addToHead(node);
        } else {
            if (cache.size() == cap) {
                Node lru = tail.prev;
                remove(lru);
                cache.remove(lru.key);
            }
            Node node = new Node(key, value);
            cache.put(key, node);
            addToHead(node);
        }
    }
}
```

**Follow-up 1 — "Now, given a list of words and an ordering of the alien alphabet, verify the words are sorted in that order."**

"Build a mapping from character to its rank in the alien alphabet. Then compare each adjacent pair of words lexicographically using the alien ordering. If any pair is out of order, return False. Time O(total characters), space O(1) since the alphabet is fixed size."

```java
public static boolean isAlienSorted(String[] words, String order) {
    int[] rank = new int[26];
    for (int i = 0; i < order.length(); i++)
        rank[order.charAt(i) - 'a'] = i;

    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        boolean found = false;
        for (int j = 0; j < w1.length(); j++) {
            if (j >= w2.length()) return false;
            if (rank[w1.charAt(j) - 'a'] < rank[w2.charAt(j) - 'a']) { found = true; break; }
            if (rank[w1.charAt(j) - 'a'] > rank[w2.charAt(j) - 'a']) return false;
        }
    }
    return true;
}
```

**Follow-up 2 — "What about deriving the alien alphabet order from a sorted list of words?"**

"That is the Alien Dictionary problem (LC 269). I extract ordering constraints by comparing adjacent words character by character. Each constraint is a directed edge. Then I run topological sort on the character graph. If there is a cycle, the ordering is invalid. If multiple valid orderings exist, any topological order is acceptable."

**Follow-up 3 — "How would you extend LRU Cache to support a TTL (time-to-live) for each entry?"**

"I'd add a `timestamp` field to each node and store the TTL. On `get`, check if `current_time - timestamp > ttl` — if so, treat it as a miss and evict the entry. On `put`, record the current time. For lazy cleanup, expired entries are removed on access. For proactive cleanup, I could run a periodic sweep or use a min-heap ordered by expiry time."

---

### Mock 4 — Mixed Hard (45 min)

**Interviewer:** "Given n balloons with values `nums[0..n-1]`, each time you burst balloon i you gain `nums[left] * nums[i] * nums[right]` coins, where left and right are the adjacent surviving balloons. After bursting, left and right become adjacent. Find the maximum coins you can collect."

**Candidate talk-track:**

1. "This is Burst Balloons (LC 312). The key insight is to think about which balloon is burst **last** in a range, not first. If balloon k is the last one burst in range `(i, j)`, then when it pops, its neighbors are `nums[i]` and `nums[j]` (the boundaries), and the subproblems `(i, k)` and `(k, j)` are independent."
2. "I'll pad the array with 1s on both ends: `vals = [1] + nums + [1]`. Then `dp[i][j]` = max coins from bursting all balloons strictly between indices i and j."
3. "Recurrence: `dp[i][j] = max over k in (i+1..j-1) of dp[i][k] + vals[i]*vals[k]*vals[j] + dp[k][j]`."
4. "I iterate by increasing gap length. Base case: `dp[i][i+1] = 0` (no balloons between adjacent indices)."

```java
public static int maxCoins(int[] nums) {
    int[] vals = new int[nums.length + 2];
    vals[0] = vals[nums.length + 1] = 1;
    System.arraycopy(nums, 0, vals, 1, nums.length);
    int n = vals.length;
    int[][] dp = new int[n][n];

    for (int gap = 2; gap < n; gap++) {
        for (int i = 0; i < n - gap; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++) {
                dp[i][j] = Math.max(dp[i][j],
                    dp[i][k] + vals[i] * vals[k] * vals[j] + dp[k][j]);
            }
        }
    }
    return dp[0][n - 1];
}
```

5. Trace with `nums = [3,1,5,8]`: `vals = [1,3,1,5,8,1]`. Build table bottom-up. Final answer `dp[0][5] = 167`.

**Follow-up 1 — "Solve Split Array Largest Sum: split `nums` into `m` subarrays to minimise the largest subarray sum."**

"Binary search on the answer. The answer lies between `max(nums)` (each element alone) and `sum(nums)` (one subarray). For a candidate answer `mid`, I greedily check if I can split the array into at most m subarrays where each has sum at most `mid`. If yes, try smaller; if no, try larger."

```java
public static int splitArray(int[] nums, int m) {
    int lo = 0;
    long hi = 0;
    for (int num : nums) { lo = Math.max(lo, num); hi += num; }

    while (lo < hi) {
        long mid = lo + (hi - lo) / 2;
        if (canSplit(nums, m, mid)) hi = mid;
        else lo = (int) mid + 1;
    }
    return lo;
}

private static boolean canSplit(int[] nums, int m, long maxSum) {
    int count = 1;
    long current = 0;
    for (int num : nums) {
        if (current + num > maxSum) { count++; current = num; }
        else current += num;
    }
    return count <= m;
}
```

**Follow-up 2 — "What if you had to split into exactly m parts (not at most m)?"**

"The greedy check still works — if I can split into at most m parts with max sum `mid`, I can always merge adjacent parts to get exactly m (since merging doesn't increase the max beyond `mid` — actually it could). Let me reconsider. The greedy check naturally returns the minimum number of splits needed. If the minimum is less than or equal to m, we can always add splits to reach exactly m by splitting the largest subarray. The binary search answer remains valid."

**Follow-up 3 — "Solve Reverse Nodes in k-Group."**

"I reverse every group of k nodes in the linked list. For each group: count k nodes ahead. If fewer than k remain, leave them as-is. Otherwise, reverse k nodes in place (standard 3-pointer reversal), then connect the reversed group's tail to the result of recursing on the remainder."

```java
public static ListNode reverseKGroup(ListNode head, int k) {
    ListNode node = head;
    int count = 0;
    while (node != null && count < k) { node = node.next; count++; }
    if (count < k) return head;

    ListNode prev = null, curr = head;
    for (int i = 0; i < k; i++) {
        ListNode nxt = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nxt;
    }
    head.next = reverseKGroup(curr, k);
    return prev;
}
```

**Follow-up 4 — "What is the time and space complexity of the balloon problem? Can you optimise?"**

"Time is O(n^3) — three nested loops (i, j, k). Space is O(n^2) for the DP table. This is optimal for this problem; no known algorithm does better. The problem is equivalent to optimal matrix chain multiplication, which has the same O(n^3) lower bound for standard approaches."

---

## 7 · What's Next

You have completed the **20-week DSA Foundations** roadmap. You now have solid, interview-ready coverage of:

- Arrays, strings, linked lists, stacks, queues
- Binary trees, BSTs, heaps
- Graphs (BFS, DFS, topological sort, shortest paths, union-find)
- Dynamic programming (1D, 2D, interval DP, knapsack)
- Backtracking, greedy algorithms, binary search
- Design patterns (LRU Cache, serialisation)

**To continue levelling up**, move to the **Intensive track** which covers advanced topics that appear in top-tier company interviews:

- **Segment Trees and Fenwick Trees** — range queries with updates in O(log n)
- **Bitmask DP** — DP where the state encodes a subset as a bitmask (Travelling Salesman, assignment problems)
- **Digit DP** — count numbers with specific digit properties up to N
- **Game Theory** — Sprague-Grundy theorem, minimax, alpha-beta pruning
- **String Algorithms** — KMP, Rabin-Karp, suffix arrays, Aho-Corasick
- **Advanced Graph Algorithms** — max flow, min cut, bipartite matching, strongly connected components
- **Computational Geometry** — convex hull, line sweep, closest pair of points
- **Contest-Style Training** — timed problem sets, Codeforces/AtCoder virtual contests

The patterns you have internalised over these 20 weeks are the foundation for everything above. Keep practising, keep timing yourself, and remember: **consistency beats intensity**. Twenty minutes a day is better than a five-hour cram session once a week.

Good luck with your interviews. You are ready.
