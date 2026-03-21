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
import { initializeStore, seedDatabase } from './data/store.js';
import { getDemoRequests } from './data/demoSeed.js';
import { isGoogleSheetsConfigured } from './data/googleSheetsStore.js';

const PORT = process.env.PORT ?? 3001;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

async function startServer() {
  const storeState = await initializeStore();

  // Seed demo data in development only when not using Google Sheets
  if (NODE_ENV !== 'production' && !isGoogleSheetsConfigured()) {
    const demoRequests = getDemoRequests();
    seedDatabase(demoRequests);
    console.log(`[server] Seeded ${demoRequests.length} demo requests`);
  } else {
    console.log(
      `[server] Store source: ${storeState.source} (${storeState.requestCount} requests loaded)`
    );
  }

  app.listen(PORT, () => {
    console.log(`[server] Community Health Request System running on port ${PORT}`);
    console.log(`[server] Environment: ${NODE_ENV}`);
    console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[server] Failed to initialize store:', err);
  process.exit(1);
});
