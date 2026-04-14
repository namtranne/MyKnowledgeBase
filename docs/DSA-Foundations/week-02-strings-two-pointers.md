---
sidebar_position: 3
title: "Week 2: Strings + Two Pointers"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 2: Strings + Two Pointers

This week builds on array fundamentals by introducing **string manipulation** and the **two-pointer technique** — one of the most versatile patterns in algorithm design. You'll learn how to traverse strings efficiently, detect palindromes and anagrams, and solve problems that would otherwise require O(n²) brute force in O(n) time.

---

## Theory

### String Fundamentals

#### Immutability

In most languages, strings are **immutable** — once created, individual characters cannot be changed in place.

| Language | Mutable? | Consequence |
|----------|----------|-------------|
| Java | No | Use `StringBuilder` for repeated mutation |
| Python | No | Every concatenation creates a new string — O(n) per concat |
| JavaScript | No | Use arrays then `.join('')` |
| C++ | Yes | `std::string` allows in-place modification |

**Key implication**: Naive string concatenation in a loop is O(n²). Always use a `StringBuilder`.

```java
// BAD — O(n²) due to repeated String allocation
String result = "";
for (char ch : s.toCharArray()) {
    result += ch;
}

// GOOD — O(n) amortized
StringBuilder sb = new StringBuilder();
for (char ch : s.toCharArray()) {
    sb.append(ch);
}
String result = sb.toString();
```

#### Character-Level Operations

| Operation | Java | Time |
|-----------|------|------|
| Access by index | `s.charAt(i)` | O(1) |
| Substring | `s.substring(i, j)` | O(j − i) |
| Find / Index | `s.indexOf(t)` | O(n·m) |
| Compare | `s.equals(t)` | O(n) |
| Char → int | `(int) ch` | O(1) |
| Int → char | `(char) n` | O(1) |
| Is alphanumeric | `Character.isLetterOrDigit(ch)` | O(1) |
| Lowercase | `Character.toLowerCase(ch)` | O(1) |

#### Character Frequency Maps

Many string problems reduce to counting character frequencies and comparing maps.

```java
import java.util.HashMap;
import java.util.Map;

public static boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    Map<Character, Integer> freq = new HashMap<>();
    for (char c : s.toCharArray())
        freq.put(c, freq.getOrDefault(c, 0) + 1);
    for (char c : t.toCharArray()) {
        freq.put(c, freq.getOrDefault(c, 0) - 1);
        if (freq.get(c) < 0) return false;
    }
    return true;
}
```

#### Anagram Check Animation

<AlgoViz
  title="Anagram Check — Frequency Counter"
  description="Check if 'listen' and 'silent' are anagrams using a frequency map"
  steps={[
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights: [0],
      hashMap: { l: 1 },
      variables: { phase: "Count s", index: 0 },
      explanation: "Phase 1: Count character frequencies in 'listen'. Process 'l': increment count to 1.",
      code: "freq.put('l', freq.getOrDefault('l', 0) + 1); // {l:1}"
    },
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights: [0, 1, 2, 3, 4, 5],
      hashMap: { l: 1, i: 1, s: 1, t: 1, e: 1, n: 1 },
      variables: { phase: "Count s complete" },
      explanation: "After processing all of 'listen': each character appears once. Frequency map: {l:1, i:1, s:1, t:1, e:1, n:1}.",
      code: "// freq = {l:1, i:1, s:1, t:1, e:1, n:1}"
    },
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights2: [0],
      hashMap: { l: 1, i: 1, s: 0, t: 1, e: 1, n: 1 },
      variables: { phase: "Decrement t", char: "s", newCount: 0 },
      explanation: "Phase 2: Decrement for each character in 'silent'. Process 's': count goes from 1 to 0. Still >= 0, valid.",
      code: "freq.put('s', freq.get('s') - 1); // s: 1 -> 0"
    },
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights2: [0, 1, 2],
      hashMap: { l: 0, i: 0, s: 0, t: 1, e: 1, n: 1 },
      variables: { phase: "Decrement t", processed: "s, i, l" },
      explanation: "Processed 's', 'i', 'l' from 'silent'. Each decremented to 0. All counts still >= 0.",
      code: "// freq = {l:0, i:0, s:0, t:1, e:1, n:1}"
    },
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights2: [0, 1, 2, 3, 4, 5],
      hashMap: { l: 0, i: 0, s: 0, t: 0, e: 0, n: 0 },
      variables: { phase: "Complete", allZero: true },
      explanation: "All characters processed. Every count is 0 — perfect balance. 'listen' and 'silent' ARE anagrams!",
      code: "// All counts zero -> return true"
    },
    {
      array: ["l", "i", "s", "t", "e", "n"],
      array2: ["s", "i", "l", "e", "n", "t"],
      highlights: [0, 1, 2, 3, 4, 5],
      highlights2: [0, 1, 2, 3, 4, 5],
      hashMap: { l: 0, i: 0, s: 0, t: 0, e: 0, n: 0 },
      variables: { result: "true (anagram!)", time: "O(n)", space: "O(k)" },
      explanation: "Result: TRUE. Both strings have identical character frequencies. Time: O(n), Space: O(k) where k is the alphabet size.",
      code: "return true; // O(n) time, O(k) space"
    }
  ]}
/>

Manual frequency counting with an array (when input is lowercase English only):

```java
public static int[] charFreq(String s) {
    int[] freq = new int[26];
    for (char ch : s.toCharArray()) {
        freq[ch - 'a']++;
    }
    return freq;
}
```

---

### Two-Pointer Technique

The two-pointer technique uses two index variables that move through the data structure according to a set of rules. It converts many O(n²) brute-force scans into O(n) single-pass solutions.

#### Why two pointers exist

Many problems boil down to searching for a pair or range that satisfies a condition. The brute-force approach tests all O(n^2) pairs. Two pointers exploit a **monotonic relationship** — when one pointer moves, the condition changes predictably — to eliminate large swaths of candidates in a single step. The technique only works when the movement of one pointer gives you information about what the other pointer should do. For sorted arrays, this information comes from ordering. For partition problems, it comes from the boundary between processed and unprocessed elements.

**Interview signal phrases:** "sorted array", "pair that sums to", "in-place with O(1) space", "palindrome", "container/area", "remove duplicates", "partition". If you see any of these and the data has an ordering property, two pointers is almost certainly the right approach.

**Common misconception:** beginners think two pointers only work on sorted arrays. In reality, the fast/slow variant works on unsorted data (remove duplicates from unsorted with a set, cycle detection in linked lists), and the sliding window variant works on strings and subarrays regardless of sort order.

#### Pattern 1: Opposite-End Pointers

Two pointers start at opposite ends and move **inward**.

```
[a, b, c, d, e, f]
 ^                 ^
 L                 R
```

**When to use**: Sorted arrays, palindrome checks, pair-sum on sorted data, container area maximization.

**Movement rule**: Advance the pointer that is "losing" — smaller value, wrong character, etc.

#### Pattern 2: Same-Direction (Fast / Slow) Pointers

Both pointers start at the beginning. The **fast** pointer explores ahead while the **slow** pointer marks a boundary.

```
[a, b, c, d, e, f]
 ^  ^
 S  F
```

**When to use**: Removing duplicates in-place, partitioning, cycle detection, subsequence matching.

#### Pattern 3: Sliding Window (Special Case)

A window defined by `left` and `right` pointers expands and contracts over the data.

```
[a, b, c, d, e, f]
    ^        ^
    L        R
    |--------|
     window
```

**When to use**: Substring problems, subarray sums, longest/shortest window satisfying a condition.

---

### Core Algorithms

#### Palindrome Checking

Compare characters from both ends moving inward:

```java
public static boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++;
        right--;
    }
    return true;
}
```

#### Anagram Detection

Two strings are anagrams if they contain the exact same characters with the same frequencies.

**Approaches**:
- Sort both and compare: O(n log n)
- Frequency counter comparison: O(n)
- Single-counter increment/decrement: O(n) with early termination

#### Substring Problems

Most substring problems use the **sliding window** variant:

1. Expand `right` to include new characters.
2. When a condition is violated (or met), shrink from `left`.
3. Track the optimal window seen so far.

---

## Code Templates

### Template 1: Opposite-End Two Pointers

**When to use this template:** Problems involving sorted arrays where you need to find a pair satisfying a condition (pair sum, container area), or symmetric checks like palindrome verification. The key requirement is that moving one pointer gives you a clear signal about which direction reduces the search space. O(n) time, O(1) space. Adapt the `shouldMoveLeft` / `shouldMoveRight` predicates for each problem variant.

```java
// Generic opposite-end two-pointer template.
// Use for: pair sum, container water, palindrome, sorted merge.
public static int twoPointerOpposite(int[] arr) {
    int left = 0, right = arr.length - 1;
    int result = 0; // accumulator — adapt per problem

    while (left < right) {
        int current = compute(arr, left, right); // problem-specific

        if (shouldMoveLeft(current)) {
            left++;
        } else if (shouldMoveRight(current)) {
            right--;
        } else {
            result = update(result, current);
            left++;
            right--;
        }
    }
    return result;
}
```

**Concrete example — Two Sum on sorted array**:

```java
public static int[] twoSumSorted(int[] numbers, int target) {
    int left = 0, right = numbers.length - 1;

    while (left < right) {
        int total = numbers[left] + numbers[right];
        if (total < target) {
            left++;
        } else if (total > target) {
            right--;
        } else {
            return new int[]{left + 1, right + 1}; // 1-indexed
        }
    }
    return new int[]{};
}
```

#### Two Pointer on Sorted Array Animation

<AlgoViz
  title="Two Sum on Sorted Array — Opposite-End Pointers"
  description="Find two numbers in [1, 3, 5, 7, 9] that sum to 12 using L/R pointers"
  steps={[
    {
      array: [1, 3, 5, 7, 9],
      highlights: [0, 4],
      pointers: { 0: "L", 4: "R" },
      variables: { target: 12, sum: 10, action: "Too small" },
      explanation: "L=0, R=4. Sum = 1 + 9 = 10. Sum is less than target 12, so move L right to increase the sum.",
      code: "total = numbers[0] + numbers[4]; // 10 < 12 → left++;"
    },
    {
      array: [1, 3, 5, 7, 9],
      highlights: [1, 4],
      pointers: { 1: "L", 4: "R" },
      variables: { target: 12, sum: 12, action: "Found!" },
      explanation: "L=1, R=4. Sum = 3 + 9 = 12. Matches target! Return indices [2, 5] (1-indexed).",
      code: "total = numbers[1] + numbers[4]; // 12 == 12 → return!"
    }
  ]}
/>

#### Palindrome Check Animation

<AlgoViz
  title="Palindrome Check — Two Pointers Inward"
  description="Verify 'racecar' is a palindrome by comparing characters from both ends"
  steps={[
    {
      array: ["r", "a", "c", "e", "c", "a", "r"],
      highlights: [0, 6],
      pointers: { 0: "L", 6: "R" },
      variables: { "L char": "r", "R char": "r", match: true },
      explanation: "L=0, R=6. Compare 'r' and 'r' -- they match! Move both pointers inward.",
      code: "s.charAt(0) == s.charAt(6); // 'r'=='r' → left++, right--"
    },
    {
      array: ["r", "a", "c", "e", "c", "a", "r"],
      highlights: [1, 5],
      pointers: { 1: "L", 5: "R" },
      variables: { "L char": "a", "R char": "a", match: true },
      explanation: "L=1, R=5. Compare 'a' and 'a' -- they match! Move both inward.",
      code: "s.charAt(1) == s.charAt(5); // 'a'=='a' → left++, right--"
    },
    {
      array: ["r", "a", "c", "e", "c", "a", "r"],
      highlights: [2, 4],
      pointers: { 2: "L", 4: "R" },
      variables: { "L char": "c", "R char": "c", match: true },
      explanation: "L=2, R=4. Compare 'c' and 'c' -- they match! Move both inward.",
      code: "s.charAt(2) == s.charAt(4); // 'c'=='c' → left++, right--"
    },
    {
      array: ["r", "a", "c", "e", "c", "a", "r"],
      highlights: [3],
      pointers: { 3: "L=R" },
      variables: { "L char": "e", "R char": "e", match: true },
      explanation: "L=3, R=3. Pointers have crossed (L is not less than R). All characters matched -- 'racecar' IS a palindrome!",
      code: "// left >= right → loop ends. return true;"
    }
  ]}
/>

#### String Reversal Animation

<AlgoViz
  title="String Reversal — Two Pointers Swapping From Edges"
  description="Reverse the character array ['h','e','l','l','o'] in place using two pointers"
  steps={[
    {
      array: ["h", "e", "l", "l", "o"],
      highlights: [0, 4],
      pointers: { 0: "L", 4: "R" },
      variables: { left: 0, right: 4 },
      explanation: "Initialize: L=0 points to 'h', R=4 points to 'o'. We will swap elements at L and R, then move inward until they meet.",
      code: "int left = 0, right = s.length - 1;"
    },
    {
      array: ["o", "e", "l", "l", "h"],
      highlights: [0, 4],
      pointers: { 0: "L", 4: "R" },
      variables: { swap: "h <-> o", left: 0, right: 4 },
      explanation: "Swap s[0]='h' and s[4]='o'. Array becomes ['o','e','l','l','h']. Advance L++, R--.",
      code: "swap(s, 0, 4); left++; right--;"
    },
    {
      array: ["o", "e", "l", "l", "h"],
      highlights: [1, 3],
      secondary: [0, 4],
      pointers: { 1: "L", 3: "R" },
      variables: { left: 1, right: 3 },
      explanation: "L=1 points to 'e', R=3 points to 'l'. left < right so we continue.",
      code: "// left=1 < right=3 -> continue"
    },
    {
      array: ["o", "l", "l", "e", "h"],
      highlights: [1, 3],
      secondary: [0, 4],
      pointers: { 1: "L", 3: "R" },
      variables: { swap: "e <-> l", left: 1, right: 3 },
      explanation: "Swap s[1]='e' and s[3]='l'. Array becomes ['o','l','l','e','h']. Advance L++, R--.",
      code: "swap(s, 1, 3); left++; right--;"
    },
    {
      array: ["o", "l", "l", "e", "h"],
      highlights: [2],
      secondary: [0, 1, 3, 4],
      pointers: { 2: "L=R" },
      variables: { left: 2, right: 2 },
      explanation: "L=2, R=2. left is NOT less than right, so the loop ends. The middle element stays in place.",
      code: "// left >= right -> done"
    },
    {
      array: ["o", "l", "l", "e", "h"],
      highlights: [0, 1, 2, 3, 4],
      variables: { result: "olleh", swaps: 2, time: "O(n)", space: "O(1)" },
      explanation: "Done! 'hello' reversed to 'olleh' in-place with only 2 swaps. O(n) time, O(1) space.",
      code: "// Reversed in-place: O(n) time, O(1) space"
    }
  ]}
/>

#### Three Sum Animation

<AlgoViz
  title="Three Sum — Fix One + Two Pointer Scan"
  description="Find triplets summing to 0 in [-4, -1, -1, 0, 1, 2] (sorted)"
  steps={[
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [0],
      pointers: { 0: "fix", 1: "L", 5: "R" },
      variables: { fixed: -4, target: 4, sum: "-1+2=1" },
      explanation: "Fix element -4 at index 0. Need two numbers summing to 4. L=1, R=5: -1+2=1, too small. Move L right.",
      code: "// fix=-4, need L+R=4. sum=1 < 4 → left++;"
    },
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [0],
      pointers: { 0: "fix", 2: "L", 5: "R" },
      variables: { fixed: -4, target: 4, sum: "-1+2=1" },
      explanation: "L=2, R=5: -1+2=1, still too small. Move L right.",
      code: "// sum=1 < 4 → left++;"
    },
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [0],
      pointers: { 0: "fix", 3: "L", 5: "R" },
      variables: { fixed: -4, target: 4, sum: "0+2=2" },
      explanation: "L=3, R=5: 0+2=2, still too small. Continue... No triplet with -4 sums to 0. Move to next fixed element.",
      code: "// sum=2 < 4 → left++; // eventually exhausts"
    },
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [1],
      pointers: { 1: "fix", 2: "L", 5: "R" },
      variables: { fixed: -1, target: 1, sum: "-1+2=1" },
      explanation: "Fix -1 at index 1. Need two numbers summing to 1. L=2, R=5: -1+2=1. Found triplet [-1, -1, 2]!",
      code: "// sum == target! result.add([-1, -1, 2]);"
    },
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [1],
      pointers: { 1: "fix", 3: "L", 4: "R" },
      variables: { fixed: -1, target: 1, sum: "0+1=1" },
      explanation: "Skip duplicate L. L=3, R=4: 0+1=1. Found another triplet [-1, 0, 1]!",
      code: "// sum == target! result.add([-1, 0, 1]);"
    },
    {
      array: [-4, -1, -1, 0, 1, 2],
      highlights: [2],
      variables: { fixed: -1, action: "Skip duplicate" },
      explanation: "Next fixed index 2 has value -1, same as index 1. Skip to avoid duplicate triplets. Final answer: [[-1,-1,2], [-1,0,1]].",
      code: "// nums[2]==nums[1], skip duplicate fixed element"
    }
  ]}
/>

### Template 2: Fast / Slow Pointers

```java
// Generic fast/slow pointer template.
// Use for: remove duplicates, partition, subsequence check.
public static int fastSlowPointer(int[] arr) {
    int slow = 0;

    for (int fast = 0; fast < arr.length; fast++) {
        if (shouldKeep(arr, fast, slow)) { // problem-specific condition
            arr[slow] = arr[fast];
            slow++;
        }
    }
    return slow; // new logical length
}
```

**Concrete example — Remove duplicates from sorted array**:

```java
public static int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;

    int slow = 0;
    for (int fast = 1; fast < nums.length; fast++) {
        if (nums[fast] != nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;
}
```

### Template 3: Character Frequency Map (Sliding Window)

**When to use this template:** Substring problems with constraints on character composition — "longest substring without repeats", "minimum window containing all characters of T", "find all anagram positions". The frequency map tracks the window contents, and the shrink condition enforces the constraint. O(n) time because each character is added and removed at most once. Space is O(k) where k is the alphabet size. For "longest" problems, update the answer after shrinking (window is valid). For "shortest" problems, update during shrinking (window is still valid).

```java
import java.util.HashMap;
import java.util.Map;

// Generic sliding window with frequency map.
// Use for: longest substring without repeats, minimum window substring,
//          anagram detection in substring, character replacement.
public static int slidingWindowFreq(String s) {
    Map<Character, Integer> freq = new HashMap<>();
    int left = 0;
    int result = 0; // or Integer.MAX_VALUE for minimum problems

    for (int right = 0; right < s.length(); right++) {
        char rc = s.charAt(right);
        freq.put(rc, freq.getOrDefault(rc, 0) + 1);

        while (windowInvalid(freq, right - left + 1)) { // shrink condition
            char lc = s.charAt(left);
            freq.put(lc, freq.get(lc) - 1);
            if (freq.get(lc) == 0) freq.remove(lc);
            left++;
        }

        result = Math.max(result, right - left + 1); // or Math.min for minimum
    }
    return result;
}
```

**Concrete example — Longest substring without repeating characters**:

```java
import java.util.HashMap;
import java.util.Map;

public static int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> seen = new HashMap<>();
    int left = 0;
    int maxLen = 0;

    for (int right = 0; right < s.length(); right++) {
        char ch = s.charAt(right);
        if (seen.containsKey(ch) && seen.get(ch) >= left) {
            left = seen.get(ch) + 1;
        }
        seen.put(ch, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

#### Sliding Window — Longest Substring Animation

<AlgoViz
  title="Longest Substring Without Repeating Characters — Sliding Window"
  description="Find the longest substring without repeats in 'abcabcbb' using a sliding window with hashMap"
  steps={[
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [0],
      pointers: { 0: "L=R" },
      hashMap: { a: 0 },
      variables: { left: 0, right: 0, maxLen: 1, window: "a" },
      explanation: "R=0: 'a' not seen. Record a->0 in hashMap. Window=[a], length=1. maxLen=1.",
      code: "seen.put('a', 0); maxLen = Math.max(0, 1) = 1;"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [0, 1],
      pointers: { 0: "L", 1: "R" },
      hashMap: { a: 0, b: 1 },
      variables: { left: 0, right: 1, maxLen: 2, window: "ab" },
      explanation: "R=1: 'b' not seen. Record b->1. Window=[a,b], length=2. maxLen=2.",
      code: "seen.put('b', 1); maxLen = Math.max(1, 2) = 2;"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [0, 1, 2],
      pointers: { 0: "L", 2: "R" },
      hashMap: { a: 0, b: 1, c: 2 },
      variables: { left: 0, right: 2, maxLen: 3, window: "abc" },
      explanation: "R=2: 'c' not seen. Record c->2. Window=[a,b,c], length=3. maxLen=3.",
      code: "seen.put('c', 2); maxLen = Math.max(2, 3) = 3;"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [1, 2, 3],
      pointers: { 1: "L", 3: "R" },
      hashMap: { a: 3, b: 1, c: 2 },
      variables: { left: 1, right: 3, maxLen: 3, window: "bca", conflict: "'a' seen at 0" },
      explanation: "R=3: 'a' was seen at index 0 (>= left=0). Move left to 0+1=1. Update a->3. Window=[b,c,a], length=3.",
      code: "left = seen.get('a') + 1; // left = 1"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [2, 3, 4],
      pointers: { 2: "L", 4: "R" },
      hashMap: { a: 3, b: 4, c: 2 },
      variables: { left: 2, right: 4, maxLen: 3, window: "cab", conflict: "'b' seen at 1" },
      explanation: "R=4: 'b' was seen at index 1 (>= left=1). Move left to 1+1=2. Update b->4. Window=[c,a,b], length=3.",
      code: "left = seen.get('b') + 1; // left = 2"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [3, 4, 5],
      pointers: { 3: "L", 5: "R" },
      hashMap: { a: 3, b: 4, c: 5 },
      variables: { left: 3, right: 5, maxLen: 3, window: "abc", conflict: "'c' seen at 2" },
      explanation: "R=5: 'c' was seen at index 2 (>= left=2). Move left to 2+1=3. Update c->5. Window=[a,b,c], length=3.",
      code: "left = seen.get('c') + 1; // left = 3"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [5, 6],
      pointers: { 5: "L", 6: "R" },
      hashMap: { a: 3, b: 6, c: 5 },
      variables: { left: 5, right: 6, maxLen: 3, window: "cb" },
      explanation: "R=6: 'b' was seen at index 4 (>= left=3). Move left to 4+1=5. Update b->6. Window=[c,b], length=2. maxLen stays 3.",
      code: "left = seen.get('b') + 1; // left = 5"
    },
    {
      array: ["a", "b", "c", "a", "b", "c", "b", "b"],
      highlights: [7],
      pointers: { 7: "L=R" },
      hashMap: { a: 3, b: 7, c: 5 },
      variables: { left: 7, right: 7, maxLen: 3, result: 3 },
      explanation: "R=7: 'b' seen at index 6 (>= left=5). Move left to 7. Window=[b], length=1. Done! Answer: maxLen=3 (substring 'abc').",
      code: "return maxLen; // 3 (substring 'abc')"
    }
  ]}
/>

### Template 4: Expand-Around-Center (Palindrome Substrings)

```java
// Expand outward while characters match.
public static String expandAroundCenter(String s, int left, int right) {
    while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
        left--;
        right++;
    }
    return s.substring(left + 1, right);
}

public static String longestPalindrome(String s) {
    String result = "";
    for (int i = 0; i < s.length(); i++) {
        // Odd-length palindromes
        String odd = expandAroundCenter(s, i, i);
        if (odd.length() > result.length()) result = odd;
        // Even-length palindromes
        String even = expandAroundCenter(s, i, i + 1);
        if (even.length() > result.length()) result = even;
    }
    return result;
}
```

---

## Complexity Analysis

| Pattern | Time | Space | Notes |
|---------|------|-------|-------|
| Opposite-end pointers | O(n) | O(1) | Single pass from both ends |
| Fast/slow pointers | O(n) | O(1) | Single pass, in-place |
| Sliding window (fixed) | O(n) | O(1) | Window size constant |
| Sliding window (variable) | O(n) | O(k) | k = alphabet/unique chars |
| Frequency counter compare | O(n) | O(k) | k = alphabet size |
| Sort + two pointers | O(n log n) | O(1)–O(n) | Dominated by sort |
| Expand around center | O(n²) | O(1) | n centers × O(n) expansion |
| Brute force pair check | O(n²) | O(1) | Two-pointer replaces this |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|------------------------|----------|----------|
| "Is it a palindrome?" | Opposite-end two pointers comparing characters inward | Opposite-End |
| "Two numbers that sum to target (sorted)" | Left/right pointers, move based on sum comparison | Opposite-End |
| "Remove duplicates in-place" | Fast/slow pointers — slow marks write position | Fast/Slow |
| "Longest substring without repeating characters" | Variable sliding window with hash set | Sliding Window |
| "Minimum window containing all of T" | Variable sliding window with frequency map, shrink while valid | Sliding Window (Shortest) |
| "Find all anagrams of pattern in string" | Fixed-size sliding window (size = pattern length) with frequency comparison | Fixed Window |
| "Container / trapping water" | Opposite-end pointers, move the shorter side | Opposite-End |
| "Is subsequence?" | Two pointers advancing through both strings | Fast/Slow |
| "Sort colors / partition" | Dutch National Flag — three-way partition with two pointers | Fast/Slow |
| "Longest palindromic substring" | Expand around each center (odd and even lengths) | Expand-Around-Center |

---

## Worked Example: Container With Most Water (LC 11)

### Problem

Given `n` non-negative integers `height[0..n-1]` where each represents a vertical line at position `i`, find two lines that together with the x-axis form a container holding the most water.

### Why not brute force?

The naive approach checks every pair of lines: for each index `i`, try every index `j > i`, compute the water area, and track the maximum. This is O(n^2). For n = 10,000 lines, that is 50 million area calculations. The two-pointer approach reduces this to exactly n - 1 steps by proving that the shorter line can be safely discarded at each step — you never miss the optimal pair.

### Key Insight

:::tip Key Insight
The shorter line is the bottleneck. Moving the taller line inward can never increase the area (width shrinks, height stays capped by the shorter line). So always move the pointer at the shorter line — this is the only way to potentially find a taller line that increases the area.
:::

Water held between indices `i` and `j` is:

```
area = min(height[i], height[j]) × (j - i)
```

The brute-force approach checks all O(n²) pairs. Two pointers reduce this to O(n) by observing: **moving the taller line inward can never increase the area** (width shrinks and height is capped by the shorter line). So always move the **shorter** line.

### Step-by-Step Trace

Input: `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`

```
Index:   0  1  2  3  4  5  6  7  8
Height:  1  8  6  2  5  4  8  3  7
```

| Step | L | R | height[L] | height[R] | Width | Area | Max | Action |
|------|---|---|-----------|-----------|-------|------|-----|--------|
| 1 | 0 | 8 | 1 | 7 | 8 | min(1,7)×8 = **8** | 8 | L shorter → L++ |
| 2 | 1 | 8 | 8 | 7 | 7 | min(8,7)×7 = **49** | 49 | R shorter → R-- |
| 3 | 1 | 7 | 8 | 3 | 6 | min(8,3)×6 = **18** | 49 | R shorter → R-- |
| 4 | 1 | 6 | 8 | 8 | 5 | min(8,8)×5 = **40** | 49 | Equal → move either, L++ |
| 5 | 2 | 6 | 6 | 8 | 4 | min(6,8)×4 = **24** | 49 | L shorter → L++ |
| 6 | 3 | 6 | 2 | 8 | 3 | min(2,8)×3 = **6** | 49 | L shorter → L++ |
| 7 | 4 | 6 | 5 | 8 | 2 | min(5,8)×2 = **10** | 49 | L shorter → L++ |
| 8 | 5 | 6 | 4 | 8 | 1 | min(4,8)×1 = **4** | 49 | L shorter → L++ |
| — | 6 | 6 | — | — | — | — | — | L == R → stop |

**Answer**: 49 (between indices 1 and 8, heights 8 and 7).

### Implementation

```java
public static int maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int best = 0;

    while (left < right) {
        int w = right - left;
        int h = Math.min(height[left], height[right]);
        best = Math.max(best, w * h);

        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return best;
}
```

### Why It Works — Proof Sketch

At each step we discard the shorter line. Suppose `height[L] < height[R]`. Any container using `L` with an index `j < R` has:
- **Smaller width**: `j - L < R - L`
- **Height capped at** `height[L]` (since `height[L]` is already the minimum)

So no un-examined pair involving `L` can beat the current best. Discarding `L` is safe.

### Interactive Animation

<AlgoViz
  title="Container With Most Water — Two Pointer Approach"
  description="Watch the two pointers converge to find the maximum area"
  steps={[
    {
      array: [1, 8, 6, 2, 5, 4, 8, 3, 7],
      highlights: [0, 8],
      pointers: { 0: "L", 8: "R" },
      variables: { width: 8, height: 1, area: 8, best: 8 },
      explanation: "L=0, R=8. height=min(1,7)=1, width=8, area=8. L is shorter, move L right.",
      code: "left++;"
    },
    {
      array: [1, 8, 6, 2, 5, 4, 8, 3, 7],
      highlights: [1, 8],
      pointers: { 1: "L", 8: "R" },
      variables: { width: 7, height: 7, area: 49, best: 49 },
      explanation: "L=1, R=8. height=min(8,7)=7, width=7, area=49. New best! R is shorter, move R left.",
      code: "right--;"
    },
    {
      array: [1, 8, 6, 2, 5, 4, 8, 3, 7],
      highlights: [1, 7],
      pointers: { 1: "L", 7: "R" },
      variables: { width: 6, height: 3, area: 18, best: 49 },
      explanation: "L=1, R=7. height=min(8,3)=3, width=6, area=18. No improvement. R is shorter, move R left.",
      code: "right--;"
    },
    {
      array: [1, 8, 6, 2, 5, 4, 8, 3, 7],
      highlights: [1, 6],
      pointers: { 1: "L", 6: "R" },
      variables: { width: 5, height: 8, area: 40, best: 49 },
      explanation: "L=1, R=6. height=min(8,8)=8, width=5, area=40. No improvement. Equal heights, move L right.",
      code: "left++;"
    },
    {
      array: [1, 8, 6, 2, 5, 4, 8, 3, 7],
      highlights: [2, 6],
      pointers: { 2: "L", 6: "R" },
      variables: { width: 4, height: 6, area: 24, best: 49 },
      explanation: "L=2, R=6. height=min(6,8)=6, width=4, area=24. Continue shrinking... Final answer: 49.",
      code: "left++;"
    }
  ]}
/>

---

## Problem Table

### Day 1–2: Foundation (Easy-Focused)

| # | Problem | Difficulty | Pattern | ⭐ | LeetCode |
|---|---------|------------|---------|---|----------|
| 1 | Valid Palindrome | Easy | Two pointers | ⭐ | [LC 125](https://leetcode.com/problems/valid-palindrome/) |
| 2 | Valid Anagram | Easy | Frequency count | | [LC 242](https://leetcode.com/problems/valid-anagram/) |
| 3 | Reverse String | Easy | Two pointers in-place | ⭐ | [LC 344](https://leetcode.com/problems/reverse-string/) |
| 4 | Is Subsequence | Easy | Two pointers | | [LC 392](https://leetcode.com/problems/is-subsequence/) |
| 5 | Longest Common Prefix | Easy | Vertical scan | | [LC 14](https://leetcode.com/problems/longest-common-prefix/) |
| 6 | Roman to Integer | Easy | Map + scan | | [LC 13](https://leetcode.com/problems/roman-to-integer/) |
| 7 | Merge Sorted Array | Easy | Two pointers from end | | [LC 88](https://leetcode.com/problems/merge-sorted-array/) |

### Day 3–4: Intermediate (Medium-Focused)

| # | Problem | Difficulty | Pattern | ⭐ | LeetCode |
|---|---------|------------|---------|---|----------|
| 8 | 3Sum | Medium | Sort + two pointers | ⭐ | [LC 15](https://leetcode.com/problems/3sum/) |
| 9 | Container With Most Water | Medium | Two pointers | ⭐ | [LC 11](https://leetcode.com/problems/container-with-most-water/) |
| 10 | Two Sum II – Input Array Is Sorted | Medium | Two pointers | | [LC 167](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) |
| 11 | Longest Substring Without Repeating Characters | Medium | Sliding window | ⭐ | [LC 3](https://leetcode.com/problems/longest-substring-without-repeating-characters/) |
| 12 | String to Integer (atoi) | Medium | Parsing | | [LC 8](https://leetcode.com/problems/string-to-integer-atoi/) |
| 13 | Longest Palindromic Substring | Medium | Expand from center | ⭐ | [LC 5](https://leetcode.com/problems/longest-palindromic-substring/) |
| 14 | Group Anagrams | Medium | Sort key | | [LC 49](https://leetcode.com/problems/group-anagrams/) |

### Day 5–7: Advanced (Medium/Hard)

| # | Problem | Difficulty | Pattern | ⭐ | LeetCode |
|---|---------|------------|---------|---|----------|
| 15 | Trapping Rain Water | Hard | Two pointers | ⭐ | [LC 42](https://leetcode.com/problems/trapping-rain-water/) |
| 16 | Minimum Window Substring | Hard | Sliding window | | [LC 76](https://leetcode.com/problems/minimum-window-substring/) |
| 17 | Palindromic Substrings | Medium | Expand around center | | [LC 647](https://leetcode.com/problems/palindromic-substrings/) |
| 18 | Sort Colors | Medium | Dutch national flag | ⭐ | [LC 75](https://leetcode.com/problems/sort-colors/) |
| 19 | 4Sum | Medium | Two pointers nested | | [LC 18](https://leetcode.com/problems/4sum/) |
| 20 | Compare Version Numbers | Medium | Two pointers | | [LC 165](https://leetcode.com/problems/compare-version-numbers/) |
| 21 | Longest Repeating Character Replacement | Medium | Sliding window | | [LC 424](https://leetcode.com/problems/longest-repeating-character-replacement/) |

---

## Mock Interviews

### Mock Interview 1: String Manipulation + Two Pointers

**Problem**: *Valid Palindrome II* — Given a string `s`, return `true` if it can be made a palindrome after deleting **at most one** character.

**Interviewer follow-ups**:

1. **"Walk me through your approach before coding."**
   - Use two pointers from opposite ends. When a mismatch is found at `(L, R)`, check whether `s[L+1..R]` or `s[L..R-1]` is a palindrome. If either is, return `true`.
   - Time: O(n), Space: O(1).

2. **"What if we allow deleting at most k characters?"**
   - The two-pointer approach extends recursively, but worst case becomes O(2^k · n). For large k, switch to **dynamic programming** on `s` vs `reverse(s)` — the longest common subsequence (LCS) approach: it's a palindrome after at most `n - LCS(s, reverse(s))` deletions. Time: O(n²), Space: O(n).

3. **"Can you handle the k=1 case without recursion?"**
   - Yes. After the first mismatch at `(L, R)`, run a simple palindrome check on both substrings `s[L+1..R]` and `s[L..R-1]`. Each check is a linear scan that doesn't recurse further, so the total work is still O(n).

4. **"How would you test this?"**
   - Empty string → `true`.
   - Single character → `true`.
   - Already a palindrome → `true` (no deletion needed).
   - Needs exactly one deletion: `"abca"` → delete `'b'` or `'c'` → `true`.
   - Cannot be fixed: `"abc"` → `false`.

---

### Mock Interview 2: Sliding Window + Frequency

**Problem**: *Minimum Window Substring* — Given strings `s` and `t`, find the shortest substring of `s` that contains all characters of `t` (including duplicates).

**Interviewer follow-ups**:

1. **"Explain the sliding window approach."**
   - Build a frequency map `need` from `t`. Maintain a window `[left, right]` over `s` with a counter `have` tracking how many distinct characters are fully satisfied. Expand `right` until the window is valid, then shrink `left` to minimize.
   - Time: O(n + m) where n = `len(s)`, m = `len(t)`. Space: O(k) where k is the alphabet size.

2. **"What data structures do you need?"**
   - Two hashmaps: `need` (target frequencies) and `window` (current window frequencies).
   - Two integers: `have` (distinct chars satisfied) and `required` (distinct chars in `t`).
   - Result tracking: `best_len` and `best_start`.

3. **"What if `t` contains duplicates like `t = "AABC"`?"**
   - The frequency map naturally handles this. `need = A:2, B:1, C:1`. A character is "satisfied" only when `window[ch] >= need[ch]`. So we need at least 2 A's in our window.

4. **"Can you optimize further if the alphabet is small?"**
   - Use a fixed-size array `[0]*128` instead of a hashmap for ASCII. This eliminates hash overhead and improves cache locality, though asymptotic complexity is unchanged.

5. **"Walk through `s = "ADOBECODEBANC"`, `t = "ABC"`."**
   - Optimal window: `"BANC"` (index 9–12, length 4). The window slides right, finds the first valid window `"ADOBEC"`, then shrinks from the left. Continues expanding and contracting until it discovers `"BANC"` as the shortest valid window.

---

## Tips & Edge Cases

### Common Pitfalls

| Pitfall | What Goes Wrong | Fix |
|---------|----------------|-----|
| Skipping non-alphanumeric chars | Palindrome check fails on `"A man, a plan..."` | Filter with `Character.isLetterOrDigit(ch)` inside the loop |
| Off-by-one in sliding window | Window size calculated as `right - left` instead of `right - left + 1` | Always verify with a 1-element window |
| Forgetting to handle empty strings | Index out of bounds on `s.charAt(0)` | Guard with `if (s == null \|\| s.isEmpty()) return ...` |
| Concatenating strings in a loop | Creating new String objects in a loop → O(n²) | Use `StringBuilder`, work in-place, call `toString()` at end |
| Not skipping duplicates in 3Sum/4Sum | Duplicate triplets in result | After finding a match, advance pointers past duplicate values |

### Edge Cases to Always Test

- **Empty input**: `s = ""`
- **Single character**: `s = "a"`
- **All same characters**: `s = "aaaa"`
- **Already sorted / reverse sorted**
- **Unicode / mixed case**: Clarify with interviewer whether input is ASCII-only
- **Integer overflow in atoi**: Clamp to `[Integer.MIN_VALUE, Integer.MAX_VALUE]`
- **Strings with only non-alphanumeric characters**: `s = ",.!?"` — should be treated as an empty palindrome

### Two-Pointer Invariants to Maintain

1. **Opposite-end**: `left < right` — never cross.
2. **Fast/slow**: `slow <= fast` — slow never overtakes fast.
3. **Sliding window**: `left <= right` — window size is always non-negative.
4. **Sorted prerequisite**: Opposite-end pair-sum only works on **sorted** data. If unsorted, sort first or use a hashmap instead.

### When Two Pointers Won't Work

- **Unsorted data with no ordering property** — Use hashmaps.
- **Need all pairs, not just optimal** — May need O(n²) regardless.
- **Non-contiguous selections** — Consider DP or backtracking.
- **Graph/tree structures** — Different traversal patterns needed.
