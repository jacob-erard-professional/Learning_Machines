/**
 * @fileoverview Landing page for the Community Health Request System.
 * Shows two entry paths: structured form and conversational chat.
 * Renders RequestForm when user selects the form path.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import RequestForm from '../components/RequestForm.jsx';
import Card from '../components/ui/Card.jsx';

/**
 * Submit page with hero, entry-path cards, and inline form.
 *
 * @returns {JSX.Element}
 */
export default function SubmitPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!showForm ? (
        <>
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-ihc-blue-50 border border-ihc-blue-200 rounded-full px-4 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-ihc-teal-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs font-medium text-ihc-blue-700">Intermountain Community Health Program</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Request Community Health Support
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              Bring Intermountain Healthcare's community health resources to your event.
              Submit a request and our AI will help route it to the right team.
            </p>
          </div>

          {/* Entry cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            {/* Form card */}
            <Card hover className="p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-ihc-blue-50 border border-ihc-blue-100 flex items-center justify-center mb-4" aria-hidden="true">
                <svg className="w-6 h-6 text-ihc-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit Request Form</h2>
              <p className="text-sm text-gray-500 flex-1 mb-5 leading-relaxed">
                Fill out a structured form with all the details about your event and what support you need.
                Best for those who know exactly what they're requesting.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {['Step-by-step', 'AI routing', 'Instant confirmation'].map((tag) => (
                  <span key={tag} className="text-xs bg-ihc-blue-50 text-ihc-blue-700 px-2.5 py-1 rounded-full border border-ihc-blue-100">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full bg-ihc-blue-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ihc-blue-600 active:bg-ihc-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500"
              >
                Start Form
              </button>
            </Card>

            {/* Chat card */}
            <Card hover className="p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-ihc-teal-50 border border-ihc-teal-100 flex items-center justify-center mb-4" aria-hidden="true">
                <svg className="w-6 h-6 text-ihc-teal-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Chat with AI Assistant</h2>
              <p className="text-sm text-gray-500 flex-1 mb-5 leading-relaxed">
                Have a conversation with our AI to describe your event naturally. The AI will
                extract the details and help you submit a request conversationally.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {['Conversational', 'Natural language', 'AI-powered'].map((tag) => (
                  <span key={tag} className="text-xs bg-ihc-teal-50 text-ihc-teal-700 px-2.5 py-1 rounded-full border border-ihc-teal-100">
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                to="/chat"
                className="block w-full text-center bg-ihc-teal-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ihc-teal-600 active:bg-ihc-teal-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-teal-500"
              >
                Open Chat
              </Link>
            </Card>
          </div>

          {/* Info strip */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {[
                { icon: '🏥', label: 'Serving 7 States', sub: 'UT, ID, NV, WY, MT, CO, KS' },
                { icon: '🤖', label: 'AI-Powered Routing', sub: 'Claude NLP classifies requests' },
                { icon: '⚡', label: 'Fast Response', sub: 'Admin review within 24 hours' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div>
          {/* Back link */}
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex items-center gap-1.5 text-sm text-ihc-blue-600 hover:text-ihc-blue-800 mb-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ihc-blue-500 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Submit a Community Health Request</h1>
            <p className="text-gray-500 text-sm mt-1">
              Fields marked with <span className="text-red-500" aria-hidden="true">*</span> are required.
            </p>
          </div>

          <RequestForm />
        </div>
      )}
    </div>
  );
}
