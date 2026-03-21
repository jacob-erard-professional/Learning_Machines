import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '../lib/api.js';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechDictation({ polishPath, onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const finalTranscriptRef = useRef('');

  const startDictation = useCallback((baseText = '') => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    recognitionRef.current?.abort();
    baseTextRef.current = String(baseText || '').trim();
    finalTranscriptRef.current = '';
    setError(null);
    setIsPolishing(false);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${text}`.trim();
        } else {
          interimTranscript += text;
        }
      }

      finalTranscriptRef.current = finalTranscript;
      const combined = [baseTextRef.current, finalTranscript, interimTranscript.trim()]
        .filter(Boolean)
        .join(baseTextRef.current ? '\n' : ' ')
        .trim();
      onTranscript?.(combined);
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setIsPolishing(false);
      if (event.error === 'aborted') return;

      const message =
        event.error === 'not-allowed'
          ? 'Microphone access was denied. Please allow microphone permission and try again.'
          : event.error === 'no-speech'
            ? 'No speech was detected. Please try again.'
            : `Speech recognition error: ${event.error}`;

      setError(message);
    };

    recognition.onend = async () => {
      setIsRecording(false);
      recognitionRef.current = null;

      const finalText = finalTranscriptRef.current.trim();
      if (!finalText) return;

      setIsPolishing(true);
      try {
        const { text } = await apiPost(polishPath, { transcript: finalText });
        const combined = [baseTextRef.current, text || finalText]
          .filter(Boolean)
          .join(baseTextRef.current ? '\n' : ' ')
          .trim();
        onTranscript?.(combined);
      } catch (err) {
        const combined = [baseTextRef.current, finalText]
          .filter(Boolean)
          .join(baseTextRef.current ? '\n' : ' ')
          .trim();
        onTranscript?.(combined);
        setError(err.message || 'Could not clean up dictated text.');
      } finally {
        setIsPolishing(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript, polishPath]);

  const stopDictation = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isRecording,
    isPolishing,
    error,
    startDictation,
    stopDictation,
  };
}
