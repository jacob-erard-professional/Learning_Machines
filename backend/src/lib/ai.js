/**
 * @file ai.js
 * All Claude AI integrations for the Community Health Request System.
 *
 * Architecture: Three specialized agents, each with a focused system prompt
 * and few-shot examples. All agents call claude-sonnet-4-6 synchronously —
 * acceptable for a one-request-at-a-time demo context.
 *
 * Fallback strategy: Every agent wraps its API call in try/catch. On failure,
 * it returns a safe default so the request still gets saved. The request is
 * flagged needs_review so admins know to classify manually.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Agent 1: Intake Agent
// Extracts structured event metadata from free-text event descriptions.
// ---------------------------------------------------------------------------

/**
 * Parses a free-text event description and extracts structured metadata.
 * Used to auto-populate intake form fields and understand the nature of
 * the request before routing decisions are made.
 *
 * @param {string} rawInput - Free-text event description from the requestor
 * @returns {Promise<{
 *   eventType: string,
 *   audience: string,
 *   estimatedAttendees: number|null,
 *   city: string,
 *   zip: string,
 *   materialNeeds: string[],
 *   eventName: string,
 *   success: boolean
 * }>}
 */
export async function runIntakeAgent(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    return {
      eventType: 'general',
      audience: 'general public',
      estimatedAttendees: null,
      city: '',
      zip: '',
      materialNeeds: [],
      eventName: '',
      success: true,
    };
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are an intake agent for Intermountain Healthcare's Community Health program.
Your job is to extract structured event metadata from a free-text description submitted by a community requestor.

<task>
Extract the following fields from the input text. If a field cannot be determined, use null or an empty string.
Return ONLY valid JSON, no other text.
</task>

<schema>
{
  "eventType": "string (e.g., health fair, screening, education class, distribution)",
  "audience": "string (e.g., seniors, children, general public, low-income families)",
  "estimatedAttendees": "number or null",
  "city": "string (city name, or empty string if not mentioned)",
  "zip": "string (5-digit zip or empty string if not mentioned)",
  "materialNeeds": ["array of specific materials or supplies mentioned"],
  "eventName": "string (inferred name if not explicitly stated)"
}
</schema>

<examples>
<example>
<input>Health fair for seniors at the Salt Lake City rec center, expecting about 80 people. Need blood pressure cuffs, pamphlets about diabetes management, and a nurse to do screenings.</input>
<output>{"eventType":"health fair","audience":"seniors","estimatedAttendees":80,"city":"Salt Lake City","zip":"","materialNeeds":["blood pressure cuffs","diabetes management pamphlets","nursing staff"],"eventName":"Senior Health Fair"}</output>
</example>
<example>
<input>We're running a back-to-school event in Provo 84601 for low-income kids, maybe 50 kids. Would like healthy eating guides and activity books.</input>
<output>{"eventType":"back-to-school event","audience":"low-income children","estimatedAttendees":50,"city":"Provo","zip":"84601","materialNeeds":["healthy eating guides","activity books"],"eventName":"Back-to-School Health Event"}</output>
</example>
<example>
<input>Community diabetes screening in Boise. Free event at the library, open to all ages.</input>
<output>{"eventType":"health screening","audience":"general public","estimatedAttendees":null,"city":"Boise","zip":"","materialNeeds":["diabetes screening supplies"],"eventName":"Community Diabetes Screening"}</output>
</example>
</examples>`,
      messages: [
        {
          role: 'user',
          content: `<submission>${rawInput}</submission>\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    // Strip potential markdown code fences
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return {
      eventType: parsed.eventType ?? 'general',
      audience: parsed.audience ?? 'general public',
      estimatedAttendees: parsed.estimatedAttendees ?? null,
      city: parsed.city ?? '',
      zip: parsed.zip ?? '',
      materialNeeds: Array.isArray(parsed.materialNeeds) ? parsed.materialNeeds : [],
      eventName: parsed.eventName ?? '',
      success: true,
    };
  } catch (err) {
    console.error('[IntakeAgent] Error:', err.message);
    return { success: false, error: 'AI unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Agent 1b: Chat Intake Agent
// Multi-turn extraction of ALL required form fields from conversational input.
// ---------------------------------------------------------------------------

/**
 * Extracts all required intake form fields from a chat message,
 * taking into account fields already collected in prior turns.
 *
 * @param {string} message - Current user message
 * @param {Object} knownFields - Fields already collected (may be empty)
 * @returns {Promise<Object>} Partial or complete set of form fields
 */
export async function runChatIntakeAgent(message, knownFields = {}) {
  if (!message || !message.trim()) return {};

  const knownSummary = Object.keys(knownFields).length
    ? `Already collected: ${JSON.stringify(knownFields)}`
    : 'No fields collected yet.';

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are an intake agent for Intermountain Healthcare's Community Health program.
Extract structured form fields from the user's message. Only include fields you can determine from the message — omit fields that aren't mentioned. Do not invent information.

<fields>
requestorName: string (full name of the person submitting)
requestorEmail: string (email address)
requestorPhone: string (phone number)
eventName: string (name of the event or program)
eventDate: string (ISO date YYYY-MM-DD; infer year if only month/day given)
eventCity: string (city where event takes place)
eventZip: string (5-digit zip code)
requestType: one of "staff_support" | "mailed_materials" | "pickup"
  - staff_support: requestor wants staff to attend in person
  - mailed_materials: requestor wants materials mailed to them
  - pickup: requestor will pick up materials
estimatedAttendees: number or null
</fields>

Return ONLY valid JSON. Omit any field you cannot determine. Example: {"requestorName":"Jane","eventDate":"2026-05-10"}`,
      messages: [
        {
          role: 'user',
          content: `${knownSummary}\n\nUser message: ${message.trim()}\n\nReturn ONLY valid JSON with the fields you can extract from this message.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[ChatIntakeAgent] Error:', err.message);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Agent 2: Decision Agent
// Classifies and tags the structured request for admin review.
// ---------------------------------------------------------------------------

/**
 * Classifies and tags a structured request object.
 * Suggests a fulfillment route, assigns tags, detects anomalies, and
 * produces an impact score. This is advisory — the deterministic routing
 * logic in routingService.js makes the final call.
 *
 * @param {Object} structuredRequest - Structured request fields
 * @returns {Promise<{
 *   fulfillmentRoute: string,
 *   tags: string[],
 *   assetCategory: string,
 *   urgency: string,
 *   priority: string,
 *   impactScore: number,
 *   confidence: number,
 *   reasoning: string,
 *   intentMismatch: boolean,
 *   anomalyFlags: string[],
 *   success: boolean
 * }>}
 */
export async function runDecisionAgent(structuredRequest) {
  try {
    const input = JSON.stringify(structuredRequest, null, 2);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 768,
      system: `You are a decision classification agent for Intermountain Healthcare's Community Health program.
Your job is to analyze a structured community health support request and classify it for routing and resource planning.

<task>
Analyze the provided request and return a classification object. Consider event size, location, type of support needed, and urgency.
Return ONLY valid JSON, no other text.
</task>

<schema>
{
  "fulfillmentRoute": "staff_deployment | mail | pickup",
  "tags": ["array of descriptive tags"],
  "assetCategory": "materials | toolkits | behavioral_reinforcements | programs",
  "urgency": "urgent | standard",
  "priority": "high | medium | low",
  "impactScore": "integer 0-100 (estimated community impact)",
  "confidence": "float 0-1 (confidence in this classification)",
  "reasoning": "string (1-2 sentence explanation)",
  "intentMismatch": "boolean (true if requestor's stated type conflicts with event description)",
  "anomalyFlags": ["array of concern flags, e.g. 'unusually large attendee count'"]
}
</schema>

<routing_rules>
- Use "staff_deployment" when the event is in the Intermountain service area and requests on-site staff
- Use "mail" for materials-only requests, or events outside the service area
- Use "pickup" only when explicitly requested
- If event is within 14 days, mark urgency as "urgent"
- If estimatedAttendees >= 100, mark priority as "high"
</routing_rules>

<examples>
<example>
<input>{"eventType":"health fair","audience":"seniors","eventZip":"84101","requestTypes":["staff_support"],"estimatedAttendees":80,"isInServiceArea":true}</input>
<output>{"fulfillmentRoute":"staff_deployment","tags":["health fair","seniors","Salt Lake City","preventive care"],"assetCategory":"materials","urgency":"standard","priority":"medium","impactScore":72,"confidence":0.92,"reasoning":"Large senior health fair in Salt Lake City service area requesting on-site staffing. High community benefit.","intentMismatch":false,"anomalyFlags":[]}</output>
</example>
<example>
<input>{"eventType":"distribution","audience":"general public","eventZip":"90210","requestTypes":["mailed_materials"],"estimatedAttendees":30,"isInServiceArea":false}</input>
<output>{"fulfillmentRoute":"mail","tags":["materials distribution","out-of-area"],"assetCategory":"materials","urgency":"standard","priority":"low","impactScore":25,"confidence":0.95,"reasoning":"Location is outside Intermountain service area; mail delivery is the appropriate route.","intentMismatch":false,"anomalyFlags":["outside service area"]}</output>
</example>
<example>
<input>{"eventType":"community screening","audience":"general public","eventZip":"84111","requestTypes":["staff_support","mailed_materials"],"estimatedAttendees":150,"isInServiceArea":true}</input>
<output>{"fulfillmentRoute":"staff_deployment","tags":["community screening","multi-fulfillment","high attendance","Salt Lake City"],"assetCategory":"materials","urgency":"standard","priority":"high","impactScore":88,"confidence":0.90,"reasoning":"High-attendance in-area event requesting both staff and mailed materials. Staff deployment is primary; materials should also be prepared for mail.","intentMismatch":false,"anomalyFlags":[]}</output>
</example>
</examples>`,
      messages: [
        {
          role: 'user',
          content: `<request>\n${input}\n</request>\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return {
      fulfillmentRoute: parsed.fulfillmentRoute ?? 'mail',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      assetCategory: parsed.assetCategory ?? 'materials',
      urgency: parsed.urgency ?? 'standard',
      priority: parsed.priority ?? 'medium',
      impactScore: typeof parsed.impactScore === 'number' ? parsed.impactScore : 50,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning ?? '',
      intentMismatch: Boolean(parsed.intentMismatch),
      anomalyFlags: Array.isArray(parsed.anomalyFlags) ? parsed.anomalyFlags : [],
      success: true,
    };
  } catch (err) {
    console.error('[DecisionAgent] Error:', err.message);
    return {
      success: false,
      fulfillmentRoute: 'mail',
      tags: [],
      confidence: 0,
      reasoning: 'AI classification unavailable',
      impactScore: 50,
    };
  }
}

// ---------------------------------------------------------------------------
// Agent 3: Planning Agent
// Recommends staffing and logistics for approved events.
// ---------------------------------------------------------------------------

/**
 * Generates staffing and logistics recommendations for a classified request.
 * Runs after routing is determined; output is advisory for admin planning.
 *
 * @param {Object} classifiedRequest - Request with routing and AI classification attached
 * @returns {Promise<{
 *   staffingCount: number,
 *   recommendedMaterials: string[],
 *   logisticsNotes: string,
 *   flags: string[]
 * }>}
 */
export async function runPlanningAgent(classifiedRequest) {
  try {
    const input = JSON.stringify(classifiedRequest, null, 2);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are a logistics planning agent for Intermountain Healthcare's Community Health team.
Your job is to recommend staffing levels and materials for approved community health events.

<task>
Given a classified community health request, recommend practical logistics.
Be conservative — Intermountain has limited staff resources.
Return ONLY valid JSON, no other text.
</task>

<schema>
{
  "staffingCount": "integer (recommended number of Community Health staff)",
  "recommendedMaterials": ["specific materials to bring"],
  "logisticsNotes": "string (practical logistics notes for the field team)",
  "flags": ["array of operational concerns"]
}
</schema>

<staffing_guidelines>
- 1-50 attendees: 1 staff
- 51-100 attendees: 2 staff
- 101-200 attendees: 3 staff
- 200+ attendees: 4+ staff (flag for manager review)
- Add 1 staff if medical screening is involved
</staffing_guidelines>

<examples>
<example>
<input>{"eventType":"health fair","estimatedAttendees":80,"materialNeeds":["blood pressure cuffs"],"fulfillmentRoute":"staff_deployment","eventCity":"Salt Lake City"}</input>
<output>{"staffingCount":2,"recommendedMaterials":["blood pressure monitoring station","diabetes pamphlets","heart health brochures","wellness resource guide"],"logisticsNotes":"80-person senior event — bring portable BP station. Confirm parking/load-in with venue 48h in advance.","flags":[]}</output>
</example>
<example>
<input>{"eventType":"distribution","estimatedAttendees":25,"materialNeeds":["pamphlets"],"fulfillmentRoute":"mail"}</input>
<output>{"staffingCount":0,"recommendedMaterials":["general wellness pamphlet pack","community resource directory"],"logisticsNotes":"Mail delivery — no staff deployment needed. Standard 3-5 business day fulfillment.","flags":[]}</output>
</example>
</examples>`,
      messages: [
        {
          role: 'user',
          content: `<request>\n${input}\n</request>\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return {
      staffingCount: typeof parsed.staffingCount === 'number' ? parsed.staffingCount : 1,
      recommendedMaterials: Array.isArray(parsed.recommendedMaterials) ? parsed.recommendedMaterials : [],
      logisticsNotes: parsed.logisticsNotes ?? '',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (err) {
    console.error('[PlanningAgent] Error:', err.message);
    return {
      staffingCount: 1,
      recommendedMaterials: [],
      logisticsNotes: '',
      flags: [],
    };
  }
}
