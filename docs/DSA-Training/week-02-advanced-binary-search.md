---
sidebar_position: 3
title: "Week 2: Advanced Binary Search"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 2: Advanced Binary Search (Parametric Search)

## Theory & Concepts

### Beyond Basic Binary Search

You already know binary search on a sorted array. **Advanced binary search** applies the same principle to the **answer space** rather than the input. Instead of searching for an element, you search for the optimal value that satisfies a condition.

**Key insight:** If a problem asks "minimize the maximum" or "maximize the minimum," the answer is monotonic — if answer `x` works, then `x+1` also works (or vice versa). This means you can binary search on the answer.

**Why this technique exists.** Many optimization problems have a structure where checking "can I achieve answer X?" is much easier than directly computing the optimal answer. For example, "what is the minimum speed to finish eating all bananas in H hours?" is hard to compute directly, but "can Koko finish at speed X?" is a simple linear scan. When the feasibility function is monotonic (there is a threshold where everything below fails and everything above passes, or vice versa), binary search finds that threshold in O(log R) feasibility checks, where R is the range of possible answers. This transforms an optimization problem into a decision problem.

**The intuition — a real-world analogy.** Imagine you are a factory manager choosing the size of delivery trucks. Too small, and you need too many trips and miss the deadline. Too large, and you waste money. You know that if a truck of size X can deliver everything in time, a truck of size X+1 certainly can too. Instead of testing every truck size from 1 to 10,000, you test the midpoint: can a truck of size 5,000 handle it? If yes, try 2,500. If no, try 7,500. You halve the search space each time. This is parametric binary search.

**Interview signals.** Watch for: "minimize the maximum," "maximize the minimum," "minimum speed/capacity/size such that...," "at most K groups/trips/days," or any problem where the constraint is "fit items into bins." If the answer range is enormous (up to 10^9 or 10^18) but checking feasibility for a given answer is O(n), the intended approach is almost certainly binary search on the answer, yielding O(n log R).

**Common mistakes beginners make.** (1) Getting the boundary wrong between "minimize the maximum" (search for the smallest feasible, use `hi = mid`) and "maximize the minimum" (search for the largest feasible, use `lo = mid` with rounding up). (2) Writing an incorrect feasibility check — the binary search framework is trivial; the real challenge is the O(n) predicate. Always test it independently. (3) Choosing wrong bounds for lo and hi: lo should be the smallest value that could possibly be the answer, hi the largest. (4) Integer overflow when computing `mid = (lo + hi) / 2` — always use `lo + (hi - lo) / 2`.

### Core Algorithm: Binary Search on Answer

```java
import java.util.*;

/**
 * Find the minimum value x in [lo, hi] where isFeasible(x) is true.
 * Assumes: if isFeasible(x) is true, then isFeasible(x+1) is also true.
 */
public static int binarySearchOnAnswer(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (isFeasible(mid)) {
            hi = mid;       // mid works, try smaller
        } else {
            lo = mid + 1;   // mid doesn't work, need bigger
        }
    }
    return lo;
}
```

<AlgoViz
  title="Minimize the Maximum — Split Array Largest Sum"
  description="Split nums = [7, 2, 5, 10, 8] into k=2 contiguous subarrays, minimizing the largest subarray sum. Binary search on the answer in [10, 32]."
  steps={[
    { array: [7,2,5,10,8], highlights: [], variables: { lo: "10", hi: "32", k: "2" }, explanation: "Answer range: lo = max(nums) = 10 (a single element must fit), hi = sum(nums) = 32 (one group). Binary search for smallest feasible max-sum.", code: "int lo = 10, hi = 32;" },
    { array: [7,2,5,10,8], highlights: [0,1,2], secondary: [3,4], variables: { lo: "10", hi: "21", mid: "21", groups: "2", feasible: "true" }, explanation: "mid=21: Greedily assign — [7,2,5] sum=14, [10,8] sum=18. Both ≤ 21. 2 groups ≤ k=2. Feasible! hi=21.", code: "canSplit(21): groups=2 <= 2 => hi = 21;" },
    { array: [7,2,5,10,8], highlights: [0,1,2], secondary: [3], variables: { lo: "16", hi: "21", mid: "15", groups: "3", feasible: "false" }, explanation: "mid=15: [7,2,5]=14, then 10+8=18 > 15, so [10], [8]. 3 groups > 2. Not feasible. lo=16.", code: "canSplit(15): groups=3 > 2 => lo = 16;" },
    { array: [7,2,5,10,8], highlights: [0,1,2], secondary: [3,4], variables: { lo: "16", hi: "18", mid: "18", groups: "2", feasible: "true" }, explanation: "mid=18: [7,2,5]=14, [10,8]=18 ≤ 18. 2 groups ≤ 2. Feasible! hi=18.", code: "canSplit(18): groups=2 <= 2 => hi = 18;" },
    { array: [7,2,5,10,8], highlights: [0,1,2], secondary: [3], variables: { lo: "18", hi: "18", mid: "17", groups: "3", feasible: "false" }, explanation: "mid=17: [7,2,5]=14, then 10+8=18 > 17, split again. 3 groups > 2. Not feasible. lo=18.", code: "canSplit(17): groups=3 > 2 => lo = 18;" },
    { array: [7,2,5,10,8], highlights: [0,1,2], secondary: [3,4], variables: { lo: "18", hi: "18", answer: "18" }, explanation: "lo == hi == 18. The minimum possible largest-sum is 18, achieved by splitting into [7,2,5] and [10,8].", code: "return lo; // 18" },
  ]}
/>

**For "maximize the minimum" (find largest feasible):**
```java
/**
 * Find the maximum value x in [lo, hi] where isFeasible(x) is true.
 * Assumes: if isFeasible(x) is true, then isFeasible(x-1) is also true.
 */
public static int binarySearchMaximize(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo + 1) / 2; // round up to avoid infinite loop
        if (isFeasible(mid)) {
            lo = mid;       // mid works, try bigger
        } else {
            hi = mid - 1;   // mid doesn't work, need smaller
        }
    }
    return lo;
}
```

<AlgoViz
  title="Maximize the Minimum — Magnetic Force Between Balls"
  description="Place m=3 balls among positions [1, 2, 4, 8, 9] to maximize the minimum distance between any two balls. Binary search on the answer in [1, 8]."
  steps={[
    { array: [1,2,4,8,9], highlights: [], variables: { lo: "1", hi: "8", m: "3" }, explanation: "Sorted positions: [1,2,4,8,9]. Min possible gap = 1, max = 9-1 = 8. We want the largest minimum distance where we can still place 3 balls.", code: "int lo = 1, hi = 8;" },
    { array: [1,2,4,8,9], highlights: [0,3], variables: { lo: "1", hi: "4", mid: "5", placed: "2", feasible: "false" }, explanation: "mid=5 (round up): Place ball at pos 1. Next ≥ 1+5=6 → pos 8. Next ≥ 8+5=13 → none. Only 2 balls placed. Not feasible. hi=4.", code: "canPlace(5): placed 2 < 3 => hi = 4;" },
    { array: [1,2,4,8,9], highlights: [0,2,3], variables: { lo: "3", hi: "4", mid: "3", placed: "3", feasible: "true" }, explanation: "mid=3: Place at 1. Next ≥ 4 → pos 4. Next ≥ 7 → pos 8. 3 balls placed! Feasible. lo=3.", code: "canPlace(3): placed 3 >= 3 => lo = 3;" },
    { array: [1,2,4,8,9], highlights: [0,3], variables: { lo: "3", hi: "3", mid: "4", placed: "2", feasible: "false" }, explanation: "mid=4: Place at 1. Next ≥ 5 → pos 8. Next ≥ 12 → none. Only 2 balls. Not feasible. hi=3.", code: "canPlace(4): placed 2 < 3 => hi = 3;" },
    { array: [1,2,4,8,9], highlights: [0,2,3], variables: { lo: "3", hi: "3", answer: "3" }, explanation: "lo == hi == 3. Maximum minimum distance is 3, achieved by placing balls at positions 1, 4, and 8.", code: "return lo; // 3" },
  ]}
/>

### Real-Number Binary Search

For problems with continuous answer spaces (e.g., minimize a floating-point distance):

```java
public static double realBinarySearch(double lo, double hi) {
    for (int iter = 0; iter < 100; iter++) { // 100 iterations gives ~10^-30 precision
        double mid = lo + (hi - lo) / 2;
        if (isFeasible(mid)) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return lo;
}
```

### Complexity Analysis

| Approach | Time | Space |
|----------|------|-------|
| Binary search on answer | O(n × log(range)) | O(1) extra |
| Binary search on sorted array | O(log n) | O(1) |
| Real-number binary search | O(n × iterations) | O(1) |

### Worked Example: Koko Eating Bananas (LC 875)

**Problem:** Koko has `n` piles of bananas. She can eat at speed `k` bananas/hour (one pile per hour, rounds up). Given `h` hours, find the minimum `k`.

**Thought process:**
1. The answer `k` is in range `[1, max(piles)]`.
2. If Koko can finish at speed `k`, she can also finish at speed `k+1`. **Monotonic!**
3. Binary search on `k`. For each candidate, check if she finishes in ≤ h hours.

```java
public static int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(piles, mid, h)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

private static boolean canFinish(int[] piles, int k, int h) {
    int hours = 0;
    for (int p : piles)
        hours += (p + k - 1) / k; // ceil(p / k)
    return hours <= h;
}
```

**Why not brute force?** Testing every possible speed from 1 to max(piles) = 11 and checking each would be O(max × n). For problems where max can be 10^9, this is far too slow. Binary search reduces the number of speeds tested to O(log(max)), and each feasibility check is O(n), giving O(n log max) total.

**For piles = [3,6,7,11], h = 8:**
- lo=1, hi=11
- mid=6: hours = 1+1+2+2 = 6 ≤ 8 ✓ → hi=6
- mid=3: hours = 1+2+3+4 = 10 > 8 ✗ → lo=4
- mid=5: hours = 1+2+2+3 = 8 ≤ 8 ✓ → hi=5
- mid=4: hours = 1+2+2+3 = 8 ≤ 8 ✓ → hi=4
- lo == hi == 4. **Answer: 4** ✓

**Key insight:** The feasibility function `canFinish(k)` is monotonic — if Koko can finish at speed k, she can finish at any speed greater than k. This monotonicity is what makes binary search valid. The entire problem reduces to writing a correct O(n) feasibility check and wrapping it in binary search.

<AlgoViz
  title="Binary Search on Answer — Koko Eating Bananas"
  description="Binary search narrows the eating speed to find the minimum k where Koko finishes within h hours. piles=[3,6,7,11], h=8."
  steps={[
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "1", hi: "11", mid: "-", hours: "-" }, explanation: "Search space for speed k is [1, max(piles)] = [1, 11]. Need total hours <= 8.", code: "int lo = 1, hi = 11;" },
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "1", hi: "6", mid: "6", hours: "6" }, explanation: "mid=6: hours = ceil(3/6)+ceil(6/6)+ceil(7/6)+ceil(11/6) = 1+1+2+2 = 6 <= 8. Feasible! hi=6.", code: "canFinish(6) == true => hi = 6;" },
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "4", hi: "6", mid: "3", hours: "10" }, explanation: "mid=3: hours = 1+2+3+4 = 10 > 8. Not feasible. lo=4.", code: "canFinish(3) == false => lo = 4;" },
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "4", hi: "5", mid: "5", hours: "8" }, explanation: "mid=5: hours = 1+2+2+3 = 8 <= 8. Feasible! hi=5.", code: "canFinish(5) == true => hi = 5;" },
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "4", hi: "4", mid: "4", hours: "8" }, explanation: "mid=4: hours = 1+2+2+3 = 8 <= 8. Feasible! hi=4.", code: "canFinish(4) == true => hi = 4;" },
    { array: [3,6,7,11], highlights: [], stack: [], variables: { lo: "4", hi: "4", answer: "4" }, explanation: "lo == hi == 4. Search complete! Minimum eating speed is 4.", code: "return lo; // 4" },
  ]}
/>

<AlgoViz
  title="Feasibility Check Deep-Dive — canFinish()"
  description="The real challenge in parametric search is the O(n) feasibility check. Walk through canFinish() for piles=[3,6,7,11] at speeds k=4 and k=3."
  steps={[
    { array: [3,6,7,11], highlights: [], variables: { k: "4", h: "8", hours: "0" }, explanation: "Testing speed k=4. Koko eats at most 4 bananas/hour, one pile per hour (rounds up). Need total hours ≤ 8.", code: "boolean canFinish(piles, k=4, h=8)" },
    { array: [3,6,7,11], highlights: [0], variables: { k: "4", pile: "3", hoursForPile: "1", totalHours: "1" }, explanation: "Pile 0: ceil(3/4) = 1 hour. Running total = 1.", code: "hours += (3 + 4 - 1) / 4; // ceil(3/4) = 1" },
    { array: [3,6,7,11], highlights: [1], variables: { k: "4", pile: "6", hoursForPile: "2", totalHours: "3" }, explanation: "Pile 1: ceil(6/4) = 2 hours. Running total = 3.", code: "hours += (6 + 4 - 1) / 4; // ceil(6/4) = 2" },
    { array: [3,6,7,11], highlights: [2], variables: { k: "4", pile: "7", hoursForPile: "2", totalHours: "5" }, explanation: "Pile 2: ceil(7/4) = 2 hours. Running total = 5.", code: "hours += (7 + 4 - 1) / 4; // ceil(7/4) = 2" },
    { array: [3,6,7,11], highlights: [3], variables: { k: "4", pile: "11", hoursForPile: "3", totalHours: "8" }, explanation: "Pile 3: ceil(11/4) = 3 hours. Running total = 8.", code: "hours += (11 + 4 - 1) / 4; // ceil(11/4) = 3" },
    { array: [3,6,7,11], highlights: [], variables: { k: "4", totalHours: "8", h: "8", feasible: "true" }, explanation: "Total hours = 8 ≤ h = 8. FEASIBLE! Speed 4 works.", code: "return 8 <= 8; // true" },
    { array: [3,6,7,11], highlights: [0,1,2,3], variables: { k: "3", hours: "1+2+3+4 = 10", h: "8", feasible: "false" }, explanation: "Now test k=3: ceil(3/3)+ceil(6/3)+ceil(7/3)+ceil(11/3) = 1+2+3+4 = 10 > 8. NOT feasible.", code: "canFinish(piles, k=3, h=8): 10 > 8 => false" },
    { array: [3,6,7,11], highlights: [], variables: { answer: "4", insight: "boundary at k=4" }, explanation: "k=4 is the smallest feasible speed. The feasibility function is monotonic: if k=4 works, k=5,6,... all work too. Binary search finds this boundary.", code: "// Monotonic: feasible(3)=F, feasible(4)=T\n// Binary search finds the transition point" },
  ]}
/>

### When to Use (Pattern Recognition)

- **"Minimize the maximum"** or **"maximize the minimum"** → Binary search on answer
- **"What is the minimum X such that..."** where X has a monotonic feasibility → BS on answer
- **"Allocate/split into groups with constraint"** → BS on the constraint value
- **Keywords:** "at most", "at least", "minimum speed/capacity", "maximum distance"
- **Constraint hint:** Large ranges (10^9) but feasibility check is O(n) → O(n log R)

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "Minimize the maximum sum/load when splitting array into K groups" | BS on the max value; greedily assign items until a group exceeds mid | Feasibility is monotonic: larger max allows fewer groups |
| "Maximize the minimum distance/gap between placed items" | BS on the distance; greedily place items with at least mid gap | Feasibility is monotonic: smaller gap allows more placements |
| "Minimum speed/rate to finish within a deadline" | BS on speed; check total time at mid speed | Koko-style: higher speed always finishes faster |
| "Find the K-th smallest value in a structured collection" | BS on the value; count elements at most mid | Count function is monotonic by nature |
| "Minimum capacity to ship packages in D days" | BS on capacity; greedily fill each day | Identical structure to "minimize the maximum" |
| "Search in rotated/bitonic/modified sorted array" | Modified BS on the array with adjusted comparisons | Identify which half is sorted, narrow accordingly |
| "Median of two sorted arrays" | BS on partition point in the smaller array | Partition-based: ensure all left elements are at most all right elements |
| "Minimize the maximum distance between gas stations after adding K" | Real-number BS on the distance; greedily count stations needed | Continuous answer space; use fixed iterations instead of epsilon |
| "Longest increasing subsequence (O(n log n))" | BS on the tails array for insertion point | Tails array is always sorted; BS maintains O(log n) per element |
| "Maximum value at a given index with bounded total sum" | BS on the peak value; compute minimum total sum for that peak | Higher peak requires more total sum; check against bound |

---

## Key Patterns & Variants

### Pattern 1: Minimize the Maximum
Binary search on the maximum value. Check feasibility by greedily assigning items.
- Split Array Largest Sum, Capacity to Ship Packages, Divide Chocolate

### Pattern 2: Maximize the Minimum
Binary search on the minimum distance/value. Check if you can place/choose items with at least that gap.
- Magnetic Force Between Balls, Aggressive Cows

### Pattern 3: Find K-th Element
Binary search on value, count how many elements are ≤ mid.
- Kth Smallest Element in a Sorted Matrix, Kth Smallest Pair Distance

### Pattern 4: Search in Modified Arrays
Rotated sorted arrays, bitonic arrays, peak finding — standard BS with modified condition.

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Koko Eating Bananas | Medium | BS on answer (min speed) | [LC 875](https://leetcode.com/problems/koko-eating-bananas/) |
| 2 | Capacity To Ship Packages | Medium | BS on answer (min capacity) | [LC 1011](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) |
| 3 | Split Array Largest Sum | Hard | BS on answer (min max sum) | [LC 410](https://leetcode.com/problems/split-array-largest-sum/) |
| 4 | Magnetic Force Between Two Balls | Medium | BS on answer (max min dist) | [LC 1552](https://leetcode.com/problems/magnetic-force-between-two-balls/) |
| 5 | Find Peak Element | Medium | BS on condition | [LC 162](https://leetcode.com/problems/find-peak-element/) |
| 6 | Search in Rotated Sorted Array | Medium | Modified BS | [LC 33](https://leetcode.com/problems/search-in-rotated-sorted-array/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Minimize Max Distance to Gas Station | Hard | Real-number BS | [LC 774](https://leetcode.com/problems/minimize-max-distance-to-gas-station/) |
| 8 | Kth Smallest Element in a Sorted Matrix | Medium | BS on value + count | [LC 378](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/) |
| 9 | Find K-th Smallest Pair Distance | Hard | BS + two-pointer count | [LC 719](https://leetcode.com/problems/find-k-th-smallest-pair-distance/) |
| 10 | Allocate Minimum Pages | Medium | BS on answer | [GFG](https://www.geeksforgeeks.org/allocate-minimum-number-pages/) |
| 11 | Median of Two Sorted Arrays | Hard | BS on partition | [LC 4](https://leetcode.com/problems/median-of-two-sorted-arrays/) |
| 12 | Find Minimum in Rotated Sorted Array II | Hard | BS with duplicates | [LC 154](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/) |
| 13 | Longest Increasing Subsequence | Medium | BS on tails array | [LC 300](https://leetcode.com/problems/longest-increasing-subsequence/) |
| 14 | Kth Missing Positive Number | Easy | BS on count | [LC 1539](https://leetcode.com/problems/kth-missing-positive-number/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Nth Magical Number | Hard | BS + math (LCM) | [LC 878](https://leetcode.com/problems/nth-magical-number/) |
| 16 | Preimage Size of Factorial Zeroes Function | Hard | BS + trailing zeros | [LC 793](https://leetcode.com/problems/preimage-size-of-factorial-zeroes-function/) |
| 17 | Maximum Value at a Given Index in a Bounded Array | Medium | BS + greedy construction | [LC 1802](https://leetcode.com/problems/maximum-value-at-a-given-index-in-a-bounded-array/) |
| 18 | Minimum Number of Days to Make m Bouquets | Medium | BS on days | [LC 1482](https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/) |
| 19 | Find the Smallest Divisor Given a Threshold | Medium | BS on divisor | [LC 1283](https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/) |
| 20 | Maximum Number of Removable Characters | Medium | BS + subsequence check | [LC 1898](https://leetcode.com/problems/maximum-number-of-removable-characters/) |
| 21 | Minimum Speed to Arrive on Time | Medium | BS on speed | [LC 1870](https://leetcode.com/problems/minimum-speed-to-arrive-on-time/) |

---

## Weekly Mock Interview

### Question 1: Split Array Largest Sum

**Prompt:** Given an integer array `nums` and an integer `k`, split `nums` into `k` non-empty continuous subarrays. Minimize the largest sum among these subarrays.

**Expected approach:** Binary search on the answer (the largest sum). For a candidate `mid`, greedily check if you can split into ≤ k subarrays where each sum ≤ mid.

**Optimal complexity:** O(n × log(sum - max)) time, O(1) space

**Follow-up 1:** Can you solve this with DP instead? What's the time complexity? (O(n²k) — much worse but demonstrates understanding of both approaches)

**Follow-up 2:** What if the array elements can be negative? Does binary search on answer still work? (No — the feasibility check loses monotonicity. Need DP.)

**Time target:** 20 minutes

### Question 2: Median of Two Sorted Arrays

**Prompt:** Given two sorted arrays `nums1` and `nums2` of size m and n respectively, return the median. Your solution must run in O(log(min(m,n))) time.

**Expected approach:** Binary search on the partition point in the smaller array. Ensure all left elements ≤ all right elements.

**Optimal complexity:** O(log(min(m,n))) time, O(1) space

**Follow-up 1:** How would you extend this to find the k-th smallest element across two sorted arrays?

**Follow-up 2:** What about finding the median of k sorted arrays? (Hint: binary search on value + count across all arrays, or merge with heap)

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Integer overflow in `(lo + hi) / 2`:** Always use `lo + (hi - lo) / 2` in Java to avoid overflow.
- **Infinite loop with `lo = mid`:** When searching for the maximum, use `mid = (lo + hi + 1) / 2` (round up).
- **Off-by-one in answer range:** Always verify: can the answer be `lo`? Can it be `hi`? Test with the smallest possible input.
- **Feasibility check correctness:** The BS framework is easy — the hard part is writing a correct O(n) feasibility check. Test it independently.
- **Real-number BS precision:** Use a fixed number of iterations (60-100) instead of `while hi - lo > eps` to avoid floating-point issues.

---

## Further Reading

- [CP-Algorithms — Binary Search](https://cp-algorithms.com/)
- [VNOI Wiki — Binary Search](https://wiki.vnoi.info/)
- [Big-O Coding CP Level 1 — Lecture 3: Binary Search](https://bigocoding.com/cp-level-1/)
