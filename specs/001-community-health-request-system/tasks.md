---
description: "Task list for Community Health AI Request Management System"
---

# Tasks: Community Health AI Request Management System

**Input**: Design documents from `/specs/001-community-health-request-system/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Mandatory per Constitution Principle III. Unit + integration + component
tests required. Write tests before or alongside implementation.

**Organization**: Tasks grouped by user story. Each story is independently deployable
and demonstrable. Follows the 50-step end-to-end flow document.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: US1–US5 maps to the 5 phases below
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Scaffold both projects, install all dependencies, establish shared tooling.

- [ ] T001 Initialize backend project: `cd backend && npm init -y && npm pkg set type=module engines.node=">=18"`
- [ ] T002 [P] Install backend dependencies: `npm i express cors dotenv @anthropic-ai/sdk ics uuid` in `backend/`
- [ ] T003 [P] Install backend dev dependencies: `npm i -D vitest supertest` in `backend/`
- [ ] T004 Initialize frontend project: `npm create vite@latest frontend -- --template react` from repo root
- [ ] T005 [P] Install frontend dependencies: `npm i react-router-dom zustand recharts` in `frontend/`
- [ ] T006 [P] Install frontend dev dependencies: `npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom` in `frontend/`
- [ ] T007 Create `backend/` directory structure: `src/routes/`, `src/services/`, `src/lib/`, `src/data/`, `tests/unit/`, `tests/integration/`
- [ ] T008 [P] Create `frontend/src/` directory structure: `components/ui/`, `pages/`, `hooks/`, `lib/`, `data/`
- [ ] T009 Configure Vitest for backend in `backend/package.json` — add `"test": "vitest run"` and `"test:watch": "vitest"` scripts
- [ ] T010 [P] Configure Vitest for frontend in `frontend/vite.config.js` — add `test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.js' }`
- [ ] T011 Create `frontend/src/setupTests.js` — import `@testing-library/jest-dom/vitest` and `afterEach(cleanup)`
- [ ] T012 [P] Create `backend/.env.example` with `PORT=3001`, `ANTHROPIC_API_KEY=`, `NODE_ENV=development`
- [ ] T013 [P] Create `frontend/.env.example` with `VITE_API_BASE_URL=http://localhost:3001`
- [ ] T014 Create root `README.md` with project overview, setup steps, and team branch assignments
- [ ] T015 [P] Add `backend/.env` and `frontend/.env` to `.gitignore`
- [ ] T016 Configure Tailwind CSS in `frontend/` — run `npx tailwindcss init -p`, update `tailwind.config.js` content paths, add directives to `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that ALL user stories depend on. No US work
starts until this phase is complete.

**⚠️ CRITICAL**: These tasks block all user story phases.

- [ ] T017 Create `backend/src/lib/enums.js` — export `FulfillmentRoute`, `RequestStatus`, `AssetCategory`, `RequestType`, `Priority`, `UrgencyLevel` as frozen objects
- [ ] T018 [P] Create `backend/src/data/store.js` — in-memory Request array with `getAllRequests()`, `getRequestById()`, `saveRequest()`, `updateRequest()`, `deleteRequest()`, `getAdminMemory()`, `saveAdminOverride()` exports
- [ ] T019 [P] Create `backend/src/data/serviceAreaZips.js` — export `SERVICE_AREA_ZIPS` (Set of ~20k zip codes for UT, ID, NV, WY, MT, CO, KS from SimpleMaps free CSV) and `isInServiceArea(zip)` helper
- [ ] T020 Create `backend/src/lib/validate.js` — export `validateRequest(body)` that checks required fields, future date, 5-digit zip, valid email, valid request type; returns `{ valid: boolean, errors: Record<string, string> }`
- [ ] T021 [P] Create `backend/src/app.js` — create and export Express app with JSON body parsing, CORS (`cors()`), and mount route stubs; do NOT call `app.listen()` here (Supertest needs the export)
- [ ] T022 Create `backend/src/server.js` — import app from `app.js`, call `app.listen(process.env.PORT || 3001)` with startup log
- [ ] T023 [P] Create `frontend/src/lib/api.js` — typed fetch wrapper with base URL from `VITE_API_BASE_URL`; export `post(path, body)`, `get(path, params)`, `patch(path, body)` that throw on non-2xx with parsed error body
- [ ] T024 [P] Create `frontend/src/components/ui/Button.jsx` — variants: `primary`, `secondary`, `danger`; props: `variant`, `size`, `disabled`, `loading`, `onClick`, `type`, `ariaLabel`; loading state shows spinner with `aria-busy`; focus ring always visible
- [ ] T025 [P] Create `frontend/src/components/ui/StatusBadge.jsx` — maps `RequestStatus` enum to label + color (no color-only meaning); includes `aria-label="Status: {status}"`
- [ ] T026 [P] Create `frontend/src/components/ui/Card.jsx` — reusable wrapper with padding, border-radius, subtle shadow; props: `children`, `className`
- [ ] T027 [P] Create `frontend/src/components/ui/LoadingSpinner.jsx` — accessible spinner with `role="status"` and `aria-label="Loading"`
- [ ] T028 [P] Create `frontend/src/data/mockRequests.js` — 10 realistic mock Request objects covering all statuses, fulfillment routes, zip codes inside/outside service area; used for UI dev before API wiring
- [ ] T029 Create `frontend/src/App.jsx` — React Router routes: `/` (SubmitPage), `/chat` (ChatIntakePage), `/admin` (AdminDashboard), `/admin/geo` (GeoEquityView), `/admin/analytics` (AnalyticsDashboard), `/admin/simulate` (SimulationPage)
- [ ] T030 [P] Create `frontend/src/components/AppShell.jsx` — nav header with Intermountain Healthcare branding (blue/teal palette), links to all routes, mobile-responsive hamburger menu; all nav items keyboard accessible

**Checkpoint**: Foundation ready. Start US1–US5 in parallel (by team member).

---

## Phase 3: US1 — Smart Request Intake (Priority: P1) 🎯 MVP

**Goal**: Users can submit a request via structured form OR conversational chat.
AI processes the submission, extracts data, classifies, tags, assigns impact score,
and returns explainable routing decision with confidence score.
Maps to Steps 1–12 of the flow document.

**Independent Test**: Submit a form with valid data → see confirmation card showing
AI tags, routing decision, confidence score, and reasoning. Submit via chat with
"We're hosting a school health fair for 200 kids in Salt Lake City" → see same
confirmation with extracted fields pre-populated.

### AI Layer — Intake Agent, Decision Agent, Planning Agent

- [ ] T031 [US1] Create `backend/src/lib/ai.js` — export three agent functions:
  `runIntakeAgent(rawInput)`, `runDecisionAgent(structuredRequest)`,
  `runPlanningAgent(classifiedRequest)`; each makes a single Claude API call with
  its own system prompt; wrap all calls in try/catch with graceful fallback object
- [ ] T032 [US1] Implement `runIntakeAgent(rawInput)` in `backend/src/lib/ai.js` —
  system prompt extracts: eventType, audience, estimatedAttendees, city, zip,
  materialNeeds, eventName from free text; returns structured JSON; few-shot prompt
  with 3 healthcare examples; forces JSON output; 8-second timeout
- [ ] T033 [US1] Implement `runDecisionAgent(structuredRequest)` in `backend/src/lib/ai.js` —
  system prompt classifies fulfillment (staff/mail/pickup), assigns tags (program
  category, material type, urgency, geographic cluster), detects intent mismatch or
  anomalies, calculates impactScore (0–100), assigns priority (high/medium/low),
  returns reasoning string and confidenceScore (0–1); forces JSON output
- [ ] T034 [US1] Implement `runPlanningAgent(classifiedRequest)` in `backend/src/lib/ai.js` —
  system prompt recommends staffing count, materials list, logistics notes, and flags
  unrealistic values; returns `{ staffingRecommendation, recommendedMaterials, logisticsNotes, flags }`
- [ ] T035 [US1] Create `backend/src/lib/calendar.js` — export `generateIcsFile(request)`
  using the `ics` npm package; returns `.ics` string for approved staff events with
  title, date, location, organizer set from request fields

### Backend — Request Submission Endpoint

- [ ] T036 [US1] Create `backend/src/services/requestService.js` — export `createRequest(body)`:
  validates input, runs all 3 AI agents in sequence, applies deterministic routing
  override (outside service area → mail regardless of AI), computes final status,
  stores in `store.js`, returns full enriched request object
- [ ] T037 [US1] Create `backend/src/services/routingService.js` — export `determineRoute(requestType, zip, estimatedAttendees, eventDate)`:
  applies rules from data-model.md (service area check, event size, urgency by
  days-until-event); returns `{ route, routingReason, priority, urgency }`
- [ ] T038 [US1] Create `backend/src/routes/requests.js` — mount on `/api/requests`;
  implement `POST /` handler: calls `requestService.createRequest(req.body)`,
  returns 201 with enriched request; returns 400 for validation errors; returns
  200 with `aiStatus: "failed"` payload on AI failure (never 500 for AI errors)
- [ ] T039 [US1] Mount `requests.js` router in `backend/src/app.js` at `/api/requests`

### Frontend — Structured Form

- [ ] T040 [US1] Create `frontend/src/pages/SubmitPage.jsx` — renders landing with
  two entry options: "Submit Request Form" and "Chat with AI Assistant"; Intermountain
  Healthcare header; accessible, mobile-responsive layout
- [ ] T041 [US1] Create `frontend/src/components/RequestForm.jsx` — multi-section form
  with all required + optional fields from data-model.md; dropdowns for requestType
  (not free text); date picker that blocks past dates; ZIP field with 5-digit
  validation on blur; all fields have visible labels with `*` for required and
  `aria-required="true"`; inline errors appear below each field with `role="alert"`
- [ ] T042 [US1] Implement form submit handler in `frontend/src/components/RequestForm.jsx` —
  calls `api.post('/api/requests', formData)`; shows loading spinner during AI
  processing; on success renders `<ConfirmationCard />`; on error shows error banner
- [ ] T043 [US1] Create `frontend/src/components/ConfirmationCard.jsx` — displays:
  request ID, fulfillment route with icon, AI tags as chips, impact score (0–100
  with color gradient), confidence score as percentage, AI reasoning text in an
  expandable "Why this decision?" section; all fields ARIA-labeled

### Frontend — Conversational Chat Intake

- [ ] T044 [US1] Create `frontend/src/pages/ChatIntakePage.jsx` — chat interface with
  message history, user input box, send button; displays Intermountain Healthcare
  branding; shows "AI is thinking..." indicator while awaiting response; keyboard
  accessible (Enter to send, Escape to clear)
- [ ] T045 [US1] Create `backend/src/routes/chat.js` — mount on `/api/chat`;
  implement `POST /` handler: accepts `{ message, history }`, calls `runIntakeAgent(message)`
  to extract structured data, returns `{ reply: string, extractedFields: object }`;
  if all required fields are present returns `{ ready: true, prefillData: object }`
  to signal frontend to auto-populate the form
- [ ] T046 [US1] Mount `chat.js` router in `backend/src/app.js` at `/api/chat`
- [ ] T047 [US1] Implement chat logic in `frontend/src/pages/ChatIntakePage.jsx` —
  each AI response shows extracted fields inline ("I got: Event: Senior Health Fair,
  ZIP: 84101"); when `ready: true` show "Review and Submit" button that navigates
  to `/` with prefill data passed via router state

### Tests — US1

- [ ] T048 [P] [US1] Unit test `backend/src/lib/validate.js` in `backend/tests/unit/validate.test.js` —
  test required field missing, past date rejection, invalid ZIP, valid submission
- [ ] T049 [P] [US1] Unit test `backend/src/services/routingService.js` in
  `backend/tests/unit/routingService.test.js` — test in-area/out-area, large event
  priority, urgent-date logic, all three fulfillment routes
- [ ] T050 [P] [US1] Integration test `POST /api/requests` in `backend/tests/integration/requests.test.js` —
  mock `ai.js` with `vi.mock()`; test: valid submission returns 201 with routing,
  missing required field returns 400, AI failure returns 200 with needs_review status
- [ ] T051 [P] [US1] Component test `frontend/src/components/RequestForm.jsx` in
  `frontend/tests/components/RequestForm.test.jsx` — test: required field errors
  appear on blur, past date blocked, form submits with valid data, loading state shown

**Checkpoint**: US1 complete. End-to-end intake + AI processing demo-ready.

---

## Phase 4: US2 — Ticket Queue + Admin System (Priority: P2)

**Goal**: Admins see all requests in a real-time ticket queue with search, filter,
sort. Can open any ticket for full detail, edit any field, override AI decisions,
approve/reject/hold. AI Copilot sidebar answers natural language admin questions.
AI Memory shows behavioral patterns from past overrides.
Maps to Steps 13–21 of the flow document.

**Independent Test**: With 5+ seeded requests open `/admin` → list appears with
status badges, priority indicators, AI tags. Search "Salt Lake" → filtered. Click
a ticket → detail panel opens. Change routing → save → audit entry appears.
Ask copilot "What should I prioritize?" → receives ranked list with reasoning.

### Backend — Admin Endpoints

- [ ] T052 [US2] Add `GET /` handler to `backend/src/routes/requests.js` — supports
  query params: `search`, `status`, `route`, `priority`, `zip`, `dateFrom`, `dateTo`,
  `sortBy` (createdAt/eventDate/priority/impactScore), `sortDir`; all filtering done
  in-memory using `store.js`; returns `{ total, results }` per api.md contract
- [ ] T053 [US2] Add `GET /:id` handler to `backend/src/routes/requests.js` — returns
  full request object including `auditLog[]` and all AI fields; 404 if not found
- [ ] T054 [US2] Add `PATCH /:id` handler to `backend/src/routes/requests.js` —
  accepts partial updates; records an `AuditEntry` for every changed field with
  `{ timestamp, field, oldValue, newValue, note }`; saves override to `store.js`
  admin memory if fulfillmentRoute or status was changed
- [ ] T055 [US2] Add `POST /:id/approve` handler to `backend/src/routes/requests.js` —
  sets status to `approved`; if route is `staff_deployment` calls `generateIcsFile()`
  and returns .ics as `text/calendar` attachment; else returns JSON `{ status: 'approved' }`
- [ ] T056 [US2] Add `POST /:id/reject` and `POST /:id/hold` handlers to
  `backend/src/routes/requests.js` — set status accordingly, require `{ reason }` in body
- [ ] T057 [US2] Create `backend/src/routes/copilot.js` — mount on `/api/copilot`;
  `POST /query` accepts `{ question, context }` where context is summary stats;
  calls Claude API with admin copilot system prompt that knows all current requests;
  returns `{ answer, suggestions: string[] }`; mount in `app.js`
- [ ] T058 [US2] Implement admin memory logic in `backend/src/data/store.js` —
  `saveAdminOverride(requestId, field, oldVal, newVal)` appends to a memory log;
  `getAdminPatterns()` returns frequency analysis: most common override type,
  most overridden zip codes, average confidence when overriding; used by copilot

### Frontend — Ticket Queue

- [ ] T059 [US2] Create `frontend/src/pages/AdminDashboard.jsx` — two-panel layout:
  left panel = `<TicketQueue />`, right panel = `<RequestDetail />` (hidden until
  ticket selected); persistent `<CopilotSidebar />` button in top-right corner
- [ ] T060 [US2] Create `frontend/src/components/TicketQueue.jsx` — renders list of
  `<TicketRow />` components; includes `<FilterBar />` above; fetches from
  `GET /api/requests` with current filter state; auto-refreshes every 30 seconds;
  shows total count and "last updated" timestamp
- [ ] T061 [US2] Create `frontend/src/components/TicketRow.jsx` — single row showing:
  request ID, event name, date, city, priority badge, status badge, fulfillment
  route icon, impact score bar (0–100); entire row is keyboard-focusable; clicking
  or pressing Enter selects the ticket
- [ ] T062 [US2] Create `frontend/src/components/FilterBar.jsx` — search input
  (debounced 300ms), status dropdown, route dropdown, priority dropdown, date range
  inputs, sort-by select; all changes update URL query params via React Router for
  shareable filter state; clear all button resets filters
- [ ] T063 [US2] Create `frontend/src/hooks/useRequests.js` — Zustand store managing
  `{ requests, total, filters, selectedId, loading, error }`; actions:
  `setFilter(key, value)`, `selectRequest(id)`, `refreshRequests()`,
  `updateLocalRequest(id, patch)` (optimistic update before PATCH response)

### Frontend — Request Detail + Admin Controls

- [ ] T064 [US2] Create `frontend/src/components/RequestDetail.jsx` — tabbed panel:
  "Overview" (all form fields, editable), "AI Insights" (tags, confidence, reasoning,
  impact score, planning recommendations), "Audit Log" (chronological list of all
  changes); Save button calls `PATCH /api/requests/:id`; shows success toast on save
- [ ] T065 [US2] Implement edit mode in `frontend/src/components/RequestDetail.jsx` —
  all fields render as inputs with current values; fulfillment route is a dropdown
  not a locked field; status has explicit action buttons (Approve / Reject / Hold)
  each requiring a reason note; "Are you sure?" confirmation modal appears when
  overriding an AI decision with confidence > 0.8
- [ ] T066 [US2] Create `frontend/src/components/AiInsightsPanel.jsx` — renders:
  confidence score as a circular gauge (0–100%), impact score with color gradient
  (green low → amber medium → red high), AI tags as chips, reasoning in an
  expandable block, planning agent recommendations as a bulleted list, anomaly/fraud
  flags as warning banners if present
- [ ] T067 [US2] Create `frontend/src/components/AuditLogPanel.jsx` — renders
  `auditLog[]` as a timeline; each entry shows: timestamp, field changed, old→new
  values, admin note; empty state shows "No changes recorded yet"

### Frontend — AI Copilot Sidebar

- [ ] T068 [US2] Create `frontend/src/components/CopilotSidebar.jsx` — slide-in panel
  from the right; chat interface with message history; pre-loaded suggestion chips:
  "What should I prioritize?", "Summarize this week", "Where is demand highest?",
  "Show underserved regions"; calls `POST /api/copilot/query`; shows typing indicator;
  response includes clickable suggestions to jump to filtered queue views
- [ ] T069 [US2] Implement AI Memory display in `frontend/src/components/CopilotSidebar.jsx` —
  on open, calls `GET /api/analytics/admin-patterns` and shows memory summary:
  "You've overridden mail→staff 7 times for rural Utah events", "Your average
  approval time is 4 hours"; framed as behavioral insights, not surveillance

### Tests — US2

- [ ] T070 [P] [US2] Integration test admin endpoints in `backend/tests/integration/requests.test.js` —
  test GET with filters, PATCH creates audit entry, approve returns .ics for staff events
- [ ] T071 [P] [US2] Component test `frontend/src/components/TicketRow.jsx` in
  `frontend/tests/components/TicketRow.test.jsx` — renders priority/status badges,
  keyboard selection works, impact score bar renders
- [ ] T072 [P] [US2] Component test `frontend/src/components/RequestDetail.jsx` in
  `frontend/tests/components/RequestDetail.test.jsx` — edit mode toggles, save calls
  PATCH, confirmation modal appears on high-confidence AI override

**Checkpoint**: US2 complete. Admin can manage full queue, override AI, use copilot.

---

## Phase 5: US3 — Geographic Equity + Analytics Dashboard (Priority: P3)

**Goal**: Admins see geographic demand by ZIP code with equity flags. Analytics
dashboard shows demand trends, program usage, staffing needs over time.
Predictive analytics surfaces forecast demand and staffing gaps.
Maps to Steps 22–35 of the flow document.

**Independent Test**: Seed requests across 10+ zip codes. Open `/admin/geo` →
table shows per-zip counts, high-demand flags (amber), underserved flags (blue).
Open `/admin/analytics` → bar chart shows weekly demand trend; status breakdown
pie chart renders; predictive forecast appears at bottom.

### Backend — Analytics Endpoints

- [ ] T073 [US3] Create `backend/src/routes/analytics.js` — mount on `/api/analytics`; mount in `app.js`
- [ ] T074 [US3] Implement `GET /api/analytics/geo` in `backend/src/routes/analytics.js` —
  groups all requests by ZIP; for each ZIP computes: requestCount30d, totalRequestCount,
  isInServiceArea, city (from a small static lookup), flag ("high_demand" if ≥3/30d,
  "underserved" if 0/30d and in service area, else null); returns sorted by
  requestCount30d desc per api.md contract
- [ ] T075 [US3] Implement `GET /api/analytics/trends` in `backend/src/routes/analytics.js` —
  accepts `groupBy` (day/week/month) and `weeks` params; buckets requests by time
  period and fulfillment route; returns `{ labels, series }` per api.md contract
- [ ] T076 [US3] Implement `GET /api/analytics/upcoming` in `backend/src/routes/analytics.js` —
  returns approved staff_deployment requests with eventDate within next 30 days,
  sorted by eventDate asc; per api.md contract
- [ ] T077 [US3] Implement `GET /api/analytics/summary` in `backend/src/routes/analytics.js` —
  returns: `{ totalRequests, byStatus, byRoute, byPriority, avgImpactScore, avgConfidence }`
  for real-time metrics cards on the dashboard
- [ ] T078 [US3] Implement `GET /api/analytics/admin-patterns` in `backend/src/routes/analytics.js` —
  calls `store.getAdminPatterns()` and returns behavioral summary for copilot memory display
- [ ] T079 [US3] Implement `GET /api/analytics/predict` in `backend/src/routes/analytics.js` —
  calls Claude API with last 8 weeks of trend data and asks for demand forecast for
  next 4 weeks by route type; returns `{ forecast: [{ week, staffPredicted, mailPredicted }] }`

### Frontend — Geographic Equity View

- [ ] T080 [US3] Create `frontend/src/pages/GeoEquityView.jsx` — page with: summary
  stats bar (total in/out service area), equity table, and ZIP heatmap section;
  fetches from `GET /api/analytics/geo`; loading and empty states handled
- [ ] T081 [US3] Create `frontend/src/components/GeoEquityTable.jsx` — sortable table
  with columns: ZIP, City, State, In Service Area, 30-Day Requests, Total Requests,
  Equity Flag; high-demand rows have amber left border; underserved rows have blue
  left border; color indicators always accompanied by text label (never color-only);
  table is keyboard navigable with row focus and ARIA row labels
- [ ] T082 [US3] Create `frontend/src/components/ZipHeatmap.jsx` — CSS grid or SVG
  visualization of ZIP codes as proportionally-sized blocks, colored by demand
  intensity (white=0, light teal=low, deep blue=high); tooltip on hover shows ZIP,
  city, count, flag; labeled with a visible legend; empty state shows "No data yet"
- [ ] T083 [P] [US3] Create `frontend/src/components/EquitySummaryBar.jsx` — three
  stat cards: Total ZIPs Active, ZIPs High Demand, ZIPs Underserved (in service area
  with 0 requests); each card has a large number, label, and trend arrow if applicable

### Frontend — Analytics Dashboard

- [ ] T084 [US3] Create `frontend/src/pages/AnalyticsDashboard.jsx` — page layout:
  top row of metric cards, demand trend chart, status breakdown, upcoming events
  table, predictive forecast section; fetches from multiple analytics endpoints in
  parallel; all charts use Recharts library
- [ ] T085 [US3] Create `frontend/src/components/charts/DemandTrendChart.jsx` —
  Recharts `LineChart` showing weekly request volume by fulfillment route (3 lines:
  staff, mail, pickup); X-axis = week labels, Y-axis = count; includes legend and
  accessible title; empty state = "Not enough data yet (need 2+ weeks)"
- [ ] T086 [US3] Create `frontend/src/components/charts/StatusBreakdownChart.jsx` —
  Recharts `PieChart` showing request count by status; each segment has percentage
  label; color palette uses blues/teals/amber (no alarming reds); includes ARIA
  description of chart data for screen readers
- [ ] T087 [US3] Create `frontend/src/components/charts/ProgramUsageChart.jsx` —
  Recharts `BarChart` showing request count by assetCategory; horizontal bars;
  sorted by count desc; accessible with role="img" and aria-label on the chart container
- [ ] T088 [US3] Create `frontend/src/components/ForecastPanel.jsx` — table +
  simple bar chart showing AI-predicted demand for next 4 weeks from
  `GET /api/analytics/predict`; labeled "AI Forecast (experimental)"; shows
  confidence caveat if <4 weeks of historical data exist; loading skeleton while fetching
- [ ] T089 [P] [US3] Create `frontend/src/components/UpcomingEventsPanel.jsx` —
  list of approved staffed events in next 30 days from `/api/analytics/upcoming`;
  each shows event name, date, city, attendees, requestor phone; empty state =
  "No upcoming staffed events approved"

### Tests — US3

- [ ] T090 [P] [US3] Integration test analytics endpoints in `backend/tests/integration/analytics.test.js` —
  seed 10 requests, test geo grouping, flag assignment, trend bucketing, summary counts
- [ ] T091 [P] [US3] Component test `frontend/src/pages/GeoEquityView.jsx` in
  `frontend/tests/pages/GeoEquityView.test.jsx` — renders table rows, high-demand
  row has amber indicator, underserved row has blue indicator, text labels present

**Checkpoint**: US3 complete. Geographic equity and analytics dashboard demo-ready.

---

## Phase 6: US4 — Advanced AI Features (Priority: P4)

**Goal**: WOW features that differentiate the system — simulation mode (digital twin),
organizational memory engine, latent demand detection, AI email generator, mock
Qualtrics integration, notification system.
Maps to Steps 36–42 of the flow document.

**Independent Test**: Open `/admin/simulate` → enter "What if I had 3 more staff?" →
see a coverage change visualization. Ask copilot "Detect underserved areas" →
latent demand results appear. Approve a request → notification toast appears with
AI-generated confirmation text. Click "Export to Qualtrics" → mock success response.

### Backend — Simulation + Advanced AI

- [ ] T092 [US4] Create `backend/src/routes/simulate.js` — mount on `/api/simulate`;
  `POST /scenario` accepts `{ scenario: string, currentStats: object }`; calls
  Claude API with a simulation system prompt that takes current request data +
  scenario text and returns `{ impactSummary, coverageChange, resourceTradeoffs,
  affectedZips, recommendations }`; mount in `app.js`
- [ ] T093 [US4] Create `backend/src/lib/memory.js` — `findSimilarRequests(newRequest)`
  uses in-memory cosine similarity on event description embeddings (simplified:
  keyword overlap scoring); returns top 3 most similar past requests with similarity
  score; used by decision agent to enrich recommendations with historical context
- [ ] T094 [US4] Implement latent demand detection in `backend/src/routes/analytics.js` —
  add `GET /api/analytics/latent-demand`; for each zip in service area with zero
  requests in 90 days but historically had requests before that, flag as "latent";
  calls Claude API with zip distribution data to score each flagged zip by estimated
  unmet need; returns ranked list
- [ ] T095 [US4] Create `backend/src/lib/emailGenerator.js` — export `generateEmail(request, type)`
  where type is `confirmation | rejection | clarification | followup`; calls Claude API
  with request data; returns `{ subject, body }` as plain text; used by approve/reject
  endpoints to provide auto-generated notification copy
- [ ] T096 [US4] Add mock Qualtrics export to `backend/src/routes/requests.js` —
  `POST /:id/export-qualtrics` simulates an external API call with 500ms delay;
  returns `{ success: true, qualtricsId: 'QX-${id}', exportedAt }` and updates
  request with `qualtricsExported: true`

### Frontend — Simulation Mode

- [ ] T097 [US4] Create `frontend/src/pages/SimulationPage.jsx` — "Digital Twin"
  page with scenario input (text box with example scenarios pre-loaded as chips:
  "What if I had 3 more staff?", "What if demand doubles in rural areas?", "What
  if we extend mail radius by 50 miles?"); Submit calls `POST /api/simulate/scenario`;
  shows loading state "Running simulation..."
- [ ] T098 [US4] Create `frontend/src/components/SimulationResultPanel.jsx` — renders
  simulation output: impact summary text, coverage change (before/after stat cards),
  affected ZIPs table, resource trade-off list, AI recommendations; each section
  is expandable; "Reset" button clears results and allows new scenario

### Frontend — Notifications + Email Generator

- [ ] T099 [US4] Create `frontend/src/components/NotificationToast.jsx` — slide-in
  toast at bottom-right; shows for 5 seconds then auto-dismisses; props: `type`
  (success/warning/info), `message`, `action`; role="status" for screen readers;
  triggered globally via a Zustand notification store
- [ ] T100 [US4] Integrate `NotificationToast` in `frontend/src/App.jsx` — mount
  toast container outside router; wire to global notification store; trigger on:
  request submission success, admin approval/rejection, Qualtrics export success
- [ ] T101 [US4] Add email preview to `frontend/src/components/RequestDetail.jsx` —
  "Generate Notification Email" button calls `POST /api/requests/:id/generate-email`;
  shows modal with AI-generated subject + body; "Copy" button; "Send" button
  (simulated — logs to console with success toast)
- [ ] T102 [US4] Add "Export to Qualtrics" button to `frontend/src/components/RequestDetail.jsx` —
  calls `POST /api/requests/:id/export-qualtrics`; shows loading state; on success
  shows green badge "Exported to Qualtrics" with timestamp; disabled if already exported

### Frontend — Organizational Memory

- [ ] T103 [US4] Add similar-events section to `frontend/src/components/AiInsightsPanel.jsx` —
  calls `GET /api/requests/:id/similar` (add this endpoint to `backend/src/routes/requests.js`
  using `memory.findSimilarRequests()`); renders top 3 similar past requests as
  compact cards with similarity % and outcome (what routing was used, was it overridden)

**Checkpoint**: US4 complete. Simulation, memory, email, Qualtrics export demo-ready.

---

## Phase 7: Polish + Cross-Cutting Concerns

**Purpose**: Accessibility audit, documentation, README update, demo seed data,
final UX polish, architecture comments, security review.

- [ ] T104 Run WAVE or axe browser extension on every page; fix any WCAG 2.1 AA
  failures; document results in `specs/001-community-health-request-system/accessibility-audit.md`
- [ ] T105 [P] Add JSDoc comments to all exported functions in `backend/src/lib/ai.js`,
  `backend/src/services/requestService.js`, `backend/src/services/routingService.js`,
  `backend/src/lib/calendar.js`, `backend/src/lib/memory.js`, `backend/src/lib/emailGenerator.js`
- [ ] T106 [P] Add JSDoc comments to all React components: `RequestForm.jsx`,
  `RequestDetail.jsx`, `AiInsightsPanel.jsx`, `CopilotSidebar.jsx`, `GeoEquityTable.jsx`,
  `ZipHeatmap.jsx`, `SimulationResultPanel.jsx`
- [ ] T107 Update `README.md` with: architecture diagram (ASCII), full setup steps,
  env var reference, deploy-to-Render instructions, team member branch ownership,
  AI agent descriptions (Intake/Decision/Planning), data flow summary
- [ ] T108 [P] Add architecture comment block to `backend/src/app.js` top — describes:
  Frontend (React/Vite), Backend (Node/Express), AI Layer (3 Claude agents),
  data flow: intake → AI → queue → admin → routing → tracking → analytics
- [ ] T109 Create `backend/src/data/seedData.js` — exports `seedDatabase()` that
  loads 15 realistic mock requests (varied statuses, routes, ZIPs, programs) into
  the in-memory store; call conditionally in `server.js` when `NODE_ENV=development`
- [ ] T110 [P] Create `frontend/public/_redirects` — single line `/* /index.html 200`
  for Render client-side routing support
- [ ] T111 [P] Add `engines` field to both `backend/package.json` and
  `frontend/package.json`: `"engines": { "node": ">=18" }` for Render compatibility
- [ ] T112 Add input sanitization to `backend/src/lib/validate.js` — strip HTML tags
  and trim whitespace from all string fields before processing; prevents XSS via
  stored content; add comment explaining HIPAA-aware design intent
- [ ] T113 [P] Add rate limiting comment to `backend/src/app.js` — document where
  `express-rate-limit` would be added in production; mock HIPAA note: "In production,
  all PII fields would be encrypted at rest and in transit; logs would be scrubbed"
- [ ] T114 Run full smoke test checklist from `quickstart.md` end-to-end; fix any
  failures found; update checklist with any new steps added during implementation
- [ ] T115 [P] Prepare demo seed scenario — create `backend/src/data/demoSeed.js`
  with 5 requests that tell a clear story for judges: 1 pending needs_review, 1
  high-impact approved staff event near SLC, 1 outside-service-area mail, 1 urgent
  upcoming event, 1 with AI anomaly flag; call via `GET /api/admin/demo-reset`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — AI agents + form + chat
- **US2 (Phase 4)**: Depends on Phase 2 completion — can run parallel with US1
- **US3 (Phase 5)**: Depends on Phase 2 completion — can run parallel with US1 + US2
- **US4 (Phase 6)**: Depends on US1 + US2 + US3 completion (uses their endpoints)
- **Polish (Phase 7)**: Depends on all US phases complete

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational. Core intake + AI engine.
- **US2 (P2)**: Independent after Foundational. Uses same store as US1.
- **US3 (P3)**: Independent after Foundational. Reads from same store, adds analytics routes.
- **US4 (P4)**: Depends on US1 (needs AI layer), US2 (needs admin endpoints), US3 (needs analytics).

### Within Each User Story

- Backend service → Backend route → Mount in app → Frontend hook → Frontend component
- AI lib functions before service functions that call them
- Shared `store.js` and `enums.js` before any service

### Parallel Opportunities

- T002, T003, T004, T005, T006 — install deps in parallel across backend + frontend
- T017–T030 — most foundational files are independent (different files)
- T031–T034 — all three AI agents can be written in parallel (same file, different functions)
- T048–T051 — all US1 tests are independent
- T073–T079 — analytics endpoint implementations are independent of each other
- T085–T089 — all chart components are independent

---

## Implementation Strategy

### MVP First (US1 Only — ~2 hours)

1. Complete Phase 1 (Setup) → 20 min
2. Complete Phase 2 (Foundational) → 30 min
3. Complete US1 (T031–T051) → 60 min
4. **STOP and VALIDATE**: Submit a form, see AI output. Demo-ready MVP.
5. Seed with mock data, deploy to Render.

### Incremental Delivery

1. US1 → Working intake + AI engine → Deploy → **MVP Demo**
2. US2 → Ticket queue + admin dashboard + copilot → Deploy → **Admin Demo**
3. US3 → Analytics + geo equity → Deploy → **Intelligence Demo**
4. US4 → Simulation + memory + email → Deploy → **WOW Demo**
5. Polish → Final QA + seed + README → Deploy → **Competition Demo**

### Parallel Team Strategy (Recommended for 6-hour hackathon)

After Phase 2 is done (all team completes it together):

- **Developer A**: US1 (intake form + chat + AI agents)
- **Developer B**: US2 (admin queue + detail panel + copilot)
- **Developer C**: US3 (geo equity + analytics + charts) + US4 (simulation + email)
- **All**: Phase 7 (polish + accessibility + README) in final hour

---

## Notes

- [P] = different files, no unresolved dependencies — safe to parallelize
- [Story] label maps every task to its user story for traceability
- Each story is independently completable and demo-able
- `backend/src/lib/ai.js` is the single integration point for all Claude API calls
- `backend/src/data/store.js` is the single swap point for storage backend
- Smoke test checklist in `quickstart.md` is the acceptance gate for each story
- Constitution Principle I (accessibility): every component must pass axe before merge
- Constitution Principle III (tests): every story phase has unit + integration + component tests
- Constitution Principle IV (docs): JSDoc on all public functions; README updated after each story
