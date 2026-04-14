# Chapter 7: Hotel Reservation System

## 1. Problem Statement & Requirements

### What Are We Designing?

A **hotel reservation system** similar to Booking.com, Expedia, or the booking engine behind Marriott/Hilton. The system lets users search hotels, check room availability for specific dates, and make reservations — all while handling high concurrency and preventing double-booking.

This is a classic interview question because it touches **concurrency control**, **inventory management**, and **consistency vs availability trade-offs** — concepts that transfer to any system where multiple users compete for limited resources (ticket booking, ride-hailing, flash sales).

### Functional Requirements

1. **Hotel & room browsing** — show hotel details, photos, amenities, room types and prices
2. **Availability search** — given a city/location, date range, and guest count, return hotels with available rooms
3. **Make a reservation** — book a specific room type at a hotel for given dates
4. **View / cancel reservations** — guests can view their bookings and cancel within policy
5. **Admin portal** — hotel staff can add/update hotel info, manage room inventory, view bookings, adjust rates
6. **Payment processing** — charge the guest upon confirmation
7. **Notifications** — send booking confirmations, reminders, cancellation notices

### Non-Functional Requirements

| Requirement | Target | Why |
|---|---|---|
| Consistency | Strong for reservations | Cannot sell the same room twice |
| Availability | High for search | Users should always be able to browse |
| Latency | < 200ms for search, < 1s for booking | Competitive UX |
| Concurrency | Handle spikes during flash sales / holidays | Thousands of concurrent bookings |
| Durability | Zero lost reservations | Financial and legal obligation |
| Scalability | Support growing hotel/room inventory | Business growth |

### Scale Estimation (Back-of-Envelope)

```
Hotels:                  5,000
Rooms:                   1,000,000 (avg 200 rooms/hotel)
Avg occupancy:           70%
Daily reservations:      1M × 0.70 / avg_stay(3 days) ≈ 233,000 bookings/day
Booking QPS:             233,000 / 86,400 ≈ 3 QPS (avg), ~30 QPS peak
Search QPS:              10–50× booking QPS ≈ 30–150 QPS avg, ~1,500 peak
Page views QPS:          100× booking ≈ 300 avg, ~3,000 peak

Data sizes:
  Hotel table:           5,000 rows × 2 KB ≈ 10 MB
  Room type table:       50,000 rows (10 types/hotel) × 1 KB ≈ 50 MB
  Inventory table:       50,000 room_types × 365 days = 18.25M rows × 50 B ≈ 1 GB
  Reservation table:     233K/day × 365 days × 500 B ≈ 42 GB/year
```

**Key insight**: booking QPS is low (~30 peak), but concurrency on *specific popular rooms* can be extremely high during flash sales (hundreds of concurrent requests for the same inventory row). The challenge isn't overall throughput — it's **hot-spot contention**.

---

## 2. High-Level Design

### System Architecture

```
                         ┌──────────────┐
                         │   CDN        │  (hotel images, static assets)
                         └──────┬───────┘
                                │
┌──────────┐            ┌───────▼───────┐
│  Web /   │───────────▶│  API Gateway  │  (auth, rate limiting, routing)
│  Mobile  │            └───────┬───────┘
└──────────┘                    │
                    ┌───────────┼───────────────┐
                    │           │               │
              ┌─────▼──┐  ┌────▼─────┐  ┌──────▼──────┐
              │ Hotel   │  │Reservation│  │  Payment    │
              │ Service │  │ Service   │  │  Service    │
              └────┬────┘  └────┬──────┘  └──────┬──────┘
                   │            │                │
              ┌────▼────┐  ┌───▼──────┐   ┌─────▼──────┐
              │ Hotel DB │  │Reservation│   │  Payment   │
              │ (read    │  │   DB     │   │  Gateway   │
              │ replicas)│  │(primary) │   │ (Stripe)   │
              └─────────┘  └──────────┘   └────────────┘
                   │
              ┌────▼──────────┐
              │ Elasticsearch │  (hotel search)
              └───────────────┘

              ┌───────────────────────────────┐
              │       Message Queue           │
              │   (Kafka / SQS / RabbitMQ)    │
              └──────────┬────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Notification Service│  (email, SMS, push)
              └─────────────────────┘
```

### Microservices Breakdown

| Service | Responsibility |
|---|---|
| **Hotel Service** | CRUD for hotels, room types, amenities, photos. Powers browsing and search. |
| **Rate Service** | Dynamic pricing, seasonal rates, promotions, discounts |
| **Reservation Service** | Core booking logic: availability check, reservation creation, cancellation |
| **Payment Service** | Integrates with payment gateways (Stripe, PayPal), handles refunds |
| **Notification Service** | Async emails, SMS, push notifications via message queue |

### API Design

#### Guest-Facing APIs

```
GET    /v1/hotels?city=NYC&checkin=2026-03-01&checkout=2026-03-05&guests=2
       → Search available hotels (paginated)

GET    /v1/hotels/{hotel_id}
       → Hotel details (name, address, amenities, photos, rating)

GET    /v1/hotels/{hotel_id}/rooms?checkin=2026-03-01&checkout=2026-03-05
       → Available room types with prices for the date range

POST   /v1/reservations
       Headers: Idempotency-Key: <uuid>
       Body: { hotel_id, room_type_id, checkin, checkout, guest_id, payment_info }
       → Create reservation

GET    /v1/reservations/{reservation_id}
       → Reservation details

DELETE /v1/reservations/{reservation_id}
       → Cancel reservation (within cancellation policy)
```

#### Admin APIs

```
POST   /v1/admin/hotels
       → Create hotel listing

PUT    /v1/admin/hotels/{hotel_id}
       → Update hotel info

POST   /v1/admin/hotels/{hotel_id}/rooms
       → Add room type with inventory count

PUT    /v1/admin/hotels/{hotel_id}/rooms/{room_type_id}/inventory
       Body: { date, total_inventory }
       → Adjust inventory for a specific date
```

---

## 3. Data Model Deep Dive

### Why Relational?

Reservations are **financial transactions** with strict ACID requirements. We need:
- **Atomicity**: a booking either completes fully or not at all
- **Consistency**: inventory counts must always be accurate
- **Isolation**: concurrent bookings must not corrupt state
- **Durability**: confirmed bookings must never be lost

**PostgreSQL** or **MySQL InnoDB** are ideal. NoSQL databases lack the transactional guarantees needed for the core reservation flow.

### Schema

```sql
CREATE TABLE hotel (
    hotel_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    address         VARCHAR(500),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    description     TEXT,
    star_rating     TINYINT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE room_type (
    room_type_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
    hotel_id        BIGINT NOT NULL REFERENCES hotel(hotel_id),
    name            VARCHAR(100),          -- "Deluxe King", "Standard Double"
    description     TEXT,
    max_guests      INT,
    base_price      DECIMAL(10, 2),
    amenities       JSON,                  -- ["wifi", "minibar", "ocean_view"]
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core availability table: one row per (hotel, room_type, date)
CREATE TABLE room_type_inventory (
    hotel_id        BIGINT NOT NULL,
    room_type_id    BIGINT NOT NULL,
    date            DATE NOT NULL,
    total_inventory INT NOT NULL,           -- how many rooms of this type exist
    total_reserved  INT NOT NULL DEFAULT 0, -- how many are booked
    PRIMARY KEY (hotel_id, room_type_id, date),
    CONSTRAINT fk_room_type FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id),
    CONSTRAINT inventory_check CHECK (total_reserved <= total_inventory)
);

CREATE TABLE reservation (
    reservation_id  BIGINT PRIMARY KEY AUTO_INCREMENT,
    hotel_id        BIGINT NOT NULL,
    room_type_id    BIGINT NOT NULL,
    guest_id        BIGINT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          ENUM('pending', 'confirmed', 'checked_in',
                         'checked_out', 'cancelled', 'no_show') DEFAULT 'pending',
    total_price     DECIMAL(10, 2),
    idempotency_key VARCHAR(64) UNIQUE,     -- prevents duplicate bookings
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guest (guest_id),
    INDEX idx_hotel_dates (hotel_id, room_type_id, start_date, end_date),
    INDEX idx_idempotency (idempotency_key)
);
```

### Why Room-Type-Level Inventory (Not Individual Rooms)?

| Approach | Description | Pros | Cons |
|---|---|---|---|
| **Individual room tracking** | Track each physical room (Room 301, 302…) | Exact room assignment | Huge table, complex availability queries |
| **Room-type-level inventory** | Track count of available rooms per type per date | Simple queries, compact | No specific room assignment at booking time |

We use **room-type-level** because:
1. Guests book a *type* ("Deluxe King"), not a specific physical room
2. Availability check reduces to: `total_inventory - total_reserved > 0`
3. Physical room assignment happens at check-in (front desk / housekeeping decision)
4. Drastically fewer rows: 50K room_types × 365 days = 18M rows vs 1M rooms × 365 = 365M rows

### Reservation Status State Machine

```
                    ┌──────────────┐
                    │   pending    │  (created, awaiting payment)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │ payment    │            │ payment failed
              │ success    │            │ or timeout
              ▼            │            ▼
       ┌──────────┐        │     ┌──────────┐
       │confirmed │        │     │cancelled │
       └─────┬────┘        │     └──────────┘
             │             │
             │ guest       │ no show after
             │ arrives     │ check-in date
             ▼             ▼
       ┌──────────┐  ┌──────────┐
       │checked_in│  │ no_show  │
       └─────┬────┘  └──────────┘
             │
             │ guest departs
             ▼
       ┌───────────┐
       │checked_out│
       └───────────┘
```

**Cancellation** can happen from `pending` or `confirmed` states (subject to cancellation policy). Refund amount depends on how close the cancellation is to the check-in date.

---

## 4. Concurrency Control — The Core Challenge

### The Double-Booking Problem

This is the **heart of the interview**. Consider:

```
Time    User A                          User B
─────   ─────────────────────           ─────────────────────
T1      SELECT total_reserved           
        FROM room_type_inventory        
        WHERE hotel=1, type=1,          
              date='2026-03-01'         
        → returns 99 (inventory=100)    

T2                                      SELECT total_reserved
                                        → returns 99 (same!)

T3      UPDATE SET total_reserved=100   
        → success                       

T4                                      UPDATE SET total_reserved=100
                                        → ALSO succeeds! (lost update)
                                        → Room is now double-booked!
```

Both users read the same value (99), both increment to 100, and the second write **overwrites** the first. We've sold 2 rooms but only decremented inventory by 1.

### Solution 1: Pessimistic Locking (SELECT FOR UPDATE)

Lock the inventory row before reading. Other transactions **wait** until the lock is released.

```sql
BEGIN;

-- Lock the row. Other transactions block here until we COMMIT/ROLLBACK.
SELECT total_reserved, total_inventory
FROM room_type_inventory
WHERE hotel_id = 1
  AND room_type_id = 1
  AND date = '2026-03-01'
FOR UPDATE;

-- Application checks: if total_reserved < total_inventory, proceed
UPDATE room_type_inventory
SET total_reserved = total_reserved + 1
WHERE hotel_id = 1
  AND room_type_id = 1
  AND date = '2026-03-01';

INSERT INTO reservation (...) VALUES (...);

COMMIT;
```

```
Time    User A                          User B
─────   ─────────────────────           ─────────────────────
T1      SELECT ... FOR UPDATE           
        → locks row, reads 99           

T2                                      SELECT ... FOR UPDATE
                                        → BLOCKS (waiting for lock)

T3      UPDATE total_reserved = 100     
        COMMIT → releases lock          

T4                                      → lock acquired, reads 100
                                        → 100 = total_inventory
                                        → no rooms available!
                                        ROLLBACK
```

| Pros | Cons |
|---|---|
| Simple to implement | Reduces throughput (transactions serialize) |
| Guarantees consistency | Risk of deadlocks if locking multiple rows |
| Easy to reason about | Holding locks during slow operations (payment) wastes resources |

**Deadlock mitigation**: always lock rows in a consistent order (e.g., by ascending date).

### Solution 2: Optimistic Locking (Version Column)

No locks. Instead, detect conflicts at write time using a version number.

```sql
-- Add version column to inventory table
ALTER TABLE room_type_inventory ADD COLUMN version INT DEFAULT 0;
```

```sql
-- Step 1: Read current state (no lock)
SELECT total_reserved, total_inventory, version
FROM room_type_inventory
WHERE hotel_id = 1 AND room_type_id = 1 AND date = '2026-03-01';
-- Returns: total_reserved=99, total_inventory=100, version=5

-- Step 2: Update only if version hasn't changed
UPDATE room_type_inventory
SET total_reserved = total_reserved + 1,
    version = version + 1
WHERE hotel_id = 1
  AND room_type_id = 1
  AND date = '2026-03-01'
  AND version = 5;              -- ← optimistic check

-- Step 3: Check affected rows
-- If affected_rows = 1 → success, proceed to insert reservation
-- If affected_rows = 0 → conflict! retry from Step 1
```

```
Time    User A                          User B
─────   ─────────────────────           ─────────────────────
T1      SELECT → version=5, reserved=99

T2                                      SELECT → version=5, reserved=99

T3      UPDATE WHERE version=5          
        → affected_rows=1 ✓            
        → version becomes 6            

T4                                      UPDATE WHERE version=5
                                        → affected_rows=0 ✗
                                        → RETRY from step 1
                                        → reads version=6, reserved=100
                                        → no rooms available!
```

| Pros | Cons |
|---|---|
| No locks, higher throughput | Retries under high contention |
| No deadlock risk | Wasted work on conflict |
| Better for low-to-medium contention | Can frustrate users if retries are excessive |

**Retry strategy**: exponential backoff with jitter, max 3 retries, then fail gracefully.

### Solution 3: Database Constraints

Let the database enforce the invariant directly. No application-level locking needed.

```sql
-- The CHECK constraint on the table (defined in schema above):
-- CONSTRAINT inventory_check CHECK (total_reserved <= total_inventory)

-- Just do a direct increment:
UPDATE room_type_inventory
SET total_reserved = total_reserved + 1
WHERE hotel_id = 1
  AND room_type_id = 1
  AND date = '2026-03-01';

-- If total_reserved would exceed total_inventory:
-- → DB throws constraint violation error
-- → Application catches it: "No rooms available"
```

| Pros | Cons |
|---|---|
| Simplest — minimal application logic | Not all databases support CHECK constraints well |
| Database guarantees correctness | Application must handle constraint violation errors |
| Naturally handles concurrency | Less flexible for complex business rules |

### Comparison Table

| Criteria | Pessimistic (FOR UPDATE) | Optimistic (Version) | DB Constraint (CHECK) |
|---|---|---|---|
| **Complexity** | Medium | Medium | Low |
| **Throughput** | Low (serialized) | High (no locks) | High (no locks) |
| **Deadlock risk** | Yes | No | No |
| **Best for** | High contention | Low-medium contention | Simple invariants |
| **User experience** | Waits (transparent) | May retry (visible delay) | Instant fail/success |
| **Flash sale suitability** | Good (predictable) | Poor (retry storms) | Good |

### Which to Use When

```
Is contention expected to be high (flash sales, last room)?
├─ YES → Pessimistic locking or DB constraints
│        Pessimistic if you need complex multi-step transactions
│        DB constraints if the invariant is simple (reserved ≤ inventory)
│
└─ NO  → Optimistic locking
         Better throughput, conflicts are rare so retries are acceptable
```

**Recommended for interviews**: start with the **DB constraint** approach (simplest), then discuss pessimistic locking as a follow-up for multi-row operations or flash-sale scenarios.

---

## 5. Idempotency

### Why Idempotency Matters

Network issues are inevitable. A user clicks "Book Now," the request reaches the server, the reservation is created, but the response is lost. The client retries — without idempotency, the user gets **charged twice** for the same room.

```
Client                    Server
  │── POST /reservations ──▶│  ← reservation created, payment charged
  │                         │
  │   ✗ response lost ✗     │
  │                         │
  │── POST /reservations ──▶│  ← WITHOUT idempotency: second reservation!
  │◀── 200 OK ─────────────│     user is double-charged
```

### Implementation with Idempotency Key

```
Client                              Server
  │                                   │
  │  generate UUID locally:           │
  │  key = "a1b2c3d4-..."            │
  │                                   │
  │── POST /reservations ────────────▶│
  │   Header: Idempotency-Key: key    │
  │   Body: { hotel, room, dates }    │
  │                                   │
  │                          ┌────────▼────────┐
  │                          │ Check: does key  │
  │                          │ exist in DB?     │
  │                          └────────┬────────┘
  │                            NO     │    YES
  │                          ┌────┘        └────┐
  │                          ▼                   ▼
  │                   Create reservation   Return cached
  │                   Store key+result     result (200 OK)
  │                          │                   │
  │◀─────── 201 Created ────┘                   │
  │                                              │
  │── POST /reservations (retry) ───────────────▶│
  │   Header: Idempotency-Key: same key          │
  │◀─────── 200 OK (same reservation) ──────────┘
```

### Database Schema for Idempotency

```sql
CREATE TABLE idempotency_keys (
    idempotency_key     VARCHAR(64) PRIMARY KEY,
    reservation_id      BIGINT,
    response_code       INT,
    response_body       JSON,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-expire old keys (e.g., 24-hour TTL)
-- Cleanup via cron: DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL 24 HOUR;
```

Alternatively, the `idempotency_key` column on the `reservation` table with a `UNIQUE` index serves the same purpose for the common case. The separate table is useful when you need to cache the full response.

### Key Implementation Details

1. **Client generates the key** — UUIDv4 is standard, generated *before* the first request
2. **Key scope** — the key is tied to a specific user/action combination
3. **Atomicity** — insert the idempotency key and create the reservation in the **same database transaction**
4. **TTL** — expire keys after 24 hours; after that, the same key can theoretically create a new reservation (but the UUID collision probability is negligible)
5. **Status handling** — if the original request is still in progress when a retry arrives, return `409 Conflict` or `202 Accepted` to prevent race conditions

---

## 6. Reservation Flow Step-by-Step

### End-to-End Happy Path

```
┌─────────┐    ┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────────┐
│  User   │    │  Hotel    │    │ Reservation  │    │  Payment  │    │ Notification │
│ (Client)│    │  Service  │    │   Service    │    │  Service  │    │   Service    │
└────┬────┘    └─────┬─────┘    └──────┬───────┘    └─────┬─────┘    └──────┬───────┘
     │               │                │                   │                 │
     │ 1. Search     │                │                   │                 │
     │──────────────▶│                │                   │                 │
     │  GET /hotels  │                │                   │                 │
     │  ?city=NYC    │                │                   │                 │
     │◀──────────────│                │                   │                 │
     │  hotel list   │                │                   │                 │
     │               │                │                   │                 │
     │ 2. View rooms │                │                   │                 │
     │──────────────▶│                │                   │                 │
     │  GET /hotels/ │                │                   │                 │
     │  42/rooms     │                │                   │                 │
     │◀──────────────│                │                   │                 │
     │  room list +  │                │                   │                 │
     │  availability │                │                   │                 │
     │               │                │                   │                 │
     │ 3. Book room                   │                   │                 │
     │───────────────────────────────▶│                   │                 │
     │  POST /reservations            │                   │                 │
     │  Idempotency-Key: uuid         │                   │                 │
     │                                │                   │                 │
     │               │         4. Check idempotency key   │                 │
     │               │         5. Verify availability     │                 │
     │               │         6. Create reservation      │                 │
     │               │            (status=pending)        │                 │
     │               │         7. Decrement inventory     │                 │
     │               │                │                   │                 │
     │               │                │  8. Charge guest   │                 │
     │               │                │──────────────────▶│                 │
     │               │                │                   │──▶ Stripe/PayPal│
     │               │                │                   │◀── success      │
     │               │                │◀──────────────────│                 │
     │               │                │  payment_confirmed│                 │
     │               │                │                   │                 │
     │               │         9. Update reservation      │                 │
     │               │            (status=confirmed)      │                 │
     │               │                │                   │                 │
     │               │                │  10. Publish event │                 │
     │               │                │─────────────────────────────────────▶
     │               │                │  "reservation.confirmed"            │
     │               │                │                   │                 │
     │◀──────────────────────────────│                   │          11. Send
     │  201 Created                   │                   │          confirmation
     │  { reservation_id, ... }       │                   │          email/SMS
     │               │                │                   │                 │
```

### Steps in Detail

| Step | Action | Service | Details |
|---|---|---|---|
| 1 | Search hotels | Hotel Service | Query Elasticsearch by location, dates, guests. Return paginated results. |
| 2 | View rooms | Hotel Service + Rate Service | Fetch room types, query `room_type_inventory` for date range, get prices from Rate Service. |
| 3 | Submit booking | Client | Client generates `Idempotency-Key` UUID, sends POST request. |
| 4 | Check idempotency | Reservation Service | If key exists, return cached response. Otherwise, proceed. |
| 5 | Verify availability | Reservation Service | `SELECT ... FROM room_type_inventory WHERE total_reserved < total_inventory` for all dates in range. |
| 6 | Create reservation | Reservation Service | Insert reservation row with `status = 'pending'`. |
| 7 | Decrement inventory | Reservation Service | `UPDATE room_type_inventory SET total_reserved = total_reserved + 1` for each date in range. Steps 5–7 happen in a single DB transaction. |
| 8 | Process payment | Payment Service | Synchronous call to payment gateway. Timeout: 30 seconds. |
| 9 | Confirm reservation | Reservation Service | On payment success, update `status = 'confirmed'`. On failure, rollback inventory and set `status = 'cancelled'`. |
| 10 | Publish event | Reservation Service | Emit `reservation.confirmed` event to message queue. |
| 11 | Notify guest | Notification Service | Consumes event, sends confirmation email/SMS. Async and decoupled. |

### Handling Failures

| Failure | Response |
|---|---|
| Payment times out | Release inventory (total_reserved -= 1), set status = `cancelled`, return error |
| Payment fails | Same as timeout |
| Network error (client retry) | Idempotency key returns cached result |
| Server crash mid-transaction | DB transaction rolls back automatically (ACID) |
| Reservation expires (pending too long) | Background job checks pending reservations older than 10 min, releases them |

### Pre-Reservation (Hold) Pattern

To avoid holding inventory while the user fills out payment details:

```
1. User clicks "Reserve" → create reservation (status=pending),
   decrement inventory, start 10-minute timer

2. User has 10 minutes to complete payment

3. If payment completes → status = confirmed
   If timer expires     → status = cancelled, restore inventory

4. Background cron job: every minute, find all pending reservations
   older than 10 minutes, cancel them and release inventory
```

```sql
-- Background job query
UPDATE room_type_inventory AS i
JOIN reservation AS r ON i.hotel_id = r.hotel_id
  AND i.room_type_id = r.room_type_id
  AND i.date BETWEEN r.start_date AND r.end_date
SET i.total_reserved = i.total_reserved - 1,
    r.status = 'cancelled'
WHERE r.status = 'pending'
  AND r.created_at < NOW() - INTERVAL 10 MINUTE;
```

---

## 7. Handling Overbooking

### Intentional Overbooking

Hotels (like airlines) intentionally overbook because a percentage of guests **cancel** or **no-show**. This maximizes revenue.

```
Physical rooms available:    100
Overbooking buffer:          10% → accept up to 110 reservations
Expected cancellations:      ~8-12%
Net occupancy target:        ~100 rooms occupied
```

### Implementation

Adjust the inventory check to allow the buffer:

```sql
-- Instead of: total_reserved <= total_inventory
-- Use: total_reserved <= total_inventory * overbooking_factor

ALTER TABLE room_type_inventory
ADD COLUMN overbooking_factor DECIMAL(3, 2) DEFAULT 1.00;

-- For a 10% overbooking allowance:
UPDATE room_type_inventory SET overbooking_factor = 1.10;

-- Availability check becomes:
SELECT * FROM room_type_inventory
WHERE total_reserved < FLOOR(total_inventory * overbooking_factor)
  AND hotel_id = ?
  AND room_type_id = ?
  AND date = ?;
```

### Risk Management

| Strategy | Description |
|---|---|
| **Walk policy** | If overbooked and all guests show up, hotel arranges alternate accommodation at a nearby hotel at their expense |
| **Compensation** | Free night, upgrade, or cash compensation for displaced guests |
| **Dynamic adjustment** | Reduce overbooking factor during high-demand periods when cancellation rates drop |
| **Tiered overbooking** | Different overbooking factors per room type (suites have lower no-show rates) |

---

## 8. Caching Strategy

### What to Cache

| Data | Cache? | Reason | TTL |
|---|---|---|---|
| Hotel details | Yes | Read-heavy, rarely changes | 1 hour |
| Room type info | Yes | Read-heavy, rarely changes | 1 hour |
| Room photos/media | Yes (CDN) | Static content | 24 hours |
| Room availability (inventory) | Carefully | High write frequency, stale data = overbooking | 30–60 seconds |
| Reservation details | No | Low read frequency, must be accurate | — |
| Search results | Yes | Expensive Elasticsearch queries | 5 minutes |

### Cache Architecture

```
┌────────────┐     ┌─────────┐     ┌──────────┐
│   Client   │────▶│  Redis  │────▶│ Database │
└────────────┘     │ (Cache) │     └──────────┘
                   └─────────┘

Cache-Aside Pattern (for hotel data):
1. Check Redis for hotel:{id}
2. Cache miss → query DB, populate Redis (TTL 1 hour)
3. Cache hit → return from Redis
4. On hotel update → invalidate cache key
```

### Redis for Inventory (Advanced)

For availability data, stale cache is dangerous (could show rooms as available when they're sold out). Two approaches:

**Approach A: Don't cache inventory** — query the DB directly. With proper indexing and read replicas, this handles typical load fine (< 1,500 QPS for search).

**Approach B: Redis with Lua scripts** — for extreme scale or flash sales:

```lua
-- Lua script: atomic check-and-decrement in Redis
-- Key: inventory:{hotel_id}:{room_type_id}:{date}
-- Returns 1 if successful, 0 if no availability

local key = KEYS[1]
local current = tonumber(redis.call('GET', key))

if current == nil then
    return -1  -- cache miss, fall back to DB
end

if current > 0 then
    redis.call('DECR', key)
    return 1   -- room reserved in cache
else
    return 0   -- no availability
end
```

This gives **O(1) availability checks** in Redis, with the DB as the source of truth. Cache is warmed from the DB and refreshed periodically. On a successful Redis decrement, the actual DB reservation still happens — if the DB rejects it, the Redis count is restored.

**Interview insight**: mention both approaches and let the interviewer steer. The simpler approach (no inventory cache) is appropriate for most hotel booking systems at the given scale.

---

## 9. Scaling

### Database Scaling

```
                    ┌──────────────┐
                    │   Primary    │  ← all writes (reservations)
                    │   (MySQL)    │
                    └──────┬───────┘
                           │ replication
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Replica 1│ │ Replica 2│ │ Replica 3│  ← search/read queries
        └──────────┘ └──────────┘ └──────────┘
```

**Sharding** (when a single primary isn't enough):

| Strategy | Shard Key | Pros | Cons |
|---|---|---|---|
| By `hotel_id` | `hotel_id % N` | All data for a hotel on one shard; reservation transactions are local | Uneven distribution if some hotels are much larger |
| By `hotel_id` range | Ranges (1–1000 → shard1) | Simple | Hot ranges during peak |
| Consistent hashing | Hash(hotel_id) | Even distribution, easy to add shards | Cross-shard queries for user's reservations |

At 5,000 hotels and ~42 GB/year, a single primary with read replicas is sufficient. Sharding becomes necessary at 100K+ hotels or massive flash-sale concurrency.

### Handling Flash Sales and Peak Booking

During flash sales (e.g., "50% off all rooms for 1 hour"), thousands of users may try to book simultaneously.

**Queue-Based Booking**:

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│ Clients  │────▶│   Queue   │────▶│  Booking     │────▶│    DB    │
│ (burst)  │     │ (Redis/   │     │  Workers     │     │          │
│          │     │  SQS)     │     │ (serial per  │     │          │
└──────────┘     └───────────┘     │  hotel)      │     └──────────┘
                                   └──────────────┘

1. All booking requests go into a queue
2. Workers process one booking at a time per hotel
3. Serialization eliminates contention entirely
4. Users get an async response: "Your booking is being processed"
5. Notification sent when confirmed or waitlisted
```

This changes the UX from synchronous to asynchronous, which is acceptable during known flash-sale events.

### Other Scaling Strategies

| Strategy | Purpose |
|---|---|
| **CDN** | Serve hotel images, static assets globally. Reduces latency and origin load. |
| **Read replicas** | Offload search and browse queries from primary DB. |
| **Elasticsearch cluster** | Horizontally scale search with more nodes/shards. |
| **Message queue** | Decouple notifications, analytics, audit logging from the booking path. |
| **Rate limiting** | Protect booking API: e.g., max 10 booking attempts per user per minute. |
| **Connection pooling** | Use PgBouncer / ProxySQL to manage DB connections efficiently. |
| **Auto-scaling** | Scale API servers horizontally based on CPU/request count metrics. |

### Multi-Region Deployment

For a global hotel platform:

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   US Region      │    │   EU Region      │    │  APAC Region     │
│ ┌──────────────┐ │    │ ┌──────────────┐ │    │ ┌──────────────┐ │
│ │ API + Cache  │ │    │ │ API + Cache  │ │    │ │ API + Cache  │ │
│ └──────┬───────┘ │    │ └──────┬───────┘ │    │ └──────┬───────┘ │
│        │         │    │        │         │    │        │         │
│ ┌──────▼───────┐ │    │ ┌──────▼───────┐ │    │ ┌──────▼───────┐ │
│ │  DB Primary  │◀├────┤▶│  DB Replica  │◀├────┤▶│  DB Replica  │ │
│ └──────────────┘ │    │ └──────────────┘ │    │ └──────────────┘ │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

Reads are local (low latency). Writes route to the primary region. For booking systems, single-primary is preferred to avoid write conflicts across regions.

---

## 10. Search Functionality

### Two-Phase Search

Hotel search combines **text/attribute search** (finding matching hotels) with **availability search** (checking inventory for dates). These are fundamentally different queries.

```
Phase 1: Hotel Discovery (Elasticsearch)
────────────────────────────────────────
Query: city="New York", amenities=["pool","wifi"], stars >= 4
Result: [hotel_42, hotel_87, hotel_103, hotel_291, ...]

Phase 2: Availability Filter (Database)
────────────────────────────────────────
For each hotel from Phase 1:
  SELECT room_type_id, MIN(total_inventory - total_reserved) AS available
  FROM room_type_inventory
  WHERE hotel_id IN (42, 87, 103, 291)
    AND date BETWEEN '2026-03-01' AND '2026-03-04'
  GROUP BY hotel_id, room_type_id
  HAVING MIN(total_inventory - total_reserved) > 0;

Result: hotels with at least 1 available room type for ALL dates in range
```

### Elasticsearch Index Design

```json
{
  "hotel_id": 42,
  "name": "The Grand Plaza",
  "city": "New York",
  "location": { "lat": 40.7128, "lon": -74.0060 },
  "star_rating": 4,
  "amenities": ["pool", "wifi", "gym", "parking"],
  "price_range": { "min": 150, "max": 500 },
  "guest_rating": 4.5,
  "review_count": 1200,
  "property_type": "hotel"
}
```

Supports queries like:
- **Geo-distance**: hotels within 5 km of a point
- **Full-text**: "boutique hotel downtown Manhattan"
- **Filters**: star rating ≥ 4, amenities include pool, price ≤ $300
- **Sorting**: by price, rating, distance, or relevance

### Data Sync: DB → Elasticsearch

```
┌──────────┐     ┌───────────┐     ┌───────────────┐
│ Hotel DB │────▶│  CDC      │────▶│ Elasticsearch │
│ (source  │     │ (Debezium │     │   (search)    │
│  of truth)│    │  / binlog)│     │               │
└──────────┘     └───────────┘     └───────────────┘
```

Use **Change Data Capture** (CDC) to stream hotel data changes to Elasticsearch in near-real-time. This avoids dual-write consistency issues.

---

## 11. Trade-offs & Interview Tips

### Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Database | Relational (MySQL/PostgreSQL) | ACID transactions for reservations |
| Inventory model | Room-type-level, not individual rooms | Simpler queries, fewer rows, room assigned at check-in |
| Concurrency control | DB constraint (primary) + pessimistic lock (flash sales) | Simple default, robust under high contention |
| Idempotency | Client-generated UUID in header | Prevents duplicate bookings on retry |
| Search | Elasticsearch + DB availability check | Best of both worlds: flexible search + accurate availability |
| Caching | Cache hotel data, not inventory (at baseline scale) | Stale inventory cache risks double-booking |
| Async processing | Message queue for notifications | Decouples non-critical path from booking latency |

### Consistency vs Availability

For a hotel reservation system, we prioritize **consistency over availability** for the booking path:

- **Booking**: CP (consistent + partition-tolerant). Better to reject a booking than create a double-booking. Downtime is preferable to financial errors.
- **Search / Browse**: AP (available + partition-tolerant). Showing slightly stale results is acceptable; users will see accurate availability when they attempt to book.

This is a natural split — use strong consistency where money is involved, eventual consistency where it's just information display.

### Common Follow-Up Questions

| Question | Key Points |
|---|---|
| "How would you handle multi-room bookings?" | Wrap all inventory updates in a single transaction. Lock all required rows (sorted by date to avoid deadlocks). All-or-nothing: if any date is sold out, the entire booking fails. |
| "How would you handle different currencies?" | Store prices in the hotel's local currency. Convert at display time using a rate service. Charge in the guest's preferred currency. |
| "How would you add a waitlist?" | When inventory is zero, allow `status = 'waitlisted'` reservations. When a cancellation occurs, promote the first waitlisted reservation. Notify the guest with a time-limited confirmation window. |
| "How would you support dynamic pricing?" | Rate Service applies rules: day-of-week, seasonality, demand-based (higher price when occupancy > 80%), competitor pricing. Price is locked at booking time and stored in the reservation. |
| "What about GDPR / data retention?" | Anonymize guest PII after checkout + retention period. Retain reservation records (anonymized) for financial/legal compliance. Right-to-deletion: remove PII, keep transaction metadata. |
| "How do you test this system?" | Load testing with simulated concurrent bookings on the same inventory. Chaos engineering: kill services mid-booking. Verify no double-bookings under all failure modes. |

### Quick Reference Cheat Sheet

```
┌────────────────────────────────────────────────────────────────────┐
│                HOTEL RESERVATION SYSTEM CHEAT SHEET                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  CORE CHALLENGE: Prevent double-booking under concurrency          │
│                                                                    │
│  DATA MODEL: room_type_inventory (hotel, type, date, total,        │
│              reserved) — NOT individual room tracking               │
│                                                                    │
│  CONCURRENCY:                                                      │
│    Default  → DB CHECK constraint (reserved ≤ total)               │
│    Flash    → Pessimistic lock (SELECT FOR UPDATE)                  │
│    Low load → Optimistic lock (version column)                     │
│                                                                    │
│  IDEMPOTENCY: Client UUID in header, UNIQUE index in DB            │
│                                                                    │
│  BOOKING FLOW:                                                     │
│    Search → Select → Pre-reserve (10 min) → Pay → Confirm          │
│    Timeout → Cancel → Release inventory                            │
│                                                                    │
│  SEARCH: Elasticsearch (hotels) + DB (availability) = 2 phases     │
│                                                                    │
│  CACHING: Hotel info in Redis (1h TTL), inventory from DB          │
│                                                                    │
│  SCALING: Read replicas, shard by hotel_id if needed               │
│           Queue-based booking for flash sales                      │
│                                                                    │
│  OVERBOOKING: Intentional buffer (10%), walk policy as fallback    │
│                                                                    │
│  CONSISTENCY: Strong (CP) for bookings, eventual (AP) for search   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Interview Walkthrough Strategy

1. **Clarify requirements** (2 min): confirm scale, features, whether to handle overbooking
2. **High-level design** (5 min): draw the architecture, list services, define APIs
3. **Data model** (5 min): show the room_type_inventory table, explain why room-type level
4. **Deep dive: concurrency** (10 min): this is the star of the interview — walk through the double-booking problem, present all three solutions, recommend one
5. **Idempotency** (3 min): show the idempotency key flow
6. **Reservation flow** (3 min): step-by-step happy path and failure handling
7. **Scaling & caching** (5 min): discuss what to cache, how to handle flash sales
8. **Wrap up** (2 min): summarize trade-offs, mention follow-up areas (search, overbooking, multi-region)

Total: ~35 minutes, leaving room for interviewer questions.
