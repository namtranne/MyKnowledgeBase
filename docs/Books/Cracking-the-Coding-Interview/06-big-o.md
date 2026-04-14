# Chapter VI — Big O

> Big O is the language we use to describe the efficiency of algorithms. It's not about exact speed — it's about how an algorithm's runtime or space usage **scales** as the input grows. Mastering Big O is prerequisite to every technical interview.

---

## The Analogy: Electronic Transfer vs. Airplane

Imagine you need to transfer a file to a friend across the country.

| Method | Small File (10 MB) | Large File (1 TB) |
|---|---|---|
| **Electronic transfer** | Seconds | Days |
| **Fly it on a hard drive** | Hours | Hours (same!) |

- **Electronic transfer** scales linearly with file size: **O(s)** where `s` = file size
- **Flying it on a plane** is constant time regardless of size: **O(1)**

```
Time
  │
  │                          ╱ O(s) — Electronic
  │                        ╱
  │                      ╱
  │                    ╱
  │                  ╱
  │                ╱
  │              ╱
  │            ╱
  │──────────╱──────────────── O(1) — Airplane
  │        ╱
  │      ╱
  │    ╱
  │  ╱
  │╱
  └──────────────────────────── File Size
```

For small files, electronic transfer wins. But as size grows, the airplane (constant time) eventually beats the linear approach. **Big O describes this crossover behavior.**

---

## Time Complexity

### Best Case, Worst Case, Expected Case

For an algorithm like linear search through an array:

| Case | Description | Example |
|---|---|---|
| **Best case** | Element is first | O(1) |
| **Worst case** | Element is last or absent | O(N) |
| **Expected case** | Element is somewhere in the middle | O(N) |

> In interviews, **worst case** and **expected case** are what matter. Best case is rarely useful — almost any algorithm has an O(1) best case.

---

## Big O, Big Omega, Big Theta

| Notation | Meaning | Analogy |
|---|---|---|
| **O** (Big O) | Upper bound — "at most this fast-growing" | ≤ (less than or equal) |
| **Ω** (Big Omega) | Lower bound — "at least this fast-growing" | ≥ (greater than or equal) |
| **Θ** (Big Theta) | Tight bound — "exactly this growth rate" | = (equal) |

```
        Θ(N)
       ╱    ╲
      ╱      ╲
   O(N)     Ω(N)
  (upper)  (lower)
```

**Example with quicksort:**
- O(N²) — worst case (upper bound)
- Ω(N log N) — best case (lower bound)
- Θ(N log N) — expected case (tight bound for average)

> **In practice**, when people say "Big O," they usually mean the **tight upper bound** — the tightest accurate description of worst-case or expected-case performance. Saying an O(N) algorithm is O(N²) is technically correct but uselessly imprecise.

---

## Space Complexity

Space complexity measures the **additional memory** an algorithm requires relative to input size.

### What Counts

| Counts as space | Does NOT count |
|---|---|
| Arrays/lists you create | The input itself (usually) |
| Hash maps/sets | Output array (sometimes) |
| Recursive call stack frames | Primitive variables (O(1)) |
| Temporary strings | |

### Stack Space in Recursion

Each recursive call adds a frame to the call stack:

```java
int sum(int n) {
    if (n <= 0) return 0;
    return n + sum(n - 1);
}
```

```
Call stack for sum(4):
┌──────────┐
│ sum(0)   │  ← 4th frame
├──────────┤
│ sum(1)   │  ← 3rd frame
├──────────┤
│ sum(2)   │  ← 2nd frame
├──────────┤
│ sum(3)   │  ← 1st frame
├──────────┤
│ sum(4)   │  ← initial call
└──────────┘

Space: O(N) — N frames on the stack
```

**But** if each call makes two recursive calls, the stack depth is still measured by the **deepest path**, not total calls:

```java
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

```
                    fib(4)             depth 0
                   /      \
               fib(3)    fib(2)        depth 1
              /    \      /    \
          fib(2) fib(1) fib(1) fib(0)  depth 2
          /   \
      fib(1) fib(0)                    depth 3

Time:  O(2^N) — total nodes in the tree
Space: O(N)   — max depth of the tree (call stack)
```

> Time complexity counts **total work** (all nodes). Space complexity counts **simultaneous memory** (max stack depth at any point).

---

## Drop the Constants

Big O describes the **rate of growth**, not exact operations. Constants are irrelevant asymptotically.

| Actual Operations | Big O |
|---|---|
| 2N | O(N) |
| 100N | O(N) |
| N/2 | O(N) |
| N + 1000 | O(N) |

**Why?** Big O is about what happens as N → ∞. At large N:

```
f(N) = 2N     vs.    g(N) = N

  N = 10:       20   vs.   10     (2× difference)
  N = 1,000:  2000   vs. 1000     (2× difference)
  N = 10^9:   2×10^9 vs. 10^9    (still just 2×)
```

The constant factor doesn't change the **shape** of the growth curve. Both are linear.

> **Interview trap:** Don't waste time debating whether your solution is O(N) or O(2N). They're the same. Focus on reducing the **order of growth** — going from O(N²) to O(N log N) is meaningful; going from O(N) to O(N/2) is not.

---

## Drop the Non-Dominant Terms

When you have multiple terms, only the fastest-growing one matters:

| Expression | Big O | Reasoning |
|---|---|---|
| O(N² + N) | O(N²) | N² dominates N |
| O(N + log N) | O(N) | N dominates log N |
| O(5 × 2^N + 1000N²) | O(2^N) | 2^N dominates N² |
| O(N² + B) | O(N² + B) | Can't drop B — it's a different variable |

```
Growth rates (from slowest to fastest):

O(1) < O(log N) < O(N) < O(N log N) < O(N²) < O(2^N) < O(N!)
```

> You can only drop terms of the **same variable**. O(N² + B) stays as-is because N and B are independent.

---

## Multi-Part Algorithms: Add vs. Multiply

This is one of the most common sources of confusion. There are two rules:

### Rule: Add — "Do this, THEN do that"

```java
for (int a : arrA) {    // O(A)
    print(a);
}
for (int b : arrB) {    // O(B)
    print(b);
}
```

**Total: O(A + B)** — The loops are sequential.

### Rule: Multiply — "Do this FOR EACH time you do that"

```java
for (int a : arrA) {         // O(A)
    for (int b : arrB) {     //   × O(B)
        print(a + "," + b);
    }
}
```

**Total: O(A × B)** — For each element in A, we iterate through all of B.

### Decision Diagram

```
Are the loops NESTED?
       │
       ├── YES → MULTIPLY: O(A × B)
       │
       └── NO → Are they sequential?
                    │
                    ├── YES → ADD: O(A + B)
                    │
                    └── NO → Analyze independently
```

> **Common mistake:** Writing O(N²) when loops iterate over **different** arrays. If array A has size A and array B has size B, nested loops are **O(A × B)**, not O(N²). Only write O(N²) when both loops iterate over the **same** input of size N.

---

## Amortized Time

Some operations are usually cheap but occasionally expensive. **Amortized analysis** averages the cost over a sequence of operations.

### ArrayList / Dynamic Array Insertion

```
Capacity: 4    Array: [1, 2, 3, _]

Insert 4:  [1, 2, 3, 4]         → O(1), just append

Insert 5:  Array is full!
           1. Create new array of size 8
           2. Copy [1, 2, 3, 4] to new array     → O(N) copy
           3. Insert 5: [1, 2, 3, 4, 5, _, _, _] → O(1) append
```

The expensive copy happens when the array is full and needs to double:

```
Insert #   Cost   Array Size   Doubles?
  1          1        1          -
  2          2        2          YES (copy 1 + insert)
  3          3        4          YES (copy 2 + insert)
  4          1        4          no
  5          5        8          YES (copy 4 + insert)
  6          1        8          no
  7          1        8          no
  8          1        8          no
  9          9       16          YES (copy 8 + insert)
  ...
```

Total cost for N insertions: `1 + 2 + 4 + 8 + ... + N ≈ 2N`

**Amortized cost per insertion: O(2N) / N = O(1)**

> The key insight: although individual insertions can be O(N), the expensive doublings happen so infrequently that the average cost per insertion is O(1). This is why ArrayList.add() is considered O(1) amortized.

---

## Log N Runtimes

When you see **O(log N)**, think: "the problem is being cut in half at each step."

### Binary Search

```
Find 7 in sorted array: [1, 3, 5, 7, 9, 11, 13]

Step 1: mid = 7  → [1, 3, 5, 7, 9, 11, 13]
                              ^
        7 == 7 → found!

Find 3 in sorted array: [1, 3, 5, 7, 9, 11, 13]

Step 1: mid = 7  → search left half [1, 3, 5]
Step 2: mid = 3  → found!
```

**How many times can you halve N before reaching 1?**

```
N → N/2 → N/4 → N/8 → ... → 1

N / 2^k = 1
2^k = N
k = log₂(N)
```

**Therefore: O(log N) steps.**

### When to Expect O(log N)

| Pattern | Example |
|---|---|
| Halving the search space | Binary search |
| Balanced tree operations | BST lookup, insert, delete |
| Divide and conquer (one side) | Finding a peak element |
| Repeated squaring | Fast exponentiation |
| Number of digits in N | While N > 0: N = N / 10 |

---

## Recursive Runtimes

For recursive functions, the runtime is often:

```
O(branches ^ depth)
```

Where:
- **branches** = number of recursive calls per function call
- **depth** = how deep the recursion goes

### Example: Recursive Fibonacci

```java
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

```
                         fib(5)                    Level 0: 1 call
                       /        \
                   fib(4)      fib(3)              Level 1: 2 calls
                  /    \       /    \
              fib(3) fib(2) fib(2) fib(1)          Level 2: 4 calls
              /  \    / \    / \
          fib(2) fib(1) ... ...                    Level 3: 8 calls
          /  \
      fib(1) fib(0)                                Level 4: ...

Branches = 2 (two recursive calls)
Depth = N
Total nodes ≈ 2^N

Time:  O(2^N)
Space: O(N) — max depth of call stack
```

> **Important nuance:** O(2^N) is an upper bound. The actual number is closer to O(1.6^N) because the right subtree is always smaller. But for interview purposes, O(2^N) is the accepted answer.

---

## Worked Examples

### Example 1: Two Sequential Loops Over Different Arrays

```java
void printBoth(int[] a, int[] b) {
    for (int x : a) print(x);     // O(A)
    for (int y : b) print(y);     // O(B)
}
```

**Runtime: O(A + B)** — sequential loops, ADD. Not O(N) because A and B may differ.

---

### Example 2: Nested Loops Over Same Array

```java
void allPairs(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        for (int j = 0; j < arr.length; j++) {
            print(arr[i] + "," + arr[j]);
        }
    }
}
```

**Runtime: O(N²)** — nested loops, MULTIPLY. Same array of size N.

---

### Example 3: Half the Iterations

```java
void printHalf(int[] arr) {
    for (int i = 0; i < arr.length; i += 2) {
        print(arr[i]);
    }
}
```

**Runtime: O(N)** — iterating N/2 times, but drop the constant. O(N/2) = O(N).

---

### Example 4: String Concatenation in a Loop

```java
String joinWords(String[] words) {
    String sentence = "";
    for (String w : words) {
        sentence = sentence + w;    // creates a NEW string each time
    }
    return sentence;
}
```

Why is this **O(N²)** and not O(N)?

```
Iteration 1: copy 1 char     → 1 operation
Iteration 2: copy 2 chars    → 2 operations
Iteration 3: copy 3 chars    → 3 operations
...
Iteration N: copy N chars    → N operations

Total: 1 + 2 + 3 + ... + N = N(N+1)/2 = O(N²)
```

> **Strings are immutable** in Java and Python. Each concatenation creates an entirely new string, copying all previous characters. Use `StringBuilder` (Java) or `''.join()` (Python) for O(N) instead.

---

### Example 5: Balanced BST Operations

```
         8
        / \
       4   12
      / \  / \
     2  6 10 14

Searching for 10:
  8 → go right → 12 → go left → 10 ✓

Height of balanced BST with N nodes = log₂(N)
```

**Runtime: O(log N)** for search, insert, delete in a balanced BST.

---

### Example 6: Two Different Input Arrays (Nested)

```java
void intersect(int[] a, int[] b) {
    for (int x : a) {
        for (int y : b) {
            if (x == y) print(x);
        }
    }
}
```

**Runtime: O(A × B)** — NOT O(N²). The arrays have independent sizes.

---

### Example 7: Recursive Fibonacci

```java
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

**Runtime: O(2^N)** — 2 branches, depth N.

**Space: O(N)** — max depth of the call stack.

---

### Example 8: Powers of 2 (From 1 to N)

```java
int powersOf2(int n) {
    if (n < 1) return 0;
    if (n == 1) {
        print(1);
        return 1;
    }
    int prev = powersOf2(n / 2);
    int curr = prev * 2;
    print(curr);
    return curr;
}
```

**Runtime: O(log N)** — N is halved each call. Number of calls = log₂(N).

---

### Example 9: Memoized Fibonacci

```java
int fib(int n, int[] memo) {
    if (n <= 1) return n;
    if (memo[n] != 0) return memo[n];
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
    return memo[n];
}
```

```
Without memo:                     With memo:
     fib(5)                            fib(5)
    /      \                          /      \
  fib(4)  fib(3)                   fib(4)  fib(3) ← cached, O(1)
  /    \   /   \                   /    \
fib(3) fib(2) ...              fib(3)  fib(2) ← cached
...                            /    \
                            fib(2)  fib(1) ← cached
                            /    \
                         fib(1) fib(0)

All 2^N nodes computed         Only N nodes computed
```

**Runtime: O(N)** — each value fib(0) through fib(N) is computed exactly once.

**Space: O(N)** — memo array + call stack.

---

### Example 10: Generating Permutations

```java
void permutations(String str, String prefix) {
    if (str.length() == 0) {
        print(prefix);   // print is O(N) for N-length string
        return;
    }
    for (int i = 0; i < str.length(); i++) {
        String rem = str.substring(0, i) + str.substring(i + 1);
        permutations(rem, prefix + str.charAt(i));
    }
}
```

- There are **N!** permutations
- Each permutation has length N
- Printing each takes O(N)

**Runtime: O(N × N!)** — often simplified to O(N!)

---

### Example 11: Sort Then Binary Search

```java
int findElement(int[] arr, int target) {
    Arrays.sort(arr);                        // O(N log N)
    return binarySearch(arr, target);        // O(log N)
}
```

**Runtime: O(N log N + log N) = O(N log N)** — drop the non-dominant term.

---

### Example 12: Sum From 1 to N

**Iterative approach:**

```java
int sum(int n) {
    int total = 0;
    for (int i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}
```

**Runtime: O(N)** — single loop from 1 to N.

**But wait — there's a formula:** `sum = N × (N + 1) / 2`

```java
int sum(int n) {
    return n * (n + 1) / 2;
}
```

**Runtime: O(1)** — constant time with the mathematical formula.

> This illustrates an important principle: sometimes the best optimization isn't a better algorithm — it's a **mathematical insight** that eliminates the algorithm entirely.

---

## Complexity Comparison Table

| Big O | Name | N=10 | N=100 | N=1,000 | N=1,000,000 | Example |
|---|---|---|---|---|---|---|
| O(1) | Constant | 1 | 1 | 1 | 1 | Hash table lookup |
| O(log N) | Logarithmic | 3 | 7 | 10 | 20 | Binary search |
| O(N) | Linear | 10 | 100 | 1,000 | 10⁶ | Linear scan |
| O(N log N) | Linearithmic | 30 | 700 | 10,000 | 2×10⁷ | Merge sort |
| O(N²) | Quadratic | 100 | 10,000 | 10⁶ | 10¹² | Nested loops |
| O(2^N) | Exponential | 1,024 | 1.27×10³⁰ | — | — | Recursive subsets |
| O(N!) | Factorial | 3.6M | — | — | — | Permutations |

```
Operations
    │
10¹²│                                              ╱ O(N!)
    │                                           ╱
    │                                        ╱
10⁹ │                                    ╱  ╱ O(2^N)
    │                                 ╱
    │                              ╱
10⁶ │                      ╱──── O(N²)
    │                   ╱
    │               ╱──── O(N log N)
10³ │           ╱──── O(N)
    │       ╱──── O(log N)
    │───────────── O(1)
  1 │
    └──────────────────────────────── N
     1    10   100  1K   10K  100K
```

---

## Common Interview Traps

### Trap 1: Confusing N With Different Variables

```java
// WRONG: "This is O(N²)"
// CORRECT: "This is O(A × B)"
for (int a : arrayA) {
    for (int b : arrayB) {
        // ...
    }
}
```

### Trap 2: Hidden String Operations

```python
# Each string concatenation is O(K) where K is current length
s = ""
for word in words:    # N words
    s += word         # O(K) copy each time
# Total: O(N × K) or O(N²) if words are similar length
```

### Trap 3: Forgetting Recursion Space

```java
int factorial(int n) {
    if (n == 1) return 1;
    return n * factorial(n - 1);
}
// Time: O(N)    Space: O(N) ← don't forget the stack!
```

### Trap 4: Log Base Doesn't Matter

```
log₂(N) vs. log₁₀(N) vs. ln(N)

log₂(N) = log₁₀(N) / log₁₀(2) = log₁₀(N) × 3.32

They differ by a constant factor → all are O(log N)
```

### Trap 5: Assuming Recursion = Exponential

Not all recursion is O(2^N). Analyze the **branching factor** and **depth**:

| Pattern | Branches | Depth | Runtime |
|---|---|---|---|
| Linear recursion (one call) | 1 | N | O(N) |
| Binary recursion (two calls) | 2 | N | O(2^N) |
| Binary search recursion | 1 | log N | O(log N) |
| Merge sort recursion | 2 | log N | O(N log N)* |

*Merge sort is O(N log N) because each level does O(N) work across all calls.

---

## Space-Time Trade-off Patterns

Many optimizations trade memory for speed. Recognize these patterns:

| Pattern | Time Without | Space Without | Time With | Space With |
|---|---|---|---|---|
| **Memoization** | O(2^N) | O(N) | O(N) | O(N) |
| **Hash set for lookup** | O(N²) | O(1) | O(N) | O(N) |
| **Precomputed prefix sums** | O(N) per query | O(1) | O(1) per query | O(N) |
| **Sorting for search** | O(N) per search | O(1) | O(log N) per search | O(1)* |
| **Adjacency matrix** | O(V) neighbor check | O(V + E) | O(1) neighbor check | O(V²) |

*After the initial O(N log N) sort cost.

> **Interview principle:** When your solution is too slow, ask yourself: "What information could I precompute and store to avoid redundant work?" This almost always points to a hash map, sorted structure, or cached computation.

---

## Quick Reference: How to Determine Big O

```
┌─────────────────────────────────────────────────────────┐
│              BIG O DECISION FRAMEWORK                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Single loop 1→N?              → O(N)                │
│  2. Nested loops (same range)?    → O(N^k) for k loops  │
│  3. Halving each step?            → O(log N)            │
│  4. Loop + halving inside?        → O(N log N)          │
│  5. Two recursive calls?          → O(2^N)              │
│  6. All orderings?                → O(N!)               │
│  7. Different input sizes?        → O(A + B) or O(A×B)  │
│  8. Processing each char/digit?   → O(log N) or O(N)    │
│                                                         │
│  ALWAYS ASK:                                            │
│  • What are the INPUTS? (one array? two? a number?)     │
│  • What WORK is done per iteration?                     │
│  • How does the input SIZE change between calls?        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> Big O is a tool for **communication**. In an interview, clearly stating your algorithm's time and space complexity — and being able to justify it — demonstrates that you truly understand your solution, not just that you memorized it.
