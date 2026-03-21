/**
 * @fileoverview API client for the Community Health Request System.
 * Wraps fetch with consistent error handling, JSON serialization,
 * and base URL configuration via VITE_API_BASE_URL.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Core fetch wrapper. Parses JSON responses and throws structured errors
 * for non-2xx status codes.
 *
 * @param {string} path - API path (e.g., '/api/requests')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} - parsed JSON response
 * @throws {{ status: number, error: string, message: string, fields?: Record<string, string> }}
 */
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  // Parse body regardless of status (errors often have JSON bodies)
  let body;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else if (contentType.includes('text/calendar')) {
    // Return raw text for .ics downloads
    body = await response.text();
    if (!response.ok) {
      throw { status: response.status, error: 'CALENDAR_ERROR', message: body };
    }
    return body;
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    throw {
      status: response.status,
      error: body?.error || 'API_ERROR',
      message: body?.message || `Request failed with status ${response.status}`,
      fields: body?.fields || null,
    };
  }

  return body;
}

/**
 * Performs a GET request. Query params are serialized via URLSearchParams,
 * with null/undefined values omitted.
 *
 * @param {string} path - API path
 * @param {Record<string, string | number | boolean | null | undefined>} [params={}] - query parameters
 * @returns {Promise<any>}
 */
export async function apiGet(path, params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  const queryString = new URLSearchParams(cleanParams).toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  return apiFetch(fullPath, { method: 'GET' });
}

/**
 * Performs a POST request with a JSON body.
 *
 * @param {string} path - API path
 * @param {Record<string, any>} body - request payload
 * @returns {Promise<any>}
 */
export async function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Performs a PATCH request with a JSON body for partial updates.
 *
 * @param {string} path - API path
 * @param {Record<string, any>} body - partial update payload
 * @returns {Promise<any>}
 */
export async function apiPatch(path, body) {
  return apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
