/**
 * @fileoverview Root application component with React Router routes.
 * All routes wrapped in AppShell which provides nav and layout.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import SubmitPage from './pages/SubmitPage.jsx';
import ChatIntakePage from './pages/ChatIntakePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import GeoEquityView from './pages/GeoEquityView.jsx';
import AnalyticsDashboard from './pages/AnalyticsDashboard.jsx';
import SimulationPage from './pages/SimulationPage.jsx';

/**
 * Root component. Defines all application routes.
 *
 * Routes:
 * - /                → SubmitPage (requestor-facing form + landing)
 * - /chat            → ChatIntakePage (conversational intake)
 * - /admin           → AdminDashboard (two-panel admin view)
 * - /admin/geo       → GeoEquityView (geographic equity dashboard)
 * - /admin/analytics → AnalyticsDashboard (charts & metrics)
 * - /admin/simulate  → SimulationPage (what-if digital twin)
 *
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Requestor-facing routes */}
        <Route path="/" element={<SubmitPage />} />
        <Route path="/chat" element={<ChatIntakePage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/geo" element={<GeoEquityView />} />
        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
        <Route path="/admin/simulate" element={<SimulationPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
