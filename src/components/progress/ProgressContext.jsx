import { createContext, useContext, useCallback, useMemo } from 'react';
import { getSectionCount } from '../../content/sections.js';
import { useUserStateStore } from '../../auth/UserStateContext.jsx';

// Reading progress ("Mark read" per H2 section) for tracked doc pages.
// Stored per user via UserStateContext under the key `reading:<route>`
// with value { [sectionId]: true } — on the server when signed in,
// in this browser (guest) otherwise.
const KEY_PREFIX = 'reading:';
const keyFor = (route) => `${KEY_PREFIX}${route}`;

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const { store, set, remove, mode, ready, syncError } = useUserStateStore();

  const pageOf = useCallback((route) => store[keyFor(route)] || {}, [store]);

  const toggleSection = useCallback(
    (route, id) => {
      set(keyFor(route), (prev) => {
        const page = { ...(prev || {}) };
        if (page[id]) delete page[id];
        else page[id] = true;
        return Object.keys(page).length ? page : undefined;
      });
    },
    [set]
  );

  const resetPage = useCallback((route) => remove(keyFor(route)), [remove]);

  const isChecked = useCallback((route, id) => !!pageOf(route)[id], [pageOf]);

  const getPageStats = useCallback(
    (route) => {
      const total = getSectionCount(route);
      const checked = Math.min(Object.keys(pageOf(route)).length, total);
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      return { checked, total, pct };
    },
    [pageOf]
  );

  const getRoutesStats = useCallback(
    (routes) => {
      let checked = 0;
      let total = 0;
      for (const r of routes) {
        const t = getSectionCount(r);
        if (!t) continue;
        total += t;
        checked += Math.min(Object.keys(pageOf(r)).length, t);
      }
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      return { checked, total, pct };
    },
    [pageOf]
  );

  const value = useMemo(
    () => ({
      isChecked,
      toggleSection,
      resetPage,
      getPageStats,
      getRoutesStats,
      syncMode: mode, // 'user' (saved to account) | 'guest' (this browser only)
      ready,
      syncError,
    }),
    [isChecked, toggleSection, resetPage, getPageStats, getRoutesStats, mode, ready, syncError]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
