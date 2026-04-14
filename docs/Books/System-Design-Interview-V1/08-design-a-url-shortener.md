# Chapter 8 — Design a URL Shortener

> A URL shortener (like TinyURL, bit.ly) takes a long URL and generates a short, unique alias. When the short URL is visited, the user is redirected to the original URL.

---

## Requirements

### Functional Requirements

| Feature | Detail |
|---------|--------|
| **Shorten** | Given a long URL, generate a unique short URL |
| **Redirect** | When a short URL is accessed, redirect to the original URL |
| **Custom alias** | Optionally allow users to pick a custom short URL |
| **Expiration** | URLs expire after a configurable time (default: 5 years) |
| **Analytics** | Track click count, referrer, device (optional) |

### Non-Functional Requirements & Estimation

| Metric | Estimate |
|--------|----------|
| Write (new URLs/day) | 100 million |
| Read:Write ratio | 10:1 |
| Read QPS | 100M × 10 / 86,400 ≈ **~116,000 QPS** |
| Write QPS | 100M / 86,400 ≈ **~1,160 QPS** |
| Storage per record | ~500 bytes (short URL + long URL + metadata) |
| Storage for 5 years | 100M × 365 × 5 × 500B ≈ **91 TB** |
| URL length | Short URL should be as short as possible (7 characters) |

---

## API Design

```
POST /api/v1/shorten
  Request:  { "longUrl": "https://example.com/very/long/path" }
  Response: { "shortUrl": "https://tny.im/abc1234" }

GET /api/v1/{shortUrl}
  Response: HTTP 301 or 302 redirect to the original long URL

DELETE /api/v1/{shortUrl}
  Response: 204 No Content
```

### 301 vs 302 Redirect

| Status | Meaning | Behavior | Use When |
|--------|---------|----------|----------|
| **301 Moved Permanently** | Browser caches the redirect | Subsequent visits skip the shortener server | Reducing server load is priority |
| **302 Found (Temporary)** | Browser does NOT cache | Every visit hits the shortener server | Analytics/tracking is priority |

**bit.ly uses 301** for most links. **If you need analytics, use 302** so every click goes through your server.

---

## URL Shortening Approaches

### Approach 1: Hash + Collision Detection

```
  Long URL → hash function → take first 7 characters → check for collision
  
  hash("https://example.com/path") → "5d41402abc4b2a76b9719d9"
  Take first 7: "5d41402"
  
  Check DB: does "5d41402" exist?
    No  → store mapping
    Yes → append character, rehash, or try next 7 chars
```

**Hash functions:**

| Function | Output | First 7 chars uniqueness |
|----------|--------|------------------------|
| CRC32 | 32-bit (8 hex chars) | Moderate collisions |
| MD5 | 128-bit (32 hex chars) | Low collisions |
| SHA-256 | 256-bit (64 hex chars) | Very low collisions |
| MurmurHash | 32/128-bit | Low collisions, very fast |

**Problem**: Collision detection requires a database lookup on every write. Use a Bloom filter to check existence in memory first.

### Approach 2: Base62 Encoding (Recommended)

Convert a unique numeric ID to a compact string using 62 characters: `[0-9, a-z, A-Z]`.

```
  Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
  
  62^7 = 3.5 trillion possible URLs (more than enough for 5 years)
  
  ID: 11157 → Base62 encoding:
    11157 / 62 = 179 remainder 59 → 'X'
    179 / 62   = 2   remainder 55 → 'T'
    2 / 62     = 0   remainder 2  → '2'
    
    Result: "2TX" (read remainders bottom-up)
    Short URL: https://tny.im/2TX
```

**How to get the unique numeric ID?** Use a distributed ID generator (Chapter 7 — Snowflake or auto-increment ticket server).

| Approach | Pros | Cons |
|----------|------|------|
| **Hash + Collision** | Fixed length; no ID generator needed | Collision resolution is complex; DB check per write |
| **Base62 + ID Generator** | No collisions; simple; deterministic | Dependent on ID generator; ID is guessable (sequential) |

**Recommendation**: Base62 with a Snowflake ID generator for most production systems.

---

## High-Level Design

```
  ┌──────────┐     ┌────────────────┐     ┌──────────────────┐
  │  Client  │────▶│  Load Balancer │────▶│  Web Servers     │
  └──────────┘     └────────────────┘     │  (Stateless)     │
                                          └────────┬─────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │  Cache   │  │ ID Gen   │  │ Database │
                              │ (Redis)  │  │(Snowflake│  │ (MySQL/  │
                              │          │  │  /Ticket)│  │  NoSQL)  │
                              └──────────┘  └──────────┘  └──────────┘
```

### Write Flow (URL Shortening)

```
  1. Client: POST /api/v1/shorten {"longUrl": "https://example.com/path"}
  2. Web Server: Check if longUrl already exists in DB
     ├── Yes → return existing shortUrl
     └── No  → generate unique ID (Snowflake)
               → convert ID to Base62 string
               → store {shortUrl, longUrl, createdAt, expiresAt} in DB
               → return shortUrl
```

### Read Flow (Redirect)

```
  1. Client: GET /tny.im/abc1234
  2. Web Server: check cache (Redis)
     ├── Cache HIT  → return 302 redirect to longUrl
     └── Cache MISS → query DB
                      ├── Found → store in cache, return 302 redirect
                      └── Not found → return 404
```

---

## Data Model

### Database Schema

```sql
CREATE TABLE url_mapping (
    id          BIGINT PRIMARY KEY,       -- Snowflake ID
    short_url   VARCHAR(7) UNIQUE,        -- Base62 encoded ID
    long_url    VARCHAR(2048) NOT NULL,    -- Original URL
    user_id     BIGINT,                   -- Creator (nullable)
    created_at  TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP,
    click_count BIGINT DEFAULT 0
);

-- Index for reverse lookup
CREATE INDEX idx_long_url ON url_mapping(long_url);
```

### Database Choice

| Option | Why |
|--------|-----|
| **Relational (MySQL/PostgreSQL)** | Strong consistency, supports unique constraints, well-understood |
| **NoSQL (DynamoDB/Cassandra)** | Better for write-heavy workloads, easier to shard, higher throughput |

For a URL shortener, either works. With Base62 + Snowflake IDs, the write pattern is append-only, which works well with both.

---

## Caching Strategy

The read-to-write ratio (10:1+) makes caching very effective:

```
  Cache: Redis with LRU eviction
  Cache size: 20% of daily URLs = 20M URLs × 500 bytes ≈ 10 GB
  
  Key:   short_url (e.g., "abc1234")
  Value: long_url  (e.g., "https://example.com/path")
  TTL:   24 hours (configurable)
```

**Cache hit rate**: Following the 80/20 rule (80% of traffic goes to 20% of URLs), a cache holding 20% of URLs can achieve a **~80% hit rate**.

---

## Deep Dive Topics

### URL Deduplication

If the same long URL is shortened multiple times, should it return the same short URL?

| Approach | Pros | Cons |
|----------|------|------|
| **Always create new** | Simple; each user gets their own analytics | More storage; same content gets multiple IDs |
| **Deduplicate** | Less storage; canonical short URL | Requires index on long_url; shared analytics |

**Practical choice**: Deduplicate per user (same user submitting same URL gets same result), but different users get different short URLs for per-user analytics.

### Custom Short URLs

```
  POST /api/v1/shorten
  { "longUrl": "...", "customAlias": "my-brand" }
  
  → Check if "my-brand" is taken
  → If available, store mapping
  → If taken, return 409 Conflict
```

### Analytics

For detailed analytics, log each redirect event:

```
  Event: {
    short_url: "abc1234",
    timestamp: "2024-03-15T10:30:00Z",
    referrer:  "twitter.com",
    user_agent: "Mozilla/5.0...",
    country:   "US",
    device:    "mobile"
  }
```

Stream events to Kafka → aggregate in a data pipeline (Spark/Flink) → store in a time-series DB or data warehouse for dashboards.

### Security

| Threat | Mitigation |
|--------|-----------|
| **Malicious URLs** | Scan long URLs against threat intelligence databases before shortening |
| **Enumeration attack** | Don't use purely sequential IDs — Snowflake IDs have enough entropy |
| **Spam** | Rate limit URL creation per user/IP |
| **Phishing** | Display a preview page before redirecting (like bit.ly does) |

---

## Interview Cheat Sheet

**Q: How would you design a URL shortener?**
> Generate a unique ID (Snowflake), encode it in Base62 to get a 7-character short URL, and store the mapping in a database. For reads, check a Redis cache first (80% hit rate with 80/20 rule), then fall back to the database. Use 302 redirects if you need analytics, 301 if reducing server load is the priority. Scale with stateless web servers behind a load balancer, and shard the database by short URL hash.

**Q: Why Base62 instead of Base64 or hex?**
> Base62 uses `[0-9, a-z, A-Z]` — all URL-safe characters without special characters. Base64 includes `+` and `/` which need URL encoding. Hex (Base16) produces longer strings. With Base62, 7 characters give 3.5 trillion unique URLs, sufficient for most scale requirements.

**Q: How do you handle high read traffic?**
> Cache the most popular URLs in Redis. With a 10:1 read-to-write ratio, most reads are for a small set of popular URLs (80/20 rule). Cache ~20% of daily URLs for ~80% hit rate. Use 301 redirects to let browsers cache the mapping locally, further reducing server load.

**Q: How do you prevent collision?**
> With Base62 encoding of Snowflake IDs, collisions are impossible — each ID is unique by construction. With hash-based approaches, use a Bloom filter for fast existence checks and rehash on collision. Base62 + Snowflake is preferred because it eliminates the collision problem entirely.

**Q: How would you shard the database?**
> Hash the short URL (or the numeric ID) and partition across database shards using consistent hashing. Each shard handles a range of hash values. This distributes both reads and writes evenly. For the long URL → short URL reverse lookup, maintain a separate index or use the same sharding with a secondary index.
