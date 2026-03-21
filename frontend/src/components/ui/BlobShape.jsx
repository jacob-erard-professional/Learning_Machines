/**
 * @fileoverview Six distinct organic SVG blob shapes for decorative backgrounds.
 * Each variant is a unique hand-crafted path in a 100×100 viewBox.
 * Fill color is passed as a hex prop; aria-hidden ensures screen readers skip these.
 *
 * @param {{ variant?: 1|2|3|4|5|6, color?: string, className?: string, style?: object }} props
 */
const BLOBS = {
  1: 'M54,8 C72,2 92,18 90,42 C88,66 68,80 44,78 C20,76 2,58 6,34 C10,10 36,14 54,8Z',
  2: 'M50,6 C76,0 98,24 94,52 C90,80 62,96 36,88 C10,80 -4,52 8,26 C20,0 24,12 50,6Z',
  3: 'M56,10 C80,4 100,32 92,58 C84,84 56,98 30,88 C4,78 -6,48 8,24 C22,0 32,16 56,10Z',
  4: 'M44,8 C70,0 98,26 94,56 C90,86 60,102 30,90 C0,78 -8,46 8,20 C24,-6 18,16 44,8Z',
  5: 'M58,12 C82,6 104,36 96,62 C88,88 58,102 30,92 C2,82 -6,52 10,26 C26,0 34,18 58,12Z',
  6: 'M48,6 C74,-2 100,24 96,54 C92,84 62,100 34,92 C6,84 -6,50 8,24 C22,-2 22,14 48,6Z',
};

export default function BlobShape({ variant = 1, color = '#E91E8C', className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BLOBS[variant] || BLOBS[1]} fill={color} />
    </svg>
  );
}
