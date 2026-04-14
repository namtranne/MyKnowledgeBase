---
sidebar_position: 4
title: "03 — Spring MVC & RESTful Services"
slug: 03-spring-mvc-rest
---

# 🌐 Spring MVC & RESTful Web Services

Spring MVC is the web framework within Spring that implements the **Model-View-Controller** pattern. It powers both traditional server-rendered pages and modern RESTful APIs.

---

## 1. DispatcherServlet — The Front Controller

Every Spring MVC application routes all requests through a single `DispatcherServlet`.

### Request Processing Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│ DispatcherServlet│  (Front Controller)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Handler  │  Maps URL → Controller method
    │ Mapping  │  (@RequestMapping, @GetMapping, etc.)
    └────┬────┘
         │
    ┌────▼────┐
    │ Handler  │  Adapts the handler; invokes the method
    │ Adapter  │  (resolves @PathVariable, @RequestBody, etc.)
    └────┬────┘
         │
    ┌────▼────────┐
    │ Controller   │  Business logic; returns Model + View name
    │ (@Controller)│  or response body (@RestController)
    └────┬────────┘
         │
    ┌────▼────┐        ┌──────────────┐
    │ View    │───────►│ View         │  (Thymeleaf, JSP, JSON)
    │ Resolver│        │ (renders)    │
    └─────────┘        └──────┬───────┘
                              │
                              ▼
                        HTTP Response
```

### Key Infrastructure Beans

| Component | Role |
|-----------|------|
| `DispatcherServlet` | Front controller — routes all requests |
| `HandlerMapping` | Finds which controller method handles a URL |
| `HandlerAdapter` | Invokes the handler method with resolved arguments |
| `ViewResolver` | Resolves view name → actual view (Thymeleaf, JSP) |
| `HandlerExceptionResolver` | Maps exceptions to error responses |
| `HttpMessageConverter` | Serializes/deserializes request/response bodies (JSON, XML) |
| `HandlerInterceptor` | Pre/post processing (logging, auth, timing) |

:::tip Interview Insight
When asked "How does Spring MVC work internally?", walk through the DispatcherServlet flow: **DispatcherServlet → HandlerMapping → HandlerAdapter → Controller → ViewResolver → View**. Mention that `@RestController` bypasses ViewResolver entirely — `HttpMessageConverter` serializes the return value directly to the response body.
:::

---

## 2. Controllers

### `@Controller` — View-Based (Server-Side Rendering)

```java
@Controller
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public String listProducts(Model model) {
        model.addAttribute("products", productService.findAll());
        return "product/list"; // → ViewResolver → product/list.html
    }

    @GetMapping("/{id}")
    public String productDetail(@PathVariable Long id, Model model) {
        model.addAttribute("product", productService.findById(id));
        return "product/detail";
    }

    @PostMapping
    public String createProduct(@Valid @ModelAttribute ProductForm form,
                                BindingResult result, RedirectAttributes flash) {
        if (result.hasErrors()) {
            return "product/form";
        }
        productService.create(form);
        flash.addFlashAttribute("message", "Product created successfully");
        return "redirect:/products";
    }
}
```

### `@RestController` — API-Based (JSON/XML)

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductApiController {

    private final ProductService productService;

    public ProductApiController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductDto> listProducts() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    public ProductDto getProduct(@PathVariable Long id) {
        return productService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto createProduct(@Valid @RequestBody CreateProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public ProductDto updateProduct(@PathVariable Long id,
                                    @Valid @RequestBody UpdateProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long id) {
        productService.delete(id);
    }
}
```

### `@Controller` vs `@RestController`

| Aspect | `@Controller` | `@RestController` |
|--------|--------------|-------------------|
| Response | Returns **view name** (String) | Returns **response body** (Object) |
| Equivalent | `@Controller` | `@Controller` + `@ResponseBody` on every method |
| Serialization | Goes through `ViewResolver` | Goes through `HttpMessageConverter` |
| Typical use | Server-rendered HTML (Thymeleaf, JSP) | REST APIs (JSON, XML) |
| Can mix? | Yes — add `@ResponseBody` on individual methods | Yes — return `ModelAndView` for view rendering |

---

## 3. Request Mapping Annotations

### URL Mapping Hierarchy

```java
@RestController
@RequestMapping("/api/v1/orders")  // Class-level prefix
public class OrderController {

    @GetMapping                     // GET /api/v1/orders
    public List<Order> list() { ... }

    @GetMapping("/{id}")            // GET /api/v1/orders/123
    public Order get(@PathVariable Long id) { ... }

    @PostMapping                    // POST /api/v1/orders
    public Order create(@RequestBody OrderRequest req) { ... }

    @PutMapping("/{id}")            // PUT /api/v1/orders/123
    public Order update(@PathVariable Long id, @RequestBody OrderRequest req) { ... }

    @PatchMapping("/{id}/status")   // PATCH /api/v1/orders/123/status
    public Order updateStatus(@PathVariable Long id, @RequestBody StatusUpdate update) { ... }

    @DeleteMapping("/{id}")         // DELETE /api/v1/orders/123
    public void delete(@PathVariable Long id) { ... }
}
```

### Method-Level Shortcut Annotations

| Annotation | Equivalent `@RequestMapping` |
|-----------|------------------------------|
| `@GetMapping` | `@RequestMapping(method = GET)` |
| `@PostMapping` | `@RequestMapping(method = POST)` |
| `@PutMapping` | `@RequestMapping(method = PUT)` |
| `@PatchMapping` | `@RequestMapping(method = PATCH)` |
| `@DeleteMapping` | `@RequestMapping(method = DELETE)` |

### Advanced Mapping

```java
// Multiple paths
@GetMapping({"/", "/home", "/index"})

// Content negotiation
@GetMapping(value = "/report", produces = "application/pdf")
@PostMapping(value = "/upload", consumes = "multipart/form-data")

// Request parameters
@GetMapping(value = "/search", params = "type=advanced")

// Headers
@GetMapping(value = "/data", headers = "X-API-VERSION=2")
```

---

## 4. Method Argument Resolution

Spring MVC resolves handler method parameters automatically.

### Complete Argument Types

| Annotation / Type | Source | Example |
|-------------------|--------|---------|
| `@PathVariable` | URI template variable | `/orders/{id}` → `@PathVariable Long id` |
| `@RequestParam` | Query string parameter | `?page=1` → `@RequestParam int page` |
| `@RequestBody` | HTTP body (JSON/XML) | Request JSON → `@RequestBody OrderRequest req` |
| `@RequestHeader` | HTTP header | `@RequestHeader("Authorization") String auth` |
| `@CookieValue` | Cookie | `@CookieValue("sessionId") String sid` |
| `@ModelAttribute` | Form data / query params → object | Form POST → `@ModelAttribute UserForm form` |
| `@RequestPart` | Multipart part | `@RequestPart("file") MultipartFile file` |
| `HttpServletRequest` | Raw servlet request | Direct access to the request |
| `Principal` / `Authentication` | Security principal | Current authenticated user |
| `Pageable` | Pagination params | `?page=0&size=20&sort=name,asc` |

### `@PathVariable` Details

```java
@GetMapping("/users/{userId}/orders/{orderId}")
public Order getOrder(@PathVariable Long userId, @PathVariable Long orderId) {
    return orderService.findByUserAndId(userId, orderId);
}

// Regex pattern constraint
@GetMapping("/files/{filename:.+}")
public Resource getFile(@PathVariable String filename) { ... }

// Optional path variable
@GetMapping({"/products", "/products/{category}"})
public List<Product> list(@PathVariable(required = false) String category) { ... }
```

### `@RequestParam` Details

```java
@GetMapping("/search")
public Page<Product> search(
    @RequestParam String query,                           // required
    @RequestParam(defaultValue = "0") int page,           // optional with default
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(required = false) String category,      // optional, nullable
    @RequestParam List<String> tags                       // multi-value: ?tags=a&tags=b
) { ... }
```

---

## 5. Response Handling

### `ResponseEntity` — Full Control

```java
@GetMapping("/{id}")
public ResponseEntity<ProductDto> getProduct(@PathVariable Long id) {
    return productService.findById(id)
        .map(product -> ResponseEntity.ok()
            .header("X-Product-Version", product.getVersion().toString())
            .body(product))
        .orElse(ResponseEntity.notFound().build());
}

@PostMapping
public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest req) {
    ProductDto created = productService.create(req);
    URI location = URI.create("/api/v1/products/" + created.getId());
    return ResponseEntity.created(location).body(created);
}
```

### HTTP Message Converters

Spring auto-configures converters based on classpath:

| Converter | Triggers On | Library |
|-----------|-------------|---------|
| `MappingJackson2HttpMessageConverter` | `application/json` | Jackson (included in starter-web) |
| `MappingJackson2XmlHttpMessageConverter` | `application/xml` | Jackson XML |
| `StringHttpMessageConverter` | `text/plain` | Built-in |
| `ByteArrayHttpMessageConverter` | `application/octet-stream` | Built-in |
| `FormHttpMessageConverter` | `application/x-www-form-urlencoded` | Built-in |

### Content Negotiation

```java
@GetMapping(value = "/{id}", produces = {MediaType.APPLICATION_JSON_VALUE,
                                          MediaType.APPLICATION_XML_VALUE})
public ProductDto getProduct(@PathVariable Long id) {
    return productService.findById(id);
}
// Client sends Accept: application/xml → XML response
// Client sends Accept: application/json → JSON response
```

---

## 6. Validation

### Bean Validation with `@Valid`

```java
public record CreateProductRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    BigDecimal price,

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    String description,

    @NotEmpty(message = "At least one category is required")
    List<@NotBlank String> categories
) {}

@PostMapping
public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest request) {
    // If validation fails, MethodArgumentNotValidException is thrown
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(productService.create(request));
}
```

### Common Validation Annotations

| Annotation | Validates |
|-----------|-----------|
| `@NotNull` | Not null |
| `@NotBlank` | Not null, not empty, not whitespace-only (Strings) |
| `@NotEmpty` | Not null, not empty (Strings, Collections) |
| `@Size(min, max)` | String length or collection size |
| `@Min` / `@Max` | Numeric minimum / maximum |
| `@Positive` / `@Negative` | Positive / negative number |
| `@Email` | Valid email format |
| `@Pattern(regexp)` | Matches regex |
| `@Past` / `@Future` | Date in past / future |

### Custom Validator

```java
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
@Constraint(validatedBy = UniqueEmailValidator.class)
public @interface UniqueEmail {
    String message() default "Email already registered";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {
    private final UserRepository userRepository;

    public UniqueEmailValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        return email != null && !userRepository.existsByEmail(email);
    }
}
```

---

## 7. Exception Handling

### `@ControllerAdvice` — Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage,
                (a, b) -> a  // keep first error per field
            ));
        return new ErrorResponse("VALIDATION_FAILED", "Invalid request", errors);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        // Log the full stack trace, return sanitized message
        log.error("Unhandled exception", ex);
        return new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred");
    }
}

public record ErrorResponse(
    String code,
    String message,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Map<String, String> fieldErrors
) {
    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }
}
```

### Exception Handling Priority

```
1. @ExceptionHandler in the SAME controller (highest priority)
2. @ExceptionHandler in @ControllerAdvice
3. HandlerExceptionResolver chain
4. Default error page (/error)
```

---

## 8. Interceptors & Filters

### HandlerInterceptor

```java
@Component
public class RequestTimingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true; // continue processing
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response, Object handler, Exception ex) {
        long startTime = (Long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - startTime;
        log.info("{} {} completed in {}ms", request.getMethod(),
                 request.getRequestURI(), duration);
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RequestTimingInterceptor())
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/health");
    }
}
```

### Filter vs Interceptor

| Aspect | `Filter` (Servlet) | `HandlerInterceptor` (Spring) |
|--------|--------------------|-----------------------------|
| Level | Servlet container | Spring MVC |
| Access to | Raw request/response | Handler method info |
| Executes | Before DispatcherServlet | After HandlerMapping, before/after handler |
| Use case | CORS, compression, security | Logging, auth, timing |
| Can modify request? | Yes (wrapper) | Limited |
| Spring-aware? | Only if registered as bean | Yes |

---

## 9. CORS Configuration

```java
// Method-level
@CrossOrigin(origins = "https://frontend.example.com")
@GetMapping("/api/data")
public Data getData() { ... }

// Global configuration
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://frontend.example.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

## 10. RESTful API Best Practices

### Resource Naming Conventions

| Convention | Example | Avoid |
|-----------|---------|-------|
| Plural nouns | `/api/v1/orders` | `/api/v1/getOrders` |
| Hierarchical | `/api/v1/users/{id}/orders` | `/api/v1/getUserOrders` |
| Kebab-case | `/api/v1/order-items` | `/api/v1/orderItems` |
| API versioning | `/api/v1/...` or `Accept: application/vnd.api.v1+json` | No versioning |

### HTTP Methods & Status Codes

| Method | Action | Success Code | Body |
|--------|--------|-------------|------|
| `GET` | Read resource(s) | 200 OK | Resource representation |
| `POST` | Create resource | 201 Created | Created resource + `Location` header |
| `PUT` | Replace resource | 200 OK | Updated resource |
| `PATCH` | Partial update | 200 OK | Updated resource |
| `DELETE` | Remove resource | 204 No Content | Empty |

### Pagination Response

```java
@GetMapping
public Page<ProductDto> listProducts(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "createdAt,desc") String[] sort
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(parseSortOrders(sort)));
    return productService.findAll(pageable).map(ProductDto::from);
}
```

Response:
```json
{
  "content": [ ... ],
  "totalElements": 150,
  "totalPages": 8,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

### HATEOAS (Hypermedia)

```java
@GetMapping("/{id}")
public EntityModel<ProductDto> getProduct(@PathVariable Long id) {
    ProductDto product = productService.findById(id);
    return EntityModel.of(product,
        linkTo(methodOn(ProductController.class).getProduct(id)).withSelfRel(),
        linkTo(methodOn(ProductController.class).listProducts(0, 20, null)).withRel("products")
    );
}
```

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| DispatcherServlet | Front controller → HandlerMapping → HandlerAdapter → Controller → ViewResolver |
| `@Controller` vs `@RestController` | View name vs response body; `@RestController` = `@Controller` + `@ResponseBody` |
| Request mapping | Class + method level; `@GetMapping` is shortcut for `@RequestMapping(method=GET)` |
| Argument resolution | `@PathVariable`, `@RequestParam`, `@RequestBody`, `@RequestHeader` — auto-resolved |
| `ResponseEntity` | Full control over status code, headers, and body |
| Validation | `@Valid` + Bean Validation annotations; `@ControllerAdvice` for global error handling |
| Exception handling | `@ExceptionHandler` → `@ControllerAdvice` → `HandlerExceptionResolver` → `/error` |
| Interceptors | Spring MVC level; `preHandle`/`postHandle`/`afterCompletion` |
| CORS | `@CrossOrigin` or `WebMvcConfigurer.addCorsMappings()` |
| Content negotiation | Jackson on classpath → auto JSON; `produces`/`consumes` for explicit control |
