/**
 * @file voiceIntakeService.js
 * Manages multi-turn Claude conversations for voice-driven form intake.
 *
 * Each session stores the full message history and accumulated extracted fields.
 * Claude acts as a friendly intake specialist — extracting multiple fields from
 * a single natural message and conversing warmly, not interrogating field by field.
 *
 * Sessions are in-memory (Map). They are cleaned up when the modal is closed
 * (DELETE /api/voice-intake/:sessionId) or when the session completes.
 */

import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/** In-memory session store. Key: sessionId (UUID), Value: VoiceSession. */
const sessions = new Map();

/**
 * Builds the system prompt injected with current extracted field state.
 *
 * @param {object} extractedFields - Current accumulated field values
 * @returns {string}
 */
function buildSystemPrompt(extractedFields) {
  const filled = Object.entries(extractedFields)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const missing = Object.entries(extractedFields)
    .filter(([, v]) => v === null)
    .map(([k]) => k)
    .join(', ');

  return `You are a friendly intake specialist for Intermountain Healthcare's Community Health team.
Your job is to help community partners submit an event support request conversationally.

## Personality
- Warm, professional, and concise
- Extract MULTIPLE fields from a single message when possible
- Acknowledge what the user said naturally before asking the next question
- Never list fields robotically — ask naturally like a human would
- If the user goes off-topic, gently redirect: "I'd love to help with that another time — let's get your event request submitted first."

## Current form state
Already collected:
${filled || '  (nothing yet)'}

Still needed: ${missing || '(all fields collected!)'}

## Response format
Respond with valid JSON only — no markdown fences, no prose outside JSON:
{
  "message": "Your conversational response to the user",
  "extractedFields": {
    "requestorName": null,
    "requestorEmail": null,
    "requestorPhone": null,
    "eventName": null,
    "eventDate": null,
    "eventCity": null,
    "eventZip": null,
    "requestType": null
  },
  "isComplete": false
}

## Field extraction rules
- Only include fields extracted from THIS message (leave others null — merged server-side)
- requestorPhone: format as (XXX) XXX-XXXX
- eventDate: convert to YYYY-MM-DD (today is ${new Date().toISOString().slice(0, 10)})
- requestType must be exactly one of: "staff_support", "mailed_materials", "pickup"
- isComplete: true ONLY when all 8 fields in the merged state above are non-null`;
}

/**
 * Returns an ExtractedFields object pre-seeded with any values from the form.
 *
 * @param {object} [initialFields] - Partial form values already filled
 * @returns {object}
 */
function makeExtractedFields(initialFields = {}) {
  return {
    requestorName:  initialFields.requestorName  || null,
    requestorEmail: initialFields.requestorEmail || null,
    requestorPhone: initialFields.requestorPhone || null,
    eventName:      initialFields.eventName      || null,
    eventDate:      initialFields.eventDate      || null,
    eventCity:      initialFields.eventCity      || null,
    eventZip:       initialFields.eventZip       || null,
    requestType:    initialFields.requestType    || null,
  };
}

/**
 * Creates a new voice intake session and returns the AI greeting.
 *
 * @param {object} [initialFields] - Pre-filled form values to seed the session
 * @returns {Promise<{ sessionId: string, greeting: string }>}
 */
export async function createSession(initialFields = {}) {
  const sessionId = randomUUID();
  const extractedFields = makeExtractedFields(initialFields);

  const greeting = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    temperature: 0.3,
    system: buildSystemPrompt(extractedFields),
    messages: [
      { role: 'user', content: 'Hello, I need to submit a community health request.' },
    ],
  });

  const greetingText = safeParseMessage(greeting.content[0].text);

  sessions.set(sessionId, {
    messages: [
      { role: 'user',      content: 'Hello, I need to submit a community health request.' },
      { role: 'assistant', content: greeting.content[0].text },
    ],
    extractedFields,
    isComplete: false,
    createdAt: new Date().toISOString(),
  });

  return { sessionId, greeting: greetingText };
}

/**
 * Sends a user message to the conversation and returns the AI reply
 * plus the updated extracted fields state.
 *
 * @param {string} sessionId - Active session UUID
 * @param {string} userMessage - User's spoken or typed message
 * @returns {Promise<{ reply: string, extractedFields: object, isComplete: boolean }>}
 * @throws {Error} 404 if session not found
 */
export async function sendMessage(sessionId, userMessage) {
  const session = sessions.get(sessionId);
  if (!session) {
    const err = new Error('Session not found or expired.');
    err.status = 404;
    throw err;
  }

  session.messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    temperature: 0.3,
    system: buildSystemPrompt(session.extractedFields),
    messages: session.messages,
  });

  const rawText = response.content[0].text;
  session.messages.push({ role: 'assistant', content: rawText });

  const parsed = safeParseResponse(rawText);

  // Merge newly extracted non-null fields into session state
  for (const [key, value] of Object.entries(parsed.extractedFields || {})) {
    if (value !== null && value !== undefined && key in session.extractedFields) {
      session.extractedFields[key] = value;
    }
  }

  // isComplete when all 8 required fields are non-null
  session.isComplete = Object.values(session.extractedFields).every((v) => v !== null);
  sessions.set(sessionId, session);

  return {
    reply: parsed.message || rawText,
    extractedFields: { ...session.extractedFields },
    isComplete: session.isComplete,
  };
}

/**
 * Deletes a session from memory. Idempotent.
 *
 * @param {string} sessionId - Session UUID to remove
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteSession(sessionId) {
  if (!sessions.has(sessionId)) return false;
  sessions.delete(sessionId);
  return true;
}

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Safely parses a Claude JSON response. Returns fallback on parse error.
 *
 * @param {string} text - Raw response text
 * @returns {{ message: string, extractedFields: object, isComplete: boolean }}
 */
export function safeParseResponse(text) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { message: text, extractedFields: {}, isComplete: false };
  }
}

/**
 * Extracts the human-readable message string from a response.
 *
 * @param {string} text - Raw response text
 * @returns {string}
 */
function safeParseMessage(text) {
  return safeParseResponse(text).message || text;
}
