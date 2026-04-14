# Chapter 2 — Linked Lists

> Linked lists are the interviewer's favorite data structure for testing pointer manipulation, edge-case handling, and recursive thinking. Unlike arrays, they offer O(1) insertions and deletions at known positions — but sacrifice random access.

---

## The Node Class

A linked list is a chain of nodes, each holding data and a reference to the next node.

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ data: 3  │    │ data: 7  │    │ data: 1  │    │ data: 9  │
│ next: ───┼───▶│ next: ───┼───▶│ next: ───┼───▶│ next:null│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     ▲
     │
    head
```

### Singly Linked List

```java
class Node {
    int data;
    Node next;

    Node(int data) {
        this.data = data;
    }
}

class LinkedList {
    Node head;

    void append(int data) {
        if (head == null) {
            head = new Node(data);
            return;
        }
        Node current = head;
        while (current.next != null) {
            current = current.next;
        }
        current.next = new Node(data);
    }

    void prepend(int data) {
        Node newHead = new Node(data);
        newHead.next = head;
        head = newHead;
    }
}
```

### Doubly Linked List

```
         ┌──────────┐    ┌──────────┐    ┌──────────┐
null ◀───┤ data: 3  │◀──▶│ data: 7  │◀──▶│ data: 1  ├───▶ null
         │ prev/next│    │ prev/next│    │ prev/next│
         └──────────┘    └──────────┘    └──────────┘
              ▲                                ▲
             head                             tail
```

```java
class DNode {
    int data;
    DNode prev, next;

    DNode(int data) {
        this.data = data;
    }
}
```

> Use doubly linked lists when you need O(1) deletion given a node reference, or need to traverse backward. The trade-off is extra memory for the `prev` pointer.

---

## Deleting a Node

### Delete by Value

```java
Node delete(Node head, int data) {
    if (head == null) return null;
    if (head.data == data) return head.next;

    Node current = head;
    while (current.next != null) {
        if (current.next.data == data) {
            current.next = current.next.next;
            return head;
        }
        current = current.next;
    }
    return head;
}
```

### Delete a Middle Node (Given Only Access to That Node)

Copy the next node's data into the current node, then skip the next node:

```java
void deleteMiddleNode(Node node) {
    node.data = node.next.data;
    node.next = node.next.next;
}
```

> This trick doesn't work for the last node. In an interview, clarify whether this edge case matters.

---

## The Runner (Fast/Slow Pointer) Technique

Use two pointers moving at different speeds through the list. This is one of the most powerful linked list patterns.

### Finding the Middle

```java
Node findMiddle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;  // middle node
}
```

```
Step 0:  [1] → [2] → [3] → [4] → [5] → null
          S                   
          F

Step 1:  [1] → [2] → [3] → [4] → [5] → null
                S
                      F

Step 2:  [1] → [2] → [3] → [4] → [5] → null
                       S
                                   F
         slow is at middle (node 3)
```

### Weaving Pattern

Interleave the first half with the reversed second half:

```
Input:   a1 → a2 → a3 → b1 → b2 → b3
Output:  a1 → b1 → a2 → b2 → a3 → b3
```

1. Use runner to find the middle
2. Reverse the second half
3. Merge alternately

---

## Recursive Linked List Problems

Many linked list problems have elegant recursive solutions, but remember:

| Aspect | Iterative | Recursive |
|--------|-----------|-----------|
| Space | O(1) | O(N) stack frames |
| Readability | Can be complex | Often cleaner |
| Stack overflow risk | None | Yes, for large lists |
| Interview preference | Varies | Show both if time |

### Reverse a Linked List (Both Ways)

**Iterative:**

```java
Node reverse(Node head) {
    Node prev = null, current = head;
    while (current != null) {
        Node next = current.next;
        current.next = prev;
        prev = current;
        current = next;
    }
    return prev;
}
```

```
Step by step:
  null ← [1]   [2] → [3] → [4] → null
          prev  curr

  null ← [1] ← [2]   [3] → [4] → null
                 prev  curr

  null ← [1] ← [2] ← [3]   [4] → null
                        prev  curr

  null ← [1] ← [2] ← [3] ← [4]
                               prev (new head)
```

**Recursive:**

```java
Node reverseRecursive(Node head) {
    if (head == null || head.next == null) return head;
    Node newHead = reverseRecursive(head.next);
    head.next.next = head;
    head.next = null;
    return newHead;
}
```

---

## Complexity Table

| Operation | Singly Linked | Doubly Linked |
|-----------|---------------|---------------|
| Access by index | O(N) | O(N) |
| Search | O(N) | O(N) |
| Insert at head | O(1) | O(1) |
| Insert at tail | O(N)* | O(1)** |
| Insert after node | O(1) | O(1) |
| Delete head | O(1) | O(1) |
| Delete given node | O(N)*** | O(1) |
| Delete tail | O(N) | O(1)** |

*O(1) if you maintain a tail pointer  
**Assumes tail pointer  
***O(1) with the copy trick, but not for last node

---

## Floyd's Cycle Detection Algorithm

Detect if a linked list has a cycle and find the cycle start.

### Detection

```java
boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

### Finding the Cycle Start

When slow and fast meet inside the cycle, move one pointer back to head. Advance both one step at a time — they'll meet at the cycle start.

```java
Node findCycleStart(Node head) {
    Node slow = head, fast = head;

    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) break;
    }

    if (fast == null || fast.next == null) return null;

    slow = head;
    while (slow != fast) {
        slow = slow.next;
        fast = fast.next;
    }
    return slow;
}
```

### Why It Works

```
    ┌───── k ─────┐
    │              │
  head ──→ ··· ──→ cycle_start ──→ ··· ──→ meeting_point
                        │                        │
                        └──────── loop_len ──────┘

Let k = distance from head to cycle start
Let m = distance from cycle start to meeting point
Let L = loop length

When they meet:
  slow traveled: k + m
  fast traveled: k + m + nL  (n complete loops)
  fast = 2 × slow → k + m + nL = 2(k + m) → k = nL - m

So moving k steps from meeting_point lands exactly at cycle_start.
```

---

## Sentinel (Dummy) Nodes

A sentinel node simplifies edge cases by ensuring `head` is never null.

```java
Node dummy = new Node(0);
dummy.next = head;
Node current = dummy;

// Process list...

return dummy.next;  // real head
```

> Use sentinel nodes when the head might change (deletions, insertions at front). It eliminates special-case code for empty lists and head modifications.

---

## Advanced: XOR Linked List

A memory-efficient doubly linked list where each node stores `prev XOR next` instead of two separate pointers.

```
addr(A) = 0x100,  addr(B) = 0x200,  addr(C) = 0x300

Node A: npx = 0 XOR 0x200      = 0x200
Node B: npx = 0x100 XOR 0x300  = 0x200  (different meaning!)
Node C: npx = 0x200 XOR 0      = 0x200

To traverse forward from B knowing prev=A:
  next = npx(B) XOR addr(A) = 0x200 XOR 0x100 = 0x300 = C ✓
```

> XOR linked lists are a theoretical curiosity — rarely used in practice due to garbage collection incompatibility and debugging difficulty. Know the concept for interviews.

---

## Skip List (Concept)

A probabilistic data structure that layers multiple sorted linked lists to achieve O(log N) search.

```
Level 3: head ─────────────────────────────→ 9 ─────→ null
Level 2: head ────────→ 3 ─────────────────→ 9 ─────→ null
Level 1: head → 1 ───→ 3 ───→ 5 ──→ 7 ───→ 9 ─────→ null
Level 0: head → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → null
```

| Operation | Average | Worst |
|-----------|---------|-------|
| Search | O(log N) | O(N) |
| Insert | O(log N) | O(N) |
| Delete | O(log N) | O(N) |

> Skip lists are used in Redis sorted sets and LevelDB/RocksDB memtables. They're simpler to implement than balanced BSTs with similar performance.

---

## Interview Questions Overview

### 2.1 — Remove Dups

> Remove duplicates from an unsorted linked list. Follow up: no extra buffer allowed.

- **Hash Set:** Track seen values, remove duplicates → O(N) time, O(N) space
- **No buffer:** For each node, check all subsequent nodes → O(N²) time, O(1) space

### 2.2 — Return Kth to Last

> Find the kth to last element in a singly linked list.

- **Two pointers:** Place first pointer k nodes ahead, then move both until first hits end → O(N)
- **Recursive:** Recurse to end, count back on unwinding → O(N) time, O(N) space

### 2.3 — Delete Middle Node

> Delete a node from the middle of a singly linked list, given only access to that node.

Copy-and-skip trick described above. Fails for the last node.

### 2.4 — Partition

> Partition a linked list around a value x such that all nodes < x come before all nodes ≥ x.

Create two lists (before and after), then merge them.

### 2.5 — Sum Lists

> Two numbers stored as linked lists in reverse order. Add them and return as a linked list.

```
(7 → 1 → 6) + (5 → 9 → 2) = 617 + 295 = 912 → (2 → 1 → 9)
```

Walk both lists simultaneously, carry the overflow. Follow-up: numbers stored in forward order (use recursion or reverse first).

### 2.6 — Palindrome

> Check if a linked list is a palindrome.

- **Reverse and compare** the first half
- **Stack approach:** Push first half onto stack, compare with second half
- **Recursive:** Compare from outside in

### 2.7 — Intersection

> Determine if two singly linked lists intersect (share the same tail nodes by reference, not value).

1. Get lengths of both lists
2. Advance the longer list's pointer by the difference
3. Walk together until pointers match

### 2.8 — Loop Detection

> Detect a cycle and find the loop start node. See Floyd's algorithm above.

---

## Key Takeaways

1. **Always handle edge cases:** empty list, single node, operation on head/tail
2. **Draw it out** — pointer manipulation is error-prone; diagrams prevent bugs
3. **Runner technique** solves many problems elegantly: middle finding, cycle detection, reordering
4. **Sentinel nodes** simplify code by eliminating null checks for head
5. **Recursive solutions** are elegant but cost O(N) stack space — mention this trade-off
6. **Know Floyd's algorithm** — it's asked directly or used as a building block in many problems
7. **When in doubt, use two pointers** — most linked list problems can be solved with some variant of this
