/**
 * @file routes/chat.js
 * Conversational intake endpoint — guides requestors through providing all
 * required form fields via natural language, one follow-up at a time.
 *
 * The frontend sends accumulated `context` each turn so this route can
 * determine which required fields are still missing and ask for them.
 */

import { Router } from 'express';
import { runChatIntakeAgent } from '../lib/ai.js';

const router = Router();

const REQUIRED_FIELDS = [
  'requestorName',
  'requestorEmail',
  'requestorPhone',
  'eventName',
  'eventDate',
  'eventCity',
  'eventZip',
  'requestType',
];

const FIELD_LABELS = {
  requestorName: 'your full name',
  requestorEmail: 'your email address',
  requestorPhone: 'your phone number',
  eventName: 'the event name',
  eventDate: 'the event date (e.g. May 10, 2026)',
  eventCity: 'the city where the event will be held',
  eventZip: 'the zip code for the event location',
  requestType:
    'the type of support needed — staff attendance, mailed materials, or pickup',
};

/**
 * Builds a friendly question for the first one or two missing required fields.
 * @param {string[]} missing - Array of missing field keys
 * @returns {string}
 */
function buildFollowUpQuestion(missing) {
  const labels = missing.slice(0, 2).map((f) => FIELD_LABELS[f]);
  if (labels.length === 1) {
    return `Could you also share ${labels[0]}?`;
  }
  return `Could you also share ${labels[0]} and ${labels[1]}?`;
}

/**
 * @route POST /api/chat
 * Accepts a free-text message plus accumulated context from prior turns.
 * Extracts new fields, merges with known fields, and asks targeted follow-ups
 * until all required fields are present.
 *
 * Body: { message: string, context?: object }
 * Response: { reply, extractedFields, ready: boolean }
 */
router.post('/', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { message: 'Message is required.' },
      });
    }

    // Extract new fields from this message
    const newFields = await runChatIntakeAgent(message.trim(), context);

    // Merge: new non-empty values override accumulated context
    const merged = { ...context };
    for (const [key, value] of Object.entries(newFields)) {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    }

    // Determine which required fields are still missing
    const missing = REQUIRED_FIELDS.filter(
      (f) => !merged[f] && merged[f] !== 0
    );
    const ready = missing.length === 0;

    let reply;
    if (ready) {
      reply =
        "I have everything I need! Click \"Review & Submit\" below to review your request and send it in.";
    } else if (Object.keys(merged).filter((k) => merged[k]).length === 0) {
      // Nothing collected yet — welcome + first ask
      reply =
        "Hi! I can help you submit a Community Health support request. " +
        buildFollowUpQuestion(missing);
    } else {
      reply = buildFollowUpQuestion(missing);
    }

    return res.json({
      reply,
      extractedFields: merged,
      ready,
    });
  } catch (err) {
    console.error('[POST /chat]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

export default router;
