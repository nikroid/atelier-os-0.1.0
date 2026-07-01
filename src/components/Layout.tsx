import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { MODE_LABELS } from '../types/settings';
import { downloadBackup } from '../utils/backup';
import { getVersionLabel, APP_BUILD_TIME } from '../version';
import { NavIcons, type NavIconKey } from './SidebarIcons';

const MOBILE_BREAKPOINT = 900;
const STORAGE_KEY = 'atelier-sidebar-collapsed';

interface NavItem {
  to: string;
  label: string;
  icon: NavIconKey;
  end?: boolean;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return mobile;
}

export function Layout() {
  const { mode } = useSettings();
  const labels = MODE_LABELS[mode];
  const location = useLocation();
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth <= MOBILE_BREAKPOINT) return true;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const nav: NavItem[] = [
    { to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true },
    { to: '/artistes', label: labels.artists, icon: 'artist' },
    { to: '/oeuvres', label: labels.works, icon: 'works' },
    { to: '/expositions', label: 'Expositions', icon: 'exhibition' },
    { to: '/contacts', label: 'Contacts', icon: 'contacts' },
    { to: '/editeur', label: 'Éditeur', icon: 'editor' },
    { to: '/generer', label: 'Générer', icon: 'generate' },
    { to: '/parametres', label: 'Paramètres', icon: 'settings' },
  ];

  const isExpanded = isMobile ? mobileOpen : !collapsed;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      return;
    }
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, [isMobile]);

  const appClass = [
    'app',
    isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed',
    isMobile ? 'sidebar-mobile' : 'sidebar-desktop',
  ].join(' ');

  return (
    <div className={appClass}>
      {isMobile && mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="sidebar" aria-label="Navigation principale">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">AO</span>
            <div className="brand-text">
              <strong>Atelier OS</strong>
              <small>{labels.title}</small>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isExpanded ? 'Réduire le menu' : 'Ouvrir le menu'}
            aria-expanded={isExpanded}
          >
            {NavIcons.menu}
          </button>
        </div>

        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon">{NavIcons[item.icon]}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="btn-ghost btn-sm sidebar-export"
            title="Exporter .artdb"
            onClick={() => downloadBackup()}
          >
            <span className="nav-icon">{NavIcons.export}</span>
            <span className="nav-label">Exporter .artdb</span>
          </button>
          <div className="sidebar-footer-credits sidebar-footer-meta">
            <span className="app-version" title={APP_BUILD_TIME}>
              v{getVersionLabel()}
            </span>
            <span className="app-version">Powered by Subline Studio</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
