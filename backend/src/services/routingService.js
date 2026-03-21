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
 * Routing rules — applied in priority order across all selected types:
 * 1. staff_support + in service area → STAFF_DEPLOYMENT (highest priority)
 * 2. mailed_materials → MAIL
 * 3. pickup → PICKUP
 * 4. staff_support but outside service area → MAIL (can't deploy)
 *
 * @param {string|string[]} requestTypes - One or more RequestType enum values
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
export function determineRoute(requestTypes, zip, estimatedAttendees, eventDate) {
  // Normalise: accept legacy single string or new array
  const types = Array.isArray(requestTypes) ? requestTypes : [requestTypes];

  // Check geographic coverage — determines whether staff deployment is possible
  const inServiceArea = isInServiceArea(zip);

  const hasStaff = types.includes('staff_support');
  const hasMail  = types.includes('mailed_materials');
  const hasPickup = types.includes('pickup');

  let route;
  let routingReason;

  if (hasStaff && inServiceArea) {
    // Staff support wins when the event is within the service area
    route = FulfillmentRoute.STAFF_DEPLOYMENT;
    routingReason = types.length > 1
      ? 'Staff support selected and event is within service area (primary route); additional fulfillment types noted'
      : 'Event is within service area and eligible for staff support';
  } else if (hasMail) {
    route = FulfillmentRoute.MAIL;
    routingReason = hasStaff
      ? 'Staff support requested but location is outside service area — mail delivery assigned'
      : 'Requestor selected mail delivery';
  } else if (hasPickup) {
    route = FulfillmentRoute.PICKUP;
    routingReason = 'Requestor selected pickup';
  } else if (!inServiceArea) {
    // Outside Intermountain's geographic footprint — can only mail
    route = FulfillmentRoute.MAIL;
    routingReason = 'Location outside Intermountain service area — mail delivery assigned';
  } else {
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
