/**
 * @file routes/simulate.js
 * Deterministic what-if scenario simulation endpoints.
 */

import { Router } from 'express';
import { getAllRequests, refreshStoreFromSource } from '../data/store.js';
import { simulateScenario } from '../services/simulationService.js';

const router = Router();

async function handleScenario(req, res) {
  try {
    const { scenario } = req.body;

    if (!scenario || !String(scenario).trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        fields: { scenario: 'Scenario description is required.' },
      });
    }

    await refreshStoreFromSource();
    const requests = getAllRequests();
    const result = simulateScenario(requests, scenario);
    return res.json(result);
  } catch (err) {
    console.error('[POST /simulate/scenario]', err);
    return res.status(500).json({
      error: 'SIMULATION_ERROR',
      message: 'Scenario simulation failed. Please try again.',
    });
  }
}

router.post('/', handleScenario);
router.post('/scenario', handleScenario);

export default router;
