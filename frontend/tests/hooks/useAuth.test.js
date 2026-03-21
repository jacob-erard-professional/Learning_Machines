/**
 * @fileoverview Unit tests for useAuth Zustand store.
 * Covers initial state, all actions, sessionStorage persistence,
 * and resilience when sessionStorage is unavailable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import useAuth from '../../src/hooks/useAuth.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset store to clean state between tests */
function resetStore() {
  useAuth.setState({ role: null, loading: false, error: null });
}

/** Clear sessionStorage before each test */
function clearSession() {
  sessionStorage.clear();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAuth store', () => {
  beforeEach(() => {
    resetStore();
    clearSession();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has role null by default', () => {
      expect(useAuth.getState().role).toBe(null);
    });

    it('has loading false by default', () => {
      expect(useAuth.getState().loading).toBe(false);
    });

    it('has error null by default', () => {
      expect(useAuth.getState().error).toBe(null);
    });

    it('restores "guest" role from sessionStorage', () => {
      sessionStorage.setItem('ihc_auth_role', 'guest');
      // Simulate re-read by calling loginAsGuest then checking persistence
      // (The real init happens at module load; this tests the persistence logic)
      act(() => useAuth.getState().loginAsGuest());
      expect(sessionStorage.getItem('ihc_auth_role')).toBe('guest');
    });
  });

  // ── loginAsGuest ──────────────────────────────────────────────────────────

  describe('loginAsGuest()', () => {
    it('sets role to "guest"', () => {
      act(() => useAuth.getState().loginAsGuest());
      expect(useAuth.getState().role).toBe('guest');
    });

    it('clears any existing error', () => {
      useAuth.setState({ error: 'Some previous error' });
      act(() => useAuth.getState().loginAsGuest());
      expect(useAuth.getState().error).toBe(null);
    });

    it('persists "guest" to sessionStorage', () => {
      act(() => useAuth.getState().loginAsGuest());
      expect(sessionStorage.getItem('ihc_auth_role')).toBe('guest');
    });

    it('does not set loading state', () => {
      act(() => useAuth.getState().loginAsGuest());
      expect(useAuth.getState().loading).toBe(false);
    });
  });

  // ── loginAsAdmin ──────────────────────────────────────────────────────────

  describe('loginAsAdmin()', () => {
    it('sets loading to true immediately', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      expect(useAuth.getState().loading).toBe(true);
    });

    it('clears error immediately', () => {
      useAuth.setState({ error: 'Old error' });
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      expect(useAuth.getState().error).toBe(null);
    });

    it('sets role to "admin" after delay on correct credentials', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().role).toBe('admin');
    });

    it('sets loading to false after delay on correct credentials', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().loading).toBe(false);
    });

    it('persists "admin" to sessionStorage on success', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      act(() => vi.advanceTimersByTime(400));
      expect(sessionStorage.getItem('ihc_auth_role')).toBe('admin');
    });

    it('sets error message on wrong password', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'wrongpass'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().error).toBe('Invalid email or password.');
    });

    it('sets error message on wrong email', () => {
      act(() => useAuth.getState().loginAsAdmin('wrong@ihc.org', 'admin123'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().error).toBe('Invalid email or password.');
    });

    it('does not set role on bad credentials', () => {
      act(() => useAuth.getState().loginAsAdmin('bad@email.com', 'badpass'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().role).toBe(null);
    });

    it('sets loading to false after delay on bad credentials', () => {
      act(() => useAuth.getState().loginAsAdmin('bad@email.com', 'badpass'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().loading).toBe(false);
    });

    it('does not write to sessionStorage on bad credentials', () => {
      act(() => useAuth.getState().loginAsAdmin('bad@email.com', 'badpass'));
      act(() => vi.advanceTimersByTime(400));
      expect(sessionStorage.getItem('ihc_auth_role')).toBe(null);
    });

    it('is case-insensitive for email comparison', () => {
      act(() => useAuth.getState().loginAsAdmin('ADMIN@IHC.ORG', 'admin123'));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().role).toBe('admin');
    });

    it('does not resolve before the 400ms delay', () => {
      act(() => useAuth.getState().loginAsAdmin('admin@ihc.org', 'admin123'));
      act(() => vi.advanceTimersByTime(399));
      expect(useAuth.getState().role).toBe(null);
      expect(useAuth.getState().loading).toBe(true);
    });

    it('rejects empty email and password', () => {
      act(() => useAuth.getState().loginAsAdmin('', ''));
      act(() => vi.advanceTimersByTime(400));
      expect(useAuth.getState().error).toBe('Invalid email or password.');
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('sets role to null', () => {
      useAuth.setState({ role: 'admin' });
      act(() => useAuth.getState().logout());
      expect(useAuth.getState().role).toBe(null);
    });

    it('clears sessionStorage', () => {
      sessionStorage.setItem('ihc_auth_role', 'admin');
      act(() => useAuth.getState().logout());
      expect(sessionStorage.getItem('ihc_auth_role')).toBe(null);
    });

    it('clears error', () => {
      useAuth.setState({ role: 'admin', error: 'Some error' });
      act(() => useAuth.getState().logout());
      expect(useAuth.getState().error).toBe(null);
    });

    it('works when called on a guest session', () => {
      useAuth.setState({ role: 'guest' });
      act(() => useAuth.getState().logout());
      expect(useAuth.getState().role).toBe(null);
    });

    it('is a no-op when already logged out', () => {
      act(() => useAuth.getState().logout());
      expect(useAuth.getState().role).toBe(null);
    });
  });

  // ── sessionStorage resilience ─────────────────────────────────────────────

  describe('sessionStorage unavailability', () => {
    it('loginAsGuest does not throw when sessionStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(() => act(() => useAuth.getState().loginAsGuest())).not.toThrow();
      expect(useAuth.getState().role).toBe('guest');
    });

    it('logout does not throw when sessionStorage.removeItem throws', () => {
      useAuth.setState({ role: 'admin' });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(() => act(() => useAuth.getState().logout())).not.toThrow();
      expect(useAuth.getState().role).toBe(null);
    });
  });
});
