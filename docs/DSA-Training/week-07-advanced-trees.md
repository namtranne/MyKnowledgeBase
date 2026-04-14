---
sidebar_position: 8
title: "Week 7: Advanced Trees (LCA + Euler Tour)"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 7: Advanced Trees (LCA + Euler Tour)

## Why This Week Matters

Trees appear everywhere in interviews — from org-chart queries to network routing. This week elevates your tree skills from basic traversal to **structural queries**: finding the lowest common ancestor in logarithmic time, flattening a tree into an array for fast subtree operations, and computing path-level aggregates. These techniques unlock an entire class of problems that are otherwise intractable.

---

## Core Theory

### 1. Binary Lifting for LCA

**Lowest Common Ancestor (LCA):** Given two nodes `u` and `v` in a rooted tree, LCA(u, v) is the deepest node that is an ancestor of both.

**Why this technique exists.** The naive approach — walk both nodes upward until they meet — is O(n) per query on a skewed tree (imagine a chain of 100,000 nodes). If you have Q queries, that is O(nQ) total, which is too slow for competitive programming and many interview follow-ups. Binary lifting precomputes a "jump table" in O(n log n), enabling each LCA query in O(log n). This is the standard technique for general trees in both interviews and competitions.

**The intuition — a real-world analogy.** Imagine two people in an ancestry tree (like a family tree) who want to find their most recent common ancestor. The naive way is for both to walk up one generation at a time. Binary lifting is like having a fast-travel system: you can jump to your grandparent (2 generations), great-great-grandparent (4 generations), or 2^k-th ancestor in one step. To find the LCA, you first equalize depths using these express jumps, then both nodes jump upward together, skipping past the LCA and only slowing down when they are about to converge.

**Naive approach:** Walk both nodes upward until they meet — O(n) worst case on a skewed tree.

**Binary Lifting** eliminates this by precomputing ancestors at power-of-2 distances:

| `up[node][k]` | Meaning |
|---|---|
| `up[node][0]` | Parent of `node` |
| `up[node][1]` | 2nd ancestor (grandparent) |
| `up[node][k]` | 2^k-th ancestor |

**Preprocessing (O(n log n)):**
1. Root the tree (BFS/DFS) and record `depth[node]`.
2. Fill the table: `up[node][k] = up[ up[node][k-1] ][k-1]`.

**Query (O(log n)):**
1. Bring the deeper node up so both nodes are at the same depth.
2. If they're the same node, that's the LCA.
3. Otherwise, jump both nodes upward from the highest bit down — only jump when the ancestors differ.
4. After the loop, `up[u][0]` is the LCA.

**Interview signals.** Look for: "lowest common ancestor," "distance between two nodes in a tree," "kth ancestor," "path queries on trees" (sum, max, count along a path), "subtree queries" (sum of all descendants), "is u an ancestor of v?", or "sum of distances from every node." Any time a tree problem goes beyond basic traversal and requires structural queries, binary lifting and Euler tour are the tools to reach for.

**Common mistakes beginners make.** (1) Setting `up[root][0] = -1` instead of `up[root][0] = root` — this causes index-out-of-bounds errors when jumping past the root. (2) Forgetting that binary lifting requires a rooted tree; if the input is unrooted, pick any node as root first. (3) Using recursive DFS on trees with 10^5+ nodes without increasing Java's stack size. (4) Confusing the two types of Euler tour: "in/out time" (for subtree queries) vs. "node listed at each visit" (for LCA with sparse table).

#### Complete Binary Lifting Template

```java
import java.util.*;

class BinaryLifting {
    int n, LOG;
    int[] depth;
    int[][] up;

    BinaryLifting(int n, int[][] edges, int root) {
        this.n = n;
        this.LOG = Math.max(1, (int) Math.ceil(Math.log(n) / Math.log(2)));
        this.depth = new int[n];
        this.up = new int[n][LOG];
        for (int[] row : up) Arrays.fill(row, -1);

        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        bfs(adj, root);
    }

    private void bfs(List<List<Integer>> adj, int root) {
        boolean[] visited = new boolean[n];
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        queue.offer(root);
        visited[root] = true;
        up[root][0] = root; // root is its own ancestor
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int k = 1; k < LOG; k++)
                up[u][k] = up[up[u][k - 1]][k - 1];
            for (int v : adj.get(u)) {
                if (!visited[v]) {
                    visited[v] = true;
                    depth[v] = depth[u] + 1;
                    up[v][0] = u;
                    queue.offer(v);
                }
            }
        }
    }

    int kthAncestor(int node, int k) {
        for (int i = 0; i < LOG; i++) {
            if ((k >> i & 1) == 1) {
                node = up[node][i];
                if (node == -1) return -1;
            }
        }
        return node;
    }

    int lca(int u, int v) {
        if (depth[u] < depth[v]) { int tmp = u; u = v; v = tmp; }
        u = kthAncestor(u, depth[u] - depth[v]);
        if (u == v) return u;
        for (int k = LOG - 1; k >= 0; k--) {
            if (up[u][k] != up[v][k]) {
                u = up[u][k];
                v = up[v][k];
            }
        }
        return up[u][0];
    }

    int dist(int u, int v) {
        return depth[u] + depth[v] - 2 * depth[lca(u, v)];
    }
}
```

---

### 2. Euler Tour (DFS In/Out Times)

An **Euler Tour** linearizes a tree into an array by recording entry (`tin`) and exit (`tout`) times during a DFS. A node `v` is in the subtree of `u` if and only if `tin[u] ≤ tin[v] ≤ tout[u]`.

This transforms subtree queries into **range queries** on an array — which we can answer with BIT or segment tree.

```java
class EulerTour {
    int[] tin, tout;
    List<Integer> order = new ArrayList<>();
    int timer = 0;

    EulerTour(int n, List<List<Integer>> adj, int root) {
        tin = new int[n];
        tout = new int[n];
        dfs(adj, root);
    }

    private void dfs(List<List<Integer>> adj, int root) {
        // stack entries: {node, parent, leavingFlag}
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[]{root, -1, 0});
        while (!stack.isEmpty()) {
            int[] cur = stack.pop();
            int node = cur[0], parent = cur[1], leaving = cur[2];
            if (leaving == 1) {
                tout[node] = timer - 1;
                continue;
            }
            tin[node] = timer;
            order.add(node);
            timer++;
            stack.push(new int[]{node, parent, 1});
            List<Integer> children = adj.get(node);
            for (int i = children.size() - 1; i >= 0; i--) {
                int child = children.get(i);
                if (child != parent) stack.push(new int[]{child, node, 0});
            }
        }
    }

    boolean isAncestor(int u, int v) {
        return tin[u] <= tin[v] && tin[v] <= tout[u];
    }

    // Returns {l, r} inclusive range in the Euler-tour array.
    int[] subtreeRange(int u) {
        return new int[]{tin[u], tout[u]};
    }
}
```

<AlgoViz title="AVL Tree Rotations — Single and Double" description="Demonstrating LL case (right rotation) and LR case (left-right double rotation) to restore AVL balance." steps={[
  { tree: {val: 30}, treeHighlights: [30], variables: { balance: "BF(30)=0" }, explanation: "Start: Insert 30 into empty AVL tree. Single node, perfectly balanced.", code: "root = new Node(30);" },
  { tree: {val: 30, left: {val: 20}}, treeHighlights: [20], variables: { balance: "BF(30)=1" }, explanation: "Insert 20: goes left of 30. BF(30)=1 (left subtree height 1, right 0). Still balanced.", code: "root.left = new Node(20);" },
  { tree: {val: 30, left: {val: 20, left: {val: 10}}}, treeHighlights: [10], variables: { balance: "BF(30)=2 VIOLATION", case: "Left-Left" }, explanation: "Insert 10: left of 20. BF(30)=2 — AVL violation! Left-Left case requires a single right rotation at 30.", code: "// height(left)=2, height(right)=0 → BF=2" },
  { tree: {val: 20, left: {val: 10}, right: {val: 30}}, treeHighlights: [20], variables: { balance: "All BF=0", action: "Right rotation at 30" }, explanation: "Right rotate at 30: node 20 becomes root, 30 becomes right child. Balanced! All balance factors are 0.", code: "// rightRotate(30): 20 becomes new root" },
  { tree: {val: 30, left: {val: 10}}, treeHighlights: [30, 10], variables: { scenario: "LR case setup" }, explanation: "New example for double rotation: tree has 30 with left child 10. Now insert 20.", code: "// Fresh tree for Left-Right case demo" },
  { tree: {val: 30, left: {val: 10, right: {val: 20}}}, treeHighlights: [20], variables: { balance: "BF(30)=2", case: "Left-Right" }, explanation: "Insert 20 (right of 10). BF(30)=2 but left child is right-heavy — Left-Right case. Single rotation won't fix it.", code: "// Left child right-heavy → double rotation" },
  { tree: {val: 30, left: {val: 20, left: {val: 10}}}, treeHighlights: [20, 10], variables: { action: "Step 1: Left rotate at 10" }, explanation: "Step 1: Left rotate at node 10 — converts LR case into LL case. Node 20 takes 10's position.", code: "// leftRotate(10): LR → LL conversion" },
  { tree: {val: 20, left: {val: 10}, right: {val: 30}}, treeHighlights: [20], variables: { action: "Step 2: Right rotate at 30", balance: "All BF=0" }, explanation: "Step 2: Right rotate at 30 — tree balanced! Double rotation = left-rotate child then right-rotate parent. O(1) each.", code: "// rightRotate(30): balanced! O(1) per rotation" }
]} />

**Subtree sum example:** Assign each node a value. Place values in an array `A` where `A[tin[node]] = value[node]`. Subtree sum of `u` = prefix sum from `tin[u]` to `tout[u]`, answerable with a BIT.

---

### 3. Path Queries Using LCA

For any two nodes `u` and `v`:

```
dist(u, v) = depth[u] + depth[v] - 2 * depth[lca(u, v)]
```

**Path sum** from `u` to `v` can be decomposed:

```
path_sum(u, v) = prefix_sum(u) + prefix_sum(v) - 2 * prefix_sum(lca(u,v)) + value(lca(u,v))
```

where `prefix_sum(x)` is the sum from the root down to `x`.

This decomposition turns arbitrary path queries into root-to-node queries, which Euler tour + BIT can handle.

---

<AlgoViz title="Trie — Insert and Search Operations" description="Insert words 'cat', 'car', 'cap' into a Trie, then search for 'car', 'can', and prefix 'ca'." steps={[
  { hashMap: [], variables: { op: "init" }, explanation: "Empty Trie: root node with no children. Each node has a children map and an isEnd boolean flag.", code: "TrieNode root = new TrieNode();" },
  { hashMap: [["root→c→a→t", "END"]], variables: { op: "insert('cat')" }, explanation: "Insert 'cat': create path root→c→a→t. Mark 't' node as end-of-word.", code: "// traverse/create c→a→t, set isEnd=true" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"]], variables: { op: "insert('car')", shared: "prefix 'ca' reused" }, explanation: "Insert 'car': reuse existing c→a path, create new 'r' child at node 'a'. Mark 'r' as end-of-word.", code: "// shared prefix 'ca', branch at 'r'" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"], ["root→c→a→p", "END"]], variables: { op: "insert('cap')", children_of_a: "t, r, p" }, explanation: "Insert 'cap': reuse c→a, add 'p' child. Node 'a' now has 3 children: {t, r, p}.", code: "// node 'a' branches to t, r, p" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"], ["root→c→a→p", "END"]], variables: { op: "search('car')", result: "TRUE" }, explanation: "Search 'car': root→c(exists)→a(exists)→r(exists, isEnd=true). Word found!", code: "// follow c→a→r, isEnd==true → found" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"], ["root→c→a→p", "END"]], variables: { op: "search('can')", result: "FALSE" }, explanation: "Search 'can': root→c→a→n? Node 'a' has no child 'n'. Word not found.", code: "// node.children.get('n') == null → false" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"], ["root→c→a→p", "END"]], variables: { op: "search('ca')", result: "FALSE (prefix only)" }, explanation: "Search 'ca': c→a exists, but node 'a' has isEnd=false. 'ca' is a prefix, not a stored word.", code: "// path exists but isEnd==false → not a word" },
  { hashMap: [["root→c→a→t", "END"], ["root→c→a→r", "END"], ["root→c→a→p", "END"]], variables: { op: "startsWith('ca')", result: "TRUE", complexity: "O(L) per op" }, explanation: "startsWith('ca'): path c→a exists → prefix found. Trie gives O(L) insert/search where L = word length.", code: "// startsWith: just check if path exists" }
]} />

### 4. Heavy-Light Decomposition (HLD) — Concept Preview

HLD decomposes a tree into **chains** of heavy edges so that any root-to-node path crosses at most O(log n) chains. Each chain is stored as a contiguous segment in an array, enabling segment tree queries on arbitrary paths.

**When to reach for HLD:**
- Path update + path query (not just subtree)
- Problems requiring max/min/sum on tree paths with updates

We'll revisit HLD in depth in a future week. For now, know that binary lifting + Euler tour solve 90% of tree-path problems in interviews.

<AlgoViz title="Segment Tree — Range Sum Query on Tree" description="Build sum segment tree for [2, 1, 5, 3], then query sum(1, 3). Shows recursive decomposition." steps={[
  { array: [2, 1, 5, 3], highlights: [], labels: {"0":"idx 0","1":"idx 1","2":"idx 2","3":"idx 3"}, variables: { phase: "Input" }, explanation: "Input array: [2, 1, 5, 3]. Build a sum segment tree with 4 leaves and 3 internal nodes.", code: "SegmentTree st = new SegmentTree(data);" },
  { array: [0, 0, 0, 0, 2, 1, 5, 3], highlights: [4, 5, 6, 7], labels: {"4":"[0,0]","5":"[1,1]","6":"[2,2]","7":"[3,3]"}, variables: { phase: "Leaves" }, explanation: "Recursion hits leaves: tree[4]=2, tree[5]=1, tree[6]=5, tree[7]=3. Each covers one element.", code: "if (start == end) tree[node] = data[start];" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [1, 2, 3], labels: {"1":"[0,3]","2":"[0,1]","3":"[2,3]"}, variables: { phase: "Build complete" }, explanation: "Internal nodes: tree[2]=2+1=3, tree[3]=5+3=8, tree[1]=3+8=11. Root covers entire range [0,3].", code: "tree[node] = tree[2*node] + tree[2*node+1];" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [1], variables: { query: "sum(1,3)", node: "[0,3]" }, explanation: "Query sum(1,3): root [0,3] partially overlaps query [1,3]. Must recurse into both children.", code: "// partial overlap → recurse left and right" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [5], secondary: [4], variables: { query: "left child", result: "0+1=1" }, explanation: "Left child [0,1]: partial overlap. [0,0] out of range returns 0. [1,1] fully covered returns 1.", code: "// [0,0]: return 0; [1,1]: return 1" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [3], variables: { query: "right child", result: "8" }, explanation: "Right child [2,3]: fully within [1,3]. Return tree[3]=8 directly — no further recursion needed.", code: "if (l <= start && end <= r) return tree[node];" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [3, 5], variables: { result: "1 + 8 = 9" }, explanation: "Combine results: left=1, right=8. Total = 1+8 = 9. Only visited 5 of 7 nodes.", code: "return query(left) + query(right); // 9" },
  { array: [0, 11, 3, 8, 2, 1, 5, 3], highlights: [], variables: { result: "9", complexity: "O(log n) per query" }, explanation: "sum(1,3) = 9. Segment tree answers range queries in O(log n) with O(log n) updates. Build is O(n).", code: "return 9; // O(log 4) nodes visited" }
]} />

---

## Complexity Reference

| Operation | Time | Space |
|---|---|---|
| Binary lifting — preprocess | O(n log n) | O(n log n) |
| Binary lifting — LCA query | O(log n) | — |
| Binary lifting — kth ancestor | O(log n) | — |
| Euler tour — build | O(n) | O(n) |
| Subtree query (BIT/seg tree) | O(log n) | O(n) |
| Path query via LCA decomposition | O(log n) | — |

---

## Worked Example: LCA of a Binary Tree (LC 236)

### Problem

Given a binary tree and two nodes `p` and `q`, find their lowest common ancestor.

### Binary Lifting Trace

```
Tree:
          3
         / \
        5    1
       / \  / \
      6  2  0  8
        / \
       7   4

Nodes: [3, 5, 1, 6, 2, 0, 8, 7, 4]  (0-indexed labels for lifting)
Mapping: 3→0, 5→1, 1→2, 6→3, 2→4, 0→5, 8→6, 7→7, 4→8
```

**Step 1 — Build depth and parent table (BFS from root 0):**

| Node (original) | Index | Depth | up[·][0] (parent) |
|---|---|---|---|
| 3 | 0 | 0 | 0 (self) |
| 5 | 1 | 1 | 0 |
| 1 | 2 | 1 | 0 |
| 6 | 3 | 2 | 1 |
| 2 | 4 | 2 | 1 |
| 0 | 5 | 2 | 2 |
| 8 | 6 | 2 | 2 |
| 7 | 7 | 3 | 4 |
| 4 | 8 | 3 | 4 |

**Step 2 — Fill higher ancestors:**

| Node | up[·][0] | up[·][1] | up[·][2] | up[·][3] |
|---|---|---|---|---|
| 7 (idx 7) | 4 | 1 | 0 | 0 |
| 4 (idx 8) | 4 | 1 | 0 | 0 |
| 6 (idx 3) | 1 | 0 | 0 | 0 |

**Step 3 — Query LCA(5, 4) → LCA(idx 1, idx 8):**

1. depth[1] = 1, depth[8] = 3 → bring idx 8 up by 2.
2. `kth_ancestor(8, 2)`: bit 1 set → `up[8][1] = 1`. Now both at idx 1.
3. u == v → LCA is idx 1, which is node **5**. ✅

<AlgoViz title="LCA via Binary Lifting — Query Trace" description="Finding LCA(5, 4) in the example tree. Array shows node depths (index = internal ID)." steps={[
  { array: [0, 1, 1, 2, 2, 2, 2, 3, 3], highlights: [], variables: { mapping: "3:0, 5:1, 1:2, 6:3, 2:4, 0:5, 8:6, 7:7, 4:8" }, explanation: "Tree rooted at node 3 (idx 0). Depth array built via BFS.", code: "// BFS from root, depth[root] = 0" },
  { array: [0, 1, 1, 2, 2, 2, 2, 3, 3], highlights: [1, 8], variables: { u: "idx 1 (node 5) depth=1", v: "idx 8 (node 4) depth=3" }, explanation: "Query LCA(5,4): u=idx1 depth 1, v=idx8 depth 3. Equalize depths by lifting v.", code: "int diff = depth[v] - depth[u]; // 3-1=2" },
  { array: [0, 1, 1, 2, 2, 2, 2, 3, 3], highlights: [1, 8], variables: { lifting: "kthAncestor(8, 2)", step: "up[8][1] = 1" }, explanation: "Lift node 4 (idx 8) up by 2: up[8][1] = up[up[8][0]][0] = up[4][0] = 1.", code: "v = kthAncestor(8, 2); // -> idx 1" },
  { array: [0, 1, 1, 2, 2, 2, 2, 3, 3], highlights: [1], variables: { u: "idx 1", v: "idx 1", result: "node 5" }, explanation: "After lifting: u == v == idx 1. LCA is node 5.", code: "if (u == v) return u; // LCA = node 5" }
]} />

**Step 4 — Query LCA(5, 1) → LCA(idx 1, idx 2):**

1. Same depth (1). Not equal.
2. k=3,2,1: `up[1][k] == up[2][k]` for all (both converge to root). Skip.
3. k=0: `up[1][0] = 0`, `up[2][0] = 0` → equal. Skip.
4. Return `up[1][0] = 0` → node **3** (root). ✅

---

## Pattern Recognition Guide

| Pattern / Clue | Technique |
|---|---|
| "Find LCA of two nodes" | Binary lifting (general tree) or recursive split (binary tree) |
| "Distance between two nodes in a tree" | LCA + depth formula |
| "Sum / max / count in a subtree" | Euler tour + BIT / segment tree |
| "Sum / max along a path u→v" | Path = root→u + root→v − 2·root→lca, or HLD |
| "Kth ancestor" | Binary lifting table |
| "Is u an ancestor of v?" | Euler tour: `tin[u] ≤ tin[v] ≤ tout[u]` |
| "Re-rooting" / "Sum of distances from every node" | Rerooting DP (two-pass DFS) |
| "Flatten tree into array" | Euler tour |
| "Update node value, query subtree" | Euler tour + BIT (point update, range query) |

---

## Problem Set — 21 Problems over 7 Days

### Days 1–2: LCA Fundamentals & Path Queries (6 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 1 | Lowest Common Ancestor of a Binary Tree | 236 | Medium | Recursive DFS or binary lifting | Classic — every interviewer's go-to |
| 2 | Lowest Common Ancestor of a BST | 235 | Medium | BST property (split point) | O(h) without any preprocessing |
| 3 | Distance Between Two Nodes in BST | — | Medium | LCA + depth | dist = depth[u]+depth[v]−2·depth[lca] |
| 4 | Kth Ancestor of a Tree Node | 1483 | Hard | Binary lifting | Direct application of `up` table |
| 5 | Sum of Distances in Tree | 834 | Hard | Rerooting DP (two-pass) | Count-based rerooting, classic pattern |
| 6 | Binary Tree Maximum Path Sum | 124 | Hard | Post-order DFS, global max | Combine left+right gains at each node |

### Days 3–4: Subtree & Distance Problems (8 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 7 | Count Nodes Equal to Sum of Descendants | 1973 | Medium | Post-order subtree sum | Return subtree sum, compare at each node |
| 8 | All Nodes Distance K in Binary Tree | 863 | Medium | BFS from target after parent mapping | Convert tree to graph, BFS |
| 9 | Distribute Coins in Binary Tree | 979 | Medium | Post-order DFS, flow counting | Moves = sum of |excess| at each edge |
| 10 | Diameter of Binary Tree | 543 | Easy | Post-order depth, track max path | Diameter = max(left_depth + right_depth) |
| 11 | Max Difference Between Node and Ancestor | 1026 | Medium | DFS carrying min/max from root | At each node: max(|val−min|, |val−max|) |
| 12 | Binary Tree Cameras | 968 | Hard | Greedy post-order (3-state DP) | States: covered, has camera, needs cover |
| 13 | Serialize and Deserialize Binary Tree | 297 | Hard | Preorder with null markers | Serialize: preorder; Deserialize: queue-based |
| 14 | Vertical Order Traversal | 987 | Hard | BFS with (col, row) coordinates | Sort by col, then row, then value |

### Days 5–7: Euler Tour, Advanced LCA & Competition-Style (7 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 15 | Count Nodes in Sub-Tree (Euler tour practice) | — | Medium | Euler tour + BIT | Build tour, range sum for subtree |
| 16 | Tree Queries | 2458 | Hard | Euler tour + depth tracking | Remove node → check if tree stays connected |
| 17 | Minimum Edge Weight Equilibrium Queries | 2846 | Hard | Binary lifting + frequency on path | LCA + frequency counts along edges |
| 18 | Count Pairs of Nodes | 1782 | Hard | Degree counting + edge correction | Inclusion-exclusion on shared edges |
| 19 | Closest Node to Path in Tree | 2277 | Hard | LCA + distance formula | Find closest node to the u→v path |
| 20 | Cycle Length Queries in a Tree | 2509 | Hard | Binary lifting for LCA | Cycle = dist(u,v) + 1 |
| 21 | Number of Nodes in Sub-Tree With Same Label | 1519 | Medium | DFS with frequency array | Pass frequency counts up during DFS |

---

## Mock Interview Simulation

### Round 1 — Sum of Distances in Tree (LC 834)

**Interviewer:** "Given an unweighted tree of `n` nodes, return an array `answer` where `answer[i]` is the sum of distances from node `i` to all other nodes."

**Candidate approach — Rerooting DP:**

1. **First DFS (root at 0):** Compute `count[node]` = subtree size and `dist_sum[0]` = total distance from root.
2. **Second DFS (reroot):** When moving the root from parent `p` to child `c`:
   ```
   answer[c] = answer[p] - count[c] + (n - count[c])
   ```
   Moving toward `c` decreases distance for the `count[c]` nodes in c's subtree by 1, and increases it for the remaining `n - count[c]` nodes by 1.

```java
static int[] sumOfDistancesInTree(int n, int[][] edges) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }

    int[] count = new int[n], ans = new int[n];
    Arrays.fill(count, 1);

    // DFS1: compute ans[0] and subtree sizes
    Deque<int[]> stack = new ArrayDeque<>();
    stack.push(new int[]{0, -1, 0}); // {node, parent, depth}
    List<int[]> order = new ArrayList<>();
    while (!stack.isEmpty()) {
        int[] cur = stack.pop();
        order.add(cur);
        ans[0] += cur[2];
        for (int child : adj.get(cur[0]))
            if (child != cur[1]) stack.push(new int[]{child, cur[0], cur[2] + 1});
    }
    for (int i = order.size() - 1; i >= 0; i--) {
        int node = order.get(i)[0], parent = order.get(i)[1];
        if (parent != -1) count[parent] += count[node];
    }

    // DFS2: reroot
    for (int[] cur : order) {
        int node = cur[0], parent = cur[1];
        if (parent != -1) ans[node] = ans[parent] - count[node] + (n - count[node]);
    }
    return ans;
}
```

**Follow-up 1:** "What if edges have weights?"
→ Multiply each edge contribution by its weight. `answer[c] = answer[p] - w * count[c] + w * (n - count[c])` where `w` is the weight of edge (p, c). Store weighted sums.

**Follow-up 2:** "What if we need to support adding/removing edges dynamically?"
→ Euler tour + Link-Cut Trees or offline processing with LCA. In an interview, describe the approach conceptually — full implementation of Link-Cut trees is rarely expected.

**Follow-up 3:** "Can you do this on a tree given as a binary tree (not adjacency list)?"
→ Same two-pass idea. First pass gathers subtree sizes and root distances. Second pass reroots. Convert child pointers to adjacency list first, or track parent pointers.

---

### Round 2 — Binary Tree Maximum Path Sum (LC 124)

**Interviewer:** "Given a binary tree, find the maximum path sum. A path can start and end at any node."

**Candidate approach:**

At each node, compute the maximum gain extending downward through one branch. The path through the current node = `left_gain + right_gain + node.val`. Track the global max.

```java
int maxSum = Integer.MIN_VALUE;

int maxPathSum(TreeNode root) {
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

**Follow-up 1:** "What if we need to return the actual path, not just the sum?"
→ Track the path nodes during DFS. At each node, record the best left-path and right-path. When updating `max_sum`, save the concatenation `reverse(left_path) + [node] + right_path`.

**Follow-up 2:** "What if negative values are not allowed in the path (path must be non-negative)?"
→ Only start a path at nodes with non-negative values. Clamp gains to 0 as before, but also skip updating `max_sum` if `node.val + left + right < 0`. Edge case: if all values are negative, return 0 (empty path) or clarify with interviewer.

**Follow-up 3:** "What if the tree is an n-ary tree?"
→ Same idea: compute gains from all children, pick the two largest. `max_sum = max(max_sum, node.val + top1 + top2)`. Return `node.val + top1`.

---

## Tips & Pitfalls

1. **0-indexed vs 1-indexed trees:** Many competitive programming solutions use 1-indexed nodes. If your input is 0-indexed, make sure your `up` table and Euler tour arrays are sized correctly. Off-by-one here causes subtle bugs.

2. **Handling forests:** If the graph has multiple connected components, run BFS/DFS from each unvisited node. Binary lifting works per component — querying LCA across different trees is undefined.

3. **Setting the proper root:** Binary lifting requires a rooted tree. If the problem says "unrooted tree," pick any node (commonly node 0) as root. The choice doesn't affect correctness of LCA queries.

4. **Root as its own ancestor:** Set `up[root][0] = root` (not -1). This prevents index errors when jumping past the root — you simply stay at the root.

5. **Recursive DFS stack overflow:** Java's default thread stack size may be insufficient for deep recursion on trees with 10^5+ nodes. Use **iterative DFS** (stack-based) or increase the stack size via the `-Xss` JVM flag, or run DFS in a new thread with a larger stack. The templates above use iterative approaches for this reason.

6. **Euler tour vs DFS order:** There are multiple "Euler tour" definitions. For subtree queries, you need **in-time and out-time** (sometimes called a "DFS order" or "flattening"). The version that lists each node twice (entering and leaving) is used for path queries with segment trees.

7. **LCA on binary trees — interview shortcut:** For binary tree problems (not general trees), the simple recursive approach (LC 236) is perfectly fine and expected. Reach for binary lifting when the tree is general (adjacency list) or when you need kth-ancestor / distance queries.

8. **Rerooting DP template:** Almost every "compute X for all nodes as root" problem follows the two-pass pattern: (1) root arbitrarily, compute answer for root, (2) propagate to children using the transition formula. Memorize this skeleton.
