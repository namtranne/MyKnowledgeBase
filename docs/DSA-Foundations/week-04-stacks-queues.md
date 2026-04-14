---
sidebar_position: 5
title: "Week 4: Stacks + Queues"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 4: Stacks + Queues

This week introduces two fundamental linear data structures — **stacks** and **queues** — that appear in parsing, graph traversal, undo systems, and countless interview problems. Mastering them unlocks monotonic-stack tricks, BFS, and expression evaluation patterns you'll use for the rest of the roadmap.

---

## 1 · Core Theory

### 1.1 Stack (LIFO — Last In, First Out)

A stack is a collection where the **most recently added** element is removed first. Think of a stack of plates: you always take the top one.

| Operation | Description | Time |
|-----------|-------------|------|
| `push(x)` | Add `x` to the top | O(1) |
| `pop()` | Remove and return the top element | O(1) |
| `peek()` / `top()` | View the top element without removing | O(1) |
| `isEmpty()` | Check if the stack is empty | O(1) |

**Java `ArrayDeque` as a stack:**

```java
import java.util.ArrayDeque;
import java.util.Deque;

Deque<Integer> stack = new ArrayDeque<>();
stack.push(10);             // push
stack.push(20);
int top = stack.peek();     // peek -> 20
int val = stack.pop();      // pop  -> 20
```

`ArrayDeque.push` / `pop` / `peek` are amortised O(1) because Java over-allocates the underlying array. `ArrayDeque` is the preferred stack implementation in Java (faster than `Stack`).

### 1.2 Queue (FIFO — First In, First Out)

A queue is a collection where the **oldest** element is removed first. Think of a checkout line: first person in line is served first.

| Operation | Description | Time |
|-----------|-------------|------|
| `enqueue(x)` | Add `x` to the back | O(1) |
| `dequeue()` | Remove and return the front element | O(1) |
| `front()` | View the front element | O(1) |
| `isEmpty()` | Check if the queue is empty | O(1) |

**Java `ArrayDeque` as a queue (and double-ended queue):**

```java
import java.util.ArrayDeque;
import java.util.Deque;

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(10);            // enqueue
queue.offer(20);
int val = queue.poll();     // dequeue -> 10
```

`ArrayDeque` is implemented as a resizable circular array, so both `offer()` and `poll()` are true O(1) — unlike `LinkedList` which has higher per-element overhead.

> **Rule of thumb:** Use `ArrayDeque` for both stacks and queues in Java. Use `Deque` interface methods: `push/pop/peek` for stack behavior, `offer/poll/peek` for queue behavior.

### 1.3 When to Use Which

| Pattern | Data Structure | Why |
|---------|---------------|-----|
| Undo / Back button | Stack | Most recent action undone first |
| Parentheses matching | Stack | Match innermost pair first |
| Expression evaluation (postfix) | Stack | Operands consumed in reverse order |
| Monotonic next-greater / next-smaller | Stack | Maintain sorted invariant of unresolved elements |
| Level-order / BFS traversal | Queue | Process nodes layer by layer |
| Sliding window max/min | Deque | Need to pop from both ends |
| Task scheduling / print queue | Queue | First come, first served |

---

## 2 · Key Patterns

### 2.1 Monotonic Stack

A **monotonic stack** maintains elements in sorted order (non-increasing or non-decreasing). When a new element violates the order, we pop until the invariant is restored — each pop resolves one pending query (e.g., "what is the next greater element?").

**When to reach for it:** any problem asking about the *next/previous greater/smaller* element, or spans of consecutive qualifying elements.

#### Why the monotonic stack is O(n), not O(n^2)

At first glance, the nested while-loop inside the for-loop looks like it could be O(n^2). The key insight is that **each element is pushed exactly once and popped at most once**. Across the entire algorithm, the total number of push and pop operations is at most 2n, making it O(n) total. This is a classic example of amortized analysis.

#### The intuition

Imagine standing in a line of people of varying heights, and everyone is looking to the right trying to find the first person taller than them. Short people behind a tall person will never be "seen" by anyone further back — the tall person blocks them. The monotonic stack captures exactly this: it keeps only the "visible" people (those that could still be someone's answer), and as soon as a taller person appears, all the shorter people in front get their answer resolved.

**Common misconception:** beginners confuse whether to use an increasing or decreasing stack. For **next greater element**, use a **decreasing stack** (top is smallest) — a new element that breaks the decreasing order is "greater" than what is on top. For **next smaller element**, use an **increasing stack**.

```
Input:  [2, 1, 2, 4, 3]

Processing with a decreasing stack (for next greater element):
  i=0  stack=[]        → push 0          stack=[0]
  i=1  nums[1]=1 < 2   → push 1          stack=[0,1]
  i=2  nums[2]=2 ≥ 1   → pop 1, ans[1]=2
                  2 ≥ 2 → (not strictly greater, depends on variant)
                        → push 2          stack=[0,2]
  i=3  nums[3]=4 ≥ 2   → pop 2, ans[2]=4
                  4 ≥ 2 → pop 0, ans[0]=4
                        → push 3          stack=[3]
  i=4  nums[4]=3 < 4   → push 4          stack=[3,4]
  Remaining indices have no next greater → -1
```

### 2.2 Stack for Expression Evaluation

For infix or postfix expressions the stack holds **operands** (and sometimes operators with precedence). For nested structures like `3[a2[c]]`, the stack holds partial results so you can resume the outer context after finishing the inner one.

### 2.3 Parentheses Matching

Every opening bracket gets pushed; every closing bracket must match `stack.peek()`. If the stack is empty at the end and every match succeeded, the string is valid.

### 2.4 BFS Queue Pattern

BFS explores neighbours level by level. A queue ensures we finish the current level before moving deeper.

```
visit start → enqueue start
while queue not empty:
    node = dequeue
    for each neighbour of node:
        if not visited:
            mark visited
            enqueue neighbour
```

---

## 3 · Code Templates

### Template 1 — Balanced Parentheses Checker

```java
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;

public static boolean isValid(String s) {
    Map<Character, Character> match = Map.of(')', '(', ']', '[', '}', '{');
    Deque<Character> stack = new ArrayDeque<>();
    for (char ch : s.toCharArray()) {
        if (match.containsKey(ch)) {               // closing bracket
            if (stack.isEmpty() || stack.peek() != match.get(ch))
                return false;
            stack.pop();
        } else {                                    // opening bracket
            stack.push(ch);
        }
    }
    return stack.isEmpty();
}
```

#### Valid Parentheses Animation

<AlgoViz
  title="Valid Parentheses — Stack Matching with Mixed Brackets"
  description="Process '({[]})' char by char, pushing openers and matching closers"
  steps={[
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [0],
      stack: [],
      variables: { char: "(", action: "push" },
      explanation: "Read '(' at index 0. It is an opening bracket, push it onto the stack.",
      code: "stack.push('(');"
    },
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [1],
      stack: ["("],
      variables: { char: "{", action: "push" },
      explanation: "Read '{' at index 1. Opening bracket, push onto stack.",
      code: "stack.push('{');"
    },
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [2],
      stack: ["(", "{"],
      variables: { char: "[", action: "push" },
      explanation: "Read '[' at index 2. Opening bracket, push onto stack. Stack now has 3 openers.",
      code: "stack.push('[');"
    },
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [3],
      stack: ["(", "{", "["],
      stackHighlights: [2],
      variables: { char: "]", top: "[", match: true },
      explanation: "Read ']' at index 3. Closing bracket! Top of stack is '[' which matches. Pop it.",
      code: "stack.pop(); // '[' matches ']'"
    },
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [4],
      stack: ["(", "{"],
      stackHighlights: [1],
      variables: { char: "}", top: "{", match: true },
      explanation: "Read '}' at index 4. Top is '{' which matches. Pop it.",
      code: "stack.pop(); // '{' matches '}'"
    },
    {
      array: ["(", "{", "[", "]", "}", ")"],
      highlights: [5],
      stack: ["("],
      stackHighlights: [0],
      variables: { char: ")", top: "(", match: true },
      explanation: "Read ')' at index 5. Top is '(' which matches. Pop it. Stack is empty -- valid!",
      code: "stack.pop(); return stack.isEmpty(); // true"
    }
  ]}
/>

### Template 2 — Monotonic Stack: Next Greater Element

**When to use this template:** Problems asking for the "next greater", "next smaller", "previous greater", or "previous smaller" element for each position in an array. Also applies to histogram problems (Largest Rectangle), stock span, and daily temperatures. The stack stores **indices** (not values) so you can compute distances. O(n) time, O(n) space. For "previous" variants, iterate right-to-left instead of left-to-right. For circular arrays, iterate 0 to 2n-1 using modular indexing.

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

public static int[] nextGreater(int[] nums) {
    int n = nums.length;
    int[] ans = new int[n];
    Arrays.fill(ans, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // stores indices
    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && nums[i] > nums[stack.peek()]) {
            int idx = stack.pop();
            ans[idx] = nums[i];               // nums[i] is the next greater for idx
        }
        stack.push(i);
    }
    return ans;
}
```

**Variant — circular array:** loop `i` from `0` to `2n - 1` and use `i % n`.

### Template 3 — Queue-Based BFS Skeleton

```java
import java.util.*;

public static List<Integer> bfs(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    visited.add(start);
    Deque<Integer> queue = new ArrayDeque<>();
    queue.offer(start);
    List<Integer> order = new ArrayList<>();

    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int neighbour : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(neighbour)) {
                visited.add(neighbour);
                queue.offer(neighbour);
            }
        }
    }
    return order;
}
```

### Template 4 — Decode String (Nested Stack)

```java
import java.util.ArrayDeque;
import java.util.Deque;

public static String decodeString(String s) {
    Deque<String> strStack = new ArrayDeque<>();
    Deque<Integer> numStack = new ArrayDeque<>();
    StringBuilder curStr = new StringBuilder();
    int curNum = 0;

    for (char ch : s.toCharArray()) {
        if (Character.isDigit(ch)) {
            curNum = curNum * 10 + (ch - '0');
        } else if (ch == '[') {
            strStack.push(curStr.toString());
            numStack.push(curNum);
            curStr = new StringBuilder();
            curNum = 0;
        } else if (ch == ']') {
            String prevStr = strStack.pop();
            int num = numStack.pop();
            StringBuilder tmp = new StringBuilder(prevStr);
            for (int i = 0; i < num; i++) tmp.append(curStr);
            curStr = tmp;
        } else {
            curStr.append(ch);
        }
    }
    return curStr.toString();
}
```

#### Evaluate Reverse Polish Notation Animation

<AlgoViz
  title="Evaluate RPN — Stack-Based Expression Evaluation"
  description="Evaluate ['2', '3', '+', '4', '*'] which equals (2+3)*4 = 20"
  steps={[
    {
      array: ["2", "3", "+", "4", "*"],
      highlights: [0],
      stack: [],
      variables: { token: "2", action: "push number" },
      explanation: "Token '2' is a number. Push 2 onto the stack.",
      code: "stack.push(2);"
    },
    {
      array: ["2", "3", "+", "4", "*"],
      highlights: [1],
      stack: [2],
      variables: { token: "3", action: "push number" },
      explanation: "Token '3' is a number. Push 3 onto the stack.",
      code: "stack.push(3);"
    },
    {
      array: ["2", "3", "+", "4", "*"],
      highlights: [2],
      stack: [2, 3],
      stackHighlights: [0, 1],
      variables: { token: "+", b: 3, a: 2, result: 5 },
      explanation: "Token '+' is an operator. Pop 3 (b) and 2 (a). Compute a+b = 2+3 = 5. Push 5.",
      code: "b = stack.pop(); a = stack.pop(); stack.push(a + b);"
    },
    {
      array: ["2", "3", "+", "4", "*"],
      highlights: [3],
      stack: [5],
      variables: { token: "4", action: "push number" },
      explanation: "Token '4' is a number. Push 4 onto the stack.",
      code: "stack.push(4);"
    },
    {
      array: ["2", "3", "+", "4", "*"],
      highlights: [4],
      stack: [5, 4],
      stackHighlights: [0, 1],
      variables: { token: "*", b: 4, a: 5, result: 20 },
      explanation: "Token '*' is an operator. Pop 4 (b) and 5 (a). Compute a*b = 5*4 = 20. Push 20.",
      code: "b = stack.pop(); a = stack.pop(); stack.push(a * b);"
    },
    {
      array: ["2", "3", "+", "4", "*"],
      stack: [20],
      stackHighlights: [0],
      variables: { answer: 20 },
      explanation: "All tokens processed. Stack has one element: 20. That is the final answer! (2+3)*4 = 20.",
      code: "return stack.pop(); // 20"
    }
  ]}
/>

#### Min Stack Animation

<AlgoViz
  title="Min Stack — Dual Stack Tracking Minimum"
  description="Push 5, 3, 7, then getMin()=3. Pop 7, push 2, getMin()=2"
  steps={[
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [0],
      stack: [],
      variables: { operation: "push(5)", mainStack: "[]", minStack: "[]" },
      explanation: "Push 5. Main stack gets 5. Min stack gets 5 (current minimum is 5).",
      code: "mainStack.push(5); minStack.push(5);"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [1],
      stack: [5],
      variables: { operation: "push(3)", mainStack: "[5]", minStack: "[5]" },
      explanation: "Push 3. Main stack gets 3. Since 3 is less than current min (5), min stack gets 3.",
      code: "mainStack.push(3); minStack.push(Math.min(3, 5));"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [2],
      stack: [5, 3],
      variables: { operation: "push(7)", mainStack: "[5,3]", minStack: "[5,3]" },
      explanation: "Push 7. Main stack gets 7. Min is still 3 (7 is not smaller), so min stack gets 3.",
      code: "mainStack.push(7); minStack.push(Math.min(7, 3));"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [3],
      stack: [5, 3, 7],
      stackHighlights: [1],
      variables: { operation: "getMin()", mainStack: "[5,3,7]", minStack: "[5,3,3]", min: 3 },
      explanation: "getMin(): peek the min stack, which shows 3. The minimum element is 3.",
      code: "return minStack.peek(); // 3"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [4],
      stack: [5, 3, 7],
      stackHighlights: [2],
      variables: { operation: "pop()", popped: 7, mainStack: "[5,3]", minStack: "[5,3]" },
      explanation: "Pop: removes 7 from main stack and corresponding entry from min stack. Min is still 3.",
      code: "mainStack.pop(); minStack.pop(); // removed 7"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [5],
      stack: [5, 3],
      variables: { operation: "push(2)", mainStack: "[5,3]", minStack: "[5,3]" },
      explanation: "Push 2. Since 2 is less than current min (3), the new min becomes 2.",
      code: "mainStack.push(2); minStack.push(Math.min(2, 3));"
    },
    {
      array: ["push(5)", "push(3)", "push(7)", "getMin", "pop", "push(2)", "getMin"],
      highlights: [6],
      stack: [5, 3, 2],
      stackHighlights: [2],
      variables: { operation: "getMin()", mainStack: "[5,3,2]", minStack: "[5,3,2]", min: 2 },
      explanation: "getMin(): peek the min stack, which shows 2. All operations are O(1)!",
      code: "return minStack.peek(); // 2"
    }
  ]}
/>

---

## 4 · Complexity Table

| Operation / Pattern | Time | Space | Notes |
|---------------------|------|-------|-------|
| Stack push / pop / peek | O(1) amortised | O(n) | ArrayDeque over-allocates |
| Queue offer / poll (ArrayDeque) | O(1) | O(n) | Resizable circular array |
| Balanced parentheses check | O(n) | O(n) | One pass, stack ≤ n/2 |
| Monotonic stack (next greater) | O(n) | O(n) | Each element pushed and popped at most once |
| Evaluate RPN | O(n) | O(n) | One pass through tokens |
| BFS traversal | O(V + E) | O(V) | Queue holds at most one level |
| Sliding window max (deque) | O(n) | O(k) | k = window size |
| Largest rectangle in histogram | O(n) | O(n) | Single monotonic-stack pass |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Valid/balanced parentheses or brackets" | Stack — push openers, pop and match on closers | Parentheses Checker |
| "Next greater/warmer/smaller element" | Monotonic stack storing indices | Monotonic Stack |
| "Largest rectangle in histogram" | Monotonic increasing stack, compute area on each pop | Monotonic Stack |
| "Evaluate reverse Polish / postfix expression" | Operand stack — push numbers, pop two on operator | Stack Evaluation |
| "Decode nested string like 3[a2[c]]" | Two stacks (string + count) or single stack of contexts | Nested Stack |
| "Sliding window maximum/minimum" | Monotonic deque — pop from both ends | Monotonic Deque |
| "Implement queue using stacks" | Two stacks — lazy transfer on dequeue | Two-Stack Queue |
| "Min stack / max stack" | Parallel stack tracking running min/max | Auxiliary Stack |
| "Asteroid collision / cancel pairs" | Stack simulation — pop when current element cancels the top | Stack Simulation |
| "Simplify file path" | Split by "/" and use stack to handle ".." (pop) and "." (skip) | Stack Split |

---

## 5 · Worked Example: Valid Parentheses

**Problem:** Given `s = "([{}])"`, determine if every bracket is correctly matched and nested.

### Why not brute force?

A naive approach might repeatedly scan the string for adjacent matching pairs and remove them (like peeling layers of an onion). Each removal pass is O(n), and in the worst case you need O(n) passes, giving O(n^2). The stack approach solves it in a single O(n) pass because the LIFO property perfectly mirrors the nesting structure: the most recently opened bracket must be the first to close.

:::tip Key Insight
A stack is the natural data structure for nested structure problems because LIFO order matches the rule that inner brackets must close before outer ones. Every opening bracket "waits" on the stack until its partner arrives.
:::

**Approach:** Use a stack. Push every opener; on a closer, verify it matches the stack top.

### Step-by-step trace

```
s = "( [ { } ] )"
     0 1 2 3 4 5

match = {')': '(', ']': '[', '}': '{'}
```

| Step | Char | Action | Stack (bottom → top) | Explanation |
|------|------|--------|----------------------|-------------|
| 0 | `(` | Push | `[` `(` `]` | Opening bracket — push onto stack |
| 1 | `[` | Push | `[` `(` `[` `]` | Opening bracket — push |
| 2 | `{` | Push | `[` `(` `[` `{` `]` | Opening bracket — push |
| 3 | `}` | Pop `{` ✓ | `[` `(` `[` `]` | Closer `}` matches top `{` — pop |
| 4 | `]` | Pop `[` ✓ | `[` `(` `]` | Closer `]` matches top `[` — pop |
| 5 | `)` | Pop `(` ✓ | `[]` | Closer `)` matches top `(` — pop |

**Stack is empty → return `True`.**

### Why this works

Each opening bracket "waits" on the stack until its matching closer arrives. Because the most recently opened bracket must close first, LIFO order guarantees correct nesting. If we ever encounter a mismatch, or the stack isn't empty at the end, the string is invalid.

### Edge cases to consider

- Empty string → valid (no brackets to mismatch).
- Single bracket like `"("` → invalid (stack non-empty at end).
- Interleaved wrong pairs `"(]"` → invalid (mismatch caught immediately).
- Only closers `")]"` → invalid (stack empty when we need to pop).

### Interactive Animation

<AlgoViz
  title="Valid Parentheses — Stack Matching"
  description="Watch the stack push openers and match closers character by character"
  steps={[
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [0],
      stack: [],
      variables: { char: "(", action: "push" },
      explanation: "Read '(' — opening bracket. Push onto stack.",
      code: "stack.push('(');"
    },
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [1],
      stack: ["("],
      variables: { char: "[", action: "push" },
      explanation: "Read '[' — opening bracket. Push onto stack.",
      code: "stack.push('[');"
    },
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [2],
      stack: ["(", "["],
      variables: { char: "{", action: "push" },
      explanation: "Read '{' — opening bracket. Push onto stack.",
      code: "stack.push('{');"
    },
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [3],
      secondary: [2],
      stack: ["(", "[", "{"],
      variables: { char: "}", top: "{", match: true },
      explanation: "Read '}' — closing bracket. Top is '{' which matches! Pop.",
      code: "stack.pop(); // matched '{'"
    },
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [4],
      secondary: [1],
      stack: ["(", "["],
      variables: { char: "]", top: "[", match: true },
      explanation: "Read ']' — closing bracket. Top is '[' which matches! Pop.",
      code: "stack.pop(); // matched '['"
    },
    {
      array: ["(", "[", "{", "}", "]", ")"],
      highlights: [5],
      secondary: [0],
      stack: ["("],
      variables: { char: ")", top: "(", match: true },
      explanation: "Read ')' — closing bracket. Top is '(' which matches! Pop. Stack is empty — valid!",
      code: "stack.pop(); // matched '(' — return stack.isEmpty() == true"
    }
  ]}
/>

---

## 6 · Practice Problems (21 problems · 7 days)

### Day 1–2: Easy-Focused (Warm-Up)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 1 | Valid Parentheses | Easy | Stack matching | ⭐ | 20 |
| 2 | Implement Queue using Stacks | Easy | Two stacks | ⭐ | 232 |
| 3 | Implement Stack using Queues | Easy | Single queue | | 225 |
| 4 | Min Stack | Medium | Auxiliary stack | ⭐ | 155 |
| 5 | Baseball Game | Easy | Stack simulation | | 682 |
| 6 | Next Greater Element I | Easy | Monotonic stack + hash | | 496 |
| 7 | Backspace String Compare | Easy | Stack or two pointers | | 844 |

**Day 1–2 study tips:**
- Problems 1–3 build your muscle memory with the two data structures.
- Min Stack (problem 4) is a classic trick: maintain a parallel stack of running minimums. Each push stores the current min alongside the value; each pop discards both.
- Next Greater Element I introduces monotonic stacks gently with a hash-map lookup.

### Day 3–4: Medium-Focused (Pattern Building)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 8 | Daily Temperatures | Medium | Monotonic stack | ⭐ | 739 |
| 9 | Evaluate Reverse Polish Notation | Medium | Stack evaluation | ⭐ | 150 |
| 10 | Decode String | Medium | Stack nesting | ⭐ | 394 |
| 11 | Asteroid Collision | Medium | Stack simulation | | 735 |
| 12 | Remove All Adjacent Duplicates in String II | Medium | Stack counting | | 1209 |
| 13 | Car Fleet | Medium | Monotonic stack / sort | | 853 |
| 14 | Online Stock Span | Medium | Monotonic stack | | 901 |

**Day 3–4 study tips:**
- Daily Temperatures is the purest monotonic-stack drill — make sure you can write it from scratch.
- Decode String is the archetype for "stack of contexts": every `[` pushes the current context, every `]` pops and merges.
- Car Fleet requires sorting by position first, then using a stack to merge fleets that catch up.

### Day 5–7: Medium / Hard (Deep Dive)

| # | Problem | Diff | Pattern | Star | LC |
|---|---------|------|---------|------|----|
| 15 | Largest Rectangle in Histogram | Hard | Monotonic stack | ⭐ | 84 |
| 16 | Sliding Window Maximum | Hard | Monotonic deque | ⭐ | 239 |
| 17 | Basic Calculator | Hard | Stack + recursion | | 224 |
| 18 | Basic Calculator II | Medium | Stack + operators | | 227 |
| 19 | Simplify Path | Medium | Stack split | | 71 |
| 20 | Trapping Rain Water | Hard | Stack approach | | 42 |
| 21 | Maximum Frequency Stack | Hard | Stack + hash | | 895 |

**Day 5–7 study tips:**
- Largest Rectangle in Histogram is a **must-know** — it's the foundation for "Maximal Rectangle" (LC 85) and many DP+stack hybrids.
- Sliding Window Maximum swaps the stack for a **deque** so you can pop from both ends. This is the monotonic deque pattern.
- Trapping Rain Water has multiple approaches (two pointers, prefix max, stack). Practice the stack version here for fluency, but know the two-pointer O(1)-space version too.
- Maximum Frequency Stack combines a frequency map with a stack-per-frequency — a beautiful design problem.

---

## 7 · Mock Interviews

### Mock Interview 1 — Stack Focus (45 min)

**Interviewer prompt:**

> "Given an array of integers `temperatures`, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i`-th day to get a warmer temperature. If there is no future day with a warmer temperature, set `answer[i] = 0`."
>
> *(LC 739 — Daily Temperatures)*

**Expected dialogue:**

1. **Clarify:** "Can temperatures be negative? Can the array be empty?" → Temperatures are in range 30–100, array length 1–10^5.
2. **Brute force:** "For each day, scan forward until I find a warmer day — O(n²)."
3. **Optimise:** "I can use a monotonic decreasing stack of indices. When I find a warmer day, I pop and record the distance."
4. **Code:** Write the monotonic stack solution.
5. **Test:** Trace through `[73, 74, 75, 71, 69, 72, 76, 73]`.

**Follow-up questions:**

1. *"What if I also need the index of the next colder day?"* → Maintain a monotonic **increasing** stack instead.
2. *"What if the array is circular — the last element can wrap around to the first?"* → Iterate `0..2n-1` and use `i % n` for indexing, same stack logic.
3. *"Can you solve this in O(1) extra space?"* → Not easily with a stack approach. You can work backwards with a jump-pointer technique, but it's less clean.
4. *"How would you parallelise this for a distributed system with billions of data points?"* → Partition the array into chunks. Each chunk computes local answers; unresolved elements at chunk boundaries are merged in a second pass.

---

### Mock Interview 2 — Queue / Design Focus (45 min)

**Interviewer prompt:**

> "Design a stack that supports `push`, `pop`, `top`, and retrieving the minimum element, all in O(1) time."
>
> *(LC 155 — Min Stack)*

**Expected dialogue:**

1. **Clarify:** "Are values bounded? Can I use extra space?" → Values are 32-bit integers, O(n) extra space is fine.
2. **Approach 1 — Two stacks:** "I'll keep a main stack and a `min_stack`. On every push, I also push the current minimum onto `min_stack`. On pop, I pop from both."
3. **Approach 2 — Single stack with tuples:** "Each entry stores `(value, current_min)`. Slightly simpler."
4. **Code:** Implement approach 2.
5. **Test:** Push 5, 3, 7, 2 — verify `getMin()` returns 2. Pop → `getMin()` returns 3.

**Follow-up questions:**

1. *"How would you also support `getMax` in O(1)?"* → Add a parallel `max_stack` or store `(value, cur_min, cur_max)` tuples.
2. *"What if I need O(1) space — no auxiliary stack?"* → Store the difference between the value and the running min. When the difference is negative, the value itself is the new min. Reconstruct on pop.
3. *"How would you implement a Min Queue (FIFO with O(1) getMin)?"* → Use two Min Stacks to simulate a queue (amortised O(1) dequeue), or use a monotonic deque tracking minimums.
4. *"Now design a Max Frequency Stack (LC 895). Walk me through the data structures."* → Maintain a `freq` hashmap and a `group` dict mapping frequency → stack of values. Push increments freq and appends to group. Pop finds the max-freq group, pops from it, and decrements freq.

---

## 8 · Tips and Edge Cases

### Common Pitfalls

- **Popping from an empty stack:** Always guard `stack.pop()` with `if (!stack.isEmpty())`. This is the #1 runtime error in stack problems.
- **Using `ArrayList.remove(0)` as a queue:** This is O(n). Use `ArrayDeque.poll()` instead.
- **Off-by-one in monotonic stack:** Decide whether your stack is **strictly** monotonic or allows equal elements. This changes `>` vs `>=` in the while condition.
- **Forgetting to process remaining stack elements:** After the main loop, indices still on the stack have no next-greater (or whatever you're computing). Make sure you handle them (often they stay as the default value like `-1`).
- **Circular arrays:** Don't iterate only `0..n-1`. Use `0..2n-1` with modular indexing.

### Edge Cases Checklist

| Edge Case | Example | Watch Out For |
|-----------|---------|---------------|
| Empty input | `""` or `[]` | Return immediately, don't access index 0 |
| Single element | `"("` or `[5]` | Stack may be non-empty at end |
| All same values | `[7,7,7,7]` | Monotonic stack may push everything without popping |
| Already sorted ascending | `[1,2,3,4]` | Next greater is always the immediate next element |
| Already sorted descending | `[4,3,2,1]` | No next greater exists for any element |
| Deeply nested | `"((((…))))"` | Stack grows to n/2 — verify space is acceptable |
| Mixed bracket types | `"([)]"` | Interleaved brackets are invalid despite equal counts |
| Large k in sliding window | k = n | Deque holds all elements — degenerates to global max |

### Performance Tips

- **Pre-size your answer array** with a default value (use `Arrays.fill(ans, -1)` or `new int[n]` for zeroes) to avoid map overhead.
- **Store indices, not values** on the stack — you can always look up `nums[idx]`, and indices give you distance calculations for free.
- **One-pass vs two-pass:** Most monotonic stack problems need only a single left-to-right pass. If you need both next-greater-left and next-greater-right, do two passes or iterate `2n` for circular variants.

### Recognising Stack/Queue Problems

Ask yourself:
- "Do I need to match something (brackets, tags, nested structures)?" → **Stack.**
- "Do I need the next/previous greater or smaller element?" → **Monotonic stack.**
- "Do I need to process things level by level or in FIFO order?" → **Queue / BFS.**
- "Do I need the max/min in a sliding window?" → **Monotonic deque.**
- "Do I need to undo or backtrack?" → **Stack.**
