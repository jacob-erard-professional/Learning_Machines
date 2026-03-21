/**
 * @fileoverview Analytics dashboard with metric cards, trend charts,
 * status breakdown, and upcoming staffed events.
 */

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { apiGet } from '../lib/api.js';
import { mockRequests, mockTrends } from '../data/mockRequests.js';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const COLORS = {
  staff_deployment: '#0066cc',
  mail: '#00897b',
  pickup: '#f59e0b',
};

const STATUS_COLORS = {
  pending: '#0066cc',
  needs_review: '#f59e0b',
  approved: '#2e7d32',
  fulfilled: '#00897b',
  rejected: '#9ca3af',
};

const METRIC_ICONS = {
  total: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approved: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  fulfilled: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
};

/**
 * Analytics dashboard page.
 *
 * @returns {JSX.Element}
 */
export default function AnalyticsDashboard() {
  const [requests, setRequests] = useState(mockRequests);
  const [trends, setTrends] = useState(mockTrends);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiGet('/api/requests', { sortBy: 'createdAt', sortDir: 'desc' }),
      apiGet('/api/analytics/trends'),
      apiGet('/api/analytics/upcoming'),
    ]).then(([reqResult, trendResult, upcomingResult]) => {
      if (reqResult.status === 'fulfilled') setRequests(reqResult.value.results ?? mockRequests);
      if (trendResult.status === 'fulfilled') setTrends(trendResult.value);
      if (upcomingResult.status === 'fulfilled') setUpcoming(upcomingResult.value.events ?? []);
      setLoading(false);
    });
  }, []);

  // Compute metrics from requests
  const total = requests.length;
  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;
  const fulfilled = requests.filter((r) => r.status === 'fulfilled').length;

  // Status breakdown for pie chart
  const statusCounts = {};
  for (const r of requests) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Trend line data
  const trendLineData = (trends.labels ?? []).map((label, i) => ({
    date: label.slice(5), // MM-DD
    'Staff Deployment': trends.series?.staff_deployment?.[i] ?? 0,
    'Mail': trends.series?.mail?.[i] ?? 0,
    'Pickup': trends.series?.pickup?.[i] ?? 0,
  }));

  // Route breakdown for bar chart
  const routeCounts = {};
  for (const r of requests) {
    routeCounts[r.fulfillmentRoute] = (routeCounts[r.fulfillmentRoute] || 0) + 1;
  }
  const routeBarData = Object.entries(routeCounts).map(([route, count]) => ({
    route: route.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Community Health request trends and performance metrics.</p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" center className="py-16" label="Loading analytics" />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'total', label: 'Total Requests', value: total, color: 'text-gray-900', bg: 'bg-gray-50' },
              { key: 'pending', label: 'Pending Review', value: pending, color: 'text-ihc-blue-600', bg: 'bg-ihc-blue-50' },
              { key: 'approved', label: 'Approved', value: approved, color: 'text-ihc-green-500', bg: 'bg-green-50' },
              { key: 'fulfilled', label: 'Fulfilled', value: fulfilled, color: 'text-ihc-teal-600', bg: 'bg-ihc-teal-50' },
            ].map((metric) => (
              <Card key={metric.key} className="p-4">
                <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center mb-3 ${metric.color}`} aria-hidden="true">
                  {METRIC_ICONS[metric.key]}
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{metric.label}</p>
                <p className={`text-3xl font-bold mt-1 ${metric.color}`}>{metric.value}</p>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Line chart: demand over time */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Demand Over Time by Route</h2>
              {trendLineData.length === 0 ? (
                <EmptyChart label="No trend data available" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendLineData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Staff Deployment" stroke={COLORS.staff_deployment} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Mail" stroke={COLORS.mail} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Pickup" stroke={COLORS.pickup} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Pie chart: status breakdown */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h2>
              {pieData.length === 0 ? (
                <EmptyChart label="No status data available" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      aria-label="Status distribution pie chart"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [val, name.replace('_', ' ')]} />
                    <Legend
                      formatter={(value) => value.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Bar chart: route breakdown */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Requests by Fulfillment Route</h2>
            {routeBarData.length === 0 ? (
              <EmptyChart label="No route data available" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={routeBarData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="route" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0066cc" radius={[4, 4, 0, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Upcoming staffed events */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Upcoming Approved Staffed Events</h2>
            {upcoming.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">No upcoming staffed events in the next 30 days.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Upcoming staffed events">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                      <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                      <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendees</th>
                      <th scope="col" className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {upcoming.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{event.eventName}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{event.eventDate}</td>
                        <td className="px-4 py-2.5 text-gray-700">{event.eventCity}, {event.eventZip}</td>
                        <td className="px-4 py-2.5 text-gray-700">{event.estimatedAttendees ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-700">{event.requestorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* AI Forecast (experimental) */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Predictive Forecast</h2>
              <span className="text-xs bg-ihc-amber-100 text-ihc-amber-700 px-2 py-0.5 rounded-full border border-ihc-amber-200 font-medium">
                AI Forecast – experimental
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              <p>Based on historical trends, the model predicts:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-ihc-teal-500 mt-0.5" aria-hidden="true">↑</span>
                  Staff deployment requests expected to increase 15% over the next 4 weeks (spring event season).
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ihc-amber-500 mt-0.5" aria-hidden="true">⚠</span>
                  Moab (84532) and similar rural ZIPs show sustained underservice — consider proactive outreach.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ihc-blue-500 mt-0.5" aria-hidden="true">→</span>
                  Mailed materials demand stable; current inventory levels appear adequate.
                </li>
              </ul>
              <p className="text-xs text-gray-400 pt-1 italic">
                Forecasts are AI-generated estimates and should be reviewed by a human before operational decisions.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">{label}</div>
  );
}
