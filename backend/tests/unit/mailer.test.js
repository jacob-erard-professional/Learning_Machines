import { describe, expect, it } from 'vitest';
import { buildRawMessage } from '../../src/lib/mailer.js';

function decodeRawMessage(raw) {
  return Buffer.from(
    raw.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf8');
}

describe('buildRawMessage', () => {
  it('MIME-encodes UTF-8 subjects so punctuation is preserved', () => {
    const raw = buildRawMessage({
      from: '"Learning Machines" <erardjacob@gmail.com>',
      to: 'user@example.com',
      replyTo: 'erardjacob@gmail.com',
      subject: 'We\'ve Received Your Community Health Request – REQ-937890',
      body: 'Test body',
    });

    const decoded = decodeRawMessage(raw);

    expect(decoded).toContain(
      'Subject: =?UTF-8?B?V2UndmUgUmVjZWl2ZWQgWW91ciBDb21tdW5pdHkgSGVhbHRoIFJlcXVlc3Qg4oCTIFJFUS05Mzc4OTA=?='
    );
    expect(decoded).toContain('Content-Transfer-Encoding: 8bit');
  });
});
