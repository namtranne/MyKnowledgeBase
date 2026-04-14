---
sidebar_position: 6
title: "Week 5: Topological Sort + DAG DP"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 5: Topological Sort + DAG DP

## Theory & Concepts

### What is Topological Ordering?

A **topological ordering** of a directed graph is a linear ordering of its vertices such that for every directed edge (u, v), vertex u comes before vertex v in the ordering. Think of it as "respecting all the arrows" — if there's a path from A to B, A must appear before B.

**Key facts:**
- A topological ordering exists **if and only if** the graph is a **DAG** (Directed Acyclic Graph)
- If the graph has a cycle, no valid ordering exists — you can't linearize a circle
- A DAG may have **multiple valid** topological orderings
- Every DAG has at least one vertex with in-degree 0 (a source) and at least one with out-degree 0 (a sink)

**Why this technique exists.** Whenever you have tasks with prerequisite relationships, you need an order that respects all dependencies. Without topological sort, you would need to repeatedly scan for "available" tasks (those with all prerequisites complete), which is O(V²) per full ordering. Kahn's algorithm or DFS-based topological sort computes the ordering in O(V + E), handling the dependency resolution in a single pass through the graph.

**The intuition — a real-world analogy.** Imagine you are getting dressed in the morning. You cannot put on shoes before socks, cannot put on a jacket before a shirt. Each garment has prerequisites. Topological sort gives you a valid dressing order: underwear, socks, pants, shirt, belt, jacket, shoes. The algorithm works by repeatedly picking an item with no outstanding prerequisites (underwear, socks, and shirt are all valid starting points), removing it, and updating what remains. If you ever reach a state where every remaining item has prerequisites that have not been met, there is a circular dependency — impossible to resolve.

**Interview signals.** Look for: "course prerequisites," "build order," "task scheduling with dependencies," "can all tasks be completed?", "detect cycle in directed graph," "alien dictionary" (derive ordering from sorted words), "parallel courses" (minimum semesters), or "longest path in a DAG." Any time the problem involves directed dependencies and asks for an ordering or feasibility, topological sort is the primary tool. If the problem further asks for the shortest/longest path or counting paths in a DAG, combine topological sort with DP.

**Common mistakes beginners make.** (1) Forgetting to check for cycles — if your topological sort processes fewer than n nodes, a cycle exists and the answer is "impossible." This is the most common bug. (2) Confusing edge direction: in course prerequisite problems, `[a, b]` usually means "b must come before a," so the edge is b to a, not a to b. Read the problem carefully. (3) Using DFS without proper three-color marking (WHITE/GRAY/BLACK) — a simple visited boolean cannot distinguish between "currently in the recursion stack" (cycle) and "already fully processed" (safe). (4) Stack overflow on deep chains when using recursive DFS; use iterative DFS or Kahn's BFS for safety.

### When Does Topological Sort Apply?

Any problem with **dependencies** — tasks that must happen before other tasks — is a topological sort candidate:
- University course prerequisites
- Build system compilation order
- Package dependency resolution
- Task scheduling with constraints

### Detecting Cycles

A directed graph has a cycle if and only if:
- **DFS approach:** You encounter a node currently on the recursion stack (a "back edge")
- **Kahn's approach:** After processing, fewer than n nodes were added to the result

<AlgoViz
  title="Cycle Detection in Directed Graph"
  description="Detect a cycle in 5 nodes with edges [0→1, 1→2, 2→3, 3→1, 0→4]. Nodes 1,2,3 form a cycle. Kahn's algorithm reveals it when not all nodes are processed."
  steps={[
    { array: [0,1,2,3,4], highlights: [], variables: { inDegree: "[0,2,1,1,1]", edges: "0→1, 1→2, 2→3, 3→1, 0→4" }, explanation: "Build in-degrees. Node 0 has in-degree 0. Nodes 1,2,3 form a cycle (1→2→3→1), so they always have incoming edges from each other.", code: "inDegree = [0, 2, 1, 1, 1];" },
    { array: [0,1,2,3,4], highlights: [0], variables: { inDegree: "[0,2,1,1,1]", queue: "[0]", order: "[]" }, explanation: "Seed queue with in-degree 0 nodes: only node 0.", code: "if (inDegree[0] == 0) queue.add(0);" },
    { array: [0,1,2,3,4], highlights: [0], secondary: [1,4], variables: { inDegree: "[0,1,1,1,0]", queue: "[4]", order: "[0]" }, explanation: "Process node 0: neighbors 1 and 4. in_degree[1]: 2→1, in_degree[4]: 1→0. Enqueue 4.", code: "order.add(0);\ninDegree[1]--; inDegree[4]--;\n// Only 4 reaches 0" },
    { array: [0,1,2,3,4], highlights: [4], variables: { inDegree: "[0,1,1,1,0]", queue: "[]", order: "[0,4]" }, explanation: "Process node 4: no outgoing edges. Queue is now empty.", code: "order.add(4);\n// No neighbors to decrement" },
    { array: [0,1,2,3,4], highlights: [], secondary: [1,2,3], variables: { orderSize: "2", n: "5", remaining: "&#123;1,2,3&#125;" }, explanation: "Queue empty! order.size()=2, but n=5. Only 2 of 5 nodes processed. Cycle detected!", code: "order.size() == 2 != 5\n// CYCLE EXISTS" },
    { array: [0,1,2,3,4], highlights: [1,2,3], variables: { cycle: "1→2→3→1", inDegree: "[0,1,1,1,0]" }, explanation: "Nodes 1,2,3 still have nonzero in-degree — they form the cycle 1→2→3→1. No valid topological ordering exists.", code: "return new int[0]; // cycle detected" },
    { array: [0,1,2,3,4], highlights: [], variables: { result: "empty array", hasCycle: "true" }, explanation: "Key rule: if Kahn's processes fewer than n nodes, a cycle exists in the remaining nodes. This is the standard cycle-detection check.", code: "// order.size() < n => cycle\n// This is the #1 bug to watch for!" },
  ]}
/>

### Algorithm 1: Kahn's BFS (In-degree Method)

The intuition is simple: repeatedly remove nodes with no incoming edges. If all nodes get removed, the graph is a DAG.

```java
import java.util.*;

// Kahn's algorithm — BFS-based topological sort.
// Returns the ordering, or empty array if a cycle exists.
public static int[] topologicalSortKahn(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());

    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        inDegree[e[1]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int v = 0; v < n; v++) {
        if (inDegree[v] == 0) queue.add(v);
    }

    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int nei : graph.get(node)) {
            if (--inDegree[nei] == 0) queue.add(nei);
        }
    }

    return order.size() == n
        ? order.stream().mapToInt(Integer::intValue).toArray()
        : new int[0]; // empty → cycle detected
}
```

### Algorithm 2: DFS-based (Reverse Post-order)

Run DFS, append a node to the result **after** all its descendants are visited, then reverse. Nodes in the recursion stack with state `VISITING` indicate a cycle.

```java
// DFS-based topological sort using three-color marking.
// Returns the ordering, or empty array if a cycle exists.
static final int WHITE = 0, GRAY = 1, BLACK = 2;

public static int[] topologicalSortDFS(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) graph.get(e[0]).add(e[1]);

    int[] color = new int[n];
    List<Integer> order = new ArrayList<>();
    boolean[] hasCycle = {false};

    for (int v = 0; v < n; v++) {
        if (color[v] == WHITE) dfs(v, graph, color, order, hasCycle);
    }

    if (hasCycle[0]) return new int[0];
    Collections.reverse(order);
    return order.stream().mapToInt(Integer::intValue).toArray();
}

private static void dfs(int u, List<List<Integer>> graph,
        int[] color, List<Integer> order, boolean[] hasCycle) {
    if (hasCycle[0]) return;
    color[u] = GRAY;
    for (int v : graph.get(u)) {
        if (color[v] == GRAY) { hasCycle[0] = true; return; }
        if (color[v] == WHITE) dfs(v, graph, color, order, hasCycle);
    }
    color[u] = BLACK;
    order.add(u);
}
```

<AlgoViz
  title="DFS-Based Topological Sort — Reverse Post-Order"
  description="Topologically sort 4 nodes with edges 0→1, 0→2, 1→3, 2→3 using DFS three-color marking (WHITE→GRAY→BLACK). Post-order is reversed at the end."
  steps={[
    { array: [0,1,2,3], highlights: [], variables: { color: "[W,W,W,W]", postOrder: "[]" }, explanation: "4 nodes, all WHITE. Edges: 0→1, 0→2, 1→3, 2→3. Start DFS from node 0.", code: "int[] color = new int[4]; // all WHITE\nList<Integer> order = new ArrayList<>();" },
    { array: [0,1,2,3], highlights: [0], variables: { color: "[G,W,W,W]", postOrder: "[]", stack: "DFS(0)" }, explanation: "DFS(0): color[0] = GRAY (entering). Visit first neighbor: node 1.", code: "color[0] = GRAY;\n// visit neighbor 1" },
    { array: [0,1,2,3], highlights: [0,1], variables: { color: "[G,G,W,W]", postOrder: "[]", stack: "DFS(0)→DFS(1)" }, explanation: "DFS(1): color[1] = GRAY. Visit neighbor: node 3.", code: "color[1] = GRAY;\n// visit neighbor 3" },
    { array: [0,1,2,3], highlights: [0,1,3], variables: { color: "[G,G,W,G]", postOrder: "[]", stack: "DFS(0)→DFS(1)→DFS(3)" }, explanation: "DFS(3): color[3] = GRAY. No unvisited neighbors (none at all). Mark BLACK, add to post-order.", code: "color[3] = GRAY;\n// no neighbors" },
    { array: [0,1,2,3], highlights: [0,1], secondary: [3], variables: { color: "[G,G,W,B]", postOrder: "[3]", stack: "DFS(0)→DFS(1)" }, explanation: "DFS(3) done: color[3] = BLACK. Push 3 to post-order. Return to DFS(1).", code: "color[3] = BLACK;\norder.add(3); // post-order: [3]" },
    { array: [0,1,2,3], highlights: [0], secondary: [1,3], variables: { color: "[G,B,W,B]", postOrder: "[3,1]", stack: "DFS(0)" }, explanation: "DFS(1) done: no more unvisited neighbors. color[1] = BLACK. Push 1. Return to DFS(0). Visit next neighbor: 2.", code: "color[1] = BLACK;\norder.add(1); // post-order: [3,1]" },
    { array: [0,1,2,3], highlights: [0,2], secondary: [1,3], variables: { color: "[G,B,G,B]", postOrder: "[3,1]", stack: "DFS(0)→DFS(2)" }, explanation: "DFS(2): color[2] = GRAY. Neighbor 3 is BLACK (already processed) — skip. No unvisited neighbors left.", code: "color[2] = GRAY;\n// neighbor 3 is BLACK, skip" },
    { array: [0,1,2,3], highlights: [0], secondary: [1,2,3], variables: { color: "[G,B,B,B]", postOrder: "[3,1,2]", stack: "DFS(0)" }, explanation: "DFS(2) done: color[2] = BLACK. Push 2. Return to DFS(0).", code: "color[2] = BLACK;\norder.add(2); // post-order: [3,1,2]" },
    { array: [0,1,2,3], highlights: [], secondary: [0,1,2,3], variables: { color: "[B,B,B,B]", postOrder: "[3,1,2,0]" }, explanation: "DFS(0) done: color[0] = BLACK. Push 0. Post-order complete: [3,1,2,0].", code: "color[0] = BLACK;\norder.add(0); // post-order: [3,1,2,0]" },
    { array: [0,1,2,3], highlights: [0,2,1,3], variables: { result: "[0,2,1,3]" }, explanation: "Reverse post-order → topological order: [0, 2, 1, 3]. Valid! 0 before 1,2 and both 1,2 before 3.", code: "Collections.reverse(order);\nreturn [0, 2, 1, 3];" },
  ]}
/>

### Complexity Analysis

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| Kahn's BFS | O(V + E) | O(V + E) | Iterative, easy to get lexicographic order with min-heap |
| DFS-based | O(V + E) | O(V + E) | Recursive, natural for DAG DP |
| Cycle detection | O(V + E) | O(V) | Built into both approaches |

### DAG DP: Dynamic Programming on DAGs

Once you have a topological order, you can compute DP along it — every node's value depends only on already-computed predecessors. This is one of the most powerful paradigms in graph algorithms.

#### Longest Path in a DAG

```java
// Find the longest path from any source in a weighted DAG.
// weights[u] = weight of node u.
public static int longestPathDAG(int n, int[][] edges, int[] weights) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        inDegree[e[1]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int v = 0; v < n; v++)
        if (inDegree[v] == 0) queue.add(v);

    int[] dist = new int[n];
    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int v : graph.get(u)) {
            dist[v] = Math.max(dist[v], dist[u] + weights[v]);
            if (--inDegree[v] == 0) queue.add(v);
        }
    }
    return Arrays.stream(dist).max().orElse(0);
}
```

#### Shortest Path in a DAG

```java
// Shortest path from src in a weighted DAG (handles negative weights).
public static int[] shortestPathDAG(int n, int[][] edgeWeights, int src) {
    List<List<int[]>> graph = new ArrayList<>();
    int[] inDegree = new int[n];
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edgeWeights) { // e = {u, v, w}
        graph.get(e[0]).add(new int[]{e[1], e[2]});
        inDegree[e[1]]++;
    }

    List<Integer> order = new ArrayList<>();
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int v = 0; v < n; v++)
        if (inDegree[v] == 0) queue.add(v);
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int[] edge : graph.get(u))
            if (--inDegree[edge[0]] == 0) queue.add(edge[0]);
    }

    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    for (int u : order) {
        if (dist[u] == Integer.MAX_VALUE) continue;
        for (int[] edge : graph.get(u))
            dist[edge[0]] = Math.min(dist[edge[0]], dist[u] + edge[1]);
    }
    return dist;
}
```

#### Counting Paths in a DAG

```java
// Count the number of distinct paths from src to dst in a DAG.
public static long countPathsDAG(int n, int[][] edges, int src, int dst) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        inDegree[e[1]]++;
    }

    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int v = 0; v < n; v++)
        if (inDegree[v] == 0) queue.add(v);
    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int v : graph.get(u))
            if (--inDegree[v] == 0) queue.add(v);
    }

    long[] paths = new long[n];
    paths[src] = 1;
    for (int u : order)
        for (int v : graph.get(u))
            paths[v] += paths[u];

    return paths[dst];
}
```

### Worked Example: Course Schedule II (LC 210)

**Problem:** There are `numCourses` courses labeled `0` to `n-1`. You are given prerequisites where `prerequisites[i] = [a, b]` means you must take course `b` before course `a`. Return a valid ordering of courses, or an empty array if impossible.

**Input:** `numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]`

**Visualization:**
```
0 → 1 → 3
 ↘ 2 ↗
```

**Trace using Kahn's algorithm:**
```
Build graph & in-degrees:
  graph: {0: [1,2], 1: [3], 2: [3]}
  in_degree: [0, 1, 1, 2]

Step 1: Queue sources (in_degree == 0): queue = [0]
Step 2: Pop 0, order = [0]
        Reduce neighbors: in_degree[1] = 0, in_degree[2] = 0
        Queue: [1, 2]
Step 3: Pop 1, order = [0, 1]
        Reduce neighbors: in_degree[3] = 1
        Queue: [2]
Step 4: Pop 2, order = [0, 1, 2]
        Reduce neighbors: in_degree[3] = 0
        Queue: [3]
Step 5: Pop 3, order = [0, 1, 2, 3]
        Queue: []

len(order) == numCourses → valid! Return [0, 1, 2, 3]
```

**Note:** `[0, 2, 1, 3]` is also valid — topological order is not unique.

**Why not brute force?** A naive approach would repeatedly scan all nodes for one with in-degree 0, remove it, and repeat — O(V) per scan, O(V²) total. Kahn's algorithm avoids re-scanning by maintaining a queue of ready nodes: when a node's in-degree drops to 0, it is immediately enqueued. This gives O(V + E) total, visiting each node and edge exactly once.

**Key insight:** The queue in Kahn's algorithm naturally provides BFS-layer information. Nodes at the same "layer" have no dependencies on each other and can execute in parallel. The number of layers equals the minimum number of parallel rounds (semesters, stages) needed to complete all tasks — this is the critical path length.

**Cycle example:** If we add edge `[0, 3]` (course 0 requires course 3), the algorithm would terminate with `order.size() &lt; numCourses`, returning an empty array.

<AlgoViz
  title="Kahn's Algorithm — BFS Topological Sort"
  description="Course Schedule II: 4 courses with prerequisites [[1,0],[2,0],[3,1],[3,2]]. Watch BFS process nodes by in-degree."
  steps={[
    { array: [0,1,2,3], highlights: [], stack: [], variables: { inDegree: "[0,1,1,2]", queue: "[]", order: "[]" }, explanation: "Build graph and in-degrees. Course 0 has no prerequisites (in-degree 0).", code: "inDegree = [0, 1, 1, 2];" },
    { array: [0,1,2,3], highlights: [0], stack: [], variables: { inDegree: "[0,1,1,2]", queue: "[0]", order: "[]" }, explanation: "Seed queue with all zero in-degree nodes: course 0.", code: "if (inDegree[0] == 0) queue.add(0);" },
    { array: [0,1,2,3], highlights: [0], stack: [], variables: { inDegree: "[0,0,0,2]", queue: "[1,2]", order: "[0]" }, explanation: "Poll course 0. Decrement neighbors 1,2: both reach in-degree 0, enqueue.", code: "order.add(0);\ninDegree[1]=0, inDegree[2]=0;" },
    { array: [0,1,2,3], highlights: [1], stack: [], variables: { inDegree: "[0,0,0,1]", queue: "[2]", order: "[0,1]" }, explanation: "Poll course 1. Decrement neighbor 3: in-degree 2 to 1, not zero yet.", code: "order.add(1);\ninDegree[3]--; // now 1" },
    { array: [0,1,2,3], highlights: [2], stack: [], variables: { inDegree: "[0,0,0,0]", queue: "[3]", order: "[0,1,2]" }, explanation: "Poll course 2. Decrement neighbor 3: in-degree 1 to 0, enqueue!", code: "order.add(2);\ninDegree[3]--; // now 0, enqueue" },
    { array: [0,1,2,3], highlights: [3], stack: [], variables: { inDegree: "[0,0,0,0]", queue: "[]", order: "[0,1,2,3]" }, explanation: "Poll course 3. No outgoing edges. Queue empty.", code: "order.add(3);" },
    { array: [0,1,2,3], highlights: [], stack: [], variables: { order: "[0,1,2,3]", valid: "true" }, explanation: "order.size()==4==numCourses. Valid ordering found: [0,1,2,3].", code: "return order; // [0,1,2,3]" },
  ]}
/>

### When to Use (Pattern Recognition)

- **"Order tasks given dependencies"** → Topological sort
- **"Is a valid ordering possible?"** → Cycle detection (topological sort fails)
- **"Number of ways to complete all tasks"** → Count topological orderings / DAG DP
- **"Minimum time with parallel execution"** → BFS layers = critical path (longest path in DAG)
- **"Prerequisite / dependency chain"** → Topological sort
- **"Build order / compilation order"** → Topological sort
- **"Can be modeled as a DAG"** (e.g., matrix with increasing values) → DAG DP
- **"Longest increasing path"** → Implicit DAG, process in topological order

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "Can all courses be completed given prerequisites?" | Kahn's BFS; check if order.size() == n | Cycle detection: if fewer than n nodes are processed, a cycle exists |
| "Return a valid course ordering" | Kahn's BFS or DFS reverse post-order | Direct application of topological sort |
| "Derive alphabet order from sorted alien words" | Compare adjacent words to extract edges, then topological sort | Each adjacent pair gives at most one ordering constraint |
| "Minimum semesters/rounds to complete all tasks" | Kahn's BFS layer-by-layer; count layers | Each BFS layer = one parallel round; layer count = critical path |
| "Longest path in a DAG" | Topological sort + DP: dp[v] = max(dp[u] + weight) for all predecessors u | DP along topological order; longest path = maximum dp value |
| "Count paths from source to target in a DAG" | Topological sort + DP: paths[v] += paths[u] for all predecessors u | Additive DP along topological order |
| "Longest increasing path in a matrix" | Implicit DAG (cell to strictly larger neighbor) + DFS memo | DFS + memoization is equivalent to reverse topological order DP |
| "Lexicographically smallest valid ordering" | Replace ArrayDeque with PriorityQueue in Kahn's algorithm | Always pick the smallest available node at each step |
| "Find all ancestors/descendants of each node in a DAG" | Process in topological order, propagate sets from predecessors | Each node inherits all ancestors of its predecessors |
| "Two-level dependency sort (items and groups)" | Build separate DAGs for inter-group and intra-group ordering, sort both | LC 1203: topological sort at group level, then within each group |

---

## Key Patterns & Variants

### Pattern 1: BFS Layer-by-Layer (Parallel Scheduling)
Process nodes in BFS levels. The number of levels = minimum rounds/semesters needed when tasks at the same level can execute in parallel.

### Pattern 2: Lexicographically Smallest Ordering
Replace `ArrayDeque` with a `PriorityQueue` in Kahn's algorithm to always pick the smallest available node.

### Pattern 3: Implicit DAG (No Explicit Graph)
Some problems have an implicit DAG structure — e.g., a grid where you can only move to cells with strictly larger values. Use DFS + memoization (equivalent to DAG DP).

### Pattern 4: Multi-Level Topological Sort
Some problems require topological sort at multiple levels — e.g., sort items within groups AND sort groups themselves (LC 1203).

### Pattern 5: Reverse Topological Order
Process nodes in reverse topological order when you need information from descendants rather than ancestors (e.g., "find all ancestors" by working backwards).

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Course Schedule | Medium | Cycle detection via topo sort | [LC 207](https://leetcode.com/problems/course-schedule/) |
| 2 | Course Schedule II | Medium | Kahn's BFS for ordering | [LC 210](https://leetcode.com/problems/course-schedule-ii/) |
| 3 | Alien Dictionary | Hard | Build graph from lexicographic order | [LC 269](https://leetcode.com/problems/alien-dictionary/) |
| 4 | Find All Possible Recipes from Given Supplies | Medium | Topo sort with string nodes | [LC 2115](https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/) |
| 5 | Parallel Courses | Medium | BFS layers = min semesters | [LC 1136](https://leetcode.com/problems/parallel-courses/) |
| 6 | Minimum Height Trees | Medium | Leaf-pruning BFS (topo-sort-like) | [LC 310](https://leetcode.com/problems/minimum-height-trees/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Longest Path in DAG | — | DAG DP with topo order | Classic (no LC) |
| 8 | Sort Items by Groups Respecting Dependencies | Hard | Two-level topo sort | [LC 1203](https://leetcode.com/problems/sort-items-by-groups-respecting-dependencies/) |
| 9 | Sequence Reconstruction | Medium | Unique topo order check | [LC 444](https://leetcode.com/problems/sequence-reconstruction/) |
| 10 | All Ancestors of a Node in a DAG | Medium | Reverse topo + set propagation | [LC 2192](https://leetcode.com/problems/all-ancestors-of-a-node-in-a-directed-acyclic-graph/) |
| 11 | Loud and Rich | Medium | DFS/topo DP on reverse graph | [LC 851](https://leetcode.com/problems/loud-and-rich/) |
| 12 | Largest Color Value in a Directed Graph | Hard | Topo sort + DP on colors | [LC 1857](https://leetcode.com/problems/largest-color-value-in-a-directed-graph/) |
| 13 | Course Schedule IV | Medium | Transitive closure via topo order | [LC 1462](https://leetcode.com/problems/course-schedule-iv/) |
| 14 | Build a Matrix With Conditions | Hard | Two independent topo sorts | [LC 2392](https://leetcode.com/problems/build-a-matrix-with-conditions/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Longest Increasing Path in a Matrix | Hard | Implicit DAG + DFS memo | [LC 329](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) |
| 16 | Strange Printer II | Hard | Overlap → DAG + cycle check | [LC 1591](https://leetcode.com/problems/strange-printer-ii/) |
| 17 | Minimum Number of Semesters to Take All Courses | Hard | Topo sort + bitmask DP | [LC 1494](https://leetcode.com/problems/minimum-number-of-semesters-to-take-all-courses/) |
| 18 | Number of Ways to Arrive at Destination | Medium | DAG DP counting paths | [LC 1976](https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/) |
| 19 | Find Eventual Safe States | Medium | Reverse topo / cycle detection | [LC 802](https://leetcode.com/problems/find-eventual-safe-states/) |
| 20 | Shortest Path in a Grid with Obstacles Elimination | Hard | BFS with state (row, col, k) | [LC 1293](https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/) |
| 21 | Maximum Employees to Be Invited to a Meeting | Hard | Functional graph + topo chains | [LC 2127](https://leetcode.com/problems/maximum-employees-to-be-invited-to-a-meeting/) |

---

## Weekly Mock Interview

### Question 1: Course Schedule II

**Prompt:** There are `numCourses` courses labeled `0` to `numCourses - 1`. Given an array `prerequisites` where `prerequisites[i] = [a, b]` means course `b` must be taken before course `a`, return a valid ordering of all courses, or an empty array if it's impossible to finish all courses.

**Expected approach:** Kahn's BFS. Build adjacency list and in-degree array. Seed queue with all zero in-degree nodes. Process level by level, decrementing in-degrees. If the result has fewer than `n` nodes, a cycle exists.

**Optimal complexity:** O(V + E) time, O(V + E) space

**Follow-up 1:** How would you return the *lexicographically smallest* valid ordering? (Replace `ArrayDeque` with a `PriorityQueue`.)

**Follow-up 2:** How many distinct valid orderings exist? (This is #P-hard in general, but discuss DFS-based enumeration for small inputs and the structure that makes some DAGs have exponentially many orderings.)

**Follow-up 3:** What if courses have credit hours and you can take at most K credits per semester — what's the minimum number of semesters? (BFS layers with capacity constraint → leads to LC 1494.)

**Time target:** 20 minutes

### Question 2: Alien Dictionary

**Prompt:** Given a sorted list of words in an alien language, derive the order of characters in that language's alphabet. Return the ordering as a string, or `""` if no valid ordering exists.

**Expected approach:** Compare adjacent words to extract character ordering constraints (edges). Build a directed graph and run topological sort. Watch for the edge case where a longer word appears before its prefix (invalid input).

**Optimal complexity:** O(C) where C = total characters across all words

**Follow-up 1:** What if there are multiple valid orderings? How do you detect uniqueness? (Check if the BFS queue ever has more than one element simultaneously.)

**Follow-up 2:** What if you're given pairs of words that are NOT necessarily adjacent in sorted order — how does the algorithm change? (Each pair still gives at most one edge, but you may get fewer constraints, leading to more ambiguity.)

**Follow-up 3:** Can you determine the alien alphabet from a list of words that is *not* guaranteed to be sorted? (You'd need to infer sortedness or use a different model entirely.)

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Cycle detection is mandatory:** Always check whether the topological sort consumed all nodes. Forgetting this is the #1 bug.
- **Multiple valid orderings:** Topological order is unique only when the BFS queue never has more than one element. If the problem asks for "any valid order," don't over-constrain.
- **DAG DP vs BFS layering:** Use BFS layers when you need the minimum number of parallel stages. Use DAG DP (longest path) when computing the critical path length.
- **DFS recursion depth:** For very deep DAGs (e.g., a chain of 10⁵ nodes), iterative DFS or Kahn's BFS avoids stack overflow.
- **Self-loops:** A self-loop is a trivial cycle. Make sure your graph building doesn't create them accidentally (e.g., `prerequisites = [[a, a]]`).
- **Disconnected components:** Both Kahn's and DFS handle disconnected DAGs correctly — just make sure you process all nodes, not just those reachable from one source.
- **Implicit DAGs:** In grid problems like "Longest Increasing Path," the DAG is implicit. DFS + memoization is equivalent to reverse topological order DP, and often cleaner to code.

---

## Further Reading

- [VNOI Wiki — Topological Sort & DAG DP](https://wiki.vnoi.info/)
- [CP-Algorithms — Topological Sort](https://cp-algorithms.com/graph/topological-sort.html)
- [Big-O Coding CP Level 2 — Lecture 3: Topological Sort & Applications](https://bigocoding.com/cp-level-2/)
