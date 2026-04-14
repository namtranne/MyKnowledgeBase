# Chapter 10 — Sorting and Searching

> Sorting and searching are the bread and butter of algorithm design. Understanding the characteristics, trade-offs, and implementations of each algorithm lets you make informed choices in interviews — and knowing when to use which algorithm is often more impressive than the implementation itself.

---

## Comparison-Based Sorting

### Bubble Sort

Repeatedly swap adjacent elements if they are in the wrong order. The largest unsorted element "bubbles" to the end each pass.

```java
void bubbleSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n - 1; i++) {
        boolean swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
                swapped = true;
            }
        }
        if (!swapped) break;  // already sorted
    }
}
```

```
Pass 1: [5, 3, 8, 1, 2]
         3  5  8  1  2   (swap 5,3)
         3  5  8  1  2   (8>5 ok)
         3  5  1  8  2   (swap 8,1)
         3  5  1  2  8   (swap 8,2)  ← 8 in place

Pass 2: [3, 5, 1, 2, 8]
         3  5  1  2  8
         3  1  5  2  8   (swap 5,1)
         3  1  2  5  8   (swap 5,2)  ← 5 in place

Pass 3: [3, 1, 2, 5, 8]
         1  3  2  5  8   (swap 3,1)
         1  2  3  5  8   (swap 3,2)  ← 3 in place

Done!
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N) | O(N²) | O(N²) | O(1) | Yes | Yes |

> Rarely used in practice. Only advantage: O(N) on already-sorted input (with the `swapped` optimization).

---

### Selection Sort

Find the minimum element in the unsorted portion and swap it with the first unsorted position.

```java
void selectionSort(int[] arr) {
    for (int i = 0; i < arr.length - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < arr.length; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        int temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
    }
}
```

```
[5, 3, 8, 1, 2]
 Find min(1) → swap with 5: [1, 3, 8, 5, 2]
 Find min(2) → swap with 3: [1, 2, 8, 5, 3]
 Find min(3) → swap with 8: [1, 2, 3, 5, 8]
 Find min(5) → already ok:  [1, 2, 3, 5, 8]
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N²) | O(N²) | O(N²) | O(1) | No | Yes |

> Advantage: minimizes the number of swaps (exactly N-1). Useful when write operations are expensive.

---

### Insertion Sort

Build the sorted array one element at a time by inserting each element into its correct position in the already-sorted portion.

```java
void insertionSort(int[] arr) {
    for (int i = 1; i < arr.length; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}
```

```
[5, 3, 8, 1, 2]
 i=1: key=3, shift 5 right → [3, 5, 8, 1, 2]
 i=2: key=8, no shifts      → [3, 5, 8, 1, 2]
 i=3: key=1, shift 8,5,3    → [1, 3, 5, 8, 2]
 i=4: key=2, shift 8,5,3    → [1, 2, 3, 5, 8]
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N) | O(N²) | O(N²) | O(1) | Yes | Yes |

> Insertion sort is excellent for small arrays (N < 20) and nearly-sorted data. Used as the base case in Timsort and Introsort.

---

### Merge Sort

Divide the array in half, recursively sort each half, then merge the two sorted halves.

```java
void mergeSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int mid = (left + right) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

void merge(int[] arr, int left, int mid, int right) {
    int[] temp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0;

    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp[k++] = arr[i++];
        else temp[k++] = arr[j++];
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];

    System.arraycopy(temp, 0, arr, left, temp.length);
}
```

```
Divide:
  [5, 3, 8, 1, 2, 7, 4, 6]
  [5, 3, 8, 1]  [2, 7, 4, 6]
  [5, 3] [8, 1]  [2, 7] [4, 6]
  [5][3] [8][1]  [2][7] [4][6]

Merge:
  [3,5] [1,8]  [2,7] [4,6]
  [1, 3, 5, 8]  [2, 4, 6, 7]
  [1, 2, 3, 4, 5, 6, 7, 8]
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N log N) | O(N log N) | O(N log N) | O(N) | Yes | No |

> Merge sort guarantees O(N log N) in all cases and is stable, making it ideal for sorting linked lists (where O(1) space merge is possible) and external sorting.

---

### Quick Sort

Pick a pivot, partition the array into elements less than and greater than the pivot, then recursively sort each partition.

```java
void quickSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int pivotIdx = partition(arr, left, right);
    quickSort(arr, left, pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, right);
}

int partition(int[] arr, int left, int right) {
    int pivot = arr[right];
    int i = left;
    for (int j = left; j < right; j++) {
        if (arr[j] < pivot) {
            swap(arr, i, j);
            i++;
        }
    }
    swap(arr, i, right);
    return i;
}
```

```
Pivot = 4 (last element):
  [5, 3, 8, 1, 2, 7, 4]

  Partition:
  i=0: 5≥4 skip, 3<4 swap(0,1)→[3,5,8,1,2,7,4] i=1
  i=1: 8≥4 skip, 1<4 swap(1,3)→[3,1,8,5,2,7,4] i=2
  i=2: 2<4 swap(2,4)→[3,1,2,5,8,7,4] i=3
  Place pivot: swap(3,6)→[3,1,2,4,8,7,5]
                          ↑ pivot in final position
  Recurse on [3,1,2] and [8,7,5]
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N log N) | O(N log N) | O(N²) | O(log N) | No | Yes |

### Pivot Selection Strategies

| Strategy | Worst Case | Notes |
|----------|-----------|-------|
| First/Last element | O(N²) on sorted input | Simple but risky |
| Random element | O(N²) extremely unlikely | Good practical choice |
| Median of three | O(N²) rare | First, middle, last → pick median |
| Median of medians | O(N log N) guaranteed | Theoretical; rarely used in practice |

> In practice, quicksort with random pivoting is often fastest due to small constants, good cache locality, and in-place operation. Most standard library sorts are based on quicksort variants.

---

### Heap Sort

Build a max-heap, then repeatedly extract the maximum and place it at the end.

```java
void heapSort(int[] arr) {
    int n = arr.length;
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    for (int i = n - 1; i > 0; i--) {
        swap(arr, 0, i);
        heapify(arr, i, 0);
    }
}

void heapify(int[] arr, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    if (left < n && arr[left] > arr[largest]) largest = left;
    if (right < n && arr[right] > arr[largest]) largest = right;
    if (largest != i) {
        swap(arr, i, largest);
        heapify(arr, n, largest);
    }
}
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N log N) | O(N log N) | O(N log N) | O(1) | No | Yes |

> Heap sort has the same worst-case as merge sort but is in-place. However, its cache performance is poor compared to quicksort due to non-sequential memory access.

---

## Non-Comparison Sorting

These algorithms break the O(N log N) lower bound by not comparing elements directly.

### Counting Sort

Count occurrences of each value, then reconstruct the sorted array.

```java
void countingSort(int[] arr, int maxVal) {
    int[] count = new int[maxVal + 1];
    for (int num : arr) count[num]++;
    int idx = 0;
    for (int i = 0; i <= maxVal; i++) {
        while (count[i]-- > 0) arr[idx++] = i;
    }
}
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(N + k) | O(N + k) | O(N + k) | O(k) | Yes* | No |

Where k = range of input values.

> Use when k is small relative to N. Example: sorting exam scores (0-100) for millions of students.

### Radix Sort

Sort integers digit by digit, from least significant to most significant, using a stable sort (counting sort) at each digit.

```java
void radixSort(int[] arr) {
    int max = Arrays.stream(arr).max().orElse(0);
    for (int exp = 1; max / exp > 0; exp *= 10) {
        countingSortByDigit(arr, exp);
    }
}

void countingSortByDigit(int[] arr, int exp) {
    int[] output = new int[arr.length];
    int[] count = new int[10];

    for (int num : arr) count[(num / exp) % 10]++;
    for (int i = 1; i < 10; i++) count[i] += count[i - 1];
    for (int i = arr.length - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[count[digit] - 1] = arr[i];
        count[digit]--;
    }
    System.arraycopy(output, 0, arr, 0, arr.length);
}
```

```
Sort: [170, 45, 75, 90, 802, 24, 2, 66]

By ones digit:  [170, 90, 802, 2, 24, 45, 75, 66]
By tens digit:  [802, 2, 24, 45, 66, 170, 75, 90]
By hundreds:    [2, 24, 45, 66, 75, 90, 170, 802]
```

| Best | Average | Worst | Space | Stable | In-place |
|------|---------|-------|-------|--------|----------|
| O(d × (N + k)) | O(d × (N + k)) | O(d × (N + k)) | O(N + k) | Yes | No |

Where d = number of digits, k = range per digit (10 for decimal).

> Use for fixed-length integers or strings. Example: sorting 1 million 10-digit phone numbers.

---

## Searching

### Binary Search

Search a sorted array by repeatedly dividing the search interval in half.

```java
int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
```

```
Search for 7 in [1, 3, 5, 7, 9, 11, 13]:

  Step 1: left=0, right=6, mid=3, arr[3]=7 ← found!

Search for 6:
  Step 1: left=0, right=6, mid=3, arr[3]=7 > 6 → right=2
  Step 2: left=0, right=2, mid=1, arr[1]=3 < 6 → left=2
  Step 3: left=2, right=2, mid=2, arr[2]=5 < 6 → left=3
  Step 4: left=3 > right=2 → not found
```

| Best | Average | Worst | Space |
|------|---------|-------|-------|
| O(1) | O(log N) | O(log N) | O(1) iterative, O(log N) recursive |

> Use `left + (right - left) / 2` instead of `(left + right) / 2` to prevent integer overflow.

### Binary Search Variations

#### Find First Occurrence

```java
int findFirst(int[] arr, int target) {
    int left = 0, right = arr.length - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) {
            result = mid;
            right = mid - 1;
        } else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return result;
}
```

#### Find Last Occurrence

```java
int findLast(int[] arr, int target) {
    int left = 0, right = arr.length - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) {
            result = mid;
            left = mid + 1;
        } else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return result;
}
```

#### Search in Rotated Sorted Array

```java
int searchRotated(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;

        if (arr[left] <= arr[mid]) {
            if (target >= arr[left] && target < arr[mid])
                right = mid - 1;
            else
                left = mid + 1;
        } else {
            if (target > arr[mid] && target <= arr[right])
                left = mid + 1;
            else
                right = mid - 1;
        }
    }
    return -1;
}
```

```
Array: [4, 5, 6, 7, 0, 1, 2]   (rotated at index 4)
Search for 0:

  Step 1: left=0, right=6, mid=3, arr[3]=7
          Left half [4,5,6,7] sorted, 0 not in [4,7] → left=4
  Step 2: left=4, right=6, mid=5, arr[5]=1
          Left half [0,1] sorted, 0 in [0,1] → right=4
  Step 3: left=4, right=4, mid=4, arr[4]=0 ← found!
```

---

## Sorting Algorithm Comparison

| Algorithm | Best | Average | Worst | Space | Stable | In-place | Notes |
|-----------|------|---------|-------|-------|--------|----------|-------|
| Bubble Sort | O(N) | O(N²) | O(N²) | O(1) | Yes | Yes | Educational only |
| Selection Sort | O(N²) | O(N²) | O(N²) | O(1) | No | Yes | Minimizes swaps |
| Insertion Sort | O(N) | O(N²) | O(N²) | O(1) | Yes | Yes | Best for small/nearly sorted |
| Merge Sort | O(N log N) | O(N log N) | O(N log N) | O(N) | Yes | No | Guaranteed performance |
| Quick Sort | O(N log N) | O(N log N) | O(N²) | O(log N) | No | Yes | Fastest in practice |
| Heap Sort | O(N log N) | O(N log N) | O(N log N) | O(1) | No | Yes | In-place, guaranteed |
| Counting Sort | O(N+k) | O(N+k) | O(N+k) | O(k) | Yes | No | Integer keys, small range |
| Radix Sort | O(dN) | O(dN) | O(dN) | O(N+k) | Yes | No | Fixed-length keys |

---

## Real-World Sorting Algorithms

### Timsort (Python, Java's `Arrays.sort` for objects)

A hybrid of merge sort and insertion sort:
1. Divide input into "runs" (already sorted subsequences)
2. Extend short runs using insertion sort (to a minimum run length, typically 32-64)
3. Merge runs using an optimized merge sort

> Timsort excels on real-world data that is often partially sorted. Worst case O(N log N), best case O(N).

### Introsort (C++ `std::sort`)

A hybrid of quicksort, heapsort, and insertion sort:
1. Start with quicksort
2. If recursion depth exceeds 2 × log₂(N), switch to heapsort (avoids O(N²) worst case)
3. For small partitions (N < 16), switch to insertion sort

> Introsort guarantees O(N log N) worst case while maintaining quicksort's excellent average performance.

### Dual-Pivot Quicksort (Java's `Arrays.sort` for primitives)

Uses two pivots instead of one, creating three partitions:
```
[< P1] [P1 ≤ x ≤ P2] [> P2]
```

> Fewer comparisons and swaps than single-pivot quicksort in practice.

---

## When to Use Which Sort

```
┌──────────────────────────────────────────────────────────────┐
│  Decision Guide                                              │
│                                                              │
│  Small N (< 50)?                                             │
│    → Insertion Sort                                          │
│                                                              │
│  Need guaranteed O(N log N)?                                 │
│    → Merge Sort (also: stable)                               │
│    → Heap Sort (in-place, but not stable)                    │
│                                                              │
│  Best average performance?                                   │
│    → Quick Sort (random pivot)                               │
│                                                              │
│  Stability required?                                         │
│    → Merge Sort or Timsort                                   │
│                                                              │
│  Integer keys with small range?                              │
│    → Counting Sort                                           │
│                                                              │
│  Fixed-length integer/string keys?                           │
│    → Radix Sort                                              │
│                                                              │
│  Nearly sorted data?                                         │
│    → Insertion Sort or Timsort                               │
│                                                              │
│  Sorting linked lists?                                       │
│    → Merge Sort (O(1) extra space for linked lists)          │
│                                                              │
│  External sorting (data doesn't fit in memory)?              │
│    → External Merge Sort                                     │
│      Split into chunks → sort each in memory →               │
│      merge sorted chunks from disk using k-way merge         │
└──────────────────────────────────────────────────────────────┘
```

---

## External Sorting

When data is too large to fit in memory:

```
┌──────────────────────────────────────────────────────────────┐
│  External Merge Sort                                         │
│                                                              │
│  Phase 1: Create sorted runs                                 │
│    Read chunks that fit in RAM → sort each → write to disk   │
│                                                              │
│    Disk: [sorted chunk 1] [sorted chunk 2] ... [sorted N]    │
│                                                              │
│  Phase 2: K-way merge                                        │
│    Open all sorted chunks                                    │
│    Use a min-heap of size K to merge                         │
│    Output merged result                                      │
│                                                              │
│    ┌─────────┐                                               │
│    │ Chunk 1 │──┐                                            │
│    ├─────────┤  │   ┌──────────┐   ┌──────────────┐         │
│    │ Chunk 2 │──┼──▶│ Min-Heap │──▶│ Sorted Output│         │
│    ├─────────┤  │   │ (size K) │   └──────────────┘         │
│    │ Chunk K │──┘   └──────────┘                             │
│    └─────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Interview Questions Overview

### 10.1 — Sorted Merge

> Merge two sorted arrays A and B where A has a large enough buffer at the end to hold B.

**Approach:** Merge from the end (right to left) to avoid overwriting.

```java
void sortedMerge(int[] a, int[] b, int lastA, int lastB) {
    int idxA = lastA - 1, idxB = lastB - 1;
    int idxMerged = lastA + lastB - 1;
    while (idxB >= 0) {
        if (idxA >= 0 && a[idxA] > b[idxB]) {
            a[idxMerged--] = a[idxA--];
        } else {
            a[idxMerged--] = b[idxB--];
        }
    }
}
```

### 10.2 — Group Anagrams

> Sort an array of strings so that all anagrams are grouped together.

**Approach:** Use a hash map where the key is the sorted version of each string.

```java
void groupAnagrams(String[] arr) {
    Map<String, List<String>> map = new HashMap<>();
    for (String s : arr) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    int idx = 0;
    for (List<String> group : map.values()) {
        for (String s : group) arr[idx++] = s;
    }
}
```

### 10.3 — Search in Rotated Array

> Search for a target in a sorted array that has been rotated. See the implementation above.

### 10.4 — Sorted Search, No Size

> Search in a sorted array-like data structure (Listy) that has no `size()` method. Accessing out-of-bounds returns -1.

**Approach:** Exponential search — find bounds by doubling index (1, 2, 4, 8, ...), then binary search.

### 10.5 — Sparse Search

> Search for a string in a sorted array of strings interspersed with empty strings.

**Approach:** Modified binary search. If `arr[mid]` is empty, expand outward to find the nearest non-empty string.

### 10.6 — Sort Big File

> Sort a 20 GB file with one string per line.

**Approach:** External sort. Divide into chunks, sort each in memory, merge with k-way merge.

### 10.7 — Missing Int

> Given 4 billion non-negative integers, find one that's not in the file. Available memory: 1 GB.

**Approach:** Bit vector. 4 billion bits = 500 MB < 1 GB. Set bit i if integer i appears. Scan for first unset bit.

### 10.8 — Find Duplicates

> Array of numbers 1 to N where N ≤ 32,000. Find duplicates with only 4 KB of memory.

**Approach:** Bit vector. 4 KB = 32,000 bits — exactly enough. Set bit for each number; if already set, it's a duplicate.

### 10.9 — Sorted Matrix Search

> Search for a value in an M×N matrix where rows and columns are sorted.

**Approach:** Start from top-right corner. If current > target, move left. If current < target, move down. O(M + N).

```java
boolean searchMatrix(int[][] matrix, int target) {
    int row = 0, col = matrix[0].length - 1;
    while (row < matrix.length && col >= 0) {
        if (matrix[row][col] == target) return true;
        else if (matrix[row][col] > target) col--;
        else row++;
    }
    return false;
}
```

### 10.10 — Rank from Stream

> Reading integers from a stream. Implement `track(int x)` and `getRankOfNumber(int x)` (count of values ≤ x).

**Approach:** Use a modified BST where each node tracks the size of its left subtree.

### 10.11 — Peaks and Valleys

> Sort an array into alternating peaks and valleys: peak ≥ neighbors, valley ≤ neighbors.

**Approach:** Iterate through even indices. Swap with the larger neighbor if needed. O(N).

---

## Key Takeaways

1. **Know the trade-offs** — time, space, stability, in-place. No single algorithm wins on all dimensions
2. **Quicksort is fastest in practice** but O(N²) worst case; use random pivots
3. **Merge sort is the safe choice** — O(N log N) guaranteed, stable, but needs O(N) space
4. **Insertion sort for small inputs** — most hybrid algorithms switch to it below N ≈ 16-32
5. **Non-comparison sorts break O(N log N)** but only work for specific types of keys
6. **Binary search is O(log N)** — but the array must be sorted. The variations (first/last occurrence, rotated array) come up frequently
7. **"Which sort should I use?"** is a better interview question than "Implement quicksort" — know when to use each
8. **External sorting** = sort chunks + k-way merge. Know this concept for "big data" questions
9. **Stability matters** when you have multi-key sorts or need to preserve relative order
10. **Real-world sorts are hybrids** — Timsort, Introsort, and Dual-Pivot Quicksort combine the best properties of multiple algorithms
