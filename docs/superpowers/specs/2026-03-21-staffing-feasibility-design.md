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

---

## Feasibility Rule

```
staffNeeded = Math.ceil(estimatedAttendees / 100)
```

If `estimatedAttendees` is null or 0, assume `staffNeeded = 1`.

A request is **feasible** when the number of free staff on the event date is ≥ `staffNeeded`.

---

## Architecture

### 1. Data Layer — `googleSheetsStore.js`

Add `loadStaffFromGoogleSheets()`:
- Reads the "Staff" sheet tab by name
- Parses each row into a normalized staff object (semicolons split to arrays, `"TRUE"`/`"FALSE"` cast to boolean)
- Returns `{ staff: StaffMember[] }`

Add `getStaff()` / in-memory staff array alongside the existing `requests` array. Staff is loaded on server startup via `initializeStore()` and can be refreshed on demand.

### 2. Staff Service — `backend/src/services/staffService.js` (new file)

**`getAvailableStaff(eventDate)`**
- Derives day-of-week from `eventDate` (e.g. `"2026-03-26"` → `"Thursday"`)
- Filters the in-memory staff list: `active === true` AND day is in `availableWeekdays`
- Removes any staff whose `staffId` appears in `assignedStaff` of an **approved** request on the same calendar date
- Returns the free staff array

**`checkStaffFeasibility(eventDate, estimatedAttendees)`**
- Calls `getAvailableStaff(eventDate)`
- Computes `needed = Math.ceil((estimatedAttendees || 1) / 100)`
- Returns:
  ```js
  { feasible: boolean, needed: number, freeCount: number, shortage: number }
  ```

**`assignStaffToRequest(requestId, eventDate, needed)`**
- Calls `getAvailableStaff(eventDate)`
- Sorts free staff by ascending count of total assignments across all non-rejected requests (even distribution)
- Selects top `needed` staff
- Calls `updateRequest(requestId, { assignedStaff: [...] })`
- Returns the assigned staff array (or an empty array with a warning if capacity changed since submission)

### 3. Request Service — `requestService.js`

After deterministic routing, if `route === STAFF_DEPLOYMENT`:
1. Call `checkStaffFeasibility(eventDate, estimatedAttendees)`
2. If `!feasible`:
   - Override status to `NEEDS_REVIEW`
   - Add `staffingFlag: 'insufficient_staff'` to the request object
   - Add `staffingFeasibility: { needed, freeCount, shortage }` for admin visibility
   - Call `sendAdminAlert(...)` with event details
3. If `feasible`:
   - Add `staffingFeasibility: { needed, freeCount, shortage: 0 }` for visibility
   - Normal status flow continues

**Staff is not assigned at submission** — only at approval. This prevents locking staff to requests that may never be approved.

### 4. Approve Route — `routes/requests.js`

After setting status to `APPROVED`, if `fulfillmentRoute === STAFF_DEPLOYMENT`:
1. Call `assignStaffToRequest(id, eventDate, needed)`
2. If the assignment array is shorter than `needed` (edge case: capacity changed):
   - Include `staffingWarning: 'Partial staff assigned — capacity changed since submission'` in response
   - Still approve; admin is informed via response payload
3. `assignedStaff` is persisted on the request via `updateRequest`

### 5. Mailer — `mailer.js`

Add `sendAdminAlert(subject, body)`:
- Sends to `erardjacob@gmail.com` (hardcoded for demo)
- Uses the existing Gmail OAuth client (`getAuthorizedOAuthClient`)
- Falls back gracefully (logs, returns `{ status: 'disabled' }`) if OAuth not connected
- Alert body includes: Request ID, event name, event date, attendees expected, staff needed, staff free

---

## Request Object Additions

```js
{
  // existing fields...
  assignedStaff: [
    { staffId, name, email, role }
  ],
  staffingFlag: 'insufficient_staff' | null,
  staffingFeasibility: {
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
| Google Sheets not configured | Staff list is empty; all staff_deployment requests flagged as `needs_review` with `staffingFlag: 'no_staff_data'` |
| Staff sheet missing/malformed | Log error, treat as empty staff list |
| Gmail OAuth not connected | Alert skipped, logs warning; request still saved and flagged |
| `estimatedAttendees` missing | Assume 1 staff needed |
| Capacity changes between submission and approval | Partial assignment returned with warning in API response |

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/data/googleSheetsStore.js` | Add `loadStaffFromGoogleSheets()`, in-memory staff array, `getStaff()` |
| `backend/src/services/staffService.js` | **New** — feasibility check + staff assignment logic |
| `backend/src/services/requestService.js` | Call feasibility check after routing; set flag + alert on shortage |
| `backend/src/routes/requests.js` | Call `assignStaffToRequest` on approval for staff_deployment requests |
| `backend/src/lib/mailer.js` | Add `sendAdminAlert(subject, body)` |

---

## Out of Scope

- Staff preference/proximity matching by zip code
- Staff notification emails (only admin is alerted)
- Frontend display of `assignedStaff` (data is on the request object; UI wiring is a separate task)
- Cancellation / unassignment of staff when a request is rejected after approval
