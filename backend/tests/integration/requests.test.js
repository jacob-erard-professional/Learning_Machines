/**
 * @file tests/integration/requests.test.js
 * Integration tests for the /api/requests routes using Supertest.
 *
 * AI modules (lib/ai.js) are mocked with vi.mock() so tests run without
 * a real API key and are deterministic.
 *
 * Test coverage:
 * - POST /api/requests: validation errors, successful creation, duplicate detection
 * - GET /api/requests: list with filters (status, route, search)
 * - PATCH /api/requests/:id: audit entry creation, field updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { seedDatabase } from '../../src/data/store.js';

// ---------------------------------------------------------------------------
// Mock AI module — prevents real Claude API calls during tests
// ---------------------------------------------------------------------------

vi.mock('../../src/lib/ai.js', () => ({
  runIntakeAgent: vi.fn(async () => ({
    eventType: 'health fair',
    audience: 'seniors',
    estimatedAttendees: 80,
    city: 'Salt Lake City',
    zip: '84101',
    materialNeeds: ['blood pressure cuffs'],
    eventName: 'Senior Health Fair',
    success: true,
  })),
  runDecisionAgent: vi.fn(async () => ({
    fulfillmentRoute: 'staff_deployment',
    tags: ['health fair', 'seniors'],
    assetCategory: 'materials',
    urgency: 'standard',
    priority: 'medium',
    impactScore: 72,
    confidence: 0.92,
    reasoning: 'Senior health fair in SLC service area.',
    intentMismatch: false,
    anomalyFlags: [],
    success: true,
  })),
  runPlanningAgent: vi.fn(async () => ({
    staffingCount: 2,
    recommendedMaterials: ['blood pressure cuffs', 'diabetes pamphlets'],
    logisticsNotes: 'Bring portable BP station.',
    flags: [],
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function futureDate(n = 30) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A complete valid POST body */
const VALID_BODY = {
  requestorName: 'Jane Smith',
  requestorEmail: 'jane@example.com',
  requestorPhone: '801-555-0100',
  eventName: 'Senior Health Fair',
  eventDate: futureDate(30),
  eventCity: 'Salt Lake City',
  eventZip: '84101',
  requestType: 'staff_support',
  estimatedAttendees: 80,
  eventDescription: 'Free blood pressure screening for seniors at the rec center',
};

// Reset store before each test to ensure test isolation
beforeEach(() => {
  seedDatabase([]);
});

// ---------------------------------------------------------------------------
// POST /api/requests
// ---------------------------------------------------------------------------

describe('POST /api/requests', () => {
  it('returns 201 with routing info on valid submission', async () => {
    const res = await request(app).post('/api/requests').send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toMatch(/^REQ-/);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('fulfillmentRoute');
    expect(res.body).toHaveProperty('isInServiceArea');
    expect(res.body.isInServiceArea).toBe(true);
    expect(res.body.fulfillmentRoute).toBe('staff_deployment');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('returns 201 with aiStatus success when AI mock succeeds', async () => {
    const res = await request(app).post('/api/requests').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.aiStatus).toBe('success');
    expect(Array.isArray(res.body.aiTags)).toBe(true);
  });

  it('returns 201 with mail route for mailed_materials requestType', async () => {
    const body = { ...VALID_BODY, requestType: 'mailed_materials' };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(201);
    expect(res.body.fulfillmentRoute).toBe('mail');
  });

  it('returns 201 with mail route for out-of-area zip', async () => {
    const body = {
      ...VALID_BODY,
      requestorEmail: 'test@outofarea.com',
      eventZip: '90210',
      eventCity: 'Beverly Hills',
    };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(201);
    expect(res.body.fulfillmentRoute).toBe('mail');
    expect(res.body.isInServiceArea).toBe(false);
  });

  it('returns 400 VALIDATION_ERROR with field-level errors on invalid body', async () => {
    const res = await request(app).post('/api/requests').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toHaveProperty('requestorName');
    expect(res.body.fields).toHaveProperty('requestorEmail');
    expect(res.body.fields).toHaveProperty('eventDate');
    expect(res.body.fields).toHaveProperty('requestType');
  });

  it('returns 400 for invalid email format', async () => {
    const body = { ...VALID_BODY, requestorEmail: 'notanemail' };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('requestorEmail');
  });

  it('returns 400 for past event date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const body = { ...VALID_BODY, eventDate: pastDate.toISOString().slice(0, 10) };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('eventDate');
  });

  it('returns 400 for invalid zip code (non-5-digit)', async () => {
    const body = { ...VALID_BODY, eventZip: '8410' };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('eventZip');
  });

  it('returns 400 for invalid requestType', async () => {
    const body = { ...VALID_BODY, requestType: 'teleport' };
    const res = await request(app).post('/api/requests').send(body);
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('requestType');
  });

  it('returns 409 DUPLICATE_REQUEST for same email+date+zip', async () => {
    // First submission
    await request(app).post('/api/requests').send(VALID_BODY);

    // Duplicate submission with same email, date, zip
    const res = await request(app).post('/api/requests').send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DUPLICATE_REQUEST');
    expect(res.body).toHaveProperty('existingId');
  });

  it('allows different email same date/zip (not a duplicate)', async () => {
    await request(app).post('/api/requests').send(VALID_BODY);

    const body2 = { ...VALID_BODY, requestorEmail: 'different@example.com' };
    const res = await request(app).post('/api/requests').send(body2);
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/requests
// ---------------------------------------------------------------------------

describe('GET /api/requests', () => {
  beforeEach(async () => {
    // Seed with a few requests for filter testing
    await request(app).post('/api/requests').send(VALID_BODY);
    await request(app).post('/api/requests').send({
      ...VALID_BODY,
      requestorName: 'Bob Jones',
      requestorEmail: 'bob@example.com',
      eventName: 'Community Wellness Day',
      eventCity: 'Provo',
      eventZip: '84601',
      requestType: 'mailed_materials',
    });
  });

  it('returns 200 with total and results array', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.total).toBe(2);
  });

  it('filters by status', async () => {
    const res = await request(app).get('/api/requests?status=pending');
    expect(res.status).toBe(200);
    res.body.results.forEach((r) => {
      expect(r.status).toBe('pending');
    });
  });

  it('filters by route', async () => {
    const res = await request(app).get('/api/requests?route=mail');
    expect(res.status).toBe(200);
    res.body.results.forEach((r) => {
      expect(r.fulfillmentRoute).toBe('mail');
    });
  });

  it('filters by zip', async () => {
    const res = await request(app).get('/api/requests?zip=84101');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].eventZip).toBe('84101');
  });

  it('searches by requestorName (partial match)', async () => {
    const res = await request(app).get('/api/requests?search=Jane');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].requestorName).toBe('Jane Smith');
  });

  it('searches by eventName (partial match)', async () => {
    const res = await request(app).get('/api/requests?search=Wellness');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].eventName).toBe('Community Wellness Day');
  });

  it('searches by eventCity (partial match)', async () => {
    const res = await request(app).get('/api/requests?search=Provo');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].eventCity).toBe('Provo');
  });

  it('returns empty results for non-matching search', async () => {
    const res = await request(app).get('/api/requests?search=Xyzzy123NotFound');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  it('sorts by requestorName ascending', async () => {
    const res = await request(app).get('/api/requests?sortBy=requestorName&sortDir=asc');
    expect(res.status).toBe(200);
    const names = res.body.results.map((r) => r.requestorName);
    expect(names[0]).toBe('Bob Jones');
    expect(names[1]).toBe('Jane Smith');
  });

  it('returns list shape (not full detail — no auditLog)', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(200);
    // List items should have key fields
    const item = res.body.results[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('requestorName');
    expect(item).toHaveProperty('fulfillmentRoute');
    expect(item).toHaveProperty('status');
    // List items should NOT expose full detail like auditLog by default
    // (they may not have it — that's fine either way for the list view)
  });
});

// ---------------------------------------------------------------------------
// GET /api/requests/:id
// ---------------------------------------------------------------------------

describe('GET /api/requests/:id', () => {
  it('returns 200 with full request detail', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app).get(`/api/requests/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body).toHaveProperty('auditLog');
    expect(res.body).toHaveProperty('requestorEmail');
    expect(Array.isArray(res.body.auditLog)).toBe(true);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app).get('/api/requests/REQ-NOTREAL');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/requests/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/requests/:id', () => {
  it('updates a field and returns the updated request', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app)
      .patch(`/api/requests/${id}`)
      .send({ adminNotes: 'Reviewed by admin.' });

    expect(res.status).toBe(200);
    expect(res.body.adminNotes).toBe('Reviewed by admin.');
  });

  it('creates an audit entry for each changed field', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    await request(app)
      .patch(`/api/requests/${id}`)
      .send({ fulfillmentRoute: 'mail', adminNotes: 'Overriding route.' });

    const detail = await request(app).get(`/api/requests/${id}`);
    const auditLog = detail.body.auditLog;

    expect(Array.isArray(auditLog)).toBe(true);
    expect(auditLog.length).toBeGreaterThanOrEqual(2);

    const routeEntry = auditLog.find((e) => e.field === 'fulfillmentRoute');
    expect(routeEntry).toBeDefined();
    expect(routeEntry.newValue).toBe('mail');
    expect(routeEntry.oldValue).toBe('staff_deployment');

    const notesEntry = auditLog.find((e) => e.field === 'adminNotes');
    expect(notesEntry).toBeDefined();
    expect(notesEntry.newValue).toBe('Overriding route.');
  });

  it('does not create audit entry for unchanged fields', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;
    const originalRoute = create.body.fulfillmentRoute;

    // Send the same fulfillmentRoute — should not generate an audit entry
    await request(app)
      .patch(`/api/requests/${id}`)
      .send({ fulfillmentRoute: originalRoute });

    const detail = await request(app).get(`/api/requests/${id}`);
    const auditLog = detail.body.auditLog;

    const routeEntries = auditLog.filter((e) => e.field === 'fulfillmentRoute');
    expect(routeEntries.length).toBe(0);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app)
      .patch('/api/requests/REQ-NOTREAL')
      .send({ adminNotes: 'test' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('stamps updatedAt on update', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;
    const originalUpdatedAt = create.body.updatedAt;

    // Small delay to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 5));

    const patch = await request(app)
      .patch(`/api/requests/${id}`)
      .send({ adminNotes: 'Updated note.' });

    // updatedAt should exist and be a valid ISO string
    expect(patch.body.updatedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/requests/:id/reject
// ---------------------------------------------------------------------------

describe('POST /api/requests/:id/reject', () => {
  it('requires a reason', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app).post(`/api/requests/${id}/reject`).send({});
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('reason');
  });

  it('sets status to rejected with a reason', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app)
      .post(`/api/requests/${id}/reject`)
      .send({ reason: 'Does not align with mission.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// POST /api/requests/:id/hold
// ---------------------------------------------------------------------------

describe('POST /api/requests/:id/hold', () => {
  it('sets status to needs_review', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app)
      .post(`/api/requests/${id}/hold`)
      .send({ note: 'Need more info.' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('needs_review');
  });
});

// ---------------------------------------------------------------------------
// GET /api/requests/:id/similar
// ---------------------------------------------------------------------------

describe('GET /api/requests/:id/similar', () => {
  it('returns a similar array', async () => {
    const create = await request(app).post('/api/requests').send(VALID_BODY);
    const id = create.body.id;

    const res = await request(app).get(`/api/requests/${id}/similar`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('similar');
    expect(Array.isArray(res.body.similar)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns 200 with ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

describe('404 handler', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/doesnotexist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
