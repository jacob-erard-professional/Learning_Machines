/**
 * @fileoverview Post-submission ConfirmationCard.
 * Displays request ID, AI routing decision, impact score, tags, and reasoning.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './ui/Card.jsx';
import StatusBadge from './ui/StatusBadge.jsx';

/** Route display metadata */
const ROUTE_META = {
  staff_deployment: {
    label: 'Staff Deployment',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'text-brand-purple-600 bg-brand-periwinkle-50 border-brand-periwinkle-200',
  },
  mail: {
    label: 'Mailed Materials',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-brand-purple-600 bg-brand-periwinkle-100 border-brand-periwinkle-200',
  },
  pickup: {
    label: 'Self-Pickup',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: 'text-brand-yellow-700 bg-brand-yellow-50 border-brand-yellow-300',
  },
};

/** Confidence display mapping */
const CONFIDENCE_MAP = {
  high: { label: 'High', pct: 92, color: 'text-brand-purple-500' },
  medium: { label: 'Medium', pct: 65, color: 'text-brand-yellow-600' },
  low: { label: 'Low', pct: 35, color: 'text-red-500' },
};

/** Chip color classes for AI tags */
const TAG_COLORS = [
  'bg-brand-periwinkle-50 text-brand-navy-500',
  'bg-brand-periwinkle-100 text-brand-purple-600',
  'bg-brand-yellow-100 text-brand-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
];

/**
 * Post-submission confirmation card with AI decision summary.
 *
 * @param {object} props
 * @param {object} props.result - API response from POST /api/requests
 * @param {() => void} props.onSubmitAnother - Callback to reset form
 * @returns {JSX.Element}
 */
export default function ConfirmationCard({ result, onSubmitAnother }) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const route = ROUTE_META[result.fulfillmentRoute] ?? ROUTE_META.mail;
  const confidence = result.aiConfidence ? CONFIDENCE_MAP[result.aiConfidence] : null;
  const aiFailed = result.aiStatus === 'failed';
  const flaggedForReview = result.status === 'needs_review' && !aiFailed;

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      {/* Success header */}
      <div className="bg-brand-purple-500 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Request Submitted!</h2>
            <p className="text-brand-periwinkle-100 text-sm mt-0.5">
              Your community health request has been received.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Request ID */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</p>
            <p className="text-2xl font-bold text-brand-purple-500 font-mono mt-0.5">{result.id}</p>
          </div>
          <StatusBadge status={result.status} size="md" />
        </div>

        {/* AI failed — truly unavailable */}
        {aiFailed && (
          <div className="bg-brand-yellow-100 border border-brand-yellow-300 rounded-lg px-4 py-3 flex items-start gap-2" role="alert">
            <svg className="w-5 h-5 text-brand-yellow-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-brand-yellow-700">
              AI classification is unavailable. Your request has been flagged for <strong>admin review</strong> and will be processed manually.
            </p>
          </div>
        )}

        {/* AI ran but flagged a discrepancy */}
        {flaggedForReview && (
          <div className="bg-brand-yellow-100 border border-brand-yellow-300 rounded-lg px-4 py-3 flex items-start gap-2" role="alert">
            <svg className="w-5 h-5 text-brand-yellow-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-brand-yellow-700">
              AI detected a potential discrepancy in your request details. An admin will review and confirm the routing before processing.
            </p>
          </div>
        )}

        {/* Fulfillment route badge */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Fulfillment Route</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm ${route.color}`}>
            {route.icon}
            {route.label}
          </div>
          {result.routingReason && (
            <p className="text-sm text-gray-500 mt-1.5 italic">{result.routingReason}</p>
          )}
        </div>

        {/* AI metrics row */}
        {!aiFailed && (confidence || result.aiTags?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Confidence bar */}
            {confidence && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={confidence.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`AI confidence: ${confidence.pct}%`}>
                    <div
                      className="h-2 rounded-full bg-brand-purple-500 transition-all duration-500"
                      style={{ width: `${confidence.pct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${confidence.color}`}>{confidence.label}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Tags */}
        {result.aiTags?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI-Generated Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {result.aiTags.map((tag, i) => (
                <span
                  key={tag}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {result.aiSummary && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI Summary</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 italic">
              "{result.aiSummary}"
            </p>
          </div>
        )}

        {/* Why this decision expandable */}
        {result.routingReason && (
          <div>
            <button
              type="button"
              onClick={() => setReasoningOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-medium text-brand-purple-500 hover:text-brand-purple-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded"
              aria-expanded={reasoningOpen}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${reasoningOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Why this decision?
            </button>
            {reasoningOpen && (
              <blockquote className="mt-2 pl-4 border-l-4 border-brand-purple-400 text-sm text-gray-600 italic">
                {result.routingReason}
              </blockquote>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onSubmitAnother}
            className="text-sm font-medium text-brand-purple-500 hover:text-brand-purple-700 underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded"
          >
            Submit another request
          </button>
        </div>
      </div>
    </Card>
  );
}
