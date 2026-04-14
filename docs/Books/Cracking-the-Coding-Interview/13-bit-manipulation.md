# Chapter 5 — Bit Manipulation

> Bit manipulation is the art of using binary representations and bitwise operations to solve problems with extreme efficiency. While it appears niche, bit-level thinking shows up frequently in interviews — often as the clever "aha" insight that turns an O(N) solution into O(1).

---

## Binary Representation

Every integer is stored as a sequence of bits. Understanding how to read and manipulate these bits is fundamental.

```
Decimal 13 in binary:

  Bit position:  7   6   5   4   3   2   1   0
  Value:         128 64  32  16  8   4   2   1
  Bits:          0   0   0   0   1   1   0   1
                                 8 + 4     + 1 = 13
```

### Converting Between Decimal and Binary

```
Decimal → Binary (divide by 2, track remainders):
  13 / 2 = 6 remainder 1
   6 / 2 = 3 remainder 0
   3 / 2 = 1 remainder 1
   1 / 2 = 0 remainder 1
  Read bottom-up: 1101

Binary → Decimal (multiply by position value):
  1101 = 1×8 + 1×4 + 0×2 + 1×1 = 13
```

---

## Bitwise Operators

| Operator | Symbol | Description | Example (6 & 3) |
|----------|--------|-------------|-----------------|
| AND | `&` | 1 if both bits are 1 | `110 & 011 = 010` (2) |
| OR | `\|` | 1 if either bit is 1 | `110 \| 011 = 111` (7) |
| XOR | `^` | 1 if bits differ | `110 ^ 011 = 101` (5) |
| NOT | `~` | Flip all bits | `~110 = ...001` (-7 in two's complement) |
| Left Shift | `<<` | Shift left, fill with 0s | `011 << 1 = 110` (3→6) |
| Right Shift | `>>` | Arithmetic shift right | `110 >> 1 = 011` (6→3) |
| Unsigned Right Shift | `>>>` | Logical shift right (Java) | Fill with 0s regardless of sign |

---

## Bit Facts and Tricks

These identities are the building blocks for bit manipulation problems:

```
┌──────────────────────────────────────────────────────┐
│  Essential Bit Identities                            │
│                                                      │
│  x ^ 0    = x           XOR with 0 keeps value      │
│  x ^ 1s   = ~x          XOR with all 1s flips bits  │
│  x ^ x    = 0           XOR with self cancels        │
│                                                      │
│  x & 0    = 0           AND with 0 clears            │
│  x & 1s   = x           AND with all 1s keeps value  │
│  x & x    = x           AND with self keeps value    │
│                                                      │
│  x | 0    = x           OR with 0 keeps value        │
│  x | 1s   = 1s          OR with all 1s sets all      │
│  x | x    = x           OR with self keeps value     │
└──────────────────────────────────────────────────────┘
```

> These might seem trivial, but recognizing when to apply them is the key to solving bit manipulation problems efficiently.

---

## Two's Complement and Negative Numbers

In **two's complement**, the most significant bit (MSB) indicates the sign:

```
For a 4-bit system:
   0111 =  7   (largest positive)
   0110 =  6
   ...
   0001 =  1
   0000 =  0
   1111 = -1
   1110 = -2
   ...
   1001 = -7
   1000 = -8   (most negative)

Range for N bits: -2^(N-1) to 2^(N-1) - 1
For 32-bit int:   -2,147,483,648 to 2,147,483,647
```

### Computing Two's Complement

To negate a number: **flip all bits and add 1**.

```
  7 in binary:  0111
  Flip bits:    1000
  Add 1:        1001 → this is -7
  
  Verify: 0111 + 1001 = 10000 (overflow discarded) = 0000 ✓
```

---

## Arithmetic vs Logical Right Shift

### Arithmetic Right Shift (`>>`)

Shifts right, filling with the **sign bit**. Preserves the sign of the number.

```
-8 in binary (8-bit):  1111 1000
-8 >> 1:               1111 1100  →  -4
-8 >> 2:               1111 1110  →  -2
```

### Logical Right Shift (`>>>` in Java)

Shifts right, always filling with **0**. Treats the number as unsigned.

```
-8 in binary (8-bit):  1111 1000
-8 >>> 1:              0111 1100  →  124 (in 8-bit)
```

> In Java, `>>` is arithmetic, `>>>` is logical. In Python, `>>` is arithmetic (integers have arbitrary precision). In C/C++, right shift of negative numbers is implementation-defined.

---

## Common Bit Tasks

### Get Bit

Check if the i-th bit is set:

```java
boolean getBit(int num, int i) {
    return (num & (1 << i)) != 0;
}
```

```
num = 13 (1101), i = 2
1 << 2  = 0100
1101 & 0100 = 0100 ≠ 0 → bit 2 is set ✓
```

### Set Bit

Set the i-th bit to 1:

```java
int setBit(int num, int i) {
    return num | (1 << i);
}
```

```
num = 9 (1001), i = 2
1 << 2  = 0100
1001 | 0100 = 1101 = 13
```

### Clear Bit

Clear the i-th bit (set to 0):

```java
int clearBit(int num, int i) {
    int mask = ~(1 << i);
    return num & mask;
}
```

```
num = 13 (1101), i = 2
1 << 2  = 0100
~0100   = 1011
1101 & 1011 = 1001 = 9
```

### Clear All Bits from MSB Through i (Inclusive)

```java
int clearBitsMSBThroughI(int num, int i) {
    int mask = (1 << i) - 1;
    return num & mask;
}
```

### Clear All Bits from i Through 0 (Inclusive)

```java
int clearBitsIThrough0(int num, int i) {
    int mask = (-1 << (i + 1));
    return num & mask;
}
```

### Update Bit

Set the i-th bit to a specific value (0 or 1):

```java
int updateBit(int num, int i, boolean bitIs1) {
    int value = bitIs1 ? 1 : 0;
    int mask = ~(1 << i);
    return (num & mask) | (value << i);
}
```

---

## Bitmask Patterns

### Using Bits as a Set

Each bit represents the presence or absence of an element. Useful for subsets of small sets.

```java
// Iterate all subsets of {0, 1, ..., n-1}
for (int mask = 0; mask < (1 << n); mask++) {
    for (int i = 0; i < n; i++) {
        if ((mask & (1 << i)) != 0) {
            // element i is in this subset
        }
    }
}
```

> For a set of N elements, there are 2^N subsets. This approach works well for N ≤ 20.

### Isolate the Lowest Set Bit

```java
int lowestBit = x & (-x);
```

```
x    = 1010 1000
-x   = 0101 1000
x&-x = 0000 1000  ← lowest set bit isolated
```

### Remove the Lowest Set Bit

```java
x = x & (x - 1);
```

```
x     = 1010 1000
x-1   = 1010 0111
x&x-1 = 1010 0000  ← lowest set bit removed
```

### Check If Power of 2

A number is a power of 2 if it has exactly one set bit:

```java
boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
```

---

## Bit Counting (Brian Kernighan's Algorithm)

Count the number of set bits (1s) in an integer:

```java
int countBits(int n) {
    int count = 0;
    while (n != 0) {
        n = n & (n - 1);  // remove lowest set bit
        count++;
    }
    return count;
}
```

Each iteration removes one set bit, so this runs in O(number of set bits) — much faster than checking all 32 bits when the number has few set bits.

---

## XOR Tricks for Interviews

### Find the Single Number

Given an array where every element appears twice except one, find it:

```java
int singleNumber(int[] nums) {
    int result = 0;
    for (int num : nums) {
        result ^= num;
    }
    return result;
}
```

> Works because `a ^ a = 0` and `a ^ 0 = a`. All duplicates cancel out.

### Find Two Missing Numbers

If two numbers appear once and all others twice, XOR all elements to get `xor = a ^ b`. Find a set bit in `xor` (where a and b differ). Split numbers into two groups by that bit and XOR each group.

### Swap Without Temp Variable

```java
a = a ^ b;
b = a ^ b;  // b = (a^b)^b = a
a = a ^ b;  // a = (a^b)^a = b
```

---

## Interview Questions Overview

### 5.1 — Insertion

> Insert M into N at positions j through i.

```java
int insertion(int N, int M, int i, int j) {
    int allOnes = ~0;
    int left = allOnes << (j + 1);
    int right = (1 << i) - 1;
    int mask = left | right;
    return (N & mask) | (M << i);
}
```

### 5.2 — Binary to String

> Given a real number between 0 and 1 (e.g., 0.72) represented as a double, print the binary representation. If it cannot be represented accurately in 32 characters, return "ERROR".

**Approach:** Multiply by 2 repeatedly. If ≥ 1, the bit is 1 (subtract 1); if < 1, the bit is 0.

### 5.3 — Flip Bit to Win

> Find the length of the longest sequence of 1s you could create by flipping exactly one bit from 0 to 1.

**Approach:** Walk through the bits, tracking the current and previous run lengths. When you hit a 0, check if merging previous + 1 + current would be longest.

### 5.4 — Next Number

> Given a positive integer, find the next largest and next smallest number with the same number of 1 bits.

**Approach (next largest):** Find the rightmost non-trailing 0, set it to 1, clear all bits to the right, then put the correct number of 1s at the far right.

### 5.5 — Debugger

> Explain what `(n & (n - 1)) == 0` checks.

It checks if n is a power of 2 (or 0). `n & (n-1)` removes the lowest set bit; if the result is 0, there was only one set bit.

### 5.6 — Conversion

> Determine the number of bits you need to flip to convert integer A to integer B.

```java
int bitsToFlip(int a, int b) {
    int count = 0;
    for (int c = a ^ b; c != 0; c = c & (c - 1)) {
        count++;
    }
    return count;
}
```

XOR gives 1s exactly where bits differ. Count those 1s.

### 5.7 — Pairwise Swap

> Swap odd and even bits with as few operations as possible.

```java
int pairwiseSwap(int x) {
    return ((x & 0xAAAAAAAA) >>> 1) | ((x & 0x55555555) << 1);
}
```

`0xAA...` masks even bits, `0x55...` masks odd bits. Shift each group to swap.

### 5.8 — Draw Line

> Draw a horizontal line on a monochrome screen represented as a byte array.

Set full bytes to `0xFF` in the middle, and mask the partial bytes at the start and end of the line.

---

## Quick Reference

| Task | Code |
|------|------|
| Get bit i | `(num >> i) & 1` |
| Set bit i | `num \| (1 << i)` |
| Clear bit i | `num & ~(1 << i)` |
| Toggle bit i | `num ^ (1 << i)` |
| Lowest set bit | `num & (-num)` |
| Clear lowest set bit | `num & (num - 1)` |
| All 1s of length k | `(1 << k) - 1` |
| Is power of 2? | `(n & (n-1)) == 0` |
| Count set bits | Brian Kernighan loop |
| Swap values | `a^=b; b^=a; a^=b;` |

---

## Key Takeaways

1. **XOR is your most versatile bit operator** — it cancels duplicates, detects differences, and swaps values
2. **`n & (n-1)` removes the lowest set bit** — this single trick solves many problems
3. **Bitmasks represent sets** — use them for subset enumeration when N ≤ 20
4. **Two's complement** means -1 is all 1s, and `-x = ~x + 1`
5. **Shift operations are multiplication/division by powers of 2** — `x << k` = x × 2^k, `x >> k` = x ÷ 2^k
6. **Think about each bit independently** — many bit problems decompose into per-bit analysis
7. **Practice by hand** — write out the bits, apply the operation, verify the result before coding
