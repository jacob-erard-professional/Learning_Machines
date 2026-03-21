/**
 * @file store.js
 * In-memory data store — single source of truth for the hackathon demo.
 * All state lives in module-level arrays/objects (Node module singleton).
 *
 * Swap storage: replace these exported functions with lowdb or Postgres
 * equivalents and the rest of the application requires zero changes.
 */

/** @type {Array<Object>} Primary requests collection */
let requests = [];

/**
 * Separate log of admin overrides, used by the AI learning / pattern
 * analysis feature to detect systematic routing corrections.
 * @type {Array<Object>}
 */
let adminOverrides = [];

// ---------------------------------------------------------------------------
// Request CRUD
// ---------------------------------------------------------------------------

/**
 * Returns a shallow copy of all requests (prevents external mutation of store).
 * @returns {Array<Object>}
 */
export function getAllRequests() {
  return [...requests];
}

/**
 * Looks up a single request by its ID.
 * @param {string} id - Request ID (e.g. "REQ-123456")
 * @returns {Object|null} The request object, or null if not found
 */
export function getRequestById(id) {
  return requests.find((r) => r.id === id) ?? null;
}

/**
 * Persists a new request to the store.
 * @param {Object} request - Fully constructed request object
 * @returns {Object} The same request object (pass-through for chaining)
 */
export function saveRequest(request) {
  requests.push(request);
  return request;
}

/**
 * Merges partial updates into an existing request and stamps updatedAt.
 * @param {string} id - Request ID to update
 * @param {Object} updates - Partial fields to merge
 * @returns {Object|null} Updated request, or null if not found
 */
export function updateRequest(id, updates) {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx] = {
    ...requests[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return requests[idx];
}

/**
 * Removes a request from the store entirely.
 * @param {string} id - Request ID to delete
 * @returns {boolean} true if deleted, false if not found
 */
export function deleteRequest(id) {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  requests.splice(idx, 1);
  return true;
}

/**
 * Checks for a duplicate submission — same requestor email + event date + zip.
 * Prevents accidental double-submissions from the frontend.
 *
 * @param {string} email - Requestor email
 * @param {string} eventDate - ISO date string (YYYY-MM-DD)
 * @param {string} zip - 5-digit zip code
 * @returns {Object|null} Existing request if duplicate found, otherwise null
 */
export function findDuplicate(email, eventDate, zip) {
  return (
    requests.find(
      (r) =>
        r.requestorEmail === email &&
        r.eventDate === eventDate &&
        r.eventZip === zip
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Admin Override Tracking (AI learning feed)
// ---------------------------------------------------------------------------

/**
 * Returns the full admin override log.
 * @returns {Array<Object>}
 */
export function getAdminOverrides() {
  return [...adminOverrides];
}

/**
 * Appends a new override record when an admin manually changes a field
 * that was originally set by the AI or routing logic.
 *
 * @param {string} requestId - ID of the affected request
 * @param {string} field - Name of the field changed (e.g., "fulfillmentRoute")
 * @param {*} oldVal - Value before the override
 * @param {*} newVal - Value after the override
 * @returns {Object} The saved override record
 */
export function saveAdminOverride(requestId, field, oldVal, newVal) {
  const override = {
    requestId,
    field,
    oldVal,
    newVal,
    timestamp: new Date().toISOString(),
  };
  adminOverrides.push(override);
  return override;
}

/**
 * Computes frequency analysis over the admin override log.
 * Used by the "Admin Patterns" analytics panel to surface systematic
 * corrections that could improve the AI routing model over time.
 *
 * @returns {{ mostCommonOverride: string|null, topOverriddenZips: string[], totalOverrides: number }}
 */
export function getAdminPatterns() {
  const totalOverrides = adminOverrides.length;

  if (totalOverrides === 0) {
    return { mostCommonOverride: null, topOverriddenZips: [], totalOverrides: 0 };
  }

  // Count frequency of each (field → newVal) combination
  const overrideCounts = {};
  for (const o of adminOverrides) {
    const key = `${o.field}:${o.newVal}`;
    overrideCounts[key] = (overrideCounts[key] || 0) + 1;
  }
  const mostCommonOverride = Object.entries(overrideCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? null;

  // Find zips whose requests get overridden most often
  const zipCounts = {};
  for (const o of adminOverrides) {
    const req = getRequestById(o.requestId);
    if (req?.eventZip) {
      zipCounts[req.eventZip] = (zipCounts[req.eventZip] || 0) + 1;
    }
  }
  const topOverriddenZips = Object.entries(zipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([zip]) => zip);

  return { mostCommonOverride, topOverriddenZips, totalOverrides };
}

// ---------------------------------------------------------------------------
// Seed helper (demo / testing)
// ---------------------------------------------------------------------------

/**
 * Replaces the entire store with the provided array.
 * Used by server.js in dev mode to load demo seed data on startup,
 * and by integration tests to reset state between test runs.
 *
 * @param {Array<Object>} seedRequests - Array of request objects to load
 */
export function seedDatabase(seedRequests) {
  requests = [...seedRequests];
  adminOverrides = [];
}
