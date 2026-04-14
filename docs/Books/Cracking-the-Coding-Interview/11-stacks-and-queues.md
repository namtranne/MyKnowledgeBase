# Chapter 3 — Stacks and Queues

> Stacks and queues are foundational linear data structures. A stack processes items last-in-first-out; a queue processes first-in-first-out. Understanding when to use each — and their variations — is essential for interview success.

---

## Implementing a Stack

A **stack** uses LIFO (Last-In, First-Out) ordering. Think of a stack of plates — you add and remove from the top.

```
    ┌─────┐
    │  3  │  ← top (push/pop here)
    ├─────┤
    │  2  │
    ├─────┤
    │  1  │
    └─────┘

    push(4):         pop() → 3:
    ┌─────┐          ┌─────┐
    │  4  │ ← top    │  2  │ ← top
    ├─────┤          ├─────┤
    │  3  │          │  1  │
    ├─────┤          └─────┘
    │  2  │
    ├─────┤
    │  1  │
    └─────┘
```

### Core Operations

| Operation | Description | Time |
|-----------|-------------|------|
| `push(item)` | Add item to top | O(1) |
| `pop()` | Remove and return top item | O(1) |
| `peek()` | Return top item without removing | O(1) |
| `isEmpty()` | Check if stack is empty | O(1) |

### Linked-List Implementation

```java
class Stack<T> {
    private static class Node<T> {
        T data;
        Node<T> next;
        Node(T data) { this.data = data; }
    }

    private Node<T> top;

    void push(T item) {
        Node<T> node = new Node<>(item);
        node.next = top;
        top = node;
    }

    T pop() {
        if (top == null) throw new EmptyStackException();
        T data = top.data;
        top = top.next;
        return data;
    }

    T peek() {
        if (top == null) throw new EmptyStackException();
        return top.data;
    }

    boolean isEmpty() {
        return top == null;
    }
}
```

### When to Use a Stack

- **Function call management** — the call stack itself
- **Undo/redo operations** — each action pushed, undone by popping
- **Expression parsing** — matching parentheses, evaluating postfix
- **DFS traversal** — explicit stack replaces recursion
- **Backtracking** — explore a path, backtrack by popping

---

## Implementing a Queue

A **queue** uses FIFO (First-In, First-Out) ordering. Think of a line at a store — first person in line is served first.

```
  Enqueue (add)                              Dequeue (remove)
       │                                          │
       ▼                                          ▼
  ┌─────┬─────┬─────┬─────┐
  │  4  │  3  │  2  │  1  │
  └─────┴─────┴─────┴─────┘
  back                front
```

### Core Operations

| Operation | Description | Time |
|-----------|-------------|------|
| `add(item)` / `enqueue` | Add item to back | O(1) |
| `remove()` / `dequeue` | Remove and return front item | O(1) |
| `peek()` | Return front item without removing | O(1) |
| `isEmpty()` | Check if queue is empty | O(1) |

### Linked-List Implementation

```java
class Queue<T> {
    private static class Node<T> {
        T data;
        Node<T> next;
        Node(T data) { this.data = data; }
    }

    private Node<T> first, last;

    void add(T item) {
        Node<T> node = new Node<>(item);
        if (last != null) last.next = node;
        last = node;
        if (first == null) first = last;
    }

    T remove() {
        if (first == null) throw new NoSuchElementException();
        T data = first.data;
        first = first.next;
        if (first == null) last = null;
        return data;
    }

    T peek() {
        if (first == null) throw new NoSuchElementException();
        return first.data;
    }

    boolean isEmpty() {
        return first == null;
    }
}
```

### When to Use a Queue

- **BFS traversal** — explore level by level
- **Order processing** — tasks in FIFO order
- **Buffering** — producer-consumer pattern
- **Scheduling** — round-robin, printer queues

---

## Stack vs Queue Decision Guide

```
┌─────────────────────────────────────────────────────────┐
│  "Do I need to process the most recent item first?"     │
│                                                         │
│    YES → Stack (LIFO)          NO → Queue (FIFO)        │
│    • DFS                       • BFS                    │
│    • Undo operations           • Level-order traversal  │
│    • Expression eval           • Task scheduling        │
│    • Backtracking              • Message processing     │
│    • Call stack simulation     • Producer-consumer       │
└─────────────────────────────────────────────────────────┘
```

---

## Deque (Double-Ended Queue)

A **deque** allows insertion and removal at both ends in O(1).

```
     addFirst          addLast
         │                │
         ▼                ▼
    ┌─────┬─────┬─────┬─────┐
    │  A  │  B  │  C  │  D  │
    └─────┴─────┴─────┴─────┘
         ▲                ▲
         │                │
    removeFirst      removeLast
```

```java
Deque<Integer> deque = new ArrayDeque<>();
deque.addFirst(1);
deque.addLast(2);
deque.peekFirst();   // 1
deque.peekLast();    // 2
deque.pollFirst();   // 1
deque.pollLast();    // 2
```

> In Java, prefer `ArrayDeque` over `Stack` and `LinkedList` for both stack and queue operations. It's faster due to cache locality and doesn't have synchronization overhead.

---

## Priority Queue

A **priority queue** dequeues elements by priority rather than insertion order, typically implemented with a binary heap.

| Operation | Time |
|-----------|------|
| Insert | O(log N) |
| Extract min/max | O(log N) |
| Peek min/max | O(1) |

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.add(5);
minHeap.add(2);
minHeap.add(8);
minHeap.poll();  // 2 (smallest)

PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
maxHeap.add(5);
maxHeap.add(2);
maxHeap.add(8);
maxHeap.poll();  // 8 (largest)
```

**Use cases:** Dijkstra's algorithm, K closest points, merge K sorted lists, scheduling by deadline.

---

## Monotonic Stack Pattern

A **monotonic stack** maintains elements in sorted order (increasing or decreasing). Elements that violate the monotonic property are popped before the new element is pushed.

### Next Greater Element

For each element, find the next element that is greater.

```java
int[] nextGreater(int[] arr) {
    int[] result = new int[arr.length];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < arr.length; i++) {
        while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
            result[stack.pop()] = arr[i];
        }
        stack.push(i);
    }
    return result;
}
```

```
Input:   [2, 1, 4, 3, 5]
Output:  [4, 4, 5, 5, -1]

Stack trace (stores indices):
i=0: push 0          stack: [0]          (2)
i=1: push 1          stack: [0,1]        (2, 1)
i=2: pop 1 → res[1]=4                   1 < 4 ✓
     pop 0 → res[0]=4                   2 < 4 ✓
     push 2          stack: [2]          (4)
i=3: push 3          stack: [2,3]        (4, 3)
i=4: pop 3 → res[3]=5                   3 < 5 ✓
     pop 2 → res[2]=5                   4 < 5 ✓
     push 4          stack: [4]          (5)
```

**Common problems:** Next greater element, largest rectangle in histogram, daily temperatures, stock span.

---

## Monotonic Queue Pattern

A **monotonic queue** (usually implemented with a deque) efficiently tracks the sliding window maximum or minimum.

### Sliding Window Maximum

```java
int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> deque = new ArrayDeque<>();
    int[] result = new int[nums.length - k + 1];

    for (int i = 0; i < nums.length; i++) {
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
            deque.pollLast();
        }
        deque.addLast(i);
        if (i >= k - 1) {
            result[i - k + 1] = nums[deque.peekFirst()];
        }
    }
    return result;
}
```

---

## Interview Questions Overview

### 3.1 — Three in One

> Use a single array to implement three stacks.

**Approaches:**
- **Fixed division:** Divide array into three equal parts. Each stack gets [n/3] space.
- **Flexible division:** Allow stacks to grow into each other's space with a more complex bookkeeping system.

### 3.2 — Stack Min

> Design a stack that, in addition to push and pop, has a function min which returns the minimum element. All in O(1).

**Approach:** Maintain a second stack that tracks minimums. Push onto the min stack when a new minimum is encountered; pop from it when the main stack pops a value equal to the current min.

```java
class MinStack {
    private Deque<Integer> stack = new ArrayDeque<>();
    private Deque<Integer> minStack = new ArrayDeque<>();

    void push(int val) {
        stack.push(val);
        if (minStack.isEmpty() || val <= minStack.peek()) {
            minStack.push(val);
        }
    }

    int pop() {
        int val = stack.pop();
        if (val == minStack.peek()) minStack.pop();
        return val;
    }

    int min() {
        return minStack.peek();
    }
}
```

### 3.3 — Stack of Plates

> Imagine a stack of plates. If the stack gets too high, start a new stack. Implement `SetOfStacks` with push, pop, and `popAt(index)`.

Maintain a list of stacks. Push creates a new sub-stack when the current one reaches capacity. `popAt` requires shifting elements between sub-stacks (rollover).

### 3.4 — Queue via Stacks

> Implement a queue using two stacks.

```java
class MyQueue<T> {
    private Deque<T> inStack = new ArrayDeque<>();
    private Deque<T> outStack = new ArrayDeque<>();

    void add(T item) {
        inStack.push(item);
    }

    T remove() {
        shiftStacks();
        return outStack.pop();
    }

    T peek() {
        shiftStacks();
        return outStack.peek();
    }

    private void shiftStacks() {
        if (outStack.isEmpty()) {
            while (!inStack.isEmpty()) {
                outStack.push(inStack.pop());
            }
        }
    }
}
```

> Amortized O(1) for both enqueue and dequeue. Each element is moved at most twice (once into each stack).

### 3.5 — Sort Stack

> Sort a stack such that the smallest items are on top. You may only use one additional stack. No other data structures allowed.

**Approach:** Pop from the input stack. Hold the popped value in a temp variable. Pop from the sorted stack back onto the input stack while the sorted stack's top is greater than temp. Push temp onto sorted stack. O(N²) time, O(N) space.

### 3.6 — Animal Shelter

> FIFO adoption: people choose the oldest dog, oldest cat, or oldest animal. Implement with enqueue, dequeueAny, dequeueDog, dequeueCat.

Use two queues (dogs and cats), each with a timestamp/order number. `dequeueAny` peeks at both and takes the older one.

---

## Comparison Table

| Feature | Stack | Queue | Deque | Priority Queue |
|---------|-------|-------|-------|---------------|
| Order | LIFO | FIFO | Both ends | By priority |
| Insert | O(1) | O(1) | O(1) | O(log N) |
| Remove | O(1) | O(1) | O(1) | O(log N) |
| Peek | O(1) | O(1) | O(1) | O(1) |
| Use case | DFS, undo | BFS, scheduling | Sliding window | Dijkstra, top-K |
| Java class | `ArrayDeque` | `ArrayDeque` / `LinkedList` | `ArrayDeque` | `PriorityQueue` |

---

## Key Takeaways

1. **Stack = LIFO, Queue = FIFO** — know these cold, they underpin many algorithms
2. **ArrayDeque > Stack class** in Java — no synchronization overhead
3. **Queue via two stacks** and **stack sorting** are classic interview problems — practice the mechanics
4. **Monotonic stack** is a power pattern for "next greater/smaller" problems → O(N)
5. **Priority queues** bridge the gap between simple queues and sorted structures
6. **Always check for empty** before pop/peek — interviewers watch for this
7. **BFS = Queue, DFS = Stack** — this mapping is fundamental to graph/tree traversal
