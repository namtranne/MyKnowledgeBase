---
sidebar_position: 20
title: "Week 19: Monotonic Stack + Advanced Sliding Window"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 19: Monotonic Stack + Advanced Sliding Window

Welcome to **Week 19** of the 20-week DSA Foundations roadmap. This week merges two of the most elegant and high-yield patterns in competitive programming and interviews: **monotonic stacks** and **advanced sliding window** techniques. You already know basic stacks and fixed/variable windows — now you'll see how keeping a stack or deque in sorted order lets you answer "next greater," "previous smaller," "largest rectangle," and "subarray contribution" queries in linear time, and how deque-based windows extend the sliding-window paradigm to track running max/min without brute force.

---

## 1 · Core Theory

### 1.1 Monotonic Stack

**Why monotonic stacks exist.** Many array problems boil down to "for each element, find the nearest element that is larger (or smaller)." A brute-force approach scans left or right from every element, giving O(n^2). A monotonic stack answers ALL such queries in a single O(n) pass. The trick is that maintaining a sorted invariant on the stack means every push and pop contributes exactly one useful answer. Elements that can never be the answer are discarded immediately, and no element is revisited.

**Intuition.** Imagine a queue of people at an amusement park, ordered by height. You are walking along the queue, and for each person you want to know: "who is the first taller person ahead of them?" If you scan from the back, you maintain a stack of "unresolved" people. When you encounter someone taller than the stack top, the top person has found their answer (the current person). You keep popping until the invariant holds, then push the current person. It is like a sequence of dominoes falling — each domino knocks down exactly the ones it is taller than.

**Interview signals.** "Next greater element." "Daily temperatures — how many days until a warmer day?" "Largest rectangle in histogram." "Sum of subarray minimums." "Trapping rain water (stack approach)." "Remove K digits to minimize the number." Any problem asking about the nearest larger or smaller element, or area calculations bounded by array values.

**Common mistakes.** Storing values instead of indices (you almost always need indices to compute distances). Getting the inequality direction wrong (strictly greater vs greater-or-equal). Not handling the elements remaining on the stack after processing all elements (they have no "next greater/smaller" — assign a default like -1 or array length).

A **monotonic stack** is a regular stack whose elements are maintained in strictly increasing or strictly decreasing order from bottom to top. Whenever you try to push an element that violates the order, you pop until the invariant holds again. Each element enters and leaves the stack at most once, so the total work across all pushes is **O(n)**.

#### Increasing vs Decreasing

| Variant | Invariant (bottom → top) | What the popped element learns | Classic use |
|---|---|---|---|
| Monotonically **increasing** | Each element is **smaller** than the one above | Its **next greater** element to the right | Next Greater Element, Daily Temperatures |
| Monotonically **decreasing** | Each element is **larger** than the one above | Its **next smaller** element to the right | Largest Rectangle in Histogram, Sum of Subarray Mins |

> **Tip:** The naming can be confusing because different sources flip the convention. Focus on the **invariant** — "what order do the values have from bottom to top?" — rather than the label.

#### Why It Works

Consider scanning an array left-to-right. For each element `nums[i]`:

1. While the stack is non-empty and `nums[i]` **violates** the invariant with the stack top, the top has found its answer (e.g., `nums[i]` is its "next greater element"). Pop it and record the answer.
2. Push `nums[i]` onto the stack.

Elements remaining on the stack at the end have no answer (e.g., no next greater element exists).

### 1.2 Next Greater / Next Smaller Element

The most fundamental monotonic-stack pattern.

**Next Greater Element (right):** For each `nums[i]`, find the first `nums[j]` where `j > i` and `nums[j] > nums[i]`. If none, answer is `-1`.

**Next Smaller Element (right):** Same, but `nums[j] < nums[i]`.

You can also compute **Previous Greater** or **Previous Smaller** by scanning right-to-left, or by reading the stack at push time (the element just below the new entry is the "previous" answer).

### 1.3 Histogram Problems — Largest Rectangle

The **Largest Rectangle in Histogram** (LeetCode 84) is the archetypal monotonic-stack problem:

- For each bar of height `h[i]`, find how far left and right it can extend as the **minimum** bar.
- The answer for bar `i` is `h[i] * (right_boundary - left_boundary - 1)`.
- A monotonically **increasing** stack (by height) lets you compute both boundaries in one pass: when a bar is popped, the current index is its right boundary, and the new stack top is its left boundary.

### 1.4 Contribution Technique (Sum of Subarray Mins / Maxs)

**Why the contribution technique matters.** This is one of the most powerful problem-solving reframes in algorithm design. The naive approach iterates over all O(n^2) subarrays and computes the min/max of each — O(n^2) at best, O(n^3) at worst. The contribution technique flips the question from "what is the min of each subarray?" to "how many subarrays is each element the min of?" This turns a double loop into a single linear pass with a monotonic stack.

**Intuition.** Imagine you are the shortest person in a group photo. How many subgroups can be formed where you are still the shortest? The answer depends on how far left and right you can extend before encountering someone shorter. If there are 3 people to your left who are taller, and 4 to your right who are taller, you are the minimum of 3 * 4 = 12 different subgroups. Multiply your height by 12 to get your total contribution. Sum over all people, and you have the answer — no need to enumerate subgroups.

Many problems ask: "What is the sum of `f(subarray)` over all contiguous subarrays?" where `f` is min, max, or some order-statistic.

**Key insight — flip the question:** Instead of iterating over subarrays (O(n&sup2;)), ask *"how many subarrays is `nums[i]` the minimum (or maximum) of?"*

For each element `nums[i]`:

- Let `left[i]` = distance to the **previous smaller** element (or start of array).
- Let `right[i]` = distance to the **next smaller** element (or end of array).
- `nums[i]` is the minimum of `left[i] * right[i]` subarrays.
- Its **contribution** to the total sum is `nums[i] * left[i] * right[i]`.

Total answer = sum of all contributions. The previous/next smaller arrays are computed in O(n) with a monotonic stack.

**Handling duplicates:** To avoid double-counting, use **strict** inequality on one side and **non-strict** on the other (e.g., previous *strictly* smaller, next *smaller-or-equal*).

### 1.5 Deque-Based Sliding Window for Max / Min

A **monotonic deque** (double-ended queue) lets you track the maximum or minimum of a sliding window of size `k` in O(n) total:

1. Maintain a deque of **indices** whose corresponding values are in decreasing order (for max) or increasing order (for min).
2. Before pushing index `i`, pop from the **back** while the deque's back value is worse than `nums[i]`.
3. Pop from the **front** if the front index has left the window (`front index < i - k + 1`).
4. The **front** of the deque is always the current window's max (or min).

Each index enters and exits the deque at most once → **O(n)** total.

### 1.6 Advanced Variable Window with Auxiliary Structures

Some variable-width window problems need more than two pointers. Common auxiliary structures:

| Structure | Purpose | Example problem |
|---|---|---|
| Hash map (counter) | Track character/element frequencies inside the window | Longest Substring with At Most K Distinct Characters |
| Sorted container / multiset | Maintain sorted order of window elements | Longest Bounded-Difference Subarray |
| Monotonic deque (max + min) | Track window max and min simultaneously | Longest Subarray where `max - min` is at most `limit` |
| Prefix sums + monotonic deque | Find shortest subarray with sum at least `K` (with negatives) | Shortest Subarray with Sum at Least K |

The general template is:

1. Expand the window by moving `right`.
2. Update the auxiliary structure.
3. While the window violates a constraint, shrink from `left` and update.
4. Record the answer.

---

## 2 · Code Templates

### 2.1 Next Greater Element (Monotonic Stack)

```java
public static int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // indices, values increasing bottom-to-top
    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && nums[i] > nums[stack.peek()]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    return result;
}
```

**Time:** O(n) — each element is pushed and popped at most once.
**Space:** O(n).

<AlgoViz
  title="Next Greater Element: Monotonic Stack on [4, 2, 6, 1, 3]"
  description="For each element, find the next element to its right that is greater. A monotonic increasing stack (bottom-to-top) processes elements left-to-right. When an element is greater than the stack top, the top has found its next greater."
  steps={[
    { array: [4,2,6,1,3], highlights: [0], stack: [0], variables: { result: "[-1,-1,-1,-1,-1]", action: "Push 0" }, explanation: "i=0, val=4. Stack empty, push index 0. Stack: [0(val=4)].", code: "stack.push(0); // val=4" },
    { array: [4,2,6,1,3], highlights: [1], stack: [0,1], variables: { result: "[-1,-1,-1,-1,-1]", action: "Push 1", compare: "2 < 4" }, explanation: "i=1, val=2. 2 < 4 (stack top), no pop. Push index 1. Stack: [0(4), 1(2)].", code: "// 2 < nums[stack.peek()]=4, push 1" },
    { array: [4,2,6,1,3], highlights: [2], secondary: [0,1], stack: [], stackHighlights: [0,1], variables: { result: "[6,6,-1,-1,-1]", action: "Pop 1,0 then Push 2" }, explanation: "i=2, val=6. 6>2: pop 1, result[1]=6. 6>4: pop 0, result[0]=6. Stack empty. Push 2.", code: "result[1]=6; result[0]=6; stack.push(2);" },
    { array: [4,2,6,1,3], highlights: [3], stack: [2,3], variables: { result: "[6,6,-1,-1,-1]", action: "Push 3", compare: "1 < 6" }, explanation: "i=3, val=1. 1 < 6 (stack top), no pop. Push index 3. Stack: [2(6), 3(1)].", code: "// 1 < nums[stack.peek()]=6, push 3" },
    { array: [4,2,6,1,3], highlights: [4], secondary: [3], stack: [2], stackHighlights: [1], variables: { result: "[6,6,-1,3,-1]", action: "Pop 3, Push 4" }, explanation: "i=4, val=3. 3>1: pop 3, result[3]=3. 3<6: stop popping. Push 4. Stack: [2(6), 4(3)].", code: "result[3]=3; stack.push(4);" },
    { array: [4,2,6,1,3], highlights: [], stack: [2,4], variables: { result: "[6,6,-1,3,-1]", remaining: "idx 2 and 4 have no next greater" }, explanation: "End of array. Elements left on stack (indices 2,4) have no next greater element — their result stays -1.", code: "// stack not empty: result[2]=-1, result[4]=-1" },
    { array: [4,2,6,1,3], highlights: [0,1,2,3,4], variables: { result: "[6,6,-1,3,-1]", pushes: 5, pops: 3 }, explanation: "Final: [6,6,-1,3,-1]. Each element pushed once, popped at most once → O(n) total.", code: "return result; // [6, 6, -1, 3, -1]" }
  ]}
/>

### 2.2 Largest Rectangle in Histogram

```java
public static int largestRectangleArea(int[] heights) {
    Deque<int[]> stack = new ArrayDeque<>(); // {index, height}, increasing
    int maxArea = 0;
    for (int i = 0; i < heights.length; i++) {
        int start = i;
        while (!stack.isEmpty() && stack.peek()[1] > heights[i]) {
            int[] top = stack.pop();
            maxArea = Math.max(maxArea, top[1] * (i - top[0]));
            start = top[0];
        }
        stack.push(new int[]{start, heights[i]});
    }
    while (!stack.isEmpty()) {
        int[] top = stack.pop();
        maxArea = Math.max(maxArea, top[1] * (heights.length - top[0]));
    }
    return maxArea;
}
```

**Time:** O(n). **Space:** O(n).

### 2.3 Sliding Window Maximum (Monotonic Deque)

```java
public static int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> dq = new ArrayDeque<>(); // indices, values decreasing front-to-back
    int[] result = new int[nums.length - k + 1];
    int ri = 0;
    for (int i = 0; i < nums.length; i++) {
        while (!dq.isEmpty() && dq.peekFirst() < i - k + 1)
            dq.pollFirst();
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i])
            dq.pollLast();
        dq.offerLast(i);
        if (i >= k - 1)
            result[ri++] = nums[dq.peekFirst()];
    }
    return result;
}
```

**Time:** O(n). **Space:** O(k).

<AlgoViz
  title="Sliding Window Maximum: nums=[1,3,-1,-3,5,3,6,7], k=3"
  description="Use a monotonic deque (decreasing values front-to-back) to track the maximum in each window of size 3. The deque front is always the current window max."
  steps={[
    { array: [1,3,-1,-3,5,3,6,7], highlights: [0], variables: { k: 3, deque: "[0]", window: "forming" }, explanation: "i=0: push index 0 (val=1). Window not yet full (need k=3 elements).", code: "dq.offerLast(0); // val=1" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [0,1], secondary: [1], variables: { deque: "[1]", action: "Remove 0 (1<3), add 1", window: "forming" }, explanation: "i=1: val=3 > val at back(1). Pop index 0. Push index 1. Deque: [1(val=3)].", code: "dq.pollLast(); dq.offerLast(1); // 3 > 1" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [0,1,2], secondary: [0], variables: { deque: "[1, 2]", windowMax: 3, result: "[3]" }, explanation: "i=2: val=-1 < 3, just push. Deque: [1(3), 2(-1)]. Window [0,1,2] complete. Max = nums[front] = 3.", code: "result[0] = nums[dq.peekFirst()]; // 3" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [1,2,3], variables: { deque: "[1, 2, 3]", windowMax: 3, result: "[3, 3]" }, explanation: "i=3: val=-3 < -1, push. Deque: [1(3),2(-1),3(-3)]. Front index 1 is in window. Max = 3.", code: "result[1] = nums[dq.peekFirst()]; // 3" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [2,3,4], secondary: [4], variables: { deque: "[4]", windowMax: 5, result: "[3, 3, 5]", evicted: "1(expired),2,3(smaller)" }, explanation: "i=4: val=5. Pop back: -3<5, -1<5. Pop front: index 1 expired. Push 4. Max = 5.", code: "result[2] = 5; // deque=[4]" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [3,4,5], variables: { deque: "[4, 5]", windowMax: 5, result: "[3, 3, 5, 5]" }, explanation: "i=5: val=3 < 5, just push. Deque: [4(5),5(3)]. Max = nums[4] = 5.", code: "result[3] = nums[dq.peekFirst()]; // 5" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [4,5,6], secondary: [6], variables: { deque: "[6]", windowMax: 6, result: "[3, 3, 5, 5, 6]" }, explanation: "i=6: val=6 > 3, > 5. Pop both. Push 6. Max = 6.", code: "result[4] = 6; // deque=[6]" },
    { array: [1,3,-1,-3,5,3,6,7], highlights: [5,6,7], secondary: [7], variables: { deque: "[7]", windowMax: 7, result: "[3, 3, 5, 5, 6, 7]" }, explanation: "i=7: val=7 > 6. Pop 6. Push 7. Max = 7. Final result: [3,3,5,5,6,7].", code: "result[5] = 7; // done" }
  ]}
/>

### 2.4 Sum of Subarray Minimums (Contribution Technique)

```java
public static int sumSubarrayMins(int[] arr) {
    int MOD = 1_000_000_007;
    int n = arr.length;
    int[] prevLess = new int[n], nextLess = new int[n];
    Arrays.fill(prevLess, -1);
    Arrays.fill(nextLess, n);
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < n; i++) { // previous strictly less
        while (!stack.isEmpty() && arr[stack.peek()] >= arr[i]) stack.pop();
        if (!stack.isEmpty()) prevLess[i] = stack.peek();
        stack.push(i);
    }
    stack.clear();
    for (int i = n - 1; i >= 0; i--) { // next less-or-equal
        while (!stack.isEmpty() && arr[stack.peek()] > arr[i]) stack.pop();
        if (!stack.isEmpty()) nextLess[i] = stack.peek();
        stack.push(i);
    }

    long total = 0;
    for (int i = 0; i < n; i++) {
        long leftCount = i - prevLess[i];
        long rightCount = nextLess[i] - i;
        total = (total + (long) arr[i] * leftCount % MOD * rightCount) % MOD;
    }
    return (int) total;
}
```

**Time:** O(n). **Space:** O(n).

<AlgoViz
  title="Sum of Subarray Minimums (Contribution): arr=[3,1,2,4]"
  description="For each element, count how many subarrays have it as the minimum using previous-less and next-less-or-equal boundaries. Total = sum of arr[i] × left[i] × right[i]."
  steps={[
    { array: [3,1,2,4], highlights: [], variables: { goal: "Sum of min(sub) for all subarrays", subarrays: 10 }, explanation: "Goal: sum min(sub) over all 10 contiguous subarrays of [3,1,2,4]. Instead of checking each subarray, we compute each element's contribution.", code: "// Contribution: how many subarrays is arr[i] the minimum of?" },
    { array: [3,1,2,4], highlights: [0], variables: { i: 0, val: 3, prevLess: -1, nextLessOrEq: 1, left: 1, right: 1, contribution: "3×1×1=3" }, explanation: "i=0, val=3: no previous smaller (prevLess=-1). Next smaller-or-equal is index 1 (val=1). left=0-(-1)=1, right=1-0=1. It's the min of 1 subarray: [3]. Contribution: 3.", code: "// arr[0]=3: left=1, right=1, contrib = 3*1*1 = 3" },
    { array: [3,1,2,4], highlights: [1], variables: { i: 1, val: 1, prevLess: -1, nextLessOrEq: 4, left: 2, right: 3, contribution: "1×2×3=6" }, explanation: "i=1, val=1: no previous smaller. No next smaller-or-equal (boundary=4). left=1-(-1)=2, right=4-1=3. It's the min of 2×3=6 subarrays. Contribution: 1×6=6.", code: "// arr[1]=1: left=2, right=3, contrib = 1*2*3 = 6" },
    { array: [3,1,2,4], highlights: [2], variables: { i: 2, val: 2, prevLess: 1, nextLessOrEq: 4, left: 1, right: 2, contribution: "2×1×2=4" }, explanation: "i=2, val=2: previous smaller at index 1 (val=1). No next smaller-or-equal. left=2-1=1, right=4-2=2. Min of 1×2=2 subarrays: [2], [2,4]. Contribution: 2×2=4.", code: "// arr[2]=2: left=1, right=2, contrib = 2*1*2 = 4" },
    { array: [3,1,2,4], highlights: [3], variables: { i: 3, val: 4, prevLess: 2, nextLessOrEq: 4, left: 1, right: 1, contribution: "4×1×1=4" }, explanation: "i=3, val=4: previous smaller at index 2 (val=2). No next smaller-or-equal. left=3-2=1, right=4-3=1. Min of 1 subarray: [4]. Contribution: 4×1=4.", code: "// arr[3]=4: left=1, right=1, contrib = 4*1*1 = 4" },
    { array: [3,1,2,4], highlights: [0,1,2,3], variables: { contributions: "3 + 6 + 4 + 4", total: 17, bruteForceCheck: "3+1+2+4+1+1+2+1+1+1=17" }, explanation: "Total = 3+6+4+4 = 17. Verified against brute force: mins of all 10 subarrays sum to 17. Contribution technique runs in O(n) vs O(n²).", code: "return (3 + 6 + 4 + 4) % MOD; // 17" }
  ]}
/>

<AlgoViz
  title="Trapping Rain Water (Stack-Based): heights=[0,1,0,2,1,0,1,3]"
  description="Use a monotonic decreasing stack. When a taller bar is found, pop and compute trapped water between the current bar, the popped bar, and the new stack top."
  steps={[
    { array: [0,1,0,2,1,0,1,3], highlights: [0], stack: [], variables: { water: 0, action: "Skip h=0" }, explanation: "i=0, h=0. Push index 0. Stack: [0]. No water can be trapped at height 0.", code: "stack.push(0); // h=0" },
    { array: [0,1,0,2,1,0,1,3], highlights: [1], stack: [1], secondary: [0], variables: { water: 0, action: "Pop 0, push 1" }, explanation: "i=1, h=1 > h[0]=0. Pop 0 (bottom=0, no stack below to bound left side). Push 1. Stack: [1].", code: "stack.pop(); // no left wall, no water. stack.push(1);" },
    { array: [0,1,0,2,1,0,1,3], highlights: [2], stack: [1,2], variables: { water: 0, action: "Push 2" }, explanation: "i=2, h=0 < h[1]=1. Push 2. Stack: [1(h=1), 2(h=0)]. Decreasing order maintained.", code: "stack.push(2); // h=0 < stack top" },
    { array: [0,1,0,2,1,0,1,3], highlights: [3], secondary: [1,2], variables: { water: 1, popped: "idx 2 (h=0)", width: 1, bounded: "min(h[1],h[3])-h[2] = 1-0 = 1" }, explanation: "i=3, h=2. Pop idx 2 (h=0). Left wall=h[1]=1, right wall=h[3]=2. Water = min(1,2)-0 = 1, width=1. +1 water.", code: "water += (min(1,2) - 0) * (3-1-1); // +1" },
    { array: [0,1,0,2,1,0,1,3], highlights: [3], secondary: [1], stack: [3], variables: { water: 2, popped: "idx 1 (h=1)", width: 1, bounded: "min(h[3],h[3])-h[1]... no, 2-1=1" }, explanation: "Still i=3. Pop idx 1 (h=1). Stack empty, so no further left wall. Actually h[3]=2>h[1]=1 but stack below is empty. Push 3. Total water so far: 1.", code: "stack.push(3); // h=2" },
    { array: [0,1,0,2,1,0,1,3], highlights: [4,5], stack: [3,4,5], variables: { water: 1, action: "Push 4,5" }, explanation: "i=4 (h=1): 1 < 2, push. i=5 (h=0): 0 < 1, push. Stack: [3(2), 4(1), 5(0)]. Decreasing order.", code: "stack.push(4); stack.push(5); // decreasing" },
    { array: [0,1,0,2,1,0,1,3], highlights: [6], secondary: [4,5], stack: [3,4], variables: { water: 2, popped: "idx 5 (h=0)", bounded: "min(h[4],h[6])-0 = 1" }, explanation: "i=6, h=1. Pop idx 5 (h=0). Left=h[4]=1, right=h[6]=1. Water = min(1,1)-0 = 1, width=1. +1. Total=2.", code: "water += (min(1,1) - 0) * 1; // +1, total=2" },
    { array: [0,1,0,2,1,0,1,3], highlights: [7], secondary: [3,4,6], stack: [7], variables: { water: 6, popped: "6,4,3", detail: "pop 6:+0, pop 4:+2, pop 3:+2" }, explanation: "i=7, h=3. Pop 6(h=1): left=h[4]=1, bounded=0. Pop 4(h=1): left=h[3]=2, water+=(min(2,3)-1)*2=2. Pop 3(h=2): stack empty. Total water=2+2+1+1=6.", code: "return water; // 6" }
  ]}
/>

---

## 3 · Complexity Reference

| Technique | Time | Space | Key constraint |
|---|---|---|---|
| Next greater/smaller element | O(n) | O(n) | Each element pushed/popped once |
| Largest Rectangle in Histogram | O(n) | O(n) | Increasing stack by height |
| Contribution (sum of subarray mins) | O(n) | O(n) | Two monotonic-stack passes |
| Deque sliding window max/min | O(n) | O(k) | Deque size bounded by window |
| Variable window + hash map | O(n) | O(k) | k = alphabet / distinct limit |
| Variable window + two deques (max+min) | O(n) | O(n) | Track both extremes |
| Prefix sum + monotonic deque | O(n) | O(n) | Handles negative values |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "next greater element for each position" | Monotonic increasing stack, push indices | Next Greater Element (Template 2.1) |
| "daily temperatures / days until warmer" | Same as next greater, compute index difference | Monotonic stack on indices |
| "largest rectangle in histogram" | Increasing stack by height, compute area on pop | Histogram (Template 2.2) |
| "maximal rectangle in a binary matrix" | Row-by-row histogram, apply Template 2.2 per row | Histogram per row |
| "sum of subarray minimums / maximums" | Contribution technique with prev/next smaller | Contribution (Template 2.4) |
| "sum of subarray ranges (max - min)" | Two contribution passes: sum of maxs minus sum of mins | Double contribution |
| "sliding window maximum / minimum" | Monotonic deque (decreasing for max, increasing for min) | Deque (Template 2.3) |
| "trapping rain water" | Monotonic stack or two pointers | Stack-based trap |
| "longest subarray with max - min at most limit" | Two deques tracking window max and min simultaneously | Two-deque window |
| "shortest subarray with sum at least K (negatives allowed)" | Prefix sums plus monotonic increasing deque | Prefix + Deque |

---

## 4 · Worked Example: Largest Rectangle in Histogram

**Why not brute force?** For each bar, you could scan left and right to find the boundaries where the bar can extend — O(n) per bar, O(n^2) total. The monotonic stack approach computes both boundaries for every bar in a single O(n) pass. When a bar is popped from the stack, the current index is its right boundary and the new stack top is its left boundary — all the information needed to compute its maximum rectangle.

**Key insight:** The stack maintains increasing heights from bottom to top. When a shorter bar arrives, all taller bars on the stack can no longer extend rightward — their rectangle terminates here. The "start index" trick (inheriting the popped bar's start index) handles the leftward extension. This dual-boundary computation in a single pass is what makes the monotonic stack so elegant.

**Problem (LeetCode 84):** Given an array `heights` representing bar heights in a histogram (each bar width = 1), find the area of the largest rectangle.

**Input:** `heights = [2, 1, 5, 6, 2, 3]`

### Step-by-Step Stack Trace

We use a stack of `(index, height)` pairs. The stack maintains **increasing** heights from bottom to top.

| Step | `i` | `h` | Stack before | Action | Area computed | Stack after | `max_area` |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | `[]` | Push `(0, 2)` | — | `[(0,2)]` | 0 |
| 2 | 1 | 1 | `[(0,2)]` | `2 > 1` → pop `(0,2)`: area = `2*(1-0)=2`. Start = 0. Push `(0,1)` | 2 | `[(0,1)]` | 2 |
| 3 | 2 | 5 | `[(0,1)]` | `1 < 5` → Push `(2,5)` | — | `[(0,1),(2,5)]` | 2 |
| 4 | 3 | 6 | `[(0,1),(2,5)]` | `5 < 6` → Push `(3,6)` | — | `[(0,1),(2,5),(3,6)]` | 2 |
| 5 | 4 | 2 | `[(0,1),(2,5),(3,6)]` | `6 > 2` → pop `(3,6)`: area = `6*(4-3)=6`. `5 > 2` → pop `(2,5)`: area = `5*(4-2)=10`. Start = 2. Push `(2,2)` | 6, 10 | `[(0,1),(2,2)]` | 10 |
| 6 | 5 | 3 | `[(0,1),(2,2)]` | `2 < 3` → Push `(5,3)` | — | `[(0,1),(2,2),(5,3)]` | 10 |

**Drain remaining stack** (bars extend to `n = 6`):

| Pop | `(idx, h)` | Area = `h * (6 - idx)` |
|---|---|---|
| `(5, 3)` | `3 * 1 = 3` |
| `(2, 2)` | `2 * 4 = 8` |
| `(0, 1)` | `1 * 6 = 6` |

**Final answer:** `max_area = 10`.

The largest rectangle uses bars at indices 2–3 (heights 5, 6) with minimum height 5 and width 2.

### Animation

<AlgoViz
  title="Largest Rectangle in Histogram"
  description="Monotonic stack (increasing heights) processes heights = [2, 1, 5, 6, 2, 3]. When a shorter bar is encountered, pop and compute area."
  steps={[
    { array: [2, 1, 5, 6, 2, 3], highlights: [0], variables: { stack: "[]", maxArea: 0 }, explanation: "i=0, h=2: Stack empty. Push (0, 2).", code: "stack.push(new int[]{0, 2});" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [1], variables: { stack: "[(0,2)]", maxArea: 0 }, explanation: "i=1, h=1: 2 > 1, pop (0,2). Area = 2 * (1-0) = 2. Push (0, 1).", code: "maxArea = Math.max(0, 2 * 1); // 2" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [2], variables: { stack: "[(0,1)]", maxArea: 2 }, explanation: "i=2, h=5: 1 < 5, just push (2, 5).", code: "stack.push(new int[]{2, 5});" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [3], variables: { stack: "[(0,1),(2,5)]", maxArea: 2 }, explanation: "i=3, h=6: 5 < 6, just push (3, 6).", code: "stack.push(new int[]{3, 6});" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [4], variables: { stack: "[(0,1),(2,5),(3,6)]", maxArea: 2 }, explanation: "i=4, h=2: Pop (3,6), area = 6*1 = 6. Pop (2,5), area = 5*2 = 10. New max = 10! Push (2, 2).", code: "maxArea = Math.max(2, 10); // 10" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [5], variables: { stack: "[(0,1),(2,2)]", maxArea: 10 }, explanation: "i=5, h=3: 2 < 3, just push (5, 3).", code: "stack.push(new int[]{5, 3});" },
    { array: [2, 1, 5, 6, 2, 3], highlights: [], variables: { stack: "drain", maxArea: 10, result: 10 }, explanation: "Drain stack: (5,3) area=3*1=3, (2,2) area=2*4=8, (0,1) area=1*6=6. None beat 10. Final answer: 10.", code: "return maxArea; // 10" },
  ]}
/>

---

## 5 · Problem Sets (21 Problems, 7 Days)

### Days 1–2: Monotonic Stack Fundamentals

| # | Problem | LeetCode | Difficulty | Key idea |
|---|---|---|---|---|
| 1 | Next Greater Element I | 496 | Easy | Hash map + monotonic stack on `nums2` |
| 2 | Next Greater Element II | 503 | Medium | Circular array — iterate `2n`, use `i % n` |
| 3 | Daily Temperatures | 739 | Medium | Stack stores indices; answer is `i - stack_top` |
| 4 | Online Stock Span | 901 | Medium | Decreasing stack tracking consecutive days |
| 5 | Remove K Digits | 402 | Medium | Greedy + increasing stack to remove peaks |
| 6 | Sum of Subarray Minimums | 907 | Medium | Contribution technique with prev/next less |
| 7 | 132 Pattern | 456 | Medium | Reverse scan, decreasing stack tracking `s3` |

### Days 3–4: Histogram and Rectangle Patterns

| # | Problem | LeetCode | Difficulty | Key idea |
|---|---|---|---|---|
| 8 | Largest Rectangle in Histogram | 84 | Hard | Increasing stack; compute area on pop |
| 9 | Maximal Rectangle | 85 | Hard | Row-by-row histogram + LeetCode 84 |
| 10 | Trapping Rain Water | 42 | Hard | Stack-based approach or two-pointer |
| 11 | Maximum Width Ramp | 962 | Medium | Decreasing stack on values, then reverse scan |
| 12 | Visible People in a Queue | 1944 | Hard | Decreasing stack — pop = visible person |
| 13 | Steps to Make Array Non-Decreasing | 2289 | Medium | Stack tracking removal rounds |
| 14 | Sum of Subarray Ranges | 2104 | Medium | Contribution: sum of maxs minus sum of mins |

### Days 5–7: Advanced Sliding Window + Mixed

| # | Problem | LeetCode | Difficulty | Key idea |
|---|---|---|---|---|
| 15 | Sliding Window Maximum | 239 | Hard | Monotonic deque (decreasing) |
| 16 | Longest Substring with At Most K Distinct | 340 | Medium | Variable window + hash map counter |
| 17 | Fruit Into Baskets | 904 | Medium | Longest window with at most 2 distinct |
| 18 | Shortest Subarray with Sum at Least K | 862 | Hard | Prefix sums + increasing deque |
| 19 | Constrained Subsequence Sum | 1425 | Hard | DP + sliding window max via deque |
| 20 | Maximum Score of a Good Subarray | 1793 | Hard | Expand from index `k`, monotonic reasoning |
| 21 | Longest Continuous Subarray (Bounded Diff) | 1438 | Medium | Two deques (max + min) or sorted container |

---

## 6 · Mock Interviews

### Mock Interview 1 — "Subarray Contribution Mastery"

**Interviewer:** "Given an integer array `arr`, return the sum of `min(subarray)` for every contiguous subarray."

**Candidate walkthrough:**

1. **Brute force.** Enumerate all O(n&sup2;) subarrays, find min of each. Total O(n&sup3;) or O(n&sup2;) with running min. Too slow for n = 30,000.

2. **Contribution reframe.** For each `arr[i]`, count how many subarrays have `arr[i]` as their minimum. The count is `left[i] * right[i]` where `left[i]` = number of contiguous elements to the left that are `>= arr[i]` (including `i` itself) and `right[i]` = number to the right that are `> arr[i]`.

3. **Monotonic stack.** Use an increasing stack to compute `prev_less[i]` (index of previous strictly smaller element) and `next_less_or_equal[i]`. Then `left[i] = i - prev_less[i]` and `right[i] = next_less_or_equal[i] - i`.

4. **Total.** Sum `arr[i] * left[i] * right[i]` for all `i`. All operations O(n).

**Follow-ups:**

- **F1: "What if we want the sum of `max(subarray)` instead?"**
  Same technique with a *decreasing* stack. Find previous/next *greater* elements. Contribution = `arr[i] * left[i] * right[i]`.

- **F2: "Sum of Subarray Ranges — sum of `(max - min)` over all subarrays?"**
  Compute `sum_of_maxs - sum_of_mins` using two separate contribution passes.

- **F3: "How do you handle duplicates without double-counting?"**
  Use strict inequality on one side and non-strict on the other. For example, `prev_less` uses `>=` (strictly less means we pop on equal), and `next_less_or_equal` uses `>` (we stop before equal from the right).

- **F4: "Can this approach handle modular arithmetic?"**
  Yes. Since every operation is addition and multiplication, take `mod` at each step. Be careful: the modular result is only valid for the sum, not for intermediate comparisons.

### Mock Interview 2 — "Sliding Window Maximum Under Constraints"

**Interviewer:** "You're given an integer array `nums` and an integer `k`. Return an array of the maximum values in each sliding window of size `k`."

**Candidate walkthrough:**

1. **Naive approach.** For each window position, scan `k` elements to find the max. Time O(n*k). Too slow for n = 100,000.

2. **Heap approach.** Max-heap of `(value, index)`. For each window, push new element, pop elements whose index is out of range. Time O(n log n). Works but not optimal.

3. **Monotonic deque.** Maintain a deque of indices in decreasing order of `nums` value:
   - Before adding `i`, pop from the back while `nums[back] <= nums[i]` (they can never be the answer).
   - Pop from the front if `front < i - k + 1` (out of window).
   - `nums[front]` is the window max.
   Time O(n), space O(k).

4. **Implementation detail.** Start appending to result once `i >= k - 1`.

**Follow-ups:**

- **F1: "What if k is dynamic — each query has a different k?"**
  Precompute a **sparse table** for range-max queries in O(n log n) preprocessing, O(1) per query.

- **F2: "What if you need both the max and the second-max in each window?"**
  Maintain a deque of size at least 2. The front is the max; the second element is the second-max *candidate*, but you need careful handling when the front is popped.

- **F3: "Constrained Subsequence Sum — dp[i] = nums[i] + max(dp[j]) for `j` in `[i-k, i-1]`. How does the deque help?"**
  The DP recurrence needs the maximum of a sliding window of the `dp` array. Use a monotonic deque on `dp` values indexed by position. The deque front gives `max(dp[j])` in O(1). Overall O(n).

- **F4: "Shortest Subarray with Sum at Least K — why doesn't a simple sliding window work?"**
  Because the array can contain **negative** numbers, so the prefix sum is not monotonically increasing. A simple two-pointer doesn't work since shrinking the window can *increase* the sum. Instead, use a **monotonic deque on prefix sums**: maintain an increasing deque of prefix-sum indices. For each `i`, pop from the front while `prefix[i] - prefix[front] >= K` (record length), and pop from the back while `prefix[back] >= prefix[i]` (later starts are never useful).

---

## 7 · Tips and Edge Cases

### Monotonic Stack Pitfalls

- **Empty stack checks.** Always guard `stack[-1]` with `if stack`. Off-by-one errors when the stack is empty usually mean the boundary extends to the start or end of the array.
- **Strict vs non-strict inequality.** Mixing `>` and `>=` incorrectly causes double-counting in contribution problems or missed boundaries in histogram problems. Decide the convention *before* coding and be consistent.
- **Circular arrays.** For "Next Greater Element II," iterate `2n` elements using `i % n` but only store results for indices `0..n-1`.
- **Stack stores indices, not values.** Always push indices so you can compute distances. Access values via `nums[stack[-1]]`.

### Sliding Window Pitfalls

- **Deque stores indices, not values.** Same principle as stacks — you need indices to check whether elements have left the window.
- **Variable window: shrink correctly.** When using a HashMap counter, decrement the leaving element's count and remove the key when count hits 0 to keep `map.size()` accurate.
- **Negative numbers break simple windows.** If the array has negatives, you cannot use a simple two-pointer for "sum at least K" — use prefix sums + monotonic deque instead.
- **Off-by-one in window boundaries.** The window `[i-k+1, i]` has exactly `k` elements. Double-check: when `i = k-1`, the first valid window starts at index 0.

### General Tips

- **Monotonic stack and deque are O(n) amortized.** Each element enters and exits at most once, so despite the inner `while` loop, total work is linear.
- **Draw the stack.** When debugging, trace the stack contents at each step (as shown in the worked example). This catches boundary and inequality bugs fast.
- **Combine patterns.** Several hard problems (Maximal Rectangle, Constrained Subsequence Sum) layer monotonic stacks on top of other techniques (DP, row-by-row histograms). Recognize the sub-problem.
- **`ArrayDeque`** in Java gives O(1) `push`, `pop`, `offerLast`, and `pollFirst`. Do **not** use an `ArrayList` as a deque — `ArrayList.remove(0)` is O(n).
- **Test with all-equal arrays.** This is the most common edge case that breaks duplicate-handling logic in contribution problems.
- **Single-element arrays.** Ensure your code handles `n = 1` correctly — the stack may never pop, and the window may be the entire array.
