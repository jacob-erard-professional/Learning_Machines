/**
 * @file enums.js
 * Central place for all domain enumerations used across the system.
 * Using Object.freeze ensures these are truly immutable constants.
 */

/**
 * Fulfillment pathway — auto-assigned by routing logic or manually overridden by admin.
 * @type {{ STAFF_DEPLOYMENT: string, MAIL: string, PICKUP: string }}
 */
export const FulfillmentRoute = Object.freeze({
  STAFF_DEPLOYMENT: 'staff_deployment',
  MAIL: 'mail',
  PICKUP: 'pickup',
});

/**
 * Lifecycle status of a request, from submission through resolution.
 * @type {{ PENDING: string, NEEDS_REVIEW: string, APPROVED: string, FULFILLED: string, REJECTED: string }}
 */
export const RequestStatus = Object.freeze({
  PENDING: 'pending',           // Newly submitted, awaiting admin action
  NEEDS_REVIEW: 'needs_review', // AI failed or flagged; admin must classify
  APPROVED: 'approved',         // Admin approved; calendar invite can be created
  FULFILLED: 'fulfilled',       // Materials shipped or event staffed
  REJECTED: 'rejected',         // Admin rejected with reason
});

/**
 * Category of Community Health assets being requested.
 * @type {{ MATERIALS: string, TOOLKITS: string, BEHAVIORAL_REINFORCEMENTS: string, PROGRAMS: string }}
 */
export const AssetCategory = Object.freeze({
  MATERIALS: 'materials',
  TOOLKITS: 'toolkits',
  BEHAVIORAL_REINFORCEMENTS: 'behavioral_reinforcements',
  PROGRAMS: 'programs',
});

/**
 * Request type as selected by the requestor on the intake form.
 * Drives the initial routing decision before AI classification.
 * @type {{ STAFF_SUPPORT: string, MAILED_MATERIALS: string, PICKUP: string }}
 */
export const RequestType = Object.freeze({
  STAFF_SUPPORT: 'staff_support',
  MAILED_MATERIALS: 'mailed_materials',
  PICKUP: 'pickup',
});

/**
 * Administrative priority level for request handling.
 * HIGH is assigned to high-attendance events (>=100 attendees).
 * @type {{ HIGH: string, MEDIUM: string, LOW: string }}
 */
export const Priority = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

/**
 * Urgency level based on event proximity.
 * URGENT when event is within 14 days of submission.
 * @type {{ URGENT: string, STANDARD: string }}
 */
export const UrgencyLevel = Object.freeze({
  URGENT: 'urgent',
  STANDARD: 'standard',
});

/**
 * Staffing feasibility flag — set when a staff_deployment request cannot be
 * fulfilled with currently available staff.
 * @type {{ INSUFFICIENT_STAFF: string, NO_STAFF_DATA: string }}
 */
export const StaffingFlag = Object.freeze({
  INSUFFICIENT_STAFF: 'insufficient_staff',
  NO_STAFF_DATA: 'no_staff_data',
});
