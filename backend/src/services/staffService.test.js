import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the store so tests don't need real data
vi.mock('../data/store.js', () => ({
  getStaff: vi.fn(),
  getAllRequests: vi.fn(),
  updateRequest: vi.fn((id, updates) => ({ id, ...updates })),
}));

import { getStaff, getAllRequests, updateRequest } from '../data/store.js';
import {
  getAvailableStaff,
  checkStaffFeasibility,
  assignStaffToRequest,
} from './staffService.js';

const THURSDAY_DATE = '2026-03-26'; // a Thursday

const makeStaff = (overrides = {}) => ({
  staffId: 'STF-001',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'Wellness Ambassador',
  active: true,
  availableWeekdays: ['Thursday', 'Friday'],
  ...overrides,
});

const makeRequest = (overrides = {}) => ({
  id: 'REQ-001',
  status: 'approved',
  eventDate: THURSDAY_DATE,
  fulfillmentRoute: 'staff_deployment',
  assignedStaff: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// --- getAvailableStaff ---

describe('getAvailableStaff', () => {
  it('returns active staff available on the event weekday', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = getAvailableStaff(THURSDAY_DATE);
    expect(result).toHaveLength(1);
    expect(result[0].staffId).toBe('STF-001');
  });

  it('excludes inactive staff', () => {
    getStaff.mockReturnValue([makeStaff({ active: false })]);
    getAllRequests.mockReturnValue([]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('excludes staff not available on that weekday', () => {
    getStaff.mockReturnValue([makeStaff({ availableWeekdays: ['Monday'] })]);
    getAllRequests.mockReturnValue([]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('excludes staff already assigned to an approved event on the same date', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('does not exclude staff assigned to a different date', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ eventDate: '2026-03-27', assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(1);
  });

  it('does not exclude staff assigned to a rejected request', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ status: 'rejected', assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(1);
  });
});

// --- checkStaffFeasibility ---

describe('checkStaffFeasibility', () => {
  it('is feasible when free staff >= needed', () => {
    getStaff.mockReturnValue([makeStaff(), makeStaff({ staffId: 'STF-002', name: 'Bob' })]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 150); // needs 2
    expect(result.feasible).toBe(true);
    expect(result.needed).toBe(2);
    expect(result.freeCount).toBe(2);
    expect(result.shortage).toBe(0);
  });

  it('is not feasible when free staff < needed', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 250); // needs 3
    expect(result.feasible).toBe(false);
    expect(result.needed).toBe(3);
    expect(result.shortage).toBe(2);
  });

  it('defaults to needed=1 when estimatedAttendees is null', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, null);
    expect(result.needed).toBe(1);
    expect(result.feasible).toBe(true);
  });

  it('defaults to needed=1 when estimatedAttendees is 0', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 0);
    expect(result.needed).toBe(1);
  });
});

// --- assignStaffToRequest ---

describe('assignStaffToRequest', () => {
  it('assigns the correct number of staff and persists them', () => {
    const alice = makeStaff({ staffId: 'STF-001', name: 'Alice' });
    const bob = makeStaff({ staffId: 'STF-002', name: 'Bob', availableWeekdays: ['Thursday'] });
    getStaff.mockReturnValue([alice, bob]);
    getAllRequests.mockReturnValue([]);

    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 1);
    expect(result).toHaveLength(1);
    expect(updateRequest).toHaveBeenCalledWith('REQ-999', {
      assignedStaff: expect.arrayContaining([
        expect.objectContaining({ staffId: expect.any(String) }),
      ]),
    });
  });

  it('prefers staff with fewest existing assignments (even distribution)', () => {
    const alice = makeStaff({ staffId: 'STF-001', name: 'Alice' });
    const bob = makeStaff({ staffId: 'STF-002', name: 'Bob', availableWeekdays: ['Thursday'] });
    getStaff.mockReturnValue([alice, bob]);

    // Alice already has 2 assignments; Bob has 0
    getAllRequests.mockReturnValue([
      { id: 'REQ-A', status: 'approved', eventDate: '2026-03-20', fulfillmentRoute: 'staff_deployment', assignedStaff: [{ staffId: 'STF-001' }] },
      { id: 'REQ-B', status: 'approved', eventDate: '2026-03-21', fulfillmentRoute: 'staff_deployment', assignedStaff: [{ staffId: 'STF-001' }] },
    ]);

    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 1);
    // Bob should be picked because he has fewer assignments
    expect(result[0].staffId).toBe('STF-002');
  });

  it('returns partial list (not throwing) when fewer staff available than needed', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 5);
    expect(result.length).toBeLessThan(5);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
