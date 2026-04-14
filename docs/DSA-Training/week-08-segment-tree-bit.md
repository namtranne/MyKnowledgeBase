---
sidebar_position: 9
title: "Week 8: Segment Tree + BIT"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 8: Segment Tree + BIT

## Why This Week Matters

Many interview and competitive programming problems boil down to: **"answer range queries efficiently while handling updates."** Brute force gives O(n) per query; prefix sums handle static arrays but break on updates. Segment trees and Binary Indexed Trees (BITs) fill this gap — O(log n) per query *and* per update. Mastering them opens the door to problems that seem impossibly hard at first glance.

---

## Core Theory

### 1. Segment Tree

A segment tree is a full binary tree where each node stores an aggregate (sum, min, max, gcd, ...) over a contiguous subarray. The root covers the entire array; leaves cover individual elements.

**Why this technique exists.** Prefix sums give O(1) range queries on static arrays, but they break when the array is updated — rebuilding prefix sums costs O(n) per update. A naive approach gives either O(1) query and O(n) update, or O(n) query and O(1) update. Segment trees achieve O(log n) for both operations, the best possible for a comparison-based data structure. They are the universal tool for "range query + point/range update" problems.

**The intuition — a real-world analogy.** Imagine a company with a hierarchical reporting structure. Each team lead knows the total sales of their team. Each department head knows the total of their department (sum of teams). The CEO knows the company total. If one salesperson's number changes, only their team lead, department head, and the CEO need to update — O(log n) nodes, not the entire organization. To query "total sales of divisions 3 through 7," you combine a few pre-computed subtotals rather than summing every individual. This hierarchical aggregation is exactly what a segment tree does.

**Common mistakes beginners make.** (1) Allocating tree array of size 2*n instead of 4*n — for non-power-of-2 array sizes, 2*n is insufficient. Always use 4*n. (2) Forgetting to push down lazy values before recursing into children during both update and query operations. (3) Confusing the merge operation — for sum it is addition, for min/max it is Math.min/max, for GCD it is gcd(). The merge must be associative. (4) Off-by-one errors in boundary checks: the base case is `start == end`, not `start >= end`.

**Key operations:**

| Operation | Description | Time |
|---|---|---|
| **Build** | Construct tree from array | O(n) |
| **Point update** | Change one element, propagate up | O(log n) |
| **Range query** | Query aggregate over `[l, r]` | O(log n) |

**Array-based layout (1-indexed):**
- Root at index 1.
- Left child of node `i` → `2*i`, right child → `2*i + 1`.
- Tree array size: `4 * n` (safe upper bound).

#### Complete Segment Tree Template (Sum)

```java
import java.util.*;

class SegmentTree {
    int n;
    int[] tree;

    SegmentTree(int[] data) {
        this.n = data.length;
        this.tree = new int[4 * n];
        if (n > 0) build(data, 1, 0, n - 1);
    }

    private void build(int[] data, int node, int start, int end) {
        if (start == end) { tree[node] = data[start]; return; }
        int mid = (start + end) / 2;
        build(data, 2 * node, start, mid);
        build(data, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    void update(int idx, int val) { update(idx, val, 1, 0, n - 1); }

    private void update(int idx, int val, int node, int start, int end) {
        if (start == end) { tree[node] = val; return; }
        int mid = (start + end) / 2;
        if (idx <= mid) update(idx, val, 2 * node, start, mid);
        else update(idx, val, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    int query(int l, int r) { return query(l, r, 1, 0, n - 1); }

    private int query(int l, int r, int node, int start, int end) {
        if (r < start || end < l) return 0;
        if (l <= start && end <= r) return tree[node];
        int mid = (start + end) / 2;
        return query(l, r, 2 * node, start, mid)
             + query(l, r, 2 * node + 1, mid + 1, end);
    }
}
```

---

<AlgoViz title="Segment Tree — Build, Point Update, Range Query" description="Build sum segment tree on [1, 3, 5, 7]. Update index 2 to 6. Query sum(1, 3)." steps={[
  { array: [0, 0, 0, 0, 1, 3, 5, 7], highlights: [4, 5, 6, 7], labels: {"4":"[0,0]","5":"[1,1]","6":"[2,2]","7":"[3,3]"}, variables: { phase: "Build: leaves" }, explanation: "Build: recursion reaches leaves. tree[4]=1, tree[5]=3, tree[6]=5, tree[7]=7.", code: "if (start == end) { tree[node] = data[start]; return; }" },
  { array: [0, 16, 4, 12, 1, 3, 5, 7], highlights: [1, 2, 3], variables: { phase: "Build: complete" }, explanation: "Build internal nodes: tree[2]=1+3=4, tree[3]=5+7=12, tree[1]=4+12=16. Root = total sum.", code: "tree[node] = tree[2*node] + tree[2*node+1];" },
  { array: [0, 16, 4, 12, 1, 3, 6, 7], highlights: [6], variables: { phase: "Update idx=2, val=6" }, explanation: "Point update(2, 6): navigate to leaf tree[6] covering index 2. Set tree[6]=6.", code: "if (start == end) { tree[node] = val; return; }" },
  { array: [0, 17, 4, 13, 1, 3, 6, 7], highlights: [3, 1], variables: { phase: "Update: propagate" }, explanation: "Propagate upward: tree[3]=6+7=13, tree[1]=4+13=17. O(log n) nodes updated.", code: "tree[node] = tree[2*node] + tree[2*node+1];" },
  { array: [0, 17, 4, 13, 1, 3, 6, 7], highlights: [1], variables: { query: "sum(1,3)", node: "[0,3]" }, explanation: "Query sum(1,3): root [0,3] partially overlaps [1,3]. Recurse both children.", code: "// l=1, r=3 partially overlaps [0,3]" },
  { array: [0, 17, 4, 13, 1, 3, 6, 7], highlights: [5], secondary: [4], variables: { query: "left", result: "0+3=3" }, explanation: "Left: [0,1] partial. [0,0] out of range returns 0. [1,1] fully covered returns 3. Sum=3.", code: "return 0 + 3; // [0,0] miss, [1,1] hit" },
  { array: [0, 17, 4, 13, 1, 3, 6, 7], highlights: [3], variables: { query: "right", result: "13" }, explanation: "Right: [2,3] fully within [1,3]. Return tree[3]=13 directly. No recursion needed.", code: "if (l <= start && end <= r) return tree[node];" },
  { array: [0, 17, 4, 13, 1, 3, 6, 7], highlights: [3, 5], variables: { result: "3 + 13 = 16" }, explanation: "Combine: 3+13=16. After updating idx 2 (5→6), sum(1,3) = 3+6+7 = 16. O(log n) per op.", code: "return 16;" }
]} />

### 2. Lazy Propagation

When you need **range updates** (e.g., "add 5 to every element in `[l, r]`"), updating each element individually costs O(n log n). Lazy propagation defers updates: mark a node as "pending" and only push the update to children when you actually visit them.

**Core idea:** Each node carries a `lazy` value. Before accessing children, **push down** the pending update.

#### Complete Lazy Segment Tree Template (Range Add + Range Sum)

```java
class LazySegmentTree {
    int n;
    long[] tree, lazy;

    LazySegmentTree(int[] data) {
        this.n = data.length;
        tree = new long[4 * n];
        lazy = new long[4 * n];
        if (n > 0) build(data, 1, 0, n - 1);
    }

    private void build(int[] data, int node, int start, int end) {
        if (start == end) { tree[node] = data[start]; return; }
        int mid = (start + end) / 2;
        build(data, 2 * node, start, mid);
        build(data, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    private void pushDown(int node, int start, int end) {
        if (lazy[node] != 0) {
            int mid = (start + end) / 2;
            apply(2 * node, start, mid, lazy[node]);
            apply(2 * node + 1, mid + 1, end, lazy[node]);
            lazy[node] = 0;
        }
    }

    private void apply(int node, int start, int end, long val) {
        tree[node] += val * (end - start + 1);
        lazy[node] += val;
    }

    void updateRange(int l, int r, long val) { updateRange(l, r, val, 1, 0, n - 1); }

    private void updateRange(int l, int r, long val, int node, int start, int end) {
        if (r < start || end < l) return;
        if (l <= start && end <= r) { apply(node, start, end, val); return; }
        pushDown(node, start, end);
        int mid = (start + end) / 2;
        updateRange(l, r, val, 2 * node, start, mid);
        updateRange(l, r, val, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    long query(int l, int r) { return query(l, r, 1, 0, n - 1); }

    private long query(int l, int r, int node, int start, int end) {
        if (r < start || end < l) return 0;
        if (l <= start && end <= r) return tree[node];
        pushDown(node, start, end);
        int mid = (start + end) / 2;
        return query(l, r, 2 * node, start, mid)
             + query(l, r, 2 * node + 1, mid + 1, end);
    }
}
```

---

<AlgoViz title="Lazy Propagation — Range Update with Deferred Push" description="Array [1,3,5,7]. Range add +2 to indices [1,3], then query. Shows lazy deferral and pushDown." steps={[
  { array: [0, 16, 4, 12, 1, 3, 5, 7], highlights: [1], labels: {"1":"[0,3]","2":"[0,1]","3":"[2,3]"}, variables: { lazy: "all 0" }, explanation: "Built tree from [1,3,5,7]. tree[1]=16 (total), tree[2]=4, tree[3]=12. No pending lazy values yet.", code: "build(data, 1, 0, n-1);" },
  { array: [0, 16, 4, 12, 1, 3, 5, 7], highlights: [1], variables: { op: "rangeAdd([1,3], +2)", node: "[0,3] partial" }, explanation: "Range add +2 to [1,3]: root [0,3] partially overlaps. Must recurse to children.", code: "updateRange(1, 3, 2, 1, 0, 3);" },
  { array: [0, 16, 6, 12, 1, 5, 5, 7], highlights: [5], variables: { node: "[1,1] fully covered" }, explanation: "Left subtree: [0,0] out of range. [1,1] fully covered — apply: tree[5]+=2. tree[2]=1+5=6.", code: "apply(node, start, end, val); // +2*1" },
  { array: [0, 22, 6, 16, 1, 5, 5, 7], highlights: [3], variables: { node: "[2,3] fully covered", lazy_3: "2" }, explanation: "Right [2,3]: fully covered by [1,3]. Apply lazily: tree[3]+=2*2=16, lazy[3]=2. Children NOT visited!", code: "apply(3, 2, 3, 2); // tree[3]+=4, lazy[3]=2" },
  { array: [0, 22, 6, 16, 1, 5, 5, 7], highlights: [1], variables: { query_full: "sum(0,3)=22", lazy_3: "2 (deferred)" }, explanation: "tree[1]=6+16=22. Query sum(0,3): root fully covered, return 22. Lazy at node 3 stays deferred.", code: "if (l <= start && end <= r) return tree[node];" },
  { array: [0, 22, 6, 16, 1, 5, 5, 7], highlights: [3], variables: { query: "sum(2,2)", action: "pushDown needed" }, explanation: "Query sum(2,2): node [2,3] has lazy=2 but query needs only [2,2]. Must pushDown before recursing.", code: "pushDown(node, start, end);" },
  { array: [0, 22, 6, 16, 1, 5, 7, 9], highlights: [6, 7], secondary: [3], variables: { pushed: "lazy→children", lazy_3: "0" }, explanation: "PushDown: tree[6]+=2=7, tree[7]+=2=9. lazy[3] cleared to 0. Children now have correct values.", code: "apply(2*node, ..., lazy[node]); lazy[node]=0;" },
  { array: [0, 22, 6, 16, 1, 5, 7, 9], highlights: [6], variables: { query: "sum(2,2)", result: "7" }, explanation: "Now tree[6]=7 (leaf for idx 2). Return 7. Lazy propagation: O(log n) for both range update and query.", code: "return tree[6]; // was 5, now 7 after +2" }
]} />

### 3. Fenwick Tree (Binary Indexed Tree / BIT)

A BIT is a compact data structure for **prefix sums with point updates**. It uses the binary representation of indices to determine which ranges each position is responsible for.

**Why BIT over segment tree?** When your problem only requires point updates and prefix/range sum queries (or any invertible operation like XOR), a BIT does the same job with half the code and a smaller constant factor. It is the preferred tool for counting inversions, tracking order statistics, and solving "count of smaller elements" problems. Reserve segment trees for when you need lazy propagation or non-invertible operations (min/max with updates).

**The intuition — a real-world analogy.** Think of a BIT like a hierarchical accounting ledger. Instead of one row per transaction (too many to scan) or one grand total (can not update efficiently), you keep subtotals at carefully chosen intervals. The "lowest set bit" trick ensures each index is responsible for a specific range: index 8 (binary 1000) covers 8 elements, index 12 (binary 1100) covers 4 elements, index 14 (binary 1110) covers 2 elements. To query a prefix sum, you hop through O(log n) subtotals. To update a value, you propagate through O(log n) subtotals that include that index.

**Key insight:** `i & (-i)` (lowest set bit) determines the range length that position `i` covers.

| Operation | Description | Time |
|---|---|---|
| **Point update** | Add a value to index `i` | O(log n) |
| **Prefix query** | Sum of `[1, i]` | O(log n) |
| **Range query** | Sum of `[l, r]` = `prefix(r) - prefix(l-1)` | O(log n) |

#### Complete BIT Template (1-indexed)

```java
class BIT {
    int n;
    int[] tree;

    BIT(int n) {
        this.n = n;
        this.tree = new int[n + 1];
    }

    // Add delta to index i (1-indexed).
    void update(int i, int delta) {
        while (i <= n) { tree[i] += delta; i += i & (-i); }
    }

    // Prefix sum [1, i].
    int query(int i) {
        int s = 0;
        while (i > 0) { s += tree[i]; i -= i & (-i); }
        return s;
    }

    // Sum of [l, r] (1-indexed).
    int rangeQuery(int l, int r) {
        return query(r) - query(l - 1);
    }

    // Build BIT from 0-indexed array.
    static BIT fromArray(int[] arr) {
        BIT bit = new BIT(arr.length);
        for (int i = 0; i < arr.length; i++) bit.update(i + 1, arr[i]);
        return bit;
    }
}
```

---

<AlgoViz title="Binary Indexed Tree (BIT) — Update and Prefix Query" description="Build BIT from [1, 3, 2, 4]. Each tree[i] covers a range determined by its lowest set bit. 1-indexed." steps={[
  { array: [0, 0, 0, 0, 0], highlights: [], labels: {"0":"unused","1":"i=1","2":"i=2","3":"i=3","4":"i=4"}, variables: { input: "[1, 3, 2, 4]" }, explanation: "Initialize BIT of size 4 (1-indexed). tree[0] is unused. Build by updating each element.", code: "BIT bit = new BIT(4);" },
  { array: [0, 1, 4, 2, 10], highlights: [1, 2, 3, 4], labels: {"1":"[1,1]","2":"[1,2]","3":"[3,3]","4":"[1,4]"}, variables: { built: "true" }, explanation: "After inserting all: tree[1]=1 (covers [1,1]), tree[2]=4 (covers [1,2]), tree[3]=2 (covers [3,3]), tree[4]=10 (covers [1,4]).", code: "for (i = 0; i < arr.length; i++) bit.update(i+1, arr[i]);" },
  { array: [0, 1, 4, 2, 10], highlights: [3], variables: { query: "prefix(3)", i: "3", sum: "0+tree[3]=2" }, explanation: "Query prefix sum [1..3]: Start at i=3. sum += tree[3]=2. Next: i -= lowbit(3)=1, so i=2.", code: "s += tree[3]; i -= (3 & -3); // i=2" },
  { array: [0, 1, 4, 2, 10], highlights: [2], variables: { query: "prefix(3)", i: "2", sum: "2+tree[2]=6" }, explanation: "i=2: sum += tree[2]=4. Total=6. i -= lowbit(2)=2, so i=0. Stop. prefix(3) = 6 (=1+3+2).", code: "s += tree[2]; i -= (2 & -2); // i=0" },
  { array: [0, 1, 4, 2, 10], highlights: [4], variables: { query: "prefix(4)", sum: "tree[4]=10" }, explanation: "Query prefix(4): i=4, sum=tree[4]=10. i -= lowbit(4)=4, so i=0. Done in 1 hop! prefix(4)=10.", code: "s += tree[4]; // covers [1,4] entirely" },
  { array: [0, 1, 4, 2, 10], highlights: [], variables: { rangeQuery: "sum(2,4)", result: "prefix(4)-prefix(1)=10-1=9" }, explanation: "Range query sum(2,4) = prefix(4) - prefix(1) = 10 - 1 = 9. Verify: 3+2+4=9.", code: "return query(4) - query(1); // 10-1=9" },
  { array: [0, 1, 9, 2, 15], highlights: [2, 4], variables: { update: "add 5 to index 2", path: "tree[2], tree[4]" }, explanation: "Point update: add 5 to index 2. tree[2]+=5=9. i+=lowbit(2)=2, so i=4. tree[4]+=5=15.", code: "tree[2]+=5; tree[4]+=5; // propagate up" },
  { array: [0, 1, 9, 2, 15], highlights: [], variables: { newPrefix3: "2+9=11", verify: "1+8+2=11" }, explanation: "After update: prefix(3) = tree[3]+tree[2] = 2+9 = 11. Array is now [1,8,2,4]. O(log n) per op.", code: "// Each operation touches O(log n) indices" }
]} />

### 4. When to Use What

| Criteria | BIT | Segment Tree | Sparse Table |
|---|---|---|---|
| **Point update + range query** | ✅ Preferred (simpler) | ✅ Works | ❌ Static only |
| **Range update + range query** | ⚠️ Possible with 2 BITs | ✅ Lazy propagation | ❌ |
| **Range min/max query (static)** | ❌ | ✅ | ✅ Preferred (O(1) query) |
| **Range min/max query (dynamic)** | ❌ | ✅ Preferred | ❌ |
| **Order statistics (kth element)** | ✅ With binary search on BIT | ✅ Walk the tree | ❌ |
| **2D range queries** | ✅ 2D BIT (simpler) | ✅ 2D seg tree | ❌ |
| **Code complexity** | Low | Medium–High | Low |
| **Constant factor** | Small | Larger | Smallest |

**Rule of thumb:** If a BIT can solve it, use a BIT. Reach for segment tree when you need lazy propagation, non-invertible operations (min/max with updates), or complex merge logic.

---

## Complexity Reference

| Structure | Build | Point Update | Range Update | Point Query | Range Query | Space |
|---|---|---|---|---|---|---|
| **Segment Tree** | O(n) | O(log n) | O(log n)* | O(log n) | O(log n) | O(4n) |
| **Lazy Segment Tree** | O(n) | O(log n) | O(log n) | O(log n) | O(log n) | O(4n) |
| **BIT** | O(n) | O(log n) | O(log n)** | O(log n) | O(log n) | O(n) |
| **Sparse Table** | O(n log n) | ❌ | ❌ | — | O(1)*** | O(n log n) |

\* With lazy propagation  
\** Range update with BIT requires the difference-array trick (two BITs)  
\*** For idempotent operations (min, max, gcd) only

---

## Worked Example: Range Sum Query – Mutable (LC 307)

### Problem

Given an integer array `nums`, implement:
- `update(index, val)` — set `nums[index] = val`
- `sumRange(left, right)` — return sum of `nums[left..right]`

### Segment Tree Trace

**Input:** `nums = [1, 3, 5]`

**Step 1 — Build:**

```
Array indices:  0  1  2
Values:         1  3  5

Tree (1-indexed internal nodes):

         node 1: [0,2] sum=9
        /                    \
  node 2: [0,1] sum=4     node 3: [2,2] sum=5
    /          \
node 4: [0,0]  node 5: [1,1]
   sum=1          sum=3
```

Tree array after build: `[_, 9, 4, 5, 1, 3, _, _]`

**Step 2 — `sumRange(0, 2)`:**

```
query(0, 2) at node 1, range [0,2]:
  l=0 ≤ start=0 and end=2 ≤ r=2  →  return tree[1] = 9  ✅
```

**Step 3 — `update(1, 2)` (change index 1 from 3 to 2):**

```
update(1, 2) at node 1, range [0,2]:
  idx=1 ≤ mid=1  →  go left
  update(1, 2) at node 2, range [0,1]:
    idx=1 > mid=0  →  go right
    update(1, 2) at node 5, range [1,1]:
      start==end  →  tree[5] = 2
    tree[2] = tree[4] + tree[5] = 1 + 2 = 3
  tree[1] = tree[2] + tree[3] = 3 + 5 = 8
```

Tree array after update: `[_, 8, 3, 5, 1, 2, _, _]`

**Step 4 — `sumRange(0, 2)`:**

```
query(0, 2) at node 1  →  return tree[1] = 8  ✅
```

<AlgoViz title="Segment Tree — Build, Update, and Query" description="Sum segment tree on nums=[1, 3, 5]. Array shows the tree[] (1-indexed internal nodes, size 8)." steps={[
  { array: [0, 0, 0, 0, 0, 0, 0, 0], highlights: [], variables: { phase: "Build start" }, explanation: "Initialize tree array of size 4*n. All zeros.", code: "int[] tree = new int[4 * n];" },
  { array: [0, 0, 0, 5, 1, 3, 0, 0], highlights: [3, 4, 5], variables: { phase: "Leaves filled" }, explanation: "Recursion reaches leaves: tree[4]=1 (idx 0), tree[5]=3 (idx 1), tree[3]=5 (idx 2).", code: "if (start == end) tree[node] = data[start];" },
  { array: [0, 9, 4, 5, 1, 3, 0, 0], highlights: [1, 2], variables: { phase: "Build complete" }, explanation: "Internal nodes: tree[2]=1+3=4, tree[1]=4+5=9. Build complete.", code: "tree[node] = tree[2*node] + tree[2*node+1];" },
  { array: [0, 9, 4, 5, 1, 3, 0, 0], highlights: [1], variables: { query: "sumRange(0,2)", result: "9" }, explanation: "Query sumRange(0,2): root covers [0,2] fully, return tree[1]=9.", code: "if (l <= start && end <= r) return tree[node];" },
  { array: [0, 8, 3, 5, 1, 2, 0, 0], highlights: [5, 2, 1], variables: { update: "update(1, 2)" }, explanation: "Update idx 1 to 2: tree[5]=2, tree[2]=1+2=3, tree[1]=3+5=8.", code: "tree[5]=2; // propagate up" },
  { array: [0, 8, 3, 5, 1, 2, 0, 0], highlights: [5, 3], variables: { query: "sumRange(1,2)", result: "7" }, explanation: "Query sumRange(1,2): left subtree gives 2, right gives 5. Total=7.", code: "return query(left) + query(right); // 2+5" }
]} />

**Step 5 — `sumRange(1, 2)`:**

```
query(1, 2) at node 1, range [0,2]:
  partial overlap  →  recurse
  left: query(1, 2) at node 2, range [0,1]:
    partial overlap  →  recurse
    left: query(1, 2) at node 4, range [0,0]:
      r=2 ≥ start=0 but l=1 > end=0  →  return 0
    right: query(1, 2) at node 5, range [1,1]:
      l=1 ≤ 1 and 1 ≤ r=2  →  return 2
    return 0 + 2 = 2
  right: query(1, 2) at node 3, range [2,2]:
    l=1 ≤ 2 and 2 ≤ r=2  →  return 5
  return 2 + 5 = 7  ✅
```

---

## Pattern Recognition Guide

| Pattern / Clue | Technique |
|---|---|
| "Range sum/min/max with point updates" | Segment tree or BIT |
| "Range update + range query" | Lazy segment tree (or 2-BIT trick for sums) |
| "Count of elements < X in a range" | Merge sort tree or BIT with coordinate compression |
| "Dynamic order statistics (kth smallest)" | Segment tree on values (walk left/right) |
| "Number of inversions" | BIT — process right to left, query prefix |
| "Interval scheduling with overlap counting" | Difference array or lazy segment tree |
| "Sweep line + event counting" | Sort events, process with BIT/segment tree |
| "2D range sum with updates" | 2D BIT or 2D segment tree |
| "Online queries in sorted order" | Persistent segment tree |
| "Count of distinct elements in range" | Offline + BIT (last occurrence trick) |

---

## Problem Set — 21 Problems over 7 Days

### Days 1–2: Fundamentals — BIT & Basic Segment Tree (6 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 1 | Range Sum Query – Mutable | 307 | Medium | Segment tree or BIT | The canonical problem — implement both ways |
| 2 | Range Sum Query 2D – Mutable | 308 | Hard | 2D BIT | Extend BIT to 2 dimensions |
| 3 | Count of Smaller Numbers After Self | 315 | Hard | BIT + coordinate compression | Process right to left, BIT on values |
| 4 | My Calendar I | 729 | Medium | Segment tree (or sorted list) | Check overlap before inserting interval |
| 5 | My Calendar III | 732 | Hard | Lazy segment tree (range add, range max) | Max overlap = max value in the range |
| 6 | Count of Range Sum | 327 | Hard | BIT + coordinate compression (or merge sort) | Count prefix sums in [lower, upper] window |

### Days 3–4: Intermediate — Lazy Propagation & Advanced Queries (8 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 7 | Reverse Pairs | 493 | Hard | BIT or merge sort | Similar to inversions but with 2x condition |
| 8 | Create Sorted Array through Instructions | 1649 | Hard | BIT on values | For each insertion, query count < val and count > val |
| 9 | Longest Increasing Subsequence II | 2407 | Hard | Segment tree (range max query) | dp[v] = 1 + max(dp[v-k..v-1]), use seg tree for range max |
| 10 | Falling Squares | 699 | Hard | Lazy segment tree (range set, range max) | Coordinate compress, range-set height, query max |
| 11 | Rectangle Area II | 850 | Hard | Sweep line + segment tree | Sweep vertical, segment tree tracks horizontal coverage |
| 12 | Range Module | 715 | Hard | Lazy segment tree (range set, range query) | Track boolean intervals, add/remove/query ranges |
| 13 | Online Majority Element In Subarray | 1157 | Hard | Segment tree + randomization or merge | Random sampling or segment tree storing candidates |
| 14 | Booking Concert Tickets in Groups | 2286 | Hard | Segment tree (range sum + range max, walk) | Two queries: find first row with k seats, or sum of k |

### Days 5–7: Advanced — Competition-Style Problems (7 problems)

| # | Problem | LC # | Difficulty | Key Technique | Notes |
|---|---|---|---|---|---|
| 15 | Count Good Triplets in an Array | 2179 | Hard | Two BITs (left smaller + right larger) | For each mid element, count valid left × valid right |
| 16 | Minimum Number of Operations to Make Array Continuous | 2009 | Hard | Sliding window + BIT (or sort + binary search) | Sort unique values, sliding window of size n |
| 17 | Stamping the Grid | 2132 | Hard | 2D prefix sum + difference array | Check if stamp fits, then mark with 2D diff array |
| 18 | Peaks in Array | 3187 | Hard | BIT tracking peak status | A[i] is peak if A[i]>A[i-1] and A[i]>A[i+1]; update on change |
| 19 | Fancy Sequence | 1622 | Hard | Lazy segment tree (affine transformation) | Compose add/mult as affine: val = a*val + b |
| 20 | Number of Flowers in Full Bloom | 2251 | Hard | Difference array + sort (or BIT) | Sweep line: +1 at start, -1 at end+1 |
| 21 | Min Possible Integer After at Most K Adjacent Swaps | 1505 | Hard | BIT for tracking positions | Greedy: move smallest digit left, BIT tracks shifts |

---

## Mock Interview Simulation

### Round 1 — Count of Smaller Numbers After Self (LC 315)

**Interviewer:** "Given an integer array `nums`, return a list `counts` where `counts[i]` is the number of elements to the right of `nums[i]` that are strictly smaller."

**Candidate approach — BIT with coordinate compression:**

1. **Coordinate compress:** Map values to ranks `1..m` (preserving relative order).
2. **Traverse right to left.** For each element with rank `r`:
   - `counts[i] = BIT.query(r - 1)` — how many elements already inserted have rank < r.
   - `BIT.update(r, 1)` — mark this rank as seen.

```java
static List<Integer> countSmaller(int[] nums) {
    int[] sorted = nums.clone();
    Arrays.sort(sorted);
    Map<Integer, Integer> rank = new HashMap<>();
    int r = 0;
    for (int v : sorted) if (!rank.containsKey(v)) rank.put(v, ++r);

    BIT bit = new BIT(rank.size());
    Integer[] result = new Integer[nums.length];
    for (int i = nums.length - 1; i >= 0; i--) {
        int rk = rank.get(nums[i]);
        result[i] = bit.query(rk - 1);
        bit.update(rk, 1);
    }
    return Arrays.asList(result);
}
```

**Time:** O(n log n). **Space:** O(n).

**Follow-up 1:** "Can you solve this with merge sort instead?"
→ Yes. During merge sort, when an element from the right half is placed before elements in the left half, each such placement contributes to the count for those left-half elements. Track counts during the merge step. Same O(n log n) complexity.

**Follow-up 2:** "What if we need counts of elements *greater* than self to the right?"
→ Mirror: `counts[i] = (elements already inserted) - BIT.query(r)`. Or equivalently, process left to right and query `BIT.query(n) - BIT.query(r)`.

**Follow-up 3:** "What about counting in a sliding window of size k?"
→ Use a BIT + sliding window. Add element entering the window, remove element leaving. For each new position, query prefix. O(n log n) total.

---

### Round 2 — Range Module (LC 715)

**Interviewer:** "Implement a `RangeModule` that tracks ranges of numbers. Support `addRange(left, right)`, `queryRange(left, right)`, and `removeRange(left, right)` over `[left, right)` half-open intervals."

**Candidate approach — Lazy segment tree with coordinate compression:**

Since values can be up to 10^9, we can't allocate an array that large. Two approaches:

**Approach A — Sorted intervals (SortedList):** Maintain a sorted list of disjoint intervals. Add/remove involves merging/splitting. O(n) worst case per operation but simple.

**Approach B — Dynamic lazy segment tree:** Use a node-based (dictionary-backed) segment tree with lazy propagation. Nodes are created on demand.

```java
class RangeModule {
    Map<Integer, Integer> tree = new HashMap<>();
    Map<Integer, Integer> lazy = new HashMap<>(); // null / 0 / 1
    static final int MAX = 1_000_000_000;

    private void pushDown(int node) {
        if (lazy.containsKey(node)) {
            int val = lazy.get(node);
            lazy.put(2 * node, val);
            lazy.put(2 * node + 1, val);
            lazy.remove(node);
        }
    }

    private void update(int l, int r, int val, int node, int lo, int hi) {
        if (l >= hi || lo >= r) return;
        if (l <= lo && hi <= r) {
            lazy.put(node, val);
            tree.put(node, val == 1 ? hi - lo : 0);
            return;
        }
        pushDown(node);
        int mid = (lo + hi) / 2;
        update(l, r, val, 2 * node, lo, mid);
        update(l, r, val, 2 * node + 1, mid, hi);
        tree.put(node, tree.getOrDefault(2 * node, 0)
                      + tree.getOrDefault(2 * node + 1, 0));
    }

    private int query(int l, int r, int node, int lo, int hi) {
        if (l >= hi || lo >= r) return 0;
        if (l <= lo && hi <= r) return tree.getOrDefault(node, 0);
        pushDown(node);
        int mid = (lo + hi) / 2;
        return query(l, r, 2 * node, lo, mid)
             + query(l, r, 2 * node + 1, mid, hi);
    }

    public void addRange(int left, int right)    { update(left, right, 1, 1, 0, MAX); }
    public void removeRange(int left, int right) { update(left, right, 0, 1, 0, MAX); }
    public boolean queryRange(int left, int right) {
        return query(left, right, 1, 0, MAX) == right - left;
    }
}
```

**Follow-up 1:** "Walk me through lazy propagation in your solution."
→ When we mark a range as fully covered (`lazy=1`) or fully uncovered (`lazy=0`), we store that intent on the node without visiting children. Only when a future query or update needs to split that range do we push the lazy value down to the two children. This ensures each operation touches O(log n) nodes.

**Follow-up 2:** "What about a persistent version — supporting snapshots?"
→ Use a persistent (immutable) segment tree: on each update, create new nodes along the path instead of modifying in place. Each version's root points to its own tree, sharing unchanged subtrees. Space per update: O(log n). This allows querying any historical version.

**Follow-up 3:** "How would you handle this if the coordinate space were 2D?"
→ Use a 2D segment tree (segment tree of segment trees) or a k-d tree. For axis-aligned rectangles, sweep line + 1D segment tree is the standard approach — similar to Rectangle Area II (LC 850).

---

## Tips & Pitfalls

1. **1-indexed vs 0-indexed segment tree:** The array-based segment tree with root at index 1 uses `2*i` and `2*i+1` for children. If you root at index 0, children are `2*i+1` and `2*i+2` — slightly messier. Stick with 1-indexed for cleaner code.

2. **Recursive vs iterative segment tree:** Recursive is easier to write and extend (lazy propagation, walk). Iterative (bottom-up) has a smaller constant factor and is preferred in competitive programming for speed, but is harder to add lazy propagation to. For interviews, recursive is almost always the right choice — clarity matters more than microseconds.

3. **Choosing between BIT and segment tree:**
   - Use **BIT** when: point update + prefix/range sum (or any invertible operation like XOR). It's half the code and faster.
   - Use **segment tree** when: you need range updates (lazy), non-invertible operations (min, max), or complex merge logic.
   - When in doubt, segment tree handles everything BIT can, so it's a safe default.

4. **Coordinate compression:** When the value range is huge (up to 10^9) but the number of distinct values is small (≤ 10^5), compress values to ranks `1..m` and build BIT/segment tree over ranks. Sort + deduplicate + binary search for rank lookup.

5. **Tree array size:** Always allocate `4 * n` for a segment tree. The actual number of nodes in a complete binary tree over `n` leaves is `2 * next_power_of_2(n) - 1`, which can exceed `2 * n`. Using `4 * n` is a safe, widely-accepted upper bound.

6. **Lazy propagation gotchas:**
   - Always push down **before** recursing into children during both update and query.
   - If you support multiple operations (e.g., add + set), define composition rules carefully. Affine transformations (`a*x + b`) compose nicely.
   - Initialize lazy values to an identity (0 for add, `None` for set).

7. **BIT range update trick:** To support range updates with BIT, maintain two BITs: `B1` and `B2`. For range add `[l, r] += v`: update `B1` at l and r+1, update `B2` at l and r+1 with `l*v` and `(r+1)*v`. Point query becomes `B1.query(i) * i - B2.query(i)`.

8. **Debugging tip:** Print the tree array after build and after each update. Verify that parent = merge(left_child, right_child) holds at every level. Most segment tree bugs are in the merge step or in boundary handling (`start == end` checks).
