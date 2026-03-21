/**
 * @file useWhisperTranscription.test.js
 * Unit tests for the browser SpeechRecognition-backed voice hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useWhisperTranscription from '../../src/hooks/useWhisperTranscription.js';

let recognitionInstance = null;

class MockRecognition {
  constructor() {
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.start = vi.fn(() => {
      this.onstart?.();
    });
    this.stop = vi.fn(() => {
      this.onend?.();
    });
    this.abort = vi.fn();
    recognitionInstance = this;
  }

  emitResult(results, resultIndex = 0) {
    this.onresult?.({ results, resultIndex });
  }

  emitError(error) {
    this.onerror?.({ error });
  }
}

describe('useWhisperTranscription', () => {
  beforeEach(() => {
    recognitionInstance = null;
    window.SpeechRecognition = MockRecognition;
    window.webkitSpeechRecognition = undefined;
  });

  it('initial state is idle', () => {
    const { result } = renderHook(() => useWhisperTranscription());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.isTranscriptFinal).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isModelLoading).toBe(false);
  });

  it('starts browser speech recognition', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(recognitionInstance).not.toBeNull();
    expect(recognitionInstance.start).toHaveBeenCalledOnce();
    expect(result.current.isRecording).toBe(true);
    expect(result.current.isTranscriptFinal).toBe(false);
  });

  it('stops active recognition', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(recognitionInstance.stop).toHaveBeenCalledOnce();
    expect(result.current.isRecording).toBe(false);
  });

  it('updates transcript from speech results and clears it', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      recognitionInstance.emitResult([
        { 0: { transcript: 'Hello world' }, isFinal: true, length: 1 },
      ]);
    });

    expect(result.current.transcript).toBe('Hello world');
    expect(result.current.isTranscriptFinal).toBe(false);

    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toBe('');
    expect(result.current.isTranscriptFinal).toBe(false);
  });

  it('shows interim transcript immediately', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      recognitionInstance.emitResult([
        { 0: { transcript: 'Test transcript' }, isFinal: false, length: 1 },
      ]);
    });

    expect(result.current.transcript).toBe('Test transcript');
    expect(result.current.isModelLoading).toBe(false);
    expect(result.current.modelProgress).toBe(1);
    expect(result.current.isTranscriptFinal).toBe(false);
  });

  it('marks transcript final when recognition ends', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      recognitionInstance.emitResult([
        { 0: { transcript: 'Final text' }, isFinal: true, length: 1 },
      ]);
      recognitionInstance.stop();
    });

    expect(result.current.transcript).toBe('Final text');
    expect(result.current.isTranscriptFinal).toBe(true);
  });

  it('surfaces speech recognition errors', async () => {
    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      recognitionInstance.emitError('network');
    });

    expect(result.current.error).toBe('Speech recognition error: network');
  });

  it('handles unsupported browsers', async () => {
    window.SpeechRecognition = undefined;

    const { result } = renderHook(() => useWhisperTranscription());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toMatch(/not supported/i);
  });
});
