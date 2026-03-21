/**
 * @file voiceIntakeService.test.js
 * Unit tests for voiceIntakeService — all Claude API calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Anthropic SDK before importing the service
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

// Helper to access the mock after module is loaded
async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk');
  return mod.__mockCreate;
}

import {
  createSession,
  sendMessage,
  deleteSession,
  safeParseResponse,
} from '../../src/services/voiceIntakeService.js';

const GREETING_JSON = JSON.stringify({
  message: 'Hi! I\'m here to help you submit a community health request. What\'s your full name?',
  extractedFields: {},
  isComplete: false,
});

const REPLY_JSON = JSON.stringify({
  message: 'Great, Jane! What\'s the best email address to reach you?',
  extractedFields: { requestorName: 'Jane Smith' },
  isComplete: false,
});

describe('safeParseResponse', () => {
  it('parses clean JSON', () => {
    const result = safeParseResponse('{"message":"hi","extractedFields":{},"isComplete":false}');
    expect(result.message).toBe('hi');
  });

  it('strips markdown code fences', () => {
    const result = safeParseResponse('```json\n{"message":"hi","extractedFields":{},"isComplete":false}\n```');
    expect(result.message).toBe('hi');
  });

  it('returns fallback on invalid JSON', () => {
    const result = safeParseResponse('not json at all');
    expect(result.message).toBe('not json at all');
    expect(result.extractedFields).toEqual({});
    expect(result.isComplete).toBe(false);
  });
});

describe('createSession', () => {
  beforeEach(async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: GREETING_JSON }] });
  });

  it('returns a sessionId and greeting', async () => {
    const { sessionId, greeting } = await createSession();
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(greeting).toContain('help you submit');
  });

  it('pre-seeds extractedFields from initialFields', async () => {
    const { sessionId } = await createSession({ requestorName: 'Pre-filled Name' });
    expect(sessionId).toBeTruthy();
    // Send a message and verify pre-filled field is preserved
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({
        message: 'Got it! What is your email?',
        extractedFields: { requestorEmail: 'test@example.com' },
        isComplete: false,
      }) }],
    });
    const result = await sendMessage(sessionId, 'my email is test@example.com');
    expect(result.extractedFields.requestorName).toBe('Pre-filled Name');
    expect(result.extractedFields.requestorEmail).toBe('test@example.com');
  });
});

describe('sendMessage', () => {
  let sessionId;

  beforeEach(async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: GREETING_JSON }] });
    const session = await createSession();
    sessionId = session.sessionId;
  });

  it('merges newly extracted fields into session state', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: REPLY_JSON }] });

    const result = await sendMessage(sessionId, 'My name is Jane Smith');
    expect(result.extractedFields.requestorName).toBe('Jane Smith');
    expect(result.isComplete).toBe(false);
  });

  it('sets isComplete when all 8 fields are present', async () => {
    const mockCreate = await getMockCreate();
    const allFields = {
      requestorName: 'Jane Smith',
      requestorEmail: 'jane@example.com',
      requestorPhone: '(801) 555-0100',
      eventName: 'Health Fair',
      eventDate: '2026-05-01',
      eventCity: 'Salt Lake City',
      eventZip: '84101',
      requestType: 'staff_support',
    };
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({ message: 'All done!', extractedFields: allFields, isComplete: true }) }],
    });

    const result = await sendMessage(sessionId, 'all filled in');
    expect(result.isComplete).toBe(true);
    expect(Object.values(result.extractedFields).every((v) => v !== null)).toBe(true);
  });

  it('throws 404 for unknown sessionId', async () => {
    await expect(sendMessage('nonexistent-id', 'hello')).rejects.toMatchObject({ status: 404 });
  });
});

describe('deleteSession', () => {
  it('removes an existing session and returns true', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: GREETING_JSON }] });
    const { sessionId } = await createSession();
    expect(deleteSession(sessionId)).toBe(true);
  });

  it('returns false for unknown sessionId', () => {
    expect(deleteSession('does-not-exist')).toBe(false);
  });

  it('is idempotent — second delete also returns false', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: GREETING_JSON }] });
    const { sessionId } = await createSession();
    deleteSession(sessionId);
    expect(deleteSession(sessionId)).toBe(false);
  });
});

describe('System prompt topic enforcement', () => {
  it('system prompt includes redirect instruction', async () => {
    // Verify the prompt string contains the off-topic redirect phrase
    // by importing the module and inspecting what gets sent to Claude
    const mockCreate = await getMockCreate();
    let capturedSystem = '';
    mockCreate.mockImplementation(async ({ system }) => {
      capturedSystem = system;
      return { content: [{ text: GREETING_JSON }] };
    });

    await createSession();
    expect(capturedSystem).toContain('off-topic');
    expect(capturedSystem).toContain('redirect');
  });
});
