# Chapter 6 — Math and Logic Puzzles

> Math and logic puzzles test your ability to break down ambiguous problems, recognize patterns, and reason through edge cases. The key is to develop a systematic approach — start talking, develop rules, and shift your thinking from "guess" to "strategy."

---

## Prime Numbers

### Divisibility

Every positive integer can be decomposed into a product of primes (Fundamental Theorem of Arithmetic):

```
84 = 2² × 3 × 7
```

To check if a number is prime, you only need to test divisors up to √N:

```java
boolean isPrime(int n) {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) return false;
    }
    return true;
}
```

> Why √N? If N = a × b and both a, b > √N, then a × b > N — contradiction. So at least one factor must be ≤ √N.

### Sieve of Eratosthenes

Find all primes up to N in O(N log log N) time.

```
Mark composites starting from each prime:

  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
  ✓  ✓  ✗  ✓  ✗  ✓  ✗  ✗  ✗  ✓  ✗  ✓  ✗  ✗  ✗  ✓  ✗  ✓  ✗

  p=2: cross out 4, 6, 8, 10, 12, 14, 16, 18, 20
  p=3: cross out 9, 15 (6, 12, 18 already crossed)
  p=5: nothing new ≤ 20 (5² = 25 > 20, so we stop)

  Primes: 2, 3, 5, 7, 11, 13, 17, 19
```

```java
boolean[] sieveOfEratosthenes(int max) {
    boolean[] isPrime = new boolean[max + 1];
    Arrays.fill(isPrime, true);
    isPrime[0] = isPrime[1] = false;

    for (int p = 2; p * p <= max; p++) {
        if (isPrime[p]) {
            for (int j = p * p; j <= max; j += p) {
                isPrime[j] = false;
            }
        }
    }
    return isPrime;
}
```

> Optimization: start crossing out from p² (not 2p) because smaller multiples were already handled by earlier primes.

---

## Probability

### Fundamental Rules

| Rule | Formula | When to Use |
|------|---------|-------------|
| P(A and B) independent | P(A) × P(B) | Events don't affect each other |
| P(A and B) dependent | P(A) × P(B\|A) | One event affects the other |
| P(A or B) | P(A) + P(B) − P(A and B) | Either event occurring |
| P(A or B) mutually exclusive | P(A) + P(B) | Events can't both occur |
| Complement | P(not A) = 1 − P(A) | Easier to compute the opposite |

### Bayes' Theorem

```
            P(B|A) × P(A)
P(A|B) = ─────────────────
               P(B)
```

**Example:** A test is 99% accurate. A disease affects 1 in 10,000 people. You test positive — what's the probability you have the disease?

```
P(Disease | Positive) = P(Positive | Disease) × P(Disease)
                        ─────────────────────────────────────
                                    P(Positive)

P(Positive) = P(Pos|Disease)×P(Disease) + P(Pos|Healthy)×P(Healthy)
            = 0.99 × 0.0001 + 0.01 × 0.9999
            = 0.000099 + 0.009999
            = 0.010098

P(Disease|Positive) = 0.000099 / 0.010098 ≈ 0.98%
```

> Even with a 99% accurate test, the probability of actually having a rare disease given a positive test is under 1%. This is the **base rate fallacy**.

### Independence vs Mutual Exclusivity

| Concept | Meaning | Example |
|---------|---------|---------|
| **Independent** | P(A\|B) = P(A) | Two coin flips |
| **Mutually exclusive** | P(A and B) = 0 | Rolling 3 and 5 on one die |

> Independent events CAN happen together. Mutually exclusive events CANNOT. These are different concepts — don't confuse them.

---

## Problem-Solving Framework

### Step 1: Start Talking

Don't sit in silence. Walk through your thought process, even if you're uncertain:

- Restate the problem in your own words
- Try small examples
- Identify what makes this problem hard

### Step 2: Develop Rules and Patterns

Look for structure by working through cases:

```
Example: "You have a 5-quart jug and a 3-quart jug. 
          How do you measure exactly 4 quarts?"

  Step 1: Fill 5-quart jug
  Step 2: Pour into 3-quart jug → 5 has 2, 3 has 3
  Step 3: Empty 3-quart jug
  Step 4: Pour 2 quarts from 5 into 3 → 5 has 0, 3 has 2
  Step 5: Fill 5-quart jug
  Step 6: Pour from 5 into 3 (has room for 1) → 5 has 4, 3 has 3 ✓
```

### Step 3: Worst Case Shifting (Minimax)

For many puzzle problems, think about what the **worst case** is and try to minimize it.

```
Example: "You have 2 eggs and a 100-floor building. Find the
          highest safe floor with minimum worst-case drops."

  Strategy: Binary search with 1 egg → too risky (egg breaks,
            must go linear from bottom)

  Optimal: Drop from floors N, N+(N-1), N+(N-1)+(N-2), ...
           Sum = N(N+1)/2 ≥ 100 → N = 14

  Drop at floors: 14, 27, 39, 50, 60, 69, 77, 84, 90, 95, 99, 100
  Worst case: 14 drops
```

### Step 4: Algorithm Approaches

If the puzzle has a computational solution, consider:
- **Exhaustive search** with pruning
- **Mathematical insight** (modular arithmetic, parity, symmetry)
- **Probability/expected value** computation

---

## Common Probability Questions

### Birthday Paradox

> How many people do you need in a room for a 50% chance that two share a birthday?

```
P(no match with k people) = 365/365 × 364/365 × 363/365 × ... × (365-k+1)/365

P(at least one match) = 1 - P(no match)

For k = 23: P(match) ≈ 50.7%
```

> Only 23 people needed for a 50% chance — far fewer than intuition suggests. This is because of the number of pairs: C(23,2) = 253 comparisons.

### Monty Hall Problem

> You pick door 1. Monty opens door 3 (which has a goat). Should you switch to door 2?

```
┌────────┬──────────────────────────┬──────────────────────────┐
│ Scenario│ Stay with Door 1        │ Switch to Door 2         │
├────────┼──────────────────────────┼──────────────────────────┤
│ Car at 1│ WIN  (prob 1/3)         │ LOSE (prob 1/3)          │
│ Car at 2│ LOSE (prob 1/3)         │ WIN  (prob 1/3)          │
│ Car at 3│ LOSE (prob 1/3)         │ WIN  (prob 1/3)          │
├────────┼──────────────────────────┼──────────────────────────┤
│ Total   │ Win prob: 1/3           │ Win prob: 2/3            │
└────────┴──────────────────────────┴──────────────────────────┘
```

**Always switch.** Switching wins 2/3 of the time.

> The key insight: Monty's reveal gives you information. He will never open the car door, so his action concentrates the remaining probability onto the other unopened door.

### Dice Problems

**Expected rolls to get a 6:**

```
E = 1/6 × 1 + 5/6 × (1 + E)
E = 1/6 + 5/6 + 5/6 × E
E - 5/6 × E = 1
1/6 × E = 1
E = 6
```

**Expected rolls to see all 6 faces (Coupon Collector):**

```
E = 6/6 + 6/5 + 6/4 + 6/3 + 6/2 + 6/1
  = 1 + 1.2 + 1.5 + 2 + 3 + 6
  = 14.7 rolls
```

---

## Modular Arithmetic

Useful for divisibility problems and cyclic patterns.

| Property | Formula |
|----------|---------|
| Addition | (a + b) mod m = ((a mod m) + (b mod m)) mod m |
| Multiplication | (a × b) mod m = ((a mod m) × (b mod m)) mod m |
| Subtraction | (a − b) mod m = ((a mod m) − (b mod m) + m) mod m |

### GCD and Euclidean Algorithm

```java
int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int lcm(int a, int b) {
    return a / gcd(a, b) * b;
}
```

---

## Combinatorics Basics

| Concept | Formula | Example |
|---------|---------|---------|
| Permutations (order matters) | n! / (n-r)! | Arrange 3 from 5: 60 |
| Combinations (order doesn't matter) | n! / (r! × (n-r)!) | Choose 3 from 5: 10 |
| Permutations with repetition | n^r | 3-digit PIN (0-9): 1000 |
| Stars and bars | C(n+k-1, k-1) | Distribute n items into k bins |

```
C(n, k) properties:
  C(n, 0) = C(n, n) = 1
  C(n, k) = C(n, n-k)                   (symmetry)
  C(n, k) = C(n-1, k-1) + C(n-1, k)    (Pascal's rule)
```

### Pascal's Triangle

```
Row 0:                 1
Row 1:               1   1
Row 2:             1   2   1
Row 3:           1   3   3   1
Row 4:         1   4   6   4   1
Row 5:       1   5  10  10   5   1

C(n, k) = value at row n, position k
```

---

## Interview Questions Overview

### 6.1 — The Heavy Pill

> You have 20 bottles of pills. 19 bottles have 1.0g pills; 1 has 1.1g pills. Given a scale you can use once, find the heavy bottle.

**Approach:** Take 1 pill from bottle 1, 2 from bottle 2, ... 20 from bottle 20. Weigh all. Expected weight = 1+2+...+20 = 210g. Excess weight ÷ 0.1 = heavy bottle number.

### 6.2 — Basketball

> Game 1: one shot. Game 2: 2 of 3 shots. If p < 0.5, which game should you play?

```
Game 1: P(win) = p
Game 2: P(win) = 3p² - 2p³   (at least 2 of 3)

For p < 0.5: Game 1 is better (p > 3p² - 2p³)
For p > 0.5: Game 2 is better
For p = 0.5: Equal
```

### 6.3 — Dominos

> An 8×8 chessboard with two diagonally opposite corners removed. Can you cover it with 31 dominoes (each covering 2 squares)?

**No.** Each domino covers one black and one white square. The removed corners are the same color, leaving 30 of one color and 32 of the other. Impossible to pair evenly.

### 6.4 — Ants on a Triangle

> 3 ants on vertices of a triangle. Each randomly picks a direction. What's the probability of no collision?

Each ant chooses clockwise or counterclockwise (1/2 each). No collision only if all go the same way: P = 2 × (1/2)³ = 1/4.

### 6.5 — Jugs of Water

> Measure exactly 4 quarts using 5-quart and 3-quart jugs. See the solution above.

### 6.6 — Blue-Eyed Island

> 100 people on an island. All have blue eyes but don't know their own eye color. If you know your eyes are blue, you must leave. A visitor says "I see someone with blue eyes." What happens?

On day 100, all 100 leave. This is proven by induction from the base case of 1 person.

### 6.7 — The Apocalypse

> Every family continues having children until they have a girl, then stops. What's the expected gender ratio?

**50/50.** Each birth is independently 50% boy, 50% girl. The stopping rule doesn't change the per-birth probability.

### 6.8 — The Egg Drop Problem

> Find the critical floor with 2 eggs and N floors, minimizing worst-case drops.

See the minimax approach above. Answer: ~√(2N) drops. For 100 floors: 14 drops.

### 6.9 — 100 Lockers

> 100 lockers, 100 students. Student i toggles every i-th locker. Which lockers remain open?

Locker k is toggled once for each of its divisors. Open if toggled an odd number of times → perfect squares have an odd number of divisors.

**Open lockers:** 1, 4, 9, 16, 25, 36, 49, 64, 81, 100.

### 6.10 — Poison

> 1000 bottles, one is poisoned. You have 10 test strips with binary results (positive/negative) after 7 days. Find the poisoned bottle in one round.

Use **binary encoding.** Number bottles 0-999. Each test strip represents a bit position. Put a drop from bottle B on strip i if bit i of B is 1. The binary result across all 10 strips gives the bottle number.

```
10 bits → 2^10 = 1024 > 1000 bottles ✓
```

---

## Key Takeaways

1. **Start talking** — silence is the enemy in puzzle interviews; verbalize your reasoning
2. **Try small examples** — patterns almost always emerge from N=1, N=2, N=3
3. **Think about invariants** — what stays true regardless of the strategy? (domino problem: color parity)
4. **Use complementary probability** — P(at least one) = 1 - P(none) is often simpler
5. **Binary encoding** solves many "identify one among many" problems
6. **Minimax for worst case** — optimize for the worst scenario, not the average
7. **Don't forget base rates** — Bayes' theorem catches almost everyone off guard
8. **Induction** works for many puzzle proofs — verify base case, assume k, prove k+1
