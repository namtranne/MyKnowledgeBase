---
sidebar_position: 7
title: "Week 6: BST + Advanced Trees"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 6: BST + Advanced Trees

This week deepens your tree knowledge by exploring **Binary Search Trees (BSTs)** — trees whose structure encodes sorted order — and **Tries (prefix trees)** — specialised trees for string operations. BSTs dominate interview questions because their O(h) operations unlock elegant recursion, while Tries appear whenever you need fast prefix lookups (autocomplete, spell checkers, word games).

---

## 1 · Core Theory

### 1.1 The BST Property

A Binary Search Tree is a binary tree where **every** node satisfies:

> **left subtree values &lt; node value &lt; right subtree values**

This invariant holds recursively for every subtree, not just immediate children.

#### Why BSTs matter

BSTs exist to solve a fundamental problem: how do you maintain a dynamic collection that supports fast search, insertion, and deletion? A sorted array gives O(log n) search via binary search, but insertion is O(n) due to shifting. A hash map gives O(1) operations, but cannot answer ordering queries like "what is the 5th smallest element?" or "what is the next value after X?". A BST gives O(log n) for search, insert, delete, AND supports ordered operations — making it the ideal structure when you need both fast lookups and sorted-order access.

**Interview signal phrases:** "kth smallest/largest", "inorder successor/predecessor", "validate BST", "range of values", "sorted order from tree". If the problem involves a tree with an ordering property, exploit it — do not treat it as a generic binary tree.

**Common misconception:** beginners validate a BST by checking only immediate children (`node.left.val &lt; node.val` and `node.right.val &gt; node.val`). This is insufficient — you must verify that ALL left descendants are smaller and ALL right descendants are larger. The bounds-passing approach handles this correctly by narrowing the valid range at each level.

```
        8
       / \
      3   10
     / \    \
    1   6    14
       / \   /
      4   7 13
```

In the tree above, every left descendant of 8 is less than 8 and every right descendant is greater. The same applies at node 3, node 10, and so on.

**Key consequence:** An **inorder traversal** (left → node → right) of a BST visits nodes in **sorted ascending order**: 1, 3, 4, 6, 7, 8, 10, 13, 14.

### 1.2 BST Operations

All core BST operations run in **O(h)** time, where h is the height of the tree.

| Operation | Best / Avg (balanced) | Worst (skewed) | Description |
|-----------|----------------------|----------------|-------------|
| Search | O(log n) | O(n) | Compare target with node, go left or right |
| Insert | O(log n) | O(n) | Search for position, attach new leaf |
| Delete | O(log n) | O(n) | Three cases: leaf, one child, two children |
| Min / Max | O(log n) | O(n) | Go all the way left / right |

**Why O(h)?** Each operation visits at most one node per level. A balanced tree has h = O(log n), but a skewed tree (e.g. inserting 1, 2, 3, 4, 5 in order) degenerates to a linked list with h = O(n).

#### Search

Start at the root. If the target equals the current node, return it. If the target is smaller, go left. If larger, go right. If you reach a null pointer, the value is not in the tree.

#### Insert

Follow the same path as search. When you reach a null pointer, create a new node there. The new node is always inserted as a **leaf**.

#### Delete

Three cases:
1. **Leaf node** — simply remove it.
2. **One child** — replace the node with its child.
3. **Two children** — find the **inorder successor** (smallest node in the right subtree), copy its value to the current node, then delete the successor (which has at most one child).

### 1.3 Inorder Successor

The inorder successor of a node is the **next node** in sorted (inorder) order:

- **If the node has a right subtree:** the successor is the leftmost node in the right subtree.
- **If the node has no right subtree:** walk up to ancestors — the successor is the first ancestor for which the node is in its left subtree.

This concept is critical for BST deletion and the BST Iterator problem.

### 1.4 Balanced BSTs

A BST is **balanced** when its height stays O(log n), guaranteeing O(log n) operations. Self-balancing variants include:

| Tree Type | Balance Guarantee | Rotation Style |
|-----------|------------------|----------------|
| AVL Tree | Height difference ≤ 1 between subtrees | Single / double rotations |
| Red-Black Tree | No path is more than 2× another | Colour flips + rotations |
| B-Tree / B+ Tree | All leaves at same depth | Split / merge nodes |

You rarely implement these from scratch in interviews, but you should know **why** balance matters: it prevents O(n) worst-case operations.

**Converting a sorted array to a BST** is a common problem: pick the middle element as root, recurse on left and right halves. This naturally produces a height-balanced BST.

### 1.5 Trie (Prefix Tree)

A Trie stores strings character-by-character along edges, enabling O(L) operations where L is the length of the word.

#### Why Tries exist

Hash maps can check if a word exists in O(L), but they cannot efficiently answer "which words start with this prefix?" A hash map would require iterating all keys — O(N) where N is the dictionary size. A Trie answers prefix queries in O(L), independent of dictionary size. This makes Tries essential for autocomplete systems, spell checkers, IP routing tables, and word-search problems.

**Interview signal phrases:** "prefix", "autocomplete", "word search in grid with dictionary", "starts with", "add and search words with wildcards". If you see any of these, a Trie is almost certainly part of the solution.

**Common misconception:** beginners worry that Tries use too much memory. In practice, shared prefixes compress storage significantly. The word list "apple", "application", "apply" shares the prefix "appl" — stored once, not three times. For interview purposes, a HashMap-based Trie (as shown below) is the standard implementation.

```
        root
       / | \
      a  b  c
      |  |  |
      p  a  a
      |  |  |
      p  d  t
      |
      l
      |
      e
```

This Trie stores: "apple", "bad", "cat".

Each node has:
- A map/array of children (one per possible character).
- A boolean `isEnd` flag marking whether a complete word ends at this node.

| Operation | Time | Description |
|-----------|------|-------------|
| insert(word) | O(L) | Walk/create nodes for each character, mark end |
| search(word) | O(L) | Walk nodes; return true only if all chars exist AND `isEnd` is true |
| startsWith(prefix) | O(L) | Walk nodes; return true if all prefix chars exist (ignore `isEnd`) |

**When to use a Trie:**
- Prefix matching (autocomplete, dictionary lookups).
- Word search in grids with shared prefixes.
- Counting words with a given prefix.

---

## 2 · Code Templates

### 2.1 BST Search (Iterative)

```java
public static TreeNode searchBST(TreeNode root, int val) {
    while (root != null) {
        if (val == root.val) return root;
        else if (val < root.val) root = root.left;
        else root = root.right;
    }
    return null;
}
```

<AlgoViz
  title="BST Search — Following the Path from Root"
  description="Search for value 4 in BST [8, 3, 10, 1, 6, null, 14, null, null, 4, 7]. At each node, compare and go left or right."
  steps={[
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 4 }, right: { val: 7 } } }, right: { val: 10, right: { val: 14 } } },
      treeHighlights: [],
      variables: { target: 4, current: 8 },
      explanation: "Start at root 8. Target = 4. We compare and follow BST property at each step.",
      code: "while (root != null) { if (val == root.val) return root; ..."
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 4 }, right: { val: 7 } } }, right: { val: 10, right: { val: 14 } } },
      treeHighlights: [8],
      variables: { target: 4, current: 8, comparison: "4 < 8" },
      explanation: "Compare: 4 < 8 → go left. The entire right subtree (10, 14) is eliminated.",
      code: "if (val < root.val) root = root.left;"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 4 }, right: { val: 7 } } }, right: { val: 10, right: { val: 14 } } },
      treeHighlights: [8, 3],
      variables: { target: 4, current: 3, comparison: "4 > 3" },
      explanation: "Compare: 4 > 3 → go right. The left subtree (1) is eliminated.",
      code: "else root = root.right;"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 4 }, right: { val: 7 } } }, right: { val: 10, right: { val: 14 } } },
      treeHighlights: [8, 3, 6],
      variables: { target: 4, current: 6, comparison: "4 < 6" },
      explanation: "Compare: 4 < 6 → go left. Node 7 is eliminated.",
      code: "if (val < root.val) root = root.left;"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 4 }, right: { val: 7 } } }, right: { val: 10, right: { val: 14 } } },
      treeHighlights: [8, 3, 6, 4],
      variables: { target: 4, current: 4, comparison: "4 == 4" },
      explanation: "Compare: 4 == 4 → found! Return this node. Path taken: 8 → 3 → 6 → 4. O(h) time.",
      code: "if (val == root.val) return root; // found!"
    }
  ]}
/>

### 2.2 BST Insert (Recursive)

```java
public static TreeNode insertBST(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insertBST(root.left, val);
    else root.right = insertBST(root.right, val);
    return root;
}
```

<AlgoViz
  title="BST Insert — New Node Always Becomes a Leaf"
  description="Insert value 5 into BST [8, 3, 10, 1, 6]. Search for the correct position, then attach as a new leaf."
  steps={[
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6 } }, right: { val: 10 } },
      treeHighlights: [],
      variables: { insertVal: 5, current: "root(8)" },
      explanation: "Insert 5 into the BST. Follow BST property to find the correct null position.",
      code: "insertBST(root, 5);"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6 } }, right: { val: 10 } },
      treeHighlights: [8],
      variables: { insertVal: 5, comparison: "5 < 8" },
      explanation: "At root 8: 5 < 8 → recurse into left subtree.",
      code: "root.left = insertBST(root.left, 5);"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6 } }, right: { val: 10 } },
      treeHighlights: [8, 3],
      variables: { insertVal: 5, comparison: "5 > 3" },
      explanation: "At node 3: 5 > 3 → recurse into right subtree.",
      code: "root.right = insertBST(root.right, 5);"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6 } }, right: { val: 10 } },
      treeHighlights: [8, 3, 6],
      variables: { insertVal: 5, comparison: "5 < 6" },
      explanation: "At node 6: 5 < 6 → recurse into left subtree.",
      code: "root.left = insertBST(root.left, 5);"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6 } }, right: { val: 10 } },
      treeHighlights: [8, 3, 6],
      variables: { insertVal: 5, hitNull: true },
      explanation: "Left child of 6 is null → base case! Create new TreeNode(5) and return it.",
      code: "if (root == null) return new TreeNode(5);"
    },
    {
      tree: { val: 8, left: { val: 3, left: { val: 1 }, right: { val: 6, left: { val: 5 } } }, right: { val: 10 } },
      treeHighlights: [5],
      variables: { insertVal: 5, status: "inserted" },
      explanation: "Node 5 is now the left child of 6. BST property preserved: 3 < 5 < 6 < 8. Insertion complete.",
      code: "return root; // propagate updated pointers back up"
    }
  ]}
/>

### 2.3 BST Delete

```java
public static TreeNode deleteNode(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) {
        root.left = deleteNode(root.left, key);
    } else if (key > root.val) {
        root.right = deleteNode(root.right, key);
    } else {
        if (root.left == null) return root.right;
        if (root.right == null) return root.left;
        TreeNode successor = root.right;
        while (successor.left != null) successor = successor.left;
        root.val = successor.val;
        root.right = deleteNode(root.right, successor.val);
    }
    return root;
}
```

<AlgoViz
  title="BST Delete — Three Cases"
  description="Delete node 3 from BST [5, 3, 8, 1, 4, null, 10]. Node 3 has two children — find inorder successor."
  steps={[
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [],
      variables: { deleteKey: 3, current: 5 },
      explanation: "Delete node with value 3. Start searching from root 5.",
      code: "deleteNode(root, 3);"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5],
      variables: { deleteKey: 3, comparison: "3 < 5" },
      explanation: "At root 5: 3 < 5 → target is in the left subtree. Recurse left.",
      code: "root.left = deleteNode(root.left, 3);"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [3],
      variables: { deleteKey: 3, found: true, case: "two children" },
      explanation: "Found node 3! It has two children (1 and 4) → Case 3: find the inorder successor.",
      code: "// key == root.val and root has both children"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [3, 4],
      variables: { successor: 4, path: "right→leftmost" },
      explanation: "Inorder successor = leftmost node in right subtree. Right child is 4, which has no left child → successor = 4.",
      code: "TreeNode successor = root.right; while (successor.left != null) successor = successor.left;"
    },
    {
      tree: { val: 5, left: { val: 4, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [4],
      variables: { copiedValue: 4 },
      explanation: "Copy successor value 4 into the current node (replacing 3). Now delete the original successor from the right subtree.",
      code: "root.val = successor.val; // 3 becomes 4"
    },
    {
      tree: { val: 5, left: { val: 4, left: { val: 1 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [4],
      variables: { status: "complete" },
      explanation: "Delete original node 4 from right subtree (it was a leaf → Case 1). Final BST: [5, 4, 8, 1, null, null, 10]. BST property preserved.",
      code: "root.right = deleteNode(root.right, successor.val);"
    }
  ]}
/>

### 2.4 Inorder Successor (with Parent Pointer)

```java
public static TreeNode inorderSuccessor(TreeNode root, TreeNode target) {
    TreeNode successor = null;
    while (root != null) {
        if (target.val < root.val) {
            successor = root;
            root = root.left;
        } else {
            root = root.right;
        }
    }
    return successor;
}
```

### 2.5 Validate BST (Bounds Approach)

```java
public static boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

private static boolean validate(TreeNode node, long lo, long hi) {
    if (node == null) return true;
    if (node.val <= lo || node.val >= hi) return false;
    return validate(node.left, lo, node.val)
        && validate(node.right, node.val, hi);
}
```

<AlgoViz
  title="Validate BST — Passing Bounds Downward"
  description="Check if BST [5, 3, 8, 1, 4, null, 10] is valid by passing (lo, hi) bounds at each recursive call."
  steps={[
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5],
      variables: { node: 5, lo: "-INF", hi: "+INF", valid: true },
      explanation: "validate(5, -INF, +INF): Is 5 in range (-INF, +INF)? Yes. Check children with narrowed bounds.",
      code: "validate(root, Long.MIN_VALUE, Long.MAX_VALUE);"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 3],
      variables: { node: 3, lo: "-INF", hi: 5, valid: true },
      explanation: "validate(3, -INF, 5): Is 3 in range (-INF, 5)? Yes. Left child must be in (-INF, 3), right in (3, 5).",
      code: "validate(node.left, lo, node.val); // bounds narrow"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 3, 1],
      variables: { node: 1, lo: "-INF", hi: 3, valid: true },
      explanation: "validate(1, -INF, 3): Is 1 in range (-INF, 3)? Yes. Both children are null → return true.",
      code: "if (node == null) return true; // base case"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 3, 1, 4],
      variables: { node: 4, lo: 3, hi: 5, valid: true },
      explanation: "validate(4, 3, 5): Is 4 in range (3, 5)? Yes. Both children null → return true.",
      code: "validate(node.right, node.val, hi); // 4 in (3, 5)"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 8],
      variables: { node: 8, lo: 5, hi: "+INF", valid: true },
      explanation: "validate(8, 5, +INF): Is 8 in range (5, +INF)? Yes. Check right child with (8, +INF).",
      code: "validate(node.right, node.val, hi);"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 8, 10],
      variables: { node: 10, lo: 8, hi: "+INF", valid: true },
      explanation: "validate(10, 8, +INF): Is 10 in range (8, +INF)? Yes. Leaf node → return true.",
      code: "// 10 > 8 → valid. Null children → true"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 1 }, right: { val: 4 } }, right: { val: 8, right: { val: 10 } } },
      treeHighlights: [5, 3, 1, 4, 8, 10],
      variables: { result: "VALID BST" },
      explanation: "All nodes passed bounds check. Every left descendant is less than its ancestor, every right is greater. Valid BST!",
      code: "return true; // all checks passed"
    }
  ]}
/>

### 2.6 Trie Class

```java
import java.util.*;

class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean isEnd = false;
}

class Trie {
    TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node.children.putIfAbsent(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    public boolean search(String word) {
        TrieNode node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private TrieNode find(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            if (!node.children.containsKey(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }
}
```

### 2.7 BST Iterator (Controlled Inorder)

```java
import java.util.*;

class BSTIterator {
    private Deque<TreeNode> stack = new ArrayDeque<>();

    public BSTIterator(TreeNode root) {
        pushLeft(root);
    }

    private void pushLeft(TreeNode node) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
    }

    public int next() {
        TreeNode node = stack.pop();
        pushLeft(node.right);
        return node.val;
    }

    public boolean hasNext() {
        return !stack.isEmpty();
    }
}
```

---

## 3 · Key Patterns

### 3.1 Inorder Traversal for Sorted Order

Whenever you need sorted access in a BST, think **inorder traversal**. This applies to:
- Kth smallest / largest element.
- Finding minimum absolute difference between nodes.
- Recovering a BST with two swapped nodes (detect the anomaly in inorder sequence).
- Merging elements from two BSTs.

### 3.2 Recursion with Bounds

Many BST problems pass **lower and upper bounds** through recursive calls:
- Validate BST: each node must be within (lo, hi).
- Construct BST from preorder: use bounds to decide when to stop placing nodes in the current subtree.
- Trim BST: prune nodes outside a given range.

### 3.3 BST Property for Efficient Search

The BST property lets you eliminate half the tree at each step. Exploit this in:
- Lowest Common Ancestor (both values on same side → recurse; split → current node is LCA).
- Two Sum in BST (combine BFS/DFS with a set, or use two BST iterators like two pointers).

### 3.4 Trie + Backtracking

For grid word search with a dictionary, build a Trie from the word list and run DFS/backtracking on the grid. The Trie lets you prune branches early — if no word in the dictionary starts with the current prefix, stop exploring.

---

## 4 · Complexity Table

| Operation / Pattern | Time | Space | Notes |
|---------------------|------|-------|-------|
| BST search / insert / delete | O(h) → O(log n) balanced | O(h) recursion stack | Degenerates to O(n) if skewed |
| Inorder traversal | O(n) | O(h) | Visits every node once |
| Kth smallest (inorder) | O(h + k) | O(h) | Early-stop after k nodes |
| Validate BST (bounds) | O(n) | O(h) | Must check every node |
| Lowest Common Ancestor (BST) | O(h) | O(1) iterative / O(h) recursive | Exploits BST property |
| Sorted array → balanced BST | O(n) | O(log n) stack | Always pick middle |
| Trie insert / search / startsWith | O(L) | O(total chars) | L = word length |
| Word Search II (Trie + backtrack) | O(m·n·4^L) | O(sum of word lengths) | Grid m×n, max word length L |
| Serialize / Deserialize BT | O(n) | O(n) | BFS or preorder |
| Unique BSTs (Catalan number) | O(n²) DP | O(n) | Catalan(n) = C(2n, n) / (n+1) |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Kth smallest/largest in BST" | Inorder traversal with early stop at k | Iterative Inorder |
| "Validate BST" | Pass (lo, hi) bounds downward, or verify inorder is strictly increasing | Bounds Recursion |
| "Lowest Common Ancestor of BST" | Both values same side as current node = recurse that side; split = current node is LCA | BST Property |
| "Delete node from BST" | Find node, handle 3 cases (leaf / 1 child / 2 children with inorder successor) | BST Delete |
| "Convert sorted array to BST" | Pick middle as root, recurse on left and right halves | Recursive Build |
| "BST Iterator / next smallest" | Controlled inorder: push-left-chain + lazy expansion | BST Iterator |
| "Implement prefix search / autocomplete" | Trie with insert, search, startsWith | Trie |
| "Find all words from dictionary in a grid" | Trie + DFS backtracking with Trie-guided pruning | Trie + Backtrack |
| "Recover BST (two nodes swapped)" | Inorder traversal, detect two anomalies, swap their values | Inorder Anomaly |
| "Serialize/deserialize binary tree" | BFS with null markers, or preorder with null sentinel | BFS/DFS |

---

## 5 · Worked Example: Kth Smallest Element in a BST

**Problem (LC 230):** Given the root of a BST and an integer k, return the kth smallest value (1-indexed).

### Why not brute force?

A brute-force approach would traverse the entire tree, collect all values into a list, sort the list, and return the kth element — O(n log n) time and O(n) space. But the BST property already gives us sorted order for free through inorder traversal. By using an iterative inorder with an explicit stack, we can stop as soon as we have visited k nodes, giving O(h + k) time where h is the height — potentially much faster than traversing the entire tree when k is small.

:::tip Key Insight
In a BST, inorder traversal IS the sorted order. You never need to sort — just walk the tree left-node-right and count. The iterative version with a stack lets you stop early, which is critical when k is much smaller than n.
:::

**Approach:** Inorder traversal visits BST nodes in ascending order. Perform inorder and stop at the kth node.

### The tree

```
        5
       / \
      3   6
     / \
    2   4
   /
  1
```

Inorder: 1, 2, 3, 4, 5, 6. If k = 3, answer = 3.

### Step-by-step trace (iterative inorder with early stop)

```
stack = [], node = 5, count = 0
```

| Step | Action | Stack (bottom → top) | node | count | Explanation |
|------|--------|----------------------|------|-------|-------------|
| 1 | Push left chain from 5 | 5, 3, 2, 1 | None | 0 | Go as far left as possible |
| 2 | Pop 1, no right child | 5, 3, 2 | 1 | 1 | Visit node 1 (1st smallest) |
| 3 | Pop 2, no right child | 5, 3 | 2 | 2 | Visit node 2 (2nd smallest) |
| 4 | Pop 3, push left chain from right child 4 | 5, 4 | 3 | 3 | Visit node 3 (3rd smallest) → **k reached, return 3** |

We stop early — no need to traverse the entire tree.

### Code

```java
import java.util.*;

public static int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    int count = 0;
    while (!stack.isEmpty() || node != null) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();
        count++;
        if (count == k) return node.val;
        node = node.right;
    }
    return -1;
}
```

### Why this works

Inorder on a BST yields sorted order. By counting nodes as we visit them, the kth visited node is the kth smallest. The iterative approach with a stack gives us the ability to **stop early** — we do O(h + k) work instead of O(n).

### Follow-up: frequent queries

If `kthSmallest` is called frequently and the tree is modified between calls, augment each node with a `count` field storing the size of its left subtree. Then finding the kth smallest becomes O(h) binary search on subtree sizes.

<AlgoViz
  title="Kth Smallest Element in BST — Inorder Traversal"
  description="Iterative inorder traversal with early stop at k = 3 on BST [5, 3, 6, 2, 4, null, null, 1]."
  steps={[
    {
      tree: { val: 5, left: { val: 3, left: { val: 2, left: { val: 1, left: null, right: null }, right: null }, right: { val: 4, left: null, right: null } }, right: { val: 6, left: null, right: null } },
      treeHighlights: [],
      stack: ["5", "3", "2", "1"],
      variables: { k: 3, count: 0 },
      explanation: "Push the left chain from root 5. Stack = [5, 3, 2, 1]. Go as far left as possible.",
      code: "while (node != null) { stack.push(node); node = node.left; }"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 2, left: { val: 1, left: null, right: null }, right: null }, right: { val: 4, left: null, right: null } }, right: { val: 6, left: null, right: null } },
      treeHighlights: [1],
      stack: ["5", "3", "2"],
      variables: { k: 3, count: 1 },
      explanation: "Pop node 1. count = 1. No right child. 1st smallest = 1.",
      code: "node = stack.pop(); count++; // count == 1"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 2, left: { val: 1, left: null, right: null }, right: null }, right: { val: 4, left: null, right: null } }, right: { val: 6, left: null, right: null } },
      treeHighlights: [2],
      stack: ["5", "3"],
      variables: { k: 3, count: 2 },
      explanation: "Pop node 2. count = 2. No right child. 2nd smallest = 2.",
      code: "node = stack.pop(); count++; // count == 2"
    },
    {
      tree: { val: 5, left: { val: 3, left: { val: 2, left: { val: 1, left: null, right: null }, right: null }, right: { val: 4, left: null, right: null } }, right: { val: 6, left: null, right: null } },
      treeHighlights: [3],
      stack: ["5", "4"],
      variables: { k: 3, count: 3 },
      explanation: "Pop node 3. count = 3 == k. Found the 3rd smallest element: return 3.",
      code: "node = stack.pop(); count++; if (count == k) return node.val; // returns 3"
    }
  ]}
/>

---

## 6 · Practice Problems (21 problems · 7 days)

### Day 1–2: Easy-Focused (Warm-Up)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 1 | Search in a Binary Search Tree | Easy | BST search | | 700 |
| 2 | Insert into a Binary Search Tree | Medium | BST insert | | 701 |
| 3 | Minimum Absolute Difference in BST | Easy | Inorder | | 530 |
| 4 | Kth Smallest Element in a BST | Medium | Inorder | ⭐ | 230 |
| 5 | Lowest Common Ancestor of a BST | Medium | BST property | ⭐ | 235 |
| 6 | Convert Sorted Array to Binary Search Tree | Easy | Recursion | ⭐ | 108 |
| 7 | Two Sum IV - Input is a BST | Easy | BFS + set | | 653 |

**Day 1–2 study tips:**
- Problems 1–2 are pure BST mechanics — make sure you can write both iterative and recursive versions.
- Kth Smallest (problem 4) is the worked example above. Practice the iterative inorder with early stop.
- LCA of BST (problem 5) is simpler than general-tree LCA: if both values are less than the current node, go left; if both are greater, go right; otherwise the current node is the LCA.
- Convert Sorted Array to BST (problem 6) is a beautiful recursion: always pick the middle element as root. This guarantees a height-balanced tree.

### Day 3–4: Medium-Focused (Pattern Building)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 8 | Delete Node in a BST | Medium | BST delete | ⭐ | 450 |
| 9 | Validate Binary Search Tree | Medium | Inorder or bounds | ⭐ | 98 |
| 10 | Binary Search Tree Iterator | Medium | Controlled inorder | ⭐ | 173 |
| 11 | Construct BST from Preorder Traversal | Medium | Bounds recursion | | 1008 |
| 12 | Implement Trie (Prefix Tree) | Medium | Trie | ⭐ | 208 |
| 13 | Design Add and Search Words Data Structure | Medium | Trie + DFS | ⭐ | 211 |
| 14 | Recover Binary Search Tree | Medium | Inorder anomaly | | 99 |

**Day 3–4 study tips:**
- Delete Node (problem 8) tests all three deletion cases. Pay special attention to the two-children case and finding the inorder successor.
- Validate BST (problem 9) has two clean approaches: (a) pass min/max bounds recursively, or (b) do inorder and verify the sequence is strictly increasing.
- BST Iterator (problem 10) is a controlled inorder traversal using an explicit stack — the template in section 2.7 solves it directly.
- Construct from Preorder (problem 11) uses upper-bound recursion: each recursive call knows the maximum value its subtree can contain.
- Implement Trie (problem 12) is the template from section 2.6. Memorise it — it's the foundation for problems 13 and 16.
- Recover BST (problem 14): during inorder, exactly two nodes are out of order. Track the first and second anomalies, then swap their values.

### Day 5–7: Medium / Hard (Deep Dive)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 15 | Serialize and Deserialize Binary Tree | Hard | BFS / DFS | ⭐ | 297 |
| 16 | Word Search II | Hard | Trie + backtrack | ⭐ | 212 |
| 17 | Construct BT from Inorder and Postorder | Medium | Recursion | | 106 |
| 18 | Count Complete Tree Nodes | Easy | Binary search on tree | | 222 |
| 19 | Trim a BST | Medium | Recursion | | 669 |
| 20 | All Elements in Two Binary Search Trees | Medium | Merge two inorders | | 1305 |
| 21 | Unique Binary Search Trees | Medium | Catalan number / DP | | 96 |

**Day 5–7 study tips:**
- Serialize/Deserialize (problem 15) is a design problem. BFS with "null" markers is the cleanest approach. Use a delimiter like "," between values and "null" for missing children.
- Word Search II (problem 16) is a **must-know** hard problem. Build a Trie from the word list, then run DFS from every cell in the grid. The Trie lets you prune: if no word starts with the current path, backtrack immediately.
- Count Complete Tree Nodes (problem 18) looks easy but has an elegant O(log²n) solution: compare the height of left and right subtrees. If equal, the left subtree is perfect (size = 2^h - 1); recurse on the right. If not equal, the right subtree is perfect at one level shorter; recurse on the left.
- Unique BSTs (problem 21) introduces the **Catalan number**: the number of structurally unique BSTs with n nodes is C(n) = sum of C(i-1) * C(n-i) for i = 1 to n. This is a classic DP problem.

---

## 7 · Mock Interviews

### Mock Interview 1 — BST Focus (45 min)

**Interviewer prompt:**

> "Given the root of a binary search tree and an integer k, return the kth smallest element in the tree (1-indexed)."
>
> *(LC 230 — Kth Smallest Element in a BST)*

**Expected dialogue:**

1. **Clarify:** "Is k always valid (1 ≤ k ≤ number of nodes)? Are there duplicate values?" → k is always valid, all values are unique.
2. **Brute force:** "I could do a full inorder traversal, collect all values in a list, and return list[k-1]. That's O(n) time and O(n) space."
3. **Optimise:** "I can do an iterative inorder with an explicit stack and stop at the kth node — O(h + k) time, O(h) space."
4. **Code:** Write the iterative inorder with early termination.
5. **Test:** Trace through the example tree with k = 3.

**Follow-up questions:**

1. *"What if the BST is modified frequently (inserts and deletes) and kth smallest is called often?"* → Augment each node with a `left_count` field storing the number of nodes in its left subtree. Then kth smallest becomes O(h) — if `left_count + 1 == k`, return current; if k ≤ left_count, go left; else subtract and go right.
2. *"Can you find the kth smallest without any extra space (O(1) space)?"* → Morris Traversal: temporarily modify tree pointers to create a threaded binary tree. Each node is visited at most twice, giving O(n) time, O(1) space.
3. *"How would you find the kth largest instead?"* → Do reverse inorder (right → node → left) and count to k.
4. *"What if I give you two BSTs and ask for the kth smallest element across both?"* → Use two BST iterators (section 2.7) and merge like merge-sort. Advance whichever iterator has the smaller current value. Stop after k advances.

---

### Mock Interview 2 — Trie Focus (45 min)

**Interviewer prompt:**

> "Given an m×n board of characters and a list of words, return all words that can be found in the board. Each word must be constructed from letters of sequentially adjacent cells (horizontal or vertical neighbours). The same cell may not be used more than once per word."
>
> *(LC 212 — Word Search II)*

**Expected dialogue:**

1. **Clarify:** "Can the board contain duplicates? Can words overlap? How large is the word list?" → Board up to 12×12, word list up to 3×10^4, words up to 10 characters.
2. **Brute force:** "For each word, run a separate DFS from every cell. That's O(words × m × n × 4^L), way too slow."
3. **Optimise:** "Build a Trie from all words. Run DFS from every cell, walking the Trie simultaneously. If the current Trie node has no children matching the next character, prune. When I reach a node where `isEnd` is true, add the word to results."
4. **Code:** Build Trie, then DFS with backtracking. Mark visited cells by temporarily changing the character.
5. **Optimisation:** After finding a word, remove the `isEnd` flag (or prune the leaf) to avoid duplicates and reduce future Trie traversals.

**Follow-up questions:**

1. *"How would you avoid duplicate results without a set?"* → When you find a word, set `isEnd = false` on that Trie node. This prevents the same word from being added again.
2. *"What if the board is very large but the word list is small?"* → The Trie is tiny, so pruning is aggressive. DFS from each cell terminates quickly when the Trie has no matching prefix. Performance is dominated by board size × max word length.
3. *"Can you further optimise by pruning empty Trie branches?"* → Yes. After finding a word, if the Trie node has no children, delete it from its parent. This "Trie pruning" reduces the search space as words are found.
4. *"How would you adapt this for a streaming board — new rows are appended over time?"* → Maintain the Trie and a set of partial matches (DFS states at the bottom row). When a new row arrives, extend each partial match to adjacent cells in the new row.

---

## 8 · Tips and Edge Cases

### Common Pitfalls

- **Confusing BST with general binary tree:** BST problems let you exploit sorted order. If you're doing a full traversal without leveraging the BST property, you're likely missing a more efficient approach.
- **Forgetting that BST values are unique in most problems:** Some problems explicitly state "all values are unique". If they don't, clarify — duplicate handling changes the BST property from `left < node < right` to `left ≤ node < right` (or similar).
- **Wrong inorder successor logic:** The successor is NOT always the right child. If there's no right subtree, you need to go up to ancestors. When searching from root, track the last node where you went left — that's the successor.
- **Trie memory usage:** A naïve Trie with 26-element arrays per node uses 26× more memory than needed. Use a HashMap for children in interviews unless told otherwise.
- **Modifying the tree during traversal:** BST deletion and trimming require careful pointer reassignment. Always return the (possibly new) root from recursive calls and reassign: `root.left = recurse(root.left)`.

### Edge Cases Checklist

| Edge Case | Example | Watch Out For |
|-----------|---------|---------------|
| Empty tree | root == null | Return null / 0 / empty list immediately |
| Single node | root with no children | Deletion returns None; it's both min and max |
| Skewed tree (linked list) | 1 → 2 → 3 → 4 → 5 | Height = n, all operations are O(n) |
| All nodes in left subtree | right child is always None | Inorder = reverse of insertion order |
| k = 1 (smallest) or k = n (largest) | Edge of kth queries | Go all the way left / all the way right |
| Trie with single character words | "a", "b", "c" | Root's direct children have `isEnd = true` |
| Trie search vs startsWith | search("app") vs startsWith("app") | search requires `isEnd`; startsWith doesn't |
| Empty string in Trie | insert("") | Root itself gets `isEnd = true` |
| Two identical BSTs | merge / compare | Inorder sequences are identical |

### Performance Tips

- **Use iterative inorder with a stack** for BST traversal in interviews — it's more flexible than recursion because you can stop early and resume.
- **Morris Traversal** gives O(1) space inorder by temporarily threading the tree. Great for follow-up "can you do it in constant space?" questions, but modifies the tree temporarily.
- **For Trie problems, store the full word at `isEnd` nodes** instead of reconstructing it from the path. This avoids building strings character by character during backtracking.
- **Prune Trie nodes** as you find words in Word Search II — this is a significant optimisation that interviewers look for.
- **BST iterator pattern** (push-left-chain + lazy expansion) uses O(h) space and O(1) amortised time per `next()` call. It's reusable across many problems: kth smallest, two-sum in BST, merge two BSTs.

### Recognising BST / Trie Problems

Ask yourself:
- "Is the tree a BST, and can I exploit sorted order?" → **Inorder traversal, bounds recursion, or binary-search-on-tree.**
- "Do I need to find/validate sorted relationships between nodes?" → **BST property or inorder check.**
- "Am I searching for words, prefixes, or patterns in a dictionary?" → **Trie.**
- "Am I searching for words in a 2D grid with a word list?" → **Trie + backtracking.**
- "Do I need an iterator over sorted tree elements?" → **BST Iterator (controlled inorder with stack).**
