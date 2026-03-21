/**
 * @fileoverview Route guard for admin-only pages.
 * Redirects to /login if the current user is not authenticated as admin.
 */

import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

/**
 * Wraps admin routes — renders child routes via <Outlet> if role is 'admin',
 * otherwise redirects to /login.
 *
 * @returns {JSX.Element}
 */
export default function ProtectedRoute() {
  const role = useAuth((s) => s.role);

  if (role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
