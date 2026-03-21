/**
 * @fileoverview AI Insights panel for the request detail view.
 * Displays confidence gauge, impact score, tags, reasoning, and flags.
 */

import { useState } from 'react';

const TAG_COLORS = {
  program: 'bg-ihc-teal-100 text-ihc-teal-700',
  audience: 'bg-ihc-blue-100 text-ihc-blue-700',
  urgency: 'bg-ihc-amber-100 text-ihc-amber-700',
  default: 'bg-gray-100 text-gray-700',
};

function getTagColor(index) {
  const keys = ['program', 'audience', 'urgency', 'default'];
  return TAG_COLORS[keys[index % keys.length]];
}

/**
 * Circular SVG gauge component.
 *
 * @param {object} props
 * @param {number} props.value - 0-100
 * @param {string} props.label - Accessible label
 * @param {string} props.colorClass - Tailwind text color for value
 */
function CircularGauge({ value, label, colorClass }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`${label}: ${value}%`}>
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-700 ${colorClass}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}

function confidenceToPercent(confidence) {
  if (confidence === 'high') return 92;
  if (confidence === 'medium') return 65;
  if (confidence === 'low') return 35;
  return 0;
}

function confidenceColor(confidence) {
  if (confidence === 'high') return 'text-ihc-teal-500';
  if (confidence === 'medium') return 'text-ihc-amber-500';
  return 'text-red-500';
}

/**
 * AI insights panel shown in the RequestDetail AI Insights tab.
 *
 * @param {object} props
 * @param {object} props.request - Full request object
 * @returns {JSX.Element}
 */
export default function AiInsightsPanel({ request }) {
  const [reasoningOpen, setReasoningOpen] = useState(true);

  const confidencePct = confidenceToPercent(request.aiConfidence);
  const colorClass = confidenceColor(request.aiConfidence);

  if (request.aiStatus === 'failed') {
    return (
      <div className="p-4">
        <div className="bg-ihc-amber-100 border border-ihc-amber-300 rounded-lg px-4 py-3 flex items-start gap-2" role="alert">
          <svg className="w-5 h-5 text-ihc-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-ihc-amber-800">AI classification unavailable</p>
            <p className="text-sm text-ihc-amber-700 mt-0.5">
              The AI service was unavailable when this request was submitted. Manual review is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Gauges row */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Metrics</h3>
        <div className="flex gap-6 flex-wrap">
          <CircularGauge
            value={confidencePct}
            label="Confidence"
            colorClass={colorClass}
          />
        </div>
      </div>

      {/* Tags */}
      {request.aiTags?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {request.aiTags.map((tag, i) => (
              <span key={tag} className={`text-xs px-2.5 py-1 rounded-full font-medium ${getTagColor(i)}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Routing reason / reasoning */}
      {request.routingReason && (
        <div>
          <button
            type="button"
            onClick={() => setReasoningOpen((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-ihc-blue-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500 rounded"
            aria-expanded={reasoningOpen}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${reasoningOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Routing Reasoning
          </button>
          {reasoningOpen && (
            <blockquote className="border-l-4 border-ihc-teal-500 pl-4 text-sm text-gray-600 italic bg-ihc-teal-50 py-2 pr-3 rounded-r-lg">
              {request.routingReason}
            </blockquote>
          )}
        </div>
      )}

      {/* AI Summary */}
      {request.aiSummary && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Summary</h3>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 italic">
            "{request.aiSummary}"
          </p>
        </div>
      )}

      {/* Service area flag */}
      {!request.isInServiceArea && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-start gap-2" role="alert">
          <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-orange-800">Outside Service Area</p>
            <p className="text-sm text-orange-700 mt-0.5">
              ZIP code {request.eventZip} is outside Intermountain Healthcare's primary service area.
            </p>
          </div>
        </div>
      )}

      {/* Planning recommendations placeholder */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Planning Recommendations</h3>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-ihc-teal-500 mt-0.5" aria-hidden="true">•</span>
            Confirm materials availability 2 weeks before event date.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ihc-teal-500 mt-0.5" aria-hidden="true">•</span>
            {request.estimatedAttendees > 100
              ? 'High attendance — consider requesting additional staff support.'
              : 'Standard staffing levels should be sufficient.'}
          </li>
          {request.requestType === 'staff_support' && (
            <li className="flex items-start gap-2">
              <span className="text-ihc-teal-500 mt-0.5" aria-hidden="true">•</span>
              Generate calendar invite after approval to block staff schedules.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
