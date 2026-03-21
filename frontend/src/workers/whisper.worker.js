/**
 * @file whisper.worker.js
 * Web Worker that runs Whisper-tiny.en inference via @xenova/transformers.
 * Runs in a separate thread to keep the UI non-blocking.
 *
 * Inbound messages:
 *   { type: 'transcribe', audioData: Float32Array }
 *
 * Outbound messages:
 *   { type: 'loading', progress: number }   — model download progress (0–1)
 *   { type: 'ready' }                        — model loaded, ready to transcribe
 *   { type: 'transcript', text: string }     — transcription result
 *   { type: 'error', message: string }       — any error
 */

import { pipeline, env } from '@xenova/transformers';

// Never attempt to load from local filesystem — always fetch from Hub
env.allowLocalModels = false;

let transcriber = null;

/**
 * Lazily loads the Whisper pipeline the first time a transcription is requested.
 * Subsequent calls return the cached instance.
 */
async function getTranscriber() {
  if (transcriber) return transcriber;

  transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny.en',
    {
      progress_callback: (progress) => {
        // progress.progress is 0–100; normalise to 0–1
        const fraction = (progress.progress ?? 0) / 100;
        self.postMessage({ type: 'loading', progress: fraction });
      },
    }
  );

  self.postMessage({ type: 'ready' });
  return transcriber;
}

self.onmessage = async ({ data }) => {
  if (data.type !== 'transcribe') return;

  try {
    const model = await getTranscriber();
    const result = await model(data.audioData, {
      sampling_rate: 16000,
    });
    self.postMessage({ type: 'transcript', text: result.text?.trim() ?? '' });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message ?? 'Transcription failed' });
  }
};
