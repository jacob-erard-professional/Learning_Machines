/**
 * @fileoverview Admin dashboard filter bar.
 * Provides search, status/route/priority dropdowns, and date range filters.
 * All changes update URL search params. Search is debounced 300ms.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import useRequests from '../hooks/useRequests.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
];

const ROUTE_OPTIONS = [
  { value: 'all', label: 'All Routes' },
  { value: 'staff_deployment', label: 'Staff Deployment' },
  { value: 'mail', label: 'Mail' },
  { value: 'pickup', label: 'Pickup' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/**
 * Filter bar for the admin dashboard.
 * Syncs all filter state to URL search params and the Zustand store.
 *
 * @returns {JSX.Element}
 */
export default function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useRequests((s) => s.filters);
  const setFilter = useRequests((s) => s.setFilter);
  const searchTimerRef = useRef(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const urlStatus = searchParams.get('status') || 'all';
    const urlRoute = searchParams.get('route') || 'all';
    const urlPriority = searchParams.get('priority') || 'all';
    const urlDateFrom = searchParams.get('dateFrom') || '';
    const urlDateTo = searchParams.get('dateTo') || '';
    const urlSearch = searchParams.get('search') || '';

    if (urlStatus !== filters.statusFilter) setFilter('statusFilter', urlStatus);
    if (urlRoute !== filters.routeFilter) setFilter('routeFilter', urlRoute);
    if (urlPriority !== filters.priorityFilter) setFilter('priorityFilter', urlPriority);
    if (urlDateFrom !== filters.dateFrom) setFilter('dateFrom', urlDateFrom);
    if (urlDateTo !== filters.dateTo) setFilter('dateTo', urlDateTo);
    if (urlSearch !== filters.search) setFilter('search', urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateUrlParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  function handleSearchChange(e) {
    const value = e.target.value;
    // Update URL immediately for responsiveness
    updateUrlParam('search', value);
    // Debounce store/API update
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setFilter('search', value);
    }, 300);
  }

  function handleDropdownChange(storeKey, urlKey) {
    return (e) => {
      const value = e.target.value;
      setFilter(storeKey, value);
      updateUrlParam(urlKey, value);
    };
  }

  function handleDateChange(storeKey, urlKey) {
    return (e) => {
      const value = e.target.value;
      setFilter(storeKey, value);
      updateUrlParam(urlKey, value);
    };
  }

  function clearFilters() {
    setFilter('search', '');
    setFilter('statusFilter', 'all');
    setFilter('routeFilter', 'all');
    setFilter('priorityFilter', 'all');
    setFilter('dateFrom', '');
    setFilter('dateTo', '');
    setSearchParams({}, { replace: true });
  }

  const hasActiveFilters = (
    filters.search ||
    filters.statusFilter !== 'all' ||
    filters.routeFilter !== 'all' ||
    filters.priorityFilter !== 'all' ||
    filters.dateFrom ||
    filters.dateTo
  );

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
      {/* Search row */}
      <div className="relative">
        <label htmlFor="filter-search" className="sr-only">Search requests</label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="filter-search"
          type="search"
          placeholder="Search by name, event, or city..."
          defaultValue={filters.search}
          onChange={handleSearchChange}
          className="block w-full pl-9 pr-3 py-2 text-sm border border-brand-periwinkle-200 rounded-xl bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
        />
      </div>

      {/* Dropdowns row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <label htmlFor="filter-status" className="sr-only">Filter by status</label>
          <select
            id="filter-status"
            value={filters.statusFilter}
            onChange={handleDropdownChange('statusFilter', 'status')}
            className="block w-full text-sm border border-brand-periwinkle-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-route" className="sr-only">Filter by route</label>
          <select
            id="filter-route"
            value={filters.routeFilter}
            onChange={handleDropdownChange('routeFilter', 'route')}
            className="block w-full text-sm border border-brand-periwinkle-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
          >
            {ROUTE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-priority" className="sr-only">Filter by priority</label>
          <select
            id="filter-priority"
            value={filters.priorityFilter}
            onChange={handleDropdownChange('priorityFilter', 'priority')}
            className="block w-full text-sm border border-brand-periwinkle-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date range + clear */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label htmlFor="filter-date-from" className="text-xs text-gray-500 whitespace-nowrap">From</label>
          <input
            id="filter-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={handleDateChange('dateFrom', 'dateFrom')}
            className="flex-1 min-w-0 text-sm border border-brand-periwinkle-200 rounded-xl px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
            aria-label="Filter from date"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label htmlFor="filter-date-to" className="text-xs text-gray-500 whitespace-nowrap">To</label>
          <input
            id="filter-date-to"
            type="date"
            value={filters.dateTo}
            onChange={handleDateChange('dateTo', 'dateTo')}
            className="flex-1 min-w-0 text-sm border border-brand-periwinkle-200 rounded-xl px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple-500 focus:border-brand-purple-500 focus:bg-white transition-colors"
            aria-label="Filter to date"
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-brand-purple-500 hover:text-brand-purple-700 whitespace-nowrap underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple-500 rounded transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
