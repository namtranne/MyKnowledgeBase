---
sidebar_position: 8
title: "07 — REST, gRPC & API Design"
---

# 🚀 REST, gRPC & API Design

API design is a core skill for senior engineers. This chapter covers REST principles in depth, gRPC and Protocol Buffers, GraphQL, and practical API design patterns you'll encounter in interviews and production.

---

## 🏛️ REST (Representational State Transfer)

### REST Constraints

| Constraint | Description | Implication |
|-----------|-------------|-------------|
| **Client-Server** | Separation of concerns | Frontend and backend evolve independently |
| **Stateless** | Each request contains all needed information | No server-side sessions; scales horizontally |
| **Cacheable** | Responses must be labeled cacheable or non-cacheable | Reduces load, improves performance |
| **Uniform Interface** | Standardized way to interact with resources | Predictable API behavior |
| **Layered System** | Client doesn't know if talking to end server or intermediary | Enables load balancers, caches, gateways |
| **Code on Demand** (optional) | Server can send executable code to client | JavaScript in browsers |

### Richardson Maturity Model

```
Level 3: Hypermedia Controls (HATEOAS)          ← "Glory of REST"
─────────────────────────────────────
Level 2: HTTP Verbs (GET, POST, PUT, DELETE)    ← Most APIs stop here
─────────────────────────────────────
Level 1: Resources (/users, /orders)
─────────────────────────────────────
Level 0: Single endpoint, single verb           ← RPC over HTTP (SOAP)
         (POST /api with action in body)
```

| Level | Description | Example |
|:-----:|-------------|---------|
| **0** | One URI, one HTTP method | `POST /api` with `{"action": "getUser", "id": 1}` |
| **1** | Multiple URIs (resources) | `POST /users/1` |
| **2** | Proper HTTP verbs | `GET /users/1`, `DELETE /users/1` |
| **3** | HATEOAS (links in responses) | Response includes `"links": [{"rel": "orders", "href": "/users/1/orders"}]` |

:::tip Interview Perspective
Most production APIs are **Level 2**. HATEOAS (Level 3) is rarely implemented but is theoretically "true REST." Be ready to discuss why HATEOAS is powerful in theory but impractical for most use cases.
:::

### REST API Design Best Practices

#### URL Naming

```
✅ Good:                              ❌ Bad:
GET    /users                         GET    /getUsers
GET    /users/123                     GET    /getUserById?id=123
POST   /users                         POST   /createUser
PUT    /users/123                      POST   /updateUser
DELETE /users/123                      POST   /deleteUser?id=123
GET    /users/123/orders               GET    /getUserOrders?userId=123
GET    /users/123/orders/456           GET    /getOrder?userId=123&orderId=456
```

**Rules:**
- Use **nouns** (resources), not verbs
- Use **plural** nouns (`/users`, not `/user`)
- Use **kebab-case** for multi-word resources (`/order-items`)
- Nest related resources (`/users/123/orders`)
- Use query parameters for filtering, sorting, pagination

#### Pagination

```
# Offset-based (simple but slow for large offsets)
GET /users?page=3&size=20

# Cursor-based (better for large datasets)
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
  }
}
```

| Strategy | Pros | Cons |
|----------|------|------|
| **Offset** | Simple, supports random page access | Slow for large offsets, data shifts on insert/delete |
| **Cursor** | Consistent results, fast regardless of position | No random page access, opaque cursor |
| **Keyset** | Fast, stable with ORDER BY | Requires unique, sequential column |

#### Filtering & Sorting

```
GET /users?status=active&role=admin         # Filtering
GET /users?sort=created_at&order=desc       # Sorting
GET /users?fields=id,name,email             # Field selection (sparse)
GET /users?q=john                           # Search
```

#### Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL path** | `/v1/users` | Clear, easy to route | Pollutes URL, hard to deprecate |
| **Query parameter** | `/users?version=1` | Easy to add | Easy to miss, optional |
| **Header** | `Accept: application/vnd.api.v1+json` | Clean URL | Less visible, harder to test |
| **Content negotiation** | `Accept: application/vnd.company.v1+json` | RESTful, flexible | Complex to implement |

:::info Industry Standard
**URL path versioning** (`/v1/users`) is the most common in practice (used by Stripe, Twitter, Google). It's not the most "RESTful" but it's the most pragmatic — easy to understand, route, test, and document.
:::

### HATEOAS Example

```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active",
  "_links": {
    "self": { "href": "/users/123" },
    "orders": { "href": "/users/123/orders" },
    "deactivate": { "href": "/users/123/deactivate", "method": "POST" }
  }
}
```

---

## ⚡ gRPC

### What is gRPC?

gRPC is a high-performance RPC framework built on **HTTP/2** and **Protocol Buffers** (protobuf). It's designed for low-latency, high-throughput service-to-service communication.

### Protocol Buffers (Protobuf)

```protobuf
// user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);        // Server streaming
  rpc UploadUsers(stream User) returns (UploadResponse);        // Client streaming
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);    // Bidirectional
}

message GetUserRequest {
  int64 id = 1;
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
  google.protobuf.Timestamp created_at = 5;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}
```

### gRPC Streaming Types

| Type | Client | Server | Use Case |
|------|--------|--------|----------|
| **Unary** | 1 request | 1 response | Simple request/response (like REST) |
| **Server streaming** | 1 request | N responses | Real-time feeds, large result sets |
| **Client streaming** | N requests | 1 response | File uploads, batch processing |
| **Bidirectional** | N requests | N responses | Chat, real-time collaboration |

```
Unary:              Server Stream:        Client Stream:       Bidirectional:
Client ──req──►     Client ──req──►       Client ──req──►      Client ──req──►
       ◄──res──            ◄──res──              ──req──►              ◄──res──
                           ◄──res──              ──req──►              ──req──►
                           ◄──res──       ◄──────res──────              ◄──res──
                           ◄──done──                                   ──req──►
                                                                       ◄──res──
```

### gRPC vs REST Comparison

| Feature | REST | gRPC |
|---------|------|------|
| **Protocol** | HTTP/1.1 or HTTP/2 | HTTP/2 (always) |
| **Payload** | JSON (text, human-readable) | Protobuf (binary, compact) |
| **Contract** | OpenAPI/Swagger (optional) | `.proto` file (required, strict) |
| **Code generation** | Optional (OpenAPI codegen) | Built-in (protoc compiler) |
| **Streaming** | Limited (WebSocket, SSE) | Native (4 streaming types) |
| **Browser support** | Native | Requires grpc-web proxy |
| **Performance** | Good | Excellent (7-10x faster serialization) |
| **Tooling** | Postman, curl, browser | BloomRPC, grpcurl, Evans |
| **Error handling** | HTTP status codes | Rich error model with status codes |
| **Deadline/timeout** | Not built-in | Built-in deadline propagation |
| **Load balancing** | L7 LB (standard) | Requires HTTP/2-aware LB |
| **Best for** | Public APIs, web clients | Internal microservices, real-time |

:::tip When to Use What
- **REST** → Public-facing APIs, browser clients, simple CRUD, human-debuggable
- **gRPC** → Internal microservices, high-performance, real-time streaming, strict contracts
- **Both** → Use gRPC internally, expose REST externally via gRPC-Gateway
:::

---

## 🔮 GraphQL

### Core Concepts

```graphql
# Schema Definition
type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
}

type Order {
  id: ID!
  total: Float!
  items: [OrderItem!]!
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String): User!
}

type Subscription {
  orderCreated(userId: ID!): Order!
}
```

```graphql
# Client Query — request exactly what you need
query {
  user(id: "123") {
    name
    email
    orders {
      id
      total
    }
  }
}
```

### The N+1 Problem

```
Query: { users { orders { items } } }

Without DataLoader:                  With DataLoader:
──────────────────                   ──────────────────
SELECT * FROM users          (1)     SELECT * FROM users           (1)
SELECT * FROM orders                 SELECT * FROM orders
  WHERE user_id = 1          (N)       WHERE user_id IN (1,2,3...) (1)
SELECT * FROM orders                 SELECT * FROM items
  WHERE user_id = 2                    WHERE order_id IN (...)     (1)
SELECT * FROM orders
  WHERE user_id = 3                  Total: 3 queries
...
Total: 1 + N + N*M queries
```

**DataLoader** batches and caches individual lookups into bulk queries within a single request.

### GraphQL vs REST

| Feature | REST | GraphQL |
|---------|------|---------|
| **Endpoint** | Multiple (`/users`, `/orders`) | Single (`/graphql`) |
| **Data fetching** | Fixed response shape | Client specifies exact fields needed |
| **Over-fetching** | Common (get all fields) | Eliminated (request only what you need) |
| **Under-fetching** | Common (multiple requests needed) | Eliminated (one request, nested data) |
| **Versioning** | URL/header versioning | Schema evolution (deprecate fields) |
| **Caching** | HTTP caching (by URL) | Complex (POST, unique queries) |
| **File upload** | Multipart form data | Requires separate spec (multipart) |
| **Learning curve** | Low | Medium-High |
| **Best for** | Simple CRUD, public APIs | Complex UIs, mobile apps, BFF pattern |

---

## 🔑 API Authentication

| Method | Description | Best For |
|--------|-------------|----------|
| **API Key** | Static key in header or query param | Simple internal/partner APIs |
| **OAuth 2.0** | Token-based, delegated access | Third-party access, user consent |
| **JWT (Bearer Token)** | Self-contained token in `Authorization` header | Stateless microservices |
| **mTLS** | Client certificate authentication | Service-to-service, zero-trust |
| **Basic Auth** | Base64(username:password) in header | Simple, over HTTPS only |
| **HMAC Signature** | Request signing with shared secret | AWS APIs, webhooks |

```
# API Key
curl -H "X-API-Key: abc123" https://api.example.com/data

# Bearer Token (JWT)
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1..." https://api.example.com/data

# Basic Auth
curl -u username:password https://api.example.com/data

# HMAC Signature (AWS SigV4 style)
curl -H "Authorization: AWS4-HMAC-SHA256 Credential=..." https://api.example.com/data
```

---

## 🔄 Idempotency in API Design

An operation is **idempotent** if performing it multiple times has the same effect as performing it once.

| Method | Naturally Idempotent? | How to Make Idempotent |
|--------|:---------------------:|----------------------|
| GET | ✅ Yes | N/A (read-only) |
| PUT | ✅ Yes | Replace entire resource |
| DELETE | ✅ Yes | Same result whether resource exists or not |
| POST | ❌ No | Use idempotency key |
| PATCH | ❌ No | Use idempotency key |

### Idempotency Key Pattern

```
Client generates unique key per operation:

POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
{
  "amount": 100.00,
  "currency": "USD"
}

Server behavior:
1. First time: Process payment, store result with idempotency key
2. Second time (retry): Return stored result without processing again
3. Different key: Process as new payment
```

```java
@PostMapping("/payments")
public ResponseEntity<Payment> createPayment(
        @RequestHeader("Idempotency-Key") String idempotencyKey,
        @RequestBody PaymentRequest request) {
    
    return paymentCache.get(idempotencyKey)
        .map(ResponseEntity::ok)
        .orElseGet(() -> {
            Payment payment = paymentService.process(request);
            paymentCache.put(idempotencyKey, payment, Duration.ofHours(24));
            return ResponseEntity.status(201).body(payment);
        });
}
```

:::warning Why Idempotency Matters
Network failures, timeouts, and client retries are inevitable in distributed systems. Without idempotency, a retry could create duplicate payments, orders, or messages. **Stripe**, **PayPal**, and all payment APIs require idempotency keys for this reason.
:::

---

## 🏗️ API Gateway Pattern

```
┌──────────┐     ┌──────────────────────────────────────┐
│  Mobile   │────►│                                      │
│  App      │     │         API Gateway                  │
└──────────┘     │                                      │
                  │  • Authentication / Authorization     │
┌──────────┐     │  • Rate Limiting                      │     ┌──────────┐
│  Web      │────►│  • Request Routing                   │────►│ User Svc │
│  App      │     │  • Load Balancing                    │     └──────────┘
└──────────┘     │  • Request/Response Transformation    │
                  │  • Caching                           │     ┌──────────┐
┌──────────┐     │  • Circuit Breaking                  │────►│Order Svc │
│  Partner  │────►│  • Logging & Monitoring              │     └──────────┘
│  API      │     │  • SSL Termination                   │
└──────────┘     │  • API Versioning                    │     ┌──────────┐
                  │                                      │────►│Payment   │
                  └──────────────────────────────────────┘     │ Svc      │
                                                               └──────────┘
```

| API Gateway | Type | Strengths |
|-------------|------|-----------|
| **Kong** | Open source | Plugin ecosystem, Lua-based |
| **AWS API Gateway** | Managed | AWS integration, Lambda proxy |
| **Apigee** | Managed | Analytics, monetization |
| **Zuul / Spring Cloud Gateway** | Open source | Java ecosystem, Netflix OSS |
| **Envoy** | Open source | Service mesh, gRPC support |

---

## 🪝 Webhook Pattern

Webhooks are **reverse APIs** — instead of the client polling for updates, the server pushes events to a client-provided URL.

```
Traditional Polling:                  Webhooks:

Client ──GET /status──► Server       Server ──POST /webhook──► Client
Client ──GET /status──► Server         (only when event occurs)
Client ──GET /status──► Server       
Client ──GET /status──► Server       Much more efficient!
  (mostly empty responses)
```

### Webhook Best Practices

| Practice | Description |
|----------|-------------|
| **HMAC signature** | Sign payloads so clients can verify authenticity |
| **Retry with backoff** | Retry failed deliveries with exponential backoff |
| **Idempotency** | Include event ID so clients can deduplicate |
| **Timeout** | Set reasonable timeout (5–30s) for webhook delivery |
| **Event types** | Let clients subscribe to specific event types |
| **Payload size** | Keep small — include event ID and type, let client fetch details |

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

---

## 🔥 Interview Questions

### Conceptual

1. **What are the REST constraints? Which one is most commonly violated?**
   > Client-server, stateless, cacheable, uniform interface, layered system, code on demand (optional). **Statelessness** is most commonly violated — many APIs use server-side sessions. The uniform interface constraint (resources identified by URIs, manipulation through representations) is also frequently broken with RPC-style endpoints.

2. **When would you choose gRPC over REST?**
   > When you need: high performance (binary protobuf), streaming (server/client/bidirectional), strict contract enforcement (.proto files), automatic code generation, deadline propagation. Typically for internal microservice communication where browser support isn't needed.

3. **Explain the N+1 problem in GraphQL and how to solve it.**
   > When resolving nested fields, a naive resolver makes 1 query for the parent and N queries for each child (e.g., 1 for users + 1 per user for their orders = N+1 queries). Solved with **DataLoader**: batches individual lookups into bulk queries within a single tick of the event loop.

4. **What is idempotency and why does it matter in API design?**
   > Idempotency means multiple identical requests produce the same result as one request. It matters because network failures cause retries — without idempotency, retries can create duplicates (double charges, duplicate orders). Implement with idempotency keys for non-idempotent methods (POST).

5. **Compare API versioning strategies. Which do you prefer?**
   > URL path (`/v1/users`): most common, simple, easy to route. Header-based: cleaner URLs but harder to test. Query param: easy to miss. Content negotiation: most RESTful but complex. **URL path** is preferred for its simplicity and widespread adoption.

### Scenario-Based

6. **You're designing an API for a mobile app. REST or GraphQL?**
   > GraphQL is often better for mobile: request only needed fields (bandwidth savings), get related data in one request (fewer round trips), evolve the schema without versioning. But consider the complexity trade-off — REST is simpler and better supported by caching.

7. **Your microservices communicate over REST. Latency is high. What do you do?**
   > Consider gRPC: binary protobuf (smaller payloads), HTTP/2 multiplexing (fewer connections), streaming (no polling). Other optimizations: connection pooling, response compression, caching, async communication via message queues for non-critical paths.

8. **How would you design rate limiting for a public API?**
   > Use token bucket algorithm per API key. Return `429 Too Many Requests` with `Retry-After` header and rate limit info (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). Implement in the API gateway layer. Use Redis for distributed rate state. Offer different tiers (free: 100/min, paid: 10K/min).

9. **You need to notify third-party integrations about events in your system. How?**
   > Implement webhooks: let integrators register callback URLs for specific event types. Sign payloads with HMAC for authenticity. Implement retry with exponential backoff. Include idempotency keys. Provide a webhook log/dashboard for debugging. Fallback: also offer polling endpoints for event history.

10. **Design the API for a simple e-commerce system.**
    > Resources: `/products`, `/users`, `/orders`, `/payments`. Use proper HTTP verbs, cursor-based pagination for listings, idempotency keys for order creation and payments, versioning via URL path. Authentication via JWT. Rate limiting per user. Webhooks for order status changes to merchants.
