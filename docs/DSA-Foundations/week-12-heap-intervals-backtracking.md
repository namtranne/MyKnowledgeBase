---
sidebar_position: 13
title: "Week 12: Heap, Intervals + Backtracking"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 12: Heap, Intervals + Backtracking

Congratulations — you've reached the **final week** of the 12-week DSA Foundations roadmap. This week brings together three patterns that appear constantly in interviews: **heaps** for efficient priority-based selection, **intervals** for range-based reasoning, and **backtracking** for exhaustive-search problems where you build candidates and prune dead ends. Mastering these three unlocks a huge slice of the medium-to-hard problem space.

---

## 1 · Core Theory

### 1.1 Heap / Priority Queue

**Why heaps exist.** Many problems require repeatedly finding the best (smallest or largest) element in a changing collection. A sorted array gives O(1) lookup but O(n) insertion. A heap gives O(log n) for both insertion and extraction — the sweet spot when you need dynamic priority ordering. Heaps are the engine behind Dijkstra's shortest-path algorithm, the Top-K pattern, running-median tracking, and any problem that says "repeatedly pick the best available option."

**Intuition.** Picture a tournament bracket. The winner (root) is always the best player. When the champion retires (poll), a new mini-tournament among the remaining players restores the bracket in O(log n) rounds — far cheaper than re-sorting the entire field.

**Interview signals.** Look for "K largest," "K smallest," "K most frequent," "merge K sorted," "running median," "schedule to minimize," or "next closest." Any time you need repeated access to the extreme element of a dynamic set, a heap is likely the answer.

**Common mistakes.** Forgetting Java's `PriorityQueue` is a min-heap by default — you need `Collections.reverseOrder()` for a max-heap. Using `remove(Object)` which is O(n), instead of `poll()` which is O(log n). Trying to iterate a `PriorityQueue` in sorted order (iteration order is NOT sorted; you must poll repeatedly).

A **heap** is a complete binary tree stored as an array where every parent satisfies the *heap property*:

| Variant | Property | Root holds |
|---|---|---|
| Min-heap | parent &le; children | Smallest element |
| Max-heap | parent &ge; children | Largest element |

**Key operations and complexities:**

| Operation | Time |
|---|---|
| Insert (offer) | O(log n) |
| Extract min/max (poll) | O(log n) |
| Peek min/max | O(1) |
| Heapify an array (PriorityQueue constructor) | O(n) |

#### Java PriorityQueue

Java's `PriorityQueue` implements a **min-heap** by default. Use a custom `Comparator` for max-heap behaviour.

```java
import java.util.*;

int[] nums = {5, 3, 8, 1, 2};
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
for (int num : nums) minHeap.offer(num); // O(log n) per insert
int smallest = minHeap.poll(); // poll min O(log n)

// Max-heap: use reversed comparator
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
maxHeap.offer(val);
int largest = maxHeap.poll();
```

<AlgoViz
  title="Min-Heap: Insert & Extract-Min"
  description="Insert values [5,3,8,1] into a min-heap one at a time, showing bubble-up after each insert. Then extract the minimum, showing bubble-down to restore the heap property."
  steps={[
    { array: [5], highlights: [0], variables: { op: "insert 5", heapSize: 1 }, explanation: "Insert 5. The heap has one element, so it is trivially valid. 5 becomes the root.", code: "heap.offer(5); // [5]" },
    { array: [3,5], highlights: [0], secondary: [1], variables: { op: "insert 3", bubble: "3 < 5, swap with parent", heapSize: 2 }, explanation: "Insert 3 at the end. 3 is less than parent 5, so bubble up: swap 3 and 5. Now 3 is the root.", code: "heap.offer(3); // [5,3] -> bubble -> [3,5]" },
    { array: [3,5,8], highlights: [0,1,2], variables: { op: "insert 8", bubble: "8 > 3, no swap needed", heapSize: 3 }, explanation: "Insert 8 at the end. 8 is greater than parent 3, so no bubble-up needed. Heap: [3,5,8].", code: "heap.offer(8); // [3,5,8]" },
    { array: [3,5,8,1], highlights: [3], variables: { op: "insert 1", bubble: "1 < 5 (parent), swap", heapSize: 4 }, explanation: "Insert 1 at index 3. Parent is index 1 (value 5). Since 1 is less than 5, bubble up.", code: "heap.offer(1); // [3,5,8,1] -> bubble..." },
    { array: [1,3,8,5], highlights: [0], secondary: [1,3], variables: { op: "bubble-up complete", swaps: "1<->5, then 1<->3", heapSize: 4 }, explanation: "1 swapped with 5 (index 1), then 1 swapped with 3 (index 0). 1 is now the root. Min-heap restored!", code: "// [3,5,8,1] -> [3,1,8,5] -> [1,3,8,5]" },
    { array: [3,5,8], highlights: [0], secondary: [], variables: { op: "extract-min", extracted: 1, bubble: "Move last element (5) to root, bubble down" }, explanation: "Extract-min removes root (1). Move last element 5 to root position. Bubble down: 5 vs children 3,8.", code: "int min = heap.poll(); // 1" },
    { array: [3,5,8], highlights: [0,1,2], variables: { op: "bubble-down complete", swap: "5 > 3, swap root with left child", heap: "[3,5,8]" }, explanation: "5 is greater than left child 3, so swap. 5 moves to index 1. No more violations. Heap: [3,5,8].", code: "// [5,3,8] -> [3,5,8] (bubble-down done)" },
    { array: [3,5,8], highlights: [0], variables: { finalHeap: "[3,5,8]", extracted: 1, nextMin: 3 }, explanation: "Done! Extracted min=1. Remaining heap [3,5,8] with 3 as the new minimum. Insert: O(log n), Extract: O(log n).", code: "// Insert O(log n), Extract-min O(log n)" }
  ]}
/>

#### Top-K Pattern

"Find the K largest/smallest/most-frequent elements."

- **K largest** → maintain a **min-heap of size K**. When a new element is larger than the heap's min, poll the min and offer the new element. After processing, the heap contains the K largest.
- **K smallest** → maintain a **max-heap of size K**.

```java
import java.util.*;

public static List<Integer> topKLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int num : nums) {
        heap.offer(num);
        if (heap.size() > k) {
            heap.poll();
        }
    }
    return new ArrayList<>(heap); // k largest elements (unordered)
}
```

#### Top K Elements Animation

<AlgoViz
  title="Top K Largest Elements — Min-Heap of Size K"
  description="Find the 3 largest elements in [5, 1, 8, 3, 9, 2, 7] using a min-heap of size K=3"
  steps={[
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [0],
      tree: { val: 5 },
      variables: { K: 3, heapSize: 1, heap: "[5]" },
      explanation: "Process 5. Heap has room (size < K=3). Insert 5. Heap: [5].",
      code: "heap.offer(5); // size=1 < K=3, just insert"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [1],
      tree: { val: 1, children: [{ val: 5 }] },
      variables: { K: 3, heapSize: 2, heap: "[1, 5]" },
      explanation: "Process 1. Heap has room. Insert 1. It bubbles to root (min-heap). Heap: [1, 5].",
      code: "heap.offer(1); // size=2 < K=3"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [2],
      tree: { val: 1, children: [{ val: 5 }, { val: 8 }] },
      variables: { K: 3, heapSize: 3, heap: "[1, 5, 8]" },
      explanation: "Process 8. Heap has room. Insert 8. Heap: [1, 5, 8]. Now heap is full (size=K).",
      code: "heap.offer(8); // size=3 == K, heap now full"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [3],
      tree: { val: 3, children: [{ val: 5 }, { val: 8 }] },
      variables: { K: 3, element: 3, heapMin: 1, "3 > 1": "yes, replace" },
      explanation: "Process 3. Heap min is 1. Since 3 > 1, poll 1 and insert 3. This keeps the 3 largest seen so far.",
      code: "heap.poll(); heap.offer(3); // evict 1, add 3"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [4],
      tree: { val: 5, children: [{ val: 9 }, { val: 8 }] },
      variables: { K: 3, element: 9, heapMin: 3, "9 > 3": "yes, replace" },
      explanation: "Process 9. Heap min is 3. Since 9 > 3, poll 3 and insert 9. Heap: [5, 9, 8].",
      code: "heap.poll(); heap.offer(9); // evict 3, add 9"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [5],
      variables: { K: 3, element: 2, heapMin: 5, "2 > 5": "no, skip", heap: "[5, 9, 8]" },
      explanation: "Process 2. Heap min is 5. Since 2 < 5, skip — 2 cannot be in the top 3.",
      code: "// 2 < heap.peek()=5, skip"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [6],
      tree: { val: 7, children: [{ val: 9 }, { val: 8 }] },
      variables: { K: 3, element: 7, heapMin: 5, "7 > 5": "yes, replace" },
      explanation: "Process 7. Heap min is 5. Since 7 > 5, poll 5 and insert 7. Heap: [7, 9, 8].",
      code: "heap.poll(); heap.offer(7); // evict 5, add 7"
    },
    {
      array: [5, 1, 8, 3, 9, 2, 7],
      highlights: [2, 4, 6],
      variables: { result: "[7, 8, 9]", time: "O(n log K)", space: "O(K)" },
      explanation: "Done! Heap contains [7, 8, 9] — the 3 largest elements. Time: O(n log K), much better than O(n log n) sorting when K is small.",
      code: "return new ArrayList<>(heap); // [7, 8, 9]"
    }
  ]}
/>

**Time:** O(n log K) — much better than full sort O(n log n) when K is small.

#### Two-Heap Median Pattern

Maintain two heaps to track the **running median** of a stream:

- `maxHeap` — stores the **smaller** half.
- `minHeap` — stores the **larger** half.

**Invariant:** `maxHeap.size() == minHeap.size()` or `maxHeap.size() == minHeap.size() + 1`.

```java
import java.util.*;

class MedianFinder {
    private PriorityQueue<Integer> lo; // max-heap (smaller half)
    private PriorityQueue<Integer> hi; // min-heap (larger half)

    public MedianFinder() {
        lo = new PriorityQueue<>(Collections.reverseOrder());
        hi = new PriorityQueue<>();
    }

    public void addNum(int num) {
        lo.offer(num);
        hi.offer(lo.poll());
        if (hi.size() > lo.size()) {
            lo.offer(hi.poll());
        }
    }

    public double findMedian() {
        if (lo.size() > hi.size()) {
            return lo.peek();
        }
        return (lo.peek() + hi.peek()) / 2.0;
    }
}
```

**Each `addNum`:** O(log n). **`findMedian`:** O(1).

---

### 1.2 Intervals

Interval problems deal with ranges `[start, end]`. The universal first step is almost always **sort** — by start time, by end time, or both.

#### Sorting Strategy

| Goal | Sort by | Why |
|---|---|---|
| Merge overlapping intervals | Start time | Process left-to-right, extend or close |
| Maximise non-overlapping count | End time | Greedy: pick the interval that finishes earliest |
| Insert a new interval | Start time (already sorted) | Binary search or linear scan |

#### Merge Overlapping Intervals

```java
import java.util.*;

public static int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> merged = new ArrayList<>();
    merged.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] last = merged.get(merged.size() - 1);
        if (intervals[i][0] <= last[1]) {
            last[1] = Math.max(last[1], intervals[i][1]);
        } else {
            merged.add(intervals[i]);
        }
    }

    return merged.toArray(new int[0][]);
}
```

**Time:** O(n log n) for the sort + O(n) for the merge pass.

<AlgoViz
  title="Merge Intervals: [[1,3],[2,6],[8,10],[15,18]]"
  description="Sort intervals by start time, then scan left-to-right. If the current interval overlaps with the last merged one (start &lt;= prevEnd), extend. Otherwise start a new group."
  steps={[
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [], variables: { input: "[[1,3],[2,6],[8,10],[15,18]]", step: "Sort by start time" }, explanation: "Input: 4 intervals. Step 1: sort by start time. These are already sorted.", code: "Arrays.sort(intervals, (a, b) -> a[0] - b[0]);" },
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [0,1], variables: { merged: "[[1,3]]", step: "Init with first interval" }, explanation: "Initialise the merged list with the first interval [1,3].", code: "merged.add(intervals[0]); // [1,3]" },
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [2,3], secondary: [0,1], variables: { current: "[2,6]", lastEnd: 3, "2<=3": "OVERLAP", newEnd: "max(3,6)=6" }, explanation: "Check [2,6]: start=2 is less than or equal to lastEnd=3 -- overlap! Extend end to max(3,6)=6. Merged: [[1,6]].", code: "last[1] = Math.max(3, 6); // [1,6]" },
    { array: [1,6, 8,10, 15,18], highlights: [0,1], variables: { merged: "[[1,6]]", note: "Two intervals merged into one" }, explanation: "[1,3] and [2,6] merged into [1,6]. The overlapping region is absorbed.", code: "// merged = [[1,6]]" },
    { array: [1,6, 8,10, 15,18], highlights: [2,3], variables: { current: "[8,10]", lastEnd: 6, "8<=6": "NO OVERLAP" }, explanation: "Check [8,10]: start=8 is greater than lastEnd=6 -- no overlap. Append as a new interval.", code: "merged.add(new int[]{8, 10});" },
    { array: [1,6, 8,10, 15,18], highlights: [4,5], variables: { current: "[15,18]", lastEnd: 10, "15<=10": "NO OVERLAP" }, explanation: "Check [15,18]: start=15 is greater than lastEnd=10 -- no overlap. Append as a new interval.", code: "merged.add(new int[]{15, 18});" },
    { array: [1,6, 8,10, 15,18], highlights: [0,1,2,3,4,5], variables: { result: "[[1,6],[8,10],[15,18]]", merges: 1, final: "3 intervals" }, explanation: "Done! Result: [[1,6],[8,10],[15,18]]. Four intervals reduced to three after one merge.", code: "return merged.toArray(new int[0][]);" }
  ]}
/>

#### Sweep Line Basics

A sweep line converts interval problems into **event processing**:

1. Create events: `(time, +1)` for interval start, `(time, -1)` for interval end.
2. Sort events by time (break ties: ends before starts if intervals are closed, or starts before ends depending on the problem).
3. Sweep left-to-right, maintaining a running count or heap.

This technique powers problems like Meeting Rooms II (maximum concurrent meetings) and Minimum Interval to Include Each Query.

```java
import java.util.*;

public static int minMeetingRooms(int[][] intervals) {
    List<int[]> events = new ArrayList<>();
    for (int[] iv : intervals) {
        events.add(new int[]{iv[0], 1});
        events.add(new int[]{iv[1], -1});
    }
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    int rooms = 0, maxRooms = 0;
    for (int[] event : events) {
        rooms += event[1];
        maxRooms = Math.max(maxRooms, rooms);
    }
    return maxRooms;
}
```

---

### 1.3 Backtracking

**Why backtracking exists.** Some problems have no polynomial-time shortcut — you genuinely need to explore many (or all) possible configurations. Brute force generates everything and then filters; backtracking is smarter because it **prunes** entire branches of the search tree as soon as a partial candidate violates a constraint. This can reduce the practical runtime from "heat death of the universe" to "a few seconds" even though the worst case is still exponential.

**Intuition.** Imagine solving a maze. At each fork you pick a direction and keep walking. If you hit a dead end, you backtrack to the last fork and try the other path. You never explore passages beyond a dead end — that is the pruning. Backtracking does exactly this with decision trees: pick a choice, recurse, undo the choice, try the next.

**Interview signals.** "Generate all permutations/combinations/subsets." "Find all valid configurations." "Place N items satisfying constraints." "Can you partition into groups?" Anytime the problem says "all" or "every valid" arrangement, think backtracking. If it asks for a count or an optimum instead, consider whether DP could replace the enumeration.

**Common mistakes.** Forgetting to snapshot the path (`result.add(new ArrayList<>(path))`) — adding the mutable reference means all results point to the same empty list. Forgetting to unchoose (remove the last element after recursing). Not sorting before deduplication — the `i &gt; start` skip trick only works on sorted input.

Backtracking explores all potential solutions by building candidates incrementally and **abandoning (pruning)** a branch as soon as it cannot lead to a valid answer.

#### The Recursion Tree

Every backtracking problem forms a **decision tree**:

- Each **node** represents a partial candidate.
- Each **edge** represents a choice (include an element, place a queen, pick a letter).
- **Leaves** are complete candidates (or dead ends).

#### Choose → Explore → Unchoose

The universal template:

```java
void backtrack(List<Integer> candidate, int[] choices) {
    if (isComplete(candidate)) {
        result.add(new ArrayList<>(candidate)); // snapshot
        return;
    }
    for (int choice : choices) {
        if (!isValid(choice)) continue;  // prune
        candidate.add(choice);           // choose
        backtrack(candidate, nextChoices); // explore
        candidate.remove(candidate.size() - 1); // unchoose
    }
}
```

#### Permutations vs Combinations vs Subsets

| Type | Order matters? | Duplicates? | Key constraint |
|---|---|---|---|
| Permutations | Yes | No | Use a `boolean[] used` array |
| Combinations | No | No | Track a `start` index, move forward only |
| Subsets | No | No | Like combinations — include/exclude each element |
| Subsets II (with dupes) | No | Input has dupes | Sort + skip `nums[i] == nums[i-1]` when `i &gt; start` |

#### Subsets Template

```java
public static List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private static void backtrack(int[] nums, int start, List<Integer> path,
                               List<List<Integer>> result) {
    result.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        backtrack(nums, i + 1, path, result);
        path.remove(path.size() - 1);
    }
}
```

#### Subsets Generation Animation

<AlgoViz
  title="Backtracking — Subsets of [1, 2, 3]"
  description="Generate all subsets using the include/skip decision tree. At each index, choose to include the element or move past it."
  steps={[
    {
      array: [1, 2, 3],
      stack: [],
      highlights: [],
      variables: { subsets: "[[]]", start: 0 },
      explanation: "Start with empty path []. Add it to results (every call records the current path as a valid subset). Now try including each element from index 0.",
      code: "result.add(new ArrayList<>(path)); // add []"
    },
    {
      array: [1, 2, 3],
      stack: ["1"],
      highlights: [0],
      variables: { path: "[1]", subsets: "[[], [1]]", start: 1 },
      explanation: "Include 1. Path=[1]. Add [1] to results. Recurse with start=1 to try elements after index 0.",
      code: "path.add(1); result.add([1]); backtrack(start=1);"
    },
    {
      array: [1, 2, 3],
      stack: ["1", "2"],
      highlights: [0, 1],
      variables: { path: "[1,2]", subsets: "[[], [1], [1,2]]", start: 2 },
      explanation: "Include 2. Path=[1,2]. Add [1,2] to results. Recurse with start=2.",
      code: "path.add(2); result.add([1,2]); backtrack(start=2);"
    },
    {
      array: [1, 2, 3],
      stack: ["1", "2", "3"],
      highlights: [0, 1, 2],
      variables: { path: "[1,2,3]", subsets: "4 subsets so far", start: 3 },
      explanation: "Include 3. Path=[1,2,3]. Add [1,2,3]. start=3 equals array length, so no more elements to try. Backtrack: remove 3.",
      code: "path.add(3); result.add([1,2,3]); // backtrack"
    },
    {
      array: [1, 2, 3],
      stack: ["1", "3"],
      highlights: [0, 2],
      variables: { path: "[1,3]", subsets: "5 subsets so far", unchoose: "removed 2, try 3" },
      explanation: "Backtrack: remove 3, remove 2. Now try 3 after 1: path=[1,3]. Add [1,3] to results.",
      code: "path.remove(last); // unchoose 2, then add 3"
    },
    {
      array: [1, 2, 3],
      stack: ["2"],
      highlights: [1],
      variables: { path: "[2]", subsets: "6 subsets so far", note: "Backtracked past 1" },
      explanation: "Backtrack fully from 1. Start with 2: path=[2]. Add [2]. Will also generate [2,3].",
      code: "path = [2]; result.add([2]);"
    },
    {
      array: [1, 2, 3],
      stack: ["3"],
      highlights: [2],
      variables: { path: "[3]", subsets: "7 subsets (after [2,3])" },
      explanation: "After adding [2,3], backtrack. Start with 3: path=[3]. Add [3].",
      code: "path = [3]; result.add([3]);"
    },
    {
      array: [1, 2, 3],
      stack: [],
      highlights: [],
      variables: { allSubsets: "[[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]", total: "2^3 = 8" },
      explanation: "Done! All 8 subsets generated. The decision tree has depth n=3. Total subsets = 2^n = 8. Time: O(n * 2^n).",
      code: "return result; // 8 subsets"
    }
  ]}
/>

<AlgoViz
  title="Backtracking Permutations of [1,2,3]"
  description="Generate all permutations using the choose-explore-unchoose pattern. A stack tracks the current path. At each level we try all unused elements, recurse, then backtrack."
  steps={[
    { array: [1,2,3], stack: [], highlights: [], variables: { unused: "[1,2,3]", permutations: "[]" }, explanation: "Start with an empty path. We will try each element as the first choice.", code: "backtrack(nums, path=[], used=[])" },
    { array: [1,2,3], stack: ["1"], highlights: [0], variables: { choose: 1, unused: "[2,3]", depth: 1 }, explanation: "Choose 1 as the first element. Mark it used. Recurse to pick the second element from [2,3].", code: "path.add(1); used[0] = true;" },
    { array: [1,2,3], stack: ["1","2"], highlights: [0,1], variables: { choose: 2, unused: "[3]", depth: 2 }, explanation: "Choose 2 as the second element. Only 3 remains.", code: "path.add(2); used[1] = true;" },
    { array: [1,2,3], stack: ["1","2","3"], highlights: [0,1,2], variables: { choose: 3, depth: 3, result: "[[1,2,3]]" }, explanation: "Choose 3. Path is complete: [1,2,3]. Add to results. Backtrack: unchoose 3.", code: "result.add([1,2,3]); path.remove(3);" },
    { array: [1,2,3], stack: ["1","3"], highlights: [0,2], variables: { unchoose: 2, choose: 3, depth: 2 }, explanation: "Backtrack from 2, now try 3 as second element. Path: [1,3].", code: "used[1]=false; path.add(3); used[2]=true;" },
    { array: [1,2,3], stack: ["1","3","2"], highlights: [0,1,2], variables: { choose: 2, depth: 3, result: "[[1,2,3],[1,3,2]]" }, explanation: "Choose 2. Path complete: [1,3,2]. Add to results. Now backtrack all the way and try 2 as first element.", code: "result.add([1,3,2]);" },
    { array: [1,2,3], stack: ["2"], highlights: [1], variables: { unchoose: "1", choose: 2, note: "Starting fresh with 2 as first" }, explanation: "Backtrack to root. Choose 2 as first element. Will generate [2,1,3] and [2,3,1].", code: "path = [2]; used = [false, true, false];" },
    { array: [1,2,3], stack: [], highlights: [], variables: { allPermutations: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", total: "3! = 6" }, explanation: "All 6 permutations generated! The backtracking tree has depth n=3 and n! leaves. Time: O(n * n!).", code: "return result; // 6 permutations" }
  ]}
/>

#### Permutations Template

```java
public static List<List<Integer>> permutations(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new ArrayList<>(), new boolean[nums.length], result);
    return result;
}

private static void backtrack(int[] nums, List<Integer> path, boolean[] used,
                               List<List<Integer>> result) {
    if (path.size() == nums.length) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrack(nums, path, used, result);
        path.remove(path.size() - 1);
        used[i] = false;
    }
}
```

#### Combination Sum Template

```java
public static List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(candidates);
    backtrack(candidates, 0, new ArrayList<>(), target, result);
    return result;
}

private static void backtrack(int[] candidates, int start, List<Integer> path,
                               int remaining, List<List<Integer>> result) {
    if (remaining == 0) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break; // prune (requires sorted candidates)
        path.add(candidates[i]);
        backtrack(candidates, i, path, remaining - candidates[i], result);
        path.remove(path.size() - 1);
    }
}
```

#### Pruning

Pruning is what makes backtracking feasible. Common strategies:

- **Constraint propagation:** skip choices that violate a rule (e.g., same column/diagonal in N-Queens).
- **Sorting + early termination:** if candidates are sorted and the current candidate exceeds the target, break the loop.
- **Duplicate skipping:** sort the input and skip `nums[i] == nums[i-1]` when `i > start` to avoid duplicate subsets/combinations.

#### N-Queens Animation

<AlgoViz
  title="Backtracking — N-Queens (4x4 Board)"
  description="Place 4 queens on a 4x4 board so no two attack each other. Watch placement, conflict detection, and backtracking."
  steps={[
    {
      array: [0, 1, 2, 3],
      labels: { 0: "col0", 1: "col1", 2: "col2", 3: "col3" },
      highlights: [1],
      variables: { row: 0, placed: "Q at (0,1)", board: ".Q.. / .... / .... / ...." },
      explanation: "Row 0: Place queen at column 1. Mark column 1, diagonal (0-1=-1), and anti-diagonal (0+1=1) as occupied.",
      code: "board[0] = 1; cols.add(1); diags.add(-1); antiDiags.add(1);"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [3],
      secondary: [0, 1, 2],
      variables: { row: 1, placed: "Q at (1,3)", board: ".Q.. / ...Q / .... / ....", blocked: "cols 0,1,2" },
      explanation: "Row 1: Col 0 — anti-diagonal conflict. Col 1 — same column. Col 2 — diagonal conflict. Col 3 is safe! Place queen at (1,3).",
      code: "board[1] = 3; cols.add(3);"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [],
      secondary: [0, 1, 2, 3],
      variables: { row: 2, board: ".Q.. / ...Q / ???? / ....", result: "ALL BLOCKED" },
      explanation: "Row 2: Every column is attacked! Col 0 — anti-diag from (1,3). Col 1 — same col as (0,1). Col 2 — diag from (1,3). Col 3 — same col as (1,3). Dead end — backtrack!",
      code: "// All columns blocked in row 2 -> backtrack"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [2],
      variables: { row: 0, placed: "Q at (0,2)", board: "..Q. / .... / .... / ....", note: "Retry row 0 with col 2" },
      explanation: "Backtrack to row 0, try column 2. Place queen at (0,2).",
      code: "board[0] = 2; cols = {2}; // restart"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [0],
      variables: { row: 1, placed: "Q at (1,0)", board: "..Q. / Q... / .... / ...." },
      explanation: "Row 1: Col 0 is safe (no column, diagonal, or anti-diagonal conflict). Place queen at (1,0).",
      code: "board[1] = 0; cols.add(0);"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [3],
      variables: { row: 2, placed: "Q at (2,3)", board: "..Q. / Q... / ...Q / ...." },
      explanation: "Row 2: Col 0 — same col. Col 1 — diag from (0,2). Col 2 — same col. Col 3 is safe! Place queen at (2,3).",
      code: "board[2] = 3; cols.add(3);"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [1],
      variables: { row: 3, placed: "Q at (3,1)", board: "..Q. / Q... / ...Q / .Q..", solution: "FOUND!" },
      explanation: "Row 3: Col 0 — diag from (2,3). Col 1 is SAFE! Place queen at (3,1). All 4 queens placed — first solution found!",
      code: "result.add(boardCopy); // [..Q., Q..., ...Q, .Q..]"
    },
    {
      array: [0, 1, 2, 3],
      highlights: [2, 0, 3, 1],
      variables: { solutions: 2, allSolutions: "[[1,3,0,2], [2,0,3,1]]", time: "O(n!)" },
      explanation: "Continue backtracking for the second solution [.Q.., ...Q, Q..., ..Q.]. Total: 2 solutions for 4-Queens. Pruning reduces O(n^n) to roughly O(n!).",
      code: "return result; // 2 solutions for n=4"
    }
  ]}
/>

---

## 2 · Complexity Reference

| Algorithm / Pattern | Time | Space | Notes |
|---|---|---|---|
| Heap push/pop | O(log n) | O(1) | Per operation |
| Heapify | O(n) | O(1) | Build heap in-place |
| Top-K (heap) | O(n log K) | O(K) | Maintain size-K heap |
| Top-K (quickselect avg) | O(n) avg | O(1) | Worst case O(n²) |
| Two-heap median | O(log n) per add | O(n) | O(1) per query |
| Merge intervals | O(n log n) | O(n) | Sort-dominated |
| Sweep line | O(n log n) | O(n) | Sort events |
| Meeting Rooms II (heap) | O(n log n) | O(n) | Heap of end times |
| Subsets | O(n · 2^n) | O(n) | 2^n subsets, O(n) to copy each |
| Permutations | O(n · n!) | O(n) | n! permutations |
| Combinations C(n,k) | O(k · C(n,k)) | O(k) | Recursion depth = k |
| N-Queens | O(n!) | O(n²) | With pruning, much less in practice |
| Merge K sorted lists | O(N log K) | O(K) | N = total elements, K = lists |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "K largest / smallest / most frequent" | Min-heap of size K, evict when exceeded | Top-K heap |
| "running median of a stream" | Two heaps: max-heap lower half, min-heap upper half | Two-heap median |
| "merge overlapping intervals" | Sort by start, extend or close | Merge intervals |
| "minimum meeting rooms / max overlap" | Sweep line with events, or sort + min-heap of end times | Sweep line / heap |
| "generate all subsets" | Backtracking with include/exclude at each index | Subsets template |
| "generate all permutations" | Backtracking with a used-boolean array | Permutations template |
| "find combinations summing to target" | Backtracking with sorted candidates and early break | Combination Sum template |
| "place N items without conflicts" | Backtracking with constraint checking at each step | N-Queens style |
| "merge K sorted lists/arrays" | Min-heap holding one element per list, poll and advance | Heap merge |
| "insert interval into sorted list" | Binary search or linear scan for position, then merge | Insert interval |

---

## 3 · Worked Example: Merge Intervals (LC 56)

**Why not brute force?** A naive approach would compare every pair of intervals for overlap, merging when found, and repeating until no more merges are possible — O(n^2) per pass with potentially O(n) passes, giving O(n^3). Sorting by start time reduces this to a single O(n) scan after an O(n log n) sort, because once sorted, you only need to compare each interval with the last merged interval.

**Key insight:** After sorting by start time, overlapping intervals are always adjacent in the sorted order. You never need to look more than one interval back. This transforms a global "which intervals overlap?" question into a local "does this interval overlap with the previous one?" check.

**Problem:** Given a list of intervals, merge all overlapping intervals.

**Input:** `intervals = [[1,3],[2,6],[8,10],[15,18]]`

### Step 1 — Sort by start time

Already sorted: `[[1,3],[2,6],[8,10],[15,18]]`

### Step 2 — Initialise merged list

`merged = [[1,3]]` (start with the first interval)

### Step 3 — Process each remaining interval

**Interval `[2,6]`:**
- Current last merged: `[1,3]`
- `2 <= 3` → overlaps! Extend end: `max(3,6) = 6`
- `merged = [[1,6]]`

**Interval `[8,10]`:**
- Current last merged: `[1,6]`
- `8 <= 6`? No → no overlap. Append new interval.
- `merged = [[1,6],[8,10]]`

**Interval `[15,18]`:**
- Current last merged: `[8,10]`
- `15 <= 10`? No → no overlap. Append new interval.
- `merged = [[1,6],[8,10],[15,18]]`

### Step 4 — Return result

`[[1,6],[8,10],[15,18]]`

**Visualised:**

```
Input:     [1---3]
              [2------6]
                          [8--10]
                                      [15--18]

Merged:    [1---------6]  [8--10]     [15--18]
```

**Edge cases to consider:**
- Single interval → return as-is.
- All intervals overlap → merge into one.
- Intervals touching at boundary: `[1,2],[2,3]` → depends on problem definition (LC 56 treats this as overlapping → `[1,3]`).
- Unsorted input → the sort step handles it.

<AlgoViz
  title="Merge Intervals: [[1,3],[2,6],[8,10],[15,18]]"
  description="Sort by start time, then scan left-to-right. If the current interval overlaps with the last merged one, extend its end. Otherwise append a new interval."
  steps={[
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [], variables: { step: "Input", intervals: "[[1,3],[2,6],[8,10],[15,18]]" }, explanation: "Input intervals. First step: sort by start time.", code: "Arrays.sort(intervals, (a, b) -> a[0] - b[0]);" },
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [0,1], variables: { merged: "[[1,3]]", step: "Init" }, explanation: "After sorting (already sorted here). Initialise merged list with the first interval [1,3].", code: "merged.add(intervals[0]); // [1,3]" },
    { array: [1,3, 2,6, 8,10, 15,18], highlights: [2,3], variables: { current: "[2,6]", lastMerged: "[1,3]", "2 <= 3": "true (overlap)" }, explanation: "Process [2,6]: start 2 <= last end 3 → overlaps! Extend end to max(3,6) = 6.", code: "last[1] = Math.max(last[1], intervals[i][1]); // [1,6]" },
    { array: [1,6, 8,10, 15,18], highlights: [0,1], variables: { merged: "[[1,6]]", step: "After merge" }, explanation: "Merged result so far: [[1,6]]. The two overlapping intervals became one.", code: "// merged = [[1,6]]" },
    { array: [1,6, 8,10, 15,18], highlights: [2,3], variables: { current: "[8,10]", lastMerged: "[1,6]", "8 <= 6": "false (no overlap)" }, explanation: "Process [8,10]: start 8 > last end 6 → no overlap. Append as new interval.", code: "merged.add(intervals[i]); // append [8,10]" },
    { array: [1,6, 8,10, 15,18], highlights: [4,5], variables: { current: "[15,18]", lastMerged: "[8,10]", "15 <= 10": "false (no overlap)" }, explanation: "Process [15,18]: start 15 > last end 10 → no overlap. Append as new interval.", code: "merged.add(intervals[i]); // append [15,18]" },
    { array: [1,6, 8,10, 15,18], highlights: [0,1,2,3,4,5], variables: { result: "[[1,6],[8,10],[15,18]]", mergeCount: "1 merge performed" }, explanation: "Done! Result: [[1,6],[8,10],[15,18]]. Four intervals reduced to three.", code: "return merged.toArray(new int[0][]);" }
  ]}
/>

---

## 4 · Problem Sets

### Day 1–2: Heap & Interval Foundations + Backtracking Intro

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 1 | Kth Largest Element in a Stream | Easy | Min-heap | [703](https://leetcode.com/problems/kth-largest-element-in-a-stream/) |
| 2 | Last Stone Weight | Easy | Max-heap | [1046](https://leetcode.com/problems/last-stone-weight/) |
| 3 | Merge Intervals ⭐ | Medium | Sort + merge | [56](https://leetcode.com/problems/merge-intervals/) |
| 4 | Subsets ⭐ | Medium | Backtracking | [78](https://leetcode.com/problems/subsets/) |
| 5 | Combination Sum ⭐ | Medium | Backtracking | [39](https://leetcode.com/problems/combination-sum/) |
| 6 | Top K Frequent Elements ⭐ | Medium | Heap | [347](https://leetcode.com/problems/top-k-frequent-elements/) |
| 7 | Insert Interval ⭐ | Medium | Interval merge | [57](https://leetcode.com/problems/insert-interval/) |

### Day 3–4: Deeper Backtracking & Interval Patterns

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 8 | Permutations ⭐ | Medium | Backtracking | [46](https://leetcode.com/problems/permutations/) |
| 9 | Letter Combinations of a Phone Number | Medium | Backtracking | [17](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) |
| 10 | Non-overlapping Intervals ⭐ | Medium | Greedy intervals | [435](https://leetcode.com/problems/non-overlapping-intervals/) |
| 11 | Meeting Rooms II ⭐ | Medium | Heap + intervals | [253](https://leetcode.com/problems/meeting-rooms-ii/) |
| 12 | Task Scheduler ⭐ | Medium | Greedy + heap | [621](https://leetcode.com/problems/task-scheduler/) |
| 13 | Kth Largest Element in an Array ⭐ | Medium | Quickselect / Heap | [215](https://leetcode.com/problems/kth-largest-element-in-an-array/) |
| 14 | Combinations | Medium | Backtracking | [77](https://leetcode.com/problems/combinations/) |

### Day 5–7: Hard Problems — N-Queens, Two Heaps & Sweep Line

| # | Problem | Diff | Pattern | LC |
|---|---|---|---|---|
| 15 | Word Search ⭐ | Medium | Backtracking grid | [79](https://leetcode.com/problems/word-search/) |
| 16 | N-Queens ⭐ | Hard | Backtracking | [51](https://leetcode.com/problems/n-queens/) |
| 17 | Subsets II | Medium | Backtracking dedup | [90](https://leetcode.com/problems/subsets-ii/) |
| 18 | Palindrome Partitioning | Medium | Backtracking | [131](https://leetcode.com/problems/palindrome-partitioning/) |
| 19 | Find Median from Data Stream ⭐ | Hard | Two heaps | [295](https://leetcode.com/problems/find-median-from-data-stream/) |
| 20 | Merge K Sorted Lists ⭐ | Hard | Heap | [23](https://leetcode.com/problems/merge-k-sorted-lists/) |
| 21 | Minimum Interval to Include Each Query | Hard | Sweep line + heap | [1851](https://leetcode.com/problems/minimum-interval-to-include-each-query/) |

---

## 5 · Mock Interviews

### Mock 1 — Heap + Intervals (35 min)

**Interviewer:** "You're building a calendar app. Given a list of meeting time intervals as pairs of start and end times, find the minimum number of conference rooms required."

**Candidate talk-track:**

1. "This is about finding the maximum number of overlapping intervals at any point in time."
2. "I'll sort the intervals by start time, then use a min-heap (PriorityQueue) to track the earliest ending meeting. For each new meeting, if it starts after or when the earliest meeting ends, I reuse that room (poll from heap). Either way, I offer the new meeting's end time."
3. "The heap's size at any point represents the number of rooms in use. The answer is the maximum heap size."

```java
import java.util.*;

public int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    PriorityQueue<Integer> heap = new PriorityQueue<>();

    for (int[] iv : intervals) {
        if (!heap.isEmpty() && heap.peek() <= iv[0]) {
            heap.poll();
        }
        heap.offer(iv[1]);
    }

    return heap.size();
}
```

4. Walk through example: `[[0,30],[5,10],[15,20]]`
   - Sort: already sorted.
   - Process `[0,30]`: heap = `[30]`, rooms = 1.
   - Process `[5,10]`: `30 > 5` → no reuse. heap = `[10,30]`, rooms = 2.
   - Process `[15,20]`: `10 <= 15` → reuse. Poll 10, offer 20. heap = `[20,30]`, rooms = 2.
   - Answer: 2.

**Follow-ups:**

- **"What if you also need to report WHICH meetings go in which room?"**
  "I'd track room assignments by storing `int[]{endTime, roomId}` in the heap with a comparator on end time. When I reuse a room, I know which room freed up. When I allocate a new room, I assign the next available ID."

- **"What if meetings can be rescheduled — you get updates deleting/adding meetings in real time?"**
  "I'd switch to a sweep-line approach with a balanced BST or sorted event list that supports efficient insertion and deletion. A TreeMap in Java would give O(log n) updates."

- **"How would you find the longest time period where all rooms are occupied?"**
  "I'd generate start/end events, sweep through them, and track when the room count equals the max. I'd record the time range where it stays at the maximum and return the longest such range."

- **"What about minimising gaps — packing meetings as tightly as possible?"**
  "That's a bin-packing variant. I'd sort meetings by duration descending and greedily assign each to the room with the smallest remaining gap, using a PriorityQueue keyed on room free-time."

### Mock 2 — Backtracking (35 min)

**Interviewer:** "Given a collection of candidate numbers and a target, find all unique combinations where the candidates sum to the target. Each number may be used unlimited times."

**Candidate talk-track:**

1. "Unlimited reuse, find all combinations → backtracking with the ability to reuse the same index."
2. "I'll sort the candidates first so I can prune early — if the current candidate exceeds the remaining target, I break."
3. "To avoid duplicate combinations, I'll only consider candidates from index `start` onward (not from 0)."

```java
public List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(candidates);
    backtrack(candidates, 0, new ArrayList<>(), target, result);
    return result;
}

private void backtrack(int[] candidates, int start, List<Integer> path,
                       int remaining, List<List<Integer>> result) {
    if (remaining == 0) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break;
        path.add(candidates[i]);
        backtrack(candidates, i, path, remaining - candidates[i], result);
        path.remove(path.size() - 1);
    }
}
```

4. Walk through: `candidates = [2,3,6,7], target = 7`
   - Start with 2 → 2,2 → 2,2,2 → 2,2,2,2 exceeds? No (sum=8 &gt; 7 at remaining=-1) — actually remaining = 7-2-2-2 = 1, and 2 &gt; 1 so break. Back up.
   - 2,2,3 → remaining = 0 → add `[2,2,3]`.
   - 2,3 → remaining = 2, try 3 → 3 &gt; 2 break. Back up.
   - 3,3 → remaining = 1, 3 &gt; 1 break. Back up.
   - 6 → remaining = 1, 6 &gt; 1 break. Back up.
   - 7 → remaining = 0 → add `[7]`.
   - Result: `[[2,2,3],[7]]`.

**Follow-ups:**

- **"What if each candidate can only be used once?"**
  "Change `backtrack(candidates, i, ...)` to `backtrack(candidates, i + 1, ...)` so we move past the current index. This is Combination Sum II (LC 40). If there are duplicates in the input, I also add a skip: `if (i > start && candidates[i] == candidates[i-1]) continue`."

- **"What if negative numbers are allowed in the candidates?"**
  "Unlimited reuse with negative numbers means infinite combinations are possible (you could keep adding and subtracting). I'd need an additional constraint — like a maximum combination length — and I'd lose the ability to prune via sorting."

- **"Can you solve this iteratively instead of recursively?"**
  "Yes, I'd use an explicit ArrayDeque (stack) simulating the recursion. Each stack frame stores `(start, path, remaining)`. The logic is identical, but it avoids stack overflow for very deep trees."

- **"What's the time complexity?"**
  "In the worst case, the number of valid combinations can be exponential. If the smallest candidate is 1 and target is T, the deepest branch has depth T, and at each level there are up to n choices. The upper bound is O(n^(T/min_candidate)). In practice, pruning makes it much faster."

---

## 6 · Tips and Edge Cases

**Heap pitfalls:**
- Java's `PriorityQueue` is min-heap by default. For max-heap, pass `Collections.reverseOrder()` to the constructor.
- When pushing tuples, use `int[]` arrays or custom objects with a `Comparator`. If comparing objects, ensure your comparator handles all tiebreaking to avoid inconsistent ordering.
- `PriorityQueue` does not support efficient arbitrary removal — `remove(Object)` is O(n). For problems requiring deletion by value, consider a `TreeMap` or lazy deletion.

**Interval pitfalls:**
- Always clarify whether intervals are open or closed. LC 56 treats `[1,2],[2,3]` as overlapping; other problems may not.
- For "minimum removals to make non-overlapping" (LC 435), sort by **end time** and greedily keep the interval that ends earliest — this is the classic activity selection problem.
- Off-by-one: when checking overlap, `startB <= endA` means overlap (closed intervals). If intervals are half-open `[start, end)`, use `startB < endA`.

**Backtracking pitfalls:**
- Always **copy** the path before adding to results: `result.add(new ArrayList<>(path))`. Adding `path` directly stores a reference that will be mutated.
- For grid-based backtracking (Word Search), mark cells as visited *before* recursing and restore them *after*. A common trick: temporarily set `board[r][c] = '#'` to mark visited, then restore the original character.
- Duplicate handling in Subsets II / Combination Sum II: sort first, then `if (i > start && nums[i] == nums[i-1]) continue`. The `i > start` condition is critical — without it, you'll skip valid first uses.

**N-Queens tip:**
- Track occupied columns, diagonals (`row - col`), and anti-diagonals (`row + col`) in HashSets for O(1) conflict checking instead of scanning the board.

**Task Scheduler insight:**
- The answer is `Math.max(totalTasks, (maxFreq - 1) * (n + 1) + countOfMaxFreqTasks)`. You don't need to simulate — the formula comes from arranging the most frequent task with n gaps and filling in the rest.

**Merge K Sorted Lists:**
- Push the head of each list into a PriorityQueue. Poll the smallest, append to result, and offer that node's next (if it exists). To avoid comparison issues with ListNode, push `int[]{val, index}` and use the index to retrieve the node.

**General backtracking strategy:**
- Draw the recursion tree for small inputs before coding. This reveals the branching factor, depth, and where to prune.
- If the problem asks "how many" rather than "enumerate all," consider whether dynamic programming or math (counting) would be more efficient than generating every solution.

---

## 7 · What's Next

You've completed the **12-week DSA Foundations** roadmap. You now have solid coverage of arrays, strings, linked lists, stacks, queues, trees, graphs, dynamic programming, heaps, intervals, and backtracking.

**To keep levelling up**, move to the **Intensive track**:

- **Weeks 13–16:** Advanced DP (bitmask DP, digit DP, interval DP, DP on trees).
- **Weeks 17–20:** System-design-flavoured algorithm problems, advanced data structures (segment trees, tries, Fenwick trees).
- **Weeks 21–24:** Contest-style training, timed mock interviews, and weak-area deep dives.

The patterns you've learned in these 12 weeks form the foundation that everything else builds on. Keep practising, keep timing yourself, and keep pushing into problems that feel just out of reach.
