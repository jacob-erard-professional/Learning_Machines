/**
 * @fileoverview Brand-styled Button component.
 * Supports primary, secondary, and danger variants with size options.
 * Fully accessible: visible focus ring, aria-busy on loading, aria-disabled.
 */

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  type = 'button',
  ariaLabel,
  className = '',
}) {
  const isDisabled = disabled || loading;

  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-full',
    'transition-all duration-150 ease-in-out',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500',
    'select-none',
  ];

  const variantClasses = {
    primary: [
      'bg-brand-navy-500 text-white',
      'hover:bg-brand-navy-600 active:bg-brand-navy-700',
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ],
    secondary: [
      'bg-white text-brand-navy-500 border-2 border-brand-navy-500',
      'hover:bg-brand-periwinkle-50 active:bg-brand-periwinkle-100',
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ],
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 active:bg-red-800',
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ],
  };

  const sizeClasses = {
    sm: 'text-sm px-4 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-7 py-3',
  };

  const allClasses = [
    ...baseClasses,
    ...(variantClasses[variant] || variantClasses.primary),
    sizeClasses[size] || sizeClasses.md,
    className,
  ].join(' ');

  function handleClick(e) {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  }

  return (
    <button
      type={type}
      className={allClasses}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-label={ariaLabel}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
