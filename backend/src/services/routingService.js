/**
 * @file routingService.js
 * Deterministic routing logic — assigns a FulfillmentRoute to every request
 * based on requestType, zip code, attendee count, and event proximity.
 *
 * This is intentionally NOT AI-driven. The AI (DecisionAgent) makes a
 * suggestion that informs review, but the deterministic logic here is the
 * authoritative routing decision. This makes the system auditable and
 * overridable without AI dependency.
 */

import { FulfillmentRoute, Priority, UrgencyLevel } from '../lib/enums.js';
import { isInServiceArea } from '../data/serviceAreaZips.js';

/**
 * Determines the fulfillment route for a community health request.
 * Also computes priority and urgency to pre-populate admin triage.
 *
 * Routing rules (in priority order):
 * 1. Requestor chose mailed_materials → MAIL
 * 2. Requestor chose pickup → PICKUP
 * 3. Zip not in service area → MAIL (can't deploy staff)
 * 4. In service area + staff_support → STAFF_DEPLOYMENT
 *
 * @param {string} requestType - One of the RequestType enum values
 * @param {string} zip - 5-digit event zip code
 * @param {number|null} estimatedAttendees - Expected attendee count
 * @param {string} eventDate - ISO date string (YYYY-MM-DD) of the event
 * @returns {{
 *   route: string,
 *   routingReason: string,
 *   priority: string,
 *   urgency: string,
 *   isInServiceArea: boolean
 * }}
 */
export function determineRoute(requestType, zip, estimatedAttendees, eventDate) {
  // Check geographic coverage — determines whether staff deployment is possible
  const inServiceArea = isInServiceArea(zip);

  let route;
  let routingReason;

  if (requestType === 'mailed_materials') {
    // Requestor explicitly chose mail delivery
    route = FulfillmentRoute.MAIL;
    routingReason = 'Requestor selected mail delivery';
  } else if (requestType === 'pickup') {
    // Requestor will pick up materials from a distribution point
    route = FulfillmentRoute.PICKUP;
    routingReason = 'Requestor selected pickup';
  } else if (!inServiceArea) {
    // Outside Intermountain's geographic footprint — can only mail
    route = FulfillmentRoute.MAIL;
    routingReason = 'Location outside Intermountain service area — mail delivery assigned';
  } else {
    // In-service-area staff_support request — eligible for staff deployment
    route = FulfillmentRoute.STAFF_DEPLOYMENT;
    routingReason = 'Event is within service area and eligible for staff support';
  }

  // Priority: HIGH for large events (>=100 attendees), MEDIUM otherwise
  const attendees = Number(estimatedAttendees) || 0;
  const priority = attendees >= 100 ? Priority.HIGH : Priority.MEDIUM;

  // Urgency: URGENT if event is within 14 days of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(eventDate + 'T00:00:00Z');
  const msUntilEvent = eventDay.getTime() - today.getTime();
  const daysUntilEvent = msUntilEvent / (1000 * 60 * 60 * 24);
  const urgency = daysUntilEvent <= 14 ? UrgencyLevel.URGENT : UrgencyLevel.STANDARD;

  return {
    route,
    routingReason,
    priority,
    urgency,
    isInServiceArea: inServiceArea,
  };
}
