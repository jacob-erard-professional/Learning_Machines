/**
 * @file routes/simulate.js
 * Scenario simulation endpoint — uses Claude to model the impact of
 * policy or resource changes on the Community Health program.
 *
 * Use cases for demos:
 * - "What happens if we expand service area to include Las Vegas?"
 * - "What if we cut staff deployment capacity by 30%?"
 * - "Model the impact of adding a second distribution center in Boise."
 */

import { Router } from 'express';
import { getAllRequests } from '../data/store.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * @route POST /api/simulate/scenario
 * Body: { scenario: string } — plain-language description of the change to model
 * Response: { impactSummary, coverageChange, resourceTradeoffs, affectedZips, recommendations }
 */
router.post('/scenario', async (req, res) => {
  try {
    const { scenario } = req.body;

    if (!scenario || !String(scenario).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { scenario: 'Scenario description is required.' },
      });
    }

    // Load current stats for context
    const requests = getAllRequests();
    const today = new Date().toISOString().slice(0, 10);

    const staffDeploymentCount = requests.filter((r) => r.fulfillmentRoute === 'staff_deployment').length;
    const mailCount = requests.filter((r) => r.fulfillmentRoute === 'mail').length;
    const outsideAreaCount = requests.filter((r) => !r.isInServiceArea).length;

    // Get top zips from outside the service area (latent expansion candidates)
    const outsideZips = {};
    for (const r of requests.filter((r) => !r.isInServiceArea)) {
      outsideZips[r.eventZip] = (outsideZips[r.eventZip] || 0) + 1;
    }
    const topOutsideZips = Object.entries(outsideZips)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([zip, count]) => `${zip} (${count} requests)`);

    const currentStats = `
CURRENT PROGRAM STATS (as of ${today}):
- Total requests: ${requests.length}
- Staff deployment requests: ${staffDeploymentCount}
- Mail delivery requests: ${mailCount}
- Requests from outside service area: ${outsideAreaCount}
- Top outside-area zip codes: ${topOutsideZips.join(', ') || 'None'}
- States served: UT, ID, NV, WY, MT, CO, KS
`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 768,
      system: `You are a strategic planning analyst for Intermountain Healthcare's Community Health program.
Model the impact of proposed policy, geographic, or resource changes on the program.
Be specific: reference real states, zip codes, and realistic numbers based on the data provided.
Return ONLY valid JSON, no other text.`,
      messages: [
        {
          role: 'user',
          content: `${currentStats}\n\nScenario to simulate: "${scenario.trim()}"\n\nModel the impact and return JSON:\n{\n  "impactSummary": "2-3 sentence summary of projected impact",\n  "coverageChange": "description of coverage area change",\n  "resourceTradeoffs": "what resources would be needed or freed",\n  "affectedZips": ["list of zip codes most affected"],\n  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"]\n}\n\nReturn ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0]?.text?.trim() ?? '';
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({
      scenario: scenario.trim(),
      impactSummary: parsed.impactSummary ?? 'Simulation unavailable.',
      coverageChange: parsed.coverageChange ?? '',
      resourceTradeoffs: parsed.resourceTradeoffs ?? '',
      affectedZips: Array.isArray(parsed.affectedZips) ? parsed.affectedZips : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    });
  } catch (err) {
    console.error('[POST /simulate/scenario]', err);
    return res.status(500).json({
      error: 'SIMULATION_ERROR',
      message: 'Scenario simulation failed. Please try again.',
    });
  }
});

export default router;
