import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import { FOUNDATIONS_PHASES, FOUNDATIONS_WEEKS } from './_foundations-data';

const TRACK_CONFIG = {
  foundations: {
    storageKey: 'dsa-foundations-progress',
    startKey: 'dsa-foundations-start',
    totalWeeks: 20,
    label: 'Foundations',
    tagline: '20 Weeks / 420 Problems',
    title: 'Foundations Training',
    subtitle: 'Beginner-to-intermediate. Build your core DSA skills with progressively challenging problems and ace coding interviews.',
  },
  intensive: {
    storageKey: 'dsa-roadmap-progress',
    startKey: 'dsa-roadmap-start',
    totalWeeks: 20,
    label: 'Intensive',
    tagline: '20 Weeks / 420 Problems',
    title: 'Intensive Training',
    subtitle: 'Intermediate-to-advanced. Track your progress, study the theory, and ace Big Tech coding interviews.',
  },
};

const PHASES = [
  {
    id: 'p1',
    title: 'Phase 1: Advanced Foundations',
    color: '#00f0ff',
    weeks: [1, 2, 3, 4],
  },
  {
    id: 'p2',
    title: 'Phase 2: Graph + Tree Mastery',
    color: '#a855f7',
    weeks: [5, 6, 7, 8],
  },
  {
    id: 'p3',
    title: 'Phase 3: DP Deep-Dive',
    color: '#f472b6',
    weeks: [9, 10, 11, 12, 13],
  },
  {
    id: 'p4',
    title: 'Phase 4: Strings, Math & Rare Techniques',
    color: '#34d399',
    weeks: [14, 15, 16, 17, 18, 19],
  },
  {
    id: 'p5',
    title: 'Phase 5: Integration + Final Mocks',
    color: '#f59e0b',
    weeks: [20],
  },
];

const WEEKS = [
  {
    num: 1,
    title: 'Monotonic Stack + Deque',
    doc: '/docs/DSA-Training/week-01-monotonic-stack',
    problems: [
      { id: 'w1p1', name: 'Next Greater Element I', diff: 'Easy', lc: 'https://leetcode.com/problems/next-greater-element-i/', day: 1 },
      { id: 'w1p2', name: 'Daily Temperatures', diff: 'Medium', lc: 'https://leetcode.com/problems/daily-temperatures/', day: 1, star: true },
      { id: 'w1p3', name: 'Next Greater Element II', diff: 'Medium', lc: 'https://leetcode.com/problems/next-greater-element-ii/', day: 1 },
      { id: 'w1p4', name: 'Sliding Window Maximum', diff: 'Hard', lc: 'https://leetcode.com/problems/sliding-window-maximum/', day: 1, star: true },
      { id: 'w1p5', name: 'Online Stock Span', diff: 'Medium', lc: 'https://leetcode.com/problems/online-stock-span/', day: 1 },
      { id: 'w1p6', name: 'Remove K Digits', diff: 'Medium', lc: 'https://leetcode.com/problems/remove-k-digits/', day: 1 },
      { id: 'w1p7', name: 'Largest Rectangle in Histogram', diff: 'Hard', lc: 'https://leetcode.com/problems/largest-rectangle-in-histogram/', day: 2, star: true },
      { id: 'w1p8', name: 'Maximal Rectangle', diff: 'Hard', lc: 'https://leetcode.com/problems/maximal-rectangle/', day: 2 },
      { id: 'w1p9', name: 'Trapping Rain Water', diff: 'Hard', lc: 'https://leetcode.com/problems/trapping-rain-water/', day: 2, star: true },
      { id: 'w1p10', name: 'Sum of Subarray Minimums', diff: 'Medium', lc: 'https://leetcode.com/problems/sum-of-subarray-minimums/', day: 2, star: true },
      { id: 'w1p11', name: 'Sum of Subarray Ranges', diff: 'Medium', lc: 'https://leetcode.com/problems/sum-of-subarray-ranges/', day: 2 },
      { id: 'w1p12', name: '132 Pattern', diff: 'Medium', lc: 'https://leetcode.com/problems/132-pattern/', day: 2 },
      { id: 'w1p13', name: 'Maximum Width Ramp', diff: 'Medium', lc: 'https://leetcode.com/problems/maximum-width-ramp/', day: 2 },
      { id: 'w1p14', name: 'Shortest Subarray with Sum at Least K', diff: 'Hard', lc: 'https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/', day: 2, star: true },
      { id: 'w1p15', name: 'Longest Bounded-Difference Subarray', diff: 'Medium', lc: 'https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/', day: 3 },
      { id: 'w1p16', name: 'Steps to Make Array Non-decreasing', diff: 'Medium', lc: 'https://leetcode.com/problems/steps-to-make-array-non-decreasing/', day: 3 },
      { id: 'w1p17', name: 'Number of Visible People in a Queue', diff: 'Hard', lc: 'https://leetcode.com/problems/number-of-visible-people-in-a-queue/', day: 3 },
      { id: 'w1p18', name: 'Maximum Score of a Good Subarray', diff: 'Hard', lc: 'https://leetcode.com/problems/maximum-score-of-a-good-subarray/', day: 3 },
      { id: 'w1p19', name: 'Sum of Total Strength of Wizards', diff: 'Hard', lc: 'https://leetcode.com/problems/sum-of-total-strength-of-wizards/', day: 3 },
      { id: 'w1p20', name: 'Constrained Subsequence Sum', diff: 'Hard', lc: 'https://leetcode.com/problems/constrained-subsequence-sum/', day: 3 },
      { id: 'w1p21', name: 'Jump Game VI', diff: 'Medium', lc: 'https://leetcode.com/problems/jump-game-vi/', day: 3 },
    ],
    mocks: [
      { id: 'w1m1', name: 'Mock: Largest Rectangle in Histogram' },
      { id: 'w1m2', name: 'Mock: Shortest Subarray with Sum ≥ K' },
    ],
  },
  {
    num: 2,
    title: 'Advanced Binary Search',
    doc: '/docs/DSA-Training/week-02-advanced-binary-search',
    problems: [
      { id: 'w2p1', name: 'Koko Eating Bananas', diff: 'Medium', lc: 'https://leetcode.com/problems/koko-eating-bananas/', day: 1, star: true },
      { id: 'w2p2', name: 'Capacity To Ship Packages', diff: 'Medium', lc: 'https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/', day: 1 },
      { id: 'w2p3', name: 'Split Array Largest Sum', diff: 'Hard', lc: 'https://leetcode.com/problems/split-array-largest-sum/', day: 1, star: true },
      { id: 'w2p4', name: 'Magnetic Force Between Two Balls', diff: 'Medium', lc: 'https://leetcode.com/problems/magnetic-force-between-two-balls/', day: 1 },
      { id: 'w2p5', name: 'Find Peak Element', diff: 'Medium', lc: 'https://leetcode.com/problems/find-peak-element/', day: 1, star: true },
      { id: 'w2p6', name: 'Search in Rotated Sorted Array', diff: 'Medium', lc: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', day: 1, star: true },
      { id: 'w2p7', name: 'Minimize Max Distance to Gas Station', diff: 'Hard', lc: 'https://leetcode.com/problems/minimize-max-distance-to-gas-station/', day: 2 },
      { id: 'w2p8', name: 'Kth Smallest Element in Sorted Matrix', diff: 'Medium', lc: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/', day: 2 },
      { id: 'w2p9', name: 'Find K-th Smallest Pair Distance', diff: 'Hard', lc: 'https://leetcode.com/problems/find-k-th-smallest-pair-distance/', day: 2 },
      { id: 'w2p10', name: 'Median of Two Sorted Arrays', diff: 'Hard', lc: 'https://leetcode.com/problems/median-of-two-sorted-arrays/', day: 2, star: true },
      { id: 'w2p11', name: 'Find Min in Rotated Sorted Array II', diff: 'Hard', lc: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/', day: 2 },
      { id: 'w2p12', name: 'Longest Increasing Subsequence', diff: 'Medium', lc: 'https://leetcode.com/problems/longest-increasing-subsequence/', day: 2, star: true },
      { id: 'w2p13', name: 'Kth Missing Positive Number', diff: 'Easy', lc: 'https://leetcode.com/problems/kth-missing-positive-number/', day: 2 },
      { id: 'w2p14', name: 'Nth Magical Number', diff: 'Hard', lc: 'https://leetcode.com/problems/nth-magical-number/', day: 2 },
      { id: 'w2p15', name: 'Maximum Value at Index in Bounded Array', diff: 'Medium', lc: 'https://leetcode.com/problems/maximum-value-at-a-given-index-in-a-bounded-array/', day: 3 },
      { id: 'w2p16', name: 'Min Days to Make m Bouquets', diff: 'Medium', lc: 'https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/', day: 3 },
      { id: 'w2p17', name: 'Find the Smallest Divisor', diff: 'Medium', lc: 'https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/', day: 3 },
      { id: 'w2p18', name: 'Max Number of Removable Characters', diff: 'Medium', lc: 'https://leetcode.com/problems/maximum-number-of-removable-characters/', day: 3 },
      { id: 'w2p19', name: 'Min Speed to Arrive on Time', diff: 'Medium', lc: 'https://leetcode.com/problems/minimum-speed-to-arrive-on-time/', day: 3 },
      { id: 'w2p20', name: 'Preimage Size of Factorial Zeroes', diff: 'Hard', lc: 'https://leetcode.com/problems/preimage-size-of-factorial-zeroes-function/', day: 3 },
      { id: 'w2p21', name: 'Allocate Minimum Pages', diff: 'Medium', lc: 'https://www.geeksforgeeks.org/allocate-minimum-number-pages/', day: 3 },
    ],
    mocks: [
      { id: 'w2m1', name: 'Mock: Split Array Largest Sum' },
      { id: 'w2m2', name: 'Mock: Median of Two Sorted Arrays' },
    ],
  },
  {
    num: 3, title: 'Prefix Sum + Difference Array', doc: '/docs/DSA-Training/week-03-prefix-sum-difference-array',
    problems: [
      { id:'w3p1',name:'Range Sum Query - Immutable',diff:'Easy',lc:'https://leetcode.com/problems/range-sum-query-immutable/',day:1 },
      { id:'w3p2',name:'Range Sum Query 2D - Immutable',diff:'Medium',lc:'https://leetcode.com/problems/range-sum-query-2d-immutable/',day:1 },
      { id:'w3p3',name:'Subarray Sum Equals K',diff:'Medium',lc:'https://leetcode.com/problems/subarray-sum-equals-k/',day:1,star:true },
      { id:'w3p4',name:'Continuous Subarray Sum',diff:'Medium',lc:'https://leetcode.com/problems/continuous-subarray-sum/',day:1 },
      { id:'w3p5',name:'Corporate Flight Bookings',diff:'Medium',lc:'https://leetcode.com/problems/corporate-flight-bookings/',day:1,star:true },
      { id:'w3p6',name:'Car Pooling',diff:'Medium',lc:'https://leetcode.com/problems/car-pooling/',day:1 },
      { id:'w3p7',name:'Subarray Sums Divisible by K',diff:'Medium',lc:'https://leetcode.com/problems/subarray-sums-divisible-by-k/',day:2 },
      { id:'w3p8',name:'Product of Array Except Self',diff:'Medium',lc:'https://leetcode.com/problems/product-of-array-except-self/',day:2,star:true },
      { id:'w3p9',name:'Find Pivot Index',diff:'Easy',lc:'https://leetcode.com/problems/find-pivot-index/',day:2 },
      { id:'w3p10',name:'Count Number of Nice Subarrays',diff:'Medium',lc:'https://leetcode.com/problems/count-number-of-nice-subarrays/',day:2 },
      { id:'w3p11',name:'Contiguous Array',diff:'Medium',lc:'https://leetcode.com/problems/contiguous-array/',day:2,star:true },
      { id:'w3p12',name:'Matrix Block Sum',diff:'Medium',lc:'https://leetcode.com/problems/matrix-block-sum/',day:2 },
      { id:'w3p13',name:'Range Addition',diff:'Medium',lc:'https://leetcode.com/problems/range-addition/',day:2 },
      { id:'w3p14',name:'Minimum Penalty for a Shop',diff:'Medium',lc:'https://leetcode.com/problems/minimum-penalty-for-a-shop/',day:2 },
      { id:'w3p15',name:'Count of Range Sum',diff:'Hard',lc:'https://leetcode.com/problems/count-of-range-sum/',day:3,star:true },
      { id:'w3p16',name:'Subarrays with K Different Integers',diff:'Hard',lc:'https://leetcode.com/problems/subarrays-with-k-different-integers/',day:3 },
      { id:'w3p17',name:'Number of Submatrices That Sum to Target',diff:'Hard',lc:'https://leetcode.com/problems/number-of-submatrices-that-sum-to-target/',day:3 },
      { id:'w3p18',name:'Max Sum of 3 Non-Overlapping Subarrays',diff:'Hard',lc:'https://leetcode.com/problems/maximum-sum-of-3-non-overlapping-subarrays/',day:3 },
      { id:'w3p19',name:'Stamping the Grid',diff:'Hard',lc:'https://leetcode.com/problems/stamping-the-grid/',day:3 },
      { id:'w3p20',name:'Make Sum Divisible by P',diff:'Medium',lc:'https://leetcode.com/problems/make-sum-divisible-by-p/',day:3 },
      { id:'w3p21',name:'Count Subarrays With Score Less Than K',diff:'Hard',lc:'https://leetcode.com/problems/count-subarrays-with-score-less-than-k/',day:3 },
    ],
    mocks:[{id:'w3m1',name:'Mock: Subarray Sum Equals K'},{id:'w3m2',name:'Mock: Submatrices That Sum to Target'}],
  },
  { num:4,title:'Union-Find (DSU)',doc:'/docs/DSA-Training/week-04-union-find',
    problems:[
      {id:'w4p1',name:'Number of Provinces',diff:'Medium',lc:'https://leetcode.com/problems/number-of-provinces/',day:1,star:true},{id:'w4p2',name:'Redundant Connection',diff:'Medium',lc:'https://leetcode.com/problems/redundant-connection/',day:1,star:true},{id:'w4p3',name:'Accounts Merge',diff:'Medium',lc:'https://leetcode.com/problems/accounts-merge/',day:1,star:true},{id:'w4p4',name:'Satisfiability of Equality Equations',diff:'Medium',lc:'https://leetcode.com/problems/satisfiability-of-equality-equations/',day:1},{id:'w4p5',name:'Longest Consecutive Sequence',diff:'Medium',lc:'https://leetcode.com/problems/longest-consecutive-sequence/',day:1,star:true},{id:'w4p6',name:'Connected Components in Undirected Graph',diff:'Medium',lc:'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/',day:1},
      {id:'w4p7',name:'Regions Cut By Slashes',diff:'Medium',lc:'https://leetcode.com/problems/regions-cut-by-slashes/',day:2},{id:'w4p8',name:'Most Stones Removed',diff:'Medium',lc:'https://leetcode.com/problems/most-stones-removed-with-same-row-or-column/',day:2},{id:'w4p9',name:'Evaluate Division',diff:'Medium',lc:'https://leetcode.com/problems/evaluate-division/',day:2},{id:'w4p10',name:'Smallest String With Swaps',diff:'Medium',lc:'https://leetcode.com/problems/smallest-string-with-swaps/',day:2},{id:'w4p11',name:'Number of Islands II',diff:'Hard',lc:'https://leetcode.com/problems/number-of-islands-ii/',day:2},{id:'w4p12',name:'Graph Valid Tree',diff:'Medium',lc:'https://leetcode.com/problems/graph-valid-tree/',day:2},{id:'w4p13',name:'Min Cost to Connect All Points',diff:'Medium',lc:'https://leetcode.com/problems/min-cost-to-connect-all-points/',day:2,star:true},{id:'w4p14',name:'Redundant Connection II',diff:'Hard',lc:'https://leetcode.com/problems/redundant-connection-ii/',day:2},
      {id:'w4p15',name:'Swim in Rising Water',diff:'Hard',lc:'https://leetcode.com/problems/swim-in-rising-water/',day:3,star:true},{id:'w4p16',name:'Making A Large Island',diff:'Hard',lc:'https://leetcode.com/problems/making-a-large-island/',day:3},{id:'w4p17',name:'Remove Max Edges to Keep Graph Traversable',diff:'Hard',lc:'https://leetcode.com/problems/remove-max-number-of-edges-to-keep-graph-fully-traversable/',day:3},{id:'w4p18',name:'Edge Length Limited Paths',diff:'Hard',lc:'https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths/',day:3},{id:'w4p19',name:'Count Pairs Of Nodes',diff:'Hard',lc:'https://leetcode.com/problems/count-pairs-of-nodes/',day:3},{id:'w4p20',name:'Minimize Malware Spread',diff:'Hard',lc:'https://leetcode.com/problems/minimize-malware-spread/',day:3},{id:'w4p21',name:'Number of Good Paths',diff:'Hard',lc:'https://leetcode.com/problems/number-of-good-paths/',day:3},
    ],
    mocks:[{id:'w4m1',name:'Mock: Accounts Merge'},{id:'w4m2',name:'Mock: Swim in Rising Water'}],
  },
  { num:5,title:'Topological Sort + DAG DP',doc:'/docs/DSA-Training/week-05-topological-sort',problems:[{id:'w5p1',name:'Course Schedule',diff:'Medium',lc:'https://leetcode.com/problems/course-schedule/',day:1,star:true},{id:'w5p2',name:'Course Schedule II',diff:'Medium',lc:'https://leetcode.com/problems/course-schedule-ii/',day:1,star:true},{id:'w5p3',name:'Alien Dictionary',diff:'Hard',lc:'https://leetcode.com/problems/alien-dictionary/',day:1,star:true},{id:'w5p4',name:'Find All Possible Recipes',diff:'Medium',lc:'https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/',day:1},{id:'w5p5',name:'Parallel Courses',diff:'Medium',lc:'https://leetcode.com/problems/parallel-courses/',day:1},{id:'w5p6',name:'Minimum Height Trees',diff:'Medium',lc:'https://leetcode.com/problems/minimum-height-trees/',day:1,star:true},{id:'w5p7',name:'Sort Items by Groups',diff:'Hard',lc:'https://leetcode.com/problems/sort-items-by-groups-respecting-dependencies/',day:2},{id:'w5p8',name:'Sequence Reconstruction',diff:'Medium',lc:'https://leetcode.com/problems/sequence-reconstruction/',day:2},{id:'w5p9',name:'All Ancestors of a Node',diff:'Medium',lc:'https://leetcode.com/problems/all-ancestors-of-a-node-in-a-directed-acyclic-graph/',day:2},{id:'w5p10',name:'Loud and Rich',diff:'Medium',lc:'https://leetcode.com/problems/loud-and-rich/',day:2},{id:'w5p11',name:'Largest Color Value in Directed Graph',diff:'Hard',lc:'https://leetcode.com/problems/largest-color-value-in-a-directed-graph/',day:2},{id:'w5p12',name:'Course Schedule IV',diff:'Medium',lc:'https://leetcode.com/problems/course-schedule-iv/',day:2},{id:'w5p13',name:'Build a Matrix With Conditions',diff:'Hard',lc:'https://leetcode.com/problems/build-a-matrix-with-conditions/',day:2},{id:'w5p14',name:'Find Eventual Safe States',diff:'Medium',lc:'https://leetcode.com/problems/find-eventual-safe-states/',day:2},{id:'w5p15',name:'Longest Increasing Path in a Matrix',diff:'Hard',lc:'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/',day:3,star:true},{id:'w5p16',name:'Strange Printer II',diff:'Hard',lc:'https://leetcode.com/problems/strange-printer-ii/',day:3},{id:'w5p17',name:'Minimum Number of Semesters',diff:'Hard',lc:'https://leetcode.com/problems/minimum-number-of-semesters-to-take-all-courses/',day:3},{id:'w5p18',name:'Number of Ways to Arrive at Destination',diff:'Medium',lc:'https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/',day:3},{id:'w5p19',name:'Max Employees Invited to Meeting',diff:'Hard',lc:'https://leetcode.com/problems/maximum-employees-to-be-invited-to-a-meeting/',day:3},{id:'w5p20',name:'Shortest Path with Obstacle Elimination',diff:'Hard',lc:'https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/',day:3},{id:'w5p21',name:'Parallel Courses III',diff:'Hard',lc:'https://leetcode.com/problems/parallel-courses-iii/',day:3}],mocks:[{id:'w5m1',name:'Mock: Course Schedule II'},{id:'w5m2',name:'Mock: Alien Dictionary'}] },
  { num:6,title:'Shortest Paths',doc:'/docs/DSA-Training/week-06-shortest-paths',problems:[{id:'w6p1',name:'Network Delay Time',diff:'Medium',lc:'https://leetcode.com/problems/network-delay-time/',day:1,star:true},{id:'w6p2',name:'Cheapest Flights Within K Stops',diff:'Medium',lc:'https://leetcode.com/problems/cheapest-flights-within-k-stops/',day:1,star:true},{id:'w6p3',name:'Path with Maximum Probability',diff:'Medium',lc:'https://leetcode.com/problems/path-with-maximum-probability/',day:1},{id:'w6p4',name:'Path With Minimum Effort',diff:'Medium',lc:'https://leetcode.com/problems/path-with-minimum-effort/',day:1,star:true},{id:'w6p5',name:'Shortest Path in Binary Matrix',diff:'Medium',lc:'https://leetcode.com/problems/shortest-path-in-binary-matrix/',day:1,star:true},{id:'w6p6',name:'Shortest Path to Get All Keys',diff:'Hard',lc:'https://leetcode.com/problems/shortest-path-to-get-all-keys/',day:1,star:true},{id:'w6p7',name:'Shortest Path Visiting All Nodes',diff:'Hard',lc:'https://leetcode.com/problems/shortest-path-visiting-all-nodes/',day:2},{id:'w6p8',name:'Min Cost to Make Valid Path',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/',day:2},{id:'w6p9',name:'Swim in Rising Water',diff:'Hard',lc:'https://leetcode.com/problems/swim-in-rising-water/',day:2},{id:'w6p10',name:'Ways to Arrive at Destination',diff:'Medium',lc:'https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/',day:2},{id:'w6p11',name:'City With Smallest Neighbors',diff:'Medium',lc:'https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/',day:2},{id:'w6p12',name:'Min Weighted Subgraph Required Paths',diff:'Hard',lc:'https://leetcode.com/problems/minimum-weighted-subgraph-with-the-required-paths/',day:2},{id:'w6p13',name:'Reachable Nodes In Subdivided Graph',diff:'Hard',lc:'https://leetcode.com/problems/reachable-nodes-in-subdivided-graph/',day:2},{id:'w6p14',name:'Design Graph Shortest Path',diff:'Hard',lc:'https://leetcode.com/problems/design-graph-with-shortest-path-calculator/',day:2},{id:'w6p15',name:'Shortest Path Alternating Colors',diff:'Medium',lc:'https://leetcode.com/problems/shortest-path-with-alternating-colors/',day:3},{id:'w6p16',name:'Min Cost Reach Destination in Time',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/',day:3},{id:'w6p17',name:'Min Obstacle Removal to Reach Corner',diff:'Hard',lc:'https://leetcode.com/problems/minimum-obstacle-removal-to-reach-corner/',day:3},{id:'w6p18',name:'Second Min Time to Reach Destination',diff:'Hard',lc:'https://leetcode.com/problems/second-minimum-time-to-reach-destination/',day:3},{id:'w6p19',name:'Trapping Rain Water II',diff:'Hard',lc:'https://leetcode.com/problems/trapping-rain-water-ii/',day:3},{id:'w6p20',name:'Modify Graph Edge Weights',diff:'Hard',lc:'https://leetcode.com/problems/modify-graph-edge-weights/',day:3},{id:'w6p21',name:'Word Ladder II',diff:'Hard',lc:'https://leetcode.com/problems/word-ladder-ii/',day:3}],mocks:[{id:'w6m1',name:'Mock: Network Delay Time'},{id:'w6m2',name:'Mock: Cheapest Flights Within K Stops'}] },
  { num:7,title:'Advanced Trees (LCA + Euler Tour)',doc:'/docs/DSA-Training/week-07-advanced-trees',problems:[{id:'w7p1',name:'LCA of Binary Tree',diff:'Medium',lc:'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/',day:1,star:true},{id:'w7p2',name:'LCA of BST',diff:'Medium',lc:'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/',day:1},{id:'w7p3',name:'Kth Ancestor of Tree Node',diff:'Hard',lc:'https://leetcode.com/problems/kth-ancestor-of-a-tree-node/',day:1},{id:'w7p4',name:'Sum of Distances in Tree',diff:'Hard',lc:'https://leetcode.com/problems/sum-of-distances-in-tree/',day:1,star:true},{id:'w7p5',name:'Binary Tree Maximum Path Sum',diff:'Hard',lc:'https://leetcode.com/problems/binary-tree-maximum-path-sum/',day:1,star:true},{id:'w7p6',name:'All Nodes Distance K',diff:'Medium',lc:'https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/',day:1},{id:'w7p7',name:'Distribute Coins in Binary Tree',diff:'Medium',lc:'https://leetcode.com/problems/distribute-coins-in-binary-tree/',day:2},{id:'w7p8',name:'Diameter of Binary Tree',diff:'Easy',lc:'https://leetcode.com/problems/diameter-of-binary-tree/',day:2,star:true},{id:'w7p9',name:'Max Diff Between Node and Ancestor',diff:'Medium',lc:'https://leetcode.com/problems/maximum-difference-between-node-and-ancestor/',day:2},{id:'w7p10',name:'Binary Tree Cameras',diff:'Hard',lc:'https://leetcode.com/problems/binary-tree-cameras/',day:2},{id:'w7p11',name:'Serialize and Deserialize Binary Tree',diff:'Hard',lc:'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',day:2,star:true},{id:'w7p12',name:'Vertical Order Traversal',diff:'Hard',lc:'https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/',day:2},{id:'w7p13',name:'Count Nodes Equal to Sum of Descendants',diff:'Medium',lc:'https://leetcode.com/problems/count-nodes-equal-to-average-of-subtree/',day:2},{id:'w7p14',name:'Nodes With Same Label in Subtree',diff:'Medium',lc:'https://leetcode.com/problems/number-of-nodes-in-the-sub-tree-with-the-same-label/',day:2},{id:'w7p15',name:'Tree Queries',diff:'Hard',lc:'https://leetcode.com/problems/height-of-binary-tree-after-subtree-removal-queries/',day:3},{id:'w7p16',name:'Min Edge Weight Equilibrium Queries',diff:'Hard',lc:'https://leetcode.com/problems/minimum-edge-weight-equilibrium-queries-in-a-tree/',day:3},{id:'w7p17',name:'Closest Node to Path in Tree',diff:'Hard',lc:'https://leetcode.com/problems/closest-node-to-path-in-tree/',day:3},{id:'w7p18',name:'Cycle Length Queries in a Tree',diff:'Hard',lc:'https://leetcode.com/problems/cycle-length-queries-in-a-tree/',day:3},{id:'w7p19',name:'Longest ZigZag Path',diff:'Medium',lc:'https://leetcode.com/problems/longest-zigzag-path-in-a-binary-tree/',day:3},{id:'w7p20',name:'Count Pairs of Nodes',diff:'Hard',lc:'https://leetcode.com/problems/count-pairs-of-nodes/',day:3},{id:'w7p21',name:'Longest Path Different Adjacent Chars',diff:'Hard',lc:'https://leetcode.com/problems/longest-path-with-different-adjacent-characters/',day:3}],mocks:[{id:'w7m1',name:'Mock: Sum of Distances in Tree'},{id:'w7m2',name:'Mock: Binary Tree Maximum Path Sum'}] },
  { num:8,title:'Segment Tree + BIT',doc:'/docs/DSA-Training/week-08-segment-tree-bit',problems:[{id:'w8p1',name:'Range Sum Query Mutable',diff:'Medium',lc:'https://leetcode.com/problems/range-sum-query-mutable/',day:1,star:true},{id:'w8p2',name:'Count of Smaller Numbers After Self',diff:'Hard',lc:'https://leetcode.com/problems/count-of-smaller-numbers-after-self/',day:1,star:true},{id:'w8p3',name:'My Calendar I',diff:'Medium',lc:'https://leetcode.com/problems/my-calendar-i/',day:1},{id:'w8p4',name:'My Calendar III',diff:'Hard',lc:'https://leetcode.com/problems/my-calendar-iii/',day:1},{id:'w8p5',name:'Count of Range Sum',diff:'Hard',lc:'https://leetcode.com/problems/count-of-range-sum/',day:1},{id:'w8p6',name:'Reverse Pairs',diff:'Hard',lc:'https://leetcode.com/problems/reverse-pairs/',day:1,star:true},{id:'w8p7',name:'Create Sorted Array through Instructions',diff:'Hard',lc:'https://leetcode.com/problems/create-sorted-array-through-instructions/',day:2},{id:'w8p8',name:'Longest Increasing Subsequence II',diff:'Hard',lc:'https://leetcode.com/problems/longest-increasing-subsequence-ii/',day:2},{id:'w8p9',name:'Falling Squares',diff:'Hard',lc:'https://leetcode.com/problems/falling-squares/',day:2},{id:'w8p10',name:'Rectangle Area II',diff:'Hard',lc:'https://leetcode.com/problems/rectangle-area-ii/',day:2},{id:'w8p11',name:'Range Module',diff:'Hard',lc:'https://leetcode.com/problems/range-module/',day:2,star:true},{id:'w8p12',name:'Online Majority Element',diff:'Hard',lc:'https://leetcode.com/problems/online-majority-element-in-subarray/',day:2},{id:'w8p13',name:'Booking Concert Tickets',diff:'Hard',lc:'https://leetcode.com/problems/booking-concert-tickets-in-groups/',day:2},{id:'w8p14',name:'Number of Flowers in Full Bloom',diff:'Hard',lc:'https://leetcode.com/problems/number-of-flowers-in-full-bloom/',day:2},{id:'w8p15',name:'Count Good Triplets in Array',diff:'Hard',lc:'https://leetcode.com/problems/count-good-triplets-in-an-array/',day:3},{id:'w8p16',name:'Fancy Sequence',diff:'Hard',lc:'https://leetcode.com/problems/fancy-sequence/',day:3},{id:'w8p17',name:'Min Possible Integer After Swaps',diff:'Hard',lc:'https://leetcode.com/problems/minimum-possible-integer-after-at-most-k-adjacent-swaps-on-digits/',day:3},{id:'w8p18',name:'Range Sum Query 2D Mutable',diff:'Hard',lc:'https://leetcode.com/problems/range-sum-query-2d-mutable/',day:3},{id:'w8p19',name:'Peaks in Array',diff:'Hard',lc:'https://leetcode.com/problems/peaks-in-array/',day:3},{id:'w8p20',name:'Stamping the Grid',diff:'Hard',lc:'https://leetcode.com/problems/stamping-the-grid/',day:3},{id:'w8p21',name:'Min Operations Make Array Continuous',diff:'Hard',lc:'https://leetcode.com/problems/minimum-number-of-operations-to-make-array-continuous/',day:3}],mocks:[{id:'w8m1',name:'Mock: Count Smaller Numbers After Self'},{id:'w8m2',name:'Mock: Range Module'}] },
  { num:9,title:'DP on Subsequences (LIS/LCS/Edit Distance)',doc:'/docs/DSA-Training/week-09-dp-subsequences',problems:[{id:'w9p1',name:'Longest Increasing Subsequence',diff:'Medium',lc:'https://leetcode.com/problems/longest-increasing-subsequence/',day:1,star:true},{id:'w9p2',name:'Longest Common Subsequence',diff:'Medium',lc:'https://leetcode.com/problems/longest-common-subsequence/',day:1,star:true},{id:'w9p3',name:'Edit Distance',diff:'Medium',lc:'https://leetcode.com/problems/edit-distance/',day:1,star:true},{id:'w9p4',name:'Longest Palindromic Subsequence',diff:'Medium',lc:'https://leetcode.com/problems/longest-palindromic-subsequence/',day:1,star:true},{id:'w9p5',name:'Uncrossed Lines',diff:'Medium',lc:'https://leetcode.com/problems/uncrossed-lines/',day:1},{id:'w9p6',name:'Delete Operation for Two Strings',diff:'Medium',lc:'https://leetcode.com/problems/delete-operation-for-two-strings/',day:1},{id:'w9p7',name:'Distinct Subsequences',diff:'Hard',lc:'https://leetcode.com/problems/distinct-subsequences/',day:2,star:true},{id:'w9p8',name:'Interleaving String',diff:'Medium',lc:'https://leetcode.com/problems/interleaving-string/',day:2},{id:'w9p9',name:'Min ASCII Delete Sum',diff:'Medium',lc:'https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/',day:2},{id:'w9p10',name:'Min Insertions to Make Palindrome',diff:'Hard',lc:'https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-palindrome/',day:2},{id:'w9p11',name:'Russian Doll Envelopes',diff:'Hard',lc:'https://leetcode.com/problems/russian-doll-envelopes/',day:2},{id:'w9p12',name:'Number of LIS',diff:'Medium',lc:'https://leetcode.com/problems/number-of-longest-increasing-subsequence/',day:2},{id:'w9p13',name:'Increasing Triplet Subsequence',diff:'Medium',lc:'https://leetcode.com/problems/increasing-triplet-subsequence/',day:2},{id:'w9p14',name:'Max Length of Pair Chain',diff:'Medium',lc:'https://leetcode.com/problems/maximum-length-of-pair-chain/',day:2},{id:'w9p15',name:'Longest String Chain',diff:'Medium',lc:'https://leetcode.com/problems/longest-string-chain/',day:3},{id:'w9p16',name:'Largest Divisible Subset',diff:'Medium',lc:'https://leetcode.com/problems/largest-divisible-subset/',day:3},{id:'w9p17',name:'Longest Valid Obstacle Course',diff:'Hard',lc:'https://leetcode.com/problems/find-the-longest-valid-obstacle-course-at-each-position/',day:3},{id:'w9p18',name:'Shortest Common Supersequence',diff:'Hard',lc:'https://leetcode.com/problems/shortest-common-supersequence/',day:3,star:true},{id:'w9p19',name:'Wildcard Matching',diff:'Hard',lc:'https://leetcode.com/problems/wildcard-matching/',day:3},{id:'w9p20',name:'Regular Expression Matching',diff:'Hard',lc:'https://leetcode.com/problems/regular-expression-matching/',day:3},{id:'w9p21',name:'LIS II (Segment Tree)',diff:'Hard',lc:'https://leetcode.com/problems/longest-increasing-subsequence-ii/',day:3}],mocks:[{id:'w9m1',name:'Mock: Russian Doll Envelopes'},{id:'w9m2',name:'Mock: Edit Distance'}] },
  { num:10,title:'Knapsack DP',doc:'/docs/DSA-Training/week-10-knapsack-dp',problems:[{id:'w10p1',name:'Partition Equal Subset Sum',diff:'Medium',lc:'https://leetcode.com/problems/partition-equal-subset-sum/',day:1,star:true},{id:'w10p2',name:'Target Sum',diff:'Medium',lc:'https://leetcode.com/problems/target-sum/',day:1,star:true},{id:'w10p3',name:'Coin Change',diff:'Medium',lc:'https://leetcode.com/problems/coin-change/',day:1,star:true},{id:'w10p4',name:'Coin Change II',diff:'Medium',lc:'https://leetcode.com/problems/coin-change-ii/',day:1,star:true},{id:'w10p5',name:'Ones and Zeroes',diff:'Medium',lc:'https://leetcode.com/problems/ones-and-zeroes/',day:1},{id:'w10p6',name:'Profitable Schemes',diff:'Hard',lc:'https://leetcode.com/problems/profitable-schemes/',day:1},{id:'w10p7',name:'Last Stone Weight II',diff:'Medium',lc:'https://leetcode.com/problems/last-stone-weight-ii/',day:2},{id:'w10p8',name:'Combination Sum IV',diff:'Medium',lc:'https://leetcode.com/problems/combination-sum-iv/',day:2},{id:'w10p9',name:'Perfect Squares',diff:'Medium',lc:'https://leetcode.com/problems/perfect-squares/',day:2},{id:'w10p10',name:'Integer Break',diff:'Medium',lc:'https://leetcode.com/problems/integer-break/',day:2},{id:'w10p11',name:'Min Cost For Tickets',diff:'Medium',lc:'https://leetcode.com/problems/minimum-cost-for-tickets/',day:2},{id:'w10p12',name:'Number of Dice Rolls',diff:'Medium',lc:'https://leetcode.com/problems/number-of-dice-rolls-with-target-sum/',day:2},{id:'w10p13',name:'Tallest Billboard',diff:'Hard',lc:'https://leetcode.com/problems/tallest-billboard/',day:2},{id:'w10p14',name:'Split Array With Same Average',diff:'Hard',lc:'https://leetcode.com/problems/split-array-with-same-average/',day:2},{id:'w10p15',name:'Max Profit in Job Scheduling',diff:'Hard',lc:'https://leetcode.com/problems/maximum-profit-in-job-scheduling/',day:3,star:true},{id:'w10p16',name:'Reducing Dishes',diff:'Hard',lc:'https://leetcode.com/problems/reducing-dishes/',day:3},{id:'w10p17',name:'Max Value of K Coins From Piles',diff:'Hard',lc:'https://leetcode.com/problems/maximum-value-of-k-coins-from-piles/',day:3},{id:'w10p18',name:'Partition to K Equal Sum Subsets',diff:'Medium',lc:'https://leetcode.com/problems/partition-to-k-equal-sum-subsets/',day:3},{id:'w10p19',name:'Number of Ways to Earn Points',diff:'Hard',lc:'https://leetcode.com/problems/number-of-ways-to-earn-points/',day:3},{id:'w10p20',name:'Max Total Reward Using Operations',diff:'Hard',lc:'https://leetcode.com/problems/maximum-total-reward-using-operations-ii/',day:3},{id:'w10p21',name:'Maximize Total Tastiness',diff:'Medium',lc:'https://leetcode.com/problems/maximize-total-tastiness-of-purchased-fruits/',day:3}],mocks:[{id:'w10m1',name:'Mock: Coin Change'},{id:'w10m2',name:'Mock: Partition Equal Subset Sum'}] },
  { num:11,title:'Bitmask DP',doc:'/docs/DSA-Training/week-11-bitmask-dp',problems:[{id:'w11p1',name:'Smallest Sufficient Team',diff:'Hard',lc:'https://leetcode.com/problems/smallest-sufficient-team/',day:1,star:true},{id:'w11p2',name:'Shortest Path Visiting All Nodes',diff:'Hard',lc:'https://leetcode.com/problems/shortest-path-visiting-all-nodes/',day:1,star:true},{id:'w11p3',name:'Find Shortest Superstring',diff:'Hard',lc:'https://leetcode.com/problems/find-the-shortest-superstring/',day:1},{id:'w11p4',name:'Partition to K Equal Sum Subsets',diff:'Medium',lc:'https://leetcode.com/problems/partition-to-k-equal-sum-subsets/',day:1,star:true},{id:'w11p5',name:'Stickers to Spell Word',diff:'Hard',lc:'https://leetcode.com/problems/stickers-to-spell-word/',day:1},{id:'w11p6',name:'Min Work Sessions',diff:'Medium',lc:'https://leetcode.com/problems/minimum-number-of-work-sessions-to-finish-the-tasks/',day:1,star:true},{id:'w11p7',name:'Minimum Incompatibility',diff:'Hard',lc:'https://leetcode.com/problems/minimum-incompatibility/',day:2},{id:'w11p8',name:'Beautiful Arrangement',diff:'Medium',lc:'https://leetcode.com/problems/beautiful-arrangement/',day:2},{id:'w11p9',name:'Ways to Wear Different Hats',diff:'Hard',lc:'https://leetcode.com/problems/number-of-ways-to-wear-different-hats-to-each-other/',day:2},{id:'w11p10',name:'Distribute Repeating Integers',diff:'Hard',lc:'https://leetcode.com/problems/distribute-repeating-integers/',day:2},{id:'w11p11',name:'Fair Distribution of Cookies',diff:'Medium',lc:'https://leetcode.com/problems/fair-distribution-of-cookies/',day:2},{id:'w11p12',name:'Min Cost Connect Two Groups',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-connect-two-groups-of-points/',day:2},{id:'w11p13',name:'Parallel Courses II',diff:'Hard',lc:'https://leetcode.com/problems/parallel-courses-ii/',day:2},{id:'w11p14',name:'Min XOR Sum of Two Arrays',diff:'Hard',lc:'https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/',day:2},{id:'w11p15',name:'Number of Good Subsets',diff:'Hard',lc:'https://leetcode.com/problems/the-number-of-good-subsets/',day:3},{id:'w11p16',name:'Max AND Sum of Array',diff:'Hard',lc:'https://leetcode.com/problems/maximum-and-sum-of-array/',day:3},{id:'w11p17',name:'Painting Grid Three Colors',diff:'Hard',lc:'https://leetcode.com/problems/painting-a-grid-with-three-different-colors/',day:3},{id:'w11p18',name:'Max Students Taking Exam',diff:'Hard',lc:'https://leetcode.com/problems/maximum-students-taking-exam/',day:3},{id:'w11p19',name:'N×3 Grid Painting',diff:'Hard',lc:'https://leetcode.com/problems/number-of-ways-to-paint-n-3-grid/',day:3},{id:'w11p20',name:'Special Permutations',diff:'Medium',lc:'https://leetcode.com/problems/special-permutations/',day:3},{id:'w11p21',name:'Find Min Time to Finish All Jobs',diff:'Hard',lc:'https://leetcode.com/problems/find-minimum-time-to-finish-all-jobs/',day:3}],mocks:[{id:'w11m1',name:'Mock: Shortest Path Visiting All Nodes'},{id:'w11m2',name:'Mock: Partition to K Equal Sum Subsets'}] },
  { num:12,title:'Tree DP + Interval DP + Digit DP',doc:'/docs/DSA-Training/week-12-tree-interval-digit-dp',problems:[{id:'w12p1',name:'House Robber III',diff:'Medium',lc:'https://leetcode.com/problems/house-robber-iii/',day:1,star:true},{id:'w12p2',name:'Sum of Distances in Tree',diff:'Hard',lc:'https://leetcode.com/problems/sum-of-distances-in-tree/',day:1,star:true},{id:'w12p3',name:'Binary Tree Cameras',diff:'Hard',lc:'https://leetcode.com/problems/binary-tree-cameras/',day:1},{id:'w12p4',name:'Longest ZigZag Path',diff:'Medium',lc:'https://leetcode.com/problems/longest-zigzag-path-in-a-binary-tree/',day:1},{id:'w12p5',name:'Longest Path Different Adjacent',diff:'Hard',lc:'https://leetcode.com/problems/longest-path-with-different-adjacent-characters/',day:1},{id:'w12p6',name:'Burst Balloons',diff:'Hard',lc:'https://leetcode.com/problems/burst-balloons/',day:1,star:true},{id:'w12p7',name:'Min Score Triangulation',diff:'Medium',lc:'https://leetcode.com/problems/minimum-score-triangulation-of-polygon/',day:1},{id:'w12p8',name:'Remove Boxes',diff:'Hard',lc:'https://leetcode.com/problems/remove-boxes/',day:2},{id:'w12p9',name:'Strange Printer',diff:'Hard',lc:'https://leetcode.com/problems/strange-printer/',day:2},{id:'w12p10',name:'Min Cost to Merge Stones',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-merge-stones/',day:2},{id:'w12p11',name:'Unique BSTs',diff:'Medium',lc:'https://leetcode.com/problems/unique-binary-search-trees/',day:2,star:true},{id:'w12p12',name:'Unique BSTs II',diff:'Medium',lc:'https://leetcode.com/problems/unique-binary-search-trees-ii/',day:2},{id:'w12p13',name:'Number of Digit One',diff:'Hard',lc:'https://leetcode.com/problems/number-of-digit-one/',day:2,star:true},{id:'w12p14',name:'Count Numbers Unique Digits',diff:'Medium',lc:'https://leetcode.com/problems/count-numbers-with-unique-digits/',day:2},{id:'w12p15',name:'Numbers At Most N Given Digit Set',diff:'Hard',lc:'https://leetcode.com/problems/numbers-at-most-n-given-digit-set/',day:3},{id:'w12p16',name:'Count Special Integers',diff:'Hard',lc:'https://leetcode.com/problems/count-special-integers/',day:3},{id:'w12p17',name:'Count of Integers',diff:'Hard',lc:'https://leetcode.com/problems/count-of-integers/',day:3},{id:'w12p18',name:'Digit Count in Range',diff:'Hard',lc:'https://leetcode.com/problems/digit-count-in-range/',day:3},{id:'w12p19',name:'Count Possible Root Nodes',diff:'Hard',lc:'https://leetcode.com/problems/count-number-of-possible-root-nodes/',day:3},{id:'w12p20',name:'Min Cost to Cut a Stick',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-cut-a-stick/',day:3},{id:'w12p21',name:'Palindrome Partitioning IV',diff:'Hard',lc:'https://leetcode.com/problems/palindrome-partitioning-iv/',day:3}],mocks:[{id:'w12m1',name:'Mock: Burst Balloons'},{id:'w12m2',name:'Mock: Sum of Distances in Tree'}] },
  { num:13,title:'DP Optimization',doc:'/docs/DSA-Training/week-13-dp-optimization',problems:[{id:'w13p1',name:'Max Profit in Job Scheduling',diff:'Hard',lc:'https://leetcode.com/problems/maximum-profit-in-job-scheduling/',day:1,star:true},{id:'w13p2',name:'Max Events Attended II',diff:'Hard',lc:'https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended-ii/',day:1},{id:'w13p3',name:'Max Earnings From Taxi',diff:'Medium',lc:'https://leetcode.com/problems/maximum-earnings-from-taxi/',day:1},{id:'w13p4',name:'Make Array Strictly Increasing',diff:'Hard',lc:'https://leetcode.com/problems/make-array-strictly-increasing/',day:1},{id:'w13p5',name:'Max Height Stacking Cuboids',diff:'Hard',lc:'https://leetcode.com/problems/maximum-height-by-stacking-cuboids/',day:1},{id:'w13p6',name:'Min Difficulty of Job Schedule',diff:'Hard',lc:'https://leetcode.com/problems/minimum-difficulty-of-a-job-schedule/',day:1, star: true },{id:'w13p7',name:'K Non-Overlapping Segments',diff:'Medium',lc:'https://leetcode.com/problems/number-of-sets-of-k-non-overlapping-line-segments/',day:2},{id:'w13p8',name:'Min Total Space Wasted K Resizing',diff:'Medium',lc:'https://leetcode.com/problems/minimum-total-space-wasted-with-k-resizing-operations/',day:2},{id:'w13p9',name:'Min Total Distance Traveled',diff:'Hard',lc:'https://leetcode.com/problems/minimum-total-distance-traveled/',day:2},{id:'w13p10',name:'Min White Tiles After Carpets',diff:'Hard',lc:'https://leetcode.com/problems/minimum-white-tiles-after-covering-with-carpets/',day:2},{id:'w13p11',name:'Min Time Make Rope Colorful',diff:'Medium',lc:'https://leetcode.com/problems/minimum-time-to-make-rope-colorful/',day:2},{id:'w13p12',name:'Min Cost to Cut a Stick',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-cut-a-stick/',day:2},{id:'w13p13',name:'Partition Array for Max Sum',diff:'Medium',lc:'https://leetcode.com/problems/partition-array-for-maximum-sum/',day:2},{id:'w13p14',name:'Largest Sum of Averages',diff:'Medium',lc:'https://leetcode.com/problems/largest-sum-of-averages/',day:2},{id:'w13p15',name:'Split Array Largest Sum',diff:'Hard',lc:'https://leetcode.com/problems/split-array-largest-sum/',day:3, star: true },{id:'w13p16',name:'Two Non-overlapping Subarrays Target',diff:'Medium',lc:'https://leetcode.com/problems/find-two-non-overlapping-sub-arrays-each-with-target-sum/',day:3},{id:'w13p17',name:'Distinct Roll Sequences',diff:'Hard',lc:'https://leetcode.com/problems/number-of-distinct-roll-sequences/',day:3},{id:'w13p18',name:'Min Cost to Split Array',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-split-an-array/',day:3},{id:'w13p19',name:'Palindrome Partitioning IV',diff:'Hard',lc:'https://leetcode.com/problems/palindrome-partitioning-iv/',day:3},{id:'w13p20',name:'Array K-Increasing',diff:'Hard',lc:'https://leetcode.com/problems/minimum-operations-to-make-the-array-k-increasing/',day:3},{id:'w13p21',name:'Min Operations Array Continuous',diff:'Hard',lc:'https://leetcode.com/problems/minimum-number-of-operations-to-make-array-continuous/',day:3}],mocks:[{id:'w13m1',name:'Mock: Max Profit Job Scheduling'},{id:'w13m2',name:'Mock: Split Array Largest Sum (DP vs BS)'}] },
  { num:14,title:'String Algorithms I (KMP, Z-func, Rolling Hash)',doc:'/docs/DSA-Training/week-14-string-algorithms-1',problems:[{id:'w14p1',name:'Find First Occurrence in String',diff:'Easy',lc:'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/',day:1},{id:'w14p2',name:'Repeated Substring Pattern',diff:'Easy',lc:'https://leetcode.com/problems/repeated-substring-pattern/',day:1},{id:'w14p3',name:'Shortest Palindrome',diff:'Hard',lc:'https://leetcode.com/problems/shortest-palindrome/',day:1, star: true },{id:'w14p4',name:'Repeated String Match',diff:'Medium',lc:'https://leetcode.com/problems/repeated-string-match/',day:1},{id:'w14p5',name:'Longest Happy Prefix',diff:'Hard',lc:'https://leetcode.com/problems/longest-happy-prefix/',day:1, star: true },{id:'w14p6',name:'Repeated DNA Sequences',diff:'Medium',lc:'https://leetcode.com/problems/repeated-dna-sequences/',day:1},{id:'w14p7',name:'Longest Duplicate Substring',diff:'Hard',lc:'https://leetcode.com/problems/longest-duplicate-substring/',day:2, star: true },{id:'w14p8',name:'Distinct Echo Substrings',diff:'Hard',lc:'https://leetcode.com/problems/distinct-echo-substrings/',day:2},{id:'w14p9',name:'Sum of Scores Built Strings',diff:'Hard',lc:'https://leetcode.com/problems/sum-of-scores-of-built-strings/',day:2},{id:'w14p10',name:'Minimum Window Substring',diff:'Hard',lc:'https://leetcode.com/problems/minimum-window-substring/',day:2, star: true },{id:'w14p11',name:'Unique Characters All Substrings',diff:'Hard',lc:'https://leetcode.com/problems/count-unique-characters-of-all-substrings-of-a-given-string/',day:2},{id:'w14p12',name:'Maximum Repeating Substring',diff:'Easy',lc:'https://leetcode.com/problems/maximum-repeating-substring/',day:2},{id:'w14p13',name:'String Matching in Array',diff:'Easy',lc:'https://leetcode.com/problems/string-matching-in-an-array/',day:2},{id:'w14p14',name:'Longest Common Subpath',diff:'Hard',lc:'https://leetcode.com/problems/longest-common-subpath/',day:2},{id:'w14p15',name:'Remove All Occurrences Substring',diff:'Medium',lc:'https://leetcode.com/problems/remove-all-occurrences-of-a-substring/',day:3},{id:'w14p16',name:'Find Beautiful Indices',diff:'Hard',lc:'https://leetcode.com/problems/find-beautiful-indices-in-the-given-array-ii/',day:3},{id:'w14p17',name:'Min Valid Strings to Form Target',diff:'Hard',lc:'https://leetcode.com/problems/minimum-number-of-valid-strings-to-form-target/',day:3},{id:'w14p18',name:'Count Substrings Vowels K Consonants',diff:'Medium',lc:'https://leetcode.com/problems/count-of-substrings-containing-every-vowel-and-k-consonants-ii/',day:3},{id:'w14p19',name:'Rotate String',diff:'Easy',lc:'https://leetcode.com/problems/rotate-string/',day:3},{id:'w14p20',name:'Count Palindromic Subsequences',diff:'Hard',lc:'https://leetcode.com/problems/count-different-palindromic-subsequences/',day:3},{id:'w14p21',name:'Shortest Palindrome (revisit)',diff:'Hard',lc:'https://leetcode.com/problems/shortest-palindrome/',day:3}],mocks:[{id:'w14m1',name:'Mock: Shortest Palindrome (KMP)'},{id:'w14m2',name:'Mock: Longest Duplicate Substring (Hash+BS)'}] },
  { num:15,title:'String Algorithms II (Trie, Suffix Array, Manacher)',doc:'/docs/DSA-Training/week-15-string-algorithms-2',problems:[{id:'w15p1',name:'Implement Trie',diff:'Medium',lc:'https://leetcode.com/problems/implement-trie-prefix-tree/',day:1, star: true },{id:'w15p2',name:'Design Add and Search Words',diff:'Medium',lc:'https://leetcode.com/problems/design-add-and-search-words-data-structure/',day:1},{id:'w15p3',name:'Word Search II',diff:'Hard',lc:'https://leetcode.com/problems/word-search-ii/',day:1, star: true },{id:'w15p4',name:'Max XOR of Two Numbers',diff:'Medium',lc:'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/',day:1},{id:'w15p5',name:'Replace Words',diff:'Medium',lc:'https://leetcode.com/problems/replace-words/',day:1},{id:'w15p6',name:'Map Sum Pairs',diff:'Medium',lc:'https://leetcode.com/problems/map-sum-pairs/',day:1},{id:'w15p7',name:'Longest Palindromic Substring',diff:'Medium',lc:'https://leetcode.com/problems/longest-palindromic-substring/',day:2, star: true },{id:'w15p8',name:'Palindromic Substrings',diff:'Medium',lc:'https://leetcode.com/problems/palindromic-substrings/',day:2},{id:'w15p9',name:'Word Break',diff:'Medium',lc:'https://leetcode.com/problems/word-break/',day:2, star: true },{id:'w15p10',name:'Word Break II',diff:'Hard',lc:'https://leetcode.com/problems/word-break-ii/',day:2},{id:'w15p11',name:'Concatenated Words',diff:'Hard',lc:'https://leetcode.com/problems/concatenated-words/',day:2},{id:'w15p12',name:'Stream of Characters',diff:'Hard',lc:'https://leetcode.com/problems/stream-of-characters/',day:2},{id:'w15p13',name:'Palindrome Pairs',diff:'Hard',lc:'https://leetcode.com/problems/palindrome-pairs/',day:2, star: true },{id:'w15p14',name:'Longest Palindromic Subsequence',diff:'Medium',lc:'https://leetcode.com/problems/longest-palindromic-subsequence/',day:2},{id:'w15p15',name:'Max XOR With Element From Array',diff:'Hard',lc:'https://leetcode.com/problems/maximum-xor-with-an-element-from-array/',day:3},{id:'w15p16',name:'Count Pairs XOR in Range',diff:'Hard',lc:'https://leetcode.com/problems/count-pairs-with-xor-in-a-range/',day:3},{id:'w15p17',name:'Longest Duplicate Substring',diff:'Hard',lc:'https://leetcode.com/problems/longest-duplicate-substring/',day:3},{id:'w15p18',name:'Count Different Palindromic Subseq',diff:'Hard',lc:'https://leetcode.com/problems/count-different-palindromic-subsequences/',day:3},{id:'w15p19',name:'Sum of Prefix Scores',diff:'Hard',lc:'https://leetcode.com/problems/sum-of-prefix-scores-of-strings/',day:3},{id:'w15p20',name:'Count Palindromic Substrings',diff:'Medium',lc:'https://leetcode.com/problems/palindromic-substrings/',day:3},{id:'w15p21',name:'Longest Word in Dictionary',diff:'Medium',lc:'https://leetcode.com/problems/longest-word-in-dictionary/',day:3}],mocks:[{id:'w15m1',name:'Mock: Word Search II (Trie)'},{id:'w15m2',name:'Mock: Palindromic Substrings (Manacher)'}] },
  { num:16,title:'Number Theory + Modular Arithmetic',doc:'/docs/DSA-Training/week-16-number-theory',problems:[{id:'w16p1',name:'Count Primes',diff:'Medium',lc:'https://leetcode.com/problems/count-primes/',day:1, star: true },{id:'w16p2',name:'Power of Two',diff:'Easy',lc:'https://leetcode.com/problems/power-of-two/',day:1},{id:'w16p3',name:'Super Pow',diff:'Medium',lc:'https://leetcode.com/problems/super-pow/',day:1},{id:'w16p4',name:'Ugly Number II',diff:'Medium',lc:'https://leetcode.com/problems/ugly-number-ii/',day:1, star: true },{id:'w16p5',name:'GCD of Strings',diff:'Easy',lc:'https://leetcode.com/problems/greatest-common-divisor-of-strings/',day:1},{id:'w16p6',name:'Count Good Numbers',diff:'Medium',lc:'https://leetcode.com/problems/count-good-numbers/',day:1, star: true },{id:'w16p7',name:'Largest Component Size by Common Factor',diff:'Hard',lc:'https://leetcode.com/problems/largest-component-size-by-common-factor/',day:2, star: true },{id:'w16p8',name:'X of a Kind in Deck',diff:'Easy',lc:'https://leetcode.com/problems/x-of-a-kind-in-a-deck-of-cards/',day:2},{id:'w16p9',name:'Smallest Value After Prime Factors',diff:'Medium',lc:'https://leetcode.com/problems/smallest-value-after-replacing-with-sum-of-prime-factors/',day:2},{id:'w16p10',name:'Distinct Prime Factors of Product',diff:'Medium',lc:'https://leetcode.com/problems/distinct-prime-factors-of-product-of-array/',day:2},{id:'w16p11',name:'2 Keys Keyboard',diff:'Medium',lc:'https://leetcode.com/problems/2-keys-keyboard/',day:2},{id:'w16p12',name:'Factorial Trailing Zeroes',diff:'Medium',lc:'https://leetcode.com/problems/factorial-trailing-zeroes/',day:2},{id:'w16p13',name:'Closest Divisors',diff:'Medium',lc:'https://leetcode.com/problems/closest-divisors/',day:2},{id:'w16p14',name:'Min Lines to Represent Line Chart',diff:'Medium',lc:'https://leetcode.com/problems/minimum-lines-to-represent-a-line-chart/',day:2},{id:'w16p15',name:'Interchangeable Rectangles',diff:'Medium',lc:'https://leetcode.com/problems/number-of-pairs-of-interchangeable-rectangles/',day:3},{id:'w16p16',name:'Mirror Reflection',diff:'Medium',lc:'https://leetcode.com/problems/mirror-reflection/',day:3},{id:'w16p17',name:'Preimage Size Factorial Zeroes',diff:'Hard',lc:'https://leetcode.com/problems/preimage-size-of-factorial-zeroes-function/',day:3},{id:'w16p18',name:'Nth Magical Number',diff:'Hard',lc:'https://leetcode.com/problems/nth-magical-number/',day:3},{id:'w16p19',name:'Count Anagrams',diff:'Hard',lc:'https://leetcode.com/problems/count-anagrams/',day:3},{id:'w16p20',name:'Count Ways Build Good Strings',diff:'Medium',lc:'https://leetcode.com/problems/count-ways-to-build-good-strings/',day:3},{id:'w16p21',name:'Number of Music Playlists',diff:'Hard',lc:'https://leetcode.com/problems/number-of-music-playlists/',day:3}],mocks:[{id:'w16m1',name:'Mock: Count Primes (Sieve)'},{id:'w16m2',name:'Mock: Super Pow (Modular Expo)'}] },
  { num:17,title:'Combinatorics + Probability + PIE',doc:'/docs/DSA-Training/week-17-combinatorics-probability',problems:[{id:'w17p1',name:'Unique Paths',diff:'Medium',lc:'https://leetcode.com/problems/unique-paths/',day:1, star: true },{id:'w17p2',name:'Unique Paths II',diff:'Medium',lc:'https://leetcode.com/problems/unique-paths-ii/',day:1},{id:'w17p3',name:'Different Ways to Add Parentheses',diff:'Medium',lc:'https://leetcode.com/problems/different-ways-to-add-parentheses/',day:1},{id:'w17p4',name:'Unique BSTs (Catalan)',diff:'Medium',lc:'https://leetcode.com/problems/unique-binary-search-trees/',day:1},{id:'w17p5',name:'Permutation Sequence',diff:'Hard',lc:'https://leetcode.com/problems/permutation-sequence/',day:1, star: true },{id:'w17p6',name:'Next Permutation',diff:'Medium',lc:'https://leetcode.com/problems/next-permutation/',day:1, star: true },{id:'w17p7',name:'Count Sorted Vowel Strings',diff:'Medium',lc:'https://leetcode.com/problems/count-sorted-vowel-strings/',day:2},{id:'w17p8',name:'Knight Probability in Chessboard',diff:'Medium',lc:'https://leetcode.com/problems/knight-probability-in-chessboard/',day:2},{id:'w17p9',name:'Soup Servings',diff:'Medium',lc:'https://leetcode.com/problems/soup-servings/',day:2},{id:'w17p10',name:'New 21 Game',diff:'Medium',lc:'https://leetcode.com/problems/new-21-game/',day:2},{id:'w17p11',name:'Count Anagrams',diff:'Hard',lc:'https://leetcode.com/problems/count-anagrams/',day:2},{id:'w17p12',name:'Distinct Subsequences',diff:'Hard',lc:'https://leetcode.com/problems/distinct-subsequences/',day:2},{id:'w17p13',name:'Kth Smallest Instructions',diff:'Hard',lc:'https://leetcode.com/problems/kth-smallest-instructions/',day:2},{id:'w17p14',name:'Count Homogenous Substrings',diff:'Medium',lc:'https://leetcode.com/problems/count-number-of-homogenous-substrings/',day:2},{id:'w17p15',name:'Number of Music Playlists',diff:'Hard',lc:'https://leetcode.com/problems/number-of-music-playlists/',day:3, star: true },{id:'w17p16',name:'Prob Two Boxes Same Distinct Balls',diff:'Hard',lc:'https://leetcode.com/problems/probability-of-a-two-boxes-having-the-same-number-of-distinct-balls/',day:3},{id:'w17p17',name:'Count All Valid Pickup Delivery',diff:'Hard',lc:'https://leetcode.com/problems/count-all-valid-pickup-and-delivery-options/',day:3},{id:'w17p18',name:'Count Vowels Permutation',diff:'Hard',lc:'https://leetcode.com/problems/count-vowels-permutation/',day:3},{id:'w17p19',name:'Ways to Rearrange Sticks',diff:'Hard',lc:'https://leetcode.com/problems/number-of-ways-to-rearrange-sticks-with-k-sticks-visible/',day:3},{id:'w17p20',name:'Painting Grid Three Colors',diff:'Hard',lc:'https://leetcode.com/problems/painting-a-grid-with-three-different-colors/',day:3},{id:'w17p21',name:'Distribute Candies',diff:'Hard',lc:'https://leetcode.com/problems/distribute-candies/',day:3}],mocks:[{id:'w17m1',name:'Mock: Number of Music Playlists (PIE)'},{id:'w17m2',name:'Mock: Knight Probability (DP)'}] },
  { num:18,title:'Matrix Exponentiation + Game Theory',doc:'/docs/DSA-Training/week-18-matrix-expo-game-theory',problems:[{id:'w18p1',name:'Fibonacci Number (Matrix)',diff:'Easy',lc:'https://leetcode.com/problems/fibonacci-number/',day:1},{id:'w18p2',name:'Tribonacci Number (Matrix)',diff:'Easy',lc:'https://leetcode.com/problems/n-th-tribonacci-number/',day:1},{id:'w18p3',name:'Nim Game',diff:'Easy',lc:'https://leetcode.com/problems/nim-game/',day:1},{id:'w18p4',name:'Stone Game',diff:'Medium',lc:'https://leetcode.com/problems/stone-game/',day:1, star: true },{id:'w18p5',name:'Stone Game II',diff:'Medium',lc:'https://leetcode.com/problems/stone-game-ii/',day:1, star: true },{id:'w18p6',name:'Predict the Winner',diff:'Medium',lc:'https://leetcode.com/problems/predict-the-winner/',day:1, star: true },{id:'w18p7',name:'Stone Game III',diff:'Hard',lc:'https://leetcode.com/problems/stone-game-iii/',day:2},{id:'w18p8',name:'Stone Game IV',diff:'Hard',lc:'https://leetcode.com/problems/stone-game-iv/',day:2},{id:'w18p9',name:'Can I Win',diff:'Medium',lc:'https://leetcode.com/problems/can-i-win/',day:2},{id:'w18p10',name:'Flip Game II',diff:'Medium',lc:'https://leetcode.com/problems/flip-game-ii/',day:2},{id:'w18p11',name:'Cat and Mouse',diff:'Hard',lc:'https://leetcode.com/problems/cat-and-mouse/',day:2},{id:'w18p12',name:'Stone Game VII',diff:'Medium',lc:'https://leetcode.com/problems/stone-game-vii/',day:2},{id:'w18p13',name:'Divisor Game',diff:'Easy',lc:'https://leetcode.com/problems/divisor-game/',day:2},{id:'w18p14',name:'Knight Dialer (Matrix Expo)',diff:'Medium',lc:'https://leetcode.com/problems/knight-dialer/',day:2, star: true },{id:'w18p15',name:'Cat and Mouse II',diff:'Hard',lc:'https://leetcode.com/problems/cat-and-mouse-ii/',day:3},{id:'w18p16',name:'Stone Game VIII',diff:'Hard',lc:'https://leetcode.com/problems/stone-game-viii/',day:3},{id:'w18p17',name:'Stone Game IX',diff:'Medium',lc:'https://leetcode.com/problems/stone-game-ix/',day:3},{id:'w18p18',name:'Chalkboard XOR Game',diff:'Hard',lc:'https://leetcode.com/problems/chalkboard-xor-game/',day:3},{id:'w18p19',name:'Race Car',diff:'Hard',lc:'https://leetcode.com/problems/race-car/',day:3},{id:'w18p20',name:'Count Vowels Permutation (Matrix)',diff:'Hard',lc:'https://leetcode.com/problems/count-vowels-permutation/',day:3},{id:'w18p21',name:'Number of Ways to Stay Same Place',diff:'Hard',lc:'https://leetcode.com/problems/number-of-ways-to-stay-in-the-same-place-after-some-steps/',day:3}],mocks:[{id:'w18m1',name:'Mock: Knight Dialer (Matrix Expo)'},{id:'w18m2',name:'Mock: Stone Game II (Minimax)'}] },
  { num:19,title:'Sweep Line + Geometry + Advanced Graph',doc:'/docs/DSA-Training/week-19-sweep-line-geometry-advanced-graph',problems:[{id:'w19p1',name:'Meeting Rooms II',diff:'Medium',lc:'https://leetcode.com/problems/meeting-rooms-ii/',day:1, star: true },{id:'w19p2',name:'The Skyline Problem',diff:'Hard',lc:'https://leetcode.com/problems/the-skyline-problem/',day:1, star: true },{id:'w19p3',name:'Merge Intervals',diff:'Medium',lc:'https://leetcode.com/problems/merge-intervals/',day:1, star: true },{id:'w19p4',name:'Insert Interval',diff:'Medium',lc:'https://leetcode.com/problems/insert-interval/',day:1},{id:'w19p5',name:'Non-overlapping Intervals',diff:'Medium',lc:'https://leetcode.com/problems/non-overlapping-intervals/',day:1, star: true },{id:'w19p6',name:'My Calendar II',diff:'Medium',lc:'https://leetcode.com/problems/my-calendar-ii/',day:1},{id:'w19p7',name:'Rectangle Area II',diff:'Hard',lc:'https://leetcode.com/problems/rectangle-area-ii/',day:2},{id:'w19p8',name:'Erect the Fence (Convex Hull)',diff:'Hard',lc:'https://leetcode.com/problems/erect-the-fence/',day:2},{id:'w19p9',name:'Max Points on a Line',diff:'Hard',lc:'https://leetcode.com/problems/max-points-on-a-line/',day:2},{id:'w19p10',name:'Critical Connections (Bridges)',diff:'Hard',lc:'https://leetcode.com/problems/critical-connections-in-a-network/',day:2, star: true },{id:'w19p11',name:'Min Vertices Reach All Nodes',diff:'Medium',lc:'https://leetcode.com/problems/minimum-number-of-vertices-to-reach-all-nodes/',day:2},{id:'w19p12',name:'Smallest Rotation Highest Score',diff:'Hard',lc:'https://leetcode.com/problems/smallest-rotation-with-highest-score/',day:2},{id:'w19p13',name:'Interval List Intersections',diff:'Medium',lc:'https://leetcode.com/problems/interval-list-intersections/',day:2},{id:'w19p14',name:'Max Events That Can Be Attended',diff:'Medium',lc:'https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/',day:2},{id:'w19p15',name:'Amount of New Area Painted',diff:'Hard',lc:'https://leetcode.com/problems/amount-of-new-area-painted-each-day/',day:3},{id:'w19p16',name:'Edge Length Limited Paths II',diff:'Hard',lc:'https://leetcode.com/problems/checking-existence-of-edge-length-limited-paths-ii/',day:3},{id:'w19p17',name:'Parallel Courses III',diff:'Hard',lc:'https://leetcode.com/problems/parallel-courses-iii/',day:3},{id:'w19p18',name:'Count All Possible Routes',diff:'Hard',lc:'https://leetcode.com/problems/count-all-possible-routes/',day:3},{id:'w19p19',name:'Min Cost Valid Path in Grid',diff:'Hard',lc:'https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/',day:3},{id:'w19p20',name:'Number of Flowers in Full Bloom',diff:'Hard',lc:'https://leetcode.com/problems/number-of-flowers-in-full-bloom/',day:3},{id:'w19p21',name:'Describe the Painting',diff:'Medium',lc:'https://leetcode.com/problems/describe-the-painting/',day:3}],mocks:[{id:'w19m1',name:'Mock: The Skyline Problem'},{id:'w19m2',name:'Mock: Critical Connections (Tarjan)'}] },
  { num:20,title:'Final Review + Mock Interviews',doc:'/docs/DSA-Training/week-20-final-review',problems:[{id:'w20p1',name:'Trapping Rain Water II',diff:'Hard',lc:'https://leetcode.com/problems/trapping-rain-water-ii/',day:1, star: true },{id:'w20p2',name:'Longest Increasing Path in Matrix',diff:'Hard',lc:'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/',day:1, star: true },{id:'w20p3',name:'Shortest Path Get All Keys',diff:'Hard',lc:'https://leetcode.com/problems/shortest-path-to-get-all-keys/',day:1},{id:'w20p4',name:'Strange Printer',diff:'Hard',lc:'https://leetcode.com/problems/strange-printer/',day:1},{id:'w20p5',name:'Frog Jump',diff:'Hard',lc:'https://leetcode.com/problems/frog-jump/',day:1},{id:'w20p6',name:'Burst Balloons',diff:'Hard',lc:'https://leetcode.com/problems/burst-balloons/',day:1, star: true },{id:'w20p7',name:'Maximum Frequency Stack',diff:'Hard',lc:'https://leetcode.com/problems/maximum-frequency-stack/',day:2},{id:'w20p8',name:'Smallest Sufficient Team',diff:'Hard',lc:'https://leetcode.com/problems/smallest-sufficient-team/',day:2},{id:'w20p9',name:'Cherry Pickup II',diff:'Hard',lc:'https://leetcode.com/problems/cherry-pickup-ii/',day:2},{id:'w20p10',name:'Median of Two Sorted Arrays',diff:'Hard',lc:'https://leetcode.com/problems/median-of-two-sorted-arrays/',day:2, star: true },{id:'w20p11',name:'Word Ladder II',diff:'Hard',lc:'https://leetcode.com/problems/word-ladder-ii/',day:2},{id:'w20p12',name:'Max Profit Job Scheduling',diff:'Hard',lc:'https://leetcode.com/problems/maximum-profit-in-job-scheduling/',day:2, star: true },{id:'w20p13',name:'Count Smaller Numbers After Self',diff:'Hard',lc:'https://leetcode.com/problems/count-of-smaller-numbers-after-self/',day:2},{id:'w20p14',name:'Min Window Subsequence',diff:'Hard',lc:'https://leetcode.com/problems/minimum-window-subsequence/',day:2},{id:'w20p15',name:'Palindrome Pairs',diff:'Hard',lc:'https://leetcode.com/problems/palindrome-pairs/',day:3},{id:'w20p16',name:'Number of Music Playlists',diff:'Hard',lc:'https://leetcode.com/problems/number-of-music-playlists/',day:3},{id:'w20p17',name:'Sum of Distances in Tree',diff:'Hard',lc:'https://leetcode.com/problems/sum-of-distances-in-tree/',day:3},{id:'w20p18',name:'Critical Connections',diff:'Hard',lc:'https://leetcode.com/problems/critical-connections-in-a-network/',day:3},{id:'w20p19',name:'Split Array Largest Sum',diff:'Hard',lc:'https://leetcode.com/problems/split-array-largest-sum/',day:3, star: true },{id:'w20p20',name:'Russian Doll Envelopes',diff:'Hard',lc:'https://leetcode.com/problems/russian-doll-envelopes/',day:3},{id:'w20p21',name:'Cat and Mouse',diff:'Hard',lc:'https://leetcode.com/problems/cat-and-mouse/',day:3}],mocks:[{id:'w20m1',name:'Final Mock 1: Graph + DP'},{id:'w20m2',name:'Final Mock 2: String + Math'},{id:'w20m3',name:'Final Mock 3: Data Structures + BS'},{id:'w20m4',name:'Final Mock 4: Hard Mixed'}] },
];

const DAY_LABELS = { 1: 'Day 1-2: Foundation', 2: 'Day 3-4: Intermediate', 3: 'Day 5-7: Advanced' };

function loadProgress(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch { return {}; }
}

function saveProgress(key, p) {
  localStorage.setItem(key, JSON.stringify(p));
}

function ProgressRing({ pct }) {
  const r = 56, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className={styles.ringWrap}>
      <svg className={styles.ringSvg} viewBox="0 0 140 140">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle className={styles.ringBg} cx="70" cy="70" r={r} />
        <circle className={styles.ringFg} cx="70" cy="70" r={r}
          strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className={styles.ringLabel}>
        <span className={styles.ringPct}>{pct}%</span>
        <span className={styles.ringText}>Complete</span>
      </div>
    </div>
  );
}

function getStartDate(startKey) {
  try {
    const stored = localStorage.getItem(startKey);
    if (stored) return new Date(stored);
  } catch {}
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  localStorage.setItem(startKey, start.toISOString());
  return start;
}

function computeCountdown(startDate, totalWeeks) {
  const totalDays = totalWeeks * 7;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays);

  const elapsed = Math.max(0, today - startDate);
  const daysPassed = Math.floor(elapsed / 86400000);
  const currentWeek = Math.min(Math.floor(daysPassed / 7) + 1, totalWeeks);
  const daysLeft = Math.max(0, Math.floor((endDate - now) / 86400000));

  const totalMs = endDate - startDate;
  const elapsedMs = Math.min(now - startDate, totalMs);
  const timelinePct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  const hours = Math.floor((daysLeft > 0 ? (endDate - now) % 86400000 : 0) / 3600000);
  const minutes = Math.floor(((endDate - now) % 3600000) / 60000);
  const seconds = Math.floor(((endDate - now) % 60000) / 1000);

  return {
    daysPassed, daysLeft, currentWeek, timelinePct, totalDays,
    endDate, hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    finished: daysLeft <= 0,
    totalWeeks,
  };
}

function Countdown({ startDate, onReset, totalWeeks }) {
  const [cd, setCd] = useState(() => computeCountdown(startDate, totalWeeks));

  useEffect(() => {
    const id = setInterval(() => setCd(computeCountdown(startDate, totalWeeks)), 1000);
    return () => clearInterval(id);
  }, [startDate, totalWeeks]);

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.countdown}>
      <div className={styles.cdHeader}>
        <span className={styles.cdIcon}>{cd.finished ? '🏁' : '⏱'}</span>
        <span className={styles.cdTitle}>{cd.finished ? 'Roadmap Complete!' : 'Time Remaining'}</span>
      </div>

      <div className={styles.cdTimerRow}>
        <div className={styles.cdUnit}>
          <span className={styles.cdValue}>{cd.daysLeft}</span>
          <span className={styles.cdLabel}>Days</span>
        </div>
        <span className={styles.cdSep}>:</span>
        <div className={styles.cdUnit}>
          <span className={styles.cdValue}>{pad(cd.hours)}</span>
          <span className={styles.cdLabel}>Hrs</span>
        </div>
        <span className={styles.cdSep}>:</span>
        <div className={styles.cdUnit}>
          <span className={styles.cdValue}>{pad(cd.minutes)}</span>
          <span className={styles.cdLabel}>Min</span>
        </div>
        <span className={styles.cdSep}>:</span>
        <div className={styles.cdUnit}>
          <span className={styles.cdValue}>{pad(cd.seconds)}</span>
          <span className={styles.cdLabel}>Sec</span>
        </div>
      </div>

      <div className={styles.cdTimeline}>
        <div className={styles.cdTimelineTrack}>
          <div className={styles.cdTimelineFill} style={{ width: `${cd.timelinePct}%` }} />
          <div className={styles.cdTimelineMarker} style={{ left: `${cd.timelinePct}%` }} />
        </div>
        <div className={styles.cdTimelineLabels}>
          <span>W1</span>
          <span>W{Math.round(cd.totalWeeks * 0.25)}</span>
          <span>W{Math.round(cd.totalWeeks * 0.5)}</span>
          <span>W{Math.round(cd.totalWeeks * 0.75)}</span>
          <span>W{cd.totalWeeks}</span>
        </div>
      </div>

      <div className={styles.cdMeta}>
        <div className={styles.cdMetaItem}>
          <span className={styles.cdMetaLabel}>Started</span>
          <span className={styles.cdMetaValue}>{fmtDate(startDate)}</span>
        </div>
        <div className={styles.cdMetaItem}>
          <span className={styles.cdMetaLabel}>Current Week</span>
          <span className={styles.cdMetaValue} style={{ color: '#00f0ff' }}>Week {cd.currentWeek}</span>
        </div>
        <div className={styles.cdMetaItem}>
          <span className={styles.cdMetaLabel}>Finish By</span>
          <span className={styles.cdMetaValue}>{fmtDate(cd.endDate)}</span>
        </div>
        <div className={styles.cdMetaItem}>
          <span className={styles.cdMetaLabel}>Day</span>
          <span className={styles.cdMetaValue}>{Math.min(cd.daysPassed + 1, cd.totalDays)} / {cd.totalDays}</span>
        </div>
      </div>

      <button className={styles.cdResetBtn} onClick={onReset} title="Reset start date to today">
        ↻ Restart Timer
      </button>
    </div>
  );
}

export default function DSARoadmap() {
  const [track, setTrack] = useState('foundations');
  const [progressMap, setProgressMap] = useState({});
  const [openPhases, setOpenPhases] = useState({});
  const [openWeeks, setOpenWeeks] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDateMap, setStartDateMap] = useState({});

  const cfg = TRACK_CONFIG[track];
  const activePhases = track === 'foundations' ? FOUNDATIONS_PHASES : PHASES;
  const activeWeeks = track === 'foundations' ? FOUNDATIONS_WEEKS : WEEKS;
  const progress = progressMap[track] || {};
  const startDate = startDateMap[track] || null;

  useEffect(() => {
    const fProgress = loadProgress(TRACK_CONFIG.foundations.storageKey);
    const iProgress = loadProgress(TRACK_CONFIG.intensive.storageKey);
    setProgressMap({ foundations: fProgress, intensive: iProgress });

    const fStart = getStartDate(TRACK_CONFIG.foundations.startKey);
    const iStart = getStartDate(TRACK_CONFIG.intensive.startKey);
    setStartDateMap({ foundations: fStart, intensive: iStart });

    setOpenPhases({ [activePhases[0]?.id]: true });
  }, []);

  useEffect(() => {
    setOpenPhases({ [(track === 'foundations' ? FOUNDATIONS_PHASES : PHASES)[0]?.id]: true });
    setOpenWeeks({});
    setFilter('all');
    setSearch('');
  }, [track]);

  const resetStartDate = useCallback(() => {
    if (window.confirm('Reset the countdown timer? This sets day 1 to today.')) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      localStorage.setItem(cfg.startKey, today.toISOString());
      setStartDateMap(prev => ({ ...prev, [track]: today }));
    }
  }, [track, cfg.startKey]);

  const toggle = useCallback((id) => {
    setProgressMap(prev => {
      const current = prev[track] || {};
      const next = { ...current, [id]: !current[id] };
      saveProgress(cfg.storageKey, next);
      return { ...prev, [track]: next };
    });
  }, [track, cfg.storageKey]);

  const totalProblems = useMemo(() => activeWeeks.reduce((s, w) => s + w.problems.length, 0), [activeWeeks]);
  const totalMocks = useMemo(() => activeWeeks.reduce((s, w) => s + w.mocks.length, 0), [activeWeeks]);
  const solvedProblems = useMemo(() => activeWeeks.reduce((s, w) => s + w.problems.filter(p => progress[p.id]).length, 0), [activeWeeks, progress]);
  const solvedMocks = useMemo(() => activeWeeks.reduce((s, w) => s + w.mocks.filter(m => progress[m.id]).length, 0), [activeWeeks, progress]);
  const pct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;

  const weekSolved = useCallback((wn) => {
    const w = activeWeeks.find(x => x.num === wn);
    return w ? w.problems.filter(p => progress[p.id]).length : 0;
  }, [activeWeeks, progress]);

  const weekTotal = useCallback((wn) => {
    const w = activeWeeks.find(x => x.num === wn);
    return w ? w.problems.length : 0;
  }, [activeWeeks]);

  const phasePct = useCallback((phase) => {
    const t = phase.weeks.reduce((s, wn) => s + weekTotal(wn), 0);
    const d = phase.weeks.reduce((s, wn) => s + weekSolved(wn), 0);
    return t > 0 ? Math.round((d / t) * 100) : 0;
  }, [weekSolved, weekTotal]);

  const filterProblem = useCallback((p) => {
    if (filter === 'done' && !progress[p.id]) return false;
    if (filter === 'todo' && progress[p.id]) return false;
    if (filter === 'medium' && p.diff !== 'Medium') return false;
    if (filter === 'hard' && p.diff !== 'Hard') return false;
    if (filter === 'star' && !p.star) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }, [filter, search, progress]);

  const resetAll = () => {
    if (window.confirm(`Reset all ${cfg.label} progress? This cannot be undone.`)) {
      localStorage.removeItem(cfg.storageKey);
      setProgressMap(prev => ({ ...prev, [track]: {} }));
    }
  };

  return (
    <Layout title="DSA Roadmap" description="DSA training tracker — Foundations & Intensive tracks">
      <div className={styles.root}>
        <header className={styles.hero}>
          <div className={styles.tabBar}>
            {Object.entries(TRACK_CONFIG).map(([key, t]) => (
              <button key={key}
                className={`${styles.tabBtn} ${track === key ? styles.tabBtnActive : ''}`}
                onClick={() => setTrack(key)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className={styles.heroTag}>{cfg.tagline}</p>
          <h1 className={styles.heroTitle}>
            DSA <span className={styles.neonGradient}>{cfg.title}</span> Roadmap
          </h1>
          <p className={styles.heroSub}>{cfg.subtitle}</p>
        </header>

        {startDate && (
          <Countdown startDate={startDate} onReset={resetStartDate} totalWeeks={cfg.totalWeeks} />
        )}

        <section className={styles.dashboard}>
          <ProgressRing pct={pct} />
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{solvedProblems}</span>
              <span className={styles.statLabel}>Problems Solved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalProblems - solvedProblems}</span>
              <span className={styles.statLabel}>Remaining</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{solvedMocks}/{totalMocks}</span>
              <span className={styles.statLabel}>Mocks Done</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{
                activeWeeks.filter(w => weekSolved(w.num) === weekTotal(w.num) && weekTotal(w.num) > 0).length
              }/{cfg.totalWeeks}</span>
              <span className={styles.statLabel}>Weeks Complete</span>
            </div>
          </div>
        </section>

        <div className={styles.filterBar}>
          {[['all','All'],['todo','To Do'],['done','Done'],['star','⭐ Must-Do'],['medium','Medium'],['hard','Hard']].map(([k,l]) => (
            <button key={k} className={`${styles.filterBtn} ${filter === k ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(k)}>{l}</button>
          ))}
          <input className={styles.searchInput} placeholder="Search problems..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {activePhases.map(phase => (
          <div key={phase.id} className={styles.phase}>
            <div className={styles.phaseHeader}
              onClick={() => setOpenPhases(p => ({ ...p, [phase.id]: !p[phase.id] }))}>
              <div className={styles.phaseColor} style={{ background: phase.color }} />
              <span className={styles.phaseTitle}>{phase.title}</span>
              <span className={styles.phaseProgress}>{phasePct(phase)}%</span>
              <span className={`${styles.phaseChevron} ${openPhases[phase.id] ? styles.phaseChevronOpen : ''}`}>&#9654;</span>
            </div>
            {openPhases[phase.id] && (
              <div className={styles.phaseWeeks}>
                {phase.weeks.map(wn => {
                  const week = activeWeeks.find(w => w.num === wn);
                  if (!week) return null;
                  const ws = weekSolved(wn), wt = weekTotal(wn);
                  const isOpen = openWeeks[wn];
                  const days = [1, 2, 3];
                  return (
                    <div key={wn} className={styles.weekCard}>
                      <div className={styles.weekHeader}
                        onClick={() => setOpenWeeks(p => ({ ...p, [wn]: !p[wn] }))}>
                        <span className={styles.weekNum}>W{wn}</span>
                        <span className={styles.weekTitle}>{week.title}</span>
                        <div className={styles.weekProgressWrap}>
                          <div className={styles.weekProgressBar}>
                            <div className={styles.weekProgressFill} style={{ width: `${wt > 0 ? (ws / wt) * 100 : 0}%` }} />
                          </div>
                          <div className={styles.weekCount}>{ws}/{wt}</div>
                        </div>
                        <span className={`${styles.weekChevron} ${isOpen ? styles.weekChevronOpen : ''}`}>&#9654;</span>
                      </div>
                      {isOpen && (
                        <div className={styles.weekContent}>
                          <Link className={styles.theoryLink} to={week.doc}>
                            📖 Study Theory & Concepts
                          </Link>
                          {days.map(d => {
                            const dayProblems = week.problems.filter(p => p.day === d && filterProblem(p));
                            if (dayProblems.length === 0) return null;
                            return (
                              <div key={d} className={styles.dayGroup}>
                                <div className={styles.dayLabel}>{DAY_LABELS[d]}</div>
                                {dayProblems.map(p => (
                                  <div key={p.id} className={`${styles.problemRow} ${p.star ? styles.problemRowStar : ''}`}>
                                    <input type="checkbox" className={styles.checkbox}
                                      checked={!!progress[p.id]}
                                      onChange={() => toggle(p.id)} />
                                    {p.star && <span className={styles.starBadge} title="Must-Do">⭐</span>}
                                    <span className={`${styles.problemName} ${progress[p.id] ? styles.problemNameDone : ''}`}>
                                      {p.name}
                                    </span>
                                    <span className={`${styles.diffBadge} ${p.diff === 'Hard' ? styles.diffHard : p.diff === 'Medium' ? styles.diffMedium : styles.diffEasy}`}>
                                      {p.diff}
                                    </span>
                                    <a href={p.lc} target="_blank" rel="noopener noreferrer" className={styles.lcLink}>
                                      LC ↗
                                    </a>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          <div className={styles.mockSection}>
                            <div className={styles.mockTitle}>🎤 Mock Interview</div>
                            {week.mocks.map(m => (
                              <div key={m.id} className={styles.mockItem}>
                                <input type="checkbox" className={styles.checkbox}
                                  checked={!!progress[m.id]}
                                  onChange={() => toggle(m.id)} />
                                <span className={`${styles.mockName} ${progress[m.id] ? styles.mockNameDone : ''}`}>
                                  {m.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className={styles.actions}>
          <button className={styles.resetBtn} onClick={resetAll}>
            Reset All {cfg.label} Progress
          </button>
        </div>
      </div>
    </Layout>
  );
}
