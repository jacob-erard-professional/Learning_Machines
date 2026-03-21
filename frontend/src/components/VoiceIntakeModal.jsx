/**
 * @file VoiceIntakeModal.jsx
 * Conversational AI intake modal that lets a user fill the request form
 * via voice or text chat.
 *
 * Flow:
 *  1. Mount → POST /api/voice-intake/start (pre-seeds with initialFields)
 *  2. Chat loop → POST /api/voice-intake/message per user turn
 *  3. When isComplete → show editable review step
 *  4. User confirms → call onComplete(extractedFields), close modal
 *  5. Close / cancel → DELETE session, call onClose()
 *
 * Voice input uses useWhisperTranscription (Whisper-tiny.en via WASM worker).
 * Text input is always available as a fallback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import useWhisperTranscription from '../hooks/useWhisperTranscription.js';
import { apiPost, apiDelete } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function MicButton({ isRecording, isLoading, onClick }) {
  return (
    <button
      type="button"
      aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
      onClick={onClick}
      disabled={isLoading}
      className={[
        'flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400'
          : 'bg-teal-100 hover:bg-teal-200 text-teal-700 focus:ring-teal-400',
        isLoading && 'opacity-50 cursor-not-allowed',
      ].join(' ')}
    >
      {isRecording ? (
        /* Stop icon */
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="1" />
        </svg>
      ) : (
        /* Mic icon */
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 8 1z" />
          <path d="M4 8.5A4 4 0 0 0 12 8.5v-1h-1v1a3 3 0 0 1-6 0v-1H4v1z" />
          <path d="M7.5 13.5v1.5h1v-1.5A5.5 5.5 0 0 0 13.5 8h-1A4.5 4.5 0 0 1 7.5 12.5v1z" />
        </svg>
      )}
    </button>
  );
}

function VoiceStatusIndicator({ isRecording, isProcessing }) {
  if (!isRecording && !isProcessing) return null;

  const label = isRecording ? 'Listening' : 'Transcribing';
  const toneClasses = isRecording
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-teal-200 bg-teal-50 text-teal-700';
  const pulseClasses = isRecording ? 'bg-red-500' : 'bg-teal-500';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${toneClasses}`}
      aria-live="polite"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${pulseClasses}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${pulseClasses}`} />
      </span>
      {label}
    </div>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={[
          'max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-teal-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  );
}

function ReviewStep({ fields, onChange, onConfirm, onBack }) {
  const labels = {
    requestorName: 'Your name',
    requestorEmail: 'Email',
    requestorPhone: 'Phone',
    eventName: 'Event name',
    eventDate: 'Event date',
    eventCity: 'City',
    eventZip: 'ZIP code',
    requestType: 'Request type',
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Review the information below. You can edit any field before filling the form.
      </p>
      <div className="grid gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{label}</span>
            <input
              type="text"
              value={fields[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back to chat
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          Fill form with these answers
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VoiceIntakeModal({ isOpen, onClose, onComplete, initialFields = {} }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // { role: 'assistant'|'user', text: string }
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPolishingTranscript, setIsPolishingTranscript] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFields, setReviewFields] = useState({});

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionIdRef = useRef(null); // stable ref for cleanup

  const {
    isModelLoading,
    isTranscribing,
    modelProgress,
    isRecording,
    transcript,
    isTranscriptFinal,
    error: voiceError,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useWhisperTranscription();

  // -------------------------------------------------------------------------
  // Start session on open
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function startSession() {
      try {
        const { sessionId: sid, greeting } = await apiPost('/api/voice-intake/start', {
          initialFields,
        });
        if (cancelled) return;
        setSessionId(sid);
        sessionIdRef.current = sid;
        setMessages([{ role: 'assistant', text: greeting }]);
      } catch (err) {
        if (!cancelled) setApiError('Could not start session. Please try again.');
      }
    }

    startSession();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When Whisper produces a transcript, put it in the text input for review
  useEffect(() => {
    if (transcript && !isTranscriptFinal) {
      setInputText(transcript);
    }
  }, [transcript, isTranscriptFinal]);

  useEffect(() => {
    if (!transcript || !isTranscriptFinal) return;

    let cancelled = false;

    async function polishText() {
      setInputText(transcript);
      setIsPolishingTranscript(true);

      try {
        const result = await apiPost('/api/voice-intake/polish', { transcript });
        if (!cancelled) {
          setInputText(result.text || transcript);
          inputRef.current?.focus();
        }
      } catch (_) {
        if (!cancelled) {
          setInputText(transcript);
          inputRef.current?.focus();
        }
      } finally {
        if (!cancelled) {
          setIsPolishingTranscript(false);
          clearTranscript();
        }
      }
    }

    polishText();
    return () => {
      cancelled = true;
    };
  }, [transcript, isTranscriptFinal, clearTranscript]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '0px';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
  }, [inputText]);

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Close / cleanup
  // -------------------------------------------------------------------------

  const handleClose = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      try { await apiDelete(`/api/voice-intake/${sid}`); } catch (_) { /* best-effort */ }
      sessionIdRef.current = null;
    }
    setSessionId(null);
    setMessages([]);
    setInputText('');
    setIsReviewing(false);
    setReviewFields({});
    setApiError(null);
    onClose();
  }, [onClose]);

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionId || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInputText('');
    setIsSending(true);
    setApiError(null);

    try {
      const { reply, extractedFields, isComplete } = await apiPost('/api/voice-intake/message', {
        sessionId,
        message: trimmed,
      });

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);

      if (isComplete) {
        setReviewFields(extractedFields ?? {});
        setIsReviewing(true);
      }
    } catch (err) {
      setApiError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [sessionId, isSending]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  // -------------------------------------------------------------------------
  // Voice toggle
  // -------------------------------------------------------------------------

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // -------------------------------------------------------------------------
  // Review confirm
  // -------------------------------------------------------------------------

  const handleConfirmReview = useCallback(() => {
    onComplete(reviewFields);
    handleClose();
  }, [reviewFields, onComplete, handleClose]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Voice intake assistant"
    >
      <div className="relative flex h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Voice Assistant</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              AI-powered — responses are generated and may need review
            </p>
          </div>
          <button
            type="button"
            aria-label="Close voice assistant"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isReviewing ? (
            <ReviewStep
              fields={reviewFields}
              onChange={(key, val) => setReviewFields((prev) => ({ ...prev, [key]: val }))}
              onConfirm={handleConfirmReview}
              onBack={() => setIsReviewing(false)}
            />
          ) : (
            <>
              {/* Chat messages */}
              <div className="flex flex-col">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role} text={msg.text} />
                ))}
                {isSending && (
                  <div className="flex justify-start mb-2">
                    <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Error */}
              {(apiError || voiceError) && (
                <p className="text-sm text-red-600 mt-2" role="alert">
                  {apiError || voiceError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Input row — hidden during review */}
        {!isReviewing && (
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="mb-2 flex items-center justify-between gap-3">
              <VoiceStatusIndicator
                isRecording={isRecording}
                isProcessing={!isRecording && (isModelLoading || isTranscribing || isPolishingTranscript)}
              />
            </div>

            {/* Model loading progress */}
            {isModelLoading && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">
                  {isPolishingTranscript
                    ? 'Cleaning up transcript…'
                    : `Loading voice model… ${Math.round(modelProgress * 100)}%`}
                </p>
                <div className="h-1 w-full bg-gray-200 rounded">
                  <div
                    className="h-1 bg-teal-500 rounded transition-all duration-300"
                    style={{ width: `${isPolishingTranscript ? 100 : Math.round(modelProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <MicButton
                isRecording={isRecording}
                isLoading={isModelLoading}
                onClick={handleMicToggle}
              />
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isRecording ? 'Listening…' : 'Type or speak your response…'}
                disabled={isSending || isRecording}
                rows={1}
                className="flex-1 max-h-40 resize-none overflow-y-auto border border-gray-300 rounded-lg px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
                aria-label="Message input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
