/**
 * @fileoverview Derive an admin-facing ticket priority from workflow state and event date.
 */

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

function getDaysUntilEvent(eventDate) {
  if (!eventDate) return Number.POSITIVE_INFINITY;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDay = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(eventDay.getTime())) return Number.POSITIVE_INFINITY;

  return Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Ticket priority is intentionally workflow-oriented:
 * - resolved tickets are low priority
 * - needs_review is always high because it blocks a decision
 * - pending tickets become high as the event approaches
 * - otherwise, fall back to the backend priority
 *
 * @param {object} request
 * @returns {{ level: 'high'|'medium'|'low', label: string, reason: string, styles: string }}
 */
export function getTicketPriority(request) {
  const status = request.status ?? 'pending';
  const basePriority = request.priority ?? 'medium';
  const daysUntilEvent = getDaysUntilEvent(request.eventDate);

  if (status === 'fulfilled' || status === 'rejected') {
    return {
      level: 'low',
      label: 'Low',
      reason: 'Resolved ticket',
      styles: PRIORITY_STYLES.low,
    };
  }

  if (status === 'needs_review') {
    return {
      level: 'high',
      label: 'High',
      reason: 'Needs admin review',
      styles: PRIORITY_STYLES.high,
    };
  }

  if (status === 'pending' && daysUntilEvent <= 7) {
    return {
      level: 'high',
      label: 'High',
      reason: 'Pending with an event in the next 7 days',
      styles: PRIORITY_STYLES.high,
    };
  }

  if (status === 'approved' && daysUntilEvent <= 7) {
    return {
      level: 'medium',
      label: 'Medium',
      reason: 'Approved and happening soon',
      styles: PRIORITY_STYLES.medium,
    };
  }

  if (basePriority === 'high') {
    return {
      level: 'high',
      label: 'High',
      reason: 'High-volume or high-impact request',
      styles: PRIORITY_STYLES.high,
    };
  }

  if (basePriority === 'low') {
    return {
      level: 'low',
      label: 'Low',
      reason: 'Lower-impact request',
      styles: PRIORITY_STYLES.low,
    };
  }

  return {
    level: 'medium',
    label: 'Medium',
    reason: 'Standard handling priority',
    styles: PRIORITY_STYLES.medium,
  };
}
