---
sidebar_position: 14
title: "Week 13: Prefix Sum + Difference Array"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 13: Prefix Sum + Difference Array

Welcome to **Week 13** of the 20-week DSA Foundations roadmap. This week focuses on two deceptively simple yet extraordinarily powerful techniques: **prefix sums** and **difference arrays**. Together they turn expensive repeated queries and range updates into O(1) operations. These patterns appear everywhere — from subarray problems to 2D matrix queries to sweep-line scheduling — and are often the hidden key behind "how is this even possible in O(n)?" interview solutions.

---

## 1 · Core Theory

### 1.1 One-Dimensional Prefix Sum

**Why this technique exists.** Without prefix sums, answering "what is the sum of elements from index l to r?" requires scanning every element in the range — O(n) per query. If you have Q queries, that is O(n * Q). Prefix sums flip this: invest O(n) upfront to precompute cumulative sums, and then every future query is a single subtraction — O(1). This is a textbook example of **precomputation amortising query cost**, and it appears in a staggering number of interview problems in disguised forms.

**Intuition.** Think of a running bank balance. If you know your balance at the end of March and your balance at the end of January, the total deposits and withdrawals in February and March are simply `balance_march - balance_january`. You never need to re-add individual transactions — the running total already encodes them. A prefix sum array is exactly this running balance for array elements.

**Interview signals.** "Range sum query," "subarray sum equals K," "sum of subarray divisible by K," "contiguous subarray with property X." Any time the problem involves summing over a contiguous range or counting subarrays with a target sum, prefix sums should be your first thought. When combined with a HashMap, this pattern can turn O(n^2) subarray problems into O(n) single-pass solutions.

**Common mistakes.** Forgetting the sentinel `P[0] = 0` (which makes the range formula work cleanly for ranges starting at index 0). Off-by-one in the range formula: `sum(A[l..r]) = P[r+1] - P[l]`, not `P[r] - P[l]`. Integer overflow when elements are large — use `long` in Java.

A **prefix sum** array `P` for an input array `A` of length `n` is defined as:

```
P[0] = 0
P[i] = A[0] + A[1] + ... + A[i-1]   for 1 <= i <= n
```

The prefix sum array has length `n + 1`, where `P[0] = 0` acts as a sentinel so that every range sum formula works cleanly — including ranges that start at index 0.

**Range sum in O(1):** Once `P` is built in O(n), the sum of any subarray `A[l..r]` (inclusive) is:

```
sum(A[l..r]) = P[r + 1] - P[l]
```

No loops, no re-scanning — just one subtraction.

| Operation | Without prefix sum | With prefix sum |
|---|---|---|
| Build | — | O(n) |
| Single range sum query | O(n) | O(1) |
| Q range sum queries | O(n * Q) | O(n + Q) |

#### Why `P[0] = 0`?

Without the sentinel, computing `sum(A[0..r])` becomes a special case. The sentinel eliminates it: `sum(A[0..r]) = P[r+1] - P[0] = P[r+1]`. Always include it.

---

### 1.2 Prefix Sum + HashMap — Subarray Sum Pattern

One of the most important interview patterns: **"How many subarrays have sum equal to K?"**

The brute-force approach checks every `(l, r)` pair in O(n^2). The prefix-sum + HashMap trick reduces this to **O(n)**.

**Key insight:** A subarray `A[l..r]` has sum K when `P[r+1] - P[l] = K`, which rearranges to `P[l] = P[r+1] - K`. As we scan left to right building prefix sums, we check how many times `current_prefix - K` has appeared before.

**Algorithm:**

1. Initialize a HashMap `count` with `count.put(0, 1)` (empty prefix).
2. Walk through the array, maintaining a running prefix sum.
3. At each position, check if `prefix - K` exists in `count`. If so, add `count.get(prefix - K)` to the answer.
4. Increment `count.put(prefix, count.getOrDefault(prefix, 0) + 1)`.

**Variations of this pattern:**
- Subarray sum equals K (exact)
- Subarray sum divisible by K (use `prefix % K` as the key)
- Longest subarray with equal 0s and 1s (replace 0 with -1, find longest subarray with sum 0)
- Count of subarrays with exactly K odd numbers

---

### 1.3 Two-Dimensional Prefix Sum

For an `m x n` matrix `M`, build a 2D prefix sum matrix `P` where `P[i][j]` stores the sum of all elements in the sub-rectangle from `(0,0)` to `(i-1, j-1)`.

**Building the 2D prefix sum:**

```
P[i][j] = M[i-1][j-1] + P[i-1][j] + P[i][j-1] - P[i-1][j-1]
```

**Querying a sub-rectangle** from `(r1, c1)` to `(r2, c2)` (inclusive):

```
sum = P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]
```

This is the **inclusion-exclusion principle** in action: add the full rectangle, subtract the two over-counted strips, add back the doubly-subtracted corner.

| Operation | Without 2D prefix | With 2D prefix |
|---|---|---|
| Build | — | O(m * n) |
| Single rectangle sum | O(m * n) | O(1) |
| Q rectangle queries | O(m * n * Q) | O(m * n + Q) |

---

### 1.4 Difference Array — Efficient Range Updates

**Why this technique exists.** The reverse problem of prefix sums: instead of querying ranges efficiently, you need to *update* ranges efficiently. Naively adding a value to every element in `A[l..r]` costs O(r - l + 1) per update. With K updates, that is O(K * n) in the worst case. A difference array reduces each range update to two O(1) operations, and reconstructs the final array in a single O(n) pass at the end.

**Intuition.** Imagine you are adjusting the thermostat schedule for a building. Instead of recording the absolute temperature for every minute, you record *changes*: "at 9 AM, increase by 3 degrees" and "at 5 PM, decrease by 3 degrees." The schedule between those two events inherits the change automatically. When you finally need the actual temperatures, you sweep through the changes and accumulate. That is exactly how a difference array works.

**Interview signals.** "Add value to all elements in range l to r," "multiple range updates then query," "corporate flight bookings," "car pooling capacity." Any time the problem involves batch range additions followed by reading the final state, a difference array is the tool.

**Common mistakes.** Forgetting to handle the boundary `D[r+1] -= val` — if `r` is the last index, you need the difference array to be one element longer. Confusing difference arrays with prefix sums: they are inverses. A prefix sum of the difference array gives back the original array; a difference array of a prefix sum gives back the original.

The **difference array** is the inverse of a prefix sum. Where prefix sums let you answer range *queries* fast, difference arrays let you perform range *updates* fast.

Given an array `A` of length `n`, its difference array `D` is:

```
D[0] = A[0]
D[i] = A[i] - A[i-1]   for 1 <= i < n
```

**Range update in O(1):** To add a value `val` to every element in `A[l..r]`:

```
D[l] += val
D[r + 1] -= val    (if r + 1 < n)
```

After all updates, reconstruct the final array by taking the prefix sum of `D`.

**Why it works:** Adding `val` at `D[l]` means "from index `l` onward, every element increases by `val`." Subtracting `val` at `D[r+1]` cancels the effect from index `r+1` onward. The prefix sum propagates the addition exactly over `[l, r]`.

| Scenario | Naive | Difference array |
|---|---|---|
| K range updates on array of size n | O(K * n) | O(K + n) |
| Single point update | O(1) | O(1) |

---

### 1.5 Sweep Line Concept

The **sweep line** technique generalizes the difference array to event-based problems. Instead of array indices, you operate on a timeline or coordinate axis:

1. For each interval `[start, end]`, record `+1` at `start` and `-1` at `end + 1` (or `end` for half-open intervals).
2. Sort all events by position.
3. Sweep left to right, maintaining a running count.

This is exactly the difference-array idea applied to potentially sparse or continuous coordinates. It's the foundation for:
- **Car Pooling** — tracking passenger counts over stops
- **Meeting Rooms II** — counting overlapping meetings
- **Corporate Flight Bookings** — aggregating seat reservations

When coordinates are large but sparse, use a TreeMap or coordinate compression instead of a full array.

---

## 2 · Code Templates

### Template 1 — 1D Prefix Sum Array Builder

```java
import java.util.*;

public static long[] buildPrefixSum(int[] nums) {
    int n = nums.length;
    long[] prefix = new long[n + 1]; // sentinel prefix[0] = 0
    for (int i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    return prefix;
}

public static long rangeSum(long[] prefix, int l, int r) {
    return prefix[r + 1] - prefix[l]; // sum of nums[l..r] inclusive in O(1)
}
```

<AlgoViz
  title="Prefix Sum Build + Range Query"
  description="Build a prefix sum array from [3,1,4,1,5]. Then answer the query sum(1,3) in O(1) using prefix[4] - prefix[1]."
  steps={[
    { array: [3,1,4,1,5], highlights: [], variables: { operation: "Build prefix sum", formula: "prefix[i+1] = prefix[i] + nums[i]" }, explanation: "Input array: [3,1,4,1,5]. We will build a prefix sum array with a sentinel prefix[0]=0.", code: "long[] prefix = new long[n + 1];" },
    { array: [3,1,4,1,5], array2: [0,0,0,0,0,0], highlights: [0], highlights2: [1], variables: { i: 0, "prefix[1]": "0+3=3" }, explanation: "prefix[1] = prefix[0] + nums[0] = 0 + 3 = 3.", code: "prefix[1] = prefix[0] + nums[0]; // 3" },
    { array: [3,1,4,1,5], array2: [0,3,4,0,0,0], highlights: [1], highlights2: [2], variables: { i: 1, "prefix[2]": "3+1=4" }, explanation: "prefix[2] = prefix[1] + nums[1] = 3 + 1 = 4.", code: "prefix[2] = prefix[1] + nums[1]; // 4" },
    { array: [3,1,4,1,5], array2: [0,3,4,8,9,14], highlights: [2,3,4], highlights2: [3,4,5], variables: { "prefix[3]": 8, "prefix[4]": 9, "prefix[5]": 14 }, explanation: "Continue: prefix[3]=8, prefix[4]=9, prefix[5]=14. Full prefix array: [0,3,4,8,9,14].", code: "// prefix = [0, 3, 4, 8, 9, 14]" },
    { array: [3,1,4,1,5], array2: [0,3,4,8,9,14], highlights: [1,2,3], highlights2: [2,4], variables: { query: "sum(1,3)", "prefix[4]": 9, "prefix[1]": 3, answer: "9-3=6" }, explanation: "Query: sum of nums[1..3] = prefix[4] - prefix[1] = 9 - 3 = 6. Verify: 1+4+1 = 6. O(1)!", code: "return prefix[r+1] - prefix[l]; // 9 - 3 = 6" },
    { array: [3,1,4,1,5], array2: [0,3,4,8,9,14], highlights: [0,1,2,3,4], variables: { prefixArray: "[0,3,4,8,9,14]", queryResult: 6, complexity: "Build O(n), Query O(1)" }, explanation: "Done! Prefix sum built in O(n). Any range sum query answered in O(1) with a single subtraction.", code: "// Build: O(n), Each query: O(1)" }
  ]}
/>

### Template 2 — Subarray Sum Equals K (Prefix Sum + HashMap)

```java
import java.util.*;

public static int subarraySumCount(int[] nums, int k) {
    Map<Integer, Integer> count = new HashMap<>();
    count.put(0, 1); // empty prefix
    int prefix = 0;
    int result = 0;

    for (int num : nums) {
        prefix += num;
        result += count.getOrDefault(prefix - k, 0);
        count.put(prefix, count.getOrDefault(prefix, 0) + 1);
    }

    return result;
}
```

### Template 3 — 2D Prefix Sum

```java
public static long[][] build2DPrefix(int[][] matrix) {
    if (matrix.length == 0 || matrix[0].length == 0) return new long[0][0];
    int m = matrix.length, n = matrix[0].length;
    long[][] P = new long[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            P[i][j] = matrix[i - 1][j - 1]
                       + P[i - 1][j]
                       + P[i][j - 1]
                       - P[i - 1][j - 1];
        }
    }
    return P;
}

public static long rectSum(long[][] P, int r1, int c1, int r2, int c2) {
    return P[r2 + 1][c2 + 1]
           - P[r1][c2 + 1]
           - P[r2 + 1][c1]
           + P[r1][c1]; // sum of sub-rectangle (r1,c1) to (r2,c2) inclusive in O(1)
}
```

### Template 4 — Difference Array Range Update

```java
public static int[] differenceArrayUpdates(int n, int[][] updates) {
    int[] diff = new int[n + 1];

    for (int[] u : updates) {
        int l = u[0], r = u[1], val = u[2];
        diff[l] += val;
        diff[r + 1] -= val;
    }

    int[] result = new int[n];
    int running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        result[i] = running;
    }

    return result;
}
```

<AlgoViz
  title="Difference Array: Range Update +3 on [1,3]"
  description="Start with array [0,0,0,0,0]. Apply a range update: add 3 to indices 1 through 3. Use a difference array to perform the update in O(1), then reconstruct with prefix sum."
  steps={[
    { array: [0,0,0,0,0], highlights: [], variables: { operation: "Add +3 to indices [1,3]", technique: "Difference Array" }, explanation: "Original array: [0,0,0,0,0]. We want to add 3 to every element in the range [1,3].", code: "int[] diff = new int[n + 1]; // n=5" },
    { array: [0,0,0,0,0], array2: [0,3,0,0,-3,0], highlights2: [1], secondary: [], variables: { "diff[1]": "+3", "diff[4]": "-3" }, explanation: "Mark the difference array: diff[1] += 3 (start of range), diff[4] -= 3 (one past end of range).", code: "diff[1] += 3;\ndiff[4] -= 3;" },
    { array: [0,0,0,0,0], array2: [0,3,0,0,-3,0], highlights2: [1,4], variables: { diff: "[0,3,0,0,-3,0]", note: "Two O(1) operations encode the entire range update" }, explanation: "The difference array [0,3,0,0,-3,0] encodes the update with just two operations. Now take the prefix sum to reconstruct.", code: "// diff = [0, 3, 0, 0, -3, 0]" },
    { array: [0,3,0,0,0], highlights: [1], variables: { i: 1, running: 3, "result[1]": 3 }, explanation: "Prefix sum: running=0+0=0 at i=0, running=0+3=3 at i=1. The +3 starts propagating.", code: "running += diff[1]; // running = 3" },
    { array: [0,3,3,3,0], highlights: [1,2,3], variables: { i: "2,3", running: 3, note: "diff[2]=0 and diff[3]=0, so running stays 3" }, explanation: "i=2: running=3+0=3. i=3: running=3+0=3. The +3 continues through the range.", code: "// running stays 3 through indices 2,3" },
    { array: [0,3,3,3,0], highlights: [1,2,3], secondary: [4], variables: { i: 4, running: 0, "result[4]": 0, note: "diff[4]=-3 cancels the effect" }, explanation: "i=4: running=3+(-3)=0. The -3 at diff[4] cancels the range update. Final: [0,3,3,3,0].", code: "running += diff[4]; // 3 + (-3) = 0" },
    { array: [0,3,3,3,0], highlights: [1,2,3], variables: { result: "[0,3,3,3,0]", rangeUpdated: "[1,3] += 3", complexity: "O(1) per update, O(n) reconstruction" }, explanation: "Done! Array [0,3,3,3,0] shows +3 applied exactly to indices 1-3. Each update is O(1), reconstruction is O(n).", code: "// K updates: O(K), then O(n) to reconstruct" }
  ]}
/>

### Template 5 — Sweep Line for Interval Counting

```java
import java.util.*;

public static int maxOverlap(int[][] intervals) {
    TreeMap<Integer, Integer> events = new TreeMap<>();
    for (int[] iv : intervals) {
        events.merge(iv[0], 1, Integer::sum);
        events.merge(iv[1] + 1, -1, Integer::sum);
    }

    int maxCount = 0, current = 0;
    for (int delta : events.values()) {
        current += delta;
        maxCount = Math.max(maxCount, current);
    }

    return maxCount;
}
```

---

## 3 · Complexity Reference

| Technique | Build Time | Query / Update Time | Space |
|---|---|---|---|
| 1D Prefix Sum | O(n) | O(1) per range query | O(n) |
| Prefix Sum + HashMap | — (single pass) | O(n) total | O(n) |
| 2D Prefix Sum | O(m * n) | O(1) per rectangle query | O(m * n) |
| Difference Array | O(n) | O(1) per range update | O(n) |
| Sweep Line (sorted) | O(K log K) for K events | O(K) sweep | O(K) |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "sum of elements in range l to r" | Precompute prefix sum, answer in O(1) | 1D Prefix Sum (Template 1) |
| "count subarrays with sum equal to K" | Prefix sum plus HashMap to find complement | Prefix Sum + HashMap (Template 2) |
| "subarray sum divisible by K" | Use prefix mod K as the HashMap key | Prefix Mod + HashMap |
| "longest subarray with equal 0s and 1s" | Replace 0 with -1, find longest subarray summing to 0 | Prefix Sum + HashMap (first occurrence) |
| "rectangle sum query in a matrix" | Build 2D prefix sum with inclusion-exclusion | 2D Prefix Sum (Template 3) |
| "add value to all elements in range l to r" | Difference array: mark start and end+1 | Difference Array (Template 4) |
| "how many intervals overlap at time X" | Sweep line: +1 at start, -1 at end | Sweep Line (Template 5) |
| "car pooling / flight bookings" | Difference array or sweep line over stops | Difference Array (Template 4) |
| "product of array except self" | Prefix product and suffix product, multiply | Prefix/Suffix Product |
| "find pivot index where left sum equals right sum" | Prefix sum total, scan for balance point | 1D Prefix Sum |

---

## 4 · Worked Example: Subarray Sum Equals K

**Why not brute force?** The brute-force approach generates all O(n^2) subarray start-end pairs and sums each one, giving O(n^2) with a running sum or O(n^3) without. The prefix sum plus HashMap approach reduces this to a single O(n) pass by reframing the question: instead of asking "does this subarray sum to K?", we ask "have we seen a prefix sum that, when subtracted from the current prefix, gives K?" This transforms a nested-loop search into a hash-table lookup.

**Key insight:** The equation `P[r+1] - P[l] = K` rearranges to `P[l] = P[r+1] - K`. So at each position, we look up how many previous prefix sums equal `current_prefix - K`. The HashMap stores these counts, giving us the answer in O(1) per position.

**Problem:** Given an integer array `nums` and an integer `k`, return the total number of subarrays whose sum equals `k`. ([LeetCode 560](https://leetcode.com/problems/subarray-sum-equals-k/))

**Input:** `nums = [1, 2, 1, -1, 1, 2]`, `k = 3`

### Step-by-step trace

We maintain a running prefix sum and a HashMap `count` tracking how many times each prefix sum has appeared.

**Initialization:** `prefix = 0`, `count = {0: 1}`, `result = 0`

| Step | num | prefix | prefix - k | count.get(prefix - k) | result | count after update |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | -2 | 0 | 0 | `0:1, 1:1` |
| 2 | 2 | 3 | 0 | 1 | 1 | `0:1, 1:1, 3:1` |
| 3 | 1 | 4 | 1 | 1 | 2 | `0:1, 1:1, 3:1, 4:1` |
| 4 | -1 | 3 | 0 | 1 | 3 | `0:1, 1:1, 3:2, 4:1` |
| 5 | 1 | 4 | 1 | 1 | 4 | `0:1, 1:1, 3:2, 4:2` |
| 6 | 2 | 6 | 3 | 2 | 6 | `0:1, 1:1, 3:2, 4:2, 6:1` |

**Answer: 6**

### Understanding each match

Let's verify by listing all subarrays with sum 3:

| Subarray | Indices | Sum |
|---|---|---|
| `[1, 2]` | 0..1 | 3 |
| `[2, 1]` | 1..2 | 3 |
| `[1, -1, 1, 2]` | 2..5 | 3 |
| `[2, 1, -1, 1]` | 1..4 | 3 |
| `[1, -1, 1, 2]` | 2..5 | 3 |
| `[-1, 1, 2, 1]` | — | — |

Wait — let's be precise. At step 6, `prefix = 6` and `count.get(3) = 2`. The two entries for prefix sum 3 correspond to indices after position 1 and after position 3. Both create valid subarrays ending at position 5 with sum `6 - 3 = 3`:
- From index 2 to 5: `[1, -1, 1, 2] = 3`
- From index 4 to 5: `[1, 2] = 3`

All six subarrays summing to 3:

1. `[1, 2]` — indices 0..1
2. `[2, 1]` — indices 1..2
3. `[2, 1, -1, 1]` — indices 1..4
4. `[1, -1, 1, 2]` — indices 2..5
5. `[1, 2]` — indices 4..5
6. Prefix 3 appears at step 2 and step 4 — at step 6 both contribute.

**Key takeaway:** The HashMap avoids nested loops by remembering *all* prior prefix sums, turning the two-pointer search into a single-pass lookup.

<AlgoViz
  title="Subarray Sum Equals K: nums=[1,2,1,-1,1,2], k=3"
  description="Track a running prefix sum and a HashMap of previously seen prefix values. At each step, check if (prefix - k) exists in the map — each occurrence represents a valid subarray ending here."
  steps={[
    { array: [1,2,1,-1,1,2], highlights: [], variables: { prefix: 0, k: 3, result: 0, map: "{0:1}" }, explanation: "Initialise: prefix=0, result=0, HashMap count={0:1} (empty prefix counted once).", code: "Map<Integer,Integer> count = new HashMap<>();\ncount.put(0, 1);" },
    { array: [1,2,1,-1,1,2], highlights: [0], variables: { num: 1, prefix: 1, "prefix-k": -2, lookup: 0, result: 0, map: "{0:1, 1:1}" }, explanation: "num=1: prefix=1. Check count.get(1-3=-2) = 0. No match. Store prefix 1.", code: "prefix += 1; // prefix=1\nresult += count.getOrDefault(-2, 0); // 0" },
    { array: [1,2,1,-1,1,2], highlights: [1], variables: { num: 2, prefix: 3, "prefix-k": 0, lookup: 1, result: 1, map: "{0:1, 1:1, 3:1}" }, explanation: "num=2: prefix=3. Check count.get(3-3=0) = 1. Found! Subarray [1,2] sums to 3.", code: "prefix += 2; // prefix=3\nresult += count.getOrDefault(0, 0); // +1 → result=1" },
    { array: [1,2,1,-1,1,2], highlights: [2], variables: { num: 1, prefix: 4, "prefix-k": 1, lookup: 1, result: 2, map: "{0:1, 1:1, 3:1, 4:1}" }, explanation: "num=1: prefix=4. Check count.get(4-3=1) = 1. Found! Subarray [2,1] sums to 3.", code: "prefix += 1; // prefix=4\nresult += count.getOrDefault(1, 0); // +1 → result=2" },
    { array: [1,2,1,-1,1,2], highlights: [3], variables: { num: -1, prefix: 3, "prefix-k": 0, lookup: 1, result: 3, map: "{0:1, 1:1, 3:2, 4:1}" }, explanation: "num=-1: prefix=3. Check count.get(0) = 1. Found! Subarray [2,1,-1,1] sums to 3. Prefix 3 now appears twice.", code: "prefix += -1; // prefix=3\nresult += count.getOrDefault(0, 0); // +1 → result=3" },
    { array: [1,2,1,-1,1,2], highlights: [4], variables: { num: 1, prefix: 4, "prefix-k": 1, lookup: 1, result: 4, map: "{0:1, 1:1, 3:2, 4:2}" }, explanation: "num=1: prefix=4. Check count.get(1) = 1. Found! Subarray [1,-1,1,2]... wait, [2,1,-1,1] indices 1..4 sums to 3.", code: "prefix += 1; // prefix=4\nresult += count.getOrDefault(1, 0); // +1 → result=4" },
    { array: [1,2,1,-1,1,2], highlights: [5], variables: { num: 2, prefix: 6, "prefix-k": 3, lookup: 2, result: 6, map: "{0:1, 1:1, 3:2, 4:2, 6:1}" }, explanation: "num=2: prefix=6. Check count.get(3) = 2. Two matches! Two subarrays ending here sum to 3: [1,-1,1,2] and [1,2].", code: "prefix += 2; // prefix=6\nresult += count.getOrDefault(3, 0); // +2 → result=6" },
    { array: [1,2,1,-1,1,2], highlights: [0,1,2,3,4,5], variables: { result: 6, subarrays: "6 subarrays with sum=3" }, explanation: "Done! 6 subarrays sum to k=3. The HashMap let us find all matches in a single O(n) pass.", code: "return result; // 6" }
  ]}
/>

<AlgoViz
  title="Subarray Sum Equals K: nums=[1,2,3,-1,1], k=3"
  description="Use prefix sums and a HashMap to count subarrays summing to k=3 in a single O(n) pass. At each position, check if (prefix - k) has been seen before."
  steps={[
    { array: [1,2,3,-1,1], highlights: [], hashMap: [["prefix","count"]], variables: { prefix: 0, k: 3, result: 0, map: "{0:1}" }, explanation: "Initialise: prefix=0, result=0. HashMap starts with {0:1} representing the empty prefix.", code: "Map<Integer,Integer> count = new HashMap<>();\ncount.put(0, 1);" },
    { array: [1,2,3,-1,1], highlights: [0], hashMap: [["0","1"],["1","1"]], variables: { num: 1, prefix: 1, "prefix-k": -2, lookup: 0, result: 0 }, explanation: "num=1: prefix=1. Look up 1-3=-2 in map: not found (0 matches). result stays 0.", code: "prefix=1; result += count.get(-2); // 0" },
    { array: [1,2,3,-1,1], highlights: [1], hashMap: [["0","1"],["1","1"],["3","1"]], variables: { num: 2, prefix: 3, "prefix-k": 0, lookup: 1, result: 1 }, explanation: "num=2: prefix=3. Look up 3-3=0 in map: found 1 time! Subarray [1,2] sums to 3. result=1.", code: "prefix=3; result += count.get(0); // +1" },
    { array: [1,2,3,-1,1], highlights: [2], hashMap: [["0","1"],["1","1"],["3","1"],["6","1"]], variables: { num: 3, prefix: 6, "prefix-k": 3, lookup: 1, result: 2 }, explanation: "num=3: prefix=6. Look up 6-3=3: found 1 time! Subarray [3] sums to 3. result=2.", code: "prefix=6; result += count.get(3); // +1" },
    { array: [1,2,3,-1,1], highlights: [3], hashMap: [["0","1"],["1","1"],["3","1"],["5","1"],["6","1"]], variables: { num: -1, prefix: 5, "prefix-k": 2, lookup: 0, result: 2 }, explanation: "num=-1: prefix=5. Look up 5-3=2: not found. result stays 2.", code: "prefix=5; result += count.get(2); // 0" },
    { array: [1,2,3,-1,1], highlights: [4], hashMap: [["0","1"],["1","1"],["3","2"],["5","1"],["6","2"]], variables: { num: 1, prefix: 6, "prefix-k": 3, lookup: 1, result: 3 }, explanation: "num=1: prefix=6. Look up 6-3=3: found 1 time! Subarray [3,-1,1] sums to 3. result=3.", code: "prefix=6; result += count.get(3); // +1" },
    { array: [1,2,3,-1,1], highlights: [0,1,2,3,4], variables: { result: 3, subarrays: "[1,2], [3], [3,-1,1]", complexity: "O(n) time, O(n) space" }, explanation: "Done! 3 subarrays sum to k=3: [1,2], [3], and [3,-1,1]. HashMap turned O(n^2) into O(n).", code: "return result; // 3" }
  ]}
/>

---

## 5 · Practice Problems (21 Problems, 3 Day Groups)

### Day 1–2: Foundation (7 problems)

Build core prefix-sum intuition and basic difference-array mechanics.

| # | Problem | Difficulty | Key Technique | LeetCode Link |
|---|---|---|---|---|
| 1 | ⭐ Running Sum of 1D Array | Easy | Basic prefix sum | [LC 1480](https://leetcode.com/problems/running-sum-of-1d-array/) |
| 2 | ⭐ Range Sum Query – Immutable | Easy | Prefix sum array, O(1) query | [LC 303](https://leetcode.com/problems/range-sum-query-immutable/) |
| 3 | ⭐ Find Pivot Index | Easy | Total sum minus left prefix | [LC 724](https://leetcode.com/problems/find-pivot-index/) |
| 4 | ⭐ Product of Array Except Self | Medium | Prefix and suffix products | [LC 238](https://leetcode.com/problems/product-of-array-except-self/) |
| 5 | ⭐ Subarray Sum Equals K | Medium | Prefix sum + HashMap | [LC 560](https://leetcode.com/problems/subarray-sum-equals-k/) |
| 6 | Corporate Flight Bookings | Medium | Difference array | [LC 1109](https://leetcode.com/problems/corporate-flight-bookings/) |
| 7 | Car Pooling | Medium | Difference array / sweep line | [LC 1094](https://leetcode.com/problems/car-pooling/) |

---

### Day 3–4: Intermediate (7 problems)

Extend to modular arithmetic variants, 2D prefix sums, and binary subarrays.

| # | Problem | Difficulty | Key Technique | LeetCode Link |
|---|---|---|---|---|
| 8 | ⭐ Continuous Subarray Sum | Medium | Prefix sum mod K + HashMap | [LC 523](https://leetcode.com/problems/continuous-subarray-sum/) |
| 9 | ⭐ Subarray Sums Divisible by K | Medium | Prefix mod + counting | [LC 974](https://leetcode.com/problems/subarray-sums-divisible-by-k/) |
| 10 | ⭐ Contiguous Array | Medium | Replace 0 with -1, prefix + HashMap | [LC 525](https://leetcode.com/problems/contiguous-array/) |
| 11 | Range Sum Query 2D – Immutable | Medium | 2D prefix sum | [LC 304](https://leetcode.com/problems/range-sum-query-2d-immutable/) |
| 12 | Matrix Block Sum | Medium | 2D prefix sum with clamping | [LC 1314](https://leetcode.com/problems/matrix-block-sum/) |
| 13 | Count Number of Nice Subarrays | Medium | Prefix sum on parity (odd count) | [LC 1248](https://leetcode.com/problems/count-number-of-nice-subarrays/) |
| 14 | Minimum Penalty for a Shop | Medium | Prefix sum for cost calculation | [LC 2483](https://leetcode.com/problems/minimum-penalty-for-a-shop/) |

---

### Day 5–7: Advanced (7 problems)

Tackle hard-level prefix sum + hash combos, 2D extensions, and multi-pattern synthesis.

| # | Problem | Difficulty | Key Technique | LeetCode Link |
|---|---|---|---|---|
| 15 | ⭐ Make Sum Divisible by P | Medium | Prefix mod + HashMap for min removal | [LC 1590](https://leetcode.com/problems/make-sum-divisible-by-p/) |
| 16 | Range Addition | Medium | Difference array (premium) | [LC 370](https://leetcode.com/problems/range-addition/) |
| 17 | ⭐ Count of Range Sum | Hard | Prefix sum + merge sort / BIT | [LC 327](https://leetcode.com/problems/count-of-range-sum/) |
| 18 | Subarrays with K Different Integers | Hard | Sliding window + prefix count | [LC 992](https://leetcode.com/problems/subarrays-with-k-different-integers/) |
| 19 | Number of Submatrices That Sum to Target | Hard | 2D prefix sum + HashMap | [LC 1074](https://leetcode.com/problems/number-of-submatrices-that-sum-to-target/) |
| 20 | Maximum Sum of 3 Non-Overlapping Subarrays | Hard | Prefix sum + DP with left/right best | [LC 689](https://leetcode.com/problems/maximum-sum-of-3-non-overlapping-subarrays/) |
| 21 | Stamping the Grid | Hard | 2D prefix sum + 2D difference array | [LC 2132](https://leetcode.com/problems/stamping-the-grid/) |

---

## 6 · Mock Interviews

### Mock Interview 1: Range Update + Query

**Interviewer prompt:**
*"You're given an array of `n` zeros. You receive `q` operations, each either an update `(l, r, val)` meaning 'add val to every element in `[l, r]`', or a query `(i)` meaning 'return the current value at index i'. All updates come before all queries. How would you handle this efficiently?"*

**Follow-up questions:**

1. **"What if updates and queries are interleaved?"**
   - A difference array alone no longer works because you'd need to reconstruct on every query. Use a **Binary Indexed Tree (BIT / Fenwick Tree)** with range-update and point-query capability. The BIT stores the difference array; point query becomes a prefix sum on the BIT. Both operations are O(log n).

2. **"What if you also need range queries (sum of `A[l..r]`) interleaved with range updates?"**
   - Use a **BIT with two arrays** (a technique where you maintain two BITs to support both range updates and range queries in O(log n)). Alternatively, a **segment tree with lazy propagation** handles this cleanly.

3. **"How would you handle this if the index space is up to 10^9 but there are only 10^5 operations?"**
   - Use **coordinate compression**: collect all referenced indices, sort and deduplicate them, map them to a compact range `[0, m)` where `m` is at most `3 * 10^5`. Apply the difference array or BIT on the compressed coordinates.

4. **"Can you do this with a sweep line instead?"**
   - Yes. Treat each update `(l, r, val)` as two events: `+val` at position `l` and `-val` at position `r+1`. Store events in a sorted structure, then sweep to answer point or range queries.

---

### Mock Interview 2: Subarray Sum Variants

**Interviewer prompt:**
*"Given an array of integers and a target `k`, find the length of the shortest subarray whose sum is at least `k`."*

**Follow-up questions:**

1. **"Your array has only positive integers. How does this simplify things?"**
   - With all positives, the prefix sum array is strictly increasing. Use a **sliding window / two-pointer** approach: expand the right end until the sum is at least `k`, then shrink the left end while the condition holds. This runs in O(n).

2. **"Now the array can have negative numbers. Does two-pointer still work?"**
   - No — negative numbers break the monotonicity that two-pointer relies on. Use a **prefix sum + monotone ArrayDeque** approach (LC 862: Shortest Subarray with Sum at Least K). Build prefix sums, then maintain an ArrayDeque of indices in increasing order of their prefix values. For each new prefix `P[j]`, poll from the front while `P[j] - P[front] >= k` (updating the answer), and poll from the back while `P[back] >= P[j]` (maintaining monotonicity). This is O(n).

3. **"How would you extend this to 2D — find the sub-rectangle with the largest sum?"**
   - Fix two row boundaries `r1` and `r2`. Compress the 2D problem into 1D by computing column sums between `r1` and `r2` using prefix sums. Then apply **Kadane's algorithm** on the compressed 1D array. Iterate over all O(m^2) row pairs. Total: O(m^2 * n).

4. **"What if I want to count the number of subarrays whose sum falls in a range `[lo, hi]`?"**
   - Use prefix sums: a subarray sum `S` is in `[lo, hi]` when `lo <= P[j] - P[i] <= hi`. Rearranging: `P[j] - hi <= P[i] <= P[j] - lo`. Count valid `P[i]` values using a **sorted container** (like a TreeMap or BIT) that supports range counting. Each step is O(log n), total O(n log n).

---

## 7 · Tips and Edge Cases

### Common pitfalls

- **Off-by-one in prefix arrays.** Always use the sentinel `P[0] = 0` and remember that `P[i]` represents the sum of the first `i` elements, not including index `i`. The range `A[l..r]` is `P[r+1] - P[l]`.

- **Difference array boundary.** When updating `D[r+1] -= val`, make sure `r + 1` is within bounds. Allocate the difference array with size `n + 1` to handle the case where `r = n - 1`.

- **Negative numbers with modular prefix sums.** In Java, the `%` operator can return negative values — add the divisor and mod again: `((prefix % k) + k) % k`. In Python, `%` always returns a non-negative result for positive divisors.

- **Integer overflow.** Prefix sums can grow large. In Java, use `long` when elements can be up to 10^4 and array length up to 10^5 (product up to 10^9, cumulative sum can exceed 2^31).

### Edge cases to test

- **Empty array** — return 0 for any sum query.
- **Single element** — does it equal `k`?
- **All zeros with `k = 0`** — every subarray qualifies; count is `n * (n + 1) / 2`.
- **All negative values** — prefix sums are monotonically decreasing; test that HashMap approach still works.
- **Large K values** — ensure no subarray qualifies; result should be 0.
- **Difference array with no updates** — result should be all zeros.
- **2D prefix sum on a 1x1 matrix** — should return the single element.

### When to use each technique

| Signal in the problem | Technique |
|---|---|
| "Sum of subarray" or "range sum query" | Prefix sum |
| "Count subarrays with sum = K" | Prefix sum + HashMap |
| "Subarray sum divisible by K" | Prefix mod + HashMap |
| "Add value to range `[l, r]`" | Difference array |
| "How many intervals overlap at point X?" | Sweep line |
| "Rectangle sum in a matrix" | 2D prefix sum |
| "Longest/shortest subarray with property" | Prefix sum + HashMap (store first/last occurrence) |

### Performance tips

- **Prefix sums are read-only.** If the underlying array changes, you need to rebuild or use a Fenwick tree / segment tree instead.
- **HashMap vs. array for counting.** If prefix values fall in a small range (e.g., mod K where K is small), use an `int[]` array of size K instead of a HashMap for better cache performance.
- **2D problems can often be reduced to 1D.** Fix one dimension (iterate over row pairs or column pairs), then apply a 1D technique on the compressed dimension. This is a common interview pattern.
