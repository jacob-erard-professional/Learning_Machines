/**
 * @file mailer.js
 * Sends outbound request emails through the Gmail API using stored OAuth tokens.
 */

import { google } from 'googleapis';
import { generateEmail } from './emailGenerator.js';
import {
  getAuthorizedOAuthClient,
  getGoogleAuthStatus,
} from './googleAuth.js';

function encodeMessage(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`;
}

export function buildRawMessage({ from, to, replyTo, subject, body }) {
  return encodeMessage(
    [
      `From: ${encodeHeader(from)}`,
      `To: ${to}`,
      `Reply-To: ${replyTo}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      'MIME-Version: 1.0',
      `Subject: ${encodeHeader(subject)}`,
      '',
      body,
    ].join('\r\n')
  );
}

/**
 * Send a generated request email. Submission stays non-blocking if Gmail OAuth
 * has not been connected yet or if delivery fails.
 *
 * @param {Object} request
 * @param {'confirmation'|'approved'|'rejection'|'held'|'followup'} [type='confirmation']
 * @returns {Promise<{status: 'sent'|'failed'|'disabled'|'skipped', to?: string, subject?: string, messageId?: string|null, reason?: string}>}
 */
export async function sendGeneratedEmail(request, type = 'confirmation') {
  if (!request?.requestorEmail) {
    return {
      status: 'skipped',
      reason: 'No requestor email address was provided.',
    };
  }

  const authStatus = await getGoogleAuthStatus();
  if (!authStatus.configured) {
    return {
      status: 'disabled',
      to: request.requestorEmail,
      reason:
        'Google OAuth is not configured. Set GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, and GMAIL_OAUTH_REDIRECT_URI.',
    };
  }

  const auth = await getAuthorizedOAuthClient();
  if (!auth) {
    return {
      status: 'disabled',
      to: request.requestorEmail,
      reason:
        'Gmail is not connected yet. Open /api/auth/google/connect once to authorize the sender account.',
    };
  }

  try {
    const email = await generateEmail(request, type);
    const gmail = google.gmail({ version: 'v1', auth });
    const fromHeader = `"${authStatus.fromName}" <${authStatus.fromAddress}>`;
    const raw = buildRawMessage({
      from: fromHeader,
      to: request.requestorEmail,
      replyTo: authStatus.fromAddress,
      subject: email.subject,
      body: email.body,
    });

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      status: 'sent',
      to: request.requestorEmail,
      subject: email.subject,
      messageId: response.data.id ?? null,
    };
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return {
      status: 'failed',
      to: request.requestorEmail,
      reason: err.message,
    };
  }
}

export async function sendConfirmationEmail(request) {
  return sendGeneratedEmail(request, 'confirmation');
}
