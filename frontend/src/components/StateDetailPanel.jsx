/**
 * @fileoverview Slide-in right panel for a selected state on the choropleth map.
 * Shows aggregated stats, a list of all requests for that state, and an
 * "Open Request" button that launches the full RequestDetail modal.
 */

import { useEffect, useRef } from 'react';
import StatusBadge from './ui/StatusBadge.jsx';

/** Full state names for display */
const STATE_NAMES = {
  UT: 'Utah',
  ID: 'Idaho',
  NV: 'Nevada',
  CO: 'Colorado',
  MT: 'Montana',
  WY: 'Wyoming',
  KS: 'Kansas',
};

/** Compact ISO date → "Apr 15, 2026" */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Right slide-in panel listing all requests for the selected state.
 *
 * @param {object}   props
 * @param {string}   props.stateAbbr       - Two-letter state code, e.g. 'UT'
 * @param {Array}    props.requests        - Requests whose eventZip maps to this state
 * @param {object[]} props.geoRows         - Geo summary rows for this state (from mockGeoData.summary)
 * @param {() => void}          props.onClose       - Close the panel
 * @param {(id: string) => void} props.onOpenRequest - Open full detail for a request
 * @returns {JSX.Element}
 */
export default function StateDetailPanel({ stateAbbr, requests, geoRows, onClose, onOpenRequest }) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Focus the close button when panel opens
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, [stateAbbr]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr;
  const totalRequests = requests.length;
  const pending  = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length;
  const review   = requests.filter((r) => r.status === 'needs_review').length;
  const rejected = requests.filter((r) => r.status === 'rejected').length;

  const highDemandCities = geoRows.filter((r) => r.flag === 'high_demand').map((r) => r.city);
  const underservedCities = geoRows.filter((r) => r.flag === 'underserved').map((r) => r.city);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${stateName} requests`}
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-periwinkle-100 border border-brand-periwinkle-200 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-brand-purple-600">{stateAbbr}</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy-500 leading-tight">{stateName}</h2>
              <p className="text-xs text-gray-500">{totalRequests} request{totalRequests !== 1 ? 's' : ''} in state</p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close state panel"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-purple-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
          {[
            { label: 'Pending',  value: pending,  color: 'text-brand-yellow-600' },
            { label: 'Review',   value: review,   color: 'text-orange-500' },
            { label: 'Approved', value: approved, color: 'text-green-600' },
            { label: 'Rejected', value: rejected, color: 'text-red-500' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-3 px-2">
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs text-gray-500 mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Geo flag callouts */}
        {(highDemandCities.length > 0 || underservedCities.length > 0) && (
          <div className="px-5 py-3 border-b border-gray-100 space-y-1.5">
            {highDemandCities.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-brand-yellow-500 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-gray-700">
                  <span className="font-semibold text-brand-yellow-700">High demand: </span>
                  {highDemandCities.join(', ')}
                </p>
              </div>
            )}
            {underservedCities.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-brand-periwinkle-400 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-gray-700">
                  <span className="font-semibold text-brand-navy-500">Underserved: </span>
                  {underservedCities.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Request list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">No requests yet for {stateName}</p>
              <p className="text-xs text-gray-400 mt-1">Requests will appear here once submitted.</p>
            </div>
          ) : (
            requests.map((req) => (
              <RequestCard key={req.id} request={req} onOpen={() => onOpenRequest(req.id)} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Compact request card shown inside the state panel.
 *
 * @param {{ request: object, onOpen: () => void }} props
 */
function RequestCard({ request, onOpen }) {
  const isOutOfArea = !request.isInServiceArea;

  return (
    <div
      className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
        isOutOfArea ? 'border-gray-200 bg-gray-50' : 'border-brand-periwinkle-100 bg-white'
      }`}
    >
      {/* Top row: ID + status */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-semibold text-brand-purple-600">{request.id}</span>
        <StatusBadge status={request.status} />
      </div>

      {/* Event name */}
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{request.eventName}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-3">
        <span>{request.requestorName}</span>
        <span aria-hidden="true">·</span>
        <span>{request.eventCity}</span>
        <span aria-hidden="true">·</span>
        <span>{fmtDate(request.eventDate)}</span>
        {request.estimatedAttendees && (
          <>
            <span aria-hidden="true">·</span>
            <span>{request.estimatedAttendees} attendees</span>
          </>
        )}
      </div>

      {/* Fulfillment route tag */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs bg-brand-periwinkle-50 text-brand-navy-500 px-2 py-0.5 rounded-full border border-brand-periwinkle-100">
          {request.fulfillmentRoute === 'staff_deployment' && '👥 Staff Deployment'}
          {request.fulfillmentRoute === 'mail' && '📬 Mail'}
          {request.fulfillmentRoute === 'pickup' && '📦 Pickup'}
          {!request.fulfillmentRoute && '—'}
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-semibold text-brand-purple-600 hover:text-brand-purple-800 px-3 py-1.5 rounded-lg border border-brand-periwinkle-200 hover:bg-brand-periwinkle-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-purple-500"
        >
          Open Request →
        </button>
      </div>
    </div>
  );
}
