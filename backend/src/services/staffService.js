/**
 * @file staffService.js
 * Staffing feasibility and assignment logic.
 *
 * - checkStaffFeasibility: determines if enough staff are free for an event date
 * - assignStaffToRequest: assigns staff at approval time using even distribution
 */

import { getStaff, getAllRequests, updateRequest } from '../data/store.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Derives the UTC day-of-week name from an ISO date string (YYYY-MM-DD).
 * Uses UTC to avoid timezone drift.
 *
 * @param {string} eventDate - ISO date string e.g. "2026-03-26"
 * @returns {string} Day name e.g. "Thursday"
 */
function getDayName(eventDate) {
  const d = new Date(eventDate + 'T00:00:00Z');
  return DAY_NAMES[d.getUTCDay()];
}

/**
 * Returns staff who are active, available on the event's weekday,
 * and not already assigned to another approved request on that same date.
 *
 * @param {string} eventDate - ISO date string (YYYY-MM-DD)
 * @returns {Array<Object>} Free staff members
 */
export function getAvailableStaff(eventDate) {
  const dayName = getDayName(eventDate);
  const allStaff = getStaff();
  const allRequests = getAllRequests();

  // Collect staffIds already committed to approved requests on this exact date
  const busyStaffIds = new Set();
  for (const req of allRequests) {
    if (req.status === 'approved' && req.eventDate === eventDate && Array.isArray(req.assignedStaff)) {
      for (const s of req.assignedStaff) {
        if (s.staffId) busyStaffIds.add(s.staffId);
      }
    }
  }

  return allStaff.filter(
    (s) => s.active && s.availableWeekdays.includes(dayName) && !busyStaffIds.has(s.staffId)
  );
}

/**
 * Checks whether enough staff are free to cover an event.
 *
 * @param {string} eventDate - ISO date string
 * @param {number|null} estimatedAttendees - Expected attendee count
 * @returns {{ feasible: boolean, needed: number, freeCount: number, shortage: number }}
 */
export function checkStaffFeasibility(eventDate, estimatedAttendees) {
  const needed = Math.ceil((estimatedAttendees || 1) / 100);
  const free = getAvailableStaff(eventDate);
  const freeCount = free.length;
  const shortage = Math.max(0, needed - freeCount);
  return { feasible: freeCount >= needed, needed, freeCount, shortage };
}

/**
 * Counts how many non-rejected requests a staff member is assigned to.
 * Statuses counted: pending, needs_review, approved, fulfilled. Excluded: rejected.
 *
 * @param {string} staffId
 * @param {Array<Object>} allRequests
 * @returns {number}
 */
function countAssignments(staffId, allRequests) {
  return allRequests.filter(
    (r) =>
      r.status !== 'rejected' &&
      Array.isArray(r.assignedStaff) &&
      r.assignedStaff.some((s) => s.staffId === staffId)
  ).length;
}

/**
 * Assigns `needed` staff to a request at approval time.
 * Selects from free staff sorted by fewest existing assignments (even distribution).
 * If fewer than `needed` are available, assigns as many as possible.
 *
 * @param {string} requestId
 * @param {string} eventDate
 * @param {number} needed
 * @returns {Array<{ staffId: string, name: string, email: string, role: string }>}
 */
export function assignStaffToRequest(requestId, eventDate, needed) {
  const free = getAvailableStaff(eventDate);
  const allRequests = getAllRequests();

  const sorted = [...free].sort(
    (a, b) => countAssignments(a.staffId, allRequests) - countAssignments(b.staffId, allRequests)
  );

  const selected = sorted.slice(0, needed).map(({ staffId, name, email, role }) => ({
    staffId,
    name,
    email,
    role,
  }));

  updateRequest(requestId, { assignedStaff: selected });
  return selected;
}
