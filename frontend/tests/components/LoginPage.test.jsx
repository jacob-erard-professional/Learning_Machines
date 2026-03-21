/**
 * @fileoverview Tests for LoginPage component.
 * Covers rendering, guest path, admin form validation, credential errors,
 * loading state, post-auth navigation, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../src/pages/LoginPage.jsx';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLoginAsGuest = vi.fn();
const mockLoginAsAdmin = vi.fn();

vi.mock('../../src/hooks/useAuth.js');
import useAuth from '../../src/hooks/useAuth.js';

/** Default unauthenticated state */
function mockUnauthenticated() {
  useAuth.mockReturnValue({
    role: null,
    loading: false,
    error: null,
    loginAsGuest: mockLoginAsGuest,
    loginAsAdmin: mockLoginAsAdmin,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnauthenticated();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders IHC brand name in the header', () => {
      renderPage();
      expect(screen.getByText('Intermountain Healthcare')).toBeInTheDocument();
    });

    it('renders the page heading', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /welcome to community health/i })).toBeInTheDocument();
    });

    it('renders the Community Member button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /continue as community member/i })).toBeInTheDocument();
    });

    it('renders the Admin Sign In heading', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /admin sign in/i })).toBeInTheDocument();
    });

    it('renders the email input', () => {
      renderPage();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('renders the password input', () => {
      renderPage();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the Sign In submit button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the "or" divider between the two paths', () => {
      renderPage();
      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('renders footer copyright', () => {
      renderPage();
      expect(screen.getByText(/© \d{4} intermountain healthcare/i, { selector: 'p' })).toBeInTheDocument();
    });
  });

  // ── Guest path ────────────────────────────────────────────────────────────

  describe('guest path', () => {
    it('calls loginAsGuest when Community Member button is clicked', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /continue as community member/i }));
      expect(mockLoginAsGuest).toHaveBeenCalledTimes(1);
    });

    it('does not call loginAsAdmin when Community Member button is clicked', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /continue as community member/i }));
      expect(mockLoginAsAdmin).not.toHaveBeenCalled();
    });

    it('navigates to "/" when role becomes "guest"', () => {
      useAuth.mockReturnValue({
        role: 'guest',
        loading: false,
        error: null,
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  // ── Admin form — local validation ─────────────────────────────────────────

  describe('admin form local validation', () => {
    it('shows email required error on blur when empty', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
    });

    it('shows email format error on blur with invalid value', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'notanemail' } });
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByText('Must be a valid email address.')).toBeInTheDocument();
      });
    });

    it('shows password required error on blur when empty', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/^password/i));
      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('shows both errors when submitting completely empty form', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });

    it('does not call loginAsAdmin when form has local validation errors', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(mockLoginAsAdmin).not.toHaveBeenCalled();
      });
    });

    it('does not call loginAsAdmin when only email is filled', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@ihc.org' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(mockLoginAsAdmin).not.toHaveBeenCalled();
      });
    });

    it('does not call loginAsAdmin when only password is filled', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'admin123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(mockLoginAsAdmin).not.toHaveBeenCalled();
      });
    });

    it('clears email error when a valid email is typed after blur', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@ihc.org' } });
      await waitFor(() => {
        expect(screen.queryByText('Email address is required.')).not.toBeInTheDocument();
      });
    });
  });

  // ── Admin form — credential submission ───────────────────────────────────

  describe('admin form credential submission', () => {
    it('calls loginAsAdmin with the entered email and password', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@ihc.org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'admin123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(mockLoginAsAdmin).toHaveBeenCalledWith('admin@ihc.org', 'admin123');
      });
    });

    it('calls loginAsAdmin exactly once per submit', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@ihc.org' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'admin123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(mockLoginAsAdmin).toHaveBeenCalledTimes(1);
      });
    });

    it('navigates to "/admin" when role becomes "admin"', () => {
      useAuth.mockReturnValue({
        role: 'admin',
        loading: false,
        error: null,
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  // ── Error display ─────────────────────────────────────────────────────────

  describe('store error display', () => {
    it('shows the error banner when store error is set', () => {
      useAuth.mockReturnValue({
        role: null,
        loading: false,
        error: 'Invalid email or password.',
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    });

    it('does not show error banner when error is null', () => {
      renderPage();
      // Only local validation alerts would exist — and none are triggered here
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('error banner is visible alongside the form', () => {
      useAuth.mockReturnValue({
        role: null,
        loading: false,
        error: 'Invalid email or password.',
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('Sign In button has aria-busy="true" when loading', () => {
      useAuth.mockReturnValue({
        role: null,
        loading: true,
        error: null,
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute('aria-busy', 'true');
    });

    it('Sign In button is not aria-busy when not loading', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /sign in/i })).not.toHaveAttribute('aria-busy', 'true');
    });
  });

  // ── Already authenticated on mount ───────────────────────────────────────

  describe('redirect when already authenticated', () => {
    it('redirects guest to "/" immediately on mount', () => {
      useAuth.mockReturnValue({
        role: 'guest',
        loading: false,
        error: null,
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('redirects admin to "/admin" immediately on mount', () => {
      useAuth.mockReturnValue({
        role: 'admin',
        loading: false,
        error: null,
        loginAsGuest: mockLoginAsGuest,
        loginAsAdmin: mockLoginAsAdmin,
      });
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });

    it('does not navigate when role is null', () => {
      renderPage();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('email input has aria-required="true"', () => {
      renderPage();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-required', 'true');
    });

    it('password input has aria-required="true"', () => {
      renderPage();
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('aria-required', 'true');
    });

    it('email input gets aria-invalid="true" after empty blur', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('password input gets aria-invalid="true" after empty blur', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/^password/i));
      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('email input is not aria-invalid when valid', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).not.toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('error messages have role="alert"', async () => {
      renderPage();
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.some((el) => el.textContent.includes('Email address is required.'))).toBe(true);
      });
    });

    it('header has role="banner"', () => {
      renderPage();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('footer has role="contentinfo"', () => {
      renderPage();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('password input type is "password" (not plain text)', () => {
      renderPage();
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('trims whitespace-only email as invalid', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: '   ' } });
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
    });

    it('accepts valid email with subdomain', async () => {
      renderPage();
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@sub.domain.org' } });
      fireEvent.blur(screen.getByLabelText(/email address/i));
      await waitFor(() => {
        expect(screen.queryByText('Must be a valid email address.')).not.toBeInTheDocument();
      });
    });

    it('does not show errors on initial render before any interaction', () => {
      renderPage();
      expect(screen.queryByText('Email address is required.')).not.toBeInTheDocument();
      expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
    });

    it('submit triggers both errors when both fields are untouched', async () => {
      renderPage();
      fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form'));
      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });
    });
  });
});
