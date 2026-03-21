/**
 * @fileoverview Admin dashboard — two-panel layout with filter bar,
 * ticket queue, and request detail panel. Includes Copilot button.
 */

import { useState } from 'react';
import FilterBar from '../components/FilterBar.jsx';
import TicketQueue from '../components/TicketQueue.jsx';
import RequestDetail from '../components/RequestDetail.jsx';
import NotificationToast from '../components/NotificationToast.jsx';
import CopilotSidebar from '../components/CopilotSidebar.jsx';
import useRequests from '../hooks/useRequests.js';

/**
 * Admin dashboard with two-panel layout.
 * Left: FilterBar + TicketQueue. Right: RequestDetail or empty state.
 * Floating Copilot button at bottom-right.
 *
 * @returns {JSX.Element}
 */
export default function AdminDashboard() {
  const selectedId = useRequests((s) => s.selectedId);
  const selectRequest = useRequests((s) => s.selectRequest);
  const updateLocalRequest = useRequests((s) => s.updateLocalRequest);
  const addNotification = useRequests((s) => s.addNotification);
  const [copilotOpen, setCopilotOpen] = useState(false);

  function handleRequestUpdated(updated) {
    updateLocalRequest(updated.id, updated);
  }

  return (
    <div className="h-[calc(100vh-64px-52px)] flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage and review Community Health requests</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/analytics"
              className="text-xs text-brand-purple-500 hover:text-brand-purple-700 font-medium underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded"
            >
              Analytics
            </a>
            <span className="text-gray-200">|</span>
            <a
              href="/admin/geo"
              className="text-xs text-brand-purple-500 hover:text-brand-purple-700 font-medium underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded"
            >
              Geo Equity
            </a>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel: Filter + Queue */}
        <div
          className={[
            'flex flex-col border-r border-gray-100 bg-white shrink-0',
            selectedId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full',
          ].join(' ')}
        >
          <FilterBar />
          <div className="flex-1 min-h-0 overflow-hidden">
            <TicketQueue />
          </div>
        </div>

        {/* Right panel: Detail or empty state */}
        <div className="flex-1 min-w-0 overflow-hidden bg-brand-periwinkle-50">
          {selectedId ? (
            <RequestDetail
              requestId={selectedId}
              onClose={() => selectRequest(null)}
              onUpdated={handleRequestUpdated}
            />
          ) : (
            <EmptyDetailState />
          )}
        </div>
      </div>

      {/* Floating Copilot button */}
      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-brand-purple-500 text-white shadow-lg hover:bg-brand-purple-600 hover:shadow-xl transition-all duration-200 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
        aria-label="Open AI Copilot assistant"
        title="AI Copilot"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Copilot sidebar */}
      <CopilotSidebar open={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* Toast notifications */}
      <NotificationToast />
    </div>
  );
}

/** Empty right panel state */
function EmptyDetailState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-brand-periwinkle-100 border border-brand-periwinkle-200 flex items-center justify-center mb-4" aria-hidden="true">
        <svg className="w-8 h-8 text-brand-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">Select a request</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">
        Click any request in the queue to view its full details and take action.
      </p>
    </div>
  );
}
