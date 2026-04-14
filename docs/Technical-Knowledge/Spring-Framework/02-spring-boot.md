---
sidebar_position: 3
title: "02 — Spring Boot"
slug: 02-spring-boot
---

# 🚀 Spring Boot

Spring Boot eliminates boilerplate configuration by applying **convention over configuration**. It auto-configures the Spring application based on the classpath, reducing setup from hundreds of XML lines to a single annotation.

---

## 1. What Spring Boot Solves

| Traditional Spring Pain | Spring Boot Solution |
|------------------------|---------------------|
| Manual dependency management | **Starter POMs** — curated dependency sets |
| Verbose XML/Java configuration | **Auto-configuration** — sensible defaults |
| External servlet container setup | **Embedded servers** — Tomcat/Jetty/Undertow |
| Environment-specific config files | **Externalized configuration** — profiles, YAML |
| Manual health monitoring | **Actuator** — production-ready endpoints |
| Slow development feedback | **DevTools** — hot-reload, LiveReload |

---

## 2. `@SpringBootApplication` — The Entry Point

```java
@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

`@SpringBootApplication` is a composite of three annotations:

```
@SpringBootApplication
    ├── @Configuration          — This class is a source of bean definitions
    ├── @EnableAutoConfiguration — Enable Spring Boot auto-configuration
    └── @ComponentScan          — Scan this package and sub-packages for beans
```

:::tip Interview Insight
The `@SpringBootApplication` class should be in the **root package** of your project. `@ComponentScan` scans the annotated class's package and all sub-packages. If your main class is in `com.example`, it won't find beans in `com.other`.
:::

---

## 3. Auto-Configuration — How It Works

### The Mechanism

```
1. @EnableAutoConfiguration triggers AutoConfigurationImportSelector
2. Reads META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
3. Each auto-config class has @Conditional annotations
4. Only activates if conditions are met (class on classpath, no user bean, etc.)
```

### Example: DataSource Auto-Configuration

```
Classpath contains HikariCP + spring-boot-starter-jdbc?
    └── YES → DataSourceAutoConfiguration activates
        └── User defined a DataSource @Bean?
            └── NO → Create HikariDataSource with application.properties values
            └── YES → Back off (user config wins)
```

**Key principle:** Auto-configuration **always backs off** when you define your own beans. User configuration always wins.

### Inspecting Auto-Configuration

```properties
# See what was auto-configured (and why)
debug=true
```

This produces a **CONDITIONS EVALUATION REPORT** at startup:

```
============================
CONDITIONS EVALUATION REPORT
============================

Positive matches:
   DataSourceAutoConfiguration matched:
      - @ConditionalOnClass found required classes 'javax.sql.DataSource', 'org.springframework.jdbc.datasource'

Negative matches:
   MongoAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class 'com.mongodb.client.MongoClient'
```

---

## 4. Starter Dependencies

Starters are curated dependency bundles — add one starter, get all transitive dependencies needed for a feature.

| Starter | What It Pulls In |
|---------|-----------------|
| `spring-boot-starter-web` | Tomcat, Spring MVC, Jackson, Validation |
| `spring-boot-starter-data-jpa` | Hibernate, Spring Data JPA, HikariCP |
| `spring-boot-starter-security` | Spring Security, auth filters |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, MockMvc |
| `spring-boot-starter-actuator` | Health, metrics, info endpoints |
| `spring-boot-starter-validation` | Hibernate Validator, Bean Validation API |
| `spring-boot-starter-cache` | Spring Cache abstraction |
| `spring-boot-starter-amqp` | RabbitMQ, Spring AMQP |
| `spring-boot-starter-webflux` | Reactor, Netty, reactive web |

### Maven Example

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <!-- Version inherited from parent -->
    </dependency>
</dependencies>
```

---

## 5. Externalized Configuration

### Property Sources (Ordered by Priority — highest first)

```
1.  Command-line arguments (--server.port=9090)
2.  SPRING_APPLICATION_JSON (inline JSON)
3.  ServletConfig / ServletContext parameters
4.  JNDI attributes
5.  Java System properties (System.getProperties())
6.  OS environment variables
7.  Profile-specific: application-{profile}.properties
8.  application.properties / application.yml
9.  @PropertySource annotations
10. Default properties (SpringApplication.setDefaultProperties)
```

### application.properties vs application.yml

```properties
# application.properties
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=admin
spring.jpa.hibernate.ddl-auto=validate
logging.level.com.example=DEBUG
```

```yaml
# application.yml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: admin
  jpa:
    hibernate:
      ddl-auto: validate
logging:
  level:
    com.example: DEBUG
```

### Type-Safe Configuration with `@ConfigurationProperties`

```java
@ConfigurationProperties(prefix = "app.mail")
public class MailProperties {
    private String host;
    private int port = 587;
    private String username;
    private String password;
    private boolean starttls = true;
    // getters and setters
}
```

```yaml
app:
  mail:
    host: smtp.gmail.com
    port: 587
    username: app@example.com
    password: ${MAIL_PASSWORD}
    starttls: true
```

```java
@Configuration
@EnableConfigurationProperties(MailProperties.class)
public class MailConfig {
    @Bean
    public JavaMailSender mailSender(MailProperties props) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(props.getHost());
        sender.setPort(props.getPort());
        return sender;
    }
}
```

:::tip Interview Insight
`@ConfigurationProperties` is preferred over multiple `@Value` annotations because it provides type safety, validation (add `@Validated`), and groups related properties into a single POJO. It also enables IDE auto-completion via `spring-boot-configuration-processor`.
:::

---

## 6. Profiles in Spring Boot

```
application.properties          ← always loaded
application-dev.properties      ← loaded when profile "dev" active
application-prod.properties     ← loaded when profile "prod" active
application-test.properties     ← loaded when profile "test" active
```

```yaml
# application.yml — multi-document approach
spring:
  profiles:
    active: dev

---
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:devdb

---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:postgresql://prod-host:5432/appdb
```

---

## 7. Embedded Server Configuration

Spring Boot embeds a servlet container — no WAR deployment needed.

| Server | Default | Characteristics |
|--------|---------|----------------|
| **Tomcat** | ✅ (spring-boot-starter-web) | Battle-tested, largest community |
| **Jetty** | Swap out Tomcat | Lower memory, HTTP/2 native |
| **Undertow** | Swap out Tomcat | Non-blocking, high throughput |

### Switching to Undertow

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

### Common Server Properties

```properties
server.port=8080
server.servlet.context-path=/api
server.tomcat.threads.max=200
server.tomcat.connection-timeout=5s
server.compression.enabled=true
server.compression.mime-types=application/json,text/html
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${SSL_PASSWORD}
```

---

## 8. Spring Boot Actuator

Actuator exposes production-ready operational endpoints.

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Application health status |
| `/actuator/info` | Build info, custom metadata |
| `/actuator/metrics` | JVM, HTTP, custom metrics |
| `/actuator/env` | Configuration properties |
| `/actuator/beans` | All registered beans |
| `/actuator/mappings` | All `@RequestMapping` paths |
| `/actuator/loggers` | View/change log levels at runtime |
| `/actuator/threaddump` | JVM thread dump |
| `/actuator/httptrace` | Recent HTTP request/response traces |
| `/actuator/prometheus` | Prometheus-format metrics (with micrometer) |

### Configuration

```properties
# Expose specific endpoints over HTTP
management.endpoints.web.exposure.include=health,info,metrics,prometheus

# Show full health details
management.endpoint.health.show-details=when-authorized

# Custom health indicator group
management.endpoint.health.group.readiness.include=db,redis
management.endpoint.health.group.readiness.show-details=always

# Change actuator base path
management.endpoints.web.base-path=/manage
management.server.port=9090
```

### Custom Health Indicator

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealthIndicator(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            client.ping();
            return Health.up()
                .withDetail("provider", "stripe")
                .withDetail("latency", client.getLatencyMs() + "ms")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### Custom Metrics

```java
@Service
public class OrderService {
    private final Counter orderCounter;
    private final Timer orderTimer;

    public OrderService(MeterRegistry meterRegistry) {
        this.orderCounter = meterRegistry.counter("orders.placed", "channel", "web");
        this.orderTimer = meterRegistry.timer("orders.processing.time");
    }

    public Order placeOrder(OrderRequest request) {
        return orderTimer.record(() -> {
            Order order = processOrder(request);
            orderCounter.increment();
            return order;
        });
    }
}
```

---

## 9. Spring Boot DevTools

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

| Feature | What It Does |
|---------|-------------|
| **Automatic restart** | Restarts app when classpath files change (fast — uses two classloaders) |
| **LiveReload** | Triggers browser refresh on resource changes |
| **Property defaults** | Disables caching (Thymeleaf, Freemarker) for dev |
| **H2 Console** | Enables `/h2-console` by default |
| **Remote debugging** | Supports remote restart/update over HTTP |

:::warning
DevTools is **automatically disabled** in production (when running from a packaged JAR). Never include it with `compile` scope.
:::

---

## 10. Building & Packaging

### Fat JAR (Executable JAR)

```bash
# Maven
./mvnw package
java -jar target/myapp-1.0.0.jar

# Gradle
./gradlew bootJar
java -jar build/libs/myapp-1.0.0.jar
```

**Fat JAR structure:**

```
myapp-1.0.0.jar
├── BOOT-INF/
│   ├── classes/          ← your compiled code
│   └── lib/              ← all dependency JARs
├── META-INF/
│   └── MANIFEST.MF       ← Main-Class: JarLauncher
└── org/springframework/boot/loader/  ← Spring Boot loader
```

### Docker with Layered JARs

```dockerfile
FROM eclipse-temurin:21-jre AS builder
WORKDIR /app
COPY target/myapp-1.0.0.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

### GraalVM Native Image (Spring Boot 3+)

```bash
./mvnw -Pnative native:compile
# Produces a native executable — sub-second startup, lower memory
```

---

## Summary — Key Takeaways for Interviews

| Topic | What to Know |
|-------|-------------|
| `@SpringBootApplication` | Composite of `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` |
| Auto-configuration | Reads condition annotations → backs off when user defines beans |
| Starters | Curated dependency sets — one starter, all transitive deps |
| Config priority | CLI args > env vars > profile-specific > application.properties |
| `@ConfigurationProperties` | Type-safe alternative to `@Value` — supports validation |
| Embedded servers | Tomcat (default), Jetty, Undertow — no WAR needed |
| Actuator | Health, metrics, info, loggers — expose selectively |
| Fat JAR | BOOT-INF/classes + BOOT-INF/lib — layered for Docker |
| DevTools | Auto-restart, LiveReload — disabled in production automatically |
