import { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

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
  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => {}} />
      <div className="layout-body" style={{ display: 'block' }}>
        <main>{children}</main>
      </div>
    </div>
  );
}
