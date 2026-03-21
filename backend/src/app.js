/**
 * @file app.js
 * Express application factory for the Community Health Request Management System.
 *
 * ─── ARCHITECTURE OVERVIEW ────────────────────────────────────────────────────
 *
 * This system routes community health support requests from external partners to
 * Intermountain Healthcare's Community Health team. The core pipeline:
 *
 * 1. INTAKE     - POST /api/requests validates and saves form submissions
 * 2. AI AGENTS  - Three Claude agents enrich each request:
 *                 a) IntakeAgent  — extracts structured metadata from free text
 *                 b) DecisionAgent — classifies and tags for routing
 *                 c) PlanningAgent — recommends staffing and logistics
 * 3. ROUTING    - Deterministic routing (routingService.js) assigns a
 *                 fulfillment route (staff_deployment | mail | pickup) based on
 *                 zip code lookup and requestType. AI is advisory only.
 * 4. ADMIN FLOW - Admins approve/reject/hold via /api/requests/:id/*
 *                 Approvals for staff events generate .ics calendar files
 * 5. ANALYTICS  - /api/analytics/* surfaces demand patterns, geo equity gaps,
 *                 and upcoming staffing needs
 * 6. COPILOT    - /api/copilot/query gives admins a natural language interface
 * 7. SIMULATION - /api/simulate/scenario models policy change impacts
 *
 * ─── KEY DESIGN DECISIONS ────────────────────────────────────────────────────
 *
 * - In-memory store (store.js) — zero setup for hackathon demo, swap-ready
 * - All AI calls in lib/ai.js — isolated, mockable, graceful fallback
 * - Deterministic routing is authoritative; AI suggestion is informational
 * - ESM throughout (package.json "type": "module")
 * - App exported separately from server.js so Supertest can bind its own port
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express from 'express';
import cors from 'cors';

import requestsRouter from './routes/requests.js';
import chatRouter from './routes/chat.js';
import analyticsRouter from './routes/analytics.js';
import copilotRouter from './routes/copilot.js';
import simulateRouter from './routes/simulate.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Trust reverse proxy headers (needed on Render)
app.set('trust proxy', 1);

// CORS — allow all origins in dev/demo context
// In production, restrict to the frontend's Render URL
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// JSON body parser (Express 4.16+ built-in)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/requests', requestsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/simulate', simulateRouter);

// Health check endpoint — useful for Render health monitors
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);

  // Don't expose stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status ?? 500).json({
    error: err.code ?? 'INTERNAL_ERROR',
    message: err.message ?? 'An unexpected error occurred.',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
});

export default app;
