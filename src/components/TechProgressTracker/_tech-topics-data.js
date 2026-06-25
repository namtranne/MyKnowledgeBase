// ─────────────────────────────────────────────────────────────────────────────
// Tech Progress Tracker — Topic data
// Maps sections to their docs pages and individual topics for the progress
// tracker on the intro page. Keep in sync with docs/Technical-Knowledge and
// docs/Books folder structure.
// ─────────────────────────────────────────────────────────────────────────────

export const TECH_SECTIONS = [
  {
    label: 'Networking',
    href: './Technical-Knowledge/Networking/',
    topics: [
      { label: 'OSI / TCP-IP Model', key: 'net-osi' },
      { label: 'TCP Deep Dive', key: 'net-tcp' },
      { label: 'UDP & QUIC', key: 'net-udp' },
      { label: 'HTTP & HTTPS', key: 'net-http' },
      { label: 'HTTP/2 & HTTP/3', key: 'net-http23' },
      { label: 'TLS & mTLS', key: 'net-tls' },
      { label: 'DNS', key: 'net-dns' },
      { label: 'Load Balancing', key: 'net-lb' },
      { label: 'API Design & REST', key: 'net-api' },
    ],
  },
  {
    label: 'Databases',
    href: './Technical-Knowledge/Database/',
    topics: [
      { label: 'ACID & Transactions', key: 'db-acid' },
      { label: 'Indexing & Storage Engines', key: 'db-index' },
      { label: 'Query Optimization', key: 'db-query' },
      { label: 'Replication & Partitioning', key: 'db-repl' },
      { label: 'SQL Mastery', key: 'db-sql' },
      { label: 'NoSQL Databases', key: 'db-nosql' },
      { label: 'Caching Strategies', key: 'db-cache' },
      { label: 'Database Patterns', key: 'db-patterns' },
    ],
  },
  {
    label: 'System Design',
    href: './Technical-Knowledge/System-Design/',
    topics: [
      { label: 'Architecture Fundamentals', key: 'sd-arch' },
      { label: 'Capacity Planning', key: 'sd-capacity' },
      { label: 'Scaling & Load Balancing', key: 'sd-scale' },
      { label: 'Data Storage & Retrieval', key: 'sd-storage' },
      { label: 'Caching Patterns', key: 'sd-caching' },
      { label: 'Asynchronous Processing', key: 'sd-async' },
      { label: 'Contention & Hotspots', key: 'sd-contention' },
      { label: 'Sagas & Distributed Transactions', key: 'sd-sagas' },
      { label: 'Framework & Architecture', key: 'sd-framework' },
    ],
  },
  {
    label: 'Operating Systems',
    href: './Technical-Knowledge/Operating-Systems/',
    topics: [
      { label: 'Processes & Threads', key: 'os-process' },
      { label: 'CPU Scheduling', key: 'os-sched' },
      { label: 'Memory Management', key: 'os-memory' },
      { label: 'Synchronization & Deadlocks', key: 'os-sync' },
      { label: 'File Systems & I/O', key: 'os-fs' },
      { label: 'Linux Internals & System Calls', key: 'os-linux' },
      { label: 'Interview Questions', key: 'os-interview' },
    ],
  },
  {
    label: 'Security',
    href: './Technical-Knowledge/Security/',
    topics: [
      { label: 'Authentication & JWT/OAuth', key: 'sec-auth' },
      { label: 'Web Vulnerabilities', key: 'sec-web' },
      { label: 'Cryptography', key: 'sec-crypto' },
      { label: 'Privacy & GDPR', key: 'sec-privacy' },
      { label: 'API Security', key: 'sec-api' },
    ],
  },
  {
    label: 'Reliability Engineering',
    href: './Technical-Knowledge/Reliability-Engineering/',
    topics: [
      { label: 'SRE & SLOs', key: 're-sre' },
      { label: 'Resilience Patterns', key: 're-resilience' },
      { label: 'Rate Limiting', key: 're-rate' },
      { label: 'Incident Management', key: 're-incident' },
      { label: 'Disaster Recovery', key: 're-dr' },
    ],
  },
  {
    label: 'Software Engineering',
    href: './Technical-Knowledge/Software-Engineering/',
    topics: [
      { label: 'SOLID Principles', key: 'se-solid' },
      { label: 'Design Patterns', key: 'se-patterns' },
      { label: 'Clean Architecture', key: 'se-clean' },
      { label: 'Testing Strategies', key: 'se-testing' },
      { label: 'Code Quality', key: 'se-quality' },
    ],
  },
  {
    label: 'Observability',
    href: './Technical-Knowledge/Observability/',
    topics: [
      { label: 'Logging', key: 'obs-log' },
      { label: 'Metrics & Alerting', key: 'obs-metrics' },
      { label: 'Distributed Tracing', key: 'obs-trace' },
    ],
  },
  {
    label: 'CI/CD & DevOps',
    href: './Technical-Knowledge/CICD-DevOps/',
    topics: [
      { label: 'Containers & Virtualization', key: 'cicd-containers' },
      { label: 'CI/CD Pipelines', key: 'cicd-pipeline' },
      { label: 'Deployment Strategies', key: 'cicd-deploy' },
      { label: 'Infrastructure as Code', key: 'cicd-iac' },
    ],
  },
  {
    label: 'Behavioral & Leadership',
    href: './Technical-Knowledge/Behavioral-Leadership/',
    topics: [
      { label: 'STAR Method', key: 'beh-star' },
      { label: 'Leadership Principles', key: 'beh-lead' },
      { label: 'Product Sense', key: 'beh-product' },
      { label: 'Conflict Resolution', key: 'beh-conflict' },
    ],
  },
  {
    label: 'Kafka',
    href: './Technical-Knowledge/Kafka/',
    topics: [
      { label: 'Architecture', key: 'kafka-arch' },
      { label: 'Producers & Consumers', key: 'kafka-producers' },
      { label: 'Streams & KRaft', key: 'kafka-streams' },
    ],
  },
  {
    label: 'Kubernetes',
    href: './Technical-Knowledge/Kubernetes/',
    topics: [
      { label: 'Core Concepts', key: 'k8s-core' },
      { label: 'EKS Setup & Operations', key: 'k8s-eks' },
      { label: 'Deployment Strategies', key: 'k8s-deploy' },
    ],
  },
];

export const BOOK_SECTIONS = [
  {
    label: 'Designing Data-Intensive Applications',
    href: './Books/DDIA/',
    topics: [
      { label: 'Reliable, Scalable, Maintainable', key: 'book-ddia' },
      { label: 'Data Models & Query Languages', key: 'book-ddia-data' },
      { label: 'Storage & Retrieval', key: 'book-ddia-storage' },
      { label: 'Encoding & Evolution', key: 'book-ddia-encoding' },
      { label: 'Replication', key: 'book-ddia-replication' },
      { label: 'Partitioning', key: 'book-ddia-partitioning' },
      { label: 'Transactions', key: 'book-ddia-txn' },
      { label: 'Distributed Troubles', key: 'book-ddia-troubles' },
      { label: 'Consistency & Consensus', key: 'book-ddia-consensus' },
      { label: 'Stream Processing', key: 'book-ddia-stream' },
      { label: 'Data Integration', key: 'book-ddia-integration' },
    ],
  },
  {
    label: 'System Design Interview — Vol 1',
    href: './Books/System-Design-Interview-V1/',
    topics: [
      { label: 'Framework + 13 System Design Problems', key: 'book-sdi' },
    ],
  },
  {
    label: 'Building Microservices',
    href: './Books/Building-Microservices/',
    topics: [
      { label: 'Integration, Testing, Deployment, Scaling', key: 'book-ms' },
    ],
  },
  {
    label: 'Effective Java',
    href: './Books/Effective-Java/',
    topics: [
      { label: 'Concurrency & Thread Safety', key: 'book-ej' },
    ],
  },
];

export const ALL_SECTIONS = [
  ...TECH_SECTIONS,
  ...BOOK_SECTIONS,
];
