import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDocs } from '../../content/search.js';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      setResults(searchDocs(query));
      setActive(0);
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (route) => {
    navigate(route);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active].route); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="search" ref={ref}>
      <input
        className="search__input"
        type="search"
        placeholder="Search docs…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim().length >= 2 && (
        <div className="search__results">
          {results.length === 0 ? (
            <div className="search__empty">No matches for “{query}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.route}
                className={`search__result${i === active ? ' active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.route)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div className="search__result-title">{r.title}</div>
                {r.crumb && <div className="search__result-crumb">{r.crumb}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
