/**
 * @file voiceCommandService.js
 * Interprets natural language admin voice commands using Claude.
 *
 * Maps spoken commands like "Show high priority events this week" to structured
 * filter/navigation actions that the admin queue UI can apply directly.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * Interprets a natural language admin command and returns a structured action.
 *
 * @param {string} commandText - The spoken/typed command from the admin
 * @returns {Promise<{ action: string, params: object, message: string }>}
 *   action: 'filter' | 'reset' | 'navigate' | 'unknown'
 *   params: filter parameters (see action types below)
 *   message: human-readable confirmation or error
 */
export async function interpretCommand(commandText) {
  if (!commandText || !commandText.trim()) {
    return { action: 'unknown', params: {}, message: 'No command received.' };
  }

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are a voice command interpreter for an admin dashboard managing community health event requests.
Today's date is ${today}.

Your job: parse the admin's spoken command into a structured JSON action.

## Supported actions and their params:

"filter" — apply filters to the request queue:
  priority: "high" | "urgent" | "low"
  dateRange: "today" | "this_week" | "this_month"
  requestType: "staff_support" | "mailed_materials" | "pickup"
  geoFlag: "high_demand" | "underserved"
  status: "pending" | "approved" | "rejected" | "needs_review" | "fulfilled"

"reset" — clear all active filters (no params needed)

"navigate" — navigate to a different page:
  route: "/dashboard" | "/queue" | "/geo-equity" | "/analytics"

"unknown" — command not understood (include a helpful message suggesting valid commands)

## Response format (JSON only, no prose):
{
  "action": "filter",
  "params": { "priority": "high", "dateRange": "this_week" },
  "message": "Showing high priority events this week."
}

## Examples:
- "Show high priority events this week" → { "action": "filter", "params": { "priority": "high", "dateRange": "this_week" }, "message": "Showing high priority events this week." }
- "Show urgent events" → { "action": "filter", "params": { "priority": "urgent" }, "message": "Filtering to urgent events." }
- "Show underserved regions" → { "action": "filter", "params": { "geoFlag": "underserved" }, "message": "Showing underserved regions." }
- "Reset filters" → { "action": "reset", "params": {}, "message": "All filters cleared." }
- "Go to analytics" → { "action": "navigate", "params": { "route": "/analytics" }, "message": "Navigating to analytics." }`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: commandText }],
    });

    const text = response.content[0].text;
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Claude returned non-JSON — treat as unknown
      return { action: 'unknown', params: {}, message: 'Sorry, I didn\'t understand that command. Try "Show high priority events" or "Reset filters".' };
    }
    throw err;
  }
}
