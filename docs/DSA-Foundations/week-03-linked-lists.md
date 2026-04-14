---
sidebar_position: 4
title: "Week 3: Linked Lists"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 3: Linked Lists

Linked lists are the first data structure where **memory layout matters**. Unlike arrays, elements are scattered across memory, connected by pointers. This week you'll master pointer manipulation — the single most important skill for linked list problems.

---

## Core Theory

### What Is a Linked List?

A linked list is a linear collection of **nodes**, where each node stores:
- A **value** (the data)
- One or more **pointers** to other nodes

Unlike arrays, linked lists have:
- **O(1) insertion/deletion** at a known position (no shifting)
- **O(n) access** (no random indexing)
- **Dynamic size** (no pre-allocation)

#### Why linked lists exist

Arrays are fast for random access but terrible for insertions and deletions in the middle — every element after the insertion point must shift. Linked lists solve this: inserting or removing a node only requires rewiring two pointers, regardless of list size. This makes them ideal for scenarios where the collection changes shape frequently (queues, undo stacks, LRU caches) but random access is not needed.

**Interview signal phrases:** "reverse", "merge sorted lists", "detect cycle", "find middle", "reorder", "remove Nth from end". If you see any of these, you are dealing with a linked list problem and pointer manipulation is the core skill.

**Common misconception:** beginners think linked lists are always better than arrays for dynamic data. In practice, arrays (or `ArrayList`) are preferred in most real-world code because of CPU cache locality — linked list nodes are scattered in memory, causing frequent cache misses. Linked lists shine primarily in two scenarios: (1) when you need O(1) insertions/deletions at arbitrary known positions, and (2) in combination with hash maps for O(1) access + O(1) reordering (e.g., LRU Cache).

### Singly Linked List

Each node points to the **next** node. The last node points to `null`.

```
[10] -> [20] -> [30] -> [40] -> None
 head
```

- Traversal: forward only
- Deletion: need reference to the **previous** node (or use predecessor tracking)

### Doubly Linked List

Each node points to both **next** and **prev** nodes.

```
None <- [10] <-> [20] <-> [30] <-> [40] -> None
         head                        tail
```

- Traversal: forward and backward
- Deletion: O(1) given the node itself (no need for predecessor)
- Extra memory: one additional pointer per node
- Used in: LRU cache, browser history, undo systems

### Node Structure

**Singly linked:**
```java
public class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
```

**Doubly linked:**
```java
public class DListNode {
    int val;
    DListNode prev;
    DListNode next;
    DListNode() {}
    DListNode(int val) { this.val = val; }
}
```

### Key Techniques

#### 1. Dummy Head (Sentinel Node)

A dummy node placed before the real head simplifies edge cases — you never have to special-case "what if head is null?" or "what if we delete the head?"

```
dummy -> [10] -> [20] -> [30] -> None
```

After operations, return `dummy.next` as the new head.

**When to use:** merging lists, removing nodes, any problem where the head might change.

#### 2. In-Place Reversal

Reverse pointers one by one without extra space.

```
Before:  1 -> 2 -> 3 -> None
After:   1 <- 2 <- 3
         None      head
```

The key insight: you need **three pointers** — `prev`, `curr`, and `next_node` — to avoid losing references.

#### 3. Fast/Slow Pointer (Floyd's Tortoise and Hare)

Two pointers move at different speeds:
- **Slow** moves 1 step at a time
- **Fast** moves 2 steps at a time

**Applications:**
- **Cycle detection:** if fast and slow meet, there's a cycle
- **Find middle:** when fast reaches the end, slow is at the middle
- **Find cycle start:** after detection, reset one pointer to head and move both at speed 1 — they meet at the cycle entry

#### 4. Two-Pointer Gap Technique

Create a **gap of N nodes** between two pointers. When the leading pointer hits the end, the trailing pointer is at the target position.

Used for: "remove Nth node from end" type problems.

#### 5. Split, Transform, Merge

Many medium/hard problems follow this pattern:
1. **Split** the list (often at the midpoint using fast/slow)
2. **Transform** one or both halves (reverse, sort, etc.)
3. **Merge** the results back together

Used for: palindrome check, reorder list, sort list.

---

## Code Templates

### Template 1: ListNode Class + Traversal

```java
import java.util.*;

public class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        Set<ListNode> seen = new HashSet<>();
        ListNode curr = this;
        while (curr != null && !seen.contains(curr)) {
            seen.add(curr);
            if (sb.length() > 0) sb.append(" -> ");
            sb.append(curr.val);
            curr = curr.next;
        }
        sb.append(curr != null ? " -> ..." : " -> null");
        return sb.toString();
    }
}

// Build a linked list from an array.
public static ListNode buildList(int[] values) {
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    for (int v : values) {
        curr.next = new ListNode(v);
        curr = curr.next;
    }
    return dummy.next;
}

// Convert a linked list to an ArrayList.
public static List<Integer> toList(ListNode head) {
    List<Integer> result = new ArrayList<>();
    while (head != null) {
        result.add(head.val);
        head = head.next;
    }
    return result;
}

// Usage
ListNode head = buildList(new int[]{1, 2, 3, 4, 5});
System.out.println(head);          // 1 -> 2 -> 3 -> 4 -> 5 -> null
System.out.println(toList(head));  // [1, 2, 3, 4, 5]
```

### Template 2: Iterative Reversal

**When to use this template:** Any problem that requires reversing a linked list or a portion of it. This is the single most reusable linked list template — it appears directly in "Reverse Linked List", and as a subroutine in "Reverse Linked List II", "Reverse Nodes in k-Group", "Reorder List", and "Palindrome Linked List". The three-pointer dance (prev, curr, nextNode) is the key to memorize. O(n) time, O(1) space.

```java
// Reverse a singly linked list in-place.
public static ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;

    while (curr != null) {
        ListNode nextNode = curr.next;  // save next
        curr.next = prev;               // reverse pointer
        prev = curr;                    // advance prev
        curr = nextNode;                // advance curr
    }
    return prev; // prev is new head
}
```

**Recursive version:**

```java
public static ListNode reverseListRecursive(ListNode head) {
    if (head == null || head.next == null) return head;

    ListNode newHead = reverseListRecursive(head.next);
    head.next.next = head; // reverse the pointer
    head.next = null;      // break old forward link
    return newHead;
}
```

#### Reverse Linked List Animation

<AlgoViz
  title="Reverse Linked List — Three-Pointer Dance"
  description="Watch prev, curr, and nextNode reverse [1, 2, 3, 4, 5] in place"
  steps={[
    {
      array: [1, 2, 3, 4, 5],
      highlights: [0],
      pointers: { 0: "curr" },
      variables: { prev: "null", curr: 1, nextNode: 2 },
      explanation: "Initial state: prev=null, curr points to node 1. Save nextNode=2, then reverse: curr.next = prev (null).",
      code: "nextNode = curr.next; curr.next = prev;"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [1],
      secondary: [0],
      pointers: { 0: "prev", 1: "curr" },
      variables: { prev: 1, curr: 2, nextNode: 3 },
      explanation: "Advance: prev=1, curr=2. Save nextNode=3. Reverse: node 2 now points back to node 1.",
      code: "curr.next = prev; // 2 -> 1"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [2],
      secondary: [1],
      pointers: { 1: "prev", 2: "curr" },
      variables: { prev: 2, curr: 3, nextNode: 4 },
      explanation: "Advance: prev=2, curr=3. Save nextNode=4. Reverse: node 3 now points back to node 2.",
      code: "curr.next = prev; // 3 -> 2 -> 1"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [3],
      secondary: [2],
      pointers: { 2: "prev", 3: "curr" },
      variables: { prev: 3, curr: 4, nextNode: 5 },
      explanation: "Advance: prev=3, curr=4. Save nextNode=5. Reverse: node 4 now points back to node 3.",
      code: "curr.next = prev; // 4 -> 3 -> 2 -> 1"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [4],
      secondary: [3],
      pointers: { 3: "prev", 4: "curr" },
      variables: { prev: 4, curr: 5, nextNode: "null" },
      explanation: "Advance: prev=4, curr=5. nextNode=null. Reverse: node 5 points back to node 4. curr becomes null, loop ends.",
      code: "curr.next = prev; // 5 -> 4 -> 3 -> 2 -> 1"
    },
    {
      array: [5, 4, 3, 2, 1],
      highlights: [0],
      pointers: { 0: "head" },
      variables: { result: "5 -> 4 -> 3 -> 2 -> 1 -> null" },
      explanation: "Done! Return prev (node 5) as the new head. The list is fully reversed.",
      code: "return prev; // new head = 5"
    }
  ]}
/>

### Template 3: Fast/Slow Pointer

```java
// Return the middle node (second middle for even-length lists).
public static ListNode findMiddle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}

// Detect if a linked list has a cycle.
public static boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}

// Return the node where the cycle begins, or null.
public static ListNode findCycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            // Phase 2: find entrance
            slow = head;
            while (slow != fast) {
                slow = slow.next;
                fast = fast.next;
            }
            return slow;
        }
    }
    return null;
}
```

#### Floyd's Cycle Detection Animation

<AlgoViz
  title="Floyd's Cycle Detection — Slow and Fast Pointers"
  description="Detect a cycle in a linked list with values [3, 2, 0, -4] where -4 links back to node 2"
  steps={[
    {
      array: [3, 2, 0, -4],
      highlights: [0],
      pointers: { 0: "S=F" },
      variables: { slow: 3, fast: 3, step: 0 },
      explanation: "Both slow and fast start at head (node 3). The list has a cycle: -4 points back to node 2 (index 1).",
      code: "ListNode slow = head, fast = head;"
    },
    {
      array: [3, 2, 0, -4],
      highlights: [1],
      secondary: [2],
      pointers: { 1: "slow", 2: "fast" },
      variables: { slow: 2, fast: 0, step: 1 },
      explanation: "Step 1: slow moves 1 step to node 2. Fast moves 2 steps to node 0. They have not met.",
      code: "slow = slow.next; fast = fast.next.next;"
    },
    {
      array: [3, 2, 0, -4],
      highlights: [2],
      secondary: [1],
      pointers: { 2: "slow", 1: "fast" },
      variables: { slow: 0, fast: 2, step: 2 },
      explanation: "Step 2: slow moves to node 0. Fast moves 2 steps: -4 then back to node 2 (cycle!). Not met yet.",
      code: "slow = slow.next; fast = fast.next.next;"
    },
    {
      array: [3, 2, 0, -4],
      highlights: [3],
      secondary: [3],
      pointers: { 3: "S=F" },
      variables: { slow: -4, fast: -4, step: 3, met: true },
      explanation: "Step 3: slow moves to node -4. Fast moves 2 steps: 0 then -4. They meet at node -4! Cycle detected!",
      code: "if (slow == fast) return true; // cycle found!"
    },
    {
      array: [3, 2, 0, -4],
      highlights: [0, 3],
      pointers: { 0: "slow", 3: "fast" },
      variables: { phase: "Find cycle start" },
      explanation: "Phase 2 (optional): Reset slow to head. Move both at speed 1. They will meet at the cycle entrance (node 2).",
      code: "slow = head; // reset for phase 2"
    },
    {
      array: [3, 2, 0, -4],
      highlights: [1],
      pointers: { 1: "S=F" },
      variables: { slow: 2, fast: 2, cycleStart: "node 2" },
      explanation: "Slow moves to node 2, fast moves to node 2 (from -4 back into cycle). They meet at node 2 -- the cycle entrance!",
      code: "// slow == fast at node 2 → cycle starts here"
    }
  ]}
/>

### Template 4: Dummy Head Merge

```java
// Merge two sorted linked lists.
public static ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0);
    ListNode tail = dummy;

    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) {
            tail.next = l1;
            l1 = l1.next;
        } else {
            tail.next = l2;
            l2 = l2.next;
        }
        tail = tail.next;
    }

    tail.next = (l1 != null) ? l1 : l2;
    return dummy.next;
}
```

#### Merge Two Sorted Lists Animation

<AlgoViz
  title="Merge Two Sorted Lists — Dummy Head Approach"
  description="Merge [1, 3, 5] and [2, 4, 6] into a single sorted list"
  steps={[
    {
      array: [1, 3, 5],
      array2: [2, 4, 6],
      highlights: [0],
      highlights2: [0],
      pointers: { 0: "p1" },
      variables: { merged: "dummy", compare: "1 vs 2" },
      explanation: "Compare heads: L1=1, L2=2. 1 is smaller, so attach node 1 to merged list. Advance L1.",
      code: "tail.next = l1; l1 = l1.next; // pick 1"
    },
    {
      array: [1, 3, 5],
      array2: [2, 4, 6],
      highlights: [1],
      highlights2: [0],
      variables: { merged: "1", compare: "3 vs 2" },
      explanation: "Compare: L1=3, L2=2. 2 is smaller, attach node 2. Advance L2.",
      code: "tail.next = l2; l2 = l2.next; // pick 2"
    },
    {
      array: [1, 3, 5],
      array2: [2, 4, 6],
      highlights: [1],
      highlights2: [1],
      variables: { merged: "1 -> 2", compare: "3 vs 4" },
      explanation: "Compare: L1=3, L2=4. 3 is smaller, attach node 3. Advance L1.",
      code: "tail.next = l1; l1 = l1.next; // pick 3"
    },
    {
      array: [1, 3, 5],
      array2: [2, 4, 6],
      highlights: [2],
      highlights2: [1],
      variables: { merged: "1 -> 2 -> 3", compare: "5 vs 4" },
      explanation: "Compare: L1=5, L2=4. 4 is smaller, attach node 4. Advance L2.",
      code: "tail.next = l2; l2 = l2.next; // pick 4"
    },
    {
      array: [1, 3, 5],
      array2: [2, 4, 6],
      highlights: [2],
      highlights2: [2],
      variables: { merged: "1->2->3->4", compare: "5 vs 6" },
      explanation: "Compare: L1=5, L2=6. 5 is smaller, attach node 5. Advance L1 (now null).",
      code: "tail.next = l1; l1 = l1.next; // pick 5"
    },
    {
      array: [1, 2, 3, 4, 5, 6],
      highlights: [0, 1, 2, 3, 4, 5],
      variables: { merged: "1->2->3->4->5->6" },
      explanation: "L1 is null. Attach remaining L2 (node 6). Done! Merged list: 1 -> 2 -> 3 -> 4 -> 5 -> 6.",
      code: "tail.next = l2; return dummy.next; // [1,2,3,4,5,6]"
    }
  ]}
/>

---

## Complexity Table

| Operation | Singly Linked | Doubly Linked | Array |
|---|---|---|---|
| Access by index | O(n) | O(n) | O(1) |
| Search | O(n) | O(n) | O(n) |
| Insert at head | O(1) | O(1) | O(n) |
| Insert at tail (with tail ptr) | O(1) | O(1) | O(1)* |
| Insert at position | O(n) | O(n) | O(n) |
| Delete at head | O(1) | O(1) | O(n) |
| Delete given node | O(n)† | O(1) | O(n) |
| Delete at position | O(n) | O(n) | O(n) |
| Space per element | val + 1 ptr | val + 2 ptrs | val only |

*Amortized for dynamic arrays. †Need predecessor reference in singly linked.

| Technique | Time | Space |
|---|---|---|
| Reversal (iterative) | O(n) | O(1) |
| Reversal (recursive) | O(n) | O(n) stack |
| Cycle detection (Floyd's) | O(n) | O(1) |
| Find middle (fast/slow) | O(n) | O(1) |
| Merge two sorted lists | O(n + m) | O(1) |
| Merge K sorted lists (heap) | O(N log k) | O(k) |
| Sort list (merge sort) | O(n log n) | O(log n) stack |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Reverse a linked list" | Three-pointer iterative reversal (prev, curr, nextNode) | Iterative Reversal |
| "Find the middle node" | Fast/slow pointers — slow moves 1x, fast moves 2x | Fast/Slow |
| "Detect a cycle" | Floyd's algorithm — fast and slow will meet if cycle exists | Fast/Slow |
| "Find where the cycle starts" | Floyd's phase 2 — reset one pointer to head, both move at speed 1 | Fast/Slow |
| "Merge two sorted lists" | Dummy head + comparison loop, attach remaining | Dummy Head Merge |
| "Remove Nth from end" | Two pointers with N-node gap | Gap Technique |
| "Check if palindrome" | Find middle, reverse second half, compare, optionally restore | Split + Reverse + Compare |
| "Reorder list (L0, Ln, L1, Ln-1...)" | Find middle, reverse second half, merge alternating | Split + Reverse + Merge |
| "LRU Cache / O(1) eviction ordering" | Doubly linked list + hash map for O(1) access and reorder | Design |
| "Add two numbers represented as lists" | Traverse both with carry, handle unequal lengths | Carry Arithmetic |

---

## Worked Example: Reverse a Linked List

**Problem:** Given the head of a singly linked list, reverse it and return the new head.

**Input:** `1 -> 2 -> 3 -> 4 -> 5 -> None`
**Output:** `5 -> 4 -> 3 -> 2 -> 1 -> None`

### Why not brute force?

A naive approach might copy all values into an array, reverse the array, and rebuild the list — O(n) time but O(n) space. The interviewer expects an in-place solution using O(1) extra space. The trick is that you do not need to create new nodes or store values externally. You simply redirect each node's `next` pointer to point backward instead of forward. The challenge is doing this without losing your reference to the rest of the list, which is why you need three pointers.

:::tip Key Insight
At each step, you are doing exactly one thing: making the current node point backward instead of forward. The three pointers exist solely to prevent you from losing your place in the list while you do this.
:::

### Step-by-Step Trace

We maintain three pointers: `prev`, `curr`, `next_node`.

**Initial state:**

```
prev = None
curr = 1

None    1 -> 2 -> 3 -> 4 -> 5 -> None
 ^      ^
prev   curr
```

**Step 1:** Save `next_node = curr.next` (2). Set `curr.next = prev` (None). Advance `prev = curr`, `curr = next_node`.

```
None <- 1    2 -> 3 -> 4 -> 5 -> None
        ^    ^
       prev curr
```

**Step 2:** Save `next_node = 3`. Set `curr.next = prev` (1). Advance.

```
None <- 1 <- 2    3 -> 4 -> 5 -> None
             ^    ^
            prev curr
```

**Step 3:** Save `next_node = 4`. Set `curr.next = prev` (2). Advance.

```
None <- 1 <- 2 <- 3    4 -> 5 -> None
                  ^    ^
                 prev curr
```

**Step 4:** Save `next_node = 5`. Set `curr.next = prev` (3). Advance.

```
None <- 1 <- 2 <- 3 <- 4    5 -> None
                       ^    ^
                      prev curr
```

**Step 5:** Save `next_node = None`. Set `curr.next = prev` (4). Advance.

```
None <- 1 <- 2 <- 3 <- 4 <- 5    None
                            ^      ^
                           prev   curr
```

`curr` is now `None` — loop ends. Return `prev` (node 5), which is the new head.

**Final result:** `5 -> 4 -> 3 -> 2 -> 1 -> None` ✓

### Key Observations

- We never allocate new nodes — purely pointer manipulation
- The three-pointer pattern prevents losing references
- Works for empty lists and single-node lists (zero iterations)

### Interactive Animation

<AlgoViz
  title="Reverse Linked List — Iterative Approach"
  description="Watch the three pointers (prev, curr, nextNode) reverse the list step by step"
  steps={[
    {
      array: [1, 2, 3, 4, 5],
      highlights: [0],
      pointers: { 0: "curr" },
      variables: { prev: "null", curr: 1, nextNode: 2 },
      explanation: "Initial: prev=null, curr=1. Save nextNode=2. Set curr.next=prev (null). Advance prev=1, curr=2.",
      code: "curr.next = prev; prev = curr; curr = nextNode;"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [1],
      secondary: [0],
      pointers: { 0: "prev", 1: "curr" },
      variables: { prev: 1, curr: 2, nextNode: 3 },
      explanation: "prev=1, curr=2. Save nextNode=3. Set curr.next=prev (1). Advance prev=2, curr=3.",
      code: "curr.next = prev; prev = curr; curr = nextNode;"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [2],
      secondary: [1],
      pointers: { 1: "prev", 2: "curr" },
      variables: { prev: 2, curr: 3, nextNode: 4 },
      explanation: "prev=2, curr=3. Save nextNode=4. Set curr.next=prev (2). Advance prev=3, curr=4.",
      code: "curr.next = prev; prev = curr; curr = nextNode;"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [3],
      secondary: [2],
      pointers: { 2: "prev", 3: "curr" },
      variables: { prev: 3, curr: 4, nextNode: 5 },
      explanation: "prev=3, curr=4. Save nextNode=5. Set curr.next=prev (3). Advance prev=4, curr=5.",
      code: "curr.next = prev; prev = curr; curr = nextNode;"
    },
    {
      array: [1, 2, 3, 4, 5],
      highlights: [4],
      secondary: [3],
      pointers: { 3: "prev", 4: "curr" },
      variables: { prev: 4, curr: 5, nextNode: "null" },
      explanation: "prev=4, curr=5. Save nextNode=null. Set curr.next=prev (4). Advance prev=5, curr=null. Loop ends.",
      code: "return prev; // new head is node 5"
    },
    {
      array: [5, 4, 3, 2, 1],
      highlights: [0],
      pointers: { 0: "head" },
      variables: { result: "5 -> 4 -> 3 -> 2 -> 1 -> null" },
      explanation: "Done! The list is reversed. Return prev (node 5) as the new head.",
      code: "return prev;"
    }
  ]}
/>

---

## Practice Problems

### Day 1–2: Foundations (Easy)

| # | Problem | Difficulty | Pattern | Star | LeetCode |
|---|---|---|---|---|---|
| 1 | Reverse Linked List | Easy | Iterative / recursive | ⭐ | [LC 206](https://leetcode.com/problems/reverse-linked-list/) |
| 2 | Merge Two Sorted Lists | Easy | Dummy head | ⭐ | [LC 21](https://leetcode.com/problems/merge-two-sorted-lists/) |
| 3 | Linked List Cycle | Easy | Fast/slow pointer | ⭐ | [LC 141](https://leetcode.com/problems/linked-list-cycle/) |
| 4 | Palindrome Linked List | Easy | Fast/slow + reverse | | [LC 234](https://leetcode.com/problems/palindrome-linked-list/) |
| 5 | Remove Duplicates from Sorted List | Easy | Pointer skip | | [LC 83](https://leetcode.com/problems/remove-duplicates-from-sorted-list/) |
| 6 | Intersection of Two Linked Lists | Easy | Two pointer alignment | | [LC 160](https://leetcode.com/problems/intersection-of-two-linked-lists/) |
| 7 | Middle of the Linked List | Easy | Fast/slow | | [LC 876](https://leetcode.com/problems/middle-of-the-linked-list/) |

**Day 1–2 Goals:**
- Master the three-pointer reversal until you can write it without thinking
- Understand why dummy heads eliminate edge cases
- Build intuition for fast/slow pointer movement

### Day 3–4: Intermediate Techniques (Medium)

| # | Problem | Difficulty | Pattern | Star | LeetCode |
|---|---|---|---|---|---|
| 8 | Remove Nth Node From End of List | Medium | Two pointers gap | ⭐ | [LC 19](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) |
| 9 | Add Two Numbers | Medium | Carry arithmetic | ⭐ | [LC 2](https://leetcode.com/problems/add-two-numbers/) |
| 10 | Linked List Cycle II | Medium | Floyd's algorithm | ⭐ | [LC 142](https://leetcode.com/problems/linked-list-cycle-ii/) |
| 11 | Reorder List | Medium | Split + reverse + merge | ⭐ | [LC 143](https://leetcode.com/problems/reorder-list/) |
| 12 | Swap Nodes in Pairs | Medium | Pointer manipulation | | [LC 24](https://leetcode.com/problems/swap-nodes-in-pairs/) |
| 13 | Copy List with Random Pointer | Medium | Hash map or interleave | | [LC 138](https://leetcode.com/problems/copy-list-with-random-pointer/) |
| 14 | Rotate List | Medium | Circular list | | [LC 61](https://leetcode.com/problems/rotate-list/) |

**Day 3–4 Goals:**
- Combine multiple techniques in a single problem (Reorder List = find middle + reverse + merge)
- Understand Floyd's cycle detection proof: why moving both pointers at speed 1 finds the entrance
- Practice carry propagation for addition problems

### Day 5–7: Advanced & Hard (Medium/Hard)

| # | Problem | Difficulty | Pattern | Star | LeetCode |
|---|---|---|---|---|---|
| 15 | Sort List | Medium | Merge sort on list | ⭐ | [LC 148](https://leetcode.com/problems/sort-list/) |
| 16 | LRU Cache | Medium | Hash map + doubly linked list | ⭐ | [LC 146](https://leetcode.com/problems/lru-cache/) |
| 17 | Flatten a Multilevel Doubly Linked List | Medium | DFS | | [LC 430](https://leetcode.com/problems/flatten-a-multilevel-doubly-linked-list/) |
| 18 | Reverse Nodes in k-Group | Hard | Group reversal | ⭐ | [LC 25](https://leetcode.com/problems/reverse-nodes-in-k-group/) |
| 19 | Merge K Sorted Lists | Hard | Heap + merge | ⭐ | [LC 23](https://leetcode.com/problems/merge-k-sorted-lists/) |
| 20 | Remove Duplicates from Sorted List II | Medium | Predecessor pointer | | [LC 82](https://leetcode.com/problems/remove-duplicates-from-sorted-list-ii/) |
| 21 | Odd Even Linked List | Medium | Partition by position | | [LC 328](https://leetcode.com/problems/odd-even-linked-list/) |

**Day 5–7 Goals:**
- LRU Cache is one of the most-asked interview problems — understand why doubly linked list + hash map gives O(1) for all operations
- Merge sort on linked lists is more natural than on arrays (no extra space for merging)
- k-Group reversal tests your mastery of the basic reversal template

---

## Mock Interviews

### Mock Interview 1: List Manipulation

**Opening Problem:** *Reverse a linked list.* (LC 206)

Write the iterative solution. Analyze time and space complexity.

**Follow-up 1:** *Now write it recursively. What's the space complexity and why?*

Expected: O(n) space due to recursion stack. Each recursive call adds a frame until we reach the base case.

**Follow-up 2:** *Reverse only the sublist from position `left` to position `right`.* (LC 92 — Reverse Linked List II)

Expected approach: traverse to position `left - 1`, then apply the reversal template for `right - left + 1` nodes, reconnect the three segments.

**Follow-up 3:** *Now reverse the list in groups of k. If the remaining nodes are fewer than k, leave them as-is.* (LC 25 — Reverse Nodes in k-Group)

Expected approach: count k nodes ahead, reverse the group, recurse/iterate on the remainder. Handle the case where fewer than k nodes remain by returning them unchanged.

**Follow-up 4:** *What if we want to reverse in groups of k but reverse the last partial group too?*

Variation: remove the "fewer than k" check. Simpler code but different behavior.

**Evaluation Criteria:**
- Clean pointer manipulation without off-by-one errors
- Handles edge cases: empty list, single node, k = 1, k = list length
- Explains trade-offs between iterative and recursive approaches

### Mock Interview 2: Design Problem

**Opening Problem:** *Design an LRU Cache with `get(key)` and `put(key, value)` in O(1).* (LC 146)

Expected: hash map for O(1) lookup + doubly linked list for O(1) eviction order. The most recently used item moves to the front; eviction removes from the tail.

**Follow-up 1:** *Walk me through what happens when we call `put` with a key that already exists.*

Expected: update the value, move the node to the front of the list (remove from current position, insert at head). No eviction needed.

**Follow-up 2:** *What if we need to support a TTL (time-to-live) for each entry? Expired entries should be evicted before non-expired ones.*

Expected discussion: add a timestamp field, check expiry on `get`, and either lazily remove expired entries or use a separate cleanup mechanism.

**Follow-up 3:** *How would you make this thread-safe?*

Expected discussion: lock granularity (global lock vs. striped locks), read-write locks for `get` vs. `put`, or lock-free approaches using CAS operations.

**Follow-up 4:** *Estimate memory usage for 10 million entries where keys are 32-byte strings and values are 256-byte strings.*

Expected: per entry ≈ 32 (key) + 256 (value) + 2×8 (prev/next pointers) + 8 (hash map pointer) + overhead ≈ ~350–400 bytes. Total ≈ 3.5–4 GB. Discuss whether this fits in memory and alternatives (sharding, disk-backed).

**Evaluation Criteria:**
- Correct O(1) data structure choice and implementation
- Clean doubly linked list operations (no dangling pointers)
- Thoughtful discussion of real-world considerations

---

## Tips & Edge Cases

### Common Edge Cases to Always Test

- **Empty list:** `head = null` — most operations should return `null`
- **Single node:** `head.next = null` — reversal returns the same node
- **Two nodes:** the minimum case where pointer manipulation actually does something
- **Cycle present:** any traversal without cycle detection will infinite-loop
- **Even vs. odd length:** fast/slow pointer lands differently; be precise about which "middle" you want

### Common Mistakes

1. **Losing the next pointer during reversal.** Always save `next_node = curr.next` before modifying `curr.next`.

2. **Forgetting to update `head`.** After reversal, the old head is now the tail. Return `prev`, not `head`.

3. **Off-by-one with dummy nodes.** Return `dummy.next`, not `dummy`.

4. **Not handling the cycle in `fast.next.next`.** The `while` condition must check **both** `fast != null` and `fast.next != null` to avoid a `NullPointerException`.

5. **Modifying the list while comparing.** Palindrome check requires reversing the second half — if you need the original list intact afterward, reverse it back.

### Linked List vs. Array — When to Choose

| Factor | Choose Linked List | Choose Array |
|---|---|---|
| Frequent insert/delete at arbitrary positions | ✓ | |
| Need random access by index | | ✓ |
| Unknown size, highly dynamic | ✓ | |
| Cache performance matters | | ✓ (contiguous memory) |
| Need O(1) delete given a reference | ✓ (doubly linked) | |

### Pattern Recognition Cheat Sheet

| If the problem says... | Think... |
|---|---|
| "Reverse" anything | Three-pointer iterative reversal |
| "Middle" or "split in half" | Fast/slow pointer |
| "Cycle" or "loop" | Floyd's algorithm |
| "Nth from end" | Two pointers with N-gap |
| "Merge sorted" | Dummy head + comparison |
| "Remove" or "delete" | Dummy head + predecessor tracking |
| "Reorder" or "rearrange" | Split + reverse + merge |
| "O(1) access + ordering" | Hash map + doubly linked list |

### Interview Tips

- **Draw it out.** Linked list problems are visual. Sketch nodes and arrows before coding.
- **Name your pointers clearly.** `prev`, `curr`, `next_node` — not `a`, `b`, `c`.
- **State your loop invariant.** "At the start of each iteration, all nodes before `curr` have been reversed."
- **Test with length 0, 1, 2.** These catch almost all pointer bugs.
- **Don't allocate new nodes unless required.** Most linked list problems expect in-place solutions.
