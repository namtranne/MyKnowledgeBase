---
sidebar_position: 19
title: "Week 18: String Algorithms"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 18: String Algorithms

Strings are deceptively complex. Beyond basic manipulation, efficient string algorithms underpin search engines, bioinformatics, compilers, and autocomplete systems. This week you will master pattern-matching algorithms (KMP, Rabin-Karp), the Trie data structure, palindrome detection strategies, and dynamic-programming patterns that operate on strings.

---

## 1. KMP Pattern Matching

**Why KMP exists.** The naive string search is fine for typical cases but degrades to O(n * m) on adversarial inputs — think of searching for "AAAAAB" in "AAAAAAAAAA...". Every time the search fails at the final character, it backtracks to the second character of the text and starts over, repeating almost all the work. KMP solves this by *never* backtracking in the text. When a mismatch occurs, KMP uses a precomputed "failure function" to know exactly where in the pattern to resume comparison, skipping characters that are guaranteed to match.

**Intuition.** Imagine you are reading a book, searching for a specific phrase. Each time you find a partial match that fails, you do not start from scratch — you remember that the beginning of the phrase might overlap with what you just read. For example, if you are looking for "ABCABD" and you matched "ABCAB" before failing, you know the last "AB" could be the start of a new match. The `lps` (longest prefix-suffix) array encodes exactly this knowledge for every position in the pattern.

**Interview signals.** "Find the first occurrence of a pattern in a string." "Check if a string is a repeated substring pattern" (use the `lps` array property: if `n % (n - lps[n-1]) == 0`, the string repeats). "Find the shortest palindrome by prepending characters" (build `s + sep + reverse(s)` and use `lps`). Any problem involving linear-time pattern matching.

**Common mistakes.** Forgetting the "do NOT increment i" case when falling back in the `lps` construction — this is the subtlest part of KMP. Using `==` on Java Strings instead of `.charAt()` comparisons. Not handling the empty-pattern edge case.

### The Problem

Naively searching for a pattern `P` of length `m` inside a text `T` of length `n` costs **O(n·m)** in the worst case because, after a mismatch, you restart the comparison from the next character of `T`. The Knuth-Morris-Pratt (KMP) algorithm eliminates redundant comparisons by exploiting information already gathered during previous character matches.

### Failure Function (Partial-Match Table)

The key insight is a preprocessed array `lps` (longest proper prefix which is also a suffix) for the pattern. `lps[i]` stores the length of the longest proper prefix of `P[0..i]` that is also a suffix of `P[0..i]`.

**Building intuition:** when a mismatch happens at position `j` of the pattern, you already know that `P[0..j-1]` matched the text. If a prefix of that matched portion is also a suffix, you can "slide" the pattern forward to align that prefix with the suffix — skipping characters you know will match.

```java
public static int[] buildLps(String pattern) {
    int m = pattern.length();
    int[] lps = new int[m];
    int length = 0;
    int i = 1;
    while (i < m) {
        if (pattern.charAt(i) == pattern.charAt(length)) {
            lps[i++] = ++length;
        } else if (length != 0) {
            length = lps[length - 1]; // fall back, do NOT increment i
        } else {
            lps[i++] = 0;
        }
    }
    return lps;
}
```

### KMP Search

```java
public static List<Integer> kmpSearch(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    List<Integer> result = new ArrayList<>();
    if (m == 0) return result;
    int[] lps = buildLps(pattern);
    int i = 0, j = 0;
    while (i < n) {
        if (text.charAt(i) == pattern.charAt(j)) { i++; j++; }
        if (j == m) {
            result.add(i - j);
            j = lps[j - 1];
        } else if (i < n && text.charAt(i) != pattern.charAt(j)) {
            if (j != 0) j = lps[j - 1];
            else i++;
        }
    }
    return result;
}
```

**Time:** O(n + m) for both preprocessing and search combined.
**Space:** O(m) for the `lps` array.

<AlgoViz
  title="KMP Failure Function (LPS Array)"
  description="Build the LPS (longest proper prefix = suffix) array for pattern 'ABABC'. The LPS value at each position tells how far to skip on a mismatch."
  steps={[
    { array: ["A","B","A","B","C"], highlights: [0], secondary: [], variables: { lps: "[0, -, -, -, -]", length: 0, i: 1 }, explanation: "lps[0] is always 0 (no proper prefix for a single char). Start comparing from i=1.", code: "lps[0] = 0; int length = 0, i = 1;" },
    { array: ["A","B","A","B","C"], highlights: [1], secondary: [0], variables: { lps: "[0, 0, -, -, -]", length: 0, i: 2, compare: "B != A" }, explanation: "i=1: pattern[1]='B' != pattern[0]='A'. No prefix match. lps[1] = 0.", code: "lps[1] = 0; // 'B' != 'A'" },
    { array: ["A","B","A","B","C"], highlights: [2], secondary: [0], variables: { lps: "[0, 0, 1, -, -]", length: 1, i: 3, compare: "A == A" }, explanation: "i=2: pattern[2]='A' == pattern[0]='A'. Match! lps[2] = ++length = 1. Prefix 'A' = suffix 'A'.", code: "lps[2] = ++length; // 1" },
    { array: ["A","B","A","B","C"], highlights: [3], secondary: [1], variables: { lps: "[0, 0, 1, 2, -]", length: 2, i: 4, compare: "B == B" }, explanation: "i=3: pattern[3]='B' == pattern[1]='B'. Match! lps[3] = ++length = 2. Prefix 'AB' = suffix 'AB'.", code: "lps[3] = ++length; // 2" },
    { array: ["A","B","A","B","C"], highlights: [4], secondary: [2], variables: { lps: "[0, 0, 1, 2, 0]", length: 0, i: "done", compare: "C != A, fallback to 0" }, explanation: "i=4: pattern[4]='C' != pattern[2]='A'. Fall back: length=lps[1]=0. Still no match. lps[4] = 0. Final LPS: [0,0,1,2,0].", code: "length = lps[length-1]; // fallback, then lps[4] = 0" },
  ]}
/>

<AlgoViz
  title="KMP Pattern Search"
  description="Search for pattern 'ABABC' in text 'ABABABABC'. Using lps=[0,0,1,2,0], KMP avoids re-scanning matched characters on mismatch."
  steps={[
    { array: ["A","B","A","B","A","B","A","B","C"], highlights: [0,1,2,3], pointers: {[0]:"i=0"}, variables: { pattern: "ABABC", j: 4, lps: "[0,0,1,2,0]" }, explanation: "Compare text[0..3] with pattern[0..3]: 'ABAB' matches. j advances to 4.", code: "// text[0..3] == pattern[0..3], j = 4" },
    { array: ["A","B","A","B","A","B","A","B","C"], highlights: [4], secondary: [0,1,2,3], pointers: {[4]:"i=4"}, variables: { j: "4 to 2", compare: "text[4]='A' != pattern[4]='C'" }, explanation: "text[4]='A' != pattern[4]='C'. Mismatch! Use lps[3]=2: set j=2. Skip re-checking 'AB' — we know it already matches.", code: "j = lps[j-1]; // j = lps[3] = 2" },
    { array: ["A","B","A","B","A","B","A","B","C"], highlights: [4,5], secondary: [2,3], pointers: {[2]:"start"}, variables: { j: 4, compare: "text[4..5]='AB' == pattern[2..3]='AB'" }, explanation: "Resume from j=2. text[4]='A'==pattern[2]='A', text[5]='B'==pattern[3]='B'. j reaches 4 again.", code: "// matched pattern[2..3] at text[4..5]" },
    { array: ["A","B","A","B","A","B","A","B","C"], highlights: [6], pointers: {[6]:"i=6"}, variables: { j: "4 to 2", compare: "text[6]='A' != pattern[4]='C'" }, explanation: "text[6]='A' != pattern[4]='C'. Mismatch again! lps[3]=2, set j=2. KMP slides forward efficiently.", code: "j = lps[3]; // j = 2 again" },
    { array: ["A","B","A","B","A","B","A","B","C"], highlights: [6,7,8], secondary: [4,5], pointers: {[4]:"start"}, variables: { j: 5, compare: "text[6..8]='ABC' matches pattern[2..4]" }, explanation: "text[6]='A'==pattern[2], text[7]='B'==pattern[3], text[8]='C'==pattern[4]. j=5 == pattern length. Match found at index 4!", code: "j == m; result.add(i - j); // match at index 4" },
  ]}
/>

---

## 2. Rabin-Karp Rolling Hash

Rabin-Karp trades deterministic guarantees for simplicity and flexibility (especially when searching for multiple patterns). It computes a **hash** of each window of text and compares it to the pattern hash.

### Rolling Hash Concept

A polynomial rolling hash for a string `s[0..m-1]` with base `b` and modulus `q`:

`h = (s[0]·b^(m-1) + s[1]·b^(m-2) + ... + s[m-1]) mod q`

When the window slides one character right (drop `s[i]`, add `s[i+m]`):

`h_new = (h - s[i]·b^(m-1)) · b + s[i+m]) mod q`

This update is **O(1)**.

```java
public static List<Integer> rabinKarp(String text, String pattern) {
    int base = 256;
    long mod = 1_000_000_007L;
    int n = text.length(), m = pattern.length();
    List<Integer> result = new ArrayList<>();
    if (m > n) return result;

    long hPat = 0, hTxt = 0, power = 1;
    for (int i = 0; i < m - 1; i++) power = (power * base) % mod;

    for (int i = 0; i < m; i++) {
        hPat = (hPat * base + pattern.charAt(i)) % mod;
        hTxt = (hTxt * base + text.charAt(i)) % mod;
    }

    for (int i = 0; i <= n - m; i++) {
        if (hPat == hTxt && text.substring(i, i + m).equals(pattern))
            result.add(i);
        if (i < n - m) {
            hTxt = ((hTxt - text.charAt(i) * power % mod + mod) * base
                    + text.charAt(i + m)) % mod;
        }
    }
    return result;
}
```

**Average Time:** O(n + m). **Worst case:** O(n·m) due to hash collisions, but a good modulus makes this unlikely.

<AlgoViz
  title="Rabin-Karp Rolling Hash: Find 'ABC' in 'XABCABY'"
  description="Compute a hash for the pattern and slide a window across the text, updating the hash in O(1) per step. On hash match, verify with string comparison."
  steps={[
    { array: ["X","A","B","C","A","B","Y"], highlights: [], variables: { pattern: "ABC", patHash: 198, base: 256, mod: "10^9+7" }, explanation: "Pattern 'ABC' has hash = (65*256^2 + 66*256 + 67) mod M = 198 (simplified). Compute initial text window hash.", code: "hPat = hash('ABC'); // precompute pattern hash" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [0,1,2], variables: { window: "XAB", winHash: 207, patHash: 198, match: "No" }, explanation: "Window [0..2] = 'XAB'. Hash = 207. 207 != 198 (pattern hash). No match.", code: "// hash('XAB') = 207 != 198, slide window" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [1,2,3], variables: { window: "ABC", winHash: 198, patHash: 198, match: "Hash match!" }, explanation: "Window [1..3] = 'ABC'. Rolling hash: remove 'X', add 'C'. Hash = 198 = patHash. Hash match! Verify string.", code: "hTxt = ((hTxt - 'X'*power) * base + 'C') % mod; // 198" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [1,2,3], secondary: [1,2,3], variables: { window: "ABC", verified: "true", result: "Match at index 1" }, explanation: "String verification: 'ABC' == 'ABC'. Confirmed match at index 1! Record result.", code: "text.substring(1, 4).equals(pattern) // true → result.add(1)" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [2,3,4], variables: { window: "BCA", winHash: 201, patHash: 198, match: "No" }, explanation: "Window [2..4] = 'BCA'. Rolling hash update: remove 'A', add 'A'. Hash = 201. No match.", code: "// hash('BCA') = 201 != 198, slide" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [3,4,5], variables: { window: "CAB", winHash: 195, patHash: 198, match: "No" }, explanation: "Window [3..5] = 'CAB'. Hash = 195 != 198. No match.", code: "// hash('CAB') = 195 != 198, slide" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [4,5,6], variables: { window: "ABY", winHash: 202, patHash: 198, match: "No" }, explanation: "Window [4..6] = 'ABY'. Hash = 202 != 198. No match. End of text reached.", code: "// hash('ABY') = 202 != 198, done" },
    { array: ["X","A","B","C","A","B","Y"], highlights: [1,2,3], variables: { result: "[1]", hashUpdates: 5, verifications: 1 }, explanation: "Found pattern 'ABC' at index 1. Rolling hash allowed O(1) hash updates per window. Only 1 verification needed.", code: "return result; // [1]" }
  ]}
/>

---

## 3. Trie (Prefix Tree) — Beyond Basic Prefix Search

**Why Tries exist.** A HashSet can tell you whether a word exists in O(L) time (L = word length), but it cannot efficiently answer prefix queries like "what words start with 'pre'?" or "what is the shortest dictionary root that matches the beginning of this word?" A Trie organizes words by their shared prefixes, making prefix operations natural. It also enables simultaneous traversal — walking the Trie in parallel with a grid search (Word Search II) or a string scan (Replace Words).

**Intuition.** Think of a Trie as an autocomplete engine. When you type "app," the Trie has already narrowed the universe of words to those starting with "app" — "apple," "application," "approach." Each character you type moves one level deeper in the tree, pruning irrelevant branches. This prefix-based organization is why Tries power autocomplete, spell-checkers, and IP routing tables.

**Interview signals.** "Implement a prefix tree." "Replace words with their shortest dictionary root." "Find all words that can be formed on a board" (Word Search II). "Autocomplete suggestions." "Maximum XOR of two numbers" (binary Trie). Any problem involving prefix matching or simultaneous multi-word search.

A Trie stores strings character-by-character in a tree. Each edge represents a character, and paths from root to marked nodes represent stored strings.

### Core Template

```java
import java.util.*;

class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean isEnd = false;
    int val = 0; // useful for Map Sum, prefix scores, etc.
}

class Trie {
    TrieNode root = new TrieNode();

    public void insert(String word, int val) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node.children.putIfAbsent(ch, new TrieNode());
            node = node.children.get(ch);
            node.val += val; // prefix score accumulation
        }
        node.isEnd = true;
    }

    public void insert(String word) { insert(word, 1); }

    public boolean search(String word) {
        TrieNode node = find(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private TrieNode find(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            if (!node.children.containsKey(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }
}
```

<AlgoViz
  title="Trie Insert + Search: Words 'app', 'apple', 'ape'"
  description="Build a Trie by inserting 'app', 'apple', 'ape'. Then search for 'app' (found), 'apple' (found), and 'ap' (prefix exists but not a word)."
  steps={[
    { tree: { val: "root" }, treeHighlights: [], variables: { operation: "Init", words: "app, apple, ape" }, explanation: "Empty Trie with just the root node. We will insert three words.", code: "Trie trie = new Trie();" },
    { array: ["a","p","p"], highlights: [0,1,2], variables: { operation: "Insert 'app'", path: "root→a→p→p", "p.isEnd": true }, explanation: "Insert 'app': create nodes a→p→p. Mark last 'p' as end-of-word.", code: "trie.insert(\"app\"); // a → p → p(end)" },
    { array: ["a","p","p","l","e"], highlights: [3,4], secondary: [0,1,2], variables: { operation: "Insert 'apple'", path: "root→a→p→p→l→e", reused: "a,p,p", new_nodes: "l,e" }, explanation: "Insert 'apple': traverse existing a→p→p, then create new nodes l→e. Mark 'e' as end. Shared prefix 'app' reused!", code: "trie.insert(\"apple\"); // reuse app, add l → e(end)" },
    { array: ["a","p","e"], highlights: [2], secondary: [0,1], variables: { operation: "Insert 'ape'", path: "root→a→p→e", reused: "a,p", new_branch: "e" }, explanation: "Insert 'ape': traverse a→p (shared), then branch: create 'e' node (separate from 'p' branch). Mark as end.", code: "trie.insert(\"ape\"); // reuse a→p, branch to e(end)" },
    { array: ["a","p","p"], highlights: [0,1,2], variables: { operation: "Search 'app'", path: "a→p→p", isEnd: true, result: "FOUND" }, explanation: "Search 'app': follow a→p→p. Node is marked isEnd=true. Word found!", code: "trie.search(\"app\"); // true" },
    { array: ["a","p","p","l","e"], highlights: [0,1,2,3,4], variables: { operation: "Search 'apple'", path: "a→p→p→l→e", isEnd: true, result: "FOUND" }, explanation: "Search 'apple': follow a→p→p→l→e. Node is marked isEnd=true. Word found!", code: "trie.search(\"apple\"); // true" },
    { array: ["a","p"], highlights: [0,1], variables: { operation: "Search 'ap'", path: "a→p", isEnd: false, result: "NOT FOUND" }, explanation: "Search 'ap': follow a→p. Node exists but isEnd=false. 'ap' is a prefix, not a stored word.", code: "trie.search(\"ap\"); // false (startsWith returns true)" },
    { array: ["a","p"], highlights: [0,1], variables: { operation: "startsWith 'ap'", result: "TRUE", wordsWithPrefix: "app, apple, ape" }, explanation: "startsWith('ap') returns true — the prefix node exists and has children. All three words share this prefix.", code: "trie.startsWith(\"ap\"); // true" }
  ]}
/>

### Advanced Trie Applications

| Application | How the Trie Helps |
|---|---|
| **Autocomplete / Prefix scores** | Traverse to the prefix node, then DFS for all completions. Store cumulative counts on each node. |
| **Replace Words (root replacement)** | Insert dictionary roots into a Trie; for each word walk the Trie and return the earliest root match. |
| **Word Search II (Boggle)** | Insert all words, then DFS the grid while walking the Trie simultaneously — prune branches with no children. |
| **Longest common prefix** | Insert all strings; walk from root until a node has more than one child or is marked as end. |
| **XOR maximisation** | Store binary representations; greedily pick the opposite bit at each level. |

---

## 4. Palindrome Algorithms

### Expand Around Center

Every palindrome mirrors around its center. There are `2n - 1` possible centers (each character, plus each gap between characters).

```java
public static String longestPalindromicSubstring(String s) {
    int n = s.length();
    if (n < 2) return s;
    int[] bounds = {0, 0}; // {start, end}

    for (int i = 0; i < n; i++) {
        expand(s, i, i, bounds);     // odd-length
        expand(s, i, i + 1, bounds); // even-length
    }
    return s.substring(bounds[0], bounds[1] + 1);
}

private static void expand(String s, int lo, int hi, int[] bounds) {
    while (lo >= 0 && hi < s.length() && s.charAt(lo) == s.charAt(hi)) {
        lo--;
        hi++;
    }
    if ((hi - lo - 1) > (bounds[1] - bounds[0] + 1)) {
        bounds[0] = lo + 1;
        bounds[1] = hi - 1;
    }
}
```

**Time:** O(n^2). **Space:** O(1).

<AlgoViz
  title="Longest Palindromic Substring: Expand Around Center on 'babad'"
  description="Try each of the 2n-1 possible centers (each character for odd-length, each gap for even-length). Expand outward while characters match. Track the longest palindrome found."
  steps={[
    { array: ["b","a","b","a","d"], highlights: [0], variables: { center: "0 (odd)", palindrome: "b", longest: "b", length: 1 }, explanation: "Center at index 0: expand from (0,0). Can't expand left. Palindrome: 'b' (length 1).", code: "expand(s, 0, 0, bounds); // 'b'" },
    { array: ["b","a","b","a","d"], highlights: [1], secondary: [0,2], variables: { center: "1 (odd)", lo: 0, hi: 2, match: "s[0]='b' == s[2]='b'", palindrome: "bab", longest: "bab", length: 3 }, explanation: "Center at index 1: expand (1,1) → check (0,2): 'b'=='b' match! → check (-1,3): out of bounds. Palindrome: 'bab' (length 3). New longest!", code: "expand(s, 1, 1, bounds); // 'bab', length 3" },
    { array: ["b","a","b","a","d"], highlights: [2], secondary: [1,3], variables: { center: "2 (odd)", lo: 1, hi: 3, match: "s[1]='a' == s[3]='a'", palindrome: "aba", longest: "bab", length: 3 }, explanation: "Center at index 2: expand (2,2) → (1,3): 'a'=='a' match! → (0,4): 'b'!='d' stop. Palindrome: 'aba' (length 3). Ties but doesn't beat current longest.", code: "expand(s, 2, 2, bounds); // 'aba', length 3" },
    { array: ["b","a","b","a","d"], highlights: [3], variables: { center: "3 (odd)", lo: 2, hi: 4, match: "s[2]='b' != s[4]='d'", palindrome: "a", longest: "bab", length: 1 }, explanation: "Center at index 3: expand (3,3) → (2,4): 'b'!='d' stop immediately. Palindrome: 'a' (length 1).", code: "expand(s, 3, 3, bounds); // 'a'" },
    { array: ["b","a","b","a","d"], highlights: [4], variables: { center: "4 (odd)", palindrome: "d", longest: "bab", length: 1 }, explanation: "Center at index 4: can't expand right. Palindrome: 'd' (length 1).", code: "expand(s, 4, 4, bounds); // 'd'" },
    { array: ["b","a","b","a","d"], highlights: [], variables: { evenCenters: "gaps (0,1),(1,2),(2,3),(3,4)", results: "none matched", longest: "bab" }, explanation: "Even-length centers: check all gaps between adjacent characters. (0,1): 'b'!='a', (1,2): 'a'!='b', (2,3): 'b'!='a', (3,4): 'a'!='d'. No even palindromes longer than 0.", code: "expand(s, i, i+1, bounds); // all even centers" },
    { array: ["b","a","b","a","d"], highlights: [0,1,2], variables: { result: "bab", start: 0, end: 2, length: 3, centers_checked: 9 }, explanation: "Result: 'bab' (indices 0-2), found by expanding around center index 1. Checked 2n-1 = 9 centers in O(n²) time, O(1) space.", code: "return s.substring(0, 3); // 'bab'" }
  ]}
/>

### Manacher's Algorithm (Concept)

Manacher's computes the radius of the longest palindrome centered at every position in **O(n)** time. The key ideas:

1. **Transform the string** by inserting sentinel characters (e.g., `#`) between every character (and at the boundaries) so that even-length palindromes also have a single center.
   - `"abba"` becomes `"#a#b#b#a#"`
2. Maintain a **rightmost palindrome boundary** `R` and its center `C`.
3. For each new center `i`, leverage the mirror position `2*C - i` to initialize the radius — the palindrome around the mirror is already known.
4. Attempt to expand beyond the inherited radius; update `R` and `C` when you extend past `R`.

This avoids redundant character comparisons, achieving linear time. While full implementation is rarely required in interviews, understanding the concept lets you explain the O(n) bound when asked.

---

## 5. String DP Patterns

### Word Break

Given a string `s` and a dictionary of words, determine if `s` can be segmented into a space-separated sequence of dictionary words.

`dp[i]` = True if `s[0..i-1]` can be segmented.

Transition: `dp[i] = True` if there exists some `j < i` where `dp[j]` is True and `s[j..i-1]` is in the dictionary.

### Distinct Subsequences

Count the number of distinct subsequences of `s` that equal `t`.

`dp[i][j]` = number of ways to form `t[0..j-1]` from `s[0..i-1]`.

Transition:
- If `s[i-1] == t[j-1]`: `dp[i][j] = dp[i-1][j-1] + dp[i-1][j]` (use or skip `s[i-1]`)
- Else: `dp[i][j] = dp[i-1][j]` (skip `s[i-1]`)

### Other String DP Problems

| Pattern | Key Idea |
|---|---|
| Edit distance | Classic 2D DP: insert, delete, replace |
| Longest palindromic subsequence | `dp[i][j]` = LPS of `s[i..j]`; expand if `s[i]==s[j]` |
| Palindromic substrings (count) | Expand-around-center or DP boolean table |
| Concatenated words | Word Break applied to each word using the rest of the dictionary |

---

## 6. Complexity Reference

| Algorithm | Time | Space | Notes |
|---|---|---|---|
| Brute-force string search | O(n·m) | O(1) | Worst case when pattern has repeating chars |
| KMP | O(n + m) | O(m) | Deterministic linear |
| Rabin-Karp | O(n + m) avg, O(n·m) worst | O(1) | Hash collisions cause worst case |
| Trie insert/search | O(L) per word | O(total chars) | L = word length |
| Expand around center | O(n^2) | O(1) | Simple, interview-friendly |
| Manacher's | O(n) | O(n) | Optimal palindrome detection |
| Word Break DP | O(n^2) or O(n·W) | O(n) | W = max word length with Trie optimization |
| Distinct Subsequences DP | O(n·m) | O(n·m), optimisable to O(m) | n = len(s), m = len(t) |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "find first occurrence of pattern in string" | KMP with failure function, or Rabin-Karp | KMP Search |
| "is the string a repeated substring pattern?" | Build lps array; check if n mod (n - lps[n-1]) equals 0 | KMP lps property |
| "find longest duplicate substring" | Binary search on length plus Rabin-Karp rolling hash | Binary Search + Rolling Hash |
| "implement prefix tree with insert/search" | TrieNode with children map and isEnd flag | Trie template |
| "find all words from dictionary on a grid" | Build Trie from words, DFS grid while walking Trie | Trie + Backtracking (Word Search II) |
| "replace words with shortest dictionary root" | Insert roots into Trie, scan each word for earliest match | Trie prefix match |
| "longest palindromic substring" | Expand around each of 2n-1 centers | Expand Around Center |
| "can string be segmented into dictionary words" | DP array where dp[i] = segmentable up to index i | Word Break DP |
| "shortest palindrome by prepending characters" | KMP on s + separator + reverse(s) | KMP lps trick |
| "minimum window containing all target characters" | Sliding window with frequency map and formed counter | Sliding Window |

---

## 7. Worked Example — Word Break

**Why not brute force?** A recursive brute-force approach tries every possible first word, then recurses on the remainder. Without memoization, this explores an exponential number of paths — the same suffix is re-examined many times. The DP approach (or memoized recursion) ensures each position is evaluated at most once, reducing time to O(n^2) or O(n * L) with a Trie optimization.

**Key insight:** The DP formulation `dp[i] = true if there exists some j where dp[j] is true AND s[j..i-1] is a dictionary word` converts the recursive tree into a linear scan. Each position i checks a bounded number of previous positions (bounded by the max word length in the dictionary).

**Problem:** Given `s = "leetcode"` and `wordDict = ["leet", "code"]`, return `True`.

### Approach A: DP with Hash Set

```java
public static boolean wordBreak(String s, List<String> wordDict) {
    Set<String> wordSet = new HashSet<>(wordDict);
    int n = s.length();
    boolean[] dp = new boolean[n + 1];
    dp[0] = true; // empty string is always segmentable

    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && wordSet.contains(s.substring(j, i))) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[n];
}
```

**Trace for `s = "leetcode"`:**

| i | Substring checked (`s[j:i]`) | `dp[j]` | Match? | `dp[i]` |
|---|---|---|---|---|
| 1 | `"l"` | dp[0]=T | "l" not in set | F |
| 2 | `"le"`, `"e"` | — | none match | F |
| 3 | `"lee"`, `"ee"`, `"e"` | — | none match | F |
| 4 | j=0: `"leet"` | dp[0]=T | "leet" in set | **T** |
| 5 | j=0: `"leetc"` (no), j=4: `"c"` (no) | — | none match | F |
| 6 | ... `"co"` (no) | — | none match | F |
| 7 | ... `"cod"` (no) | — | none match | F |
| 8 | j=0: `"leetcode"` (no), ..., j=4: `"code"` | dp[4]=T | "code" in set | **T** |

`dp[8] = True` — the string can be segmented as `"leet" + "code"`.

### Approach B: Trie Optimization

When the dictionary is large, build a Trie from `wordDict`. For each position `i` where `dp[i]` is True, walk the Trie from `s[i]` forward. Every time you reach a Trie node marked as end-of-word at position `j`, set `dp[j] = True`. This avoids creating substrings and leverages early termination when no Trie branch matches.

```java
public static boolean wordBreakTrie(String s, List<String> wordDict) {
    Trie trie = new Trie();
    for (String w : wordDict) trie.insert(w);

    int n = s.length();
    boolean[] dp = new boolean[n + 1];
    dp[0] = true;

    for (int i = 0; i < n; i++) {
        if (!dp[i]) continue;
        TrieNode node = trie.root;
        for (int j = i; j < n; j++) {
            char ch = s.charAt(j);
            if (!node.children.containsKey(ch)) break;
            node = node.children.get(ch);
            if (node.isEnd) dp[j + 1] = true;
        }
    }
    return dp[n];
}
```

**Complexity:** O(n * L) where L is the longest word in the dictionary, often much less than O(n^2).

### Animation

<AlgoViz
  title="Word Break DP"
  description="DP determines if s = 'leetcode' can be segmented using wordDict = ['leet', 'code']. dp[i] = true if s[0..i-1] can be segmented."
  steps={[
    { array: [1, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [0], variables: { s: "leetcode", dict: "leet, code" }, explanation: "Initial dp: dp[0] = true (empty string). Indices 1-8 represent positions after each character.", code: "dp[0] = true;" },
    { array: [1, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [1], variables: { i: 1, checking: "s[0:1] = 'l'" }, explanation: "i=1: Check s.substring(0,1) = 'l'. Not in dictionary. dp[1] stays false.", code: "wordSet.contains(s.substring(0, 1)) // false" },
    { array: [1, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [2], variables: { i: 2, checking: "'le'" }, explanation: "i=2: Check 'le'. Not in dictionary. dp[2] stays false.", code: "// no match for position 2" },
    { array: [1, 0, 0, 0, 0, 0, 0, 0, 0], highlights: [3], variables: { i: 3, checking: "'lee'" }, explanation: "i=3: Check 'lee'. Not in dictionary. dp[3] stays false.", code: "// no match for position 3" },
    { array: [1, 0, 0, 0, 1, 0, 0, 0, 0], highlights: [4], variables: { i: 4, j: 0, checking: "s[0:4] = 'leet'" }, explanation: "i=4, j=0: dp[0]=true and s.substring(0,4) = 'leet' is in dictionary. dp[4] = true!", code: "dp[4] = true; // 'leet' found" },
    { array: [1, 0, 0, 0, 1, 0, 0, 0, 0], highlights: [5, 6, 7], variables: { i: "5-7", checking: "'c', 'co', 'cod'" }, explanation: "i=5,6,7: No valid segmentation ending at these positions. dp stays false.", code: "// no matches at positions 5, 6, 7" },
    { array: [1, 0, 0, 0, 1, 0, 0, 0, 1], highlights: [8], variables: { i: 8, j: 4, checking: "s[4:8] = 'code'", result: "true" }, explanation: "i=8, j=4: dp[4]=true and s.substring(4,8) = 'code' is in dictionary. dp[8] = true! String can be segmented as 'leet' + 'code'.", code: "dp[8] = true; // 'code' found, return true" },
  ]}
/>

---

## 8. Practice Problems — 21 Problems over 7 Days

### Days 1–2: Pattern Matching and Prefix Techniques

| # | Problem | Link | Key Technique |
|---|---|---|---|
| 1 | Implement strStr() | [LC 28](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) | KMP or Rabin-Karp |
| 2 | Repeated Substring Pattern | [LC 459](https://leetcode.com/problems/repeated-substring-pattern/) | KMP failure function property |
| 3 | Longest Common Prefix | [LC 14](https://leetcode.com/problems/longest-common-prefix/) | Vertical scan or Trie |
| 4 | Longest Happy Prefix | [LC 1392](https://leetcode.com/problems/longest-happy-prefix/) | KMP lps array — answer is lps[n-1] |
| 5 | Repeated DNA Sequences | [LC 187](https://leetcode.com/problems/repeated-dna-sequences/) | Rolling hash or hash set of 10-char windows |
| 6 | Longest Duplicate Substring | [LC 1044](https://leetcode.com/problems/longest-duplicate-substring/) | Binary search + Rabin-Karp |
| 7 | Encode and Decode Strings | [LC 271](https://leetcode.com/problems/encode-and-decode-strings/) | Length-prefix encoding |

### Days 3–4: Trie Applications

| # | Problem | Link | Key Technique |
|---|---|---|---|
| 8 | Replace Words | [LC 648](https://leetcode.com/problems/replace-words/) | Trie — find shortest prefix root |
| 9 | Word Search II | [LC 212](https://leetcode.com/problems/word-search-ii/) | Trie + backtracking DFS on grid |
| 10 | Map Sum Pairs | [LC 677](https://leetcode.com/problems/map-sum-pairs/) | Trie with value accumulation |
| 11 | Sum of Prefix Scores of Strings | [LC 2416](https://leetcode.com/problems/sum-of-prefix-scores-of-strings/) | Trie — count at each node |
| 12 | Concatenated Words | [LC 472](https://leetcode.com/problems/concatenated-words/) | Trie + Word Break DP per word |
| 13 | Palindrome Pairs | [LC 336](https://leetcode.com/problems/palindrome-pairs/) | Trie of reversed words + palindrome suffix checks |
| 14 | Word Break | [LC 139](https://leetcode.com/problems/word-break/) | DP + set or Trie |

### Days 5–7: Palindromes, String DP, and Advanced

| # | Problem | Link | Key Technique |
|---|---|---|---|
| 15 | Longest Palindromic Substring | [LC 5](https://leetcode.com/problems/longest-palindromic-substring/) | Expand around center |
| 16 | Palindromic Substrings | [LC 647](https://leetcode.com/problems/palindromic-substrings/) | Expand around center (count) |
| 17 | Shortest Palindrome | [LC 214](https://leetcode.com/problems/shortest-palindrome/) | KMP on `s + "#" + reverse(s)` |
| 18 | Word Break II | [LC 140](https://leetcode.com/problems/word-break-ii/) | Backtracking + memoization |
| 19 | Distinct Subsequences | [LC 115](https://leetcode.com/problems/distinct-subsequences/) | 2D DP |
| 20 | Count Different Palindromic Subsequences | [LC 730](https://leetcode.com/problems/count-different-palindromic-subsequences/) | Interval DP with character tracking |
| 21 | Minimum Window Substring | [LC 76](https://leetcode.com/problems/minimum-window-substring/) | Sliding window + frequency map |

---

## 9. Mock Interviews

### Mock Interview 1 — Word Search II (Hard)

**Interviewer:** Given an `m x n` board of characters and a list of words, find all words that can be formed by sequentially adjacent cells (horizontal or vertical). Each cell may be used at most once per word.

**Candidate approach:**

1. Build a Trie from the word list.
2. For each cell on the board, start a DFS while walking the Trie simultaneously.
3. When a Trie node is marked as end-of-word, add the word to results.
4. Prune: remove leaf Trie nodes after finding a word to avoid redundant searches.

**Follow-ups:**

1. *"What is the time complexity?"*
   — O(m · n · 4^L) where L is the max word length. The Trie prunes most branches so practical runtime is much lower. Building the Trie is O(sum of word lengths).

2. *"How do you avoid duplicate results?"*
   — After finding a word, set `node.is_end = False`. This also means we can use a list instead of a set for results.

3. *"The word list has 30,000 words and the board is 12x12. How do you optimize?"*
   — Prune dead Trie branches: after a DFS returns, if a node has no children, delete it from its parent. This progressively shrinks the Trie. Also, early-terminate DFS when the current Trie node has no children.

4. *"What if words share long prefixes?"*
   — The Trie naturally deduplicates shared prefixes — storing 30,000 words may only need a fraction of the nodes compared to storing them individually. This is exactly why the Trie outperforms running Word Search I 30,000 times.

---

### Mock Interview 2 — Shortest Palindrome (Hard)

**Interviewer:** Given a string `s`, find the shortest palindrome you can make by adding characters only to the front of `s`.

**Candidate approach:**

1. The problem reduces to finding the longest palindromic prefix of `s`.
2. Whatever remains after that prefix (call it `suffix`) must be reversed and prepended.
3. To find the longest palindromic prefix efficiently, construct `t = s + "#" + reverse(s)` and compute the KMP failure function on `t`.
4. The value `lps[len(t) - 1]` gives the length of the longest prefix of `s` that is also a suffix of `reverse(s)` — which is exactly the longest palindromic prefix.
5. Answer: `reverse(s[lps_val:]) + s`.

**Follow-ups:**

1. *"Why do you insert the `#` separator?"*
   — Without it, the `lps` value could exceed `len(s)`, incorrectly matching across the boundary between `s` and `reverse(s)`. The separator guarantees the match stays within `s`.

2. *"Can you solve it without KMP?"*
   — Yes, use Rabin-Karp: compute forward and reverse hashes simultaneously, and check for the longest prefix where both hashes match (with verification). Or use a simpler O(n^2) approach: try shrinking the candidate palindromic prefix from the full string.

3. *"What is the time and space complexity of the KMP approach?"*
   — Time: O(n) for building `lps` on a string of length `2n + 1`. Space: O(n) for the `lps` array and the concatenated string.

4. *"What edge cases should you handle?"*
   — Empty string (return `""`), single character (already a palindrome), entire string is a palindrome (return `s` unchanged), string of identical characters like `"aaaa"`.

---

## 10. Tips and Edge Cases

- **Empty and single-character strings:** Always handle these at the top of your functions. An empty pattern in KMP should return index 0 or an empty list depending on the problem statement.
- **Modular arithmetic pitfalls:** In Rabin-Karp, the hash can become negative after subtraction. Always add the modulus before taking mod: `h = (h % mod + mod) % mod`.
- **KMP lps for repeated patterns:** If `n % (n - lps[n-1]) == 0`, the string consists of a repeating unit of length `n - lps[n-1]`. This solves "Repeated Substring Pattern" in O(n).
- **Trie memory:** For large alphabets, using a dictionary for children is more memory-efficient than a fixed-size array. For competitive programming with only lowercase English letters, a size-26 array is faster.
- **Word Break cycle trap:** The basic DP avoids infinite loops naturally because `i` strictly increases. But in recursive/memoized versions, ensure you memoize on index, not on the substring itself (to avoid exponential blowup).
- **Palindrome even vs. odd:** Always expand from both `(i, i)` and `(i, i+1)` centers, or use the sentinel-insertion trick from Manacher's.
- **Distinct Subsequences overflow:** Counts can be astronomically large. Use `mod 10^9 + 7` if the problem requires it, or `long` to delay overflow.
- **Minimum Window Substring:** Use two frequency HashMaps and a `formed` counter tracking how many unique characters meet the required count. Shrink the window from the left once all characters are satisfied.
- **String immutability in Java:** `substring()` creates a new String object. Avoid repeated substring creation inside loops when possible — use `charAt()` index-based comparisons instead.
