/**
 * @fileoverview RequestCard component for the admin ticket queue.
 * Displays a summary of a single request with status badge and route icon.
 */

import StatusBadge from './StatusBadge.jsx';

/** Route icon components */
const ROUTE_ICONS = {
  staff_deployment: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  pickup: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
    </svg>
  ),
};

const ROUTE_LABELS = {
  staff_deployment: 'Staff Deployment',
  mail: 'Mail',
  pickup: 'Pickup',
};

/**
 * Summary card for a single request, used in the ticket queue.
 *
 * @param {object} props
 * @param {object} props.request - Request summary object
 * @param {() => void} props.onClick - Opens detail panel
 * @param {boolean} [props.isSelected] - Whether this card is currently selected
 * @returns {JSX.Element}
 */
export default function RequestCard({ request, onClick, isSelected = false }) {
  const routeIcon = ROUTE_ICONS[request.fulfillmentRoute];
  const routeLabel = ROUTE_LABELS[request.fulfillmentRoute] ?? request.fulfillmentRoute;

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  const eventDate = request.eventDate
    ? new Date(request.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={`Request ${request.id}: ${request.eventName}, ${eventDate}, ${request.eventCity}. Status: ${request.status}`}
      className={[
        'w-full px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-all duration-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ihc-blue-500',
        'border-b border-gray-100 last:border-0',
        isSelected
          ? 'bg-ihc-blue-50 border-l-4 border-l-ihc-blue-500 pl-3'
          : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent',
      ].join(' ')}
    >
      {/* Route icon */}
      <span
        className={`shrink-0 mt-0.5 ${isSelected ? 'text-ihc-blue-500' : 'text-gray-400'}`}
        aria-label={`Route: ${routeLabel}`}
      >
        {routeIcon}
      </span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono text-gray-400 shrink-0">{request.id}</span>
          <StatusBadge status={request.status} size="sm" />
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{request.eventName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {request.eventCity} · {eventDate}
        </p>
        {request.aiTags?.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {request.aiTags.slice(0, 3).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
