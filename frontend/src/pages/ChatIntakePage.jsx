/**
 * @fileoverview Conversational AI chat intake page.
 * Extracts form fields from natural language, shows field summaries,
 * and navigates to the form with prefill data when ready.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api.js';

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    content: "Hi! I can help you submit a Community Health support request. Tell me about your event — what's it called, when is it, and what kind of support do you need?",
    extractedFields: null,
    ready: false,
  },
];

/**
 * Chat intake page with bubble UI and field extraction display.
 *
 * @returns {JSX.Element}
 */
export default function ChatIntakePage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefillData, setPrefillData] = useState({});
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiPost('/api/chat', {
        message: text,
        context: prefillData,
      });

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.reply || response.message || "Got it! Let me process that.",
        extractedFields: response.extractedFields || null,
        ready: response.ready || false,
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (response.extractedFields) {
        setPrefillData((prev) => ({ ...prev, ...response.extractedFields }));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "I'm having trouble right now. Please try again in a moment, or use the structured form to submit your request.",
          extractedFields: null,
          ready: false,
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

  function handleReviewSubmit() {
    navigate('/', { state: { prefillData } });
  }

  const lastMessage = messages[messages.length - 1];
  const isReady = lastMessage?.ready;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-64px-60px)] flex flex-col px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-ihc-teal-500 flex items-center justify-center" aria-hidden="true">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Chat Intake</h1>
            <p className="text-xs text-gray-500">AI Assistant · Community Health Requests</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-ihc-teal-600 bg-ihc-teal-50 px-2.5 py-1 rounded-full border border-ihc-teal-100">
            <span className="w-1.5 h-1.5 bg-ihc-teal-500 rounded-full animate-pulse" aria-hidden="true" />
            Online
          </div>
        </div>
        <div className="h-px bg-gray-100" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2" aria-live="polite" aria-label="Chat conversation">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {/* AI avatar */}
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full bg-ihc-teal-500 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
            )}

            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Bubble */}
              <div
                className={[
                  'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-ihc-blue-500 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-card',
                ].join(' ')}
              >
                {msg.content}
              </div>

              {/* Extracted fields summary */}
              {msg.extractedFields && Object.keys(msg.extractedFields).length > 0 && (
                <div className="bg-ihc-teal-50 border border-ihc-teal-200 rounded-xl px-3 py-2.5 text-xs text-ihc-teal-800 w-full">
                  <p className="font-semibold mb-1.5 text-ihc-teal-700">Got it! Here's what I found:</p>
                  <ul className="space-y-0.5">
                    {Object.entries(msg.extractedFields).map(([key, value]) => (
                      <li key={key} className="flex gap-1.5">
                        <span className="font-medium text-ihc-teal-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span>{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review & Submit CTA */}
              {msg.ready && (
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  className="bg-ihc-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-ihc-blue-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500"
                >
                  Review & Submit Request
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2 justify-start" aria-label="AI is typing" aria-live="polite">
            <div className="w-7 h-7 rounded-full bg-ihc-teal-500 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-card flex items-center gap-1" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-gray-100">
        {isReady && (
          <div className="mb-2 p-2.5 bg-ihc-teal-50 border border-ihc-teal-200 rounded-lg flex items-center justify-between">
            <p className="text-xs text-ihc-teal-700 font-medium">Ready to submit! Review your request details.</p>
            <button
              type="button"
              onClick={handleReviewSubmit}
              className="text-xs font-semibold text-ihc-blue-600 hover:text-ihc-blue-800 underline ml-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500 rounded"
            >
              Go to form
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">Type your message</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your event..."
            disabled={loading}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ihc-blue-500 focus:border-ihc-blue-500 max-h-24 overflow-y-auto bg-gray-50 focus:bg-white transition-colors disabled:opacity-50"
            style={{ minHeight: '42px' }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="shrink-0 w-10 h-10 rounded-xl bg-ihc-blue-500 text-white flex items-center justify-center hover:bg-ihc-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
