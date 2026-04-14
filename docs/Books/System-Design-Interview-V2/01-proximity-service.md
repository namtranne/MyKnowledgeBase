# Chapter 1: Proximity Service

> Design a proximity service (like Yelp nearby search, Google Places, or Facebook Nearby) that returns nearby businesses based on a user's location.

---

## 1. Problem Statement & Requirements

### Functional Requirements

1. **Search nearby businesses** — Given a user's location (latitude/longitude) and an optional radius, return a list of nearby businesses.
2. **Business CRUD** — Business owners can add, update, or delete business information. Changes don't need to be reflected in real time.
3. **View business detail** — Users can view detailed information about a business.

### Non-Functional Requirements

| Requirement        | Target                                                        |
| ------------------ | ------------------------------------------------------------- |
| **Low latency**    | Nearby search should return results within ~200ms              |
| **High availability** | The system should tolerate partial failures gracefully      |
| **Scalability**    | Handle spikes (e.g., lunchtime searches) without degradation   |
| **Eventual consistency** | Business data updates can propagate with a small delay  |

### Scale Estimates

| Metric                     | Value           |
| -------------------------- | --------------- |
| Daily active users (DAU)   | 100 million     |
| Total businesses           | 200 million     |
| Avg searches per user/day  | 5               |
| Search QPS                 | 100M × 5 / 86400 ≈ **~5,800 QPS** |
| Peak QPS (5× average)     | **~29,000 QPS** |
| Business write QPS         | Very low — hundreds/sec at most |

**Key insight**: The system is overwhelmingly **read-heavy**. Writes (business CRUD) are infrequent compared to the massive read volume from nearby searches.

### Data Size Estimation

- Each business record: ~1 KB (name, address, lat/lng, category, hours, photos metadata)
- 200M businesses × 1 KB = **~200 GB** — fits comfortably on a single modern database server
- Geo index data: ~50 bytes per entry × 200M = **~10 GB** — fits entirely in memory

---

## 2. High-Level Design

### API Design

#### Search Nearby Businesses

```
GET /v1/search/nearby?latitude=37.7749&longitude=-122.4194&radius=5000
```

| Parameter   | Type   | Required | Description                            |
| ----------- | ------ | -------- | -------------------------------------- |
| `latitude`  | float  | Yes      | User's latitude (-90 to 90)            |
| `longitude` | float  | Yes      | User's longitude (-180 to 180)         |
| `radius`    | int    | No       | Search radius in meters (default 5000) |
| `category`  | string | No       | Filter (restaurant, gas_station, etc.) |
| `limit`     | int    | No       | Max results (default 20)               |

**Response:**

```json
{
  "total": 42,
  "businesses": [
    {
      "business_id": "biz_12345",
      "name": "Joe's Coffee",
      "address": "123 Main St",
      "latitude": 37.7751,
      "longitude": -122.4183,
      "distance_meters": 120,
      "rating": 4.5,
      "category": "cafe"
    }
  ]
}
```

#### Business CRUD

```
GET    /v1/businesses/:id          — Get business detail
POST   /v1/businesses              — Create a business
PUT    /v1/businesses/:id          — Update a business
DELETE /v1/businesses/:id          — Delete a business
```

### Service Architecture

```
                        ┌───────────────┐
                        │ Load Balancer │
                        └───────┬───────┘
                                │
                        ┌───────┴───────┐
                        │  API Gateway  │
                        └───┬───────┬───┘
                            │       │
              ┌─────────────┘       └─────────────┐
              ▼                                   ▼
    ┌───────────────────┐              ┌────────────────────┐
    │  Location-Based   │              │  Business Service  │
    │  Service (LBS)    │              │                    │
    │                   │              │  • CRUD operations │
    │  • Nearby search  │              │  • Owner dashboard │
    │  • Read-heavy     │              │  • Write path      │
    │  • Stateless      │              │                    │
    └────────┬──────────┘              └─────────┬──────────┘
             │                                   │
             │ reads                              │ reads/writes
             ▼                                   ▼
    ┌─────────────────────────────────────────────────────┐
    │                  Database Cluster                    │
    │                                                     │
    │   ┌─────────┐    replication    ┌──────────────┐    │
    │   │ Primary │ ───────────────▶ │ Read Replicas │    │
    │   │  (Write)│                   │  (N nodes)   │    │
    │   └─────────┘                   └──────────────┘    │
    │                                                     │
    └─────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Component | Decision | Reasoning |
| --------- | -------- | --------- |
| **LBS** | Stateless service | Easy to scale horizontally; no session state |
| **Business Service** | Separate from LBS | Different read/write patterns, scale independently |
| **Database** | Primary-secondary replication | Business data changes are infrequent; replicas absorb read load |
| **LBS scaling** | Many read replicas | LBS reads far exceed writes; replicas reduce latency |

### Data Model

#### `businesses` table

```sql
CREATE TABLE businesses (
    business_id   BIGINT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    address       VARCHAR(512),
    city          VARCHAR(100),
    state         VARCHAR(50),
    country       VARCHAR(50),
    latitude      DOUBLE NOT NULL,
    longitude     DOUBLE NOT NULL,
    category      VARCHAR(100),
    rating        DECIMAL(2,1),
    phone         VARCHAR(20),
    hours_json    JSON,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `geo_index` table (for geohash-based approach)

```sql
CREATE TABLE geo_index (
    geohash       VARCHAR(12) NOT NULL,
    business_id   BIGINT NOT NULL,
    latitude      DOUBLE NOT NULL,
    longitude     DOUBLE NOT NULL,
    PRIMARY KEY (geohash, business_id)
);

CREATE INDEX idx_geohash ON geo_index (geohash);
```

---

## 3. Geospatial Indexing — Deep Dive

The core challenge of a proximity service is: **how do you efficiently find all businesses within a given radius of a point?**

### Approach 1: Two-Dimensional Search (Naive)

The most straightforward approach is a SQL query with range filters on latitude and longitude.

```sql
SELECT * FROM businesses
WHERE latitude  BETWEEN 37.77 - delta AND 37.77 + delta
  AND longitude BETWEEN -122.42 - delta AND -122.42 + delta;
```

**Why it fails at scale:**

Even with indexes on `latitude` and `longitude` individually, the database can only use ONE index efficiently. The query becomes:

```
Step 1: Use latitude index  → returns a LARGE set of rows in the latitude band
Step 2: Scan that set for longitude match → still slow
```

```
    Latitude
    ▲
    │    ┌──────────────────────────────────────┐  ← latitude band
    │    │            ┌──────┐                  │     (index helps here)
    │    │            │TARGET│                  │
    │    │            │ AREA │                  │
    │    │            └──────┘                  │
    │    └──────────────────────────────────────┘
    │
    └──────────────────────────────────────────▶ Longitude
```

The latitude index returns all businesses in a global horizontal band — millions of rows that must be scanned linearly for the longitude filter. This is effectively O(N) and unacceptable at our scale.

**Verdict**: Not usable. We need a way to map 2D space into a 1D index.

---

### Approach 2: Evenly Divided Grid

Divide the world into a fixed grid of equal-sized cells. Each cell gets an ID. To search, find the cell the user is in, then query that cell plus neighbors.

```
    ┌─────┬─────┬─────┬─────┬─────┐
    │  1  │  2  │  3  │  4  │  5  │
    ├─────┼─────┼─────┼─────┼─────┤
    │  6  │  7  │ 8●  │  9  │ 10  │
    ├─────┼─────┼─────┼─────┼─────┤  ● = user location
    │ 11  │ 12  │ 13  │ 14  │ 15  │
    ├─────┼─────┼─────┼─────┼─────┤
    │ 16  │ 17  │ 18  │ 19  │ 20  │
    └─────┴─────┴─────┴─────┴─────┘
```

**Query**: `WHERE grid_id IN (3, 7, 8, 9, 13, 2, 4, 12, 14)` (cell + 8 neighbors)

**Problems:**

| Issue | Description |
|-------|-------------|
| **Uneven distribution** | Manhattan cell has 100k businesses; Sahara cell has 0. Fixed grid size cannot adapt. |
| **Grid size dilemma** | Small cells → too many to query. Large cells → too many businesses per cell. |
| **No hierarchy** | Cannot zoom in/out efficiently. |

**Verdict**: Improvement over naive, but the fixed-size grid doesn't handle real-world density variation well.

---

### Approach 3: Geohash

Geohash is the most commonly discussed approach in interviews. It encodes a 2D coordinate into a 1D string using a recursive bisection of the world and base-32 encoding.

#### How Geohash Works

1. **Start with the full range**: latitude [-90, 90], longitude [-180, 180]
2. **Alternately bisect longitude then latitude**, producing bits:
   - If value is in the upper half → bit = 1
   - If value is in the lower half → bit = 0
3. **Group bits into 5-bit chunks** and encode with base-32 characters

**Example**: Encoding (37.7749, -122.4194)

```
Step 1 (lon): -122.4194 in [-180, 0) → 0
Step 2 (lat):  37.7749  in [0, 90)   → 1
Step 3 (lon): -122.4194 in [-180, -90) → 0
Step 4 (lat):  37.7749  in [0, 45)   → 0
Step 5 (lon): -122.4194 in [-135, -90) → 1
  → First 5 bits: 01001 → base32 = '9'
  ... continue for desired precision ...

Result: "9q8yyk..." (precision depends on how many bits we compute)
```

#### Geohash Precision Levels

| Precision | Cell Width    | Cell Height  | Use Case                      |
| --------- | ------------- | ------------ | ----------------------------- |
| 1         | 5,000 km      | 5,000 km     | Continent-level               |
| 2         | 1,250 km      | 625 km       | Large region                  |
| 3         | 156 km        | 156 km       | Country/state                 |
| **4**     | **39.1 km**   | **19.5 km**  | **City-level**                |
| **5**     | **4.9 km**    | **4.9 km**   | **Neighborhood** ★ common     |
| **6**     | **1.2 km**    | **0.61 km**  | **Street-level** ★ common     |
| 7         | 153 m         | 153 m        | Block-level                   |
| 8         | 38 m          | 19 m         | Building-level                |

**Optimal precision selection** for a proximity service:

| Search Radius | Geohash Precision |
| ------------- | ----------------- |
| 0.5 km        | 6                 |
| 1 km          | 5                 |
| 2 km          | 5                 |
| 5 km          | 4                 |
| 20 km         | 4                 |

#### Querying with Geohash

```sql
-- Find businesses in the user's geohash cell and all 8 neighbors
SELECT business_id, latitude, longitude
FROM geo_index
WHERE geohash LIKE '9q8yy%'     -- user's cell
   OR geohash LIKE '9q8yz%'     -- neighbor 1
   OR geohash LIKE '9q8ym%'     -- neighbor 2
   ...                           -- all 8 neighbors
ORDER BY distance(lat, lng, user_lat, user_lng)
LIMIT 20;
```

In practice, you compute the 9 geohash prefixes (cell + 8 neighbors) and issue a single query:

```sql
SELECT * FROM geo_index
WHERE geohash IN ('9q8yy', '9q8yz', '9q8ym', '9q8yq', '9q8yw',
                   '9q8yv', '9q8yt', '9q8yx', '9q8yk')
```

#### Geohash Boundary Problems

**Problem 1: Shared prefix ≠ proximity**

Two locations can share a long common geohash prefix yet be far apart, OR have completely different prefixes yet be neighbors.

```
    ┌────────────┬────────────┐
    │            │            │
    │   9q8yy    │   9q8yz    │
    │         A● │ ●B         │
    │            │            │
    └────────────┴────────────┘

    A and B are very close but have DIFFERENT geohash prefixes.
```

**Problem 2: Edge-of-cell businesses**

A business sitting right at the edge of a geohash cell might be closer to a user in a neighboring cell than businesses in the user's own cell.

**Solution**: Always query the user's cell PLUS the 8 surrounding neighbor cells. Libraries like `python-geohash` provide `neighbors()` functions.

```
    ┌───────┬───────┬───────┐
    │  NW   │   N   │  NE   │
    ├───────┼───────┼───────┤
    │   W   │ USER  │   E   │
    ├───────┼───────┼───────┤
    │  SW   │   S   │  SE   │
    └───────┴───────┴───────┘

    Query all 9 cells to handle boundary issues.
```

#### Geohash: Pros and Cons

| Pros | Cons |
|------|------|
| Simple to implement and understand | Fixed grid sizes don't adapt to density |
| Works natively with B-tree indexes in any relational DB | Boundary issues require querying neighbors |
| Easy to shard by geohash prefix | Shared prefix doesn't guarantee proximity |
| No in-memory data structure needed | Cannot dynamically adjust granularity |

---

### Approach 4: Quadtree

A quadtree recursively subdivides 2D space into four quadrants. It adapts to data density: dense areas (cities) get more subdivisions; sparse areas (oceans) stay as large cells.

#### Structure

```
                    ┌─────────────────────┐
                    │     Root (World)     │
                    └──────────┬──────────┘
               ┌───────┬──────┴──────┬───────┐
               ▼       ▼             ▼       ▼
             ┌───┐   ┌───┐        ┌───┐   ┌───┐
             │NW │   │NE │        │SW │   │SE │
             └─┬─┘   └───┘        └───┘   └─┬─┘
          ┌──┬─┴─┬──┐                   ┌──┬─┴─┬──┐
          ▼  ▼   ▼  ▼                   ▼  ▼   ▼  ▼
         NW NE  SW  SE                 NW NE  SW  SE
        (leaf nodes with ≤ 100 businesses each)
```

#### How It Works

```
World Map Quadtree Subdivision:

    ┌─────────────┬─────────────┐
    │             │     ┌───┬───┤
    │   Sparse    │     │██ │   │  ██ = Dense area (city)
    │   (leaf)    │     ├───┼───┤      gets subdivided further
    │             │     │   │██ │
    ├──────┬──────┼─────┴───┴───┤
    │      │      │             │
    │      │      │   Sparse    │
    │      │      │   (leaf)    │
    └──────┴──────┴─────────────┘
```

#### Building Algorithm

```python
class QuadTreeNode:
    def __init__(self, bounds, capacity=100):
        self.bounds = bounds        # (x_min, y_min, x_max, y_max)
        self.businesses = []
        self.children = None        # [NW, NE, SW, SE] when subdivided
        self.capacity = capacity

    def insert(self, business):
        if not self.contains(business.lat, business.lng):
            return False

        if self.children is None:
            self.businesses.append(business)
            if len(self.businesses) > self.capacity:
                self.subdivide()
            return True

        for child in self.children:
            if child.insert(business):
                return True
        return False

    def subdivide(self):
        x_min, y_min, x_max, y_max = self.bounds
        x_mid = (x_min + x_max) / 2
        y_mid = (y_min + y_max) / 2

        self.children = [
            QuadTreeNode((x_min, y_mid, x_mid, y_max), self.capacity),  # NW
            QuadTreeNode((x_mid, y_mid, x_max, y_max), self.capacity),  # NE
            QuadTreeNode((x_min, y_min, x_mid, y_mid), self.capacity),  # SW
            QuadTreeNode((x_mid, y_min, x_max, y_mid), self.capacity),  # SE
        ]
        for biz in self.businesses:
            for child in self.children:
                if child.insert(biz):
                    break
        self.businesses = []

    def search(self, lat, lng, radius):
        results = []
        if not self.intersects_circle(lat, lng, radius):
            return results
        if self.children is None:
            for biz in self.businesses:
                if distance(lat, lng, biz.lat, biz.lng) <= radius:
                    results.append(biz)
        else:
            for child in self.children:
                results.extend(child.search(lat, lng, radius))
        return results
```

#### Memory Estimation

| Component | Calculation | Size |
| --------- | ----------- | ---- |
| Internal nodes | 200M businesses / 100 per leaf ≈ 2M leaf nodes → ~670K internal nodes | — |
| Per internal node | bounds (32B) + 4 child pointers (32B) + metadata (16B) ≈ 80B | ~53 MB |
| Per leaf node | bounds (32B) + list of up to 100 business IDs (800B) | ~1.6 GB |
| **Total** | Internal + leaf nodes | **~1.7 GB** |

This fits comfortably in the memory of a single server. Each LBS instance can hold its own copy.

#### Build Time

Building the quadtree for 200M businesses takes a few minutes. On server startup, the tree is constructed from a database snapshot. During operation, the tree is read-only (or updated incrementally via a background process).

#### Quadtree: Pros and Cons

| Pros | Cons |
|------|------|
| Adapts to data density automatically | Must be built in memory on each server |
| Efficient range queries — prunes irrelevant subtrees | Operational complexity: build time, memory management |
| Great for read-heavy workloads | Updates are harder — typically rebuild periodically |
| Can answer "k-nearest" queries efficiently | Cannot leverage standard DB indexes |

---

### Approach 5: Google S2 Geometry

S2 is Google's geometry library based on mapping the Earth's surface onto a unit sphere and then onto the six faces of a surrounding cube, which are then subdivided using a **Hilbert curve**.

#### How S2 Cells Work

```
    1. Earth → Sphere → Cube (6 faces)

         ┌─────┐
         │  2  │
    ┌────┼─────┼────┬─────┐
    │  3 │  0  │  1 │  4  │
    └────┼─────┼────┴─────┘
         │  5  │
         └─────┘

    2. Each face is recursively divided into 4 cells (like a quadtree)
    3. Cells are numbered along a Hilbert curve for spatial locality

    Hilbert Curve (preserves 2D locality in 1D ordering):

    ┌──┐  ┌──┐
    │  │  │  │
    │  └──┘  │
    │        │
    └──┐  ┌──┘
       │  │
    ┌──┘  └──┐
    │        │
    │  ┌──┐  │
    │  │  │  │
    └──┘  └──┘
```

#### Key Advantages of S2

| Feature | Benefit |
|---------|---------|
| **Hilbert curve** | Better spatial locality than geohash's Z-order curve |
| **Region covering** | Can cover any arbitrary shape with a set of S2 cells at varying levels |
| **Equal-area cells** | Unlike geohash (which distorts near poles), S2 cells have more uniform areas |
| **64-bit cell ID** | Efficient storage and comparison as integers |
| **30 levels** | From ~85 km² (level 1) to ~1 cm² (level 30) — extremely flexible |

#### Region Covering

S2 can "cover" any region (circle, polygon) with a set of cells at varying levels. This produces tighter coverage than geohash's axis-aligned rectangles.

```
    Geohash coverage of a circle:     S2 coverage of a circle:

    ┌──┬──┬──┐                        ┌──┬──┬──┐
    │  │░░│  │   ░ = wasted area      │  │▓▓│  │   Much tighter fit
    ├──┼──┼──┤                        ├──┼──┼──┤   using multi-level cells
    │░░│██│░░│   █ = target area      │  │██│  │
    ├──┼──┼──┤                        ├──┼──┼──┤
    │  │░░│  │                        │  │▓▓│  │
    └──┴──┴──┘                        └──┴──┴──┘
```

---

### Comparison of All Approaches

| Criteria | 2D Search | Even Grid | Geohash | Quadtree | S2 |
|----------|-----------|-----------|---------|----------|----|
| **Implementation** | Trivial | Simple | Simple | Medium | Complex |
| **Query efficiency** | O(N) | O(cells × biz/cell) | O(9 × biz/cell) | O(log N) | O(cells) |
| **Density adaptation** | No | No | No | **Yes** | Partial |
| **DB index friendly** | Partial | Yes | **Yes** | No (in-memory) | Yes |
| **Boundary handling** | N/A | Neighbors | Neighbors | Built-in | Built-in |
| **Dynamic updates** | Easy | Easy | Easy | Hard | Easy |
| **Operational complexity** | Low | Low | Low | **High** | Medium |
| **Used by** | — | — | Yelp, Redis | Yext | Google Maps, Uber (H3) |
| **Best for interviews** | Explain only | Explain only | **★ Recommended** | **★ Recommended** | Mention |

---

## 4. Geohash vs Quadtree — Deep Dive

This is one of the most common follow-up questions in interviews. Here's a thorough comparison.

### When to Choose Geohash

- You want a **simple, stateless** architecture
- Your infrastructure is **database-centric** (PostgreSQL with PostGIS, MySQL)
- Business distribution is **relatively uniform** (or you tolerate querying extra empty cells)
- You need **easy sharding** — geohash prefix is a natural shard key
- You want **minimal operational overhead** — no in-memory structures to manage

```
Geohash Architecture:

   User Request → Compute geohash → Query DB index → Filter by distance → Return

   Simple, stateless, each request is independent.
```

### When to Choose Quadtree

- Business distribution is **highly uneven** (e.g., dense cities, sparse rural)
- You need **adaptive granularity** — NYC blocks need finer resolution than Montana
- You have **sufficient memory** per server (~2 GB for 200M businesses)
- Reads vastly dominate writes (quadtree is essentially a read-optimized cache)
- You need **k-nearest-neighbor** queries, not just radius searches

```
Quadtree Architecture:

   Server Start → Build tree from DB snapshot (minutes)
   User Request → Traverse in-memory tree → Return

   Fast reads, but operational complexity for builds and updates.
```

### Head-to-Head

| Dimension | Geohash | Quadtree |
|-----------|---------|----------|
| **Storage** | Database (disk + cache) | In-memory per server |
| **Granularity** | Fixed per precision level | Adaptive to density |
| **Update latency** | Immediate (DB write) | Delayed (rebuild or incremental) |
| **Server startup** | Instant | Minutes (tree build) |
| **Horizontal scaling** | Add read replicas | Add LBS instances (each builds tree) |
| **Complexity** | Low | Medium-High |
| **Failure recovery** | DB handles it | Must rebuild tree from DB |

### Hybrid Approach

In practice, many systems use **geohash for storage/indexing** and **quadtree-like logic for query optimization**:

1. Store businesses with geohash in the database
2. On each LBS server, maintain a quadtree in memory for fast lookups
3. Use the quadtree for read queries, fall back to DB for cache misses
4. Periodically rebuild the quadtree from the DB

Another hybrid: use geohash with **adaptive precision**:
- For dense areas (NYC), use precision 6 (1.2 km cells)
- For sparse areas, use precision 4 (39 km cells)
- Store a mapping of region → optimal precision

---

## 5. Scaling & Optimization

### Caching Strategy

#### What to Cache

The search query `(geohash_prefix, category)` → list of `business_id` values is highly cacheable because:
- Geohash prefixes are finite and reusable across many users
- Business data changes infrequently
- The same neighborhoods get searched repeatedly

#### Redis Cache Design

```
Key:    geohash:{prefix}:{category}
Value:  [business_id_1, business_id_2, ...]
TTL:    1 hour

Example:
  geohash:9q8yy:restaurant → [101, 245, 389, 512, ...]
  geohash:9q8yy:all        → [101, 102, 245, 300, ...]
```

```
                     ┌───────────┐
   User Request ───▶ │    LBS    │
                     └─────┬─────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Redis   │  │    DB    │
              │  Cache   │  │ (fallback│
              │          │  │  + fill) │
              └──────────┘  └──────────┘

   Cache hit ratio target: >95% (geohash cells are very reusable)
```

#### Cache Invalidation

| Strategy | How It Works | When to Use |
|----------|-------------|-------------|
| **TTL-based** | Keys expire after N minutes | Default; simple, tolerates staleness |
| **Event-driven** | Business write → publish event → invalidate cache key | When freshness matters |
| **Hybrid** | Short TTL + event-driven invalidation | Production recommendation |

For business updates, the cache invalidation flow:

```
Business Update → Business Service → Write to DB
                                   → Publish "biz_updated" event
                                   → Cache subscriber invalidates
                                     geohash keys for old + new location
```

### Database Sharding

For 200M businesses and ~200 GB of data, a single primary with read replicas is likely sufficient. But if you need to shard:

#### Option 1: Shard by Geohash Prefix

```
Shard 0: geohash starts with [0-7]
Shard 1: geohash starts with [8-f]
Shard 2: geohash starts with [g-n]
Shard 3: geohash starts with [p-z]
```

**Pros**: Queries hit a single shard (locality). **Cons**: Hotspots if certain regions are queried more.

#### Option 2: Shard by Business ID

```
Shard = business_id % num_shards
```

**Pros**: Even distribution. **Cons**: Scatter-gather for geo queries (must query all shards).

#### Recommendation

Shard by **geohash prefix** for the geo_index table (query locality), and shard by **business_id** for the business details table (even distribution, point lookups only).

### Read Replicas

```
                              ┌──────────────┐
                         ┌───▶│  Replica 1   │◀─── LBS Instance A
                         │    └──────────────┘
   ┌─────────┐           │    ┌──────────────┐
   │ Primary │───repl────┼───▶│  Replica 2   │◀─── LBS Instance B
   │  (Write)│           │    └──────────────┘
   └─────────┘           │    ┌──────────────┐
        ▲                └───▶│  Replica 3   │◀─── LBS Instance C
        │                     └──────────────┘
   Business Service
   (writes here)
```

- **LBS reads exclusively from replicas** — no load on primary
- **Business Service writes to primary** — changes replicate asynchronously
- **Replication lag** (seconds) is acceptable for business data updates
- Scale by adding more replicas as read QPS grows

### Handling Edge Cases

#### Businesses on Geohash Boundaries

Always query the user's cell + 8 neighbors. After retrieving candidates, compute actual Haversine distance and filter.

```python
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
```

#### Radius Adjustment (Not Enough Results)

If querying 9 geohash cells returns too few businesses, expand the search:

```python
def search_nearby(user_lat, user_lng, radius, min_results=20):
    precision = radius_to_precision(radius)
    geohash = encode(user_lat, user_lng, precision)
    neighbors = get_neighbors(geohash)  # 8 neighbors + self = 9 cells

    results = query_db(neighbors)

    while len(results) < min_results and precision > 1:
        precision -= 1  # broaden search (larger cells)
        geohash = encode(user_lat, user_lng, precision)
        neighbors = get_neighbors(geohash)
        results = query_db(neighbors)

    # Post-filter by actual distance
    results = [b for b in results
               if haversine(user_lat, user_lng, b.lat, b.lng) <= radius]

    return sorted(results, key=lambda b: b.distance)[:min_results]
```

#### Empty Results in Sparse Areas

For extremely sparse areas, the progressive widening above handles it. Set a maximum expansion limit (e.g., precision 3 = ~156 km) to avoid scanning the entire planet.

#### Businesses with Multiple Locations

Each physical location gets its own entry in the geo_index. The business_id in the businesses table can represent the chain, with a separate `location_id`.

---

## 6. System Architecture Details

### Complete Architecture

```
    ┌─────────────────────────────────────────────────────────────────┐
    │                          Clients                                │
    │              (Mobile App / Web Browser)                         │
    └──────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Load Balancer     │
                    │   (L7 / ALB)        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │    API Gateway      │
                    │  • Rate limiting    │
                    │  • Authentication   │
                    │  • Request routing  │
                    └──────┬────────┬─────┘
                           │        │
             ┌─────────────┘        └──────────────┐
             ▼                                     ▼
    ┌─────────────────┐                  ┌─────────────────┐
    │ Location-Based  │                  │   Business      │
    │ Service (LBS)   │                  │   Service       │
    │                 │                  │                 │
    │ • Stateless     │                  │ • CRUD ops      │
    │ • Read-only     │                  │ • Write to DB   │
    │ • N instances   │                  │ • Pub events    │
    └───────┬─────────┘                  └────────┬────────┘
            │                                     │
            ▼                                     │
    ┌───────────────┐                             │
    │  Redis Cache  │                             │
    │  (Geo Index)  │                             │
    └───────┬───────┘                             │
            │ miss                                │
            ▼                                     ▼
    ┌──────────────────────────────────────────────────────┐
    │                   Database Cluster                    │
    │  ┌──────────┐    async     ┌──────────────────────┐  │
    │  │ Primary  │ ──repl────▶ │   Read Replicas (N)  │  │
    │  │          │              │                      │  │
    │  └──────────┘              └──────────────────────┘  │
    │                                                      │
    │  Tables: businesses, geo_index                       │
    │  Indexes: geohash (B-tree), business_id (primary)    │
    └──────────────────────────────────────────────────────┘
```

### Search Flow — Step by Step

```
    User searches "restaurants near me" (lat=37.77, lng=-122.42, radius=2km)

    ┌─────┐  ①  ┌─────────┐  ②  ┌─────┐  ③  ┌───────┐  ④  ┌────┐
    │User │────▶│API GW   │────▶│ LBS │────▶│ Redis │────▶│ DB │
    └─────┘     └─────────┘     └──┬──┘     └───┬───┘     └──┬─┘
                                   │            │             │
    ①  Request with lat/lng/radius │            │             │
                                   │            │             │
    ②  Route to LBS                │            │             │
                                   │            │             │
    ③  LBS logic:                  │            │             │
        a. Compute geohash:        │            │             │
           (37.77,-122.42) →       │            │             │
           "9q8yy" (precision 5)   │            │             │
                                   │            │             │
        b. Get 8 neighbors:        │            │             │
           [9q8yz, 9q8ym, 9q8yq,  │            │             │
            9q8yw, 9q8yv, 9q8yt,  │            │             │
            9q8yx, 9q8yk]         │            │             │
                                   │            │             │
        c. Query cache for each    │            │             │
           prefix (9 queries)  ────┘            │             │
                                                │             │
    ④  Cache miss → query DB ───────────────────┘             │
        SELECT * FROM geo_index                               │
        WHERE geohash IN (9 prefixes)  ───────────────────────┘
                                   │
    ⑤  Post-processing:           │
        a. Compute actual Haversine│
           distance for each       │
           candidate               │
        b. Filter: distance ≤      │
           radius (2 km)           │
        c. Apply category filter   │
           if specified            │
        d. Sort by distance        │
        e. Return top N results    │
                                   │
    ⑥  Return to user:            │
        [{business_id, name,       │
          distance, rating, ...}]  ▼
```

### Database Schema with Indexes

```sql
-- Primary business data
CREATE TABLE businesses (
    business_id    BIGINT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    address        VARCHAR(512),
    city           VARCHAR(100),
    state          VARCHAR(50),
    country        VARCHAR(3),
    latitude       DOUBLE NOT NULL,
    longitude      DOUBLE NOT NULL,
    category       VARCHAR(100),
    rating         DECIMAL(2,1) DEFAULT 0.0,
    review_count   INT DEFAULT 0,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_city_category (city, category)
);

-- Geospatial index table (denormalized for fast lookups)
CREATE TABLE geo_index (
    geohash        VARCHAR(12) NOT NULL,
    business_id    BIGINT NOT NULL,
    latitude       DOUBLE NOT NULL,
    longitude      DOUBLE NOT NULL,
    category       VARCHAR(100),

    PRIMARY KEY (geohash, business_id),
    INDEX idx_geohash_prefix (geohash),
    FOREIGN KEY (business_id) REFERENCES businesses(business_id)
);
```

Why a separate `geo_index` table instead of just indexing the `businesses` table?

1. **Separation of concerns** — LBS only reads geo_index; Business Service only reads/writes businesses
2. **Optimized for reads** — geo_index is lean (no unnecessary columns)
3. **Independent scaling** — can shard geo_index by geohash and businesses by ID
4. **Cache-friendly** — smaller rows = more fit in memory/cache pages

---

## 7. Trade-offs & Interview Tips

### Key Design Decisions and Their Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **Geohash vs Quadtree** | Simplicity & DB compatibility vs density adaptation |
| **Separate LBS from Business Service** | Operational overhead of two services vs independent scaling |
| **Cache with TTL vs event-driven invalidation** | Staleness tolerance vs implementation complexity |
| **Read replicas vs sharding** | Simpler ops vs higher write throughput |
| **In-memory quadtree vs DB-backed geohash** | Query speed vs memory cost and rebuild time |
| **Single geo_index table vs per-category tables** | Schema simplicity vs per-category query performance |

### Common Follow-up Questions

**Q: How do you handle a business that just opened?**
A: Business Service writes to the primary DB. The geo_index is updated. Cache is either invalidated via event or expires via TTL. Users see it within minutes — acceptable latency for this use case.

**Q: How do you rank results?**
A: Distance is the primary factor. Secondary factors include rating, review count, relevance to search category, whether the business is currently open, and paid promotion status. A lightweight ranking function combines these signals:

```python
def rank_score(business, user_lat, user_lng):
    dist = haversine(user_lat, user_lng, business.lat, business.lng)
    distance_score = 1.0 / (1.0 + dist / 1000)
    rating_score = business.rating / 5.0
    popularity_score = min(business.review_count / 1000, 1.0)
    return 0.5 * distance_score + 0.3 * rating_score + 0.2 * popularity_score
```

**Q: What if a user is moving (e.g., in a car)?**
A: The client re-issues the search request as the user moves. Since LBS is stateless and fast, this is no different from a regular query. The client can debounce requests (e.g., re-query only when the user moves >500m from the last query center).

**Q: How do you handle different countries/regions?**
A: Deploy LBS instances and read replicas in multiple regions. The geo_index can be sharded by region (e.g., NA, EU, APAC). The API Gateway routes requests to the nearest region based on the user's IP or coordinates.

**Q: Can you support polygon-based searches (not just radius)?**
A: Geohash can approximate polygon searches by finding all geohash cells that intersect the polygon boundary. S2 handles this more elegantly with its region covering feature. For quadtree, test each leaf node's bounding box against the polygon.

**Q: What about real-time location of mobile businesses (food trucks)?**
A: This requires more frequent updates. Consider a separate "live location" layer using Redis Geospatial commands (`GEOADD`, `GEORADIUS`) for entities that update location frequently. Keep the main geo_index for static businesses.

### What Interviewers Look For

| Signal | How to Demonstrate |
|--------|-------------------|
| **Structured thinking** | Start with requirements, estimate scale, then design top-down |
| **Trade-off awareness** | Don't just pick geohash — explain WHY and what you lose |
| **Depth on demand** | Know at least one indexing approach deeply (geohash or quadtree) |
| **Practical experience** | Mention real systems: "Yelp uses geohash, Google Maps uses S2" |
| **Scale awareness** | Back-of-envelope math: QPS, storage, cache hit ratios |
| **Edge case handling** | Boundary issues, empty results, radius expansion |
| **Evolution** | Start simple (geohash + DB), evolve to cache + replicas as needed |

### Interview Presentation Framework

```
1. Clarify requirements                    [2-3 min]
   - Functional: search, CRUD
   - Non-functional: latency, availability
   - Scale: DAU, QPS, data size

2. High-level design                       [5-7 min]
   - API design
   - Service decomposition (LBS + Business)
   - Data flow diagram

3. Deep dive: Geospatial indexing          [10-12 min]
   - Explain naive approach → why it fails
   - Introduce geohash (or quadtree)
   - Show how queries work
   - Discuss boundary handling

4. Scaling and optimization                [5-7 min]
   - Caching layer
   - Read replicas
   - Sharding strategy

5. Wrap-up                                 [2-3 min]
   - Summarize key decisions
   - Mention what you'd improve with more time
     (monitoring, A/B testing ranking, ML-based ranking)
```

### Quick Reference: Redis Geo Commands

Redis has built-in geospatial support that can serve as both a cache and a lightweight geo-index:

```bash
# Add businesses with coordinates
GEOADD businesses -122.4194 37.7749 "biz_101"
GEOADD businesses -122.4083 37.7839 "biz_102"

# Find businesses within 5km radius
GEOSEARCH businesses FROMLONLAT -122.42 37.77 BYRADIUS 5 km ASC COUNT 20

# Get distance between two businesses
GEODIST businesses "biz_101" "biz_102" km
```

This can serve as a fast in-memory geo-index, avoiding the need to build a custom quadtree. Trade-off: all data must fit in Redis memory, and you lose the adaptive density of a quadtree.

---

## Summary Cheat Sheet

```
┌──────────────────────────────────────────────────────────┐
│                   PROXIMITY SERVICE                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  REQUIREMENTS                                            │
│  • Search nearby businesses by lat/lng + radius          │
│  • Business CRUD (low write QPS)                         │
│  • 100M DAU, 200M businesses, ~5.8K QPS → ~29K peak     │
│                                                          │
│  ARCHITECTURE                                            │
│  • LBS (stateless, read-only) + Business Service         │
│  • Primary-secondary DB with read replicas               │
│  • Redis cache for geohash-based lookups                 │
│                                                          │
│  GEOSPATIAL INDEX (pick one, know both)                  │
│  • Geohash: simple, DB-friendly, query 9 cells           │
│  • Quadtree: adaptive density, in-memory, ~1.7GB         │
│                                                          │
│  KEY TRADE-OFFS                                          │
│  • Geohash = simplicity vs Quadtree = density-aware      │
│  • TTL cache = simple vs Event-driven = fresh             │
│  • Replicas = easy vs Sharding = more capacity            │
│                                                          │
│  EDGE CASES                                              │
│  • Boundary: query cell + 8 neighbors                    │
│  • Sparse results: reduce geohash precision, widen       │
│  • Moving user: client re-queries on significant move    │
│  • Ranking: distance + rating + popularity               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
