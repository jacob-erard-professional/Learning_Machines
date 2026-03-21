/**
 * @fileoverview IHC-branded application shell with header, navigation,
 * and skip-to-content link. Fully keyboard accessible.
 */

import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

/** Navigation items for community members (guest role) */
const GUEST_NAV = [
  { label: 'Submit Request', to: '/', end: true },
  { label: 'Chat Intake', to: '/chat' },
];

/** Navigation items for admins */
const ADMIN_NAV = [
  { label: 'Admin Dashboard', to: '/admin', end: true },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Geo Equity', to: '/admin/geo' },
  { label: 'Simulation', to: '/admin/simulate' },
];

/**
 * Full IHC-branded application shell.
 * Includes skip-to-content, branded header, responsive navigation,
 * and main content outlet.
 *
 * @returns {JSX.Element}
 */
export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();

  // Redirect unauthenticated users to login
  if (role === null) {
    return <Navigate to="/login" replace />;
  }

  const navItems = role === 'admin' ? ADMIN_NAV : GUEST_NAV;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Close mobile menu on route change
  useState(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Skip to content — screen reader and keyboard accessible */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white text-brand-navy-500 shadow-sm border-b border-gray-100" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3 min-w-0">
              {/* IHC logo mark */}
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-periwinkle-50 border border-brand-periwinkle-200 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <rect x="1" y="8" width="20" height="6" rx="3" fill="#6B2FD9" />
                  <rect x="8" y="1" width="6" height="20" rx="3" fill="#6B2FD9" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight tracking-tight truncate text-brand-navy-500">
                  Intermountain Healthcare
                </div>
                <div className="text-brand-navy-400 text-xs leading-tight truncate">
                  Community Health Request System
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500',
                      isActive
                        ? 'bg-brand-periwinkle-100 text-brand-purple-600 font-semibold'
                        : 'text-brand-navy-500 hover:bg-brand-periwinkle-50 hover:text-brand-purple-600',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 text-brand-navy-500 hover:bg-brand-periwinkle-50 hover:text-brand-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
              >
                Sign Out
              </button>
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-brand-navy-400 hover:text-brand-purple-600 hover:bg-brand-periwinkle-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t border-gray-100 bg-white px-4 pb-3 pt-2"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'block px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500',
                    isActive
                      ? 'bg-brand-periwinkle-100 text-brand-purple-600 font-semibold'
                      : 'text-brand-navy-500 hover:bg-brand-periwinkle-50 hover:text-brand-purple-600',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium mt-1 transition-colors text-brand-navy-500 hover:bg-brand-periwinkle-50 hover:text-brand-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
            >
              Sign Out
            </button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 focus:outline-none" tabIndex="-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Intermountain Healthcare. Community Health Program.
          </p>
        </div>
      </footer>
    </div>
  );
}
