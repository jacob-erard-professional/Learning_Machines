# Feature Specification: Community Health Request System

**Feature Branch**: `001-community-health-request-system`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Intermountain Healthcare Hackathon Problem Statement

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit a Community Event Request (Priority: P1)

A community organizer or partner visits the web app and fills out a structured form
to request Community Health support — either staff attendance or mailed materials —
for an upcoming event. The system validates the form intelligently, uses NLP to
classify and tag the request, and auto-routes it to the correct fulfillment pathway
(staffed event vs. mailed materials). The requestor receives immediate confirmation.

**Why this priority**: This is the core value proposition. Without a working
submission flow, nothing else in the system matters. Everything else builds on it.

**Independent Test**: Open the form, fill in required fields, submit — confirm
request appears in the admin dashboard with correct routing and tags applied.

**Acceptance Scenarios**:

1. **Given** a requestor is on the submission form, **When** they fill all required
   fields and submit, **Then** the request is saved, classified, routed, and a
   confirmation message is shown.
2. **Given** a requestor omits a required field, **When** they attempt to submit,
   **Then** inline validation fires (on blur) with a descriptive error, and submission
   is blocked.
3. **Given** a requestor enters a free-text event description, **When** the form is
   submitted, **Then** the system uses NLP/AI to extract tags and suggest a
   fulfillment pathway.
4. **Given** an event zip code is outside the Intermountain service area, **When**
   the form is submitted, **Then** the system auto-routes to mail fulfillment and
   shows a note explaining why.
5. **Given** a user completes the conversational chat intake, **When** the AI has
   extracted sufficient fields, **Then** a "Review & Submit" button appears that
   navigates to the structured form with all extracted fields pre-populated; the
   user reviews, optionally edits, and explicitly submits — the chat does NOT
   create a request directly.

---

### User Story 2 — Admin Dashboard: View, Search, and Manage Requests (Priority: P2)

A Community Health staff member logs into the admin dashboard and sees all incoming
requests in a clean, searchable, filterable list. They can view request details,
manually edit or override any field (including routing), approve events, and mark
requests as fulfilled. The dashboard surfaces demand trends and upcoming events.

**Why this priority**: Admins are the internal users who act on every submission.
Without the dashboard, requests have no visibility and can't be fulfilled.

**Independent Test**: Submit 3+ mock requests, open the dashboard — confirm all
appear, search/filter works, a request can be edited and saved, and status can
be updated.

**Acceptance Scenarios**:

1. **Given** requests exist, **When** an admin opens the dashboard, **Then** they
   see a list with key fields (requestor, date, location, type, status, routing).
2. **Given** an admin searches by requestor name or event name, **When** results
   appear, **Then** only matching requests are shown.
3. **Given** an admin opens a request, **When** they edit any field and save,
   **Then** the change is persisted and the audit trail records the override.
4. **Given** an admin approves a staffed event request, **When** they click
   "Approve", **Then** a calendar invite is created and downloadable/sendable.

---

### User Story 3 — Geographic Equity Dashboard (Priority: P3)

The admin can view a map or summary view of where requests are clustering by zip
code. The system flags geographic areas with high request volume and areas that
are being underserved. It surfaces whether staffing is being distributed equitably
across the service area.

**Why this priority**: Critical for the equity mission but can be deferred until
core request flow and admin management are stable.

**Independent Test**: Seed 10+ requests across different zip codes, open the geo
view — confirm request counts per zip are accurate and high-density areas are flagged.

**Acceptance Scenarios**:

1. **Given** requests with varied zip codes exist, **When** the admin opens the geo
   view, **Then** request counts per zip code are displayed visually.
2. **Given** a zip code has 3+ requests in a rolling 30-day window, **When** the
   dashboard loads, **Then** that zip is flagged as high-demand.
3. **Given** a zip code is in the service area, has ≥1 historical request ever, but
   zero requests in the last 30 days, **When** the dashboard loads, **Then** it is
   flagged as "underserved". ZIPs with no historical requests at all are labeled
   "inactive" and are NOT flagged as underserved.

---

### Edge Cases

- What happens when the Claude AI API is unavailable during form submission?
  → System MUST fall back to manual routing and flag the request for admin review.
- What if a requestor submits duplicate requests (same event, date, location)?
  → A duplicate is defined as: same requestor email + same event date + same zip code.
  System MUST warn the requestor with a dismissible banner before saving. The requestor
  MAY override and submit anyway (e.g., intentional re-submission after corrections).
- What if the event date is in the past?
  → Inline validation blocks submission with a clear error.
- What if the backend is unreachable during form submission or dashboard load?
  → An inline error banner appears above the affected UI with a "Try again" button.
  All form data MUST be preserved in component state — never cleared on network failure.
- What if a zip code is not found in the service area lookup table?
  → Treat as outside service area and route to mail; flag for admin awareness.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept structured event/material requests via a web form
- **FR-002**: System MUST validate all required fields inline (on blur) with descriptive errors
- **FR-003**: System MUST use AI/NLP to tag and classify requests from free-text descriptions
- **FR-004**: System MUST automatically route requests to fulfillment pathway based on zip code and request type
- **FR-005**: System MUST provide an admin dashboard with search, filter, and manual edit capabilities
- **FR-006**: System MUST support three fulfillment pathways: staff deployment, mail, pickup
- **FR-007**: System MUST generate a calendar invite (iCal format) when a staffed event is approved
- **FR-008**: System MUST display geographic demand distribution by zip code
- **FR-009**: System MUST flag zip codes as high-demand (≥3 requests/30 days) or underserved (≥1 historical request total AND 0 requests in last 30 days, in service area). ZIPs with zero historical requests are labeled "inactive" — not underserved.
- **FR-010**: System MUST allow admins to override AI-assigned routing and tags
- **FR-011**: System MUST handle Claude API failures gracefully (fallback + admin flag)
- **FR-012**: System MUST organize assets by category: materials, toolkits, behavioral reinforcements, programs
- **FR-013**: The admin dashboard at `/admin` MUST be publicly accessible with no authentication required (demo environment). Production deployment would add authentication; this MUST be documented in README.

### Key Entities

- **Request**: Core entity — a submitted event/material request with all form data, routing, status, and tags
- **Requestor**: Contact info embedded in the request (no auth required for submission)
- **ServiceArea**: Lookup of zip codes considered within Intermountain's service area
- **FulfillmentRoute**: Enum — `staff_deployment` | `mail` | `pickup`
- **RequestStatus**: Enum — `pending` | `approved` | `fulfilled` | `rejected` | `needs_review`
- **AssetCategory**: Enum — `materials` | `toolkits` | `behavioral_reinforcements` | `programs`
- **AuditEntry**: Log of admin edits/overrides on a request

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A requestor can submit a complete event request in under 3 minutes
- **SC-002**: AI tagging and routing decision is returned within 3 seconds of submission
- **SC-003**: Admin can find any request in the dashboard in under 30 seconds using search
- **SC-004**: 100% of requests have a routing decision (AI or manual fallback) — none left unclassified
- **SC-005**: Geographic equity view accurately reflects zip code distribution within 1 minute of new submissions
- **SC-006**: All forms and dashboard views pass WCAG 2.1 AA automated accessibility scan

## Clarifications

### Session 2026-03-21

- Q: How do admins access the admin dashboard? → A: No authentication — `/admin` is open (demo-safe); README documents that production would add auth (e.g., JWT or SSO).
- Q: What is the outcome of the conversational chat intake? → A: Chat extracts fields and pre-fills the structured form; user reviews all fields and explicitly clicks Submit — the chat does not create a request directly.
- Q: What defines a duplicate request? → A: Same requestor email + event date + zip code. System warns the user before saving but allows override if they confirm.
- Q: What defines an "underserved" ZIP in the equity view? → A: A ZIP that has ≥1 historical request total (ever) but 0 requests in the last 30 days. ZIPs with no history at all are "inactive" (not flagged). This prevents false positives at system launch.
- Q: What should the frontend do when the backend is unreachable (network error)? → A: Show an inline error banner above the form/dashboard with a "Try again" button. Form data MUST be preserved — never cleared on network failure.

## Constitution Compliance *(mandatory)*

Per `.specify/memory/constitution.md`:

- **Accessibility**: All form fields have visible labels and ARIA attributes; keyboard
  navigation throughout; color contrast meets AA; error messages are descriptive and
  screen-reader announced via aria-live regions
- **Testing**: Unit tests for routing logic and zip code lookup; integration tests for
  all API endpoints; component tests for form validation and dashboard interactions
- **Documentation**: JSDoc on all route handlers, service functions, and React
  components; README updated after each sprint checkpoint; inline comments on all
  AI integration and geo logic
