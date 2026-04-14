# System Design Interview — Volume 2

**Alex Xu & Sahn Lam (2022)**

Advanced system design problems with deep dives into real-world architectures. Each chapter covers a production-grade system end-to-end: requirements, high-level design, deep dives, scaling, and trade-offs.

---

## System Designs

| # | Chapter | Key Concepts |
|---|---------|-------------|
| 1 | [Proximity Service](./01-proximity-service.md) | Geospatial indexing, Geohash, Quadtree, Google S2 |
| 2 | [Nearby Friends](./02-nearby-friends.md) | Real-time location, WebSocket, Redis Pub/Sub |
| 3 | [Google Maps](./03-google-maps.md) | Map tiles, routing algorithms, Dijkstra, Contraction Hierarchies, ETA |
| 4 | [Distributed Message Queue](./04-distributed-message-queue.md) | Kafka-like design, partitions, consumer groups, commit log, ISR |
| 5 | [Metrics Monitoring & Alerting](./05-metrics-monitoring.md) | Time-series DB, push vs pull, aggregation, Prometheus, Gorilla compression |
| 6 | [Ad Click Event Aggregation](./06-ad-click-event-aggregation.md) | Stream processing, Flink, exactly-once, Lambda/Kappa architecture |
| 7 | [Hotel Reservation System](./07-hotel-reservation-system.md) | Inventory management, double-booking prevention, idempotency, concurrency control |
| 8 | [Distributed Email Service](./08-distributed-email-service.md) | SMTP, IMAP, email pipeline, full-text search, spam detection |
| 9 | [S3-like Object Storage](./09-s3-object-storage.md) | Data store, metadata, erasure coding, multipart upload, 11 nines durability |
| 10 | [Real-time Gaming Leaderboard](./10-real-time-gaming-leaderboard.md) | Redis sorted sets, skip lists, ranking at scale, tie-breaking |
| 11 | [Payment System](./11-payment-system.md) | PSP integration, reconciliation, double-entry ledger, exactly-once payments |
| 12 | [Digital Wallet](./12-digital-wallet.md) | Event sourcing, CQRS, distributed transactions (2PC, Saga, TCC) |
| 13 | [Stock Exchange](./13-stock-exchange.md) | Order matching engine, sequencer, LMAX Disruptor, low-latency design |
