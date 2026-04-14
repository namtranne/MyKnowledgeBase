# Chapter 9 — Design a Web Crawler

> A web crawler (spider/bot) systematically browses the internet to discover and download web content. It's the backbone of search engines (Googlebot), web archives (Wayback Machine), and data mining systems.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Purpose** | Search engine indexing |
| **Pages/month** | 1 billion pages |
| **Content types** | HTML only (extensible to images, PDFs later) |
| **New and updated pages** | Handle both discovery and re-crawling |
| **Storage** | Store crawled pages for up to 5 years |
| **Duplicates** | De-duplicate content |
| **Politeness** | Respect robots.txt and don't overload websites |
| **Robustness** | Handle traps, malformed HTML, server errors |

### Estimation

```
  1 billion pages / month
  1B / (30 days × 86,400 sec) ≈ ~400 pages/second
  Peak: ~800 pages/second
  
  Average page size: 500 KB (HTML + minimal assets)
  Storage/month: 1B × 500 KB = 500 TB/month
  Storage for 5 years: 500 TB × 60 months = 30 PB
  
  With compression (5:1): ~6 PB
```

---

## High-Level Architecture

```
  ┌─────────────────┐
  │   Seed URLs      │  (starting points)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   URL Frontier   │  (queue of URLs to crawl)
  └────────┬────────┘
           ▼
  ┌─────────────────┐       ┌─────────────────┐
  │   HTML           │──────▶│  DNS Resolver    │
  │   Downloader     │       │  (+ DNS cache)   │
  └────────┬────────┘       └─────────────────┘
           ▼
  ┌─────────────────┐
  │  Content Parser  │  (extract text, validate HTML)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │  Content Seen?   │  (de-duplication via fingerprints)
  │  (Simhash/MD5)   │
  └──┬─────────┬────┘
     │ NEW     │ DUPLICATE
     ▼         ▼ (discard)
  ┌─────────────────┐
  │  Link Extractor  │  (find URLs in page)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │  URL Filter      │  (blocklist, extension filter, etc.)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │  URL Seen?       │  (Bloom filter / DB check)
  └──┬─────────┬────┘
     │ NEW     │ SEEN
     ▼         ▼ (discard)
  ┌─────────────────┐
  │  URL Frontier    │  (back to the queue)
  └─────────────────┘
```

---

## Component Deep Dives

### 1. Seed URLs

Starting points for the crawl. Strategy matters:

| Strategy | When to Use |
|----------|-------------|
| **By topic** | Start with top sites per category (e.g., shopping: amazon.com, ebay.com) |
| **By geography** | Start with country-specific domains (.co.uk, .de, .jp) |
| **By popularity** | Start with top-1M sites (Alexa rankings) |
| **From sitemap** | Many sites publish sitemaps — start there |

For a search engine, start with a few thousand high-quality seed URLs. The crawler discovers the rest by following links.

### 2. URL Frontier

The URL frontier is not a simple FIFO queue. It must handle **politeness** and **priority**.

#### Politeness: Don't Hammer Hosts

```
  BAD:  Crawl example.com 100 times/second → overwhelm their server
  GOOD: Crawl example.com once every 1-2 seconds → respectful
```

**Implementation**: Separate queue per hostname. One worker per hostname queue. Rate limit per host.

```
  ┌──────────────────────────────────────────────┐
  │                URL Frontier                   │
  │                                              │
  │  ┌─────────────┐  ┌─────────────┐            │
  │  │ Priority     │  │ Priority     │           │
  │  │ Queues       │  │ Queues       │           │
  │  │ (Prioritizer)│  │              │           │
  │  └──────┬──────┘  └──────┬──────┘            │
  │         ▼                ▼                    │
  │  ┌───────────────────────────────┐            │
  │  │      Queue Router             │            │
  │  └──┬──────┬──────┬──────┬──────┘            │
  │     ▼      ▼      ▼      ▼                   │
  │  [host1] [host2] [host3] [host4]  ← per-host │
  │     │      │      │      │          queues    │
  │     ▼      ▼      ▼      ▼                   │
  │  [worker] [worker] [worker] [worker]          │
  └──────────────────────────────────────────────┘
```

#### Priority: Important Pages First

Not all URLs are equally important. Prioritize by:

| Signal | Higher Priority |
|--------|----------------|
| **PageRank** | Pages with more inbound links |
| **Update frequency** | Pages that change often (news sites) |
| **Domain authority** | Higher authority domains first |
| **URL depth** | Shallower paths first (homepage > deep subpage) |

#### Freshness: Re-crawl Strategy

Web pages change. How often should you re-crawl?

| Strategy | How |
|----------|-----|
| **Recrawl all periodically** | Simple but wasteful |
| **Prioritize by change history** | Pages that changed recently → recrawl sooner |
| **Adaptive** | Track change frequency per page; adjust recrawl interval |

### 3. HTML Downloader

Fetches the page content over HTTP/HTTPS.

**Key considerations:**

| Concern | Solution |
|---------|----------|
| **robots.txt** | Download and cache robots.txt per domain; respect Disallow rules |
| **Timeouts** | Set max wait time (e.g., 30 seconds); abandon slow servers |
| **Retries** | Retry transient errors (5xx, timeouts) with exponential backoff |
| **HTTP status codes** | 200 → process; 301/302 → follow redirect; 403/404 → skip; 5xx → retry |
| **DNS resolution** | DNS lookups add ~10ms per request; cache DNS responses aggressively |
| **Distributed crawling** | Run crawlers in multiple regions; crawl geographically close servers |

#### Robots.txt

```
  # Example robots.txt for example.com
  User-agent: Googlebot
  Allow: /
  
  User-agent: *
  Disallow: /admin/
  Disallow: /private/
  Crawl-delay: 10          # Wait 10 seconds between requests
```

The crawler must download, parse, and cache robots.txt for each domain before crawling its pages.

### 4. Content Deduplication

~30% of web pages are duplicates or near-duplicates. Detecting them saves massive storage and processing.

| Method | How It Works | Accuracy |
|--------|-------------|----------|
| **MD5/SHA hash** | Hash the entire page content | Exact duplicates only |
| **Simhash** | Locality-sensitive hash — similar pages produce similar hashes | Detects near-duplicates |
| **MinHash** | Estimate Jaccard similarity between document shingle sets | Detects near-duplicates |

**Simhash approach:**
```
  Page A: simhash = 1001010110101001
  Page B: simhash = 1001010110101011  (Hamming distance = 1 → near-duplicate)
  Page C: simhash = 0110101001010110  (Hamming distance = 10 → different)
  
  Threshold: Hamming distance ≤ 3 → treat as duplicate
```

Google uses simhash at scale to detect duplicate web pages.

### 5. URL Deduplication

Avoid adding URLs to the frontier that we've already crawled or queued.

**Bloom filter**: A space-efficient probabilistic data structure.

```
  10 billion URLs × ~10 bits per URL = ~12 GB of memory
  
  URL arrives → check Bloom filter:
    "Definitely not seen" → add to frontier
    "Probably seen"       → skip (false positive rate ~1%)
```

For guaranteed accuracy, combine Bloom filter with a database check on "probably seen" results.

### 6. URL Normalization

The same page can have many URL representations:

```
  These all point to the same page:
    https://example.com/page
    https://example.com/page/
    https://EXAMPLE.COM/page
    https://example.com/page?ref=twitter
    https://example.com/page#section
    http://example.com/page  (if redirects to https)
```

**Normalization rules:**
1. Convert scheme and hostname to lowercase
2. Remove default ports (80 for HTTP, 443 for HTTPS)
3. Remove fragment identifiers (#section)
4. Remove tracking parameters (?utm_source=...)
5. Remove trailing slashes
6. Resolve relative paths (../page → absolute path)

---

## Crawler Traps

Web crawlers can get stuck in infinite loops:

| Trap | Example | Mitigation |
|------|---------|------------|
| **Infinite depth** | example.com/a/a/a/a/a/... (auto-generated) | Set maximum URL depth (e.g., 15 levels) |
| **Calendar traps** | example.com/calendar?date=2024-01-01 → 2024-01-02 → ... | Detect repetitive URL patterns |
| **Session IDs in URL** | example.com/page?sessionid=abc123 | Strip session-related parameters |
| **Dynamic content** | Same content served at infinite URLs | Content deduplication (simhash) |
| **Cloaking** | Different content for crawlers vs users | Compare rendered content across user agents |

**General defense**: Set a max page limit per domain. Monitor crawl rates per domain. Maintain a manual blocklist for known traps.

---

## Distributed Crawling

To achieve 1 billion pages/month, crawl across multiple machines:

```
  ┌──────────────────────────────────────┐
  │          URL Frontier (Kafka)         │
  └──┬──────┬──────┬──────┬──────┬──────┘
     ▼      ▼      ▼      ▼      ▼
  [Crawler][Crawler][Crawler][Crawler][Crawler]
  [Node 1 ][Node 2 ][Node 3 ][Node 4 ][Node 5]
     │      │      │      │      │
     └──────┴──────┴──────┴──────┘
                   │
            ┌──────▼──────┐
            │  Content     │
            │  Storage     │
            │ (S3/HDFS)    │
            └─────────────┘
```

**Partitioning strategy**: Assign URL ranges to crawlers by hostname hash. This ensures:
- One crawler per host → natural politeness enforcement
- No duplicate fetches across crawlers
- Easy to rebalance with consistent hashing

---

## Storage

| Component | Storage System | Why |
|-----------|---------------|-----|
| **URL frontier** | Disk-backed queue (Kafka) or Redis | Persistence across restarts; high throughput |
| **Crawled content** | S3, HDFS, or blob storage | Cheap, durable, high capacity |
| **URL database** | RocksDB or Cassandra | Fast key lookups for dedup |
| **Metadata** | PostgreSQL or Cassandra | Structured data about crawled pages |
| **Bloom filter** | In-memory (backed by disk) | Fast URL deduplication |

---

## Interview Cheat Sheet

**Q: How would you design a web crawler?**
> Core components: URL frontier (prioritized, politeness-aware queue), HTML downloader (respects robots.txt, handles timeouts), content parser, content deduplicator (simhash), link extractor, URL deduplicator (Bloom filter). Data flows in a loop: frontier → download → parse → extract links → filter → frontier. Distribute crawlers across machines, partitioned by hostname hash for natural politeness.

**Q: How do you handle politeness?**
> Respect robots.txt for each domain. Implement per-host rate limiting — one request per 1-2 seconds per domain. Use separate queues per hostname in the URL frontier, with one worker thread per queue. This ensures no single site is overwhelmed regardless of how many URLs from that site are in the frontier.

**Q: How do you detect duplicate content?**
> Use simhash or MinHash for near-duplicate detection. Simhash generates a fingerprint where similar documents have similar fingerprints (small Hamming distance). If two pages have a Hamming distance ≤ 3, treat them as duplicates. For exact duplicates, a simple MD5 hash suffices. Store fingerprints in a database or hash map for O(1) lookup.

**Q: How do you avoid crawler traps?**
> Set a maximum URL depth (e.g., 15 levels). Set a maximum number of pages per domain per crawl cycle. Use URL normalization to deduplicate equivalent URLs. Detect repetitive URL patterns (e.g., infinitely deep calendars). Use content deduplication to detect when the same content is served at different URLs. Maintain a manual blocklist for known trap sites.

**Q: How do you scale a web crawler to billions of pages?**
> Distribute crawlers across many machines, partitioned by hostname hash. Use Kafka or a distributed queue for the URL frontier. Store crawled content in S3/HDFS. Use Bloom filters for URL deduplication (12 GB for 10 billion URLs). Crawl from multiple geographic regions to reduce latency. Scale crawlers horizontally — each machine crawls independently from its partition of the frontier.
