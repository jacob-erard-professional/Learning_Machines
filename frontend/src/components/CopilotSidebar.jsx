/**
 * @fileoverview AI Copilot slide-in assistant panel.
 * Pre-loaded chips, chat interface, typing indicator, and admin memory summary.
 */

import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../lib/api.js';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import useSpeechDictation from '../hooks/useSpeechDictation.js';

const SUGGESTION_CHIPS = [
  'What should I prioritize?',
  'Summarize this week',
  'Where is demand highest?',
  'Show underserved regions',
];

const ADMIN_MEMORY = "Based on your history: You often prioritize rural Utah events and staff deployment requests.";

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    content: "Hi! I'm your AI Copilot. Ask me anything about the request queue or community health trends.",
  },
];

/**
 * AI Copilot slide-in sidebar panel.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the sidebar is visible
 * @param {() => void} props.onClose - Close handler
 * @returns {JSX.Element}
 */
export default function CopilotSidebar({ open, onClose }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const copilotDictation = useSpeechDictation({
    polishPath: '/api/voice-command/polish',
    onTranscript: (text) => setInput(text),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage(text) {
    const messageText = text || input.trim();
    if (!messageText) return;

    setInput('');
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: messageText }]);
    setLoading(true);

    try {
      const response = await apiPost('/api/copilot/query', { question: messageText });
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: response.answer || 'I received your message.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-40 flex flex-col"
        role="complementary"
        aria-label="AI Copilot assistant"
      >
        {/* Header */}
        <div className="bg-brand-navy-500 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-sm">AI Copilot</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Copilot"
            className="text-brand-navy-200 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Admin memory */}
        <div className="px-4 py-2 bg-brand-periwinkle-50 border-b border-brand-periwinkle-100 shrink-0">
          <p className="text-xs text-brand-navy-500 italic">{ADMIN_MEMORY}</p>
        </div>

        {/* Suggestion chips */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 shrink-0 border-b border-gray-100">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendMessage(chip)}
              className="text-xs px-2.5 py-1 rounded-full bg-brand-periwinkle-50 text-brand-navy-500 border border-brand-periwinkle-200 hover:bg-brand-periwinkle-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite" aria-label="Conversation">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-full bg-brand-purple-500 flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  aria-hidden="true"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div
                className={[
                  'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand-navy-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none',
                ].join(' ')}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start items-center gap-2" aria-live="polite" aria-label="AI is typing">
              <div className="w-6 h-6 rounded-full bg-brand-purple-500 flex items-center justify-center shrink-0" aria-hidden="true">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
              <div className="bg-gray-100 rounded-xl rounded-bl-none px-4 py-2.5 flex items-center gap-1.5" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() =>
                copilotDictation.isRecording
                  ? copilotDictation.stopDictation()
                  : copilotDictation.startDictation(input)
              }
              disabled={loading}
              aria-label={copilotDictation.isRecording ? 'Stop dictating message' : 'Start dictating message'}
              className={[
                'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500',
                copilotDictation.isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-brand-periwinkle-50 text-brand-purple-600 hover:bg-brand-periwinkle-100',
                loading && 'opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
                {(copilotDictation.isRecording || copilotDictation.isPolishing) && (
                  <span className="absolute inline-flex h-4 w-4 rounded-full bg-current opacity-30 animate-ping" />
                )}
                {copilotDictation.isRecording ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="2" y="2" width="10" height="10" rx="1.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 8 1z" />
                    <path d="M4 8.5A4 4 0 0 0 12 8.5v-1h-1v1a3 3 0 0 1-6 0v-1H4v1z" />
                    <path d="M7.5 13.5v1.5h1v-1.5A5.5 5.5 0 0 0 13.5 8h-1A4.5 4.5 0 0 1 7.5 12.5v1z" />
                  </svg>
                )}
              </span>
            </button>
            <label htmlFor="copilot-input" className="sr-only">Message AI Copilot</label>
            <textarea
              id="copilot-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI anything..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 max-h-24 overflow-y-auto"
              style={{ minHeight: '38px' }}
              disabled={loading}
              aria-label="Message to AI Copilot"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="shrink-0 w-9 h-9 rounded-lg bg-brand-purple-500 text-white flex items-center justify-center hover:bg-brand-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">Press Enter to send</p>
            {(copilotDictation.isRecording || copilotDictation.isPolishing) && (
              <p className="text-xs text-brand-purple-500" aria-live="polite">
                {copilotDictation.isRecording ? 'Listening…' : 'Cleaning transcript…'}
              </p>
            )}
          </div>
          {copilotDictation.error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {copilotDictation.error}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
