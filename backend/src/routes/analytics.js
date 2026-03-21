/**
 * @file routes/analytics.js
 * Analytics and reporting endpoints for the admin equity dashboard.
 *
 * Endpoints:
 *   GET /geo            - Requests grouped by zip with demand flags
 *   GET /trends         - Request volume over time by route
 *   GET /upcoming       - Approved staff events in next 30 days
 *   GET /summary        - Totals by status, route, priority
 *   GET /admin-patterns - Admin override frequency analysis
 *   GET /predict        - AI demand forecast for next 4 weeks
 *   GET /latent-demand  - In-area zips that have gone quiet
 */

import { Router } from 'express';
import { getAllRequests, getAdminPatterns } from '../data/store.js';
import { isInServiceArea } from '../data/serviceAreaZips.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Helper: get date N days ago (ISO string YYYY-MM-DD)
// ---------------------------------------------------------------------------

/**
 * @param {number} daysAgo
 * @returns {string} YYYY-MM-DD
 */
function daysAgoISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {number} daysAhead
 * @returns {string} YYYY-MM-DD
 */
function daysAheadISO(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// GET /geo — Geographic demand summary by zip
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/geo
 * Groups all requests by zip code and computes demand flags:
 * - high_demand: 3+ requests in the last 30 days
 * - underserved: has historical requests but 0 in the last 30 days
 */
router.get('/geo', (req, res) => {
  try {
    const requests = getAllRequests();
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = daysAgoISO(30);

    // Group by zip
    const byZip = {};
    for (const r of requests) {
      const zip = r.eventZip;
      if (!byZip[zip]) {
        byZip[zip] = {
          zip,
          city: r.eventCity,
          // Simple state inference from zip prefix
          state: inferState(zip),
          isInServiceArea: isInServiceArea(zip),
          requestCount30d: 0,
          totalRequestCount: 0,
          flag: null,
        };
      }
      byZip[zip].totalRequestCount++;
      // Count requests created in last 30 days
      if (r.createdAt >= thirtyDaysAgo + 'T00:00:00Z' || r.eventDate >= thirtyDaysAgo) {
        byZip[zip].requestCount30d++;
      }
    }

    // Apply flags
    for (const entry of Object.values(byZip)) {
      if (entry.requestCount30d >= 3) {
        entry.flag = 'high_demand';
      } else if (entry.totalRequestCount >= 1 && entry.requestCount30d === 0) {
        entry.flag = 'underserved';
      }
    }

    const summary = Object.values(byZip).sort(
      (a, b) => b.totalRequestCount - a.totalRequestCount
    );

    const inServiceArea = summary.filter((z) => z.isInServiceArea).length;

    return res.json({
      summary,
      serviceAreaCoverage: {
        total: summary.length,
        inServiceArea,
        outsideServiceArea: summary.length - inServiceArea,
      },
    });
  } catch (err) {
    console.error('[GET /analytics/geo]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /trends — Request volume over time by fulfillment route
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/trends
 * Query: groupBy (day|week|month), weeks (default 8)
 */
router.get('/trends', (req, res) => {
  try {
    const groupBy = req.query.groupBy ?? 'week';
    const weeksBack = Math.min(52, Math.max(1, parseInt(req.query.weeks ?? '8', 10)));

    const requests = getAllRequests();

    // Build time buckets based on groupBy
    const buckets = buildTimeBuckets(groupBy, weeksBack);

    // Initialize series
    const series = {
      staff_deployment: new Array(buckets.length).fill(0),
      mail: new Array(buckets.length).fill(0),
      pickup: new Array(buckets.length).fill(0),
    };

    for (const r of requests) {
      const dateStr = r.createdAt?.slice(0, 10) ?? r.eventDate;
      const bucketIdx = findBucketIndex(dateStr, buckets, groupBy);
      if (bucketIdx >= 0 && series[r.fulfillmentRoute] !== undefined) {
        series[r.fulfillmentRoute][bucketIdx]++;
      }
    }

    return res.json({ labels: buckets, series });
  } catch (err) {
    console.error('[GET /analytics/trends]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /upcoming — Approved staff events in next 30 days
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/upcoming
 * Returns approved staff_deployment events with eventDate in the next 30 days.
 */
router.get('/upcoming', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const in30Days = daysAheadISO(30);

    const events = getAllRequests()
      .filter(
        (r) =>
          r.status === 'approved' &&
          r.fulfillmentRoute === 'staff_deployment' &&
          r.eventDate >= today &&
          r.eventDate <= in30Days
      )
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .map((r) => ({
        id: r.id,
        eventName: r.eventName,
        eventDate: r.eventDate,
        eventCity: r.eventCity,
        eventZip: r.eventZip,
        estimatedAttendees: r.estimatedAttendees,
        requestorName: r.requestorName,
        requestorPhone: r.requestorPhone,
        planningStaffingCount: r.planningStaffingCount,
      }));

    return res.json({ events });
  } catch (err) {
    console.error('[GET /analytics/upcoming]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /summary — Totals by status, route, priority
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/summary
 * Returns aggregate counts for admin dashboard KPI cards.
 */
router.get('/summary', (req, res) => {
  try {
    const requests = getAllRequests();
    const total = requests.length;

    const byStatus = countBy(requests, 'status');
    const byRoute = countBy(requests, 'fulfillmentRoute');
    const byPriority = countBy(requests, 'priority');
    const byAiStatus = countBy(requests, 'aiStatus');

    return res.json({
      total,
      byStatus,
      byRoute,
      byPriority,
      byAiStatus,
    });
  } catch (err) {
    console.error('[GET /analytics/summary]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /admin-patterns — Override frequency analysis
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/admin-patterns
 * Returns pattern analysis of admin overrides — surfaces systematic
 * corrections that could improve AI routing over time.
 */
router.get('/admin-patterns', (req, res) => {
  try {
    const patterns = getAdminPatterns();
    return res.json(patterns);
  } catch (err) {
    console.error('[GET /analytics/admin-patterns]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /predict — AI demand forecast for next 4 weeks
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/predict
 * Uses Claude to analyze recent trends and forecast demand for next 4 weeks.
 */
router.get('/predict', async (req, res) => {
  try {
    const requests = getAllRequests();

    // Build a trends summary to feed into the AI
    const recentRequests = requests.filter(
      (r) => r.createdAt >= daysAgoISO(60) + 'T00:00:00Z'
    );

    const trendSummary = {
      totalLast60Days: recentRequests.length,
      byRouteRecent: countBy(recentRequests, 'fulfillmentRoute'),
      byStatusRecent: countBy(recentRequests, 'status'),
      topZips: getTopNByField(recentRequests, 'eventZip', 5),
      weeklyAverage: (recentRequests.length / 8).toFixed(1),
    };

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are a demand forecasting analyst for Intermountain Healthcare's Community Health program.
Analyze request trends and forecast demand for the next 4 weeks.
Return ONLY valid JSON, no other text.`,
      messages: [
        {
          role: 'user',
          content: `Based on this trends data, forecast demand for the next 4 weeks:\n\n${JSON.stringify(trendSummary, null, 2)}\n\nReturn JSON: {"weeklyForecast": [{"week": "YYYY-MM-DD", "predictedRequests": N, "confidence": "high|medium|low"}], "insights": ["..."], "peakRiskWeek": "YYYY-MM-DD or null"}\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const forecast = JSON.parse(clean);

    return res.json({ forecast, basedOn: trendSummary });
  } catch (err) {
    console.error('[GET /analytics/predict]', err);
    // Return a graceful fallback with a message
    return res.json({
      forecast: { weeklyForecast: [], insights: ['Forecast unavailable — AI service error.'], peakRiskWeek: null },
      error: 'AI_UNAVAILABLE',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /latent-demand — In-area zips that have gone quiet (90+ days)
// ---------------------------------------------------------------------------

/**
 * @route GET /api/analytics/latent-demand
 * Finds zip codes within the service area that had historical requests
 * but have not had any new requests in the past 90 days.
 * These represent communities that may still have need but have stopped asking.
 */
router.get('/latent-demand', (req, res) => {
  try {
    const requests = getAllRequests();
    const ninetyDaysAgo = daysAgoISO(90);

    // Group by zip and find last request date
    const zipActivity = {};
    for (const r of requests) {
      const zip = r.eventZip;
      if (!isInServiceArea(zip)) continue; // Only care about in-area zips
      if (!zipActivity[zip]) {
        zipActivity[zip] = { zip, city: r.eventCity, totalRequests: 0, lastRequestDate: null };
      }
      zipActivity[zip].totalRequests++;
      const requestDate = r.createdAt?.slice(0, 10) ?? r.eventDate;
      if (!zipActivity[zip].lastRequestDate || requestDate > zipActivity[zip].lastRequestDate) {
        zipActivity[zip].lastRequestDate = requestDate;
      }
    }

    // Filter to zips with historical requests that have gone quiet
    const latent = Object.values(zipActivity)
      .filter((z) => z.lastRequestDate && z.lastRequestDate < ninetyDaysAgo)
      .sort((a, b) => b.totalRequests - a.totalRequests);

    return res.json({
      latentDemandZips: latent,
      cutoffDate: ninetyDaysAgo,
      count: latent.length,
    });
  } catch (err) {
    console.error('[GET /analytics/latent-demand]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Counts occurrences of each value for a given field across an array of objects.
 * @param {Array<Object>} arr
 * @param {string} field
 * @returns {Record<string, number>}
 */
function countBy(arr, field) {
  return arr.reduce((acc, item) => {
    const val = item[field] ?? 'unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Returns the top N most frequent values for a given field.
 * @param {Array<Object>} arr
 * @param {string} field
 * @param {number} n
 * @returns {Array<{value: string, count: number}>}
 */
function getTopNByField(arr, field, n) {
  const counts = countBy(arr, field);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

/**
 * Builds an array of time bucket labels (ISO date strings) going back N weeks.
 * @param {'day'|'week'|'month'} groupBy
 * @param {number} weeksBack
 * @returns {string[]}
 */
function buildTimeBuckets(groupBy, weeksBack) {
  const buckets = [];
  const now = new Date();

  if (groupBy === 'day') {
    const days = weeksBack * 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push(d.toISOString().slice(0, 10));
    }
  } else if (groupBy === 'month') {
    const months = Math.ceil(weeksBack / 4);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i, 1);
      buckets.push(d.toISOString().slice(0, 7)); // YYYY-MM
    }
  } else {
    // Default: weekly (Monday-anchored)
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(startOfCurrentWeek);
      d.setDate(startOfCurrentWeek.getDate() - i * 7);
      buckets.push(d.toISOString().slice(0, 10));
    }
  }

  return buckets;
}

/**
 * Finds the index of the bucket that a given date falls into.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string[]} buckets - sorted array of bucket labels
 * @param {'day'|'week'|'month'} groupBy
 * @returns {number} bucket index, or -1 if out of range
 */
function findBucketIndex(dateStr, buckets, groupBy) {
  if (!dateStr) return -1;

  if (groupBy === 'day') {
    return buckets.indexOf(dateStr);
  }

  if (groupBy === 'month') {
    const monthStr = dateStr.slice(0, 7);
    return buckets.indexOf(monthStr);
  }

  // Weekly: find the Monday of the week containing dateStr
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0 = Sunday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  const mondayStr = monday.toISOString().slice(0, 10);
  return buckets.indexOf(mondayStr);
}

/**
 * Simple heuristic: infer US state abbreviation from zip code prefix.
 * Not exhaustive — covers Intermountain's 7 service states.
 * @param {string} zip
 * @returns {string}
 */
function inferState(zip) {
  const prefix = String(zip).slice(0, 3);
  const num = parseInt(prefix, 10);

  if (num >= 840 && num <= 847) return 'UT';
  if (num >= 830 && num <= 839) return 'ID';
  if (num >= 889 && num <= 898) return 'NV';
  if (num >= 820 && num <= 831) return 'WY';
  if (num >= 590 && num <= 599) return 'MT';
  if (num >= 800 && num <= 816) return 'CO';
  if (num >= 660 && num <= 679) return 'KS';
  return 'Unknown';
}

export default router;
