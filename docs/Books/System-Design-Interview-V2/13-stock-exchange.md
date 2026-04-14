# Chapter 13: Stock Exchange

## 1. Problem Statement & Requirements

### What Are We Designing?

A **stock exchange** — the electronic system at the heart of financial markets that matches buyers and sellers of securities. Think NASDAQ, NYSE, the London Stock Exchange, or a cryptocurrency exchange like Coinbase's matching engine. When a trader clicks "Buy 100 shares of AAPL at $150," this is the system that finds a willing seller, executes the trade, and reports it to the world — all within *microseconds*.

This is arguably the **most latency-sensitive system** in all of software engineering. Where a typical web service targets sub-100ms responses, a stock exchange targets **sub-millisecond** or even **sub-microsecond** matching latency. A single microsecond of additional latency can cost a high-frequency trading firm millions per year. The design is radically different from anything in typical web architecture: single-threaded cores, kernel bypass networking, pre-allocated memory, no garbage collection on the critical path.

Interviewers love this problem because it tests whether you can reason about **determinism**, **fairness**, **ultra-low latency**, and **fault tolerance** simultaneously — and whether you know when to break conventional distributed systems wisdom.

### Functional Requirements

1. **Place orders** — submit limit orders (buy/sell at a specific price) and market orders (buy/sell at best available price)
2. **Cancel orders** — withdraw a previously placed order that has not yet been fully filled
3. **Match orders** — automatically match compatible buy and sell orders and execute trades
4. **Order book** — maintain a real-time, sorted view of all outstanding buy and sell orders per symbol
5. **Market data** — publish real-time price quotes, trade ticks, and order book depth
6. **Trade execution** — record trades, update positions, notify both parties
7. **Wallet / portfolio** — track each user's cash balance and security holdings

### Non-Functional Requirements

| Requirement | Target | Why |
|---|---|---|
| **Latency** | < 1ms for order matching (critical path) | HFT firms measure in microseconds; fairness demands speed |
| **Throughput** | Thousands of orders/second per symbol; millions aggregate | Markets spike during volatility events |
| **Availability** | 99.99% during trading hours | Downtime = real financial loss, regulatory scrutiny |
| **Correctness** | Zero tolerance for incorrect matches or lost orders | Financial regulation, enormous liability |
| **Fairness** | Strict FIFO at each price level | SEC / regulatory mandate; prevents front-running |
| **Determinism** | Given same input sequence → identical output | Enables replay, recovery, audit |
| **Auditability** | Every event timestamped and sequenced | Regulatory requirement (SEC, FINRA, MiFID II) |
| **Durability** | No trade or order lost, ever | Financial data is permanent record |

### Scale Estimation (Back-of-Envelope)

```
Symbols traded:              ~100 (for our exchange)
Orders per second per symbol: ~1,000–10,000
Aggregate orders per second:  ~100K–1M
Active users:                 ~1 million
Concurrent connected users:   ~100,000

Per order data:
  Order message:              ~100 bytes
  Daily order volume:         100K × 6.5 hrs × 3600 ≈ 2.3 billion/day
  Daily raw data:             2.3B × 100B ≈ 230 GB/day

Market data messages:
  Updates per second:         ~500K (aggregate across all symbols)
  Subscribers:                ~100,000 retail + ~1,000 institutional

Trade volume:
  Trades per day:             ~500 million
  Trade record:               ~200 bytes
  Daily trade storage:        ~100 GB/day
```

**Key insight**: the real challenge is not scale in the web-system sense (millions of users, petabytes of data) — it is **latency on the critical path**. Every nanosecond matters between order receipt and trade execution. This changes every architectural decision.

---

## 2. Business Concepts

Before diving into architecture, you must understand how financial exchanges work. Interviewers expect you to speak this language fluently.

### Order Types

| Order Type | Description | Example |
|---|---|---|
| **Limit order** | Buy/sell at a *specific price or better* | "Buy 100 AAPL at ≤ $150" — only fills at $150 or lower |
| **Market order** | Buy/sell immediately at *best available price* | "Buy 100 AAPL at whatever the best ask is right now" |
| **Stop order** | Becomes a market order when price reaches trigger | "If AAPL drops to $140, sell at market" |
| **Stop-limit** | Becomes a limit order when price reaches trigger | "If AAPL drops to $140, sell at limit $138" |
| **IOC (Immediate or Cancel)** | Fill whatever you can immediately, cancel the rest | Used by algo traders to avoid leaving resting orders |
| **FOK (Fill or Kill)** | Fill the entire order or cancel it completely | All-or-nothing execution |
| **GTC (Good Till Cancelled)** | Remains on the book until filled or explicitly cancelled | Default for many retail brokers |

### The Order Book

The order book is the central data structure of an exchange. It is a **two-sided sorted list** of all outstanding (resting) orders for a single symbol:

```
═══════════════════════════════════════════════════════════
                    AAPL ORDER BOOK
═══════════════════════════════════════════════════════════

  BID (Buy) Side                ASK (Sell) Side
  Sorted DESCENDING             Sorted ASCENDING
  ─────────────────             ─────────────────
  Price   | Qty  | Orders       Price   | Qty  | Orders
  --------|------|-------       --------|------|-------
  $150.10 |  500 | 3            $150.20 |  200 | 1     ← Best Ask
  $150.05 |  300 | 2            $150.25 |  800 | 4
  $150.00 | 1200 | 8            $150.30 |  400 | 2
  $149.95 |  700 | 5            $150.50 | 1500 | 7
  $149.90 |  100 | 1            $151.00 |  300 | 3
     ↑                              
  Best Bid                      

  Bid-Ask Spread = $150.20 - $150.10 = $0.10
═══════════════════════════════════════════════════════════
```

- **Best bid**: highest price any buyer is willing to pay ($150.10)
- **Best ask**: lowest price any seller is willing to accept ($150.20)
- **Bid-ask spread**: difference between best bid and best ask — a measure of liquidity
- **Depth**: total quantity available at each price level
- **Tight spread** = liquid market; **wide spread** = illiquid market

### Matching: Price-Time Priority

The universal matching rule used by virtually all stock exchanges:

1. **Price priority**: best price gets matched first (highest bid, lowest ask)
2. **Time priority**: at the same price level, the order that arrived first gets filled first (FIFO)

This is why fairness and determinism matter — the exact arrival order determines who gets filled.

### Maker vs Taker

| Role | Description | Fee Model |
|---|---|---|
| **Maker** | Adds liquidity — places a limit order that rests on the book | Often receives a **rebate** (e.g., -$0.002/share) |
| **Taker** | Removes liquidity — places an order that immediately matches | Pays a **fee** (e.g., +$0.003/share) |

A limit buy at $150.00 when the best ask is $150.20 → **maker** (rests on book).
A limit buy at $150.25 when the best ask is $150.20 → **taker** (crosses the spread, matches immediately).
A market buy → always a **taker**.

The maker-taker fee model incentivizes liquidity provision, which tightens spreads and improves market quality.

---

## 3. High-Level Design

### API Design

```
POST   /v1/order                  — place a new order
DELETE /v1/order/{orderId}        — cancel an existing order
GET    /v1/order/{orderId}        — query order status
GET    /v1/orderbook/{symbol}     — get current order book snapshot
GET    /v1/trades/{symbol}        — recent trades
GET    /v1/portfolio              — user's holdings and balances
WS     /v1/marketdata/{symbol}    — real-time market data stream
```

**Place order request**:
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "type": "LIMIT",
  "price": 150.10,
  "quantity": 100,
  "timeInForce": "GTC"
}
```

**Trade execution event**:
```json
{
  "tradeId": "T-98765",
  "symbol": "AAPL",
  "price": 150.10,
  "quantity": 100,
  "buyOrderId": "O-11111",
  "sellOrderId": "O-22222",
  "timestamp": 1698765432123456,
  "sequenceNumber": 890123
}
```

### Component Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │              Stock Exchange                 │
                         │                                             │
  Traders/               │   ┌─────────┐    ┌───────────┐             │
  Brokers ──────────────────→│ Gateway │───→│ Sequencer │             │
                         │   └─────────┘    └─────┬─────┘             │
                         │        │               │                    │
                         │        │          (sequence#)               │
                         │        │               │                    │
                         │        │         ┌─────▼──────┐            │
                         │        │         │  Matching   │            │
                         │        │         │  Engine     │            │
                         │        │         │ (per symbol)│            │
                         │        │         └──────┬─────┘            │
                         │        │                │                   │
                         │        │         ┌──────▼──────┐           │
                         │        │         │  Outbound   │           │
                         │        │         │  Sequencer  │           │
                         │        │         └──────┬──────┘           │
                         │        │                │                   │
                         │   ┌────▼────┐    ┌──────▼──────┐           │
                         │   │ Order   │    │ Market Data │           │
                         │   │ Manager │    │ Publisher   │           │
                         │   └────┬────┘    └──────┬──────┘           │
                         │        │                │                   │
                         │   ┌────▼────┐    ┌──────▼──────┐           │
                         │   │Reporter │    │  Clients    │           │
                         │   │(Audit)  │    │ (WebSocket) │           │
                         │   └─────────┘    └─────────────┘           │
                         └─────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role | Critical Path? |
|---|---|---|
| **Gateway** | Auth, rate limiting, validation, routing | Yes |
| **Inbound Sequencer** | Assigns monotonic sequence numbers to incoming orders | Yes |
| **Matching Engine** | Matches buy/sell orders, executes trades | Yes (the core) |
| **Outbound Sequencer** | Sequences outgoing events (fills, cancels) | Yes |
| **Order Manager** | Tracks order lifecycle, persists state | No (off critical path) |
| **Market Data Publisher** | Broadcasts price/book updates | No |
| **Reporter** | Trade confirmations, regulatory reports, audit trail | No |
| **Risk Manager** | Pre-trade and post-trade risk checks | Partially (pre-trade is on path) |

### Critical Path vs Off-Critical Path

This distinction is **the single most important architectural decision** in exchange design:

```
═══════════════════════════════════════════════════════════
  CRITICAL PATH (< 1ms total, every nanosecond counts)
═══════════════════════════════════════════════════════════
  
  Order In → Gateway → Sequencer → Matching Engine → 
  → Outbound Sequencer → Execution Report Out
  
  Rules:
  • Single-threaded
  • No disk I/O
  • No network calls (except ingress/egress)
  • No locks or synchronization
  • No memory allocation (pre-allocated)
  • No garbage collection
  
═══════════════════════════════════════════════════════════
  OFF CRITICAL PATH (can be async, ms–seconds latency OK)
═══════════════════════════════════════════════════════════
  
  • Order persistence to database
  • Market data fan-out to retail clients
  • Trade reporting to regulators
  • Risk management (post-trade)
  • Portfolio/wallet updates
  • Logging, metrics, alerting
  
  Rules:
  • Can use normal async patterns
  • Can use databases, message queues
  • Can be horizontally scaled
═══════════════════════════════════════════════════════════
```

---

## 4. Sequencer — Deep Dive

### Why a Sequencer?

In a stock exchange, **order matters — literally**. Two traders submit orders at nearly the same nanosecond. Who gets filled first? The answer must be deterministic, fair, and reproducible. The sequencer solves this by assigning every incoming event a **globally unique, monotonically increasing sequence number** before it reaches the matching engine.

```
  Order A (from Trader 1) ──┐
                             ├──→ Sequencer ──→ [seq=1001] Order A
  Order B (from Trader 2) ──┘                   [seq=1002] Order B
                                                
  Now we know: A arrived before B. Period.
  The matching engine processes 1001 before 1002.
```

### Benefits of Sequencing

1. **Determinism**: given the same sequence of events, the matching engine produces the exact same output — always. This is critical for recovery.
2. **Fairness**: FIFO ordering is provable via sequence numbers.
3. **Recovery**: if the matching engine crashes, replay sequenced events from the log → arrive at the same state.
4. **Audit**: regulators can inspect the exact order of events.
5. **Debugging**: reproduce any production issue by replaying the event sequence.

### Inbound vs Outbound Sequencer

```
                    Inbound                    Outbound
                    Sequencer                  Sequencer
                    ─────────                  ─────────
  Orders In ──────→ Assign seq# ──→ Matching ──→ Assign seq# ──→ Events Out
                    to orders       Engine       to executions,   (fills,
                                                 cancels,         market data)
                                                 book updates
```

- **Inbound sequencer**: sequences all incoming messages (new orders, cancel requests)
- **Outbound sequencer**: sequences all outgoing messages (fills, cancels, market data updates)
- Both produce a complete, ordered log of everything that happened

### Implementation: Single-Writer Pattern

The simplest and fastest approach — a single thread that:

1. Reads from a network buffer
2. Assigns next sequence number (just an incrementing `long`)
3. Writes the sequenced event to a ring buffer
4. Persists to an append-only log (memory-mapped file for speed)

```
class Sequencer:
    sequence_number = 0
    log: MemoryMappedFile

    def on_order(order):
        sequence_number += 1
        order.sequence = sequence_number
        order.timestamp = high_res_clock()
        
        log.append(order)            # persist (mmap, not fsync on every write)
        ring_buffer.publish(order)   # send to matching engine
```

For **high availability**, the sequencer log is replicated to a standby node. If the primary fails, the standby can take over from the last sequenced event. Some exchanges use Raft-based consensus for the sequencer, but this adds latency (~1–5ms per consensus round) — a trade-off between availability and speed.

### Sequencer Log as Source of Truth

The sequenced event log is the **immutable source of truth** for the entire exchange. Every other piece of state (order book, positions, trade records) can be reconstructed by replaying this log from the beginning. This is essentially **event sourcing** applied to financial markets.

```
┌────────────────────────────────────────────────────────┐
│                   Sequencer Log                        │
│                                                        │
│  [seq=1] NEW_ORDER  BUY  AAPL 100 @ $150.00  t=...   │
│  [seq=2] NEW_ORDER  SELL AAPL  50 @ $149.95  t=...   │
│  [seq=3] TRADE      AAPL  50 @ $149.95       t=...   │
│  [seq=4] NEW_ORDER  SELL AAPL  80 @ $150.00  t=...   │
│  [seq=5] CANCEL     order_id=O-1234          t=...   │
│  [seq=6] NEW_ORDER  BUY  GOOG  20 @ $2800    t=...   │
│  ...                                                   │
│                                                        │
│  Replay from seq=1 → reconstruct entire exchange state │
└────────────────────────────────────────────────────────┘
```

---

## 5. Matching Engine — The Heart of the Exchange

The matching engine is the most performance-critical component in the entire system. It takes sequenced orders, maintains the order book, and produces trades. Everything else in the exchange exists to serve this component.

### Order Book Data Structure

Each symbol has its own order book with two sides:

```
                        AAPL Order Book
                        
  BID (Buy) Side                    ASK (Sell) Side
  ┌──────────────────┐              ┌──────────────────┐
  │ Price Level Map   │              │ Price Level Map   │
  │ (Red-Black Tree   │              │ (Red-Black Tree   │
  │  or Sorted Map)   │              │  or Sorted Map)   │
  │                   │              │                   │
  │ $150.10 ──→ Queue │              │ $150.20 ──→ Queue │
  │ $150.05 ──→ Queue │              │ $150.25 ──→ Queue │
  │ $150.00 ──→ Queue │              │ $150.30 ──→ Queue │
  │   ...             │              │   ...             │
  │                   │              │                   │
  │ Sorted DESC       │              │ Sorted ASC        │
  │ (highest first)   │              │ (lowest first)    │
  └──────────────────┘              └──────────────────┘
  
  Each Queue (price level):
  ┌─────────────────────────────────────────┐
  │  Order₁ ←→ Order₂ ←→ Order₃ ←→ ...    │
  │  (FIFO doubly-linked list)              │
  │  Total qty at this level: sum of all    │
  └─────────────────────────────────────────┘
```

**Why a Red-Black Tree (or Skip List)?**
- O(log n) insertion and deletion of price levels
- O(1) access to best bid (max) and best ask (min)
- In practice, most exchanges use custom sorted structures or arrays optimized for the specific tick-size granularity

**Why a Doubly-Linked List at each price level?**
- O(1) append (new order at tail)
- O(1) removal (cancel order by pointer)
- O(1) pop from head (match the oldest order)
- Maintains FIFO ordering for time priority

### Data Structures in Code

```
class Order:
    order_id:    int
    symbol:      str
    side:        BUY | SELL
    price:       Decimal
    quantity:    int
    remaining:   int
    timestamp:   long
    sequence:    long
    status:      NEW | PARTIAL | FILLED | CANCELLED
    prev:        Order    # doubly-linked list pointers
    next:        Order

class PriceLevel:
    price:       Decimal
    total_qty:   int      # sum of all order quantities at this level
    order_count: int
    head:        Order    # first (oldest) order
    tail:        Order    # last (newest) order

class OrderBook:
    symbol:      str
    bids:        TreeMap<Decimal, PriceLevel>   # sorted descending
    asks:        TreeMap<Decimal, PriceLevel>   # sorted ascending
    orders:      HashMap<int, Order>            # order_id → Order (for O(1) cancel)
    best_bid:    PriceLevel                     # cached
    best_ask:    PriceLevel                     # cached
```

### Matching Algorithm — Limit Order

```
function match_limit_order(order_book, incoming_order):
    
    if incoming_order.side == BUY:
        opposite_side = order_book.asks
        
        while incoming_order.remaining > 0 
              AND opposite_side is not empty
              AND opposite_side.best_price() <= incoming_order.price:
            
            best_ask_level = opposite_side.best()
            
            while incoming_order.remaining > 0 
                  AND best_ask_level is not empty:
                
                resting_order = best_ask_level.head   # oldest order (FIFO)
                
                trade_qty = min(incoming_order.remaining, resting_order.remaining)
                trade_price = resting_order.price      # execute at resting order's price
                
                # Execute trade
                emit TRADE(
                    buy_order  = incoming_order,
                    sell_order = resting_order,
                    price      = trade_price,
                    quantity   = trade_qty
                )
                
                incoming_order.remaining -= trade_qty
                resting_order.remaining  -= trade_qty
                
                if resting_order.remaining == 0:
                    best_ask_level.remove_head()
                    resting_order.status = FILLED
            
            if best_ask_level is empty:
                opposite_side.remove(best_ask_level.price)
        
        # If any quantity remains, add to the bid side
        if incoming_order.remaining > 0:
            order_book.bids.add(incoming_order)
            incoming_order.status = PARTIAL if filled_some else NEW
    
    elif incoming_order.side == SELL:
        # Mirror logic: check bids, match against highest bid first
        ...
```

### Matching Algorithm — Market Order

```
function match_market_order(order_book, incoming_order):
    
    if incoming_order.side == BUY:
        opposite_side = order_book.asks
    else:
        opposite_side = order_book.bids
    
    while incoming_order.remaining > 0 AND opposite_side is not empty:
        best_level = opposite_side.best()
        
        while incoming_order.remaining > 0 AND best_level is not empty:
            resting = best_level.head
            trade_qty = min(incoming_order.remaining, resting.remaining)
            
            emit TRADE(incoming_order, resting, resting.price, trade_qty)
            
            incoming_order.remaining -= trade_qty
            resting.remaining -= trade_qty
            
            if resting.remaining == 0:
                best_level.remove_head()
        
        if best_level is empty:
            opposite_side.remove(best_level.price)
    
    if incoming_order.remaining > 0:
        # Market order with no liquidity — cancel remaining
        incoming_order.status = CANCELLED
        emit CANCEL(incoming_order, reason="NO_LIQUIDITY")
```

### Cancel Order

```
function cancel_order(order_book, order_id):
    order = order_book.orders.get(order_id)
    if order is None or order.status in [FILLED, CANCELLED]:
        emit CANCEL_REJECTED(order_id, reason="NOT_FOUND_OR_DONE")
        return
    
    price_level = order_book.get_level(order.side, order.price)
    price_level.remove(order)          # O(1) with doubly-linked list
    price_level.total_qty -= order.remaining
    
    if price_level is empty:
        order_book.remove_level(order.side, order.price)
    
    order.status = CANCELLED
    emit ORDER_CANCELLED(order)
```

### Matching Example Walkthrough

Starting order book:

```
  BIDS                    ASKS
  $150.00 x 200 (O1)     $150.50 x 100 (O3)
  $149.50 x 300 (O2)     $151.00 x 200 (O4)
```

**Event**: New LIMIT BUY 250 shares @ $150.75 (O5) arrives.

Step 1: Check asks. Best ask = $150.50 ≤ $150.75? Yes → match.
- Trade: O5 buys 100 from O3 at $150.50. O3 fully filled. O5 has 150 remaining.

Step 2: Next ask = $151.00 ≤ $150.75? No → stop matching.

Step 3: O5 has 150 remaining. Add to bid side at $150.75.

Resulting order book:

```
  BIDS                    ASKS
  $150.75 x 150 (O5)     $151.00 x 200 (O4)
  $150.00 x 200 (O1)
  $149.50 x 300 (O2)
```

Events emitted:
- `TRADE(buy=O5, sell=O3, price=$150.50, qty=100)`
- `ORDER_FILLED(O3)`
- `ORDER_PARTIAL(O5, remaining=150)`
- `BOOK_UPDATE(AAPL, ...)`

### Time Complexity

| Operation | Complexity | Notes |
|---|---|---|
| Match at best price | O(1) | Head of the FIFO queue at best level |
| Walk to next price level | O(log n) | Tree traversal (n = number of price levels) |
| Insert order at existing level | O(1) | Append to tail of doubly-linked list |
| Insert order at new level | O(log n) | Tree insertion |
| Cancel order | O(1) | Direct pointer via HashMap + doubly-linked list removal |
| Full book traversal | O(k) | k = number of price levels consumed |

### Why Single-Threaded?

The matching engine for each symbol runs on a **single thread**. This is counterintuitive for engineers used to scaling with concurrency, but it is the right choice:

1. **No locks**: zero synchronization overhead. A lock acquisition + release costs ~25ns. Over millions of orders, this adds up.
2. **No context switches**: the OS never preempts the matching thread.
3. **Deterministic**: single-threaded execution is inherently deterministic — same inputs always produce same outputs.
4. **Cache-friendly**: one thread means one set of hot cache lines.
5. **Sufficient throughput**: a single core can process 1–10 million orders/second for one symbol. No single symbol needs more.

**Cross-symbol parallelism**: since order books are independent per symbol, different symbols run on different cores. 100 symbols × 1 core each = 100 cores. This is embarrassingly parallel.

---

## 6. Low-Latency Design Principles

This section covers the techniques that separate exchange architecture from typical web systems. These are the things that impress interviewers.

### Critical Path Optimization Techniques

```
═══════════════════════════════════════════════════════════
             LATENCY BUDGET (Target: < 500 μs)
═══════════════════════════════════════════════════════════

  Component              Typical Latency    Optimized
  ─────────────────────  ─────────────────  ──────────
  Network receive        10–50 μs           1–5 μs (kernel bypass)
  Gateway validation     5–20 μs            1–3 μs (pre-compiled)
  Sequencing             1–5 μs             < 1 μs
  Matching               1–10 μs            < 1 μs
  Network send           10–50 μs           1–5 μs (kernel bypass)
  ─────────────────────  ─────────────────  ──────────
  TOTAL                  27–135 μs          4–15 μs
  
═══════════════════════════════════════════════════════════
```

### Technique 1: Kernel Bypass Networking

Normal networking: Application → System Call → Kernel Network Stack → NIC
Kernel bypass: Application → NIC directly (via DPDK, Solarflare OpenOnload, or Mellanox VMA)

- Eliminates system call overhead (~1–5 μs per call)
- Eliminates kernel network stack processing (~5–20 μs)
- Application polls the NIC directly (busy polling)
- Reduces network latency from ~50 μs to ~1–5 μs

### Technique 2: Memory Pre-Allocation & Object Pooling

```
# BAD: allocate on every order (triggers GC)
def on_order(msg):
    order = Order()            # heap allocation
    trade = Trade()            # heap allocation
    ...

# GOOD: pre-allocate, reuse from pool
class OrderPool:
    pool = [Order() for _ in range(1_000_000)]  # pre-allocate at startup
    cursor = 0
    
    def acquire():
        obj = pool[cursor]
        obj.reset()
        cursor = (cursor + 1) % len(pool)
        return obj

def on_order(msg):
    order = order_pool.acquire()    # no allocation, no GC
    ...
```

### Technique 3: CPU Pinning & NUMA Awareness

```
# Pin the matching engine thread to a specific CPU core
taskset -c 3 ./matching_engine --symbol AAPL

# Disable hyper-threading on that core
echo 0 > /sys/devices/system/cpu/cpu7/online   # HT sibling of core 3

# Allocate memory on the same NUMA node as the pinned core
numactl --cpunodebind=0 --membind=0 ./matching_engine
```

- Prevents the OS from migrating the thread to another core (cache thrashing)
- Ensures memory accesses are local (NUMA-local vs cross-socket: 70ns vs 130ns)
- Disabling hyper-threading prevents the sibling thread from polluting L1/L2 cache

### Technique 4: Memory-Mapped Files for Logging

```
# Instead of:
file.write(event_bytes)      # system call, potential disk I/O
file.flush()                  # another system call

# Use:
mmap_region[offset:offset+len] = event_bytes   # just a memory write
offset += len
# OS flushes to disk asynchronously via page cache
```

- Write to a memory-mapped file = write to RAM (< 100ns)
- OS handles flushing to disk in the background
- No system calls on the critical path
- Durability: fsync periodically from a background thread

### Technique 5: Avoid Branching & Virtual Dispatch

```
# BAD: virtual method dispatch (cache miss on vtable lookup)
class Order:
    def match(self, other): ...

class LimitOrder(Order):
    def match(self, other): ...   # virtual dispatch ~5-10ns

# GOOD: flat structure with type flag
struct Order:
    type: u8     # 0 = LIMIT, 1 = MARKET
    ...

# Inline the logic, avoid vtable
if order.type == LIMIT:
    match_limit(order, book)
else:
    match_market(order, book)
```

### Technique 6: Warm Up the JIT (for JVM-based Exchanges)

Many exchanges run on the JVM (Java/Kotlin). The JIT compiler optimizes hot code paths, but the first few thousand executions run in interpreted mode.

- Send synthetic orders through the matching engine before market open
- Force JIT compilation of critical methods
- Pre-touch memory pages to avoid page faults during trading

### Summary of Latency Sources and Mitigations

| Latency Source | Cost | Mitigation |
|---|---|---|
| System calls | 1–5 μs each | Kernel bypass, mmap |
| Memory allocation | 0.1–1 μs | Object pooling, pre-allocation |
| Lock acquisition | 25–100 ns | Single-threaded design |
| Context switch | 1–10 μs | CPU pinning, isolcpus |
| Cache miss (L3) | 30–40 ns | Sequential access, cache-line alignment |
| NUMA cross-socket | 60–100 ns penalty | NUMA-aware allocation |
| GC pause | 1–100 ms | No allocation on critical path |
| Branch misprediction | 5–20 ns | Branchless code, likely/unlikely hints |
| Network (kernel) | 10–50 μs | DPDK / OpenOnload |

---

## 7. Ring Buffer (LMAX Disruptor Pattern)

The **LMAX Disruptor** is a high-performance inter-thread messaging pattern invented by LMAX Exchange (a London-based FX exchange). It is the standard pattern for communication between components on the critical path.

### Why Not a Message Queue?

| Message Queue (e.g., Kafka) | Ring Buffer (Disruptor) |
|---|---|
| Network hop: 0.5–5 ms | In-process: < 100 ns |
| Serialization/deserialization | Direct memory access |
| Dynamic allocation | Pre-allocated slots |
| Complex acknowledgment | Simple cursor advancement |
| Designed for durability | Designed for speed |

For the critical path, message queues are **3–4 orders of magnitude too slow**.

### How the Ring Buffer Works

```
  Ring Buffer (size = 8, power of 2 for bitwise modulo)
  
  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
  │  0  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │
  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
     ▲                 ▲                    ▲
     │                 │                    │
  Consumer A        Consumer B          Producer
  cursor = 0        cursor = 3          cursor = 6
  
  • Producer writes to slot (cursor % size)
  • Each consumer has its own cursor — reads independently
  • No locks: producer only writes, consumers only read
  • Slots are pre-allocated — no GC pressure
  • Size is power of 2: index = sequence & (size - 1)  [bitwise AND]
```

### Key Properties

1. **Pre-allocated**: all `N` slots are allocated at startup. Each slot holds one event struct.
2. **Single producer**: only one thread writes (the sequencer). This eliminates write contention.
3. **Multiple consumers**: each consumer (matching engine, logger, market data) reads independently with its own cursor. Consumers never block the producer.
4. **Cache-line padding**: each slot is padded to 64 bytes (one cache line) to prevent **false sharing** — where two adjacent slots fall on the same cache line and cause cache invalidation when one is written.
5. **Sequential memory access**: the ring buffer is laid out sequentially in memory. Iterating through it is extremely cache-friendly (hardware prefetcher thrives on sequential patterns).
6. **Busy-spin wait strategy**: consumers spin-wait on the producer's cursor instead of blocking (no OS scheduler involvement).

### Ring Buffer Between Components

```
  ┌──────────┐     Ring Buffer 1     ┌──────────────┐
  │ Inbound  │ ──────────────────→   │  Matching     │
  │ Sequencer│  (sequenced orders)   │  Engine       │
  └──────────┘                       └──────┬───────┘
                                            │
                                     Ring Buffer 2
                                     (executions, book updates)
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                        ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │ Outbound │  │ Market   │  │  Order   │
                        │ Sequencer│  │ Data Pub │  │ Manager  │
                        └──────────┘  └──────────┘  └──────────┘
                        
  Each consumer on Ring Buffer 2 has its own cursor.
  Matching Engine never waits for any consumer.
```

### Pseudocode

```
class RingBuffer<T>:
    SIZE = 1024 * 1024          # 1M slots, must be power of 2
    MASK = SIZE - 1
    buffer: T[SIZE]             # pre-allocated array
    producer_cursor: long = -1  # volatile / atomic
    
    def publish(event: T):
        next_seq = producer_cursor + 1
        slot = next_seq & MASK
        buffer[slot].copy_from(event)     # write to pre-allocated slot
        producer_cursor = next_seq        # make visible to consumers (memory barrier)
    
class Consumer:
    consumer_cursor: long = -1
    ring: RingBuffer
    
    def run():
        while True:
            while consumer_cursor >= ring.producer_cursor:
                spin()                     # busy-wait (no syscall)
            
            consumer_cursor += 1
            event = ring.buffer[consumer_cursor & ring.MASK]
            process(event)                 # handle the event
```

---

## 8. Market Data Distribution

Market data is the real-time feed of price quotes, trades, and order book state that the exchange broadcasts to all participants.

### Market Data Levels

| Level | Content | Audience | Update Rate |
|---|---|---|---|
| **Level 1** | Best bid, best ask, last trade price, volume | Retail traders, websites | Every trade / quote change |
| **Level 2** | Top N price levels with aggregate quantities | Active traders, algorithms | Every book change |
| **Level 3** | Full order-by-order book (every individual order) | Market makers, HFT firms | Every order event |

### Level 2 Market Data Example

```json
{
  "symbol": "AAPL",
  "timestamp": 1698765432123456,
  "sequence": 890124,
  "bids": [
    {"price": 150.10, "qty": 500, "orders": 3},
    {"price": 150.05, "qty": 300, "orders": 2},
    {"price": 150.00, "qty": 1200, "orders": 8},
    {"price": 149.95, "qty": 700, "orders": 5},
    {"price": 149.90, "qty": 100, "orders": 1}
  ],
  "asks": [
    {"price": 150.20, "qty": 200, "orders": 1},
    {"price": 150.25, "qty": 800, "orders": 4},
    {"price": 150.30, "qty": 400, "orders": 2},
    {"price": 150.50, "qty": 1500, "orders": 7},
    {"price": 151.00, "qty": 300, "orders": 3}
  ]
}
```

### Distribution Architecture

```
                                ┌─────────────────────┐
                                │    Matching Engine   │
                                └──────────┬──────────┘
                                           │
                                    (ring buffer)
                                           │
                                ┌──────────▼──────────┐
                                │  Market Data        │
                                │  Publisher           │
                                └──────────┬──────────┘
                                           │
                         ┌─────────────────┼─────────────────┐
                         │                 │                 │
                  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
                  │  Multicast  │  │  WebSocket   │  │  REST API   │
                  │  UDP Feed   │  │  Server Farm │  │  (polling)  │
                  └──────┬──────┘  └───────┬──────┘  └──────┬──────┘
                         │                 │                 │
                  Colocation          Retail            Mobile
                  clients             clients           apps
                  (< 10 μs)          (< 50 ms)         (< 500 ms)
```

### Incremental Updates vs Full Snapshots

Sending the full order book on every change would be wasteful. Instead:

- **Incremental updates (deltas)**: only send what changed

```json
{"type": "delta", "symbol": "AAPL", "seq": 890125,
 "side": "BID", "price": 150.10, "qty": 600, "action": "UPDATE"}
```

- **Full snapshots**: sent periodically (every N seconds) or on client connect, so clients can sync

```
  Client connects:
  1. Receive full snapshot (seq=890100)
  2. Buffer incoming deltas
  3. Apply deltas with seq > 890100
  4. Now in sync — process deltas in real time
  
  If client detects gap (missed seq):
  1. Request full snapshot
  2. Re-sync from snapshot
```

### Multicast UDP for Ultra-Low Latency

- Colocation clients (HFT firms with servers in the exchange's data center) receive market data via **UDP multicast**
- One packet reaches all subscribers simultaneously — no per-client overhead
- Unreliable delivery (UDP) is acceptable because sequence numbers let clients detect gaps and request retransmission
- Latency: single-digit microseconds from matching engine to colocated client

---

## 9. Fault Tolerance & Recovery

An exchange cannot lose orders or trades. Downtime during trading hours causes real financial harm. The recovery strategy is built on **deterministic replay**.

### Primary-Backup Architecture

```
                    ┌──────────────────────┐
  Orders ──────────→│  Primary Matching    │──────→ Trades
                    │  Engine              │
                    └──────────┬───────────┘
                               │
                      (replicate sequenced
                       event log)
                               │
                    ┌──────────▼───────────┐
                    │  Backup Matching     │  (hot standby)
                    │  Engine              │
                    │  (processes same     │
                    │   events, builds     │
                    │   same state)        │
                    └──────────────────────┘
```

### How Deterministic Replay Enables Recovery

Because the sequencer assigns a sequence number to every event, and because the matching engine is single-threaded and deterministic:

1. The backup matching engine processes the exact same sequenced events
2. It builds the exact same order book state
3. If the primary fails, the backup already has the correct state
4. Failover = redirect incoming orders to the backup. **No state rebuild needed.**

```
  Timeline:
  
  Primary:   [seq=1] [seq=2] [seq=3] [seq=4] [seq=5] ← CRASH
  Backup:    [seq=1] [seq=2] [seq=3] [seq=4] [seq=5] ← TAKE OVER
  
  Backup has identical state. Switch is instant.
```

### Recovery Scenarios

| Scenario | Recovery Strategy | RTO |
|---|---|---|
| Matching engine crash | Hot backup takes over | < 1 second |
| Sequencer crash | Backup sequencer resumes from last persisted seq | < 5 seconds |
| Gateway crash | Load balancer routes to healthy gateways | Instant (stateless) |
| Full datacenter failure | DR site with replicated event log; replay from last snapshot + events | Minutes |
| Data corruption | Replay entire event log from beginning to reconstruct state | Minutes to hours |

### Split-Brain Prevention

If both the primary and backup matching engines think they are the leader, orders could be matched twice (catastrophic). Prevention:

- **Fencing tokens**: each leader epoch has a monotonically increasing token. Gateways only send orders to the leader with the highest token. Messages from a stale leader are rejected.
- **Lease-based leadership**: primary holds a time-limited lease. If it doesn't renew, backup can take over.
- **Sequencer as arbiter**: only the sequencer decides which matching engine receives events.

### Snapshot + Replay for Faster Recovery

Full replay from `seq=0` can take hours for a long-running exchange. Optimization:

```
  Periodic snapshots:
  
  [seq=0 ... seq=1M]  → Snapshot S1 at seq=1M
  [seq=1M+1 ... seq=2M] → Snapshot S2 at seq=2M
  
  Recovery:
  1. Load latest snapshot S2 (state at seq=2M)
  2. Replay events from seq=2M+1 to current
  3. Much faster than replaying from seq=0
```

---

## 10. Risk Management

Risk management prevents catastrophic losses from erroneous orders, bugs, or market manipulation. Some checks are on the critical path (pre-trade), others happen asynchronously (post-trade).

### Pre-Trade Risk Checks (On Critical Path)

These must be **extremely fast** (< 1 μs) because they sit between the gateway and the matching engine:

| Check | Description | Example |
|---|---|---|
| **Order size limit** | Reject orders above max quantity | Max 10,000 shares per order |
| **Price collar** | Reject orders too far from market price | Reject buy > 10% above last trade |
| **Fat-finger check** | Reject obviously erroneous orders | Buy 1M shares when daily volume is 100K |
| **Position limit** | Reject if order would exceed max position | Max $10M notional per trader |
| **Rate limit** | Throttle excessive order submission | Max 1,000 orders/second per client |
| **Self-trade prevention** | Prevent a firm from trading with itself | Required by most regulators |

### Post-Trade Risk Checks (Off Critical Path)

| Check | Description |
|---|---|
| **Real-time P&L** | Continuous profit/loss calculation per trader |
| **Margin monitoring** | Ensure sufficient collateral for leveraged positions |
| **Exposure limits** | Total exposure across all positions |
| **Concentration risk** | Too much exposure to one symbol/sector |

### Circuit Breakers

When prices move too fast, circuit breakers halt trading to prevent cascading crashes (like the 2010 Flash Crash):

```
  AAPL price at 10:00 AM: $150.00
  
  Level 1 (7% drop):   Price hits $139.50
                        → Trading halted for 15 minutes
  
  Level 2 (13% drop):  Price hits $130.50
                        → Trading halted for 15 minutes
  
  Level 3 (20% drop):  Price hits $120.00
                        → Trading halted for the rest of the day
  
  (Based on NYSE/NASDAQ Limit Up-Limit Down rules)
```

### Risk Check Architecture

```
  ┌──────────┐   ┌──────────────────────┐   ┌──────────────┐
  │ Gateway  │──→│ Pre-Trade Risk Check │──→│  Sequencer   │
  └──────────┘   │ (< 1 μs, in-memory) │   └──────┬───────┘
                 └──────────────────────┘          │
                                                   ▼
                                            ┌──────────────┐
                                            │  Matching    │
                                            │  Engine      │
                                            └──────┬───────┘
                                                   │
                                            ┌──────▼───────┐
                                            │  Post-Trade  │
                                            │  Risk Check  │
                                            │  (async)     │
                                            └──────────────┘
```

---

## 11. Wallet / Portfolio Service

The wallet service tracks what each user **owns** (securities) and how much **cash** they have available.

### Position Tracking

```
  User: Alice
  ┌─────────────────────────────────────────────────┐
  │  Cash Balance:     $50,000.00                   │
  │                                                  │
  │  Holdings:                                       │
  │  ┌─────────┬─────┬───────────┬────────────────┐ │
  │  │ Symbol  │ Qty │ Avg Price │ Market Value   │ │
  │  │ AAPL    │ 200 │ $148.50   │ $30,020.00     │ │
  │  │ GOOG    │  50 │ $2,750.00 │ $140,000.00    │ │
  │  │ MSFT    │ 100 │ $380.00   │ $38,500.00     │ │
  │  └─────────┴─────┴───────────┴────────────────┘ │
  │                                                  │
  │  Buying Power:     $50,000.00                   │
  │  (cash - pending buy orders)                     │
  └─────────────────────────────────────────────────┘
```

### Settlement: T+2

When a trade executes, ownership doesn't transfer instantly. In US equity markets, settlement occurs **T+2** (trade date + 2 business days):

```
  Trade executes:        Monday (T)
  Settlement occurs:     Wednesday (T+2)
  
  During T to T+2:
  • Buyer has "pending" position (can sell immediately, but actual
    shares not yet delivered)
  • Seller still technically owns shares (but can't sell them again)
  • Clearing house (DTCC) manages the process
```

The wallet service must track both:
- **Traded position**: reflects all executed trades immediately
- **Settled position**: reflects only settled trades

### Buying Power Calculation

```
buying_power = cash_balance 
             - sum(pending_buy_orders × price)
             + margin_credit (if applicable)
```

An order is rejected if it would exceed buying power. This check happens at the gateway (pre-trade risk check).

### Architecture

```
                   ┌──────────────┐
  Trade events ──→ │  Portfolio   │ ──→ Position DB
  (from matching)  │  Service     │ ──→ Balance DB
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Settlement  │ ──→ Clearing House
                   │  Service     │     (DTCC, CCP)
                   └──────────────┘
```

The portfolio service is **off the critical path** — it consumes trade events asynchronously and updates positions/balances in a database.

---

## 12. Regulatory & Compliance

Stock exchanges are among the most heavily regulated systems in the world. This section covers what regulators require and how the architecture supports it.

### Order Audit Trail

Every event must be recorded with:
- **Timestamp**: nanosecond precision (PTP-synchronized clocks)
- **Sequence number**: from the sequencer
- **Full event details**: order parameters, modifications, fills, cancels

Regulators (SEC, FINRA in US; FCA in UK; MiFID II in EU) can request the complete audit trail for any time period.

```
  Consolidated Audit Trail (CAT) — SEC requirement:
  
  Event                  Timestamp (ns)        Seq#    Details
  ──────────────────────────────────────────────────────────────
  ORDER_NEW              1698765432.123456789   1001    BUY AAPL 100@$150.00
  ORDER_ACKNOWLEDGED     1698765432.123457102   1001    Ack by matching engine
  ORDER_PARTIAL_FILL     1698765432.123458300   1001    Filled 50@$150.00
  ORDER_FILLED           1698765432.123459100   1001    Filled remaining 50@$150.00
  TRADE_REPORT           1698765432.123459500   1001    Trade T-98765 reported
```

### Time Synchronization

Regulatory requirements demand accurate timestamps. The synchronization hierarchy:

```
  GPS / Atomic Clock
        │
        ▼
  PTP Grandmaster Clock (in datacenter)
        │
        ▼ (PTP — Precision Time Protocol, < 1 μs accuracy)
  Exchange Servers
        │
        ▼
  Timestamps on all events
```

- **NTP** (Network Time Protocol): ~1–10 ms accuracy — **not sufficient** for exchanges
- **PTP** (Precision Time Protocol / IEEE 1588): < 1 μs accuracy — required
- MiFID II (EU regulation) requires timestamps accurate to **100 microseconds** for most participants, **1 microsecond** for HFT

### Market Surveillance

The exchange must detect and prevent market manipulation:

| Manipulation Type | Description | Detection Method |
|---|---|---|
| **Spoofing** | Placing large orders with intent to cancel before execution | Monitor cancel-to-fill ratio, order-to-trade ratio |
| **Layering** | Placing multiple orders at different prices to create false depth | Pattern detection across price levels |
| **Wash trading** | Trading with yourself to inflate volume | Match buyer/seller identity |
| **Front-running** | Trading ahead of a known large order | Correlate broker orders with proprietary trades |
| **Quote stuffing** | Flooding exchange with orders to slow competitors | Rate limiting, anomaly detection |

Surveillance systems run **off the critical path**, analyzing the sequenced event log with complex event processing (CEP) engines and ML models.

---

## 13. Scaling

### Partition by Symbol

The primary scaling strategy: **each symbol gets its own matching engine on its own CPU core**.

```
  ┌─────────────┐
  │  Gateway    │
  │  (stateless,│
  │  N replicas)│
  └──────┬──────┘
         │ route by symbol
         │
  ┌──────┼────────────────────────────────┐
  │      │                                │
  │  ┌───▼────┐  ┌────────┐  ┌────────┐  │
  │  │ AAPL   │  │ GOOG   │  │ MSFT   │  │
  │  │ Engine │  │ Engine │  │ Engine │  │
  │  │ Core 0 │  │ Core 1 │  │ Core 2 │  │
  │  └────────┘  └────────┘  └────────┘  │
  │                                       │
  │  ┌────────┐  ┌────────┐  ┌────────┐  │
  │  │ AMZN   │  │ TSLA   │  │ META   │  │
  │  │ Engine │  │ Engine │  │ Engine │  │
  │  │ Core 3 │  │ Core 4 │  │ Core 5 │  │
  │  └────────┘  └────────┘  └────────┘  │
  │                                       │
  │     ... (one engine per symbol) ...   │
  └───────────────────────────────────────┘
```

- Each matching engine is single-threaded and independent
- No cross-symbol coordination needed for matching
- A 64-core server can handle 64 symbols
- 100 symbols ÷ 64 cores = 2 physical servers

### Gateway: Horizontally Scalable

Gateways are stateless — they validate orders, authenticate clients, and route to the correct matching engine. Scale by adding more gateway instances behind a load balancer.

```
  Clients ──→ L4 Load Balancer ──→ Gateway 1
                                    Gateway 2
                                    Gateway 3
                                    ...
```

### Market Data Fan-Out

Market data must reach thousands of subscribers. The fan-out architecture:

```
  Matching Engines
        │
        ▼
  Market Data Publisher (aggregates all symbols)
        │
        ├──→ Multicast group 1 (AAPL, GOOG, ...) → colocation clients
        ├──→ Multicast group 2 (AMZN, TSLA, ...) → colocation clients
        │
        ├──→ WebSocket Server 1 → retail clients (region 1)
        ├──→ WebSocket Server 2 → retail clients (region 2)
        │
        └──→ REST snapshot cache → mobile apps, websites
```

### Database Separation: OLTP vs OLAP

```
  ┌─────────────────────────────────────────────────────┐
  │  OLTP (Online Transaction Processing)               │
  │  ─────────────────────────────────────               │
  │  • Order management database                        │
  │  • Portfolio / balance database                     │
  │  • PostgreSQL or purpose-built store                │
  │  • Optimized for: single-row reads/writes, low     │
  │    latency, ACID transactions                       │
  └────────────────────────┬────────────────────────────┘
                           │ CDC / ETL
  ┌────────────────────────▼────────────────────────────┐
  │  OLAP (Online Analytical Processing)                │
  │  ─────────────────────────────────────               │
  │  • Trade analytics, reporting                       │
  │  • Market surveillance queries                      │
  │  • ClickHouse, BigQuery, or data warehouse          │
  │  • Optimized for: aggregations, scans,              │
  │    complex queries over large datasets              │
  └─────────────────────────────────────────────────────┘
```

### Colocation

Exchanges allow trading firms to place their servers **in the same datacenter** as the exchange's matching engines:

- **Cross-connect**: direct fiber from client server to exchange switch (~1–5 μs)
- All colocation clients get **equal cable length** (fairness)
- Firms pay $10K–$50K/month for a colocation rack
- This is how HFT firms achieve single-digit microsecond latencies
- The exchange profits from colocation fees — a significant revenue stream

---

## 14. End-to-End Data Flow

Let's trace a single order through the entire system:

```
  ═══════════════════════════════════════════════════════════
  SCENARIO: Alice places LIMIT BUY 100 AAPL @ $150.10
            Bob has a resting LIMIT SELL 100 AAPL @ $150.05
  ═══════════════════════════════════════════════════════════

  1. ALICE → GATEWAY
     ─────────────────
     Alice's broker sends: BUY 100 AAPL @ $150.10 LIMIT
     Gateway: authenticate → validate → rate limit check → OK
     
  2. GATEWAY → SEQUENCER
     ─────────────────
     Sequencer assigns: seq=5001, timestamp=T1
     Writes to event log (mmap)
     Publishes to ring buffer
     
  3. SEQUENCER → MATCHING ENGINE (AAPL, Core 3)
     ─────────────────
     Matching engine reads seq=5001 from ring buffer
     
     Order book before match:
       BIDS                    ASKS
       $150.00 x 200           $150.05 x 100 (Bob, O-222)
       $149.50 x 300           $150.50 x 500
     
     Match algorithm:
       Alice BUY @ $150.10 vs Best ASK $150.05
       $150.05 ≤ $150.10 → MATCH!
       Trade: 100 shares @ $150.05 (execute at resting order's price)
       Bob's order O-222: FILLED
       Alice's order: FILLED
     
     Emit: TRADE(buy=Alice, sell=Bob, qty=100, price=$150.05)
     
  4. MATCHING ENGINE → RING BUFFER 2 → CONSUMERS
     ─────────────────
     
     Consumer 1: OUTBOUND SEQUENCER
       Assigns seq=8001 to the trade event
       
     Consumer 2: MARKET DATA PUBLISHER
       Broadcasts: AAPL best ask changed from $150.05 to $150.50
       Broadcasts: AAPL last trade = $150.05 x 100
       
     Consumer 3: ORDER MANAGER
       Updates Alice's order status: FILLED
       Updates Bob's order status: FILLED
       Persists to database
       
     Consumer 4: REPORTER
       Trade confirmation sent to Alice and Bob
       Trade reported to regulatory systems
       
  5. PORTFOLIO SERVICE (async)
     ─────────────────
     Alice: cash -= $15,005.00, AAPL position += 100
     Bob:   cash += $15,005.00, AAPL position -= 100
     (Settlement will occur at T+2)

  ═══════════════════════════════════════════════════════════
  TOTAL LATENCY (critical path): ~10–50 μs
  ═══════════════════════════════════════════════════════════
```

---

## 15. Trade-offs & Interview Tips

### Key Trade-offs

| Decision | Option A | Option B | Exchange Choice |
|---|---|---|---|
| Threading model | Multi-threaded matching | Single-threaded matching | **Single-threaded** (determinism, no locks) |
| Communication | Message queue (Kafka) | Ring buffer (Disruptor) | **Ring buffer** on critical path, Kafka off path |
| Networking | Standard TCP/IP stack | Kernel bypass (DPDK) | **Kernel bypass** for critical path |
| Consistency vs Availability | AP (available, partition tolerant) | CP (consistent, partition tolerant) | **CP** — correctness over availability |
| Recovery | State replication | Event replay | **Event replay** (deterministic) |
| Pre-trade risk | On critical path | Off critical path | **On critical path** (prevent bad trades) |
| Market data | Full snapshots always | Incremental deltas + periodic snapshots | **Deltas + snapshots** |
| Data model | Relational DB everywhere | Event log as source of truth | **Event log** primary, DB as projection |

### How This Differs from Typical Web System Design

| Aspect | Web System | Stock Exchange |
|---|---|---|
| Latency target | < 100 ms | < 1 ms (or < 100 μs) |
| Scaling strategy | Horizontal (add servers) | Vertical (optimize single core) |
| Concurrency | Multi-threaded, async | Single-threaded per symbol |
| Communication | REST/gRPC, message queues | Ring buffers, shared memory, multicast UDP |
| State management | Database-centric | In-memory, event-sourced |
| Networking | Standard TCP/IP | Kernel bypass (DPDK) |
| Memory management | Let GC handle it | Pre-allocated, pooled, no GC |
| Recovery | Database backups, replicas | Deterministic event replay |
| Main bottleneck | I/O, network | CPU cache, branch prediction |

### Common Follow-Up Questions

1. **"How would you handle a market-wide halt (circuit breaker)?"**
   → The sequencer stops accepting new orders. Matching engines drain in-flight events. Resume by re-opening the sequencer.

2. **"How do you ensure fairness across colocated and remote clients?"**
   → Equal cable lengths in colocation. For remote clients, fairness is best-effort (speed-of-light latency is physical). Some exchanges add random delays ("speed bumps") to level the field (IEX does this with a 350 μs delay).

3. **"What happens if a matching engine produces a trade that fails risk checks?"**
   → Pre-trade risk checks catch most issues. Post-trade risk detection triggers a "bust" (trade reversal), which is a manual/semi-automated process. The trade reversal is also sequenced and audited.

4. **"How do you handle multi-leg orders (e.g., spreads, pairs)?"**
   → Complex order types require coordination across multiple order books. Typically handled by a separate "complex order engine" that interacts with individual symbol matching engines.

5. **"How would you design a crypto exchange differently?"**
   → 24/7 operation (no market open/close), wallet integration (on-chain settlement), wider price swings (need wider circuit breakers), less regulatory overhead (but growing), no T+2 settlement (instant blockchain confirmation).

6. **"What is the LMAX architecture?"**
   → LMAX Exchange (London) pioneered the single-threaded, event-sourced, ring buffer architecture. Their matching engine processes 6 million orders/second on a single thread. Many modern exchanges are inspired by LMAX.

7. **"How do you test a matching engine?"**
   → Deterministic replay is the key: capture production event sequences, replay through a new build of the matching engine, and verify output matches expected results bit-for-bit. Property-based testing is also invaluable (e.g., "no trade should violate price-time priority").

### Quick Reference Cheat Sheet

```
═══════════════════════════════════════════════════════════
              STOCK EXCHANGE — CHEAT SHEET
═══════════════════════════════════════════════════════════

  CORE COMPONENTS
  ────────────────
  Gateway → Sequencer → Matching Engine → Market Data Pub
  
  CRITICAL PATH RULES
  ────────────────
  • Single-threaded
  • No locks, no GC, no disk I/O, no network (except in/out)
  • Ring buffer between components
  • Pre-allocated memory
  • Kernel bypass networking
  
  ORDER BOOK
  ────────────────
  • Bids: Red-Black Tree (desc), FIFO queue per level
  • Asks: Red-Black Tree (asc), FIFO queue per level
  • Match: price-time priority
  • O(1) match at best, O(log n) insert new level
  
  MATCHING
  ────────────────
  • Limit buy: match against asks ≤ buy price
  • Limit sell: match against bids ≥ sell price
  • Market: match against best available, walk the book
  • Execute at resting order's price
  
  RECOVERY
  ────────────────
  • Sequencer log = source of truth (event sourcing)
  • Hot standby processes same events → same state
  • Failover: redirect to backup (< 1 second)
  • Snapshot + replay for cold recovery
  
  SCALING
  ────────────────
  • Partition by symbol (1 engine per symbol per core)
  • Gateway: stateless, horizontally scalable
  • Market data: multicast (colo) + WebSocket (retail)
  
  KEY NUMBERS
  ────────────────
  • Matching latency:   < 1 μs (HFT) to < 100 μs (retail)
  • Orders/sec/symbol:  1K–10K
  • Aggregate orders:   100K–1M/sec
  • Lock acquisition:   ~25 ns (why we avoid it)
  • Cache miss (L3):    ~30 ns
  • Kernel syscall:     ~1–5 μs (why we bypass it)
  • GC pause:           1–100 ms (why we pre-allocate)
  
  INTERVIEW KEYWORDS
  ────────────────
  Event sourcing, deterministic replay, LMAX Disruptor,
  price-time priority, ring buffer, kernel bypass,
  mechanical sympathy, single-writer pattern, fencing token,
  maker-taker, bid-ask spread, circuit breaker, T+2
  
═══════════════════════════════════════════════════════════
```

---

## 16. References & Further Reading

- **LMAX Exchange Architecture** — Martin Fowler's article on the LMAX Disruptor pattern
- **"Trading and Exchanges" by Larry Harris** — definitive textbook on market microstructure
- **SEC Rule 613 (Consolidated Audit Trail)** — regulatory requirements for order tracking
- **MiFID II RTS 25** — European clock synchronization requirements
- **"System Design Interview Volume 2" by Alex Xu** — Chapter 13 (this chapter)
- **Mechanical Sympathy blog (Martin Thompson)** — low-latency Java techniques
- **DPDK (Data Plane Development Kit)** — kernel bypass networking documentation
