---
sidebar_position: 5
title: "04 — Testing Strategies"
slug: 04-testing-strategies
---

# 🧪 Testing Strategies

Testing is the engineering discipline that gives you **confidence to ship**. Senior engineers don't just write tests — they design **test strategies** that maximize signal while minimizing maintenance cost.

---

## 1. Testing Pyramid

The testing pyramid (Mike Cohn) guides the **ratio** of different test types.

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          Few, slow, expensive, brittle
                 ╱──────╲         ← Confidence in full user flows
                ╱        ╲
               ╱Integration╲     Moderate count, medium speed
              ╱──────────────╲   ← Confidence in component wiring
             ╱                ╲
            ╱    Unit Tests     ╲  Many, fast, cheap, stable
           ╱────────────────────╲ ← Confidence in logic correctness
          ╱                      ╲
         ╱________________________╲
```

### Recommended Ratios

| Level | % of Tests | Speed | Cost to Maintain | What It Validates |
|-------|:----------:|:-----:|:----------------:|-------------------|
| **Unit** | 70% | ⚡ ms | Low | Individual functions/methods in isolation |
| **Integration** | 20% | 🕐 seconds | Medium | Component wiring, DB queries, API contracts |
| **E2E** | 10% | 🐢 minutes | High | Full user journeys through the real system |

:::tip Senior-Level Insight
The pyramid is a **guideline**, not a law. For a UI-heavy app, you may want more E2E tests. For a data pipeline, integration tests may dominate. The key insight: **push tests as far down the pyramid as possible** — they're faster, cheaper, and more reliable there.
:::

### Alternative Models

| Model | Shape | Philosophy |
|-------|-------|-----------|
| **Testing Pyramid** | Triangle | Most tests at the unit level |
| **Testing Trophy** (Kent C. Dodds) | Trophy | Most tests at the integration level |
| **Testing Diamond** | Diamond | Thin unit + E2E, thick integration |
| **Testing Honeycomb** (Spotify) | Honeycomb | Focus on integration for microservices |

---

## 2. Unit Testing

Unit tests validate the smallest testable piece of code **in isolation**.

### AAA Pattern (Arrange-Act-Assert)

```java
@Test
void shouldApplyPercentageDiscount() {
    // Arrange
    Order order = new Order();
    order.addLine(new Product("Widget"), 2, Money.of(10.00));
    Discount discount = new PercentageDiscount(20); // 20% off

    // Act
    Money discounted = discount.apply(order.getSubtotal());

    // Assert
    assertThat(discounted).isEqualTo(Money.of(16.00));
}
```

### What to Unit Test

| Test ✅ | Don't Test ❌ |
|---------|--------------|
| Business logic and calculations | Getters/setters with no logic |
| Edge cases and boundary conditions | Framework code (Spring, Hibernate) |
| Error handling paths | Private methods directly (test via public API) |
| State transitions | Third-party library internals |
| Validation rules | Simple delegation methods |
| Algorithms and data transformations | Constructor assignments |

### Good Unit Test Properties (F.I.R.S.T.)

| Property | Meaning |
|----------|---------|
| **Fast** | Runs in milliseconds; no I/O, no network |
| **Independent** | No test depends on another; can run in any order |
| **Repeatable** | Same result every time; no randomness, no shared state |
| **Self-Validating** | Pass or fail — no manual inspection needed |
| **Timely** | Written close in time to the production code |

---

## 3. Mocking & Stubbing

### Test Doubles Comparison

| Double | Purpose | Behavior | Verification |
|--------|---------|----------|-------------|
| **Dummy** | Fill parameter lists | Does nothing | None |
| **Stub** | Provide canned answers | Returns predefined data | None |
| **Spy** | Record interactions + real behavior | Wraps real object | Interaction verification |
| **Mock** | Verify interactions | Programmed expectations | Asserts calls were made |
| **Fake** | Working implementation (simplified) | In-memory DB, fake SMTP | State verification |

### Stub Example

```java
@Test
void shouldCalculateOrderTotal() {
    // Stub — returns canned data, no verification
    TaxService taxStub = mock(TaxService.class);
    when(taxStub.getRate("CA")).thenReturn(new BigDecimal("0.0825"));

    OrderCalculator calc = new OrderCalculator(taxStub);
    Money total = calc.calculateTotal(order, "CA");

    assertThat(total).isEqualTo(Money.of(108.25));
}
```

### Mock Example

```java
@Test
void shouldPublishEventWhenOrderPlaced() {
    // Mock — verifies interaction
    EventPublisher mockPublisher = mock(EventPublisher.class);
    OrderService service = new OrderService(repo, mockPublisher);

    service.placeOrder(orderCommand);

    // Verify the event was published with correct data
    verify(mockPublisher).publish(argThat(event ->
        event instanceof OrderPlacedEvent &&
        ((OrderPlacedEvent) event).getOrderId().equals(orderId)
    ));
}
```

### Fake Example

```java
// Fake — a working but simplified implementation
public class InMemoryOrderRepository implements OrderRepository {
    private final Map<OrderId, Order> store = new ConcurrentHashMap<>();

    public void save(Order order) { store.put(order.getId(), order); }
    public Order findById(OrderId id) { return store.get(id); }
    public List<Order> findAll() { return List.copyOf(store.values()); }
}
```

### Over-Mocking Pitfalls

:::warning
**Over-mocking** is a common anti-pattern that makes tests fragile and tightly coupled to implementation:

1. **Mocking everything** — tests pass even when the system is broken
2. **Mocking what you don't own** — mock interfaces you control, not third-party classes
3. **Verification overload** — verifying every method call makes tests brittle
4. **Testing the mock** — the test proves the mock was configured correctly, not that the code works

**Rule of thumb:** Mock at architectural boundaries (ports), use fakes for infrastructure, test domain logic directly.
:::

---

## 4. Integration Testing

Integration tests validate that **components work together correctly** — database queries return expected results, APIs serialize/deserialize properly, and message consumers process events.

### Database Integration Test

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository repository;

    @Test
    void shouldPersistAndRetrieveOrder() {
        // Arrange
        Order order = Order.create(customerId);
        order.addLine(productA, 2, Money.of(25.00));

        // Act
        repository.save(order);
        Order found = repository.findById(order.getId());

        // Assert
        assertThat(found).isNotNull();
        assertThat(found.getLines()).hasSize(1);
        assertThat(found.total()).isEqualTo(Money.of(50.00));
    }
}
```

### API Integration Test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldCreateOrderViaApi() {
        CreateOrderRequest request = new CreateOrderRequest(
            "customer-123",
            List.of(new LineItemDto("product-A", 2))
        );

        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/orders", request, OrderResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getTotal()).isEqualTo(50.00);
    }
}
```

### Testcontainers — Key Concept

| Feature | Benefit |
|---------|---------|
| **Docker-based** | Real databases, caches, message brokers in tests |
| **Disposable** | Fresh container per test class — no shared state |
| **Portable** | Same tests run on dev machine and CI |
| **Realistic** | Tests against real PostgreSQL, not H2 |

---

## 5. Contract Testing

Contract testing verifies that service **interfaces match expectations** between consumers and providers — critical in microservice architectures.

### Consumer-Driven Contracts (Pact)

```
  ┌──────────────┐                     ┌──────────────┐
  │   Consumer   │    Contract (Pact)  │   Provider   │
  │ (Order Svc)  │ ──────────────────▶ │ (Payment Svc)│
  │              │  "I expect POST     │              │
  │              │   /charge to return  │              │
  │              │   { id, status }"    │              │
  └──────────────┘                     └──────────────┘

  1. Consumer writes a test defining expected interactions
  2. Pact generates a contract file (JSON)
  3. Provider verifies it can fulfill the contract
  4. Both sides run independently — no shared test environment
```

```python
# Consumer test (Python, Pact)
def test_payment_charge(pact):
    expected = {"id": "txn-123", "status": "SUCCESS"}

    pact.given("a valid credit card") \
        .upon_receiving("a charge request") \
        .with_request("POST", "/charge", body={"amount": 100, "currency": "USD"}) \
        .will_respond_with(200, body=expected)

    with pact:
        result = payment_client.charge(100, "USD")
        assert result["status"] == "SUCCESS"
```

### Contract Testing vs Integration Testing

| Aspect | Contract Testing | Integration Testing |
|--------|-----------------|-------------------|
| **Scope** | Interface compatibility only | Full behavior |
| **Speed** | Fast (no real service calls) | Slow (requires running services) |
| **Independence** | Consumer and provider test independently | Requires both services running |
| **Catches** | Breaking API changes | Logic bugs, data issues |
| **Doesn't catch** | Logic errors in provider | N/A |

---

## 6. End-to-End Testing

E2E tests validate complete user journeys through the **real, deployed system**.

### E2E Test Example (Playwright/TypeScript)

```typescript
test('complete checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="product-widget"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');

  await page.fill('#email', 'test@example.com');
  await page.fill('#card-number', '4242424242424242');
  await page.fill('#expiry', '12/28');
  await page.fill('#cvc', '123');

  await page.click('[data-testid="place-order"]');
  await expect(page.locator('.order-confirmation')).toContainText('Order placed');
});
```

### Managing Flakiness

| Cause | Mitigation |
|-------|-----------|
| **Timing issues** | Use `waitForSelector`, `waitForResponse` — avoid `sleep()` |
| **Test data pollution** | Use unique test data per run; clean up after tests |
| **Network instability** | Retry flaky network calls; use local test environments |
| **UI changes** | Use `data-testid` attributes instead of CSS selectors |
| **Third-party dependencies** | Mock external services at the boundary |
| **Shared state** | Isolate tests; each test creates its own data |

:::tip Senior-Level Insight
The goal of E2E tests is **confidence in critical paths**, not comprehensive coverage. Pick 5-10 key user journeys (login, checkout, data export) and automate those. Everything else should be covered at lower pyramid levels.
:::

---

## 7. Test-Driven Development (TDD)

### Red-Green-Refactor Cycle

```
    ┌──────────────────────────────────────┐
    │                                      │
    ▼                                      │
  ┌─────┐     ┌─────────┐     ┌──────────┐│
  │ RED │────▶│  GREEN  │────▶│ REFACTOR ││
  │     │     │         │     │          ││
  │Write│     │Write    │     │Clean up  ││
  │fail-│     │minimal  │     │without   ││
  │ing  │     │code to  │     │breaking  ││
  │test │     │pass     │     │tests     │┘
  └─────┘     └─────────┘     └──────────┘
```

### TDD Example — Building a Stack

```java
// Step 1: RED — write a failing test
@Test
void newStackIsEmpty() {
    Stack<Integer> stack = new Stack<>();
    assertTrue(stack.isEmpty());   // ❌ Fails — Stack doesn't exist yet
}

// Step 2: GREEN — minimal code to pass
public class Stack<T> {
    public boolean isEmpty() { return true; }
}

// Step 3: RED — next failing test
@Test
void stackIsNotEmptyAfterPush() {
    Stack<Integer> stack = new Stack<>();
    stack.push(42);
    assertFalse(stack.isEmpty()); // ❌ Fails
}

// Step 4: GREEN — make it pass
public class Stack<T> {
    private int size = 0;
    public boolean isEmpty() { return size == 0; }
    public void push(T item) { size++; }
}

// Step 5: RED — pop should return last pushed item
@Test
void popReturnsLastPushedItem() {
    Stack<Integer> stack = new Stack<>();
    stack.push(42);
    assertEquals(42, stack.pop());  // ❌ Fails
}

// Step 6: GREEN + REFACTOR — real implementation
public class Stack<T> {
    private final List<T> items = new ArrayList<>();
    public boolean isEmpty()  { return items.isEmpty(); }
    public void push(T item)  { items.add(item); }
    public T pop()            { return items.remove(items.size() - 1); }
}
```

### TDD Trade-offs

| Benefits | Criticisms |
|----------|-----------|
| Forces clear thinking about requirements | Slows initial development |
| Builds comprehensive test suite automatically | Can lead to over-testing trivial code |
| Encourages simple, focused design | Difficult for UI and exploratory work |
| Regression safety from day one | Tests may couple to implementation |
| Living documentation | Not all teams/cultures support it |

---

## 8. Behavior-Driven Development (BDD)

BDD extends TDD by writing tests in **business-readable language** using Given-When-Then.

### Gherkin Syntax

```gherkin
Feature: Shopping Cart
  As a customer
  I want to add products to my cart
  So that I can purchase them

  Scenario: Add item to empty cart
    Given I have an empty cart
    When I add "Wireless Mouse" with quantity 1
    Then my cart should contain 1 item
    And the cart total should be $29.99

  Scenario: Apply discount code
    Given I have a cart with items totaling $100
    When I apply discount code "SAVE20"
    Then the cart total should be $80.00

  Scenario Outline: Shipping cost by region
    Given I have a cart with items totaling $50
    When I select shipping to "<region>"
    Then shipping cost should be $<cost>

    Examples:
      | region    | cost  |
      | domestic  | 5.99  |
      | canada    | 12.99 |
      | europe    | 19.99 |
```

### BDD Step Definitions (Java / Cucumber)

```java
public class CartSteps {
    private Cart cart;

    @Given("I have an empty cart")
    public void emptyCart() {
        cart = new Cart();
    }

    @When("I add {string} with quantity {int}")
    public void addItem(String productName, int qty) {
        Product product = productCatalog.findByName(productName);
        cart.add(product, qty);
    }

    @Then("my cart should contain {int} item(s)")
    public void verifyItemCount(int count) {
        assertThat(cart.getItemCount()).isEqualTo(count);
    }
}
```

---

## 9. Property-Based Testing

Instead of testing specific examples, property-based testing generates **random inputs** and verifies that **invariants** always hold.

```python
from hypothesis import given
import hypothesis.strategies as st

@given(st.lists(st.integers()))
def test_sort_preserves_length(xs):
    """Sorting never changes the number of elements."""
    assert len(sorted(xs)) == len(xs)

@given(st.lists(st.integers(), min_size=1))
def test_sort_produces_ordered_output(xs):
    """Every element is ≤ the next element."""
    result = sorted(xs)
    for i in range(len(result) - 1):
        assert result[i] <= result[i + 1]

@given(st.lists(st.integers()))
def test_sort_contains_same_elements(xs):
    """Sorting doesn't add or remove elements."""
    from collections import Counter
    assert Counter(sorted(xs)) == Counter(xs)
```

### When Property-Based Testing Shines

| Use Case | Property to Check |
|----------|------------------|
| Serialization/deserialization | `deserialize(serialize(x)) == x` |
| Encoding/decoding | Roundtrip identity |
| Sort algorithms | Output is ordered, same length, same elements |
| Math operations | Commutativity, associativity, identity |
| Parsers | Parsed output re-serializes to valid input |
| State machines | Invariants hold after any sequence of operations |

---

## 10. Chaos Engineering

Chaos engineering is the discipline of **proactively injecting failures** to test system resilience.

### Principles of Chaos Engineering (Netflix)

```
1. Define "steady state" — what does normal look like? (latency, error rate, throughput)
2. Hypothesize — "the system will continue to operate normally when X fails"
3. Inject failure — kill a service, add latency, corrupt data, fill disk
4. Observe — did the system maintain steady state?
5. Fix — improve resilience based on findings
```

### Common Chaos Experiments

| Experiment | What It Tests | Tool |
|-----------|---------------|------|
| **Kill a service instance** | Auto-recovery, load balancing | Chaos Monkey |
| **Add network latency** | Timeout handling, circuit breakers | Toxiproxy, tc |
| **Fill disk** | Graceful degradation, alerting | Stress tools |
| **DNS failure** | Fallback behavior, caching | DNS manipulation |
| **Clock skew** | Time-dependent logic, TTLs | libfaketime |
| **Resource exhaustion** | Thread pool sizing, back-pressure | Gremlin |

### Game Days

| Phase | Activity |
|-------|----------|
| **Plan** | Choose failure scenario, define blast radius, identify rollback plan |
| **Prepare** | Notify stakeholders, set up monitoring dashboards, assign roles |
| **Execute** | Inject failure, observe system behavior, take notes |
| **Analyze** | Compare actual vs expected behavior, identify weaknesses |
| **Remediate** | Create tickets for improvements, update runbooks |

:::warning
Always start chaos experiments in **non-production** environments. Graduate to production only after building confidence and with proper blast radius controls. Never run experiments without a rollback plan.
:::

---

## 11. Test Strategy for Microservices

Testing distributed systems requires a different approach than monoliths.

```
┌────────────────────────────────────────────────────────┐
│                    Test Levels                          │
├────────────────────────────────────────────────────────┤
│  Unit Tests         │  Per service, fast, isolated      │
│  Component Tests    │  Single service + test doubles    │
│  Contract Tests     │  Interface compatibility (Pact)   │
│  Integration Tests  │  Service + real dependencies      │
│  E2E Tests          │  Full system, critical paths only │
│  Chaos Tests        │  Fault injection, resilience      │
└────────────────────────────────────────────────────────┘
```

### Key Differences from Monolith Testing

| Concern | Monolith | Microservices |
|---------|----------|---------------|
| **Test environment** | Single process | Multiple services, DBs, message brokers |
| **Data setup** | Shared DB, easy setup | Each service owns its data — seed separately |
| **API changes** | Compiler catches mismatches | Contract tests catch mismatches |
| **Failure modes** | Exceptions | Timeouts, partial failures, retries |
| **Test speed** | Fast integration tests | Slow cross-service tests |
| **Flakiness** | Low | High (network, timing, ordering) |

:::tip Senior-Level Insight
In a microservice interview, describe the **testing honeycomb**: heavy investment in integration and contract tests, lighter investment in unit and E2E tests. Explain that contract tests replace the safety net that the compiler provides in a monolith.
:::

---

## 12. Code Coverage

### Meaningful vs Vanity Metrics

| Metric | What It Measures | Limitation |
|--------|-----------------|-----------|
| **Line coverage** | % of lines executed | Doesn't verify behavior — can hit 100% with no assertions |
| **Branch coverage** | % of if/else branches taken | Better than line, still doesn't verify correctness |
| **Mutation testing** | % of code mutations caught by tests | Most meaningful — tests if tests actually **detect bugs** |

### Mutation Testing

```
How it works:
  1. Tool modifies (mutates) your source code — e.g., changes > to <
  2. Runs your test suite against the mutant
  3. If tests FAIL → mutant "killed" (good — tests detected the bug)
  4. If tests PASS → mutant "survived" (bad — tests missed a bug)

Mutation score = killed mutants / total mutants × 100%
```

| Tool | Language | Notes |
|------|----------|-------|
| **PIT (pitest)** | Java | Industry standard; Gradle/Maven plugins |
| **Stryker** | JavaScript/TypeScript | Fast incremental mutation |
| **mutmut** | Python | Simple, focused |
| **cosmic-ray** | Python | Distributed mutation testing |

### Coverage Targets

| Context | Reasonable Target | Why |
|---------|:-----------------:|-----|
| Core business logic | 90%+ | High-risk, high-change code |
| API controllers | 70–80% | Integration tests cover the rest |
| Generated/config code | Skip | Low value, high noise |
| Overall project | 80% | Diminishing returns beyond this |

:::tip Senior-Level Insight
Never set a **hard coverage gate** like "100% or CI fails." It incentivizes writing meaningless tests to hit numbers. Instead, mandate coverage on **new/changed code** (e.g., "PRs must not decrease coverage") and use **mutation testing** to verify test quality.
:::

---

## 13. Interview Cheat Sheet

| Question | Key Answer Points |
|----------|-------------------|
| "Explain the testing pyramid" | Unit (70%), Integration (20%), E2E (10%); push tests down; alternatives exist (trophy, diamond) |
| "Mocks vs stubs?" | Stubs return canned data (state verification); mocks verify interactions (behavior verification) |
| "When do you mock?" | At architectural boundaries (ports); never mock what you don't own; use fakes for infrastructure |
| "How do you test microservices?" | Contract tests for API compatibility; integration tests per service; E2E for critical paths only |
| "TDD — good or bad?" | Good for well-defined requirements and algorithms; less suited for exploratory/UI work |
| "What's your approach to flaky tests?" | Isolate test data, avoid sleep(), use deterministic waits, mock external services |
| "Is 100% coverage good?" | No — diminishing returns; focus on mutation testing and coverage of high-risk code |
| "Explain chaos engineering" | Inject failures to find weaknesses before they hit production; Netflix Chaos Monkey; always have rollback plan |
