/**
 * @fileoverview Zustand store for client-side authentication.
 * Manages role-based access for the IHC Community Health Request System.
 * Auth is purely client-side (hackathon demo) — no backend calls.
 */

import { create } from 'zustand';

/** @typedef {'guest'|'admin'|'readonly_admin'|null} Role */

const ADMIN_CREDENTIALS = {
  admin: {
    email: 'admin@ihc.org',
    password: 'admin123',
  },
  readonly_admin: {
    email: 'viewer@ihc.org',
    password: 'viewer123',
  },
};
export const SESSION_KEY = 'ihc_auth_role';

/**
 * Read persisted role from sessionStorage.
 * Returns null if nothing is stored or storage is unavailable.
 * @returns {Role}
 */
function readPersistedRole() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored === 'admin' || stored === 'readonly_admin' || stored === 'guest' ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Persist role to sessionStorage.
 * @param {Role} role
 */
function persistRole(role) {
  try {
    if (role === null) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, role);
    }
  } catch {
    // Storage unavailable — continue without persistence
  }
}

/**
 * Zustand store for authentication state.
 *
 * State:
 * - role: Current user role ('guest' | 'admin' | 'readonly_admin' | null)
 *   null = unauthenticated, redirect to /login
 * - loading: Admin login in progress
 * - error: Login error message (invalid credentials, etc.)
 *
 * Actions:
 * - loginAsGuest(): Set role to 'guest', no credentials needed
 * - loginAsAdmin(email, password): Validate credentials, set admin role or set error
 * - logout(): Clear role and sessionStorage
 */
const useAuth = create((set) => ({
  role: readPersistedRole(),
  loading: false,
  error: null,

  /**
   * Log in as a community member guest — no credentials required.
   */
  loginAsGuest: () => {
    persistRole('guest');
    set({ role: 'guest', error: null });
  },

  /**
   * Log in as an admin with email and password.
   * Uses a short delay to simulate a real auth request.
   * @param {string} email
   * @param {string} password
   */
  loginAsAdmin: (email, password) => {
    set({ loading: true, error: null });
    setTimeout(() => {
      const normalizedEmail = email.trim().toLowerCase();
      const matchedRole = Object.entries(ADMIN_CREDENTIALS).find(([, credentials]) =>
        credentials.email === normalizedEmail && credentials.password === password
      )?.[0] ?? null;

      if (matchedRole) {
        persistRole(matchedRole);
        set({ role: matchedRole, loading: false });
      } else {
        set({ loading: false, error: 'Invalid email or password.' });
      }
    }, 400);
  },

  /**
   * Log out the current user and clear persisted session.
   */
  logout: () => {
    persistRole(null);
    set({ role: null, error: null });
  },
}));

export default useAuth;
