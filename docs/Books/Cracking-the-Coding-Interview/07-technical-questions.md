# Chapter VII — Technical Questions

> The technical interview is a performance. You're not just solving a problem — you're demonstrating how you think, communicate, and write code under pressure. The difference between a "hire" and a "no hire" is often not whether you got the answer, but how you got there.

---

## How to Prepare

### Practice the Right Way

| Do | Don't |
|---|---|
| Solve on paper or whiteboard first | Jump straight into an IDE |
| Time yourself (30-45 min per problem) | Spend hours without progress |
| Study the pattern, not just the solution | Memorize solutions verbatim |
| Talk through your approach out loud | Solve silently in your head |
| Implement without autocomplete | Rely on IDE error highlighting |
| Review and optimize after solving | Move on after first working solution |

### The Practice Loop

```
1. Read problem → understand constraints
2. Try to solve (20-30 min max)
3. If stuck → look at hints (not full solution)
4. If still stuck → study the solution
5. Close the solution → re-implement from scratch
6. Identify the PATTERN → add to your pattern library
7. Revisit in 3-7 days (spaced repetition)
```

> Don't just grind problems. 100 well-understood problems beat 500 problems you vaguely remember. Focus on pattern recognition — most interview problems are variations of ~15 core patterns.

---

## What You Need to Know

### Core Data Structures

| Data Structure | Key Operations | Time Complexity | When to Use |
|---|---|---|---|
| **Array** | Access, append | O(1) access, O(N) search | Indexed data, sequential access |
| **Linked List** | Insert, delete | O(1) insert/delete at known position, O(N) search | Frequent insertions/deletions, no random access needed |
| **Hash Table** | Insert, lookup, delete | O(1) average, O(N) worst | Fast lookup by key, counting, deduplication |
| **Stack** | Push, pop, peek | O(1) all | LIFO: parsing, undo, DFS |
| **Queue** | Enqueue, dequeue, peek | O(1) all | FIFO: BFS, scheduling, buffering |
| **Heap / Priority Queue** | Insert, extract-min/max | O(log N) insert, O(1) peek, O(log N) extract | Top-K, scheduling, merge K sorted |
| **Tree (BST)** | Search, insert, delete | O(log N) balanced, O(N) unbalanced | Sorted data, range queries |
| **Trie** | Insert, search, prefix | O(L) where L = word length | Autocomplete, spell check, prefix matching |
| **Graph** | Add edge, traverse | Varies | Networks, relationships, paths, dependencies |

### Core Algorithms

| Algorithm | Time | Space | When to Use |
|---|---|---|---|
| **BFS** | O(V + E) | O(V) | Shortest path (unweighted), level-order, connected components |
| **DFS** | O(V + E) | O(V) | Path finding, cycle detection, topological sort, connected components |
| **Binary Search** | O(log N) | O(1) | Sorted data, search space reduction |
| **Merge Sort** | O(N log N) | O(N) | Stable sort needed, linked list sort |
| **Quick Sort** | O(N log N) avg | O(log N) | General purpose sort, in-place |
| **Dijkstra's** | O(E log V) | O(V) | Shortest path (weighted, non-negative) |
| **Dynamic Programming** | Varies | Varies | Overlapping subproblems + optimal substructure |
| **Backtracking** | Varies | Varies | Constraint satisfaction, combinatorial generation |

### Must-Know Concepts

```
Data Structures:     Algorithms:          Concepts:
├── Arrays/Strings   ├── Sorting          ├── Big O
├── Linked Lists     ├── Searching        ├── Bit Manipulation
├── Stacks/Queues    ├── BFS / DFS        ├── Recursion
├── Trees / BSTs     ├── Dynamic Prog.    ├── Memoization
├── Heaps            ├── Greedy           ├── Memory (Stack vs Heap)
├── Graphs           ├── Backtracking     └── Concurrency basics
├── Hash Tables      ├── Divide & Conquer
└── Tries            └── Two Pointers
```

---

## Walking Through a Problem: The 7-Step Approach

This is the most important framework in the book. Follow it for EVERY problem.

### Step 1: Listen Carefully

Every detail in the problem statement matters. Details that seem minor often contain crucial constraints.

```
Problem: "Given a sorted array of distinct integers, find a pair that sums to X."

Key details you must catch:
  ✓ "sorted"    → can use binary search or two pointers
  ✓ "distinct"  → no duplicates to worry about
  ✓ "integers"  → could be negative
  ✓ "pair"      → exactly two elements
  ✓ "sums to X" → target is given
```

> If you miss "sorted," you might jump to a hash map solution (O(N) space) when a two-pointer approach (O(1) space) is available and preferred.

---

### Step 2: Draw an Example

Don't use a tiny, trivial, or special-case example. Make it:

| Property | Bad Example | Good Example |
|---|---|---|
| **Specific** | "an array" | [2, 4, 7, 11, 15], target = 18 |
| **Sufficiently large** | [1, 2, 3] | [1, 3, 5, 8, 12, 15, 19, 22] |
| **Not a special case** | [1, 2, 3, 4, 5] (perfectly sequential) | [2, 4, 7, 11, 15] (realistic gaps) |

```
Good example for "find pair summing to 18":

Array: [2, 4, 7, 11, 15]    Target: 18

Walk through manually:
  2 + 15 = 17 (too small, move left pointer right)
  4 + 15 = 19 (too big, move right pointer left)
  4 + 11 = 15 (too small, move left pointer right)
  7 + 11 = 18 ✓ Found!
```

---

### Step 3: State a Brute Force

Always start with the brute force. Even if it's terrible, it:
- Shows you understand the problem
- Gives you a baseline to optimize
- Prevents awkward silence

```
Brute force for pair sum:

for i = 0 to N:
    for j = i+1 to N:
        if arr[i] + arr[j] == target:
            return (i, j)

Time: O(N²)   Space: O(1)

"This works but doesn't use the fact that the array is sorted.
 Let me optimize."
```

> Never start coding the brute force unless the interviewer says it's fine. State it, analyze it, then optimize.

---

### Step 4: Optimize — BUD Analysis

**BUD** stands for **B**ottlenecks, **U**nnecessary Work, **D**uplicated Work.

#### B — Bottlenecks

Identify the step that dominates runtime and focus optimization there.

```
Current: O(N²) for pair sum

Bottleneck: Inner loop searches linearly for complement.
Optimization: Use the sorted property → binary search for complement → O(N log N)
Even better: Two pointers from both ends → O(N)
```

#### U — Unnecessary Work

Are you doing work that doesn't contribute to the answer?

```
Problem: Find a, b, c, d such that a³ + b³ = c³ + d³ (where 1 ≤ a,b,c,d ≤ 1000)

Brute force: Four nested loops → O(N⁴)

Unnecessary work: Once we know a, b, c → d is determined!
  d = ∛(a³ + b³ - c³)
  
Optimization: Three loops + compute d → O(N³)
Even better: Precompute all (a³ + b³) pairs in hash map → O(N²)
```

#### D — Duplicated Work

Are you computing the same thing multiple times?

```
Recursive Fibonacci:
  fib(5) calls fib(3) and fib(4)
  fib(4) also calls fib(3)    ← DUPLICATED

Solution: Memoize → compute each value only once → O(N)
```

---

### Step 5: Walk Through Your Approach

Before writing any code, walk through the optimized algorithm step by step on your example.

```
Two-pointer approach for pair sum:
Array: [2, 4, 7, 11, 15]    Target: 18

left = 0 (value 2), right = 4 (value 15)
  2 + 15 = 17 < 18 → left++

left = 1 (value 4), right = 4 (value 15)
  4 + 15 = 19 > 18 → right--

left = 1 (value 4), right = 3 (value 11)
  4 + 11 = 15 < 18 → left++

left = 2 (value 7), right = 3 (value 11)
  7 + 11 = 18 == 18 → return (2, 3) ✓
```

> This step catches logical errors BEFORE you code. It's much easier to fix a walk-through than to debug written code.

---

### Step 6: Implement — Write Beautiful Code

Now code it. Focus on:

| Quality | How |
|---|---|
| **Modular** | Extract helper functions for complex logic |
| **Error handling** | Check nulls, empty arrays, edge cases |
| **Good naming** | `left`, `right`, `target` — not `i`, `j`, `x` |
| **Clean structure** | Consistent indentation, logical grouping |

```java
int[] findPairSum(int[] arr, int target) {
    if (arr == null || arr.length < 2) return null;
    
    int left = 0;
    int right = arr.length - 1;
    
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) {
            return new int[]{left, right};
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    
    return null;
}
```

### Writing Beautiful Code — Key Principles

```
┌─────────────────────────────────────────────────┐
│           BEAUTIFUL CODE CHECKLIST              │
├─────────────────────────────────────────────────┤
│                                                 │
│  □  Correct — handles all cases                 │
│  □  Efficient — optimal or near-optimal         │
│  □  Simple — no unnecessary complexity          │
│  □  Readable — a stranger can follow it         │
│  □  Maintainable — easy to modify               │
│                                                 │
│  TACTICAL TIPS:                                 │
│  • Use descriptive variable names               │
│  • Extract repeated logic into helper methods   │
│  • Use existing data structures (don't rebuild) │
│  • Handle edge cases explicitly at the top      │
│  • Prefer iteration over recursion when equal   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Step 7: Test

Don't just say "looks good." Systematically verify:

```
Testing Strategy (in order):

1. CONCEPTUAL TEST
   Walk through the code mentally with your earlier example.
   Does each line do what you expect?

2. UNUSUAL / EDGE CASES
   • Empty array → returns null ✓
   • Array of size 1 → left < right is false, returns null ✓
   • No valid pair → left and right cross, returns null ✓
   • Target is very large / very small
   • Negative numbers in array

3. HOT SPOTS (common bug locations)
   • Off-by-one: is it < or <=?
   • Null checks
   • Integer overflow (sum of two large ints)
   • Base cases in recursion

4. SPECIAL CASES
   • Pair at the edges: [1, ..., 17], target = 18
   • Pair adjacent: [..., 8, 10, ...], target = 18
   • All elements the same (if duplicates allowed)
```

> When you find a bug during testing, **don't panic**. Carefully trace through the code to find the exact line causing the issue. Fix it surgically — don't rewrite everything.

---

## The 7 Steps — Visual Summary

```
┌──────────────────────────────────────────────────────────┐
│                  THE 7-STEP APPROACH                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. LISTEN         "The array is sorted and distinct"    │
│       │                                                  │
│       ▼                                                  │
│  2. EXAMPLE        [2, 4, 7, 11, 15], target = 18       │
│       │                                                  │
│       ▼                                                  │
│  3. BRUTE FORCE    Nested loops → O(N²)                  │
│       │                                                  │
│       ▼                                                  │
│  4. OPTIMIZE       BUD → Two pointers → O(N)            │
│       │                                                  │
│       ▼                                                  │
│  5. WALK THROUGH   Trace algorithm on example            │
│       │                                                  │
│       ▼                                                  │
│  6. IMPLEMENT      Clean, modular, error-checked code    │
│       │                                                  │
│       ▼                                                  │
│  7. TEST           Conceptual → edge cases → hot spots   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Optimize & Solve Techniques

When stuck on Step 4 (Optimize), use these techniques:

### Technique 1: Look for BUD

Already covered above. Always start here.

### Technique 2: DIY (Do It Yourself)

Solve the problem **by hand** on a large, realistic example. Your brain's intuitive approach often reveals an efficient algorithm.

```
Problem: "Find the element that appears more than N/2 times"

By hand on [3, 1, 3, 3, 2, 3, 3]:
  "I'd scan through and 3 keeps showing up everywhere..."
  "I could count each element... that's a hash map approach."
  "Or since it's MORE than half, it would survive a
   pairwise elimination..." → Boyer-Moore Voting Algorithm
```

> Your brain doesn't use brute force when solving things intuitively. Pay attention to the shortcuts you naturally take.

### Technique 3: Simplify and Generalize

1. **Simplify** the problem by removing a constraint
2. Solve the simplified version
3. **Generalize** the solution to handle the original constraint

```
Problem: "Find the longest substring with at most K distinct characters"

Simplify: What if K = 1? (longest substring of same character)
  → Simple sliding window, extend while same, contract when different

Simplify: What if K = 2?
  → Sliding window with a hash map tracking character counts

Generalize: Same sliding window approach works for any K!
```

### Technique 4: Base Case and Build

1. Solve for the **base case** (N = 1)
2. Build up to N = 2, N = 3, ...
3. Identify the pattern or recurrence

```
Problem: "Generate all subsets of a set"

N = 0: { {} }
N = 1: { {}, {a} }
N = 2: { {}, {a}, {b}, {a,b} }
N = 3: { {}, {a}, {b}, {a,b}, {c}, {a,c}, {b,c}, {a,b,c} }

Pattern: Subsets(N) = Subsets(N-1) + [each subset in Subsets(N-1) with element N added]
```

### Technique 5: Data Structure Brainstorm

Run through data structures and ask: "Would using X make this easier?"

```
Problem: "Find the K-th largest element in a stream"

  Array?     → Sort each time → O(N log N) per query       ✗
  Linked List → Insert in order → O(N) per insert           ✗
  BST?       → O(log N) insert, O(log N) find k-th         ✓
  Heap?      → Min-heap of size K → O(log K) per insert    ✓✓
  Hash Map?  → Doesn't help with ordering                   ✗

Winner: Min-heap of size K
  • Insert: add to heap, if size > K, remove min → O(log K)
  • Query: peek at min → O(1)
```

---

## Best Conceivable Runtime (BCR)

The BCR is the theoretical lower bound on the best possible runtime. Use it to guide your optimization.

### How to Determine BCR

Ask: "What's the minimum work any algorithm MUST do?"

```
Problem: "Find if array A contains all elements of array B"

BCR Analysis:
  • Must look at every element of B → at least O(B)
  • Must look at every element of A → at least O(A)
  • BCR = O(A + B)

Current solution: Sort A, binary search each element of B
  → O(A log A + B log A)

Gap: Current has log factors that BCR doesn't
  → Can we eliminate sorting? 
  → YES: Use a hash set of A, check each element of B
  → O(A + B) ← matches BCR!
```

### BCR as an Optimization Guide

```
Current Runtime     BCR          Action
─────────────────────────────────────────
O(N²)            → O(N)       → Big gap! Major optimization possible
O(N log N)       → O(N)       → Moderate gap — can you eliminate sorting?
O(N)             → O(N)       → At BCR! Focus on constant factor optimizations
O(N log N)       → O(N log N) → At BCR! You're done optimizing
```

> **Critical insight:** If your algorithm matches the BCR, you CANNOT do better (in terms of Big O). Stop optimizing and focus on clean implementation.

> **Also:** BCR tells you about time, but you might still be able to optimize space. An O(N) time + O(N) space solution might become O(N) time + O(1) space.

---

## Pattern Recognition Guide

Most interview problems follow recognizable patterns. Learning to identify the pattern is the single most valuable interview skill.

### The Major Patterns

| Pattern | When to Use | Key Signal |
|---|---|---|
| **Two Pointers** | Sorted array, pair finding, palindrome | "sorted," "pair," "two ends" |
| **Sliding Window** | Subarray/substring with constraint | "contiguous," "substring," "at most K" |
| **Fast & Slow Pointers** | Cycle detection, middle of list | "linked list," "cycle," "middle" |
| **Merge Intervals** | Overlapping intervals | "intervals," "schedule," "overlap" |
| **Binary Search** | Sorted data, search space | "sorted," "minimum that satisfies," "rotated" |
| **BFS** | Shortest path, level-order | "shortest," "minimum steps," "level by level" |
| **DFS / Backtracking** | All paths, permutations, combinations | "all possible," "generate all," "can you reach" |
| **Dynamic Programming** | Optimization with overlapping subproblems | "minimum cost," "number of ways," "longest" |
| **Topological Sort** | Dependency ordering | "prerequisites," "build order," "course schedule" |
| **Union Find** | Connected components, grouping | "connected," "group," "equivalent" |
| **Monotonic Stack** | Next greater/smaller element | "next greater," "stock span," "histogram" |
| **Trie** | Prefix matching, word search | "prefix," "autocomplete," "word dictionary" |
| **Heap / Priority Queue** | Top-K, merge sorted, scheduling | "K largest," "merge K sorted," "median" |

### Pattern Decision Tree

```
What type of input?
│
├── Array/String
│   ├── Sorted? → Two Pointers or Binary Search
│   ├── Subarray/substring? → Sliding Window
│   ├── All combinations? → Backtracking
│   └── Optimization? → Dynamic Programming
│
├── Linked List
│   ├── Cycle? → Fast & Slow Pointers
│   ├── Merge? → Two Pointers
│   └── Reverse? → Iterative or Recursive
│
├── Tree
│   ├── Level order? → BFS
│   ├── Path/subtree? → DFS
│   └── BST property? → In-order traversal
│
├── Graph
│   ├── Shortest path (unweighted)? → BFS
│   ├── Shortest path (weighted)? → Dijkstra / Bellman-Ford
│   ├── Connectivity? → DFS / Union Find
│   ├── Ordering? → Topological Sort
│   └── All paths? → DFS + Backtracking
│
└── Other
    ├── Top-K? → Heap
    ├── Intervals? → Sort + Merge
    ├── Design? → Hash Map + appropriate structure
    └── Bit manipulation? → XOR, masks, shifts
```

---

## Sliding Window — Deep Dive

The sliding window is one of the most frequently tested patterns.

### Template

```python
def sliding_window(arr, k):
    window_start = 0
    result = 0
    window_state = {}  # or other tracking structure
    
    for window_end in range(len(arr)):
        # Expand: add arr[window_end] to window state
        
        # Shrink: while window constraint is violated
        while constraint_violated(window_state):
            # Remove arr[window_start] from window state
            window_start += 1
        
        # Update result
        result = max(result, window_end - window_start + 1)
    
    return result
```

### When to Use

- "Find the longest/shortest substring/subarray with..."
- "Maximum sum subarray of size K"
- "Smallest window containing all characters of..."

---

## Two Pointers — Deep Dive

### Template: Opposite Ends

```python
def two_pointer_opposite(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        current = arr[left] + arr[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1
    return []
```

### Template: Same Direction

```python
def two_pointer_same(arr):
    slow = 0
    for fast in range(len(arr)):
        if condition(arr[fast]):
            arr[slow] = arr[fast]
            slow += 1
    return slow  # new length
```

---

## What to Do When You're Stuck

```
┌─────────────────────────────────────────────────────┐
│              WHEN YOU'RE STUCK                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. DON'T go silent. Talk through what you know.    │
│                                                     │
│  2. Re-read the problem. Did you miss a constraint? │
│                                                     │
│  3. Try a different example. Smaller or bigger.     │
│                                                     │
│  4. Solve it by hand. What does your brain do?      │
│                                                     │
│  5. Think about related problems you've seen.       │
│                                                     │
│  6. Consider a different data structure.            │
│                                                     │
│  7. Think about what information you're not using.  │
│                                                     │
│  8. Solve a simpler version first.                  │
│                                                     │
│  9. Ask the interviewer for a hint (it's OK!).      │
│                                                     │
│  10. DON'T GIVE UP.                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

> Getting a hint and then solving the problem is MUCH better than sitting in silence. Interviewers expect to give hints — it's part of the process. What they're looking for is how you respond to the hint and whether you can run with it.

---

## Don't Give Up

The interview is not a pass/fail on "did you get the optimal answer." Interviewers evaluate the entire journey:

| What They Evaluate | Weight |
|---|---|
| Problem-solving approach | ████████░░ High |
| Communication | ████████░░ High |
| Code quality | ██████░░░░ Medium |
| Optimal solution | ██████░░░░ Medium |
| Testing thoroughness | ████░░░░░░ Medium |
| Speed | ████░░░░░░ Lower |

A candidate who gets to an O(N log N) solution with clear communication, clean code, and good testing beats a candidate who silently produces an O(N) solution with bugs.

> **The interviewer is your ally, not your adversary.** They want you to succeed. Show them how you think, engage with their hints, and demonstrate that you'd be a great colleague to solve problems with.
