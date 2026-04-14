---
sidebar_position: 6
title: "Week 5: Binary Trees"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 5: Binary Trees

This week introduces **binary trees** — the most common non-linear data structure in interviews. Trees underpin everything from file systems to databases (B-trees), expression parsing, and decision models. Mastering tree recursion here will pay dividends in graphs, dynamic programming, and system design for the rest of the roadmap.

---

## 1 · Core Theory

### 1.1 Tree Terminology

A **tree** is a connected, acyclic graph with a distinguished **root** node. Every node except the root has exactly one parent.

| Term | Definition |
|------|-----------|
| **Root** | The topmost node — it has no parent. |
| **Leaf** | A node with no children. |
| **Edge** | A connection between a parent and a child. |
| **Depth** of a node | Number of edges from the root down to that node. The root has depth 0. |
| **Height** of a node | Number of edges on the longest path from that node down to a leaf. A leaf has height 0. |
| **Height of the tree** | Height of the root node. Equivalently, the maximum depth of any leaf. |
| **Subtree** | A node together with all of its descendants — itself a valid tree. |
| **Level** | Set of all nodes at the same depth. Level 0 contains only the root. |
| **Degree** of a node | Number of children it has. |

```
        1          ← root (depth 0, height 3)
       / \
      2   3        ← depth 1
     / \   \
    4   5   6      ← depth 2
   /
  7                ← leaf (depth 3, height 0)
```

In the tree above, node 2 has depth 1 and height 2 (longest path: 2 → 4 → 7).

### 1.2 Binary Tree Definition

A **binary tree** is a tree where every node has **at most two children**, conventionally called `left` and `right`.

Special forms:

| Variant | Rule |
|---------|------|
| **Full binary tree** | Every node has 0 or 2 children — no node has exactly one child. |
| **Complete binary tree** | All levels are fully filled except possibly the last, which is filled left to right. |
| **Perfect binary tree** | All interior nodes have 2 children and all leaves are at the same depth. A perfect tree of height h has 2^(h+1) − 1 nodes. |
| **Binary Search Tree (BST)** | For every node, all values in the left subtree are smaller and all values in the right subtree are larger. |
| **Balanced binary tree** | The height difference between left and right subtrees of every node is at most 1. |

### 1.3 DFS Traversals

Depth-First Search explores as far down a branch as possible before backtracking. The three orderings differ only in **when you process the current node** relative to its children.

| Traversal | Order | Mnemonic |
|-----------|-------|----------|
| **Preorder** | Node → Left → Right | "Visit before children" |
| **Inorder** | Left → Node → Right | "Visit between children" — gives sorted order for a BST |
| **Postorder** | Left → Right → Node | "Visit after children" — useful when you need child results first |

```
        1
       / \
      2   3
     / \
    4   5

Preorder:   1  2  4  5  3
Inorder:    4  2  5  1  3
Postorder:  4  5  2  3  1
```

#### Recursive DFS (all three)

```java
public static void preorder(TreeNode node) {
    if (node == null) return;
    process(node.val);       // before children
    preorder(node.left);
    preorder(node.right);
}

public static void inorder(TreeNode node) {
    if (node == null) return;
    inorder(node.left);
    process(node.val);       // between children
    inorder(node.right);
}

public static void postorder(TreeNode node) {
    if (node == null) return;
    postorder(node.left);
    postorder(node.right);
    process(node.val);       // after children
}
```

<AlgoViz
  title="Recursive Inorder Traversal — Call Stack Visualization"
  description="Inorder visits Left → Node → Right. Watch the recursion stack grow as we descend left, then unwind as nodes are visited. Tree: [1, 2, 3, 4, 5]."
  steps={[
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [],
      stack: ["inorder(1)"],
      variables: { result: "[]" },
      explanation: "Call inorder(1). Push frame onto the recursion stack. Before visiting 1, we must first process the entire left subtree.",
      code: "inorder(node.left); // recurse left from node 1"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [],
      stack: ["inorder(1)", "inorder(2)"],
      variables: { result: "[]" },
      explanation: "Call inorder(2). Push frame. Again, go left before visiting node 2.",
      code: "inorder(node.left); // recurse left from node 2"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4],
      stack: ["inorder(1)", "inorder(2)"],
      variables: { result: "[4]" },
      explanation: "Call inorder(4). Left child is null (base case). Visit node 4: process(4). Right child also null. Return from inorder(4).",
      code: "process(node.val); // visit 4"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2],
      stack: ["inorder(1)"],
      variables: { result: "[4, 2]" },
      explanation: "Return to inorder(2). Left subtree done. Visit node 2: process(2). Now recurse into right subtree (node 5).",
      code: "process(node.val); // visit 2, then inorder(node.right)"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5],
      stack: ["inorder(1)"],
      variables: { result: "[4, 2, 5]" },
      explanation: "Call inorder(5). Left null, visit 5, right null. Return. inorder(2) is now fully complete — pop its frame.",
      code: "process(node.val); // visit 5, return to parent"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5, 1],
      stack: [],
      variables: { result: "[4, 2, 5, 1]" },
      explanation: "Return to inorder(1). Left subtree fully processed. Visit root 1: process(1). Now recurse into right subtree.",
      code: "process(node.val); // visit 1, then inorder(node.right)"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5, 1, 3],
      stack: [],
      variables: { result: "[4, 2, 5, 1, 3]" },
      explanation: "Call inorder(3). Left null, visit 3, right null. All frames popped. Inorder complete: [4, 2, 5, 1, 3].",
      code: "process(node.val); // visit 3 — traversal complete"
    }
  ]}
/>

#### Iterative DFS with an Explicit Stack

Preorder is the simplest to convert because the processing happens immediately.

```java
import java.util.*;

public static List<Integer> preorderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    Deque<TreeNode> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.add(node.val);
        if (node.right != null) stack.push(node.right); // push right first
        if (node.left != null) stack.push(node.left);
    }
    return result;
}
```

<AlgoViz
  title="Iterative Preorder DFS — Stack Walkthrough"
  description="Preorder visits Node → Left → Right. Push right child first so left is processed next. Tree: [1, 2, 3, 4, 5]."
  steps={[
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [],
      stack: ["1"],
      variables: { result: "[]" },
      explanation: "Push root 1 onto the stack. Stack = [1]. Begin the traversal loop.",
      code: "stack.push(root);"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [1],
      stack: ["3", "2"],
      variables: { result: "[1]" },
      explanation: "Pop 1 and visit it. Push right child 3 first, then left child 2. Left will be processed next (LIFO).",
      code: "node = stack.pop(); result.add(1); stack.push(3); stack.push(2);"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [1, 2],
      stack: ["3", "5", "4"],
      variables: { result: "[1, 2]" },
      explanation: "Pop 2 and visit it. Push right child 5, then left child 4.",
      code: "node = stack.pop(); result.add(2); stack.push(5); stack.push(4);"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [1, 2, 4],
      stack: ["3", "5"],
      variables: { result: "[1, 2, 4]" },
      explanation: "Pop 4 and visit it. Node 4 is a leaf — no children to push. Stack = [3, 5].",
      code: "node = stack.pop(); result.add(4);"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [1, 2, 4, 5],
      stack: ["3"],
      variables: { result: "[1, 2, 4, 5]" },
      explanation: "Pop 5 and visit it. Leaf node — no children. Stack = [3].",
      code: "node = stack.pop(); result.add(5);"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [1, 2, 4, 5, 3],
      stack: [],
      variables: { result: "[1, 2, 4, 5, 3]" },
      explanation: "Pop 3 and visit it. Leaf node. Stack is empty — traversal complete. Preorder: [1, 2, 4, 5, 3].",
      code: "node = stack.pop(); result.add(3); // stack empty, done"
    }
  ]}
/>

Iterative inorder walks left as far as possible, then processes nodes as you backtrack:

```java
public static List<Integer> inorderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode curr = root;
    while (curr != null || !stack.isEmpty()) {
        while (curr != null) {             // go left as far as possible
            stack.push(curr);
            curr = curr.left;
        }
        curr = stack.pop();                // backtrack
        result.add(curr.val);
        curr = curr.right;                 // move to right subtree
    }
    return result;
}
```

<AlgoViz
  title="Iterative Inorder Traversal — Go Left, Visit, Go Right"
  description="Inorder visits Left → Node → Right. Push all left children, backtrack to visit, then explore right subtrees."
  steps={[
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [],
      stack: ["1", "2", "4"],
      variables: { result: "[]", curr: "null" },
      explanation: "Go left from root: push 1, 2, 4 onto the stack. curr reaches null. Stack = [1, 2, 4].",
      code: "while (curr != null) { stack.push(curr); curr = curr.left; }"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4],
      stack: ["1", "2"],
      variables: { result: "[4]", curr: "null" },
      explanation: "Pop 4, visit it. No right child, so curr stays null. Stack = [1, 2].",
      code: "curr = stack.pop(); result.add(4); curr = curr.right; // null"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2],
      stack: ["1"],
      variables: { result: "[4, 2]", curr: "node(5)" },
      explanation: "Pop 2, visit it. Move to right child 5. Stack = [1].",
      code: "curr = stack.pop(); result.add(2); curr = curr.right; // node 5"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2],
      stack: ["1", "5"],
      variables: { result: "[4, 2]", curr: "null" },
      explanation: "Push 5 onto stack (go-left phase, but 5 has no left child). Stack = [1, 5].",
      code: "stack.push(5); curr = curr.left; // null"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5],
      stack: ["1"],
      variables: { result: "[4, 2, 5]", curr: "null" },
      explanation: "Pop 5, visit it. No right child. Stack = [1].",
      code: "curr = stack.pop(); result.add(5); curr = curr.right; // null"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5, 1],
      stack: [],
      variables: { result: "[4, 2, 5, 1]", curr: "node(3)" },
      explanation: "Pop 1 (the root), visit it. Move to right child 3. Stack = [].",
      code: "curr = stack.pop(); result.add(1); curr = curr.right; // node 3"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5, 1],
      stack: ["3"],
      variables: { result: "[4, 2, 5, 1]", curr: "null" },
      explanation: "Push 3 (no left child to descend). Stack = [3].",
      code: "stack.push(3); curr = curr.left; // null"
    },
    {
      tree: { val: 1, left: { val: 2, left: { val: 4 }, right: { val: 5 } }, right: { val: 3 } },
      treeHighlights: [4, 2, 5, 1, 3],
      stack: [],
      variables: { result: "[4, 2, 5, 1, 3]" },
      explanation: "Pop 3, visit it. No right child. Stack empty. Inorder complete: [4, 2, 5, 1, 3].",
      code: "curr = stack.pop(); result.add(3); // done"
    }
  ]}
/>

Iterative postorder uses a trick — reverse of a modified preorder (Node → Right → Left):

```java
public static List<Integer> postorderIterative(TreeNode root) {
    LinkedList<Integer> result = new LinkedList<>();
    if (root == null) return result;
    Deque<TreeNode> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        result.addFirst(node.val);          // prepend gives Left -> Right -> Node
        if (node.left != null) stack.push(node.left);
        if (node.right != null) stack.push(node.right);
    }
    return result;
}
```

<AlgoViz
  title="Iterative Postorder Traversal — Reverse Trick"
  description="Postorder visits Left → Right → Node. This iterative approach does a modified preorder (Node → Right → Left) and prepends each value, producing postorder without reversing at the end. Tree: [4, 2, 6, 1, 3, 5, 7]."
  steps={[
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [],
      stack: ["4"],
      variables: { result: "[]" },
      explanation: "Push root 4 onto the stack. We process nodes in Node → Right → Left order but prepend each to the result, producing Left → Right → Node (postorder).",
      code: "stack.push(root);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4],
      stack: ["2", "6"],
      variables: { result: "[4]" },
      explanation: "Pop 4 and prepend to result. Push left child 2, then right child 6. Right will be popped next (LIFO).",
      code: "result.addFirst(4); stack.push(2); stack.push(6);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6],
      stack: ["2", "5", "7"],
      variables: { result: "[6, 4]" },
      explanation: "Pop 6 and prepend. Push left child 5, then right child 7.",
      code: "result.addFirst(6); stack.push(5); stack.push(7);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6, 7],
      stack: ["2", "5"],
      variables: { result: "[7, 6, 4]" },
      explanation: "Pop 7 and prepend. Node 7 is a leaf — no children to push.",
      code: "result.addFirst(7);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6, 7, 5],
      stack: ["2"],
      variables: { result: "[5, 7, 6, 4]" },
      explanation: "Pop 5 and prepend. Leaf node. The entire right subtree is now processed.",
      code: "result.addFirst(5);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6, 7, 5, 2],
      stack: ["1", "3"],
      variables: { result: "[2, 5, 7, 6, 4]" },
      explanation: "Pop 2 and prepend. Push left child 1, then right child 3.",
      code: "result.addFirst(2); stack.push(1); stack.push(3);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6, 7, 5, 2, 3],
      stack: ["1"],
      variables: { result: "[3, 2, 5, 7, 6, 4]" },
      explanation: "Pop 3 and prepend. Leaf node.",
      code: "result.addFirst(3);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [4, 6, 7, 5, 2, 3, 1],
      stack: [],
      variables: { result: "[1, 3, 2, 5, 7, 6, 4]" },
      explanation: "Pop 1 and prepend. Stack is empty — traversal complete. Postorder: [1, 3, 2, 5, 7, 6, 4].",
      code: "result.addFirst(1); // stack empty, done"
    }
  ]}
/>

### 1.4 BFS — Level-Order Traversal

Breadth-First Search visits every node at depth d before any node at depth d+1. Use a **queue**.

```java
import java.util.*;

public static List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

<AlgoViz
  title="BFS Level-Order Traversal — Queue by Level"
  description="BFS processes all nodes at depth d before depth d+1 using a queue with the level-size snapshot trick."
  steps={[
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [],
      stack: ["3"],
      variables: { result: "[]", level: 0 },
      explanation: "Enqueue root 3. Queue = [3]. Ready to process level 0.",
      code: "queue.offer(root);"
    },
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [3],
      stack: ["9", "20"],
      variables: { result: "[[3]]", level: 0, levelSize: 1 },
      explanation: "Level 0: levelSize = 1. Dequeue 3, enqueue children 9 and 20. Level result = [3].",
      code: "node = queue.poll(); level.add(3); queue.offer(9); queue.offer(20);"
    },
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [3, 9],
      stack: ["20"],
      variables: { result: "[[3], ...]", level: 1, levelSize: 2, processed: "1/2" },
      explanation: "Level 1: levelSize = 2. Dequeue 9 — no children to enqueue. First of 2 nodes processed.",
      code: "node = queue.poll(); level.add(9); // 9 is a leaf"
    },
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [3, 9, 20],
      stack: ["15", "7"],
      variables: { result: "[[3], [9, 20]]", level: 1, levelSize: 2, processed: "2/2" },
      explanation: "Level 1: Dequeue 20, enqueue children 15 and 7. Level complete: [9, 20].",
      code: "node = queue.poll(); level.add(20); queue.offer(15); queue.offer(7);"
    },
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [3, 9, 20, 15],
      stack: ["7"],
      variables: { result: "[[3], [9, 20], ...]", level: 2, levelSize: 2, processed: "1/2" },
      explanation: "Level 2: levelSize = 2. Dequeue 15 — leaf, no children.",
      code: "node = queue.poll(); level.add(15);"
    },
    {
      tree: { val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } },
      treeHighlights: [3, 9, 20, 15, 7],
      stack: [],
      variables: { result: "[[3], [9, 20], [15, 7]]", level: 2 },
      explanation: "Level 2: Dequeue 7 — leaf. Queue empty. BFS complete: [[3], [9, 20], [15, 7]].",
      code: "node = queue.poll(); level.add(7); // queue empty, done"
    }
  ]}
/>

The `level_size` snapshot is the key trick — it lets you process exactly one level per outer iteration.

### 1.5 Recursion on Trees

Most tree problems follow a single mental model:

1. **Base case:** `if (node == null) return identityValue;`
2. **Recurse:** Get answers from the left and right subtrees.
3. **Combine:** Merge child answers with the current node to produce the answer for this subtree.

This is essentially **divide and conquer** on a tree structure.

#### Why trees are recursive by nature

A tree is a recursive data structure: every node is the root of its own subtree. This means any property of a tree can be defined in terms of properties of its subtrees. Height? One plus the max of the children's heights. Size? One plus the sum of the children's sizes. This recursive decomposition is why nearly every tree problem has an elegant recursive solution.

**The mental leap:** stop thinking about the whole tree. Instead, sit at a single node and assume your recursive calls have already given you correct answers for the left and right subtrees. Your only job is to combine those answers with the current node. If you can do that, the recursion handles the rest.

**Common misconception:** beginners try to mentally trace the entire recursion tree. This does not scale. Instead, trust the recursion — verify that your base case is correct, your combination logic is correct, and the recursive calls make the problem smaller. If all three hold, the solution is correct by induction.

**When to reach for tree recursion in an interview:** any problem that mentions "binary tree", "depth", "height", "path sum", "subtree property", or "construct from traversal". Trees are essentially interview shorthand for "write a recursive function".

### 1.6 How to Think About Tree Problems

The fundamental question is: **what information do I need to pass upward (return) vs. downward (parameter)?**

| Direction | Mechanism | Example |
|-----------|-----------|---------|
| **Upward** (child → parent) | Return value from recursive call | "Height of this subtree is 3" |
| **Downward** (parent → child) | Extra parameter | "The maximum value seen so far is 15" |
| **Sideways** (across subtrees) | Global variable or return tuple | "Diameter so far is 7" |

**Common return patterns:**

- Return a **single value** (height, sum, boolean).
- Return an **array or custom result object** when you need multiple pieces of info — e.g., `new int[]{isBalanced, height}` or a helper class with `isBST`, `minVal`, `maxVal`.
- Update an **instance variable** for "global best" problems (diameter, max path sum).

**Recipe for solving a tree problem:**

1. Pick a node. Assume you already have the correct answer for `node.left` and `node.right`.
2. Ask: "Given those child answers plus `node.val`, can I compute the answer for this subtree?"
3. Identify the base case (usually a null node or a leaf).
4. Decide if you need to pass info downward (add a parameter) or track a global best (add a nonlocal variable).

---

## 2 · Code Templates

### 2.1 TreeNode Class

```java
public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
```

### 2.2 Recursive DFS Template

```java
public static int dfs(TreeNode node) {
    if (node == null) return 0;            // base case — identity value

    int left = dfs(node.left);
    int right = dfs(node.right);

    // combine: use left, right, and node.val
    return someFunction(left, right, node.val);
}
```

### 2.3 DFS with Downward Info (Parameter Passing)

```java
public static int dfs(TreeNode node, int pathMax) {
    if (node == null) return 0;

    pathMax = Math.max(pathMax, node.val); // update info going down
    int left = dfs(node.left, pathMax);
    int right = dfs(node.right, pathMax);

    return left + right + (node.val >= pathMax ? 1 : 0);
}
```

### 2.4 DFS with Global Best (Nonlocal Variable)

**When to use this template:** Problems where the answer is the "best" value across all nodes (diameter, max path sum), but the value you return upward from each recursive call is different from the answer itself. The pattern is: update a global/instance variable with the candidate answer at each node, while returning a different quantity (like height or single-branch sum) that the parent needs. This separation of "answer" and "return value" is the key insight for diameter-style problems.

```java
private int best = 0;

public int solve(TreeNode root) {
    best = 0;
    dfs(root);
    return best;
}

private int dfs(TreeNode node) {
    if (node == null) return 0;
    int left = dfs(node.left);
    int right = dfs(node.right);
    best = Math.max(best, left + right); // update global answer
    return 1 + Math.max(left, right);    // return info upward
}
```

### 2.5 Iterative DFS with Stack

```java
public static void iterativeDfs(TreeNode root) {
    if (root == null) return;
    Deque<TreeNode> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        // process node
        if (node.right != null) stack.push(node.right);
        if (node.left != null) stack.push(node.left);
    }
}
```

### 2.6 BFS with Queue

```java
import java.util.*;

public static List<Integer> bfs(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            result.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return result;
}
```

---

## 3 · Key Patterns

### 3.1 Return Height Upward

Used in: Maximum Depth, Balanced Binary Tree, Diameter.

The idea: each node returns its height. The parent combines children's heights for its own computation.

### 3.2 Pass Bounds Downward

Used in: Validate BST, Count Good Nodes.

The idea: carry a valid range (or max-so-far) down as a parameter. Each node checks itself against the bound, then narrows the range for its children.

### 3.3 Collect Paths

Used in: Path Sum II, root-to-leaf paths.

The idea: maintain a `path` list. Append before recursing, pop after returning (backtracking). When you hit a leaf that satisfies the condition, snapshot the path.

### 3.4 Build from Traversal Orders

Used in: Construct BT from Preorder + Inorder.

The idea: the first element of preorder is the root. Find it in inorder to split into left and right subtrees. Recurse on each half.

### 3.5 Level-by-Level Processing

Used in: Level Order Traversal, Right Side View, Zigzag.

The idea: BFS with the `level_size = len(queue)` snapshot. Process exactly one level per iteration, which lets you track level boundaries, find the rightmost node per level, or alternate direction.

---

## 4 · Complexity Table

| Operation / Pattern | Time | Space | Notes |
|---------------------|------|-------|-------|
| DFS traversal (pre/in/post) | O(n) | O(h) | h = height; O(log n) balanced, O(n) skewed |
| BFS / level-order traversal | O(n) | O(w) | w = max width; up to n/2 for a complete tree |
| Maximum depth (recursive) | O(n) | O(h) | Visits every node once |
| Validate BST (bounds) | O(n) | O(h) | One DFS pass |
| Diameter of binary tree | O(n) | O(h) | Single DFS returning height |
| Lowest Common Ancestor | O(n) | O(h) | Worst case visits all nodes |
| Construct from preorder + inorder | O(n) | O(n) | O(n) with hashmap for inorder index lookup |
| Max path sum | O(n) | O(h) | DFS with global best |
| Invert binary tree | O(n) | O(h) | Swap left/right at every node |
| Flatten to linked list | O(n) | O(h) | Modified preorder or Morris-like |

> **h = height of the tree.** For a balanced tree h = O(log n). For a degenerate (skewed) tree h = O(n).

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Maximum depth / height of tree" | DFS returning height upward: 1 + max(left, right) | Recursive DFS |
| "Is the tree balanced?" | DFS returning height, return -1 sentinel for unbalanced | Recursive DFS |
| "Diameter / longest path" | DFS returning height, update global with left + right | DFS + Global Best |
| "Maximum path sum" | DFS returning single-branch max (clamp negatives to 0), global tracks through-node sum | DFS + Global Best |
| "Validate BST" | Pass (low, high) bounds downward, or check inorder is strictly increasing | DFS with Bounds |
| "Level order / right side view / zigzag" | BFS with level-size snapshot | BFS Queue |
| "Lowest common ancestor" | DFS returning non-null when target found, LCA is where both sides return non-null | Recursive DFS |
| "Construct tree from traversals" | First/last element of preorder/postorder is root, split inorder to find subtree sizes | Recursive Construction |
| "Serialize / deserialize" | BFS with null markers, or preorder DFS with null sentinel | BFS or DFS |
| "Path sum / root-to-leaf paths" | DFS with running sum passed as parameter, collect at leaf | DFS with Downward Info |

---

## 5 · Worked Example: Maximum Depth of Binary Tree

**Problem (LC 104):** Given the root of a binary tree, return its maximum depth — the number of nodes along the longest path from the root down to the farthest leaf.

### Why not brute force?

A brute-force approach might compute the depth of every node by walking from the root down to each node and tracking the maximum. This would be O(n^2) for a skewed tree (for each of the n nodes, you walk up to n levels to measure depth from root). The recursive approach is O(n) because each node is visited exactly once, and the depth information flows upward through return values rather than being recomputed from the root each time.

:::tip Key Insight
You do not measure depth from the top down. You measure height from the bottom up. Each leaf reports height 0, and each parent simply adds 1 to the taller child. The root ends up with the maximum depth of the entire tree — no redundant traversals needed.
:::

### Approach

Use the "return height upward" pattern: the depth of a tree is 1 + max(depth of left subtree, depth of right subtree). Base case: a null node has depth 0.

```java
public static int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

### Step-by-step recursion trace

```
Input tree:

        3
       / \
      9   20
         /  \
        15   7
```

Let's trace every call. Each line shows the call, what it returns, and why.

```
maxDepth(3)
├── maxDepth(9)
│   ├── maxDepth(None) → 0          # base case
│   └── maxDepth(None) → 0          # base case
│   → 1 + max(0, 0) = 1
│
└── maxDepth(20)
    ├── maxDepth(15)
    │   ├── maxDepth(None) → 0
    │   └── maxDepth(None) → 0
    │   → 1 + max(0, 0) = 1
    │
    └── maxDepth(7)
        ├── maxDepth(None) → 0
        └── maxDepth(None) → 0
        → 1 + max(0, 0) = 1
    │
    → 1 + max(1, 1) = 2
│
→ 1 + max(1, 2) = 3
```

| Call | left result | right result | Return value |
|------|-------------|--------------|--------------|
| `maxDepth(None)` | — | — | 0 |
| `maxDepth(9)` | 0 | 0 | 1 |
| `maxDepth(15)` | 0 | 0 | 1 |
| `maxDepth(7)` | 0 | 0 | 1 |
| `maxDepth(20)` | 1 | 1 | 2 |
| `maxDepth(3)` | 1 | 2 | **3** |

**Answer: 3** (path 3 → 20 → 15 or 3 → 20 → 7).

### Why this works

Every leaf returns 1 (base case 0, plus the `1 +`). Each interior node picks the larger child depth and adds 1 for itself. The root therefore gets the longest root-to-leaf path length.

### Complexity

- **Time:** O(n) — every node visited exactly once.
- **Space:** O(h) — recursion stack depth equals the tree height.

### Interactive Animation

<AlgoViz
  title="Maximum Depth of Binary Tree — Recursion Trace"
  description="Watch the recursive DFS compute depth bottom-up from leaves to root"
  steps={[
    {
      array: [3, 9, 20, null, null, 15, 7],
      highlights: [1],
      variables: { call: "maxDepth(9)", left: 0, right: 0, result: 1 },
      explanation: "Visit node 9: both children are null (return 0). Depth = 1 + max(0, 0) = 1.",
      code: "return 1 + Math.max(0, 0); // = 1"
    },
    {
      array: [3, 9, 20, null, null, 15, 7],
      highlights: [5],
      variables: { call: "maxDepth(15)", left: 0, right: 0, result: 1 },
      explanation: "Visit node 15: both children are null. Depth = 1 + max(0, 0) = 1.",
      code: "return 1 + Math.max(0, 0); // = 1"
    },
    {
      array: [3, 9, 20, null, null, 15, 7],
      highlights: [6],
      variables: { call: "maxDepth(7)", left: 0, right: 0, result: 1 },
      explanation: "Visit node 7: both children are null. Depth = 1 + max(0, 0) = 1.",
      code: "return 1 + Math.max(0, 0); // = 1"
    },
    {
      array: [3, 9, 20, null, null, 15, 7],
      highlights: [2],
      secondary: [5, 6],
      variables: { call: "maxDepth(20)", left: 1, right: 1, result: 2 },
      explanation: "Visit node 20: left depth=1 (from 15), right depth=1 (from 7). Depth = 1 + max(1, 1) = 2.",
      code: "return 1 + Math.max(1, 1); // = 2"
    },
    {
      array: [3, 9, 20, null, null, 15, 7],
      highlights: [0],
      secondary: [1, 2],
      variables: { call: "maxDepth(3)", left: 1, right: 2, result: 3 },
      explanation: "Visit root 3: left depth=1 (from 9), right depth=2 (from 20). Depth = 1 + max(1, 2) = 3. Answer: 3.",
      code: "return 1 + Math.max(1, 2); // = 3"
    }
  ]}
/>

---

## 6 · Practice Problems (21 problems · 7 days)

### Day 1–2: Easy-Focused (Warm-Up)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 1 | Binary Tree Inorder Traversal | Easy | DFS | ⭐ | 94 |
| 2 | Binary Tree Preorder Traversal | Easy | DFS | | 144 |
| 3 | Maximum Depth of Binary Tree | Easy | Recursion | ⭐ | 104 |
| 4 | Same Tree | Easy | Recursion | | 100 |
| 5 | Invert Binary Tree | Easy | Recursion | ⭐ | 226 |
| 6 | Symmetric Tree | Easy | Recursion | | 101 |
| 7 | Subtree of Another Tree | Easy | Recursion | | 572 |

**Day 1–2 study tips:**
- Problem 1 is the single most important traversal to master. Practice both recursive and iterative inorder — the iterative version uses the "go left, backtrack, go right" pattern you'll reuse in BST problems.
- Same Tree and Symmetric Tree are nearly identical: Same Tree compares two trees node-by-node; Symmetric Tree compares the left subtree of the root with the mirror of the right subtree.

<AlgoViz
  title="Symmetric Tree Check — Mirror Comparison"
  description="A tree is symmetric if its left subtree is a mirror of its right subtree. We compare outer pairs (left.left vs right.right) and inner pairs (left.right vs right.left) recursively."
  steps={[
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [4],
      variables: { comparing: "root" },
      explanation: "Is this tree symmetric? The root doesn't need a mirror — call isMirror(root.left, root.right) to compare the two subtrees.",
      code: "return isMirror(root.left, root.right);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [2],
      variables: { leftVal: 2, rightVal: 2, match: "2 == 2 ✓" },
      explanation: "Compare the two children of root: left.val=2 and right.val=2. Values match! Now check their children as mirror images.",
      code: "if (left.val != right.val) return false; // 2 == 2, continue"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [1],
      variables: { pair: "outer", leftVal: 1, rightVal: 1, match: "1 == 1 ✓" },
      explanation: "Outer pair: compare left.left (1) with right.right (1). Values match and both are leaves — return true.",
      code: "isMirror(left.left, right.right); // isMirror(1, 1) → true"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [3],
      variables: { pair: "inner", leftVal: 3, rightVal: 3, match: "3 == 3 ✓" },
      explanation: "Inner pair: compare left.right (3) with right.left (3). Values match and both are leaves — return true.",
      code: "isMirror(left.right, right.left); // isMirror(3, 3) → true"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [4, 2, 1, 3],
      variables: { outerCheck: "true", innerCheck: "true" },
      explanation: "Both outer (1↔1) and inner (3↔3) pairs match. isMirror(2, 2) returns true. The entire tree is symmetric!",
      code: "return isMirror(l.left, r.right) && isMirror(l.right, r.left); // true"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [4, 2, 1, 3],
      variables: { result: "true" },
      explanation: "Final result: symmetric. Every outer pair (left.left↔right.right) and inner pair (left.right↔right.left) matched at every level of recursion.",
      code: "return true; // tree is symmetric"
    }
  ]}
/>

- Invert Binary Tree is a one-liner recursively (`node.left, node.right = node.right, node.left`) but make sure you understand why it works bottom-up.

<AlgoViz
  title="Invert Binary Tree — Recursive Swap"
  description="Invert a binary tree by swapping left and right children at every node, bottom-up. Each recursive call inverts its subtree first, then swaps. Tree: [4, 2, 6, 1, 3, 5, 7]."
  steps={[
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [],
      stack: ["invertTree(4)"],
      variables: { call: "invertTree(4)" },
      explanation: "Start with the original tree. Call invertTree(4). We recurse into the left subtree first before any swapping happens.",
      code: "TreeNode left = invertTree(node.left);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3],
      stack: ["invertTree(4)", "invertTree(2)"],
      variables: { call: "invertTree(2)" },
      explanation: "Call invertTree(2). Recurse into its children: invertTree(1) and invertTree(3) both hit leaves and return immediately.",
      code: "invertTree(node.left); invertTree(node.right); // leaves"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [2],
      stack: ["invertTree(4)"],
      variables: { call: "invertTree(2)", swap: "left↔right" },
      explanation: "At node 2: swap left and right children. Node 2 now has left=3, right=1 (was left=1, right=3).",
      code: "node.left = right; node.right = left; // swap at node 2"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [5, 7],
      stack: ["invertTree(4)", "invertTree(6)"],
      variables: { call: "invertTree(6)" },
      explanation: "Now recurse into the right subtree: invertTree(6). Its children invertTree(5) and invertTree(7) are leaves — return immediately.",
      code: "invertTree(node.left); invertTree(node.right); // leaves"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } }, right: { val: 6, left: { val: 7, left: null, right: null }, right: { val: 5, left: null, right: null } } },
      treeHighlights: [6],
      stack: ["invertTree(4)"],
      variables: { call: "invertTree(6)", swap: "left↔right" },
      explanation: "At node 6: swap left and right children. Node 6 now has left=7, right=5 (was left=5, right=7).",
      code: "node.left = right; node.right = left; // swap at node 6"
    },
    {
      tree: { val: 4, left: { val: 6, left: { val: 7, left: null, right: null }, right: { val: 5, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [4],
      stack: [],
      variables: { call: "invertTree(4)", swap: "left↔right" },
      explanation: "At root 4: swap the entire left subtree (rooted at 2) with the right subtree (rooted at 6). Both subtrees were already inverted internally.",
      code: "node.left = right; node.right = left; // swap at root"
    },
    {
      tree: { val: 4, left: { val: 6, left: { val: 7, left: null, right: null }, right: { val: 5, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } },
      treeHighlights: [4, 6, 7, 5, 2, 3, 1],
      stack: [],
      variables: { result: "inverted" },
      explanation: "Inversion complete! Every node's children have been swapped. The tree is now a mirror image of the original: [4, 6, 2, 7, 5, 3, 1].",
      code: "return node; // fully inverted tree"
    }
  ]}
/>

- Subtree of Another Tree combines the Same Tree check with a traversal of the main tree — O(m * n) brute force.

### Day 3–4: Medium-Focused (Pattern Building)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 8 | Binary Tree Level Order Traversal | Medium | BFS | ⭐ | 102 |
| 9 | Binary Tree Right Side View | Medium | BFS / DFS | ⭐ | 199 |
| 10 | Count Good Nodes in Binary Tree | Medium | DFS with max | | 1448 |
| 11 | Validate Binary Search Tree | Medium | Inorder or bounds | ⭐ | 98 |
| 12 | Path Sum | Easy | DFS | | 112 |
| 13 | Path Sum II | Medium | DFS + backtrack | | 113 |
| 14 | Binary Tree Zigzag Level Order | Medium | BFS + toggle | | 103 |

**Day 3–4 study tips:**
- Level Order Traversal is the BFS template you'll reuse everywhere. Nail the `level_size = len(queue)` trick.
- Right Side View: BFS approach takes the last node of each level. DFS approach visits right before left and tracks the first node seen at each depth.
- Validate BST has two clean approaches: (a) inorder traversal must produce a strictly increasing sequence, or (b) pass `(low, high)` bounds downward and verify each node falls within range.
- Path Sum II requires backtracking — append `node.val` to the path before recursing, and pop it after. When you reach a leaf with the target sum, copy the path into your result.
- Zigzag is Level Order with alternating left-to-right and right-to-left. Either reverse odd levels, or use a deque and alternate `append` vs `appendleft`.

### Day 5–7: Medium / Hard (Deep Dive)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 15 | Diameter of Binary Tree | Easy | DFS returning height | ⭐ | 543 |
| 16 | Binary Tree Maximum Path Sum | Hard | DFS | ⭐ | 124 |
| 17 | Lowest Common Ancestor of a Binary Tree | Medium | DFS | ⭐ | 236 |
| 18 | Flatten Binary Tree to Linked List | Medium | DFS | | 114 |
| 19 | Construct Binary Tree from Preorder and Inorder Traversal | Medium | Recursion | ⭐ | 105 |
| 20 | Populating Next Right Pointers in Each Node | Medium | BFS | | 116 |
| 21 | Balanced Binary Tree | Easy | DFS | | 110 |

**Day 5–7 study tips:**
- **Diameter** is the archetype of the "global best + return different value" pattern. The DFS returns height upward, but at each node you check whether `left_height + right_height` beats the global best diameter.
- **Maximum Path Sum** extends the diameter idea: the "path through this node" is `node.val + max(0, left) + max(0, right)` (clamp negatives to 0 because you can skip a subtree). Return `node.val + max(0, left, right)` upward — you can only extend one branch toward the parent.
- **Lowest Common Ancestor:** If the current node is `p` or `q`, return it. Otherwise recurse left and right. If both return non-null, the current node is the LCA. If only one side returns non-null, propagate it upward.
- **Construct from Preorder + Inorder:** The first element of preorder is the root. Use a hashmap to find its index in inorder in O(1). Everything to the left in inorder is the left subtree; everything to the right is the right subtree. Use index arithmetic to partition preorder accordingly.
- **Balanced Binary Tree** combines a boolean check with height computation. Return `-1` as a sentinel for "unbalanced" to avoid redundant work — if either subtree returns `-1`, propagate it without further computation.

---

## 7 · Mock Interviews

### Mock Interview 1 — DFS / Recursion Focus (45 min)

**Interviewer prompt:**

> "Given the root of a binary tree, return the length of the **diameter** — the longest path between any two nodes. The path does not need to pass through the root. The length is measured in number of edges."
>
> *(LC 543 — Diameter of Binary Tree)*

**Expected dialogue:**

1. **Clarify:** "Is the tree a BST or a general binary tree?" → General. "Can the tree be empty?" → The tree has at least one node. "Is the diameter measured in edges or nodes?" → Edges.
2. **Brute force:** "For every node, I could compute the height of its left and right subtrees and take the max sum. That's O(n) per node → O(n²) total."
3. **Optimise:** "I can do it in one DFS pass. At each node, I calculate `left_height + right_height` and update a global max. I return `1 + max(left_height, right_height)` upward so the parent can use my height."
4. **Code:**

```java
private int best = 0;

public int diameterOfBinaryTree(TreeNode root) {
    best = 0;
    dfs(root);
    return best;
}

private int dfs(TreeNode node) {
    if (node == null) return 0;
    int left = dfs(node.left);
    int right = dfs(node.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
}
```

<AlgoViz
  title="Diameter of Binary Tree — DFS Height + Global Best"
  description="The diameter is the longest path between any two nodes (in edges). DFS returns height upward while updating a global best with left + right at each node. Tree: [4, 2, 6, 1, 3, 5, 7]."
  steps={[
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [],
      variables: { best: 0 },
      explanation: "Start DFS from root 4. We process leaves first (postorder-style). At each node, the diameter candidate is left_height + right_height.",
      code: "best = 0; dfs(root);"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1],
      stack: ["dfs(4)", "dfs(2)", "dfs(1)"],
      variables: { node: 1, left: 0, right: 0, candidate: 0, best: 0, height: 1 },
      explanation: "dfs(1): leaf node. left=0, right=0. Diameter candidate through node 1 = 0+0 = 0. best stays 0. Return height = 1.",
      code: "best = max(0, 0+0); return 1 + max(0, 0); // height=1"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3],
      stack: ["dfs(4)", "dfs(2)"],
      variables: { node: 3, left: 0, right: 0, candidate: 0, best: 0, height: 1 },
      explanation: "dfs(3): leaf node. left=0, right=0. Candidate = 0. best stays 0. Return height = 1.",
      code: "best = max(0, 0+0); return 1 + max(0, 0); // height=1"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3, 2],
      stack: ["dfs(4)"],
      variables: { node: 2, left: 1, right: 1, candidate: 2, best: 2, height: 2 },
      explanation: "dfs(2): left=1 (from node 1), right=1 (from node 3). Candidate = 1+1 = 2. best = max(0, 2) = 2. Return height = 1+max(1,1) = 2.",
      code: "best = max(0, 1+1); return 1 + max(1, 1); // height=2"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3, 2, 5],
      stack: ["dfs(4)", "dfs(6)", "dfs(5)"],
      variables: { node: 5, left: 0, right: 0, candidate: 0, best: 2, height: 1 },
      explanation: "dfs(5): leaf node. Candidate = 0. best stays 2. Return height = 1.",
      code: "best = max(2, 0+0); return 1 + max(0, 0); // height=1"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3, 2, 5, 7],
      stack: ["dfs(4)", "dfs(6)"],
      variables: { node: 7, left: 0, right: 0, candidate: 0, best: 2, height: 1 },
      explanation: "dfs(7): leaf node. Candidate = 0. best stays 2. Return height = 1.",
      code: "best = max(2, 0+0); return 1 + max(0, 0); // height=1"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3, 2, 5, 7, 6],
      stack: ["dfs(4)"],
      variables: { node: 6, left: 1, right: 1, candidate: 2, best: 2, height: 2 },
      explanation: "dfs(6): left=1, right=1. Candidate = 1+1 = 2. best = max(2, 2) = 2. Return height = 2.",
      code: "best = max(2, 1+1); return 1 + max(1, 1); // height=2"
    },
    {
      tree: { val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } } },
      treeHighlights: [1, 3, 2, 5, 7, 6, 4],
      stack: [],
      variables: { node: 4, left: 2, right: 2, candidate: 4, best: 4, height: 3 },
      explanation: "dfs(4): left=2, right=2. Candidate = 2+2 = 4. best = max(2, 4) = 4. Diameter = 4 edges (path: 1→2→4→6→7). Return height = 3.",
      code: "best = max(2, 2+2); return 1 + max(2, 2); // diameter = 4"
    }
  ]}
/>

5. **Test:** Trace through a small tree:

```
      1
     / \
    2   3
   / \
  4   5

dfs(4) → 0, 0, best=0, return 1
dfs(5) → 0, 0, best=0, return 1
dfs(2) → left=1, right=1, best=max(0,2)=2, return 2
dfs(3) → 0, 0, best=2, return 1
dfs(1) → left=2, right=1, best=max(2,3)=3, return 3

Answer: 3 (path 4→2→1→3 or 5→2→1→3)
```

**Follow-up questions:**

1. *"What if I asked for the actual path (list of node values), not just the length?"* → During DFS, track the path from each node to its deepest leaf. At the node where `left + right` is maximised, concatenate the reversed left path, the node, and the right path. This requires returning the path list from each recursive call.
2. *"What if the tree has weighted edges?"* → Change the return value from `1 + max(...)` to `weight + max(...)`. The structure is identical, but you sum edge weights instead of counting edges.
3. *"How would you solve this iteratively?"* → Use iterative postorder traversal. Maintain a hashmap from node to height. When you pop a node from the stack (postorder), look up its children's heights, compute the diameter candidate, and store its own height.
4. *"Now solve Binary Tree Maximum Path Sum (LC 124). How does it differ?"* → Instead of heights, you track maximum path sums. You clamp child contributions to 0 (skip negative paths). The "path through this node" is `node.val + max(0, left) + max(0, right)`. Return `node.val + max(0, left, right)` upward.

---

### Mock Interview 2 — BFS / Construction Focus (45 min)

**Interviewer prompt:**

> "Given two integer arrays `preorder` and `inorder` where `preorder` is the preorder traversal of a binary tree and `inorder` is the inorder traversal of the same tree, construct and return the binary tree."
>
> *(LC 105 — Construct Binary Tree from Preorder and Inorder Traversal)*

**Expected dialogue:**

1. **Clarify:** "Are all values unique?" → Yes. "Can the arrays be empty?" → Yes, return null. "Are the arrays guaranteed to represent a valid tree?" → Yes.
2. **Key insight:** "The first element of `preorder` is always the root. I can find this value in `inorder` to determine the boundary between left and right subtrees."
3. **Approach:** "I'll use a hashmap to store `value → index` for `inorder` so the lookup is O(1). Then I recursively build left and right subtrees using index ranges."
4. **Code:**

```java
import java.util.HashMap;
import java.util.Map;

private int preIdx = 0;
private Map<Integer, Integer> inorderIndex;

public TreeNode buildTree(int[] preorder, int[] inorder) {
    inorderIndex = new HashMap<>();
    for (int i = 0; i < inorder.length; i++)
        inorderIndex.put(inorder[i], i);
    preIdx = 0;
    return build(preorder, 0, inorder.length - 1);
}

private TreeNode build(int[] preorder, int inLeft, int inRight) {
    if (inLeft > inRight) return null;

    int rootVal = preorder[preIdx++];
    TreeNode root = new TreeNode(rootVal);

    int mid = inorderIndex.get(rootVal);
    root.left = build(preorder, inLeft, mid - 1);
    root.right = build(preorder, mid + 1, inRight);
    return root;
}
```

5. **Test:** Trace with `preorder = [3,9,20,15,7]`, `inorder = [9,3,15,20,7]`:

```
build(0, 4): root=3, mid=1
  build(0, 0): root=9, mid=0
    build(0, -1) → None
    build(1, 0) → None
    → TreeNode(9)
  build(2, 4): root=20, mid=3
    build(2, 2): root=15, mid=2
      build(2, 1) → None
      build(3, 2) → None
      → TreeNode(15)
    build(4, 4): root=7, mid=4
      build(4, 3) → None
      build(5, 4) → None
      → TreeNode(7)
    → TreeNode(20, left=15, right=7)
  → TreeNode(3, left=9, right=20)
```

**Follow-up questions:**

1. *"What if you're given postorder and inorder instead?"* → The last element of postorder is the root (instead of the first element of preorder). Process the postorder array from right to left, and build the right subtree before the left subtree.
2. *"What if values are not unique?"* → The hashmap approach breaks because the same value can appear at multiple inorder positions. You'd need a different strategy, such as tracking which indices have been used, or using a different pair of traversals.
3. *"Can you do this in O(n) without the hashmap?"* → Yes, using the "next invalid value" approach: pass a `stop` value down the recursion. Consume preorder elements until you hit the stop value. This is O(n) time and O(h) space but harder to implement correctly.
4. *"What's the time and space complexity of your solution?"* → Time: O(n) — each node is created once and the hashmap lookup is O(1). Space: O(n) — the hashmap stores n entries, and the recursion stack is O(h) where h can be up to n for a skewed tree.

---

## 8 · Tips and Edge Cases

### Common Pitfalls

- **Forgetting the base case:** `if (node == null) return ...;` must always come first. Missing it causes a `NullPointerException`.
- **Confusing height and depth:** Height is measured upward from a leaf; depth is measured downward from the root. The maximum depth of a tree equals the height of the root.
- **Returning the wrong thing:** In problems like Diameter, you update the global best with `left + right` but you must return `1 + max(left, right)` upward — not the diameter itself. The return value serves a different purpose than the answer.
- **Not clamping negative paths:** In Maximum Path Sum, a subtree with a negative sum should be skipped (clamped to 0). Forgetting this leads to incorrect results when the tree contains negative values.
- **BST validation with equality:** For "Validate BST", values must be **strictly** less/greater (not less-or-equal). Using `<=` in the wrong direction is a common bug.
- **Mutating shared state during backtracking:** When collecting paths, remember to `path.remove(path.size() - 1)` after recursing. And when adding a path to results, use `result.add(new ArrayList<>(path))` — a copy, not a reference to the mutable list.

### Edge Cases Checklist

| Edge Case | Example | Watch Out For |
|-----------|---------|---------------|
| Empty tree | `root = null` | Return identity value (0, true, empty list, etc.) |
| Single node | `root = TreeNode(5)` | It's both root and leaf; depth = 1, height = 0 |
| Left-skewed tree | 1 → 2 → 3 → 4 (all left children) | Height = n − 1; recursion stack O(n); BFS queue always size 1 |
| Right-skewed tree | 1 → 2 → 3 → 4 (all right children) | Same concerns as left-skewed |
| All identical values | Every node has value 5 | BST validation should return False (not strictly increasing) |
| Negative values | Nodes with val = -10 | Max path sum may exclude entire subtrees |
| Very deep tree (n = 10^4+) | Long chain | Recursive DFS may cause StackOverflowError with default thread stack size |
| Perfect binary tree | All levels full | Max BFS queue width = n/2 at the last level |

### Performance Tips

- **Iterative DFS for deep trees:** Java's default thread stack size is typically ~512KB. For very deep trees (tens of thousands of levels), convert to iterative DFS or increase the stack size with `-Xss`.
- **HashMap for inorder index lookup:** When constructing a tree from traversal arrays, avoid linear search in inorder — build a `value -> index` HashMap once for O(1) lookups.
- **Morris Traversal for O(1) space:** If the problem requires O(1) extra space (no stack, no recursion), Morris Traversal temporarily modifies the tree using threaded pointers. It's rarely needed in interviews but worth knowing exists.
- **BFS queue size:** For a complete binary tree, the last level holds up to n/2 nodes. BFS space is O(n) in the worst case, not O(log n).

### Recognising Tree Problems

Ask yourself:
- "Do I need to compute a property for every subtree?" → **DFS returning info upward.**
- "Does the answer depend on the path from root to current node?" → **DFS passing info downward as a parameter.**
- "Do I need the answer level by level?" → **BFS with the level-size snapshot.**
- "Am I comparing two trees or two subtrees?" → **Parallel recursion on both trees simultaneously.**
- "Do I need to find an ancestor?" → **DFS that returns a signal when it finds the target, and combines signals from left/right.**
- "Am I building a tree from a serialised form?" → **Recursive construction with index tracking.**
