import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

const STORAGE_KEY = 'chapter-progress-v1';

const DEFAULT_ITEMS = [
  'Core Concepts & Theory',
  'Key Algorithms & Mechanisms',
  'Performance & Trade-offs',
  'Hands-on Tools & Commands',
  'Common Pitfalls & Edge Cases',
  'Interview Questions',
];

function loadProgress() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveProgress(p) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function getChapterId(pageTitle) {
  if (!pageTitle) return 'unknown';
  return pageTitle.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getChapterTitle() {
  if (typeof window === 'undefined') return '';
  const h1 = document.querySelector('article h1');
  if (h1) return h1.textContent || '';
  const meta = document.querySelector('meta[property="og:title"]');
  if (meta) return meta.getAttribute('content') || '';
  const title = document.title;
  return title.replace(/[-|].*$/, '').trim();
}

export default function ChapterProgress({ chapterItems }) {
  const [progress, setProgress] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
    setTitle(getChapterTitle());
  }, []);

  const items = chapterItems || DEFAULT_ITEMS;
  const chapterId = getChapterId(title);
  const checked = progress[chapterId] || [];
  const done = checked.filter(Boolean).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total && total > 0;
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#a855f7' : '#00f0ff';

  const handleToggle = useCallback((idx) => {
    const id = chapterId;
    saveProgress(prev => {
      const current = prev[id] || [];
      const next = [...current];
      next[idx] = !next[idx];
      return { ...prev, [id]: next };
    });
    setProgress(prev => {
      const current = prev[id] || [];
      const next = [...current];
      next[idx] = !next[idx];
      return { ...prev, [id]: next };
    });
  }, [chapterId]);

  const handleToggleAll = useCallback(() => {
    const id = chapterId;
    const nextVal = !allDone;
    const next = Array.from({ length: total }, () => nextVal);
    saveProgress(prev => ({ ...prev, [id]: next }));
    setProgress(prev => ({ ...prev, [id]: next }));
  }, [allDone, chapterId, total]);

  if (!hydrated) {
    return null;
  }

  return (
    <details className={styles.container} open>
      <summary className={styles.summary}>
        <button
          className={`${styles.checkBtn} ${allDone ? styles.checkBtnDone : ''}`}
          onClick={(e) => { e.preventDefault(); handleToggleAll(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleAll(); }}}
          title={allDone ? 'Uncheck all' : 'Check all'}
          type="button"
        >
          {allDone ? '◉' : '○'}
        </button>
        <span className={styles.label}>
          {title ? `📋 ${title}` : '📋 Chapter Progress'}
        </span>
        <div className={styles.barOuter}>
          <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className={styles.pctNum} style={{ color }}>{pct}%</span>
        <span className={styles.chevron}>▾</span>
      </summary>

      <div className={styles.items}>
        {items.map((item, i) => (
          <label key={i} className={`${styles.item} ${checked[i] ? styles.itemDone : ''}`}>
            <input
              type="checkbox"
              className={styles.hiddenCheck}
              checked={!!checked[i]}
              onChange={() => handleToggle(i)}
            />
            <span className={styles.itemBox}>
              {checked[i] ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : null}
            </span>
            <span className={styles.itemText}>{item}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
