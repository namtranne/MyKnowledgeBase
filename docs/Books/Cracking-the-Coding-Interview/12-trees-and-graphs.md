# Chapter 4 — Trees and Graphs

> Trees and graphs are the backbone of technical interviews. This chapter is dense and critical — mastering traversals, BST properties, heaps, tries, and graph search algorithms will unlock a massive portion of interview questions.

---

## Types of Trees

A **tree** is a connected, acyclic graph. Each tree has a root node, and every node has zero or more child nodes.

### Binary Tree

Each node has at most **two** children (left and right).

```
         ┌───┐
         │ 1 │
         └─┬─┘
       ┌───┴───┐
     ┌─┴─┐   ┌─┴─┐
     │ 2 │   │ 3 │
     └─┬─┘   └─┬─┘
    ┌──┴──┐    ┌┘
  ┌─┴─┐ ┌─┴─┐┌┴──┐
  │ 4 │ │ 5 ││ 6 │
  └───┘ └───┘└───┘
```

### Binary Search Tree (BST)

A binary tree where for every node N: **all left descendants ≤ N < all right descendants**.

```
         ┌───┐
         │ 8 │
         └─┬─┘
       ┌───┴───┐
     ┌─┴─┐   ┌─┴──┐
     │ 4 │   │ 12 │
     └─┬─┘   └─┬──┘
    ┌──┴──┐  ┌──┴──┐
  ┌─┴─┐ ┌┴─┐┌┴──┐┌┴──┐
  │ 2 │ │ 6││ 10││ 14│
  └───┘ └──┘└───┘└───┘

  In-order traversal yields sorted order: 2, 4, 6, 8, 10, 12, 14
```

> **Important caveat:** The definition is "all left descendants," not just the immediate left child. A node's value must be greater than *every* value in its left subtree.

### Balanced vs Unbalanced

| Type | Definition |
|------|-----------|
| **Complete** | Every level fully filled except possibly the last, which is filled left to right |
| **Full** | Every node has either 0 or 2 children |
| **Perfect** | Both complete and full; all leaves at the same level; has exactly 2^h+1 - 1 nodes |

```
  Complete:        Full:          Perfect:
      1               1              1
     / \             / \            / \
    2   3           2   3          2   3
   / \             / \            / \ / \
  4   5           4   5          4  5 6  7

  (last level      (every node    (all leaves
   filled left      has 0 or 2     at same level)
   to right)        children)
```

### Balanced Trees

A balanced tree ensures O(log N) operations by keeping the height approximately log₂(N).

#### AVL Tree

Strictly balanced: for every node, the heights of left and right subtrees differ by at most 1. Rebalances with **rotations** after each insertion/deletion.

```
  Right Rotation (LL case):       Left Rotation (RR case):
        z                              z
       / \                            / \
      y   T4                         T1   y
     / \          ──→                    / \
    x   T3       x                     T2  x
   / \          / \                       / \
  T1  T2      T1  T2   y               T3  T4
                       / \
                      T3  z
                         / \
                        T4
```

#### Red-Black Tree

Approximate balance using node coloring rules:
1. Every node is red or black
2. Root is black
3. No two consecutive red nodes (red node must have black children)
4. Every path from root to null has the same number of black nodes

> AVL trees are more strictly balanced → faster lookups. Red-Black trees do fewer rotations → faster insertions/deletions. Java's `TreeMap` and `TreeSet` use Red-Black trees.

---

## Binary Tree Traversal

### The Three Classic Orderings

```
         ┌───┐
         │ 1 │
         └─┬─┘
       ┌───┴───┐
     ┌─┴─┐   ┌─┴─┐
     │ 2 │   │ 3 │
     └─┬─┘   └─┬─┘
    ┌──┴──┐    ┌┘
  ┌─┴─┐ ┌─┴─┐┌┴──┐
  │ 4 │ │ 5 ││ 6 │
  └───┘ └───┘└───┘
```

| Traversal | Order | Result | Mnemonic |
|-----------|-------|--------|----------|
| **In-order** | Left → Root → Right | 4, 2, 5, 1, 6, 3 | "Left, **Me**, Right" |
| **Pre-order** | Root → Left → Right | 1, 2, 4, 5, 3, 6 | "**Me**, Left, Right" |
| **Post-order** | Left → Right → Root | 4, 5, 2, 6, 3, 1 | "Left, Right, **Me**" |

### Recursive Implementations

```java
void inOrder(TreeNode node) {
    if (node == null) return;
    inOrder(node.left);
    visit(node);
    inOrder(node.right);
}

void preOrder(TreeNode node) {
    if (node == null) return;
    visit(node);
    preOrder(node.left);
    preOrder(node.right);
}

void postOrder(TreeNode node) {
    if (node == null) return;
    postOrder(node.left);
    postOrder(node.right);
    visit(node);
}
```

### Level-Order Traversal (BFS)

```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;

    Queue<TreeNode> queue = new LinkedList<>();
    queue.add(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        result.add(level);
    }
    return result;
}
```

### Iterative In-Order (Using Stack)

```java
List<Integer> inOrderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode current = root;

    while (current != null || !stack.isEmpty()) {
        while (current != null) {
            stack.push(current);
            current = current.left;
        }
        current = stack.pop();
        result.add(current.val);
        current = current.right;
    }
    return result;
}
```

### Morris Traversal (O(1) Space In-Order)

Achieves in-order traversal without recursion or a stack by temporarily modifying tree pointers.

```java
void morrisInOrder(TreeNode root) {
    TreeNode current = root;
    while (current != null) {
        if (current.left == null) {
            visit(current);
            current = current.right;
        } else {
            TreeNode predecessor = current.left;
            while (predecessor.right != null && predecessor.right != current) {
                predecessor = predecessor.right;
            }

            if (predecessor.right == null) {
                predecessor.right = current;  // create thread
                current = current.left;
            } else {
                predecessor.right = null;     // remove thread
                visit(current);
                current = current.right;
            }
        }
    }
}
```

> Morris traversal modifies the tree temporarily but restores it. Useful when space is critical. Time remains O(N).

---

## Binary Heaps

A **binary heap** is a complete binary tree that satisfies the heap property.

- **Min-Heap:** Every node is smaller than its children → root is the minimum
- **Max-Heap:** Every node is larger than its children → root is the maximum

### Array Representation

A complete binary tree maps perfectly to an array:

```
         ┌───┐
         │ 4 │                    Index:  0  1  2  3  4  5  6
         └─┬─┘                    Array: [4][8][5][12][9][7][6]
       ┌───┴───┐
     ┌─┴─┐   ┌─┴─┐
     │ 8 │   │ 5 │               Parent of i:     (i-1) / 2
     └─┬─┘   └─┬─┘               Left child of i:  2i + 1
    ┌──┴──┐  ┌──┴──┐              Right child of i: 2i + 2
  ┌─┴──┐┌┴─┐┌┴─┐┌─┴─┐
  │ 12 ││ 9││ 7││ 6 │
  └────┘└──┘└──┘└───┘
```

### Insert (Bubble Up / Sift Up)

1. Insert at the next available position (end of array)
2. Compare with parent; if heap property is violated, swap
3. Repeat until heap property is restored

```java
void insert(int val) {
    heap.add(val);
    int i = heap.size() - 1;
    while (i > 0 && heap.get(i) < heap.get((i - 1) / 2)) {
        swap(i, (i - 1) / 2);
        i = (i - 1) / 2;
    }
}
```

```
Insert 3 into min-heap:
  [4, 8, 5, 12, 9, 7, 6]

  Step 1: Add at end → [4, 8, 5, 12, 9, 7, 6, 3]
  Step 2: 3 < parent(12)? Yes → swap → [4, 8, 5, 3, 9, 7, 6, 12]
  Step 3: 3 < parent(8)?  Yes → swap → [4, 3, 5, 8, 9, 7, 6, 12]
  Step 4: 3 < parent(4)?  Yes → swap → [3, 4, 5, 8, 9, 7, 6, 12]
  Done! 3 is now the root.
```

### Extract Min (Bubble Down / Sift Down)

1. Remove root (the minimum)
2. Move the last element to the root
3. Compare with children; swap with the smaller child
4. Repeat until heap property is restored

```java
int extractMin() {
    int min = heap.get(0);
    int last = heap.remove(heap.size() - 1);
    if (!heap.isEmpty()) {
        heap.set(0, last);
        siftDown(0);
    }
    return min;
}

void siftDown(int i) {
    int smallest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    if (left < heap.size() && heap.get(left) < heap.get(smallest))
        smallest = left;
    if (right < heap.size() && heap.get(right) < heap.get(smallest))
        smallest = right;
    if (smallest != i) {
        swap(i, smallest);
        siftDown(smallest);
    }
}
```

### Heap Complexity

| Operation | Time |
|-----------|------|
| Insert | O(log N) |
| Extract min/max | O(log N) |
| Peek min/max | O(1) |
| Build heap (heapify) | O(N) |

> Building a heap from an array is O(N), not O(N log N)! The sift-down approach from the middle of the array toward the root is more efficient because most nodes are near the bottom.

---

## Tries (Prefix Trees)

A **trie** is a tree-like data structure for storing strings, where each node represents a character. It excels at prefix-based operations.

```
  Insert: "cat", "car", "card", "do", "dog"

              root
             /    \
            c      d
            |      |
            a      o
           / \      \
          t   r      g
              |
              d

  Each path from root to a marked node forms a valid word.
  ★ = end of word marker

              root
             /    \
            c      d
            |      |
            a      o★
           / \      \
          t★  r★     g★
              |
              d★
```

### Implementation

```java
class TrieNode {
    TrieNode[] children = new TrieNode[26];
    boolean isEndOfWord;
}

class Trie {
    TrieNode root = new TrieNode();

    void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) {
                node.children[idx] = new TrieNode();
            }
            node = node.children[idx];
        }
        node.isEndOfWord = true;
    }

    boolean search(String word) {
        TrieNode node = findNode(word);
        return node != null && node.isEndOfWord;
    }

    boolean startsWith(String prefix) {
        return findNode(prefix) != null;
    }

    private TrieNode findNode(String s) {
        TrieNode node = root;
        for (char c : s.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) return null;
            node = node.children[idx];
        }
        return node;
    }
}
```

### Trie Complexity

| Operation | Time | Space |
|-----------|------|-------|
| Insert | O(L) | O(L) per word |
| Search | O(L) | — |
| Prefix search | O(L) | — |
| Total space | — | O(ALPHABET × L × N) |

Where L = word length, N = number of words.

> **Use cases:** Autocomplete, spell checking, IP routing, word games. Tries are faster than hash tables for prefix queries but use more memory.

---

## Graphs

A graph G = (V, E) consists of **vertices** (nodes) and **edges** (connections).

### Types

| Type | Description |
|------|-------------|
| **Directed** | Edges have direction (A → B ≠ B → A) |
| **Undirected** | Edges are bidirectional (A — B) |
| **Weighted** | Edges have associated costs/distances |
| **Unweighted** | All edges have equal weight |
| **Cyclic** | Contains at least one cycle |
| **Acyclic** | No cycles (a DAG if directed and acyclic) |
| **Connected** | Path exists between every pair of vertices |

### Representation

#### Adjacency List

```
0: [1, 4]
1: [0, 2, 3, 4]
2: [1, 3]
3: [1, 2, 4]
4: [0, 1, 3]
```

```java
Map<Integer, List<Integer>> graph = new HashMap<>();
graph.computeIfAbsent(0, k -> new ArrayList<>()).add(1);
graph.computeIfAbsent(0, k -> new ArrayList<>()).add(4);
// ...
```

#### Adjacency Matrix

```
    0  1  2  3  4
0 [ 0  1  0  0  1 ]
1 [ 1  0  1  1  1 ]
2 [ 0  1  0  1  0 ]
3 [ 0  1  1  0  1 ]
4 [ 1  1  0  1  0 ]
```

#### Comparison

| Feature | Adjacency List | Adjacency Matrix |
|---------|---------------|-----------------|
| Space | O(V + E) | O(V²) |
| Edge lookup | O(degree) | O(1) |
| Add edge | O(1) | O(1) |
| Iterate neighbors | O(degree) | O(V) |
| Best for | Sparse graphs | Dense graphs |

> Most interview problems use adjacency lists since real-world graphs tend to be sparse.

---

## Graph Search

### Breadth-First Search (BFS)

Explores neighbors level by level using a **queue**. Finds the shortest path in unweighted graphs.

```java
void bfs(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> queue = new LinkedList<>();
    visited.add(start);
    queue.add(start);

    while (!queue.isEmpty()) {
        int node = queue.poll();
        process(node);
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.add(neighbor);
            }
        }
    }
}
```

```
BFS from node 0:

  Level 0: {0}
  Level 1: {1, 4}
  Level 2: {2, 3}

       0
      / \
     1   4
    / \ / \
   2   3
```

### Depth-First Search (DFS)

Explores as deep as possible before backtracking using a **stack** (or recursion).

```java
void dfs(Map<Integer, List<Integer>> graph, int node, Set<Integer> visited) {
    if (visited.contains(node)) return;
    visited.add(node);
    process(node);
    for (int neighbor : graph.getOrDefault(node, List.of())) {
        dfs(graph, neighbor, visited);
    }
}
```

### BFS vs DFS

| Feature | BFS | DFS |
|---------|-----|-----|
| Data structure | Queue | Stack / Recursion |
| Shortest path (unweighted) | Yes | No |
| Space complexity | O(width) — can be O(V) | O(height) — can be O(V) |
| Use case | Shortest path, level-order | Topological sort, cycle detection, connected components |
| Complete (finds solution if exists) | Yes | Yes (finite graphs) |

### Bidirectional Search

Run BFS from both source and destination simultaneously. When the two searches collide, you've found the shortest path.

```
Normal BFS:    Explores O(k^d) nodes  (k = branching factor, d = distance)
Bidirectional: Explores O(k^(d/2)) + O(k^(d/2)) = O(2 × k^(d/2))

For k=10, d=6:
  Normal:       10^6 = 1,000,000
  Bidirectional: 2 × 10^3 = 2,000     ← ~500x fewer nodes!
```

> Bidirectional search is optimal for shortest path when you know the target. Requires being able to search "backward" from the goal.

### Topological Sort

A linear ordering of vertices in a DAG such that for every edge (u, v), u comes before v. Used for dependency resolution (build systems, course prerequisites).

```java
List<Integer> topologicalSort(Map<Integer, List<Integer>> graph, int numVertices) {
    int[] inDegree = new int[numVertices];
    for (var neighbors : graph.values()) {
        for (int neighbor : neighbors) {
            inDegree[neighbor]++;
        }
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numVertices; i++) {
        if (inDegree[i] == 0) queue.add(i);
    }

    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int neighbor : graph.getOrDefault(node, List.of())) {
            if (--inDegree[neighbor] == 0) {
                queue.add(neighbor);
            }
        }
    }

    if (order.size() != numVertices) throw new RuntimeException("Cycle detected");
    return order;
}
```

---

## Cycle Detection

### In Directed Graphs (DFS with coloring)

Use three states: WHITE (unvisited), GRAY (in current path), BLACK (fully processed).

```java
enum Color { WHITE, GRAY, BLACK }

boolean hasCycle(Map<Integer, List<Integer>> graph, int numVertices) {
    Color[] color = new Color[numVertices];
    Arrays.fill(color, Color.WHITE);
    for (int i = 0; i < numVertices; i++) {
        if (color[i] == Color.WHITE && dfsHasCycle(graph, i, color)) {
            return true;
        }
    }
    return false;
}

boolean dfsHasCycle(Map<Integer, List<Integer>> graph, int node, Color[] color) {
    color[node] = Color.GRAY;
    for (int neighbor : graph.getOrDefault(node, List.of())) {
        if (color[neighbor] == Color.GRAY) return true;
        if (color[neighbor] == Color.WHITE && dfsHasCycle(graph, neighbor, color))
            return true;
    }
    color[node] = Color.BLACK;
    return false;
}
```

### In Undirected Graphs (Union-Find)

```java
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);  // path compression
        return parent[x];
    }

    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;  // cycle detected
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }
}
```

---

## Tree Diameter

The **diameter** of a tree is the longest path between any two nodes (measured in edges).

```java
int diameter = 0;

int depth(TreeNode node) {
    if (node == null) return 0;
    int left = depth(node.left);
    int right = depth(node.right);
    diameter = Math.max(diameter, left + right);
    return 1 + Math.max(left, right);
}
```

---

## Lowest Common Ancestor (LCA)

### In a BST

```java
TreeNode lcaBST(TreeNode root, TreeNode p, TreeNode q) {
    while (root != null) {
        if (p.val < root.val && q.val < root.val) root = root.left;
        else if (p.val > root.val && q.val > root.val) root = root.right;
        else return root;
    }
    return null;
}
```

### In a General Binary Tree

```java
TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode left = lca(root.left, p, q);
    TreeNode right = lca(root.right, p, q);
    if (left != null && right != null) return root;
    return left != null ? left : right;
}
```

---

## Tree Serialization

Convert a tree to a string and back. Useful for network transmission or storage.

```java
String serialize(TreeNode root) {
    if (root == null) return "null";
    return root.val + "," + serialize(root.left) + "," + serialize(root.right);
}

TreeNode deserialize(String data) {
    Queue<String> nodes = new LinkedList<>(Arrays.asList(data.split(",")));
    return buildTree(nodes);
}

TreeNode buildTree(Queue<String> nodes) {
    String val = nodes.poll();
    if ("null".equals(val)) return null;
    TreeNode node = new TreeNode(Integer.parseInt(val));
    node.left = buildTree(nodes);
    node.right = buildTree(nodes);
    return node;
}
```

---

## Complexity Comparison

| Data Structure | Search | Insert | Delete | Space |
|---------------|--------|--------|--------|-------|
| Binary Tree (unbalanced) | O(N) | O(N) | O(N) | O(N) |
| BST (balanced) | O(log N) | O(log N) | O(log N) | O(N) |
| BST (worst case) | O(N) | O(N) | O(N) | O(N) |
| AVL Tree | O(log N) | O(log N) | O(log N) | O(N) |
| Red-Black Tree | O(log N) | O(log N) | O(log N) | O(N) |
| Binary Heap | O(N) | O(log N) | O(log N) | O(N) |
| Trie | O(L) | O(L) | O(L) | O(AL×N) |
| Graph (adj list) BFS/DFS | O(V+E) | — | — | O(V+E) |
| Graph (adj matrix) BFS/DFS | O(V²) | — | — | O(V²) |

---

## Interview Questions Overview

### 4.1 — Route Between Nodes

> Given a directed graph, find whether there is a route between two nodes.

**Approach:** BFS or DFS from source. Return true if destination is visited.

### 4.2 — Minimal Tree

> Given a sorted (increasing order) array with unique integer elements, create a BST with minimal height.

**Approach:** Recursively pick the middle element as root. Left half becomes left subtree, right half becomes right subtree.

```java
TreeNode createMinBST(int[] arr, int low, int high) {
    if (low > high) return null;
    int mid = (low + high) / 2;
    TreeNode node = new TreeNode(arr[mid]);
    node.left = createMinBST(arr, low, mid - 1);
    node.right = createMinBST(arr, mid + 1, high);
    return node;
}
```

### 4.3 — List of Depths

> Create a linked list of all nodes at each depth of a binary tree.

**Approach:** BFS (level-order traversal), creating a new list for each level. Or DFS with a level parameter.

### 4.4 — Check Balanced

> Check if a binary tree is balanced (heights of two subtrees of any node never differ by more than one).

```java
int checkHeight(TreeNode root) {
    if (root == null) return 0;
    int left = checkHeight(root.left);
    if (left == -1) return -1;
    int right = checkHeight(root.right);
    if (right == -1) return -1;
    if (Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
}

boolean isBalanced(TreeNode root) {
    return checkHeight(root) != -1;
}
```

### 4.5 — Validate BST

> Check if a binary tree is a valid BST.

**Approach:** Pass valid range (min, max) down the tree. Each node must fall within its valid range.

```java
boolean isValidBST(TreeNode node, Integer min, Integer max) {
    if (node == null) return true;
    if (min != null && node.val <= min) return false;
    if (max != null && node.val >= max) return false;
    return isValidBST(node.left, min, node.val) &&
           isValidBST(node.right, node.val, max);
}
```

> Common mistake: only checking `left.val < node.val < right.val` instead of checking against the entire valid range.

### 4.6 — Successor

> Find the in-order successor of a given node in a BST (each node has a link to its parent).

**Cases:**
1. Node has a right subtree → successor is the leftmost node in the right subtree
2. No right subtree → go up until you find an ancestor where the node is in the left subtree

### 4.7 — Build Order

> Given a list of projects and dependencies, find a build order (or report impossible). This is topological sort.

### 4.8 — First Common Ancestor

> Find the first common ancestor of two nodes in a binary tree. Avoid storing additional nodes in a data structure.

See LCA algorithm above. Multiple approaches: with parent links, without parent links, optimized.

### 4.9 — BST Sequences

> Given a BST, print all possible arrays that could have led to this tree via sequential insertion.

**Approach:** The root must be first. After that, the children of the root can be inserted in any interleaving of the left and right subtree sequences. Recursively weave.

### 4.10 — Check Subtree

> T1 is a very large tree, T2 is much smaller. Check if T2 is a subtree of T1.

**Approaches:**
- **Substring matching:** Serialize both trees (pre-order with null markers), check if T2's serialization is a substring of T1's → O(N+M)
- **Recursive:** For each node in T1 that matches T2's root, check if subtrees are identical → O(N×M) worst case

### 4.11 — Random Node

> Implement a binary tree class with insert, find, delete, and `getRandomNode()` that returns a random node with equal probability.

**Approach:** Store subtree size at each node. Randomly choose left subtree (with probability size_left/size), current node (1/size), or right subtree.

### 4.12 — Paths with Sum

> Count the number of paths in a binary tree that sum to a given value. Paths go downward (not necessarily from root or to a leaf).

**Approach:** Use a hash map of running sums (prefix sum technique). At each node, check if `running_sum - target` exists in the map.

```java
int countPaths(TreeNode node, int target, int runningSum, Map<Integer, Integer> pathCount) {
    if (node == null) return 0;
    runningSum += node.val;
    int totalPaths = pathCount.getOrDefault(runningSum - target, 0);
    if (runningSum == target) totalPaths++;
    pathCount.merge(runningSum, 1, Integer::sum);
    totalPaths += countPaths(node.left, target, runningSum, pathCount);
    totalPaths += countPaths(node.right, target, runningSum, pathCount);
    pathCount.merge(runningSum, -1, Integer::sum);
    return totalPaths;
}
```

---

## Key Takeaways

1. **In-order traversal of a BST gives sorted output** — use this to validate BSTs or find kth smallest
2. **BFS = Queue = Shortest path (unweighted); DFS = Stack/Recursion = Exhaustive search**
3. **Balanced BSTs guarantee O(log N)** — unbalanced ones degenerate to O(N) linked lists
4. **Heaps are not BSTs** — they only guarantee the root is min/max, not full sorting
5. **Tries trade space for time** — O(L) lookups regardless of how many words are stored
6. **Topological sort requires a DAG** — if a cycle exists, no valid ordering is possible
7. **Union-Find** is ideal for dynamic connectivity and cycle detection in undirected graphs
8. **Always clarify:** Is it a binary tree or BST? Directed or undirected? Can there be cycles?
9. **Tree problems are often recursive** — identify the subproblem pattern and trust the recursion
10. **Draw the tree/graph** — visualization prevents most mistakes in interviews
