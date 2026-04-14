---
sidebar_position: 2
title: "Week 1: Monotonic Stack + Deque"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 1: Monotonic Stack + Monotonic Deque

## Theory & Concepts

### What is a Monotonic Stack?

A **monotonic stack** is a stack that maintains its elements in either strictly increasing or strictly decreasing order. When you push a new element, you pop all elements that violate the monotonic property. This seemingly simple invariant lets you solve "next greater/smaller element" problems in **O(n)** instead of O(n²).

**Why it matters:** Many interview problems that look like they need nested loops — histogram areas, stock spans, temperature waits — reduce to a single-pass monotonic stack.

**Why this technique exists.** Consider the brute-force approach to "next greater element": for each element, scan rightward until you find something larger. That is O(n) per element, O(n²) total. The monotonic stack exploits the fact that once an element has been "answered" (a larger value arrived), it will never be relevant again. By eagerly discarding these answered elements, you avoid redundant comparisons. Think of it like a line at a concert: shorter people standing behind a tall person will never be seen by the audience, so you can remove them from consideration immediately.

**The intuition — a real-world analogy.** Imagine you are standing in a crowd and want to know who is the first person taller than you to your right. You could crane your neck and scan every person, but a smarter approach is to have everyone in line announce their height as they arrive. When a tall person shows up, everyone shorter who was still waiting instantly gets their answer. This "announce and resolve" pattern is exactly what the monotonic stack does: each element is pushed once and popped once, giving O(n) total work.

**Interview signals.** Look for these phrases in problem statements: "next greater element," "next smaller element," "days until warmer temperature," "span of stock prices," "largest rectangle," "maximum width ramp," or any problem where the brute force is nested iteration comparing each element to every element to its right/left. If the expected time complexity is O(n) and the naive approach is O(n²), a monotonic stack is very likely the intended tool.

**Common mistakes beginners make.** (1) Storing values instead of indices on the stack — you almost always need indices to compute distances or widths. (2) Confusing when to use an increasing vs. decreasing stack — for "next greater," use a decreasing stack (so the arriving element that violates it is the "greater" answer). (3) Forgetting to handle elements that remain on the stack after the loop (they have no next greater/smaller element). (4) Off-by-one errors in width calculations, especially in histogram problems where an empty stack means the bar extends all the way to the left boundary.

### Core Algorithm: Next Greater Element

```java
import java.util.*;

// For each element, find the next element to the right that is greater.
public static int[] nextGreater(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    ArrayDeque<Integer> stack = new ArrayDeque<>(); // stores indices, decreasing order

    for (int i = 0; i < n; i++) {
        // Pop all elements smaller than nums[i] — nums[i] is their answer
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    return result;
}
```

### What is a Monotonic Deque?

A **monotonic deque** extends the idea to sliding windows. It maintains candidates for the window's min or max in a deque, discarding elements that can never be the answer. This gives **O(1) amortized** min/max queries in a sliding window.

```java
// Maximum in every window of size k.
public static int[] slidingWindowMax(int[] nums, int k) {
    ArrayDeque<Integer> dq = new ArrayDeque<>(); // stores indices, decreasing order
    int[] result = new int[nums.length - k + 1];
    int idx = 0;

    for (int i = 0; i < nums.length; i++) {
        // Remove elements outside the window
        while (!dq.isEmpty() && dq.peekFirst() < i - k + 1)
            dq.pollFirst();
        // Maintain decreasing order
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i])
            dq.pollLast();
        dq.addLast(i);
        if (i >= k - 1)
            result[idx++] = nums[dq.peekFirst()];
    }
    return result;
}
```

<AlgoViz
  title="Sliding Window Maximum — Monotonic Deque"
  description="Find the maximum in every window of size k=3 for nums = [1, 3, -1, -3, 5, 3]. The deque stores indices in decreasing value order; front = current window max."
  steps={[
    { array: [1,3,-1,-3,5,3], highlights: [], stack: [], variables: { k: "3", deque: "[]", result: "[]" }, explanation: "Initialize deque and result. Window size k=3. We output the max of every 3-element window.", code: "ArrayDeque<Integer> dq = new ArrayDeque<>();\nint[] result = new int[n - k + 1];" },
    { array: [1,3,-1,-3,5,3], highlights: [0], stack: [0], variables: { i: "0", deque: "[0]", result: "[]" }, explanation: "i=0: Deque empty, addLast index 0 (value 1). Window not yet full (i < k-1=2).", code: "dq.addLast(0);\n// i < k-1, no output yet" },
    { array: [1,3,-1,-3,5,3], highlights: [1], stack: [1], variables: { i: "1", deque: "[1]", result: "[]" }, explanation: "i=1: nums[1]=3 >= nums[deque.last=0]=1 — pollLast (1 can never be a window max while 3 exists). Push 1. Still not full.", code: "// nums[1]=3 >= nums[0]=1\ndq.pollLast();\ndq.addLast(1);" },
    { array: [1,3,-1,-3,5,3], highlights: [2], secondary: [0,1], stack: [1,2], variables: { i: "2", deque: "[1,2]", result: "[3]" }, explanation: "i=2: nums[2]=-1 < nums[1]=3, just addLast. First full window [1,3,-1]. Max = nums[deque.front=1] = 3.", code: "dq.addLast(2);\nresult[0] = nums[dq.peekFirst()]; // 3" },
    { array: [1,3,-1,-3,5,3], highlights: [3], secondary: [1,2], stack: [1,2,3], variables: { i: "3", deque: "[1,2,3]", result: "[3,3]" }, explanation: "i=3: nums[3]=-3 < -1, addLast. Front=1 still valid (1 >= i-k+1=1). Window [3,-1,-3]. Max = nums[1] = 3.", code: "dq.addLast(3);\nresult[1] = nums[dq.peekFirst()]; // 3" },
    { array: [1,3,-1,-3,5,3], highlights: [4], stack: [4], variables: { i: "4", deque: "[4]", result: "[3,3,5]" }, explanation: "i=4: Front=1 < i-k+1=2, expired — pollFirst! Then nums[4]=5 >= all remaining, pollLast everything. Push 4. Max = 5.", code: "dq.pollFirst(); // index 1 expired\n// 5 >= -1 and -3, pollLast all\ndq.addLast(4);\nresult[2] = 5;" },
    { array: [1,3,-1,-3,5,3], highlights: [5], secondary: [3,4], stack: [4,5], variables: { i: "5", deque: "[4,5]", result: "[3,3,5,5]" }, explanation: "i=5: nums[5]=3 < nums[4]=5, addLast. Front=4 valid (4 >= 3). Window [-3,5,3]. Max = nums[4] = 5.", code: "dq.addLast(5);\nresult[3] = nums[dq.peekFirst()]; // 5" },
    { array: [1,3,-1,-3,5,3], highlights: [], stack: [], variables: { result: "[3,3,5,5]" }, explanation: "Done! Sliding window maximums: [3, 3, 5, 5]. Each element entered and left the deque at most once — O(n) total.", code: "return result; // [3, 3, 5, 5]" },
  ]}
/>

### Complexity Analysis

| Operation | Time | Space |
|-----------|------|-------|
| Next Greater/Smaller (one pass) | O(n) | O(n) |
| Sliding Window Max/Min | O(n) | O(k) |
| Largest Rectangle in Histogram | O(n) | O(n) |

### Worked Example: Largest Rectangle in Histogram

**Problem:** Given `heights = [2,1,5,6,2,3]`, find the largest rectangle.

**Why not brute force?** The naive approach considers every pair of bars (i, j) and finds the minimum height between them, computing area as `min_height * (j - i + 1)`. This is O(n²) for enumerating pairs and O(n) for finding the min, giving O(n³) total (or O(n²) with some optimization). For n = 10^5, that is far too slow. We need to find, for each bar, the boundaries where it can extend, and do so in O(n) total.

**Thought process:**
1. For each bar, we need to know how far left and right it can extend (i.e., where the first shorter bar is on each side).
2. This is exactly "previous smaller element" and "next smaller element" — monotonic stack!

```java
public static int largestRectangleArea(int[] heights) {
    ArrayDeque<Integer> stack = new ArrayDeque<>(); // increasing stack of indices
    int maxArea = 0;
    int n = heights.length;

    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i]; // sentinel value to flush remaining bars
        while (!stack.isEmpty() && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
```

**Trace for `[2,1,5,6,2,3]`:**
- i=0: push 0. Stack: [0]
- i=1: h=1 < heights[0]=2, pop 0 → area=2×1=2. Push 1. Stack: [1]
- i=2: push 2. Stack: [1,2]
- i=3: push 3. Stack: [1,2,3]
- i=4: h=2 < heights[3]=6, pop 3 → area=6×1=6. h=2 < heights[2]=5, pop 2 → area=5×2=10. Push 4. Stack: [1,4]
- i=5: push 5. Stack: [1,4,5]
- Sentinel flushes: pop 5 → area=3×1=3, pop 4 → area=2×4=8, pop 1 → area=1×6=6

**Answer: 10** ✓

**Key insight:** Each bar is pushed onto the stack exactly once and popped exactly once, giving O(n) total operations. When a bar is popped, we know its exact left and right boundaries — the left boundary is the new stack top (or the start of the array if the stack is empty), and the right boundary is the current index that triggered the pop.

<AlgoViz
  title="Largest Rectangle in Histogram — Monotonic Stack"
  description="Find the largest rectangle in heights = [2, 1, 5, 6, 2, 3]. An increasing stack tracks bars; when a shorter bar arrives, we pop and compute areas."
  steps={[
    { array: [2,1,5,6,2,3], highlights: [], stack: [], variables: { maxArea: "0", i: "-" }, explanation: "Initialize empty increasing stack. We process each bar and use a sentinel (h=0) at the end to flush remaining bars.", code: "ArrayDeque<Integer> stack = new ArrayDeque<>();\nint maxArea = 0;" },
    { array: [2,1,5,6,2,3], highlights: [0], stack: [0], variables: { i: "0", maxArea: "0" }, explanation: "i=0: Stack empty, push index 0 (height=2).", code: "stack.push(0); // height 2" },
    { array: [2,1,5,6,2,3], highlights: [1], stack: [1], variables: { i: "1", maxArea: "2", poppedHeight: "2", width: "1", area: "2" }, explanation: "i=1: h=1 < heights[0]=2. Pop 0: height=2, stack empty so width=i=1. Area=2. maxArea=2. Push 1.", code: "// Pop: height=2, width=1, area=2\nstack.push(1);" },
    { array: [2,1,5,6,2,3], highlights: [2], stack: [1,2], variables: { i: "2", maxArea: "2" }, explanation: "i=2: h=5 >= heights[1]=1. No pops needed. Push 2.", code: "stack.push(2); // height 5" },
    { array: [2,1,5,6,2,3], highlights: [3], stack: [1,2,3], variables: { i: "3", maxArea: "2" }, explanation: "i=3: h=6 >= heights[2]=5. No pops. Push 3. Stack maintains increasing order.", code: "stack.push(3); // height 6" },
    { array: [2,1,5,6,2,3], highlights: [3,4], stack: [1,2], variables: { i: "4", maxArea: "6", poppedHeight: "6", width: "1", area: "6" }, explanation: "i=4: h=2 < heights[3]=6. Pop 3: height=6, width=4-2-1=1, area=6. maxArea=6.", code: "// Pop idx 3: height=6, width=i-stack.peek()-1=1\nmaxArea = Math.max(2, 6); // 6" },
    { array: [2,1,5,6,2,3], highlights: [2,4], stack: [1,4], variables: { i: "4", maxArea: "10", poppedHeight: "5", width: "2", area: "10" }, explanation: "Still i=4: h=2 < heights[2]=5. Pop 2: height=5, width=4-1-1=2, area=10. maxArea=10! Push 4.", code: "// Pop idx 2: height=5, width=4-1-1=2\nmaxArea = Math.max(6, 10); // 10\nstack.push(4);" },
    { array: [2,1,5,6,2,3], highlights: [5], stack: [1,4,5], variables: { i: "5", maxArea: "10" }, explanation: "i=5: h=3 >= heights[4]=2. Push 5.", code: "stack.push(5); // height 3" },
    { array: [2,1,5,6,2,3], highlights: [], secondary: [1,4,5], stack: [], variables: { i: "6 (sentinel)", maxArea: "10", flushed: "3,8,6" }, explanation: "Sentinel h=0 flushes all: pop 5 (area=3), pop 4 (height=2, width=4, area=8), pop 1 (height=1, width=6, area=6). None beats 10.", code: "// Sentinel flushes remaining bars\n// All areas < 10" },
    { array: [2,1,5,6,2,3], highlights: [2,3], stack: [], variables: { maxArea: "10", answer: "10" }, explanation: "Answer: 10. The largest rectangle spans heights[2..3] with height 5 and width 2.", code: "return maxArea; // 10" },
  ]}
/>

<AlgoViz
  title="Next Greater Element — Monotonic Stack"
  description="Step through the monotonic stack algorithm on nums = [4, 2, 1, 5, 3]. The stack stores indices in decreasing order of their values."
  steps={[
    { array: [4,2,1,5,3], highlights: [], stack: [], variables: { i: "-", result: "[-1,-1,-1,-1,-1]" }, explanation: "Initialize result array with -1s. Stack is empty.", code: "int[] result = new int[n];\nArrays.fill(result, -1);" },
    { array: [4,2,1,5,3], highlights: [0], stack: [0], variables: { i: "0", result: "[-1,-1,-1,-1,-1]" }, explanation: "i=0: Stack is empty, push index 0 (value 4).", code: "stack.push(0);" },
    { array: [4,2,1,5,3], highlights: [1], stack: [0,1], variables: { i: "1", result: "[-1,-1,-1,-1,-1]" }, explanation: "i=1: nums[1]=2 is not greater than nums[0]=4. Just push.", code: "// 2 < 4, no pops\nstack.push(1);" },
    { array: [4,2,1,5,3], highlights: [2], stack: [0,1,2], variables: { i: "2", result: "[-1,-1,-1,-1,-1]" }, explanation: "i=2: nums[2]=1 is not greater than nums[1]=2. Just push.", code: "// 1 < 2, no pops\nstack.push(2);" },
    { array: [4,2,1,5,3], highlights: [2,3], stack: [0,1], variables: { i: "3", result: "[-1,-1,5,-1,-1]" }, explanation: "i=3: nums[3]=5 > nums[2]=1. Pop index 2, set result[2]=5.", code: "result[stack.pop()] = 5; // result[2]=5" },
    { array: [4,2,1,5,3], highlights: [1,3], stack: [0], variables: { i: "3", result: "[-1,5,5,-1,-1]" }, explanation: "Still popping: 5 > nums[1]=2. Pop index 1, set result[1]=5.", code: "result[stack.pop()] = 5; // result[1]=5" },
    { array: [4,2,1,5,3], highlights: [0,3], stack: [], variables: { i: "3", result: "[5,5,5,-1,-1]" }, explanation: "Still popping: 5 > nums[0]=4. Pop index 0, set result[0]=5.", code: "result[stack.pop()] = 5; // result[0]=5" },
    { array: [4,2,1,5,3], highlights: [3], stack: [3], variables: { i: "3", result: "[5,5,5,-1,-1]" }, explanation: "Stack empty. Push index 3 (value 5).", code: "stack.push(3);" },
    { array: [4,2,1,5,3], highlights: [4], stack: [3,4], variables: { i: "4", result: "[5,5,5,-1,-1]" }, explanation: "i=4: nums[4]=3 is not greater than nums[3]=5. Push index 4.", code: "// 3 < 5, no pops\nstack.push(4);" },
    { array: [4,2,1,5,3], highlights: [], stack: [3,4], variables: { result: "[5,5,5,-1,-1]" }, explanation: "Done! Indices 3,4 remain on stack with no next greater element.", code: "return result; // [5,5,5,-1,-1]" },
  ]}
/>

### When to Use (Pattern Recognition)

- **"Next greater element"** or "next smaller element" → Monotonic stack
- **"Previous greater/smaller"** → Monotonic stack (iterate left to right, pop gives previous)
- **"Largest rectangle"**, "maximum width ramp" → Monotonic stack
- **"Sliding window minimum/maximum"** → Monotonic deque
- **"Shortest subarray with sum ≥ K"** (with negatives) → Monotonic deque on prefix sums
- Constraint hint: O(n) expected and naive is O(n²) → Think monotonic stack

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "For each element, find the next element to the right that is greater/smaller" | Monotonic stack (decreasing for next greater, increasing for next smaller) | Direct application: pop resolves the query for the popped element |
| "How many days until a warmer temperature?" | Monotonic stack — result is index difference | "Next greater element" where you return the distance, not the value |
| "Largest rectangle in a histogram" | Increasing monotonic stack with sentinel | Each bar needs its left and right boundaries via "previous/next smaller" |
| "Stock span: how many consecutive days was the price lower or equal?" | Monotonic stack (decreasing) tracking spans | "Previous greater element" gives the left boundary of the span |
| "Sum of subarray minimums/maximums" | Contribution technique with monotonic stack | For each element, count how many subarrays it is the min/max of |
| "Sliding window minimum/maximum" | Monotonic deque (front = answer, expire out-of-window elements) | Deque maintains candidates; amortized O(1) per window slide |
| "Remove K digits to make the smallest number" | Greedy with monotonic increasing stack | Remove a digit when the next digit is smaller (makes number smaller) |
| "Maximum width ramp (max j-i where nums[i] at most nums[j])" | Decreasing stack built from left, then scan from right | Only leftmost candidates for i matter; scan j from right to find widest |
| "Shortest subarray with sum at least K (with negatives)" | Monotonic deque on prefix sums | Deque maintains increasing prefix sums; shrink from front for valid pairs |
| "Trapping rain water" | Monotonic stack or two-pointer | Stack version: pop when current is taller, compute trapped water layer by layer |

---

## Key Patterns & Variants

### Pattern 1: Next Greater / Next Smaller Element
Iterate left-to-right, maintain a stack. When `nums[i]` causes a pop, `nums[i]` is the answer for the popped element.

**Variant — circular array:** Iterate `2n` times using `i % n`.

### Pattern 2: Previous Greater / Previous Smaller Element
Same stack, but instead of recording what pops an element, record what's on top of the stack when you push.

### Pattern 3: Sliding Window Extremes (Deque)
Maintain a deque of indices in monotonic order. Front of deque = current answer. Remove from front if out of window. Remove from back if new element dominates.

### Pattern 4: Contribution Technique
For problems like "sum of subarray minimums" — use monotonic stack to find for each element, how many subarrays it is the min/max of. Its contribution = `value × left_count × right_count`.

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Next Greater Element I | Easy | Monotonic stack + hashmap | [LC 496](https://leetcode.com/problems/next-greater-element-i/) |
| 2 | Daily Temperatures | Medium | Next greater (index diff) | [LC 739](https://leetcode.com/problems/daily-temperatures/) |
| 3 | Next Greater Element II | Medium | Circular array, 2n trick | [LC 503](https://leetcode.com/problems/next-greater-element-ii/) |
| 4 | Sliding Window Maximum | Hard | Monotonic deque | [LC 239](https://leetcode.com/problems/sliding-window-maximum/) |
| 5 | Online Stock Span | Medium | Previous greater (stack of pairs) | [LC 901](https://leetcode.com/problems/online-stock-span/) |
| 6 | Remove K Digits | Medium | Greedy + monotonic stack | [LC 402](https://leetcode.com/problems/remove-k-digits/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Largest Rectangle in Histogram | Hard | Increasing stack | [LC 84](https://leetcode.com/problems/largest-rectangle-in-histogram/) |
| 8 | Maximal Rectangle | Hard | Histogram per row | [LC 85](https://leetcode.com/problems/maximal-rectangle/) |
| 9 | Trapping Rain Water | Hard | Stack or two-pointer | [LC 42](https://leetcode.com/problems/trapping-rain-water/) |
| 10 | Sum of Subarray Minimums | Medium | Contribution technique | [LC 907](https://leetcode.com/problems/sum-of-subarray-minimums/) |
| 11 | Sum of Subarray Ranges | Medium | Min + Max contribution | [LC 2104](https://leetcode.com/problems/sum-of-subarray-ranges/) |
| 12 | 132 Pattern | Medium | Decreasing stack + tracking max | [LC 456](https://leetcode.com/problems/132-pattern/) |
| 13 | Maximum Width Ramp | Medium | Decreasing stack + binary search | [LC 962](https://leetcode.com/problems/maximum-width-ramp/) |
| 14 | Shortest Subarray with Sum at Least K | Hard | Monotonic deque + prefix sums | [LC 862](https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Longest Bounded-Difference Subarray | Medium | Two deques (min+max) | [LC 1438](https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/) |
| 16 | Steps to Make Array Non-decreasing | Medium | Reverse thinking + stack | [LC 2289](https://leetcode.com/problems/steps-to-make-array-non-decreasing/) |
| 17 | Number of Visible People in a Queue | Hard | Decreasing stack | [LC 1944](https://leetcode.com/problems/number-of-visible-people-in-a-queue/) |
| 18 | Maximum Score of a Good Subarray | Hard | Expanding from k with stack | [LC 1793](https://leetcode.com/problems/maximum-score-of-a-good-subarray/) |
| 19 | Sum of Total Strength of Wizards | Hard | Prefix of prefix + stack | [LC 2281](https://leetcode.com/problems/sum-of-total-strength-of-wizards/) |
| 20 | Constrained Subsequence Sum | Hard | DP + monotonic deque | [LC 1425](https://leetcode.com/problems/constrained-subsequence-sum/) |
| 21 | Jump Game VI | Medium | DP + monotonic deque | [LC 1696](https://leetcode.com/problems/jump-game-vi/) |

---

## Weekly Mock Interview

### Question 1: Largest Rectangle in Histogram

**Prompt:** Given an array of integers `heights` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.

**Expected approach:** Monotonic increasing stack. For each bar popped, calculate the width using the current index and the new top of stack.

**Optimal complexity:** O(n) time, O(n) space

**Follow-up 1:** How would you extend this to a 2D matrix of 0s and 1s to find the maximal rectangle containing only 1s? (→ LC 85)

**Follow-up 2:** What if the histogram is circular (the bars wrap around)? How would your approach change?

**Time target:** 20 minutes

### Question 2: Shortest Subarray with Sum at Least K

**Prompt:** Given an integer array `nums` and an integer `k`, return the length of the shortest non-empty subarray with sum at least `k`. If no such subarray exists, return -1. Note: `nums` can contain negative numbers.

**Expected approach:** Prefix sums + monotonic deque. The deque maintains increasing prefix sums. For each new prefix sum, shrink from the front (valid candidates) and from the back (dominated candidates).

**Optimal complexity:** O(n) time, O(n) space

**Follow-up 1:** Why can't we use the standard sliding window technique here? (Because of negative numbers — the window sum is not monotonic when expanding.)

**Follow-up 2:** If all numbers were positive, what simpler approach would work? (Standard two-pointer sliding window in O(n).)

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Off-by-one in width calculation:** When computing width after popping, if the stack is empty, the width extends to the beginning (width = `i`), not `i - 1`.
- **Equal elements:** Decide whether your stack is strictly increasing or non-strictly. For contribution counting (LC 907), use strict on one side and non-strict on the other to avoid double-counting.
- **Sentinel technique:** Appending a 0 to the histogram (or -∞ to general arrays) forces all remaining elements to be flushed from the stack, simplifying the code.
- **Deque window validity:** Always check `dq[0] < i - k + 1` before accessing the front, not after.

---

## Further Reading

- [VNOI Wiki — Deque and Sliding Window Min/Max](https://wiki.vnoi.info/)
- [CP-Algorithms — Monotonic Stack](https://cp-algorithms.com/)
- [Big-O Coding CP Level 1 — Lecture 20: Monotonic Queue + Stack](https://bigocoding.com/cp-level-1/)
