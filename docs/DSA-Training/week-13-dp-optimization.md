---
sidebar_position: 14
title: "Week 13: DP Optimization Techniques"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 13: DP Optimization Techniques

## Why This Week Matters

You've learned to write DP recurrences — but what happens when O(n²) or O(n³) is too slow? This week covers techniques that **shave a factor of n** from DP transitions. Convex Hull Trick turns O(n²) into O(n log n) when the transition involves linear expressions. Divide & Conquer DP exploits monotonic optimal split points. Knuth-Yao reduces O(n³) interval DP to O(n²). Binary search in transitions (as in LIS or job scheduling) is perhaps the most interview-relevant optimization. These techniques separate "solved it" from "solved it fast enough."

---

## Core Theory

<AlgoViz
  title="Job Scheduling — DP + Binary Search"
  steps={[
    { description: "Input: start=[1,2,3,3], end=[3,4,5,6], profit=[50,10,40,70]. Sort jobs by end time.", state: { jobs: "[(1,3,50), (2,4,10), (3,5,40), (3,6,70)]", ends: "[3, 4, 5, 6]" } },
    { description: "Initialize dp[0] = 0 (no jobs selected).", state: { dp: "[0, _, _, _, _]" } },
    { description: "i=1: Job (1,3,50). Binary search for latest end <= start=1 in ends[0..0]. Result: j=0. dp[1] = max(dp[0], dp[0]+50) = 50.", state: { dp: "[0, 50, _, _, _]", binarySearch: "upperBound(ends, 1, 0, 1) = 0" } },
    { description: "i=2: Job (2,4,10). Binary search for latest end <= start=2 in ends[0..1]. Result: j=0. dp[2] = max(dp[1], dp[0]+10) = max(50, 10) = 50.", state: { dp: "[0, 50, 50, _, _]", binarySearch: "upperBound(ends, 2, 0, 2) = 0" } },
    { description: "i=3: Job (3,5,40). Binary search for latest end <= start=3 in ends[0..2]. Result: j=1. dp[3] = max(dp[2], dp[1]+40) = max(50, 90) = 90.", state: { dp: "[0, 50, 50, 90, _]", binarySearch: "upperBound(ends, 3, 0, 3) = 1" } },
    { description: "i=4: Job (3,6,70). Binary search for latest end <= start=3 in ends[0..3]. Result: j=1. dp[4] = max(dp[3], dp[1]+70) = max(90, 120) = 120.", state: { dp: "[0, 50, 50, 90, 120]", binarySearch: "upperBound(ends, 3, 0, 4) = 1" } },
    { description: "Answer: dp[4] = 120. Optimal selection: jobs (1,3,50) and (3,6,70).", state: { dp: "[0, 50, 50, 90, 120]", answer: 120, selected: "[(1,3,50), (3,6,70)]" } }
  ]}
/>

### 1. Convex Hull Trick (CHT)

**Why this technique exists.** In many DP problems, the transition involves choosing the best previous state j where the cost function is linear in both j and i: `dp[i] = min(dp[j] + b[j] * a[i])`. Naively, evaluating all j for each i costs O(n) per state, giving O(n squared) total. The Convex Hull Trick recognizes that these linear functions form a set of lines, and the minimum over all lines at a query point is the lower envelope -- a convex hull. By maintaining this envelope incrementally, we answer each query in O(1) amortized or O(log n) worst-case.

**The intuition.** Imagine each previous state j as a line `y = b[j] * x + dp[j]` on a graph. For a given query point `x = a[i]`, you want the line that gives the smallest y-value. As you add more lines, some become permanently dominated (they are never the best for any x). Removing these dominated lines gives you the lower envelope. If both slopes and queries arrive in sorted order, you can maintain this envelope as a deque, popping from the front for queries and from the back for insertions -- all in amortized O(1).

**When to use:** The DP transition has the form:

```
dp[i] = min(dp[j] + b[j] * a[i])    for all valid j < i
```

where `b[j]` depends only on `j` and `a[i]` depends only on `i`. This is a **linear function** in `a[i]` with slope `b[j]` and intercept `dp[j]`. The minimum over all such lines at query point `a[i]` is the lower envelope — a convex hull of lines.

**Two variants:**

| Variant | Condition | Complexity |
|---|---|---|
| Monotone (deque-based) | Slopes added in sorted order AND queries are monotonic | Amortized O(1) per query |
| General (Li Chao tree) | No ordering requirement | O(log n) per query |

<AlgoViz
  title="Convex Hull Trick — DP Transitions as Lines"
  description="dp[i] = min(dp[j] + b[j]*a[i]) transforms each j into a line y=b[j]*x + dp[j]. Query x=a[i] on the lower envelope. Example: a=[1,3,5], b=[4,2,1], dp[0]=0."
  steps={[
    {
      array: [0, 0, 0],
      labels: {"0": "dp[0]", "1": "dp[1]", "2": "dp[2]"},
      variables: {a: "[1, 3, 5]", b: "[4, 2, 1]", "dp[0]": 0, form: "dp[i] = min_j(dp[j] + b[j]*a[i])"},
      explanation: "Recurrence: dp[i] = min over j of (dp[j] + b[j]*a[i]). Each j defines a line y = b[j]*x + dp[j]. We query this set of lines at x = a[i]. dp[0] = 0 (base).",
      code: "dp[0] = 0;  // base case"
    },
    {
      array: [0, 0, 0],
      highlights: [0],
      variables: {j: 0, line_0: "y = 4x + 0", slope: 4, intercept: 0, meaning: "Line from state j=0"},
      explanation: "State j=0 produces line L0: y = b[0]*x + dp[0] = 4x + 0. This line represents the cost of transitioning FROM state 0 TO any future state i (at query point x=a[i]).",
      code: "// Line from j=0: y = 4x + 0"
    },
    {
      array: [4, 0, 0],
      highlights: [0],
      variables: {i: 1, query: "x = a[1] = 3", "L0 at x=3": "4*3+0 = 12", only_line: "L0", "dp[1]": 12},
      explanation: "Compute dp[1]: query x=a[1]=3. Only line is L0. L0(3) = 4*3+0 = 12. dp[1] = 12. Now j=1 creates a new line.",
      code: "dp[1] = query(a[1]=3) = 12"
    },
    {
      array: [4, 12, 0],
      highlights: [1],
      variables: {j: 1, line_1: "y = 2x + 12", slope: 2, intercept: 12, envelope: "L0(slope=4) and L1(slope=2)"},
      explanation: "State j=1 adds line L1: y = b[1]*x + dp[1] = 2x + 12. Now envelope has L0(4x+0) and L1(2x+12). They cross at x=6. For x<6, L0 is lower; for x>6, L1 is lower.",
      code: "addLine(slope=2, intercept=12);  // L1"
    },
    {
      array: [4, 12, 0],
      highlights: [2],
      variables: {i: 2, query: "x = a[2] = 5", "L0 at 5": "4*5=20", "L1 at 5": "2*5+12=22", "dp[2]": 20},
      explanation: "Compute dp[2]: query x=a[2]=5. L0(5)=20, L1(5)=22. Min=20 from L0. dp[2]=20. Without CHT, we would scan all j — O(n) per query. CHT: O(1) amortized.",
      code: "dp[2] = min(L0(5), L1(5)) = min(20, 22) = 20"
    },
    {
      array: [0, 12, 20],
      highlights: [0, 1, 2],
      labels: {"0": "dp[0]=0", "1": "dp[1]=12", "2": "dp[2]=20"},
      variables: {answer: "dp[2]=20", lines_added: 3, queries: 2, complexity: "O(n) total with monotone CHT"},
      explanation: "Final: dp = [0, 12, 20]. Each DP transition was O(1) amortized by maintaining the lower envelope. Total: O(n) instead of O(n²). Slopes must be added in sorted order for deque-based CHT.",
      code: "// O(n) total: each line added/removed at most once"
    }
  ]}
/>

#### Deque-Based CHT (Monotone Slopes, Monotone Queries)

```java
import java.util.*;

class ConvexHullTrick {
    // Maintains lower envelope for min queries.
    // Requires: slopes added in decreasing order, queries in increasing order.
    private ArrayDeque<long[]> lines = new ArrayDeque<>(); // each line is {slope, intercept}

    private boolean bad(long[] l1, long[] l2, long[] l3) {
        return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0]);
    }

    void addLine(long slope, long intercept) {
        long[] line = {slope, intercept};
        while (lines.size() >= 2) {
            long[] last = lines.pollLast();
            if (bad(((ArrayDeque<long[]>) lines).peekLast(), last, line)) continue;
            lines.addLast(last);
            break;
        }
        lines.addLast(line);
    }

    long query(long x) {
        while (lines.size() >= 2) {
            Iterator<long[]> it = lines.iterator();
            long[] first = it.next();
            long[] second = it.next();
            if (first[0] * x + first[1] >= second[0] * x + second[1]) {
                lines.pollFirst();
            } else {
                break;
            }
        }
        long[] best = lines.peekFirst();
        return best[0] * x + best[1];
    }
}
```

<AlgoViz
  title="Convex Hull Trick — Line Insertion + Query"
  description="Maintains lower envelope of lines for min queries. Insert lines with decreasing slopes, query with increasing x."
  steps={[
    {
      array: [10, 8, 6, 4, 2, 0],
      labels: {"0": "x=0", "1": "x=1", "2": "x=2", "3": "x=3", "4": "x=4", "5": "x=5"},
      variables: {phase: "Init", lines: "none", envelope: "empty"},
      explanation: "We will insert 3 lines: y=-2x+10, y=-1x+6, y=0x+4 (slopes -2,-1,0 in decreasing order). Then query at x=0,1,3,5.",
      code: "ConvexHullTrick cht = new ConvexHullTrick();"
    },
    {
      array: [10, 8, 6, 4, 2, 0],
      highlights: [0, 1, 2, 3, 4, 5],
      variables: {line1: "y = -2x + 10", slope: -2, intercept: 10, lines_count: 1},
      explanation: "Insert line L1: y = -2x + 10. It is the only line, so it forms the entire envelope.",
      code: "cht.addLine(-2, 10);  // y = -2x + 10"
    },
    {
      array: [6, 5, 4, 3, 2, 1],
      highlights: [3, 4, 5],
      secondary: [0, 1, 2],
      variables: {line2: "y = -1x + 6", slope: -1, intercept: 6, lines_count: 2},
      explanation: "Insert line L2: y = -1x + 6. L1 is better (lower) for x < 4, L2 is better for x > 4. Both lines kept.",
      code: "cht.addLine(-1, 6);  // y = -1x + 6"
    },
    {
      array: [4, 4, 4, 4, 4, 4],
      secondary: [0, 1, 2, 3],
      highlights: [4, 5],
      variables: {line3: "y = 0x + 4", slope: 0, intercept: 4, lines_count: 3, check: "Is L2 redundant?"},
      explanation: "Insert line L3: y = 4 (constant). Check if L2 is now dominated: L1∩L3 at x=3, L2 is above both at x=3. L2 becomes redundant — removed!",
      code: "cht.addLine(0, 4);  // y = 4, L2 removed"
    },
    {
      array: [10, 8, 6, 4, 4, 4],
      highlights: [0, 1, 2],
      secondary: [3, 4, 5],
      variables: {envelope: "L1 for x≤3, L3 for x≥3", query_x: 0, result: "min = 4"},
      explanation: "Query x=0: L1 gives 10, L3 gives 4. Min = 4 (from L3). But wait — envelope is L1(-2x+10) and L3(4), crossing at x=3.",
      code: "cht.query(0);  // 4"
    },
    {
      array: [10, 8, 6, 4, 4, 4],
      highlights: [1],
      variables: {query_x: 1, L1_at_1: 8, L3_at_1: 4, result: 4},
      explanation: "Query x=1: L1 gives 8, L3 gives 4. Min = 4.",
      code: "cht.query(1);  // 4"
    },
    {
      array: [10, 8, 6, 4, 4, 4],
      highlights: [3],
      variables: {query_x: 3, L1_at_3: 4, L3_at_3: 4, result: 4},
      explanation: "Query x=3: L1 gives 4, L3 gives 4. Both equal at the crossing point. Min = 4.",
      code: "cht.query(3);  // 4"
    },
    {
      array: [10, 8, 6, 4, 4, 4],
      highlights: [5],
      variables: {query_x: 5, L1_at_5: 0, L3_at_5: 4, result: 0},
      explanation: "Query x=5: L1 gives 0, L3 gives 4. Min = 0. For large x, the steep-slope line wins again.",
      code: "cht.query(5);  // 0"
    }
  ]}
/>

#### Li Chao Tree (General Case)

```java
import java.util.*;

class LiChaoTree {
    // Handles arbitrary insertion/query order. O(log C) per operation.
    private int lo, hi;
    private Map<Integer, long[]> tree = new HashMap<>(); // nodeId -> {slope, intercept}

    LiChaoTree(int lo, int hi) {
        this.lo = lo;
        this.hi = hi;
    }

    private long eval(long[] line, long x) {
        return line[0] * x + line[1];
    }

    void addLine(long slope, long intercept) {
        addLine(new long[]{slope, intercept}, 1, lo, hi);
    }

    private void addLine(long[] newLine, int node, int lo, int hi) {
        if (!tree.containsKey(node)) {
            tree.put(node, newLine);
            return;
        }
        long[] cur = tree.get(node);
        int mid = lo + (hi - lo) / 2;
        boolean leftBetter = eval(newLine, lo) < eval(cur, lo);
        boolean midBetter = eval(newLine, mid) < eval(cur, mid);

        if (midBetter) {
            tree.put(node, newLine);
            newLine = cur;
        }
        if (lo == hi) return;

        if (leftBetter != midBetter) {
            addLine(newLine, 2 * node, lo, mid);
        } else {
            addLine(newLine, 2 * node + 1, mid + 1, hi);
        }
    }

    long query(long x) {
        return query(x, 1, lo, hi);
    }

    private long query(long x, int node, int lo, int hi) {
        if (!tree.containsKey(node)) return Long.MAX_VALUE / 2;
        long res = eval(tree.get(node), x);
        if (lo == hi) return res;
        int mid = lo + (hi - lo) / 2;
        if (x <= mid) return Math.min(res, query(x, 2 * node, lo, mid));
        else return Math.min(res, query(x, 2 * node + 1, mid + 1, hi));
    }
}
```

<AlgoViz
  title="Li Chao Tree — Arbitrary Order Line Insertion"
  description="Insert lines in arbitrary order: y=-x+6, y=x, y=3. Query min at various x values. Range [0,6]."
  steps={[
    {
      array: [6, 5, 4, 3, 2, 1, 0],
      labels: {"0": "x=0", "1": "x=1", "2": "x=2", "3": "x=3", "4": "x=4", "5": "x=5", "6": "x=6"},
      highlights: [0, 1, 2, 3, 4, 5, 6],
      variables: {line: "L1: y = -x + 6", slope: -1, intercept: 6},
      explanation: "Insert first line L1: y = -x + 6. Only line so far, defines the entire envelope. Values at x=0..6: [6,5,4,3,2,1,0].",
      code: "tree.addLine(-1, 6);  // y = -x + 6"
    },
    {
      array: [0, 1, 2, 3, 4, 5, 6],
      labels: {"0": "x=0", "1": "x=1", "2": "x=2", "3": "x=3", "4": "x=4", "5": "x=5", "6": "x=6"},
      secondary: [0, 1, 2, 3, 4, 5, 6],
      variables: {line: "L2: y = x", slope: 1, intercept: 0, crossing: "L1 and L2 cross at x=3"},
      explanation: "Insert L2: y = x. Values: [0,1,2,3,4,5,6]. L2 is better (lower) for x < 3, L1 is better for x > 3. They cross at x=3.",
      code: "tree.addLine(1, 0);  // y = x"
    },
    {
      array: [0, 1, 2, 3, 2, 1, 0],
      highlights: [0, 1, 2, 4, 5, 6],
      labels: {"0": "x=0", "1": "x=1", "2": "x=2", "3": "x=3", "4": "x=4", "5": "x=5", "6": "x=6"},
      variables: {envelope: "L2 for x<=3, L1 for x>=3", min_values: "[0,1,2,3,2,1,0]"},
      explanation: "Current lower envelope: min(L1, L2). For x <= 3, L2(y=x) wins. For x >= 3, L1(y=-x+6) wins. V-shaped envelope.",
      code: "// lower envelope of two lines"
    },
    {
      array: [3, 3, 3, 3, 3, 3, 3],
      secondary: [0, 1, 2, 3, 4, 5, 6],
      variables: {line: "L3: y = 3", slope: 0, intercept: 3, status: "Never the minimum — always >= envelope"},
      explanation: "Insert L3: y = 3 (constant). At every x, existing envelope is already <= 3 (equals 3 only at x=3). L3 is completely dominated — never contributes to the lower envelope.",
      code: "tree.addLine(0, 3);  // y = 3 (dominated)"
    },
    {
      array: [0, 1, 2, 3, 2, 1, 0],
      highlights: [0],
      variables: {query: "x=0", L1: 6, L2: 0, L3: 3, min: 0, source: "L2"},
      explanation: "Query x=0: tree traverses root -> left child. Finds min across all stored lines. L2(0)=0, L1(0)=6, L3(0)=3. Result: 0. O(log C) per query.",
      code: "tree.query(0);  // 0 (from L2)"
    },
    {
      array: [0, 1, 2, 3, 2, 1, 0],
      highlights: [4],
      variables: {query: "x=4", L1: 2, L2: 4, L3: 3, min: 2, source: "L1"},
      explanation: "Query x=4: L1(4)=2, L2(4)=4, L3(4)=3. Min=2 from L1. Tree correctly finds the minimum in O(log range).",
      code: "tree.query(4);  // 2 (from L1)"
    },
    {
      array: [0, 1, 2, 3, 2, 1, 0],
      highlights: [3],
      variables: {query: "x=3", result: 3, advantage: "Handles arbitrary insertion order, O(log C) per operation"},
      explanation: "Query x=3: all three lines give 3. Key advantage over deque-based CHT: Li Chao tree handles lines inserted in ANY order, not just sorted slopes. O(log C) per operation.",
      code: "tree.query(3);  // 3"
    }
  ]}
/>

---

### 2. Divide & Conquer DP

**When to use:** The recurrence is:

```
dp[k][i] = min over j < i: (dp[k-1][j] + cost(j+1, i))
```

and the **optimal split point** `opt[k][i]` is monotonic: `opt[k][i] ≤ opt[k][i+1]`.

This monotonicity means we can use divide & conquer: for each layer k, solve the middle element first, which constrains the search range for left and right halves.

**Reduces:** O(kn²) → O(kn log n).

<AlgoViz
  title="Divide & Conquer DP — Monotonic Split Points"
  description="Shows how monotonicity of opt[i] constrains the search. For layer k=2 over array [2,5,3,8,1], D&C solves mid first, then narrows left and right ranges."
  steps={[
    {
      array: [2, 5, 3, 8, 1],
      labels: {"0": "a[0]", "1": "a[1]", "2": "a[2]", "3": "a[3]", "4": "a[4]"},
      variables: {k: 2, n: 5, goal: "Partition into 2 groups, minimize max-sum"},
      explanation: "Array [2,5,3,8,1], partition into k=2 contiguous groups minimizing the maximum group sum. prev[] (layer k=1) holds prefix sums. D&C solves layer k=2.",
      code: "// prev = [0, 2, 7, 10, 18, 19] (prefix sums)"
    },
    {
      array: [0, 2, 7, 10, 18, 19],
      labels: {"0": "prev[0]", "1": "prev[1]", "2": "prev[2]", "3": "prev[3]", "4": "prev[4]", "5": "prev[5]"},
      highlights: [3],
      variables: {step: "Solve mid first", lo: 1, hi: 5, mid: 3, optRange: "[0..4]"},
      explanation: "D&C: solve mid = (1+5)/2 = 3 first. Try all split points j in [0..4] for position 3. This finds opt[3], which constrains left and right halves.",
      code: "int mid = (lo + hi) / 2;  // 3"
    },
    {
      array: [0, 2, 7, 10, 18, 19],
      highlights: [3],
      secondary: [0, 1, 2],
      variables: {"j=0": "max(0, sum[1..3])=10", "j=1": "max(2, sum[2..3])=max(2,11)=11", "j=2": "max(7, 8)=8", best: "j=0 → cost=10, opt[3]=0"},
      explanation: "For mid=3: j=0→max(0,10)=10, j=1→max(2,11)=11, j=2→max(7,8)=8. Best: j=2 with cost=8. opt[3]=2. Now left half searches [0..2], right half [2..4].",
      code: "cur[3] = 8; bestOpt = 2;"
    },
    {
      array: [0, 2, 7, 10, 18, 19],
      highlights: [1, 2],
      variables: {"left: lo=1,hi=2": "opt in [0..2]", "cur[1]": "j=0: max(0,2)=2", "cur[2]": "j=0: max(0,7)=7, j=1: max(2,3)=3 → opt=1"},
      explanation: "Left half [1..2] with opt in [0..2]. cur[1]=2 (opt=0). cur[2]=min(7,3)=3 (opt=1). Monotonicity: opt[1]=0 ≤ opt[2]=1 ≤ opt[3]=2. ✓",
      code: "// left half: search space narrowed by opt[3]=2"
    },
    {
      array: [0, 2, 7, 10, 18, 19],
      highlights: [4, 5],
      variables: {"right: lo=4,hi=5": "opt in [2..4]", "cur[4]": "j=2: max(7,9)=9, j=3: max(10,1)=10 → opt=2", "cur[5]": "j=2: max(7,10)=10, j=3: max(10,9)=10, j=4: max(18,1)=18 → opt=2"},
      explanation: "Right half [4..5] with opt in [2..4]. cur[4]=9 (opt=2). cur[5]=10 (opt=2 or 3, both give 10). Monotonicity preserved!",
      code: "// right half: search space [2..4] instead of [0..4]"
    },
    {
      array: [0, 2, 3, 8, 9, 10],
      labels: {"0": "cur[0]", "1": "cur[1]", "2": "cur[2]", "3": "cur[3]", "4": "cur[4]", "5": "cur[5]"},
      highlights: [5],
      variables: {answer: "cur[5]=10", total_work: "O(n log n) per layer", vs_naive: "O(n²) per layer", savings: "D&C halves search each recursion"},
      explanation: "Answer: cur[5]=10. Total j-evaluations: ~8 vs 15 naively. D&C reduces O(n²) to O(n log n) per layer because monotonicity lets each recursion level do O(n) total work.",
      code: "return cur[n];  // 10"
    }
  ]}
/>

```java
int solve(int kLayers, int n, int[][] costMatrix) {
    int INF = Integer.MAX_VALUE / 2;
    int[] prev = new int[n + 1];
    Arrays.fill(prev, INF);
    prev[0] = 0;

    for (int k = 1; k <= kLayers; k++) {
        int[] cur = new int[n + 1];
        Arrays.fill(cur, INF);
        divideAndConquer(prev, cur, 1, n, 0, n - 1, costMatrix);
        prev = cur;
    }
    return prev[n];
}

void divideAndConquer(int[] prev, int[] cur, int lo, int hi,
                      int optLo, int optHi, int[][] costMatrix) {
    if (lo > hi) return;
    int mid = (lo + hi) / 2;
    int bestCost = Integer.MAX_VALUE / 2;
    int bestOpt = optLo;

    for (int j = optLo; j <= Math.min(mid - 1, optHi); j++) {
        int val = prev[j] + costMatrix[j + 1][mid];
        if (val < bestCost) {
            bestCost = val;
            bestOpt = j;
        }
    }
    cur[mid] = bestCost;
    divideAndConquer(prev, cur, lo, mid - 1, optLo, bestOpt, costMatrix);
    divideAndConquer(prev, cur, mid + 1, hi, bestOpt, optHi, costMatrix);
}
```

<AlgoViz
  title="Divide & Conquer DP Optimization"
  description="Partition array [3,1,4,1,5] into k=2 groups minimizing max group sum. Shows how monotonic opt[i] enables D&C."
  steps={[
    {
      array: [3, 1, 4, 1, 5],
      labels: {"0": "a[0]", "1": "a[1]", "2": "a[2]", "3": "a[3]", "4": "a[4]"},
      variables: {k: 2, goal: "min max-group-sum", total_sum: 14},
      explanation: "Array [3,1,4,1,5], partition into k=2 contiguous groups. Minimize the maximum group sum. Layer k=1 first (base case).",
      code: "// Layer k=1: prev[i] = sum(a[0..i-1])"
    },
    {
      array: [0, 3, 4, 8, 9, 14],
      labels: {"0": "prev[0]", "1": "prev[1]", "2": "prev[2]", "3": "prev[3]", "4": "prev[4]", "5": "prev[5]"},
      highlights: [0, 1, 2, 3, 4, 5],
      variables: {layer: 1, "prev[]": "[0,3,4,8,9,14]"},
      explanation: "Base layer (k=1): prev[i] = prefix sum. prev = [0,3,4,8,9,14]. Now compute layer k=2 using D&C.",
      code: "prev = [0, 3, 4, 8, 9, 14];"
    },
    {
      array: [0, 3, 4, 8, 9, 14],
      highlights: [3],
      variables: {layer: 2, "D&C": "solve mid=3 first", lo: 1, hi: 5, mid: 3, optRange: "[0, 4]"},
      explanation: "D&C: solve mid=(1+5)/2=3 first. Search opt[3] in range [0, 4]. Try all split points j.",
      code: "divideAndConquer(prev, cur, 1, 5, 0, 4);"
    },
    {
      array: [0, 3, 4, 8, 9, 14],
      highlights: [3],
      secondary: [0, 1, 2],
      variables: {"j=0": "max(prev[0],sum[1..3])=max(0,8)=8", "j=1": "max(prev[1],sum[2..3])=max(3,5)=5", "j=2": "max(prev[2],sum[3..3])=max(4,1)=4"},
      explanation: "For mid=3: j=0→8, j=1→5, j=2→4. Best is j=2 with cost=4. opt[3]=2.",
      code: "cur[3] = 4; bestOpt = 2;"
    },
    {
      array: [0, 3, 4, 8, 9, 14],
      highlights: [1, 2],
      variables: {"left_half": "solve lo=1,hi=2 with optRange [0,2]", "cur[1]": "j=0: max(0,3)=3", "cur[2]": "j=0: max(0,4)=4, j=1: max(3,1)=3"},
      explanation: "Left half [1..2], opt in [0..2]. cur[2]=min(4,3)=3 at j=1. cur[1]=3 at j=0. Monotonicity confirmed: opt[1]=0 ≤ opt[2]=1 ≤ opt[3]=2.",
      code: "divideAndConquer(prev, cur, 1, 2, 0, 2);"
    },
    {
      array: [0, 3, 4, 8, 9, 14],
      highlights: [4, 5],
      variables: {"right_half": "solve lo=4,hi=5 with optRange [2,4]", "cur[4]": "j=2: max(4,5)=5, j=3: max(8,1)=8 → opt=2,cost=5", "cur[5]": "j=2: max(4,10)=10, j=3: max(8,6)=8, j=4: max(9,5)=9 → opt=3,cost=8"},
      explanation: "Right half [4..5], opt in [2..4]. cur[4]=5 at opt=2. cur[5]=8 at opt=3. All optimal splits are monotonic!",
      code: "divideAndConquer(prev, cur, 4, 5, 2, 4);"
    },
    {
      array: [0, 3, 3, 4, 5, 8],
      labels: {"0": "cur[0]", "1": "cur[1]", "2": "cur[2]", "3": "cur[3]", "4": "cur[4]", "5": "cur[5]"},
      highlights: [5],
      variables: {"cur[]": "[0,3,3,4,5,8]", answer: "cur[5]=8", partition: "[3,1,4] and [1,5]"},
      explanation: "Final: cur[5] = 8. Optimal partition: [3,1,4] (sum=8) and [1,5] (sum=6). Max = 8. D&C gave O(n log n) per layer instead of O(n²).",
      code: "return cur[n];  // 8"
    }
  ]}
/>

---

### 3. Knuth-Yao Optimization

**When to use:** Interval DP of the form:

```
dp[i][j] = min over k in [i, j-1]: (dp[i][k] + dp[k+1][j] + w(i, j))
```

where the weight function `w(i, j)` satisfies the **quadrangle inequality** and monotonicity. Under these conditions, the optimal split point satisfies:

```
opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]
```

This constrains the search for k, reducing total work from O(n³) to O(n²).

**Classic application:** Optimal binary search tree, optimal merge with additive costs.

<AlgoViz
  title="Knuth-Yao — How Quadrangle Inequality Constrains Splits"
  description="Interval DP for merging piles [2,3,5,4]. Shows how opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j] narrows the search for each interval's best split."
  steps={[
    {
      array: [2, 3, 5, 4],
      labels: {"0": "p[0]", "1": "p[1]", "2": "p[2]", "3": "p[3]"},
      variables: {n: 4, w: "w(i,j) = sum(p[i..j])", condition: "opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]"},
      explanation: "Merge piles [2,3,5,4]. Weight w(i,j) = sum of piles i..j. Quadrangle inequality holds for additive weights, so Knuth-Yao applies: search for k is constrained.",
      code: "// O(n²) instead of O(n³)"
    },
    {
      array: [5, 8, 9],
      labels: {"0": "dp[0][1]=5", "1": "dp[1][2]=8", "2": "dp[2][3]=9"},
      highlights: [0, 1, 2],
      variables: {length: 2, "opt[0][1]": 0, "opt[1][2]": 1, "opt[2][3]": 2},
      explanation: "Length 2: only one split each. dp[0][1]=5(opt=0), dp[1][2]=8(opt=1), dp[2][3]=9(opt=2). These opt values become bounds for length 3.",
      code: "// length 2: opt values determined"
    },
    {
      array: [2, 3, 5, 4],
      highlights: [0, 1, 2],
      variables: {"dp[0][2]": "w(0,2)=10", "k range": "[opt[0][1]..opt[1][2]] = [0..1]", "k=0": "0+8+10=18", "k=1": "5+0+10=15"},
      explanation: "dp[0][2]: Knuth says search k in [opt[0][1], opt[1][2]] = [0, 1]. Only 2 candidates! k=0→18, k=1→15. Best: k=1, dp[0][2]=15, opt[0][2]=1.",
      code: "// k in [0..1] instead of [0..2] — saved 1 check"
    },
    {
      array: [2, 3, 5, 4],
      highlights: [1, 2, 3],
      variables: {"dp[1][3]": "w(1,3)=12", "k range": "[opt[1][2]..opt[2][3]] = [1..2]", "k=1": "0+9+12=21", "k=2": "8+0+12=20"},
      explanation: "dp[1][3]: k in [opt[1][2], opt[2][3]] = [1, 2]. k=1→21, k=2→20. Best: k=2, dp[1][3]=20, opt[1][3]=2.",
      code: "// k in [1..2] — constrained by Knuth"
    },
    {
      array: [2, 3, 5, 4],
      highlights: [0, 1, 2, 3],
      variables: {"dp[0][3]": "w(0,3)=14", "k range": "[opt[0][2]..opt[1][3]] = [1..2]", "k=1": "5+20+14=39", "k=2": "15+0+14=29? No: 15+4+14"},
      explanation: "dp[0][3]: k in [opt[0][2], opt[1][3]] = [1, 2]. k=1→5+20+14=39, k=2→15+9+14=38. Best: k=2, dp[0][3]=38.",
      code: "dp[0][3] = min(39, 38) = 38"
    },
    {
      array: [2, 3, 5, 4],
      variables: {answer: 38, "k_evals_Knuth": "2+2+2=6", "k_evals_naive": "1+2+3=6", note: "Savings grow with n"},
      explanation: "Answer: 38. For n=4, Knuth checked 6 k-values (same as naive). But for large n, naive does O(n³) total k-evaluations while Knuth does O(n²) — each diagonal sums to O(n).",
      code: "// O(n²): each length-L diagonal does O(n) work total"
    },
    {
      array: [0, 1, 2],
      labels: {"0": "opt[0][1]=0", "1": "opt[0][2]=1", "2": "opt[0][3]=2"},
      highlights: [0, 1, 2],
      variables: {monotonicity: "opt[0][1]=0 ≤ opt[0][2]=1 ≤ opt[0][3]=2", total_savings: "O(n³) → O(n²)"},
      explanation: "Optimal splits are monotonic: opt[0][1]=0 ≤ opt[0][2]=1 ≤ opt[0][3]=2. This monotonicity means total k-evaluations across all intervals of same length sum to O(n), giving O(n²) overall.",
      code: "// Quadrangle inequality ⟹ monotonic opt ⟹ O(n²)"
    }
  ]}
/>

```java
int knuthYao(int[][] w, int n) {
    int INF = Integer.MAX_VALUE / 2;
    int[][] dp = new int[n][n];
    int[][] opt = new int[n][n];

    for (int i = 0; i < n; i++) opt[i][i] = i;

    for (int length = 2; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length - 1;
            dp[i][j] = INF;
            int lo = opt[i][j - 1];
            int hi = (i + 1 < n) ? opt[i + 1][j] : j - 1;

            for (int k = lo; k <= Math.min(hi, j - 1); k++) {
                int val = dp[i][k] + dp[k + 1][j] + w[i][j];
                if (val < dp[i][j]) {
                    dp[i][j] = val;
                    opt[i][j] = k;
                }
            }
        }
    }
    return dp[0][n - 1];
}
```

<AlgoViz
  title="Knuth-Yao Optimization — Optimal BST"
  description="Optimal binary search tree for keys with frequencies [5, 10, 3, 8]. Shows how opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j] constrains the split search."
  steps={[
    {
      array: [5, 10, 3, 8],
      labels: {"0": "f[0]=5", "1": "f[1]=10", "2": "f[2]=3", "3": "f[3]=8"},
      variables: {n: 4, w: "w(i,j) = sum of freq[i..j]", goal: "Minimize weighted search cost"},
      explanation: "4 keys with frequencies [5,10,3,8]. w(i,j) = prefix sum cost. Knuth's optimization constrains optimal split point search.",
      code: "// opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]"
    },
    {
      array: [5, 10, 3, 8],
      highlights: [0, 1, 2, 3],
      variables: {"dp[i][i]": 0, "opt[0][0]": 0, "opt[1][1]": 1, "opt[2][2]": 2, "opt[3][3]": 3, length: 1},
      explanation: "Base case: dp[i][i] = 0 for all i (single node BST has 0 cost beyond root). opt[i][i] = i.",
      code: "for (int i = 0; i < n; i++) opt[i][i] = i;"
    },
    {
      array: [15, 13, 11],
      labels: {"0": "dp[0][1]", "1": "dp[1][2]", "2": "dp[2][3]"},
      highlights: [0, 1, 2],
      variables: {"dp[0][1]": "w(0,1)=15, k=0→15", "dp[1][2]": "w(1,2)=13, k=1→13", "dp[2][3]": "w(2,3)=11, k=2→11", length: 2},
      explanation: "Length 2: each only has 1 possible split. dp[0][1]=15 (opt=0), dp[1][2]=13 (opt=1), dp[2][3]=11 (opt=2).",
      code: "// length 2: only one k to try each"
    },
    {
      array: [31, 34],
      labels: {"0": "dp[0][2]", "1": "dp[1][3]"},
      highlights: [0],
      variables: {"dp[0][2]": "w(0,2)=18. k in [opt[0][1]..opt[1][2]] = [0..1]", "k=0": "0+13+18=31", "k=1": "15+0+18=33", best: "k=0, cost=31"},
      explanation: "dp[0][2]: w=18, search k in [opt[0][1], opt[1][2]] = [0, 1]. k=0→31, k=1→33. Best=31, opt[0][2]=0. Knuth saved checking k=2!",
      code: "// Knuth: k range [0..1] instead of [0..2]"
    },
    {
      array: [31, 34],
      secondary: [1],
      variables: {"dp[1][3]": "w(1,3)=21. k in [opt[1][2]..opt[2][3]] = [1..2]", "k=1": "0+11+21=32", "k=2": "13+0+21=34", best: "k=1, cost=32"},
      explanation: "dp[1][3]: w=21, search k in [1, 2]. k=1→32, k=2→34. Best=32, opt[1][3]=1.",
      code: "// k range [1..2] — constrained by Knuth"
    },
    {
      array: [26],
      labels: {"0": "dp[0][3]"},
      highlights: [0],
      variables: {"dp[0][3]": "w(0,3)=26. k in [opt[0][2]..opt[1][3]] = [0..1]", "k=0": "0+32+26=58", "k=1": "31+0+26? No: 31+11+26=68", best: "k=0, cost=58"},
      explanation: "dp[0][3]: w=26, k in [0, 1]. k=0→0+32+26=58, k=1→31+11+26=68. Best=58. opt[0][3]=0.",
      code: "dp[0][3] = 58;  // O(n²) total instead of O(n³)"
    },
    {
      array: [5, 10, 3, 8],
      highlights: [0, 1, 2, 3],
      variables: {answer: 58, complexity: "O(n²) vs O(n³)", savings: "Quadrangle inequality satisfied"},
      explanation: "Answer: 58. Knuth-Yao reduced O(n³) to O(n²) by constraining each split point search to at most O(n) total across all intervals of same length.",
      code: "return dp[0][n-1];  // 58"
    }
  ]}
/>

---

### 4. Binary Search in DP Transitions

**Why this technique exists.** Many DP transitions require finding the "best compatible predecessor" -- for example, the latest job that finishes before the current job starts. Scanning all predecessors costs O(n) per state. But if predecessors are sorted by the compatibility criterion (e.g., end time), binary search finds the answer in O(log n). This is the single most interview-relevant DP optimization because it combines two familiar concepts (DP and binary search) into a pattern that appears in dozens of problems.

**The intuition.** Think of it as the DP equivalent of "why would you search a phone book page by page when it is alphabetically sorted?" The sorted structure of your predecessors (by end time, value, or position) is free information -- you get it from the sorting step. Binary search harvests this information to skip the linear scan.

**Interview signals.** Look for: (1) "select non-overlapping intervals to maximize profit," (2) "longest increasing subsequence," (3) sorting the input by one dimension and doing DP on another, (4) the phrase "latest/earliest compatible" in your mental model of the transition.

The most practical optimization for interviews. When previous DP values are sorted or the transition involves finding the latest non-conflicting element, binary search reduces an O(n) scan to O(log n).

**Classic example:** Job Scheduling — sort jobs by end time, use binary search to find the latest job that doesn't overlap.

```java
import java.util.*;

int jobScheduling(int[] startTime, int[] endTime, int[] profit) {
    int n = startTime.length;
    int[][] jobs = new int[n][3];
    for (int i = 0; i < n; i++) jobs[i] = new int[]{startTime[i], endTime[i], profit[i]};
    Arrays.sort(jobs, (a, b) -> a[1] - b[1]);

    int[] ends = new int[n];
    for (int i = 0; i < n; i++) ends[i] = jobs[i][1];

    int[] dp = new int[n + 1];
    for (int i = 1; i <= n; i++) {
        int s = jobs[i - 1][0], p = jobs[i - 1][2];
        // Latest job ending at or before start of current job
        int j = upperBound(ends, s, 0, i);
        dp[i] = Math.max(dp[i - 1], dp[j] + p);
    }
    return dp[n];
}

int upperBound(int[] arr, int target, int lo, int hi) {
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

**Time:** O(n log n) (sort + n binary searches). **Space:** O(n).

<AlgoViz
  title="DP + Binary Search — Job Scheduling Trace"
  description="3 jobs: (1,3,$30), (2,5,$50), (4,6,$40). Sorted by end time. Binary search finds latest non-overlapping predecessor."
  steps={[
    {
      array: [30, 50, 40],
      labels: {"0": "(1,3)", "1": "(2,5)", "2": "(4,6)"},
      variables: {jobs: "[(1,3,30), (2,5,50), (4,6,40)]", ends: "[3, 5, 6]", "dp[0]": 0},
      explanation: "3 jobs sorted by end time. dp[i] = max profit from first i jobs. For each job, binary search finds the latest non-overlapping predecessor.",
      code: "dp[0] = 0;  // no jobs selected"
    },
    {
      array: [30, 50, 40],
      highlights: [0],
      variables: {i: 1, job: "(1,3,$30)", start: 1, binary_search: "upperBound(ends, 1, 0, 1) = 0"},
      explanation: "Job 1: (start=1, end=3, profit=30). Binary search for latest job ending <= 1: j=0 (none). dp[1] = max(dp[0], dp[0]+30) = 30.",
      code: "dp[1] = max(dp[0], dp[0]+30) = 30"
    },
    {
      array: [30, 50, 40],
      highlights: [1],
      variables: {i: 2, job: "(2,5,$50)", start: 2, binary_search: "upperBound(ends, 2, 0, 2) = 0", "dp[2]": "max(30, 0+50) = 50"},
      explanation: "Job 2: (start=2, end=5, profit=50). Latest end <= 2: j=0 (none). dp[2] = max(dp[1]=30, dp[0]+50=50) = 50. Taking job 2 alone is better.",
      code: "dp[2] = max(30, 0+50) = 50"
    },
    {
      array: [30, 50, 40],
      highlights: [2],
      secondary: [0],
      variables: {i: 3, job: "(4,6,$40)", start: 4, binary_search: "upperBound(ends, 4, 0, 3) = 1", j: 1},
      explanation: "Job 3: (start=4, end=6, profit=40). Binary search: ends[0]=3 <= 4, ends[1]=5 > 4. j=1 means job 1 is the latest compatible predecessor.",
      code: "j = upperBound(ends, 4) = 1;  // job 1 compatible"
    },
    {
      array: [30, 50, 40],
      highlights: [0, 2],
      variables: {"dp[3]": "max(50, 30+40) = max(50, 70) = 70", selected: "jobs 1 and 3"},
      explanation: "dp[3] = max(dp[2]=50, dp[1]+40=30+40=70) = 70. Taking jobs 1 and 3 (non-overlapping: end 3 <= start 4) beats taking job 2 alone.",
      code: "dp[3] = max(50, 30+40) = 70"
    },
    {
      array: [0, 30, 50, 70],
      highlights: [3],
      labels: {"0": "dp[0]", "1": "dp[1]", "2": "dp[2]", "3": "dp[3]"},
      variables: {answer: 70, selected: "(1,3,$30) + (4,6,$40)", binary_searches: 3, complexity: "O(n log n)"},
      explanation: "Answer: dp[3]=70. Optimal: job (1,3,$30) + job (4,6,$40). Each DP transition used O(log n) binary search instead of O(n) scan.",
      code: "return dp[n];  // 70"
    }
  ]}
/>

---

### 5. Sorting-Based DP

Many DP problems become tractable only after sorting input by a specific criterion.

| Problem Type | Sort By | Why |
|---|---|---|
| Job scheduling | End time | Greedy-compatible, enables binary search for non-overlap |
| Russian doll envelopes | Width ↑, then height ↓ | Reduces to LIS on heights |
| Stacking cuboids | Sorted dimensions, then by one axis | Establishes valid stacking order |
| Interval problems | Start or end time | Creates a natural DP ordering |

**Trap:** Sorting changes indices. If the problem references original indices, maintain a mapping.

---

### 6. Combinatorics DP

DP states combined with combinatorial computations (nCr, factorials, inclusion-exclusion).

**Common patterns:**
- `dp[i]` = number of valid arrangements of first i elements, using precomputed binomial coefficients.
- Derangements: `D(n) = (n-1) * (D(n-1) + D(n-2))`.
- DP on permutations with constraints: `dp[i][last_digit]` with modular arithmetic.

```java
static final long MOD = 1_000_000_007;

long[] fact, invFact;

void precomputeCombinatorics(int n) {
    fact = new long[n + 1];
    invFact = new long[n + 1];
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    invFact[n] = modPow(fact[n], MOD - 2, MOD);
    for (int i = n - 1; i >= 0; i--) invFact[i] = invFact[i + 1] * (i + 1) % MOD;
}

long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] % MOD * invFact[r] % MOD * invFact[n - r] % MOD;
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

---

### 7. Topological Sort DP

When the problem has a DAG structure, compute DP values in topological order to ensure all predecessors are processed first.

```java
import java.util.*;

int dagDp(int n, int[][] edges, int[] values) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[n];
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        indegree[e[1]]++;
    }

    int[] dp = Arrays.copyOf(values, n);  // dp[i] = best value ending at node i
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < n; i++) {
        if (indegree[i] == 0) queue.offer(i);
    }

    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int v : adj.get(u)) {
            dp[v] = Math.max(dp[v], dp[u] + values[v]);
            if (--indegree[v] == 0) queue.offer(v);
        }
    }

    int ans = 0;
    for (int d : dp) ans = Math.max(ans, d);
    return ans;
}
```

<AlgoViz
  title="Topological Sort DP — Longest Path in DAG"
  description="DAG: 0->1, 0->2, 1->3, 2->3, 3->4. Node values [2,3,4,5,1]. Finds longest weighted path by processing nodes in topological order."
  steps={[
    {
      array: [2, 3, 4, 5, 1],
      labels: {"0": "v[0]=2", "1": "v[1]=3", "2": "v[2]=4", "3": "v[3]=5", "4": "v[4]=1"},
      variables: {edges: "0->1, 0->2, 1->3, 2->3, 3->4", indegree: "[0, 1, 1, 2, 1]"},
      explanation: "DAG with 5 nodes, values [2,3,4,5,1]. dp[i] = max weight path ending at node i. Initialize dp = values. Process in topological order.",
      code: "int[] dp = Arrays.copyOf(values, n);"
    },
    {
      array: [2, 3, 4, 5, 1],
      highlights: [0],
      variables: {processing: "node 0 (indegree=0)", "dp[0]": 2},
      explanation: "Node 0 has indegree 0 — enqueue and process first. dp[0]=2 (just node 0's value). Propagate to neighbors 1 and 2.",
      code: "queue.offer(0);  // indegree[0] == 0"
    },
    {
      array: [2, 5, 6, 5, 1],
      highlights: [1, 2],
      secondary: [0],
      variables: {"dp[1]": "max(3, 2+3) = 5", "dp[2]": "max(4, 2+4) = 6", path_to_1: "0->1", path_to_2: "0->2"},
      explanation: "Edge 0->1: dp[1]=max(3, dp[0]+v[1])=max(3,5)=5. Edge 0->2: dp[2]=max(4, dp[0]+v[2])=max(4,6)=6. Both updated.",
      code: "dp[v] = max(dp[v], dp[u] + values[v]);"
    },
    {
      array: [2, 5, 6, 10, 1],
      highlights: [3],
      secondary: [1],
      variables: {processing: "node 1", "dp[3]": "max(5, 5+5) = 10", path: "0->1->3"},
      explanation: "Process node 1: edge 1->3. dp[3]=max(5, dp[1]+v[3])=max(5,10)=10. Path 0->1->3 has weight 2+3+5=10.",
      code: "dp[3] = max(dp[3], dp[1]+values[3]);  // 10"
    },
    {
      array: [2, 5, 6, 11, 1],
      highlights: [3],
      secondary: [2],
      variables: {processing: "node 2", "dp[3]": "max(10, 6+5) = 11", path: "0->2->3 beats 0->1->3"},
      explanation: "Process node 2: edge 2->3. dp[3]=max(10, dp[2]+v[3])=max(10,11)=11. Path 0->2->3 (weight 11) beats 0->1->3 (weight 10)!",
      code: "dp[3] = max(10, dp[2]+values[3]);  // 11"
    },
    {
      array: [2, 5, 6, 11, 12],
      highlights: [4],
      secondary: [3],
      variables: {processing: "node 3", "dp[4]": "max(1, 11+1) = 12", path: "0->2->3->4"},
      explanation: "Process node 3: edge 3->4. dp[4]=max(1, dp[3]+v[4])=max(1,12)=12. Longest path: 0->2->3->4.",
      code: "dp[4] = max(dp[4], dp[3]+values[4]);  // 12"
    },
    {
      array: [2, 5, 6, 11, 12],
      highlights: [0, 2, 3, 4],
      variables: {answer: 12, longest_path: "0->2->3->4", weights: "2+4+5+1 = 12", complexity: "O(V+E)"},
      explanation: "Answer: max(dp) = dp[4] = 12. Longest path: 0->2->3->4 with total weight 12. Topological order guarantees each node is processed after all predecessors.",
      code: "return max(dp);  // 12"
    }
  ]}
/>

---

### 8. Advanced Techniques (Brief Overview)

**Aliens Trick (Lambda Optimization / WQS Binary Search):**
When the recurrence involves "use exactly k groups," add a penalty λ per group and binary search on λ. Reduces a constrained problem to an unconstrained one. Applicable when the optimal cost is convex in k.

**Slope Trick:**
For problems where the DP value function is piecewise-linear and convex, maintain the function as a priority queue of breakpoints. Enables O(n log n) solutions for problems like "Make Array Non-Decreasing with Minimum Cost."

---

## Worked Example: Maximum Profit in Job Scheduling (LC 1235)

**Problem:** Given n jobs with `[startTime[i], endTime[i], profit[i]]`, find the maximum profit such that no two selected jobs overlap.

**Input:**
```
startTime = [1, 2, 3, 3]
endTime   = [3, 4, 5, 6]
profit    = [50, 10, 40, 70]
```

**Step 1: Sort by end time.**

```
Jobs sorted: [(1,3,50), (2,4,10), (3,5,40), (3,6,70)]
ends = [3, 4, 5, 6]
```

**Step 2: DP with binary search.**

`dp[i]` = max profit considering the first i jobs (sorted by end time).

```
dp[0] = 0 (no jobs)

i=1: Job (1,3,50). Start=1. bisect_right(ends, 1, 0, 1) = 0.
     dp[1] = max(dp[0], dp[0] + 50) = max(0, 50) = 50

i=2: Job (2,4,10). Start=2. bisect_right(ends, 2, 0, 2) = 0.
     dp[2] = max(dp[1], dp[0] + 10) = max(50, 10) = 50

i=3: Job (3,5,40). Start=3. bisect_right(ends, 3, 0, 3) = 1.
     dp[3] = max(dp[2], dp[1] + 40) = max(50, 50 + 40) = 90

i=4: Job (3,6,70). Start=3. bisect_right(ends, 3, 0, 4) = 1.
     dp[4] = max(dp[3], dp[1] + 70) = max(90, 50 + 70) = 120
```

**Answer: 120** — select jobs (1,3,50) and (3,6,70).

**Why not brute force?** Without any optimization, for each of the n jobs we would scan all previous jobs to find the best non-conflicting predecessor -- O(n squared) total. For n = 50,000, that is 2.5 billion operations and far too slow. Sorting by end time and using binary search exploits the monotonic structure: if job A ends before job B, then any job compatible with B is also compatible with A. This monotonicity is exactly what binary search needs.

**Why binary search works:** `bisect_right(ends, start, 0, i)` finds the latest job whose end time is at most the start time of the current job. This is the latest non-conflicting job. Without binary search, finding this would require O(n) scan per job, giving O(n squared) total. With binary search: O(n log n).

**Key insight summary:** The combination of sorting (to create a meaningful order) and binary search (to exploit that order) reduces the DP transition from O(n) to O(log n). This pattern -- sort, then binary-search within the DP -- is the most frequently tested DP optimization in interviews.

---

## Pattern Recognition Guide

| Signal | Technique | Speedup |
|---|---|---|
| `dp[i] = min/max(dp[j] + f(j) * g(i))` where f,g monotonic | Convex Hull Trick | O(n²) → O(n) or O(n log n) |
| Optimal split point `opt[i]` is monotonic in i | Divide & Conquer DP | O(kn²) → O(kn log n) |
| `opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]` | Knuth-Yao | O(n³) → O(n²) |
| "Find latest non-overlapping item" | Binary search + DP | O(n²) → O(n log n) |
| Need LIS or similar monotonic structure | Patience sorting / binary search | O(n²) → O(n log n) |
| "Sort by X, then DP on Y" | Sorting-based DP | Enables correct transition order |
| DP on a DAG | Topological sort + DP | O(V + E) |
| "Exactly k groups" with convex cost | Aliens trick (WQS) | Removes one DP dimension |

---

## Problem Set (21 Problems)

### Tier 1: Binary Search + Sorting DP (Core Interview Skills)

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 1 | Maximum Profit in Job Scheduling | Hard | Sort by end + binary search for non-overlap | [LC 1235](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) |
| 2 | Maximum Number of Events II | Hard | Sort by end + binary search, k events | [LC 1751](https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended-ii/) |
| 3 | Maximum Earnings From Taxi | Medium | Sort by end + binary search | [LC 2008](https://leetcode.com/problems/maximum-earnings-from-taxi/) |
| 4 | Make Array Strictly Increasing | Hard | Sort + binary search + DP on sequences | [LC 1187](https://leetcode.com/problems/make-array-strictly-increasing/) |
| 5 | Maximum Height by Stacking Cuboids | Hard | Sort dimensions + LIS-style DP | [LC 1691](https://leetcode.com/problems/maximum-height-by-stacking-cuboids/) |
| 6 | Minimum Operations to Make Array Continuous | Hard | Sort + sliding window / binary search | [LC 2009](https://leetcode.com/problems/minimum-number-of-operations-to-make-array-continuous/) |
| 7 | Minimum Operations to Make Array K-Increasing | Hard | Split into subsequences + LIS | [LC 2111](https://leetcode.com/problems/minimum-operations-to-make-the-array-k-increasing/) |

### Tier 2: Partitioning + Interval DP Optimization

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 8 | Minimum Difficulty of a Job Schedule | Hard | Partition into k days, D&C optimization possible | [LC 1335](https://leetcode.com/problems/minimum-difficulty-of-a-job-schedule/) |
| 9 | Split Array Largest Sum | Hard | Binary search on answer OR DP partition | [LC 410](https://leetcode.com/problems/split-array-largest-sum/) |
| 10 | Largest Sum of Averages | Medium | Partition into k groups, prefix sums | [LC 813](https://leetcode.com/problems/largest-sum-of-averages/) |
| 11 | Partition Array for Maximum Sum | Medium | `dp[i]` = max sum with partitions of length ≤ k | [LC 1043](https://leetcode.com/problems/partition-array-for-maximum-sum/) |
| 12 | Minimum Cost to Cut a Stick | Medium | Interval DP, Knuth-Yao applicable | [LC 1547](https://leetcode.com/problems/minimum-cost-to-cut-a-stick/) |
| 13 | Palindrome Partitioning IV | Hard | Precompute palindromes + 3-partition check | [LC 1745](https://leetcode.com/problems/palindrome-partitioning-iv/) |
| 14 | Minimum Total Space Wasted With K Resizing | Medium | `dp[k][i]` partition with waste calculation | [LC 1959](https://leetcode.com/problems/minimum-total-space-wasted-with-k-resizing-operations/) |

### Tier 3: Advanced Optimization

| # | Problem | Difficulty | Key Technique | Link |
|---|---|---|---|---|
| 15 | Number of Sets of K Non-Overlapping Segments | Medium | Combinatorics DP with nCr | [LC 1621](https://leetcode.com/problems/number-of-sets-of-k-non-overlapping-line-segments/) |
| 16 | Minimum White Tiles After Covering With Carpets | Hard | `dp[i][j]` with carpet placement optimization | [LC 2209](https://leetcode.com/problems/minimum-white-tiles-after-covering-with-carpets/) |
| 17 | Minimum Total Distance Traveled | Hard | Sort + DP with capacity constraints | [LC 2463](https://leetcode.com/problems/minimum-total-distance-traveled/) |
| 18 | Find Two Non-overlapping Subarrays Each With Target Sum | Medium | Prefix/suffix min + sliding window | [LC 1477](https://leetcode.com/problems/find-two-non-overlapping-sub-arrays-each-with-target-sum/) |
| 19 | Number of Distinct Roll Sequences | Hard | `dp[i][last][second_last]` with mod arithmetic | [LC 2318](https://leetcode.com/problems/number-of-distinct-roll-sequences/) |
| 20 | Minimum Cost to Split an Array | Hard | `dp[i]` with frequency tracking + trimmed cost | [LC 2547](https://leetcode.com/problems/minimum-cost-to-split-an-array/) |
| 21 | Minimum Time to Make Rope Colorful | Medium | Greedy / simple DP on consecutive groups | [LC 1578](https://leetcode.com/problems/minimum-time-to-make-rope-colorful/) |

---

## Mock Interview

### Problem 1: Maximum Profit in Job Scheduling (LC 1235) — 25 minutes

**Interviewer:** "You have n jobs with start times, end times, and profits. Select non-overlapping jobs to maximize total profit."

**Candidate approach:**

1. **Clarify:** Jobs can't overlap (end time of one ≤ start time of next). n ≤ 5 × 10^4.
2. **Sort by end time.** This lets us build DP left to right.
3. **DP:** `dp[i]` = max profit using the first i jobs. Either skip job i (`dp[i-1]`) or take it (`dp[j] + profit[i]` where j is the latest non-conflicting job).
4. **Binary search** to find j: `bisect_right(ends, start[i])`.
5. **Time:** O(n log n). **Space:** O(n).

**Follow-up 1:** "What if we must select exactly k jobs?"

> Add a dimension: `dp[i][j]` = max profit using first i jobs, selecting exactly j. Binary search still applies for finding latest non-conflicting job. Time: O(nk log n).

**Follow-up 2:** "What if jobs have a 'cooldown' period after completion?"

> Modify the binary search: instead of finding the latest job ending at or before `start[i]`, find the latest job ending at or before `start[i] - cooldown`. Same algorithmic structure.

**Follow-up 3:** "Can this be solved with a greedy approach?"

> No — greedy (by profit or by end time) fails because taking a high-profit long job might block multiple smaller profitable jobs. DP is necessary. However, the binary search component has a greedy flavor: we greedily find the optimal non-conflicting predecessor.

---

### Problem 2: Split Array Largest Sum (LC 410) — 20 minutes

**Interviewer:** "Split an array into k subarrays to minimize the maximum subarray sum."

**Candidate approach:**

**Approach A — Binary Search on Answer (preferred for interviews):**

1. The answer lies in `[max(nums), sum(nums)]`.
2. Binary search on threshold T. Greedily check: can we split into ≤ k subarrays where each sum ≤ T?
3. **Time:** O(n log S) where S = sum(nums).

```java
int splitArray(int[] nums, int k) {
    int lo = 0, hi = 0;
    for (int x : nums) {
        lo = Math.max(lo, x);
        hi += x;
    }
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canSplit(nums, k, mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

boolean canSplit(int[] nums, int k, int threshold) {
    int count = 1, curSum = 0;
    for (int x : nums) {
        if (curSum + x > threshold) {
            count++;
            curSum = x;
        } else {
            curSum += x;
        }
    }
    return count <= k;
}
```

**Approach B — DP:**

1. `dp[j][i]` = min largest sum splitting first i elements into j groups.
2. `dp[j][i] = min over m: max(dp[j-1][m], sum(nums[m..i-1]))`.
3. **Time:** O(k · n²) naively, O(k · n log n) with D&C optimization (optimal split point is monotonic).

**Follow-up 1:** "When would you prefer DP over binary search here?"

> DP is better when the "feasibility check" is expensive or when you need the actual partition (not just the optimal value). Binary search is better for interviews — simpler to code, O(n log S) vs O(kn²), and easy to explain. The D&C optimized DP matches binary search in theory but is harder to implement.

**Follow-up 2:** "How does the Convex Hull Trick apply to similar problems?"

> CHT applies when the transition is `dp[i] = min(dp[j] + b[j] * a[i])` — a linear function in the query point. Split Array Largest Sum's transition involves a `max` (not a linear combination), so CHT doesn't directly apply. But problems like "minimum cost to split into groups with quadratic cost" are CHT candidates.

**Follow-up 3:** "What about the Divide & Conquer optimization for this problem?"

> The D&C optimization applies because the optimal split point m for fixed (j, i) is monotonically non-decreasing in i. This lets us solve the DP layer j in O(n log n) instead of O(n²), giving O(kn log n) overall. The proof relies on the cost function satisfying concavity-like properties.

---

## Tips & Pitfalls

### Recognizing CHT

- **Look for:** `dp[i] = min/max over j of (dp[j] + f(j) * g(i) + h(i))`. The `h(i)` term factors out (it's constant for fixed i). The remaining `dp[j] + f(j) * g(i)` is a line `y = mx + b` where `m = f(j)`, `b = dp[j]`, `x = g(i)`.
- **Check monotonicity:** If slopes `f(j)` are added in sorted order and queries `g(i)` are monotonic, use deque-based CHT (amortized O(1)). Otherwise, use Li Chao tree (O(log n)).
- **Common trap:** Forgetting that CHT works for min of lines (lower envelope) or max of lines (upper envelope), but not both simultaneously.

### Knuth-Yao Conditions

The optimization applies when:
1. `w(a, c) + w(b, d) ≤ w(a, d) + w(b, c)` for `a ≤ b ≤ c ≤ d` (quadrangle inequality)
2. `w(b, c) ≤ w(a, d)` for `a ≤ b ≤ c ≤ d` (monotonicity)

**Easy check:** If `w(i, j) = prefix[j] - prefix[i]` (sum-based), these conditions hold. If `w` involves max/min operations, they usually don't.

### When to Sort Before DP

- **Job scheduling:** Sort by end time → binary search for latest non-conflicting.
- **LIS variants (envelopes, cuboids):** Sort by one dimension, DP/binary search on another.
- **Interval covering:** Sort by start or end, process left to right.
- **Trap:** If sorting changes the problem semantics (e.g., "contiguous subarray" becomes meaningless after sorting), don't sort.

### Practical Interview Advice

1. **Binary search + DP** is by far the most commonly tested optimization. Master LC 1235, LC 410, LC 1187 cold.
2. **CHT and D&C DP** appear in competitive programming and senior-level interviews at quantitative firms (Jane Street, Citadel). For standard FAANG interviews, recognizing these patterns is enough — you rarely need to implement them.
3. **Knuth-Yao** is even rarer in interviews but valuable for competitive programming. Know the conditions; implementation follows naturally from standard interval DP.
4. **Always start with the brute-force DP.** Write the O(n²) or O(n³) solution first, verify correctness, then optimize. Interviewers value correct-then-optimize over clever-but-buggy.
5. **Space optimization:** Many 2D DPs only depend on the previous row. Use rolling arrays to reduce O(nk) space to O(n).
