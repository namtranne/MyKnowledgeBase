import { NavLink, Link } from 'react-router-dom';
import Search from './Search.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

function AccountButton() {
  const { isAuthenticated, user, openAuth, logout, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    const label = user?.displayName || user?.email || 'Account';
    return (
      <div className="navbar__account">
        <span className="navbar__account-name" title={user?.email}>
          {label}
        </span>
        <button className="navbar__auth-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button className="navbar__auth-btn navbar__auth-btn--primary" onClick={openAuth}>
      Sign in
    </button>
  );
}

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
      <AccountButton />
    </header>
  );
}
