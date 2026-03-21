# Staffing Feasibility Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read staff availability from a Google Sheets "Staff" tab, check whether enough staff are free for each incoming `staff_deployment` request, flag understaffed requests for admin review with an alert email, and assign staff evenly when a request is approved.

**Architecture:** A new `staffService.js` owns all staffing logic (availability filtering, feasibility checking, even-distribution assignment). Staff data lives in `store.js` as a module-level array populated from Google Sheets on startup. Integration points are `requestService.js` (feasibility check on submit) and `routes/requests.js` (assignment on approve).

**Tech Stack:** Node.js 20, Express 4, Vitest (test runner already installed), Google Sheets API v4 via `googleapis`, Gmail OAuth via existing `mailer.js` infrastructure.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/src/lib/enums.js` | Modify | Add `StaffingFlag` enum |
| `backend/src/data/googleSheetsStore.js` | Modify | Add `loadStaffFromGoogleSheets()` |
| `backend/src/data/store.js` | Modify | Add `staff` array, `getStaff()`, wire into init/refresh |
| `backend/src/services/staffService.js` | **Create** | `getAvailableStaff`, `checkStaffFeasibility`, `assignStaffToRequest` |
| `backend/src/lib/mailer.js` | Modify | Add `sendAdminAlert(request, feasibilityResult)` |
| `backend/src/services/requestService.js` | Modify | Call feasibility check after routing |
| `backend/src/routes/requests.js` | Modify | Call `assignStaffToRequest` on approve |
| `backend/src/services/staffService.test.js` | **Create** | Unit tests for staffService |

---

## Task 1: Add `StaffingFlag` enum

**Files:**
- Modify: `backend/src/lib/enums.js`

- [ ] **Step 1: Add the enum**

Open `backend/src/lib/enums.js` and append after the existing `UrgencyLevel` block:

```js
/**
 * Staffing feasibility flag — set when a staff_deployment request cannot be
 * fulfilled with currently available staff.
 * @type {{ INSUFFICIENT_STAFF: string, NO_STAFF_DATA: string }}
 */
export const StaffingFlag = Object.freeze({
  INSUFFICIENT_STAFF: 'insufficient_staff',
  NO_STAFF_DATA: 'no_staff_data',
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/enums.js
git commit -m "feat: add StaffingFlag enum"
```

---

## Task 2: Load staff from Google Sheets

**Files:**
- Modify: `backend/src/data/googleSheetsStore.js`

The Staff sheet has one staff member per row with named columns (no JSON blob column — each field is its own column). Read all rows, skip the header, map to normalized objects.

- [ ] **Step 1: Add the constant and parser at the top of `googleSheetsStore.js`**

After the existing `OVERRIDES_SHEET_NAME` line, add:

```js
const STAFF_SHEET_NAME = process.env.GOOGLE_SHEETS_STAFF_SHEET_NAME ?? 'Staff';

const STAFF_COLUMNS = [
  'staffId', 'zipCode', 'name', 'email', 'phone',
  'role', 'certifications', 'availableWeekdays', 'active', 'yearsExperience',
];

function parseStaffRows(rows = []) {
  if (rows.length < 2) return [];
  return rows.slice(1).map((row) => ({
    staffId: row[0] ?? '',
    zipCode: row[1] ?? '',
    name: row[2] ?? '',
    email: row[3] ?? '',
    phone: row[4] ?? '',
    role: row[5] ?? '',
    certifications: (row[6] ?? '').split(';').map((s) => s.trim()).filter(Boolean),
    availableWeekdays: (row[7] ?? '').split(';').map((s) => s.trim()).filter(Boolean),
    active: (row[8] ?? '').trim().toUpperCase() === 'TRUE',
    yearsExperience: Number(row[9] ?? 0) || 0,
  })).filter((s) => s.staffId);
}
```

- [ ] **Step 2: Add `loadStaffFromGoogleSheets()` export at the bottom of `googleSheetsStore.js`**

```js
export async function loadStaffFromGoogleSheets() {
  const config = getSheetsConfig();
  const sheets = await getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${STAFF_SHEET_NAME}!A:J`,
    });
    return parseStaffRows(res.data.values ?? []);
  } catch (err) {
    console.error('[googleSheetsStore] Failed to load Staff sheet:', err.message);
    return [];
  }
}
```

Note: this function does NOT call `ensureSheetExists` — the Staff sheet is created and managed externally. If it doesn't exist, the catch returns an empty array.

**Spec discrepancy note:** The spec document incorrectly states the return shape as `{ staff: StaffMember[] }`. The correct return value is `StaffMember[]` directly — this is what `store.js` expects when it does `staff = await loadStaffFromGoogleSheets()`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/data/googleSheetsStore.js
git commit -m "feat: add loadStaffFromGoogleSheets to read Staff sheet"
```

---

## Task 3: Wire staff into the in-memory store

**Files:**
- Modify: `backend/src/data/store.js`

Follow the exact same pattern as `requests` and `adminOverrides`.

- [ ] **Step 1: Add the in-memory array and getter**

After the `let adminOverrides = [];` line, add:

```js
/** @type {Array<Object>} Staff roster loaded from Google Sheets (read-only) */
let staff = [];
```

After `export function getAdminOverrides()`, add:

```js
/**
 * Returns a shallow copy of the staff roster.
 * @returns {Array<Object>}
 */
export function getStaff() {
  return [...staff];
}
```

- [ ] **Step 2: Populate staff in `initializeStore()`**

Add `loadStaffFromGoogleSheets` to the existing import at the top of `store.js`:

```js
import {
  isGoogleSheetsConfigured,
  loadStateFromGoogleSheets,
  saveStateToGoogleSheets,
  loadStaffFromGoogleSheets,
} from './googleSheetsStore.js';
```

In `initializeStore()`, the function returns early on line ~229 if Sheets is not configured. The Sheets-configured path continues to line ~234 where it calls `loadStateFromGoogleSheets()` and assigns `requests` and `adminOverrides`. Add the staff load directly after `adminOverrides = state.adminOverrides;` — no extra guard needed, you are already inside the Sheets-configured branch:

```js
requests = state.requests;
adminOverrides = state.adminOverrides;
// Add this line:
staff = await loadStaffFromGoogleSheets();
console.log(`[store] Loaded ${staff.length} staff members from Sheets`);
```

- [ ] **Step 3: Refresh staff in `refreshStoreFromSource()`**

Inside `refreshStoreFromSource()`, add the staff load directly after `adminOverrides = state.adminOverrides;` (same pattern as `initializeStore`):

```js
requests = state.requests;
adminOverrides = state.adminOverrides;
// Add this line:
staff = await loadStaffFromGoogleSheets();
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/data/store.js
git commit -m "feat: add staff roster to in-memory store with getStaff()"
```

---

## Task 4: Build `staffService.js`

**Files:**
- Create: `backend/src/services/staffService.js`
- Create: `backend/src/services/staffService.test.js`

This is the core logic. Write tests first, then implement.

- [ ] **Step 1: Write the test file**

Create `backend/src/services/staffService.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the store so tests don't need real data
vi.mock('../data/store.js', () => ({
  getStaff: vi.fn(),
  getAllRequests: vi.fn(),
  updateRequest: vi.fn((id, updates) => ({ id, ...updates })),
}));

import { getStaff, getAllRequests, updateRequest } from '../data/store.js';
import {
  getAvailableStaff,
  checkStaffFeasibility,
  assignStaffToRequest,
} from './staffService.js';

const THURSDAY_DATE = '2026-03-26'; // a Thursday

const makeStaff = (overrides = {}) => ({
  staffId: 'STF-001',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'Wellness Ambassador',
  active: true,
  availableWeekdays: ['Thursday', 'Friday'],
  ...overrides,
});

const makeRequest = (overrides = {}) => ({
  id: 'REQ-001',
  status: 'approved',
  eventDate: THURSDAY_DATE,
  fulfillmentRoute: 'staff_deployment',
  assignedStaff: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// --- getAvailableStaff ---

describe('getAvailableStaff', () => {
  it('returns active staff available on the event weekday', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = getAvailableStaff(THURSDAY_DATE);
    expect(result).toHaveLength(1);
    expect(result[0].staffId).toBe('STF-001');
  });

  it('excludes inactive staff', () => {
    getStaff.mockReturnValue([makeStaff({ active: false })]);
    getAllRequests.mockReturnValue([]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('excludes staff not available on that weekday', () => {
    getStaff.mockReturnValue([makeStaff({ availableWeekdays: ['Monday'] })]);
    getAllRequests.mockReturnValue([]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('excludes staff already assigned to an approved event on the same date', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(0);
  });

  it('does not exclude staff assigned to a different date', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ eventDate: '2026-03-27', assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(1);
  });

  it('does not exclude staff assigned to a rejected request', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([
      makeRequest({ status: 'rejected', assignedStaff: [{ staffId: 'STF-001' }] }),
    ]);
    expect(getAvailableStaff(THURSDAY_DATE)).toHaveLength(1);
  });
});

// --- checkStaffFeasibility ---

describe('checkStaffFeasibility', () => {
  it('is feasible when free staff >= needed', () => {
    getStaff.mockReturnValue([makeStaff(), makeStaff({ staffId: 'STF-002', name: 'Bob' })]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 150); // needs 2
    expect(result.feasible).toBe(true);
    expect(result.needed).toBe(2);
    expect(result.freeCount).toBe(2);
    expect(result.shortage).toBe(0);
  });

  it('is not feasible when free staff < needed', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 250); // needs 3
    expect(result.feasible).toBe(false);
    expect(result.needed).toBe(3);
    expect(result.shortage).toBe(2);
  });

  it('defaults to needed=1 when estimatedAttendees is null', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, null);
    expect(result.needed).toBe(1);
    expect(result.feasible).toBe(true);
  });

  it('defaults to needed=1 when estimatedAttendees is 0', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = checkStaffFeasibility(THURSDAY_DATE, 0);
    expect(result.needed).toBe(1);
  });
});

// --- assignStaffToRequest ---

describe('assignStaffToRequest', () => {
  it('assigns the correct number of staff and persists them', () => {
    const alice = makeStaff({ staffId: 'STF-001', name: 'Alice' });
    const bob = makeStaff({ staffId: 'STF-002', name: 'Bob', availableWeekdays: ['Thursday'] });
    getStaff.mockReturnValue([alice, bob]);
    getAllRequests.mockReturnValue([]);

    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 1);
    expect(result).toHaveLength(1);
    expect(updateRequest).toHaveBeenCalledWith('REQ-999', {
      assignedStaff: expect.arrayContaining([
        expect.objectContaining({ staffId: expect.any(String) }),
      ]),
    });
  });

  it('prefers staff with fewest existing assignments (even distribution)', () => {
    const alice = makeStaff({ staffId: 'STF-001', name: 'Alice' });
    const bob = makeStaff({ staffId: 'STF-002', name: 'Bob', availableWeekdays: ['Thursday'] });
    getStaff.mockReturnValue([alice, bob]);

    // Alice already has 2 assignments; Bob has 0
    getAllRequests.mockReturnValue([
      { id: 'REQ-A', status: 'approved', eventDate: '2026-03-20', fulfillmentRoute: 'staff_deployment', assignedStaff: [{ staffId: 'STF-001' }] },
      { id: 'REQ-B', status: 'approved', eventDate: '2026-03-21', fulfillmentRoute: 'staff_deployment', assignedStaff: [{ staffId: 'STF-001' }] },
    ]);

    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 1);
    // Bob should be picked because he has fewer assignments
    expect(result[0].staffId).toBe('STF-002');
  });

  it('returns partial list (not throwing) when fewer staff available than needed', () => {
    getStaff.mockReturnValue([makeStaff()]);
    getAllRequests.mockReturnValue([]);
    const result = assignStaffToRequest('REQ-999', THURSDAY_DATE, 5);
    expect(result.length).toBeLessThan(5);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/jacoberard/agent_practice/Learning_Machines/backend
npx vitest run src/services/staffService.test.js 2>&1 | head -30
```

Expected: FAIL — `staffService.js` does not exist yet.

- [ ] **Step 3: Create `staffService.js`**

Create `backend/src/services/staffService.js`:

```js
/**
 * @file staffService.js
 * Staffing feasibility and assignment logic.
 *
 * - checkStaffFeasibility: determines if enough staff are free for an event date
 * - assignStaffToRequest: assigns staff at approval time using even distribution
 */

import { getStaff, getAllRequests, updateRequest } from '../data/store.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Derives the UTC day-of-week name from an ISO date string (YYYY-MM-DD).
 * Uses UTC to avoid timezone drift (same approach as routingService.js).
 *
 * @param {string} eventDate - ISO date string e.g. "2026-03-26"
 * @returns {string} Day name e.g. "Thursday"
 */
function getDayName(eventDate) {
  const d = new Date(eventDate + 'T00:00:00Z');
  return DAY_NAMES[d.getUTCDay()];
}

/**
 * Returns staff who are active, available on the event's weekday,
 * and not already assigned to another approved request on that same date.
 *
 * @param {string} eventDate - ISO date string (YYYY-MM-DD)
 * @returns {Array<Object>} Free staff members
 */
export function getAvailableStaff(eventDate) {
  const dayName = getDayName(eventDate);
  const allStaff = getStaff();
  const allRequests = getAllRequests();

  // Collect staffIds already committed to approved requests on this exact date
  const busyStaffIds = new Set();
  for (const req of allRequests) {
    if (req.status === 'approved' && req.eventDate === eventDate && Array.isArray(req.assignedStaff)) {
      for (const s of req.assignedStaff) {
        if (s.staffId) busyStaffIds.add(s.staffId);
      }
    }
  }

  return allStaff.filter(
    (s) => s.active && s.availableWeekdays.includes(dayName) && !busyStaffIds.has(s.staffId)
  );
}

/**
 * Checks whether enough staff are free to cover an event.
 *
 * @param {string} eventDate - ISO date string
 * @param {number|null} estimatedAttendees - Expected attendee count
 * @returns {{ feasible: boolean, needed: number, freeCount: number, shortage: number }}
 */
export function checkStaffFeasibility(eventDate, estimatedAttendees) {
  const needed = Math.ceil((estimatedAttendees || 1) / 100);
  const free = getAvailableStaff(eventDate);
  const freeCount = free.length;
  const shortage = Math.max(0, needed - freeCount);
  return { feasible: freeCount >= needed, needed, freeCount, shortage };
}

/**
 * Counts how many non-rejected requests a staff member is assigned to.
 * Used to implement even distribution: staff with fewer assignments are preferred.
 *
 * Statuses counted: pending, needs_review, approved, fulfilled.
 * Statuses excluded: rejected.
 *
 * @param {string} staffId
 * @param {Array<Object>} allRequests
 * @returns {number}
 */
function countAssignments(staffId, allRequests) {
  return allRequests.filter(
    (r) =>
      r.status !== 'rejected' &&
      Array.isArray(r.assignedStaff) &&
      r.assignedStaff.some((s) => s.staffId === staffId)
  ).length;
}

/**
 * Assigns `needed` staff to a request at approval time.
 * Selects from free staff sorted by fewest existing assignments (even distribution).
 * If fewer than `needed` are available, assigns as many as possible.
 *
 * @param {string} requestId - ID of the request being approved
 * @param {string} eventDate - ISO date string for the event
 * @param {number} needed - Number of staff required
 * @returns {Array<{ staffId: string, name: string, email: string, role: string }>}
 */
export function assignStaffToRequest(requestId, eventDate, needed) {
  const free = getAvailableStaff(eventDate);
  const allRequests = getAllRequests();

  // Sort by assignment count ascending — least loaded first
  const sorted = [...free].sort(
    (a, b) => countAssignments(a.staffId, allRequests) - countAssignments(b.staffId, allRequests)
  );

  const selected = sorted.slice(0, needed).map(({ staffId, name, email, role }) => ({
    staffId,
    name,
    email,
    role,
  }));

  updateRequest(requestId, { assignedStaff: selected });
  return selected;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /home/jacoberard/agent_practice/Learning_Machines/backend
npx vitest run src/services/staffService.test.js
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/staffService.js backend/src/services/staffService.test.js
git commit -m "feat: add staffService with feasibility check and even-distribution assignment"
```

---

## Task 5: Add `sendAdminAlert` to mailer

**Files:**
- Modify: `backend/src/lib/mailer.js`

- [ ] **Step 1: Add the function at the bottom of `mailer.js`**

```js
const ADMIN_ALERT_EMAIL = 'erardjacob@gmail.com';

/**
 * Sends a staffing shortage alert to the admin email address.
 * Non-blocking — if Gmail OAuth is not connected, logs and returns disabled status.
 *
 * @param {Object} request - The full request object
 * @param {{ needed: number, freeCount: number, shortage: number }} feasibilityResult
 * @returns {Promise<{status: 'sent'|'failed'|'disabled', reason?: string}>}
 */
export async function sendAdminAlert(request, feasibilityResult) {
  const authStatus = await getGoogleAuthStatus();
  if (!authStatus.configured) {
    console.warn('[mailer] Admin alert skipped — Gmail OAuth not configured');
    return { status: 'disabled', reason: 'Gmail OAuth not configured' };
  }

  const auth = await getAuthorizedOAuthClient();
  if (!auth) {
    console.warn('[mailer] Admin alert skipped — Gmail not connected');
    return { status: 'disabled', reason: 'Gmail not connected' };
  }

  const subject = `[Staffing Alert] Insufficient staff for ${request.eventName ?? request.id}`;
  const body = [
    `A new community health request requires more staff than currently available.`,
    ``,
    `Request ID:       ${request.id}`,
    `Event Name:       ${request.eventName ?? '(unnamed)'}`,
    `Event Date:       ${request.eventDate}`,
    `Event City:       ${request.eventCity ?? ''}`,
    `Attendees:        ${request.estimatedAttendees ?? 'unknown'}`,
    `Staff Needed:     ${feasibilityResult.needed}`,
    `Staff Available:  ${feasibilityResult.freeCount}`,
    `Shortage:         ${feasibilityResult.shortage}`,
    ``,
    `This request has been flagged as needs_review. Please log in to the admin dashboard to review and resolve.`,
  ].join('\n');

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const fromHeader = `"${authStatus.fromName}" <${authStatus.fromAddress}>`;
    const raw = buildRawMessage({
      from: fromHeader,
      to: ADMIN_ALERT_EMAIL,
      replyTo: authStatus.fromAddress,
      subject,
      body,
    });

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return { status: 'sent', to: ADMIN_ALERT_EMAIL, messageId: response.data.id ?? null };
  } catch (err) {
    console.error('[mailer] Failed to send admin alert:', err);
    return { status: 'failed', reason: err.message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/mailer.js
git commit -m "feat: add sendAdminAlert to mailer for staffing shortage notifications"
```

---

## Task 6: Integrate feasibility check into request submission

**Files:**
- Modify: `backend/src/services/requestService.js`

- [ ] **Step 1: Add imports at top of `requestService.js`**

Add new service/lib imports:

```js
import { checkStaffFeasibility } from './staffService.js';
import { sendAdminAlert } from '../lib/mailer.js';
import { getStaff } from '../data/store.js';
```

Also update the existing enums import (it currently only imports `RequestStatus`) to include `FulfillmentRoute` and `StaffingFlag`:

```js
import { RequestStatus, FulfillmentRoute, StaffingFlag } from '../lib/enums.js';
```

Do this in a single step — do not add a separate `StaffingFlag` import line.

- [ ] **Step 2: Add feasibility check block after routing (Step 5), before DecisionAgent**

Find the comment `// --- Step 5: Deterministic routing ---` and after the `determineRoute(...)` call, add:

```js
// --- Step 5b: Staff feasibility check (staff_deployment only) ---
let staffingFeasibility = null;
let staffingFlag = null;

if (routing.route === FulfillmentRoute.STAFF_DEPLOYMENT) {
  const allStaff = getStaff();
  if (allStaff.length === 0) {
    // No staff data loaded — flag for admin attention but don't block submission
    staffingFlag = StaffingFlag.NO_STAFF_DATA;
  } else {
    const feasibility = checkStaffFeasibility(body.eventDate, body.estimatedAttendees ?? null);
    staffingFeasibility = {
      needed: feasibility.needed,
      freeCount: feasibility.freeCount,
      shortage: feasibility.shortage,
    };
    if (!feasibility.feasible) {
      staffingFlag = StaffingFlag.INSUFFICIENT_STAFF;
    }
  }
}
```

- [ ] **Step 3: Apply the flag to the request status**

Find the status assignment block (around Step 8) — it currently reads:

```js
const status =
  !aiSucceeded || aiMismatch || (aiDecision.intentMismatch)
    ? RequestStatus.NEEDS_REVIEW
    : RequestStatus.PENDING;
```

Change it to:

```js
const status =
  !aiSucceeded || aiMismatch || aiDecision.intentMismatch || staffingFlag
    ? RequestStatus.NEEDS_REVIEW
    : RequestStatus.PENDING;
```

- [ ] **Step 4: Add `staffingFlag` and `staffingFeasibility` to the saved request object**

In the `const request = { ... }` block, add after `calendarInviteGenerated: false`:

```js
// Staffing
staffingFlag,
staffingFeasibility,
assignedStaff: [],
```

- [ ] **Step 5: Send admin alert after saving**

After `return saveRequest(request);`, change to:

```js
const saved = saveRequest(request);

// Send admin alert if staffing shortage detected
if (staffingFlag === StaffingFlag.INSUFFICIENT_STAFF) {
  sendAdminAlert(saved, staffingFeasibility).catch((err) =>
    console.error('[requestService] Admin alert failed:', err.message)
  );
}

return saved;
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/requestService.js
git commit -m "feat: run staff feasibility check on request submission"
```

---

## Task 7: Assign staff at approval time

**Files:**
- Modify: `backend/src/routes/requests.js`

- [ ] **Step 1: Add imports at top of `routes/requests.js`**

Add to the existing imports:

```js
import { assignStaffToRequest } from '../services/staffService.js';
```

- [ ] **Step 2: Update the approve handler**

Find the `router.post('/:id/approve', ...)` handler. The handler structure is:
1. `updateRequest(...)` — sets status to APPROVED
2. `sendGeneratedEmail(...)` — sends approval email
3. `if (request.fulfillmentRoute === FulfillmentRoute.STAFF_DEPLOYMENT)` → streams `.ics` and returns
4. Falls through to `return res.json(...)`

Insert the staff assignment block **after step 2 (`sendGeneratedEmail`) and BEFORE step 3 (the `.ics` streaming block)**. This ensures `staffingWarning` is in scope for the JSON fallback path (step 4), even though it cannot be surfaced when the `.ics` download path returns early.

```js
// Assign staff for staff_deployment requests
let staffingWarning = null;
if (request.fulfillmentRoute === FulfillmentRoute.STAFF_DEPLOYMENT) {
  const needed = request.staffingFeasibility?.needed
    ?? Math.ceil((request.estimatedAttendees || 1) / 100);
  const assigned = assignStaffToRequest(req.params.id, request.eventDate, needed);
  if (assigned.length < needed) {
    staffingWarning = `Partial staff assigned (${assigned.length}/${needed}) — capacity may have changed since submission.`;
  }
}
```

- [ ] **Step 3: Include `staffingWarning` in the JSON response**

Find the final `return res.json(...)` in the approve handler and add `staffingWarning`:

```js
return res.json({ id: updated.id, status: updated.status, emailDelivery, staffingWarning });
```

Note: When the `.ics` file is returned (staff_deployment + successful ICS generation), `staffingWarning` is not surfaced in the download response — it is only available in the JSON fallback path. This is an accepted limitation for the demo.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/requests.js
git commit -m "feat: assign staff on request approval with even-distribution"
```

---

## Task 8: Smoke test end-to-end

- [ ] **Step 1: Start the backend**

```bash
cd /home/jacoberard/agent_practice/Learning_Machines/backend
npm run dev
```

- [ ] **Step 2: Submit a staff_support request and check the response**

```bash
curl -s -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "requestorName": "Test User",
    "requestorEmail": "test@example.com",
    "requestorPhone": "801-555-0100",
    "eventName": "Health Fair Test",
    "eventDate": "2026-04-10",
    "eventCity": "Salt Lake City",
    "eventZip": "84101",
    "requestType": "staff_support",
    "estimatedAttendees": 50
  }' | jq '{status, fulfillmentRoute, staffingFeasibility: .staffingFeasibility}'
```

Expected (when Sheets not configured): `staffingFeasibility: null`, request `status` reflects AI outcome.
Expected (when Sheets configured with staff data): `staffingFeasibility: { needed: 1, freeCount: N, shortage: 0 }` or shortage flagged.

- [ ] **Step 3: Run all tests**

```bash
cd /home/jacoberard/agent_practice/Learning_Machines/backend
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: staffing feasibility check and assignment complete"
```
