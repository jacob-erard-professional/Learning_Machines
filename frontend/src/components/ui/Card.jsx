/**
 * @fileoverview Reusable Card component with brand styling.
 * Clean white card with subtle shadow, generous border-radius, optional hover state.
 */

export default function Card({ children, className = '', hover = false, as: Tag = 'div' }) {
  return (
    <Tag
      className={[
        'bg-white rounded-2xl border border-gray-100',
        'shadow-card',
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}
