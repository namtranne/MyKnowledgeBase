import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';
import { ALL_SECTIONS } from './_tech-topics-data';

const STORAGE_KEY = 'tech-progress-v1';

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
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color || 'linear-gradient(90deg, #00f0ff, #a855f7)',
        }}
      />
    </div>
  );
}

function SectionCard({ section, checked, onToggle, allChecked, totalTopics }) {
  const done = checked.filter(Boolean).length;
  const pct = totalTopics > 0 ? Math.round((done / totalTopics) * 100) : 0;
  const isBook = section.label.includes('DDIA') || section.label.includes('System Design Interview') || section.label.includes('Building Microservices') || section.label.includes('Effective Java');
  const color = pct === 100
    ? '#22c55e'
    : pct >= 50
    ? isBook
      ? '#f59e0b'
      : '#a855f7'
    : isBook
    ? '#f472b6'
    : '#00f0ff';

  return (
    <div className={`${styles.sectionCard} ${allChecked ? styles.sectionCardDone : ''}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionLeft}>
          <div className={styles.sectionTitle}>
            <a href={section.href} className={styles.sectionLink} onClick={(e) => e.stopPropagation()}>
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

export default function TechProgressTracker() {
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
      const key = ALL_SECTIONS[sectionIdx].label;
      const current = prev[key] || [];
      let next;
      if (topicIdx === '__all__') {
        const allChecked = ALL_SECTIONS[sectionIdx].topics.every((_, i) => current[i]);
        next = allChecked
          ? current.map(() => false)
          : ALL_SECTIONS[sectionIdx].topics.map(() => true);
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

  const totalTopics = ALL_SECTIONS.reduce((sum, s) => sum + s.topics.length, 0);
  const totalChecked = ALL_SECTIONS.reduce((sum, section) => {
    const key = section.label;
    const checked = progress[key] || [];
    return sum + checked.filter(Boolean).length;
  }, 0);
  const totalPct = totalTopics > 0 ? Math.round((totalChecked / totalTopics) * 100) : 0;

  const techTotal = TECH_SECTIONS.reduce((s, sec) => s + sec.topics.length, 0);
  const techChecked = TECH_SECTIONS.reduce((s, section) => {
    const key = section.label;
    const checked = progress[key] || [];
    return s + checked.filter(Boolean).length;
  }, 0);
  const techPct = techTotal > 0 ? Math.round((techChecked / techTotal) * 100) : 0;

  const bookTotal = BOOK_SECTIONS.reduce((s, sec) => s + sec.topics.length, 0);
  const bookChecked = BOOK_SECTIONS.reduce((s, section) => {
    const key = section.label;
    const checked = progress[key] || [];
    return s + checked.filter(Boolean).length;
  }, 0);
  const bookPct = bookTotal > 0 ? Math.round((bookChecked / bookTotal) * 100) : 0;

  const totalColor = totalPct === 100 ? '#22c55e' : totalPct >= 50 ? '#a855f7' : '#00f0ff';
  const techColor = techPct === 100 ? '#22c55e' : techPct >= 50 ? '#a855f7' : '#00f0ff';
  const bookColor = bookPct === 100 ? '#22c55e' : bookPct >= 50 ? '#f59e0b' : '#f472b6';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>✓</div>
          <div>
            <div className={styles.headerTitle}>Knowledge Progress Tracker</div>
            <div className={styles.headerSubtitle}>
              Track what you've covered across Technical Knowledge and Books
            </div>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statPill} style={{ borderColor: techColor }}>
            <span style={{ color: techColor }} className={styles.statPillVal}>{techPct}%</span>
            <span className={styles.statPillLabel}>Tech ({techChecked}/{techTotal})</span>
          </div>
          <div className={styles.statPill} style={{ borderColor: bookColor }}>
            <span style={{ color: bookColor }} className={styles.statPillVal}>{bookPct}%</span>
            <span className={styles.statPillLabel}>Books ({bookChecked}/{bookTotal})</span>
          </div>
        </div>
      </div>

      <div className={styles.splitBar}>
        <div className={styles.splitSegment} style={{ width: `${totalPct}%`, background: totalColor }} />
      </div>

      <div className={styles.overallRow}>
        <div className={styles.overallStat}>
          <span className={styles.overallPct} style={{ color: totalColor }}>{totalPct}%</span>
          <span className={styles.overallLabel}>overall</span>
        </div>
        <div className={styles.overallDetail}>
          {totalChecked} of {totalTopics} topics completed
        </div>
      </div>

      <div className={styles.grid}>
        {ALL_SECTIONS.map((section, si) => {
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
          Progress is saved locally in your browser. Use this to audit your knowledge gaps before interviews.
        </div>
        <div className={styles.footerLinks}>
          <a href="/dsa-roadmap" className={styles.footerLink}>DSA Roadmap →</a>
          <a href="/interview-checklist" className={styles.footerLink}>Interview Checklist →</a>
        </div>
      </div>
    </div>
  );
}
