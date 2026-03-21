/**
 * @file requestService.js
 * Orchestrates the full request creation pipeline:
 * validate → deduplicate → route → AI classify → AI plan → save
 *
 * This is the authoritative entry point for new submissions. Calling code
 * (the route handler) only needs to pass the raw body and handle the result.
 */

import { validateRequest } from '../lib/validate.js';
import { findDuplicate, saveRequest } from '../data/store.js';
import { determineRoute } from './routingService.js';
import { runIntakeAgent, runDecisionAgent, runPlanningAgent } from '../lib/ai.js';
import { RequestStatus } from '../lib/enums.js';

/**
 * Creates a new community health request through the full pipeline.
 *
 * Steps:
 * 1. Validate input — throws VALIDATION_ERROR if invalid
 * 2. Deduplicate — returns early with { duplicate: true } if same email+date+zip
 * 3. Generate human-readable ID
 * 4. Run IntakeAgent on eventDescription (if provided)
 * 5. Run deterministic routing via routingService
 * 6. Run DecisionAgent — AI suggestion used only if it matches deterministic route OR confidence > 0.8
 * 7. Run PlanningAgent for staffing/logistics recommendations
 * 8. Build full Request object and save
 *
 * @param {Object} body - Raw request body from POST /api/requests
 * @returns {Promise<Object>} Saved request object or duplicate signal
 * @throws {{ code: 'VALIDATION_ERROR', fields: Object }} on validation failure
 */
export async function createRequest(body) {
  // --- Step 1: Validation ---
  const { valid, errors } = validateRequest(body);
  if (!valid) {
    const err = new Error('Validation failed');
    err.code = 'VALIDATION_ERROR';
    err.fields = errors;
    throw err;
  }

  // --- Step 2: Duplicate check ---
  const existing = findDuplicate(
    body.requestorEmail,
    body.eventDate,
    body.eventZip
  );
  if (existing) {
    return { duplicate: true, existingId: existing.id };
  }

  // --- Step 3: Generate ID ---
  // Use last 6 digits of timestamp for human readability
  const id = 'REQ-' + String(Date.now()).slice(-6);
  const now = new Date().toISOString();

  // --- Step 4: IntakeAgent (optional — only if description provided) ---
  let intakeResult = null;
  if (body.eventDescription && body.eventDescription.trim()) {
    intakeResult = await runIntakeAgent(body.eventDescription);
  }

  // --- Step 5: Deterministic routing ---
  const routing = determineRoute(
    body.requestTypes,
    body.eventZip,
    body.estimatedAttendees ?? null,
    body.eventDate
  );

  // --- Step 6: DecisionAgent ---
  // Build the payload we send to AI — includes all structured fields
  const structuredData = {
    id,
    requestorName: body.requestorName,
    eventName: body.eventName,
    eventDate: body.eventDate,
    eventAddress: body.eventAddress ?? '',
    eventCity: body.eventCity,
    eventZip: body.eventZip,
    eventType: intakeResult?.eventType ?? 'general',
    audience: intakeResult?.audience ?? 'general public',
    estimatedAttendees: body.estimatedAttendees ?? intakeResult?.estimatedAttendees ?? null,
    requestTypes: body.requestTypes,
    assetCategory: body.assetCategory ?? null,
    materialNeeds: body.materialPreferences ?? intakeResult?.materialNeeds ?? [],
    eventDescription: body.eventDescription ?? '',
    isInServiceArea: routing.isInServiceArea,
    deterministicRoute: routing.route,
  };

  const aiDecision = await runDecisionAgent(structuredData);
  const aiSucceeded = aiDecision.success !== false;

  // Determine whether to trust AI route suggestion:
  // Use AI route if it agrees with deterministic logic OR has high confidence (>0.8)
  const aiRouteTrusted =
    aiSucceeded &&
    (aiDecision.fulfillmentRoute === routing.route || aiDecision.confidence > 0.8);

  // If AI disagrees with deterministic route AND has low confidence, flag for review
  const aiMismatch =
    aiSucceeded &&
    aiDecision.fulfillmentRoute !== routing.route &&
    aiDecision.confidence <= 0.8;

  // --- Step 7: PlanningAgent ---
  const planningInput = {
    ...structuredData,
    fulfillmentRoute: routing.route,
    aiTags: aiSucceeded ? aiDecision.tags : [],
    impactScore: aiSucceeded ? aiDecision.impactScore : 50,
  };
  const planResult = await runPlanningAgent(planningInput);

  // --- Step 8: Build and save full Request object ---
  // Status: NEEDS_REVIEW if AI failed or AI flagged a mismatch; PENDING otherwise
  const status =
    !aiSucceeded || aiMismatch || (aiDecision.intentMismatch)
      ? RequestStatus.NEEDS_REVIEW
      : RequestStatus.PENDING;

  // Map AI confidence number to string label
  let aiConfidenceLabel = null;
  if (aiSucceeded && typeof aiDecision.confidence === 'number') {
    if (aiDecision.confidence >= 0.8) aiConfidenceLabel = 'high';
    else if (aiDecision.confidence >= 0.5) aiConfidenceLabel = 'medium';
    else aiConfidenceLabel = 'low';
  }

  const request = {
    // Identity
    id,
    createdAt: now,
    updatedAt: now,

    // Requestor
    requestorName: body.requestorName,
    requestorEmail: body.requestorEmail,
    requestorPhone: body.requestorPhone,
    alternateContactName: body.alternateContactName ?? null,
    alternateContactEmail: body.alternateContactEmail ?? null,

    // Event info
    eventName: body.eventName,
    eventDate: body.eventDate,
    eventAddress: body.eventAddress ?? null,
    eventCity: body.eventCity,
    eventZip: body.eventZip,
    estimatedAttendees: body.estimatedAttendees ?? null,
    eventDescription: body.eventDescription ?? null,
    specialInstructions: body.specialInstructions ?? null,

    // Classification
    requestTypes: body.requestTypes,
    assetCategory: body.assetCategory ?? (aiSucceeded ? aiDecision.assetCategory : null) ?? null,
    materialPreferences: body.materialPreferences ?? [],

    // Routing
    fulfillmentRoute: routing.route,
    routingReason: routing.routingReason,
    isInServiceArea: routing.isInServiceArea,

    // Priority / urgency from routing
    priority: routing.priority,
    urgency: routing.urgency,

    // AI metadata
    aiStatus: aiSucceeded ? 'success' : 'failed',
    aiTags: aiSucceeded ? aiDecision.tags : [],
    aiSuggestedRoute: aiSucceeded ? aiDecision.fulfillmentRoute : null,
    aiConfidence: aiConfidenceLabel,
    aiSummary: aiSucceeded ? aiDecision.reasoning : null,
    aiImpactScore: aiSucceeded ? aiDecision.impactScore : null,
    aiAnomalyFlags: aiSucceeded ? aiDecision.anomalyFlags : [],

    // Planning agent output
    planningStaffingCount: planResult.staffingCount,
    planningRecommendedMaterials: planResult.recommendedMaterials,
    planningLogisticsNotes: planResult.logisticsNotes,
    planningFlags: planResult.flags,

    // Intake agent output (enrichment)
    intakeEventType: intakeResult?.eventType ?? null,
    intakeAudience: intakeResult?.audience ?? null,

    // Admin workflow
    status,
    adminNotes: '',
    calendarInviteGenerated: false,

    // Audit trail (empty at creation)
    auditLog: [],
  };

  return saveRequest(request);
}
