/**
 * @fileoverview Zustand store for the admin request management UI.
 * Manages request list, filters, selection, loading state, and notifications.
 */

import { create } from 'zustand';
import { apiGet, apiPatch } from '../lib/api.js';

/** @typedef {'pending'|'needs_review'|'approved'|'fulfilled'|'rejected'|'all'} StatusFilter */
/** @typedef {'staff_deployment'|'mail'|'pickup'|'all'} RouteFilter */

let notificationCounter = 0;

/**
 * Zustand store for admin request management.
 *
 * State:
 * - requests: Array of request summary objects from the API
 * - total: Total count of requests matching current filters
 * - filters: Active filter state
 * - selectedId: Currently selected request ID
 * - loading: Whether a fetch is in progress
 * - error: Last fetch error message (or null)
 * - notifications: Active toast notifications
 * - lastRefreshed: Timestamp of last successful fetch
 *
 * Actions:
 * - setFilter(key, val): Update a single filter value, resets on change
 * - selectRequest(id): Set the active request
 * - refreshRequests(): Re-fetch with current filters
 * - updateLocalRequest(id, patch): Optimistically update a request in the list
 * - addNotification({ type, message }): Push a toast notification
 * - dismissNotification(id): Remove a notification by ID
 */
const useRequests = create((set, get) => ({
  requests: [],
  total: 0,
  filters: {
    search: '',
    statusFilter: 'all',
    routeFilter: 'all',
    priorityFilter: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  },
  selectedId: null,
  loading: false,
  error: null,
  notifications: [],
  lastRefreshed: null,

  /**
   * Update a single filter value and trigger a new fetch.
   * @param {string} key - Filter field name
   * @param {string} val - New value
   */
  setFilter: (key, val) => {
    set((state) => ({
      filters: { ...state.filters, [key]: val },
    }));
    get().refreshRequests();
  },

  /**
   * Set the currently selected request ID.
   * @param {string|null} id
   */
  selectRequest: (id) => set({ selectedId: id }),

  /**
   * Fetch requests from the API using current filter state.
   */
  refreshRequests: async () => {
    const { filters } = get();
    set({ loading: true, error: null });

    try {
      const params = {
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.statusFilter !== 'all' ? { status: filters.statusFilter } : {}),
        ...(filters.routeFilter !== 'all' ? { route: filters.routeFilter } : {}),
        ...(filters.priorityFilter !== 'all' ? { priority: filters.priorityFilter } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      };

      const data = await apiGet('/api/requests', params);
      set({
        requests: data.results ?? [],
        total: data.total ?? 0,
        loading: false,
        lastRefreshed: Date.now(),
      });
    } catch (err) {
      set({
        loading: false,
        error: err.message || 'Failed to load requests.',
      });
    }
  },

  /**
   * Optimistically update a request in the local list without re-fetching.
   * Used after a PATCH action to keep the UI in sync instantly.
   * @param {string} id - Request ID
   * @param {Record<string, any>} patch - Partial update
   */
  updateLocalRequest: (id, patch) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  },

  /**
   * Push a toast notification.
   * @param {{ type: 'success'|'warning'|'info'|'error', message: string }} notification
   */
  addNotification: ({ type, message }) => {
    const id = ++notificationCounter;
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().dismissNotification(id);
    }, 5000);
  },

  /**
   * Remove a notification by its ID.
   * @param {number} id
   */
  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

export default useRequests;
