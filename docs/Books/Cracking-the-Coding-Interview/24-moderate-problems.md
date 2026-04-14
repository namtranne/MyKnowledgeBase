# Chapter 16 — Moderate Problems

> Chapter 16 contains 26 medium-difficulty problems that span a wide range of techniques: bit manipulation, sorting, dynamic programming, graph traversal, and more. These problems are designed to stretch your problem-solving skills without requiring the deep algorithmic expertise of the hard chapter. They're frequently asked in real interviews and are excellent for building pattern recognition.

---

## Problems Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODERATE PROBLEMS MAP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Math/Logic          Arrays/Strings       DP/Recursion           │
│  ┌───────────┐       ┌──────────────┐     ┌──────────────┐      │
│  │ 16.1  Swap│       │ 16.2  Freq   │     │ 16.11 Board  │      │
│  │ 16.5  Zero│       │ 16.6  Diff   │     │ 16.17 Kadane │      │
│  │ 16.7  Max │       │ 16.8  English│     │ 16.23 Square │      │
│  │ 16.9  Ops │       │ 16.15 Master │     │ 16.24 Matrix │      │
│  └───────────┘       │ 16.16 SubSort│     └──────────────┘      │
│                      │ 16.21 Swap   │                            │
│  Geometry            └──────────────┘     Graph/Search           │
│  ┌───────────┐                            ┌──────────────┐      │
│  │ 16.3  Int │       Simulation           │ 16.19 Pond   │      │
│  │ 16.4  Tic │       ┌──────────────┐     │ 16.22 Ant    │      │
│  │ 16.13 Bisect      │ 16.10 People │     └──────────────┘      │
│  │ 16.14 Line│       │ 16.12 XML    │                            │
│  └───────────┘       │ 16.20 T9     │     Trie/Advanced         │
│                      └──────────────┘     ┌──────────────┐      │
│  Pattern                                  │ 16.25 Rect   │      │
│  ┌───────────┐                            │ 16.26 Sparse │      │
│  │ 16.18 Pat │                            └──────────────┘      │
│  └───────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Problem Summaries

### 16.1 — Number Swapper

**Problem:** Swap two numbers in place without a temporary variable.

**Techniques:** XOR trick or arithmetic trick.

```java
// XOR approach
void swap(int[] arr, int i, int j) {
    arr[i] ^= arr[j];
    arr[j] ^= arr[i];
    arr[i] ^= arr[j];
}

// Arithmetic approach
void swap(int[] arr, int i, int j) {
    arr[i] = arr[i] + arr[j];
    arr[j] = arr[i] - arr[j];
    arr[i] = arr[i] - arr[j];
}
```

> The XOR trick avoids overflow. In practice, use a temp variable for clarity — these tricks are interview showpieces, not production code.

---

### 16.2 — Word Frequencies

**Problem:** Given a book (list of words), find the frequency of a given word. What if called repeatedly?

**Technique:** Hash map for O(1) lookups after O(n) preprocessing.

```java
Map<String, Integer> buildFrequencyTable(String[] book) {
    Map<String, Integer> freq = new HashMap<>();
    for (String word : book) {
        String lower = word.toLowerCase().trim();
        freq.merge(lower, 1, Integer::sum);
    }
    return freq;
}
```

---

### 16.3 — Intersection

**Problem:** Given two line segments, find their intersection point (if any).

**Technique:** Compute line equations (y = mx + b), handle vertical lines, check if intersection is within segment bounds.

---

### 16.4 — Tic Tac Win

**Problem:** Determine if someone has won a game of tic-tac-toe.

**Technique:** Check all rows, columns, and diagonals. Generalize for N×N boards.

```java
boolean hasWon(char[][] board, char player) {
    int n = board.length;
    for (int i = 0; i < n; i++) {
        if (checkRow(board, i, player) || checkCol(board, i, player))
            return true;
    }
    return checkDiag(board, player) || checkAntiDiag(board, player);
}
```

---

### 16.5 — Factorial Zeros

**Problem:** Count the number of trailing zeros in n!

**Technique:** Count factors of 5 (there are always more factors of 2 than 5).

```java
int trailingZeros(int n) {
    int count = 0;
    for (int i = 5; i <= n; i *= 5) {
        count += n / i;
    }
    return count;
}
```

> 25 contributes two factors of 5, 125 contributes three, etc. The formula n/5 + n/25 + n/125 + ... handles this.

---

### 16.6 — Smallest Difference

**Problem:** Given two arrays, find the pair (one from each) with the smallest absolute difference.

**Technique:** Sort both arrays, use two pointers.

```java
int smallestDiff(int[] a, int[] b) {
    Arrays.sort(a);
    Arrays.sort(b);
    int i = 0, j = 0, minDiff = Integer.MAX_VALUE;
    while (i < a.length && j < b.length) {
        minDiff = Math.min(minDiff, Math.abs(a[i] - b[j]));
        if (a[i] < b[j]) i++;
        else j++;
    }
    return minDiff;
}
```

**Complexity:** O(n log n + m log m) time, O(1) extra space.

---

### 16.7 — Number Max

**Problem:** Find the maximum of two numbers without using comparison operators or if/else.

**Technique:** Use the sign bit to determine which is larger.

```java
int getMax(int a, int b) {
    int diff = a - b;
    int sign = (diff >> 31) & 1;  // 0 if a >= b, 1 if a < b
    return a - sign * diff;
}
```

> Watch out for integer overflow when computing `a - b`. A safer approach uses the sign bits of a, b, and diff separately.

---

### 16.8 — English Int

**Problem:** Given an integer, print its English representation (e.g., 1234 → "One Thousand Two Hundred Thirty Four").

**Technique:** Process in groups of three digits, using arrays for ones, teens, and tens.

---

### 16.9 — Operations

**Problem:** Implement multiply, subtract, and divide using only the add operator.

```java
int negate(int a) {
    int neg = 0;
    int delta = a > 0 ? -1 : 1;
    while (a != 0) {
        neg += delta;
        a += delta;
    }
    return neg;
}

int subtract(int a, int b) { return a + negate(b); }

int multiply(int a, int b) {
    if (Math.abs(a) < Math.abs(b)) return multiply(b, a);
    int sum = 0;
    for (int i = 0; i < Math.abs(b); i++) {
        sum += a;
    }
    return b < 0 ? negate(sum) : sum;
}
```

---

### 16.10 — Living People

**Problem:** Given birth and death years, find the year with the most people alive.

**Technique:** Sweep line algorithm — +1 at birth, -1 at (death + 1), compute running sum.

```java
int maxAliveYear(int[] births, int[] deaths, int min, int max) {
    int[] delta = new int[max - min + 2];
    for (int i = 0; i < births.length; i++) {
        delta[births[i] - min]++;
        delta[deaths[i] - min + 1]--;
    }

    int maxAlive = 0, currentAlive = 0, maxYear = min;
    for (int i = 0; i < delta.length; i++) {
        currentAlive += delta[i];
        if (currentAlive > maxAlive) {
            maxAlive = currentAlive;
            maxYear = min + i;
        }
    }
    return maxYear;
}
```

**Complexity:** O(n + R) where R is the range of years.

---

### 16.11 — Diving Board

**Problem:** A diving board is made of planks of two lengths. Given K planks, find all possible total lengths.

**Technique:** With K planks of lengths `shorter` and `longer`, total = i × longer + (K - i) × shorter for i = 0 to K.

---

### 16.12 — XML Encoding

**Problem:** Encode XML into a compressed format using tag/attribute mappings.

**Technique:** Recursive processing matching the XML tree structure.

---

### 16.13 — Bisect Squares

**Problem:** Given two squares, find a line that bisects both.

**Technique:** The line through both centers bisects both squares.

---

### 16.14 — Best Line

**Problem:** Given a set of points, find the line passing through the most points.

**Technique:** Hash map of slopes (represented as reduced fractions to avoid floating-point issues).

---

### 16.15 — Master Mind

**Problem:** Given a guess and solution in Master Mind, compute hits (exact matches) and pseudo-hits (correct color, wrong position).

```java
int[] masterMind(String solution, String guess) {
    int hits = 0, pseudoHits = 0;
    int[] sFreq = new int[4], gFreq = new int[4];
    for (int i = 0; i < 4; i++) {
        if (solution.charAt(i) == guess.charAt(i)) {
            hits++;
        } else {
            sFreq[colorIndex(solution.charAt(i))]++;
            gFreq[colorIndex(guess.charAt(i))]++;
        }
    }
    for (int i = 0; i < 4; i++) {
        pseudoHits += Math.min(sFreq[i], gFreq[i]);
    }
    return new int[]{hits, pseudoHits};
}
```

---

### 16.16 — Sub Sort

**Problem:** Find the shortest subarray such that sorting it makes the entire array sorted.

**Technique:** Find leftmost and rightmost elements out of order, then expand to include any elements that need repositioning.

```java
int[] findUnsortedSubarray(int[] arr) {
    int n = arr.length;
    int left = -1, right = -1;

    int maxSeen = Integer.MIN_VALUE;
    for (int i = 0; i < n; i++) {
        if (arr[i] < maxSeen) right = i;
        maxSeen = Math.max(maxSeen, arr[i]);
    }

    int minSeen = Integer.MAX_VALUE;
    for (int i = n - 1; i >= 0; i--) {
        if (arr[i] > minSeen) left = i;
        minSeen = Math.min(minSeen, arr[i]);
    }

    return new int[]{left, right};
}
```

---

### 16.17 — Contiguous Sequence (Max Subarray)

**Problem:** Find the contiguous subarray with the largest sum.

**Technique:** Kadane's algorithm.

```java
int maxSubarraySum(int[] arr) {
    int maxSum = Integer.MIN_VALUE;
    int currentSum = 0;
    for (int val : arr) {
        currentSum = Math.max(val, currentSum + val);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}
```

> Kadane's algorithm runs in O(n) time and O(1) space. It's one of the most commonly asked interview problems. Understand why resetting `currentSum` to `val` works: if the running sum becomes negative, starting fresh is always better.

---

### 16.18 — Pattern Matching

**Problem:** Given a pattern (e.g., "aabab") and a string, determine if the string matches the pattern.

**Technique:** Try all possible lengths for 'a' and 'b' patterns, check if they produce the target string.

---

### 16.19 — Pond Sizes

**Problem:** Given a matrix where 0 represents water, find the sizes of all ponds (connected regions of 0s).

**Technique:** BFS/DFS flood fill, mark visited cells.

```java
List<Integer> pondSizes(int[][] land) {
    List<Integer> result = new ArrayList<>();
    for (int r = 0; r < land.length; r++) {
        for (int c = 0; c < land[0].length; c++) {
            if (land[r][c] == 0) {
                result.add(dfs(land, r, c));
            }
        }
    }
    Collections.sort(result);
    return result;
}

int dfs(int[][] land, int r, int c) {
    if (r < 0 || r >= land.length || c < 0 || c >= land[0].length || land[r][c] != 0)
        return 0;
    land[r][c] = -1;
    int size = 1;
    for (int dr = -1; dr <= 1; dr++) {
        for (int dc = -1; dc <= 1; dc++) {
            size += dfs(land, r + dr, c + dc);
        }
    }
    return size;
}
```

---

### 16.20 — T9

**Problem:** Map a T9 phone keypad sequence to possible words.

**Technique:** Hash map of digit-to-chars, trie for dictionary lookup.

```
┌─────┬─────┬─────┐
│  1  │ 2   │ 3   │
│     │ abc │ def │
├─────┼─────┼─────┤
│ 4   │ 5   │ 6   │
│ ghi │ jkl │ mno │
├─────┼─────┼─────┤
│ 7   │ 8   │ 9   │
│pqrs │ tuv │wxyz │
├─────┼─────┼─────┤
│     │ 0   │     │
└─────┴─────┴─────┘
```

---

### 16.21 — Sum Swap

**Problem:** Given two arrays, find a pair of values (one from each) to swap so the arrays have equal sums.

**Technique:** Target difference = (sumA - sumB) / 2. Use a set for O(1) lookups.

```java
int[] findSwapPair(int[] a, int[] b) {
    int sumA = Arrays.stream(a).sum();
    int sumB = Arrays.stream(b).sum();
    if ((sumA - sumB) % 2 != 0) return null;
    int target = (sumA - sumB) / 2;

    Set<Integer> setB = new HashSet<>();
    for (int val : b) setB.add(val);

    for (int val : a) {
        if (setB.contains(val - target)) {
            return new int[]{val, val - target};
        }
    }
    return null;
}
```

---

### 16.22 — Langton's Ant

**Problem:** Simulate Langton's Ant for K moves on an infinite grid.

**Technique:** Use a `HashSet` to track black cells, simulate movement rules.

---

### 16.23 — Max Black Square

**Problem:** Find the largest subsquare with all black borders in a matrix.

**Technique:** Precompute right-runs and down-runs for each cell, check square borders efficiently.

---

### 16.24 — Max Submatrix

**Problem:** Find the submatrix with the largest sum.

**Technique:** 2D extension of Kadane's algorithm.

```java
int maxSubmatrix(int[][] matrix) {
    int rows = matrix.length, cols = matrix[0].length;
    int maxSum = Integer.MIN_VALUE;

    for (int top = 0; top < rows; top++) {
        int[] colSum = new int[cols];
        for (int bottom = top; bottom < rows; bottom++) {
            for (int c = 0; c < cols; c++) {
                colSum[c] += matrix[bottom][c];
            }
            maxSum = Math.max(maxSum, kadane(colSum));
        }
    }
    return maxSum;
}

int kadane(int[] arr) {
    int maxSum = Integer.MIN_VALUE, current = 0;
    for (int val : arr) {
        current = Math.max(val, current + val);
        maxSum = Math.max(maxSum, current);
    }
    return maxSum;
}
```

**Complexity:** O(rows² × cols) — much better than the O(rows² × cols²) brute force.

---

### 16.25 — Word Rectangle

**Problem:** Find the largest rectangle of letters such that every row and column forms a valid word.

**Technique:** Trie for prefix validation + backtracking.

---

### 16.26 — Sparse Similarity

**Problem:** Given documents (each a list of word IDs), compute similarity between all pairs with non-zero similarity.

**Technique:** Inverted index — map each word to the documents containing it, then count shared words per pair.

---

## Key Patterns and Techniques Summary

| Technique | Problems | When to Use |
|-----------|----------|-------------|
| **Hash Map** | 16.2, 16.14, 16.21, 16.26 | Frequency counting, quick lookup, grouping |
| **Sorting + Two Pointers** | 16.6, 16.16 | Finding pairs, merging sorted data |
| **Bit Manipulation** | 16.1, 16.7 | Swapping without temp, avoiding comparisons |
| **Kadane's Algorithm** | 16.17, 16.24 | Maximum subarray / submatrix sum |
| **BFS/DFS** | 16.19 | Flood fill, connected components |
| **Sweep Line** | 16.10 | Range counting, interval problems |
| **Dynamic Programming** | 16.11, 16.23 | Optimal substructure, overlapping subproblems |
| **Trie** | 16.20, 16.25, 16.26 | Prefix matching, word lookup |
| **Simulation** | 16.22 | Step-by-step state evolution |
| **Math / Number Theory** | 16.5, 16.9 | Factor counting, arithmetic tricks |
| **Geometry** | 16.3, 16.4, 16.13 | Line intersection, board evaluation |

---

## Study Strategy

> Group problems by technique when studying. Once you master Kadane's algorithm on 16.17, the 2D extension in 16.24 becomes natural. After practicing flood fill on 16.19, similar graph problems feel familiar.

| Priority Tier | Problems | Why |
|--------------|---------|-----|
| **Must Know** | 16.5, 16.6, 16.17, 16.19, 16.21 | High frequency in real interviews |
| **Should Know** | 16.1, 16.2, 16.10, 16.15, 16.16, 16.24 | Common patterns, medium difficulty |
| **Good to Know** | 16.4, 16.7, 16.8, 16.9, 16.11, 16.18 | Less common but build diverse skills |
| **Advanced** | 16.14, 16.22, 16.23, 16.25, 16.26 | Complex, rarely asked as-is but teach deep techniques |
