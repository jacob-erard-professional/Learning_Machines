/**
 * @file tests/unit/validate.test.js
 * Unit tests for the input validation layer (lib/validate.js)
 *
 * Tests cover:
 * - All required fields
 * - Email format validation
 * - Date validation (past, present, future)
 * - Zip code format validation
 * - requestType enum validation
 * - estimatedAttendees bounds
 * - Valid full payloads pass cleanly
 */

import { describe, it, expect } from 'vitest';
import { validateRequest } from '../../src/lib/validate.js';

// Helper: build a future date N days from today as YYYY-MM-DD
function futureDate(n = 30) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pastDate(n = 1) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** A fully valid request body — used as baseline for mutation tests */
const VALID_BODY = {
  requestorName: 'Jane Smith',
  requestorEmail: 'jane@example.com',
  requestorPhone: '801-555-0100',
  eventName: 'Senior Health Fair',
  eventDate: futureDate(30),
  eventCity: 'Salt Lake City',
  eventZip: '84101',
  requestType: 'staff_support',
};

describe('validateRequest', () => {
  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('valid requests', () => {
    it('passes a complete valid body', () => {
      const { valid, errors } = validateRequest(VALID_BODY);
      expect(valid).toBe(true);
      expect(errors).toEqual({});
    });

    it('passes with optional fields present', () => {
      const body = {
        ...VALID_BODY,
        alternateContactName: 'Bob Jones',
        alternateContactEmail: 'bob@example.com',
        estimatedAttendees: 80,
        eventDescription: 'Free blood pressure screening',
        specialInstructions: 'Bring extra pamphlets',
        assetCategory: 'materials',
        materialPreferences: ['blood pressure cuffs'],
      };
      const { valid, errors } = validateRequest(body);
      expect(valid).toBe(true);
      expect(errors).toEqual({});
    });

    it('passes with requestType: mailed_materials', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestType: 'mailed_materials' });
      expect(valid).toBe(true);
    });

    it('passes with requestType: pickup', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestType: 'pickup' });
      expect(valid).toBe(true);
    });

    it('passes with event date = today', () => {
      const today = new Date().toISOString().slice(0, 10);
      const { valid } = validateRequest({ ...VALID_BODY, eventDate: today });
      expect(valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Required field validation
  // ---------------------------------------------------------------------------

  describe('requestorName', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorName: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorName');
    });

    it('fails when empty string', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorName: '' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorName');
    });

    it('fails when whitespace only', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorName: '   ' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorName');
    });
  });

  describe('requestorEmail', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorEmail: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorEmail');
    });

    it('fails with invalid email — no @', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorEmail: 'notanemail' });
      expect(valid).toBe(false);
      expect(errors.requestorEmail).toMatch(/valid email/i);
    });

    it('fails with invalid email — no domain', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorEmail: 'user@' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorEmail');
    });

    it('passes with valid email', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestorEmail: 'user@domain.org' });
      expect(valid).toBe(true);
    });

    it('passes with subdomain email', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestorEmail: 'user@mail.example.com' });
      expect(valid).toBe(true);
    });
  });

  describe('requestorPhone', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestorPhone: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestorPhone');
    });

    it('passes with any non-empty phone format', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestorPhone: '8015550100' });
      expect(valid).toBe(true);
    });
  });

  describe('eventName', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventName: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventName');
    });
  });

  describe('eventCity', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventCity: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventCity');
    });
  });

  // ---------------------------------------------------------------------------
  // eventDate validation
  // ---------------------------------------------------------------------------

  describe('eventDate', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventDate: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventDate');
    });

    it('fails for a past date', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventDate: pastDate(1) });
      expect(valid).toBe(false);
      expect(errors.eventDate).toMatch(/future/i);
    });

    it('fails for an old past date', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventDate: '2020-01-01' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventDate');
    });

    it('fails for wrong format (MM/DD/YYYY)', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventDate: '04/15/2027' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventDate');
    });

    it('passes for a future date', () => {
      const { valid } = validateRequest({ ...VALID_BODY, eventDate: futureDate(90) });
      expect(valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // eventZip validation
  // ---------------------------------------------------------------------------

  describe('eventZip', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventZip: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventZip');
    });

    it('fails with 4-digit zip', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventZip: '8410' });
      expect(valid).toBe(false);
      expect(errors.eventZip).toMatch(/5 digits/i);
    });

    it('fails with 6-digit zip', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventZip: '841010' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventZip');
    });

    it('fails with letters in zip', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, eventZip: '8410A' });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('eventZip');
    });

    it('passes with exactly 5 digits', () => {
      const { valid } = validateRequest({ ...VALID_BODY, eventZip: '84101' });
      expect(valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // requestType validation
  // ---------------------------------------------------------------------------

  describe('requestType', () => {
    it('fails when missing', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestType: undefined });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('requestType');
    });

    it('fails with invalid value', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, requestType: 'teleport' });
      expect(valid).toBe(false);
      expect(errors.requestType).toMatch(/one of/i);
    });

    it('passes with staff_support', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestType: 'staff_support' });
      expect(valid).toBe(true);
    });

    it('passes with mailed_materials', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestType: 'mailed_materials' });
      expect(valid).toBe(true);
    });

    it('passes with pickup', () => {
      const { valid } = validateRequest({ ...VALID_BODY, requestType: 'pickup' });
      expect(valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // estimatedAttendees (optional, but validated when present)
  // ---------------------------------------------------------------------------

  describe('estimatedAttendees', () => {
    it('passes when not provided', () => {
      const { valid } = validateRequest(VALID_BODY);
      expect(valid).toBe(true);
    });

    it('passes when null', () => {
      const { valid } = validateRequest({ ...VALID_BODY, estimatedAttendees: null });
      expect(valid).toBe(true);
    });

    it('passes with a positive integer', () => {
      const { valid } = validateRequest({ ...VALID_BODY, estimatedAttendees: 50 });
      expect(valid).toBe(true);
    });

    it('fails with 0', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, estimatedAttendees: 0 });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('estimatedAttendees');
    });

    it('fails with negative number', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, estimatedAttendees: -5 });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('estimatedAttendees');
    });

    it('fails when exceeding 100,000', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, estimatedAttendees: 100001 });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('estimatedAttendees');
    });

    it('passes with exactly 100,000', () => {
      const { valid } = validateRequest({ ...VALID_BODY, estimatedAttendees: 100000 });
      expect(valid).toBe(true);
    });

    it('fails with non-integer (decimal)', () => {
      const { valid, errors } = validateRequest({ ...VALID_BODY, estimatedAttendees: 50.5 });
      expect(valid).toBe(false);
      expect(errors).toHaveProperty('estimatedAttendees');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple errors at once
  // ---------------------------------------------------------------------------

  describe('multiple errors', () => {
    it('returns errors for all invalid fields simultaneously', () => {
      const { valid, errors } = validateRequest({});
      expect(valid).toBe(false);
      expect(Object.keys(errors).length).toBeGreaterThan(3);
      expect(errors).toHaveProperty('requestorName');
      expect(errors).toHaveProperty('requestorEmail');
      expect(errors).toHaveProperty('eventDate');
      expect(errors).toHaveProperty('eventZip');
      expect(errors).toHaveProperty('requestType');
    });
  });
});
