/**
 * @fileoverview Slide-in toast notification stack.
 * Renders at bottom-right. Auto-dismisses after 5 seconds.
 * Accessible: role="status" for non-urgent, role="alert" for errors.
 */

import useRequests from '../hooks/useRequests.js';

/** Icon and color configuration per notification type */
const TOAST_CONFIG = {
  success: {
    bg: 'bg-white border-l-4 border-ihc-teal-500',
    icon: (
      <svg className="w-5 h-5 text-ihc-teal-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Success',
    role: 'status',
  },
  warning: {
    bg: 'bg-white border-l-4 border-ihc-amber-500',
    icon: (
      <svg className="w-5 h-5 text-ihc-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Warning',
    role: 'status',
  },
  info: {
    bg: 'bg-white border-l-4 border-ihc-blue-500',
    icon: (
      <svg className="w-5 h-5 text-ihc-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Info',
    role: 'status',
  },
  error: {
    bg: 'bg-white border-l-4 border-red-500',
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Error',
    role: 'alert',
  },
};

/**
 * Toast notification container. Renders all active notifications.
 * Mount once in the page root (e.g., AdminDashboard).
 *
 * @returns {JSX.Element|null}
 */
export default function NotificationToast() {
  const notifications = useRequests((s) => s.notifications);
  const dismissNotification = useRequests((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notif) => {
        const config = TOAST_CONFIG[notif.type] ?? TOAST_CONFIG.info;
        return (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg ${config.bg}`}
            role={config.role}
            aria-label={`${config.title}: ${notif.message}`}
          >
            <span className="shrink-0 mt-0.5">{config.icon}</span>
            <p className="text-sm text-gray-800 flex-1">{notif.message}</p>
            <button
              type="button"
              onClick={() => dismissNotification(notif.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500 rounded"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
