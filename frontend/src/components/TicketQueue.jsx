/**
 * @fileoverview Admin ticket queue with auto-refresh, loading skeletons,
 * and empty state.
 */

import { useEffect, useRef, useState } from 'react';
import useRequests from '../hooks/useRequests.js';
import RequestCard from './ui/RequestCard.jsx';

const AUTO_REFRESH_MS = 30_000;

/**
 * Admin ticket queue list with auto-refresh every 30 seconds.
 * Shows loading skeleton, empty state, and last-refreshed timestamp.
 *
 * @returns {JSX.Element}
 */
export default function TicketQueue() {
  const requests = useRequests((s) => s.requests);
  const total = useRequests((s) => s.total);
  const loading = useRequests((s) => s.loading);
  const error = useRequests((s) => s.error);
  const selectedId = useRequests((s) => s.selectedId);
  const lastRefreshed = useRequests((s) => s.lastRefreshed);
  const refreshRequests = useRequests((s) => s.refreshRequests);
  const selectRequest = useRequests((s) => s.selectRequest);

  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(refreshRequests, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshRequests]);

  // Update "X seconds ago" display
  useEffect(() => {
    if (!lastRefreshed) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastRefreshed) / 1000));
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [lastRefreshed]);

  return (
    <div className="flex flex-col h-full">
      {/* Queue header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Requests
            {!loading && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({total} total)
              </span>
            )}
          </h2>
          {lastRefreshed && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated: {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refreshRequests}
          disabled={loading}
          aria-label="Refresh request list"
          className="p-1.5 text-gray-400 hover:text-brand-purple-500 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100" role="alert">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={refreshRequests}
            className="text-xs font-medium text-red-700 underline mt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
          >
            Try again
          </button>
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-8" role="list" aria-label="Request queue" aria-live="polite" aria-busy={loading}>
        {/* Loading skeleton */}
        {loading && requests.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3.5 border-b border-gray-100 animate-pulse" aria-hidden="true">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="w-16 h-3 bg-gray-200 rounded" />
                      <div className="w-20 h-4 bg-gray-200 rounded-full" />
                    </div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded" />
                    <div className="w-1/2 h-3 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center" role="status">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3" aria-hidden="true">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">No requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Submissions will appear here as they come in.</p>
          </div>
        )}

        {/* Request list */}
        {requests.map((request) => (
          <div key={request.id} role="listitem">
            <RequestCard
              request={request}
              onClick={() => selectRequest(request.id)}
              isSelected={selectedId === request.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
