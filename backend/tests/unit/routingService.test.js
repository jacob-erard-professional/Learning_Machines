/**
 * @file tests/unit/routingService.test.js
 * Unit tests for the deterministic routing logic in routingService.js
 *
 * Tests cover:
 * - All three requestType branches
 * - In-service-area vs. out-of-service-area routing
 * - Priority thresholds (100 attendees)
 * - Urgency thresholds (14 days)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { determineRoute } from '../../src/services/routingService.js';

// A zip known to be in the service area (Salt Lake City)
const IN_AREA_ZIP = '84101';
// A zip known to be outside the service area (Los Angeles)
const OUT_OF_AREA_ZIP = '90210';

// Helper: build a date N days from today as YYYY-MM-DD
function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('determineRoute', () => {
  // ---------------------------------------------------------------------------
  // Route selection by requestType
  // ---------------------------------------------------------------------------

  describe('requestType: mailed_materials', () => {
    it('routes to MAIL regardless of zip code', () => {
      const result = determineRoute('mailed_materials', IN_AREA_ZIP, 50, dateInDays(30));
      expect(result.route).toBe('mail');
      expect(result.routingReason).toMatch(/mail delivery/i);
    });

    it('routes to MAIL even for out-of-area zip (rule 1 takes precedence)', () => {
      const result = determineRoute('mailed_materials', OUT_OF_AREA_ZIP, 50, dateInDays(30));
      expect(result.route).toBe('mail');
    });
  });

  describe('requestType: pickup', () => {
    it('routes to PICKUP regardless of zip code', () => {
      const result = determineRoute('pickup', IN_AREA_ZIP, 20, dateInDays(20));
      expect(result.route).toBe('pickup');
      expect(result.routingReason).toMatch(/pickup/i);
    });

    it('routes to PICKUP even for out-of-area zip', () => {
      const result = determineRoute('pickup', OUT_OF_AREA_ZIP, 20, dateInDays(20));
      expect(result.route).toBe('pickup');
    });
  });

  describe('requestType: staff_support', () => {
    it('routes to STAFF_DEPLOYMENT for in-service-area zip', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(30));
      expect(result.route).toBe('staff_deployment');
      expect(result.routingReason).toMatch(/service area/i);
    });

    it('routes to MAIL for out-of-service-area zip', () => {
      const result = determineRoute('staff_support', OUT_OF_AREA_ZIP, 50, dateInDays(30));
      expect(result.route).toBe('mail');
      expect(result.routingReason).toMatch(/outside.*service area/i);
    });
  });

  // ---------------------------------------------------------------------------
  // isInServiceArea flag
  // ---------------------------------------------------------------------------

  describe('isInServiceArea flag', () => {
    it('returns true for known in-area zip', () => {
      const result = determineRoute('staff_support', '84101', 50, dateInDays(30));
      expect(result.isInServiceArea).toBe(true);
    });

    it('returns false for out-of-area zip', () => {
      const result = determineRoute('staff_support', '90210', 50, dateInDays(30));
      expect(result.isInServiceArea).toBe(false);
    });

    it('returns true for Idaho zip', () => {
      const result = determineRoute('staff_support', '83201', 50, dateInDays(30));
      expect(result.isInServiceArea).toBe(true);
    });

    it('returns false for unknown/random zip', () => {
      const result = determineRoute('staff_support', '00001', 50, dateInDays(30));
      expect(result.isInServiceArea).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Priority threshold
  // ---------------------------------------------------------------------------

  describe('priority', () => {
    it('returns HIGH priority for 100+ attendees', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 100, dateInDays(30));
      expect(result.priority).toBe('high');
    });

    it('returns HIGH priority for 200 attendees', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 200, dateInDays(30));
      expect(result.priority).toBe('high');
    });

    it('returns MEDIUM priority for 99 attendees', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 99, dateInDays(30));
      expect(result.priority).toBe('medium');
    });

    it('returns MEDIUM priority for 1 attendee', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 1, dateInDays(30));
      expect(result.priority).toBe('medium');
    });

    it('returns MEDIUM priority when attendees is null', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, null, dateInDays(30));
      expect(result.priority).toBe('medium');
    });
  });

  // ---------------------------------------------------------------------------
  // Urgency threshold (14 days)
  // ---------------------------------------------------------------------------

  describe('urgency', () => {
    it('returns URGENT for event in 1 day', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(1));
      expect(result.urgency).toBe('urgent');
    });

    it('returns URGENT for event in 14 days (boundary)', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(14));
      expect(result.urgency).toBe('urgent');
    });

    it('returns STANDARD for event in 15 days', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(15));
      expect(result.urgency).toBe('standard');
    });

    it('returns STANDARD for event in 60 days', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(60));
      expect(result.urgency).toBe('standard');
    });
  });

  // ---------------------------------------------------------------------------
  // Return shape
  // ---------------------------------------------------------------------------

  describe('return shape', () => {
    it('always returns all required fields', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(30));
      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('routingReason');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('isInServiceArea');
    });

    it('routingReason is a non-empty string', () => {
      const result = determineRoute('staff_support', IN_AREA_ZIP, 50, dateInDays(30));
      expect(typeof result.routingReason).toBe('string');
      expect(result.routingReason.length).toBeGreaterThan(0);
    });
  });
});
