---
sidebar_position: 2
title: "Week 1: Arrays + Hashing"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 1: Arrays + Hashing

Arrays and hash maps are the two most fundamental data structures in algorithm design. Nearly every interview problem touches at least one of them. This week builds your intuition for array manipulation patterns and teaches you to reach for a hash map whenever you need O(1) lookups.

---

## Theory

### Arrays

An array is a contiguous block of memory where elements are stored at consecutive addresses. This layout gives you two superpowers: **constant-time random access** and **cache-friendly iteration**.

#### Indexing

Accessing `arr[i]` is O(1) because the address is computed as `base + i * element_size`. Java arrays use zero-based indexing; to access the last element use `arr[arr.length - 1]`.

#### Iteration patterns

- **Forward scan**: `for (int i = 0; i < arr.length; i++)` — the default.
- **Reverse scan**: `for (int i = arr.length - 1; i >= 0; i--)` — useful for in-place operations that avoid overwriting unprocessed elements.
- **Two-pointer**: one pointer at each end, moving inward. Classic for sorted-array problems.
- **Sliding window**: maintain a window `[left, right)` and expand/shrink based on a condition.

#### In-place operations

When the problem says "O(1) extra space," you typically modify the array itself. Common tricks:

- **Swap** elements to partition (Dutch National Flag).
- **Overwrite from the front** with a write pointer (remove duplicates).
- **Mark visited indices** by negating values or mapping `val → index` (find missing numbers).

### Hash Maps

A hash map (Java `HashMap<K,V>`) stores key-value pairs with **amortized O(1)** insert, lookup, and delete. Under the hood it hashes the key, maps to a bucket, and handles collisions (chaining with linked lists or trees in Java).

A **hash set** (Java `HashSet<E>`) is a hash map where you only care about keys.

#### When to use a hash map

- You need to check "have I seen this before?" — O(1) vs. O(n) linear scan.
- You need to count occurrences (frequency map).
- You need to associate a value with a key for later lookup (e.g., index of an element).

#### Why hash maps dominate interview problems

Hash maps appear in roughly 40% of coding interview problems because they turn the brute-force "check every pair" approach into a single-pass lookup. The mental model is simple: **trade space for time**. You spend O(n) memory to store what you have seen, and in return every "have I seen X?" question costs O(1) instead of O(n).

**Signal phrases** that suggest a hash map solution:
- "Find two elements that..." — store complements
- "Count occurrences..." — frequency map
- "Group elements by..." — hash by a derived key
- "Check if X exists..." — hash set for O(1) membership
- "Find duplicates..." — hash set detects repeats instantly

**Common misconception:** beginners assume hash maps are always O(1). In reality, worst-case lookup is O(n) when all keys collide into the same bucket. Java 8+ mitigates this by converting long collision chains into red-black trees (degrading to O(log n) instead of O(n)), but for interview purposes you can safely assume O(1) average.

#### How Java HashMap works internally

Java's `HashMap` uses an array of buckets. Each key is hashed to a bucket index via `key.hashCode() % capacity`. Collisions are resolved with linked lists (or red-black trees when a bucket exceeds 8 entries in Java 8+). The load factor (default 0.75) triggers resizing — the array doubles and all entries are rehashed. This is why worst-case insert is O(n) but amortized is O(1).

#### Cost

| Operation | Average | Worst |
|-----------|---------|-------|
| Insert    | O(1)    | O(n)  |
| Lookup    | O(1)    | O(n)  |
| Delete    | O(1)    | O(n)  |

Worst-case O(n) happens only with pathological hash collisions. For interview purposes, assume O(1).

### Frequency Counting

Build a map from element → count. In Java you use a `HashMap` with `getOrDefault` to count frequencies manually, which interviewers typically expect to see.

Use cases: anagram checks, top-K elements, majority element, checking if two arrays have the same distribution.

### Prefix Sums

A prefix sum array `P` where `P[i] = arr[0] + arr[1] + ... + arr[i-1]` lets you compute any subarray sum in O(1):

`sum(arr[l:r]) = P[r] - P[l]`

Build it in O(n), then answer unlimited range-sum queries in O(1) each. When combined with a hash map (mapping prefix sum → count), you can solve "subarray sum equals K" in O(n).

#### The intuition behind prefix sums

Imagine you have a running total as you walk through the array. At any point, the running total tells you the sum of everything from the start up to the current position. If you want the sum of just a slice in the middle, you subtract two running totals — the one at the end of the slice minus the one at the beginning. This is exactly what `P[r] - P[l]` computes.

The prefix sum + hash map combination is one of the most powerful techniques in array problems. The key insight: if the running sum at position `j` minus the running sum at position `i` equals `k`, then the subarray between `i` and `j` sums to `k`. By storing all previously seen prefix sums in a hash map, you can check in O(1) whether such an `i` exists for the current `j`.

**When to reach for prefix sums in an interview:**
- "Subarray sum equals K" — the classic application
- "Range sum query" — precompute once, answer many queries
- "Count subarrays with sum divisible by K" — prefix sums modulo K
- "Product of array except self" — prefix products from both directions

**Common mistake:** off-by-one errors with the prefix array size. Remember that `prefix` has length `n + 1` (one more than the input) and `prefix[0] = 0`, representing the empty prefix before any element.

### Two-Pass and Single-Pass Patterns

- **Two-pass**: scan once to gather information (e.g., build a frequency map), scan again to produce the answer. Simple and clean.
- **Single-pass**: process each element and update your answer in one traversal. Often uses a hash map to remember what you've seen. Preferred when the interviewer asks "can you do it in one pass?"

---

## Code Templates

### Template 1: Frequency Counter

**When to use this template:** Any problem that asks you to compare character distributions, check for anagrams, find the most/least common element, or determine if two collections have the same composition. The signal is usually "count", "frequency", "anagram", or "how many times". Time is O(n) for a single pass, space is O(k) where k is the number of distinct elements.

```java
import java.util.HashMap;
import java.util.Map;

// Count occurrences of each element. O(n) time, O(n) space.
public static Map<Integer, Integer> frequencyCount(int[] arr) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int val : arr) {
        freq.put(val, freq.getOrDefault(val, 0) + 1);
    }
    return freq;
}

// Check if two strings are anagrams
public static boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    Map<Character, Integer> freq = new HashMap<>();
    for (char c : s.toCharArray()) {
        freq.put(c, freq.getOrDefault(c, 0) + 1);
    }
    for (char c : t.toCharArray()) {
        freq.put(c, freq.getOrDefault(c, 0) - 1);
        if (freq.get(c) < 0) return false;
    }
    return true;
}
```

#### Frequency Count Animation

<AlgoViz
  title="Frequency Counting — Building a Frequency Map"
  description="Watch how we count occurrences of each element using a hash map"
  steps={[
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [0],
      hashMap: [],
      variables: { i: 0, val: 1 },
      explanation: "Start with empty map. Process index 0: value=1. Not in map, so add 1 with count 1.",
      code: "freq.put(1, freq.getOrDefault(1, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [1],
      hashMap: [["1", "1"]],
      variables: { i: 1, val: 2 },
      explanation: "Process index 1: value=2. Not in map, add 2 with count 1.",
      code: "freq.put(2, freq.getOrDefault(2, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [2],
      secondary: [1],
      hashMap: [["1", "1"], ["2", "1"]],
      variables: { i: 2, val: 2 },
      explanation: "Process index 2: value=2. Already in map with count 1. Increment to 2.",
      code: "freq.put(2, freq.getOrDefault(2, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [3],
      hashMap: [["1", "1"], ["2", "2"]],
      variables: { i: 3, val: 3 },
      explanation: "Process index 3: value=3. Not in map, add 3 with count 1.",
      code: "freq.put(3, freq.getOrDefault(3, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [4],
      secondary: [3],
      hashMap: [["1", "1"], ["2", "2"], ["3", "1"]],
      variables: { i: 4, val: 3 },
      explanation: "Process index 4: value=3. Already in map with count 1. Increment to 2.",
      code: "freq.put(3, freq.getOrDefault(3, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      highlights: [5],
      secondary: [3, 4],
      hashMap: [["1", "1"], ["2", "2"], ["3", "2"]],
      variables: { i: 5, val: 3 },
      explanation: "Process index 5: value=3. Count was 2, increment to 3. Final: 1 appears 1x, 2 appears 2x, 3 appears 3x.",
      code: "freq.put(3, freq.getOrDefault(3, 0) + 1);"
    },
    {
      array: [1, 2, 2, 3, 3, 3],
      hashMap: [["1", "1"], ["2", "2"], ["3", "3"]],
      variables: { result: "Complete" },
      explanation: "Done! The frequency map shows: 1 occurs once, 2 occurs twice, 3 occurs three times. O(n) time, O(k) space.",
      code: "return freq; // {1: 1, 2: 2, 3: 3}"
    }
  ]}
/>

### Template 2: Two-Sum Hash Pattern

**When to use this template:** Any problem where you need to find a pair (or complement) that satisfies a condition. The core idea is to store what you have already seen and check whether the "missing piece" exists. Variations include two-sum, pair-with-difference-k, and finding complementary elements. O(n) time, O(n) space. Adapt by changing how you compute the complement (subtraction for sum, XOR for bit problems, division for product).

```java
import java.util.HashMap;
import java.util.Map;

// Return indices of two numbers that add up to target.
// Single-pass: for each element, check if its complement exists.
// O(n) time, O(n) space.
public static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // value -> index
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i};
        }
        seen.put(nums[i], i);
    }
    return new int[]{}; // no solution found
}
```

### Template 3: Prefix Sum Array

```java
// Build prefix sum array where prefix[i] = sum(arr[0..i-1]).
// prefix[0] = 0, so subarray sum arr[l..r-1] = prefix[r] - prefix[l].
// O(n) time, O(n) space.
public static int[] buildPrefixSum(int[] arr) {
    int[] prefix = new int[arr.length + 1];
    for (int i = 0; i < arr.length; i++) {
        prefix[i + 1] = prefix[i] + arr[i];
    }
    return prefix;
}

// Sum of arr[left..right-1] in O(1) using precomputed prefix sums.
public static int rangeSum(int[] prefix, int left, int right) {
    return prefix[right] - prefix[left];
}
```

### Template 4: Subarray Sum Equals K (Prefix Sum + Hash Map)

**When to use this template:** Problems that ask you to count or find subarrays with a specific sum, or where brute-force would require checking all O(n^2) subarrays. The combination of running prefix sums with a hash map reduces this to a single pass. Look for phrases like "subarray sum equals", "contiguous subarray", or "number of subarrays with property X". Time is O(n), space is O(n). To adapt for "divisible by K" variants, store prefix sums modulo K instead of raw sums.

```java
import java.util.HashMap;
import java.util.Map;

// Count subarrays whose sum equals k.
// Key insight: if prefix[j] - prefix[i] == k, then subarray [i, j) sums to k.
// Store prefix sum frequencies in a hash map.
// O(n) time, O(n) space.
public static int subarraySum(int[] nums, int k) {
    int count = 0;
    int currentSum = 0;
    Map<Integer, Integer> prefixCounts = new HashMap<>();
    prefixCounts.put(0, 1); // empty prefix has sum 0
    for (int num : nums) {
        currentSum += num;
        count += prefixCounts.getOrDefault(currentSum - k, 0);
        prefixCounts.put(currentSum, prefixCounts.getOrDefault(currentSum, 0) + 1);
    }
    return count;
}
```

---

## Complexity Analysis

### Array Operations

| Operation | Time | Notes |
|-----------|------|-------|
| Access by index | O(1) | Direct address calculation |
| Search (unsorted) | O(n) | Linear scan |
| Search (sorted) | O(log n) | Binary search |
| Insert at end | O(1) amortized | `ArrayList.add()` |
| Insert at index | O(n) | Shift elements right |
| Delete at end | O(1) | `ArrayList.remove(size-1)` |
| Delete at index | O(n) | Shift elements left |
| Iterate all | O(n) | Cache-friendly |

### Hash Map / Set Operations

| Operation | Average | Worst | Notes |
|-----------|---------|-------|-------|
| Insert | O(1) | O(n) | Amortized with resizing |
| Lookup | O(1) | O(n) | Collision-dependent |
| Delete | O(1) | O(n) | Collision-dependent |
| Iterate all entries | O(n) | O(n) | No guaranteed order (use `LinkedHashMap` to preserve insertion order) |

### Common Patterns

| Pattern | Time | Space | Example Problem |
|---------|------|-------|-----------------|
| Frequency count | O(n) | O(n) | Valid Anagram |
| Two-sum hash | O(n) | O(n) | Two Sum |
| Prefix sum build | O(n) | O(n) | Range Sum Query |
| Prefix sum query | O(1) | — | After build |
| Prefix sum + hash | O(n) | O(n) | Subarray Sum Equals K |
| Sorting + hash | O(n log n) | O(n) | Group Anagrams |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Find pair/triplet that sums to X" | Hash map complement lookup or two pointers on sorted array | Two-Sum Hash |
| "Find all anagrams/permutations" | Frequency counting + sliding window or sorted keys | Frequency Counter |
| "Subarray sum equals K" | Prefix sum + hash map for O(n) | Prefix Sum + Hash |
| "Group elements by some property" | Hash map with derived key (sorted string, frequency tuple) | Frequency Counter |
| "Check if duplicates exist" | Hash set — insert and check in one pass | Hash Set |
| "Find missing/disappeared number in range 1..n" | In-place index marking (negate values) or math (expected sum minus actual) | In-Place Marking |
| "Product of array except self" | Prefix and suffix product arrays, no division needed | Prefix Product |
| "Top K frequent elements" | Hash map for counts, then heap or bucket sort for top-K | Frequency Counter + Heap |
| "Longest consecutive sequence" | Hash set + check if each element is a sequence start | Hash Set |
| "Encode/decode" | Design a serialization format — length-prefix or delimiter-based | Design |

#### Longest Consecutive Sequence Animation

<AlgoViz
  title="Longest Consecutive Sequence — Hash Set Approach"
  description="Find the longest consecutive sequence in [100, 4, 200, 1, 3, 2] using a hash set"
  steps={[
    {
      array: [100, 4, 200, 1, 3, 2],
      hashMap: [["100", "in set"], ["4", "in set"], ["200", "in set"], ["1", "in set"], ["3", "in set"], ["2", "in set"]],
      variables: { step: "Build set" },
      explanation: "First, add all elements to a hash set for O(1) lookups. Set = {100, 4, 200, 1, 3, 2}.",
      code: "Set<Integer> set = new HashSet<>(Arrays.asList(nums));"
    },
    {
      array: [100, 4, 200, 1, 3, 2],
      highlights: [0],
      hashMap: [["100", "in set"], ["4", "in set"], ["200", "in set"], ["1", "in set"], ["3", "in set"], ["2", "in set"]],
      variables: { num: 100, "has 99?": "No", isStart: true },
      explanation: "Check 100: is 99 in set? No. So 100 is a sequence start. Count up: 101 not in set. Sequence length = 1.",
      code: "if (!set.contains(num - 1)) { // 100 is a start }"
    },
    {
      array: [100, 4, 200, 1, 3, 2],
      highlights: [1],
      hashMap: [["100", "in set"], ["4", "in set"], ["200", "in set"], ["1", "in set"], ["3", "in set"], ["2", "in set"]],
      variables: { num: 4, "has 3?": "Yes", isStart: false },
      explanation: "Check 4: is 3 in set? Yes. So 4 is NOT a sequence start. Skip it -- we will count it when we start from 1.",
      code: "if (!set.contains(num - 1)) { // skip, 3 exists }"
    },
    {
      array: [100, 4, 200, 1, 3, 2],
      highlights: [3],
      hashMap: [["1", "start"], ["2", "..."], ["3", "..."], ["4", "..."]],
      variables: { num: 1, "has 0?": "No", isStart: true },
      explanation: "Check 1: is 0 in set? No. So 1 IS a sequence start! Begin counting upward from 1.",
      code: "if (!set.contains(0)) { // 1 is a start! }"
    },
    {
      array: [100, 4, 200, 1, 3, 2],
      highlights: [3],
      secondary: [5, 4, 1],
      hashMap: [["1", "count 1"], ["2", "count 2"], ["3", "count 3"], ["4", "count 4"]],
      variables: { streak: "1,2,3,4", length: 4, best: 4 },
      explanation: "Count from 1: is 2 in set? Yes. Is 3 in set? Yes. Is 4 in set? Yes. Is 5 in set? No. Sequence 1,2,3,4 has length 4!",
      code: "while (set.contains(current + 1)) current++;"
    },
    {
      array: [100, 4, 200, 1, 3, 2],
      highlights: [2],
      hashMap: [["200", "in set"]],
      variables: { num: 200, "has 199?": "No", seqLen: 1, best: 4 },
      explanation: "Check 200: is 199 in set? No. Start counting: 201 not in set. Length 1. Best remains 4. Answer: 4.",
      code: "return best; // longest consecutive sequence = 4"
    }
  ]}
/>

#### Product of Array Except Self Animation

<AlgoViz
  title="Product of Array Except Self — Prefix and Suffix Products"
  description="Build left products then right products on [1, 2, 3, 4] without using division"
  steps={[
    {
      array: [1, 2, 3, 4],
      array2: [1, 1, 1, 1],
      labels: { 0: "result" },
      variables: { phase: "Init", leftProduct: 1 },
      explanation: "Initialize result array to all 1s. We will fill it with prefix products (left pass) then multiply by suffix products (right pass).",
      code: "int[] result = new int[n]; Arrays.fill(result, 1);"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [0],
      array2: [1, 1, 1, 1],
      highlights2: [0],
      variables: { phase: "Left pass", i: 0, leftProduct: 1 },
      explanation: "Left pass, i=0: result[0] = leftProduct = 1. Product of everything to the left of index 0 is 1 (empty). Then leftProduct *= arr[0] = 1.",
      code: "result[0] = 1; leftProduct *= nums[0];"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [1],
      array2: [1, 1, 1, 1],
      highlights2: [1],
      variables: { phase: "Left pass", i: 1, leftProduct: 1 },
      explanation: "Left pass, i=1: result[1] = leftProduct = 1 (product of elements left of index 1 is just 1). Then leftProduct *= arr[1] = 2.",
      code: "result[1] = 1; leftProduct *= nums[1];"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [2],
      array2: [1, 1, 2, 1],
      highlights2: [2],
      variables: { phase: "Left pass", i: 2, leftProduct: 2 },
      explanation: "Left pass, i=2: result[2] = leftProduct = 2 (product of 1*2). Then leftProduct *= arr[2] = 3, so leftProduct = 6.",
      code: "result[2] = 2; leftProduct *= nums[2];"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [3],
      array2: [1, 1, 2, 6],
      highlights2: [3],
      variables: { phase: "Left pass", i: 3, leftProduct: 6 },
      explanation: "Left pass, i=3: result[3] = leftProduct = 6 (product of 1*2*3). Left pass complete. Now right pass.",
      code: "result[3] = 6; // left pass done"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [2],
      array2: [1, 1, 8, 6],
      highlights2: [2],
      variables: { phase: "Right pass", i: 2, rightProduct: 4 },
      explanation: "Right pass, i=2: rightProduct starts at 1, multiply by arr[3]=4 gives 4. result[2] *= 4 = 2*4 = 8.",
      code: "rightProduct *= nums[3]; result[2] *= rightProduct;"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [1],
      array2: [1, 12, 8, 6],
      highlights2: [1],
      variables: { phase: "Right pass", i: 1, rightProduct: 12 },
      explanation: "Right pass, i=1: rightProduct = 4*3 = 12. result[1] *= 12 = 1*12 = 12.",
      code: "rightProduct *= nums[2]; result[1] *= rightProduct;"
    },
    {
      array: [1, 2, 3, 4],
      highlights: [0],
      array2: [24, 12, 8, 6],
      highlights2: [0],
      variables: { phase: "Right pass", i: 0, rightProduct: 24 },
      explanation: "Right pass, i=0: rightProduct = 12*2 = 24. result[0] *= 24 = 1*24 = 24. Final: [24, 12, 8, 6]. Each element is the product of all others!",
      code: "result[0] *= rightProduct; // done: [24,12,8,6]"
    }
  ]}
/>

---

## Worked Example: Two Sum

**Problem**: Given an array of integers `nums` and a target, return the indices of two numbers that add up to the target. Each input has exactly one solution.

**Input**: `nums = [2, 7, 11, 15]`, `target = 9`

### Why not brute force?

The naive approach checks every pair: for each element at index `i`, scan all elements at index `j > i` and check if `nums[i] + nums[j] == target`. This requires two nested loops — O(n^2) time. For an array of 10,000 elements, that is 50 million comparisons. The hash map approach does the same logical work in O(n) by flipping the question: instead of "which two elements sum to target?", ask "for the current element, does its complement already exist in what I have seen?" This single reframing eliminates the inner loop entirely.

:::tip Key Insight
You do not need to find both elements simultaneously. Process one element at a time, and let the hash map remember the past. When the right partner shows up, the map already knows where the first one was.
:::

### Step-by-step trace (hash map approach)

We maintain a `HashMap` called `seen` mapping each number to its index. For every element, we check if `target - num` already exists in `seen`.

**Step 1** — `i = 0`, `num = 2`
- `complement = 9 - 2 = 7`
- Is `7` in `seen`? No (`seen` is empty)
- Add to map: `seen = {2: 0}`

**Step 2** — `i = 1`, `num = 7`
- `complement = 9 - 7 = 2`
- Is `2` in `seen`? **Yes** → `seen[2] = 0`
- Return `[0, 1]`

### Why this works

Instead of checking every pair (O(n²)), we flip the question: "I have `num` — has its complement already appeared?" The hash map answers that in O(1). We only traverse the array once, giving O(n) total time.

### Visualization

```
Index:    0    1    2    3
Value:    2    7   11   15
Target: 9

i=0: need 7, seen={}           → miss  → seen={2:0}
i=1: need 2, seen={2:0}        → HIT!  → return [0, 1]
```

### Interactive Animation

<AlgoViz
  title="Two Sum — Hash Map Approach"
  description="Watch the algorithm find two numbers that sum to the target"
  steps={[
    {
      array: [2, 7, 11, 15],
      highlights: [0],
      hashMap: [],
      variables: { target: 9, i: 0, complement: 7 },
      explanation: "Check index 0: value=2, complement=9-2=7. Not in map. Add 2\u21920 to map.",
      code: "seen.put(nums[0], 0);"
    },
    {
      array: [2, 7, 11, 15],
      highlights: [1],
      secondary: [0],
      hashMap: [["2", "0"]],
      variables: { target: 9, i: 1, complement: 2 },
      explanation: "Check index 1: value=7, complement=9-7=2. Found 2 in map at index 0! Return [0, 1].",
      code: "return new int[]{seen.get(complement), i};"
    }
  ]}
/>

---

## Problem Set (21 Problems)

### Day 1–2: Foundation (7 problems)

Build comfort with basic hash map usage, frequency counting, and simple array scans.

| # | Problem | Difficulty | Key Technique | Must-Do | Link |
|---|---------|-----------|---------------|---------|------|
| 1 | Two Sum | Easy | Hash map (complement lookup) | ⭐ | [LC 1](https://leetcode.com/problems/two-sum/) |
| 2 | Contains Duplicate | Easy | Hash set | ⭐ | [LC 217](https://leetcode.com/problems/contains-duplicate/) |
| 3 | Valid Anagram | Easy | Frequency count | ⭐ | [LC 242](https://leetcode.com/problems/valid-anagram/) |
| 4 | Two Sum II – Input Array Is Sorted | Medium | Two pointers | | [LC 167](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) |
| 5 | Running Sum of 1d Array | Easy | Prefix sum | | [LC 1480](https://leetcode.com/problems/running-sum-of-1d-array/) |
| 6 | Find All Numbers Disappeared in an Array | Easy | In-place index marking | | [LC 448](https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/) |
| 7 | Intersection of Two Arrays II | Easy | Hash map (count intersection) | | [LC 350](https://leetcode.com/problems/intersection-of-two-arrays-ii/) |

### Day 3–4: Intermediate (7 problems)

Combine hashing with other techniques: sorting, heaps, prefix sums, and multi-dimensional indexing.

| # | Problem | Difficulty | Key Technique | Must-Do | Link |
|---|---------|-----------|---------------|---------|------|
| 8 | Group Anagrams | Medium | Hash map + sorted key | ⭐ | [LC 49](https://leetcode.com/problems/group-anagrams/) |
| 9 | Top K Frequent Elements | Medium | Hash map + heap/bucket sort | ⭐ | [LC 347](https://leetcode.com/problems/top-k-frequent-elements/) |
| 10 | Product of Array Except Self | Medium | Prefix product + suffix product | ⭐ | [LC 238](https://leetcode.com/problems/product-of-array-except-self/) |
| 11 | Encode and Decode Strings | Medium | Delimiter/length-prefix design | | [LC 271](https://leetcode.com/problems/encode-and-decode-strings/) |
| 12 | Subarray Sum Equals K | Medium | Prefix sum + hash map | ⭐ | [LC 560](https://leetcode.com/problems/subarray-sum-equals-k/) |
| 13 | Valid Sudoku | Medium | Hash sets per row/col/box | | [LC 36](https://leetcode.com/problems/valid-sudoku/) |
| 14 | Brick Wall | Medium | Hash map (gap positions) | | [LC 554](https://leetcode.com/problems/brick-wall/) |

### Day 5–7: Advanced (7 problems)

Stretch into harder patterns: union-like reasoning with hash sets, sliding window + hash combos, and in-place hashing tricks.

| # | Problem | Difficulty | Key Technique | Must-Do | Link |
|---|---------|-----------|---------------|---------|------|
| 15 | Longest Consecutive Sequence | Medium | Hash set (sequence start detection) | ⭐ | [LC 128](https://leetcode.com/problems/longest-consecutive-sequence/) |
| 16 | 4Sum II | Medium | Hash map (two-half decomposition) | | [LC 454](https://leetcode.com/problems/4sum-ii/) |
| 17 | Longest Substring Without Repeating Characters | Medium | Sliding window + hash set/map | ⭐ | [LC 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/) |
| 18 | Minimum Window Substring | Hard | Sliding window + frequency map | | [LC 76](https://leetcode.com/problems/minimum-window-substring/) |
| 19 | Insert Delete GetRandom O(1) | Medium | Hash map + array (index swap trick) | | [LC 380](https://leetcode.com/problems/insert-delete-getrandom-o1/) |
| 20 | First Missing Positive | Hard | In-place hash (cyclic sort) | ⭐ | [LC 41](https://leetcode.com/problems/first-missing-positive/) |
| 21 | Subarrays with K Different Integers | Hard | Sliding window + hash (at-most-K trick) | | [LC 992](https://leetcode.com/problems/subarrays-with-k-different-integers/) |

---

## Mock Interview Questions

### Mock 1: Two Sum

**Prompt**: "Given an array of integers and a target sum, return the indices of two numbers that add up to the target."

**Expected solution**: Single-pass hash map, O(n) time, O(n) space.

**Follow-up questions**:

1. **What if the array is sorted?**
   Use two pointers (left and right). Move left pointer right if sum is too small, right pointer left if sum is too large. O(n) time, O(1) space. This is LC 167.

2. **What if there are multiple valid pairs? Return all of them.**
   Instead of returning immediately on a match, collect all pairs. Be careful about duplicates: if the same value appears multiple times, use indices to distinguish. Store a list of indices per value in the hash map.

3. **Can you extend this to Three Sum?**
   Sort the array. Fix one element, then run two-pointer on the remaining subarray. Skip duplicates at each level. O(n²) time. Key insight: reducing 3Sum to 2Sum.

4. **What if the array is very large and doesn't fit in memory?**
   External sort both halves, then use a merge-like two-pointer approach. Or partition by hash bucket and solve per-bucket. Discuss the trade-off between I/O passes and memory.

### Mock 2: Group Anagrams

**Prompt**: "Given a list of strings, group the anagrams together."

**Expected solution**: Hash map where the key is the sorted string (or a character-count tuple). O(n · k log k) time where k is the max string length.

**Follow-up questions**:

1. **Can you avoid sorting each string?**
   Use a frequency-count string as the key instead: count occurrences of each character and convert to a string like `"1#0#0#...#2#..."` for 26 letters. This makes key generation O(k) instead of O(k log k).

2. **What if the input is a stream and you receive one string at a time?**
   Maintain the same hash map, but insert incrementally. When a new string arrives, compute its key and append to the corresponding group. The data structure stays the same; the difference is you can't return all groups until the stream ends (or you return a reference).

3. **What if strings contain Unicode characters beyond a–z?**
   You can't use a fixed-size 26-slot array. Use a `HashMap<Character, Integer>` to count frequencies and convert its sorted entries to a `String` key. Sorting still works since Java handles Unicode comparisons natively.

4. **What's the space complexity?**
   O(n · k) where n is the number of strings and k is the average length — you store every string. The keys add O(n · 26) if using count tuples or O(n · k) if using sorted strings.

---

## Tips & Edge Cases

### Common pitfalls

- **Empty input**: always check `if (nums == null || nums.length == 0) return ...` before processing.
- **Single element**: an array of length 1 can't form a pair. Make sure your loop bounds handle it.
- **Duplicate values**: Two Sum says "each input has exactly one solution," but Contains Duplicate depends entirely on duplicates. Read constraints carefully.
- **Negative numbers**: prefix sums and Two Sum work with negatives. Don't assume values are positive unless the problem states it.
- **Integer overflow**: Java uses fixed-width integers (`int` is 32-bit, `long` is 64-bit). Be aware of `Integer.MAX_VALUE` edge cases and use `long` when sums may overflow.

### Hash map gotchas

- **Mutable keys**: in Java, avoid using mutable objects as `HashMap` keys. Use `String` or `List` (immutable content) for group keys (e.g., Group Anagrams with sorted-string keys).
- **Default values**: use `map.getOrDefault(key, default)` or `map.computeIfAbsent()` to avoid null checks.
- **Iteration during mutation**: never add/remove keys while iterating a `HashMap` using a for-each loop. Use an `Iterator` with `iterator.remove()`, or collect keys first.

### Array tricks to remember

- **Sorting is O(n log n)**, not O(n). If the problem asks for O(n), sorting alone won't work — you need hashing or a linear-time trick.
- **In-place marking** (negating `arr[abs(val) - 1]`) only works when values are in the range `[1, n]`. Check constraints.
- **Prefix sums of length n+1**: `prefix[0] = 0` so that `prefix[r] - prefix[l]` correctly gives `sum(arr[l:r])`. Off-by-one errors here are the #1 bug.

### Interview strategy

1. **Clarify** input constraints: size, value range, sorted?, duplicates?, negative values?
2. **Brute force first**: state the O(n²) or O(n³) approach, then optimize.
3. **Think "what data structure gives me O(1) lookup?"** — usually a hash map or hash set.
4. **Trace through an example** on paper/whiteboard before coding.
5. **Test** with edge cases: empty array, single element, all duplicates, negative numbers, large values.
