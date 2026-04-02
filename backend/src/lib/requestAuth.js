/**
 * @fileoverview Demo request-role helpers for frontend-provided auth state.
 * The app uses client-side auth, so API authorization is advisory and based
 * on an explicit role header sent by the frontend.
 */

export const READ_ONLY_ADMIN_ROLE = 'readonly_admin';

/**
 * Read the caller role from a request header.
 * Falls back to null when the header is missing or malformed.
 *
 * @param {import('express').Request} req
 * @returns {'admin'|'readonly_admin'|'guest'|null}
 */
export function getRequestRole(req) {
  const rawRole = req.get('x-user-role');

  if (rawRole === 'admin' || rawRole === READ_ONLY_ADMIN_ROLE || rawRole === 'guest') {
    return rawRole;
  }

  return null;
}

/**
 * Whether the caller is the read-only admin variant.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function isReadOnlyAdmin(req) {
  return getRequestRole(req) === READ_ONLY_ADMIN_ROLE;
}

/**
 * Reject mutating admin actions for the read-only admin role.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {boolean} true when the request was rejected
 */
export function rejectIfReadOnlyAdmin(req, res) {
  if (!isReadOnlyAdmin(req)) return false;

  res.status(403).json({
    error: 'READ_ONLY_FORBIDDEN',
    message: 'Read-only admins can view all request data but cannot modify it.',
  });
  return true;
}
