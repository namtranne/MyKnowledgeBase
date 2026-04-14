---
sidebar_position: 16
title: "Week 15: Math + Geometry"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 15: Math + Geometry

Math and geometry problems are interview staples that test your ability to recognise number-theoretic patterns, exploit modular arithmetic, and manipulate 2-D grids in place. This week you will build a toolkit of classic algorithms — the **Sieve of Eratosthenes**, **GCD/LCM**, **fast exponentiation**, and **matrix transformations** — and practise applying them to 21 curated problems.

---

## 1 · Core Theory

### 1.1 Prime Numbers and the Sieve of Eratosthenes

**Why this technique exists.** Checking whether a single number is prime via trial division is O(sqrt n) — fine for one number, but if you need to identify all primes up to n, doing trial division for each number costs O(n * sqrt n). The Sieve of Eratosthenes solves this in O(n log log n), which is nearly linear, by eliminating multiples of each prime in bulk rather than testing each number individually.

**Intuition.** Imagine writing every number from 2 to n on a whiteboard. Start at 2 — it is prime. Now cross out every multiple of 2 (4, 6, 8, ...). Move to the next uncrossed number (3) — it is prime. Cross out its multiples (9, 12, 15, ...; note 6 is already crossed). Continue. By the time you reach sqrt(n), every composite number has been crossed out at least once. What remains are the primes.

**Interview signals.** "Count primes less than n," "find all prime factors," "check if numbers in a range are prime." Also appears indirectly in problems involving GCD, LCM, or modular arithmetic where you need to factor numbers.

**Common mistakes.** Starting the inner loop at `2*i` instead of `i*i` (wastes time on already-marked composites). Off-by-one in "count primes less than n" — do not include n itself. Using `int` for `i*i` when i is near sqrt(Integer.MAX_VALUE) — cast to `long` to avoid overflow.

A prime `p` has exactly two divisors: 1 and `p`. Trial division checks divisibility up to `sqrt(n)`, but when you need *all* primes up to `n` the **Sieve of Eratosthenes** is far superior.

**Algorithm:**

1. Create a boolean array `isPrime[0..n]` initialised to `true`.
2. Mark `isPrime[0]` and `isPrime[1]` as `false`.
3. For each `i` from 2 to `sqrt(n)`: if `isPrime[i]`, mark every multiple `i*i, i*i+i, …` as `false`.
4. All indices still marked `true` are prime.

**Why start marking at `i*i`?** Every composite `i*k` where `k` is smaller than `i` was already marked by the sieve pass for `k`.

```java
import java.util.*;

public static List<Integer> sieve(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, true);
    isPrime[0] = false;
    if (n >= 1) isPrime[1] = false;

    for (int i = 2; (long) i * i <= n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j <= n; j += i) {
                isPrime[j] = false;
            }
        }
    }

    List<Integer> primes = new ArrayList<>();
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) primes.add(i);
    }
    return primes;
}
```

| Step | Time | Space |
|---|---|---|
| Sieve of Eratosthenes | O(n log log n) | O(n) |
| Trial division for one number | O(sqrt n) | O(1) |

<AlgoViz
  title="Sieve of Eratosthenes: Find Primes up to 30"
  description="Mark composites by crossing out multiples of each prime starting from 2. After processing all primes up to sqrt(30), unmarked numbers are prime."
  steps={[
    { array: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], highlights: [], variables: { step: "Init", range: "2 to 30" }, explanation: "Initialise: all numbers 2-30 start as potentially prime. We will mark composites.", code: "boolean[] isPrime = new boolean[31]; Arrays.fill(isPrime, true);" },
    { array: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], highlights: [0], secondary: [2,4,6,8,10,12,14,16,18,20,22,24,26,28], variables: { prime: 2, marking: "4,6,8,10,12,14,16,18,20,22,24,26,28,30" }, explanation: "i=2 is prime. Mark multiples of 2 starting from 4: 4,6,8,10,12,14,16,18,20,22,24,26,28,30.", code: "for (int j = 4; j <= 30; j += 2) isPrime[j] = false;" },
    { array: [2,3,0,5,0,7,0,9,0,11,0,13,0,15,0,17,0,19,0,21,0,23,0,25,0,27,0,29,0], highlights: [1], secondary: [7,13,19,25], variables: { prime: 3, marking: "9,15,21,27" }, explanation: "i=3 is prime. Mark multiples of 3 starting from 9: 9,15,21,27. (6,12,... already marked by 2.)", code: "for (int j = 9; j <= 30; j += 3) isPrime[j] = false;" },
    { array: [2,3,0,5,0,7,0,0,0,11,0,13,0,0,0,17,0,19,0,0,0,23,0,25,0,0,0,29,0], highlights: [3], secondary: [23], variables: { prime: 5, marking: "25", note: "5*5=25 is the only new composite" }, explanation: "i=5 is prime. Start from 5*5=25. Mark 25. (All smaller multiples already crossed out.)", code: "for (int j = 25; j <= 30; j += 5) isPrime[j] = false;" },
    { array: [2,3,0,5,0,7,0,0,0,11,0,13,0,0,0,17,0,19,0,0,0,23,0,0,0,0,0,29,0], highlights: [], variables: { check: "i=6", "6*6": 36, note: "36 > 30, stop outer loop" }, explanation: "i=6: 6*6=36 > 30, so we stop. All composites up to 30 are now marked.", code: "// i * i > n, sieve complete" },
    { array: [2,3,0,5,0,7,0,0,0,11,0,13,0,0,0,17,0,19,0,0,0,23,0,0,0,0,0,29,0], highlights: [0,1,3,5,9,11,15,17,21,27], variables: { primes: "2,3,5,7,11,13,17,19,23,29", count: 10 }, explanation: "Primes up to 30: {2,3,5,7,11,13,17,19,23,29}. 10 primes found in O(n log log n) time.", code: "// Collect all i where isPrime[i] == true" }
  ]}
/>

### 1.2 GCD and LCM

The **greatest common divisor** (GCD) of two integers is computed efficiently with the **Euclidean algorithm**:

```
gcd(a, b) = gcd(b, a % b)   with base case gcd(a, 0) = a
```

The **least common multiple** follows directly:

```
lcm(a, b) = a / gcd(a, b) * b    // divide first to avoid overflow
```

```java
public static int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

public static long lcm(int a, int b) {
    return (long) a / gcd(a, b) * b;
}
```

| Operation | Time |
|---|---|
| Euclidean GCD | O(log(min(a, b))) |
| LCM via GCD | O(log(min(a, b))) |

<AlgoViz
  title="Euclidean Algorithm: GCD(48, 18)"
  description="Compute GCD using repeated modulo: gcd(a, b) = gcd(b, a % b) until b becomes 0. The remaining value of a is the GCD."
  steps={[
    { array: [48, 18], highlights: [0, 1], variables: { a: 48, b: 18, operation: "gcd(48, 18)" }, explanation: "Start: compute gcd(48, 18). We repeatedly replace (a, b) with (b, a % b) until b = 0.", code: "gcd(48, 18)" },
    { array: [18, 12], highlights: [0, 1], variables: { a: 18, b: 12, "48 % 18": 12, operation: "gcd(18, 12)" }, explanation: "Step 1: a=48, b=18. 48 % 18 = 12. Now compute gcd(18, 12).", code: "// 48 % 18 = 12 → gcd(18, 12)" },
    { array: [12, 6], highlights: [0, 1], variables: { a: 12, b: 6, "18 % 12": 6, operation: "gcd(12, 6)" }, explanation: "Step 2: a=18, b=12. 18 % 12 = 6. Now compute gcd(12, 6).", code: "// 18 % 12 = 6 → gcd(12, 6)" },
    { array: [6, 0], highlights: [0], variables: { a: 6, b: 0, "12 % 6": 0, operation: "gcd(6, 0)" }, explanation: "Step 3: a=12, b=6. 12 % 6 = 0. Now b = 0, so gcd = a = 6.", code: "// 12 % 6 = 0 → b == 0, return a" },
    { array: [6], highlights: [0], variables: { result: 6, steps: 3, lcm: "48/6*18 = 144" }, explanation: "GCD(48, 18) = 6. Only 3 iterations needed — O(log(min(a,b))). LCM = 48/6 * 18 = 144.", code: "return a; // 6" }
  ]}
/>

**GCD of Strings pattern:** `gcdOfStrings(s1, s2)` checks if the GCD-length substring divides both strings, analogous to numeric GCD.

### 1.3 Modular Arithmetic

Many problems (especially those involving large numbers) require answers modulo a prime `M` (commonly `1_000_000_007`).

**Key identities:**

| Rule | Formula |
|---|---|
| Addition | `(a + b) % M = ((a % M) + (b % M)) % M` |
| Multiplication | `(a * b) % M = ((a % M) * (b % M)) % M` |
| Subtraction | `(a - b) % M = ((a % M) - (b % M) + M) % M` |
| Division (M prime) | `(a / b) % M = (a * modPow(b, M-2, M)) % M` (Fermat's little theorem) |

Division under modulo uses the **modular inverse**: `b^(-1) mod M = b^(M-2) mod M` when M is prime.

### 1.4 Fast Exponentiation (Binary Exponentiation)

Computing `base^exp % mod` naively is O(exp). **Binary exponentiation** reduces this to O(log exp) by squaring:

```java
public static long fastPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) {
            result = result * base % mod;
        }
        exp >>= 1;
        base = base * base % mod;
    }
    return result;
}
```

**How it works:** Express `exp` in binary. For each bit position, square the base; when the bit is 1, multiply into the result.

| Operation | Time | Space |
|---|---|---|
| Fast exponentiation | O(log exp) | O(1) |

<AlgoViz
  title="Fast Modular Exponentiation: 3^13 mod 1000"
  description="Compute 3^13 mod 1000 using binary exponentiation. Express exponent 13 in binary (1101), square the base each step, multiply into result when the bit is 1."
  steps={[
    { array: [1,1,0,1], highlights: [], labels: {"0":"bit3=1","1":"bit2=1","2":"bit1=0","3":"bit0=1"}, variables: { base: 3, exp: 13, "exp binary": "1101", mod: 1000, result: 1 }, explanation: "Compute 3^13 mod 1000. Exponent 13 = 1101 in binary. Process bits from LSB to MSB.", code: "long result = 1; long base = 3; long exp = 13;" },
    { array: [1,1,0,1], highlights: [3], variables: { "bit0": 1, base: 3, result: 3, exp: "13>>1 = 6", operation: "bit is 1 → result *= 3" }, explanation: "Bit 0 is 1: multiply result by base. result = 1 * 3 = 3. Square base: 3*3 = 9. Shift exp right.", code: "result = result * base % mod; // 3. base = base * base % mod; // 9" },
    { array: [1,1,0,1], highlights: [2], variables: { "bit1": 0, base: 9, result: 3, exp: "6>>1 = 3", operation: "bit is 0 → skip multiply" }, explanation: "Bit 1 is 0: do NOT multiply into result. Just square base: 9*9 = 81. Shift exp right.", code: "// bit is 0, skip. base = 9 * 9 % mod; // 81" },
    { array: [1,1,0,1], highlights: [1], variables: { "bit2": 1, base: 81, result: 243, exp: "3>>1 = 1", operation: "bit is 1 → result *= 81" }, explanation: "Bit 2 is 1: result = 3 * 81 = 243. Square base: 81*81 = 6561 mod 1000 = 561.", code: "result = 3 * 81 % mod; // 243. base = 81 * 81 % mod; // 561" },
    { array: [1,1,0,1], highlights: [0], variables: { "bit3": 1, base: 561, result: "243*561 mod 1000", exp: "1>>1 = 0", operation: "bit is 1 → result *= 561" }, explanation: "Bit 3 is 1: result = 243 * 561 = 136323 mod 1000 = 323. Exp becomes 0, done.", code: "result = 243 * 561 % mod; // 323" },
    { array: [1,1,0,1], highlights: [0,1,2,3], variables: { result: 323, "3^13": 1594323, "3^13 mod 1000": 323, iterations: 4 }, explanation: "3^13 = 1594323. 1594323 mod 1000 = 323. Computed in only 4 iterations instead of 13 — O(log n).", code: "return result; // 323" }
  ]}
/>

### 1.5 Matrix Operations

**Why matrix manipulation matters.** Matrix problems test spatial reasoning — your ability to think in two dimensions, perform coordinate transformations, and manipulate data in-place. They appear frequently as "warm-up" problems at top companies but also as components of harder problems (e.g., "largest rectangle" or "word search" on a grid). The in-place constraint (O(1) extra space) forces you to find clever swap patterns rather than copying to a new matrix.

**Intuition for rotation.** Rotating a matrix 90 degrees clockwise moves element `(i, j)` to position `(j, n-1-i)`. Rather than computing this mapping directly, the elegant two-step approach uses two simpler transformations that compose to produce the rotation: transpose (mirror across the main diagonal) followed by horizontal flip (reverse each row). Each step is easy to code, understand, and verify.

**Interview signals.** "Rotate the image in-place," "spiral order traversal," "set matrix zeroes with O(1) space." Any problem involving a square or rectangular grid where you must transform coordinates or traverse in a non-standard order.

#### Rotate a Matrix 90° Clockwise (In-Place)

The classic two-step trick for an `n x n` matrix:

1. **Transpose** the matrix (swap `matrix[i][j]` with `matrix[j][i]`).
2. **Reverse** each row.

```java
public static void rotate90Clockwise(int[][] matrix) {
    int n = matrix.length;
    // Transpose
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
        }
    }
    // Reverse each row
    for (int[] row : matrix) {
        int left = 0, right = row.length - 1;
        while (left < right) {
            int temp = row[left];
            row[left] = row[right];
            row[right] = temp;
            left++;
            right--;
        }
    }
}
```

For 90° **counter-clockwise**: transpose then reverse each *column* (or reverse each row first, then transpose).

#### Spiral Order Traversal

Walk the matrix in spiral order by maintaining four boundaries: `top`, `bottom`, `left`, `right`, and shrinking them inward.

```java
public static List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> result = new ArrayList<>();
    if (matrix.length == 0) return result;
    int top = 0, bottom = matrix.length - 1;
    int left = 0, right = matrix[0].length - 1;

    while (top <= bottom && left <= right) {
        for (int col = left; col <= right; col++)
            result.add(matrix[top][col]);
        top++;

        for (int row = top; row <= bottom; row++)
            result.add(matrix[row][right]);
        right--;

        if (top <= bottom) {
            for (int col = right; col >= left; col--)
                result.add(matrix[bottom][col]);
            bottom--;
        }

        if (left <= right) {
            for (int row = bottom; row >= top; row--)
                result.add(matrix[row][left]);
            left++;
        }
    }

    return result;
}
```

<AlgoViz
  title="Spiral Order Traversal: 3×3 Matrix"
  description="Walk a 3×3 matrix [[1,2,3],[4,5,6],[7,8,9]] in spiral order using four shrinking boundaries: top, bottom, left, right."
  steps={[
    { array: [1,2,3,4,5,6,7,8,9], highlights: [], variables: { top: 0, bottom: 2, left: 0, right: 2, result: "[]", matrix: "3×3" }, explanation: "Matrix: [[1,2,3],[4,5,6],[7,8,9]]. Initialize four boundaries: top=0, bottom=2, left=0, right=2.", code: "int top=0, bottom=2, left=0, right=2;" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [0,1,2], variables: { direction: "→ right along top row", top: 1, result: "[1,2,3]" }, explanation: "Traverse top row (row 0) left→right: collect 1, 2, 3. Then shrink: top++ → top=1.", code: "for (col=left; col<=right; col++) result.add(matrix[top][col]); top++;" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [5,8], variables: { direction: "↓ down along right col", right: 1, result: "[1,2,3,6,9]" }, explanation: "Traverse right column (col 2) top→bottom: collect 6, 9. Then shrink: right-- → right=1.", code: "for (row=top; row<=bottom; row++) result.add(matrix[row][right]); right--;" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [7,6], variables: { direction: "← left along bottom row", bottom: 1, result: "[1,2,3,6,9,8,7]" }, explanation: "Traverse bottom row (row 2) right→left: collect 8, 7. Then shrink: bottom-- → bottom=1.", code: "for (col=right; col>=left; col--) result.add(matrix[bottom][col]); bottom--;" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [3], variables: { direction: "↑ up along left col", left: 1, result: "[1,2,3,6,9,8,7,4]" }, explanation: "Traverse left column (col 0) bottom→top: collect 4. Then shrink: left++ → left=1.", code: "for (row=bottom; row>=top; row--) result.add(matrix[row][left]); left++;" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [4], variables: { top: 1, bottom: 1, left: 1, right: 1, result: "[1,2,3,6,9,8,7,4,5]" }, explanation: "Boundaries collapsed to single cell (1,1). Collect center element 5. top++ makes top > bottom, loop ends.", code: "result.add(matrix[1][1]); // 5, center element" },
    { array: [1,2,3,4,5,6,7,8,9], highlights: [0,1,2,5,8,7,6,3,4], variables: { result: "[1,2,3,6,9,8,7,4,5]", totalElements: 9 }, explanation: "Spiral order complete: [1,2,3,6,9,8,7,4,5]. O(m×n) time to visit every cell exactly once, O(1) extra space.", code: "return result; // [1,2,3,6,9,8,7,4,5]" }
  ]}
/>

#### Set Matrix Zeroes — In-Place O(1) Space

Use the first row and first column as markers:

1. Scan for zeroes; mark `matrix[i][0]` and `matrix[0][j]` when `matrix[i][j] == 0`.
2. Use a separate flag for whether the first row/column themselves should be zeroed.
3. Second pass: zero cells based on markers.
4. Finally, zero the first row/column if flagged.

### 1.6 Geometry Basics

#### Collinear Points

Three points `(x1,y1)`, `(x2,y2)`, `(x3,y3)` are collinear if the area of the triangle they form is zero:

```
x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2) == 0
```

Use this cross-product formulation instead of slope comparison to **avoid division by zero** and floating-point issues.

#### Slope Representation

To compare slopes without floating point, represent each slope as a reduced fraction `(dy, dx)` where the GCD has been divided out and the sign is normalised (e.g., `dx` is always non-negative).

```java
public static int[] normalisedSlope(int[] p1, int[] p2) {
    int dy = p2[1] - p1[1];
    int dx = p2[0] - p1[0];
    if (dx == 0) return new int[]{1, 0}; // vertical line
    if (dy == 0) return new int[]{0, 1}; // horizontal line
    int g = gcd(Math.abs(dy), Math.abs(dx));
    dy /= g;
    dx /= g;
    if (dx < 0) { dy = -dy; dx = -dx; }
    return new int[]{dy, dx};
}
```

#### Bounding Circle / Direction Patterns

Some geometry problems (like Robot Bounded in Circle) rely on simulating movement and detecting whether the robot returns to the origin or faces a non-north direction after one instruction cycle — guaranteeing a loop.

---

## 2 · Complexity Reference Table

| Algorithm / Technique | Time | Space |
|---|---|---|
| Sieve of Eratosthenes (up to n) | O(n log log n) | O(n) |
| Trial division | O(sqrt n) | O(1) |
| Euclidean GCD | O(log min(a,b)) | O(1) |
| Fast exponentiation | O(log exp) | O(1) |
| Matrix rotation (n x n) | O(n^2) | O(1) in-place |
| Spiral order traversal (m x n) | O(m * n) | O(1) extra |
| Set matrix zeroes | O(m * n) | O(1) in-place |
| Max points on a line (n points) | O(n^2) | O(n) |

## Pattern Recognition Guide

| If the problem says... | Think... | Template |
|---|---|---|
| "count primes less than n" | Sieve of Eratosthenes, mark composites | Sieve |
| "greatest common divisor of two numbers" | Euclidean algorithm: gcd(a, b) = gcd(b, a mod b) | GCD |
| "result modulo 10^9 + 7" | Apply mod at every multiply/add step; use modular inverse for division | Modular Arithmetic |
| "compute x^n efficiently" | Binary exponentiation: square and multiply | Fast Pow |
| "rotate matrix 90 degrees in place" | Transpose then reverse each row | Matrix Rotation |
| "spiral order traversal" | Four boundaries shrinking inward | Spiral Traversal |
| "set matrix zeroes with O(1) space" | Use first row/column as markers | Set Matrix Zeroes |
| "max points on a line" | For each anchor, hash slopes as reduced fractions | Slope Hashing |
| "does the robot return to origin?" | Simulate movement; check position and direction after one cycle | Robot Bounded |
| "GCD of two strings" | Check s1+s2 equals s2+s1, answer length is gcd(len1, len2) | GCD of Strings |

---

## 3 · Worked Example: Rotate Image (LeetCode 48)

**Why not brute force?** A brute-force approach creates a new n-by-n matrix, copies elements to their rotated positions, and then copies back — O(n^2) time and O(n^2) space. The in-place approach uses the observation that rotation equals transpose plus row reversal, reducing space to O(1) while keeping O(n^2) time.

**Key insight:** Two simple, well-understood operations (transpose and row reversal) compose to produce a complex transformation (90-degree rotation). This decomposition is easier to code and debug than directly computing the four-way cycle of each cell.

**Problem:** Given an `n x n` 2-D matrix representing an image, rotate it 90 degrees clockwise **in place**.

### Step-by-Step Trace

Starting matrix:

```
 1   2   3
 4   5   6
 7   8   9
```

**Step 1 — Transpose** (swap across the main diagonal):

```
Swap (0,1)↔(1,0):  1 4 3       Swap (0,2)↔(2,0):  1 4 7
                    2 5 6                            2 5 6
                    7 8 9                            3 8 9

Swap (1,2)↔(2,1):  1 4 7
                    2 5 8
                    3 6 9
```

After transpose:

```
 1   4   7
 2   5   8
 3   6   9
```

**Step 2 — Reverse each row:**

```
Row 0: [1, 4, 7] → [7, 4, 1]
Row 1: [2, 5, 8] → [8, 5, 2]
Row 2: [3, 6, 9] → [9, 6, 3]
```

Final result:

```
 7   4   1
 8   5   2
 9   6   3
```

This is the original matrix rotated 90° clockwise. Each element `matrix[i][j]` moves to position `matrix[j][n-1-i]`.

### Code

```java
public static void rotate(int[][] matrix) {
    int n = matrix.length;
    // Transpose
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int temp = matrix[i][j];
            matrix[i][j] = matrix[j][i];
            matrix[j][i] = temp;
        }
    }
    // Reverse each row
    for (int[] row : matrix) {
        int left = 0, right = row.length - 1;
        while (left < right) {
            int temp = row[left];
            row[left] = row[right];
            row[right] = temp;
            left++;
            right--;
        }
    }
}
```

**Complexity:** O(n^2) time, O(1) space.

### Alternative: Layer-by-Layer Rotation

Rotate four cells at a time, layer by layer from the outside in:

```java
public static void rotateLayers(int[][] matrix) {
    int n = matrix.length;
    for (int layer = 0; layer < n / 2; layer++) {
        int first = layer, last = n - 1 - layer;
        for (int i = first; i < last; i++) {
            int offset = i - first;
            int top = matrix[first][i];
            matrix[first][i] = matrix[last - offset][first];
            matrix[last - offset][first] = matrix[last][last - offset];
            matrix[last][last - offset] = matrix[i][last];
            matrix[i][last] = top;
        }
    }
}
```

<AlgoViz
  title="Rotate Image 90° Clockwise (3×3 Matrix)"
  description="Two-step in-place rotation: first transpose the matrix (swap across the diagonal), then reverse each row. Watch each swap as the matrix transforms."
  steps={[
    { array: [1,2,3,4,5,6,7,8,9], highlights: [], variables: { step: "Original", matrix: "[[1,2,3],[4,5,6],[7,8,9]]" }, explanation: "Starting 3×3 matrix. We will rotate 90° clockwise using transpose + row reversal.", code: "// Step 1: Transpose, Step 2: Reverse rows" },
    { array: [1,4,3,2,5,6,7,8,9], highlights: [1,3], variables: { step: "Transpose", swap: "(0,1)↔(1,0)", "matrix[0][1]": "2→4", "matrix[1][0]": "4→2" }, explanation: "Transpose: swap matrix[0][1]=2 with matrix[1][0]=4.", code: "int temp = matrix[0][1]; matrix[0][1] = matrix[1][0]; matrix[1][0] = temp;" },
    { array: [1,4,7,2,5,6,3,8,9], highlights: [2,6], variables: { step: "Transpose", swap: "(0,2)↔(2,0)", "matrix[0][2]": "3→7", "matrix[2][0]": "7→3" }, explanation: "Transpose: swap matrix[0][2]=3 with matrix[2][0]=7.", code: "int temp = matrix[0][2]; matrix[0][2] = matrix[2][0]; matrix[2][0] = temp;" },
    { array: [1,4,7,2,5,8,3,6,9], highlights: [5,7], variables: { step: "Transpose", swap: "(1,2)↔(2,1)", "matrix[1][2]": "6→8", "matrix[2][1]": "8→6" }, explanation: "Transpose: swap matrix[1][2]=6 with matrix[2][1]=8. Transpose complete!", code: "int temp = matrix[1][2]; matrix[1][2] = matrix[2][1]; matrix[2][1] = temp;" },
    { array: [7,4,1,2,5,8,3,6,9], highlights: [0,2], variables: { step: "Reverse Row 0", row: "[1,4,7]→[7,4,1]" }, explanation: "Reverse row 0: swap first and last elements. [1,4,7] becomes [7,4,1].", code: "// Reverse row 0: swap indices 0 and 2" },
    { array: [7,4,1,8,5,2,3,6,9], highlights: [3,5], variables: { step: "Reverse Row 1", row: "[2,5,8]→[8,5,2]" }, explanation: "Reverse row 1: swap first and last elements. [2,5,8] becomes [8,5,2].", code: "// Reverse row 1: swap indices 0 and 2" },
    { array: [7,4,1,8,5,2,9,6,3], highlights: [6,8], variables: { step: "Reverse Row 2", row: "[3,6,9]→[9,6,3]" }, explanation: "Reverse row 2: swap first and last elements. [3,6,9] becomes [9,6,3].", code: "// Reverse row 2: swap indices 0 and 2" },
    { array: [7,4,1,8,5,2,9,6,3], highlights: [0,1,2,3,4,5,6,7,8], variables: { step: "Done!", result: "[[7,4,1],[8,5,2],[9,6,3]]" }, explanation: "Rotation complete! The matrix has been rotated 90° clockwise in-place using O(1) extra space.", code: "// O(n²) time, O(1) space" }
  ]}
/>

---

## 4 · Problem Sets (21 problems / 3 days)

### Day 1 — Number Theory Fundamentals (7 problems)

| # | Problem | LeetCode | Difficulty | Key Technique |
|---|---|---|---|---|
| 1 | Fizz Buzz | 412 | Easy | Modular arithmetic |
| 2 | Count Primes | 204 | Medium | Sieve of Eratosthenes |
| 3 | Power of Three | 326 | Easy | Repeated division or log trick |
| 4 | Happy Number | 202 | Easy | Cycle detection (Floyd's or HashSet) |
| 5 | Plus One | 66 | Easy | Carry propagation |
| 6 | Factorial Trailing Zeroes | 172 | Medium | Count factors of 5 |
| 7 | Excel Sheet Column Number | 171 | Easy | Base-26 conversion |

**Day 1 Focus:** Get comfortable with divisibility checks, digit manipulation, and sieve-based counting. Pay attention to edge cases like `n = 0`, `n = 1`, and large numbers.

**Hints:**

- **Fizz Buzz:** straightforward modular checks — handle the "FizzBuzz" (divisible by both 3 and 5) case first.
- **Count Primes:** implement the sieve up to `n - 1`; don't include `n` itself. Watch the off-by-one.
- **Power of Three:** `3^19 = 1162261467` is the largest power of 3 fitting in a 32-bit int. Check if it divides `n`.
- **Happy Number:** sum of squared digits; detect cycles with a HashSet or fast/slow pointers.
- **Plus One:** iterate from the last digit; if every digit is 9, prepend a 1.
- **Factorial Trailing Zeroes:** count `n / 5 + n / 25 + n / 125 + …` (each power of 5 contributes an extra factor).
- **Excel Sheet Column Number:** `A=1, B=2, …, Z=26`. Process left to right: `result = result * 26 + (ch - 'A' + 1)`.

---

### Day 2 — Matrix and String Math (7 problems)

| # | Problem | LeetCode | Difficulty | Key Technique |
|---|---|---|---|---|
| 8 | Rotate Image | 48 | Medium | Transpose + reverse rows |
| 9 | Spiral Matrix | 54 | Medium | Four-boundary traversal |
| 10 | Set Matrix Zeroes | 73 | Medium | First row/col as markers |
| 11 | GCD of Strings | 1071 | Easy | Euclidean GCD on lengths |
| 12 | Ugly Number II | 264 | Medium | Three-pointer DP or PriorityQueue |
| 13 | Multiply Strings | 43 | Medium | Grade-school multiplication |
| 14 | Next Permutation | 31 | Medium | Find suffix, swap, reverse |

**Day 2 Focus:** Matrix manipulation in place and big-number string arithmetic. These are pattern-recognition problems — learn the standard algorithms and the edge cases will become mechanical.

**Hints:**

- **Rotate Image:** see the worked example above. The transpose-then-reverse trick is the cleanest approach.
- **Spiral Matrix:** maintain `top, bottom, left, right` boundaries. Check `top <= bottom` and `left <= right` before the bottom and left traversals to avoid double counting.
- **Set Matrix Zeroes:** use the matrix's own first row and first column as storage for zero flags. Track whether the first row and first column themselves need zeroing with separate booleans.
- **GCD of Strings:** if `s1 + s2` does not equal `s2 + s1`, return `""`. Otherwise the answer has length `gcd(s1.length(), s2.length())`.
- **Ugly Number II:** ugly numbers have only prime factors 2, 3, 5. Maintain three pointers `i2, i3, i5` into the result array and at each step pick the minimum of `ugly[i2]*2, ugly[i3]*3, ugly[i5]*5`. Advance all pointers that produced the minimum (to skip duplicates).
- **Multiply Strings:** simulate digit-by-digit multiplication into a result `int[]` of length `num1.length() + num2.length()`. Position `i * j` maps to result index `i + j + 1` (ones) and `i + j` (carry).
- **Next Permutation:** (1) scan right-to-left for the first drop `nums[i] < nums[i+1]`; (2) find the smallest element to the right of `i` that is larger than `nums[i]`, swap; (3) reverse the suffix after `i`.

---

### Day 3 — Advanced Math and Geometry (7 problems)

| # | Problem | LeetCode | Difficulty | Key Technique |
|---|---|---|---|---|
| 15 | Spiral Matrix II | 59 | Medium | Boundary fill with counter |
| 16 | Max Points on a Line | 149 | Hard | Slope hashing (reduced fractions) |
| 17 | Pow(x, n) | 50 | Medium | Binary exponentiation |
| 18 | Detect Squares | 2013 | Medium | Count complementary points |
| 19 | Super Pow | 372 | Medium | Modular exponentiation with array exponent |
| 20 | Robot Bounded in Circle | 1041 | Medium | Simulate and check direction |
| 21 | Integer to English Words | 273 | Hard | Chunk into thousands, recursive conversion |

**Day 3 Focus:** Geometry, advanced exponentiation, and tricky string formatting. These problems reward careful handling of edge cases (negative exponents, vertical lines, zero).

**Hints:**

- **Spiral Matrix II:** same boundary approach as Spiral Matrix but fill values `1..n^2` instead of reading.
- **Max Points on a Line:** for each point, hash slopes to all other points using reduced-fraction `int[]{dy, dx}` encoded as a string key. Track duplicates. Best per anchor + 1 (the anchor itself). O(n^2) overall.
- **Pow(x, n):** handle `n < 0` by computing `1.0 / pow(x, -n)`. Use binary exponentiation. Watch `n = Integer.MIN_VALUE` overflow — cast to `long` first.
- **Detect Squares:** store points in a HashMap of counts. For a query point `(qx, qy)`, iterate over all points `(px, py)` sharing the same x-coordinate. The side length is `Math.abs(qy - py)`. Check if the two complementary corners exist.
- **Super Pow:** exponent is given as an `int[]` of digits. Use the identity `a^1234 = (a^123)^10 * a^4`. Recurse and apply modular arithmetic at each step.
- **Robot Bounded in Circle:** simulate one pass of instructions. The robot is bounded if it returns to origin OR it is not facing north (any non-north direction guarantees the path loops within 4 cycles).
- **Integer to English Words:** chunk the number into groups of three digits (billions, millions, thousands, remainder). Convert each chunk with a helper. Handle zero, teens (11-19), and tens (20, 30, …) carefully.

---

## 5 · Mock Interviews

### Mock Interview 1 — Number Theory (45 min)

**Warm-up (5 min):** Fizz Buzz (LC 412)

- Implement the classic mod-based solution.
- **Follow-up 1:** How would you extend this to support arbitrary divisor-word pairs (e.g., 7 → "Bazz")? Avoid a chain of if-else.
- **Follow-up 2:** Can you solve it without using the modulo operator?

**Main Problem (25 min):** Count Primes (LC 204)

- Start by discussing brute-force trial division and its O(n * sqrt(n)) cost.
- Implement the Sieve of Eratosthenes.
- **Follow-up 1:** The sieve uses O(n) memory. How would you count primes up to 10^12? Discuss the segmented sieve.
- **Follow-up 2:** Modify your sieve to also compute the smallest prime factor for each number. How does this help with prime factorisation?
- **Follow-up 3:** How would you count primes in a range `[lo, hi]` without sieving from 0?

**Cool-down (15 min):** Factorial Trailing Zeroes (LC 172)

- Explain why trailing zeroes come from factors of 10 = 2 * 5, and why counting 5s suffices.
- **Follow-up 1:** Given an integer `K`, find the smallest `n` such that `n!` has exactly `K` trailing zeroes (or return -1 if impossible). Hint: binary search.
- **Follow-up 2:** How many trailing zeroes does `n!` have in base `b`?

---

### Mock Interview 2 — Matrix and Geometry (45 min)

**Warm-up (5 min):** Spiral Matrix (LC 54)

- Walk through the boundary shrinking approach.
- **Follow-up 1:** What changes for a non-square matrix (e.g., 3 x 5)?
- **Follow-up 2:** Given a spiral index `k`, return the `(row, col)` of the k-th element in spiral order in O(1).

**Main Problem (25 min):** Rotate Image (LC 48)

- Implement the transpose-then-reverse approach.
- **Follow-up 1:** Rotate 90° counter-clockwise in place. What changes?
- **Follow-up 2:** Rotate by 180° — find the simplest in-place method.
- **Follow-up 3:** The matrix is very large and stored on disk (doesn't fit in RAM). How would you rotate it? Discuss block-based transposition.

**Cool-down (15 min):** Robot Bounded in Circle (LC 1041)

- Simulate and check the condition.
- **Follow-up 1:** Prove mathematically why checking direction after one cycle is sufficient (hint: after 4 cycles the net rotation is always a multiple of 360°).
- **Follow-up 2:** Extend to 3-D: the robot can also pitch up and pitch down. How would you detect bounded motion?
- **Follow-up 3:** What if the instruction string can contain a "repeat N times" command? How does this change your detection?

---

## 6 · Tips and Edge Cases

### General Math Pitfalls

- **Integer overflow:** Java `int` is 32-bit. Use `long` for intermediate multiplication results. Apply modular arithmetic early to keep values small.
- **Negative numbers and modulo:** In Java, `-1 % 3 == -1`. Add `M` before taking mod if you need a positive result: `((a % M) + M) % M`.
- **Floating-point comparisons:** Avoid `==` with doubles. Use integer-only formulations (cross products instead of slope division, or `Math.abs(a - b) < 1e-9` as a last resort).
- **n = 0 and n = 1:** Many number theory problems have special-case answers for these inputs. Always test them.

### Prime Number Edge Cases

- `0` and `1` are **not** prime.
- `2` is the only even prime.
- "Count Primes less than n": `n` itself is excluded — watch the boundary.

### Matrix Edge Cases

- **Empty matrix** or single-row/single-column matrices.
- **1 x 1 matrix:** rotation and spiral should return the single element unchanged.
- **Non-square matrices:** rotation is typically defined only for square matrices (in-place). Spiral order works for any `m x n`.

### GCD / LCM Edge Cases

- `gcd(0, n) = n` and `gcd(0, 0) = 0` by convention.
- `lcm(0, n) = 0` — multiplying by 0 always gives 0.
- Always use `Math.abs()` when inputs can be negative.

### Exponentiation Edge Cases

- `x = 0, n = 0`: mathematically undefined; LeetCode typically defines `0^0 = 1`.
- `n` is negative: compute `1.0 / pow(x, -n)`. Beware `n = Integer.MIN_VALUE` (negating overflows in 32-bit) — cast to `long` first.
- `x = 1` or `x = -1`: short-circuit to avoid unnecessary computation.

### Geometry Edge Cases

- **All points identical:** max points on a line = total count.
- **Only two points:** always collinear.
- **Vertical lines:** slope is undefined — handle as a special `{1, 0}` canonical form.
- **Horizontal lines:** slope is `{0, 1}`.

### Problem-Specific Tips

| Problem | Watch Out For |
|---|---|
| Fizz Buzz | Check "FizzBuzz" (divisible by 15) before individual checks |
| Happy Number | Cycle detection — the sequence for non-happy numbers always loops |
| Plus One | All-nines input `[9,9,9]` becomes `[1,0,0,0]` |
| Multiply Strings | Leading zeroes in the result; the special case `"0" * anything = "0"` |
| Next Permutation | Already the largest permutation — reverse the entire array |
| Integer to English Words | Input `0` returns `"Zero"`; avoid trailing/leading/double spaces |
| Ugly Number II | Advance *all* matching pointers to avoid duplicates |
| Detect Squares | Axis-aligned squares only; side length must be positive |

---

**End of Week 15.** You now have a solid foundation in number theory and matrix manipulation. Next week dives into **Bit Manipulation + Advanced Math**, extending these ideas to binary representations and combinatorial identities.
