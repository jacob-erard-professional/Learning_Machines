/**
 * @file routes/chat.js
 * Conversational intake endpoint — lets requestors describe their event
 * in plain language and get back structured fields for the intake form.
 *
 * The frontend can use this to pre-fill the form, reducing friction for
 * requestors who don't know exactly what category or type to select.
 */

import { Router } from 'express';
import { runIntakeAgent } from '../lib/ai.js';

const router = Router();

/**
 * @route POST /api/chat
 * Accepts a free-text message, runs the IntakeAgent, and returns
 * structured fields + a reply message for the chat interface.
 *
 * Body: { message: string }
 * Response: { reply, extractedFields, ready: boolean, prefillData }
 */
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { message: 'Message is required.' },
      });
    }

    // Run the intake agent on the free-text input
    const extracted = await runIntakeAgent(message.trim());

    // Determine if we have enough info to pre-fill the form
    const hasMinimumInfo = Boolean(
      extracted.success &&
        (extracted.eventName || extracted.eventType) &&
        extracted.city
    );

    // Build a friendly reply message
    let reply;
    if (!extracted.success) {
      reply =
        "I'm having trouble analyzing your request right now. Please fill out the form manually and we'll take it from there!";
    } else if (hasMinimumInfo) {
      reply = `I can help with that! I've extracted some details from your description:\n` +
        `• Event type: ${extracted.eventType || 'Community health event'}\n` +
        `• Audience: ${extracted.audience || 'General public'}\n` +
        `• City: ${extracted.city || 'Not specified'}\n` +
        (extracted.estimatedAttendees ? `• Estimated attendees: ${extracted.estimatedAttendees}\n` : '') +
        `\nI've pre-filled what I could. Please review and complete any missing fields.`;
    } else {
      reply =
        "Thanks for the description! I've extracted some initial details. Could you also tell me the event city and your estimated number of attendees?";
    }

    // prefillData maps extracted fields to form field names
    const prefillData = {
      eventName: extracted.eventName || null,
      eventCity: extracted.city || null,
      eventZip: extracted.zip || null,
      estimatedAttendees: extracted.estimatedAttendees || null,
      eventDescription: message.trim(),
      // Suggest requestType based on materialNeeds — if no on-site needs, suggest mailed_materials
      requestType:
        extracted.materialNeeds?.length > 0 && !message.toLowerCase().includes('mail')
          ? 'staff_support'
          : null,
    };

    return res.json({
      reply,
      extractedFields: extracted,
      ready: hasMinimumInfo,
      prefillData,
    });
  } catch (err) {
    console.error('[POST /chat]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

export default router;
