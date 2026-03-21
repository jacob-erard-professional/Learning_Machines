# Community Health Request System

**Live Demo:** [https://frontend-s00n.onrender.com/](https://frontend-s00n.onrender.com/)

An AI-enabled web application for Intermountain Healthcare's Community Health team that modernizes the event support and material ordering workflow. Replaces a manual, email-based process with a real-time, data-driven operational platform.

---

## What It Does

Community partners and event organizers submit requests for health education staff or materials. The system automatically classifies, routes, and tracks each request — giving admins a live dashboard to manage fulfillment, review AI decisions, and report on demand trends.

---

## Features

- **Request Submission** — Structured intake form with required and optional fields
- **Intelligent Routing** — Automatically routes requests to staff deployment, mail, or pickup based on zip code and request type
- **AI Classification** — Three Claude agents enrich each submission: extracting metadata, tagging, and generating staffing recommendations
- **Voice Intake** — Conversational voice-driven form input via the Web Speech API
- **Admin Dashboard** — Search, filter, sort, approve, reject, or hold requests
- **Analytics** — Demand trends, geographic equity analysis, and upcoming staffing needs
- **AI Copilot** — Natural language query interface for admins
- **Simulation** — Model the impact of policy changes on routing and staffing
- **Calendar Export** — Generates `.ics` files for approved staff deployment events
- **Email Notifications** — Sends confirmation and status update emails via Gmail OAuth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Routing | React Router 6 |
| Backend | Node.js 20 + Express 4 |
| AI | Claude API (`@anthropic-ai/sdk`) |
| Data | Google Sheets (optional) or in-memory |
| Deployment | Render |

---

## Project Structure

```
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
└── backend/           # Node/Express API
    └── src/
        ├── routes/
        ├── services/
        ├── data/
        └── lib/
```

---

## Running Locally

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # add your API keys
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:3001`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for AI agents |
| `GMAIL_OAUTH_CLIENT_ID` | Google OAuth client ID for email |
| `GMAIL_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `GMAIL_OAUTH_REDIRECT_URI` | OAuth callback URL |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Optional — enables persistent storage |
| `CORS_ORIGIN` | Frontend URL (set in production) |

---

## Built For

Intermountain Healthcare Hackathon — Community Health team modernization challenge.
