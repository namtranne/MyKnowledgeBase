import { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import NavMenu from './NavMenu.jsx';

export function DocLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="layout-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, minWidth: 0, display: 'flex' }}>{children}</main>
      </div>
    </div>
  );
}

export function PlainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => setMenuOpen((o) => !o)} />
      {/* Mobile-only navigation drawer (home / roadmap / checklist pages) */}
      <div
        className={`mobile-drawer__backdrop${menuOpen ? ' show' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <div className={`mobile-drawer${menuOpen ? ' open' : ''}`}>
        <div className="sidebar__group-label">Navigation</div>
        <NavMenu onNavigate={() => setMenuOpen(false)} />
      </div>
      <div className="layout-body" style={{ display: 'block' }}>
        <main>{children}</main>
      </div>
    </div>
  );
}
