---
sidebar_position: 4
title: "Week 3: Prefix Sum + Difference Array"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 3: Prefix Sum + Difference Array + Hashing Tricks

## Theory & Concepts

### Prefix Sum

A **prefix sum** array stores cumulative sums: `prefix[i] = nums[0] + nums[1] + ... + nums[i-1]`. This allows **O(1) range sum queries**: `sum(l, r) = prefix[r+1] - prefix[l]`.

**Why this technique exists.** Without prefix sums, every range sum query requires iterating from l to r, costing O(n) per query. If you have Q queries on an array of length n, that is O(nQ) total. Prefix sums precompute cumulative totals in O(n), then answer each query in O(1) via subtraction, reducing total cost to O(n + Q). This is one of the most fundamental trade-offs in algorithms: invest preprocessing time to make queries instant.

**The intuition — a real-world analogy.** Think of a bank account balance sheet. Instead of recording individual transactions and summing them up every time someone asks "how much did you spend between March and June?", you keep a running total. The spending between any two months is just the difference between two running totals. That running total is the prefix sum.

**Interview signals.** Look for: "subarray sum equals K," "count of subarrays with property X," "range sum query," "contiguous subarray," "divisible by K," or any problem that combines subarray sums with counting. If the problem involves many range sum queries on a static array, prefix sum is the go-to. If it involves many range updates followed by a final read, think difference array.

**Common mistakes beginners make.** (1) Forgetting the "empty prefix" `prefix[0] = 0` — this is essential for subarrays starting at index 0. (2) In the hashmap combo pattern, forgetting to seed the map with `seen.put(0, 1)`. (3) Java's modulo operator returning negative values for negative dividends — always normalize with `((x % k) + k) % k`. (4) Integer overflow with large arrays; use `long` for prefix sums when values can be large.

```java
import java.util.*;

public static int[] buildPrefix(int[] nums) {
    int[] prefix = new int[nums.length + 1];
    for (int i = 0; i < nums.length; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    return prefix;
}

public static int rangeSum(int[] prefix, int l, int r) {
    return prefix[r + 1] - prefix[l];
}
```

### 2D Prefix Sum

For matrix range sum queries in O(1):

```java
public static int[][] build2DPrefix(int[][] matrix) {
    int m = matrix.length, n = matrix[0].length;
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            dp[i+1][j+1] = matrix[i][j] + dp[i][j+1] + dp[i+1][j] - dp[i][j];
    return dp;
}

public static int query2D(int[][] dp, int r1, int c1, int r2, int c2) {
    return dp[r2+1][c2+1] - dp[r1][c2+1] - dp[r2+1][c1] + dp[r1][c1];
}
```

### Difference Array

The **inverse** of prefix sum. Apply **range updates in O(1)**, then reconstruct with prefix sum.

```java
// Add val to every index in [l, r].
public static void rangeAdd(int[] diff, int l, int r, int val) {
    diff[l] += val;
    if (r + 1 < diff.length)
        diff[r + 1] -= val;
}

// Convert difference array back to actual values.
public static int[] reconstruct(int[] diff) {
    int[] result = new int[diff.length];
    result[0] = diff[0];
    for (int i = 1; i < diff.length; i++)
        result[i] = result[i - 1] + diff[i];
    return result;
}
```

### Prefix Sum + HashMap Combo

The most powerful pattern: use a hashmap to count prefix sums seen so far. If `prefix[j] - prefix[i] = target`, then `prefix[i] = prefix[j] - target`. Check if that value exists in the map.

```java
public static int subarraySumEqualsK(int[] nums, int k) {
    int count = 0, prefix = 0;
    HashMap<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);
    for (int num : nums) {
        prefix += num;
        count += seen.getOrDefault(prefix - k, 0);
        seen.put(prefix, seen.getOrDefault(prefix, 0) + 1);
    }
    return count;
}
```

### Complexity Analysis

| Operation | Time | Space |
|-----------|------|-------|
| Build prefix sum (1D) | O(n) | O(n) |
| Range sum query | O(1) | — |
| Build 2D prefix sum | O(m×n) | O(m×n) |
| Difference array update | O(1) per update | O(n) |
| Prefix + HashMap (subarray sum = k) | O(n) | O(n) |

### Worked Example: Subarray Sum Equals K (LC 560)

**Problem:** Given `nums = [1,2,3]`, k = 3. Count subarrays summing to k.

**Why not brute force?** The naive approach enumerates all O(n²) subarrays and computes each sum in O(1) with prefix sums, giving O(n²) total. For n = 10^5, that is 10^10 operations — far too slow. The prefix sum + hashmap trick reduces this to O(n) by flipping the question: instead of "which subarrays sum to k?", ask "for the current prefix sum P, have I seen a previous prefix sum equal to P - k?" The hashmap answers this in O(1).

**Trace:**

```text
prefix=0, seen={0:1}
num=1: prefix=1, check seen[1-3]=seen[-2]=0, seen={0:1, 1:1}
num=2: prefix=3, check seen[3-3]=seen[0]=1 → count=1, seen={0:1, 1:1, 3:1}
num=3: prefix=6, check seen[6-3]=seen[3]=1 → count=2, seen={0:1, 1:1, 3:1, 6:1}
```

**Answer: 2** (subarrays [1,2] and [3]) ✓

**Key insight:** Two prefix sums whose difference equals k define a subarray with sum k. The hashmap turns the "find a pair with given difference" problem into an O(1) lookup at each step, converting the O(n²) enumeration into a single O(n) pass.

<AlgoViz
  title="Prefix Sum + HashMap — Subarray Sum Equals K"
  description="Build a running prefix sum and use a HashMap to count previous prefix sums that produce subarrays summing to k. nums=[1,2,3], k=3."
  steps={[
    { array: [1,2,3], highlights: [], stack: [], variables: { prefix: "0", count: "0", seen: "&#123;0:1&#125;" }, explanation: "Initialize: prefix=0, count=0. Seed HashMap with (0 -> 1) for the empty prefix.", code: "HashMap<Integer,Integer> seen = new HashMap<>();\nseen.put(0, 1);" },
    { array: [1,2,3], highlights: [0], stack: [], variables: { prefix: "1", count: "0", seen: "&#123;0:1, 1:1&#125;" }, explanation: "num=1: prefix=1. Check seen[1-3]=seen[-2]=0, no match. Store prefix 1.", code: "prefix += 1;\ncount += seen.getOrDefault(-2, 0); // 0" },
    { array: [1,2,3], highlights: [1], stack: [], variables: { prefix: "3", count: "1", seen: "&#123;0:1, 1:1, 3:1&#125;" }, explanation: "num=2: prefix=3. Check seen[3-3]=seen[0]=1. Found subarray [1,2]! count=1.", code: "prefix += 2;\ncount += seen.getOrDefault(0, 0); // 1" },
    { array: [1,2,3], highlights: [2], stack: [], variables: { prefix: "6", count: "2", seen: "&#123;0:1, 1:1, 3:1, 6:1&#125;" }, explanation: "num=3: prefix=6. Check seen[6-3]=seen[3]=1. Found subarray [3]! count=2.", code: "prefix += 3;\ncount += seen.getOrDefault(3, 0); // 1" },
    { array: [1,2,3], highlights: [], stack: [], variables: { count: "2", answer: "2" }, explanation: "Done! Found 2 subarrays summing to 3: [1,2] and [3].", code: "return count; // 2" },
  ]}
/>

### When to Use (Pattern Recognition)

- **"Subarray sum equals K"** → Prefix sum + hashmap
- **"Count subarrays with property X"** → Prefix + hashmap (XOR, mod, etc.)
- **"Range updates, then query final state"** → Difference array
- **"Matrix region sum"** → 2D prefix sum
- **"Subarray divisible by K"** → Prefix sum mod K + hashmap

## Pattern Recognition Guide

| Problem Description | Technique | Why |
|---|---|---|
| "Count/find subarrays with sum equal to K" | Prefix sum + hashmap counting prefix values | Subarray sum = difference of two prefix sums |
| "Longest subarray with sum K" | Prefix sum + hashmap storing first occurrence index | First occurrence gives the longest valid subarray |
| "Subarrays divisible by K" | Prefix sum mod K + hashmap | Two prefixes with same remainder define a divisible subarray |
| "Count subarrays with equal 0s and 1s" | Replace 0 with -1, then prefix sum + hashmap for sum = 0 | Transforms the problem into "subarray sum equals 0" |
| "Range sum query on static array" | 1D or 2D prefix sum | O(n) build, O(1) per query via subtraction |
| "Apply many range increments, then read final array" | Difference array: mark start/end of each range, then prefix sum | O(1) per update, O(n) to reconstruct |
| "Subarray XOR equals K" | Prefix XOR + hashmap | XOR is its own inverse; same pattern as prefix sum |
| "Product of array except self" | Prefix product and suffix product | Each position = prefix product to its left times suffix product to its right |
| "2D submatrix sum query" | 2D prefix sum with inclusion-exclusion | Extend 1D technique to two dimensions with four-corner formula |
| "Count subarrays with score (sum times length) less than K" | Prefix sum + binary search on the prefix array | Use sorted prefix sums to binary search for valid subarray lengths |

---

## Key Patterns & Variants

### Pattern 1: Prefix XOR
Replace sum with XOR for problems like "subarray XOR equals K". Same hashmap approach.

### Pattern 2: Prefix Modulo
For "subarrays divisible by K": two prefix sums with same `prefix % K` define a valid subarray.

### Pattern 3: 2D Difference Array
For 2D range updates: mark four corners, then 2D prefix sum to reconstruct.

### Pattern 4: Prefix Sum on Trees
Euler tour + prefix sum enables subtree sum queries in O(1).

---

## Problem Set (21 Problems)

### Day 1-2: Foundation (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Range Sum Query - Immutable | Easy | 1D prefix sum | [LC 303](https://leetcode.com/problems/range-sum-query-immutable/) |
| 2 | Range Sum Query 2D - Immutable | Medium | 2D prefix sum | [LC 304](https://leetcode.com/problems/range-sum-query-2d-immutable/) |
| 3 | Subarray Sum Equals K | Medium | Prefix + hashmap | [LC 560](https://leetcode.com/problems/subarray-sum-equals-k/) |
| 4 | Continuous Subarray Sum | Medium | Prefix mod + hashmap | [LC 523](https://leetcode.com/problems/continuous-subarray-sum/) |
| 5 | Corporate Flight Bookings | Medium | Difference array | [LC 1109](https://leetcode.com/problems/corporate-flight-bookings/) |
| 6 | Car Pooling | Medium | Difference array | [LC 1094](https://leetcode.com/problems/car-pooling/) |

### Day 3-4: Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Subarray Sums Divisible by K | Medium | Prefix mod + counting | [LC 974](https://leetcode.com/problems/subarray-sums-divisible-by-k/) |
| 8 | Product of Array Except Self | Medium | Prefix/suffix products | [LC 238](https://leetcode.com/problems/product-of-array-except-self/) |
| 9 | Find Pivot Index | Easy | Prefix sum equality | [LC 724](https://leetcode.com/problems/find-pivot-index/) |
| 10 | Count Number of Nice Subarrays | Medium | Prefix + hashmap (odd count) | [LC 1248](https://leetcode.com/problems/count-number-of-nice-subarrays/) |
| 11 | Contiguous Array | Medium | Prefix sum (0→-1 trick) | [LC 525](https://leetcode.com/problems/contiguous-array/) |
| 12 | Matrix Block Sum | Medium | 2D prefix sum | [LC 1314](https://leetcode.com/problems/matrix-block-sum/) |
| 13 | Range Addition | Medium | Difference array | [LC 370](https://leetcode.com/problems/range-addition/) |
| 14 | Minimum Penalty for a Shop | Medium | Prefix + suffix count | [LC 2483](https://leetcode.com/problems/minimum-penalty-for-a-shop/) |

### Day 5-7: Advanced + Mixed (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Count of Range Sum | Hard | Prefix + merge sort / BIT | [LC 327](https://leetcode.com/problems/count-of-range-sum/) |
| 16 | Subarrays with K Different Integers | Hard | Prefix + sliding window | [LC 992](https://leetcode.com/problems/subarrays-with-k-different-integers/) |
| 17 | Number of Submatrices That Sum to Target | Hard | 2D prefix + hashmap | [LC 1074](https://leetcode.com/problems/number-of-submatrices-that-sum-to-target/) |
| 18 | Maximum Sum of 3 Non-Overlapping Subarrays | Hard | Prefix sum + DP | [LC 689](https://leetcode.com/problems/maximum-sum-of-3-non-overlapping-subarrays/) |
| 19 | Stamping the Grid | Hard | 2D prefix + 2D difference | [LC 2132](https://leetcode.com/problems/stamping-the-grid/) |
| 20 | Make Sum Divisible by P | Medium | Prefix mod + hashmap | [LC 1590](https://leetcode.com/problems/make-sum-divisible-by-p/) |
| 21 | Count Subarrays With Score Less Than K | Hard | Prefix sum + binary search | [LC 2302](https://leetcode.com/problems/count-subarrays-with-score-less-than-k/) |

---

## Weekly Mock Interview

### Question 1: Subarray Sum Equals K

**Prompt:** Given an integer array nums and an integer k, return the total number of subarrays whose sum equals k.

**Expected approach:** Prefix sum + hashmap. Track frequency of each prefix sum.

**Optimal complexity:** O(n) time, O(n) space

**Follow-up 1:** What if you need to find the longest subarray with sum k instead of counting? (Same hashmap, but store first occurrence index instead of count.)

**Follow-up 2:** What if the array has only 0s and 1s, and you want the longest subarray with equal 0s and 1s? (Transform 0→-1, then longest subarray with sum 0.)

**Time target:** 15 minutes

### Question 2: Number of Submatrices That Sum to Target

**Prompt:** Given a matrix and a target, find the number of non-empty submatrices that sum to target.

**Expected approach:** Fix top and bottom rows, compress columns into 1D prefix sums, then apply subarray-sum-equals-k on each compressed row.

**Optimal complexity:** O(m² × n) time, O(n) space

**Follow-up 1:** How does this relate to the classic "maximum subarray sum in a 2D matrix"?

**Follow-up 2:** Can you optimize if the matrix is sparse?

**Time target:** 25 minutes

---

## Tips, Traps & Edge Cases

- **Prefix sum is 1-indexed by convention:** `prefix[0] = 0` is the "empty prefix" — never forget it, especially for the hashmap approach.
- **Integer overflow:** For large arrays with large values, use `long` instead of `int`.
- **Negative numbers in prefix mod:** In Java, `-1 % 5` yields `-1`, not `4`. For modular arithmetic with negative values, always normalize: `((prefix % k) + k) % k`.
- **Difference array boundaries:** When `r + 1 >= n`, skip the `diff[r+1] -= val` step (don't go out of bounds).

---

## Further Reading

- [VNOI Wiki — Prefix Sum and Difference Array](https://wiki.vnoi.info/)
- [CP-Algorithms — Prefix Sums](https://cp-algorithms.com/)
