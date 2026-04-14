---
sidebar_position: 1
title: "Spring Framework"
---

# 🌱 Spring Framework — Complete Interview Guide

A comprehensive, interview-ready knowledge base distilled from the best Spring books: *Spring Start Here*, *Spring in Action*, *Expert Spring MVC and Web Flow*, *Pro Spring 6*, *Spring Recipes*, *Professional Java Development with the Spring Framework*, and official Spring documentation.

---

## Learning Roadmap

```
Spring Core Fundamentals ──► Spring Boot ──► Spring MVC & REST
(IoC, DI, Beans)             (Auto-config)    (Web layer)
        │                         │                  │
        ▼                         ▼                  ▼
Spring Data Access          Spring Security     Spring AOP
(JDBC, JPA, Tx)             (Auth, OAuth2)      (Cross-cutting)
        │                         │                  │
        └─────────┬───────────────┘                  │
                  ▼                                  │
        Spring Microservices ◄───────────────────────┘
        (Cloud, Discovery, Config)
                  │
                  ▼
           Spring Testing
        (Unit, Integration, Slices)
```

---

## Chapter Overview

| # | Chapter | Key Topics |
|---|---------|------------|
| 01 | [Spring Core Fundamentals](./01-spring-core-fundamentals) | IoC container, Dependency Injection, Bean lifecycle, Configuration styles, Profiles, SpEL |
| 02 | [Spring Boot](./02-spring-boot) | Auto-configuration, Starters, Properties, Actuator, Embedded servers, DevTools |
| 03 | [Spring MVC & RESTful Services](./03-spring-mvc-rest) | DispatcherServlet, Controllers, Request mapping, View resolution, REST APIs, Exception handling |
| 04 | [Spring Data Access](./04-spring-data-access) | JdbcTemplate, Spring Data JPA, Repositories, Transaction management, Connection pooling |
| 05 | [Spring Security](./05-spring-security) | Authentication, Authorization, Security filters, OAuth2, JWT, CSRF/CORS |
| 06 | [Spring AOP](./06-spring-aop) | Aspect-Oriented Programming, Advice types, Pointcuts, Proxy mechanisms |
| 07 | [Spring Microservices & Cloud](./07-spring-microservices) | Spring Cloud, Service discovery, Config server, Circuit breaker, API gateway |
| 08 | [Spring Testing](./08-spring-testing) | Unit testing, Integration testing, MockMvc, Test slices, Testcontainers |
| 09 | [Common Interview Questions](./09-interview-questions) | 50+ questions with detailed answers across all Spring topics |

---

## Quick Reference — Essential Annotations

| Annotation | Layer | Purpose |
|-----------|-------|---------|
| `@Component` | Core | Generic Spring-managed bean |
| `@Service` | Core | Business logic layer bean |
| `@Repository` | Core | Data access layer bean (adds exception translation) |
| `@Controller` | Web | Spring MVC controller (returns views) |
| `@RestController` | Web | REST controller (`@Controller` + `@ResponseBody`) |
| `@Configuration` | Core | Java-based configuration class |
| `@Bean` | Core | Method-level bean definition |
| `@Autowired` | Core | Dependency injection |
| `@Qualifier` | Core | Disambiguate between multiple beans of same type |
| `@Value` | Core | Inject property values |
| `@RequestMapping` | Web | Map HTTP requests to handler methods |
| `@GetMapping` / `@PostMapping` | Web | Shortcut for specific HTTP methods |
| `@PathVariable` | Web | Extract URI template variables |
| `@RequestParam` | Web | Extract query parameters |
| `@RequestBody` | Web | Bind HTTP request body to object |
| `@ResponseBody` | Web | Write return value directly to HTTP response |
| `@Transactional` | Data | Declarative transaction management |
| `@SpringBootApplication` | Boot | Composite: `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` |
| `@Aspect` | AOP | Declare an aspect class |
| `@EnableWebSecurity` | Security | Enable Spring Security configuration |

---

## Source Books

| Book | Author(s) | Best For |
|------|-----------|----------|
| Spring Start Here | Laurentiu Spilca | Beginners, modern Spring from scratch |
| Spring in Action (6th Ed.) | Craig Walls | Comprehensive Spring + Spring Boot |
| Expert Spring MVC and Web Flow | Seth Ladd et al. | Deep Spring MVC internals |
| Pro Spring 6 | Multiple | Encyclopedic Spring reference |
| Spring 6 Recipes | Problem-solution | Targeted how-to patterns |
| Professional Java Dev with Spring | Rod Johnson et al. | Framework philosophy and best practices |
| Spring Documentation | Spring Team | Always up-to-date reference |
