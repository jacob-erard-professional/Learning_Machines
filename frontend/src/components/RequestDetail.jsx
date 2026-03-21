/**
 * @fileoverview Full request detail panel with tabbed interface.
 * Tabs: Overview (editable), AI Insights, Audit Log.
 * Includes action buttons (Approve, Reject, Hold) with confirmation modal.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPatch, apiPost } from '../lib/api.js';
import StatusBadge from './ui/StatusBadge.jsx';
import Button from './ui/Button.jsx';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import AiInsightsPanel from './AiInsightsPanel.jsx';
import useRequests from '../hooks/useRequests.js';
import useSpeechDictation from '../hooks/useSpeechDictation.js';

const TABS = ['Overview', 'AI Insights', 'Audit Log'];

const ROUTE_OPTIONS = [
  { value: 'staff_deployment', label: 'Staff Deployment' },
  { value: 'mail', label: 'Mail' },
  { value: 'pickup', label: 'Pickup' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
];

/**
 * Tabbed request detail panel.
 *
 * @param {object} props
 * @param {string} props.requestId - ID of the request to display
 * @param {() => void} props.onClose - Close handler
 * @param {(updated: object) => void} props.onUpdated - Called after successful save
 * @returns {JSX.Element}
 */
export default function RequestDetail({ requestId, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { action, reason }
  const [actionNote, setActionNote] = useState('');
  const addNotification = useRequests((s) => s.addNotification);
  const updateLocalRequest = useRequests((s) => s.updateLocalRequest);
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);
  const adminNotesDictation = useSpeechDictation({
    polishPath: '/api/voice-command/polish',
    onTranscript: (text) => setEditedFields((prev) => ({ ...prev, adminNotes: text })),
  });
  const actionNoteDictation = useSpeechDictation({
    polishPath: '/api/voice-command/polish',
    onTranscript: (text) => setActionNote(text),
  });

  // Fetch request details
  useEffect(() => {
    setLoading(true);
    setError(null);
    setEditedFields({});
    setActiveTab('Overview');

    apiGet(`/api/requests/${requestId}`)
      .then((data) => {
        setRequest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load request.');
        setLoading(false);
      });
  }, [requestId]);

  // Focus close button on open
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [requestId]);

  // Trap focus in modal
  useEffect(() => {
    if (!confirmModal) return;
    modalRef.current?.querySelector('button, input, textarea')?.focus();
  }, [confirmModal]);

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setEditedFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (Object.keys(editedFields).length === 0) return;
    setSaving(true);
    try {
      const updated = await apiPatch(`/api/requests/${requestId}`, editedFields);
      setRequest(updated);
      setEditedFields({});
      updateLocalRequest(requestId, updated);
      addNotification({ type: 'success', message: 'Request updated successfully.' });
      onUpdated?.(updated);
    } catch (err) {
      addNotification({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  }

  function initiateAction(action) {
    // If AI confidence is high and we're overriding, show confirmation
    const highConfidence = request?.aiConfidence === 'high';
    const isOverriding = action === 'approve' && request?.aiSuggestedRoute && request.fulfillmentRoute !== request.aiSuggestedRoute;

    if (highConfidence && isOverriding) {
      setConfirmModal({ action });
      setActionNote('');
    } else {
      setConfirmModal({ action });
      setActionNote('');
    }
  }

  async function executeAction() {
    const { action } = confirmModal;
    setActionLoading(action);
    setConfirmModal(null);

    try {
      let updated;
      if (action === 'approve') {
        const result = await apiPost(`/api/requests/${requestId}/approve`);
        // Handle ICS download if returned
        if (typeof result === 'string' && result.includes('BEGIN:VCALENDAR')) {
          const blob = new Blob([result], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${requestId}.ics`;
          a.click();
          URL.revokeObjectURL(url);
        }
        updated = typeof result === 'string' ? { status: 'approved' } : result;
      } else if (action === 'reject') {
        updated = await apiPost(`/api/requests/${requestId}/reject`, {
          reason: actionNote,
        });
      } else if (action === 'hold') {
        updated = await apiPost(`/api/requests/${requestId}/hold`, {
          note: actionNote,
        });
      } else {
        updated = {};
      }

      setRequest((prev) => ({ ...prev, ...updated }));
      updateLocalRequest(requestId, updated);
      addNotification({
        type: 'success',
        message: `Request ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'placed on hold'}.`,
      });
      onUpdated?.({ ...request, ...updated });
    } catch (err) {
      addNotification({ type: 'error', message: err.message || `Action failed.` });
    } finally {
      setActionLoading(null);
      setActionNote('');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white">
        <LoadingSpinner size="lg" label="Loading request details" center />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white p-6" role="alert">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-sm text-brand-purple-500 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded"
        >
          Close
        </button>
      </div>
    );
  }

  const merged = { ...request, ...editedFields };
  const hasChanges = Object.keys(editedFields).length > 0;

  return (
    <div className="flex flex-col h-full bg-white" aria-label={`Request detail: ${request.id}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-brand-purple-500">{request.id}</span>
            <StatusBadge status={merged.status} size="sm" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mt-1 truncate">{request.eventName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {request.eventCity} · {request.eventDate}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close request detail"
          className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        {(merged.status === 'pending' || merged.status === 'needs_review') && (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading === 'approve'}
              onClick={() => initiateAction('approve')}
              ariaLabel="Approve this request"
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={actionLoading === 'hold'}
              onClick={() => initiateAction('hold')}
              ariaLabel="Place request on hold for review"
            >
              <span className="text-brand-yellow-600">Hold</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={actionLoading === 'reject'}
              onClick={() => initiateAction('reject')}
              ariaLabel="Reject this request"
            >
              <span className="text-gray-600">Reject</span>
            </Button>
          </>
        )}
        {merged.status === 'approved' && (
          <Button
            variant="secondary"
            size="sm"
            loading={actionLoading === 'reject'}
            onClick={() => initiateAction('reject')}
            ariaLabel="Cancel this approved request"
          >
            <span className="text-gray-600">Cancel Approval</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-gray-100 shrink-0" role="tablist" aria-label="Request detail sections">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-purple-500',
                activeTab === tab
                  ? 'border-brand-purple-500 text-brand-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview tab */}
        <div
          id="tabpanel-Overview"
          role="tabpanel"
          aria-label="Overview"
          hidden={activeTab !== 'Overview'}
        >
          {activeTab === 'Overview' && (
            <div className="p-5 space-y-5">
              {/* Requestor section */}
              <Section title="Requestor">
                <EditableField label="Full Name" name="requestorName" value={merged.requestorName} onChange={handleFieldChange} />
                <EditableField label="Email" name="requestorEmail" type="email" value={merged.requestorEmail} onChange={handleFieldChange} />
                <EditableField label="Phone" name="requestorPhone" type="tel" value={merged.requestorPhone} onChange={handleFieldChange} />
                {request.alternateContactName && (
                  <EditableField label="Alt. Contact" name="alternateContactName" value={merged.alternateContactName} onChange={handleFieldChange} />
                )}
              </Section>

              {/* Event section */}
              <Section title="Event Details">
                <EditableField label="Event Name" name="eventName" value={merged.eventName} onChange={handleFieldChange} />
                <EditableField label="Date" name="eventDate" type="date" value={merged.eventDate} onChange={handleFieldChange} />
                <EditableField label="City" name="eventCity" value={merged.eventCity} onChange={handleFieldChange} />
                <EditableField label="ZIP" name="eventZip" value={merged.eventZip} onChange={handleFieldChange} />
                {request.estimatedAttendees && (
                  <EditableField label="Attendees" name="estimatedAttendees" type="number" value={String(merged.estimatedAttendees || '')} onChange={handleFieldChange} />
                )}
              </Section>

              {/* Routing section */}
              <Section title="Routing & Classification">
                {/* Request types — read-only display of what the requestor selected */}
                {(() => {
                  const types = request.requestTypes ?? (request.requestType ? [request.requestType] : []);
                  if (types.length === 0) return null;
                  const TYPE_LABELS = {
                    staff_support: 'Staff Support',
                    mailed_materials: 'Mailed Materials',
                    pickup: 'Pickup',
                  };
                  const TYPE_COLORS = {
                    staff_support: 'bg-brand-periwinkle-100 text-brand-navy-500 border border-brand-periwinkle-200',
                    mailed_materials: 'bg-teal-50 text-teal-700 border border-teal-200',
                    pickup: 'bg-brand-yellow-100 text-brand-yellow-700 border border-brand-yellow-300',
                  };
                  return (
                    <div>
                      <p className="block text-xs font-medium text-gray-500 mb-1.5">Requested Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map((t) => (
                          <span key={t} className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[t] ?? 'bg-gray-100 text-gray-700'}`}>
                            {TYPE_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                      {types.length > 1 && (
                        <p className="mt-1.5 text-xs text-brand-yellow-700 bg-brand-yellow-100 border border-brand-yellow-300 rounded-md px-2.5 py-1.5">
                          Multi-fulfillment request — primary route below, all types must be actioned.
                        </p>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <label htmlFor="detail-route" className="block text-xs font-medium text-gray-500 mb-1">Fulfillment Route</label>
                  <select
                    id="detail-route"
                    name="fulfillmentRoute"
                    value={merged.fulfillmentRoute}
                    onChange={handleFieldChange}
                    className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
                    aria-label="Fulfillment route override"
                  >
                    {ROUTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="detail-status" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    id="detail-status"
                    name="status"
                    value={merged.status}
                    onChange={handleFieldChange}
                    className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
                    aria-label="Status override"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </Section>

              {/* Admin notes */}
              <Section title="Admin Notes">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor="detail-admin-notes" className="block text-xs font-medium text-gray-500">Internal Notes</label>
                    <VoiceDictationButton
                      isRecording={adminNotesDictation.isRecording}
                      isPolishing={adminNotesDictation.isPolishing}
                      onClick={() =>
                        adminNotesDictation.isRecording
                          ? adminNotesDictation.stopDictation()
                          : adminNotesDictation.startDictation(merged.adminNotes || '')
                      }
                      label="Admin notes"
                    />
                  </div>
                  <textarea
                    id="detail-admin-notes"
                    name="adminNotes"
                    rows={3}
                    value={merged.adminNotes || ''}
                    onChange={handleFieldChange}
                    className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white resize-y transition-colors"
                    placeholder="Add internal notes..."
                  />
                  {adminNotesDictation.error && (
                    <p className="mt-1 text-xs text-red-600">{adminNotesDictation.error}</p>
                  )}
                </div>
              </Section>

              {/* Save button */}
              {hasChanges && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    onClick={handleSave}
                    ariaLabel="Save changes to this request"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Insights tab */}
        <div
          id="tabpanel-AI Insights"
          role="tabpanel"
          aria-label="AI Insights"
          hidden={activeTab !== 'AI Insights'}
        >
          {activeTab === 'AI Insights' && <AiInsightsPanel request={request} />}
        </div>

        {/* Audit Log tab */}
        <div
          id="tabpanel-Audit Log"
          role="tabpanel"
          aria-label="Audit Log"
          hidden={activeTab !== 'Audit Log'}
        >
          {activeTab === 'Audit Log' && (
            <div className="p-5">
              {request.auditLog?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No changes recorded yet.</p>
                </div>
              ) : (
                <ol className="relative border-l-2 border-gray-100 space-y-6 ml-3">
                  {[...request.auditLog].reverse().map((entry, i) => (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-1.5 w-3 h-3 bg-brand-purple-500 rounded-full border-2 border-white" aria-hidden="true" />
                      <time className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </time>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        <span className="font-mono text-brand-purple-600">{entry.field}</span>:{' '}
                        <span className="line-through text-gray-400">{String(entry.oldValue)}</span>
                        {' → '}
                        <span className="text-gray-900">{String(entry.newValue)}</span>
                      </p>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">"{entry.note}"</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm ${confirmModal.action}`}
          onClick={(e) => e.target === e.currentTarget && setConfirmModal(null)}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-gray-900 capitalize">
              Confirm: {confirmModal.action === 'hold' ? 'Place on Hold' : confirmModal.action}
            </h3>

            {request.aiConfidence === 'high' && (
              <div className="bg-brand-yellow-100 border border-brand-yellow-300 rounded-lg px-3 py-2 text-sm text-brand-yellow-700" role="alert">
                AI classified this with <strong>high confidence</strong>. Are you sure you want to override?
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="action-note" className="block text-sm font-medium text-gray-700">
                  Reason / Note {confirmModal.action !== 'approve' && <span className="text-red-500" aria-hidden="true">*</span>}
                </label>
                <VoiceDictationButton
                  isRecording={actionNoteDictation.isRecording}
                  isPolishing={actionNoteDictation.isPolishing}
                  onClick={() =>
                    actionNoteDictation.isRecording
                      ? actionNoteDictation.stopDictation()
                      : actionNoteDictation.startDictation(actionNote)
                  }
                  label="Decision note"
                />
              </div>
              <textarea
                id="action-note"
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 resize-none"
                placeholder="Add a note explaining this decision..."
                aria-required={confirmModal.action !== 'approve'}
              />
              {actionNoteDictation.error && (
                <p className="mt-1 text-xs text-red-600">{actionNoteDictation.error}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmModal(null)}
                ariaLabel="Cancel action"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmModal.action === 'approve' ? 'primary' : confirmModal.action === 'reject' ? 'secondary' : 'primary'}
                size="sm"
                onClick={executeAction}
                ariaLabel={`Confirm ${confirmModal.action}`}
              >
                Confirm {confirmModal.action === 'hold' ? 'Hold' : confirmModal.action === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceDictationButton({ isRecording, isPolishing, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        isRecording
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-brand-periwinkle-200 bg-brand-periwinkle-50 text-brand-purple-600 hover:bg-brand-periwinkle-100',
      ].join(' ')}
      aria-label={isRecording ? `Stop dictating ${label}` : `Start dictating ${label}`}
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span
          className={[
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            isRecording || isPolishing ? 'animate-ping bg-current' : '',
          ].join(' ')}
        />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      {isRecording ? 'Listening' : isPolishing ? 'Cleaning…' : 'Dictate'}
    </button>
  );
}

/** Section wrapper with labeled heading */
function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

/** Editable labeled field */
function EditableField({ label, name, value, onChange, type = 'text' }) {
  return (
    <div>
      <label htmlFor={`detail-${name}`} className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        id={`detail-${name}`}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
      />
    </div>
  );
}
