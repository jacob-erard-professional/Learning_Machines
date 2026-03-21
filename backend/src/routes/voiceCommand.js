/**
 * @file routes/voiceCommand.js
 * Express router for admin voice command interpretation.
 *
 * Endpoint:
 *   POST /api/voice-command/interpret - Parse a spoken command into a filter action
 */

import { Router } from 'express';
import { interpretCommand } from '../services/voiceCommandService.js';

const router = Router();

/**
 * @route POST /api/voice-command/interpret
 * Interprets a natural language admin command.
 *
 * Body: { command: string }
 * Response: { action: string, params: object, message: string }
 */
router.post('/interpret', async (req, res) => {
  const { command } = req.body ?? {};

  if (!command || !String(command).trim()) {
    return res.status(400).json({ error: 'command is required.' });
  }
  if (String(command).length > 500) {
    return res.status(400).json({ error: 'command must be 500 characters or fewer.' });
  }

  try {
    const result = await interpretCommand(String(command).trim());
    res.json(result);
  } catch (err) {
    console.error('[voiceCommand] interpret error:', err.message);
    res.status(503).json({ error: 'AI unavailable. Please try again shortly.' });
  }
});

export default router;
