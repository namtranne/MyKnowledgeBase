---
sidebar_position: 10
title: "Week 9: DP on Subsequences"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 9: DP on Subsequences

Subsequence DP is one of the most versatile and frequently tested families of dynamic programming. Unlike subarray problems (contiguous), subsequences allow gaps — which makes the state space richer and the recurrences more nuanced. This week covers the four pillars: **LIS**, **LCS**, **Edit Distance**, and the **space-optimization** techniques that tie them together.

**Why this family of techniques exists.** Subsequences are everywhere in real applications: version control (longest common subsequence for diff), bioinformatics (DNA sequence alignment via edit distance), and autocomplete systems (longest increasing subsequence for ranking). The brute-force approach to any subsequence problem requires examining all 2^n subsequences, which is exponential and completely impractical. DP reduces this by recognizing that subsequence problems have **optimal substructure** (the best answer for the first i elements can be built from the best answer for fewer elements) and **overlapping subproblems** (the same sub-states are revisited many times). This reduces exponential enumeration to polynomial-time table filling.

**Interview signals.** Any problem that mentions "subsequence" (not "subarray" or "substring" — those are contiguous) should trigger subsequence DP thinking. Specifically: "longest increasing/decreasing subsequence," "longest common subsequence," "edit distance / minimum operations to transform," "palindromic subsequence," "number of distinct subsequences," "interleaving strings," "wildcard/regex matching," or "Russian doll envelopes." If the problem says "subarray" or "substring," use sliding window or Kadane's instead.

**Common mistakes beginners make.** (1) Confusing "subsequence" (gaps allowed) with "subarray" (contiguous) — they lead to completely different algorithms. (2) For LIS, assuming the `tails` array is the actual LIS — it gives the correct length but is not a valid subsequence of the original array. (3) Using lower-bound search when the problem needs upper-bound (strict vs non-strict increasing). (4) Forgetting that space-optimized DP (two-row rolling array) loses the ability to reconstruct the solution.

---

## Core Theory

### 1. Longest Increasing Subsequence (LIS)

**Problem:** Given an array `nums`, find the length of the longest strictly increasing subsequence.

#### O(n²) DP

**When to use this template.** Reach for the O(n^2) LIS DP when n is small (roughly up to 2,500) or when you need to reconstruct the actual subsequence, since the `dp` array directly stores predecessor information at each index. This version is also easier to adapt for variants like counting the number of LIS (LC 673) or finding the largest divisible subset (LC 368), where you need per-index state beyond just the length.

Define `dp[i]` = length of the LIS ending at index `i`.

**Recurrence:**

$$
dp[i] = 1 + \max_{j < i,\; nums[j] < nums[i]} dp[j]
$$

```java
import java.util.*;

static int lisQuadratic(int[] nums) {
    int n = nums.length;
    if (n == 0) return 0;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    int best = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (nums[j] < nums[i])
                dp[i] = Math.max(dp[i], dp[j] + 1);
        best = Math.max(best, dp[i]);
    }
    return best;
}
```

<AlgoViz title="LIS — O(n²) DP Array Filling" description="nums=[10,9,2,5,3,7,101,18]. dp[i] = length of LIS ending at index i. Labels show the original values." steps={[
  { array: [1, 1, 1, 1, 1, 1, 1, 1], highlights: [], labels: {"0":"10","1":"9","2":"2","3":"5","4":"3","5":"7","6":"101","7":"18"}, variables: { phase: "Init" }, explanation: "Initialize dp[i]=1 for all i. Every single element is a valid subsequence of length 1.", code: "Arrays.fill(dp, 1);" },
  { array: [1, 1, 1, 1, 1, 1, 1, 1], highlights: [0, 1, 2], variables: { i: "0,1,2", result: "no updates" }, explanation: "i=0: no j<0. i=1: nums[0]=10 > 9, skip. i=2: 10>2 and 9>2, skip. No smaller predecessors found.", code: "if (nums[j] < nums[i]) dp[i] = max(dp[i], dp[j]+1);" },
  { array: [1, 1, 1, 2, 1, 1, 1, 1], highlights: [3], secondary: [2], variables: { i: "3", best_j: "j=2 (2<5)" }, explanation: "i=3 (val=5): nums[2]=2 < 5 → dp[3]=max(1, dp[2]+1)=2. LIS ending here: [2, 5].", code: "dp[3] = Math.max(dp[3], dp[2]+1); // 2" },
  { array: [1, 1, 1, 2, 2, 1, 1, 1], highlights: [4], secondary: [2], variables: { i: "4", best_j: "j=2 (2<3)" }, explanation: "i=4 (val=3): nums[2]=2 < 3 → dp[4]=max(1, dp[2]+1)=2. LIS ending here: [2, 3].", code: "dp[4] = Math.max(dp[4], dp[2]+1); // 2" },
  { array: [1, 1, 1, 2, 2, 3, 1, 1], highlights: [5], secondary: [3], variables: { i: "5", best_j: "j=3 (5<7)" }, explanation: "i=5 (val=7): checks j=2→2, j=3→dp[3]+1=3, j=4→dp[4]+1=3. Best=3. LIS: [2, 5, 7].", code: "dp[5] = Math.max(dp[5], dp[3]+1); // 3" },
  { array: [1, 1, 1, 2, 2, 3, 4, 1], highlights: [6], secondary: [5], variables: { i: "6", best_j: "j=5 (7<101)" }, explanation: "i=6 (val=101): all nums[j]<101. Best from j=5: dp[5]+1=4. LIS: [2, 5, 7, 101].", code: "dp[6] = Math.max(dp[6], dp[5]+1); // 4" },
  { array: [1, 1, 1, 2, 2, 3, 4, 4], highlights: [7], secondary: [5], variables: { i: "7", best_j: "j=5 (7<18)" }, explanation: "i=7 (val=18): 7<18 → dp[5]+1=4, but 101>18 skip. dp[7]=4. LIS: [2, 5, 7, 18].", code: "dp[7] = Math.max(dp[7], dp[5]+1); // 4" },
  { array: [1, 1, 1, 2, 2, 3, 4, 4], highlights: [6, 7], variables: { answer: "max(dp) = 4", LIS: "[2,5,7,101] or [2,3,7,18]" }, explanation: "LIS length = max(dp) = 4. Multiple valid LIS exist: [2,5,7,101], [2,3,7,101], [2,5,7,18], [2,3,7,18].", code: "return best; // 4" }
]} />

#### O(n log n) with Patience Sorting

**When to use this template.** Use the O(n log n) patience sorting approach when n is large (up to 10^5 or beyond) and you need the LIS length efficiently. This is the default for most interview and competitive programming settings where O(n^2) would time out. If you also need the actual subsequence, combine this with parent-pointer reconstruction as shown below.

Maintain a `tails` array where `tails[k]` is the smallest tail element of any increasing subsequence of length `k+1` found so far. For each element, binary-search `tails` to find where it fits.

**Key insight:** `tails` is always sorted, so binary search is valid.

```java
static int lisNlogN(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int x : nums) {
        int pos = Collections.binarySearch(tails, x);
        if (pos < 0) pos = -(pos + 1); // insertion point
        if (pos == tails.size()) tails.add(x);
        else tails.set(pos, x);
    }
    return tails.size();
}
```

<AlgoViz title="LIS — O(n log n) Patience Sorting" description="Processing [3, 1, 4, 1, 5, 9]. Tails array maintains smallest possible ending for each subsequence length." steps={[
  { array: [3], highlights: [0], variables: { element: "3", action: "append", pos: "0" }, explanation: "Process 3: tails is empty, append 3. Tails = [3], LIS length = 1.", code: "if (pos == tails.size()) tails.add(x);" },
  { array: [1], highlights: [0], variables: { element: "1", action: "replace [0]", pos: "0" }, explanation: "Process 1: binarySearch finds pos=0 (1 < 3). Replace tails[0]=3 with 1. Keeps door open for longer sequences.", code: "tails.set(0, 1); // 1 < 3, smaller tail" },
  { array: [1, 4], highlights: [1], variables: { element: "4", action: "append", pos: "1" }, explanation: "Process 4: pos=1 equals size. Append 4. LIS length grows to 2.", code: "tails.add(4); // extends longest" },
  { array: [1, 4], highlights: [0], variables: { element: "1", action: "replace [0] (same)", pos: "0" }, explanation: "Process 1 again: pos=0. Replace tails[0]=1 with 1 — no actual change.", code: "tails.set(0, 1); // same value, no-op" },
  { array: [1, 4, 5], highlights: [2], variables: { element: "5", action: "append", pos: "2" }, explanation: "Process 5: pos=2 equals size. Append 5. LIS length = 3.", code: "tails.add(5);" },
  { array: [1, 4, 5, 9], highlights: [3], variables: { element: "9", action: "append", pos: "3" }, explanation: "Process 9: pos=3 equals size. Append 9. LIS length = 4.", code: "tails.add(9);" },
  { array: [1, 4, 5, 9], highlights: [0, 1, 2, 3], variables: { result: "LIS length = 4" }, explanation: "Final tails = [1,4,5,9], length = 4. Here tails IS a valid LIS, but that is not always the case.", code: "return tails.size(); // 4" }
]} />

**Why this works:** Each element either extends the longest subsequence found so far (`pos == tails.size()`) or replaces an existing tail to keep the door open for longer subsequences later. The `tails` list is **not** the actual LIS — it represents the best possible tails at each length.

To reconstruct the actual LIS, track parent pointers alongside the tails array:

```java
static List<Integer> lisReconstruct(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    List<Integer> indices = new ArrayList<>(); // indices[k] = index in nums of current tails[k]
    int[] parent = new int[nums.length];
    Arrays.fill(parent, -1);

    for (int i = 0; i < nums.length; i++) {
        int pos = Collections.binarySearch(tails, nums[i]);
        if (pos < 0) pos = -(pos + 1);
        if (pos == tails.size()) { tails.add(nums[i]); indices.add(i); }
        else { tails.set(pos, nums[i]); indices.set(pos, i); }
        parent[i] = pos > 0 ? indices.get(pos - 1) : -1;
    }

    // Backtrack from the last element of the LIS
    LinkedList<Integer> result = new LinkedList<>();
    int k = indices.get(tails.size() - 1);
    while (k != -1) { result.addFirst(nums[k]); k = parent[k]; }
    return result;
}
```

---

### 2. Longest Common Subsequence (LCS)

**Problem:** Given two strings `text1` and `text2`, find the length of their longest common subsequence.

#### O(nm) DP Matrix

**When to use this template.** Use the full 2D LCS matrix whenever you have two sequences and need to find their longest shared subsequence. This is the baseline approach and is necessary whenever you need to reconstruct the actual LCS string by backtracking through the table. For problems that only need the LCS length and memory is tight, switch to the space-optimized version below.

Define `dp[i][j]` = LCS of `text1[:i]` and `text2[:j]`.

**Recurrence:**

$$
dp[i][j] = \begin{cases}
dp[i-1][j-1] + 1 & \text{if } text1[i-1] = text2[j-1] \\
\max(dp[i-1][j],\; dp[i][j-1]) & \text{otherwise}
\end{cases}
$$

```java
static int lcs(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = text1.charAt(i - 1) == text2.charAt(j - 1)
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n];
}
```

<AlgoViz title="LCS — DP Table Filling" description="text1='ACE', text2='ABCDE'. Building dp[i][j] = LCS length of text1[:i] and text2[:j]." steps={[
  { array: [0, 0, 0, 0, 0, 0], highlights: [], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { row: "i=0 (empty string)" }, explanation: "Initialize: dp[0][j]=0 for all j. Empty prefix of text1 has LCS length 0 with any prefix of text2.", code: "int[][] dp = new int[m+1][n+1];" },
  { array: [0, 1, 1, 1, 1, 1], highlights: [1], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { row: "i=1 (A)", match: "A=A at j=1" }, explanation: "Row 1 (char 'A'): A matches text2[0]='A' at j=1. dp[1][1]=dp[0][0]+1=1. Rest carry forward as 1.", code: "dp[1][1] = dp[0][0] + 1; // match" },
  { array: [0, 1, 1, 2, 2, 2], highlights: [3], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { row: "i=2 (C)", match: "C=C at j=3" }, explanation: "Row 2 (char 'C'): C matches text2[2]='C' at j=3. dp[2][3]=dp[1][2]+1=2. LCS so far: 'AC'.", code: "dp[2][3] = dp[1][2] + 1; // LCS='AC'" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [5], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { row: "i=3 (E)", match: "E=E at j=5" }, explanation: "Row 3 (char 'E'): E matches text2[4]='E' at j=5. dp[3][5]=dp[2][4]+1=3. LCS length = 3!", code: "dp[3][5] = dp[2][4] + 1; // LCS='ACE'" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [5], variables: { answer: "dp[3][5] = 3", phase: "backtrack" }, explanation: "Table complete. LCS length = dp[m][n] = 3. Backtrack from dp[3][5] to reconstruct the LCS string.", code: "int i = m, j = n;" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [5], secondary: [3], variables: { step: "(3,5): E=E, diagonal", lcs: "...E" }, explanation: "Backtrack: (3,5): text1[2]='E' equals text2[4]='E'. Match! Add 'E', move diagonally to (2,4).", code: "result.append('E'); i--; j--;" },
  { array: [0, 1, 1, 2, 2, 2], highlights: [3], variables: { step: "(2,3): C=C, diagonal", lcs: "...CE" }, explanation: "Backtrack: (2,4) C!=D, move left to (2,3). C=C — match! Add 'C', move to (1,2).", code: "result.append('C'); i--; j--;" },
  { array: [0, 1, 1, 1, 1, 1], highlights: [1], variables: { step: "(1,1): A=A, diagonal", lcs: "ACE" }, explanation: "Backtrack: (1,2) A!=B, move left to (1,1). A=A — match! Add 'A'. LCS = reverse('ECA') = 'ACE'.", code: "return 'ACE'; // LCS reconstructed" }
]} />

#### Space Optimization to O(min(n, m))

Each row only depends on the previous row, so we keep two rows (or even one row with a temp variable for the diagonal).

```java
static int lcsOptimized(String text1, String text2) {
    if (text1.length() < text2.length()) { String tmp = text1; text1 = text2; text2 = tmp; }
    int m = text1.length(), n = text2.length();
    int[] prev = new int[n + 1];
    for (int i = 1; i <= m; i++) {
        int[] curr = new int[n + 1];
        for (int j = 1; j <= n; j++)
            curr[j] = text1.charAt(i - 1) == text2.charAt(j - 1)
                ? prev[j - 1] + 1
                : Math.max(prev[j], curr[j - 1]);
        prev = curr;
    }
    return prev[n];
}
```

<AlgoViz title="Space-Optimized LCS — 2-Row Rolling Array" description="text1='ACE', text2='ABCDE'. Only prev and curr rows kept in memory. After each row, prev = curr." steps={[
  { array: [0, 0, 0, 0, 0, 0], highlights: [], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { phase: "Init", row: "prev = dp[0]" }, explanation: "Initialize prev = [0,0,0,0,0,0]. Row 0: LCS of empty prefix with any prefix of ABCDE is 0.", code: "int[] prev = new int[n + 1];" },
  { array: [0, 1, 1, 1, 1, 1], highlights: [1], array2: [0, 0, 0, 0, 0, 0], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { i: "1 (A)", match: "A=A at j=1" }, explanation: "Build curr for char 'A'. Match A=A at j=1: curr[1]=prev[0]+1=1. Remaining j values carry 1 forward.", code: "curr[1] = prev[0] + 1; // match" },
  { array: [0, 1, 1, 2, 2, 2], highlights: [3], array2: [0, 1, 1, 1, 1, 1], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { i: "2 (C)", match: "C=C at j=3" }, explanation: "After swap, prev=[0,1,1,1,1,1]. Build curr for 'C'. Match at j=3: curr[3]=prev[2]+1=2.", code: "curr[3] = prev[2] + 1; // LCS='AC'" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [5], array2: [0, 1, 1, 2, 2, 2], labels: {"0":"''","1":"A","2":"B","3":"C","4":"D","5":"E"}, variables: { i: "3 (E)", match: "E=E at j=5" }, explanation: "After swap, prev=[0,1,1,2,2,2]. Build curr for 'E'. Match at j=5: curr[5]=prev[4]+1=3.", code: "curr[5] = prev[4] + 1; // LCS='ACE'" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [5], variables: { answer: "prev[n] = 3", space: "O(n) instead of O(mn)" }, explanation: "Final swap: prev=[0,1,1,2,2,3]. Answer: prev[5]=3. Used 2 arrays of size 6 instead of a full 4x6 table.", code: "return prev[n]; // 3" },
  { array: [0, 1, 1, 2, 2, 3], highlights: [1, 3, 5], variables: { tradeoff: "No backtracking possible" }, explanation: "Space O(n) vs O(mn), but we cannot reconstruct the LCS string — no full table to backtrack through.", code: "// Use Hirschberg's algorithm for O(n) space + reconstruction" }
]} />

#### Reconstructing the LCS

After filling the full DP table, backtrack from `dp[m][n]`:

```java
static String lcsWithString(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = text1.charAt(i - 1) == text2.charAt(j - 1)
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);

    StringBuilder result = new StringBuilder();
    int i = m, j = n;
    while (i > 0 && j > 0) {
        if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
            result.append(text1.charAt(i - 1));
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
        else j--;
    }
    return result.reverse().toString();
}
```

<AlgoViz title="Longest Palindromic Subsequence — LCS(s, reverse(s))" description="s='bbbab'. LPS = LCS('bbbab', 'babbb'). Each row processes one char of s against reverse(s)." steps={[
  { array: [0, 0, 0, 0, 0, 0], highlights: [], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { row: "i=0 (empty)", rev: "babbb" }, explanation: "Base row: LCS of empty prefix of s with any prefix of reverse(s)='babbb' is 0.", code: "int[][] dp = new int[m+1][n+1];" },
  { array: [0, 1, 1, 1, 1, 1], highlights: [1], array2: [0, 0, 0, 0, 0, 0], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { i: "1 (b)", match: "b=b at j=1" }, explanation: "Row 1 (char 'b'): matches rev[0]='b' at j=1. dp[1][1]=dp[0][0]+1=1. Values carry forward.", code: "dp[1][1] = dp[0][0] + 1; // first match" },
  { array: [0, 1, 1, 2, 2, 2], highlights: [3], array2: [0, 1, 1, 1, 1, 1], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { i: "2 (b)", match: "b=b at j=3" }, explanation: "Row 2 ('b'): best new match at j=3, dp[2][3]=dp[1][2]+1=2. Palindromic subsequence so far: 'bb'.", code: "dp[2][3] = dp[1][2] + 1; // 'bb'" },
  { array: [0, 1, 1, 2, 3, 3], highlights: [4], array2: [0, 1, 1, 2, 2, 2], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { i: "3 (b)", match: "b=b at j=4" }, explanation: "Row 3 ('b'): match at j=4, dp[3][4]=dp[2][3]+1=3. Palindromic subsequence: 'bbb'.", code: "dp[3][4] = dp[2][3] + 1; // 'bbb'" },
  { array: [0, 1, 2, 2, 3, 3], highlights: [2], array2: [0, 1, 1, 2, 3, 3], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { i: "4 (a)", match: "a=a at j=2" }, explanation: "Row 4 ('a'): match at j=2, dp[4][2]=dp[3][1]+1=2. But dp[4][4]=max(3,3)=3. 'a' doesn't extend the best.", code: "dp[4][2] = dp[3][1] + 1; // 'ba' palindrome" },
  { array: [0, 1, 2, 3, 3, 4], highlights: [5], array2: [0, 1, 2, 2, 3, 3], labels: {"0":"''","1":"b","2":"a","3":"b","4":"b","5":"b"}, variables: { i: "5 (b)", match: "b=b at j=5" }, explanation: "Row 5 ('b'): match at j=5, dp[5][5]=dp[4][4]+1=4. LPS length = 4!", code: "dp[5][5] = dp[4][4] + 1; // 'bbbb'" },
  { array: [0, 1, 2, 3, 3, 4], highlights: [5], variables: { answer: "LPS = 4", subsequence: "bbbb", minInsertions: "n - LPS = 5 - 4 = 1" }, explanation: "LPS('bbbab') = 4 (subsequence 'bbbb'). Min insertions to make palindrome: 5-4 = 1 (insert one 'a').", code: "return dp[m][n]; // 4" }
]} />

---

### 3. Edit Distance (Levenshtein Distance)

**Problem:** Given two strings `word1` and `word2`, return the minimum number of operations (insert, delete, replace) to convert `word1` into `word2`.

#### Recurrence

Define `dp[i][j]` = edit distance between `word1[:i]` and `word2[:j]`.

$$
dp[i][j] = \begin{cases}
dp[i-1][j-1] & \text{if } word1[i-1] = word2[j-1] \\
1 + \min\begin{pmatrix} dp[i-1][j] & \text{(delete)} \\ dp[i][j-1] & \text{(insert)} \\ dp[i-1][j-1] & \text{(replace)} \end{pmatrix} & \text{otherwise}
\end{cases}
$$

**Base cases:** `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).

#### Full DP Table Construction

**When to use this template.** Use the full 2D edit distance table when you need both the minimum distance and the ability to reconstruct the sequence of operations. This is the foundation for all string transformation problems — adapt the cost function for weighted edits, or restrict operations (e.g., insert and delete only, which reduces to `m + n - 2 * LCS`).

```java
static int editDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + Math.min(dp[i - 1][j],       // delete
                            Math.min(dp[i][j - 1],            // insert
                                     dp[i - 1][j - 1]));      // replace
    return dp[m][n];
}
```

<AlgoViz title="Edit Distance — DP Table Filling" description="word1='SIT', word2='KITE'. dp[i][j] = minimum edits to convert word1[:i] to word2[:j]." steps={[
  { array: [0, 1, 2, 3, 4], highlights: [], labels: {"0":"''","1":"K","2":"I","3":"T","4":"E"}, variables: { row: "Base: dp[0][j]=j" }, explanation: "Base case row 0: converting empty string to 'KITE' prefixes requires j insertions each.", code: "for (int j = 0; j <= n; j++) dp[0][j] = j;" },
  { array: [1, 1, 2, 3, 4], highlights: [0, 1], labels: {"0":"''","1":"K","2":"I","3":"T","4":"E"}, variables: { row: "i=1 (S)" }, explanation: "Row 1 ('S'): dp[1][0]=1 (delete S). S!=K: dp[1][1]=1+min(0,1,1)=1 (replace S with K). Rest propagates.", code: "dp[1][1] = 1 + min(dp[0][0], dp[0][1], dp[1][0]);" },
  { array: [2, 2, 1, 2, 3], highlights: [2], labels: {"0":"''","1":"K","2":"I","3":"T","4":"E"}, variables: { row: "i=2 (I)", match: "I=I at j=2" }, explanation: "Row 2 ('I'): I matches I at j=2. dp[2][2]=dp[1][1]=1 — no edit needed! Free diagonal move.", code: "dp[2][2] = dp[1][1]; // chars match, cost 0" },
  { array: [3, 3, 2, 1, 2], highlights: [3], labels: {"0":"''","1":"K","2":"I","3":"T","4":"E"}, variables: { row: "i=3 (T)", match: "T=T at j=3" }, explanation: "Row 3 ('T'): T matches T at j=3. dp[3][3]=dp[2][2]=1. dp[3][4]: T!=E, 1+min(1,2,1)=2.", code: "dp[3][3] = dp[2][2] = 1; // match" },
  { array: [3, 3, 2, 1, 2], highlights: [4], variables: { answer: "dp[3][4] = 2" }, explanation: "Table complete. Edit distance = dp[3][4] = 2. Two operations needed: SIT → KITE.", code: "return dp[m][n]; // 2" },
  { array: [3, 3, 2, 1, 2], highlights: [4], variables: { backtrack: "(3,4): T!=E", op: "Insert E" }, explanation: "Backtrack from (3,4): T!=E. dp[3][4]=dp[3][3]+1 — came from left. Operation: Insert 'E'.", code: "ops.add('Insert E'); j--;" },
  { array: [3, 3, 2, 1, 2], highlights: [3], secondary: [2], variables: { backtrack: "(3,3)→(2,2)→(1,1)", ops: "diagonal matches" }, explanation: "Backtrack: (3,3) T=T → free diagonal. (2,2) I=I → free diagonal. Reach (1,1).", code: "// match → move diag, no operation" },
  { array: [3, 3, 2, 1, 2], highlights: [1], variables: { backtrack: "(1,1): S!=K", ops: "Replace S→K, Insert E" }, explanation: "Backtrack: (1,1) S!=K, dp[1][1]=dp[0][0]+1 → Replace S with K. Total: 2 ops (Replace S→K, Insert E).", code: "ops = ['Replace S→K', 'Insert E'];" }
]} />

#### Backtracking the Operations

**When to use this template.** Reach for edit distance backtracking when the problem asks you to produce the actual sequence of operations, not just the minimum count. This requires the full O(nm) DP table — space-optimized versions cannot backtrack. Follow the path from `dp[m][n]` back to `dp[0][0]`, choosing the direction that produced each cell's minimum value.

```java
static List<String> editOperations(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + Math.min(dp[i - 1][j],
                            Math.min(dp[i][j - 1], dp[i - 1][j - 1]));

    LinkedList<String> ops = new LinkedList<>();
    int i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && word1.charAt(i-1) == word2.charAt(j-1)) {
            i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] == dp[i-1][j-1] + 1) {
            ops.addFirst("Replace '" + word1.charAt(i-1) + "' at " + (i-1)
                       + " with '" + word2.charAt(j-1) + "'");
            i--; j--;
        } else if (j > 0 && dp[i][j] == dp[i][j-1] + 1) {
            ops.addFirst("Insert '" + word2.charAt(j-1) + "' at " + i);
            j--;
        } else {
            ops.addFirst("Delete '" + word1.charAt(i-1) + "' at " + (i-1));
            i--;
        }
    }
    return ops;
}
```

---

### 4. Space Optimization: Rolling Arrays

All three algorithms above use O(nm) space with a full DP table. Since each cell only depends on the current row and the previous row, we can reduce to **O(min(n, m))** using one of these techniques:

#### Two-Row Rolling Array

Keep `prev` (previous row) and `curr` (current row). After processing each row, swap.

```java
static int editDistanceOptimized(String word1, String word2) {
    if (word1.length() < word2.length()) { String tmp = word1; word1 = word2; word2 = tmp; }
    int m = word1.length(), n = word2.length();

    int[] prev = new int[n + 1];
    for (int j = 0; j <= n; j++) prev[j] = j;

    for (int i = 1; i <= m; i++) {
        int[] curr = new int[n + 1];
        curr[0] = i;
        for (int j = 1; j <= n; j++)
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
                curr[j] = prev[j - 1];
            else
                curr[j] = 1 + Math.min(prev[j],
                            Math.min(curr[j - 1], prev[j - 1]));
        prev = curr;
    }
    return prev[n];
}
```

#### Single-Row with Diagonal Cache

For LCS/Edit Distance, you can use a single row and one variable to save the "top-left" diagonal value before it gets overwritten:

```java
static int lcsSingleRow(String text1, String text2) {
    if (text1.length() < text2.length()) { String tmp = text1; text1 = text2; text2 = tmp; }
    int n = text2.length();
    int[] dp = new int[n + 1];
    for (int i = 0; i < text1.length(); i++) {
        int prevDiag = 0;
        for (int j = 1; j <= n; j++) {
            int temp = dp[j];
            if (text1.charAt(i) == text2.charAt(j - 1))
                dp[j] = prevDiag + 1;
            else
                dp[j] = Math.max(dp[j], dp[j - 1]);
            prevDiag = temp;
        }
    }
    return dp[n];
}
```

**Trade-off:** Space-optimized versions lose the ability to reconstruct the solution (no full table to backtrack). Use Hirschberg's algorithm if you need both O(n) space and reconstruction for LCS.

<AlgoViz title="Distinct Subsequences — Counting Matches" description="s='babgbag', t='bag'. Count how many distinct subsequences of s equal t. dp[i][j] = ways to form t[:j] from s[:i]." steps={[
  { array: [1, 0, 0, 0], highlights: [0], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { row: "i=0 (empty s)" }, explanation: "Base: dp[0][0]=1 (empty s matches empty t one way). dp[0][j>0]=0 (empty s can't form non-empty t prefix).", code: "dp[0] = 1; // empty matches empty" },
  { array: [1, 1, 0, 0], highlights: [1], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "1", char: "b", match: "b=t[0]" }, explanation: "s[0]='b': matches t[0]='b'. dp[1][1]=dp[0][0]+dp[0][1]=1+0=1. One way to form 'b' from 'b'.", code: "dp[1][1] = dp[0][0] + dp[0][1]; // 1" },
  { array: [1, 1, 1, 0], highlights: [2], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "2", char: "a", match: "a=t[1]" }, explanation: "s[1]='a': matches t[1]='a'. dp[2][2]=dp[1][1]+dp[1][2]=1+0=1. One way to form 'ba' so far.", code: "dp[2][2] = dp[1][1] + dp[1][2]; // 1" },
  { array: [1, 2, 1, 0], highlights: [1], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "3", char: "b", match: "b=t[0]" }, explanation: "s[2]='b': second 'b' in s. dp[3][1]=dp[2][0]+dp[2][1]=1+1=2. Two ways to pick a 'b' prefix now.", code: "dp[3][1] = dp[2][0] + dp[2][1]; // 2" },
  { array: [1, 2, 1, 1], highlights: [3], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "4", char: "g", match: "g=t[2]" }, explanation: "s[3]='g': matches t[2]='g'. dp[4][3]=dp[3][2]+dp[3][3]=1+0=1. First complete 'bag' found!", code: "dp[4][3] = dp[3][2] + dp[3][3]; // 1" },
  { array: [1, 3, 1, 1], highlights: [1], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "5", char: "b", match: "b=t[0]" }, explanation: "s[4]='b': third 'b'. dp[5][1]=dp[4][0]+dp[4][1]=1+2=3. Three ways to pick a 'b' prefix.", code: "dp[5][1] = dp[4][0] + dp[4][1]; // 3" },
  { array: [1, 3, 4, 1], highlights: [2], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "6", char: "a", match: "a=t[1]" }, explanation: "s[5]='a': dp[6][2]=dp[5][1]+dp[5][2]=3+1=4. Four ways to form 'ba' from 'babgba'.", code: "dp[6][2] = dp[5][1] + dp[5][2]; // 4" },
  { array: [1, 3, 4, 5], highlights: [3], labels: {"0":"''","1":"b","2":"a","3":"g"}, variables: { i: "7", char: "g", answer: "5" }, explanation: "s[6]='g': dp[7][3]=dp[6][2]+dp[6][3]=4+1=5. Five distinct subsequences of 'babgbag' equal 'bag'!", code: "return dp[7][3]; // 5" }
]} />

<AlgoViz title="Interleaving Strings — 2D Boolean DP" description="s1='ab', s2='cd', s3='acbd'. dp[i][j]=true if s3[:i+j] can be formed by interleaving s1[:i] and s2[:j]." steps={[
  { array: [1, 0, 0], highlights: [0], labels: {"0":"''","1":"c","2":"d"}, variables: { row: "i=0 (no s1 chars)" }, explanation: "Row 0: only s2 available. dp[0][0]=T (empty=empty). s2[0]='c' != s3[0]='a' so dp[0][1]=F. dp[0][2]=F.", code: "dp[0][0] = true;" },
  { array: [1, 0, 0], highlights: [0], labels: {"0":"''","1":"c","2":"d"}, variables: { col: "j=0", cells: "dp[1][0]=T, dp[2][0]=F" }, explanation: "Column 0 (no s2 chars): dp[1][0]=T because s1[0]='a'=s3[0]='a'. dp[2][0]=F because s1[1]='b' != s3[1]='c'.", code: "dp[i][0] = dp[i-1][0] && s1[i-1]==s3[i-1];" },
  { array: [1, 1, 0], highlights: [1], array2: [1, 0, 0], labels: {"0":"''","1":"c","2":"d"}, variables: { i: "1 (a)", j: "1", s3char: "s3[1]='c'" }, explanation: "dp[1][1]: s3[1]='c'. From top: dp[0][1]=F. From left: dp[1][0]=T and s2[0]='c'='c' — T! Take 'c' from s2.", code: "dp[1][1] = dp[1][0] && s2[0]==s3[1]; // true" },
  { array: [1, 1, 0], highlights: [], array2: [1, 0, 0], labels: {"0":"''","1":"c","2":"d"}, variables: { i: "1 (a)", j: "2", s3char: "s3[2]='b'" }, explanation: "dp[1][2]: s3[2]='b'. From top: dp[0][2]=F. From left: s2[1]='d' != 'b'. Neither works — F.", code: "dp[1][2] = false; // neither direction works" },
  { array: [0, 1, 0], highlights: [1], array2: [1, 1, 0], labels: {"0":"''","1":"c","2":"d"}, variables: { i: "2 (b)", j: "0-1" }, explanation: "Row 2: dp[2][0]=F (b != c). dp[2][1]: from top dp[1][1]=T and s1[1]='b'=s3[2]='b' — T! Take 'b' from s1.", code: "dp[2][1] = dp[1][1] && s1[1]==s3[2]; // true" },
  { array: [0, 1, 1], highlights: [2], array2: [1, 1, 0], labels: {"0":"''","1":"c","2":"d"}, variables: { i: "2 (b)", j: "2", s3char: "s3[3]='d'" }, explanation: "dp[2][2]: s3[3]='d'. From left: dp[2][1]=T and s2[1]='d'='d' — T! Complete interleaving found!", code: "dp[2][2] = dp[2][1] && s2[1]==s3[3]; // TRUE" },
  { array: [0, 1, 1], highlights: [2], variables: { answer: "true", path: "a(s1) c(s2) b(s1) d(s2)" }, explanation: "s3='acbd' IS a valid interleaving of s1='ab' and s2='cd'. Path: a from s1, c from s2, b from s1, d from s2.", code: "return dp[m][n]; // true" }
]} />

---

## Worked Example: LIS with O(n log n) on [10, 9, 2, 5, 3, 7, 101, 18]

**Why not brute force?** The brute force approach generates all 2^n subsequences (2^8 = 256 in this case), checks each for increasing order, and takes the longest. For n = 10^5 (LeetCode's constraint for LC 300), 2^100000 is impossibly large. The O(n^2) DP is feasible for n up to about 2,500, but for n = 10^5 we need the O(n log n) patience sorting approach. The key insight is that we do not need to track all possible subsequences — just the best tail element at each possible length.

We maintain a `tails` array and process each element:

| Step | Element | Action | `tails` after | Explanation |
|------|---------|--------|---------------|-------------|
| 1 | 10 | Append | `[10]` | Empty tails → append 10 |
| 2 | 9 | Replace tails[0] | `[9]` | `bisect_left([10], 9)` = 0 → replace 10 with 9 |
| 3 | 2 | Replace tails[0] | `[2]` | `bisect_left([9], 2)` = 0 → replace 9 with 2 |
| 4 | 5 | Append | `[2, 5]` | `bisect_left([2], 5)` = 1 = len → append 5 |
| 5 | 3 | Replace tails[1] | `[2, 3]` | `bisect_left([2, 5], 3)` = 1 → replace 5 with 3 |
| 6 | 7 | Append | `[2, 3, 7]` | `bisect_left([2, 3], 7)` = 2 = len → append 7 |
| 7 | 101 | Append | `[2, 3, 7, 101]` | `bisect_left([2, 3, 7], 101)` = 3 = len → append 101 |
| 8 | 18 | Replace tails[3] | `[2, 3, 7, 18]` | `bisect_left([2, 3, 7, 101], 18)` = 3 → replace 101 with 18 |

**Result:** `len(tails) = 4`, so the LIS length is **4**.

**Critical observation:** The final `tails = [2, 3, 7, 18]` is **not** the actual LIS. The actual LIS is `[2, 5, 7, 101]` or `[2, 3, 7, 101]` or `[2, 3, 7, 18]` — multiple valid answers exist. The tails array gives the correct *length* but not necessarily a valid subsequence from the original array (though in this case `[2, 3, 7, 18]` happens to be valid).

**Step 5 deep-dive:** When we see 3, we replace 5 at position 1. This doesn't change the LIS length, but it means: "if a future element is greater than 3 but at most 5, we can now extend a length-2 subsequence that we couldn't before." This greedy replacement keeps all options open.

**Key insight:** The tails array represents the smallest possible ending value for an increasing subsequence of each length. By always maintaining the smallest tails, we maximize the chance that future elements can extend the subsequence. Binary search on this sorted array gives O(log n) per element, O(n log n) total.

<AlgoViz title="LIS — Patience Sorting on [10, 9, 2, 5, 3, 7, 101, 18]" description="Building the tails list with binary search. Each step processes one element." steps={[
  { array: [10], highlights: [0], variables: { element: "10", action: "append" }, explanation: "Process 10: tails is empty, append 10.", code: "tails.add(10);" },
  { array: [9], highlights: [0], variables: { element: "9", action: "replace tails[0]", pos: "0" }, explanation: "Process 9: binary search finds pos=0. Replace 10 with 9.", code: "tails.set(0, 9); // 9 < 10" },
  { array: [2], highlights: [0], variables: { element: "2", action: "replace tails[0]", pos: "0" }, explanation: "Process 2: binary search finds pos=0. Replace 9 with 2.", code: "tails.set(0, 2); // 2 < 9" },
  { array: [2, 5], highlights: [1], variables: { element: "5", action: "append", pos: "1" }, explanation: "Process 5: pos=1 == size. Append 5. LIS length = 2.", code: "tails.add(5);" },
  { array: [2, 3], highlights: [1], variables: { element: "3", action: "replace tails[1]", pos: "1" }, explanation: "Process 3: pos=1. Replace 5 with 3. Keeps options open.", code: "tails.set(1, 3); // 3 < 5" },
  { array: [2, 3, 7], highlights: [2], variables: { element: "7", action: "append", pos: "2" }, explanation: "Process 7: pos=2 == size. Append 7. LIS length = 3.", code: "tails.add(7);" },
  { array: [2, 3, 7, 101], highlights: [3], variables: { element: "101", action: "append", pos: "3" }, explanation: "Process 101: pos=3 == size. Append 101. LIS length = 4.", code: "tails.add(101);" },
  { array: [2, 3, 7, 18], highlights: [3], variables: { element: "18", action: "replace tails[3]", pos: "3" }, explanation: "Process 18: pos=3. Replace 101 with 18. Final LIS length = 4.", code: "tails.set(3, 18); // 18 < 101" }
]} />

---

## Pattern Recognition

| Signal in Problem Statement | Likely Technique |
|---|---|
| "longest/shortest **subsequence**" | LIS or LCS variant |
| "minimum operations to **transform** string A to B" | Edit Distance variant |
| "**common** subsequence / supersequence" | LCS or LCS-derived |
| "**increasing** subsequence" | LIS (check if O(n log n) needed) |
| "**palindromic** subsequence" | LCS of string with its reverse |
| "number of **distinct** subsequences" | Counting DP (LC 115 pattern) |
| "**interleaving**" two strings | 2D boolean DP |
| "**minimum insertions** to make palindrome" | `n - LPS(s)` where LPS uses LCS |
| "**wildcard** or **regex** matching" | 2D DP with special transition rules |
| "**uncrossed** lines / matches" | LCS in disguise |

---

## Pattern Recognition Guide

Use this table when reading a problem statement. Scan for the clue phrases below, then apply the corresponding technique.

| Problem Clue | Technique | Why |
|---|---|---|
| "longest increasing subsequence" or "longest non-decreasing" | LIS with patience sorting (O(n log n)) | Tails array stays sorted, so binary search gives O(log n) per element; use lower-bound for strict, upper-bound for non-strict |
| "longest common subsequence of two strings/arrays" | 2D LCS DP matrix | Two sequences create a 2D state space `dp[i][j]`; each cell depends on match or mismatch at position `(i,j)` |
| "minimum operations to transform/convert string A to B" | Edit Distance DP | Classic 2D DP with insert, delete, and replace transitions; base cases are pure insertions or pure deletions |
| "longest palindromic subsequence" | `LCS(s, reverse(s))` | A palindromic subsequence reads the same forwards and backwards, so it is a common subsequence of `s` and its reverse |
| "number of distinct subsequences of s matching t" | Counting DP with match accumulation | When characters match: `dp[i][j] = dp[i-1][j-1] + dp[i-1][j]`; count all paths through the DP grid |
| "minimum deletions to make two strings equal" | LCS then `m + n - 2 * LCS` | Non-shared characters must be deleted from both strings; LCS identifies the shared backbone |
| "interleaving string" or "is s3 a merge of s1 and s2" | 2D boolean DP | State `dp[i][j]` is true if `s3[:i+j]` can be formed by interleaving `s1[:i]` and `s2[:j]` |
| "wildcard matching" or "regex matching" with special chars | 2D DP with special transition rules | Same 2D grid as edit distance, but `*` creates branching transitions (match zero or more characters) |
| "envelopes/boxes that nest inside each other" | Sort one dimension then LIS on another | Sorting by width ascending and height descending for ties reduces 2D nesting to a 1D LIS problem |
| "minimum insertions to make a string a palindrome" | `n - LPS(s)` where LPS uses LCS | Characters not in the longest palindromic subsequence must each be mirrored by an insertion |
| "uncrossed lines" or "maximum non-crossing matches" | LCS in disguise | Non-crossing constraint preserves relative order in both sequences, which is exactly the LCS definition |
| "shortest common supersequence of two strings" | LCS reconstruction then interleave | Build the supersequence by walking the LCS table and emitting non-LCS characters between LCS characters |

---

## Problem Set (21 Problems)

### Foundational

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 1 | 300. Longest Increasing Subsequence | Medium | LIS with O(n log n) patience sorting | [LeetCode 300](https://leetcode.com/problems/longest-increasing-subsequence/) |
| 2 | 1143. Longest Common Subsequence | Medium | Classic 2D DP matrix | [LeetCode 1143](https://leetcode.com/problems/longest-common-subsequence/) |
| 3 | 72. Edit Distance | Medium | Insert/delete/replace recurrence | [LeetCode 72](https://leetcode.com/problems/edit-distance/) |
| 4 | 516. Longest Palindromic Subsequence | Medium | LCS(s, reverse(s)) | [LeetCode 516](https://leetcode.com/problems/longest-palindromic-subsequence/) |
| 5 | 334. Increasing Triplet Subsequence | Medium | LIS with k=3 → O(n) greedy | [LeetCode 334](https://leetcode.com/problems/increasing-triplet-subsequence/) |
| 6 | 583. Delete Operation for Two Strings | Medium | `m + n - 2 * LCS(s1, s2)` | [LeetCode 583](https://leetcode.com/problems/delete-operation-for-two-strings/) |
| 7 | 1035. Uncrossed Lines | Medium | LCS in disguise (matching without crossing) | [LeetCode 1035](https://leetcode.com/problems/uncrossed-lines/) |

### Intermediate

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 8 | 712. Minimum ASCII Delete Sum for Two Strings | Medium | Edit distance variant with character costs | [LeetCode 712](https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/) |
| 9 | 646. Maximum Length of Pair Chain | Medium | Sort by end + greedy or LIS | [LeetCode 646](https://leetcode.com/problems/maximum-length-of-pair-chain/) |
| 10 | 1048. Longest String Chain | Medium | LIS on words with predecessor check | [LeetCode 1048](https://leetcode.com/problems/longest-string-chain/) |
| 11 | 368. Largest Divisible Subset | Medium | LIS variant with divisibility + reconstruction | [LeetCode 368](https://leetcode.com/problems/largest-divisible-subset/) |
| 12 | 673. Number of Longest Increasing Subsequences | Medium | Track count alongside LIS DP | [LeetCode 673](https://leetcode.com/problems/number-of-longest-increasing-subsequence/) |
| 13 | 1312. Minimum Insertions to Make a String Palindrome | Hard | `n - LPS(s)` | [LeetCode 1312](https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-palindrome/) |
| 14 | 115. Distinct Subsequences | Hard | Counting DP: match char → `dp[i-1][j-1] + dp[i-1][j]` | [LeetCode 115](https://leetcode.com/problems/distinct-subsequences/) |

### Advanced

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 15 | 354. Russian Doll Envelopes | Hard | Sort + LIS on heights (2D LIS) | [LeetCode 354](https://leetcode.com/problems/russian-doll-envelopes/) |
| 16 | 97. Interleaving String | Medium | 2D boolean DP on two string indices | [LeetCode 97](https://leetcode.com/problems/interleaving-string/) |
| 17 | 1092. Shortest Common Supersequence | Hard | LCS + reconstruction to build supersequence | [LeetCode 1092](https://leetcode.com/problems/shortest-common-supersequence/) |
| 18 | 44. Wildcard Matching | Hard | 2D DP with `*` matching any sequence | [LeetCode 44](https://leetcode.com/problems/wildcard-matching/) |
| 19 | 10. Regular Expression Matching | Hard | 2D DP with `.` and `*` transitions | [LeetCode 10](https://leetcode.com/problems/regular-expression-matching/) |
| 20 | 1964. Find Longest Valid Obstacle Course at Each Position | Hard | LIS variant returning array of lengths | [LeetCode 1964](https://leetcode.com/problems/find-the-longest-valid-obstacle-course-at-each-position/) |
| 21 | 2407. Longest Increasing Subsequence II | Hard | Segment tree + LIS for bounded difference | [LeetCode 2407](https://leetcode.com/problems/longest-increasing-subsequence-ii/) |

---

## Mock Interview

### Problem 1: Russian Doll Envelopes (LC 354)

**Interviewer:** You have a set of envelopes, each with a width and height. One envelope can fit into another if and only if both the width and height are strictly greater. What is the maximum number of envelopes you can nest?

**Candidate Approach:**

**Step 1 — Reduce to LIS:**
Sort envelopes by width ascending. For envelopes with the same width, sort by height **descending**. This ensures that among same-width envelopes, we can pick at most one (since heights are decreasing, no two same-width envelopes form an increasing pair in height).

**Step 2 — LIS on heights:**
After sorting, the problem reduces to finding the LIS on the heights array.

```java
static int maxEnvelopes(int[][] envelopes) {
    Arrays.sort(envelopes, (a, b) -> a[0] != b[0] ? a[0] - b[0] : b[1] - a[1]);

    List<Integer> tails = new ArrayList<>();
    for (int[] env : envelopes) {
        int h = env[1];
        int pos = Collections.binarySearch(tails, h);
        if (pos < 0) pos = -(pos + 1);
        if (pos == tails.size()) tails.add(h);
        else tails.set(pos, h);
    }
    return tails.size();
}
```

**Time:** O(n log n). **Space:** O(n).

**Follow-up Questions:**

**Q: Why sort by height descending for same-width envelopes?**
A: If we sorted ascending, two envelopes with width=5 and heights 3, 4 would both appear in the LIS of heights, but they can't nest (same width). Sorting heights descending for same widths means `[5,4], [5,3]` → heights `[4,3]` → no increasing pair, so at most one is chosen.

**Q: Can you extend this to 3D (boxes)?**
A: The 2D trick of sorting one dimension and running LIS on the other doesn't extend cleanly to 3D. With 3D, you need LIS on a partial order, which is NP-hard in general. Practical approaches use DP with sorting by one dimension and 2D dominance checks (e.g., using a BIT or segment tree), but the complexity is higher.

**Q: What if the nesting condition is ≥ instead of >?**
A: Use `bisect_right` instead of `bisect_left` for non-strict increasing. Also, remove the descending sort on heights for same-width envelopes (since equal dimensions now allow nesting).

---

### Problem 2: Edit Distance (LC 72)

**Interviewer:** Given two words, find the minimum number of operations (insert, delete, replace) to convert word1 into word2.

**Candidate Approach:**

```java
static int minDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[] prev = new int[n + 1];
    for (int j = 0; j <= n; j++) prev[j] = j;

    for (int i = 1; i <= m; i++) {
        int[] curr = new int[n + 1];
        curr[0] = i;
        for (int j = 1; j <= n; j++)
            if (word1.charAt(i - 1) == word2.charAt(j - 1))
                curr[j] = prev[j - 1];
            else
                curr[j] = 1 + Math.min(prev[j],
                            Math.min(curr[j - 1], prev[j - 1]));
        prev = curr;
    }
    return prev[n];
}
```

**Follow-up Questions:**

**Q: How would you reconstruct the actual sequence of operations?**
A: You need the full DP table. Backtrack from `dp[m][n]`: if characters match, go diagonally; otherwise, go to the cell that gave the minimum (diagonal = replace, left = insert, up = delete). The backtracking code is shown in the theory section above.

**Q: What if the operations have different costs (e.g., insert=1, delete=2, replace=3)?**
A: Replace the `1 + Math.min(...)` with weighted costs:
```java
curr[j] = Math.min(prev[j] + costDelete,
          Math.min(curr[j - 1] + costInsert,
                   prev[j - 1] + costReplace));
```

**Q: Can edit distance be computed faster than O(nm)?**
A: For the general case, no (there's a conditional lower bound assuming SETH). But if the edit distance `k` is small, Ukkonen's algorithm runs in O(nk) by only computing a band of width 2k+1 around the diagonal. For very long strings with small expected distance, this is a major speedup.

**Q: How does this relate to DNA sequence alignment?**
A: Edit distance is the simplest form of sequence alignment (Needleman-Wunsch with uniform costs). Bioinformatics uses weighted versions with substitution matrices (BLOSUM, PAM) and affine gap penalties (opening a gap costs more than extending it), which requires a more complex DP with three matrices.

---

## Tips and Pitfalls

### LIS Binary Search Pitfalls

1. **Lower-bound vs upper-bound binary search:** For *strictly* increasing subsequences, use a lower-bound search (equivalent to C++ `lower_bound`). For *non-decreasing*, use an upper-bound search (equivalent to C++ `upper_bound`). With `Collections.binarySearch`, a negative result gives the insertion point via `-(pos + 1)`, which is the lower bound. Mixing these up is the #1 source of bugs.

2. **The tails list is NOT the LIS.** It gives the correct length but does not correspond to any actual subsequence in the input. To recover the actual LIS, track parent pointers as shown in the reconstruction code.

3. **2D LIS (Russian Doll):** The descending-sort trick for the second dimension is specific to 2D. Forgetting it means same-width envelopes can incorrectly form increasing pairs.

4. **Non-strict vs strict:** Be absolutely clear about the problem's comparison operator. LC 300 asks for strictly increasing; LC 1964 asks for non-decreasing (use upper-bound search).

### LCS Reconstruction

1. **Space-optimized LCS loses reconstruction ability.** If you need the actual subsequence string, keep the full table or use Hirschberg's divide-and-conquer algorithm (O(n) space, O(nm) time, but with reconstruction).

2. **LCS ↔ LPS connection:** The Longest Palindromic Subsequence of string `s` equals `LCS(s, reverse(s))`. This reduces LPS to a well-known algorithm.

3. **LCS ↔ edit distance:** When only insertions and deletions are allowed (no replacements), edit distance = `m + n - 2 * LCS(s1, s2)`.

### Edit Distance Backtracking

1. **Multiple optimal paths exist.** When two operations give the same cost (e.g., delete and insert both lead to the minimum), any path is valid. Be consistent in your backtracking (e.g., always prefer replace > delete > insert).

2. **Reconstructing operations vs reconstructing the transformed string** are different tasks. Operations give you a sequence of edits; applying them requires careful index management since earlier operations shift positions.

3. **Space-optimized edit distance can't backtrack.** If you only need the distance, optimize space. If you need the operations, keep the full table (or use divide-and-conquer).

### General Subsequence DP

1. **"Subsequence" ≠ "Subarray."** Subsequences allow gaps. If a problem says "subarray" or "substring," contiguous DP techniques (sliding window, Kadane's) are usually better.

2. **When stuck, check if the problem reduces to LCS.** Many problems are LCS in disguise: uncrossed lines, shortest common supersequence, and minimum deletions to make strings equal.

3. **String matching DP (wildcard, regex):** These follow the same 2D DP structure as edit distance but with different transition rules. The `*` character in wildcard matching can match empty or extend by one character. In regex matching, `x*` can match zero or more of `x`.
