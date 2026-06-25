import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

const SECTIONS = [
  {
    label: 'Networking',
    href: './Technical-Knowledge/Networking/',
    topics: [
      { label: 'OSI/TCP-IP Model', key: 'net-osi' },
      { label: 'TCP Deep Dive', key: 'net-tcp' },
      { label: 'UDP & QUIC', key: 'net-udp' },
      { label: 'HTTP & HTTPS', key: 'net-http' },
      { label: 'HTTP-2 & HTTP-3', key: 'net-http23' },
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
  {
    label: 'Books',
    href: './Books/',
    topics: [
      { label: 'DDIA — Reliable, Scalable, Maintainable', key: 'book-ddia' },
      { label: 'DDIA — Distribution Models', key: 'book-ddia-dist' },
      { label: 'DDIA — Storage & Retrieval', key: 'book-ddia-storage' },
      { label: 'DDIA — Replication & Partitioning', key: 'book-ddia-repl' },
      { label: 'DDIA — Transactions', key: 'book-ddia-txn' },
      { label: 'DDIA — Distributed Troubles', key: 'book-ddia-dist' },
      { label: 'DDIA — Consistency & Consensus', key: 'book-ddia-consistency' },
      { label: 'DDIA — Stream Processing', key: 'book-ddia-stream' },
      { label: 'DDIA — Data Integration', key: 'book-ddia-integration' },
      { label: 'System Design Interview V1', key: 'book-sdi-v1' },
      { label: 'Building Microservices', key: 'book-ms' },
      { label: 'Effective Java — Concurrency', key: 'book-ej-concurrency' },
    ],
  },
];

const STORAGE_KEY = 'knowledge-progress-v2';

function loadProgress() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function ProgressBar({ value, color }) {
  return (
    <div className={styles.progressBarTrack}>
      <div
        className={styles.progressBarFill}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

function SectionCard({ section, checked, onToggle, allChecked, totalTopics }) {
  const done = checked.filter(Boolean).length;
  const pct = totalTopics > 0 ? Math.round((done / totalTopics) * 100) : 0;
  const color = pct === 100
    ? '#22c55e'
    : pct >= 50
    ? '#a855f7'
    : '#00f0ff';

  return (
    <div className={`${styles.sectionCard} ${allChecked ? styles.sectionCardDone : ''}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionLeft}>
          <div className={styles.sectionTitle}>
            <a href={section.href} className={styles.sectionLink}>
              {section.label}
            </a>
          </div>
          <div className={styles.sectionMeta}>
            <span className={styles.sectionCount}>{done}/{totalTopics}</span>
            <span className={styles.sectionPct} style={{ color }}>{pct}%</span>
          </div>
        </div>
        <button
          className={`${styles.checkAllBtn} ${allChecked ? styles.checkAllBtnDone : ''}`}
          onClick={() => onToggle('__all__')}
          title={allChecked ? 'Uncheck all' : 'Check all'}
        >
          {allChecked ? '◉' : '○'}
        </button>
      </div>
      <ProgressBar value={pct} color={color} />
      <div className={styles.topicsGrid}>
        {section.topics.map((topic, i) => (
          <label key={topic.key} className={`${styles.topicLabel} ${checked[i] ? styles.topicLabelChecked : ''}`}>
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={() => onToggle(i)}
              className={styles.topicCheckbox}
            />
            <span className={styles.topicCheckmark}>
              {checked[i] ? '✓' : ''}
            </span>
            <span className={styles.topicName}>{topic.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ProgressTracker() {
  const [progress, setProgress] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  const save = useCallback((updater) => {
    setProgress(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveProgress(next);
      return next;
    });
  }, []);

  const handleToggle = useCallback((sectionIdx, topicIdx) => {
    save(prev => {
      const key = SECTIONS[sectionIdx].label;
      const current = prev[key] || [];
      let next;
      if (topicIdx === '__all__') {
        const allChecked = SECTIONS[sectionIdx].topics.every((_, i) => current[i]);
        next = allChecked
          ? current.map(() => false)
          : SECTIONS[sectionIdx].topics.map(() => true);
      } else {
        next = [...current];
        next[topicIdx] = !next[topicIdx];
      }
      return { ...prev, [key]: next };
    });
  }, [save]);

  if (!hydrated) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  const totalTopics = SECTIONS.reduce((sum, s) => sum + s.topics.length, 0);
  const totalChecked = SECTIONS.reduce((sum, section) => {
    const key = section.label;
    const checked = progress[key] || [];
    return sum + checked.filter(Boolean).length;
  }, 0);
  const totalPct = totalTopics > 0 ? Math.round((totalChecked / totalTopics) * 100) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>✓</div>
          <div>
            <div className={styles.headerTitle}>Interview Readiness Tracker</div>
            <div className={styles.headerSubtitle}>
              Track your progress across all technical knowledge sections
            </div>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerBigStat} style={{ color: totalPct === 100 ? '#22c55e' : totalPct >= 50 ? '#a855f7' : '#00f0ff' }}>
            {totalPct}%
          </div>
          <div className={styles.headerSubStat}>{totalChecked}/{totalTopics} topics</div>
        </div>
      </div>

      <ProgressBar value={totalPct} color={totalPct === 100 ? '#22c55e' : totalPct >= 50 ? '#a855f7' : '#00f0ff'} />

      <div className={styles.grid}>
        {SECTIONS.map((section, si) => {
          const key = section.label;
          const checked = progress[key] || [];
          const totalSectionTopics = section.topics.length;
          const allChecked = totalSectionTopics > 0 && section.topics.every((_, i) => checked[i]);
          return (
            <SectionCard
              key={key}
              section={section}
              checked={checked}
              onToggle={(ti) => handleToggle(si, ti)}
              allChecked={allChecked}
              totalTopics={totalSectionTopics}
            />
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerNote}>
          Progress is saved locally in your browser.
        </div>
        <div className={styles.footerLinks}>
          <a href="/dsa-roadmap" className={styles.footerLink}>DSA Roadmap →</a>
          <a href="/interview-checklist" className={styles.footerLink}>Interview Checklist →</a>
        </div>
      </div>
    </div>
  );
}
