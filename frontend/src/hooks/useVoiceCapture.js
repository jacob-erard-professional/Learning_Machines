/**
 * @file useVoiceCapture.js
 * Shared audio capture hook used by both voice features:
 * - useWhisperTranscription (user-side conversational intake)
 * - useVoiceCommand (admin-side voice commands)
 *
 * Manages MediaRecorder lifecycle and exposes an audioBlob when recording stops.
 */

import { useState, useRef, useCallback } from 'react';

/**
 * Manages MediaRecorder for audio capture.
 *
 * @returns {{
 *   isRecording: boolean,
 *   audioBlob: Blob|null,
 *   error: string|null,
 *   startCapture: () => Promise<void>,
 *   stopCapture: () => void,
 *   reset: () => void,
 * }}
 */
export default function useVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  /**
   * Requests microphone access and starts recording.
   */
  const startCapture = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.onerror = (e) => {
        setError(`Recording error: ${e.error?.message ?? 'unknown'}`);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Microphone access was denied. Please allow microphone permission and try again.'
        : `Could not start recording: ${err.message}`);
    }
  }, []);

  /**
   * Stops the active recording. audioBlob is set asynchronously via onstop.
   */
  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  /**
   * Resets audioBlob and error. Does not affect an in-progress recording.
   */
  const reset = useCallback(() => {
    setAudioBlob(null);
    setError(null);
  }, []);

  return { isRecording, audioBlob, error, startCapture, stopCapture, reset };
}
