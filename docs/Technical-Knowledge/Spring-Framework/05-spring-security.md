---
sidebar_position: 6
title: "05 — Spring Security"
slug: 05-spring-security
---

# 🔐 Spring Security

Spring Security is the de facto standard for securing Spring applications. It provides authentication, authorization, and protection against common exploits (CSRF, session fixation, clickjacking).

---

## 1. Architecture Overview

### Security Filter Chain

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                  Security Filter Chain                     │
│                                                            │
│  SecurityContextPersistenceFilter    ← restore/save context│
│  CsrfFilter                         ← CSRF token check    │
│  LogoutFilter                       ← handle /logout       │
│  UsernamePasswordAuthenticationFilter ← form login          │
│  BasicAuthenticationFilter           ← HTTP Basic           │
│  BearerTokenAuthenticationFilter     ← JWT/OAuth2           │
│  AuthorizationFilter                 ← URL-based access     │
│  ExceptionTranslationFilter          ← 401/403 handling     │
│  FilterSecurityInterceptor           ← method-level security│
│                                                            │
└──────────────────────────────────────────────────────────┘
     │
     ▼
  DispatcherServlet → Controller
```

### Core Components

| Component | Responsibility |
|-----------|---------------|
| `SecurityFilterChain` | Ordered list of security filters for a request pattern |
| `AuthenticationManager` | Delegates authentication to `AuthenticationProvider`s |
| `AuthenticationProvider` | Validates credentials (DB, LDAP, OAuth2, etc.) |
| `UserDetailsService` | Loads user by username from your data store |
| `PasswordEncoder` | Hashes and verifies passwords |
| `SecurityContextHolder` | Thread-local storage for the authenticated `Authentication` object |
| `GrantedAuthority` | Represents a permission (role, scope, etc.) |

### Authentication Flow

```
1. Request arrives with credentials (form, header, token)
2. Filter extracts credentials → creates Authentication token
3. AuthenticationManager.authenticate(token)
4. AuthenticationManager delegates to AuthenticationProvider
5. AuthenticationProvider calls UserDetailsService.loadUserByUsername()
6. PasswordEncoder.matches(rawPassword, storedHash)
7. Success → Authentication stored in SecurityContextHolder
8. Failure → AuthenticationEntryPoint invoked (401 response)
```

---

## 2. Configuration (Spring Security 6+)

### Basic HTTP Security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable()) // disable for REST APIs
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasAuthority("DELETE_PRIVILEGE")
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### Custom UserDetailsService

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPasswordHash())
            .roles(user.getRoles().stream()
                .map(Role::getName)
                .toArray(String[]::new))
            .accountLocked(!user.isActive())
            .build();
    }
}
```

### Authorization Matchers (Ordered — First Match Wins)

```java
.authorizeHttpRequests(auth -> auth
    // Public endpoints
    .requestMatchers("/", "/login", "/register", "/css/**", "/js/**").permitAll()
    .requestMatchers("/api/public/**").permitAll()

    // Role-based
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/manager/**").hasAnyRole("ADMIN", "MANAGER")

    // Authority-based (more granular than roles)
    .requestMatchers(HttpMethod.POST, "/api/products").hasAuthority("PRODUCT_CREATE")
    .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAuthority("PRODUCT_DELETE")

    // IP-based
    .requestMatchers("/actuator/**").hasIpAddress("10.0.0.0/8")

    // Catch-all — must be last
    .anyRequest().authenticated()
)
```

:::tip Interview Insight
**`hasRole("ADMIN")` vs `hasAuthority("ROLE_ADMIN")`** — they are equivalent. `hasRole()` automatically prepends `ROLE_` prefix. Use `hasRole()` for broad access categories (ADMIN, USER) and `hasAuthority()` for fine-grained permissions (PRODUCT_CREATE, ORDER_READ).
:::

---

## 3. Password Encoding

| Encoder | Algorithm | Strength | Use Case |
|---------|-----------|----------|----------|
| `BCryptPasswordEncoder` | BCrypt | ✅ Strong | Default choice |
| `Argon2PasswordEncoder` | Argon2 | ✅✅ Strongest | Memory-hard, resists GPU attacks |
| `SCryptPasswordEncoder` | SCrypt | ✅✅ Strong | Memory-hard alternative |
| `Pbkdf2PasswordEncoder` | PBKDF2 | ✅ Strong | FIPS compliance |
| `NoOpPasswordEncoder` | Plain text | ❌ None | Testing only, NEVER in production |

### DelegatingPasswordEncoder (Default in Spring Security 5+)

```java
// Supports migration between encoders
// Stored format: {bcrypt}$2a$10$...
@Bean
public PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
}
// Reads the {id} prefix to determine which encoder to use for verification
// New passwords are encoded with bcrypt by default
```

---

## 4. JWT Authentication

### JWT Filter Implementation

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        String username = jwtService.extractUsername(token);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(token, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

### JWT Service

```java
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}") // 24 hours
    private long expiration;

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .subject(userDetails.getUsername())
            .claim("roles", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return resolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }
}
```

### Register JWT Filter in Security Config

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                JwtAuthenticationFilter jwtFilter) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session ->
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
}
```

---

## 5. Method-Level Security

```java
@Configuration
@EnableMethodSecurity // replaces @EnableGlobalMethodSecurity in Spring Security 6
public class MethodSecurityConfig { }
```

```java
@Service
public class DocumentService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAll() { ... }

    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public UserProfile getProfile(Long userId) { ... }

    @PreAuthorize("@permissionService.canAccess(authentication, #documentId)")
    public Document getDocument(Long documentId) { ... }

    @PostAuthorize("returnObject.owner == authentication.name")
    public Document findById(Long id) { ... }

    @PreFilter("filterObject.owner == authentication.name")
    public void deleteDocuments(List<Document> documents) { ... }

    @PostFilter("filterObject.accessLevel <= authentication.principal.clearanceLevel")
    public List<Document> findAll() { ... }
}
```

| Annotation | When Evaluated | Purpose |
|-----------|----------------|---------|
| `@PreAuthorize` | Before method | Guard access based on user/roles/SpEL |
| `@PostAuthorize` | After method | Check return value against user |
| `@PreFilter` | Before method | Filter collection parameter |
| `@PostFilter` | After method | Filter returned collection |
| `@Secured` | Before method | Simple role check (no SpEL) |

---

## 6. CSRF Protection

### When to Enable/Disable CSRF

| Application Type | CSRF | Reason |
|-----------------|------|--------|
| Server-rendered HTML (Thymeleaf/JSP) | ✅ Enable | Browser submits forms with cookies |
| Stateless REST API (JWT in header) | ❌ Disable | No cookies = no CSRF risk |
| REST API with cookie auth | ✅ Enable | Cookies are auto-attached by browser |

### CSRF Token in Thymeleaf

```html
<form th:action="@{/transfer}" method="post">
    <!-- Thymeleaf automatically includes CSRF token -->
    <input type="text" name="amount"/>
    <button type="submit">Transfer</button>
</form>
```

### CSRF with SPA (Cookie-to-Header Pattern)

```java
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
)
```

The SPA reads the `XSRF-TOKEN` cookie and sends it back as the `X-XSRF-TOKEN` header.

---

## 7. OAuth2 Resource Server

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .anyRequest().authenticated()
        )
        .oauth2ResourceServer(oauth2 -> oauth2
            .jwt(jwt -> jwt.jwtDecoder(jwtDecoder()))
        )
        .build();
}

@Bean
public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withJwkSetUri("https://auth-server.com/.well-known/jwks.json").build();
}
```

```properties
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://auth-server.com
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth-server.com/.well-known/jwks.json
```

---

## 8. Common Security Headers

Spring Security adds these by default:

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `0` | Defers to CSP (legacy browsers) |
| `Strict-Transport-Security` | `max-age=31536000` | Forces HTTPS |
| `Cache-Control` | `no-cache, no-store` | Prevents caching sensitive data |

```java
.headers(headers -> headers
    .contentSecurityPolicy(csp ->
        csp.policyDirectives("default-src 'self'; script-src 'self'"))
    .frameOptions(frame -> frame.sameOrigin())
)
```

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| Filter chain | Request → SecurityFilterChain → DispatcherServlet; filters are ordered |
| Authentication flow | Filter → AuthenticationManager → AuthenticationProvider → UserDetailsService |
| `SecurityContextHolder` | Thread-local storage for `Authentication` object |
| `hasRole` vs `hasAuthority` | `hasRole("ADMIN")` = `hasAuthority("ROLE_ADMIN")` |
| Password encoding | BCrypt (default), Argon2 (strongest); never store plain text |
| JWT | Stateless auth; filter before `UsernamePasswordAuthenticationFilter` |
| Method security | `@PreAuthorize` with SpEL; `@EnableMethodSecurity` |
| CSRF | Enable for cookie-based auth; disable for stateless JWT APIs |
| OAuth2 | Resource server validates JWTs against JWK Set URI |
| Matchers | Ordered — first match wins; `anyRequest()` must be last |
