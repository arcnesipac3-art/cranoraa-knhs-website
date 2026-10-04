import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAcademicYear } from '../context/AcademicYearContext';
import ChargeModal from './fees/ChargeModal';
import BulkAssignModal from './fees/BulkAssignModal';
import RecordPaymentModal from './fees/RecordPaymentModal';
import StudentDrawer from './fees/StudentDrawer';
import PaymentsView from './fees/PaymentsView';
import FeeTypesView from './fees/FeeTypesView';
import {
  fetchAllFees, fetchAllFeeTypes, fetchAllStudents,
  peso, statusBadge, statusLabel, gradeLabel, termLabel,
  feeTypeName, formatDate,
} from './fees/feeHelpers';

const VIEWS = [
  { key: 'charges', label: 'Charges' },
  { key: 'payments', label: 'Payments' },
  { key: 'types', label: 'Fee Types' },
];

// ── Delete Confirmation ──────────────────────────────────────────────────────
function DeleteConfirm({ isOpen, onClose, onConfirm, fee }) {
  if (!fee) return null;
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Charge"
      message={`Are you sure you want to delete the ${feeTypeName(fee)} charge for ${fee.student_name || 'this student'}? This action cannot be undone. Charges with recorded payments cannot be deleted.`}
      confirmText="Delete"
      variant="danger"
    />
  );
}

// ── Main Fees Page ───────────────────────────────────────────────────────────
export default function Fees() {
  const { academicYear, academicYears, setAcademicYear } = useAcademicYear();

  const [view, setView] = useState('charges');
  const [fees, setFees] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [showMore, setShowMore] = useState(false);

  // Modals / drawer
  const [showCreate, setShowCreate] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [deletingFee, setDeletingFee] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [payingCharge, setPayingCharge] = useState(null);
  const [viewingCharge, setViewingCharge] = useState(null);

  // The selected school year (name) comes from the shared academic-year
  // system; changing it here changes it app-wide (same as GradeInput does).
  const syName = academicYear;
  const academicYearId = useMemo(
    () => academicYears.find((y) => y.name === syName)?.id ?? null,
    [academicYears, syName],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [feeList, typeList, studentList] = await Promise.all([
        fetchAllFees(syName),
        fetchAllFeeTypes(),
        fetchAllStudents(),
      ]);
      setFees(feeList.filter((f) => f && f.amount != null));
      setFeeTypes(typeList);
      setStudents(studentList);
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [syName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = () => {
    fetchData();
    setEditingFee(null);
    setShowCreate(false);
  };

  const handleDelete = async () => {
    if (!deletingFee) return;
    try {
      await api.delete(`/fees/${deletingFee.id}/`);
      toast.success('Charge deleted');
      fetchData();
    } catch (err) {
      // Backend guard: charges with recorded payments answer 400 with why.
      toast.error(err.response?.data?.error || 'Failed to delete charge');
    }
    setDeletingFee(null);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const grades = useMemo(() => {
    const set = new Set(students.map((s) => s.profile?.grade_level).filter(Boolean));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [students]);

  const sections = useMemo(() => {
    const pool = gradeFilter
      ? students.filter((s) => String(s.profile?.grade_level ?? '') === gradeFilter)
      : students;
    const set = new Set(pool.map((s) => s.profile?.classroom_name).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students, gradeFilter]);

  const hasActiveFilters = Boolean(
    search || statusFilter || typeFilter || gradeFilter || sectionFilter || termFilter || dueFrom || dueTo,
  );

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setGradeFilter('');
    setSectionFilter('');
    setTermFilter('');
    setDueFrom('');
    setDueTo('');
  };

  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fees.filter((f) => {
      if (!f) return false;
      const stu = f.student != null ? studentById.get(f.student) : null;
      if (statusFilter && f.status !== statusFilter) return false;
      if (typeFilter && String(f.fee_type) !== String(typeFilter)) return false;
      if (termFilter && String(f.term || '') !== termFilter) return false;
      if (gradeFilter && String(stu?.profile?.grade_level ?? '') !== gradeFilter) return false;
      if (sectionFilter && (stu?.profile?.classroom_name || '') !== sectionFilter) return false;
      const due = f.due_date ? String(f.due_date).slice(0, 10) : '';
      if (dueFrom && due && due < dueFrom) return false;
      if (dueTo && due && due > dueTo) return false;
      if (q) {
        const hay = [f.student_name, f.student_email, f.fee_type_name, stu?.username]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fees, studentById, search, statusFilter, typeFilter, termFilter, gradeFilter, sectionFilter, dueFrom, dueTo]);

  // Stats cover every charge in the selected school year (not the filtered
  // subset), so the cards stay an honest dashboard.
  const stats = useMemo(() => ({
    total: fees.length,
    unpaid: fees.filter((f) => f.status === 'unpaid').length,
    partial: fees.filter((f) => f.status === 'partial').length,
    paid: fees.filter((f) => f.status === 'paid').length,
    totalAmount: fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
    totalPaid: fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0),
  }), [fees]);

  const viewingCharges = useMemo(() => {
    if (!viewingCharge) return [];
    if (viewingCharge.student == null) return []; // drawer falls back to the anchor charge
    return fees.filter((f) => f.student === viewingCharge.student);
  }, [fees, viewingCharge]);

  const openCreate = () => { setEditingFee(null); setShowCreate(true); };

  // ── Loading skeleton (initial load / school-year switch with nothing cached)
  if (loading && fees.length === 0 && !loadError) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton.StatCard />
          <Skeleton.StatCard />
          <Skeleton.StatCard />
          <Skeleton.StatCard />
        </div>
        <Skeleton.Table rows={6} cols={8} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
          <p className="text-slate-500 mt-1">
            Charges, payments, and balances{syName ? ` · ${syName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="fee-sy-select" className="text-xs font-semibold text-slate-600">School Year</label>
            <select
              id="fee-sy-select"
              value={syName || ''}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">All school years</option>
              {(academicYears.length > 0 ? academicYears : (syName ? [{ name: syName }] : [])).map((y) => (
                <option key={y.id || y.name} value={y.name}>
                  {y.name}{y.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setView('charges'); setShowBulk(true); }}
            className="px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bulk Assign
          </button>
          <button
            onClick={() => { setView('charges'); openCreate(); }}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Charge
          </button>
        </div>
      </div>

      {/* Sub-views */}
      <div role="tablist" aria-label="Fee management views" className="flex gap-1 border-b border-slate-200">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition ${
              view === v.key
                ? 'border-violet-600 text-violet-700 bg-violet-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Charges view ─────────────────────────────────────────────────── */}
      {view === 'charges' && (
        loadError ? (
          <div className="bg-white rounded-lg border border-rose-200 p-8 text-center">
            <svg className="mx-auto h-10 w-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-3 text-base font-semibold text-slate-900">Couldn&apos;t load fee data</h3>
            <p className="text-sm text-slate-500 mt-1 break-words">{loadError}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Status cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Charges</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Unpaid</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{stats.unpaid}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Partially Paid</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.partial}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.paid}</p>
              </div>
            </div>

            {/* Amount cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Billed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{peso(stats.totalAmount)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Collected</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{peso(stats.totalPaid)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4 col-span-2 md:col-span-1">
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Outstanding Balance</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{peso(stats.totalAmount - stats.totalPaid)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="fee-search" className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
                  <input
                    id="fee-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Student, email, fee type..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="fee-status" className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    id="fee-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fee-type-filter" className="block text-xs font-semibold text-slate-700 mb-1">Fee Type</label>
                  <select
                    id="fee-type-filter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    {feeTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fee-grade" className="block text-xs font-semibold text-slate-700 mb-1">Grade</label>
                  <select
                    id="fee-grade"
                    value={gradeFilter}
                    onChange={(e) => { setGradeFilter(e.target.value); setSectionFilter(''); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">All grades</option>
                    {grades.map((g) => (
                      <option key={g} value={String(g)}>{gradeLabel(g)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={showMore}
                  className="text-xs font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1"
                >
                  <svg className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  More filters
                  {(sectionFilter || termFilter || dueFrom || dueTo) && (
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px]">
                      {[sectionFilter, termFilter, dueFrom, dueTo].filter(Boolean).length}
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {showMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="fee-section" className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                    <select
                      id="fee-section"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">All sections</option>
                      {sections.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fee-term" className="block text-xs font-semibold text-slate-700 mb-1">Term</label>
                    <select
                      id="fee-term"
                      value={termFilter}
                      onChange={(e) => setTermFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">All terms</option>
                      <option value="1">Term 1</option>
                      <option value="2">Term 2</option>
                      <option value="3">Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fee-due-from" className="block text-xs font-semibold text-slate-700 mb-1">Due From</label>
                    <input
                      id="fee-due-from"
                      type="date"
                      value={dueFrom}
                      onChange={(e) => setDueFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="fee-due-to" className="block text-xs font-semibold text-slate-700 mb-1">Due To</label>
                    <input
                      id="fee-due-to"
                      type="date"
                      value={dueTo}
                      onChange={(e) => setDueTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Charges table / cards */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {filteredFees.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  title={hasActiveFilters ? 'No charges match your filters' : 'No charges yet'}
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your filters, or clear them to see every charge.'
                      : `Create a charge or bulk-assign one to get started${syName ? ` for ${syName}` : ''}.`
                  }
                  actionLabel={hasActiveFilters ? 'Clear filters' : 'Add Charge'}
                  onAction={hasActiveFilters ? clearFilters : openCreate}
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['Student', 'Fee Type', 'Amount', 'Paid', 'Balance', 'Status', 'Due Date', ''].map((h, i) => (
                            <th
                              key={h || i}
                              className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 7 ? 'text-right' : 'text-left'}`}
                            >
                              {h || 'Actions'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredFees.map((fee) => (
                          <tr key={fee.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{fee.student_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{fee.student_email || ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                                {feeTypeName(fee)}
                              </span>
                              <span className="block text-[11px] text-slate-500 mt-1">{termLabel(fee.term)}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">{peso(fee.amount)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{peso(fee.amount_paid)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                              {peso(fee.balance ?? (Number(fee.amount) - Number(fee.amount_paid)))}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(fee.status)}`}>
                                {statusLabel(fee.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(fee.due_date)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setViewingCharge(fee)}
                                  className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                  title="View"
                                  aria-label={`View charges for ${fee.student_name || 'this student'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setEditingFee(fee); }}
                                  className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                  title="Edit"
                                  aria-label={`Edit ${feeTypeName(fee)} charge for ${fee.student_name || 'this student'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeletingFee(fee)}
                                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete"
                                  aria-label={`Delete ${feeTypeName(fee)} charge for ${fee.student_name || 'this student'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-slate-200">
                    {filteredFees.map((fee) => (
                      <div key={fee.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{fee.student_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500 truncate">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                                {feeTypeName(fee)}
                              </span>
                              {' '}{termLabel(fee.term)} · Due {formatDate(fee.due_date)}
                            </p>
                          </div>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge(fee.status)}`}>
                            {statusLabel(fee.status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Amount</p>
                            <p className="text-sm font-bold text-slate-900">{peso(fee.amount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Paid</p>
                            <p className="text-sm font-bold text-emerald-600">{peso(fee.amount_paid)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Balance</p>
                            <p className="text-sm font-bold text-rose-600">
                              {peso(fee.balance ?? (Number(fee.amount) - Number(fee.amount_paid)))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingCharge(fee)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => { setEditingFee(fee); }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingFee(fee)}
                            className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )
      )}

      {/* ── Payments view ────────────────────────────────────────────────── */}
      {view === 'payments' && <PaymentsView academicYear={syName} />}

      {/* ── Fee Types view ───────────────────────────────────────────────── */}
      {view === 'types' && <FeeTypesView />}

      {/* Student financial drawer */}
      {viewingCharge && (
        <StudentDrawer
          charge={viewingCharge}
          charges={viewingCharges}
          student={viewingCharge.student != null ? studentById.get(viewingCharge.student) : null}
          onClose={() => setViewingCharge(null)}
          onRecordPayment={(f) => setPayingCharge(f)}
          onEdit={(f) => setEditingFee(f)}
        />
      )}

      {/* Modals */}
      <ChargeModal
        isOpen={showCreate || !!editingFee}
        onClose={() => { setShowCreate(false); setEditingFee(null); }}
        onSave={handleSave}
        editing={editingFee}
        students={students}
        feeTypes={feeTypes}
        academicYearId={academicYearId}
      />
      <BulkAssignModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        onSaved={handleSave}
        students={students}
        fees={fees}
        feeTypes={feeTypes}
        academicYearId={academicYearId}
      />
      <RecordPaymentModal
        charge={payingCharge}
        onClose={() => setPayingCharge(null)}
        onSaved={handleSave}
      />
      <DeleteConfirm
        isOpen={!!deletingFee}
        onClose={() => setDeletingFee(null)}
        onConfirm={handleDelete}
        fee={deletingFee}
      />
    </div>
  );
}
