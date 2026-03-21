# Data Model: Community Health Request System

**Branch**: `001-community-health-request-system` | **Date**: 2026-03-21

All entities are plain JavaScript objects stored in an in-memory module-level
array. Shape is enforced at the service layer. Swap storage by replacing
`backend/src/data/store.js` — all other code stays the same.

---

## Enums

```js
// backend/src/lib/enums.js

/** Fulfillment pathway auto-assigned or manually overridden */
export const FulfillmentRoute = {
  STAFF_DEPLOYMENT: "staff_deployment",
  MAIL: "mail",
  PICKUP: "pickup",
};

/** Lifecycle status of a request */
export const RequestStatus = {
  PENDING: "pending",           // Newly submitted, awaiting admin action
  NEEDS_REVIEW: "needs_review", // AI failed or flagged; admin must classify
  APPROVED: "approved",         // Admin approved; calendar invite can be created
  FULFILLED: "fulfilled",       // Materials shipped or event staffed
  REJECTED: "rejected",         // Admin rejected with reason
};

/** Category of Community Health assets */
export const AssetCategory = {
  MATERIALS: "materials",
  TOOLKITS: "toolkits",
  BEHAVIORAL_REINFORCEMENTS: "behavioral_reinforcements",
  PROGRAMS: "programs",
};

/** Request type as selected by the requestor */
export const RequestType = {
  STAFF_SUPPORT: "staff_support",
  MAILED_MATERIALS: "mailed_materials",
  PICKUP: "pickup",
};
```

---

## Entity: Request

Primary entity. Created on form submission. One Request = one event or
material order.

```js
{
  // Identity
  id: String,              // UUID v4, generated on creation
  createdAt: String,       // ISO 8601 datetime
  updatedAt: String,       // ISO 8601 datetime, updated on any edit

  // Requestor (embedded — no user accounts)
  requestorName: String,           // Required. Full name.
  requestorEmail: String,          // Required. Validated email format.
  requestorPhone: String,          // Required. E.164 or local format.
  alternateContactName: String,    // Optional.
  alternateContactEmail: String,   // Optional.

  // Event info
  eventName: String,       // Required. Name of the event or program.
  eventDate: String,       // Required. ISO 8601 date (YYYY-MM-DD).
  eventCity: String,       // Required.
  eventZip: String,        // Required. 5-digit US zip code.
  estimatedAttendees: Number | null,  // Optional. Positive integer.
  eventDescription: String,          // Optional. Free-text for NLP processing.
  specialInstructions: String,       // Optional. Admin notes from requestor.

  // Request classification
  requestType: RequestType,         // Required. Set by requestor.
  assetCategory: AssetCategory | null,  // Optional. Set by requestor or AI.
  materialPreferences: String[],    // Optional. Specific items requested.

  // Routing (AI-assigned, admin-overridable)
  fulfillmentRoute: FulfillmentRoute,  // Required. Set by routing logic.
  routingReason: String,               // Why this route was chosen.
  isInServiceArea: Boolean,            // Set by zip code lookup.

  // AI metadata
  aiStatus: "success" | "failed" | "skipped",
  aiTags: String[],                    // Tags extracted by Claude NLP.
  aiSuggestedRoute: FulfillmentRoute | null,
  aiConfidence: "high" | "medium" | "low" | null,
  aiSummary: String | null,            // 1-sentence AI summary of the event.

  // Admin workflow
  status: RequestStatus,              // Lifecycle status.
  adminNotes: String,                 // Internal notes from admin.
  calendarInviteGenerated: Boolean,   // True after .ics has been created.

  // Audit trail
  auditLog: AuditEntry[],             // All admin changes to this request.
}
```

**Validation rules:**
- `requestorEmail`: Must match RFC 5322 pattern
- `eventDate`: Must be today or in the future (validated server-side)
- `eventZip`: Must be exactly 5 digits
- `estimatedAttendees`: If present, must be a positive integer ≤ 100,000
- `requestType`: Must be one of the `RequestType` enum values

**State transitions:**
```
PENDING → NEEDS_REVIEW  (when AI fails or flags for review)
PENDING → APPROVED      (admin approves directly)
PENDING → REJECTED      (admin rejects)
NEEDS_REVIEW → APPROVED (admin manually resolves)
NEEDS_REVIEW → REJECTED
APPROVED → FULFILLED    (staff attended or materials confirmed sent)
APPROVED → REJECTED     (admin cancels after approval)
```

---

## Entity: AuditEntry

Embedded array on Request. Captures every admin modification.

```js
{
  timestamp: String,       // ISO 8601 datetime
  field: String,           // Name of the field changed (e.g., "fulfillmentRoute")
  oldValue: any,           // Previous value
  newValue: any,           // New value
  note: String,            // Optional admin explanation
}
```

---

## Entity: ServiceArea (static lookup)

Not stored in the database — loaded from a static JS module at startup.

```js
// backend/src/data/serviceAreaZips.js
// A Set of all US zip codes in Intermountain Healthcare's service states:
// Utah, Idaho, Nevada, Wyoming, Montana, Colorado, Kansas

export const SERVICE_AREA_ZIPS = new Set([
  // ~20,000 entries — sourced from SimpleMaps US zip code database
  // filtered to UT, ID, NV, WY, MT, CO, KS
  "84101", "84102", /* ... Utah zips ... */
  "83201", "83202", /* ... Idaho zips ... */
  // etc.
]);

/**
 * Returns true if the given zip code is within Intermountain's service area.
 * @param {string} zip - 5-digit US zip code
 * @returns {boolean}
 */
export function isInServiceArea(zip) {
  return SERVICE_AREA_ZIPS.has(zip);
}
```

---

## In-Memory Store

```js
// backend/src/data/store.js
// Single source of truth. Replace the arrays/maps here to swap storage backends.

let requests = [];    // Request[]
let nextId = 1;       // Used for human-readable ID prefix (REQ-0001, etc.)

export function getAllRequests() { return [...requests]; }
export function getRequestById(id) { return requests.find(r => r.id === id) ?? null; }
export function saveRequest(request) { requests.push(request); return request; }
export function updateRequest(id, updates) {
  const idx = requests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  requests[idx] = { ...requests[idx], ...updates, updatedAt: new Date().toISOString() };
  return requests[idx];
}
export function deleteRequest(id) {
  const idx = requests.findIndex(r => r.id === id);
  if (idx === -1) return false;
  requests.splice(idx, 1);
  return true;
}
```

---

## Routing Logic

```
function determineRoute(requestType, isInServiceArea):
  if requestType === "mailed_materials" → "mail"
  if requestType === "pickup"           → "pickup"
  if !isInServiceArea                   → "mail"  (with routingReason: "outside service area")
  else                                  → "staff_deployment" (pending admin approval)
```

The AI suggestion (`aiSuggestedRoute`) informs but does not override this
deterministic logic. If AI and deterministic logic disagree with high confidence,
the request is flagged `needs_review`.

---

## Frontend State Shape

```js
// Mirrors the Request entity for display; all dates as ISO strings
// Status and routing are display-formatted in the UI layer, not the store

// Dashboard filter state (Zustand or Context)
{
  search: String,
  statusFilter: RequestStatus | "all",
  routeFilter: FulfillmentRoute | "all",
  dateRange: { start: String | null, end: String | null },
  zipFilter: String,
  sortBy: "createdAt" | "eventDate" | "requestorName",
  sortDir: "asc" | "desc",
}
```
