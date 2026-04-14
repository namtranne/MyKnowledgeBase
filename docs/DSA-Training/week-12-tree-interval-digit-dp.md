---
sidebar_position: 13
title: "Week 12: Tree DP + Interval DP + Digit DP"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 12: Tree DP + Interval DP + Digit DP

## Why This Week Matters

Three DP families share a common trait: **the structure of the problem dictates the DP transition order.** Tree DP follows the tree's DFS order. Interval DP expands from short intervals to long ones. Digit DP processes one digit at a time from most significant to least. Once you recognize which structure you're dealing with, the formulation follows naturally. These patterns cover a huge swath of hard interview problems — from "optimal value on a subtree" to "count numbers in [L, R] with property X."

---

## Core Theory

<AlgoViz
  title="Burst Balloons — Interval DP"
  steps={[
    { description: "Input: nums = [3, 1, 5, 8]. Pad with virtual 1s: a = [1, 3, 1, 5, 8, 1]. dp[i][j] = max coins bursting all balloons in open interval (i, j).", state: { array: "[1, 3, 1, 5, 8, 1]", phase: "Initialization" } },
    { description: "Base cases: dp[i][i+1] = 0 for all i (no balloons between adjacent indices).", state: { dp: "dp[0][1]=0, dp[1][2]=0, dp[2][3]=0, dp[3][4]=0, dp[4][5]=0" } },
    { description: "Length 3 — dp[0][2]: k=1, burst balloon 1 last: 1*3*1 = 3. dp[0][2] = 3.", state: { interval: "[0,2]", k: 1, coins: "1*3*1 = 3", dp_val: 3 } },
    { description: "Length 3 — dp[1][3]: k=2, burst balloon 2 last: 3*1*5 = 15. dp[1][3] = 15.", state: { interval: "[1,3]", k: 2, coins: "3*1*5 = 15", dp_val: 15 } },
    { description: "Length 3 — dp[2][4]: k=3, burst balloon 3 last: 1*5*8 = 40. dp[2][4] = 40.", state: { interval: "[2,4]", k: 3, coins: "1*5*8 = 40", dp_val: 40 } },
    { description: "Length 3 — dp[3][5]: k=4, burst balloon 4 last: 5*8*1 = 40. dp[3][5] = 40.", state: { interval: "[3,5]", k: 4, coins: "5*8*1 = 40", dp_val: 40 } },
    { description: "Length 4 — dp[0][3]: try k=1 (3+15+1*3*5=33) and k=2 (3+0+1*1*5=8). Best: dp[0][3] = 33.", state: { interval: "[0,3]", bestK: 1, dp_val: 33 } },
    { description: "Length 5 — dp[0][4]: try all k in (1,2,3). Best split gives dp[0][4] = 159.", state: { interval: "[0,4]", dp_val: 159 } },
    { description: "Length 6 — dp[0][5]: try all k in (1,2,3,4). Best split gives dp[0][5] = 167. Answer: 167.", state: { interval: "[0,5]", dp_val: 167, answer: 167 } }
  ]}
/>

### 1. Tree DP

**Why this technique exists.** Trees have a natural recursive structure: every subtree is independent once you fix the root. This means the optimal answer for a subtree depends only on the subtree's own data, not on what happens elsewhere in the tree. Tree DP exploits this by computing answers bottom-up, combining child results at each parent node. Without this approach, you would need to enumerate all possible configurations -- exponential in the number of nodes.

**The intuition.** Imagine you are the manager of a company organized as a tree. To compute a total (like maximum independent set), you ask each of your direct reports for their answer, combine them, and pass the result to your boss. This "ask children, combine, report upward" is exactly post-order DFS. The key design decision is choosing what information each node reports -- typically a small tuple (e.g., "best if I am selected" vs. "best if I am not selected").

**Interview signals.** Look for: (1) the input is explicitly a tree or can be modeled as one, (2) "optimal value for each subtree," (3) "minimum cameras / guards / colors on a tree," (4) the answer at the root depends on choices made at descendants.

**Common mistakes.** (1) Forgetting to skip the parent edge when processing children in an unrooted tree (`if child == parent: continue`). (2) Using recursion on trees with up to 100,000 nodes without increasing the stack size -- convert to iterative DFS. (3) Returning a single value from each node when the problem actually requires two or more states (e.g., "selected" vs. "not selected").

Tree DP computes an answer for each node based on the answers of its children. The canonical traversal is **DFS post-order**: process all children before the parent.

**General framework:**

```
dp[node] = combine(dp[child1], dp[child2], ..., dp[childK], node_value)
```

**Classic examples:**
- **Max independent set:** Select nodes so no two adjacent are selected; maximize sum of values.
- **Tree diameter:** Longest path between any two nodes.
- **Binary tree cameras:** Minimum cameras to monitor all nodes.

#### Max Independent Set — Full Template

```java
import java.util.*;

int maxIndependentSet(int n, int[][] edges, int[] values) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        adj.get(e[1]).add(e[0]);
    }

    // dp[node][0] = max sum if node is NOT selected
    // dp[node][1] = max sum if node IS selected
    int[][] dp = new int[n][2];

    Deque<int[]> stack = new ArrayDeque<>();
    boolean[] visited = new boolean[n];
    int[] parent = new int[n];
    Arrays.fill(parent, -1);
    List<Integer> order = new ArrayList<>();
    stack.push(new int[]{0, -1});
    while (!stack.isEmpty()) {
        int[] cur = stack.pop();
        int node = cur[0];
        if (visited[node]) continue;
        visited[node] = true;
        parent[node] = cur[1];
        order.add(node);
        for (int child : adj.get(node)) {
            if (!visited[child]) stack.push(new int[]{child, node});
        }
    }

    // Process in reverse order (post-order)
    for (int i = order.size() - 1; i >= 0; i--) {
        int node = order.get(i);
        dp[node][1] = values[node];
        for (int child : adj.get(node)) {
            if (child == parent[node]) continue;
            dp[node][0] += Math.max(dp[child][0], dp[child][1]);
            dp[node][1] += dp[child][0];
        }
    }
    return Math.max(dp[0][0], dp[0][1]);
}
```

**Time:** O(n) — each node visited once. **Space:** O(n).

<AlgoViz
  title="Tree DP — Max Independent Set"
  description="Computes max independent set on a small tree: 0-1-2-3 (path graph) with values [3, 2, 5, 4]. dp[node][0] = not selected, dp[node][1] = selected."
  steps={[
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [],
      variables: {values: "[3, 2, 5, 4]", phase: "Post-order DFS"},
      explanation: "Tree rooted at 0: 0→1→{2, 3}. Values: node 0=3, 1=2, 2=5, 3=4. Process leaves first.",
      code: "// dp[node][0] = skip, dp[node][1] = select"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [2],
      variables: {"dp[2][0]": 0, "dp[2][1]": 5, node: 2},
      explanation: "Leaf node 2 (value=5): dp[2][0]=0 (skip), dp[2][1]=5 (select). No children to consider.",
      code: "dp[2][1] = values[2];  // 5"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [3],
      variables: {"dp[3][0]": 0, "dp[3][1]": 4, node: 3},
      explanation: "Leaf node 3 (value=4): dp[3][0]=0 (skip), dp[3][1]=4 (select).",
      code: "dp[3][1] = values[3];  // 4"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [1],
      variables: {"dp[1][0]": "max(0,5)+max(0,4)=9", "dp[1][1]": "2+0+0=2", node: 1},
      explanation: "Node 1 (value=2): If skip → take best of each child: max(0,5)+max(0,4)=9. If select → children must be skipped: 2+0+0=2.",
      code: "dp[1][0] = max(dp[2]) + max(dp[3]) = 5+4 = 9"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [0],
      variables: {"dp[0][0]": "max(9,2)=9", "dp[0][1]": "3+9=12? No: 3+dp[1][0]=3+9=12", node: 0},
      explanation: "Wait — dp[0][1] = values[0] + dp[1][0] = 3 + 9 = 12 (select 0, skip 1 → children 2,3 free). dp[0][0] = max(dp[1][0], dp[1][1]) = max(9,2) = 9.",
      code: "dp[0][1] = 3 + dp[1][0] = 3 + 9 = 12"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 2}, right: {val: 3}}},
      treeHighlights: [0, 2, 3],
      variables: {answer: "max(9, 12) = 12", selected: "{0, 2, 3}", total: "3+5+4=12"},
      explanation: "Answer: max(dp[0][0], dp[0][1]) = max(9, 12) = 12. Select nodes {0, 2, 3} with values 3+5+4=12. Node 1 is skipped — no adjacent selected nodes!",
      code: "return Math.max(dp[0][0], dp[0][1]);  // 12"
    }
  ]}
/>

---

### 2. Rerooting Technique

Many tree problems ask: "Compute the answer for **every** node as root." Naively running DFS from each node costs O(n²). The rerooting technique does it in O(n):

1. **Root the tree arbitrarily** (say at node 0). Compute `dp_down[node]` via standard post-order DFS.
2. **Second DFS (pre-order):** For each node, compute `dp_up[node]` — the contribution from the "parent side" of the tree. When moving from parent to child, "remove" the child's contribution from the parent's answer, then combine with the parent's full answer.

**Template for Sum of Distances in Tree (LC 834):**

```java
import java.util.*;

int[] sumOfDistancesInTree(int n, int[][] edges) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        adj.get(e[1]).add(e[0]);
    }

    int[] count = new int[n];  // subtree sizes
    int[] ans = new int[n];
    int[] par = new int[n];
    Arrays.fill(count, 1);
    Arrays.fill(par, -1);

    // Iterative BFS to get processing order
    List<Integer> order = new ArrayList<>();
    boolean[] visited = new boolean[n];
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    queue.offer(0);
    visited[0] = true;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int child : adj.get(node)) {
            if (!visited[child]) {
                visited[child] = true;
                par[child] = node;
                queue.offer(child);
            }
        }
    }

    // Pass 1: compute subtree sizes and sum of distances from root 0
    for (int i = order.size() - 1; i >= 0; i--) {
        int node = order.get(i);
        for (int child : adj.get(node)) {
            if (child == par[node]) continue;
            count[node] += count[child];
            ans[node] += ans[child] + count[child];
        }
    }

    // Pass 2: reroot — when moving from parent to child,
    // child's subtree gets 1 closer, everything else gets 1 farther
    for (int node : order) {
        for (int child : adj.get(node)) {
            if (child == par[node]) continue;
            ans[child] = ans[node] - count[child] + (n - count[child]);
        }
    }
    return ans;
}
```

**Key formula:** `ans[child] = ans[parent] - count[child] + (n - count[child])`. Moving root from parent to child: the `count[child]` nodes in child's subtree each get 1 step closer; the remaining `n - count[child]` nodes each get 1 step farther.

<AlgoViz
  title="Tree DP — Computing Tree Diameter"
  description="Finds the diameter (longest path) of a tree: root 0 with children {1,2}, node 1 has children {3,4}. Post-order DFS tracks two deepest child paths."
  steps={[
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [],
      variables: {diameter: 0, phase: "Post-order DFS"},
      explanation: "Tree: root 0, children 1 and 2. Node 1 has children 3 and 4. Diameter = longest path between any two nodes. Track two deepest child paths at each node.",
      code: "// dp[node] = max depth in subtree"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [3],
      variables: {node: 3, "depth[3]": 0, leaf: true, diameter: 0},
      explanation: "Leaf node 3: depth=0 (no children). Cannot form a path through this node alone (need at least 2 child paths).",
      code: "depth[3] = 0;  // leaf"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [4],
      variables: {node: 4, "depth[4]": 0, leaf: true, diameter: 0},
      explanation: "Leaf node 4: depth=0. Leaf node 2: depth[2]=0. All leaves processed.",
      code: "depth[4] = 0; depth[2] = 0;"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [1, 3, 4],
      variables: {node: 1, child_depths: "[1, 1]", "depth[1]": 1, "path_through_1": "3->1->4 = 1+1 = 2", diameter: 2},
      explanation: "Node 1: child 3 contributes depth 0+1=1, child 4 contributes 0+1=1. Diameter candidate through node 1: 1+1=2 (path 3->1->4). depth[1]=max(1,1)=1.",
      code: "diameter = max(diameter, d1+d2);  // max(0, 2) = 2"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [0, 1, 2],
      variables: {node: 0, "depth_from_1": "1+1=2", "depth_from_2": "0+1=1", "path_through_0": "3->1->0->2 = 2+1 = 3", diameter: 3},
      explanation: "Node 0: child 1 contributes depth 1+1=2, child 2 contributes 0+1=1. Diameter through node 0: 2+1=3 (path 3->1->0->2). New max!",
      code: "diameter = max(2, 2+1);  // 3"
    },
    {
      tree: {val: 0, left: {val: 1, left: {val: 3}, right: {val: 4}}, right: {val: 2}},
      treeHighlights: [3, 1, 0, 2],
      variables: {answer: 3, longest_path: "3->1->0->2 (or 4->1->0->2)", edges: 3},
      explanation: "Final diameter: 3 edges. The longest path passes through the node whose sum of two deepest child paths is largest. O(n) time — each node visited once.",
      code: "return diameter;  // 3"
    }
  ]}
/>

<AlgoViz
  title="Tree DP — Maximum Path Sum in Binary Tree"
  description="Finds the maximum sum path in tree: root −10, left child 9, right child 20 with children 15 and 7. Each node reports max single-branch gain to parent."
  steps={[
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [],
      variables: {maxSum: "-∞", phase: "Post-order DFS"},
      explanation: "Tree: root=-10, left=9, right=20(children 15,7). A path can bend through any node. Each node computes max single-branch gain to report upward, and checks if bending here gives a new global max.",
      code: "// maxGain(node) returns max single-branch sum"
    },
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [9],
      variables: {node: 9, left: 0, right: 0, path_through: 9, gain_up: 9, maxSum: 9},
      explanation: "Leaf 9: no children (gains = 0). Path through this node = 9. Report gain = max(0, 9) = 9 to parent. Update maxSum = 9.",
      code: "gain = max(0, 9) = 9"
    },
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [15, 7],
      variables: {node_15: "gain=15", node_7: "gain=7", maxSum: 15},
      explanation: "Leaf 15: gain=15, maxSum updated to 15. Leaf 7: gain=7, maxSum stays 15. Both leaves report their values upward.",
      code: "// leaves: gain = node.val (if positive)"
    },
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [20, 15, 7],
      variables: {node: 20, left_gain: 15, right_gain: 7, path_through: "15+20+7=42", gain_up: "20+max(15,7)=35", maxSum: 42},
      explanation: "Node 20: left gain=15, right gain=7. Bending path: 15+20+7=42 — new global max! To parent, report 20+max(15,7)=35 (can only extend ONE branch upward).",
      code: "path = 20+15+7 = 42; gain = 20+15 = 35"
    },
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [-10],
      variables: {node: -10, left_gain: 9, right_gain: 35, path_through: "-10+9+35=34", maxSum: 42},
      explanation: "Root -10: left gain=9, right gain=35. Bending: -10+9+35=34 < 42. The optimal path does NOT go through the root! maxSum unchanged at 42.",
      code: "path = -10+9+35 = 34 < 42; no update"
    },
    {
      tree: {val: -10, left: {val: 9}, right: {val: 20, left: {val: 15}, right: {val: 7}}},
      treeHighlights: [15, 20, 7],
      variables: {answer: 42, path: "15 → 20 → 7", key: "Path bends at node 20"},
      explanation: "Answer: 42. Best path: 15→20→7, bending at node 20. Key insight: each node reports max SINGLE-branch gain upward; bending paths are only evaluated locally at each node.",
      code: "return maxSum;  // 42"
    }
  ]}
/>

---

### 3. Interval DP

**Why this technique exists.** Some problems have a deceptive structure: the cost of an action depends on what remains *after* other actions are taken (e.g., bursting balloons changes who the neighbors are). Greedy fails because the optimal first move depends on the entire future sequence. Interval DP resolves this by reframing the question: instead of "what to do first," ask "what to do *last* in each interval." This eliminates the dependency on future actions because, by the time we handle the last element, everything else in the interval is already resolved.

**The intuition.** Think of interval DP as solving a jigsaw puzzle from the outside in. You fix the boundary (the interval endpoints), then ask: "If I save element k for last in this interval, what is the best I can do with the left side [i..k] and right side [k..j] independently?" Trying every possible k and taking the best gives the optimal answer. The loop order -- short intervals before long ones -- ensures that when you solve a long interval, all its sub-intervals are already computed.

**Interview signals.** Look for: (1) "merge adjacent segments," (2) "burst/remove elements where the cost depends on neighbors," (3) "minimum cost to reduce an array/string to a single element," (4) "partition a sequence optimally." The constraint n is at most 500 (since O(n cubed) must be feasible) is a strong signal.

Interval DP solves problems on contiguous subarrays/subsequences where the optimal solution for `[i..j]` depends on splitting into `[i..k]` and `[k+1..j]`.

**State:** `dp[i][j]` = optimal value for the subarray from index i to j.

**Transition:** Try every split point k:
```
dp[i][j] = optimize over k in [i, j-1]:
    combine(dp[i][k], dp[k+1][j], merge_cost(i, k, j))
```

**Loop order:** Process by increasing interval length (length 1 first, then 2, ..., up to n).

#### Interval DP Template

```java
int intervalDp(int[] arr) {
    int n = arr.length;
    int[][] dp = new int[n][n];

    // Base case: intervals of length 1
    for (int i = 0; i < n; i++) {
        dp[i][i] = baseValue(arr, i);
    }

    // Fill by increasing length
    int INF = Integer.MAX_VALUE / 2;
    for (int length = 2; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            dp[i][j] = INF;  // or Integer.MIN_VALUE for maximization
            for (int k = i; k < j; k++) {
                dp[i][j] = Math.min(
                    dp[i][j],
                    dp[i][k] + dp[k + 1][j] + mergeCost(arr, i, k, j)
                );
            }
        }
    }
    return dp[0][n - 1];
}
```

**Time:** O(n³). **Space:** O(n²).

<AlgoViz
  title="Interval DP — Stone Merge (Minimum Cost)"
  description="Merge piles [3,4,2,5] into one. Cost of each merge = sum of merged pile. dp[i][j] = min cost to merge piles i..j."
  steps={[
    {
      array: [3, 4, 2, 5],
      labels: {"0": "pile 0", "1": "pile 1", "2": "pile 2", "3": "pile 3"},
      variables: {n: 4, total_sum: 14, goal: "Minimize total merge cost"},
      explanation: "4 stone piles [3,4,2,5]. Merge adjacent piles; cost = sum of resulting pile. dp[i][j] = min cost to merge piles[i..j] into one.",
      code: "dp[i][i] = 0;  // single pile, no merge needed"
    },
    {
      array: [7, 6, 7],
      highlights: [0, 1, 2],
      labels: {"0": "dp[0][1]=7", "1": "dp[1][2]=6", "2": "dp[2][3]=7"},
      variables: {length: 2, "dp[0][1]": "3+4=7", "dp[1][2]": "4+2=6", "dp[2][3]": "2+5=7"},
      explanation: "Length 2: merge each adjacent pair. dp[0][1]=3+4=7, dp[1][2]=4+2=6, dp[2][3]=2+5=7. Only one split point each.",
      code: "dp[i][j] = dp[i][i] + dp[i+1][j] + w(i,j)"
    },
    {
      array: [15, 16],
      highlights: [0],
      secondary: [1],
      labels: {"0": "k=0: 0+6+9", "1": "k=1: 7+0+9"},
      variables: {"dp[0][2]": "min(15, 16) = 15", "w(0,2)": 9},
      explanation: "dp[0][2]: try k=0 -> dp[0][0]+dp[1][2]+9=0+6+9=15, k=1 -> dp[0][1]+dp[2][2]+9=7+0+9=16. Best: k=0, cost=15.",
      code: "dp[0][2] = min(0+6+9, 7+0+9) = 15"
    },
    {
      array: [18, 17],
      highlights: [1],
      secondary: [0],
      labels: {"0": "k=1: 0+7+11", "1": "k=2: 6+0+11"},
      variables: {"dp[1][3]": "min(18, 17) = 17", "w(1,3)": 11},
      explanation: "dp[1][3]: k=1 -> 0+7+11=18, k=2 -> 6+0+11=17. Best: k=2 (merge {4,2} first, then with 5). Cost=17.",
      code: "dp[1][3] = min(0+7+11, 6+0+11) = 17"
    },
    {
      array: [31, 28, 29],
      highlights: [1],
      labels: {"0": "k=0", "1": "k=1", "2": "k=2"},
      variables: {"k=0": "0+17+14=31", "k=1": "7+7+14=28", "k=2": "15+0+14=29"},
      explanation: "dp[0][3]: k=0 -> 31, k=1 -> 28, k=2 -> 29. Best: k=1 with cost 28. Split: merge {3,4}=7 and {2,5}=7, then 7+7=14.",
      code: "dp[0][3] = min(31, 28, 29) = 28"
    },
    {
      array: [3, 4, 2, 5],
      highlights: [0, 1],
      secondary: [2, 3],
      variables: {answer: 28, merge_order: "1: {3,4}->7 (cost 7), 2: {2,5}->7 (cost 7), 3: {7,7}->14 (cost 14)", total: "7+7+14=28"},
      explanation: "Answer: 28. Optimal order: merge {3,4}->7 (cost 7), merge {2,5}->7 (cost 7), merge {7,7}->14 (cost 14). Total: 28.",
      code: "return dp[0][n-1];  // 28"
    }
  ]}
/>

<AlgoViz
  title="Interval DP — Burst Balloons (Last Balloon Chosen)"
  description="nums=[3,1,5]. Padded: [1,3,1,5,1]. dp[i][j] = max coins from bursting all balloons in open interval (i,j). Key: decide which balloon to burst LAST."
  steps={[
    {
      array: [1, 3, 1, 5, 1],
      labels: {"0": "pad", "1": "3", "2": "1", "3": "5", "4": "pad"},
      variables: {original: "[3,1,5]", padded: "[1,3,1,5,1]"},
      explanation: "Original: [3,1,5]. Pad with 1s: a=[1,3,1,5,1]. dp[i][j] = max coins from bursting all in open interval (i,j). Base: dp[i][i+1]=0 (no balloons between adjacent).",
      code: "// dp[i][j]: burst all in (i,j), think LAST"
    },
    {
      array: [1, 3, 1, 5, 1],
      highlights: [1],
      variables: {"dp[0][2]": "k=1: a[0]*a[1]*a[2] = 1*3*1 = 3", interval: "(0,2)"},
      explanation: "Length 3, dp[0][2]: only k=1. Burst balloon 1 (val 3) LAST in (0,2). Neighbors are a[0]=1 and a[2]=1. Coins: 1*3*1 = 3.",
      code: "dp[0][2] = 1*3*1 = 3"
    },
    {
      array: [1, 3, 1, 5, 1],
      highlights: [2],
      variables: {"dp[1][3]": "k=2: 3*1*5 = 15", "dp[2][4]": "k=3: 1*5*1 = 5"},
      explanation: "dp[1][3]: k=2, burst balloon 2 last. 3*1*5=15. dp[2][4]: k=3, burst balloon 3 last. 1*5*1=5. All length-3 intervals done.",
      code: "dp[1][3] = 15; dp[2][4] = 5;"
    },
    {
      array: [1, 3, 1, 5, 1],
      highlights: [1, 2],
      variables: {"dp[0][3]_k=1": "dp[0][1]+dp[1][3]+1*3*5 = 0+15+15 = 30", "dp[0][3]_k=2": "dp[0][2]+dp[2][3]+1*1*5 = 3+0+5 = 8"},
      explanation: "dp[0][3]: k=1 → 0+15+15=30 (burst 3 last, its neighbors are pad-1 and 5). k=2 → 3+0+5=8. Best: k=1, dp[0][3]=30.",
      code: "dp[0][3] = max(30, 8) = 30"
    },
    {
      array: [1, 3, 1, 5, 1],
      highlights: [2, 3],
      variables: {"dp[1][4]_k=2": "0+5+3*1*1 = 8", "dp[1][4]_k=3": "15+0+3*5*1 = 30"},
      explanation: "dp[1][4]: k=2 → 0+5+3=8. k=3 → 15+0+15=30. Best: k=3, dp[1][4]=30.",
      code: "dp[1][4] = max(8, 30) = 30"
    },
    {
      array: [1, 3, 1, 5, 1],
      highlights: [1, 2, 3],
      variables: {"k=1": "0+30+1*3*1=33", "k=2": "3+5+1*1*1=9", "k=3": "30+0+1*5*1=35"},
      explanation: "dp[0][4]: k=1→33, k=2→9, k=3→35. Best: k=3, burst balloon 3 (val 5) LAST. dp[0][4]=35.",
      code: "dp[0][4] = max(33, 9, 35) = 35"
    },
    {
      array: [3, 1, 5],
      highlights: [0, 1, 2],
      variables: {answer: 35, order: "Burst 1(3*1*5=15), then 3(1*3*1=3... wait)", insight: "DP gives optimal VALUE; order recoverable via backtracking"},
      explanation: "Answer: 35. The 'last balloon' perspective avoids tracking changing neighbors. Verify: burst val-1 first (3*1*5=15), burst val-3 (1*3*1=3), burst val-5 (1*5*1=5). 15+15+5=35 ✓.",
      code: "return dp[0][n+1];  // 35"
    }
  ]}
/>

---

### 4. Matrix Chain Multiplication (Classic Interval DP)

**Problem:** Given dimensions `[p0, p1, ..., pn]` representing matrices M0 (p0×p1), M1 (p1×p2), ..., Mn-1 (pn-1×pn), find the minimum number of scalar multiplications to compute the product.

```java
int matrixChain(int[] dims) {
    int n = dims.length - 1;  // number of matrices
    int[][] dp = new int[n][n];
    int INF = Integer.MAX_VALUE / 2;

    for (int length = 2; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            dp[i][j] = INF;
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
  description="Finds optimal parenthesization for dims = [10, 30, 5, 60]. Three matrices: A(10×30), B(30×5), C(5×60)."
  steps={[
    {
      array: [10, 30, 5, 60],
      labels: {"0": "p0", "1": "p1", "2": "p2", "3": "p3"},
      variables: {n: 3, matrices: "A(10×30), B(30×5), C(5×60)"},
      explanation: "Dimensions array [10,30,5,60] defines 3 matrices. Goal: minimize total scalar multiplications.",
      code: "int n = dims.length - 1;  // 3 matrices"
    },
    {
      array: [0, 0, 0],
      labels: {"0": "dp[0][0]", "1": "dp[1][1]", "2": "dp[2][2]"},
      highlights: [0, 1, 2],
      variables: {phase: "Base cases", "length": 1},
      explanation: "Base case: single matrices cost 0 to 'multiply'. dp[0][0] = dp[1][1] = dp[2][2] = 0.",
      code: "// length 1: dp[i][i] = 0"
    },
    {
      array: [1500, 9000],
      labels: {"0": "dp[0][1]", "1": "dp[1][2]"},
      highlights: [0],
      variables: {"dp[0][1]": "10×30×5 = 1500", "dp[1][2]": "30×5×60 = 9000", "length": 2},
      explanation: "Length 2: dp[0][1] = 10·30·5 = 1500 (A·B). dp[1][2] = 30·5·60 = 9000 (B·C).",
      code: "dp[0][1] = dims[0]*dims[1]*dims[2] = 1500"
    },
    {
      array: [1500, 9000],
      labels: {"0": "dp[0][1]", "1": "dp[1][2]"},
      secondary: [1],
      variables: {"dp[1][2]": 9000, cost: "30 × 5 × 60 = 9000"},
      explanation: "dp[1][2]: k=1, cost = dp[1][1] + dp[2][2] + 30·5·60 = 0 + 0 + 9000 = 9000.",
      code: "dp[1][2] = 0 + 0 + dims[1]*dims[2]*dims[3] = 9000"
    },
    {
      array: [27000, 4500],
      labels: {"0": "k=0: A(BC)", "1": "k=1: (AB)C"},
      secondary: [0],
      highlights: [1],
      variables: {"dp[0][2]_k0": "0 + 9000 + 10·30·60 = 27000", "dp[0][2]_k1": "1500 + 0 + 10·5·60 = 4500"},
      explanation: "Length 3, dp[0][2]: Try k=0: 0+9000+18000=27000 (A·(BC)). Try k=1: 1500+0+3000=4500 ((AB)·C).",
      code: "dp[0][2] = min(27000, 4500) = 4500"
    },
    {
      array: [0, 1500, 4500],
      labels: {"0": "dp[0][0]", "1": "dp[0][1]", "2": "dp[0][2]"},
      highlights: [2],
      variables: {answer: 4500, optimal: "(AB)C", "cost_breakdown": "AB=1500, then ×C=3000"},
      explanation: "Answer: dp[0][2] = 4500. Optimal parenthesization: (A·B)·C. First multiply AB (1500 ops), then result×C (3000 ops).",
      code: "return dp[0][n-1];  // 4500"
    }
  ]}
/>

---

### 5. Digit DP

**Why this technique exists.** Counting numbers with specific digit properties in a range like [1, 10^18] is impossible by brute force. Digit DP exploits the fact that numbers are built digit-by-digit, and the constraints are usually functions of the digits seen so far (sum, set of digits used, last digit). By processing digits from most significant to least, we can enumerate all valid numbers without materializing them, using memoization to avoid redundant work.

**The intuition.** Imagine filling in a number one digit at a time, left to right. At each position, you have a choice of digits 0-9 -- but if you are still "tight" (matching the upper bound N digit-by-digit), your choice is capped. Once you choose a digit strictly less than N's digit at any position, all remaining positions are unrestricted. The `tight` flag tracks this constraint. The `started` flag handles leading zeros (the number "007" is just "7").

**Interview signals.** Look for: (1) "count numbers in [L, R] with property X," (2) "how many numbers up to N have no repeated digits," (3) "digit sum equals S," (4) very large bounds (N up to 10^18) that rule out iterating through all numbers.

**Common misconception.** Students often think digit DP is about individual digits in isolation. It is actually about the *prefix* of digits chosen so far. The state encodes everything about the prefix that matters for future decisions (e.g., digit sum so far, set of digits used, whether a particular digit has appeared).

Digit DP counts numbers in a range `[0, N]` (or `[L, R]`) that satisfy some digit-based property (e.g., "digits sum to S", "no repeated digits", "contains digit 4").

**State:** `dp[pos][tight][...extra state]`
- `pos`: current digit position (most significant to least)
- `tight`: are we still bounded by N's digits? (1 = yes, limited to digit ≤ N[pos]; 0 = no, any digit 0–9)
- Extra state: problem-specific (digit sum, last digit, set of used digits, etc.)

**Template with memoization:**

```java
import java.util.*;

int countUpTo(int N) {
    char[] chars = String.valueOf(N).toCharArray();
    int n = chars.length;
    int[] digits = new int[n];
    for (int i = 0; i < n; i++) digits[i] = chars[i] - '0';

    // memo[pos][tight][state][started]
    Map<Long, Integer> memo = new HashMap<>();

    return solve(digits, 0, true, 0 /* initialState */, false, memo);
}

int solve(int[] digits, int pos, boolean tight, int state,
          boolean started, Map<Long, Integer> memo) {
    if (pos == digits.length) {
        return started ? 1 : 0;  // valid number found
    }

    long key = ((long) pos << 20) | ((tight ? 1L : 0L) << 19)
             | ((long) state << 1) | (started ? 1L : 0L);
    if (memo.containsKey(key)) return memo.get(key);

    int limit = tight ? digits[pos] : 9;
    int result = 0;

    for (int d = 0; d <= limit; d++) {
        boolean newTight = tight && (d == limit);
        boolean newStarted = started || (d > 0);

        if (!newStarted) {
            result += solve(digits, pos + 1, newTight, state, false, memo);
        } else {
            int newState = updateState(state, d);
            if (isValid(newState)) {
                result += solve(digits, pos + 1, newTight, newState, true, memo);
            }
        }
    }

    memo.put(key, result);
    return result;
}

int countInRange(int L, int R) {
    return countUpTo(R) - countUpTo(L - 1);
}
```

<AlgoViz
  title="Digit DP — Count Numbers ≤ 25 With No Repeated Digits"
  description="Counts how many numbers from 1 to 25 have all unique digits. N=25, digits=[2,5]."
  steps={[
    {
      array: [2, 5],
      labels: {"0": "d[0]=2", "1": "d[1]=5"},
      variables: {N: 25, digits: "[2, 5]", goal: "Count numbers 1..25 with all unique digits"},
      explanation: "N = 25. Digits array = [2, 5]. We process digit by digit, left to right, tracking tight constraint and used digits.",
      code: "int[] digits = {2, 5};  // N = 25"
    },
    {
      array: [2, 5],
      highlights: [0],
      variables: {pos: 0, tight: true, used: "{}", started: false, limit: "d[0]=2"},
      explanation: "Position 0: tight=true so first digit can be 0,1,2. If we pick 0 → not started yet (leading zero). Pick 1 or 2 → started.",
      code: "int limit = tight ? digits[pos] : 9;  // 2"
    },
    {
      array: [2, 5],
      highlights: [0],
      variables: {pos: 0, d: 0, tight: false, started: false, branch: "1-digit numbers coming"},
      explanation: "d=0 at pos 0: not started. Move to pos 1 with tight=false (0 < 2). This branch counts single-digit numbers 1-9.",
      code: "// d=0: skip leading zero, recurse to pos 1"
    },
    {
      array: [2, 5],
      highlights: [0],
      variables: {pos: 0, d: 1, tight: false, used: "{1}", started: true, branch: "numbers 10-19"},
      explanation: "d=1 at pos 0: started=true, tight=false (1 < 2). Next position can use any digit 0-9 except 1. This gives 10-19 with unique digits.",
      code: "// d=1: tight becomes false, used={1}"
    },
    {
      array: [2, 5],
      highlights: [0],
      variables: {pos: 0, d: 2, tight: true, used: "{2}", started: true, branch: "numbers 20-25"},
      explanation: "d=2 at pos 0: started=true, tight=true (2 == limit). Next digit limited to 0-5. This gives numbers 20-25 with unique digits.",
      code: "// d=2: tight stays true, used={2}"
    },
    {
      array: [2, 5],
      highlights: [1],
      variables: {pos: 1, tight: true, used: "{2}", limit: 5, valid_choices: "0,1,3,4,5 (not 2)"},
      explanation: "For branch d=2, pos 1: tight=true, limit=5. Can pick 0,1,3,4,5 (digit 2 already used). Each gives a valid 2-digit number.",
      code: "// 5 valid choices: 20,21,23,24,25"
    },
    {
      array: [2, 5],
      highlights: [1],
      variables: {single_digit: "9 numbers (1-9)", "prefix_1x": "9 numbers", "prefix_2x": "5 numbers", total: 23},
      explanation: "Totals: 9 single-digit (1-9, all unique), 9 with prefix 1 (10-19 minus 11=8? No: 10,12-19=9), 5 with prefix 2 (20,21,23,24,25). Total: 9+9+5=23.",
      code: "return countUpTo(25);  // 23"
    },
    {
      array: [2, 5],
      variables: {answer: 23, "non_unique ≤ 25": "11, 22 → 2 numbers", verification: "25 - 2 = 23"},
      explanation: "Verification: numbers 1-25 with repeated digits are only 11 and 22. So 25 - 2 = 23 unique-digit numbers. Correct!",
      code: "// 25 total - 2 with repeats (11, 22) = 23 ✓"
    }
  ]}
/>

**Key details:**
- `started` flag handles leading zeros (e.g., "007" is really "7").
- `tight` propagation: once we choose a digit strictly less than N's digit, all subsequent digits are unrestricted.
- For range `[L, R]`: compute `count_up_to(R) - count_up_to(L - 1)`.

<AlgoViz
  title="Digit DP — Count Numbers <= 23 with Digit Sum <= 4"
  description="Counts numbers from 1 to 23 whose digit sum is at most 4. N=23, digits=[2,3]. State: (pos, tight, sumSoFar, started)."
  steps={[
    {
      array: [2, 3],
      labels: {"0": "d[0]=2", "1": "d[1]=3"},
      variables: {N: 23, constraint: "digit_sum <= 4", digits: "[2, 3]"},
      explanation: "N=23, digits=[2,3]. Count numbers 1..23 with digit sum <= 4. Process digits left to right, tracking (pos, tight, sumSoFar, started).",
      code: "solve(digits, 0, true, 0, false)"
    },
    {
      array: [2, 3],
      highlights: [0],
      variables: {pos: 0, tight: true, limit: 2, branches: "d=0 (skip), d=1, d=2"},
      explanation: "Position 0 (tens digit): tight=true so digit <= 2. Three branches: d=0 (leading zero, gives single-digit numbers), d=1 (numbers 10-19), d=2 (numbers 20-25).",
      code: "int limit = tight ? digits[0] : 9;  // 2"
    },
    {
      array: [2, 3],
      highlights: [1],
      variables: {pos: 0, d: 0, tight: false, started: false, branch: "single-digit numbers"},
      explanation: "d=0 at pos 0: not started (leading zero), tight becomes false. Recurse to pos 1 with full range 0-9. This branch counts single-digit numbers 1-9.",
      code: "// d=0: leading zero, recurse to ones digit"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [0, 1, 2, 3],
      labels: {"0": "1", "1": "2", "2": "3", "3": "4"},
      variables: {branch: "d=0 path", count: 4, valid: "1, 2, 3, 4", rejected: "5-9 (sum > 4)"},
      explanation: "From d=0 path: pos 1 with no tight, digits 1-9 tried. Sum <= 4 allows only digits 1,2,3,4. Count = 4 single-digit numbers.",
      code: "// digits 1-4 valid (sum<=4), 5-9 rejected"
    },
    {
      array: [10, 11, 12, 13],
      highlights: [0, 1, 2, 3],
      variables: {branch: "d=1 path", tight: false, sumSoFar: 1, count: 4},
      explanation: "d=1 at pos 0: sum=1, tight=false. At pos 1, try 0-9. Sum constraint: 1+d <= 4, so d <= 3. Valid numbers: 10, 11, 12, 13. Count = 4.",
      code: "// d=1: sum=1, ones digit 0-3 are valid"
    },
    {
      array: [20, 21, 22],
      highlights: [0, 1, 2],
      variables: {branch: "d=2 path", tight: true, sumSoFar: 2, pos1_limit: 3, count: 3},
      explanation: "d=2 at pos 0: sum=2, tight=true (limit 3 at pos 1). Sum constraint: 2+d <= 4 means d <= 2. Tight: d <= 3. Valid: 20, 21, 22. Number 23 has sum 5 — rejected!",
      code: "// d=2: tight, ones 0-2 valid (23 has sum 5!)"
    },
    {
      array: [4, 4, 3],
      highlights: [0, 1, 2],
      labels: {"0": "1-digit: 4", "1": "10-19: 4", "2": "20-23: 3"},
      variables: {total: "4 + 4 + 3 = 11", answer: 11, verification: "25 - 14 non-valid = 11"},
      explanation: "Total: 4 (single-digit) + 4 (teens) + 3 (twenties) = 11. Numbers: {1,2,3,4,10,11,12,13,20,21,22}. Digit DP avoids checking all 23 numbers individually.",
      code: "return 11;  // countUpTo(23) with sum <= 4"
    }
  ]}
/>

<AlgoViz
  title="Digit DP — Count Numbers ≤ 15 With Even Digit Sum"
  description="Counts numbers from 1 to 15 with even digit sum. N=15, digits=[1,5]. State tracks (pos, tight, parity, started)."
  steps={[
    {
      array: [1, 5],
      labels: {"0": "d[0]=1", "1": "d[1]=5"},
      variables: {N: 15, constraint: "digit_sum % 2 == 0", digits: "[1, 5]"},
      explanation: "N=15, digits=[1,5]. Count numbers 1..15 with even digit sum. Parity (even/odd) is the only state needed — saves space vs tracking exact sum.",
      code: "// state = (pos, tight, parity, started)"
    },
    {
      array: [1, 5],
      highlights: [0],
      variables: {pos: 0, tight: true, limit: 1, branches: "d=0 (leading zero), d=1"},
      explanation: "Position 0 (tens digit): tight=true, limit=1. d=0 → not started (single-digit branch). d=1 → tens digit is 1, parity becomes odd.",
      code: "int limit = tight ? digits[0] : 9;  // 1"
    },
    {
      array: [2, 4, 6, 8],
      highlights: [0, 1, 2, 3],
      variables: {branch: "d=0 path (single-digit numbers)", valid: "2, 4, 6, 8", count: 4},
      explanation: "d=0 branch: single-digit numbers 1-9. Even digit sum means the digit itself is even: {2, 4, 6, 8}. Count = 4.",
      code: "// single digits with even sum: 2,4,6,8"
    },
    {
      array: [1, 5],
      highlights: [0],
      variables: {branch: "d=1 (tens=1)", parity: "odd", pos: 1, tight: true, limit: 5},
      explanation: "d=1 branch: tens digit is 1, parity=odd. Need ones digit to make total even → ones digit must be odd. At pos 1: tight=true, limit=5.",
      code: "// tens=1 (odd), need odd ones digit"
    },
    {
      array: [11, 13, 15],
      highlights: [0, 1, 2],
      variables: {valid_ones: "1, 3, 5", numbers: "11(2✓), 13(4✓), 15(6✓)", count: 3},
      explanation: "Odd ones digits within limit 5: {1,3,5}. Numbers: 11(sum=2✓), 13(sum=4✓), 15(sum=6✓). Count = 3.",
      code: "// 11,13,15: all have even digit sums"
    },
    {
      array: [4, 3],
      labels: {"0": "1-digit: 4", "1": "2-digit: 3"},
      highlights: [0, 1],
      variables: {total: "4 + 3 = 7", answer: 7, all: "{2,4,6,8,11,13,15}"},
      explanation: "Total: 4 (single-digit) + 3 (two-digit) = 7 numbers with even digit sum. Using parity as state (2 values) instead of exact sum keeps the state space tiny.",
      code: "return 7;  // countUpTo(15) with even digit sum"
    }
  ]}
/>

---

## Worked Example: Matrix Chain Multiplication

**Input:** Dimensions = [10, 30, 5, 60] → three matrices: A (10×30), B (30×5), C (5×60).

**Goal:** Minimize scalar multiplications.

**Options:**
- **(AB)C:** Cost(AB) = 10·30·5 = 1500, then (AB)·C = 10·5·60 = 3000. Total = **4500**.
- **A(BC):** Cost(BC) = 30·5·60 = 9000, then A·(BC) = 10·30·60 = 18000. Total = **27000**.

**DP trace:**

```
dims = [10, 30, 5, 60], n = 3 matrices (indices 0, 1, 2)

Base cases (length 1):
  dp[0][0] = 0  (matrix A alone)
  dp[1][1] = 0  (matrix B alone)
  dp[2][2] = 0  (matrix C alone)

Length 2:
  dp[0][1]: k=0 → dp[0][0] + dp[1][1] + 10*30*5 = 0 + 0 + 1500 = 1500
  dp[1][2]: k=1 → dp[1][1] + dp[2][2] + 30*5*60 = 0 + 0 + 9000 = 9000

Length 3:
  dp[0][2]:
    k=0 → dp[0][0] + dp[1][2] + 10*30*60 = 0 + 9000 + 18000 = 27000
    k=1 → dp[0][1] + dp[2][2] + 10*5*60  = 1500 + 0 + 3000  = 4500

  dp[0][2] = min(27000, 4500) = 4500

Answer: 4500 — optimal parenthesization is (AB)C
```

---

## Pattern Recognition Guide

| Pattern | Example Problem | DP Family |
|---|---|---|
| "Optimal value for subtree" | House Robber III | Tree DP |
| "Answer for every node as root" | Sum of Distances in Tree | Tree DP + Rerooting |
| "Place cameras/guards on tree" | Binary Tree Cameras | Tree DP with 3 states |
| "Merge segments optimally" | Burst Balloons | Interval DP |
| "Minimum cost to partition array" | Minimum Cost to Merge Stones | Interval DP |
| "Triangulate polygon" | Minimum Score Triangulation | Interval DP |
| "Remove elements, score depends on neighbors" | Remove Boxes | Interval DP with extra state |
| "Count numbers in [L, R] with digit property" | Count Special Integers | Digit DP |
| "How many numbers ≤ N have property X" | Numbers At Most N Given Digit Set | Digit DP |
| "Count digit occurrences in range" | Number of Digit One | Digit DP |

---

## Problem Set (21 Problems)

### Tree DP (7 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 1 | House Robber III | Medium | `dp[node][rob/skip]` classic tree DP | [LC 337](https://leetcode.com/problems/house-robber-iii/) |
| 2 | Sum of Distances in Tree | Hard | Rerooting technique | [LC 834](https://leetcode.com/problems/sum-of-distances-in-tree/) |
| 3 | Binary Tree Cameras | Hard | 3-state tree DP (covered/camera/uncovered) | [LC 968](https://leetcode.com/problems/binary-tree-cameras/) |
| 4 | Longest ZigZag Path in a Binary Tree | Medium | Track direction + length per node | [LC 1372](https://leetcode.com/problems/longest-zigzag-path-in-a-binary-tree/) |
| 5 | Longest Path With Different Adjacent Characters | Hard | Tree DP, two longest child paths | [LC 2246](https://leetcode.com/problems/longest-path-with-different-adjacent-characters/) |
| 6 | Count Number of Possible Root Nodes | Hard | Rerooting with correct-guess tracking | [LC 2581](https://leetcode.com/problems/count-number-of-possible-root-nodes/) |
| 7 | Unique Binary Search Trees | Medium | Tree DP / Catalan numbers | [LC 96](https://leetcode.com/problems/unique-binary-search-trees/) |

### Interval DP (7 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 8 | Burst Balloons | Hard | Insert virtual balloons, `dp[i][j]` = max coins | [LC 312](https://leetcode.com/problems/burst-balloons/) |
| 9 | Minimum Score Triangulation of Polygon | Medium | Triangulate polygon, split at vertex | [LC 1039](https://leetcode.com/problems/minimum-score-triangulation-of-polygon/) |
| 10 | Remove Boxes | Hard | `dp[i][j][k]` with attached same-color count | [LC 546](https://leetcode.com/problems/remove-boxes/) |
| 11 | Strange Printer | Hard | `dp[i][j]` = min turns to print substring | [LC 664](https://leetcode.com/problems/strange-printer/) |
| 12 | Minimum Cost to Merge Stones | Hard | Interval DP with k-way merge constraint | [LC 1000](https://leetcode.com/problems/minimum-cost-to-merge-stones/) |
| 13 | Unique Binary Search Trees II | Medium | Interval DP building all BST structures | [LC 95](https://leetcode.com/problems/unique-binary-search-trees-ii/) |
| 14 | Number of Ways to Separate Numbers | Hard | Interval DP with digit comparison | [LC 1977](https://leetcode.com/problems/number-of-ways-to-separate-numbers/) |

### Digit DP (7 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 15 | Number of Digit One | Hard | Count '1' appearances in each position | [LC 233](https://leetcode.com/problems/number-of-digit-one/) |
| 16 | Count Numbers with Unique Digits | Medium | `dp[pos][used_mask]` or combinatorial | [LC 357](https://leetcode.com/problems/count-numbers-with-unique-digits/) |
| 17 | Numbers At Most N Given Digit Set | Hard | Digit DP with restricted digit set | [LC 902](https://leetcode.com/problems/numbers-at-most-n-given-digit-set/) |
| 18 | Digit Count in Range | Hard | Generalize digit-one to any digit d | [LC 1067](https://leetcode.com/problems/digit-count-in-range/) |
| 19 | Count Special Integers | Hard | `dp[pos][tight][used_digits_mask]` | [LC 2376](https://leetcode.com/problems/count-special-integers/) |
| 20 | Count of Integers | Hard | Digit DP with digit-sum constraint | [LC 2719](https://leetcode.com/problems/count-of-integers/) |
| 21 | Distribute Repeating Integers | Hard | Bitmask + digit-like subset DP | [LC 1655](https://leetcode.com/problems/distribute-repeating-integers/) |

---

## Mock Interview

### Problem 1: Burst Balloons (LC 312) — 25 minutes

**Interviewer:** "You have n balloons with values. Bursting balloon i gives `nums[left] * nums[i] * nums[right]`. Find the maximum coins."

**Candidate approach:**

1. **Clarify:** After bursting, neighbors become adjacent. Add virtual balloons with value 1 at both ends: `[1] + nums + [1]`.
2. **Key insight:** Instead of thinking "which balloon to burst first," think "which balloon to burst **last** in interval `[i, j]`." If k is the last balloon burst in `(i, j)`, then when we burst it, the left boundary is `i` and right boundary is `j` (since everything in between is already gone).
3. **Recurrence:** `dp[i][j]` = max coins obtainable by bursting all balloons in the open interval `(i, j)`.
   ```
   dp[i][j] = max over k in (i+1, ..., j-1):
       dp[i][k] + dp[k][j] + nums[i] * nums[k] * nums[j]
   ```
4. **Base case:** `dp[i][i+1] = 0` (no balloons between adjacent indices).
5. **Loop order:** Increasing interval length.

```java
int maxCoins(int[] nums) {
    int[] a = new int[nums.length + 2];
    a[0] = 1;
    a[a.length - 1] = 1;
    for (int i = 0; i < nums.length; i++) a[i + 1] = nums[i];
    int n = a.length;
    int[][] dp = new int[n][n];

    for (int length = 3; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            for (int k = i + 1; k < j; k++) {
                dp[i][j] = Math.max(
                    dp[i][j],
                    dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]
                );
            }
        }
    }
    return dp[0][n - 1];
}
```

**Time:** O(n³). **Space:** O(n²).

**Follow-up 1:** "Can we optimize below O(n³)?"

> In general, no — interval DP with arbitrary split points requires O(n³). However, if the cost function satisfies the **quadrangle inequality**, Knuth-Yao optimization reduces it to O(n²). Burst Balloons' cost function does not satisfy this condition, so O(n³) is optimal for this problem.

**Follow-up 2:** "What if balloons have 2D positions and bursting gives area-based coins?"

> The interval DP structure breaks down because "neighbors" aren't linear. This would require geometric DP or potentially bitmask DP if n is small enough.

---

### Problem 2: Sum of Distances in Tree (LC 834) — 25 minutes

**Interviewer:** "Given a tree of n nodes, return an array where `answer[i]` is the sum of distances from node i to all other nodes."

**Candidate approach:**

1. **Naive O(n²):** BFS/DFS from each node. Too slow for n ≤ 3 × 10^4.
2. **Rerooting:** Compute answer for root 0, then derive answers for all other nodes in O(1) per node.
3. **Pass 1 (post-order):** Compute `count[v]` = subtree size, `ans[0]` = sum of distances from node 0.
4. **Pass 2 (pre-order):** For edge `(parent → child)`: `ans[child] = ans[parent] - count[child] + (n - count[child])`.
5. **Intuition:** Moving root from parent to child, the `count[child]` nodes in child's subtree get 1 closer, and the `n - count[child]` nodes outside get 1 farther.

**Time:** O(n). **Space:** O(n).

**Follow-up 1:** "How does rerooting generalize to other tree problems?"

> The pattern works whenever the answer for a node can be derived from its parent's answer in O(1). Examples: minimum/maximum distance sum, counting nodes within distance k (with preprocessing). The key requirement is that the "contribution" is decomposable — you can separate "subtree contribution" from "rest of tree contribution."

**Follow-up 2:** "What if edges are weighted?"

> Same approach. In pass 1, add edge weight when computing distances. In pass 2: `ans[child] = ans[parent] - weight * count[child] + weight * (n - count[child])` for the edge with given weight.

**Follow-up 3:** "What if we want the k-th closest node for each node?"

> Rerooting doesn't directly apply. Use centroid decomposition: for each centroid, compute distances to all nodes in the component. Merge using sorted lists. O(n log² n).

---

## Tips & Pitfalls

### Tree DP

- **Post-order vs. pre-order:** Post-order (children before parent) is for computing subtree-dependent values. Pre-order (parent before children) is for propagating root-dependent values downward. Rerooting needs both.
- **Recursion depth:** For n ≤ 10^5, deep recursion may cause a `StackOverflowError`. Convert to iterative DFS with an explicit stack, or increase the stack size by running in a new `Thread` with a larger stack.
- **Rooting an unrooted tree:** Pick any node as root (usually node 0). Skip parent edges during DFS: `if child == parent: continue`.
- **Multiple children aggregation:** Be careful about whether order matters. For problems like "two longest paths through a node," maintain the top-2 values from children.

### Interval DP

- **Loop ordering is critical:** Always iterate by increasing interval length. The outer loop is `length`, inner loops are `i` (start) and `k` (split point).
- **Virtual elements:** Many problems require padding (Burst Balloons adds 1s at ends, Matrix Chain uses dimension array of length n+1).
- **Interval DP vs. other DP:** If the subproblems aren't contiguous intervals, interval DP doesn't apply. Check whether the problem truly has "merge two adjacent results" structure.
- **O(n³) is the baseline.** For n ≤ 500, O(n³) is fine. For n > 500, look for Knuth-Yao optimization (if applicable) or a different formulation entirely.

### Digit DP

- **Leading zeros:** The number 007 is just 7. Use a `started` flag to track whether we've placed a nonzero digit yet. Don't update problem-specific state until started is True.
- **`tight` parameter:** This is the most confusing part. `tight = True` means all digits so far match N's prefix, so the next digit is limited to `[0, N[pos]]`. Once you pick a digit strictly less than N[pos], tight becomes False and remains False for all subsequent positions.
- **Range queries:** `count(L, R) = count_up_to(R) - count_up_to(L - 1)`. Make sure `count_up_to` includes the bound itself.
- **State explosion:** Digit DP states can grow large (e.g., `10 positions * 2 tight * 1024 used_digits_mask = 20,480`). Keep state minimal. Use a `HashMap` or a multi-dimensional array for memoization.
- **Testing:** Verify your digit DP against brute force for small N (e.g., N ≤ 100). Off-by-one errors in tight/started logic are extremely common.
