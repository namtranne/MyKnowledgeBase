---
sidebar_position: 17
title: "Week 16: Number Theory + Modular Arithmetic"
---

import AlgoViz from '@site/src/components/AlgoViz';

# Week 16: Number Theory + Modular Arithmetic

Number theory is the backbone of countless competitive programming and interview problems. Topics like modular arithmetic, prime factorization, and GCD appear in disguise across combinatorics, hashing, cryptography, and counting problems. This week provides a ground-up treatment — no prior exposure assumed.

<AlgoViz
  title="Sieve of Eratosthenes — Prime Marking"
  description="Watch how the sieve eliminates composite numbers, leaving only primes."
  steps={[
    { label: "Initialize", description: "All numbers 2 through 30 start as prime candidates", highlights: "2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30" },
    { label: "p = 2", description: "2 is prime. Mark multiples of 2 starting from 4: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30", primes: "2", composites: "4,6,8,10,12,14,16,18,20,22,24,26,28,30" },
    { label: "p = 3", description: "3 is prime. Mark multiples of 3 starting from 9: 9, 15, 21, 27", primes: "2,3", composites: "4,6,8,9,10,12,14,15,16,18,20,21,22,24,25,26,27,28,30" },
    { label: "p = 5", description: "5 is prime. Mark 25 (only new composite, since 5 squared equals 25)", primes: "2,3,5", composites: "4,6,8,9,10,12,14,15,16,18,20,21,22,24,25,26,27,28,30" },
    { label: "Complete", description: "p squared exceeds 30 — sieve done. Primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29", primes: "2,3,5,7,11,13,17,19,23,29", composites: "4,6,8,9,10,12,14,15,16,18,20,21,22,24,25,26,27,28,30" }
  ]}
/>

---

## Core Theory

### 1. Sieve of Eratosthenes

**Why this technique exists.** Testing each number individually for primality costs O(sqrt(n)) per number, giving O(N * sqrt(N)) to find all primes up to N. For N = 10 million, that is about 30 billion operations. The sieve flips the approach: instead of asking "is this number prime?", it says "for each known prime p, mark all its multiples as composite." Each composite number gets marked only by its smallest prime factor, and the harmonic sum of markings converges to O(N log log N) -- practically linear. This is one of the oldest algorithms in mathematics (circa 240 BC) and remains the fastest practical method for bulk prime generation.

**The intuition.** Imagine writing all numbers 2 through N on a chalkboard. Start at 2 (the first prime). Circle it, then cross out 4, 6, 8, 10, ... (all multiples of 2). Move to 3 -- it is not crossed out, so circle it, then cross out 9, 12, 15, ... (starting from 3 squared, since smaller multiples were already handled by 2). Continue until you pass sqrt(N). Every uncrossed number is prime. The "start from i squared" optimization is crucial: every composite number i*k where k is less than i was already crossed out by the prime factor of k.

**Interview signals.** Look for: (1) "find all primes up to N," (2) problems involving prime factorization of many numbers (build an SPF sieve instead), (3) "count primes less than N" (LC 204), (4) union-find problems grouped by common prime factors.

**Common mistakes.** (1) Using `int` for `i * i` without a cast — when `i` is near `sqrt(Integer.MAX_VALUE)`, the product overflows. Always cast: `(long) i * i <= n`. (2) Starting the inner loop at `2 * i` instead of `i * i` — this is correct but wastes time, since multiples below `i * i` are already marked by smaller primes. (3) Allocating the sieve array with size `n` instead of `n + 1`, causing an off-by-one when `n` itself needs to be checked.

The Sieve of Eratosthenes finds **all prime numbers up to N** in O(N log log N) time — nearly linear.

**How it works:**
1. Create a boolean array `isPrime[0..N]`, initialized to `true`.
2. Mark `isPrime[0]` and `isPrime[1]` as `false`.
3. For each number `i` from 2 to √N: if `isPrime[i]` is `true`, mark all multiples of `i` (starting from i²) as `false`.
4. All indices still marked `true` are prime.

**Why start from i²?** Every composite number `i*k` where `k < i` has already been marked by a smaller prime factor.

```java
import java.util.*;

static boolean[] sieveOfEratosthenes(int n) {
    boolean[] isPrime = new boolean[n + 1];
    Arrays.fill(isPrime, true);
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; (long) i * i <= n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j <= n; j += i) {
                isPrime[j] = false;
            }
        }
    }
    return isPrime;
}

static List<Integer> listPrimes(int n) {
    boolean[] isPrime = sieveOfEratosthenes(n);
    List<Integer> primes = new ArrayList<>();
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) primes.add(i);
    }
    return primes;
}
```

**Complexity:** O(N log log N) time, O(N) space.

#### Segmented Sieve (for very large ranges)

When N is huge (e.g., 10¹²) but the range `[L, R]` is small (R − L ≤ 10⁶), we can't allocate an array of size N. Instead:

1. Use a regular sieve to find all primes up to √R.
2. Create a boolean array for the segment `[L, R]`.
3. For each small prime `p`, mark its multiples within `[L, R]`.

```java
static List<Integer> segmentedSieve(int lo, int hi) {
    int limit = (int) Math.sqrt(hi) + 1;
    List<Integer> smallPrimes = listPrimes(limit);

    int size = hi - lo + 1;
    boolean[] isPrimeSeg = new boolean[size];
    Arrays.fill(isPrimeSeg, true);
    for (int v = lo; v < Math.min(2, hi + 1); v++) {
        if (v >= 0) isPrimeSeg[v - lo] = false;
    }

    for (int p : smallPrimes) {
        int start = Math.max(p * p, ((lo + p - 1) / p) * p);
        for (int j = start; j <= hi; j += p) {
            if (j != p) isPrimeSeg[j - lo] = false;
        }
    }

    List<Integer> result = new ArrayList<>();
    for (int i = 0; i < size; i++) {
        if (isPrimeSeg[i] && lo + i >= 2) result.add(lo + i);
    }
    return result;
}
```

---

### 2. Prime Factorization

**Why this technique exists.** The Fundamental Theorem of Arithmetic guarantees that every integer greater than 1 has a unique prime factorization. This factorization is the key to computing divisor counts, divisor sums, Euler's totient, LCM of arrays, and solving problems where numbers are grouped by shared factors. Two approaches exist: trial division (O(sqrt(n)) per number, no preprocessing) and smallest-prime-factor sieve (O(N log log N) preprocessing, then O(log n) per factorization). Choose based on whether you factorize one number or many.

**Interview signals.** Look for: (1) "count divisors" or "number of factors" (product of `(exponent + 1)` for each prime factor), (2) "group numbers by common factor" (factorize + union-find), (3) "sum of all divisors" (multiplicative function from factorization), (4) "reduce fraction" or "simplify ratio" (GCD via shared prime factors), (5) "minimum operations to reduce to 1" (sum of prime factors).

**Common mistakes.** (1) Forgetting the remaining factor: after dividing by all primes up to sqrt(n), if `n > 1`, then `n` itself is a prime factor. (2) Using trial division inside a tight loop over a large array — build an SPF sieve instead for O(log n) per query. (3) Integer overflow when computing `d * d` in the loop condition — cast to `long`.

#### Method 1: Trial Division — O(√n) per number

Divide `n` by every integer from 2 up to √n. If `d` divides `n`, extract all factors of `d`, then move on.

```java
static Map<Integer, Integer> primeFactorsTrial(int n) {
    Map<Integer, Integer> factors = new HashMap<>();
    for (int d = 2; (long) d * d <= n; d++) {
        while (n % d == 0) {
            factors.merge(d, 1, Integer::sum);
            n /= d;
        }
    }
    if (n > 1) factors.merge(n, 1, Integer::sum);
    return factors;
}
```

#### Method 2: Smallest Prime Factor (SPF) Sieve — O(log n) per query

Precompute the smallest prime factor for every number up to N, then factorize any number ≤ N by repeatedly dividing by its SPF.

**When to use this template.** Reach for the SPF sieve when you need to factorize many numbers (e.g., every element in an array of size 10^5 with values up to 10^6). The O(N log log N) preprocessing cost is amortized across all queries, and each individual factorization takes only O(log n) — far faster than trial division's O(sqrt(n)) per number.

```java
static int[] buildSpf(int n) {
    int[] spf = new int[n + 1];
    for (int i = 0; i <= n; i++) spf[i] = i;
    for (int i = 2; (long) i * i <= n; i++) {
        if (spf[i] == i) { // i is prime
            for (int j = i * i; j <= n; j += i) {
                if (spf[j] == j) spf[j] = i;
            }
        }
    }
    return spf;
}

static Map<Integer, Integer> factorizeSpf(int n, int[] spf) {
    Map<Integer, Integer> factors = new HashMap<>();
    while (n > 1) {
        int p = spf[n];
        while (n % p == 0) {
            factors.merge(p, 1, Integer::sum);
            n /= p;
        }
    }
    return factors;
}
```

**Use case:** When you need to factorize many numbers (e.g., all elements of an array), build SPF once in O(N log log N), then factorize each in O(log n).

---

### 3. GCD & LCM

**Why this technique exists.** GCD is one of the most fundamental operations in number theory, with applications ranging from simplifying fractions to determining string periodicity to computing modular inverses (via Extended GCD). The Euclidean algorithm computes GCD in O(log(min(a, b))) by repeatedly replacing the larger number with its remainder when divided by the smaller — exponentially faster than factorizing both numbers and comparing factors.

**Interview signals.** Look for: (1) "greatest common divisor of strings" (GCD of string lengths + verification), (2) "simplify ratio" or "reduce fraction" (divide both by GCD), (3) "find modular inverse" (Extended Euclidean), (4) "LCM of an array" (iterative LCM via GCD), (5) "tiles" or "cutting" problems where you need the largest square that evenly divides a rectangle.

**Common mistakes.** (1) Computing LCM as `a * b / gcd(a, b)` instead of `a / gcd(a, b) * b` — the former overflows for large values. (2) Forgetting that `gcd(0, x) = x` and `gcd(0, 0) = 0` by convention. (3) Passing negative numbers to GCD without taking absolute values first — `(-6) % 4` gives `-2` in Java, which can break the algorithm.

#### Euclidean Algorithm

The greatest common divisor satisfies: **gcd(a, b) = gcd(b, a % b)**, with base case gcd(a, 0) = a.

```java
static int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```

**Complexity:** O(log(min(a, b))) — the number of steps is bounded by Fibonacci numbers.

#### LCM (Least Common Multiple)

$$\text{lcm}(a, b) = \frac{a \times b}{\gcd(a, b)}$$

Compute as `a / gcd(a, b) * b` to avoid overflow.

#### Extended Euclidean Algorithm

Finds integers `x, y` such that **ax + by = gcd(a, b)**.

This is the foundation for modular inverses and solving linear Diophantine equations.

**When to use this template.** Use Extended GCD when you need to find the modular inverse of `a` modulo a non-prime `m`, or when you need to solve linear Diophantine equations of the form `ax + by = c`. If the modulus is prime, Fermat's Little Theorem is simpler; otherwise, Extended GCD is the only option.

```java
static int[] extendedGcd(int a, int b) {
    // Returns {g, x, y} such that a*x + b*y = g = gcd(a, b)
    if (b == 0) return new int[]{a, 1, 0};
    int[] res = extendedGcd(b, a % b);
    int g = res[0], x1 = res[1], y1 = res[2];
    return new int[]{g, y1, x1 - (a / b) * y1};
}
```

**Trace example:** `extended_gcd(35, 15)`:
- `extended_gcd(35, 15)` → calls `extended_gcd(15, 5)`
- `extended_gcd(15, 5)` → calls `extended_gcd(5, 0)`
- `extended_gcd(5, 0)` → returns `(5, 1, 0)` → 5·1 + 0·0 = 5
- Back to `(15, 5)`: `g=5, x=0, y=1-3·0=1` → 15·0 + 5·1 = 5 ✓
- Back to `(35, 15)`: `g=5, x=1, y=0-2·1=-2` → 35·1 + 15·(−2) = 5 ✓

---

### 4. Modular Arithmetic

**Why this technique exists.** Many counting and combinatorics problems produce astronomically large answers (e.g., 2^100000). Modular arithmetic keeps intermediate values bounded — you can add, multiply, and exponentiate without ever exceeding 64-bit integers. The modulus 10^9 + 7 is chosen because it is prime (enabling Fermat-based inverses), fits in a 32-bit signed integer, and the product of two values under it fits in a 64-bit integer.

**Interview signals.** Look for: (1) "return the answer modulo 10^9 + 7" (modular arithmetic is required), (2) "compute a^b mod m" (binary exponentiation), (3) "number of ways" with large n (likely needs modular combination), (4) "large Fibonacci number mod m" (matrix exponentiation or Pisano period), (5) any problem where the answer can exceed 10^18.

**Common mistakes.** (1) Taking `(a - b) % m` without adding `m`, producing negative results in Java. Always use `((a - b) % m + m) % m`. (2) Performing `a * b % m` where `a * b` overflows a 64-bit `long` — if both `a` and `b` can each be up to 10^18, use BigInteger or 128-bit multiplication. (3) Dividing directly (`a / b % m`) instead of multiplying by the modular inverse (`a * modInverse(b, m) % m`).

When dealing with large numbers, we compute results modulo some value `m` (often 10⁹ + 7).

#### Key Properties

| Operation | Formula | Note |
|-----------|---------|------|
| Addition | (a + b) % m | Direct |
| Multiplication | (a × b) % m | Direct |
| Subtraction | (a − b + m) % m | Add m to handle negatives |
| Division | a × b⁻¹ % m | Requires modular inverse (see below) |

**Warning:** `(a - b) % m` can be negative in Java. Always add `m` first: `((a - b) % m + m) % m`.

#### Modular Exponentiation (Binary Exponentiation)

Compute **a^b mod m** in O(log b) by squaring:

- If b is even: a^b = (a^(b/2))²
- If b is odd: a^b = a · a^(b−1)

```java
static long modPow(long a, long b, long m) {
    long result = 1;
    a %= m;
    while (b > 0) {
        if ((b & 1) == 1) result = result * a % m;
        a = a * a % m;
        b >>= 1;
    }
    return result;
}
```

Java does not have a built-in modular exponentiation for primitives — use this `modPow` utility or `BigInteger.modPow()` for arbitrary-precision needs.

---

### 5. Modular Inverse

**Why this technique exists.** In modular arithmetic, division is not defined directly. You cannot compute `(a / b) % m` as `(a % m) / (b % m)` -- this gives wrong answers. Instead, you must find a number `b_inv` such that `b * b_inv is congruent to 1 (mod m)`, then compute `a * b_inv % m`. This arises constantly in combinatorics problems: computing C(n, k) mod p requires dividing by k! and (n-k)!, which means you need their modular inverses.

**Common misconception.** Students sometimes think modular inverse always exists. It only exists when gcd(a, m) = 1. When m is prime (the common case, e.g., 10^9 + 7), every nonzero a has an inverse. When m is not prime, some values have no inverse, and you must use Extended GCD to check.

**Interview signals.** Look for: (1) "compute nCr mod p" (requires inverse factorials), (2) "divide two numbers under modular arithmetic" (multiply by modular inverse), (3) "precompute inverse factorials" (build array using Fermat's theorem or iterative formula), (4) "probability mod prime" (express probability as `p * modInverse(q, MOD)`).

The **modular inverse** of `a` modulo `m` is a value `a⁻¹` such that:

$$a \cdot a^{-1} \equiv 1 \pmod{m}$$

It exists **if and only if** gcd(a, m) = 1 (a and m are coprime).

#### Method 1: Fermat's Little Theorem (m must be prime)

If `m` is prime and `a` is not divisible by `m`:

$$a^{-1} \equiv a^{m-2} \pmod{m}$$

```java
static long modInverseFermat(long a, long m) {
    // m must be prime
    return modPow(a, m - 2, m);
}
```

#### Method 2: Extended Euclidean Algorithm (works for any coprime a, m)

From `ax + my = gcd(a, m) = 1`, we get `ax ≡ 1 (mod m)`, so `x` is the inverse.

```java
static long modInverseExtGcd(long a, long m) {
    // gcd(a, m) must be 1
    int[] res = extendedGcd((int) (a % m), (int) m);
    if (res[0] != 1)
        throw new ArithmeticException("Inverse doesn't exist");
    return ((res[1] % m) + m) % m;
}
```

**When to use which:**
- m is prime (e.g., 10⁹+7) → Fermat is simpler
- m is not prime → must use Extended GCD
- Need many inverses → precompute inverse factorials (see combinatorics)

---

### 6. Euler's Totient Function φ(n)

**Why this technique exists.** Euler's totient function generalizes Fermat's Little Theorem to composite moduli. Knowing phi(n) lets you reduce large exponents modulo n: `a^k mod n = a^(k mod phi(n)) mod n` when `gcd(a, n) = 1`. It also counts the number of generators of the cyclic group Z/nZ, and appears in problems involving coprime counting, RSA cryptography, and reduced residue systems.

**Interview signals.** Look for: (1) "how many numbers in [1, n] are coprime to n" (direct totient), (2) "reduce a huge exponent modulo n" (Euler's theorem: `a^k mod n = a^(k mod phi(n)) mod n`), (3) "count fractions in lowest terms with denominator n" (equals phi(n)), (4) "sum of GCDs" problems (Euler's totient often appears in Mobius inversion formulas).

**Common mistakes.** (1) Applying Euler's theorem when `gcd(a, n) != 1` — the theorem only holds for coprime pairs. (2) Modifying `n` in-place during totient computation and then using the modified value — keep a copy of the original `n` for the final result. (3) Forgetting that `phi(1) = 1`, not 0.

**φ(n)** counts how many integers in `[1, n]` are coprime to `n`.

**Formula from prime factorization:**

$$\varphi(n) = n \prod_{p \mid n}\left(1 - \frac{1}{p}\right)$$

For example: φ(12) = 12 × (1 − 1/2) × (1 − 1/3) = 12 × 1/2 × 2/3 = 4. The four values coprime to 12 in [1,12] are `{1, 5, 7, 11}`.

```java
static int eulerTotient(int n) {
    int result = n;
    for (int d = 2; (long) d * d <= n; d++) {
        if (n % d == 0) {
            while (n % d == 0) n /= d;
            result -= result / d;
        }
    }
    if (n > 1) result -= result / n;
    return result;
}
```

**Euler's Theorem:** If gcd(a, n) = 1, then:

$$a^{\varphi(n)} \equiv 1 \pmod{n}$$

This generalizes Fermat's Little Theorem (where φ(p) = p − 1 for prime p).

**Application:** Reduce large exponents: a^k mod n = a^(k mod φ(n)) mod n (when gcd(a,n) = 1).

---

### 7. Chinese Remainder Theorem (CRT)

**Why this technique exists.** CRT allows you to solve a system of modular equations by working with smaller, independent moduli and combining results. Instead of computing directly modulo a large composite number M = m1 * m2 * ... * mk, you can compute modulo each mi separately (where arithmetic is simpler and overflow risk is lower) and then reconstruct the answer modulo M. This is the mathematical foundation behind multi-modulus hashing, RSA optimizations, and problems where the modulus has a known factorization.

**Interview signals.** Look for: (1) a non-prime modulus that factors into small primes (compute mod each factor, combine with CRT), (2) "find the smallest x satisfying multiple congruences" (direct CRT application), (3) "reconstruct a value from its remainders" (classic CRT), (4) problems like Super Pow (LC 372) where `1337 = 7 * 191`.

**Common mistakes.** (1) Applying CRT when the moduli are not pairwise coprime — the standard CRT requires coprimality; use the generalized version otherwise. (2) Integer overflow when computing the combined modulus `m1 * m2` — use `long` or BigInteger. (3) Forgetting to handle negative intermediate results from the Extended GCD step.

Given a system of congruences with pairwise coprime moduli:

$$x \equiv a_1 \pmod{m_1}, \quad x \equiv a_2 \pmod{m_2}$$

there exists a unique solution modulo m₁ · m₂.

```java
static long[] crtTwo(long a1, long m1, long a2, long m2) {
    int[] res = extendedGcd((int) m1, (int) m2);
    long g = res[0], p = res[1];
    if ((a2 - a1) % g != 0)
        throw new ArithmeticException("No solution exists");
    long lcm = m1 / g * m2;
    long solution = (a1 + m1 * ((a2 - a1) / g % (m2 / g) * p % (m2 / g))) % lcm;
    if (solution < 0) solution += lcm;
    return new long[]{solution, lcm};
}

static long[] crt(long[] remainders, long[] moduli) {
    long curA = remainders[0], curM = moduli[0];
    for (int i = 1; i < remainders.length; i++) {
        long[] r = crtTwo(curA, curM, remainders[i], moduli[i]);
        curA = r[0];
        curM = r[1];
    }
    return new long[]{curA, curM};
}
```

**Example:** x ≡ 2 (mod 3), x ≡ 3 (mod 5) → x = 8, combined modulus = 15. Check: 8 % 3 = 2 ✓, 8 % 5 = 3 ✓.

---

### 8. Other Theorems (Brief)

#### Wilson's Theorem

For prime p:

$$(p-1)! \equiv -1 \pmod{p}$$

**Use:** Primality test (theoretical — too slow in practice), computing factorials mod p.

#### Lucas' Theorem

For prime p and non-negative integers n, k:

$$\binom{n}{k} \equiv \prod_{i} \binom{n_i}{k_i} \pmod{p}$$

where n = Σ nᵢpⁱ and k = Σ kᵢpⁱ are base-p representations. Useful when p is small (e.g., p ≤ 10⁵) and n is huge.

```java
static long lucasComb(long n, long k, int p) {
    if (k == 0) return 1;
    return lucasComb(n / p, k / p, p)
         * smallComb((int) (n % p), (int) (k % p), p) % p;
}

static long smallComb(int n, int k, int p) {
    if (k > n) return 0;
    if (k == 0 || k == n) return 1;
    long num = 1, den = 1;
    for (int i = 0; i < k; i++) {
        num = num * (n - i) % p;
        den = den * (i + 1) % p;
    }
    return num * modPow(den, p - 2, p) % p;
}
```

#### Legendre's Formula

The highest power of prime p dividing n! is:

$$\sum_{i=1}^{\infty} \left\lfloor \frac{n}{p^i} \right\rfloor$$

```java
static int highestPowerInFactorial(int n, int p) {
    int count = 0;
    long pk = p;
    while (pk <= n) {
        count += (int) (n / pk);
        pk *= p;
    }
    return count;
}
```

**Classic application:** Trailing zeroes in n! = `highest_power_in_factorial(n, 5)` (since 2s are always more abundant than 5s).

---

## Worked Example: Modular Inverse of 3 mod 11

### Method 1: Fermat's Little Theorem

Since 11 is prime, 3⁻¹ ≡ 3^(11−2) ≡ 3⁹ (mod 11).

Compute 3⁹ mod 11 via binary exponentiation (9 = 1001₂):

| Step | b (binary) | Action | result | a |
|------|-----------|--------|--------|---|
| Init | 1001 | — | 1 | 3 |
| 1 | 1001 | b&1=1 → result = 1·3 = 3 | 3 | 3²=9 |
| 2 | 100 | b&1=0 → skip | 3 | 9²=81≡4 |
| 3 | 10 | b&1=0 → skip | 3 | 4²=16≡5 |
| 4 | 1 | b&1=1 → result = 3·5 = 15≡4 | 4 | 5²=25≡3 |

**Result:** 3⁻¹ ≡ 4 (mod 11). **Verify:** 3 × 4 = 12 ≡ 1 (mod 11) ✓

### Method 2: Extended Euclidean Algorithm

Find x, y such that 3x + 11y = 1.

| a | b | Quotient | Operation |
|---|---|----------|-----------|
| 11 | 3 | 3 | 11 = 3·3 + 2 |
| 3 | 2 | 1 | 3 = 2·1 + 1 |
| 2 | 1 | 2 | 2 = 1·2 + 0 |

Back-substitute:
- 1 = 3 − 2·1
- 1 = 3 − (11 − 3·3)·1 = 3·4 + 11·(−1)

So x = 4, meaning 3⁻¹ ≡ 4 (mod 11). **Same result.** ✓

---

## Pattern Recognition Guide

| Problem Clue | Technique | Why |
|---|---|---|
| "return answer modulo 10^9 + 7" | Modular arithmetic + mod inverse | Prime modulus enables Fermat-based inverse for division operations |
| "count divisors" or "number of factors" | Prime factorization | Divisor count = product of `(exponent + 1)` across all prime factors |
| "GCD of array" or "common factor" | Iterative Euclidean GCD | `gcd(a, b, c) = gcd(gcd(a, b), c)`; O(n log V) for n numbers of max value V |
| "compute a^b mod m" or "power mod" | Binary exponentiation | Squaring halves the exponent each step, giving O(log b) multiplications |
| "trailing zeroes in n!" | Legendre's formula with p = 5 | Count `floor(n/5) + floor(n/25) + ...` since factors of 2 always outnumber 5 |
| "n choose k mod prime" | Precomputed factorials + inverse factorials | O(n) precomputation enables O(1) per query via `fact[n] * invFact[k] * invFact[n-k]` |
| "coprime" or "relatively prime" count | Euler's totient function | phi(n) counts integers in `[1..n]` coprime to n using inclusion-exclusion on prime factors |
| "find all primes up to N" | Sieve of Eratosthenes | O(N log log N) marks composites by iterating over each prime's multiples |
| "group numbers by shared prime factor" | SPF sieve + Union-Find | Factorize each number in O(log n) via SPF, union elements sharing any prime |
| "solve system of modular equations" | Chinese Remainder Theorem | Combine independent congruences modulo coprime values into a single solution |
| "LCM of array elements" | Iterative LCM via GCD | `lcm(a,b) = a / gcd(a,b) * b`; divide first to avoid overflow |
| "huge exponent mod composite" | Euler's theorem + totient | Reduce exponent: `a^k mod n = a^(k mod phi(n)) mod n` when `gcd(a,n) = 1` |

---

## Pattern Recognition

| Pattern / Clue | Technique |
|----------------|-----------|
| "mod 10⁹+7" in the answer | Modular arithmetic; likely need mod inverse for division |
| "count divisors" / "number of factors" | Prime factorization → product of (exp+1) |
| "GCD of array" / "GCD of all pairs" | Iterative GCD; properties of GCD with subtraction |
| "compute a^b mod m" / "power mod" | Binary exponentiation |
| "n! mod p" / "factorial mod prime" | Precompute factorials + inverse factorials |
| "coprime" / "relatively prime" | GCD = 1; Euler's totient |
| "find all primes up to N" | Sieve of Eratosthenes |
| "trailing zeroes in factorial" | Legendre's formula with p=5 |
| "number of ways" with huge n, mod prime | nCr via factorial + inverse factorial arrays |

---

## Practice Problems (21 Problems)

### Day 1–2: Primes, GCD & Basic Number Theory (6 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 1 | Count Primes | Medium | Sieve of Eratosthenes | [LC 204](https://leetcode.com/problems/count-primes/) |
| 2 | Power of Two | Easy | Bit manipulation / repeated division | [LC 231](https://leetcode.com/problems/power-of-two/) |
| 3 | Power of Three | Easy | Log or max-power divisibility | [LC 326](https://leetcode.com/problems/power-of-three/) |
| 4 | Power of Four | Easy | Bit trick + mask | [LC 342](https://leetcode.com/problems/power-of-four/) |
| 5 | Ugly Number II | Medium | Min-heap or 3-pointer DP with primes `{2,3,5}` | [LC 264](https://leetcode.com/problems/ugly-number-ii/) |
| 6 | Greatest Common Divisor of Strings | Easy | GCD on string lengths + verification | [LC 1071](https://leetcode.com/problems/greatest-common-divisor-of-strings/) |

### Day 3–4: Modular Arithmetic & Factorization (8 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 7 | Super Pow | Medium | Modular exponentiation, process digit by digit | [LC 372](https://leetcode.com/problems/super-pow/) |
| 8 | Count Good Numbers | Medium | Binary exponentiation with mod | [LC 1922](https://leetcode.com/problems/count-good-numbers/) |
| 9 | Largest Component Size by Common Factor | Hard | Union-Find by prime factors (SPF sieve) | [LC 952](https://leetcode.com/problems/largest-component-size-by-common-factor/) |
| 10 | X of a Kind in a Deck of Cards | Easy | GCD of all group sizes ≥ 2 | [LC 914](https://leetcode.com/problems/x-of-a-kind-in-a-deck-of-cards/) |
| 11 | Smallest Value After Replacing With Sum of Prime Factors | Medium | Trial division + simulation until fixed point | [LC 2507](https://leetcode.com/problems/smallest-value-after-replacing-with-sum-of-prime-factors/) |
| 12 | Distinct Prime Factors of Product of Array | Medium | Collect all prime factors across array | [LC 2521](https://leetcode.com/problems/distinct-prime-factors-of-product-of-array/) |
| 13 | 2 Keys Keyboard | Medium | Sum of prime factors of n | [LC 650](https://leetcode.com/problems/2-keys-keyboard/) |
| 14 | Factorial Trailing Zeroes | Medium | Legendre's formula for p=5 | [LC 172](https://leetcode.com/problems/factorial-trailing-zeroes/) |

### Day 5–7: Advanced Modular Arithmetic & Counting (7 problems)

| # | Problem | Difficulty | Key Technique | Link |
|---|---------|------------|---------------|------|
| 15 | Closest Divisors | Medium | Iterate from √(n+1) downward | [LC 1362](https://leetcode.com/problems/closest-divisors/) |
| 16 | Minimum Lines to Represent a Line Chart | Medium | GCD-based slope comparison to avoid floats | [LC 2280](https://leetcode.com/problems/minimum-lines-to-represent-a-line-chart/) |
| 17 | Number of Pairs of Interchangeable Rectangles | Medium | GCD to reduce ratios, count pairs | [LC 2001](https://leetcode.com/problems/number-of-pairs-of-interchangeable-rectangles/) |
| 18 | Mirror Reflection | Medium | GCD + LCM to find which corner the ray hits | [LC 858](https://leetcode.com/problems/mirror-reflection/) |
| 19 | Preimage Size of Factorial Zeroes Function | Hard | Binary search + Legendre's formula | [LC 793](https://leetcode.com/problems/preimage-size-of-factorial-zeroes-function/) |
| 20 | Nth Magical Number | Hard | Binary search + LCM-based counting | [LC 878](https://leetcode.com/problems/nth-magical-number/) |
| 21 | Count Anagrams | Hard | Multinomial coefficient with mod inverse | [LC 2514](https://leetcode.com/problems/count-anagrams/) |

---

## Mock Interview

### Problem 1: Count Primes (LC 204)

**Interviewer:** Given an integer n, return the number of primes strictly less than n.

**Candidate approach:**

1. **Brute force:** For each number 2..n−1, check primality by trial division. O(n√n) — too slow for n = 5×10⁶.

2. **Optimal — Sieve of Eratosthenes:**

```java
public int countPrimes(int n) {
    if (n < 3) return 0;
    boolean[] isPrime = new boolean[n];
    Arrays.fill(isPrime, true);
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; (long) i * i < n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j < n; j += i) {
                isPrime[j] = false;
            }
        }
    }
    int count = 0;
    for (boolean p : isPrime) if (p) count++;
    return count;
}
```

**Complexity:** O(n log log n) time, O(n) space.

**Follow-up 1:** *What if n is 10¹⁰ and you need to count primes in [L, R] where R − L ≤ 10⁶?*

Use the **segmented sieve**: sieve primes up to √R (~10⁵), then create a boolean array for [L, R] and cross off multiples. Time: O(√R + (R−L) log log R), Space: O(√R + R−L).

**Follow-up 2:** *Can you optimize memory for the basic sieve?*

Use a **bitwise sieve** (bit array instead of bool array) — 8× less memory. Or sieve only odd numbers — 2× less memory plus 2× faster.

**Follow-up 3:** *How would you count primes in [1, 10¹²] exactly?*

Use the **Meissel–Lehmer algorithm** which computes π(n) in O(n^(2/3) / log n) time without enumerating all primes.

---

### Problem 2: Super Pow (LC 372)

**Interviewer:** Compute a^b mod 1337, where b is given as an array of digits (b can be enormous).

**Candidate approach:**

**Key insight:** Process b digit by digit from left to right. If b = [1, 5, 6, 4]:
- Start with result = 1
- Process 1: result = 1^10 &times; a^1 = a
- Process 5: result = a^10 &times; a^5 = a^15
- Process 6: result = (a^15)^10 &times; a^6 = a^156
- Process 4: result = (a^156)^10 &times; a^4 = a^1564

At each step: `result = result^10 * a^digit`, all mod 1337.

```java
public int superPow(int a, int[] b) {
    final int MOD = 1337;
    long result = 1;
    for (int digit : b) {
        result = modPow(result, 10, MOD) * modPow(a, digit, MOD) % MOD;
    }
    return (int) result;
}
```

**Complexity:** O(b.length) since each step does a constant-time `modPow(x, 10, m)` call.

**Follow-up 1:** *Why is 1337 chosen? Does CRT help?*

1337 = 7 × 191 (both prime). Compute a^b mod 7 and a^b mod 191 separately, then combine with CRT. This avoids potential issues and leverages Fermat's Little Theorem for each prime modulus:
- a^b mod 7: reduce b mod 6 (since φ(7)=6), then compute.
- a^b mod 191: reduce b mod 190 (since φ(191)=190), then compute.
- Combine with CRT.

**Follow-up 2:** *What if we needed a^b mod m where m is prime and b is enormous?*

Reduce the exponent: a^b mod m = a^(b mod (m−1)) mod m, by Fermat's Little Theorem. Compute b mod (m−1) from the digit array using Horner's method.

**Follow-up 3:** *What if a and m are not coprime?*

Fermat/Euler don't directly apply. Factor out common factors, or handle base cases where a^k ≡ 0 (mod some factor of m).

---

## Tips & Pitfalls

1. **Always mod at every step.** In expressions like `a * b % m`, intermediate `a * b` can overflow 64-bit integers. Use `(long)a * b % m` to ensure 64-bit arithmetic.

2. **Negative mod.** In Java, `(-3) % 7` gives `-3`, not `4`. Fix: `((a % m) + m) % m`.

3. **Precomputing factorials and inverse factorials** for nCr queries:
   ```java
   static final int MOD = 1_000_000_007;
   static final int MAX_N = 200_001;
   static long[] fact = new long[MAX_N];
   static long[] invFact = new long[MAX_N];
   static {
       fact[0] = 1;
       for (int i = 1; i < MAX_N; i++)
           fact[i] = fact[i - 1] * i % MOD;
       invFact[MAX_N - 1] = modPow(fact[MAX_N - 1], MOD - 2, MOD);
       for (int i = MAX_N - 2; i >= 0; i--)
           invFact[i] = invFact[i + 1] * (i + 1) % MOD;
   }

   static long nCr(int n, int r) {
       if (r < 0 || r > n) return 0;
       return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
   }
   ```

4. **Fermat vs. Extended GCD:** Fermat is simpler and sufficient for prime moduli (the common case). Extended GCD is needed for non-prime moduli.

5. **10⁹ + 7 is prime.** This is why it's the standard modulus — it allows Fermat-based modular inverse and fits in 32-bit signed integers (just barely: 10⁹+7 < 2³¹−1). The product of two values mod 10⁹+7 fits in a 64-bit integer.

6. **GCD of an array:** compute iteratively — `gcd(gcd(a₁, a₂), a₃, ...)`. If any element is 0, gcd(0, x) = x. GCD of an empty set is 0 by convention.

7. **Common trap with LCM:** computing `a * b / gcd(a, b)` can overflow. Compute `a / gcd(a, b) * b` instead (divide first).
