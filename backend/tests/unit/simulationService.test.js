import { describe, expect, it } from 'vitest';
import { simulateScenario } from '../../src/services/simulationService.js';

const REQUESTS = [
  {
    id: 'REQ-1',
    eventZip: '84101',
    eventCity: 'Salt Lake City',
    fulfillmentRoute: 'staff_deployment',
    status: 'pending',
    urgency: 'urgent',
    isInServiceArea: true,
  },
  {
    id: 'REQ-2',
    eventZip: '84108',
    eventCity: 'Salt Lake City',
    fulfillmentRoute: 'staff_deployment',
    status: 'approved',
    urgency: 'standard',
    isInServiceArea: true,
  },
  {
    id: 'REQ-3',
    eventZip: '89101',
    eventCity: 'Las Vegas',
    fulfillmentRoute: 'mail',
    status: 'pending',
    urgency: 'standard',
    isInServiceArea: true,
  },
  {
    id: 'REQ-4',
    eventZip: '90210',
    eventCity: 'Beverly Hills',
    fulfillmentRoute: 'mail',
    status: 'needs_review',
    urgency: 'urgent',
    isInServiceArea: false,
  },
];

describe('simulateScenario', () => {
  it('models added staff as increased capacity and lower backlog', () => {
    const result = simulateScenario(REQUESTS, 'What if I had 3 more staff?');

    expect(result.scenarioType).toBe('staff_delta');
    expect(result.after.staffCapacity).toBeGreaterThan(result.before.staffCapacity);
    expect(result.after.pendingBacklog).toBeLessThan(result.before.pendingBacklog);
    expect(result.summary).toContain('Adding 3 staff members');
  });

  it('models demand growth by region as higher backlog', () => {
    const result = simulateScenario(REQUESTS, 'What if demand doubles in Las Vegas?');

    expect(result.scenarioType).toBe('demand_multiplier');
    expect(result.after.pendingBacklog).toBeGreaterThan(result.before.pendingBacklog);
    expect(result.affectedZips[0].zip).toBe('89101');
  });

  it('models mail shortages as more backlog', () => {
    const result = simulateScenario(REQUESTS, 'What if mailed materials ran out?');

    expect(result.scenarioType).toBe('mail_shortage');
    expect(result.after.pendingBacklog).toBeGreaterThan(result.before.pendingBacklog);
    expect(result.tradeoffs.length).toBeGreaterThan(0);
  });

  it('models service area expansion for supported state names', () => {
    const result = simulateScenario(REQUESTS, 'What if we opened a new service area in Colorado?');

    expect(result.scenarioType).toBe('service_area_expansion');
    expect(result.coverageChange).toContain('Colorado');
  });

  it('falls back cleanly for unsupported scenarios', () => {
    const result = simulateScenario(REQUESTS, 'What if partners became happier?');

    expect(result.scenarioType).toBe('general');
    expect(result.after).toEqual(result.before);
  });
});
