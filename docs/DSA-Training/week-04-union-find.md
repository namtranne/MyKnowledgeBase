---
sidebar_position: 5
title: "Week 4: Union-Find (DSU)"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 4: Union-Find / Disjoint Set Union

## Theory & Concepts

### What is Union-Find?

**Union-Find** (Disjoint Set Union, DSU) is a data structure that tracks a partition of elements into disjoint sets. It supports two operations in near-constant time:
- **Find(x):** Which set does x belong to? (Returns the representative/root)
- **Union(x, y):** Merge the sets containing x and y

With **path compression** + **union by rank**, both operations run in **O(α(n))** ≈ O(1) amortized, where α is the inverse Ackermann function.

**Why this technique exists.** Many problems require tracking which elements are in the same group and merging groups dynamically. You could use BFS/DFS to check connectivity, but that costs O(V + E) per query. If you have Q queries, that is O(Q(V + E)) total. Union-Find answers "are X and Y connected?" in nearly O(1) per query after an O(n) setup, making it vastly superior when connectivity changes incrementally. It is the backbone of Kruskal's MST algorithm, cycle detection in undirected graphs, and any problem involving dynamic equivalence classes.

**The intuition — a real-world analogy.** Imagine a social network where people form friend groups. When two people become friends, their entire friend groups merge. To check if Alice and Bob are in the same group, you follow the chain of "group leaders" until you reach the top. Path compression is like updating everyone's leader pointer directly to the root after a lookup, so next time the lookup is instant. Union by rank ensures you always attach the smaller tree under the larger one, keeping the tree shallow.

**Interview signals.** Look for: "connected components," "are X and Y in the same group?", "merge groups," "detect cycle in undirected graph," "minimum spanning tree," "equivalence classes" (account merge, synonymous sentences), or "number of islands" with online additions. If the problem involves incremental connectivity (edges added one by one, with connectivity queries interspersed), Union-Find is almost always the right choice over repeated BFS/DFS.

**Common mistakes beginners make.** (1) Forgetting path compression — without it, find() degrades to O(n) on skewed trees. (2) Not checking if two elements are already in the same set before unioning (the return value of `union()` is important for cycle detection). (3) Confusing 0-indexed and 1-indexed nodes, leading to off-by-one errors. (4) For grid problems, forgetting the formula `id = row * cols + col` to convert 2D coordinates to 1D Union-Find indices.

### Core Implementation

```java
import java.util.*;

class UnionFind {
    int[] parent, rank;
    int count; // number of connected components

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        count = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // path compression
        return parent[x];
    }

    boolean union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false; // already in same set
        // union by rank
        if (rank[rx] < rank[ry]) { int tmp = rx; rx = ry; ry = tmp; }
        parent[ry] = rx;
        if (rank[rx] == rank[ry]) rank[rx]++;
        count--;
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}
```

### Weighted Union-Find

Track an additional value along edges (e.g., distance, ratio):

```java
class WeightedUF {
    int[] parent, rank;
    double[] weight; // weight[x] = relationship from x to parent[x]

    WeightedUF(int n) {
        parent = new int[n];
        rank = new int[n];
        weight = new double[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x) {
            int root = find(parent[x]);
            weight[x] += weight[parent[x]]; // accumulate weight
            parent[x] = root;
        }
        return parent[x];
    }

    // Set weight(x) - weight(y) = w
    void union(int x, int y, double w) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return;
        parent[ry] = rx;
        weight[ry] = weight[x] - weight[y] + w;
    }
}
```

### Complexity Analysis

| Operation | Time (amortized) | Space |
|-----------|-----------------|-------|
| Find | O(α(n)) ≈ O(1) | O(n) |
| Union | O(α(n)) ≈ O(1) | — |
| Build n elements | O(n) | O(n) |

### Worked Example: Number of Connected Components

**Problem:** Given n = 5, edges = [[0,1],[1,2],[3,4]]. Find number of connected components.

**Why not brute force?** You could run BFS/DFS from each node to determine components, costing O(V + E) per traversal. But if edges arrive one at a time (online), you would need to re-run BFS/DFS after each new edge — O(E(V + E)) total. Union-Find processes each edge in near-O(1), making the total O(E * alpha(n)), which is essentially O(E). This makes Union-Find the right tool whenever connectivity changes incrementally.

```
Initial: {0} {1} {2} {3} {4}  — count = 5
Union(0,1): {0,1} {2} {3} {4}  — count = 4
Union(1,2): {0,1,2} {3} {4}   — count = 3
Union(3,4): {0,1,2} {3,4}     — count = 2
Answer: 2
```

**Key insight:** Each successful union decreases the component count by exactly one. After processing all edges, the component count directly gives the answer. The path compression and union by rank optimizations ensure that even with millions of nodes, every operation is effectively constant time.

<AlgoViz
  title="Union-Find with Path Compression"
  description="Watch Union-Find merge components and compress paths. n=5, edges=[[0,1],[1,2],[3,4]]."
  steps={[
    { array: [0,1,2,3,4], highlights: [], stack: [], variables: { parent: "[0,1,2,3,4]", rank: "[0,0,0,0,0]", components: "5" }, explanation: "Initialize: each element is its own parent. 5 separate components.", code: "for (int i = 0; i < n; i++) parent[i] = i;" },
    { array: [0,1,2,3,4], highlights: [0,1], stack: [], variables: { parent: "[0,0,2,3,4]", rank: "[1,0,0,0,0]", components: "4" }, explanation: "Union(0,1): find(0)=0, find(1)=1. Different roots. Merge 1 under 0, rank[0]++.", code: "parent[1] = 0;\nrank[0] = 1;\ncount = 4;" },
    { array: [0,1,2,3,4], highlights: [1,2], stack: [], variables: { parent: "[0,0,0,3,4]", rank: "[1,0,0,0,0]", components: "3" }, explanation: "Union(1,2): find(1) follows parent[1]=0 (root). find(2)=2. Merge 2 under 0.", code: "parent[2] = 0;\ncount = 3;" },
    { array: [0,1,2,3,4], highlights: [1], stack: [], variables: { parent: "[0,0,0,3,4]", rank: "[1,0,0,0,0]", components: "3" }, explanation: "Path compression: find(1) already points directly to root 0. No change needed.", code: "// find(1): parent[1]=0 (root), already compressed" },
    { array: [0,1,2,3,4], highlights: [3,4], stack: [], variables: { parent: "[0,0,0,3,3]", rank: "[1,0,0,1,0]", components: "2" }, explanation: "Union(3,4): find(3)=3, find(4)=4. Different roots. Merge 4 under 3, rank[3]++.", code: "parent[4] = 3;\nrank[3] = 1;\ncount = 2;" },
    { array: [0,1,2,3,4], highlights: [], stack: [], variables: { parent: "[0,0,0,3,3]", components: "2" }, explanation: "Done! Two components: &#123;0,1,2&#125; and &#123;3,4&#125;. All find() calls are near-O(1).", code: "return count; // 2" },
  ]}
/>

### When to Use (Pattern Recognition)

- **"Are x and y connected?"** → Union-Find
- **"How many connected components?"** → Union-Find (track count)
- **"Merge groups dynamically"** → Union-Find
- **"Detect cycle in undirected graph"** → Union-Find (if union returns false, cycle found)
- **"Minimum Spanning Tree"** → Kruskal's algorithm = sort edges + Union-Find
- **"Equivalence classes"** → Union-Find (e.g., accounts merge, synonymous sentences)
- **"Online connectivity queries"** → Union-Find beats DFS/BFS re-traversal

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "How many connected components after adding edges?" | DSU with component counter, decrement on each successful union | O(E * alpha(n)) total vs O(E * (V+E)) with repeated BFS |
| "Does adding this edge create a cycle?" | If find(u) == find(v) before union, the edge is redundant and creates a cycle | Direct cycle detection in undirected graphs |
| "Merge accounts/groups that share a common element" | Map each shared element to a DSU node; union all elements in the same group | Accounts Merge, synonymous sentences — equivalence class problems |
| "Minimum spanning tree" | Sort edges by weight, add via DSU if endpoints are in different components (Kruskal's) | Greedy + DSU: only add edges that connect new components |
| "Equations: a==b, a!=b — is the system satisfiable?" | Union variables connected by ==, then check that != pairs are in different sets | Process equalities first, then validate inequalities |
| "Grid connectivity (islands, regions, boundary cells)" | Map 2D coordinates to 1D index, union adjacent cells | DSU on grids; use virtual/dummy nodes for boundary grouping |
| "Evaluate division: a/b=2, b/c=3, what is a/c?" | Weighted DSU: track ratio from each node to its root | Weight accumulates along the path; find() compresses weights |
| "Find redundant edge in a tree-plus-one-edge graph" | Process edges in order; the first edge where find(u)==find(v) is redundant | The edge that completes a cycle is the redundant one |
| "Swim in rising water / time-based connectivity" | Sort cells/edges by time, union them in order, check if source and target are connected | Offline approach: process events in sorted order with DSU |
| "Largest island after flipping one cell" | DSU for existing islands, then try each 0-cell and sum neighbor component sizes | Track component sizes in DSU; check all four neighbors |

---

## Key Patterns & Variants

### Pattern 1: Connected Components Counting
Initialize with n components, decrement on each successful union.

<AlgoViz
  title="Connected Components — Union-Find Counting"
  description="Count connected components as edges arrive: n=6, edges=[[0,1],[2,3],[4,5],[1,3],[0,5]]. Watch three pairs merge into one component."
  steps={[
    { array: [0,1,2,3,4,5], highlights: [], variables: { parent: "[0,1,2,3,4,5]", components: "6" }, explanation: "Initialize 6 nodes, each its own component. parent[i]=i for all i.", code: "UnionFind uf = new UnionFind(6);\n// components = 6" },
    { array: [0,1,2,3,4,5], highlights: [0,1], variables: { parent: "[0,0,2,3,4,5]", components: "5" }, explanation: "Edge (0,1): find(0)=0, find(1)=1. Different roots. Union → parent[1]=0. Components: 5.", code: "uf.union(0, 1); // components = 5" },
    { array: [0,1,2,3,4,5], highlights: [2,3], variables: { parent: "[0,0,2,2,4,5]", components: "4" }, explanation: "Edge (2,3): find(2)=2, find(3)=3. Different. Union → parent[3]=2. Components: 4.", code: "uf.union(2, 3); // components = 4" },
    { array: [0,1,2,3,4,5], highlights: [4,5], variables: { parent: "[0,0,2,2,4,4]", components: "3" }, explanation: "Edge (4,5): find(4)=4, find(5)=5. Different. Union → parent[5]=4. Components: 3. Three separate pairs.", code: "uf.union(4, 5); // components = 3" },
    { array: [0,1,2,3,4,5], highlights: [0,1,2,3], variables: { parent: "[0,0,0,2,4,4]", components: "2" }, explanation: "Edge (1,3): find(1)=0, find(3)=2. Different groups! Union merges &#123;2,3&#125; under &#123;0,1&#125;. Components: 2.", code: "uf.union(1, 3); // merges two pairs!\n// components = 2" },
    { array: [0,1,2,3,4,5], highlights: [0,1,2,3,4,5], variables: { parent: "[0,0,0,2,0,4]", components: "1" }, explanation: "Edge (0,5): find(0)=0, find(5)=4. Different! Union merges all into one. Components: 1.", code: "uf.union(0, 5); // components = 1" },
    { array: [0,1,2,3,4,5], highlights: [], variables: { components: "1", result: "all connected" }, explanation: "Done! All 6 nodes now in one component. Each union() that returns true decremented the count by exactly 1.", code: "return uf.count; // 1" },
  ]}
/>

### Pattern 2: Cycle Detection
In an undirected graph, if `find(u) == find(v)` before `union(u,v)`, adding edge (u,v) creates a cycle.

<AlgoViz
  title="Cycle Detection — Union-Find"
  description="Process edges [[0,1],[1,2],[2,3],[3,1]] for 4 nodes. When find(u)==find(v) before union, a cycle exists!"
  steps={[
    { array: [0,1,2,3], highlights: [], variables: { parent: "[0,1,2,3]", rank: "[0,0,0,0]" }, explanation: "4 nodes, 4 edges. Process edges one by one. If both endpoints share a root before union, the edge closes a cycle.", code: "UnionFind uf = new UnionFind(4);" },
    { array: [0,1,2,3], highlights: [0,1], variables: { parent: "[0,0,2,3]", edge: "(0,1)", cycle: "false" }, explanation: "Edge (0,1): find(0)=0, find(1)=1. Different roots — safe to union. No cycle.", code: "find(0)=0, find(1)=1 // different\nuf.union(0, 1); // OK" },
    { array: [0,1,2,3], highlights: [1,2], variables: { parent: "[0,0,0,3]", edge: "(1,2)", cycle: "false" }, explanation: "Edge (1,2): find(1)→0, find(2)=2. Different roots — safe. Union 2 under 0.", code: "find(1)=0, find(2)=2 // different\nuf.union(1, 2); // OK" },
    { array: [0,1,2,3], highlights: [2,3], variables: { parent: "[0,0,0,0]", edge: "(2,3)", cycle: "false" }, explanation: "Edge (2,3): find(2)→0, find(3)=3. Different — union. Now all 4 nodes share root 0.", code: "find(2)=0, find(3)=3 // different\nuf.union(2, 3); // OK" },
    { array: [0,1,2,3], highlights: [1,3], secondary: [0,2], variables: { parent: "[0,0,0,0]", edge: "(3,1)", findU: "0", findV: "0", cycle: "true" }, explanation: "Edge (3,1): find(3)=0, find(1)=0. SAME ROOT! Adding this edge creates a cycle: 1→2→3→1.", code: "find(3)=0, find(1)=0 // SAME!\n// Cycle detected!" },
    { array: [0,1,2,3], highlights: [1,2,3], variables: { cycle: "true", redundantEdge: "(3,1)" }, explanation: "Cycle confirmed! Edge (3,1) is the redundant connection. In Redundant Connection (LC 684), this is the answer.", code: "return true; // cycle exists\n// Edge (3,1) closes the cycle" },
  ]}
/>

### Pattern 3: Kruskal's MST
Sort edges by weight, greedily add if the two endpoints are in different components.

### Pattern 4: Virtual/Dummy Nodes
Add a virtual node to group elements sharing a property (e.g., all cells at boundary in a grid).

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Number of Provinces | Medium | Basic DSU | [LC 547](https://leetcode.com/problems/number-of-provinces/) |
| 2 | Redundant Connection | Medium | Cycle detection | [LC 684](https://leetcode.com/problems/redundant-connection/) |
| 3 | Accounts Merge | Medium | DSU + hashmap | [LC 721](https://leetcode.com/problems/accounts-merge/) |
| 4 | Satisfiability of Equality Equations | Medium | DSU for == and != | [LC 990](https://leetcode.com/problems/satisfiability-of-equality-equations/) |
| 5 | Longest Consecutive Sequence | Medium | DSU or hashset | [LC 128](https://leetcode.com/problems/longest-consecutive-sequence/) |
| 6 | Number of Connected Components in Undirected Graph | Medium | Basic DSU | [LC 323](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Regions Cut By Slashes | Medium | 3x3 grid + DSU | [LC 959](https://leetcode.com/problems/regions-cut-by-slashes/) |
| 8 | Most Stones Removed with Same Row or Column | Medium | DSU by row/col | [LC 947](https://leetcode.com/problems/most-stones-removed-with-same-row-or-column/) |
| 9 | Evaluate Division | Medium | Weighted DSU | [LC 399](https://leetcode.com/problems/evaluate-division/) |
| 10 | Smallest String With Swaps | Medium | DSU + sort within component | [LC 1202](https://leetcode.com/problems/smallest-string-with-swaps/) |
| 11 | Number of Islands II | Hard | Online DSU on grid | [LC 305](https://leetcode.com/problems/number-of-islands-ii/) |
| 12 | Graph Valid Tree | Medium | DSU cycle check + count | [LC 261](https://leetcode.com/problems/graph-valid-tree/) |
| 13 | Min Cost to Connect All Points | Medium | Kruskal's MST | [LC 1584](https://leetcode.com/problems/min-cost-to-connect-all-points/) |
| 14 | Redundant Connection II | Hard | Directed graph DSU | [LC 685](https://leetcode.com/problems/redundant-connection-ii/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Swim in Rising Water | Hard | Binary search + DSU | [LC 778](https://leetcode.com/problems/swim-in-rising-water/) |
| 16 | Making A Large Island | Hard | DSU + virtual | [LC 827](https://leetcode.com/problems/making-a-large-island/) |
| 17 | Remove Max Number of Edges to Keep Graph Fully Traversable | Hard | Two DSU instances | [LC 1579](https://leetcode.com/problems/remove-max-number-of-edges-to-keep-graph-fully-traversable/) |
| 18 | Checking Existence of Edge Length Limited Paths | Hard | Offline + sorted DSU | [LC 1697](https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths/) |
| 19 | Count Pairs Of Nodes | Hard | DSU + counting | [LC 1782](https://leetcode.com/problems/count-pairs-of-nodes/) |
| 20 | Minimize Malware Spread | Hard | DSU + component size | [LC 924](https://leetcode.com/problems/minimize-malware-spread/) |
| 21 | Number of Good Paths | Hard | Sorted DSU + counting | [LC 2421](https://leetcode.com/problems/number-of-good-paths/) |

---

## Weekly Mock Interview

### Question 1: Accounts Merge

**Prompt:** Given a list of accounts where each account has a name and a list of emails, merge accounts that share at least one email.

**Expected approach:** Union-Find. Map each email to an ID. Union all emails in the same account. Group by root, sort, attach name.

**Optimal complexity:** O(n × α(n) + n log n) for sorting

**Follow-up 1:** What if the input is a stream of accounts arriving one at a time? Can you handle it online?

**Follow-up 2:** How would you handle this at scale (millions of accounts)? Discuss distributed approaches.

**Time target:** 20 minutes

### Question 2: Swim in Rising Water

**Prompt:** Given an n×n grid of elevations, find the minimum time t such that you can swim from (0,0) to (n-1,n-1), where at time t all cells with elevation ≤ t are underwater.

**Expected approach:** Binary search on t + BFS/DFS, OR sort cells by elevation and use DSU to connect neighbors as water rises.

**Optimal complexity:** O(n² log n) with sorting + DSU

**Follow-up 1:** Compare the DSU approach vs Dijkstra's approach vs binary search + BFS. Trade-offs?

**Follow-up 2:** What if the grid is dynamic — elevations change over time?

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Don't forget path compression:** Without it, find() degrades to O(n). Always compress.
- **Union by rank vs union by size:** Both work. Size is sometimes more useful (you can track component sizes).
- **Rollback DSU:** For problems needing undo (offline divide & conquer), skip path compression and use union by rank only.
- **0-indexed vs 1-indexed:** Be consistent. Off-by-one errors in DSU are common when nodes are labeled from 1.
- **Grid problems:** Map 2D coordinates to 1D: `id = row * cols + col`.

---

## Further Reading

- [VNOI Wiki — Disjoint Set Union](https://wiki.vnoi.info/)
- [CP-Algorithms — DSU](https://cp-algorithms.com/data_structures/disjoint_set_union.html)
- [Big-O Coding CP Level 2 — Lecture 1: Disjoint Sets](https://bigocoding.com/cp-level-2/)
