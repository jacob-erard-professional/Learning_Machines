/**
 * @fileoverview Accessible loading spinner component.
 * Uses role="status" and aria-label for screen reader support.
 */

/**
 * Animated loading spinner with IHC-branded colors.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Spinner size
 * @param {string} [props.label='Loading'] - Accessible label for screen readers
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.center=false] - Centers spinner in its container
 * @returns {JSX.Element}
 */
export default function LoadingSpinner({ size = 'md', label = 'Loading', className = '', center = false }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  const spinnerClasses = [
    sizeMap[size] || sizeMap.md,
    'rounded-full',
    'border-ihc-blue-200',
    'border-t-ihc-blue-500',
    'animate-spin',
  ].join(' ');

  if (center) {
    return (
      <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
        <div className={spinnerClasses} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <span className={spinnerClasses} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
