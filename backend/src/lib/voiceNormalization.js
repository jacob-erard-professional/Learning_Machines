/**
 * @file voiceNormalization.js
 * Normalization helpers for voice-intake transcripts and extracted fields.
 */

const REQUEST_TYPE_MAP = new Map([
  ['staff support', 'staff_support'],
  ['staff_support', 'staff_support'],
  ['staffed event', 'staff_support'],
  ['staffing', 'staff_support'],
  ['mail', 'mailed_materials'],
  ['mailed materials', 'mailed_materials'],
  ['mail materials', 'mailed_materials'],
  ['materials by mail', 'mailed_materials'],
  ['pickup', 'pickup'],
  ['pick up', 'pickup'],
  ['pick-up', 'pickup'],
]);

export function normalizePhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length !== 10) return String(value).trim();
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

export function normalizeZip(value) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d-]/g, '');
  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits.trim();
}

export function normalizeEmail(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

export function normalizeRequestType(value) {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  return REQUEST_TYPE_MAP.get(cleaned) ?? cleaned.replace(/\s+/g, '_');
}

export function normalizeVoiceFields(fields = {}) {
  return {
    ...fields,
    requestorName: fields.requestorName ? String(fields.requestorName).trim() : fields.requestorName,
    requestorEmail: normalizeEmail(fields.requestorEmail),
    requestorPhone: normalizePhone(fields.requestorPhone),
    eventName: fields.eventName ? String(fields.eventName).trim() : fields.eventName,
    eventDate: fields.eventDate ? String(fields.eventDate).trim() : fields.eventDate,
    eventCity: fields.eventCity ? String(fields.eventCity).trim() : fields.eventCity,
    eventZip: normalizeZip(fields.eventZip),
    requestType: normalizeRequestType(fields.requestType),
  };
}
