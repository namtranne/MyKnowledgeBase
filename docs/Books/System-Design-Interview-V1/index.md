# System Design Interview — Volume 1

**Alex Xu (2020)**

A step-by-step framework for tackling system design interviews, followed by 10 real-world system designs worked through from requirements to detailed architecture.

---

## The Framework

| # | Chapter | Focus |
|---|---------|-------|
| 1 | [Scale From Zero to Millions](./01-scale-from-zero-to-millions.md) | Vertical/horizontal scaling, load balancers, CDN, caching, DB replication, message queues |
| 2 | [Back-of-the-Envelope Estimation](./02-back-of-the-envelope-estimation.md) | Power of 2, latency numbers, QPS, storage, bandwidth estimation |
| 3 | [The SDI Framework](./03-a-framework-for-system-design-interviews.md) | The 4-step approach: scope, propose, deep dive, wrap up |

## System Designs

| # | Chapter | Key Concepts |
|---|---------|-------------|
| 4 | [Rate Limiter](./04-design-a-rate-limiter.md) | Token bucket, sliding window, distributed rate limiting |
| 5 | [Consistent Hashing](./05-design-consistent-hashing.md) | Hash ring, virtual nodes, partition rebalancing |
| 6 | [Key-Value Store](./06-design-a-key-value-store.md) | Dynamo-style, quorums, conflict resolution, Merkle trees |
| 7 | [Unique ID Generator](./07-design-a-unique-id-generator.md) | UUID, Snowflake, database ticket server, clock skew |
| 8 | [URL Shortener](./08-design-a-url-shortener.md) | Hashing, Base62, 301 vs 302, analytics |
| 9 | [Web Crawler](./09-design-a-web-crawler.md) | BFS, URL frontier, politeness, deduplication, distributed crawling |
| 10 | [Notification System](./10-design-a-notification-system.md) | Push (APNs, FCM), SMS, email, fanout, retry, rate limiting |
| 11 | [News Feed](./11-design-a-news-feed-system.md) | Fan-out on write vs read, ranking, caching, pub/sub |
| 12 | [Chat System](./12-design-a-chat-system.md) | WebSocket, message sync, group chat, online presence |
| 13 | [Autocomplete](./13-design-a-search-autocomplete-system.md) | Trie, top-K, data collection, multi-layer caching |
