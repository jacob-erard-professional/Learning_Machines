/**
 * @file emailGenerator.js
 * Generates personalized email content for community health requestors.
 * Uses Claude to produce warm, professional healthcare communications.
 *
 * Supported email types:
 * - confirmation: Sent after request submission
 * - approved: Sent when a request is approved
 * - rejection: Sent when a request is rejected
 * - held: Sent when admin needs more info before deciding
 * - followup: Post-event follow-up
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';

/** Fallback templates for when the AI is unavailable */
const FALLBACK_TEMPLATES = {
  confirmation: {
    subject: 'Your Community Health Request Has Been Received',
    body: `Dear {name},\n\nThank you for submitting your community health support request for {eventName}. We have received your request and it is currently under review.\n\nRequest ID: {id}\nEvent Date: {eventDate}\n\nA member of our Community Health team will follow up with you shortly.\n\nWarm regards,\nIntermountain Community Health Team`,
  },
  approved: {
    subject: 'Your Community Health Request Has Been Approved',
    body: `Dear {name},\n\nWe are pleased to let you know that your community health support request for {eventName} has been approved.\n\nRequest ID: {id}\nEvent Date: {eventDate}\n\nOur team will follow up with any next steps or logistical details if needed.\n\nWarm regards,\nIntermountain Community Health Team`,
  },
  rejection: {
    subject: 'Update on Your Community Health Request',
    body: `Dear {name},\n\nThank you for your interest in partnering with Intermountain Healthcare's Community Health program.\n\nAfter review, we are unfortunately unable to fulfill your request (ID: {id}) for {eventName} at this time.\n\nWe encourage you to resubmit for future events.\n\nWarm regards,\nIntermountain Community Health Team`,
  },
  held: {
    subject: 'Your Community Health Request Is On Hold',
    body: `Dear {name},\n\nThank you for your community health support request (ID: {id}) for {eventName}.\n\nYour request is currently on hold while our team reviews a few additional details. Please reply to this email if you can provide any information that may help us continue processing it.\n\nWarm regards,\nIntermountain Community Health Team`,
  },
  followup: {
    subject: 'Follow-Up: Your Recent Community Health Event',
    body: `Dear {name},\n\nWe hope {eventName} was a success! Thank you for partnering with Intermountain Healthcare's Community Health program.\n\nWe would love to hear about the impact of the event. Please feel free to share any feedback.\n\nWarm regards,\nIntermountain Community Health Team`,
  },
};

/**
 * Fills simple {placeholder} tokens in a fallback template string.
 * @param {string} template
 * @param {Object} request
 * @returns {string}
 */
function fillTemplate(template, request) {
  return template
    .replace('{name}', request.requestorName ?? 'Community Partner')
    .replace('{eventName}', request.eventName ?? 'your event')
    .replace('{id}', request.id ?? '')
    .replace('{eventDate}', request.eventDate ?? '');
}

/**
 * Generates a personalized email for a requestor using Claude.
 * Falls back to a generic template if the AI call fails.
 *
 * @param {Object} request - The request object from the store
 * @param {'confirmation'|'approved'|'rejection'|'held'|'followup'} type - Email type
 * @returns {Promise<{ subject: string, body: string }>}
 */
export async function generateEmail(request, type) {
  const validTypes = ['confirmation', 'approved', 'rejection', 'held', 'followup'];
  if (!validTypes.includes(type)) {
    type = 'confirmation';
  }

  try {
    const context = `
Request ID: ${request.id}
Requestor Name: ${request.requestorName}
Event Name: ${request.eventName}
Event Date: ${request.eventDate}
Event City: ${request.eventCity}
Request Type: ${request.requestType}
Fulfillment Route: ${request.fulfillmentRoute}
Status: ${request.status}
Admin Notes: ${request.adminNotes || 'None'}
`;

    const typeInstructions = {
      confirmation: 'Write a warm confirmation email acknowledging receipt of their community health support request. Mention the request ID and event date. Let them know a team member will follow up.',
      approved: 'Write a warm, concise approval email telling them their request has been approved. Mention the request ID and event date. Do not ask for post-event feedback or imply the event has already happened.',
      rejection: 'Write a respectful, empathetic rejection email. Do not be apologetic to a fault — be professional. Include the reason from admin notes if available. Encourage future engagement.',
      held: 'Write a clear, friendly email telling them their request is on hold pending more information or review. Reference the admin notes for what specifically is needed. Do not reject or approve the request.',
      followup: 'Write a warm post-event follow-up email thanking them for partnering with Intermountain. Ask about event outcomes and encourage future requests.',
    };

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are the Community Health communications specialist for Intermountain Healthcare.
Write professional, warm, and accessible emails to community partners.
Tone: friendly but professional, warm, trustworthy. This is a healthcare context — be clear and human.
Return ONLY valid JSON with "subject" and "body" fields. No other text.`,
      messages: [
        {
          role: 'user',
          content: `Write a ${type} email for this community health request:\n\n${context}\n\nInstruction: ${typeInstructions[type]}\n\nReturn ONLY valid JSON: {"subject": "...", "body": "..."}\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return {
      subject: parsed.subject ?? FALLBACK_TEMPLATES[type].subject,
      body: parsed.body ?? fillTemplate(FALLBACK_TEMPLATES[type].body, request),
    };
  } catch (err) {
    console.error('[emailGenerator] AI error, using fallback:', err.message);
    const tpl = FALLBACK_TEMPLATES[type];
    return {
      subject: tpl.subject,
      body: fillTemplate(tpl.body, request),
    };
  }
}
