/**
 * @fileoverview StatusBadge component maps RequestStatus values to
 * accessible, color-coded chips. Never uses color alone — always includes text label.
 */

/**
 * Maps RequestStatus values to human-readable labels.
 * @type {Record<string, string>}
 */
const STATUS_LABELS = {
  pending: 'Pending',
  needs_review: 'Needs Review',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  rejected: 'Rejected',
};

/**
 * Maps RequestStatus values to Tailwind class sets.
 * Rejected uses gray (not red) per IHC healthcare guidelines.
 * @type {Record<string, string>}
 */
const STATUS_STYLES = {
  pending: 'bg-ihc-blue-100 text-ihc-blue-700 border border-ihc-blue-200',
  needs_review: 'bg-ihc-amber-100 text-ihc-amber-700 border border-ihc-amber-300',
  approved: 'bg-green-100 text-ihc-green-600 border border-green-200',
  fulfilled: 'bg-ihc-teal-100 text-ihc-teal-600 border border-ihc-teal-300',
  rejected: 'bg-gray-100 text-gray-600 border border-gray-200',
};

/**
 * Small indicator dots — color reinforces but is not the sole indicator.
 * @type {Record<string, string>}
 */
const STATUS_DOT_STYLES = {
  pending: 'bg-ihc-blue-500',
  needs_review: 'bg-ihc-amber-500',
  approved: 'bg-ihc-green-500',
  fulfilled: 'bg-ihc-teal-500',
  rejected: 'bg-gray-400',
};

/**
 * Chip badge displaying request lifecycle status with text + color.
 *
 * @param {object} props
 * @param {'pending'|'needs_review'|'approved'|'fulfilled'|'rejected'} props.status - Request status
 * @param {'sm'|'md'} [props.size='sm'] - Badge size
 * @returns {JSX.Element}
 */
export default function StatusBadge({ status, size = 'sm' }) {
  const label = STATUS_LABELS[status] ?? status;
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const dotStyle = STATUS_DOT_STYLES[status] ?? STATUS_DOT_STYLES.pending;

  const sizeClasses = size === 'md'
    ? 'text-sm px-3 py-1 gap-1.5'
    : 'text-xs px-2.5 py-0.5 gap-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${styles}`}
      aria-label={`Status: ${label}`}
    >
      <span
        className={`rounded-full shrink-0 ${dotStyle} ${size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
