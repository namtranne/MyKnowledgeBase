import { Link } from 'react-router-dom';

export default function Pagination({ prev, next }) {
  if (!prev && !next) return null;
  return (
    <nav className="pagination">
      {prev ? (
        <Link to={prev.route} className="pagination__link prev">
          <span className="pagination__sub">← Previous</span>
          <span className="pagination__label">{prev.title}</span>
        </Link>
      ) : <span style={{ flex: 1 }} />}
      {next ? (
        <Link to={next.route} className="pagination__link next">
          <span className="pagination__sub">Next →</span>
          <span className="pagination__label">{next.title}</span>
        </Link>
      ) : <span style={{ flex: 1 }} />}
    </nav>
  );
}
