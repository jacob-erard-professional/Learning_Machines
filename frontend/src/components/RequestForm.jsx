/**
 * @fileoverview Multi-section Community Health request submission form.
 * Validates on blur, calls POST /api/requests, shows AI result on success.
 * Handles duplicate detection, network errors, and AI unavailability.
 */

import { useState, useRef } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import ConfirmationCard from './ConfirmationCard.jsx';
import VoiceIntakeModal from './VoiceIntakeModal.jsx';
import { apiPost } from '../lib/api.js';

const TODAY = new Date().toISOString().split('T')[0];

const INITIAL_FORM = {
  requestorName: '',
  requestorEmail: '',
  requestorPhone: '',
  alternateContactName: '',
  alternateContactEmail: '',
  eventName: '',
  eventDate: '',
  eventAddress: '',
  eventCity: '',
  eventZip: '',
  estimatedAttendees: '',
  eventDescription: '',
  requestTypes: [],
  assetCategory: '',
  materialPreferences: '',
  specialInstructions: '',
};

const ASSET_CATEGORIES = [
  { value: '', label: 'Select a category...' },
  { value: 'materials', label: 'Materials' },
  { value: 'toolkits', label: 'Toolkits' },
  { value: 'behavioral_reinforcements', label: 'Behavioral Reinforcements' },
  { value: 'programs', label: 'Programs' },
];

const REQUEST_TYPES = [
  {
    value: 'staff_support',
    label: 'Staff Support',
    description: 'Request IHC community health staff to attend and support your event in person.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    value: 'mailed_materials',
    label: 'Mailed Materials',
    description: 'Receive health education materials, brochures, and toolkits shipped directly to your venue.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'pickup',
    label: 'Pickup',
    description: 'Pick up materials from your nearest IHC Community Health office at a scheduled time.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

// RFC 5322 simplified — covers the vast majority of real addresses
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// US/Canada phone: optional +1 prefix, then 10 digits with common separators
// Accepts: 8015550100, 801-555-0100, (801) 555-0100, +18015550100, +1 801.555.0100
const PHONE_REGEX = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

// ZIP: 5-digit (84101) or ZIP+4 (84101-1234)
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/** Format raw digits into (XXX) XXX-XXXX as the user types. */
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
}

function normalizeVoiceFields(extractedFields) {
  const normalized = { ...extractedFields };

  if (normalized.requestorPhone) {
    normalized.requestorPhone = formatPhone(String(normalized.requestorPhone));
  }

  if (normalized.requestorEmail) {
    normalized.requestorEmail = String(normalized.requestorEmail).trim().toLowerCase();
  }

  if (normalized.eventZip) {
    const digits = String(normalized.eventZip).replace(/[^\d-]/g, '');
    normalized.eventZip = /^\d{9}$/.test(digits)
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  }

  // Voice extracts a single requestType string — convert to requestTypes array
  if (normalized.requestType) {
    const requestTypeMap = {
      'staff support': 'staff_support',
      staff_support: 'staff_support',
      'mailed materials': 'mailed_materials',
      mailed_materials: 'mailed_materials',
      mail: 'mailed_materials',
      pickup: 'pickup',
      'pick up': 'pickup',
    };
    const key = String(normalized.requestType).trim().toLowerCase();
    const mapped = requestTypeMap[key] ?? normalized.requestType;
    normalized.requestTypes = [mapped];
    delete normalized.requestType;
  }

  return normalized;
}

function inferLocationFromAddress(address) {
  const value = String(address || '').trim();
  if (!value) return {};

  const zipMatch = value.match(/(\d{5}(?:-\d{4})?)\s*$/);
  const zip = zipMatch?.[1] ?? null;

  let city = null;

  const commaPattern = value.match(/,\s*([^,]+?)\s*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/i);
  if (commaPattern?.[1]) {
    city = commaPattern[1].trim();
  } else {
    const plainPattern = value.match(/\b([A-Za-z]+(?:[\s-][A-Za-z]+)*)\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/i);
    if (plainPattern?.[1]) {
      city = plainPattern[1].trim();
    }
  }

  return {
    eventCity: city || undefined,
    eventZip: zip || undefined,
  };
}

/** Validate a single field and return an error string or null. */
function validateField(name, value) {
  switch (name) {
    case 'requestorName':
      return value.trim() ? null : 'Full name is required.';
    case 'requestorEmail':
      if (!value.trim()) return 'Email address is required.';
      if (!EMAIL_REGEX.test(value.trim())) return 'Must be a valid email address (e.g. jane@example.org).';
      return null;
    case 'alternateContactEmail':
      // Optional — only validate format if something was entered
      if (value.trim() && !EMAIL_REGEX.test(value.trim())) return 'Must be a valid email address.';
      return null;
    case 'requestorPhone':
      if (!value.trim()) return 'Phone number is required.';
      if (!PHONE_REGEX.test(value.trim())) return 'Must be a valid US phone number (e.g. (801) 555-0100).';
      return null;
    case 'eventName':
      return value.trim() ? null : 'Event name is required.';
    case 'eventDate':
      if (!value) return 'Event date is required.';
      if (value < TODAY) return 'Event date must be today or in the future.';
      return null;
    case 'eventCity':
      return value.trim() ? null : 'City is required.';
    case 'eventZip':
      if (!value.trim()) return 'ZIP code is required.';
      if (!ZIP_REGEX.test(value.trim())) return 'Must be a 5-digit ZIP (84101) or ZIP+4 (84101-1234).';
      return null;
    case 'requestTypes':
      return Array.isArray(value) && value.length > 0 ? null : 'Please select at least one request type.';
    default:
      return null;
  }
}

const REQUIRED_FIELDS = ['requestorName', 'requestorEmail', 'requestorPhone', 'eventName', 'eventDate', 'eventCity', 'eventZip', 'requestTypes'];

/**
 * Multi-section Community Health request form.
 * Self-contained — uses internal state, submits via apiPost.
 *
 * @returns {JSX.Element}
 */
export default function RequestForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [assetOpen, setAssetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const firstErrorRef = useRef(null);

  /** Called when the voice modal completes — merge extracted fields into form. */
  function handleVoiceComplete(extractedFields) {
    const normalizedFields = normalizeVoiceFields(extractedFields);
    setForm((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(normalizedFields).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
    }));
  }

  function handleChange(e) {
    const { name } = e.target;
    const value = name === 'requestorPhone' ? formatPhone(e.target.value) : e.target.value;
    setForm((prev) => {
      if (name !== 'eventAddress') {
        return { ...prev, [name]: value };
      }

      const inferred = inferLocationFromAddress(value);
      return {
        ...prev,
        [name]: value,
        ...(inferred.eventCity ? { eventCity: inferred.eventCity } : {}),
        ...(inferred.eventZip ? { eventZip: inferred.eventZip } : {}),
      };
    });
    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  }

  function toggleRequestType(value) {
    setForm((prev) => {
      const current = prev.requestTypes;
      const next = current.includes(value)
        ? current.filter((t) => t !== value)
        : [...current, value];
      return { ...prev, requestTypes: next };
    });
    setTouched((prev) => ({ ...prev, requestTypes: true }));
    setErrors((prev) => ({ ...prev, requestTypes: null }));
  }

  function validateAll() {
    const newErrors = {};
    for (const field of REQUIRED_FIELDS) {
      const err = validateField(field, form[field]);
      if (err) newErrors[field] = err;
    }
    setErrors(newErrors);
    setTouched(Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, true])));
    return Object.keys(newErrors).length === 0;
  }

  async function submit(ignoreDuplicate = false) {
    setNetworkError(null);
    setLoading(true);

    const payload = {
      requestorName: form.requestorName.trim(),
      requestorEmail: form.requestorEmail.trim(),
      requestorPhone: form.requestorPhone.trim(),
      alternateContactName: form.alternateContactName.trim() || undefined,
      alternateContactEmail: form.alternateContactEmail.trim() || undefined,
      eventName: form.eventName.trim(),
      eventDate: form.eventDate,
      eventAddress: form.eventAddress.trim() || undefined,
      eventCity: form.eventCity.trim(),
      eventZip: form.eventZip.trim(),
      estimatedAttendees: form.estimatedAttendees ? parseInt(form.estimatedAttendees, 10) : undefined,
      eventDescription: form.eventDescription.trim() || undefined,
      requestTypes: form.requestTypes,
      assetCategory: form.assetCategory || undefined,
      materialPreferences: form.materialPreferences
        ? form.materialPreferences.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      specialInstructions: form.specialInstructions.trim() || undefined,
      ...(ignoreDuplicate ? { ignoreDuplicate: true } : {}),
    };

    try {
      const data = await apiPost('/api/requests', payload);
      setResult(data);
      setDuplicateWarning(null);
    } catch (err) {
      if (err.status === 409) {
        setDuplicateWarning(err);
      } else if (err.status === 503 && err.id) {
        // Request was saved but AI processing failed — treat as success with a note
        setResult(err);
        setDuplicateWarning(null);
      } else if (err.fields) {
        // Server-side validation errors
        setErrors((prev) => ({ ...prev, ...err.fields }));
      } else {
        setNetworkError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateAll()) {
      // Focus first error
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        firstError?.focus();
      }, 50);
      return;
    }
    await submit(false);
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setTouched({});
    setResult(null);
    setNetworkError(null);
    setDuplicateWarning(null);
  }

  if (result) {
    return <ConfirmationCard result={result} onSubmitAnother={handleReset} />;
  }

  return (
    <>
      <VoiceIntakeModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onComplete={(fields) => {
          handleVoiceComplete(fields);
          setIsVoiceModalOpen(false);
        }}
        initialFields={form}
      />

    <form onSubmit={handleSubmit} noValidate aria-label="Community Health Request Form">
      <div className="space-y-6">

        {/* Voice Assistant entry point */}
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-5 py-3">
          <div>
            <p className="text-sm font-medium text-teal-800">Prefer to speak?</p>
            <p className="text-xs text-teal-600 mt-0.5">Use our voice assistant to fill in this form conversationally.</p>
          </div>
          <button
            type="button"
            aria-label="Open voice assistant to fill form"
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 shrink-0 ml-4"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 8 1z" />
              <path d="M4 8.5A4 4 0 0 0 12 8.5v-1h-1v1a3 3 0 0 1-6 0v-1H4v1z" />
              <path d="M7.5 13.5v1.5h1v-1.5A5.5 5.5 0 0 0 13.5 8h-1A4.5 4.5 0 0 1 7.5 12.5v1z" />
            </svg>
            Use Voice Assistant
          </button>
        </div>

        {/* Network error banner */}
        {networkError && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3"
            role="alert"
            aria-live="assertive"
          >
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Submission failed</p>
              <p className="text-sm text-red-700 mt-0.5">{networkError}</p>
            </div>
            <button
              type="button"
              onClick={() => submit(false)}
              className="text-sm font-medium text-red-700 underline hover:text-red-900 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Duplicate warning banner */}
        {duplicateWarning && (
          <div
            className="bg-brand-yellow-100 border border-brand-yellow-300 rounded-lg px-4 py-3 flex items-start gap-3"
            role="alert"
            aria-live="polite"
          >
            <svg className="w-5 h-5 text-brand-yellow-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-yellow-700">Possible duplicate detected</p>
              <p className="text-sm text-brand-yellow-700 mt-0.5">
                {duplicateWarning.message || 'A similar request may already exist for this event.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => submit(true)}
              className="text-sm font-medium text-brand-yellow-700 underline hover:text-brand-yellow-900 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-500 rounded"
            >
              Submit anyway
            </button>
          </div>
        )}

        {/* Section 1: Requestor Info */}
        <Card className="overflow-hidden">
          <div className="bg-brand-navy-500 px-6 py-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              1. Requestor Information
            </h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="requestorName"
              label="Full Name"
              required
              error={errors.requestorName}
              touched={touched.requestorName}
            >
              <input
                id="requestorName"
                name="requestorName"
                type="text"
                autoComplete="name"
                value={form.requestorName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.requestorName && !!errors.requestorName}
                aria-describedby={errors.requestorName && touched.requestorName ? 'requestorName-error' : undefined}
                className={inputClasses(touched.requestorName && !!errors.requestorName)}
                placeholder="Jane Smith"
              />
            </FormField>

            <FormField
              id="requestorEmail"
              label="Email Address"
              required
              error={errors.requestorEmail}
              touched={touched.requestorEmail}
            >
              <input
                id="requestorEmail"
                name="requestorEmail"
                type="email"
                autoComplete="email"
                value={form.requestorEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.requestorEmail && !!errors.requestorEmail}
                aria-describedby={errors.requestorEmail && touched.requestorEmail ? 'requestorEmail-error' : undefined}
                className={inputClasses(touched.requestorEmail && !!errors.requestorEmail)}
                placeholder="jane@organization.org"
              />
            </FormField>

            <FormField
              id="requestorPhone"
              label="Phone Number"
              required
              error={errors.requestorPhone}
              touched={touched.requestorPhone}
            >
              <input
                id="requestorPhone"
                name="requestorPhone"
                type="tel"
                autoComplete="tel"
                value={form.requestorPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.requestorPhone && !!errors.requestorPhone}
                aria-describedby={errors.requestorPhone && touched.requestorPhone ? 'requestorPhone-error' : undefined}
                className={inputClasses(touched.requestorPhone && !!errors.requestorPhone)}
                placeholder="(801) 555-0100"
                maxLength={14}
              />
            </FormField>

            <div /> {/* spacer */}

            <FormField id="alternateContactName" label="Alternate Contact Name">
              <input
                id="alternateContactName"
                name="alternateContactName"
                type="text"
                autoComplete="name"
                value={form.alternateContactName}
                onChange={handleChange}
                className={inputClasses(false)}
                placeholder="Optional"
              />
            </FormField>

            <FormField
              id="alternateContactEmail"
              label="Alternate Contact Email"
              error={errors.alternateContactEmail}
              touched={touched.alternateContactEmail}
            >
              <input
                id="alternateContactEmail"
                name="alternateContactEmail"
                type="email"
                autoComplete="email"
                value={form.alternateContactEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={touched.alternateContactEmail && !!errors.alternateContactEmail}
                aria-describedby={errors.alternateContactEmail && touched.alternateContactEmail ? 'alternateContactEmail-error' : undefined}
                className={inputClasses(touched.alternateContactEmail && !!errors.alternateContactEmail)}
                placeholder="Optional"
              />
            </FormField>
          </div>
        </Card>

        {/* Section 2: Event Details */}
        <Card className="overflow-hidden">
          <div className="bg-brand-purple-500 px-6 py-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              2. Event Details
            </h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="eventName"
              label="Event Name"
              required
              error={errors.eventName}
              touched={touched.eventName}
              className="sm:col-span-2"
            >
              <input
                id="eventName"
                name="eventName"
                type="text"
                value={form.eventName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.eventName && !!errors.eventName}
                aria-describedby={errors.eventName && touched.eventName ? 'eventName-error' : undefined}
                className={inputClasses(touched.eventName && !!errors.eventName)}
                placeholder="Senior Health Fair"
              />
            </FormField>

            <FormField
              id="eventDate"
              label="Event Date"
              required
              error={errors.eventDate}
              touched={touched.eventDate}
            >
              <input
                id="eventDate"
                name="eventDate"
                type="date"
                min={TODAY}
                value={form.eventDate}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.eventDate && !!errors.eventDate}
                aria-describedby={errors.eventDate && touched.eventDate ? 'eventDate-error' : undefined}
                className={inputClasses(touched.eventDate && !!errors.eventDate)}
              />
            </FormField>

            <FormField id="estimatedAttendees" label="Estimated Attendees">
              <input
                id="estimatedAttendees"
                name="estimatedAttendees"
                type="number"
                min="1"
                max="100000"
                value={form.estimatedAttendees}
                onChange={handleChange}
                className={inputClasses(false)}
                placeholder="e.g. 100"
              />
            </FormField>

            <FormField
              id="eventAddress"
              label="Event Address"
              hint="If you include city and ZIP in the address, we will auto-fill those fields when possible."
              className="sm:col-span-2"
            >
              <input
                id="eventAddress"
                name="eventAddress"
                type="text"
                autoComplete="street-address"
                value={form.eventAddress}
                onChange={handleChange}
                className={inputClasses(false)}
                placeholder="123 Main St, Salt Lake City, UT 84101"
              />
            </FormField>

            <FormField
              id="eventCity"
              label="City"
              required
              error={errors.eventCity}
              touched={touched.eventCity}
            >
              <input
                id="eventCity"
                name="eventCity"
                type="text"
                value={form.eventCity}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.eventCity && !!errors.eventCity}
                aria-describedby={errors.eventCity && touched.eventCity ? 'eventCity-error' : undefined}
                className={inputClasses(touched.eventCity && !!errors.eventCity)}
                placeholder="Salt Lake City"
              />
            </FormField>

            <FormField
              id="eventZip"
              label="ZIP Code"
              required
              error={errors.eventZip}
              touched={touched.eventZip}
            >
              <input
                id="eventZip"
                name="eventZip"
                type="text"
                inputMode="numeric"
                pattern="\d{5}(-\d{4})?"
                maxLength={10}
                value={form.eventZip}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                aria-invalid={touched.eventZip && !!errors.eventZip}
                aria-describedby={errors.eventZip && touched.eventZip ? 'eventZip-error' : undefined}
                className={inputClasses(touched.eventZip && !!errors.eventZip)}
                placeholder="84101 or 84101-1234"
              />
            </FormField>

            <FormField
              id="eventDescription"
              label="Event Description"
              hint="AI will use this to help categorize and route your request."
              className="sm:col-span-2"
            >
              <textarea
                id="eventDescription"
                name="eventDescription"
                rows={3}
                value={form.eventDescription}
                onChange={handleChange}
                aria-describedby="eventDescription-hint"
                className={`${inputClasses(false)} resize-y`}
                placeholder="Describe your event and what health topics will be covered..."
              />
            </FormField>
          </div>
        </Card>

        {/* Section 3: Request Type */}
        <Card className="overflow-hidden">
          <div className="bg-brand-navy-600 px-6 py-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              3. Request Type <span className="font-normal normal-case tracking-normal text-brand-periwinkle-200">(required — select all that apply)</span>
            </h2>
          </div>
          <div className="px-6 py-5">
            {touched.requestTypes && errors.requestTypes && (
              <div id="requestTypes-error" className="mb-4 text-sm text-red-600 flex items-center gap-1.5" role="alert">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {errors.requestTypes}
              </div>
            )}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              role="group"
              aria-label="Request Type — select all that apply"
              aria-required="true"
              aria-describedby={touched.requestTypes && errors.requestTypes ? 'requestTypes-error' : undefined}
            >
              {REQUEST_TYPES.map((type) => {
                const isSelected = form.requestTypes.includes(type.value);
                return (
                  <button
                    key={type.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleRequestType(type.value)}
                    className={[
                      'relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500',
                      isSelected
                        ? 'border-brand-purple-500 bg-brand-periwinkle-50 shadow-card-hover'
                        : 'border-gray-200 bg-white hover:border-brand-purple-300 hover:bg-brand-periwinkle-50/40',
                    ].join(' ')}
                  >
                    <div
                      className={`p-2 rounded-lg ${isSelected ? 'bg-brand-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                      aria-hidden="true"
                    >
                      {type.icon}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isSelected ? 'text-brand-purple-700' : 'text-gray-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{type.description}</p>
                    </div>
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-brand-purple-500" aria-hidden="true">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Section 4: Asset Preferences (collapsible) */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setAssetOpen((prev) => !prev)}
            className="w-full flex items-center justify-between bg-gray-50 px-6 py-3 hover:bg-gray-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded-t-xl"
            aria-expanded={assetOpen}
            aria-controls="asset-preferences-section"
          >
            <h2 className="text-gray-700 font-semibold text-sm uppercase tracking-wider">
              4. Asset Preferences <span className="font-normal normal-case tracking-normal text-gray-400">(optional)</span>
            </h2>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${assetOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {assetOpen && (
            <div id="asset-preferences-section" className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100">
              <FormField id="assetCategory" label="Asset Category">
                <select
                  id="assetCategory"
                  name="assetCategory"
                  value={form.assetCategory}
                  onChange={handleChange}
                  className={inputClasses(false)}
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </FormField>

              <div /> {/* spacer */}

              <FormField
                id="materialPreferences"
                label="Material Preferences"
                hint="Comma-separated list of specific items requested."
                className="sm:col-span-2"
              >
                <textarea
                  id="materialPreferences"
                  name="materialPreferences"
                  rows={2}
                  value={form.materialPreferences}
                  onChange={handleChange}
                  aria-describedby="materialPreferences-hint"
                  className={`${inputClasses(false)} resize-y`}
                  placeholder="blood pressure cuffs, pamphlets, stress balls"
                />
              </FormField>

              <FormField
                id="specialInstructions"
                label="Special Instructions"
                className="sm:col-span-2"
              >
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  rows={2}
                  value={form.specialInstructions}
                  onChange={handleChange}
                  className={`${inputClasses(false)} resize-y`}
                  placeholder="Any additional notes for the community health team..."
                />
              </FormField>
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            ariaLabel="Submit Community Health Request"
          >
            Submit Request
          </Button>
        </div>
      </div>
    </form>
    </>
  );
}

/** Tailwind input classes based on error state */
function inputClasses(hasError) {
  return [
    'block w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
    'bg-white placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-brand-purple-500 focus:border-brand-purple-500',
    'transition-colors duration-100',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
      : 'border-gray-300 hover:border-gray-400',
  ].join(' ');
}

/**
 * Reusable form field wrapper with label, hint, and error display.
 *
 * @param {object} props
 * @param {string} props.id - Input ID (also used for error/hint IDs)
 * @param {string} props.label - Label text
 * @param {boolean} [props.required] - Shows * and aria-required
 * @param {string|null} [props.error] - Error message
 * @param {boolean} [props.touched] - Whether field has been blurred
 * @param {string} [props.hint] - Helper text below input
 * @param {string} [props.className] - Additional wrapper CSS
 * @param {React.ReactNode} props.children - The input element
 */
function FormField({ id, label, required, error, touched, hint, className = '', children }) {
  const showError = touched && !!error;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {showError && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
