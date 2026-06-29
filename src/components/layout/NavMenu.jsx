import { NavLink } from 'react-router-dom';

// Primary navigation links, reused in the mobile drawer (home pages) and at the
// top of the docs sidebar drawer, so every page is reachable on small screens.
export default function NavMenu({ onNavigate }) {
  return (
    <nav className="nav-menu">
      <NavLink to="/" end className="nav-menu__link" onClick={onNavigate}>
        🏠 Home
      </NavLink>
      <NavLink to="/docs/intro" className="nav-menu__link" onClick={onNavigate}>
        📚 Docs
      </NavLink>
      <NavLink to="/dsa-roadmap" className="nav-menu__link" onClick={onNavigate}>
        🏋️ DSA Roadmap
      </NavLink>
      <NavLink to="/interview-checklist" className="nav-menu__link" onClick={onNavigate}>
        🎯 Interview Checklist
      </NavLink>
    </nav>
  );
}
