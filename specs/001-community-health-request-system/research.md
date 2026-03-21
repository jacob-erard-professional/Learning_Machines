# Research: Community Health Request System

**Branch**: `001-community-health-request-system` | **Date**: 2026-03-21

## Decision 1: Storage

**Decision:** In-memory array (JavaScript module-level Map/array) for MVP;
swap-ready to lowdb (JSON file) if demo persistence is needed.

**Rationale:** Render's free tier has an **ephemeral filesystem** — both SQLite
and JSON files are lost on restart/redeploy. For a 6-hour hackathon demo where
we control when we restart, in-memory storage is zero-friction: no setup, no
native compilation, instant on any runtime. lowdb is the one-step upgrade if we
want between-demo persistence and can accept losing data on cold starts.

**Alternatives considered:**
- SQLite (better-sqlite3 / Prisma): Requires native compilation, same ephemeral
  FS problem on Render free tier; overkill for a single demo session
- External Postgres (Render): Free tier has 30-day expiry and setup overhead;
  not worth it in a 6-hour window
- lowdb: Zero setup, good DX — keep as the swap target but start in-memory

---

## Decision 2: Claude API Integration for NLP Tagging

**Decision:** Synchronous Claude API call on form submission from the Express
backend. Use structured XML prompt with few-shot examples, force JSON output.
All Claude calls live in `backend/src/lib/ai.js`.

**Rationale:** For a one-at-a-time demo context, synchronous is simpler and
gives the requestor immediate feedback (show a brief "Analyzing..." spinner on
the frontend). Async polling adds state management complexity with no benefit
for a hackathon. Isolating calls in `ai.js` lets us mock cleanly in tests and
fall back gracefully when the API is unavailable.

**Prompt approach:**
```
<task>Extract event metadata and recommend fulfillment from this form submission</task>
<schema>
{
  "tags": ["string"],
  "assetCategory": "materials|toolkits|behavioral_reinforcements|programs",
  "suggestedFulfillment": "staff_deployment|mail|pickup",
  "confidence": "high|medium|low",
  "summary": "string (1 sentence)"
}
</schema>
<examples>
  <example>
    <input>Health fair for seniors at the community center, need blood pressure cuffs and pamphlets</input>
    <output>{"tags":["health fair","seniors","blood pressure"],"assetCategory":"materials","suggestedFulfillment":"staff_deployment","confidence":"high","summary":"Senior health fair requiring on-site blood pressure screening materials."}</output>
  </example>
</examples>
<submission>{requestor free-text}</submission>
```

**Fallback:** If the Claude API call fails (timeout or error), the system sets
`aiStatus: "failed"` on the request, applies a conservative default
(`suggestedFulfillment: "mail"`, `tags: []`), and flags the request as
`needs_review` so admins know to manually classify it.

**Alternatives considered:**
- Async / job queue: Adds complexity, unnecessary for demo scale
- Client-side SDK: Exposes API key — never acceptable
- OpenAI or other: Not on constitution-approved stack; Claude API only

---

## Decision 3: Geographic Service Area Logic

**Decision:** Static JSON lookup — a Set of zip codes covering Intermountain
Healthcare's service states (UT, ID, NV, WY, MT, CO, KS), loaded from
`backend/src/data/serviceAreaZips.js` at startup. O(1) lookup per submission.

**Rationale:** Intermountain serves a known, fixed geographic footprint. A
curated zip code list (available from SimpleMaps free tier or USPS data) covers
the exact coverage area with no API calls, no network latency, and no rate
limits. A state-level check is too coarse (over-includes remote areas). Radius-
based Haversine adds coordinate lookup complexity for no meaningful benefit.

**Implementation note:** The zip set is a JS `Set` for O(1) `.has()` lookup.
The file exports both the Set and a helper `isInServiceArea(zip)`. For the
hackathon, seed with the 7 state zip lists (approximately 20,000 entries); exact
zip-level accuracy is acceptable for a demo.

**Routing logic:**
```
if (!isInServiceArea(zip)) → route = "mail"
else if (requestType === "materials_only") → route = "mail"
else → route = "staff_deployment" (subject to admin approval)
```

**Alternatives considered:**
- Radius-based (Haversine from SLC): Requires lat/lon lookup, adds 20+ lines of
  math, less intuitive to adjust
- Google Maps API / USPS API: Paid, rate-limited, adds network dependency
- State-level whitelist: Too coarse; doesn't reflect actual Intermountain coverage

---

## Decision 4: Calendar Invite Generation

**Decision:** `ics` npm package for generating RFC 5545-compliant .ics files
on the backend, served as a file download from the admin dashboard.

**Rationale:** `ics` has the simplest API for one-time event invites — 10 lines
of code to produce a standards-compliant .ics string that works with Google
Calendar, Outlook, Apple Calendar, and any standards-compliant client. No
complex date library dependency. Downloaded as a file from the "Approve" action
in the admin dashboard; optionally emailed (out of hackathon scope).

**Alternatives considered:**
- `ical-generator`: Better for recurring events and complex feeds — overkill here
- `node-ical`: A parsing library, not a generation library — wrong direction
- Hand-crafting the iCal string: Fragile, error-prone with timezone edge cases

---

## Decision 5: Frontend Testing Setup

**Decision:** Vitest + React Testing Library + jsdom environment configured in
`vite.config.js`. `@testing-library/jest-dom` matchers for accessible assertions.

**Key config:**
```js
// vite.config.js — add test block
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: "./src/setupTests.js",
}
```
```js
// src/setupTests.js
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
afterEach(() => cleanup());
```

**Gotchas resolved:**
- Vitest defaults to `node` env (no DOM) — must set `environment: "jsdom"`
- `cleanup()` in `afterEach` prevents state bleed between tests
- `@testing-library/jest-dom/vitest` import (not `/jest`) for Vitest compatibility

**Alternatives considered:**
- Jest: Slower startup, separate config file, no benefit for a Vite project

---

## Decision 6: Backend Testing Setup

**Decision:** Vitest + Supertest for integration testing Express routes. ESM
throughout (`"type": "module"` in `package.json`).

**Key config:** Supertest is test-framework-agnostic; works identically with
Vitest's `describe/it/expect`. The Express `app` is exported without `.listen()`
so Supertest can bind its own port.

**Gotchas resolved:**
- Export `app` separately from `server.js` (which calls `app.listen()`) so tests
  don't spawn a real server
- ESM: Use `import` not `require`; no `__dirname` — use `import.meta.url` if
  path resolution is needed
- Vitest auto-detects ESM; no `transform` config needed

**Alternatives considered:**
- Jest + Supertest: Works but slower and needs `jest.config.js`
- Node native test runner: Less mature mocking/coverage support
