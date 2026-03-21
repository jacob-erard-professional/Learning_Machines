/**
 * @file calendar.js
 * Generates RFC 5545-compliant iCalendar (.ics) files for approved
 * staff deployment events. Files are served as downloads from the admin
 * dashboard "Approve" action.
 *
 * Uses the `ics` npm package — callback-based API wrapped in a Promise.
 */

import * as ics from 'ics';

/**
 * Generates an .ics calendar file string for a 2-hour community health event.
 * Called when an admin approves a staff_deployment request.
 *
 * @param {Object} request - Approved request object from the store
 * @param {string} request.id - Request ID (used as UID and in title)
 * @param {string} request.eventName - Event name
 * @param {string} request.eventDate - ISO date string (YYYY-MM-DD)
 * @param {string} request.eventCity - City where event is held
 * @param {string} request.eventZip - Zip code
 * @param {string} [request.requestorName] - Requestor name for the organizer field
 * @param {string} [request.requestorEmail] - Requestor email for the organizer field
 * @param {number} [request.estimatedAttendees] - Expected attendee count
 * @returns {Promise<string|null>} .ics string, or null on error
 */
export async function generateIcsFile(request) {
  try {
    const { eventDate, eventName, eventCity, eventZip, id, requestorName, requestorEmail, estimatedAttendees } = request;

    // Parse YYYY-MM-DD into [year, month, day] array as required by `ics`
    const [year, month, day] = eventDate.split('-').map(Number);

    // Default event start time: 9:00 AM local
    const startHour = 9;
    const startMinute = 0;

    const eventObj = {
      start: [year, month, day, startHour, startMinute],
      duration: { hours: 2 },
      title: `[Intermountain CH] ${eventName}`,
      description: `Community Health event: ${eventName}.\nEstimated attendees: ${estimatedAttendees ?? 'Unknown'}.\nRequest ID: ${id}`,
      location: `${eventCity}, ${eventZip}`,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      uid: `${id}@intermountainhealthcare.org`,
      // Include requestor as organizer if available
      ...(requestorEmail
        ? { organizer: { name: requestorName ?? 'Community Partner', email: requestorEmail } }
        : {}),
      categories: ['Community Health', 'Intermountain Healthcare'],
      productId: 'Intermountain Community Health Request System',
    };

    // Wrap the callback-based ics.createEvent in a Promise
    return await new Promise((resolve, reject) => {
      ics.createEvent(eventObj, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  } catch (err) {
    console.error('[calendar] Failed to generate .ics file:', err.message);
    return null;
  }
}
