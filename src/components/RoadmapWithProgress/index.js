import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

const STORAGE_KEY = 'roadmap-progress-v1';

const SECTIONS = [
  // Tier 1
  { id: 'networking',    label: 'Networking',             href: './Technical-Knowledge/Networking/',           tier: 1, chapters: 8, topics: 9  },
  { id: 'databases',     label: 'Databases',              href: './Technical-Knowledge/Database/',            tier: 1, chapters: 8, topics: 8  },
  { id: 'system-design', label: 'System Design',           href: './Technical-Knowledge/System-Design/',       tier: 1, chapters: 9, topics: 9  },
  { id: 'os',            label: 'Operating Systems',        href: './Technical-Knowledge/Operating-Systems/',   tier: 1, chapters: 7, topics: 7  },
  // Tier 2
  { id: 'security',      label: 'Security',                href: './Technical-Knowledge/Security/',            tier: 2, chapters: 5, topics: 5  },
  { id: 'reliability',  label: 'Reliability Engineering',  href: './Technical-Knowledge/Reliability-Engineering/', tier: 2, chapters: 5, topics: 5 },
  { id: 'se',            label: 'Software Engineering',     href: './Technical-Knowledge/Software-Engineering/', tier: 2, chapters: 5, topics: 5  },
  { id: 'observability', label: 'Observability',            href: './Technical-Knowledge/Observability/',      tier: 2, chapters: 4, topics: 3  },
  // Tier 3
  { id: 'cicd',          label: 'CI/CD & DevOps',         href: './Technical-Knowledge/CICD-DevOps/',         tier: 3, chapters: 4, topics: 4  },
  { id: 'behavioral',   label: 'Behavioral & Leadership',  href: './Technical-Knowledge/Behavioral-Leadership/', tier: 3, chapters: 4, topics: 4 },
  { id: 'kafka',         label: 'Kafka',                   href: './Technical-Knowledge/Kafka/',              tier: 3, chapters: 3, topics: 3  },
  { id: 'kubernetes',    label: 'Kubernetes',               href: './Technical-Knowledge/Kubernetes/',          tier: 3, chapters: 3, topics: 3  },
];

const BOOKS = [
  { id: 'ddia',    label: 'Designing Data-Intensive Applications', href: './Books/DDIA/',                        topics: 11 },
  { id: 'sdi-v1', label: 'System Design Interview — Vol 1',        href: './Books/System-Design-Interview-V1/',  topics: 1  },
  { id: 'ms',     label: 'Building Microservices',                 href: './Books/Building-Microservices/',       topics: 1  },
  { id: 'ej',     label: 'Effective Java',                       href: './Books/Effective-Java/',             topics: 1  },
];

function loadProgress() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveProgress(p) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function ProgressBar({ pct }) {
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#a855f7' : '#00f0ff';
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionRow({ section, checked, onToggle }) {
  const done = checked.filter(Boolean).length;
  const total = section.topics;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#a855f7' : '#00f0ff';
  const allChecked = done === total && total > 0;

  return (
    <div className={`${styles.row} ${allChecked ? styles.rowDone : ''}`}>
      <button
        className={`${styles.checkBtn} ${allChecked ? styles.checkBtnDone : ''}`}
        onClick={() => onToggle('__all__')}
        title={allChecked ? 'Uncheck all' : 'Check all'}
        type="button"
      >
        {allChecked ? '◉' : '○'}
      </button>
      <a href={section.href} className={styles.secLink}>{section.label}</a>
      <div className={styles.topics}>
        {section.topics > 1 && section.topics <= 9 ? (
          <div className={styles.chips}>
            {Array.from({ length: section.topics }).map((_, i) => (
              <button
                key={i}
                className={`${styles.chip} ${checked[i] ? styles.chipDone : ''}`}
                onClick={() => onToggle(i)}
                type="button"
                title={checked[i] ? 'Uncheck' : 'Check'}
              />
            ))}
          </div>
        ) : (
          <button
            className={`${styles.chip} ${checked[0] ? styles.chipDone : ''}`}
            onClick={() => onToggle(0)}
            type="button"
            title={checked[0] ? 'Uncheck' : 'Check'}
          />
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.chapters}>{section.chapters} ch</span>
        <span className={styles.pct} style={{ color }}>{pct}%</span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}

function BookRow({ book, checked, onToggle }) {
  const allChecked = checked[0];
  return (
    <div className={`${styles.row} ${allChecked ? styles.rowDone : ''}`}>
      <button
        className={`${styles.checkBtn} ${allChecked ? styles.checkBtnDone : ''}`}
        onClick={() => onToggle('__all__')}
        title={allChecked ? 'Uncheck all' : 'Check all'}
        type="button"
      >
        {allChecked ? '◉' : '○'}
      </button>
      <a href={book.href} className={styles.secLink}>{book.label}</a>
      <div className={styles.topics}>
        <button
          className={`${styles.chip} ${checked[0] ? styles.chipDone : ''}`}
          onClick={() => onToggle(0)}
          type="button"
          title={checked[0] ? 'Uncheck' : 'Check'}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.pct} style={{ color: allChecked ? '#22c55e' : '#64748b' }}>
          {allChecked ? '100%' : '0%'}
        </span>
      </div>
    </div>
  );
}

function TierBlock({ tier, sections, checked, onToggle }) {
  return (
    <div className={styles.tier}>
      <div className={styles.tierHeader}>
        {tier === 1 ? 'Tier 1 — Must Master' : tier === 2 ? 'Tier 2 — Strong Advantage' : 'Tier 3 — Bonus but Powerful'}
      </div>
      <div className={styles.tierCols}>
        <div className={styles.colLabel} />
        <div className={styles.colName}>Section</div>
        <div className={styles.colTopics}>Topics</div>
        <div className={styles.colStatus}>Status</div>
      </div>
      {sections.map(s => (
        <SectionRow
          key={s.id}
          section={s}
          checked={checked[s.id] || []}
          onToggle={(ti) => onToggle(s.id, ti)}
        />
      ))}
    </div>
  );
}

export default function RoadmapWithProgress() {
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

  const handleToggle = useCallback((id, topicIdx) => {
    save(prev => {
      const current = prev[id] || [];
      let next;
      if (topicIdx === '__all__') {
        const allDone = current.length > 0 && current.every(Boolean);
        const needed = id.startsWith('book-') ? [true] : Array.from({ length: SECTIONS.find(s => s.id === id)?.topics || 1 }, () => !allDone);
        next = allDone ? needed.map(() => false) : needed.map(() => true);
      } else {
        next = [...current];
        next[topicIdx] = !next[topicIdx];
      }
      return { ...prev, [id]: next };
    });
  }, [save]);

  if (!hydrated) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  const tier1 = SECTIONS.filter(s => s.tier === 1);
  const tier2 = SECTIONS.filter(s => s.tier === 2);
  const tier3 = SECTIONS.filter(s => s.tier === 3);

  const totalTopics = SECTIONS.reduce((s, sec) => s + sec.topics, 0);
  const totalChecked = SECTIONS.reduce((s, sec) => {
    const c = progress[sec.id] || [];
    return s + c.filter(Boolean).length;
  }, 0);
  const totalPct = totalTopics > 0 ? Math.round((totalChecked / totalTopics) * 100) : 0;
  const bookDone = BOOKS.filter(b => progress[b.id]?.[0]).length;
  const totalColor = totalPct === 100 ? '#22c55e' : totalPct >= 50 ? '#a855f7' : '#00f0ff';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>✓</div>
          <div>
            <div className={styles.headerTitle}>Interview Readiness Tracker</div>
            <div className={styles.headerSub}>Track your progress across Technical Knowledge and Books</div>
          </div>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.bigPct} style={{ color: totalColor }}>{totalPct}%</span>
          <span className={styles.bigPctLabel}>{totalChecked}/{totalTopics} topics</span>
          <span className={styles.divider}>·</span>
          <span className={styles.booksLabel}>{bookDone}/{BOOKS.length} books</span>
        </div>
      </div>

      <div className={styles.barOuter}>
        <div className={styles.barFill} style={{ width: `${totalPct}%`, background: totalColor }} />
      </div>

      <div className={styles.body}>
        <TierBlock tier={1} sections={tier1} checked={progress} onToggle={handleToggle} />
        <TierBlock tier={2} sections={tier2} checked={progress} onToggle={handleToggle} />
        <TierBlock tier={3} sections={tier3} checked={progress} onToggle={handleToggle} />

        <div className={styles.booksSection}>
          <div className={styles.tierHeader}>Book Notes &amp; Summaries</div>
          <div className={styles.tierCols}>
            <div className={styles.colLabel} />
            <div className={styles.colName}>Book</div>
            <div className={styles.colTopics}>Topics</div>
            <div className={styles.colStatus}>Status</div>
          </div>
          {BOOKS.map(b => (
            <BookRow
              key={b.id}
              book={b}
              checked={progress[b.id] || []}
              onToggle={(ti) => handleToggle(b.id, ti)}
            />
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerNote}>Progress saved locally in your browser.</span>
        <div className={styles.footerLinks}>
          <a href="/dsa-roadmap" className={styles.footerLink}>DSA Roadmap →</a>
          <a href="/interview-checklist" className={styles.footerLink}>Interview Checklist →</a>
        </div>
      </div>
    </div>
  );
}
