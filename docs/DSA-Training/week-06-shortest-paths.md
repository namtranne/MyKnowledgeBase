---
sidebar_position: 7
title: "Week 6: Shortest Paths"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 6: Shortest Paths

## Theory & Concepts

### Overview of Shortest Path Algorithms

Shortest path is one of the most fundamental graph problems. The right algorithm depends on the graph structure: edge weights, negative edges, single-source vs all-pairs, and state constraints.

**Why this family of techniques exists.** BFS finds shortest paths in unweighted graphs, but when edges have weights, BFS no longer works — a path with fewer edges might be longer than one with more edges but smaller total weight. We need algorithms that respect edge weights. Dijkstra handles non-negative weights with a priority queue, Bellman-Ford handles negative weights by iterating, and Floyd-Warshall computes all pairs at once. Each fills a niche that the others cannot.

**The intuition — a real-world analogy.** Think of Dijkstra's algorithm as an expanding wavefront of water from a source. Water flows through edges at speeds proportional to edge weights (shorter weight = faster flow). The first time water reaches a node, that is the shortest path to it. The priority queue ensures we always process the nearest "unflooded" node. Negative edges would be like time-travel portals — water could arrive at a previously flooded node via a shorter path, breaking the greedy invariant. Bellman-Ford handles this by repeatedly relaxing all edges until no more improvements are possible.

**Interview signals.** Look for: "shortest/cheapest/minimum cost path," "network delay time," "within K stops," "minimum effort path," "path with maximum probability," "0/1 weight grid," or "shortest path with extra constraints" (keys, fuel, obstacles). The constraint structure tells you which algorithm to use: non-negative weights with no extra state means Dijkstra; negative weights or limited edge count means Bellman-Ford; small graph with all-pairs needs means Floyd-Warshall; 0/1 weights means 0-1 BFS; extra state means state-space Dijkstra.

**Common mistakes beginners make.** (1) Using Dijkstra with negative edge weights — the greedy invariant breaks and you get incorrect results silently (no error, just wrong answers). (2) Forgetting the stale-entry check `if (d > dist[u]) continue` in Dijkstra, causing redundant processing and potentially wrong results. (3) Integer overflow when adding `dist[u] + w` — guard with `if (dist[u] != Integer.MAX_VALUE)` or use `long`. (4) Confusing 0-indexed and 1-indexed nodes (many LeetCode graph problems use 1-indexed nodes). (5) In state-space Dijkstra, making the state space too large (a bitmask of 20 items = 10^6 states, but 25 items = 33 million, which might TLE).

### Algorithm 1: Dijkstra's Algorithm

**When:** Single-source shortest path with **non-negative** edge weights.

**Why greedy works:** Once a node is extracted from the priority queue with distance `d`, no future path can improve on `d` because all remaining edges are non-negative. This is the key invariant — each node is finalized exactly once.

```java
import java.util.*;

// Single-source shortest path with non-negative weights.
// edges[i] = {u, v, w}. Returns dist[] where dist[v] = shortest distance from src to v.
static int[] dijkstra(int n, int[][] edges, int src) {
    List<int[]>[] graph = new List[n];
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int[] e : edges) graph[e[0]].add(new int[]{e[1], e[2]});

    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, src}); // {distance, node}

    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue; // stale entry
        for (int[] edge : graph[u]) {
            int v = edge[0], w = edge[1];
            int nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.offer(new int[]{nd, v});
            }
        }
    }
    return dist;
}
```

**Critical detail — the "stale entry" check:** We use a lazy deletion approach. When we relax a node, we push a new entry but don't remove the old one. The `if (d > dist[u]) continue` line skips outdated entries. This avoids the need for a decrease-key operation.

### Algorithm 2: Bellman-Ford

**When:** Single-source shortest path with **negative** edge weights. Also detects **negative cycles**.

**Core idea:** Relax all edges V-1 times. After V-1 iterations, all shortest paths are found (a shortest path has at most V-1 edges). If a V-th iteration still improves something, a negative cycle exists.

```java
// Returns dist array, or null if a negative cycle is reachable from src.
static int[] bellmanFord(int n, int[][] edges, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    for (int i = 0; i < n - 1; i++) {
        boolean updated = false;
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // early termination
    }

    // Check for negative cycles
    for (int[] e : edges) {
        int u = e[0], v = e[1], w = e[2];
        if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
            return null; // negative cycle reachable from src
        }
    }
    return dist;
}
```

### Algorithm 3: Floyd-Warshall

**When:** **All-pairs** shortest path. Works with negative edges (but no negative cycles). Useful when you need distances between every pair of nodes.

**Core idea:** For each intermediate node k, check if going through k improves the path from i to j.

```java
// All-pairs shortest path. Returns n×n distance matrix.
static int[][] floydWarshall(int n, int[][] edges) {
    int INF = Integer.MAX_VALUE / 2; // halved to prevent overflow on addition
    int[][] dist = new int[n][n];
    for (int[] row : dist) Arrays.fill(row, INF);

    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (int[] e : edges) dist[e[0]][e[1]] = Math.min(dist[e[0]][e[1]], e[2]);

    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++) {
            if (dist[i][k] == INF) continue;
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];
        }
    return dist;
}
```

### Algorithm 4: 0-1 BFS (Deque Trick)

**When:** Edge weights are only **0 or 1**. Runs in O(V + E) — faster than Dijkstra's O((V+E) log V).

**Core idea:** Use a deque instead of a priority queue. Push weight-0 edges to the front, weight-1 edges to the back. This maintains the invariant that the deque is sorted by distance.

```java
// Shortest path when all edge weights are 0 or 1.
// edges[i] = {u, v, w} where w ∈ {0, 1}
static int[] bfs01(int n, int[][] edges, int src) {
    List<int[]>[] graph = new List[n];
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int[] e : edges) graph[e[0]].add(new int[]{e[1], e[2]});

    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    ArrayDeque<Integer> dq = new ArrayDeque<>();
    dq.offer(src);

    while (!dq.isEmpty()) {
        int u = dq.poll();
        for (int[] edge : graph[u]) {
            int v = edge[0], w = edge[1];
            int nd = dist[u] + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                if (w == 0) dq.offerFirst(v);
                else dq.offerLast(v);
            }
        }
    }
    return dist;
}
```

### Algorithm 5: SPFA (Shortest Path Faster Algorithm)

**When:** A practical optimization of Bellman-Ford. Uses a queue to only relax edges from recently updated nodes. Average case O(V + E), but worst case remains O(VE).

```java
// Queue-optimized Bellman-Ford. Often faster in practice, but worst case O(VE).
static int[] spfa(int n, int[][] edges, int src) {
    List<int[]>[] graph = new List[n];
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int[] e : edges) graph[e[0]].add(new int[]{e[1], e[2]});

    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    boolean[] inQueue = new boolean[n];
    inQueue[src] = true;
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    queue.offer(src);

    while (!queue.isEmpty()) {
        int u = queue.poll();
        inQueue[u] = false;
        for (int[] edge : graph[u]) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (!inQueue[v]) {
                    inQueue[v] = true;
                    queue.offer(v);
                }
            }
        }
    }
    return dist;
}
```

### Complexity Comparison

| Algorithm | Time | Space | Negative Weights | Neg Cycle Detection | Use Case |
|-----------|------|-------|-----------------|-------------------|----------|
| Dijkstra (binary heap) | O((V+E) log V) | O(V + E) | ❌ | ❌ | Single-source, non-negative |
| Bellman-Ford | O(VE) | O(V) | ✅ | ✅ | Single-source, negative edges |
| Floyd-Warshall | O(V³) | O(V²) | ✅ | ✅ (negative diagonal) | All-pairs |
| 0-1 BFS | O(V + E) | O(V + E) | N/A (weights 0/1) | ❌ | Weights ∈ `{0, 1}` only |
| SPFA | O(VE) worst, O(V+E) avg | O(V + E) | ✅ | ✅ (count relaxations) | Practical Bellman-Ford |
| DAG relaxation | O(V + E) | O(V + E) | ✅ | N/A (no cycles in DAG) | DAG only |

### Worked Example: Network Delay Time (LC 743)

**Problem:** You are given a network of `n` nodes (labeled `1` to `n`). Given `times[i] = [u, v, w]` (directed edge from `u` to `v` with delay `w`), and a source node `k`, return the minimum time for all nodes to receive the signal. If not all nodes are reachable, return `-1`.

**Input:** `times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2`

**Graph:**
```
2 --1--> 1
2 --1--> 3 --1--> 4
```

**Trace using Dijkstra:**
```
Initial: dist = [inf, inf, 0, inf]  (0-indexed, node 2 is index 1... 
         let's use 1-indexed for clarity)
         dist = [_, inf, 0, inf, inf]
         pq = [(0, 2)]

Step 1: Pop (0, 2). Process neighbors:
        Edge 2→1 w=1: dist[1] = min(inf, 0+1) = 1. Push (1, 1)
        Edge 2→3 w=1: dist[3] = min(inf, 0+1) = 1. Push (1, 3)
        pq = [(1, 1), (1, 3)]
        dist = [_, 1, 0, 1, inf]

Step 2: Pop (1, 1). Node 1 has no outgoing edges.
        pq = [(1, 3)]
        dist = [_, 1, 0, 1, inf]

Step 3: Pop (1, 3). Process neighbors:
        Edge 3→4 w=1: dist[4] = min(inf, 1+1) = 2. Push (2, 4)
        pq = [(2, 4)]
        dist = [_, 1, 0, 1, 2]

Step 4: Pop (2, 4). Node 4 has no outgoing edges.
        pq = []
        dist = [_, 1, 0, 1, 2]

All nodes reachable. Answer = max(dist[1:]) = max(1, 0, 1, 2) = 2
```

**Why not BFS?** BFS finds shortest paths in unweighted graphs (all edges have weight 1), but here edges have different weights. BFS would process nodes in order of hop count, not in order of distance. Dijkstra's priority queue ensures we always finalize the closest unprocessed node first, guaranteeing correctness with non-negative weights.

**Key insight:** The moment a node is popped from the priority queue, its shortest distance is finalized. No future path can improve it because all remaining edges are non-negative. This is the greedy invariant that makes Dijkstra correct and efficient.

<AlgoViz title="Dijkstra's Algorithm — Network Delay Time" description="Priority queue step-by-step from source node k=2 (1-indexed). Array shows dist[0..4] where index 0 is unused." steps={[
  { array: [0, 999, 0, 999, 999], highlights: [2], variables: { pq: "[(0,2)]" }, explanation: "Initialize: dist[2]=0, all others=INF. Push (0,2) onto the priority queue.", code: "dist[src] = 0;\npq.offer(new int[]{0, src});" },
  { array: [0, 1, 0, 1, 999], highlights: [1, 3], variables: { pq: "[(1,1),(1,3)]", popped: "(0,2)" }, explanation: "Pop (0,2). Relax 2->1 (w=1): dist[1]=1. Relax 2->3 (w=1): dist[3]=1.", code: "dist[1] = 0+1 = 1;\ndist[3] = 0+1 = 1;" },
  { array: [0, 1, 0, 1, 999], highlights: [], variables: { pq: "[(1,3)]", popped: "(1,1)" }, explanation: "Pop (1,1). Node 1 has no outgoing edges. Nothing to relax.", code: "// no neighbors for node 1" },
  { array: [0, 1, 0, 1, 2], highlights: [4], variables: { pq: "[(2,4)]", popped: "(1,3)" }, explanation: "Pop (1,3). Relax 3->4 (w=1): dist[4]=1+1=2. Push (2,4).", code: "dist[4] = 1+1 = 2;\npq.offer(new int[]{2, 4});" },
  { array: [0, 1, 0, 1, 2], highlights: [], variables: { pq: "[]", popped: "(2,4)", answer: "2" }, explanation: "Pop (2,4). No outgoing edges. PQ empty. Answer = max(1,0,1,2) = 2.", code: "// All nodes finalized. Return 2." }
]} />

### When to Use (Pattern Recognition)

- **"Shortest path with non-negative weights"** → Dijkstra
- **"Cheapest/minimum cost path"** → Dijkstra (or Bellman-Ford if negative costs)
- **"Within K stops/edges"** → Modified Bellman-Ford (K iterations) or state-space Dijkstra
- **"Negative edge weights"** → Bellman-Ford or SPFA
- **"All pairs shortest path"** → Floyd-Warshall (small n) or run Dijkstra from each node
- **"Grid shortest path with 0/1 costs"** → 0-1 BFS
- **"Shortest path with extra state"** (keys, fuel, obstacles) → State-space Dijkstra: `(dist, node, state)` in the priority queue
- **"Maximum probability / minimum product"** → Transform with log and use Dijkstra
- **"Path with minimum maximum edge"** → Modified Dijkstra (track max edge instead of sum)

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "Shortest path from source with non-negative weights" | Standard Dijkstra with priority queue | Single-source, non-negative weights: Dijkstra is optimal |
| "Cheapest flight within K stops" | Bellman-Ford with K+1 iterations, or state-space Dijkstra | Limited edges means standard Dijkstra cannot skip longer paths |
| "Shortest path with keys/fuel/obstacles as extra state" | State-space Dijkstra: (dist, node, state) in priority queue | Expand the graph to (node x state) pairs; Dijkstra on the expanded graph |
| "Grid shortest path where some cells cost 0 and others cost 1" | 0-1 BFS with deque (0-weight to front, 1-weight to back) | Faster than Dijkstra for binary weights: O(V+E) vs O((V+E) log V) |
| "Detect or handle negative weight edges" | Bellman-Ford (V-1 iterations, then check for negative cycles) | Dijkstra breaks with negative weights; Bellman-Ford is safe |
| "All-pairs shortest path (small n)" | Floyd-Warshall: O(V^3) DP on intermediate nodes | When n is at most 400-500, Floyd-Warshall is simpler and sufficient |
| "Shortest path from all nodes to one destination" | Reverse all edges, run Dijkstra from the destination | Equivalent to shortest path from destination in the reversed graph |
| "Path with maximum probability (product of edge probabilities)" | Dijkstra with max-heap: multiply probabilities instead of adding | Take log to convert multiplication to addition, or use max-heap directly |
| "Minimax path (minimize the maximum edge weight on the path)" | Modified Dijkstra tracking max edge instead of sum | Greedy still works: once a node is finalized, no future path has a smaller max edge |
| "Shortest path in dynamic graph (edges added over time)" | Rerun Dijkstra per query, or use advanced structures | For LC 2642: maintain adjacency list, rerun Dijkstra per shortestPath call |

---

## Key Patterns & Variants

### Pattern 1: State-Space Dijkstra
When the problem has additional constraints (number of stops, keys collected, obstacles removed), expand the state: `(distance, node, extra_state)`. The graph is now over (node × state) pairs. This is the single most important extension of Dijkstra for interviews.

### Pattern 2: Multi-Source Shortest Path
Add all source nodes to the priority queue with distance 0 at the start. This computes the shortest distance from any source to each node in one pass.

### Pattern 3: Reverse Graph Dijkstra
To find shortest paths from all nodes to a single destination, reverse all edges and run Dijkstra from the destination.

### Pattern 4: Binary Search + Shortest Path
"Is there a path with property ≤ X?" → Binary search on X, check feasibility with BFS/Dijkstra.

### Pattern 5: Modified Distance Metric
Instead of summing edge weights, track the maximum edge (minimax path), minimum edge (maximin path), or product of probabilities. Dijkstra still works if the metric is monotonic.

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Network Delay Time | Medium | Standard Dijkstra | [LC 743](https://leetcode.com/problems/network-delay-time/) |
| 2 | Cheapest Flights Within K Stops | Medium | Bellman-Ford with K iterations / state Dijkstra | [LC 787](https://leetcode.com/problems/cheapest-flights-within-k-stops/) |
| 3 | Path with Maximum Probability | Medium | Max-heap Dijkstra (negate log) | [LC 1514](https://leetcode.com/problems/path-with-maximum-probability/) |
| 4 | Path With Minimum Effort | Medium | Dijkstra with max-edge metric | [LC 1631](https://leetcode.com/problems/path-with-minimum-effort/) |
| 5 | Shortest Path in Binary Matrix | Medium | BFS on grid (unit weights) | [LC 1091](https://leetcode.com/problems/shortest-path-in-binary-matrix/) |
| 6 | Shortest Path to Get All Keys | Hard | State-space BFS (node + keymask) | [LC 864](https://leetcode.com/problems/shortest-path-to-get-all-keys/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Shortest Path Visiting All Nodes | Hard | BFS with bitmask state | [LC 847](https://leetcode.com/problems/shortest-path-visiting-all-nodes/) |
| 8 | Minimum Cost to Make at Least One Valid Path | Hard | 0-1 BFS (free edges vs cost-1 flips) | [LC 1368](https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/) |
| 9 | Swim in Rising Water | Hard | Dijkstra with max-edge / binary search + BFS | [LC 778](https://leetcode.com/problems/swim-in-rising-water/) |
| 10 | Number of Ways to Arrive at Destination | Medium | Dijkstra + count equal-length paths | [LC 1976](https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/) |
| 11 | Find the City With the Smallest Number of Neighbors at a Threshold Distance | Medium | Floyd-Warshall or Dijkstra from each city | [LC 1334](https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/) |
| 12 | Minimum Weighted Subgraph With the Required Paths | Hard | Reverse Dijkstra from dest + forward from sources | [LC 2203](https://leetcode.com/problems/minimum-weighted-subgraph-with-the-required-paths/) |
| 13 | Reachable Nodes In Subdivided Graph | Hard | Dijkstra with fractional edge usage | [LC 882](https://leetcode.com/problems/reachable-nodes-in-subdivided-graph/) |
| 14 | Design Graph With Shortest Path Calculator | Hard | Dijkstra on dynamic graph | [LC 2642](https://leetcode.com/problems/design-graph-with-shortest-path-calculator/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Shortest Path with Alternating Colors | Medium | BFS with color state | [LC 1129](https://leetcode.com/problems/shortest-path-with-alternating-colors/) |
| 16 | Minimum Cost to Reach Destination in Time | Hard | State-space Dijkstra (node + time) | [LC 1928](https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/) |
| 17 | Minimum Obstacle Removal to Reach Corner | Hard | 0-1 BFS (0 for empty, 1 for obstacle) | [LC 2290](https://leetcode.com/problems/minimum-obstacle-removal-to-reach-corner/) |
| 18 | Second Minimum Time to Reach Destination | Hard | Modified Dijkstra tracking two best times | [LC 2045](https://leetcode.com/problems/second-minimum-time-to-reach-destination/) |
| 19 | Trapping Rain Water II | Hard | Multi-source Dijkstra on 2D grid boundary | [LC 407](https://leetcode.com/problems/trapping-rain-water-ii/) |
| 20 | Modify Graph Edge Weights | Hard | Two-pass Dijkstra with edge adjustment | [LC 2699](https://leetcode.com/problems/modify-graph-edge-weights/) |
| 21 | Word Ladder II | Hard | BFS for distance + DFS for all shortest paths | [LC 126](https://leetcode.com/problems/word-ladder-ii/) |

---

## Weekly Mock Interview

### Question 1: Network Delay Time

**Prompt:** You are given a network of `n` nodes labeled `1` to `n`, and a list of travel times as directed edges `times[i] = [u, v, w]`. A signal is sent from node `k`. Return the minimum time it takes for all `n` nodes to receive the signal, or `-1` if not all nodes are reachable.

**Expected approach:** Build adjacency list, run Dijkstra from `k`, return the maximum distance among all nodes (the last node to be reached determines total time). If any node has `dist = inf`, return `-1`.

**Optimal complexity:** O((V + E) log V) time, O(V + E) space

**Follow-up 1:** What if some edges have negative weights? Which algorithm would you switch to and why? (Bellman-Ford, O(VE). Discuss why Dijkstra breaks with negative edges — the greedy invariant fails.)

**Follow-up 2:** What if you need the shortest path not just from one source but between all pairs? (Floyd-Warshall in O(V³) if V is small, otherwise run Dijkstra V times in O(V(V+E) log V).)

**Follow-up 3:** Can you reconstruct the actual shortest path, not just the distance? (Maintain a `parent` array, updated whenever `dist[v]` improves.)

**Time target:** 20 minutes

### Question 2: Cheapest Flights Within K Stops

**Prompt:** There are `n` cities connected by flights. Given `flights[i] = [from, to, price]`, `src`, `dst`, and `k`, find the cheapest price from `src` to `dst` with at most `k` stops. Return `-1` if no such route exists.

**Expected approach:** Modified Bellman-Ford with exactly `k+1` relaxation rounds (each round adds one edge to the path). Keep a copy of the previous round's distances to avoid using freshly updated values within the same round.

**Alternative:** State-space Dijkstra with state `(cost, city, stops_remaining)`. Process states in order of cost.

**Optimal complexity:** O(K × E) for Bellman-Ford, O((V×K + E×K) log(V×K)) for state Dijkstra

**Follow-up 1:** Why can't you use standard Dijkstra here? (Because the constraint on K stops means a longer path might be valid while a shorter but more expensive path through fewer stops gets finalized first. The "stale entry" check might skip the valid K-stop path.)

**Follow-up 2:** What if K is very large (essentially unlimited stops)? (Reduces to standard Dijkstra.)

**Follow-up 3:** What if prices can be negative? (Use Bellman-Ford; the K-iteration version naturally handles this. State Dijkstra would break.)

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Visited set in Dijkstra:** The `if d > dist[u]: continue` check is equivalent to a visited set. Don't add a separate visited set AND skip stale entries — pick one approach. Adding a `visited` set without the stale check can cause bugs if you push multiple entries for the same node.
- **Negative cycles:** Bellman-Ford detects them, but only those reachable from the source. If you need to detect all negative cycles, run from every node or use Floyd-Warshall (check diagonal for negative values).
- **State-space explosion:** In state-space Dijkstra, the number of states is `V × |state_space|`. Keep the state space small — a bitmask of 20 elements already has 10⁶ states.
- **Integer overflow:** When distances are large (10⁹ edges), use `Integer.MAX_VALUE` or `(int) 1e9` as a sentinel. Be careful with `dist[u] + w` overflow — always guard with `if (dist[u] != Integer.MAX_VALUE)` before adding, or use `long[]` arrays.
- **0-indexed vs 1-indexed nodes:** Many LC problems use 1-indexed nodes. Allocate arrays of size `n+1` or convert to 0-indexed. Off-by-one errors are the most common Dijkstra bug.
- **Multiple edges between same pair:** The graph may have parallel edges. Your adjacency list handles this naturally, but Floyd-Warshall initialization should take the minimum weight among parallel edges.
- **Disconnected graphs:** After running Dijkstra, check for `inf` distances. The answer might be `-1` or "impossible."

---

## Further Reading

- [VNOI Wiki — Shortest Path Algorithms](https://wiki.vnoi.info/)
- [CP-Algorithms — Dijkstra's Algorithm](https://cp-algorithms.com/graph/dijkstra.html)
- [CP-Algorithms — Bellman-Ford](https://cp-algorithms.com/graph/bellman_ford.html)
- [Big-O Coding CP Level 2 — Lecture 4: Shortest Paths](https://bigocoding.com/cp-level-2/)
