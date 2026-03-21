/**
 * @fileoverview IHC gradient "ih" monogram + brand text wordmark.
 * Renders an SVG monogram with a pink-to-orange linearGradient alongside
 * the "Intermountain / Children's Health" text lockup.
 *
 * @param {{ size?: 'sm' | 'md' | 'lg', darkMode?: boolean }} props
 */
export default function IHCLogo({ size = 'md', darkMode = false }) {
  const sizes = {
    sm: { mark: 32, fontSize: '11px', lineHeight: '14px' },
    md: { mark: 40, fontSize: '13px', lineHeight: '16px' },
    lg: { mark: 56, fontSize: '17px', lineHeight: '21px' },
  };
  const s = sizes[size] || sizes.md;
  const textColor = darkMode ? '#FFFFFF' : '#1A1A4E';
  const subtextColor = darkMode ? 'rgba(255,255,255,0.75)' : '#4b4b9f';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.mark * 0.25 + 'px' }}>
      {/* Gradient "ih" monogram */}
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="ih-gradient" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>
        {/* i: vertical bar */}
        <rect x="10" y="20" width="8" height="26" rx="4" fill="url(#ih-gradient)" />
        {/* i: dot */}
        <circle cx="14" cy="12" r="5" fill="url(#ih-gradient)" />
        {/* h: left vertical bar */}
        <rect x="24" y="10" width="8" height="36" rx="4" fill="url(#ih-gradient)" />
        {/* h: right vertical bar */}
        <rect x="40" y="28" width="8" height="18" rx="4" fill="url(#ih-gradient)" />
        {/* h: arch connecting the two bars */}
        <path
          d="M32 30 Q32 22 40 22 Q48 22 48 30"
          stroke="url(#ih-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Brand text */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: s.lineHeight }}>
        <span
          style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: s.fontSize,
            color: textColor,
            letterSpacing: '-0.01em',
          }}
        >
          Intermountain
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: s.fontSize,
            color: subtextColor,
            letterSpacing: '0.01em',
          }}
        >
          Children's Health
        </span>
      </div>
    </div>
  );
}
