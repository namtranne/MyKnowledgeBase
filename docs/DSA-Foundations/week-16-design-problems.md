---
sidebar_position: 17
title: "Week 16: Design Problems"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 16: Design Problems

Design problems test your ability to combine multiple data structures, apply OOP principles, and build components that satisfy specific time/space constraints. They are among the most frequently asked questions at top-tier companies because they reveal how you think about trade-offs, API contracts, and edge cases.

---

## Core Theory

### Why Design Problems Exist

Design problems test a fundamentally different skill than algorithm problems. While algorithm questions test whether you can derive an efficient solution, design questions test whether you can **compose multiple data structures** into a cohesive system that meets specific performance contracts. They reveal how you think about API design, trade-offs between time and space, and handling edge cases that arise in real systems.

**Intuition.** Think of design problems as building with LEGO bricks. You already know the individual bricks (HashMap, LinkedList, Heap, Trie). The challenge is combining them to satisfy constraints that no single brick can meet alone. An LRU Cache needs both O(1) lookup (HashMap) and O(1) ordering (Doubly Linked List) — neither alone suffices, but together they are exactly right.

**Interview signals.** "Design a data structure that supports X in O(1)." "Implement a cache with eviction policy." "Design a class with these methods and these complexity requirements." Any time the problem gives you a set of operations with target complexities and asks you to build it, you are in design territory.

**Common mistakes.** Over-engineering before clarifying the API. Forgetting to handle the "update existing key" case (in caches). Not using sentinel nodes in linked-list-based designs, leading to verbose null-checking code. Confusing amortized O(1) with worst-case O(1).

### OOP Design for Interviews

Interview design questions rarely ask for full-blown UML diagrams. Instead, they test whether you can:

- **Identify the right abstraction** — what classes or structs are needed?
- **Define a clean API** — what methods does the caller need?
- **Choose internal data structures** that meet the stated complexity requirements.
- **Handle edge cases** — empty state, capacity limits, duplicate keys, concurrent access.

A good approach:

1. Clarify the API — inputs, outputs, constraints.
2. Walk through a concrete example before coding.
3. Pick the simplest combination of data structures that meets the complexity target.
4. Code incrementally, testing each method mentally as you go.

### Choosing the Right Data Structure

| Need | Data Structure | Why |
|------|---------------|-----|
| O(1) lookup by key | Hash Map (HashMap) | Average O(1) get/set |
| O(1) insert at both ends | Doubly Linked List / ArrayDeque | Pointer manipulation |
| O(1) min/max tracking | Monotonic Stack or auxiliary stack | Pair with main structure |
| O(log n) ordered operations | Balanced BST / SortedList | Maintains sorted order |
| O(1) random access + O(1) random delete | Array + Hash Map (swap-to-end trick) | Index-based access |
| Prefix-based search | Trie | Character-by-character traversal |
| FIFO semantics | Queue / Deque | First-in-first-out |
| Priority ordering | Heap (PriorityQueue) | O(log n) push/pop |

### Hash Map + Doubly Linked List — the LRU Pattern

An **LRU (Least Recently Used) Cache** evicts the item that was accessed longest ago when capacity is exceeded.

**Key insight:** You need two things simultaneously:

1. **O(1) lookup by key** — hash map.
2. **O(1) eviction of the oldest item + O(1) promotion of a just-used item** — doubly linked list with head (most recent) and tail (least recent).

The hash map stores `key -> node_reference`. When you access a key, you unlink the node from its current position and move it to the head. When you evict, you remove the tail node and delete its key from the map.

Java's `LinkedHashMap` wraps this pattern: it is a HashMap that remembers insertion order (or access order when constructed with `accessOrder=true`) and supports O(1) access-order promotion.

### Frequency Bucketing — the LFU Pattern

An **LFU (Least Frequently Used) Cache** evicts the item with the lowest access count. Ties are broken by LRU order among items with the same frequency.

**Data structures needed:**

- `key_to_val`: maps key to value.
- `key_to_freq`: maps key to its current frequency.
- `freqToKeys`: maps frequency to a `LinkedHashSet` of keys at that frequency (preserving insertion order for tie-breaking).
- `min_freq`: tracks the current minimum frequency for O(1) eviction.

On `get(key)`: increment the key's frequency, move it from `freq_to_keys[old_freq]` to `freq_to_keys[new_freq]`. If `freq_to_keys[min_freq]` is now empty and `old_freq == min_freq`, increment `min_freq`.

On `put(key, value)`: if at capacity, evict the oldest key from `freq_to_keys[min_freq]`. Insert the new key with frequency 1, set `min_freq = 1`.

### Iterator Design Patterns

Many design problems ask you to implement an **iterator** — an object with `next()` and `hasNext()` methods. Common patterns:

- **Pre-flattening:** Flatten the entire structure in the constructor, then iterate over a simple list. Simple but uses O(n) space upfront.
- **Lazy evaluation with a stack:** Use a stack to process elements on demand. `hasNext()` ensures the stack has a ready element; `next()` pops it. More memory-efficient for deeply nested structures.
- **Peeking wrapper:** Wraps an existing iterator and caches the next value so `peek()` can return it without advancing.

### Serialization / Deserialization Strategies

Converting a data structure to a string (serialize) and back (deserialize) appears in tree problems, but the concept generalizes:

- **Pre-order with null markers:** For binary trees, record each node's value and use a sentinel (e.g., `"#"`) for null children. Deserialize by reading tokens in the same order and recursively building the tree.
- **Level-order (BFS):** Serialize level by level, including nulls. Deserialize with a queue.
- **Delimiter-based encoding:** For lists of strings, use a length-prefix format like `"4:abcd3:xyz"` to avoid delimiter collisions.

### Amortized Analysis

Some operations are expensive occasionally but cheap most of the time. **Amortized analysis** averages the cost over a sequence of operations:

- **Dynamic array doubling:** A single resize costs O(n), but over n insertions the total cost is O(n), so each insertion is O(1) amortized.
- **Two-stack queue:** Transferring all elements from the input stack to the output stack costs O(n), but each element is transferred at most once, giving O(1) amortized per dequeue.
- **Frequency stack pop:** Maintaining frequency buckets adds bookkeeping, but each push/pop remains O(1) amortized.

---

## Code Templates

### LRU Cache with LinkedHashMap

```java
import java.util.*;

class LRUCache extends LinkedHashMap<Integer, Integer> {
    private int capacity;

    public LRUCache(int capacity) {
        super(capacity, 0.75f, true); // accessOrder = true
        this.capacity = capacity;
    }

    public int get(int key) {
        return super.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        super.put(key, value);
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }
}
```

### LRU Cache — Interactive Visualization

<AlgoViz
  title="LRU Cache Operations"
  description="Visualize put and get operations on an LRU Cache with capacity=2. The hashMap shows cache entries; variables track the linked list order from most recent to least recent."
  steps={[
    { hashMap: {"(empty)": ""}, variables: { capacity: 2, order: "HEAD - TAIL", op: "init" }, explanation: "Initialize LRU Cache with capacity 2. HashMap is empty, linked list has only sentinel nodes.", code: "LRUCache cache = new LRUCache(2);" },
    { hashMap: {"1": "A"}, variables: { capacity: 2, order: "HEAD-(1,A)-TAIL", op: "put(1,A)", size: 1 }, explanation: "put(1,A): Key 1 not in cache. Create node, add to front of list, insert into map. Size is 1.", code: "cache.put(1, \"A\");" },
    { hashMap: {"1": "A", "2": "B"}, variables: { capacity: 2, order: "HEAD-(2,B)-(1,A)-TAIL", op: "put(2,B)", size: 2 }, explanation: "put(2,B): Key 2 not in cache. Add to front. Cache is now full (size = capacity = 2).", code: "cache.put(2, \"B\");" },
    { hashMap: {"1": "A", "2": "B"}, variables: { capacity: 2, order: "HEAD-(1,A)-(2,B)-TAIL", op: "get(1)=A", size: 2 }, explanation: "get(1) returns A: Key 1 found in map. Move node to front. Key 2 is now least recently used.", code: "cache.get(1); // returns \"A\"" },
    { hashMap: {"1": "A", "3": "C"}, variables: { capacity: 2, order: "HEAD-(3,C)-(1,A)-TAIL", op: "put(3,C)", evicted: "key 2", size: 2 }, explanation: "put(3,C): Cache full. Evict least recent (key 2) from tail. Insert key 3 at front.", code: "cache.put(3, \"C\"); // evicts key 2" },
    { hashMap: {"1": "A", "3": "C"}, variables: { capacity: 2, order: "HEAD-(3,C)-(1,A)-TAIL", op: "get(2)=-1", result: -1 }, explanation: "get(2) returns -1: Key 2 was evicted. Not found in the hashMap.", code: "cache.get(2); // returns -1" },
  ]}
/>

### LRU Cache from Scratch (Doubly Linked List + HashMap)

```java
import java.util.*;

class Node {
    int key, val;
    Node prev, next;
    Node() {}
    Node(int key, int val) { this.key = key; this.val = val; }
}

class LRUCache {
    private int cap;
    private Map<Integer, Node> map = new HashMap<>();
    private Node head = new Node(), tail = new Node();

    public LRUCache(int capacity) {
        this.cap = capacity;
        head.next = tail;
        tail.prev = head;
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        remove(node);
        addToFront(node);
        return node.val;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) remove(map.get(key));
        Node node = new Node(key, value);
        map.put(key, node);
        addToFront(node);
        if (map.size() > cap) {
            Node lru = tail.prev;
            remove(lru);
            map.remove(lru.key);
        }
    }
}
```

### LFU Cache Skeleton

```java
import java.util.*;

class LFUCache {
    private int cap, minFreq;
    private Map<Integer, Integer> keyToVal = new HashMap<>();
    private Map<Integer, Integer> keyToFreq = new HashMap<>();
    private Map<Integer, LinkedHashSet<Integer>> freqToKeys = new HashMap<>();

    public LFUCache(int capacity) {
        this.cap = capacity;
    }

    private void updateFreq(int key) {
        int freq = keyToFreq.get(key);
        freqToKeys.get(freq).remove(key);
        if (freqToKeys.get(freq).isEmpty()) {
            freqToKeys.remove(freq);
            if (minFreq == freq) minFreq++;
        }
        keyToFreq.put(key, freq + 1);
        freqToKeys.computeIfAbsent(freq + 1, k -> new LinkedHashSet<>()).add(key);
    }

    public int get(int key) {
        if (!keyToVal.containsKey(key)) return -1;
        updateFreq(key);
        return keyToVal.get(key);
    }

    public void put(int key, int value) {
        if (cap <= 0) return;
        if (keyToVal.containsKey(key)) {
            keyToVal.put(key, value);
            updateFreq(key);
            return;
        }
        if (keyToVal.size() >= cap) {
            int evictKey = freqToKeys.get(minFreq).iterator().next();
            freqToKeys.get(minFreq).remove(evictKey);
            if (freqToKeys.get(minFreq).isEmpty()) freqToKeys.remove(minFreq);
            keyToVal.remove(evictKey);
            keyToFreq.remove(evictKey);
        }
        keyToVal.put(key, value);
        keyToFreq.put(key, 1);
        freqToKeys.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }
}
```

### Iterator Pattern (Flatten Nested List)

```java
import java.util.*;

public class NestedIterator implements Iterator<Integer> {
    private Deque<NestedInteger> stack = new ArrayDeque<>();

    public NestedIterator(List<NestedInteger> nestedList) {
        for (int i = nestedList.size() - 1; i >= 0; i--)
            stack.push(nestedList.get(i));
    }

    @Override
    public Integer next() {
        flattenTop();
        return stack.pop().getInteger();
    }

    @Override
    public boolean hasNext() {
        flattenTop();
        return !stack.isEmpty();
    }

    private void flattenTop() {
        while (!stack.isEmpty() && !stack.peek().isInteger()) {
            List<NestedInteger> list = stack.pop().getList();
            for (int i = list.size() - 1; i >= 0; i--)
                stack.push(list.get(i));
        }
    }
}
```

### Simple Serialization (Binary Tree)

```java
import java.util.*;

public class Codec {
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        dfsSerialize(root, sb);
        return sb.toString();
    }

    private void dfsSerialize(TreeNode node, StringBuilder sb) {
        if (node == null) { sb.append("#,"); return; }
        sb.append(node.val).append(",");
        dfsSerialize(node.left, sb);
        dfsSerialize(node.right, sb);
    }

    public TreeNode deserialize(String data) {
        Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(",")));
        return dfsDeserialize(tokens);
    }

    private TreeNode dfsDeserialize(Queue<String> tokens) {
        String val = tokens.poll();
        if ("#".equals(val) || val == null) return null;
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = dfsDeserialize(tokens);
        node.right = dfsDeserialize(tokens);
        return node;
    }
}
```

### Implement Queue using Stacks — Visualization

<AlgoViz
  title="Queue using Two Stacks"
  description="Implement a FIFO queue using two stacks (inStack and outStack). Elements are pushed onto inStack and transferred to outStack on demand for dequeue."
  steps={[
    { stack: [], variables: { inStack: "[]", outStack: "[]", op: "init" }, explanation: "Initialize: two empty stacks. inStack receives pushes, outStack serves pops.", code: "Deque inStack = new ArrayDeque(), outStack = new ArrayDeque();" },
    { stack: [1], variables: { inStack: "[1]", outStack: "[]", op: "push(1)" }, explanation: "push(1): Push 1 onto inStack. outStack remains empty.", code: "inStack.push(1);" },
    { stack: [2, 1], variables: { inStack: "[2, 1]", outStack: "[]", op: "push(2)" }, explanation: "push(2): Push 2 onto inStack. Stack grows: top is 2, bottom is 1.", code: "inStack.push(2);" },
    { stack: [3, 2, 1], variables: { inStack: "[3, 2, 1]", outStack: "[]", op: "push(3)" }, explanation: "push(3): Push 3 onto inStack. Three elements now in inStack.", code: "inStack.push(3);" },
    { stack: [1, 2, 3], stackHighlights: [0, 1, 2], variables: { inStack: "[]", outStack: "[1, 2, 3]", op: "transfer" }, explanation: "pop() requested: outStack is empty, so transfer ALL from inStack to outStack. Order reverses, giving FIFO order.", code: "while (!inStack.isEmpty()) outStack.push(inStack.pop());" },
    { stack: [2, 3], variables: { inStack: "[]", outStack: "[2, 3]", op: "pop()=1", result: 1 }, explanation: "pop() returns 1: Pop from outStack top. The first element pushed (1) is the first dequeued — FIFO!", code: "return outStack.pop(); // 1" },
  ]}
/>

### Min Stack — Visualization

<AlgoViz
  title="Min Stack Operations"
  description="Push and pop values while tracking the minimum in O(1). A main stack holds values; a parallel min stack tracks the current minimum at each level."
  steps={[
    { stack: [], variables: { mainStack: "[]", minStack: "[]", op: "init" }, explanation: "Initialize two empty stacks: mainStack for values, minStack for tracking the running minimum.", code: "Deque stack = new ArrayDeque(), minStack = new ArrayDeque();" },
    { stack: [5], variables: { mainStack: "[5]", minStack: "[5]", op: "push(5)", currentMin: 5 }, explanation: "push(5): Push 5 onto both stacks. 5 is the first element, so it is the current min.", code: "stack.push(5); minStack.push(5);" },
    { stack: [3, 5], stackHighlights: [0], variables: { mainStack: "[3, 5]", minStack: "[3, 5]", op: "push(3)", currentMin: 3 }, explanation: "push(3): 3 is less than or equal to current min (5). Push onto both stacks. New min = 3.", code: "stack.push(3); minStack.push(3); // 3 <= 5" },
    { stack: [7, 3, 5], variables: { mainStack: "[7, 3, 5]", minStack: "[3, 5]", op: "push(7)", currentMin: 3 }, explanation: "push(7): 7 is greater than current min (3). Push only onto mainStack. Min stays 3.", code: "stack.push(7); // 7 > 3, minStack unchanged" },
    { stack: [2, 7, 3, 5], stackHighlights: [0], variables: { mainStack: "[2, 7, 3, 5]", minStack: "[2, 3, 5]", op: "push(2)", currentMin: 2 }, explanation: "push(2): 2 is less than or equal to current min (3). Push onto both stacks. getMin() = 2.", code: "stack.push(2); minStack.push(2); // 2 <= 3" },
    { stack: [7, 3, 5], variables: { mainStack: "[7, 3, 5]", minStack: "[3, 5]", op: "pop()=2, getMin()=3", currentMin: 3 }, explanation: "pop() removes 2. Since 2 equals minStack top, pop minStack too. getMin() is now 3.", code: "stack.pop(); // 2 == minStack.peek(), so minStack.pop()" },
    { stack: [3, 5], variables: { mainStack: "[3, 5]", minStack: "[3, 5]", op: "pop()=7, getMin()=3", currentMin: 3 }, explanation: "pop() removes 7. 7 does not equal minStack top (3), so minStack unchanged. getMin() = 3.", code: "stack.pop(); // 7 != 3, minStack unchanged" },
  ]}
/>

### Min Stack

```java
import java.util.*;

class MinStack {
    private Deque<Integer> stack = new ArrayDeque<>();
    private Deque<Integer> minStack = new ArrayDeque<>();

    public void push(int val) {
        stack.push(val);
        if (minStack.isEmpty() || val <= minStack.peek())
            minStack.push(val);
    }

    public void pop() {
        if (stack.pop().equals(minStack.peek()))
            minStack.pop();
    }

    public int top() {
        return stack.peek();
    }

    public int getMin() {
        return minStack.peek();
    }
}
```

---

## Complexity Table

| Problem | Key Operation | Time | Space | Core Technique |
|---------|--------------|------|-------|----------------|
| Min Stack | push / pop / getMin | O(1) | O(n) | Auxiliary min stack |
| LRU Cache | get / put | O(1) | O(capacity) | HashMap + Doubly Linked List |
| LFU Cache | get / put | O(1) | O(capacity) | HashMap + Frequency Buckets |
| Implement Trie | insert / search | O(L) | O(N * L) | Trie node array/map |
| Design HashMap | get / put / remove | O(1) avg | O(n) | Array of buckets + chaining |
| Design HashSet | add / remove / contains | O(1) avg | O(n) | Array of buckets + chaining |
| Queue using Stacks | push / pop (amortized) | O(1) amortized | O(n) | Two-stack transfer |
| Design Linked List | get / addAtIndex / deleteAtIndex | O(n) | O(n) | Sentinel head + tail |
| Insert Delete GetRandom O(1) | insert / remove / getRandom | O(1) | O(n) | Array + HashMap swap trick |
| Serialize/Deserialize BT | serialize / deserialize | O(n) | O(n) | Pre-order DFS + null markers |
| BST Iterator | next / hasNext | O(1) avg | O(h) | Controlled in-order with stack |
| Peeking Iterator | peek / next / hasNext | O(1) | O(1) extra | Cache next element |
| Design Circular Queue | enqueue / dequeue | O(1) | O(k) | Circular array with front/rear |
| Design Browser History | visit / back / forward | O(1) | O(n) | Two stacks or doubly linked list |
| Time Based Key-Value Store | set / get | O(1) / O(log n) | O(n) | HashMap + Binary Search on timestamps |
| Snapshot Array | set / snap / get | O(1) / O(1) / O(log S) | O(n + S) | Per-index list of (snap_id, val) |
| Max Frequency Stack | push / pop | O(1) | O(n) | Frequency map + stack per frequency |
| Design Twitter | postTweet / getNewsFeed | O(1) / O(F log k) | O(n) | HashMap + Heap merge of feeds |
| Flatten Nested List Iterator | next / hasNext | O(1) amortized | O(depth) | Stack-based lazy flattening |
| Add and Search Words | addWord / search | O(L) / O(26^L) worst | O(N * L) | Trie + DFS for wildcards |
| Design In-Memory File System | mkdir / ls / addContent / readContent | O(P) | O(total content) | Trie of directory nodes |

`L` = word length, `N` = number of words, `h` = tree height, `S` = number of snapshots, `F` = number of followees, `k` = feed size, `P` = path depth.

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "get and put in O(1) with LRU eviction" | HashMap plus Doubly Linked List | LRU Cache |
| "evict least frequently used, break ties by LRU" | HashMap plus frequency buckets with LinkedHashSet | LFU Cache |
| "insert, delete, getRandom all in O(1)" | ArrayList plus HashMap with swap-to-end trick | Randomized Set |
| "push, pop, getMin all in O(1)" | Auxiliary min-stack tracking current minimum | Min Stack |
| "implement a prefix tree" | TrieNode with children map and isEnd flag | Trie |
| "search words with wildcard dots" | Trie plus DFS branching on wildcard characters | Add and Search Words |
| "serialize and deserialize a tree" | Pre-order DFS with null markers and delimiter | Codec |
| "implement queue using stacks" | Two stacks with amortized transfer on dequeue | Stack Queue |
| "time-versioned key-value store" | HashMap of key to sorted-timestamp list, binary search on get | Time-Based KV Store |
| "track max frequency and pop most frequent" | Frequency map plus stack per frequency level | Max Frequency Stack |

---

## Worked Example: LRU Cache

**Why not brute force?** A brute-force cache could use an ArrayList: on `get`, scan for the key (O(n)); on eviction, scan for the oldest entry (O(n)). With a HashMap alone, you get O(1) lookup but no way to know which key is oldest. The doubly linked list provides O(1) insertion, deletion, and order maintenance — combined with the HashMap, every operation becomes O(1).

**Key insight:** The HashMap and the linked list store *the same nodes*. The HashMap provides O(1) lookup by key; the linked list provides O(1) reordering by simply unlinking and relinking a node. The sentinel head and tail nodes eliminate all null-checking edge cases in the list operations.

**Problem:** Design a cache with capacity 2 supporting `get(key)` and `put(key, value)`. When the cache is full, evict the least recently used item before inserting a new one.

### Trace

We use the doubly linked list approach. The list order is: `HEAD <-> most_recent <-> ... <-> least_recent <-> TAIL`.

**Initial state:**

```
capacity = 2
map = (empty)
list: HEAD <-> TAIL
```

---

**Step 1: `put(1, 10)`**

Key 1 is not in the map. Create node `(1, 10)`, add to front, insert into map.

```
map = (1 -> node_A)
list: HEAD <-> (1,10) <-> TAIL
```

---

**Step 2: `put(2, 20)`**

Key 2 is not in the map. Create node `(2, 20)`, add to front.

```
map = (1 -> node_A, 2 -> node_B)
list: HEAD <-> (2,20) <-> (1,10) <-> TAIL
```

Cache is now full (size = capacity = 2).

---

**Step 3: `get(1)` returns 10**

Key 1 is in the map. Remove node_A from its position and move it to the front.

```
map = (1 -> node_A, 2 -> node_B)
list: HEAD <-> (1,10) <-> (2,20) <-> TAIL
```

Node `(1,10)` is now the most recently used.

---

**Step 4: `put(3, 30)`**

Key 3 is not in the map. Cache is full, so we must evict.

1. **Evict:** Remove the node just before TAIL — that is `(2,20)`. Delete key 2 from the map.
2. **Insert:** Create node `(3, 30)`, add to front, insert into map.

```
map = (1 -> node_A, 3 -> node_C)
list: HEAD <-> (3,30) <-> (1,10) <-> TAIL
```

---

**Step 5: `get(2)` returns -1**

Key 2 was evicted. Not in the map. Return -1.

```
(no change)
```

---

**Step 6: `put(4, 40)`**

Key 4 is not in the map. Cache is full.

1. **Evict:** Remove the node just before TAIL — that is `(1,10)`. Delete key 1 from the map.
2. **Insert:** Create node `(4, 40)`, add to front.

```
map = (3 -> node_C, 4 -> node_D)
list: HEAD <-> (4,40) <-> (3,30) <-> TAIL
```

---

**Step 7: `get(1)` returns -1**

Key 1 was evicted. Return -1.

---

**Step 8: `get(3)` returns 30**

Key 3 is in the map. Move node_C to front.

```
map = (3 -> node_C, 4 -> node_D)
list: HEAD <-> (3,30) <-> (4,40) <-> TAIL
```

---

**Step 9: `put(3, 300)`**

Key 3 already exists. Remove old node, create new node `(3, 300)`, add to front. No eviction needed.

```
map = (3 -> node_C', 4 -> node_D)
list: HEAD <-> (3,300) <-> (4,40) <-> TAIL
```

### Key Takeaways

- Every `get` or `put` of an existing key **promotes** that key to most-recent.
- Eviction always removes the node closest to TAIL (least recently used).
- The hash map ensures all operations are O(1) — without it, finding a key in the list would be O(n).

### Animation

<AlgoViz
  title="LRU Cache Operations"
  description="Visualising get and put operations on an LRU Cache with capacity 2. The doubly linked list maintains recency order: HEAD (most recent) to TAIL (least recent)."
  steps={[
    { array: [], highlights: [], variables: { capacity: 2, map: "empty", list: "HEAD - TAIL" }, explanation: "Initial state: empty cache with capacity 2.", code: "LRUCache cache = new LRUCache(2);" },
    { array: [10], highlights: [0], variables: { capacity: 2, map: "1:nodeA", list: "HEAD-(1,10)-TAIL" }, explanation: "put(1,10): Key 1 not in map. Create node, add to front.", code: "cache.put(1, 10);" },
    { array: [20, 10], highlights: [0], variables: { capacity: 2, map: "1:A, 2:B", list: "HEAD-(2,20)-(1,10)-TAIL" }, explanation: "put(2,20): Key 2 not in map. Create node, add to front. Cache is now full.", code: "cache.put(2, 20);" },
    { array: [10, 20], highlights: [0], variables: { capacity: 2, map: "1:A, 2:B", result: 10, list: "HEAD-(1,10)-(2,20)-TAIL" }, explanation: "get(1) returns 10: Key 1 found. Move node to front. Now key 2 is least recent.", code: "cache.get(1); // returns 10" },
    { array: [30, 10], highlights: [0], variables: { capacity: 2, map: "1:A, 3:C", evicted: "key 2", list: "HEAD-(3,30)-(1,10)-TAIL" }, explanation: "put(3,30): Cache full. Evict least recent (key 2). Insert key 3 at front.", code: "cache.put(3, 30);" },
    { array: [30, 10], highlights: [], variables: { capacity: 2, map: "1:A, 3:C", result: -1 }, explanation: "get(2) returns -1: Key 2 was evicted. Not found in map.", code: "cache.get(2); // returns -1" },
    { array: [40, 30], highlights: [0], variables: { capacity: 2, map: "3:C, 4:D", evicted: "key 1", list: "HEAD-(4,40)-(3,30)-TAIL" }, explanation: "put(4,40): Cache full. Evict least recent (key 1). Insert key 4 at front.", code: "cache.put(4, 40);" },
  ]}
/>

---

## Practice Problems

### Day 1 — Fundamental Design Blocks

| No. | Problem | LeetCode | Difficulty | Key Technique |
|-----|---------|----------|------------|---------------|
| 1 | Min Stack | 155 | Easy | Auxiliary stack tracking current min |
| 2 | LRU Cache | 146 | Medium | HashMap + Doubly Linked List |
| 3 | Implement Trie (Prefix Tree) | 208 | Medium | Trie node with children map |
| 4 | Design HashMap | 706 | Easy | Array of buckets with chaining |
| 5 | Design HashSet | 705 | Easy | Array of buckets with chaining |
| 6 | Implement Queue using Stacks | 232 | Easy | Two-stack amortized transfer |
| 7 | Design Linked List | 707 | Medium | Sentinel nodes, index traversal |

**Day 1 Focus:** Build confidence with the fundamental building blocks. Every design problem you encounter later composes these primitives.

### Day 2 — Advanced Caches and Randomized Structures

| No. | Problem | LeetCode | Difficulty | Key Technique |
|-----|---------|----------|------------|---------------|
| 8 | LFU Cache | 460 | Hard | Frequency buckets + LinkedHashSet |
| 9 | Insert Delete GetRandom O(1) | 380 | Medium | Array + HashMap, swap-to-end delete |
| 10 | Design Add and Search Words | 211 | Medium | Trie + DFS for wildcard `.` |
| 11 | Serialize and Deserialize Binary Tree | 297 | Hard | Pre-order DFS with null markers |
| 12 | Design Twitter | 355 | Medium | HashMap + Heap merge for feed |
| 13 | Flatten Nested List Iterator | 341 | Medium | Stack-based lazy flattening |
| 14 | BST Iterator | 173 | Medium | Controlled in-order traversal with stack |

**Day 2 Focus:** These problems combine multiple data structures. Pay special attention to how LFU extends LRU with frequency tracking and how the Twitter design merges k sorted lists.

### Day 3 — Iterators, Queues, and System-Level Design

| No. | Problem | LeetCode | Difficulty | Key Technique |
|-----|---------|----------|------------|---------------|
| 15 | Peeking Iterator | 284 | Medium | Cache-ahead wrapper pattern |
| 16 | Design Circular Queue | 622 | Medium | Circular array with modular arithmetic |
| 17 | Design Browser History | 1472 | Medium | Two stacks or doubly linked list |
| 18 | Time Based Key-Value Store | 981 | Medium | HashMap + sorted timestamps + binary search |
| 19 | Snapshot Array | 1146 | Medium | Per-index `(snap_id, val)` list + binary search |
| 20 | Maximum Frequency Stack | 895 | Hard | Frequency map + stack-per-frequency |
| 21 | Design In-Memory File System | 588 | Hard | Trie of directory/file nodes |

**Day 3 Focus:** These are the most interview-realistic problems. Time Based Key-Value Store and Snapshot Array teach you how to version data efficiently. Maximum Frequency Stack is a favorite at FAANG interviews.

---

## Mock Interview 1: LRU Cache Design

**Interviewer:** Design a data structure that supports `get(key)` and `put(key, value)` with O(1) time complexity and a fixed capacity, evicting the least recently used item when full.

**Candidate approach:**

1. Clarify: both `get` and `put` count as "use." Capacity is given at construction time.
2. Propose: HashMap for O(1) lookup + Doubly Linked List for O(1) order maintenance.
3. Code the solution (see LRU Cache template above).
4. Trace through the worked example.

**Follow-up 1: Thread Safety**

> "How would you make this thread-safe?"

Wrap `get` and `put` with a mutex/lock. For higher concurrency, consider sharding the cache into multiple segments (like `ConcurrentHashMap` in Java), each with its own lock. Read-heavy workloads can benefit from a read-write lock.

**Follow-up 2: TTL Expiration**

> "What if each entry has a time-to-live (TTL)?"

Store a timestamp with each node. On `get`, check if the entry has expired — if so, treat it as a cache miss and remove it. For proactive cleanup, use a background thread with a min-heap of expiration times, or use lazy eviction (only clean up on access).

**Follow-up 3: Distributed LRU**

> "How would you distribute this across multiple machines?"

Use consistent hashing to partition keys across cache nodes. Each node runs its own LRU cache. A client-side library or proxy (like `mcrouter` for Memcached) routes requests to the correct node. Handle node failures with replication or fallback to the backing store.

**Follow-up 4: Eviction Policy Change**

> "What if the interviewer asks you to switch to LFU mid-interview?"

Explain the structural differences: LFU needs frequency tracking and frequency-to-keys bucketing. The doubly linked list alone is insufficient — you need a bucket per frequency level. Walk through the LFU template and highlight how `min_freq` enables O(1) eviction.

---

## Mock Interview 2: Design an In-Memory File System

**Interviewer:** Design a file system that supports `mkdir(path)`, `addContentToFile(filePath, content)`, `readContentFromFile(filePath)`, and `ls(path)`.

**Candidate approach:**

1. Clarify: paths are absolute (start with `/`). `ls` on a file returns just the file name; `ls` on a directory returns sorted children. `addContentToFile` appends content.
2. Data model: Use a trie where each node represents a directory or file.

```java
import java.util.*;

class TrieNode {
    TreeMap<String, TrieNode> children = new TreeMap<>();
    String content = "";
    boolean isFile = false;
}

class FileSystem {
    private TrieNode root = new TrieNode();

    private TrieNode traverse(String path) {
        TrieNode node = root;
        if (path.equals("/")) return node;
        for (String part : path.split("/")) {
            if (part.isEmpty()) continue;
            node.children.putIfAbsent(part, new TrieNode());
            node = node.children.get(part);
        }
        return node;
    }

    public List<String> ls(String path) {
        TrieNode node = traverse(path);
        if (node.isFile) {
            String[] parts = path.split("/");
            return List.of(parts[parts.length - 1]);
        }
        return new ArrayList<>(node.children.keySet());
    }

    public void mkdir(String path) {
        traverse(path);
    }

    public void addContentToFile(String filePath, String content) {
        TrieNode node = traverse(filePath);
        node.isFile = true;
        node.content += content;
    }

    public String readContentFromFile(String filePath) {
        return traverse(filePath).content;
    }
}
```

3. Walk through an example: `mkdir("/a/b/c")`, `addContentToFile("/a/b/c/d", "hello")`, `ls("/a/b/c")` returns `["d"]`.

**Follow-up 1: Delete Operation**

> "Add `rm(path)` that deletes a file or an empty directory."

Traverse to the parent node, check if the target child exists. If it is a file, delete it. If it is a directory, only delete if `children` is empty (or support recursive delete with a flag).

**Follow-up 2: Wildcards in `ls`**

> "Support glob patterns like `ls('/a/b/*.txt')`."

At each level, if the pattern segment contains `*`, iterate over all children and filter by pattern match (use `fnmatch` or manual matching). This changes `ls` from O(1) traversal to O(children) at wildcard levels.

**Follow-up 3: Persistence**

> "How would you persist this to disk?"

Serialize the trie to a flat file using a DFS traversal. Each line records `path, is_file, content_length`. On startup, read the file and reconstruct the trie. For durability, use a write-ahead log (WAL) — append each mutation to a log file, and periodically compact by rewriting the full trie.

**Follow-up 4: Concurrency**

> "Multiple users accessing the file system simultaneously?"

Use a read-write lock per node for fine-grained concurrency. Readers can proceed in parallel; writers acquire exclusive access. For high-throughput scenarios, consider copy-on-write semantics or MVCC (multi-version concurrency control) where each write creates a new version of the node.

---

## Tips and Edge Cases

### General Design Tips

- **Start with the API.** Before touching data structures, write out the method signatures and clarify input/output with the interviewer. This prevents misunderstandings and shows structured thinking.
- **Draw the data structure.** Especially for linked list and trie problems, a quick diagram of the state after 2-3 operations catches bugs early.
- **Trace before coding.** Walk through 3-4 operations on paper. This reveals edge cases (empty cache, capacity 0, duplicate keys) before you write a single line.
- **Name your sentinel nodes.** Dummy head and tail nodes eliminate null checks in linked list operations. Always use them.
- **Think about the "happy path" last.** Handle edge cases first (`capacity == 0`, `key not found`, `empty structure`), then write the main logic.

### Common Edge Cases

| Scenario | What Can Go Wrong |
|----------|-------------------|
| Capacity is 0 | Every `put` should be a no-op; `get` always returns -1 |
| Duplicate `put` with same key | Must update value AND refresh recency, not insert a second copy |
| `get` on a missing key | Return -1, do NOT create an entry |
| Single-element cache | After put + evict, the list has exactly one node; make sure head/tail pointers are correct |
| All keys have the same frequency (LFU) | Falls back to LRU behavior among those keys |
| Empty trie search | Return false, not an error |
| Wildcard `.` at every position (Add and Search Words) | Worst case explores all 26 branches at each level — mention this complexity |
| Circular queue full vs. empty | Both have `front == rear` if not careful; use a size counter or waste one slot |
| Snapshot Array with no `set` before `snap` | Return 0 (default) for indices never written to |
| Browser history after `visit` | Clears all forward history, similar to how real browsers work |

### Interview Anti-Patterns to Avoid

- **Over-engineering:** Do not add thread safety, persistence, or distributed support unless asked. Start simple.
- **Ignoring amortized analysis:** When the interviewer asks about complexity, be precise. "O(1) amortized" is different from "O(1) worst case." Know which applies.
- **Forgetting to delete from the map:** In LRU/LFU, removing a node from the linked list without deleting the key from the hash map is a memory leak and a correctness bug.
- **Confusing insertion vs access order:** In Java's `LinkedHashMap`, the constructor parameter `accessOrder` determines whether iteration follows insertion order (false) or access order (true). Using the wrong mode inverts your eviction policy.
- **Not handling the `put` update case:** If `put(key, new_value)` is called for an existing key, you must update the value AND move the key to the front. Many candidates forget the move.
