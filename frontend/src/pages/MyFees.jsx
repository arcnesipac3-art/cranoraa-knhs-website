import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Skeleton, EmptyState } from '../components/ui';
import {
  fetchAllFees,
  peso,
  statusBadge,
  statusLabel,
  feeTypeName,
  termLabel,
  methodLabel,
  formatDate,
  todayISO,
} from './fees/feeHelpers';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'partial', label: 'Partially paid' },
  { key: 'paid', label: 'Paid' },
];

// Whole days from `from` to `to` (both `YYYY-MM-DD`, parsed as local midnight
// so the result can't drift across a UTC boundary).
const dayDiff = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000
  );

// Due-date state for a charge: 'overdue' (past due and still owed),
// 'due-soon' (within 7 days), 'settled' (paid), or 'none' (no due date).
const dueStatus = (fee) => {
  if (fee?.status === 'paid') return 'settled';
  const due = fee?.due_date ? String(fee.due_date).slice(0, 10) : '';
  if (!due) return 'none';
  const today = todayISO();
  const days = dayDiff(today, due);
  if (days < 0) return 'overdue';
  return days <= 7 ? 'due-soon' : 'none';
};

const dueLabel = (state) => {
  if (state === 'overdue') return 'Overdue';
  if (state === 'due-soon') return 'Due soon';
  return '';
};

const academicYearName = (fee) => fee?.academic_year_name || '';

const ReceiptIcon = (props) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

function SummaryCard({ label, value, tone = 'default', hint }) {
  const tones = {
    default: 'text-slate-900',
    violet: 'text-violet-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1.5 text-lg sm:text-xl font-bold tracking-tight ${tones[tone] || tones.default}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function MyFees() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';

  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // The backend scopes /fees/ by role — a student sees their own charges,
        // a parent sees the charges of every linked child.
        const data = await fetchAllFees();
        if (!cancelled) {
          setCharges(Array.isArray(data) ? data.filter((c) => c && typeof c === 'object') : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              'Could not load your fees. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const billed = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const paid = charges.reduce((sum, c) => sum + (Number(c.amount_paid) || 0), 0);
    const balance = charges.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
    const overdue = charges.filter((c) => dueStatus(c) === 'overdue').length;
    return { billed, paid, balance, overdue };
  }, [charges]);

  const years = useMemo(() => {
    const seen = new Map();
    charges.forEach((c) => {
      if (c.academic_year != null && c.academic_year_name) {
        seen.set(c.academic_year, c.academic_year_name);
      }
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [charges]);

  const counts = useMemo(() => {
    const base = { all: charges.length, unpaid: 0, partial: 0, paid: 0 };
    charges.forEach((c) => {
      if (base[c.status] !== undefined) base[c.status] += 1;
    });
    return base;
  }, [charges]);

  const visible = useMemo(() => {
    const today = todayISO();
    const rows = charges.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (yearFilter !== 'all' && c.academic_year !== yearFilter) return false;
      return true;
    });

    return rows.sort((a, b) => {
      // Open balances first (soonest due at the top), settled charges last.
      const aPaid = a.status === 'paid' ? 1 : 0;
      const bPaid = b.status === 'paid' ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;

      const aDue = String(a.due_date || '9999-12-31').slice(0, 10);
      const bDue = String(b.due_date || '9999-12-31').slice(0, 10);
      if (aPaid) return aDue === bDue ? 0 : aDue < bDue ? 1 : -1;
      if (aDue === bDue) return 0;

      // Overdue items float to the top of the open list.
      const aOver = aDue < today ? 0 : 1;
      const bOver = bDue < today ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return aDue < bDue ? -1 : 1;
    });
  }, [charges, filter, yearFilter]);

  const groups = useMemo(() => {
    if (!isParent) return [{ name: null, items: visible }];
    const map = new Map();
    visible.forEach((c) => {
      const key = c.student_name || 'Linked student';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  }, [visible, isParent]);

  const hasFilters = filter !== 'all' || yearFilter !== 'all';

  const clearFilters = () => {
    setFilter('all');
    setYearFilter('all');
  };

  const toggleRow = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <div className="page-bottom-safe bg-slate-50/50">
        <div className="mb-6">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="mt-2 h-3.5 w-64 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-bottom-safe bg-slate-50/50">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            My Fees
          </h1>
        </div>
        <div className="ui-card">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.34 16a2 2 0 001.73 3z" />
              </svg>
            }
            title="Could not load your fees"
            description={error}
            actionLabel="Try again"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-bottom-safe bg-slate-50/50">
      <div className="mb-3 sm:mb-4 md:mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            My Fees
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            {isParent
              ? 'Charges recorded for your linked children.'
              : 'Your school charges, balances, and payment history.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="ui-btn ui-btn-secondary ui-btn-sm shrink-0"
        >
          Print
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 space-y-3 sm:space-y-4 md:space-y-6 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <SummaryCard label="Total billed" value={peso(summary.billed)} hint={`${counts.all} charge${counts.all === 1 ? '' : 's'}`} />
          <SummaryCard label="Amount paid" value={peso(summary.paid)} hint="Received by the school" />
          <SummaryCard
            label="Balance due"
            value={peso(summary.balance)}
            tone={summary.balance > 0 ? 'violet' : 'default'}
            hint={summary.balance > 0 ? 'Outstanding' : 'Nothing outstanding'}
          />
          <SummaryCard
            label="Overdue"
            value={String(summary.overdue)}
            tone={summary.overdue > 0 ? 'amber' : 'default'}
            hint={summary.overdue > 0 ? 'Past the due date' : 'All caught up'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${filter === f.key ? 'text-violet-200' : 'text-slate-400'}`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {years.length > 1 && (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="ui-select !w-auto text-xs"
              aria-label="Filter by academic year"
            >
              <option value="all">All academic years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="ui-card">
            <EmptyState
              icon={<ReceiptIcon />}
              title={hasFilters ? 'No charges match your filters' : 'No charges yet'}
              description={
                hasFilters
                  ? 'Try adjusting your filters to see every charge.'
                  : 'Once the school records a charge for you, it will appear here.'
              }
              actionLabel={hasFilters ? 'Clear filters' : null}
              onAction={clearFilters}
            />
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.name || 'all'} className="space-y-3">
              {group.name && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                    {group.name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">{group.name}</h2>
                  <span className="text-[11px] text-slate-500">
                    {group.items.length} charge{group.items.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              <div className="ui-table-wrapper">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th scope="col">Charge</th>
                      <th scope="col">Term</th>
                      <th scope="col">Due</th>
                      <th scope="col" className="text-right">Amount</th>
                      <th scope="col" className="text-right">Paid</th>
                      <th scope="col" className="text-right">Balance</th>
                      <th scope="col">Status</th>
                      <th scope="col" aria-label="Payments" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((c) => {
                      const isOpen = expandedId === c.id;
                      const due = dueStatus(c);
                      const payments = Array.isArray(c.payments) ? c.payments : [];

                      return (
                        <Fragment key={c.id}>
                          <tr className={isOpen ? 'bg-violet-50/60' : ''}>
                            <td>
                              <span className="font-semibold text-slate-900">
                                {feeTypeName(c)}
                              </span>
                              {c.description && (
                                <span className="block text-[11px] text-slate-500 mt-0.5">
                                  {c.description}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="text-xs text-slate-600">{termLabel(c.term)}</span>
                              <span className="block text-[11px] text-slate-400">
                                {academicYearName(c)}
                              </span>
                            </td>
                            <td>
                              {c.due_date ? (
                                <>
                                  <span className="text-xs text-slate-600">
                                    {formatDate(c.due_date)}
                                  </span>
                                  {(due === 'overdue' || due === 'due-soon') && (
                                    <span
                                      className={`block text-[11px] font-semibold ${
                                        due === 'overdue' ? 'text-rose-600' : 'text-amber-600'
                                      }`}
                                    >
                                      {dueLabel(due)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="text-right font-medium text-slate-900">
                              {peso(c.amount)}
                            </td>
                            <td className="text-right text-emerald-700">{peso(c.amount_paid)}</td>
                            <td className="text-right font-semibold text-slate-900">
                              {peso(c.balance)}
                            </td>
                            <td>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(
                                  c.status
                                )}`}
                              >
                                {statusLabel(c.status)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => toggleRow(c.id)}
                                aria-expanded={isOpen}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
                              >
                                {isOpen ? 'Hide' : 'History'}
                                <svg
                                  className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="bg-violet-50/40">
                              <td colSpan={8} className="!py-3">
                                <div className="rounded-lg border border-violet-100 bg-white p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                                    Payment history
                                  </p>
                                  {payments.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                      No payments recorded yet.
                                    </p>
                                  ) : (
                                    <ul className="divide-y divide-slate-100">
                                      {payments.map((p) => (
                                        <li
                                          key={p.id}
                                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                                        >
                                          <div>
                                            <span className="font-semibold text-slate-900">
                                              {peso(p.amount)}
                                            </span>
                                            <span className="ml-2 text-slate-500">
                                              {methodLabel(p.method)}
                                            </span>
                                          </div>
                                          <div className="text-slate-500">
                                            {p.payment_date ? formatDate(p.payment_date) : '—'}
                                            {p.reference_number && (
                                              <span className="ml-2 text-slate-400">
                                                Ref {p.reference_number}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
