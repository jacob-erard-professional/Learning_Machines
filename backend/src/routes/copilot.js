/**
 * @file routes/copilot.js
 * Admin AI Copilot — natural language interface to the request system.
 * Lets admins ask plain-language questions about the request queue and
 * get intelligent answers with actionable suggestions.
 *
 * Example questions:
 * - "Which requests need my attention today?"
 * - "What zip codes are showing high demand this month?"
 * - "How many staff do I need for events this week?"
 */

import { Router } from 'express';
import { getAllRequests } from '../data/store.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * @route POST /api/copilot/query
 * Body: { question: string }
 * Response: { answer: string, suggestions: string[] }
 */
router.post('/query', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { question: 'Question is required.' },
      });
    }

    // Load current system state to give Claude context
    const requests = getAllRequests();
    const today = new Date().toISOString().slice(0, 10);

    // Build a concise stats summary (not full request list — avoid token overload)
    const pending = requests.filter((r) => r.status === 'pending').length;
    const needsReview = requests.filter((r) => r.status === 'needs_review').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const urgent = requests.filter((r) => r.urgency === 'urgent' && ['pending', 'needs_review'].includes(r.status)).length;

    const upcomingStaff = requests
      .filter(
        (r) =>
          r.status === 'approved' &&
          r.fulfillmentRoute === 'staff_deployment' &&
          r.eventDate >= today
      )
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 5)
      .map((r) => `${r.eventName} (${r.eventDate}, ${r.eventCity}, ${r.estimatedAttendees ?? '?'} attendees)`);

    const needsReviewList = requests
      .filter((r) => r.status === 'needs_review')
      .slice(0, 5)
      .map((r) => `${r.id}: ${r.eventName} (${r.eventCity})`);

    const highPriority = requests
      .filter((r) => r.priority === 'high' && r.status === 'pending')
      .map((r) => `${r.id}: ${r.eventName}`);

    const statsContext = `
CURRENT QUEUE STATS (as of ${today}):
- Total requests: ${requests.length}
- Pending (awaiting review): ${pending}
- Needs review (AI failed or flagged): ${needsReview}
- Approved: ${approved}
- Urgent requests needing attention: ${urgent}

UPCOMING APPROVED STAFF EVENTS:
${upcomingStaff.length > 0 ? upcomingStaff.map((e) => `- ${e}`).join('\n') : '- None scheduled'}

REQUESTS NEEDING REVIEW:
${needsReviewList.length > 0 ? needsReviewList.map((e) => `- ${e}`).join('\n') : '- None'}

HIGH PRIORITY PENDING:
${highPriority.length > 0 ? highPriority.map((e) => `- ${e}`).join('\n') : '- None'}
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: `You are the AI Copilot for Intermountain Healthcare's Community Health admin dashboard.
You help admins quickly understand their request queue and decide what to act on.

Your tone: professional, concise, helpful. Like a smart colleague who knows the data.
Keep answers to 3-5 sentences max. Always include 2-3 concrete action suggestions.
Return ONLY valid JSON, no other text.`,
      messages: [
        {
          role: 'user',
          content: `${statsContext}\n\nAdmin question: "${question.trim()}"\n\nReturn JSON: {"answer": "...", "suggestions": ["action 1", "action 2", "action 3"]}\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({
      answer: parsed.answer ?? 'I was unable to process your question.',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (err) {
    console.error('[POST /copilot/query]', err);
    // Graceful fallback — still return something useful
    return res.json({
      answer: 'The AI copilot is temporarily unavailable. Please check the dashboard directly for request details.',
      suggestions: [
        'Review the Needs Review queue for flagged requests',
        'Check upcoming events in the Analytics tab',
        'Review high-priority pending requests',
      ],
    });
  }
});

export default router;
