/**
 * @file voiceIntake.test.js
 * Integration tests for /api/voice-intake endpoints using Supertest.
 * All Claude API calls are mocked at the module level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ text: JSON.stringify({
      message: 'Hi! What is your name?',
      extractedFields: {},
      isComplete: false,
    }) }],
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

describe('POST /api/voice-intake/start', () => {
  it('returns 200 with sessionId and greeting', async () => {
    const res = await request(app).post('/api/voice-intake/start').send({});
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeTruthy();
    expect(typeof res.body.greeting).toBe('string');
  });

  it('accepts optional initialFields', async () => {
    const res = await request(app).post('/api/voice-intake/start').send({
      initialFields: { requestorName: 'Jane' },
    });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeTruthy();
  });
});

describe('POST /api/voice-intake/message', () => {
  let sessionId;

  beforeEach(async () => {
    const res = await request(app).post('/api/voice-intake/start').send({});
    sessionId = res.body.sessionId;
  });

  it('returns 200 with reply, extractedFields, and isComplete', async () => {
    const res = await request(app)
      .post('/api/voice-intake/message')
      .send({ sessionId, message: 'My name is Jane Smith' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.extractedFields).toBeDefined();
    expect(typeof res.body.isComplete).toBe('boolean');
  });

  it('returns 400 when sessionId is missing', async () => {
    const res = await request(app)
      .post('/api/voice-intake/message')
      .send({ message: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sessionId/i);
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/voice-intake/message')
      .send({ sessionId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('returns 404 for unknown sessionId', async () => {
    const res = await request(app)
      .post('/api/voice-intake/message')
      .send({ sessionId: 'unknown-session-id', message: 'hello' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/voice-intake/:sessionId', () => {
  it('returns 204 for an existing session', async () => {
    const start = await request(app).post('/api/voice-intake/start').send({});
    const { sessionId } = start.body;

    const res = await request(app).delete(`/api/voice-intake/${sessionId}`);
    expect(res.status).toBe(204);
  });

  it('returns 204 for a non-existent session (idempotent)', async () => {
    const res = await request(app).delete('/api/voice-intake/nonexistent-id');
    expect(res.status).toBe(204);
  });

  it('second delete also returns 204', async () => {
    const start = await request(app).post('/api/voice-intake/start').send({});
    const { sessionId } = start.body;

    await request(app).delete(`/api/voice-intake/${sessionId}`);
    const res = await request(app).delete(`/api/voice-intake/${sessionId}`);
    expect(res.status).toBe(204);
  });
});
