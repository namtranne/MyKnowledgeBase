import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';

const STORAGE_PREFIX = 'chapter-checklist-v1';

function loadFor(path, items) {
  if (typeof window === 'undefined') return items.map(() => false);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${path}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return items.map(() => false);
}

function saveFor(path, checked) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${path}`, JSON.stringify(checked));
  } catch {}
}

function ProgressBar({ value, color }) {
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || 'linear-gradient(90deg,#00f0ff,#a855f7)' }} />
    </div>
  );
}

export default function ChapterChecklist({ path, title, items }) {
  const [checked, setChecked] = useState(() => loadFor(path, items));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const persist = useCallback((next) => {
    setChecked(next);
    saveFor(path, next);
  }, [path]);

  const toggle = useCallback((i) => {
    persist(checked.map((v, idx) => (idx === i ? !v : v)));
  }, [checked, persist]);

  const checkAll = useCallback(() => {
    const allDone = items.every((_, i) => checked[i]);
    persist(allDone ? items.map(() => false) : items.map(() => true));
  }, [items, checked, persist]);

  const done = checked.filter(Boolean).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#a855f7' : '#00f0ff';

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}>📋</div>
          <div>
            <div className={styles.title}>{title || 'Knowledge Check'}</div>
            <div className={styles.sub}>
              <span className={styles.counter}>{done}/{items.length}</span>
              <span className={styles.pct} style={{ color }}>{pct}%</span>
            </div>
          </div>
        </div>
        <button className={`${styles.allBtn} ${done === items.length ? styles.allBtnDone : ''}`} onClick={checkAll} type="button">
          {done === items.length ? '◉ Done' : '○ Check all'}
        </button>
      </div>
      <ProgressBar value={pct} color={color} />
      <div className={styles.grid}>
        {items.map((label, i) => (
          <label key={i} className={`${styles.item} ${checked[i] ? styles.itemDone : ''}`}>
            <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} className={styles.input} />
            <span className={styles.check}>{checked[i] ? '✓' : ''}</span>
            <span className={styles.label}>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
