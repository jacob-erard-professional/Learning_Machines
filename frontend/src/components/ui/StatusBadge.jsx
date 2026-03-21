/**
 * @fileoverview StatusBadge — accessible color-coded status chips.
 */

const STATUS_LABELS = {
  pending:      'Pending',
  needs_review: 'Needs Review',
  approved:     'Approved',
  fulfilled:    'Fulfilled',
  rejected:     'Rejected',
};

const STATUS_STYLES = {
  pending:      'bg-brand-periwinkle-100 text-brand-navy-500 border border-brand-periwinkle-200',
  needs_review: 'bg-brand-yellow-100 text-brand-yellow-700 border border-brand-yellow-300',
  approved:     'bg-green-100 text-green-700 border border-green-200',
  fulfilled:    'bg-brand-purple-100 text-brand-purple-600 border border-brand-purple-200',
  rejected:     'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_DOT_STYLES = {
  pending:      'bg-brand-purple-500',
  needs_review: 'bg-brand-yellow-500',
  approved:     'bg-green-500',
  fulfilled:    'bg-brand-purple-500',
  rejected:     'bg-gray-400',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const label    = STATUS_LABELS[status] ?? status;
  const styles   = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
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
