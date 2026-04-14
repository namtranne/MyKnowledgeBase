# Cracking the Coding Interview — 6th Edition

**Gayle Laakmann McDowell (2015)**

189 programming questions and solutions — the definitive guide to landing a software engineering job at top tech companies. Covers interview strategy, data structures, algorithms, system design, and knowledge-based topics.

---

## Reading Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CRACKING THE CODING INTERVIEW                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Part 1: Interview Strategy (Chapters I–VIII)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Process  │→│ Behind   │→│ Special  │→│ Before   │→│Behavioral│     │
│  │   (I)    │ │Scenes(II)│ │Sit.(III) │ │  (IV)    │ │  (V)     │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│       │                                                    │            │
│       ▼                                                    ▼            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                               │
│  │  Big O   │→│Technical │→│Offer &   │                               │
│  │  (VI)    │ │  (VII)   │ │Beyond(VIII)                              │
│  └──────────┘ └──────────┘ └──────────┘                               │
│                                                                         │
│  Part 2: Data Structures (Chapters 1–4)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ Arrays & │→│  Linked  │→│ Stacks & │→│ Trees &  │                  │
│  │ Strings  │ │  Lists   │ │  Queues  │ │  Graphs  │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│  Part 3: Concepts & Algorithms (Chapters 5–10)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │   Bit    │→│ Math &   │→│   OOP    │→│Recursion │                  │
│  │  Manip.  │ │ Puzzles  │ │  Design  │ │  & DP    │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐ ┌──────────┐                                             │
│  │  System  │→│ Sorting  │                                             │
│  │  Design  │ │& Search  │                                             │
│  └──────────┘ └──────────┘                                             │
│                                                                         │
│  Part 4: Knowledge Based (Chapters 11–15)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Testing  │ │  C/C++   │ │   Java   │ │Databases │ │ Threads  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ & Locks  │    │
│                                                       └──────────┘    │
│                                                                         │
│  Part 5: Additional Problems (Chapters 16–17)                          │
│  ┌──────────┐ ┌──────────┐                                             │
│  │ Moderate │ │   Hard   │                                             │
│  └──────────┘ └──────────┘                                             │
│                                                                         │
│  Part 6: Advanced Topics (Chapter XI)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Useful Math · Topological Sort · Dijkstra · AVL/Red-Black Trees│   │
│  │ Hash Table Collision · Rabin-Karp · MapReduce                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Book Structure

### Part 1 — Interview Strategy

| # | Chapter | Focus |
|---|---------|-------|
| I | [The Interview Process](./01-the-interview-process.md) | What interviewers evaluate, why algorithmic interviews exist, how questions are selected |
| II | [Behind the Scenes](./02-behind-the-scenes.md) | How Microsoft, Amazon, Google, Apple, Facebook, and Palantir run their interviews |
| III | [Special Situations](./03-special-situations.md) | Experienced candidates, testers/SDETs, PMs, managers, startups, acquisitions |
| IV | [Before the Interview](./04-before-the-interview.md) | Building experience, writing resumes, preparation timeline |
| V | [Behavioral Questions](./05-behavioral-questions.md) | Interview prep grid, responding to behavioral questions, the "tell me about yourself" question |
| VI | [Big O](./06-big-o.md) | Time/space complexity, drop constants, amortized time, recursive runtimes |
| VII | [Technical Questions](./07-technical-questions.md) | How to prepare, walking through problems, 5 optimization techniques, BCR |
| VIII | [The Offer and Beyond](./08-the-offer-and-beyond.md) | Handling offers, evaluating compensation, negotiation, on-the-job growth |

### Part 2 — Data Structures

| # | Chapter | Key Topics |
|---|---------|------------|
| 1 | [Arrays and Strings](./09-arrays-and-strings.md) | Hash tables, ArrayList, StringBuilder, common patterns |
| 2 | [Linked Lists](./10-linked-lists.md) | Creating, deleting, runner technique, recursive problems |
| 3 | [Stacks and Queues](./11-stacks-and-queues.md) | Implementing stacks/queues, use cases, classic problems |
| 4 | [Trees and Graphs](./12-trees-and-graphs.md) | Binary trees, BSTs, heaps, tries, graph search (BFS/DFS) |

### Part 3 — Concepts and Algorithms

| # | Chapter | Key Topics |
|---|---------|------------|
| 5 | [Bit Manipulation](./13-bit-manipulation.md) | Bit facts, two's complement, get/set/clear bits |
| 6 | [Math and Logic Puzzles](./14-math-and-logic-puzzles.md) | Primes, probability, developing rules, worst case shifting |
| 7 | [Object-Oriented Design](./15-object-oriented-design.md) | Approach, design patterns, class diagrams |
| 8 | [Recursion and Dynamic Programming](./16-recursion-and-dynamic-programming.md) | Top-down vs bottom-up, memoization, classic DP problems |
| 9 | [System Design and Scalability](./17-system-design-and-scalability.md) | Handling questions, step-by-step design, key concepts |
| 10 | [Sorting and Searching](./18-sorting-and-searching.md) | Merge sort, quick sort, radix sort, binary search |

### Part 4 — Knowledge Based

| # | Chapter | Key Topics |
|---|---------|------------|
| 11 | [Testing](./19-testing.md) | Testing real-world objects, software, functions, troubleshooting |
| 12 | [C and C++](./20-c-and-cpp.md) | Classes, virtual functions, pointers, templates |
| 13 | [Java](./21-java.md) | Overloading vs overriding, collections framework, generics |
| 14 | [Databases](./22-databases.md) | SQL syntax, normalization, small/large DB design |
| 15 | [Threads and Locks](./23-threads-and-locks.md) | Threads in Java, synchronization, deadlocks |

### Part 5 — Additional Review Problems

| # | Chapter | Description |
|---|---------|-------------|
| 16 | [Moderate](./24-moderate-problems.md) | Medium-difficulty problems spanning multiple topics |
| 17 | [Hard](./25-hard-problems.md) | Challenging problems requiring advanced techniques |

### Part 6 — Advanced Topics

| Topic | Description |
|-------|-------------|
| [Useful Math](./26-advanced-topics.md#useful-math) | Sums, log rules, permutations, proofs by induction |
| [Topological Sort](./26-advanced-topics.md#topological-sort) | DAG ordering algorithm |
| [Dijkstra's Algorithm](./26-advanced-topics.md#dijkstras-algorithm) | Shortest path in weighted graphs |
| [AVL Trees](./26-advanced-topics.md#avl-trees) | Self-balancing BST with rotations |
| [Red-Black Trees](./26-advanced-topics.md#red-black-trees) | Self-balancing BST with color invariants |
| [Hash Table Collision Resolution](./26-advanced-topics.md#hash-table-collision-resolution) | Chaining vs open addressing |
| [Rabin-Karp Substring Search](./26-advanced-topics.md#rabin-karp-substring-search) | Rolling hash for pattern matching |
| [MapReduce](./26-advanced-topics.md#mapreduce) | Distributed data processing paradigm |

---

## How to Use This Guide

> **If you have < 4 weeks**: Focus on Parts 1–3. Master Big O, data structures, and the top optimization techniques. Practice 2–3 problems per chapter.

> **If you have 1–3 months**: Work through Parts 1–4 systematically. Build a problem-solving repertoire of 50–100 questions. Do weekly mock interviews.

> **If you have 3+ months**: Cover everything. Implement data structures from scratch. Work through Advanced Topics. Aim for 150+ problems solved.

### Priority Order for Interview Prep

```
1. Big O (Chapter VI)               ← Foundation for everything
2. Arrays & Strings (Chapter 1)     ← Most common interview topic
3. Trees & Graphs (Chapter 4)       ← Second most common
4. Recursion & DP (Chapter 8)       ← High difficulty, high reward
5. Sorting & Searching (Chapter 10) ← Frequently tested
6. System Design (Chapter 9)        ← Critical for senior roles
7. Linked Lists (Chapter 2)         ← Classic interview staple
8. Stacks & Queues (Chapter 3)      ← Often combined with other topics
9. Bit Manipulation (Chapter 5)     ← Less common but high signal
10. OOD (Chapter 7)                 ← Common at Amazon, Microsoft
```

---

## Key Principles from the Book

1. **Interviews are learnable** — They test a specific skill that improves with deliberate practice
2. **False negatives are acceptable** — Companies would rather miss good people than hire bad ones
3. **It's all relative** — You're compared to other candidates on the same question, not graded on an absolute scale
4. **Talk through your thinking** — Communication matters as much as the solution
5. **Practice on paper/whiteboard** — Don't rely on an IDE; interviewers watch your raw problem-solving
