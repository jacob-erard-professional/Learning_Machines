/**
 * @fileoverview IHC-branded application shell — dark theme.
 * Header, skip-to-content, responsive nav, footer. Fully keyboard accessible.
 */

import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

const GUEST_NAV = [
  { label: 'Submit Request', to: '/', end: true },
  { label: 'Chat Intake',    to: '/chat' },
];

const ADMIN_NAV = [
  { label: 'Dashboard',   to: '/admin',            end: true },
  { label: 'Analytics',   to: '/admin/analytics' },
  { label: 'Geo Equity',  to: '/admin/geo' },
  { label: 'Simulation',  to: '/admin/simulate' },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate  = useNavigate();
  const { role, logout } = useAuth();

  if (role === null) return <Navigate to="/login" replace />;

  const navItems = role === 'admin' ? ADMIN_NAV : GUEST_NAV;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Close mobile menu on route change
  useState(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Skip to content */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30"
        role="banner"
        style={{
          background: 'rgba(11,13,20,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-sub)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo mark + wordmark */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(168,180,248,0.1)', border: '1px solid rgba(168,180,248,0.2)' }}
                aria-hidden="true"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="1" y="6" width="16" height="6" rx="3" fill="var(--accent-blue)" />
                  <rect x="6" y="1" width="6" height="16" rx="3" fill="var(--accent-blue)" />
                </svg>
              </div>
              <div className="min-w-0">
                <div
                  className="font-semibold text-sm leading-tight truncate"
                  style={{ color: 'var(--txt-hi)', fontFamily: 'Syne, sans-serif' }}
                >
                  Intermountain Healthcare
                </div>
                <div className="text-[10px] leading-tight truncate" style={{ color: 'var(--txt-lo)' }}>
                  Community Health
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ' +
                    (isActive
                      ? 'text-[var(--accent-blue)] bg-[rgba(168,180,248,0.1)]'
                      : 'text-[var(--txt-mid)] hover:text-[var(--txt-hi)] hover:bg-white/[0.05]')
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Divider */}
              <span className="mx-2 h-4 w-px" style={{ background: 'var(--border-sub)' }} aria-hidden="true" />

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150"
                style={{ color: 'var(--txt-lo)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--txt-hi)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--txt-lo)'; e.currentTarget.style.background = 'transparent'; }}
              >
                Sign out
              </button>
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md transition-colors"
              style={{ color: 'var(--txt-mid)' }}
              onClick={() => setMobileOpen((p) => !p)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav
            id="mobile-nav"
            className="md:hidden px-4 pb-4 pt-2"
            style={{ borderTop: '1px solid var(--border-sub)' }}
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  'block px-3 py-2 rounded-md text-sm font-medium mb-0.5 transition-colors ' +
                  (isActive
                    ? 'text-[var(--accent-blue)] bg-[rgba(168,180,248,0.1)]'
                    : 'text-[var(--txt-mid)] hover:text-[var(--txt-hi)] hover:bg-white/[0.05]')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium mt-1 transition-colors"
              style={{ color: 'var(--txt-lo)' }}
            >
              Sign out
            </button>
          </nav>
        )}
      </header>

      {/* ── Main content ── */}
      <main id="main-content" className="flex-1 focus:outline-none" tabIndex="-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-5 mt-auto"
        role="contentinfo"
        style={{ borderTop: '1px solid var(--border-sub)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px]" style={{ color: 'var(--txt-lo)' }}>
            &copy; {new Date().getFullYear()} Intermountain Healthcare — Community Health Program
          </p>
        </div>
      </footer>
    </div>
  );
}
