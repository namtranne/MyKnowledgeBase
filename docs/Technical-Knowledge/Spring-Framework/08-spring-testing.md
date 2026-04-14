---
sidebar_position: 9
title: "08 — Spring Testing"
slug: 08-spring-testing
---

# 🧪 Spring Testing

Spring provides a comprehensive testing framework that supports unit tests (no Spring context), integration tests (full or sliced context), and end-to-end tests with MockMvc and Testcontainers.

---

## 1. Testing Pyramid in Spring

```
          ┌───────────┐
          │   E2E     │  Testcontainers + real DB
          │  Tests    │  Slow, high confidence
         ┌┴───────────┴┐
         │ Integration  │  @SpringBootTest, @WebMvcTest
         │ Tests        │  Medium speed, test wiring
        ┌┴─────────────┴┐
        │   Unit Tests   │  Plain JUnit + Mockito
        │                │  Fast, test logic in isolation
        └────────────────┘
```

| Level | Framework | Spring Context | Speed | What to Test |
|-------|-----------|----------------|-------|-------------|
| Unit | JUnit 5 + Mockito | ❌ None | Fast | Business logic, utility methods |
| Slice | `@WebMvcTest`, `@DataJpaTest` | ⚠️ Partial | Medium | Controllers, repositories in isolation |
| Integration | `@SpringBootTest` | ✅ Full | Slow | Full request flow, bean wiring |
| E2E | Testcontainers | ✅ Full + real infra | Slowest | Real database, message broker, etc. |

---

## 2. Unit Testing (No Spring)

```java
class OrderServiceTest {

    private OrderService orderService;
    private OrderRepository orderRepository;
    private InventoryClient inventoryClient;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        inventoryClient = mock(InventoryClient.class);
        orderService = new OrderService(orderRepository, inventoryClient);
    }

    @Test
    void placeOrder_withSufficientStock_createsOrder() {
        // Given
        OrderRequest request = new OrderRequest("PROD-1", 5);
        when(inventoryClient.checkStock("PROD-1")).thenReturn(new Stock("PROD-1", 100));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            order.setId(1L);
            return order;
        });

        // When
        Order result = orderService.placeOrder(request);

        // Then
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getProductId()).isEqualTo("PROD-1");
        assertThat(result.getQuantity()).isEqualTo(5);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PLACED);

        verify(orderRepository).save(any(Order.class));
        verify(inventoryClient).checkStock("PROD-1");
    }

    @Test
    void placeOrder_withInsufficientStock_throwsException() {
        OrderRequest request = new OrderRequest("PROD-1", 500);
        when(inventoryClient.checkStock("PROD-1")).thenReturn(new Stock("PROD-1", 10));

        assertThatThrownBy(() -> orderService.placeOrder(request))
            .isInstanceOf(InsufficientStockException.class)
            .hasMessageContaining("PROD-1");

        verify(orderRepository, never()).save(any());
    }
}
```

### Key Mockito Features

```java
// Stubbing
when(repo.findById(1L)).thenReturn(Optional.of(user));
when(repo.findById(anyLong())).thenReturn(Optional.empty());
when(service.process(any())).thenThrow(new RuntimeException("fail"));

// Argument captor
ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
verify(repo).save(captor.capture());
Order saved = captor.getValue();
assertThat(saved.getStatus()).isEqualTo("PLACED");

// Verification
verify(repo, times(1)).save(any());
verify(repo, never()).delete(any());
verify(repo, atLeastOnce()).findById(anyLong());
verifyNoMoreInteractions(repo);

// BDD style
given(repo.findById(1L)).willReturn(Optional.of(user));
then(repo).should().save(any());
```

---

## 3. Slice Tests — `@WebMvcTest`

Tests only the **web layer** — controllers, filters, advice. No service/repo beans loaded.

```java
@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void getProduct_whenExists_returns200() throws Exception {
        ProductDto product = new ProductDto(1L, "Laptop", new BigDecimal("999.99"));
        when(productService.findById(1L)).thenReturn(product);

        mockMvc.perform(get("/api/v1/products/1")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Laptop"))
            .andExpect(jsonPath("$.price").value(999.99));
    }

    @Test
    void getProduct_whenNotFound_returns404() throws Exception {
        when(productService.findById(99L))
            .thenThrow(new ResourceNotFoundException("Product", 99L));

        mockMvc.perform(get("/api/v1/products/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void createProduct_withInvalidBody_returns400() throws Exception {
        String invalidJson = """
            {
                "name": "",
                "price": -10
            }
            """;

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.name").exists())
            .andExpect(jsonPath("$.fieldErrors.price").exists());
    }

    @Test
    void createProduct_withValidBody_returns201() throws Exception {
        String json = """
            {
                "name": "Laptop",
                "price": 999.99,
                "categories": ["electronics"]
            }
            """;
        ProductDto created = new ProductDto(1L, "Laptop", new BigDecimal("999.99"));
        when(productService.create(any())).thenReturn(created);

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(header().exists("Location"));
    }
}
```

---

## 4. Slice Tests — `@DataJpaTest`

Tests only the **JPA layer** — repositories, entities. Uses embedded H2 by default.

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// Use real DB instead of H2 when using Testcontainers
class ProductRepositoryTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByStatus_returnsOnlyMatchingProducts() {
        Product active = new Product("Laptop", new BigDecimal("999.99"), ProductStatus.ACTIVE);
        Product inactive = new Product("Phone", new BigDecimal("599.99"), ProductStatus.INACTIVE);
        entityManager.persist(active);
        entityManager.persist(inactive);
        entityManager.flush();

        List<Product> result = productRepository.findByStatus(ProductStatus.ACTIVE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Laptop");
    }

    @Test
    void findByPriceBetween_returnsCorrectRange() {
        entityManager.persist(new Product("Cheap", new BigDecimal("10"), ProductStatus.ACTIVE));
        entityManager.persist(new Product("Mid", new BigDecimal("500"), ProductStatus.ACTIVE));
        entityManager.persist(new Product("Expensive", new BigDecimal("2000"), ProductStatus.ACTIVE));
        entityManager.flush();

        List<Product> result = productRepository.findByPriceBetween(
            new BigDecimal("100"), new BigDecimal("1000"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Mid");
    }
}
```

---

## 5. Other Slice Test Annotations

| Annotation | What It Loads | Use Case |
|-----------|--------------|----------|
| `@WebMvcTest` | Controllers, filters, `@ControllerAdvice` | REST controller testing |
| `@WebFluxTest` | WebFlux controllers | Reactive controller testing |
| `@DataJpaTest` | JPA repos, entities, `TestEntityManager` | Repository query testing |
| `@DataMongoTest` | MongoDB repos | MongoDB testing |
| `@DataRedisTest` | Redis repos | Redis testing |
| `@JdbcTest` | `JdbcTemplate`, `DataSource` | JDBC testing |
| `@JsonTest` | Jackson `ObjectMapper` | JSON serialization testing |
| `@RestClientTest` | `RestClient` / `RestTemplate` | External API client testing |

---

## 6. Integration Tests — `@SpringBootTest`

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @MockitoBean
    private PaymentClient paymentClient; // mock external service

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
    }

    @Test
    void placeOrder_fullFlow() {
        when(paymentClient.charge(any())).thenReturn(new PaymentResult("PAY-1", "SUCCESS"));

        OrderRequest request = new OrderRequest("PROD-1", 2, new BigDecimal("49.99"));

        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/v1/orders", request, OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getStatus()).isEqualTo("PLACED");
        assertThat(orderRepository.count()).isEqualTo(1);
    }
}
```

### `WebEnvironment` Options

| Option | Behavior |
|--------|----------|
| `MOCK` (default) | Mock servlet environment; use `MockMvc` |
| `RANDOM_PORT` | Real server on random port; use `TestRestTemplate` |
| `DEFINED_PORT` | Real server on `server.port` |
| `NONE` | No web environment — for non-web tests |

---

## 7. Testcontainers

Run real infrastructure (databases, message brokers) in Docker during tests.

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void savesAndRetrievesOrder() {
        Order order = new Order("PROD-1", 5, new BigDecimal("249.95"));
        Order saved = orderRepository.save(order);

        Optional<Order> found = orderRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getProductId()).isEqualTo("PROD-1");
    }
}
```

### Spring Boot 3.1+ — `@ServiceConnection`

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection // auto-configures spring.datasource.* properties
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    // No @DynamicPropertySource needed!
}
```

### Common Testcontainer Types

| Container | Dependency |
|-----------|-----------|
| `PostgreSQLContainer` | `testcontainers:postgresql` |
| `MySQLContainer` | `testcontainers:mysql` |
| `MongoDBContainer` | `testcontainers:mongodb` |
| `KafkaContainer` | `testcontainers:kafka` |
| `GenericContainer` (Redis, etc.) | `testcontainers:testcontainers` |
| `LocalStackContainer` (AWS) | `testcontainers:localstack` |

---

## 8. Testing Spring Security

```java
@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
class AdminControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminService adminService;

    @Test
    void getUsers_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getUsers_withUserRole_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getUsers_withAdminRole_returns200() throws Exception {
        when(adminService.getAllUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users"))
            .andExpect(status().isOk());
    }

    @Test
    void getUsers_withJwt_returns200() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + generateTestToken("ADMIN")))
            .andExpect(status().isOk());
    }
}
```

---

## 9. Testing Best Practices

### Test Naming Convention

```java
@Test
void methodName_stateUnderTest_expectedBehavior() { }

// Examples:
void placeOrder_withInsufficientStock_throwsInsufficientStockException() { }
void calculateDiscount_forPremiumUser_appliesTwentyPercent() { }
void findByEmail_withNonExistentEmail_returnsEmpty() { }
```

### Arrange-Act-Assert (AAA) Pattern

```java
@Test
void transfer_deductsFromSourceAndCreditsTarget() {
    // Arrange
    Account source = new Account(1L, new BigDecimal("1000"));
    Account target = new Account(2L, new BigDecimal("500"));
    when(accountRepo.findById(1L)).thenReturn(Optional.of(source));
    when(accountRepo.findById(2L)).thenReturn(Optional.of(target));

    // Act
    transferService.transfer(1L, 2L, new BigDecimal("300"));

    // Assert
    assertThat(source.getBalance()).isEqualByComparingTo("700");
    assertThat(target.getBalance()).isEqualByComparingTo("800");
    verify(accountRepo, times(2)).save(any(Account.class));
}
```

### Common Testing Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `@SpringBootTest` everywhere | Slow test suite | Use slice tests (`@WebMvcTest`, `@DataJpaTest`) |
| Testing implementation | Brittle — breaks on refactor | Test behavior and outcomes |
| Shared mutable state | Tests pass alone, fail together | `@BeforeEach` cleanup, `@DirtiesContext` |
| No assertion | Test passes but verifies nothing | Always assert expected outcomes |
| Over-mocking | Tests pass but code is broken | Mock only external boundaries |
| `Thread.sleep()` in tests | Flaky and slow | Use `Awaitility` for async assertions |

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| Testing pyramid | Unit (fast, many) → Slice (medium) → Integration (slow, few) |
| Unit tests | No Spring context; constructor injection + Mockito |
| `@WebMvcTest` | Tests controllers only; mock services with `@MockitoBean` |
| `@DataJpaTest` | Tests JPA repos; embedded DB by default |
| `@SpringBootTest` | Full context; use `RANDOM_PORT` for real HTTP |
| MockMvc | `perform()` → `andExpect(status(), jsonPath(), header())` |
| Testcontainers | Real Docker containers; `@ServiceConnection` for auto-config |
| Security testing | `@WithMockUser(roles=...)` for method security |
| Best practices | AAA pattern, behavior-based tests, slice over full context |
