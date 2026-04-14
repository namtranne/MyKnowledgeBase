---
sidebar_position: 9
title: "Week 8: Advanced Graphs"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 8: Advanced Graphs

Last week you mastered BFS and DFS on unweighted graphs. This week the edges get **weights**, the algorithms get smarter, and entirely new structural tools — **Union-Find**, **topological sort**, and **minimum spanning trees** — enter your toolkit. These patterns dominate interviews at every level.

---

## 1 · Core Theory

### 1.1 Weighted Graphs

**Why this concept matters:** Most real-world graph problems involve costs — travel time, bandwidth, monetary cost, probability. An unweighted BFS/DFS cannot account for varying edge costs, so you need specialised algorithms (Dijkstra, Bellman-Ford, MST) that operate on weighted representations. Understanding which representation to choose is the first decision in any graph interview question.

**Interview signal:** If a problem mentions "cost", "weight", "distance", or "probability" on edges, you are dealing with a weighted graph. Build an adjacency list of `(neighbour, weight)` pairs unless the problem is dense or requires Floyd-Warshall.

In a weighted graph every edge carries a numerical cost (distance, time, probability, etc.). Representation choices:

| Representation | Storage | Edge lookup | Best for |
|---|---|---|---|
| Adjacency list of `(neighbour, weight)` | O(V + E) | O(degree) | Sparse graphs (most interview problems) |
| Adjacency matrix `w[u][v]` | O(V²) | O(1) | Dense graphs, Floyd-Warshall |
| Edge list `(u, v, w)` | O(E) | O(E) | Kruskal's MST |

**When to use this template:** Reach for this adjacency list construction whenever you receive a weighted edge list as input (the most common interview format). For directed graphs, omit the reverse edge. If you are given an adjacency matrix instead, access weights directly via `w[u][v]` without building a list.

```java
import java.util.*;

Map<Integer, List<int[]>> graph = new HashMap<>();
for (int[] e : edges) {
    graph.computeIfAbsent(e[0], k -> new ArrayList<>()).add(new int[]{e[1], e[2]});
    graph.computeIfAbsent(e[1], k -> new ArrayList<>()).add(new int[]{e[0], e[2]}); // omit for directed
}
```

### 1.2 Dijkstra's Algorithm

Finds the **shortest path from a single source** to all other nodes in a graph with **non-negative** edge weights.

**Key idea:** greedily relax the closest unvisited node, using a **min-heap (priority queue)** to pick the next node in O(log V) time.

#### Why Dijkstra works (and when it breaks)

Dijkstra is a greedy algorithm that relies on a crucial invariant: **when a node is popped from the min-heap, its shortest distance is finalized**. This works because all edge weights are non-negative — once you have found the cheapest way to reach a node, no future path through other nodes can be cheaper (adding non-negative weights can only increase the cost). With negative edges, this invariant breaks: a longer path through a negative-weight edge might actually be cheaper, meaning Dijkstra would finalize the wrong distance.

**Interview signal:** "shortest path" + "weighted graph" + "non-negative weights" = Dijkstra. If negative weights are possible, reach for Bellman-Ford. If the graph is unweighted, plain BFS is simpler and faster.

**Common misconception:** beginners think the `if (d > dist[u]) continue` guard is optional. It is essential. Without it, you process stale entries from the heap — entries that were added before a shorter path was found. This can cause incorrect relaxations and worst-case O(V^2) performance degradation.

**Algorithm:**

1. Initialise `dist[source] = 0`, all others `∞`.
2. Push `(0, source)` onto the min-heap.
3. Pop the node with smallest distance. If already visited, skip.
4. For each neighbour, if `dist[node] + weight < dist[neighbour]`, update and push.
5. Repeat until the heap is empty.

```java
import java.util.*;

public static int[] dijkstra(Map<Integer, List<int[]>> graph, int source, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    heap.offer(new int[]{0, source});

    while (!heap.isEmpty()) {
        int[] cur = heap.poll();
        int d = cur[0], u = cur[1];
        if (d > dist[u]) continue;
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            int v = edge[0], w = edge[1];
            int nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                heap.offer(new int[]{nd, v});
            }
        }
    }
    return dist;
}
```

<AlgoViz
  title="Dijkstra's Algorithm — Distance Array Relaxation"
  description="Graph: 4 nodes. Edges: 0→1(4), 0→2(1), 2→1(2), 1→3(1), 2→3(5). Source=0. Min-heap greedily relaxes the closest unvisited node."
  steps={[
    {
      array: [0, "INF", "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [0],
      variables: { heap: "[(0,0)]", source: 0 },
      explanation: "Initialise dist[0]=0 (source), all others INF. Push (cost=0, node=0) onto min-heap.",
      code: "dist[source] = 0; heap.offer(new int[]{0, source});"
    },
    {
      array: [0, 4, 1, "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [0],
      secondary: [1, 2],
      variables: { heap: "[(1,2),(4,1)]", popped: "(0,0)" },
      explanation: "Pop (0,0). Relax edges: 0→1 cost 0+4=4 (INF→4), 0→2 cost 0+1=1 (INF→1). Push both updates.",
      code: "dist[1]=4; dist[2]=1; heap.offer({4,1}); heap.offer({1,2});"
    },
    {
      array: [0, 3, 1, 6],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [2],
      secondary: [1, 3],
      variables: { heap: "[(3,1),(4,1),(6,3)]", popped: "(1,2)" },
      explanation: "Pop (1,2). Relax: 2→1 cost 1+2=3<4 → update dist[1]=3. 2→3 cost 1+5=6 → dist[3]=6. Shorter path found via node 2.",
      code: "dist[1]=3; dist[3]=6; // shorter path through node 2"
    },
    {
      array: [0, 3, 1, 4],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [1],
      secondary: [3],
      variables: { heap: "[(4,1),(4,3),(6,3)]", popped: "(3,1)" },
      explanation: "Pop (3,1). Relax: 1→3 cost 3+1=4<6 → update dist[3]=4. Path 0→2→1→3 costs only 4.",
      code: "dist[3]=4; // path 0→2→1→3"
    },
    {
      array: [0, 3, 1, 4],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [],
      secondary: [1],
      variables: { popped: "(4,1)", skipped: true, reason: "4 > dist[1]=3" },
      explanation: "Pop (4,1): stale entry! Cost 4 > current dist[1]=3. Skip. This guard prevents reprocessing outdated heap entries.",
      code: "if (d > dist[u]) continue; // skip stale entry"
    },
    {
      array: [0, 3, 1, 4],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [3],
      variables: { popped: "(4,3)", finalised: true },
      explanation: "Pop (4,3). dist[3]=4 matches — node 3 finalised. No outgoing edges to relax from node 3.",
      code: "// node 3 finalised at distance 4"
    },
    {
      array: [0, 3, 1, 4],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [0, 1, 2, 3],
      variables: { "dist[]": "[0, 3, 1, 4]", paths: "0, 0→2→1, 0→2, 0→2→1→3" },
      explanation: "Pop (6,3): stale (6>4), skip. Heap empty. Final shortest distances: [0, 3, 1, 4]. Greedy relaxation via min-heap guarantees optimality.",
      code: "return dist; // [0, 3, 1, 4]"
    }
  ]}
/>

**Complexity:** O((V + E) log V) with a binary heap.

**When Dijkstra fails:** Negative edge weights. Use Bellman-Ford (O(V·E)) instead.

#### Bellman-Ford Algorithm

Bellman-Ford relaxes **all edges V − 1 times**, correctly handling **negative edge weights** and detecting **negative cycles**. Unlike Dijkstra (which greedily finalises nodes), Bellman-Ford progressively tightens distance estimates across multiple rounds, guaranteeing convergence after V − 1 iterations.

```java
import java.util.*;

public static int[] bellmanFord(int n, int[][] edges, int source) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    for (int round = 0; round < n - 1; round++) {
        for (int[] e : edges) {
            if (dist[e[0]] != Integer.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
            }
        }
    }
    for (int[] e : edges) {
        if (dist[e[0]] != Integer.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]])
            return null; // negative cycle detected
    }
    return dist;
}
```

<AlgoViz
  title="Bellman-Ford — Relax All Edges V-1 Times"
  description="4 nodes, edges: (0,1,4), (0,2,5), (1,2,-3), (2,3,2). Source=0. Negative edge 1→2 makes Dijkstra fail, but Bellman-Ford handles it."
  steps={[
    {
      array: [0, "INF", "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [0],
      variables: { rounds: "V-1 = 3", edges: "(0,1,4) (0,2,5) (1,2,-3) (2,3,2)" },
      explanation: "Initialise dist[0]=0, all others INF. Will perform V-1=3 rounds, each relaxing all 4 edges.",
      code: "Arrays.fill(dist, INF); dist[source] = 0;"
    },
    {
      array: [0, 4, 5, "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [1, 2],
      variables: { round: 1, "edge (0,1,4)": "dist[1]=0+4=4", "edge (0,2,5)": "dist[2]=0+5=5" },
      explanation: "Round 1, first two edges: (0,1,4) → dist[1]=4. (0,2,5) → dist[2]=5.",
      code: "dist[1] = 0 + 4; dist[2] = 0 + 5;"
    },
    {
      array: [0, 4, 1, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [2, 3],
      variables: { round: 1, "edge (1,2,-3)": "dist[2]=min(5,4-3)=1", "edge (2,3,2)": "dist[3]=1+2=3" },
      explanation: "Round 1, remaining edges: (1,2,-3) → dist[2]=4+(-3)=1 < 5, update! (2,3,2) → dist[3]=1+2=3. Negative edge improved the path.",
      code: "dist[2] = 4 + (-3); // 1, via negative edge\ndist[3] = 1 + 2; // 3"
    },
    {
      array: [0, 4, 1, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [],
      variables: { round: 2, changes: "none" },
      explanation: "Round 2: relax all 4 edges again. No improvement found — all distances already optimal. Early convergence.",
      code: "// round 2: no dist[v] improves, skip"
    },
    {
      array: [0, 4, 1, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [],
      variables: { round: 3, changes: "none" },
      explanation: "Round 3: still no changes. All V-1 rounds complete.",
      code: "// round 3: no updates"
    },
    {
      array: [0, 4, 1, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [],
      variables: { negativeCycle: false, check: "one extra pass" },
      explanation: "Negative cycle check: scan all edges one more time. If any distance still improves, a negative cycle exists. None triggered here.",
      code: "if (dist[e[0]] + e[2] < dist[e[1]]) return null; // safe"
    },
    {
      array: [0, 4, 1, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3" },
      highlights: [0, 1, 2, 3],
      variables: { "dist[]": "[0, 4, 1, 3]", "best path to 2": "0→1→2 (cost 1)", complexity: "O(V·E)" },
      explanation: "Done. dist=[0,4,1,3]. The negative edge 1→2 created a shorter path to node 2 (cost 1 vs 5 directly). Dijkstra would miss this.",
      code: "return dist; // [0, 4, 1, 3]"
    }
  ]}
/>

**Complexity:** O(V · E). Use when the graph may contain negative edge weights.

### 1.3 Union-Find (Disjoint Set Union — DSU)

**Why this technique exists:** Many graph problems boil down to answering "are these two nodes in the same group?" or "merge these two groups". A naive approach (BFS/DFS each query) costs O(V + E) per query. Union-Find answers both operations in nearly O(1) amortised time, making it indispensable for problems that process edges or queries incrementally.

**Interview signal:** When you see "connect", "merge", "group", "same component", "cycle detection in undirected graph", or "dynamic connectivity", Union-Find is almost always the right tool. It is also the backbone of Kruskal's MST.

**Common mistake:** Forgetting to return a boolean from `union` — this boolean tells you whether a real merge happened. Without it, you cannot detect cycles (Redundant Connection) or count the number of components remaining.

Tracks a collection of **disjoint sets** and supports two operations efficiently:

- **find(x):** return the representative (root) of the set containing x.
- **union(x, y):** merge the sets containing x and y.

Two critical optimisations make both operations nearly O(1) amortised — O(α(n)), where α is the inverse Ackermann function:

| Optimisation | What it does |
|---|---|
| **Path compression** | During `find`, point every visited node directly at the root |
| **Union by rank** | Attach the shorter tree under the taller tree |

**When to use this template:** Use this Union-Find class whenever a problem requires tracking connected components, detecting cycles in undirected graphs, or merging groups of elements. Copy this template verbatim into your solution — it handles both path compression and union by rank, giving you O(alpha(n)) amortised per operation.

```java
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]); // path compression
        return parent[x];
    }

    boolean union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false;
        if (rank[rx] < rank[ry]) { int tmp = rx; rx = ry; ry = tmp; }
        parent[ry] = rx;
        if (rank[rx] == rank[ry]) rank[rx]++;
        return true;
    }
}
```

<AlgoViz
  title="Union-Find — Merge and Find with Path Compression"
  description="Union-Find on 5 nodes. Operations: union(0,1), union(2,3), union(1,3), find(3) with path compression."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=1", 2: "p=2", 3: "p=3", 4: "p=4" },
      highlights: [],
      variables: { components: 5, parent: "[0,1,2,3,4]", rank: "[0,0,0,0,0]" },
      explanation: "Init: each node is its own parent (root). 5 separate components.",
      code: "for (int i = 0; i < n; i++) parent[i] = i;"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=0", 2: "p=2", 3: "p=3", 4: "p=4" },
      highlights: [0, 1],
      variables: { components: 4, parent: "[0,0,2,3,4]", rank: "[1,0,0,0,0]" },
      explanation: "union(0, 1): find(0)=0, find(1)=1. Different roots → attach 1 under 0. rank[0] increases to 1.",
      code: "parent[1] = 0; rank[0]++; // {0,1} merged"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=0", 2: "p=2", 3: "p=2", 4: "p=4" },
      highlights: [2, 3],
      variables: { components: 3, parent: "[0,0,2,2,4]", rank: "[1,0,1,0,0]" },
      explanation: "union(2, 3): find(2)=2, find(3)=3. Different → attach 3 under 2. Now {0,1} and {2,3} are two components.",
      code: "parent[3] = 2; rank[2]++; // {2,3} merged"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=0", 2: "p=0", 3: "p=2", 4: "p=4" },
      highlights: [0, 1, 2, 3],
      variables: { components: 2, parent: "[0,0,0,2,4]", rank: "[2,0,1,0,0]" },
      explanation: "union(1, 3): find(1)→0, find(3)→2. Different roots. rank[0]=1 > rank[2]=1? Equal → attach 2 under 0, bump rank. {0,1,2,3} connected.",
      code: "parent[2] = 0; rank[0]++; // {0,1,2,3} merged"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=0", 2: "p=0", 3: "p=0", 4: "p=4" },
      highlights: [3],
      secondary: [0],
      variables: { "find(3)": "3→2→0", pathCompressed: true, parent: "[0,0,0,0,4]" },
      explanation: "find(3): follows 3→2→0. Path compression points 3 directly to root 0. Future lookups are O(1).",
      code: "if (parent[x] != x) parent[x] = find(parent[x]); // path compression"
    },
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "p=0", 1: "p=0", 2: "p=0", 3: "p=0", 4: "p=0" },
      highlights: [0, 1, 2, 3, 4],
      variables: { components: 1, parent: "[0,0,0,0,0]" },
      explanation: "union(0, 4): find(0)=0, find(4)=4. Merge → parent[4]=0. All 5 nodes in one component.",
      code: "parent[4] = 0; // all connected"
    }
  ]}
/>

**Common interview applications:** cycle detection in undirected graphs, connected components, Kruskal's MST, accounts merge, dynamic connectivity.

### 1.4 Topological Sort (Kahn's BFS Algorithm)

**Why this technique exists:** Many real-world problems have dependency orderings — courses with prerequisites, build systems, task scheduling. Topological sort linearises a DAG so that every dependency is satisfied before the dependent. Without it, you would need to repeatedly scan for "ready" nodes, which is far less efficient.

**Interview signal:** Keywords like "prerequisite", "dependency", "ordering", "schedule", or "can all tasks be completed" almost always signal topological sort. If the problem says "detect if a valid ordering exists", Kahn's also doubles as a cycle detector — if the output has fewer than n nodes, a cycle exists.

**Common mistake:** Assuming a unique topological order exists. In general, multiple valid orderings are possible. Only when the DAG forms a single chain is the ordering unique. Kahn's BFS explores all zero-indegree nodes at each level, and tie-breaking is arbitrary.

A **topological ordering** of a directed acyclic graph (DAG) is a linear ordering of vertices such that for every edge u → v, u comes before v. It only exists for DAGs — a cycle makes it impossible.

**Kahn's algorithm (BFS-based):**

1. Compute the in-degree of every node.
2. Enqueue all nodes with in-degree 0.
3. Dequeue a node, add it to the result, and reduce the in-degree of its neighbours.
4. If a neighbour's in-degree drops to 0, enqueue it.
5. If the result contains all nodes, it is a valid topological order. Otherwise a cycle exists.

**When to use this template:** Use Kahn's BFS whenever you need a topological ordering of a DAG or need to detect cycles in a directed graph. The BFS variant is generally preferred in interviews over DFS post-order because it is iterative (no stack overflow risk) and naturally produces the ordering in forward direction.

```java
import java.util.*;

public static List<Integer> topologicalSort(List<List<Integer>> graph, int n) {
    int[] indegree = new int[n];
    for (int u = 0; u < n; u++)
        for (int v : graph.get(u)) indegree[v]++;

    Queue<Integer> queue = new ArrayDeque<>();
    for (int v = 0; v < n; v++)
        if (indegree[v] == 0) queue.add(v);

    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int v : graph.get(u)) {
            if (--indegree[v] == 0) queue.add(v);
        }
    }
    return order.size() == n ? order : List.of(); // empty → cycle
}
```

<AlgoViz
  title="Topological Sort — Kahn's BFS Algorithm"
  description="DAG: 0→2, 1→2, 2→3, 2→4, 3→5, 4→5. Process zero-indegree nodes first, decrement neighbors."
  steps={[
    {
      array: [0, 0, 2, 1, 1, 2],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1],
      variables: { order: "[]" },
      explanation: "Compute in-degrees: node 0=0, node 1=0, node 2=2, node 3=1, node 4=1, node 5=2. Enqueue nodes with in-degree 0: [0, 1].",
      code: "for (v : nodes) if (indegree[v] == 0) queue.add(v);"
    },
    {
      array: [0, 0, 2, 1, 1, 2],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0],
      stack: ["1"],
      variables: { order: "[0]", "indegree[2]": "2→1" },
      explanation: "Dequeue node 0. Add to order. Decrement neighbor 2: in-degree 2→1. Queue = [1].",
      code: "u = queue.poll(); order.add(0); indegree[2]--;"
    },
    {
      array: [0, 0, 1, 1, 1, 2],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1],
      stack: ["2"],
      variables: { order: "[0, 1]", "indegree[2]": "1→0" },
      explanation: "Dequeue node 1. Add to order. Decrement neighbor 2: in-degree 1→0. Enqueue 2. Queue = [2].",
      code: "u = queue.poll(); order.add(1); indegree[2]--; queue.add(2);"
    },
    {
      array: [0, 0, 0, 1, 1, 2],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1, 2],
      stack: ["3", "4"],
      variables: { order: "[0, 1, 2]", "indegree[3]": "0", "indegree[4]": "0" },
      explanation: "Dequeue node 2. Add to order. Decrement neighbors 3 (1→0) and 4 (1→0). Enqueue both. Queue = [3, 4].",
      code: "u = queue.poll(); order.add(2); // 3 and 4 reach indegree 0"
    },
    {
      array: [0, 0, 0, 0, 1, 2],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1, 2, 3],
      stack: ["4"],
      variables: { order: "[0, 1, 2, 3]", "indegree[5]": "2→1" },
      explanation: "Dequeue node 3. Add to order. Decrement neighbor 5: in-degree 2→1. Not zero yet. Queue = [4].",
      code: "u = queue.poll(); order.add(3); indegree[5]--;"
    },
    {
      array: [0, 0, 0, 0, 0, 1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1, 2, 3, 4],
      stack: ["5"],
      variables: { order: "[0, 1, 2, 3, 4]", "indegree[5]": "1→0" },
      explanation: "Dequeue node 4. Add to order. Decrement neighbor 5: in-degree 1→0. Enqueue 5. Queue = [5].",
      code: "u = queue.poll(); order.add(4); indegree[5]--; queue.add(5);"
    },
    {
      array: [0, 0, 0, 0, 0, 0],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0, 1, 2, 3, 4, 5],
      stack: [],
      variables: { order: "[0, 1, 2, 3, 4, 5]", valid: true },
      explanation: "Dequeue node 5. Queue empty. All 6 nodes processed (6 == n) → valid topological order. No cycle exists.",
      code: "return order.size() == n ? order : List.of(); // valid!"
    }
  ]}
/>

**Complexity:** O(V + E).

### 1.5 Minimum Spanning Tree (MST)

**Why this technique exists:** MST solves the fundamental problem of connecting all nodes at minimum total cost — think network cabling, road construction, or clustering. It also provides a lower bound for problems like the Travelling Salesman.

**Interview signal:** "minimum cost to connect all nodes", "minimum total edge weight to span the graph", or "cheapest network" all point to MST. Choose Kruskal's when you have an edge list and the graph is sparse. Choose Prim's when you have an adjacency list and the graph is dense.

A **spanning tree** of a connected undirected graph uses exactly V − 1 edges to connect all V vertices. The **minimum** spanning tree minimises the total edge weight.

#### Kruskal's Algorithm (Edge-centric, uses Union-Find)

1. Sort all edges by weight.
2. Iterate through edges; add each edge if it connects two different components (Union-Find check).
3. Stop after adding V − 1 edges.

```java
import java.util.*;

public static int kruskal(int n, int[][] edges) {
    Arrays.sort(edges, (a, b) -> a[2] - b[2]); // sort by weight
    UnionFind uf = new UnionFind(n);
    int mstWeight = 0, edgesUsed = 0;

    for (int[] e : edges) {
        if (uf.union(e[0], e[1])) {
            mstWeight += e[2];
            if (++edgesUsed == n - 1) break;
        }
    }
    return mstWeight;
}
```

<AlgoViz
  title="Kruskal's MST — Sort Edges, Greedily Add with Union-Find"
  description="5 nodes, 6 edges. Sort by weight, add edges that connect different components until n-1 edges are used."
  steps={[
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [],
      variables: { mstWeight: 0, edgesUsed: 0, target: "n-1 = 4" },
      explanation: "6 edges sorted by weight: (1,2,w=1), (0,2,w=2), (3,4,w=3), (0,1,w=4), (1,3,w=5), (2,3,w=8). Need 4 edges for MST.",
      code: "Arrays.sort(edges, (a, b) -> a[2] - b[2]);"
    },
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [0],
      variables: { mstWeight: 1, edgesUsed: 1, edge: "1-2 (w=1)" },
      explanation: "Edge (1,2, w=1): find(1)=1, find(2)=2. Different components → add to MST. Weight = 1.",
      code: "uf.union(1, 2); mstWeight += 1; edgesUsed = 1;"
    },
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [0, 1],
      variables: { mstWeight: 3, edgesUsed: 2, edge: "0-2 (w=2)" },
      explanation: "Edge (0,2, w=2): find(0)=0, find(2)=1 (merged with 1). Different → add. Weight = 3.",
      code: "uf.union(0, 2); mstWeight += 2; edgesUsed = 2;"
    },
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [0, 1, 2],
      variables: { mstWeight: 6, edgesUsed: 3, edge: "3-4 (w=3)" },
      explanation: "Edge (3,4, w=3): find(3)=3, find(4)=4. Different → add. Weight = 6. Two components remain: {0,1,2} and {3,4}.",
      code: "uf.union(3, 4); mstWeight += 3; edgesUsed = 3;"
    },
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [0, 1, 2],
      secondary: [3],
      variables: { mstWeight: 6, edgesUsed: 3, edge: "0-1 (w=4)", skipped: true },
      explanation: "Edge (0,1, w=4): find(0)=find(1) — same component! Skip. Adding this would create a cycle.",
      code: "if (uf.union(0, 1)) ... // returns false, skip"
    },
    {
      array: [1, 2, 3, 4, 5, 8],
      labels: { 0: "1-2", 1: "0-2", 2: "3-4", 3: "0-1", 4: "1-3", 5: "2-3" },
      highlights: [0, 1, 2, 4],
      variables: { mstWeight: 11, edgesUsed: 4, edge: "1-3 (w=5)" },
      explanation: "Edge (1,3, w=5): find(1)≠find(3) → add. Weight = 11. edgesUsed = 4 = n-1. MST complete! Total cost = 11.",
      code: "uf.union(1, 3); mstWeight += 5; // edgesUsed == n-1, break"
    }
  ]}
/>

**Complexity:** O(E log E) — dominated by the sort.

#### Prim's Algorithm (Vertex-centric, uses heap)

1. Start from any node; push all its edges onto a min-heap.
2. Pop the cheapest edge leading to an unvisited node; mark that node visited.
3. Push that node's edges onto the heap.
4. Repeat until all nodes are visited.

```java
import java.util.*;

public static int prim(Map<Integer, List<int[]>> graph, int n) {
    boolean[] visited = new boolean[n];
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    heap.offer(new int[]{0, 0}); // {weight, node}
    int mstWeight = 0;

    while (!heap.isEmpty()) {
        int[] cur = heap.poll();
        int w = cur[0], u = cur[1];
        if (visited[u]) continue;
        visited[u] = true;
        mstWeight += w;
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            if (!visited[edge[0]]) heap.offer(new int[]{edge[1], edge[0]});
        }
    }
    return mstWeight;
}
```

**Complexity:** O(E log V) with a binary heap.

| | Kruskal's | Prim's |
|---|---|---|
| Approach | Edge-based | Vertex-based |
| Data structure | Union-Find | Min-heap |
| Best for | Sparse graphs, edge list input | Dense graphs, adjacency list |
| Complexity | O(E log E) | O(E log V) |

### 1.6 Bipartite Graph Checking

**Why this technique exists:** Bipartite checking determines whether a graph's nodes can be split into two independent sets — a property needed for matching problems, scheduling (e.g., assigning tasks to two groups without conflicts), and graph colouring. The BFS 2-colouring approach is simple, efficient, and handles disconnected graphs.

**Interview signal:** "can you divide into two groups", "two-colouring", "no conflicts between same group", or "possible bipartition" all point to bipartite checking. If the problem mentions "odd cycle", it is the same question in disguise.

**Common mistake:** Forgetting to iterate over all components. A disconnected graph requires starting BFS from every unvisited node — skipping this means you only check one component and may return an incorrect `true`.

A graph is **bipartite** if you can colour every node with one of two colours so that no edge connects two nodes of the same colour. Equivalently, it contains no odd-length cycle.

**BFS 2-colouring:**

```java
import java.util.*;

public static boolean isBipartite(List<List<Integer>> graph, int n) {
    int[] colour = new int[n];
    Arrays.fill(colour, -1);

    for (int start = 0; start < n; start++) {
        if (colour[start] != -1) continue;
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(start);
        colour[start] = 0;
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int v : graph.get(u)) {
                if (colour[v] == -1) {
                    colour[v] = 1 - colour[u];
                    queue.add(v);
                } else if (colour[v] == colour[u]) {
                    return false;
                }
            }
        }
    }
    return true;
}
```

**Complexity:** O(V + E).

---

## 2 · Algorithm Complexity Comparison

| Algorithm | Time | Space | Key constraint |
|---|---|---|---|
| Dijkstra (binary heap) | O((V + E) log V) | O(V + E) | No negative weights |
| Bellman-Ford | O(V · E) | O(V) | Handles negative weights, detects negative cycles |
| Kahn's topological sort | O(V + E) | O(V + E) | DAG only |
| Kruskal's MST | O(E log E) | O(V + E) | Undirected, connected |
| Prim's MST (heap) | O(E log V) | O(V + E) | Undirected, connected |
| Union-Find (find/union) | O(α(n)) amortised | O(V) | — |
| Bipartite check (BFS) | O(V + E) | O(V) | Undirected |
| Tarjan's bridges | O(V + E) | O(V + E) | Undirected |

---

## 3 · Worked Example — Network Delay Time (LC 743)

**Problem:** Given `n` nodes and weighted directed edges `times[i] = (u, v, w)`, a signal starts at node `k`. Return the time for all nodes to receive it, or `-1` if impossible.

This is textbook **single-source shortest path** → Dijkstra.

**Input:** `times = [[2,1,1],[2,3,1],[3,4,1]]`, `n = 4`, `k = 2`

**Graph (adjacency list):**

```
2 → (1, 1), (3, 1)
3 → (4, 1)
```

**Trace — priority queue iterations:**

| Step | Pop | dist state | Heap after step |
|---|---|---|---|
| Init | — | `[∞, ∞, 0, ∞]` (1-indexed: dist[2]=0) | `[(0, 2)]` |
| 1 | `(0, 2)` | dist[1]=1, dist[3]=1 | `[(1, 1), (1, 3)]` |
| 2 | `(1, 1)` | node 1 has no outgoing edges | `[(1, 3)]` |
| 3 | `(1, 3)` | dist[4]=2 | `[(2, 4)]` |
| 4 | `(2, 4)` | node 4 has no outgoing edges | `[]` |

**Final dist:** `[_, 1, 0, 1, 2]` (index 0 unused). All nodes reached. Answer = `Math.max(1, 0, 1, 2) = 2`.

```java
import java.util.*;

public static int networkDelayTime(int[][] times, int n, int k) {
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] t : times)
        graph.computeIfAbsent(t[0], x -> new ArrayList<>()).add(new int[]{t[1], t[2]});

    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    heap.offer(new int[]{0, k});

    while (!heap.isEmpty()) {
        int[] cur = heap.poll();
        int d = cur[0], u = cur[1];
        if (d > dist[u]) continue;
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            int v = edge[0], w = edge[1];
            int nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                heap.offer(new int[]{nd, v});
            }
        }
    }

    int result = 0;
    for (int i = 1; i <= n; i++) result = Math.max(result, dist[i]);
    return result == Integer.MAX_VALUE ? -1 : result;
}
```

<AlgoViz
  title="Dijkstra — Network Delay Time"
  description="Priority queue (min-heap) processes nodes in order of shortest distance from source k = 2."
  steps={[
    {
      array: [0, 0, 0, 0],
      pointers: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [1],
      variables: { "dist[1]": "INF", "dist[2]": 0, "dist[3]": "INF", "dist[4]": "INF" },
      explanation: "Initialise: dist[2] = 0 (source), all others = INF. Push (0, 2) onto the min-heap.",
      code: "dist[k] = 0; heap.offer(new int[]{0, k});"
    },
    {
      array: [0, 0, 0, 0],
      pointers: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [1],
      secondary: [0, 2],
      variables: { "dist[1]": 1, "dist[2]": 0, "dist[3]": 1, "dist[4]": "INF" },
      explanation: "Pop (0, 2). Relax edges: 2 to 1 (cost 1), 2 to 3 (cost 1). dist[1] = 1, dist[3] = 1.",
      code: "int[] cur = heap.poll(); // (0, 2) -> relax neighbors"
    },
    {
      array: [0, 0, 0, 0],
      pointers: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [0],
      variables: { "dist[1]": 1, "dist[2]": 0, "dist[3]": 1, "dist[4]": "INF" },
      explanation: "Pop (1, 1). Node 1 has no outgoing edges. Nothing to relax.",
      code: "int[] cur = heap.poll(); // (1, 1) -> no edges"
    },
    {
      array: [0, 0, 0, 0],
      pointers: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [2],
      secondary: [3],
      variables: { "dist[1]": 1, "dist[2]": 0, "dist[3]": 1, "dist[4]": 2 },
      explanation: "Pop (1, 3). Relax edge: 3 to 4 (cost 1). dist[4] = 1 + 1 = 2.",
      code: "int[] cur = heap.poll(); // (1, 3) -> relax to node 4"
    },
    {
      array: [0, 0, 0, 0],
      pointers: { 0: "node 1", 1: "node 2", 2: "node 3", 3: "node 4" },
      highlights: [3],
      variables: { "dist[1]": 1, "dist[2]": 0, "dist[3]": 1, "dist[4]": 2, answer: 2 },
      explanation: "Pop (2, 4). No outgoing edges. Heap empty. All nodes reached. Answer = max(1, 0, 1, 2) = 2.",
      code: "return result == Integer.MAX_VALUE ? -1 : result; // returns 2"
    }
  ]}
/>

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "shortest path" + non-negative weights | Dijkstra (min-heap) | Greedy single-source shortest path in O((V+E) log V) |
| "shortest path" + negative weights allowed | Bellman-Ford | Relaxes all edges V-1 times; handles negative edges and detects negative cycles |
| "detect cycle in undirected graph" | Union-Find or DFS | UF gives O(alpha(n)) per edge; DFS gives O(V+E) total |
| "connect all nodes at minimum cost" | Kruskal's or Prim's MST | Kruskal's for edge lists (sort + UF); Prim's for adjacency lists (heap) |
| "prerequisite ordering" or "task scheduling" | Topological Sort (Kahn's BFS) | Linearises a DAG; also detects cycles when output size differs from n |
| "can you split nodes into two groups" | BFS 2-colouring (Bipartite check) | O(V+E) colouring detects odd cycles |
| "find redundant edge" or "extra connection" | Union-Find | Process edges; the first edge whose endpoints share a root is redundant |
| "number of connected components" | Union-Find or BFS/DFS | UF is best for incremental edge additions; BFS/DFS for static graphs |
| "merge accounts/groups with shared elements" | Union-Find | Merge sets sharing a common element, then collect by root |
| "shortest path in weighted grid" | Dijkstra on grid | Cells are nodes, neighbours are edges with weight from cell values |

---

## 4 · Problem Sets

### Day 1–2: Dijkstra, MST & Union-Find Foundations

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 1 | Network Delay Time ⭐ | Medium | Dijkstra | [743](https://leetcode.com/problems/network-delay-time/) |
| 2 | Min Cost to Connect All Points ⭐ | Medium | MST Kruskal / Prim | [1584](https://leetcode.com/problems/min-cost-to-connect-all-points/) |
| 3 | Redundant Connection ⭐ | Medium | Union-Find | [684](https://leetcode.com/problems/redundant-connection/) |
| 4 | Number of Provinces | Medium | Union-Find / DFS | [547](https://leetcode.com/problems/number-of-provinces/) |
| 5 | Find the Town Judge | Easy | In/out degree | [997](https://leetcode.com/problems/find-the-town-judge/) |
| 6 | Possible Bipartition | Medium | BFS colouring | [886](https://leetcode.com/problems/possible-bipartition/) |
| 7 | Cheapest Flights Within K Stops ⭐ | Medium | Modified Dijkstra / BFS | [787](https://leetcode.com/problems/cheapest-flights-within-k-stops/) |

### Day 3–4: Topological Sort & Grid Shortest Paths

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 8 | Course Schedule II ⭐ | Medium | Topological sort | [210](https://leetcode.com/problems/course-schedule-ii/) |
| 9 | Path with Maximum Probability | Medium | Modified Dijkstra (max-heap) | [1514](https://leetcode.com/problems/path-with-maximum-probability/) |
| 10 | Accounts Merge | Medium | Union-Find | [721](https://leetcode.com/problems/accounts-merge/) |
| 11 | Satisfiability of Equality Equations | Medium | Union-Find | [990](https://leetcode.com/problems/satisfiability-of-equality-equations/) |
| 12 | Swim in Rising Water ⭐ | Hard | Binary search + BFS / Dijkstra | [778](https://leetcode.com/problems/swim-in-rising-water/) |
| 13 | Path With Minimum Effort | Medium | Dijkstra on grid | [1631](https://leetcode.com/problems/path-with-minimum-effort/) |
| 14 | Find Eventual Safe States | Medium | Reverse topo / DFS | [802](https://leetcode.com/problems/find-eventual-safe-states/) |

### Day 5–7: Hard Problems — Tarjan's, Bitmask BFS & More

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 15 | Alien Dictionary ⭐ | Hard | Topological sort | [269](https://leetcode.com/problems/alien-dictionary/) |
| 16 | Longest Increasing Path in a Matrix ⭐ | Hard | DFS + memo (topo) | [329](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) |
| 17 | Reconstruct Itinerary | Hard | DFS Euler path | [332](https://leetcode.com/problems/reconstruct-itinerary/) |
| 18 | Critical Connections in a Network | Hard | Tarjan's bridges | [1192](https://leetcode.com/problems/critical-connections-in-a-network/) |
| 19 | Minimum Height Trees | Medium | Leaf trimming | [310](https://leetcode.com/problems/minimum-height-trees/) |
| 20 | Shortest Path to Get All Keys | Hard | BFS + bitmask | [864](https://leetcode.com/problems/shortest-path-to-get-all-keys/) |
| 21 | Number of Islands II | Hard | Union-Find online | [305](https://leetcode.com/problems/number-of-islands-ii/) |

---

## 5 · Mock Interviews

### Mock 1 — Weighted Shortest Path (35 min)

**Interviewer:** "Given a network of cities connected by weighted roads, find the shortest travel time from city 0 to every other city. Weights are positive."

**Candidate talk-track:**

1. "Positive weights, single source → Dijkstra."
2. Build adjacency list, initialise dist array to infinity, dist[0] = 0.
3. Code the heap-based Dijkstra template.
4. Walk through a small example showing heap pops and relaxations.

**Follow-ups:**

- **"What if some roads have negative tolls (negative weights)?"**
  "Dijkstra breaks with negative weights. I'd switch to Bellman-Ford — relax all edges V − 1 times. O(V·E)."

- **"What if we only need the shortest path to one specific destination?"**
  "I can early-return from Dijkstra as soon as I pop the target node — it's guaranteed shortest at that point."

- **"What if the graph has 10⁶ nodes but is very sparse?"**
  "Binary heap Dijkstra is O((V + E) log V), which handles sparse graphs well. For even better performance on very large sparse graphs, a Fibonacci heap gives O(V log V + E) but is rarely practical in interviews."

- **"Now the graph is a grid where the cost is the absolute height difference between adjacent cells. How do you adapt?"**
  "Each cell is a node, 4 neighbours. Weight = abs difference. Same Dijkstra — this is exactly LC 1631 Path With Minimum Effort."

### Mock 2 — Union-Find & MST (35 min)

**Interviewer:** "You're given n points on a 2D plane. Return the minimum cost to connect all points, where cost = Manhattan distance."

**Candidate talk-track:**

1. "Connect all points with minimum total cost → minimum spanning tree."
2. "With n points there are n(n-1)/2 edges. For n up to 1000, that's ~500K edges — Kruskal's with sort is fine."
3. Generate all edges, sort by weight, Union-Find to add edges greedily.
4. Alternative: Prim's starting from node 0, pushing all edges into a heap.

**Follow-ups:**

- **"What if n = 10⁵? The O(n²) edges become a problem."**
  "I'd use Prim's with a priority queue and maintain only the minimum edge to each unvisited node, avoiding generating all edges at once. Or use a KD-tree to prune candidates."

- **"How do you detect if the graph is already connected before running MST?"**
  "If Kruskal's finishes with fewer than n − 1 edges in the MST, the graph is disconnected. Same idea with Prim's — if visited count is less than n at the end."

- **"What if we want the MST but must exclude one specific edge?"**
  "I'd find the MST, then for each edge in the MST, removing it and finding the next best replacement edge. For a single excluded edge, just run MST on the filtered edge list."

- **"Now points are added dynamically one at a time. After each addition, report the MST cost."**
  "Online MST — maintain the current MST. When a new point arrives, compute its distances to all existing points, add those edges, and find any edge in the current MST that can be replaced by a cheaper new edge. Union-Find helps track components."

---

## 6 · Tips and Edge Cases

**Dijkstra pitfalls:**
- Never use Dijkstra with negative weights — it can produce wrong answers silently.
- The `if d > dist[u]: continue` guard is essential for correctness and performance; without it you process stale heap entries.
- For problems asking "shortest path with at most K stops" (LC 787), standard Dijkstra needs modification — track `(cost, node, stops)` in the heap and allow revisiting nodes with fewer stops.

**Union-Find pitfalls:**
- Always use both path compression and union by rank together. Without path compression, chains degrade to O(log n). Without union by rank, chains can degrade to O(n).
- `union` should return a boolean indicating whether a merge happened — this is how you detect cycles (Redundant Connection) or count components.
- When the problem uses non-integer labels (e.g., strings in Accounts Merge), map them to integer indices first.

**Topological sort pitfalls:**
- If the result has fewer than n nodes, a cycle exists — the answer is impossible.
- Multiple valid orderings can exist; Kahn's gives one, DFS post-order reversal gives another.
- For "Alien Dictionary" (LC 269), edge cases include: single character, conflicting orderings (cycle → return empty), and prefixes where a longer word appears before a shorter one (invalid → return empty).

**MST pitfalls:**
- Kruskal's requires an edge list; if given an adjacency list, convert first.
- For "Min Cost to Connect All Points" with n up to 1000, generating all O(n²) edges is fine. Beyond that, consider Prim's or spatial optimisations.

**Grid-as-graph problems:**
- Cells are nodes, adjacent cells are edges. Weight = some function of cell values.
- Dijkstra on a grid: state is `(cost, row, col)`. Don't forget to check bounds.
- For "Swim in Rising Water" you can also binary-search on the answer and BFS/DFS to check feasibility.

**Bipartite check:**
- A graph with no edges is bipartite.
- Always iterate over all components (the graph may be disconnected).
- An odd-length cycle means not bipartite.

**General:**
- Most "is it possible to finish all courses" problems reduce to cycle detection via topological sort.
- When a problem says "minimum cost path" think Dijkstra. When it says "minimum cost to connect everything" think MST.
- Tarjan's algorithm for bridges uses discovery time and low-link values. Practice the template — it appears rarely but is impossible to derive under pressure.
