import { NavLink, Link } from 'react-router-dom';
import Search from './Search.jsx';

export default function Navbar({ onToggleSidebar }) {
  return (
    <header className="navbar">
      <button className="navbar__burger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        ☰
      </button>
      <Link to="/" className="navbar__brand">⚡ Knowledge Base</Link>
      <nav className="navbar__links">
        <NavLink to="/docs/intro" className="navbar__link">📚 Docs</NavLink>
        <NavLink to="/dsa-roadmap" className="navbar__link">🏋️ DSA Roadmap</NavLink>
        <NavLink to="/interview-checklist" className="navbar__link">🎯 Interview Checklist</NavLink>
      </nav>
      <span className="navbar__spacer" />
      <Search />
    </header>
  );
}
