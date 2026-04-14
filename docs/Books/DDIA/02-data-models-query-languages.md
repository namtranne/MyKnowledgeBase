# Chapter 2 — Data Models & Query Languages

Data models are perhaps the most important part of developing software — they shape not just how code is written, but **how we think about the problem**. Choosing the wrong data model means fighting the abstraction for the lifetime of the project.

Applications are built by layering data models:

```
1. Application layer    → Objects, structs, lists, domain-specific models
2. Storage layer        → Tables/documents/graphs (relational, document, graph DBs)
3. Database internals   → Bytes in memory, on disk, over the network
4. Hardware             → Electrical currents, magnetic fields, photons
```

Each layer hides the complexity of the one below. This chapter focuses on **layer 2** — the general-purpose data models for storage and querying.

---

## Relational Model vs Document Model

### Historical Context

Edgar Codd proposed the relational model in 1970. It was radical at the time — earlier database systems (IMS hierarchical model, CODASYL network model) forced application developers to think about the physical layout of data on disk. The relational model's key insight was to **separate the logical data model from the physical storage** — the query optimizer figures out how to execute queries efficiently, not the application developer.

Competitors have come and gone (network model in the 1970s, object databases in the 1990s, XML databases in the 2000s), but relational databases have dominated for 40+ years because they **generalize remarkably well** to diverse use cases beyond their original design for business data processing.

### The NoSQL Movement

NoSQL (retroactively reinterpreted as "Not Only SQL") emerged around 2009, driven by:
- Need for **higher write throughput and larger datasets** than single-machine relational databases could handle
- Preference for **open-source** over expensive commercial databases
- Need for **specialized query operations** not well served by SQL
- Frustration with **rigid relational schemas** when data is heterogeneous

The future is **polyglot persistence** — using different data stores for different purposes within the same application, choosing each for its strengths.

### The Object-Relational Mismatch (Impedance Mismatch)

Most application development uses object-oriented programming. Storing objects in relational tables requires a translation layer between the object model and the table model:

**Example: a LinkedIn-style résumé**

In a relational schema, a user profile requires multiple tables:
- `users` table: `user_id`, `first_name`, `last_name`, `summary`
- `positions` table: `user_id` (FK), `job_title`, `organization`, `start_date`, `end_date`
- `education` table: `user_id` (FK), `school_name`, `start_year`, `end_year`
- `contact_info` table: `user_id` (FK), `type`, `value`

Fetching a complete profile requires **multi-table joins** or multiple queries.

In a document model (JSON), the same profile is a single self-contained document:

```json
{
  "user_id": 251,
  "first_name": "Bill",
  "last_name": "Gates",
  "summary": "Co-chair of the Bill & Melinda Gates Foundation...",
  "positions": [
    {"job_title": "Co-chair", "organization": "Bill & Melinda Gates Foundation"},
    {"job_title": "Co-founder, Chairman", "organization": "Microsoft"}
  ],
  "education": [
    {"school_name": "Harvard University", "start": 1973, "end": 1975},
    {"school_name": "Lakeside School, Seattle"}
  ],
  "contact_info": {"blog": "http://thegatesnotes.com", "twitter": "@BillGates"}
}
```

The document model has **better data locality** — one query fetches everything. The profile's one-to-many structure (one user → many positions, education entries) naturally forms a **tree**, and JSON makes this tree structure explicit.

### Many-to-One and Many-to-Many Relationships

Using IDs instead of free-text strings (e.g., `region_id: "us:91"` instead of `"Greater Seattle Area"`) provides:
- Consistent spelling and style
- Avoid ambiguity (which city named "Springfield"?)
- Easy updates (change the region name in one place)
- Localization support
- Better search (standardized taxonomy)

This is the core idea of **normalization** in relational databases: store each fact in one place, refer to it by ID. Normalization naturally leads to **many-to-one relationships** (many users reference one region), which require **joins**.

Document databases traditionally have **weak join support** — if your data has many-to-many relationships, you end up either:
1. Denormalizing (duplicating data) and managing consistency in application code
2. Performing joins in application code (multiple queries + application-side merge) — slower and more complex than database-side joins

### When to Use Which Model

| Factor | Relational Model | Document Model |
|--------|-----------------|----------------|
| **Data relationships** | Strong support for many-to-one and many-to-many (JOINs) | Best for one-to-many / self-contained hierarchies |
| **Schema enforcement** | Schema-on-write: DB enforces schema at write time (like static typing) | Schema-on-read: structure interpreted at read time (like dynamic typing) |
| **Data locality** | Data scattered across normalized tables | All related data in one place — single read |
| **Write overhead** | Update only changed fields; normalized (no duplication) | Updates often rewrite entire document; denormalized |
| **Query flexibility** | SQL is very expressive for ad-hoc queries and aggregations | Limited query capabilities; app-level logic needed for complex queries |
| **Schema changes** | ALTER TABLE — can be slow (MySQL rewrites the table) or fast (PostgreSQL adds metadata) | No schema change needed — just start writing new fields |
| **Best fit** | Highly interconnected data; complex queries; strong consistency needed | Self-contained documents; variable structure; read-heavy with known access patterns |

### Schema Flexibility: Schema-on-Read vs Schema-on-Write

**Schema-on-write (relational):**
- Like static type checking in a programming language
- Database rejects data that doesn't conform to the schema
- Schema migrations required for changes (can be painful)
- Good when all records have the same structure

**Schema-on-read (document):**
- Like dynamic type checking (runtime interpretation)
- Database accepts any structure; application interprets it
- No migration needed — just handle both old and new formats in code
- Good when records have **heterogeneous structure** (e.g., different types of events, user-generated content with varying fields)

**Example of schema change:**

```sql
-- Relational: schema migration (slow in MySQL, fast in PostgreSQL)
ALTER TABLE users ADD COLUMN full_name TEXT;
UPDATE users SET full_name = first_name || ' ' || last_name;

-- Document: handle both formats in application code (no migration needed)
if (user.full_name) {
  display(user.full_name);
} else {
  display(user.first_name + " " + user.last_name);
}
```

### Data Locality

Document model provides locality when you need **most of the document** on every access. But there are costs:
- Updates that change the document size typically require **rewriting the entire document**
- Keep documents small; avoid writes that grow the document

Locality is **not exclusive to the document model**:
- **Google Spanner**: interleaved tables (child rows stored physically near parent)
- **Oracle**: multi-table index cluster tables
- **Cassandra / HBase**: column families — data for a given key stored together

### Convergence of Models

The boundary between relational and document databases is blurring:
- **PostgreSQL** (9.3+), **MySQL** (5.7+), **IBM DB2**: native JSON support with indexing and querying inside JSON columns
- **RethinkDB**: supports relational-like joins across documents
- **MongoDB**: auto-resolves document references (manual joins)

The trend is toward hybrid models that combine the strengths of both.

---

## Query Languages

### Declarative vs Imperative

| Declarative (SQL, CSS, XPath) | Imperative (IMS queries, application code) |
|-------------------------------|-------------------------------------------|
| Describe **what** result you want | Describe **how** to get the result, step by step |
| The optimizer decides execution strategy | You choose the algorithm |
| Changes to internal data structures don't break queries | Tied to specific data layout |
| Easier to parallelize (no specified execution order) | Hard to parallelize (operations have explicit order) |
| Shorter, more readable for data queries | More flexible for general logic |

**Why this matters deeply:**

When you write `SELECT * FROM animals WHERE family = 'Sharks'`, the database can:
- Choose whether to use a sequential scan or an index
- Decide the order of operations
- Parallelize across multiple CPU cores
- Use whichever index is most appropriate for the query

If you had written this imperatively (loop through all animals, check each one), the database couldn't optimize it — your code specifies a particular execution plan.

**Web analogy:** CSS (declarative) vs JavaScript DOM manipulation (imperative). CSS says "all paragraph elements should be blue" and the browser figures out how to make it happen. JavaScript says "find element by ID, set its color to blue, then find the next sibling..." — brittle and tied to DOM structure.

### MapReduce Querying

MapReduce is a programming model for processing large datasets across a cluster, positioned between fully declarative (SQL) and fully imperative:

```javascript
// MongoDB MapReduce example: count shark sightings per month
db.observations.mapReduce(
  function map() {  // Called once per document
    var year = this.observationTimestamp.getFullYear();
    var month = this.observationTimestamp.getMonth() + 1;
    emit(year + "-" + month, this.numberAnimals);  // Emit key-value pair
  },
  function reduce(key, values) {  // Called once per unique key
    return Array.sum(values);
  },
  { query: { family: "Sharks" }, out: "monthlySharkReport" }
);
```

**Constraints:** `map` and `reduce` functions must be **pure** (no side effects, no external state, no database queries). This enables the framework to run them anywhere, in any order, and retry on failure.

**Evolution:** MongoDB recognized that MapReduce is harder to use than necessary and introduced the **aggregation pipeline** — a declarative JSON-based query language:

```javascript
db.observations.aggregate([
  { $match: { family: "Sharks" } },
  { $group: {
    _id: { year: { $year: "$observationTimestamp" },
           month: { $month: "$observationTimestamp" } },
    totalAnimals: { $sum: "$numberAnimals" }
  }}
]);
```

This is essentially SQL expressed as JSON — the optimizer can choose how to execute it.

---

## Graph Data Models

**When to use a graph model:** when **many-to-many relationships** are the dominant feature of your data — when anything can potentially relate to anything.

**Examples:**
- **Social networks**: people → friends, followers, organizations, events
- **The web**: pages → hyperlinks to other pages
- **Road/rail networks**: intersections → roads/rails connecting them
- **Fraud detection**: accounts, IP addresses, devices, transactions — find suspicious patterns
- **Knowledge graphs**: entities → relationships (Wikipedia/Wikidata, Google Knowledge Graph)
- **Dependency graphs**: packages → dependencies; code modules → imports

### Property Graph Model

Used by: **Neo4j**, **Titan**, **InfiniteGraph**, **Amazon Neptune**.

**Vertices** (nodes):
- Unique identifier
- Set of outgoing edges
- Set of incoming edges
- Collection of key-value properties (e.g., `{name: "Idaho", type: "state"}`)

**Edges** (relationships):
- Unique identifier
- Tail vertex (start)
- Head vertex (end)
- Label describing the relationship type (e.g., `:BORN_IN`, `:LIVES_IN`, `:WITHIN`)
- Collection of key-value properties

Expressed as relational tables:

```sql
CREATE TABLE vertices (
    vertex_id   INTEGER PRIMARY KEY,
    properties  JSON
);

CREATE TABLE edges (
    edge_id     INTEGER PRIMARY KEY,
    tail_vertex INTEGER REFERENCES vertices(vertex_id),
    head_vertex INTEGER REFERENCES vertices(vertex_id),
    label       TEXT,
    properties  JSON
);

CREATE INDEX ON edges (tail_vertex);
CREATE INDEX ON edges (head_vertex);
```

**Key features:**
1. Any vertex can connect to any other vertex — no schema restricting which types can be related
2. Given any vertex, efficiently traverse both outgoing and incoming edges (bidirectional traversal)
3. Use different edge labels for different relationship types in one graph — great flexibility
4. Vertices can represent different types of entities (people, locations, events) in the same graph

### Cypher Query Language

Declarative language created for Neo4j. Optimized for graph traversal patterns:

```cypher
-- Find all people who were born in the US and now live in Europe
MATCH
  (person) -[:BORN_IN]->  () -[:WITHIN*0..]-> (us:Location {name: 'United States'}),
  (person) -[:LIVES_IN]-> () -[:WITHIN*0..]-> (eu:Location {name: 'Europe'})
RETURN person.name
```

The `*0..` means "follow zero or more `:WITHIN` edges" — a variable-length path. This handles hierarchies like `city → state → country → continent` without knowing the exact depth.

**The same query in SQL** requires recursive common table expressions (CTEs) — syntactically awkward and harder to optimize:

```sql
WITH RECURSIVE in_usa(vertex_id) AS (
    SELECT vertex_id FROM vertices WHERE properties->>'name' = 'United States'
  UNION
    SELECT edges.tail_vertex FROM edges
    JOIN in_usa ON edges.head_vertex = in_usa.vertex_id
    WHERE edges.label = 'within'
),
in_europe(vertex_id) AS (
    SELECT vertex_id FROM vertices WHERE properties->>'name' = 'Europe'
  UNION
    SELECT edges.tail_vertex FROM edges
    JOIN in_europe ON edges.head_vertex = in_europe.vertex_id
    WHERE edges.label = 'within'
)
SELECT vertices.properties->>'name' FROM vertices
JOIN edges AS born_edge ON vertices.vertex_id = born_edge.tail_vertex
JOIN edges AS lives_edge ON vertices.vertex_id = lives_edge.tail_vertex
WHERE born_edge.head_vertex IN (SELECT vertex_id FROM in_usa)
  AND lives_edge.head_vertex IN (SELECT vertex_id FROM in_europe)
  AND born_edge.label = 'born_in'
  AND lives_edge.label = 'lives_in';
```

The graph model makes queries about relationships between entities much more natural and readable.

### Triple-Stores and SPARQL

Data stored as three-part statements: **(subject, predicate, object)**.

```
(Jim, likes, bananas)
(Jim, born_in, New_York)
(New_York, within, USA)
(USA, type, Country)
```

- If the object is a primitive value → the triple represents a property (`Jim has age 33`)
- If the object is another entity → the triple represents an edge (`Jim born_in New_York`)

**SPARQL** is the query language for RDF triple-stores, structurally similar to Cypher:

```sparql
PREFIX : &lt;urn:example:&gt;
SELECT ?personName WHERE {
  ?person :bornIn / :within* :usa .
  ?person :livesIn / :within* :eu .
  ?person :name ?personName .
}
```

The `/` and `*` operators express path traversal, similar to Cypher's `*0..`.

### Datalog

The oldest of the three graph query languages (academic roots in the 1980s), and the most foundational.

**Key difference from Cypher and SPARQL:** Datalog defines **rules** that can be combined and reused — you build up complex queries incrementally from simpler rules:

```datalog
% Define base facts
within_recursive(X, Y) :- within(X, Y).                       % Direct containment
within_recursive(X, Y) :- within(X, Z), within_recursive(Z, Y).  % Transitive

% Find people born in the US
migrated(Name, BornIn, LivesIn) :-
    name(Person, Name),
    born_in(Person, BornLoc),
    lives_in(Person, LivingLoc),
    within_recursive(BornLoc, LocationUSA), name(LocationUSA, 'United States'),
    within_recursive(LivingLoc, LocationEU), name(LocationEU, 'Europe'),
    name(BornLoc, BornIn),
    name(LivingLoc, LivesIn).
```

**Power of Datalog:** rules can reference other rules, enabling composition. New rules can be added without modifying existing ones. This makes it powerful for complex, recursive queries over graph data — much more composable than Cypher or SPARQL.

---

## Choosing a Data Model — Decision Framework

```
Is your data highly interconnected with many-to-many relationships?
├── Yes → Graph model (Neo4j, Amazon Neptune, or SPARQL triple-store)
│         Best for: social networks, knowledge graphs, recommendation engines,
│         fraud detection, network topology
└── No
    ├── Is your data mostly self-contained documents with one-to-many nesting?
    │   ├── Yes → Document model (MongoDB, CouchDB, RethinkDB)
    │   │         Best for: content management, user profiles, product catalogs,
    │   │         event logs, mobile app data, anything with heterogeneous structure
    │   └── No → Relational model (PostgreSQL, MySQL)
    │             Best for: structured business data, financial transactions,
    │             inventory, anything requiring complex joins and strong consistency
    └── Note: Modern databases are converging. PostgreSQL handles JSON and
        graph queries. MongoDB supports joins. The choice is about primary
        access patterns and where you want the strongest guarantees.
```
