/**
 * @file routes/requests.js
 * Express router for /api/requests — the core CRUD + workflow endpoints.
 *
 * Endpoint summary:
 *   POST   /               - Submit a new request (full pipeline)
 *   GET    /               - List requests with filtering/sorting
 *   GET    /:id            - Full detail including audit log
 *   PATCH  /:id            - Partial update with audit entry generation
 *   POST   /:id/approve    - Approve; returns .ics if staff_deployment
 *   POST   /:id/reject     - Reject with required reason
 *   POST   /:id/hold       - Set needs_review with note
 *   GET    /:id/similar    - Find similar historical requests
 *   POST   /:id/export-qualtrics - Mock Qualtrics export
 *   POST   /:id/generate-email   - Generate email via Claude
 */

import { Router } from 'express';
import { createRequest } from '../services/requestService.js';
import {
  getAllRequests,
  getRequestById,
  updateRequest,
  saveAdminOverride,
} from '../data/store.js';
import { generateIcsFile } from '../lib/calendar.js';
import { generateEmail } from '../lib/emailGenerator.js';
import { sendConfirmationEmail, sendGeneratedEmail } from '../lib/mailer.js';
import { findSimilarRequests } from '../lib/memory.js';
import { FulfillmentRoute, RequestStatus } from '../lib/enums.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST / — Create a new request
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests
 * Runs the full intake pipeline: validate → deduplicate → route → AI → save
 */
router.post('/', async (req, res) => {
  try {
    const result = await createRequest(req.body);

    // Duplicate detection — return 409 with pointer to existing request
    if (result.duplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_REQUEST',
        message: 'A request with the same email, event date, and zip code already exists.',
        existingId: result.existingId,
      });
    }

    // If AI failed, signal 503 but still return the saved request
    const statusCode = result.aiStatus === 'failed' ? 503 : 201;
    const emailDelivery = await sendConfirmationEmail(result);

    return res.status(statusCode).json({
      id: result.id,
      status: result.status,
      fulfillmentRoute: result.fulfillmentRoute,
      routingReason: result.routingReason,
      isInServiceArea: result.isInServiceArea,
      aiStatus: result.aiStatus,
      aiTags: result.aiTags,
      aiSummary: result.aiSummary,
      aiConfidence: result.aiConfidence,
      priority: result.priority,
      urgency: result.urgency,
      createdAt: result.createdAt,
      emailDelivery,
    });
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', fields: err.fields });
    }
    console.error('[POST /requests]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET / — List requests with filtering and sorting
// ---------------------------------------------------------------------------

/**
 * @route GET /api/requests
 * Supports: search, status, route, priority, zip, dateFrom, dateTo, sortBy, sortDir
 */
router.get('/', (req, res) => {
  try {
    const {
      search,
      status,
      route,
      priority,
      zip,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    let results = getAllRequests();

    // Full-text search on requestorName, eventName, eventCity
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.requestorName?.toLowerCase().includes(term) ||
          r.eventName?.toLowerCase().includes(term) ||
          r.eventCity?.toLowerCase().includes(term)
      );
    }

    // Exact-match filters
    if (status) results = results.filter((r) => r.status === status);
    if (route) results = results.filter((r) => r.fulfillmentRoute === route);
    if (priority) results = results.filter((r) => r.priority === priority);
    if (zip) results = results.filter((r) => r.eventZip === zip);

    // Date range on eventDate (YYYY-MM-DD string comparison works correctly)
    if (dateFrom) results = results.filter((r) => r.eventDate >= dateFrom);
    if (dateTo) results = results.filter((r) => r.eventDate <= dateTo);

    // Sorting
    const validSortFields = ['createdAt', 'eventDate', 'requestorName'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const direction = sortDir === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });

    // Return list-view shape (subset of fields per spec)
    const listItems = results.map((r) => ({
      id: r.id,
      requestorName: r.requestorName,
      eventName: r.eventName,
      eventDate: r.eventDate,
      eventCity: r.eventCity,
      eventZip: r.eventZip,
      requestTypes: r.requestTypes,
      fulfillmentRoute: r.fulfillmentRoute,
      status: r.status,
      isInServiceArea: r.isInServiceArea,
      priority: r.priority,
      urgency: r.urgency,
      aiTags: r.aiTags,
      aiStatus: r.aiStatus,
      createdAt: r.createdAt,
    }));

    return res.json({ total: listItems.length, results: listItems });
  } catch (err) {
    console.error('[GET /requests]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:id — Full request detail with audit log
// ---------------------------------------------------------------------------

/**
 * @route GET /api/requests/:id
 */
router.get('/:id', (req, res) => {
  const request = getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Request ${req.params.id} does not exist.`,
    });
  }
  return res.json(request);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Partial update with audit entries
// ---------------------------------------------------------------------------

/**
 * @route PATCH /api/requests/:id
 * Updates any field on the request. Creates an AuditEntry for each changed field.
 * Tracks overrides of AI-assigned fields (fulfillmentRoute, status) in adminOverrides.
 */
router.patch('/:id', (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const { body } = req;
    const auditEntries = [];
    const now = new Date().toISOString();

    // AI-assigned fields — track as admin overrides for pattern analysis
    const aiAssignedFields = new Set(['fulfillmentRoute', 'status', 'assetCategory']);

    // Build audit entries for every field that actually changed
    for (const [key, newValue] of Object.entries(body)) {
      const oldValue = request[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        auditEntries.push({
          timestamp: now,
          field: key,
          oldValue,
          newValue,
          note: body._auditNote ?? '',
        });

        // Track AI field overrides for admin pattern learning
        if (aiAssignedFields.has(key)) {
          saveAdminOverride(req.params.id, key, oldValue, newValue);
        }
      }
    }

    // Strip internal meta field from updates
    const { _auditNote, ...cleanUpdates } = body;

    // Append new audit entries to existing log
    const updatedAuditLog = [...(request.auditLog ?? []), ...auditEntries];

    const updated = updateRequest(req.params.id, {
      ...cleanUpdates,
      auditLog: updatedAuditLog,
    });

    if (!updated) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Request disappeared during update.' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('[PATCH /requests/:id]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/approve — Approve request; optionally return .ics file
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests/:id/approve
 * Sets status to approved. If route is staff_deployment, streams the .ics file.
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const now = new Date().toISOString();
    const auditEntry = {
      timestamp: now,
      field: 'status',
      oldValue: request.status,
      newValue: RequestStatus.APPROVED,
      note: 'Approved by admin.',
    };

    const updated = updateRequest(req.params.id, {
      status: RequestStatus.APPROVED,
      calendarInviteGenerated: request.fulfillmentRoute === FulfillmentRoute.STAFF_DEPLOYMENT,
      auditLog: [...(request.auditLog ?? []), auditEntry],
    });
    const emailDelivery = await sendGeneratedEmail(updated, 'approved');

    // Return .ics file as download for staff deployment events
    if (request.fulfillmentRoute === FulfillmentRoute.STAFF_DEPLOYMENT) {
      const icsContent = await generateIcsFile(updated);

      if (icsContent) {
        const safeEventName = (request.eventName ?? 'event')
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .slice(0, 40);
        const filename = `${request.id}-${safeEventName}.ics`;

        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(icsContent);
      }
      // Fall through to JSON if .ics generation failed
    }

    return res.json({ id: updated.id, status: updated.status, emailDelivery });
  } catch (err) {
    console.error('[POST /requests/:id/approve]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/reject — Reject request with required reason
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests/:id/reject
 * Body: { reason: string } — required
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { reason: 'A rejection reason is required.' },
      });
    }

    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const now = new Date().toISOString();
    const auditEntry = {
      timestamp: now,
      field: 'status',
      oldValue: request.status,
      newValue: RequestStatus.REJECTED,
      note: reason,
    };

    const updated = updateRequest(req.params.id, {
      status: RequestStatus.REJECTED,
      adminNotes: reason,
      auditLog: [...(request.auditLog ?? []), auditEntry],
    });
    const emailDelivery = await sendGeneratedEmail(updated, 'rejection');

    return res.json({ id: updated.id, status: updated.status, reason, emailDelivery });
  } catch (err) {
    console.error('[POST /requests/:id/reject]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/hold — Set needs_review with optional note
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests/:id/hold
 * Body: { note: string } — optional
 */
router.post('/:id/hold', async (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const note = req.body.note ?? 'Held for admin review.';
    const now = new Date().toISOString();
    const auditEntry = {
      timestamp: now,
      field: 'status',
      oldValue: request.status,
      newValue: RequestStatus.NEEDS_REVIEW,
      note,
    };

    const updated = updateRequest(req.params.id, {
      status: RequestStatus.NEEDS_REVIEW,
      adminNotes: note,
      auditLog: [...(request.auditLog ?? []), auditEntry],
    });
    const emailDelivery = await sendGeneratedEmail(updated, 'held');

    return res.json({ id: updated.id, status: updated.status, note, emailDelivery });
  } catch (err) {
    console.error('[POST /requests/:id/hold]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/similar — Find similar historical requests
// ---------------------------------------------------------------------------

/**
 * @route GET /api/requests/:id/similar
 * Uses keyword similarity (memory.js) to find top 3 related requests.
 */
router.get('/:id/similar', (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const all = getAllRequests();
    const similar = findSimilarRequests(request, all);

    return res.json({ similar });
  } catch (err) {
    console.error('[GET /requests/:id/similar]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/export-qualtrics — Mock Qualtrics export
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests/:id/export-qualtrics
 * Simulates export to Qualtrics survey platform with a 500ms delay
 * (mocking a real API call). Returns success with mock confirmation.
 */
router.post('/:id/export-qualtrics', async (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    return res.json({
      success: true,
      exportedId: `QX-${Date.now()}`,
      requestId: request.id,
      surveyUrl: `https://survey.qualtrics.com/jfe/form/SV_MOCK_${request.id}`,
      message: 'Request data exported to Qualtrics successfully.',
    });
  } catch (err) {
    console.error('[POST /requests/:id/export-qualtrics]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/generate-email — Generate email via Claude
// ---------------------------------------------------------------------------

/**
 * @route POST /api/requests/:id/generate-email
 * Body: { type: 'confirmation' | 'approved' | 'rejection' | 'held' | 'followup' }
 */
router.post('/:id/generate-email', async (req, res) => {
  try {
    const request = getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Request ${req.params.id} does not exist.`,
      });
    }

    const type = req.body.type ?? 'confirmation';
    const email = await generateEmail(request, type);

    return res.json({ email, requestId: request.id, type });
  } catch (err) {
    console.error('[POST /requests/:id/generate-email]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

export default router;
