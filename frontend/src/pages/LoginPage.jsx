/**
 * @fileoverview Login page — default landing for the IHC Community Health Request System.
 * Two entry paths: community member (no credentials) or admin (email + password).
 * Rendered outside AppShell so it has no nav chrome.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import IHCLogo from '../components/ui/IHCLogo.jsx';
import BlobShape from '../components/ui/BlobShape.jsx';
import useAuth from '../hooks/useAuth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Consistent input styling — matches RequestForm pattern */
function inputClasses(hasError) {
  return [
    'block w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
    'bg-white placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-brand-purple-500 focus:border-brand-purple-500',
    'transition-colors duration-100',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
      : 'border-gray-300 hover:border-gray-400',
  ].join(' ');
}

/**
 * Full-screen login page with IHC branding.
 * Redirects to appropriate page after successful authentication.
 *
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { role, loading, error, loginAsGuest, loginAsAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [localErrors, setLocalErrors] = useState({});

  // Re-validate a single field when touched and value changes
  function revalidateIfTouched(field, value) {
    setLocalErrors((prev) => {
      const next = { ...prev };
      if (field === 'email') {
        if (!value.trim()) {
          next.email = 'Email address is required.';
        } else if (!EMAIL_REGEX.test(value.trim())) {
          next.email = 'Must be a valid email address.';
        } else {
          delete next.email;
        }
      }
      if (field === 'password') {
        if (!value) {
          next.password = 'Password is required.';
        } else {
          delete next.password;
        }
      }
      return next;
    });
  }

  // Redirect once role is set
  useEffect(() => {
    if (role === 'guest') navigate('/', { replace: true });
    if (role === 'admin') navigate('/admin', { replace: true });
  }, [role, navigate]);

  function validateLocal() {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Must be a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    return errs;
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateLocal();
    setLocalErrors(errs);
  }

  function handleAdminSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validateLocal();
    setLocalErrors(errs);
    if (Object.keys(errs).length > 0) return;
    loginAsAdmin(email, password);
  }

  const emailError = touched.email && localErrors.email;
  const passwordError = touched.password && localErrors.password;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Semantic landmark for accessibility / tests — visually hidden */}
      <header role="banner" className="sr-only">
        Intermountain Healthcare
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
      {/* ── Left panel: hero (desktop only) ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center flex-1 relative overflow-hidden p-12"
        style={{ background: '#1A1A4E' }}
        aria-hidden="true"
      >
        {/* Decorative blobs */}
        <BlobShape
          variant={2}
          color="#E91E8C"
          className="absolute blob-float"
          style={{ width: '300px', height: '300px', top: '-60px', right: '-30px', opacity: 0.30, pointerEvents: 'none' }}
        />
        <BlobShape
          variant={4}
          color="#F5C518"
          className="absolute blob-float-slow"
          style={{ width: '250px', height: '250px', bottom: '-50px', left: '-40px', opacity: 0.25, pointerEvents: 'none' }}
        />
        <BlobShape
          variant={6}
          color="#6B2FD9"
          className="absolute blob-float-med"
          style={{ width: '200px', height: '200px', top: '10px', left: '-30px', opacity: 0.20, pointerEvents: 'none' }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-sm text-center">
          <IHCLogo size="lg" darkMode />
          <h2 className="font-display font-extrabold text-4xl text-white leading-tight mt-8 mb-4">
            Inspiring healthy communities.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            We're here to support your community events and health programs.
          </p>
          {/* Child photo with organic blob mask */}
          <img
            src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80"
            alt="Child running with joy"
            className="mt-8 w-64 h-64 object-cover mx-auto"
            style={{ borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%' }}
          />
        </div>
      </div>

      {/* ── Right panel: auth card ── */}
      <div className="bg-white flex flex-col items-center justify-center flex-shrink-0 w-full md:w-[480px] p-8 min-h-screen md:min-h-0">
        {/* Logo shown on mobile (left panel is hidden) */}
        <div className="mb-8 md:hidden">
          <IHCLogo size="md" />
        </div>

        <div className="w-full max-w-md">
          {/* Hero heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy-500 tracking-tight mb-2">
              Welcome to Community Health
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Choose how you'd like to continue below.
            </p>
          </div>

          {/* Guest path */}
          <Card className="p-6 mb-4">
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-salmon-50 border border-brand-salmon-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg className="w-5 h-5 text-brand-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 mb-0.5">Community Member</h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Submit a health support request or chat with our AI assistant. No account needed.
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={loginAsGuest}
                >
                  Continue as Community Member →
                </Button>
              </div>
            </div>
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5" aria-hidden="true">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Admin sign in */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-periwinkle-100 border border-brand-periwinkle-200 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg className="w-5 h-5 text-brand-navy-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Admin Sign In</h2>
                <p className="text-xs text-gray-500">IHC Community Health staff only</p>
              </div>
            </div>

            {/* Store-level error (wrong credentials) */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <svg className="mt-0.5 w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} noValidate>
              {/* Email */}
              <div className="mb-4">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Email address <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) revalidateIfTouched('email', e.target.value);
                  }}
                  onBlur={() => handleBlur('email')}
                  placeholder="admin@ihc.org"
                  aria-required="true"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'login-email-error' : undefined}
                  className={inputClasses(!!emailError)}
                />
                {emailError && (
                  <p id="login-email-error" className="mt-1 text-xs text-red-600" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Password <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) revalidateIfTouched('password', e.target.value);
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                  className={inputClasses(!!passwordError)}
                />
                {passwordError && (
                  <p id="login-password-error" className="mt-1 text-xs text-red-600" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
              >
                Sign In
              </Button>
            </form>
          </Card>

          {/* HIPAA trust strip */}
          <div className="bg-brand-cornflower-200/30 rounded-xl p-3 mt-6 text-center text-xs text-brand-navy-400">
            Secure · HIPAA-aware · Intermountain Health System
          </div>
        </div>
      </div>
    </div>{/* end flex-1 panels */}

      {/* Semantic footer for accessibility / tests — visually hidden */}
      <footer role="contentinfo" className="sr-only">
        <p>&copy; {new Date().getFullYear()} Intermountain Healthcare. Community Health Program.</p>
      </footer>
    </div>
  );
}
