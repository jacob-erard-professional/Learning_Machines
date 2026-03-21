/**
 * @fileoverview Geographic equity view — sortable ZIP table with heatmap.
 * High-demand ZIPs: amber indicator. Underserved ZIPs: blue indicator.
 * Never color-only — always includes text label.
 */

import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api.js';
import { mockGeoData } from '../data/mockRequests.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Card from '../components/ui/Card.jsx';

// IHC brand hex values used for heatmap tiles.
// Inline styles bypass Tailwind's purge — guaranteed to render correctly.
const COLORS = {
  none:        '#f3f4f6', // gray-100
  low:         '#ccfbf1', // teal-100
  medium:      '#5eead4', // teal-300
  high:        '#00897b', // ihc-teal-500
  highDemand:  '#f59e0b', // ihc-amber-500
  underserved: '#3b82f6', // blue-500 (ihc-blue-400 equiv — not in config)
};

const LEGEND = [
  { bg: COLORS.none,        label: 'No requests' },
  { bg: COLORS.low,         label: 'Low (1–2)' },
  { bg: COLORS.medium,      label: 'Medium (3–5)' },
  { bg: COLORS.high,        label: 'High (6+)' },
  { bg: COLORS.highDemand,  label: 'High Demand' },
  { bg: COLORS.underserved, label: 'Underserved' },
];

/**
 * Returns inline bg + text color for a heatmap tile.
 * Flags take priority; otherwise absolute count thresholds drive the teal scale
 * so a ZIP with 1 request always looks "low" regardless of what other ZIPs have.
 */
function tileStyle(row) {
  if (row.flag === 'high_demand') return { bg: COLORS.highDemand, color: '#fff' };
  if (row.flag === 'underserved') return { bg: COLORS.underserved, color: '#fff' };
  const n = row.totalRequestCount ?? 0;
  if (n === 0)  return { bg: COLORS.none,   color: '#6b7280' };
  if (n <= 2)   return { bg: COLORS.low,    color: '#134e4a' };
  if (n <= 5)   return { bg: COLORS.medium, color: '#134e4a' };
  return               { bg: COLORS.high,   color: '#fff' };
}

/** Sort by column */
function sortData(data, column, dir) {
  return [...data].sort((a, b) => {
    let av = a[column];
    let bv = b[column];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Geographic equity dashboard page.
 *
 * @returns {JSX.Element}
 */
export default function GeoEquityView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortCol, setSortCol] = useState('requestCount30d');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setLoading(true);
    apiGet('/api/analytics/geo')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        // Fall back to mock data for development
        setData(mockGeoData);
        setLoading(false);
      });
  }, []);

  function handleSort(col) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const summary = data?.summary ?? [];
  const coverage = data?.serviceAreaCoverage ?? {};
  const highDemandCount = summary.filter((r) => r.flag === 'high_demand').length;
  const underservedCount = summary.filter((r) => r.flag === 'underserved').length;
  const sortedData = sortData(summary, sortCol, sortDir);

  // maxCount still used for the mini progress bar in the table (30d column)
  const maxCount = Math.max(...summary.map((r) => r.requestCount30d), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Geographic Equity Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Request distribution by ZIP code. High-demand and underserved areas are flagged for prioritization.
        </p>
      </div>

      {/* Summary bar */}
      {loading ? (
        <LoadingSpinner size="lg" center className="py-8" label="Loading geographic data" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total ZIP Codes" value={summary.length} color="text-gray-900" />
            <SummaryCard label="In Service Area" value={coverage.inServiceArea ?? 0} color="text-ihc-blue-600" />
            <SummaryCard label="High Demand" value={highDemandCount} color="text-ihc-amber-600" indicator="high_demand" />
            <SummaryCard label="Underserved" value={underservedCount} color="text-ihc-blue-500" indicator="underserved" />
          </div>

          {/* Sortable table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="ZIP code demand summary">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      { key: 'zip', label: 'ZIP Code' },
                      { key: 'city', label: 'City' },
                      { key: 'state', label: 'State' },
                      { key: 'isInServiceArea', label: 'Service Area' },
                      { key: 'requestCount30d', label: '30d Requests' },
                      { key: 'totalRequestCount', label: 'Total' },
                      { key: 'flag', label: 'Flag' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-ihc-blue-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ihc-blue-500"
                        onClick={() => handleSort(col.key)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSort(col.key)}
                        tabIndex={0}
                        aria-sort={
                          sortCol === col.key
                            ? sortDir === 'asc' ? 'ascending' : 'descending'
                            : 'none'
                        }
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (
                            <svg
                              className={`w-3 h-3 ${sortDir === 'asc' ? '' : 'rotate-180'}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedData.map((row) => {
                    const isHighDemand = row.flag === 'high_demand';
                    const isUnderserved = row.flag === 'underserved';
                    return (
                      <tr
                        key={row.zip}
                        className={[
                          'transition-colors',
                          isHighDemand ? 'border-l-4 border-l-ihc-amber-500 bg-ihc-amber-50/40 hover:bg-ihc-amber-50' : '',
                          isUnderserved ? 'border-l-4 border-l-ihc-blue-400 bg-ihc-blue-50/30 hover:bg-ihc-blue-50' : '',
                          !isHighDemand && !isUnderserved ? 'border-l-4 border-l-transparent hover:bg-gray-50' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{row.zip}</td>
                        <td className="px-4 py-3 text-gray-700">{row.city}</td>
                        <td className="px-4 py-3 text-gray-700">{row.state}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              row.isInServiceArea
                                ? 'bg-ihc-teal-100 text-ihc-teal-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {row.isInServiceArea ? 'In Area' : 'Outside'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5" aria-hidden="true">
                              <div
                                className="h-1.5 rounded-full bg-ihc-blue-500"
                                style={{ width: `${(row.requestCount30d / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{row.requestCount30d}</span>
                          </div>

                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.totalRequestCount}</td>
                        <td className="px-4 py-3">
                          {isHighDemand && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-ihc-amber-100 text-ihc-amber-700 px-2.5 py-1 rounded-full border border-ihc-amber-200"
                              aria-label="Flag: High demand"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-ihc-amber-500" aria-hidden="true" />
                              HIGH DEMAND
                            </span>
                          )}
                          {isUnderserved && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-ihc-blue-100 text-ihc-blue-700 px-2.5 py-1 rounded-full border border-ihc-blue-200"
                              aria-label="Flag: Underserved"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-ihc-blue-500" aria-hidden="true" />
                              UNDERSERVED
                            </span>
                          )}
                          {!isHighDemand && !isUnderserved && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ZIP Heatmap */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Request Density Heatmap</h2>
            <p className="text-xs text-gray-500 mb-4">
              Each block represents a ZIP code. Color indicates total request volume.
              Amber = high demand · Blue = underserved · Teal scale = volume.
            </p>
            <div className="flex flex-wrap gap-2" role="img" aria-label="ZIP code demand heatmap">
              {sortedData.map((row) => {
                const { bg, color } = tileStyle(row);
                return (
                  <div
                    key={row.zip}
                    style={{ backgroundColor: bg, color }}
                    className="rounded-lg p-2 text-center min-w-[60px] transition-transform hover:scale-110 cursor-default"
                    title={`${row.zip} — ${row.city}: ${row.totalRequestCount} total, ${row.requestCount30d} last 30d${row.flag ? ` · ${row.flag}` : ''}`}
                    aria-label={`${row.zip} ${row.city}: ${row.totalRequestCount} total requests`}
                  >
                    <p className="text-xs font-mono font-bold">{row.zip}</p>
                    <p className="text-xs mt-0.5">{row.totalRequestCount}</p>
                  </div>
                );
              })}
            </div>
            {/* Legend — inline styles match tile logic exactly */}
            <div className="flex items-center gap-3 mt-4 flex-wrap" aria-label="Heatmap legend">
              <span className="text-xs text-gray-500 font-medium">Legend:</span>
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border border-gray-200"
                    style={{ backgroundColor: item.bg }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/** Summary stat card */
function SummaryCard({ label, value, color, indicator }) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {indicator === 'high_demand' && (
          <span className="w-2 h-2 rounded-full bg-ihc-amber-500 mt-0.5" aria-hidden="true" />
        )}
        {indicator === 'underserved' && (
          <span className="w-2 h-2 rounded-full bg-ihc-blue-400 mt-0.5" aria-hidden="true" />
        )}
      </div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}
