---
sidebar_position: 15
title: "Week 14: String Algorithms I — Pattern Matching"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 14: String Algorithms I — Pattern Matching

## Overview

Pattern matching is one of the most fundamental problems in computer science: given a text `T` of length `n` and a pattern `P` of length `m`, find all occurrences of `P` in `T`. The naive approach runs in O(n·m), but three classical algorithms — **KMP**, **Z-function**, and **Rabin-Karp** — solve it in O(n + m). Each offers different trade-offs in implementation complexity, constant factors, and extensibility to harder problems (multi-pattern search, palindromic queries, longest duplicate substrings).

This week you will master all three algorithms from first principles, understand when to reach for each one, and apply them to 21 problems that span single-pattern search, repeated substring detection, palindrome construction, and hashing-based substring queries.

---

## Core Theory

<AlgoViz
  title="KMP Failure Function Construction"
  steps={[
    { description: "Build failure function for pattern P = \"ABABAC\". Initialize fail = [0,0,0,0,0,0], k = 0.", state: { pattern: "A B A B A C", fail: "[0, 0, 0, 0, 0, 0]", k: 0 } },
    { description: "i=1: P[1]='B', k=0, P[0]='A' != 'B'. fail[1] = 0.", state: { pattern: "A B A B A C", i: 1, k: 0, fail: "[0, 0, 0, 0, 0, 0]", comparison: "'A' != 'B'" } },
    { description: "i=2: P[2]='A', k=0, P[0]='A' == 'A'. k becomes 1. fail[2] = 1.", state: { pattern: "A B A B A C", i: 2, k: 1, fail: "[0, 0, 1, 0, 0, 0]", comparison: "'A' == 'A'" } },
    { description: "i=3: P[3]='B', k=1, P[1]='B' == 'B'. k becomes 2. fail[3] = 2.", state: { pattern: "A B A B A C", i: 3, k: 2, fail: "[0, 0, 1, 2, 0, 0]", comparison: "'B' == 'B'" } },
    { description: "i=4: P[4]='A', k=2, P[2]='A' == 'A'. k becomes 3. fail[4] = 3.", state: { pattern: "A B A B A C", i: 4, k: 3, fail: "[0, 0, 1, 2, 3, 0]", comparison: "'A' == 'A'" } },
    { description: "i=5: P[5]='C', k=3, P[3]='B' != 'C'. Fall back: k = fail[2] = 1. P[1]='B' != 'C'. Fall back: k = fail[0] = 0. P[0]='A' != 'C'. fail[5] = 0.", state: { pattern: "A B A B A C", i: 5, k: 0, fail: "[0, 0, 1, 2, 3, 0]", comparison: "Fallback chain: 3 -> 1 -> 0" } },
    { description: "Final failure function: [0, 0, 1, 2, 3, 0]. This tells KMP how far to fall back on mismatch without re-scanning text.", state: { pattern: "A B A B A C", fail: "[0, 0, 1, 2, 3, 0]", complete: true } }
  ]}
/>

### 1. KMP (Knuth-Morris-Pratt)

**Why this technique exists.** The naive pattern-matching algorithm, on a mismatch, throws away all progress and restarts the comparison from scratch. For pathological inputs like searching "AAAB" in "AAAAAAA...AB", this leads to O(n times m) time because the same text characters are compared over and over. KMP eliminates this redundancy by precomputing, for each position in the pattern, the longest prefix of the pattern that is also a suffix of the matched portion. On a mismatch, KMP uses this precomputed information to "jump" the pattern pointer forward without re-reading any text character.

**The intuition.** Imagine you are reading a book and matching it against a reference sentence. You have matched 10 characters when you hit a mismatch. Instead of going back to the start of the reference, you realize that the last 4 characters you matched happen to also be the first 4 characters of the reference. So you can continue from position 4 in the reference, saving yourself from re-reading those 4 characters. The failure function precomputes exactly how far you can "salvage" for every possible mismatch position.

**Interview signals.** Look for: (1) "find pattern in text" with optimal complexity, (2) "repeated substring pattern" (the failure function reveals periods), (3) "shortest palindrome by prepending" (KMP on s + sentinel + reverse(s)), (4) "longest prefix which is also suffix."

**Common mistakes.** (1) Off-by-one in the match index: when `j == m`, the match starts at `i - m + 1` in 0-indexed text, not `i - m`. (2) Forgetting to set `j = fail[j-1]` after finding a match, which causes overlapping matches to be missed. (3) Confusing 1-indexed and 0-indexed failure function definitions — many textbooks use 1-indexed, but most interview implementations use 0-indexed. (4) Attempting to use KMP for multi-pattern search — it handles only one pattern; use Aho-Corasick for multiple patterns.

#### The Problem

Find every index `i` in text `T[0..n-1]` such that `T[i..i+m-1] == P[0..m-1]`.

The naive algorithm, on a mismatch at position `j` in the pattern, resets `j` to 0 and advances `i` by 1. KMP's insight is that the **pattern itself** contains information about which characters have already been matched, so we never need to move `i` backward.

#### The Failure Function (Prefix Function)

Define `fail[i]` as the length of the **longest proper prefix** of `P[0..i]` that is also a **suffix** of `P[0..i]`.

- "Proper" means the prefix cannot be the entire string `P[0..i]` itself.
- `fail[0] = 0` always (a single character has no proper prefix that is also a suffix).

**Example for `P = "ABABAC"`:**

| i | P[0..i]  | Longest proper prefix = suffix | fail[i] |
|---|----------|-------------------------------|---------|
| 0 | A        | (none)                        | 0       |
| 1 | AB       | (none)                        | 0       |
| 2 | ABA      | "A"                           | 1       |
| 3 | ABAB     | "AB"                          | 2       |
| 4 | ABABA    | "ABA"                         | 3       |
| 5 | ABABAC   | (none — "ABABA" ≠ suffix)     | 0       |

#### Derivation of Failure Function Construction in O(m)

The key insight is that `fail[i]` can be computed incrementally. Suppose we know `fail[0..i-1]` and want to compute `fail[i]`.

Let `k = fail[i-1]`. This means `P[0..k-1] == P[i-k..i-1]` (the best prefix-suffix match up to position `i-1`).

- **If `P[k] == P[i]`:** We can extend the match by one character. So `fail[i] = k + 1`.
- **If `P[k] != P[i]`:** The current prefix-suffix of length `k` cannot extend. But maybe a shorter one can. The longest candidate shorter than `k` is `fail[k-1]` (the best prefix-suffix of the prefix-suffix itself). We set `k = fail[k-1]` and try again.
- **If `k` reaches 0 and `P[0] != P[i]`:** Then `fail[i] = 0`.

Why is this O(m)? Each iteration either increments `k` (at most `m` times total) or decrements it via the `fail` chain (bounded by total increments). Both pointers together traverse at most 2m steps.

```java
int[] buildFailure(String pattern) {
    int m = pattern.length();
    int[] fail = new int[m];
    int k = 0;  // length of current matching prefix-suffix
    for (int i = 1; i < m; i++) {
        while (k > 0 && pattern.charAt(k) != pattern.charAt(i)) {
            k = fail[k - 1];  // fall back to next best prefix-suffix
        }
        if (pattern.charAt(k) == pattern.charAt(i)) {
            k++;
        }
        fail[i] = k;
    }
    return fail;
}
```

<AlgoViz
  title="KMP Failure Function — Detailed Construction"
  description="Builds the failure function for pattern 'AABAA'. Shows how each position extends or falls back through the fail chain."
  steps={[
    {
      array: [65, 65, 66, 65, 65],
      labels: {"0": "A", "1": "A", "2": "B", "3": "A", "4": "A"},
      variables: {pattern: "AABAA", fail: "[0, -, -, -, -]", k: 0},
      explanation: "Pattern P = 'AABAA'. fail[0] = 0 always (single char has no proper prefix = suffix). k tracks the current matching prefix-suffix length. Start with k=0.",
      code: "fail[0] = 0; int k = 0;"
    },
    {
      array: [65, 65, 66, 65, 65],
      highlights: [1],
      secondary: [0],
      variables: {i: 1, k: 0, "P[0]": "A", "P[1]": "A", match: "A==A → k=1", fail_1: 1},
      explanation: "i=1: P[k]=P[0]='A' == P[1]='A'. Match! k increments to 1. fail[1]=1. Meaning: 'AA' has prefix 'A' that equals suffix 'A'.",
      code: "fail[1] = 1;  // 'A' is both prefix and suffix of 'AA'"
    },
    {
      array: [65, 65, 66, 65, 65],
      highlights: [2],
      secondary: [1],
      variables: {i: 2, k: 1, "P[1]": "A", "P[2]": "B", mismatch: "A!=B → k=fail[0]=0", "P[0]": "A!=B"},
      explanation: "i=2: P[k]=P[1]='A' != P[2]='B'. Fall back: k=fail[0]=0. Try P[0]='A' != 'B'. Still no match. fail[2]=0.",
      code: "fail[2] = 0;  // 'AAB' has no prefix=suffix"
    },
    {
      array: [65, 65, 66, 65, 65],
      highlights: [3],
      secondary: [0],
      variables: {i: 3, k: 0, "P[0]": "A", "P[3]": "A", match: "A==A → k=1", fail_3: 1},
      explanation: "i=3: k=0, P[0]='A' == P[3]='A'. Match! k=1. fail[3]=1. 'AABA' has prefix 'A' = suffix 'A'.",
      code: "fail[3] = 1;  // prefix 'A' = suffix 'A'"
    },
    {
      array: [65, 65, 66, 65, 65],
      highlights: [4],
      secondary: [0, 1],
      variables: {i: 4, k: 1, "P[1]": "A", "P[4]": "A", match: "A==A → k=2", fail_4: 2},
      explanation: "i=4: k=1, P[1]='A' == P[4]='A'. Extend! k=2. fail[4]=2. 'AABAA' has prefix 'AA' = suffix 'AA' (length 2).",
      code: "fail[4] = 2;  // prefix 'AA' = suffix 'AA'"
    },
    {
      array: [0, 1, 0, 1, 2],
      labels: {"0": "fail[0]", "1": "fail[1]", "2": "fail[2]", "3": "fail[3]", "4": "fail[4]"},
      highlights: [1, 4],
      variables: {fail: "[0, 1, 0, 1, 2]", period: "n-fail[n-1] = 5-2 = 3", repeats: "5%3 != 0 → not periodic"},
      explanation: "Final: fail = [0,1,0,1,2]. String period = n−fail[n−1] = 5−2 = 3. Since 5%3 != 0, 'AABAA' is not a repeating pattern. fail[4]=2 means on mismatch at pos 5, jump to pos 2.",
      code: "return fail;  // [0, 1, 0, 1, 2]"
    }
  ]}
/>

#### KMP Search in O(n + m)

During the search phase, we maintain a pointer `j` into the pattern. For each character `T[i]`:

- If `P[j] == T[i]`, advance both `i` and `j`.
- If `j == m`, we found a match at index `i - m`. Set `j = fail[j-1]` to continue searching for overlapping matches.
- If mismatch and `j > 0`, set `j = fail[j-1]` (no need to move `i` backward).
- If mismatch and `j == 0`, just advance `i`.

```java
import java.util.*;

List<Integer> kmpSearch(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    List<Integer> results = new ArrayList<>();
    if (m == 0) return results;
    int[] fail = buildFailure(pattern);
    int j = 0;  // pointer into pattern
    for (int i = 0; i < n; i++) {
        while (j > 0 && pattern.charAt(j) != text.charAt(i)) {
            j = fail[j - 1];
        }
        if (pattern.charAt(j) == text.charAt(i)) {
            j++;
        }
        if (j == m) {
            results.add(i - m + 1);
            j = fail[j - 1];
        }
    }
    return results;
}
```

**Time:** O(n + m) — same amortization argument as failure function construction.
**Space:** O(m) for the failure array.

<AlgoViz
  title="KMP Pattern Matching — Step by Step"
  description="Searches for pattern P='ABAB' in text T='ABABABC'. Shows how the failure function avoids re-scanning on mismatch."
  steps={[
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      labels: {"0": "A", "1": "B", "2": "A", "3": "B", "4": "A", "5": "B", "6": "C"},
      array2: [65, 66, 65, 66],
      labels2: {"0": "A", "1": "B", "2": "A", "3": "B"},
      variables: {fail: "[0,0,1,2]", j: 0, phase: "Begin matching"},
      explanation: "Text: ABABABC, Pattern: ABAB. Failure function: [0,0,1,2]. Start with j=0 (pattern pointer).",
      code: "int j = 0;  // pattern pointer"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      highlights: [0, 1, 2, 3],
      array2: [65, 66, 65, 66],
      highlights2: [0, 1, 2, 3],
      variables: {i: 3, j: 4, status: "j == m → MATCH at index 0!"},
      explanation: "T[0..3] = 'ABAB' matches P[0..3]. j reaches m=4 → match found at index i-m+1 = 0!",
      code: "results.add(i - m + 1);  // match at 0"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      highlights: [2, 3],
      secondary: [0, 1],
      array2: [65, 66, 65, 66],
      highlights2: [0, 1],
      variables: {j: "fail[3]=2", i: 3, status: "Fallback: j = fail[3] = 2"},
      explanation: "After match, j = fail[3] = 2. We know T[2..3]='AB' already matches P[0..1]. No need to re-check! Continue from j=2.",
      code: "j = fail[j - 1];  // j = fail[3] = 2"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      highlights: [2, 3, 4, 5],
      array2: [65, 66, 65, 66],
      highlights2: [0, 1, 2, 3],
      variables: {i: 5, j: 4, status: "j == m → MATCH at index 2!"},
      explanation: "Continue matching from j=2. T[4]='A'=P[2], T[5]='B'=P[3]. j=4=m → match at index 5-4+1 = 2!",
      code: "results.add(i - m + 1);  // match at 2"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      highlights: [4, 5],
      array2: [65, 66, 65, 66],
      highlights2: [0, 1],
      variables: {j: "fail[3]=2", i: 5, status: "Fallback: j = 2 again"},
      explanation: "After second match, j = fail[3] = 2 again. T[4..5]='AB' matches P[0..1].",
      code: "j = fail[j - 1];  // j = 2"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      secondary: [6],
      array2: [65, 66, 65, 66],
      highlights2: [2],
      variables: {i: 6, j: 2, "T[6]": "C", "P[2]": "A", status: "Mismatch!"},
      explanation: "T[6]='C' ≠ P[2]='A'. Mismatch at j=2. Fall back: j = fail[1] = 0.",
      code: "j = fail[j - 1];  // j = fail[1] = 0"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      secondary: [6],
      array2: [65, 66, 65, 66],
      highlights2: [0],
      variables: {i: 6, j: 0, "T[6]": "C", "P[0]": "A", status: "Still mismatch, j=0, advance i"},
      explanation: "T[6]='C' ≠ P[0]='A'. j=0, advance i. End of text reached. Done!",
      code: "// i++ reaches end, no more matches"
    },
    {
      array: [65, 66, 65, 66, 65, 66, 67],
      highlights: [0, 1, 2, 3],
      secondary: [2, 3, 4, 5],
      variables: {matches: "[0, 2]", total_comparisons: "~10 (linear)", naive_would_be: "7×4=28"},
      explanation: "Found 2 overlapping matches at indices [0, 2]. KMP never moved i backward — O(n+m) = O(11) vs naive O(n·m)=O(28).",
      code: "return results;  // [0, 2]"
    }
  ]}
/>

---

### 2. Z-Function

**Why this technique exists.** The Z-function provides an alternative lens on string matching that many programmers find more intuitive than KMP. While KMP answers "on mismatch, where should I resume?", the Z-function directly answers "how long is the prefix match starting at each position?" This directness makes it the preferred tool in competitive programming for single-pattern search and many prefix-based queries. Concatenating `P + "$" + T` and computing Z-values yields all match positions instantly: any index with `z[i] == len(P)` is a match.

**Interview signals.** Look for: (1) "find pattern in text" (Z-function via concatenation is often simpler to code than KMP), (2) "longest common prefix of two suffixes" (compute Z on a concatenated string), (3) "string compression" or "minimum repeating unit" (Z-values reveal the period structure), (4) "sum of prefix match scores" (sum the Z-values directly), (5) "count occurrences of every prefix" (Z-values indicate exactly which prefixes match at each position).

**Common mistakes.** (1) Using `z[0]` in your logic — it is conventionally set to `n` (or left undefined) and must never be treated as a real match. (2) Off-by-one when converting Z-array indices to text positions: for a concatenated string `P + "$" + T`, a match at index `i` corresponds to position `i - len(P) - 1` in T, not `i - len(P)`. (3) Choosing a sentinel character (`$`) that appears in the input, which causes spurious matches across the boundary.

#### Definition

For a string `S` of length `n`, define `z[i]` (for `i ≥ 1`) as the length of the **longest substring starting at index `i`** that matches a **prefix** of `S`. By convention `z[0]` is undefined (or set to `n` / 0 depending on formulation).

**Example for `S = "aabxaab"`:**

| i | Substring from i | Matches prefix | z[i] |
|---|-------------------|----------------|------|
| 0 | aabxaab           | (whole string) | —    |
| 1 | abxaab            | "a"            | 1    |
| 2 | bxaab             | (none)         | 0    |
| 3 | xaab              | (none)         | 0    |
| 4 | aab               | "aab"          | 3    |
| 5 | ab                | "a"            | 1    |
| 6 | b                 | (none)         | 0    |

#### Z-Box Algorithm (O(n))

Maintain a window `[L, R)` — the **Z-box** — which is the rightmost interval such that `S[L..R-1]` matches a prefix of `S`.

For each `i` from 1 to n-1:

1. **If `i < R`:** We know `S[i..R-1] == S[i-L..R-L-1]`. So `z[i] ≥ min(z[i-L], R-i)`.
   - If `z[i-L] < R - i`: The match doesn't reach the end of the Z-box, so `z[i] = z[i-L]` (no further work needed).
   - If `z[i-L] ≥ R - i`: The match extends to the boundary; start comparing from `R` onward.
2. **If `i ≥ R`:** No info from previous Z-box. Start comparing from index `i`.
3. After extending, if `i + z[i] > R`, update `L = i`, `R = i + z[i]`.

```java
int[] zFunction(String s) {
    int n = s.length();
    int[] z = new int[n];
    z[0] = n;
    int l = 0, r = 0;  // Z-box [l, r)
    for (int i = 1; i < n; i++) {
        if (i < r) {
            z[i] = Math.min(z[i - l], r - i);
        }
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) {
            z[i]++;
        }
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}
```

#### Pattern Matching with Z-Function

**When to use this template.** Reach for the Z-function concatenation trick (`P + "$" + T`) whenever you need single-pattern matching and want the simplest correct implementation. It is also the go-to approach when you need all prefix-match lengths across the text, not just exact full-pattern matches — for example, computing how much of pattern P matches starting at each position in T.

Concatenate: `S = P + "$" + T` (the `$` sentinel must not appear in `P` or `T`). Compute the Z-function of `S`. Any index `i` where `z[i] == len(P)` corresponds to a match at position `i - len(P) - 1` in `T`.

```java
import java.util.*;

List<Integer> zSearch(String text, String pattern) {
    String concat = pattern + "$" + text;
    int m = pattern.length();
    int[] z = zFunction(concat);
    List<Integer> results = new ArrayList<>();
    for (int i = m + 1; i < concat.length(); i++) {
        if (z[i] == m) results.add(i - m - 1);
    }
    return results;
}
```

**Time:** O(n + m). **Space:** O(n + m) for the concatenated string.

<AlgoViz
  title="Z-Function Pattern Matching via Concatenation"
  description="Find pattern 'ab' in text 'ababc' by computing Z-array of 'ab$ababc'. Any z[i] == len(P) is a match."
  steps={[
    {
      array: [97, 98, 36, 97, 98, 97, 98, 99],
      labels: {"0": "a", "1": "b", "2": "$", "3": "a", "4": "b", "5": "a", "6": "b", "7": "c"},
      variables: {concat: "ab$ababc", P: "ab", T: "ababc", m: 2},
      explanation: "Concatenate P + '$' + T = 'ab$ababc'. Compute Z-array. Any position i where z[i] == m=2 is a match. The sentinel '$' prevents matches across the boundary.",
      code: "String concat = pattern + '$' + text;"
    },
    {
      array: [8, 0, 0, 2, 0, 2, 0, 0],
      labels: {"0": "z[0]", "1": "z[1]", "2": "z[2]", "3": "z[3]", "4": "z[4]", "5": "z[5]", "6": "z[6]", "7": "z[7]"},
      highlights: [3, 5],
      variables: {z: "[8,0,0,2,0,2,0,0]", matches_at: "z[3]=2 and z[5]=2"},
      explanation: "Z-array: [8,0,0,2,0,2,0,0]. z[3]=2 and z[5]=2 — both equal m=2. These are match positions!",
      code: "// z[3]=2, z[5]=2 → both == len(P)"
    },
    {
      array: [8, 0, 0, 2, 0, 2, 0, 0],
      highlights: [3],
      variables: {i: 3, "text_pos": "3 - 2 - 1 = 0", match: "T[0..1] = 'ab'"},
      explanation: "z[3]=2: match at text position i - m - 1 = 3 - 2 - 1 = 0. T[0..1] = 'ab' matches pattern.",
      code: "results.add(3 - m - 1);  // position 0"
    },
    {
      array: [8, 0, 0, 2, 0, 2, 0, 0],
      highlights: [5],
      variables: {i: 5, "text_pos": "5 - 2 - 1 = 2", match: "T[2..3] = 'ab'"},
      explanation: "z[5]=2: match at text position 5 - 2 - 1 = 2. T[2..3] = 'ab' matches pattern.",
      code: "results.add(5 - m - 1);  // position 2"
    },
    {
      array: [8, 0, 0, 2, 0, 2, 0, 0],
      secondary: [1, 2, 4, 6, 7],
      variables: {"z[1]": "0 (b!=a)", "z[2]": "0 ($!=a)", "z[4]": "0 (b!=a)", "z[7]": "0 (c!=a)"},
      explanation: "Non-matching positions: z[1]=0 ('b'!='a'), z[2]=0 ('$'!='a'), z[4]=0, z[6]=0, z[7]=0. None equal m=2, so no matches at those positions.",
      code: "// z[i] < m → no match at position i-m-1"
    },
    {
      array: [97, 98, 97, 98, 99],
      labels: {"0": "a", "1": "b", "2": "a", "3": "b", "4": "c"},
      highlights: [0, 1, 2, 3],
      variables: {matches: "[0, 2]", total: "2 matches found", complexity: "O(n+m)"},
      explanation: "Found pattern 'ab' at positions [0, 2] in text 'ababc'. Z-function concatenation trick is often simpler to implement than KMP — one function, one scan, direct results.",
      code: "return results;  // [0, 2]"
    }
  ]}
/>

<AlgoViz
  title="Z-Algorithm — Computing Z-Array"
  description="Computes Z-array for S = 'aabxaab'. Z[i] = length of longest substring starting at i that matches a prefix of S."
  steps={[
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      labels: {"0": "a", "1": "a", "2": "b", "3": "x", "4": "a", "5": "a", "6": "b"},
      variables: {S: "aabxaab", z: "[7, -, -, -, -, -, -]", L: 0, R: 0},
      explanation: "String S = 'aabxaab'. z[0] = 7 (whole string, by convention). Initialize Z-box [L,R) = [0,0).",
      code: "z[0] = n;  // 7"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      highlights: [1],
      secondary: [0],
      variables: {i: 1, "S[1]": "a", "S[0]": "a", match: "a=a", z_1: 1, L: 1, R: 2},
      explanation: "i=1: i≥R, compare from scratch. S[0]='a'=S[1]='a' (match), S[1]='a'≠S[2]='b' (stop). z[1]=1. Update L=1, R=2.",
      code: "z[1] = 1;  // 'a' matches prefix 'a'"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      secondary: [2],
      variables: {i: 2, "S[2]": "b", "S[0]": "a", match: "b≠a", z_2: 0},
      explanation: "i=2: i≥R (2≥2), compare S[0]='a' vs S[2]='b'. No match. z[2]=0.",
      code: "z[2] = 0;  // 'b' doesn't match 'a'"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      secondary: [3],
      variables: {i: 3, "S[3]": "x", "S[0]": "a", match: "x≠a", z_3: 0},
      explanation: "i=3: i≥R, compare S[0]='a' vs S[3]='x'. No match. z[3]=0.",
      code: "z[3] = 0;  // 'x' doesn't match 'a'"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      highlights: [4, 5, 6],
      secondary: [0, 1, 2],
      variables: {i: 4, compare: "S[4..6]='aab' vs S[0..2]='aab'", z_4: 3, L: 4, R: 7},
      explanation: "i=4: i≥R, compare from scratch. S[4]='a'=S[0], S[5]='a'=S[1], S[6]='b'=S[2]. 3 matches. z[4]=3. L=4, R=7.",
      code: "z[4] = 3;  // 'aab' matches prefix 'aab'"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      highlights: [5],
      variables: {i: 5, "i<R": "5<7, use Z-box!", "i-L": 1, "z[1]": 1, "R-i": 2, "z[5]": "min(z[1], R-i) = min(1,2) = 1"},
      explanation: "i=5: i<R=7! Mirror: z[i-L]=z[1]=1. Since 1 < R-i=2, the match fits inside Z-box. z[5]=1. No expansion needed!",
      code: "z[5] = min(z[i-L], R-i) = min(1, 2) = 1"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      secondary: [6],
      variables: {i: 6, "i<R": "6<7", "i-L": 2, "z[2]": 0, "z[6]": "min(z[2], R-i) = min(0,1) = 0"},
      explanation: "i=6: i<R=7. Mirror: z[i-L]=z[2]=0. z[6]=0. No expansion needed.",
      code: "z[6] = min(z[i-L], R-i) = min(0, 1) = 0"
    },
    {
      array: [97, 97, 98, 120, 97, 97, 98],
      highlights: [4, 5, 6],
      variables: {z: "[7, 1, 0, 0, 3, 1, 0]", key_insight: "Z-box reuse saved comparisons at i=5,6"},
      explanation: "Final Z-array: [7, 1, 0, 0, 3, 1, 0]. The Z-box optimization at i=5,6 reused info from i=4's computation — no redundant comparisons!",
      code: "return z;  // [7, 1, 0, 0, 3, 1, 0]"
    }
  ]}
/>

---

### 3. Rolling Hash / Rabin-Karp

**Why this technique exists.** KMP and Z-function are deterministic and optimal for single-pattern search, but they are harder to extend to problems like "find the longest duplicate substring" or "match any of k patterns." Rolling hash offers a different trade-off: it represents each substring as a number (its hash), making substring *comparison* O(1) instead of O(m). This enables combining hashing with binary search, set intersection, and multi-pattern matching -- problems where character-by-character algorithms are awkward.

**The intuition.** Think of a string as a number in a large base (like base 31). Just as you can compute 1234 from 12345 and 2345 using arithmetic (subtract the leading digit, shift, add the trailing digit), you can "slide" the hash window across the text in O(1) per position. Two substrings with the same hash are *probably* equal; verification confirms it. Double hashing (two independent hash functions) makes false positives astronomically unlikely.

**Common mistakes.** (1) Using base 26 with 0-indexed characters (`'a' = 0`), which causes the hash of any string starting with 'a' to lose information. Map 'a' to 1 instead. (2) Forgetting that `(a - b) % MOD` can be negative in Java -- always add MOD before taking the modulus. (3) Using a single hash function in problems with adversarial test cases (competitive programming judges often add anti-hash tests).

**Interview signals.** Look for: (1) "longest duplicate substring" (binary search on length + rolling hash), (2) "count distinct substrings" (hash all substrings into a set), (3) "repeated DNA sequences" or fixed-length repeated substrings, (4) "check if one string is a rotation of another" (hash-based comparison), (5) "compare many substrings for equality" (precompute prefix hashes for O(1) substring hash queries).

#### Polynomial Hashing

Treat a string as a number in base `p`:

```
hash(s[0..k-1]) = s[0]·p^(k-1) + s[1]·p^(k-2) + ... + s[k-1]·p^0   (mod M)
```

Where `p` is a prime base (commonly 31 or 37 for lowercase letters) and `M` is a large prime modulus (e.g., `10^9 + 7`).

#### Rolling Window

Given `hash(s[i..i+m-1])`, compute `hash(s[i+1..i+m])` in O(1):

```
hash(s[i+1..i+m]) = (hash(s[i..i+m-1]) - s[i]·p^(m-1)) · p + s[i+m]   (mod M)
```

This allows sliding the window across the text in O(n) total time.

#### Double Hashing

A single hash has collision probability ≈ 1/M per comparison. For `n` comparisons, the expected number of false positives is n/M — usually negligible for `M ~ 10^9`, but problematic with adversarial inputs.

**Double hashing** uses two independent `(p, M)` pairs. A false positive requires both hashes to collide simultaneously, giving probability ≈ 1/(M₁ · M₂) — essentially zero.

```java
import java.util.*;

List<Integer> rabinKarp(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    List<Integer> results = new ArrayList<>();
    if (m > n) return results;

    long MOD1 = 1_000_000_007, BASE1 = 31;
    long MOD2 = 1_000_000_009, BASE2 = 37;

    long pow1 = modPow(BASE1, m, MOD1);
    long pow2 = modPow(BASE2, m, MOD2);

    // Hash the pattern
    long ph1 = 0, ph2 = 0;
    for (int i = 0; i < m; i++) {
        int cv = pattern.charAt(i) - 'a' + 1;
        ph1 = (ph1 * BASE1 + cv) % MOD1;
        ph2 = (ph2 * BASE2 + cv) % MOD2;
    }

    // Hash the first window of text
    long th1 = 0, th2 = 0;
    for (int i = 0; i < m; i++) {
        int cv = text.charAt(i) - 'a' + 1;
        th1 = (th1 * BASE1 + cv) % MOD1;
        th2 = (th2 * BASE2 + cv) % MOD2;
    }

    for (int i = 0; i <= n - m; i++) {
        if (th1 == ph1 && th2 == ph2) {
            if (text.substring(i, i + m).equals(pattern)) {
                results.add(i);
            }
        }
        if (i + m < n) {
            int out = text.charAt(i) - 'a' + 1;
            int in_ = text.charAt(i + m) - 'a' + 1;
            th1 = ((th1 * BASE1 - (long) out * pow1 + in_) % MOD1 + MOD1) % MOD1;
            th2 = ((th2 * BASE2 - (long) out * pow2 + in_) % MOD2 + MOD2) % MOD2;
        }
    }
    return results;
}

long modPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
```

**Time:** O(n + m) expected (O(n·m) worst-case with verification, but collisions are extremely rare with double hashing).
**Space:** O(1) extra beyond input (no failure array needed).

<AlgoViz
  title="Rabin-Karp Rolling Hash"
  description="Searches for pattern 'abc' in text 'xabcab' using rolling hash with base=31."
  steps={[
    {
      array: [120, 97, 98, 99, 97, 98],
      labels: {"0": "x", "1": "a", "2": "b", "3": "c", "4": "a", "5": "b"},
      array2: [97, 98, 99],
      labels2: {"0": "a", "1": "b", "2": "c"},
      variables: {base: 31, m: 3, pattern_hash: "1·31² + 2·31 + 3 = 1024"},
      explanation: "Text: 'xabcab', Pattern: 'abc'. Map a→1, b→2, c→3, x→24. Pattern hash: 1·961 + 2·31 + 3 = 1024.",
      code: "// patternHash = 1*31^2 + 2*31 + 3 = 1024"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [0, 1, 2],
      labels: {"0": "x", "1": "a", "2": "b", "3": "c", "4": "a", "5": "b"},
      variables: {window: "xab", window_hash: "24·961 + 1·31 + 2 = 23097", pattern_hash: 1024, match: "No"},
      explanation: "Window [0..2] = 'xab'. Hash = 24·961 + 1·31 + 2 = 23097 ≠ 1024. No match.",
      code: "// window 'xab': hash=23097 ≠ 1024"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [1, 2, 3],
      variables: {window: "abc", rolling: "Remove 'x', add 'c'", window_hash: "(23097 - 24·961)·31 + 3 = 1024", pattern_hash: 1024, match: "Hash match!"},
      explanation: "Slide right: remove 'x' (24·31²), multiply by 31, add 'c' (3). New hash = 1024 = pattern hash! Verify characters.",
      code: "th = ((th - 24*pow)*31 + 3) % MOD  // 1024"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [1, 2, 3],
      array2: [97, 98, 99],
      highlights2: [0, 1, 2],
      variables: {verification: "T[1..3]='abc' == P='abc'", result: "MATCH at index 1"},
      explanation: "Verify: T[1..3] = 'abc' matches pattern. Confirmed match at index 1! Rolling hash gave O(1) comparison.",
      code: "results.add(1);  // verified match"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [2, 3, 4],
      variables: {window: "bca", rolling: "Remove 'a'(1), add 'a'(1)", window_hash: "(1024 - 1·961)·31 + 1 = 1954", match: "No"},
      explanation: "Slide right: remove 'a', add 'a'. New hash = (1024 - 961)·31 + 1 = 63·31 + 1 = 1954 ≠ 1024. No match.",
      code: "// window 'bca': hash=1954 ≠ 1024"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [3, 4, 5],
      variables: {window: "cab", rolling: "Remove 'b'(2), add 'b'(2)", window_hash: "(1954 - 2·961)·31 + 2 = 994", match: "No"},
      explanation: "Slide right: remove 'b', add 'b'. Hash = (1954 - 1922)·31 + 2 = 32·31 + 2 = 994 ≠ 1024. No match.",
      code: "// window 'cab': hash=994 ≠ 1024"
    },
    {
      array: [120, 97, 98, 99, 97, 98],
      highlights: [1, 2, 3],
      variables: {matches: "[1]", total_hash_ops: 4, total_char_comparisons: 3, complexity: "O(n+m) expected"},
      explanation: "Done! Found match at [1]. Only 4 hash updates (O(1) each) + 3 char comparisons for verification. Total: O(n+m) expected.",
      code: "return results;  // [1]"
    }
  ]}
/>

<AlgoViz
  title="Rabin-Karp — Detecting Longest Duplicate Substring"
  description="Uses binary search + rolling hash to find the longest substring appearing twice in 'banana'. Binary search on length, hash check at each level."
  steps={[
    {
      array: [98, 97, 110, 97, 110, 97],
      labels: {"0": "b", "1": "a", "2": "n", "3": "a", "4": "n", "5": "a"},
      variables: {S: "banana", n: 6, lo: 1, hi: 5, strategy: "Binary search on duplicate length"},
      explanation: "Find the longest substring that appears at least twice in 'banana'. Answer length is monotonic (if length-k duplicate exists, length-(k-1) does too). Binary search on length.",
      code: "int lo = 1, hi = n - 1;  // binary search on length"
    },
    {
      array: [98, 97, 110, 97, 110, 97],
      highlights: [0, 1, 2],
      variables: {mid: 3, checking: "Length 3 duplicates", windows: "ban, ana, nan, ana"},
      explanation: "Binary search: mid = (1+5)/2 = 3. Check if any length-3 substring appears twice. Compute rolling hash for each window: 'ban','ana','nan','ana'.",
      code: "int mid = (lo + hi) / 2;  // 3"
    },
    {
      hashMap: [["ban", "hash_1"], ["ana", "hash_2 (first seen at pos 1)"], ["nan", "hash_3"], ["ana", "hash_2 (DUPLICATE at pos 3!)"]],
      variables: {length: 3, found: true, duplicate: "ana", positions: "1 and 3", result: "ana"},
      explanation: "Rolling hash finds 'ana' at positions 1 and 3 — duplicate! Binary search moves right: lo = mid + 1 = 4. Check if length 4 has duplicates.",
      code: "// 'ana' found twice → lo = 4"
    },
    {
      array: [98, 97, 110, 97, 110, 97],
      highlights: [0, 1, 2, 3],
      variables: {mid: 4, checking: "Length 4 duplicates", windows: "bana, anan, nana"},
      explanation: "New mid = (4+5)/2 = 4. Check length-4 substrings: 'bana','anan','nana'. All have distinct hashes. No length-4 duplicate exists.",
      code: "// mid=4: no duplicates found"
    },
    {
      array: [98, 97, 110, 97, 110, 97],
      variables: {mid: 4, found: false, action: "hi = mid - 1 = 3", lo: 4, hi: 3, terminated: "lo > hi"},
      explanation: "No length-4 duplicate → hi = 3. Now lo=4 > hi=3, binary search terminates. Best found: length 3, substring 'ana'.",
      code: "// hi = 3, lo = 4 → search done"
    },
    {
      array: [98, 97, 110, 97, 110, 97],
      highlights: [1, 2, 3],
      secondary: [3, 4, 5],
      variables: {answer: "ana", length: 3, positions: "[1, 3]", complexity: "O(n log n)", levels: "log(5) ≈ 3 binary search levels"},
      explanation: "Answer: 'ana' (length 3). Found via O(log n) binary search levels, each doing O(n) rolling hash. Total: O(n log n). Suffix array + LCP gives same answer deterministically.",
      code: "return 'ana';  // longest duplicate substring"
    }
  ]}
/>

---

### Algorithm Comparison

| Property              | KMP             | Z-Function       | Rabin-Karp         |
|-----------------------|-----------------|-------------------|--------------------|
| **Time**              | O(n + m)        | O(n + m)          | O(n + m) expected  |
| **Space**             | O(m)            | O(n + m)          | O(1) extra         |
| **Worst case**        | O(n + m) always | O(n + m) always   | O(n·m) with collisions |
| **Multi-pattern**     | No (use Aho-Corasick) | No          | Yes (check multiple hashes) |
| **Streaming**         | Yes (char by char) | No (needs full string) | Yes              |
| **Best for**          | Single pattern, streaming | Prefix queries, period analysis | Substring equality checks, multi-pattern |
| **Implementation**    | Moderate        | Simple            | Simple (but tricky edge cases) |
| **Extensibility**     | Aho-Corasick    | Many string problems | Binary search + hashing |

---

## Worked Example

### KMP on Pattern "ABABAC" in Text "ABABABABAC"

**Step 1: Build the failure function for P = "ABABAC"**

```
i=0: fail[0] = 0 (base case)

i=1: P[1]='B', k=0, P[0]='A' ≠ 'B' → fail[1] = 0

i=2: P[2]='A', k=0, P[0]='A' == 'A' → k=1, fail[2] = 1

i=3: P[3]='B', k=1, P[1]='B' == 'B' → k=2, fail[3] = 2

i=4: P[4]='A', k=2, P[2]='A' == 'A' → k=3, fail[4] = 3

i=5: P[5]='C', k=3, P[3]='B' ≠ 'C'
     → k = fail[2] = 1, P[1]='B' ≠ 'C'
     → k = fail[0] = 0, P[0]='A' ≠ 'C'
     → fail[5] = 0
```

**Result:** `fail = [0, 0, 1, 2, 3, 0]`

**Step 2: Search in T = "ABABABABAC"**

```
T: A B A B A B A B A C
   0 1 2 3 4 5 6 7 8 9

j=0: T[0]='A' == P[0]='A' → j=1
j=1: T[1]='B' == P[1]='B' → j=2
j=2: T[2]='A' == P[2]='A' → j=3
j=3: T[3]='B' == P[3]='B' → j=4
j=4: T[4]='A' == P[4]='A' → j=5
j=5: T[5]='B' ≠ P[5]='C' → mismatch!
     j = fail[4] = 3
     (We know T[3..5] = "BAB" matches P[0..2]? No — but KMP says
      T[2..4] = "ABA" matches P[0..2] since fail[4]=3)
     Now j=3: T[5]='B' == P[3]='B' → j=4
j=4: T[6]='A' == P[4]='A' → j=5
j=5: T[7]='B' ≠ P[5]='C' → mismatch!
     j = fail[4] = 3
     Now j=3: T[7]='B' == P[3]='B' → j=4
j=4: T[8]='A' == P[4]='A' → j=5
j=5: T[9]='C' == P[5]='C' → j=6
     j == m=6 → MATCH at index 9-6+1 = 4!

     j = fail[5] = 0, continue...
```

**Match found at index 4:** `T[4..9] = "ABABAC"` ✓

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "find pattern in text" or "first occurrence" | KMP / Z-algorithm | Linear-time single-pattern matching avoids O(n*m) brute force |
| "repeated substring pattern" or "string period" | KMP failure function | If `n % (n - fail[n-1]) == 0`, the pattern repeats with period `n - fail[n-1]` |
| "shortest palindrome by prepending" | KMP on `s + "#" + reverse(s)` | Failure function reveals the longest palindromic prefix in O(n) |
| "longest prefix which is also suffix" | KMP failure function chain | `fail[n-1]` gives the longest; follow the chain `fail[fail[n-1]-1]` for all lengths |
| "longest duplicate substring" | Binary search + Rabin-Karp | Monotonic answer length enables binary search; rolling hash checks each length in O(n) |
| "match multiple patterns simultaneously" | Rabin-Karp or Aho-Corasick | Hash each pattern independently; Aho-Corasick is optimal for many patterns |
| "rolling window substring equality" | Rabin-Karp rolling hash | O(1) hash update per slide enables linear-time window scanning |
| "check if string is a rotation" | KMP on `T + T` | Rotation of P exists as a substring of `P + P`; KMP finds it in O(n) |
| "fixed-length repeated substrings" (e.g., DNA) | Rolling hash with HashSet | Hash each window of fixed length; duplicates share the same hash value |
| "sum of prefix match scores" | Z-function | `z[i]` directly measures prefix match length at position i; sum them |
| "string compression" or "minimum repeating unit" | KMP failure function | Smallest repeating unit has length `n - fail[n-1]`; verify it divides n evenly |

---

## Pattern Recognition

| Cue in Problem Statement | Technique |
|--------------------------|-----------|
| "Find pattern in text" / "first occurrence" | KMP or Z-function |
| "Repeated substring pattern" / "string period" | KMP failure function (`n % (n - fail[n-1]) == 0`) |
| "Shortest palindrome by prepending" | KMP on `P + "#" + reverse(P)` |
| "Longest prefix which is also suffix" | KMP failure function directly |
| "Longest/count duplicate substring" | Rabin-Karp + binary search |
| "Match multiple patterns" | Rabin-Karp (simple) or Aho-Corasick (optimal) |
| "Rolling window substring comparison" | Rabin-Karp rolling hash |
| "Check if rotation" | KMP on `T + T` searching for `P` |

---

## Practice Problems

### Day 1–2: Foundations (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Implement strStr() | Easy | KMP / Z-function | [LC 28](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) |
| 2 | Repeated Substring Pattern | Easy | KMP failure function — check if `n % (n - fail[n-1]) == 0` | [LC 459](https://leetcode.com/problems/repeated-substring-pattern/) |
| 3 | Shortest Palindrome | Hard | KMP on `s + "#" + reverse(s)` — failure function gives longest palindromic prefix | [LC 214](https://leetcode.com/problems/shortest-palindrome/) |
| 4 | Repeated String Match | Medium | Rabin-Karp on `a * ceil(len(b)/len(a)) + a` | [LC 686](https://leetcode.com/problems/repeated-string-match/) |
| 5 | Longest Happy Prefix | Hard | KMP failure function — `fail[n-1]` gives the answer directly | [LC 1392](https://leetcode.com/problems/longest-happy-prefix/) |
| 6 | Find the Index of the First Occurrence | Easy | KMP or Z-function (same as #1, practice the other algorithm) | [LC 28](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) |

### Day 3–4: Hashing & Intermediate (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Repeated DNA Sequences | Medium | Rolling hash with base-4 encoding (A,C,G,T) | [LC 187](https://leetcode.com/problems/repeated-dna-sequences/) |
| 8 | Longest Duplicate Substring | Hard | Binary search on length + Rabin-Karp to check existence | [LC 1044](https://leetcode.com/problems/longest-duplicate-substring/) |
| 9 | Distinct Echo Substrings | Hard | Rolling hash — for each even-length substring, check if first half == second half | [LC 1316](https://leetcode.com/problems/distinct-echo-substrings/) |
| 10 | Sum of Scores of Built Strings | Hard | Z-function — answer is `sum(z[i])` for the reversed construction | [LC 2223](https://leetcode.com/problems/sum-of-scores-of-built-strings/) |
| 11 | Minimum Window Substring | Hard | Sliding window (not string matching, but related substring technique) | [LC 76](https://leetcode.com/problems/minimum-window-substring/) |
| 12 | Count Unique Characters of All Substrings | Hard | Contribution technique — for each char, count substrings where it's unique | [LC 828](https://leetcode.com/problems/count-unique-characters-of-all-substrings-of-a-given-string/) |
| 13 | Maximum Repeating Substring | Easy | KMP search on `word * k` for increasing k, or Z-function | [LC 1668](https://leetcode.com/problems/maximum-repeating-substring/) |
| 14 | String Matching in an Array | Easy | KMP/Rabin-Karp — check each string against all others | [LC 1408](https://leetcode.com/problems/string-matching-in-an-array/) |

### Day 5–7: Advanced & Competition (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Longest Common Subpath | Hard | Binary search on length + multi-sequence rolling hash with intersection | [LC 1923](https://leetcode.com/problems/longest-common-subpath/) |
| 16 | Number of Distinct Substrings in a String | Hard | Rolling hash — hash all substrings, count unique; or suffix array | [LC Premium / Practice](https://leetcode.com/problems/number-of-distinct-substrings-in-a-string/) |
| 17 | Count of Substrings Containing Every Vowel and K Consonants | Hard | Sliding window + hashing for constraint tracking | [LC 3306](https://leetcode.com/problems/count-of-substrings-containing-every-vowel-and-k-consonants-ii/) |
| 18 | Minimum Number of Valid Strings to Form Target | Hard | KMP/Z-function to precompute match lengths + DP | [LC 3291](https://leetcode.com/problems/minimum-number-of-valid-strings-to-form-target-i/) |
| 19 | Remove All Occurrences of a Substring | Medium | Stack-based simulation with KMP-like matching | [LC 1910](https://leetcode.com/problems/remove-all-occurrences-of-a-substring/) |
| 20 | Find Beautiful Indices in the Given Array | Hard | KMP to find all occurrences of both patterns, then two-pointer merge | [LC 3008](https://leetcode.com/problems/find-beautiful-indices-in-the-given-array-ii/) |
| 21 | Shortest Palindrome (revisit) | Hard | Solve with all 3 algorithms: KMP, Z-function, and rolling hash — compare approaches | [LC 214](https://leetcode.com/problems/shortest-palindrome/) |

---

## Mock Interview

### Problem 1: Shortest Palindrome (LC 214)

**Interviewer:** *"Given a string s, find the shortest palindrome you can make by adding characters only in front of s."*

**Candidate Approach — KMP:**

"The key insight is that I need the **longest palindromic prefix** of `s`. Whatever remains after that prefix must be reversed and prepended.

I construct the string `s + '#' + reverse(s)` and compute the KMP failure function. The last value of the failure array tells me the length of the longest prefix of `s` that matches a suffix of `reverse(s)` — which is exactly the longest palindromic prefix."

```java
String shortestPalindrome(String s) {
    if (s.isEmpty()) return s;
    String rev = new StringBuilder(s).reverse().toString();
    String combined = s + "#" + rev;
    int[] fail = buildFailure(combined);
    int palindromeLen = fail[combined.length() - 1];
    String prefix = rev.substring(0, s.length() - palindromeLen);
    return prefix + s;
}
```

**Follow-up 1:** *"What's the time and space complexity?"*

"O(n) time and O(n) space for the combined string and failure array, where n = len(s)."

**Follow-up 2:** *"Can you solve this with rolling hash instead?"*

"Yes. Compute the forward hash and reverse hash of `s[0..i]` simultaneously. The largest `i` where they match is the longest palindromic prefix. Use double hashing to avoid collisions. This also runs in O(n) but uses O(1) extra space beyond the hash values."

**Follow-up 3:** *"What if you needed to add characters to both ends?"*

"Then we need the **longest palindromic substring** that includes either the first or last character — this becomes a Manacher's algorithm problem (Week 15)."

---

### Problem 2: Longest Duplicate Substring (LC 1044)

**Interviewer:** *"Given a string s, find the longest substring that appears at least twice."*

**Candidate Approach — Binary Search + Rolling Hash:**

"The answer length is monotonic: if a duplicate of length `k` exists, one of length `k-1` also exists. So I binary search on the answer length.

For a fixed length `L`, I use Rabin-Karp rolling hash to hash every substring of length `L` and check if any hash appears twice. If it does, I verify the actual strings to handle collisions."

```java
import java.util.*;

String longestDupSubstring(String s) {
    int n = s.length();
    long MOD = (1L << 61) - 1, BASE = 131;

    int lo = 1, hi = n - 1;
    String result = "";
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        int idx = check(s, n, mid, BASE, MOD);
        if (idx != -1) {
            result = s.substring(idx, idx + mid);
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result;
}

int check(String s, int n, int length, long BASE, long MOD) {
    long h = 0;
    long power = modPow(BASE, length, MOD);
    Map<Long, List<Integer>> seen = new HashMap<>();
    for (int i = 0; i < n; i++) {
        h = (mul(h, BASE, MOD) + s.charAt(i)) % MOD;
        if (i >= length) {
            h = (h - mul(s.charAt(i - length), power, MOD) % MOD + MOD) % MOD;
        }
        if (i >= length - 1) {
            if (seen.containsKey(h)) {
                int start = i - length + 1;
                for (int j : seen.get(h)) {
                    if (s.substring(j, j + length).equals(s.substring(start, start + length))) {
                        return start;
                    }
                }
                seen.get(h).add(start);
            } else {
                List<Integer> list = new ArrayList<>();
                list.add(i - length + 1);
                seen.put(h, list);
            }
        }
    }
    return -1;
}

long mul(long a, long b, long mod) {
    return Math.floorMod(a * b, mod);
}
```

**Follow-up 1:** *"What's the complexity?"*

"O(n log n) time — binary search is O(log n) levels, each level does O(n) hashing. Space is O(n) for the hash set."

**Follow-up 2:** *"How do you handle hash collisions?"*

"I store start indices in the hash map and verify actual string equality on collision. With a Mersenne prime modulus like 2^61 - 1, collisions are extremely rare in practice."

**Follow-up 3:** *"Can you solve this with a suffix array?"*

"Yes — build the suffix array and LCP array in O(n log n) or O(n). The maximum value in the LCP array is the length of the longest duplicate substring. The suffix array approach is deterministic (no collision risk) but more complex to implement."

---

## Tips & Pitfalls

### Hash Collision Handling
- **Always double-hash** in contest/interview settings unless the problem guarantees no adversarial input. Use two coprime moduli (e.g., `10^9 + 7` and `10^9 + 9`).
- **Mersenne primes** like `2^61 - 1` are excellent single moduli — they're large and allow fast modular arithmetic.
- When in doubt, **verify on hash match** — compare actual characters. This adds worst-case O(m) per match but keeps expected time linear.

### Choosing Hash Bases and Moduli
- Base should be ≥ alphabet size. For lowercase English, `p = 31` is standard. For arbitrary ASCII, use `p = 131` or `p = 137`.
- Avoid `p = 26` with 0-indexed characters (`'a' = 0`) — collisions spike because `hash("a") = 0` for any length.
- **Map characters to 1-indexed values** (`'a' = 1, 'b' = 2, ...`) to avoid zero-character issues.

### KMP Failure Function Edge Cases
- **Single character pattern:** `fail = [0]`, trivially correct.
- **All same characters** (`"aaaa"`): `fail = [0, 1, 2, 3]` — each position extends the previous match.
- **Detecting string period:** If `m % (m - fail[m-1]) == 0`, the string has period `m - fail[m-1]`. The smallest repeating unit is `P[0..m-fail[m-1]-1]`.

### Z-Function vs KMP Equivalence
- Both compute the same underlying information — the Z-function and failure function are interconvertible:
  - From `fail` to `z`: For each `i`, `fail[i] = k` means position `i-k+1` starts a match of length `k`, so update `z[i-k+1] = max(z[i-k+1], k)`.
  - From `z` to `fail`: For each `i` with `z[i] > 0`, positions `i` through `i+z[i]-1` have failure values that can be derived.
- **In practice:** Z-function is often easier to implement and reason about for one-off problems. KMP is better for streaming (processing characters one at a time) and extends naturally to Aho-Corasick for multi-pattern matching.

### Common Mistake: Off-by-One in Rolling Hash
- When sliding the window from position `i` to `i+1`, you **remove** `s[i]` and **add** `s[i+m]`. Make sure you multiply the removed character by `p^(m-1)` (not `p^m`).
- Negative modular arithmetic: `(h - x) % MOD` can be negative in Java, so always add MOD back: `((h - x) % MOD + MOD) % MOD`.
