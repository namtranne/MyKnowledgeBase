---
sidebar_position: 10
title: "Week 9: Sliding Window + Binary Search"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 9: Sliding Window + Binary Search

Last week you conquered weighted graphs, shortest paths, and Union-Find. This week you learn two of the most **versatile** interview techniques: **sliding window** for subarray/substring problems and **binary search** for logarithmic elimination. Together they solve an enormous slice of medium and hard interview questions — and both reward disciplined template thinking.

---

## 1 · Core Theory

### 1.1 Sliding Window — Fixed Size

**Why this technique exists:** Many problems ask about contiguous subarrays of a given length. A brute-force approach recomputes the aggregate from scratch for each position, costing O(n*k). The sliding window avoids redundant work by incrementally updating the aggregate — adding one element and removing one element — achieving O(n) regardless of k.

**Interview signal:** The problem explicitly mentions a window size or "every k consecutive elements". Phrases like "subarray of length k", "k consecutive", or "window of size k" are dead giveaways.

A **fixed-size window** of width `k` slides across an array one element at a time. You add the incoming element and remove the outgoing element, keeping a running aggregate (sum, max, frequency map, etc.).

**When to use:** the problem explicitly gives you a window size — "subarray of length k", "every consecutive k elements".

**Pattern:**

1. Build the initial window from indices `0 … k-1`.
2. Slide: add `nums[i]`, remove `nums[i - k]`.
3. Update the answer at each position.

**Time:** O(n).  **Space:** O(1) for simple aggregates, O(k) if you maintain a data structure inside the window.

### 1.2 Sliding Window — Variable Size (Shrink / Expand)

**Why this technique exists:** Problems asking for the "longest" or "shortest" subarray/substring satisfying a constraint have an exponential brute-force (check all O(n^2) subarrays). The variable window exploits the fact that both pointers only move forward, guaranteeing O(n) total work despite the nested while loop. This two-pointer monotonicity is the key insight.

**Common mistake:** Confusing where to update the answer. For "longest valid", update **after** shrinking (the window is valid again). For "shortest valid", update **inside** the shrink loop (the window is still valid and you want the tightest fit). Getting this wrong gives incorrect results on nearly every test case.

When the window size is **not fixed**, you expand the right end until a condition breaks, then **shrink** the left end until the condition is restored.

**When to use:** "longest / shortest subarray/substring satisfying some constraint" — e.g., at most k distinct characters, sum ≥ target, no repeating characters.

**Pattern:**

1. Maintain two pointers `left` and `right`, both starting at 0.
2. Expand `right` — include `nums[right]` in the window state.
3. While the window violates the constraint, shrink from the left.
4. Update the answer (longest → after shrinking, shortest → during shrinking).

**Why it works:** both `left` and `right` move only forward, so total pointer movements are at most 2n → O(n).

**Key insight for "longest" vs "shortest":**

| Goal | Update answer | Shrink condition |
|---|---|---|
| Longest valid window | After inner while loop (window is valid again) | While window is invalid |
| Shortest valid window | Inside inner while loop (window is still valid) | While window is valid |

### 1.3 Binary Search — Standard

**Why this technique exists:** Linear search costs O(n). Binary search exploits sorted order (or any monotonic property) to cut the search space in half each step, achieving O(log n). This is one of the most powerful complexity reductions in all of computer science — it turns a million-element search into 20 comparisons.

**Interview signal:** Sorted input, or any problem where you can define a predicate that flips from false to true (or vice versa) at a single boundary point. Also look for constraints like `n` up to 10^9 — only O(log n) algorithms can handle that.

**Common mistake:** Off-by-one errors from mixing up inclusive vs exclusive bounds. Before writing any binary search, explicitly state: (1) are `lo` and `hi` both inclusive? (2) what loop condition do I use? (3) does `mid` stay in the search range or leave it? Answering these three questions prevents nearly all binary search bugs.

Binary search eliminates half the search space each step by comparing the middle element to the target.

**Precondition:** the array (or search space) is **sorted** or has a **monotonic property**.

Three classic variants on a sorted array:

| Variant | Returns | Loop condition | Update rule |
|---|---|---|---|
| Exact match | Index of target, or -1 | `lo <= hi` | `lo = mid + 1` / `hi = mid - 1` |
| Lower bound (bisect_left) | First index where `arr[i] >= target` | `lo < hi` | `lo = mid + 1` / `hi = mid` |
| Upper bound (bisect_right) | First index where `arr[i] > target` | `lo < hi` | `lo = mid + 1` / `hi = mid` |

**Off-by-one prevention:** always ask yourself three questions before coding:

1. What is my search space? (`lo` and `hi` inclusive or exclusive?)
2. When do I stop? (`lo <= hi` vs `lo < hi`)
3. Which half do I keep? (does `mid` stay or leave?)

### 1.4 Binary Search on Answer Space (Parametric Search)

**Why this technique exists:** Some optimisation problems do not have a sorted array to search. Instead, the answer itself lies in a range, and you can check whether a candidate answer is feasible. If feasibility is monotonic (once feasible, all larger/smaller values are too), binary search applies to the answer space directly. This transforms an optimisation problem into a sequence of decision problems.

**Interview signal:** Phrases like "minimise the maximum", "maximise the minimum", "find the smallest value such that", or "what is the minimum speed/capacity" strongly signal binary search on the answer. The feasibility check is typically a greedy O(n) scan.

Sometimes you are not searching through an array — you are searching through the **space of possible answers**.

**Pattern:**

1. Define the answer range `[lo, hi]`.
2. For each candidate `mid`, ask: "Is `mid` a feasible answer?" (write a helper `can(mid)`).
3. Binary search on feasibility: if feasible, try smaller (or larger); otherwise try the other half.

**When to use:** the problem says "minimise the maximum" or "maximise the minimum", or the feasibility check is monotonic (once feasible, all larger/smaller values are also feasible).

**Classic examples:** Koko Eating Bananas (LC 875), Split Array Largest Sum (LC 410), Capacity to Ship Packages (LC 1011).

### 1.5 Search in Rotated Sorted Arrays

**Why this technique exists:** Rotation breaks the global sorted order, so standard binary search does not directly apply. However, at every midpoint, at least one half is still sorted. By identifying the sorted half and checking if the target falls within it, you can still eliminate half the search space each step — preserving O(log n).

**Interview signal:** "sorted and rotated", "rotated sorted array", or "find minimum in rotated array". If duplicates are present (LC 81), the worst case degrades to O(n) because `nums[lo] == nums[mid] == nums[hi]` gives no information about which half to eliminate.

A sorted array rotated at some pivot creates two sorted halves. At each step of binary search you can determine **which half is sorted** and whether the target lies within it.

**Key logic at each step:**

- If `nums[lo] <= nums[mid]` → left half is sorted.
  - If `nums[lo] <= target < nums[mid]` → search left; else search right.
- Else → right half is sorted.
  - If `nums[mid] < target <= nums[hi]` → search right; else search left.

**Variants:** find minimum (LC 153), search for target (LC 33), with duplicates (LC 81, worst case O(n)).

---

## 2 · Code Templates

### 2.1 Fixed-Size Sliding Window

**When to use this template:** Use this whenever the problem specifies a fixed window size k and asks for an aggregate (max sum, average, count) over every window. Replace the `windowSum` variable with whatever aggregate the problem needs — a frequency map for anagram detection, a max-heap for sliding maximum, etc.

```java
public static int fixedWindow(int[] nums, int k) {
    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += nums[i];
    int best = windowSum;

    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];
        best = Math.max(best, windowSum);
    }
    return best;
}
```

### 2.2 Variable-Size Sliding Window (Longest Valid)

**When to use this template:** Use this when the problem asks for the "longest subarray/substring" satisfying a constraint. The key structural element is: expand right, shrink left while invalid, then update the answer (the window is valid again and as large as possible). Adapt the `seen` set to whatever constraint the problem specifies — a frequency map for "at most k distinct", a counter for "at most k zeros", etc.

```java
import java.util.*;

public static int longestWindow(String s) {
    Set<Character> seen = new HashSet<>();
    int left = 0, best = 0;

    for (int right = 0; right < s.length(); right++) {
        while (seen.contains(s.charAt(right))) {
            seen.remove(s.charAt(left));
            left++;
        }
        seen.add(s.charAt(right));
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

### 2.3 Variable-Size Sliding Window (Shortest Valid)

**When to use this template:** Use this when the problem asks for the "shortest" or "minimum length" subarray/substring satisfying a constraint. The critical difference from the longest template is that you update the answer **inside** the shrink loop (the window is valid and you want to tighten it), not after. This pattern covers Minimum Size Subarray Sum (LC 209) and Minimum Window Substring (LC 76).

```java
public static int shortestWindow(int[] nums, int target) {
    int left = 0, total = 0, best = Integer.MAX_VALUE;

    for (int right = 0; right < nums.length; right++) {
        total += nums[right];
        while (total >= target) {
            best = Math.min(best, right - left + 1);
            total -= nums[left];
            left++;
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}
```

### 2.4 Standard Binary Search

**When to use this template:** Use this exact-match template when searching for a specific target in a sorted array. The `lo <= hi` loop with `hi = mid - 1` / `lo = mid + 1` ensures every element is checked exactly once and the loop terminates. If the target does not exist, it returns -1. For insertion-point queries, use the lower/upper bound templates instead.

```java
public static int binarySearch(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

### 2.5 Lower Bound (leftmost insertion point)

**When to use this template:** Use lower bound when you need the first position where a value could be inserted while keeping the array sorted — equivalently, the index of the first element greater than or equal to the target. This is essential for range queries, counting elements in a range, and problems like "how many elements are less than x". Note the `lo < hi` condition and `hi = mid` (not `mid - 1`) — this is the key difference from exact-match binary search.

```java
public static int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

### 2.6 Binary Search on Answer Space

**When to use this template:** Use this when the problem is an optimisation question (minimise or maximise something) and the feasibility of a candidate answer is monotonic. Define `lo` and `hi` as the bounds of possible answers, write a `feasible(mid)` helper that returns true if `mid` is achievable, and let binary search find the boundary. This template finds the **minimum feasible** value; to find the **maximum feasible**, swap the logic (if feasible, `lo = mid`, else `hi = mid - 1`, with `mid = lo + (hi - lo + 1) / 2` to avoid infinite loops).

```java
public static int binarySearchOnAnswer(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (feasible(mid)) hi = mid;   // mid works, try smaller
        else lo = mid + 1;             // mid fails, need bigger
    }
    return lo;
}

private static boolean feasible(int mid) {
    // problem-specific check
    return true;
}
```

---

## 3 · Complexity Reference

| Algorithm | Time | Space | Notes |
|---|---|---|---|
| Fixed sliding window | O(n) | O(1) | Single pass with running aggregate |
| Variable sliding window | O(n) | O(k) | k = alphabet size or constraint size |
| Binary search (standard) | O(log n) | O(1) | Array must be sorted |
| Lower / upper bound | O(log n) | O(1) | Returns insertion point |
| BS on answer space | O(n · log A) | O(1) | A = answer range; n for feasibility check |
| Search in rotated array | O(log n) | O(1) | Two sorted halves |
| Sliding window maximum (deque) | O(n) | O(k) | Monotonic deque maintains max |

---

## 4 · Worked Example: Best Time to Buy and Sell Stock (LC 121)

**Problem:** given `prices` where `prices[i]` is the stock price on day `i`, find the maximum profit from one buy-sell pair (buy before sell). Return 0 if no profit is possible.

**Approach:** single-pass — track the minimum price seen so far and the maximum profit.

### Trace with prices = [7, 1, 5, 3, 6, 4]

| Day | Price | min_price | profit = price - min_price | max_profit |
|---|---|---|---|---|
| 0 | 7 | 7 | 0 | 0 |
| 1 | 1 | 1 | 0 | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

**Answer:** 5 (buy at 1, sell at 6).

### Implementation

```java
public static int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE;
    int maxProfit = 0;

    for (int price : prices) {
        minPrice = Math.min(minPrice, price);
        maxProfit = Math.max(maxProfit, price - minPrice);
    }
    return maxProfit;
}
```

**Why this is a sliding window idea:** you can view it as a variable window where `left` is the day you buy and `right` is the day you sell. When the current price drops below `min_price`, you effectively move the left pointer forward because any future sell is better paired with this new lower buy price.

**Complexity:** O(n) time, O(1) space.

<AlgoViz
  title="Best Time to Buy and Sell Stock — Single Pass"
  description="Track the minimum price seen so far and the maximum profit at each step for prices = [7, 1, 5, 3, 6, 4]."
  steps={[
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [0],
      variables: { minPrice: 7, maxProfit: 0, day: 0 },
      explanation: "Day 0: price = 7. minPrice = 7. Profit = 7 - 7 = 0. maxProfit = 0.",
      code: "minPrice = Math.min(7, 7); maxProfit = Math.max(0, 7 - 7);"
    },
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [1],
      variables: { minPrice: 1, maxProfit: 0, day: 1 },
      explanation: "Day 1: price = 1. New minimum found! minPrice = 1. Profit = 1 - 1 = 0.",
      code: "minPrice = Math.min(1, 7); // 1  maxProfit = Math.max(0, 1 - 1); // 0"
    },
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [2],
      secondary: [1],
      variables: { minPrice: 1, maxProfit: 4, day: 2 },
      explanation: "Day 2: price = 5. Profit = 5 - 1 = 4. maxProfit updates to 4.",
      code: "minPrice = Math.min(5, 1); // 1  maxProfit = Math.max(0, 5 - 1); // 4"
    },
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [3],
      secondary: [1],
      variables: { minPrice: 1, maxProfit: 4, day: 3 },
      explanation: "Day 3: price = 3. Profit = 3 - 1 = 2. maxProfit stays 4.",
      code: "minPrice = Math.min(3, 1); // 1  maxProfit = Math.max(4, 3 - 1); // 4"
    },
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [4],
      secondary: [1],
      variables: { minPrice: 1, maxProfit: 5, day: 4 },
      explanation: "Day 4: price = 6. Profit = 6 - 1 = 5. maxProfit updates to 5! (buy day 1, sell day 4)",
      code: "minPrice = Math.min(6, 1); // 1  maxProfit = Math.max(4, 6 - 1); // 5"
    },
    {
      array: [7, 1, 5, 3, 6, 4],
      highlights: [5],
      secondary: [1],
      variables: { minPrice: 1, maxProfit: 5, day: 5 },
      explanation: "Day 5: price = 4. Profit = 4 - 1 = 3. maxProfit stays 5. Done. Answer = 5.",
      code: "return maxProfit; // 5"
    }
  ]}
/>

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "subarray of length k" or "every k consecutive" | Fixed-size sliding window | O(n) single pass with running aggregate |
| "longest substring/subarray with constraint" | Variable window (expand/shrink, update after shrink) | Two pointers move forward only, giving O(n) |
| "shortest substring/subarray satisfying condition" | Variable window (update inside shrink loop) | Tighten window while valid to find minimum length |
| "find target in sorted array" | Standard binary search (`lo <= hi`) | O(log n) exact match with inclusive bounds |
| "first/last occurrence" or "insertion point" | Lower/upper bound (`lo < hi`, `hi = mid`) | Finds boundary where predicate changes |
| "minimise the maximum" or "maximise the minimum" | Binary search on answer space | Monotonic feasibility allows O(log A) binary search |
| "sorted array rotated at unknown pivot" | Modified binary search (identify sorted half) | One half is always sorted; check if target is in it |
| "sliding window maximum/minimum" | Monotonic deque + fixed window | Deque maintains candidates in O(1) amortised per element |
| "permutation/anagram in string" | Fixed window + frequency map comparison | Window size equals pattern length; slide and compare counts |
| "minimum speed/capacity to finish in time" | BS on answer + greedy feasibility check | Speed/capacity is monotonic: if k works, k+1 also works |

---

## 5 · Practice Problems — 21 Problems in 7 Days

### Day 1–2: Easy-Focused (Foundations)

| # | Problem | Diff | Pattern | Key | LC |
|---|---|---|---|---|---|
| 1 | Best Time to Buy and Sell Stock | Easy | Single pass | ⭐ | 121 |
| 2 | Binary Search | Easy | Standard BS | ⭐ | 704 |
| 3 | Maximum Average Subarray I | Easy | Fixed window | | 643 |
| 4 | Search Insert Position | Easy | Binary search | | 35 |
| 5 | Contains Duplicate II | Easy | Sliding window + hash | | 219 |
| 6 | First Bad Version | Easy | Binary search | | 278 |
| 7 | Squares of a Sorted Array | Easy | Two pointers | | 977 |

**Day 1–2 Targets:**
- Master the standard binary search template — know it cold.
- Implement fixed-size sliding window from scratch.
- Understand the "track minimum so far" pattern for stock problems.

### Day 3–4: Medium-Focused (Core Patterns)

| # | Problem | Diff | Pattern | Key | LC |
|---|---|---|---|---|---|
| 8 | Longest Substring Without Repeating Characters | Medium | Variable window | ⭐ | 3 |
| 9 | Find Minimum in Rotated Sorted Array | Medium | Binary search | ⭐ | 153 |
| 10 | Search in Rotated Sorted Array | Medium | Binary search | ⭐ | 33 |
| 11 | Permutation in String | Medium | Fixed window + freq | ⭐ | 567 |
| 12 | Maximum Length of Repeated Subarray | Medium | Binary search / DP | | 718 |
| 13 | Find Peak Element | Medium | Binary search | | 162 |
| 14 | Koko Eating Bananas | Medium | BS on answer | ⭐ | 875 |

**Day 3–4 Targets:**
- Variable-size window: get comfortable with the expand/shrink loop.
- Rotated array search: draw out the two sorted halves on paper.
- BS on answer: practice writing the `feasible(mid)` helper.

### Day 5–7: Medium / Hard (Advanced Applications)

| # | Problem | Diff | Pattern | Key | LC |
|---|---|---|---|---|---|
| 15 | Minimum Window Substring | Hard | Variable window | ⭐ | 76 |
| 16 | Sliding Window Maximum | Hard | Monotonic deque | ⭐ | 239 |
| 17 | Median of Two Sorted Arrays | Hard | Binary search | ⭐ | 4 |
| 18 | Longest Repeating Character Replacement | Medium | Variable window | | 424 |
| 19 | Minimum Size Subarray Sum | Medium | Variable window | | 209 |
| 20 | Search a 2D Matrix | Medium | Binary search | | 74 |
| 21 | Split Array Largest Sum | Hard | BS on answer | | 410 |

**Day 5–7 Targets:**
- Minimum Window Substring is the **gold standard** variable window problem — study it until it is automatic.
- Monotonic deque for Sliding Window Maximum — a reusable pattern for range-max/min queries.
- Median of Two Sorted Arrays: the hardest binary search problem — partition-based approach.
- BS on answer for Split Array Largest Sum: the feasibility check uses greedy.

---

## 6 · Mock Interviews

### Mock 1: Sliding Window Focus (45 min)

**Opening (0–5 min):**
"Given a string `s`, find the length of the longest substring without repeating characters."
(LC 3)

**Expected approach:** variable-size sliding window with a hash set.

**Follow-ups:**

1. **"What if I asked for the shortest substring containing all characters of string `t`?"**
   → Minimum Window Substring (LC 76). Switch from "longest valid" to "shortest valid" template. Need a frequency map for `t` and a `formed` counter.

2. **"What if we have a stream of characters (infinite length) and we can only store O(k) state?"**
   → The sliding window approach already uses O(k) space where k is the alphabet size. For a stream, you cannot go back — sliding window is the natural fit since it only moves forward.

3. **"Now the constraint changes: the substring can have at most 2 distinct characters. Find the longest such substring."**
   → Longest Substring with At Most K Distinct Characters (k=2). Use a hash map tracking character counts. Shrink when map size exceeds 2.

4. **"What if you need to return the actual substring, not just the length?"**
   → Track `bestLeft` and `bestRight` alongside the length. Return `s.substring(bestLeft, bestRight + 1)`.

### Mock 2: Binary Search Focus (45 min)

**Opening (0–5 min):**
"Koko loves bananas. There are `n` piles. She can eat at most speed `k` bananas/hour from one pile. She has `h` hours. Find the minimum `k` such that she can eat all bananas within `h` hours."
(LC 875)

**Expected approach:** binary search on answer space. `lo=1`, `hi=max(piles)`. Feasibility check: sum of `(pile + k - 1) / k` for each pile &lt;= h.

**Follow-ups:**

1. **"How would you handle it if Koko could switch piles mid-hour?"**
   → The feasibility check changes: instead of ceiling each pile, you just sum all bananas and divide by k (total / k ≤ h). Simpler check, same BS structure.

2. **"Now there are `m` Kokos eating in parallel. Each takes a contiguous segment of piles. Minimise the maximum eating time."**
   → Split Array Largest Sum (LC 410). BS on the maximum time allowed per Koko. Feasibility: greedily assign piles to Kokos — start a new Koko when cumulative sum exceeds the candidate answer.

3. **"What if the piles are on a conveyor belt and she must eat them in order, but she can skip at most `s` piles?"**
   → This adds a sliding window / DP dimension. For each speed `k`, you need a feasibility check that considers skip choices — still BS on answer, but the inner check becomes more complex (DP or greedy with window).

4. **"Prove that the feasibility function is monotonic."**
   → If speed `k` is feasible, then any speed `k' > k` is also feasible because `ceil(pile / k')` ≤ `ceil(pile / k)` for every pile. This monotonicity is what makes binary search valid.

---

## 7 · Tips and Edge Cases

### Sliding Window Pitfalls

- **Empty input:** always handle `nums.length == 0` or `s.length() == 0`.
- **Window larger than array:** if `k > nums.length`, the fixed window is undefined — return early or handle gracefully.
- **Character encoding:** for substring problems, clarify the character set (ASCII 128 vs Unicode). This affects space complexity.
- **Shrink condition off-by-one:** in variable window, make sure you update the window state **before** checking the condition, not after.
- **Frequency map going negative:** when shrinking, decrement counts and remove keys at zero to keep the map size accurate.

### Binary Search Pitfalls

- **Integer overflow on `mid`:** always use `mid = lo + (hi - lo) / 2` instead of `(lo + hi) / 2`.
- **Infinite loops:** if your update never changes `lo` or `hi`, you loop forever. Test with a 2-element array.
- **Off-by-one on bounds:** decide upfront whether `hi` is inclusive or exclusive and stick with it.
- **BS on answer — wrong range:** make sure `lo` and `hi` truly bound all possible answers. For Koko, `lo=1` (not 0, division by zero) and `hi=max(piles)`.
- **Rotated array with duplicates:** when `nums[lo] == nums[mid] == nums[hi]`, you cannot decide which half is sorted. Shrink both ends: `lo += 1; hi -= 1`. Worst case degrades to O(n).

### General Interview Tips

- **Recognise the pattern first:** if the problem involves a contiguous subarray/substring with a constraint, think sliding window. If the search space is sorted or monotonic, think binary search.
- **Draw the window:** for sliding window problems, draw the array and physically slide a bracket across it. This catches edge cases.
- **State your invariants:** for binary search, tell the interviewer: "My invariant is that the answer is always in `[lo, hi]`." This builds confidence and prevents bugs.
- **Combine the two:** some problems use both — e.g., binary search on the answer with a sliding window feasibility check.
- **Test with small inputs:** always trace through arrays of size 0, 1, and 2. Most binary search bugs surface with tiny inputs.

---

## 8 · Week 9 Checklist

Before moving to Week 10, confirm you can:

- [ ] Write fixed and variable sliding window from memory.
- [ ] Implement standard binary search, lower bound, and upper bound without bugs.
- [ ] Solve "binary search on answer" problems by identifying the feasibility function.
- [ ] Handle rotated sorted arrays (find min, search for target).
- [ ] Solve Minimum Window Substring cleanly in under 20 minutes.
- [ ] Explain when sliding window is O(n) despite having a nested while loop.
- [ ] Identify which binary search template to use (`lo <= hi` vs `lo < hi`) based on the problem.
