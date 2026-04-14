# Chapter 17 — Hard Problems

> Chapter 17 contains 26 hard-difficulty problems that require deep algorithmic knowledge and creative problem-solving. These problems often combine multiple techniques — bit manipulation with math, dynamic programming with tries, heaps with sorting — and push you to the limits of interview-level difficulty. Mastering even a subset of these will dramatically improve your ability to handle tough interviews.

---

## Problems Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      HARD PROBLEMS MAP                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Bit Manipulation       Math/Counting        DP / Greedy          │
│  ┌────────────┐         ┌────────────┐       ┌────────────┐      │
│  │ 17.1  Add  │         │ 17.4  Miss │       │ 17.8  Tower│      │
│  │ 17.19 Miss2│         │ 17.6  2s   │       │ 17.13 Space│      │
│  └────────────┘         │ 17.9  Kth  │       │ 17.16 Masse│      │
│                         └────────────┘       │ 17.24 SubMx│      │
│  Randomization          Sorting/Select       └────────────┘      │
│  ┌────────────┐         ┌────────────┐                            │
│  │ 17.2  Shuf │         │ 17.14 SmK  │       Heap / Queue        │
│  │ 17.3  RSet │         │ 17.10 Major│       ┌────────────┐      │
│  └────────────┘         └────────────┘       │ 17.20 Med  │      │
│                                              └────────────┘      │
│  Arrays/Strings         Trie / Search        Graph / Tree        │
│  ┌────────────┐         ┌────────────┐       ┌────────────┐      │
│  │ 17.5  L&N  │         │ 17.13 Space│       │ 17.7  Names│      │
│  │ 17.11 Dist │         │ 17.15 Long │       │ 17.12 BiNd │      │
│  │ 17.18 Short│         │ 17.17 Multi│       │ 17.22 Ladr │      │
│  │ 17.21 Vol  │         └────────────┘       └────────────┘      │
│  │ 17.23 MaxSq│                                                   │
│  │ 17.26 Spars│         Pattern                                   │
│  └────────────┘         ┌────────────┐                            │
│                         │ 17.25 Rect │                            │
│                         └────────────┘                            │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Problem Summaries

### 17.1 — Add Without Plus

**Problem:** Add two integers without using `+` or any arithmetic operator.

**Technique:** Bit manipulation — XOR for sum without carry, AND + shift for carry.

```java
int add(int a, int b) {
    while (b != 0) {
        int sum = a ^ b;
        int carry = (a & b) << 1;
        a = sum;
        b = carry;
    }
    return a;
}
```

```
Example: 5 + 3
  a = 101, b = 011
  Iteration 1: sum = 110, carry = 010
  Iteration 2: sum = 100, carry = 100
  Iteration 3: sum = 000, carry = 1000
  Iteration 4: sum = 1000, carry = 0 → result = 8 ✓
```

---

### 17.2 — Shuffle

**Problem:** Shuffle a deck of cards perfectly randomly. Each permutation must be equally likely.

**Technique:** Fisher-Yates (Knuth) shuffle — iterate backward, swap each element with a random earlier element.

```java
void shuffle(int[] deck) {
    Random rand = new Random();
    for (int i = deck.length - 1; i > 0; i--) {
        int j = rand.nextInt(i + 1);
        int temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
}
```

> Each of the n! permutations is equally likely. Using `rand.nextInt(n)` instead of `rand.nextInt(i+1)` at each step produces biased results — a common mistake.

---

### 17.3 — Random Set

**Problem:** Generate a random subset of size m from an array of size n. Each subset must be equally likely.

**Technique:** Extension of Fisher-Yates — perform only m iterations of the shuffle.

```java
int[] randomSet(int[] arr, int m) {
    int[] result = arr.clone();
    Random rand = new Random();
    for (int i = 0; i < m; i++) {
        int j = i + rand.nextInt(arr.length - i);
        int temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return Arrays.copyOf(result, m);
}
```

---

### 17.4 — Missing Number

**Problem:** An array contains all numbers from 0 to n except one. Find the missing number.

**Technique:** XOR all values with all indices, or use sum formula.

```java
int missingNumber(int[] arr) {
    int n = arr.length;
    int expectedSum = n * (n + 1) / 2;
    int actualSum = 0;
    for (int val : arr) actualSum += val;
    return expectedSum - actualSum;
}

int missingNumberXOR(int[] arr) {
    int xor = arr.length;
    for (int i = 0; i < arr.length; i++) {
        xor ^= i ^ arr[i];
    }
    return xor;
}
```

> The XOR approach avoids potential integer overflow with large n.

---

### 17.5 — Letters and Numbers

**Problem:** Find the longest subarray with an equal number of letters and numbers.

**Technique:** Replace letters with +1 and numbers with -1, find the longest subarray with sum 0 using a hash map of prefix sums.

```java
int[] longestEqualSubarray(char[] arr) {
    int[] delta = new int[arr.length];
    for (int i = 0; i < arr.length; i++) {
        delta[i] = Character.isLetter(arr[i]) ? 1 : -1;
    }

    Map<Integer, Integer> firstSeen = new HashMap<>();
    firstSeen.put(0, -1);
    int sum = 0, maxLen = 0, start = 0;

    for (int i = 0; i < delta.length; i++) {
        sum += delta[i];
        if (firstSeen.containsKey(sum)) {
            int len = i - firstSeen.get(sum);
            if (len > maxLen) {
                maxLen = len;
                start = firstSeen.get(sum) + 1;
            }
        } else {
            firstSeen.put(sum, i);
        }
    }
    return new int[]{start, start + maxLen - 1};
}
```

**Complexity:** O(n) time, O(n) space.

---

### 17.6 — Count of 2s

**Problem:** Count the number of 2s that appear in all numbers from 0 to n.

**Technique:** Digit DP — analyze each digit position independently.

```java
int countTwos(int n) {
    int count = 0;
    for (int digit = 0; digit < String.valueOf(n).length(); digit++) {
        count += countTwosAtDigit(n, digit);
    }
    return count;
}

int countTwosAtDigit(int n, int d) {
    int powerOf10 = (int) Math.pow(10, d);
    int nextPower = powerOf10 * 10;
    int roundDown = n - n % nextPower;
    int roundUp = roundDown + nextPower;
    int digitValue = (n / powerOf10) % 10;

    if (digitValue < 2) return roundDown / 10;
    if (digitValue == 2) return roundDown / 10 + (n % powerOf10) + 1;
    return roundUp / 10;
}
```

---

### 17.7 — Baby Names

**Problem:** Given name frequencies and synonym pairs, compute true frequencies for each name group.

**Technique:** Union-Find (Disjoint Set Union) to group synonyms, then aggregate frequencies.

```java
Map<String, Integer> babyNames(Map<String, Integer> names, String[][] synonyms) {
    Map<String, String> parent = new HashMap<>();
    for (String name : names.keySet()) parent.put(name, name);
    for (String[] pair : synonyms) {
        parent.putIfAbsent(pair[0], pair[0]);
        parent.putIfAbsent(pair[1], pair[1]);
        union(parent, pair[0], pair[1]);
    }

    Map<String, Integer> result = new HashMap<>();
    for (Map.Entry<String, Integer> entry : names.entrySet()) {
        String root = find(parent, entry.getKey());
        result.merge(root, entry.getValue(), Integer::sum);
    }
    return result;
}

String find(Map<String, String> parent, String name) {
    while (!parent.get(name).equals(name)) {
        parent.put(name, parent.get(parent.get(name)));
        name = parent.get(name);
    }
    return name;
}

void union(Map<String, String> parent, String a, String b) {
    String rootA = find(parent, a);
    String rootB = find(parent, b);
    if (!rootA.equals(rootB)) parent.put(rootA, rootB);
}
```

---

### 17.8 — Circus Tower

**Problem:** People in a circus tower must be both shorter and lighter than the person below. Find the longest tower.

**Technique:** Sort by one dimension, then find the Longest Increasing Subsequence (LIS) on the other dimension.

```java
int longestTower(int[][] people) {
    Arrays.sort(people, (a, b) -> a[0] != b[0] ? a[0] - b[0] : b[1] - a[1]);
    int[] dp = new int[people.length];
    int len = 0;
    for (int[] person : people) {
        int pos = Arrays.binarySearch(dp, 0, len, person[1]);
        if (pos < 0) pos = -(pos + 1);
        dp[pos] = person[1];
        if (pos == len) len++;
    }
    return len;
}
```

**Complexity:** O(n log n).

---

### 17.9 — Kth Multiple

**Problem:** Find the kth number whose only prime factors are 3, 5, and 7.

**Technique:** Maintain three queues (for ×3, ×5, ×7), always pick the minimum.

```java
int kthMultiple(int k) {
    Queue<Integer> q3 = new LinkedList<>();
    Queue<Integer> q5 = new LinkedList<>();
    Queue<Integer> q7 = new LinkedList<>();
    q3.add(1);
    int val = 0;
    for (int i = 0; i < k; i++) {
        int v3 = q3.isEmpty() ? Integer.MAX_VALUE : q3.peek();
        int v5 = q5.isEmpty() ? Integer.MAX_VALUE : q5.peek();
        int v7 = q7.isEmpty() ? Integer.MAX_VALUE : q7.peek();
        val = Math.min(v3, Math.min(v5, v7));
        if (val == v3) {
            q3.remove();
            q3.add(val * 3);
            q5.add(val * 5);
            q7.add(val * 7);
        } else if (val == v5) {
            q5.remove();
            q5.add(val * 5);
            q7.add(val * 7);
        } else {
            q7.remove();
            q7.add(val * 7);
        }
    }
    return val;
}
```

---

### 17.10 — Majority Element

**Problem:** Find the majority element (appears more than n/2 times) or report none exists.

**Technique:** Boyer-Moore Voting Algorithm.

```java
int majorityCandidate(int[] arr) {
    int candidate = 0, count = 0;
    for (int val : arr) {
        if (count == 0) candidate = val;
        count += (val == candidate) ? 1 : -1;
    }
    return candidate;
}

boolean isMajority(int[] arr, int candidate) {
    int count = 0;
    for (int val : arr) if (val == candidate) count++;
    return count > arr.length / 2;
}
```

> Boyer-Moore is O(n) time, O(1) space. The verification pass is necessary because the algorithm only finds a candidate — if no majority exists, the candidate is arbitrary.

---

### 17.11 — Word Distance

**Problem:** Given a large document and two words, find the shortest distance between them.

**Technique:** Two-pointer — track the most recent positions of both words.

```java
int shortestDistance(String[] words, String word1, String word2) {
    int pos1 = -1, pos2 = -1, minDist = Integer.MAX_VALUE;
    for (int i = 0; i < words.length; i++) {
        if (words[i].equals(word1)) pos1 = i;
        if (words[i].equals(word2)) pos2 = i;
        if (pos1 >= 0 && pos2 >= 0) {
            minDist = Math.min(minDist, Math.abs(pos1 - pos2));
        }
    }
    return minDist;
}
```

For repeated queries, precompute word positions in a hash map and merge sorted lists.

---

### 17.12 — BiNode

**Problem:** Convert a binary search tree to a doubly linked list in-place using in-order traversal.

**Technique:** In-order traversal, linking nodes as you visit them.

```java
BiNode head = null, prev = null;

void convert(BiNode node) {
    if (node == null) return;
    convert(node.left);
    if (prev == null) {
        head = node;
    } else {
        prev.right = node;
        node.left = prev;
    }
    prev = node;
    convert(node.right);
}
```

---

### 17.13 — Re-Space

**Problem:** Given a string without spaces and a dictionary, add spaces to minimize unrecognized characters.

**Technique:** Trie for dictionary + dynamic programming.

```java
int reSpace(String doc, Set<String> dict) {
    int n = doc.length();
    int[] dp = new int[n + 1];
    for (int i = 1; i <= n; i++) {
        dp[i] = dp[i - 1] + 1;
        for (int j = 0; j < i; j++) {
            String sub = doc.substring(j, i);
            if (dict.contains(sub)) {
                dp[i] = Math.min(dp[i], dp[j]);
            }
        }
    }
    return dp[n];
}
```

> A trie optimization brings the inner loop from O(n) to O(L) where L is the max word length.

---

### 17.14 — Smallest K

**Problem:** Find the smallest k elements in an array.

**Techniques:** Quickselect (average O(n)), max-heap of size k (O(n log k)), or sorting (O(n log n)).

```java
// Max-heap approach
int[] smallestK(int[] arr, int k) {
    PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
    for (int val : arr) {
        maxHeap.offer(val);
        if (maxHeap.size() > k) maxHeap.poll();
    }
    return maxHeap.stream().mapToInt(Integer::intValue).toArray();
}
```

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sort | O(n log n) | O(1) | Simple, modifies input |
| Max-Heap | O(n log k) | O(k) | Good when k is much smaller than n |
| Quickselect | O(n) avg | O(1) | Fastest average case, O(n²) worst |

---

### 17.15 — Longest Word

**Problem:** Find the longest word that can be composed of other words in the list.

**Technique:** Sort by length descending, trie + recursive check if word can be split into dictionary words.

---

### 17.16 — The Masseuse

**Problem:** A masseuse has appointment requests with different durations. Find the maximum time she can work with no two adjacent appointments.

**Technique:** DP — at each appointment, choose max(take it + dp[i-2], skip it = dp[i-1]).

```java
int maxMinutes(int[] requests) {
    if (requests.length == 0) return 0;
    int twoBack = 0, oneBack = requests[0];
    for (int i = 1; i < requests.length; i++) {
        int current = Math.max(oneBack, twoBack + requests[i]);
        twoBack = oneBack;
        oneBack = current;
    }
    return oneBack;
}
```

> This is the classic "House Robber" problem. O(n) time, O(1) space.

---

### 17.17 — Multi Search

**Problem:** Given a big string and an array of small strings, find all locations where each small string occurs.

**Technique:** Build a trie from the small strings, slide through the big string checking trie matches.

---

### 17.18 — Shortest Supersequence

**Problem:** Find the shortest subarray of the big array containing all elements of the small array.

**Technique:** Sliding window with a count map.

```java
int[] shortestSupersequence(int[] big, int[] small) {
    Map<Integer, Integer> need = new HashMap<>();
    for (int s : small) need.put(s, need.getOrDefault(s, 0) + 1);

    int required = need.size(), formed = 0;
    Map<Integer, Integer> window = new HashMap<>();
    int left = 0, minLen = Integer.MAX_VALUE, start = -1;

    for (int right = 0; right < big.length; right++) {
        window.merge(big[right], 1, Integer::sum);
        if (need.containsKey(big[right]) &&
            window.get(big[right]).intValue() == need.get(big[right]).intValue()) {
            formed++;
        }
        while (formed == required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                start = left;
            }
            window.merge(big[left], -1, Integer::sum);
            if (need.containsKey(big[left]) &&
                window.get(big[left]) < need.get(big[left])) {
                formed--;
            }
            left++;
        }
    }
    return start == -1 ? new int[]{} : new int[]{start, start + minLen - 1};
}
```

---

### 17.19 — Missing Two

**Problem:** Array contains 1 to N but is missing two numbers. Find them.

**Technique:** Use sum and sum of squares to create two equations with two unknowns.

```java
int[] missingTwo(int[] arr) {
    int n = arr.length + 2;
    long sumExpected = (long) n * (n + 1) / 2;
    long sqSumExpected = (long) n * (n + 1) * (2 * n + 1) / 6;

    long sum = 0, sqSum = 0;
    for (int val : arr) {
        sum += val;
        sqSum += (long) val * val;
    }

    long s = sumExpected - sum;
    long q = sqSumExpected - sqSum;
    // a + b = s, a² + b² = q
    // (a + b)² = a² + 2ab + b² → ab = (s*s - q) / 2
    long ab = (s * s - q) / 2;
    // a and b are roots of: x² - sx + ab = 0
    double disc = Math.sqrt(s * s - 4 * ab);
    int a = (int) ((s + disc) / 2);
    int b = (int) (s - a);
    return new int[]{a, b};
}
```

---

### 17.20 — Continuous Median

**Problem:** Maintain a running median as numbers stream in.

**Technique:** Two heaps — max-heap for lower half, min-heap for upper half.

```java
class MedianFinder {
    PriorityQueue<Integer> lower = new PriorityQueue<>(Collections.reverseOrder());
    PriorityQueue<Integer> upper = new PriorityQueue<>();

    void addNumber(int num) {
        if (lower.isEmpty() || num <= lower.peek()) {
            lower.offer(num);
        } else {
            upper.offer(num);
        }
        rebalance();
    }

    void rebalance() {
        if (lower.size() > upper.size() + 1) upper.offer(lower.poll());
        if (upper.size() > lower.size()) lower.offer(upper.poll());
    }

    double getMedian() {
        if (lower.size() == upper.size()) {
            return (lower.peek() + upper.peek()) / 2.0;
        }
        return lower.peek();
    }
}
```

**Complexity:** O(log n) per insert, O(1) for median query.

---

### 17.21 — Volume of Histogram

**Problem:** Given bar heights, compute the volume of water that can be trapped.

**Technique:** Two-pointer approach or stack-based approach.

```java
int trapWater(int[] heights) {
    int left = 0, right = heights.length - 1;
    int leftMax = 0, rightMax = 0, water = 0;

    while (left < right) {
        if (heights[left] <= heights[right]) {
            leftMax = Math.max(leftMax, heights[left]);
            water += leftMax - heights[left];
            left++;
        } else {
            rightMax = Math.max(rightMax, heights[right]);
            water += rightMax - heights[right];
            right--;
        }
    }
    return water;
}
```

```
Heights: [0, 0, 4, 0, 0, 6, 0, 0, 3, 0, 5, 0, 1, 0, 0, 0]

        6
  4     █           5
  █     █     3     █
  █     █     █  ░  █
  █  ░  █  ░  █  ░  █
  █  ░  █  ░  █  ░  █  1
──█──░──█──░──█──░──█──█────
  ░ = trapped water
```

**Complexity:** O(n) time, O(1) space.

---

### 17.22 — Word Transformer

**Problem:** Transform one word into another by changing one letter at a time, each step must be a valid word.

**Technique:** BFS (shortest path in word graph) — same as LeetCode "Word Ladder."

```java
List<String> transform(String start, String end, Set<String> dict) {
    Queue<List<String>> queue = new LinkedList<>();
    Set<String> visited = new HashSet<>();
    queue.offer(List.of(start));
    visited.add(start);

    while (!queue.isEmpty()) {
        List<String> path = queue.poll();
        String word = path.get(path.size() - 1);
        if (word.equals(end)) return path;

        for (String neighbor : getNeighbors(word, dict)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                List<String> newPath = new ArrayList<>(path);
                newPath.add(neighbor);
                queue.offer(newPath);
            }
        }
    }
    return Collections.emptyList();
}

List<String> getNeighbors(String word, Set<String> dict) {
    List<String> neighbors = new ArrayList<>();
    char[] chars = word.toCharArray();
    for (int i = 0; i < chars.length; i++) {
        char original = chars[i];
        for (char c = 'a'; c <= 'z'; c++) {
            if (c != original) {
                chars[i] = c;
                String candidate = new String(chars);
                if (dict.contains(candidate)) neighbors.add(candidate);
            }
        }
        chars[i] = original;
    }
    return neighbors;
}
```

---

### 17.23 — Max Black Square

**Problem:** Find the largest subsquare whose borders are all filled (black).

**Technique:** Precompute contiguous black cells going right and down from each cell.

---

### 17.24 — Max Submatrix

**Problem:** Find the submatrix with the largest sum in a 2D matrix.

**Technique:** For each pair of rows, compress columns into a 1D array and apply Kadane's algorithm. Uses 2D prefix sums for efficiency.

**Complexity:** O(rows² × cols).

---

### 17.25 — Word Rectangle

**Problem:** Find the largest rectangle of letters such that every row and column is a valid word.

**Technique:** Group words by length, use trie for column prefix validation, backtracking to build rows.

---

### 17.26 — Sparse Similarity

**Problem:** Given documents as lists of word IDs, compute similarity (Jaccard or cosine) between all pairs with non-zero intersection.

**Technique:** Inverted index — for each word, store which documents contain it. Then for each word, increment the intersection count for all pairs of documents sharing that word.

```java
Map<String, Double> computeSimilarities(Map<Integer, List<Integer>> docs) {
    Map<Integer, List<Integer>> invertedIndex = new HashMap<>();
    for (Map.Entry<Integer, List<Integer>> entry : docs.entrySet()) {
        for (int word : entry.getValue()) {
            invertedIndex.computeIfAbsent(word, k -> new ArrayList<>())
                         .add(entry.getKey());
        }
    }

    Map<String, Integer> pairIntersection = new HashMap<>();
    for (List<Integer> docList : invertedIndex.values()) {
        for (int i = 0; i < docList.size(); i++) {
            for (int j = i + 1; j < docList.size(); j++) {
                String key = docList.get(i) + "," + docList.get(j);
                pairIntersection.merge(key, 1, Integer::sum);
            }
        }
    }

    Map<String, Double> result = new HashMap<>();
    for (Map.Entry<String, Integer> entry : pairIntersection.entrySet()) {
        String[] ids = entry.getKey().split(",");
        int d1 = Integer.parseInt(ids[0]), d2 = Integer.parseInt(ids[1]);
        int intersection = entry.getValue();
        int union = docs.get(d1).size() + docs.get(d2).size() - intersection;
        result.put(entry.getKey(), (double) intersection / union);
    }
    return result;
}
```

---

## Key Patterns and Techniques Summary

| Technique | Problems | Core Idea |
|-----------|----------|-----------|
| **Bit Manipulation** | 17.1, 17.4, 17.19 | XOR for missing/duplicate detection, carry-less addition |
| **Fisher-Yates Shuffle** | 17.2, 17.3 | Uniform random permutations and subsets |
| **Boyer-Moore Voting** | 17.10 | O(1) space majority element detection |
| **Two Heaps** | 17.20 | Streaming median, partition data at median |
| **Sliding Window** | 17.18 | Shortest subarray containing all targets |
| **DP (linear)** | 17.16 | No-adjacent-selection (House Robber pattern) |
| **DP (2D)** | 17.24, 17.6, 17.13 | Submatrix sum, digit counting, word breaking |
| **Trie** | 17.13, 17.15, 17.17, 17.25 | Prefix matching, multi-pattern search |
| **Union-Find** | 17.7 | Grouping equivalences, connected components |
| **BFS** | 17.22 | Word ladder / shortest transformation |
| **LIS** | 17.8 | Longest increasing subsequence via patience sort |
| **Quick Select / Heap** | 17.14 | Kth smallest/largest element |
| **Two-Pointer** | 17.11, 17.21 | Distance minimization, trapping water |
| **Math** | 17.4, 17.6, 17.19 | Sum formulas, digit analysis, equation systems |
| **Inverted Index** | 17.26 | Document similarity, sparse matrix operations |

---

## Difficulty Tier Ranking

| Tier | Problems | Notes |
|------|----------|-------|
| **Hard but Common** | 17.1, 17.2, 17.4, 17.10, 17.14, 17.16, 17.20, 17.21 | Frequently asked in real interviews; master these first |
| **Medium-Hard** | 17.3, 17.5, 17.8, 17.11, 17.12, 17.18, 17.22 | Common patterns with moderate complexity |
| **Genuinely Hard** | 17.6, 17.7, 17.9, 17.13, 17.15, 17.17, 17.19 | Require deep insight or multi-step reasoning |
| **Very Hard** | 17.23, 17.24, 17.25, 17.26 | Complex implementations; rarely asked in full but test important patterns |

---

## Most Frequently Asked Patterns

> If you're short on time, focus on these patterns — they cover the majority of hard interview problems:

```
1. Two Heaps (median, top-k)           ← 17.20
2. Sliding Window (shortest containing) ← 17.18
3. Union-Find (grouping)               ← 17.7
4. BFS word graph (transformations)     ← 17.22
5. Bit manipulation (add/missing)       ← 17.1, 17.4
6. DP (no-adjacent, matrix sum)         ← 17.16, 17.24
7. Quickselect (kth element)            ← 17.14
8. Trie (multi-pattern, word break)     ← 17.13, 17.17
```
