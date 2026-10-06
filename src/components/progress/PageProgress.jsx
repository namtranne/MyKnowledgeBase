import { useProgress } from './ProgressContext.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

// Reading-progress summary bar shown at the top of tracked doc pages.
export default function PageProgress({ route }) {
  const { getPageStats, resetPage, syncMode, syncError } = useProgress();
  const { openAuth } = useAuth();
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
      {syncMode === 'guest' && (
        <div className="page-progress__note" style={{ marginTop: 6, fontSize: '0.8em', opacity: 0.75 }}>
          {syncError ? (
            <>Couldn’t reach the server — progress is kept in this browser for now.</>
          ) : (
            <>
              Saved in this browser only.{' '}
              <button type="button" className="page-progress__reset" onClick={openAuth}>
                Sign in
              </button>{' '}
              to keep it in your account.
            </>
          )}
        </div>
      )}
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
