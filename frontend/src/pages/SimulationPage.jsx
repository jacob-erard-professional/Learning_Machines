/**
 * @fileoverview Digital twin simulation "What-if Analysis" page.
 * Accepts scenario input, shows loading state, and displays simulation results.
 */

import { useState } from 'react';
import { apiPost } from '../lib/api.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import BlobShape from '../components/ui/BlobShape.jsx';

const EXAMPLE_CHIPS = [
  'What if I had 3 more staff?',
  'What if demand doubles in rural areas?',
  'What if mailed materials ran out?',
  'What if we opened a new service area in Colorado?',
];

/**
 * Simulation "What-if Analysis" page.
 *
 * @returns {JSX.Element}
 */
export default function SimulationPage() {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function runSimulation() {
    if (!scenario.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await apiPost('/api/simulate/scenario', { scenario: scenario.trim() });
      setResult(response);
    } catch (err) {
      setError(err.message || 'Simulation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runSimulation();
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ICH Hero Banner */}
      <div
        className="relative overflow-hidden py-10 px-6 -mx-4 sm:-mx-6 lg:-mx-8 rounded-none"
        style={{ background: 'linear-gradient(135deg, #2c1259 0%, #1A1A4E 100%)' }}
      >
        <BlobShape variant={3} color="#F5C518" className="absolute blob-float" style={{ width: '180px', height: '180px', top: '-40px', right: '5%', opacity: 0.25, pointerEvents: 'none' }} />
        <BlobShape variant={1} color="#FF6B35" className="absolute blob-float-slow" style={{ width: '140px', height: '140px', bottom: '-30px', right: '15%', opacity: 0.20, pointerEvents: 'none' }} />
        <div className="relative z-10 max-w-7xl mx-auto">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white mb-1" style={{ color: 'white' }}>What-If Simulation</h1>
          <p className="text-brand-periwinkle-300 text-sm" style={{ color: '#A8B4F8' }}>Model capacity changes and forecast their operational impact.</p>
        </div>
      </div>

      {/* Digital Twin badge + description */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-brand-periwinkle-100 text-brand-navy-500 px-2.5 py-0.5 rounded-full border border-brand-periwinkle-200 font-medium">
            Digital Twin
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Explore hypothetical scenarios to understand their projected impact on Community Health operations.
        </p>
      </div>

      {/* Input card */}
      <Card className="p-5">
        <label htmlFor="scenario-input" className="block text-sm font-medium text-gray-700 mb-2">
          Describe your scenario
        </label>
        <textarea
          id="scenario-input"
          rows={3}
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. What if I had 3 more staff? What if demand doubles in rural Utah?"
          className="block w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 bg-gray-50 focus:bg-white transition-colors"
          disabled={loading}
          aria-label="Simulation scenario input"
        />

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setScenario(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-brand-periwinkle-200 bg-brand-periwinkle-50 text-brand-navy-500 hover:bg-brand-periwinkle-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500"
            >
              {chip}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="md"
          loading={loading}
          disabled={!scenario.trim()}
          onClick={runSimulation}
          ariaLabel="Run simulation for this scenario"
        >
          Run Simulation
        </Button>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" label="Running simulation" />
            <p className="text-sm text-gray-600 font-medium">Running simulation...</p>
            <p className="text-xs text-gray-400">Analyzing scenario impact across the service area</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4" aria-live="polite">
          {/* Scenario label */}
          <div className="bg-brand-periwinkle-50 border border-brand-periwinkle-100 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-brand-purple-500 uppercase tracking-wider mb-1">Scenario</p>
            <p className="text-sm font-semibold text-brand-navy-500">"{result.scenario}"</p>
          </div>

          {/* Summary */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Impact Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
          </Card>

          {/* Before/After stats */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Before vs. After</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(result.before).map(([key, beforeVal]) => {
                const afterVal = result.after[key];
                const improved = afterVal > beforeVal;
                const worse = afterVal < beforeVal;
                // For backlog and response days, lower is better
                const lowerIsBetter = key === 'pendingBacklog' || key === 'avgResponseDays';
                const isGood = lowerIsBetter ? worse : improved;
                const isBad = lowerIsBetter ? improved : worse;

                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase());

                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Before</p>
                        <p className="text-xl font-bold text-gray-700">{beforeVal}</p>
                      </div>
                      <div className={`flex items-center text-lg font-bold ${isGood ? 'text-brand-purple-600' : isBad ? 'text-brand-yellow-600' : 'text-gray-500'}`}>
                        →
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">After</p>
                        <p className={`text-xl font-bold ${isGood ? 'text-brand-purple-600' : isBad ? 'text-brand-yellow-600' : 'text-gray-700'}`}>
                          {afterVal}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Affected ZIPs */}
          {result.affectedZips?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Affected ZIP Codes</h2>
              <table className="w-full text-sm" aria-label="Affected ZIP codes">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th scope="col" className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">ZIP</th>
                    <th scope="col" className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                    <th scope="col" className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Additional Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.affectedZips.map((z) => (
                    <tr key={z.zip}>
                      <td className="py-2 font-mono text-brand-purple-500 font-semibold">{z.zip}</td>
                      <td className="py-2 text-gray-700">{z.city}</td>
                      <td className="py-2">
                        <span className={`font-semibold ${z.additionalCapacity >= 0 ? 'text-brand-purple-600' : 'text-brand-yellow-700'}`}>
                          {z.additionalCapacity > 0 ? '+' : ''}{z.additionalCapacity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Trade-offs */}
          {result.tradeoffs?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Trade-offs & Considerations</h2>
              <ul className="space-y-2">
                {result.tradeoffs.map((tradeoff, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-brand-yellow-500 shrink-0 mt-0.5" aria-hidden="true">⚠</span>
                    {tradeoff}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
