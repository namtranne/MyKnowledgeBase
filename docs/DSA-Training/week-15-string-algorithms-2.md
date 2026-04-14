---
sidebar_position: 16
title: "Week 15: String Algorithms II — Advanced Structures"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 15: String Algorithms II — Advanced Structures

## Overview

Week 14 covered the fundamental pattern-matching algorithms. This week dives into the **data structures** that power advanced string operations: **Tries** for prefix-based queries, **Suffix Arrays** for analyzing all substrings, **Manacher's Algorithm** for palindrome detection, and an introduction to **Aho-Corasick** for multi-pattern matching. Together, these tools unlock solutions to problems that no simple algorithm can tackle efficiently — from autocomplete systems to counting distinct substrings to finding every palindromic substring in linear time.

---

## Core Theory

<AlgoViz
  title="Trie — Insert and Search"
  steps={[
    { description: "Start with empty trie (root node only). We will insert \"app\", \"apple\", and \"bat\".", state: { trie: "(root)", words: "[]" } },
    { description: "Insert \"app\": Create path root -> 'a' -> 'p' -> 'p'. Mark last 'p' node as isEnd = true.", state: { trie: "(root) -> a -> p -> p*", words: "[app]" } },
    { description: "Insert \"apple\": Traverse existing root -> 'a' -> 'p' -> 'p'. Then create 'l' -> 'e'. Mark 'e' as isEnd = true.", state: { trie: "(root) -> a -> p -> p* -> l -> e*", words: "[app, apple]" } },
    { description: "Insert \"bat\": No 'b' child at root, create new branch root -> 'b' -> 'a' -> 't'. Mark 't' as isEnd = true.", state: { trie: "(root) -> a -> p -> p* -> l -> e*,  (root) -> b -> a -> t*", words: "[app, apple, bat]" } },
    { description: "Search \"app\": Traverse root -> 'a' -> 'p' -> 'p'. Node has isEnd = true. Found!", state: { query: "app", path: "root -> a -> p -> p*", result: "FOUND" } },
    { description: "Search \"ap\": Traverse root -> 'a' -> 'p'. Node has isEnd = false. Not a complete word!", state: { query: "ap", path: "root -> a -> p", result: "NOT FOUND (isEnd=false)" } },
    { description: "startsWith \"ap\": Traverse root -> 'a' -> 'p'. Node exists, so prefix is present. True!", state: { query: "ap", path: "root -> a -> p", result: "PREFIX EXISTS" } },
    { description: "Search \"bat\": Traverse root -> 'b' -> 'a' -> 't'. Node has isEnd = true. Found!", state: { query: "bat", path: "root -> b -> a -> t*", result: "FOUND" } }
  ]}
/>

### 1. Trie (Prefix Tree)

**Why this technique exists.** Hash maps can check if a *specific* word exists in a dictionary, but they cannot efficiently answer "what words start with this prefix?" or "what is the longest dictionary word that matches a prefix of my input?" A Trie stores words so that all words sharing a prefix share the same path from the root. This makes prefix queries trivially fast (just walk the tree) and enables powerful pruning in backtracking problems (Word Search II). The Trie is also the backbone of Aho-Corasick multi-pattern matching.

**The intuition.** Imagine organizing a physical dictionary not alphabetically in a list, but as a tree of letter cards. The root has 26 children (one per letter). Each child has its own children for the second letter, and so on. To look up "apple," you follow a-p-p-l-e down the tree. To find all words starting with "app," you walk to the "app" node and explore its entire subtree. Shared prefixes share nodes, saving both space and lookup time.

**Interview signals.** Look for: (1) "autocomplete" or "prefix search," (2) "word break" or "word dictionary" problems, (3) "maximum XOR" (bitwise Trie), (4) "find all words on a board" (Trie + backtracking), (5) "stream of characters -- does any word end here?"

**Common mistakes.** (1) Not pruning the Trie after finding words in backtracking problems (Word Search II), leading to TLE on large inputs. (2) Using a fixed-size array (`new TrieNode[26]`) for inputs that are not strictly lowercase English — always verify the alphabet before choosing the children data structure. (3) Confusing `search` (exact word match, checks `isEnd`) with `startsWith` (prefix existence, does not check `isEnd`). (4) Forgetting to handle the empty string case — an empty string is a valid prefix of everything.

#### Structure

A Trie is a tree where each edge represents a character and each node represents a prefix. Every path from root to a node spells out a prefix; nodes marked with `is_end = True` indicate complete words.

```
          (root)
         /      \
        a        b
       / \        \
      p   n        a
      |   |        |
      p   d        d
      |
      l
      |
      e
```

This trie stores: `"apple"`, `"and"`, `"bad"`.

#### Implementation

```java
import java.util.*;

class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean isEnd = false;
}

class Trie {
    TrieNode root = new TrieNode();

    void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node.children.putIfAbsent(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    boolean search(String word) {
        TrieNode node = find(word);
        return node != null && node.isEnd;
    }

    boolean startsWith(String prefix) {
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

**Time:** Insert/Search/StartsWith are all O(L) where L = word length.
**Space:** O(total characters across all words) in the worst case; shared prefixes reduce this.

#### Applications

1. **Autocomplete:** Traverse to the prefix node, then DFS to find all words.
2. **Word Break (LC 139):** At each position in the input, follow trie edges to find all words starting here.
3. **XOR Maximization (Bitwise Trie):** Insert numbers bit-by-bit (MSB first). To maximize XOR with a query number, greedily take the opposite bit at each level.

**When to use this template.** Reach for a bitwise Trie whenever the problem asks to maximize or minimize XOR between pairs of numbers, or to find XOR values within a given range. The Trie processes numbers bit-by-bit from the most significant bit, enabling greedy bit-level decisions in O(32) per query — effectively O(1).

```java
class BitwiseTrie {
    // Trie storing 32-bit integers for XOR maximization.
    private int[][] children = new int[32 * 100_001][2]; // adjust size as needed
    private int cnt = 0;

    BitwiseTrie() {
        for (int[] row : children) Arrays.fill(row, -1);
        cnt = 1; // root is node 0
    }

    void insert(int num) {
        int node = 0;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            if (children[node][bit] == -1) {
                children[node][bit] = cnt++;
            }
            node = children[node][bit];
        }
    }

    int maxXor(int num) {
        int node = 0, result = 0;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            int toggled = 1 - bit;
            if (children[node][toggled] != -1) {
                result |= (1 << i);
                node = children[node][toggled];
            } else {
                node = children[node][bit];
            }
        }
        return result;
    }
}
```

<AlgoViz
  title="Bitwise Trie — Maximum XOR Query"
  description="Insert numbers [3, 10, 5] into a bitwise trie (4-bit). Query: find max XOR with 7. Greedily take opposite bits."
  steps={[
    {
      array: [3, 10, 5],
      labels: {"0": "0011", "1": "1010", "2": "0101"},
      variables: {numbers: "[3, 10, 5]", bits: 4, query: 7, query_bits: "0111"},
      explanation: "Insert 3(0011), 10(1010), 5(0101) into a 4-bit trie. Then query: which number XORs with 7(0111) to give the maximum result? Process MSB to LSB, greedily choosing opposite bits.",
      code: "// insert all numbers bit-by-bit from MSB"
    },
    {
      array: [3, 10, 5],
      highlights: [0, 1, 2],
      variables: {trie: "root→0→0→1→1(3), root→1→0→1→0(10), root→0→1→0→1(5)", paths: 3},
      explanation: "Trie built. Three paths from root: 0→0→1→1 (num 3), 1→0→1→0 (num 10), 0→1→0→1 (num 5). Now query with 7 = 0111.",
      code: "trie.insert(3); trie.insert(10); trie.insert(5);"
    },
    {
      array: [0, 1, 1, 1],
      labels: {"0": "bit3", "1": "bit2", "2": "bit1", "3": "bit0"},
      highlights: [0],
      variables: {query_bit: "0 (MSB of 7)", want: "1 (opposite)", found: "Yes! Path 1→... exists (num 10)", result_bit: 1},
      explanation: "Bit 3 of query = 0. Want opposite = 1. Trie has child '1' (leading to 10). Take it! XOR bit = 1. result = 1000 so far.",
      code: "// bit 3: query=0, take toggled=1 → result |= 8"
    },
    {
      array: [0, 1, 1, 1],
      highlights: [1],
      variables: {query_bit: "1 (bit 2 of 7)", want: "0 (opposite)", found: "Yes! Path 1→0→... exists", result_bit: 1},
      explanation: "Bit 2 of query = 1. Want opposite = 0. Current node has child '0' (path 10→0). Take it! XOR bit = 1. result = 1100 so far.",
      code: "// bit 2: query=1, take toggled=0 → result |= 4"
    },
    {
      array: [0, 1, 1, 1],
      highlights: [2],
      variables: {query_bit: "1 (bit 1 of 7)", want: "0 (opposite)", found: "No! Only child '1' exists", forced: "take bit 1", result_bit: 0},
      explanation: "Bit 1 of query = 1. Want opposite = 0. But only child '1' exists at this node (path 1010). Forced to take same bit. XOR bit = 0. result = 1100.",
      code: "// bit 1: query=1, forced to take 1 → no XOR gain"
    },
    {
      array: [0, 1, 1, 1],
      highlights: [3],
      variables: {query_bit: "1 (bit 0 of 7)", want: "0 (opposite)", found: "Yes! Child '0' exists (reaches 10)", result_bit: 1},
      explanation: "Bit 0 of query = 1. Want opposite = 0. Child '0' exists (number 10 = 1010). Take it! XOR bit = 1. Final result = 1101 = 13.",
      code: "// bit 0: query=1, take toggled=0 → result |= 1"
    },
    {
      array: [3, 10, 5],
      highlights: [1],
      variables: {answer: 13, best_number: "10 (1010)", xor: "7 XOR 10 = 0111 XOR 1010 = 1101 = 13", verify: "7^3=4, 7^10=13, 7^5=2"},
      explanation: "Max XOR = 13 (7 XOR 10). Verify: 7^3=4, 7^10=13, 7^5=2. Greedy bit-by-bit selection found the optimum in O(32) — effectively O(1) per query.",
      code: "return trie.maxXor(7);  // 13"
    }
  ]}
/>

---

### 2. Suffix Array

**Why this technique exists.** A suffix array is a space-efficient alternative to a suffix tree that answers the same fundamental question: "what can we learn by examining all suffixes of a string?" Sorting all suffixes lexicographically enables binary search for any substring in O(m log n), and combined with the LCP array, it solves problems like longest repeated substring, longest common substring, and counting distinct substrings. The suffix array uses O(n) space (just an integer array) compared to a suffix tree's O(n) space with large constants and complex node structures.

**Interview signals.** Look for: (1) "longest repeated substring" (max value in LCP array), (2) "longest common substring of two strings" (concatenate with sentinel, check LCP across boundary), (3) "count distinct substrings" (formula: `n*(n+1)/2 - sum(lcp)`), (4) "rank all suffixes" or "lexicographic order of rotations" (suffix array directly), (5) "k-th smallest substring" (suffix array + LCP with cumulative counting).

**Common mistakes.** (1) Using O(n^2 log n) naive sorting of suffixes instead of prefix doubling — each suffix comparison is O(n), making standard sort O(n^2 log n). (2) Forgetting the sentinel character when finding longest common substrings of two strings — without it, LCP values can span across the string boundary. (3) Off-by-one errors in Kasai's algorithm when the suffix at rank 0 has no predecessor in sorted order. (4) Assuming the LCP array stores LCP between arbitrary suffix pairs — it only stores LCP between adjacent suffixes in sorted order; use a sparse table for arbitrary pair queries.

#### What It Is

The **suffix array** `SA` of a string `S[0..n-1]` is an array of integers `[0, 1, ..., n-1]` sorted by the lexicographic order of the suffixes they represent.

**Example for `S = "banana"`:**

| Index | Suffix   |
|-------|----------|
| 0     | banana   |
| 1     | anana    |
| 2     | nana     |
| 3     | ana      |
| 4     | na       |
| 5     | a        |

Sorted lexicographically:

| Rank | SA[rank] | Suffix   |
|------|----------|----------|
| 0    | 5        | a        |
| 1    | 3        | ana      |
| 2    | 1        | anana    |
| 3    | 0        | banana   |
| 4    | 4        | na       |
| 5    | 2        | nana     |

So `SA = [5, 3, 1, 0, 4, 2]`.

#### Construction via Prefix Doubling — O(n log² n)

The idea: sort suffixes by their first `k` characters, then by their first `2k`, then `4k`, etc. After `O(log n)` rounds, suffixes are fully sorted.

In each round, each suffix's sort key is a **pair** `(rank of first half, rank of second half)`, where both ranks come from the previous round.

**When to use this template.** Use suffix array construction when you need to analyze all substrings of a string — for example, finding the longest repeated substring, counting distinct substrings, or computing the longest common substring of two strings. Build the suffix array once in O(n log^2 n) time, then pair it with the LCP array for efficient substring queries.

```java
import java.util.*;

int[] buildSuffixArray(String s) {
    int n = s.length();
    Integer[] sa = new Integer[n];
    int[] rank = new int[n], tmp = new int[n];
    for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }

    for (int k = 1; k < n; k *= 2) {
        final int kk = k;
        final int[] r = rank;
        Arrays.sort(sa, (a, b) -> {
            if (r[a] != r[b]) return r[a] - r[b];
            int ra = a + kk < n ? r[a + kk] : -1;
            int rb = b + kk < n ? r[b + kk] : -1;
            return ra - rb;
        });

        tmp[sa[0]] = 0;
        for (int i = 1; i < n; i++) {
            tmp[sa[i]] = tmp[sa[i - 1]];
            int ra = sa[i - 1] + kk < n ? r[sa[i - 1] + kk] : -1;
            int rb = sa[i] + kk < n ? r[sa[i] + kk] : -1;
            if (r[sa[i]] != r[sa[i - 1]] || ra != rb) tmp[sa[i]]++;
        }
        System.arraycopy(tmp, 0, rank, 0, n);
        if (rank[sa[n - 1]] == n - 1) break;  // all ranks unique
    }
    int[] result = new int[n];
    for (int i = 0; i < n; i++) result[i] = sa[i];
    return result;
}
```

**Time:** O(n log² n) — O(log n) rounds, each with O(n log n) sorting. Can be improved to O(n log n) with radix sort.

<AlgoViz
  title="Suffix Array Construction — Prefix Doubling"
  description="Builds suffix array for S='abac' using prefix doubling. Sorts suffixes by first k, then 2k, then 4k characters."
  steps={[
    {
      array: [97, 98, 97, 99],
      labels: {"0": "a", "1": "b", "2": "a", "3": "c"},
      variables: {S: "abac", suffixes: "['abac','bac','ac','c']", phase: "Init"},
      explanation: "String S = 'abac'. 4 suffixes: abac(0), bac(1), ac(2), c(3). Start by ranking by first character.",
      code: "// Initial rank by first character"
    },
    {
      array: [0, 1, 0, 2],
      labels: {"0": "a→0", "1": "b→1", "2": "a→0", "3": "c→2"},
      highlights: [0, 2],
      variables: {k: 1, rank: "[0,1,0,2]", tied: "indices 0,2 both rank 0"},
      explanation: "k=1: rank by first char. a=0, b=1, c=2. Indices 0 and 2 are tied (both 'a'). Need to double k.",
      code: "rank = [0, 1, 0, 2];  // k=1"
    },
    {
      array: [0, 1, 0, 2],
      array2: [1, 0, 2, -1],
      labels: {"0": "idx 0", "1": "idx 1", "2": "idx 2", "3": "idx 3"},
      labels2: {"0": "r[0+1]", "1": "r[1+1]", "2": "r[2+1]", "3": "r[3+1]"},
      variables: {k: 2, sort_keys: "idx0:(0,1), idx1:(1,0), idx2:(0,2), idx3:(2,-1)"},
      explanation: "k=2: sort by pair (rank[i], rank[i+k]). Keys: 0→(0,1), 1→(1,0), 2→(0,2), 3→(2,-1). -1 for out of bounds.",
      code: "// Sort by (rank[i], rank[i+k])"
    },
    {
      array: [0, 2, 1, 3],
      labels: {"0": "SA[0]", "1": "SA[1]", "2": "SA[2]", "3": "SA[3]"},
      highlights: [0, 1, 2, 3],
      variables: {SA: "[0, 2, 1, 3]", sorted_suffixes: "['abac','ac','bac','c']", new_rank: "[0,2,1,3]"},
      explanation: "Sorted: (0,1)<(0,2)<(1,0)<(2,-1) → SA=[0,2,1,3]. All ranks unique! Suffix array is complete.",
      code: "SA = [0, 2, 1, 3];  // sorted after k=2"
    },
    {
      array: [0, 2, 1, 3],
      highlights: [0, 1, 2, 3],
      variables: {SA: "[0,2,1,3]", "SA[0]→abac": "rank 0", "SA[1]→ac": "rank 1", "SA[2]→bac": "rank 2", "SA[3]→c": "rank 3"},
      explanation: "Final SA = [0,2,1,3]. Suffixes in lex order: abac(0) < ac(2) < bac(1) < c(3). Built in O(n log²n) with 2 rounds.",
      code: "return SA;  // [0, 2, 1, 3]"
    },
    {
      array: [0, 1, 0, 0],
      labels: {"0": "lcp[0]", "1": "lcp[1]", "2": "lcp[2]", "3": "lcp[3]"},
      highlights: [1],
      variables: {LCP: "[-, 1, 0, 0]", "lcp[1]": "LCP(abac, ac) = 1 (share 'a')", max_lcp: 1},
      explanation: "Kasai's LCP array: [-, 1, 0, 0]. Max LCP = 1 between 'abac' and 'ac'. Longest repeated substring: 'a'.",
      code: "// lcp[1] = 1: 'abac' and 'ac' share prefix 'a'"
    }
  ]}
/>

#### LCP Array — Kasai's Algorithm

The **LCP array** `lcp[i]` stores the length of the **Longest Common Prefix** between the suffixes at `SA[i]` and `SA[i-1]` in sorted order.

**Key observation (Kasai):** If the suffix starting at position `SA[rank[i]-1]` shares an LCP of `h` with the suffix before it in sorted order, then the suffix starting at position `i+1` shares an LCP of at least `h-1` with its predecessor. This means we can compute all LCP values in O(n) by processing suffixes in text order.

```java
int[] buildLcpArray(String s, int[] sa) {
    int n = s.length();
    int[] rank = new int[n];
    for (int i = 0; i < n; i++) rank[sa[i]] = i;

    int[] lcp = new int[n];
    int h = 0;
    for (int i = 0; i < n; i++) {
        if (rank[i] > 0) {
            int j = sa[rank[i] - 1];  // previous suffix in sorted order
            while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) {
                h++;
            }
            lcp[rank[i]] = h;
            if (h > 0) h--;
        } else {
            h = 0;
        }
    }
    return lcp;
}
```

**Time:** O(n). **Space:** O(n).

<AlgoViz
  title="Suffix Array + LCP — Finding Longest Repeated Substring"
  description="For S='banana', SA=[5,3,1,0,4,2]. Kasai's algorithm builds LCP array. max(LCP) gives the longest repeated substring 'ana'."
  steps={[
    {
      array: [5, 3, 1, 0, 4, 2],
      labels: {"0": "a", "1": "ana", "2": "anana", "3": "banana", "4": "na", "5": "nana"},
      variables: {S: "banana", SA: "[5,3,1,0,4,2]", phase: "Build LCP with Kasai's"},
      explanation: "Suffix array for 'banana': SA=[5,3,1,0,4,2]. Suffixes in sorted order: a, ana, anana, banana, na, nana. Now compute LCP between adjacent sorted suffixes.",
      code: "// rank[sa[i]] = i; process in text order"
    },
    {
      array: [5, 3, 1, 0, 4, 2],
      highlights: [0, 1],
      variables: {rank_0: 3, prev_suffix: "anana (SA[2]=1)", compare: "banana vs anana", h: 0, "lcp[3]": 0},
      explanation: "Process i=0 ('banana'), rank=3. Compare with SA[2]='anana'. 'b'!='a' at position 0. lcp[3]=0. h remains 0.",
      code: "lcp[3] = 0;  // banana vs anana: no common prefix"
    },
    {
      array: [5, 3, 1, 0, 4, 2],
      highlights: [1, 2],
      variables: {rank_1: 2, prev_suffix: "ana (SA[1]=3)", compare: "anana vs ana", h: "0→3", "lcp[2]": 3},
      explanation: "Process i=1 ('anana'), rank=2. Compare with SA[1]='ana'. Match: a=a, n=n, a=a, then 'n' vs end. lcp[2]=3. h=3, then h-- → h=2.",
      code: "lcp[2] = 3;  // anana vs ana share 'ana'"
    },
    {
      array: [5, 3, 1, 0, 4, 2],
      highlights: [4, 5],
      variables: {rank_2: 5, prev_suffix: "na (SA[4]=4)", compare: "nana vs na", h: "2→2", "lcp[5]": 2},
      explanation: "Process i=2 ('nana'), rank=5. Start with h=2 (Kasai's optimization). Compare positions 4 vs 6: out of bounds. lcp[5]=2. 'nana' and 'na' share 'na'.",
      code: "lcp[5] = 2;  // nana vs na share 'na'"
    },
    {
      array: [5, 3, 1, 0, 4, 2],
      highlights: [0, 1],
      variables: {"lcp[1]": 1, note: "ana vs a: share 'a', length 1", h_progression: "Kasai guarantee: h never resets to 0 unnecessarily"},
      explanation: "Continue: i=3 ('ana') → lcp[1]=1 (ana vs a share 'a'). i=4 ('na') → lcp[4]=0 (na vs banana share nothing). i=5 ('a') → rank=0, skip.",
      code: "lcp = [-, 1, 3, 0, 0, 2]"
    },
    {
      array: [0, 1, 3, 0, 0, 2],
      labels: {"0": "lcp[0]", "1": "lcp[1]", "2": "lcp[2]", "3": "lcp[3]", "4": "lcp[4]", "5": "lcp[5]"},
      highlights: [2],
      variables: {lcp: "[-,1,3,0,0,2]", max_lcp: 3, at_rank: 2, substring: "S[SA[2]..SA[2]+3] = S[1..3] = 'ana'"},
      explanation: "LCP = [-,1,3,0,0,2]. max(LCP) = 3 at rank 2 (between 'ana' and 'anana'). Longest repeated substring: S[1..3] = 'ana'. It appears at positions 1 and 3.",
      code: "// max(lcp) = 3 → 'ana' (longest repeated substring)"
    },
    {
      array: [0, 1, 3, 0, 0, 2],
      highlights: [2],
      variables: {answer: "ana (length 3)", distinct_substrings: "n*(n+1)/2 - sum(lcp) = 21 - 6 = 15", sum_lcp: "0+1+3+0+0+2=6"},
      explanation: "Bonus: count distinct substrings = n(n+1)/2 − sum(LCP) = 21 − 6 = 15. The LCP array encodes shared prefixes between adjacent sorted suffixes — subtracting removes double-counted substrings.",
      code: "// distinct substrings = 21 - 6 = 15"
    }
  ]}
/>

#### Applications of Suffix Array + LCP

1. **Longest Repeated Substring:** `max(lcp)` — the maximum LCP value. The substring itself is `s[sa[argmax]:sa[argmax] + max_lcp]`.
2. **Longest Common Substring of two strings:** Concatenate `A + "$" + B`, build suffix array and LCP array, find maximum `lcp[i]` where `sa[i]` and `sa[i-1]` belong to different strings.
3. **Count Distinct Substrings:** Total substrings = `n*(n+1)/2`. Subtract duplicates: `sum(lcp)`. Answer = `n*(n+1)/2 - sum(lcp)`.

---

### 3. Manacher's Algorithm

**Why this technique exists.** The expand-around-center approach for finding palindromes is O(n squared) because each of the 2n-1 centers can expand up to n/2 steps. Manacher's algorithm achieves O(n) by reusing previously computed palindrome radii. The key insight is that palindromes are *mirrors*: if you are inside a known palindrome, the palindrome radius at your position is at least as large as the radius at your mirror position (with some boundary adjustments). This eliminates redundant character comparisons.

**The intuition.** Imagine you have already found a large palindrome centered at position C reaching up to position R. Now you want to compute the palindrome radius at a new position i (where i is less than R). Because everything between C and R mirrors around C, position i's palindrome is a mirror of the palindrome at position `2*C - i`. If that mirror palindrome fits entirely inside the known palindrome, you get the radius for free. If it reaches the boundary R, you only need to try expanding *beyond* R -- and every such expansion moves R forward. Since R only moves right, the total work across all positions is O(n).

**Interview signals.** Look for: (1) "longest palindromic substring" (Manacher's gives O(n) vs expand-around-center's O(n^2)), (2) "count palindromic substrings" (sum the radii with parity adjustment), (3) "is there a palindrome of length k?" (check if any radius in the P array is at least k), (4) "palindromic prefix" or "palindromic suffix" (check boundary radii in the Manacher array), (5) problems requiring palindrome information as a subroutine inside a larger DP.

**Common mistakes.** (1) Incorrect transform: the sentinel characters `^` and `$` at the boundaries must be distinct from each other and from `#` — using the same character causes the expand loop to read out of bounds. (2) Off-by-one when converting Manacher's center index back to the original string index: for the transformed string `"^#a#b#c#$"`, original index = `(center - 2) / 2` for character positions. (3) Confusing palindromic *substring* with palindromic *subsequence* — Manacher's only solves the substring variant; subsequences require DP.

#### The Problem

Find the longest palindromic substring (or count all palindromic substrings) in O(n) time.

#### The Transform Trick

To handle both odd-length and even-length palindromes uniformly, insert a sentinel character `#` between every pair of characters and at both ends:

```
"abba" → "#a#b#b#a#"
```

Now every palindrome (including even-length ones) has a single center character in the transformed string.

#### The Algorithm

Let `T` be the transformed string of length `2n+1`. Define `p[i]` as the **radius** of the longest palindrome centered at `i` in `T`.

Maintain `C` (center of the rightmost-reaching palindrome) and `R` (its right boundary).

For each position `i`:

1. **Mirror:** Let `mirror = 2*C - i`. If `i < R`, then `p[i] = min(p[mirror], R - i)` — we can reuse information from the mirror.
2. **Expand:** Try to extend the palindrome centered at `i` beyond what the mirror guarantees.
3. **Update:** If `i + p[i] > R`, update `C = i`, `R = i + p[i]`.

```java
int[] manacher(String s) {
    // Transform: "abc" -> "^#a#b#c#$"
    StringBuilder sb = new StringBuilder("^#");
    for (int i = 0; i < s.length(); i++) {
        if (i > 0) sb.append('#');
        sb.append(s.charAt(i));
    }
    sb.append("#$");
    char[] t = sb.toString().toCharArray();
    int n = t.length;
    int[] p = new int[n];
    int c = 0, r = 0;  // center, right boundary
    for (int i = 1; i < n - 1; i++) {
        int mirror = 2 * c - i;
        if (i < r) p[i] = Math.min(r - i, p[mirror]);
        while (t[i + p[i] + 1] == t[i - p[i] - 1]) p[i]++;
        if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    return p;
}

String longestPalindromicSubstring(String s) {
    int[] p = manacher(s);
    int maxLen = 0, center = 0;
    for (int i = 0; i < p.length; i++) {
        if (p[i] > maxLen) { maxLen = p[i]; center = i; }
    }
    int start = (center - maxLen - 1) / 2;
    return s.substring(start, start + maxLen);
}

int countPalindromicSubstrings(String s) {
    int[] p = manacher(s);
    int count = 0;
    for (int i = 2; i < p.length - 2; i++) {
        if (i % 2 == 0) count += p[i] / 2;       // '#' center -> even-length
        else count += (p[i] + 1) / 2;             // char center -> odd-length
    }
    return count;
}
```

**Time:** O(n). Each expansion either fails immediately (O(1)) or extends `R` rightward (bounded by n total).
**Space:** O(n).

<AlgoViz
  title="Manacher's — Counting Palindromic Substrings in 'aaba'"
  description="Uses Manacher's p-array to count all palindromic substrings. Transform: '^#a#a#b#a#$'. Odd-index centers → odd-length palindromes, even-index → even-length."
  steps={[
    {
      array: [97, 97, 98, 97],
      labels: {"0": "a", "1": "a", "2": "b", "3": "a"},
      variables: {S: "aaba", transformed: "^#a#a#b#a#$", goal: "Count all palindromic substrings"},
      explanation: "S = 'aaba'. Transform: '^#a#a#b#a#$' (length 11). Compute p[i] = palindrome radius at each center. Then derive palindrome count from p-values.",
      code: "// transform + compute p-array"
    },
    {
      array: [0, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0],
      labels: {"0": "^", "1": "#", "2": "a", "3": "#", "4": "a", "5": "#", "6": "b", "7": "#", "8": "a", "9": "#", "10": "$"},
      highlights: [2, 4, 6, 8],
      variables: {p: "[0,0,1,2,1,0,1,0,1,0,0]"},
      explanation: "p-array computed: [0,0,1,2,1,0,1,0,1,0,0]. Character centers (odd i): p[2]=1('a'), p[4]=1('a'), p[6]=1('b'), p[8]=1('a'). Gap center (even i): p[3]=2.",
      code: "// p = [0,0,1,2,1,0,1,0,1,0,0]"
    },
    {
      array: [0, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0],
      highlights: [2],
      variables: {i: 2, type: "char center (odd i)", p_i: 1, palindromes: "(p[i]+1)/2 = 1", which: "'a'"},
      explanation: "i=2 (char 'a'): odd index → odd-length palindromes. Count = (p[2]+1)/2 = (1+1)/2 = 1. Palindrome: 'a' (the character itself).",
      code: "// odd i: count = (p[i]+1)/2 = 1"
    },
    {
      array: [0, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0],
      highlights: [3],
      variables: {i: 3, type: "gap center (even i)", p_i: 2, palindromes: "p[i]/2 = 1", which: "'aa'"},
      explanation: "i=3 (gap between positions 0,1): even index → even-length palindromes. Count = p[3]/2 = 2/2 = 1. Palindrome: 'aa'.",
      code: "// even i: count = p[i]/2 = 1"
    },
    {
      array: [0, 0, 1, 2, 1, 0, 1, 0, 1, 0, 0],
      highlights: [4],
      variables: {i: 4, type: "char center (odd i)", p_i: 1, count: "(1+1)/2 = 1", which: "'a' (second occurrence)"},
      explanation: "i=4 (char 'a'): count = 1. i=5 (gap): p=0, count=0. i=6 (char 'b'): count=1. i=7 (gap): p=0, count=0. i=8 (char 'a'): count=1.",
      code: "// remaining centers: 1+0+1+0+1 palindromes"
    },
    {
      array: [1, 1, 1, 1, 1],
      labels: {"0": "i=2: 'a'", "1": "i=3: 'aa'", "2": "i=4: 'a'", "3": "i=6: 'b'", "4": "i=8: 'a'"},
      highlights: [0, 1, 2, 3, 4],
      variables: {total: "1+1+1+1+1 = 5", all_palindromes: "'a','a','a','b','aa'", complexity: "O(n)"},
      explanation: "Total palindromic substrings: 5. They are: 'a'(pos 0), 'a'(pos 1), 'aa'(pos 0-1), 'b'(pos 2), 'a'(pos 3). Manacher's gives O(n) counting vs O(n²) expand-around-center.",
      code: "return count;  // 5 palindromic substrings"
    }
  ]}
/>

<AlgoViz
  title="Manacher's Algorithm — Finding Palindromes in 'abacaba'"
  description="Computes palindrome radii for S='abacaba'. Transform: '^#a#b#a#c#a#b#a#$'. Shows mirror optimization."
  steps={[
    {
      array: [97, 98, 97, 99, 97, 98, 97],
      labels: {"0": "a", "1": "b", "2": "a", "3": "c", "4": "a", "5": "b", "6": "a"},
      variables: {S: "abacaba", transformed: "^#a#b#a#c#a#b#a#$", C: 0, R: 0},
      explanation: "String S='abacaba'. Transform inserts # between chars with ^ and $ sentinels. We compute p[i] = palindrome radius at each position.",
      code: "// Transform: '^#a#b#a#c#a#b#a#$'"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      labels: {"0": "^", "1": "#", "2": "a", "3": "#", "4": "b", "5": "#", "6": "a", "7": "#", "8": "c", "9": "#", "10": "a", "11": "#", "12": "b", "13": "#", "14": "a", "15": "#", "16": "$"},
      highlights: [2],
      variables: {i: 2, "p[2]": 1, palindrome: "a", C: 2, R: 3},
      explanation: "i=2 (char 'a'): expand to check #a#. p[2]=1, meaning palindrome 'a' of radius 1. Update C=2, R=3.",
      code: "p[2] = 1;  // palindrome 'a'"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [4],
      variables: {i: 4, "p[4]": 3, palindrome: "aba", C: 4, R: 7},
      explanation: "i=4 (char 'b'): expand through #a#b#a#. p[4]=3, palindrome 'aba' of length 3. C=4, R=7.",
      code: "p[4] = 3;  // palindrome 'aba'"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [6],
      secondary: [2],
      variables: {i: 6, mirror: "2*4-6=2", "p[mirror]": 1, "R-i": 1, "p[6]": "min(p[2], R-i) = min(1,1) = 1"},
      explanation: "i=6 (char 'a'): i<R=7. Mirror = 2*4-6 = 2. p[mirror]=p[2]=1. R-i=1. p[6]=min(1,1)=1. Fits in Z-box — no expansion!",
      code: "p[6] = min(p[mirror], R-i) = 1  // mirror reuse!"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [8],
      variables: {i: 8, "p[8]": 7, palindrome: "abacaba", C: 8, R: 15},
      explanation: "i=8 (char 'c'): center of the full string. Expands all the way: #a#b#a#c#a#b#a#. p[8]=7. Palindrome 'abacaba'!",
      code: "p[8] = 7;  // palindrome 'abacaba' (full string)"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [10],
      secondary: [6],
      variables: {i: 10, mirror: "2*8-10=6", "p[6]": 1, "R-i": 5, "p[10]": "min(1, 5) = 1"},
      explanation: "i=10: i<R=15. Mirror=6, p[6]=1. Since 1<5 (R-i), palindrome fits inside — p[10]=1. No expansion needed!",
      code: "p[10] = min(p[6], R-i) = 1  // mirror reuse"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [12],
      secondary: [4],
      variables: {i: 12, mirror: "2*8-12=4", "p[4]": 3, "R-i": 3, "p[12]": "min(3, 3) = 3, then try expand beyond R"},
      explanation: "i=12: mirror=4, p[4]=3. R-i=3 so p[12]≥3, but need to check beyond R=15. T[16]='$'≠T[8-4-1]. p[12]=3.",
      code: "p[12] = 3;  // palindrome 'aba', can't expand past R"
    },
    {
      array: [0, 0, 1, 0, 3, 0, 1, 0, 7, 0, 1, 0, 3, 0, 1, 0, 0],
      highlights: [8],
      variables: {p: "[0,0,1,0,3,0,1,0,7,0,1,0,3,0,1,0,0]", longest: "'abacaba' (length 7, center i=8)", count: 11, complexity: "O(n)"},
      explanation: "Final p-array computed. Longest palindrome: 'abacaba' (p[8]=7). Total palindromic substrings: 11. Mirror reuse made it O(n)!",
      code: "// Max p[i]=7 → longest palindrome length 7"
    }
  ]}
/>

#### Why It Works

The mirror property ensures we never redo work. If the palindrome centered at `mirror` fits entirely within the palindrome centered at `C`, then `p[i] = p[mirror]` exactly. If it reaches the boundary `R`, we only need to try expanding beyond `R`, and each expansion moves `R` to the right — so total work across all positions is O(n).

---

### 4. Aho-Corasick (Introduction)

**Why this technique exists.** When you need to search for k patterns simultaneously, running KMP k times costs O(N*k + M). Aho-Corasick builds a single automaton from all patterns in O(M) time (where M is the total pattern length), then scans the text once in O(N + Z) time (where Z is the number of matches). It achieves this by combining a Trie of all patterns with KMP-style failure links, creating a finite automaton that processes each text character exactly once. This is the standard algorithm behind multi-keyword search engines, intrusion detection systems, and banned-word filters.

#### The Problem

Given `k` patterns `P₁, P₂, ..., Pₖ` with total length `M` and a text `T` of length `N`, find all occurrences of all patterns in `T`.

Naive approach: Run KMP for each pattern → O(N·k + M). Aho-Corasick does it in O(N + M + Z) where Z = number of matches.

#### How It Works

1. **Build a trie** of all patterns (O(M)).
2. **Add failure links:** Just like KMP's failure function, but on the trie. Each node's failure link points to the longest proper suffix of that node's string that is also a prefix of some pattern in the trie.
3. **Add output links:** Chain together all patterns that end at any node reachable via failure links — this allows reporting all matching patterns at each position in O(1) per match.
4. **Search:** Traverse the text character by character, following trie edges (and failure links on mismatch), and reporting matches via output links.

#### When to Use

- **Multiple pattern search** (e.g., banned words filter, multi-keyword highlighting).
- **In interviews:** Rarely asked to implement fully, but understanding the concept helps explain multi-pattern approaches.
- The concept of "failure links on a trie" appears in problems like **Stream of Characters (LC 1032)** and **Word Search II (LC 212)**, though those problems typically use simplified versions.

<AlgoViz
  title="Aho-Corasick — Multi-Pattern Search"
  description="Builds automaton for patterns {'he','she','his','hers'} and scans text 'ushers'. Shows trie + failure links."
  steps={[
    {
      array: [117, 115, 104, 101, 114, 115],
      labels: {"0": "u", "1": "s", "2": "h", "3": "e", "4": "r", "5": "s"},
      variables: {patterns: "['he','she','his','hers']", text: "ushers", phase: "Build trie"},
      explanation: "Patterns: {he, she, his, hers}. Text: 'ushers'. Step 1: build a trie of all patterns.",
      code: "// Insert: he, she, his, hers into trie"
    },
    {
      hashMap: [["root→h", "node1"], ["node1→e", "node2*"], ["node2→r", "node3"], ["node3→s", "node4*"], ["root→s", "node5"], ["node5→h", "node6"], ["node6→e", "node7*"], ["node1→i", "node8"], ["node8→s", "node9*"]],
      variables: {trie_nodes: 10, end_nodes: "he(2), hers(4), she(7), his(9)"},
      explanation: "Trie built. End nodes marked with *. Paths: h→e(*), h→e→r→s(*), s→h→e(*), h→i→s(*). Now add failure links.",
      code: "// Trie complete, now BFS for failure links"
    },
    {
      hashMap: [["node1(h)", "fail→root"], ["node2(he)", "fail→root"], ["node5(s)", "fail→root"], ["node6(sh)", "fail→node1(h)"], ["node7(she)", "fail→node2(he)"], ["node8(hi)", "fail→root"], ["node9(his)", "fail→node5(s)"]],
      variables: {phase: "Failure links computed via BFS", key_link: "sh→h, she→he"},
      explanation: "Failure links: sh fails to h (longest suffix that's a trie prefix). she fails to he. This is KMP on the trie! Enables pattern overlap detection.",
      code: "// BFS: fail[sh] = h, fail[she] = he"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      secondary: [0],
      variables: {i: 0, char: "u", state: "root", action: "No child 'u' at root. Stay at root."},
      explanation: "Scan text[0]='u'. Root has no 'u' child. Stay at root. No matches.",
      code: "// state = root, no match"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      highlights: [1],
      variables: {i: 1, char: "s", state: "node5(s)", action: "Follow root→s"},
      explanation: "text[1]='s'. Root has 's' child → move to node5(s). Not an end node. No match yet.",
      code: "state = trie[root]['s'];  // node5"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      highlights: [1, 2],
      variables: {i: 2, char: "h", state: "node6(sh)", action: "Follow s→h", fail_note: "fail[sh]=h(node1)"},
      explanation: "text[2]='h'. node5(s) has 'h' child → move to node6(sh). Not an end node. Failure link: sh→h.",
      code: "state = trie[node5]['h'];  // node6(sh)"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      highlights: [1, 2, 3],
      variables: {i: 3, char: "e", state: "node7(she*)", matches: "['she' at pos 1, 'he' at pos 2]"},
      explanation: "text[3]='e'. node6(sh)→node7(she*). MATCH: 'she' at position 1! Follow output link: fail[she]=he*, so also MATCH: 'he' at position 2!",
      code: "// Found 'she' at 1, 'he' at 2 via output link"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      highlights: [2, 3, 4, 5],
      variables: {i: "4-5", continuing: "state follows he→her→hers", matches_at_5: "'hers' at pos 2"},
      explanation: "text[4]='r': she→fail→he, he has 'r' child→her. text[5]='s': her→hers*. MATCH: 'hers' at position 2!",
      code: "// Found 'hers' at position 2"
    },
    {
      array: [117, 115, 104, 101, 114, 115],
      highlights: [1, 2, 3, 4, 5],
      variables: {all_matches: "she@1, he@2, hers@2", total_patterns: 4, found: 3, complexity: "O(N + M + Z)"},
      explanation: "Scan complete. Found: 'she' at 1, 'he' at 2, 'hers' at 2. Three matches found in single O(N) pass through text! Pattern 'his' not found.",
      code: "// O(N + M + Z) = O(6 + 11 + 3)"
    }
  ]}
/>

---

## Worked Example

### Suffix Array for "banana"

**Step 1: Initial ranking by first character**

```
Suffix     Index   Rank(k=1)
banana       0       'b' → 1
anana        1       'a' → 0
nana         2       'n' → 2
ana          3       'a' → 0
na           4       'n' → 2
a            5       'a' → 0
```

**Step 2: Sort by (rank, rank of suffix at i+1), k=1**

| Index | Pair (rank[i], rank[i+1]) | Sorted position |
|-------|---------------------------|-----------------|
| 5     | (0, -1)                   | 0               |
| 3     | (0, 2)                    | 1               |
| 1     | (0, 2)                    | 2               |
| 0     | (1, 0)                    | 3               |
| 4     | (2, 0)                    | 4               |
| 2     | (2, 0)                    | 5               |

SA after round 1: `[5, 3, 1, 0, 4, 2]`
New ranks: `[3, 1, 5, 1, 4, 0]` → Wait, tied pairs `(0,2)` at indices 3 and 1 get the same rank; tied `(2,0)` at indices 4 and 2 get the same rank.

Ranks: index 5→0, index 3→1, index 1→1, index 0→2, index 4→3, index 2→3.

**Step 3: Sort by (rank, rank of suffix at i+2), k=2**

| Index | Pair (rank[i], rank[i+2]) |
|-------|---------------------------|
| 5     | (0, -1)                   |
| 3     | (1, 3)                    |
| 1     | (1, 3)                    |
| 0     | (2, 1)                    |
| 4     | (3, -1)                   |
| 2     | (3, 1)                    |

Sorting: `[5, 3, 1, 0, 2, 4]` — but (1,3) ties between index 3 and 1.

**Step 4: Sort by (rank, rank of suffix at i+4), k=4**

After this round, index 1 (`anana`) and index 3 (`ana`) are distinguished because:
- Index 1: suffix at i+4 = index 5 with rank 0
- Index 3: suffix at i+4 = index 7 → out of bounds → -1

So index 3 < index 1 in this round.

**Final SA: `[5, 3, 1, 0, 4, 2]`**

**Step 5: LCP array using Kasai's algorithm**

Process suffixes in text order (i = 0, 1, 2, 3, 4, 5):

```
i=0 ("banana"), rank=3, prev in SA = sa[2]=1 ("anana")
  Compare "banana" and "anana": h=0 (b ≠ a), lcp[3]=0

i=1 ("anana"), rank=2, prev in SA = sa[1]=3 ("ana")
  Compare "anana" and "ana": h=0→1→2→3 (a=a, n=n, a=a, then n ≠ ∅)
  lcp[2]=3, h=3-1=2

i=2 ("nana"), rank=5, prev in SA = sa[4]=4 ("na")
  Compare "nana" and "na" starting at h=2: (position 4 vs 6: 'n' ≠ ∅)
  lcp[5]=2, h=2-1=1

i=3 ("ana"), rank=1, prev in SA = sa[0]=5 ("a")
  Compare "ana" and "a" starting at h=1: (position 4 vs 6: ∅)
  lcp[1]=1, h=1-1=0

i=4 ("na"), rank=4, prev in SA = sa[3]=0 ("banana")
  Compare "na" and "banana" starting at h=0: n ≠ b
  lcp[4]=0, h=0

i=5 ("a"), rank=0, skip (no predecessor)
```

**LCP array:** `[-, 1, 3, 0, 0, 2]`

**Finding the longest repeated substring:** `max(lcp) = 3`, occurring at rank 2. The substring is `s[sa[2]:sa[2]+3] = s[1:4] = "ana"`.

Indeed, `"ana"` appears at positions 1 and 3 in `"banana"`. ✓

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "autocomplete" or "prefix search" | Trie | Walk to the prefix node, then DFS to enumerate all completions in O(output) |
| "word break" or "segment into dictionary words" | Trie + DP/BFS | At each position, Trie edges reveal all dictionary words starting here |
| "maximum XOR of two numbers" | Bitwise Trie | Greedy bit-by-bit decisions in O(32) per query by always taking opposite bits |
| "find all words on a board" | Trie + backtracking | Simultaneous board DFS and Trie traversal prunes dead-end paths early |
| "longest palindromic substring" | Manacher's algorithm | O(n) by exploiting palindrome mirror symmetry; avoids O(n^2) expand-around-center |
| "count all palindromic substrings" | Manacher's with parity logic | Each radius value encodes the count of palindromes centered at that position |
| "longest repeated substring" | Suffix Array + LCP | Maximum LCP value gives the answer directly after O(n log^2 n) construction |
| "count distinct substrings" | Suffix Array + LCP | Formula `n*(n+1)/2 - sum(lcp)` eliminates duplicates counted by shared prefixes |
| "longest common substring of two strings" | Suffix Array on concatenation | Concatenate `A + "$" + B`, build SA+LCP, find max LCP crossing the boundary |
| "stream of characters, match any word ending here" | Reversed Trie / Aho-Corasick | Insert reversed words; check if the recent stream suffix matches any word |
| "search for multiple patterns simultaneously" | Aho-Corasick automaton | Single O(N) text scan finds all k pattern matches via Trie + failure links |
| "XOR pairs within a numeric range" | Bitwise Trie with subtree counts | Subtree sizes enable range counting by decomposing the range into bit-prefix groups |

---

## Pattern Recognition

| Cue in Problem Statement | Technique |
|--------------------------|-----------|
| "Words with common prefix" / "autocomplete" / "prefix search" | Trie |
| "Word break" / "word dictionary matching" | Trie + DP or BFS |
| "Maximum XOR" / "bitwise optimization" | Bitwise Trie (insert numbers bit-by-bit) |
| "All palindromic substrings" / "longest palindromic substring" | Manacher's Algorithm |
| "Count palindromic substrings" | Manacher's — sum radii with parity logic |
| "Longest repeated substring" / "longest common substring" | Suffix Array + LCP |
| "Count distinct substrings" | Suffix Array + LCP: `n(n+1)/2 - sum(lcp)` |
| "Multiple pattern search simultaneously" | Aho-Corasick (or Trie + failure links) |
| "Stream of characters — match any word ending here" | Reversed Trie or Aho-Corasick |

---

## Practice Problems

### Day 1–2: Trie Mastery (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Implement Trie (Prefix Tree) | Medium | Standard Trie with insert/search/startsWith | [LC 208](https://leetcode.com/problems/implement-trie-prefix-tree/) |
| 2 | Design Add and Search Words Data Structure | Medium | Trie with wildcard DFS — '.' matches any child | [LC 211](https://leetcode.com/problems/design-add-and-search-words-data-structure/) |
| 3 | Word Search II | Hard | Trie of all words + board DFS backtracking — prune trie nodes after finding words | [LC 212](https://leetcode.com/problems/word-search-ii/) |
| 4 | Maximum XOR of Two Numbers in an Array | Medium | Bitwise Trie — insert all, query each for max XOR | [LC 421](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) |
| 5 | Replace Words | Medium | Trie of roots — for each word, find shortest matching prefix | [LC 648](https://leetcode.com/problems/replace-words/) |
| 6 | Map Sum Pairs | Medium | Trie with value stored at each node — prefix sum query | [LC 677](https://leetcode.com/problems/map-sum-pairs/) |

### Day 3–4: Palindromes & Word Break (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Longest Palindromic Substring | Medium | Manacher's for O(n), or expand-around-center for O(n²) | [LC 5](https://leetcode.com/problems/longest-palindromic-substring/) |
| 8 | Palindromic Substrings | Medium | Manacher's to count all palindromic substrings in O(n) | [LC 647](https://leetcode.com/problems/palindromic-substrings/) |
| 9 | Longest Palindromic Subsequence | Medium | DP — `dp[i][j] = LPS of s[i..j]`; not Manacher's (subsequence ≠ substring) | [LC 516](https://leetcode.com/problems/longest-palindromic-subsequence/) |
| 10 | Word Break | Medium | Trie + BFS/DP — at each position, traverse trie to find valid words | [LC 139](https://leetcode.com/problems/word-break/) |
| 11 | Word Break II | Hard | Trie + backtracking/memoization — enumerate all valid segmentations | [LC 140](https://leetcode.com/problems/word-break-ii/) |
| 12 | Concatenated Words | Hard | Trie + DP — each word checked if it's a concatenation of other words in the trie | [LC 472](https://leetcode.com/problems/concatenated-words/) |
| 13 | Stream of Characters | Hard | Reversed Trie — insert reversed words, match incoming stream suffix | [LC 1032](https://leetcode.com/problems/stream-of-characters/) |
| 14 | Palindrome Pairs | Hard | Trie of reversed words — for each word, check prefix/suffix palindrome splits | [LC 336](https://leetcode.com/problems/palindrome-pairs/) |

### Day 5–7: Advanced — XOR, Suffix, & Competition (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Maximum XOR With an Element From Array | Hard | Offline queries + sorted insert into Bitwise Trie | [LC 1707](https://leetcode.com/problems/maximum-xor-with-an-element-from-array/) |
| 16 | Count Pairs With XOR in a Range | Hard | Bitwise Trie with subtree counts — range query via two prefix counts | [LC 1803](https://leetcode.com/problems/count-pairs-with-xor-in-a-range/) |
| 17 | Longest Duplicate Substring | Hard | Suffix Array + LCP (or binary search + rolling hash from Week 14) | [LC 1044](https://leetcode.com/problems/longest-duplicate-substring/) |
| 18 | Distinct Substrings (suffix array) | Hard | Suffix Array + LCP: answer = `n(n+1)/2 - sum(lcp)` | [Practice](https://www.spoj.com/problems/DISUBSTR/) |
| 19 | Number of Distinct Substrings in a String | Hard | Same as above — suffix array approach or rolling hash with set | [LC Premium](https://leetcode.com/problems/number-of-distinct-substrings-in-a-string/) |
| 20 | Count Different Palindromic Subsequences | Hard | DP with careful deduplication — `dp[i][j]` with character-based recursion | [LC 730](https://leetcode.com/problems/count-different-palindromic-subsequences/) |
| 21 | Sum of Prefix Scores of Strings | Hard | Trie with pass-through counts — each node stores how many words pass through it | [LC 2416](https://leetcode.com/problems/sum-of-prefix-scores-of-strings/) |

---

## Mock Interview

### Problem 1: Word Search II (LC 212)

**Interviewer:** *"Given an m×n board of characters and a list of words, find all words that can be formed by sequentially adjacent cells (horizontally or vertically). Each cell may only be used once per word."*

**Candidate Approach — Trie + Backtracking:**

"I build a Trie of all target words. Then for each cell on the board, I start a DFS that simultaneously traverses the board and the trie. If the current trie node has no children matching the next board character, I prune. When I reach a node where `is_end = True`, I record the word.

A critical optimization: after finding a word, I remove it from the trie (decrement child counts and prune leaf nodes) to avoid redundant searches."

```java
import java.util.*;

List<String> findWords(char[][] board, String[] words) {
    Map<Character, Object> root = new HashMap<>();
    for (String word : words) {
        Map<Character, Object> node = root;
        for (char ch : word.toCharArray()) {
            node = (Map<Character, Object>) node.computeIfAbsent(ch, k -> new HashMap<>());
        }
        node.put('#', word);  // store complete word at terminal
    }

    int m = board.length, n = board[0].length;
    List<String> result = new ArrayList<>();
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};

    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (root.containsKey(board[i][j])) {
                dfs(board, i, j, root, result, dirs, m, n);
            }
        }
    }
    return result;
}

@SuppressWarnings("unchecked")
void dfs(char[][] board, int r, int c, Map<Character, Object> parent,
         List<String> result, int[][] dirs, int m, int n) {
    char ch = board[r][c];
    Map<Character, Object> node = (Map<Character, Object>) parent.get(ch);

    if (node.containsKey('#')) {
        result.add((String) node.remove('#'));
    }

    board[r][c] = '.';  // mark visited
    for (int[] d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < m && nc >= 0 && nc < n && node.containsKey(board[nr][nc])) {
            dfs(board, nr, nc, node, result, dirs, m, n);
        }
    }
    board[r][c] = ch;  // restore

    if (node.isEmpty()) parent.remove(ch);  // prune empty trie branches
}
```

**Follow-up 1:** *"What's the time complexity?"*

"Building the trie is O(total characters in words). The DFS explores at most `m·n·4^L` paths where `L` is max word length, but trie pruning makes it much faster in practice. Worst case is O(m·n·4^L) but amortized across all words with pruning it's closer to O(m·n·3^L) since we don't revisit the cell we came from."

**Follow-up 2:** *"How does the trie pruning help?"*

"Once a word is found, its terminal marker is removed. If that makes a branch empty (no remaining words share that prefix), we delete the entire branch. This means subsequent DFS calls skip prefixes that can no longer lead to unfound words — a significant speedup when many words share prefixes."

**Follow-up 3:** *"What if the word list is very large (100k+ words) but the board is small?"*

"The trie still helps because we only explore paths that exist in both the board and the trie simultaneously. With a small board, the number of possible paths is limited. We could also bound DFS depth by the longest word length."

---

### Problem 2: Palindromic Substrings (LC 647)

**Interviewer:** *"Count the number of palindromic substrings in a given string."*

**Candidate — Three Approaches:**

**Approach A — Expand Around Center (O(n²)):**

"For each of the `2n-1` centers (n odd centers, n-1 even centers), expand outward while characters match. Count each valid expansion."

```java
int countSubstringsExpand(String s) {
    int n = s.length(), count = 0;
    for (int center = 0; center < 2 * n - 1; center++) {
        int left = center / 2;
        int right = left + (center % 2);
        while (left >= 0 && right < n && s.charAt(left) == s.charAt(right)) {
            count++;
            left--;
            right++;
        }
    }
    return count;
}
```

**Approach B — DP (O(n²) time, O(n²) space):**

"`dp[i][j] = True` if `s[i..j]` is a palindrome. Fill diagonally."

**Approach C — Manacher's (O(n)):**

"Use Manacher's algorithm to compute the palindrome radius `p[i]` at each position in the transformed string. Each radius `p[i]` at an odd index (original character center) contributes `(p[i] + 1) // 2` palindromes. Each radius at an even index (gap center) contributes `p[i] // 2` palindromes."

```java
int countSubstringsManacher(String s) {
    StringBuilder sb = new StringBuilder("^#");
    for (int i = 0; i < s.length(); i++) {
        if (i > 0) sb.append('#');
        sb.append(s.charAt(i));
    }
    sb.append("#$");
    char[] t = sb.toString().toCharArray();
    int n = t.length;
    int[] p = new int[n];
    int c = 0, r = 0;
    for (int i = 1; i < n - 1; i++) {
        if (i < r) p[i] = Math.min(r - i, p[2 * c - i]);
        while (t[i + p[i] + 1] == t[i - p[i] - 1]) p[i]++;
        if (i + p[i] > r) { c = i; r = i + p[i]; }
    }

    int count = 0;
    for (int i = 2; i < n - 2; i++) {
        if (i % 2 == 1) count += (p[i] + 1) / 2;  // original character
        else count += p[i] / 2;                     // gap between characters
    }
    return count;
}
```

**Follow-up 1:** *"When would you use each approach?"*

"Expand-around-center is simplest and works well for interviews — O(n²) is acceptable for n ≤ 10^4. Manacher's is necessary when n ≤ 10^6 or when you need to count palindromes as a subroutine in a larger algorithm. I'd avoid the DP approach since it uses O(n²) space for no benefit over expand-around-center."

**Follow-up 2:** *"How would you find the longest palindromic substring instead?"*

"Track the maximum `p[i]` during Manacher's. Convert the center index back to the original string: `start = (center - max_radius - 1) // 2`, `length = max_radius`."

**Follow-up 3:** *"What about counting distinct palindromic substrings?"*

"Manacher's gives counts including duplicates. For distinct palindromes, combine Manacher's with hashing (Eertree / palindromic tree is the optimal structure, but suffix array + LCP can also work by filtering palindromic suffixes)."

---

## Tips & Pitfalls

### Trie Memory Optimization
- **HashMap children** (as shown above): Flexible, works for any alphabet. Each node carries HashMap overhead.
- **Array children** (`new TrieNode[26]` for lowercase English): Faster access (O(1) per child lookup) but wastes memory for sparse tries.
- **Rule of thumb:** Use arrays for competitive programming (speed matters), HashMaps for interviews (cleaner code), and compressed/Patricia tries for production systems with long shared prefixes.

### Suffix Array vs Suffix Tree Trade-offs
- **Suffix Array:** O(n log² n) or O(n) to build, O(n) space (just an array of integers). Harder to use for some queries (need LCP array and additional data structures like sparse tables for range-minimum queries).
- **Suffix Tree:** O(n) to build (Ukkonen's algorithm), O(n) space but with large constants (each node has multiple fields). Directly supports many queries (substring search, LCA for LCP, etc.) but is complex to implement correctly.
- **In interviews:** Suffix arrays are preferred — they're simpler to implement, explain, and debug. Mention suffix trees as the "theoretical optimal" but implement the array version.

### Manacher Transform Pitfalls
- The sentinel characters `^` (start) and `$` (end) must be distinct and not appear in the input — they prevent out-of-bounds comparisons in the expand loop.
- The `#` character transforms the string so that every palindrome has odd length in the transformed string. Without it, you'd need separate passes for odd-length and even-length palindromes.
- When converting back: center `i` in transformed string `"^#a#b#c#$"` maps to original index `(i - 2) // 2` for character positions (odd `i`) and gap positions (even `i`).

### When Aho-Corasick Beats Individual KMP
- **k patterns, total length M, text length N:**
  - k separate KMP runs: O(N·k + M)
  - Aho-Corasick: O(N + M + Z) where Z = number of matches
- Aho-Corasick wins decisively when `k` is large (hundreds or thousands of patterns). For 2-3 patterns, individual KMP is simpler and has less overhead.
- In interview problems, Aho-Corasick is rarely required explicitly, but the concept of "failure links on a trie" appears in **Stream of Characters (LC 1032)** — building a trie of reversed words and matching the incoming character stream is equivalent to a simplified Aho-Corasick automaton.
