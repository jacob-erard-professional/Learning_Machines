/**
 * @file voiceCommandService.test.js
 * Unit tests for voiceCommandService — all Claude API calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk');
  return mod.__mockCreate;
}

import { interpretCommand } from '../../src/services/voiceCommandService.js';

describe('interpretCommand', () => {
  beforeEach(async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockReset();
  });

  it('returns filter action for high priority this week', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({
        action: 'filter',
        params: { priority: 'high', dateRange: 'this_week' },
        message: 'Showing high priority events this week.',
      }) }],
    });

    const result = await interpretCommand('Show high priority events this week');
    expect(result.action).toBe('filter');
    expect(result.params.priority).toBe('high');
    expect(result.params.dateRange).toBe('this_week');
  });

  it('returns filter action for underserved regions', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({
        action: 'filter',
        params: { geoFlag: 'underserved' },
        message: 'Showing underserved regions.',
      }) }],
    });

    const result = await interpretCommand('Show underserved regions');
    expect(result.action).toBe('filter');
    expect(result.params.geoFlag).toBe('underserved');
  });

  it('returns reset action', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({
        action: 'reset',
        params: {},
        message: 'All filters cleared.',
      }) }],
    });

    const result = await interpretCommand('Reset filters');
    expect(result.action).toBe('reset');
    expect(result.params).toEqual({});
  });

  it('returns unknown for unrecognised commands', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify({
        action: 'unknown',
        params: {},
        message: 'Sorry, I didn\'t understand that command.',
      }) }],
    });

    const result = await interpretCommand('What is the weather today?');
    expect(result.action).toBe('unknown');
  });

  it('returns unknown fallback when Claude returns non-JSON', async () => {
    const mockCreate = await getMockCreate();
    mockCreate.mockResolvedValue({ content: [{ text: 'not valid json' }] });

    const result = await interpretCommand('gibberish command');
    expect(result.action).toBe('unknown');
  });

  it('returns unknown for empty command', async () => {
    const result = await interpretCommand('');
    expect(result.action).toBe('unknown');
  });
});
