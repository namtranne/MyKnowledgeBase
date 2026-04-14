---
sidebar_position: 15
title: "Week 14: Bit Manipulation"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 14: Bit Manipulation

Welcome to **Week 14** of the 20-week DSA Foundations roadmap. This week you will learn **bit manipulation** — one of the most elegant and efficient toolboxes in competitive programming and interviews. Bit manipulation lets you solve problems in O(1) space and O(n) time that would otherwise need HashMaps or sorting. It also unlocks bitmask-based subset generation, a technique that bridges combinatorics and DP.

---

## 1 · Core Theory

### 1.1 Binary Representation

Every integer is stored as a sequence of bits (binary digits). In Java a 32-bit signed `int` uses 31 bits for the magnitude and 1 sign bit (two's complement). For arbitrary precision, use `BigInteger`.

| Decimal | Binary (8-bit) |
|---|---|
| 0 | `00000000` |
| 1 | `00000001` |
| 5 | `00000101` |
| 13 | `00001101` |
| 255 | `11111111` |
| -1 (two's complement, 8-bit) | `11111111` |

**Useful fact:** The value of an n-bit binary number is the sum of `bit_i * 2^i` for each position i from 0 (LSB) to n-1 (MSB).

```java
// Convert between decimal and binary in Java
Integer.toBinaryString(13); // "1101"
Integer.parseInt("1101", 2); // 13
```

---

### 1.2 Bitwise Operators

| Operator | Symbol (Java) | Description | Example (5 = `0101`, 3 = `0011`) |
|---|---|---|---|
| AND | `a & b` | 1 only if both bits are 1 | `0101 & 0011 = 0001` (1) |
| OR | `a \| b` | 1 if either bit is 1 | `0101 \| 0011 = 0111` (7) |
| XOR | `a ^ b` | 1 if bits differ | `0101 ^ 0011 = 0110` (6) |
| NOT | `~a` | Flip every bit (two's complement: `~a = -(a+1)`) | `~5 = -6` |
| Left shift | `a << k` | Shift bits left by k, fill with 0s. Equivalent to `a * 2^k` | `5 << 1 = 10` |
| Arithmetic right shift | `a >> k` | Shift bits right by k, sign-extending. Equivalent to `a / 2^k` (floor) | `13 >> 1 = 6` |
| Logical right shift | `a >>> k` | Shift bits right by k, zero-filling | `-1 >>> 31 = 1` |

**Operator precedence gotcha:** Bitwise operators have lower precedence than comparison operators in Java. Always use parentheses: `(a & b) == 0` not `a & b == 0`.

<AlgoViz
  title="Basic Bit Operations: AND, OR, XOR on 5 and 3"
  description="Visualise AND (&), OR (|), and XOR (^) on binary representations of 5 (0101) and 3 (0011). Each operation compares bits at the same position."
  steps={[
    { array: [0,1,0,1], highlights: [], labels: {"0":"bit3","1":"bit2","2":"bit1","3":"bit0"}, variables: { decimal: 5, binary: "0101", operation: "operand A" }, explanation: "Binary representation of 5 is 0101. Each cell is one bit, from MSB (left) to LSB (right).", code: "int a = 5; // 0101 in binary" },
    { array: [0,0,1,1], highlights: [], labels: {"0":"bit3","1":"bit2","2":"bit1","3":"bit0"}, variables: { decimal: 3, binary: "0011", operation: "operand B" }, explanation: "Binary representation of 3 is 0011.", code: "int b = 3; // 0011 in binary" },
    { array: [0,0,0,1], highlights: [3], variables: { a: "0101", b: "0011", result: "0001", decimal: 1, operation: "AND (&)" }, explanation: "AND: 0101 & 0011 = 0001. A bit is 1 only when BOTH bits are 1. Only bit0 has both bits set.", code: "int andResult = a & b; // 0001 = 1" },
    { array: [0,1,1,1], highlights: [1,2,3], variables: { a: "0101", b: "0011", result: "0111", decimal: 7, operation: "OR (|)" }, explanation: "OR: 0101 | 0011 = 0111. A bit is 1 when EITHER bit is 1. Bits 0, 1, and 2 have at least one 1.", code: "int orResult = a | b; // 0111 = 7" },
    { array: [0,1,1,0], highlights: [1,2], variables: { a: "0101", b: "0011", result: "0110", decimal: 6, operation: "XOR (^)" }, explanation: "XOR: 0101 ^ 0011 = 0110. A bit is 1 when bits DIFFER. Bits 1 and 2 differ between a and b.", code: "int xorResult = a ^ b; // 0110 = 6" },
    { array: [1,0,1,0], highlights: [0,2], variables: { a: "0101", result: "1010", decimal: -6, operation: "NOT (~)" }, explanation: "NOT: ~0101 = ...11111010. Flips every bit. In two's complement 32-bit, ~5 = -6.", code: "int notResult = ~a; // -(5+1) = -6" },
    { array: [1,0,1,0], highlights: [0,1,2,3], variables: { a: "0101", shift: 1, result: "1010", decimal: 10, operation: "Left Shift (<<)" }, explanation: "Left shift: 0101 << 1 = 1010 = 10. Shifting left by 1 multiplies by 2.", code: "int shifted = a << 1; // 1010 = 10" },
    { array: [0,0,1,0], highlights: [2], variables: { a: "0101", shift: 1, result: "0010", decimal: 2, operation: "Right Shift (>>)" }, explanation: "Right shift: 0101 >> 1 = 0010 = 2. Shifting right by 1 divides by 2 (floor).", code: "int shifted = a >> 1; // 0010 = 2" }
  ]}
/>

---

### 1.3 Common Bit Tricks

These one-liners appear constantly in interviews. Memorise them.

| Trick | Expression | Why it works |
|---|---|---|
| Check odd/even | `(n & 1)` | LSB is 1 for odd numbers |
| Check power of 2 | `n > 0 && (n & (n - 1)) == 0` | Powers of 2 have exactly one set bit; subtracting 1 flips it and all lower bits |
| Clear lowest set bit | `n & (n - 1)` | Turns off the rightmost 1-bit |
| Isolate lowest set bit | `n & (-n)` | Two's complement: `-n = ~n + 1`. Only the lowest set bit survives the AND |
| Set bit at position i | `n \| (1 << i)` | OR with a mask that has only bit i set |
| Clear bit at position i | `n & ~(1 << i)` | AND with a mask that has every bit set except bit i |
| Toggle bit at position i | `n ^ (1 << i)` | XOR flips the target bit, leaves others unchanged |
| Check bit at position i | `(n >> i) & 1` | Shift bit i to LSB, mask everything else |
| Count set bits (Brian Kernighan) | Loop: `n = n & (n - 1)`, count iterations | Each iteration clears exactly one set bit |
| Swap without temp | `a ^= b; b ^= a; a ^= b` | XOR is its own inverse |

---

### 1.4 XOR Properties

**Why XOR is so powerful.** XOR is unique among bitwise operations because it is its own inverse: applying XOR twice undoes the effect. This self-cancellation property lets you solve problems that seem to require extra storage (HashMaps, sorting) in O(1) space. When every element in an array appears an even number of times except one, XOR-ing everything together cancels the pairs and leaves the unique element — no HashMap needed.

**Intuition.** Think of XOR as a light switch. Flipping a switch twice returns it to its original state. If you flip a set of switches and then flip the same set again, nothing has changed. The one switch that is only flipped once remains in its altered state — that is the "single number" that survives.

**Interview signals.** "Find the element appearing an odd number of times." "Find the missing number in a sequence." "Find two unique numbers in an array of pairs." Any time the problem gives you pairs that cancel and asks what remains, XOR is the tool.

**Common mistakes.** Trying to use XOR when elements appear three times (XOR only cancels pairs — for triples you need bit-counting mod 3). Forgetting that XOR of all numbers 0 to n can be computed without a loop: the pattern cycles every 4 values.

XOR is the star of bit manipulation problems. Key properties:

| Property | Expression | Consequence |
|---|---|---|
| Self-inverse | `a ^ a = 0` | XOR-ing a number with itself cancels it |
| Identity | `a ^ 0 = a` | XOR with 0 leaves the number unchanged |
| Commutative | `a ^ b = b ^ a` | Order doesn't matter |
| Associative | `(a ^ b) ^ c = a ^ (b ^ c)` | Grouping doesn't matter |

**Practical use:** XOR all elements of an array. Any number appearing an even number of times cancels to 0, leaving only the number(s) that appear an odd number of times.

---

### 1.5 Bitmask for Subset Generation

An integer with n bits can represent any subset of an n-element set. Bit i being 1 means "include element i".

For a set of n elements there are `2^n` subsets, each corresponding to an integer from 0 to `2^n - 1`.

```
Set = ['a', 'b', 'c']

mask = 0b101 = 5  →  include index 0 ('a') and index 2 ('c')  →  subset = ['a', 'c']
mask = 0b011 = 3  →  include index 0 ('a') and index 1 ('b')  →  subset = ['a', 'b']
mask = 0b111 = 7  →  include all                                →  subset = ['a', 'b', 'c']
mask = 0b000 = 0  →  include none                               →  subset = []
```

This technique is foundational for bitmask DP (Week 11) and many combinatorial problems.

---

## 2 · Code Templates

### 2.1 Count Set Bits (Brian Kernighan)

```java
public static int countSetBits(int n) {
    int count = 0;
    while (n != 0) {
        n &= n - 1; // clear lowest set bit
        count++;
    }
    return count;
}
```

**Time:** O(k) where k is the number of set bits. **Space:** O(1).

<AlgoViz
  title="Brian Kernighan's Algorithm: Count Set Bits of 13"
  description="Count set bits by repeatedly clearing the lowest set bit with n &= (n-1). Each iteration removes exactly one 1-bit. For n=13 (1101), there are 3 set bits."
  steps={[
    { array: [1,1,0,1], highlights: [0,1,3], labels: {"0":"bit3","1":"bit2","2":"bit1","3":"bit0"}, variables: { n: 13, binary: "1101", count: 0 }, explanation: "Start with n=13 (binary 1101). Three bits are set. count=0.", code: "int n = 13; int count = 0;" },
    { array: [1,1,0,0], highlights: [3], secondary: [0,1], variables: { n: 12, "n-1": "1100", binary: "1100", count: 1, operation: "1101 & 1100 = 1100" }, explanation: "Iteration 1: n-1=12 (1100). n & (n-1) = 1101 & 1100 = 1100. Lowest set bit (bit0) cleared. count=1.", code: "n &= (n - 1); // 13 & 12 = 12, count++" },
    { array: [1,0,0,0], highlights: [1], secondary: [0], variables: { n: 8, "n-1": "1011", binary: "1000", count: 2, operation: "1100 & 1011 = 1000" }, explanation: "Iteration 2: n-1=11 (1011). n & (n-1) = 1100 & 1011 = 1000. Bit2 cleared. count=2.", code: "n &= (n - 1); // 12 & 11 = 8, count++" },
    { array: [0,0,0,0], highlights: [0], variables: { n: 0, "n-1": "0111", binary: "0000", count: 3, operation: "1000 & 0111 = 0000" }, explanation: "Iteration 3: n-1=7 (0111). n & (n-1) = 1000 & 0111 = 0000. Bit3 cleared. count=3.", code: "n &= (n - 1); // 8 & 7 = 0, count++" },
    { array: [0,0,0,0], highlights: [], variables: { n: 0, count: 3, result: "3 set bits" }, explanation: "n == 0, loop ends. The number 13 has exactly 3 set bits. Algorithm ran in O(3) = O(k) iterations, not 32.", code: "// n == 0, return count = 3" }
  ]}
/>

---

### 2.2 Isolate Lowest Set Bit

```java
public static int lowestSetBit(int n) {
    return n & (-n);
}

// Example: lowestSetBit(12) = lowestSetBit(0b1100) = 0b0100 = 4
```

---

### 2.3 Single Number (XOR)

```java
public static int singleNumber(int[] nums) {
    int result = 0;
    for (int num : nums) {
        result ^= num;
    }
    return result;
}
```

Every number appearing twice cancels via `a ^ a = 0`. The lone number survives.

<AlgoViz
  title="Single Number via XOR: nums=[2,3,5,3,2]"
  description="XOR all elements together. Duplicate pairs cancel (a^a=0) and the unique number survives (0^a=a). Watch the binary accumulator as pairs cancel out."
  steps={[
    { array: [2,3,5,3,2], highlights: [], variables: { result: 0, binary: "000" }, explanation: "Initialise result = 0. We XOR every element in the array into result.", code: "int result = 0;" },
    { array: [2,3,5,3,2], highlights: [0], variables: { num: 2, result: 2, binary: "010", operation: "000 ^ 010 = 010" }, explanation: "XOR with 2: result = 0 ^ 2 = 2. Binary: 000 ^ 010 = 010.", code: "result ^= 2; // result = 2" },
    { array: [2,3,5,3,2], highlights: [1], variables: { num: 3, result: 1, binary: "001", operation: "010 ^ 011 = 001" }, explanation: "XOR with 3: result = 2 ^ 3 = 1. Binary: 010 ^ 011 = 001.", code: "result ^= 3; // result = 1" },
    { array: [2,3,5,3,2], highlights: [2], variables: { num: 5, result: 4, binary: "100", operation: "001 ^ 101 = 100" }, explanation: "XOR with 5: result = 1 ^ 5 = 4. Binary: 001 ^ 101 = 100.", code: "result ^= 5; // result = 4" },
    { array: [2,3,5,3,2], highlights: [3], variables: { num: 3, result: 7, binary: "111", operation: "100 ^ 011 = 111" }, explanation: "XOR with 3 again: result = 4 ^ 3 = 7. Binary: 100 ^ 011 = 111.", code: "result ^= 3; // result = 7" },
    { array: [2,3,5,3,2], highlights: [4], variables: { num: 2, result: 5, binary: "101", operation: "111 ^ 010 = 101" }, explanation: "XOR with 2 again: result = 7 ^ 2 = 5. The second 2 cancels the first! Binary: 111 ^ 010 = 101.", code: "result ^= 2; // result = 5" },
    { array: [2,3,5,3,2], highlights: [2], variables: { result: 5, binary: "101", pairs_cancelled: "2^2=0, 3^3=0", survivor: 5 }, explanation: "Done! result = 5. Pairs cancelled: 2^2=0, 3^3=0. The unique number 5 survives. O(n) time, O(1) space.", code: "return result; // 5" }
  ]}
/>

---

### 2.4 Bitmask Subset Generation

```java
public static List<List<Character>> generateSubsets(char[] items) {
    int n = items.length;
    List<List<Character>> subsets = new ArrayList<>();
    for (int mask = 0; mask < (1 << n); mask++) { // 0 to 2^n - 1
        List<Character> subset = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) {
                subset.add(items[i]);
            }
        }
        subsets.add(subset);
    }
    return subsets;
}
```

**Time:** O(n * 2^n). **Space:** O(n * 2^n) for output.

<AlgoViz
  title="Bitmask Subset Generation: All Subsets of {a, b, c}"
  description="Iterate masks from 0 to 2^n - 1. Each bit in the mask indicates whether to include the corresponding element. For n=3 elements, there are 2^3 = 8 subsets."
  steps={[
    { array: [0,0,0], highlights: [], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 0, binary: "000", subset: "[]" }, explanation: "mask=0 (000): no bits set. The subset is empty [].", code: "mask = 0; // binary 000 → subset []" },
    { array: [0,0,1], highlights: [2], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 1, binary: "001", subset: "[a]" }, explanation: "mask=1 (001): bit 0 is set → include items[0]='a'. Subset: [a].", code: "mask & (1 << 0) != 0 → include 'a'" },
    { array: [0,1,0], highlights: [1], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 2, binary: "010", subset: "[b]" }, explanation: "mask=2 (010): bit 1 is set → include items[1]='b'. Subset: [b].", code: "mask & (1 << 1) != 0 → include 'b'" },
    { array: [0,1,1], highlights: [1,2], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 3, binary: "011", subset: "[a, b]" }, explanation: "mask=3 (011): bits 0 and 1 set → include 'a' and 'b'. Subset: [a, b].", code: "mask = 3; // 011 → {a, b}" },
    { array: [1,0,0], highlights: [0], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 4, binary: "100", subset: "[c]" }, explanation: "mask=4 (100): bit 2 is set → include items[2]='c'. Subset: [c].", code: "mask & (1 << 2) != 0 → include 'c'" },
    { array: [1,0,1], highlights: [0,2], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 5, binary: "101", subset: "[a, c]" }, explanation: "mask=5 (101): bits 0 and 2 set → include 'a' and 'c'. Subset: [a, c].", code: "mask = 5; // 101 → {a, c}" },
    { array: [1,1,0], highlights: [0,1], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 6, binary: "110", subset: "[b, c]" }, explanation: "mask=6 (110): bits 1 and 2 set → include 'b' and 'c'. Subset: [b, c].", code: "mask = 6; // 110 → {b, c}" },
    { array: [1,1,1], highlights: [0,1,2], labels: {"0":"c","1":"b","2":"a"}, variables: { mask: 7, binary: "111", subset: "[a, b, c]", totalSubsets: 8 }, explanation: "mask=7 (111): all bits set → include all elements. Subset: [a, b, c]. Total: 2^3 = 8 subsets generated in O(n × 2^n).", code: "mask = 7; // 111 → {a, b, c}" }
  ]}
/>

---

### 2.5 Check if n-th Bit is Set

```java
public static boolean isBitSet(int num, int i) {
    return ((num >> i) & 1) == 1;
}
```

---

### 2.6 Reverse Bits (32-bit)

```java
public static int reverseBits(int n) {
    int result = 0;
    for (int i = 0; i < 32; i++) {
        result = (result << 1) | (n & 1);
        n >>>= 1; // logical right shift to avoid sign extension
    }
    return result;
}
```

<AlgoViz
  title="Reverse Bits: Reverse 8-bit number 13 (00001101)"
  description="Build the reversed number bit by bit. Extract the LSB of n, shift result left and OR it in, then shift n right. After processing all bits, the result is the bit-reversed number."
  steps={[
    { array: [0,0,0,0,1,1,0,1], highlights: [], labels: {"0":"b7","1":"b6","2":"b5","3":"b4","4":"b3","5":"b2","6":"b1","7":"b0"}, variables: { n: 13, "n_binary": "00001101", result: 0, "res_binary": "00000000" }, explanation: "Start: n=13 (00001101), result=0 (00000000). We extract bits from n's LSB and build result from right to left.", code: "int result = 0; // n = 13 = 00001101" },
    { array: [0,0,0,0,1,1,0,1], highlights: [7], variables: { "n_AND_1": 1, result: 1, "res_binary": "00000001", n: 6, "n_binary": "00000110" }, explanation: "Iter 1: LSB of n is 1. result = (0 << 1) | 1 = 1 (00000001). Shift n right → 6 (00000110).", code: "result = (0 << 1) | 1; // 1. n >>>= 1; // 6" },
    { array: [0,0,0,0,0,1,1,0], highlights: [7], variables: { "n_AND_1": 0, result: 2, "res_binary": "00000010", n: 3, "n_binary": "00000011" }, explanation: "Iter 2: LSB of n is 0. result = (1 << 1) | 0 = 2 (00000010). Shift n right → 3 (00000011).", code: "result = (1 << 1) | 0; // 2. n >>>= 1; // 3" },
    { array: [0,0,0,0,0,0,1,1], highlights: [7], variables: { "n_AND_1": 1, result: 5, "res_binary": "00000101", n: 1, "n_binary": "00000001" }, explanation: "Iter 3: LSB of n is 1. result = (2 << 1) | 1 = 5 (00000101). Shift n right → 1 (00000001).", code: "result = (2 << 1) | 1; // 5. n >>>= 1; // 1" },
    { array: [0,0,0,0,0,0,0,1], highlights: [7], variables: { "n_AND_1": 1, result: 11, "res_binary": "00001011", n: 0, "n_binary": "00000000" }, explanation: "Iter 4: LSB of n is 1. result = (5 << 1) | 1 = 11 (00001011). Shift n right → 0. All significant bits extracted.", code: "result = (5 << 1) | 1; // 11. n >>>= 1; // 0" },
    { array: [0,0,0,0,0,0,0,0], highlights: [], variables: { n: 0, result: 176, "res_binary": "10110000", remaining: "4 shifts with n=0" }, explanation: "Iters 5-8: n is 0, so all extracted bits are 0. result shifts left 4 more times: 11 << 4 = 176 (10110000).", code: "// 4 more iterations: result <<= 4 effectively → 176" },
    { array: [1,0,1,1,0,0,0,0], highlights: [0,2,3], variables: { original: "00001101 (13)", reversed: "10110000 (176)", result: 176 }, explanation: "Done! 13 (00001101) reversed to 176 (10110000). Each bit moved to its mirror position across the center.", code: "return result; // 176 (8-bit example)" }
  ]}
/>

---

## 3 · Complexity Reference

| Operation / Algorithm | Time | Space | Notes |
|---|---|---|---|
| Single bitwise op | O(1) | O(1) | AND, OR, XOR, NOT, shift |
| Count set bits (Kernighan) | O(k) | O(1) | k = number of set bits |
| Count set bits (lookup table) | O(1) | O(256) | Precompute for each byte |
| `Integer.bitCount(n)` (Java) | O(1) | O(1) | Built-in popcount intrinsic |
| Bitmask subset enumeration | O(n * 2^n) | O(1) extra | n = set size, max ~20 |
| XOR scan (Single Number) | O(n) | O(1) | Linear scan |
| Bit DP | O(2^n * n) | O(2^n) | Typical bitmask DP |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "find the element appearing once, others appear twice" | XOR all elements together | Single Number (XOR scan) |
| "without extra space" or "O(1) space" | XOR tricks or bit manipulation to avoid HashMap | XOR / bit tricks |
| "count number of 1 bits" | Brian Kernighan: n = n AND (n-1), count iterations | Count Set Bits |
| "is this number a power of 2?" | n AND (n-1) equals 0 (single set bit) | Power of 2 check |
| "find the missing number in 0..n" | XOR all indices with all values, or use sum formula | XOR / math |
| "generate all subsets of a small set" | Iterate masks from 0 to 2^n - 1, check each bit | Bitmask Subset Generation |
| "compute sum without arithmetic operators" | XOR for sum-without-carry, AND-shift for carry, loop | Bitwise Addition |
| "two unique numbers in array of pairs" | XOR all, isolate a differing bit, partition and XOR each group | Single Number III |
| "hamming distance between two numbers" | XOR to find differing bits, then count set bits | XOR + popcount |
| "reverse bits of a 32-bit integer" | Shift result left, OR with LSB of n, shift n right, repeat 32 times | Reverse Bits |

---

## 4 · Worked Example: Single Number

**Why not brute force?** A brute-force approach uses a HashSet — add if not seen, remove if already present, and whatever remains is the answer. This works in O(n) time but requires O(n) space. Sorting gives O(n log n) time with O(1) space. The XOR approach achieves the best of both worlds: O(n) time AND O(1) space, exploiting the mathematical property that duplicate values cancel each other when XOR-ed together.

**Key insight:** XOR is commutative, associative, and self-inverse. The order you process elements does not matter. Every number that appears twice contributes `a XOR a = 0`, and `0 XOR x = x` for the unique number. The entire array collapses to the single unique element in one pass.

**Problem:** Given an array where every element appears exactly twice except one element that appears once, find the single element. Do it in O(n) time and O(1) space.

**Input:** `nums = [4, 1, 2, 1, 2]`

### Step-by-step XOR trace

We initialise `result = 0` and XOR each element:

| Step | Current num | result before | XOR operation | result after | Binary of result |
|---|---|---|---|---|---|
| 0 | — | 0 | — | 0 | `000` |
| 1 | 4 | 0 | `0 ^ 4` | 4 | `100` |
| 2 | 1 | 4 | `4 ^ 1` | 5 | `101` |
| 3 | 2 | 5 | `5 ^ 2` | 7 | `111` |
| 4 | 1 | 7 | `7 ^ 1` | 6 | `110` |
| 5 | 2 | 6 | `6 ^ 2` | 4 | `100` |

**Result: 4** — the single number.

### Why it works

- `1 ^ 1 = 0` and `2 ^ 2 = 0` — duplicates cancel.
- `0 ^ 4 = 4` — the unique number survives.
- Order doesn't matter thanks to commutativity and associativity:
  `4 ^ 1 ^ 2 ^ 1 ^ 2 = 4 ^ (1 ^ 1) ^ (2 ^ 2) = 4 ^ 0 ^ 0 = 4`

### Code

```java
public static int singleNumber(int[] nums) {
    int result = 0;
    for (int num : nums) {
        result ^= num;
    }
    return result;
}

// singleNumber(new int[]{4, 1, 2, 1, 2}) → 4
```

**Time:** O(n). **Space:** O(1). No HashMap needed.

<AlgoViz
  title="Single Number via XOR: nums=[4,1,2,1,2]"
  description="XOR all elements together. Duplicates cancel (a^a=0) and the unique number survives (0^a=a). Watch the binary representation as pairs cancel out."
  steps={[
    { array: [4,1,2,1,2], highlights: [], variables: { result: 0, binary: "000" }, explanation: "Initialise result = 0. We will XOR every element into result.", code: "int result = 0;" },
    { array: [4,1,2,1,2], highlights: [0], variables: { num: 4, result: 4, binary: "100", operation: "0 ^ 4 = 4" }, explanation: "XOR with 4: result = 0 ^ 4 = 4. Binary: 000 ^ 100 = 100.", code: "result ^= 4; // result = 4" },
    { array: [4,1,2,1,2], highlights: [1], variables: { num: 1, result: 5, binary: "101", operation: "4 ^ 1 = 5" }, explanation: "XOR with 1: result = 4 ^ 1 = 5. Binary: 100 ^ 001 = 101.", code: "result ^= 1; // result = 5" },
    { array: [4,1,2,1,2], highlights: [2], variables: { num: 2, result: 7, binary: "111", operation: "5 ^ 2 = 7" }, explanation: "XOR with 2: result = 5 ^ 2 = 7. Binary: 101 ^ 010 = 111.", code: "result ^= 2; // result = 7" },
    { array: [4,1,2,1,2], highlights: [3], variables: { num: 1, result: 6, binary: "110", operation: "7 ^ 1 = 6" }, explanation: "XOR with 1 again: result = 7 ^ 1 = 6. The first 1 cancels! Binary: 111 ^ 001 = 110.", code: "result ^= 1; // result = 6 (1 cancelled)" },
    { array: [4,1,2,1,2], highlights: [4], variables: { num: 2, result: 4, binary: "100", operation: "6 ^ 2 = 4" }, explanation: "XOR with 2 again: result = 6 ^ 2 = 4. The first 2 cancels! Binary: 110 ^ 010 = 100.", code: "result ^= 2; // result = 4 (2 cancelled)" },
    { array: [4,1,2,1,2], highlights: [0], variables: { result: 4, binary: "100", pairs_cancelled: "1^1=0, 2^2=0", survivor: "4" }, explanation: "Done! result = 4. All pairs cancelled (1^1=0, 2^2=0), leaving only the unique number 4.", code: "return result; // 4" }
  ]}
/>

---

## 5 · Practice Problems (21 problems / 3 days)

### Day 1 — Foundations (7 problems)

| # | Problem | Key Technique | Difficulty |
|---|---|---|---|
| 1 | **Single Number** (LC 136) | XOR all elements | Easy |
| 2 | **Number of 1 Bits** (LC 191) | Brian Kernighan / `n & (n-1)` | Easy |
| 3 | **Counting Bits** (LC 338) | DP: `dp[i] = dp[i & (i-1)] + 1` or `dp[i] = dp[i >> 1] + (i & 1)` | Easy |
| 4 | **Reverse Bits** (LC 190) | Shift and OR, 32 iterations | Easy |
| 5 | **Missing Number** (LC 268) | XOR indices with values, or sum formula | Easy |
| 6 | **Power of Two** (LC 231) | `n > 0 && (n & (n-1)) == 0` | Easy |
| 7 | **Hamming Distance** (LC 461) | XOR then count set bits | Easy |

### Day 2 — Intermediate (7 problems)

| # | Problem | Key Technique | Difficulty |
|---|---|---|---|
| 8 | **Single Number II** (LC 137) | Count bits mod 3, or state machine | Medium |
| 9 | **Single Number III** (LC 260) | XOR all, split by lowest differing bit | Medium |
| 10 | **Sum of Two Integers** (LC 371) | XOR for sum without carry, AND + shift for carry, loop | Medium |
| 11 | **Bitwise AND of Numbers Range** (LC 201) | Common prefix: shift both until equal | Medium |
| 12 | **Subsets (Bitmask)** (LC 78) | Enumerate masks 0..2^n-1 | Medium |
| 13 | **Maximum XOR of Two Numbers** (LC 421) | Trie on binary prefixes, greedy bit-by-bit | Medium |
| 14 | **Total Hamming Distance** (LC 477) | For each bit position, count 1s and 0s, multiply | Medium |

### Day 3 — Advanced (7 problems)

| # | Problem | Key Technique | Difficulty |
|---|---|---|---|
| 15 | **Decode XORed Permutation** (LC 1734) | XOR all 1..n, XOR encoded at odd indices | Medium |
| 16 | **Find the Duplicate Number** (LC 287) | Floyd's cycle detection or bit counting | Medium |
| 17 | **UTF-8 Validation** (LC 393) | Bit masking to check leading byte patterns | Medium |
| 18 | **Maximum Product of Word Lengths** (LC 318) | Bitmask each word (26 bits), AND to check overlap | Medium |
| 19 | **Minimum Flips to Make a OR b Equal to c** (LC 1318) | Compare bit by bit, count mismatches | Medium |
| 20 | **XOR Queries of a Subarray** (LC 1310) | Prefix XOR array, range query in O(1) | Medium |
| 21 | **Concatenation of Consecutive Binary Numbers** (LC 1680) | Shift by bit-length of each number, OR, mod 10^9+7 | Medium |

---

## 6 · Mock Interviews

### Mock Interview 1: "Find the Two Unique Numbers"

**Interviewer:** You are given an integer array where every element appears exactly twice except for two elements that appear once. Find those two elements in O(n) time and O(1) space.

**Candidate approach:**

1. XOR all elements. The result is `x = a ^ b` where a and b are the two unique numbers (all duplicates cancel).
2. Find any set bit in x — this bit differs between a and b. Use `diffBit = x & (-x)` to isolate the lowest set bit.
3. Partition all numbers into two groups: those with `diffBit` set and those without. Each group contains exactly one unique number.
4. XOR within each group to find a and b.

```java
public static int[] singleNumberIII(int[] nums) {
    int xorAll = 0;
    for (int num : nums) {
        xorAll ^= num;
    }

    int diffBit = xorAll & (-xorAll);

    int a = 0, b = 0;
    for (int num : nums) {
        if ((num & diffBit) != 0) {
            a ^= num;
        } else {
            b ^= num;
        }
    }

    return new int[]{a, b};
}
```

**Follow-ups:**

1. **"What if three numbers appear once?"** — Generalisation is harder. One approach uses XOR and a "xor-and-sum" trick, but the cleanest O(n) / O(1) method is significantly more involved (research: finding three unique elements via linear algebra over GF(2)). In interviews, stating the difficulty and proposing an O(n) / O(n) HashMap fallback is acceptable.

2. **"What if every other number appears three times?"** — Single Number II approach: for each bit position, count the total number of set bits. The unique number's bits are those where the count mod 3 is not zero.

3. **"Can you do this without XOR, using a different bitwise approach?"** — You could use a HashMap (O(n) space), or a sorting approach (O(n log n) time). The XOR method is optimal for this specific constraint.

4. **"How does `x & (-x)` work?"** — In two's complement, `-x = ~x + 1`. Flipping all bits and adding 1 means only the lowest set bit of x survives the AND. Example: `x = 0b1100`, `-x = 0b0100`, `x & (-x) = 0b0100`.

---

### Mock Interview 2: "Sum Without Arithmetic Operators"

**Interviewer:** Compute the sum of two integers without using `+` or `-`. You may only use bitwise operators.

**Candidate approach:**

1. `a ^ b` gives the sum ignoring carries.
2. `(a & b) << 1` gives the carries.
3. Repeat until there are no carries.

**32-bit constraint:** In Java with fixed-width `int`, this naturally terminates within 32 iterations.

```java
public static int getSum(int a, int b) {
    while (b != 0) {
        int carry = (a & b) << 1;
        a = a ^ b;
        b = carry;
    }
    return a;
}
```

**Follow-ups:**

1. **"Why does this terminate?"** — Each iteration shifts the carry left by one position. Since Java `int` is 32 bits, the carry eventually shifts out (becomes 0) after at most 32 iterations.

2. **"Can you implement subtraction the same way?"** — Yes. `a - b = a + (-b)`. Negate b using two's complement: `-b = ~b + 1`. Then call `getSum(a, getSum(~b, 1))`.

3. **"What about multiplication?"** — Use the Russian peasant / binary multiplication algorithm: repeatedly shift and add. For each set bit in b, add `a << bit_position` to the result.

4. **"What is the time complexity?"** — O(1) for fixed-width integers (at most 32 iterations since carries can propagate at most 32 positions).

---

## 7 · Tips and Edge Cases

### General tips

- **Java-specific:** Java `int` is 32-bit and `long` is 64-bit. Use `>>>` for logical (unsigned) right shift and `>>` for arithmetic (sign-extending) right shift.
- **Signed vs unsigned:** `Integer.toUnsignedLong(n)` converts a signed int to its unsigned `long` equivalent. `Integer.compareUnsigned(a, b)` compares as unsigned.
- **XOR is your default tool** whenever a problem says "find the element appearing an odd number of times" or "find the missing element".
- **Bitmask subsets** work for sets up to about 20 elements (2^20 = ~10^6 states). Beyond that, the exponential blowup makes it infeasible.
- **Brian Kernighan's trick** (`n &= n - 1`) is faster than checking all 32 bits when the number of set bits is small. Java also provides `Integer.bitCount(n)` as a built-in.

### Common edge cases

| Edge Case | Watch out for |
|---|---|
| `n = 0` | `countSetBits(0)` should return 0; `0 & (0 - 1)` = `0 & (-1)` = 0 |
| `n = 1` | Smallest power of 2; `1 & 0 = 0` correctly identifies it |
| Negative numbers | Two's complement: `~0 = -1`, `~n = -(n+1)`. Use `>>>` for logical shift |
| All bits set | 32-bit: `0xFFFFFFFF` = -1 (signed) or 4294967295 (unsigned) |
| Single element array | XOR-based problems should still work: `0 ^ x = x` |
| Large n for bitmask | If n &gt; 20, bitmask enumeration is too slow — switch to backtracking or DP |
| Integer overflow | Use `long` for intermediate results; `Integer.MIN_VALUE` negation overflows |

### Bitwise operation cheat sheet

```
AND (&)  — useful for masking, clearing bits, checking if a bit is set
OR  (|)  — useful for setting bits, combining flags
XOR (^)  — useful for toggling, finding unique elements, swapping
NOT (~)  — useful for flipping all bits, two's complement negation
<<       — multiply by 2^k, create masks
>>       — divide by 2^k (floor), preserve sign
>>>      — logical right shift (Java-specific), zero-fill from left
```

### When to reach for bit manipulation

1. The problem mentions "without extra space" or "O(1) space" — XOR tricks eliminate HashMaps.
2. The problem involves subsets of a small set (n &le; 20) — bitmask enumeration.
3. The problem involves pairing or cancellation — XOR's self-inverse property.
4. The problem asks about binary representations directly (reverse bits, count 1s).
5. The problem restricts arithmetic operators — simulate with bitwise ops.

---

**Next week:** Week 15 covers **Math and Geometry** — modular arithmetic, GCD/LCM, prime sieve, matrix operations, and geometric reasoning.
