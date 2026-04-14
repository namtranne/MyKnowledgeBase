---
sidebar_position: 20
title: "Week 19: Sweep Line + Geometry + Advanced Graph"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 19: Sweep Line + Geometry + Advanced Graph

## Overview

This week covers three advanced topics that appear in hard interview and competition problems. **Sweep line** algorithms transform 2D/interval problems into efficient 1D scans. **Computational geometry** gives you tools for spatial reasoning — cross products, convex hulls, intersection tests. **Advanced graph algorithms** — bridges, SCCs, max flow — solve connectivity and matching problems that basic BFS/DFS cannot.

<AlgoViz
  title="Sweep Line — Meeting Room Event Processing"
  description="Watch events sorted by time, tracking overlapping meetings to find peak room usage."
  steps={[
    { label: "Events", description: "Meetings: [0,30), [5,10), [15,20). Generate events: (0,+1), (5,+1), (10,-1), (15,+1), (20,-1), (30,-1)", active: 0, maxActive: 0 },
    { label: "t = 0", description: "Meeting starts. Active rooms: 1", active: 1, maxActive: 1 },
    { label: "t = 5", description: "Meeting starts. Active rooms: 2 — new peak!", active: 2, maxActive: 2 },
    { label: "t = 10", description: "Meeting ends. Active rooms: 1", active: 1, maxActive: 2 },
    { label: "t = 15", description: "Meeting starts. Active rooms: 2", active: 2, maxActive: 2 },
    { label: "t = 20", description: "Meeting ends. Active rooms: 1", active: 1, maxActive: 2 },
    { label: "t = 30", description: "Last meeting ends. Active rooms: 0. Answer: 2 rooms needed", active: 0, maxActive: 2 }
  ]}
/>

---

## Part A — Sweep Line

### Core Concept

**Why this technique exists.** Many geometric and interval problems are inherently two-dimensional: overlapping rectangles, intersecting line segments, concurrent meetings. Checking all pairs costs O(n squared). The sweep line technique reduces the problem to one dimension by processing events in sorted order along one axis, while maintaining a dynamic data structure (heap, BST, segment tree) for the other axis. This typically reduces O(n squared) to O(n log n).

**The intuition.** Imagine sliding a vertical line slowly from left to right across a 2D plane. As the line sweeps, intervals and shapes "enter" and "leave" the active set. At each event (an interval starting or ending), you update the active set and extract the information you need (how many intervals overlap, what is the maximum height, etc.). The key insight is that between events, nothing changes -- so you only need to do work at the O(n) event points, not at every possible coordinate.

**Interview signals.** Look for: (1) "how many intervals overlap at the peak" (meeting rooms), (2) "merge overlapping intervals," (3) "skyline silhouette," (4) "total area covered by rectangles," (5) "flowers blooming at query times." The constraint n up to 10^5 with a need better than O(n squared) is a strong sweep line signal.

A sweep line algorithm processes events in sorted order (typically left-to-right or bottom-to-top), maintaining an **active set** of elements currently intersecting the sweep line. This reduces a 2D problem to a dynamic 1D problem.

**General framework:**
1. Convert input into **events** (start, end, point)
2. **Sort** events by coordinate (with tie-breaking rules)
3. **Sweep** through events, maintaining an active data structure (heap, BST, segment tree)
4. At each event, update the active set and extract the answer

### Event Types

| Event | Meaning | Action |
|-------|---------|--------|
| Start (left edge) | An interval/rectangle begins | Insert into active set |
| End (right edge) | An interval/rectangle ends | Remove from active set |
| Point query | Query at a specific coordinate | Query the active set |

### Meeting Rooms II (Minimum Meeting Rooms)

Given intervals [start, end), find the minimum number of rooms needed so no two overlapping meetings share a room. This is equivalent to finding the maximum number of overlapping intervals at any point.

**When to use this template.** Use the min-heap approach when you need to track active intervals and want the count of concurrent items at the peak. The event-based alternative (below) is more versatile -- it generalizes to weighted events and works when you need the full timeline profile, not just the maximum.

```java
import java.util.*;

public int minMeetingRooms(int[][] intervals) {
    if (intervals.length == 0) return 0;
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);

    PriorityQueue<Integer> heap = new PriorityQueue<>(); // end times
    for (int[] iv : intervals) {
        if (!heap.isEmpty() && heap.peek() <= iv[0])
            heap.poll(); // reuse the room
        heap.offer(iv[1]);
    }
    return heap.size();
}
```

**Alternative event-based approach:**

```java
public int minMeetingRoomsEvents(int[][] intervals) {
    List<int[]> events = new ArrayList<>();
    for (int[] iv : intervals) {
        events.add(new int[]{iv[0], 1});   // meeting starts
        events.add(new int[]{iv[1], -1});  // meeting ends
    }
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    int active = 0, maxActive = 0;
    for (int[] e : events) {
        active += e[1];
        maxActive = Math.max(maxActive, active);
    }
    return maxActive;
}
```

<AlgoViz
  title="Meeting Rooms Events \u2014 Finding Peak Overlap"
  description="Track concurrent meetings using +1/-1 events sorted by time. The peak active count is the minimum rooms needed."
  steps={[
    {
      array: [0, 5, 15],
      array2: [30, 10, 20],
      labels: { 0: "meeting A", 1: "meeting B", 2: "meeting C" },
      labels2: { 0: "end", 1: "end", 2: "end" },
      highlights: [0, 1, 2],
      variables: { meetings: "[[0,30],[5,10],[15,20]]", step: "generate events" },
      explanation: "Three meetings: A=[0,30), B=[5,10), C=[15,20). Generate +1 events at starts and -1 events at ends.",
      code: "events.add({iv[0], 1}); events.add({iv[1], -1});"
    },
    {
      array: [0, 5, 10, 15, 20, 30],
      array2: [1, 1, -1, 1, -1, -1],
      labels: { 0: "t=0", 1: "t=5", 2: "t=10", 3: "t=15", 4: "t=20", 5: "t=30" },
      highlights: [0, 1, 2, 3, 4, 5],
      variables: { "sorted events": "6 events", "tie-break": "ends before starts at same time" },
      explanation: "6 events sorted by time: (0,+1), (5,+1), (10,-1), (15,+1), (20,-1), (30,-1). At equal times, -1 (end) comes before +1 (start).",
      code: "events.sort((a, b) -> a[0] != b[0] ? a[0]-b[0] : a[1]-b[1]);"
    },
    {
      array: [0, 5, 10, 15, 20, 30],
      array2: [1, 1, -1, 1, -1, -1],
      highlights: [0],
      variables: { "t=0": "+1", active: 1, maxActive: 1, "meeting A": "starts" },
      explanation: "t=0: meeting A starts (+1). Active = 1, maxActive = 1.",
      code: "active += 1; // active=1; maxActive = max(1,1) = 1"
    },
    {
      array: [0, 5, 10, 15, 20, 30],
      array2: [1, 1, -1, 1, -1, -1],
      highlights: [0, 1],
      variables: { "t=5": "+1", active: 2, maxActive: 2, "meeting B": "starts \u2192 peak!" },
      explanation: "t=5: meeting B starts (+1). Active = 2, maxActive = 2. Two rooms needed simultaneously!",
      code: "active += 1; // active=2; maxActive = max(1,2) = 2"
    },
    {
      array: [0, 5, 10, 15, 20, 30],
      array2: [1, 1, -1, 1, -1, -1],
      highlights: [2],
      variables: { "t=10": "-1", active: 1, maxActive: 2, "meeting B": "ends" },
      explanation: "t=10: meeting B ends (-1). Active = 1. Peak remains 2.",
      code: "active += -1; // active=1"
    },
    {
      array: [0, 5, 10, 15, 20, 30],
      array2: [1, 1, -1, 1, -1, -1],
      highlights: [3, 4, 5],
      variables: { "t=15 to 30": "C starts, C ends, A ends", active: 0, maxActive: 2 },
      explanation: "t=15: C starts (active=2). t=20: C ends (active=1). t=30: A ends (active=0). Peak stays at 2.",
      code: "// active reaches 2 again at t=15, never exceeds it"
    },
    {
      array: [2],
      highlights: [0],
      labels: { 0: "answer" },
      variables: { "minimum rooms": 2, complexity: "O(n log n)", "bottleneck": "sorting events" },
      explanation: "Answer: 2 rooms needed. The event sweep runs in O(n log n) for sorting + O(n) for scanning. This generalizes to weighted events for difference arrays.",
      code: "return maxActive; // 2"
    }
  ]}
/>

### Interval Merging

**When to use this template.** Use interval merging whenever a problem asks you to consolidate overlapping ranges into non-overlapping segments. This is a prerequisite step for many sweep line problems and appears in scheduling, calendar operations, and range coverage queries. Sort by start time first, then greedily extend or create new intervals.

```java
public int[][] mergeIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> merged = new ArrayList<>();
    merged.add(intervals[0]);
    for (int i = 1; i < intervals.length; i++) {
        int[] last = merged.get(merged.size() - 1);
        if (intervals[i][0] <= last[1])
            last[1] = Math.max(last[1], intervals[i][1]);
        else
            merged.add(intervals[i]);
    }
    return merged.toArray(new int[0][]);
}
```

<AlgoViz
  title="Interval Merging — Sweep and Merge Overlapping Ranges"
  description="Sort intervals by start time, then greedily merge overlapping ones in a single left-to-right pass."
  steps={[
    {
      array: [1, 2, 8, 15],
      array2: [3, 6, 10, 18],
      labels: { 0: "start", 1: "start", 2: "start", 3: "start" },
      labels2: { 0: "end", 1: "end", 2: "end", 3: "end" },
      highlights: [],
      variables: { intervals: "[[1,3],[2,6],[8,10],[15,18]]", sorted: "by start" },
      explanation: "Input: 4 intervals already sorted by start time. Top row = start values, bottom row = end values. Sweep left to right.",
      code: "Arrays.sort(intervals, (a, b) -> a[0] - b[0]);"
    },
    {
      array: [1, 2, 8, 15],
      array2: [3, 6, 10, 18],
      highlights: [0],
      variables: { current: "[1, 3]", merged: "[[1, 3]]" },
      explanation: "Process [1,3]: first interval, add directly to merged result. Current merged interval: [1, 3].",
      code: "merged.add(intervals[0]); // [[1, 3]]"
    },
    {
      array: [1, 2, 8, 15],
      array2: [3, 6, 10, 18],
      highlights: [0, 1],
      secondary: [1],
      pointers: { 1: "2 \u2264 3" },
      variables: { "overlap?": "2 \u2264 3 = YES", "extend": "max(3,6) = 6", merged: "[[1, 6]]" },
      explanation: "Process [2,6]: start 2 \u2264 last end 3, so intervals overlap! Extend the end to max(3, 6) = 6. Merged: [[1, 6]].",
      code: "last[1] = Math.max(last[1], intervals[i][1]); // [1,6]"
    },
    {
      array: [1, 2, 8, 15],
      array2: [6, 6, 10, 18],
      highlights: [2],
      secondary: [0, 1],
      pointers: { 2: "8 > 6" },
      variables: { "overlap?": "8 > 6 = NO", merged: "[[1,6], [8,10]]" },
      explanation: "Process [8,10]: start 8 > last end 6, no overlap. Start a new merged interval. Merged: [[1,6], [8,10]].",
      code: "merged.add(intervals[i]); // add [8, 10]"
    },
    {
      array: [1, 2, 8, 15],
      array2: [6, 6, 10, 18],
      highlights: [3],
      secondary: [0, 1, 2],
      pointers: { 3: "15 > 10" },
      variables: { "overlap?": "15 > 10 = NO", merged: "[[1,6],[8,10],[15,18]]" },
      explanation: "Process [15,18]: start 15 > last end 10, no overlap. Add as new interval. Merged: [[1,6], [8,10], [15,18]].",
      code: "merged.add(intervals[i]); // add [15, 18]"
    },
    {
      array: [1, 8, 15],
      array2: [6, 10, 18],
      highlights: [0, 1, 2],
      labels: { 0: "[1,6]", 1: "[8,10]", 2: "[15,18]" },
      variables: { input: "4 intervals", output: "3 intervals", "reduced by": 1 },
      explanation: "Done! 4 intervals merged into 3 non-overlapping intervals: [1,6], [8,10], [15,18]. Time: O(n log n) for sort + O(n) for merge.",
      code: "return merged.toArray(new int[0][]); // 3 intervals"
    }
  ]}
/>

### Skyline Problem Approach

**When to use this template.** Use this sweep-line-with-heap pattern whenever you need to track the "dominant" value (tallest, largest, highest-priority) across overlapping intervals. The Skyline Problem is the canonical example, but the same pattern applies to any problem where intervals have associated values and you need the maximum active value at each point in time.

The Skyline Problem asks: given a list of buildings [left, right, height], output the critical points that form the skyline silhouette.

**Strategy:**
1. Create events: for each building, a **start event** (left, -height, right) and an **end event** (right, 0, 0)
2. Sort events by x-coordinate. Tie-breaking: starts before ends at the same x; taller starts first
3. Maintain a max-heap of active building heights
4. At each event, if the current max height changes, record a skyline point

```java
public List<List<Integer>> getSkyline(int[][] buildings) {
    List<int[]> events = new ArrayList<>();
    for (int[] b : buildings) {
        events.add(new int[]{b[0], -b[2], b[1]}); // start: neg height
        events.add(new int[]{b[1], 0, 0});          // end event
    }
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    List<List<Integer>> result = new ArrayList<>();
    // Max-heap of {-height, end_x}. Sentinel for ground level.
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
        a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
    heap.offer(new int[]{0, Integer.MAX_VALUE});
    int prevMax = 0;

    for (int[] ev : events) {
        if (ev[1] != 0)
            heap.offer(new int[]{ev[1], ev[2]});
        while (heap.peek()[1] <= ev[0])
            heap.poll();
        int curMax = -heap.peek()[0];
        if (curMax != prevMax) {
            result.add(List.of(ev[0], curMax));
            prevMax = curMax;
        }
    }
    return result;
}
```

---

## Part B — Computational Geometry

### Cross Product

**Why this technique exists.** The cross product is the single most important primitive in 2D computational geometry. It tells you the orientation of three points (clockwise, counter-clockwise, or collinear) using only integer arithmetic -- no division, no floating point, no trigonometry. Nearly every geometry algorithm (convex hull, segment intersection, point-in-polygon) is built on top of cross product queries.

The cross product of vectors OA and OB (where O is the origin, A = (ax, ay), B = (bx, by)) is:

$$\text{cross}(O, A, B) = (A_x - O_x)(B_y - O_y) - (A_y - O_y)(B_x - O_x)$$

| Value | Meaning |
|-------|---------|
| > 0 | Counter-clockwise turn (B is to the left of OA) |
| = 0 | Collinear |
| < 0 | Clockwise turn (B is to the right of OA) |

```java
static long cross(int[] O, int[] A, int[] B) {
    return (long)(A[0] - O[0]) * (B[1] - O[1])
         - (long)(A[1] - O[1]) * (B[0] - O[0]);
}
```

### Convex Hull — Andrew's Monotone Chain

**When to use this template.** Use convex hull when you need to find the outermost boundary enclosing a set of points. Common applications include "fence around trees" (LC 587), finding the maximum area/perimeter, and eliminating interior points that cannot contribute to an optimal solution. Andrew's monotone chain is preferred over Graham scan for its simplicity and straightforward handling of collinear points.

Computes the convex hull of a set of 2D points in **O(n log n)** time.

```java
static List<int[]> convexHull(int[][] points) {
    Arrays.sort(points, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
    int n = points.length;
    if (n <= 1) return Arrays.asList(points);

    // Build lower hull
    List<int[]> lower = new ArrayList<>();
    for (int[] p : points) {
        while (lower.size() >= 2 &&
               cross(lower.get(lower.size()-2), lower.get(lower.size()-1), p) <= 0)
            lower.remove(lower.size() - 1);
        lower.add(p);
    }

    // Build upper hull
    List<int[]> upper = new ArrayList<>();
    for (int i = n - 1; i >= 0; i--) {
        int[] p = points[i];
        while (upper.size() >= 2 &&
               cross(upper.get(upper.size()-2), upper.get(upper.size()-1), p) <= 0)
            upper.remove(upper.size() - 1);
        upper.add(p);
    }

    // Remove last point of each half (repeated)
    lower.remove(lower.size() - 1);
    upper.remove(upper.size() - 1);
    lower.addAll(upper);
    return lower;
}
```

<AlgoViz
  title="Convex Hull — Andrew's Monotone Chain on 5 Points"
  description="Build lower and upper hulls using cross product orientation tests. Points: (0,0), (1,3), (2,1), (3,4), (4,0)."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      labels: { 0: "A", 1: "B", 2: "C", 3: "D", 4: "E" },
      highlights: [0, 1, 2, 3, 4],
      variables: { phase: "sort", "sorted by": "x, then y" },
      explanation: "5 points sorted by x-coordinate: A(0,0), B(1,3), C(2,1), D(3,4), E(4,0). Top row = x, bottom row = y.",
      code: "Arrays.sort(points, (a,b) -> a[0]!=b[0] ? a[0]-b[0] : a[1]-b[1]);"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [0, 1],
      variables: { phase: "lower hull", lower: "A, B", size: 2 },
      explanation: "Lower hull: add A(0,0) and B(1,3). With fewer than 3 points, no cross product check needed yet.",
      code: "lower.add(p); // add A, then B"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [0, 2],
      secondary: [1],
      pointers: { 1: "removed" },
      variables: { "cross(A,B,C)": "(1)(1)-(3)(2)=-5 \u2264 0", action: "remove B", lower: "A, C" },
      explanation: "Add C(2,1): cross(A,B,C) = -5 \u2264 0 (clockwise turn). Remove B from hull \u2014 it lies above the lower hull line. Lower: [A, C].",
      code: "cross(lower[-2], lower[-1], p) <= 0 \u2192 lower.remove();"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [0, 4],
      secondary: [2],
      pointers: { 2: "removed" },
      variables: { "add D then E": "D kept, then E removes D and C", lower: "A, E" },
      explanation: "Add D(3,4): kept (cross > 0). Add E(4,0): removes D (cross \u2264 0), then removes C (cross \u2264 0). Lower hull: [A(0,0), E(4,0)].",
      code: "// E causes two removals; lower = [(0,0), (4,0)]"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [4, 3, 1, 0],
      pointers: { 4: "start", 0: "end" },
      variables: { phase: "upper hull", direction: "right to left", upper: "E, D, B, A" },
      explanation: "Upper hull (right to left): E(4,0) \u2192 D(3,4) \u2192 skip C(2,1) (removed by cross test) \u2192 B(1,3) \u2192 A(0,0). Upper: [E, D, B, A].",
      code: "for (int i = n-1; i >= 0; i--) { /* same cross check */ }"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [0, 4, 3, 1],
      secondary: [2],
      pointers: { 2: "interior" },
      variables: { hull: "A(0,0)\u2192E(4,0)\u2192D(3,4)\u2192B(1,3)", "hull size": 4, "interior": "C(2,1)" },
      explanation: "Final convex hull: A(0,0) \u2192 E(4,0) \u2192 D(3,4) \u2192 B(1,3). Point C(2,1) is interior. 4 hull vertices, 1 interior point.",
      code: "lower.addAll(upper); return lower; // 4 vertices"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 3, 1, 4, 0],
      highlights: [0, 4, 3, 1],
      variables: { "time": "O(n log n)", "key operation": "cross product", "removes": "clockwise turns" },
      explanation: "O(n log n) total: sorting dominates. The cross product test runs in O(1) per point. Each point is added/removed at most once \u2192 amortized O(n) for hull construction.",
      code: "// O(n log n) sort + O(n) amortized hull build"
    }
  ]}
/>

To include collinear points on the hull boundary, change `<= 0` to `< 0`, but be careful with the last edge — collinear points on it need special handling.

### Line Segment Intersection Test

**When to use this template.** Use this test as a subroutine whenever you need to determine whether two line segments cross. It appears in polygon operations, sweep line algorithms for segment intersection counting, and path-crossing detection. The implementation uses only cross products and avoids floating-point arithmetic entirely.

Two segments (p1, p2) and (p3, p4) intersect if and only if:
1. They straddle each other: the endpoints of each segment are on opposite sides of the other segment's line
2. Or an endpoint lies exactly on the other segment (collinear overlap)

```java
static boolean onSegment(int[] p, int[] q, int[] r) {
    return Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0])
        && Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
}

static boolean segmentsIntersect(int[] p1, int[] p2, int[] p3, int[] p4) {
    long d1 = cross(p3, p4, p1), d2 = cross(p3, p4, p2);
    long d3 = cross(p1, p2, p3), d4 = cross(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)))
        return true;

    if (d1 == 0 && onSegment(p3, p1, p4)) return true;
    if (d2 == 0 && onSegment(p3, p2, p4)) return true;
    if (d3 == 0 && onSegment(p1, p3, p2)) return true;
    if (d4 == 0 && onSegment(p1, p4, p2)) return true;

    return false;
}
```

<AlgoViz
  title="Line Segment Intersection — Cross Product Straddling Test"
  description="Test if segments (1,1)-(4,3) and (1,3)-(4,1) intersect using four cross product orientation checks."
  steps={[
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      labels: { 0: "p1", 1: "p2", 2: "p3", 3: "p4" },
      highlights: [0, 1],
      secondary: [2, 3],
      variables: { "seg1": "(1,1)\u2192(4,3)", "seg2": "(1,3)\u2192(4,1)" },
      explanation: "Two segments: seg1 from p1(1,1) to p2(4,3) (green), seg2 from p3(1,3) to p4(4,1) (purple). Do they intersect?",
      code: "segmentsIntersect(p1, p2, p3, p4)"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [0],
      secondary: [2, 3],
      pointers: { 0: "test p1" },
      variables: { "d1": "cross(p3,p4,p1)", "= (3)(1-3)-(1-3)(0)": -6, sign: "negative" },
      explanation: "d1 = cross(p3, p4, p1): which side of line p3-p4 is p1? Cross product = -6 (negative = clockwise = right side).",
      code: "d1 = cross(p3, p4, p1); // -6"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [1],
      secondary: [2, 3],
      pointers: { 1: "test p2" },
      variables: { "d2": "cross(p3,p4,p2)", "= (3)(0)-(-2)(3)": 6, sign: "positive", "d1*d2": "negative \u2192 straddle!" },
      explanation: "d2 = cross(p3, p4, p2) = 6 (positive = left side). Since d1 and d2 have opposite signs, p1 and p2 STRADDLE segment p3-p4!",
      code: "d2 = cross(p3, p4, p2); // 6; d1<0 && d2>0 \u2192 straddle"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [0, 1],
      secondary: [2],
      pointers: { 2: "test p3" },
      variables: { "d3": "cross(p1,p2,p3)", "= (3)(2)-(2)(0)": 6, sign: "positive" },
      explanation: "d3 = cross(p1, p2, p3) = 6 (p3 is on the left side of line p1-p2). Now check p4.",
      code: "d3 = cross(p1, p2, p3); // 6"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [0, 1],
      secondary: [3],
      pointers: { 3: "test p4" },
      variables: { "d4": "cross(p1,p2,p4)", "= (3)(0)-(2)(3)": -6, sign: "negative", "d3*d4": "negative \u2192 straddle!" },
      explanation: "d4 = cross(p1, p2, p4) = -6 (right side). d3 and d4 have opposite signs \u2192 p3 and p4 STRADDLE segment p1-p2!",
      code: "d4 = cross(p1, p2, p4); // -6; d3>0 && d4<0 \u2192 straddle"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [0, 1, 2, 3],
      variables: { "mutual straddle": "YES", result: "INTERSECT", "d1,d2": "opposite signs", "d3,d4": "opposite signs" },
      explanation: "Both pairs straddle each other \u2192 segments INTERSECT! No floating-point arithmetic needed \u2014 only integer cross products.",
      code: "return true; // mutual straddle confirmed"
    },
    {
      array: [1, 4, 1, 4],
      array2: [1, 3, 3, 1],
      highlights: [0, 1, 2, 3],
      variables: { "collinear case": "use onSegment()", "no intersect": "same-side = no straddle", complexity: "O(1)" },
      explanation: "Edge case: if any cross product is 0, the endpoint is collinear \u2014 use the onSegment() bounding-box check. The entire test runs in O(1) time.",
      code: "if (d1 == 0 && onSegment(p3, p1, p4)) return true;"
    }
  ]}
/>

### Point in Polygon (Ray Casting)

**When to use this template.** Use ray casting when you need to test whether a query point lies inside a general (possibly non-convex) polygon. For convex polygons, binary search on the angle gives O(log n), but ray casting works for any simple polygon in O(n) per query and is much simpler to implement correctly.

Cast a ray from the point to the right; count how many polygon edges it crosses. Odd count means inside.

```java
static boolean pointInPolygon(int[] point, int[][] polygon) {
    int x = point[0], y = point[1];
    int n = polygon.length;
    boolean inside = false;

    for (int i = 0, j = n - 1; i < n; j = i++) {
        int xi = polygon[i][0], yi = polygon[i][1];
        int xj = polygon[j][0], yj = polygon[j][1];
        if ((yi > y) != (yj > y) &&
            x < (long)(xj - xi) * (y - yi) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
}
```

<AlgoViz
  title="Point in Polygon \u2014 Ray Casting on a Square"
  description="Cast a rightward ray from a query point and count edge crossings. Odd crossings = inside, even = outside."
  steps={[
    {
      array: [0, 4, 4, 0],
      array2: [0, 0, 4, 4],
      labels: { 0: "v0", 1: "v1", 2: "v2", 3: "v3" },
      highlights: [0, 1, 2, 3],
      variables: { polygon: "square (0,0)-(4,0)-(4,4)-(0,4)", query: "(2, 2)" },
      explanation: "Polygon: a square with vertices (0,0), (4,0), (4,4), (0,4). Query point: (2,2). Is it inside? Cast a ray rightward from (2,2).",
      code: "pointInPolygon(new int[]{2,2}, polygon)"
    },
    {
      array: [0, 4, 4, 0],
      array2: [0, 0, 4, 4],
      highlights: [0, 1],
      variables: { edge: "v0(0,0)\u2192v1(4,0)", "y range": "[0,0]", "crosses ray?": "no (ray at y=2)" },
      explanation: "Edge v0-v1: from (0,0) to (4,0). The ray at y=2 does not cross this edge because the edge is entirely at y=0. inside = false.",
      code: "// (yi > y) != (yj > y) \u2192 (0>2) != (0>2) \u2192 false"
    },
    {
      array: [0, 4, 4, 0],
      array2: [0, 0, 4, 4],
      highlights: [1, 2],
      variables: { edge: "v1(4,0)\u2192v2(4,4)", "y range": "[0,4]", "crosses?": "yes at x=4 > 2" },
      explanation: "Edge v1-v2: from (4,0) to (4,4). The ray at y=2 crosses this edge at x=4. Since 2 < 4, the crossing is to the right. Toggle: inside = true.",
      code: "// (0>2)!=(4>2) \u2192 true; x < (4-4)*(2-0)/(4-0)+4 = 4 \u2192 2<4 \u2713"
    },
    {
      array: [0, 4, 4, 0],
      array2: [0, 0, 4, 4],
      highlights: [2, 3],
      variables: { edge: "v2(4,4)\u2192v3(0,4)", "y range": "[4,4]", "crosses?": "no (edge at y=4)" },
      explanation: "Edge v2-v3: from (4,4) to (0,4). Both endpoints at y=4, not straddling y=2. No crossing. inside remains true.",
      code: "// (4>2) != (4>2) \u2192 false, skip"
    },
    {
      array: [0, 4, 4, 0],
      array2: [0, 0, 4, 4],
      highlights: [3, 0],
      secondary: [1, 2],
      variables: { edge: "v3(0,4)\u2192v0(0,0)", "y range": "[0,4]", "crosses?": "yes at x=0 < 2" },
      explanation: "Edge v3-v0: from (0,4) to (0,0). Straddles y=2 at x=0. But 2 is NOT less than 0, so this crossing is to the left of the query point. No toggle.",
      code: "// (4>2)!=(0>2) \u2192 true; x < 0 \u2192 2<0 is false, skip"
    },
    {
      array: [2],
      array2: [2],
      labels: { 0: "query" },
      highlights: [0],
      variables: { crossings: 1, "odd?": "yes \u2192 INSIDE", result: true },
      explanation: "Total rightward crossings: 1 (odd). The point (2,2) is INSIDE the square. For points outside (e.g., (5,2)), we would get 0 crossings (even).",
      code: "return inside; // true (1 crossing = odd)"
    }
  ]}
/>

### Closest Pair of Points

Find the two closest points in a set of n points. The divide-and-conquer approach runs in **O(n log n)**:

1. Sort points by x-coordinate
2. Recursively find the closest pair in the left and right halves
3. Let δ = min distance found so far. Check points within a strip of width 2δ around the dividing line
4. Within the strip, for each point, only compare to at most 7 points ahead (sorted by y)

The strip check is O(n) per level, giving O(n log n) total.

---

## Part C — Advanced Graph

### Bridges and Articulation Points (Tarjan's Algorithm)

**Why this technique exists.** In network design, knowing which connections are critical (whose failure would partition the network) is essential for reliability planning. A naive approach would try removing each edge and running BFS/DFS to check connectivity -- O(E * (V + E)) total. Tarjan's algorithm finds *all* bridges and articulation points in a single DFS traversal, achieving O(V + E). It works by tracking, for each node, the earliest ancestor reachable through back edges from its subtree. If no back edge from the subtree of v reaches above u, then removing edge (u, v) disconnects the graph.

**The intuition.** During DFS, every non-tree edge (a "back edge") creates a cycle. A bridge is an edge that is *not* part of any cycle -- removing it creates a new connected component. The `low[v]` value tracks the highest ancestor reachable from v's subtree via back edges. If `low[v]` is greater than `disc[u]` for edge (u, v), it means v's entire subtree has no "escape route" back to u's ancestors -- so (u, v) is a bridge.

**Interview signals.** Look for: (1) "critical connections in a network" (LC 1192), (2) "find edges whose removal disconnects the graph," (3) network reliability or single-point-of-failure analysis.

A **bridge** is an edge whose removal disconnects the graph. An **articulation point** is a vertex whose removal disconnects the graph.

Tarjan's algorithm uses DFS with two arrays:
- `disc[u]`: discovery time of node u
- `low[u]`: lowest discovery time reachable from the subtree rooted at u

**Bridge condition**: Edge (u, v) is a bridge if `low[v] > disc[u]` — the subtree rooted at v cannot reach u or any ancestor through a back edge.

**Articulation point condition**: Node u is an articulation point if:
- u is root and has 2+ children in DFS tree, OR
- u is not root and has a child v with `low[v] >= disc[u]`

```java
static List<int[]> findBridges(int n, List<List<Integer>> adj) {
    int[] disc = new int[n], low = new int[n];
    Arrays.fill(disc, -1);
    List<int[]> bridges = new ArrayList<>();
    int[] timer = {0};

    for (int i = 0; i < n; i++)
        if (disc[i] == -1) dfsBridge(i, -1, adj, disc, low, timer, bridges);

    return bridges;
}

private static void dfsBridge(int u, int parent, List<List<Integer>> adj,
        int[] disc, int[] low, int[] timer, List<int[]> bridges) {
    disc[u] = low[u] = timer[0]++;
    for (int v : adj.get(u)) {
        if (disc[v] == -1) {
            dfsBridge(v, u, adj, disc, low, timer, bridges);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > disc[u]) bridges.add(new int[]{u, v});
        } else if (v != parent) {
            low[u] = Math.min(low[u], disc[v]);
        }
    }
}

static Set<Integer> findArticulationPoints(int n, List<List<Integer>> adj) {
    int[] disc = new int[n], low = new int[n];
    Arrays.fill(disc, -1);
    Set<Integer> ap = new HashSet<>();
    int[] timer = {0};

    for (int i = 0; i < n; i++)
        if (disc[i] == -1) dfsAP(i, -1, adj, disc, low, timer, ap);

    return ap;
}

private static void dfsAP(int u, int parent, List<List<Integer>> adj,
        int[] disc, int[] low, int[] timer, Set<Integer> ap) {
    disc[u] = low[u] = timer[0]++;
    int children = 0;
    for (int v : adj.get(u)) {
        if (disc[v] == -1) {
            children++;
            dfsAP(v, u, adj, disc, low, timer, ap);
            low[u] = Math.min(low[u], low[v]);
            if (parent == -1 && children > 1) ap.add(u);
            if (parent != -1 && low[v] >= disc[u]) ap.add(u);
        } else if (v != parent) {
            low[u] = Math.min(low[u], disc[v]);
        }
    }
}
```

<AlgoViz
  title="Tarjan's Bridge Finding \u2014 DFS on a 5-Node Graph"
  description="Find bridges using disc[] and low[] arrays. Edge (u,v) is a bridge when low[v] > disc[u], meaning v's subtree has no back-edge escape."
  steps={[
    {
      array: [0, 1, 2, 3, 4],
      labels: { 0: "A", 1: "B", 2: "C", 3: "D", 4: "E" },
      highlights: [0, 1, 2, 3, 4],
      variables: { edges: "A-B, B-C, C-A, C-D, D-E", bridges: "?" },
      explanation: "Graph: nodes A(0)-E(4). Edges: A-B, B-C, C-A (triangle), C-D, D-E. Which edges are bridges (removal disconnects the graph)?",
      code: "// DFS from node 0 with disc[] and low[] tracking"
    },
    {
      array: [0, 1, 2, -1, -1],
      array2: [0, 1, 2, -1, -1],
      labels: { 0: "disc", 1: "disc", 2: "disc" },
      labels2: { 0: "low", 1: "low", 2: "low" },
      highlights: [0, 1, 2],
      variables: { path: "A\u2192B\u2192C", "disc[]": "[0,1,2,_,_]", "low[]": "[0,1,2,_,_]" },
      explanation: "DFS: visit A(disc=0), B(disc=1), C(disc=2). Initially low[v] = disc[v] for each node.",
      code: "disc[u] = low[u] = timer++; // assign discovery time"
    },
    {
      array: [0, 1, 2, -1, -1],
      array2: [0, 0, 0, -1, -1],
      highlights: [2],
      secondary: [0],
      pointers: { 0: "back edge!" },
      variables: { "C sees A": "back edge", "low[C]": "min(2, disc[A]=0) = 0", "propagates": "up" },
      explanation: "C sees neighbor A (already visited, not parent). Back edge! Update low[C] = min(2, disc[A]) = 0. This means C can reach A's discovery time.",
      code: "low[u] = Math.min(low[u], disc[v]); // low[2] = min(2,0) = 0"
    },
    {
      array: [0, 1, 2, -1, -1],
      array2: [0, 0, 0, -1, -1],
      highlights: [0, 1, 2],
      variables: { "low[B]": "min(1, low[C]=0) = 0", "low[A]": "min(0, low[B]=0) = 0", "A-B bridge?": "low[B]=0 \u2264 disc[A]=0 \u2192 NO" },
      explanation: "Propagate: low[B] = min(low[B], low[C]) = 0. low[A] = min(low[A], low[B]) = 0. Edge A-B: low[B]=0 \u2264 disc[A]=0 \u2192 NOT a bridge (cycle protects it).",
      code: "low[u] = Math.min(low[u], low[v]); // propagate up DFS tree"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 0, 0, 3, 4],
      highlights: [3, 4],
      pointers: { 3: "disc=3", 4: "disc=4" },
      variables: { path: "C\u2192D\u2192E", "disc[]": "[0,1,2,3,4]", "low[]": "[0,0,0,3,4]" },
      explanation: "Continue DFS: C\u2192D(disc=3), D\u2192E(disc=4). E has no unvisited neighbors. low[E]=4, low[D]=3 (no back edges from D or E).",
      code: "// D and E have no back edges, low stays at disc values"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 0, 0, 3, 4],
      highlights: [3, 4],
      secondary: [2],
      variables: { "C-D bridge?": "low[D]=3 > disc[C]=2 \u2192 YES!", "D-E bridge?": "low[E]=4 > disc[D]=3 \u2192 YES!" },
      explanation: "Check bridges: edge C-D: low[D]=3 > disc[C]=2 \u2192 BRIDGE! Edge D-E: low[E]=4 > disc[D]=3 \u2192 BRIDGE! Removing either disconnects the graph.",
      code: "if (low[v] > disc[u]) bridges.add({u, v}); // C-D and D-E"
    },
    {
      array: [0, 1, 2, 3, 4],
      array2: [0, 0, 0, 3, 4],
      highlights: [0, 1, 2],
      secondary: [3, 4],
      variables: { bridges: "C-D, D-E", "not bridges": "A-B, B-C, C-A", reason: "triangle has back edges" },
      explanation: "Result: 2 bridges found (C-D, D-E). Edges in the triangle {A,B,C} are NOT bridges because back edges create alternative paths. Time: O(V+E).",
      code: "return bridges; // [{2,3}, {3,4}] in O(V+E)"
    }
  ]}
/>

### Strongly Connected Components — Kosaraju's Algorithm

**Why this technique exists.** Finding SCCs lets you collapse a directed graph into a DAG of components, simplifying many reachability and dependency problems. For example, determining whether all nodes are mutually reachable, finding the minimum set of nodes from which all others are reachable, or detecting deadlocks in dependency graphs all reduce to SCC computation. Kosaraju's two-pass DFS runs in O(V + E) and is simpler to implement correctly than Tarjan's SCC variant.

**Interview signals.** Look for: (1) "can every node reach every other node?" (single SCC check), (2) "condense the graph" or "collapse cycles," (3) 2-SAT problems (which reduce to SCC on the implication graph), (4) "minimum number of edges to add for strong connectivity."

A **strongly connected component (SCC)** is a maximal set of vertices where every vertex is reachable from every other vertex (in a directed graph).

**Kosaraju's algorithm** (two DFS passes):
1. **Pass 1**: Run DFS on the original graph, pushing nodes onto a stack in order of finish time
2. **Transpose** the graph (reverse all edges)
3. **Pass 2**: Pop nodes from the stack, run DFS on the transposed graph. Each DFS tree is one SCC.

```java
static List<List<Integer>> kosarajuScc(int n, List<List<Integer>> adj) {
    // Pass 1: order by finish time
    boolean[] visited = new boolean[n];
    Deque<Integer> order = new ArrayDeque<>();

    for (int i = 0; i < n; i++)
        if (!visited[i]) dfs1(i, adj, visited, order);

    // Build transposed graph
    List<List<Integer>> adjT = new ArrayList<>();
    for (int i = 0; i < n; i++) adjT.add(new ArrayList<>());
    for (int u = 0; u < n; u++)
        for (int v : adj.get(u)) adjT.get(v).add(u);

    // Pass 2: DFS in reverse finish order on transposed graph
    visited = new boolean[n];
    List<List<Integer>> sccs = new ArrayList<>();

    while (!order.isEmpty()) {
        int u = order.pop();
        if (!visited[u]) {
            List<Integer> component = new ArrayList<>();
            dfs2(u, adjT, visited, component);
            sccs.add(component);
        }
    }
    return sccs;
}

private static void dfs1(int u, List<List<Integer>> adj,
        boolean[] visited, Deque<Integer> order) {
    visited[u] = true;
    for (int v : adj.get(u))
        if (!visited[v]) dfs1(v, adj, visited, order);
    order.push(u);
}

private static void dfs2(int u, List<List<Integer>> adjT,
        boolean[] visited, List<Integer> component) {
    visited[u] = true;
    component.add(u);
    for (int v : adjT.get(u))
        if (!visited[v]) dfs2(v, adjT, visited, component);
}
```

**Time complexity**: O(V + E) — two DFS passes, each touching every vertex and edge once.

### Max Flow — Edmonds-Karp Algorithm

**Why this technique exists.** Maximum flow is one of the most versatile modeling tools in algorithm design. A surprising number of problems reduce to max flow: bipartite matching, minimum cut (by the max-flow min-cut theorem), edge-disjoint paths, project selection, and scheduling with constraints. Learning to model a problem as a flow network is often the hardest part; once modeled, Edmonds-Karp or Dinic's algorithm solves it mechanically.

**Interview signals.** Look for: (1) "maximum number of non-overlapping paths from s to t," (2) "minimum number of edges to remove to disconnect s from t" (minimum cut), (3) "assign tasks to workers with capacity constraints," (4) "maximum matching in a bipartite graph."

The **maximum flow** problem asks: given a directed graph with edge capacities, source s, and sink t, what is the maximum flow from s to t?

**Edmonds-Karp** is a BFS-based implementation of Ford-Fulkerson. It repeatedly finds the shortest augmenting path (by edge count) using BFS and pushes flow along it.

```java
static int edmondsKarp(int n, List<List<Integer>> adj, int[][] cap, int s, int t) {
    int maxFlow = 0;

    while (true) {
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        parent[s] = s;
        if (!bfs(s, t, adj, cap, parent)) break;

        int pathFlow = Integer.MAX_VALUE;
        for (int v = t; v != s; v = parent[v])
            pathFlow = Math.min(pathFlow, cap[parent[v]][v]);

        for (int v = t; v != s; v = parent[v]) {
            cap[parent[v]][v] -= pathFlow;
            cap[v][parent[v]] += pathFlow;
        }
        maxFlow += pathFlow;
    }
    return maxFlow;
}

private static boolean bfs(int source, int sink, List<List<Integer>> adj,
        int[][] cap, int[] parent) {
    Queue<Integer> queue = new ArrayDeque<>();
    queue.offer(source);
    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int v : adj.get(u)) {
            if (parent[v] == -1 && cap[u][v] > 0) {
                parent[v] = u;
                if (v == sink) return true;
                queue.offer(v);
            }
        }
    }
    return false;
}
```

**Time complexity**: O(V · E²). For denser graphs, **Dinic's algorithm** achieves O(V² · E) and is preferred in practice for competitive programming.

### Bipartite Matching

**Why this technique exists.** Bipartite matching solves the fundamental "assignment" problem: pairing items from two groups optimally. It appears in task scheduling, resource allocation, and pairing problems. While it reduces to max flow, specialized algorithms (Hopcroft-Karp at O(E * sqrt(V))) are faster and worth knowing for competition settings.

**Interview signals.** Look for: (1) "assign n tasks to n workers" with compatibility constraints, (2) "maximum number of non-conflicting pairs," (3) "minimum vertex cover" in bipartite graphs (equals max matching by Konig's theorem).

A **bipartite matching** finds the maximum set of edges with no shared endpoints between two groups.

**Key insight**: Bipartite matching reduces to max flow. Add a source connected to all left nodes and a sink connected to all right nodes, each with capacity 1. Max flow = max matching.

**Hopcroft-Karp** achieves O(E√V) for bipartite matching directly. The **Hungarian algorithm** solves the weighted assignment problem in O(n³).

---

## Worked Example: The Skyline Problem

**Input**: buildings = [[2,9,10], [3,7,15], [5,12,12], [15,20,10], [19,24,8]]

```
Processing events (sorted):
  Events generated:
    (2, -10, 9), (3, -15, 7), (5, -12, 12), (9, 0, 0),
    (7, 0, 0), (12, 0, 0), (15, -10, 20), (19, -8, 24),
    (20, 0, 0), (24, 0, 0)

  Sorted events:
    x=2:  start h=10 (ends at 9)   → heap: [(-10,9)]           max=10  → output [2,10]
    x=3:  start h=15 (ends at 7)   → heap: [(-15,7),(-10,9)]   max=15  → output [3,15]
    x=5:  start h=12 (ends at 12)  → heap: [(-15,7),(-12,12),(-10,9)] max=15  → no change
    x=7:  end (building h=15)      → lazy delete → heap top (-15,7) ends at 7 ≤ 7, pop
                                     heap: [(-12,12),(-10,9)]   max=12  → output [7,12]
    x=9:  end (building h=10)      → heap top (-12,12) ends at 12 > 9, stays
                                     max=12                     → no change
    x=12: end (building h=12)      → lazy delete (-12,12) ends at 12 ≤ 12, pop
                                     (-10,9) ends at 9 ≤ 12, pop
                                     heap: [(0,inf)]            max=0   → output [12,0]
    x=15: start h=10 (ends at 20)  → heap: [(-10,20)]          max=10  → output [15,10]
    x=19: start h=8 (ends at 24)   → heap: [(-10,20),(-8,24)]  max=10  → no change
    x=20: end (building h=10)      → lazy delete, pop (-10,20)
                                     heap: [(-8,24)]            max=8   → output [20,8]
    x=24: end (building h=8)       → pop (-8,24)
                                     heap: [(0,inf)]            max=0   → output [24,0]

Output: [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]
```

---

## Pattern Recognition

| Signal | Technique |
|---|---|
| "overlapping intervals" / "how many overlap at peak" | Sweep line with events (+1/-1) |
| "merge intervals" / "non-overlapping coverage" | Sort + merge |
| "skyline" / "silhouette" / "visible buildings" | Sweep line with max-heap |
| "rectangle union area" / "total covered area" | Coordinate compression + sweep line |
| "convex hull" / "fence around points" | Andrew's monotone chain or Graham scan |
| "max points on a line" | Slope counting with GCD normalization |
| "critical connection" / "bridge" / "cut edge" | Tarjan's bridge-finding algorithm |
| "strongly connected" / "reachability in directed graph" | Kosaraju's or Tarjan's SCC |
| "maximum matching" / "assign tasks to workers" | Bipartite matching (Hopcroft-Karp) |
| "maximum flow" / "minimum cut" | Edmonds-Karp or Dinic's |
| "flowers blooming" / "events active at query time" | Sweep line or difference array + binary search |

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "how many intervals overlap at the peak" / "minimum rooms" | Sweep line with +1/-1 events | Sort events by time; track running count to find maximum concurrency |
| "merge overlapping intervals" / "consolidate ranges" | Sort by start + greedy merge | Adjacent intervals with overlap can be merged in a single left-to-right pass |
| "skyline silhouette" / "visible building outlines" | Sweep line with max-heap | Track the tallest active building; emit a key point when the maximum changes |
| "total area covered by rectangles" | Coordinate compression + sweep line | Discretize coordinates, sweep one axis while tracking coverage on the other |
| "convex hull" / "fence enclosing all points" | Andrew's monotone chain | Sort by x, build lower and upper hulls using cross product orientation tests |
| "do segments intersect" / "crossing paths" | Cross product orientation test | Four orientation checks determine if endpoints straddle each other's lines |
| "point inside polygon" | Ray casting (odd-even rule) | Count edge crossings of a horizontal ray; odd means inside |
| "critical connection" / "bridge edge" / "single point of failure" | Tarjan's bridge-finding (disc/low) | Edge (u,v) is a bridge when `low[v]` exceeds `disc[u]`, meaning no back-edge escape |
| "strongly connected components" / "collapse cycles in digraph" | Kosaraju's two-pass DFS | Finish-order DFS on original graph, then DFS on transpose reveals SCCs |
| "maximum flow" / "minimum cut" / "edge-disjoint paths" | Edmonds-Karp (BFS-based Ford-Fulkerson) | Repeatedly find shortest augmenting path; max-flow equals min-cut by duality |
| "assign tasks to workers" / "maximum matching" | Bipartite matching via max flow or Hopcroft-Karp | Model as bipartite graph; max matching equals max flow with unit capacities |
| "flowers in bloom at query time" / "events active at timestamp" | Difference array + binary search | Mark +1 at start, -1 at end, prefix sum gives count at any time |

---

## Problem Set (21 Problems)

### Day 1–2: Sweep Line & Intervals (6 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 1 | Meeting Rooms II | Medium | Sweep line / min-heap for room reuse | [LC 253](https://leetcode.com/problems/meeting-rooms-ii/) |
| 2 | The Skyline Problem | Hard | Sweep line with lazy-delete max-heap | [LC 218](https://leetcode.com/problems/the-skyline-problem/) |
| 3 | Merge Intervals | Medium | Sort by start, merge overlapping | [LC 56](https://leetcode.com/problems/merge-intervals/) |
| 4 | Insert Interval | Medium | Binary search or linear scan merge | [LC 57](https://leetcode.com/problems/insert-interval/) |
| 5 | Non-overlapping Intervals | Medium | Greedy by end time (activity selection) | [LC 435](https://leetcode.com/problems/non-overlapping-intervals/) |
| 6 | My Calendar II | Medium | Sweep line / double booking with sorted events | [LC 731](https://leetcode.com/problems/my-calendar-ii/) |

### Day 3–4: Geometry & Advanced Graph (8 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 7 | Rectangle Area II | Hard | Coordinate compression + sweep line | [LC 850](https://leetcode.com/problems/rectangle-area-ii/) |
| 8 | Erect the Fence | Hard | Convex hull (Andrew's monotone chain) | [LC 587](https://leetcode.com/problems/erect-the-fence/) |
| 9 | Max Points on a Line | Hard | Slope counting with GCD, handle verticals | [LC 149](https://leetcode.com/problems/max-points-on-a-line/) |
| 10 | Critical Connections in a Network | Hard | Tarjan's bridge-finding algorithm | [LC 1192](https://leetcode.com/problems/critical-connections-in-a-network/) |
| 11 | Course Schedule II | Medium | Topological sort (SCC awareness) | [LC 210](https://leetcode.com/problems/course-schedule-ii/) |
| 12 | Minimum Number of Vertices to Reach All Nodes | Medium | Find nodes with in-degree 0 in DAG | [LC 1557](https://leetcode.com/problems/minimum-number-of-vertices-to-reach-all-nodes/) |
| 13 | Smallest Rotation with Highest Score | Hard | Difference array + sweep | [LC 798](https://leetcode.com/problems/smallest-rotation-with-highest-score/) |
| 14 | Interval List Intersections | Medium | Two-pointer sweep on sorted intervals | [LC 986](https://leetcode.com/problems/interval-list-intersections/) |

### Day 5–7: Hard Integration (7 Problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|-----------|---------------|------|
| 15 | Maximum Number of Events That Can Be Attended | Medium | Greedy + min-heap sweep by day | [LC 1353](https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/) |
| 16 | Amount of New Area Painted Each Day | Hard | Sweep line / segment tree for painted intervals | [LC 2158](https://leetcode.com/problems/amount-of-new-area-painted-each-day/) |
| 17 | Checking Existence of Edge Length Limited Paths II | Hard | Offline queries + DSU sorted by weight | [LC 1724](https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths-ii/) |
| 18 | Parallel Courses III | Hard | Topological sort + DP for longest path | [LC 2050](https://leetcode.com/problems/parallel-courses-iii/) |
| 19 | Count All Possible Routes | Hard | DP on (city, fuel) with modular counting | [LC 1575](https://leetcode.com/problems/count-all-possible-routes/) |
| 20 | Minimum Cost to Make at Least One Valid Path | Hard | 0-1 BFS (deque) on grid with direction costs | [LC 1368](https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/) |
| 21 | Number of Flowers in Full Bloom | Hard | Sweep line / difference array + binary search | [LC 2251](https://leetcode.com/problems/number-of-flowers-in-full-bloom/) |

---

## Mock Interview

### Problem 1: The Skyline Problem (Sweep Line + Heap)

**Interviewer**: Given a list of buildings [left, right, height], return the skyline formed by these buildings as a list of key points.

**Candidate**:

**Step 1 — Generate events.** For each building, create a start event at x = left with height h, and an end event at x = right.

**Step 2 — Sort events.** Sort by x-coordinate. Tie-breaking is crucial:
- At the same x, starts come before ends (so we don't create a gap-then-rise)
- Among starts at same x, taller buildings first (avoids recording intermediate heights)
- Among ends at same x, shorter buildings first (remove in correct order)

**Step 3 — Max-heap with lazy deletion.**

```java
public List<List<Integer>> getSkyline(int[][] buildings) {
    List<int[]> events = new ArrayList<>();
    for (int[] b : buildings) {
        events.add(new int[]{b[0], -b[2], b[1]});
        events.add(new int[]{b[1], 0, 0});
    }
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) ->
        a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
    heap.offer(new int[]{0, Integer.MAX_VALUE});
    List<List<Integer>> result = new ArrayList<>();
    int prevMax = 0;

    for (int[] ev : events) {
        if (ev[1] != 0) heap.offer(new int[]{ev[1], ev[2]});
        while (heap.peek()[1] <= ev[0]) heap.poll();
        int curMax = -heap.peek()[0];
        if (curMax != prevMax) {
            result.add(List.of(ev[0], curMax));
            prevMax = curMax;
        }
    }
    return result;
}
```

**Step 4 — Complexity.** O(n log n) for sorting and heap operations.

**Follow-up 1**: *Why negative height?* Java's `PriorityQueue` is a min-heap. Negating heights gives us max-heap behavior.

**Follow-up 2**: *What is lazy deletion?* Instead of removing specific heap entries (which is O(n) for a heap), we leave stale entries and skip them when they surface as the top. We detect staleness by checking if the building's right edge ≤ current x.

**Follow-up 3**: *Can you use a balanced BST instead?* Yes — a `TreeMap` supports O(log n) insert, delete, and max queries without lazy deletion. This avoids worst-case heap size issues.

---

### Problem 2: Critical Connections in a Network (Tarjan's Bridges)

**Interviewer**: Given n servers and connections between them, find all critical connections (edges whose removal disconnects the network).

**Candidate**:

**Step 1 — Model.** This is the bridge-finding problem on an undirected graph. Use Tarjan's algorithm.

**Step 2 — DFS with disc and low arrays.**

```java
public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (List<Integer> e : connections) {
        adj.get(e.get(0)).add(e.get(1));
        adj.get(e.get(1)).add(e.get(0));
    }

    int[] disc = new int[n], low = new int[n];
    Arrays.fill(disc, -1);
    List<List<Integer>> bridges = new ArrayList<>();
    int[] timer = {0};

    dfs(0, -1, adj, disc, low, timer, bridges);
    return bridges;
}

private void dfs(int u, int parent, List<List<Integer>> adj,
        int[] disc, int[] low, int[] timer, List<List<Integer>> bridges) {
    disc[u] = low[u] = timer[0]++;
    for (int v : adj.get(u)) {
        if (disc[v] == -1) {
            dfs(v, u, adj, disc, low, timer, bridges);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > disc[u])
                bridges.add(List.of(u, v));
        } else if (v != parent) {
            low[u] = Math.min(low[u], disc[v]);
        }
    }
}
```

**Step 3 — Complexity.** O(V + E) — single DFS traversal.

**Step 4 — Key insight.** `low[v] > disc[u]` means the subtree rooted at v has no back edge to u or any ancestor of u. Removing edge (u,v) disconnects v's subtree from the rest.

**Follow-up 1**: *What about articulation points?* Change the condition: u is an articulation point if `low[v] >= disc[u]` (note ≥ instead of >) for any child v when u is not the root, or if u is the root with 2+ DFS children.

**Follow-up 2**: *How does this relate to SCCs?* In a directed graph, Tarjan's SCC algorithm uses a similar disc/low approach but with a stack. Bridges in undirected graphs are analogous to edges between different SCCs in directed graphs. Kosaraju's two-pass DFS is an alternative for finding SCCs.

**Follow-up 3**: *How would you model a network reliability problem with max flow?* If you want to find the minimum number of edges to disconnect s from t, that's the **minimum cut** problem — equivalent to max flow by the max-flow min-cut theorem. Use Edmonds-Karp with unit capacities on edges.

**Follow-up 4**: *When would you use Dinic's over Edmonds-Karp?* Dinic's O(V²E) is better for dense graphs and unit-capacity networks (where it achieves O(E√V)). In practice, Dinic's with BFS layering and blocking flows is the go-to for competitive programming max-flow problems.

---

## Tips and Pitfalls

1. **Sweep line event ordering tie-breaking**: This is the #1 source of bugs. At the same x-coordinate:
   - For the Skyline Problem: starts before ends, taller starts first, shorter ends first
   - For interval problems: decide whether equal endpoints count as overlapping based on the problem definition (open vs. closed intervals)

2. **Convex hull collinear points**: The standard Andrew's algorithm excludes collinear boundary points (uses `<=` in the cross product check). If the problem requires including them (like LC 587), use strict `<` and handle the last edge carefully by not removing collinear points on the closing edge.

3. **Tarjan's low-link initialization**: Initialize `low[u] = disc[u]`, not 0. A common bug is initializing low to 0, which makes every node appear to reach the root.

4. **Handling multi-edges in bridge finding**: If there are parallel edges between u and v, they are NOT bridges (removing one still leaves a path). Track edge indices rather than parent nodes to handle this correctly.

5. **Max flow modeling tricks**:
   - Node capacity: split each node into two (in-node and out-node) with an edge of the desired capacity
   - Undirected edges: add two directed edges, each with the given capacity
   - Minimum cut: after running max flow, BFS from source in the residual graph. Edges from reachable to unreachable nodes form the min cut.

6. **Geometry floating-point issues**: Use integer arithmetic (cross products, squared distances) wherever possible. Avoid division until the final answer. When comparison is needed, use an epsilon tolerance (e.g., 1e-9) only as a last resort.

7. **Recursion depth for Tarjan/Kosaraju**: Java's default thread stack size may cause `StackOverflowError` on large graphs. Either increase it with `-Xss` or convert to an iterative DFS with an explicit stack.

8. **Sweep line with segment trees**: For problems like Rectangle Area II (LC 850), the active set needs range updates and range queries — use a segment tree that tracks covered length as the sweep line advances.

9. **Closest pair optimization**: The strip check only needs to compare each point against at most 7 subsequent points (sorted by y). Skipping this optimization gives O(n²) in the worst case.

10. **Bipartite matching verification**: After finding a maximum matching, verify it by checking that no augmenting path exists. The size of a maximum matching equals n minus the size of a maximum independent set (König's theorem in bipartite graphs).
