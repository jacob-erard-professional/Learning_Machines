# Staff Feasibility Check — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Problem

The system currently routes `staff_support` requests to `staff_deployment` without knowing whether Intermountain has enough available staff to actually attend the event. Staff availability is tracked in a Google Sheet ("Staff" tab) that is now being maintained alongside the existing requests sheet.

---

## Goal

When a `staff_deployment` request is submitted, automatically determine whether sufficient staff are available on the event date. If not, flag the request for admin review and send an alert email. When the request is approved, assign specific staff to it using an even-distribution algorithm so no individual is overloaded.

---

## Staff Data Schema

The "Staff" sheet contains one employee per row with the following columns:

| Column | Type | Notes |
|---|---|---|
| `staffId` | string | Unique identifier (e.g. `STF-59101-001`) |
| `zipCode` | string | Staff member's home zip |
| `name` | string | Full name |
| `email` | string | Contact email |
| `phone` | string | Contact phone |
| `role` | string | E.g. `Wellness Ambassador` |
| `certifications` | string | Semicolon-separated list |
| `availableWeekdays` | string | Semicolon-separated day names |
| `active` | string | `"TRUE"` or `"FALSE"` |
| `yearsExperience` | number | Integer |

In memory, staff objects are normalized to:

```js
{
  staffId: 'STF-59101-001',
  zipCode: '59101',
  name: 'Richard Clark',
  email: 'richard.clark95@gmail.com',
  phone: '(406) 555-4010',
  role: 'Wellness Ambassador',
  certifications: ['CPR Certified'],
  availableWeekdays: ['Saturday', 'Sunday', 'Thursday', 'Friday', 'Tuesday'],
  active: true,
  yearsExperience: 10
}
```

**The Staff sheet is read-only.** Staff data is loaded from Google Sheets but never written back. It is excluded from `saveStateToGoogleSheets` — only `requests` and `adminOverrides` are persisted.

---

## Feasibility Rule

```
staffNeeded = Math.ceil(estimatedAttendees / 100)
```

If `estimatedAttendees` is null or 0, assume `staffNeeded = 1`.

A request is **feasible** when the number of free staff on the event date is ≥ `staffNeeded`.

---

## Architecture

### 1. Data Layer — `googleSheetsStore.js` + `store.js`

**`googleSheetsStore.js`** gains one new function:

`loadStaffFromGoogleSheets()` — reads the "Staff" sheet tab, parses each row into a normalized staff object (semicolons split to arrays, `"TRUE"`/`"FALSE"` cast to boolean), returns `{ staff: StaffMember[] }`.

**`store.js`** owns all in-memory state, following the existing pattern:

- Add a module-level `let staff = []` array (parallel to `requests` and `adminOverrides`)
- Export `getStaff()` returning a shallow copy of `staff`
- In `initializeStore()`: call `loadStaffFromGoogleSheets()` when Sheets is configured and populate `staff`
- In `refreshStoreFromSource()`: re-load staff alongside requests
- `queuePersist()` / `saveStateToGoogleSheets()`: no change — staff is never written back

`getStaff()` is imported by `staffService.js`, not by routes or other services directly.

### 2. Staff Service — `backend/src/services/staffService.js` (new file)

**`getAvailableStaff(eventDate)`**
- Derives day-of-week using UTC methods: `new Date(eventDate + 'T00:00:00Z').getUTCDay()`, mapped to the day name string (`['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]`)
- Filters staff: `active === true` AND derived day name is in `availableWeekdays`
- Finds all approved requests (`status === 'approved'`) with `eventDate === eventDate` and collects their `assignedStaff[].staffId` values into a Set
- Removes any staff whose `staffId` is in that Set
- Returns the remaining free staff array

**Known limitation:** If a request is approved (staff assigned), then placed back on hold via the `/hold` endpoint, the `assignedStaff` array remains on the request object and those staff members will appear unavailable. Cancellation/unassignment is out of scope for this release; admins should be aware of this edge case.

**`checkStaffFeasibility(eventDate, estimatedAttendees)`**
- Calls `getAvailableStaff(eventDate)`
- Computes `needed = Math.ceil((estimatedAttendees || 1) / 100)`
- Returns:
  ```js
  { feasible: boolean, needed: number, freeCount: number, shortage: number }
  ```

**`assignStaffToRequest(requestId, eventDate, needed)`**
- Calls `getAvailableStaff(eventDate)`
- Counts how many events each free staff member is assigned to across **all requests with status in `['pending', 'needs_review', 'approved', 'fulfilled']`** (i.e., all statuses except `rejected`). Staff who have been in the system longest may accumulate more assignments over time — this is an accepted tradeoff of the global-count approach; no rolling window is applied.
- Sorts free staff ascending by that count (fewest assignments first)
- Selects top `needed` staff
- Calls `updateRequest(requestId, { assignedStaff: [{ staffId, name, email, role }] })`
- Returns the assigned staff array. If fewer than `needed` are available (edge case), returns what it can — the caller adds a warning.

### 3. Enums — `enums.js`

Add a `StaffingFlag` enum:

```js
export const StaffingFlag = Object.freeze({
  INSUFFICIENT_STAFF: 'insufficient_staff',
  NO_STAFF_DATA: 'no_staff_data',
});
```

### 4. Request Service — `requestService.js`

After deterministic routing, if `route === STAFF_DEPLOYMENT`:
1. Call `checkStaffFeasibility(eventDate, estimatedAttendees)`
2. Store the result on the request as `staffingFeasibility: { needed, freeCount, shortage }`
3. If `!feasible`:
   - Override status to `NEEDS_REVIEW`
   - Set `staffingFlag: StaffingFlag.INSUFFICIENT_STAFF`
   - Call `sendAdminAlert(requestData, feasibilityResult)` (see Mailer section)
4. If staff data is empty (Google Sheets not configured or Staff sheet missing/malformed):
   - Set `staffingFlag: StaffingFlag.NO_STAFF_DATA`
   - Override status to `NEEDS_REVIEW`
   - Skip alert email

**Staff is not assigned at submission** — only at approval. This prevents locking staff to requests that may never be approved.

### 5. Approve Route — `routes/requests.js`

After setting status to `APPROVED`, if `fulfillmentRoute === STAFF_DEPLOYMENT`:
1. Read `needed` from the stored `request.staffingFeasibility.needed` (computed and persisted at submission time). If not present, recompute from `estimatedAttendees`.
2. Call `assignStaffToRequest(id, eventDate, needed)`
3. If the returned array length < `needed` (capacity changed since submission), set `staffingWarning: 'Partial staff assigned — capacity changed since submission'` in the JSON response.

**Handling the `.ics` response:** The approve route currently streams an `.ics` file as the response body for staff deployment requests. When staff assignment produces a `staffingWarning`, the route falls through to the JSON response path instead of streaming `.ics`. This means `staffingWarning` is only surfaced in the JSON body, not as a header on the file download — this is acceptable for the demo.

### 6. Mailer — `mailer.js`

Add `sendAdminAlert(request, feasibilityResult)`:
- `request` is the full request object; `feasibilityResult` is `{ needed, freeCount, shortage }`
- Sends to `erardjacob@gmail.com` (hardcoded for demo)
- Constructs the subject/body internally — callers do not format the message
- Uses the existing `getAuthorizedOAuthClient()` and `buildRawMessage()` infrastructure
- Falls back gracefully (logs, returns `{ status: 'disabled' }`) if OAuth not connected

Alert body includes: Request ID, event name, event date, city, attendees expected, staff needed, staff free, shortage count.

---

## Request Object Additions

```js
{
  // existing fields...
  assignedStaff: [           // set at approval time; empty array before approval
    { staffId, name, email, role }
  ],
  staffingFlag: 'insufficient_staff' | 'no_staff_data' | null,
  staffingFeasibility: {     // set at submission time for staff_deployment routes
    needed: number,
    freeCount: number,
    shortage: number
  }
}
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Google Sheets not configured | `getStaff()` returns empty array; all `staff_deployment` requests flagged `needs_review` with `staffingFlag: 'no_staff_data'`; alert email skipped |
| Staff sheet missing or malformed | Log error, treat as empty staff list; same as above |
| Gmail OAuth not connected | Alert skipped, warning logged; request still saved and flagged |
| `estimatedAttendees` missing | Assume `needed = 1` |
| Capacity changes between submission and approval | Partial assignment returned with `staffingWarning` in JSON response |
| Approved request placed back on hold | `assignedStaff` remains on request; those staff appear unavailable (known limitation, out of scope) |

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/data/googleSheetsStore.js` | Add `loadStaffFromGoogleSheets()` |
| `backend/src/data/store.js` | Add module-level `staff` array; export `getStaff()`; call `loadStaffFromGoogleSheets()` in `initializeStore()` and `refreshStoreFromSource()` |
| `backend/src/lib/enums.js` | Add `StaffingFlag` enum |
| `backend/src/services/staffService.js` | **New** — `getAvailableStaff`, `checkStaffFeasibility`, `assignStaffToRequest` |
| `backend/src/services/requestService.js` | Call feasibility check after routing; persist `staffingFeasibility`; set flag + alert on shortage |
| `backend/src/routes/requests.js` | Call `assignStaffToRequest` on approval for `staff_deployment`; add `staffingWarning` to JSON response when partial |
| `backend/src/lib/mailer.js` | Add `sendAdminAlert(request, feasibilityResult)` |

---

## Out of Scope

- Staff preference/proximity matching by zip code
- Staff notification emails (only admin is alerted)
- Frontend display of `assignedStaff` (data is on the request object; UI wiring is a separate task)
- Cancellation / unassignment of staff when a request is rejected or held after approval
- Rolling-window assignment counts (global lifetime count is used for even distribution)
