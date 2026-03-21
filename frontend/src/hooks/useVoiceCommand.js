/**
 * @file useVoiceCommand.js
 * Admin-side voice command hook using the Web Speech API (SpeechRecognition).
 * Short utterances (≤ ~10 words) are transcribed instantly — no model download.
 *
 * On recognition end, the transcript is sent to POST /api/voice-command/interpret
 * and the resulting action object is passed to onCommand.
 *
 * @param {(action: { action: string, params: object, message: string }) => void} onCommand
 * @returns {{
 *   isListening: boolean,
 *   isProcessing: boolean,
 *   transcript: string,
 *   result: object|null,
 *   error: string|null,
 *   startListening: () => void,
 *   stopListening: () => void,
 * }}
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { apiPost } from '../lib/api.js';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export default function useVoiceCommand(onCommand) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  const handleTranscript = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const action = await apiPost('/api/voice-command/interpret', { command: trimmed });
      setResult(action);
      onCommand?.(action);
    } catch (err) {
      setError(err.message ?? 'Command interpretation failed.');
    } finally {
      setIsProcessing(false);
    }
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Voice commands are not supported in this browser. Try Chrome or Edge.');
      return;
    }

    setError(null);
    setTranscript('');
    setResult(null);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const interim = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = recognitionRef.current?._lastTranscript ?? transcript;
      handleTranscript(finalText);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const msg = event.error === 'not-allowed'
        ? 'Microphone access denied. Please allow microphone permission.'
        : `Speech recognition error: ${event.error}`;
      setError(msg);
    };

    recognition.onresult = (event) => {
      const interim = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(interim);
      recognition._lastTranscript = interim;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [handleTranscript, transcript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    result,
    error,
    startListening,
    stopListening,
  };
}
