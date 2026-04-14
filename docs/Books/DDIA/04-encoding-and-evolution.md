# Chapter 4 — Encoding & Evolution

Applications change over time, and large systems can't be upgraded atomically. During rolling deployments, old and new code coexist — **old code must read data written by new code (forward compatibility)** and **new code must read data written by old code (backward compatibility)**.

This chapter examines how data is encoded (serialized) for storage and communication, and how to evolve schemas without breaking things.

---

## In-Memory vs On-The-Wire Representations

Programs work with data in at least two forms:

1. **In-memory:** objects, structs, hash tables, trees, arrays — optimized for efficient CPU access, often with pointers
2. **Encoded (serialized):** self-contained byte sequence suitable for writing to a file, sending over the network, or storing in a database — no pointers, no memory addresses

The translation between these two forms is called **encoding** (serialization/marshalling) and **decoding** (deserialization/unmarshalling).

---

## Language-Specific Encoding Formats (Avoid)

Java `Serializable`, Python `pickle`, Ruby `Marshal`, Go `gob`, etc.

**Why to avoid them:**

| Problem | Detail |
|---------|--------|
| **Language lock-in** | Data written by Java `Serializable` can only be read by Java. Cross-language communication is impossible. |
| **Security vulnerability** | Deserializers must be able to instantiate arbitrary classes → attackers can craft payloads that execute malicious code upon deserialization. A common attack vector. |
| **No schema evolution** | Adding or removing fields often breaks compatibility. No versioning built in. |
| **Poor performance** | Java serialization is notoriously slow and produces bloated output. Python pickle is similarly inefficient. |
| **No cross-system compatibility** | Can't share data between microservices in different languages |

**Rule:** don't use language-specific serialization for anything that persists beyond a single process.

---

## Text-Based Formats: JSON, XML, CSV

Widely used, human-readable, but with significant limitations for system-to-system communication.

### JSON

| Strength | Weakness |
|----------|----------|
| Near-universal language support | Doesn't distinguish integers from floats — everything is a "number" |
| Simple and readable | Numbers with more than 53 bits lose precision (JavaScript `Number` is IEEE 754 double) — problem for 64-bit IDs |
| Schema optional (flexibility) | No native binary string support — must Base64 encode (33% size overhead) |
| Browser-native support | No comments (configuration files need comments!) |

**The 64-bit integer problem:** Twitter's API originally returned tweet IDs as JSON numbers. JavaScript clients silently truncated them (64-bit → 53-bit). Fix: include the ID as both a number and a string.

### XML

- Distinguished string vs number types via schema
- Verbose — significantly larger than equivalent JSON
- Complex ecosystem (XML Schema, XSLT, XPath, namespaces)
- Largely fallen out of favor for new systems (still common in enterprise/SOAP)

### CSV

- No schema whatsoever — ambiguous types, ambiguous escaping
- What if a value contains a comma? A newline? A quote? Different implementations handle these differently.
- No way to distinguish a number from a string that looks like a number
- Adequate for simple tabular data interchange; not for anything complex

---

## Binary Encoding Formats

### MessagePack (Binary JSON)

Encodes a JSON-like structure in binary. Includes field **names** in every record.

Example record: `{"userName": "Martin", "favoriteNumber": 1337, "interests": ["daydreaming", "hacking"]}`

| Format | Size |
|--------|------|
| JSON (text) | 81 bytes |
| MessagePack (binary) | 66 bytes |

Only 18% smaller — field names still dominate the encoding. Not worth the loss of human readability for most use cases.

### Thrift (Facebook) and Protocol Buffers (Google)

Both take a fundamentally different approach: field names are replaced by **numbered field tags** defined in a schema.

**Schema definitions:**

```
// Thrift IDL
struct Person {
  1: required string userName,
  2: optional i64 favoriteNumber,
  3: optional list&lt;string&gt; interests
}

// Protocol Buffers
message Person {
  required string user_name = 1;
  optional int64 favorite_number = 2;
  repeated string interests = 3;
}
```

The numbers (`1`, `2`, `3`) are **field tags** — compact identifiers used in the binary encoding instead of field names. Field names only exist in the schema definition and generated code — they never appear in encoded data.

**Encoding comparison for the same record:**

| Format | Size | Key Feature |
|--------|------|-------------|
| Thrift BinaryProtocol | 59 bytes | Type annotation + field tag number + data |
| Thrift CompactProtocol | 34 bytes | Packs type+tag into one byte; variable-length integers |
| Protocol Buffers | 33 bytes | Similar to Thrift Compact; `repeated` for lists |

**Variable-length integer encoding:**
- Small numbers (0-127) encoded in 1 byte
- Larger numbers use more bytes (high bit indicates "more bytes follow")
- The number 1337 takes only 2 bytes instead of 8

#### Schema Evolution Rules (Thrift & Protobuf)

**Adding a new field (forward + backward compatible):**
1. Give the new field a new, unique tag number
2. Old code seeing an unknown tag number simply ignores it (skips the bytes based on the type annotation) → **forward compatible**
3. New code reading old data without the new field uses the default value → **backward compatible**, but only if the new field is `optional` or has a `default`
4. **You can never make a new field `required`** — old data won't have it, breaking backward compatibility

**Removing a field:**
- Can only remove `optional` fields
- **Never reuse the removed field's tag number** — old data files still contain that tag, and future code must ignore it correctly

**Changing a field's data type:**
- Possible but risky — e.g., changing `int32` to `int64`: new code reads old data fine (zero-fill), but old code reading new data may truncate 64-bit values to 32 bits

**Protocol Buffers' `repeated` trick:**
- No explicit list type — a "list" is just the same field tag appearing multiple times
- Changing `optional` → `repeated` is backward compatible: old code seeing a repeated field reads only the last value
- Thrift has a dedicated `list` type with element type — can't do the optional → repeated evolution, but supports nested lists

### Apache Avro

Takes yet another approach: **no field tags at all**. Fields are matched **by position** according to the schema, and by **name** during schema resolution.

**Schema (Avro IDL):**

```
record Person {
    string                userName;
    union { null, long }  favoriteNumber = null;
    array&lt;string&gt;         interests;
}
```

**Most compact encoding: 32 bytes** for the same example. No field tags, no type annotations — just values concatenated together in the order they appear in the schema.

**How decoding works without tags:**
- The reader must have access to the **writer's schema** (the schema used to encode the data)
- The reader walks through the binary data in the order defined by the writer's schema
- **Schema resolution:** the reader's schema and writer's schema are compared side by side, matching fields by name, filling in defaults for fields that exist in the reader's schema but not the writer's

#### Schema Evolution Rules (Avro)

- **Add a field:** must have a default value (so readers with the new schema can fill it in when reading old data)
- **Remove a field:** must have a default value (so readers with the old schema can fill it in when reading new data)
- Changing field names: use **aliases** — the reader's schema can list aliases that match the writer's field names
- No `optional`/`required` — instead, use `union { null, T }` to represent nullable fields

#### How Does the Reader Know the Writer's Schema?

| Context | How Schema Is Conveyed |
|---------|----------------------|
| **Large file with many records** (Hadoop) | Writer's schema included once at the beginning of the file (Avro Object Container File) |
| **Database with records written over time** | Each record tagged with a schema version number; schema registry maps version → schema |
| **Network communication (RPC)** | Schema negotiated at connection setup; used for the lifetime of the connection |

#### Avro's Killer Feature: Dynamically Generated Schemas

If your database schema changes (new column added), you can automatically generate a new Avro schema from the database schema. Field matching is by name (not tag numbers), so there's no manual tag assignment. This is perfect for bulk data export from relational databases to Hadoop — just regenerate the Avro schema whenever the database schema changes.

With Thrift/Protobuf, a DBA would have to manually assign tag numbers to columns and keep them in sync — a significant operational burden.

---

## Modes of Data Flow

Data flows between processes through three primary channels, each with different compatibility requirements.

### 1. Data Flow Through Databases

```
Process A (v2)                Database                Process B (v1)
    │                           │                          │
    ├── write(field_x, field_y)─▶│                         │
    │                           │◀── read ─────────────────┤
    │                           │    (sees field_x, field_y│
    │                           │     but doesn't know     │
    │                           │     about field_y)       │
    │                           │                          │
    │                           │◀── write ────────────────┤
    │                           │    (rewrites the row     │
    │                           │     but must preserve    │
    │                           │     field_y even though  │
    │                           │     it doesn't know      │
    │                           │     about it!)           │
```

**Critical requirement:** when an old process reads and re-writes a row, it must **preserve fields it doesn't understand**. If the old process silently drops unknown fields, data is lost. Good encoding libraries handle this automatically (unknown tags passed through unchanged).

**Data outlives code:** a database may contain rows encoded with many different schema versions spanning years. Schema evolution must handle this gracefully — you can't easily migrate 100 million rows to a new format. The code must be able to read any historical format.

**Schema migration approaches:**
- **PostgreSQL**: `ALTER TABLE ADD COLUMN` with a default value is almost instant (adds metadata only; rows get the default lazily on read)
- **MySQL**: `ALTER TABLE ADD COLUMN` often rewrites the entire table — can take hours on large tables (improved in recent versions)

### 2. Data Flow Through Services (REST and RPC)

**Service-oriented architecture / microservices:** decompose a system into independently deployable services, each owning its own data, communicating via network APIs.

Services must be deployed independently → **rolling upgrades** → old and new versions coexist → **API compatibility is essential**.

#### REST

- Design philosophy using HTTP features: URLs as resources, HTTP methods (GET, POST, PUT, DELETE), content negotiation, status codes
- Not a protocol — a design approach
- JSON over HTTP is the de facto standard for public APIs
- Good for experimentation (can test with `curl`), debugging, cross-organization communication
- OpenAPI (Swagger) for documentation and code generation

#### SOAP

- XML-based protocol with WSDL (Web Services Description Language) for schema
- Complex tooling, heavy IDE integration needed (auto-generated classes)
- Hard to use outside of enterprise Java/.NET ecosystems
- Falling out of favor for new systems

#### RPC: The Fundamental Problem

Remote Procedure Call (RPC) frameworks try to make a network call **look like** a local function call. This is a fundamentally flawed abstraction because:

| Local Function Call | Remote Procedure Call |
|--------------------|----------------------|
| Predictable outcome (success or exception) | Unpredictable: timeout, lost request, lost response, or success |
| Consistent latency | Highly variable latency (ms to seconds) |
| Can pass pointers and references | Must serialize all parameters into bytes |
| Same language and type system | May cross language boundaries |
| Deterministic retry behavior | Retrying may cause duplicate execution unless the operation is **idempotent** |
| No network partitions | The network can fail independently of the endpoints |

**Modern RPC frameworks acknowledge the difference:**
- **gRPC** (Protocol Buffers over HTTP/2): supports streams (sequences of requests/responses), deadlines, cancellation
- **Thrift / Finagle**: futures/promises for async calls, explicit timeouts
- **Avro RPC**: schema negotiation at connection setup
- **Rest.li**: builds on top of HTTP but with strong data model support

**Key rule for RPC versioning:** the server (service provider) can be updated first — it must maintain backward compatibility with old clients. Clients may continue using old API versions indefinitely. This is the same compatibility direction as database schema evolution.

### 3. Data Flow Through Asynchronous Message Passing

**Message broker / message queue** (RabbitMQ, ActiveMQ, Amazon SQS, Kafka, Pulsar):

A message broker sits between sender and receiver, providing:

| Benefit | How |
|---------|-----|
| **Buffering** | If receiver is unavailable or slow, messages queue up (backpressure handling) |
| **Crash recovery** | Broker re-delivers messages if receiver crashes before acknowledgment |
| **Decoupling** | Sender doesn't need to know receiver's address, port, or even existence |
| **Fan-out** | One message delivered to multiple receivers (pub/sub) |
| **Load balancing** | Multiple receiver instances share the processing load |

**vs Direct RPC:**
- Message passing is **one-directional** — sender doesn't wait for a response (fire-and-forget, or response via a separate reply channel)
- Naturally **asynchronous** — sender continues after publishing
- Better isolation — slow consumer doesn't block producer

**Message encoding:** the message body is just bytes — you can use any encoding format (JSON, Protobuf, Avro). The same backward/forward compatibility rules apply.

### The Actor Model

A programming model for concurrency where **actors** are independent units of computation:
- Each actor has a local state (not shared with other actors)
- Each actor processes one message at a time (no concurrency within an actor)
- Actors communicate only via asynchronous message passing
- An actor can: send messages to other actors, create new actors, update its own state

**Frameworks:** Akka (JVM), Orleans (.NET), Erlang OTP.

**Distributed actors:** when actors span multiple machines, message passing becomes network communication. This makes encoding and schema evolution important:
- Messages must be serialized for network transmission
- Rolling upgrades mean actors on different nodes may use different schema versions
- Same forward/backward compatibility requirements as any other data flow

---

## Summary: Choosing an Encoding Format

| Format | Schema Evolution | Human Readable | Compact | Cross-Language | Best For |
|--------|-----------------|----------------|---------|----------------|----------|
| JSON | Weak (no schema enforcement) | Yes | Poor | Yes | Public APIs, browser communication, configuration |
| XML | Weak (complex schema system) | Somewhat | Poor | Yes | Legacy enterprise, document markup |
| Thrift / Protobuf | Strong (field tags) | No | Good (33-34 bytes) | Yes | Internal service communication, storage |
| Avro | Strong (name-based, dynamic) | No | Best (32 bytes) | Yes | Hadoop ecosystem, data pipelines, CDC |
| Language-native | None | No | Varies | No | Never use for persistence or communication |

**For inter-organizational communication:** REST + JSON (ubiquitous, easy to debug)
**For internal service-to-service:** binary formats (Protobuf/gRPC or Avro) — better performance, stronger schemas, code generation
**For data pipelines / analytics:** Avro (schema registry, dynamically generated schemas, Hadoop integration)
