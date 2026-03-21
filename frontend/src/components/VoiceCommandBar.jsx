/**
 * @file VoiceCommandBar.jsx
 * Admin-side voice command bar.
 *
 * Admins can say "Show high priority events this week" and the queue filters
 * update automatically.  Typing is supported as a fallback.
 *
 * Props:
 *  onCommand(action) — called with { action, params, message } from interpretCommand
 */

import { useState } from 'react';
import useVoiceCommand from '../hooks/useVoiceCommand.js';

export default function VoiceCommandBar({ onCommand }) {
  const [typedCommand, setTypedCommand] = useState('');

  const {
    isListening,
    isProcessing,
    transcript,
    result,
    error,
    startListening,
    stopListening,
  } = useVoiceCommand(onCommand);

  function handleTypedSubmit(e) {
    e.preventDefault();
    const trimmed = typedCommand.trim();
    if (!trimmed || isProcessing) return;
    setTypedCommand('');
    // Re-use the same backend route by triggering onCommand after POST
    import('../lib/api.js').then(({ apiPost }) => {
      apiPost('/api/voice-command/interpret', { command: trimmed })
        .then((action) => onCommand?.(action))
        .catch(() => {});
    });
  }

  const displayText = isListening ? (transcript || 'Listening…') : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Mic button */}
        <button
          type="button"
          aria-label={isListening ? 'Stop listening' : 'Start voice command'}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={[
            'flex items-center justify-center w-9 h-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 shrink-0',
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 animate-pulse'
              : 'bg-ihc-teal-100 hover:bg-ihc-teal-200 text-ihc-teal-700 focus:ring-ihc-teal-400',
            isProcessing && 'opacity-50 cursor-not-allowed',
          ].join(' ')}
        >
          {isListening ? (
            /* Stop square */
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <rect x="2" y="2" width="10" height="10" rx="1.5" />
            </svg>
          ) : (
            /* Mic */
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 8 1z" />
              <path d="M4 8.5A4 4 0 0 0 12 8.5v-1h-1v1a3 3 0 0 1-6 0v-1H4v1z" />
              <path d="M7.5 13.5v1.5h1v-1.5A5.5 5.5 0 0 0 13.5 8h-1A4.5 4.5 0 0 1 7.5 12.5v1z" />
            </svg>
          )}
        </button>

        {/* Typed input */}
        <form onSubmit={handleTypedSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder='Try "Show high priority events this week"'
            disabled={isListening || isProcessing}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ihc-teal-400 disabled:opacity-50 bg-white"
            aria-label="Type a voice command"
          />
          <button
            type="submit"
            disabled={!typedCommand.trim() || isProcessing}
            className="px-3 py-1.5 text-sm bg-ihc-teal-600 text-white rounded-lg hover:bg-ihc-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ihc-teal-400"
          >
            Send
          </button>
        </form>
      </div>

      {/* Status / feedback */}
      {displayText && (
        <p className="text-xs text-gray-500 pl-11 italic">{displayText}</p>
      )}
      {isProcessing && (
        <p className="text-xs text-ihc-teal-600 pl-11">Processing command…</p>
      )}
      {result?.message && !isProcessing && (
        <p className="text-xs text-ihc-teal-700 pl-11">{result.message}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 pl-11" role="alert">{error}</p>
      )}
    </div>
  );
}
