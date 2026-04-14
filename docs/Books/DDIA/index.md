# Designing Data-Intensive Applications

**Martin Kleppmann, O'Reilly Media (2017)**

Comprehensive notes distilled from the book, organized by chapter. Each section focuses on the core **problems** and **approaches/solutions** — no fluff.

---

## Part I — Foundations of Data Systems

| # | Chapter | Core Focus |
|---|---------|------------|
| 1 | [Reliability, Scalability & Maintainability](./01-reliable-scalable-maintainable.md) | Three pillars of data system design |
| 2 | [Data Models & Query Languages](./02-data-models-query-languages.md) | Relational vs Document vs Graph; SQL vs MapReduce |
| 3 | [Storage & Retrieval](./03-storage-and-retrieval.md) | LSM-Trees vs B-Trees; OLTP vs OLAP; Column stores |
| 4 | [Encoding & Evolution](./04-encoding-and-evolution.md) | Serialization formats; Schema evolution; Data flow patterns |

## Part II — Distributed Data

| # | Chapter | Core Focus |
|---|---------|------------|
| 5 | [Replication](./05-replication.md) | Leader-based, multi-leader, leaderless; Consistency guarantees |
| 6 | [Partitioning](./06-partitioning.md) | Key-range vs hash; Secondary indexes; Rebalancing |
| 7 | [Transactions](./07-transactions.md) | ACID; Isolation levels; Serializability approaches |
| 8 | [The Trouble with Distributed Systems](./08-trouble-with-distributed-systems.md) | Network faults; Clocks; Byzantine faults |
| 9 | [Consistency & Consensus](./09-consistency-and-consensus.md) | Linearizability; CAP; Total order broadcast; Raft/Paxos |

## Part III — Derived Data

| # | Chapter | Core Focus |
|---|---------|------------|
| 10 | [Batch Processing](./10-batch-processing.md) | Unix philosophy; MapReduce; Dataflow engines |
| 11 | [Stream Processing](./11-stream-processing.md) | Message brokers; Event sourcing; Stream joins; Exactly-once |
| 12 | [The Future of Data Systems](./12-future-of-data-systems.md) | Data integration; Unbundling databases; Correctness |
