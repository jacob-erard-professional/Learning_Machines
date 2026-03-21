/**
 * @file routes/voiceIntake.js
 * Express router for the voice-driven conversational form intake.
 *
 * Endpoints:
 *   POST   /api/voice-intake/start         - Create a new conversation session
 *   POST   /api/voice-intake/message       - Send a message, get AI reply + field state
 *   DELETE /api/voice-intake/:sessionId    - Clean up a session (idempotent)
 */

import { Router } from 'express';
import {
  createSession,
  sendMessage,
  deleteSession,
  polishTranscript,
} from '../services/voiceIntakeService.js';

const router = Router();

/**
 * @route POST /api/voice-intake/start
 * Creates a new session. Optionally accepts pre-filled form fields to seed Claude.
 *
 * Body: { initialFields?: object }
 * Response: { sessionId: string, greeting: string }
 */
router.post('/start', async (req, res) => {
  try {
    const { initialFields } = req.body ?? {};
    const result = await createSession(initialFields);
    res.json(result);
  } catch (err) {
    console.error('[voiceIntake] createSession error:', err.message);
    res.status(503).json({ error: 'AI unavailable. Please try again shortly.' });
  }
});

/**
 * @route POST /api/voice-intake/message
 * Sends a user message to the active session and returns the AI reply.
 *
 * Body: { sessionId: string, message: string }
 * Response: { reply: string, extractedFields: object, isComplete: boolean }
 */
router.post('/message', async (req, res) => {
  const { sessionId, message } = req.body ?? {};

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }
  if (String(message).length > 2000) {
    return res.status(400).json({ error: 'message must be 2000 characters or fewer.' });
  }

  try {
    const result = await sendMessage(sessionId, String(message).trim());
    res.json(result);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error('[voiceIntake] sendMessage error:', err.message);
    res.status(503).json({ error: 'AI unavailable. Please try again shortly.' });
  }
});

/**
 * @route POST /api/voice-intake/polish
 * Cleans up dictated text with punctuation/casing while preserving meaning.
 *
 * Body: { transcript: string }
 * Response: { text: string }
 */
router.post('/polish', async (req, res) => {
  const { transcript } = req.body ?? {};

  if (!transcript || !String(transcript).trim()) {
    return res.status(400).json({ error: 'transcript is required.' });
  }

  try {
    const text = await polishTranscript(String(transcript));
    res.json({ text });
  } catch (err) {
    console.error('[voiceIntake] polishTranscript error:', err.message);
    res.status(503).json({ error: 'AI unavailable. Please try again shortly.' });
  }
});

/**
 * @route DELETE /api/voice-intake/:sessionId
 * Cleans up a session. Idempotent — returns 204 even if session doesn't exist.
 */
router.delete('/:sessionId', (req, res) => {
  deleteSession(req.params.sessionId);
  res.status(204).send();
});

export default router;
