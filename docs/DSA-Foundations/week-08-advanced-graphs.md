---
sidebar_position: 9
title: "Week 8: Advanced Graphs"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 8: Advanced Graphs

Last week you mastered BFS and DFS on unweighted graphs. This week the edges get **weights**, the algorithms get smarter, and entirely new structural tools — **Union-Find**, **topological sort**, and **minimum spanning trees** — enter your toolkit. These patterns dominate interviews at every level.

:::tip How to read this chapter (for first-time learners)
You do **not** need to memorise seven algorithms at once. Each one is just BFS/DFS with a small twist. Read it in this order:

1. **Skim the glossary and decision guide below** so the vocabulary feels familiar.
2. For each algorithm, read the **plain-English intuition and analogy first**, then the step list, then the code, then play the interactive visualization.
3. After each algorithm, try to re-explain it out loud in one sentence. If you can't, re-read the analogy.
4. Only after you understand *one* shortest-path algorithm (Dijkstra) should you move to the others — they all reuse the same "relaxation" idea.

Everything in this chapter builds on one primitive you already know: **visit a node, look at its neighbours, maybe update something.** The differences are *what* you update and *in what order* you visit.
:::

### Prerequisite recap (from Week 7)

Before starting, make sure these Week 7 ideas feel automatic. If any are shaky, review them first — this week assumes them.

| Concept | One-line reminder | Why you need it this week |
|---|---|---|
| **Adjacency list** | `Map<node, List<neighbours>>` | Every algorithm here iterates neighbours of a node |
| **BFS (queue)** | Explore level by level; first time you reach a node is the shortest *in edges* | Kahn's topo sort and bipartite check are BFS variants |
| **DFS (recursion/stack)** | Go deep, backtrack | Tarjan's bridges and cycle detection are DFS variants |
| **Visited set** | Never process a node twice | Prevents infinite loops in every algorithm below |
| **Directed vs undirected** | Directed: add one edge; undirected: add both directions | MST/Union-Find are undirected; topo sort is directed |

The single new idea this week is that edges carry **weights**, so "shortest" now means "smallest total weight" instead of "fewest edges." Plain BFS can no longer answer that — hence Dijkstra and friends.

### Glossary — read this once, refer back often

| Term | Plain-English meaning |
|---|---|
| **Weight / cost** | A number attached to an edge (distance, time, price, probability). |
| **Weighted graph** | A graph whose edges have weights. |
| **Shortest path** | The path between two nodes with the smallest *sum of weights* (not fewest edges). |
| **Relaxation** | Checking "is going through node `u` a cheaper way to reach node `v` than what I have so far?" and, if so, updating `v`'s recorded distance. This one operation is the heart of Dijkstra and Bellman-Ford. |
| **`dist[]` array** | Best-known distance from the source to each node so far. Starts at infinity, shrinks as we relax. |
| **Min-heap / priority queue** | A structure that always hands you the smallest item next. Lets Dijkstra always expand the currently-closest node. |
| **DAG** | Directed Acyclic Graph — directed edges, no cycles. Required for topological sort. |
| **In-degree** | How many edges point *into* a node. A node with in-degree 0 has no unmet prerequisites. |
| **Connected component** | A group of nodes all reachable from each other. |
| **Disjoint set** | A partition of nodes into non-overlapping groups; managed by Union-Find. |
| **Spanning tree** | A subset of edges that connects all `V` nodes using exactly `V − 1` edges and no cycle. |
| **MST** | Minimum Spanning Tree — the spanning tree with the smallest total weight. |
| **Bipartite** | A graph whose nodes split into two groups with edges only *between* groups, never within. |
| **Bridge** | An edge whose removal disconnects the graph (a single point of failure). |

### Decision guide — "which tool do I reach for?"

Work down this list top-to-bottom; the first match is almost always right.

```
Is the question about EDGE WEIGHTS and a "shortest / cheapest path"?
├── Weights can be NEGATIVE?              → Bellman-Ford
├── Need "at most K stops/edges"?         → Bellman-Ford-style (K rounds) or modified Dijkstra
└── All weights ≥ 0?                       → Dijkstra (min-heap)

Is it about GROUPING / CONNECTIVITY ("same group?", "merge", "cycle in undirected")?
                                          → Union-Find (Disjoint Set Union)

Is it about ORDERING with DEPENDENCIES ("prerequisite", "schedule", "build order")?
                                          → Topological Sort (Kahn's BFS)

Is it "CONNECT EVERYTHING at minimum total cost"?
├── Given an edge list / sparse graph?     → Kruskal's MST (sort + Union-Find)
└── Given an adjacency list / dense graph? → Prim's MST (min-heap)

Is it "split into TWO groups with no internal conflicts" / "two-colour"?
                                          → Bipartite check (BFS 2-colouring)

Is it "find critical edges / single points of failure"?
                                          → Tarjan's bridges (DFS low-link)
```

A fuller keyword-to-technique table appears in the [Pattern Recognition Guide](#pattern-recognition-guide) later in the chapter — use this compact version while learning, that one while drilling problems.

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

**Analogy — ripples in a pond.** Drop a stone at the source. The ripple spreads outward, always reaching the *nearest* new point first. Dijkstra is that ripple, except distances aren't uniform: some directions are "slow" (heavy edges) and some are "fast" (light edges). The min-heap is what lets the ripple always grow from its closest edge first, so the moment the ripple *touches* a node you know the cheapest way to reach it.

**What "relaxation" means here (the one idea to internalise).** For every edge `u → v` with weight `w`, relaxation asks a single question:

> "I currently think the cheapest way to reach `v` costs `dist[v]`. But what if I go to `u` first (costing `dist[u]`) and then take this edge (costing `w`)? If `dist[u] + w` is smaller, I just found a shorter route — record it."

In code that is exactly the three lines inside the loop:

```java
int nd = dist[u] + w;      // cost of reaching v *through u*
if (nd < dist[v]) {         // is that cheaper than what we knew?
    dist[v] = nd;           // yes — update the best-known distance
    heap.offer(new int[]{nd, v}); // and remember to explore from v later
}
```

Every shortest-path algorithm this week (Dijkstra, Bellman-Ford) is just "relax edges, in some clever order." Dijkstra's cleverness is the *order*: always relax from the closest finalized node.

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

**Why this technique exists:** Dijkstra's greedy "closest node is final" rule silently breaks when an edge can *lower* a cost you already committed to (a negative weight). Bellman-Ford gives that up: instead of being clever about order, it just relaxes **every** edge, over and over, until nothing can improve. Slower, but bulletproof against negatives — and it can even tell you when *no* answer exists (a negative cycle that lets you loop forever getting cheaper).

**Interview signal:** "shortest path" **plus** any hint of negative values ("refund", "discount", "toll that pays you", "negative weight") = Bellman-Ford. Also the natural fit for "shortest path using at most K edges/stops," because after `k` rounds `dist[]` holds the best cost reachable in `≤ k` edges (this is the trick behind LC 787 Cheapest Flights Within K Stops).

**Analogy — rumour spreading round by round.** Imagine a rumour (the best-known distance) spreading through a crowd. In each "round," everyone tells all their neighbours the cheapest version they've heard. After round 1 the rumour has travelled at most 1 hop from the source, after round 2 at most 2 hops, and so on. Since any shortest path visits at most `V − 1` edges (more would repeat a node), after `V − 1` rounds the true cheapest cost has reached everyone. If a round *still* improves something after that, the crowd can gossip a cost down forever — a **negative cycle**.

**Why exactly `V − 1` rounds?** A shortest path can't usefully revisit a node, so it uses at most `V − 1` edges. Each round guarantees to "lock in" at least one more edge of every shortest path, so `V − 1` rounds is always enough. A `V`-th round that still lowers a distance can only mean a negative cycle.

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

**Analogy — friend groups at a party.** Everyone starts as their own group. When two people become friends (`union`), their whole groups merge into one. To answer "are these two people in the same group?" you don't compare everyone — you just ask each person "who is the *leader* (root) of your group?" (`find`) and check if it's the same person. **Path compression** is everyone learning to point straight at the leader after the first time they're asked, so future questions are instant. **Union by rank** is always merging the smaller group under the bigger group's leader, so the "who's your leader?" chains never get tall.

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

**Analogy — getting dressed.** You must put on socks before shoes, and a shirt before a jacket. Some items have no prerequisites (you can put on socks or a shirt in any order). A topological sort is any valid dressing order that never puts shoes before socks. Kahn's algorithm builds it by repeatedly grabbing whatever item has *nothing left blocking it* (in-degree 0), "wearing" it, and then removing it as a blocker from everything that depended on it — which may free up new items to wear.

A **topological ordering** of a directed acyclic graph (DAG) is a linear ordering of vertices such that for every edge u → v, u comes before v. It only exists for DAGs — a cycle makes it impossible (if putting on A requires B and B requires A, you can never start).

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

**Analogy — cheapest way to wire up towns.** You have towns (nodes) and possible cables between them (weighted edges). You want every town on the same power grid, spending the least on cable. You never build a cable that connects two towns *already* on the same grid (that's wasted money = a cycle). Both algorithms below do exactly this; they only differ in *how they hunt* for the next cheap cable:

- **Kruskal's** is a thrifty contractor with a global price list: sort *all* cables cheapest-first, and lay each one down as long as it joins two separate grids.
- **Prim's** grows *one* grid outward: from the towns already connected, always add the single cheapest cable that reaches a *new* town.

Both always produce a valid MST — pick based on the input format (see the comparison table below).

#### Kruskal's Algorithm (Edge-centric, uses Union-Find)

**Intuition:** Greedily take the globally cheapest edge that doesn't form a cycle. The Union-Find check `uf.union(a, b)` does double duty — it returns `false` exactly when `a` and `b` are already connected (adding the edge would make a cycle, so skip it) and `true` when the edge safely joins two components.

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

**Intuition:** Grow the tree outward from a single seed node. At every step you hold a min-heap of all edges that cross from "inside the tree" to "outside," and you always pull the cheapest such edge to swallow one new node. Structurally this is Dijkstra with one change: the heap key is the *edge weight to reach a node*, not the *total distance from the source*. The `if (visited[u]) continue;` guard plays the same role as Dijkstra's stale-entry guard — it discards edges that would loop back into the tree.

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

<AlgoViz
  title="Prim's MST — Grow the Tree from Node 0"
  description="Same 5-node graph as Kruskal. Edges: 0-2(2), 0-1(4), 1-2(1), 1-3(5), 3-4(3), 2-3(8). The array shows the weight of the edge that attached each node (∞ = not yet in tree)."
  steps={[
    {
      array: [0, "INF", "INF", "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0],
      variables: { heap: "[(0,0)]", mstWeight: 0, visited: "{}" },
      explanation: "Seed the tree at node 0. Push (weight 0, node 0) onto the min-heap. mstWeight starts at 0.",
      code: "heap.offer(new int[]{0, 0}); // {weight, node}"
    },
    {
      array: [0, "INF", "INF", "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0],
      secondary: [1, 2],
      variables: { popped: "(0,0)", visited: "{0}", mstWeight: 0, heap: "[(2,2),(4,1)]" },
      explanation: "Pop (0,0): add node 0 for free. Push its crossing edges: 0-2 (w2) and 0-1 (w4).",
      code: "visited[0]=true; heap.offer({2,2}); heap.offer({4,1});"
    },
    {
      array: [0, "INF", 2, "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0, 2],
      secondary: [1, 3],
      variables: { popped: "(2,2)", visited: "{0,2}", mstWeight: 2, heap: "[(1,1),(4,1),(8,3)]" },
      explanation: "Cheapest crossing edge is 0-2 (w2). Add node 2, mstWeight=2. Push 2-1 (w1) and 2-3 (w8).",
      code: "visited[2]=true; mstWeight += 2; // push 2's edges"
    },
    {
      array: [0, 1, 2, "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0, 1, 2],
      secondary: [3],
      variables: { popped: "(1,1)", visited: "{0,1,2}", mstWeight: 3, heap: "[(4,1),(5,3),(8,3)]" },
      explanation: "Pop (1,1): edge 2-1 (w1) is cheapest. Add node 1, mstWeight=3. Push 1-3 (w5). Note (4,1) is now a stale duplicate.",
      code: "visited[1]=true; mstWeight += 1; // push 1-3 (w5)"
    },
    {
      array: [0, 1, 2, "INF", "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0, 1, 2],
      secondary: [1],
      variables: { popped: "(4,1)", skipped: true, reason: "node 1 already in tree" },
      explanation: "Pop (4,1): node 1 is already in the tree. Skip — the visited guard discards this stale edge (adding it would form a cycle).",
      code: "if (visited[u]) continue; // skip"
    },
    {
      array: [0, 1, 2, 5, "INF"],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0, 1, 2, 3],
      secondary: [4],
      variables: { popped: "(5,3)", visited: "{0,1,2,3}", mstWeight: 8, heap: "[(3,4),(8,3)]" },
      explanation: "Cheapest edge reaching a new node is 1-3 (w5). Add node 3, mstWeight=8. Push 3-4 (w3).",
      code: "visited[3]=true; mstWeight += 5; // push 3-4 (w3)"
    },
    {
      array: [0, 1, 2, 5, 3],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4" },
      highlights: [0, 1, 2, 3, 4],
      variables: { popped: "(3,4)", visited: "{0,1,2,3,4}", mstWeight: 11, heap: "[(8,3)]" },
      explanation: "Add node 4 via edge 3-4 (w3), mstWeight=11. All 5 nodes connected. The leftover (8,3) is stale and will be skipped. MST weight = 0+2+1+5+3 = 11 — identical to Kruskal's answer.",
      code: "visited[4]=true; mstWeight += 3; // done: 11"
    }
  ]}
/>

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

**Analogy — seating rivals at two tables.** You must seat everyone at one of two tables so that no two people who dislike each other (connected by an edge) share a table. Start with anyone, seat them at table A, and seat all their rivals at table B, all of *those* people's rivals back at table A, and so on. If you ever find someone who *must* sit at both tables at once (an edge between two same-table people), it's impossible — the graph is not bipartite. That forced contradiction is exactly an **odd-length cycle**. The `colour[]` array records which table (0 or 1) each person got; `-1` means "not seated yet."

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

<AlgoViz
  title="Bipartite Check — BFS 2-Colouring (two components)"
  description="Component A is a 4-cycle 0-1-2-3-0 (bipartite). Component B is edge 4-5. The array holds each node's colour: -1 = unseated, 0 = table A, 1 = table B."
  steps={[
    {
      array: [-1, -1, -1, -1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [],
      variables: { colour: "[-1,-1,-1,-1,-1,-1]", note: "-1 = uncoloured" },
      explanation: "Initialise every node to -1 (unseated). We will start BFS from each still-uncoloured node so disconnected components are all checked.",
      code: "Arrays.fill(colour, -1);"
    },
    {
      array: [0, -1, -1, -1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0],
      variables: { component: "A", queue: "[0]", colour: "[0,-1,-1,-1,-1,-1]" },
      explanation: "Component A: start at node 0, seat it at table 0. Enqueue it.",
      code: "colour[0] = 0; queue.add(0);"
    },
    {
      array: [0, 1, -1, 1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [0],
      secondary: [1, 3],
      variables: { popped: 0, "neighbours": "1, 3", colour: "[0,1,-1,1,-1,-1]" },
      explanation: "Pop node 0. Its neighbours 1 and 3 are uncoloured -> give them the opposite colour, 1. Enqueue both.",
      code: "colour[v] = 1 - colour[u]; // 1 - 0 = 1"
    },
    {
      array: [0, 1, 0, 1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [1],
      secondary: [2],
      variables: { popped: 1, "neighbour 0": "colour 0 != 1, OK", "neighbour 2": "-> 0", colour: "[0,1,0,1,-1,-1]" },
      explanation: "Pop node 1 (colour 1). Neighbour 0 already has colour 0 (differs — fine). Neighbour 2 is new -> colour 0.",
      code: "// 0 already coloured & differs: no conflict"
    },
    {
      array: [0, 1, 0, 1, -1, -1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [3, 2],
      variables: { popped: "3, 2", check: "all edges join colour 0 with colour 1", conflicts: 0 },
      explanation: "Pop nodes 3 and 2. Every neighbour is already coloured and every edge connects a 0 with a 1 — no same-colour edge. Component A is bipartite: table A = {0,2}, table B = {1,3}.",
      code: "// no colour[v] == colour[u] triggered"
    },
    {
      array: [0, 1, 0, 1, 0, 1],
      labels: { 0: "node 0", 1: "node 1", 2: "node 2", 3: "node 3", 4: "node 4", 5: "node 5" },
      highlights: [4, 5],
      variables: { component: "B", colour: "[0,1,0,1,0,1]", result: "true" },
      explanation: "Node 4 is still -1, so the outer loop starts a NEW BFS there (colour 0), colouring 5 as 1. No conflicts anywhere -> return true. (Skipping this restart is the classic bug: you'd never check component B.)",
      code: "for (start...) if (colour[start] == -1) { /* new BFS */ }"
    }
  ]}
/>

**Complexity:** O(V + E).

**Where it would fail:** add edge 0-2 to component A above. Now the 4-cycle becomes two triangles (odd cycles). BFS would try to colour node 2 as `1 - colour[0] = 1`, but node 2 already holds colour 0 from the path through node 1 — a same-colour edge, so `return false`. Any odd cycle forces exactly this contradiction.

### 1.7 Tarjan's Algorithm — Finding Bridges

**Why this technique exists:** In a network you often need to know the **single points of failure** — the connections whose removal would split the network in two. Such an edge is called a **bridge**. Checking each edge by removing it and re-running a connectivity test costs O(E · (V+E)); Tarjan finds *all* bridges in a single DFS pass, O(V + E). This is the classic solution to LeetCode 1192 "Critical Connections in a Network."

**Interview signal:** "critical connection", "single point of failure", "edge whose removal disconnects the graph", or "bridge" all point here. It appears rarely, but is nearly impossible to derive on the spot — so learn the template.

**Analogy — the only road to a village.** Picture towns joined by roads. A road is a **bridge** if it's the *only* way to get from one side to the other — remove it and some towns become unreachable. A road that's part of a loop is never a bridge, because you can always detour around the loop. So the whole trick is: **an edge is a bridge exactly when it is part of no cycle.** Tarjan detects "is this edge part of a cycle?" cheaply using two timestamps per node.

**The two numbers every node gets.** As DFS explores, it stamps each node the moment it first arrives:

- **`disc[u]` (discovery time):** a counter — the order in which DFS first reached `u`. Never changes once set.
- **`low[u]` (low-link):** the *smallest* `disc` value reachable from `u` by going down its DFS subtree and then taking **at most one** "back edge" (an edge to an already-visited ancestor). Intuitively, "the earliest-discovered node I can climb back up to."

**The bridge test.** For a tree edge `u → v` (the DFS descends from `u` into a fresh `v`), the edge is a bridge if and only if:

```
low[v] > disc[u]
```

Read it as: "from `v` and everything below it, there is **no** back edge that reaches `u` or anything discovered before `u`." If `v`'s subtree can't loop back to `u` or earlier, then this edge is the only link — a bridge. If it *could* loop back (`low[v] <= disc[u]`), the edge sits on a cycle and is safe.

**Two edge cases to respect:** (1) don't treat the edge back to your immediate parent as a back edge, and (2) update `low[u]` with `disc[v]` for a back edge but with `low[v]` for a tree edge (after recursing).

```java
import java.util.*;

class BridgeFinder {
    List<List<Integer>> graph;
    int[] disc, low;
    int timer = 0;
    List<List<Integer>> bridges = new ArrayList<>();

    public List<List<Integer>> findBridges(int n, List<List<Integer>> graph) {
        this.graph = graph;
        disc = new int[n];
        low = new int[n];
        Arrays.fill(disc, -1); // -1 = unvisited
        for (int i = 0; i < n; i++)
            if (disc[i] == -1) dfs(i, -1);
        return bridges;
    }

    private void dfs(int u, int parent) {
        disc[u] = low[u] = timer++;
        for (int v : graph.get(u)) {
            if (v == parent) continue;          // skip the edge we came from
            if (disc[v] == -1) {                 // tree edge: v is unvisited
                dfs(v, u);
                low[u] = Math.min(low[u], low[v]);
                if (low[v] > disc[u])            // bridge test
                    bridges.add(Arrays.asList(u, v));
            } else {                             // back edge: v already visited
                low[u] = Math.min(low[u], disc[v]);
            }
        }
    }
}
```

<AlgoViz
  title="Tarjan's Bridges — disc[] and low[] in One DFS"
  description="Graph: 0-1, 1-2, 2-0 (a triangle) plus 1-3 (a tail). Top row = disc[] (discovery time), bottom row = low[] (earliest reachable). -1 means unvisited. Expected bridge: edge 1-3."
  steps={[
    {
      array: [0, -1, -1, -1],
      array2: [0, -1, -1, -1],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [0],
      variables: { at: "node 0", timer: 1, bridges: "[]" },
      explanation: "DFS starts at node 0. Stamp disc[0]=low[0]=0. Descend into neighbour 1.",
      code: "disc[0] = low[0] = timer++; // 0"
    },
    {
      array: [0, 1, -1, -1],
      array2: [0, 1, -1, -1],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [1],
      variables: { at: "node 1", timer: 2, bridges: "[]" },
      explanation: "Tree edge 0->1. Stamp disc[1]=low[1]=1. (Neighbour 0 is the parent, skipped.) Descend into neighbour 2.",
      code: "disc[1] = low[1] = timer++; // 1"
    },
    {
      array: [0, 1, 2, -1],
      array2: [0, 1, 2, -1],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [2],
      variables: { at: "node 2", timer: 3, bridges: "[]" },
      explanation: "Tree edge 1->2. Stamp disc[2]=low[2]=2. Node 2's neighbours are 1 (parent, skip) and 0 (already visited -> a back edge).",
      code: "disc[2] = low[2] = timer++; // 2"
    },
    {
      array: [0, 1, 2, -1],
      array2: [0, 1, 0, -1],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [2],
      secondary: [0],
      variables: { "back edge": "2->0", "low[2]": "min(2, disc[0]=0) = 0" },
      explanation: "Back edge 2->0 to an ancestor. Pull low[2] down to disc[0]=0. This means node 2 can climb back to node 0 — the triangle is a cycle.",
      code: "low[2] = Math.min(low[2], disc[0]); // 0"
    },
    {
      array: [0, 1, 2, -1],
      array2: [0, 0, 0, -1],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [1],
      secondary: [2],
      variables: { "return to 1": true, "low[1]": "min(1, low[2]=0) = 0", "bridge? low[2]>disc[1]": "0 > 1 = false" },
      explanation: "DFS returns from 2 to 1. Update low[1]=min(1,0)=0. Bridge test for edge 1-2: low[2]=0 > disc[1]=1? No. Edge 1-2 is on the cycle — NOT a bridge.",
      code: "low[1]=min(low[1],low[2]); if(low[2]>disc[1]) // false"
    },
    {
      array: [0, 1, 2, 3],
      array2: [0, 0, 0, 3],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [3],
      variables: { at: "node 3", timer: 4, "low[3]": 3, "no back edge": true },
      explanation: "Tree edge 1->3. Stamp disc[3]=low[3]=3. Node 3 is a dead end — its only neighbour is parent 1, so low[3] stays 3. It cannot reach any earlier node.",
      code: "disc[3] = low[3] = timer++; // 3"
    },
    {
      array: [0, 1, 2, 3],
      array2: [0, 0, 0, 3],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [1, 3],
      variables: { "bridge? low[3]>disc[1]": "3 > 1 = TRUE", bridges: "[[1,3]]" },
      explanation: "Return from 3 to 1. Bridge test for edge 1-3: low[3]=3 > disc[1]=1? YES. Node 3's subtree cannot loop back past node 1, so 1-3 is a BRIDGE — the single point of failure.",
      code: "if (low[3] > disc[1]) bridges.add([1,3]); // BRIDGE"
    },
    {
      array: [0, 1, 2, 3],
      array2: [0, 0, 0, 3],
      labels: { 0: "disc0", 1: "disc1", 2: "disc2", 3: "disc3" },
      labels2: { 0: "low0", 1: "low1", 2: "low2", 3: "low3" },
      highlights: [0, 1, 2, 3],
      variables: { "return to 0": true, "bridge? low[1]>disc[0]": "0 > 0 = false", result: "bridges = [[1,3]]" },
      explanation: "Return from 1 to 0. Bridge test for edge 0-1: low[1]=0 > disc[0]=0? No (it's on the triangle). DFS complete. Only bridge found: edge 1-3.",
      code: "return bridges; // [[1,3]]"
    }
  ]}
/>

**Complexity:** O(V + E) — a single DFS. **Space:** O(V + E) for the two arrays plus the recursion stack.

**Related idea — articulation points.** A *node* (not edge) whose removal disconnects the graph is an **articulation point**. The same DFS finds them with a slightly different test (`low[v] >= disc[u]`, plus a special rule for the DFS root). If a problem asks for "critical *servers*" rather than "critical *connections*," reach for articulation points.

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

---

## 7 · Second Worked Example — Redundant Connection (LC 684)

This example uses **Union-Find** instead of shortest paths, so you see the second big tool of the week in action on a full problem.

**Problem:** A tree with `n` nodes had exactly one extra edge added, creating a single cycle. Given the edge list, return the edge that can be removed so the graph becomes a tree again. If several qualify, return the last one in the input.

**Key insight:** Process edges one by one with Union-Find. Each edge tries to `union` its two endpoints. The **first** edge whose endpoints are **already in the same set** is the one that closes the cycle — that is the redundant edge.

**Input:** `edges = [[1,2],[1,3],[2,3]]`

**Trace (nodes are 1-indexed; `parent` starts as each node pointing to itself):**

| Edge | `find(a)` | `find(b)` | Same root? | Action |
|---|---|---|---|---|
| `[1,2]` | 1 | 2 | No | `union` → merge, `parent[2]=1` |
| `[1,3]` | 1 | 3 | No | `union` → merge, `parent[3]=1` |
| `[2,3]` | 1 | 1 | **Yes** | `union` returns `false` → **redundant edge found** |

By the third edge, nodes 2 and 3 already share root 1 (via the first two edges), so connecting them again forms a cycle. **Answer: `[2,3]`.**

```java
public int[] findRedundantConnection(int[][] edges) {
    int n = edges.length;
    UnionFind uf = new UnionFind(n + 1); // nodes are 1..n
    for (int[] e : edges) {
        if (!uf.union(e[0], e[1])) return e; // first edge that fails to merge
    }
    return new int[0];
}
```

Notice how the whole solution is *four lines* once you have the Union-Find template — that is exactly why the template is worth memorising.

---

## 8 · Common Bugs & Fast Debugging

When your graph solution gives a wrong or slow answer, scan this table before rewriting from scratch — most bugs are one of these.

| Symptom | Likely cause | Fix |
|---|---|---|
| Dijkstra is slow / times out | Missing the `if (d > dist[u]) continue;` stale-entry guard | Add the guard so each node is fully processed only once |
| Dijkstra gives wrong distances | Graph has negative edges | Switch to Bellman-Ford |
| `NullPointerException` on `graph.get(u)` | Node has no outgoing edges / not in the map | Use `graph.getOrDefault(u, List.of())` |
| Union-Find degrades to O(n) per op | Missing path compression or union by rank | Use both; copy the full template |
| Can't detect a cycle with Union-Find | `union` doesn't return a boolean | Make `union` return `false` when roots already match |
| Topo sort returns wrong / partial order | Forgot a node has in-degree 0, or built in-degree on the wrong endpoint | For edge `u→v`, increment `indegree[v]` (the *destination*) |
| Topo sort "hangs" logically (order too short) | The graph has a cycle | If `order.size() != n`, report impossible — that's expected behaviour |
| Bipartite check returns `true` wrongly | Only checked one component | Loop over every node and start BFS from each uncoloured one |
| Bridge finder marks everything a bridge | Treating the parent edge as a back edge | Skip `v == parent`; update `low[u]` with `low[v]` for tree edges, `disc[v]` for back edges |
| Grid Dijkstra crashes | Missing bounds / visited checks | Guard `0 <= r < rows && 0 <= c < cols` before pushing a neighbour |
| Integer overflow on `dist[u] + w` | `dist[u]` is `Integer.MAX_VALUE` | Skip relaxation when `dist[u] == Integer.MAX_VALUE` (Bellman-Ford especially) |

---

## 9 · Self-Check Questions

Try to answer each before expanding. If you can explain the "why," you understand the material — memorising the "what" is not enough.

<details>
<summary>1. Why can't plain BFS find the shortest path in a weighted graph?</summary>

BFS treats every edge as cost 1, so it finds the path with the *fewest edges*, not the *smallest total weight*. A 3-edge path of weights `1+1+1=3` is cheaper than a 1-edge path of weight `10`, but BFS would pick the single heavy edge. Dijkstra fixes this by expanding nodes in order of accumulated cost using a min-heap.
</details>

<details>
<summary>2. A node is popped from Dijkstra's heap with distance 7, but `dist[node]` is already 5. What do you do, and why?</summary>

Skip it (`if (d > dist[u]) continue;`). This is a **stale entry** — it was pushed before a shorter path (cost 5) was found. Processing it would waste time and could trigger incorrect relaxations. Its shortest distance was already finalised at 5.
</details>

<details>
<summary>3. Your graph has a negative edge. Which algorithm, and how do you know if there's even a valid answer?</summary>

Use **Bellman-Ford**. After `V − 1` relaxation rounds, do one extra pass over all edges: if any distance still improves, a **negative cycle** exists and no finite shortest path is defined (you could loop forever getting cheaper). Otherwise the distances after `V − 1` rounds are correct.
</details>

<details>
<summary>4. In Union-Find, what do path compression and union by rank each protect against?</summary>

Both keep the trees short so `find` stays near O(1). **Union by rank** prevents building a tall tree by always attaching the smaller tree under the larger. **Path compression** flattens the path to the root during `find`, so repeated queries are instant. Drop either and worst-case chains can degrade toward O(log n) or O(n).
</details>

<details>
<summary>5. Kahn's topological sort produces a result with only 4 of 6 nodes. What does that mean?</summary>

The graph has a **cycle**. Two nodes never reached in-degree 0 because they mutually depend on each other, so they never got enqueued. Whenever `order.size() != n`, no valid topological ordering exists (e.g., a course schedule with circular prerequisites is impossible).
</details>

<details>
<summary>6. When would you pick Kruskal's over Prim's for an MST — and vice versa?</summary>

**Kruskal's** shines when the input is an **edge list** and the graph is **sparse** — you just sort edges and use Union-Find (O(E log E)). **Prim's** shines when the input is an **adjacency list** and the graph is **dense** — it grows outward with a min-heap (O(E log V)) and avoids sorting all edges. Both always yield a valid minimum spanning tree.
</details>

<details>
<summary>7. What makes an edge a bridge, in one sentence — and how does `low[v] > disc[u]` capture it?</summary>

An edge is a bridge when it belongs to **no cycle** (removing it disconnects the graph). `low[v] > disc[u]` says the subtree rooted at `v` has **no back edge** reaching `u` or any earlier-discovered node — so there's no alternative loop around this edge, making it the only connection.
</details>

<details>
<summary>8. A grid problem asks for the path minimising the *maximum* single step (LC 1631/778), not the sum. Can Dijkstra still work?</summary>

Yes, with a tweak: instead of `dist[v] = dist[u] + w`, use `cost[v] = min(cost[v], max(cost[u], w))`. The min-heap still expands the smallest-cost frontier first; you've just changed how a path's cost is combined from "sum" to "max." This is why these problems are Dijkstra variants.
</details>

---

## 10 · One-Line Takeaways

If you remember nothing else, remember these:

- **Dijkstra** = BFS with a min-heap; non-negative weights only; finalise the closest node each pop.
- **Bellman-Ford** = relax *all* edges `V − 1` times; the only shortest-path tool that survives negative weights and detects negative cycles.
- **Relaxation** = "is going through `u` a cheaper way to reach `v`?" — the shared heartbeat of both shortest-path algorithms.
- **Union-Find** = near-O(1) "same group?" and "merge"; the backbone of cycle detection and Kruskal's MST.
- **Topological sort (Kahn's)** = repeatedly take a node with no unmet prerequisites; a short output means a cycle.
- **MST** = connect everything cheapest; Kruskal (edges + Union-Find) vs Prim (vertices + heap).
- **Bipartite** = 2-colour with BFS; a same-colour edge (odd cycle) means impossible.
- **Tarjan's bridges** = one DFS with `disc[]`/`low[]`; a bridge is an edge on no cycle.
