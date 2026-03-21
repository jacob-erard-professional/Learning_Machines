/**
 * @fileoverview Reusable Card component with IHC-branded styling.
 * Clean white card with subtle shadow, rounded corners, and optional hover state.
 */

/**
 * White card container with IHC-branded shadow and border radius.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.hover=false] - Enables hover shadow lift effect
 * @param {React.ElementType} [props.as='div'] - HTML element to render as
 * @returns {JSX.Element}
 */
export default function Card({ children, className = '', hover = false, as: Tag = 'div' }) {
  return (
    <Tag
      className={[
        'bg-white rounded-xl border border-gray-100',
        'shadow-card',
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}
