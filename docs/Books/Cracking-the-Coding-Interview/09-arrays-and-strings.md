# Chapter 1 — Arrays and Strings

> Arrays and strings are the most fundamental data structures in computer science—and the most commonly tested in interviews. Mastering hash tables, dynamic arrays, and string manipulation patterns unlocks solutions to a huge swath of interview problems.

---

## Hash Tables

A **hash table** maps keys to values for highly efficient lookup. Under the hood, it computes a hash code from the key, maps that to an index in an array, and stores the value there.

### How It Works

```
Key → hashCode() → index = hash % array_length → bucket
```

```
┌─────────────────────────────────────────────────┐
│  Hash Table Internals                           │
│                                                 │
│  key: "abc"                                     │
│    │                                            │
│    ▼                                            │
│  hashCode("abc") = 96354                        │
│    │                                            │
│    ▼                                            │
│  index = 96354 % 16 = 2                         │
│    │                                            │
│    ▼                                            │
│  buckets[2] → ("abc", value)                    │
│                                                 │
│  Buckets:                                       │
│  ┌───┬───────────────────────────────┐          │
│  │ 0 │ null                          │          │
│  │ 1 │ ("xyz", 42)                   │          │
│  │ 2 │ ("abc", 10) → ("def", 20)    │  ← chain │
│  │ 3 │ null                          │          │
│  │ 4 │ ("ghi", 30)                   │          │
│  │...│ ...                           │          │
│  └───┴───────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

### Collision Resolution

Two keys can hash to the same index. Two common strategies:

| Strategy | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **Chaining** | Each bucket holds a linked list of entries | Simple, graceful degradation | Extra memory for pointers |
| **Open Addressing** | Probe for next empty slot (linear, quadratic, double hashing) | Cache-friendly, no extra pointers | Clustering, complex deletion |

### Complexity

| Operation | Average | Worst Case |
|-----------|---------|------------|
| Insert    | O(1)    | O(N)       |
| Lookup    | O(1)    | O(N)       |
| Delete    | O(1)    | O(N)       |

> Worst case O(N) happens when all keys collide into the same bucket. With a good hash function and reasonable load factor (typically ≤ 0.75), operations are effectively O(1).

### Java Implementation Notes

```java
HashMap<String, Integer> map = new HashMap<>();
map.put("alice", 85);
map.put("bob", 92);

int score = map.getOrDefault("alice", 0); // 85

// Iterate
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
```

- `HashMap` — unordered, allows one null key
- `LinkedHashMap` — maintains insertion order
- `TreeMap` — sorted by key, O(log N) operations
- `HashSet` — hash table with keys only (no values)

---

## ArrayList & Resizable Arrays

Standard arrays have a fixed size. An **ArrayList** (Java) or dynamic array provides automatic resizing while maintaining O(1) random access.

### How Resizing Works

```
Initial:   [a][b][c][d]          capacity = 4, size = 4

Insert 'e' → array is full!

Step 1: Allocate new array of double capacity
           [_][_][_][_][_][_][_][_]    capacity = 8

Step 2: Copy existing elements
           [a][b][c][d][_][_][_][_]

Step 3: Insert new element
           [a][b][c][d][e][_][_][_]    size = 5
```

### Amortized O(1) Insertion — The Proof

When we double on reaching capacity N, the cost of that one insertion is O(N) for copying. But the previous N/2 insertions were each O(1). So the total cost for N insertions:

```
Total work = N + N/2 + N/4 + N/8 + ... ≈ 2N

Amortized cost per insertion = 2N / N = O(1)
```

> The key insight: expensive doublings happen so infrequently that they are "paid for" by the many cheap insertions between them. This is the **aggregate method** of amortized analysis.

### Complexity

| Operation | Time |
|-----------|------|
| Access by index | O(1) |
| Append (amortized) | O(1) |
| Insert at index i | O(N) |
| Delete at index i | O(N) |
| Search (unsorted) | O(N) |

---

## StringBuilder

### The Problem with String Concatenation

Strings are **immutable** in Java (and Python). Every concatenation creates a new string:

```java
// Naive approach — O(xN²) where x = word length
String result = "";
for (String word : words) {
    result += word;  // copies all previous characters each time
}
```

For N words of length x, the total characters copied:

```
x + 2x + 3x + ... + Nx = x · N(N+1)/2 = O(xN²)
```

### The Solution: StringBuilder

```java
StringBuilder sb = new StringBuilder();
for (String word : words) {
    sb.append(word);  // appends to internal buffer
}
String result = sb.toString();  // O(N) total
```

`StringBuilder` maintains a resizable character array internally, so appending is amortized O(1), making the total O(xN).

```
┌──────────────────────────────────────────────────────┐
│  Naive Concatenation          StringBuilder          │
│                                                      │
│  "a"        → copy 1          buffer: [a]            │
│  "a"+"b"    → copy 2          buffer: [a][b]         │
│  "ab"+"c"   → copy 3          buffer: [a][b][c]      │
│  "abc"+"d"  → copy 4          buffer: [a][b][c][d]   │
│                                                      │
│  Total: 1+2+3+4 = 10         Total: 4 appends       │
│  O(N²)                        O(N)                   │
└──────────────────────────────────────────────────────┘
```

---

## Key Operations and Complexities

| Data Structure | Access | Search | Insert | Delete | Space |
|---------------|--------|--------|--------|--------|-------|
| Array | O(1) | O(N) | O(N) | O(N) | O(N) |
| Dynamic Array | O(1) | O(N) | O(1)* | O(N) | O(N) |
| Hash Table | — | O(1) | O(1) | O(1) | O(N) |
| String (immutable) | O(1) | O(N) | O(N) | O(N) | O(N) |

*amortized

---

## Interview Patterns

### Pattern 1: Two Pointers

Use two pointers moving toward each other or in the same direction to solve problems in O(N) time with O(1) space.

```java
// Check if a string is a palindrome
boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++;
        right--;
    }
    return true;
}
```

**When to use:** Sorted arrays, palindrome checks, pair finding, partitioning.

### Pattern 2: Sliding Window

Maintain a window `[left, right]` that expands or shrinks to find optimal subarrays/substrings.

```java
// Longest substring without repeating characters
int lengthOfLongestSubstring(String s) {
    Set<Character> window = new HashSet<>();
    int left = 0, maxLen = 0;
    for (int right = 0; right < s.length(); right++) {
        while (window.contains(s.charAt(right))) {
            window.remove(s.charAt(left));
            left++;
        }
        window.add(s.charAt(right));
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

**When to use:** Substring problems, contiguous subarray problems, "find the longest/shortest with constraint."

### Pattern 3: Character Frequency Counting

Use an array of size 128 (ASCII) or 26 (lowercase letters) as a lightweight hash map.

```java
// Check if two strings are anagrams
boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] freq = new int[26];
    for (int i = 0; i < s.length(); i++) {
        freq[s.charAt(i) - 'a']++;
        freq[t.charAt(i) - 'a']--;
    }
    for (int count : freq) {
        if (count != 0) return false;
    }
    return true;
}
```

**When to use:** Anagrams, permutation checks, character-based constraints.

### Pattern 4: In-Place Modification

Modify the array/string in-place to achieve O(1) space. Often uses a write pointer.

```java
// URLify: replace spaces with '%20', given true length
void urlify(char[] str, int trueLength) {
    int spaces = 0;
    for (int i = 0; i < trueLength; i++) {
        if (str[i] == ' ') spaces++;
    }
    int writeIdx = trueLength + spaces * 2 - 1;
    for (int i = trueLength - 1; i >= 0; i--) {
        if (str[i] == ' ') {
            str[writeIdx--] = '0';
            str[writeIdx--] = '2';
            str[writeIdx--] = '%';
        } else {
            str[writeIdx--] = str[i];
        }
    }
}
```

> Working backward prevents overwriting unprocessed characters — a common trick for in-place string manipulation.

---

## Interview Questions Overview

### 1.1 — Is Unique

> Determine if a string has all unique characters. What if you cannot use additional data structures?

**Approaches:**
- **Hash Set:** Track seen characters → O(N) time, O(1) space (bounded alphabet)
- **Bit Vector:** Use an `int` as a 26-bit set for lowercase letters → O(N) time, O(1) space
- **No extra DS:** Sort first → O(N log N) time, O(1) space; or brute-force O(N²)

```java
boolean isUnique(String s) {
    int checker = 0;
    for (int i = 0; i < s.length(); i++) {
        int bit = s.charAt(i) - 'a';
        if ((checker & (1 << bit)) != 0) return false;
        checker |= (1 << bit);
    }
    return true;
}
```

### 1.2 — Check Permutation

> Given two strings, decide if one is a permutation of the other.

**Key insight:** Two strings are permutations iff they have the same character frequencies.

- Sort both, compare → O(N log N)
- Character count array → O(N)

### 1.3 — URLify

> Replace all spaces in a string with `%20`, given the true length. Assume the array has sufficient trailing space.

**Approach:** Count spaces, work backward filling in `%20`. See Pattern 4 above.

### 1.4 — Palindrome Permutation

> Check if a string is a permutation of a palindrome.

**Key insight:** At most one character can have an odd frequency. Use a bit vector to toggle bits; final result should have at most one bit set.

```java
boolean isPermutationOfPalindrome(String phrase) {
    int bitVector = 0;
    for (char c : phrase.toLowerCase().toCharArray()) {
        if (c >= 'a' && c <= 'z') {
            int mask = 1 << (c - 'a');
            bitVector ^= mask;
        }
    }
    return (bitVector & (bitVector - 1)) == 0;
}
```

### 1.5 — One Away

> Three types of edits: insert, remove, replace a character. Check if two strings are zero or one edit apart.

**Approach:** If lengths differ by more than 1 → false. Otherwise, walk through both strings tracking one allowed difference.

### 1.6 — String Compression

> Compress using counts of repeated characters: `aabcccccaaa` → `a2b1c5a3`. Return original if compressed is not shorter.

**Approach:** Use StringBuilder, walk through counting consecutive duplicates.

### 1.7 — Rotate Matrix

> Rotate an N×N matrix 90 degrees clockwise in-place.

**Approach:** Rotate layer by layer from outside in. For each layer, perform a four-way swap.

```
Before:          After (90° CW):
1 2 3            7 4 1
4 5 6            8 5 2
7 8 9            9 6 3
```

### 1.8 — Zero Matrix

> If an element in an M×N matrix is 0, set its entire row and column to 0.

**Approach:** Use the first row and first column as markers (O(1) space). Two-pass: mark, then zero out.

### 1.9 — String Rotation

> Given `isSubstring()`, check if s2 is a rotation of s1 using only one call.

**Key insight:** If s2 is a rotation of s1, then s2 is always a substring of s1 + s1.

```java
boolean isRotation(String s1, String s2) {
    if (s1.length() != s2.length() || s1.isEmpty()) return false;
    return (s1 + s1).contains(s2);
}
```

---

## Quick Reference: ASCII Values

| Character | ASCII |
|-----------|-------|
| `'0'` | 48 |
| `'9'` | 57 |
| `'A'` | 65 |
| `'Z'` | 90 |
| `'a'` | 97 |
| `'z'` | 122 |

> Remember: `'a' - 'A' = 32`. You can toggle case with XOR: `ch ^ 32`.

---

## Key Takeaways

1. **Hash tables** are your best friend — O(1) lookup solves countless problems
2. **Ask about the character set** — ASCII (128), extended ASCII (256), or Unicode?
3. **Bit vectors** can replace hash sets for boolean character tracking
4. **Two pointers** and **sliding window** are the go-to patterns for O(N) solutions
5. **In-place tricks** — work backward, use input as storage, XOR swaps
6. **StringBuilder** — always use it for repeated concatenation
7. **Edge cases to always check:** empty string, single character, all same characters, already sorted
