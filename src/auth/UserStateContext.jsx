// Per-user key/value state, persisted on the server for signed-in users.
//
// - Signed in  -> every value lives in the server's UserState table (keyed by userId).
// - Signed out -> values are kept in this browser's localStorage as "guest" data.
// - On sign-in -> guest data is merged into the account once, then cleared from
//   the browser so it cannot leak into another user's account.
//
// Keys are namespaced strings, e.g. "reading:/docs/Database/01-..." or
// "dsa:progress:foundations". Setting a key to undefined/null deletes it.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const GUEST_PREFIX = 'kb-guest:';

// ─── guest (localStorage) helpers ────────────────────────────────────────────

function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* quota / private mode */
  }
}
function lsRemove(k) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
function lsKeys() {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

function loadGuest() {
  const out = {};
  for (const k of lsKeys()) {
    if (!k.startsWith(GUEST_PREFIX)) continue;
    try {
      out[k.slice(GUEST_PREFIX.length)] = JSON.parse(lsGet(k));
    } catch {
      /* skip corrupt entry */
    }
  }
  return out;
}

function writeGuest(key, value) {
  if (value === undefined || value === null) lsRemove(GUEST_PREFIX + key);
  else lsSet(GUEST_PREFIX + key, JSON.stringify(value));
}

function clearGuest() {
  for (const k of lsKeys()) if (k.startsWith(GUEST_PREFIX)) lsRemove(k);
}

// One-time conversion of the pre-account localStorage keys into guest keys,
// so progress people already have is not lost (and gets uploaded on sign-in).
function migrateLegacyKeys() {
  const readJSON = (k) => {
    const raw = lsGet(k);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  const reading = readJSON('kb-reading-progress-v1');
  if (reading && typeof reading === 'object') {
    for (const [route, page] of Object.entries(reading)) {
      if (page && Object.keys(page).length) writeGuest(`reading:${route}`, page);
    }
  }
  lsRemove('kb-reading-progress-v1');

  const dsa = [
    ['dsa-foundations-progress', 'dsa:progress:foundations', true],
    ['dsa-roadmap-progress', 'dsa:progress:intensive', true],
    ['dsa-foundations-start', 'dsa:start:foundations', false],
    ['dsa-roadmap-start', 'dsa:start:intensive', false],
  ];
  for (const [oldKey, newKey, isJson] of dsa) {
    const raw = lsGet(oldKey);
    if (raw == null) continue;
    const v = isJson ? readJSON(oldKey) : raw;
    if (v !== undefined) writeGuest(newKey, v);
    lsRemove(oldKey);
  }
  // Random picks expire after 2h anyway — just drop the old keys.
  for (const k of lsKeys()) if (k.startsWith('dsa-random-pick-v1:')) lsRemove(k);
}

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Guest value + existing server value -> value to keep. Server wins on conflicts;
// for maps (progress), guest entries the server doesn't have are added.
function mergeValues(guest, server) {
  if (server === undefined || server === null) return guest;
  if (isPlainObject(guest) && isPlainObject(server)) return { ...guest, ...server };
  return server;
}

// ─── context ────────────────────────────────────────────────────────────────

const UserStateContext = createContext(null);

export function UserStateProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [store, setStore] = useState({});
  const [ready, setReady] = useState(false);
  // 'user' = reads/writes go to the server; 'guest' = localStorage.
  const [mode, setMode] = useState('guest');
  const [syncError, setSyncError] = useState(null);

  const storeRef = useRef(store);
  const modeRef = useRef(mode);
  const queues = useRef({}); // per-key promise chain keeps writes in order

  // Load whenever the signed-in user changes.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    migrateLegacyKeys();

    async function load() {
      setReady(false);
      if (!userId) {
        const guest = loadGuest();
        if (cancelled) return;
        storeRef.current = guest;
        modeRef.current = 'guest';
        setStore(guest);
        setMode('guest');
        setSyncError(null);
        setReady(true);
        return;
      }

      try {
        const server = (await api.getState()) || {};
        const guest = loadGuest();
        for (const [key, gv] of Object.entries(guest)) {
          const merged = mergeValues(gv, server[key]);
          if (JSON.stringify(merged) !== JSON.stringify(server[key])) {
            await api.putState(key, merged);
            server[key] = merged;
          }
        }
        clearGuest();
        if (cancelled) return;
        storeRef.current = server;
        modeRef.current = 'user';
        setStore(server);
        setMode('user');
        setSyncError(null);
      } catch (err) {
        // API unreachable: keep working locally; it will be merged next load.
        if (cancelled) return;
        const guest = loadGuest();
        storeRef.current = guest;
        modeRef.current = 'guest';
        setStore(guest);
        setMode('guest');
        setSyncError(err?.message || 'Could not reach the server');
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  const persist = useCallback((key, value) => {
    if (modeRef.current !== 'user') {
      writeGuest(key, value);
      return;
    }
    const del = value === undefined || value === null;
    const prev = queues.current[key] || Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(() => (del ? api.deleteState(key) : api.putState(key, value)))
      .then(() => setSyncError(null))
      .catch((err) => {
        // Keep a local copy so the change isn't lost; merged on next load.
        writeGuest(key, value);
        setSyncError(err?.message || 'Could not save to the server');
      });
    queues.current[key] = next;
  }, []);

  // set(key, value) or set(key, prev => next). undefined/null deletes the key.
  const set = useCallback(
    (key, valueOrUpdater) => {
      const prevVal = storeRef.current[key];
      const nextVal =
        typeof valueOrUpdater === 'function' ? valueOrUpdater(prevVal) : valueOrUpdater;
      if (nextVal === prevVal) return;
      const nextStore = { ...storeRef.current };
      if (nextVal === undefined || nextVal === null) delete nextStore[key];
      else nextStore[key] = nextVal;
      storeRef.current = nextStore;
      setStore(nextStore);
      persist(key, nextVal);
    },
    [persist]
  );

  const remove = useCallback((key) => set(key, undefined), [set]);

  const value = useMemo(
    () => ({ store, ready, mode, syncError, set, remove }),
    [store, ready, mode, syncError, set, remove]
  );

  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

export function useUserStateStore() {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error('useUserStateStore must be used within UserStateProvider');
  return ctx;
}

// const [value, setValue] = useUserState('some:key', defaultValue)
export function useUserState(key, defaultValue) {
  const { store, set } = useUserStateStore();
  const value = store[key] === undefined ? defaultValue : store[key];
  const setValue = useCallback((v) => set(key, v), [set, key]);
  return [value, setValue];
}
