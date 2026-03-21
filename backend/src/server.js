/**
 * @file server.js
 * HTTP server entry point. Imports the Express app and calls listen().
 *
 * Separated from app.js so that integration tests (Supertest) can import
 * app.js directly without spawning a real TCP server.
 *
 * In dev mode (NODE_ENV !== 'production'), seeds the in-memory store with
 * demo data so admins have something to click through immediately.
 */

import 'dotenv/config';
import app from './app.js';
import { seedDatabase } from './data/store.js';
import { getDemoRequests } from './data/demoSeed.js';

const PORT = process.env.PORT ?? 3001;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Seed demo data in development — gives judges real requests to explore
if (NODE_ENV !== 'production') {
  const demoRequests = getDemoRequests();
  seedDatabase(demoRequests);
  console.log(`[server] Seeded ${demoRequests.length} demo requests`);
}

app.listen(PORT, () => {
  console.log(`[server] Community Health Request System running on port ${PORT}`);
  console.log(`[server] Environment: ${NODE_ENV}`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
});
