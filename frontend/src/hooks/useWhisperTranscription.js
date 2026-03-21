/**
 * @file useWhisperTranscription.js
 * Hook that combines useVoiceCapture (MediaRecorder) with a Whisper Web Worker
 * to produce transcribed text from microphone audio.
 *
 * The worker is constructed lazily on first use and reused for the lifetime of
 * the component.  Audio is decoded, resampled to 16 kHz, and posted as a
 * Float32Array to avoid heavy work on the main thread.
 *
 * @returns {{
 *   isModelLoading: boolean,
 *   modelProgress: number,
 *   isRecording: boolean,
 *   transcript: string,
 *   error: string|null,
 *   startRecording: () => Promise<void>,
 *   stopRecording: () => void,
 *   clearTranscript: () => void,
 * }}
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import useVoiceCapture from './useVoiceCapture.js';

export default function useWhisperTranscription() {
  const { isRecording, audioBlob, error: captureError, startCapture, stopCapture, reset } =
    useVoiceCapture();

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [workerError, setWorkerError] = useState(null);

  const workerRef = useRef(null);

  // -------------------------------------------------------------------------
  // Worker lifecycle
  // -------------------------------------------------------------------------

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL('../workers/whisper.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'loading':
          setIsModelLoading(true);
          setModelProgress(data.progress ?? 0);
          break;
        case 'ready':
          setIsModelLoading(false);
          setModelProgress(1);
          break;
        case 'transcript':
          setTranscript(data.text ?? '');
          setIsModelLoading(false);
          break;
        case 'error':
          setWorkerError(data.message ?? 'Transcription failed');
          setIsModelLoading(false);
          break;
        default:
          break;
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Process audioBlob → resample → post to worker
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!audioBlob) return;

    let cancelled = false;

    async function processBlob() {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode using browser's AudioContext (supports webm/opus from MediaRecorder)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000,
        });

        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();

        if (cancelled) return;

        // Extract mono Float32Array at 16 kHz (Whisper requirement)
        const float32 = decoded.getChannelData(0);

        const worker = getWorker();
        worker.postMessage({ type: 'transcribe', audioData: float32 }, [float32.buffer]);

        // Clear the blob after consuming it so re-renders don't re-process
        reset();
      } catch (err) {
        if (!cancelled) {
          setWorkerError(`Audio processing failed: ${err.message}`);
        }
      }
    }

    processBlob();
    return () => { cancelled = true; };
  }, [audioBlob, getWorker, reset]);

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    setWorkerError(null);
    setTranscript('');
    // Eagerly spin up the worker so model starts loading while user records
    getWorker();
    await startCapture();
  }, [getWorker, startCapture]);

  const stopRecording = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setWorkerError(null);
  }, []);

  return {
    isModelLoading,
    modelProgress,
    isRecording,
    transcript,
    error: captureError ?? workerError,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
