# Completion Checklist: Community Health AI Request Management System

**Purpose**: Verify the feature is complete, constitution-compliant, and demo-ready
**Created**: 2026-03-21
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md) | [tasks.md](./tasks.md)

---

## Constitution Compliance

- [ ] CHK001 All form fields have visible labels and matching `htmlFor`/`id` pairs (Principle I)
- [ ] CHK002 All interactive elements are reachable and operable via keyboard alone (Principle I)
- [ ] CHK003 Color contrast ratios pass AA — 4.5:1 for normal text, 3:1 for large text (Principle I)
- [ ] CHK004 Inline validation errors are announced via `aria-live` regions (Principle I)
- [ ] CHK005 Focus indicators are always visible — no `outline: none` without a custom replacement (Principle I)
- [ ] CHK006 Stack is exclusively React/Vite + Node/Express + Tailwind CSS — no unauthorized additions (Principle II)
- [ ] CHK007 State management uses only React Context or Zustand — no Redux or other libraries (Principle II)
- [ ] CHK008 Unit tests exist for `validate.js`, `routingService.js`, `serviceAreaZips.js`, and all data transforms (Principle III)
- [ ] CHK009 Integration tests cover all API endpoints in `backend/tests/integration/` (Principle III)
- [ ] CHK010 Component tests cover form validation flows and dashboard interactions (Principle III)
- [ ] CHK011 All tests pass: `npm test` green in both `backend/` and `frontend/` (Principle III)
- [ ] CHK012 Every public function and React component has a JSDoc-style docstring (Principle IV)
- [ ] CHK013 Non-obvious logic has inline comments explaining "why", not "what" (Principle IV)
- [ ] CHK014 `README.md` documents setup, architecture, deployment, and the no-auth demo caveat (Principle IV)
- [ ] CHK015 No file exceeds 200 lines without documented justification (Principle V)
- [ ] CHK016 All AI API calls are isolated in `backend/src/lib/ai.js` — none inline in route handlers or components (Principle V)

---

## User Story 1 — Smart Request Intake (P1 MVP)

- [ ] CHK017 Structured form (`RequestForm.jsx`) accepts all required fields: name, contact, event name, date, location (city/zip), request type
- [ ] CHK018 Inline validation fires on blur — not only on submit — with descriptive, actionable error messages
- [ ] CHK019 Past event dates are blocked with a clear error message
- [ ] CHK020 AI tagging and routing decision returns within 3 seconds of submission
- [ ] CHK021 Routing logic correctly distinguishes in-service-area zips (staff eligible) from out-of-area (mail)
- [ ] CHK022 Unknown zip codes default to mail fulfillment and are flagged for admin awareness
- [ ] CHK023 Claude API failure falls back to manual routing and sets status to `needs_review` — app does NOT crash
- [ ] CHK024 Duplicate detection warns requestor (same email + event date + zip) but allows override
- [ ] CHK025 Confirmation card shown after successful submission with routing decision and assigned tags
- [ ] CHK026 Chat intake (`ChatIntakePage.jsx`) extracts fields and pre-fills the structured form — it does NOT create a request directly
- [ ] CHK027 "Review & Submit" button appears only when chat has extracted sufficient fields
- [ ] CHK028 Form data is preserved in component state on network failure — never cleared
- [ ] CHK029 Inline error banner with "Try again" button shown when backend is unreachable

---

## User Story 2 — Admin Dashboard (P2)

- [ ] CHK030 `/admin` is publicly accessible with no authentication (demo environment)
- [ ] CHK031 All requests appear in the dashboard with: requestor, event date, location, type, status, routing
- [ ] CHK032 Search by requestor name or event name filters results correctly
- [ ] CHK033 Filter by status, fulfillment route, and date range works independently and in combination
- [ ] CHK034 Admin can open any request, edit any field, and save — change is persisted
- [ ] CHK035 Audit trail records all admin edits and routing overrides
- [ ] CHK036 Admin can override AI-assigned routing and tags
- [ ] CHK037 Approving a staffed event generates a downloadable iCal (`.ics`) file
- [ ] CHK038 Dashboard handles empty state gracefully — no blank screens
- [ ] CHK039 Dashboard handles loading state gracefully — no raw spinners
- [ ] CHK040 Admin can find any request in under 30 seconds using search (SC-003)

---

## User Story 3 — Geographic Equity View (P3)

- [ ] CHK041 Geo view displays request counts per zip code visually
- [ ] CHK042 Zip codes with ≥3 requests in a rolling 30-day window are flagged as **high-demand**
- [ ] CHK043 Zip codes in the service area with ≥1 historical request but 0 in last 30 days are flagged as **underserved**
- [ ] CHK044 Zip codes with zero historical requests are labeled **inactive** — NOT flagged as underserved
- [ ] CHK045 Geo view reflects new submissions within 1 minute (SC-005)

---

## API & Data Integrity

- [ ] CHK046 All API endpoints return typed, documented response shapes matching `specs/.../contracts/api.md`
- [ ] CHK047 `POST /requests` — validates, routes, tags, and returns the created request
- [ ] CHK048 `GET /requests` — returns full list with search/filter query param support
- [ ] CHK049 `PATCH /requests/:id` — persists edits and appends to audit log
- [ ] CHK050 `POST /requests/:id/approve` — sets status to `approved` and generates iCal
- [ ] CHK051 `GET /analytics/geo` — returns per-zip counts with demand/underserved flags
- [ ] CHK052 100% of requests have a routing decision — none left unclassified (SC-004)
- [ ] CHK053 `FulfillmentRoute`, `RequestStatus`, `AssetCategory` enums are frozen objects — no magic strings in code

---

## UI & Design

- [ ] CHK054 Color palette uses blues/teals as primary anchors with soft amber/green accents — no heavy reds
- [ ] CHK055 All views are functional on screens ≥320px wide (mobile-first)
- [ ] CHK056 `AppShell.jsx` nav is keyboard accessible and includes mobile-responsive hamburger menu
- [ ] CHK057 Every data-driven view handles both empty AND loading states
- [ ] CHK058 `StatusBadge.jsx` uses label + color — no color-only meaning; includes `aria-label`
- [ ] CHK059 A requestor can complete the full submission flow in under 3 minutes (SC-001)

---

## Deployment Readiness

- [ ] CHK060 `backend/.env.example` and `frontend/.env.example` are committed — actual `.env` files are gitignored
- [ ] CHK061 `ANTHROPIC_API_KEY` is set as an environment variable in Render dashboard — not hardcoded
- [ ] CHK062 `README.md` documents that `/admin` has no auth in the demo and that production would add auth
- [ ] CHK063 Frontend `public/_redirects` contains `/*  /index.html  200` for client-side routing on Render
- [ ] CHK064 `package.json` includes `engines.node: ">=18"` in both `backend/` and root
- [ ] CHK065 `npm run build` completes without errors in `frontend/`
- [ ] CHK066 `node server.js` starts without errors in `backend/`
- [ ] CHK067 WCAG 2.1 AA automated accessibility scan passes on all views (SC-006)

---

## Demo Flow Verification

- [ ] CHK068 Submit a new staffed event request in-area → confirm routing = `staff_deployment`, tags applied
- [ ] CHK069 Submit a request with an out-of-area zip → confirm routing = `mail`, note displayed
- [ ] CHK070 Open admin dashboard → confirm request appears, search finds it, fields are editable
- [ ] CHK071 Approve a staffed event → confirm iCal download is triggered
- [ ] CHK072 Open geo equity view → confirm zip counts are accurate and flags are correct
- [ ] CHK073 Test on mobile viewport (≥320px) — all views usable

---

## Notes

- Check items off as completed: `[x]`
- Any FAIL on CHK001–CHK016 (Constitution) blocks the PR — document justification in `plan.md` Complexity Tracking table
- CHK017, CHK030, CHK041 are the independent-test gates for US1, US2, US3 respectively
- Items marked with a Success Criterion reference (SC-XXX) must be verifiable end-to-end
