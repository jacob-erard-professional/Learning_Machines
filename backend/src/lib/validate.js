/**
 * @file validate.js
 * Input validation for the request intake form.
 * Returns structured errors so the API can return field-level feedback
 * to the frontend without any 500s.
 */

import { RequestType } from './enums.js';

// RFC 5322 simplified email regex — covers the vast majority of real addresses
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// US/Canada phone: optional +1 prefix, then 10 digits with common separators
const PHONE_REGEX = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

// 5-digit ZIP or ZIP+4 (e.g. 84101 or 84101-1234)
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// Valid requestType values from the enum
const VALID_REQUEST_TYPES = new Set(Object.values(RequestType));

/**
 * Validates the raw request body from POST /api/requests.
 * Checks all required fields and format constraints.
 * Does NOT check business rules like duplicates — that's the service layer's job.
 *
 * @param {Object} body - Raw request body from Express
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRequest(body) {
  const errors = {};

  // --- Required string fields ---
  if (!body.requestorName || !String(body.requestorName).trim()) {
    errors.requestorName = 'Requestor name is required.';
  }

  if (!body.requestorEmail || !String(body.requestorEmail).trim()) {
    errors.requestorEmail = 'Requestor email is required.';
  } else if (!EMAIL_REGEX.test(String(body.requestorEmail).trim())) {
    errors.requestorEmail = 'Must be a valid email address.';
  }

  if (!body.requestorPhone || !String(body.requestorPhone).trim()) {
    errors.requestorPhone = 'Requestor phone number is required.';
  } else if (!PHONE_REGEX.test(String(body.requestorPhone).trim())) {
    errors.requestorPhone = 'Must be a valid US phone number (e.g. 801-555-0100).';
  }

  if (!body.eventName || !String(body.eventName).trim()) {
    errors.eventName = 'Event name is required.';
  }

  if (!body.eventCity || !String(body.eventCity).trim()) {
    errors.eventCity = 'Event city is required.';
  }

  // --- Event date: required and must be today or future ---
  if (!body.eventDate || !String(body.eventDate).trim()) {
    errors.eventDate = 'Event date is required.';
  } else {
    // Compare date strings (YYYY-MM-DD) in UTC to avoid timezone drift
    const today = new Date().toISOString().slice(0, 10);
    const provided = String(body.eventDate).trim();

    // Basic format check before date comparison
    if (!/^\d{4}-\d{2}-\d{2}$/.test(provided)) {
      errors.eventDate = 'Event date must be in YYYY-MM-DD format.';
    } else if (provided < today) {
      errors.eventDate = 'Event date must be today or in the future.';
    }
  }

  // --- Zip code: required, 5-digit or ZIP+4 ---
  if (!body.eventZip || !String(body.eventZip).trim()) {
    errors.eventZip = 'Event zip code is required.';
  } else if (!ZIP_REGEX.test(String(body.eventZip).trim())) {
    errors.eventZip = 'Zip code must be 5 digits (84101) or ZIP+4 (84101-1234).';
  }

  // --- Request type: required, must be a valid enum value ---
  if (!body.requestType || !String(body.requestType).trim()) {
    errors.requestType = 'Request type is required.';
  } else if (!VALID_REQUEST_TYPES.has(String(body.requestType).trim())) {
    errors.requestType = `Must be one of: ${[...VALID_REQUEST_TYPES].join(', ')}.`;
  }

  // --- Optional alternate contact email ---
  if (body.alternateContactEmail && String(body.alternateContactEmail).trim()) {
    if (!EMAIL_REGEX.test(String(body.alternateContactEmail).trim())) {
      errors.alternateContactEmail = 'Alternate contact email must be a valid email address.';
    }
  }

  // --- Optional numeric field with bounds check ---
  if (body.estimatedAttendees !== undefined && body.estimatedAttendees !== null && body.estimatedAttendees !== '') {
    const num = Number(body.estimatedAttendees);
    if (!Number.isInteger(num) || num < 1 || num > 100000) {
      errors.estimatedAttendees = 'Estimated attendees must be a positive integer no greater than 100,000.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
