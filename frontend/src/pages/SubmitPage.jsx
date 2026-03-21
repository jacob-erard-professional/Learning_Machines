/**
 * @fileoverview Landing page — dark theme.
 * Hero with grid texture, two entry-path cards, stats strip.
 * Switches to inline RequestForm when user picks the form path.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import RequestForm from '../components/RequestForm.jsx';

/* ─── Entry card data ─── */
const ENTRIES = [
  {
    id: 'form',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    iconBg: 'rgba(168,180,248,0.12)',
    iconColor: 'var(--accent-blue)',
    accentColor: 'var(--accent-blue)',
    title: 'Structured Form',
    desc: 'Fill out a guided form with all event details. Best when you know exactly what you need — step-by-step with AI-assisted routing.',
    tags: ['Guided steps', 'AI routing', 'Instant confirm'],
    tagStyle: {
      background: 'rgba(168,180,248,0.08)',
      color: 'var(--accent-blue)',
      border: '1px solid rgba(168,180,248,0.2)',
    },
    cta: 'Start form',
    ctaStyle: {
      background: 'var(--accent-blue)',
      color: '#0B0D14',
    },
    ctaHoverStyle: {
      background: '#BEC8FA',
    },
    isLink: false,
  },
  {
    id: 'chat',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    iconBg: 'rgba(123,77,232,0.14)',
    iconColor: '#9B7DF5',
    accentColor: '#9B7DF5',
    title: 'Voice & Chat',
    desc: 'Speak or type naturally — our AI listens, extracts your event details conversationally, and builds the request for you.',
    tags: ['Natural language', 'Voice ready', 'AI-powered'],
    tagStyle: {
      background: 'rgba(123,77,232,0.1)',
      color: '#9B7DF5',
      border: '1px solid rgba(123,77,232,0.22)',
    },
    cta: 'Open chat',
    ctaStyle: {
      background: 'var(--accent-purple)',
      color: '#fff',
    },
    ctaHoverStyle: {
      background: '#8B5CF6',
    },
    isLink: true,
    to: '/chat',
  },
];

/* ─── Stats ─── */
const STATS = [
  { value: '7',      label: 'States served',       sub: 'UT · ID · NV · WY · MT · CO · KS' },
  { value: 'Claude', label: 'AI-powered routing',   sub: 'NLP classification on every request' },
  { value: '<24h',   label: 'Admin response time',  sub: 'Average review window' },
];

/* ─── EntryCard ─── */
function EntryCard({ entry, onClick }) {
  const [hovered, setHovered] = useState(false);

  const inner = (
    <div
      className="card-dark flex flex-col h-full p-6 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={!entry.isLink ? onClick : undefined}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-200"
        style={{
          background: hovered ? entry.iconBg.replace('0.12', '0.2').replace('0.14', '0.22') : entry.iconBg,
          color: entry.iconColor,
          boxShadow: hovered ? `0 0 0 1px ${entry.iconColor}22, 0 0 20px ${entry.iconColor}22` : 'none',
        }}
        aria-hidden="true"
      >
        {entry.icon}
      </div>

      {/* Text */}
      <h2
        className="text-base font-bold mb-2"
        style={{ fontFamily: 'Syne, sans-serif', color: 'var(--txt-hi)', fontSize: '1rem' }}
      >
        {entry.title}
      </h2>
      <p className="text-sm leading-relaxed flex-1 mb-5" style={{ color: 'var(--txt-mid)' }}>
        {entry.desc}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
            style={entry.tagStyle}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150"
        style={{
          ...entry.ctaStyle,
          ...(hovered ? entry.ctaHoverStyle : {}),
          letterSpacing: '0.01em',
        }}
      >
        {entry.cta}
      </button>
    </div>
  );

  if (entry.isLink) {
    return (
      <Link to={entry.to} className="block no-underline" aria-label={`${entry.title}: ${entry.cta}`}>
        {inner}
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${entry.title}: ${entry.cta}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      {inner}
    </div>
  );
}

/* ─── Landing ─── */
function LandingView({ onFormStart }) {
  return (
    <div className="relative min-h-[calc(100vh-56px)] flex flex-col">

      {/* Radial glow — top centre */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(107,47,217,0.14) 0%, rgba(168,180,248,0.06) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Dot grid */}
      <div className="dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto w-full px-5 sm:px-6 lg:px-8 pt-16 pb-20">

        {/* Badge */}
        <div className="anim-fade-up anim-d1 flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
            style={{
              background: 'rgba(168,180,248,0.08)',
              border: '1px solid rgba(168,180,248,0.18)',
              color: 'var(--accent-blue)',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.04em',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full glow-pulse"
              style={{ background: 'var(--accent-blue)' }}
              aria-hidden="true"
            />
            Intermountain Community Health Program
          </div>
        </div>

        {/* Hero heading */}
        <div className="anim-fade-up anim-d2 text-center mb-5">
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800 }}
          >
            Request{' '}
            <span className="text-gradient-blue">Community Health</span>
            {' '}Support
          </h1>
        </div>

        {/* Subtitle */}
        <div className="anim-fade-up anim-d3 text-center mb-12">
          <p
            className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto"
            style={{ color: 'var(--txt-mid)' }}
          >
            Bring Intermountain Healthcare's resources to your event. Our AI routes every request to the right team — instantly.
          </p>
        </div>

        {/* Entry cards */}
        <div className="anim-fade-up anim-d4 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {ENTRIES.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={entry.id === 'form' ? onFormStart : undefined}
            />
          ))}
        </div>

        {/* Stats strip */}
        <div
          className="anim-fade-up anim-d5 rounded-2xl px-6 py-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-sub)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center divide-y sm:divide-y-0 sm:divide-x"
               style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border-sub)' }}>
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center gap-0.5 ${i > 0 ? 'pt-4 sm:pt-0 sm:pl-4' : ''}`}
                style={{ borderColor: 'var(--border-sub)' }}
              >
                <span
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    color: 'var(--accent-blue)',
                  }}
                >
                  {stat.value}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--txt-hi)' }}>
                  {stat.label}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--txt-lo)' }}>
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Form view ─── */
function FormView({ onBack }) {
  return (
    <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 lg:px-8 py-8">

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors duration-150"
        style={{ color: 'var(--txt-mid)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-blue)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--txt-mid)'; }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Heading */}
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--txt-hi)' }}>
          Submit a Community Health Request
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--txt-mid)' }}>
          Fields marked <span className="text-red-400" aria-hidden="true">*</span> are required.
        </p>
      </div>

      <RequestForm />
    </div>
  );
}

/* ─── Page root ─── */
export default function SubmitPage() {
  const [showForm, setShowForm] = useState(false);

  return showForm
    ? <FormView onBack={() => setShowForm(false)} />
    : <LandingView onFormStart={() => setShowForm(true)} />;
}
