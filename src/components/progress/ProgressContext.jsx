import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getSectionCount } from '../../content/sections.js';

const STORAGE_KEY = 'kb-reading-progress-v1';
const ProgressContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ProgressProvider({ children }) {
  const [store, setStore] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [store]);

  const toggleSection = useCallback((route, id) => {
    setStore((prev) => {
      const page = { ...(prev[route] || {}) };
      if (page[id]) delete page[id];
      else page[id] = true;
      const next = { ...prev };
      if (Object.keys(page).length) next[route] = page;
      else delete next[route];
      return next;
    });
  }, []);

  const resetPage = useCallback((route) => {
    setStore((prev) => {
      if (!prev[route]) return prev;
      const next = { ...prev };
      delete next[route];
      return next;
    });
  }, []);

  const isChecked = useCallback(
    (route, id) => !!store[route]?.[id],
    [store]
  );

  const getPageStats = useCallback(
    (route) => {
      const total = getSectionCount(route);
      const checked = Math.min(Object.keys(store[route] || {}).length, total);
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      return { checked, total, pct };
    },
    [store]
  );

  const getRoutesStats = useCallback(
    (routes) => {
      let checked = 0;
      let total = 0;
      for (const r of routes) {
        const t = getSectionCount(r);
        if (!t) continue;
        total += t;
        checked += Math.min(Object.keys(store[r] || {}).length, t);
      }
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      return { checked, total, pct };
    },
    [store]
  );

  const value = useMemo(
    () => ({ isChecked, toggleSection, resetPage, getPageStats, getRoutesStats }),
    [isChecked, toggleSection, resetPage, getPageStats, getRoutesStats]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
