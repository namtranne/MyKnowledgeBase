# Advanced Topics

> The advanced topics chapter covers mathematical foundations, graph algorithms, string matching, and self-balancing tree structures that underpin much of computer science. These aren't just theoretical — they appear in system design interviews, algorithm problems, and real-world engineering decisions. Understanding them deeply gives you an edge when problems go beyond standard patterns.

---

## Useful Math

### Sum of Powers of 2

The sum of powers of 2 from 2⁰ to 2ⁿ has a closed-form result:

```
2⁰ + 2¹ + 2² + ... + 2ⁿ = 2ⁿ⁺¹ - 1
```

| Expression | Value | Intuition |
|-----------|-------|-----------|
| 2⁰ + 2¹ + 2² + 2³ | 15 = 2⁴ - 1 | A complete binary tree of height 3 has 15 nodes |
| 2⁰ + 2¹ + ... + 2⁹ | 1023 = 2¹⁰ - 1 | ~1K |
| 2⁰ + 2¹ + ... + 2¹⁹ | ~1M | Sum of all nodes in a tree of height 19 |

> This sum appears constantly in algorithm analysis: the total work in merge sort's recursion tree, the number of nodes in a complete binary tree, and the number of subsets of a set.

### Logarithm Bases

```
log₂(n)  ← most common in CS (binary search, trees, divide & conquer)
log₁₀(n) ← number of digits in n
logₑ(n)  ← natural log (calculus, probability)

Conversion:  logₐ(n) = logᵦ(n) / logᵦ(a)
             log₂(n) = ln(n) / ln(2) ≈ ln(n) × 1.4427
```

| log₂(n) | n | Where You See It |
|---------|---|-----------------|
| 10 | 1,024 | Binary search on 1K elements |
| 20 | ~1M | Binary search on 1M elements |
| 30 | ~1B | Binary search on 1B elements |
| 32 | 4B | Bits in a 32-bit integer |

> In Big-O analysis, log bases don't matter because logₐ(n) = O(logᵦ(n)) — they differ only by a constant factor. But when computing actual values (e.g., tree height), the base matters.

### Permutations and Combinations

| Formula | Expression | Meaning |
|---------|-----------|---------|
| **Permutation** | P(n, k) = n! / (n-k)! | Ordered arrangements of k items from n |
| **Combination** | C(n, k) = n! / (k!(n-k)!) | Unordered selections of k items from n |
| **With repetition** | n^k | k choices from n items, repetition allowed |

```
Example: "How many 4-digit PINs?" → 10⁴ = 10,000 (repetition allowed)
Example: "Choose 3 from 10 people" → C(10,3) = 120
Example: "Arrange 3 from 10 in order" → P(10,3) = 720
```

### Proof by Induction

A technique for proving statements about all natural numbers:

```
┌────────────────────────────────────────────────────────────┐
│                   PROOF BY INDUCTION                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. BASE CASE:   Prove P(1) is true                        │
│                  (or P(0), depending on domain)             │
│                                                              │
│  2. INDUCTIVE HYPOTHESIS:  Assume P(k) is true             │
│                            for some arbitrary k             │
│                                                              │
│  3. INDUCTIVE STEP:  Prove P(k+1) is true                  │
│                      using the hypothesis                   │
│                                                              │
│  CONCLUSION:  P(n) is true for all n ≥ 1                   │
│  (like dominoes: first falls, each knocks the next)         │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Example: Prove 1 + 2 + ... + n = n(n+1)/2**

- **Base case:** n = 1: 1 = 1×2/2 = 1 ✓
- **Hypothesis:** Assume 1 + 2 + ... + k = k(k+1)/2
- **Step:** 1 + 2 + ... + k + (k+1) = k(k+1)/2 + (k+1) = (k+1)(k+2)/2 ✓

---

## Topological Sort

A linear ordering of vertices in a **Directed Acyclic Graph (DAG)** such that for every directed edge (u, v), vertex u comes before v.

```
┌─────────────────────────────────────────────────────────────┐
│  Example DAG (course prerequisites):                         │
│                                                               │
│    Calculus I ──→ Calculus II ──→ Diff Equations              │
│        │                              ↑                       │
│        └──→ Linear Algebra ───────────┘                      │
│                    │                                          │
│                    └──→ Machine Learning                      │
│                                                               │
│  Valid topological orders:                                    │
│    [Calc I, Linear Algebra, Calc II, ML, Diff Eq]            │
│    [Calc I, Calc II, Linear Algebra, ML, Diff Eq]            │
│                                                               │
│  NOT valid: [..., Calc II, ..., Calc I, ...]                 │
│  (Calc I must come before Calc II)                           │
└─────────────────────────────────────────────────────────────┘
```

### Algorithm 1: DFS-Based (Reverse Post-Order)

```java
List<Integer> topologicalSortDFS(int numNodes, List<List<Integer>> adj) {
    boolean[] visited = new boolean[numNodes];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < numNodes; i++) {
        if (!visited[i]) dfs(i, adj, visited, stack);
    }

    List<Integer> result = new ArrayList<>();
    while (!stack.isEmpty()) result.add(stack.pop());
    return result;
}

void dfs(int node, List<List<Integer>> adj, boolean[] visited, Deque<Integer> stack) {
    visited[node] = true;
    for (int neighbor : adj.get(node)) {
        if (!visited[neighbor]) dfs(neighbor, adj, visited, stack);
    }
    stack.push(node);
}
```

### Algorithm 2: Kahn's BFS-Based (In-Degree Reduction)

```java
List<Integer> topologicalSortBFS(int numNodes, List<List<Integer>> adj) {
    int[] inDegree = new int[numNodes];
    for (List<Integer> neighbors : adj) {
        for (int n : neighbors) inDegree[n]++;
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numNodes; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }

    List<Integer> result = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        result.add(node);
        for (int neighbor : adj.get(node)) {
            if (--inDegree[neighbor] == 0) queue.offer(neighbor);
        }
    }

    if (result.size() != numNodes) throw new RuntimeException("Cycle detected");
    return result;
}
```

### Comparison

| Property | DFS-Based | Kahn's BFS-Based |
|----------|-----------|-------------------|
| **Cycle detection** | Requires separate check (back edge) | Built-in (result size < numNodes) |
| **Complexity** | O(V + E) | O(V + E) |
| **Output** | One valid ordering | One valid ordering |
| **Implementation** | Recursive (stack-based) | Iterative (queue-based) |

### Use Cases

| Application | Why Topological Sort |
|-------------|---------------------|
| **Build systems** (Make, Gradle) | Compile dependencies before dependents |
| **Course scheduling** | Prerequisites before advanced courses |
| **Task scheduling** | Dependency resolution in CI/CD pipelines |
| **Package managers** | Install dependencies in correct order |
| **Spreadsheet evaluation** | Evaluate cells in dependency order |

---

## Dijkstra's Algorithm

Finds the **shortest path** from a source vertex to all other vertices in a **weighted graph with non-negative edge weights**.

### Algorithm

```
┌──────────────────────────────────────────────────────────────┐
│                   DIJKSTRA'S ALGORITHM                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Initialize dist[source] = 0, dist[all others] = ∞        │
│  2. Add source to priority queue                               │
│  3. While priority queue is not empty:                         │
│     a. Extract vertex u with minimum distance                  │
│     b. For each neighbor v of u:                               │
│        if dist[u] + weight(u,v) < dist[v]:                    │
│           dist[v] = dist[u] + weight(u,v)                     │
│           prev[v] = u                                          │
│           add/update v in priority queue                       │
│                                                                │
│  Greedy strategy: always expand the closest unvisited vertex   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Walkthrough

```
Graph:
    A ──(4)──→ B ──(1)──→ D
    │          ↑          ↑
   (1)       (2)        (5)
    │          │          │
    └──→ C ───┘──(8)─────┘

Step 0: dist = {A:0, B:∞, C:∞, D:∞}         PQ: [(A,0)]
Step 1: Visit A → update C(1), B(4)          PQ: [(C,1), (B,4)]
Step 2: Visit C → update B(3)               PQ: [(B,3), (D,9)]
Step 3: Visit B → update D(4)               PQ: [(D,4)]
Step 4: Visit D → done                       Final: {A:0, B:3, C:1, D:4}
```

### Implementation

```java
int[] dijkstra(int source, List<List<int[]>> adj, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.offer(new int[]{source, 0});

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], d = curr[1];
        if (d > dist[u]) continue;

        for (int[] edge : adj.get(u)) {
            int v = edge[0], weight = edge[1];
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.offer(new int[]{v, dist[v]});
            }
        }
    }
    return dist;
}
```

### Complexity

| Implementation | Time | Space |
|---------------|------|-------|
| Binary heap (PriorityQueue) | O((V + E) log V) | O(V) |
| Fibonacci heap | O(V log V + E) | O(V) |
| Simple array (no heap) | O(V²) | O(V) |

> Use the binary heap version for interviews — it's the practical default. The array version is better for dense graphs (E ≈ V²). Dijkstra **does not work** with negative edge weights — use Bellman-Ford instead.

---

## Hash Table Collision Resolution

When two keys hash to the same bucket, a **collision** occurs. The collision resolution strategy determines both correctness and performance.

### Strategy 1: Chaining (Separate Chaining)

Each bucket holds a linked list (or other collection) of all entries that hash to it.

```
┌────────────────────────────────────────────────────┐
│                CHAINING                              │
│                                                      │
│  Bucket 0: → [K₁:V₁] → [K₅:V₅] → null             │
│  Bucket 1: → [K₂:V₂] → null                        │
│  Bucket 2: → null                                    │
│  Bucket 3: → [K₃:V₃] → [K₆:V₆] → [K₇:V₇] → null │
│  Bucket 4: → [K₄:V₄] → null                        │
│                                                      │
│  • Load factor α = n/m (entries/buckets)             │
│  • Average chain length = α                          │
│  • Lookup: O(1 + α) expected                         │
│                                                      │
│  Java 8+ optimization: if chain > 8 entries,         │
│  convert linked list to red-black tree → O(log n)    │
│  per bucket instead of O(n)                          │
│                                                      │
└────────────────────────────────────────────────────┘
```

### Strategy 2: Open Addressing

All entries are stored directly in the array. On collision, probe for the next available slot.

```
┌────────────────────────────────────────────────────┐
│            OPEN ADDRESSING                           │
│                                                      │
│  Index: 0    1    2    3    4    5    6    7          │
│       [K₁] [K₅] [K₂] [  ] [K₃] [K₆] [K₄] [  ]    │
│              ↑                                       │
│        K₅ hashed to 0, probed to 1                   │
│                                                      │
└────────────────────────────────────────────────────┘
```

#### Probing Methods

| Method | Probe Sequence | Pros | Cons |
|--------|---------------|------|------|
| **Linear probing** | h(k), h(k)+1, h(k)+2, ... | Cache-friendly, simple | Primary clustering |
| **Quadratic probing** | h(k), h(k)+1², h(k)+2², ... | Reduces primary clustering | Secondary clustering, may not visit all slots |
| **Double hashing** | h(k), h(k)+h₂(k), h(k)+2·h₂(k), ... | Minimal clustering | More computation per probe |

```
LINEAR PROBING — clustering example:

  Index: 0    1    2    3    4    5    6    7
       [A]  [B]  [C]  [D]  [  ] [  ] [  ] [  ]
        ←—— cluster ——→
       Inserting into this cluster requires scanning
       through all clustered elements first.
```

### Load Factor and Resizing

| Load Factor (α) | Impact |
|-----------------|--------|
| α < 0.5 | Fast lookups, wasted space |
| α ≈ 0.75 | Good balance (Java HashMap default resize threshold) |
| α > 0.9 | Many collisions, performance degrades significantly |
| α > 1.0 | Only possible with chaining |

> When load factor exceeds the threshold, the table **resizes** (typically doubles capacity) and all entries are **rehashed**. This is O(n) but happens infrequently, giving amortized O(1) insertions.

### Comparison

| Feature | Chaining | Open Addressing |
|---------|----------|-----------------|
| **Load factor** | Can exceed 1.0 | Must stay below 1.0 |
| **Deletion** | Simple (remove from list) | Complex (requires tombstones) |
| **Cache performance** | Poor (pointer chasing) | Better (contiguous memory) |
| **Memory overhead** | Extra pointers per entry | No extra pointers |
| **Best for** | Unknown/variable load | Known max size, cache-sensitive |
| **Used by** | Java HashMap, C++ unordered_map | Python dict, Rust HashMap |

---

## Rabin-Karp Substring Search

A string matching algorithm that uses **rolling hashes** to efficiently find a pattern in a text.

### Core Idea

Instead of comparing characters one by one, compute a hash of the pattern and compare it against the hash of each substring of the text. When hashes match, verify with character comparison to handle collisions.

```
┌─────────────────────────────────────────────────────────────┐
│                   RABIN-KARP ALGORITHM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Text:    "ABCCDABCDABC"    Pattern: "ABCD"                  │
│                                                               │
│  Step 1: hash("ABCD") = H                                   │
│                                                               │
│  Step 2: Slide window, compute rolling hash:                 │
│   hash("ABCC") ≠ H  → skip                                  │
│   hash("BCCD") ≠ H  → skip                                  │
│   hash("CCDA") ≠ H  → skip                                  │
│   hash("CDAB") ≠ H  → skip                                  │
│   hash("DABC") ≠ H  → skip                                  │
│   hash("ABCD") = H  → verify chars → MATCH at index 5      │
│   hash("BCDA") ≠ H  → skip                                  │
│   hash("CDAB") ≠ H  → skip                                  │
│   hash("DABC") ≠ H  → skip                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Rolling Hash

The key insight is that the hash of the next window can be computed from the current hash in O(1):

```
hash("BCCD") = (hash("ABCC") - 'A' × baseᵐ⁻¹) × base + 'D'

Where:
  base = a prime (e.g., 31 or 256)
  m    = pattern length
```

### Code Sketch

```java
int rabinKarp(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    if (m > n) return -1;

    long base = 31, mod = 1_000_000_007;
    long patHash = 0, txtHash = 0, power = 1;

    for (int i = 0; i < m; i++) {
        patHash = (patHash * base + pattern.charAt(i)) % mod;
        txtHash = (txtHash * base + text.charAt(i)) % mod;
        if (i > 0) power = (power * base) % mod;
    }

    for (int i = 0; i <= n - m; i++) {
        if (patHash == txtHash) {
            if (text.substring(i, i + m).equals(pattern)) return i;
        }
        if (i < n - m) {
            txtHash = (txtHash - text.charAt(i) * power % mod + mod) % mod;
            txtHash = (txtHash * base + text.charAt(i + m)) % mod;
        }
    }
    return -1;
}
```

### Complexity

| Case | Time | Why |
|------|------|-----|
| **Expected** | O(N + M) | Hash comparisons are O(1), few false positives |
| **Worst case** | O(N × M) | Many hash collisions require character-by-character verification |

> Rabin-Karp shines when searching for **multiple patterns** simultaneously — compute all pattern hashes upfront. Also useful for plagiarism detection and DNA sequence matching.

---

## AVL Trees

An **AVL tree** is a self-balancing Binary Search Tree where the height difference (balance factor) between left and right subtrees of every node is at most 1.

### Balance Factor

```
balance(node) = height(left) - height(right)

Valid balance factors: {-1, 0, +1}
If |balance| > 1, the tree is unbalanced → perform rotation
```

### Rotation Operations

```
RIGHT ROTATION (Left-heavy, balance = +2):

        z (+2)               y (0)
       / \                  / \
      y   T4    ──→       x    z
     / \                 / \  / \
    x   T3              T1 T2 T3 T4
   / \
  T1  T2


LEFT ROTATION (Right-heavy, balance = -2):

    z (-2)                   y (0)
   / \                      / \
  T1   y       ──→        z    x
      / \                / \  / \
     T2   x             T1 T2 T3 T4
         / \
        T3  T4
```

### Double Rotations

```
LEFT-RIGHT (Left child is right-heavy):

      z (+2)            z (+2)             x (0)
     / \               / \                / \
    y   T4   ──→     x   T4    ──→      y    z
   / \              / \                / \  / \
  T1   x           y   T3            T1 T2 T3 T4
      / \         / \
     T2  T3      T1  T2

  Step 1: Left rotate y       Step 2: Right rotate z


RIGHT-LEFT (Right child is left-heavy):

    z (-2)             z (-2)               x (0)
   / \                / \                  / \
  T1   y    ──→      T1   x     ──→      z    y
      / \                / \            / \  / \
     x   T4            T2   y         T1 T2 T3 T4
    / \                     / \
   T2  T3                  T3  T4

  Step 1: Right rotate y      Step 2: Left rotate z
```

### When Each Rotation Applies

| Imbalance Pattern | Rotation | Condition |
|-------------------|----------|-----------|
| Left-left | Single right rotation | balance(z) = +2, balance(y) ≥ 0 |
| Right-right | Single left rotation | balance(z) = -2, balance(y) ≤ 0 |
| Left-right | Left then right | balance(z) = +2, balance(y) < 0 |
| Right-left | Right then left | balance(z) = -2, balance(y) > 0 |

### Implementation Sketch

```java
class AVLTree {
    class Node {
        int key, height;
        Node left, right;
        Node(int key) { this.key = key; this.height = 1; }
    }

    int height(Node n) { return n == null ? 0 : n.height; }
    int balance(Node n) { return n == null ? 0 : height(n.left) - height(n.right); }

    Node rightRotate(Node z) {
        Node y = z.left;
        Node t3 = y.right;
        y.right = z;
        z.left = t3;
        z.height = Math.max(height(z.left), height(z.right)) + 1;
        y.height = Math.max(height(y.left), height(y.right)) + 1;
        return y;
    }

    Node leftRotate(Node z) {
        Node y = z.right;
        Node t2 = y.left;
        y.left = z;
        z.right = t2;
        z.height = Math.max(height(z.left), height(z.right)) + 1;
        y.height = Math.max(height(y.left), height(y.right)) + 1;
        return y;
    }

    Node insert(Node node, int key) {
        if (node == null) return new Node(key);
        if (key < node.key) node.left = insert(node.left, key);
        else if (key > node.key) node.right = insert(node.right, key);
        else return node;

        node.height = Math.max(height(node.left), height(node.right)) + 1;
        int bal = balance(node);

        if (bal > 1 && key < node.left.key) return rightRotate(node);
        if (bal < -1 && key > node.right.key) return leftRotate(node);
        if (bal > 1 && key > node.left.key) {
            node.left = leftRotate(node.left);
            return rightRotate(node);
        }
        if (bal < -1 && key < node.right.key) {
            node.right = rightRotate(node.right);
            return leftRotate(node);
        }
        return node;
    }
}
```

### Properties

| Operation | Time Complexity |
|-----------|:--------------:|
| Search | O(log n) |
| Insert | O(log n) |
| Delete | O(log n) |
| Height of tree with n nodes | ≤ 1.44 × log₂(n) |

---

## Red-Black Trees

A self-balancing BST with weaker balance guarantees than AVL but fewer rotations on insert/delete.

### Five Properties (Invariants)

```
┌────────────────────────────────────────────────────────────┐
│                RED-BLACK TREE RULES                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Every node is either RED or BLACK                       │
│  2. The root is BLACK                                       │
│  3. Every leaf (NIL) is BLACK                               │
│  4. If a node is RED, both its children are BLACK           │
│     (no two consecutive red nodes on any path)              │
│  5. Every path from a node to its descendant NILs           │
│     has the same number of black nodes (black-height)       │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Visual Example

```
             8(B)
           /      \
         4(R)      12(R)
        /   \      /    \
      2(B)  6(B) 10(B)  14(B)
      / \   / \   / \    / \
     1  3  5  7  9  11  13  15
    (R)(R)(R)(R)(R)(R) (R) (R)
```

### Insertion Cases

New nodes are always inserted as RED. Then fix violations:

| Case | Situation | Fix |
|------|-----------|-----|
| 1 | Node is root | Recolor to BLACK |
| 2 | Parent is BLACK | No violation — done |
| 3 | Parent and uncle are RED | Recolor parent+uncle to BLACK, grandparent to RED, recurse on grandparent |
| 4 | Parent is RED, uncle is BLACK, node is "inner" child | Rotate to make it an "outer" child (case 5) |
| 5 | Parent is RED, uncle is BLACK, node is "outer" child | Rotate grandparent, swap colors of parent and grandparent |

### AVL vs. Red-Black Trees

| Property | AVL Tree | Red-Black Tree |
|----------|----------|---------------|
| **Balance strictness** | Strictly balanced (±1) | Loosely balanced (≤ 2× height) |
| **Max height (n nodes)** | 1.44 × log₂(n) | 2 × log₂(n+1) |
| **Search** | Slightly faster (shorter height) | Slightly slower |
| **Insert/Delete** | More rotations (up to O(log n)) | Fewer rotations (≤ 2 for insert, ≤ 3 for delete) |
| **Use case** | Read-heavy workloads | Write-heavy workloads |
| **Used by** | Database indexes, in-memory lookups | Java TreeMap/TreeSet, Linux kernel, C++ std::map |

> For interviews, know that red-black trees exist, their properties, and why they're preferred over AVL for general use (fewer rotations). You rarely need to implement one from scratch.

---

## MapReduce

A programming model for processing large datasets in parallel across a distributed cluster.

### The Model

```
┌─────────────────────────────────────────────────────────────┐
│                    MAPREDUCE PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  INPUT DATA                                                   │
│  ┌──────────────────────────────────────────────┐            │
│  │ Split 1 │ Split 2 │ Split 3 │ ... │ Split N │            │
│  └────┬─────┴────┬─────┴────┬─────────┴────┬────┘           │
│       │          │          │              │                  │
│       ▼          ▼          ▼              ▼                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Mapper 1│ │ Mapper 2│ │ Mapper 3│ │ Mapper N│           │
│  │(key,val)│ │(key,val)│ │(key,val)│ │(key,val)│           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │          │          │              │                  │
│       └──────────┴──────────┴──────────────┘                 │
│                         │                                     │
│                    SHUFFLE & SORT                             │
│              (group by key, sort)                             │
│                         │                                     │
│       ┌─────────────────┼──────────────────┐                 │
│       ▼                 ▼                  ▼                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│  │ Reducer A│   │ Reducer B│   │ Reducer C│                  │
│  │ key → [v]│   │ key → [v]│   │ key → [v]│                 │
│  └─────┬────┘   └─────┬────┘   └─────┬────┘                 │
│        │              │              │                        │
│        ▼              ▼              ▼                        │
│     OUTPUT          OUTPUT         OUTPUT                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Example: Word Count

```
INPUT:     "the cat sat on the mat the cat"

MAP PHASE: Each mapper emits (word, 1) pairs
  Mapper 1: ("the", 1), ("cat", 1), ("sat", 1), ("on", 1)
  Mapper 2: ("the", 1), ("mat", 1), ("the", 1), ("cat", 1)

SHUFFLE:   Group by key
  "cat"  → [1, 1]
  "mat"  → [1]
  "on"   → [1]
  "sat"  → [1]
  "the"  → [1, 1, 1]

REDUCE:    Sum values per key
  "cat"  → 2
  "mat"  → 1
  "on"   → 1
  "sat"  → 1
  "the"  → 3
```

### Pseudocode

```java
// MAP function: (key, value) → list of (key, value)
void map(String filename, String contents) {
    for (String word : contents.split("\\s+")) {
        emit(word.toLowerCase(), 1);
    }
}

// REDUCE function: (key, list of values) → (key, aggregated value)
void reduce(String word, List<Integer> counts) {
    int total = 0;
    for (int count : counts) total += count;
    emit(word, total);
}
```

### Real-World Use Cases

| Application | Map Phase | Reduce Phase |
|------------|-----------|-------------|
| **Word count** | Emit (word, 1) per word | Sum counts per word |
| **Inverted index** | Emit (word, docID) per word | Collect docIDs per word |
| **Log analysis** | Emit (error_type, 1) per log line | Count errors by type |
| **PageRank** | Emit (page, rank/outlinks) per link | Sum incoming rank contributions |
| **Sort** | Emit (key, record) | Identity reducer (shuffle sorts) |

> MapReduce has been largely superseded by Apache Spark (in-memory processing, 10-100× faster) and stream processing frameworks (Kafka Streams, Flink). But the map-shuffle-reduce mental model remains foundational for distributed systems interviews.

---

## A* Search Algorithm

An extension of Dijkstra's algorithm that uses a **heuristic** to guide the search toward the goal, often finding the shortest path faster.

### Core Idea

```
f(n) = g(n) + h(n)

Where:
  g(n) = actual cost from start to node n
  h(n) = heuristic estimate of cost from n to goal
  f(n) = estimated total cost through node n
```

### Algorithm

```java
List<Node> aStar(Node start, Node goal, Graph graph) {
    PriorityQueue<Node> open = new PriorityQueue<>((a, b) ->
        Double.compare(a.f, b.f));
    Set<Node> closed = new HashSet<>();
    Map<Node, Node> parent = new HashMap<>();

    start.g = 0;
    start.f = heuristic(start, goal);
    open.offer(start);

    while (!open.isEmpty()) {
        Node current = open.poll();
        if (current.equals(goal)) return reconstructPath(parent, goal);

        closed.add(current);
        for (Edge edge : graph.neighbors(current)) {
            Node neighbor = edge.to;
            if (closed.contains(neighbor)) continue;

            double tentativeG = current.g + edge.weight;
            if (tentativeG < neighbor.g) {
                neighbor.g = tentativeG;
                neighbor.f = tentativeG + heuristic(neighbor, goal);
                parent.put(neighbor, current);
                if (!open.contains(neighbor)) open.offer(neighbor);
            }
        }
    }
    return Collections.emptyList();
}
```

### Heuristic Properties

| Property | Meaning | Effect |
|----------|---------|--------|
| **Admissible** | h(n) ≤ actual cost to goal | Guarantees optimal path |
| **Consistent** | h(n) ≤ cost(n, n') + h(n') | Guarantees nodes aren't revisited |
| **h(n) = 0** | No heuristic | Degenerates to Dijkstra's |
| **h(n) = actual cost** | Perfect heuristic | Optimal path found immediately |

### Common Heuristics

| Domain | Heuristic | Formula |
|--------|-----------|---------|
| Grid (4-directional) | Manhattan distance | \|x₁-x₂\| + \|y₁-y₂\| |
| Grid (8-directional) | Chebyshev distance | max(\|x₁-x₂\|, \|y₁-y₂\|) |
| Euclidean space | Straight-line distance | √((x₁-x₂)² + (y₁-y₂)²) |

> A* is used in GPS navigation, game AI pathfinding, and robotics. It's optimal when the heuristic is admissible and consistent.

---

## Bellman-Ford Algorithm

Finds shortest paths from a single source in graphs that **may contain negative edge weights**. Also detects negative-weight cycles.

```java
int[] bellmanFord(int source, int n, int[][] edges) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    for (int i = 0; i < n - 1; i++) {
        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }

    for (int[] edge : edges) {
        int u = edge[0], v = edge[1], w = edge[2];
        if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
            throw new RuntimeException("Negative-weight cycle detected");
        }
    }
    return dist;
}
```

| Property | Dijkstra | Bellman-Ford |
|----------|----------|-------------|
| **Negative edges** | Not supported | Supported |
| **Negative cycles** | Not detected | Detected |
| **Time complexity** | O((V+E) log V) | O(V × E) |
| **Best for** | Non-negative weights | Negative weights, cycle detection |

---

## Floyd-Warshall Algorithm

Finds shortest paths between **all pairs** of vertices. Works with negative edges (but not negative cycles).

```java
int[][] floydWarshall(int[][] graph, int n) {
    int[][] dist = new int[n][n];
    for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE / 2);
    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (int[] edge : graph) dist[edge[0]][edge[1]] = edge[2];

    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    return dist;
}
```

| Property | Value |
|----------|-------|
| **Time** | O(V³) |
| **Space** | O(V²) |
| **Negative edges** | Supported |
| **Use case** | All-pairs shortest path, transitive closure, dense graphs |

> The triple-nested loop with the intermediate vertex `k` in the outermost loop is the key insight. It asks: "Is the path through vertex k shorter than the direct path?"

---

## Shortest Path Algorithms — Comparison

| Algorithm | Source | Negative Edges | Negative Cycles | Time |
|-----------|--------|:--------------:|:---------------:|------|
| **BFS** | Single | No weights | N/A | O(V + E) |
| **Dijkstra** | Single | No | No | O((V+E) log V) |
| **Bellman-Ford** | Single | Yes | Detects | O(V × E) |
| **Floyd-Warshall** | All pairs | Yes | Detects | O(V³) |
| **A*** | Single (to goal) | No | No | O((V+E) log V)* |

---

## B-Trees for Databases

B-trees are balanced search trees optimized for disk-based storage. Each node can hold **many keys** and has **many children**, minimizing disk I/O.

```
┌──────────────────────────────────────────────────────────┐
│                    B-TREE (order 5)                        │
│                                                            │
│                   [30 | 60]                                │
│                 ╱     │      ╲                            │
│        [10|20]    [40|50]    [70|80|90]                   │
│       ╱  │  ╲    ╱  │  ╲   ╱  │  │  ╲                  │
│      ↓   ↓   ↓  ↓   ↓   ↓ ↓   ↓  ↓   ↓                │
│    (leaf nodes with data pointers)                        │
│                                                            │
│  Properties:                                               │
│  • All leaves at the same depth                           │
│  • Each node has between ⌈m/2⌉ and m children            │
│  • Optimized for block-based storage (HDD/SSD)           │
│  • Height = O(logₘ n) where m = order                    │
│                                                            │
│  B+ Tree (variant used in databases):                     │
│  • Data only in leaf nodes                                │
│  • Leaf nodes linked for range scans                      │
│  • Internal nodes store only keys (fit more per page)     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

| Property | Binary Search Tree | B-Tree (order 1000) |
|----------|-------------------|---------------------|
| **Branching factor** | 2 | ~1000 |
| **Height for 1B keys** | ~30 | ~3 |
| **Disk reads per lookup** | ~30 | ~3 |
| **Optimized for** | In-memory | Disk I/O |

> Every major database (PostgreSQL, MySQL, SQLite, Oracle) uses B+ trees for indexing. Understanding why — minimizing disk seeks by maximizing keys per node — is crucial for system design interviews.

---

## Skip Lists

A probabilistic data structure that provides O(log n) search, insert, and delete operations — an alternative to balanced trees.

```
Level 3:  HEAD ──────────────────────────────────→ 50 ────────→ NIL
Level 2:  HEAD ──────→ 15 ──────────────────────→ 50 ────────→ NIL
Level 1:  HEAD ──→ 7 → 15 ──────→ 30 ──────────→ 50 → 60 ──→ NIL
Level 0:  HEAD → 3 → 7 → 15 → 22 → 30 → 40 → 50 → 60 → 78 → NIL
```

| Operation | Expected | Worst Case |
|-----------|:--------:|:----------:|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Space | O(n) | O(n log n) |

Each element is promoted to the next level with probability p (typically 1/2). Higher levels act as "express lanes" for search.

> Skip lists are used in Redis (sorted sets), LevelDB, and MemSQL. They're simpler to implement than balanced trees and support concurrent access more easily.

---

## Bloom Filters

A space-efficient **probabilistic data structure** that tests whether an element is a member of a set. It can have **false positives** but **never false negatives**.

```
┌───────────────────────────────────────────────────────┐
│                    BLOOM FILTER                         │
├───────────────────────────────────────────────────────┤
│                                                         │
│  Bit array:  [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]   │
│                                                         │
│  Insert "hello":                                        │
│    h₁("hello") = 1  → set bit 1                       │
│    h₂("hello") = 4  → set bit 4                       │
│    h₃("hello") = 9  → set bit 9                       │
│                                                         │
│  Query "world":                                         │
│    h₁("world") = 3  → bit 3 = 1 ✓                    │
│    h₂("world") = 7  → bit 7 = 1 ✓                    │
│    h₃("world") = 11 → bit 11 = 0 ✗  → NOT in set     │
│                                                         │
│  Query "test":                                          │
│    h₁("test") = 1   → bit 1 = 1 ✓                    │
│    h₂("test") = 4   → bit 4 = 1 ✓                    │
│    h₃("test") = 9   → bit 9 = 1 ✓  → MAYBE in set   │
│    (could be false positive!)                           │
│                                                         │
└───────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **False positive rate** | Configurable (typically 1%) |
| **False negatives** | Never |
| **Space** | ~10 bits per element for 1% FPR |
| **Insert/Query** | O(k) where k = number of hash functions |
| **Delete** | Not supported (use Counting Bloom Filter instead) |

### Use Cases

| Application | How Bloom Filters Help |
|------------|----------------------|
| **Web crawlers** | Skip already-visited URLs |
| **Databases** | Avoid disk reads for non-existent keys |
| **Spell checkers** | Quick negative lookups |
| **CDN caching** | Check if content is cached before fetching |
| **Network routing** | Packet filtering |

---

## Quick Reference: Algorithm Comparison

```
┌──────────────────────────────────────────────────────────────┐
│           WHEN TO USE WHICH DATA STRUCTURE / ALGO             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Need shortest path?                                          │
│  ├── Unweighted graph → BFS                                  │
│  ├── Non-negative weights → Dijkstra (or A* with heuristic) │
│  ├── Negative weights → Bellman-Ford                         │
│  └── All pairs → Floyd-Warshall                              │
│                                                                │
│  Need ordering with dependencies?                             │
│  └── Topological Sort (Kahn's or DFS-based)                  │
│                                                                │
│  Need self-balancing BST?                                     │
│  ├── Read-heavy → AVL tree                                   │
│  ├── Write-heavy → Red-Black tree                            │
│  ├── Disk-based → B-tree / B+ tree                           │
│  └── Simple concurrent → Skip list                           │
│                                                                │
│  Need approximate membership?                                 │
│  └── Bloom filter (space-efficient, no false negatives)      │
│                                                                │
│  Need substring search?                                       │
│  ├── Single pattern → KMP or Rabin-Karp                      │
│  ├── Multiple patterns → Rabin-Karp or Aho-Corasick          │
│  └── Repeated queries → Suffix array / tree                  │
│                                                                │
│  Need parallel processing?                                    │
│  └── MapReduce (batch) or Stream Processing (real-time)      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

> These advanced topics form the foundation of computer science. While you rarely implement them from scratch in interviews, understanding their trade-offs, complexities, and use cases demonstrates the depth of knowledge that distinguishes strong candidates. Know when to apply each algorithm and why it works — that's what interviewers are really testing.
