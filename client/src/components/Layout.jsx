import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { logout } from '../api/auth.js';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const now = new Date();
  const todayLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };

  const navItems = useMemo(() => ([
    { to: '/dashboard', label: 'Dashboard', icon: 'D' },
    { to: '/tomorrow', label: 'Tomorrow', icon: 'T' },
    { to: '/horizon/WEEKLY', label: 'Weekly', icon: 'W' },
    { to: '/horizon/MONTHLY', label: 'Monthly', icon: 'M' },
    { to: '/horizon/QUARTERLY', label: 'Quarterly', icon: 'Q' },
    { to: '/horizon/HALF_YEARLY', label: 'Half-Yearly', icon: 'H' },
    { to: '/horizon/YEARLY', label: 'Yearly', icon: 'Y' },
  ]), []);

  const secondaryItems = useMemo(() => ([
    { to: '/goals', label: 'Goals', icon: 'G' },
    { to: '/recurring', label: 'Recurring', icon: 'R' },
    { to: '/journal', label: 'Journal', icon: 'J' },
    { to: '/mindset', label: 'Mindset', icon: 'M' },
    { to: '/tags', label: 'Tags', icon: 'T' },
    { to: '/vault', label: 'Completed Vault', icon: 'V' },
  ]), []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div>
          <div className="brand">Control Tower</div>
          <div className="muted">Goal-driven planner</div>
        </div>
        <button className="sidebar-toggle" onClick={toggleCollapsed} aria-label="Toggle sidebar">
          {collapsed ? '»' : '«'}
        </button>
        <nav className="nav-group">
          {navItems.map((item) => (
            <NavLink key={item.to} className="nav-link" to={item.to} data-icon={item.icon} title={item.label}>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <nav className="nav-group">
          {secondaryItems.map((item) => (
            <NavLink key={item.to} className="nav-link" to={item.to} data-icon={item.icon} title={item.label}>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="badge">{todayLabel}</span>
        </div>
        <button className="button secondary" onClick={handleLogout}>Log out</button>
      </aside>
      <main className="main">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
