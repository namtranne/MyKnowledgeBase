---
sidebar_position: 8
title: "Week 7: Graphs — BFS + DFS"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 7: Graphs — BFS + DFS

Graphs are one of the most versatile data structures in computer science. They model relationships — social networks, road maps, course prerequisites, pixel grids — and two traversal algorithms, **BFS** and **DFS**, unlock nearly every graph problem you will face in interviews.

---

## 1 — Core Theory

### 1.1 What Is a Graph?

A graph **G = (V, E)** consists of:

| Term | Meaning |
|------|---------|
| **V** (vertices / nodes) | The entities |
| **E** (edges) | The connections between entities |

Edges can be **directed** (one-way) or **undirected** (two-way). They can also carry **weights** (costs), but this week focuses on unweighted traversal.

### 1.2 Directed vs Undirected

| Property | Undirected | Directed |
|----------|-----------|----------|
| Edge meaning | A—B means both can reach each other | A→B means only A can reach B |
| Adjacency list storage | Add both `adj.get(a).add(b)` and `adj.get(b).add(a)` | Add only `adj.get(a).add(b)` |
| Cycle definition | A path that revisits a node (ignoring the parent edge) | A path that follows edge directions back to the start |
| Example | Friendship graph | Course prerequisites |

### 1.3 Graph Representations

#### Adjacency List (preferred for sparse graphs)

Store a mapping from each node to its list of neighbors.

```java
import java.util.*;

public static Map<Integer, List<Integer>> buildAdjList(int n, int[][] edges, boolean directed) {
    Map<Integer, List<Integer>> adj = new HashMap<>();
    for (int i = 0; i < n; i++) adj.put(i, new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        if (!directed) adj.get(e[1]).add(e[0]);
    }
    return adj;
}
```

- **Space:** O(V + E)
- **Check if edge exists:** O(degree of node)
- **Iterate neighbors:** O(degree of node)
- **Best when:** E is much smaller than V² (sparse)

#### Adjacency Matrix

Store a 2-D boolean (or weight) table.

```java
public static boolean[][] buildAdjMatrix(int n, int[][] edges, boolean directed) {
    boolean[][] matrix = new boolean[n][n];
    for (int[] e : edges) {
        matrix[e[0]][e[1]] = true;
        if (!directed) matrix[e[1]][e[0]] = true;
    }
    return matrix;
}
```

- **Space:** O(V²)
- **Check if edge exists:** O(1)
- **Iterate neighbors:** O(V)
- **Best when:** E ≈ V² (dense) or you need constant-time edge lookup

#### Edge List

Simply store an array of `int[]{u, v}` pairs (optionally with weight). Useful for Union-Find algorithms but poor for neighbor lookups.

```java
int[][] edges = {{0, 1}, {1, 2}, {2, 0}};
```

### 1.4 Depth-First Search (DFS)

DFS explores as **deep** as possible before backtracking. Think of it as walking through a maze and always turning left until you hit a dead end, then backing up.

#### Why DFS and BFS are the foundation of all graph algorithms

Every graph algorithm — cycle detection, topological sort, shortest path, connected components, bipartite checking — is built on top of either DFS or BFS. Learning these two traversals is like learning to walk before you run. DFS is preferred when you need to explore all paths, detect back edges (cycles), or process nodes in a specific recursive order (topological sort). BFS is preferred when you need the shortest path in unweighted graphs or level-by-level processing.

**The key difference in one sentence:** DFS asks "how deep can I go?" while BFS asks "what is closest to me?"

**Common misconception:** beginners think DFS and BFS always produce the same result. They visit the same set of nodes, but the ORDER is different, and this order matters. BFS guarantees shortest paths in unweighted graphs; DFS does not. DFS naturally detects cycles via back edges; BFS requires additional bookkeeping.

#### Recursive DFS

```java
public static void dfsRecursive(int node, Map<Integer, List<Integer>> adj, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : adj.getOrDefault(node, List.of())) {
        if (!visited.contains(neighbor)) {
            dfsRecursive(neighbor, adj, visited);
        }
    }
}
```

<AlgoViz
  title="Recursive DFS — Call Stack Traversal"
  description="DFS on graph: 0-1, 0-2, 1-3, 2-4, 3-4. Recursive calls build the call stack, exploring as deep as possible before backtracking."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      highlights: [],
      stack: [],
      variables: { visited: "{}" },
      explanation: "Graph with 5 nodes. Edges: 0-1, 0-2, 1-3, 2-4, 3-4. Start DFS from node 0.",
      code: "dfsRecursive(0, adj, visited);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0],
      stack: ["dfs(0)"],
      variables: { visited: "{0}", node: 0 },
      explanation: "Visit node 0, add to visited. Check neighbors: 1 is unvisited → recurse into dfs(1).",
      code: "visited.add(0); // neighbor 1 not visited → recurse"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1],
      stack: ["dfs(0)", "dfs(1)"],
      variables: { visited: "{0, 1}", node: 1 },
      explanation: "Visit node 1. Neighbor 0 already visited (skip). Neighbor 3 unvisited → recurse into dfs(3).",
      code: "visited.add(1); // neighbor 0 visited, neighbor 3 → recurse"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 3],
      stack: ["dfs(0)", "dfs(1)", "dfs(3)"],
      variables: { visited: "{0, 1, 3}", node: 3 },
      explanation: "Visit node 3. Neighbor 1 visited (skip). Neighbor 4 unvisited → recurse into dfs(4).",
      code: "visited.add(3); // neighbor 4 → recurse"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 3, 4],
      stack: ["dfs(0)", "dfs(1)", "dfs(3)", "dfs(4)"],
      variables: { visited: "{0, 1, 3, 4}", node: 4 },
      explanation: "Visit node 4. Neighbor 2 unvisited → recurse into dfs(2). DFS keeps going deeper.",
      code: "visited.add(4); // neighbor 2 → recurse"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: ["dfs(0)", "dfs(1)", "dfs(3)", "dfs(4)", "dfs(2)"],
      variables: { visited: "{0, 1, 2, 3, 4}", node: 2 },
      explanation: "Visit node 2. All neighbors already visited. No more recursion — start unwinding the call stack.",
      code: "visited.add(2); // all neighbors visited → return"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: [],
      variables: { visited: "{0, 1, 2, 3, 4}", order: "0→1→3→4→2" },
      explanation: "All calls return. DFS complete. Visit order: 0, 1, 3, 4, 2. Recursion naturally goes deep before backtracking.",
      code: "// all recursive calls returned — traversal complete"
    }
  ]}
/>

#### Iterative DFS (uses an explicit stack)

```java
import java.util.*;

public static Set<Integer> dfsIterative(int start, Map<Integer, List<Integer>> adj) {
    Set<Integer> visited = new HashSet<>();
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited.contains(node)) continue;
        visited.add(node);
        for (int neighbor : adj.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) stack.push(neighbor);
        }
    }
    return visited;
}
```

**When to use DFS:**
- Path existence
- Connected components
- Cycle detection
- Topological sort
- Backtracking / all-paths problems

### 1.5 Breadth-First Search (BFS)

BFS explores all neighbors at the current depth **before** moving deeper. It uses a **queue** and naturally finds the **shortest path** in unweighted graphs.

```java
import java.util.*;

public static Set<Integer> bfs(int start, Map<Integer, List<Integer>> adj) {
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> queue = new ArrayDeque<>();
    visited.add(start);
    queue.add(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : adj.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.add(neighbor);
            }
        }
    }
    return visited;
}
```

**When to use BFS:**
- Shortest path in unweighted graphs
- Level-order processing
- Multi-source spreading (rotting oranges, 01 matrix)

### 1.6 Connected Components

In an undirected graph, a **connected component** is a maximal set of nodes where every node can reach every other node.

```java
public static int countComponents(int n, Map<Integer, List<Integer>> adj) {
    Set<Integer> visited = new HashSet<>();
    int count = 0;
    for (int node = 0; node < n; node++) {
        if (!visited.contains(node)) {
            dfsRecursive(node, adj, visited);
            count++;
        }
    }
    return count;
}
```

Each time you start a new DFS/BFS from an unvisited node, you have found a new component.

<AlgoViz
  title="Connected Components — Counting DFS Starts"
  description="Graph with 6 nodes and 3 components: {0,1,2}, {3,4}, {5}. Each new DFS from an unvisited node discovers one component."
  steps={[
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [],
      variables: { visited: "{}", count: 0 },
      explanation: "6 nodes, edges: 0-1, 1-2, 3-4. Node 5 is isolated. Scan all nodes for unvisited ones.",
      code: "for (int node = 0; node < n; node++) { if (!visited.contains(node)) ... }"
    },
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [0, 1, 2],
      variables: { visited: "{0, 1, 2}", count: 1 },
      explanation: "Node 0 is unvisited. DFS from 0 visits {0, 1, 2} — all connected. Component 1 found.",
      code: "dfsRecursive(0, adj, visited); count++; // count = 1"
    },
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [0, 1, 2],
      variables: { visited: "{0, 1, 2}", count: 1, skipped: "1, 2" },
      explanation: "Nodes 1 and 2 are already visited — skip them. Continue scanning.",
      code: "if (!visited.contains(node)) // false for 1, 2"
    },
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [0, 1, 2, 3, 4],
      variables: { visited: "{0, 1, 2, 3, 4}", count: 2 },
      explanation: "Node 3 is unvisited. DFS from 3 visits {3, 4}. Component 2 found.",
      code: "dfsRecursive(3, adj, visited); count++; // count = 2"
    },
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [0, 1, 2, 3, 4],
      variables: { visited: "{0, 1, 2, 3, 4}", count: 2, skipped: "4" },
      explanation: "Node 4 already visited — skip.",
      code: "if (!visited.contains(4)) // false"
    },
    {
      array: [0, 1, 2, 3, 4, 5],
      highlights: [0, 1, 2, 3, 4, 5],
      variables: { visited: "{0, 1, 2, 3, 4, 5}", count: 3 },
      explanation: "Node 5 is unvisited and isolated. DFS from 5 visits only {5}. Component 3 found. Answer: 3 components.",
      code: "dfsRecursive(5, adj, visited); count++; // count = 3"
    }
  ]}
/>

### 1.7 Cycle Detection

#### Undirected Graph — DFS with Parent Tracking

If DFS visits a neighbor that is already visited **and** that neighbor is not the parent of the current node, a cycle exists.

```java
public static boolean hasCycleUndirected(int node, int parent,
        Map<Integer, List<Integer>> adj, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : adj.getOrDefault(node, List.of())) {
        if (!visited.contains(neighbor)) {
            if (hasCycleUndirected(neighbor, node, adj, visited)) return true;
        } else if (neighbor != parent) {
            return true;
        }
    }
    return false;
}
```

<AlgoViz
  title="Cycle Detection — Undirected Graph with Parent Tracking"
  description="DFS detects a cycle in graph 0-1, 1-2, 2-3, 3-1. When a visited neighbor is not the parent, a cycle exists."
  steps={[
    {
      array: [0, 1, 2, 3],
      highlights: [],
      labels: { 0: "0", 1: "1", 2: "2", 3: "3" },
      variables: { edges: "0-1, 1-2, 2-3, 3-1", visited: "{}" },
      explanation: "Graph has 4 nodes. Edges: 0-1, 1-2, 2-3, 3-1. The triangle 1-2-3 forms a cycle.",
      code: "hasCycleUndirected(0, -1, adj, visited);"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0],
      variables: { node: 0, parent: -1, visited: "{0}" },
      explanation: "Visit node 0 (parent = -1). Mark visited. Check neighbor 1: not visited → recurse.",
      code: "visited.add(0); // neighbor 1 not visited → recurse"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0, 1],
      variables: { node: 1, parent: 0, visited: "{0, 1}" },
      explanation: "Visit node 1 (parent = 0). Neighbor 0 is visited but it IS the parent → skip. Neighbor 2 not visited → recurse.",
      code: "visited.add(1); // neighbor 0 == parent, skip; neighbor 2 → recurse"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0, 1, 2],
      variables: { node: 2, parent: 1, visited: "{0, 1, 2}" },
      explanation: "Visit node 2 (parent = 1). Neighbor 1 is visited but is parent → skip. Neighbor 3 not visited → recurse.",
      code: "visited.add(2); // neighbor 1 == parent, skip; neighbor 3 → recurse"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0, 1, 2, 3],
      variables: { node: 3, parent: 2, visited: "{0, 1, 2, 3}" },
      explanation: "Visit node 3 (parent = 2). Check neighbor 2: visited but is parent → skip. Check neighbor 1: visited AND 1 != parent (2).",
      code: "visited.add(3); // checking neighbor 1..."
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0, 1, 2, 3],
      secondary: [1, 3],
      variables: { node: 3, neighbor: 1, isParent: false, cycleDetected: true },
      explanation: "Neighbor 1 is visited and is NOT the parent of 3 → back edge found! Cycle detected: 1 → 2 → 3 → 1.",
      code: "else if (neighbor != parent) return true; // CYCLE!"
    }
  ]}
/>

#### Directed Graph — Three-Color DFS

Use three states: **WHITE** (unvisited), **GRAY** (in current DFS path), **BLACK** (fully processed). A back edge to a GRAY node means a cycle.

```java
static final int WHITE = 0, GRAY = 1, BLACK = 2;

public static boolean hasCycleDirected(int node,
        Map<Integer, List<Integer>> adj, int[] color) {
    color[node] = GRAY;
    for (int neighbor : adj.getOrDefault(node, List.of())) {
        if (color[neighbor] == GRAY) return true;
        if (color[neighbor] == WHITE) {
            if (hasCycleDirected(neighbor, adj, color)) return true;
        }
    }
    color[node] = BLACK;
    return false;
}
```

<AlgoViz
  title="Cycle Detection — Directed Graph Three-Color DFS"
  description="Three-color DFS on directed graph: 0→1, 1→2, 2→0, 2→3. WHITE=unvisited, GRAY=in path, BLACK=done. Back edge to GRAY node = cycle."
  steps={[
    {
      array: [0, 0, 0, 0],
      highlights: [],
      labels: { 0: "W", 1: "W", 2: "W", 3: "W" },
      variables: { edges: "0→1, 1→2, 2→0, 2→3", WHITE: 0, GRAY: 1, BLACK: 2 },
      explanation: "All nodes start WHITE (unvisited). Directed edges: 0→1, 1→2, 2→0, 2→3. The cycle is 0→1→2→0.",
      code: "int[] color = new int[n]; // all WHITE (0)"
    },
    {
      array: [1, 0, 0, 0],
      highlights: [0],
      labels: { 0: "G", 1: "W", 2: "W", 3: "W" },
      variables: { node: 0, color: "GRAY" },
      explanation: "Start DFS at node 0. Color it GRAY — it is now on the current DFS path. Check neighbor 1: WHITE → recurse.",
      code: "color[0] = GRAY; // neighbor 1 is WHITE → recurse"
    },
    {
      array: [1, 1, 0, 0],
      highlights: [0, 1],
      labels: { 0: "G", 1: "G", 2: "W", 3: "W" },
      variables: { node: 1, color: "GRAY", path: "0→1" },
      explanation: "Color node 1 GRAY. It joins the current path: 0→1. Check neighbor 2: WHITE → recurse.",
      code: "color[1] = GRAY; // neighbor 2 is WHITE → recurse"
    },
    {
      array: [1, 1, 1, 0],
      highlights: [0, 1, 2],
      labels: { 0: "G", 1: "G", 2: "G", 3: "W" },
      variables: { node: 2, color: "GRAY", path: "0→1→2" },
      explanation: "Color node 2 GRAY. Current path: 0→1→2. Check neighbor 0: color[0] is GRAY!",
      code: "color[2] = GRAY; // checking neighbor 0..."
    },
    {
      array: [1, 1, 1, 0],
      highlights: [0, 1, 2],
      secondary: [0],
      labels: { 0: "G!", 1: "G", 2: "G", 3: "W" },
      variables: { node: 2, neighbor: 0, neighborColor: "GRAY", cycle: true },
      explanation: "Neighbor 0 is GRAY — it is on the current DFS path! Back edge 2→0 found. Cycle detected: 0→1→2→0.",
      code: "if (color[neighbor] == GRAY) return true; // CYCLE!"
    },
    {
      array: [1, 1, 1, 0],
      highlights: [0, 1, 2],
      secondary: [0, 2],
      labels: { 0: "G", 1: "G", 2: "G", 3: "W" },
      variables: { cycle: "0→1→2→0", result: true },
      explanation: "Cycle 0→1→2→0 confirmed. Node 3 is never reached — DFS short-circuits on detection. Return true.",
      code: "return true; // cycle found, propagate up"
    }
  ]}
/>

### 1.8 Grid-as-Graph Pattern

Many problems give you a 2-D grid instead of an explicit graph. Each cell is a node; its neighbors are the 4 (or 8) adjacent cells.

#### The grid-as-graph mental model

The single most important realization for grid problems: **a grid IS a graph**. You do not need to build an adjacency list — the grid itself encodes the structure. Each cell `(r, c)` is a node. Its neighbors are the cells you can reach by moving up, down, left, or right. The direction array `DIRS` encodes these four moves. Once you see the grid as a graph, every graph algorithm (DFS, BFS, connected components, shortest path) applies directly.

**Interview signal phrases:** "island", "flood fill", "shortest path in grid", "surrounded regions", "rotting oranges". Any 2D grid problem where cells interact with their neighbors is a graph problem in disguise.

```java
private static final int[][] DIRS = {{0,1},{0,-1},{1,0},{-1,0}};

public static int gridDfs(int[][] grid, int r, int c, boolean[][] visited) {
    int rows = grid.length, cols = grid[0].length;
    if (r < 0 || r >= rows || c < 0 || c >= cols
            || visited[r][c] || grid[r][c] == 0) return 0;
    visited[r][c] = true;
    int area = 1;
    for (int[] d : DIRS) area += gridDfs(grid, r + d[0], c + d[1], visited);
    return area;
}
```

The direction array `DIRS = {{0,1},{0,-1},{1,0},{-1,0}}` encodes right, left, down, up — memorize it.

---

## 2 — Code Templates

### Template 1: Adjacency List Builder

```java
import java.util.*;

public static Map<Integer, List<Integer>> buildGraph(int[][] edges, boolean directed) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int[] e : edges) {
        graph.computeIfAbsent(e[0], k -> new ArrayList<>()).add(e[1]);
        if (!directed) graph.computeIfAbsent(e[1], k -> new ArrayList<>()).add(e[0]);
    }
    return graph;
}
```

### Template 2: Iterative DFS

```java
import java.util.*;

public static Set<Integer> dfs(int start, Map<Integer, List<Integer>> graph) {
    Set<Integer> visited = new HashSet<>();
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited.contains(node)) continue;
        visited.add(node);
        for (int nei : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(nei)) stack.push(nei);
        }
    }
    return visited;
}
```

<AlgoViz
  title="Iterative DFS — Graph Traversal with Stack"
  description="DFS on undirected graph: 0-1, 0-2, 1-3, 2-4, 3-4. Stack-based traversal explores deep paths first."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      highlights: [],
      stack: ["0"],
      variables: { visited: "{}" },
      explanation: "Push start node 0. Stack = [0]. DFS will explore as deep as possible before backtracking.",
      code: "stack.push(start);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0],
      stack: ["2", "1"],
      variables: { visited: "{0}" },
      explanation: "Pop 0, mark visited. Push unvisited neighbors 1 and 2. Stack = [2, 1].",
      code: "node = stack.pop(); visited.add(0); stack.push(1); stack.push(2);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1],
      stack: ["2", "3"],
      variables: { visited: "{0, 1}" },
      explanation: "Pop 1, mark visited. Neighbor 0 already visited, push 3. Stack = [2, 3]. DFS goes deep.",
      code: "node = stack.pop(); visited.add(1); stack.push(3);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 3],
      stack: ["2", "4"],
      variables: { visited: "{0, 1, 3}" },
      explanation: "Pop 3, mark visited. Neighbor 1 visited, push 4. Stack = [2, 4].",
      code: "node = stack.pop(); visited.add(3); stack.push(4);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 3, 4],
      stack: ["2"],
      variables: { visited: "{0, 1, 3, 4}" },
      explanation: "Pop 4, mark visited. Neighbors 2 not yet visited (but will be checked), 3 visited. Stack = [2].",
      code: "node = stack.pop(); visited.add(4);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: [],
      variables: { visited: "{0, 1, 2, 3, 4}", order: "0→1→3→4→2" },
      explanation: "Pop 2, mark visited. All neighbors already visited. Stack empty. DFS complete. Visit order: 0, 1, 3, 4, 2.",
      code: "// stack empty → traversal complete"
    }
  ]}
/>

### Template 3: BFS with Visited Set

```java
import java.util.*;

public static int bfsLevel(int start, Map<Integer, List<Integer>> graph) {
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> q = new ArrayDeque<>();
    visited.add(start);
    q.add(start);
    int level = 0;
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            int node = q.poll();
            for (int nei : graph.getOrDefault(node, List.of())) {
                if (!visited.contains(nei)) {
                    visited.add(nei);
                    q.add(nei);
                }
            }
        }
        level++;
    }
    return level;
}
```

<AlgoViz
  title="BFS Graph Traversal — Level-by-Level with Queue"
  description="BFS on undirected graph: 0-1, 0-2, 1-3, 2-4, 3-4. Queue processes nodes closest to start first."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0],
      stack: ["0"],
      variables: { visited: "{0}", level: 0 },
      explanation: "Mark start node 0 as visited and enqueue it. Queue = [0].",
      code: "visited.add(start); q.add(start);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2],
      stack: ["1", "2"],
      variables: { visited: "{0, 1, 2}", level: 1 },
      explanation: "Dequeue 0. Enqueue unvisited neighbors 1, 2 (mark visited immediately). Queue = [1, 2]. Level 1 has 2 nodes.",
      code: "node = q.poll(); visited.add(1); q.add(1); visited.add(2); q.add(2);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3],
      stack: ["2", "3"],
      variables: { visited: "{0, 1, 2, 3}", level: 1 },
      explanation: "Dequeue 1. Neighbor 0 already visited. Enqueue 3. Queue = [2, 3].",
      code: "node = q.poll(); // node 1. visited.add(3); q.add(3);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: ["3", "4"],
      variables: { visited: "{0, 1, 2, 3, 4}", level: 2 },
      explanation: "Dequeue 2. Neighbor 0 visited. Enqueue 4. Queue = [3, 4]. Level 2 begins.",
      code: "node = q.poll(); // node 2. visited.add(4); q.add(4);"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: ["4"],
      variables: { visited: "{0, 1, 2, 3, 4}", level: 2 },
      explanation: "Dequeue 3. Neighbors 1, 4 already visited. No new nodes. Queue = [4].",
      code: "node = q.poll(); // node 3. No new neighbors"
    },
    {
      array: [0, 1, 2, 3, 4],
      highlights: [0, 1, 2, 3, 4],
      stack: [],
      variables: { visited: "{0, 1, 2, 3, 4}", order: "0→1→2→3→4" },
      explanation: "Dequeue 4. All neighbors visited. Queue empty. BFS complete: 0, 1, 2, 3, 4. BFS guarantees shortest paths in unweighted graphs.",
      code: "// queue empty → traversal complete"
    }
  ]}
/>

### Template 4: Grid DFS (Number of Islands style)

```java
import java.util.*;

private static final int[][] DIRS = {{0,1},{0,-1},{1,0},{-1,0}};

public static int numIslands(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    int rows = grid.length, cols = grid[0].length;
    boolean[][] visited = new boolean[rows][cols];
    int count = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1' && !visited[r][c]) {
                dfs(grid, r, c, visited);
                count++;
            }
        }
    }
    return count;
}

private static void dfs(char[][] grid, int r, int c, boolean[][] visited) {
    int rows = grid.length, cols = grid[0].length;
    if (r < 0 || r >= rows || c < 0 || c >= cols
            || visited[r][c] || grid[r][c] == '0') return;
    visited[r][c] = true;
    for (int[] d : DIRS) dfs(grid, r + d[0], c + d[1], visited);
}
```

---

## 3 — Complexity Table

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| DFS (adj list) | O(V + E) | O(V) stack / recursion | May hit recursion limit on large graphs |
| BFS (adj list) | O(V + E) | O(V) queue | Guarantees shortest path (unweighted) |
| DFS (adj matrix) | O(V²) | O(V) | Slower neighbor iteration |
| BFS (adj matrix) | O(V²) | O(V) | Slower neighbor iteration |
| Connected components | O(V + E) | O(V) | One full pass over all nodes |
| Cycle detection (undirected) | O(V + E) | O(V) | Parent tracking |
| Cycle detection (directed) | O(V + E) | O(V) | Three-color DFS |
| Topological sort | O(V + E) | O(V) | Only on DAGs |
| Grid DFS/BFS | O(R × C) | O(R × C) | R = rows, C = cols |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Number of islands / connected components" | DFS/BFS from each unvisited land cell, count starts | Grid DFS |
| "Shortest path in unweighted graph/grid" | BFS — level = distance | BFS Level |
| "Can I reach node B from node A?" | DFS or BFS reachability check | DFS/BFS |
| "Course prerequisites / task ordering" | Topological sort (cycle detection on directed graph) | Three-Color DFS or Kahn's |
| "Rotting oranges / spreading fire" | Multi-source BFS — all sources enqueued at time 0 | Multi-Source BFS |
| "Surrounded regions / border-connected" | DFS from border cells, mark safe, then flip the rest | Border DFS |
| "Clone/copy a graph" | BFS/DFS with hash map from original node to clone | DFS + HashMap |
| "Is graph bipartite?" | BFS/DFS 2-coloring — assign alternating colors | BFS Coloring |
| "Find redundant edge / detect cycle in undirected" | Union-Find or DFS with parent tracking | Union-Find |
| "All paths from source to target" | DFS backtracking — explore all paths, collect at target | DFS Backtrack |

<AlgoViz
  title="Bipartite Check — BFS 2-Coloring"
  description="BFS assigns alternating colors to nodes. Graph: 0-1, 1-2, 2-3, 0-3 (square = even cycle = bipartite). 0=uncolored, 1=Red, 2=Blue."
  steps={[
    {
      array: [0, 0, 0, 0],
      highlights: [],
      labels: { 0: "?", 1: "?", 2: "?", 3: "?" },
      stack: [],
      variables: { edges: "0-1, 1-2, 2-3, 0-3" },
      explanation: "4-node graph forming a square (even cycle). All uncolored. Goal: assign Red/Blue so no adjacent nodes share a color.",
      code: "int[] color = new int[n]; // 0=uncolored, 1=Red, 2=Blue"
    },
    {
      array: [1, 0, 0, 0],
      highlights: [0],
      labels: { 0: "R", 1: "?", 2: "?", 3: "?" },
      stack: ["0"],
      variables: { colored: "{0: Red}" },
      explanation: "Color node 0 as Red (1). Enqueue it. Queue = [0].",
      code: "color[0] = 1; q.add(0);"
    },
    {
      array: [1, 2, 0, 2],
      highlights: [0, 1, 3],
      labels: { 0: "R", 1: "B", 2: "?", 3: "B" },
      stack: ["1", "3"],
      variables: { colored: "{0:R, 1:B, 3:B}" },
      explanation: "Dequeue 0 (Red). Color neighbors 1 and 3 as Blue (opposite). Queue = [1, 3].",
      code: "color[1] = 2; color[3] = 2; // opposite of Red"
    },
    {
      array: [1, 2, 1, 2],
      highlights: [0, 1, 2, 3],
      labels: { 0: "R", 1: "B", 2: "R", 3: "B" },
      stack: ["3", "2"],
      variables: { colored: "{0:R, 1:B, 2:R, 3:B}" },
      explanation: "Dequeue 1 (Blue). Neighbor 0 already Red (correct — opposite of Blue). Color neighbor 2 as Red. Queue = [3, 2].",
      code: "color[2] = 1; // opposite of Blue"
    },
    {
      array: [1, 2, 1, 2],
      highlights: [0, 1, 2, 3],
      labels: { 0: "R", 1: "B", 2: "R", 3: "B" },
      stack: ["2"],
      variables: { checking: "3→0 (R≠B ✓), 3→2 (R≠B ✓)" },
      explanation: "Dequeue 3 (Blue). Neighbor 0 is Red ✓. Neighbor 2 is Red ✓. No conflicts. Queue = [2].",
      code: "// neighbors have opposite color — no conflict"
    },
    {
      array: [1, 2, 1, 2],
      highlights: [0, 1, 2, 3],
      labels: { 0: "R", 1: "B", 2: "R", 3: "B" },
      stack: [],
      variables: { checking: "2→1 (B≠R ✓), 2→3 (B≠R ✓)" },
      explanation: "Dequeue 2 (Red). Neighbor 1 is Blue ✓. Neighbor 3 is Blue ✓. Queue empty. No conflicts found.",
      code: "// all neighbors valid — queue empty"
    },
    {
      array: [1, 2, 1, 2],
      highlights: [0, 1, 2, 3],
      labels: { 0: "R", 1: "B", 2: "R", 3: "B" },
      stack: [],
      variables: { result: "BIPARTITE", partition1: "{0, 2}", partition2: "{1, 3}" },
      explanation: "BFS complete. All nodes colored with no same-color adjacencies. Graph IS bipartite: {0,2} and {1,3} form the two partitions.",
      code: "return true; // graph is bipartite"
    }
  ]}
/>

---

## 4 — Worked Example: Number of Islands (LC 200)

### Problem

Given an `m × n` 2-D grid of `'1'`s (land) and `'0'`s (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.

### Why not brute force?

A naive approach might check every cell, and for each land cell, do a fresh traversal to determine which island it belongs to — potentially re-traversing the same island multiple times. The efficient approach uses a visited array: once a cell is marked as visited during a DFS, it is never processed again. This guarantees each cell is touched at most once across all DFS calls, giving O(R x C) total time.

:::tip Key Insight
Each DFS/BFS call from an unvisited land cell floods through and marks one entire island. The number of times you initiate a new DFS equals the number of islands. The visited array prevents double-counting.
:::

### Example Grid

```
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```

### DFS Trace

**Pass 1:** Start at (0,0). It is `'1'` and unvisited.

- DFS from (0,0) → visits (0,0), (0,1), (1,0), (1,1). All connected `'1'`s marked visited.
- `count = 1`

**Pass 2:** Continue scanning. (0,2) is `'0'`, skip. ... (2,2) is `'1'` and unvisited.

- DFS from (2,2) → visits only (2,2). No adjacent `'1'`s.
- `count = 2`

**Pass 3:** Continue scanning. (3,3) is `'1'` and unvisited.

- DFS from (3,3) → visits (3,3) and (3,4). Connected.
- `count = 3`

**Answer: 3 islands.**

### BFS Alternative

Replace the recursive DFS with a queue:

```java
import java.util.*;

private static final int[][] DIRS = {{0,1},{0,-1},{1,0},{-1,0}};

public static int numIslandsBfs(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    int rows = grid.length, cols = grid[0].length;
    boolean[][] visited = new boolean[rows][cols];
    int count = 0;

    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1' && !visited[r][c]) {
                Queue<int[]> q = new ArrayDeque<>();
                q.add(new int[]{r, c});
                visited[r][c] = true;
                while (!q.isEmpty()) {
                    int[] cur = q.poll();
                    for (int[] d : DIRS) {
                        int nr = cur[0] + d[0], nc = cur[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                                && !visited[nr][nc] && grid[nr][nc] == '1') {
                            visited[nr][nc] = true;
                            q.add(new int[]{nr, nc});
                        }
                    }
                }
                count++;
            }
        }
    }
    return count;
}
```

### Key Insight

Each DFS/BFS call from an unvisited land cell discovers one complete island. The outer loop counts how many times we start a new traversal — that is the answer.

<AlgoViz
  title="Number of Islands — DFS Grid Marking"
  description="DFS marks connected land cells as visited. Each new DFS from an unvisited '1' discovers one island."
  steps={[
    {
      array: [1,1,0,0,0, 1,1,0,0,0, 0,0,1,0,0, 0,0,0,1,1],
      highlights: [],
      variables: { rows: 4, cols: 5, count: 0 },
      explanation: "Initial 4x5 grid. 1 = land, 0 = water. Scan from top-left for unvisited land cells.",
      code: "for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) ..."
    },
    {
      array: [1,1,0,0,0, 1,1,0,0,0, 0,0,1,0,0, 0,0,0,1,1],
      highlights: [0,1,5,6],
      variables: { rows: 4, cols: 5, count: 1 },
      explanation: "DFS from (0,0): visits (0,0), (0,1), (1,0), (1,1). All connected land marked. Island 1 found.",
      code: "dfs(grid, 0, 0, visited); count++; // count = 1"
    },
    {
      array: [1,1,0,0,0, 1,1,0,0,0, 0,0,1,0,0, 0,0,0,1,1],
      highlights: [0,1,5,6],
      secondary: [12],
      variables: { rows: 4, cols: 5, count: 2 },
      explanation: "Scan continues. (2,2) is unvisited land. DFS visits only (2,2) — no adjacent land. Island 2 found.",
      code: "dfs(grid, 2, 2, visited); count++; // count = 2"
    },
    {
      array: [1,1,0,0,0, 1,1,0,0,0, 0,0,1,0,0, 0,0,0,1,1],
      highlights: [0,1,5,6,12],
      secondary: [18,19],
      variables: { rows: 4, cols: 5, count: 3 },
      explanation: "Scan continues. (3,3) is unvisited land. DFS visits (3,3) and (3,4). Island 3 found. Answer = 3.",
      code: "dfs(grid, 3, 3, visited); count++; // count = 3"
    }
  ]}
/>

---

## 5 — Practice Problems (21 Problems / 3 Day Groups)

### Day 1–2: Easy-Focused (Grid + Basic Traversal)

| # | Problem | Diff | Pattern | ⭐ | LC |
|---|---------|------|---------|----|----|
| 1 | Number of Islands | Medium | DFS/BFS grid | ⭐ | 200 |
| 2 | Flood Fill | Easy | DFS grid | | 733 |
| 3 | Max Area of Island | Medium | DFS grid | ⭐ | 695 |
| 4 | Clone Graph | Medium | BFS/DFS + hash map | ⭐ | 133 |
| 5 | Find if Path Exists in Graph | Easy | BFS/DFS | | 1971 |
| 6 | Keys and Rooms | Medium | DFS | | 841 |
| 7 | Number of Connected Components in an Undirected Graph | Medium | DFS / Union-Find | | 323 |

**Day 1–2 goals:** Get comfortable with grid traversal (islands, flood fill), practice both DFS and BFS on the same problem, and understand connected components.

### Day 3–4: Medium-Focused (Cycle Detection + Multi-Source BFS)

| # | Problem | Diff | Pattern | ⭐ | LC |
|---|---------|------|---------|----|----|
| 8 | Course Schedule | Medium | Cycle detection (directed) | ⭐ | 207 |
| 9 | Course Schedule II | Medium | Topological sort | ⭐ | 210 |
| 10 | Pacific Atlantic Water Flow | Medium | Multi-source DFS | ⭐ | 417 |
| 11 | Rotting Oranges | Medium | Multi-source BFS | ⭐ | 994 |
| 12 | Surrounded Regions | Medium | Border DFS | | 130 |
| 13 | 01 Matrix | Medium | Multi-source BFS | | 542 |
| 14 | Graph Valid Tree | Medium | DFS cycle check | | 261 |

**Day 3–4 goals:** Master cycle detection in directed graphs (course schedule), learn the multi-source BFS pattern (rotting oranges, 01 matrix), and tackle topological sort.

<AlgoViz
  title="Pacific Atlantic Water Flow — Dual BFS"
  description="Heights [1,3,5,4,2] in a line. Pacific on left (node 0), Atlantic on right (node 4). Reverse BFS from each ocean finds which cells can drain to it."
  steps={[
    {
      array: [1, 3, 5, 4, 2],
      highlights: [],
      labels: { 0: "h=1", 1: "h=3", 2: "h=5", 3: "h=4", 4: "h=2" },
      variables: { pacific: "← left", atlantic: "right →" },
      explanation: "5 nodes with heights [1,3,5,4,2]. Pacific ocean on left, Atlantic on right. Water flows from high to low/equal. Find cells reaching BOTH oceans.",
      code: "// reverse BFS from each ocean border inward"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [0],
      labels: { 0: "P", 1: "h=3", 2: "h=5", 3: "h=4", 4: "h=2" },
      variables: { pacificSet: "{0}", step: "Pacific BFS" },
      explanation: "Start Pacific BFS from border node 0 (h=1). Reverse BFS moves to neighbors with height ≥ current — water can flow downhill from them to the ocean.",
      code: "pacificReachable.add(0); // border node"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [0, 1, 2],
      labels: { 0: "P", 1: "P", 2: "P", 3: "h=4", 4: "h=2" },
      variables: { pacificSet: "{0, 1, 2}" },
      explanation: "From 0(h=1): node 1(h=3≥1) ✓. From 1(h=3): node 2(h=5≥3) ✓. From 2(h=5): node 3(h=4<5) ✗ blocked. Pacific reaches {0,1,2}.",
      code: "// 0→1→2, stops at 3 (height 4 < 5)"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [],
      secondary: [4],
      labels: { 0: "h=1", 1: "h=3", 2: "h=5", 3: "h=4", 4: "A" },
      variables: { atlanticSet: "{4}", step: "Atlantic BFS" },
      explanation: "Start Atlantic BFS from border node 4 (h=2). Same reverse logic: move to neighbors with height ≥ current.",
      code: "atlanticReachable.add(4); // border node"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [],
      secondary: [2, 3, 4],
      labels: { 0: "h=1", 1: "h=3", 2: "A", 3: "A", 4: "A" },
      variables: { atlanticSet: "{2, 3, 4}" },
      explanation: "From 4(h=2): node 3(h=4≥2) ✓. From 3(h=4): node 2(h=5≥4) ✓. From 2(h=5): node 1(h=3<5) ✗ blocked. Atlantic reaches {2,3,4}.",
      code: "// 4→3→2, stops at 1 (height 3 < 5)"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [0, 1, 2],
      secondary: [2, 3, 4],
      labels: { 0: "P", 1: "P", 2: "P∩A", 3: "A", 4: "A" },
      variables: { pacific: "{0,1,2}", atlantic: "{2,3,4}", intersection: "{2}" },
      explanation: "Pacific reaches {0,1,2}. Atlantic reaches {2,3,4}. Intersection = {2} — only the peak (h=5) can flow to both oceans.",
      code: "// result = pacificSet ∩ atlanticSet = {2}"
    },
    {
      array: [1, 3, 5, 4, 2],
      highlights: [2],
      labels: { 0: "h=1", 1: "h=3", 2: "BOTH", 3: "h=4", 4: "h=2" },
      variables: { result: "[2]", insight: "run BFS from each ocean inward" },
      explanation: "Node 2 (h=5) is the answer. Water flows left 5→3→1 to Pacific and right 5→4→2 to Atlantic. Key insight: BFS from ocean borders inward, then intersect.",
      code: "return intersection; // cells reaching both oceans"
    }
  ]}
/>

### Day 5–7: Medium/Hard (Shortest Path + Advanced Patterns)

| # | Problem | Diff | Pattern | ⭐ | LC |
|---|---------|------|---------|----|----|
| 15 | Word Ladder | Hard | BFS shortest path | ⭐ | 127 |
| 16 | Redundant Connection | Medium | Union-Find / DFS | | 684 |
| 17 | Evaluate Division | Medium | Graph DFS (weighted) | | 399 |
| 18 | Accounts Merge | Medium | DFS / Union-Find | | 721 |
| 19 | Shortest Path in Binary Matrix | Medium | BFS | | 1091 |
| 20 | Is Graph Bipartite? | Medium | BFS/DFS coloring | | 785 |
| 21 | All Paths From Source to Target | Medium | DFS / backtracking | | 797 |

**Day 5–7 goals:** Apply BFS for shortest-path problems, explore Union-Find as an alternative to DFS, and handle graph coloring and backtracking patterns.

---

## 6 — Mock Interviews

### Mock Interview 1: Rotting Oranges (LC 994)

**Interviewer:** You are given an `m × n` grid where each cell can be: 0 (empty), 1 (fresh orange), or 2 (rotten orange). Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh orange remains, or -1 if impossible.

**Candidate approach:**

> This is a classic multi-source BFS. All initially rotten oranges are sources — add them to the queue at the start. Each BFS level represents one minute.

**Follow-up 1:** Why BFS instead of DFS?

> BFS processes all cells at the same distance (time) together, which directly gives us the minimum minutes. DFS would explore one path deeply and would not naturally give us the "spreading simultaneously" behavior.

**Follow-up 2:** How do you detect the -1 case?

> After BFS completes, scan the grid for any remaining fresh orange (value 1). If any exist, return -1. Alternatively, count fresh oranges at the start and decrement during BFS — if the count is not zero at the end, return -1.

**Follow-up 3:** What is the time and space complexity?

> Time: O(R × C) — every cell is visited at most once. Space: O(R × C) — the queue can hold all cells in the worst case.

**Follow-up 4:** Can you do this without modifying the input grid?

> Yes. Use a separate `visited` set or a `distance` matrix instead of overwriting the grid values. Trade-off is extra space for immutability.

<AlgoViz
  title="Multi-Source BFS — Rotting Oranges"
  description="3×3 grid. 2=rotten, 1=fresh, 0=empty. All rotten oranges enqueued at time 0. Each BFS level = 1 minute of spreading."
  steps={[
    {
      array: [2, 1, 1, 1, 1, 0, 0, 1, 1],
      highlights: [0],
      labels: { 0: "ROT", 1: "1", 2: "1", 3: "1", 4: "1", 5: "-", 6: "-", 7: "1", 8: "1" },
      variables: { fresh: 6, minutes: 0, grid: "3×3" },
      explanation: "3×3 grid. One rotten orange at (0,0). 6 fresh oranges. Enqueue all rotten at time 0. Queue = [(0,0)].",
      code: "// enqueue all initially rotten oranges"
    },
    {
      array: [2, 2, 1, 2, 1, 0, 0, 1, 1],
      highlights: [0, 1, 3],
      labels: { 0: "ROT", 1: "ROT", 2: "1", 3: "ROT", 4: "1", 5: "-", 6: "-", 7: "1", 8: "1" },
      stack: ["(0,1)", "(1,0)"],
      variables: { fresh: 4, minutes: 1 },
      explanation: "Minute 1: Process (0,0). Rot neighbors (0,1) and (1,0). Fresh = 4. Rot spreads one step outward.",
      code: "// minute 1: rot adjacent fresh oranges"
    },
    {
      array: [2, 2, 2, 2, 2, 0, 0, 1, 1],
      highlights: [0, 1, 2, 3, 4],
      labels: { 0: "ROT", 1: "ROT", 2: "ROT", 3: "ROT", 4: "ROT", 5: "-", 6: "-", 7: "1", 8: "1" },
      stack: ["(0,2)", "(1,1)"],
      variables: { fresh: 2, minutes: 2 },
      explanation: "Minute 2: (0,1) rots (0,2) and (1,1). (1,0) has no new fresh neighbors. Fresh = 2.",
      code: "// minute 2: BFS level expands outward"
    },
    {
      array: [2, 2, 2, 2, 2, 0, 0, 2, 1],
      highlights: [0, 1, 2, 3, 4, 7],
      labels: { 0: "ROT", 1: "ROT", 2: "ROT", 3: "ROT", 4: "ROT", 5: "-", 6: "-", 7: "ROT", 8: "1" },
      stack: ["(2,1)"],
      variables: { fresh: 1, minutes: 3 },
      explanation: "Minute 3: (0,2) has no new neighbors. (1,1) rots (2,1). Fresh = 1.",
      code: "// minute 3: rot continues spreading"
    },
    {
      array: [2, 2, 2, 2, 2, 0, 0, 2, 2],
      highlights: [0, 1, 2, 3, 4, 7, 8],
      labels: { 0: "ROT", 1: "ROT", 2: "ROT", 3: "ROT", 4: "ROT", 5: "-", 6: "-", 7: "ROT", 8: "ROT" },
      stack: ["(2,2)"],
      variables: { fresh: 0, minutes: 4 },
      explanation: "Minute 4: (2,1) rots (2,2). Fresh = 0. All oranges rotted!",
      code: "// minute 4: last orange rotted"
    },
    {
      array: [2, 2, 2, 2, 2, 0, 0, 2, 2],
      highlights: [0, 1, 2, 3, 4, 7, 8],
      labels: { 0: "ROT", 1: "ROT", 2: "ROT", 3: "ROT", 4: "ROT", 5: "-", 6: "-", 7: "ROT", 8: "ROT" },
      stack: [],
      variables: { fresh: 0, minutes: 4, result: 4 },
      explanation: "BFS complete. Queue empty. All fresh oranges rotted in 4 minutes. Multi-source BFS naturally handles simultaneous spreading from all sources.",
      code: "return fresh == 0 ? minutes : -1; // 4"
    }
  ]}
/>

### Mock Interview 2: Course Schedule (LC 207)

**Interviewer:** There are `numCourses` courses labeled `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` means you must take course `b` before course `a`. Return `true` if you can finish all courses.

**Candidate approach:**

> This is a cycle detection problem on a directed graph. If the prerequisite graph has a cycle, it is impossible to finish all courses. I will use the three-color DFS approach (WHITE / GRAY / BLACK).

**Follow-up 1:** Walk me through the three colors.

> WHITE means unvisited. When I start DFS on a node, I color it GRAY — meaning it is on the current DFS path. When all its descendants are fully processed, I color it BLACK. If I ever encounter a GRAY node during DFS, I have found a back edge, which means a cycle.

**Follow-up 2:** Could you use BFS instead?

> Yes — Kahn's algorithm. Compute in-degrees, enqueue all nodes with in-degree 0, and process. Each time you dequeue a node, decrement the in-degree of its neighbors. If the number of processed nodes equals `numCourses`, there is no cycle.

**Follow-up 3:** How would you extend this to return a valid course order?

> That is Course Schedule II (LC 210). With DFS, prepend each node to the result when it turns BLACK — this gives a reverse-post-order, which is a valid topological sort. With BFS (Kahn's), the dequeue order itself is a valid topological order.

**Follow-up 4:** What if there are multiple valid orderings?

> Any topological sort is acceptable. The specific order depends on which node you process first when multiple nodes have in-degree 0. If you need lexicographically smallest, use a min-heap instead of a regular queue.

---

## 7 — Tips and Edge Cases

### Common Pitfalls

- **Forgetting to mark visited before enqueuing (BFS).** If you mark visited only when you *dequeue*, you may add the same node to the queue multiple times, causing TLE or incorrect results. Always mark visited when you *enqueue*.
- **Recursion depth on large grids.** A 300×300 grid can cause a StackOverflowError with deep recursion. Switch to iterative DFS/BFS for very large grids, or increase the stack size with a new Thread.
- **Directed vs undirected cycle detection.** Do not use the parent-tracking method on directed graphs — it does not work. Use three-color DFS or Kahn's algorithm.
- **Off-by-one on grid boundaries.** Always validate `0 <= r < rows` and `0 <= c < cols` before accessing `grid[r][c]`.

### Edge Cases to Test

- **Empty graph:** 0 nodes or 0 edges — return 0 components, no cycle, etc.
- **Single node:** A graph with one node and no edges.
- **Disconnected graph:** Multiple components — make sure your outer loop visits all nodes.
- **Self-loops:** An edge from a node to itself — this is a cycle in directed graphs.
- **Grid with all land or all water.**
- **Already-rotten / already-filled starting state.**

### Mental Models

- **"When do I use DFS vs BFS?"** Use BFS when you need the shortest path or level-by-level processing. Use DFS when you need to explore all paths, detect cycles, or perform topological sort.
- **"Multi-source BFS"** = start with all sources in the queue at time 0. The BFS naturally handles simultaneous spreading.
- **"Grid = implicit graph"** — every cell is a node, 4-directional neighbors are edges. No need to build an explicit adjacency list.
- **"Topological sort = reverse post-order of DFS"** — or equivalently, the processing order of Kahn's BFS.

### Java-Specific Tips

- Use `ArrayDeque` for both stacks and queues — it outperforms `LinkedList` for both use cases.
- Use a `HashSet` for visited — O(1) lookups. For grid problems, a `boolean[][]` array is more efficient.
- For grid problems, mutating the input grid (changing `'1'` to `'0'`) can replace the visited array and save space, but discuss this trade-off with your interviewer first.
- `HashMap` with `computeIfAbsent` is the cleanest way to build adjacency lists.
