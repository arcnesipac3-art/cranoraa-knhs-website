import { useState, useEffect, useCallback, useMemo } from 'react';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import {
  fetchAllPayments, peso, formatDate, methodLabel, PAYMENT_METHODS,
} from './feeHelpers';

/**
 * Payments sub-view: the school-wide payment history for the selected school
 * year (backend role-scoped — staff only see advisory students' payments).
 * Filters are client-side over the SY's payments, matching how the Charges
 * tab filters its rows.
 */
export default function PaymentsView({ academicYear }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await fetchAllPayments(academicYear);
      setPayments(rows.filter((p) => p && p.id != null));
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (methodFilter && p.method !== methodFilter) return false;
      const day = String(p.payment_date || '').slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (q) {
        const hay = [
          p.student_name, p.reference_number, p.notes, p.recorded_by_name, p.fee_type_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [payments, search, methodFilter, dateFrom, dateTo]);

  const totalCollected = filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const hasFilters = Boolean(search || methodFilter || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton.StatCard />
          <Skeleton.StatCard />
          <Skeleton.StatCard />
        </div>
        <Skeleton.Table rows={5} cols={7} hasAvatar={false} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-lg border border-rose-200 p-8 text-center">
        <h3 className="text-base font-semibold text-slate-900">Couldn&apos;t load payments</h3>
        <p className="text-sm text-slate-500 mt-1 break-words">{loadError}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{peso(totalCollected)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</p>
          <p className="text-sm font-medium text-slate-700 mt-2">
            {hasFilters ? `${filtered.length} of ${payments.length} shown` : `All ${payments.length} in view`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="pay-search" className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
            <input
              id="pay-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student, reference, notes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="pay-method-filter" className="block text-xs font-semibold text-slate-700 mb-1">Method</label>
            <select
              id="pay-method-filter"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pay-date-from" className="block text-xs font-semibold text-slate-700 mb-1">From</label>
            <input
              id="pay-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="pay-date-to" className="block text-xs font-semibold text-slate-700 mb-1">To</label>
            <input
              id="pay-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        {hasFilters && (
          <div className="flex justify-end mt-3">
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Payments list */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title={hasFilters ? 'No payments match your filters' : 'No payments recorded yet'}
            description={
              hasFilters
                ? 'Try adjusting your search, method, or date range.'
                : `Payments recorded for ${academicYear || 'this school year'} will appear here.`
            }
            actionLabel={hasFilters ? 'Clear filters' : null}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Date', 'Student', 'Fee Type', 'Amount', 'Method', 'Reference', 'Recorded By'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.student_name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                          {p.fee_type_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">{peso(p.amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{methodLabel(p.method)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="max-w-[180px] truncate">
                          {p.reference_number || '—'}
                          {p.notes && <span className="block text-xs text-slate-400 truncate">{p.notes}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{p.recorded_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.student_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{formatDate(p.payment_date)} · {methodLabel(p.method)}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">{peso(p.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                      {p.fee_type_name || '—'}
                    </span>
                    {p.reference_number && <span>Ref {p.reference_number}</span>}
                    {p.recorded_by_name && <span>· by {p.recorded_by_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
