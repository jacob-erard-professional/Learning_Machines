/**
 * @fileoverview IHC-branded application shell with header, navigation,
 * and skip-to-content link. Fully keyboard accessible.
 */

import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import IHCLogo from './ui/IHCLogo.jsx';
import BlobShape from './ui/BlobShape.jsx';

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
            <div className="flex items-center min-w-0">
              <IHCLogo size="md" />
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
      <footer className="relative overflow-hidden bg-brand-navy-500 text-white mt-auto" style={{ backgroundColor: '#1A1A4E', color: 'white' }} role="contentinfo">
        {/* Decorative blob shapes */}
        <BlobShape
          variant={2}
          color="#E91E8C"
          className="absolute blob-float-slow"
          style={{ width: '220px', height: '220px', top: '-60px', right: '-40px', opacity: 0.10, pointerEvents: 'none' }}
        />
        <BlobShape
          variant={5}
          color="#F5C518"
          className="absolute blob-float"
          style={{ width: '160px', height: '160px', bottom: '-50px', left: '10%', opacity: 0.08, pointerEvents: 'none' }}
        />
        <BlobShape
          variant={4}
          color="#6B2FD9"
          className="absolute blob-float-med"
          style={{ width: '180px', height: '180px', top: '-40px', left: '40%', opacity: 0.09, pointerEvents: 'none' }}
        />
        <BlobShape
          variant={1}
          color="#A8B4F8"
          className="absolute blob-float-slow"
          style={{ width: '140px', height: '140px', bottom: '-30px', right: '20%', opacity: 0.08, pointerEvents: 'none' }}
        />

        {/* 3-column grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Column 1: Brand */}
            <div>
              <IHCLogo size="sm" darkMode />
              <p className="mt-3 text-sm text-white/60 leading-relaxed max-w-xs">
                Bringing community health resources to the people who need them most.
              </p>
            </div>

            {/* Column 2: For Patients */}
            <nav aria-label="Footer navigation for patients">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                For Patients
              </p>
              <ul className="space-y-2">
                <li>
                  <NavLink
                    to="/"
                    end
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Submit a Request
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/chat"
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Chat with AI Assistant
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Column 3: For Admins */}
            <nav aria-label="Footer navigation for admins">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                For Admins
              </p>
              <ul className="space-y-2">
                <li>
                  <NavLink
                    to="/admin"
                    end
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Admin Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/analytics"
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Analytics
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/geo"
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Geo Equity
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/simulate"
                    className="text-white/70 hover:text-white text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-400 rounded"
                  >
                    Simulation
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>

          {/* Bottom copyright strip */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-center text-xs text-brand-periwinkle-200">
              &copy; {new Date().getFullYear()} Intermountain Healthcare. Community Health Program.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
