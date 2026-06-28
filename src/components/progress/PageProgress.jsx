import { useProgress } from './ProgressContext.jsx';

// Reading-progress summary bar shown at the top of tracked doc pages.
export default function PageProgress({ route }) {
  const { getPageStats, resetPage } = useProgress();
  const { checked, total, pct } = getPageStats(route);
  if (!total) return null;
  return (
    <div className="page-progress">
      <div className="page-progress__row">
        <span>
          Reading progress — <strong>{checked}</strong> / {total} sections
        </span>
        <span className="page-progress__pct">{pct}%</span>
      </div>
      <div className="page-progress__bar">
        <div className="page-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {checked > 0 && (
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <button className="page-progress__reset" onClick={() => resetPage(route)}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
