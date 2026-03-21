/**
 * @fileoverview Tests for ProtectedRoute component.
 * Verifies that admin routes are accessible only to the 'admin' role
 * and that all other roles/states are redirected to /login.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute.jsx';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/hooks/useAuth.js');
import useAuth from '../../src/hooks/useAuth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Dummy protected page to verify access was granted */
function AdminPage() {
  return <div>Admin Content</div>;
}

/** Login page stub to verify redirect destination */
function LoginPage() {
  return <div>Login Page</div>;
}

/**
 * Render the protected route setup with a given initial path.
 * Structure:
 *   /login      → LoginPage (redirect target)
 *   /admin      → ProtectedRoute → AdminPage (protected child)
 */
function renderWithRole(role, initialPath = '/admin') {
  // ProtectedRoute uses useAuth((s) => s.role) — the selector pattern.
  // Mock must call the selector with the state object when a function is passed.
  useAuth.mockImplementation((selector) => {
    const state = { role };
    return typeof selector === 'function' ? selector(state) : state;
  });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Access granted ────────────────────────────────────────────────────────

  describe('admin role — access granted', () => {
    it('renders the protected child route for role="admin"', () => {
      renderWithRole('admin');
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('does not render the login page for role="admin"', () => {
      renderWithRole('admin');
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  // ── Access denied ─────────────────────────────────────────────────────────

  describe('guest role — redirects to /login', () => {
    it('renders the login page for role="guest"', () => {
      renderWithRole('guest');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('does not render admin content for role="guest"', () => {
      renderWithRole('guest');
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('null role — redirects to /login', () => {
    it('renders the login page for role=null', () => {
      renderWithRole(null);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('does not render admin content for role=null', () => {
      renderWithRole(null);
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('undefined role — redirects to /login', () => {
    it('renders the login page for role=undefined', () => {
      renderWithRole(undefined);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  // ── Multiple protected child routes ───────────────────────────────────────

  describe('multiple protected child routes', () => {
    function renderMultipleRoutes(role, initialPath) {
      useAuth.mockImplementation((selector) => {
        const state = { role };
        return typeof selector === 'function' ? selector(state) : state;
      });
      return render(
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<div>Admin Dashboard</div>} />
              <Route path="/admin/analytics" element={<div>Analytics Page</div>} />
              <Route path="/admin/geo" element={<div>Geo Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    }

    it('allows admin to access /admin/analytics', () => {
      renderMultipleRoutes('admin', '/admin/analytics');
      expect(screen.getByText('Analytics Page')).toBeInTheDocument();
    });

    it('allows admin to access /admin/geo', () => {
      renderMultipleRoutes('admin', '/admin/geo');
      expect(screen.getByText('Geo Page')).toBeInTheDocument();
    });

    it('redirects guest from /admin/analytics to login', () => {
      renderMultipleRoutes('guest', '/admin/analytics');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Analytics Page')).not.toBeInTheDocument();
    });

    it('redirects null from /admin/geo to login', () => {
      renderMultipleRoutes(null, '/admin/geo');
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Geo Page')).not.toBeInTheDocument();
    });
  });
});
