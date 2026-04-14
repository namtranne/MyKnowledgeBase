# Chapter 3: Design Google Maps

## 1. Problem Statement & Requirements

### Functional Requirements

| Requirement | Description |
|---|---|
| **Map Rendering** | Display an interactive map with pan, zoom, and tilt support |
| **Navigation / Routing** | Calculate optimal route between origin and destination with turn-by-turn directions |
| **ETA Estimation** | Provide accurate estimated time of arrival using live and historical traffic |
| **Location Updates** | Continuously record user location during navigation sessions |
| **Geocoding** | Convert street addresses to lat/lng coordinates and vice versa |
| **Points of Interest** | Search and display nearby places (gas stations, restaurants, etc.) |

### Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Accuracy** | Routes must reflect real road constraints (one-ways, turn restrictions, road closures) |
| **Smooth Rendering** | Map tiles must load with no visible jank; target 60 fps pan/zoom on mobile |
| **Low Latency** | Route computation < 500 ms for most queries |
| **Low Bandwidth** | Minimize data transfer — critical for mobile users on metered connections |
| **High Availability** | 99.99% uptime; navigation must not fail mid-trip |
| **Scalability** | Support 1 billion DAU with 5 million concurrent navigation sessions |

### Scale Estimates

```
DAU:                   1,000,000,000 (1B)
Navigation sessions:   5,000,000 / day
Location updates:      ~15-30 sec intervals during navigation
  → per session avg:   ~100 updates (30-min avg trip)
  → total updates/day: 500,000,000 (500M)
  → peak QPS:          500M / 86400 ≈ 5,800 → peak ~15,000 QPS

Map tile requests:     Each screen ≈ 6-12 tiles
  → with 1B DAU:       Billions of tile fetches/day (served from CDN)

Map data size:         Entire world road network ≈ petabytes (raw)
  → Processed graph:   ~tens of TB
  → Pre-rendered tiles: hundreds of TB across all zoom levels
```

---

## 2. High-Level Design

The system decomposes into three major services, each scaling independently:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APP                               │
│  (Mobile / Web — renders map, sends location, shows routes)     │
└──────────┬──────────────────┬───────────────────┬───────────────┘
           │                  │                   │
           ▼                  ▼                   ▼
   ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
   │  Map Tile     │  │  Location    │  │  Navigation     │
   │  Service      │  │  Service     │  │  Service        │
   │               │  │              │  │                 │
   │  (Rendering)  │  │  (Tracking)  │  │  (Routing/ETA)  │
   └───────────────┘  └──────────────┘  └─────────────────┘
```

**Why this separation?**

- **Map Tile Service** is read-heavy, static, and CDN-friendly.
- **Location Service** is write-heavy, streaming, and needs a real-time pipeline.
- **Navigation Service** is compute-heavy, requires graph algorithms and live traffic data.

Each service has fundamentally different access patterns, scaling strategies, and data stores.

---

## 3. Map Rendering — Tiles Deep Dive

### 3.1 Map Tiling Concept

The entire world is projected onto a flat square (Web Mercator projection) and recursively subdivided into square tiles.

```
Zoom 0: 1 tile covers the whole world
┌─────────────────┐
│                  │
│   Entire World   │
│                  │
└─────────────────┘

Zoom 1: 4 tiles (2×2 grid)
┌────────┬────────┐
│ (0,0)  │ (1,0)  │
├────────┼────────┤
│ (0,1)  │ (1,1)  │
└────────┴────────┘

Zoom 2: 16 tiles (4×4 grid)
┌────┬────┬────┬────┐
│0,0 │1,0 │2,0 │3,0 │
├────┼────┼────┼────┤
│0,1 │1,1 │2,1 │3,1 │
├────┼────┼────┼────┤
│0,2 │1,2 │2,2 │3,2 │
├────┼────┼────┼────┤
│0,3 │1,3 │2,3 │3,3 │
└────┴────┴────┴────┘
```

### 3.2 Zoom Levels

| Zoom Level | Tiles | Grid Size | Approximate View |
|---|---|---|---|
| 0 | 1 | 1×1 | Whole world |
| 1 | 4 | 2×2 | Hemisphere |
| 3 | 64 | 8×8 | Large country |
| 5 | 1,024 | 32×32 | State/province |
| 10 | ~1M | 1024×1024 | City |
| 15 | ~1B | 32K×32K | Streets |
| 18 | ~69B | 262K×262K | Buildings |
| 21 | ~4.4T | 2M×2M | Individual features |

**Formula:** At zoom level `z`, the grid is `2^z × 2^z`, yielding `4^z` total tiles.

### 3.3 Tile Coordinate System

Given a geographic coordinate (latitude, longitude) and a zoom level `z`:

```
n = 2^z
x_tile = floor((longitude + 180) / 360 * n)
y_tile = floor((1 - ln(tan(lat_rad) + sec(lat_rad)) / π) / 2 * n)
```

Tiles are addressed by the triple `(z, x, y)`.

### 3.4 Tile URL Structure

Tiles are served as static files via a predictable URL pattern:

```
GET /tiles/{zoom}/{x}/{y}.png          (raster)
GET /tiles/{zoom}/{x}/{y}.pbf          (vector, protobuf)

Examples:
  /tiles/12/1205/1540.png              — downtown San Francisco at zoom 12
  /tiles/15/9650/12320.pbf             — vector tile for street-level detail
```

This deterministic URL makes tiles trivially cacheable at every layer (browser, CDN, origin).

### 3.5 Raster Tiles vs Vector Tiles

| Aspect | Raster Tiles (.png) | Vector Tiles (.pbf) |
|---|---|---|
| Format | Pre-rendered images | Geometry + metadata (protobuf) |
| Rendering | Server-side | Client-side (GPU-accelerated) |
| Customization | None (baked style) | Full (colors, labels, layers toggled at runtime) |
| File size | ~20-50 KB per tile | ~10-30 KB per tile |
| Rotation/tilt | Ugly (pixelated text) | Clean (text re-rendered) |
| Zoom transitions | Discrete jumps | Smooth continuous zoom |
| Offline support | Store many images | Compact, fewer bytes for same area |
| Adoption | Legacy (Google Maps pre-2013) | Modern standard (Mapbox, Apple Maps, Google Maps) |

**Modern systems use vector tiles.** The client (mobile GPU or WebGL) renders geometry into pixels, allowing dynamic styling, smooth rotation, and smaller payloads.

### 3.6 Tile Serving Architecture

```
Client Request: GET /tiles/14/2890/6520.pbf
         │
         ▼
┌─────────────────┐    cache     ┌──────────────────────────┐
│  Browser Cache   │◄───HIT────►│  (rendered immediately)   │
│  (in-memory/     │             └──────────────────────────┘
│   IndexedDB)     │
└────────┬─────────┘
         │ MISS
         ▼
┌─────────────────┐    cache     ┌──────────────────────────┐
│  CDN Edge PoP    │◄───HIT────►│  (served from edge, ~5ms) │
│  (CloudFront /   │             └──────────────────────────┘
│   Akamai)        │
└────────┬─────────┘
         │ MISS
         ▼
┌─────────────────┐
│  Origin / Object │  (S3, GCS — pre-generated tiles)
│  Storage         │
└──────────────────┘
```

**CDN cache hit ratio for map tiles exceeds 99%** because:
- Tiles are immutable for a given version.
- Popular areas (cities) are requested by millions of users.
- Tiles change only when map data is updated (weekly/monthly batches).

### 3.7 Tile Compression & Optimization

| Technique | Benefit |
|---|---|
| gzip / brotli on vector tiles | 60-70% size reduction |
| Simplify geometry at low zoom | Fewer vertices → smaller protobuf |
| Ocean/empty tiles | Serve a single shared "empty" tile, deduplicate |
| Delta encoding | Encode coordinates as deltas from previous point |
| Overzooming | Reuse zoom-14 tile data for zoom 15-16 instead of storing separate tiles |

### 3.8 Mobile Optimization

- **Progressive loading**: Load low-zoom tiles first, then replace with higher-resolution tiles as they arrive.
- **Viewport prefetching**: Predict the direction of pan and preload adjacent tiles.
- **Aggressive caching**: Store recently viewed tiles in device storage (IndexedDB on web, SQLite on mobile).
- **Resolution adaptation**: Serve lower-resolution tiles on slow connections (adaptive tile quality).
- **Offline tile packs**: Allow users to download entire regions for offline use (stored as a single file, e.g., `.mbtiles`).

---

## 4. Location Service

### 4.1 Purpose

The Location Service ingests GPS coordinates from millions of users in real time. This data powers:

1. **Live traffic estimation** — aggregate speed data from active users on each road segment.
2. **ETA improvement** — feed real-time conditions into the routing engine.
3. **Historical analytics** — build traffic pattern models by time-of-day, day-of-week.
4. **Navigation UX** — show the user's blue dot on the map, re-route if they deviate.

### 4.2 Location Update Protocol

During active navigation, the client sends periodic location updates:

```json
{
  "user_id": "u_abc123",
  "session_id": "nav_789",
  "timestamp": 1700000000,
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy_m": 5.2,
  "speed_mps": 13.4,
  "heading_deg": 275.0,
  "road_segment_id": "seg_40021"  // optional, from map-matching
}
```

**Update frequency trade-offs:**

| Interval | Pros | Cons |
|---|---|---|
| Every 5 sec | Very accurate traffic data | Battery drain, high bandwidth |
| Every 15 sec | Good balance | Slight traffic data lag |
| Every 30 sec | Battery-friendly | Coarser traffic resolution |
| Adaptive | Best of both worlds | More complex client logic |

**Adaptive strategy (used in practice):** Send updates more frequently on highways (speed changes matter) and less frequently on slow local roads or when stationary.

### 4.3 Client-Side Buffering

The client does NOT send every GPS fix immediately. Instead:

```
┌────────────────────────────────────────┐
│              CLIENT APP                │
│                                        │
│  GPS Sensor → Buffer (ring buffer)     │
│                  │                     │
│          every 15-30 sec OR            │
│          buffer full (10 points)       │
│                  │                     │
│            Batch HTTP POST             │
│            to Location Service         │
└────────────────────────────────────────┘
```

**Benefits of buffering:**
- Fewer network requests → less battery drain.
- Batch upload → amortize TLS handshake and HTTP overhead.
- Survives brief connectivity loss (buffer retains points).

### 4.4 Data Pipeline

```
Clients (GPS data)
    │
    ▼
┌──────────────┐
│  API Gateway  │  (rate limit, auth, normalize)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Kafka      │  (topic: location-updates, partitioned by user_id)
│  (Message     │
│   Queue)      │
└──────┬───────┘
       │
       ├──────────────────────┬─────────────────────────┐
       ▼                      ▼                         ▼
┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐
│  Flink /      │   │  Traffic         │   │  Raw Storage       │
│  Spark        │   │  Aggregation     │   │  (S3 / HDFS)       │
│  Streaming    │   │  Service         │   │  for batch          │
│               │   │                  │   │  analytics          │
│  (map-match,  │   │  (avg speed per  │   └────────────────────┘
│   snap to     │   │   road segment   │
│   road)       │   │   per 1-min      │
│               │   │   window)        │
└──────┬───────┘   └──────┬───────────┘
       │                   │
       ▼                   ▼
┌──────────────┐   ┌──────────────────┐
│  Location    │   │  Traffic DB       │
│  History DB  │   │  (Redis / in-mem  │
│  (Cassandra  │   │   for live;       │
│   / TimescaleDB)│   │   HDFS for       │
│              │   │   historical)     │
└──────────────┘   └──────────────────┘
```

### 4.5 Map Matching

Raw GPS points are noisy. They must be **snapped** to the correct road segment:

```
Raw GPS:          ·  ·     ·        ·   ·
                     \   /    \        |
Actual road:   ═══════════════════════════
```

Map matching uses a Hidden Markov Model (HMM):
- **States**: candidate road segments near the GPS point.
- **Emission probability**: how close the GPS point is to the road.
- **Transition probability**: how likely the vehicle moved between two candidate segments (considers connectivity, turn restrictions, speed).
- **Viterbi algorithm** finds the most likely sequence of road segments.

### 4.6 Storage Considerations

| Dimension | Choice | Rationale |
|---|---|---|
| Write pattern | Append-only | Location updates are immutable time-series data |
| Write volume | ~15K QPS peak | Needs high-throughput ingestion |
| Read pattern | Rare per-user reads, heavy aggregate reads | Traffic aggregation reads recent windows |
| Database | Cassandra or TimescaleDB | Wide-column or time-series optimized; partitioned by user + time |
| Retention | Raw: 7 days; aggregated: years | Raw data is huge; aggregate and discard |
| Live traffic | Redis / in-memory store | Sub-millisecond reads for current segment speeds |

---

## 5. Navigation / Routing Service — Deep Dive

### 5.1 Road Network as a Graph

The road network is modeled as a **weighted directed graph**:

```
           3 min
    A ──────────────► B
    │                 │
    │ 5 min           │ 2 min
    │                 │
    ▼                 ▼
    C ──────────────► D ──────► E
           4 min          1 min

Nodes = intersections (or notable points along a road)
Edges = road segments
Weights = travel time (dynamic, based on traffic)
```

**Edge metadata includes:**
- Distance (meters)
- Speed limit
- Road class (highway, arterial, residential)
- Number of lanes
- Turn restrictions (no left turn, U-turn prohibited)
- Tolls, HOV restrictions
- Current live traffic speed (updated in real-time)

### 5.2 Scale of the Graph

```
Global road network:
  Nodes (intersections):    ~500 million
  Edges (road segments):    ~1 billion+
  Raw data size:            Tens of terabytes
```

This is far too large to run a single Dijkstra query on.

### 5.3 Routing Algorithms

#### 5.3.1 Dijkstra's Algorithm

The baseline shortest-path algorithm.

```
function dijkstra(graph, source, target):
    dist[source] = 0
    for all other v: dist[v] = ∞
    priority_queue = {(0, source)}

    while priority_queue is not empty:
        (d, u) = extract_min(priority_queue)
        if u == target:
            return d
        if d > dist[u]:
            continue
        for each neighbor v of u:
            new_dist = d + weight(u, v)
            if new_dist < dist[v]:
                dist[v] = new_dist
                insert(priority_queue, (new_dist, v))
    return ∞  // unreachable
```

**Time complexity**: O((V + E) log V) with a binary heap.

**Problem**: On a graph with 500M+ nodes, even an optimized Dijkstra explores millions of nodes for a cross-country route. Too slow for real-time.

#### 5.3.2 A* Search

Improves Dijkstra by adding a heuristic that guides the search toward the target.

```
function a_star(graph, source, target):
    g[source] = 0
    f[source] = h(source, target)   // h = heuristic (haversine distance / max_speed)
    priority_queue = {(f[source], source)}

    while priority_queue is not empty:
        (f_val, u) = extract_min(priority_queue)
        if u == target:
            return g[u]
        for each neighbor v of u:
            tentative_g = g[u] + weight(u, v)
            if tentative_g < g[v]:
                g[v] = tentative_g
                f[v] = tentative_g + h(v, target)
                insert(priority_queue, (f[v], v))
    return ∞
```

**Heuristic**: straight-line distance / maximum possible speed → admissible lower bound.

A* typically explores 2-5x fewer nodes than Dijkstra, but still not fast enough for a global graph.

#### 5.3.3 Contraction Hierarchies (CH)

The practical algorithm used by real mapping services. Two phases:

**Phase 1 — Preprocessing (offline, hours to days):**

1. Rank all nodes by "importance" (highways > local roads).
2. Iteratively "contract" the least important node:
   - Remove it from the graph.
   - If the shortest path between any two neighbors went through it, add a **shortcut edge**.
3. Result: an augmented graph with shortcut edges that let queries skip over unimportant nodes.

```
Original:     A ——2——► B ——3——► C

Contract B:   A ——————5———————► C   (shortcut added)
              (B is removed from the search graph)
```

**Phase 2 — Query (online, milliseconds):**

Run a **bidirectional Dijkstra** on the augmented graph:
- Forward search from source, only going "upward" in the hierarchy.
- Backward search from target, only going "upward."
- They meet at some high-importance node (e.g., a highway junction).

```
Source ──► local roads ──► arterial ──► HIGHWAY ◄── arterial ◄── local ◄── Target
         (forward, upward search)          (backward, upward search)
                                │
                          meeting point
```

| Metric | Dijkstra | A* | Contraction Hierarchies |
|---|---|---|---|
| Preprocessing | None | None | Hours (one-time) |
| Query time (cross-country) | Minutes | Seconds | **2-5 milliseconds** |
| Nodes explored per query | Millions | Hundreds of thousands | **500-1000** |
| Supports live traffic? | Yes | Yes | Needs customization (see below) |

#### 5.3.4 Handling Live Traffic with CH

Pure CH uses static edge weights precomputed offline. To incorporate live traffic:

- **Customizable CH (CCH)**: Separate the graph topology (precomputed) from the edge weights (updated in real-time). Re-run the metric customization step when traffic changes (~1-5 seconds to update).
- **Hybrid approach**: Use CH for the highway-level skeleton, then Dijkstra/A* for the first/last mile on local roads where traffic matters most.

#### 5.3.5 Hierarchical / Tiled Routing

Divide the road network into geographic tiles (e.g., 50 km × 50 km). Within each tile, precompute all boundary-to-boundary shortest paths.

```
┌──────────┬──────────┬──────────┐
│  Tile A  │  Tile B  │  Tile C  │
│          │          │          │
│  S ●     │          │     ● T  │
│    ↓     │          │     ↑    │
│  [exit]──┼──[shortcut]──┼──[entry] │
│          │          │          │
└──────────┴──────────┴──────────┘

Route = local(S → exit_A) + tile_boundary(exit_A → entry_C) + local(entry_C → T)
```

**Benefits**: Each tile's graph fits in memory. Routing across tiles uses precomputed boundary-to-boundary paths, making long-distance queries fast.

### 5.4 Geocoding Service

Converts human-readable addresses to coordinates and vice versa.

```
Forward:  "1600 Amphitheatre Parkway, Mountain View, CA"  →  (37.4220, -122.0841)
Reverse:  (37.4220, -122.0841)  →  "1600 Amphitheatre Parkway, Mountain View, CA"
```

Implementation:
- **Address parsing**: Tokenize into house number, street, city, state, postal code.
- **Index**: Full-text search index (Elasticsearch) over address database.
- **Interpolation**: For addresses not in the database, interpolate position along the street segment based on address ranges (e.g., 1500-1700 block).

### 5.5 ETA Estimation

ETA is a critical feature — users judge routing quality by ETA accuracy.

```
              ┌─────────────────────────────────────────┐
              │           ETA Estimation Engine          │
              │                                         │
              │  Inputs:                                │
              │   ├── Route (sequence of segments)      │
              │   ├── Segment length (meters)           │
              │   ├── Current live traffic speed         │
              │   ├── Historical speed (day/hour/segment)│
              │   ├── Road attributes (class, lanes)    │
              │   └── Special events, weather, incidents│
              │                                         │
              │  Model:                                 │
              │   ETA = Σ (segment_length / predicted_speed) │
              │   + turn_delay + traffic_signal_delay   │
              │                                         │
              │  ML Enhancement:                        │
              │   - Gradient-boosted trees or deep NN   │
              │   - Features: time, day, weather,       │
              │     historical speed variance,          │
              │     event proximity                     │
              │   - Trained on actual trip durations     │
              └─────────────────────────────────────────┘
```

**Sources of ETA data:**

| Source | Latency | Accuracy | Coverage |
|---|---|---|---|
| Live user GPS (traffic) | Real-time | High on busy roads | Sparse on rural roads |
| Historical patterns | N/A (precomputed) | Good baseline | Complete |
| Road attributes | Static | Moderate (speed limits ≠ actual speed) | Complete |
| External feeds (incidents, construction) | Minutes | Event-specific | Varies |

### 5.6 Alternative Routes

Users expect 2-3 route options. Approaches:

1. **Penalty method**: Find the shortest path, then penalize its edges and search again.
2. **Plateau method**: Find paths that diverge from the shortest path for a meaningful distance (avoid trivially similar alternatives).
3. **k-shortest paths (Yen's algorithm)**: Find the k shortest loopless paths. Expensive but theoretically clean.

In practice, the system returns routes that are:
- Meaningfully different (use different major roads).
- Within a reasonable factor of the optimal ETA (e.g., no more than 1.5x the best ETA).
- Labeled with trade-offs ("5 min slower but avoids tolls").

---

## 6. Road Data Processing

### 6.1 Data Sources

| Source | Type | Update Frequency |
|---|---|---|
| OpenStreetMap (OSM) | Community-maintained, open data | Continuous community edits |
| Government agencies | Official road registry, speed limits | Quarterly |
| Satellite / aerial imagery | Road detection via computer vision | Periodic |
| Street-level imagery (Street View) | Sign detection, lane markings | Periodic |
| Probe data (user GPS) | Detect new roads, closures | Real-time |

### 6.2 Graph Construction Pipeline

```
Raw Map Data (OSM XML / PBF, shapefiles)
       │
       ▼
┌─────────────────┐
│  Parser /        │  Extract roads, intersections, attributes
│  Importer        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Graph Builder   │  Create nodes (intersections) and edges (segments)
│                  │  Assign edge weights (distance, speed limit, road class)
│                  │  Encode turn restrictions, one-way streets
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  CH / Index      │  Build contraction hierarchy
│  Preprocessor    │  Build spatial index (R-tree) for nearest-segment queries
│                  │  Build routing tiles
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Tile Generator  │  Cut the graph into geographic tiles for tiled routing
│                  │  Precompute boundary-to-boundary shortest paths
└──────┬──────────┘
       │
       ▼
  Deploy to Routing Servers
```

### 6.3 Periodic Reprocessing

- Full rebuild: weekly or biweekly (new roads, permanent closures).
- Incremental updates: daily (temporary closures, construction zones).
- Real-time overrides: live traffic / incident layer applied on top of the static graph at query time.

### 6.4 Turn-by-Turn Directions

After computing a route (a sequence of edges), generate human-readable instructions:

```
Route: [edge_101, edge_102, edge_103, edge_205, edge_206]

Step 1: Head north on Market St          (edge_101)
Step 2: Turn right onto 3rd St           (edge_101 → edge_102, angle ~90° right)
Step 3: Continue straight for 0.5 mi     (edge_102, edge_103)
Step 4: Merge onto US-101 S              (edge_103 → edge_205, ramp merge)
Step 5: Take exit 429B toward Airport    (edge_206)
```

Turn type is determined by the angle between consecutive edges:
- 0° ± 15°: straight
- 15°-60°: slight turn
- 60°-120°: turn
- 120°-170°: sharp turn
- 170°-180°: U-turn

---

## 7. Scaling & Architecture

### 7.1 CDN Strategy for Map Tiles

Map tiles are the highest volume request type. Serving them efficiently is paramount.

```
Tile Traffic Flow:

  1B users × ~20 tile loads/session × 2 sessions/day = 40B tile requests/day
  Peak: ~1M tile requests/second

  BUT: CDN cache hit rate > 99%
  Origin load: < 10K requests/second (easily handled by object storage)
```

**CDN configuration:**
- **TTL**: Tiles are versioned; set long TTL (30 days) with cache-busting version in URL.
- **PoPs**: 200+ edge locations worldwide → less than 20 ms latency for most users.
- **Purge**: When map data is updated, invalidate only affected tiles (not all 4 trillion).

### 7.2 Adaptive Tile Loading

The client loads only the tiles visible in the current viewport, plus a small buffer:

```
                ┌──────────────────────┐
                │    visible viewport  │
   ┌────────────┤                      ├────────────┐
   │  prefetch  │   Load these tiles   │  prefetch  │
   │  buffer    │   immediately        │  buffer    │
   └────────────┤                      ├────────────┘
                │                      │
                └──────────────────────┘
                         │
                   prefetch buffer (below)
```

When the user pans, cancel in-flight requests for tiles that left the viewport and prioritize new ones.

### 7.3 Caching Hierarchy

```
Layer 0: Client Memory Cache       (instant, ~50 tiles in LRU)
Layer 1: Client Disk Cache          (fast, ~5000 tiles in IndexedDB/SQLite)
Layer 2: CDN Edge PoP              (~5-20 ms, TB-scale)
Layer 3: CDN Regional Cache        (~20-50 ms)
Layer 4: Origin (S3/GCS)           (~50-100 ms, petabyte-scale)
```

**Cache hit rates by layer (typical):**
- Layer 0: 30-40% (recently viewed tiles)
- Layer 1: 50-60% (previously visited areas)
- Layer 2: 95-99% (popular tiles)
- Layer 3: 99%+
- Layer 4: 100% (authoritative source)

### 7.4 Location Data Pipeline Scaling

```
Kafka cluster:
  - 100+ partitions on location-updates topic
  - Partitioned by user_id for ordering guarantees
  - Retention: 24 hours (short-lived, processed in real-time)
  - Throughput: 500K messages/sec sustained

Stream Processing (Flink):
  - Map-matching (snap to road)
  - Traffic speed aggregation (1-min tumbling windows per segment)
  - Anomaly detection (accidents: sudden speed drops)

Downstream stores:
  - Redis: live traffic (segment_id → current_speed, TTL 5 min)
  - Cassandra: location history (user_id + timestamp → location)
  - HDFS/S3: raw events for batch ML training
```

### 7.5 Read vs Write Patterns

| Component | Read:Write Ratio | Strategy |
|---|---|---|
| Map Tiles | 99.99:0.01 | CDN, aggressive caching, object storage |
| Location Data | 0.01:99.99 | Kafka + streaming, append-only stores |
| Routing | Read-heavy (queries) | In-memory graph, precomputed CH |
| Traffic | Balanced | Write: Kafka → Redis; Read: routing engine queries Redis |
| Geocoding | Read-heavy | Elasticsearch with replicas, caching common queries |

---

## 8. Detailed Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APP                                     │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐                 │
│  │ Map Renderer │  │ Navigation UI    │  │ Location Mgr   │                 │
│  │ (vector tile │  │ (turn-by-turn,   │  │ (GPS sensor,   │                 │
│  │  rendering)  │  │  route display)  │  │  buffering)    │                 │
│  └──────┬───────┘  └───────┬──────────┘  └───────┬────────┘                 │
└─────────┼──────────────────┼─────────────────────┼──────────────────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER (L7)                            │
└──────────┬─────────────────┬─────────────────────┬──────────────────┘
           │                 │                     │
           ▼                 ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                    │
│              (auth, rate limiting, request routing)                   │
└──────────┬─────────────────┬─────────────────────┬──────────────────┘
           │                 │                     │
     ┌─────┘           ┌────┘                ┌────┘
     ▼                 ▼                     ▼
┌──────────┐    ┌──────────────┐     ┌──────────────┐
│ Map Tile │    │ Navigation   │     │  Location    │
│ Service  │    │ Service      │     │  Service     │
└────┬─────┘    └──────┬───────┘     └──────┬───────┘
     │                 │                    │
     ▼                 │                    ▼
┌──────────┐           │             ┌──────────────┐
│  CDN     │           │             │    Kafka     │
│  (Edge   │           │             │  (location   │
│  Caches) │           │             │   updates)   │
└────┬─────┘           │             └──────┬───────┘
     │                 │                    │
     ▼                 │               ┌────┴────────┐
┌──────────┐           │               ▼             ▼
│ Object   │           │        ┌───────────┐  ┌──────────┐
│ Storage  │           │        │  Flink     │  │  Raw     │
│ (S3/GCS) │           │        │  (stream   │  │  Archive │
│ [tiles]  │           │        │  process)  │  │  (S3)    │
└──────────┘           │        └─────┬─────┘  └──────────┘
                       │              │
                       │              ▼
                       │        ┌───────────┐
                       │        │  Redis     │  (live traffic: segment → speed)
                       │        └─────┬─────┘
                       │              │
                       ▼              │
                ┌──────────────┐      │
                │  Routing     │◄─────┘  (reads live traffic)
                │  Engine      │
                │  (in-memory  │
                │   CH graph)  │
                └──────┬───────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
       ┌────────────┐   ┌────────────┐
       │  Geocoding  │   │  ETA       │
       │  Service    │   │  Service   │
       │  (ES index) │   │  (ML model)│
       └─────────────┘   └────────────┘
```

### Request Flows

**Flow 1 — Map Tile Request:**
```
Client → CDN (cache hit? → return) → Origin (S3) → return tile → CDN caches → Client
```

**Flow 2 — Route Request:**
```
Client → API GW → Navigation Service
  → Geocoding (resolve addresses to lat/lng)
  → Routing Engine (CH query with live traffic from Redis)
  → ETA Service (predict per-segment travel time)
  → Return: route geometry + turn-by-turn + ETA + alternatives
```

**Flow 3 — Location Update:**
```
Client → API GW → Location Service → Kafka → Flink
  → map-match to road segment
  → update Redis (live traffic)
  → write to Cassandra (history)
  → write to S3 (raw archive)
```

---

## 9. Trade-offs & Interview Tips

### 9.1 Key Trade-offs

| Trade-off | Option A | Option B | Recommendation |
|---|---|---|---|
| Raster vs Vector tiles | Simple server, heavy bandwidth | Complex client, less bandwidth | Vector (modern standard) |
| Real-time vs Pre-computed routes | Accurate but slow | Fast but stale | Hybrid: precomputed skeleton + real-time local adjustments |
| ETA accuracy vs latency | Complex ML model, higher latency | Simple heuristic, instant | Tiered: fast heuristic for initial display, refined ETA async |
| Location update frequency | More data, battery drain | Less data, worse traffic | Adaptive: frequent on highway, sparse on local roads |
| Offline maps | Large download, always available | Online-only, always fresh | Offer both; let user download regions |
| Privacy | Full location tracking | Differential privacy / anonymization | Aggregate and anonymize; delete raw data after N days |

### 9.2 Offline Maps Support

For areas with poor connectivity:

```
Offline Pack = {
  Vector tiles (zoom 0-15 for the region),
  Routing graph (compressed, for the region),
  Geocoding index (addresses in the region),
  POI database (places in the region)
}

Typical sizes:
  City (San Francisco):   ~150 MB
  State (California):     ~500 MB
  Country (USA):          ~3 GB
```

The client runs a local routing engine (same CH algorithm) on the downloaded graph.

### 9.3 Privacy Considerations

- **Anonymization**: Strip user IDs before feeding location data into traffic aggregation.
- **Differential privacy**: Add noise to aggregated traffic data to prevent re-identification.
- **Data retention**: Delete raw GPS traces after 30 days; keep only aggregated traffic statistics.
- **User control**: Allow users to pause location history, delete past data.
- **Encryption**: Location data encrypted in transit (TLS) and at rest (AES-256).

### 9.4 Interview Tips

**Opening (2-3 minutes):**
- Clarify scope: "Are we designing the full Google Maps or focusing on navigation?"
- State assumptions: DAU, geography, mobile vs web.
- Identify the three core services early — this shows structured thinking.

**Mid-interview signals of strength:**
- Explain WHY Dijkstra alone is insufficient and HOW contraction hierarchies solve it.
- Discuss the tile coordinate system and how CDN caching works for tiles.
- Draw the data pipeline for location ingestion (Kafka → Flink → Redis).
- Mention map matching — it shows depth.

**Common follow-up questions and strong answers:**

| Question | Strong Answer |
|---|---|
| "How do you handle traffic?" | "User GPS → Kafka → Flink aggregates speed per segment → Redis stores live speeds → routing engine reads Redis at query time." |
| "Why not compute routes in real-time with live traffic?" | "The graph is too large. We use Contraction Hierarchies with customizable weights — topology is precomputed, but edge weights are swapped in real-time." |
| "How do you serve tiles to 1B users?" | "Pre-render tiles, store in object storage, serve through CDN. Cache hit rate exceeds 99%. The origin barely gets traffic." |
| "What about new roads?" | "Periodic pipeline: import new map data → rebuild graph → recompute CH → deploy. Critical updates (closures) applied as real-time overlays." |
| "How does ETA work?" | "Sum of per-segment travel time predictions. Each segment prediction uses live speed, historical patterns, and an ML model trained on actual trip durations." |

**Things to avoid:**
- Don't jump into database schema — start with high-level services.
- Don't say "just use Dijkstra" — the graph is too large; explain the need for preprocessing.
- Don't forget the CDN — tile serving without a CDN is a major red flag.
- Don't ignore mobile constraints — battery, bandwidth, offline.

### 9.5 Comparison with Related Systems

| Aspect | Google Maps | Uber/Lyft | Waze |
|---|---|---|---|
| Primary user | Drivers, pedestrians | Riders + drivers | Drivers |
| Routing priority | Fastest/shortest for user | Optimal dispatch (match driver to rider) | Community-reported fastest |
| Map data source | Google's own + Street View | Third-party maps + own GPS | Community-edited + GPS |
| Location updates | During navigation only | Always (driver app) | Always (active users) |
| Traffic source | User GPS + historical | Driver GPS (massive fleet) | User reports + GPS |
| Monetization | Ads, licensing API | Ride fees | Ads (free app) |

---

## 10. Quick Reference Card

```
┌────────────────────────────────────────────────────────────────┐
│                  GOOGLE MAPS — CHEAT SHEET                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  3 CORE SERVICES:                                              │
│    1. Map Tiles  → CDN + Object Storage (read-heavy)           │
│    2. Location   → Kafka + Flink + Redis (write-heavy)         │
│    3. Navigation → CH Graph + ETA ML (compute-heavy)           │
│                                                                │
│  KEY NUMBERS:                                                  │
│    Zoom levels: 0-21, tiles per level: 4^z                     │
│    CDN hit rate: >99%                                          │
│    CH query: ~2-5 ms (vs minutes for raw Dijkstra)             │
│    Location updates: ~15 sec intervals, batched                │
│    ETA: sum of per-segment predictions (live + historical)     │
│                                                                │
│  ALGORITHMS TO MENTION:                                        │
│    Contraction Hierarchies (routing)                           │
│    HMM + Viterbi (map matching)                                │
│    A* with haversine heuristic (local routing)                 │
│    Gradient-boosted trees (ETA prediction)                     │
│                                                                │
│  DATA STORES:                                                  │
│    Redis — live traffic (segment → speed)                      │
│    Cassandra — location history (time-series)                  │
│    S3/GCS — tiles + raw archives                               │
│    Elasticsearch — geocoding index                             │
│    In-memory — routing graph (tens of GB, fits in RAM)         │
│                                                                │
│  DON'T FORGET:                                                 │
│    CDN for tiles, Kafka for location, CH for routing           │
│    Map matching (snap GPS to roads)                            │
│    Vector tiles (modern) vs raster tiles (legacy)              │
│    Offline maps (download region packs)                        │
│    Privacy (anonymize, aggregate, delete raw data)             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
