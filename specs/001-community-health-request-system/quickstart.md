# Quickstart: Community Health Request System

**Branch**: `001-community-health-request-system` | **Date**: 2026-03-21

This guide gets you from zero to a running local development environment in
under 5 minutes, and documents the manual smoke-test checklist used to validate
the app before each demo.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| Git | any | `git --version` |

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd <repo-name>

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## 2. Environment Setup

```bash
# backend/.env  (never commit this file)
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...   # Get from Anthropic console
NODE_ENV=development
```

```bash
# frontend/.env  (never commit this file)
VITE_API_BASE_URL=http://localhost:3001
```

> The app works without `ANTHROPIC_API_KEY` — AI tagging will gracefully fail
> and requests will be flagged `needs_review`. All other features function normally.

---

## 3. Start Development Servers

Run each in a separate terminal:

```bash
# Terminal 1 — Backend (Express on port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (Vite on port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 4. Run Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Both (from repo root, if root package.json is configured)
npm test
```

All tests must pass before merging to `main`.

---

## 5. Smoke Test Checklist

Run this checklist before every demo or merge to `main`.

### Submission Flow (User Story 1)

- [ ] Open the request form at `/`
- [ ] Submit with all required fields empty → confirm inline errors appear on each field
- [ ] Enter a past event date → confirm "must be today or in the future" error
- [ ] Enter a zip code outside the service area (e.g., `10001` — New York) and
      select "Staff Support" → confirm routing shows "Mail" with explanation
- [ ] Enter a valid in-service-area zip (e.g., `84101`) and select "Staff Support"
      → confirm routing shows "Staff Deployment"
- [ ] Submit a valid form → confirm confirmation screen with routing and tags
- [ ] Submit the same form again → confirm duplicate warning appears

### Admin Dashboard (User Story 2)

- [ ] Open `/admin` → confirm submitted requests appear in the list
- [ ] Search by requestor name → confirm filtered results
- [ ] Filter by status "Pending" → confirm only pending requests shown
- [ ] Click a request → confirm full detail view opens with all fields
- [ ] Edit the fulfillment route → save → confirm change persists and appears in audit log
- [ ] Approve a "Staff Deployment" request → confirm .ics file downloads

### Geo Equity View (User Story 3)

- [ ] Open `/admin/geo` → confirm zip codes with request counts appear
- [ ] Confirm high-demand zips (≥3 requests/30d) show amber indicator
- [ ] Confirm in-service-area zips with 0 requests show "underserved" indicator

### Accessibility

- [ ] Tab through the entire submission form using keyboard only — confirm all
      fields are reachable and focus ring is visible
- [ ] Submit form with keyboard only (no mouse) — confirm works end-to-end
- [ ] Check color contrast on status badges with a browser DevTools accessibility
      audit — all must pass AA

---

## 6. Deployment to Render

### Backend (Web Service)

| Setting | Value |
|---------|-------|
| Root directory | `backend/` |
| Build command | `npm install` |
| Start command | `node src/server.js` |
| Environment | Add `ANTHROPIC_API_KEY`, `NODE_ENV=production` |

### Frontend (Static Site)

| Setting | Value |
|---------|-------|
| Root directory | `frontend/` |
| Build command | `npm run build` |
| Publish directory | `dist` |

Add a `frontend/public/_redirects` file:
```
/*  /index.html  200
```

Set `VITE_API_BASE_URL` in Render's environment variables to your backend
Web Service URL (e.g., `https://ihc-backend.onrender.com`).

---

## 7. Project Structure Reference

```
backend/
├── src/
│   ├── server.js           # Entry point — binds to PORT
│   ├── app.js              # Express app (exported for Supertest)
│   ├── routes/
│   │   ├── requests.js     # POST/GET/PATCH /api/requests
│   │   └── analytics.js    # GET /api/analytics/*
│   ├── services/
│   │   ├── requestService.js   # Business logic for requests
│   │   └── routingService.js   # Fulfillment routing decisions
│   ├── lib/
│   │   ├── ai.js           # Claude API calls (isolated here)
│   │   ├── calendar.js     # ics file generation
│   │   ├── enums.js        # Shared enum constants
│   │   └── validate.js     # Request body validation helpers
│   └── data/
│       ├── store.js            # In-memory store (swap here to change storage)
│       └── serviceAreaZips.js  # Static zip code Set + isInServiceArea()
└── tests/
    ├── unit/
    │   ├── routingService.test.js
    │   └── validate.test.js
    └── integration/
        ├── requests.test.js
        └── analytics.test.js

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx             # React Router routes
│   ├── setupTests.js       # Vitest + RTL setup
│   ├── components/
│   │   ├── RequestForm.jsx
│   │   ├── RequestDetail.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── RequestCard.jsx
│   │       └── StatusBadge.jsx
│   ├── pages/
│   │   ├── SubmitPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── GeoEquityView.jsx
│   ├── hooks/
│   │   └── useRequests.js  # Data fetching + filter state
│   ├── lib/
│   │   └── api.js          # Fetch wrapper for /api/* endpoints
│   └── data/
│       └── mockRequests.js # Mock data for dev before API is wired
└── tests/
    ├── components/
    │   ├── RequestForm.test.jsx
    │   ├── RequestCard.test.jsx
    │   └── StatusBadge.test.jsx
    └── pages/
        └── AdminDashboard.test.jsx
```
