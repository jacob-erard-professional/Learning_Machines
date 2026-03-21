/**
 * @file useWhisperTranscription.test.js
 * Unit tests for useWhisperTranscription hook.
 * The Web Worker and useVoiceCapture are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useVoiceCapture
// ---------------------------------------------------------------------------
const mockStartCapture = vi.fn();
const mockStopCapture = vi.fn();
const mockReset = vi.fn();
let captureState = {
  isRecording: false,
  audioBlob: null,
  error: null,
};

vi.mock('../../src/hooks/useVoiceCapture.js', () => ({
  default: () => ({
    ...captureState,
    startCapture: mockStartCapture,
    stopCapture: mockStopCapture,
    reset: mockReset,
  }),
}));

// ---------------------------------------------------------------------------
// Mock Web Worker
// ---------------------------------------------------------------------------
let _workerInstance = null;
const mockWorkerPostMessage = vi.fn();

class MockWorker {
  constructor() {
    this.onmessage = null;
    _workerInstance = this;
  }
  postMessage(data) {
    mockWorkerPostMessage(data);
  }
  terminate() {
    _workerInstance = null;
  }
  /** Helper: simulate incoming message from worker */
  simulateMessage(data) {
    this.onmessage?.({ data });
  }
}

vi.stubGlobal('Worker', MockWorker);

// ---------------------------------------------------------------------------
// Mock URL as a proper constructor (needed for `new URL(path, base)`)
// ---------------------------------------------------------------------------
class MockURL {
  constructor(url) { this.href = String(url); }
  toString() { return this.href; }
  static createObjectURL() { return 'blob:mock-url'; }
  static revokeObjectURL() {}
}
vi.stubGlobal('URL', MockURL);

import useWhisperTranscription from '../../src/hooks/useWhisperTranscription.js';

describe('useWhisperTranscription', () => {
  beforeEach(() => {
    captureState = { isRecording: false, audioBlob: null, error: null };
    mockStartCapture.mockReset();
    mockStopCapture.mockReset();
    mockReset.mockReset();
    mockWorkerPostMessage.mockReset();
    _workerInstance = null;
  });

  it('initial state is idle', () => {
    const { result } = renderHook(() => useWhisperTranscription());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isModelLoading).toBe(false);
  });

  it('startRecording calls startCapture', async () => {
    const { result } = renderHook(() => useWhisperTranscription());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(mockStartCapture).toHaveBeenCalledOnce();
  });

  it('stopRecording calls stopCapture', () => {
    const { result } = renderHook(() => useWhisperTranscription());
    act(() => {
      result.current.stopRecording();
    });
    expect(mockStopCapture).toHaveBeenCalledOnce();
  });

  it('clearTranscript resets transcript', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    // Spin up the worker first so we can simulate messages
    await act(async () => { await result.current.startRecording(); });

    act(() => { _workerInstance?.simulateMessage({ type: 'transcript', text: 'Hello world' }); });
    expect(result.current.transcript).toBe('Hello world');

    act(() => { result.current.clearTranscript(); });
    expect(result.current.transcript).toBe('');
  });

  it('sets isModelLoading while worker reports loading', async () => {
    const { result } = renderHook(() => useWhisperTranscription());
    await act(async () => { await result.current.startRecording(); });

    act(() => { _workerInstance?.simulateMessage({ type: 'loading', progress: 0.4 }); });

    expect(result.current.isModelLoading).toBe(true);
    expect(result.current.modelProgress).toBeCloseTo(0.4);
  });

  it('clears isModelLoading when model is ready', async () => {
    const { result } = renderHook(() => useWhisperTranscription());
    await act(async () => { await result.current.startRecording(); });

    act(() => { _workerInstance?.simulateMessage({ type: 'loading', progress: 1.0 }); });
    act(() => { _workerInstance?.simulateMessage({ type: 'ready' }); });

    expect(result.current.isModelLoading).toBe(false);
  });

  it('sets transcript when worker returns transcript message', async () => {
    const { result } = renderHook(() => useWhisperTranscription());
    await act(async () => { await result.current.startRecording(); });

    act(() => { _workerInstance?.simulateMessage({ type: 'transcript', text: 'Test transcript' }); });

    expect(result.current.transcript).toBe('Test transcript');
  });

  it('sets error when worker returns error message', async () => {
    const { result } = renderHook(() => useWhisperTranscription());
    await act(async () => { await result.current.startRecording(); });

    act(() => { _workerInstance?.simulateMessage({ type: 'error', message: 'Model load failed' }); });

    expect(result.current.error).toBe('Model load failed');
  });

  it('capture error is surfaced through error state', () => {
    captureState = { isRecording: false, audioBlob: null, error: 'Mic denied' };
    const { result } = renderHook(() => useWhisperTranscription());
    expect(result.current.error).toBe('Mic denied');
  });
});
